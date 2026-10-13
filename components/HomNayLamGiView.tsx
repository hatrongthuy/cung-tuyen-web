"use client";

import { useState } from "react";
import { formatShortVnd } from "@/lib/format";
import { normalizeMaNV } from "@/lib/report-utils";
import type { TodayActions, TodayNV } from "@/lib/today-actions";
import type { CareItem } from "@/lib/report-utils";

function Chip({ n, label, tone }: { n: number; label: string; tone: "blue" | "green" | "red" | "amber" | "violet" }) {
  const cls =
    tone === "green" ? "bg-emerald-50 text-emerald-700"
    : tone === "red" ? "bg-red-50 text-red-700"
    : tone === "amber" ? "bg-amber-50 text-amber-700"
    : tone === "violet" ? "bg-violet-50 text-violet-700"
    : "bg-blue-50 text-blue-700";
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold ${cls}`}>
      <b className="text-sm">{n}</b> {label}
    </span>
  );
}

function careBadge(loai: CareItem["loai"]): { txt: string; cls: string } {
  if (loai === "chet") return { txt: "Nguy cơ mất", cls: "bg-red-100 text-red-700" };
  if (loai === "chua-tham") return { txt: "Chưa viếng thăm", cls: "bg-amber-100 text-amber-700" };
  return { txt: "SP đã bỏ", cls: "bg-violet-100 text-violet-700" };
}

function NVBlock({ nv }: { nv: TodayNV }) {
  const tyLe = nv.soGoiY > 0 ? Math.round((nv.soDaGap / nv.soGoiY) * 100) : 0;
  return (
    <div className="space-y-4">
      {/* Counters */}
      <div className="flex flex-wrap gap-2">
        <Chip n={nv.canGap.length} label="khách cần gặp" tone="blue" />
        <Chip n={nv.soDaGap} label={`đã gặp (${tyLe}%)`} tone="green" />
        {nv.soChet > 0 && <Chip n={nv.soChet} label="nguy cơ mất" tone="red" />}
        {nv.soChuaTham > 0 && <Chip n={nv.soChuaTham} label="chưa viếng thăm" tone="amber" />}
        {nv.soSpNghi > 0 && <Chip n={nv.soSpNghi} label="SP cần chào lại" tone="violet" />}
      </div>

      {/* 1. Khách cần gặp */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <span>📍</span> Khách cần gặp tuần này
          <span className="text-xs font-normal text-slate-400">({nv.canGap.length})</span>
        </h3>
        {nv.canGap.length === 0 ? (
          <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            ✓ Đã gặp hết khách gợi ý tuần này. Tốt lắm!
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-2 font-medium">#</th>
                  <th className="py-2 pr-3 font-medium">Khách hàng</th>
                  <th className="py-2 pr-3 font-medium">Tỉnh</th>
                  <th className="py-2 pr-3 font-medium">Hạng</th>
                  <th className="py-2 pr-3 font-medium">Mục tiêu chuyến thăm</th>
                </tr>
              </thead>
              <tbody>
                {nv.canGap.map((k, i) => {
                  const risk = nv.nguyCoMat.has(k.tenKH);
                  return (
                    <tr key={`${k.maKH}-${i}`} className="border-b border-slate-100 align-top">
                      <td className="py-2 pr-2 font-semibold text-slate-400">{i + 1}</td>
                      <td className="py-2 pr-3">
                        <div className="font-semibold text-slate-900">{k.tenKH}</div>
                        {risk && <span className="mt-0.5 inline-block rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">⚠ nguy cơ mất</span>}
                      </td>
                      <td className="py-2 pr-3 text-slate-600">{k.tinh || "—"}</td>
                      <td className="py-2 pr-3 text-slate-600">{k.hang || "—"}</td>
                      <td className="py-2 pr-3 text-slate-600">{k.mucTieu || "Thăm & chốt đơn"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 2. Gợi ý tuyến đi */}
      {nv.routes.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <span>🗺️</span> Gợi ý tuyến đi
            <span className="text-xs font-normal text-slate-400">(gom theo tỉnh — đi cụm đông trước)</span>
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {nv.routes.map((g) => (
              <div key={g.tinh} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">{g.tinh}</span>
                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white">{g.khach.length} khách</span>
                </div>
                <ul className="mt-2 space-y-1">
                  {g.khach.map((k, i) => (
                    <li key={`${k.maKH}-${i}`} className="flex items-start gap-1 text-xs text-slate-600">
                      <span className="text-slate-400">{i + 1}.</span>
                      <span>{k.tenKH}{nv.nguyCoMat.has(k.tenKH) && <span className="ml-1 text-red-600">⚠</span>}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Khách cần chăm sóc / tái kích hoạt */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <span>🩺</span> Khách cần chăm sóc / tái kích hoạt
          <span className="text-xs font-normal text-slate-400">({nv.care.length})</span>
        </h3>
        {nv.care.length === 0 ? (
          <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">Không có khách nào đang cảnh báo. 👍</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-medium">Khách hàng</th>
                  <th className="py-2 pr-3 font-medium">Tỉnh</th>
                  <th className="py-2 pr-3 font-medium">Tình trạng</th>
                  <th className="py-2 pr-3 text-right font-medium">DT 12T</th>
                  <th className="py-2 pr-3 font-medium">Nên làm</th>
                </tr>
              </thead>
              <tbody>
                {nv.care.slice(0, 15).map((c, i) => {
                  const b = careBadge(c.loai);
                  return (
                    <tr key={i} className="border-b border-slate-100 align-top">
                      <td className="py-2 pr-3">
                        <span className="font-semibold text-slate-900">{c.tenKhach}</span>
                        {c.caoGiaTri && <span className="ml-1 rounded bg-amber-50 px-1 text-[10px] font-bold text-amber-600">★ giá trị cao</span>}
                      </td>
                      <td className="py-2 pr-3 text-slate-600">{c.tinh || "—"}</td>
                      <td className="py-2 pr-3">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${b.cls}`}>{b.txt}</span>
                        <div className="mt-0.5 text-[11px] text-slate-500">{c.chiTiet}</div>
                      </td>
                      <td className="py-2 pr-3 text-right text-slate-600">{formatShortVnd(c.doanhThu12T)}</td>
                      <td className="py-2 pr-3 text-emerald-700">Gặp {c.deXuatLan} lần / {c.deXuatTuan} tuần</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {nv.care.length > 15 && <p className="mt-2 text-[11px] text-slate-400">… và {nv.care.length - 15} khách khác (ưu tiên thấp hơn).</p>}
          </div>
        )}
      </section>
    </div>
  );
}

