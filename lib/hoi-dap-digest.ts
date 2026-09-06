import type { SaleDetailData } from "./sale-detail";

// Tạo "bản tóm tắt số liệu" (digest) CHÍNH XÁC từ dữ liệu Sale để nạp cho AI trả lời hỏi–đáp.
// Số liệu được tính sẵn ở server (không để AI tự cộng), AI chỉ đọc digest + câu hỏi để diễn giải.

const DAY = 86400000;
const nf = new Intl.NumberFormat("vi-VN");

function vnd(n: number) {
  return nf.format(Math.round(n)) + "đ";
}
function short(n: number) {
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(a >= 1e10 ? 1 : 2).replace(".", ",") + " tỷ";
  if (a >= 1e6) return Math.round(n / 1e6) + " tr";
  if (a >= 1e3) return Math.round(n / 1e3) + "k";
  return String(Math.round(n));
}

export function buildHoiDapDigest(
  data: SaleDetailData,
  win: { nowFromMs: number; nowToMs: number; prevFromMs: number; prevToMs: number; todayLabel: string; lastMonthLabel: string }
): string {
  if (data.error) return `Lỗi đọc dữ liệu Sale: ${data.error}`;
  const baseMs = new Date(data.base + "T00:00:00").getTime();
  const msToDi = (ms: number) => Math.round((ms - baseMs) / DAY);
  const diToDate = (di: number) => {
    const d = new Date(baseMs + di * DAY);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  };
  const diToYm = (di: number) => {
    const d = new Date(baseMs + di * DAY);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const C = { cid: 0, tid: 1, pid: 2, di: 3, sl: 4, dt: 5 };
  const { tdv, cust, prod, rows, focus } = data;

  const nf1 = msToDi(win.nowFromMs), nt1 = msToDi(win.nowToMs);
  const pf1 = msToDi(win.prevFromMs), pt1 = msToDi(win.prevToMs);
  const inNow = (di: number) => di >= nf1 && di <= nt1;
  const inPrev = (di: number) => di >= pf1 && di <= pt1;

  const isThau = (cid: number) => (cust[cid]?.[3] || "").toLowerCase().includes("thầu");
  const focusPids = new Set<number>(Object.values(focus).flat());

  const L: string[] = [];
  L.push(`DỮ LIỆU BÁN HÀNG — NHÓM HÀ TRỌNG THỦY (PS Phú Thọ). Hôm nay: ${win.todayLabel}. Mốc số liệu mới nhất: ${diToDate(data.asofDi)}.`);
  L.push(`Kênh bán: khách "Nhóm khách hàng" có chữ "thầu" = doanh số THẦU; còn lại = KÊ ĐƠN (KĐ). Doanh thu là net.`);
  L.push(`Nhân viên nhóm: ${tdv.join(", ")}.`);
  L.push(`Kỳ "tháng này" = ${diToDate(nf1)}–${diToDate(nt1)}; "cùng kỳ" (tháng ${win.lastMonthLabel}) = ${diToDate(pf1)}–${diToDate(pt1)}.`);
  L.push("");

  // 1) Toàn nhóm theo tháng
  const byMonth = new Map<string, { kd: number; thau: number }>();
  for (const r of rows) {
    const ym = diToYm(r[C.di]);
    let m = byMonth.get(ym);
    if (!m) { m = { kd: 0, thau: 0 }; byMonth.set(ym, m); }
    if (isThau(r[C.cid])) m.thau += r[C.dt]; else m.kd += r[C.dt];
  }
  L.push("== DOANH SỐ TOÀN NHÓM THEO THÁNG (KĐ | Thầu | Tổng) ==");
  for (const ym of [...byMonth.keys()].sort()) {
    const m = byMonth.get(ym)!;
    L.push(`- ${ym}: KĐ ${short(m.kd)} | Thầu ${short(m.thau)} | Tổng ${short(m.kd + m.thau)}`);
  }
  L.push("");

  // 2) Theo nhân viên: tổng toàn kỳ, tháng này (KĐ/thầu) vs cùng kỳ
  const nvAll = tdv.map(() => ({ kd: 0, thau: 0 }));
  const nvNow = tdv.map(() => ({ kd: 0, thau: 0 }));
  const nvPrev = tdv.map(() => ({ kd: 0, thau: 0 }));
  for (const r of rows) {
    const t = r[C.tid];
    const bucketAll = nvAll[t];
    if (isThau(r[C.cid])) bucketAll.thau += r[C.dt]; else bucketAll.kd += r[C.dt];
    if (inNow(r[C.di])) { if (isThau(r[C.cid])) nvNow[t].thau += r[C.dt]; else nvNow[t].kd += r[C.dt]; }
    else if (inPrev(r[C.di])) { if (isThau(r[C.cid])) nvPrev[t].thau += r[C.dt]; else nvPrev[t].kd += r[C.dt]; }
  }
  L.push("== THEO NHÂN VIÊN (tháng này KĐ/Thầu — cùng kỳ — tổng toàn kỳ) ==");
  tdv.forEach((name, t) => {
    L.push(`- ${name}: tháng này KĐ ${short(nvNow[t].kd)}/Thầu ${short(nvNow[t].thau)}; cùng kỳ KĐ ${short(nvPrev[t].kd)}/Thầu ${short(nvPrev[t].thau)}; tổng toàn kỳ KĐ ${short(nvAll[t].kd)}/Thầu ${short(nvAll[t].thau)}.`);
  });
  L.push("");

  // 3) Theo sản phẩm: tổng DT/SL/điểm bán toàn kỳ + DT tháng này
  interface P { dt: number; sl: number; custs: Set<number>; dtNow: number; last: number }
  const prodAgg: P[] = prod.map(() => ({ dt: 0, sl: 0, custs: new Set(), dtNow: 0, last: -1 }));
  for (const r of rows) {
    const p = prodAgg[r[C.pid]];
    p.dt += r[C.dt]; p.sl += r[C.sl]; p.custs.add(r[C.cid]);
    if (r[C.di] > p.last) p.last = r[C.di];
    if (inNow(r[C.di])) p.dtNow += r[C.dt];
  }
  const prodOrder = prod.map((_, i) => i).sort((a, b) => prodAgg[b].dt - prodAgg[a].dt);
  L.push("== THEO SẢN PHẨM (toàn kỳ: DT | SL | số điểm bán; DT tháng này; ⭐=SP trọng tâm) ==");
  for (const i of prodOrder) {
    const p = prodAgg[i];
    L.push(`- ${prod[i][1]}${focusPids.has(i) ? " ⭐" : ""}: DT ${short(p.dt)} | SL ${nf.format(p.sl)} | ${p.custs.size} điểm; tháng này ${short(p.dtNow)}.`);
  }
  L.push("");

  // 4) Theo khách hàng (toàn kỳ): tổng DT, SP đã mua, lần mua gần nhất, số ngày chưa mua, trạng thái
  interface Cst { dt: number; last: number; prods: Set<number> }
  const cstAgg: Cst[] = cust.map(() => ({ dt: 0, last: -1, prods: new Set() }));
  for (const r of rows) {
    const c = cstAgg[r[C.cid]];
    c.dt += r[C.dt]; c.prods.add(r[C.pid]);
    if (r[C.di] > c.last) c.last = r[C.di];
  }
  const status = (days: number) => (days <= 45 ? "duy trì tốt" : days <= 90 ? "chú ý" : "lâu chưa lấy");
  const cstOrder = cust.map((_, i) => i).sort((a, b) => cstAgg[b].dt - cstAgg[a].dt);
  L.push("== THEO KHÁCH HÀNG (mã, tỉnh, kênh; tổng DT; SP đã mua; lần mua gần nhất; số ngày chưa mua; trạng thái) ==");
  for (const i of cstOrder) {
    const c = cstAgg[i];
    if (c.last < 0) continue;
    const days = data.asofDi - c.last;
    const spNames = [...c.prods].map((pid) => prod[pid][1]).join("; ");
    L.push(`- ${cust[i][1]} [${cust[i][0]}, ${cust[i][2]}, ${cust[i][3]}]: DT ${short(c.dt)}; SP: ${spNames}; mua gần nhất ${diToDate(c.last)} (${days} ngày trước — ${status(days)}).`);
  }
  return L.join("\n");
}
