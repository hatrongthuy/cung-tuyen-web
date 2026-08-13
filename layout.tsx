import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cung tuyến tuần — Nhóm Hà Trọng Thủy",
  description: "Ứng dụng quản lý cung tuyến tuần cho trình dược viên",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
