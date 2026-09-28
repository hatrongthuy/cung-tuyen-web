"use client";

import { useState } from "react";

export const KY_NANG = [
  "Bán hàng & chốt đơn",
  "Kiến thức sản phẩm",
  "Chăm sóc khách hàng",
  "Kỷ luật cung tuyến",
  "Phát triển khách mới",
  "Báo cáo & dùng dữ liệu",
];

export interface HoSoItem {
  maNV: string;
  tenNV: string;
  nguoiCapNhat: string;
  thoiDiem: string;
  kyNang: number[];
  diemManh: string;
  canCaiThien: string;
  dinhHuong: string;
}
export interface NguyenVongItem {
  maNV: string;
  tenNV: string;
  thoiDiem: string;
  noiDung: string;
}

const MUC_LABEL = ["—", "Yếu", "Cần cải thiện", "Đạt", "Khá", "Tốt"];

function LevelPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? 0 : n)}
          title={MUC_LABEL[n]}
          className={
            n <= value
              ? "h-7 w-7 rounded-md bg-emerald-500 text-xs font-semibold text-white"
              : "h-7 w-7 rounded-md bg-slate-100 text-xs font-medium text-slate-400 hover:bg-slate-200"
          }
        >
          {n}
        </button>
      ))}
      <span className="ml-1 text-xs text-slate-500">{value ? MUC_LABEL[value] : "Chưa đánh giá"}</span>
    </div>
  );
}

export default function PhatTrienManager({
  employees,
  initialHoSo,
  initialNguyenVong,
}: {
  employees: { ma: string; hoTen: string }[];
  initialHoSo: Record<string, HoSoItem>;
  initialNguyenVong: Record<string, NguyenVongItem>;
}) {
  const [hoSo, setHoSo] = useState<Record<string, HoSoItem>>(initialHoSo);
  const nguyenVong = initialNguyenVong;
  const [openMa, setOpenMa] = useState<string | null>(null);
  const [form, setForm] = useState<{ kyNang: number[]; diemManh: string; canCaiThien: string; dinhHuong: string }>({
    kyNang: [0, 0, 0, 0, 0, 0],
    diemManh: "",
    canCaiThien: "",
    dinhHuong: "",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ma: string; ok: boolean; text: string } | null>(null);

  function moNV(ma: string) {
    if (openMa === ma) {
      setOpenMa(null);
      return;
    }
    const h = hoSo[ma];
    setForm({
      kyNang: h ? [...h.kyNang] : [0, 0, 0, 0, 0, 0],
      diemManh: h?.diemManh ?? "",
      canCaiThien: h?.canCaiThien ?? "",
      dinhHuong: h?.dinhHuong ?? "",
    });
    setMsg(null);
    setOpenMa(ma);
  }

  async function luu(emp: { ma: string; hoTen: string }) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/phat-trien", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ho-so", maNV: emp.ma, ...form }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Có lỗi xảy ra");
      // cập nhật tại chỗ
      setHoSo((prev) => ({
        ...prev,
        [emp.ma]: {
          maNV: emp.ma,
          tenNV: emp.hoTen,
          nguoiCapNhat: "",
          thoiDiem: "vừa xong",
          kyNang: [...form.kyNang],
          diemManh: form.diemManh,
          canCaiThien: form.canCaiThien,
          dinhHuong: form.dinhHuong,
        },
      }));
      setMsg({ ma: emp.ma, ok: true, text: "Đã lưu hồ sơ." });
    } catch (e) {
      setMsg({ ma: emp.ma, ok: false, text: e instanceof Error ? e.message : "Có lỗi xảy ra" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {employees.map((e) => {
        const h = hoSo[e.ma];
        const nv = nguyenVong[e.ma];
        const daCham = h && h.kyNang.some((x) => x > 0);
        const tb = daCham
          ? (h!.kyNang.filter((x) => x > 0).reduce((s, x) => s + x, 0) /
              h!.kyNang.filter((x) => x > 0).length).toFixed(1)
          : null;
        const isOpen = openMa === e.ma;
        return (
          <section key={e.ma} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <button
              onClick={() => moNV(e.ma)}
              className="flex w-full items-center justify-between gap-3 p-4 text-left"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{e.hoTen}</p>
                <p className="text-xs text-slate-500">
                  {daCham ? `Điểm kỹ năng TB: ${tb}/5` : "Chưa đánh giá kỹ năng"}
                  {nv ? " · có nguyện vọng" : ""}
                </p>
              </div>
              <span className="text-xs text-slate-400">{isOpen ? "▲ Đóng" : "▼ Đánh giá"}</span>
            </button>

            {isOpen && (
              <div className="space-y-4 border-t border-slate-100 p-4">
                {nv && (
                  <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                    <b>Nguyện vọng của nhân viên</b> ({nv.thoiDiem}): {nv.noiDung}
                  </div>
                )}

                <div>
                  <p className="mb-2 text-xs font-semibold text-slate-600">Đánh giá kỹ năng (1–5)</p>
                  <div className="space-y-2">
                    {KY_NANG.map((kn, i) => (
                      <div key={kn} className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm text-slate-700">{kn}</span>
                        <LevelPicker
                          value={form.kyNang[i] ?? 0}
                          onChange={(v) =>
                            setForm((f) => {
                              const k = [...f.kyNang];
                              k[i] = v;
                              return { ...f, kyNang: k };
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-emerald-700">Điểm mạnh</label>
                    <textarea
                      value={form.diemManh}
                      onChange={(e2) => setForm((f) => ({ ...f, diemManh: e2.target.value }))}
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-red-600">Điểm cần cải thiện</label>
                    <textarea
                      value={form.canCaiThien}
                      onChange={(e2) => setForm((f) => ({ ...f, canCaiThien: e2.target.value }))}
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-sky-700">
                    Định hướng đào tạo / kèm cặp
                  </label>
                  <textarea
                    value={form.dinhHuong}
                    onChange={(e2) => setForm((f) => ({ ...f, dinhHuong: e2.target.value }))}
                    rows={3}
                    placeholder="VD: Kèm 2 buổi kỹ năng chốt đơn tại BV tỉnh; học lại kiến thức nhóm Levobupivacain…"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => luu(e)}
                    disabled={busy}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {busy ? "Đang lưu…" : "Lưu hồ sơ"}
                  </button>
                  {msg && msg.ma === e.ma && (
                    <span className={`text-xs ${msg.ok ? "text-emerald-600" : "text-red-600"}`}>{msg.text}</span>
                  )}
                  {h?.thoiDiem && (
                    <span className="text-xs text-slate-400">Cập nhật: {h.thoiDiem}</span>
                  )}
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
