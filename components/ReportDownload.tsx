"use client";

import { useState } from "react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    html2canvas?: any;
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.dataset.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Không tải được thư viện tạo ảnh"));
    document.head.appendChild(s);
  });
}

export default function ReportDownload({
  targetId,
  fileName,
}: {
  targetId: string;
  fileName: string;
}) {
  const [busy, setBusy] = useState<"" | "img" | "html">("");

  async function taiAnh() {
    const el = document.getElementById(targetId);
    if (!el || busy) return;
    setBusy("img");
    try {
      await loadScript("https://cdn.jsdelivr.net/npm/html2canvas-pro@1.5.11/dist/html2canvas-pro.min.js");
      const h2c = window.html2canvas;
      const canvas = await h2c(el, {
        scale: 2,
        backgroundColor: "#f8fafc",
        useCORS: true,
        windowWidth: el.scrollWidth + 40,
      });
      const a = document.createElement("a");
      a.download = `${fileName}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    } catch (e) {
      alert("Không tạo được ảnh: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy("");
    }
  }

  function taiHtml() {
    const el = document.getElementById(targetId);
    if (!el || busy) return;
    setBusy("html");
    try {
      const html =
        `<!doctype html><html lang="vi"><head><meta charset="utf-8">` +
        `<meta name="viewport" content="width=device-width,initial-scale=1">` +
        `<title>${fileName}</title>` +
        `<script src="https://cdn.tailwindcss.com"></script>` +
        `<style>body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}</style>` +
        `</head><body class="bg-slate-50 p-4">${el.outerHTML}</body></html>`;
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const a = document.createElement("a");
      a.download = `${fileName}.html`;
      a.href = URL.createObjectURL(blob);
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } finally {
      setBusy("");
    }
  }

  const btn =
    "inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60";

  return (
    <div className="flex gap-2">
      <button type="button" onClick={taiAnh} disabled={!!busy} className={btn}>
        🖼️ {busy === "img" ? "Đang tạo ảnh…" : "Tải ảnh"}
      </button>
      <button type="button" onClick={taiHtml} disabled={!!busy} className={btn}>
        📄 {busy === "html" ? "Đang tạo…" : "Tải HTML"}
      </button>
    </div>
  );
}
