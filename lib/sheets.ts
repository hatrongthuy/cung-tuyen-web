// Đọc Google Sheets bằng SERVICE ACCOUNT (không dùng token đăng nhập Google của user).
// Sheet đã tồn tại sẵn — người phụ trách cần tự share quyền đọc (Viewer) cho email
// service account sau khi deploy (xem README.md).

import { google } from "googleapis";

function getServiceAccountAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!email || !key) {
    throw new Error(
      "Thiếu biến môi trường GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY"
    );
  }

  // Trên Vercel, private key thường được dán với \n bị escape thành chuỗi "\\n" —
  // cần chuyển lại thành ký tự xuống dòng thật.
  key = key.replace(/\\n/g, "\n");

  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

let cachedSheetsClient: ReturnType<typeof google.sheets> | null = null;

function getSheetsClient() {
  if (!cachedSheetsClient) {
    cachedSheetsClient = google.sheets({ version: "v4", auth: getServiceAccountAuth() });
  }
  return cachedSheetsClient;
}

/**
 * Đọc toàn bộ 1 tab Google Sheets, dùng dòng đầu tiên làm tên cột (header),
 * trả về mảng object { [tenCot]: giaTri }.
 */
export async function readSheetAsObjects<T extends Record<string, string>>(
  sheetName: string
): Promise<T[]> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error("Thiếu biến môi trường GOOGLE_SHEETS_SPREADSHEET_ID");
  }

  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });

  const rows = res.data.values ?? [];
  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => String(h ?? "").trim());
  const out: T[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => c === "" || c == null)) continue;
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      const v = row[idx];
      obj[h] = v == null ? "" : String(v);
    });
    out.push(obj as T);
  }

  return out;
}
