# Cung tuyến tuần — Nhóm Hà Trọng Thủy

Ứng dụng web (Next.js) giúp quản lý, nhân viên và cấp trên xem gợi ý cung tuyến tuần,
điểm hiệu suất, cảnh báy khách hàng, và cho phép nhân viên xác nhận đã gặp khách — dựa trên
dữ liệu do workflow n8n "Lập cung tuyến tuần — Nhóm Hà Trọng Thủy" ghi vào Google Sheets mỗi
tuần (thứ 7, 20h).

Tài liệu này hướng dẫn triển khai **từng bước, không cần biết lập trình**, lên Vercel (miễn phí).
Tổng thời gian khoảng 30–45 phút cho lần đầu.

---

## Tổng quan việc cần làm

1. Tạo "Google OAuth Client ID" — để nhân viên đăng nhập bằng Gmail công ty.
2. Tạo "Service Account" — để web app đọc được dữ liệu Google Sheets (không cần đăng nhập
   bằng chính Google Sheets đó).
3. Đưa code lên Vercel và khai báo các biến môi trường.
4. Quay lại bước 1, cập nhật lại "Authorized redirect URI" bằng địa chỉ Vercel thật.
5. Kiểm tra webhook n8n (đã có sẵn giá trị