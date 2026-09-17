"use client";

import { useMemo, useRef, useState } from "react";
import { allEmployees } from "@/lib/allowlist";
import { formatVnd, formatShortVnd, pct, parseMoney } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";
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

type Row = Record<string, string>;
interface TabData {
  columns: string[];
  rows: Row[];
  error?: string | null;
}

const C = { kd: "#2a78d6", thau: "#eda100", cov: "#1baf7a", red: "#e34948", violet: "#6d5ae6" };

const COL = {
  tuan: "Tuần",
  ma: "Mã nhân viên",
  ten: "Tên nhân viên",
  gap: "Số lượt gặp khách",
  phanHoi: "Số lượt phản hồi thông tin hàng hóa",
  sale: "Số lượt phát sinh sale",
  diem: "Tổng điểm cung tuyến",
};

function pctStr(v: number) {
  return `${v.toFixed(v % 1 === 0 ? 0 : 1)}%`;
}
function tenGoi(hoTen: string): string {
  const parts = hoTen.trim().split(/\s+/);
  return parts[parts.length - 1] || hoTen;
}

interface EmpMonth {
  ma: string;
  ten: string;
  ho: string;
  diaBan: string;
  kdTH: number;
  kdKH: number;
  kdPct: number;
  kdPctTruoc: number;
  thauTH: number;
  thauKH: number;
  thauPct: number;
  gap: number;
  phanHoi: number;
  sale: number;
  diem: number;
  diemTruoc: number;
  soTuan: number;
  doanhThu: number;
  doanhThuTruoc: number;
}

