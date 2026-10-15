"use client";

import { formatShortVnd } from "@/lib/format";
import type { AnomalyResult, AnomalyRow } from "@/lib/customer-analytics";

function Table({
  title,
  icon,
  rows,
  phuLabel,
}: {
  title: string;
  icon: string;
  rows: AnomalyRow[];
  phuLabel: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <span>{icon}</span> {title}
        <span className="text-xs font-normal text-slate-400">({rows.length})</span>
      </h2>
      {rows.length === 0 ? (
        <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">✓ Không có cảnh báo tụt mạnh. 👍</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-3 font-medium">Tên</th>
                <th className="py-2 pr-3 font-medium">{phuLabel}</th>
                <th className="py-2 pr-3 font-medium">TDV</th>
                <th className="py-2 pr-3 text-right font-medium">Nhịp trước (/30 ngày)</th>
                <th className="py-2 pr-3 text-right font-medium">30 ngày gần nhất</th>
                <th className="py-2 pr-3 text-right font-medium">Giảm</th>
                <th className="py-2 pr-3 text-right font-medium">Hụt</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="py-2 pr-3 font-semibold text-slate-900">{r.ten}</td>
                  <td className="py-2 pr-3 text-slate-600">{r.phu || "—"}</td>
                  <td className="py-2 pr-3 text-slate-600">{r.rep || "—"}</td>
                  <td className="py-2 pr-3 text-right text-slate-600">{formatShortVnd(r.baseline)}</td>
                  <td className="py-2 pr-3 text-right font-semibold text-slate-800">{formatShortVnd(r.recent)}</td>
                  <td className="py-2 pr-3 text-right font-bold text-red-600">▼ {r.dropPct.toFixed(0)}%</td>
                  <td className="py-2 pr-3 text-right font-semibold text-red-600">−{formatShortVnd(r.drop)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function CanhBaoBatThuongView({
  teamName,
  data,
  title,
}: {
  teamName: string;
  data: AnomalyResult;
  title?: string;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-red-50 to-white p-5 shadow-sm">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900">{title ?? "Cảnh báo bất thường doanh số"}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Nhóm {teamName} · {data.windowLabel || "so 30 ngày gần nhất với nhịp 90 ngày trước"}. Chỉ hiện khách/SP từng mua đều mà nay <b>tụt từ 50% trở lên</b>.
        </p>
      </div>

      {data.error && <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">Không đọc được dữ liệu Sale: {data.error}</div>}

      <Table
        title="Khách hàng tụt mạnh"
        icon="🏥"
        rows={data.khach}
        phuLabel="Tỉnh"
      />
      <Table
        title="Sản phẩm tụt mạnh"
        icon="💊"
        rows={data.sanpham}
        phuLabel="Gam hàng"
      />

      <p className="text-center text-xs text-slate-400">
        Nguồn: file Sale · “Nhịp trước” = doanh thu trung bình mỗi 30 ngày trong 90 ngày trước đó · “Hụt” = phần doanh thu đang mất so với nhịp.
      </p>
    </div>
  );
}
