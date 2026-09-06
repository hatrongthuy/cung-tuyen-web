import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSaleDetailData } from "@/lib/sale-detail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Trả dữ liệu chi tiết Sale (product-level) cho màn Tra cứu Sale (public/sale.html).
// Yêu cầu đăng nhập. Đọc trực tiếp từ Google Sheet "Sale sạch" nên luôn cập nhật & đủ lịch sử.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== "manager" && role !== "employee") {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  const data = await getSaleDetailData();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "private, max-age=300" },
  });
}
