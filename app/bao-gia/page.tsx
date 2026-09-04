import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import BaoGiaView, { type CatalogUI } from "@/components/BaoGiaView";
import type { Role } from "@/lib/allowlist";
import { CATALOGS as SEED, NGAY_CAP_NHAT } from "@/lib/bao-gia-data";
import { docSanPham } from "@/lib/bao-gia-sheet";

export const metadata = {
  title: "Báo giá sản phẩm — CPC1 Hà Nội",
};

// Luôn đọc dữ liệu mới nhất từ Google Sheet mỗi lần vào trang (giá có thể đổi liên tục).
export const dynamic = "force-dynamic";

export default async function BaoGiaPage() {
  const session = await auth();
  const user = session!.user!;
  const hoTen = user.name ?? "";
  const role = (user.role ?? "employee") as Role;

  let catalogs: CatalogUI[];
  let suaDuoc = role === "manager";

  try {
    const rows = await docSanPham();
    catalogs = SEED.map((meta) => ({
      id: meta.id,
      ten: meta.ten,
      moTa: meta.moTa,
      pdf: meta.pdf,
      cover: meta.cover,
      kichThuoc: meta.kichThuoc,
      sanPham: rows
        .filter((r) => r.catalog === meta.id)
        .map((r) => ({
          id: r.id,
          nhom: r.nhom,
          ten: r.ten,
          hoatChat: r.hoatChat,
          quyCach: r.quyCach,
          gia: r.gia,
        })),
    }));
  } catch {
    // Không đọc được Sheet (thiếu cấu hình / mất mạng) -> hiển thị bản gốc trong code, KHÔNG cho sửa.
    suaDuoc = false;
    catalogs = SEED.map((meta) => ({
      id: meta.id,
      ten: meta.ten,
      moTa: meta.moTa,
      pdf: meta.pdf,
      cover: meta.cover,
      kichThuoc: meta.kichThuoc,
      sanPham: meta.sanPham.map((sp, i) => ({
        id: `${meta.id}-${i + 1}`,
        nhom: sp.nhom,
        ten: sp.ten,
        hoatChat: sp.hoatChat,
        quyCach: sp.quyCach,
        gia: sp.gia,
      })),
    }));
  }

  return (
    <>
      <AppHeader hoTen={hoTen} role={role} active="bao-gia" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-slate-900">Báo giá sản phẩm</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tải bộ báo giá PDF gửi khách hàng, hoặc tra nhanh giá từng sản phẩm ngay trên trang.
          </p>
        </div>
        <BaoGiaView catalogs={catalogs} suaDuoc={suaDuoc} ngayCapNhat={NGAY_CAP_NHAT} />
      </main>
    </>
  );
}
