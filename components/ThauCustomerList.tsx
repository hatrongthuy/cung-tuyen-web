"use client";

import { useMemo, useState } from "react";
import type { KhachThau } from "@/lib/thau-data";

function formatVnDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("vi-VN");
}

function formatSo(n: number): string {
  return n.toLocaleString("vi-VN");
}

/** Thời hạn còn lại tới ngày hết hiệu lực: >=1 tháng hiện số tháng, dưới 1 tháng hiện số ngày. */
function hanConLai(d: Date | null): { text: string; tone: "red" | "amber" | "slate" } {
  if (!d) return { text: "—", tone: "slate" };
  const now = new Date();
  const ngay = Math.ceil((new Date(d).getTime() - now.getTime()) / 86400000);
  if (ngay <= 0) return { text: "Đã hết hạn", tone: "red" };
  if (ngay < 30) return { text: `${ngay} ngày`, tone: "amber" };
  const thang = Math.round(ngay / 30.44);
  return { text: `${thang} tháng`, tone: thang <= 3 ? "amber" : "slate" };
}

export default function ThauCustomerList({
  khachs,
  tinhOptions,
}: {
  khachs: KhachThau[];
  tinhOptions: string[];
}) {
  const [search, setSearch] = useState("");
  const [tinh, setTinh] = useState<string>("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return khachs.filter((kh) => {
      if (tinh && kh.tinh !== tinh) return false;
      if (!q) return true;
      return (
        kh.tenKhach.toLowerCase().includes(q) ||
        kh.maKhach.toLowerCase().includes(q) ||
        kh.sanPham.some((sp) => sp.tenMatHang.toLowerCase().includes(q))
      );
    });
  }, [khachs, search, tinh]);

  function toggle(maKhach: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(maKhach)) next.delete(maKhach);
      else next.add(maKhach);
      return next;
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên khách, mã khách hoặc tên sản phẩm..."
          className="flex-1 min-w-[220px] rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500"
        />
        <select
          value={tinh}
          onChange={(e) => setTinh(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500"
        >
          <option value="">Tất cả tỉnh</option>
          {tinhOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <p className="mt-2 text-xs text-slate-400">
        {filtered.length} / {khachs.length} khách hàng
      </p>

      <div className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
        {filtered.length === 0 && (
          <p className="p-4 text-center text-xs text-slate-400">Không tìm thấy khách hàng phù hợp.</p>
        )}
        {filtered.map((kh) => {
          const isOpen = expanded.has(kh.maKhach);
          return (
            <div key={kh.maKhach} className="bg-white">
              <button
                type="button"
                onClick={() => toggle(kh.maKhach)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {kh.tenKhach} <span className="font-normal text-slate-400">({kh.maKhach})</span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {kh.tinh} · {kh.sanPham.length} mặt hàng · Hạn gần nhất: {formatVnDate(kh.ngayHetHanGanNhat)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-right text-xs text-slate-500">
                    Doanh số còn lại
                    <br />
                    <span className="text-sm font-semibold text-slate-900">
                      {formatSo(Math.round(kh.tongDoanhSoConLai))}
                    </span>
                  </span>
                  <span className="text-slate-400">{isOpen ? "▲" : "▼"}</span>
                </div>
              </button>

              {isOpen && (
                <div className="overflow-x-auto border-t border-slate-100 bg-slate-50 px-4 py-3">
                  <table className="w-full min-w-[600px] text-xs">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="pb-1.5 pr-3 font-medium">Tên sản phẩm</th>
                        <th className="pb-1.5 pr-3 font-medium">SL kế hoạch</th>
                        <th className="pb-1.5 pr-3 font-medium">SL thực hiện</th>
                        <th className="pb-1.5 pr-3 font-medium">SL còn lại</th>
                        <th className="pb-1.5 pr-3 font-medium">% thực hiện</th>
                        <th className="pb-1.5 font-medium">Hạn còn lại</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-700">
                      {kh.sanPham.map((sp, i) => {
                        const han = hanConLai(sp.ngayHetHieuLuc);
                        const toneCls =
                          han.tone === "red"
                            ? "bg-red-50 text-red-700"
                            : han.tone === "amber"
                            ? "bg-amber-50 text-amber-700"
                            : "text-slate-500";
                        return (
                          <tr key={i} className="border-t border-slate-200/70">
                            <td className="py-1.5 pr-3">{sp.tenMatHang}</td>
                            <td className="py-1.5 pr-3">{formatSo(sp.slKeHoach)}</td>
                            <td className="py-1.5 pr-3">{formatSo(sp.slThucHien)}</td>
                            <td className="py-1.5 pr-3">{formatSo(sp.slConLai)}</td>
                            <td className="py-1.5 pr-3">{Math.round(sp.tyLeThucHien * 100)}%</td>
                            <td className="py-1.5">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${toneCls}`}
                                title={sp.ngayHetHieuLuc ? `Hết hiệu lực: ${formatVnDate(sp.ngayHetHieuLuc)}` : undefined}
                              >
                                {han.text}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
