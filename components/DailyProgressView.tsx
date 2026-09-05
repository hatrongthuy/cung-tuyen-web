"use client";

import { useMemo, useState } from "react";
import { allEmployees } from "@/lib/allowlist";
import { formatShortVnd, formatVnd, pct, parseMoney } from "@/lib/format";
import {
  salesByRange,
  normalizeMaNV,
  findColumn,
  type SaleTxnLite,
} from "@/lib/report-utils";
import type { EmployeeWeekSummary } from "@/lib/aggregate";

interface DateCtx {
  nam: number;
  thang: number;
  ngay: number;
  soNgayThang: number;
  monthStartMs: number;
  nowMs: number;
  weekAgoMs: number;
}

interface EmpRow {
  ma: string;
  ten: string;
  diaBan: string;
  kdTH: number;
  kdKH: number;
  kdPct: number;
  kdPctTruoc: number;
  thauTH: number;
  thauKH: number;
  thauPct: number;
  coverage: number | null; // 0..1
  soGoiY: number;
  soChuaGap: number;
  severity: number; // 3 gấp, 2 cảnh báo, 1 lưu ý, 0 tốt
  banner: string;
  bannerColor: "red" | "amber" | "green";
  alerts: { txt: string; type: "bad" | "warn" | "good" }[];
}

const ACCENT = { kd: "#2a78d6", thau: "#eda100", cov: "#1baf7a" };

function pctStr(v: number) {
  return `${v.toFixed(1)}%`;
}
function arrow(cur: number, prev: number) {
  const d = cur - prev;
  if (Math.abs(d) < 0.05) return { s: "—", c: "text-slate-400" };
  return d > 0 ? { s: `▲ +${d.toFixed(1)}đ%`, c: "text-emerald-600" } : { s: `▼ ${d.toFixed(1)}đ%`, c: "text-red-600" };
}

