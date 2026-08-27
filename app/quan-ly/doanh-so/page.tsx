import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import DoanhSoView from "@/components/DoanhSoView";
import { getKpiTabData } from "@/lib/kpi";

// Tên nhóm SS dùng để lọc dữ liệu doanh số — cố định theo nhóm quản lý của app này.
const TEN_NHOM = "Hà Trọng Thủy";

export default async function DoanhSoPage() {
  const session = await auth();
  const user = session!.user!;

  const { columns, rows, error } = await getKpiTabData("doanh-so", TEN_NHOM);

  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="manager" active="doanh-so" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <DoanhSoView columns={columns} rows={rows} error={error} teamName={TEN_NHOM} />
      </main>
    </>
  );
}
