// Tiện ích định dạng & phân tích số liệu (dùng chung cho Doanh số + Báo cáo).

/** Phân tích một ô số liệu về dạng number.
 * - Google Sheets API (valueRenderOption: UNFORMATTED_VALUE) thường trả số thô ("750000000").
 * - Phòng trường hợp ô là chuỗi định dạng kiểu Việt Nam ("750.000.000" hoặc "1.234,5"),
 *   hàm tự bóc tách dấu phân tách hàng nghìn/thập phân.
 * - Các ô không phải số ("", "-", "Ko có số KH", "#REF!") trả về 0. */
export function parseMoney(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  let s = String(v).trim();
  if (!s) return 0;
  // Thử parse trực tiếp (trường hợp số thô từ API).
  const direct = Number(s);
  if (Number.isFinite(direct)) return direct;
  // Bóc ký tự không liên quan, giữ lại số/dấu.
  s = s.replace(/[^0-9.,-]/g, "");
  if (!s) return 0;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // Định dạng VN: "." hàng nghìn, "," thập phân.
    s = s.replace(/\./g, "").replace(/,/g, ".");
  } else if (hasComma) {
    s = s.replace(/,/g, ".");
  } else if (hasDot) {
    // Nếu chỉ có "." và có vẻ là phân tách hàng nghìn (nhiều nhóm 3 số) thì bỏ đi.
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/** Định dạng đầy đủ theo VN: 750000000 -> "750.000.000". */
export function formatVnd(n: number): string {
  return Math.round(n).toLocaleString("vi-VN");
}

/** Định dạng gọn: 750000000 -> "750 tr", 1300000000 -> "1,3 tỷ". */
export function formatShortVnd(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) {
    return `${(n / 1_000_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ`;
  }
  if (abs >= 1_000_000) {
    return `${(n / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 0 })} tr`;
  }
  return formatVnd(n);
}

/** Tỷ lệ phần trăm an toàn (tránh chia 0). */
export function pct(part: number, whole: number): number {
  if (!whole) return 0;
  return (part / whole) * 100;
}
