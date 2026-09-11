"use client";

import { useMemo, useState } from "react";
import { allEmployees } from "@/lib/allowlist";
import { formatShortVnd, formatVnd } from "@/lib/format";
import { salesByRange, normalizeMaNV, type SaleTxnLite } from "@/lib/report-utils";
import type { EmployeeWeekSummary } from "@/lib/aggregate";
import type { TonDongTuanTruoc } from "@/lib/aggregate";

interface Ctx {
  nam: number;
  thang: number;
  ngay: number;
  monthStartMs: number;
  nowMs: number;
  lastMonthStartMs: number;
  lastMonthSameMs: number;
  lastMonthLabel: string; // "MM/yyyy"
}

const ACCENT = { kd: "#2a78d6", thau: "#eda100", viec: "#c0392b" };

function pctStr(v: number) {
  return `${v.toFixed(1)}%`;
}
function deltaMoney(cur: number, prev: number) {
  const d = cur - prev;
  if (prev === 0 && cur === 0) return { s: "—", c: "text-slate-400" };
  if (prev === 0) return { s: "mới", c: "text-emerald-600" };
  const p = (d / Math.abs(prev)) * 100;
  return d >= 0
    ? { s: `▲ +${p.toFixed(0)}%`, c: "text-emerald-600" }
    : { s: `▼ ${p.toFixed(0)}%`, c: "text-red-600" };
}

interface EmpRow {
  ma: string;
  ten: string;
  kdNow: number;
  kdPrev: number;
  thauNow: number;
  thauPrev: number;
  canGap: { tenKH: string; mucTieu: string; tinh: string }[]; // khách gợi ý chưa gặp
  soCanGap: number;
  tonDong: { maKH: string; tenKH: string }[]; // tồn đọng tuần trước
}

