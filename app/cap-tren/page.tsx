import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import StatCard from "@/components/StatCard";
import ScoreTrendChart from "@/components/ScoreTrendChart";
import EmployeeBarChart from "@/components/EmployeeBarChart";
import { getDanhGiaCungTuyen, getGoiYTapTrung, getXacNhanGoiY } from "@/lib/data";
import { averageScoreByWeek, buildEmployeeWeekSummaries } from "@/lib/aggregate";
import { colorForIndex } from "@/lib/colors";

export default async function CapTrenPage() {
  const session = await auth();
  const user = session!.user!;

  const [goiY, danhGia, xacNhan] = await Promise.all([
    getGoiYTapTrung(),
    getDanhGiaCungTuyen(),
    getXacNhanGoiY(),
  ]);

  const { weekLabel, summaries } = buildEmployeeWeekSummaries(goiY, xacNhan, danhGia);
  const xuHuong = averageScoreByWeek(danhGia).map((p) => ({ tuan: p.tuan, diem: Math.round(p.diemTrungBinh * 10) / 10 }));

  const diemTrungBinhTuanNay = summaries.length
    ? Math.round(
        (summaries.reduce((s, x) => s + (x.diemCungTuyen ?? 0), 0) / summaries.length) * 10
      ) / 10
    : 0;

  const tyLeHoanThanhTrungBinh = summaries.length
    ? Math.round(
        (summaries.reduce((s, x) => s + x.tyLeHoanThanh, 0) / summaries.length) * 100
      )
    : 0;

  const completionChart = summaries.map((s) => ({
    hoTen: s.hoTen,
    giaTri: Math.round(s.tyLeHoanThanh * 100),
  }));

  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="superior" weekLabel={weekLabel} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <p className="mb-4 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
          Đây là dashboard chỉ xem tổng quan — không có thao tác chỉnh sửa dữ liệu.
        </p>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard
            label="Điểm trung bình nhóm (tuần này)"
            value={diemTrungBinhTuanNay}
            accentColor="#2a78d6"
          />
          <StatCard
            label="Tỷ lệ hoàn thành cung tuyến TB"
            value={`${tyLeHoanThanhTrungBinh}%`}
            accentColor="#1baf7a"
          />
          <StatCard label="Số nhân viên" value={summaries.length} accentColor="#eb6834" />
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Xu hướng điểm trung bình nhóm theo tuần
            </h2>
            <ScoreTrendChart data={xuHuong} seriesLabel="Điểm trung bình nhóm" colorIndex={0} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Tỷ lệ hoàn thành cung tuyến (đã gặp / tổng gợi ý) từng nhân viên
            </h2>
            <EmployeeBarChart
              data={completionChart}
              valueLabel="Tỷ lệ hoàn thành"
              valueFormatter={(v) => `${v}%`}
            />
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Chi tiết theo nhân viên</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-medium">Nhân viên</th>
                  <th className="py-2 pr-3 font-medium">Số gợi ý</th>
                  <th className="py-2 pr-3 font-medium">Đã gặp</th>
                  <th className="py-2 pr-3 font-medium">Tỷ lệ hoàn thành</th>
                  <th className="py-2 pr-3 font-medium">Điểm cung tuyến</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((s, idx) => (
                  <tr key={s.maNhanVien} className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-medium text-slate-800">
                      <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: colorForIndex(idx) }} />
                      {s.hoTen}
                    </td>
                    <td className="py-2 pr-3 text-slate-600">{s.soGoiY}</td>
                    <td className="py-2 pr-3 text-slate-600">{s.soDongY}</td>
                    <td className="py-2 pr-3 text-slate-600">
                      {Math.round(s.tyLeHoanThanh * 100)}%
                    </td>
                    <td className="py-2 pr-3 font-semibold text-slate-900">
                      {s.diemCungTuyen ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
