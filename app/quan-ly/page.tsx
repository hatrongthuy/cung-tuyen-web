import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import HomeHero from "@/components/HomeHero";

// TRANG CHỦ (quản lý) — trang riêng, chỉ lời chào + ảnh trụ sở. Bảng cung tuyến ở mục "Cung tuyến".
export default async function QuanLyHomePage() {
  const session = await auth();
  const user = session!.user!;
  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="manager" active="trang-chu" />
      <main className="flex-1">
        <HomeHero hoTen={user.name ?? ""} role="manager" />
      </main>
    </>
  );
}
