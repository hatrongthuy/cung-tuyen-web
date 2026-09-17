// Bảng ánh xạ email công ty -> vai trò trong hệ thống.
// KHÔNG hardcode logic phân quyền theo tên người dùng ở bất kỳ đâu khác trong code —
// mọi kiểm tra quyền phải tra qua bảng này để dễ chỉnh sửa (thêm/bớt người) sau này.
//
// role:
// - "manager"  : quản lý nhóm (SS/ASM), toàn quyền xem + quản trị
// - "superior" : cấp trên, chỉ xem tổng quan, không có nút thao tác
// - "employee" : nhân viên, chỉ xem/thao tác dữ liệu của chính mình
//
// Web này CHUNG MÃ NGUỒN nhưng deploy thành 2 project Vercel khác nhau (xem lib/scope.ts):
//   - "phu-tho" (mặc định): chỉ nhóm Hà Trọng Thủy — dùng bảng ALLOWLIST_PHU_THO.
//   - "tay-bac": cả nhóm Tây Bắc (3 SS) — dùng bảng ALLOWLIST_TAY_BAC.
// SỬA NGƯỜI DÙNG: thêm/sửa/xoá ở đúng bảng tương ứng bên dưới rồi đưa code lên lại.

import { APP_SCOPE } from "./scope";

export type Role = "manager" | "superior" | "employee";

export interface AllowlistEntry {
  email: string;
  hoTen: string;
  role: Role;
  /** Mã nhân viên trong Google Sheets — dùng làm MẬT KHẨU đăng nhập (Họ tên + Mã nhân viên). */
  maNhanVien?: string;
  /** Tên SS phụ trách (cột "Nhóm SS" trong sheet) — chỉ để hiển thị/tham khảo, KHÔNG dùng
   *  để giới hạn quyền xem (quản lý xem được số liệu của nhau theo yêu cầu). */
  nhomSS?: string;
}

export const COMPANY_DOMAIN = "cpc1hn.com.vn";

// ---- Scope "phu-tho" — web gốc, chỉ nhóm Hà Trọng Thủy (PS Phú Thọ) ----
const ALLOWLIST_PHU_THO: AllowlistEntry[] = [
  {
    email: "booha061294@gmail.com",
    hoTen: "Hà Trọng Thủy",
    role: "manager",
    maNhanVien: "014965",
  },
  {
    email: "daotao.cpc1hn@gmail.com",
    hoTen: "Khách tham quan",
    role: "manager",
    maNhanVien: "014965",
  },
  {
    email: "lecongducib@gmail.com",
    hoTen: "Lê Công Đức",
    role: "superior",
    maNhanVien: "012487",
  },
  {
    email: "caotrung3258@gmail.com",
    hoTen: "Đỗ Cao Trung",
    role: "employee",
    maNhanVien: "017886",
  },
  {
    email: "qhuy210199@gmail.com",
    hoTen: "Nguyễn Quang Huy",
    role: "employee",
    maNhanVien: "018468",
  },
  {
    email: "htlanh2609@gmail.com",
    hoTen: "Hà Thị Lan Anh",
    role: "employee",
    maNhanVien: "018757",
  },
  {
    email: "Phantuyen102025@gmail.com",
    hoTen: "Phan Văn Tuyền",
    role: "employee",
    maNhanVien: "019484",
  },
  {
    email: "Cuongtntn100@gmail.com",
    hoTen: "Hoàng Văn Cường",
    role: "employee",
    maNhanVien: "020180",
  },
];

