"use client";

import { useMemo, useState } from "react";
import { CATALOGS, NGAY_CAP_NHAT, type SanPham } from "@/lib/bao-gia-data";

const XANH = "#1baf7a";

function khongDau(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export default function BaoGiaView() {
  const [catActive, setCatActive] = useState<string>(CATALOGS[0].id);
  const [tuKhoa, setTuKhoa] = useState("");

  const catalog = CATALOGS.find((c) => c.id === catActive)!;

  const nhomList = useMemo(() => {
    const q = khongDau(tuKhoa.trim());
    const loc = catalog.sanPham.filter((sp) => {
      if (!q) return true;
      return (
        khongDau(sp.ten).includes(q) ||
        khongDau(sp.hoatChat).includes(q) ||
        khongDau(sp.nhom).includes(q) ||
        khongDau(sp.quyCach).includes(q)
      );
    });
    const map = new Map<string, SanPham[]>();
    for (const sp of loc) {
      if (!map.has(sp.nhom)) map.set(sp.nhom, []);
      map.get(sp.nhom)!.push(sp);
    }
    return Array.from(map.entries());
  }, [catalog, tuKhoa]);

  const soKetQua = nhomList.reduce((n, [, arr]) => n + arr.length, 0);

  return (
    <div className="space-y-8">
      {/* ---- Thẻ tải catalogue ---- */}
      <section>
        <h2 className="text-sm font-semibold text-slate-900">Bộ báo giá (PDF)</h2>
        <p className="mt-0.5 text-xs text-slate-400">
          Bấm để xem hoặc tải file gốc gửi cho khách hàng. Cập nhật: {NGAY_CAP_NHAT}.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATALOGS.map((c) => (
            <div
              key={c.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex gap-3 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.cover}
                  alt={c.ten}
                  className="h-28 w-20 shrink-0 rounded-lg border border-slate-100 object-cover"
                  loading="lazy"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{c.ten}</p>
                  <p className="mt-1 line-clamp-3 text-xs text-slate-500">{c.moTa}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    {c.sanPham.length} sản phẩm · PDF {c.kichThuoc}
                  </p>
                </div>
              </div>
              <div className="mt-auto flex gap-2 border-t border-slate-100 p-3">
                <a
                  href={c.pdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-lg px-3 py-1.5 text-center text-xs font-medium text-white"
                  style={{ backgroundColor: XANH }}
                >
                  Xem PDF
                </a>
                <a
                  href={c.pdf}
                  download
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-center text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Tải về
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Bảng giá tra cứu ---- */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Bảng giá tra cứu</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Giá đã bao gồm VAT. Tra theo tên thuốc, hoạt chất hoặc nhóm.
            </p>
          </div>
          <input
            type="search"
            value={tuKhoa}
            onChange={(e) => setTuKhoa(e.target.value)}
            placeholder="Tìm sản phẩm, hoạt chất…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400 sm:w-72"
          />
        </div>

        {/* Tab chọn catalogue */}
        <nav className="mt-4 flex flex-wrap gap-1">
          {CATALOGS.map((c) => (
            <button
              key={c.id}
              onClick={() => setCatActive(c.id)}
              className={
                c.id === catActive
                  ? "rounded-lg px-3 py-1.5 text-xs font-medium text-white"
                  : "rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
              }
              style={c.id === catActive ? { backgroundColor: XANH } : undefined}
            >
              {c.ten.replace(/^Báo giá |^Catalogue /, "")}
            </button>
          ))}
        </nav>

        <p className="mt-3 text-xs text-slate-400">{soKetQua} sản phẩm</p>

        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="py-2 pr-3 font-medium">Sản phẩm / Hoạt chất</th>
                <th className="py-2 pr-3 font-medium">Quy cách</th>
                <th className="py-2 pr-3 text-right font-medium whitespace-nowrap">Giá (đã VAT)</th>
              </tr>
            </thead>
            <tbody>
              {nhomList.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-sm text-slate-400">
                    Không tìm thấy sản phẩm phù hợp.
                  </td>
                </tr>
              )}
              {nhomList.map(([nhom, arr]) => (
                <NhomBlock key={nhom} nhom={nhom} arr={arr} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-center text-xs text-slate-400">
        Báo giá do CPC1 Hà Nội phát hành. File PDF là bản gốc có giá trị tham khảo chính thức.
      </p>
    </div>
  );
}

function NhomBlock({ nhom, arr }: { nhom: string; arr: SanPham[] }) {
  return (
    <>
      <tr>
        <td
          colSpan={3}
          className="bg-slate-50 px-1 py-1.5 text-xs font-semibold tracking-wide text-slate-600 uppercase"
        >
          {nhom}
        </td>
      </tr>
      {arr.map((sp, i) => (
        <tr key={sp.ten + sp.quyCach + i} className="border-b border-slate-100 align-top">
          <td className="py-2 pr-3">
            <p className="font-medium text-slate-900">{sp.ten}</p>
            <p className="text-xs text-slate-500">{sp.hoatChat}</p>
          </td>
          <td className="py-2 pr-3 text-xs text-slate-600">{sp.quyCach}</td>
          <td className="py-2 pr-3 text-right font-semibold whitespace-nowrap text-slate-900">
            {sp.gia}
          </td>
        </tr>
      ))}
    </>
  );
}
