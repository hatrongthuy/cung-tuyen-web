import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Nhân viên tự nhập "Code mới" (số nhà thuốc/khách mở mới trong tháng) — ghi qua webhook n8n,
// cùng mẫu với /api/confirm: chạy ở server để (1) không lộ URL webhook ra trình duyệt,
// (2) chỉ nhân viên đã đăng nhập mới ghi được, và luôn ghi đúng MÃ NV của chính họ (chống giả mạo).
//
// n8n nhận (GET, query string) rồi APPEND 1 dòng vào tab "Code mới nhập tay":
//   Thời điểm | Mã nhân viên | Tên nhân viên | Năm | Tháng | Tuần | Số code mới
// Bảng KPI đọc lại tab đó (lib/code-moi.ts), lấy lần nhập MỚI NHẤT trong tháng.

/** Ngày hiện tại theo giờ VN (Asia/Ho_Chi_Minh). */
function nowVN(): { nam: number; thang: number; ngay: number; tuan: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  const nam = get("year");
  const thang = get("month");
  const ngay = get("day");
  const tuan = Math.floor((ngay - 1) / 7) + 1; // tuần trong tháng (1..5)
  return { nam, thang, ngay, tuan };
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "employee" || !session.user.maNhanVien) {
    return NextResponse.json({ ok: false, error: "Không có quyền" }, { status: 403 });
  }

  const webhookUrl = process.env.N8N_CODE_MOI_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json(
      { ok: false, error: "Chưa cấu hình N8N_CODE_MOI_WEBHOOK_URL" },
      { status: 500 }
    );
  }

  let body: { so?: number | string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body không hợp lệ" }, { status: 400 });
  }

  const so = Math.round(Number(body.so));
  if (!Number.isFinite(so) || so < 0 || so > 1000) {
    return NextResponse.json({ ok: false, error: "Số Code mới không hợp lệ" }, { status: 400 });
  }

  const { nam, thang, tuan } = nowVN();
  const params = new URLSearchParams({
    nv: session.user.maNhanVien,
    tennv: session.user.name ?? "",
    nam: String(nam),
    thang: String(thang),
    tuan: String(tuan),
    so: String(so),
    ts: new Date().toISOString(),
  });

  try {
    const res = await fetch(`${webhookUrl}?${params.toString()}`, { method: "GET" });
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Webhook n8n trả lỗi (${res.status})` },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true, nam, thang, tuan, so });
  } catch {
    return NextResponse.json({ ok: false, error: "Không gọi được webhook n8n" }, { status: 502 });
  }
}
