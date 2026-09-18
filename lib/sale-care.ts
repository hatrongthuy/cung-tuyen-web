import { google } from "googleapis";
import { getSaleDetailData } from "./sale-detail";
import { buildCareByEmp, type CareItem } from "./report-utils";

// Mở rộng nguồn "Gợi ý cung tuyến tự động":
//  1) 3 sheet cảnh báo (khách chết / chưa viếng thăm / sản phẩm nghỉ) — qua buildCareByEmp.
//  2) KHÁCH ĐI ẮNG từ file Sale — khách mà CHÍNH nhân viên đó từng bán nhưng lâu chưa phát sinh đơn.
//  3) KHÁCH KẾ THỪA — nhân viên tiếp nhận toàn bộ khách của một nhân viên đã nghỉ (VD: Hoàng Văn
//     Cường tiếp nhận khách của Lê Tiến Duy).

const BASE_DATE = "2025-01-01";
// Ngưỡng "đi ắng": lâu hơn số ngày này không phát sinh đơn thì gợi ý gặp lại.
const NGUONG_NGAY = 45;

// Cấu hình kế thừa khách: nhân viên (mã đã bỏ số 0 đầu) tiếp nhận toàn bộ khách của người đã nghỉ.
const KE_THUA: { successorTen: string; predecessors: { ma: string; ten: string }[] }[] = [
  { successorTen: "Hoàng Văn Cường", predecessors: [{ ma: "19637", ten: "Lê Tiến Duy" }] },
];

const SALES_SPREADSHEET_ID =
  process.env.GOOGLE_SHEETS_SALES_SPREADSHEET_ID || "19CNg5Q38a7tAyNR8NSY6-E5U1Q1kqdhsblftGuGDsdU";
