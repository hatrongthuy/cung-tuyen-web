import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";

export const metadata = { title: "Tra cứu Sale của tôi" };

// Trang tra cứu Sale cá nhân cho nhân viên — nhúng public/sale.html và khoá bộ lọc
// theo đúng tên người đang đăng nhập (tham số ?me=), nên mỗi TDV chỉ thấy dữ liệu của mình.
export default async function TraCuuSaleNhanVienPage() {
  const session = await auth();
  const user = session!.user!;
  const me = encodeURIComponent(user.name ?? "");

  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="employee" />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 pt-4">
          <a
            href="/nhan-vien"
            className="text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            ← Về trang cá nhân
          </a>
        </div>
        <iframe
          src={`/sale.html?embed=1&me=${me}`}
          title="Tra cứu Sale của tôi"
          className="block h-[calc(100dvh-132px)] w-full border-0"
        />
      </main>
    </>
  );
}
