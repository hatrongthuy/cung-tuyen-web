import { google } from "googleapis";

// Spreadsheet KPI riêng (khác với spreadsheet cung tuyến chính) — đọc trực tiếp bằng
// service account sẵn có của app (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY).
//
// LƯU Ý QUAN TRỌNG: file KPI này PHẢI được Share (Chia sẻ) quyền "Viewer" cho email
// service account ở trên — giống như đã làm với file cung tuyến chính. Nếu chưa share,
// mọi tab KPI + Doanh số sẽ trống (không đọc được). Có thể đổi ID qua biến môi trường
// GOOGLE_SHEETS_KPI_SPREADSHEET_ID; nếu không đặt sẽ dùng giá trị mặc định dưới đây.
const KPI_SPREADSHEET_ID =
  process.env.GOOGLE_SHEETS_KPI_SPREADSHEET_ID || "1dv0q_SpajvhbaOtNu43ctwetjXhBUURRIaDVv39W5bw";

export function getKpiServiceAccountEmail(): string {
  return process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "(chưa đặt GOOGLE_SERVICE_ACCOUNT_EMAIL)";
}

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

/** Chuẩn hóa thông điệp lỗi Google API thành câu tiếng Việt dễ hiểu cho người vận hành. */
function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/permission|403|forbidden|not have access|does not have permission/i.test(msg)) {
    return `Không có quyền đọc file KPI. Hãy vào Google Sheet "KPI - Chỉ tiêu tháng" bấm Share (Chia sẻ) và cấp quyền Viewer cho email service account: ${getKpiServiceAccountEmail()}.`;
  }
  if (/not found|404|unable to parse range|requested entity was not found/i.test(msg)) {
    return `Không tìm thấy file hoặc tên tab KPI (kiểm tra lại ID file / tên các tab). Chi tiết: ${msg}`;
  }
  if (/credential|invalid_grant|missing|GOOGLE_SERVICE_ACCOUNT/i.test(msg)) {
    return `Thiếu hoặc sai thông tin service account (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY). Chi tiết: ${msg}`;
  }
  return msg;
}

async function getRawValues(sheetName: string): Promise<string[][]> {
  const sheets = google.sheets({ version: "v4", auth: getAuth() });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: KPI_SPREADSHEET_ID,
    range: `'${sheetName}'`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  return (res.data.values as string[][] | undefined) ?? [];
}

/** Một số tab (vd "Doanh so T9") có kèm theo các cột tổng hợp/tham chiếu đã bị ẩn (hidden columns)
 * dùng nội bộ trong sheet — không nên hiển thị lẫn với dữ liệu chính cho người dùng. Hàm này lấy
 * danh sách chỉ số cột đang bị ẩn (ẩn tay) để loại ra khi build bảng hiển thị. */
async function getHiddenColumnIndexes(sheetName: string): Promise<Set<number>> {
  const sheets = google.sheets({ version: "v4", auth: getAuth() });
  const hidden = new Set<number>();
  try {
    const res = await sheets.spreadsheets.get({
      spreadsheetId: KPI_SPREADSHEET_ID,
      ranges: [`'${sheetName}'`],
      includeGridData: true,
      fields: "sheets(data(columnMetadata(hiddenByUser)))",
    });
    const colMeta = res.data.sheets?.[0]?.data?.[0]?.columnMetadata ?? [];
    colMeta.forEach((c, idx) => {
      if (c.hiddenByUser) hidden.add(idx);
    });
  } catch {
    // Nếu không lấy được metadata (vd lỗi quyền/API tạm thời), coi như không có cột nào bị ẩn.
  }
  return hidden;
}

export interface KpiTabConfig {
  key: string;
  label: string;
  sheetName: string;
  /** Vị trí dòng tiêu đề thực sự trong sheet, 0-based (một số tab có dòng ghi chú/gộp ô phía trên tiêu đề thật) */
  headerRowIndex: number;
  /** Vị trí dòng dữ liệu đầu tiên, 0-based */
  dataStartIndex: number;
  /** Tên cột dùng để lọc theo Nhóm SS — hầu hết là "Nhóm SS", riêng "Doanh so T9" là "SS" */
  teamColumn: string;
}

