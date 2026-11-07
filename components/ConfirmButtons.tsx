"use client";

import { useState } from "react";

export default function ConfirmButtons({
  maKH,
  tenKH,
  daXacNhan,
  lyDoDaCo,
}: {
  maKH: string;
  tenKH: string;
  /** Trạng thái đã xác nhận trong tuần này, nếu có ("Đồng ý" | "Không đồng ý" | undefined) */
  daXacNhan?: string;
  /** Lý do đã ghi (nếu trạng thái là "Không đồng ý"). */
  lyDoDaCo?: string;
}) {
  const [status, setStatus] = useState<string | undefined>(daXacNhan);
  const [lyDoCuoi, setLyDoCuoi] = useState<string>(lyDoDaCo ?? "");
  const [loading, setLoading] = useState<"dong-y" | "khac" | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Mở ô nhập lý do khi nhân viên bấm "Không đồng ý".
  const [moLyDo, setMoLyDo] = useState(false);
  const [lyDo, setLyDo] = useState("");

  async function gui(trangThai: "dong-y" | "khac", lyDoGui = "") {
    setLoading(trangThai);
    setError(null);
    try {
      const res = await fetch("/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maKH, tenKH, trangThai, lyDo: lyDoGui }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Có lỗi xảy ra");
      }
      setStatus(trangThai === "dong-y" ? "Đồng ý" : "Không đồng ý");
      setLyDoCuoi(lyDoGui);
      setMoLyDo(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setLoading(null);
    }
  }

  if (status) {
    return (
      <div className="flex flex-col items-end gap-1">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
            status === "Đồng ý"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {status === "Đồng ý" ? "✅ Đã xác nhận gặp" : "↩️ Không đi — đã ghi lý do"}
        </span>
        {status === "Không đồng ý" && lyDoCuoi && (
          <span className="max-w-[240px] text-right text-[11px] text-slate-500">
            Lý do: {lyDoCuoi}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {!moLyDo ? (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => gui("dong-y")}
            disabled={loading !== null}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading === "dong-y" ? "Đang gửi…" : "Xác nhận đã gặp"}
          </button>
          <button
            onClick={() => {
              setMoLyDo(true);
              setError(null);
            }}
            disabled={loading !== null}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            Không đi khách này
          </button>
        </div>
      ) : (
        <div className="w-full sm:w-72">
          <label className="text-[11px] font-medium text-slate-600">
            Lý do không đi khách này <span className="text-red-500">*</span>
          </label>
          <textarea
            value={lyDo}
            onChange={(e) => setLyDo(e.target.value)}
            rows={2}
            placeholder="Ví dụ: khách đã nghỉ, trùng lịch họp, đã gặp tuần trước…"
            className="mt-1 w-full resize-y rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-sky-400"
          />
          <div className="mt-1.5 flex gap-2">
            <button
              onClick={() => gui("khac", lyDo.trim())}
              disabled={loading !== null || lyDo.trim().length === 0}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-50"
            >
              {loading === "khac" ? "Đang gửi…" : "Gửi lý do"}
            </button>
            <button
              onClick={() => {
                setMoLyDo(false);
                setError(null);
              }}
              disabled={loading !== null}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Huỷ
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
