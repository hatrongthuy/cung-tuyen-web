import { google } from "googleapis";

// Spreadsheet KPI riêng (khác với spreadsheet cung tuyến chính) — đọc trực tiếp bằng
// service account sẵn có của app (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY).
const KPI_SPREADSHEET_ID = "1Yd2bHhWEbEKh68PFuL7GqPGD1pAW14SxkGZNp5lELD4";

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
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

export interface KpiTabConfig {
  key: string;
  label: string;
  sheetName: string;
  /** Vị trí dòng tiêu đề thực sự trong sheet, 0-based (một số tab có dòng ghi chú/gộp ô phía trên tiêu đề thật) */
  headerRowIndex: number;
  /** Vị trí dòng dữ liệu đầu tiên, 0-based */
  dataStartIndex: number;
  /** Tên cột dùng để lọc theo Nhóm SS — hầu hết là "Nhóm SS", riêng "Doanh so T8" là "SS" */
  teamColumn: string;
}

export const KPI_TABS: KpiTabConfig[] = [
  { key: "kpis", label: "KPIs T08.26 (new)", sheetName: "KPIs T08.26 (new)", headerRowIndex: 0, dataStartIndex: 2, teamColumn: "Nhóm SS" },
  { key: "doanh-so", label: "Doanh so T8", sheetName: "Doanh so T8", headerRowIndex: 2, dataStartIndex: 3, teamColumn: "SS" },
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
}

function cellToString(v: unknown): string {
  if (v === undefined || v === null) return "";
  return String(v);
}

async function readKpiTab(tab: KpiTabConfig): Promise<KpiTabData> {
  let raw: string[][];
  try {
    raw = await getRawValues(tab.sheetName);
  } catch {
    return { columns: [], rows: [] };
  }
  const headerRow = raw[tab.headerRowIndex] ?? [];
  const columns = headerRow.map((h) => cellToString(h).trim());
  const rows: Record<string, string>[] = [];
  for (let i = tab.dataStartIndex; i < raw.length; i++) {
    const row = raw[i];
    if (!row || row.every((c) => cellToString(c).trim() === "")) continue;
    const obj: Record<string, string> = {};
    columns.forEach((col, idx) => {
      if (!col) return;
      obj[col] = cellToString(row[idx]);
    });
    rows.push(obj);
  }
  return { columns: columns.filter(Boolean), rows };
}

/** Đọc dữ liệu 1 tab KPI, đã lọc theo Nhóm SS (mặc định: chỉ nhóm của trưởng nhóm truyền vào). */
export async function getKpiTabData(tabKey: string, teamName: string): Promise<KpiTabData> {
  const tab = KPI_TABS.find((t) => t.key === tabKey);
  if (!tab) return { columns: [], rows: [] };
  const data = await readKpiTab(tab);
  const teamTrim = teamName.trim();
  const rows = data.rows.filter((r) => (r[tab.teamColumn] ?? "").trim() === teamTrim);
  return { columns: data.columns, rows };
}

/** Đọc dữ liệu tất cả các tab KPI cùng lúc, đã lọc theo Nhóm SS. */
export async function getAllKpiTabsData(teamName: string): Promise<Record<string, KpiTabData>> {
  const teamTrim = teamName.trim();
  const entries = await Promise.all(
    KPI_TABS.map(async (tab) => {
      const data = await readKpiTab(tab);
      const rows = data.rows.filter((r) => (r[tab.teamColumn] ?? "").trim() === teamTrim);
      return [tab.key, { columns: data.columns, rows }] as const;
    })
  );
  return Object.fromEntries(entries);
}
