"use client";

import { useState } from "react";
import TaiFileCungTuyen, { type CungTuyenRow } from "@/components/TaiFileCungTuyen";

export interface SSRow extends CungTuyenRow {
  lyDo?: string;
}

export interface NhanVienCungTuyen {
  maNV: string;
  hoTen: string;
  rows: SSRow[];
}

function badge(trangThai?: string) {
  if (trangThai === "Đồng ý")
    return "bg-emerald-100 text-emerald-700";
  if (trangThai === "Không đồng ý")
    return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-500";
}
function nhan(trangThai?: string) {
  if (trangThai === "Đồng ý") return "Đồng ý";
  if (trangThai === "Không đồng ý") return "Không đi";
  return "Chưa xác nhận";
}

export default function CungTuyenSSView({
  nhanViens,
}: {
  nhanViens: NhanVienCungTuyen[];
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const isOpen = (ma: string) => open[ma] ?? false;

  const tongKH = nhanViens.reduce((s, e) => s + e.rows.length, 0);

  if (tongKH === 0) {
    return (
      <p className="text-sm text-slate-400">
        Chưa có cung tuyến trong tab &quot;Gợi ý tập trung&quot;. Dán danh sách khách tuần này vào
        sheet để nhân viên xác nhận.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {nhanViens.map((e) => {
        const dongY = e.rows.filter((r) => r.trangThai === "Đồng ý").length;
        const khong = e.rows.filter((r) => r.trangThai === "Không đồng ý").length;
        const chua = e.rows.length - dongY - khong;
        const opened = isOpen(e.maNV);
        return (
          <div key={e.maNV} className="rounded-xl border border-slate-200">
            <button
              onClick={() => setOpen((o) => ({ ...o, [e.maNV]: !opened }))}
              className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
            >
              <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                <span className={`inline-block transition-transform ${opened ? "rotate-90" : ""}`}>
                  ▶
                </span>
                {e.hoTen}
              </span>
              <span className="flex items-center gap-1.5 text-[11px]">
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                  {dongY} đồng ý
                </span>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
                  {khong} không đi
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-500">
                  {chua} chưa
                </span>
              </span>
            </button>

            {opened && (
              <div className="border-t border-slate-100 bg-slate-50/60 p-3">
                <div className="mb-3">
                  <TaiFileCungTuyen rows={e.rows} tenNhanVien={e.hoTen} />
                </div>
                <ul className="space-y-1.5">
                  {e.rows.map((r, i) => (
                    <li
                      key={`${r.maKH}-${i}`}
                      className="rounded-lg border border-slate-100 bg-white p-2.5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-900">
                            {r.tenKH}{" "}
                            <span className="font-normal text-slate-400">({r.maKH})</span>
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">{r.muc}</p>
                          {r.trangThai === "Không đồng ý" && r.lyDo && (
                            <p className="mt-0.5 text-[11px] font-medium text-amber-700">
                              Lý do không đi: {r.lyDo}
                            </p>
                          )}
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge(
                            r.trangThai
                          )}`}
                        >
                          {nhan(r.trangThai)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
