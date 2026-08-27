import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import WeeklyReportView from "@/components/WeeklyReportView";
import { getDanhGiaCungTuyen, getGoiYTapTrung, getXacNhanGoiY, getLichSuGoiY } from "@/lib/data";
import { buildEmployeeWeekSummaries, buildTonDongTuanTruoc } from "@/lib/aggregate";
import { getTeamSales } from "@/lib/sales";

const TEN_NHOM = "Hà Trọng Thủy";

export default async function BaoCaoTuanPage() {
  const session = await auth();
  const user = session!.user!;

  const [danhGia, goiY, xacNhan, lichSu, sales] = await Promise.all([
    getDanhGiaCungTuyen(),
    getGoiYTapTrung(),
    getXacNhanGoiY(),
    getLichSuGoiY(),
    getTeamSales(),
  ]);
  const { weekLabel, summaries } = buildEmployeeWeekSummaries(goiY, xacNhan, danhGia);
  const tonDongTuanTruoc = buildTonDongTuanTruoc(lichSu, xacNhan);

  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="manager" active="bao-cao-tuan" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <WeeklyReportView
          rows={danhGia}
          teamName={TEN_NHOM}
          salesTxns={sales.txns}
          salesError={sales.error}
          summaries={summaries}
          currentWeekLabel={weekLabel}
          tonDongTuanTruoc={tonDongTuanTruoc}
        />
      </main>
    </>
  );
}
