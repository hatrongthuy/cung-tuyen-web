import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import KpiView from "@/components/KpiView";
import { KPI_TABS, getAllKpiTabsData } from "@/lib/kpi";

// Tên nhóm SS dùng để lọc dữ liệu KPI — cố định theo nhóm quản lý của app này.
const TEN_NHOM = "Hà Trọng Thủy";

export default async function KpiPage() {
  const session = await auth();
  const user = session!.user!;

  const dataByTab = await getAllKpiTabsData(TEN_NHOM);
  const tabs = KPI_TABS.map((t) => ({ key: t.key, label: t.label }));

  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="manager" active="kpi" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <KpiView tabs={tabs} dataByTab={dataByTab} />
      </main>
    </>
  );
}
