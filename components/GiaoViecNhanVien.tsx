"use client";

import { useMemo, useState } from "react";
import { isoWeekKey, nextWeekKey, weekLabel } from "@/lib/tuan";

export interface GiaoViecItem {
  id: string;
  thoiDiem: string;
  nguoiGiao: string;
  maNV: string;
  tenNV: string;
  tuan: string;
  noiDung: string;
  uuTien: string;
  han: string;
  trangThai: string;
  capNhat: string;
  ghiChu: string;
  nguon?: string;
  khoaNguon?: string;
}

const TT_STYLE: Record<string, string> = {
  "Chưa làm": "bg-slate-100 text-slate-600",
  "Đang làm": "bg-amber-100 text-amber-700",
  "Hoàn thành": "bg-emerald-100 text-emerald-700",
};
const UT_STYLE: Record<string, string> = {
  Cao: "bg-red-100 text-red-700",
  "Bình thường": "bg-sky-100 text-sky-700",
  Thấp: "bg-slate-100 text-slate-500",
};

export default function GiaoViecNhanVien({
  initialTasks,
  variant = "full",
}: {
  initialTasks: GiaoViecItem[];
  /** "home": gọn, chỉ tuần này + link; "full": đầy đủ, có bộ lọc tuần. */
  variant?: "home" | "full";
}) {
  const [tasks, setTasks] = useState<GiaoViecItem[]>(initialTasks);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [noteVal, setNoteVal] = useState("");

  const thisWeek = isoWeekKey();
  const nextWk = nextWeekKey();
  const [filter, setFilter] = useState<"tuan-nay" | "tuan-sau" | "tat-ca">("tuan-nay");

  async function refresh() {
    try {
      const res = await fetch("/api/giao-viec", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.ok) setTasks(data.tasks as GiaoViecItem[]);
    } catch {
      /* giữ nguyên dữ liệu cũ */
    }
  }

  async function capNhat(id: string, patch: { trangThai?: string; ghiChu?: string }) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch("/api/giao-viec", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Có lỗi xảy ra");
      // Cập nhật lạc quan tại chỗ + đồng bộ lại từ máy chủ.
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
      );
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setBusy(null);
    }
  }

  const shown = useMemo(() => {
    let ds = tasks;
    if (variant === "home") {
      // Trang chủ: việc tuần này + các việc tuần trước CHƯA hoàn thành (tồn đọng).
      ds = tasks.filter(
        (t) => t.tuan === thisWeek || (t.tuan < thisWeek && t.trangThai !== "Hoàn thành")
      );
    } else if (filter === "tuan-nay") ds = tasks.filter((t) => t.tuan === thisWeek);
    else if (filter === "tuan-sau") ds = tasks.filter((t) => t.tuan === nextWk);
    // sắp xếp: chưa xong trước, ưu tiên cao trước
    const utRank: Record<string, number> = { Cao: 0, "Bình thường": 1, Thấp: 2 };
    const ttRank: Record<string, number> = { "Đang làm": 0, "Chưa làm": 1, "Hoàn thành": 2 };
    return [...ds].sort(
      (a, b) =>
        (ttRank[a.trangThai] ?? 1) - (ttRank[b.trangThai] ?? 1) ||
        (utRank[a.uuTien] ?? 1) - (utRank[b.uuTien] ?? 1)
    );
  }, [tasks, filter, variant, thisWeek, nextWk]);

  const chuaXong = shown.filter((t) => t.trangThai !== "Hoàn thành").length;

  return (
    <div>
      {variant === "full" ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {[
            ["tuan-nay", `Tuần này (${weekLabel(thisWeek)})`],
            ["tuan-sau", `Tuần sau (${weekLabel(nextWk)})`],
            ["tat-ca", "Tất cả"],
          ].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k as typeof filter)}
              className={
                filter === k
                  ? "rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white"
                  : "rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
              }
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

      {shown.length === 0 ? (
        <p className="text-sm text-slate-400">
          {variant === "home"
            ? "Chưa có việc nào được giao cho tuần này. 🎉"
            : "Không có việc nào trong mục này."}
        </p>
      ) : (
        <div className="space-y-3">
          {variant === "home" && (
            <p className="text-xs text-slate-500">
              Bạn có <b>{chuaXong}</b> việc chưa hoàn thành.
            </p>
          )}
          {shown.map((t) => {
            const tonDong = variant === "home" && t.tuan < thisWeek && t.trangThai !== "Hoàn thành";
            return (
              <div
                key={t.id}
                className="rounded-xl border border-slate-100 bg-slate-50/60 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          UT_STYLE[t.uuTien] ?? UT_STYLE["Bình thường"]
                        }`}
                      >
                        {t.uuTien || "Bình thường"}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          TT_STYLE[t.trangThai] ?? TT_STYLE["Chưa làm"]
                        }`}
                      >
                        {t.trangThai || "Chưa làm"}
                      </span>
                      {tonDong && (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600">
                          Tồn đọng · {weekLabel(t.tuan)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{t.noiDung}</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {t.nguoiGiao ? `Giao bởi ${t.nguoiGiao}` : ""}
                      {t.han ? ` · Hạn: ${t.han}` : ""}
                      {` · Tuần ${weekLabel(t.tuan)}`}
                    </p>
                    {t.ghiChu ? (
                      <p className="mt-1 rounded-lg bg-white px-2 py-1 text-xs text-slate-600">
                        Ghi chú: {t.ghiChu}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {t.trangThai !== "Đang làm" && t.trangThai !== "Hoàn thành" && (
                    <button
                      onClick={() => capNhat(t.id, { trangThai: "Đang làm" })}
                      disabled={busy === t.id}
                      className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                    >
                      Bắt đầu làm
                    </button>
                  )}
                  {t.trangThai !== "Hoàn thành" ? (
                    <button
                      onClick={() => capNhat(t.id, { trangThai: "Hoàn thành" })}
                      disabled={busy === t.id}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {busy === t.id ? "Đang lưu…" : "✅ Hoàn thành"}
                    </button>
                  ) : (
                    <button
                      onClick={() => capNhat(t.id, { trangThai: "Chưa làm" })}
                      disabled={busy === t.id}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Mở lại
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setNoteFor(noteFor === t.id ? null : t.id);
                      setNoteVal(t.ghiChu || "");
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    {t.ghiChu ? "Sửa ghi chú" : "Thêm ghi chú"}
                  </button>
                </div>

                {noteFor === t.id && (
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <input
                      value={noteVal}
                      onChange={(e) => setNoteVal(e.target.value)}
                      placeholder="Ghi chú / kết quả…"
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                    />
                    <button
                      onClick={async () => {
                        await capNhat(t.id, { ghiChu: noteVal.trim() });
                        setNoteFor(null);
                      }}
                      disabled={busy === t.id}
                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      Lưu ghi chú
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {variant === "home" && (
        <a
          href="/nhan-vien/giao-viec"
          className="mt-3 inline-block text-xs font-medium text-sky-600 hover:underline"
        >
          Xem tất cả việc được giao →
        </a>
      )}
    </div>
  );
}
