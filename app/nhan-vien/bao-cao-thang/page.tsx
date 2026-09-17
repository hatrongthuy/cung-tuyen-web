import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import BaoCaoThangReport from "@/components/BaoCaoThangReport";
import { getDanhGiaCungTuyen } from "@/lib/data";
import { getKpiTabData } from "@/lib/kpi";
import { getTeamSales } from "@/lib/sales";
import { monthKeyOf, todayInVN } from "@/lib/report-utils";

const TEN_NHOM = "Hà Trọng Thủy";

export const dynamic = "force-dynamic";

export default async function NhanVienBaoCaoThangPage() {
  const session = await auth();
  const user = session!.user!;

  const [danhGia, doanhSo, kpis, sales] = await Promise.all([
    getDanhGiaCungTuyen(),
    getKpiTabData("doanh-so", TEN_NHOM),
    getKpiTabData("kpis", TEN_NHOM),
    getTeamSales(),
  ]);

  const today = todayInVN();
  const soNgayThang = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const pctThoiGianThangHienTai = (today.getDate() / soNgayThang) * 100;

  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="employee" active="bao-cao-thang" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <BaoCaoThangReport
          danhGia={danhGia}
          doanhSo={doanhSo}
          kpis={kpis}
          teamName={TEN_NHOM}
          salesTxns={sales.txns}
          salesError={sales.error}
          kpiError={kpis.error ?? doanhSo.error}
          todayMonthKey={monthKeyOf(today)}
          pctThoiGianThangHienTai={pctThoiGianThangHienTai}
        />
      </main>
    </>
  );
}
