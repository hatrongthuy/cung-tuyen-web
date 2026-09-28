"use client";

import { useMemo, useState } from "react";
import { weekLabel } from "@/lib/tuan";
import type { GiaoViecItem } from "./GiaoViecNhanVien";

const UU_TIEN = ["Cao", "Bình thường", "Thấp"] as const;

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

export interface GoiYItem {
  maNV: string;
  tenNV: string;
  tuan: string;
  noiDung: string;
  uuTien: string;
  khoaNguon: string;
  loai: string;
  tenKhach: string;
  tinh: string;
  soNgay: number;
}

export default function GiaoViecManager({
  employees,
  initialTasks,
  suggestions,
  currentWeek,
}: {
  employees: { ma: string; hoTen: string }[];
  initialTasks: GiaoViecItem[];
  suggestions: GoiYItem[];
  currentWeek: string; // khoá tuần ISO của tuần hiện tại
}) {
  const [tasks, setTasks] = useState<GiaoViecItem[]>(initialTasks);
  const thisWeek = currentWeek;

  // ---- Giao tự động ----
  const [dangGiao, setDangGiao] = useState(false);
  const [autoMsg, setAutoMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [xemGoiY, setXemGoiY] = useState(false);

  // ---- Bảng tổng ----
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editId, setEditId] = useState<string | null>(null);
  const [editNoiDung, setEditNoiDung] = useState("");
  const [editUuTien, setEditUuTien] = useState("Bình thường");

  // ---- Thêm thủ công ----
  const [moThuCong, setMoThuCong] = useState(false);
  const [chon, setChon] = useState<string[]>([]);
  const [tcNoiDung, setTcNoiDung] = useState("");
  const [tcUuTien, setTcUuTien] = useState("Bình thường");
  const [tcGui, setTcGui] = useState(false);
  const [tcMsg, setTcMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function refresh() {
    try {
      const res = await fetch("/api/giao-viec", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.ok) setTasks(data.tasks as GiaoViecItem[]);
    } catch {
      /* giữ dữ liệu cũ */
    }
  }

  // Số khách trong gợi ý đã có việc (theo khoá nguồn, cùng tuần) -> để biết còn bao nhiêu cần tạo.
  const daCoKhoa = useMemo(
    () => new Set(tasks.filter((t) => t.tuan === thisWeek && t.khoaNguon).map((t) => t.khoaNguon)),
    [tasks, thisWeek]
  );
  const goiYChuaTao = suggestions.filter((s) => !daCoKhoa.has(s.khoaNguon));

  async function giaoTuDong() {
    setAutoMsg(null);
    setDangGiao(true);
    try {
      const res = await fetch("/api/giao-viec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "auto", tuan: thisWeek }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Có lỗi xảy ra");
      await refresh();
      setAutoMsg({
        ok: true,
        text:
          data.taoMoi > 0
            ? `Đã tạo ${data.taoMoi} việc mới${data.boQua ? `, bỏ qua ${data.boQua} việc đã có` : ""}.`
            : "Tất cả việc đề xuất đã được giao trước đó — không có việc mới.",
      });
    } catch (e) {
      setAutoMsg({ ok: false, text: e instanceof Error ? e.message : "Có lỗi xảy ra" });
    } finally {
      setDangGiao(false);
    }
  }

  async function luuSua(id: string) {
    setBusy(id);
    try {
      const res = await fetch("/api/giao-viec", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, noiDung: editNoiDung.trim(), uuTien: editUuTien }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, noiDung: editNoiDung.trim(), uuTien: editUuTien } : t))
        );
        setEditId(null);
      }
    } catch {
      /* bỏ qua */
    } finally {
      setBusy(null);
    }
  }

  async function xoa(id: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/giao-viec?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.ok) setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch {
      /* bỏ qua */
    } finally {
      setBusy(null);
    }
  }

  async function themThuCong() {
    setTcMsg(null);
    if (chon.length === 0) return setTcMsg({ ok: false, text: "Chọn ít nhất 1 nhân viên." });
    if (!tcNoiDung.trim()) return setTcMsg({ ok: false, text: "Nhập nội dung công việc." });
    setTcGui(true);
    try {
      const res = await fetch("/api/giao-viec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maNVs: chon, noiDung: tcNoiDung.trim(), uuTien: tcUuTien, tuan: thisWeek }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Có lỗi xảy ra");
      setTcMsg({ ok: true, text: `Đã giao cho ${chon.length} nhân viên.` });
      setTcNoiDung("");
      setChon([]);
      await refresh();
    } catch (e) {
      setTcMsg({ ok: false, text: e instanceof Error ? e.message : "Có lỗi xảy ra" });
    } finally {
      setTcGui(false);
    }
  }

  // Việc tuần này gộp theo nhân viên.
  const norm = (v: string) => v.trim().replace(/^0+(?=\d)/, "");
  const tuanNay = useMemo(() => tasks.filter((t) => t.tuan === thisWeek), [tasks, thisWeek]);
  const byEmp = useMemo(() => {
    return employees.map((e) => {
      const list = tuanNay
        .filter((t) => norm(t.maNV) === norm(e.ma))
        .sort((a, b) => {
          const ut: Record<string, number> = { Cao: 0, "Bình thường": 1, Thấp: 2 };
          const tt: Record<string, number> = { "Đang làm": 0, "Chưa làm": 1, "Hoàn thành": 2 };
          return (tt[a.trangThai] ?? 1) - (tt[b.trangThai] ?? 1) || (ut[a.uuTien] ?? 1) - (ut[b.uuTien] ?? 1);
        });
      const done = list.filter((t) => t.trangThai === "Hoàn thành").length;
      const doing = list.filter((t) => t.trangThai === "Đang làm").length;
      return { emp: e, list, done, doing, tong: list.length };
    });
  }, [employees, tuanNay]);

  const tongViec = tuanNay.length;
  const tongXong = tuanNay.filter((t) => t.trangThai === "Hoàn thành").length;

  // Gợi ý gộp theo nhân viên (để xem trước).
  const goiYByEmp = useMemo(() => {
    const m = new Map<string, GoiYItem[]>();
    for (const g of goiYChuaTao) {
      const k = g.tenNV;
      (m.get(k) ?? m.set(k, []).get(k)!).push(g);
    }
    return [...m.entries()];
  }, [goiYChuaTao]);

  return (
    <div className="space-y-6">
      {/* ---- Giao việc tự động từ báo cáo tuần ---- */}
      <section className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">
          ⚡ Giao việc tự động từ báo cáo tuần — {weekLabel(thisWeek)}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Web tự đề xuất việc cho từng nhân viên dựa trên khách cần chăm (chưa viếng thăm, khách
          &quot;chết&quot;, sản phẩm nghỉ, đi ắng, kế thừa). Bấm nút để giao cả loạt — sau đó bạn có thể
          sửa nội dung/ưu tiên hoặc xoá từng việc ở bảng bên dưới.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={giaoTuDong}
            disabled={dangGiao || goiYChuaTao.length === 0}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {dangGiao
              ? "Đang giao…"
              : goiYChuaTao.length === 0
              ? "Đã giao hết đề xuất"
              : `Giao tự động ${goiYChuaTao.length} việc cho cả nhóm`}
          </button>
          {suggestions.length > 0 && (
            <button
              onClick={() => setXemGoiY((v) => !v)}
              className="text-xs font-medium text-sky-600 hover:underline"
            >
              {xemGoiY ? "Ẩn danh sách đề xuất" : "Xem trước danh sách đề xuất"}
            </button>
          )}
          {autoMsg && (
            <span className={`text-xs ${autoMsg.ok ? "text-emerald-600" : "text-red-600"}`}>
              {autoMsg.text}
            </span>
          )}
        </div>

        {suggestions.length === 0 && (
          <p className="mt-2 text-xs text-slate-400">
            Chưa có đề xuất nào (báo cáo tuần chưa có khách cần chăm, hoặc dữ liệu cảnh báo đang trống).
          </p>
        )}

        {xemGoiY && goiYChuaTao.length > 0 && (
          <div className="mt-3 space-y-3">
            {goiYByEmp.map(([tenNV, items]) => (
              <div key={tenNV} className="rounded-xl border border-sky-100 bg-white p-3">
                <p className="text-xs font-semibold text-slate-800">
                  {tenNV} · {items.length} việc đề xuất
                </p>
                <ul className="mt-1.5 space-y-1">
                  {items.map((g) => (
                    <li key={g.khoaNguon} className="flex items-start gap-2 text-xs text-slate-600">
                      <span
                        className={`mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                          UT_STYLE[g.uuTien] ?? UT_STYLE["Bình thường"]
                        }`}
                      >
                        {g.uuTien}
                      </span>
                      <span>{g.noiDung}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---- Bảng tổng: theo dõi + sửa ---- */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Việc tuần này theo nhân viên — {weekLabel(thisWeek)}
          </h2>
          <span className="text-xs text-slate-500">
            Hoàn thành <b>{tongXong}</b>/<b>{tongViec}</b> việc
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {byEmp.map(({ emp, list, done, doing, tong }) => {
            const isOpen = expanded[emp.ma] ?? true;
            const pct = tong > 0 ? Math.round((done / tong) * 100) : 0;
            return (
              <div key={emp.ma} className="rounded-xl border border-slate-100 bg-slate-50/60">
                <button
                  onClick={() => setExpanded((s) => ({ ...s, [emp.ma]: !(s[emp.ma] ?? true) }))}
                  className="flex w-full items-center justify-between gap-3 p-3 text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{emp.hoTen}</p>
                    <p className="text-xs text-slate-500">
                      {tong === 0
                        ? "Chưa có việc tuần này"
                        : `Hoàn thành ${done}/${tong}${doing ? ` · đang làm ${doing}` : ""}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {tong > 0 && (
                      <div className="hidden h-2 w-24 overflow-hidden rounded-full bg-slate-200 sm:block">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                    <span className="text-xs text-slate-400">{isOpen ? "▲" : "▼"}</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="space-y-2 border-t border-slate-100 p-3">
                    {list.length === 0 ? (
                      <p className="text-xs text-slate-400">Chưa có việc.</p>
                    ) : (
                      list.map((t) => (
                        <div key={t.id} className="rounded-lg bg-white p-2 text-xs shadow-sm">
                          {editId === t.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={editNoiDung}
                                onChange={(e) => setEditNoiDung(e.target.value)}
                                rows={3}
                                className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                              />
                              <div className="flex items-center gap-2">
                                <select
                                  value={editUuTien}
                                  onChange={(e) => setEditUuTien(e.target.value)}
                                  className="rounded border border-slate-300 px-2 py-1 text-xs"
                                >
                                  {UU_TIEN.map((u) => (
                                    <option key={u} value={u}>
                                      {u}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => luuSua(t.id)}
                                  disabled={busy === t.id || !editNoiDung.trim()}
                                  className="rounded bg-slate-900 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                                >
                                  Lưu
                                </button>
                                <button
                                  onClick={() => setEditId(null)}
                                  className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-500"
                                >
                                  Huỷ
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
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
                                {t.nguon && (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                                    {t.nguon}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 whitespace-pre-wrap text-slate-800">{t.noiDung}</p>
                              {t.ghiChu ? (
                                <p className="mt-1 text-emerald-700">↳ NV ghi chú: {t.ghiChu}</p>
                              ) : null}
                              <div className="mt-1 flex items-center justify-between">
                                <span className="text-[11px] text-slate-400">
                                  {t.capNhat ? `Cập nhật ${t.capNhat}` : `Giao ${t.thoiDiem}`}
                                </span>
                                <span className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      setEditId(t.id);
                                      setEditNoiDung(t.noiDung);
                                      setEditUuTien(
                                        (UU_TIEN as readonly string[]).includes(t.uuTien)
                                          ? t.uuTien
                                          : "Bình thường"
                                      );
                                    }}
                                    className="text-[11px] font-medium text-sky-600 hover:underline"
                                  >
                                    Sửa
                                  </button>
                                  <button
                                    onClick={() => xoa(t.id)}
                                    disabled={busy === t.id}
                                    className="text-[11px] font-medium text-red-500 hover:underline disabled:opacity-50"
                                  >
                                    {busy === t.id ? "…" : "Xoá"}
                                  </button>
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ---- Thêm việc thủ công (tuỳ chọn) ---- */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <button
          onClick={() => setMoThuCong((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="text-sm font-semibold text-slate-900">➕ Thêm việc thủ công (tuỳ chọn)</span>
          <span className="text-xs text-slate-400">{moThuCong ? "▲" : "▼"}</span>
        </button>
        {moThuCong && (
          <div className="mt-3 space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">Giao cho</span>
                <button
                  type="button"
                  onClick={() =>
                    setChon(chon.length === employees.length ? [] : employees.map((e) => e.ma))
                  }
                  className="text-xs font-medium text-sky-600 hover:underline"
                >
                  {chon.length === employees.length ? "Bỏ chọn tất cả" : "Chọn cả nhóm"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {employees.map((e) => (
                  <button
                    key={e.ma}
                    type="button"
                    onClick={() =>
                      setChon((prev) =>
                        prev.includes(e.ma) ? prev.filter((x) => x !== e.ma) : [...prev, e.ma]
                      )
                    }
                    className={
                      chon.includes(e.ma)
                        ? "rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white"
                        : "rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    }
                  >
                    {e.hoTen}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={tcNoiDung}
              onChange={(e) => setTcNoiDung(e.target.value)}
              rows={2}
              placeholder="Nội dung công việc…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={tcUuTien}
                onChange={(e) => setTcUuTien(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {UU_TIEN.map((u) => (
                  <option key={u} value={u}>
                    Ưu tiên: {u}
                  </option>
                ))}
              </select>
              <button
                onClick={themThuCong}
                disabled={tcGui}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {tcGui ? "Đang giao…" : "Giao việc"}
              </button>
              {tcMsg && (
                <span className={`text-xs ${tcMsg.ok ? "text-emerald-600" : "text-red-600"}`}>
                  {tcMsg.text}
                </span>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
