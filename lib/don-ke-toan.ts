import { google } from "googleapis";
import { allEmployees } from "./allowlist";

// ------------------------------------------------------------------
// ĐƠN HÀNG TDV ĐÃ ĐẶT — đọc trực tiếp từ file nguồn "Dữ liệu nhóm PS Tây Bắc",
// các tab "Đơn kế toán MM/YY" (đơn đã lên kế toán). Chỉ lấy đơn của nhân viên trong nhóm,
// gộp theo Mã chứng từ (mỗi Mã chứng từ = 1 đơn, có thể nhiều dòng sản phẩm).
// Dùng cho tab "Đơn hàng" trong màn Tra cứu Sale (chỉ hiển thị, không sửa nguồn).

const SOURCE_ID =
  process.env.GOOGLE_SHEETS_SOURCE_SPREADSHEET_ID || "1vfKKS4LkmnHhOqZzl-YvXETyvckC7mNXLKsj6bx0Fus";
const TAB_PATTERN = /đơn\s*k[ếe]\s*to[áa]n/i;
const BASE_DATE = "2025-01-01"; // cùng mốc với sale-detail để dùng chung diToMonth ở client

export interface DonLine {
  maSP: string;
  tenSP: string;
  soLuong: number;
  thanhTien: number;
}
export interface DonKeToan {
  maCT: string;
  loaiDon: string;
  di: number; // số ngày kể từ BASE_DATE (để client lọc theo tháng)
  ngay: string; // dd/MM/yyyy
  maNV: string;
  tenNV: string;
  maKH: string;
  tenKH: string;
  tinh: string;
  tongTien: number;
  lines: DonLine[];
}

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  return new google.auth.JWT({ email, key, scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"] });
}

function normMa(v: unknown): string {
  return String(v ?? "").trim().replace(/^0+(?=\d)/, "");
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
function fmtDate(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

let _cache: { at: number; data: DonKeToan[] } | null = null;
const TTL = 5 * 60 * 1000;

/** Đọc & gộp đơn TDV đã đặt (Đơn kế toán) của nhóm. Có cache 5 phút. */
export async function getDonKeToan(): Promise<{ dons: DonKeToan[]; error: string | null }> {
  if (_cache && Date.now() - _cache.at < TTL) return { dons: _cache.data, error: null };

  const team = new Set(allEmployees().map((e) => normMa(e.maNhanVien)));
  const baseMs = new Date(BASE_DATE + "T00:00:00").getTime();

  const sheets = google.sheets({ version: "v4", auth: getAuth() });
  let tabTitles: string[];
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SOURCE_ID, fields: "sheets.properties.title" });
    tabTitles = (meta.data.sheets ?? [])
      .map((s) => s.properties?.title ?? "")
      .filter((t) => TAB_PATTERN.test(t));
  } catch (err) {
    return { dons: [], error: err instanceof Error ? err.message : String(err) };
  }
  if (tabTitles.length === 0) return { dons: [], error: "Không thấy tab Đơn kế toán trong file nguồn." };

  // gộp theo Mã chứng từ
  const map = new Map<string, DonKeToan>();
  for (const title of tabTitles) {
    let raw: unknown[][];
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SOURCE_ID,
        range: `'${title}'`,
        valueRenderOption: "UNFORMATTED_VALUE",
      });
      raw = (res.data.values as unknown[][] | undefined) ?? [];
    } catch {
      continue;
    }
    // tìm header
    let h = -1;
    for (let i = 0; i < Math.min(10, raw.length); i++) {
      const low = (raw[i] ?? []).map((x) => String(x ?? "").trim().toLowerCase());
      if (low.includes("mã nhân viên") && low.some((c) => c === "tổng tiền" || c.includes("tổng tiền"))) { h = i; break; }
    }
    if (h < 0) continue;
    const hdr = (raw[h] as unknown[]).map((x) => String(x ?? "").trim().toLowerCase());
    const col = (...names: string[]) => {
      for (const n of names) { const j = hdr.findIndex((x) => x === n); if (j >= 0) return j; }
      for (const n of names) { const j = hdr.findIndex((x) => x.includes(n)); if (j >= 0) return j; }
      return -1;
    };
    const iLoai = col("loại đơn"), iCT = col("mã chứng từ"), iNgay = col("ngày chứng từ"),
      iMaTC = col("mã tổ chức"), iTenTC = col("tên tổ chức"), iTinh = col("tỉnh/tp", "tỉnh"),
      iMaSP = col("mã sp", "mã sản phẩm"), iTenSP = col("tên sp", "tên sản phẩm"),
      iSL = col("số lượng"), iTong = col("tổng tiền"), iMaNV = col("mã nhân viên"), iTenNV = col("tên nhân viên");
    if (iMaNV < 0 || iCT < 0) continue;

    for (let i = h + 1; i < raw.length; i++) {
      const r = raw[i];
      if (!r) continue;
      const ma = normMa(r[iMaNV]);
      if (!team.has(ma)) continue;
      const maCT = String(r[iCT] ?? "").trim();
      if (!maCT) continue;
      const ms = iNgay >= 0 ? toDateMs(r[iNgay]) : null;
      const di = ms !== null ? Math.round((ms - baseMs) / 86400000) : -1;
      const line: DonLine = {
        maSP: iMaSP >= 0 ? String(r[iMaSP] ?? "").trim() : "",
        tenSP: iTenSP >= 0 ? String(r[iTenSP] ?? "").trim() : "",
        soLuong: iSL >= 0 ? toNum(r[iSL]) : 0,
        thanhTien: iTong >= 0 ? toNum(r[iTong]) : 0,
      };
      let don = map.get(maCT);
      if (!don) {
        don = {
          maCT,
          loaiDon: iLoai >= 0 ? String(r[iLoai] ?? "").trim() : "",
          di,
          ngay: ms !== null ? fmtDate(ms) : "",
          maNV: String(r[iMaNV] ?? "").trim(),
          tenNV: iTenNV >= 0 ? String(r[iTenNV] ?? "").trim() : "",
          maKH: iMaTC >= 0 ? String(r[iMaTC] ?? "").trim() : "",
          tenKH: iTenTC >= 0 ? String(r[iTenTC] ?? "").trim() : "",
          tinh: iTinh >= 0 ? String(r[iTinh] ?? "").trim() : "",
          tongTien: 0,
          lines: [],
        };
        map.set(maCT, don);
      }
      don.lines.push(line);
      don.tongTien += line.thanhTien;
    }
  }

  const dons = [...map.values()].sort((a, b) => b.di - a.di);
  _cache = { at: Date.now(), data: dons };
  return { dons, error: null };
}
