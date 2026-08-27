import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import MonthlyReportView from "@/components/MonthlyReportView";
import { getDanhGiaCungTuyen } from "@/lib/data";
import { getKpiTabData } from "@/lib/kpi";

const TEN_NHOM = "Hà Trọng Thủy";

export default async function BaoCaoThangPage() {
  const session = await auth();
  const user = session!.user!;

  const [danhGia, doanhSo, kpis] = await Promise.all([
    getDanhGiaCungTuyen(),
    getKpiTabData("doanh-so", TEN_NHOM),
    getKpiTabData("kpis", TEN_NHOM),
  ]);

  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="manager" active="bao-cao-thang" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <MonthlyReportView danhGia={danhGia} doanhSo={doanhSo} kpis={kpis} teamName={TEN_NHOM} />
      </main>
    </>
  );
}