export default function HomNayLamGiView({
  teamName,
  actions,
  onlyMa,
  title,
}: {
  teamName: string;
  actions: TodayActions;
  onlyMa?: string;
  title?: string;
}) {
  const onlyMaN = onlyMa ? normalizeMaNV(onlyMa) : null;
  const list = onlyMaN ? actions.byNV.filter((n) => normalizeMaNV(n.maNhanVien) === onlyMaN) : actions.byNV;
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(list.map((n, i) => [n.maNhanVien, i === 0]))
  );

  const today = new Date();
  const ngayLabel = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
          {title ?? "Hôm nay làm gì"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Nhóm {teamName} · {ngayLabel}{actions.weekLabel ? ` · tuần ${actions.weekLabel}` : ""} — việc ưu tiên gộp từ gợi ý tuần & cảnh báo khách hàng.
        </p>
        {!onlyMaN && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip n={actions.team.soCanGap} label="khách cả nhóm cần gặp" tone="blue" />
            <Chip n={actions.team.soChamSoc} label="khách cần chăm sóc" tone="violet" />
            {actions.team.soChet > 0 && <Chip n={actions.team.soChet} label="nguy cơ mất" tone="red" />}
            {actions.team.busiest && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                Nhiều việc nhất: <b className="text-slate-800">{actions.team.busiest}</b>
              </span>
            )}
          </div>
        )}
      </div>

      {list.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          Chưa có dữ liệu việc cần làm. Có thể danh sách gợi ý tuần chưa chạy (hệ thống cập nhật 20h thứ 7).
        </p>
      ) : onlyMaN ? (
        list.map((nv) => <NVBlock key={nv.maNhanVien} nv={nv} />)
      ) : (
        list.map((nv) => {
          const o = open[nv.maNhanVien] ?? false;
          return (
            <div key={nv.maNhanVien} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <button
                onClick={() => setOpen((s) => ({ ...s, [nv.maNhanVien]: !o }))}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">{nv.hoTen}</span>
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">{nv.diemViec} việc</span>
                  {nv.soChet > 0 && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">{nv.soChet} nguy cơ mất</span>}
                </div>
                <span className="text-slate-400">{o ? "▲" : "▼"}</span>
              </button>
              {o && <div className="border-t border-slate-100 p-4">{<NVBlock nv={nv} />}</div>}
            </div>
          );
        })
      )}

      <p className="text-center text-xs text-slate-400">
        Nguồn: Gợi ý tập trung + Xác nhận gợi ý + Cảnh báo (KH chết / chưa viếng thăm / SP nghỉ) · cập nhật hằng ngày.
      </p>
    </div>
  );
}
