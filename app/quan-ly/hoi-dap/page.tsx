import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import HoiDapView from "@/components/HoiDapView";

export const metadata = { title: "Trợ lý AI — Hỏi đáp" };

export default async function HoiDapPage() {
  const session = await auth();
  const user = session!.user!;
  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="manager" active="hoi-dap" />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        <HoiDapView />
      </main>
    </>
  );
}
