import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const runtime = "nodejs";

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
  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";

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
    if (!res.ok) {
      const msg = data?.error?.message || `Lỗi gọi Gemini (HTTP ${res.status}).`;
      return NextResponse.json({ error: msg }, { status: 502 });
    }
    const text =
      data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ||
      "(Gemini không trả về nội dung.)";
    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json(
      { error: `Không gọi được Gemini: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }
}
