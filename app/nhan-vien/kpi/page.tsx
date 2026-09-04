import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import KpiView from "@/components/KpiView";
import { KPI_TABS, getAllKpiTabsData } from "@/lib/kpi";
import { getTeamSales } from "@/lib/sales";
import { salesByMonth, normalizeMaNV } from "@/lib/report-utils";

// Tên nhóm SS dùng để lọc dữ liệu KPI — cố định theo nhóm quản lý của app này.
const TEN_NHOM = "Hà Trọng Thủy";

function findMaCol(columns: string[]): string | null {
  return columns.find((c) => /mã\s*nv|mã\s*nhân/i.test(c)) ?? null;
}

// Trang KPI cá nhân cho nhân viên — chỉ hiển thị đúng dòng của người đang đăng nhập.
export default async function KpiNhanVienPage() {
  const session = await auth();
  const user = session!.user!;
  const meMa = normalizeMaNV(user.maNhanVien);

  const [{ dataByTab, error }, sales] = await Promise.all([
    getAllKpiTabsData(TEN_NHOM),
    getTeamSales(),
  ]);
  const tabs = KPI_TABS.map((t) => ({ key: t.key, label: t.label }));

  // Lọc mỗi tab về đúng dòng của nhân viên đang đăng nhập (theo Mã NV).
  const myDataByTab: Record<string, { columns: string[]; rows: Record<string, string>[] }> = {};
  for (const [key, tab] of Object.entries(dataByTab)) {
    const maCol = findMaCol(tab.columns);
    myDataByTab[key] = {
      columns: tab.columns,
      rows: maCol ? tab.rows.filter((r) => normalizeMaNV(r[maCol]) === meMa) : [],
    };
  }

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
    rows: [
      {
        ten: user.name ?? "",
        keDon: keDonByCode[meMa] ?? 0,
        thau: thauByCode[meMa] ?? 0,
      },
    ],
  };

  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="employee" active="kpi" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <KpiView
          tabs={tabs}
          dataByTab={myDataByTab}
          error={error}
          salesSummary={salesSummary}
          keDonByCode={keDonByCode}
          thauByCode={thauByCode}
        />
      </main>
    </>
  );
}
