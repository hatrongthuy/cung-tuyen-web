// QUY CÁCH THÀNH PHẨM cho trang Báo giá.
// Đọc TRỰC TIẾP từ Google Sheet "CN Hà Nội - Quy cách thành phẩm view" (công khai theo link),
// nối vào từng sản phẩm báo giá theo MÃ BFO. Nhờ đọc trực tiếp, khi công ty cập nhật file quy cách
// thì trang Báo giá tự cập nhật theo (không cần sửa code).
//
// - MA_BFO_THEO_ID: bảng ánh xạ id sản phẩm báo giá (vd "gmhs-6") -> Mã BFO (vd "P01845").
//   Đã khớp sẵn 161/173 sản phẩm; 12 sản phẩm (TPBS: Stiprol, Zodiac, Glukan, Kim tiền thảo AGP,
//   Urinepro, Lexadol, Demedin-BFS) KHÔNG có trong file quy cách nên bỏ trống.
// - Muốn thêm/sửa 1 sản phẩm: chỉ cần thêm dòng id -> Mã BFO tương ứng ở bảng dưới.

import { google } from "googleapis";

const SPEC_ID =
  process.env.GOOGLE_SHEETS_QUY_CACH_SPREADSHEET_ID || "1VF97sE2gJIqUvZrhIx2zMJrKC3nd_q7EBrcxUHGpPpk";
const SPEC_TAB = process.env.GOOGLE_SHEETS_QUY_CACH_TAB || "Trang tính1";

export interface QuyCachTP {
  maBFO: string;
  phanLoai: string; // Thuốc / TTB
  soDangKy: string;
  quyCachChuan: string; // quy cách thành phẩm (đóng gói/kiện) — có thể nhiều dòng
}

// id sản phẩm báo giá -> Mã BFO trong file quy cách.
export const MA_BFO_THEO_ID: Record<string, string> = {
  "san-khoa-nhi-1": "H01251", "san-khoa-nhi-2": "H00852", "san-khoa-nhi-3": "P01275",
  "san-khoa-nhi-4": "P01278", "san-khoa-nhi-5": "A01497", "san-khoa-nhi-6": "B01304",
  "san-khoa-nhi-7": "E00557", "san-khoa-nhi-8": "L00763", "san-khoa-nhi-9": "B01767",
  "san-khoa-nhi-10": "B01418", "san-khoa-nhi-11": "B01941", "san-khoa-nhi-12": "G01058",
  "san-khoa-nhi-13": "P01364", "san-khoa-nhi-14": "V01109", "san-khoa-nhi-15": "P01808",
  "san-khoa-nhi-16": "N01418", "san-khoa-nhi-17": "G01171", "san-khoa-nhi-18": "G01172",
  "san-khoa-nhi-19": "P01692", "san-khoa-nhi-20": "G01063", "san-khoa-nhi-21": "P01708",
  "san-khoa-nhi-22": "B01570", "san-khoa-nhi-23": "V01165", "san-khoa-nhi-24": "N00946",
  "san-khoa-nhi-25": "P01740", "san-khoa-nhi-26": "D01808", "san-khoa-nhi-27": "C02334",
  "san-khoa-nhi-28": "C02334", "san-khoa-nhi-29": "M02038", "san-khoa-nhi-31": "C01942",
  "san-khoa-nhi-32": "K00628", "san-khoa-nhi-33": "M01657", "san-khoa-nhi-34": "F00598",
  "san-khoa-nhi-35": "P01432", "san-khoa-nhi-36": "P01529", "san-khoa-nhi-37": "P01532",
  "san-khoa-nhi-38": "P01411", "san-khoa-nhi-39": "P01299", "san-khoa-nhi-40": "P01771",
  "san-khoa-nhi-41": "D01519", "san-khoa-nhi-42": "D01635", "san-khoa-nhi-43": "D01304",
  "san-khoa-nhi-44": "D01349", "san-khoa-nhi-45": "M01740", "san-khoa-nhi-46": "S01242",
  "san-khoa-nhi-47": "Z00347", "san-khoa-nhi-48": "Z00312", "san-khoa-nhi-49": "Z00209",
  "san-khoa-nhi-50": "Z00308", "san-khoa-nhi-51": "N00886", "san-khoa-nhi-52": "P01597",
  "san-khoa-nhi-53": "S01447", "san-khoa-nhi-54": "N00922", "san-khoa-nhi-55": "L00993",
  "san-khoa-nhi-56": "L01012", "san-khoa-nhi-57": "L01038", "san-khoa-nhi-58": "L01053",
  "san-khoa-nhi-59": "L01052",

  "gmhs-1": "L00822", "gmhs-2": "L00763", "gmhs-3": "L01021", "gmhs-4": "P01845",
  "gmhs-5": "R00464", "gmhs-7": "N01013", "gmhs-8": "R00405", "gmhs-9": "T03774",
  "gmhs-10": "S01434", "gmhs-11": "A01268", "gmhs-12": "K00547", "gmhs-13": "N00979",
  "gmhs-14": "N01371", "gmhs-15": "M01657", "gmhs-16": "B01418", "gmhs-17": "L00890",
  "gmhs-18": "L00863", "gmhs-19": "L00837", "gmhs-20": "F00606", "gmhs-21": "F00452",
  "gmhs-22": "F00598", "gmhs-23": "A01324", "gmhs-24": "B01957", "gmhs-25": "B01304",
  "gmhs-26": "D01311", "gmhs-27": "D01758", "gmhs-28": "D01877", "gmhs-29": "M01479",
  "gmhs-30": "N00922", "gmhs-31": "N01288", "gmhs-32": "B01235", "gmhs-33": "P01432",
  "gmhs-34": "H00852", "gmhs-35": "H01251", "gmhs-36": "A01497", "gmhs-37": "T01684",
  "gmhs-38": "Z00230", "gmhs-39": "L01172", "gmhs-42": "L00993", "gmhs-43": "L01038",
  "gmhs-44": "L01053", "gmhs-45": "L01052",

  "tieu-hoa-1": "P01432", "tieu-hoa-2": "B01373", "tieu-hoa-3": "H02301", "tieu-hoa-4": "T02722",
  "tieu-hoa-5": "R00390", "tieu-hoa-6": "G00939", "tieu-hoa-7": "R00365", "tieu-hoa-8": "M01773",
  "tieu-hoa-9": "M01679", "tieu-hoa-10": "T02428", "tieu-hoa-11": "C01942", "tieu-hoa-12": "A01500",
  "tieu-hoa-13": "P01083", "tieu-hoa-14": "D01711", "tieu-hoa-18": "T03775", "tieu-hoa-19": "F00482",
  "tieu-hoa-20": "B01332", "tieu-hoa-21": "Z00311", "tieu-hoa-22": "F00550", "tieu-hoa-23": "D01349",
  "tieu-hoa-24": "D02051", "tieu-hoa-25": "V01000", "tieu-hoa-26": "V02572", "tieu-hoa-27": "P01299",
  "tieu-hoa-28": "P01411", "tieu-hoa-30": "M01746", "tieu-hoa-31": "M01740", "tieu-hoa-32": "V01111",
  "tieu-hoa-33": "Z00209", "tieu-hoa-34": "Z00312", "tieu-hoa-35": "Z00302", "tieu-hoa-36": "S01447",
  "tieu-hoa-37": "V01106", "tieu-hoa-38": "R00409", "tieu-hoa-39": "P01583", "tieu-hoa-40": "S01242",
  "tieu-hoa-41": "L01021", "tieu-hoa-42": "F00452", "tieu-hoa-43": "C02593", "tieu-hoa-44": "C02466",
  "tieu-hoa-45": "C02460", "tieu-hoa-46": "C02452", "tieu-hoa-47": "C02406", "tieu-hoa-48": "C02487",
  "tieu-hoa-49": "C02500", "tieu-hoa-50": "G01058", "tieu-hoa-51": "G01057", "tieu-hoa-52": "G01056",
  "tieu-hoa-53": "M01677", "tieu-hoa-54": "V01109", "tieu-hoa-55": "V01101", "tieu-hoa-56": "P01364",
  "tieu-hoa-57": "G01172", "tieu-hoa-58": "B01570", "tieu-hoa-59": "G01063", "tieu-hoa-60": "G01171",
  "tieu-hoa-61": "P01692", "tieu-hoa-62": "P01708", "tieu-hoa-63": "G01075", "tieu-hoa-64": "M01803",
  "tieu-hoa-65": "C02266",
};

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

