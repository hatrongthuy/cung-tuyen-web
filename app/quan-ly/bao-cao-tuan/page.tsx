import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import StatCard from "@/components/StatCard";
import ReportDownload from "@/components/ReportDownload";
import { TEN_NHOM } from "@/lib/scope";
import { getKpiScorecard, type EmployeeScore } from "@/lib/kpi-actuals";
import { getTuanCungTuyen } from "@/lib/check-call";
import {
  getBaoCaoThau,
  locNhomPhuTrach,
  canhBaoThauGap,
  type CanhBaoThauGap,
} from "@/lib/thau-data";
import { getCanhBaoKhachChet, getCanhBaoSanPhamNghi } from "@/lib/data";
import { maAnBaoCao, allEmployees } from "@/lib/allowlist";
import { todayInVN } from "@/lib/report-utils";

export const dynamic = "force-dynamic";

const TINH_NHOM = new Set(["phu tho", "vinh phuc", "hoa binh"]);
const boDau = (s: string) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim();
const tr = (v: number) => Math.round(v / 1_000_000).toLocaleString("vi-VN");
const normMa = (v: string) => String(v ?? "").trim().replace(/^0+/, "");
const THU_LABEL: Record<number, string> = { 2: "T2", 3: "T3", 4: "T4", 5: "T5", 6: "T6", 7: "T7", 8: "CN" };

function metric(es: EmployeeScore | undefined, key: string) {
  return es?.metrics.find((m) => m.key === key);
}

