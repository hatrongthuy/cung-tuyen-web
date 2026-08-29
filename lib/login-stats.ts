// Tổng hợp "lịch sử đăng nhập" thành thống kê theo từng người — DÙNG ĐƯỢC Ở CLIENT
// (chỉ import allowlist, không kéo googleapis).

import { ALLOWLIST, type Role } from "./allowlist";

export interface LoginStatRow {
  email: string;
  hoTen: string;
  role: Role | "khac";
  roleLabel: string;
  soLan: number; // tổng số dòng ghi nhận
  soNgay: number; // số NGÀY khác nhau có vào (đo mức độ thường xuyên)
  lanCuoi: string | null; // "dd/MM/yyyy" lần gần nhất
  soNgayKhongVao: number | null; // số ngày kể từ lần cuối tới hôm nay
  daTungVao: boolean;
}

const ROLE_LABEL: Record<Role, string> = {
  manager: "Quản lý",
  superior: "Cấp trên",
  employee: "TDV",
};

function parseNgay(v: string): number {
  const m = (v || "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return 0;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime();
}

function parseThoiGian(v: string): number {
  const m = (v || "").match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime();
  return 0;
}

export function buildLoginStats(
  rows: Record<string, string>[],
  todayVN: Date
): LoginStatRow[] {
  // Gom theo email (chuẩn hóa thường).
  const agg = new Map<
    string,
    { hoTen: string; soLan: number; days: Set<string>; lastMs: number; lastNgay: string }
  >();
  for (const r of rows) {
    const email = (r["Email"] || "").trim().toLowerCase();
    if (!email) continue;
    const ngay = (r["Ngày"] || "").trim();
    const cur = agg.get(email) ?? { hoTen: r["Họ tên"] || "", soLan: 0, days: new Set<string>(), lastMs: 0, lastNgay: "" };
    cur.soLan += 1;
    if (ngay) cur.days.add(ngay);
    const ms = parseThoiGian(r["Thời gian"]) || parseNgay(ngay);
    if (ms >= cur.lastMs) {
      cur.lastMs = ms;
      cur.lastNgay = ngay || cur.lastNgay;
    }
    if (r["Họ tên"]) cur.hoTen = r["Họ tên"];
    agg.set(email, cur);
  }

  const todayMs = new Date(todayVN.getFullYear(), todayVN.getMonth(), todayVN.getDate()).getTime();
  const DAY = 86400 * 1000;
  const daysSince = (ms: number) => (ms ? Math.max(0, Math.round((todayMs - ms) / DAY)) : null);

  const out: LoginStatRow[] = [];
  const seen = new Set<string>();

  // Trước hết liệt kê MỌI người trong allowlist (kể cả người chưa vào lần nào).
  for (const e of ALLOWLIST) {
    const email = e.email.trim().toLowerCase();
    seen.add(email);
    const a = agg.get(email);
    out.push({
      email: e.email,
      hoTen: e.hoTen,
      role: e.role,
      roleLabel: ROLE_LABEL[e.role],
      soLan: a?.soLan ?? 0,
      soNgay: a ? a.days.size : 0,
      lanCuoi: a?.lastNgay || null,
      soNgayKhongVao: a ? daysSince(a.lastMs) : null,
      daTungVao: !!a && a.soLan > 0,
    });
  }
  // Email lạ (không có trong allowlist) — vẫn hiển thị để không bỏ sót.
  for (const [email, a] of agg) {
    if (seen.has(email)) continue;
    out.push({
      email,
      hoTen: a.hoTen || email,
      role: "khac",
      roleLabel: "Khác",
      soLan: a.soLan,
      soNgay: a.days.size,
      lanCuoi: a.lastNgay || null,
      soNgayKhongVao: daysSince(a.lastMs),
      daTungVao: a.soLan > 0,
    });
  }

  // Sắp xếp: người vào nhiều ngày nhất lên trên; ai chưa vào xuống cuối.
  return out.sort((x, y) => {
    if (x.daTungVao !== y.daTungVao) return x.daTungVao ? -1 : 1;
    return y.soNgay - x.soNgay || (y.soLan - x.soLan);
  });
}