export default function DailyProgressView({
  teamName,
  salesTxns = [],
  salesError,
  kpiCols = [],
  kpiRows = [],
  kpiError,
  summaries = [],
  ctx,
}: {
  teamName: string;
  salesTxns?: SaleTxnLite[];
  salesError?: string | null;
  kpiCols?: string[];
  kpiRows?: Record<string, string>[];
  kpiError?: string | null;
  summaries?: EmployeeWeekSummary[];
  ctx: DateCtx;
}) {
  const pctThoiGian = (ctx.ngay / ctx.soNgayThang) * 100;

  const emps = useMemo<EmpRow[]>(() => {
    // Thực hiện lũy kế tới hôm nay & tới 7 ngày trước (để tính xu hướng)
    const kdNow = salesByRange(salesTxns, ctx.monthStartMs, ctx.nowMs, "keDon");
    const thauNow = salesByRange(salesTxns, ctx.monthStartMs, ctx.nowMs, "thau");
    const kdPrev = salesByRange(salesTxns, ctx.monthStartMs, ctx.weekAgoMs, "keDon");

    // Kế hoạch theo nhân viên từ file KPI (tab Doanh so) — khớp theo Mã NV.
    const cMa = findColumn(kpiCols, ["mã nv"]) ?? findColumn(kpiCols, ["mã", "nv"]) ?? findColumn(kpiCols, ["mã nhân"]);
    const cKd = findColumn(kpiCols, ["kê đơn", "kế hoạch"]) ?? findColumn(kpiCols, ["kê đơn", "hoạch"]);
    const cThau = findColumn(kpiCols, ["thầu", "kế hoạch"]) ?? findColumn(kpiCols, ["thầu", "hoạch"]);
    const cDia = findColumn(kpiCols, ["địa bàn"]) ?? findColumn(kpiCols, ["vị trí"]);
    const planByMa = new Map<string, { kd: number; thau: number; dia: string }>();
    for (const r of kpiRows) {
      const ma = cMa ? normalizeMaNV(r[cMa]) : "";
      if (!ma) continue;
      planByMa.set(ma, {
        kd: cKd ? parseMoney(r[cKd]) : 0,
        thau: cThau ? parseMoney(r[cThau]) : 0,
        dia: cDia ? String(r[cDia] ?? "").trim() : "",
      });
    }

    const covByMa = new Map<string, EmployeeWeekSummary>();
    for (const s of summaries) covByMa.set(normalizeMaNV(s.maNhanVien), s);

    const out: EmpRow[] = allEmployees().map((e) => {
      const ma = normalizeMaNV(e.maNhanVien);
      const plan = planByMa.get(ma) ?? { kd: 0, thau: 0, dia: "" };
      const kdTH = kdNow[ma] ?? 0;
      const thauTH = thauNow[ma] ?? 0;
      const kdKH = plan.kd;
      const thauKH = plan.thau;
      const kdPct = pct(kdTH, kdKH);
      const kdPctTruoc = pct(kdPrev[ma] ?? 0, kdKH);
      const thauPct = pct(thauTH, thauKH);
      const sm = covByMa.get(ma);
      const coverage = sm && sm.soGoiY > 0 ? sm.tyLeHoanThanh : null;
      const soGoiY = sm?.soGoiY ?? 0;
      const soChuaGap = sm ? Math.max(0, sm.soGoiY - sm.soDongY) : 0;

      // ---- Cảnh báo tự động theo ngưỡng ----
      const alerts: EmpRow["alerts"] = [];
      let severity = 0;
      if (kdKH > 0) {
        if (kdPct >= 100) {
          alerts.push({ txt: `KĐ đã đạt/vượt kế hoạch (${pctStr(kdPct)})`, type: "good" });
        } else if (kdPct < pctThoiGian - 25) {
          severity = Math.max(severity, 3);
          alerts.push({ txt: `KĐ chậm nặng: mới ${pctStr(kdPct)} trong khi đã qua ${pctStr(pctThoiGian)} thời gian tháng`, type: "bad" });
        } else if (kdPct < pctThoiGian - 10) {
          severity = Math.max(severity, 2);
          alerts.push({ txt: `KĐ chậm hơn tiến độ: ${pctStr(kdPct)} / mốc ${pctStr(pctThoiGian)}`, type: "warn" });
        }
        // đứng yên: 7 ngày không tăng và còn thấp
        if (kdPct < 100 && Math.abs(kdPct - kdPctTruoc) < 1 && kdPct < pctThoiGian - 10) {
          severity = Math.max(severity, 3);
          alerts.push({ txt: `KĐ gần như đứng yên 7 ngày qua (${pctStr(kdPctTruoc)} → ${pctStr(kdPct)})`, type: "bad" });
        }
      }
      if (thauKH > 0 && thauPct >= 100) {
        alerts.push({ txt: `Thầu đạt/vượt kế hoạch (${pctStr(thauPct)})`, type: "good" });
      }
      if (coverage !== null && coverage < 0.6) {
        severity = Math.max(severity, 2);
        alerts.push({ txt: `Coverage thấp: mới gặp ${sm!.soDongY}/${sm!.soGoiY} khách cần gặp`, type: "warn" });
      }
      if (soChuaGap >= 3) {
        severity = Math.max(severity, 2);
        alerts.push({ txt: `Còn ${soChuaGap} khách gợi ý chưa gặp trong tuần`, type: "warn" });
      }
      if (alerts.length === 0) alerts.push({ txt: "Đang bám tiến độ tốt", type: "good" });

      const bannerColor: EmpRow["bannerColor"] = severity >= 3 ? "red" : severity === 2 ? "amber" : "green";
      const banner =
        severity >= 3
          ? "Cần SS xử lý gấp"
          : severity === 2
          ? "Cần chú ý"
          : kdPct >= 100
          ? "Đã đạt kế hoạch KĐ"
          : "Đang ổn định";

      return {
        ma, ten: e.hoTen, diaBan: plan.dia,
        kdTH, kdKH, kdPct, kdPctTruoc, thauTH, thauKH, thauPct,
        coverage, soGoiY, soChuaGap, severity, banner, bannerColor, alerts,
      };
    });

    return out.sort((a, b) => b.severity - a.severity || a.kdPct - b.kdPct);
  }, [salesTxns, kpiCols, kpiRows, summaries, ctx, pctThoiGian]);

  // ---- Tổng nhóm ----
  const g = useMemo(() => {
    const sum = (f: (e: EmpRow) => number) => emps.reduce((a, e) => a + f(e), 0);
    const kdTH = sum((e) => e.kdTH), kdKH = sum((e) => e.kdKH);
    const thauTH = sum((e) => e.thauTH), thauKH = sum((e) => e.thauKH);
    const kdPrevTotal = emps.reduce((a, e) => a + (e.kdPctTruoc / 100) * e.kdKH, 0);
    const covVals = emps.map((e) => e.coverage).filter((c): c is number => c !== null);
    const coverage = covVals.length ? covVals.reduce((a, b) => a + b, 0) / covVals.length : null;
    return {
      kdTH, kdKH, kdPct: pct(kdTH, kdKH), kdPctTruoc: pct(kdPrevTotal, kdKH),
      thauTH, thauKH, thauPct: pct(thauTH, thauKH),
      coverage,
    };
  }, [emps]);

  // ---- Hộp điểm nhấn (auto) ----
  const highlights = useMemo(() => {
    const good: string[] = [];
    const bad: { title: string; body: string }[] = [];
    if (g.kdKH > 0 && g.kdPct >= 100) good.push(`KĐ nhóm đã đạt ${pctStr(g.kdPct)} kế hoạch (${formatShortVnd(g.kdTH)}/${formatShortVnd(g.kdKH)}).`);
    if (g.thauKH > 0 && g.thauPct >= 100) good.push(`Thầu nhóm đạt ${pctStr(g.thauPct)} kế hoạch (${formatShortVnd(g.thauTH)}/${formatShortVnd(g.thauKH)}).`);
    for (const e of emps.filter((x) => x.severity >= 2).slice(0, 3)) {
      const a = e.alerts.find((x) => x.type === "bad") ?? e.alerts.find((x) => x.type === "warn");
      bad.push({ title: `${e.ten}: ${e.banner}`, body: a?.txt ?? "" });
    }
    return { good, bad };
  }, [g, emps]);

  // ---- Gemini (thứ 7) ----
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiError, setAiError] = useState("");
  function buildTomTat(): string {
    const L: string[] = [];
    L.push(`Nhóm ${teamName} — tiến độ lũy kế 01–${ctx.ngay}/${ctx.thang}/${ctx.nam} (đã qua ${pctStr(pctThoiGian)} thời gian tháng).`);
    L.push(`TỔNG NHÓM: KĐ ${formatVnd(g.kdTH)}/${formatVnd(g.kdKH)} (đạt ${pctStr(g.kdPct)}); Thầu ${formatVnd(g.thauTH)}/${formatVnd(g.thauKH)} (đạt ${pctStr(g.thauPct)}); Coverage TB ${g.coverage !== null ? pctStr(g.coverage * 100) : "—"}.`);
    L.push("THEO NHÂN VIÊN:");
    for (const e of emps) {
      L.push(`- ${e.ten} (${e.diaBan}): KĐ ${pctStr(e.kdPct)} (${formatVnd(e.kdTH)}/${formatVnd(e.kdKH)}), Thầu ${pctStr(e.thauPct)}, Coverage ${e.coverage !== null ? pctStr(e.coverage * 100) : "—"}, chưa gặp ${e.soChuaGap} khách. Cảnh báo: ${e.alerts.map((a) => a.txt).join("; ")}.`);
    }
    return L.join("\n");
  }
  async function phanTichAI() {
    setAiLoading(true); setAiError(""); setAiText("");
    try {
      const res = await fetch("/api/phan-tich-tuan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tomTat: buildTomTat(), ky: "tuần" }),
      });
      const data = await res.json();
      if (!res.ok) setAiError(data?.error || "Lỗi phân tích."); else setAiText(data?.text || "");
    } catch (e) {
      setAiError(e instanceof Error ? e.message : String(e));
    } finally { setAiLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Báo cáo tiến độ — tháng {String(ctx.thang).padStart(2, "0")}/{ctx.nam}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Nhóm {teamName} · Dữ liệu lũy kế 01–{ctx.ngay}/{ctx.thang}/{ctx.nam} ({pctStr(pctThoiGian)} thời gian tháng) · Cập nhật tự động từ file Sale
        </p>
      </div>

      {(salesError || kpiError) && (
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {salesError && <div>Doanh số: {salesError}</div>}
          {kpiError && <div>Kế hoạch KPI: {kpiError}</div>}
        </div>
      )}

      {/* ===== Tóm tắt điều hành ===== */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">⚡ Tóm tắt điều hành</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <GroupTile label="KĐ nhóm (so 7 ngày)" pctNow={g.kdPct} pctPrev={g.kdPctTruoc} sub={`${formatShortVnd(g.kdTH)}/${formatShortVnd(g.kdKH)}`} accent={ACCENT.kd} />
          <GroupTile label="Thầu nhóm" pctNow={g.thauPct} pctPrev={g.thauPct} sub={`${formatShortVnd(g.thauTH)}/${formatShortVnd(g.thauKH)}`} accent={ACCENT.thau} noDelta />
          <GroupTile label="Coverage MCP nhóm" pctNow={g.coverage !== null ? g.coverage * 100 : 0} pctPrev={g.coverage !== null ? g.coverage * 100 : 0} sub="đã gặp / cần gặp" accent={ACCENT.cov} noDelta />
        </div>
        <div className="mt-3 space-y-2">
          {highlights.good.map((t, i) => (
            <div key={`g${i}`} className="rounded-lg border-l-4 border-emerald-500 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{t}</div>
          ))}
          {highlights.bad.map((b, i) => (
            <div key={`b${i}`} className="rounded-lg border-l-4 border-red-400 bg-red-50 px-3 py-2 text-xs text-red-800">
              <span className="font-semibold">{b.title}.</span> {b.body}
            </div>
          ))}
          {highlights.good.length === 0 && highlights.bad.length === 0 && (
            <div className="text-xs text-slate-400">Chưa có điểm nhấn nổi bật.</div>
          )}
        </div>
      </section>

      {/* ===== Theo từng nhân viên ===== */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">👤 Tiến độ theo từng nhân viên</h2>
            <p className="mt-0.5 text-xs text-slate-400">Sắp xếp theo mức cần chú ý — cần xử lý gấp lên trước</p>
          </div>
          <button
            onClick={phanTichAI}
            disabled={aiLoading}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {aiLoading ? "Đang phân tích…" : "Phân tích AI (Gemini) — dùng thứ 7"}
          </button>
        </div>

        {aiError && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{aiError}</p>}
        {aiText && (
          <div className="mt-3 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">{aiText}</div>
        )}

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {emps.map((e) => (
            <EmpCard key={e.ma} e={e} pctThoiGian={pctThoiGian} />
          ))}
        </div>
      </section>
    </div>
  );
}

function GroupTile({ label, pctNow, pctPrev, sub, accent, noDelta }: { label: string; pctNow: number; pctPrev: number; sub: string; accent: string; noDelta?: boolean }) {
  const a = arrow(pctNow, pctPrev);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3" style={{ borderTop: `3px solid ${accent}` }}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-slate-900">{pctStr(pctNow)}</span>
        {!noDelta && <span className={`text-xs font-medium ${a.c}`}>{a.s}</span>}
      </div>
      <p className="mt-0.5 text-xs text-slate-400">{sub}</p>
    </div>
  );
}

