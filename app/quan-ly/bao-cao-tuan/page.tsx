import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import WeeklyReportView from "@/components/WeeklyReportView";
import { getDanhGiaCungTuyen } from "@/lib/data";
import { getTeamSales } from "@/lib/sales";

const TEN_NHOM = "Hà Trọng Thủy";

export default async function BaoCaoTuanPage() {
  const session = await auth();
  const user = session!.user!;

  const [rows, sales] = await Promise.all([getDanhGiaCungTuyen(), getTeamSales()]);

  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="manager" active="bao-cao-tuan" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <WeeklyReportView rows={rows} teamName={TEN_NHOM} salesTxns={sales.txns} salesError={sales.error} />
      </main>
    </>
  );
}
