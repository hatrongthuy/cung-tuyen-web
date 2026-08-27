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
  deltaLabel,
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

  // ----- Gemini -----
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState<string>("");
  const [aiError, setAiError] = useState<string>("");

  // "MM/YYYY" -> số tháng/năm để cộng doanh số thực hiện.
  const [thangSel, namSel] = useMemo(() => {
    const [mm, yy] = (month || "").split("/").map(Number);
    return [mm || 0, yy || 0];
  }, [month]);
  const actualKeDonByMa = useMemo(() => salesByMonth(salesTxns, namSel, thangSel, "keDon"), [salesTxns, namSel, thangSel]);
  const actualThauByMa = useMemo(() => salesByMonth(salesTxns, namSel, thangSel, "thau"), [salesTxns, namSel, thangSel]);
  const actualByMa = useMemo(() => {
    const o: Record<string, number> = { ...actualKeDonByMa };
    for (const k in actualThauByMa) o[k] = (o[k] ?? 0) + actualThauByMa[k];
    return o;
  }, [actualKeDonByMa, actualThauByMa]);
  const actualKeDon = useMemo(() => sumValues(actualKeDonByMa), [actualKeDonByMa]);
  const actualThau = useMemo(() => sumValues(actualThauByMa), [actualThauByMa]);
  const actualTotal = actualKeDon + actualThau;

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

  // ----- Tháng liền trước (để so sánh) -----
  const prevMonth = useMemo(() => {
    const idx = months.indexOf(month);
    return idx >= 0 && idx + 1 < months.length ? months[idx + 1] : null;
  }, [months, month]);

  const prev = useMemo(() => {
    if (!prevMonth) return null;
    const [pm, py] = prevMonth.split("/").map(Number);
    const inMonth = danhGia.filter((r) => monthKeyOfWeek(r[C.tuan]) === prevMonth);
    const ct = inMonth.reduce(
      (a, r) => ({
        gap: a.gap + parseInt0(r[C.gap]),
        phanHoi: a.phanHoi + parseInt0(r[C.phanHoi]),
        sale: a.sale + parseInt0(r[C.sale]),
        diem: a.diem + parseInt0(r[C.diem]),
      }),
      { gap: 0, phanHoi: 0, sale: 0, diem: 0 }
    );
    const ds = sumValues(salesByMonth(salesTxns, py || 0, pm || 0));
    return { ...ct, doanhThu: ds };
  }, [prevMonth, danhGia, salesTxns]);

  const mHint = (cur: number, prevVal: number | undefined, isPct = true) =>
    prev ? deltaLabel(cur, prevVal ?? 0, isPct) : undefined;

  // ----- Doanh số tháng (ảnh chụp tháng hiện tại trong file KPI) -----
  const ds = useMemo(() => {
    const cols = doanhSo.columns;
    const viTri = findColumn(cols, ["vị trí"]) ?? cols[0] ?? "";
    const kdKHcol = findColumn(cols, ["kê đơn", "kế hoạch"]);
    const thauKHcol = findColumn(cols, ["thầu", "kế hoạch"]) ?? findColumn(cols, ["thầu", "hoạch"]);
    const nvkd = viTri ? doanhSo.rows.filter((r) => (r[viTri] ?? "").trim().toUpperCase() === "NVKD") : doanhSo.rows;
    const rows = nvkd.length ? nvkd : doanhSo.rows;
    const keDonKH = rows.reduce((s, r) => s + (kdKHcol ? parseMoney(r[kdKHcol]) : 0), 0);
    const thauKH = rows.reduce((s, r) => s + (thauKHcol ? parseMoney(r[thauKHcol]) : 0), 0);
    return { keDonKH, thauKH };
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

  // ----- Tóm tắt số liệu tháng để gửi Gemini -----
  function buildTomTat() {
    const dm = (c: number, p: number | undefined, isPct = true) =>
      prev ? ` (${deltaLabel(c, p ?? 0, isPct)})` : "";
    const lines: string[] = [];
    lines.push(`Nhóm: ${teamName} | Tháng: ${month}${prevMonth ? ` | Tháng trước: ${prevMonth}` : ""}`);
    lines.push(
      `TỔNG NHÓM: Doanh số ${formatVnd(actualTotal)}đ (kê đơn ${formatVnd(actualKeDon)}, thầu ${formatVnd(actualThau)})${dm(actualTotal, prev?.doanhThu)}; ` +
        `Gặp khách ${tongCT.gap}${dm(tongCT.gap, prev?.gap, false)}; Phản hồi ${tongCT.phanHoi}${dm(tongCT.phanHoi, prev?.phanHoi, false)}; ` +
        `Phát sinh sale ${tongCT.sale}${dm(tongCT.sale, prev?.sale, false)}; Điểm cung tuyến ${tongCT.diem}${dm(tongCT.diem, prev?.diem)}.`
    );
    lines.push(
      `KẾ HOẠCH vs THỰC HIỆN: Kê đơn ${formatVnd(actualKeDon)}/${formatVnd(ds.keDonKH)} (đạt ${Math.round(pct(actualKeDon, ds.keDonKH))}%); ` +
        `Thầu ${formatVnd(actualThau)}/${formatVnd(ds.thauKH)} (đạt ${Math.round(pct(actualThau, ds.thauKH))}%).`
    );
    lines.push("THEO NHÂN VIÊN:");
    for (const e of cungTuyen) {
      lines.push(
        `- ${e.ten}: DS ${formatVnd(e.doanhThu)}đ, gặp ${e.gap}, phản hồi ${e.phanHoi}, sale ${e.sale}, điểm ${e.diem} (${e.soTuan} tuần).`
      );
    }
    if (kpiRows.length) {
      lines.push("TỔNG ĐIỂM KPIs THEO NHÂN VIÊN:");
      for (const k of kpiRows) lines.push(`- ${k.ten}: ${k.diem} điểm.`);
    }
    return lines.join("\n");
  }

  async function phanTichAI() {
    setAiLoading(true);
    setAiError("");
    setAiText("");
    try {
      const res = await fetch("/api/phan-tich-tuan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tomTat: buildTomTat(), ky: "tháng" }),
      });
      const data = await res.json();
      if (!res.ok) setAiError(data?.error || "Lỗi phân tích.");
      else setAiText(data?.text || "");
    } catch (e) {
      setAiError(e instanceof Error ? e.message : String(e));
    } finally {
      setAiLoading(false);
    }
  }

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
      ["", "Kế hoạch", "Thực hiện", "Tỷ lệ (%)"],
      ["Kê đơn", Math.round(ds.keDonKH), Math.round(actualKeDon), Math.round(pct(actualKeDon, ds.keDonKH))],
      ["Thầu", Math.round(ds.thauKH), Math.round(actualThau), Math.round(pct(actualThau, ds.thauKH))],
      ["Tổng", Math.round(ds.keDonKH + ds.thauKH), Math.round(actualTotal), Math.round(pct(actualTotal, ds.keDonKH + ds.thauKH))],
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
            {prevMonth && <span className="text-xs text-slate-400">So sánh với tháng trước: {prevMonth}</span>}
            <button
              onClick={phanTichAI}
              disabled={aiLoading}
              className="no-print ml-auto inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M11 2 8.5 8.5 2 11l6.5 2.5L11 20l2.5-6.5L20 11l-6.5-2.5L11 2Z" />
              </svg>
              {aiLoading ? "Đang phân tích..." : "Phân tích AI (Gemini)"}
            </button>
          </div>

          {(aiText || aiError) && (
            <section className="mt-4 rounded-2xl border border-violet-200 bg-violet-50/50 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-violet-900">Phân tích của Gemini — tháng {month}</h2>
                <button onClick={() => { setAiText(""); setAiError(""); }} className="no-print text-xs text-slate-400 hover:text-slate-600">Đóng</button>
              </div>
              {aiError ? (
                <p className="mt-2 text-xs text-red-700">{aiError}</p>
              ) : (
                <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{aiText}</div>
              )}
            </section>
          )}

          {/* A. Cung tuyến tháng */}
          <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Doanh số tháng" value={formatShortVnd(actualTotal)} hint={mHint(actualTotal, prev?.doanhThu) ?? `KĐ ${formatShortVnd(actualKeDon)} • Thầu ${formatShortVnd(actualThau)}`} accentColor="#1baf7a" />
            <StatCard label="Lượt gặp khách" value={tongCT.gap} hint={mHint(tongCT.gap, prev?.gap, false)} accentColor="#2a78d6" />
            <StatCard label="Phản hồi hàng hóa" value={tongCT.phanHoi} hint={mHint(tongCT.phanHoi, prev?.phanHoi, false)} accentColor="#4a3aa7" />
            <StatCard label="Phát sinh sale" value={tongCT.sale} hint={mHint(tongCT.sale, prev?.sale, false)} accentColor="#eda100" />
            <StatCard label="Tổng điểm cung tuyến" value={tongCT.diem} hint={mHint(tongCT.diem, prev?.diem)} accentColor="#eb6834" />
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
              Kế hoạch: file KPI (tab &quot;Doanh so T8&quot;). Thực hiện: doanh thu tháng {month} từ file Sale, tách kê đơn / thầu.
            </p>
            {salesError && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Không đọc được doanh số thực hiện từ file Sale: {salesError}
              </p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Kê đơn — Kế hoạch" value={formatShortVnd(ds.keDonKH)} hint={`${formatVnd(ds.keDonKH)} đ`} accentColor="#2a78d6" />
              <StatCard label="Kê đơn — Thực hiện" value={formatShortVnd(actualKeDon)} hint={`Đạt ${Math.round(pct(actualKeDon, ds.keDonKH))}%`} accentColor="#1baf7a" />
              <StatCard label="Thầu — Kế hoạch" value={formatShortVnd(ds.thauKH)} hint={`${formatVnd(ds.thauKH)} đ`} accentColor="#eda100" />
              <StatCard label="Thầu — Thực hiện" value={formatShortVnd(actualThau)} hint={`Đạt ${Math.round(pct(actualThau, ds.thauKH))}%`} accentColor="#eb6834" />
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
