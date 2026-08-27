"use client";

import { useMemo, useState } from "react";
import StatCard from "@/components/StatCard";
import EmployeeBarChart from "@/components/EmployeeBarChart";
import ScoreTrendChart from "@/components/ScoreTrendChart";
import ReportToolbar from "@/components/ReportToolbar";
import { downloadCsv } from "@/lib/csv";
import { distinctWeeksDesc, parseInt0 } from "@/lib/report-utils";

// Tên cột trong tab "Đánh giá cung tuyến tuần".
const C = {
  tuan: "Tuần",
  ma: "Mã nhân viên",
  ten: "Tên nhân viên",
  gap: "Số lượt gặp khách",
  phanHoi: "Số lượt phản hồi thông tin hàng hóa",
  sale: "Số lượt phát sinh sale",
  diem: "Tổng điểm cung tuyến",
};

type Row = Record<string, string>;

export default function WeeklyReportView({ rows, teamName }: { rows: Row[]; teamName: string }) {
  const weeks = useMemo(() => distinctWeeksDesc(rows.map((r) => r[C.tuan])), [rows]);
  const [week, setWeek] = useState<string>(weeks[0] ?? "");

  const weekRows = useMemo(() => rows.filter((r) => r[C.tuan] === week), [rows, week]);

  const perEmp = useMemo(
    () =>
      weekRows
        .map((r) => ({
          ten: r[C.ten] || r[C.ma] || "(không tên)",
          gap: parseInt0(r[C.gap]),
          phanHoi: parseInt0(r[C.phanHoi]),
          sale: parseInt0(r[C.sale]),
          diem: parseInt0(r[C.diem]),
        }))
        .sort((a, b) => b.diem - a.diem),
    [weekRows]
  );

  const tong = useMemo(
    () =>
      perEmp.reduce(
        (a, e) => ({
          gap: a.gap + e.gap,
          phanHoi: a.phanHoi + e.phanHoi,
          sale: a.sale + e.sale,
          diem: a.diem + e.diem,
        }),
        { gap: 0, phanHoi: 0, sale: 0, diem: 0 }
      ),
    [perEmp]
  );

  // Xu hướng tổng điểm cả nhóm theo từng tuần (cũ -> mới).
  const trend = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const t = r[C.tuan];
      if (!t) continue;
      map.set(t, (map.get(t) ?? 0) + parseInt0(r[C.diem]));
    }
    return distinctWeeksDesc([...map.keys()])
      .reverse()
      .map((t) => ({ tuan: t, diem: map.get(t) ?? 0 }));
  }, [rows]);

  function exportCsv() {
    const header = ["Nhân viên", "Số lượt gặp khách", "Phản hồi hàng hóa", "Phát sinh sale", "Tổng điểm cung tuyến"];
    const body = perEmp.map((e) => [e.ten, e.gap, e.phanHoi, e.sale, e.diem]);
    const footer = ["TỔNG", tong.gap, tong.phanHoi, tong.sale, tong.diem];
    downloadCsv(`bao-cao-tuan_${teamName}_${week.replace(/[^\d]/g, "-")}`, [
      [`Báo cáo tuần — Nhóm ${teamName}`],
      [`Tuần: ${week}`],
      [],
      header,
      ...body,
      footer,
    ]);
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Báo cáo tuần — Nhóm {teamName}</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Tổng hợp hoạt động cung tuyến (gặp khách, phản hồi, phát sinh sale, điểm) theo từng tuần.
          </p>
        </div>
        <ReportToolbar onExportCsv={exportCsv} className="no-print" />
      </div>

      {weeks.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-700">Chưa có dữ liệu đánh giá cung tuyến</p>
          <p className="mt-1 text-xs text-slate-400">
            Bảng &quot;Đánh giá cung tuyến tuần&quot; trong Google Sheet hiện chưa có dòng nào.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <label className="text-xs font-medium text-slate-600">Chọn tuần:</label>
            <select
              value={week}
              onChange={(e) => setWeek(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
            >
              {weeks.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>

          <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Lượt gặp khách" value={tong.gap} accentColor="#2a78d6" />
            <StatCard label="Phản hồi hàng hóa" value={tong.phanHoi} accentColor="#1baf7a" />
            <StatCard label="Phát sinh sale" value={tong.sale} accentColor="#eda100" />
            <StatCard label="Tổng điểm cung tuyến" value={tong.diem} accentColor="#eb6834" />
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Điểm cung tuyến theo nhân viên</h2>
              <EmployeeBarChart
                data={perEmp.map((e) => ({ hoTen: e.ten, giaTri: e.diem }))}
                valueLabel="Điểm cung tuyến"
              />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Xu hướng tổng điểm nhóm theo tuần</h2>
              <ScoreTrendChart data={trend} seriesLabel="Tổng điểm nhóm" colorIndex={2} />
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Chi tiết theo nhân viên — tuần {week}</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="py-2 pr-3 font-medium">Nhân viên</th>
                    <th className="py-2 pr-3 text-right font-medium">Gặp khách</th>
                    <th className="py-2 pr-3 text-right font-medium">Phản hồi hàng hóa</th>
                    <th className="py-2 pr-3 text-right font-medium">Phát sinh sale</th>
                    <th className="py-2 pr-3 text-right font-medium">Tổng điểm</th>
                  </tr>
                </thead>
                <tbody>
                  {perEmp.map((e, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-2 pr-3 font-medium text-slate-800">{e.ten}</td>
                      <td className="py-2 pr-3 text-right text-slate-700">{e.gap}</td>
                      <td className="py-2 pr-3 text-right text-slate-700">{e.phanHoi}</td>
                      <td className="py-2 pr-3 text-right text-slate-700">{e.sale}</td>
                      <td className="py-2 pr-3 text-right font-semibold text-slate-900">{e.diem}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-300 font-semibold">
                    <td className="py-2 pr-3 text-slate-900">TỔNG</td>
                    <td className="py-2 pr-3 text-right text-slate-900">{tong.gap}</td>
                    <td className="py-2 pr-3 text-right text-slate-900">{tong.phanHoi}</td>
                    <td className="py-2 pr-3 text-right text-slate-900">{tong.sale}</td>
                    <td className="py-2 pr-3 text-right text-slate-900">{tong.diem}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
