// Tên spreadsheet/tab và tên cột THẬT của Google Sheet "báo cáo thầu" (một spreadsheet
// KHÁC với spreadsheet "Cung tuyến tuần" chính — xem docs/data-schema.md phần "Báo cáo thầu").
//
// Tab dữ liệu chi tiết đổi tên theo tháng (vd "Chi tiết 1.8.2026", "Chi tiết 1.9.2026"...).
// Khi có tab tháng mới, CHỈ CẦN sửa biến môi trường GOOGLE_SHEETS_THAU_TAB trên Vercel rồi
// Redeploy — không cần sửa code.

export const THAU_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_THAU_SPREADSHEET_ID;

export const THAU_TAB_NAME = process.env.GOOGLE_SHEETS_THAU_TAB || "Chi tiết 1.8.2026";

// Header thật nằm ở DÒNG 4 của tab (dòng 1-3 là tiêu đề/mốc thời gian), dữ liệu bắt đầu dòng 5.
export const THAU_RANGE = "A4:AE20000";

// Cột A của sheet nguồn có tiêu đề đúng là "m" (không rõ lý do, có thể do người tạo sheet đặt
// nhầm) — thực chất chứa MÃ SỐ HỢP ĐỒNG/GÓI THẦU (vd "TH-PPT25"). Giữ nguyên tên cột "m" ở đây
// để khớp 1-1 với header thật trong sheet, nhưng dùng field `soHopDong` (xem thau-data.ts) khi
// xử lý cho dễ đọc.
export interface ThauRow {
  [key: string]: string;
  m: string; // Số hợp đồng / gói thầu
  "Ngày bắt đầu hiệu lực": string; // serial date (số) dạng chuỗi
  "Ngày hết hiệu lực": string; // serial date (số) dạng chuỗi
  "Mã khách": string;
  "Tên khách": string;
  "Tỉnh": string;
  "Mã hàng": string;
  "Tên mặt hàng": string;
  "Tên hoạt chất": string;
  "Giá bán kế hoạch": string;
  "SL kế hoạch": string;
  "SL thực hiện": string;
  "SL còn lại (SL chênh lệch)": string;
  "Điều kiện": string;
  "Số lượng vượt thầu": string;
  "Số lượng điều chuyển tăng": string;
  "Số lượng điều chuyển giảm": string;
  "Số lượng kế hoạch thực": string;
  "Tỷ lệ phần trăm thực hiện": string;
  "Miền": string;
  "Nhóm phụ trách": string;
  "Nhóm SP": string;
  "Số tháng còn lại của gói thầu": string;
  "Phân cấp các gói thầu": string;
  "Số lượng còn lại": string;
  "Doanh số còn lại": string;
  "doanh số trung bình còn lại/tháng": string;
  "Doanh số 2026": string;
  "DS 2026_YC thực hiện": string;
  // 2 cột bổ sung (mục "Sổ tay" — SUMIFS ánh xạ sang file order khác). Có thể chưa tồn tại ở các
  // tab tháng cũ hơn — khi đó readSheetAsObjects() trả về chuỗi rỗng "" cho cột thiếu (không phải
  // undefined), nên không cần đánh dấu optional ở đây (tránh xung đột với index signature).
  "SL đã bán (Sổ tay T8+)": string;
  "SL còn lại (đã trừ Sổ tay)": string;
}
