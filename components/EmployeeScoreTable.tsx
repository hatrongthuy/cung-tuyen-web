"use client";

import { useState } from "react";
import type { EmployeeWeekSummary } from "@/lib/aggregate";

function TrangThaiTag({ trangThai }: { trangThai?: string }) {
  if (trangThai === "Đồng ý") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
        Đã gặp
      </span>
    );
  }
  if (trangThai) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
        Không đồng ý
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
      Chưa phản hồi
    </span>
  );
}

/**
 * Bảng điểm cung tuyến tuần theo nhân viên — bấm vào một dòng (hoặc vào số gợi ý)
 * để xổ ra danh sách khách hàng cụ thể được gợi ý cho nhân viên đó tuần này.
 */
export default function EmployeeScoreTable({
  summaries,
}: {
  summaries: EmployeeWeekSummary[];
}) {
  const [maDangMo, setMaDangMo] = useState<string | null>(null);

  function toggle(ma: string) {
    setMaDangMo((cur) => (cur === ma ? null : ma));
  }

  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-xs">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            <th className="py-2 pr-3 font-medium">Nhân viên</th>
            <th className="py-2 pr-3 font-medium">Số gợi ý</th>
            <th className="py-2 pr-3 font-medium">Đã đồng ý</th>
            <th className="py-2 pr-3 font-medium">Tỷ lệ hoàn thành</th>
            <th className="py-2 pr-3 font-medium">Điểm cung tuyến</th>
          </tr>
        </thead>
        <tbody>
          {summaries.map((s) => {
            const dangMo = maDangMo === s.maNhanVien;
            return (
              <>
                <tr
                  key={s.maNhanVien}
                  onClick={() => toggle(s.maNhanVien)}
                  className="cursor-pointer border-b border-slate-100 transition hover:bg-slate-50"
                  title="Bấm để xem danh sách khách hàng cụ thể"
                >
                  <td className="py-2 pr-3 font-medium text-slate-800">
                    <span className="inline-flex items-center gap-1">
                      <span
                        className={`inline-block transition-transform ${dangMo ? "rotate-90" : ""}`}
                      >
                        ▶
                      </span>
                      {s.hoTen}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-slate-600 underline decoration-dotted underline-offset-2">
                    {s.soGoiY}
                  </td>
                  <td className="py-2 pr-3 text-slate-600">{s.soDongY}</td>
                  <td className="py-2 pr-3 text-slate-600">
                    {Math.round(s.tyLeHoanThanh * 100)}%
                  </td>
                  <td className="py-2 pr-3 font-semibold text-slate-900">
                    {s.diemCungTuyen ?? "—"}
                  </td>
                </tr>
                {dangMo && (
                  <tr key={`${s.maNhanVien}-chi-tiet`} className="border-b border-slate-100">
                    <td colSpan={5} className="bg-slate-50/80 px-3 py-3">
                      {s.khachGoiY.length === 0 ? (
                        <p className="text-xs text-slate-400">
                          Không có khách hàng nào được gợi ý cho nhân viên này tuần này.
                        </p>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {s.khachGoiY.map((k) => (
                            <div
                              key={k.maKH}
                              className="rounded-lg border border-slate-200 bg-white p-2.5"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs font-medium text-slate-900">
                                  #{k.thuTuUuTien} — {k.tenKH}{" "}
                                  <span className="font-normal text-slate-400">({k.maKH})</span>
                                </p>
                                <TrangThaiTag trangThai={k.trangThai} />
                              </div>
                              <p className="mt-1 text-[11px] text-slate-500">
                                {k.diaChi} · {k.tinh} · Nhóm {k.nhomKH} · Hạng {k.hang}
                              </p>
                              {k.mucTieu && (
                                <p className="mt-1 text-[11px] text-slate-600">{k.mucTieu}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
