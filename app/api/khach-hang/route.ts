import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getKhachHangFull } from "@/lib/khach-hang";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Chi tiết 1 khách hàng — TẤT CẢ đơn (mọi nhân viên). Chỉ dùng cho màn xem chi tiết khách.
export async function GET(req: Request) {
  const session = await auth();
  const user = session?.user;
  if (!user || (user.role !== "employee" && user.role !== "manager")) {
    return NextResponse.json({ ok: false, error: "Không có quyền" }, { status: 403 });
  }
  const ma = new URL(req.url).searchParams.get("ma") ?? "";
  if (!ma.trim()) return NextResponse.json({ ok: false, error: "Thiếu mã khách hàng" }, { status: 400 });
  try {
    const data = await getKhachHangFull(ma);
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Lỗi đọc khách hàng" }, { status: 500 });
  }
}
