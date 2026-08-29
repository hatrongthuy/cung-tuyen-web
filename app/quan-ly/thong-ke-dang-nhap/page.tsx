import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import LoginStatsView from "@/components/LoginStatsView";
import { getLichSuDangNhap } from "@/lib/data";
import { buildLoginStats } from "@/lib/login-stats";
import { todayInVN } from "@/lib/report-utils";

export default async function ThongKeDangNhapPage() {
  const session = await auth();
  const user = session!.user!;
  // Chỉ quản lý / cấp trên mới xem được thống kê hoạt động của mọi người.
  if (user.role !== "manager" && user.role !== "superior") {
    redirect("/khong-co-quyen");
  }

  const rows = await getLichSuDangNhap();
  const stats = buildLoginStats(rows, todayInVN());

  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="manager" active="dang-nhap" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <LoginStatsView stats={stats} totalRows={rows.length} />
      </main>
    </>
  );
}
