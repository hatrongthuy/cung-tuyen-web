# Data schema & thông tin lấy từ n8n workflow

Nguồn: n8n workflow id `eFJua8TtCHwoqx2W` — "Lập cung tuyến tuần — Nhóm Hà Trọng Thủy"
(lấy bằng `mcp__n8n__get_workflow_details` ngày 2026-08-13).

Google Sheet nguồn dữ liệu (nơi ghi kết quả, dùng cho web đọc):
`GOOGLE_SHEETS_SPREADSHEET_ID = 1c-vwUXNL-zBhftZKWLNPsom4noFITSaO8vDP-FZ18dU`
(đây chính là `outputSpreadsheetId` trong node "Cấu hình" của workflow).

> Lưu ý: có một `spreadsheetId` khác (`19CNg5Q38a7tAyNR8NSY6-E5U1Q1kqdhsblftGuGDsdU`) là nơi
> workflow ĐỌC dữ liệu Sale/Call gốc — web app KHÔNG cần đọc sheet này, chỉ cần đọc
> `outputSpreadsheetId` ở trên vì đó là nơi có toàn bộ gợi ý/cảnh báo/điểm đã được xử lý sẵn.

## 1. Webhook "Nhận xác nhận gợi ý"

- Node: `Nhận xác nhận gợi ý` (type `webhook`), path = `xac-nhan-goi-y`
- **Production URL (thật, lấy trực tiếp từ n8n)**:
  `https://n8n.cpc1hn.com.vn/webhook/b9af5578-41a8-4d25-a2e5-ad749671f9e8/xac-nhan-goi-y`
- **HTTP Method: GET** (node đọc dữ liệu qua `$json.query`, không phải `$json.body` — do đó
  phải gọi bằng GET kèm query string, KHÔNG phải POST JSON. Đây là điểm khác với mô tả ban đầu
  trong yêu cầu — đã ưu tiên theo cấu hình thật của workflow).
- Query params mong đợi (đọc từ node kế tiếp "Ghi xác nhận gợi ý" và "Trả lời xác nhận"):
  - `nv`     = mã nhân viên (vd `017886`)
  - `tennv`  = tên nhân viên
  - `kh`     = mã khách hàng
  - `tenkh`  = tên khách hàng
  - `tt`     = trạng thái phản hồi, giá trị `dong-y` (Đồng ý) hoặc bất kỳ giá trị khác (map thành
    "Không đồng ý", ví dụ dùng `khac`)
- Không yêu cầu credential/auth nào (public webhook).
- Trả lời: HTML đơn giản (text/html) báo "Đã ghi nhận phản hồi của bạn" — web app không cần parse
  response, chỉ cần kiểm tra HTTP status 200 là thành công.

Web app sẽ gọi webhook này dạng:
```
GET {N8N_CONFIRM_WEBHOOK_URL}?nv=017886&tennv=...&kh=...&tenkh=...&tt=dong-y
```
(thực hiện phía server route `/api/confirm` để tránh CORS/lộ URL, rồi trả kết quả về client).

## 2. Sheet "Ghi xác nhận gợi ý" → tab **"Xác nhận gợi ý"**

Cột (theo đúng thứ tự append trong node `Ghi xác nhận gợi ý`):

| Cột | Ý nghĩa |
|---|---|
| Thời gian | `yyyy-MM-dd HH:mm:ss` lúc n8n ghi nhận |
| Mã nhân viên | từ query `nv` |
| Tên nhân viên | từ query `tennv` |
| Mã khách hàng | từ query `kh` |
| Tên khách hàng | từ query `tenkh` |
| Trạng thái | `Đồng ý` hoặc `Không đồng ý` |

Web app dùng sheet này để tính "đã xác nhận bao nhiêu / tổng bao nhiêu khách được gợi ý" cho
từng nhân viên (trang manager) — so khớp theo (Mã nhân viên, Mã khách hàng) trong tuần hiện tại.

## 3. Sheet "Gợi ý tập trung" (tab **"Gợi ý tập trung"**)

Cột (từ node `Ghi lại header Gợi ý tập trung`, range A1:P1):

`Mã nhân viên, Tên nhân viên, Quản lý, ASM, Thứ tự ưu tiên, Mã khách hàng, Tên khách hàng,
Địa chỉ, Tỉnh, Nhóm KH, Hạng, Điểm ưu tiên, Doanh thu 12T, Số ngày chưa lặp đơn,
Chưa viếng thăm (ngày), Mục tiêu chuyến thăm`

Đây là danh sách khách hàng nên gặp trong tuần, đã sắp theo "Thứ tự ưu tiên" cho từng
"Mã nhân viên". Sheet bị xóa (giữ header) và ghi lại mỗi tuần (thứ 7 20h) → luôn là gợi ý của
tuần hiện tại.