export const KPI_TABS: KpiTabConfig[] = [
  { key: "kpis", label: "KPIs T09.26 (new)", sheetName: "KPIs T09.26 (new)", headerRowIndex: 0, dataStartIndex: 2, teamColumn: "Nhóm SS" },
  { key: "doanh-so", label: "Doanh so T9", sheetName: "Doanh so T9", headerRowIndex: 2, dataStartIndex: 3, teamColumn: "SS" },
  { key: "code-moi", label: "Code mới", sheetName: "Code mới", headerRowIndex: 0, dataStartIndex: 1, teamColumn: "Nhóm SS" },
  { key: "miniapp", label: "Miniapp", sheetName: "Miniapp", headerRowIndex: 0, dataStartIndex: 1, teamColumn: "Nhóm SS" },
  { key: "mo-moi-sptt", label: "Mở mới SPTT", sheetName: "Mở mới SPTT", headerRowIndex: 1, dataStartIndex: 2, teamColumn: "Nhóm SS" },
  { key: "duy-tri-sptt", label: "Duy trì SPTT", sheetName: "Duy trì SPTT", headerRowIndex: 1, dataStartIndex: 2, teamColumn: "Nhóm SS" },
  { key: "mo-moi-cap-2", label: "Mở mới SP Cấp 2", sheetName: "Mở mới SP Cấp 2", headerRowIndex: 1, dataStartIndex: 2, teamColumn: "Nhóm SS" },
  { key: "duy-tri-cap-2", label: "Duy trì SP cấp 2", sheetName: "Duy trì SP cấp 2", headerRowIndex: 1, dataStartIndex: 2, teamColumn: "Nhóm SS" },
  { key: "tuyen-dung", label: "Tuyen dung", sheetName: "Tuyen dung", headerRowIndex: 0, dataStartIndex: 1, teamColumn: "Nhóm SS" },
];

export interface KpiTabData {
  columns: string[];
  rows: Record<string, string>[];
  /** Thông điệp lỗi (nếu đọc tab thất bại) — null nếu đọc thành công. */
  error: string | null;
}

function cellToString(v: unknown): string {
  if (v === undefined || v === null) return "";
  return String(v);
}

/** Đảm bảo tên cột duy nhất — một số sheet có nhiều cột trùng tên (vd nhiều khối "DS KD-PM" lặp
 * lại chưa đặt tên riêng cho từng cột con). Nếu dùng tên trùng làm khoá object, dữ liệu cột trước sẽ
 * bị cột sau ghi đè mất. Thêm số thứ tự vào các tên trùng để giữ đủ dữ liệu từng cột. */
function dedupeNames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    if (!name) return name;
    const count = (seen.get(name) ?? 0) + 1;
    seen.set(name, count);
    return count === 1 ? name : `${name} (${count})`;
  });
}

async function readKpiTab(tab: KpiTabConfig): Promise<KpiTabData> {
  let raw: string[][];
  let hidden: Set<number>;
  try {
    [raw, hidden] = await Promise.all([getRawValues(tab.sheetName), getHiddenColumnIndexes(tab.sheetName)]);
  } catch (err) {
    return { columns: [], rows: [], error: friendlyError(err) };
  }
  const headerRowRaw = raw[tab.headerRowIndex] ?? [];
  const visibleIdx: number[] = [];
  headerRowRaw.forEach((_, idx) => {
    if (!hidden.has(idx)) visibleIdx.push(idx);
  });
  const columns = dedupeNames(visibleIdx.map((idx) => cellToString(headerRowRaw[idx]).trim()));

  const rows: Record<string, string>[] = [];
  for (let i = tab.dataStartIndex; i < raw.length; i++) {
    const row = raw[i];
    if (!row || row.every((c) => cellToString(c).trim() === "")) continue;
    const obj: Record<string, string> = {};
    visibleIdx.forEach((srcIdx, colPos) => {
      const col = columns[colPos];
      if (!col) return;
      obj[col] = cellToString(row[srcIdx]);
    });
    rows.push(obj);
  }
  return { columns: columns.filter(Boolean), rows, error: null };
}

/** Đọc dữ liệu 1 tab KPI, đã lọc theo Nhóm SS (mặc định: chỉ nhóm của trưởng nhóm truyền vào). */
export async function getKpiTabData(tabKey: string, teamName: string): Promise<KpiTabData> {
  const tab = KPI_TABS.find((t) => t.key === tabKey);
  if (!tab) return { columns: [], rows: [], error: `Không tìm thấy tab KPI "${tabKey}".` };
  const data = await readKpiTab(tab);
  if (data.error) return data;
  const teamTrim = teamName.trim();
  const rows = data.rows.filter((r) => (r[tab.teamColumn] ?? "").trim() === teamTrim);
  return { columns: data.columns, rows, error: null };
}

export interface AllKpiResult {
  dataByTab: Record<string, KpiTabData>;
  /** Lỗi chung (nếu có tab nào đọc thất bại — thường do chưa share file cho service account). */
  error: string | null;
  serviceAccountEmail: string;
}

/** Đọc dữ liệu tất cả các tab KPI cùng lúc, đã lọc theo Nhóm SS. */
export async function getAllKpiTabsData(teamName: string): Promise<AllKpiResult> {
  const teamTrim = teamName.trim();
  const entries = await Promise.all(
    KPI_TABS.map(async (tab) => {
      const data = await readKpiTab(tab);
      if (data.error) return [tab.key, data] as const;
      const rows = data.rows.filter((r) => (r[tab.teamColumn] ?? "").trim() === teamTrim);
      return [tab.key, { columns: data.columns, rows, error: null }] as const;
    })
  );
  const dataByTab = Object.fromEntries(entries);
  // Lấy lỗi đầu tiên gặp được (nếu có) làm lỗi chung để hiển thị banner cảnh báo.
  const firstError = entries.map(([, d]) => d.error).find((e): e is string => !!e) ?? null;
  return { dataByTab, error: firstError, serviceAccountEmail: getKpiServiceAccountEmail() };
}
