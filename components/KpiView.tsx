"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export interface KpiTabMeta {
  key: string;
  label: string;
}

export interface KpiTabDataClient {
  columns: string[];
  rows: Record<string, string>[];
}

export default function KpiView({
  tabs,
  dataByTab,
}: {
  tabs: KpiTabMeta[];
  dataByTab: Record<string, KpiTabDataClient>;
}) {
  const router = useRouter();
  const [active, setActive] = useState<string>(tabs[0]?.key ?? "");
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const current = dataByTab[active] ?? { columns: [], rows: [] };

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return current.rows;
    return current.rows.filter((row) =>
      current.columns.some((c) => (row[c] ?? "").toLowerCase().includes(q))
    );
  }, [current, search]);

  function refresh() {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 800);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">KPI</h1>
          <p className="mt-1 text-sm text-slate-500">
            Dữ liệu đọc trực tiếp từ file &quot;Kpis T8&quot; theo từng hạng mục (Coaching call, Code mới, SPTT,
            Miniapp...).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            disabled
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600"
            defaultValue="thang-nay"
          >
            <option value="thang-nay">Tháng này</option>
          </select>
          <button
            onClick={refresh}
            disabled={refreshing}
            title="Làm mới"
            className="rounded-lg border border-slate-300 bg-white p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0 1 13-5.1M19.5 12a7.5 7.5 0 0 1-13 5.1" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.5 6.9V4m0 2.9h2.9M6.5 17.1V20m0-2.9H3.6" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={
              t.key === active
                ? "rounded-full bg-slate-900 px-4 py-1.5 text-xs font-medium text-white"
                : "rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm kiếm trong bảng (tên, mã, sản phẩm...)..."
          className="w-full min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500 sm:w-auto"
        />
        {search && (
          <span className="text-xs text-slate-400">
            {filteredRows.length}/{current.rows.length} dòng
          </span>
        )}
      </div>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        {current.rows.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">Không có dữ liệu cho nhóm của bạn ở mục này.</p>
        ) : filteredRows.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">Không tìm thấy kết quả phù hợp.</p>
        ) : (
          <table className="min-w-full text-left text-xs">
            <thead className="bg-emerald-50/70 text-slate-700">
              <tr>
                <th className="whitespace-nowrap px-3 py-2 font-semibold">#</th>
                {current.columns.map((c) => (
                  <th key={c} className="whitespace-nowrap px-3 py-2 font-semibold">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-400">{i + 1}</td>
                  {current.columns.map((c) => (
                    <td key={c} className="whitespace-nowrap px-3 py-2 text-slate-700">
                      {row[c] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
