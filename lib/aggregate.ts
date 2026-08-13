import { allEmployees } from "./allowlist";
import { chuanHoaMaNV, latestWeekLabel, parseWeekStart } from "./data";
import type {
  DanhGiaCungTuyenRow,
  GoiYTapTrungRow,
  XacNhanGoiYRow,
} from "./sheets-schema";

export interface EmployeeWeekSummary {
  maNhanVien: string;
  hoTen: string;
  soGoiY: number;
  soDaXacNhan: number; // đã trả lời (đồng ý hoặc không đồng ý)
  soDongY: number; // đã gặp / đồng ý
  tyLeHoanThanh: number; // soDongY / soGoiY, 0..1
  diemCungTuyen: number | null; // Tổng điểm cung tuyến tuần hiện tại (nếu có)
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

  const xacNhanTrongTuan = range
    ? xacNhan.filter((r) => {
        const d = parseThoiGian(r["Thời gian"]);
        return d && d >= range.start && d <= range.end;
      })
    : xacNhan;

  const summaries: EmployeeWeekSummary[] = allEmployees().map((emp) => {
    const maChuan = chuanHoaMaNV(emp.maNhanVien);

    const goiYCuaNV = goiY.filter((r) => chuanHoaMaNV(r["Mã nhân viên"]) === maChuan);
    const xacNhanCuaNV = xacNhanTrongTuan.filter(
      (r) => chuanHoaMaNV(r["Mã nhân viên"]) === maChuan
    );
    const dongYCuaNV = xacNhanCuaNV.filter((r) => r["Trạng thái"] === "Đồng ý");

    const diemRow = danhGia.find(
      (r) => chuanHoaMaNV(r["Mã nhân viên"]) === maChuan && r["Tuần"] === weekLabel
    );

    const soGoiY = goiYCuaNV.length;
    const soDongY = dongYCuaNV.length;

    return {
      maNhanVien: emp.maNhanVien!,
      hoTen: emp.hoTen,
      soGoiY,
      soDaXacNhan: xacNhanCuaNV.length,
      soDongY,
      tyLeHoanThanh: soGoiY > 0 ? soDongY / soGoiY : 0,
      diemCungTuyen: diemRow ? Number(diemRow["Tổng điểm cung tuyến"]) || 0 : null,
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
