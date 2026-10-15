"use client";

import { Fragment, useMemo, useState } from "react";
import { formatShortVnd } from "@/lib/format";
import type { RFMResult, CustomerRow } from "@/lib/customer-analytics";

const SEG_STYLE: Record<string, string> = {
  "Khách VIP": "bg-emerald-100 text-emerald-800",
  "Trung thành": "bg-blue-100 text-blue-800",
  "Khách mới / tiềm năng": "bg-cyan-100 text-cyan-800",
  "Cần chú ý": "bg-amber-100 text-amber-800",
  "Nguy cơ rời": "bg-orange-100 text-orange-800",
  "Đã ngủ": "bg-slate-200 text-slate-600",
  "Khác": "bg-slate-100 text-slate-500",
};

function segCls(s: string): string {
  return SEG_STYLE[s] ?? "bg-slate-100 text-slate-500";
}

function MiniBars({ data }: { data: { k: string; dt: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.dt));
  return (
    <div className="flex items-end gap-0.5" style={{ height: 40 }}>
      {data.map((d) => (
        <div key={d.k} className="group relative flex-1" title={`${d.k}: ${formatShortVnd(d.dt)}`}>
          <div
            className="w-full rounded-sm bg-blue-400"
            style={{ height: `${Math.max(2, (d.dt / max) * 40)}px` }}
          />
        </div>
      ))}
    </div>
  );
}

function Detail360({ c }: { c: CustomerRow }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div>
        <p className="text-xs font-semibold text-slate-600">Doanh thu 12 tháng gần nhất</p>
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
          <MiniBars data={c.monthly} />
          <div className="mt-1 flex justify-between text-[10px] text-slate-400">
            <span>{c.monthly[0]?.k}</span>
            <span>{c.monthly[c.monthly.length - 1]?.k}</span>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg bg-white p-2 shadow-sm"><div className="text-[10px] text-slate-400">Giá trị 12T</div><div className="font-bold text-slate-800">{formatShortVnd(c.monetary)}</div></div>
          <div className="rounded-lg bg-white p-2 shadow-sm"><div className="text-[10px] text-slate-400">Số lần mua</div><div className="font-bold text-slate-800">{c.freq}</div></div>
          <div className="rounded-lg bg-white p-2 shadow-sm"><div className="text-[10px] text-slate-400">Lần cuối</div><div className="font-bold text-slate-800">{c.recencyDays}d</div></div>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-600">Sản phẩm đang dùng (12T)</p>
        {c.sps.length === 0 ? (
          <p className="mt-2 text-xs text-slate-400">Không có SP trong 12 tháng.</p>
        ) : (
          <table className="mt-2 w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400">
                <th className="py-1 pr-2 font-medium">Sản phẩm</th>
                <th className="py-1 pr-2 text-right font-medium">DT</th>
                <th className="py-1 pr-2 text-right font-medium">SL</th>
                <th className="py-1 text-right font-medium">Lần cuối</th>
              </tr>
            </thead>
            <tbody>
              {c.sps.map((s, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="py-1 pr-2 text-slate-700">{s.ten}</td>
                  <td className="py-1 pr-2 text-right text-slate-600">{formatShortVnd(s.dt)}</td>
                  <td className="py-1 pr-2 text-right text-slate-500">{Math.round(s.sl).toLocaleString("vi-VN")}</td>
                  <td className="py-1 text-right text-slate-500">{s.lanCuoiNgay}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function KhachHangView({
  teamName,
  rfm,
  title,
}: {
  teamName: string;
  rfm: RFMResult;
  title?: string;
}) {
  const [seg, setSeg] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return rfm.customers.filter(
      (c) => (!seg || c.segment === seg) && (!kw || c.tenKH.toLowerCase().includes(kw) || (c.tinh || "").toLowerCase().includes(kw))
    );
  }, [rfm.customers, seg, q]);

  const shown = filtered.slice(0, 200);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900">{title ?? "Phân tích khách hàng (RFM)"}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Nhóm {teamName} · phân hạng theo Gần đây mua (R) · Tần suất (F) · Giá trị (M){rfm.asofLabel ? ` · dữ liệu tới ${rfm.asofLabel}` : ""}. Bấm vào khách để xem hồ sơ 360°.
        </p>
      </div>

      {rfm.error && <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">Không đọc được dữ liệu Sale: {rfm.error}</div>}

      {/* Phân hạng */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSeg(null)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${!seg ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
        >
          Tất cả ({rfm.customers.length})
        </button>
        {rfm.segments.map((s) => (
          <button
            key={s.name}
            onClick={() => setSeg(seg === s.name ? null : s.name)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${seg === s.name ? "ring-2 ring-slate-800 " : ""}${segCls(s.name)}`}
          >
            {s.name} · {s.count} · {formatShortVnd(s.dt)}
          </button>
        ))}
      </div>

      {/* Tìm kiếm */}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Tìm theo tên khách / tỉnh…"
        className="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700"
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-3 font-medium">Khách hàng</th>
                <th className="py-2 pr-3 font-medium">Tỉnh</th>
                <th className="py-2 pr-3 font-medium">TDV</th>
                <th className="py-2 pr-3 font-medium">Phân hạng</th>
                <th className="py-2 pr-3 text-center font-medium">R·F·M</th>
                <th className="py-2 pr-3 text-right font-medium">Giá trị 12T</th>
                <th className="py-2 pr-3 text-right font-medium">Lần mua cuối</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <Fragment key={c.cid}>
                  <tr
                    onClick={() => setOpen(open === c.cid ? null : c.cid)}
                    className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="py-2 pr-3 font-semibold text-slate-900">{c.tenKH}</td>
                    <td className="py-2 pr-3 text-slate-600">{c.tinh || "—"}</td>
                    <td className="py-2 pr-3 text-slate-600">{c.repTen || "—"}</td>
                    <td className="py-2 pr-3"><span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${segCls(c.segment)}`}>{c.segment}</span></td>
                    <td className="py-2 pr-3 text-center font-mono text-slate-700">{c.R}·{c.F}·{c.M}</td>
                    <td className="py-2 pr-3 text-right font-semibold text-slate-800">{formatShortVnd(c.monetary)}</td>
                    <td className="py-2 pr-3 text-right text-slate-500">{c.recencyDays} ngày</td>
                  </tr>
                  {open === c.cid && (
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <td colSpan={7} className="p-4">
                        <div className="mb-2 text-xs text-slate-500">{c.tenKH}{c.nhomKH ? ` · ${c.nhomKH}` : ""}{c.maKH ? ` · mã ${c.maKH}` : ""}</div>
                        <Detail360 c={c} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > shown.length && (
          <p className="mt-2 text-[11px] text-slate-400">Hiển thị {shown.length}/{filtered.length} khách (lọc thêm bằng ô tìm kiếm hoặc phân hạng).</p>
        )}
        {shown.length === 0 && <p className="mt-2 text-xs text-slate-400">Không có khách phù hợp.</p>}
      </section>

      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-[11px] leading-relaxed text-slate-500">
        <b>Cách đọc:</b> R/F/M từ 1–5 (5 là tốt nhất). <b>Khách VIP</b>: gặp đều, giá trị cao — giữ chặt.
        <b> Nguy cơ rời</b>: từng mua nhiều nhưng lâu rồi chưa quay lại — ưu tiên tái kích hoạt.
        <b> Đã ngủ</b>: rất lâu không mua. <b>Khách mới / tiềm năng</b>: mới mua, cần chăm để thành khách đều.
      </div>
    </div>
  );
}
