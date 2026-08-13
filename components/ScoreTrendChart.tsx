"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CATEGORICAL_COLORS } from "@/lib/colors";

export interface TrendPoint {
  tuan: string;
  diem: number;
}

/** Biểu đồ đường xu hướng điểm số theo tuần — 1 chuỗi dữ liệu (1 nhân viên hoặc điểm
 * trung bình nhóm) nên không cần chú giải (legend), theo nguyên tắc dataviz. */
export default function ScoreTrendChart({
  data,
  seriesLabel,
  colorIndex = 0,
}: {
  data: TrendPoint[];
  seriesLabel: string;
  colorIndex?: number;
}) {
  const color = CATEGORICAL_COLORS[colorIndex % CATEGORICAL_COLORS.length];

  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-slate-400">
        Chưa có dữ liệu lịch sử điểm cung tuyến.
      </div>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="tuan"
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip
            formatter={(value) => [String(value), seriesLabel]}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="diem"
            name={seriesLabel}
            stroke={color}
            strokeWidth={2}
            dot={{ r: 4, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
