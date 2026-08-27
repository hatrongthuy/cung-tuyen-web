"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import StatCard from "@/components/StatCard";
import ReportToolbar from "@/components/ReportToolbar";
import { formatVnd, formatShortVnd, parseMoney, pct } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";

interface Props {
  columns: string[];
  rows: Record<string, string>[];
  error?: string | null;
  teamName: string;
}

/** Tìm tên cột theo danh sách từ khóa (không phân biệt hoa/thường, dấu cách thừa). */
function findCol(columns: string[], keywords: string[]): string | null {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  for (const c of columns) {
    const n = norm(c);
    if (keywords.every((k) => n.includes(norm(k)))) return c;
  }
  return null;
}

export default function DoanhSoView({ columns, rows, error, teamName }: Props) {
  const [showAll, setShowAll] = useState(false);

  const cols = useMemo(() => {
    return {
      ten: findCol(columns, ["họ và tên"]) ?? findCol(columns, ["tên nhân"]) ?? columns[2] ?? "",
      viTri: findCol(columns, ["vị trí"]) ?? columns[0] ?? "",
      diaBan: findCol(columns, ["địa bàn"]) ?? findCol(columns, ["ps "]) ?? "",
      kdKH: findCol(columns, ["kê đơn", "kế hoạch"]),
      kdTH: findCol(columns, ["kê đơn", "thực hiện"]),
      thauKH: findCol(columns, ["thầu", "kế hoạch"]) ?? findCol(columns, ["thầu", "hoạch"]),
      thauTH: findCol(columns, ["thầu", "thực hiện"]) ?? findCol(columns, ["thầu", "hiện"]),
    };
  }, [columns]);

  // Chỉ lấy dòng nhân viên kinh doanh (NVKD) để tính tổng đội; nếu không nhận diện được
  // cột Vị trí thì dùng toàn bộ dòng.
  const nvkdRows = useMemo(() => {
    if (!cols.viTri) return rows;
    const only = rows.filter((r) => (r[cols.viTri] ?? "").trim().toUpperCase() === "NVKD");
    return only.length > 0 ? only : rows;
  }, [rows, cols.viTri]);

  const perEmp = useMemo(() => {
    return nvkdRows.map((r) => {
      const kdKH = cols.kdKH ? parseMoney(r[cols.kdKH]) : 0;
      const kdTH = cols.kdTH ? parseMoney(r[cols.kdTH]) : 0;
      const thauKH = cols.thauKH ? parseMoney(r[cols.thauKH]) : 0;
      const thauTH = cols.thauTH ? parseMoney(r[cols.thauTH]) : 0;
      return {
        ten: (cols.ten ? r[cols.ten] : "") || "(không tên)",
        diaBan: cols.diaBan ? r[cols.diaBan] : "",
        kdKH,
        kdTH,
        thauKH,
        thauTH,
        tyLe: pct(kdTH, kdKH),
      };
    });
  }, [nvkdRows, cols]);

  const tong = useMemo(() => {
    return perEmp.reduce(
      (a, e) => ({
        kdKH: a.kdKH + e.kdKH,
        kdTH: a.kdTH + e.kdTH,
        thauKH: a.thauKH + e.thauKH,
        thauTH: a.thauTH + e.thauTH,
      }),
      { kdKH: 0, kdTH: 0, thauKH: 0, thauTH: 0 }
    );
  }, [perEmp]);

  const chartData = perEmp.map((e) => ({
    ten: e.ten,
    "Kế hoạch": Math.round(e.kdKH),
    "Thực hiện": Math.round(e.kdTH),
  }));

  const chuaCoThucHien = tong.kdTH === 0 && tong.thauTH === 0;

  function exportCsv() {
    const header = ["Nhân viên", "Địa bàn", "KD kế hoạch", "KD thực hiện", "Tỷ lệ HT (%)", "Thầu kế hoạch", "Thầu thực hiện"];
    const body = perEmp.map((e) => [
      e.ten,
      e.diaBan,
      Math.round(e.kdKH),
      Math.round(e.kdTH),
      Math.round(e.tyLe),
      Math.round(e.thauKH),
      Math.round(e.thauTH),
    ]);
    const footer = ["TỔNG", "", Math.round(tong.kdKH), Math.round(tong.kdTH), Math.round(pct(tong.kdTH, tong.kdKH)), Math.round(tong.thauKH), Math.round(tong.thauTH)];
    downloadCsv(`doanh-so-${teamName}`, [header, ...body, footer]);
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:block">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Doanh số — Nhóm {teamName}</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Đọc trực tiếp từ tab &quot;Doanh so T8&quot; trong file KPI mỗi lần tải trang.
          </p>
        </div>
        <ReportToolbar onExportCsv={exportCsv} className="no-print" />
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          <p className="font-semibold">Chưa đọc được dữ liệu doanh số</p>
          <p className="mt-1 leading-relaxed">{error}</p>
        </div>
      )}

      {!error && perEmp.length === 0 && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-700">Chưa có dữ liệu doanh số cho nhóm này</p>
          <p className="mt-1 text-xs text-slate-400">
            Kiểm tra lại cột &quot;SS&quot; trong tab &quot;Doanh so T8&quot; có giá trị &quot;{teamName}&quot; không.
          </p>
        </div>
      )}

      {perEmp.length > 0 && (
        <>
          <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="KD kế hoạch (tháng)" value={formatShortVnd(tong.kdKH)} hint={`${formatVnd(tong.kdKH)} đ`} accentColor="#2a78d6" />
            <StatCard label="KD thực hiện (tháng)" value={formatShortVnd(tong.kdTH)} hint={`${formatVnd(tong.kdTH)} đ`} accentColor="#1baf7a" />
            <StatCard label="Tỷ lệ hoàn thành KD" value={`${Math.round(pct(tong.kdTH, tong.kdKH))}%`} accentColor="#eda100" />
            <StatCard label="Số nhân viên" value={perEmp.length} accentColor="#eb6834" />
          </section>

          {chuaCoThucHien && (
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Lưu ý: cột &quot;Thực hiện&quot; trong sheet hiện đang trống — doanh số thực hiện sẽ hiển thị khi
              số liệu được nhập vào file KPI. Hiện chỉ có số Kế hoạch.
            </p>
          )}

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Doanh số kê đơn theo nhân viên — Kế hoạch vs Thực hiện</h2>
            <div className="mt-3 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="ten" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} interval={0} angle={-15} textAnchor="end" height={54} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => formatShortVnd(Number(v))} />
                  <Tooltip formatter={(v) => formatVnd(Number(v)) + " đ"} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Kế hoạch" fill="#2a78d6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Thực hiện" fill="#1baf7a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Chi tiết theo nhân viên</h2>
              <button
                onClick={() => setShowAll((s) => !s)}
                className="no-print rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                {showAll ? "Xem gọn" : "Xem tất cả cột"}
              </button>
            </div>

            {!showAll ? (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="text-slate-500">
                    <tr className="border-b border-slate-200">
                      <th className="py-2 pr-3 font-medium">Nhân viên</th>
                      <th className="py-2 pr-3 font-medium">Địa bàn</th>
                      <th className="py-2 pr-3 text-right font-medium">KD kế hoạch</th>
                      <th className="py-2 pr-3 text-right font-medium">KD thực hiện</th>
                      <th className="py-2 pr-3 text-right font-medium">Tỷ lệ HT</th>
                      <th className="py-2 pr-3 text-right font-medium">Thầu kế hoạch</th>
                      <th className="py-2 pr-3 text-right font-medium">Thầu thực hiện</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perEmp.map((e, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="py-2 pr-3 font-medium text-slate-800">{e.ten}</td>
                        <td className="py-2 pr-3 text-slate-500">{e.diaBan}</td>
                        <td className="py-2 pr-3 text-right text-slate-700">{formatVnd(e.kdKH)}</td>
                        <td className="py-2 pr-3 text-right text-slate-700">{formatVnd(e.kdTH)}</td>
                        <td className="py-2 pr-3 text-right text-slate-700">{Math.round(e.tyLe)}%</td>
                        <td className="py-2 pr-3 text-right text-slate-700">{formatVnd(e.thauKH)}</td>
                        <td className="py-2 pr-3 text-right text-slate-700">{formatVnd(e.thauTH)}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-slate-300 font-semibold">
                      <td className="py-2 pr-3 text-slate-900">TỔNG</td>
                      <td className="py-2 pr-3"></td>
                      <td className="py-2 pr-3 text-right text-slate-900">{formatVnd(tong.kdKH)}</td>
                      <td className="py-2 pr-3 text-right text-slate-900">{formatVnd(tong.kdTH)}</td>
                      <td className="py-2 pr-3 text-right text-slate-900">{Math.round(pct(tong.kdTH, tong.kdKH))}%</td>
                      <td className="py-2 pr-3 text-right text-slate-900">{formatVnd(tong.thauKH)}</td>
                      <td className="py-2 pr-3 text-right text-slate-900">{formatVnd(tong.thauTH)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      {columns.map((c) => (
                        <th key={c} className="whitespace-nowrap px-3 py-2 font-semibold">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                        {columns.map((c) => (
                          <td key={c} className="whitespace-nowrap px-3 py-2 text-slate-700">{r[c] ?? ""}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
