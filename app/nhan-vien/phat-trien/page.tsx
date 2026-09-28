import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import PhatTrienNhanVien from "@/components/PhatTrienNhanVien";
import { getPhatTrien, normMa } from "@/lib/phat-trien";

export const dynamic = "force-dynamic";

export default async function PhatTrienNhanVienPage() {
  const session = await auth();
  const user = session!.user!;
  const me = normMa(user.maNhanVien);

  const { hoSoByMa, nguyenVongByMa, error } = await getPhatTrien();

  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="employee" active="phat-trien" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <h1 className="text-lg font-semibold text-slate-900">Phát triển cá nhân của tôi</h1>
        <p className="mt-1 text-sm text-slate-500">
          Xem đánh giá kỹ năng, điểm mạnh, điểm cần cải thiện và định hướng đào tạo quản lý dành cho bạn.
          Bạn có thể gửi nguyện vọng phát triển của mình.
        </p>
        {error ? (
          <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">Lỗi tải dữ liệu: {error}</p>
        ) : null}
        <div className="mt-4">
          <PhatTrienNhanVien hoSo={hoSoByMa[me] ?? null} nguyenVong={nguyenVongByMa[me] ?? null} />
        </div>
      </main>
    </>
  );
}
