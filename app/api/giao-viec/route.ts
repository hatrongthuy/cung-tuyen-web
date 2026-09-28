import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  listGiaoViec,
  appendManyGiaoViec,
  updateGiaoViec,
  deleteGiaoViec,
  normMa,
  TRANG_THAI,
  UU_TIEN,
} from "@/lib/giao-viec";
import { giaoViecTuDong } from "@/lib/goi-y-giao-viec";
import { allEmployees } from "@/lib/allowlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GIAO VIỆC:
// - GET   : nhân viên xem việc CỦA MÌNH; quản lý xem TỔNG việc cả nhóm.
// - POST  : quản lý giao việc.
//     • { action:"auto", tuan } -> sinh việc TỰ ĐỘNG từ báo cáo tuần (bỏ trùng), ghi vào sheet.
//     • { maNVs, noiDung, uuTien, tuan, han } -> thêm 1 việc thủ công (tuỳ chọn).
// - PATCH : cập nhật việc. Nhân viên: chỉ trạng thái/ghi chú việc của mình. Quản lý: sửa cả nội dung/ưu tiên.
// - DELETE: quản lý xoá 1 việc.

export async function GET() {
  const session = await auth();
  const user = session?.user;
  if (!user || (user.role !== "employee" && user.role !== "manager")) {
    return NextResponse.json({ ok: false, error: "Không có quyền" }, { status: 403 });
  }
  try {
    const { tasks, error } = await listGiaoViec();
    let ds = tasks;
    if (user.role === "employee") {
      const me = normMa(user.maNhanVien);
      ds = ds.filter((t) => normMa(t.maNV) === me);
    }
    return NextResponse.json({ ok: true, tasks: ds, error });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Lỗi đọc giao việc" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user;
  if (!user || user.role !== "manager") {
    return NextResponse.json({ ok: false, error: "Chỉ quản lý mới giao việc được" }, { status: 403 });
  }
  let body: {
    action?: unknown;
    tuan?: unknown;
    maNVs?: unknown;
    maNV?: unknown;
    noiDung?: unknown;
    uuTien?: unknown;
    han?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body không hợp lệ" }, { status: 400 });
  }

  const tuan = String(body.tuan ?? "").trim();
  if (!/^\d{4}-W\d{2}$/.test(tuan)) {
    return NextResponse.json({ ok: false, error: "Tuần không hợp lệ" }, { status: 400 });
  }

  // ---- Giao TỰ ĐỘNG từ báo cáo tuần ----
  if (String(body.action ?? "") === "auto") {
    try {
      const r = await giaoViecTuDong(tuan, user.name ?? "Quản lý");
      if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: 500 });
      return NextResponse.json({ ok: true, taoMoi: r.taoMoi, boQua: r.boQua });
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: e instanceof Error ? e.message : "Lỗi giao việc tự động" },
        { status: 500 }
      );
    }
  }

  // ---- Thêm 1 việc thủ công ----
  const noiDung = String(body.noiDung ?? "").trim();
  const han = String(body.han ?? "").trim();
  let uuTien = String(body.uuTien ?? "").trim();
  if (!(UU_TIEN as readonly string[]).includes(uuTien)) uuTien = "Bình thường";
  if (!noiDung) return NextResponse.json({ ok: false, error: "Thiếu nội dung công việc" }, { status: 400 });

  const raw = Array.isArray(body.maNVs) ? body.maNVs : body.maNV != null ? [body.maNV] : [];
  const wanted = raw.map((x) => normMa(x)).filter(Boolean);
  if (wanted.length === 0) return NextResponse.json({ ok: false, error: "Chưa chọn nhân viên" }, { status: 400 });

  const emps = allEmployees();
  const byMa = new Map(emps.map((e) => [normMa(e.maNhanVien), e]));
  const targets = wanted.map((m) => byMa.get(m)).filter((e): e is NonNullable<typeof e> => !!e);
  if (targets.length === 0) return NextResponse.json({ ok: false, error: "Nhân viên không hợp lệ" }, { status: 400 });

  try {
    const created = await appendManyGiaoViec(
      targets.map((e) => ({
        nguoiGiao: user.name ?? "Quản lý",
        maNV: e.maNhanVien ?? "",
        tenNV: e.hoTen,
        tuan,
        noiDung,
        uuTien,
        han,
        nguon: "Thủ công",
      }))
    );
    return NextResponse.json({ ok: true, created });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Lỗi ghi giao việc" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  const user = session?.user;
  if (!user || (user.role !== "employee" && user.role !== "manager")) {
    return NextResponse.json({ ok: false, error: "Không có quyền" }, { status: 403 });
  }
  let body: { id?: unknown; noiDung?: unknown; uuTien?: unknown; han?: unknown; trangThai?: unknown; ghiChu?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body không hợp lệ" }, { status: 400 });
  }
  const id = String(body.id ?? "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "Thiếu id việc" }, { status: 400 });

  const patch: { noiDung?: string; uuTien?: string; han?: string; trangThai?: string; ghiChu?: string } = {};
  if (body.trangThai != null) {
    const tt = String(body.trangThai).trim();
    if (!(TRANG_THAI as readonly string[]).includes(tt)) {
      return NextResponse.json({ ok: false, error: "Trạng thái không hợp lệ" }, { status: 400 });
    }
    patch.trangThai = tt;
  }
  if (body.ghiChu != null) patch.ghiChu = String(body.ghiChu).slice(0, 500);

  // Chỉ quản lý mới được sửa nội dung / ưu tiên / hạn.
  if (user.role === "manager") {
    if (body.noiDung != null) {
      const nd = String(body.noiDung).trim();
      if (!nd) return NextResponse.json({ ok: false, error: "Nội dung không được rỗng" }, { status: 400 });
      patch.noiDung = nd.slice(0, 1000);
    }
    if (body.uuTien != null) {
      let ut = String(body.uuTien).trim();
      if (!(UU_TIEN as readonly string[]).includes(ut)) ut = "Bình thường";
      patch.uuTien = ut;
    }
    if (body.han != null) patch.han = String(body.han).trim();
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "Không có gì để cập nhật" }, { status: 400 });
  }

  const owner = user.role === "employee" ? String(user.maNhanVien ?? "") : undefined;
  try {
    const res = await updateGiaoViec(id, patch, owner);
    if (!res.ok) return NextResponse.json({ ok: false, error: res.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Lỗi cập nhật" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  const user = session?.user;
  if (!user || user.role !== "manager") {
    return NextResponse.json({ ok: false, error: "Chỉ quản lý mới xoá được" }, { status: 403 });
  }
  const id = new URL(req.url).searchParams.get("id")?.trim() ?? "";
  if (!id) return NextResponse.json({ ok: false, error: "Thiếu id việc" }, { status: 400 });
  try {
    const res = await deleteGiaoViec(id);
    if (!res.ok) return NextResponse.json({ ok: false, error: res.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Lỗi xoá" },
      { status: 500 }
    );
  }
}
