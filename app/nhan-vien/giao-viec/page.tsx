import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import GiaoViecNhanVien from "@/components/GiaoViecNhanVien";
import { listGiaoViec, normMa } from "@/lib/giao-viec";

export const dynamic = "force-dynamic";

export default async function GiaoViecNhanVienPage() {
  const session = await auth();
  const user = session!.user!;
  const me = normMa(user.maNhanVien);

  const { tasks, error } = await listGiaoViec();
  const mine = tasks.filter((t) => normMa(t.maNV) === me);

  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="employee" active="giao-viec" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <h1 className="text-lg font-semibold text-slate-900">Việc được giao</h1>
        <p className="mt-1 text-sm text-slate-500">
          Việc quản lý giao cho bạn theo tuần. Bấm &quot;Hoàn thành&quot; sau khi làm xong; có thể ghi
          chú kết quả để quản lý nắm.
        </p>
        {error ? (
          <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">Lỗi tải dữ liệu: {error}</p>
        ) : null}
        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <GiaoViecNhanVien initialTasks={mine} variant="full" />
        </section>
      </main>
    </>
  );
}
