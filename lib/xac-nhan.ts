import { google } from "googleapis";

// ------------------------------------------------------------------
// XÁC NHẬN GỢI Ý CUNG TUYẾN — ghi THẲNG vào Google Sheets bằng service account
// (bỏ phụ thuộc webhook n8n cho ổn định). Mỗi lần nhân viên bấm "Xác nhận đã gặp"
// hoặc "Không đồng ý" sẽ append 1 dòng vào tab "Xác nhận gợi ý".
// Khi chọn "Không đồng ý" thì BẮT BUỘC có Lý do (lưu ở cột "Lý do").
// ------------------------------------------------------------------

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "";
const TAB = "Xác nhận gợi ý";
const HEADERS = [
  "Thời gian",
  "Mã nhân viên",
  "Tên nhân viên",
  "Mã khách hàng",
  "Tên khách hàng",
  "Trạng thái",
  "Lý do",
];

/** Service account quyền GHI (đọc + ghi) — cùng cơ chế với lib/giao-viec.ts. */
function getWritableAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !key) throw new Error("Thiếu GOOGLE_SERVICE_ACCOUNT_EMAIL / PRIVATE_KEY");
  key = key.replace(/\\n/g, "\n");
  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

let cached: ReturnType<typeof google.sheets> | null = null;
function client() {
  if (!cached) cached = google.sheets({ version: "v4", auth: getWritableAuth() });
  return cached;
}

/** Thời điểm hiện tại theo giờ VN (chuỗi "yyyy-MM-dd HH:mm:ss"). */
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

/** Bảo đảm tab tồn tại và dòng header có đủ 7 cột (thêm cột "Lý do" nếu sheet cũ chỉ có 6 cột). */
async function ensureTabAndHeader(sheets: ReturnType<typeof google.sheets>): Promise<void> {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields: "sheets.properties.title",
  });
  const exists = meta.data.sheets?.some((s) => s.properties?.title === TAB);
  if (!exists) {
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
    return;
  }
  // Tab đã có: kiểm tra header, nếu thiếu cột "Lý do" (G1) thì cập nhật lại dòng header.
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${TAB}'!A1:G1`,
  });
  const hdr = (res.data.values?.[0] ?? []).map((x) => String(x ?? "").trim());
  if (hdr[6] !== "Lý do") {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${TAB}'!A1:G1`,
      valueInputOption: "RAW",
      requestBody: { values: [HEADERS] },
    });
  }
}

export interface XacNhanInput {
  maNV: string;
  tenNV: string;
  maKH: string;
  tenKH: string;
  trangThai: "Đồng ý" | "Không đồng ý";
  lyDo: string;
}

/** Ghi 1 dòng xác nhận vào tab "Xác nhận gợi ý". */
export async function ghiXacNhan(input: XacNhanInput): Promise<void> {
  if (!SPREADSHEET_ID) throw new Error("Thiếu GOOGLE_SHEETS_SPREADSHEET_ID");
  const sheets = client();
  const values = [
    [
      vnNowStr(),
      input.maNV,
      input.tenNV,
      input.maKH,
      input.tenKH,
      input.trangThai,
      input.lyDo,
    ],
  ];
  const append = () =>
    sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${TAB}'!A1`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values },
    });
  try {
    await ensureTabAndHeader(sheets);
    await append();
  } catch {
    // Thử tạo tab/header rồi ghi lại 1 lần nữa.
    await ensureTabAndHeader(sheets);
    await append();
  }
}
