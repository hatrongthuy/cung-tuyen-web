import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import { getSaleDetailData } from "@/lib/sale-detail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MS = 86400000;
const GAM_COLORS: Record<string, string> = { Sản: "#c2457e", GMHS: "#2a78d6" };

function tr(v: number): string {
  // đồng -> "x,y" triệu
  const t = v / 1_000_000;
  return t.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
function womIndex(day: number): number {
  if (day <= 6) return 0;
  if (day <= 13) return 1;
  if (day <= 20) return 2;
  if (day <= 27) return 3;
  return 4;
}
const WEEK_LABELS = ["W1 01–06", "W2 07–13", "W3 14–20", "W4 21–27", "W5 28–31"];

export default async function BaoCaoChotThangPage({
  searchParams,
}: {
  searchParams?: Promise<{ thang?: string }>;
}) {
  const session = await auth();
  const user = session!.user!;
  const d = await getSaleDetailData();

  if (d.error) {
    return (
      <>
        <AppHeader hoTen={user.name ?? ""} role="manager" active="chot-thang" />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Không tải được dữ liệu Sale: {d.error}
          </div>
        </main>
      </>
    );
  }

  const C = { cid: 0, tid: 1, pid: 2, di: 3, sl: 4, dt: 5 };
  const baseMs = new Date(d.base + "T00:00:00").getTime();
  const asof = new Date(baseMs + d.asofDi * MS);

  // Tháng mục tiêu: mặc định tháng gần nhất đã "chốt" (nếu đầu tháng thì lấy tháng trước).
  const sp = (await searchParams) ?? {};
  let ty: number, tmonth: number; // tmonth: 0-based
  if (sp.thang && /^\d{4}-\d{1,2}$/.test(sp.thang)) {
    const [y, m] = sp.thang.split("-").map(Number);
    ty = y;
    tmonth = m - 1;
  } else {
    ty = asof.getFullYear();
    tmonth = asof.getMonth();
    if (asof.getDate() <= 8) {
      tmonth -= 1;
      if (tmonth < 0) {
        tmonth = 11;
        ty -= 1;
      }
    }
  }
  const thangLabel = `T${tmonth + 1}/${ty}`;

  // SP trọng tâm (SPTT) = focus; SP xương sống (SPXS) = Cấp 2 (Chuyên khoa PS).
  const sptt = new Set<number>();
  Object.values(d.focus).forEach((arr) => arr.forEach((p) => sptt.add(p)));
  const spxs = new Set<number>(d.cap2Cat);

  type NVRow = {
    tid: number;
    ten: string;
    gam: string;
    week: number[];
    lk: number;
    sptt: number;
    spxs: number;
    khac: number;
    khach: Set<number>;
  };
  const byNV = new Map<number, NVRow>();
  const ensure = (tid: number): NVRow => {
    let r = byNV.get(tid);
    if (!r) {
      r = {
        tid,
        ten: d.tdv[tid] ?? "",
        gam: d.repGam[tid] ?? "",
        week: [0, 0, 0, 0, 0],
        lk: 0,
        sptt: 0,
        spxs: 0,
        khac: 0,
        khach: new Set(),
      };
      byNV.set(tid, r);
    }
    return r;
  };

  for (const row of d.rows) {
    const dt = new Date(baseMs + row[C.di] * MS);
    if (dt.getFullYear() !== ty || dt.getMonth() !== tmonth) continue;
    const r = ensure(row[C.tid]);
    const val = row[C.dt];
    r.week[womIndex(dt.getDate())] += val;
    r.lk += val;
    r.khach.add(row[C.cid]);
    if (sptt.has(row[C.pid])) r.sptt += val;
    else if (spxs.has(row[C.pid])) r.spxs += val;
    else r.khac += val;
  }

  // Thứ tự: nhóm Sản trước, GMHS sau, rồi còn lại; trong nhóm sắp theo LK giảm dần.
  const order = ["Sản", "GMHS", ""];
  const groups = order
    .map((g) => ({
      gam: g,
      rows: [...byNV.values()].filter((r) => (r.gam || "") === g && r.lk > 0).sort((a, b) => b.lk - a.lk),
    }))
    .filter((grp) => grp.rows.length > 0);

  const all = [...byNV.values()].filter((r) => r.lk > 0);
  const totWeek = [0, 0, 0, 0, 0];
  let totLk = 0,
    totSptt = 0,
    totSpxs = 0,
    totKhac = 0;
  for (const r of all) {
    r.week.forEach((v, i) => (totWeek[i] += v));
    totLk += r.lk;
    totSptt += r.sptt;
    totSpxs += r.spxs;
    totKhac += r.khac;
  }
  const sanLk = all.filter((r) => r.gam === "Sản").reduce((s, r) => s + r.lk, 0);
  const gmhsLk = all.filter((r) => r.gam === "GMHS").reduce((s, r) => s + r.lk, 0);
  const topNV = [...all].sort((a, b) => b.lk - a.lk)[0];
  const lowNV = [...all].sort((a, b) => a.lk - b.lk)[0];

  const cell = (v: number) =>
    v > 0 ? <span className="tabular-nums">{tr(v)}</span> : <span className="text-slate-300">·</span>;

  const NVBlock = ({ gam, rows }: { gam: string; rows: NVRow[] }) => {
    const col = GAM_COLORS[gam] || "#64748b";
    const gLk = rows.reduce((s, r) => s + r.lk, 0);
    return (
      <>
        <tr style={{ backgroundColor: `${col}12` }}>
          <td className="px-3 py-1.5 text-xs font-bold" style={{ color: col }} colSpan={6}>
            Nhóm {gam || "Khác"} <span className="font-medium text-slate-400">({rows.length} NV)</span>
          </td>
          <td className="px-3 py-1.5 text-right text-xs font-bold tabular-nums" style={{ color: col }}>
            {tr(gLk)}
          </td>
          <td colSpan={3} />
        </tr>
        {rows.map((r) => (
          <tr key={r.tid} className="border-b border-slate-100">
            <td className="px-3 py-2">
              <div className="text-sm font-medium text-slate-900">{r.ten}</div>
              <div className="text-[11px] text-slate-400">
                {r.gam || "—"} · {r.khach.size} KH
              </div>
            </td>
            {r.week.map((v, i) => (
              <td key={i} className="px-3 py-2 text-right text-sm text-slate-600">
                {cell(v)}
              </td>
            ))}
            <td className="px-3 py-2 text-right text-sm font-bold text-slate-900">{tr(r.lk)}</td>
            <td className="px-3 py-2 text-right text-sm text-emerald-700">{cell(r.sptt)}</td>
            <td className="px-3 py-2 text-right text-sm text-sky-700">{cell(r.spxs)}</td>
            <td className="px-3 py-2 text-right text-sm text-slate-500">{cell(r.khac)}</td>
          </tr>
        ))}
      </>
    );
  };

  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="manager" active="chot-thang" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {/* Header */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#0b3b40] to-[#0b6e75] p-6 text-white shadow-sm sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">
                📊 Báo cáo chốt tháng — {thangLabel}
              </h1>
              <p className="mt-1 text-sm text-white/80">
                Nhóm PS Phú Thọ · SS Hà Trọng Thủy · DATA SALE {thangLabel} · cập nhật{" "}
                {asof.toLocaleDateString("vi-VN")}
              </p>
            </div>
            <div className="flex gap-3">
              <div className="rounded-xl bg-white/10 px-4 py-2 text-center">
                <div className="text-lg font-bold">{tr(totLk)}tr</div>
                <div className="text-[11px] text-white/70">Tổng DS {thangLabel}</div>
              </div>
              <div className="rounded-xl bg-white/10 px-4 py-2 text-center">
                <div className="text-lg font-bold">{all.length}</div>
                <div className="text-[11px] text-white/70">Nhân viên có DS</div>
              </div>
            </div>
          </div>
        </div>

        {/* KPI tiles */}
        <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xl font-bold text-slate-900">{tr(totLk)}tr</div>
            <div className="mt-0.5 text-xs text-slate-500">Tổng DS nhóm (DATA SALE)</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xl font-bold" style={{ color: GAM_COLORS["Sản"] }}>
              {tr(sanLk)}tr
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              Nhóm Sản · {totLk > 0 ? Math.round((sanLk / totLk) * 100) : 0}%
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xl font-bold" style={{ color: GAM_COLORS["GMHS"] }}>
              {tr(gmhsLk)}tr
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              Nhóm GMHS · {totLk > 0 ? Math.round((gmhsLk / totLk) * 100) : 0}%
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xl font-bold text-emerald-700">{tr(totSptt)}tr</div>
            <div className="mt-0.5 text-xs text-slate-500">
              SP trọng tâm · {totLk > 0 ? Math.round((totSptt / totLk) * 100) : 0}% DS
            </div>
          </div>
        </section>

        {/* Bảng DS theo tuần × NV */}
        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">
            DS theo tuần (DATA SALE) → Lũy kế {thangLabel} → SPTT / SPXS (tr)
          </h2>
          <p className="mb-3 text-xs text-slate-400">
            SPTT = sản phẩm trọng tâm · SPXS = sản phẩm Cấp 2 (Chuyên khoa PS) · Khác = sản phẩm còn lại.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="px-3 py-2 text-left font-semibold">Nhân viên</th>
                  {WEEK_LABELS.map((w) => (
                    <th key={w} className="px-3 py-2 text-right font-semibold">
                      {w}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right font-semibold">LK {thangLabel}</th>
                  <th className="px-3 py-2 text-right font-semibold">SPTT</th>
                  <th className="px-3 py-2 text-right font-semibold">SPXS</th>
                  <th className="px-3 py-2 text-right font-semibold">Khác</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <NVBlock key={g.gam} gam={g.gam} rows={g.rows} />
                ))}
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                  <td className="px-3 py-2 text-sm text-slate-900">TỔNG NHÓM</td>
                  {totWeek.map((v, i) => (
                    <td key={i} className="px-3 py-2 text-right text-sm text-slate-700">
                      {cell(v)}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right text-sm text-slate-900">{tr(totLk)}</td>
                  <td className="px-3 py-2 text-right text-sm text-emerald-700">{tr(totSptt)}</td>
                  <td className="px-3 py-2 text-right text-sm text-sky-700">{tr(totSpxs)}</td>
                  <td className="px-3 py-2 text-right text-sm text-slate-600">{tr(totKhac)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Điểm nổi bật (tự sinh) */}
        <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">⭐ Điểm nổi bật {thangLabel}</h2>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            <li>
              Tổng DS nhóm <b>{tr(totLk)}tr</b> · Sản {tr(sanLk)}tr ({totLk > 0 ? Math.round((sanLk / totLk) * 100) : 0}%) · GMHS{" "}
              {tr(gmhsLk)}tr ({totLk > 0 ? Math.round((gmhsLk / totLk) * 100) : 0}%).
            </li>
            {topNV && (
              <li>
                Dẫn đầu: <b>{topNV.ten}</b> {tr(topNV.lk)}tr · thấp nhất: {lowNV?.ten} {lowNV ? tr(lowNV.lk) : 0}tr.
              </li>
            )}
            <li>
              SP trọng tâm {tr(totSptt)}tr ({totLk > 0 ? Math.round((totSptt / totLk) * 100) : 0}% DS) · SP Cấp 2{" "}
              {tr(totSpxs)}tr ({totLk > 0 ? Math.round((totSpxs / totLk) * 100) : 0}% DS).
            </li>
          </ul>
        </section>

        {/* Ghi chú các phần cần dữ liệu KPI */}
        <section className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
          <b className="text-slate-700">Đang hoàn thiện:</b> các cột KPI chính thức (chỉ tiêu KH, TH KPI, %KH,
          điểm KPI), tách kênh KĐ/PM/Thầu, mục <b>Mở mới</b> · <b>Duy trì</b> · <b>Zalo</b> · <b>Tranh 3D</b>, và
          trang <b>chi tiết từng nhân viên</b> — sẽ bổ sung ở các bước tiếp theo. Bản này dùng DATA SALE {thangLabel}
          trên web.
        </section>
      </main>
    </>
  );
}
