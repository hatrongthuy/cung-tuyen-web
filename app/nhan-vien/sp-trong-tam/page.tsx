import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import SpTrongTamView from "@/components/SpTrongTamView";
import { getSaleDetailData, buildSptt } from "@/lib/sale-detail";
import { todayInVN } from "@/lib/report-utils";

const TEN_NHOM = "Hà Trọng Thủy";

export const dynamic = "force-dynamic";

export default async function SpTrongTamNhanVienPage() {
  const session = await auth();
  const user = session!.user!;

  const data = await getSaleDetailData();
  // Chỉ dữ liệu của nhân viên đang đăng nhập.
  const onlyTid = data.tdv.indexOf(user.name ?? "");

  const today = todayInVN();
  const nam = today.getFullYear();
  const thang = today.getMonth() + 1;
  const ngay = today.getDate();

  const monthStartMs = new Date(nam, thang - 1, 1).getTime();
  const nowMs = new Date(nam, thang - 1, ngay, 23, 59, 59, 999).getTime();
  const lastMonthStartMs = new Date(nam, thang - 2, 1).getTime();
  const soNgayThangTruoc = new Date(nam, thang - 1, 0).getDate();
  const ngayTruoc = Math.min(ngay, soNgayThangTruoc);
  const lastMonthSameMs = new Date(nam, thang - 2, ngayTruoc, 23, 59, 59, 999).getTime();
  const lmDate = new Date(nam, thang - 2, 1);
  const lastMonthLabel = `${String(lmDate.getMonth() + 1).padStart(2, "0")}/${lmDate.getFullYear()}`;

  const sptt = buildSptt(data, monthStartMs, nowMs, lastMonthStartMs, lastMonthSameMs, onlyTid >= 0 ? onlyTid : -1);

  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="employee" active="sp-trong-tam" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <SpTrongTamView teamName={TEN_NHOM} sptt={sptt} ngay={ngay} thang={thang} nam={nam} lastMonthLabel={lastMonthLabel} mine />
      </main>
    </>
  );
}
