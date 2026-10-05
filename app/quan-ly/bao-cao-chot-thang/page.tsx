import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import ReportDownload from "@/components/ReportDownload";
import { getSaleDetailData } from "@/lib/sale-detail";
import { getKpiScorecard, type EmployeeScore, type MetricScore } from "@/lib/kpi-actuals";
import { TEN_NHOM } from "@/lib/scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MS = 86400000;
const GAM_COLORS: Record<string, string> = { Sản: "#c2457e", GMHS: "#2a78d6" };

function tr(v: number | null | undefined): string {
  if (v == null) return "—";
  const t = v / 1_000_000;
  return t.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
function normMa(v: string): string {
  return String(v ?? "").trim().replace(/^0+(?=\d)/, "");
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

  const sp = (await searchParams) ?? {};
  let ty: number, tmonth: number;
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

  // KPI chính thức (điểm, KH/TH) từ file KPI công ty.
  let scoreByMa = new Map<string, EmployeeScore>();
  let kpiErr: string | null = null;
  try {
    const sc = await getKpiScorecard(TEN_NHOM, ty, tmonth + 1);
    kpiErr = sc.error;
    scoreByMa = new Map(sc.rows.map((r) => [normMa(r.ma), r]));
  } catch (e) {
    kpiErr = e instanceof Error ? e.message : String(e);
  }
  const metric = (es: EmployeeScore | undefined, key: string): MetricScore | undefined =>
    es?.metrics.find((m) => m.key === key);

  const sptt = new Set<number>();
  Object.values(d.focus).forEach((arr) => arr.forEach((p) => sptt.add(p)));
  const spxs = new Set<number>(d.cap2Cat);

  type NVRow = {
    tid: number;
    ma: string;
    ten: string;
    gam: string;
    week: number[];
    lk: number;
    sptt: number;
    spxs: number;
    khach: Set<number>;
    kh: number | null;
    thKpi: number | null;
    kdpm: number | null;
    thau: number | null;
    diem: number | null; // điểm tự tính (dự phòng)
    diemCore: number | null; // điểm chỉ tiêu chính (file)
    diemFinal: number | null; // điểm cuối gồm thưởng/phạt (file)
  };
  const byNV = new Map<number, NVRow>();
  const ensure = (tid: number): NVRow => {
    let r = byNV.get(tid);
    if (!r) {
      r = {
        tid,
        ma: d.tdvMa[tid] ?? "",
        ten: d.tdv[tid] ?? "",
        gam: d.repGam[tid] ?? "",
        week: [0, 0, 0, 0, 0],
        lk: 0,
        sptt: 0,
        spxs: 0,
        khach: new Set(),
        kh: null,
        thKpi: null,
        kdpm: null,
        thau: null,
        diem: null,
        diemCore: null,
        diemFinal: null,
      };
      byNV.set(tid, r);
    }
    return r;
  };

  // Ma trận: pid -> (tid -> doanh thu) cho các SP trọng tâm & Cấp 2.
  const prodNV = new Map<number, Map<number, number>>();
  const addPN = (pid: number, tid: number, val: number) => {
    let m = prodNV.get(pid);
    if (!m) {
      m = new Map();
      prodNV.set(pid, m);
    }
    m.set(tid, (m.get(tid) ?? 0) + val);
  };

  for (const row of d.rows) {
    const dt = new Date(baseMs + row[C.di] * MS);
    if (dt.getFullYear() !== ty || dt.getMonth() !== tmonth) continue;
    const tid = row[C.tid];
    const pid = row[C.pid];
    const r = ensure(tid);
    const val = row[C.dt];
    r.week[womIndex(dt.getDate())] += val;
    r.lk += val;
    r.khach.add(row[C.cid]);
    if (sptt.has(pid)) {
      r.sptt += val;
      addPN(pid, tid, val);
    } else if (spxs.has(pid)) {
      r.spxs += val;
      addPN(pid, tid, val);
    }
  }

  // Ghép KPI chính thức theo mã NV.
  for (const r of byNV.values()) {
    const ma = normMa(d.tdvMa[r.tid] ?? "");
    const es = scoreByMa.get(ma);
    if (!es) continue;
    const kd = metric(es, "keDon");
    const th = metric(es, "thau");
    r.kh = (kd?.keHoach ?? 0) + (th?.keHoach ?? 0) || null;
    r.kdpm = kd?.thucHien ?? null;
    r.thau = th?.thucHien ?? null;
    r.thKpi = (kd?.thucHien ?? 0) + (th?.thucHien ?? 0) || null;
    r.diem = es.diemDat || null;
    r.diemCore = es.diemTHCore ?? es.diemDat ?? null;
    r.diemFinal = es.diemTHFinal ?? es.diemTHCore ?? es.diemDat ?? null;
  }

  const order = ["Sản", "GMHS", ""];
  const groups = order
    .map((g) => ({
      gam: g,
      rows: [...byNV.values()].filter((r) => (r.gam || "") === g && r.lk > 0).sort((a, b) => b.lk - a.lk),
    }))
    .filter((grp) => grp.rows.length > 0);

  const all = [...byNV.values()].filter((r) => r.lk > 0);
  const totWeek = [0, 0, 0, 0, 0];
  let totLk = 0, totSptt = 0, totSpxs = 0, totKh = 0, totTh = 0, totKdpm = 0, totThau = 0, totDiem = 0, totDiemCore = 0, totDiemFinal = 0;
  for (const r of all) {
    r.week.forEach((v, i) => (totWeek[i] += v));
    totLk += r.lk;
    totSptt += r.sptt;
    totSpxs += r.spxs;
    totKh += r.kh ?? 0;
    totTh += r.thKpi ?? 0;
    totKdpm += r.kdpm ?? 0;
    totThau += r.thau ?? 0;
    totDiem += r.diem ?? 0;
    totDiemCore += r.diemCore ?? 0;
    totDiemFinal += r.diemFinal ?? 0;
  }
  const sanLk = all.filter((r) => r.gam === "Sản").reduce((s, r) => s + r.lk, 0);
  const gmhsLk = all.filter((r) => r.gam === "GMHS").reduce((s, r) => s + r.lk, 0);
  const topNV = [...all].sort((a, b) => b.lk - a.lk)[0];
  const lowNV = [...all].sort((a, b) => a.lk - b.lk)[0];
  const pctKh = totKh > 0 ? Math.round((totTh / totKh) * 100) : null;

  // ---- Ma trận SP × nhân viên ----
  const nvCols = groups.flatMap((g) => g.rows); // đã sắp theo Sản → GMHS → Khác, mỗi nhóm giảm dần DS
  const pnSum = (pid: number, tid: number) => prodNV.get(pid)?.get(tid) ?? 0;
  const pnRowTotal = (pid: number) => {
    let s = 0;
    for (const v of prodNV.get(pid)?.values() ?? []) s += v;
    return s;
  };
  // SPTT theo nhóm trọng tâm (nhãn focus) → sản phẩm có phát sinh.
  const spttGroups = Object.entries(d.focus)
    .map(([label, pids]) => ({
      label,
      prods: pids.filter((pid) => pnRowTotal(pid) > 0).sort((a, b) => pnRowTotal(b) - pnRowTotal(a)),
    }))
    .filter((g) => g.prods.length > 0);
  // SPXS (Cấp 2) → sản phẩm có phát sinh, nhóm theo gam hàng.
  const spxsProds = d.cap2Cat.filter((pid) => pnRowTotal(pid) > 0).sort((a, b) => pnRowTotal(b) - pnRowTotal(a));
  const spxsByGam = ["Sản", "GMHS", ""]
    .map((g) => ({ gam: g, prods: spxsProds.filter((pid) => (d.prodGam[pid] || "") === g) }))
    .filter((x) => x.prods.length > 0);

  // ---- Chỉ tiêu KPI chi tiết (mở mới · duy trì · zalo · nhân sự) ----
  const DETAIL_METRICS = [
    { key: "codeMoi", label: "Code mới" },
    { key: "moMoiSptt", label: "Mở mới SPTT" },
    { key: "duyTriSptt", label: "Duy trì SPTT" },
    { key: "moMoiC2", label: "Mở mới C2" },
    { key: "duyTriC2", label: "Duy trì C2" },
    { key: "miniapp", label: "Zalo miniapp" },
    { key: "coaching", label: "Coaching" },
    { key: "tuyenDung", label: "Tuyển dụng" },
  ];
  const fmtCount = (n: number | null | undefined) =>
    n == null ? "—" : Number.isInteger(n) ? n.toLocaleString("vi-VN") : n.toLocaleString("vi-VN", { maximumFractionDigits: 1 });

  const cell = (v: number) =>
    v > 0 ? <span className="tabular-nums">{tr(v)}</span> : <span className="text-slate-300">·</span>;
  const pctBadge = (kh: number | null, th: number | null) => {
    if (!kh || th == null) return <span className="text-slate-300">—</span>;
    const p = Math.round((th / kh) * 100);
    const c = p >= 100 ? "#1baf7a" : p >= 80 ? "#c98a00" : "#e34948";
    return (
      <span className="rounded px-1.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: `${c}1a`, color: c }}>
        {p}%
      </span>
    );
  };

  const MatrixGroup = ({
    title,
    color,
    prods,
    nvCols,
    prod,
    pnSum,
    pnRowTotal,
  }: {
    title: string;
    color: string;
    prods: number[];
    nvCols: NVRow[];
    prod: [string, string][];
    pnSum: (pid: number, tid: number) => number;
    pnRowTotal: (pid: number) => number;
  }) => (
    <>
      <tr style={{ backgroundColor: `${color}10` }}>
        <td className="px-3 py-1.5 text-xs font-bold" style={{ color }} colSpan={nvCols.length + 2}>
          {title}
        </td>
      </tr>
      {prods.map((pid) => (
        <tr key={pid} className="border-b border-slate-100">
          <td className="px-3 py-2 text-sm text-slate-700">{prod[pid]?.[1] ?? `#${pid}`}</td>
          {nvCols.map((n) => {
            const v = pnSum(pid, n.tid);
            return (
              <td key={n.tid} className="px-2 py-2 text-right text-sm text-slate-600">
                {v > 0 ? <span className="tabular-nums">{tr(v)}</span> : <span className="text-slate-300">·</span>}
              </td>
            );
          })}
          <td className="px-3 py-2 text-right text-sm font-semibold" style={{ color }}>{tr(pnRowTotal(pid))}</td>
        </tr>
      ))}
    </>
  );

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
          <td colSpan={9} />
        </tr>
        {rows.map((r) => (
          <tr key={r.tid} className="border-b border-slate-100">
            <td className="px-3 py-2">
              <a
                href={`/quan-ly/bao-cao-chot-thang/nhan-vien/${encodeURIComponent(r.ma)}?thang=${ty}-${tmonth + 1}`}
                className="text-sm font-medium text-teal-700 hover:underline"
              >
                {r.ten}
              </a>
              <div className="text-[11px] text-slate-400">{r.gam || "—"} · {r.khach.size} KH</div>
            </td>
            {r.week.map((v, i) => (
              <td key={i} className="px-3 py-2 text-right text-sm text-slate-600">{cell(v)}</td>
            ))}
            <td className="px-3 py-2 text-right text-sm font-bold text-slate-900">{tr(r.lk)}</td>
            <td className="px-3 py-2 text-right text-sm text-slate-500">{r.kh != null ? tr(r.kh) : "—"}</td>
            <td className="px-3 py-2 text-right text-sm text-slate-700">{r.thKpi != null ? tr(r.thKpi) : "—"}</td>
            <td className="px-3 py-2 text-center">{pctBadge(r.kh, r.thKpi)}</td>
            <td className="px-3 py-2 text-right text-sm text-slate-600">{r.kdpm != null ? tr(r.kdpm) : "—"}</td>
            <td className="px-3 py-2 text-right text-sm text-slate-600">{r.thau != null ? tr(r.thau) : "—"}</td>
            <td className="px-3 py-2 text-right text-sm text-emerald-700">{cell(r.sptt)}</td>
            <td className="px-3 py-2 text-right text-sm text-sky-700">{cell(r.spxs)}</td>
            <td className="px-3 py-2 text-right text-sm text-slate-600">
              {r.diemCore != null ? r.diemCore.toLocaleString("vi-VN") : "—"}
            </td>
            <td className="px-3 py-2 text-right text-sm font-bold text-indigo-700">
              {r.diemFinal != null ? r.diemFinal.toLocaleString("vi-VN") : "—"}
            </td>
          </tr>
        ))}
      </>
    );
  };

  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="manager" active="chot-thang" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <div className="mb-3 flex items-center justify-end gap-2">
          <ReportDownload targetId="bc-content" fileName={`Bao-cao-chot-thang-${thangLabel.replace("/", "-")}`} />
        </div>
        <div id="bc-content">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#0b3b40] to-[#0b6e75] p-6 text-white shadow-sm sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">📊 Báo cáo chốt tháng — {thangLabel}</h1>
              <p className="mt-1 text-sm text-white/80">
                Nhóm PS Phú Thọ · SS Hà Trọng Thủy · DATA SALE {thangLabel} · cập nhật {asof.toLocaleDateString("vi-VN")}
              </p>
            </div>
            <div className="flex gap-3">
              <div className="rounded-xl bg-white/10 px-4 py-2 text-center">
                <div className="text-lg font-bold">{tr(totLk)}tr</div>
                <div className="text-[11px] text-white/70">Tổng DS {thangLabel}</div>
              </div>
              {totKh > 0 && (
                <div className="rounded-xl bg-white/10 px-4 py-2 text-center">
                  <div className="text-lg font-bold">{pctKh}%</div>
                  <div className="text-[11px] text-white/70">TH KPI vs KH</div>
                </div>
              )}
              {totDiemFinal > 0 && (
                <div className="rounded-xl bg-white/10 px-4 py-2 text-center">
                  <div className="text-lg font-bold">{totDiemFinal.toLocaleString("vi-VN")}</div>
                  <div className="text-[11px] text-white/70">Tổng điểm KPI (cuối)</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xl font-bold text-slate-900">{tr(totLk)}tr</div>
            <div className="mt-0.5 text-xs text-slate-500">Tổng DS nhóm (DATA SALE)</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xl font-bold" style={{ color: GAM_COLORS["Sản"] }}>{tr(sanLk)}tr</div>
            <div className="mt-0.5 text-xs text-slate-500">Nhóm Sản · {totLk > 0 ? Math.round((sanLk / totLk) * 100) : 0}%</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xl font-bold" style={{ color: GAM_COLORS["GMHS"] }}>{tr(gmhsLk)}tr</div>
            <div className="mt-0.5 text-xs text-slate-500">Nhóm GMHS · {totLk > 0 ? Math.round((gmhsLk / totLk) * 100) : 0}%</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xl font-bold text-emerald-700">{tr(totSptt)}tr</div>
            <div className="mt-0.5 text-xs text-slate-500">SP trọng tâm · {totLk > 0 ? Math.round((totSptt / totLk) * 100) : 0}% DS</div>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">
            DS theo tuần (DATA SALE) → Lũy kế {thangLabel} → KPI chính thức → SPTT/SPXS → Điểm (tr)
          </h2>
          <p className="mb-3 text-xs text-slate-400">
            TH KPI = DS KĐ-PM + DS thầu · SPTT = SP trọng tâm · SPXS = SP Cấp 2 (Chuyên khoa PS). <b>Điểm chính</b> = tổng điểm KPIs các chỉ tiêu chính; <b>Điểm cuối</b> = điểm KPIs tháng chính thức (đã gồm thưởng/phạt) — lấy thẳng từ file KPI công ty.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="px-3 py-2 text-left font-semibold">Nhân viên</th>
                  {WEEK_LABELS.map((w) => (
                    <th key={w} className="px-3 py-2 text-right font-semibold">{w}</th>
                  ))}
                  <th className="px-3 py-2 text-right font-semibold">LK {thangLabel}</th>
                  <th className="px-3 py-2 text-right font-semibold">KH</th>
                  <th className="px-3 py-2 text-right font-semibold">TH KPI</th>
                  <th className="px-3 py-2 text-center font-semibold">%KH</th>
                  <th className="px-3 py-2 text-right font-semibold">KĐ-PM</th>
                  <th className="px-3 py-2 text-right font-semibold">Thầu</th>
                  <th className="px-3 py-2 text-right font-semibold">SPTT</th>
                  <th className="px-3 py-2 text-right font-semibold">SPXS</th>
                  <th className="px-3 py-2 text-right font-semibold">Điểm chính</th>
                  <th className="px-3 py-2 text-right font-semibold">Điểm cuối</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <NVBlock key={g.gam} gam={g.gam} rows={g.rows} />
                ))}
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                  <td className="px-3 py-2 text-sm text-slate-900">TỔNG NHÓM</td>
                  {totWeek.map((v, i) => (
                    <td key={i} className="px-3 py-2 text-right text-sm text-slate-700">{cell(v)}</td>
                  ))}
                  <td className="px-3 py-2 text-right text-sm text-slate-900">{tr(totLk)}</td>
                  <td className="px-3 py-2 text-right text-sm text-slate-600">{totKh > 0 ? tr(totKh) : "—"}</td>
                  <td className="px-3 py-2 text-right text-sm text-slate-700">{totTh > 0 ? tr(totTh) : "—"}</td>
                  <td className="px-3 py-2 text-center">{pctBadge(totKh || null, totTh || null)}</td>
                  <td className="px-3 py-2 text-right text-sm text-slate-600">{totKdpm > 0 ? tr(totKdpm) : "—"}</td>
                  <td className="px-3 py-2 text-right text-sm text-slate-600">{totThau > 0 ? tr(totThau) : "—"}</td>
                  <td className="px-3 py-2 text-right text-sm text-emerald-700">{tr(totSptt)}</td>
                  <td className="px-3 py-2 text-right text-sm text-sky-700">{tr(totSpxs)}</td>
                  <td className="px-3 py-2 text-right text-sm text-slate-700">{totDiemCore > 0 ? totDiemCore.toLocaleString("vi-VN") : "—"}</td>
                  <td className="px-3 py-2 text-right text-sm text-indigo-700">{totDiemFinal > 0 ? totDiemFinal.toLocaleString("vi-VN") : "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {kpiErr && (
            <p className="mt-2 text-xs text-amber-600">Lưu ý KPI: {kpiErr}</p>
          )}
        </section>

        <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">⭐ Điểm nổi bật {thangLabel}</h2>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            <li>
              Tổng DS nhóm <b>{tr(totLk)}tr</b>{totKh > 0 ? <> · TH KPI {tr(totTh)}tr = <b>{pctKh}%</b> KH {tr(totKh)}tr</> : null} · Sản {tr(sanLk)}tr ({totLk > 0 ? Math.round((sanLk / totLk) * 100) : 0}%) · GMHS {tr(gmhsLk)}tr ({totLk > 0 ? Math.round((gmhsLk / totLk) * 100) : 0}%).
            </li>
            {topNV && (
              <li>Dẫn đầu DS: <b>{topNV.ten}</b> {tr(topNV.lk)}tr · thấp nhất: {lowNV?.ten} {lowNV ? tr(lowNV.lk) : 0}tr.</li>
            )}
            <li>SP trọng tâm {tr(totSptt)}tr ({totLk > 0 ? Math.round((totSptt / totLk) * 100) : 0}% DS) · SP Cấp 2 {tr(totSpxs)}tr ({totLk > 0 ? Math.round((totSpxs / totLk) * 100) : 0}% DS).</li>
          </ul>
        </section>

        {/* ---- Ma trận SP × nhân viên ---- */}
        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">🧬 Ma trận SP trọng tâm & SP Cấp 2 (theo nhân viên)</h2>
          <p className="mb-3 text-xs text-slate-400">Doanh thu từng sản phẩm (triệu đồng) theo từng nhân viên · chỉ hiện SP có phát sinh trong {thangLabel}.</p>

          <h3 className="mb-1 mt-1 text-xs font-bold" style={{ color: "#059669" }}>⭐ SP trọng tâm (SPTT)</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="px-3 py-2 text-left font-semibold">Sản phẩm</th>
                  {nvCols.map((n) => (
                    <th key={n.tid} className="px-2 py-2 text-right font-semibold">{n.ten.split(" ").slice(-2).join(" ")}</th>
                  ))}
                  <th className="px-3 py-2 text-right font-semibold">Tổng</th>
                </tr>
              </thead>
              <tbody>
                {spttGroups.map((g) => (
                  <MatrixGroup
                    key={g.label}
                    title={g.label}
                    color="#059669"
                    prods={g.prods}
                    nvCols={nvCols}
                    prod={d.prod}
                    pnSum={pnSum}
                    pnRowTotal={pnRowTotal}
                  />
                ))}
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                  <td className="px-3 py-2 text-sm text-slate-900">TỔNG SPTT</td>
                  {nvCols.map((n) => (
                    <td key={n.tid} className="px-2 py-2 text-right text-sm text-slate-700">{n.sptt > 0 ? tr(n.sptt) : <span className="text-slate-300">·</span>}</td>
                  ))}
                  <td className="px-3 py-2 text-right text-sm text-emerald-700">{tr(totSptt)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="mb-1 mt-5 text-xs font-bold" style={{ color: "#0284c7" }}>🩺 SP Cấp 2 — Chuyên khoa PS (SPXS)</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="px-3 py-2 text-left font-semibold">Sản phẩm</th>
                  {nvCols.map((n) => (
                    <th key={n.tid} className="px-2 py-2 text-right font-semibold">{n.ten.split(" ").slice(-2).join(" ")}</th>
                  ))}
                  <th className="px-3 py-2 text-right font-semibold">Tổng</th>
                </tr>
              </thead>
              <tbody>
                {spxsByGam.map((g) => (
                  <MatrixGroup
                    key={g.gam || "khac"}
                    title={`Nhóm ${g.gam || "Khác"}`}
                    color={GAM_COLORS[g.gam] || "#0284c7"}
                    prods={g.prods}
                    nvCols={nvCols}
                    prod={d.prod}
                    pnSum={pnSum}
                    pnRowTotal={pnRowTotal}
                  />
                ))}
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                  <td className="px-3 py-2 text-sm text-slate-900">TỔNG SPXS</td>
                  {nvCols.map((n) => (
                    <td key={n.tid} className="px-2 py-2 text-right text-sm text-slate-700">{n.spxs > 0 ? tr(n.spxs) : <span className="text-slate-300">·</span>}</td>
                  ))}
                  <td className="px-3 py-2 text-right text-sm text-sky-700">{tr(totSpxs)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ---- Chỉ tiêu KPI chi tiết ---- */}
        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">🎯 Chỉ tiêu KPI: Mở mới · Duy trì · Zalo miniapp · Nhân sự</h2>
          <p className="mb-3 text-xs text-slate-400">Định dạng ô: <b>Thực hiện / Kế hoạch</b> (theo file KPI công ty {thangLabel}). Xanh = đạt/vượt KH.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="px-3 py-2 text-left font-semibold">Nhân viên</th>
                  {DETAIL_METRICS.map((m) => (
                    <th key={m.key} className="px-2 py-2 text-center font-semibold">{m.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {nvCols.map((n) => {
                  const es = scoreByMa.get(normMa(n.ma));
                  return (
                    <tr key={n.tid} className="border-b border-slate-100">
                      <td className="px-3 py-2 text-sm font-medium text-slate-900">{n.ten}</td>
                      {DETAIL_METRICS.map((m) => {
                        const ms = metric(es, m.key);
                        const th = ms?.thucHien ?? null;
                        const kh = ms?.keHoach ?? null;
                        const dat = th != null && kh != null && kh > 0 && th >= kh;
                        return (
                          <td key={m.key} className="px-2 py-2 text-center text-xs">
                            {th == null && kh == null ? (
                              <span className="text-slate-300">—</span>
                            ) : (
                              <span className={dat ? "font-semibold text-emerald-700" : "text-slate-600"}>
                                {fmtCount(th)}<span className="text-slate-300"> / {fmtCount(kh)}</span>
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Code mới · Mở mới/Duy trì SPTT · Mở mới/Duy trì C2 web tự tính từ DATA SALE; Zalo miniapp · Coaching · Tuyển dụng lấy ô Thực hiện công ty nhập (— nếu chưa nhập). Chỉ tiêu Tranh 3D chưa có trong file KPI nên không hiển thị.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
          Nhấp vào <b className="text-teal-700">tên nhân viên</b> ở bảng tổng quan để xem trang chi tiết (biểu đồ tuần · kế hoạch → kết quả · nhận xét). Nguồn: DATA SALE (Sale sạch) + file KPI công ty (tháng {tmonth + 1}/{ty}).
        </section>
        </div>
      </main>
    </>
  );
}
