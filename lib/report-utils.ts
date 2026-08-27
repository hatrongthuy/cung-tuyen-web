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
