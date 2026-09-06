"use client";

import { useMemo, useState } from "react";
import { formatShortVnd, formatVnd } from "@/lib/format";
import type { ThauBenhVien, ThauNhomStat, ThauTongQuan } from "@/lib/thau-data";

function pctStr(v: number | null) {
  return v === null ? "—" : `${(v * 100).toFixed(1)}%`;
}

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.min(100, Math.max(0, value * 100))}%`, backgroundColor: color }}
      />
    </div>
  );
}

const ACCENT = { sl: "#2a78d6", luy: "#1baf7a", conlai: "#eda100", cham: "#e34948" };

export default function ThauProgressView({
  tongQuan,
  nhomStats,
  benhViens,
  ngayLabel,
}: {
  tongQuan: ThauTongQuan;
  nhomStats: ThauNhomStat[];
  benhViens: ThauBenhVien[];
  ngayLabel: string;
}) {
  const cham = useMemo(
    () => benhViens.filter((b) => b.chamTre).sort((a, b) => (b.dsYeuCau - b.doanhSo2026) - (a.dsYeuCau - a.doanhSo2026)),
    [benhViens]
  );
  const [xemTatCa, setXemTatCa] = useState(false);
  const dsHienThi = xemTatCa ? benhViens : benhViens.slice(0, 20);

  // ---- AI ----
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiError, setAiError] = useState("");

  function buildTomTat(): string {
    const L: string[] = [];
    L.push(`Tiến độ thầu tính đến ${ngayLabel}.`);
    L.push(
      `TỔNG QUAN: ${tongQuan.soBenhVien} bệnh viện, ${tongQuan.soCham} bệnh viện thầu chậm. ` +
        `SL thực hiện ${pctStr(tongQuan.tyLeSL)} (${Math.round(tongQuan.slThucHien).toLocaleString("vi-VN")}/${Math.round(tongQuan.slKeHoach).toLocaleString("vi-VN")}). ` +
        `Lũy tiến DS ${pctStr(tongQuan.tyLeLuyTien)} (${formatVnd(tongQuan.doanhSo2026)}/${formatVnd(tongQuan.dsYeuCau)} yêu cầu). ` +
        `Doanh số còn lại ${formatVnd(tongQuan.doanhSoConLai)}.`
    );
    L.push("THEO NHÓM PHỤ TRÁCH:");
    for (const n of nhomStats) {
      L.push(
        `- ${n.nhom}: ${n.soBenhVien} BV (chậm ${n.soCham}), SL ${pctStr(n.tyLeSL)}, lũy tiến ${pctStr(n.tyLeLuyTien)}, DS còn lại ${formatShortVnd(n.doanhSoConLai)}.`
      );
    }
    if (cham.length) {
      L.push("BỆNH VIỆN THẦU CHẬM (thiếu so với yêu cầu):");
      for (const b of cham.slice(0, 15)) {
        L.push(
          `- ${b.tenKhach} (${b.tinh}${b.nhomPhuTrach ? `, ${b.nhomPhuTrach}` : ""}): lũy tiến ${pctStr(b.tyLeLuyTien)}, còn thiếu ${formatShortVnd(Math.max(0, b.dsYeuCau - b.doanhSo2026))}, DS còn lại ${formatShortVnd(b.doanhSoConLai)}.`
        );
      }
    }
    return L.join("\n");
  }

  async function phanTichAI() {
    setAiLoading(true);
    setAiError("");
    setAiText("");
    try {
      const res = await fetch("/api/phan-tich-tuan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tomTat: buildTomTat(), linhVuc: "thau" }),
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

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">📊 Tiến độ thực hiện thầu</h2>
          <p className="text-xs text-slate-400">Theo bệnh viện &amp; nhóm phụ trách · tính đến {ngayLabel}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            🖨️ In / Lưu PDF
          </button>
          <button
            onClick={phanTichAI}
            disabled={aiLoading}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {aiLoading ? "Đang phân tích…" : "Phân tích AI (Gemini)"}
          </button>
        </div>
      </div>

      {/* Tổng quan */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="SL thực hiện / kế hoạch" value={pctStr(tongQuan.tyLeSL)} sub={`${Math.round(tongQuan.slThucHien).toLocaleString("vi-VN")}/${Math.round(tongQuan.slKeHoach).toLocaleString("vi-VN")}`} accent={ACCENT.sl} />
        <Tile label="Lũy tiến DS / yêu cầu" value={pctStr(tongQuan.tyLeLuyTien)} sub={`${formatShortVnd(tongQuan.doanhSo2026)}/${formatShortVnd(tongQuan.dsYeuCau)}`} accent={ACCENT.luy} />
        <Tile label="Doanh số còn lại" value={formatShortVnd(tongQuan.doanhSoConLai)} sub="cần thực hiện" accent={ACCENT.conlai} />
        <Tile label="Bệnh viện thầu chậm" value={String(tongQuan.soCham)} sub={`/ ${tongQuan.soBenhVien} bệnh viện`} accent={ACCENT.cham} />
      </div>

      {aiError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{aiError}</p>}
      {aiText && (
        <div className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">{aiText}</div>
      )}

      {/* Cảnh báo thầu chậm */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">🚨 Bệnh viện thầu chậm cần thúc</h3>
        <p className="mt-0.5 text-xs text-slate-400">Lũy tiến doanh số chưa đạt yêu cầu tới thời điểm hiện tại.</p>
        <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
          {cham.length === 0 && <li className="text-xs text-slate-400">Không có bệnh viện nào thầu chậm. 👍</li>}
          {cham.map((b) => {
            const thieu = Math.max(0, b.dsYeuCau - b.doanhSo2026);
            return (
              <li key={b.maKhach} className="rounded-lg bg-slate-50 p-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-800">{b.tenKhach}</span>
                  <span className="shrink-0 rounded-full bg-[#e34948] px-2 py-0.5 text-[10px] font-medium text-white">
                    lũy tiến {pctStr(b.tyLeLuyTien)}
                  </span>
                </div>
                <p className="mt-0.5 text-slate-500">
                  {b.tinh}{b.nhomPhuTrach ? ` · ${b.nhomPhuTrach}` : ""} · còn thiếu <span className="font-medium text-red-600">{formatShortVnd(thieu)}</span> · DS còn lại {formatShortVnd(b.doanhSoConLai)}
                </p>
                <div className="mt-1.5">
                  <Bar value={b.tyLeLuyTien ?? 0} color={ACCENT.cham} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Theo nhóm phụ trách */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Tổng hợp theo nhóm phụ trách</h3>
        <div className="mt-3 space-y-3">
          {nhomStats.map((n) => (
            <div key={n.nhom} className="rounded-xl border border-slate-100 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-800">{n.nhom}</span>
                <span className="text-xs text-slate-500">
                  {n.soBenhVien} BV · chậm {n.soCham} · DS còn lại {formatShortVnd(n.doanhSoConLai)}
                </span>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] text-slate-500">SL thực hiện: {pctStr(n.tyLeSL)}</p>
                  <Bar value={n.tyLeSL} color={ACCENT.sl} />
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">Lũy tiến DS: {pctStr(n.tyLeLuyTien)}</p>
                  <Bar value={n.tyLeLuyTien ?? 0} color={ACCENT.luy} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Danh sách bệnh viện */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Chi tiết theo bệnh viện</h3>
          <span className="text-xs text-slate-400">{benhViens.length} bệnh viện</span>
        </div>
        <div className="mt-3 space-y-2">
          {dsHienThi.map((b) => (
            <div key={b.maKhach} className={`rounded-lg border p-2.5 text-xs ${b.chamTre ? "border-red-100 bg-red-50/40" : "border-slate-100 bg-white"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-slate-800">
                  {b.tenKhach} <span className="font-normal text-slate-400">· {b.tinh}{b.nhomPhuTrach ? ` · ${b.nhomPhuTrach}` : ""}</span>
                </span>
                <span className="text-slate-500">DS còn lại {formatShortVnd(b.doanhSoConLai)}</span>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] text-slate-500">SL: {pctStr(b.tyLeSL)} ({Math.round(b.slThucHien).toLocaleString("vi-VN")}/{Math.round(b.slKeHoach).toLocaleString("vi-VN")})</p>
                  <Bar value={b.tyLeSL} color={ACCENT.sl} />
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">Lũy tiến: {pctStr(b.tyLeLuyTien)}</p>
                  <Bar value={b.tyLeLuyTien ?? 0} color={b.chamTre ? ACCENT.cham : ACCENT.luy} />
                </div>
              </div>
            </div>
          ))}
        </div>
        {benhViens.length > 20 && (
          <button
            onClick={() => setXemTatCa((v) => !v)}
            className="no-print mt-3 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {xemTatCa ? "Thu gọn" : `Xem tất cả ${benhViens.length} bệnh viện`}
          </button>
        )}
      </section>
    </div>
  );
}

function Tile({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3" style={{ borderTop: `3px solid ${accent}` }}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs text-slate-400">{sub}</p>
    </div>
  );
}
