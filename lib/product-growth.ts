// Báo cáo TĂNG TRƯỞNG SẢN PHẨM (SP trọng tâm + SP Cấp 2) theo QUÝ.
// - So quý hiện tại (lũy kế tới hôm nay, có DỰ BÁO cả quý theo pace) với quý liền trước.
// - Chỉ tiêu: +10% so quý trước, áp cho TỪNG sản phẩm và cho TỔNG mỗi loại (trọng tâm / cấp 2).
// - Theo dõi CẢ sản lượng (SL) lẫn doanh thu (DT) — vì giá sản phẩm có thể thay đổi.
// - Danh mục Cấp 2 dùng DANH MỤC CHUNG của nhóm (data.cap2Cat) cho cả nhóm lẫn từng TDV.
//
// Nguồn dữ liệu: getSaleDetailData() (tab "Sale sạch") — đã phân loại focus (SPTT) & cap2Cat.

import type { SaleDetailData } from "./sale-detail";
import { allEmployees, isDepartedInMonth, type AllowlistEntry } from "./allowlist";

export const GROWTH_TARGET = 1.1; // +10% so quý trước

export interface GrowMetric {
  sl: number;
  dt: number;
}
export interface GrowRow {
  label: string; // tên SP (hoặc nhãn SP trọng tâm)
  loai: "trongTam" | "cap2";
  gam: string; // "Sản" | "GMHS" | ""
  prev: GrowMetric; // quý trước (đủ quý)
  now: GrowMetric; // quý này lũy kế tới hôm nay
  forecast: GrowMetric; // dự báo cả quý (theo pace)
  target: GrowMetric; // = prev * 1.1
}
export interface GrowTotals {
  prev: GrowMetric;
  now: GrowMetric;
  forecast: GrowMetric;
  target: GrowMetric;
}
export interface GrowScope {
  rowsTT: GrowRow[];
  rowsC2: GrowRow[];
  totalTT: GrowTotals;
  totalC2: GrowTotals;
}
export interface GrowTdv {
  tid: number;
  ten: string;
  ma: string;
  gam: string;
  scope: GrowScope;
}
export interface QuarterWindow {
  label: string; // "Q4/2026"
  prevLabel: string; // "Q3/2026"
  nowFromMs: number;
  nowToMs: number;
  prevFromMs: number;
  prevToMs: number;
  daysElapsed: number;
  daysTotal: number;
  fraction: number; // daysElapsed / daysTotal
  isComplete: boolean;
}
export interface ProductGrowthResult {
  quarter: QuarterWindow;
  team: GrowScope;
  byTdv: GrowTdv[];
  error?: string | null;
}

const DAY = 86400000;

/** Cửa sổ quý hiện tại (lũy kế tới hôm nay) và quý liền trước (đủ quý). */
export function resolveQuarter(today: Date): QuarterWindow {
  const y = today.getFullYear();
  const mi = today.getMonth(); // 0..11
  const q = Math.floor(mi / 3); // 0..3
  const qStartMonth = q * 3; // tháng bắt đầu quý (0-based)

  const qStart = new Date(y, qStartMonth, 1).getTime();
  const qEnd = new Date(y, qStartMonth + 3, 0, 23, 59, 59, 999).getTime(); // ngày cuối quý
  const endOfToday = new Date(y, mi, today.getDate(), 23, 59, 59, 999).getTime();
  const nowToMs = Math.min(qEnd, endOfToday);

  const pStart = new Date(y, qStartMonth - 3, 1).getTime();
  const pEnd = new Date(y, qStartMonth, 0, 23, 59, 59, 999).getTime();

  const daysTotal = Math.round((qEnd - qStart) / DAY) + 1;
  const daysElapsed = Math.min(daysTotal, Math.max(1, Math.round((nowToMs - qStart) / DAY) + 1));
  const fraction = daysElapsed / daysTotal;

  const qNum = q + 1;
  const pqNum = qNum === 1 ? 4 : qNum - 1;
  const pY = qNum === 1 ? y - 1 : y;

  return {
    label: `Q${qNum}/${y}`,
    prevLabel: `Q${pqNum}/${pY}`,
    nowFromMs: qStart,
    nowToMs,
    prevFromMs: pStart,
    prevToMs: pEnd,
    daysElapsed,
    daysTotal,
    fraction,
    isComplete: daysElapsed >= daysTotal,
  };
}

