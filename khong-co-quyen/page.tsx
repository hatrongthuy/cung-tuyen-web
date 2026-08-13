import { auth, signOut } from "@/auth";

export default async function KhongCoQuyenPage() {
  const session = await auth();

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-4 text-4xl">🚫</div>
        <h1 className="text-lg font-semibold text-slate-900">Không có quyền truy cập</h1>
        <p className="mt-2 text-sm text-slate-500">
          Tài khoản <b>{session?.user?.email}</b> chưa được cấp quyền sử dụng ứng dụng này.
          Vui lòng liên hệ quản lý nhóm để được thêm vào danh sách truy cập.
        </p>
        <form
          className="mt-6"
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/dang-nhap" });
          }}
        >
          <button
            type="submit"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Đăng xuất và thử tài khoản khác
          </button>
        </form>
      </div>
    </main>
  );
}
