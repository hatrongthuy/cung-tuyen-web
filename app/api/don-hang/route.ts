import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { allEmployees } from "@/lib/allowlist";
import { appendDon, docDonNhapTay, xoaDon } from "@/lib/don-nhap-tay";

// Thêm / xóa ĐƠN HÀNG NHẬP TAY (để theo dõi trong mục Sale).
// - Nhân viên: chỉ thêm/xóa đơn của CHÍNH MÌNH (mã NV lấy từ phiên đăng nhập).
// - Quản lý: thêm đơn cho 1 TDV trong nhóm (chọn mã NV), xóa được mọi đơn.

const normMa = (v: unknown) => String(v ?? "").trim().replace(/^0+(?=\d)/, "");

/** Chuẩn hóa ngày về dd/MM/yyyy. Nhận yyyy-MM-dd (input date) hoặc dd/MM/yyyy. Rỗng nếu sai. */
function chuanNgay(v: unknown): string {
  const s = String(v ?? "").trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[3].padStart(2, "0")}/${m[2].padStart(2, "0")}/${m[1]}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}/${m[3]}`;
  return "";
}

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user;
  if (!user || (user.role !== "employee" && user.role !== "manager")) {
    return NextResponse.json({ ok: false, error: "Không có quyền" }, { status: 403 });
  }

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body không hợp lệ" }, { status: 400 });
  }

  // Xác định nhân viên của đơn.
  let maNV = "";
  let tenNV = "";
  const team = allEmployees();
  if (user.role === "employee") {
    maNV = user.maNhanVien ?? "";
    tenNV = user.name ?? "";
    if (!maNV) return NextResponse.json({ ok: false, error: "Thiếu mã nhân viên" }, { status: 400 });
  } else {
    // Quản lý: phải chọn TDV trong nhóm.
    const chon = normMa(b.maNV);
    const nv = team.find((e) => normMa(e.maNhanVien) === chon);
    if (!nv) return NextResponse.json({ ok: false, error: "Chọn nhân viên (TDV) hợp lệ trong nhóm" }, { status: 400 });
    maNV = String(nv.maNhanVien ?? "");
    tenNV = nv.hoTen;
  }

  const maKH = String(b.maKH ?? "").trim();
  const tenKH = String(b.tenKH ?? "").trim();
  const maSP = String(b.maSP ?? "").trim();
  const tenSP = String(b.tenSP ?? "").trim();
  const ngayDuyet = chuanNgay(b.ngayDuyet);
  const soLuong = Math.round(Number(b.soLuong));
  const khuyenMai = Math.round(Number(b.khuyenMai || 0));
  const doanhThu = Math.round(Number(b.doanhThu || 0));

  if (!maKH && !tenKH) return NextResponse.json({ ok: false, error: "Thiếu khách hàng" }, { status: 400 });
  if (!maSP && !tenSP) return NextResponse.json({ ok: false, error: "Thiếu sản phẩm" }, { status: 400 });
  if (!ngayDuyet) return NextResponse.json({ ok: false, error: "Thiếu ngày duyệt đơn (đúng định dạng)" }, { status: 400 });
  if (!Number.isFinite(soLuong) || soLuong < 0 || soLuong > 1000000) {
    return NextResponse.json({ ok: false, error: "Số lượng không hợp lệ" }, { status: 400 });
  }

  try {
    const id = await appendDon({
      maNV, tenNV,
      maKH, tenKH: tenKH || maKH,
      tinh: String(b.tinh ?? "").trim(),
      nhomKH: String(b.nhomKH ?? "").trim(),
      maSP, tenSP: tenSP || maSP,
      soLuong, khuyenMai, doanhThu,
      ngayDuyet,
      ghiChu: String(b.ghiChu ?? "").trim(),
    });
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Lỗi ghi đơn" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  const user = session?.user;
  if (!user || (user.role !== "employee" && user.role !== "manager")) {
    return NextResponse.json({ ok: false, error: "Không có quyền" }, { status: 403 });
  }
  let b: { id?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body không hợp lệ" }, { status: 400 });
  }
  const id = String(b.id ?? "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "Thiếu id" }, { status: 400 });
  try {
    // Nhân viên chỉ xóa đơn của mình; quản lý xóa mọi đơn.
    const ok = await xoaDon(id, user.role === "employee" ? (user.maNhanVien ?? "") : undefined);
    return NextResponse.json({ ok });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Lỗi xóa đơn" }, { status: 500 });
  }
}

// Danh sách đơn nhập tay (để hiển thị/quản lý).
export async function GET() {
  const session = await auth();
  const user = session?.user;
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  try {
    let dons = await docDonNhapTay();
    if (user.role === "employee") {
      const me = normMa(user.maNhanVien);
      dons = dons.filter((d) => normMa(d.maNV) === me);
    }
    // mới nhất trước
    dons.reverse();
    return NextResponse.json({ ok: true, dons });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Lỗi đọc đơn" }, { status: 500 });
  }
}
