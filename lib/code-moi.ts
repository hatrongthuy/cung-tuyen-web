import { google } from "googleapis";

// ------------------------------------------------------------------
// CODE MỚI NHẬP TAY (theo tuần) — nhân viên tự nhập trên web.
// ------------------------------------------------------------------
// Chỉ tiêu "Code mới" không thể suy tự động đủ tin cậy từ file Sale (mã khách đổi giữa các kỳ),
// nên để nhân viên tự nhập. Web GHI thẳng vào Google Sheet bằng SERVICE ACCOUNT quyền ghi
// (giống lib/login-log.ts) — KHÔNG cần webhook/n8n. Với mỗi (Mã NV, Năm, Tháng) lấy giá trị của
// LẦN NHẬP MỚI NHẤT làm số Code mới trong tháng (cho phép nhân viên cập nhật/sửa, lần sau đè lần trước).
//
// Lưu vào tab "Code mới nhập tay" của sheet chính (GOOGLE_SHEETS_SPREADSHEET_ID — sheet mà service
// account đã có quyền EDITOR, cùng nơi đang ghi "Lịch sử đăng nhập"). Tab tự tạo nếu chưa có.

const SPREADSHEET_ID =
  process.env.GOOGLE_SHEETS_CODEMOI_SPREADSHEET_ID || process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "";
const TAB = process.env.GOOGLE_SHEETS_CODEMOI_TAB || "Code mới nhập tay";
const HEADERS = ["Thời điểm", "Mã nhân viên", "Tên nhân viên", "Năm", "Tháng", "Tuần", "Số code mới"];

/** Service account quyền GHI (đọc + ghi) — sheet phải được share EDITOR cho email service account. */
function getWritableAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !key) throw new Error("Thiếu GOOGLE_SERVICE_ACCOUNT_EMAIL / PRIVATE_KEY");
  key = key.replace(/\\n/g, "\n");
  return new google.auth.JWT({ email, key, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
}

let cached: ReturnType<typeof google.sheets> | null = null;
function client() {
  if (!cached) cached = google.sheets({ version: "v4", auth: getWritableAuth() });
  return cached;
}

function normalizeMaNV(v: unknown): string {
  return String(v ?? "").trim().replace(/^0+(?=\d)/, "");
}
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

function intOrNull(v: unknown): number | null {
  const s = String(v ?? "").trim();
  if (!s || !/\d/.test(s)) return null;
  const n = Math.round(Number(s.replace(/[^\d.-]/g, "")));
  return Number.isFinite(n) ? n : null;
}

/** Thời điểm hiện tại theo giờ VN (chuỗi RAW, tránh Sheets đổi thành số serial). */
function vnNowStr(): string {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  let H = g("hour");
  if (H === "24") H = "00";
  return `${g("year")}-${g("month")}-${g("day")} ${H}:${g("minute")}:${g("second")}`;
}

async function ensureTab(sheets: ReturnType<typeof google.sheets>) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID, fields: "sheets.properties.title" });
  if (meta.data.sheets?.some((s) => s.properties?.title === TAB)) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] },
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${TAB}'!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [HEADERS] },
  });
}

/** Ghi 1 dòng Code mới nhập tay. Tự tạo tab nếu chưa có. */
export async function appendCodeMoi(input: {
  ma: string;
  ten: string;
  nam: number;
  thang: number;
  tuan: number;
  so: number;
}): Promise<void> {
  if (!SPREADSHEET_ID) throw new Error("Thiếu GOOGLE_SHEETS_SPREADSHEET_ID để lưu Code mới");
  const sheets = client();
  const row = [[vnNowStr(), input.ma, input.ten, input.nam, input.thang, input.tuan, input.so]];
  const append = () =>
    sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${TAB}'!A1`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: row },
    });
  try {
    await append();
  } catch {
    await ensureTab(sheets);
    await append();
  }
}

export interface CodeMoiManualResult {
  /** Mã NV (đã bỏ số 0 đầu) -> số Code mới nhập tay của tháng. */
  byMa: Record<string, number>;
  /** true nếu tính năng đã sẵn sàng (có sheet lưu trữ). */
  configured: boolean;
  error: string | null;
}

/** Đọc số Code mới NHẬP TAY cho tháng (nam, thang). Với mỗi mã NV, lấy LẦN NHẬP MỚI NHẤT. */
export async function getCodeMoiManual(nam: number, thang: number): Promise<CodeMoiManualResult> {
  if (!SPREADSHEET_ID) return { byMa: {}, configured: false, error: null };

  let raw: unknown[][];
  try {
    const sheets = client();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${TAB}'`,
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    raw = (res.data.values as unknown[][] | undefined) ?? [];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Tab chưa tồn tại (chưa ai nhập) -> coi như đã sẵn sàng, chỉ là chưa có số.
    if (/unable to parse range|not found|requested entity was not found/i.test(msg)) {
      return { byMa: {}, configured: true, error: null };
    }
    return { byMa: {}, configured: false, error: `Không đọc được Code mới nhập tay: ${msg}` };
  }

  let hdrIdx = -1;
  for (let i = 0; i < Math.min(5, raw.length); i++) {
    const r = (raw[i] ?? []).map((x) => norm(String(x ?? "")));
    if (r.includes("mã nhân viên") && r.some((c) => c.includes("code mới"))) {
      hdrIdx = i;
      break;
    }
  }
  if (hdrIdx < 0) return { byMa: {}, configured: true, error: null };

  const hdr = (raw[hdrIdx] as unknown[]).map((x) => norm(String(x ?? "")));
  const iMa = hdr.findIndex((h) => h === "mã nhân viên");
  const iNam = hdr.findIndex((h) => h === "năm");
  const iThang = hdr.findIndex((h) => h === "tháng");
  const iSo = hdr.findIndex((h) => h.includes("số code mới") || h === "code mới");

  const latest = new Map<string, number>();
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
    // Dòng dưới = nhập sau (append thêm ở cuối) => ghi đè, giữ giá trị MỚI NHẤT.
    latest.set(ma, Math.max(0, so));
  }

  const byMa: Record<string, number> = {};
  for (const [ma, so] of latest) byMa[ma] = so;
  return { byMa, configured: true, error: null };
}
