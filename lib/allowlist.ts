// Bảng ánh xạ email công ty -> vai trò trong hệ thống.
// KHÔNG hardcode logic phân quyền theo tên người dùng ở bất kỳ đâu khác trong code —
// mọi kiểm tra quyền phải tra qua bảng này để dễ chỉnh sửa (thêm/bớt người) sau này.
//
// role:
// - "manager"  : quản lý nhóm, toàn quyền xem + quản trị (Hà Trọng Thủy)
// - "superior" : cấp trên, chỉ xem tổng quan, không có nút thao tác (Lê Công Đức)
// - "employee" : nhân viên, chỉ xem/thao tác dữ liệu của chính mình

export type Role = "manager" | "superior" | "employee";

export interface AllowlistEntry {
  email: string;
  hoTen: string;
  role: Role;
  /** Mã nhân viên trong Google Sheets — chỉ có với role "employee" */
  maNhanVien?: string;
}

export const COMPANY_DOMAIN = "cpc1hn.com.vn";

export const ALLOWLIST: AllowlistEntry[] = [
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
