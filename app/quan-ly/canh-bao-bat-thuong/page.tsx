import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import CanhBaoBatThuongView from "@/components/CanhBaoBatThuongView";
import { getSaleDetailData } from "@/lib/sale-detail";
import { buildAnomaly } from "@/lib/customer-analytics";

import { TEN_NHOM_HIEN_THI } from "@/lib/scope";

export const dynamic = "force-dynamic";

export default async function CanhBaoBatThuongPage() {
  const session = await auth();
  const user = session!.user!;

  const data = await getSaleDetailData();
  const anomaly = buildAnomaly(data);

  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="manager" active="canh-bao-bat-thuong" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <CanhBaoBatThuongView teamName={TEN_NHOM_HIEN_THI} data={anomaly} />
      </main>
    </>
  );
}
