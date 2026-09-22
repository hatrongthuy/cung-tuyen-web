"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Ô cho nhân viên tự nhập "Code mới" của tháng (cập nhật theo tuần).
// Gửi lên /api/code-moi -> webhook n8n ghi vào Google Sheet. Lần nhập mới nhất trong tháng
// sẽ là số dùng cho bảng KPI. Nhập TỔNG code mới từ đầu tháng đến hiện tại (không phải cộng dồn).
export default function CodeMoiInput({
  current,
  monthLabel,
  configured,
}: {
  current: number | null;
  monthLabel: string;
  configured: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState<string>(current != null ? String(current) : "");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function submit() {
    const so = Math.round(Number(value));
    if (!Number.isFinite(so) || so < 0) {
      setMsg({ type: "err", text: "Nhập một số nguyên ≥ 0." });
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/code-moi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ so }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Gửi thất bại");
      setMsg({ type: "ok", text: `Đã lưu ${so} code mới cho tháng ${monthLabel}. Bảng điểm sẽ cập nhật sau giây lát.` });
      // Cập nhật lại số liệu KPI trên trang (đọc lại từ sheet).
      setTimeout(() => router.refresh(), 1200);
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "Gửi thất bại" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mb-5 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-indigo-900">Nhập Code mới — tháng {monthLabel}</h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-indigo-700/80">
            Nhập TỔNG số code (nhà thuốc/khách) mở mới trong tháng, cập nhật lại mỗi tuần. Lần nhập
            mới nhất sẽ được dùng cho bảng điểm KPI.
          </p>
        </div>
        {current != null && (
          <span className="text-xs text-indigo-600">
            Hiện tại: <span className="text-base font-bold">{current}</span>
          </span>
        )}
      </div>

      {!configured && (
        <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          Tính năng nhập tay chưa sẵn sàng (chưa cấu hình sheet lưu trữ). Anh/chị báo quản trị để bật.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={loading}
          placeholder="0"
          className="w-28 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          onClick={submit}
          disabled={loading || value === ""}
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Đang lưu…" : "Lưu"}
        </button>
      </div>

      {msg && (
        <p className={`mt-2 text-xs ${msg.type === "ok" ? "text-emerald-700" : "text-rose-600"}`}>{msg.text}</p>
      )}
    </section>
  );
}
