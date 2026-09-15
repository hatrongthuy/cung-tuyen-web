# Cung tuyến tuần — Nhóm Hà Trọng Thủy

Ứng dụng web (Next.js) giúp quản lý, nhân viên và cấp trên xem gợi ý cung tuyến tuần,
điểm hiệu suất, cảnh báo khách hàng, và cho phép nhân viên xác nhận đã gặp khách — dựa trên
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
5. Kiểm tra webhook n8n (đã có sẵn giá trị, chỉ cần copy).

---

## Bước 1 — Tạo Google OAuth Client ID (đăng nhập Google)

1. Vào https://console.cloud.google.com/ , đăng nhập bằng tài khoản Google quản trị của công ty
   (nên dùng tài khoản có quyền quản lý Google Workspace `cpc1hn.com.vn` nếu có, để dễ giới hạn
   domain).
2. Nếu chưa có project nào, bấm **"Chọn dự án" → "Dự án mới"**, đặt tên ví dụ
   `cung-tuyen-web`, bấm **Tạo**.
3. Vào menu bên trái **"APIs & Services" → "OAuth consent screen"**:
   - Chọn loại **Internal** nếu là tài khoản Google Workspace của công ty (khuyến nghị, chỉ
     người trong domain mới đăng nhập được). Nếu không có Google Workspace, chọn **External**
     và thêm các email trong danh sách allowlist vào mục "Test users".
   - Điền tên ứng dụng (vd "Cung tuyến tuần"), email hỗ trợ — bấm **Lưu**.
4. Vào **"APIs & Services" → "Credentials"** → bấm **"+ Create Credentials" → "OAuth client ID"**.
   - Loại ứng dụng (Application type): chọn **"Web application"**.
   - Tên: `cung-tuyen-web`.
   - **Authorized redirect URIs**: tạm thời điền
     `http://localhost:3000/api/auth/callback/google` (sẽ cập nhật lại ở Bước 4 sau khi có domain
     Vercel thật).
   - Bấm **Create**. Màn hình sẽ hiện ra **Client ID** và **Client secret** — copy lại 2 giá trị
     này, sẽ dùng ở Bước 3 (biến `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`).

---

## Bước 2 — Tạo Service Account để đọc Google Sheets

Web app **không** dùng tài khoản đăng nhập của nhân viên để đọc dữ liệu Google Sheets — mà dùng
một "tài khoản máy" (service account) riêng, được cấp quyền Viewer (chỉ đọc) trên sheet.

1. Trong cùng project Google Cloud ở Bước 1, vào **"APIs & Services" → "Library"**, tìm
   **"Google Sheets API"**, bấm **Enable**.
2. Vào **"IAM & Admin" → "Service Accounts"** → bấm **"+ Create Service Account"**.
   - Tên: `cung-tuyen-web-sheets-reader`.
   - Bấm **Create and Continue** → không cần gán vai trò (role) gì thêm → **Done**.
3. Bấm vào service account vừa tạo → tab **"Keys"** → **"Add Key" → "Create new key"** → chọn
   định dạng **JSON** → **Create**. File JSON sẽ tự tải về máy — **giữ file này cẩn thận, không
   chia sẻ công khai**.
4. Mở file JSON vừa tải bằng Notepad (hoặc bất kỳ trình soạn thảo text nào), tìm 2 giá trị:
   - `"client_email"` → đây là giá trị cho biến môi trường `GOOGLE_SERVICE_ACCOUNT_EMAIL`.
   - `"private_key"` → đây là giá trị cho biến môi trường `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
     (copy nguyên văn cả đoạn `-----BEGIN PRIVATE KEY-----...-----END PRIVATE KEY-----\n`, giữ
     nguyên các ký tự `\n`).
5. **Chia sẻ quyền đọc Google Sheet cho service account:**
   - Mở Google Sheet dữ liệu cung tuyến (spreadsheet ID
     `1c-vwUXNL-zBhftZKWLNPsom4noFITSaO8vDP-FZ18dU`, chính là sheet mà workflow n8n đang ghi dữ
     liệu vào).
   - Bấm nút **"Share" (Chia sẻ)** ở góc trên bên phải.
   - Dán email service account (giá trị `client_email` ở trên, dạng
     `...@...iam.gserviceaccount.com`) vào ô mời, chọn quyền **"Viewer" (Người xem)**, bấm
     **Send/Share**.

---

## Bước 3 — Đưa code lên Vercel

1. Đưa code này lên một repository GitHub (tạo repo mới trên https://github.com/new, rồi làm
   theo hướng dẫn "push an existing repository" mà GitHub hiển thị — hoặc nhờ người có kinh
   nghiệm hỗ trợ bước này nếu chưa quen dùng `git`).
2. Vào https://vercel.com/ , đăng nhập (có thể đăng nhập bằng tài khoản GitHub cho tiện).
3. Bấm **"Add New..." → "Project"**, chọn repository vừa tạo → **Import**.
4. Ở màn hình cấu hình project, mở mục **"Environment Variables"** và khai báo đủ các biến sau
   (xem thêm chú thích trong file `.env.example` đi kèm code):

   | Tên biến | Giá trị |
   |---|---|
   | `GOOGLE_OAUTH_CLIENT_ID` | Client ID lấy ở Bước 1 |
   | `GOOGLE_OAUTH_CLIENT_SECRET` | Client secret lấy ở Bước 1 |
   | `NEXTAUTH_SECRET` | Một chuỗi bí mật ngẫu nhiên — có thể vào https://generate-secret.vercel.app/32 để tạo nhanh |
   | `NEXTAUTH_URL` | Để tạm `https://ten-project-cua-ban.vercel.app` (sẽ biết chính xác sau khi deploy lần đầu, có thể sửa lại) |
   | `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` lấy ở Bước 2 |
   | `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | `private_key` lấy ở Bước 2 (dán nguyên văn, Vercel cho phép dán nh