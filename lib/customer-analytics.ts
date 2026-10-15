// Phân tích khách hàng từ file Sale chi tiết (getSaleDetailData):
//  1) RFM — phân hạng khách theo Recency (gần đây mua) / Frequency (tần suất) / Monetary (giá trị).
//  2) Hồ sơ 360° — lịch sử mua 12 tháng + SP đang dùng + TDV phụ trách (kèm sẵn trong mỗi dòng khách).
//  3) Cảnh báo bất thường — khách / SP có doanh số 30 ngày gần nhất TỤT MẠNH so với nhịp 90 ngày trước.
// Bản nhân viên: truyền onlyMa để chỉ tính khách/giao dịch của chính TDV đó.

import type { SaleDetailData } from "./sale-detail";
import { allEmployees, isDepartedInMonth } from "./allowlist";

const DAY = 86400000;

const normMa = (s: unknown) => String(s ?? "").trim().replace(/^0+(?=\d)/, "");

/** Tập tid (chỉ số TDV trong data.tdv) của những NV đã nghỉ tính tới tháng hiện tại. */
function departedTidSet(data: SaleDetailData): Set<number> {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const depMa = new Set<string>();
  for (const e of allEmployees()) if (isDepartedInMonth(e, y, m)) depMa.add(normMa(e.maNhanVien));
  const s = new Set<number>();
  data.tdvMa.forEach((ma, tid) => { if (depMa.has(normMa(ma))) s.add(tid); });
  return s;
}

const BAN_GIAO = "(đã bàn giao)";

/** Tên TDV đang phụ trách: ưu tiên TDV còn làm việc có doanh số cao nhất; nếu chỉ còn NV đã nghỉ -> "(đã bàn giao)". */
function repNameOf(data: SaleDetailData, repDt: Map<number, number>, depTid: Set<number>): string {
  const entries = [...repDt.entries()].sort((x, y) => y[1] - x[1]);
  const active = entries.find(([tid]) => !depTid.has(tid));
  if (active) return data.tdv[active[0]] ?? "";
  return entries.length ? BAN_GIAO : "";
}

// ---------- RFM + 360° ----------
export interface SpUsage {
  ten: string;
  dt: number;
  sl: number;
  lanCuoiNgay: number; // số ngày kể từ lần mua gần nhất SP này
}
export interface CustomerRow {
  cid: number;
  maKH: string;
  tenKH: string;
  tinh: string;
  nhomKH: string;
  repTen: string;
  recencyDays: number;
  freq: number; // số ngày có đơn (xấp xỉ số lần mua)
  monetary: number; // doanh thu 12 tháng gần nhất
  totalDt: number; // tổng doanh thu toàn lịch sử
  R: number;
  F: number;
  M: number; // 1..5
  segment: string;
  monthly: { k: string; dt: number }[]; // 12 tháng gần nhất
  sps: SpUsage[]; // top SP theo DT (12T)
}
export interface RFMResult {
  asofLabel: string;
  segments: { name: string; count: number; dt: number }[];
  customers: CustomerRow[];
  error?: string | null;
}

// Thứ tự & màu các phân hạng (component dùng lại).
export const SEGMENTS = [
  "Khách VIP",
  "Trung thành",
  "Khách mới / tiềm năng",
  "Cần chú ý",
  "Nguy cơ rời",
  "Đã ngủ",
  "Khác",
] as const;

function resolveTid(data: SaleDetailData, onlyMa?: string): number | null {
  if (!onlyMa) return null;
  const n = String(onlyMa).trim().replace(/^0+(?=\d)/, "");
  const idx = data.tdvMa.findIndex((m) => String(m).trim().replace(/^0+(?=\d)/, "") === n);
  return idx >= 0 ? idx : -1; // -1 = có lọc nhưng không khớp TDV nào
}

