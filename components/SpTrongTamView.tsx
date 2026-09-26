"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { formatShortVnd, formatVnd } from "@/lib/format";
import type { SpttResult, SpttProduct, SpttRange } from "@/lib/sale-detail";

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
  range,
  mine,
}: {
  teamName: string;
  sptt: SpttResult;
  range: SpttRange;
  mine?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiError, setAiError] = useState("");

  function apply(tu: string, den: string) {
    // đảm bảo tu <= den (nếu người dùng chọn ngược thì tự đảo)
    const a = tu <= den ? tu : den;
    const b = tu <= den ? den : tu;
    router.push(`${pathname}?tu=${a}&den=${b}`);
  }

  function buildTomTat(): string {
    const L: string[] = [];
    L.push(`Nhóm ${teamName} — triển khai SẢN PHẨM TRỌNG TÂM, ${range.rangeLabel}, so ${range.prevLabel}.`);
    const t = sptt.tong;
    L.push(`TỔNG SP TRỌNG TÂM: doanh thu ${formatVnd(t.now.dt)} (kỳ trước ${formatVnd(t.prev.dt)}), sản lượng ${nf(t.now.sl)} (kỳ trước ${nf(t.prev.sl)}), điểm bán ${t.now.diemBan} (kỳ trước ${t.prev.diemBan}).`);
    L.push("THEO SẢN PHẨM:");
    for (const p of sptt.products) {
      L.push(`- ${p.label}: DT ${formatVnd(p.now.dt)} (kỳ trước ${formatVnd(p.prev.dt)}), SL ${nf(p.now.sl)} (kỳ trước ${nf(p.prev.sl)}), điểm bán ${p.now.diemBan}. NV bán tốt: ${p.byNv.slice(0, 3).map((n) => `${n.ten} (${nf(n.sl)} SL, ${n.diemBan} điểm)`).join("; ") || "chưa có"}.`);
    }
    L.push("");
    L.push("YÊU CẦU: nhận xét SP trọng tâm nào tăng/giảm mạnh so kỳ trước, SP nào cần đẩy điểm bán/mở mới, và đề xuất hành động cụ thể cho nhóm.");
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
            {mine ? "Dữ liệu của tôi" : `Nhóm ${teamName}`} · {range.rangeLabel} · so {range.prevLabel}
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

      {/* Bộ chọn tháng / khoảng tháng */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
        <span className="text-xs font-medium text-slate-600">Xem theo:</span>
        <label className="flex items-center gap-1 text-xs text-slate-500">
          Từ tháng
          <select
            value={range.tu}
            onChange={(e) => apply(e.target.value, range.den < e.target.value ? e.target.value : range.den)}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
          >
            {range.availableMonths.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1 text-xs text-slate-500">
          Đến tháng
          <select
            value={range.den}
            onChange={(e) => apply(range.tu > e.target.value ? e.target.value : range.tu, e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
          >
            {range.availableMonths.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
        </label>
        <button
          onClick={() => router.push(pathname)}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
        >
          Tháng hiện tại
        </button>
        <span className="ml-auto text-[11px] text-slate-400">Chọn cùng 1 tháng ở 2 ô để xem đúng 1 tháng.</span>
      </div>

      {sptt.error && <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">{sptt.error}</div>}

      {/* Tổng quan */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <BigTile label="Doanh thu SP trọng tâm" now={formatShortVnd(t.now.dt)} d={delta(t.now.dt, t.prev.dt)} sub={`kỳ trước ${formatShortVnd(t.prev.dt)}`} accent={ACCENT[0]} />
        <BigTile label="Sản lượng" now={nf(t.now.sl)} d={delta(t.now.sl, t.prev.sl)} sub={`kỳ trước ${nf(t.prev.sl)}`} accent={ACCENT[2]} />
        <BigTile label="Số điểm bán" now={String(t.now.diemBan)} d={delta(t.now.diemBan, t.prev.diemBan)} sub={`kỳ trước ${t.prev.diemBan}`} accent={ACCENT[1]} />
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
      <p className="mt-0.5 text-[10px] text-slate-400">kỳ trước {fmt(prev)}</p>
    </div>
  );
}

function ProductCard({ p, accent }: { p: SpttProduct; accent: string }) {
  const [showKhach, setShowKhach] = useState(false);
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

      {/* Danh sách khách hàng */}
      {p.custs.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-2">
          <button
            onClick={() => setShowKhach((v) => !v)}
            className="flex w-full items-center justify-between text-[11px] font-medium text-indigo-600 hover:text-indigo-700"
          >
            <span>{showKhach ? "▾ Ẩn" : "▸ Xem"} khách hàng ({p.custs.length})</span>
            <span className="text-slate-400">tổng {nf(p.now.sl)} SL</span>
          </button>
          {showKhach && (
            <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto pr-1">
              {p.custs.map((c, idx) => (
                <li key={idx} className="flex items-start justify-between gap-2 rounded-md bg-slate-50 px-2 py-1 text-xs">
                  <span className="min-w-0">
                    <span className="font-medium text-slate-700">{c.ten}</span>
                    {c.tinh && <span className="text-slate-400"> · {c.tinh}</span>}
                  </span>
                  <span className="flex-none text-right text-slate-500">
                    <span className="font-semibold text-slate-700">{nf(c.sl)}</span> SL · {formatShortVnd(c.dt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
