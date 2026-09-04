// Đọc/ghi bảng GIÁ báo giá trong tab "Báo giá" của Google Sheet chính, dùng SERVICE ACCOUNT
// với quyền GHI (scope spreadsheets) — service account đã được share EDITOR cho sheet này
// (giống cơ chế ghi "Lịch sử đăng nhập").
//
// - Lần đầu chạy: nếu tab "Báo giá" chưa có / trống, tự tạo tab và NẠP (seed) toàn bộ dữ liệu
//   sản phẩm từ lib/bao-gia-data.ts (bản gốc trích từ 3 file PDF).
// - Sau đó tab này là NGUỒN dữ liệu giá. Quản lý sửa giá trên web -> ghi ngược vào đây.
//
// Mỗi dòng có 1 "id" ổn định (vd "gmhs-6") để map khi cập nhật giá, không phụ thuộc thứ tự.

import { google } from "googleapis";
import { CATALOGS } from "@/lib/bao-gia-data";

export interface SanPhamRow {
  id: string;
  catalog: string; // id của catalog: san-khoa-nhi | gmhs | tieu-hoa
  nhom: string;
  ten: string;
  hoatChat: string;
  quyCach: string;
  gia: string;
}

const TAB = "Báo giá";
const HEADERS = ["id", "catalog", "nhom", "ten", "hoatChat", "quyCach", "gia"];

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

/** Trải phẳng dữ liệu gốc (seed) thành các dòng có id ổn định. */
export function seedRows(): SanPhamRow[] {
  const out: SanPhamRow[] = [];
  for (const c of CATALOGS) {
    c.sanPham.forEach((sp, i) => {
      out.push({
        id: `${c.id}-${i + 1}`,
        catalog: c.id,
        nhom: sp.nhom,
        ten: sp.ten,
        hoatChat: sp.hoatChat,
        quyCach: sp.quyCach,
        gia: sp.gia,
      });
    });
  }
  return out;
}

async function ensureTab(sheets: ReturnType<typeof google.sheets>, spreadsheetId: string) {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  });
  const exists = meta.data.sheets?.some((s) => s.properties?.title === TAB);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] },
    });
  }
}

async function readRows(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string
): Promise<SanPhamRow[]> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${TAB}'`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  const rows = res.data.values ?? [];
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => String(h ?? "").trim());
  const idx = (name: string) => headers.indexOf(name);
  const out: SanPhamRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every((c) => c === "" || c == null)) continue;
    const get = (n: string) => {
      const j = idx(n);
      return j >= 0 && r[j] != null ? String(r[j]) : "";
    };
    out.push({
      id: get("id"),
      catalog: get("catalog"),
      nhom: get("nhom"),
      ten: get("ten"),
      hoatChat: get("hoatChat"),
      quyCach: get("quyCach"),
      gia: get("gia"),
    });
  }
  return out;
}

/** Đọc toàn bộ sản phẩm từ Sheet. Nếu tab trống -> tự nạp seed rồi trả về. */
export async function docSanPham(): Promise<SanPhamRow[]> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) return seedRows(); // dự phòng: không cấu hình sheet -> đọc từ code
  const sheets = client();
  await ensureTab(sheets, spreadsheetId);
  let rows = await readRows(sheets, spreadsheetId);
  if (rows.length === 0) {
    const seed = seedRows();
    const values = [
      HEADERS,
      ...seed.map((s) => [s.id, s.catalog, s.nhom, s.ten, s.hoatChat, s.quyCach, s.gia]),
    ];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${TAB}'!A1`,
      valueInputOption: "RAW",
      requestBody: { values },
    });
    rows = seed;
  }
  return rows;
}

/** Cập nhật GIÁ theo id. Trả về số dòng thực sự thay đổi. */
export async function capNhatGia(updates: { id: string; gia: string }[]): Promise<number> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error("Thiếu GOOGLE_SHEETS_SPREADSHEET_ID");
  const sheets = client();
  await ensureTab(sheets, spreadsheetId);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${TAB}'`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  const rows = res.data.values ?? [];
  if (rows.length < 2) throw new Error("Bảng báo giá đang trống");
  const headers = rows[0].map((h) => String(h ?? "").trim());
  const idCol = headers.indexOf("id");
  const giaCol = headers.indexOf("gia");
  if (idCol < 0 || giaCol < 0) throw new Error("Sheet thiếu cột id hoặc gia");

  const map = new Map(updates.map((u) => [u.id, u.gia]));
  const giaValues: string[][] = [];
  let changed = 0;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] ?? [];
    const id = r[idCol] != null ? String(r[idCol]) : "";
    let gia = r[giaCol] != null ? String(r[giaCol]) : "";
    if (map.has(id)) {
      const ng = map.get(id)!;
      if (ng !== gia) {
        gia = ng;
        changed++;
      }
    }
    giaValues.push([gia]);
  }

  const colLetter = String.fromCharCode(65 + giaCol); // 6 -> 'G'
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${TAB}'!${colLetter}2:${colLetter}${rows.length}`,
    valueInputOption: "RAW",
    requestBody: { values: giaValues },
  });
  return changed;
}
