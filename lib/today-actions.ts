// Màn "Hôm nay làm gì" — gộp dữ liệu đã có thành danh sách VIỆC ƯU TIÊN cho từng TDV:
//  1) Khách CẦN GẶP tuần này (từ Gợi ý tập trung, CHƯA xác nhận gặp) — kèm gợi ý TUYẾN ĐI (gom theo tỉnh).
//  2) Khách CẦN CHĂM SÓC / tái kích hoạt (từ 3 sheet cảnh báo: KH chết, chưa viếng thăm, SP nghỉ).
// Danh sách NV lấy từ activeEmployees() nên NV đã nghỉ tự động không xuất hiện.

import { activeEmployees } from "./allowlist";
import { normalizeMaNV } from "./report-utils";
import type { EmployeeWeekSummary, KhachGoiY } from "./aggregate";
import type { CareItem } from "./report-utils";

export interface RouteGroup {
  tinh: string;
  khach: KhachGoiY[];
}
export interface TodayNV {
  maNhanVien: string;
  hoTen: string;
  soGoiY: number;
  soDaGap: number;
  canGap: KhachGoiY[]; // khách gợi ý CHƯA gặp, xếp theo thứ tự ưu tiên
  routes: RouteGroup[]; // canGap gom theo tỉnh (cụm nhiều khách lên trước)
  nguyCoMat: Set<string>; // tên khách (trong canGap) đang ở nhóm "chết" -> cờ đỏ
  care: CareItem[]; // khách cần chăm sóc (đã ưu tiên sẵn)
  soChet: number;
  soChuaTham: number;
  soSpNghi: number;
  diemViec: number; // tổng việc = canGap + care
}
export interface TodayActions {
  weekLabel: string | null;
  byNV: TodayNV[];
  team: { soCanGap: number; soChamSoc: number; soChet: number; busiest: string | null };
}

function prioOf(k: KhachGoiY): number {
  const n = Number(String(k.thuTuUuTien ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 9999; // không có số -> xuống cuối
}

export function buildTodayActions(
  weekLabel: string | null,
  summaries: EmployeeWeekSummary[],
  careByEmp: Record<string, CareItem[]>
): TodayActions {
  const sumByMa = new Map<string, EmployeeWeekSummary>();
  for (const s of summaries) sumByMa.set(normalizeMaNV(s.maNhanVien), s);

  const byNV: TodayNV[] = activeEmployees().map((e) => {
    const ma = normalizeMaNV(e.maNhanVien);
    const sum = sumByMa.get(ma);
    const khachGoiY = sum?.khachGoiY ?? [];
    const canGap = khachGoiY
      .filter((k) => k.trangThai !== "Đồng ý")
      .slice()
      .sort((a, b) => prioOf(a) - prioOf(b));

    // Gom tuyến theo tỉnh; cụm đông khách lên trước (đi 1 vùng cho gọn).
    const byTinh = new Map<string, KhachGoiY[]>();
    for (const k of canGap) {
      const t = (k.tinh || "").trim() || "Chưa rõ tỉnh";
      let arr = byTinh.get(t);
      if (!arr) { arr = []; byTinh.set(t, arr); }
      arr.push(k);
    }
    const routes: RouteGroup[] = [...byTinh.entries()]
      .map(([tinh, khach]) => ({ tinh, khach }))
      .sort((a, b) => b.khach.length - a.khach.length || a.tinh.localeCompare(b.tinh));

    const care = careByEmp[e.hoTen] ?? [];
    const soChet = care.filter((c) => c.loai === "chet").length;
    const soChuaTham = care.filter((c) => c.loai === "chua-tham").length;
    const soSpNghi = care.filter((c) => c.loai === "sp-nghi").length;

    // Cờ "nguy cơ mất": tên khách trong canGap trùng khách đang ở nhóm "chết".
    const chetNames = new Set(
      care.filter((c) => c.loai === "chet").map((c) => (c.tenKhach || "").trim().toLowerCase())
    );
    const nguyCoMat = new Set<string>();
    for (const k of canGap) {
      if (chetNames.has((k.tenKH || "").trim().toLowerCase())) nguyCoMat.add(k.tenKH);
    }

    return {
      maNhanVien: ma,
      hoTen: e.hoTen,
      soGoiY: sum?.soGoiY ?? 0,
      soDaGap: sum?.soDongY ?? 0,
      canGap,
      routes,
      nguyCoMat,
      care,
      soChet,
      soChuaTham,
      soSpNghi,
      diemViec: canGap.length + care.length,
    };
  });

  const soCanGap = byNV.reduce((a, n) => a + n.canGap.length, 0);
  const soChamSoc = byNV.reduce((a, n) => a + n.care.length, 0);
  const soChet = byNV.reduce((a, n) => a + n.soChet, 0);
  const busiest = byNV.length
    ? byNV.slice().sort((a, b) => b.diemViec - a.diemViec)[0]?.hoTen ?? null
    : null;

  return { weekLabel, byNV, team: { soCanGap, soChamSoc, soChet, busiest } };
}
