"use client";

import { useMemo, useState } from "react";
import { allEmployees } from "@/lib/allowlist";
import { formatShortVnd, formatVnd } from "@/lib/format";
import { salesByRange, normalizeMaNV, type SaleTxnLite } from "@/lib/report-utils";
import type { EmployeeWeekSummary, TonDongTuanTruoc } from "@/lib/aggregate";

interface Ctx {
  nam: number;
  thang: number;
  ngay: number;
  monthStartMs: number;
  nowMs: number;
  lastMonthStartMs: number;
  lastMonthSameMs: number;
  lastMonthLabel: string;
}

export interface KpiRowLite {
  ma: string;
  khDS: number;
  diem: number | null;
  gaps: { label: string; th: number; kh: number }[];
}

type Status = "ok" | "push" | "risk" | "none";
const STATUS_META: Record<Status, { label: string; color: string; bg: string }> = {
  ok: { label: "✅ Ổn", color: "#13a97a", bg: "#13a97a1a" },
  push: { label: "⚠ Cần đẩy", color: "#c98a00", bg: "#c98a001a" },
  risk: { label: "🔴 Rủi ro", color: "#e2443f", bg: "#e2443f1a" },
  none: { label: "— Chưa có KH", color: "#64748b", bg: "#64748b1a" },
};

function deltaMoney(cur: number, prev: number) {
  const d = cur - prev;
  if (prev === 0 && cur === 0) return { s: "—", c: "text-slate-400" };
  if (prev === 0) return { s: "mới", c: "text-emerald-600" };
  const p = (d / Math.abs(prev)) * 100;
  return d >= 0
    ? { s: `▲ +${p.toFixed(0)}%`, c: "text-emerald-600" }
    : { s: `▼ ${p.toFixed(0)}%`, c: "text-red-600" };
}

function isDeparted(nghiTu: string | undefined, nam: number, thang: number): boolean {
  if (!nghiTu) return false;
  const [y, m] = nghiTu.split("-").map(Number);
  if (!y || !m) return false;
  return nam > y || (nam === y && thang >= m);
}

interface EmpRow {
  ma: string;
  ten: string;
  kdNow: number;
  kdPrev: number;
  thauNow: number;
  thauPrev: number;
  dsNow: number;
  khDS: number;
  diem: number | null;
  pct: number | null; // tiến độ hiện tại
  projPct: number | null; // dự báo cuối tháng
  status: Status;
  covTotal: number;
  covMet: number;
  covPct: number | null;
  gaps: { label: string; th: number; kh: number }[];
  canGap: { tenKH: string; mucTieu: string; tinh: string }[];
  soCanGap: number;
  tonDong: { maKH: string; tenKH: string }[];
}

