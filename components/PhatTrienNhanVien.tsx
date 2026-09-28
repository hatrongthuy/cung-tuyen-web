"use client";

import { useState } from "react";
import { KY_NANG, type HoSoItem, type NguyenVongItem } from "./PhatTrienManager";

const MUC_LABEL = ["Chưa đánh giá", "Yếu", "Cần cải thiện", "Đạt", "Khá", "Tốt"];

export default function PhatTrienNhanVien({
  hoSo,
  nguyenVong,
}: {
  hoSo: HoSoItem | null;
  nguyenVong: NguyenVongItem | null;
}) {
  const [noiDung, setNoiDung] = useState(nguyenVong?.noiDung ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [daGui, setDaGui] = useState(!!nguyenVong);

  async function gui() {
    if (!noiDung.trim()) return setMsg({ ok: false, text: "Chưa nhập nội dung." });
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/phat-trien", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "nguyen-vong", noiDung: noiDung.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Có lỗi xảy ra");
      setMsg({ ok: true, text: "Đã gửi nguyện vọng tới quản lý." });
      setDaGui(true);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Có lỗi xảy ra" });
    } finally {
      setBusy(false);
    }
  }

  const daCham = hoSo && hoSo.kyNang.some((x) => x > 0);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Đánh giá kỹ năng của bạn</h2>
        {!daCham ? (
          <p className="mt-2 text-sm text-slate-400">
            Quản lý chưa đánh giá kỹ năng cho bạn. Khi có, phần này sẽ hiển thị mức từng nhóm kỹ năng.
          </p>
        ) : (
          <div className="mt-3 space-y-2.5">
            {KY_NANG.map((kn, i) => {
              const v = hoSo!.kyNang[i] ?? 0;
              return (
                <div key={kn}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{kn}</span>
                    <span className="text-slate-500">{v ? `${v}/5 · ${MUC_LABEL[v]}` : "—"}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${
                        v >= 4 ? "bg-emerald-500" : v === 3 ? "bg-sky-500" : v > 0 ? "bg-amber-500" : ""
                      }`}
                      style={{ width: `${(v / 5) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {hoSo?.thoiDiem && (
              <p className="pt-1 text-xs text-slate-400">Cập nhật: {hoSo.thoiDiem}</p>
            )}
          </div>
        )}
      </section>

      {hoSo && (hoSo.diemManh || hoSo.canCaiThien || hoSo.dinhHuong) && (
        <section className="grid gap-4 lg:grid-cols-3">
          <Card title="Điểm mạnh" tone="emerald" text={hoSo.diemManh} />
          <Card title="Điểm cần cải thiện" tone="red" text={hoSo.canCaiThien} />
          <Card title="Định hướng đào tạo / kèm cặp" tone="sky" text={hoSo.dinhHuong} />
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Nguyện vọng phát triển của bạn</h2>
        <p className="mt-0.5 text-xs text-slate-400">
          Bạn mong muốn được đào tạo/kèm cặp thêm về mảng nào? Tự nhận xét điểm mạnh/yếu của mình để
          quản lý nắm và hỗ trợ.
        </p>
        <textarea
          value={noiDung}
          onChange={(e) => setNoiDung(e.target.value)}
          rows={3}
          placeholder="VD: Em muốn được kèm thêm kỹ năng chốt đơn ở kênh bệnh viện; cần học sâu hơn về nhóm sản phẩm gây tê…"
          className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            onClick={gui}
            disabled={busy}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {busy ? "Đang gửi…" : daGui ? "Cập nhật nguyện vọng" : "Gửi nguyện vọng"}
          </button>
          {msg && <span className={`text-xs ${msg.ok ? "text-emerald-600" : "text-red-600"}`}>{msg.text}</span>}
        </div>
      </section>
    </div>
  );
}

function Card({ title, tone, text }: { title: string; tone: "emerald" | "red" | "sky"; text: string }) {
  const border =
    tone === "emerald" ? "border-emerald-200" : tone === "red" ? "border-red-200" : "border-sky-200";
  const head =
    tone === "emerald" ? "text-emerald-700" : tone === "red" ? "text-red-600" : "text-sky-700";
  return (
    <div className={`rounded-2xl border ${border} bg-white p-4 shadow-sm`}>
      <h3 className={`text-sm font-semibold ${head}`}>{title}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
        {text || <span className="text-slate-400">Chưa có nội dung.</span>}
      </p>
    </div>
  );
}
