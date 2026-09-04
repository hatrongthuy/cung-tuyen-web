import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { capNhatGia } from "@/lib/bao-gia-sheet";

// Lưu giá báo giá — CHỈ quản lý (role "manager") được ghi. Ghi ngược vào tab "Báo giá"
// của Google Sheet chính qua service account.

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "manager") {
    return NextResponse.json({ ok: false, error: "Chỉ quản lý mới sửa được giá" }, { status: 403 });
  }

  let body: { updates?: { id?: string; gia?: string }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const raw = Array.isArray(body.updates) ? body.updates : [];
  if (raw.length === 0) {
    return NextResponse.json({ ok: false, error: "Không có thay đổi nào" }, { status: 400 });
  }
  if (raw.length > 1000) {
    return NextResponse.json({ ok: false, error: "Quá nhiều thay đổi" }, { status: 400 });
  }

  const updates: { id: string; gia: string }[] = [];
  for (const u of raw) {
    const id = typeof u.id === "string" ? u.id.trim() : "";
    let gia = typeof u.gia === "string" ? u.gia : "";
    if (!id) continue;
    gia = gia.replace(/\s+/g, " ").trim().slice(0, 120);
    updates.push({ id, gia });
  }
  if (updates.length === 0) {
    return NextResponse.json({ ok: false, error: "Không có thay đổi hợp lệ" }, { status: 400 });
  }

  try {
    const changed = await capNhatGia(updates);
    return NextResponse.json({ ok: true, changed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định";
    return NextResponse.json({ ok: false, error: `Không lưu được: ${msg}` }, { status: 502 });
  }
}
