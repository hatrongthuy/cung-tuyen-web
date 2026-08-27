// Xuất dữ liệu ra file CSV (mở được trực tiếp bằng Excel). Dùng phía client.
// Có thêm BOM UTF-8 để Excel hiển thị đúng tiếng Việt có dấu.

export type CsvCell = string | number | null | undefined;

export function toCsv(rows: CsvCell[][]): string {
  const esc = (v: CsvCell) => {
    const s = v === null || v === undefined ? "" : String(v);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  return rows.map((r) => r.map(esc).join(",")).join("\r\n");
}

/** Tạo và tải xuống file .csv (Excel mở được). Chỉ gọi được ở phía trình duyệt. */
export function downloadCsv(filename: string, rows: CsvCell[][]): void {
  if (typeof window === "undefined") return;
  const csv = "﻿" + toCsv(rows); // BOM cho Excel
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
