// Trang chủ chào mừng — lời chào + ẢNH TRỤ SỞ hiển thị TRỌN VẸN (không cắt).
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
    <section className="mt-3">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://cpc1hn.com.vn/build/assets/logo-DKjpVJOc.svg"
          alt="CPC1 Hà Nội"
          className="h-14 w-14 shrink-0 rounded"
        />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            CPC1 Hà Nội · Nhóm PS Phú Thọ
          </p>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Xin chào, {hoTen || "bạn"} 👋
          </h1>
        </div>
      </div>
      <p className="mt-2 text-sm text-slate-500 sm:text-base">
        Hệ thống Cung tuyến tuần — theo dõi cung tuyến, doanh số, khách hàng và sản phẩm của nhóm.
        {roleLabel ? ` · ${roleLabel}` : ""}
        {weekLabel ? ` · Tuần: ${weekLabel}` : ""}
      </p>
      {/* Ảnh trụ sở hiển thị trọn vẹn (w-full, cao tự nhiên) nên không bị cắt mất chữ DTP. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/cpc1hn-building.jpg"
        alt="Trụ sở CPC1 Hà Nội"
        className="mt-4 w-full rounded-2xl border border-slate-200 shadow-sm"
      />
    </section>
  );
}
