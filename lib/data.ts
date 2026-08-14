import { readSheetAsObjects } from "./sheets";
import {
  SHEET_NAMES,
  type GoiYTapTrungRow,
  type DanhGiaCungTuyenRow,
  type CanhBaoChuaViengThamRow,
  type CanhBaoKhachChetRow,
  type CanhBaoSanPhamNghiRow,
  type XacNhanGoiYRow,
  type DanhSachNhanVienRow,
  type TroChuyenRow,
} from "./sheets-schema";

// Chuẩn hóa mã nhân viên (bỏ số 0 ở đầu) để so khớp — Google Sheets có lúc trả mã dưới
// dạng chuỗi "017886", có lúc trả dưới dạng số 17886. Áp dụng cùng cách chuẩn hóa mà
// n8n workflow đang dùng (xem docs/data-schema.md).
export function chuanHoaMaNV(v: string | number | null | undefined): string {
  return String(v ?? "").trim().replace(/^0+(?=\d)/, "");
}

export async function getGoiYTapTrung(): Promise<GoiYTapTrungRow[]> {
  return readSheetAsObjects<GoiYTapTrungRow>(SHEET_NAMES.goiYTapTrung);
}

export async function getDanhGiaCungTuyen(): Promise<DanhGiaCungTuyenRow[]> {
  return readSheetAsObjects<DanhGiaCungTuyenRow>(SHEET_NAMES.danhGiaCungTuyen);
}

export async function getCanhBaoChuaViengTham(): Promise<CanhBaoChuaViengThamRow[]> {
  return readSheetAsObjects<CanhBaoChuaViengThamRow>(SHEET_NAMES.canhBaoChuaViengTham);
}

export async function getCanhBaoKhachChet(): Promise<CanhBaoKhachChetRow[]> {
  return readSheetAsObjects<CanhBaoKhachChetRow>(SHEET_NAMES.canhBaoKhachChet);
}

export async function getCanhBaoSanPhamNghi(): Promise<CanhBaoSanPhamNghiRow[]> {
  return readSheetAsObjects<CanhBaoSanPhamNghiRow>(SHEET_NAMES.canhBaoSanPhamNghi);
}

export async function getXacNhanGoiY(): Promise<XacNhanGoiYRow[]> {
  return readSheetAsObjects<XacNhanGoiYRow>(SHEET_NAMES.xacNhanGoiY);
}

export async function getDanhSachNhanVien(): Promise<DanhSachNhanVienRow[]> {
  return readSheetAsObjects<DanhSachNhanVienRow>(SHEET_NAMES.danhSachNhanVien);
}

export async function getTroChuyen(): Promise<TroChuyenRow[]> {
  return readSheetAsObjects<TroChuyenRow>(SHEET_NAMES.troChuyen);
}

// ---------- Tiện ích xử lý cột "Tuần" (dạng "dd/MM/yyyy - dd/MM/yyyy") ----------

export function parseWeekStart(tuan: string): Date | null {
  const m = tuan.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

export function latestWeekLabel(rows: { Tuần: string }[]): string | null {
  let best: { label: string; start: Date } | null = null;
  for (const r of rows) {
    const start = parseWeekStart(r["Tuần"]);
    if (!start) continue;
    if (!best || start > best.start) best = { label: r["Tuần"], start };
  }
  return best?.label ?? null;
}

export function sortWeeksAscending<T extends { Tuần: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const da = parseWeekStart(a["Tuần"])?.getTime() ?? 0;
    const db = parseWeekStart(b["Tuần"])?.getTime() ?? 0;
    return da - db;
  });
}
