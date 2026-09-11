import { google } from "googleapis";
import { allEmployees } from "./allowlist";
import { parseMoney } from "./format";

// Sinh dữ liệu chi tiết cho màn "Tra cứu Sale" (public/sale.html) TRỰC TIẾP từ Google Sheet
// "Sale sạch" — thay cho bản snapshot tĩnh trước đây (chỉ có dữ liệu từ 2026). Nhờ đọc trực tiếp,
// màn tra cứu luôn cập nhật và bao gồm TOÀN BỘ lịch sử (từ 2025) nên không còn lệch với báo cáo tuần.

const SALES_SPREADSHEET_ID =
  process.env.GOOGLE_SHEETS_SALES_SPREADSHEET_ID || "19CNg5Q38a7tAyNR8NSY6-E5U1Q1kqdhsblftGuGDsdU";
const SALES_TAB = process.env.GOOGLE_SHEETS_SALES_TAB || "Sale sạch";

// Mốc gốc: 01/01/2025 (bao trùm toàn bộ lịch sử của file T1.25–T8.26).
const BASE_DATE = "2025-01-01";

// Cấu hình sản phẩm TRỌNG TÂM (giữ nguyên từ bản cũ) — theo MÃ sản phẩm chuẩn hóa.
const FOCUS_CODES: Record<string, string[]> = {
  Atosiban: ["A01497"],
  "Proges sup": ["P01808", "P01846"],
  "pH Protect": ["P01879"],
  Progermila: ["P01481"],
  Propofol: ["P01845"],
};

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

function normalizeMaNV(v: unknown): string {
  return String(v ?? "").trim().replace(/^0+(?=\d)/, "");
}

function toDateMs(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) {
    const ms = Math.round((v - 25569) * 86400 * 1000);
    return Number.isFinite(ms) ? ms : null;
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); // dd/MM/yyyy
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime();
  const m2 = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); // yyyy-MM-dd
  if (m2) return new Date(Number(m2[1]), Number(m2[2]) - 1, Number(m2[3])).getTime();
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

export interface SaleDetailData {
  base: string;
  asofDi: number;
  tdv: string[];
  cust: [string, string, string, string][]; // [mã, tên, tỉnh, nhóm KH]
  prod: [string, string][]; // [mã, tên]
  focus: Record<string, number[]>; // nhãn -> danh sách chỉ số sản phẩm
  rows: number[][]; // [cid, tid, pid, di, sl, dt]
  error?: string | null;
}

const EMPTY = (error: string): SaleDetailData => ({
  base: BASE_DATE,
  asofDi: 0,
  tdv: [],
  cust: [],
  prod: [],
  focus: {},
  rows: [],
  error,
});

