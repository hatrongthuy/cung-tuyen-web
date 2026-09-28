import {
  getCanhBaoChuaViengTham,
  getCanhBaoKhachChet,
  getCanhBaoSanPhamNghi,
} from "./data";
import { getGoiYCungTuyen } from "./sale-care";
import type { CareItem } from "./report-utils";
import { allEmployees } from "./allowlist";
import { appendManyGiaoViec, listGiaoViec, type GiaoViecInput } from "./giao-viec";

// Số việc tối đa đề xuất cho MỖI nhân viên trong 1 tuần (đồng bộ với "khách nên gặp tuần này" = 18).
// Tránh dồn cả tồn kho khách vào 1 tuần — chỉ lấy nhóm ưu tiên cao nhất để làm được trong tuần.
const CAP_MOI_NV = 18;

// ------------------------------------------------------------------
// SINH VIỆC TỰ ĐỘNG TỪ BÁO CÁO TUẦN.
// Nguồn: getGoiYCungTuyen (gộp cảnh báo "khách chưa viếng thăm / khách chết / sản phẩm nghỉ" +
// khách đi ắng theo Sale + khách kế thừa) — CÙNG dữ liệu hiển thị ở Báo cáo tuần & màn nhân viên.
// Mỗi khách cần chăm -> 1 việc đề xuất cho đúng nhân viên phụ trách, kèm mức ưu tiên & lý do.
// ------------------------------------------------------------------

export interface GoiYViec {
  maNV: string;
  tenNV: string;
  tuan: string;
  noiDung: string;
  uuTien: string;
  khoaNguon: string;
  loai: string;
  tenKhach: string;
  tinh: string;
  soNgay: number;
}

