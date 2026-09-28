import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPhatTrien, saveHoSo, saveNguyenVong, normMa, KY_NANG } from "@/lib/phat-trien";
import { allEmployees } from "@/lib/allowlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PHÁT TRIỂN CÁ NHÂN:
// - GET  : quản lý xem hồ sơ cả nhóm; nhân viên xem hồ sơ + nguyện vọng của chính mình.
// - POST : { action:"ho-so", maNV, kyNang[6], diemManh, canCaiThien, dinhHuong } -> quản lý ghi hồ sơ.
//          { action:"nguyen-vong", noiDung } -> nhân viên gửi nguyện vọng của mình.

export async function GET() {
  const session = await auth();
  const user = session?.user;
  if (!user || (user.role !== "employee" && user.role !== "manager")) {
    return NextResponse.json({ ok: false, error: "Không có quyền" }, { status: 403 });
  }
  try {
    const data = await getPhatTrien();
    if (user.role === "employee") {
      const me = normMa(user.maNhanVien);
      return NextResponse.json({
        ok: true,
        hoSo: data.hoSoByMa[me] ?? null,
        nguyenVong: data.nguyenVongByMa[me] ?? null,
        error: data.error,
      });
    }
    return NextResponse.json({
      ok: true,
      hoSoByMa: data.hoSoByMa,
      nguyenVongByMa: data.nguyenVongByMa,
      error: data.error,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Lỗi đọc" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user;
  if (!user || (user.role !== "employee" && user.role !== "manager")) {
    return NextResponse.json({ ok: false, error: "Không có quyền" }, { status: 403 });
  }
  let body: {
    action?: unknown; maNV?: unknown; kyNang?: unknown;
    diemManh?: unknown; canCaiThien?: unknown; dinhHuong?: unknown; noiDung?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body không hợp lệ" }, { status: 400 });
  }
  const action = String(body.action ?? "");

  // ---- Nhân viên gửi nguyện vọng ----
  if (action === "nguyen-vong") {
    if (user.role !== "employee") {
      return NextResponse.json({ ok: false, error: "Chỉ nhân viên gửi nguyện vọng" }, { status: 403 });
    }
    const noiDung = String(body.noiDung ?? "").trim();
    if (!noiDung) return NextResponse.json({ ok: false, error: "Chưa nhập nội dung" }, { status: 400 });
    try {
      await saveNguyenVong({ maNV: user.maNhanVien ?? "", tenNV: user.name ?? "", noiDung });
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Lỗi ghi" }, { status: 500 });
    }
  }

  // ---- Quản lý ghi hồ sơ ----
  if (action === "ho-so") {
    if (user.role !== "manager") {
      return NextResponse.json({ ok: false, error: "Chỉ quản lý ghi hồ sơ được" }, { status: 403 });
    }
    const maNV = normMa(body.maNV);
    const emp = allEmployees().find((e) => normMa(e.maNhanVien) === maNV);
    if (!emp) return NextResponse.json({ ok: false, error: "Nhân viên không hợp lệ" }, { status: 400 });
    const kyNangRaw = Array.isArray(body.kyNang) ? body.kyNang : [];
    const kyNang = KY_NANG.map((_, i) => Number(kyNangRaw[i]) || 0);
    try {
      await saveHoSo({
        maNV: emp.maNhanVien ?? "",
        tenNV: emp.hoTen,
        nguoiCapNhat: user.name ?? "Quản lý",
        kyNang,
        diemManh: String(body.diemManh ?? ""),
        canCaiThien: String(body.canCaiThien ?? ""),
        dinhHuong: String(body.dinhHuong ?? ""),
      });
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Lỗi ghi" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: false, error: "Hành động không hợp lệ" }, { status: 400 });
}
