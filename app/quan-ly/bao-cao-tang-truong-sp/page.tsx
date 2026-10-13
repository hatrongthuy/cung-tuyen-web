import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import TangTruongSanPhamView from "@/components/TangTruongSanPhamView";
import { getSaleDetailData } from "@/lib/sale-detail";
import { buildProductGrowth } from "@/lib/product-growth";
import { todayInVN } from "@/lib/report-utils";

import { TEN_NHOM_HIEN_THI } from "@/lib/scope";

// Luôn tính số liệu mới nhất mỗi lần mở (doanh số cập nhật hằng ngày).
export const dynamic = "force-dynamic";

export default async function BaoCaoTangTruongSpPage() {
  const session = await auth();
  const user = session!.user!;

  const data = await getSaleDetailData();
  const result = buildProductGrowth(data, todayInVN());

  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="manager" active="tang-truong-sp" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <TangTruongSanPhamView teamName={TEN_NHOM_HIEN_THI} result={result} />
      </main>
    </>
  );
}
