import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const runtime = "nodejs";

// Các model đã bị Google ngừng phục vụ (nếu env GEMINI_MODEL lỡ trỏ vào đây thì BỎ QUA,
// tránh trường hợp biến môi trường cũ trên Vercel ghi đè và làm hỏng nút Phân tích AI).
const RETIRED = new Set([
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-pro",
]);

// Danh sách model sẽ thử LẦN LƯỢT. Google khuyến nghị gemini-3.6-flash; nếu vì lý do nào đó
// không dùng được thì tự động thử các model thay thế cho tới khi có 1 model chạy được.
const FALLBACKS = [
  "gemini-3.6-flash",
  "gemini-flash-latest",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];

// Dấu hiệu "model này không dùng được" -> nên thử model kế tiếp thay vì báo lỗi ngay.
function isModelUnavailable(status: number, msg: string): boolean {
  const m = (msg || "").toLowerCase();
  return (
    status === 404 ||
    m.includes("no longer available") ||
    m.includes("is not found") ||
    m.includes("not supported") ||
    m.includes("does not exist") ||
    m.includes("unsupported")
  );
}

// Dấu hiệu "model đang quá tải / bị giới hạn tạm thời" -> nên thử lại và/hoặc đổi model khác.
function isBusy(status: number, msg: string): boolean {
  const m = (msg || "").toLowerCase();
  return (
    status === 503 ||
    status === 429 ||
    m.includes("high demand") ||
    m.includes("overloaded") ||
    m.includes("try again later") ||
    m.includes("temporarily") ||
    m.includes("resource has been exhausted") ||
    m.includes("rate limit")
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Gọi Gemini để phân tích báo cáo tuần. Yêu cầu đăng nhập (tránh lộ API key/tốn phí).
// Cần biến môi trường GEMINI_API_KEY trên Vercel (tạo tại https://aistudio.google.com/apikey).
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Chưa cấu hình GEMINI_API_KEY trên Vercel (Settings → Environment Variables)." },
      { status: 400 }
    );
  }

  // Thứ tự model để thử: model trong env (nếu KHÔNG phải model đã ngừng) đứng đầu, rồi tới các
  // fallback. Loại trùng lặp, giữ nguyên thứ tự.
  const envModel = (process.env.GEMINI_MODEL || "").trim();
  const candidates = [
    ...(envModel && !RETIRED.has(envModel) ? [envModel] : []),
    ...FALLBACKS,
  ].filter((v, i, a) => v && a.indexOf(v) === i);

  let body: { tomTat?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 });
  }
  const tomTat = String(body?.tomTat ?? "").slice(0, 20000);
  if (!tomTat.trim()) {
    return NextResponse.json({ error: "Không có số liệu để phân tích." }, { status: 400 });
  }

  const prompt = `Bạn là trợ lý phân tích cho quản lý nhóm trình dược viên (ngành dược). Dưới đây là số liệu BÁO CÁO CUNG TUYẾN TUẦN của nhóm.
Hãy phân tích NGẮN GỌN bằng tiếng Việt, trình bày theo các mục có tiêu đề rõ ràng và gạch đầu dòng:
1. Tổng quan tuần này & so sánh với tuần trước (doanh số, gặp khách, phản hồi, điểm — nêu tăng/giảm).
2. Nhân viên nổi bật và nhân viên cần cải thiện (kèm lý do từ số liệu).
3. Tồn đọng cần xử lý (khách được gợi ý nhưng chưa gặp/chưa phản hồi).
4. 3–5 đề xuất hành động cụ thể cho tuần tới.
Không bịa số liệu ngoài dữ liệu cho sẵn. Không dài dòng.

SỐ LIỆU:
${tomTat}`;

  let lastErr = "Không gọi được Gemini.";
  let sawBusy = false;
  for (const model of candidates) {
    // Với mỗi model: thử tối đa 3 lần nếu gặp "quá tải" (chờ tăng dần), rồi mới chuyển model khác.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.4 },
            }),
          }
        );
        const data = await res.json();
        if (res.ok) {
          const text =
            data?.candidates?.[0]?.content?.parts
              ?.map((p: { text?: string }) => p.text ?? "")
              .join("") || "(Gemini không trả về nội dung.)";
          return NextResponse.json({ text, model });
        }
        const msg = data?.error?.message || `Lỗi gọi Gemini (HTTP ${res.status}).`;
        lastErr = msg;
        if (isBusy(res.status, msg)) {
          sawBusy = true;
          await sleep(700 * (attempt + 1)); // 0.7s, 1.4s
          continue; // thử lại cùng model
        }
        if (isModelUnavailable(res.status, msg)) break; // sang model kế tiếp
        return NextResponse.json({ error: msg }, { status: 502 }); // lỗi khác -> dừng
      } catch (e) {
        lastErr = `Không gọi được Gemini: ${e instanceof Error ? e.message : String(e)}`;
        await sleep(500);
      }
    }
    // Hết 3 lần với model này -> vòng for ngoài sẽ thử model kế tiếp.
  }

  const goiY = sawBusy
    ? "Máy chủ Gemini đang quá tải (giờ cao điểm). Vui lòng bấm lại sau 1–2 phút."
    : `Không có model Gemini nào dùng được. Lỗi cuối: ${lastErr}`;
  return NextResponse.json({ error: goiY }, { status: 503 });
}
