import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Gọi webhook n8n "Nhận xác nhận gợi ý" (node webhook, method GET, đọc tham số qua
// query string — KHÔNG phải POST JSON). Xem docs/data-schema.md mục 1 để biết vì sao.
// Route này chạy ở server để: (1) không lộ URL webhook thật ra trình duyệt nhân viên,
// (2) đảm bảo chỉ nhân viên đã đăng nhập đúng của mình mới gửi được xác nhận.

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "employee" || !session.user.maNhanVien) {
    return NextResponse.json({ ok: false, error: "Không có quyền" }, { status: 403 });
  }

  const webhookUrl = process.env.N8N_CONFIRM_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json(
      { ok: false, error: "Chưa cấu hình N8N_CONFIRM_WEBHOOK_URL" },
      { status: 500 }
    );
  }

  let body: { maKH?: string; tenKH?: string; trangThai?: "dong-y" | "khac" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body không hợp lệ" }, { status: 400 });
  }

  const { maKH, tenKH, trangThai } = body;
  if (!maKH || !tenKH || (trangThai !== "dong-y" && trangThai !== "khac")) {
    return NextResponse.json({ ok: false, error: "Thiếu tham số" }, { status: 400 });
  }

  // Chỉ cho phép nhân viên xác nhận đúng danh tính của chính mình (chống giả mạo mã NV).
  const params = new URLSearchParams({
    nv: session.user.maNhanVien,
    tennv: session.user.name ?? "",
    kh: maKH,
    tenkh: tenKH,
    tt: trangThai,
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
