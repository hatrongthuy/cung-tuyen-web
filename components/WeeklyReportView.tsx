"use client";

import { Fragment, useMemo, useState } from "react";
import StatCard from "@/components/StatCard";
import EmployeeBarChart from "@/components/EmployeeBarChart";
import ScoreTrendChart from "@/components/ScoreTrendChart";
import ReportToolbar from "@/components/ReportToolbar";
import { downloadCsv } from "@/lib/csv";
import { formatVnd, formatShortVnd } from "@/lib/format";
import {
  distinctWeeksDesc,
  parseInt0,
  parseWeekStart,
  normalizeMaNV,
  salesByRange,
  deltaLabel,
  type SaleTxnLite,
} from "@/lib/report-utils";
import type { EmployeeWeekSummary } from "@/lib/aggregate";

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

function rangeOfWeek(label: string): { startMs: number; endMs: number } | null {
  const start = parseWeekStart(label);
  if (!start) return null;
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { startMs: start.getTime(), endMs: end.getTime() };
}

function tongDanhGia(rows: Row[]) {
  return rows.reduce(
    (a, r) => ({
      gap: a.gap + parseInt0(r[C.gap]),
      phanHoi: a.phanHoi + parseInt0(r[C.phanHoi]),
      sale: a.sale + parseInt0(r[C.sale]),
      diem: a.diem + parseInt0(r[C.diem]),
    }),
    { gap: 0, phanHoi: 0, sale: 0, diem: 0 }
  );
}

