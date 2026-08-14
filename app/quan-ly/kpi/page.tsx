import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";

export default async function KpiPage() {
  const session = await auth();
  const user = session!.user!;

  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="manager" active="kpi" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <div>
          <h1 className="text-base font-semibold text-slate-900">KPI</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Trang theo dõi chỉ tiêu KPI của nhóm.
          </p>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-700">Tính năng đang được phát triển</p>
          <p className="mt-1 text-xs text-slate-400">
            Trang KPI sẽ sớm được bổ sung. Cho mình biết bạn muốn theo dõi những chỉ tiêu gì để
            triển khai tiếp nhé.
          </p>
        </section>
      </main>
    </>
  );
}
