import { cardGradient } from "@/lib/ui";

// Thẻ số liệu nền GRADIENT nhiều màu (chữ trắng). Không có accentColor thì về thẻ trắng như cũ.
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

  return (
    <div className="rounded-2xl p-4 shadow-md ring-1 ring-black/5" style={{ background: cardGradient(accentColor) }}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/85">{label}</p>
      <p className="mt-1 text-3xl font-extrabold leading-tight text-white drop-shadow-sm">{value}</p>
      {hint && <p className="mt-0.5 text-xs font-medium text-white/80">{hint}</p>}
    </div>
  );
}
