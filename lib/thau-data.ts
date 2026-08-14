import { readSheetAsObjects } from "./sheets";
import { THAU_SPREADSHEET_ID, THAU_TAB_NAME, THAU_RANGE, type ThauRow } from "./thau-schema";

export async function getBaoCaoThau(): Promise<ThauRow[]> {
  return readSheetAsObjects<ThauRow>(THAU_TAB_NAME, {
    spreadsheetId: THAU_SPREADSHEET_ID,
    range: THAU_RANGE,
  });
}

// ---------- Tiện ích parse dữ liệu thô từ Sheets ----------

/** Google Sheets lưu ngày dạng "serial number" (số ngày kể từ 30/12/1899). */
export function excelSerialToDate(serial: string | number | null | undefined): Date | null {
  const n = Number(serial);
  if (!n || Number.isNaN(n)) return null;
  const ms = Math.round((n - 25569) * 86400 * 1000);
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function parseNum(v: string | number | null | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Số tháng (lẻ) từ `from` đến `to` — số dương nếu `to` sau `from`. */
export function monthsBetween(from: Date, to: Date): number {
  const days = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
  return days / 30.44;
}

export function formatDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("vi-VN");
}

// ---------- Gom nhóm theo khách hàng (chi tiết sản phẩm) ----------

export interface SanPhamThau {
  maHang: string;
  tenMatHang: string;
  tenHoatChat: string;
  slKeHoach: number;
  slThucHien: number;
  slConLai: number;
  tyLeThucHien: number; // 0..1
  doanhSoConLai: number;
}

export interface KhachThau {
  maKhach: string;
  tenKhach: string;
  tinh: string;
  soHopDong: string[];
  ngayBatDauGanNhat: Date | null;
  ngayHetHanGanNhat: Date | null;
  soThangConLaiMin: number | null;
  tongDoanhSoConLai: number;
  sanPham: SanPhamThau[];
}

export function groupByCustomer(rows: ThauRow[]): KhachThau[] {
  const map = new Map<string, KhachThau>();

  for (const r of rows) {
    const maKhach = r["Mã khách"]?.trim();
    if (!maKhach) continue;

    let kh = map.get(maKhach);
    if (!kh) {
      kh = {
        maKhach,
        tenKhach: r["Tên khách"],
        tinh: r["Tỉnh"],
        soHopDong: [],
        ngayBatDauGanNhat: null,
        ngayHetHanGanNhat: null,
        soThangConLaiMin: null,
        tongDoanhSoConLai: 0,
        sanPham: [],
      };
      map.set(maKhach, kh);
    }

    const soHD = r["m"]?.trim();
    if (soHD && !kh.soHopDong.includes(soHD)) kh.soHopDong.push(soHD);

    const batDau = excelSerialToDate(r["Ngày bắt đầu hiệu lực"]);
    if (batDau && (!kh.ngayBatDauGanNhat || batDau > kh.ngayBatDauGanNhat)) {
      kh.ngayBatDauGanNhat = batDau;
    }
    const hetHan = excelSerialToDate(r["Ngày hết hiệu lực"]);
    if (hetHan && (!kh.ngayHetHanGanNhat || hetHan < kh.ngayHetHanGanNhat)) {
      // Lấy hạn GẦN NHẤT (sớm nhất) trong các gói thầu của khách — đây là mốc cần lưu ý trước.
      kh.ngayHetHanGanNhat = hetHan;
    }

    const soThang = Number(r["Số tháng còn lại của gói thầu"]);
    if (Number.isFinite(soThang)) {
      kh.soThangConLaiMin =
        kh.soThangConLaiMin === null ? soThang : Math.min(kh.soThangConLaiMin, soThang);
    }

    const doanhSoConLai = parseNum(r["Doanh số còn lại"]);
    kh.tongDoanhSoConLai += doanhSoConLai;

    kh.sanPham.push({
      maHang: r["Mã hàng"],
      tenMatHang: r["Tên mặt hàng"],
      tenHoatChat: r["Tên hoạt chất"],
      slKeHoach: parseNum(r["SL kế hoạch"]),
      slThucHien: parseNum(r["SL thực hiện"]),
      slConLai: parseNum(r["SL còn lại (SL chênh lệch)"]),
      tyLeThucHien: parseNum(r["Tỷ lệ phần trăm thực hiện"]),
      doanhSoConLai,
    });
  }

  return [...map.values()].sort((a, b) => b.tongDoanhSoConLai - a.tongDoanhSoConLai);
}

// ---------- Cảnh báo: gói thầu sắp hết hiệu lực ----------

export interface CanhBaoHetHanThau {
  maKhach: string;
  tenKhach: string;
  tinh: string;
  soHopDong: string;
  ngayHetHieuLuc: Date | null;
  soThangConLai: number;
  tenMatHangs: string[];
}

/**
 * Gom theo (Mã khách + Số hợp đồng) — mỗi gói thầu có nhiều dòng sản phẩm nhưng chung 1 ngày
 * hết hiệu lực, chỉ cần cảnh báo 1 lần mỗi gói. Ngưỡng mặc định: dưới 6 tháng còn lại (bao gồm
 * cả gói đã hết hạn, soThangConLai <= 0).
 */
export function getCanhBaoHetHanThau(
  rows: ThauRow[],
  thresholdMonths = 6
): CanhBaoHetHanThau[] {
  const map = new Map<string, CanhBaoHetHanThau>();
  const now = new Date();

  for (const r of rows) {
    const maKhach = r["Mã khách"]?.trim();
    const soHopDong = r["m"]?.trim();
    if (!maKhach || !soHopDong) continue;

    const key = `${maKhach}__${soHopDong}`;
    const hetHan = excelSerialToDate(r["Ngày hết hiệu lực"]);

    // Ưu tiên tính lại số tháng còn lại từ chính ngày hết hiệu lực (độc lập với "mốc thời gian"
    // tĩnh có thể đã cũ trong sheet gốc), để luôn khớp với ngày thực tế lúc xem trang web.
    const soThangConLai = hetHan ? monthsBetween(now, hetHan) : Number(r["Số tháng còn lại của gói thầu"]) || 0;

    let item = map.get(key);
    if (!item) {
      item = {
        maKhach,
        tenKhach: r["Tên khách"],
        tinh: r["Tỉnh"],
        soHopDong,
        ngayHetHieuLuc: hetHan,
        soThangConLai,
        tenMatHangs: [],
      };
      map.set(key, item);
    }
    if (r["Tên mặt hàng"] && !item.tenMatHangs.includes(r["Tên mặt hàng"])) {
      item.tenMatHangs.push(r["Tên mặt hàng"]);
    }
  }

  return [...map.values()]
    .filter((x) => x.soThangConLai < thresholdMonths)
    .sort((a, b) => a.soThangConLai - b.soThangConLai);
}

// ---------- Cảnh báo: khách hàng lâu chưa gọi thầu mới ----------

export interface CanhBaoLauChuaGoiThau {
  maKhach: string;
  tenKhach: string;
  tinh: string;
  ngayBatDauGanNhat: Date | null;
  soThangChuaGoiMoi: number;
}

/**
 * Với mỗi khách hàng, lấy ngày BẮT ĐẦU HIỆU LỰC gần nhất trong toàn bộ các gói thầu của họ —
 * đây là lần gần nhất khách "gọi thầu mới". Nếu đã quá `thresholdMonths` tháng kể từ đó, đưa
 * vào danh sách cảnh báo.
 */
export function getCanhBaoLauChuaGoiThau(
  rows: ThauRow[],
  thresholdMonths = 6
): CanhBaoLauChuaGoiThau[] {
  const khachs = groupByCustomer(rows);
  const now = new Date();

  return khachs
    .map((kh) => ({
      maKhach: kh.maKhach,
      tenKhach: kh.tenKhach,
      tinh: kh.tinh,
      ngayBatDauGanNhat: kh.ngayBatDauGanNhat,
      soThangChuaGoiMoi: kh.ngayBatDauGanNhat ? monthsBetween(kh.ngayBatDauGanNhat, now) : Infinity,
    }))
    .filter((x) => x.soThangChuaGoiMoi > thresholdMonths)
    .sort((a, b) => b.soThangChuaGoiMoi - a.soThangChuaGoiMoi);
}

export function distinctTinh(rows: ThauRow[]): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    if (r["Tỉnh"]) set.add(r["Tỉnh"]);
  }
  return [...set].sort();
}