function emptyMetric(): GrowMetric {
  return { sl: 0, dt: 0 };
}
function emptyScope(): { ttByLabel: Map<string, GrowMetric[]>; c2ByLabel: Map<string, GrowMetric[]>; gamByLabel: Map<string, string> } {
  return { ttByLabel: new Map(), c2ByLabel: new Map(), gamByLabel: new Map() };
}

/**
 * Tính báo cáo tăng trưởng SP cho toàn nhóm và từng TDV trong 1 lần quét dữ liệu.
 * forecast = now * (daysTotal / daysElapsed); nếu quý đã đủ ngày thì forecast = now.
 */
export function buildProductGrowth(data: SaleDetailData, today: Date): ProductGrowthResult {
  const quarter = resolveQuarter(today);
  if (data.error) {
    return { quarter, team: blankScope(), byTdv: [], error: data.error };
  }

  const C = { cid: 0, tid: 1, pid: 2, di: 3, sl: 4, dt: 5 };
  const baseMs = new Date(data.base + "T00:00:00").getTime();
  const msToDi = (ms: number) => Math.round((ms - baseMs) / DAY);
  const nf = msToDi(quarter.nowFromMs), nt = msToDi(quarter.nowToMs);
  const pf = msToDi(quarter.prevFromMs), pt = msToDi(quarter.prevToMs);

  // pid -> nhãn SP trọng tâm.
  const pidToTT = new Map<number, string>();
  for (const [label, pids] of Object.entries(data.focus)) {
    for (const p of pids) if (!pidToTT.has(p)) pidToTT.set(p, label);
  }
  // pid -> tên SP cấp 2 (danh mục chung của nhóm). Không trùng với SP trọng tâm.
  const pidToC2 = new Map<number, string>();
  for (const p of data.cap2Cat) {
    if (pidToTT.has(p)) continue;
    const ten = data.prod[p]?.[1] || data.prod[p]?.[0] || `SP#${p}`;
    pidToC2.set(p, ten);
  }

  // Gộp theo (label, kỳ). Mỗi label giữ [prev, now].
  type Agg = { prev: GrowMetric; now: GrowMetric; gam: string };
  const mkAgg = (): Agg => ({ prev: emptyMetric(), now: emptyMetric(), gam: "" });

  const teamTT = new Map<string, Agg>();
  const teamC2 = new Map<string, Agg>();
  const tdvTT: Map<string, Agg>[] = data.tdv.map(() => new Map());
  const tdvC2: Map<string, Agg>[] = data.tdv.map(() => new Map());

  const gamOfPid = (pid: number) => data.prodGam[pid] ?? "";

  for (const r of data.rows) {
    const di = r[C.di];
    const inNow = di >= nf && di <= nt;
    const inPrev = di >= pf && di <= pt;
    if (!inNow && !inPrev) continue;

    const pid = r[C.pid];
    const tid = r[C.tid];
    const sl = r[C.sl];
    const dt = r[C.dt];

    let label: string | null = null;
    let loai: "trongTam" | "cap2" | null = null;
    if (pidToTT.has(pid)) { label = pidToTT.get(pid)!; loai = "trongTam"; }
    else if (pidToC2.has(pid)) { label = pidToC2.get(pid)!; loai = "cap2"; }
    if (!label || !loai) continue;

    const bump = (map: Map<string, Agg>) => {
      let a = map.get(label!);
      if (!a) { a = mkAgg(); a.gam = gamOfPid(pid); map.set(label!, a); }
      if (!a.gam) a.gam = gamOfPid(pid);
      if (inNow) { a.now.sl += sl; a.now.dt += dt; }
      else { a.prev.sl += sl; a.prev.dt += dt; }
    };

    if (loai === "trongTam") {
      bump(teamTT);
      if (tdvTT[tid]) bump(tdvTT[tid]);
    } else {
      bump(teamC2);
      if (tdvC2[tid]) bump(tdvC2[tid]);
    }
  }

  const factor = quarter.isComplete ? 1 : quarter.daysTotal / quarter.daysElapsed;

  const toRows = (map: Map<string, Agg>, loai: "trongTam" | "cap2"): GrowRow[] => {
    const rows: GrowRow[] = [];
    for (const [label, a] of map.entries()) {
      if (a.prev.sl === 0 && a.prev.dt === 0 && a.now.sl === 0 && a.now.dt === 0) continue;
      rows.push({
        label,
        loai,
        gam: a.gam,
        prev: { ...a.prev },
        now: { ...a.now },
        forecast: { sl: a.now.sl * factor, dt: a.now.dt * factor },
        target: { sl: a.prev.sl * GROWTH_TARGET, dt: a.prev.dt * GROWTH_TARGET },
      });
    }
    // SP trọng tâm xếp theo DT quý trước giảm dần; cấp 2 cũng vậy.
    return rows.sort((x, y) => y.prev.dt - x.prev.dt || y.now.dt - x.now.dt);
  };

  const totalsOf = (rows: GrowRow[]): GrowTotals => {
    const prev = emptyMetric(), now = emptyMetric(), forecast = emptyMetric(), target = emptyMetric();
    for (const r of rows) {
      prev.sl += r.prev.sl; prev.dt += r.prev.dt;
      now.sl += r.now.sl; now.dt += r.now.dt;
      forecast.sl += r.forecast.sl; forecast.dt += r.forecast.dt;
      target.sl += r.target.sl; target.dt += r.target.dt;
    }
    return { prev, now, forecast, target };
  };

  const scopeOf = (mapTT: Map<string, Agg>, mapC2: Map<string, Agg>): GrowScope => {
    const rowsTT = toRows(mapTT, "trongTam");
    const rowsC2 = toRows(mapC2, "cap2");
    return { rowsTT, rowsC2, totalTT: totalsOf(rowsTT), totalC2: totalsOf(rowsC2) };
  };

  const team = scopeOf(teamTT, teamC2);

  // NV đã nghỉ tính tới quý hiện tại: KHÔNG hiện thẻ theo dõi của họ (họ không thể đóng góp cho quý này),
  // nhưng VẪN giữ doanh số lịch sử của họ trong TỔNG NHÓM để làm nền tăng trưởng của cả đội.
  const nowMonth = new Date(quarter.nowToMs);
  const depMaSet = new Set<string>();
  for (const e of allEmployees() as AllowlistEntry[]) {
    if (isDepartedInMonth(e, nowMonth.getFullYear(), nowMonth.getMonth() + 1)) {
      depMaSet.add(String(e.maNhanVien ?? "").trim().replace(/^0+(?=\d)/, ""));
    }
  }

  const byTdv: GrowTdv[] = data.tdv
    .map((ten, tid) => ({
      tid,
      ten,
      ma: data.tdvMa[tid] ?? "",
      gam: data.repGam[tid] ?? "",
      scope: scopeOf(tdvTT[tid], tdvC2[tid]),
    }))
    // Bỏ NV đã nghỉ; chỉ giữ TDV có hoạt động ở ít nhất 1 loại (tránh hiện người không phụ trách SP nào).
    .filter((t) => !depMaSet.has(String(t.ma).trim().replace(/^0+(?=\d)/, "")))
    .filter((t) => t.scope.rowsTT.length > 0 || t.scope.rowsC2.length > 0);

  return { quarter, team, byTdv, error: null };
}

function blankTotals(): GrowTotals {
  return { prev: emptyMetric(), now: emptyMetric(), forecast: emptyMetric(), target: emptyMetric() };
}
function blankScope(): GrowScope {
  return { rowsTT: [], rowsC2: [], totalTT: blankTotals(), totalC2: blankTotals() };
}
