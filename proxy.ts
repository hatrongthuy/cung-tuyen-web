import { auth } from "@/auth";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/dang-nhap", "/khong-co-quyen"];

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;

  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const session = req.auth;

  if (!session?.user) {
    const url = new URL("/dang-nhap", req.nextUrl.origin);
    return NextResponse.redirect(url);
  }

  if (!session.user.allowed || !session.user.role) {
    const url = new URL("/khong-co-quyen", req.nextUrl.origin);
    return NextResponse.redirect(url);
  }

  const role = session.user.role;
  const roleHome: Record<string, string> = {
    manager: "/quan-ly",
    superior: "/cap-tren",
    employee: "/nhan-vien",
  };

  // Mỗi vai trò chỉ được vào đúng khu vực của mình.
  if (pathname.startsWith("/quan-ly") && role !== "manager") {
    return NextResponse.redirect(new URL(roleHome[role], req.nextUrl.origin));
  }
  if (pathname.startsWith("/cap-tren") && role !== "superior") {
    return NextResponse.redirect(new URL(roleHome[role], req.nextUrl.origin));
  }
  if (pathname.startsWith("/nhan-vien") && role !== "employee") {
    return NextResponse.redirect(new URL(roleHome[role], req.nextUrl.origin));
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL(roleHome[role], req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
