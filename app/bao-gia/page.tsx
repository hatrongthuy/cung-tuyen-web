import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import BaoGiaView from "@/components/BaoGiaView";
import type { Role } from "@/lib/allowlist";

export const metadata = {
  title: "Báo giá sản phẩm — CPC1 Hà Nội",
};

export default async function BaoGiaPage() {
  const session = await auth();
  const user = session!.user!;
  const hoTen = user.name ?? "";
  const role = (user.role ?? "employee") as Role;

  return (
    <>
      <AppHeader hoTen={hoTen} role={role} active="bao-gia" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-slate-900">Báo giá sản phẩm</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tải bộ báo giá PDF gửi khách hàng, hoặc tra nhanh giá từng sản phẩm ngay trên trang.
          </p>
        </div>
        <BaoGiaView />
      </main>
    </>
  );
}
