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
  // "yyyy-MM-dd HH:mm:ss"
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  return new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
    Number(m[6])
  );
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
