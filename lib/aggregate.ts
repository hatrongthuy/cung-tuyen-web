import { allEmployees } from "./allowlist";
import { chuanHoaMaNV, latestWeekLabel, parseWeekStart } from "./data";
import type {
  DanhGiaCungTuyenRow,
  GoiYTapTrungRow,
  XacNhanGoiYRow,
} from "./sheets-schema";

export interface KhachGoiY {
  maKH: string;
  tenKH: string;
  diaChi: string;
  tinh: string;
  nhomKH: string;
  hang: string;
  thuTuUuTien: string;
  mucTieu: string;
  /** "Đồng ý" | "Không đồng ý" | undefined (chưa phản hồi) */
  trangThai?: string;
}

export interface EmployeeWeekSummary {
  maNhanVien: string;
  hoTen: string;
  soGoiY: number;
  soDaXacNhan: number; // đã trả lời (đồng ý hoặc không đồng ý)
  soDongY: number; // đã gặp / đồng ý
  tyLeHoanThanh: number; // soDongY / soGoiY, 0..1
  diemCungTuyen: number | null; // Tổng điểm cung tuyến tuần hiện tại (nếu có)
  khachGoiY: KhachGoiY[]; // danh sách khách hàng cụ thể được gợi ý cho nhân viên này tuần này
}

/** Xác định tuần hiện tại đang xử lý (dùng nhãn tuần mới nhất xuất hiện trong
 * "Đánh giá cung tuyến tuần" làm chuẩn chung cho cả gợi ý & xác nhận, vì cả 2 quy trình
 * chạy chung 1 lần vào thứ 7 20h hàng tuần). */
export function getCurrentWeekLabel(danhGia: DanhGiaCungTuyenRow[]): string | null {
  return latestWeekLabel(danhGia);
}

