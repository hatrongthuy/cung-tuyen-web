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

// Cấu hình sản phẩm TRỌNG TÂM. Nhận diện theo MÃ sản phẩm chuẩn hóa (bản cũ) HOẶC theo TÊN
// (từ khóa) — vì sau khi lấy dữ liệu từ "Đơn kế toán", MÃ sản phẩm có thể khác mã chuẩn cũ,
// khiến đếm ra 0. Khớp thêm theo tên cho bền (tên sản phẩm ổn định hơn mã).
const FOCUS_CODES: Record<string, string[]> = {
  Atosiban: ["A01497"],
  "Proges sup": ["P01808", "P01846"],
  "pH Protect": ["P01879"],
  Progermila: ["P01481"],
  Propofol: ["P01845"],
};

// Từ khóa TÊN cho từng SP trọng tâm (không phân biệt hoa/thường). Khớp nếu tên chứa 1 từ khóa.
const FOCUS_KEYWORDS: Record<string, string[]> = {
  Atosiban: ["atosiban"],
  "Proges sup": ["proges sup"],
  "pH Protect": ["ph balance protect", "balance protect intimate"],
  Progermila: ["progermila"],
  Propofol: ["propofol"],
};

// Sản phẩm CẤP 2 (chuyên khoa PS) — ĐƯỢC GIAO CHỈ ĐỊNH THEO TỪNG NGƯỜI (chỉ Tuyền & Cường có).
// Khớp theo TÊN sản phẩm (từ khóa, không phân biệt hoa/thường) vì danh mục chưa có mã chuẩn hóa cho
// các SP này. Web tính Mở mới / Duy trì SP Cấp 2 riêng cho từng nhân viên dựa trên danh sách của họ.
// Mã nhân viên đã bỏ số 0 đầu.
const CAP2_KEYWORDS_BY_MA: Record<string, string[]> = {
  // Phan Văn Tuyền
  "19484": ["fosmitic", "mucome baby", "zentokid", "nausazy", "tranfast", "fogyma", "pyridol", "laforin", "hantacid"],
  // Hoàng Văn Cường
  "20180": ["fosmitic", "mucome baby", "zentokid", "nausazy", "tranfast", "fogyma", "pyridol", "laforin", "hantacid", "desone", "gel bọt"],
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
  focus: Record<string, number[]>; // nhãn -> danh sách chỉ số sản phẩm (SP trọng tâm/SPTT)
  cap2ByTid: number[][]; // theo từng nhân viên (tid) -> danh sách chỉ số SP Cấp 2 được giao cho họ
  custFirstDi: number[]; // theo cid -> di lần đầu mã khách xuất hiện trên TOÀN BỘ file (mốc code mới)
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
  cap2ByTid: [],
  custFirstDi: [],
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
  const iThang = col("Tháng");
  const iNam = col("Năm");
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
  const tidMa: string[] = []; // tid -> mã chuẩn hóa (để tra SP Cấp 2 giao riêng)
  team.forEach((e) => {
    const ma = normalizeMaNV(e.maNhanVien);
    teamMa.set(ma, tdv.length);
    tidMa.push(ma);
    tdv.push(e.hoTen);
  });

  const baseMs = new Date(BASE_DATE + "T00:00:00").getTime();
  const custIdx = new Map<string, number>();
  const cust: [string, string, string, string][] = [];
  const prodIdx = new Map<string, number>();
  const prod: [string, string][] = [];
  const rows: number[][] = [];
  let maxDi = 0;
  // Mốc "code mới": lần đầu MỖI mã khách xuất hiện trên TOÀN BỘ file Sale (mọi nhân viên,
  // kể cả SS/quản lý và vùng khác) — dùng để xác định code chưa từng xuất hiện.
  const codeFirstDi = new Map<string, number>();

  // Ngày của 1 dòng: ưu tiên cột "Ngày"; nếu trống thì lấy Tháng + Năm (ngày 1).
  // Dữ liệu lịch sử 2025 chỉ điền Tháng/Năm, ô "Ngày" để trống — nếu chỉ đọc "Ngày" sẽ mất
  // sạch lịch sử, khiến khách cũ bị tính nhầm thành code mới.
  const rowDi = (r: unknown[]): number | null => {
    let dateMs = iNgay >= 0 ? toDateMs(r[iNgay]) : null;
    if (dateMs === null) {
      const th = iThang >= 0 ? parseInt(String(r[iThang] ?? "").trim(), 10) : NaN;
      const nm = iNam >= 0 ? parseInt(String(r[iNam] ?? "").trim(), 10) : NaN;
      if (Number.isInteger(th) && th >= 1 && th <= 12 && Number.isInteger(nm) && nm >= 2000) {
        dateMs = new Date(nm, th - 1, 1).getTime();
      }
    }
    if (dateMs === null) return null;
    const di = Math.round((dateMs - baseMs) / 86400000);
    return di < 0 ? null : di;
  };

  for (let i = hdrIdx + 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r) continue;

    const di = rowDi(r);
    if (di === null) continue;

    const maKH = String(r[iMaKH] ?? "").trim();
    if (!maKH) continue;

    // Mốc code mới: cập nhật lần đầu xuất hiện của mã khách trên TOÀN BỘ file (trước khi lọc nhóm).
    const prevFirst = codeFirstDi.get(maKH);
    if (prevFirst === undefined || di < prevFirst) codeFirstDi.set(maKH, di);

    // Từ đây chỉ giữ giao dịch của nhân viên trong nhóm.
    const ma = normalizeMaNV(r[iMaNV]);
    const tid = teamMa.get(ma);
    if (tid === undefined) continue;

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

  // focus: nhãn -> chỉ số sản phẩm. Khớp theo MÃ (bản cũ) VÀ theo TÊN (từ khóa) để bền với đổi mã.
  const focus: Record<string, number[]> = {};
  for (const [label, codes] of Object.entries(FOCUS_CODES)) {
    const set = new Set<number>();
    codes.forEach((c) => { const p = prodIdx.get(c); if (p !== undefined) set.add(p); });
    const kws = FOCUS_KEYWORDS[label] ?? [];
    if (kws.length) {
      prod.forEach(([, ten], pid) => {
        const t = (ten || "").toLowerCase();
        if (kws.some((k) => t.includes(k))) set.add(pid);
      });
    }
    focus[label] = Array.from(set);
  }

  // SP Cấp 2 giao riêng cho từng NV: khớp theo TÊN sản phẩm (từ khóa).
  const cap2ByTid: number[][] = tdv.map((_, tid) => {
    const kws = CAP2_KEYWORDS_BY_MA[tidMa[tid]] ?? [];
    if (kws.length === 0) return [];
    const idxs: number[] = [];
    prod.forEach(([, ten], pid) => {
      const t = (ten || "").toLowerCase();
      if (kws.some((k) => t.includes(k))) idxs.push(pid);
    });
    return idxs;
  });

  // Mốc code mới theo từng khách của nhóm (cid) = lần đầu mã khách đó xuất hiện trên toàn bộ file.
  const custFirstDi: number[] = cust.map(([maKH]) => codeFirstDi.get(maKH) ?? 0);

  return { base: BASE_DATE, asofDi: maxDi, tdv, cust, prod, focus, cap2ByTid, custFirstDi, rows, error: null };
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
export interface SpttCust {
  ten: string;
  tinh: string;
  sl: number;
  dt: number;
}
export interface SpttProduct {
  label: string;
  prodNames: string[];
  now: SpttMetric;
  prev: SpttMetric;
  byNv: SpttNv[];
  /** Danh sách khách hàng đã mua SP này trong kỳ (now), sắp theo sản lượng giảm dần. */
  custs: SpttCust[];
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
    const custAgg = new Map<number, { sl: number; dt: number }>(); // theo cid, kỳ now

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
        let cu = custAgg.get(r[C.cid]);
        if (!cu) { cu = { sl: 0, dt: 0 }; custAgg.set(r[C.cid], cu); }
        cu.sl += r[C.sl];
        cu.dt += r[C.dt];
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

    const custs: SpttCust[] = [...custAgg.entries()]
      .map(([cid, v]) => ({ ten: data.cust[cid]?.[1] || `KH${cid}`, tinh: data.cust[cid]?.[2] || "", sl: v.sl, dt: v.dt }))
      .sort((a, b) => b.sl - a.sl || b.dt - a.dt);

    return { label, prodNames: pids.map((pid) => data.prod[pid]?.[1] ?? "").filter(Boolean), now, prev, byNv, custs };
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

// ------------------------------------------------------------------
// Chọn THÁNG / KHOẢNG THÁNG cho trang SP trọng tâm (đọc từ ?tu=&den=).
// ------------------------------------------------------------------
export interface SpttRange {
  nowFromMs: number;
  nowToMs: number;
  prevFromMs: number;
  prevToMs: number;
  tu: string; // "YYYY-MM" đã chọn (từ)
  den: string; // "YYYY-MM" đã chọn (đến)
  rangeLabel: string; // nhãn kỳ đang xem
  prevLabel: string; // nhãn kỳ so sánh
  isDefault: boolean; // true nếu không chọn gì (mặc định = tháng hiện tại, lũy kế tới hôm nay)
  availableMonths: { key: string; label: string }[];
}

/** Tính cửa sổ now/prev + nhãn cho SP trọng tâm theo tháng/khoảng tháng người dùng chọn. */
export function resolveSpttRange(
  params: { tu?: string; den?: string },
  today: Date,
  baseYear = 2025,
  baseMonth = 1
): SpttRange {
  const curY = today.getFullYear();
  const curM = today.getMonth() + 1;
  const toIdx = (y: number, m: number) => y * 12 + (m - 1);
  const curIdx = toIdx(curY, curM);
  const baseIdx = toIdx(baseYear, baseMonth);
  const ym = (idx: number) => ({ y: Math.floor(idx / 12), m: (idx % 12) + 1 });
  const key = (idx: number) => { const { y, m } = ym(idx); return `${y}-${String(m).padStart(2, "0")}`; };
  const lbl = (idx: number) => { const { y, m } = ym(idx); return `${String(m).padStart(2, "0")}/${y}`; };

  const availableMonths: { key: string; label: string }[] = [];
  for (let i = curIdx; i >= baseIdx; i--) availableMonths.push({ key: key(i), label: lbl(i) });

  const parse = (s?: string): number | null => {
    const mm = String(s ?? "").match(/^(\d{4})-(\d{1,2})$/);
    if (!mm) return null;
    const idx = toIdx(Number(mm[1]), Number(mm[2]));
    return idx >= baseIdx && idx <= curIdx ? idx : null;
  };
  let tuIdx = parse(params.tu);
  let denIdx = parse(params.den);
  const isDefault = tuIdx == null && denIdx == null;
  if (isDefault) { tuIdx = curIdx; denIdx = curIdx; }
  else if (tuIdx == null) tuIdx = denIdx as number;
  else if (denIdx == null) denIdx = tuIdx;
  if ((tuIdx as number) > (denIdx as number)) { const t = tuIdx as number; tuIdx = denIdx as number; denIdx = t; }
  const a = tuIdx as number, b = denIdx as number;

  const A = ym(a), B = ym(b);
  const nowFromMs = new Date(A.y, A.m - 1, 1).getTime();
  const denEndMs = new Date(B.y, B.m, 0, 23, 59, 59, 999).getTime();
  const endOfToday = new Date(curY, curM - 1, today.getDate(), 23, 59, 59, 999).getTime();
  const nowToMs = Math.min(denEndMs, endOfToday);

  const n = b - a + 1; // số tháng trong kỳ
  const pa = a - n, pb = a - 1; // kỳ liền trước, cùng độ dài
  const PA = ym(pa), PB = ym(pb);
  const prevFromMs = new Date(PA.y, PA.m - 1, 1).getTime();

  let prevToMs: number;
  let prevLabel: string;
  let rangeLabel: string;
  if (isDefault) {
    // Mặc định: tháng hiện tại lũy kế tới hôm nay, so cùng kỳ (cùng ngày) tháng trước.
    const soNgayThangTruoc = new Date(curY, curM - 1, 0).getDate();
    const ngayTruoc = Math.min(today.getDate(), soNgayThangTruoc);
    prevToMs = new Date(curY, curM - 2, ngayTruoc, 23, 59, 59, 999).getTime();
    rangeLabel = `lũy kế 01–${today.getDate()}/${curM}/${curY}`;
    prevLabel = `cùng kỳ tháng ${lbl(a - 1)}`;
  } else {
    prevToMs = new Date(PB.y, PB.m, 0, 23, 59, 59, 999).getTime();
    rangeLabel = a === b ? `tháng ${lbl(a)}` : `${lbl(a)} – ${lbl(b)}`;
    prevLabel = pa < baseIdx ? "kỳ liền trước (thiếu dữ liệu)" : (pa === pb ? `tháng ${lbl(pa)}` : `${lbl(pa)} – ${lbl(pb)}`);
  }

  return {
    nowFromMs, nowToMs, prevFromMs, prevToMs,
    tu: key(a), den: key(b),
    rangeLabel, prevLabel, isDefault, availableMonths,
  };
}
