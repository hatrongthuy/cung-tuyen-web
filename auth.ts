import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { findAllowlistEntry, type Role } from "@/lib/allowlist";

declare module "next-auth" {
  interface Session {
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: Role | null;
      maNhanVien?: string | null;
      allowed?: boolean;
    };
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
  ],
  pages: {
    signIn: "/dang-nhap",
  },
  callbacks: {
    async signIn() {
      // Không chặn ở đây — để còn đưa được người dùng tới trang "không có quyền truy cập"
      // với thông tin rõ ràng thay vì bị Google/NextAuth từ chối âm thầm.
      return true;
    },
    async jwt({ token }) {
      const entry = findAllowlistEntry(token.email);
      token.role = entry?.role ?? null;
      token.maNhanVien = entry?.maNhanVien ?? null;
      token.allowed = !!entry;

      // Bộ đếm đăng nhập: mỗi người dùng ĐƯỢC PHÉP ghi 1 dòng "có mặt" mỗi NGÀY (giờ VN).
      // Throttle bằng chính token nên tải lại trang nhiều lần trong ngày không ghi thêm.
      if (entry && token.email) {
        const today = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Ho_Chi_Minh",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date()); // yyyy-mm-dd theo giờ VN
        if ((token as Record<string, unknown>).lastLoginLog !== today) {
          (token as Record<string, unknown>).lastLoginLog = today;
          try {
            const { logLogin } = await import("@/lib/login-log");
            // Không để việc ghi log làm chậm/hỏng đăng nhập: giới hạn 3s, nuốt mọi lỗi.
            await Promise.race([
              logLogin(String(token.email), String(token.name ?? entry.hoTen ?? "")),
              new Promise((resolve) => setTimeout(resolve, 3000)),
            ]);
          } catch {
            // bỏ qua — không ảnh hưởng đăng nhập
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = (token.role as Role | null) ?? null;
        session.user.maNhanVien = (token.maNhanVien as string | null) ?? null;
        session.user.allowed = !!token.allowed;
      }
      return session;
    },
  },
});
