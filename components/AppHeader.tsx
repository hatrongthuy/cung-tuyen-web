import Link from "next/link";
import { signOut } from "@/auth";
import type { Role } from "@/lib/allowlist";

const ROLE_LABEL: Record<Role, string> = {
  manager: "Quản lý nhóm",
  superior: "Cấp trên (ASM)",
  employee: "Trình dược viên",
};

export type NavKey =
  | "cung-tuyen"
  | "bao-cao-tuan"
  | "bao-cao-thang"
  | "bao-cao-thau"
  | "kpi"
  | "doanh-so"
  | "tro-chuyen";

const NAV_ITEMS: { key: NavKey; label: string; href: string }[] = [
  { key: "cung-tuyen", label: "Cung tuyến", href: "/quan-ly" },
  { key: "bao-cao-tuan", label: "Báo cáo tuần", href: "/quan-ly/bao-cao-tuan" },
  { key: "bao-cao-thang", label: "Báo cáo tháng", href: "/quan-ly/bao-cao-thang" },
  { key: "bao-cao-thau", label: "Báo cáo thầu", href: "/quan-ly/bao-cao-thau" },
  { key: "kpi", label: "KPI", href: "/quan-ly/kpi" },
  { key: "doanh-so", label: "Doanh số", href: "/quan-ly/doanh-so" },
  { key: "tro-chuyen", label: "Trò chuyện", href: "/quan-ly/tro-chuyen" },
];

export default function AppHeader({
  hoTen,
  role,
  weekLabel,
  active,
}: {
  hoTen: string;
  role: Role;
  weekLabel?: string | null;
  /** Mục đang được chọn trên menu điều hướng — chỉ hiển thị menu khi có giá trị này và role là "manager" */
  active?: NavKey;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div>
          <h1 className="text-sm font-semibold text-slate-900 sm:text-base">
            QUẢN LÝ PS PHÚ THỌ
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

      {role === "manager" && active ? (
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={
                item.key === active
                  ? "whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
                  : "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
