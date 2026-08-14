import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";

export default async function DoanhSoPage() {
  const session = await auth();
  const user = session!.user!;

  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="manager" active="doanh-so" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Doanh số</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Trang tổng hợp doanh số của nhóm.
          </p>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-700">Tính năng đang được phát triển</p>
          <p className="mt-1 text-xs text-slate-400">
            Trang Doanh số sẽ sớm được bổ sung. Cho mình biết bạn muốn xem doanh số theo cách nào
            (theo nhân viên, theo tỉnh, theo tháng...) để triển khai tiếp nhé.
          </p>
        </section>
      </main>
    </>
  );
}
