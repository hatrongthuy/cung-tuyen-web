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
   | `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | `private_key` lấy ở Bước 2 (dán nguyên văn, Vercel cho phép dán nhiều dòng) |
   | `GOOGLE_SHEETS_SPREADSHEET_ID` | `1c-vwUXNL-zBhftZKWLNPsom4noFITSaO8vDP-FZ18dU` |
   | `N8N_CONFIRM_WEBHOOK_URL` | `https://n8n.cpc1hn.com.vn/webhook/b9af5578-41a8-4d25-a2e5-ad749671f9e8/xac-nhan-goi-y` |

5. Bấm **Deploy**. Đợi khoảng 1–2 phút để Vercel build xong. Sau khi xong, Vercel sẽ cấp cho bạn
   một địa chỉ dạng `https://ten-project-cua-ban.vercel.app`.

---

## Bước 4 — Cập nhật lại Authorized redirect URI với domain Vercel thật

1. Copy địa chỉ Vercel thật (vd `https://ten-project-cua-ban.vercel.app`).
2. Quay lại Google Cloud Console → **"APIs & Services" → "Credentials"** → bấm vào OAuth client
   đã tạo ở Bước 1 → mục **"Authorized redirect URIs"** → **Add URI**, thêm:
   ```
   https://ten-project-cua-ban.vercel.app/api/auth/callback/google
   ```
   (giữ nguyên dòng `http://localhost:3000/...` nếu muốn tiếp tục test ở máy cá nhân) → **Save**.
3. Quay lại Vercel → project → **Settings → Environment Variables**, sửa biến `NEXTAUTH_URL`
   thành đúng địa chỉ Vercel thật (không có dấu `/` ở cuối), ví dụ:
   ```
   NEXTAUTH_URL=https://ten-project-cua-ban.vercel.app
   ```
4. Vào tab **Deployments**, bấm **Redeploy** ở bản deploy mới nhất để áp dụng biến môi trường
   vừa sửa.

Sau bước này, mọi người trong danh sách allowlist (`lib/allowlist.ts`) có thể đăng nhập bằng
Gmail công ty `@cpc1hn.com.vn` tại địa chỉ Vercel để sử dụng.

---

## Bước 5 — Webhook n8n dùng để xác nhận gợi ý

Không cần làm gì thêm — giá trị đã được lấy sẵn từ workflow n8n thật và điền trong
`.env.example` / hướng dẫn Bước 3 ở trên:

```
N8N_CONFIRM_WEBHOOK_URL=https://n8n.cpc1hn.com.vn/webhook/b9af5578-41a8-4d25-a2e5-ad749671f9e8/xac-nhan-goi-y
```

Nếu sau này workflow n8n bị sửa lại (đổi node webhook, đổi path...), lấy lại URL mới bằng cách:
mở workflow "Lập cung tuyến tuần — Nhóm Hà Trọng Thủy" trong n8n → mở node **"Nhận xác nhận gợi
ý"** → copy **Production URL** hiển thị trong node đó → cập nhật lại biến
`N8N_CONFIRM_WEBHOOK_URL` trên Vercel → Redeploy.

---

## Bước 5b — Báo cáo thầu (trang `/quan-ly/bao-cao-thau`)

Trang "Báo cáo thầu" đọc dữ liệu từ MỘT Google Sheet KHÁC với sheet cung tuyến chính ở Bước 2
(spreadsheet riêng "báo cáo thầu"). Cùng một Service Account ở Bước 2 dùng để đọc sheet này,
nhưng phải cấp quyền Viewer riêng cho sheet đó thì mới đọc được. Các bước:

1. Mở Google Sheet "báo cáo thầu" (link:
   `https://docs.google.com/spreadsheets/d/12rUumsB65y5wexTASLyh07p81JHnMY2lAjCuYLAESxc/edit`).
2. Bấm nút **Chia sẻ / Share** (góc trên bên phải).
3. Dán đúng email của Service Account (giá trị `GOOGLE_SERVICE_ACCOUNT_EMAIL` đã điền ở Bước 2 —
   xem lại trong mục Environment Variables của project trên Vercel nếu quên), chọn quyền
   **Người xem / Viewer**, bấm **Gửi / Send**.
4. Trên Vercel → project → **Settings → Environment Variables**, thêm 2 biến:

   ```
   GOOGLE_SHEETS_THAU_SPREADSHEET_ID=12rUumsB65y5wexTASLyh07p81JHnMY2lAjCuYLAESxc
   GOOGLE_SHEETS_THAU_TAB=Chi tiết 1.8.2026
   ```

5. Bấm **Redeploy** (hoặc chờ lần push code tiếp theo tự deploy).

