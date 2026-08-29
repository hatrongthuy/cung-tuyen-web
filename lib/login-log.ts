// Ghi lại mỗi lượt "có mặt" của người dùng vào tab "Lịch sử đăng nhập" của Google Sheet chính.
// Dùng SERVICE ACCOUNT với quyền GHI (scope spreadsheets) — vì vậy service account phải được
// chia sẻ quyền EDITOR trên sheet (không chỉ Viewer như phần đọc). Chỉ ghi vào đúng 1 tab này.
//
// Được gọi trong callback đăng nhập (auth.ts) với cơ chế "mỗi người mỗi ngày ghi 1 lần" (throttle
// bằng token) nên số dòng không phình to; đủ để đo "ai hay vào, ai không".

import { google } from "googleapis";

const TAB = "Lịch sử đăng nhập";
const HEADERS = ["Thời gian", "Ngày", "Email", "Họ tên"];

function getWritableAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !key) throw new Error("Thiếu GOOGLE_SERVICE_ACCOUNT_EMAIL / PRIVATE_KEY");
  key = key.replace(/\\n/g, "\n");
  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"], // đọc + ghi
  });
}

let cached: ReturnType<typeof google.sheets> | null = null;
function client() {
  if (!cached) cached = google.sheets({ version: "v4", auth: getWritableAuth() });
  return cached;
}

/** Định dạng thời gian theo giờ Việt Nam. Trả về chuỗi (RAW) để KHÔNG bị Sheets đổi thành số serial. */
function vnNow(): { ngay: string; thoiGian: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const g = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
  const dd = g("day");
  const mm = g("month");
  const yy = g("year");
  let H = g("hour");
  if (H === "24") H = "00";
  const M = g("minute");
  const S = g("second");
  return { ngay: `${dd}/${mm}/${yy}`, thoiGian: `${yy}-${mm}-${dd} ${H}:${M}:${S}` };
}

async function ensureTab(sheets: ReturnType<typeof google.sheets>, spreadsheetId: string) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets.properties.title" });
  const exists = meta.data.sheets?.some((s) => s.properties?.title === TAB);
  if (exists) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] },
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${TAB}'!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [HEADERS] },
  });
}

/** Ghi 1 dòng đăng nhập. An toàn: bọc try/catch ở nơi gọi để KHÔNG bao giờ làm hỏng đăng nhập. */
export async function logLogin(email: string, hoTen: string): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) return;
  const sheets = client();
  const { ngay, thoiGian } = vnNow();
  const row = [[thoiGian, ngay, email, hoTen]];
  const append = () =>
    sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${TAB}'!A1`,
      valueInputOption: "RAW", // giữ nguyên chuỗi, tránh serial-date
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: row },
    });
  try {
    await append();
  } catch {
    // Rất có thể tab chưa tồn tại -> tạo rồi ghi lại.
    await ensureTab(sheets, spreadsheetId);
    await append();
  }
}
