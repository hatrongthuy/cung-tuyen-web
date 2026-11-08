// Đọc dữ liệu CHECK-CALL (file "Dữ liệu nhóm PS Tây Bắc" của ASM) để tính TUÂN THỦ CUNG TUYẾN
// tuần cho từng NVKD — KHÔNG qua n8n. File này chia tab theo tháng:
//   - "Call MM/YY"        : lượt check-in THỰC TẾ (vd "Call 11/26")
//   - "Cung tuyến MM/YY"  : cung tuyến KẾ HOẠCH đã lập (vd "Cung tuyến 11/26")
// File được share "bất kỳ ai có link" nên service account đọc được. Khi sang tháng mới, tab tự
// đổi tên theo tháng hiện tại (không cần sửa gì); có thể ép tháng qua ?thang=YYYY-MM ở trang.

import { readSheetAsObjects } from "./sheets";
import { activeEmployees } from "./allowlist";

export const CHECKCALL_SPREADSHEET_ID =
  process.env.GOOGLE_SHEETS_CHECKCALL_SPREADSHEET_ID ||
  "1vfKKS4LkmnHhOqZzl-YvXETyvckC7mNXLKsj6bx0Fus";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function yy(year: number) {
  return String(year).slice(2);
}
export function callTabName(year: number, month1: number) {
  return `Call ${pad2(month1)}/${yy(year)}`;
}
export function cungTuyenTabName(year: number, month1: number) {
  return `Cung tuyến ${pad2(month1)}/${yy(year)}`;
}

function normMa(v: unknown): string {
  return String(v ?? "").trim().replace(/^0+/, "");
}

/** Parse "DD/MM/YYYY HH:MM:SS" (định dạng trong file check-call) -> Date (giờ địa phương). */
function parseVNDateTime(s: unknown): Date | null {
  const m = String(s ?? "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}):(\d{2}))?/);
  if (!m) return null;
  return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0));
}
function ymd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export interface NVTuanCungTuyen {
  maNV: string;
  hoTen: string;
  planKH: number; // số điểm KH trong tuyến (kế hoạch tuần)
  daGhe: number; // số điểm đã ghé đúng tuyến (đúng khách + đúng ngày)
  tyLe: number; // 0..100
  call: number; // tổng lượt call trong tuần
  callChuan: number; // call đạt chuẩn (>=5 phút & lệch <=100m)
  callVpNr: number; // call tại văn phòng/nhà riêng/hành chính
  gapKhach: number; // lượt gặp khách thật (loại hành chính/nhà riêng)
  raDon: number; // lượt có phát sinh đơn (ghi "lặp đơn")
  ngoaiTuyen: number; // lượt gặp khách KHÔNG nằm trong kế hoạch tuyến ngày đó
  daily: Array<{ thu: number; dung: number; tong: number }>; // thu: 2..8 (T2..CN)
  /** Danh sách khách CUNG TUYẾN đã lập trong tuần, theo ngày, kèm đã ghé hay chưa. */
  khach: Array<{ thu: number; ngay: string; maTC: string; ten: string; daGhe: boolean }>;
}

export interface TuanCungTuyen {
  weekLabel: string; // "02/11 - 08/11"
  tungNV: NVTuanCungTuyen[];
  tong: {
    planKH: number;
    daGhe: number;
    tyLe: number;
    call: number;
    callChuan: number;
    callVpNr: number;
    gapKhach: number;
    raDon: number;
  };
  error: string | null;
}

/** Thứ 2 (00:00) của tuần chứa ngày `d`. */
function mondayOf(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // 0 = Monday
  x.setDate(x.getDate() - dow);
  return x;
}

type Row = Record<string, string>;

const isAdmin = (nhiem: string, loai: string) =>
  /^Hành chính/i.test(nhiem || "") || /nhà riêng/i.test(loai || "");