// ---- Scope "tay-bac" — web nhân bản, CẢ NHÓM Tây Bắc (3 SS) ----
// Đăng nhập bằng Họ tên + Mã nhân viên (không cần email) nên các email dưới đây chỉ là
// định danh nội bộ (id) — có thể để giống mã nhân viên, không ảnh hưởng đăng nhập.
// Nguồn: bảng nhân sự Tây Bắc anh Đức cung cấp (15/09/2026).
const ALLOWLIST_TAY_BAC: AllowlistEntry[] = [
  // --- Quản lý (ASM + 3 SS) — role "manager": xem được số liệu của NHAU (cả 3 nhóm) ---
  {
    email: "012487@cung-tuyen.local",
    hoTen: "Lê Công Đức",
    role: "manager",
    maNhanVien: "012487",
    nhomSS: "Lê Công Đức",
  },
  {
    email: "017554@cung-tuyen.local",
    hoTen: "Trịnh Xuân Hà",
    role: "manager",
    maNhanVien: "017554",
    nhomSS: "Trịnh Xuân Hà",
  },
  {
    email: "014965@cung-tuyen.local",
    hoTen: "Hà Trọng Thủy",
    role: "manager",
    maNhanVien: "014965",
    nhomSS: "Hà Trọng Thủy",
  },
  {
    email: "daotao.cpc1hn@gmail.com",
    hoTen: "Khách tham quan",
    role: "manager",
    maNhanVien: "014965",
    nhomSS: "Hà Trọng Thủy",
  },

  // --- Nhóm SS Lê Công Đức ---
  { email: "018080@cung-tuyen.local", hoTen: "Hà Vi Thanh", role: "employee", maNhanVien: "018080", nhomSS: "Lê Công Đức" },
  { email: "019479@cung-tuyen.local", hoTen: "Nguyễn Thị Thanh Bình", role: "employee", maNhanVien: "019479", nhomSS: "Lê Công Đức" },
  { email: "020255@cung-tuyen.local", hoTen: "Ngô Đức Mạnh", role: "employee", maNhanVien: "020255", nhomSS: "Lê Công Đức" },

  // --- Nhóm SS Trịnh Xuân Hà ---
  { email: "019150@cung-tuyen.local", hoTen: "Lò Văn Dũng", role: "employee", maNhanVien: "019150", nhomSS: "Trịnh Xuân Hà" },
  { email: "019323@cung-tuyen.local", hoTen: "Nguyễn Hồng Thanh", role: "employee", maNhanVien: "019323", nhomSS: "Trịnh Xuân Hà" },
  { email: "020152@cung-tuyen.local", hoTen: "Vũ Phương Thúy", role: "employee", maNhanVien: "020152", nhomSS: "Trịnh Xuân Hà" },
  { email: "020214@cung-tuyen.local", hoTen: "Mạc Hồng Tài", role: "employee", maNhanVien: "020214", nhomSS: "Trịnh Xuân Hà" },

  // --- Nhóm SS Hà Trọng Thủy ---
  { email: "017886@cung-tuyen.local", hoTen: "Đỗ Cao Trung", role: "employee", maNhanVien: "017886", nhomSS: "Hà Trọng Thủy" },
  { email: "018468@cung-tuyen.local", hoTen: "Nguyễn Quang Huy", role: "employee", maNhanVien: "018468", nhomSS: "Hà Trọng Thủy" },
  { email: "018757@cung-tuyen.local", hoTen: "Hà Thị Lan Anh", role: "employee", maNhanVien: "018757", nhomSS: "Hà Trọng Thủy" },
  { email: "019484@cung-tuyen.local", hoTen: "Phan Văn Tuyền", role: "employee", maNhanVien: "019484", nhomSS: "Hà Trọng Thủy" },
  { email: "020180@cung-tuyen.local", hoTen: "Hoàng Văn Cường", role: "employee", maNhanVien: "020180", nhomSS: "Hà Trọng Thủy" },
];

export const ALLOWLIST: AllowlistEntry[] =
  APP_SCOPE === "tay-bac" ? ALLOWLIST_TAY_BAC : ALLOWLIST_PHU_THO;

export function findAllowlistEntry(email: string | null | undefined): AllowlistEntry | null {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  return ALLOWLIST.find((e) => e.email.toLowerCase() === normalized) ?? null;
}

export function allEmployees(): AllowlistEntry[] {
  return ALLOWLIST.filter((e) => e.role === "employee");
}

/** Chuẩn hoá tên để so khớp: bỏ dấu, thường hoá, gộp khoảng trắng. */
function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // bỏ dấu thanh/mũ
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Đăng nhập bằng HỌ TÊN + MÃ NHÂN VIÊN (mã dùng làm mật khẩu).
 * Khớp tên không phân biệt hoa/thường & dấu; mã phải trùng khít.
 */
export function findByLogin(
  hoTen: string | null | undefined,
  maNhanVien: string | null | undefined
): AllowlistEntry | null {
  const name = normalizeName(hoTen ?? "");
  const code = (maNhanVien ?? "").trim();
  if (!name || !code) return null;
  const candidates = ALLOWLIST.filter((e) => normalizeName(e.hoTen) === name);
  return candidates.find((e) => e.maNhanVien && e.maNhanVien === code) ?? null;
}