export default async function BaoCaoTuanPage({
  searchParams,
}: {
  searchParams?: Promise<{ thang?: string }>;
}) {
  const session = await auth();
  const user = session!.user!;

  const today = todayInVN();
  const sp = (await searchParams) ?? {};
  let ty = today.getFullYear();
  let tmonth = today.getMonth();
  let asof = today;
  if (sp.thang && /^\d{4}-\d{1,2}$/.test(sp.thang)) {
    const [y, m] = sp.thang.split("-").map(Number);
    ty = y;
    tmonth = m - 1;
    asof = new Date(y, m - 1, 15); // giữa tháng được chọn
  }
  const thangLabel = `T${tmonth + 1}/${ty}`;
  const ngayLabel = `${String(today.getDate()).padStart(2, "0")}/${String(
    today.getMonth() + 1
  ).padStart(2, "0")}/${today.getFullYear()}`;
  const maAn = maAnBaoCao();
  const boDauTen = (s: string) => boDau(s).replace(/\s+/g, " ");
  const tenAn = new Set(
    allEmployees().filter((e) => e.anBaoCao).map((e) => boDauTen(e.hoTen))
  );

  // ----- Dữ liệu 4 phần -----
  const [kpi, ct, thauRaw, khChetRaw, spNghiRaw] = await Promise.all([
    getKpiScorecard(TEN_NHOM, ty, tmonth + 1).catch(() => ({ rows: [] as EmployeeScore[], monthLabel: thangLabel, error: "x" })),
    getTuanCungTuyen(asof),
    getBaoCaoThau().then(locNhomPhuTrach).catch(() => []),
    getCanhBaoKhachChet().catch(() => []),
    getCanhBaoSanPhamNghi().catch(() => []),
  ]);

  // Phần 1: KPI — tổng quan nhóm
  const kpiRows = kpi.rows.filter((r) => !maAn.has(normMa(r.ma)));
  const sumTH = (key: string) => kpiRows.reduce((s, r) => s + (metric(r, key)?.thucHien ?? 0), 0);
  const sumKH = (key: string) => kpiRows.reduce((s, r) => s + (metric(r, key)?.keHoach ?? 0), 0);
  const keDonTH = sumTH("keDon");
  const keDonKH = sumKH("keDon");
  const thauTH = sumTH("thau");
  const thauKH = sumKH("thau");
  const diemNhom = kpiRows.reduce((s, r) => s + (r.diemTHFinal ?? r.diemDat ?? 0), 0);
  const tienDo = Math.round((today.getDate() / 30) * 100);

  // Phần 3: thầu báo động (nhóm PS, 3 tỉnh, bỏ Lạc Việt), cửa sổ 6 tháng
  const thauCanhBao: CanhBaoThauGap[] = canhBaoThauGap(thauRaw, { maxThang: 6 }).filter(
    (k) => TINH_NHOM.has(boDau(k.tinh)) && !boDau(k.tenKhach).includes("lac viet")
  );
  // Kê đơn báo động: khách lâu chưa phát sinh (ẩn NV anBaoCao)
  const khChet = khChetRaw
    .filter((r) => !tenAn.has(boDauTen(r["Tên nhân viên"] ?? "")))
    .map((r) => ({
      kh: r["Tên khách hàng"],
      nv: r["Tên nhân viên"],
      tinh: r["Tỉnh"],
      ngay: Number(r["Số ngày chưa phát sinh"]) || 0,
      ds12: Number(r["Doanh thu 12T"]) || 0,
      muc: r["Mức độ"] || "",
    }))
    .sort((a, b) => b.ngay - a.ngay);
  const spNghi = spNghiRaw
    .filter((r) => !tenAn.has(boDauTen(r["Tên nhân viên"] ?? "")))
    .map((r) => ({
    kh: r["Tên khách hàng"],
    nv: r["Tên nhân viên"],
    sp: r["Tên sản phẩm"],
    ngay: Number(r["Số ngày chưa mua lại"]) || 0,
  })).sort((a, b) => b.ngay - a.ngay);

  // Phần 4: gộp việc cần làm theo NVKD
  const keHoach = new Map<string, { thau: CanhBaoThauGap[]; keDon: typeof khChet }>();
  // thầu không có tên NV trực tiếp trong canhBaoThauGap -> gom chung "Cả nhóm"
  const nvNames = Array.from(new Set([...khChet.map((x) => x.nv)])).filter(Boolean);
  for (const nv of nvNames) keHoach.set(nv, { thau: [], keDon: [] });
  for (const k of khChet) {
    const g = keHoach.get(k.nv) ?? keHoach.set(k.nv, { thau: [], keDon: [] }).get(k.nv)!;
    g.keDon.push(k);
  }

  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="manager" active="bao-cao-tuan" weekLabel={ct.weekLabel} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <div className="mb-3 flex items-center justify-end">
          <ReportDownload targetId="bctuan" fileName={`Bao-cao-tuan-${ct.weekLabel.replace(/\//g, "-").replace(/ /g, "")}`} />
        </div>
        <div id="bctuan">
          {/* Tiêu đề */}
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#0b3b40] to-[#0b6e75] p-6 text-white shadow-sm">
            <h1 className="text-xl font-bold sm:text-2xl">📋 Báo cáo tuần — {ct.weekLabel}</h1>
            <p className="mt-1 text-sm text-white/80">
              Nhóm PS Phú Thọ · SS Hà Trọng Thủy · KPI {thangLabel} · cung tuyến đọc thẳng từ check‑call (không qua n8n) · cập nhật {ngayLabel}
            </p>
          </div>

          {/* ===== PHẦN 1: KPI THÁNG ===== */}
          <SectionTitle n={1} t={`Thực hiện KPI tháng ${thangLabel}`} />
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Điểm KPI nhóm" value={`${Math.round(diemNhom)}/1000`} accentColor="#2a78d6" />
            <StatCard label="DS kê đơn (tr)" value={`${tr(keDonTH)} / ${tr(keDonKH)}`} accentColor="#1baf7a" />
            <StatCard label="DS thầu (tr)" value={`${tr(thauTH)} / ${tr(thauKH)}`} accentColor="#eb6834" />
            <StatCard label="Tiến độ thời gian" value={`${tienDo}%`} accentColor="#eda100" />
          </section>
          {kpi.error ? (
            <p className="mt-2 text-xs text-amber-600">Chưa đọc được file KPI.</p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <table className="w-full min-w-[640px] text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="px-2 py-2">NVKD</th>
                    <th className="px-2 py-2 text-right">Điểm</th>
                    <th className="px-2 py-2 text-right">DS kê đơn (tr)</th>
                    <th className="px-2 py-2 text-right">DS thầu (tr)</th>
                  </tr>
                </thead>
                <tbody>
                  {kpiRows.map((r) => (
                    <tr key={r.ma} className="border-b border-slate-100">
                      <td className="px-2 py-2 font-medium text-slate-800">{r.ten}</td>
                      <td className="px-2 py-2 text-right font-semibold">{Math.round(r.diemTHFinal ?? r.diemDat ?? 0)}</td>
                      <td className="px-2 py-2 text-right">{tr(metric(r, "keDon")?.thucHien ?? 0)} / {tr(metric(r, "keDon")?.keHoach ?? 0)}</td>
                      <td className="px-2 py-2 text-right">{tr(metric(r, "thau")?.thucHien ?? 0)} / {tr(metric(r, "thau")?.keHoach ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ===== PHẦN 2: TUÂN THỦ CUNG TUYẾN TUẦN ===== */}
          <SectionTitle n={2} t={`Tuân thủ cung tuyến tuần ${ct.weekLabel}`} />
          {ct.error ? (
            <p className="text-xs text-amber-600">Chưa đọc được dữ liệu check‑call: {ct.error}</p>
          ) : (
            <>
              <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                <StatCard label="KH trong tuyến" value={ct.tong.planKH} accentColor="#2a78d6" />
                <StatCard label="Đã ghé đúng tuyến" value={ct.tong.daGhe} accentColor="#1baf7a" />
                <StatCard label="Tỷ lệ tuân thủ" value={`${ct.tong.tyLe}%`} accentColor="#eb6834" />
                <StatCard label="Call / đạt chuẩn" value={`${ct.tong.call} / ${ct.tong.callChuan}`} accentColor="#2a78d6" />
                <StatCard label="Call VP / nhà riêng" value={ct.tong.callVpNr} accentColor="#e34948" />
                <StatCard label="Gặp khách · ra đơn" value={`${ct.tong.gapKhach} · ${ct.tong.raDon}`} accentColor="#1baf7a" />
              </section>
              <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <table className="w-full min-w-[760px] text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="px-2 py-2">NVKD</th>
                      {[2, 3, 4, 5, 6, 7, 8].map((thu) => (
                        <th key={thu} className="px-1.5 py-2 text-center">{THU_LABEL[thu]}</th>
                      ))}
                      <th className="px-2 py-2 text-right">Tuân thủ</th>
                      <th className="px-2 py-2 text-right">Call (chuẩn)</th>
                      <th className="px-2 py-2 text-right">VP/NR</th>
                      <th className="px-2 py-2 text-right">Gặp</th>
                      <th className="px-2 py-2 text-right">Ra đơn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ct.tungNV.map((e) => (
                      <tr key={e.maNV} className="border-b border-slate-100">
                        <td className="px-2 py-2 font-medium text-slate-800">{e.hoTen}</td>
                        {e.daily.map((d) => (
                          <td key={d.thu} className="px-1.5 py-2 text-center text-slate-600">
                            {d.tong > 0 ? `${d.dung}/${d.tong}` : "·"}
                          </td>
                        ))}
                        <td className="px-2 py-2 text-right font-semibold" style={{ color: e.tyLe >= 50 ? "#1baf7a" : e.tyLe >= 30 ? "#eda100" : "#e34948" }}>
                          {e.tyLe}%
                        </td>
                        <td className="px-2 py-2 text-right">{e.call} ({e.callChuan})</td>
                        <td className="px-2 py-2 text-right text-rose-600">{e.callVpNr}</td>
                        <td className="px-2 py-2 text-right">{e.gapKhach}</td>
                        <td className="px-2 py-2 text-right font-medium text-emerald-700">{e.raDon}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-[11px] text-slate-400">
                  Ô ngày = KH ghé đúng tuyến / KH có trong kế hoạch tuyến ngày đó. Call chuẩn = check‑in ≥ 5 phút &amp; lệch ≤ 100m. Nguồn: file check‑call ({ct.weekLabel}).
                </p>
              </div>
            </>
          )}

          {/* ===== PHẦN 3: ĐIỂM BÁN BÁO ĐỘNG ===== */}
          <SectionTitle n={3} t="Điểm bán báo động — Thầu & Kê đơn" />
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">🏛️ Thầu sắp hết hạn còn nhiều hàng</h3>
              <p className="mt-0.5 text-xs text-slate-400">Phú Thọ · Vĩnh Phúc · Hoà Bình · gói còn ≤ 6 tháng, TH &lt; 85%.</p>
              <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
                {thauCanhBao.length === 0 && <li className="text-xs text-slate-400">Không có.</li>}
                {thauCanhBao.slice(0, 20).map((k) => (
                  <li key={k.maKhach} className="rounded-lg bg-slate-50 p-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-800">{k.tenKhach}</span>
                      <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700">
                        còn {k.soThangConLai.toFixed(1)} th · {Math.round(k.tyLeThucHien * 100)}%
                      </span>
                    </div>
                    <p className="mt-0.5 text-slate-500">{k.tinh} · DS còn lại {tr(k.doanhSoConLai)}tr · cần gọi {tr(k.canMoiThang)}tr/th</p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">💊 Khách kê đơn lâu chưa phát sinh lại</h3>
              <p className="mt-0.5 text-xs text-slate-400">Theo sheet &quot;Cảnh báo KH chết&quot; — ưu tiên khách lâu nhất.</p>
              <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
                {khChet.length === 0 && <li className="text-xs text-slate-400">Không có.</li>}
                {khChet.slice(0, 20).map((k, i) => (
                  <li key={i} className="rounded-lg bg-slate-50 p-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-800">{k.kh}</span>
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                        {k.ngay} ngày
                      </span>
                    </div>
                    <p className="mt-0.5 text-slate-500">{k.nv} · {k.tinh} · DT12T {tr(k.ds12)}tr</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
          {spNghi.length > 0 && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">⛔ Sản phẩm khách đã nghỉ mua</h3>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {spNghi.slice(0, 12).map((s, i) => (
                  <li key={i} className="rounded-lg bg-slate-50 p-2 text-xs">
                    <span className="font-medium text-slate-800">{s.kh}</span> — {s.sp}
                    <span className="text-slate-400"> · {s.nv} · {s.ngay} ngày</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ===== PHẦN 4: KẾ HOẠCH XỬ LÝ TỪNG NVKD ===== */}
          <SectionTitle n={4} t="Kế hoạch xử lý từng NVKD (tuần tới)" />
          <div className="space-y-4">
            {nvNames.length === 0 && <p className="text-xs text-slate-400">Chưa có khách báo động để lên kế hoạch.</p>}
            {nvNames.map((nv) => {
              const g = keHoach.get(nv)!;
              return (
                <div key={nv} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {nv} <span className="font-normal text-slate-400">· {g.keDon.length} khách cần gặp lại</span>
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    {g.keDon.slice(0, 8).map((k, i) => (
                      <li key={i} className="rounded-lg bg-slate-50 p-2 text-xs">
                        <span className="font-medium text-slate-800">{k.kh}</span>
                        <span className="text-slate-400"> ({k.tinh})</span> — {k.ngay} ngày chưa phát sinh ·{" "}
                        <span className="text-slate-600">Gặp lại, tìm lý do ngừng, chốt đơn lại trong tuần.</span>
                      </li>
                    ))}
                    {g.keDon.length > 8 && <li className="text-[11px] text-slate-400">… và {g.keDon.length - 8} khách khác.</li>}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}

function SectionTitle({ n, t }: { n: number; t: string }) {
  return (
    <div className="mt-6 mb-3 flex items-center gap-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0b6e75] text-xs font-bold text-white">{n}</span>
      <h2 className="text-base font-semibold text-slate-900">{t}</h2>
    </div>
  );
}
