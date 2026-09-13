"use client";

import { useMemo, useRef, useState } from "react";
import { allEmployees } from "@/lib/allowlist";
import { formatShortVnd, pct, parseMoney } from "@/lib/format";
import {
  salesByRange,
  normalizeMaNV,
  findColumn,
  type SaleTxnLite,
  type CareItem,
} from "@/lib/report-utils";
import type { EmployeeWeekSummary } from "@/lib/aggregate";

interface DateCtx {
  nam: number;
  thang: number;
  ngay: number;
  soNgayThang: number;
  monthStartMs: number;
  nowMs: number;
  weekAgoMs: number;
}

interface EmpRow {
  ma: string;
  ten: string;
  ho: string; // tên gọi ngắn (từ cuối)
  diaBan: string;
  kdTH: number;
  kdKH: number;
  kdPct: number;
  thauTH: number;
  thauKH: number;
  thauPct: number;
  coverage: number | null; // 0..1
  soGoiY: number;
  soDongY: number;
  soChuaGap: number;
  care: CareItem[];
}

const C = { kd: "#2a78d6", thau: "#eda100", cov: "#1baf7a", red: "#e34948", violet: "#6d5ae6" };

function pctStr(v: number) {
  return `${v.toFixed(1)}%`;
}
function tenGoi(hoTen: string): string {
  const parts = hoTen.trim().split(/\s+/);
  return parts[parts.length - 1] || hoTen;
}

