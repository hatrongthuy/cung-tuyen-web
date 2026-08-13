// Bảng ánh xạ email công ty -> vai trò trong hệ thống.
// KHÔNG hardcode logic phân quyền theo tên người dùng ở bất kỳ đâu khác trong code —
// mọi kiểm tra quyền phải tra qua bảng này để dễ chỉnh sửa (thêm/bớt người) sau này.
//
// role:
//  - "manager"  : quản lý nhóm, toàn quyền xem + quản trị (Hà Trọng Thủy)
//  - "superior" : cấp trên, chỉ xem tổng quan, không có nút thao tác (Lê Công Đức)
//  - "employee" : nhân viên, chỉ xem/thao tác dữ liệu của chính mình

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
  },
  {
    email: "duc.lecong.ss.ps@cpc1hn.com.vn",
    hoTen: "Lê Công Đức",
    role: "superior",
  },
  {
    email: "trung.docao.vinhphuc.ps@cpc1hn.com.vn",
    hoTen: "Đỗ Cao Trung",
    role: "employee",
    maNhanVien: "017886",
  },
  {
    email: "huy.nguyenquang.phutho.ps@cpc1hn.com.vn",
    hoTen: "Nguyễn Quang Huy",
    role: "employee",
    maNhanVien: "018468",
  },
  {
    email: "anh.hathilan.phutho.ps@cpc1hn.com.vn",
    hoTen: "Hà Thị Lan Anh",
    role: "employee",
    maNhanVien: "018757",
  },
  {
    email: "tuyen.phanvan.thainguyen.ps@cpc1hn.com.vn",
    hoTen: "Phan Văn Tuyền",
    role: "employee",
    maNhanVien: "019484",
  },
  {
    email: "cuong.hoangvan.phutho.ps@cpc1hn.com.vn",
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
