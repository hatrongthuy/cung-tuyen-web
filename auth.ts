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
