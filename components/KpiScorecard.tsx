import type { EmployeeScore, MetricScore } from "@/lib/kpi-actuals";
import { formatShortVnd } from "@/lib/format";

// Bảng điểm KPI theo nhân viên — mỗi chỉ tiêu: Kế hoạch → Thực hiện → % đạt,
// có thanh tiến độ và mốc thời gian trong tháng để biết đang bám tiến độ hay chậm.
// Các chỉ tiêu Doanh số / Code mới / SPTT được web TỰ TÍNH từ dữ liệu thật;
// các chỉ tiêu còn lại lấy theo file KPI của công ty (nếu có nhập).

function fmtValue(v: number | null, unit: "vnd" | "count"): string {
  if (v == null) return "—";
  if (unit === "vnd") return formatShortVnd(v);
  // count: bỏ phần thập phân thừa
  return Number.isInteger(v) ? String(v) : v.toLocaleString("vi-VN", { maximumFractionDigits: 1 });
}

function Bar({ pct, marker }: { pct: number | null; marker: number }) {
  const p = pct == null ? 0 : Math.max(0, Math.min(pct, 130));
  const onPace = pct != null && pct >= marker - 10;
  const color = pct == null ? "#cbd5e1" : onPace ? "#1baf7a" : "#f59e0b";
  return (
    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full" style={{ width: `${(p / 130) * 100}%`, backgroundColor: color }} />
      {/* mốc thời gian trong tháng */}
      <div
        className="absolute top-[-2px] h-[14px] w-[2px] bg-slate-400"
        style={{ left: `${(Math.min(marker, 130) / 130) * 100}%` }}
        title={`Mốc thời gian: ${Math.round(marker)}%`}
      />
    </div>
  );
}

function badgeFor(nguon: MetricScore["nguon"]) {
  if (nguon === "tu-tinh")
    return <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">tự tính</span>;
  if (nguon === "sheet")
    return <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">theo sheet</span>;
  return <span className="rounded bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">chưa có số</span>;
}

function MetricRow({ m, marker }: { m: MetricScore; marker: number }) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-slate-700">{m.label}</span>
          {badgeFor(m.nguon)}
        </div>
        <div className="text-slate-500">
          <span className="font-semibold text-slate-800">{fmtValue(m.thucHien, m.unit)}</span>
          <span className="text-slate-400"> / {fmtValue(m.keHoach, m.unit)}</span>
          {m.tiTrong != null && (
            <span className={`ml-1.5 font-semibold ${m.tiTrong >= marker - 10 ? "text-emerald-600" : "text-amber-600"}`}>
              {Math.round(m.tiTrong)}%
            </span>
          )}
        </div>
      </div>
      <div className="mt-1">
        <Bar pct={m.tiTrong} marker={marker} />
      </div>
    </div>
  );
}

function EmployeeCard({ emp, marker }: { emp: EmployeeScore; marker: number }) {
  // Tách chỉ tiêu tự tính (web tự chạy) và chỉ tiêu theo file KPI công ty — CẢ HAI đều hiện đủ, mỗi mục 1 dòng.
  const auto = emp.metrics.filter((m) => m.nguon === "tu-tinh");
  const khac = emp.metrics.filter((m) => m.nguon !== "tu-tinh");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{emp.ten}</h3>
        <span className="text-xs text-slate-400">Điểm KH: {emp.tongDiemKH.toLocaleString("vi-VN")}</span>
      </div>

      {auto.length > 0 && (
        <>
          <p className="mt-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
            Tự động cập nhật từ Sale
          </p>
          <div className="space-y-3">
            {auto.map((m) => (
              <MetricRow key={m.key} m={m} marker={marker} />
            ))}
          </div>
        </>
      )}

      {khac.length > 0 && (
        <>
          <p className="mt-4 mb-1.5 border-t border-slate-100 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Theo file KPI công ty
          </p>
          <div className="space-y-3">
            {khac.map((m) => (
              <MetricRow key={m.key} m={m} marker={marker} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function KpiScorecard({
  rows,
  monthLabel,
  error,
  hasAuto,
  ngay,
  soNgayThang,
}: {
  rows: EmployeeScore[];
  monthLabel: string;
  error?: string | null;
  hasAuto: boolean;
  /** Ngày hiện tại trong tháng (để vẽ mốc thời gian). */
  ngay: number;
  soNgayThang: number;
}) {
  const marker = Math.max(0, Math.min((ngay / soNgayThang) * 100, 100));

  return (
    <section className="mb-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Bảng điểm KPI — tháng {monthLabel}</h2>
        <span className="text-xs text-slate-400">
          Đến hôm nay ({Math.round(marker)}% thời gian tháng). Vạch dọc = mốc thời gian để so tiến độ.
        </span>
      </div>

      {error && (
        <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          <p className="font-semibold">Một phần dữ liệu KPI chưa đọc được</p>
          <p className="mt-1 leading-relaxed">{error}</p>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-400 shadow-sm">
          Chưa có dữ liệu chỉ tiêu KPI cho nhóm của bạn.
        </p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {rows.map((emp) => (
              <EmployeeCard key={emp.ma} emp={emp} marker={marker} />
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
            {hasAuto ? (
              <>
                Chỉ tiêu gắn nhãn <span className="font-medium text-emerald-600">tự tính</span> (DS kê đơn, DS thầu,
                Code mới, Mở mới/Duy trì SPTT) được web tự cập nhật từ file Sale mỗi ngày — Code mới &amp; SPTT là số
                web suy ra, anh/chị đối chiếu lại khi cần. Các chỉ tiêu khác lấy theo file KPI của công ty.
              </>
            ) : (
              <>Các chỉ tiêu tự tính hiện chưa có phát sinh trong tháng. Các chỉ tiêu khác lấy theo file KPI công ty.</>
            )}
          </p>
        </>
      )}
    </section>
  );
}
