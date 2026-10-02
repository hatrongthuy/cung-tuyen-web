import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import HomeHero from "@/components/HomeHero";

// TRANG CHỦ (nhân viên) — trang riêng, chỉ lời chào + ảnh trụ sở. Việc & cung tuyến ở mục "Cung tuyến".
export default async function NhanVienHomePage() {
  const session = await auth();
  const user = session!.user!;
  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="employee" active="trang-chu" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <HomeHero hoTen={user.name ?? ""} roleLabel="Nhân viên" />
      </main>
    </>
  );
}
