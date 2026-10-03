import Link from "next/link";
import type { Role } from "@/lib/allowlist";

type Shortcut = { href: string; icon: string; title: string; desc: string; color: string };

const MANAGER_SHORTCUTS: Shortcut[] = [
  { href: "/quan-ly/cung-tuyen", icon: "📊", title: "Cung tuyến", desc: "Điểm, gợi ý & cảnh báo tuần", color: "#2a78d6" },
  { href: "/quan-ly/tra-cuu-sale", icon: "🔎", title: "Tra cứu Sale", desc: "Khách hàng, sản phẩm, Cấp 2", color: "#0b6e75" },
  { href: "/quan-ly/doanh-so", icon: "💰", title: "Doanh số", desc: "Doanh thu theo kỳ & nhân viên", color: "#1baf7a" },
  { href: "/quan-ly/sp-trong-tam", icon: "⭐", title: "SP trọng tâm", desc: "Triển khai sản phẩm trọng tâm", color: "#c98a00" },
  { href: "/quan-ly/kpi", icon: "🎯", title: "KPI", desc: "Chỉ tiêu & kết quả", color: "#eb6834" },
  { href: "/quan-ly/giao-viec", icon: "📋", title: "Giao việc", desc: "Giao & theo dõi công việc", color: "#7c5cd6" },
  { href: "/quan-ly/bao-cao-tuan", icon: "📅", title: "Báo cáo tuần", desc: "Tổng hợp tuần của nhóm", color: "#d1568a" },
  { href: "/quan-ly/bao-cao-thang", icon: "🗓️", title: "Báo cáo tháng", desc: "Tổng hợp tháng của nhóm", color: "#2a78d6" },
  { href: "/quan-ly/bao-cao-thau", icon: "🏛️", title: "Báo cáo thầu", desc: "Tiến độ thầu theo bệnh viện", color: "#0b6e75" },
  { href: "/quan-ly/doi-nhom", icon: "👥", title: "Quản lý đội nhóm", desc: "Kết quả từng nhân viên", color: "#1baf7a" },
  { href: "/quan-ly/hoi-dap", icon: "🤖", title: "Trợ lý AI", desc: "Hỏi đáp trên dữ liệu nhóm", color: "#eb6834" },
  { href: "/bao-gia", icon: "🧾", title: "Báo giá", desc: "Tạo báo giá nhanh", color: "#e34948" },
];

const EMPLOYEE_SHORTCUTS: Shortcut[] = [
  { href: "/nhan-vien/cung-tuyen", icon: "📊", title: "Cung tuyến", desc: "Việc & khách cần gặp tuần này", color: "#2a78d6" },
  { href: "/nhan-vien/giao-viec", icon: "📋", title: "Việc được giao", desc: "Công việc quản lý giao", color: "#7c5cd6" },
  { href: "/nhan-vien/tra-cuu-sale", icon: "🔎", title: "Tra cứu Sale", desc: "Khách hàng & sản phẩm của tôi", color: "#0b6e75" },
  { href: "/nhan-vien/doanh-so", icon: "💰", title: "Doanh số", desc: "Doanh thu của tôi", color: "#1baf7a" },
  { href: "/nhan-vien/sp-trong-tam", icon: "⭐", title: "SP trọng tâm", desc: "Sản phẩm trọng tâm", color: "#c98a00" },
  { href: "/nhan-vien/kpi", icon: "🎯", title: "KPI", desc: "Chỉ tiêu & kết quả của tôi", color: "#eb6834" },
  { href: "/nhan-vien/bao-cao-tuan", icon: "📅", title: "Báo cáo tuần", desc: "Báo cáo tuần của tôi", color: "#d1568a" },
  { href: "/nhan-vien/bao-cao-thang", icon: "🗓️", title: "Báo cáo tháng", desc: "Báo cáo tháng của tôi", color: "#2a78d6" },
  { href: "/nhan-vien/phat-trien", icon: "🌱", title: "Phát triển cá nhân", desc: "Kỹ năng & nguyện vọng", color: "#1baf7a" },
  { href: "/nhan-vien/hoi-dap", icon: "🤖", title: "Trợ lý AI", desc: "Hỏi đáp trên dữ liệu của tôi", color: "#eb6834" },
];

// TRANG CHỦ chào mừng — hero (lời chào + nút nhanh + ảnh trụ sở hiện trọn) và lưới Truy cập nhanh.
export default function HomeHero({ hoTen, role }: { hoTen: string; role: Role }) {
  const isManager = role === "manager";
  const roleLabel = isManager ? "Quản lý nhóm" : "Nhân viên";
  const shortcuts = isManager ? MANAGER_SHORTCUTS : EMPLOYEE_SHORTCUTS;
  const cungTuyenHref = isManager ? "/quan-ly/cung-tuyen" : "/nhan-vien/cung-tuyen";
  const saleHref = isManager ? "/quan-ly/tra-cuu-sale" : "/nhan-vien/tra-cuu-sale";

  return (
    <div className="mt-3 space-y-7">
      {/* HERO */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white shadow-sm">
        <div className="grid items-center gap-0 lg:grid-cols-2">
          <div className="flex flex-col justify-center gap-4 p-7 sm:p-10">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://cpc1hn.com.vn/build/assets/logo-DKjpVJOc.svg"
                alt="CPC1 Hà Nội"
                className="h-12 w-12 shrink-0 rounded"
              />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                CPC1 Hà Nội · Nhóm PS Phú Thọ
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Xin chào, {hoTen || "bạn"} 👋
              </h1>
              <p className="mt-2 max-w-md text-sm text-slate-500 sm:text-base">
                Chào mừng đến hệ thống <b className="text-slate-700">Cung tuyến tuần</b> — nơi theo dõi
                cung tuyến, doanh số, khách hàng và sản phẩm của nhóm. {roleLabel}.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                href={cungTuyenHref}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                📊 Vào Cung tuyến
              </Link>
              <Link
                href={saleHref}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                🔎 Tra cứu Sale
              </Link>
            </div>
          </div>
          <div className="flex items-center justify-center p-3 sm:p-4 lg:p-5">
            {/* Ảnh hiển thị TRỌN (w-full, cao tự nhiên) nên không bị cắt mất chữ DTP. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/cpc1hn-building.jpg"
              alt="Trụ sở CPC1 Hà Nội"
              className="w-full rounded-2xl border border-slate-200 shadow-sm"
            />
          </div>
        </div>
      </section>

      {/* TRUY CẬP NHANH */}
      <section>
        <h2 className="mb-3 px-1 text-sm font-semibold text-slate-900">Truy cập nhanh</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shortcuts.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                style={{ backgroundColor: `${s.color}1a` }}
              >
                {s.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900">{s.title}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{s.desc}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
