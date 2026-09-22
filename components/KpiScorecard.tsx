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
  if (nguon === "nhap-tay")
    return <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">nhập tay</span>;
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
          {m.diemTH != null && m.diemKH != null && (
            <span className="ml-1.5 text-slate-400">
              · <span className="font-semibold text-indigo-600">{m.diemTH}</span>/{m.diemKH}đ
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
  // Nhóm 1: web tự tính (từ Sale) + nhân viên nhập tay (Code mới). Nhóm 2: lấy theo file KPI công ty.
  // Code mới luôn ở nhóm 1 (kể cả khi chưa nhập) để nhân viên biết chỗ điền.
  const inGroup1 = (m: MetricScore) => m.nguon === "tu-tinh" || m.nguon === "nhap-tay" || m.key === "codeMoi";
  const auto = emp.metrics.filter(inGroup1);
  const khac = emp.metrics.filter((m) => !inGroup1(m));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{emp.ten}</h3>
        <span className="text-xs text-slate-500">
          Điểm đạt:{" "}
          <span className="text-sm font-bold text-indigo-600">{emp.diemDat.toLocaleString("vi-VN")}</span>
          <span className="text-slate-400">/{emp.diemKHDat.toLocaleString("vi-VN")}đ</span>
          {emp.diemKHDat > 0 && (
            <span className="ml-1 font-semibold text-indigo-500">
              ({Math.round((emp.diemDat / emp.diemKHDat) * 100)}%)
            </span>
          )}
        </span>
      </div>
      <p className="mt-0.5 text-[10px] text-slate-400">
        Tổng điểm KH cả tháng: {emp.tongDiemKH.toLocaleString("vi-VN")}đ
      </p>

      {auto.length > 0 && (
        <>
          <p className="mt-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
            Tự động từ Sale &amp; nhập tay
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

// Bảng xếp hạng nhóm theo điểm KPI đạt được (tạm tính) + tổng điểm cả nhóm.
function RankingPanel({ rows }: { rows: EmployeeScore[] }) {
  // rows đã được sắp theo điểm đạt giảm dần từ tầng dữ liệu.
  const groupDat = rows.reduce((s, r) => s + r.diemDat, 0);
  const groupKHDat = rows.reduce((s, r) => s + r.diemKHDat, 0);
  const groupPct = groupKHDat > 0 ? Math.round((groupDat / groupKHDat) * 100) : null;
  const maxDat = Math.max(1, ...rows.map((r) => r.diemDat));

  return (
    <div className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-indigo-900">Xếp hạng nhóm theo điểm KPI (tạm tính)</h3>
        <span className="text-xs text-indigo-700">
          Cả nhóm:{" "}
          <span className="font-bold">{groupDat.toLocaleString("vi-VN")}</span>
          <span className="text-indigo-400">/{groupKHDat.toLocaleString("vi-VN")}đ</span>
          {groupPct != null && <span className="ml-1 font-semibold">({groupPct}%)</span>}
        </span>
      </div>
      <ol className="mt-3 space-y-2">
        {rows.map((r, i) => {
          const pct = r.diemKHDat > 0 ? Math.round((r.diemDat / r.diemKHDat) * 100) : null;
          const w = Math.max(2, Math.round((r.diemDat / maxDat) * 100));
          const medal = i === 0 ? "bg-amber-400" : i === 1 ? "bg-slate-300" : i === 2 ? "bg-orange-300" : "bg-indigo-200";
          return (
            <li key={r.ma} className="flex items-center gap-2 text-xs">
              <span className={`flex h-5 w-5 flex-none items-center justify-center rounded-full text-[10px] font-bold text-slate-800 ${medal}`}>
                {i + 1}
              </span>
              <span className="w-28 flex-none truncate font-medium text-slate-700" title={r.ten}>
                {r.ten}
              </span>
              <span className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-white">
                <span className="absolute left-0 top-0 h-full rounded-full bg-indigo-500" style={{ width: `${w}%` }} />
              </span>
              <span className="w-24 flex-none text-right text-slate-600">
                <span className="font-bold text-indigo-700">{r.diemDat.toLocaleString("vi-VN")}</span>
                {pct != null && <span className="ml-1 text-indigo-400">{pct}%</span>}
              </span>
            </li>
          );
        })}
      </ol>
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
          <RankingPanel rows={rows} />
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {rows.map((emp) => (
              <EmployeeCard key={emp.ma} emp={emp} marker={marker} />
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
            <span className="font-medium text-indigo-600">Điểm đạt (tạm tính)</span> = % hoàn thành (tối đa 100%) ×
            Điểm KH của từng mục, chỉ cộng các mục đã có số thực hiện — <span className="font-medium">chưa gồm
            thưởng/phạt</span> riêng của công ty (bán hàng mới, date gần, họp nhóm, role play…). Dùng để so tiến độ &amp;
            xếp hạng, số điểm chốt cuối tháng vẫn theo công ty.
            {hasAuto ? (
              <>
                {" "}Chỉ tiêu gắn nhãn <span className="font-medium text-emerald-600">tự tính</span> (DS kê đơn, DS thầu,
                Code mới, Mở mới/Duy trì SPTT, SP Cấp 2) được web tự cập nhật từ file Sale mỗi ngày; các chỉ tiêu khác
                lấy theo file KPI của công ty.
              </>
            ) : (
              <> Các chỉ tiêu tự tính hiện chưa có phát sinh trong tháng.</>
            )}
          </p>
        </>
      )}
    </section>
  );
}
