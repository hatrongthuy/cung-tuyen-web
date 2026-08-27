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

  // Doanh số THỰC HIỆN (từ file Sale) — lấy tháng mới nhất có dữ liệu, tách kê đơn / thầu.
  const latest = sales.txns.reduce(
    (b, t) => {
      const k = t.nam * 12 + t.thang;
      return k > b.k ? { k, nam: t.nam, thang: t.thang } : b;
    },
    { k: 0, nam: new Date().getFullYear(), thang: new Date().getMonth() + 1 }
  );
  const keDonByCode = salesByMonth(sales.txns, latest.nam, latest.thang, "keDon");
  const thauByCode = salesByMonth(sales.txns, latest.nam, latest.thang, "thau");
  const salesSummary = {
    monthLabel: `${String(latest.thang).padStart(2, "0")}/${latest.nam}`,
    error: sales.error,
    rows: allEmployees().map((e) => {
      const ma = normalizeMaNV(e.maNhanVien);
      return {
        ten: e.hoTen,
        keDon: keDonByCode[ma] ?? 0,
        thau: thauByCode[ma] ?? 0,
      };
    }),
  };

  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="manager" active="kpi" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <KpiView
          tabs={tabs}
          dataByTab={dataByTab}
          error={error}
          salesSummary={salesSummary}
          keDonByCode={keDonByCode}
          thauByCode={thauByCode}
        />
      </main>
    </>
  );
}
