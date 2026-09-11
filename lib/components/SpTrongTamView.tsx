"use client";

import { useState } from "react";
import { formatShortVnd, formatVnd } from "@/lib/format";
import type { SpttResult, SpttProduct } from "@/lib/sale-detail";

function nf(n: number) {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n));
}
function delta(cur: number, prev: number) {
  if (prev === 0 && cur === 0) return { s: "—", c: "text-slate-400" };
  if (prev === 0) return { s: "mới", c: "text-emerald-600" };
  const p = ((cur - prev) / Math.abs(prev)) * 100;
  return cur >= prev
    ? { s: `▲ +${p.toFixed(0)}%`, c: "text-emerald-600" }
    : { s: `▼ ${p.toFixed(0)}%`, c: "text-red-600" };
}

const ACCENT = ["#2a78d6", "#eb6834", "#1baf7a", "#c98a00", "#d1568a"];

export default function SpTrongTamView({
  teamName,
  sptt,
  ngay,
  thang,
  nam,
  lastMonthLabel,
  mine,
}: {
  teamName: string;
  sptt: SpttResult;
  ngay: number;
  thang: number;
  nam: number;
  lastMonthLabel: string;
  mine?: boolean;
}) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiError, setAiError] = useState("");

  function buildTomTat(): string {
    const L: string[] = [];
    L.push(`Nhóm ${teamName} — triển khai SẢN PHẨM TRỌNG TÂM, lũy kế 01–${ngay}/${thang}/${nam}, so cùng kỳ tháng ${lastMonthLabel}.`);
    const t = sptt.tong;
    L.push(`TỔNG SP TRỌNG TÂM: doanh thu ${formatVnd(t.now.dt)} (cùng kỳ ${formatVnd(t.prev.dt)}), sản lượng ${nf(t.now.sl)} (cùng kỳ ${nf(t.prev.sl)}), điểm bán ${t.now.diemBan} (cùng kỳ ${t.prev.diemBan}).`);
    L.push("THEO SẢN PHẨM:");
    for (const p of sptt.products) {
      L.push(`- ${p.label}: DT ${formatVnd(p.now.dt)} (cùng kỳ ${formatVnd(p.prev.dt)}), SL ${nf(p.now.sl)} (cùng kỳ ${nf(p.prev.sl)}), điểm bán ${p.now.diemBan} (cùng kỳ ${p.prev.diemBan}). NV bán tốt: ${p.byNv.slice(0, 3).map((n) => `${n.ten} (${nf(n.sl)} SL, ${n.diemBan} điểm)`).join("; ") || "chưa có"}.`);
    }
    L.push("");
    L.push("YÊU CẦU: nhận xét SP trọng tâm nào tăng/giảm mạnh so cùng kỳ, SP nào cần đẩy điểm bán/mở mới, và đề xuất hành động cụ thể cho nhóm.");
    return L.join("\n");
  }
  async function phanTichAI() {
    setAiLoading(true); setAiError(""); setAiText("");
    try {
      const res = await fetch("/api/phan-tich-tuan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tomTat: buildTomTat(), linhVuc: "sptt" }),
      });
      const data = await res.json();
      if (!res.ok) setAiError(data?.error || "Lỗi phân tích."); else setAiText(data?.text || "");
    } catch (e) {
      setAiError(e instanceof Error ? e.message : String(e));
    } finally { setAiLoading(false); }
  }

  const t = sptt.tong;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Triển khai sản phẩm trọng tâm</h1>
          <p className="text-xs text-slate-500">
            {mine ? "Dữ liệu của tôi" : `Nhóm ${teamName}`} · lũy kế 01–{ngay}/{thang}/{nam} · so cùng kỳ tháng {lastMonthLabel}
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

      {sptt.error && <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">{sptt.error}</div>}

      {/* Tổng quan */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <BigTile label="Doanh thu SP trọng tâm" now={formatShortVnd(t.now.dt)} d={delta(t.now.dt, t.prev.dt)} sub={`cùng kỳ ${formatShortVnd(t.prev.dt)}`} accent={ACCENT[0]} />
        <BigTile label="Sản lượng" now={nf(t.now.sl)} d={delta(t.now.sl, t.prev.sl)} sub={`cùng kỳ ${nf(t.prev.sl)}`} accent={ACCENT[2]} />
        <BigTile label="Số điểm bán" now={String(t.now.diemBan)} d={delta(t.now.diemBan, t.prev.diemBan)} sub={`cùng kỳ ${t.prev.diemBan}`} accent={ACCENT[1]} />
      </div>

      {aiError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{aiError}</p>}
      {aiText && <div className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">{aiText}</div>}

      {/* Từng sản phẩm trọng tâm */}
      <div className="grid gap-4 lg:grid-cols-2">
        {sptt.products.map((p, i) => (
          <ProductCard key={p.label} p={p} accent={ACCENT[i % ACCENT.length]} />
        ))}
      </div>
    </div>
  );
}

function BigTile({ label, now, d, sub, accent }: { label: string; now: string; d: { s: string; c: string }; sub: string; accent: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" style={{ borderTop: `3px solid ${accent}` }}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-slate-900">{now}</span>
        <span className={`text-xs font-medium ${d.c}`}>{d.s}</span>
      </div>
      <p className="mt-0.5 text-xs text-slate-400">{sub}</p>
    </div>
  );
}

function Metric({ label, now, prev, isMoney }: { label: string; now: number; prev: number; isMoney?: boolean }) {
  const d = delta(now, prev);
  const fmt = (n: number) => (isMoney ? formatShortVnd(n) : nf(n));
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900">{fmt(now)}</p>
      <p className={`text-[10px] font-medium ${d.c}`}>{d.s}</p>
      <p className="mt-0.5 text-[10px] text-slate-400">cùng kỳ {fmt(prev)}</p>
    </div>
  );
}

function ProductCard({ p, accent }: { p: SpttProduct; accent: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: accent }} />
        <h3 className="text-sm font-semibold text-slate-900">⭐ {p.label}</h3>
      </div>
      {p.prodNames.length > 0 && (
        <p className="mt-0.5 truncate text-[11px] text-slate-400">{p.prodNames.join(", ")}</p>
      )}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Metric label="Doanh thu" now={p.now.dt} prev={p.prev.dt} isMoney />
        <Metric label="Sản lượng" now={p.now.sl} prev={p.prev.sl} />
        <Metric label="Điểm bán" now={p.now.diemBan} prev={p.prev.diemBan} />
      </div>
      <div className="mt-3">
        <p className="text-[11px] font-medium text-slate-500">Theo nhân viên (kỳ này)</p>
        {p.byNv.length > 0 ? (
          <ul className="mt-1 space-y-1">
            {p.byNv.map((n) => (
              <li key={n.ten} className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1 text-xs">
                <span className="font-medium text-slate-700">{n.ten}</span>
                <span className="text-slate-500">{nf(n.sl)} SL · {n.diemBan} điểm · {formatShortVnd(n.dt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-xs text-slate-400">Chưa có điểm bán kỳ này.</p>
        )}
      </div>
    </div>
  );
}
