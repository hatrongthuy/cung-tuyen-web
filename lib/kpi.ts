import { google } from "googleapis";

// Spreadsheet KPI riêng (khác với spreadsheet cung tuyến chính) — đọc trực tiếp bằng
// service account sẵn có của app (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY).
//
// LƯU Ý QUAN TRỌNG: file KPI này PHẢI được Share (Chia sẻ) quyền "Viewer" cho email
// service account ở trên — giống như đã làm với file cung tuyến chính. Nếu chưa share,
// mọi tab KPI + Doanh số sẽ trống (không đọc được). Có thể đổi ID qua biến môi trường
// GOOGLE_SHEETS_KPI_SPREADSHEET_ID; nếu không đặt sẽ dùng giá trị mặc định dưới đây.
// Nguồn KPI: file công ty (ASM) đang cập nhật "Kpis T9 2026 PS Tây Bắc" — đã điền cột Thực hiện/Điểm.
// (File cũ 1dv0q chỉ có Kế hoạch, các mục "theo sheet" = 0.) Có thể ghi đè bằng biến môi trường.
const KPI_SPREADSHEET_ID =
  process.env.GOOGLE_SHEETS_KPI_SPREADSHEET_ID || "1xtgnuS1JrN5l6DrNJEqnleGQfDCPqnRMCCQJBsOHMU0";
// File KPI THÁNG 10 (bản mới) — tên tab & vị trí tiêu đề khác file cũ.
const KPI_SPREADSHEET_ID_T10 =
  process.env.GOOGLE_SHEETS_KPI_T10_SPREADSHEET_ID || "1yegEG6DkHWG5gPMRjEkFD3RJ1kRUPK5HiMLJMZCDjn0";

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

async function getRawValues(sheetName: string, spreadsheetId: string = KPI_SPREADSHEET_ID): Promise<string[][]> {
  const sheets = google.sheets({ version: "v4", auth: getAuth() });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  return (res.data.values as string[][] | undefined) ?? [];
}

/** Một số tab (vd "Doanh so T9") có kèm theo các cột tổng hợp/tham chiếu đã bị ẩn (hidden columns)
 * dùng nội bộ trong sheet — không nên hiển thị lẫn với dữ liệu chính cho người dùng. Hàm này lấy
 * danh sách chỉ số cột đang bị ẩn (ẩn tay) để loại ra khi build bảng hiển thị. */
