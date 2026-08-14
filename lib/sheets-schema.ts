// Tên tab (sheet) và tên cột THẬT lấy từ n8n workflow "Lập cung tuyến tuần — Nhóm Hà Trọng
// Thủy" (id eFJua8TtCHwoqx2W). Xem chi tiết & nguồn tại docs/data-schema.md.
// Nếu workflow n8n bị đổi tên cột/sheet, chỉ cần sửa ở đây.

export const SHEET_NAMES = {
  goiYTapTrung: "Gợi ý tập trung",
  danhGiaCungTuyen: "Đánh giá cung tuyến tuần",
  canhBaoChuaViengTham: "Cảnh báo chưa viếng thăm",
  canhBaoKhachChet: "Cảnh báo KH chết",
  canhBaoSanPhamNghi: "Cảnh báo SP nghỉ",
  xacNhanGoiY: "Xác nhận gợi ý",
  danhSachNhanVien: "Danh sách nhân viên",
  troChuyen: "Trò chuyện",
} as const;

// ----- Gợi ý tập trung -----
export interface GoiYTapTrungRow {
  [key: string]: string;
  "Mã nhân viên": string;
  "Tên nhân viên": string;
  "Quản lý": string;
  "ASM": string;
  "Thứ tự ưu tiên": string;
  "Mã khách hàng": string;
  "Tên khách hàng": string;
  "Địa chỉ": string;
  "Tỉnh": string;
  "Nhóm KH": string;
  "Hạng": string;
  "Điểm ưu tiên": string;
  "Doanh thu 12T": string;
  "Số ngày chưa lặp đơn": string;
  "Chưa viếng thăm (ngày)": string;
  "Mục tiêu chuyến thăm": string;
}

// ----- Đánh giá cung tuyến tuần -----
export interface DanhGiaCungTuyenRow {
  [key: string]: string;
  "Tuần": string;
  "Mã nhân viên": string;
  "Tên nhân viên": string;
  "Số lượt gặp khách": string;
  "Số lượt phản hồi thông tin hàng hóa": string;
  "Số lượt phát sinh sale": string;
  "Tổng điểm cung tuyến": string;
}

// ----- Cảnh báo chưa viếng thăm -----
export interface CanhBaoChuaViengThamRow {
  [key: string]: string;
  "Mã khách hàng": string;
  "Tên khách hàng": string;
  "Tỉnh": string;
  "Nhóm KH": string;
  "Hạng": string;
  "Tên nhân viên": string;
  "Quản lý": string;
  "Doanh thu 12T": string;
  "Số ngày chưa có lượt viếng thăm/call": string;
  "Lần mua cuối": string;
  "Mức độ": string;
}

// ----- Cảnh báo KH chết -----
export interface CanhBaoKhachChetRow {
  [key: string]: string;
  "Mã khách hàng": string;
  "Tên khách hàng": string;
  "Tỉnh": string;
  "Nhóm KH": string;
  "Hạng": string;
  "Tên nhân viên": string;
  "Quản lý": string;
  "Doanh thu 12T": string;
  "Doanh thu lũy kế": string;
  "Số ngày chưa phát sinh": string;
  "Lần mua cuối": string;
  "Đã có call gần nhất (ngày)": string;
  "Mức độ": string;
}

// ----- Cảnh báo SP nghỉ -----
export interface CanhBaoSanPhamNghiRow {
  [key: string]: string;
  "Mã khách hàng": string;
  "Tên khách hàng": string;
  "Tỉnh": string;
  "Tên nhân viên": string;
  "Quản lý": string;
  "Hạng KH": string;
  "Mã sản phẩm": string;
  "Tên sản phẩm": string;
  "Số lần đã mua": string;
  "Doanh thu lũy kế": string;
  "Số ngày chưa mua lại": string;
}

// ----- Xác nhận gợi ý -----
export interface XacNhanGoiYRow {
  [key: string]: string;
  "Thời gian": string;
  "Mã nhân viên": string;
  "Tên nhân viên": string;
  "Mã khách hàng": string;
  "Tên khách hàng": string;
  "Trạng thái": string; // "Đồng ý" | "Không đồng ý"
}

// ----- Danh sách nhân viên -----
export interface DanhSachNhanVienRow {
  "Mã nhân viên": string;
  "Tên nhân viên": string;
  [key: string]: string;
}

// ----- Trò chuyện -----
// "Loại": "rieng" (1-1 giữa 1 nhân viên và quản lý) | "nhom" (chat chung cả nhóm).
// Với tin nhắn riêng, phía quản lý luôn dùng mã cố định "QL" (quản lý không có mã nhân
// viên riêng) — nhờ vậy tài khoản quản lý và tài khoản khách (cũng có role "manager") đều
// xem được cùng 1 luồng trò chuyện riêng với từng nhân viên.
export interface TroChuyenRow {
  [key: string]: string;
  "Thời gian": string;
  "Loại": string; // "rieng" | "nhom"
  "Mã người gửi": string;
  "Tên người gửi": string;
  "Mã người nhận": string; // rỗng nếu loại = "nhom"
  "Tên người nhận": string;
  "Nội dung": string;
}
