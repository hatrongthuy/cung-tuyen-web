// Gọi Gemini với cơ chế thử nhiều model (dùng chung cho các API cần AI).
// Cần biến môi trường GEMINI_API_KEY trên Vercel.

const RETIRED = new Set(["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"]);
const FALLBACKS = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-2.5-flash", "gemini-2.5-flash-lite"];

function isModelUnavailable(status: number, msg: string): boolean {
  const m = (msg || "").toLowerCase();
  return status === 404 || m.includes("no longer available") || m.includes("is not found") || m.includes("not supported") || m.includes("does not exist") || m.includes("unsupported");
}
function isBusy(status: number, msg: string): boolean {
  const m = (msg || "").toLowerCase();
  return status === 503 || status === 429 || m.includes("high demand") || m.includes("overloaded") || m.includes("try again later") || m.includes("temporarily") || m.includes("resource has been exhausted") || m.includes("rate limit");
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface GeminiResult {
  text?: string;
  model?: string;
  error?: string;
  status?: number;
}

export async function askGemini(prompt: string, temperature = 0.4): Promise<GeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { error: "Chưa cấu hình GEMINI_API_KEY trên Vercel (Settings → Environment Variables).", status: 400 };

  const envModel = (process.env.GEMINI_MODEL || "").trim();
  const candidates = [...(envModel && !RETIRED.has(envModel) ? [envModel] : []), ...FALLBACKS].filter((v, i, a) => v && a.indexOf(v) === i);

  let lastErr = "Không gọi được Gemini.";
  let sawBusy = false;
  for (const model of candidates) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature } }),
        });
        const data = await res.json();
        if (res.ok) {
          const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") || "(Gemini không trả về nội dung.)";
          return { text, model };
        }
        const msg = data?.error?.message || `Lỗi gọi Gemini (HTTP ${res.status}).`;
        lastErr = msg;
        if (isBusy(res.status, msg)) { sawBusy = true; await sleep(700 * (attempt + 1)); continue; }
        if (isModelUnavailable(res.status, msg)) break;
        return { error: msg, status: 502 };
      } catch (e) {
        lastErr = `Không gọi được Gemini: ${e instanceof Error ? e.message : String(e)}`;
        await sleep(500);
      }
    }
  }
  return { error: sawBusy ? "Máy chủ Gemini đang quá tải (giờ cao điểm). Vui lòng thử lại sau 1–2 phút." : `Không có model Gemini nào dùng được. Lỗi cuối: ${lastErr}`, status: 503 };
}
