import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import MonthlyReportView from "@/components/MonthlyReportView";
import { getDanhGiaCungTuyen } from "@/lib/data";
import { getKpiTabData } from "@/lib/kpi";
import { getTeamSales } from "@/lib/sales";
import { monthKeyOf, todayInVN } from "@/lib/report-utils";

import { TEN_NHOM, TEN_NHOM_HIEN_THI } from "@/lib/scope";

export default async function BaoCaoThangPage() {
  const session = await auth();
  const user = session!.user!;

  const [danhGia, doanhSo, kpis, sales] = await Promise.all([
    getDanhGiaCungTuyen(),
    getKpiTabData("doanh-so", TEN_NHOM),
    getKpiTabData("kpis", TEN_NHOM),
    getTeamSales(),
  ]);

  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="manager" active="bao-cao-thang" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <MonthlyReportView
          danhGia={danhGia}
          doanhSo={doanhSo}
          kpis={kpis}
          teamName={TEN_NHOM_HIEN_THI}
          salesTxns={sales.txns}
          salesError={sales.error}
          todayMonthKey={monthKeyOf(todayInVN())}
        />
      </main>
    </>
  );
}
