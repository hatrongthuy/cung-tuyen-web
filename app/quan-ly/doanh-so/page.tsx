import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import DoanhSoView from "@/components/DoanhSoView";
import { getKpiTabData } from "@/lib/kpi";
import { getTeamSales } from "@/lib/sales";
import { salesByMonth } from "@/lib/report-utils";

// Tên nhóm SS dùng để lọc dữ liệu doanh số — cố định theo nhóm quản lý của app này.
const TEN_NHOM = "Hà Trọng Thủy";

export default async function DoanhSoPage() {
  const session = await auth();
  const user = session!.user!;

  const [plan, sales] = await Promise.all([getKpiTabData("doanh-so", TEN_NHOM), getTeamSales()]);

  // Lấy tháng mới nhất có dữ liệu Sale (tránh phụ thuộc đồng hồ máy chủ).
  const latest = sales.txns.reduce(
    (b, t) => {
      const k = t.nam * 12 + t.thang;
      return k > b.k ? { k, nam: t.nam, thang: t.thang } : b;
    },
    { k: 0, nam: new Date().getFullYear(), thang: new Date().getMonth() + 1 }
  );
  const keDonByCode = salesByMonth(sales.txns, latest.nam, latest.thang, "keDon");
  const thauByCode = salesByMonth(sales.txns, latest.nam, latest.thang, "thau");
  const actualMonthLabel = `${String(latest.thang).padStart(2, "0")}/${latest.nam}`;

  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="manager" active="doanh-so" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <DoanhSoView
          columns={plan.columns}
          rows={plan.rows}
          error={plan.error}
          teamName={TEN_NHOM}
          keDonByCode={keDonByCode}
          thauByCode={thauByCode}
          actualMonthLabel={actualMonthLabel}
          salesError={sales.error}
        />
      </main>
    </>
  );
}
