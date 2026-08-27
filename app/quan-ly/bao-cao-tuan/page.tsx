import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import WeeklyReportView from "@/components/WeeklyReportView";
import { getDanhGiaCungTuyen, getGoiYTapTrung, getXacNhanGoiY, getLichSuGoiY } from "@/lib/data";
import { buildEmployeeWeekSummaries, buildTonDongTuanTruoc } from "@/lib/aggregate";
import { getTeamSales } from "@/lib/sales";
import { currentWeekLabel as computeCurrentWeek, todayInVN } from "@/lib/report-utils";

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
  // "Tuần hiện tại" theo NGÀY HÔM NAY (căn theo tuần đánh giá gần nhất). Có thể là tuần chưa
  // được chấm điểm cung tuyến (workflow chấm vào 20h thứ 7) — vẫn hiển thị doanh số + gặp gợi ý.
  const todayWeekLabel = computeCurrentWeek(weekLabel, todayInVN());

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
          todayWeekLabel={todayWeekLabel}
          tonDongTuanTruoc={tonDongTuanTruoc}
        />
      </main>
    </>
  );
}