export default function WeeklyReportView({
  rows,
  teamName,
  salesTxns = [],
  salesError,
  summaries = [],
  currentWeekLabel,
}: {
  rows: Row[];
  teamName: string;
  salesTxns?: SaleTxnLite[];
  salesError?: string | null;
  summaries?: EmployeeWeekSummary[];
  currentWeekLabel?: string | null;
}) {
  const weeks = useMemo(() => distinctWeeksDesc(rows.map((r) => r[C.tuan])), [rows]);
  const [week, setWeek] = useState<string>(weeks[0] ?? "");

  // Tuần liền trước tuần đang chọn (để so sánh).
  const prevWeek = useMemo(() => {
    const idx = weeks.indexOf(week);
    return idx >= 0 && idx + 1 < weeks.length ? weeks[idx + 1] : null;
  }, [weeks, week]);

  const weekRows = useMemo(() => rows.filter((r) => r[C.tuan] === week), [rows, week]);
  const prevRows = useMemo(() => (prevWeek ? rows.filter((r) => r[C.tuan] === prevWeek) : []), [rows, prevWeek]);

  const salesOf = (label: string, kenh: "keDon" | "thau") => {
    const r = rangeOfWeek(label);
    return r ? salesByRange(salesTxns, r.startMs, r.endMs, kenh) : {};
  };
  const keDonByMa = useMemo(() => salesOf(week, "keDon"), [salesTxns, week]);
  const thauByMa = useMemo(() => salesOf(week, "thau"), [salesTxns, week]);

  const perEmp = useMemo(
    () =>
      weekRows
        .map((r) => {
          const ma = normalizeMaNV(r[C.ma]);
          const keDon = keDonByMa[ma] ?? 0;
          const thau = thauByMa[ma] ?? 0;
          return {
            ten: r[C.ten] || r[C.ma] || "(không tên)",
            gap: parseInt0(r[C.gap]),
            phanHoi: parseInt0(r[C.phanHoi]),
            sale: parseInt0(r[C.sale]),
            diem: parseInt0(r[C.diem]),
            keDon,
            thau,
            doanhThu: keDon + thau,
          };
        })
        .sort((a, b) => b.doanhThu - a.doanhThu || b.diem - a.diem),
    [weekRows, keDonByMa, thauByMa]
  );

  const tong = useMemo(
    () =>
      perEmp.reduce(
        (a, e) => ({
          gap: a.gap + e.gap,
          phanHoi: a.phanHoi + e.phanHoi,
          sale: a.sale + e.sale,
          diem: a.diem + e.diem,
          keDon: a.keDon + e.keDon,
          thau: a.thau + e.thau,
          doanhThu: a.doanhThu + e.doanhThu,
        }),
        { gap: 0, phanHoi: 0, sale: 0, diem: 0, keDon: 0, thau: 0, doanhThu: 0 }
      ),
    [perEmp]
  );

  // Tổng của tuần trước để so sánh.
  const prevTong = useMemo(() => {
    const dg = tongDanhGia(prevRows);
    let doanhThu = 0;
    if (prevWeek) {
      const kd = salesOf(prevWeek, "keDon");
      const th = salesOf(prevWeek, "thau");
      for (const v of Object.values(kd)) doanhThu += v;
      for (const v of Object.values(th)) doanhThu += v;
    }
    return { ...dg, doanhThu };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevRows, prevWeek, salesTxns]);

  const trend = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const t = r[C.tuan];
      if (!t) continue;
      map.set(t, (map.get(t) ?? 0) + parseInt0(r[C.diem]));
    }
    return distinctWeeksDesc([...map.keys()]).reverse().map((t) => ({ tuan: t, diem: map.get(t) ?? 0 }));
  }, [rows]);

  // Tình hình gặp khách theo gợi ý — chỉ có cho TUẦN HIỆN TẠI (danh sách gợi ý bị ghi đè mỗi tuần).
  const laTuanHienTai = !!currentWeekLabel && week === currentWeekLabel;
  const tongGoiY = useMemo(() => {
    if (!laTuanHienTai) return null;
    return summaries.reduce(
      (a, s) => ({
        soGoiY: a.soGoiY + s.soGoiY,
        soDaXacNhan: a.soDaXacNhan + s.soDaXacNhan,
        soDongY: a.soDongY + s.soDongY,
      }),
      { soGoiY: 0, soDaXacNhan: 0, soDongY: 0 }
    );
  }, [summaries, laTuanHienTai]);

  const [openTonDong, setOpenTonDong] = useState<string | null>(null);

  // ----- Gemini -----
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState<string>("");
  const [aiError, setAiError] = useState<string>("");

  function buildTomTat() {
    const dNS = (c: number, p: number, pct = true) => (prevWeek ? ` (${deltaLabel(c, p, pct)})` : "");
    const lines: string[] = [];
    lines.push(`Nhóm: ${teamName} | Tuần: ${week}${prevWeek ? ` | Tuần trước: ${prevWeek}` : ""}`);
    lines.push(
      `TỔNG NHÓM: Doanh số ${formatVnd(tong.doanhThu)}đ (kê đơn ${formatVnd(tong.keDon)}, thầu ${formatVnd(tong.thau)})${dNS(tong.doanhThu, prevTong.doanhThu)}; ` +
        `Gặp khách ${tong.gap}${dNS(tong.gap, prevTong.gap, false)}; Phản hồi ${tong.phanHoi}${dNS(tong.phanHoi, prevTong.phanHoi, false)}; ` +
        `Phát sinh sale ${tong.sale}${dNS(tong.sale, prevTong.sale, false)}; Điểm ${tong.diem}${dNS(tong.diem, prevTong.diem)}.`
    );
    lines.push("THEO NHÂN VIÊN:");
    for (const e of perEmp) {
      lines.push(
        `- ${e.ten}: DS ${formatVnd(e.doanhThu)}đ (KĐ ${formatVnd(e.keDon)}, thầu ${formatVnd(e.thau)}), gặp ${e.gap}, phản hồi ${e.phanHoi}, sale ${e.sale}, điểm ${e.diem}.`
      );
    }
    if (laTuanHienTai && summaries.length) {
      lines.push("TÌNH HÌNH GẶP THEO GỢI Ý (tuần hiện tại):");
      for (const s of summaries) {
        const chuaGap = s.soGoiY - s.soDaXacNhan;
        lines.push(`- ${s.hoTen}: đã đồng ý/gặp ${s.soDongY}/${s.soGoiY}, đã phản hồi ${s.soDaXacNhan}/${s.soGoiY}, còn tồn đọng (chưa phản hồi) ${chuaGap}.`);
      }
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
        body: JSON.stringify({ tomTat: buildTomTat() }),
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
    const header = ["Nhân viên", "DS kê đơn", "DS thầu", "Số lượt gặp khách", "Phản hồi hàng hóa", "Phát sinh sale", "Tổng điểm cung tuyến"];
    const body = perEmp.map((e) => [e.ten, Math.round(e.keDon), Math.round(e.thau), e.gap, e.phanHoi, e.sale, e.diem]);
    const footer = ["TỔNG", Math.round(tong.keDon), Math.round(tong.thau), tong.gap, tong.phanHoi, tong.sale, tong.diem];
    downloadCsv(`bao-cao-tuan_${teamName}_${week.replace(/[^\d]/g, "-")}`, [
      [`Báo cáo tuần — Nhóm ${teamName}`],
      [`Tuần: ${week}${prevWeek ? ` (so với ${prevWeek})` : ""}`],
      [],
      header,
      ...body,
      footer,
    ]);
  }

  const cardHint = (cur: number, prev: number, pct = true) => (prevWeek ? deltaLabel(cur, prev, pct) : undefined);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Báo cáo tuần — Nhóm {teamName}</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Hoạt động cung tuyến + doanh số theo tuần, có so sánh với tuần trước và phân tích AI.
          </p>
        </div>
        <ReportToolbar onExportCsv={exportCsv} className="no-print" />
      </div>

      {weeks.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-700">Chưa có dữ liệu đánh giá cung tuyến</p>
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
            {prevWeek && <span className="text-xs text-slate-400">So sánh với tuần trước: {prevWeek}</span>}
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
                <h2 className="text-sm font-semibold text-violet-900">Phân tích của Gemini — tuần {week}</h2>
                <button onClick={() => { setAiText(""); setAiError(""); }} className="no-print text-xs text-slate-400 hover:text-slate-600">Đóng</button>
              </div>
              {aiError ? (
                <p className="mt-2 text-xs text-red-700">{aiError}</p>
              ) : (
                <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{aiText}</div>
              )}
            </section>
          )}

          <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Doanh số tuần" value={formatShortVnd(tong.doanhThu)} hint={cardHint(tong.doanhThu, prevTong.doanhThu)} accentColor="#1baf7a" />
            <StatCard label="Lượt gặp khách" value={tong.gap} hint={cardHint(tong.gap, prevTong.gap, false)} accentColor="#2a78d6" />
            <StatCard label="Phản hồi hàng hóa" value={tong.phanHoi} hint={cardHint(tong.phanHoi, prevTong.phanHoi, false)} accentColor="#4a3aa7" />
            <StatCard label="Phát sinh sale" value={tong.sale} hint={cardHint(tong.sale, prevTong.sale, false)} accentColor="#eda100" />
            <StatCard label="Tổng điểm cung tuyến" value={tong.diem} hint={cardHint(tong.diem, prevTong.diem)} accentColor="#eb6834" />
          </section>

          {salesError && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Không đọc được doanh số từ file Sale: {salesError}
            </p>
          )}

          {/* Tình hình gặp khách theo gợi ý (chỉ tuần hiện tại) */}
          {laTuanHienTai && tongGoiY && (
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Tình hình gặp khách theo gợi ý (tuần hiện tại)</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Tỷ lệ đã gặp = số khách được gợi ý đã xác nhận &quot;đã gặp&quot;. Tồn đọng = khách gợi ý chưa phản hồi.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Tổng khách gợi ý" value={tongGoiY.soGoiY} accentColor="#2a78d6" />
                <StatCard label="Đã gặp (đồng ý)" value={tongGoiY.soDongY} hint={`${tongGoiY.soGoiY ? Math.round((tongGoiY.soDongY / tongGoiY.soGoiY) * 100) : 0}%`} accentColor="#1baf7a" />
                <StatCard label="Đã phản hồi" value={tongGoiY.soDaXacNhan} hint={`${tongGoiY.soGoiY ? Math.round((tongGoiY.soDaXacNhan / tongGoiY.soGoiY) * 100) : 0}%`} accentColor="#eda100" />
                <StatCard label="Tồn đọng (chưa phản hồi)" value={tongGoiY.soGoiY - tongGoiY.soDaXacNhan} accentColor="#e34948" />
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="text-slate-500">
                    <tr className="border-b border-slate-200">
                      <th className="py-2 pr-3 font-medium">Nhân viên</th>
                      <th className="py-2 pr-3 text-right font-medium">Gợi ý</th>
                      <th className="py-2 pr-3 text-right font-medium">Đã gặp</th>
                      <th className="py-2 pr-3 text-right font-medium">Tỷ lệ gặp</th>
                      <th className="py-2 pr-3 text-right font-medium">Chưa xử lý</th>
                      <th className="py-2 pr-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaries.map((s) => {
                      const chuaXuLy = s.khachGoiY.filter((k) => !k.trangThai);
                      const open = openTonDong === s.maNhanVien;
                      return (
                        <Fragment key={s.maNhanVien}>
                          <tr className="border-b border-slate-100">
                            <td className="py-2 pr-3 font-medium text-slate-800">{s.hoTen}</td>
                            <td className="py-2 pr-3 text-right text-slate-700">{s.soGoiY}</td>
                            <td className="py-2 pr-3 text-right text-slate-700">{s.soDongY}</td>
                            <td className="py-2 pr-3 text-right font-semibold text-slate-900">
                              {s.soGoiY ? Math.round((s.soDongY / s.soGoiY) * 100) : 0}%
                            </td>
                            <td className="py-2 pr-3 text-right text-slate-700">{chuaXuLy.length}</td>
                            <td className="py-2 pr-3 text-right">
                              {chuaXuLy.length > 0 && (
                                <button onClick={() => setOpenTonDong(open ? null : s.maNhanVien)} className="no-print text-xs text-blue-600 hover:underline">
                                  {open ? "Ẩn" : "Xem tồn đọng"}
                                </button>
                              )}
                            </td>
                          </tr>
                          {open && (
                            <tr className="border-b border-slate-100">
                              <td colSpan={6} className="bg-slate-50/70 px-3 py-2">
                                <p className="mb-1 text-xs font-medium text-slate-600">Khách chưa gặp/chưa phản hồi ({chuaXuLy.length}):</p>
                                <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                                  {chuaXuLy.map((k) => (
                                    <li key={k.maKH} className="text-xs text-slate-600">• #{k.thuTuUuTien} {k.tenKH} <span className="text-slate-400">({k.tinh})</span></li>
                                  ))}
                                </ul>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Điểm cung tuyến theo nhân viên</h2>
              <EmployeeBarChart data={perEmp.map((e) => ({ hoTen: e.ten, giaTri: e.diem }))} valueLabel="Điểm cung tuyến" />
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
                    <th className="py-2 pr-3 text-right font-medium">DS kê đơn</th>
                    <th className="py-2 pr-3 text-right font-medium">DS thầu</th>
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
                      <td className="py-2 pr-3 text-right text-slate-700">{formatVnd(e.keDon)}</td>
                      <td className="py-2 pr-3 text-right text-slate-700">{formatVnd(e.thau)}</td>
                      <td className="py-2 pr-3 text-right text-slate-700">{e.gap}</td>
                      <td className="py-2 pr-3 text-right text-slate-700">{e.phanHoi}</td>
                      <td className="py-2 pr-3 text-right text-slate-700">{e.sale}</td>
                      <td className="py-2 pr-3 text-right font-semibold text-slate-900">{e.diem}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-300 font-semibold">
                    <td className="py-2 pr-3 text-slate-900">TỔNG</td>
                    <td className="py-2 pr-3 text-right text-slate-900">{formatVnd(tong.keDon)}</td>
                    <td className="py-2 pr-3 text-right text-slate-900">{formatVnd(tong.thau)}</td>
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