export function getWeekDateRange(label: string | null): { start: Date; end: Date } | null {
  if (!label) return null;
  const start = parseWeekStart(label);
  if (!start) return null;
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function parseThoiGian(v: string): Date | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  // Dạng chuỗi "yyyy-MM-dd HH:mm:ss"
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (m) {
    return new Date(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      Number(m[4]),
      Number(m[5]),
      Number(m[6])
    );
  }
  // Dạng SỐ SERIAL của Google Sheets (khi đọc UNFORMATTED_VALUE, ô ngày-giờ trả về số ngày
  // kể từ 30/12/1899, phần thập phân là giờ). Đây là lý do trước đây xác nhận không hiện:
  // "Thời gian" bị trả về dạng số nên không parse được chuỗi.
  const num = Number(s);
  if (Number.isFinite(num) && num > 20000 && num < 100000) {
    const ms = Math.round((num - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // Dạng khác (vd "24/08/2026 20:59") — thử Date parse cuối cùng.
  const d2 = new Date(s);
  return Number.isNaN(d2.getTime()) ? null : d2;
}

export function buildEmployeeWeekSummaries(
  goiY: GoiYTapTrungRow[],
  xacNhan: XacNhanGoiYRow[],
  danhGia: DanhGiaCungTuyenRow[]
): { weekLabel: string | null; summaries: EmployeeWeekSummary[] } {
  const weekLabel = getCurrentWeekLabel(danhGia);
  const range = getWeekDateRange(weekLabel);

  // CHỈ chặn mốc DƯỚI (từ đầu tuần đánh giá gần nhất), KHÔNG chặn mốc trên: nhân viên
  // thường bấm xác nhận cho danh sách gợi ý hiện tại SAU khi tuần đánh giá đã chốt (vd bấm
  // ngày 23–25 trong khi tuần đánh giá gần nhất là 16–22). Nếu chặn mốc trên sẽ bỏ sót các
  // xác nhận mới nhất -> hiển thị 0. Trạng thái mỗi khách lấy theo lần bấm MỚI NHẤT (tránh
  // đếm trùng khi 1 khách được bấm nhiều lần).
  const xacNhanGanDay = range
    ? xacNhan.filter((r) => {
        const d = parseThoiGian(r["Thời gian"]);
        return d && d >= range.start;
      })
    : xacNhan;

  const summaries: EmployeeWeekSummary[] = allEmployees().map((emp) => {
    const maChuan = chuanHoaMaNV(emp.maNhanVien);

    const goiYCuaNV = goiY
      .filter((r) => chuanHoaMaNV(r["Mã nhân viên"]) === maChuan)
      .sort((a, b) => Number(a["Thứ tự ưu tiên"]) - Number(b["Thứ tự ưu tiên"]));
    const xacNhanCuaNV = xacNhanGanDay.filter(
      (r) => chuanHoaMaNV(r["Mã nhân viên"]) === maChuan
    );

    // Trạng thái MỚI NHẤT (theo Thời gian) cho từng mã khách hàng.
    const latestByKH = new Map<string, { trangThai: string; t: number }>();
    for (const r of xacNhanCuaNV) {
      const kh = r["Mã khách hàng"];
      if (!kh) continue;
      const t = parseThoiGian(r["Thời gian"])?.getTime() ?? 0;
      const cur = latestByKH.get(kh);
      if (!cur || t >= cur.t) latestByKH.set(kh, { trangThai: r["Trạng thái"], t });
    }

    const diemRow = danhGia.find(
      (r) => chuanHoaMaNV(r["Mã nhân viên"]) === maChuan && r["Tuần"] === weekLabel
    );

    // Đếm dựa trên DANH SÁCH GỢI Ý HIỆN TẠI: mỗi khách được gợi ý đã phản hồi chưa / có đồng ý không.
    let soDaXacNhan = 0;
    let soDongY = 0;
    const khachGoiY: KhachGoiY[] = goiYCuaNV.map((r) => {
      const trangThai = latestByKH.get(r["Mã khách hàng"])?.trangThai;
      if (trangThai) soDaXacNhan++;
      if (trangThai === "Đồng ý") soDongY++;
      return {
        maKH: r["Mã khách hàng"],
        tenKH: r["Tên khách hàng"],
        diaChi: r["Địa chỉ"],
        tinh: r["Tỉnh"],
        nhomKH: r["Nhóm KH"],
        hang: r["Hạng"],
        thuTuUuTien: r["Thứ tự ưu tiên"],
        mucTieu: r["Mục tiêu chuyến thăm"],
        trangThai,
      };
    });

    const soGoiY = goiYCuaNV.length;

    return {
      maNhanVien: emp.maNhanVien!,
      hoTen: emp.hoTen,
      soGoiY,
      soDaXacNhan,
      soDongY,
      tyLeHoanThanh: soGoiY > 0 ? soDongY / soGoiY : 0,
      diemCungTuyen: diemRow ? Number(diemRow["Tổng điểm cung tuyến"]) || 0 : null,
      khachGoiY,
    };
  });

  return { weekLabel, summaries };
}

export interface WeeklyAverageScorePoint {
  tuan: string;
  diemTrungBinh: number;
}

/** Điểm trung bình nhóm theo từng tuần (dùng cho dashboard cấp trên). */
export function averageScoreByWeek(danhGia: DanhGiaCungTuyenRow[]): WeeklyAverageScorePoint[] {
  const map = new Map<string, number[]>();
  for (const r of danhGia) {
    const tuan = r["Tuần"];
    const diem = Number(r["Tổng điểm cung tuyến"]) || 0;
    if (!map.has(tuan)) map.set(tuan, []);
    map.get(tuan)!.push(diem);
  }
  const points = [...map.entries()].map(([tuan, diems]) => ({
    tuan,
    diemTrungBinh: diems.reduce((s, x) => s + x, 0) / diems.length,
  }));
  return points.sort((a, b) => (parseWeekStart(a.tuan)?.getTime() ?? 0) - (parseWeekStart(b.tuan)?.getTime() ?? 0));
}

// ---------- Tồn đọng SO VỚI danh sách gợi ý TUẦN TRƯỚC ----------
// Đọc "Lịch sử gợi ý" (n8n append mỗi tuần, cột "Ngày lập" dd/MM/yyyy). So danh sách gợi ý
// của LẦN GẦN NHẤT TRƯỚC ĐÓ với xác nhận (đã gặp) để biết khách nào tuần trước chưa xử lý.

export interface TonDongNV {
  maNhanVien: string;
  hoTen: string;
  tongTuanTruoc: number;
  khachChuaXuLy: { maKH: string; tenKH: string }[];
}

export interface TonDongTuanTruoc {
  ngayTruoc: string;
  ngayHienTai: string | null;
  perEmp: TonDongNV[];
}

function parseNgayLap(v: string): number {
  const m = (v || "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return 0;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime();
}

export function buildTonDongTuanTruoc(
  lichSu: Record<string, string>[],
  xacNhan: XacNhanGoiYRow[]
): TonDongTuanTruoc | null {
  if (!lichSu || lichSu.length === 0) return null;
  const days = [...new Set(lichSu.map((r) => (r["Ngày lập"] || "").trim()).filter(Boolean))].sort(
    (a, b) => parseNgayLap(b) - parseNgayLap(a)
  );
  if (days.length < 2) return null; // cần ít nhất 2 lần chạy mới so được
  const ngayHienTai = days[0];
  const ngayTruoc = days[1];

  // Trạng thái xác nhận mới nhất theo (mã NV chuẩn hóa, mã KH).
  const latest = new Map<string, { status: string; t: number }>();
  for (const r of xacNhan) {
    const kh = r["Mã khách hàng"];
    if (!kh) continue;
    const key = `${chuanHoaMaNV(r["Mã nhân viên"])}__${kh}`;
    const m = (r["Thời gian"] || "").match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
    let t = 0;
    if (m) t = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime();
    else {
      const n = Number(r["Thời gian"]);
      if (Number.isFinite(n) && n > 20000 && n < 100000) t = Math.round((n - 25569) * 86400 * 1000);
    }
    const cur = latest.get(key);
    if (!cur || t >= cur.t) latest.set(key, { status: r["Trạng thái"], t });
  }
  const daGap = (maChuan: string, maKH: string) =>
    latest.get(`${maChuan}__${maKH}`)?.status === "Đồng ý";

  const perEmp: TonDongNV[] = allEmployees().map((emp) => {
    const maChuan = chuanHoaMaNV(emp.maNhanVien);
    const khachTuanTruoc = lichSu.filter(
      (r) => (r["Ngày lập"] || "").trim() === ngayTruoc && chuanHoaMaNV(r["Mã nhân viên"]) === maChuan
    );
    const khachChuaXuLy = khachTuanTruoc
      .filter((r) => !daGap(maChuan, r["Mã khách hàng"]))
      .map((r) => ({ maKH: r["Mã khách hàng"], tenKH: r["Tên khách hàng"] }));
    return {
      maNhanVien: emp.maNhanVien!,
      hoTen: emp.hoTen,
      tongTuanTruoc: khachTuanTruoc.length,
      khachChuaXuLy,
    };
  });

  return { ngayTruoc, ngayHienTai, perEmp };
}
