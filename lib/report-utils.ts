// Tiện ích thuần (không import googleapis) — DÙNG ĐƯỢC Ở CLIENT COMPONENT.
// Không import từ lib/data hay lib/aggregate ở client vì chúng kéo theo googleapis.

/** Cột "Tuần" dạng "dd/MM/yyyy - dd/MM/yyyy" -> Date của ngày bắt đầu tuần. */
export function parseWeekStart(tuan: string): Date | null {
  const m = (tuan || "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

/** Khóa tháng "MM/yyyy" theo ngày bắt đầu tuần (tuần bắc cầu 2 tháng tính theo ngày đầu tuần). */
export function monthKeyOfWeek(tuan: string): string | null {
  const d = parseWeekStart(tuan);
  if (!d) return null;
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

/** Ghép nhãn tuần "dd/MM/yyyy - dd/MM/yyyy" từ ngày bắt đầu. */
export function formatWeekLabel(start: Date): string {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const f = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  return `${f(start)} - ${f(end)}`;
}

/** Nhãn tuần (căn theo THỨ bắt đầu của `anchorLabel`) CHỨA ngày `today`.
 * Dùng để xác định "tuần hiện tại" ngay cả khi tuần đó CHƯA có trong dữ liệu đánh giá
 * (workflow mới chấm điểm vào 20h thứ 7). Nếu không có anchor hợp lệ -> null. */
export function currentWeekLabel(anchorLabel: string | null | undefined, today: Date): string | null {
  const anchor = anchorLabel ? parseWeekStart(anchorLabel) : null;
  if (!anchor) return null;
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const DAY = 86400 * 1000;
  let s = anchor.getTime();
  while (s + 6 * DAY < t) s += 7 * DAY; // tiến tới khi cửa sổ [s, s+6] chạm/ vượt today
  while (s > t) s -= 7 * DAY; // lùi lại nếu today nằm trước anchor
  return formatWeekLabel(new Date(s));
}

/** Khóa tháng "MM/yyyy" của một ngày. */
export function monthKeyOf(today: Date): string {
  return `${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;
}

/** Ngày HÔM NAY theo giờ Việt Nam (Asia/Ho_Chi_Minh), trả về Date ở nửa đêm địa phương.
 * Tính bằng Intl nên đúng cả khi server chạy ở UTC. */
export function todayInVN(): Date {
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Danh sách các tuần (không trùng) sắp xếp mới -> cũ. */
export function distinctWeeksDesc(tuans: string[]): string[] {
  const set = new Map<string, Date | null>();
  for (const t of tuans) {
    if (!t) continue;
    if (!set.has(t)) set.set(t, parseWeekStart(t));
  }
  return [...set.keys()].sort((a, b) => {
    const da = set.get(a)?.getTime() ?? 0;
    const db = set.get(b)?.getTime() ?? 0;
    return db - da;
  });
}

/** Danh sách tháng "MM/yyyy" (không trùng) sắp xếp mới -> cũ. */
export function distinctMonthsDesc(tuans: string[]): string[] {
  const keys = new Set<string>();
  for (const t of tuans) {
    const k = monthKeyOfWeek(t);
    if (k) keys.add(k);
  }
  return [...keys].sort((a, b) => {
    const [ma, ya] = a.split("/").map(Number);
    const [mb, yb] = b.split("/").map(Number);
    return yb - ya || mb - ma;
  });
}

/** Chuẩn hóa mã nhân viên (bỏ số 0 ở đầu) để so khớp — giống hàm trong lib/data. */
export function normalizeMaNV(v: string | number | null | undefined): string {
  return String(v ?? "").trim().replace(/^0+(?=\d)/, "");
}

/** Số nguyên an toàn từ ô chuỗi. */
export function parseInt0(v: unknown): number {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : 0;
}

/** Tìm tên cột theo danh sách từ khóa (không phân biệt hoa/thường, dấu cách thừa). */
export function findColumn(columns: string[], keywords: string[]): string | null {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  for (const c of columns) {
    const n = norm(c);
    if (keywords.every((k) => n.includes(norm(k)))) return c;
  }
  return null;
}

// ---------- Cộng dồn doanh số THỰC HIỆN (từ file Sale) theo nhân viên ----------

export type Kenh = "thau" | "keDon";

export interface SaleTxnLite {
  ma: string;
  dateMs: number | null;
  nam: number;
  thang: number;
  dt: number;
  kenh?: Kenh;
}

/** Tổng doanh thu theo mã nhân viên cho 1 tháng (nam, thang). Nếu truyền `kenh` thì chỉ tính kênh đó. */
export function salesByMonth(
  txns: SaleTxnLite[],
  nam: number,
  thang: number,
  kenh?: Kenh
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of txns) {
    if (t.nam === nam && t.thang === thang && (!kenh || t.kenh === kenh)) {
      out[t.ma] = (out[t.ma] ?? 0) + t.dt;
    }
  }
  return out;
}

/** Tổng doanh thu theo mã nhân viên cho 1 khoảng ngày [startMs, endMs]. Lọc theo `kenh` nếu có. */
export function salesByRange(
  txns: SaleTxnLite[],
  startMs: number,
  endMs: number,
  kenh?: Kenh
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of txns) {
    if (t.dateMs != null && t.dateMs >= startMs && t.dateMs <= endMs && (!kenh || t.kenh === kenh)) {
      out[t.ma] = (out[t.ma] ?? 0) + t.dt;
    }
  }
  return out;
}

/** Tổng toàn bộ doanh thu 1 map (theo nhân viên) -> 1 số. */
export function sumValues(m: Record<string, number>): number {
  return Object.values(m).reduce((s, x) => s + x, 0);
}

/** % thay đổi so với kỳ trước. Trả về null nếu không so được (kỳ trước = 0). */
export function pctChange(cur: number, prev: number): number | null {
  if (!prev) return cur ? null : 0;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

/** Chuỗi hiển thị chênh lệch so với kỳ trước, ví dụ "▲ +12%" / "▼ -8%" / "+3". */
export function deltaLabel(cur: number, prev: number, asPercent = true): string {
  const diff = cur - prev;
  if (prev === 0 && cur === 0) return "—";
  const arrow = diff > 0 ? "▲" : diff < 0 ? "▼" : "→";
  if (asPercent) {
    const p = pctChange(cur, prev);
    if (p === null) return `${arrow} mới`;
    return `${arrow} ${p > 0 ? "+" : ""}${Math.round(p)}% so với kỳ trước`;
  }
  return `${arrow} ${diff > 0 ? "+" : ""}${diff} so với kỳ trước`;
}

// ---------- Bài 1 (mức TỐT): Khách hàng cần chăm sóc theo từng nhân viên ----------
// Gom 3 nguồn cảnh báo (chưa viếng thăm, KH "chết", SP nghỉ) thành 1 danh sách khách cần
// chăm sóc, nhóm theo TÊN nhân viên. Dùng để hiển thị "bức tranh khách hàng" trên báo cáo
// tiến độ và nạp vào phần phân tích AI (đề xuất số lần gặp để chốt đơn).

export type LoaiChamSoc = "chet" | "chua-tham" | "sp-nghi";

export interface CareItem {
  tenKhach: string;
  tinh: string;
  hang: string;
  loai: LoaiChamSoc;
  soNgay: number; // số ngày chưa phát sinh / chưa viếng thăm / chưa mua lại
  doanhThu12T: number; // doanh thu 12 tháng (hoặc lũy kế) — dùng để xếp ưu tiên
  chiTiet: string; // mô tả ngắn để hiển thị
  deXuatLan: number; // đề xuất số lần gặp thêm để chốt đơn
  deXuatTuan: number; // trong bao nhiêu tuần
  caoGiaTri: boolean; // khách giá trị cao / hạng A -> ưu tiên gặp dày
}

/** Đề xuất số lần gặp thêm để chốt lại đơn (quy tắc, luôn hiển thị — không cần AI).
 * Nguyên tắc: khách "chết" cần nhiều lần chạm để tái kích hoạt hơn khách chỉ chưa thăm; để càng
 * lâu càng cần thêm 1–2 lần; khách giá trị cao thì gặp DÀY hơn (2 buổi/tuần) để chốt nhanh. */
function deXuatGap(loai: LoaiChamSoc, soNgay: number, doanhThu12T: number, hang: string) {
  let soLan = loai === "chet" ? 3 : 2; // chưa thăm & SP nghỉ: 2; KH chết: 3
  const nguongLau = loai === "chet" ? 180 : loai === "chua-tham" ? 30 : 90;
  if (soNgay >= nguongLau) soLan += 1;
  if (soNgay >= nguongLau * 2) soLan += 1;
  soLan = Math.min(soLan, 5);
  const caoGiaTri = doanhThu12T >= 50_000_000 || /^\s*a/i.test(hang || "");
  // Cao giá trị: gặp dày ~2 buổi/tuần (rút ngắn còn nửa số tuần); còn lại ~1 buổi/tuần.
  const soTuan = caoGiaTri ? Math.max(2, Math.ceil(soLan / 2)) : soLan;
  return { soLan, soTuan, caoGiaTri };
}

function moneyNum(v: unknown): number {
  const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Trọng số ưu tiên: KH "chết" > chưa viếng thăm > SP nghỉ; trong cùng loại, doanh thu 12T cao
 * và số ngày lớn thì lên trước (khách giá trị + để lâu = mất đơn nặng nhất). */
function careWeight(it: CareItem): number {
  const base = it.loai === "chet" ? 3 : it.loai === "chua-tham" ? 2 : 1;
  return base * 1e15 + it.doanhThu12T + it.soNgay * 1e6;
}

/** Gom khách cần chăm sóc theo TÊN nhân viên từ 3 sheet cảnh báo. */
export function buildCareByEmp(
  chuaVT: Record<string, string>[],
  khChet: Record<string, string>[],
  spNghi: Record<string, string>[]
): Record<string, CareItem[]> {
  const map: Record<string, CareItem[]> = {};
  const push = (ten: string, it: Omit<CareItem, "deXuatLan" | "deXuatTuan" | "caoGiaTri">) => {
    const key = (ten || "").trim();
    if (!key) return;
    const { soLan, soTuan, caoGiaTri } = deXuatGap(it.loai, it.soNgay, it.doanhThu12T, it.hang);
    (map[key] ||= []).push({ ...it, deXuatLan: soLan, deXuatTuan: soTuan, caoGiaTri });
  };

  for (const r of khChet) {
    const soNgay = moneyNum(r["Số ngày chưa phát sinh"]);
    push(r["Tên nhân viên"], {
      tenKhach: r["Tên khách hàng"] || "",
      tinh: r["Tỉnh"] || "",
      hang: r["Hạng"] || "",
      loai: "chet",
      soNgay,
      doanhThu12T: moneyNum(r["Doanh thu 12T"]) || moneyNum(r["Doanh thu lũy kế"]),
      chiTiet: `${soNgay} ngày chưa phát sinh sale`,
    });
  }
  for (const r of chuaVT) {
    const soNgay = moneyNum(r["Số ngày chưa có lượt viếng thăm/call"]);
    push(r["Tên nhân viên"], {
      tenKhach: r["Tên khách hàng"] || "",
      tinh: r["Tỉnh"] || "",
      hang: r["Hạng"] || "",
      loai: "chua-tham",
      soNgay,
      doanhThu12T: moneyNum(r["Doanh thu 12T"]),
      chiTiet: `${soNgay} ngày chưa viếng thăm/call`,
    });
  }
  for (const r of spNghi) {
    const soNgay = moneyNum(r["Số ngày chưa mua lại"]);
    push(r["Tên nhân viên"], {
      tenKhach: r["Tên khách hàng"] || "",
      tinh: r["Tỉnh"] || "",
      hang: r["Hạng KH"] || "",
      loai: "sp-nghi",
      soNgay,
      doanhThu12T: moneyNum(r["Doanh thu lũy kế"]),
      chiTiet: `SP "${r["Tên sản phẩm"] || ""}" — ${soNgay} ngày chưa mua lại`,
    });
  }

  for (const ten of Object.keys(map)) {
    map[ten].sort((a, b) => careWeight(b) - careWeight(a));
  }
  return map;
}
