import { google } from "googleapis";

// ------------------------------------------------------------------
// PHÁT TRIỂN CÁ NHÂN / ĐÀO TẠO (bài toán 6).
// ------------------------------------------------------------------
// Quản lý chấm 6 nhóm kỹ năng (1–5) cho từng nhân viên, ghi điểm mạnh / điểm cần cải thiện /
// định hướng đào tạo–kèm cặp. Nhân viên xem hồ sơ phát triển của mình (chỉ đọc) và gửi
// "nguyện vọng phát triển" (tự nhận xét/mong muốn học thêm).
//
// Lưu vào tab "Phat trien ca nhan" của sheet chính (service account quyền EDITOR). Ghi APPEND,
// LẦN GHI MỚI NHẤT của mỗi (Mã NV, Loại) là bản hiện hành (cho phép cập nhật, lần sau đè lần trước).
// Loại: "ho-so" (quản lý ghi) | "nguyen-vong" (nhân viên ghi).

const SPREADSHEET_ID =
  process.env.GOOGLE_SHEETS_PHATTRIEN_SPREADSHEET_ID || process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "";
const TAB = process.env.GOOGLE_SHEETS_PHATTRIEN_TAB || "Phat trien ca nhan";

/** 6 nhóm kỹ năng đánh giá (thứ tự cố định = thứ tự cột trong sheet). */
export const KY_NANG = [
  "Bán hàng & chốt đơn",
  "Kiến thức sản phẩm",
  "Chăm sóc khách hàng",
  "Kỷ luật cung tuyến",
  "Phát triển khách mới",
  "Báo cáo & dùng dữ liệu",
] as const;

const HEADERS = [
  "Thời điểm",
  "Loại",
  "Mã nhân viên",
  "Tên nhân viên",
  "Người cập nhật",
  ...KY_NANG,
  "Điểm mạnh",
  "Cần cải thiện",
  "Định hướng đào tạo",
  "Nội dung",
];
// Chỉ số cột 0-based.
const C = {
  thoiDiem: 0,
  loai: 1,
  maNV: 2,
  tenNV: 3,
  nguoiCapNhat: 4,
  kyNang0: 5, // 6 cột kỹ năng: 5..10
  diemManh: 11,
  canCaiThien: 12,
  dinhHuong: 13,
  noiDung: 14,
} as const;

export interface HoSoPhatTrien {
  maNV: string;
  tenNV: string;
  nguoiCapNhat: string;
  thoiDiem: string;
  kyNang: number[]; // 6 giá trị 0–5 (0 = chưa đánh giá)
  diemManh: string;
  canCaiThien: string;
  dinhHuong: string;
}
export interface NguyenVong {
  maNV: string;
  tenNV: string;
  thoiDiem: string;
  noiDung: string;
}
export interface PhatTrienData {
  hoSoByMa: Record<string, HoSoPhatTrien>;
  nguyenVongByMa: Record<string, NguyenVong>;
  error: string | null;
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

export function normMa(v: unknown): string {
  return String(v ?? "").trim().replace(/^0+(?=\d)/, "");
}
function clampLevel(v: unknown): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 0;
  return Math.min(5, Math.max(0, n));
}
function vnNowStr(): string {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  let H = g("hour");
  if (H === "24") H = "00";
  return `${g("year")}-${g("month")}-${g("day")} ${H}:${g("minute")}:${g("second")}`;
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

async function appendRow(row: (string | number)[]): Promise<void> {
  if (!SPREADSHEET_ID) throw new Error("Thiếu GOOGLE_SHEETS_SPREADSHEET_ID để lưu Phát triển cá nhân");
  const sheets = client();
  const append = () =>
    sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${TAB}'!A1`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });
  try {
    await append();
  } catch {
    await ensureTab(sheets);
    await append();
  }
}

/** Quản lý ghi/cập nhật hồ sơ phát triển của 1 nhân viên. */
export async function saveHoSo(input: {
  maNV: string; tenNV: string; nguoiCapNhat: string;
  kyNang: number[]; diemManh: string; canCaiThien: string; dinhHuong: string;
}): Promise<void> {
  const lv = KY_NANG.map((_, i) => clampLevel(input.kyNang?.[i]));
  const row: (string | number)[] = [
    vnNowStr(), "ho-so", input.maNV, input.tenNV, input.nguoiCapNhat,
    ...lv,
    input.diemManh.slice(0, 1000), input.canCaiThien.slice(0, 1000), input.dinhHuong.slice(0, 1000),
    "",
  ];
  await appendRow(row);
}

/** Nhân viên gửi/cập nhật nguyện vọng phát triển của chính mình. */
export async function saveNguyenVong(input: {
  maNV: string; tenNV: string; noiDung: string;
}): Promise<void> {
  const row: (string | number)[] = [
    vnNowStr(), "nguyen-vong", input.maNV, input.tenNV, input.tenNV,
    0, 0, 0, 0, 0, 0,
    "", "", "",
    input.noiDung.slice(0, 1000),
  ];
  await appendRow(row);
}

/** Đọc toàn bộ, lấy bản MỚI NHẤT của mỗi (Mã NV, Loại). */
export async function getPhatTrien(): Promise<PhatTrienData> {
  const empty: PhatTrienData = { hoSoByMa: {}, nguyenVongByMa: {}, error: null };
  if (!SPREADSHEET_ID) return { ...empty, error: "Thiếu GOOGLE_SHEETS_SPREADSHEET_ID" };
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
    if (/unable to parse range|not found|requested entity was not found/i.test(msg)) return empty;
    return { ...empty, error: `Không đọc được Phát triển cá nhân: ${msg}` };
  }
  // Tìm header.
  let hdrIdx = -1;
  for (let i = 0; i < Math.min(5, raw.length); i++) {
    const low = (raw[i] ?? []).map((x) => String(x ?? "").trim().toLowerCase());
    if (low.includes("loại") && low.includes("mã nhân viên") && low.includes("điểm mạnh")) { hdrIdx = i; break; }
  }
  if (hdrIdx < 0) return empty;

  const g = (r: unknown[], i: number) => (r[i] != null ? String(r[i]).trim() : "");
  const hoSoByMa: Record<string, HoSoPhatTrien> = {};
  const nguyenVongByMa: Record<string, NguyenVong> = {};
  for (let i = hdrIdx + 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r) continue;
    const ma = normMa(r[C.maNV]);
    if (!ma) continue;
    const loai = g(r, C.loai);
    if (loai === "ho-so") {
      // dòng sau = ghi sau => đè, giữ bản mới nhất.
      hoSoByMa[ma] = {
        maNV: ma,
        tenNV: g(r, C.tenNV),
        nguoiCapNhat: g(r, C.nguoiCapNhat),
        thoiDiem: g(r, C.thoiDiem),
        kyNang: KY_NANG.map((_, k) => clampLevel(r[C.kyNang0 + k])),
        diemManh: g(r, C.diemManh),
        canCaiThien: g(r, C.canCaiThien),
        dinhHuong: g(r, C.dinhHuong),
      };
    } else if (loai === "nguyen-vong") {
      nguyenVongByMa[ma] = {
        maNV: ma,
        tenNV: g(r, C.tenNV),
        thoiDiem: g(r, C.thoiDiem),
        noiDung: g(r, C.noiDung),
      };
    }
  }
  return { hoSoByMa, nguyenVongByMa, error: null };
}
