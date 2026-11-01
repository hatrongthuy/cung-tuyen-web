// Thẻ số liệu dạng GRADIENT nhiều màu (cho giao diện sinh động hơn).
// - Nếu truyền accentColor: thẻ nền gradient theo màu đó, chữ trắng.
// - Nếu không: thẻ trắng viền nhạt như cũ (an toàn cho nơi chưa gán màu).

/** Dịch sáng/tối 1 màu hex (amt dương = sáng hơn, âm = tối hơn). */
function shade(hex: string, amt: number): string {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return hex;
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((n >> 16) & 255) + amt);
  const g = clamp(((n >> 8) & 255) + amt);
  const b = clamp((n & 255) + amt);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function StatCard({
  label,
  value,
  hint,
  accentColor,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accentColor?: string;
}) {
  if (!accentColor) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
      </div>
    );
  }

  const bg = `linear-gradient(135deg, ${shade(accentColor, 28)} 0%, ${shade(accentColor, -26)} 100%)`;
  return (
    <div className="rounded-2xl p-4 shadow-md ring-1 ring-black/5" style={{ background: bg }}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/85">{label}</p>
      <p className="mt-1 text-3xl font-extrabold leading-tight text-white drop-shadow-sm">{value}</p>
      {hint && <p className="mt-0.5 text-xs font-medium text-white/80">{hint}</p>}
    </div>
  );
}
