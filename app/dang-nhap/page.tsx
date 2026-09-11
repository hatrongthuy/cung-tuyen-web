import { AuthError } from "next-auth";
import { signIn, auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DangNhapPage({
  searchParams,
}: {
  searchParams: Promise<{ loi?: string }>;
}) {
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

  const { loi } = await searchParams;

  async function doLogin(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        hoTen: String(formData.get("hoTen") ?? ""),
        maNhanVien: String(formData.get("maNhanVien") ?? ""),
        redirectTo: "/",
      });
    } catch (error) {
      if (error instanceof AuthError) {
        redirect("/dang-nhap?loi=1");
      }
      throw error; // để next chuyển hướng thành công đi qua
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-slate-900">Cung tuyến tuần</h1>
          <p className="mt-1 text-sm text-slate-500">Nhóm Hà Trọng Thủy</p>
        </div>

        {loi && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-center text-xs text-red-700">
            Họ tên hoặc mã nhân viên chưa đúng. Vui lòng thử lại.
          </p>
        )}

        <form action={doLogin} className="space-y-3">
          <div>
            <label htmlFor="hoTen" className="block text-xs font-medium text-slate-600">
              Họ và tên
            </label>
            <input
              id="hoTen"
              name="hoTen"
              type="text"
              required
              autoComplete="name"
              placeholder="Ví dụ: Nguyễn Văn A"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500"
            />
          </div>
          <div>
            <label htmlFor="maNhanVien" className="block text-xs font-medium text-slate-600">
              Mã nhân viên (mật khẩu)
            </label>
            <input
              id="maNhanVien"
              name="maNhanVien"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Nhập mã nhân viên"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
          >
            Đăng nhập
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          Đăng nhập bằng họ tên và mã nhân viên của bạn
        </p>
      </div>
    </main>
  );
}
