import { google } from "googleapis";

// ------------------------------------------------------------------
// CODE MỚI NHẬP TAY (theo tuần) — nhân viên tự nhập trên web.
// ------------------------------------------------------------------
// Chỉ tiêu "Code mới" không thể suy tự động đủ tin cậy từ file Sale (mã khách đổi giữa các kỳ),
// nên để nhân viên tự nhập. Mỗi lần nhập ghi 1 dòng vào 1 tab Google Sheet (qua webhook n8n).
// File này ĐỌC lại tab đó: với mỗi (Mã NV, Năm, Tháng) lấy giá trị MỚI NHẤT (theo thời điểm nhập)
// làm số Code mới trong tháng — cho phép nhân viên cập nhật/sửa lại, lần nhập sau đè lần trước.
//
// Cấu trúc tab (n8n append, có dòng tiêu đề):
//   Thời điểm | Mã nhân viên | Tên nhân viên | Năm | Tháng | Tuần | Số code mới
// (Đọc theo TÊN cột nên thứ tự cột không bắt buộc, miễn có "Mã nhân viên" và "Số code mới".)

const CODEMOI_SPREADSHEET_ID =
  process.env.GOOGLE_SHEETS_CODEMOI_SPREADSHEET_ID ||
  process.env.GOOGLE_SHEETS_KPI_SPREADSHEET_ID ||
  "1dv0q_SpajvhbaOtNu43ctwetjXhBUURRIaDVv39W5bw";
const CODEMOI_TAB = process.env.GOOGLE_SHEETS_CODEMOI_TAB || "Code mới nhập tay";

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

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** Số nguyên >= 0 từ ô; null nếu không đọc được. */
function intOrNull(v: unknown): number | null {
  const s = String(v ?? "").trim();
  if (!s || !/\d/.test(s)) return null;
  const n = Math.round(Number(s.replace(/[^\d.-]/g, "")));
  return Number.isFinite(n) ? n : null;
}

/** Mốc thời gian (ms) để so "mới nhất". Chấp nhận số serial, ISO, dd/MM/yyyy... */
function tsToMs(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number" && Number.isFinite(v)) {
    // serial Google Sheets
    if (v > 1000 && v < 100000) return Math.round((v - 25569) * 86400 * 1000);
    return v;
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{1,2}))?/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4] ?? 0), Number(m[5] ?? 0)).getTime();
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

export interface CodeMoiManualResult {
  /** Mã NV (đã bỏ số 0 đầu) -> số Code mới nhập tay của tháng. */
  byMa: Record<string, number>;
  /** true nếu tính năng đã được cấu hình (đọc được tab). */
  configured: boolean;
  error: string | null;
}

/**
 * Đọc số Code mới NHẬP TAY cho tháng (nam, thang).
 * Với mỗi mã NV, lấy giá trị của LẦN NHẬP MỚI NHẤT trong tháng đó.
 */
export async function getCodeMoiManual(nam: number, thang: number): Promise<CodeMoiManualResult> {
  let raw: unknown[][];
  try {
    const sheets = google.sheets({ version: "v4", auth: getAuth() });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: CODEMOI_SPREADSHEET_ID,
      range: `'${CODEMOI_TAB}'`,
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    raw = (res.data.values as unknown[][] | undefined) ?? [];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Tab chưa tạo/chưa cấu hình -> coi như chưa có số, không phải lỗi chặn.
    if (/unable to parse range|not found|requested entity was not found/i.test(msg)) {
      return { byMa: {}, configured: false, error: null };
    }
    return { byMa: {}, configured: false, error: `Không đọc được Code mới nhập tay: ${msg}` };
  }

  // Tìm dòng tiêu đề (có "mã nhân viên" và "số code mới").
  let hdrIdx = -1;
  for (let i = 0; i < Math.min(10, raw.length); i++) {
    const r = (raw[i] ?? []).map((x) => norm(String(x ?? "")));
    if (r.includes("mã nhân viên") && r.some((c) => c.includes("code mới"))) {
      hdrIdx = i;
      break;
    }
  }
  if (hdrIdx < 0) return { byMa: {}, configured: raw.length > 0, error: null };

  const hdr = (raw[hdrIdx] as unknown[]).map((x) => norm(String(x ?? "")));
  const iMa = hdr.findIndex((h) => h === "mã nhân viên");
  const iNam = hdr.findIndex((h) => h === "năm");
  const iThang = hdr.findIndex((h) => h === "tháng");
  const iSo = hdr.findIndex((h) => h.includes("số code mới") || h === "code mới");
  const iTs = hdr.findIndex((h) => h.includes("thời điểm") || h.includes("thoi diem") || h === "timestamp");

  const latest = new Map<string, { ts: number; so: number }>();
  for (let i = hdrIdx + 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r) continue;
    const ma = normalizeMaNV(r[iMa]);
    if (!ma) continue;
    const nm = iNam >= 0 ? intOrNull(r[iNam]) : nam;
    const th = iThang >= 0 ? intOrNull(r[iThang]) : thang;
    if (nm !== nam || th !== thang) continue;
    const so = iSo >= 0 ? intOrNull(r[iSo]) : null;
    if (so === null) continue;
    const ts = iTs >= 0 ? tsToMs(r[iTs]) : i; // không có cột thời điểm -> dùng thứ tự dòng
    const cur = latest.get(ma);
    if (!cur || ts >= cur.ts) latest.set(ma, { ts, so });
  }

  const byMa: Record<string, number> = {};
  for (const [ma, v] of latest) byMa[ma] = Math.max(0, v.so);
  return { byMa, configured: true, error: null };
}
