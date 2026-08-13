"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { colorForIndex } from "@/lib/colors";

export interface EmployeeBarDatum {
  hoTen: string;
  giaTri: number;
}

/** Biểu đồ cột so sánh giữa các nhân viên — mỗi nhân viên (identity) giữ 1 màu cố định
 * theo thứ tự trong allowlist, không đổi màu theo giá trị/thứ hạng. */
export default function EmployeeBarChart({
  data,
  valueLabel,
  valueFormatter,
}: {
  data: EmployeeBarDatum[];
  valueLabel: string;
  valueFormatter?: (v: number) => string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-slate-400">
        Chưa có dữ liệu.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="hoTen"
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
            interval={0}
            angle={-15}
            textAnchor="end"
            height={50}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip
            formatter={(value) => [
              valueFormatter ? valueFormatter(Number(value)) : String(value),
              valueLabel,
            ]}
            contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
          />
          <Bar dataKey="giaTri" name={valueLabel} radius={[4, 4, 0, 0]}>
            {data.map((_, idx) => (
              <Cell key={idx} fill={colorForIndex(idx)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