function normName(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

const VERB: Record<string, (c: CareItem) => string> = {
  chet: (c) => `Tái kích hoạt khách "${c.tenKhach}"${c.tinh ? ` (${c.tinh})` : ""} — ${c.soNgay} ngày chưa phát sinh sale. Gặp ${c.deXuatLan} lần/${c.deXuatTuan} tuần để chốt lại đơn.`,
  "chua-tham": (c) => `Viếng thăm/call khách "${c.tenKhach}"${c.tinh ? ` (${c.tinh})` : ""} — ${c.soNgay} ngày chưa có lượt gặp.`,
  "sp-nghi": (c) => `Chốt lại sản phẩm với khách "${c.tenKhach}"${c.tinh ? ` (${c.tinh})` : ""} — ${c.soNgay} ngày chưa mua lại.`,
  "sale-ang": (c) => `Gặp lại khách "${c.tenKhach}"${c.tinh ? ` (${c.tinh})` : ""} — ${c.soNgay} ngày chưa phát sinh đơn (theo Sale).`,
  "ke-thua": (c) => `Chăm khách kế thừa "${c.tenKhach}"${c.tinh ? ` (${c.tinh})` : ""} — ${c.chiTiet}.`,
};

function noiDungCua(c: CareItem): string {
  const f = VERB[c.loai as string];
  return f ? f(c) : `Chăm khách "${c.tenKhach}"${c.tinh ? ` (${c.tinh})` : ""} — ${c.chiTiet}`;
}

function uuTienCua(c: CareItem): string {
  if (c.caoGiaTri) return "Cao";
  if (c.loai === "chet") return "Cao";
  if (c.soNgay >= 90) return "Cao";
  if (c.loai === "sp-nghi" && c.soNgay < 30) return "Thấp";
  return "Bình thường";
}

/** Sinh danh sách việc đề xuất cho 1 tuần (khoá tuần ISO), từ báo cáo tuần. */
export async function buildGoiYGiaoViec(tuan: string): Promise<{ goiY: GoiYViec[]; error: string | null }> {
  let chuaVT, khChet, spNghi;
  try {
    [chuaVT, khChet, spNghi] = await Promise.all([
      getCanhBaoChuaViengTham(),
      getCanhBaoKhachChet(),
      getCanhBaoSanPhamNghi(),
    ]);
  } catch (e) {
    return { goiY: [], error: e instanceof Error ? e.message : "Lỗi đọc cảnh báo" };
  }

  let careByEmp: Record<string, CareItem[]>;
  try {
    careByEmp = await getGoiYCungTuyen(chuaVT, khChet, spNghi, Date.now());
  } catch (e) {
    return { goiY: [], error: e instanceof Error ? e.message : "Lỗi tổng hợp gợi ý cung tuyến" };
  }

  // Map TÊN nhân viên -> mã (chỉ nhận nhân viên trong nhóm).
  const byName = new Map<string, { ma: string; ten: string }>();
  for (const e of allEmployees()) {
    if (e.maNhanVien) byName.set(normName(e.hoTen), { ma: e.maNhanVien, ten: e.hoTen });
  }

  const uuRank: Record<string, number> = { Cao: 0, "Bình thường": 1, Thấp: 2 };
  const goiY: GoiYViec[] = [];
  for (const [tenNV, items] of Object.entries(careByEmp)) {
    const emp = byName.get(normName(tenNV));
    if (!emp) continue; // bỏ qua tên không thuộc nhóm
    const seen = new Set<string>();
    const cuaNV: GoiYViec[] = [];
    for (const c of items) {
      if (!c.tenKhach) continue;
      const khoaNguon = `${emp.ma}|${tuan}|${c.loai}|${normName(c.tenKhach)}`;
      if (seen.has(khoaNguon)) continue;
      seen.add(khoaNguon);
      cuaNV.push({
        maNV: emp.ma,
        tenNV: emp.ten,
        tuan,
        noiDung: noiDungCua(c),
        uuTien: uuTienCua(c),
        khoaNguon,
        loai: String(c.loai),
        tenKhach: c.tenKhach,
        tinh: c.tinh,
        soNgay: c.soNgay,
      });
    }
    // Ưu tiên cao trước, khách để lâu (số ngày lớn) trước; chỉ giữ tối đa CAP_MOI_NV việc/tuần.
    cuaNV.sort((a, b) => (uuRank[a.uuTien] ?? 1) - (uuRank[b.uuTien] ?? 1) || b.soNgay - a.soNgay);
    goiY.push(...cuaNV.slice(0, CAP_MOI_NV));
  }

  goiY.sort(
    (a, b) =>
      normName(a.tenNV).localeCompare(normName(b.tenNV)) ||
      (uuRank[a.uuTien] ?? 1) - (uuRank[b.uuTien] ?? 1) ||
      b.soNgay - a.soNgay
  );
  return { goiY, error: null };
}

/** Giao TỰ ĐỘNG cho cả nhóm 1 tuần: sinh gợi ý, BỎ những việc đã tạo trước đó (trùng khoá nguồn
 *  trong cùng tuần), rồi ghi phần còn lại. Trả số việc đã tạo & số bỏ qua. */
export async function giaoViecTuDong(
  tuan: string,
  nguoiGiao: string
): Promise<{ ok: boolean; taoMoi: number; boQua: number; error?: string }> {
  const { goiY, error } = await buildGoiYGiaoViec(tuan);
  if (error) return { ok: false, taoMoi: 0, boQua: 0, error };

  // Khoá nguồn đã tồn tại trong tuần này -> không tạo lại.
  const { tasks } = await listGiaoViec();
  const daCo = new Set(
    tasks.filter((t) => t.tuan === tuan && t.khoaNguon).map((t) => t.khoaNguon)
  );

  const canTao: GiaoViecInput[] = [];
  let boQua = 0;
  for (const g of goiY) {
    if (daCo.has(g.khoaNguon)) { boQua++; continue; }
    canTao.push({
      nguoiGiao,
      maNV: g.maNV,
      tenNV: g.tenNV,
      tuan: g.tuan,
      noiDung: g.noiDung,
      uuTien: g.uuTien,
      nguon: "Tự động",
      khoaNguon: g.khoaNguon,
    });
  }
  if (canTao.length > 0) await appendManyGiaoViec(canTao);
  return { ok: true, taoMoi: canTao.length, boQua };
}
