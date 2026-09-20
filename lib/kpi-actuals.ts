import { google } from "googleapis";
import { allEmployees } from "./allowlist";
import { parseMoney } from "./format";
import { getSaleDetailData } from "./sale-detail";

// ------------------------------------------------------------------
// Bảng điểm KPI TỰ ĐỘNG (scorecard)
// ------------------------------------------------------------------
// Trang KPI cũ chỉ đổ nguyên bảng chỉ tiêu (Kế hoạch) tĩnh từ file KPI công ty,
// còn các cột "Thực hiện" trong sheet để trống nên không bao giờ cập nhật.
//
// File này đọc:
//  1) File KPI công ty ("Kpis T9 PS Phú Thọ") — lấy Kế hoạch + Điểm KH của từng
//     chỉ tiêu cho từng nhân viên (sheet có 2 dòng tiêu đề: dòng tên chỉ tiêu +
//     dòng phụ Kế hoạch/Thực hiện/Tỉ trọng/Điểm KH/Điểm Thực hiện).
//  2) File Sale ("Sale sạch") — TỰ TÍNH phần Thực hiện cho các chỉ tiêu mà web có
//     đủ dữ liệu: Doanh số kê đơn, Doanh số thầu, Code mới, Mở mới SPTT, Duy trì SPTT.
//
// Các chỉ tiêu còn lại (Coaching call, Miniapp, SP Cấp 2, Tuyển dụng…) web không có
// nguồn thực hiện tự động — chỉ hiện Kế hoạch (và Thực hiện nếu công ty đã nhập tay
// vào sheet).

const KPI_SPREADSHEET_ID =
  process.env.GOOGLE_SHEETS_KPI_SPREADSHEET_ID || "1dv0q_SpajvhbaOtNu43ctwetjXhBUURRIaDVv39W5bw";
const KPI_SHEET_NAME = process.env.GOOGLE_SHEETS_KPI_MAIN_TAB || "KPIs T09.26 (new)";

// Mốc gốc của Sale detail (di = số ngày kể từ mốc này).
const BASE_DATE = "2025-01-01";

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

