import Link from "next/link";
import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import StatCard from "@/components/StatCard";
import ThauCustomerList from "@/components/ThauCustomerList";
import {
  getBaoCaoThau,
  groupByCustomer,
  getCanhBaoHetHanThau,
  getCanhBaoLauChuaGoiThau,
  distinctTinh,
  formatDate,
} from "@/lib/thau-data";

const NGUONG_SAP_HET_HAN_THANG = 6;
const NGUONG_LAU_CHUA_GOI_THANG = 6;

export default async function BaoCaoThauPage() {
  const session = await auth();
  const user = session!.user!;

  const rows = await getBaoCaoThau();
  const khachs = groupByCustomer(rows);
  const tinhOptions = distinctTinh(rows);
  const canhBaoHetHan = getCanhBaoHetHanThau(rows, NGUONG_SAP_HET_HAN_THANG);
  const canhBaoLauChuaGoi = getCanhBaoLauChuaGoiThau(rows, NGUONG_LAU_CHUA_GOI_THANG);

  const tongDoanhSoConLai = khachs.reduce((s, k) => s + k.tongDoanhSoConLai, 0);

  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="manager" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-slate-900">Báo cáo thầu</h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Dữ liệu đọc trực tiếp từ Google Sheet &quot;báo cáo thầu&quot; mỗi lần tải trang.
            </p>
          </div>
          <Link
            href="/quan-ly"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            ← Về tổng quan
          </Link>
        </div>

        <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Số khách hàng" value={khachs.length} accentColor="#2a78d6" />
          <StatCard
            label="Tổng doanh số còn lại"
            value={Math.round(tongDoanhSoConLai).toLocaleString("vi-VN")}
            accentColor="#1baf7a"
          />
          <StatCard
            label={`Gói thầu sắp/đã hết hạn (<${NGUONG_SAP_HET_HAN_THANG} tháng)`}
            value={canhBaoHetHan.length}
            accentColor="#eda100"
          />
          <StatCard
            label={`Khách lâu chưa gọi thầu (>${NGUONG_LAU_CHUA_GOI_THANG} tháng)`}
            value={canhBaoLauChuaGoi.length}
            accentColor="#e34948"
          />
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Cảnh báo gói thầu sắp/đã hết hiệu lực
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Còn dưới {NGUONG_SAP_HET_HAN_THANG} tháng đến ngày hết hiệu lực (kể cả đã quá hạn).
            </p>
            <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
              {canhBaoHetHan.length === 0 && (
                <li className="text-xs text-slate-400">Không có gói thầu nào sắp hết hạn.</li>
              )}
              {canhBaoHetHan.map((c, i) => {
                const daHetHan = c.soThangConLai < 0;
                return (
                  <li key={i} className="rounded-lg bg-slate-50 p-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-800">
                        {c.tenKhach} ({c.maKhach})
                      </span>
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                        style={{ backgroundColor: daHetHan ? "#e34948" : "#eda100" }}
                      >
                        {daHetHan
                          ? "Đã hết hạn"
                          : `Còn ${Math.max(0, Math.round(c.soThangConLai))} tháng`}
                      </span>
                    </div>
                    <p className="mt-0.5 text-slate-500">
                      {c.tinh} · Gói {c.soHopDong} · Hết hạn: {formatDate(c.ngayHetHieuLuc)}
                    </p>
                    <p className="mt-0.5 truncate text-slate-400">{c.tenMatHangs.join(", ")}</p>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Cảnh báo khách lâu chưa gọi thầu mới
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Đã quá {NGUONG_LAU_CHUA_GOI_THANG} tháng kể từ ngày bắt đầu hiệu lực gần nhất.
            </p>
            <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
              {canhBaoLauChuaGoi.length === 0 && (
                <li className="text-xs text-slate-400">Không có khách hàng nào trong diện cảnh báo.</li>
              )}
              {canhBaoLauChuaGoi.map((c, i) => (
                <li key={i} className="rounded-lg bg-slate-50 p-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-800">
                      {c.tenKhach} ({c.maKhach})
                    </span>
                    <span className="shrink-0 rounded-full bg-[#e34948] px-2 py-0.5 text-[10px] font-medium text-white">
                      {Math.round(c.soThangChuaGoiMoi)} tháng
                    </span>
                  </div>
                  <p className="mt-0.5 text-slate-500">
                    {c.tinh} · Gói gần nhất bắt đầu: {formatDate(c.ngayBatDauGanNhat)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Chi tiết theo khách hàng</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Bấm vào một khách hàng để xem danh sách sản phẩm (số lượng kế hoạch/thực hiện/còn lại).
          </p>
          <div className="mt-3">
            <ThauCustomerList khachs={khachs} tinhOptions={tinhOptions} />
          </div>
        </section>
      </main>
    </>
  );
}