/** Đọc file quy cách -> map Mã BFO -> {phân loại, số ĐK, quy cách chuẩn}. Lỗi -> {} (không chặn trang). */
async function docSpecTheoMaBFO(): Promise<Record<string, QuyCachTP>> {
  try {
    const sheets = google.sheets({ version: "v4", auth: getAuth() });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPEC_ID,
      range: `'${SPEC_TAB}'!A:F`,
      valueRenderOption: "FORMATTED_VALUE",
    });
    const rows = (res.data.values as unknown[][] | undefined) ?? [];
    if (rows.length < 2) return {};

    // Tìm dòng tiêu đề + vị trí cột (bền với xê dịch cột).
    let hdr = -1;
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      const low = (rows[i] ?? []).map((x) => String(x ?? "").trim().toLowerCase());
      if (low.some((c) => c.includes("mã bfo") || c === "ma bfo") && low.some((c) => c.includes("quy cách"))) {
        hdr = i;
        break;
      }
    }
    if (hdr < 0) hdr = 0;
    const head = (rows[hdr] ?? []).map((x) => String(x ?? "").trim().toLowerCase());
    const findCol = (...keys: string[]) => {
      for (const k of keys) {
        const j = head.findIndex((h) => h.includes(k));
        if (j >= 0) return j;
      }
      return -1;
    };
    const iMa = findCol("mã bfo", "ma bfo");
    const iPL = findCol("phân loại", "phan loai");
    const iDK = findCol("số đăng ký", "so dang ky", "đăng ký");
    const iQC = findCol("quy cách chuẩn", "quy cách", "quy cach");
    const cMa = iMa >= 0 ? iMa : 0;
    const cPL = iPL >= 0 ? iPL : 2;
    const cDK = iDK >= 0 ? iDK : 3;
    const cQC = iQC >= 0 ? iQC : 5;

    const out: Record<string, QuyCachTP> = {};
    for (let i = hdr + 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r) continue;
      const ma = String(r[cMa] ?? "").trim();
      if (!ma) continue;
      out[ma] = {
        maBFO: ma,
        phanLoai: String(r[cPL] ?? "").trim(),
        soDangKy: String(r[cDK] ?? "").trim(),
        quyCachChuan: String(r[cQC] ?? "").trim(),
      };
    }
    return out;
  } catch {
    return {};
  }
}

/** Trả về quy cách thành phẩm theo id sản phẩm báo giá (chỉ những sản phẩm có trong file quy cách). */
export async function quyCachThanhPhamTheoId(): Promise<Record<string, QuyCachTP>> {
  const spec = await docSpecTheoMaBFO();
  const out: Record<string, QuyCachTP> = {};
  for (const [id, ma] of Object.entries(MA_BFO_THEO_ID)) {
    const q = spec[ma];
    if (q && (q.quyCachChuan || q.soDangKy || q.phanLoai)) out[id] = q;
  }
  return out;
}
