import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import DoiNhomView from "@/components/DoiNhomView";
import { getDanhGiaCungTuyen, getGoiYTapTrung, getXacNhanGoiY, getLichSuGoiY } from "@/lib/data";
import { buildEmployeeWeekSummaries, buildTonDongTuanTruoc } from "@/lib/aggregate";
import { getTeamSales } from "@/lib/sales";
import { todayInVN } from "@/lib/report-utils";

const TEN_NHOM = "Hà Trọng Thủy";

export const dynamic = "force-dynamic";

export default async function DoiNhomPage() {
  const session = await auth();
  const user = session!.user!;

  const [danhGia, goiY, xacNhan, lichSu, sales] = await Promise.all([
    getDanhGiaCungTuyen(),
    getGoiYTapTrung(),
    getXacNhanGoiY(),
    getLichSuGoiY(),
    getTeamSales(),
  ]);
  const { summaries } = buildEmployeeWeekSummaries(goiY, xacNhan, danhGia);
  const tonDong = buildTonDongTuanTruoc(lichSu, xacNhan);

  const today = todayInVN();
  const nam = today.getFullYear();
  const thang = today.getMonth() + 1; // 1..12
  const ngay = today.getDate();

  // Tháng này: 01 -> hôm nay. Cùng kỳ tháng trước: 01 -> cùng ngày (kẹp theo số ngày của tháng trước).
  const monthStartMs = new Date(nam, thang - 1, 1).getTime();
  const nowMs = new Date(nam, thang - 1, ngay, 23, 59, 59, 999).getTime();
  const lastMonthStartMs = new Date(nam, thang - 2, 1).getTime();
  const soNgayThangTruoc = new Date(nam, thang - 1, 0).getDate();
  const ngayTruoc = Math.min(ngay, soNgayThangTruoc);
  const lastMonthSameMs = new Date(nam, thang - 2, ngayTruoc, 23, 59, 59, 999).getTime();
  const lmDate = new Date(nam, thang - 2, 1);
  const lastMonthLabel = `${String(lmDate.getMonth() + 1).padStart(2, "0")}/${lmDate.getFullYear()}`;

  const ctx = {
    nam,
    thang,
    ngay,
    monthStartMs,
    nowMs,
    lastMonthStartMs,
    lastMonthSameMs,
    lastMonthLabel,
  };

  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="manager" active="doi-nhom" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <DoiNhomView
          teamName={TEN_NHOM}
          salesTxns={sales.txns}
          salesError={sales.error}
          summaries={summaries}
          tonDong={tonDong}
          ctx={ctx}
        />
      </main>
    </>
  );
}