function monthKeyOf(baseMs: number, di: number): string {
  const d = new Date(baseMs + di * DAY);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function quintile(sortedRanksByCid: Map<number, number>, cid: number, total: number): number {
  // rank 0 = tốt nhất. Chia 5 bậc: bậc 5 = tốt nhất.
  const rank = sortedRanksByCid.get(cid) ?? total;
  const q = Math.floor((rank / Math.max(1, total)) * 5); // 0..4
  return 5 - Math.min(4, q); // 5..1
}

function segmentOf(R: number, F: number, M: number): string {
  if (R >= 4 && F >= 4) return "Khách VIP";
  if (R >= 4 && F <= 2 && M <= 3) return "Khách mới / tiềm năng";
  if (R >= 3 && F >= 3) return "Trung thành";
  if (R <= 2 && (F >= 3 || M >= 4)) return "Nguy cơ rời";
  if (R <= 1 && F <= 2) return "Đã ngủ";
  if (R === 3) return "Cần chú ý";
  return "Khác";
}

export function buildCustomerRFM(data: SaleDetailData, onlyMa?: string, maxCustomers = 600): RFMResult {
  if (data.error) return { asofLabel: "", segments: [], customers: [], error: data.error };
  const C = { cid: 0, tid: 1, pid: 2, di: 3, sl: 4, dt: 5 };
  const baseMs = new Date(data.base + "T00:00:00").getTime();
  const asof = data.asofDi;
  const onlyTid = resolveTid(data, onlyMa);
  if (onlyTid === -1) return { asofLabel: labelOfDi(baseMs, asof), segments: [], customers: [] };

  const win12 = asof - 365;
  const depTid = departedTidSet(data);

  type Agg = {
    lastDi: number;
    freqDays: Set<number>;
    monetary12: number;
    total: number;
    repDt: Map<number, number>;
    monthly: Map<string, number>;
    sp: Map<number, { dt: number; sl: number; lastDi: number }>;
  };
  const byCid = new Map<number, Agg>();

  for (const r of data.rows) {
    if (onlyTid != null && r[C.tid] !== onlyTid) continue;
    const cid = r[C.cid];
    let a = byCid.get(cid);
    if (!a) {
      a = { lastDi: -1, freqDays: new Set(), monetary12: 0, total: 0, repDt: new Map(), monthly: new Map(), sp: new Map() };
      byCid.set(cid, a);
    }
    const di = r[C.di], dt = r[C.dt], sl = r[C.sl];
    if (di > a.lastDi) a.lastDi = di;
    a.freqDays.add(di);
    a.total += dt;
    a.repDt.set(r[C.tid], (a.repDt.get(r[C.tid]) ?? 0) + dt);
    if (di >= win12) {
      a.monetary12 += dt;
      const mk = monthKeyOf(baseMs, di);
      a.monthly.set(mk, (a.monthly.get(mk) ?? 0) + dt);
      const sp = a.sp.get(r[C.pid]) ?? { dt: 0, sl: 0, lastDi: -1 };
      sp.dt += dt; sp.sl += sl; if (di > sp.lastDi) sp.lastDi = di;
      a.sp.set(r[C.pid], sp);
    }
  }

  // Danh sách 12 nhãn tháng gần nhất.
  const months12: string[] = [];
  {
    const d = new Date(baseMs + asof * DAY);
    for (let i = 11; i >= 0; i--) {
      const dd = new Date(d.getFullYear(), d.getMonth() - i, 1);
      months12.push(`${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}`);
    }
  }

  let rows: CustomerRow[] = [...byCid.entries()]
    .filter(([, a]) => a.total > 0)
    .map(([cid, a]) => {
      const info = data.cust[cid] ?? ["", "", "", ""];
      const repTen = repNameOf(data, a.repDt, depTid);
      const sps: SpUsage[] = [...a.sp.entries()]
        .map(([pid, v]) => ({ ten: data.prod[pid]?.[1] || data.prod[pid]?.[0] || `SP#${pid}`, dt: v.dt, sl: v.sl, lanCuoiNgay: asof - v.lastDi }))
        .sort((x, y) => y.dt - x.dt)
        .slice(0, 8);
      return {
        cid,
        maKH: info[0],
        tenKH: info[1] || info[0] || `KH#${cid}`,
        tinh: info[2] || "",
        nhomKH: info[3] || "",
        repTen,
        recencyDays: asof - a.lastDi,
        freq: a.freqDays.size,
        monetary: a.monetary12,
        totalDt: a.total,
        R: 0, F: 0, M: 0,
        segment: "Khác",
        monthly: months12.map((k) => ({ k, dt: a.monthly.get(k) ?? 0 })),
        sps,
      };
    });

  // Giới hạn payload: giữ top theo tổng doanh thu.
  rows.sort((a, b) => b.totalDt - a.totalDt);
  if (rows.length > maxCustomers) rows = rows.slice(0, maxCustomers);

  // Chấm R/F/M theo ngũ phân vị trên tập hiện có.
  const n = rows.length;
  const rankMap = (key: (r: CustomerRow) => number, asc: boolean) => {
    const order = rows.slice().sort((a, b) => (asc ? key(a) - key(b) : key(b) - key(a)));
    const m = new Map<number, number>();
    order.forEach((r, i) => m.set(r.cid, i));
    return m;
  };
  const rR = rankMap((r) => r.recencyDays, true); // recency nhỏ = tốt
  const rF = rankMap((r) => r.freq, false);
  const rM = rankMap((r) => r.monetary, false);
  for (const r of rows) {
    r.R = quintile(rR, r.cid, n);
    r.F = quintile(rF, r.cid, n);
    r.M = quintile(rM, r.cid, n);
    r.segment = segmentOf(r.R, r.F, r.M);
  }

  // Thống kê theo phân hạng.
  const segMap = new Map<string, { count: number; dt: number }>();
  for (const r of rows) {
    const s = segMap.get(r.segment) ?? { count: 0, dt: 0 };
    s.count += 1; s.dt += r.monetary;
    segMap.set(r.segment, s);
  }
  const segments = SEGMENTS.filter((s) => segMap.has(s)).map((name) => ({ name, count: segMap.get(name)!.count, dt: segMap.get(name)!.dt }));

  // Xếp hiển thị: giá trị 12T giảm dần.
  rows.sort((a, b) => b.monetary - a.monetary || a.recencyDays - b.recencyDays);

  return { asofLabel: labelOfDi(baseMs, asof), segments, customers: rows };
}

function labelOfDi(baseMs: number, di: number): string {
  const d = new Date(baseMs + di * DAY);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// ---------- Cảnh báo bất thường ----------
export interface AnomalyRow {
  ten: string;
  phu: string; // tỉnh (khách) hoặc gam/nhóm (SP)
  rep: string;
  recent: number; // DT 30 ngày gần nhất
  baseline: number; // DT trung bình/30 ngày của 90 ngày trước đó
  drop: number; // baseline - recent (giá trị hụt)
  dropPct: number; // % giảm
}
export interface AnomalyResult {
  asofLabel: string;
  windowLabel: string;
  khach: AnomalyRow[];
  sanpham: AnomalyRow[];
  error?: string | null;
}

export function buildAnomaly(
  data: SaleDetailData,
  onlyMa?: string,
  opts: { nguongKhach?: number; nguongSP?: number; tyLeGiam?: number } = {}
): AnomalyResult {
  if (data.error) return { asofLabel: "", windowLabel: "", khach: [], sanpham: [], error: data.error };
  const C = { cid: 0, tid: 1, pid: 2, di: 3, sl: 4, dt: 5 };
  const baseMs = new Date(data.base + "T00:00:00").getTime();
  const asof = data.asofDi;
  const onlyTid = resolveTid(data, onlyMa);
  if (onlyTid === -1) return { asofLabel: labelOfDi(baseMs, asof), windowLabel: "", khach: [], sanpham: [] };

  const depTid = departedTidSet(data);
  const nguongKhach = opts.nguongKhach ?? 2_000_000;
  const nguongSP = opts.nguongSP ?? 5_000_000;
  const tyLeGiam = opts.tyLeGiam ?? 0.5; // recent < 50% baseline => tụt mạnh

  const recFrom = asof - 29; // 30 ngày gần nhất
  const preFrom = asof - 119, preTo = asof - 30; // 90 ngày liền trước

  type Acc = { recent: number; prev: number; rep: Map<number, number> };
  const khach = new Map<number, Acc>();
  const sp = new Map<number, Acc>();
  const mk = () => ({ recent: 0, prev: 0, rep: new Map<number, number>() });

  for (const r of data.rows) {
    if (onlyTid != null && r[C.tid] !== onlyTid) continue;
    const di = r[C.di], dt = r[C.dt];
    const inRec = di >= recFrom && di <= asof;
    const inPre = di >= preFrom && di <= preTo;
    if (!inRec && !inPre) continue;

    const k = khach.get(r[C.cid]) ?? mk();
    const s = sp.get(r[C.pid]) ?? mk();
    if (inRec) { k.recent += dt; s.recent += dt; }
    else { k.prev += dt; s.prev += dt; }
    k.rep.set(r[C.tid], (k.rep.get(r[C.tid]) ?? 0) + dt);
    s.rep.set(r[C.tid], (s.rep.get(r[C.tid]) ?? 0) + dt);
    khach.set(r[C.cid], k);
    sp.set(r[C.pid], s);
  }

  const build = (
    m: Map<number, Acc>,
    nguong: number,
    nameOf: (id: number) => string,
    phuOf: (id: number) => string
  ): AnomalyRow[] => {
    const out: AnomalyRow[] = [];
    for (const [id, a] of m.entries()) {
      const baseline = a.prev / 3; // trung bình mỗi 30 ngày
      if (baseline < nguong) continue; // bỏ qua khách/SP nhỏ
      if (a.recent >= baseline * tyLeGiam) continue; // chưa tụt đủ mạnh
      out.push({
        ten: nameOf(id),
        phu: phuOf(id),
        rep: repNameOf(data, a.rep, depTid),
        recent: a.recent,
        baseline,
        drop: baseline - a.recent,
        dropPct: baseline > 0 ? (1 - a.recent / baseline) * 100 : 100,
      });
    }
    return out.sort((x, y) => y.drop - x.drop);
  };

  const khachRows = build(
    khach,
    nguongKhach,
    (id) => data.cust[id]?.[1] || data.cust[id]?.[0] || `KH#${id}`,
    (id) => data.cust[id]?.[2] || ""
  );
  const spRows = build(
    sp,
    nguongSP,
    (id) => data.prod[id]?.[1] || data.prod[id]?.[0] || `SP#${id}`,
    (id) => data.prodGam[id] || ""
  );

  return {
    asofLabel: labelOfDi(baseMs, asof),
    windowLabel: `30 ngày gần nhất so với nhịp 90 ngày trước (tới ${labelOfDi(baseMs, asof)})`,
    khach: khachRows,
    sanpham: spRows,
  };
}
