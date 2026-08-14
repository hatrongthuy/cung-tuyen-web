import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import ChatManagerView from "@/components/ChatManagerView";
import { chuanHoaMaNV, getTroChuyen } from "@/lib/data";
import { allEmployees } from "@/lib/allowlist";
import type { ChatMessage } from "@/components/ChatBox";

export default async function TroChuyenPage() {
  const session = await auth();
  const user = session!.user!;

  const rows = await getTroChuyen();
  const employees = allEmployees().map((e) => ({ maNhanVien: e.maNhanVien ?? "", hoTen: e.hoTen }));

  const toMessage = (r: (typeof rows)[number]): ChatMessage => ({
    thoiGian: r["Thời gian"],
    maGui: chuanHoaMaNV(r["Mã người gửi"]),
    tenGui: r["Tên người gửi"],
    noiDung: r["Nội dung"],
  });

  const sorted = [...rows].sort((a, b) => (a["Thời gian"] > b["Thời gian"] ? 1 : -1));

  const groupMessages = sorted.filter((r) => r["Loại"] === "nhom").map(toMessage);

  const privateMessagesByEmployee: Record<string, ChatMessage[]> = {};
  for (const nv of employees) {
    const ma = chuanHoaMaNV(nv.maNhanVien);
    privateMessagesByEmployee[ma] = sorted
      .filter(
        (r) =>
          r["Loại"] === "rieng" &&
          (chuanHoaMaNV(r["Mã người gửi"]) === ma || chuanHoaMaNV(r["Mã người nhận"]) === ma)
      )
      .map(toMessage);
  }

  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="manager" active="tro-chuyen" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Trò chuyện</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Nhắn tin riêng với từng nhân viên hoặc trò chuyện chung cả nhóm.
          </p>
        </div>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <ChatManagerView
            employees={employees}
            groupMessages={groupMessages}
            privateMessagesByEmployee={privateMessagesByEmployee}
          />
        </section>
      </main>
    </>
  );
}
