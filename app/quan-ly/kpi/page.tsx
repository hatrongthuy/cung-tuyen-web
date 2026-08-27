import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import KpiView from "@/components/KpiView";
import { KPI_TABS, getAllKpiTabsData } from "@/lib/kpi";
import { getTeamSales } from "@/lib/sales";
import { salesByMonth, normalizeMaNV } from "@/lib/report-utils";
import { allEmployees } from "@/lib/allowlist";

// Tên nhóm SS dùng để lọc dữ liệu KPI — cố định theo nhóm quản lý của app này.
const TEN_NHOM = "Hà Trọng Thủy";

export default async function KpiPage() {
  const session = await auth();
  const user = session!.user!;

  const [{ dataByTab, error }, sales] = await Promise.all([
    getAllKpiTabsData(TEN_NHOM),
    getTeamSales(),
  ]);
  const tabs = KPI_TABS.map((t) => ({ key: t.key, label: t.label }));

  // Doanh số THỰC HIỆN tháng hiện tại (từ file Sale), theo từng nhân viên trong nhóm.
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const actualByCode = salesByMonth(sales.txns, y, m);
  const salesSummary = {
    monthLabel: `${String(m).padStart(2, "0")}/${y}`,
    error: sales.error,
    rows: allEmployees().map((e) => ({
      ten: e.hoTen,
      doanhThu: actualByCode[normalizeMaNV(e.maNhanVien)] ?? 0,
    })),
  };

  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="manager" active="kpi" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <KpiView tabs={tabs} dataByTab={dataByTab} error={error} salesSummary={salesSummary} actualByCode={actualByCode} />
      </main>
    </>
  );
}