/** Số từ ô KH/điểm. Trả null nếu ô rỗng / không có chữ số (vd "-", "Ko có số KH"). */
function numOrNull(v: unknown): number | null {
  const s = String(v ?? "").trim();
  if (!s || !/\d/.test(s)) return null;
  const n = parseMoney(s);
  return Number.isFinite(n) ? n : null;
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** So khớp giá trị cột Nhóm SS với 1 tên nhóm hoặc danh sách nhiều tên nhóm (scope Tây Bắc). */
function matchesTeamName(cellValue: string, teamName: string | string[]): boolean {
  const v = norm(cellValue);
  if (Array.isArray(teamName)) return teamName.some((t) => norm(t) === v);
  return norm(teamName) === v;
}

// ---- Cấu hình các chỉ tiêu hiển thị trên scorecard ----
export type MetricUnit = "vnd" | "count";
export type ActualKey =
  | "keDon"
  | "thau"
  | "codeMoi"
  | "spttMoMoi"
  | "spttDuyTri"
  | "cap2MoMoi"
  | "cap2DuyTri";

interface MetricConfig {
  key: string;
  label: string;
  unit: MetricUnit;
  /** Tên chỉ tiêu ở dòng tiêu đề trong sheet KPI (khớp không phân biệt hoa/thường). */
  sheetMetric: string;
  /** Nếu có: web tự tính Thực hiện từ file Sale bằng khóa này. */
  actualKey?: ActualKey;
}

const METRICS: MetricConfig[] = [
  { key: "keDon", label: "DS kê đơn", unit: "vnd", sheetMetric: "DS KD-PM", actualKey: "keDon" },
  { key: "thau", label: "DS thầu", unit: "vnd", sheetMetric: "DS thầu", actualKey: "thau" },
  { key: "codeMoi", label: "Code mới", unit: "count", sheetMetric: "Code mới", actualKey: "codeMoi" },
  { key: "moMoiSptt", label: "Mở mới SPTT", unit: "count", sheetMetric: "Mở mới SPTT", actualKey: "spttMoMoi" },
  { key: "duyTriSptt", label: "Duy trì SPTT", unit: "count", sheetMetric: "Duy trì SPTT", actualKey: "spttDuyTri" },
  { key: "coaching", label: "Coaching call", unit: "count", sheetMetric: "Coaching call" },
  { key: "miniapp", label: "Miniapp", unit: "count", sheetMetric: "Miniapp" },
  { key: "moMoiC2", label: "Mở mới SP Cấp 2", unit: "count", sheetMetric: "Mở mới SP Cấp 2", actualKey: "cap2MoMoi" },
  { key: "duyTriC2", label: "Duy trì SP cấp 2", unit: "count", sheetMetric: "Duy trì SP cấp 2", actualKey: "cap2DuyTri" },
  { key: "tuyenDung", label: "Tuyển dụng NS", unit: "count", sheetMetric: "Tuyển dụng NS" },
];

export interface MetricScore {
  key: string;
  label: string;
  unit: MetricUnit;
  keHoach: number | null;
  thucHien: number | null;
  tiTrong: number | null; // % đạt (Thực hiện / Kế hoạch)
  diemKH: number | null;
  /** "tu-tinh" = web tự tính từ Sale; "sheet" = lấy cột Thực hiện trong file KPI; "chua-co" = chưa có số. */
  nguon: "tu-tinh" | "sheet" | "chua-co";
}

export interface EmployeeScore {
  ma: string;
  ten: string;
  metrics: MetricScore[];
  tongDiemKH: number;
}

export interface KpiScorecardResult {
  rows: EmployeeScore[];
  monthLabel: string;
  error: string | null;
  /** true nếu ít nhất một chỉ tiêu tự tính có dữ liệu Sale. */
  hasAuto: boolean;
}

interface MetricColumns {
  kh: number | null;
  diem: number | null;
  th: number | null;
}

async function readKpiSheetTargets(
  teamName: string | string[]
): Promise<{ byMa: Map<string, { ten: string; cols: Record<string, MetricColumns>; row: string[] }>; error: string | null }> {
  let raw: string[][];
  try {
    const sheets = google.sheets({ version: "v4", auth: getAuth() });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: KPI_SPREADSHEET_ID,
      range: `'${KPI_SHEET_NAME}'`,
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    raw = (res.data.values as string[][] | undefined) ?? [];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { byMa: new Map(), error: `Không đọc được file KPI để tính điểm: ${msg}` };
  }

  const cell = (r: string[] | undefined, j: number) => String(r?.[j] ?? "").trim();

  // Tìm dòng tiêu đề chỉ tiêu (chứa "Mã Nhân viên") và dòng phụ (chứa "Kế hoạch" + "Thực hiện").
  let metricRowIdx = -1;
  for (let i = 0; i < Math.min(10, raw.length); i++) {
    const r = (raw[i] ?? []).map((x) => norm(String(x ?? "")));
    if (r.includes("mã nhân viên") && r.includes("nhóm ss")) {
      metricRowIdx = i;
      break;
    }
  }
  if (metricRowIdx < 0) return { byMa: new Map(), error: `Không tìm thấy dòng tiêu đề trong tab "${KPI_SHEET_NAME}".` };

  let subRowIdx = -1;
  for (let i = metricRowIdx + 1; i < Math.min(metricRowIdx + 4, raw.length); i++) {
    const r = (raw[i] ?? []).map((x) => norm(String(x ?? "")));
    if (r.includes("kế hoạch") && r.includes("thực hiện")) {
      subRowIdx = i;
      break;
    }
  }
  if (subRowIdx < 0) return { byMa: new Map(), error: `Không tìm thấy dòng tiêu đề phụ (Kế hoạch/Thực hiện) trong tab "${KPI_SHEET_NAME}".` };

  const metricRow = raw[metricRowIdx] ?? [];
  const subRow = raw[subRowIdx] ?? [];
  const nCol = Math.max(metricRow.length, subRow.length);

  // Cột định danh
  const findMetricCol = (kw: string) =>
    metricRow.findIndex((h) => norm(String(h ?? "")) === kw);
  const jMa = findMetricCol("mã nhân viên");
  const jTen = findMetricCol("tên nhân viên");
  const jNhom = findMetricCol("nhóm ss");

  // Với mỗi cấu hình chỉ tiêu, tìm nhóm cột con của nó theo tên chỉ tiêu ở metricRow,
  // rồi phân loại cột con theo subRow (Kế hoạch / Điểm KH / Thực hiện).
  function metricColumnsFor(sheetMetric: string): MetricColumns {
    const target = norm(sheetMetric);
    const out: MetricColumns = { kh: null, diem: null, th: null };
    for (let j = 0; j < nCol; j++) {
      if (norm(String(metricRow[j] ?? "")) !== target) continue;
      const sub = norm(String(subRow[j] ?? ""));
      if (sub === "kế hoạch" && out.kh === null) out.kh = j;
      else if (sub === "thực hiện" && out.th === null) out.th = j;
      else if (sub === "điểm kh" && out.diem === null) out.diem = j;
    }
    return out;
  }
  const metricCols: Record<string, MetricColumns> = {};
  for (const m of METRICS) metricCols[m.key] = metricColumnsFor(m.sheetMetric);

  const byMa = new Map<string, { ten: string; cols: Record<string, MetricColumns>; row: string[] }>();
  for (let i = subRowIdx + 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r) continue;
    if (jNhom < 0 || !matchesTeamName(cell(r, jNhom), teamName)) continue;
    const ma = normalizeMaNV(cell(r, jMa));
    if (!ma) continue;
    // Bỏ các dòng "rác"/tổng hợp phía dưới: yêu cầu Kế hoạch DS KD-PM là số > 0.
    const dsCols = metricCols["keDon"];
    const dsKH = dsCols.kh != null ? numOrNull(r[dsCols.kh]) : null;
    if (dsKH === null || dsKH <= 0) continue;
    if (byMa.has(ma)) continue; // giữ dòng hợp lệ đầu tiên
    byMa.set(ma, { ten: cell(r, jTen) || ma, cols: metricCols, row: r.map((x) => String(x ?? "")) });
  }
  return { byMa, error: null };
}

