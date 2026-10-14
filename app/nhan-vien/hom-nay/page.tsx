import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import HomNayLamGiView from "@/components/HomNayLamGiView";
import {
  getDanhGiaCungTuyen,
  getGoiYTapTrung,
  getXacNhanGoiY,
  getCanhBaoChuaViengTham,
  getCanhBaoKhachChet,
  getCanhBaoSanPhamNghi,
} from "@/lib/data";
import { buildEmployeeWeekSummaries } from "@/lib/aggregate";
import { buildCareByEmp } from "@/lib/report-utils";
import { buildTodayActions } from "@/lib/today-actions";

import { TEN_NHOM_HIEN_THI } from "@/lib/scope";

export const dynamic = "force-dynamic";

export default async function NhanVienHomNayPage() {
  const session = await auth();
  const user = session!.user!;

  const [danhGia, goiY, xacNhan, chuaVT, khChet, spNghi] = await Promise.all([
    getDanhGiaCungTuyen(),
    getGoiYTapTrung(),
    getXacNhanGoiY(),
    getCanhBaoChuaViengTham(),
    getCanhBaoKhachChet(),
    getCanhBaoSanPhamNghi(),
  ]);

  const { weekLabel, summaries } = buildEmployeeWeekSummaries(goiY, xacNhan, danhGia);
  const careByEmp = buildCareByEmp(chuaVT, khChet, spNghi);
  const actions = buildTodayActions(weekLabel, summaries, careByEmp);

  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="employee" active="hom-nay" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <HomNayLamGiView
          teamName={TEN_NHOM_HIEN_THI}
          actions={actions}
          onlyMa={user.maNhanVien ?? undefined}
          title="Hôm nay làm gì"
        />
      </main>
    </>
  );
}
