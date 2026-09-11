"use client";

import { useState } from "react";

const GOI_Y_NHOM = [
  "Doanh số kê đơn của Đỗ Cao Trung tháng này so cùng kỳ?",
  "Top 5 sản phẩm bán chạy nhất toàn kỳ?",
  "Khách nào lâu chưa mua Levobupi-BFS?",
  "Nhân viên nào tăng trưởng tốt nhất so cùng kỳ?",
  "Nhà thuốc Trung tâm Y tế Đoan Hùng đã mua những sản phẩm gì?",
  "Sản phẩm trọng tâm nào đang bán yếu tháng này?",
];
const GOI_Y_CANHAN = [
  "Doanh số của tôi tháng này so cùng kỳ?",
  "Top 5 sản phẩm tôi bán chạy nhất?",
  "Khách nào của tôi lâu chưa mua lại?",
  "Sản phẩm trọng tâm nào tôi đang bán yếu?",
  "Những nhà thuốc nào tôi đang phụ trách có doanh số cao nhất?",
];

interface QA {
  q: string;
  a?: string;
  err?: string;
  loading?: boolean;
}

export default function HoiDapView({ mine }: { mine?: boolean }) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<QA[]>([]);
  const [busy, setBusy] = useState(false);
  const GOI_Y = mine ? GOI_Y_CANHAN : GOI_Y_NHOM;

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    setInput("");
    const idx = history.length;
    setHistory((h) => [...h, { q, loading: true }]);
    try {
      const res = await fetch("/api/hoi-dap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      setHistory((h) => h.map((item, i) => (i === idx ? { q, a: res.ok ? data.text : undefined, err: res.ok ? undefined : data.error || "Lỗi." } : item)));
    } catch (e) {
      setHistory((h) => h.map((item, i) => (i === idx ? { q, err: e instanceof Error ? e.message : String(e) } : item)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">🤖 Trợ lý AI — Hỏi đáp số liệu</h1>
        <p className="text-xs text-slate-500">
          {mine
            ? "Hỏi bất kỳ câu nào về doanh số, khách hàng, sản phẩm CỦA BẠN… AI đọc dữ liệu Sale thật của bạn để trả lời."
            : "Hỏi bất kỳ câu nào về doanh số, khách hàng, sản phẩm, nhân viên… AI đọc dữ liệu Sale thật của nhóm để trả lời."}
        </p>
      </div>

      {/* Ô nhập */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) ask(input);
          }}
          rows={2}
          placeholder="Nhập câu hỏi… (Ctrl/⌘ + Enter để gửi)"
          className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">Nguồn: file Sale Google Sheet (cập nhật trực tiếp)</span>
          <button
            onClick={() => ask(input)}
            disabled={busy || !input.trim()}
            className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {busy ? "Đang trả lời…" : "Hỏi"}
          </button>
        </div>
      </div>

      {/* Gợi ý câu hỏi */}
      {history.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {GOI_Y.map((g) => (
            <button
              key={g}
              onClick={() => ask(g)}
              disabled={busy}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {/* Lịch sử hỏi đáp (mới nhất trên cùng) */}
      <div className="space-y-3">
        {[...history].reverse().map((qa, i) => (
          <div key={history.length - 1 - i} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">❓ {qa.q}</p>
            {qa.loading && <p className="mt-2 text-xs text-slate-400">Đang đọc dữ liệu &amp; phân tích…</p>}
            {qa.err && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{qa.err}</p>}
            {qa.a && <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{qa.a}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