interface Actuals {
  keDon: number;
  thau: number;
  codeMoi: number;
  spttMoMoi: number;
  spttDuyTri: number;
  cap2MoMoi: number;
  cap2DuyTri: number;
}

/** Tính phần THỰC HIỆN theo mã nhân viên từ file Sale, cho tháng (nam, thang). */
async function computeActuals(
  nam: number,
  thang: number
): Promise<{ byMa: Record<string, Actuals>; availableKeys: Set<ActualKey>; error: string | null }> {
  const data = await getSaleDetailData();
  // Các chỉ tiêu web có nguồn tự tính. SP Cấp 2 chỉ "có nguồn" khi có NV được giao SP Cấp 2.
  const availableKeys = new Set<ActualKey>(["keDon", "thau", "codeMoi", "spttMoMoi", "spttDuyTri"]);
  const cap2ByTid = data.cap2ByTid ?? [];
  if (cap2ByTid.some((a) => a.length > 0)) {
    availableKeys.add("cap2MoMoi");
    availableKeys.add("cap2DuyTri");
  }
  if (data.error) return { byMa: {}, availableKeys, error: `Không đọc được file Sale để tính thực hiện: ${data.error}` };

  const emps = allEmployees();
  const tidToMa = data.tdv.map((_, tid) => normalizeMaNV(emps[tid]?.maNhanVien ?? ""));

  const baseMs = new Date(BASE_DATE + "T00:00:00").getTime();
  const monthStart = new Date(nam, thang - 1, 1).getTime();
  const monthEnd = new Date(nam, thang, 0, 23, 59, 59, 999).getTime();
  const diStart = Math.round((monthStart - baseMs) / 86400000);
  const diEnd = Math.round((monthEnd - baseMs) / 86400000);
  const inMonth = (di: number) => di >= diStart && di <= diEnd;

  const focusPids = new Set<number>(Object.values(data.focus).flat());
  // SP Cấp 2 giao riêng theo NV -> Set pid cho từng tid.
  const cap2PidSetByTid = cap2ByTid.map((a) => new Set<number>(a));
  const C = { cid: 0, tid: 1, pid: 2, di: 3, sl: 4, dt: 5 };

  const firstBuy = new Map<number, { di: number; tid: number }>();
  const firstFocus = new Map<number, { di: number; tid: number }>();
  const focusBeforeMonth = new Set<number>();
  const focusThisMonth = new Map<number, Set<number>>();
  // SP Cấp 2 (theo từng NV): khóa "tid|cid".
  const firstCap2 = new Map<string, { di: number; tid: number }>();
  const cap2BeforeMonth = new Set<string>();
  const cap2ThisMonth = new Set<string>();

  // keDon/thau theo tid trong tháng
  const keDonByTid: number[] = new Array(data.tdv.length).fill(0);
  const thauByTid: number[] = new Array(data.tdv.length).fill(0);

  for (const row of data.rows) {
    const cid = row[C.cid];
    const tid = row[C.tid];
    const pid = row[C.pid];
    const di = row[C.di];
    const dt = row[C.dt];

    const fb = firstBuy.get(cid);
    if (!fb || di < fb.di) firstBuy.set(cid, { di, tid });

    if (focusPids.has(pid)) {
      const ff = firstFocus.get(cid);
      if (!ff || di < ff.di) firstFocus.set(cid, { di, tid });
      if (di < diStart) focusBeforeMonth.add(cid);
      if (inMonth(di)) {
        let set = focusThisMonth.get(cid);
        if (!set) {
          set = new Set<number>();
          focusThisMonth.set(cid, set);
        }
        set.add(tid);
      }
    }

    const cap2Set = cap2PidSetByTid[tid];
    if (cap2Set && cap2Set.has(pid)) {
      const key = `${tid}|${cid}`;
      const fc = firstCap2.get(key);
      if (!fc || di < fc.di) firstCap2.set(key, { di, tid });
      if (di < diStart) cap2BeforeMonth.add(key);
      if (inMonth(di)) cap2ThisMonth.add(key);
    }

    if (inMonth(di)) {
      const nhomKH = (data.cust[cid]?.[3] ?? "").toLowerCase();
      if (nhomKH.includes("thầu")) thauByTid[tid] += dt;
      else keDonByTid[tid] += dt;
    }
  }

  const codeMoiByTid: number[] = new Array(data.tdv.length).fill(0);
  const spttMoMoiByTid: number[] = new Array(data.tdv.length).fill(0);
  const spttDuyTriByTid: number[] = new Array(data.tdv.length).fill(0);
  const cap2MoMoiByTid: number[] = new Array(data.tdv.length).fill(0);
  const cap2DuyTriByTid: number[] = new Array(data.tdv.length).fill(0);

  for (const { di, tid } of firstBuy.values()) {
    if (inMonth(di)) codeMoiByTid[tid] = (codeMoiByTid[tid] ?? 0) + 1;
  }
  for (const { di, tid } of firstFocus.values()) {
    if (inMonth(di)) spttMoMoiByTid[tid] = (spttMoMoiByTid[tid] ?? 0) + 1;
  }
  for (const [cid, tids] of focusThisMonth) {
    if (!focusBeforeMonth.has(cid)) continue; // đã mua SPTT trước đó => duy trì
    for (const tid of tids) spttDuyTriByTid[tid] = (spttDuyTriByTid[tid] ?? 0) + 1;
  }
  for (const { di, tid } of firstCap2.values()) {
    if (inMonth(di)) cap2MoMoiByTid[tid] = (cap2MoMoiByTid[tid] ?? 0) + 1;
  }
  for (const key of cap2ThisMonth) {
    if (!cap2BeforeMonth.has(key)) continue; // đã mua SP cấp 2 trước đó => duy trì
    const tid = Number(key.split("|")[0]);
    cap2DuyTriByTid[tid] = (cap2DuyTriByTid[tid] ?? 0) + 1;
  }

  const byMa: Record<string, Actuals> = {};
  const add = (ma: string): Actuals => {
    if (!byMa[ma]) byMa[ma] = { keDon: 0, thau: 0, codeMoi: 0, spttMoMoi: 0, spttDuyTri: 0, cap2MoMoi: 0, cap2DuyTri: 0 };
    return byMa[ma];
  };
  for (let tid = 0; tid < data.tdv.length; tid++) {
    const ma = tidToMa[tid];
    if (!ma) continue;
    const a = add(ma);
    a.keDon += keDonByTid[tid];
    a.thau += thauByTid[tid];
    a.codeMoi += codeMoiByTid[tid];
    a.spttMoMoi += spttMoMoiByTid[tid];
    a.spttDuyTri += spttDuyTriByTid[tid];
    a.cap2MoMoi += cap2MoMoiByTid[tid];
    a.cap2DuyTri += cap2DuyTriByTid[tid];
  }
  return { byMa, availableKeys, error: null };
}

