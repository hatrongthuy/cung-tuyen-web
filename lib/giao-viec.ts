import { google } from "googleapis";

// ------------------------------------------------------------------
// GIAO VIỆC (việc cần làm theo tuần).
// ------------------------------------------------------------------
// Việc được SINH TỰ ĐỘNG từ báo cáo tuần (khách cần chăm: chưa viếng thăm / khách "chết" /
// sản phẩm nghỉ / đi ắng / kế thừa). Quản lý CHỈ XEM VÀ SỬA (sửa nội dung/ưu tiên, xoá, thêm
// thủ công nếu cần). Mỗi nhân viên khi vào web thấy "việc cần làm tuần này" của mình và tự đánh
// dấu tiến độ (Chưa làm / Đang làm / Hoàn thành).
//
// Lưu vào tab "Giao việc" của sheet chính (GOOGLE_SHEETS_SPREADSHEET_ID — sheet service account đã
// có quyền EDITOR). Tab tự tạo nếu chưa có. Mỗi việc = 1 dòng, định danh bằng cột ID.
// "Khoá nguồn" dùng để chống trùng khi giao tự động lại (mỗi khách/lý do/tuần chỉ tạo 1 việc).

const SPREADSHEET_ID =
  process.env.GOOGLE_SHEETS_GIAOVIEC_SPREADSHEET_ID || process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "";
const TAB = process.env.GOOGLE_SHEETS_GIAOVIEC_TAB || "Giao việc";
const HEADERS = [
  "ID",
  "Thời điểm giao",
  "Người giao",
  "Mã nhân viên",
  "Tên nhân viên",
  "Tuần",
  "Nội dung",
  "Ưu tiên",
  "Hạn",
  "Trạng thái",
  "Cập nhật lúc",
  "Ghi chú",
  "Nguồn",
  "Khoá nguồn",
];
// Chỉ số cột (0-based) theo HEADERS ở trên.
const C = {
  id: 0,
  thoiDiem: 1,
  nguoiGiao: 2,
  maNV: 3,
  tenNV: 4,
  tuan: 5,
  noiDung: 6,
  uuTien: 7,
  han: 8,
  trangThai: 9,
  capNhat: 10,
  ghiChu: 11,
  nguon: 12,
  khoaNguon: 13,
} as const;

export const TRANG_THAI = ["Chưa làm", "Đang làm", "Hoàn thành"] as const;
export type TrangThai = (typeof TRANG_THAI)[number];
export const UU_TIEN = ["Cao", "Bình thường", "Thấp"] as const;
export type UuTien = (typeof UU_TIEN)[number];

export interface GiaoViec {
  id: string;
  thoiDiem: string;
  nguoiGiao: string;
  maNV: string;
  tenNV: string;
  tuan: string; // khoá tuần ISO "yyyy-Www"
  noiDung: string;
  uuTien: string;
  han: string;
  trangThai: string;
  capNhat: string;
  ghiChu: string;
  nguon: string; // "Tự động" | "Thủ công"
  khoaNguon: string; // định danh nguồn để chống trùng (auto)
}

/** Service account quyền GHI (đọc + ghi). */
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

export function normMa(v: unknown): string {
  return String(v ?? "").trim().replace(/^0+(?=\d)/, "");
}

/** Thời điểm hiện tại theo giờ VN (chuỗi RAW). */
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

/** Chữ cái cột A1 từ chỉ số 0-based. */
function colLetter(n0: number): string {
  let n = n0 + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

async function getSheetId(sheets: ReturnType<typeof google.sheets>): Promise<number | null> {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields: "sheets.properties(sheetId,title)",
  });
  const s = meta.data.sheets?.find((x) => x.properties?.title === TAB);
  return s?.properties?.sheetId ?? null;
}