export default function DoiNhomView({
  teamName,
  salesTxns = [],
  salesError,
  summaries = [],
  tonDong,
  ctx,
  onlyMa,
  title,
}: {
  teamName: string;
  salesTxns?: SaleTxnLite[];
  salesError?: string | null;
  summaries?: EmployeeWeekSummary[];
  tonDong?: TonDongTuanTruoc | null;
  ctx: Ctx;
  /** Nếu có: chỉ hiển thị dữ liệu của 1 nhân viên (nhân viên tự xem). */
  onlyMa?: string;
  /** Tiêu đề tuỳ biến (mặc định "Quản lý đội nhóm"). */
  title?: string;
}) {
  const emps = useMemo<EmpRow[]>(() => {
    const kdNow = salesByRange(salesTxns, ctx.monthStartMs, ctx.nowMs, "keDon");
    const kdPrev = salesByRange(salesTxns, ctx.lastMonthStartMs, ctx.lastMonthSameMs, "keDon");
    const thauNow = salesByRange(salesTxns, ctx.monthStartMs, ctx.nowMs, "thau");
    const thauPrev = salesByRange(salesTxns, ctx.lastMonthStartMs, ctx.lastMonthSameMs, "thau");

    const sumByMa = new Map<string, EmployeeWeekSummary>();
    for (const s of summaries) sumByMa.set(normalizeMaNV(s.maNhanVien), s);
    const tonByMa = new Map<string, { maKH: string; tenKH: string }[]>();
    if (tonDong) for (const t of tonDong.perEmp) tonByMa.set(normalizeMaNV(t.maNhanVien), t.khachChuaXuLy);

    const onlyMaN = onlyMa ? normalizeMaNV(onlyMa) : null;
    return allEmployees().filter((e) => !onlyMaN || normalizeMaNV(e.maNhanVien) === onlyMaN).map((e) => {
      const ma = normalizeMaNV(e.maNhanVien);
      const sm = sumByMa.get(ma);
      const canGap = (sm?.khachGoiY ?? [])
        .filter((k) => k.trangThai !== "Đồng ý")
        .map((k) => ({ tenKH: k.tenKH, mucTieu: k.mucTieu, tinh: k.tinh }));
      return {
        ma,
        ten: e.hoTen,
        kdNow: kdNow[ma] ?? 0,
        kdPrev: kdPrev[ma] ?? 0,
        thauNow: thauNow[ma] ?? 0,
        thauPrev: thauPrev[ma] ?? 0,
        canGap,
        soCanGap: canGap.length,
        tonDong: tonByMa.get(ma) ?? [],
      };
    });
  }, [salesTxns, summaries, tonDong, ctx, onlyMa]);

  const g = useMemo(() => {
    const s = (f: (e: EmpRow) => number) => emps.reduce((a, e) => a + f(e), 0);
    return {
      kdNow: s((e) => e.kdNow),
      kdPrev: s((e) => e.kdPrev),
      thauNow: s((e) => e.thauNow),
      thauPrev: s((e) => e.thauPrev),
      canGap: s((e) => e.soCanGap),
      tonDong: s((e) => e.tonDong.length),
    };
  }, [emps]);

  // ---- AI ----
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiError, setAiError] = useState("");
  function buildTomTat(): string {
    const L: string[] = [];
    L.push(`Nhóm ${teamName} — quản lý đội nhóm, số liệu lũy kế 01–${ctx.ngay}/${ctx.thang}/${ctx.nam}, so cùng kỳ tháng ${ctx.lastMonthLabel} (01–${ctx.ngay}).`);
    L.push(`TỔNG NHÓM: KĐ ${formatVnd(g.kdNow)} (cùng kỳ ${formatVnd(g.kdPrev)}); Thầu ${formatVnd(g.thauNow)} (cùng kỳ ${formatVnd(g.thauPrev)}). Việc cần làm: ${g.canGap} khách cần gặp, ${g.tonDong} khách tồn đọng tuần trước.`);
    L.push("THEO NHÂN VIÊN:");
    for (const e of emps) {
      L.push(`- ${e.ten}: KĐ ${formatVnd(e.kdNow)} (cùng kỳ ${formatVnd(e.kdPrev)}), Thầu ${formatVnd(e.thauNow)} (cùng kỳ ${formatVnd(e.thauPrev)}); còn ${e.soCanGap} khách cần gặp, ${e.tonDong.length} khách tồn đọng.`);
    }
    L.push("");
    L.push("YÊU CẦU: nhận xét đội (ai tăng/giảm mạnh so cùng kỳ, ai nhiều việc tồn đọng) và đề xuất VIỆC CẦN LÀM ưu tiên cho hôm nay & tuần tới cho từng nhân viên trọng điểm.");
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{title ?? "Quản lý đội nhóm"}</h1>
          <p className="text-xs text-slate-500">
            {onlyMa ? "Dữ liệu của tôi" : `Nhóm ${teamName}`} · lũy kế 01–{ctx.ngay}/{ctx.thang}/{ctx.nam} · so cùng kỳ tháng {ctx.lastMonthLabel}
          </p>
        </div>
        <button
          onClick={phanTichAI}
          disabled={aiLoading}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {aiLoading ? "Đang phân tích…" : "🤖 Phân tích AI (Gemini)"}
        </button>
      </div>

      {salesError && <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">Doanh số: {salesError}</div>}

      {/* Tổng quan so cùng kỳ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="KĐ nhóm" now={g.kdNow} prev={g.kdPrev} accent={ACCENT.kd} />
        <Tile label="Thầu nhóm" now={g.thauNow} prev={g.thauPrev} accent={ACCENT.thau} />
        <TileNum label="Khách cần gặp" value={g.canGap} sub="còn phải làm" accent={ACCENT.viec} />
        <TileNum label="Tồn đọng tuần trước" value={g.tonDong} sub="chưa xử lý" accent={ACCENT.viec} />
      </div>

      {aiError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{aiError}</p>}
      {aiText && <div className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">{aiText}</div>}

      {/* So sánh cùng kỳ theo nhân viên */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">📊 Kết quả so cùng kỳ tháng trước</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-2">Nhân viên</th>
                <th className="py-2 pr-2 text-right">KĐ tháng này</th>
                <th className="py-2 pr-2 text-right">Cùng kỳ</th>
                <th className="py-2 pr-2 text-right">±</th>
                <th className="py-2 pr-2 text-right">Thầu tháng này</th>
                <th className="py-2 pr-2 text-right">Cùng kỳ</th>
                <th className="py-2 text-right">±</th>
              </tr>
            </thead>
            <tbody>
              {emps.map((e) => {
                const dk = deltaMoney(e.kdNow, e.kdPrev);
                const dt = deltaMoney(e.thauNow, e.thauPrev);
                return (
                  <tr key={e.ma} className="border-b border-slate-100">
                    <td className="py-2 pr-2 font-medium text-slate-800">{e.ten}</td>
                    <td className="py-2 pr-2 text-right text-slate-800">{formatShortVnd(e.kdNow)}</td>
                    <td className="py-2 pr-2 text-right text-slate-400">{formatShortVnd(e.kdPrev)}</td>
                    <td className={`py-2 pr-2 text-right font-medium ${dk.c}`}>{dk.s}</td>
                    <td className="py-2 pr-2 text-right text-slate-800">{formatShortVnd(e.thauNow)}</td>
                    <td className="py-2 pr-2 text-right text-slate-400">{formatShortVnd(e.thauPrev)}</td>
                    <td className={`py-2 text-right font-medium ${dt.c}`}>{dt.s}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Việc cần làm */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">✅ Việc cần làm — hôm nay &amp; tuần này</h2>
        <p className="mt-0.5 text-xs text-slate-400">Khách gợi ý chưa gặp (cần gặp) &amp; khách tồn đọng từ tuần trước (nên xử lý trước).</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {emps.map((e) => (
            <div key={e.ma} className="rounded-xl border border-slate-100 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">{e.ten}</p>
                <span className="text-xs text-slate-500">{e.soCanGap} cần gặp · {e.tonDong.length} tồn đọng</span>
              </div>
              {e.canGap.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {e.canGap.slice(0, 5).map((k, i) => (
                    <li key={i} className="rounded-md bg-slate-50 px-2 py-1.5 text-xs">
                      <span className="font-medium text-slate-700">{k.tenKH}</span>
                      {k.tinh ? <span className="text-slate-400"> · {k.tinh}</span> : null}
                      {k.mucTieu ? <span className="block text-slate-500">🎯 {k.mucTieu}</span> : null}
                    </li>
                  ))}
                  {e.canGap.length > 5 && <li className="text-[11px] text-slate-400">… và {e.canGap.length - 5} khách khác</li>}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-emerald-600">✓ Đã gặp hết khách gợi ý tuần này</p>
              )}
              {e.tonDong.length > 0 && (
                <p className="mt-2 rounded-md bg-red-50 px-2 py-1.5 text-[11px] text-red-700">
                  ⚠ Tồn đọng tuần trước ({e.tonDong.length}): {e.tonDong.slice(0, 3).map((t) => t.tenKH).join(", ")}{e.tonDong.length > 3 ? "…" : ""}
                </p>
              )}
            </div>
          ))}
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
