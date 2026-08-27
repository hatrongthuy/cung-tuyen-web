import { google } from "googleapis";
import { allEmployees } from "./allowlist";
import { parseMoney } from "./format";

// File dữ liệu Sale "sạch" (đã chia sẻ công khai quyền xem) — chứa doanh số THỰC HIỆN
// theo từng giao dịch: Mã nhân viên, Ngày, Tháng, Năm, Doanh thu... Web đọc tab "Sale sạch"
// và cộng dồn theo nhân viên/kỳ. Có thể đổi qua biến môi trường.
const SALES_SPREADSHEET_ID =
  process.env.GOOGLE_SHEETS_SALES_SPREADSHEET_ID || "19CNg5Q38a7tAyNR8NSY6-E5U1Q1kqdhsblftGuGDsdU";
const SALES_TAB = process.env.GOOGLE_SHEETS_SALES_TAB || "Sale sạch";

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/permission|403|forbidden|not have access/i.test(msg)) {
    return `Không có quyền đọc file dữ liệu Sale. Hãy đảm bảo file "PS_TayBac_DuLieuSach" được chia sẻ (ít nhất quyền Viewer cho "Bất kỳ ai có link", hoặc cho email service account). Chi tiết: ${msg}`;
  }
  if (/not found|404|unable to parse range|requested entity was not found/i.test(msg)) {
    return `Không tìm thấy file/tab dữ liệu Sale (kiểm tra ID file và tên tab "${SALES_TAB}"). Chi tiết: ${msg}`;
  }
  return msg;
}

function normalizeMaNV(v: unknown): string {
  return String(v ?? "").trim().replace(/^0+(?=\d)/, "");
}

/** Ô ngày từ Google Sheets (UNFORMATTED_VALUE) có thể là số serial (ngày kể từ 30/12/1899)
 * hoặc chuỗi "yyyy-MM-dd ...". Trả về mốc thời gian (ms) hoặc null. */
function toDateMs(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) {
    const ms = Math.round((v - 25569) * 86400 * 1000);
    return Number.isFinite(ms) ? ms : null;
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

/** 1 giao dịch bán hàng của nhân viên trong nhóm (đã rút gọn để truyền xuống client). */
export interface SaleTxn {
  ma: string; // mã nhân viên đã chuẩn hóa
  ten: string;
  dateMs: number | null;
  nam: number;
  thang: number;
  dt: number; // doanh thu
}

export interface SalesResult {
  txns: SaleTxn[];
  error: string | null;
}

/** Đọc tab "Sale sạch", lọc CHỈ các giao dịch của 5 nhân viên trong nhóm (theo Mã nhân viên),
 * trả về danh sách giao dịch rút gọn để cộng dồn theo tuần/tháng ở phía client. */
export async function getTeamSales(): Promise<SalesResult> {
  let rows: unknown[][];
  try {
    const sheets = google.sheets({ version: "v4", auth: getAuth() });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SALES_SPREADSHEET_ID,
      range: `'${SALES_TAB}'`,
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    rows = (res.data.values as unknown[][] | undefined) ?? [];
  } catch (err) {
    return { txns: [], error: friendlyError(err) };
  }

  // Tìm dòng tiêu đề (một số tab có dòng ghi chú phía trên): dòng đầu tiên chứa "Mã nhân viên"
  // và một cột "Doanh thu".
  let hdrIdx = -1;
  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const r = (rows[i] ?? []).map((x) => String(x ?? "").trim().toLowerCase());
    if (r.includes("mã nhân viên") && r.some((c) => c === "doanh thu")) {
      hdrIdx = i;
      break;
    }
  }
  if (hdrIdx < 0) {
    return { txns: [], error: `Không tìm thấy dòng tiêu đề (Mã nhân viên / Doanh thu) trong tab "${SALES_TAB}".` };
  }

  const hdr = (rows[hdrIdx] as unknown[]).map((x) => String(x ?? "").trim());
  const findCol = (name: string) => hdr.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  const iMa = findCol("Mã nhân viên");
  const iTen = findCol("Tên nhân viên");
  const iNgay = findCol("Ngày");
  const iThang = findCol("Tháng");
  const iNam = findCol("Năm");
  const iDT = findCol("Doanh thu");
  if (iMa < 0 || iDT < 0) {
    return { txns: [], error: `Thiếu cột Mã nhân viên hoặc Doanh thu trong tab "${SALES_TAB}".` };
  }

  const team = new Set(allEmployees().map((e) => normalizeMaNV(e.maNhanVien)));
  const txns: SaleTxn[] = [];
  for (let i = hdrIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const ma = normalizeMaNV(r[iMa]);
    if (!team.has(ma)) continue;
    const dateMs = iNgay >= 0 ? toDateMs(r[iNgay]) : null;
    const nam = iNam >= 0 ? Number(r[iNam]) || (dateMs ? new Date(dateMs).getFullYear() : 0) : 0;
    const thang = iThang >= 0 ? Number(r[iThang]) || (dateMs ? new Date(dateMs).getMonth() + 1 : 0) : 0;
    txns.push({
      ma,
      ten: String(r[iTen] ?? ""),
      dateMs,
      nam,
      thang,
      dt: parseMoney(r[iDT]),
    });
  }
  return { txns, error: null };
}
