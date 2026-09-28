import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import PhatTrienManager from "@/components/PhatTrienManager";
import { getPhatTrien } from "@/lib/phat-trien";
import { allEmployees } from "@/lib/allowlist";

export const dynamic = "force-dynamic";

export default async function PhatTrienQuanLyPage() {
  const session = await auth();
  const user = session!.user!;

  const { hoSoByMa, nguyenVongByMa, error } = await getPhatTrien();
  const employees = allEmployees()
    .map((e) => ({ ma: e.maNhanVien ?? "", hoTen: e.hoTen }))
    .filter((e) => e.ma);

  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="manager" active="phat-trien" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <h1 className="text-lg font-semibold text-slate-900">Phát triển cá nhân — Đào tạo</h1>
        <p className="mt-1 text-sm text-slate-500">
          Đánh giá kỹ năng từng nhân viên, ghi điểm mạnh / điểm cần cải thiện và định hướng đào tạo–kèm
          cặp. Nhân viên sẽ thấy hồ sơ của mình và có thể gửi nguyện vọng lại cho bạn.
        </p>
        {error ? (
          <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">Lỗi tải dữ liệu: {error}</p>
        ) : null}
        <div className="mt-4">
          <PhatTrienManager
            employees={employees}
            initialHoSo={hoSoByMa}
            initialNguyenVong={nguyenVongByMa}
          />
        </div>
      </main>
    </>
  );
}
