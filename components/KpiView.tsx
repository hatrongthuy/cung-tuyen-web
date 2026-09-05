"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import StatCard from "@/components/StatCard";
import { formatVnd, formatShortVnd } from "@/lib/format";
import { normalizeMaNV } from "@/lib/report-utils";

export interface KpiTabMeta {
  key: string;
  label: string;
}

export interface KpiTabDataClient {
  columns: string[];
  rows: Record<string, string>[];
}

export interface KpiSalesSummary {
  monthLabel: string;
  error?: string | null;
  rows: { ten: string; keDon: number; thau: number }[];
}

export default function KpiView({
  tabs,
  dataByTab,
  error,
  salesSummary,
  keDonByCode,
  thauByCode,
}: {
  tabs: KpiTabMeta[];
  dataByTab: Record<string, KpiTabDataClient>;
  error?: string | null;
  salesSummary?: KpiSalesSummary;
  /** Doanh số thực hiện kê đơn theo mã NV — điền cột "kê đơn (Thực hiện)" trong tab Doanh số. */
  keDonByCode?: Record<string, number>;
  /** Doanh số thực hiện thầu theo mã NV — điền cột "DS thầu Thực hiện" trong tab Doanh số. */
  thauByCode?: Record<string, number>;
}) {
  const router = useRouter();
  const [active, setActive] = useState<string>(tabs[0]?.key ?? "");
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const current = dataByTab[active] ?? { columns: [], rows: [] };

  // Trong tab "Doanh số" (Doanh so T9): điền cột "kê đơn (Thực hiện)" bằng doanh số thực hiện
  // thật (từ file Sale), khớp theo mã nhân viên — thay cho số 0 trống trong sheet KPI.
  const dsOverride = useMemo(() => {
    if (active !== "doanh-so") return null;
    const maCol = current.columns.find((c) => /mã nv|mã nhân/i.test(c));
    if (!maCol) return null;
    const keDonCol = current.columns.find((c) => /kê đơn/i.test(c) && /thực hiện/i.test(c));
    const thauCol = current.columns.find((c) => /thầu/i.test(c) && /thực hiện/i.test(c));
    return { maCol, keDonCol, thauCol };
  }, [active, current.columns]);

  function cellValue(row: Record<string, string>, c: string): string {
    if (dsOverride) {
      const ma = normalizeMaNV(row[dsOverride.maCol]);
      if (keDonByCode && c === dsOverride.keDonCol && ma in keDonByCode) return formatVnd(keDonByCode[ma]);
      if (thauByCode && c === dsOverride.thauCol && ma in thauByCode) return formatVnd(thauByCode[ma]);
    }
    return row[c] ?? "";
  }

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
      {error && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          <p className="font-semibold">Chưa đọc được dữ liệu KPI</p>
          <p className="mt-1 leading-relaxed">{error}</p>
        </div>
      )}

      {salesSummary && (
        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">
              Doanh số thực hiện — tháng {salesSummary.monthLabel}
            </h2>
            <span className="text-xs text-slate-400">Tổng doanh thu thực tế từ file Sale (theo nhân viên)</span>
          </div>
          {salesSummary.error ? (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Không đọc được doanh số từ file Sale: {salesSummary.error}
            </p>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <StatCard
                  label="Tổng nhóm"
                  value={formatShortVnd(salesSummary.rows.reduce((s, r) => s + r.keDon + r.thau, 0))}
                  hint={`Kê đơn ${formatShortVnd(salesSummary.rows.reduce((s, r) => s + r.keDon, 0))} • Thầu ${formatShortVnd(salesSummary.rows.reduce((s, r) => s + r.thau, 0))}`}
                  accentColor="#1baf7a"
                />
                {salesSummary.rows.map((r, i) => (
                  <StatCard
                    key={i}
                    label={r.ten}
                    value={formatShortVnd(r.keDon + r.thau)}
                    hint={`KĐ ${formatShortVnd(r.keDon)} • Thầu ${formatShortVnd(r.thau)}`}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Doanh số thực hiện thực tế, tách kê đơn (KĐ) và thầu. Các bảng điểm KPI bên dưới là số liệu
                do file KPI của công ty tính; web chỉ hiển thị (đã điền cột Thực hiện trong tab Doanh số).
              </p>
            </>
          )}
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">KPI</h1>
          <p className="mt-1 text-sm text-slate-500">
            Dữ liệu đọc trực tiếp từ file &quot;Kpis T9&quot; theo từng hạng mục (Coaching call, Code mới, SPTT,
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
                      {cellValue(row, c)}
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
