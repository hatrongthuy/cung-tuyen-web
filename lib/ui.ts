// Tiện ích giao diện dùng chung cho các THẺ SỐ LIỆU nền gradient (chữ trắng).

/** Dịch sáng/tối 1 màu hex (amt dương = sáng hơn, âm = tối hơn). */
export function shade(hex: string, amt: number): string {
  const h = (hex || "").replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return hex;
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((n >> 16) & 255) + amt);
  const g = clamp(((n >> 8) & 255) + amt);
  const b = clamp((n & 255) + amt);
  return `rgb(${r}, ${g}, ${b})`;
}

/** Chuỗi CSS background gradient chéo từ 1 màu chủ đạo (sáng → đậm) cho thẻ số liệu. */
export function cardGradient(accent: string): string {
  return `linear-gradient(135deg, ${shade(accent, 28)} 0%, ${shade(accent, -26)} 100%)`;
}
