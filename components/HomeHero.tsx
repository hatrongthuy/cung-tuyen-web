import type { Role } from "@/lib/allowlist";

// TRANG CHỦ — ảnh trụ sở tràn toàn bộ khung nội dung (full-bleed) như portal công ty,
// kèm lời chào nhẹ ở góc dưới. Ảnh object-position giữ phần toà nhà (chữ DTP) luôn hiển thị.
export default function HomeHero({ hoTen, role }: { hoTen: string; role: Role }) {
  const roleLabel = role === "manager" ? "Quản lý nhóm" : "Nhân viên";
  return (
    <section className="relative h-[calc(100dvh-76px)] min-h-[380px] w-full overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/cpc1hn-building.jpg"
        alt="Trụ sở CPC1 Hà Nội"
        className="absolute inset-0 h-full w-full object-cover object-[center_35%]"
      />
      {/* Lớp chào nhẹ ở dưới, không che phần toà nhà/chữ DTP phía trên. */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-6 pb-7 pt-20 sm:px-10 sm:pb-9">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://cpc1hn.com.vn/build/assets/logo-DKjpVJOc.svg"
            alt="CPC1 Hà Nội"
            className="h-12 w-12 shrink-0 rounded bg-white/90 p-1 shadow"
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/85">
              CPC1 Hà Nội · Nhóm PS Phú Thọ · {roleLabel}
            </p>
            <h1 className="text-2xl font-bold text-white drop-shadow sm:text-3xl">
              Xin chào, {hoTen || "bạn"} 👋
            </h1>
          </div>
        </div>
      </div>
    </section>
  );
}
