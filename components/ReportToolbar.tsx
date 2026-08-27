"use client";

/** Thanh công cụ xuất báo cáo: tải Excel (.csv) và In / Lưu PDF (dùng hộp thoại in của
 * trình duyệt — người dùng chọn "Save as PDF"). Dùng chung cho Doanh số + Báo cáo tuần/tháng. */
export default function ReportToolbar({
  onExportCsv,
  className = "",
}: {
  onExportCsv: () => void;
  className?: string;
}) {
  function printPdf() {
    if (typeof window !== "undefined") window.print();
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button
        onClick={onExportCsv}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
        Tải Excel (.csv)
      </button>
      <button
        onClick={printPdf}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V4h12v5M6 18H4a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2M6 14h12v6H6z" />
        </svg>
        In / Lưu PDF
      </button>
    </div>
  );
}
