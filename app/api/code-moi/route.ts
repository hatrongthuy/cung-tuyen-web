import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { appendCodeMoi } from "@/lib/code-moi";

// Nhân viên tự nhập "Code mới" (số nhà thuốc/khách mở mới trong tháng).
// Web GHI THẲNG vào Google Sheet bằng service account quyền ghi (không cần webhook/n8n).
// Chạy ở server để chỉ nhân viên đã đăng nhập mới ghi được, và luôn ghi đúng MÃ NV của chính họ.

/** Ngày hiện tại theo giờ VN. */
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
  try {
    await appendCodeMoi({
      ma: session.user.maNhanVien,
      ten: session.user.name ?? "",
      nam,
      thang,
      tuan,
      so,
    });
    return NextResponse.json({ ok: true, nam, thang, tuan, so });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi ghi dữ liệu";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
