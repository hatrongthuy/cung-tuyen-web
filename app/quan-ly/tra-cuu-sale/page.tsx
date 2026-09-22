import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import { TEN_NHOM_HIEN_THI } from "@/lib/scope";

export const metadata = { title: "Tra cứu Sale" };

// Trang tra cứu Sale — nhúng bảng tra cứu tĩnh (public/sale.html) trong khung app,
// hiển thị như một mục điều hướng bình thường của khu quản lý.
export default async function TraCuuSalePage() {
  const session = await auth();
  const user = session!.user!;

  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="manager" active="tra-cuu-sale" />
      <main className="flex-1">
        <iframe
          src="/sale.html?embed=1"
          title={`Tra cứu Sale — Nhóm ${TEN_NHOM_HIEN_THI}`}
          className="block h-[calc(100dvh-104px)] w-full border-0"
        />
      </main>
    </>
  );
}
