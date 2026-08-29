import type { MetadataRoute } from "next";

// Cấu hình PWA — cho phép "cài" web như ứng dụng trên điện thoại (Thêm vào màn hình chính).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quản lý PS Phú Thọ",
    short_name: "PS Phú Thọ",
    description: "Quản lý cung tuyến, doanh số, KPI — Nhóm Hà Trọng Thủy",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1baf7a",
    orientation: "portrait",
    lang: "vi",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
