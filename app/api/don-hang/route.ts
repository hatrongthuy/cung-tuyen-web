import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDonKeToan } from "@/lib/don-ke-toan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const normMa = (v: unknown) => String(v ?? "").trim().replace(/^0+(?=\d)/, "");

// Danh sách ĐƠN HÀNG TDV ĐÃ ĐẶT (lấy từ "Đơn kế toán" của file nguồn), để hiển thị theo dõi.
// - Nhân viên: chỉ thấy đơn của chính mình.
// - Quản lý: thấy đơn của cả nhóm.
export async function GET() {
  const session = await auth();
  const user = session?.user;
  if (!user || (user.role !== "employee" && user.role !== "manager")) {
    return NextResponse.json({ ok: false, error: "Không có quyền" }, { status: 403 });
  }
  try {
    const { dons, error } = await getDonKeToan();
    let ds = dons;
    if (user.role === "employee") {
      const me = normMa(user.maNhanVien);
      ds = ds.filter((d) => normMa(d.maNV) === me);
    }
    return NextResponse.json({ ok: true, dons: ds, error });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Lỗi đọc đơn" }, { status: 500 });
  }
}
