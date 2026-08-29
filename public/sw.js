// Service worker TỐI THIỂU — chỉ để web đủ điều kiện "cài như ứng dụng" (PWA).
// KHÔNG cache trang có đăng nhập để tránh hiển thị dữ liệu cũ; mọi request vẫn đi mạng như
// bình thường. Nhờ vậy khi web cập nhật, app tự cập nhật theo, không bị kẹt bản cũ.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // Không gọi respondWith -> trình duyệt tự xử lý (đi thẳng ra mạng). Chỉ cần có handler này
  // là đủ để trình duyệt cho phép cài đặt.
});
