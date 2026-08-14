import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { allEmployees } from "@/lib/allowlist";
import { chuanHoaMaNV } from "@/lib/data";

// Gọi webhook n8n "Nhận tin nhắn trò chuyện" (node webhook, method GET, đọc tham số qua
// query string — giống hệt cách làm của /api/confirm). Route này chạy ở server để:
// (1) không lộ URL webhook thật ra trình duyệt, (2) tự gán đúng mã/tên người gửi theo
// đúng danh tính đã đăng nhập — không tin bất kỳ giá trị "người gửi" nào gửi lên từ client.
//
// Quy ước: phía quản lý (role "manager" — bao gồm cả tài khoản khách xem toàn quyền) luôn
// dùng mã cố định "QL" khi gửi/nhận tin nhắn riêng, vì quản lý không có mã nhân viên.

const MA_QUAN_LY = "QL";
const TEN_QUAN_LY = "Quản lý";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Không có quyền" }, { status: 403 });
  }
  const role = session.user.role;
  if (role !== "employee" && role !== "manager") {
    return NextResponse.json({ ok: false, error: "Không có quyền" }, { status: 403 });
  }

  const webhookUrl = process.env.N8N_CHAT_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json(
      { ok: false, error: "Chưa cấu hình N8N_CHAT_WEBHOOK_URL" },
      { status: 500 }
    );
  }

  let body: { loai?: "rieng" | "nhom"; manvNhan?: string; tennvNhan?: string; noiDung?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body không hợp lệ" }, { status: 400 });
  }

  const { loai, noiDung } = body;
  if ((loai !== "rieng" && loai !== "nhom") || !noiDung || !noiDung.trim()) {
    return NextResponse.json({ ok: false, error: "Thiếu tham số" }, { status: 400 });
  }

  let manvGui: string;
  let tennvGui: string;
  let manvNhan = "";
  let tennvNhan = "";

  if (role === "employee") {
    if (!session.user.maNhanVien) {
      return NextResponse.json({ ok: false, error: "Không có quyền" }, { status: 403 });
    }
    manvGui = chuanHoaMaNV(session.user.maNhanVien);
    tennvGui = session.user.name ?? "";
    if (loai === "rieng") {
      // Nhân viên chỉ được nhắn riêng cho quản lý, không được chọn người nhận khác.
      manvNhan = MA_QUAN_LY;
      tennvNhan = TEN_QUAN_LY;
    }
  } else {
    // role === "manager" (quản lý hoặc tài khoản khách xem toàn quyền)
    manvGui = MA_QUAN_LY;
    tennvGui = session.user.name ?? TEN_QUAN_LY;
    if (loai === "rieng") {
      // Quản lý phải chỉ định đúng 1 nhân viên có thật để nhắn riêng.
      const nv = allEmployees().find(
        (e) => chuanHoaMaNV(e.maNhanVien) === chuanHoaMaNV(body.manvNhan)
      );
      if (!nv) {
        return NextResponse.json({ ok: false, error: "Người nhận không hợp lệ" }, { status: 400 });
      }
      manvNhan = chuanHoaMaNV(nv.maNhanVien);
      tennvNhan = nv.hoTen;
    }
  }

  const params = new URLSearchParams({
    loai,
    manvgui: manvGui,
    tennvgui: tennvGui,
    manvnhan: manvNhan,
    tennvnhan: tennvNhan,
    noidung: noiDung.trim(),
  });

  try {
    const res = await fetch(`${webhookUrl}?${params.toString()}`, { method: "GET" });
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Webhook n8n trả lỗi (${res.status})` },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Không gọi được webhook n8n" },
      { status: 502 }
    );
  }
}