Ngưỡng cảnh báo (đang để mặc định 6 tháng cho cả 2 loại cảnh báo — "gói thầu sắp hết hiệu lực"
và "khách lâu chưa gọi thầu mới") nằm ở đầu file `app/quan-ly/bao-cao-thau/page.tsx` (2 hằng số
`NGUONG_SAP_HET_HAN_THANG` và `NGUONG_LAU_CHUA_GOI_THANG`) — muốn đổi ngưỡng thì sửa số ở đó rồi
đưa code lên lại.

**Khi có tab tháng mới** (ví dụ sang tháng 9 sẽ có tab "Chi tiết 1.9.2026" mới): chỉ cần sửa lại
giá trị biến `GOOGLE_SHEETS_THAU_TAB` trên Vercel thành tên tab mới rồi Redeploy — KHÔNG cần sửa
code, miễn là tab mới giữ nguyên đúng cấu trúc cột (header ở dòng 4, dữ liệu từ dòng 5) như tab
cũ.

---

## Thêm / bớt người dùng sau này

Mở file `lib/allowlist.ts`, thêm/sửa/xoá các dòng trong mảng `ALLOWLIST` (email, họ tên, vai
trò, mã nhân viên nếu là "employee"), rồi đưa code lên lại (git push) để Vercel tự deploy lại.
Không cần sửa ở bất kỳ nơi nào khác trong code.

Vai trò hỗ trợ:
- `manager` — quản lý nhóm, xem toàn bộ 5 nhân viên.
- `superior` — cấp trên, chỉ xem dashboard tổng quan (không có nút thao tác).
- `employee` — nhân viên, chỉ xem/xác nhận cung tuyến của chính mình (bắt buộc phải có
  `maNhanVien` đúng với mã nhân viên trong Google Sheets).

---

## Chạy thử ở máy cá nhân (dành cho người có cài Node.js)

```bash
npm install
cp .env.example .env.local   # rồi điền các giá trị thật vào .env.local
npm run dev
```

Mở http://localhost:3000

## Kiểm tra build trước khi deploy

```bash
npm run build
```

## Cấu trúc thư mục chính

```
app/
  dang-nhap/        Trang đăng nhập Google
  khong-co-quyen/   Trang báo không có quyền truy cập
  nhan-vien/        Dashboard cho vai trò "employee"
  quan-ly/          Dashboard cho vai trò "manager"
  cap-tren/         Dashboard chỉ xem cho vai trò "superior"
  api/auth/         Route NextAuth (đăng nhập/đăng xuất Google)
  api/confirm/      Route gọi webhook n8n khi nhân viên xác nhận gợi ý
auth.ts             Cấu hình NextAuth (Google OAuth + allowlist + phân quyền)
proxy.ts            Bảo vệ route theo vai trò (tương đương middleware ở Next.js cũ)
lib/allowlist.ts    Bảng ánh xạ email -> vai trò (SỬA Ở ĐÂY khi thêm/bớt người dùng)
lib/sheets.ts       Đọc Google Sheets bằng service account
lib/sheets-schema.ts Tên sheet & tên cột thật (tham chiếu docs/data-schema.md)
lib/data.ts         Hàm lấy dữ liệu từng sheet + tiện ích xử lý tuần
lib/aggregate.ts     Tổng hợp số liệu theo nhân viên/tuần cho các dashboard
lib/colors.ts        Bảng màu biểu đồ (theo palette đã kiểm định, colorblind-safe)
components/          Các thành phần giao diện dùng chung (biểu đồ, bảng, nút xác nhận...)
docs/data-schema.md  Toàn bộ thông tin sheet/cột/webhook lấy được từ workflow n8n thật
```

## Ghi chú quan trọng / rủi ro cần biết

- Webhook xác nhận gợi ý (`N8N_CONFIRM_WEBHOOK_URL`) hiện KHÔNG có xác thực (public webhook) —
  route `/api/confirm` trong web app đứng giữa để nhân viên phải đăng nhập mới gọi được, nhưng
  đây không phải cơ chế bảo mật tuyệt đối ở phía n8n. Có thể cân nhắc thêm Basic Auth cho webhook
  này trong n8n nếu cần chặt hơn.
- "Tuần hiện tại" trong web app được xác định dựa trên nhãn tuần mới nhất trong sheet
  "Đánh giá cung tuyến tuần" (vì cả gợi ý, cảnh báo, điểm số đều được workflow tạo cùng lúc
  mỗi thứ 7 20h) — nếu vì lý do nào đó workflow không chạy đúng lịch, số liệu "tuần này" trên
  web có thể tạm thời không khớp 100% với sheet "Gợi ý tập trung".
- Toàn bộ dữ liệu đọc theo thời gian thực mỗi lần tải trang (không cache dài hạn) — nếu Google
  Sheets có rất nhiều dòng, thời gian tải trang có thể chậm hơn; có thể tối ưu thêm bằng cách
  cache (Next.js `revalidate`) nếu cần trong tương lai.
