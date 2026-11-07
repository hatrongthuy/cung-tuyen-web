import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ghiXacNhan } from "@/lib/xac-nhan";

// Nhận xác nhận gợi ý từ nhân viên và GHI THẲNG vào tab "Xác nhận gợi ý" (Google Sheets,
// service account có quyền ghi) — ổn định hơn so với webhook n8n. Nếu đã cấu hình
// N8N_CONFIRM_WEBHOOK_URL thì vẫn gọi thêm (không chặn kết quả) để giữ tương thích luồng cũ.
//
// Khi nhân viên chọn "Không đồng ý" (trangThai = "khac") thì BẮT BUỘC có lý do.

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "employee" || !session.user.maNhanVien) {
    return NextResponse.json({ ok: false, error: "Không có quyền" }, { status: 403 });
  }

  let body: { maKH?: string; tenKH?: string; trangThai?: "dong-y" | "khac"; lyDo?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body không hợp lệ" }, { status: 400 });
  }

  const { maKH, tenKH, trangThai } = body;
  const lyDo = (body.lyDo ?? "").trim();
  if (!maKH || !tenKH || (trangThai !== "dong-y" && trangThai !== "khac")) {
    return NextResponse.json({ ok: false, error: "Thiếu tham số" }, { status: 400 });
  }
  // Không đồng ý thì bắt buộc nhập lý do.
  if (trangThai === "khac" && !lyDo) {
    return NextResponse.json(
      { ok: false, error: "Vui lòng nhập lý do khi không đồng ý" },
      { status: 400 }
    );
  }

  const maNV = session.user.maNhanVien;
  const tenNV = session.user.name ?? "";
  const trangThaiLabel = trangThai === "dong-y" ? "Đồng ý" : "Không đồng ý";

  // 1) Ghi thẳng Google Sheet (nguồn chính).
  try {
    await ghiXacNhan({ maNV, tenNV, maKH, tenKH, trangThai: trangThaiLabel, lyDo });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `Không ghi được xác nhận: ${e instanceof Error ? e.message : "lỗi"}` },
      { status: 502 }
    );
  }

  // 2) Nếu còn cấu hình webhook n8n thì gọi thêm (không chặn, không làm hỏng kết quả).
  const webhookUrl = process.env.N8N_CONFIRM_WEBHOOK_URL;
  if (webhookUrl) {
    const params = new URLSearchParams({
      nv: maNV,
      tennv: tenNV,
      kh: maKH,
      tenkh: tenKH,
      tt: trangThai,
      lydo: lyDo,
    });
    try {
      await fetch(`${webhookUrl}?${params.toString()}`, { method: "GET" });
    } catch {
      // Bỏ qua lỗi n8n — nguồn chính đã ghi thành công.
    }
  }

  return NextResponse.json({ ok: true });
}