async function ensureTab(sheets: ReturnType<typeof google.sheets>): Promise<void> {
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

function rowToTask(r: unknown[]): GiaoViec {
  const g = (i: number) => (r[i] != null ? String(r[i]).trim() : "");
  return {
    id: g(C.id),
    thoiDiem: g(C.thoiDiem),
    nguoiGiao: g(C.nguoiGiao),
    maNV: g(C.maNV),
    tenNV: g(C.tenNV),
    tuan: g(C.tuan),
    noiDung: g(C.noiDung),
    uuTien: g(C.uuTien),
    han: g(C.han),
    trangThai: g(C.trangThai) || "Chưa làm",
    capNhat: g(C.capNhat),
    ghiChu: g(C.ghiChu),
    nguon: g(C.nguon),
    khoaNguon: g(C.khoaNguon),
  };
}

function taskToRow(t: GiaoViec): (string | number)[] {
  return [
    t.id,
    t.thoiDiem,
    t.nguoiGiao,
    t.maNV,
    t.tenNV,
    t.tuan,
    t.noiDung,
    t.uuTien,
    t.han,
    t.trangThai,
    t.capNhat,
    t.ghiChu,
    t.nguon,
    t.khoaNguon,
  ];
}

/** Đọc toàn bộ dòng của tab. */
async function readAll(): Promise<{ rows: unknown[][]; hdrIdx: number }> {
  const sheets = client();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${TAB}'`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  const rows = (res.data.values as unknown[][] | undefined) ?? [];
  let hdrIdx = -1;
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const low = (rows[i] ?? []).map((x) => String(x ?? "").trim().toLowerCase());
    if (low.includes("id") && low.includes("nội dung") && low.includes("mã nhân viên")) {
      hdrIdx = i;
      break;
    }
  }
  return { rows, hdrIdx };
}

/** Danh sách tất cả việc (mới nhất trước). */
export async function listGiaoViec(): Promise<{ tasks: GiaoViec[]; error: string | null }> {
  if (!SPREADSHEET_ID) return { tasks: [], error: "Thiếu GOOGLE_SHEETS_SPREADSHEET_ID" };
  let data: { rows: unknown[][]; hdrIdx: number };
  try {
    data = await readAll();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/unable to parse range|not found|requested entity was not found/i.test(msg)) {
      return { tasks: [], error: null }; // tab chưa tồn tại -> rỗng
    }
    return { tasks: [], error: `Không đọc được Giao việc: ${msg}` };
  }
  if (data.hdrIdx < 0) return { tasks: [], error: null };
  const tasks: GiaoViec[] = [];
  for (let i = data.hdrIdx + 1; i < data.rows.length; i++) {
    const r = data.rows[i];
    if (!r) continue;
    const t = rowToTask(r);
    if (!t.id) continue;
    tasks.push(t);
  }
  tasks.sort((a, b) => (a.thoiDiem < b.thoiDiem ? 1 : a.thoiDiem > b.thoiDiem ? -1 : 0));
  return { tasks, error: null };
}

function genId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export interface GiaoViecInput {
  nguoiGiao: string;
  maNV: string;
  tenNV: string;
  tuan: string;
  noiDung: string;
  uuTien: string;
  han?: string;
  nguon?: string; // mặc định "Thủ công"
  khoaNguon?: string;
}

function buildTask(input: GiaoViecInput): GiaoViec {
  return {
    id: genId(),
    thoiDiem: vnNowStr(),
    nguoiGiao: input.nguoiGiao,
    maNV: input.maNV,
    tenNV: input.tenNV,
    tuan: input.tuan,
    noiDung: input.noiDung,
    uuTien: input.uuTien,
    han: input.han ?? "",
    trangThai: "Chưa làm",
    capNhat: "",
    ghiChu: "",
    nguon: input.nguon ?? "Thủ công",
    khoaNguon: input.khoaNguon ?? "",
  };
}

/** Giao 1 việc. */
export async function appendGiaoViec(input: GiaoViecInput): Promise<GiaoViec> {
  const created = await appendManyGiaoViec([input]);
  return created[0];
}

