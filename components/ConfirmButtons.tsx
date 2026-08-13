"use client";

import { useState } from "react";

export default function ConfirmButtons({
  maKH,
  tenKH,
  daXacNhan,
}: {
  maKH: string;
  tenKH: string;
  /** Trạng thái đã xác nhận trong tuần này, nếu có ("Đồng ý" | "Không đồng ý" | undefined) */
  daXacNhan?: string;
}) {
  const [status, setStatus] = useState<string | undefined>(daXacNhan);
  const [loading, setLoading] = useState<"dong-y" | "khac" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function gui(trangThai: "dong-y" | "khac") {
    setLoading(trangThai);
    setError(null);
    try {
      const res = await fetch("/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maKH, tenKH, trangThai }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Có lỗi xảy ra");
      }
      setStatus(trangThai === "dong-y" ? "Đồng ý" : "Không đồng ý");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setLoading(null);
    }
  }

  if (status) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
          status === "Đồng ý"
            ? "bg-emerald-100 text-emerald-700"
            : "bg-slate-100 text-slate-600"
        }`}
      >
        {status === "Đồng ý" ? "✅ Đã xác nhận gặp" : "↩️ Đã phản hồi: không đồng ý"}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => gui("dong-y")}
          disabled={loading !== null}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading === "dong-y" ? "Đang gửi…" : "Xác nhận đã gặp"}
        </button>
        <button
          onClick={() => gui("khac")}
          disabled={loading !== null}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          {loading === "khac" ? "Đang gửi…" : "Không đồng ý / phản hồi khác"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
