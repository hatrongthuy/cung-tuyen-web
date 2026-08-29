import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaSetup from "@/components/PwaSetup";

export const metadata: Metadata = {
  title: "Cung tuyến tuần — Nhóm Hà Trọng Thủy",
  description: "Ứng dụng quản lý cung tuyến tuần cho trình dược viên",
  applicationName: "PS Phú Thọ",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PS Phú Thọ",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1baf7a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {children}
        <PwaSetup />
      </body>
    </html>
  );
}
