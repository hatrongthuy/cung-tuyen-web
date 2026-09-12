import { signOut } from "@/auth";
import type { Role } from "@/lib/allowlist";
import SidebarNav, { type NavEntry } from "./SidebarNav";

export type NavKey =
  | "cung-tuyen"
  | "hoi-dap"
  | "doi-nhom"
  | "sp-trong-tam"
  | "bao-cao-tuan"
  | "bao-cao-thang"
  | "bao-cao-thau"
  | "kpi"
  | "doanh-so"
  | "tra-cuu-sale"
  | "tro-chuyen"
  | "bao-gia"
  | "dang-nhap";

// Menu quản lý — "Báo cáo tuần" + "Báo cáo tháng" gộp trong nhóm "Báo cáo".
const NAV_ITEMS: NavEntry[] = [
  { key: "cung-tuyen", label: "Cung tuyến", href: "/quan-ly", icon: "🏠" },
  { key: "hoi-dap", label: "Trợ lý AI", href: "/quan-ly/hoi-dap", icon: "🤖" },
  { key: "doi-nhom", label: "Quản lý đội nhóm", href: "/quan-ly/doi-nhom", icon: "👥" },
  { key: "sp-trong-tam", label: "SP trọng tâm", href: "/quan-ly/sp-trong-tam", icon: "⭐" },
  {
    group: "bao-cao",
    label: "Báo cáo",
    icon: "📊",
    children: [
      { key: "bao-cao-tuan", label: "Báo cáo tuần", href: "/quan-ly/bao-cao-tuan", icon: "📅" },
      { key: "bao-cao-thang", label: "Báo cáo tháng", href: "/quan-ly/bao-cao-thang", icon: "🗓️" },
    ],
  },
  { key: "bao-cao-thau", label: "Báo cáo thầu", href: "/quan-ly/bao-cao-thau", icon: "🏛️" },
  { key: "kpi", label: "KPI", href: "/quan-ly/kpi", icon: "🎯" },
  { key: "doanh-so", label: "Doanh số", href: "/quan-ly/doanh-so", icon: "💰" },
  { key: "tra-cuu-sale", label: "Tra cứu Sale", href: "/quan-ly/tra-cuu-sale", icon: "🔎" },
  { key: "tro-chuyen", label: "Trò chuyện", href: "/quan-ly/tro-chuyen", icon: "💬" },
  { key: "bao-gia", label: "Báo giá", href: "/bao-gia", icon: "🧾" },
  { key: "dang-nhap", label: "Đăng nhập", href: "/quan-ly/thong-ke-dang-nhap", icon: "📈" },
];

// Menu nhân viên — mỗi người chỉ xem dữ liệu cá nhân của mình.
const EMP_NAV_ITEMS: NavEntry[] = [
  { key: "cung-tuyen", label: "Cung tuyến", href: "/nhan-vien", icon: "🏠" },
  { key: "hoi-dap", label: "Trợ lý AI", href: "/nhan-vien/hoi-dap", icon: "🤖" },
  { key: "doi-nhom", label: "Kết quả của tôi", href: "/nhan-vien/doi-nhom", icon: "📈" },
  { key: "sp-trong-tam", label: "SP trọng tâm", href: "/nhan-vien/sp-trong-tam", icon: "⭐" },
  { key: "tra-cuu-sale", label: "Tra cứu Sale", href: "/nhan-vien/tra-cuu-sale", icon: "🔎" },
  { key: "kpi", label: "KPI", href: "/nhan-vien/kpi", icon: "🎯" },
  { key: "doanh-so", label: "Doanh số", href: "/nhan-vien/doanh-so", icon: "💰" },
  {
    group: "bao-cao",
    label: "Báo cáo",
    icon: "📊",
    children: [
      { key: "bao-cao-tuan", label: "Báo cáo tuần", href: "/nhan-vien/bao-cao-tuan", icon: "📅" },
      { key: "bao-cao-thang", label: "Báo cáo tháng", href: "/nhan-vien/bao-cao-thang", icon: "🗓️" },
    ],
  },
  { key: "bao-cao-thau", label: "Báo cáo thầu", href: "/nhan-vien/bao-cao-thau", icon: "🏛️" },
  { key: "bao-gia", label: "Báo giá", href: "/bao-gia", icon: "🧾" },
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
  /** Mục đang được chọn trên menu điều hướng. */
  active?: NavKey;
}) {
  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/dang-nhap" });
  }

  const items = role === "manager" ? NAV_ITEMS : EMP_NAV_ITEMS;

  return (
    <SidebarNav
      hoTen={hoTen}
      role={role}
      weekLabel={weekLabel}
      active={active}
      items={items}
      signOutAction={doSignOut}
    />
  );
}