/** Xây bảng điểm KPI theo nhân viên cho nhóm `teamName`, tháng (nam, thang). */
export async function getKpiScorecard(
  teamName: string | string[],
  nam: number,
  thang: number
): Promise<KpiScorecardResult> {
  const monthLabel = `${String(thang).padStart(2, "0")}/${nam}`;
  const [targets, actuals] = await Promise.all([readKpiSheetTargets(teamName), computeActuals(nam, thang)]);

  const error = targets.error ?? actuals.error ?? null;
  if (targets.byMa.size === 0) {
    return { rows: [], monthLabel, error, hasAuto: false };
  }

  // Chỉ nhân viên kinh doanh mới có phần Thực hiện tự tính từ Sale (quản lý thì lấy theo sheet).
  const empSet = new Set(allEmployees().map((e) => normalizeMaNV(e.maNhanVien)));

  let hasAuto = false;
  const rows: EmployeeScore[] = [];
  for (const [ma, info] of targets.byMa) {
    const act = actuals.byMa[ma];
    const isEmp = empSet.has(ma);
    const metrics: MetricScore[] = METRICS.map((m) => {
      const cols = info.cols[m.key] ?? { kh: null, diem: null, th: null };
      const keHoach = cols.kh != null ? numOrNull(info.row[cols.kh]) : null;
      const diemKH = cols.diem != null ? numOrNull(info.row[cols.diem]) : null;

      let thucHien: number | null = null;
      let nguon: MetricScore["nguon"] = "chua-co";
      // Chỉ coi là "tự tính" khi chỉ tiêu có nguồn dữ liệu (VD SP Cấp 2 chỉ auto khi đã cấu hình mã).
      if (isEmp && m.actualKey && actuals.availableKeys.has(m.actualKey)) {
        thucHien = act ? act[m.actualKey] ?? 0 : 0;
        nguon = "tu-tinh";
        if (thucHien > 0) hasAuto = true;
      } else {
        const thSheet = cols.th != null ? numOrNull(info.row[cols.th]) : null;
        if (thSheet != null) {
          thucHien = thSheet;
          nguon = "sheet";
        }
      }

      const tiTrong =
        keHoach != null && keHoach > 0 && thucHien != null ? (thucHien / keHoach) * 100 : null;

      return { key: m.key, label: m.label, unit: m.unit, keHoach, thucHien, tiTrong, diemKH, nguon };
    });

    const tongDiemKH = metrics.reduce((s, x) => s + (x.diemKH ?? 0), 0);
    rows.push({ ma, ten: info.ten, metrics, tongDiemKH });
  }

  // Sắp theo tổng điểm KH giảm dần (người chỉ tiêu cao lên trước).
  rows.sort((a, b) => b.tongDiemKH - a.tongDiemKH);
  return { rows, monthLabel, error, hasAuto };
}