export default function DoiNhomView({
  teamName,
  salesTxns = [],
  salesError,
  summaries = [],
  tonDong,
  kpiRows = [],
  ctx,
  onlyMa,
  title,
}: {
  teamName: string;
  salesTxns?: SaleTxnLite[];
  salesError?: string | null;
  summaries?: EmployeeWeekSummary[];
  tonDong?: TonDongTuanTruoc | null;
  kpiRows?: KpiRowLite[];
  ctx: Ctx;
  onlyMa?: string;
  title?: string;
}) {
  const daysInMonth = new Date(ctx.nam, ctx.thang, 0).getDate();
  const daysElapsed = Math.max(1, ctx.ngay);

  const emps = useMemo<EmpRow[]>(() => {
    const now = { nam: ctx.nam, thang: ctx.thang };
    const lm = new Date(ctx.lastMonthStartMs);
    const prev = { nam: lm.getFullYear(), thang: lm.getMonth() + 1 };
    const kdNow = salesByRange(salesTxns, ctx.monthStartMs, ctx.nowMs, "keDon", now);
    const kdPrev = salesByRange(salesTxns, ctx.lastMonthStartMs, ctx.lastMonthSameMs, "keDon", prev);
    const thauNow = salesByRange(salesTxns, ctx.monthStartMs, ctx.nowMs, "thau", now);
    const thauPrev = salesByRange(salesTxns, ctx.lastMonthStartMs, ctx.lastMonthSameMs, "thau", prev);

    const sumByMa = new Map<string, EmployeeWeekSummary>();
    for (const s of summaries) sumByMa.set(normalizeMaNV(s.maNhanVien), s);
    const tonByMa = new Map<string, { maKH: string; tenKH: string }[]>();
    if (tonDong) for (const t of tonDong.perEmp) tonByMa.set(normalizeMaNV(t.maNhanVien), t.khachChuaXuLy);
    const kpiByMa = new Map<string, KpiRowLite>();
    for (const k of kpiRows) kpiByMa.set(normalizeMaNV(k.ma), k);

    const onlyMaN = onlyMa ? normalizeMaNV(onlyMa) : null;
    return allEmployees()
      .filter((e) => (onlyMaN ? normalizeMaNV(e.maNhanVien) === onlyMaN : !isDeparted(e.nghiTu, ctx.nam, ctx.thang)))
      .map((e) => {
        const ma = normalizeMaNV(e.maNhanVien);
        const sm = sumByMa.get(ma);
        const kgo = sm?.khachGoiY ?? [];
        const canGap = kgo.filter((k) => k.trangThai !== "Đồng ý").map((k) => ({ tenKH: k.tenKH, mucTieu: k.mucTieu, tinh: k.tinh }));
        const kpi = kpiByMa.get(ma);
        const dsNow = (kdNow[ma] ?? 0) + (thauNow[ma] ?? 0);
        const khDS = kpi?.khDS ?? 0;
        const pct = khDS > 0 ? (dsNow / khDS) * 100 : null;
        const projPct = khDS > 0 ? ((dsNow / daysElapsed) * daysInMonth / khDS) * 100 : null;
        let status: Status = "none";
        if (projPct != null) status = projPct >= 95 ? "ok" : projPct >= 75 ? "push" : "risk";
        const covTotal = kgo.length;
        const covMet = covTotal - canGap.length;
        return {
          ma,
          ten: e.hoTen,
          kdNow: kdNow[ma] ?? 0,
          kdPrev: kdPrev[ma] ?? 0,
          thauNow: thauNow[ma] ?? 0,
          thauPrev: thauPrev[ma] ?? 0,
          dsNow,
          khDS,
          diem: kpi?.diem ?? null,
          pct,
          projPct,
          status,
          covTotal,
          covMet,
          covPct: covTotal > 0 ? (covMet / covTotal) * 100 : null,
          gaps: kpi?.gaps ?? [],
          canGap,
          soCanGap: canGap.length,
          tonDong: tonByMa.get(ma) ?? [],
        };
      });
  }, [salesTxns, summaries, tonDong, kpiRows, ctx, onlyMa, daysElapsed, daysInMonth]);

  const g = useMemo(() => {
    const s = (f: (e: EmpRow) => number) => emps.reduce((a, e) => a + f(e), 0);
    const dsNow = s((e) => e.dsNow);
    const khDS = s((e) => e.khDS);
    return {
      dsNow,
      khDS,
      pct: khDS > 0 ? (dsNow / khDS) * 100 : null,
      projPct: khDS > 0 ? ((dsNow / daysElapsed) * daysInMonth / khDS) * 100 : null,
      thauNow: s((e) => e.thauNow),
      thauPrev: s((e) => e.thauPrev),
      canGap: s((e) => e.soCanGap),
      tonDong: s((e) => e.tonDong.length),
    };
  }, [emps, daysElapsed, daysInMonth]);

  // ---- Cảnh báo (ngoại lệ) ----
  const alerts = useMemo(() => {
    if (onlyMa) return [] as { icon: string; text: string; sev: number }[];
    const out: { icon: string; text: string; sev: number }[] = [];
    for (const e of emps) {
      if (e.status === "risk")
        out.push({ icon: "🔴", text: `${e.ten}: tiến độ DS mới ${e.pct != null ? e.pct.toFixed(0) : "0"}% KH, dự báo cuối tháng ${e.projPct != null ? e.projPct.toFixed(0) : "?"}% — cần đẩy/hỗ trợ ngay.`, sev: 3 });
      if (e.kdPrev > 20_000_000 && e.kdNow < e.kdPrev * 0.5)
        out.push({ icon: "📉", text: `${e.ten}: KĐ ${formatShortVnd(e.kdNow)} — giảm mạnh so cùng kỳ (${formatShortVnd(e.kdPrev)}).`, sev: 2 });
      if (e.covTotal > 0 && e.covMet === 0)
        out.push({ icon: "📞", text: `${e.ten}: chưa gặp khách nào trong ${e.covTotal} khách gợi ý tuần này.`, sev: 2 });
      else if (e.soCanGap >= 10)
        out.push({ icon: "📞", text: `${e.ten}: còn ${e.soCanGap} khách cần gặp (coverage ${e.covPct != null ? e.covPct.toFixed(0) : 0}%).`, sev: 1 });
      if (e.tonDong.length > 0)
        out.push({ icon: "🗂", text: `${e.ten}: ${e.tonDong.length} khách tồn đọng tuần trước chưa xử lý.`, sev: 1 });
    }
    return out.sort((a, b) => b.sev - a.sev);
  }, [emps, onlyMa]);

  const ranked = useMemo(() => [...emps].sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1)), [emps]);

  // ---- AI ----
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiError, setAiError] = useState("");
  function buildTomTat(): string {
    const L: string[] = [];
    L.push(`Nhóm ${teamName} — quản lý đội nhóm, lũy kế 01–${ctx.ngay}/${ctx.thang}/${ctx.nam} (${daysElapsed}/${daysInMonth} ngày), so cùng kỳ tháng ${ctx.lastMonthLabel}.`);
    L.push(`TỔNG NHÓM: DS ${formatVnd(g.dsNow)}${g.khDS > 0 ? ` / KH ${formatVnd(g.khDS)} = ${g.pct?.toFixed(0)}% (dự báo cuối tháng ${g.projPct?.toFixed(0)}%)` : ""}. Thầu ${formatVnd(g.thauNow)}. ${g.canGap} khách cần gặp, ${g.tonDong} tồn đọng.`);
    L.push("THEO NHÂN VIÊN:");
    for (const e of emps) {
      const hut = e.gaps.filter((x) => x.th < x.kh).map((x) => `${x.label} ${x.th}/${x.kh}`).join(", ");
      L.push(`- ${e.ten}: DS ${formatVnd(e.dsNow)}${e.khDS > 0 ? ` / KH ${formatVnd(e.khDS)} = ${e.pct?.toFixed(0)}% (dự báo ${e.projPct?.toFixed(0)}%)` : ""}; coverage ${e.covMet}/${e.covTotal}; ${hut ? `đang hụt: ${hut}; ` : ""}tồn đọng ${e.tonDong.length}.`);
    }
    L.push("");
    L.push("YÊU CẦU: Chỉ ra 3-5 việc ưu tiên nhất cho SS tuần này (ai cần làm việc riêng/đi cùng tuyến, chỉ tiêu nào toàn nhóm đang yếu), ngắn gọn, hành động cụ thể.");
    return L.join("\n");
  }
  async function phanTichAI() {
    setAiLoading(true); setAiError(""); setAiText("");
    try {
      const res = await fetch("/api/phan-tich-tuan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tomTat: buildTomTat(), linhVuc: "cung-tuyen" }),
      });
      const data = await res.json();
      if (!res.ok) setAiError(data?.error || "Lỗi phân tích."); else setAiText(data?.text || "");
    } catch (e) {
      setAiError(e instanceof Error ? e.message : String(e));
    } finally { setAiLoading(false); }
  }

  const noKpi = emps.every((e) => e.khDS === 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{title ?? "Quản lý đội nhóm"}</h1>
          <p className="text-xs text-slate-500">
            {onlyMa ? "Dữ liệu của tôi" : `Nhóm ${teamName}`} · lũy kế 01–{ctx.ngay}/{ctx.thang}/{ctx.nam} ({daysElapsed}/{daysInMonth} ngày) · so cùng kỳ {ctx.lastMonthLabel}
          </p>
        </div>
        <button onClick={phanTichAI} disabled={aiLoading} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60">
          {aiLoading ? "Đang phân tích…" : "🤖 Việc cần làm (AI)"}
        </button>
      </div>

      {salesError && <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">Doanh số: {salesError}</div>}

      {/* Ô số tổng quan */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3" style={{ borderTop: "3px solid #0b6e75" }}>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Tiến độ DS nhóm</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-semibold text-slate-900">{g.pct != null ? `${g.pct.toFixed(0)}%` : formatShortVnd(g.dsNow)}</span>
            {g.khDS > 0 && <span className="text-xs text-slate-400">{formatShortVnd(g.dsNow)}/{formatShortVnd(g.khDS)}</span>}
          </div>
          <p className="mt-0.5 text-xs text-slate-400">{g.projPct != null ? `dự báo cuối tháng ${g.projPct.toFixed(0)}%` : "chưa có chỉ tiêu"}</p>
        </div>
        <Tile label="Thầu nhóm" now={g.thauNow} prev={g.thauPrev} accent="#eda100" />
        <TileNum label="Khách cần gặp" value={g.canGap} sub="còn phải làm" accent="#2a78d6" />
        <TileNum label="Tồn đọng tuần trước" value={g.tonDong} sub="chưa xử lý" accent="#c0392b" />
      </div>

      {aiError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{aiError}</p>}
      {aiText && <div className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">{aiText}</div>}

      {noKpi && !onlyMa && (
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Chưa đọc được chỉ tiêu KPI tháng {ctx.thang} — phần tiến độ/dự báo cần file KPI tháng này được chia sẻ cho hệ thống.
        </div>
      )}

      {/* Cảnh báo cần xử lý ngay */}
      {!onlyMa && alerts.length > 0 && (
        <section className="rounded-2xl border border-red-200 bg-red-50/50 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">⚠ Cần xử lý ngay</h2>
          <ul className="mt-2 space-y-1.5">
            {alerts.slice(0, 8).map((a, i) => (
              <li key={i} className="flex gap-2 text-xs text-slate-700">
                <span>{a.icon}</span>
                <span>{a.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Xếp hạng tiến độ */}
      {!onlyMa && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">🏆 Xếp hạng tiến độ DS</h2>
          <p className="mt-0.5 text-xs text-slate-400">% hoàn thành chỉ tiêu doanh số tháng · kèm điểm KPI</p>
          <div className="mt-3 space-y-2">
            {ranked.map((e, i) => {
              const sm = STATUS_META[e.status];
              const w = Math.max(2, Math.min(100, e.pct ?? 0));
              return (
                <div key={e.ma} className="flex items-center gap-3">
                  <span className="w-5 text-right text-xs font-bold text-slate-400">{i + 1}</span>
                  <span className="w-28 truncate text-xs font-medium text-slate-700" title={e.ten}>{e.ten}</span>
                  <div className="relative h-5 flex-1 overflow-hidden rounded bg-slate-100">
                    <div className="absolute left-0 top-0 h-full rounded" style={{ width: `${w}%`, background: sm.color }} />
                    {e.khDS > 0 && <div className="absolute top-0 h-full w-[2px] bg-slate-400" style={{ left: "100%" }} />}
                  </div>
                  <span className="w-12 text-right text-xs font-semibold" style={{ color: sm.color }}>{e.pct != null ? `${e.pct.toFixed(0)}%` : "—"}</span>
                  <span className="hidden w-14 text-right text-[11px] text-slate-400 sm:inline">{e.diem != null ? `${e.diem}đ` : ""}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Sức khỏe từng nhân viên */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">🩺 Sức khỏe &amp; việc cần làm từng nhân viên</h2>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {ranked.map((e) => {
            const sm = STATUS_META[e.status];
            const dk = deltaMoney(e.kdNow, e.kdPrev);
            const hut = e.gaps.filter((x) => x.th < x.kh);
            const w = Math.max(2, Math.min(100, e.pct ?? 0));
            return (
              <div key={e.ma} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">{e.ten}</p>
                  <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
                </div>
                {/* Tiến độ DS */}
                <div className="mt-2">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-slate-500">DS {formatShortVnd(e.dsNow)}{e.khDS > 0 ? ` / ${formatShortVnd(e.khDS)}` : ""}</span>
                    <span className="font-semibold" style={{ color: sm.color }}>{e.pct != null ? `${e.pct.toFixed(0)}%` : "—"}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded bg-slate-100">
                    <div className="h-full rounded" style={{ width: `${w}%`, background: sm.color }} />
                  </div>
                  <div className="mt-1 flex justify-between text-[11px] text-slate-400">
                    <span>cùng kỳ <span className={dk.c}>{dk.s}</span></span>
                    <span>{e.projPct != null ? `dự báo ${e.projPct.toFixed(0)}%` : ""}</span>
                  </div>
                </div>
                {/* Coverage + chỉ tiêu hụt */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {e.covTotal > 0 && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">Gặp khách {e.covMet}/{e.covTotal}</span>
                  )}
                  {hut.length === 0 ? (
                    e.khDS > 0 && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-700">Chỉ tiêu KPI: ổn</span>
                  ) : (
                    hut.map((x, i) => (
                      <span key={i} className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-700">{x.label} {x.th}/{x.kh}</span>
                    ))
                  )}
                </div>
                {/* Khách cần gặp */}
                {e.canGap.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {e.canGap.slice(0, 3).map((k, i) => (
                      <li key={i} className="rounded-md bg-slate-50 px-2 py-1 text-[11px]">
                        <span className="font-medium text-slate-700">{k.tenKH}</span>
                        {k.tinh ? <span className="text-slate-400"> · {k.tinh}</span> : null}
                        {k.mucTieu ? <span className="block text-slate-500">🎯 {k.mucTieu}</span> : null}
                      </li>
                    ))}
                    {e.canGap.length > 3 && <li className="text-[11px] text-slate-400">… và {e.canGap.length - 3} khách khác</li>}
                  </ul>
                )}
                {e.tonDong.length > 0 && (
                  <p className="mt-2 rounded-md bg-red-50 px-2 py-1 text-[11px] text-red-700">
                    ⚠ Tồn đọng ({e.tonDong.length}): {e.tonDong.slice(0, 3).map((t) => t.tenKH).join(", ")}{e.tonDong.length > 3 ? "…" : ""}
                  </p>
                )}
                {e.canGap.length === 0 && e.tonDong.length === 0 && (
                  <p className="mt-2 text-[11px] text-emerald-600">✓ Đã gặp hết khách gợi ý · không tồn đọng</p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Tile({ label, now, prev, accent }: { label: string; now: number; prev: number; accent: string }) {
  const d = deltaMoney(now, prev);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3" style={{ borderTop: `3px solid ${accent}` }}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-lg font-semibold text-slate-900">{formatShortVnd(now)}</span>
        <span className={`text-xs font-medium ${d.c}`}>{d.s}</span>
      </div>
      <p className="mt-0.5 text-xs text-slate-400">cùng kỳ {formatShortVnd(prev)}</p>
    </div>
  );
}
function TileNum({ label, value, sub, accent }: { label: string; value: number; sub: string; accent: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3" style={{ borderTop: `3px solid ${accent}` }}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs text-slate-400">{sub}</p>
    </div>
  );
}
