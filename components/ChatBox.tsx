"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export interface ChatMessage {
  thoiGian: string;
  maGui: string;
  tenGui: string;
  noiDung: string;
}

export default function ChatBox({
  messages,
  loai,
  manvNhan,
  tennvNhan,
  currentSenderCode,
  emptyLabel = "Chưa có tin nhắn nào.",
  placeholder = "Nhập tin nhắn...",
}: {
  messages: ChatMessage[];
  loai: "rieng" | "nhom";
  /** Chỉ cần khi loai === "rieng" và người gửi là quản lý (chọn nhân viên để nhắn riêng) */
  manvNhan?: string;
  tennvNhan?: string;
  /** Mã người gửi hiện tại (mã NV hoặc "QL") — dùng để canh tin nhắn của mình sang phải */
  currentSenderCode: string;
  emptyLabel?: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const [noiDung, setNoiDung] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function gui() {
    if (!noiDung.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loai, manvNhan, tennvNhan, noiDung }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Có lỗi xảy ra");
      }
      setNoiDung("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex max-h-96 min-h-[10rem] flex-col gap-2 overflow-y-auto rounded-lg bg-slate-50 p-3">
        {messages.length === 0 && (
          <p className="text-xs text-slate-400">{emptyLabel}</p>
        )}
        {messages.map((m, i) => {
          const cuaMinh = m.maGui === currentSenderCode;
          return (
            <div key={i} className={`flex ${cuaMinh ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-xl px-3 py-1.5 text-xs shadow-sm ${
                  cuaMinh
                    ? "bg-emerald-600 text-white"
                    : "border border-slate-200 bg-white text-slate-700"
                }`}
              >
                {!cuaMinh && (
                  <p className="mb-0.5 text-[10px] font-semibold text-slate-500">{m.tenGui}</p>
                )}
                <p className="whitespace-pre-wrap">{m.noiDung}</p>
                <p
                  className={`mt-0.5 text-right text-[10px] ${
                    cuaMinh ? "text-emerald-100" : "text-slate-400"
                  }`}
                >
                  {m.thoiGian}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          type="text"
          value={noiDung}
          onChange={(e) => setNoiDung(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") gui();
          }}
          placeholder={placeholder}
          disabled={sending}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-slate-400 focus:outline-none disabled:opacity-50"
        />
        <button
          onClick={gui}
          disabled={sending || !noiDung.trim()}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {sending ? "Đang gửi…" : "Gửi"}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
