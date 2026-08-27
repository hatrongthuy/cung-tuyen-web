"use client";

import { useMemo, useState } from "react";
import StatCard from "@/components/StatCard";
import EmployeeBarChart from "@/components/EmployeeBarChart";
import ReportToolbar from "@/components/ReportToolbar";
import { downloadCsv } from "@/lib/csv";
import { formatVnd, formatShortVnd, parseMoney, pct } from "@/lib/format";
import {
  distinctMonthsDesc,
  monthKeyOfWeek,
  parseInt0,
  findColumn,
  normalizeMaNV,
  salesByMonth,
  sumValues,
  type SaleTxnLite,
} from "@/lib/report-utils";

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
interface TabData {
  columns: string[];
  rows: Row[];
  error?: string | null;
}

export default function MonthlyReportView({
  danhGia,
  doanhSo,
  kpis,
  teamName,
  salesTxns = [],
  salesError,
}: {
  danhGia: Row[];
  doanhSo: TabData;
  kpis: TabData;
  teamName: string;
  salesTxns?: SaleTxnLite[];
  salesError?: string | null;
}) {
  const months = useMemo(() => distinctMonthsDesc(danhGia.map((r) => r[C.tuan])), [danhGia]);
  const [month, setMonth] = useState<string>(months[0] ?? "");

  // "MM/YYYY" -> số tháng/năm để cộng doanh số thực hiện.
  const [thangSel, namSel] = useMemo(() => {
    const [mm, yy] = (month || "").split("/").map(Number);
    return [mm || 0, yy || 0];
  }, [month]);
  const actualByMa = useMemo(() => salesByMonth(salesTxns, namSel, thangSel), [salesTxns, namSel, thangSel]);
  const actualTotal = useMemo(() => sumValues(actualByMa), [actualByMa]);

  // ----- Cung tuyến trong tháng: gộp các tuần thuộc tháng đã chọn theo nhân viên -----
  const cungTuyen = useMemo(() => {
    const inMonth = danhGia.filter((r) => monthKeyOfWeek(r[C.tuan]) === month);
    const map = new Map<string, { ma: string; ten: string; gap: number; phanHoi: number; sale: number; diem: number; soTuan: number }>();
    for (const r of inMonth) {
      const ma = normalizeMaNV(r[C.ma]);
      const key = ma || (r[C.ten] || "").trim();
      if (!key) continue;
      const cur = map.get(key) ?? { ma, ten: r[C.ten] || key, gap: 0, phanHoi: 0, sale: 0, diem: 0, soTuan: 0 };
      cur.gap += parseInt0(r[C.gap]);
      cur.phanHoi += parseInt0(r[C.phanHoi]);
      cur.sale += parseInt0(r[C.sale]);
      cur.diem += parseInt0(r[C.diem]);
      cur.soTuan += 1;
      map.set(key, cur);
    }
    return [...map.values()]
      .map((e) => ({ ...e, doanhThu: actualByMa[e.ma] ?? 0 }))
      .sort((a, b) => b.doanhThu - a.doanhThu || b.diem - a.diem);
  }, [danhGia, month, actualByMa]);

  const tongCT = useMemo(
    () => cungTuyen.reduce((a, e) => ({ gap: a.gap + e.gap, phanHoi: a.phanHoi + e.phanHoi, sale: a.sale + e.sale, diem: a.diem + e.diem }), { gap: 0, phanHoi: 0, sale: 0, diem: 0 }),
    [cungTuyen]
  );

  // ----- Doanh số tháng (ảnh chụp tháng hiện tại trong file KPI) -----
  const ds = useMemo(() => {
    const cols = doanhSo.columns;
    const viTri = findColumn(cols, ["vị trí"]) ?? cols[0] ?? "";
    const kdKH = findColumn(cols, ["kê đơn", "kế hoạch"]);
    const kdTH = findColumn(cols, ["kê đơn", "thực hiện"]);
    const nvkd = viTri ? doanhSo.rows.filter((r) => (r[viTri] ?? "").trim().toUpperCase() === "NVKD") : doanhSo.rows;
    const rows = (nvkd.length ? nvkd : doanhSo.rows);
    const KH = rows.reduce((s, r) => s + (kdKH ? parseMoney(r[kdKH]) : 0), 0);
    const TH = rows.reduce((s, r) => s + (kdTH ? parseMoney(r[kdTH]) : 0), 0);
    return { KH, TH };
  }, [doanhSo]);

  // ----- KPIs tháng: tổng điểm KPIs theo nhân viên -----
  const kpiRows = useMemo(() => {
    const cols = kpis.columns;
    const ten = findColumn(cols, ["tên nhân"]) ?? "";
    const diemTH = findColumn(cols, ["tổng điểm kpis th"]) ?? findColumn(cols, ["tổng điểm kpis"]);
    return kpis.rows
      .map((r) => ({ ten: ten ? r[ten] : "", diem: diemTH ? parseInt0(r[diemTH]) : 0 }))
      .filter((r) => r.ten);
  }, [kpis]);

  function exportCsv() {
    const rows: (string | number)[][] = [
      [`Báo cáo tháng — Nhóm ${teamName}`],
      [`Tháng: ${month}`],
      [],
      ["A. HOẠT ĐỘNG CUNG TUYẾN TRONG THÁNG"],
      ["Nhân viên", "Doanh số thực hiện", "Số tuần", "Gặp khách", "Phản hồi hàng hóa", "Phát sinh sale", "Tổng điểm"],
      ...cungTuyen.map((e) => [e.ten, Math.round(e.doanhThu), e.soTuan, e.gap, e.phanHoi, e.sale, e.diem]),
      ["TỔNG", Math.round(actualTotal), "", tongCT.gap, tongCT.phanHoi, tongCT.sale, tongCT.diem],
      [],
      ["B. DOANH SỐ — KẾ HOẠCH vs THỰC HIỆN"],
      ["Kế hoạch (kê đơn, từ file KPI)", Math.round(ds.KH)],
      ["Thực hiện (tổng, từ file Sale)", Math.round(actualTotal)],
      ["Tỷ lệ hoàn thành (%)", Math.round(pct(actualTotal, ds.KH))],
    ];
    if (kpiRows.length) {
      rows.push([], ["C. TỔNG ĐIỂM KPIs THEO NHÂN VIÊN"], ["Nhân viên", "Tổng điểm KPIs"]);
      kpiRows.forEach((k) => rows.push([k.ten, k.diem]));
    }
    downloadCsv(`bao-cao-thang_${teamName}_${month.replace("/", "-")}`, rows);
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Báo cáo tháng — Nhóm {teamName}</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Tổng hợp hoạt động cung tuyến cả tháng, doanh số kê đơn và tổng điểm KPIs.
          </p>
        </div>
        <ReportToolbar onExportCsv={exportCsv} className="no-print" />
      </div>

      {months.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-700">Chưa có dữ liệu để lập báo cáo tháng</p>
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <label className="text-xs font-medium text-slate-600">Chọn tháng:</label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
            >
              {months.map((m) => (
                <option key={m} value={m}>Tháng {m}</option>
              ))}
            </select>
          </div>

          {/* A. Cung tuyến tháng */}
          <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Doanh số tháng" value={formatShortVnd(actualTotal)} hint={`${formatVnd(actualTotal)} đ`} accentColor="#1baf7a" />
            <StatCard label="Lượt gặp khách" value={tongCT.gap} accentColor="#2a78d6" />
            <StatCard label="Phản hồi hàng hóa" value={tongCT.phanHoi} accentColor="#4a3aa7" />
            <StatCard label="Phát sinh sale" value={tongCT.sale} accentColor="#eda100" />
            <StatCard label="Tổng điểm cung tuyến" value={tongCT.diem} accentColor="#eb6834" />
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">A. Hoạt động cung tuyến trong tháng {month}</h2>
            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              <EmployeeBarChart data={cungTuyen.map((e) => ({ hoTen: e.ten, giaTri: e.diem }))} valueLabel="Tổng điểm tháng" />
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="text-slate-500">
                    <tr className="border-b border-slate-200">
                      <th className="py-2 pr-3 font-medium">Nhân viên</th>
                      <th className="py-2 pr-3 text-right font-medium">Doanh số</th>
                      <th className="py-2 pr-3 text-right font-medium">Số tuần</th>
                      <th className="py-2 pr-3 text-right font-medium">Gặp khách</th>
                      <th className="py-2 pr-3 text-right font-medium">Sale</th>
                      <th className="py-2 pr-3 text-right font-medium">Điểm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cungTuyen.map((e, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="py-2 pr-3 font-medium text-slate-800">{e.ten}</td>
                        <td className="py-2 pr-3 text-right text-slate-700">{formatVnd(e.doanhThu)}</td>
                        <td className="py-2 pr-3 text-right text-slate-600">{e.soTuan}</td>
                        <td className="py-2 pr-3 text-right text-slate-700">{e.gap}</td>
                        <td className="py-2 pr-3 text-right text-slate-700">{e.sale}</td>
                        <td className="py-2 pr-3 text-right font-semibold text-slate-900">{e.diem}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-slate-300 font-semibold">
                      <td className="py-2 pr-3 text-slate-900">TỔNG</td>
                      <td className="py-2 pr-3 text-right text-slate-900">{formatVnd(actualTotal)}</td>
                      <td className="py-2 pr-3"></td>
                      <td className="py-2 pr-3 text-right text-slate-900">{tongCT.gap}</td>
                      <td className="py-2 pr-3 text-right text-slate-900">{tongCT.sale}</td>
                      <td className="py-2 pr-3 text-right text-slate-900">{tongCT.diem}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* B. Doanh số */}
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">B. Doanh số — Kế hoạch vs Thực hiện</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Kế hoạch: file KPI (tab &quot;Doanh so T8&quot;). Thực hiện: tổng doanh thu tháng {month} từ file Sale.
            </p>
            {salesError && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Không đọc được doanh số thực hiện từ file Sale: {salesError}
              </p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard label="Kế hoạch (kê đơn)" value={formatShortVnd(ds.KH)} hint={`${formatVnd(ds.KH)} đ`} accentColor="#2a78d6" />
              <StatCard label="Thực hiện (tổng)" value={formatShortVnd(actualTotal)} hint={`${formatVnd(actualTotal)} đ`} accentColor="#1baf7a" />
              <StatCard label="Tỷ lệ hoàn thành" value={`${Math.round(pct(actualTotal, ds.KH))}%`} accentColor="#eda100" />
            </div>
          </section>

          {/* C. KPIs */}
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">C. Tổng điểm KPIs theo nhân viên</h2>
            {kpis.error ? (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{kpis.error}</p>
            ) : kpiRows.length === 0 ? (
              <p className="mt-3 text-xs text-slate-400">Chưa có dữ liệu KPIs cho nhóm này.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="text-slate-500">
                    <tr className="border-b border-slate-200">
                      <th className="py-2 pr-3 font-medium">Nhân viên</th>
                      <th className="py-2 pr-3 text-right font-medium">Tổng điểm KPIs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpiRows.map((k, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="py-2 pr-3 font-medium text-slate-800">{k.ten}</td>
                        <td className="py-2 pr-3 text-right font-semibold text-slate-900">{k.diem}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