## 4. Sheet "Đánh giá cung tuyến tuần" (tab **"Đánh giá cung tuyến tuần"**)

Cột (range A1:G1):

`Tuần, Mã nhân viên, Tên nhân viên, Số lượt gặp khách, Số lượt phản hồi thông tin hàng hóa,
Số lượt phát sinh sale, Tổng điểm cung tuyến`

- `Tuần` là chuỗi dạng `dd/MM/yyyy - dd/MM/yyyy` (7 ngày gần nhất tính đến lúc workflow chạy).
- Thang điểm (ghi trong code node "Chấm điểm cung tuyến tuần"), mỗi lượt gặp khách chỉ tính
  1 mức điểm cao nhất áp dụng được (không cộng dồn):
  - Đã gặp khách (có call) = 7 điểm
  - Gặp khách có phản hồi thông tin hàng hóa (call có ghi "Báo cáo") = 8 điểm
  - Gặp khách có phát sinh sale (khớp Sale sạch cùng ngày) = 10 điểm
- Sheet này KHÔNG bị xóa mỗi tuần (chỉ append) → là lịch sử nhiều tuần, dùng để vẽ biểu đồ
  xu hướng điểm số theo tuần.

## 5. Sheet "Cảnh báo chưa viếng thăm" (tab **"Cảnh báo chưa viếng thăm"**)

Cột (range A1:K1):

`Mã khách hàng, Tên khách hàng, Tỉnh, Nhóm KH, Hạng, Tên nhân viên, Quản lý, Doanh thu 12T,
Số ngày chưa có lượt viếng thăm/call, Lần mua cuối, Mức độ`

## 6. Sheet "Cảnh báo KH chết" (tab **"Cảnh báo KH chết"**)

Cột (suy ra từ code node "Chấm điểm và gợi ý tập trung", object `bang: 'KH_CHET'` —
sheet ghi bằng `autoMapInputData` nên tên cột = đúng tên field JS):

`Mã khách hàng, Tên khách hàng, Tỉnh, Nhóm KH, Hạng, Tên nhân viên, Quản lý, Doanh thu 12T,
Doanh thu lũy kế, Số ngày chưa phát sinh, Lần mua cuối, Đã có call gần nhất (ngày), Mức độ`

- Điều kiện vào danh sách: số ngày chưa phát sinh đơn > ngưỡng `nguongKhachChet` (mặc định 120
  ngày).
- `Mức độ`: `Rất nặng` (>240 ngày), `Nặng` (>180 ngày), `Cảnh báo` (còn lại).

## 7. Sheet "Cảnh báo SP nghỉ" (tab **"Cảnh báo SP nghỉ"**)

Cột (range A1:K1, từ schema `autoMapInputData` của node `Ghi cảnh báo SP nghỉ`):

`Mã khách hàng, Tên khách hàng, Tỉnh, Tên nhân viên, Quản lý, Hạng KH, Mã sản phẩm,
Tên sản phẩm, Số lần đã mua, Doanh thu lũy kế, Số ngày chưa mua lại`

## 8. Sheet "Danh sách nhân viên" (tab **"Danh sách nhân viên"**)

Đọc trực tiếp (không qua code xử lý) — theo tham chiếu trong code (`j['Mã nhân viên']`,
`j['Tên nhân viên']`) sheet này có ít nhất 2 cột `Mã nhân viên`, `Tên nhân viên` (có thể có thêm
cột khác như Quản lý/ASM/Tỉnh — web app không phụ thuộc các cột này).

## 9. Danh sách mã nhân viên đang được workflow xử lý (node "Cấu hình" → `chiNhanVien`)

`017886, 018468, 018757, 019484, 020180` — khớp với 5 email nhân viên trong allowlist người
dùng cung cấp.

## 10. Giả định / rủi ro cần lưu ý khi triển khai thật

- Nếu ai đó đổi lại workflow (đổi path webhook, đổi tên cột) thì các hằng số trong
  `lib/sheets-schema.ts` và biến môi trường `N8N_CONFIRM_WEBHOOK_URL` của web app cần cập nhật
  theo.
- Webhook xác nhận dùng GET với query string — không có xác thực nào (ai có URL + đúng tham số
  đều ghi được vào sheet) → nên cân nhắc thêm bước xác thực (vd n8n Basic Auth trên webhook)
  nếu lo ngại giả mạo; hiện tại web app gọi qua route server-side `/api/confirm` nên URL webhook
  thật không lộ ra client, nhưng đây không phải là cơ chế bảo mật tuyệt đối.
- Cột "Tuần" là chuỗi dd/MM/yyyy - dd/MM/yyyy chứ không phải số tuần ISO — web app parse theo
  đúng định dạng này khi vẽ biểu đồ xu hướng (sort theo ngày bắt đầu tuần).
