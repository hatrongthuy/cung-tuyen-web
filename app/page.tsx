import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Trang chủ chỉ dùng để điều hướng — proxy.ts đã xử lý redirect theo vai trò cho hầu hết
// trường hợp, trang này là lớp dự phòng.
export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/dang-nhap");
  }
  if (!session.user.allowed || !session.user.role) {
    redirect("/khong-co-quyen");
  }

  const roleHome: Record<string, string> = {
    manager: "/quan-ly",
    superior: "/cap-tren",
    employee: "/nhan-vien",
  };
  redirect(roleHome[session.user.role]);
}
