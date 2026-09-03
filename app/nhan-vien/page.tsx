import Link from "next/link";
import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import StatCard from "@/components/StatCard";
import AlertBadge from "@/components/AlertBadge";
import ScoreTrendChart from "@/components/ScoreTrendChart";
import ConfirmButtons from "@/components/ConfirmButtons";
import ChatBox, { type ChatMessage } from "@/components/ChatBox";
import {
  chuanHoaMaNV,
  getCanhBaoChuaViengTham,
  getCanhBaoKhachChet,
  getCanhBaoSanPhamNghi,
  getDanhGiaCungTuyen,
  getGoiYTapTrung,
  getTroChuyen,
  getXacNhanGoiY,
  sortWeeksAscending,
} from "@/lib/data";
import { getCurrentWeekLabel, getWeekDateRange } from "@/lib/aggregate";

function parseThoiGian(v: string): Date | null {
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
}

export default async function NhanVienPage() {
  const session = await auth();
  const user = session!.user!;
  const maNV = chuanHoaMaNV(user.maNhanVien);
  const hoTen = user.name ?? "";

  const [goiY, danhGia, xacNhan, chuaVT, khChet, spNghi, troChuyen] = await Promise.all([
    getGoiYTapTrung(),
    getDanhGiaCungTuyen(),
    getXacNhanGoiY(),
    getCanhBaoChuaViengTham(),
    getCanhBaoKhachChet(),
    getCanhBaoSanPhamNghi(),
    getTroChuyen(),
  ]);

  const weekLabel = getCurrentWeekLabel(danhGia);
  const weekRange = getWeekDateRange(weekLabel);

  const goiYCuaToi = goiY
    .filter((r) => chuanHoaMaNV(r["Mã nhân viên"]) === maNV)
    .sort((a, b) => Number(a["Thứ tự ưu tiên"]) - Number(b["Thứ tự ưu tiên"]));

  const xacNhanTuanNay = xacNhan.filter((r) => {
    if (chuanHoaMaNV(r["Mã nhân viên"]) !== maNV) return false;
    if (!weekRange) return true;
    const d = parseThoiGian(r["Thời gian"]);
    return d && d >= weekRange.start && d <= weekRange.end;
  });
  const xacNhanMap = new Map<string, string>();
  for (const r of xacNhanTuanNay) {
    xacNhanMap.set(r["Mã khách hàng"], r["Trạng thái"]);
  }

  const diemLichSu = sortWeeksAscending(
    danhGia.filter((r) => chuanHoaMaNV(r["Mã nhân viên"]) === maNV)
  ).map((r) => ({ tuan: r["Tuần"], diem: Number(r["Tổng điểm cung tuyến"]) || 0 }));

  const diemTuanNay = danhGia.find(
    (r) => chuanHoaMaNV(r["Mã nhân viên"]) === maNV && r["Tuần"] === weekLabel
  );

  const chuaVTCuaToi = chuaVT.filter((r) => r["Tên nhân viên"]?.trim() === hoTen.trim());
  const khChetCuaToi = khChet.filter((r) => r["Tên nhân viên"]?.trim() === hoTen.trim());
  const spNghiCuaToi = spNghi.filter((r) => r["Tên nhân viên"]?.trim() === hoTen.trim());

  const soDaXacNhan = goiYCuaToi.filter((r) => xacNhanMap.has(r["Mã khách hàng"])).length;

  const toMessage = (r: (typeof troChuyen)[number]): ChatMessage => ({
    thoiGian: r["Thời gian"],
    maGui: chuanHoaMaNV(r["Mã người gửi"]),
    tenGui: r["Tên người gửi"],
    noiDung: r["Nội dung"],
  });
  const troChuyenSorted = [...troChuyen].sort((a, b) => (a["Thời gian"] > b["Thời gian"] ? 1 : -1));
  const tinNhanRieng = troChuyenSorted
    .filter(
      (r) =>
        r["Loại"] === "rieng" &&
        (chuanHoaMaNV(r["Mã người gửi"]) === maNV || chuanHoaMaNV(r["Mã người nhận"]) === maNV)
    )
    .map(toMessage);
  const tinNhanNhom = troChuyenSorted.filter((r) => r["Loại"] === "nhom").map(toMessage);

  return (
    <>
      <AppHeader hoTen={hoTen} role="employee" weekLabel={weekLabel} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Link
          href="/nhan-vien/tra-cuu-sale"
          className="mb-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          📊 Tra cứu Sale của tôi
        </Link>
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Khách cần gặp tuần này" value={goiYCuaToi.length} accentColor="#2a78d6" />
          <StatCard
            label="Đã xác nhận"
            value={`${soDaXacNhan}/${goiYCuaToi.length}`}
            accentColor="#1baf7a"
          />
          <StatCard
            label="Điểm cung tuyến tuần"
            value={diemTuanNay ? Number(diemTuanNay["Tổng điểm cung tuyến"]) : "—"}
            accentColor="#eb6834"
          />
          <StatCard
            label="Cảnh báo liên quan"
            value={chuaVTCuaToi.length + khChetCuaToi.length + spNghiCuaToi.length}
            accentColor="#e34948"
          />
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Danh sách khách cần gặp tuần này
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Sắp xếp theo thứ tự ưu tiên gợi ý. Bấm &quot;Xác nhận đã gặp&quot; sau khi đến thăm khách.
          </p>
          <div className="mt-4 space-y-3">
            {goiYCuaToi.length === 0 && (
              <p className="text-sm text-slate-400">Không có gợi ý nào cho tuần này.</p>
            )}
            {goiYCuaToi.map((r) => (
              <div
                key={r["Mã khách hàng"] + r["Thứ tự ưu tiên"]}
                className="rounded-xl border border-slate-100 bg-slate-50/60 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      #{r["Thứ tự ưu tiên"]} — {r["Tên khách hàng"]}{" "}
                      <span className="text-xs font-normal text-slate-400">
                        ({r["Mã khách hàng"]})
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {r["Địa chỉ"]} · {r["Tỉnh"]} · Nhóm {r["Nhóm KH"]} · Hạng {r["Hạng"]}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">{r["Mục tiêu chuyến thăm"]}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Điểm ưu tiên: {r["Điểm ưu tiên"]} · Chưa lặp đơn:{" "}
                      {r["Số ngày chưa lặp đơn"]} ngày
                    </p>
                  </div>
                  <ConfirmButtons
                    maKH={r["Mã khách hàng"]}
                    tenKH={r["Tên khách hàng"]}
                    daXacNhan={xacNhanMap.get(r["Mã khách hàng"])}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Điểm cung tuyến theo tuần</h2>
          <ScoreTrendChart data={diemLichSu} seriesLabel="Tổng điểm cung tuyến" colorIndex={1} />
          {diemTuanNay && (
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs text-slate-500">
              <div>
                <p className="font-semibold text-slate-900">
                  {diemTuanNay["Số lượt gặp khách"]}
                </p>
                Lượt gặp khách
              </div>
              <div>
                <p className="font-semibold text-slate-900">
                  {diemTuanNay["Số lượt phản hồi thông tin hàng hóa"]}
                </p>
                Lượt phản hồi hàng hóa
              </div>
              <div>
                <p className="font-semibold text-slate-900">
                  {diemTuanNay["Số lượt phát sinh sale"]}
                </p>
                Lượt phát sinh sale
              </div>
            </div>
          )}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <AlertPanel title="Khách chưa viếng thăm" rows={chuaVTCuaToi} />
          <AlertPanel
            title={'Khách hàng "chết"'}
            rows={khChetCuaToi}
            field="Số ngày chưa phát sinh"
            fieldLabel="ngày chưa phát sinh"
          />
          <ProductAlertPanel title="Sản phẩm nghỉ" rows={spNghiCuaToi} />
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Trò chuyện với quản lý</h2>
            <p className="mt-0.5 text-xs text-slate-400">Nhắn tin riêng với quản lý nhóm.</p>
            <div className="mt-3">
              <ChatBox
                messages={tinNhanRieng}
                loai="rieng"
                currentSenderCode={maNV}
                emptyLabel="Chưa có tin nhắn nào với quản lý."
              />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Trò chuyện nhóm</h2>
            <p className="mt-0.5 text-xs text-slate-400">Trò chuyện chung với cả nhóm.</p>
            <div className="mt-3">
              <ChatBox
                messages={tinNhanNhom}
                loai="nhom"
                currentSenderCode={maNV}
                emptyLabel="Chưa có tin nhắn nào trong nhóm."
              />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function AlertPanel({
  title,
  rows,
  field = "Số ngày chưa có lượt viếng thăm/call",
  fieldLabel = "ngày chưa viếng thăm",
}: {
  title: string;
  rows: Array<Record<string, string>>;
  field?: string;
  fieldLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <ul className="mt-3 space-y-2">
        {rows.length === 0 && <li className="text-xs text-slate-400">Không có cảnh báo.</li>}
        {rows.map((r, i) => (
          <li key={i} className="rounded-lg bg-slate-50 p-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-slate-800">{r["Tên khách hàng"]}</span>
              <AlertBadge mucDo={r["Mức độ"]} />
            </div>
            <p className="mt-0.5 text-slate-500">
              {r[field]} {fieldLabel}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProductAlertPanel({
  title,
  rows,
}: {
  title: string;
  rows: Array<Record<string, string>>;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <ul className="mt-3 space-y-2">
        {rows.length === 0 && <li className="text-xs text-slate-400">Không có cảnh báo.</li>}
        {rows.map((r, i) => (
          <li key={i} className="rounded-lg bg-slate-50 p-2 text-xs">
            <p className="font-medium text-slate-800">
              {r["Tên khách hàng"]} — {r["Tên sản phẩm"]}
            </p>
            <p className="mt-0.5 text-slate-500">
              {r["Tên nhân viên"]} · {r["Số ngày chưa mua lại"]} ngày chưa mua lại
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
