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

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const actualByCode = salesByMonth(sales.txns, y, m);
  const actualMonthLabel = `${String(m).padStart(2, "0")}/${y}`;

  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="manager" active="doanh-so" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <DoanhSoView
          columns={plan.columns}
          rows={plan.rows}
          error={plan.error}
          teamName={TEN_NHOM}
          actualByCode={actualByCode}
          actualMonthLabel={actualMonthLabel}
          salesError={sales.error}
        />
      </main>
    </>
  );
}