export default function BaoCaoTuanReport({
  teamName,
  weekRangeLabel,
  salesTxns = [],
  salesError,
  kpiCols = [],
  kpiRows = [],
  kpiError,
  summaries = [],
  careByEmp = {},
  ctx,
}: {
  teamName: string;
  weekRangeLabel: string;
  salesTxns?: SaleTxnLite[];
  salesError?: string | null;
  kpiCols?: string[];
  kpiRows?: Record<string, string>[];
  kpiError?: string | null;
  summaries?: EmployeeWeekSummary[];
  careByEmp?: Record<string, CareItem[]>;
  ctx: DateCtx;
}) {
  const pctThoiGian = (ctx.ngay / ctx.soNgayThang) * 100;

  const emps = useMemo<EmpRow[]>(() => {
    const kdNow = salesByRange(salesTxns, ctx.monthStartMs, ctx.nowMs, "keDon");
    const thauNow = salesByRange(salesTxns, ctx.monthStartMs, ctx.nowMs, "thau");

    const cMa = findColumn(kpiCols, ["mã nv"]) ?? findColumn(kpiCols, ["mã", "nv"]) ?? findColumn(kpiCols, ["mã nhân"]);
    const cKd = findColumn(kpiCols, ["kê đơn", "kế hoạch"]) ?? findColumn(kpiCols, ["kê đơn", "hoạch"]);
    const cThau = findColumn(kpiCols, ["thầu", "kế hoạch"]) ?? findColumn(kpiCols, ["thầu", "hoạch"]);
    const cDia = findColumn(kpiCols, ["địa bàn"]) ?? findColumn(kpiCols, ["vị trí"]);
    const planByMa = new Map<string, { kd: number; thau: number; dia: string }>();
    for (const r of kpiRows) {
      const ma = cMa ? normalizeMaNV(r[cMa]) : "";
      if (!ma) continue;
      planByMa.set(ma, {
        kd: cKd ? parseMoney(r[cKd]) : 0,
        thau: cThau ? parseMoney(r[cThau]) : 0,
        dia: cDia ? String(r[cDia] ?? "").trim() : "",
      });
    }

    const covByMa = new Map<string, EmployeeWeekSummary>();
    for (const s of summaries) covByMa.set(normalizeMaNV(s.maNhanVien), s);

    return allEmployees().map((e) => {
      const ma = normalizeMaNV(e.maNhanVien);
      const plan = planByMa.get(ma) ?? { kd: 0, thau: 0, dia: "" };
      const kdTH = kdNow[ma] ?? 0;
      const thauTH = thauNow[ma] ?? 0;
      const sm = covByMa.get(ma);
      const soDongY = sm?.soDongY ?? 0;
      const soGoiY = sm?.soGoiY ?? 0;
      return {
        ma,
        ten: e.hoTen,
        ho: tenGoi(e.hoTen),
        diaBan: plan.dia,
        kdTH,
        kdKH: plan.kd,
        kdPct: pct(kdTH, plan.kd),
        thauTH,
        thauKH: plan.thau,
        thauPct: pct(thauTH, plan.thau),
        coverage: sm && soGoiY > 0 ? sm.tyLeHoanThanh : null,
        soGoiY,
        soDongY,
        soChuaGap: sm ? Math.max(0, soGoiY - soDongY) : 0,
        care: careByEmp[e.hoTen] ?? [],
      };
    });
  }, [salesTxns, kpiCols, kpiRows, summaries, careByEmp, ctx]);

  const g = useMemo(() => {
    const sum = (f: (e: EmpRow) => number) => emps.reduce((a, e) => a + f(e), 0);
    const kdTH = sum((e) => e.kdTH), kdKH = sum((e) => e.kdKH);
    const thauTH = sum((e) => e.thauTH), thauKH = sum((e) => e.thauKH);
    const covVals = emps.map((e) => e.coverage).filter((c): c is number => c !== null);
    const coverage = covVals.length ? covVals.reduce((a, b) => a + b, 0) / covVals.length : null;
    const boSot = sum((e) => e.soChuaGap);
    const covMin = covVals.length ? Math.min(...covVals) : 0;
    const covMax = covVals.length ? Math.max(...covVals) : 0;
    return {
      kdTH, kdKH, kdPct: pct(kdTH, kdKH),
      thauTH, thauKH, thauPct: pct(thauTH, thauKH),
      coverage, boSot, covMin, covMax,
    };
  }, [emps]);

  // Danh sách bỏ sót theo NV (để hiện "Trung 12 · Huy 6")
  const boSotBreak = useMemo(
    () => emps.filter((e) => e.soChuaGap > 0).sort((a, b) => b.soChuaGap - a.soChuaGap),
    [emps]
  );

  // Nổi bật & cần cải thiện
  const noiBat = useMemo(() => [...emps].filter((e) => e.kdKH > 0).sort((a, b) => b.kdPct - a.kdPct).slice(0, 2), [emps]);
  const canCaiThien = useMemo(() => {
    const kem = [...emps].filter((e) => e.kdKH > 0).sort((a, b) => a.kdPct - b.kdPct).slice(0, 2);
    const covKem = [...emps].filter((e) => e.coverage !== null).sort((a, b) => (a.coverage ?? 0) - (b.coverage ?? 0))[0];
    return { kem, covKem };
  }, [emps]);

  // Bảng khách ưu tiên tái kích hoạt (gộp tất cả NV, xếp theo giá trị & số ngày)
  const bangKhach = useMemo(() => {
    const rows: { nv: string; item: CareItem }[] = [];
    for (const e of emps) for (const it of e.care) rows.push({ nv: e.ten, item: it });
    rows.sort((a, b) => (b.item.doanhThu12T - a.item.doanhThu12T) || (b.item.soNgay - a.item.soNgay));
    return rows.slice(0, 8);
  }, [emps]);

  const nguDong = useMemo(() => {
    const items = emps.flatMap((e) => e.care).filter((c) => c.soNgay >= 200);
    if (!items.length) return null;
    const min = Math.min(...items.map((c) => c.soNgay));
    const max = Math.max(...items.map((c) => c.soNgay));
    return { count: items.length, min, max };
  }, [emps]);

  // Đề xuất hành động tuần tới (suy từ dữ liệu)
  const deXuat = useMemo(() => {
    const out: { tag: "KHẨN" | "QUAN TRỌNG"; title: string; body: string }[] = [];
    const nvYeuNhat = [...emps].filter((e) => e.kdKH > 0).sort((a, b) => a.kdPct - b.kdPct)[0];
    if (nvYeuNhat && nvYeuNhat.kdPct < pctThoiGian - 10) {
      out.push({
        tag: "KHẨN",
        title: `Làm việc riêng với ${nvYeuNhat.ten}`,
        body: `Rà soát nguyên nhân KĐ mới ${pctStr(nvYeuNhat.kdPct)}, đề ra lộ trình chốt đơn khẩn cấp trong 3 ngày tới.`,
      });
    }
    if (g.boSot > 0) {
      const ai = boSotBreak.slice(0, 2).map((e) => e.ten).join(" & ");
      out.push({
        tag: "KHẨN",
        title: `Ép Coverage với ${ai || "các NV coverage thấp"}`,
        body: `Gặp bù triệt để ${g.boSot} khách bị bỏ sót${boSotBreak.length ? ` (${boSotBreak.slice(0, 3).map((e) => `${e.ho} ${e.soChuaGap}`).join(", ")})` : ""} để tăng tỷ lệ phủ.`,
      });
    }
    if (g.thauKH > 0 && g.thauPct < 1) {
      out.push({
        tag: "QUAN TRỌNG",
        title: `Đẩy mạnh mảng Thầu`,
        body: `Quản lý làm việc với toàn nhóm kiểm tra tiến độ các gói thầu (chỉ tiêu ${formatShortVnd(g.thauKH)} chưa đụng đến).`,
      });
    }
    if (bangKhach.length) {
      const nvs = Array.from(new Set(bangKhach.map((r) => tenGoi(r.nv)))).slice(0, 3).join(", ");
      out.push({
        tag: "QUAN TRỌNG",
        title: `Triển khai kế hoạch gặp thêm`,
        body: `Yêu cầu ${nvs} thực hiện đúng lịch gặp thêm (1–3 lần / 2 tuần) với các khách ưu tiên ở bảng trên.`,
      });
    }
    return out;
  }, [emps, g, boSotBreak, bangKhach, pctThoiGian]);

  // ---- Tải ảnh PNG / In ----
  const reportRef = useRef<HTMLDivElement>(null);
  const [dangTaiAnh, setDangTaiAnh] = useState(false);
  const tenFile = `bao-cao-tuan_${ctx.ngay}-${ctx.thang}-${ctx.nam}`;
  async function taiAnh() {
    const node = reportRef.current;
    if (!node) return;
    setDangTaiAnh(true);
    try {
      const w = window as unknown as { htmlToImage?: { toPng: (n: HTMLElement, o?: Record<string, unknown>) => Promise<string> } };
      if (!w.htmlToImage) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://cdn.jsdelivr.net/npm/html-to-image@1.11.13/dist/html-to-image.js";
          s.onload = () => resolve();
          s.onerror = () => reject(new Error("Không tải được thư viện tạo ảnh."));
          document.head.appendChild(s);
        });
      }
      const dataUrl = await w.htmlToImage!.toPng(node, { pixelRatio: 2, backgroundColor: "#eef1f6", cacheBust: true });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${tenFile}.png`;
      a.click();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Không tạo được ảnh. Bạn có thể dùng nút In / Lưu PDF.");
    } finally {
      setDangTaiAnh(false);
    }
  }

  const covRows = [...emps].filter((e) => e.coverage !== null).sort((a, b) => (b.coverage ?? 0) - (a.coverage ?? 0));
  const kdRows = [...emps].filter((e) => e.kdKH > 0).sort((a, b) => b.kdPct - a.kdPct);

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-end gap-2">
        <button
          onClick={taiAnh}
          disabled={dangTaiAnh}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {dangTaiAnh ? "Đang tạo ảnh…" : "📷 Tải ảnh (PNG)"}
        </button>
        <button
          onClick={() => window.print()}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          🖨️ In / Lưu PDF
        </button>
      </div>

      <div ref={reportRef} className="space-y-5 rounded-2xl bg-[#eef1f6] p-4 sm:p-6">
        {/* ===== Tiêu đề ===== */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Báo Cáo Tuần — Đội Kinh Doanh
            </h1>
            <p className="mt-1 text-sm text-slate-500">Tổng quan hiệu suất &amp; tiến độ theo chỉ tiêu</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-700">Quản lý: {teamName}</p>
            <p className="mt-1 inline-block rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white">
              {weekRangeLabel}
            </p>
          </div>
        </div>

        {(salesError || kpiError) && (
          <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            {salesError && <div>Doanh số: {salesError}</div>}
            {kpiError && <div>Kế hoạch KPI: {kpiError}</div>}
          </div>
        )}

        {/* ===== 4 thẻ KPI ===== */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            accent={C.cov}
            label="Doanh số kênh đơn"
            value={pctStr(g.kdPct)}
            sub={`${formatShortVnd(g.kdTH)} / ${formatShortVnd(g.kdKH)}`}
            tag={g.kdPct >= 100 ? "▲ Đã đạt kế hoạch" : g.kdPct >= pctThoiGian ? `▲ Vượt mốc thời gian ${pctThoiGian.toFixed(0)}%` : `▼ Chậm hơn mốc ${pctThoiGian.toFixed(0)}%`}
            tagColor={g.kdPct >= pctThoiGian ? "green" : "red"}
          />
          <KpiCard
            accent={C.red}
            label="Doanh số thầu"
            value={pctStr(g.thauPct)}
            sub={`${formatShortVnd(g.thauTH)} / ${formatShortVnd(g.thauKH)}`}
            tag={g.thauPct < 1 ? "● Báo động — chưa phát sinh" : g.thauPct >= 100 ? "▲ Đã đạt kế hoạch" : "Đang triển khai"}
            tagColor={g.thauPct < 1 ? "red" : "green"}
          />
          <KpiCard
            accent={C.kd}
            label="Tỷ lệ phủ (coverage) TB"
            value={g.coverage !== null ? pctStr(g.coverage * 100) : "—"}
            sub="Trung bình toàn nhóm"
            tag={g.covMax - g.covMin >= 0.4 ? "◆ Chênh lệch lớn giữa NV" : "Khá đồng đều"}
            tagColor="amber"
          />
          <KpiCard
            accent={C.violet}
            label="Khách hàng bỏ sót"
            value={String(g.boSot)}
            sub="Chưa gặp / chưa phản hồi"
            tag={boSotBreak.length ? boSotBreak.slice(0, 3).map((e) => `${e.ho} ${e.soChuaGap}`).join(" · ") : "Không có"}
            tagColor="violet"
          />
        </div>

        {/* ===== 2 cột: tiến độ KĐ theo NV | coverage theo NV ===== */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Tiến độ Kênh Đơn theo nhân viên" sub="% hoàn thành chỉ tiêu tháng — so với mốc thời gian">
            <div className="mt-3 space-y-3">
              {kdRows.map((e) => (
                <BarRow key={e.ma} name={e.ten} pctVal={e.kdPct} ceiling={130} marker={pctThoiGian} color={e.kdPct >= pctThoiGian ? C.cov : e.kdPct > 0 ? C.thau : C.red} />
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-400">Thanh dài = 130% (mức trần biểu đồ). Vạch dọc = mốc tiến độ thời gian {pctThoiGian.toFixed(0)}%.</p>
          </Card>

          <Card title="Tỷ lệ phủ khách hàng (Coverage)" sub="Tỷ lệ khách trong tuyến đã được gặp trong tuần">
            <div className="mt-3 space-y-3">
              <BarRow name="Trung bình nhóm" pctVal={g.coverage !== null ? g.coverage * 100 : 0} ceiling={100} color={C.kd} />
              {covRows.map((e) => (
                <BarRow key={e.ma} name={e.ten} pctVal={(e.coverage ?? 0) * 100} ceiling={100} color={(e.coverage ?? 0) >= 0.8 ? C.cov : (e.coverage ?? 0) >= 0.5 ? C.thau : C.red} />
              ))}
            </div>
          </Card>
        </div>

        {/* ===== 2 cột: nổi bật/cần cải thiện | tồn đọng ===== */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Nổi bật & Cần cải thiện" sub="Đánh giá kết hợp doanh số và độ phủ">
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                <p className="text-sm font-semibold text-emerald-800">★ Nhân viên nổi bật</p>
                <ul className="mt-2 space-y-2">
                  {noiBat.map((e) => (
                    <li key={e.ma} className="text-xs text-slate-700">
                      <span className="font-semibold text-slate-900">{e.ten}</span> — KĐ {pctStr(e.kdPct)} ({formatShortVnd(e.kdTH)}/{formatShortVnd(e.kdKH)})
                      {e.coverage !== null ? `, Coverage ${pctStr(e.coverage * 100)}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50/60 p-3">
                <p className="text-sm font-semibold text-red-700">⚠ Cần cải thiện</p>
                <ul className="mt-2 space-y-2">
                  {canCaiThien.kem.map((e) => (
                    <li key={e.ma} className="text-xs text-slate-700">
                      <span className="font-semibold text-slate-900">{e.ten}</span> — KĐ {pctStr(e.kdPct)} ({formatShortVnd(e.kdTH)}/{formatShortVnd(e.kdKH)})
                      {e.soChuaGap > 0 ? `, bỏ sót ${e.soChuaGap} khách` : ""}
                    </li>
                  ))}
                  {canCaiThien.covKem && canCaiThien.covKem.coverage !== null && (
                    <li className="text-xs text-slate-700">
                      <span className="font-semibold text-slate-900">{canCaiThien.covKem.ten}</span> — Coverage chỉ {pctStr((canCaiThien.covKem.coverage ?? 0) * 100)} (gặp {canCaiThien.covKem.soDongY}/{canCaiThien.covKem.soGoiY})
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </Card>

          <Card title="Tồn đọng cần xử lý" sub="Các điểm nghẽn ưu tiên giải quyết ngay" dot={C.red}>
            <div className="mt-3 space-y-3">
              {g.thauKH > 0 && g.thauPct < 1 && (
                <TonDong big={`${pctStr(g.thauPct)}`} tone="red" text={`Chỉ tiêu Thầu toàn nhóm — chưa phát sinh doanh số trên tổng kế hoạch ${formatShortVnd(g.thauKH)}.`} />
              )}
              {g.boSot > 0 && (
                <TonDong big={String(g.boSot)} tone="amber" text={`Khách chưa chăm sóc trong tuyến tuần${boSotBreak.length ? ` — ${boSotBreak.slice(0, 3).map((e) => `${e.ho} ${e.soChuaGap}`).join(", ")}.` : "."}`} />
              )}
              {nguDong && (
                <TonDong big={`${nguDong.min}–${nguDong.max}`} tone="slate" text={`${nguDong.count} khách "ngủ đông" (hạng D) — đã ngưng phát sinh doanh số từ ${nguDong.min} đến ${nguDong.max} ngày.`} />
              )}
            </div>
          </Card>
        </div>

        {/* ===== Bảng khách ưu tiên ===== */}
        {bangKhach.length > 0 && (
          <Card title="Bức tranh khách hàng & đề xuất tần suất gặp thêm" sub="Khách ưu tiên tái kích hoạt · DT12T = doanh thu 12 tháng">
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead>
                  <tr className="bg-violet-600 text-white">
                    <th className="rounded-l-lg px-3 py-2 font-semibold">Nhân viên</th>
                    <th className="px-3 py-2 font-semibold">Khách hàng ưu tiên</th>
                    <th className="px-3 py-2 font-semibold">Số ngày chưa có đơn</th>
                    <th className="px-3 py-2 font-semibold">DT12T</th>
                    <th className="rounded-r-lg px-3 py-2 font-semibold">Đề xuất tần suất (2 tuần tới)</th>
                  </tr>
                </thead>
                <tbody>
                  {bangKhach.map(({ nv, item }, i) => (
                    <tr key={i} className="border-b border-slate-100 align-top">
                      <td className="px-3 py-2 font-semibold text-violet-700">{nv}</td>
                      <td className="px-3 py-2 font-medium text-slate-800">{item.tenKhach}</td>
                      <td className="px-3 py-2">
                        <span className="rounded-md bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">{item.soNgay} ngày</span>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{formatShortVnd(item.doanhThu12T)}</td>
                      <td className="px-3 py-2 font-medium text-emerald-700">
                        Gặp {item.deXuatLan} lần / {item.deXuatTuan} tuần{item.caoGiaTri ? " — khai thác đơn giá trị cao" : " — hâm nóng, kích hoạt lại đơn"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* ===== Đề xuất hành động ===== */}
        {deXuat.length > 0 && (
          <Card title="Đề xuất hành động tuần tới">
            <div className="mt-3 space-y-3">
              {deXuat.map((d, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-600 text-xs font-bold text-white">{i + 1}</span>
                  <p className="text-sm text-slate-700">
                    <span className="font-semibold text-slate-900">{d.title}</span>{" "}
                    <span className={d.tag === "KHẨN" ? "rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700" : "rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700"}>{d.tag}</span>{" "}
                    — {d.body}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        <p className="text-center text-xs text-slate-400">
          Báo cáo tổng hợp tuần {weekRangeLabel} · Đội KD do {teamName} quản lý · Đơn vị: tr = triệu VNĐ
        </p>
      </div>
    </div>
  );
}

function KpiCard({ accent, label, value, sub, tag, tagColor }: { accent: string; label: string; value: string; sub: string; tag: string; tagColor: "green" | "red" | "amber" | "violet" }) {
  const tagCls =
    tagColor === "green" ? "bg-emerald-50 text-emerald-700"
    : tagColor === "red" ? "bg-red-50 text-red-700"
    : tagColor === "amber" ? "bg-amber-50 text-amber-700"
    : "bg-violet-50 text-violet-700";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" style={{ borderLeft: `4px solid ${accent}` }}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-extrabold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs text-slate-500">{sub}</p>
      <span className={`mt-2 inline-block rounded-md px-2 py-0.5 text-[11px] font-medium ${tagCls}`}>{tag}</span>
    </div>
  );
}

function Card({ title, sub, dot, children }: { title: string; sub?: string; dot?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dot ?? "#6d5ae6" }} />
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </div>
      {sub && <p className="mt-0.5 pl-4 text-xs text-slate-400">{sub}</p>}
      {children}
    </section>
  );
}

function BarRow({ name, pctVal, ceiling, marker, color }: { name: string; pctVal: number; ceiling: number; marker?: number; color: string }) {
  const w = Math.max(0, Math.min(100, (pctVal / ceiling) * 100));
  const markerLeft = marker != null ? Math.max(0, Math.min(100, (marker / ceiling) * 100)) : null;
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-800">{name}</span>
        <span className="text-sm font-bold" style={{ color }}>{pctVal.toFixed(pctVal % 1 === 0 ? 0 : 1)}%</span>
      </div>
      <div className="relative mt-1 h-3 w-full rounded-full bg-slate-100">
        <div className="h-3 rounded-full" style={{ width: `${w}%`, backgroundColor: color }} />
        {markerLeft != null && (
          <div className="absolute top-[-2px] h-[16px] w-[2px] bg-slate-500" style={{ left: `${markerLeft}%` }} />
        )}
      </div>
    </div>
  );
}

function TonDong({ big, tone, text }: { big: string; tone: "red" | "amber" | "slate"; text: string }) {
  const cls =
    tone === "red" ? "border-red-200 bg-red-50/60 text-red-700"
    : tone === "amber" ? "border-amber-200 bg-amber-50/60 text-amber-700"
    : "border-slate-200 bg-slate-50 text-slate-600";
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-3 ${cls}`}>
      <span className="text-xl font-extrabold leading-none">{big}</span>
      <p className="text-xs text-slate-700">{text}</p>
    </div>
  );
}
