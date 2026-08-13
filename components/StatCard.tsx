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
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        {accentColor && (
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
        )}
        <p className="text-xs font-medium text-slate-500">{label}</p>
      </div>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
