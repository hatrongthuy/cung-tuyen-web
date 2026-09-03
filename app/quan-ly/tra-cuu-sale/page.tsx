import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";

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
          title="Tra cứu Sale — Nhóm Hà Trọng Thủy"
          className="block h-[calc(100dvh-104px)] w-full border-0"
        />
      </main>
    </>
  );
}