function EmpCard({ e, pctThoiGian }: { e: EmpRow; pctThoiGian: number }) {
  const bannerCls =
    e.bannerColor === "red"
      ? "bg-red-50 text-red-700 border-red-200"
      : e.bannerColor === "amber"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : "bg-emerald-50 text-emerald-700 border-emerald-200";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">
          {e.ten} <span className="text-xs font-normal text-slate-400">MNV {e.ma}{e.diaBan ? ` · ${e.diaBan}` : ""}</span>
        </p>
      </div>
      <div className={`mt-2 inline-block rounded-md border px-2 py-1 text-xs font-medium ${bannerCls}`}>{e.banner}</div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <MetricTile label="KĐ" pctNow={e.kdPct} pctPrev={e.kdPctTruoc} sub={`${formatShortVnd(e.kdTH)}/${formatShortVnd(e.kdKH)}`} accent={ACCENT.kd} />
        <MetricTile label="Thầu" pctNow={e.thauPct} sub={e.thauKH > 0 ? `${formatShortVnd(e.thauTH)}/${formatShortVnd(e.thauKH)}` : "Không có chỉ tiêu"} accent={ACCENT.thau} noDelta />
        <MetricTile label="Coverage" pctNow={e.coverage !== null ? e.coverage * 100 : null} sub={e.soGoiY > 0 ? `gặp ${e.soGoiY - e.soChuaGap}/${e.soGoiY}` : "—"} accent={ACCENT.cov} noDelta />
      </div>

      <ul className="mt-3 space-y-1.5">
        {e.alerts.map((a, i) => (
          <li key={i} className={`rounded-md px-2 py-1.5 text-xs ${a.type === "bad" ? "bg-red-50 text-red-700" : a.type === "warn" ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>
            {a.type === "bad" ? "✗ " : a.type === "warn" ? "! " : "✓ "}{a.txt}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MetricTile({ label, pctNow, pctPrev, sub, accent, noDelta }: { label: string; pctNow: number | null; pctPrev?: number; sub: string; accent: string; noDelta?: boolean }) {
  const a = !noDelta && pctNow !== null && pctPrev !== undefined ? arrow(pctNow, pctPrev) : null;
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500" style={{ color: accent }}>{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900">{pctNow === null ? "—" : pctStr(pctNow)}</p>
      {a && <p className={`text-[10px] font-medium ${a.c}`}>{a.s}</p>}
      <p className="mt-0.5 text-[10px] text-slate-400">{sub}</p>
    </div>
  );
}