async function getHiddenColumnIndexes(sheetName: string, spreadsheetId: string = KPI_SPREADSHEET_ID): Promise<Set<number>> {
  const sheets = google.sheets({ version: "v4", auth: getAuth() });
  const hidden = new Set<number>();
  try {
    const res = await sheets.spreadsheets.get({
      spreadsheetId,
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

// Tab của FILE KPI THÁNG 10 (bản mới) — tên tab & vị trí tiêu đề đã đổi; 2 tab "Doanh so"/"Khung DS"
// trong file mới đang lỗi (#REF) nên không liệt kê ở đây để tránh hiển thị lỗi.
const KPI_TABS_T10: KpiTabConfig[] = [
  { key: "kpis", label: "KPIs (new)", sheetName: "KPIs (new)", headerRowIndex: 1, dataStartIndex: 3, teamColumn: "Nhóm SS" },
  { key: "code-moi", label: "Code mới", sheetName: "Code moi", headerRowIndex: 0, dataStartIndex: 1, teamColumn: "Nhóm SS" },
  { key: "miniapp", label: "Zalo / Miniapp", sheetName: "Nhóm Zalo", headerRowIndex: 0, dataStartIndex: 1, teamColumn: "Nhóm SS" },
  { key: "mo-moi-sptt", label: "Mở mới SPTT", sheetName: "Momoi SPTT", headerRowIndex: 0, dataStartIndex: 1, teamColumn: "Nhóm SS" },
  { key: "duy-tri-sptt", label: "Duy trì SPTT", sheetName: "Duytri SPTT", headerRowIndex: 0, dataStartIndex: 2, teamColumn: "Nhóm SS" },
  { key: "mo-moi-cap-2", label: "Mở mới SP Cấp 2", sheetName: "Momoi SP2", headerRowIndex: 0, dataStartIndex: 2, teamColumn: "Nhóm SS" },
  { key: "duy-tri-cap-2", label: "Duy trì SP cấp 2", sheetName: "Duytri SP2", headerRowIndex: 0, dataStartIndex: 2, teamColumn: "Nhóm SS" },
  { key: "tuyen-dung", label: "Tuyển dụng", sheetName: "Tuyen dung", headerRowIndex: 0, dataStartIndex: 1, teamColumn: "Nhóm SS" },
];

/** Chọn nguồn KPI theo tháng: từ 10/2026 dùng file mới (tab khác), trước đó dùng file cũ. */
function pickKpiSource(nam: number, thang: number): { spreadsheetId: string; tabs: KpiTabConfig[] } {
  const useNew = nam > 2026 || (nam === 2026 && thang >= 10);
  return useNew
    ? { spreadsheetId: KPI_SPREADSHEET_ID_T10, tabs: KPI_TABS_T10 }
    : { spreadsheetId: KPI_SPREADSHEET_ID, tabs: KPI_TABS };
}

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

/** Ô ngày trong Google Sheets đọc dạng UNFORMATTED_VALUE trả về SỐ SERIAL (số ngày kể từ
 * 30/12/1899), vd 45778. Với các cột "Ngày ..." ta đổi số serial này thành chuỗi dd/MM/yyyy để
 * hiển thị đúng thay vì con số khó hiểu. Chỉ đổi khi giá trị nằm trong khoảng serial hợp lý
 * (~1994–2079) để không nhầm với các số đếm (vd "Tháng làm việc"). */
function isDateColumn(name: string): boolean {
  return /ng[àa]y/i.test(name || "");
}
function serialToDateStr(v: unknown): string | null {
  const n = typeof v === "number" ? v : Number(String(v ?? "").trim().replace(/,/g, ""));
  if (!Number.isFinite(n) || n < 34700 || n > 65500) return null; // ~1995-01-01 .. ~2079
  const ms = Math.round((n - 25569) * 86400 * 1000);
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  const p = (x: number) => String(x).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
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

async function readKpiTab(tab: KpiTabConfig, spreadsheetId: string = KPI_SPREADSHEET_ID): Promise<KpiTabData> {
  let raw: string[][];
  let hidden: Set<number>;
  try {
    [raw, hidden] = await Promise.all([getRawValues(tab.sheetName, spreadsheetId), getHiddenColumnIndexes(tab.sheetName, spreadsheetId)]);
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
      const rawCell = row[srcIdx];
      // Cột ngày: đổi số serial -> dd/MM/yyyy (nếu là serial hợp lệ), còn lại giữ nguyên.
      if (isDateColumn(col)) {
        const dstr = serialToDateStr(rawCell);
        obj[col] = dstr ?? cellToString(rawCell);
      } else {
        obj[col] = cellToString(rawCell);
      }
    });
    rows.push(obj);
  }
  return { columns: columns.filter(Boolean), rows, error: null };
}

/** So khớp giá trị cột Nhóm SS với 1 tên nhóm hoặc danh sách nhiều tên nhóm (scope Tây Bắc). */
function matchesTeamName(cellValue: string, teamName: string | string[]): boolean {
  const v = (cellValue ?? "").trim().toLowerCase();
  if (Array.isArray(teamName)) return teamName.some((t) => t.trim().toLowerCase() === v);
  return teamName.trim().toLowerCase() === v;
}

/** Đọc dữ liệu 1 tab KPI, đã lọc theo Nhóm SS (mặc định: chỉ nhóm của trưởng nhóm truyền vào;
 *  truyền mảng tên nhóm để lấy dữ liệu gộp nhiều nhóm — dùng cho scope Tây Bắc). */
export async function getKpiTabData(tabKey: string, teamName: string | string[]): Promise<KpiTabData> {
  const tab = KPI_TABS.find((t) => t.key === tabKey);
  if (!tab) return { columns: [], rows: [], error: `Không tìm thấy tab KPI "${tabKey}".` };
  const data = await readKpiTab(tab);
  if (data.error) return data;
  const rows = data.rows.filter((r) => matchesTeamName(r[tab.teamColumn] ?? "", teamName));
  return { columns: data.columns, rows, error: null };
}

export interface AllKpiResult {
  dataByTab: Record<string, KpiTabData>;
  /** Lỗi chung (nếu có tab nào đọc thất bại — thường do chưa share file cho service account). */
  error: string | null;
  serviceAccountEmail: string;
  /** Danh sách tab tương ứng tháng đang xem (để hiển thị đúng nhãn). */
  tabs: { key: string; label: string }[];
  /** Nhãn tháng nguồn (MM/yyyy) — cho biết đang đọc file tháng nào. */
  sourceLabel: string;
}

/** Đọc dữ liệu tất cả các tab KPI cùng lúc, đã lọc theo Nhóm SS.
 *  Theo tháng (nam, thang): từ 10/2026 đọc file KPI mới; mặc định = tháng hiện tại. */
export async function getAllKpiTabsData(
  teamName: string | string[],
  nam?: number,
  thang?: number
): Promise<AllKpiResult> {
  const now = new Date();
  const y = nam ?? now.getFullYear();
  const m = thang ?? now.getMonth() + 1;
  const { spreadsheetId, tabs } = pickKpiSource(y, m);
  const entries = await Promise.all(
    tabs.map(async (tab) => {
      const data = await readKpiTab(tab, spreadsheetId);
      if (data.error) return [tab.key, data] as const;
      const rows = data.rows.filter((r) => matchesTeamName(r[tab.teamColumn] ?? "", teamName));
      return [tab.key, { columns: data.columns, rows, error: null }] as const;
    })
  );
  const dataByTab = Object.fromEntries(entries);
  const firstError = entries.map(([, d]) => d.error).find((e): e is string => !!e) ?? null;
  return {
    dataByTab,
    error: firstError,
    serviceAccountEmail: getKpiServiceAccountEmail(),
    tabs: tabs.map((t) => ({ key: t.key, label: t.label })),
    sourceLabel: `${String(m).padStart(2, "0")}/${y}`,
  };
}
