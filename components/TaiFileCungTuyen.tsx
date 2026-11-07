"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";

export interface CungTuyenRow {
  maKH: string;
  tenKH: string;
  diaChi: string;
  /** "Mục tiêu chuyến thăm" — có tiền tố "[Thứ N] …" để suy ra ngày. */
  muc: string;
  diem: string;
  /** Trạng thái xác nhận tuần này: "Đồng ý" | "Không đồng ý" | undefined */
  trangThai?: string;
}

// 10 cột đúng mẫu công ty.
const HEADERS = [
  "id",
  "name",
  "address",
  "note",
  "quantity",
  "priority",
  "evaluate",
  "action",
  "date",
  "session",
];

function parseThu(muc: string): number | null {
  const m = muc.match(/\[Thứ\s*(\d)\]/);
  return m ? Number(m[1]) : null;
}

export default function TaiFileCungTuyen({
  rows,
  tenNhanVien,
}: {
  rows: CungTuyenRow[];
  tenNhanVien: string;
}) {
  const [msg, setMsg] = useState<string | null>(null);

  const daDongY = useMemo(
    () => rows.filter((r) => r.trangThai === "Đồng ý"),
    [rows]
  );

  function tai() {
    if (daDongY.length === 0) {
      setMsg("Chưa có khách nào được xác nhận đồng ý để tải.");
      return;
    }
    const data: (string | number)[][] = [HEADERS];
    for (const r of daDongY) {
      const thu = parseThu(r.muc);
      const note = r.muc.replace(/^\[Thứ\s*\d\]\s*/, "").trim();
      data.push([
        r.maKH,
        r.tenKH,
        r.diaChi,
        note,
        1,
        Number(r.diem) || "",
        "",
        "bán sản phẩm",
        thu ?? "",
        thu === 7 ? "S" : "CN",
      ]);
    }
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = [
      { wch: 14 },
      { wch: 40 },
      { wch: 40 },
      { wch: 50 },
      { wch: 9 },
      { wch: 9 },
      { wch: 10 },
      { wch: 16 },
      { wch: 7 },
      { wch: 9 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Trang tính1");
    const ten = `Cung tuyen da xac nhan - ${tenNhanVien || "nhan vien"}.xlsx`.replace(
      /[\\/:*?"<>|]/g,
      "_"
    );
    XLSX.writeFile(wb, ten);
    setMsg(`Đã tải ${daDongY.length} khách đã xác nhận.`);
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={tai}
        className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700"
      >
        ⬇️ Tải file đã xác nhận ({daDongY.length} khách)
      </button>
      <p className="text-[11px] text-slate-400">
        File Excel 10 cột theo mẫu công ty — chỉ gồm khách bạn đã bấm &quot;Xác nhận đã gặp&quot;.
        Dùng để tải lên web công ty.
      </p>
      {msg && <p className="text-[11px] text-emerald-600">{msg}</p>}
    </div>
  );
}
