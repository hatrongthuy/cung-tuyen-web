import { google } from "googleapis";

// ------------------------------------------------------------------
// CHI TIẾT 1 KHÁCH HÀNG — TẤT CẢ đơn (mọi nhân viên, kể cả ngoài nhóm).
// ------------------------------------------------------------------
// Web nhóm chỉ lấy đơn của 5 TDV trong nhóm, nên với khách dùng chung (nhà phân phối nhiều SS
// cùng bán vào) sẽ thiếu đơn của nhân viên nhóm khác. Ở màn CHI TIẾT khách hàng, ta đọc TRỰC TIẾP
// từ "Sale sạch" theo Mã KH để hiện đầy đủ đơn của mọi nhân viên. Các phần Doanh số/KPI/SP trọng tâm
// vẫn giữ phạm vi nhóm (dùng getSaleDetailData) — chỉ màn chi tiết khách này là xem toàn cảnh.

const SALES_ID =
  process.env.GOOGLE_SHEETS_SALES_SPREADSHEET_ID || "19CNg5Q38a7tAyNR8NSY6-E5U1Q1kqdhsblftGuGDsdU";
const SALES_TAB = process.env.GOOGLE_SHEETS_SALES_TAB || "Sale sạch";
const BASE_DATE = "2025-01-01";

export interface KhLine {
  maSP: string;
  tenSP: string;
  maNV: string;
  tenNV: string;
  di: number;
  sl: number;
  dt: number;
}
export interface KhachHangFull {
  maKH: string;
  tenKH: string;
  tinh: string;
  nhomKH: string;
  lines: KhLine[];
  error: string | null;
}

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  return new google.auth.JWT({ email, key, scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"] });
}
function toNum(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function toDateMs(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return Math.round((v - 25569) * 86400 * 1000);
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime();
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

interface Parsed {
  hdrOk: boolean;
  cols: Record<string, number>;
  baseMs: number;
  rows: unknown[][];
  hdrIdx: number;
}
let _cache: { at: number; data: Parsed } | null = null;
const TTL = 5 * 60 * 1000;

async function readSale(): Promise<Parsed> {
  if (_cache && Date.now() - _cache.at < TTL) return _cache.data;
  const sheets = google.sheets({ version: "v4", auth: getAuth() });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SALES_ID,
    range: `'${SALES_TAB}'`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  const rows = (res.data.values as unknown[][] | undefined) ?? [];
  let hdrIdx = -1;
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const r = (rows[i] ?? []).map((x) => String(x ?? "").trim().toLowerCase());
    if (r.includes("mã nhân viên") && r.some((c) => c === "doanh thu")) { hdrIdx = i; break; }
  }
  const cols: Record<string, number> = {};
  if (hdrIdx >= 0) {
    const hdr = (rows[hdrIdx] as unknown[]).map((x) => String(x ?? "").trim().toLowerCase());
    const find = (...names: string[]) => {
      for (const n of names) { const j = hdr.findIndex((h) => h === n); if (j >= 0) return j; }
      return -1;
    };
    cols.maNV = find("mã nhân viên");
    cols.tenNV = find("tên nhân viên");
    cols.nhomKH = find("nhóm khách hàng");
    cols.maKH = find("mã khách hàng thực tế", "mã khách hàng");
    cols.tenKH = find("tên khách hàng thực tế", "tên khách hàng");
    cols.tinh = find("tỉnh");
    cols.ngay = find("ngày");
    cols.thang = find("tháng");
    cols.nam = find("năm");
    cols.maSP = find("mã sản phẩm chuẩn hóa", "mã sản phẩm");
    cols.tenSP = find("tên chuẩn hóa sản phẩm", "tên sản phẩm");
    cols.sl = find("số lượng");
    cols.dt = find("doanh thu");
  }
  const parsed: Parsed = { hdrOk: hdrIdx >= 0, cols, baseMs: new Date(BASE_DATE + "T00:00:00").getTime(), rows, hdrIdx };
  _cache = { at: Date.now(), data: parsed };
  return parsed;
}

/** Tất cả dòng bán của 1 Mã KH (mọi nhân viên). */
export async function getKhachHangFull(maKH: string): Promise<KhachHangFull> {
  const target = String(maKH ?? "").trim();
  const empty: KhachHangFull = { maKH: target, tenKH: "", tinh: "", nhomKH: "", lines: [], error: null };
  if (!target) return { ...empty, error: "Thiếu mã khách hàng" };
  let P: Parsed;
  try { P = await readSale(); } catch (e) { return { ...empty, error: e instanceof Error ? e.message : String(e) }; }
  if (!P.hdrOk || P.cols.maKH < 0) return { ...empty, error: "Không đọc được Sale sạch" };
  const c = P.cols;
  const get = (r: unknown[], i: number) => (i >= 0 && r[i] != null ? String(r[i]).trim() : "");
  const lines: KhLine[] = [];
  let tenKH = "", tinh = "", nhomKH = "";
  for (let i = P.hdrIdx + 1; i < P.rows.length; i++) {
    const r = P.rows[i];
    if (!r) continue;
    if (get(r, c.maKH) !== target) continue;
    if (!tenKH) { tenKH = get(r, c.tenKH); tinh = get(r, c.tinh); nhomKH = get(r, c.nhomKH); }
    // di: ưu tiên Ngày, không có thì (Năm,Tháng,1)
    let ms = c.ngay >= 0 ? toDateMs(r[c.ngay]) : null;
    if (ms === null) {
      const th = c.thang >= 0 ? parseInt(String(r[c.thang] ?? ""), 10) : NaN;
      const nm = c.nam >= 0 ? parseInt(String(r[c.nam] ?? ""), 10) : NaN;
      if (Number.isInteger(th) && th >= 1 && th <= 12 && Number.isInteger(nm) && nm >= 2000) ms = new Date(nm, th - 1, 1).getTime();
    }
    const di = ms !== null ? Math.round((ms - P.baseMs) / 86400000) : -1;
    lines.push({
      maSP: get(r, c.maSP),
      tenSP: get(r, c.tenSP),
      maNV: get(r, c.maNV),
      tenNV: get(r, c.tenNV),
      di,
      sl: c.sl >= 0 ? toNum(r[c.sl]) : 0,
      dt: c.dt >= 0 ? toNum(r[c.dt]) : 0,
    });
  }
  return { maKH: target, tenKH, tinh, nhomKH, lines, error: null };
}
