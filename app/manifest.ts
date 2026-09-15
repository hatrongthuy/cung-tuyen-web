import type { MetadataRoute } from "next";
import { APP_SHORT_NAME, APP_DESCRIPTION } from "@/lib/scope";

// Cấu hình PWA — cho phép "cài" web như ứng dụng trên điện thoại (Thêm vào màn hình chính).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `Quản lý ${APP_SHORT_NAME}`,
    short_name: APP_SHORT_NAME,
    description: APP_DESCRIPTION,
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
