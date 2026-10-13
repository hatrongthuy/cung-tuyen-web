"use client";

import { useMemo, useState } from "react";
import { formatShortVnd } from "@/lib/format";
import type {
  ProductGrowthResult,
  GrowRow,
  GrowScope,
  GrowTotals,
  QuarterWindow,
} from "@/lib/product-growth";
import { normalizeMaNV } from "@/lib/report-utils";

const C = { tt: "#2a78d6", c2: "#6d5ae6", green: "#1baf7a", amber: "#eda100", red: "#e34948" };

function nfSL(n: number): string {
  return Math.round(n).toLocaleString("vi-VN");
}
function pctOf(part: number, whole: number): number {
  return whole > 0 ? (part / whole) * 100 : 0;
}

type Tone = "green" | "amber" | "red" | "blue";
interface Verdict {
  tone: Tone;
  label: string;
  advice: string;
}

function verdictOf(row: GrowRow, q: QuarterWindow): Verdict {
  const { prev, now, forecast, target } = row;
  const remainingDays = Math.max(0, q.daysTotal - q.daysElapsed);
  const gapDt = target.dt - forecast.dt; // thiếu hụt dự báo so chỉ tiêu
  const canThemTongDt = Math.max(0, target.dt - now.dt); // còn cần bán thêm để chạm chỉ tiêu
  const perDay = remainingDays > 0 ? canThemTongDt / remainingDays : 0;

  // Insight giá/sản lượng.
  const slOk = forecast.sl >= target.sl;
  const dtOk = forecast.dt >= target.dt;
  let priceNote = "";
  if (!dtOk && slOk) priceNote = " Sản lượng bám chỉ tiêu nhưng doanh thu hụt — giá/cơ cấu giảm.";
  else if (dtOk && !slOk) priceNote = " Doanh thu đạt nhờ giá tăng dù sản lượng còn thiếu — cần giữ/đẩy sản lượng.";

  if (prev.dt === 0 && prev.sl === 0) {
    return { tone: "blue", label: "SP mới (chưa có nền quý trước)", advice: "Chưa có doanh số quý trước để so — theo dõi để lập nền tăng trưởng." };
  }
  if (dtOk) {
    return { tone: "green", label: "Trên đà đạt +10%", advice: `Dự báo ${formatShortVnd(forecast.dt)} ≥ chỉ tiêu ${formatShortVnd(target.dt)}. Giữ nhịp hiện tại.${priceNote}` };
  }
  if (forecast.dt >= prev.dt) {
    return {
      tone: "amber",
      label: "Có tăng nhưng chưa đủ 10%",
      advice:
        `Dự báo ${formatShortVnd(forecast.dt)} (chỉ tiêu ${formatShortVnd(target.dt)}). ` +
        `Cần thêm ~${formatShortVnd(canThemTongDt)} trong ${remainingDays} ngày còn lại (~${formatShortVnd(perDay)}/ngày).${priceNote}`,
    };
  }
  return {
    tone: "red",
    label: "Đang giảm so quý trước",
    advice:
      `Dự báo ${formatShortVnd(forecast.dt)} < quý trước ${formatShortVnd(prev.dt)}. ` +
      `Cần can thiệp gấp: thêm ~${formatShortVnd(canThemTongDt)} trong ${remainingDays} ngày (~${formatShortVnd(perDay)}/ngày).${priceNote}`,
  };
}

function toneCls(t: Tone): string {
  return t === "green"
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : t === "amber"
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : t === "red"
    ? "bg-red-50 text-red-700 border-red-200"
    : "bg-blue-50 text-blue-700 border-blue-200";
}

/** Ô hiển thị 1 cặp (DT lớn + SL nhỏ). */
function Cell({ dt, sl, bold }: { dt: number; sl: number; bold?: boolean }) {
  return (
    <div className="leading-tight">
      <div className={bold ? "font-bold text-slate-900" : "font-medium text-slate-800"}>{formatShortVnd(dt)}</div>
      <div className="text-[11px] text-slate-400">{nfSL(sl)} SL</div>
    </div>
  );
}

function PctCell({ forecast, target }: { forecast: { sl: number; dt: number }; target: { sl: number; dt: number } }) {
  const dtP = pctOf(forecast.dt, target.dt);
  const slP = pctOf(forecast.sl, target.sl);
  const col = (v: number) => (v >= 100 ? "text-emerald-600" : v >= 90 ? "text-amber-600" : "text-red-600");
  return (
    <div className="leading-tight">
      <div className={`font-bold ${col(dtP)}`}>{target.dt > 0 ? `${dtP.toFixed(0)}%` : "—"}</div>
      <div className={`text-[11px] ${col(slP)}`}>{target.sl > 0 ? `${slP.toFixed(0)}% SL` : "—"}</div>
    </div>
  );
}

