"use client";

import { useState } from "react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    html2canvas?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jspdf?: any;
  }
}

const H2C = "https://cdn.jsdelivr.net/npm/html2canvas-pro@1.5.11/dist/html2canvas-pro.min.js";
const JSPDF = "https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js";

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
    s.onerror = () => reject(new Error("Không tải được thư viện: " + src));
    document.head.appendChild(s);
  });
}

// Chụp phần tử thành canvas, có mở rộng các vùng cuộn ngang để không bị cắt cột bảng.
async function captureCanvas(el: HTMLElement) {
  await loadScript(H2C);
  const scrollers = Array.from(el.querySelectorAll<HTMLElement>(".overflow-x-auto"));
  const saved = scrollers.map((s) => ({ el: s, overflow: s.style.overflow, width: s.style.width }));
  scrollers.forEach((s) => {
    s.style.overflow = "visible";
    s.style.width = "max-content";
  });
  try {
    return await window.html2canvas(el, {
      scale: 2,
      backgroundColor: "#f8fafc",
      useCORS: true,
      windowWidth: el.scrollWidth + 40,
    });
  } finally {
    saved.forEach((x) => {
      x.el.style.overflow = x.overflow;
      x.el.style.width = x.width;
    });
  }
}

export default function ReportDownload({
  targetId,
  fileName,
}: {
  targetId: string;
  fileName: string;
}) {
  const [busy, setBusy] = useState<"" | "img" | "pdf" | "html">("");

  async function taiAnh() {
    const el = document.getElementById(targetId);
    if (!el || busy) return;
    setBusy("img");
    try {
      const canvas = await captureCanvas(el);
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

  async function taiPdf() {
    const el = document.getElementById(targetId);
    if (!el || busy) return;
    setBusy("pdf");
    try {
      const canvas = await captureCanvas(el);
      await loadScript(JSPDF);
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF("p", "mm", "a4");
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const imgW = pw;
      const imgH = (canvas.height * pw) / canvas.width;
      const img = canvas.toDataURL("image/jpeg", 0.9);
      let hLeft = imgH;
      let pos = 0;
      pdf.addImage(img, "JPEG", 0, pos, imgW, imgH, undefined, "FAST");
      hLeft -= ph;
      while (hLeft > 0) {
        pos -= ph;
        pdf.addPage();
        pdf.addImage(img, "JPEG", 0, pos, imgW, imgH, undefined, "FAST");
        hLeft -= ph;
      }
      pdf.save(`${fileName}.pdf`);
    } catch (e) {
      alert("Không tạo được PDF: " + (e instanceof Error ? e.message : String(e)));
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
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={taiAnh} disabled={!!busy} className={btn}>
        🖼️ {busy === "img" ? "Đang tạo ảnh…" : "Tải ảnh"}
      </button>
      <button type="button" onClick={taiPdf} disabled={!!busy} className={btn}>
        📑 {busy === "pdf" ? "Đang tạo PDF…" : "Tải PDF"}
      </button>
      <button type="button" onClick={taiHtml} disabled={!!busy} className={btn}>
        📄 {busy === "html" ? "Đang tạo…" : "Tải HTML"}
      </button>
    </div>
  );
}