const SALES_TAB = process.env.GOOGLE_SHEETS_SALES_TAB || "Sale sạch";

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  return new google.auth.JWT({ email, key, scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"] });
}

function normalizeMaNV(v: unknown): string {
  return String(v ?? "").trim().replace(/^0+(?=\d)/, "");
}

function toDateMs(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) {
    const ms = Math.round((v - 25569) * 86400 * 1000);
    return Number.isFinite(ms) ? ms : null;
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime();
  const m2 = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m2) return new Date(Number(m2[1]), Number(m2[2]) - 1, Number(m2[3])).getTime();
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

function parseMoneyNum(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function deXuat(soNgay: number, dt: number) {
  let soLan = 2;
  if (soNgay >= 120) soLan += 1;
  if (soNgay >= 240) soLan += 1;
  soLan = Math.min(soLan, 5);
  const caoGiaTri = dt >= 50_000_000;
  const soTuan = caoGiaTri ? Math.max(2, Math.ceil(soLan / 2)) : soLan;
  return { soLan, soTuan, caoGiaTri };
}

/** Khách đi ắng từ file Sale, gom theo TÊN nhân viên (người từng bán cho khách đó). */
async function buildSaleCareByEmp(nowMs: number): Promise<Record<string, CareItem[]>> {
  const data = await getSaleDetailData();
  if (data.error) return {};

  const baseMs = new Date(BASE_DATE + "T00:00:00").getTime();
  const C = { cid: 0, tid: 1, pid: 2, di: 3, sl: 4, dt: 5 };

  const agg = new Map<string, { tid: number; cid: number; lastDi: number; dt: number }>();
  for (const row of data.rows) {
    const tid = row[C.tid];
    const cid = row[C.cid];
    const di = row[C.di];
    const dt = row[C.dt];
    const key = `${tid}|${cid}`;
    const cur = agg.get(key);
    if (!cur) agg.set(key, { tid, cid, lastDi: di, dt });
    else {
      if (di > cur.lastDi) cur.lastDi = di;
      cur.dt += dt;
    }
  }

  const out: Record<string, CareItem[]> = {};
  for (const { tid, cid, lastDi, dt } of agg.values()) {
    const lastMs = baseMs + lastDi * 86400000;
    const soNgay = Math.round((nowMs - lastMs) / 86400000);
    if (soNgay < NGUONG_NGAY) continue;

    const ten = data.tdv[tid];
    if (!ten) continue;
    const cust = data.cust[cid];
    const { soLan, soTuan, caoGiaTri } = deXuat(soNgay, dt);
    (out[ten] ||= []).push({
      tenKhach: cust?.[1] ?? "",
      tinh: cust?.[2] ?? "",
      hang: "",
      loai: "sale-ang" as CareItem["loai"],
      soNgay,
      doanhThu12T: dt,
      chiTiet: `${soNgay} ngày chưa phát sinh đơn (theo Sale)`,
      deXuatLan: soLan,
      deXuatTuan: soTuan,
      caoGiaTri,
    });
  }
  return out;
}

/** Khách KẾ THỪA: đọc file Sale, lấy TOÀN BỘ khách của các nhân viên đã nghỉ và gán cho người tiếp nhận. */
async function buildInheritCare(nowMs: number): Promise<Record<string, CareItem[]>> {
  // Tập mã người tiền nhiệm cần đọc.
  const predMaToInfo = new Map<string, { predTen: string; successorTen: string }>();
  for (const g of KE_THUA) {
    for (const p of g.predecessors) predMaToInfo.set(normalizeMaNV(p.ma), { predTen: p.ten, successorTen: g.successorTen });
  }
  if (predMaToInfo.size === 0) return {};

  let rows: unknown[][];
  try {
    const sheets = google.sheets({ version: "v4", auth: getAuth() });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SALES_SPREADSHEET_ID,
      range: `'${SALES_TAB}'`,
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    rows = (res.data.values as unknown[][] | undefined) ?? [];
  } catch {
    return {};
  }

  // Tìm dòng tiêu đề.
  let hdrIdx = -1;
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const r = (rows[i] ?? []).map((x) => String(x ?? "").trim().toLowerCase());
    if (r.includes("mã nhân viên") && r.some((c) => c === "doanh thu")) {
      hdrIdx = i;
      break;
    }
  }
  if (hdrIdx < 0) return {};
  const hdr = (rows[hdrIdx] as unknown[]).map((x) => String(x ?? "").trim());
  const col = (name: string) => hdr.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  const iMaNV = col("Mã nhân viên");
  const iMaKH = col("Mã khách hàng thực tế") >= 0 ? col("Mã khách hàng thực tế") : col("Mã khách hàng");
  const iTenKH = col("Tên khách hàng thực tế") >= 0 ? col("Tên khách hàng thực tế") : col("Tên khách hàng");
  const iTinh = col("Tỉnh");
  const iNgay = col("Ngày");
  const iDT = col("Doanh thu");
  if (iMaNV < 0 || iMaKH < 0 || iDT < 0) return {};

  // Gom theo (successorTen, mã KH): khách gần nhất + doanh thu + người tiền nhiệm.
  const agg = new Map<string, { successorTen: string; predTen: string; tenKH: string; tinh: string; lastMs: number | null; dt: number }>();
  for (let i = hdrIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const ma = normalizeMaNV(r[iMaNV]);
    const info = predMaToInfo.get(ma);
    if (!info) continue;
    const maKH = String(r[iMaKH] ?? "").trim();
    if (!maKH) continue;
    const key = `${info.successorTen}|${maKH}`;
    const dateMs = iNgay >= 0 ? toDateMs(r[iNgay]) : null;
    const dt = parseMoneyNum(r[iDT]);
    const cur = agg.get(key);
    if (!cur) {
      agg.set(key, {
        successorTen: info.successorTen,
        predTen: info.predTen,
        tenKH: iTenKH >= 0 ? String(r[iTenKH] ?? "").trim() : "",
        tinh: iTinh >= 0 ? String(r[iTinh] ?? "").trim() : "",
        lastMs: dateMs,
        dt,
      });
    } else {
      cur.dt += dt;
      if (dateMs != null && (cur.lastMs == null || dateMs > cur.lastMs)) cur.lastMs = dateMs;
      if (!cur.tenKH && iTenKH >= 0) cur.tenKH = String(r[iTenKH] ?? "").trim();
    }
  }

  const out: Record<string, CareItem[]> = {};
  for (const v of agg.values()) {
    const soNgay = v.lastMs != null ? Math.max(0, Math.round((nowMs - v.lastMs) / 86400000)) : 999;
    const { soLan, soTuan, caoGiaTri } = deXuat(soNgay, v.dt);
    (out[v.successorTen] ||= []).push({
      tenKhach: v.tenKH || "(không tên)",
      tinh: v.tinh,
      hang: "",
      loai: "ke-thua" as CareItem["loai"],
      soNgay,
      doanhThu12T: v.dt,
      chiTiet: `Kế thừa từ ${v.predTen}${v.lastMs != null ? ` · ${soNgay} ngày chưa có đơn` : ""}`,
      deXuatLan: soLan,
      deXuatTuan: soTuan,
      caoGiaTri,
    });
  }
  return out;
}

const norm = (s: string) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();

/** Danh sách gợi ý cung tuyến hợp nhất: cảnh báo + khách đi ắng từ Sale + khách kế thừa. */
export async function getGoiYCungTuyen(
  chuaVT: Record<string, string>[],
  khChet: Record<string, string>[],
  spNghi: Record<string, string>[],
  nowMs: number
): Promise<Record<string, CareItem[]>> {
  const alert = buildCareByEmp(chuaVT, khChet, spNghi);
  const [sale, inherit] = await Promise.all([buildSaleCareByEmp(nowMs), buildInheritCare(nowMs)]);

  const out: Record<string, CareItem[]> = {};
  const names = new Set<string>([...Object.keys(alert), ...Object.keys(sale), ...Object.keys(inherit)]);
  for (const ten of names) {
    const combined: CareItem[] = [];
    const seen = new Set<string>();
    for (const src of [alert[ten] ?? [], sale[ten] ?? [], inherit[ten] ?? []]) {
      for (const it of src) {
        const k = norm(it.tenKhach);
        if (!it.tenKhach || seen.has(k)) continue;
        seen.add(k);
        combined.push(it);
      }
    }
    out[ten] = combined;
  }
  return out;
}
