import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import KhachHangView from "@/components/KhachHangView";
import { getSaleDetailData } from "@/lib/sale-detail";
import { buildCustomerRFM } from "@/lib/customer-analytics";

import { TEN_NHOM_HIEN_THI } from "@/lib/scope";

export const dynamic = "force-dynamic";

export default async function KhachHangPage() {
  const session = await auth();
  const user = session!.user!;

  const data = await getSaleDetailData();
  const rfm = buildCustomerRFM(data);

  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="manager" active="khach-hang" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <KhachHangView teamName={TEN_NHOM_HIEN_THI} rfm={rfm} />
      </main>
    </>
  );
}
