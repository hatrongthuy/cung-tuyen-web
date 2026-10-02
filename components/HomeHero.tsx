// Banner "Trang chủ" chào mừng — ảnh toà nhà CPC1 Hà Nội + lời chào.
// Hiển thị trên đầu trang chủ của quản lý & nhân viên.
export default function HomeHero({
  hoTen,
  weekLabel,
  roleLabel,
}: {
  hoTen: string;
  weekLabel?: string | null;
  roleLabel?: string;
}) {
  return (
    <section className="relative mt-3 overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/cpc1hn-building.jpg"
        alt="Trụ sở CPC1 Hà Nội"
        className="h-52 w-full object-cover sm:h-64"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-900/55 to-slate-900/10" />
      <div className="absolute inset-0 flex flex-col justify-center gap-2 px-6 sm:px-10">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://cpc1hn.com.vn/build/assets/logo-DKjpVJOc.svg"
            alt="CPC1 Hà Nội"
            className="h-11 w-11 rounded bg-white/90 p-1 shadow"
          />
          <span className="text-sm font-semibold uppercase tracking-wide text-white/90">
            CPC1 Hà Nội · Nhóm PS Phú Thọ
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          Xin chào, {hoTen || "bạn"} 👋
        </h1>
        <p className="max-w-xl text-sm text-white/85 sm:text-base">
          Hệ thống Cung tuyến tuần — theo dõi cung tuyến, doanh số, khách hàng và sản phẩm của nhóm.
          {roleLabel ? ` · ${roleLabel}` : ""}
          {weekLabel ? ` · Tuần: ${weekLabel}` : ""}
        </p>
      </div>
    </section>
  );
}
