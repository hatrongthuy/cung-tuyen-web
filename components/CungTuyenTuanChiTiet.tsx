"use client";

import { useState } from "react";

export interface NVCungTuyenChiTiet {
  maNV: string;
  hoTen: string;
  planKH: number;
  daGhe: number;
  tyLe: number;
  khach: Array<{ thu: number; ngay: string; maTC: string; ten: string; daGhe: boolean }>;
}

const THU_LABEL: Record<number, string> = { 2: "T2", 3: "T3", 4: "T4", 5: "T5", 6: "T6", 7: "T7", 8: "CN" };

export default function CungTuyenTuanChiTiet({ nhanViens }: { nhanViens: NVCungTuyenChiTiet[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (ma: string) => setOpen((o) => ({ ...o, [ma]: !o[ma] }));

  if (nhanViens.every((e) => e.khach.length === 0)) {
    return <p className="text-xs text-slate-400">Chưa có cung tuyến nào được lập trong tuần này trên file check‑call.</p>;
  }

  return (
    <div className="space-y-2">
      {nhanViens.map((e) => {
        const opened = open[e.maNV] ?? false;
        // gom theo ngày
        const byDay = new Map<string, typeof e.khach>();
        for (const k of e.khach) {
          const arr = byDay.get(k.ngay) ?? byDay.set(k.ngay, []).get(k.ngay)!;
          arr.push(k);
        }
        const days = [...byDay.keys()].sort((a, b) => {
          const [da, ma] = a.split("/").map(Number);
          const [db, mb] = b.split("/").map(Number);
          return ma - mb || da - db;
        });
        return (
          <div key={e.maNV} className="rounded-xl border border-slate-200">
            <button
              onClick={() => toggle(e.maNV)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
            >
              <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                <span className={`inline-block transition-transform ${opened ? "rotate-90" : ""}`}>▶</span>
                {e.hoTen}
              </span>
              <span className="text-[11px] text-slate-500">
                {e.khach.length} khách · đã ghé {e.daGhe}/{e.planKH} ({e.tyLe}%)
              </span>
            </button>
            {opened && (
              <div className="border-t border-slate-100 bg-slate-50/60 p-3">
                {days.map((ngay) => {
                  const ks = byDay.get(ngay)!;
                  const thu = ks[0]?.thu;
                  return (
                    <div key={ngay} className="mb-3 last:mb-0">
                      <p className="mb-1 text-[11px] font-semibold text-slate-500">
                        {THU_LABEL[thu] ?? ""} · {ngay} <span className="font-normal">({ks.filter((k) => k.daGhe).length}/{ks.length} đã ghé)</span>
                      </p>
                      <ul className="space-y-1">
                        {ks.map((k, i) => (
                          <li key={`${k.maTC}-${i}`} className="flex items-start gap-1.5 rounded-lg bg-white px-2 py-1.5 text-xs">
                            <span className={k.daGhe ? "text-emerald-600" : "text-slate-300"}>
                              {k.daGhe ? "✓" : "○"}
                            </span>
                            <span className={k.daGhe ? "text-slate-800" : "text-slate-500"}>{k.ten || k.maTC}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
