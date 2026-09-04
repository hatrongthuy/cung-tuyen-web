import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import DoanhSoView from "@/components/DoanhSoView";
import { getKpiTabData } from "@/lib/kpi";
import { getTeamSales } from "@/lib/sales";
import { salesByMonth, normalizeMaNV } from "@/lib/report-utils";

// Tên nhóm SS dùng để lọc dữ liệu doanh số — cố định theo nhóm quản lý của app này.
const TEN_NHOM = "Hà Trọng Thủy";

function findMaCol(columns: string[]): string | null {
  return columns.find((c) => /mã\s*nv|mã\s*nhân/i.test(c)) ?? null;
}

// Trang Doanh số cá nhân cho nhân viên — chỉ hiển thị đúng dòng của người đang đăng nhập.
export default async function DoanhSoNhanVienPage() {
  const session = await auth();
  const user = session!.user!;
  const meMa = normalizeMaNV(user.maNhanVien);

  const [plan, sales] = await Promise.all([getKpiTabData("doanh-so", TEN_NHOM), getTeamSales()]);

  const maCol = findMaCol(plan.columns);
  const myRows = maCol ? plan.rows.filter((r) => normalizeMaNV(r[maCol]) === meMa) : [];

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
      <AppHeader hoTen={user.name ?? ""} role="employee" active="doanh-so" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <DoanhSoView
          columns={plan.columns}
          rows={myRows}
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
