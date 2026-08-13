import { signOut } from "@/auth";
import type { Role } from "@/lib/allowlist";

const ROLE_LABEL: Record<Role, string> = {
  manager: "Quản lý nhóm",
  superior: "Cấp trên (ASM)",
  employee: "Trình dược viên",
};

export default function AppHeader({
  hoTen,
  role,
  weekLabel,
}: {
  hoTen: string;
  role: Role;
  weekLabel?: string | null;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div>
          <h1 className="text-sm font-semibold text-slate-900 sm:text-base">
            Cung tuyến tuần — Nhóm Hà Trọng Thủy
          </h1>
          <p className="text-xs text-slate-500">
            {hoTen} · {ROLE_LABEL[role]}
            {weekLabel ? ` · Tuần: ${weekLabel}` : ""}
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/dang-nhap" });
          }}
        >
          <button
            type="submit"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Đăng xuất
          </button>
        </form>
      </div>
    </header>
  );
}
