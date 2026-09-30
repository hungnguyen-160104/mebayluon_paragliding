// app/api/admin/bao-bay/members/route.ts
/**
 * Danh sách hội viên HNAA (khu /admin/baobay).
 *
 * GET  ?q=…            tìm theo mã, tên, CCCD, SĐT
 * POST { rows: [...] } nhập bảng đã dán + xem trước ở trang, ghi đè theo mã
 */
import { NextResponse } from "next/server";

import { requireBaoBayAdmin } from "@/lib/bao-bay-admin-auth";
import { connectDB } from "@/lib/mongodb";
import { HnaaMember } from "@/models/HnaaMember.model";
import { importMembers, type ImportMemberRow } from "@/services/bao-bay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const clean = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function GET(req: Request) {
  const auth = requireBaoBayAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const q = clean(searchParams.get("q"), 80);
  const status = searchParams.get("status"); // active | inactive | all

  const filter: Record<string, unknown> = {};
  if (status === "active") filter.active = true;
  if (status === "inactive") filter.active = false;
  if (q) {
    const rx = { $regex: escapeRegex(q), $options: "i" };
    filter.$or = [{ code: rx }, { fullName: rx }, { idNumber: rx }, { phone: rx }, { emergencyPhone: rx }, { email: rx }];
  }

  await connectDB();
  const [items, total, activeCount] = await Promise.all([
    HnaaMember.find(filter).sort({ code: 1 }).limit(1000).lean(),
    HnaaMember.countDocuments({}),
    HnaaMember.countDocuments({ active: true }),
  ]);

  return NextResponse.json({ ok: true, items, total, activeCount });
}

/**
 * Nhập bảng đã dán + xem trước ở trang. Toàn bộ việc ghi nằm ở importMembers
 * (services/bao-bay.service.ts) — script nhập danh sách thật gọi đúng hàm ấy,
 * để hai đường nhập không bao giờ lệch nhau.
 */
export async function POST(req: Request) {
  const auth = requireBaoBayAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const rows: ImportMemberRow[] = Array.isArray(body?.rows) ? body.rows : [];
  if (!rows.length) {
    return NextResponse.json({ message: "Không có dòng nào để nhập" }, { status: 400 });
  }
  if (rows.length > 3000) {
    return NextResponse.json({ message: "Mỗi lần nhập tối đa 3000 dòng" }, { status: 400 });
  }

  const res = await importMembers(rows, { source: typeof body?.source === "string" ? body.source : undefined });
  if (!res.inserted && !res.matched) {
    return NextResponse.json({ message: "Không có dòng hợp lệ", skipped: res.skipped }, { status: 400 });
  }
  return NextResponse.json({ ok: true, ...res });
}