/** Giao NHIỀU việc trong 1 lần ghi (batch). */
export async function appendManyGiaoViec(inputs: GiaoViecInput[]): Promise<GiaoViec[]> {
  if (!SPREADSHEET_ID) throw new Error("Thiếu GOOGLE_SHEETS_SPREADSHEET_ID để lưu Giao việc");
  const tasks = inputs.map(buildTask);
  if (tasks.length === 0) return [];
  const sheets = client();
  const values = tasks.map(taskToRow);
  const append = () =>
    sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${TAB}'!A1`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values },
    });
  try {
    await append();
  } catch {
    await ensureTab(sheets);
    await append();
  }
  return tasks;
}

/** Cập nhật 1 việc theo ID (trạng thái/ghi chú, hoặc nội dung/ưu tiên/hạn khi quản lý sửa).
 *  ownerMaNV != null -> chỉ cho sửa việc của đúng nhân viên đó (nhân viên tự cập nhật của mình). */
export async function updateGiaoViec(
  id: string,
  patch: { noiDung?: string; uuTien?: string; han?: string; trangThai?: string; ghiChu?: string },
  ownerMaNV?: string
): Promise<{ ok: boolean; error?: string }> {
  if (!SPREADSHEET_ID) return { ok: false, error: "Thiếu GOOGLE_SHEETS_SPREADSHEET_ID" };
  const sheets = client();
  const all = await readAll();
  let idx = -1;
  if (all.hdrIdx >= 0) {
    for (let i = all.hdrIdx + 1; i < all.rows.length; i++) {
      if (String(all.rows[i]?.[C.id] ?? "").trim() === id) { idx = i; break; }
    }
  }
  if (idx < 0) return { ok: false, error: "Không tìm thấy việc" };
  const row = all.rows[idx];
  if (ownerMaNV != null && normMa(row?.[C.maNV]) !== normMa(ownerMaNV)) {
    return { ok: false, error: "Không có quyền sửa việc này" };
  }
  const cur = (i: number) => String(row?.[i] ?? "");
  const noiDung = patch.noiDung != null ? patch.noiDung : cur(C.noiDung);
  const uuTien = patch.uuTien != null ? patch.uuTien : cur(C.uuTien);
  const han = patch.han != null ? patch.han : cur(C.han);
  const trangThai = patch.trangThai != null ? patch.trangThai : cur(C.trangThai);
  const ghiChu = patch.ghiChu != null ? patch.ghiChu : cur(C.ghiChu);
  const sheetRow = idx + 1; // A1 1-based
  // Cột Nội dung..Ghi chú liền nhau: F..L (6..11).
  const from = colLetter(C.noiDung);
  const to = colLetter(C.ghiChu);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${TAB}'!${from}${sheetRow}:${to}${sheetRow}`,
    valueInputOption: "RAW",
    requestBody: { values: [[noiDung, uuTien, han, trangThai, vnNowStr(), ghiChu]] },
  });
  return { ok: true };
}

/** Xoá 1 việc theo ID (quản lý). */
export async function deleteGiaoViec(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!SPREADSHEET_ID) return { ok: false, error: "Thiếu GOOGLE_SHEETS_SPREADSHEET_ID" };
  const sheets = client();
  const all = await readAll();
  let idx = -1;
  if (all.hdrIdx >= 0) {
    for (let i = all.hdrIdx + 1; i < all.rows.length; i++) {
      if (String(all.rows[i]?.[C.id] ?? "").trim() === id) { idx = i; break; }
    }
  }
  if (idx < 0) return { ok: false, error: "Không tìm thấy việc" };
  const sheetId = await getSheetId(sheets);
  if (sheetId == null) return { ok: false, error: "Không tìm thấy tab Giao việc" };
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        { deleteDimension: { range: { sheetId, dimension: "ROWS", startIndex: idx, endIndex: idx + 1 } } },
      ],
    },
  });
  return { ok: true };
}