export default function BaoCaoThangReport({
  danhGia,
  doanhSo,
  kpis,
  teamName,
  salesTxns = [],
  salesError,
  kpiError,
  todayMonthKey,
  pctThoiGianThangHienTai = 100,
}: {
  danhGia: Row[];
  doanhSo: TabData;
  kpis: TabData;
  teamName: string;
  salesTxns?: SaleTxnLite[];
  salesError?: string | null;
  kpiError?: string | null;
  todayMonthKey?: string | null;
  /** % thời gian đã trôi qua của THÁNG HIỆN TẠI (ngày/số ngày*100). Dùng làm mốc khi xem tháng hiện tại. */
  pctThoiGianThangHienTai?: number;
}) {
  // Danh sách tháng (mới → cũ). Thêm tháng hiện tại nếu chưa có đánh giá để luôn xem được số tới hôm nay.
  const months = useMemo(() => {
    const list = distinctMonthsDesc(danhGia.map((r) => r[COL.tuan]));
    if (todayMonthKey && !list.includes(todayMonthKey)) return [todayMonthKey, ...list];
    return list;
  }, [danhGia, todayMonthKey]);
  const [month, setMonth] = useState<string>(todayMonthKey ?? months[0] ?? "");

  const laThangHienTai = month === todayMonthKey;
  const pctThoiGian = laThangHienTai ? pctThoiGianThangHienTai : 100;

  const prevMonth = useMemo(() => {
    const idx = months.indexOf(month);
    return idx >= 0 && idx + 1 < months.length ? months[idx + 1] : null;
  }, [months, month]);

  const [thang, nam] = useMemo(() => {
    const [mm, yy] = (month || "").split("/").map(Number);
    return [mm || 0, yy || 0];
  }, [month]);
  const [thangT, namT] = useMemo(() => {
    const [mm, yy] = (prevMonth || "").split("/").map(Number);
    return [mm || 0, yy || 0];
  }, [prevMonth]);

  // Kế hoạch (KH) theo NV lấy từ tab "Doanh so T9" (giống báo cáo tuần).
  const planByMa = useMemo(() => {
    const cols = doanhSo.columns;
    const cMa = findColumn(cols, ["mã nv"]) ?? findColumn(cols, ["mã", "nv"]) ?? findColumn(cols, ["mã nhân"]);
    const cKd = findColumn(cols, ["kê đơn", "kế hoạch"]) ?? findColumn(cols, ["kê đơn", "hoạch"]);
    const cThau = findColumn(cols, ["thầu", "kế hoạch"]) ?? findColumn(cols, ["thầu", "hoạch"]);
    const cDia = findColumn(cols, ["địa bàn"]) ?? findColumn(cols, ["vị trí"]);
    const m = new Map<string, { kd: number; thau: number; dia: string }>();
    for (const r of doanhSo.rows) {
      const ma = cMa ? normalizeMaNV(r[cMa]) : "";
      if (!ma) continue;
      m.set(ma, {
        kd: cKd ? parseMoney(r[cKd]) : 0,
        thau: cThau ? parseMoney(r[cThau]) : 0,
        dia: cDia ? String(r[cDia] ?? "").trim() : "",
      });
    }
    return m;
  }, [doanhSo]);

  // Cung tuyến theo NV cho 1 tháng cụ thể (gộp các tuần thuộc tháng).
  const ctByMonth = useMemo(() => {
    const build = (mKey: string) => {
      const agg = new Map<string, { gap: number; phanHoi: number; sale: number; diem: number; soTuan: number }>();
      for (const r of danhGia) {
        if (monthKeyOfWeek(r[COL.tuan]) !== mKey) continue;
        const ma = normalizeMaNV(r[COL.ma]);
        if (!ma) continue;
        const cur = agg.get(ma) ?? { gap: 0, phanHoi: 0, sale: 0, diem: 0, soTuan: 0 };
        cur.gap += parseInt0(r[COL.gap]);
        cur.phanHoi += parseInt0(r[COL.phanHoi]);
        cur.sale += parseInt0(r[COL.sale]);
        cur.diem += parseInt0(r[COL.diem]);
        cur.soTuan += 1;
        agg.set(ma, cur);
      }
      return agg;
    };
    return { now: build(month), prev: prevMonth ? build(prevMonth) : new Map() };
  }, [danhGia, month, prevMonth]);

  const kdNow = useMemo(() => salesByMonth(salesTxns, nam, thang, "keDon"), [salesTxns, nam, thang]);
  const thauNow = useMemo(() => salesByMonth(salesTxns, nam, thang, "thau"), [salesTxns, nam, thang]);
  const kdPrev = useMemo(() => salesByMonth(salesTxns, namT, thangT, "keDon"), [salesTxns, namT, thangT]);
  const dsPrevByMa = useMemo(() => salesByMonth(salesTxns, namT, thangT), [salesTxns, namT, thangT]);

  const emps = useMemo<EmpMonth[]>(() => {
    return allEmployees().map((e) => {
      const ma = normalizeMaNV(e.maNhanVien);
      const plan = planByMa.get(ma) ?? { kd: 0, thau: 0, dia: "" };
      const kdTH = kdNow[ma] ?? 0;
      const thauTH = thauNow[ma] ?? 0;
      const c = ctByMonth.now.get(ma) ?? { gap: 0, phanHoi: 0, sale: 0, diem: 0, soTuan: 0 };
      const cp = ctByMonth.prev.get(ma) ?? { gap: 0, phanHoi: 0, sale: 0, diem: 0, soTuan: 0 };
      return {
        ma,
        ten: e.hoTen,
        ho: tenGoi(e.hoTen),
        diaBan: plan.dia,
        kdTH,
        kdKH: plan.kd,
        kdPct: pct(kdTH, plan.kd),
        kdPctTruoc: pct(kdPrev[ma] ?? 0, plan.kd),
        thauTH,
        thauKH: plan.thau,
        thauPct: pct(thauTH, plan.thau),
        gap: c.gap,
        phanHoi: c.phanHoi,
        sale: c.sale,
        diem: c.diem,
        diemTruoc: cp.diem,
        soTuan: c.soTuan,
        doanhThu: kdTH + thauTH,
        doanhThuTruoc: dsPrevByMa[ma] ?? 0,
      };
    }).sort((a, b) => b.doanhThu - a.doanhThu || b.diem - a.diem);
  }, [planByMa, kdNow, thauNow, kdPrev, dsPrevByMa, ctByMonth]);

  const g = useMemo(() => {
    const sum = (f: (e: EmpMonth) => number) => emps.reduce((a, e) => a + f(e), 0);
    const kdTH = sum((e) => e.kdTH), kdKH = sum((e) => e.kdKH);
    const thauTH = sum((e) => e.thauTH), thauKH = sum((e) => e.thauKH);
    const kdPrevTotal = sumValues(kdPrev);
    return {
      kdTH, kdKH, kdPct: pct(kdTH, kdKH), kdPctTruoc: pct(kdPrevTotal, kdKH),
      thauTH, thauKH, thauPct: pct(thauTH, thauKH),
      gap: sum((e) => e.gap), phanHoi: sum((e) => e.phanHoi), sale: sum((e) => e.sale),
      diem: sum((e) => e.diem), diemTruoc: sum((e) => e.diemTruoc),
      doanhThu: kdTH + thauTH, doanhThuTruoc: sumValues(dsPrevByMa),
    };
  }, [emps, kdPrev, dsPrevByMa]);

  const hasEval = useMemo(() => emps.some((e) => e.soTuan > 0), [emps]);

  const noiBat = useMemo(() => [...emps].filter((e) => e.kdKH > 0).sort((a, b) => b.kdPct - a.kdPct).slice(0, 2), [emps]);
  const canCaiThien = useMemo(() => [...emps].filter((e) => e.kdKH > 0).sort((a, b) => a.kdPct - b.kdPct).slice(0, 2), [emps]);

  const kdRows = useMemo(() => [...emps].filter((e) => e.kdKH > 0).sort((a, b) => b.kdPct - a.kdPct), [emps]);
  const thauRows = useMemo(() => [...emps].filter((e) => e.thauKH > 0).sort((a, b) => b.thauPct - a.thauPct), [emps]);

  // Đối chiếu tháng trước (theo NV): KĐ% và điểm cung tuyến.
  const doiChieu = useMemo(() => {
    const nv = emps
      .filter((e) => e.kdKH > 0)
      .map((e) => {
        const delta = e.kdPct - e.kdPctTruoc;
        const dat = e.kdPct >= pctThoiGian - 10;
        const trang: "tang" | "giam" | "phang" = delta > 0.5 ? "tang" : delta < -0.5 ? "giam" : "phang";
        return { ma: e.ma, ten: e.ten, truoc: e.kdPctTruoc, nay: e.kdPct, delta, dat, trang };
      })
      .sort((a, b) => a.nay - b.nay);
    const nhac = nv.filter((x) => !x.dat);
    return { nv, nhac };
  }, [emps, pctThoiGian]);

  // Đề xuất hành động (suy từ dữ liệu).
  const deXuat = useMemo(() => {
    const out: { tag: "KHẨN" | "QUAN TRỌNG"; title: string; body: string }[] = [];
    const yeu = [...emps].filter((e) => e.kdKH > 0).sort((a, b) => a.kdPct - b.kdPct)[0];
    if (yeu && yeu.kdPct < pctThoiGian - 10) {
      out.push({ tag: "KHẨN", title: `Làm việc riêng với ${yeu.ten}`, body: `KĐ mới chỉ ${pctStr(yeu.kdPct)} so với mốc ${pctThoiGian.toFixed(0)}% — cần lộ trình chốt đơn gấp.` });
    }
    if (g.thauKH > 0 && g.thauPct < 1) {
      out.push({ tag: "QUAN TRỌNG", title: `Đẩy mạnh mảng Thầu`, body: `Chỉ tiêu thầu ${formatShortVnd(g.thauKH)} chưa phát sinh doanh số — rà soát tiến độ các gói thầu.` });
    }
    if (g.diemTruoc > 0 && g.diem < g.diemTruoc) {
      out.push({ tag: "QUAN TRỌNG", title: `Chấn chỉnh hoạt động cung tuyến`, body: `Tổng điểm cung tuyến giảm so với tháng trước (${g.diem} < ${g.diemTruoc}) — siết lại lịch gặp khách.` });
    }
    const noSale = emps.filter((e) => e.kdKH > 0 && e.doanhThu === 0);
    if (noSale.length) {
      out.push({ tag: "KHẨN", title: `Kích hoạt NV chưa có doanh số`, body: `${noSale.map((e) => e.ho).join(", ")} chưa phát sinh doanh số trong tháng.` });
    }
    return out;
  }, [emps, g, pctThoiGian]);

  // Tổng điểm KPIs theo NV (tab "kpis").
  const kpiDiem = useMemo(() => {
    const cols = kpis.columns;
    const ten = findColumn(cols, ["tên nhân"]) ?? "";
    const diemTH = findColumn(cols, ["tổng điểm kpis th"]) ?? findColumn(cols, ["tổng điểm kpis"]);
    return kpis.rows.map((r) => ({ ten: ten ? r[ten] : "", diem: diemTH ? parseInt0(r[diemTH]) : 0 })).filter((r) => r.ten);
  }, [kpis]);

  // ---- Gemini AI ----
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiError, setAiError] = useState("");
  function buildTomTat() {
    const lines: string[] = [];
    lines.push(`Nhóm: ${teamName} | Tháng: ${month}${prevMonth ? ` | Tháng trước: ${prevMonth}` : ""}`);
    lines.push(`TỔNG NHÓM: Doanh số ${formatVnd(g.doanhThu)}đ (KĐ ${formatVnd(g.kdTH)} đạt ${Math.round(g.kdPct)}%, Thầu ${formatVnd(g.thauTH)} đạt ${Math.round(g.thauPct)}%); Điểm cung tuyến ${g.diem}; Gặp khách ${g.gap}; Phát sinh sale ${g.sale}.`);
    if (prevMonth) lines.push(`THÁNG TRƯỚC: Doanh số ${formatVnd(g.doanhThuTruoc)}đ; Điểm cung tuyến ${g.diemTruoc}.`);
    lines.push("THEO NHÂN VIÊN:");
    for (const e of emps) lines.push(`- ${e.ten}: DS ${formatVnd(e.doanhThu)}đ (KĐ ${Math.round(e.kdPct)}%), điểm ${e.diem}, gặp ${e.gap}, sale ${e.sale}.`);
    return lines.join("\n");
  }
  async function phanTichAI() {
    setAiLoading(true); setAiError(""); setAiText("");
    try {
      const res = await fetch("/api/phan-tich-tuan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tomTat: buildTomTat(), ky: "tháng" }) });
      const data = await res.json();
      if (!res.ok) setAiError(data?.error || "Lỗi phân tích."); else setAiText(data?.text || "");
    } catch (e) { setAiError(e instanceof Error ? e.message : String(e)); } finally { setAiLoading(false); }
  }

  // ---- CSV ----
  function exportCsv() {
    const rows: (string | number)[][] = [
      [`Báo cáo tháng — Nhóm ${teamName}`], [`Tháng: ${month}`], [],
      ["Nhân viên", "Doanh số", "KĐ %", "Thầu %", "Số tuần", "Gặp khách", "Sale", "Điểm cung tuyến"],
      ...emps.map((e) => [e.ten, Math.round(e.doanhThu), Math.round(e.kdPct), Math.round(e.thauPct), e.soTuan, e.gap, e.sale, e.diem]),
      ["TỔNG", Math.round(g.doanhThu), Math.round(g.kdPct), Math.round(g.thauPct), "", g.gap, g.sale, g.diem],
    ];
    if (kpiDiem.length) { rows.push([], ["TỔNG ĐIỂM KPIs THEO NV"], ["Nhân viên", "Điểm"]); kpiDiem.forEach((k) => rows.push([k.ten, k.diem])); }
    downloadCsv(`bao-cao-thang_${teamName}_${month.replace("/", "-")}`, rows);
  }

  // ---- Tải ảnh PNG / In ----
  const reportRef = useRef<HTMLDivElement>(null);
  const [dangTaiAnh, setDangTaiAnh] = useState(false);
  async function taiAnh() {
    const node = reportRef.current;
    if (!node) return;
    setDangTaiAnh(true);
    try {
      const w = window as unknown as { htmlToImage?: { toPng: (n: HTMLElement, o?: Record<string, unknown>) => Promise<string> } };
      if (!w.htmlToImage) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://cdn.jsdelivr.net/npm/html-to-image@1.11.13/dist/html-to-image.js";
          s.onload = () => resolve();
          s.onerror = () => reject(new Error("Không tải được thư viện tạo ảnh."));
          document.head.appendChild(s);
        });
      }
      const dataUrl = await w.htmlToImage!.toPng(node, { pixelRatio: 2, backgroundColor: "#eef1f6", cacheBust: true });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `bao-cao-thang_${month.replace("/", "-")}.png`;
      a.click();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Không tạo được ảnh. Bạn có thể dùng nút In / Lưu PDF.");
    } finally { setDangTaiAnh(false); }
  }

  const dm = (cur: number, prev: number) => {
    if (!prevMonth) return null;
    const d = cur - prev;
    if (d === 0) return "→ ngang tháng trước";
    return `${d > 0 ? "▲" : "▼"} ${d > 0 ? "+" : ""}${formatShortVnd(d)} so tháng trước`;
  };
  const dmNum = (cur: number, prev: number) => {
    if (!prevMonth) return null;
    const d = cur - prev;
    if (d === 0) return "→ ngang tháng trước";
    return `${d > 0 ? "▲" : "▼"} ${d > 0 ? "+" : ""}${d} so tháng trước`;
  };

  if (months.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-700">Chưa có dữ liệu để lập báo cáo tháng</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Thanh công cụ + chọn tháng (ngoài vùng chụp ảnh) */}
      <div className="no-print flex flex-wrap items-center gap-2">
        <label className="text-xs font-medium text-slate-600">Chọn tháng:</label>
        <select value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
          {months.map((m) => <option key={m} value={m}>Tháng {m}</option>)}
        </select>
        {laThangHienTai && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700">Tháng hiện tại</span>}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button onClick={phanTichAI} disabled={aiLoading} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50">
            ✨ {aiLoading ? "Đang phân tích…" : "Phân tích AI"}
          </button>
          <button onClick={exportCsv} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">⬇ CSV</button>
          <button onClick={taiAnh} disabled={dangTaiAnh} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            {dangTaiAnh ? "Đang tạo ảnh…" : "📷 Tải ảnh (PNG)"}
          </button>
          <button onClick={() => window.print()} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">🖨️ In / PDF</button>
        </div>
      </div>

      {(aiText || aiError) && (
        <section className="no-print rounded-2xl border border-violet-200 bg-violet-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-violet-900">Phân tích của Gemini — tháng {month}</h2>
            <button onClick={() => { setAiText(""); setAiError(""); }} className="text-xs text-slate-400 hover:text-slate-600">Đóng</button>
          </div>
          {aiError ? <p className="mt-2 text-xs text-red-700">{aiError}</p> : <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{aiText}</div>}
        </section>
      )}

      {!hasEval && (
        <p className="no-print rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Tháng này chưa có dữ liệu chấm điểm cung tuyến (hệ thống chấm hằng tuần vào <b>20h thứ 7</b>). Doanh số bên dưới là số liệu <b>cập nhật tới hôm nay</b>.
        </p>
      )}

      {/* ===== Vùng báo cáo (chụp PNG) ===== */}
      <div ref={reportRef} className="space-y-5 rounded-2xl bg-[#eef1f6] p-4 sm:p-6">
        {/* Tiêu đề */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Báo Cáo Tháng — Đội Kinh Doanh</h1>
            <p className="mt-1 text-sm text-slate-500">Tổng hợp doanh số, cung tuyến &amp; KPI cả tháng{prevMonth ? " · so với tháng trước" : ""}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-700">Quản lý: {teamName}</p>
            <p className="mt-1 inline-block rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white">Tháng {month}</p>
          </div>
        </div>

        {(salesError || kpiError) && (
          <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            {salesError && <div>Doanh số: {salesError}</div>}
            {kpiError && <div>Kế hoạch KPI: {kpiError}</div>}
          </div>
        )}

        {/* 4 thẻ KPI */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard accent={C.cov} label="Doanh số kênh đơn" value={pctStr(g.kdPct)} sub={`${formatShortVnd(g.kdTH)} / ${formatShortVnd(g.kdKH)}`}
            tag={g.kdPct >= 100 ? "▲ Đã đạt kế hoạch" : g.kdPct >= pctThoiGian ? `▲ Vượt mốc ${pctThoiGian.toFixed(0)}%` : `▼ Chậm hơn mốc ${pctThoiGian.toFixed(0)}%`}
            tagColor={g.kdPct >= pctThoiGian ? "green" : "red"} />
          <KpiCard accent={C.red} label="Doanh số thầu" value={pctStr(g.thauPct)} sub={`${formatShortVnd(g.thauTH)} / ${formatShortVnd(g.thauKH)}`}
            tag={g.thauPct < 1 ? "● Chưa phát sinh" : g.thauPct >= 100 ? "▲ Đã đạt kế hoạch" : "Đang triển khai"}
            tagColor={g.thauPct < 1 ? "red" : "green"} />
          <KpiCard accent={C.kd} label="Tổng doanh số tháng" value={formatShortVnd(g.doanhThu)} sub={`KĐ ${formatShortVnd(g.kdTH)} • Thầu ${formatShortVnd(g.thauTH)}`}
            tag={dm(g.doanhThu, g.doanhThuTruoc) ?? "Tháng đầu tiên"} tagColor={g.doanhThu >= g.doanhThuTruoc ? "green" : "red"} />
          <KpiCard accent={C.violet} label="Điểm cung tuyến" value={hasEval ? String(g.diem) : "—"} sub={`Gặp ${g.gap} · Sale ${g.sale}`}
            tag={hasEval ? (dmNum(g.diem, g.diemTruoc) ?? "—") : "Chưa chấm điểm"} tagColor={g.diem >= g.diemTruoc ? "green" : "amber"} />
        </div>

        {/* Tiến độ KĐ + Thầu theo NV */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Tiến độ Kênh Đơn theo nhân viên" sub={`% hoàn thành chỉ tiêu tháng${laThangHienTai ? ` — so với mốc thời gian ${pctThoiGian.toFixed(0)}%` : ""}`}>
            <div className="mt-3 space-y-3">
              {kdRows.length ? kdRows.map((e) => (
                <BarRow key={e.ma} name={e.ten} pctVal={e.kdPct} ceiling={130} marker={laThangHienTai ? pctThoiGian : undefined} color={e.kdPct >= pctThoiGian ? C.cov : e.kdPct > 0 ? C.thau : C.red} />
              )) : <p className="text-xs text-slate-400">Chưa có chỉ tiêu kê đơn.</p>}
            </div>
            <p className="mt-3 text-xs text-slate-400">Thanh dài = 130% (mức trần biểu đồ){laThangHienTai ? ". Vạch dọc = mốc tiến độ thời gian." : ""}</p>
          </Card>

          <Card title="Tiến độ Thầu theo nhân viên" sub="% hoàn thành chỉ tiêu thầu tháng" dot={C.thau}>
            <div className="mt-3 space-y-3">
              {thauRows.length ? thauRows.map((e) => (
                <BarRow key={e.ma} name={e.ten} pctVal={e.thauPct} ceiling={130} color={e.thauPct >= pctThoiGian ? C.cov : e.thauPct > 0 ? C.thau : C.red} />
              )) : <p className="text-xs text-slate-400">Nhóm không có chỉ tiêu thầu theo từng nhân viên.</p>}
            </div>
          </Card>
        </div>

        {/* Nổi bật & cần cải thiện */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Nổi bật & Cần cải thiện" sub="Theo % hoàn thành kênh đơn trong tháng">
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                <p className="text-sm font-semibold text-emerald-800">★ Nổi bật</p>
                <ul className="mt-2 space-y-2">
                  {noiBat.map((e) => (
                    <li key={e.ma} className="text-xs text-slate-700"><span className="font-semibold text-slate-900">{e.ten}</span> — KĐ {pctStr(e.kdPct)} ({formatShortVnd(e.kdTH)}/{formatShortVnd(e.kdKH)}), điểm {e.diem}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50/60 p-3">
                <p className="text-sm font-semibold text-red-700">⚠ Cần cải thiện</p>
                <ul className="mt-2 space-y-2">
                  {canCaiThien.map((e) => (
                    <li key={e.ma} className="text-xs text-slate-700"><span className="font-semibold text-slate-900">{e.ten}</span> — KĐ {pctStr(e.kdPct)} ({formatShortVnd(e.kdTH)}/{formatShortVnd(e.kdKH)}){e.doanhThu === 0 ? ", chưa có doanh số" : ""}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          {deXuat.length > 0 && (
            <Card title="Đề xuất hành động tháng tới" dot={C.red}>
              <div className="mt-3 space-y-3">
                {deXuat.map((d, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-600 text-xs font-bold text-white">{i + 1}</span>
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold text-slate-900">{d.title}</span>{" "}
                      <span className={d.tag === "KHẨN" ? "rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700" : "rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700"}>{d.tag}</span>{" "}— {d.body}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Bảng hoạt động cung tuyến trong tháng */}
        <Card title={`Hoạt động cung tuyến trong tháng ${month}`} sub="Doanh số, gặp khách, phát sinh sale và điểm cung tuyến theo nhân viên">
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-medium">Nhân viên</th>
                  <th className="py-2 pr-3 text-right font-medium">Doanh số</th>
                  <th className="py-2 pr-3 text-right font-medium">KĐ %</th>
                  <th className="py-2 pr-3 text-right font-medium">Số tuần</th>
                  <th className="py-2 pr-3 text-right font-medium">Gặp khách</th>
                  <th className="py-2 pr-3 text-right font-medium">Sale</th>
                  <th className="py-2 pr-3 text-right font-medium">Điểm</th>
                </tr>
              </thead>
              <tbody>
                {emps.map((e) => (
                  <tr key={e.ma} className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-medium text-slate-800">{e.ten}</td>
                    <td className="py-2 pr-3 text-right text-slate-700">{formatVnd(e.doanhThu)}</td>
                    <td className="py-2 pr-3 text-right font-semibold" style={{ color: e.kdPct >= pctThoiGian ? C.cov : C.red }}>{e.kdKH > 0 ? pctStr(e.kdPct) : "—"}</td>
                    <td className="py-2 pr-3 text-right text-slate-600">{e.soTuan}</td>
                    <td className="py-2 pr-3 text-right text-slate-700">{e.gap}</td>
                    <td className="py-2 pr-3 text-right text-slate-700">{e.sale}</td>
                    <td className="py-2 pr-3 text-right font-semibold text-slate-900">{e.diem}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-300 font-semibold">
                  <td className="py-2 pr-3 text-slate-900">TỔNG</td>
                  <td className="py-2 pr-3 text-right text-slate-900">{formatVnd(g.doanhThu)}</td>
                  <td className="py-2 pr-3 text-right text-slate-900">{pctStr(g.kdPct)}</td>
                  <td className="py-2 pr-3"></td>
                  <td className="py-2 pr-3 text-right text-slate-900">{g.gap}</td>
                  <td className="py-2 pr-3 text-right text-slate-900">{g.sale}</td>
                  <td className="py-2 pr-3 text-right text-slate-900">{g.diem}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* Đối chiếu tháng trước */}
        {prevMonth && (
          <Card title="Đối chiếu tháng trước" sub={`So với tháng ${prevMonth} — % kênh đơn theo nhân viên`}>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-3 font-medium">Nhân viên (Kênh Đơn %)</th>
                    <th className="py-2 pr-3 text-right font-medium">Tháng trước</th>
                    <th className="py-2 pr-3 text-right font-medium">Tháng này</th>
                    <th className="py-2 pr-3 text-right font-medium">Thay đổi</th>
                    <th className="py-2 pr-3 font-medium">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {doiChieu.nv.map((x) => (
                    <tr key={x.ma} className="border-b border-slate-100">
                      <td className="py-2 pr-3 font-medium text-slate-800">{x.ten}</td>
                      <td className="py-2 pr-3 text-right text-slate-500">{pctStr(x.truoc)}</td>
                      <td className="py-2 pr-3 text-right font-semibold text-slate-900">{pctStr(x.nay)}</td>
                      <td className={`py-2 pr-3 text-right font-medium ${x.trang === "tang" ? "text-emerald-600" : x.trang === "giam" ? "text-red-600" : "text-slate-400"}`}>
                        {x.trang === "tang" ? `▲ +${x.delta.toFixed(1)}đ%` : x.trang === "giam" ? `▼ ${x.delta.toFixed(1)}đ%` : "—"}
                      </td>
                      <td className="py-2 pr-3">
                        {x.dat ? <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700">✔ Đạt tiến độ</span>
                          : <span className="rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-semibold text-red-700">✘ Chưa đạt — cần đôn đốc</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {doiChieu.nhac.length > 0 && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                <p className="text-xs font-semibold text-amber-800">🔔 Nhắc đôn đốc tháng tới</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-slate-700">
                  {doiChieu.nhac.map((x) => (
                    <li key={x.ma}>Đôn đốc <b>{x.ten}</b> — KĐ {pctStr(x.nay)}, {x.trang === "tang" ? "có tăng nhưng chưa đủ" : x.trang === "giam" ? "đang đi xuống" : "gần như đứng yên"}.</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        )}

        {/* Tổng điểm KPIs theo NV */}
        <Card title="Tổng điểm KPIs theo nhân viên" sub="Theo file KPI của công ty" dot={C.kd}>
          {kpiError ? (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{kpiError}</p>
          ) : kpiDiem.length === 0 ? (
            <p className="mt-3 text-xs text-slate-400">Chưa có dữ liệu KPIs cho nhóm này.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="text-slate-500"><tr className="border-b border-slate-200"><th className="py-2 pr-3 font-medium">Nhân viên</th><th className="py-2 pr-3 text-right font-medium">Tổng điểm KPIs</th></tr></thead>
                <tbody>
                  {kpiDiem.map((k, i) => (
                    <tr key={i} className="border-b border-slate-100"><td className="py-2 pr-3 font-medium text-slate-800">{k.ten}</td><td className="py-2 pr-3 text-right font-semibold text-slate-900">{k.diem}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <p className="text-center text-xs text-slate-400">Báo cáo tổng hợp tháng {month} · Đội KD do {teamName} quản lý · Đơn vị: tr = triệu VNĐ</p>
      </div>
    </div>
  );
}

function KpiCard({ accent, label, value, sub, tag, tagColor }: { accent: string; label: string; value: string; sub: string; tag: string; tagColor: "green" | "red" | "amber" | "violet" }) {
  const tagCls =
    tagColor === "green" ? "bg-emerald-50 text-emerald-700"
    : tagColor === "red" ? "bg-red-50 text-red-700"
    : tagColor === "amber" ? "bg-amber-50 text-amber-700"
    : "bg-violet-50 text-violet-700";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" style={{ borderLeft: `4px solid ${accent}` }}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-extrabold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs text-slate-500">{sub}</p>
      <span className={`mt-2 inline-block rounded-md px-2 py-0.5 text-[11px] font-medium ${tagCls}`}>{tag}</span>
    </div>
  );
}

function Card({ title, sub, dot, children }: { title: string; sub?: string; dot?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dot ?? "#6d5ae6" }} />
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </div>
      {sub && <p className="mt-0.5 pl-4 text-xs text-slate-400">{sub}</p>}
      {children}
    </section>
  );
}

function BarRow({ name, pctVal, ceiling, marker, color }: { name: string; pctVal: number; ceiling: number; marker?: number; color: string }) {
  const w = Math.max(0, Math.min(100, (pctVal / ceiling) * 100));
  const markerLeft = marker != null ? Math.max(0, Math.min(100, (marker / ceiling) * 100)) : null;
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-800">{name}</span>
        <span className="text-sm font-bold" style={{ color }}>{pctVal.toFixed(pctVal % 1 === 0 ? 0 : 1)}%</span>
      </div>
      <div className="relative mt-1 h-3 w-full rounded-full bg-slate-100">
        <div className="h-3 rounded-full" style={{ width: `${w}%`, backgroundColor: color }} />
        {markerLeft != null && <div className="absolute top-[-2px] h-[16px] w-[2px] bg-slate-500" style={{ left: `${markerLeft}%` }} />}
      </div>
    </div>
  );
}
