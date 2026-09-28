// Tiện ích khoá tuần ISO "yyyy-Www" — dùng chung cho phần Giao việc (client & server đều dùng được,
// không phụ thuộc googleapis). Tuần ISO: bắt đầu Thứ Hai, tuần 1 là tuần chứa Thứ Năm đầu năm.

/** Khoá tuần ISO của 1 ngày (mặc định: hôm nay theo giờ máy người dùng). */
export function isoWeekKey(d: Date = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // Thứ Hai = 0 ... Chủ Nhật = 6
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // Thứ Năm cùng tuần
  const year = date.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(year, 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** Khoá tuần kế tiếp so với 1 khoá tuần cho trước (hoặc từ hôm nay). */
export function nextWeekKey(from: Date = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 7);
  return isoWeekKey(d);
}

/** Thứ Hai (0h) của 1 khoá tuần ISO. */
function isoWeekMonday(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Dow = (jan4.getUTCDay() + 6) % 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Dow);
  const monday = new Date(week1Monday);
  monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  return monday;
}

/** Nhãn hiển thị "dd/MM–dd/MM/yyyy" cho 1 khoá tuần ISO. */
export function weekLabel(key: string): string {
  const m = /^(\d{4})-W(\d{2})$/.exec(key ?? "");
  if (!m) return key ?? "";
  const monday = isoWeekMonday(Number(m[1]), Number(m[2]));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(monday.getUTCDate())}/${p(monday.getUTCMonth() + 1)}–${p(sunday.getUTCDate())}/${p(
    sunday.getUTCMonth() + 1
  )}/${sunday.getUTCFullYear()}`;
}