/**
 * Tính tuân thủ cung tuyến TUẦN (mặc định tuần chứa `asof`, mặc định hôm nay) cho các NVKD đang
 * làm việc. Đọc tab theo tháng của `asof`.
 */
export async function getTuanCungTuyen(asof: Date = new Date()): Promise<TuanCungTuyen> {
  const year = asof.getFullYear();
  const month1 = asof.getMonth() + 1;
  const weekStart = mondayOf(asof);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  const inWeek = (d: Date | null) => !!d && d >= weekStart && d <= weekEnd;
  const weekLabel = `${pad2(weekStart.getDate())}/${pad2(weekStart.getMonth() + 1)} - ${pad2(
    weekEnd.getDate()
  )}/${pad2(weekEnd.getMonth() + 1)}`;

  const emps = activeEmployees(year, month1).filter((e) => e.role === "employee");
  const maToTen = new Map<string, string>();
  for (const e of emps) maToTen.set(normMa(e.maNhanVien), e.hoTen);
  const wantSet = new Set(maToTen.keys());

  const base: TuanCungTuyen = {
    weekLabel,
    tungNV: [],
    tong: { planKH: 0, daGhe: 0, tyLe: 0, call: 0, callChuan: 0, callVpNr: 0, gapKhach: 0, raDon: 0 },
    error: null,
  };

  let callRows: Row[] = [];
  let planRows: Row[] = [];
  try {
    [callRows, planRows] = await Promise.all([
      readSheetAsObjects<Row>(callTabName(year, month1), {
        spreadsheetId: CHECKCALL_SPREADSHEET_ID,
      }),
      readSheetAsObjects<Row>(cungTuyenTabName(year, month1), {
        spreadsheetId: CHECKCALL_SPREADSHEET_ID,
      }),
    ]);
  } catch (e) {
    base.error = e instanceof Error ? e.message : String(e);
    return base;
  }

  // ----- Kế hoạch (planned): nv -> ngày(ymd) -> Map(mã tổ chức -> tên) -----
  const planned = new Map<string, Map<string, Map<string, string>>>();
  for (const r of planRows) {
    const ma = normMa(r["Mã nhân viên"]);
    if (!wantSet.has(ma)) continue;
    const d = parseVNDateTime(r["Thời hạn"]);
    if (!inWeek(d)) continue;
    const tc = String(r["Mã tổ chức"] ?? "").trim();
    if (!tc) continue;
    const ten = String(r["Tên tổ chức"] ?? "").trim();
    const byDay = planned.get(ma) ?? new Map<string, Map<string, string>>();
    planned.set(ma, byDay);
    const key = ymd(d!);
    const m = byDay.get(key) ?? byDay.set(key, new Map()).get(key)!;
    if (!m.has(tc)) m.set(tc, ten);
  }

  // ----- Thực tế (actual) -----
  interface Acc {
    call: number;
    chuan: number;
    vpnr: number;
    gap: number;
    raDon: number;
    ngoai: number;
    visited: Map<string, Set<string>>; // ngày(ymd) -> Set(mã tổ chức)
  }
  const acc = new Map<string, Acc>();
  const ensure = (ma: string): Acc => {
    let a = acc.get(ma);
    if (!a) {
      a = { call: 0, chuan: 0, vpnr: 0, gap: 0, raDon: 0, ngoai: 0, visited: new Map() };
      acc.set(ma, a);
    }
    return a;
  };

  for (const r of callRows) {
    const ma = normMa(r["Mã NV"]);
    if (!wantSet.has(ma)) continue;
    const din = parseVNDateTime(r["TG CheckIn"]);
    if (!inWeek(din)) continue;
    const a = ensure(ma);
    a.call++;
    const dout = parseVNDateTime(r["TG CheckOut"]);
    const mins = din && dout ? (dout.getTime() - din.getTime()) / 60000 : 0;
    const sai = Math.abs(parseFloat(String(r["Sai lệch khoảng cách CheckIn"] ?? "").replace(",", ".")) || 0);
    if (mins >= 5 && sai <= 100) a.chuan++;

    const admin = isAdmin(r["Tên nhiệm vụ"] ?? "", r["Loại nhiệm vụ"] ?? "");
    if (admin) {
      a.vpnr++;
      continue;
    }
    a.gap++;
    if (/lặp đơn/i.test(r["Báo cáo"] ?? "")) a.raDon++;
    const tc = String(r["Mã Tổ chức"] ?? "").trim();
    const key = din ? ymd(din) : "";
    if (tc && key) {
      const byDay = a.visited.get(key) ?? a.visited.set(key, new Set()).get(key)!;
      byDay.add(tc);
      // "ngoài tuyến": khách này KHÔNG nằm trong kế hoạch tuyến của ngày đó
      const planDay = planned.get(ma)?.get(key);
      if (!planDay || !planDay.has(tc)) a.ngoai++;
    }
  }

  // ----- Gộp theo NV -----
  const tung: NVTuanCungTuyen[] = [];
  for (const [ma, hoTen] of maToTen) {
    const pl = planned.get(ma) ?? new Map<string, Map<string, string>>();
    const a = acc.get(ma);
    let planKH = 0;
    let daGhe = 0;
    const khach: NVTuanCungTuyen["khach"] = [];
    // daily T2..CN (thu 2..8)
    const dailyMap = new Map<number, { dung: number; tong: number }>();
    const dayKeys = [...pl.keys()].sort();
    for (const dayKey of dayKeys) {
      const planSet = pl.get(dayKey)!;
      const [y, m, dd] = dayKey.split("-").map(Number);
      const thu = (new Date(y, m - 1, dd).getDay() + 6) % 7 + 2; // 2..8
      const vis = a?.visited.get(dayKey) ?? new Set<string>();
      let hit = 0;
      planSet.forEach((ten, tc) => {
        const daGheKH = vis.has(tc);
        if (daGheKH) hit++;
        khach.push({ thu, ngay: `${pad2(dd)}/${pad2(m)}`, maTC: tc, ten, daGhe: daGheKH });
      });
      planKH += planSet.size;
      daGhe += hit;
      const cur = dailyMap.get(thu) ?? { dung: 0, tong: 0 };
      cur.dung += hit;
      cur.tong += planSet.size;
      dailyMap.set(thu, cur);
    }
    const daily = [2, 3, 4, 5, 6, 7, 8].map((thu) => ({
      thu,
      dung: dailyMap.get(thu)?.dung ?? 0,
      tong: dailyMap.get(thu)?.tong ?? 0,
    }));
    tung.push({
      maNV: ma,
      hoTen,
      planKH,
      daGhe,
      tyLe: planKH ? Math.round((daGhe / planKH) * 100) : 0,
      call: a?.call ?? 0,
      callChuan: a?.chuan ?? 0,
      callVpNr: a?.vpnr ?? 0,
      gapKhach: a?.gap ?? 0,
      raDon: a?.raDon ?? 0,
      ngoaiTuyen: a?.ngoai ?? 0,
      daily,
      khach,
    });
  }
  // sắp theo tỷ lệ tuân thủ giảm dần
  tung.sort((x, y) => y.tyLe - x.tyLe || y.gapKhach - x.gapKhach);

  const tong = base.tong;
  for (const t of tung) {
    tong.planKH += t.planKH;
    tong.daGhe += t.daGhe;
    tong.call += t.call;
    tong.callChuan += t.callChuan;
    tong.callVpNr += t.callVpNr;
    tong.gapKhach += t.gapKhach;
    tong.raDon += t.raDon;
  }
  tong.tyLe = tong.planKH ? Math.round((tong.daGhe / tong.planKH) * 100) : 0;

  return { weekLabel, tungNV: tung, tong, error: null };
}