/** Đọc tab "Sale sạch", lọc theo nhân viên trong nhóm, build cấu trúc DATA cho sale.html. */
export async function getSaleDetailData(): Promise<SaleDetailData> {
  let raw: unknown[][];
  try {
    const sheets = google.sheets({ version: "v4", auth: getAuth() });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SALES_SPREADSHEET_ID,
      range: `'${SALES_TAB}'`,
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    raw = (res.data.values as unknown[][] | undefined) ?? [];
  } catch (err) {
    return EMPTY(err instanceof Error ? err.message : String(err));
  }

  // Tìm dòng tiêu đề (chứa "Mã nhân viên" & "Doanh thu").
  let hdrIdx = -1;
  for (let i = 0; i < Math.min(20, raw.length); i++) {
    const r = (raw[i] ?? []).map((x) => String(x ?? "").trim().toLowerCase());
    if (r.includes("mã nhân viên") && r.some((c) => c === "doanh thu")) {
      hdrIdx = i;
      break;
    }
  }
  if (hdrIdx < 0) return EMPTY(`Không tìm thấy tiêu đề trong tab "${SALES_TAB}".`);

  const hdr = (raw[hdrIdx] as unknown[]).map((x) => String(x ?? "").trim());
  const col = (name: string) => hdr.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  const iMaNV = col("Mã nhân viên");
  const iTenNV = col("Tên nhân viên");
  const iNhomKH = col("Nhóm khách hàng");
  const iMaKH = col("Mã khách hàng thực tế") >= 0 ? col("Mã khách hàng thực tế") : col("Mã khách hàng");
  const iTenKH = col("Tên khách hàng thực tế") >= 0 ? col("Tên khách hàng thực tế") : col("Tên khách hàng");
  const iTinh = col("Tỉnh");
  const iNgay = col("Ngày");
  const iMaSP = col("Mã sản phẩm chuẩn hóa") >= 0 ? col("Mã sản phẩm chuẩn hóa") : col("Mã sản phẩm");
  const iTenSP = col("Tên chuẩn hóa sản phẩm") >= 0 ? col("Tên chuẩn hóa sản phẩm") : col("Tên sản phẩm");
  const iSL = col("Số lượng");
  const iDT = col("Doanh thu");

  if (iMaNV < 0 || iMaKH < 0 || iMaSP < 0 || iDT < 0) {
    return EMPTY(`Thiếu cột bắt buộc trong tab "${SALES_TAB}" (Mã NV/Mã KH/Mã SP/Doanh thu).`);
  }

  const team = allEmployees();
  const teamMa = new Map<string, number>(); // mã chuẩn hóa -> tid
  const tdv: string[] = [];
  team.forEach((e) => {
    teamMa.set(normalizeMaNV(e.maNhanVien), tdv.length);
    tdv.push(e.hoTen);
  });

  const baseMs = new Date(BASE_DATE + "T00:00:00").getTime();
  const custIdx = new Map<string, number>();
  const cust: [string, string, string, string][] = [];
  const prodIdx = new Map<string, number>();
  const prod: [string, string][] = [];
  const rows: number[][] = [];
  let maxDi = 0;

  for (let i = hdrIdx + 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r) continue;
    const ma = normalizeMaNV(r[iMaNV]);
    const tid = teamMa.get(ma);
    if (tid === undefined) continue; // chỉ lấy nhân viên trong nhóm

    const dateMs = iNgay >= 0 ? toDateMs(r[iNgay]) : null;
    if (dateMs === null) continue;
    const di = Math.round((dateMs - baseMs) / 86400000);
    if (di < 0) continue; // trước mốc gốc (không kỳ vọng xảy ra với base 2025)

    const maKH = String(r[iMaKH] ?? "").trim();
    if (!maKH) continue;
    let cid = custIdx.get(maKH);
    if (cid === undefined) {
      cid = cust.length;
      custIdx.set(maKH, cid);
      cust.push([
        maKH,
        String(r[iTenKH] ?? "").trim(),
        iTinh >= 0 ? String(r[iTinh] ?? "").trim() : "",
        iNhomKH >= 0 ? String(r[iNhomKH] ?? "").trim() : "",
      ]);
    }

    const maSP = String(r[iMaSP] ?? "").trim();
    if (!maSP) continue;
    let pid = prodIdx.get(maSP);
    if (pid === undefined) {
      pid = prod.length;
      prodIdx.set(maSP, pid);
      prod.push([maSP, iTenSP >= 0 ? String(r[iTenSP] ?? "").trim() : ""]);
    }

    const sl = iSL >= 0 ? parseMoney(r[iSL]) : 0;
    const dt = parseMoney(r[iDT]);
    rows.push([cid, tid, pid, di, sl, dt]);
    if (di > maxDi) maxDi = di;
  }

  // focus: nhãn -> chỉ số sản phẩm (bỏ mã không có trong dữ liệu)
  const focus: Record<string, number[]> = {};
  for (const [label, codes] of Object.entries(FOCUS_CODES)) {
    const idxs = codes.map((c) => prodIdx.get(c)).filter((x): x is number => x !== undefined);
    focus[label] = idxs;
  }

  return { base: BASE_DATE, asofDi: maxDi, tdv, cust, prod, focus, rows, error: null };
}

// ---------- Bài 3: Triển khai SẢN PHẨM TRỌNG TÂM ----------
// Tính cho từng SP trọng tâm (focus): sản lượng, số điểm bán (khách khác nhau), doanh thu —
// kỳ này so với cùng kỳ tháng trước — và tách theo từng nhân viên.

export interface SpttMetric {
  sl: number;
  dt: number;
  diemBan: number;
}
export interface SpttNv {
  ten: string;
  sl: number;
  dt: number;
  diemBan: number;
}
export interface SpttProduct {
  label: string;
  prodNames: string[];
  now: SpttMetric;
  prev: SpttMetric;
  byNv: SpttNv[];
}
export interface SpttResult {
  products: SpttProduct[];
  tong: { now: SpttMetric; prev: SpttMetric };
  error?: string | null;
}