function GrowthTable({
  title,
  accent,
  rows,
  total,
  quarter,
  emptyMsg,
}: {
  title: string;
  accent: string;
  rows: GrowRow[];
  total: GrowTotals;
  quarter: QuarterWindow;
  emptyMsg: string;
}) {
  const fcLabel = quarter.isComplete ? "Cả quý" : "Dự báo cả quý";
  const totalVerdict = useMemo<Verdict>(
    () => verdictOf({ label: "TỔNG", loai: "trongTam", gam: "", ...total } as GrowRow, quarter),
    [total, quarter]
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">{emptyMsg}</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-3 font-medium">Sản phẩm</th>
                <th className="py-2 pr-3 text-right font-medium">Quý trước</th>
                <th className="py-2 pr-3 text-right font-medium">Chỉ tiêu (+10%)</th>
                <th className="py-2 pr-3 text-right font-medium">Lũy kế tới nay</th>
                <th className="py-2 pr-3 text-right font-medium">{fcLabel}</th>
                <th className="py-2 pr-3 text-right font-medium">% đạt (DT·SL)</th>
                <th className="py-2 pr-3 font-medium">Nhận định &amp; điều chỉnh</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const v = verdictOf(r, quarter);
                return (
                  <tr key={r.label} className="border-b border-slate-100 align-top">
                    <td className="py-2 pr-3">
                      <div className="font-semibold text-slate-900">{r.label}</div>
                      {r.gam && <div className="text-[11px] text-slate-400">{r.gam}</div>}
                    </td>
                    <td className="py-2 pr-3 text-right"><Cell dt={r.prev.dt} sl={r.prev.sl} /></td>
                    <td className="py-2 pr-3 text-right"><Cell dt={r.target.dt} sl={r.target.sl} /></td>
                    <td className="py-2 pr-3 text-right"><Cell dt={r.now.dt} sl={r.now.sl} /></td>
                    <td className="py-2 pr-3 text-right"><Cell dt={r.forecast.dt} sl={r.forecast.sl} bold /></td>
                    <td className="py-2 pr-3 text-right"><PctCell forecast={r.forecast} target={r.target} /></td>
                    <td className="py-2 pr-3">
                      <span className={`inline-block rounded border px-1.5 py-0.5 text-[11px] font-semibold ${toneCls(v.tone)}`}>{v.label}</span>
                      <p className="mt-1 text-[11px] leading-snug text-slate-600">{v.advice}</p>
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-slate-300 bg-slate-50/60 align-top font-semibold">
                <td className="py-2 pr-3 text-slate-900">TỔNG {title.toLowerCase().includes("trọng tâm") ? "trọng tâm" : "cấp 2"}</td>
                <td className="py-2 pr-3 text-right"><Cell dt={total.prev.dt} sl={total.prev.sl} /></td>
                <td className="py-2 pr-3 text-right"><Cell dt={total.target.dt} sl={total.target.sl} /></td>
                <td className="py-2 pr-3 text-right"><Cell dt={total.now.dt} sl={total.now.sl} /></td>
                <td className="py-2 pr-3 text-right"><Cell dt={total.forecast.dt} sl={total.forecast.sl} bold /></td>
                <td className="py-2 pr-3 text-right"><PctCell forecast={total.forecast} target={total.target} /></td>
                <td className="py-2 pr-3">
                  <span className={`inline-block rounded border px-1.5 py-0.5 text-[11px] font-semibold ${toneCls(totalVerdict.tone)}`}>{totalVerdict.label}</span>
                  <p className="mt-1 text-[11px] leading-snug text-slate-600">{totalVerdict.advice}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ScopeBlock({ scope, quarter, idPrefix }: { scope: GrowScope; quarter: QuarterWindow; idPrefix: string }) {
  return (
    <div className="space-y-4">
      <GrowthTable
        key={`${idPrefix}-tt`}
        title="Sản phẩm trọng tâm"
        accent={C.tt}
        rows={scope.rowsTT}
        total={scope.totalTT}
        quarter={quarter}
        emptyMsg="Chưa có doanh số SP trọng tâm trong kỳ."
      />
      <GrowthTable
        key={`${idPrefix}-c2`}
        title="Sản phẩm cấp 2"
        accent={C.c2}
        rows={scope.rowsC2}
        total={scope.totalC2}
        quarter={quarter}
        emptyMsg="Chưa có doanh số SP cấp 2 trong kỳ."
      />
    </div>
  );
}

export default function TangTruongSanPhamView({
  teamName,
  result,
  onlyMa,
  title,
}: {
  teamName: string;
  result: ProductGrowthResult;
  onlyMa?: string;
  title?: string;
}) {
  const { quarter, team, byTdv, error } = result;
  const onlyMaN = onlyMa ? normalizeMaNV(onlyMa) : null;
  const tdvList = onlyMaN ? byTdv.filter((t) => normalizeMaNV(t.ma) === onlyMaN) : byTdv;
  const [moNV, setMoNV] = useState<Record<number, boolean>>({});

  const fcPct = Math.round(quarter.fraction * 100);
  const remainingDays = Math.max(0, quarter.daysTotal - quarter.daysElapsed);

  return (
    <div className="space-y-5">
      <div className="no-print flex justify-end">
        <button
          onClick={() => window.print()}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          🖨️ In / Lưu PDF
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
          {title ?? "Báo cáo tăng trưởng sản phẩm"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Nhóm {teamName} · Chỉ tiêu <b>+10%</b> so quý trước cho từng sản phẩm và tổng mỗi loại.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-blue-600 px-3 py-1 font-semibold text-white">{quarter.label}</span>
          <span className="text-slate-400">so với</span>
          <span className="rounded-full bg-slate-200 px-3 py-1 font-semibold text-slate-700">{quarter.prevLabel}</span>
          {!quarter.isComplete ? (
            <span className="rounded-lg bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
              Đã qua {quarter.daysElapsed}/{quarter.daysTotal} ngày ({fcPct}%) · còn {remainingDays} ngày — số “dự báo” suy từ nhịp hiện tại
            </span>
          ) : (
            <span className="rounded-lg bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">Quý đã đủ ngày — số liệu là thực tế cả quý</span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          Không đọc được dữ liệu Sale: {error}
        </div>
      )}

      {!onlyMaN && (
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <span>👥</span> Toàn nhóm
          </h2>
          <ScopeBlock scope={team} quarter={quarter} idPrefix="team" />
        </section>
      )}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <span>🧑‍💼</span> {onlyMaN ? "Tiến độ của tôi" : "Theo từng TDV"}
        </h2>
        {tdvList.length === 0 ? (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">Chưa có dữ liệu sản phẩm cho nhân viên.</p>
        ) : onlyMaN ? (
          tdvList.map((t) => <ScopeBlock key={t.tid} scope={t.scope} quarter={quarter} idPrefix={`nv-${t.tid}`} />)
        ) : (
          tdvList.map((t) => {
            const open = moNV[t.tid] ?? false;
            const slTotNow = t.scope.totalTT.now.dt + t.scope.totalC2.now.dt;
            const slTotFc = t.scope.totalTT.forecast.dt + t.scope.totalC2.forecast.dt;
            const slTotTarget = t.scope.totalTT.target.dt + t.scope.totalC2.target.dt;
            const p = pctOf(slTotFc, slTotTarget);
            const col = p >= 100 ? "text-emerald-600" : p >= 90 ? "text-amber-600" : "text-red-600";
            return (
              <div key={t.tid} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <button
                  onClick={() => setMoNV((s) => ({ ...s, [t.tid]: !open }))}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{t.ten}</span>
                    {t.gam && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">{t.gam}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">
                      Dự báo <b className="text-slate-800">{formatShortVnd(slTotFc)}</b> / CT {formatShortVnd(slTotTarget)}
                      {" "}<b className={col}>({slTotTarget > 0 ? `${p.toFixed(0)}%` : "—"})</b>
                    </span>
                    <span className="text-slate-400">{open ? "▲" : "▼"}</span>
                  </div>
                </button>
                {open && (
                  <div className="border-t border-slate-100 p-4">
                    <ScopeBlock scope={t.scope} quarter={quarter} idPrefix={`nv-${t.tid}`} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>

      <p className="text-center text-xs text-slate-400">
        Nguồn: file Sale (cập nhật hằng ngày) · DT = doanh thu, SL = sản lượng · “Dự báo cả quý” suy từ nhịp bán hiện tại.
      </p>
    </div>
  );
}
