"use client";

import { useMemo, useState } from "react";

export interface SanPhamUI {
  id: string;
  nhom: string;
  ten: string;
  hoatChat: string;
  quyCach: string;
  gia: string;
}

export interface CatalogUI {
  id: string;
  ten: string;
  moTa: string;
  pdf: string;
  cover: string;
  kichThuoc: string;
  sanPham: SanPhamUI[];
}

const XANH = "#1baf7a";

function khongDau(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export default function BaoGiaView({
  catalogs,
  suaDuoc,
  ngayCapNhat,
}: {
  catalogs: CatalogUI[];
  suaDuoc: boolean;
  ngayCapNhat: string;
}) {
  const [data, setData] = useState<CatalogUI[]>(catalogs);
  const [catActive, setCatActive] = useState<string>(catalogs[0]?.id ?? "");
  const [tuKhoa, setTuKhoa] = useState("");

  // Chế độ chỉnh sửa giá (chỉ quản lý)
  const [dangSua, setDangSua] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [dangLuu, setDangLuu] = useState(false);
  const [thongBao, setThongBao] = useState<{ loai: "ok" | "loi"; text: string } | null>(null);

  const catalog = data.find((c) => c.id === catActive) ?? data[0];

  const giaGoc = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of data) for (const sp of c.sanPham) m.set(sp.id, sp.gia);
    return m;
  }, [data]);

  const soThayDoi = useMemo(
    () => Object.entries(edits).filter(([id, gia]) => gia !== giaGoc.get(id)).length,
    [edits, giaGoc]
  );

  const nhomList = useMemo(() => {
    if (!catalog) return [] as [string, SanPhamUI[]][];
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
    const map = new Map<string, SanPhamUI[]>();
    for (const sp of loc) {
      if (!map.has(sp.nhom)) map.set(sp.nhom, []);
      map.get(sp.nhom)!.push(sp);
    }
    return Array.from(map.entries());
  }, [catalog, tuKhoa]);

  const soKetQua = nhomList.reduce((n, [, arr]) => n + arr.length, 0);

  function batDauSua() {
    setThongBao(null);
    setEdits({});
    setDangSua(true);
  }
  function huySua() {
    setEdits({});
    setDangSua(false);
    setThongBao(null);
  }

  async function luu() {
    const updates = Object.entries(edits)
      .filter(([id, gia]) => gia !== giaGoc.get(id))
      .map(([id, gia]) => ({ id, gia }));
    if (updates.length === 0) {
      setDangSua(false);
      return;
    }
    setDangLuu(true);
    setThongBao(null);
    try {
      const res = await fetch("/api/bao-gia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Lưu thất bại");
      // Cập nhật vào bảng đang hiển thị
      const m = new Map(updates.map((u) => [u.id, u.gia]));
      setData((prev) =>
        prev.map((c) => ({
          ...c,
          sanPham: c.sanPham.map((sp) => (m.has(sp.id) ? { ...sp, gia: m.get(sp.id)! } : sp)),
        }))
      );
      setEdits({});
      setDangSua(false);
      setThongBao({ loai: "ok", text: `Đã lưu ${updates.length} thay đổi giá.` });
    } catch (e) {
      setThongBao({ loai: "loi", text: e instanceof Error ? e.message : "Lưu thất bại" });
    } finally {
      setDangLuu(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* ---- Thẻ tải catalogue ---- */}
      <section>
        <h2 className="text-sm font-semibold text-slate-900">Bộ báo giá (PDF)</h2>
        <p className="mt-0.5 text-xs text-slate-400">
          Bấm để xem hoặc tải file gốc gửi cho khách hàng. Cập nhật: {ngayCapNhat}.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
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
          <div className="flex items-center gap-2">
            {suaDuoc &&
              (dangSua ? (
                <>
                  <button
                    onClick={luu}
                    disabled={dangLuu}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                    style={{ backgroundColor: XANH }}
                  >
                    {dangLuu ? "Đang lưu…" : `Lưu${soThayDoi ? ` (${soThayDoi})` : ""}`}
                  </button>
                  <button
                    onClick={huySua}
                    disabled={dangLuu}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Huỷ
                  </button>
                </>
              ) : (
                <button
                  onClick={batDauSua}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  ✏️ Chỉnh sửa giá
                </button>
              ))}
            {!dangSua && (
              <input
                type="search"
                value={tuKhoa}
                onChange={(e) => setTuKhoa(e.target.value)}
                placeholder="Tìm sản phẩm, hoạt chất…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400 sm:w-64"
              />
            )}
          </div>
        </div>

        {thongBao && (
          <p
            className={
              thongBao.loai === "ok"
                ? "mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700"
                : "mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
            }
          >
            {thongBao.text}
          </p>
        )}
        {dangSua && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Đang ở chế độ sửa giá. Sửa trực tiếp ô giá bên phải (nhớ kèm đơn vị, ví dụ{" "}
            <span className="font-medium">290.000 VNĐ/lọ</span>), rồi bấm <b>Lưu</b>. Có thể sửa qua
            nhiều nhóm/bộ trước khi lưu.
          </p>
        )}

        {/* Tab chọn catalogue */}
        <nav className="mt-4 flex flex-wrap gap-1">
          {data.map((c) => (
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
                <NhomBlock
                  key={nhom}
                  nhom={nhom}
                  arr={arr}
                  dangSua={dangSua}
                  edits={edits}
                  setEdits={setEdits}
                />
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

function NhomBlock({
  nhom,
  arr,
  dangSua,
  edits,
  setEdits,
}: {
  nhom: string;
  arr: SanPhamUI[];
  dangSua: boolean;
  edits: Record<string, string>;
  setEdits: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
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
      {arr.map((sp) => (
        <tr key={sp.id} className="border-b border-slate-100 align-top">
          <td className="py-2 pr-3">
            <p className="font-medium text-slate-900">{sp.ten}</p>
            <p className="text-xs text-slate-500">{sp.hoatChat}</p>
          </td>
          <td className="py-2 pr-3 text-xs text-slate-600">{sp.quyCach}</td>
          <td className="py-2 pr-3 text-right font-semibold whitespace-nowrap text-slate-900">
            {dangSua ? (
              <input
                type="text"
                value={edits[sp.id] ?? sp.gia}
                onChange={(e) =>
                  setEdits((prev) => ({ ...prev, [sp.id]: e.target.value }))
                }
                className="w-44 rounded-md border border-slate-300 px-2 py-1 text-right text-sm font-semibold outline-none focus:border-emerald-500"
              />
            ) : (
              sp.gia
            )}
          </td>
        </tr>
      ))}
    </>
  );
}
