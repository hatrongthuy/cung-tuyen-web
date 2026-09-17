// Cấu hình theo "scope" triển khai — CHUNG một mã nguồn nhưng deploy thành NHIỀU project
// Vercel khác nhau, mỗi project khai báo biến môi trường NEXT_PUBLIC_APP_SCOPE riêng:
//   - "phu-tho" (mặc định, để trống cũng được): web hiện tại — chỉ nhóm Hà Trọng Thủy (PS Phú Thọ).
//   - "tay-bac": web nhân bản cho CẢ NHÓM Tây Bắc (3 SS: Hà Trọng Thủy, Trịnh Xuân Hà,
//     Lê Công Đức) — quản lý xem được số liệu của nhau, nhân viên chỉ xem của mình.
//
// Dùng NEXT_PUBLIC_ vì giá trị này được đọc cả ở Server Component lẫn Client Component
// (một số trang/component "use client" cần biết tên nhóm để hiển thị) — Next.js sẽ khắc
// (inline) giá trị này vào bundle lúc build, nên MỖI project Vercel phải build riêng với
// đúng giá trị của mình (không thể dùng chung 1 bản build cho cả 2 scope).
export type AppScope = "phu-tho" | "tay-bac";

export const APP_SCOPE: AppScope =
  process.env.NEXT_PUBLIC_APP_SCOPE === "tay-bac" ? "tay-bac" : "phu-tho";

/** Tên "Nhóm SS" dùng để lọc dữ liệu trong file KPI công ty (cột "Nhóm SS"/"SS").
 *  - phu-tho: 1 nhóm — giữ nguyên hành vi web hiện tại.
 *  - tay-bac: cả 3 nhóm SS — quản lý xem được số liệu của nhau. */
export const TEN_NHOM: string | string[] =
  APP_SCOPE === "tay-bac" ? ["Hà Trọng Thủy", "Trịnh Xuân Hà", "Lê Công Đức"] : "Hà Trọng Thủy";

export const APP_TITLE =
  APP_SCOPE === "tay-bac" ? "Cung tuyến tuần — Nhóm Tây Bắc" : "Cung tuyến tuần — Nhóm Hà Trọng Thủy";

export const APP_SHORT_NAME = APP_SCOPE === "tay-bac" ? "PS Tây Bắc" : "PS Phú Thọ";

/** Tên nhóm dùng để HIỂN THỊ (khác TEN_NHOM — TEN_NHOM có thể là mảng nhiều nhóm dùng để lọc
 *  dữ liệu; cái này luôn là 1 chuỗi, dùng cho tiêu đề/label trên giao diện). */
export const TEN_NHOM_HIEN_THI = APP_SCOPE === "tay-bac" ? "Tây Bắc" : "Hà Trọng Thủy";

export const APP_DESCRIPTION =
  APP_SCOPE === "tay-bac"
    ? "Quản lý cung tuyến, doanh số, KPI — Nhóm Tây Bắc"
    : "Quản lý cung tuyến, doanh số, KPI — Nhóm Hà Trọng Thủy";

/** So khớp giá trị cột "Nhóm SS" trong sheet với scope hiện tại (hỗ trợ cả 1 nhóm và nhiều nhóm). */
export function matchesTenNhom(cellValue: string): boolean {
  const v = (cellValue ?? "").trim().toLowerCase();
  if (Array.isArray(TEN_NHOM)) return TEN_NHOM.some((t) => t.trim().toLowerCase() === v);
  return TEN_NHOM.trim().toLowerCase() === v;
}
