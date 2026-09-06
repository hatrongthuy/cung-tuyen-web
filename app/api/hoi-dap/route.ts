import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSaleDetailData } from "@/lib/sale-detail";
import { buildHoiDapDigest } from "@/lib/hoi-dap-digest";
import { askGemini } from "@/lib/gemini";
import { todayInVN } from "@/lib/report-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Trợ lý AI hỏi–đáp trên dữ liệu Sale. Nhận {question}, tự đọc dữ liệu + tính digest chính xác,
// rồi hỏi Gemini để diễn giải/trả lời. Yêu cầu đăng nhập.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  const role = session.user.role;
  if (role !== "manager" && role !== "employee") return NextResponse.json({ error: "Không có quyền." }, { status: 403 });

  let body: { question?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 }); }
  const question = String(body?.question ?? "").trim().slice(0, 2000);
  if (!question) return NextResponse.json({ error: "Chưa nhập câu hỏi." }, { status: 400 });

  const data = await getSaleDetailData();
  if (data.error) return NextResponse.json({ error: `Không đọc được dữ liệu Sale: ${data.error}` }, { status: 502 });

  const today = todayInVN();
  const nam = today.getFullYear(), thang = today.getMonth() + 1, ngay = today.getDate();
  const nowFromMs = new Date(nam, thang - 1, 1).getTime();
  const nowToMs = new Date(nam, thang - 1, ngay, 23, 59, 59, 999).getTime();
  const prevFromMs = new Date(nam, thang - 2, 1).getTime();
  const soNgayTruoc = new Date(nam, thang - 1, 0).getDate();
  const prevToMs = new Date(nam, thang - 2, Math.min(ngay, soNgayTruoc), 23, 59, 59, 999).getTime();
  const lmDate = new Date(nam, thang - 2, 1);
  const lastMonthLabel = `${String(lmDate.getMonth() + 1).padStart(2, "0")}/${lmDate.getFullYear()}`;
  const todayLabel = `${String(ngay).padStart(2, "0")}/${String(thang).padStart(2, "0")}/${nam}`;

  const digest = buildHoiDapDigest(data, { nowFromMs, nowToMs, prevFromMs, prevToMs, todayLabel, lastMonthLabel });

  const prompt = `Bạn là TRỢ LÝ DỮ LIỆU cho quản lý nhóm trình dược viên (ngành dược). Trả lời câu hỏi CHỈ dựa trên DỮ LIỆU dưới đây (số liệu đã được tính sẵn, chính xác — không tự cộng lại, không bịa số ngoài dữ liệu).
Trả lời bằng tiếng Việt, ngắn gọn, đi thẳng vào con số/kết luận. Dùng bảng khi so sánh nhiều mục. Nếu dữ liệu không có thông tin để trả lời, nói rõ là không có. Khi hữu ích, thêm 1–2 nhận xét/đề xuất ngắn.

CÂU HỎI: ${question}

===== DỮ LIỆU =====
${digest}`;

  const out = await askGemini(prompt);
  if (out.error) return NextResponse.json({ error: out.error }, { status: out.status ?? 502 });
  return NextResponse.json({ text: out.text, model: out.model });
}
