import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import GiaoViecManager from "@/components/GiaoViecManager";
import { listGiaoViec } from "@/lib/giao-viec";
import { buildGoiYGiaoViec } from "@/lib/goi-y-giao-viec";
import { allEmployees } from "@/lib/allowlist";
import { isoWeekKey } from "@/lib/tuan";
import { todayInVN } from "@/lib/report-utils";

export const dynamic = "force-dynamic";

export default async function GiaoViecQuanLyPage() {
  const session = await auth();
  const user = session!.user!;

  const tuan = isoWeekKey(todayInVN());
  const [{ tasks, error }, { goiY, error: goiYError }] = await Promise.all([
    listGiaoViec(),
    buildGoiYGiaoViec(tuan),
  ]);
  const employees = allEmployees()
    .map((e) => ({ ma: e.maNhanVien ?? "", hoTen: e.hoTen }))
    .filter((e) => e.ma);

  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="manager" active="giao-viec" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <h1 className="text-lg font-semibold text-slate-900">Giao việc cho nhân viên</h1>
        <p className="mt-1 text-sm text-slate-500">
          Web tự đề xuất việc tuần từ báo cáo tuần; bạn chỉ cần xem lại, sửa hoặc xoá. Nhân viên thấy
          ngay việc cần làm và tự đánh dấu hoàn thành để bạn theo dõi.
        </p>
        {error ? (
          <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">Lỗi tải việc đã giao: {error}</p>
        ) : null}
        {goiYError ? (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
            Chưa lấy được đề xuất tự động: {goiYError}
          </p>
        ) : null}
        <div className="mt-4">
          <GiaoViecManager
            employees={employees}
            initialTasks={tasks}
            suggestions={goiY}
            currentWeek={tuan}
          />
        </div>
      </main>
    </>
  );
}
