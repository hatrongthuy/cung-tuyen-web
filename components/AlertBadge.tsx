import { STATUS_COLORS } from "@/lib/colors";

const MUC_DO_MAP: Record<string, { label: string; color: string }> = {
  "Rất nặng": { label: "Rất nặng", color: STATUS_COLORS.critical },
  "Nặng": { label: "Nặng", color: STATUS_COLORS.serious },
  "Cảnh báo": { label: "Cảnh báo", color: STATUS_COLORS.warning },
};

export default function AlertBadge({ mucDo }: { mucDo: string }) {
  const cfg = MUC_DO_MAP[mucDo] ?? { label: mucDo || "—", color: STATUS_COLORS.warning };
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}
