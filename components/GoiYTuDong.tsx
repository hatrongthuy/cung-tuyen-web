"use client";

import { useState } from "react";
import { formatShortVnd } from "@/lib/format";
import type { CareItem } from "@/lib/report-utils";

// Gợi ý cung tuyến TỰ ĐỘNG — web tự sinh danh sách khách ưu tiên cần gặp cho từng nhân viên
// từ dữ liệu cảnh báo sẵn có (khách "chết", khách chưa viếng thăm, sản phẩm nghỉ), kèm đề xuất
// gặp mấy lần / mấy tuần. Chỉ để XEM — không thay đổi cách tính điểm cung tuyến.

const LOAI_LABEL: Record<string, string> = {
  chet: "Khách chết",
  "chua-tham": "Chưa viếng thăm",
  "sp-nghi": "Sản phẩm nghỉ",
};
const LOAI_RANK: Record<string, number> = { chet: 3, "chua-tham": 2, "sp-nghi": 1 };
const LOAI_CLS: Record<string, string> = {
  chet: "bg-red-50 text-red-700",
  "chua-tham": "bg-amber-50 text-amber-700",
  "sp-nghi": "bg-slate-100 text-slate-600",
};

function sortCare(items: CareItem[]): CareItem[] {
  return [...items].sort(
    (a, b) =>
      (LOAI_RANK[b.loai] ?? 0) - (LOAI_RANK[a.loai] ?? 0) ||
      b.doanhThu12T - a.doanhThu12T ||
      b.soNgay - a.soNgay
  );
}

function KhachCard({ it, stt }: { it: CareItem; stt: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-slate-900">
          #{stt} — {it.tenKhach}
          {it.caoGiaTri && (
            <span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
              ★ giá trị cao
            </span>
          )}
        </p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${LOAI_CLS[it.loai] ?? "bg-slate-100 text-slate-600"}`}>
          {LOAI_LABEL[it.loai] ?? it.loai}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-slate-500">
        {it.tinh ? `${it.tinh} · ` : ""}Hạng {it.hang || "—"} · {it.chiTiet}
        {it.doanhThu12T > 0 ? ` · DT12T ${formatShortVnd(it.doanhThu12T)}` : ""}
      </p>
      <p className="mt-1 text-[11px] font-medium text-emerald-700">
        Đề xuất: gặp {it.deXuatLan} lần / {it.deXuatTuan} tuần
        {it.caoGiaTri ? " — khai thác đơn giá trị cao" : " — hâm nóng, kích hoạt lại đơn"}
      </p>
    </div>
  );
}

export default function GoiYTuDong({
  careByEmp,
  order,
  defaultOpen = false,
}: {
  careByEmp: Record<string, CareItem[]>;
  /** Thứ tự nhân viên để hiển thị (gồm cả người 0 gợi ý). */
  order: { ma: string; hoTen: string }[];
  /** true = mở sẵn tất cả (dùng cho trang nhân viên chỉ có 1 người). */
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const isOpen = (ma: string) => (ma in open ? open[ma] : defaultOpen);
  const toggle = (ma: string) => setOpen((o) => ({ ...o, [ma]: !isOpen(ma) }));

  const tongGoiY = order.reduce((s, e) => s + (careByEmp[e.hoTen]?.length ?? 0), 0);

  return (
    <div>
      <p className="text-xs text-slate-400">
        Web tự sinh từ dữ liệu cảnh báo (khách chết, chưa viếng thăm, sản phẩm nghỉ) — xếp theo mức ưu tiên,
        kèm đề xuất tần suất gặp. Tổng cộng <b>{tongGoiY}</b> khách nên gặp.
      </p>
      <div className="mt-3 space-y-2">
        {order.map((e) => {
          const items = sortCare(careByEmp[e.hoTen] ?? []);
          const opened = isOpen(e.ma);
          return (
            <div key={e.ma} className="rounded-xl border border-slate-200">
              <button
                onClick={() => toggle(e.ma)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
              >
                <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                  <span className={`inline-block transition-transform ${opened ? "rotate-90" : ""}`}>▶</span>
                  {e.hoTen}
                </span>
                <span className="text-xs text-slate-500">
                  {items.length > 0 ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                      {items.length} khách nên gặp
                    </span>
                  ) : (
                    <span className="text-slate-400">Không có gợi ý</span>
                  )}
                </span>
              </button>
              {opened && items.length > 0 && (
                <div className="grid gap-2 border-t border-slate-100 bg-slate-50/60 p-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((it, i) => (
                    <KhachCard key={`${it.tenKhach}-${i}`} it={it} stt={i + 1} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
