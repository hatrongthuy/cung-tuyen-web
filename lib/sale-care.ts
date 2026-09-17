import { getSaleDetailData } from "./sale-detail";
import { buildCareByEmp, type CareItem } from "./report-utils";

// Mở rộng nguồn "Gợi ý cung tuyến tự động": ngoài 3 sheet cảnh báo (khách chết / chưa viếng thăm /
// sản phẩm nghỉ), lấy thêm KHÁCH ĐI ẮNG từ file Sale — khách mà CHÍNH nhân viên đó từng bán nhưng
// đã lâu chưa phát sinh đơn — để những nhân viên chưa có cảnh báo (mới / địa bàn nhỏ) vẫn có danh
// sách khách nên gặp lại.

const BASE_DATE = "2025-01-01";
// Ngưỡng "đi ắng": lâu hơn số ngày này không phát sinh đơn thì gợi ý gặp lại.
const NGUONG_NGAY = 45;

function deXuat(soNgay: number, dt: number) {
  let soLan = 2;
  if (soNgay >= 120) soLan += 1;
  if (soNgay >= 240) soLan += 1;
  soLan = Math.min(soLan, 5);
  const caoGiaTri = dt >= 50_000_000;
  const soTuan = caoGiaTri ? Math.max(2, Math.ceil(soLan / 2)) : soLan;
  return { soLan, soTuan, caoGiaTri };
}

/** Khách đi ắng từ file Sale, gom theo TÊN nhân viên (người từng bán cho khách đó). */
async function buildSaleCareByEmp(nowMs: number): Promise<Record<string, CareItem[]>> {
  const data = await getSaleDetailData();
  if (data.error) return {};

  const baseMs = new Date(BASE_DATE + "T00:00:00").getTime();
  const C = { cid: 0, tid: 1, pid: 2, di: 3, sl: 4, dt: 5 };

  // Gom theo (tid, cid): lần mua gần nhất + tổng doanh thu.
  const agg = new Map<string, { tid: number; cid: number; lastDi: number; dt: number }>();
  for (const row of data.rows) {
    const tid = row[C.tid];
    const cid = row[C.cid];
    const di = row[C.di];
    const dt = row[C.dt];
    const key = `${tid}|${cid}`;
    const cur = agg.get(key);
    if (!cur) agg.set(key, { tid, cid, lastDi: di, dt });
    else {
      if (di > cur.lastDi) cur.lastDi = di;
      cur.dt += dt;
    }
  }

  const out: Record<string, CareItem[]> = {};
  for (const { tid, cid, lastDi, dt } of agg.values()) {
    const lastMs = baseMs + lastDi * 86400000;
    const soNgay = Math.round((nowMs - lastMs) / 86400000);
    if (soNgay < NGUONG_NGAY) continue; // vẫn còn mua gần đây -> bỏ qua

    const ten = data.tdv[tid];
    if (!ten) continue;
    const cust = data.cust[cid];
    const { soLan, soTuan, caoGiaTri } = deXuat(soNgay, dt);
    (out[ten] ||= []).push({
      tenKhach: cust?.[1] ?? "",
      tinh: cust?.[2] ?? "",
      hang: "",
      loai: "sale-ang" as CareItem["loai"],
      soNgay,
      doanhThu12T: dt,
      chiTiet: `${soNgay} ngày chưa phát sinh đơn (theo Sale)`,
      deXuatLan: soLan,
      deXuatTuan: soTuan,
      caoGiaTri,
    });
  }
  return out;
}

const norm = (s: string) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();

/** Danh sách gợi ý cung tuyến hợp nhất: cảnh báo (ưu tiên) + khách đi ắng từ Sale (bổ sung). */
export async function getGoiYCungTuyen(
  chuaVT: Record<string, string>[],
  khChet: Record<string, string>[],
  spNghi: Record<string, string>[],
  nowMs: number
): Promise<Record<string, CareItem[]>> {
  const alert = buildCareByEmp(chuaVT, khChet, spNghi);
  const sale = await buildSaleCareByEmp(nowMs);

  const out: Record<string, CareItem[]> = {};
  const names = new Set<string>([...Object.keys(alert), ...Object.keys(sale)]);
  for (const ten of names) {
    const a = alert[ten] ?? [];
    const seen = new Set(a.map((x) => norm(x.tenKhach)));
    const s = (sale[ten] ?? []).filter((x) => x.tenKhach && !seen.has(norm(x.tenKhach)));
    out[ten] = [...a, ...s];
  }
  return out;
}
