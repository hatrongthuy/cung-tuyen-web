"use client";

import { useMemo } from "react";
import StatCard from "@/components/StatCard";
import EmployeeBarChart from "@/components/EmployeeBarChart";
import ReportToolbar from "@/components/ReportToolbar";
import { downloadCsv } from "@/lib/csv";
import type { LoginStatRow } from "@/lib/login-stats";

function trangThai(r: LoginStatRow): { label: string; cls: string } {
  if (!r.daTungVao) return { label: "Chưa vào bao giờ", cls: "bg-slate-100 text-slate-500" };
  const d = r.soNgayKhongVao ?? 999;
  if (d <= 7) return { label: "Đang hoạt động", cls: "bg-emerald-50 text-emerald-700" };
  if (d <= 14) return { label: "Thỉnh thoảng", cls: "bg-amber-50 text-amber-700" };
  return { label: "Lâu không vào", cls: "bg-red-50 text-red-700" };
}

export default function LoginStatsView({
  stats,
  totalRows,
}: {
  stats: LoginStatRow[];
  totalRows: number;
}) {
  const tong = useMemo(() => {
    const daVao = stats.filter((s) => s.daTungVao);
    const hoatDong = daVao.filter((s) => (s.soNgayKhongVao ?? 999) <= 7);
    const chuaVao = stats.filter((s) => !s.daTungVao);
    const lauKhongVao = daVao.filter((s) => (s.soNgayKhongVao ?? 0) > 14);
    return { tongNguoi: stats.length, daVao: daVao.length, hoatDong: hoatDong.length, chuaVao: chuaVao.length, lauKhongVao: lauKhongVao.length };
  }, [stats]);

  function exportCsv() {
    downloadCsv("thong-ke-dang-nhap", [
      ["Thống kê đăng nhập web — Nhóm PS Phú Thọ"],
      [],
      ["Người dùng", "Email", "Vai trò", "Số ngày vào", "Tổng lượt", "Lần cuối", "Số ngày chưa vào", "Trạng thái"],
      ...stats.map((s) => [
        s.hoTen,
        s.email,
        s.roleLabel,
        s.soNgay,
        s.soLan,
        s.lanCuoi ?? "—",
        s.soNgayKhongVao ?? "—",
        trangThai(s).label,
      ]),
    ]);
  }

  const chartData = stats.filter((s) => s.daTungVao).map((s) => ({ hoTen: s.hoTen, giaTri: s.soNgay }));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Thống kê đăng nhập</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Ai thường xuyên vào web, ai ít vào. Mỗi người tính tối đa 1 lượt/ngày.
          </p>
        </div>
        <ReportToolbar onExportCsv={exportCsv} className="no-print" />
      </div>

      <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Tổng người dùng" value={tong.tongNguoi} accentColor="#2a78d6" />
        <StatCard label="Đã từng vào" value={tong.daVao} accentColor="#1baf7a" />
        <StatCard label="Hoạt động (≤7 ngày)" value={tong.hoatDong} accentColor="#1baf7a" />
        <StatCard label="Lâu không vào (>14 ngày)" value={tong.lauKhongVao} accentColor="#eda100" />
        <StatCard label="Chưa vào bao giờ" value={tong.chuaVao} accentColor="#e34948" />
      </section>

      {totalRows === 0 && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Chưa ghi nhận lượt đăng nhập nào. Bộ đếm bắt đầu tính từ khi tính năng này được bật — số liệu sẽ
          xuất hiện dần khi mọi người đăng nhập. (Nếu đã có người vào mà vẫn trống, xem phần lưu ý ở cuối.)
        </p>
      )}

      {chartData.length > 0 && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Số ngày vào web theo người</h2>
          <EmployeeBarChart data={chartData} valueLabel="Số ngày có vào" />
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Chi tiết theo người</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="py-2 pr-3 font-medium">Người dùng</th>
                <th className="py-2 pr-3 font-medium">Vai trò</th>
                <th className="py-2 pr-3 text-right font-medium">Số ngày vào</th>
                <th className="py-2 pr-3 text-right font-medium">Tổng lượt</th>
                <th className="py-2 pr-3 font-medium">Lần cuối</th>
                <th className="py-2 pr-3 font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => {
                const tt = trangThai(s);
                return (
                  <tr key={s.email} className="border-b border-slate-100">
                    <td className="py-2 pr-3">
                      <div className="font-medium text-slate-800">{s.hoTen}</div>
                      <div className="text-[11px] text-slate-400">{s.email}</div>
                    </td>
                    <td className="py-2 pr-3 text-slate-600">{s.roleLabel}</td>
                    <td className="py-2 pr-3 text-right font-semibold text-slate-900">{s.soNgay}</td>
                    <td className="py-2 pr-3 text-right text-slate-700">{s.soLan}</td>
                    <td className="py-2 pr-3 text-slate-700">
                      {s.lanCuoi ?? "—"}
                      {s.soNgayKhongVao != null && s.soNgayKhongVao > 0 && (
                        <span className="text-slate-400"> ({s.soNgayKhongVao} ngày trước)</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${tt.cls}`}>{tt.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-4 text-xs text-slate-400">
        Ghi chú: mỗi lần mở web trong ngày chỉ tính 1 lượt cho mỗi người (theo giờ Việt Nam). &quot;Số ngày vào&quot;
        là số ngày khác nhau có truy cập — dùng để đánh giá mức độ thường xuyên. Bộ đếm chỉ tính từ khi bật tính năng.
      </p>
    </div>
  );
}