function msToDi(ms: number): number {
  const baseMs = new Date(BASE_DATE + "T00:00:00").getTime();
  return Math.round((ms - baseMs) / 86400000);
}

/** Tính chỉ số SP trọng tâm cho 2 cửa sổ thời gian (kỳ này & cùng kỳ), theo mốc ms. */
export function buildSptt(
  data: SaleDetailData,
  nowFromMs: number,
  nowToMs: number,
  prevFromMs: number,
  prevToMs: number,
  onlyTid?: number
): SpttResult {
  if (data.error) return { products: [], tong: { now: { sl: 0, dt: 0, diemBan: 0 }, prev: { sl: 0, dt: 0, diemBan: 0 } }, error: data.error };
  const nf = msToDi(nowFromMs), nt = msToDi(nowToMs);
  const pf = msToDi(prevFromMs), pt = msToDi(prevToMs);
  const inNow = (di: number) => di >= nf && di <= nt;
  const inPrev = (di: number) => di >= pf && di <= pt;

  const C = { cid: 0, tid: 1, pid: 2, di: 3, sl: 4, dt: 5 };
  const allFocusPids = new Set<number>(Object.values(data.focus).flat());

  const products: SpttProduct[] = Object.entries(data.focus).map(([label, pids]) => {
    const pidSet = new Set(pids);
    const now: SpttMetric = { sl: 0, dt: 0, diemBan: 0 };
    const prev: SpttMetric = { sl: 0, dt: 0, diemBan: 0 };
    const nowCusts = new Set<number>();
    const prevCusts = new Set<number>();
    const nvMap = new Map<number, { sl: number; dt: number; custs: Set<number> }>();

    for (const r of data.rows) {
      if (onlyTid != null && r[C.tid] !== onlyTid) continue;
      if (!pidSet.has(r[C.pid])) continue;
      if (inNow(r[C.di])) {
        now.sl += r[C.sl];
        now.dt += r[C.dt];
        nowCusts.add(r[C.cid]);
        let nv = nvMap.get(r[C.tid]);
        if (!nv) { nv = { sl: 0, dt: 0, custs: new Set() }; nvMap.set(r[C.tid], nv); }
        nv.sl += r[C.sl];
        nv.dt += r[C.dt];
        nv.custs.add(r[C.cid]);
      } else if (inPrev(r[C.di])) {
        prev.sl += r[C.sl];
        prev.dt += r[C.dt];
        prevCusts.add(r[C.cid]);
      }
    }
    now.diemBan = nowCusts.size;
    prev.diemBan = prevCusts.size;
    const byNv: SpttNv[] = [...nvMap.entries()]
      .map(([tid, v]) => ({ ten: data.tdv[tid] ?? `NV${tid}`, sl: v.sl, dt: v.dt, diemBan: v.custs.size }))
      .filter((x) => x.sl > 0 || x.dt > 0)
      .sort((a, b) => b.dt - a.dt);

    return { label, prodNames: pids.map((pid) => data.prod[pid]?.[1] ?? "").filter(Boolean), now, prev, byNv };
  });

  // Tổng nhóm (điểm bán = số khách khác nhau mua BẤT KỲ SP trọng tâm nào).
  const tNow: SpttMetric = { sl: 0, dt: 0, diemBan: 0 };
  const tPrev: SpttMetric = { sl: 0, dt: 0, diemBan: 0 };
  const tNowC = new Set<number>(), tPrevC = new Set<number>();
  for (const r of data.rows) {
    if (onlyTid != null && r[C.tid] !== onlyTid) continue;
    if (!allFocusPids.has(r[C.pid])) continue;
    if (inNow(r[C.di])) { tNow.sl += r[C.sl]; tNow.dt += r[C.dt]; tNowC.add(r[C.cid]); }
    else if (inPrev(r[C.di])) { tPrev.sl += r[C.sl]; tPrev.dt += r[C.dt]; tPrevC.add(r[C.cid]); }
  }
  tNow.diemBan = tNowC.size; tPrev.diemBan = tPrevC.size;

  return { products: products.sort((a, b) => b.now.dt - a.now.dt), tong: { now: tNow, prev: tPrev }, error: null };
}
