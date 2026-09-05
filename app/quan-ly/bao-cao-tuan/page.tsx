import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import WeeklyReportView from "@/components/WeeklyReportView";
import DailyProgressView from "@/components/DailyProgressView";
import { getDanhGiaCungTuyen, getGoiYTapTrung, getXacNhanGoiY, getLichSuGoiY } from "@/lib/data";
import { buildEmployeeWeekSummaries, buildTonDongTuanTruoc } from "@/lib/aggregate";
import { getTeamSales } from "@/lib/sales";
import { getKpiTabData } from "@/lib/kpi";
import { currentWeekLabel as computeCurrentWeek, todayInVN } from "@/lib/report-utils";

const TEN_NHOM = "Hà Trọng Thủy";

// Luôn tính số liệu mới nhất mỗi lần mở (tiến độ cập nhật hàng ngày).
export const dynamic = "force-dynamic";

export default async function BaoCaoTuanPage() {
  const session = await auth();
  const user = session!.user!;

  const [danhGia, goiY, xacNhan, lichSu, sales, kpiDoanhSo] = await Promise.all([
    getDanhGiaCungTuyen(),
    getGoiYTapTrung(),
    getXacNhanGoiY(),
    getLichSuGoiY(),
    getTeamSales(),
    getKpiTabData("doanh-so", TEN_NHOM),
  ]);
  const { weekLabel, summaries } = buildEmployeeWeekSummaries(goiY, xacNhan, danhGia);
  const tonDongTuanTruoc = buildTonDongTuanTruoc(lichSu, xacNhan);
  const todayWeekLabel = computeCurrentWeek(weekLabel, todayInVN());

  // Bối cảnh ngày (giờ VN) cho báo cáo tiến độ lũy kế tới hôm nay.
  const today = todayInVN();
  const nam = today.getFullYear();
  const thang = today.getMonth() + 1;
  const ngay = today.getDate();
  const soNgayThang = new Date(nam, thang, 0).getDate();
  const ctx = {
    nam,
    thang,
    ngay,
    soNgayThang,
    monthStartMs: new Date(nam, thang - 1, 1).getTime(),
    nowMs: new Date(nam, thang - 1, ngay, 23, 59, 59, 999).getTime(),
    weekAgoMs: new Date(nam, thang - 1, ngay, 23, 59, 59, 999).getTime() - 7 * 86400 * 1000,
  };

  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="manager" active="bao-cao-tuan" />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-6">
        <DailyProgressView
          teamName={TEN_NHOM}
          salesTxns={sales.txns}
          salesError={sales.error}
          kpiCols={kpiDoanhSo.columns}
          kpiRows={kpiDoanhSo.rows}
          kpiError={kpiDoanhSo.error}
          summaries={summaries}
          ctx={ctx}
        />

        <details className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">
            Báo cáo tuần chi tiết (bảng &amp; biểu đồ theo tuần)
          </summary>
          <div className="border-t border-slate-100 p-4">
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
          </div>
        </details>
      </main>
    </>
  );
}
