import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import { getSaleDetailData } from "@/lib/sale-detail";
import { getKpiScorecard, type EmployeeScore, type MetricScore } from "@/lib/kpi-actuals";
import { TEN_NHOM } from "@/lib/scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MS = 86400000;
const GAM_COLORS: Record<string, string> = { Sản: "#c2457e", GMHS: "#2a78d6" };
const WEEK_LABELS = ["W1\n01–06", "W2\n07–13", "W3\n14–20", "W4\n21–27", "W5\n28–31"];

function tr(v: number | null | undefined): string {
  if (v == null) return "—";
  return (v / 1_000_000).toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
function normMa(v: string): string {
  return String(v ?? "").trim().replace(/^0+(?=\d)/, "");
}
function womIndex(day: number): number {
  if (day <= 6) return 0;
  if (day <= 13) return 1;
  if (day <= 20) return 2;
  if (day <= 27) return 3;
  return 4;
}
function fmtVal(ms: MetricScore, v: number | null): string {
  if (v == null) return "—";
  if (ms.unit === "vnd") return tr(v) + "tr";
  return Number.isInteger(v) ? v.toLocaleString("vi-VN") : v.toLocaleString("vi-VN", { maximumFractionDigits: 1 });
}
const NGUON_LABEL: Record<string, string> = {
  "tu-tinh": "Web tự tính",
  "nhap-tay": "NV nhập",
  sheet: "Công ty nhập",
  "chua-co": "Chưa có số",
};

export default async function ChiTietNhanVienPage({
  params,
  searchParams,
}: {
  params: Promise<{ ma: string }>;
  searchParams?: Promise<{ thang?: string }>;
}) {
  const session = await auth();
  const user = session!.user!;
  const { ma: maRaw } = await params;
  const maParam = normMa(decodeURIComponent(maRaw));
  const d = await getSaleDetailData();

  const back = (
    <a href="/quan-ly/bao-cao-chot-thang" className="text-xs font-medium text-teal-700 hover:underline">
      ← Về Báo cáo chốt tháng
    </a>
  );

  if (d.error) {
    return (
      <>
        <AppHeader hoTen={user.name ?? ""} role="manager" active="chot-thang" />
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
          {back}
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Không tải được dữ liệu Sale: {d.error}
          </div>
        </main>
      </>
    );
  }

  const baseMs = new Date(d.base + "T00:00:00").getTime();
  const asof = new Date(baseMs + d.asofDi * MS);
  const C = { cid: 0, tid: 1, pid: 2, di: 3, sl: 4, dt: 5 };

  const sp = (await searchParams) ?? {};
  let ty: number, tmonth: number;
  if (sp.thang && /^\d{4}-\d{1,2}$/.test(sp.thang)) {
    const [y, m] = sp.thang.split("-").map(Number);
    ty = y;
    tmonth = m - 1;
  } else {
    ty = asof.getFullYear();
    tmonth = asof.getMonth();
    if (asof.getDate() <= 8) {
      tmonth -= 1;
      if (tmonth < 0) {
        tmonth = 11;
        ty -= 1;
      }
    }
  }
  const thangLabel = `T${tmonth + 1}/${ty}`;

  // Tìm tid theo mã NV.
  let tid = -1;
  for (let i = 0; i < d.tdvMa.length; i++) {
    if (normMa(d.tdvMa[i] ?? "") === maParam) {
      tid = i;
      break;
    }
  }

  if (tid < 0) {
    return (
      <>
        <AppHeader hoTen={user.name ?? ""} role="manager" active="chot-thang" />
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
          {back}
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            Không tìm thấy nhân viên có mã “{maParam}”.
          </div>
        </main>
      </>
    );
  }

  const ten = d.tdv[tid] ?? "";
  const gam = d.repGam[tid] ?? "";
  const gamCol = GAM_COLORS[gam] || "#0b6e75";

  // SP trọng tâm & Cấp 2 (pid sets).
  const sptt = new Set<number>();
  Object.values(d.focus).forEach((arr) => arr.forEach((p) => sptt.add(p)));
  const spxs = new Set<number>(d.cap2Cat);

  const week = [0, 0, 0, 0, 0];
  let lk = 0,
    spttDS = 0,
    spxsDS = 0;
  const khach = new Set<number>();
  const prodDS = new Map<number, number>(); // pid -> dt (SPTT + SPXS)

  for (const row of d.rows) {
    if (row[C.tid] !== tid) continue;
    const dt = new Date(baseMs + row[C.di] * MS);
    if (dt.getFullYear() !== ty || dt.getMonth() !== tmonth) continue;
    const val = row[C.dt];
    const pid = row[C.pid];
    week[womIndex(dt.getDate())] += val;
    lk += val;
    khach.add(row[C.cid]);
    if (sptt.has(pid)) {
      spttDS += val;
      prodDS.set(pid, (prodDS.get(pid) ?? 0) + val);
    } else if (spxs.has(pid)) {
      spxsDS += val;
      prodDS.set(pid, (prodDS.get(pid) ?? 0) + val);
    }
  }
  const maxWeek = Math.max(1, ...week);

  const spttRows = [...prodDS.entries()]
    .filter(([pid]) => sptt.has(pid))
    .sort((a, b) => b[1] - a[1]);
  const spxsRows = [...prodDS.entries()]
    .filter(([pid]) => spxs.has(pid))
    .sort((a, b) => b[1] - a[1]);

  // KPI chính thức.
  let es: EmployeeScore | undefined;
  let kpiErr: string | null = null;
  try {
    const sc = await getKpiScorecard(TEN_NHOM, ty, tmonth + 1);
    kpiErr = sc.error;
    es = sc.rows.find((r) => normMa(r.ma) === maParam);
  } catch (e) {
    kpiErr = e instanceof Error ? e.message : String(e);
  }

  // Điểm chính thức từ file công ty (ưu tiên), dự phòng điểm tự tính.
  const diemCore = es?.diemTHCore ?? es?.diemDat ?? 0;
  const diemFinal = es?.diemTHFinal ?? es?.diemTHCore ?? es?.diemDat ?? 0;
  const diemKHFile = es?.diemKHFile ?? es?.tongDiemKH ?? 0;
  const pctDiem = diemKHFile > 0 ? Math.round((diemFinal / diemKHFile) * 100) : null;

  // Nhận xét tự động.
  const nhanXet: string[] = [];
  const metr = (k: string) => es?.metrics.find((m) => m.key === k);
  const kd = metr("keDon");
  const thMetric = metr("thau");
  const dsKH = (kd?.keHoach ?? 0) + (thMetric?.keHoach ?? 0);
  const dsTH = (kd?.thucHien ?? 0) + (thMetric?.thucHien ?? 0);
  if (dsKH > 0) {
    const p = Math.round((dsTH / dsKH) * 100);
    nhanXet.push(
      p >= 100
        ? `Doanh số KPI đạt ${p}% kế hoạch (${tr(dsTH)}tr / ${tr(dsKH)}tr) — hoàn thành chỉ tiêu doanh số.`
        : `Doanh số KPI mới đạt ${p}% kế hoạch (${tr(dsTH)}tr / ${tr(dsKH)}tr) — cần bù ${tr(dsKH - dsTH)}tr.`,
    );
  }
  if (spttRows.length) {
    const [topPid, topVal] = spttRows[0];
    nhanXet.push(`SP trọng tâm mạnh nhất: ${d.prod[topPid]?.[1] ?? ""} (${tr(topVal)}tr). Tổng SPTT ${tr(spttDS)}tr.`);
  } else {
    nhanXet.push("Chưa phát sinh doanh thu SP trọng tâm trong tháng — cần tập trung đẩy gam trọng tâm.");
  }
  if (spxsDS > 0) nhanXet.push(`SP Cấp 2 (Chuyên khoa PS) đạt ${tr(spxsDS)}tr qua ${spxsRows.length} sản phẩm.`);
  const weakMetrics = (es?.metrics ?? []).filter(
    (m) => m.keHoach != null && m.keHoach > 0 && (m.thucHien ?? 0) < m.keHoach,
  );
  if (weakMetrics.length) {
    nhanXet.push("Chỉ tiêu cần cải thiện: " + weakMetrics.map((m) => m.label).join(", ") + ".");
  }
  if (pctDiem != null) {
    nhanXet.push(`Điểm KPI tháng (chính thức): ${diemFinal.toLocaleString("vi-VN")}/${diemKHFile.toLocaleString("vi-VN")} = ${pctDiem}% (điểm chỉ tiêu chính ${diemCore.toLocaleString("vi-VN")}).`);
  }

  const pctBadge = (p: number) => {
    const c = p >= 100 ? "#1baf7a" : p >= 80 ? "#c98a00" : "#e34948";
    return (
      <span className="rounded px-1.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: `${c}1a`, color: c }}>
        {p}%
      </span>
    );
  };

  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="manager" active="chot-thang" />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        {back}

        <div className="mt-3 overflow-hidden rounded-2xl p-6 text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${gamCol}, #0b3b40)` }}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">{ten}</h1>
              <p className="mt-1 text-sm text-white/80">
                Mã {d.tdvMa[tid]} · Gam {gam || "—"} · {khach.size} khách hàng · chốt tháng {thangLabel}
              </p>
            </div>
            <div className="flex gap-3">
              <div className="rounded-xl bg-white/10 px-4 py-2 text-center">
                <div className="text-lg font-bold">{tr(lk)}tr</div>
                <div className="text-[11px] text-white/70">DS tháng</div>
              </div>
              {diemFinal > 0 && (
                <div className="rounded-xl bg-white/10 px-4 py-2 text-center">
                  <div className="text-lg font-bold">{diemFinal.toLocaleString("vi-VN")}</div>
                  <div className="text-[11px] text-white/70">Điểm KPI (cuối)</div>
                </div>
              )}
              {diemCore > 0 && (
                <div className="rounded-xl bg-white/10 px-4 py-2 text-center">
                  <div className="text-lg font-bold">{diemCore.toLocaleString("vi-VN")}</div>
                  <div className="text-[11px] text-white/70">Điểm chính</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Biểu đồ doanh số theo tuần */}
        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">📈 Doanh số theo tuần — {thangLabel}</h2>
          <div className="flex items-end gap-3" style={{ height: 160 }}>
            {week.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center justify-end">
                <div className="mb-1 text-xs font-semibold text-slate-700">{v > 0 ? tr(v) : ""}</div>
                <div
                  className="w-full rounded-t"
                  style={{ height: `${Math.max(2, (v / maxWeek) * 120)}px`, backgroundColor: gamCol, opacity: v > 0 ? 1 : 0.15 }}
                />
                <div className="mt-1 whitespace-pre text-center text-[10px] leading-tight text-slate-500">{WEEK_LABELS[i]}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-slate-50 p-2">
              <div className="text-sm font-bold text-slate-900">{tr(lk)}tr</div>
              <div className="text-[11px] text-slate-500">Lũy kế tháng</div>
            </div>
            <div className="rounded-lg bg-emerald-50 p-2">
              <div className="text-sm font-bold text-emerald-700">{tr(spttDS)}tr</div>
              <div className="text-[11px] text-slate-500">SP trọng tâm</div>
            </div>
            <div className="rounded-lg bg-sky-50 p-2">
              <div className="text-sm font-bold text-sky-700">{tr(spxsDS)}tr</div>
              <div className="text-[11px] text-slate-500">SP Cấp 2</div>
            </div>
          </div>
          {spttDS + spxsDS > lk + 1_000_000 && (
            <p className="mt-2 text-[11px] text-slate-400">
              * DS trọng tâm/Cấp 2 có thể cao hơn Lũy kế tháng do trong tháng có đơn trả/điều chỉnh âm ở các sản phẩm ngoài trọng tâm (lũy kế đã trừ phần âm này).
            </p>
          )}
        </section>

        {/* Kế hoạch → Kết quả (KPI) */}
        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">🎯 Kế hoạch → Kết quả (KPI {thangLabel})</h2>
          <p className="mb-3 text-xs text-slate-400">
            Điểm KPI tháng (chính thức, gồm thưởng/phạt): <b>{diemFinal.toLocaleString("vi-VN")}</b>
            {pctDiem != null ? <> = {pctDiem}% mục tiêu {diemKHFile.toLocaleString("vi-VN")}</> : null} · điểm chỉ tiêu chính {diemCore.toLocaleString("vi-VN")}. Số điểm lấy từ file KPI công ty.
          </p>
          {es ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500">
                    <th className="px-3 py-2 text-left font-semibold">Chỉ tiêu</th>
                    <th className="px-3 py-2 text-right font-semibold">Kế hoạch</th>
                    <th className="px-3 py-2 text-right font-semibold">Thực hiện</th>
                    <th className="px-3 py-2 text-center font-semibold">% đạt</th>
                    <th className="px-3 py-2 text-right font-semibold">Điểm KH</th>
                    <th className="px-3 py-2 text-right font-semibold">Điểm TH</th>
                    <th className="px-3 py-2 text-left font-semibold">Nguồn</th>
                  </tr>
                </thead>
                <tbody>
                  {es.metrics.map((m) => {
                    const p = m.keHoach != null && m.keHoach > 0 && m.thucHien != null ? Math.round((m.thucHien / m.keHoach) * 100) : null;
                    return (
                      <tr key={m.key} className="border-b border-slate-100">
                        <td className="px-3 py-2 text-sm text-slate-800">{m.label}</td>
                        <td className="px-3 py-2 text-right text-sm text-slate-600">{fmtVal(m, m.keHoach)}</td>
                        <td className="px-3 py-2 text-right text-sm font-medium text-slate-900">{fmtVal(m, m.thucHien)}</td>
                        <td className="px-3 py-2 text-center">{p != null ? pctBadge(p) : <span className="text-slate-300">—</span>}</td>
                        <td className="px-3 py-2 text-right text-sm text-slate-500">{m.diemKH != null ? m.diemKH.toLocaleString("vi-VN") : "—"}</td>
                        <td className="px-3 py-2 text-right text-sm font-semibold text-slate-900">{m.diemTH != null ? m.diemTH.toLocaleString("vi-VN") : "—"}</td>
                        <td className="px-3 py-2 text-left text-[11px] text-slate-400">{NGUON_LABEL[m.nguon] ?? m.nguon}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-amber-600">Chưa khớp được nhân viên này trong file KPI {thangLabel}.{kpiErr ? ` (${kpiErr})` : ""}</p>
          )}
        </section>

        {/* Chi tiết sản phẩm */}
        <section className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold text-emerald-700">⭐ SP trọng tâm</h3>
            {spttRows.length ? (
              <table className="w-full text-sm">
                <tbody>
                  {spttRows.map(([pid, v]) => (
                    <tr key={pid} className="border-b border-slate-100">
                      <td className="py-1.5 pr-2 text-slate-700">{d.prod[pid]?.[1] ?? `#${pid}`}</td>
                      <td className="py-1.5 text-right font-medium tabular-nums text-slate-900">{tr(v)}tr</td>
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td className="py-1.5 pr-2 text-slate-900">Tổng</td>
                    <td className="py-1.5 text-right text-emerald-700">{tr(spttDS)}tr</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-slate-400">Chưa có phát sinh.</p>
            )}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold text-sky-700">🩺 SP Cấp 2 (Chuyên khoa PS)</h3>
            {spxsRows.length ? (
              <table className="w-full text-sm">
                <tbody>
                  {spxsRows.map(([pid, v]) => (
                    <tr key={pid} className="border-b border-slate-100">
                      <td className="py-1.5 pr-2 text-slate-700">{d.prod[pid]?.[1] ?? `#${pid}`}</td>
                      <td className="py-1.5 text-right font-medium tabular-nums text-slate-900">{tr(v)}tr</td>
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td className="py-1.5 pr-2 text-slate-900">Tổng</td>
                    <td className="py-1.5 text-right text-sky-700">{tr(spxsDS)}tr</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-slate-400">Chưa có phát sinh.</p>
            )}
          </div>
        </section>

        {/* Nhận xét */}
        <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">📝 Nhận xét {thangLabel}</h2>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {nhanXet.map((t, i) => (
              <li key={i}>• {t}</li>
            ))}
          </ul>
        </section>

        {kpiErr && es && <p className="mt-3 text-xs text-amber-600">Lưu ý KPI: {kpiErr}</p>}
      </main>
    </>
  );
}
