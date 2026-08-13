import { signIn, auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DangNhapPage() {
  const session = await auth();
  if (session?.user) {
    if (session.user.allowed && session.user.role) {
      const roleHome: Record<string, string> = {
        manager: "/quan-ly",
        superior: "/cap-tren",
        employee: "/nhan-vien",
      };
      redirect(roleHome[session.user.role]);
    }
    redirect("/khong-co-quyen");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-slate-900">Cung tuyến tuần</h1>
          <p className="mt-1 text-sm text-slate-500">Nhóm Hà Trọng Thủy</p>
        </div>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path
                fill="#FFC107"
                d="M43.6 20.5H42V20H24v8h11.3C33.8 32.5 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
              />
              <path
                fill="#FF3D00"
                d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.4 0-13.7 4.2-16.9 10.3z"
              />
              <path
                fill="#4CAF50"
                d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35.5 26.8 36 24 36c-5.2 0-9.7-3.5-11.3-8.2l-6.5 5C9.1 39.8 15.9 44 24 44z"
              />
              <path
                fill="#1976D2"
                d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.3 5.3C41 35.6 44 30.4 44 24c0-1.3-.1-2.7-.4-3.5z"
              />
            </svg>
            Đăng nhập bằng Google
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-400">
          Chỉ dùng được với email công ty (@cpc1hn.com.vn)
        </p>
      </div>
    </main>
  );
}
