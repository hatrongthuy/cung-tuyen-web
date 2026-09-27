import { google } from "googleapis";

// ------------------------------------------------------------------
// ĐƠN HÀNG NHẬP TAY — thêm đơn để THEO DÕI trong mục Sale.
// ------------------------------------------------------------------
// File "Sale sạch" bị đồng bộ (capNhatSaleSach) GHI ĐÈ mỗi ngày, nên đơn nhập tay KHÔNG được
// lưu ở đó (sẽ bị xóa). Ta lưu ở tab riêng "Đơn nhập tay" trên sheet CHÍNH (service account có
// quyền EDITOR — cùng nơi ghi "Lịch sử đăng nhập" / "Code mới nhập tay"). Đơn nhập tay được
// GỘP vào dữ liệu Sale (getSaleDetailData) để hiện & tính trong Tra cứu Sale, SP trọng tâm,
// Doanh số… và có nhãn "nhập tay". Khi kế toán lên đơn chính thức thì XÓA đơn tay để khỏi trùng.

const SPREADSHEET_ID =
  process.env.GOOGLE_SHEETS_DONTAY_SPREADSHEET_ID || process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "";
const TAB = process.env.GOOGLE_SHEETS_DONTAY_TAB || "Đơn nhập tay";
const HEADERS = [
  "id", "Thời điểm nhập", "Mã nhân viên", "Tên nhân viên",
  "Mã KH", "Tên KH", "Tỉnh", "Nhóm KH",
  "Mã SP", "Tên SP", "Số lượng", "Khuyến mại", "Doanh thu",
  "Ngày duyệt", "Ghi chú",
];

export interface DonNhapTay {
  id: string;
  thoiDiem: string;
  maNV: string;
  tenNV: string;
  maKH: string;
  tenKH: string;
  tinh: string;
  nhomKH: string;
  maSP: string;
  tenSP: string;
  soLuong: number;
  khuyenMai: number;
  doanhThu: number;
  ngayDuyet: string; // dd/MM/yyyy
  ghiChu: string;
}

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

function vnNowStr(): string {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  let H = g("hour"); if (H === "24") H = "00";
  return `${g("year")}-${g("month")}-${g("day")} ${H}:${g("minute")}:${g("second")}`;
}

function toNum(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

async function ensureTab(sheets: ReturnType<typeof google.sheets>) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID, fields: "sheets.properties(title,sheetId)" });
  const found = meta.data.sheets?.find((s) => s.properties?.title === TAB);
  if (found) return;
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

async function getSheetId(sheets: ReturnType<typeof google.sheets>): Promise<number | null> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID, fields: "sheets.properties(title,sheetId)" });
  const found = meta.data.sheets?.find((s) => s.properties?.title === TAB);
  return found?.properties?.sheetId ?? null;
}

/** Thêm 1 đơn nhập tay. Trả về id vừa tạo. */
export async function appendDon(input: Omit<DonNhapTay, "id" | "thoiDiem">): Promise<string> {
  if (!SPREADSHEET_ID) throw new Error("Thiếu GOOGLE_SHEETS_SPREADSHEET_ID để lưu đơn nhập tay");
  const sheets = client();
  const id = "D" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const row = [[
    id, vnNowStr(), input.maNV, input.tenNV,
    input.maKH, input.tenKH, input.tinh, input.nhomKH,
    input.maSP, input.tenSP, input.soLuong, input.khuyenMai, input.doanhThu,
    input.ngayDuyet, input.ghiChu,
  ]];
  const append = () =>
    sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${TAB}'!A1`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: row },
    });
  try { await append(); } catch { await ensureTab(sheets); await append(); }
  return id;
}

/** Đọc toàn bộ đơn nhập tay. Tab chưa có -> []. */
export async function docDonNhapTay(): Promise<DonNhapTay[]> {
  if (!SPREADSHEET_ID) return [];
  let raw: unknown[][];
  try {
    const sheets = client();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${TAB}'`,
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    raw = (res.data.values as unknown[][] | undefined) ?? [];
  } catch {
    return [];
  }
  if (raw.length < 2) return [];
  const hdr = (raw[0] as unknown[]).map((x) => String(x ?? "").trim().toLowerCase());
  const col = (name: string) => hdr.findIndex((h) => h === name.toLowerCase());
  const iId = col("id"), iTd = col("thời điểm nhập"), iMa = col("mã nhân viên"), iTen = col("tên nhân viên"),
    iMaKH = col("mã kh"), iTenKH = col("tên kh"), iTinh = col("tỉnh"), iNhom = col("nhóm kh"),
    iMaSP = col("mã sp"), iTenSP = col("tên sp"), iSL = col("số lượng"), iKM = col("khuyến mại"),
    iDT = col("doanh thu"), iNgay = col("ngày duyệt"), iGhi = col("ghi chú");
  const get = (r: unknown[], i: number) => (i >= 0 && r[i] != null ? String(r[i]).trim() : "");
  const out: DonNhapTay[] = [];
  for (let i = 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r || !get(r, iId)) continue;
    out.push({
      id: get(r, iId), thoiDiem: get(r, iTd), maNV: get(r, iMa), tenNV: get(r, iTen),
      maKH: get(r, iMaKH), tenKH: get(r, iTenKH), tinh: get(r, iTinh), nhomKH: get(r, iNhom),
      maSP: get(r, iMaSP), tenSP: get(r, iTenSP),
      soLuong: toNum(r[iSL]), khuyenMai: toNum(r[iKM]), doanhThu: toNum(r[iDT]),
      ngayDuyet: get(r, iNgay), ghiChu: get(r, iGhi),
    });
  }
  return out;
}

/** Xóa 1 đơn nhập tay theo id. Trả về true nếu có xóa. */
export async function xoaDon(id: string, maNV?: string): Promise<boolean> {
  if (!SPREADSHEET_ID || !id) return false;
  const sheets = client();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${TAB}'`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  const raw = (res.data.values as unknown[][] | undefined) ?? [];
  if (raw.length < 2) return false;
  const hdr = (raw[0] as unknown[]).map((x) => String(x ?? "").trim().toLowerCase());
  const iId = hdr.findIndex((h) => h === "id");
  const iMa = hdr.findIndex((h) => h === "mã nhân viên");
  if (iId < 0) return false;
  let rowIdx = -1;
  for (let i = 1; i < raw.length; i++) {
    if (String(raw[i]?.[iId] ?? "").trim() === id) {
      // Nếu truyền maNV (nhân viên) thì chỉ cho xóa đơn của chính họ.
      if (maNV != null && iMa >= 0) {
        const owner = String(raw[i]?.[iMa] ?? "").trim().replace(/^0+(?=\d)/, "");
        if (owner !== maNV.replace(/^0+(?=\d)/, "")) return false;
      }
      rowIdx = i;
      break;
    }
  }
  if (rowIdx < 0) return false;
  const sheetId = await getSheetId(sheets);
  if (sheetId == null) return false;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: { sheetId, dimension: "ROWS", startIndex: rowIdx, endIndex: rowIdx + 1 },
        },
      }],
    },
  });
  return true;
}
