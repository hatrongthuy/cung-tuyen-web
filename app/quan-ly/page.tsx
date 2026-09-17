import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import StatCard from "@/components/StatCard";
import AlertBadge from "@/components/AlertBadge";
import EmployeeBarChart from "@/components/EmployeeBarChart";
import EmployeeScoreTable from "@/components/EmployeeScoreTable";
import GoiYTuDong from "@/components/GoiYTuDong";
import {
  getCanhBaoChuaViengTham,
  getCanhBaoKhachChet,
  getCanhBaoSanPhamNghi,
  getDanhGiaCungTuyen,
  getGoiYTapTrung,
  getXacNhanGoiY,
} from "@/lib/data";
import { buildEmployeeWeekSummaries } from "@/lib/aggregate";
import { getGoiYCungTuyen } from "@/lib/sale-care";
import { allEmployees } from "@/lib/allowlist";
import { colorForIndex } from "@/lib/colors";

// Số khách gợi ý tối đa cho mỗi nhân viên trong 1 tuần (đồng bộ với GoiYTuDong).
const GOI_Y_CAP = 18;

export default async function QuanLyPage() {
  const session = await auth();
  const user = session!.user!;

  const [goiY, danhGia, xacNhan, chuaVT, khChet, spNghi] = await Promise.all([
    getGoiYTapTrung(),
    getDanhGiaCungTuyen(),
    getXacNhanGoiY(),
    getCanhBaoChuaViengTham(),
    getCanhBaoKhachChet(),
    getCanhBaoSanPhamNghi(),
  ]);

  const { weekLabel, summaries } = buildEmployeeWeekSummaries(goiY, xacNhan, danhGia);
  const employees = allEmployees();
  const careByEmp = await getGoiYCungTuyen(chuaVT, khChet, spNghi, Date.now());
  const goiYOrder = employees
    .filter((e) => e.role === "employee")
    .map((e) => ({ ma: e.maNhanVien ?? e.hoTen, hoTen: e.hoTen }));

  const diemChart = summaries.map((s) => ({ hoTen: s.hoTen, giaTri: s.diemCungTuyen ?? 0 }));
  const tongDiem = summaries.reduce((s, x) => s + (x.diemCungTuyen ?? 0), 0);
  const tongCanhBao = chuaVT.length + khChet.length + spNghi.length;

  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="manager" weekLabel={weekLabel} active="cung-tuyen" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <section className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Số nhân viên" value={employees.length} accentColor="#2a78d6" />
          <StatCard
            label="Tổng điểm cung tuyến nhóm"
            value={tongDiem}
            accentColor="#eb6834"
          />
          <StatCard
            label="Khách chưa viếng thăm"
            value={chuaVT.length}
            accentColor="#eda100"
          />
          <StatCard label="Tổng cảnh báo" value={tongCanhBao} accentColor="#e34948" />
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Điểm cung tuyến tuần — so sánh nhân viên
            </h2>
            <EmployeeBarChart data={diemChart} valueLabel="Điểm cung tuyến" />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Khối lượng gợi ý tuần này theo nhân viên
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Số khách web đề xuất nên gặp tuần này (tối đa {GOI_Y_CAP}/người) — tự sinh từ dữ liệu.
            </p>
            <div className="mt-3 space-y-3">
              {goiYOrder.map((e, idx) => {
                const tong = careByEmp[e.hoTen]?.length ?? 0;
                const tuan = Math.min(tong, GOI_Y_CAP);
                const du = tong - tuan;
                return (
                  <div key={e.ma}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-medium text-slate-700">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: colorForIndex(idx) }}
                        />
                        {e.hoTen}
                      </span>
                      <span className="text-slate-500">
                        {tuan} khách tuần này{du > 0 ? ` · +${du} chờ` : ""}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.round((tuan / GOI_Y_CAP) * 100)}%`,
                          backgroundColor: colorForIndex(idx),
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Gợi ý cung tuyến tự động — khách nên gặp tuần này
          </h2>
          <p className="mt-0.5 mb-3 text-xs text-slate-400">
            Web tự sinh, không cần thao tác ngoài. Bấm tên nhân viên để xem danh sách khách ưu tiên của họ.
          </p>
          <GoiYTuDong careByEmp={careByEmp} order={goiYOrder} />
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Bảng điểm cung tuyến tuần chi tiết
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Bấm vào một dòng để xem danh sách khách hàng cụ thể được gợi ý cho nhân viên đó.
          </p>
          <EmployeeScoreTable summaries={summaries} />
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <AlertPanel title="Khách chưa viếng thăm toàn nhóm" rows={chuaVT} />
          <AlertPanel
            title={'Khách hàng "chết" toàn nhóm'}
            rows={khChet}
            field="Số ngày chưa phát sinh"
            fieldLabel="ngày chưa phát sinh"
          />
          <ProductAlertPanel title="Sản phẩm nghỉ toàn nhóm" rows={spNghi} />
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
      <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
        {rows.length === 0 && <li className="text-xs text-slate-400">Không có cảnh báo.</li>}
        {rows.map((r, i) => (
          <li key={i} className="rounded-lg bg-slate-50 p-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-slate-800">
                {r["Tên khách hàng"]} ({r["Tên nhân viên"]})
              </span>
              {r["Mức độ"] && <AlertBadge mucDo={r["Mức độ"]} />}
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
      <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
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
