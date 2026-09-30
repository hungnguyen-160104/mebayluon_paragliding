// app/api/admin/bao-bay/members/route.ts
/**
 * Danh sách hội viên HNAA (khu /admin/baobay).
 *
 * GET  ?q=…            tìm theo mã, tên, CCCD, SĐT
 * POST { rows: [...] } nhập bảng đã dán + xem trước ở trang, ghi đè theo mã
 */
import { NextResponse } from "next/server";

import { requireBaoBayAdmin } from "@/lib/bao-bay-admin-auth";
import { normalizeMemberCode } from "@/lib/bao-bay";
import { connectDB } from "@/lib/mongodb";
import { ensureHnaaMemberIndexes, HnaaMember } from "@/models/HnaaMember.model";

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
    filter.$or = [{ code: rx }, { fullName: rx }, { idNumber: rx }, { phone: rx }, { emergencyPhone: rx }];
  }

  await connectDB();
  const [items, total, activeCount] = await Promise.all([
    HnaaMember.find(filter).sort({ code: 1 }).limit(1000).lean(),
    HnaaMember.countDocuments({}),
    HnaaMember.countDocuments({ active: true }),
  ]);

  return NextResponse.json({ ok: true, items, total, activeCount });
}

type IncomingRow = {
  code?: unknown;
  fullName?: unknown;
  idNumber?: unknown;
  phone?: unknown;
  emergencyPhone?: unknown;
  extra?: unknown;
};

/**
 * Ghi đè theo mã hội viên.
 *
 * Ô TRỐNG trong bảng dán KHÔNG xoá dữ liệu đang có: bảng hội hay thiếu cột
 * (lần này không có SĐT khẩn cấp chẳng hạn), xoá theo thì mất số đã nhập tay.
 * Nhập lại một hội viên đã tắt thì bật lại — có tên trong bảng mới tức là còn
 * là hội viên.
 */
export async function POST(req: Request) {
  const auth = requireBaoBayAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const rows: IncomingRow[] = Array.isArray(body?.rows) ? body.rows : [];
  if (!rows.length) {
    return NextResponse.json({ message: "Không có dòng nào để nhập" }, { status: 400 });
  }
  if (rows.length > 3000) {
    return NextResponse.json({ message: "Mỗi lần nhập tối đa 3000 dòng" }, { status: 400 });
  }

  const ops: Parameters<typeof HnaaMember.bulkWrite>[0] = [];
  const skipped: string[] = [];
  const seen = new Set<string>();

  for (const r of rows) {
    const code = normalizeMemberCode(r.code);
    const fullName = clean(r.fullName, 120);
    if (!code || code.length > 40) {
      skipped.push(`(thiếu mã) ${fullName}`.trim());
      continue;
    }
    if (seen.has(code)) {
      skipped.push(`${code} (trùng mã trong bảng dán — lấy dòng đầu)`);
      continue;
    }
    seen.add(code);

    const set: Record<string, unknown> = { active: true };
    if (fullName) set.fullName = fullName;
    for (const k of ["idNumber", "phone", "emergencyPhone"] as const) {
      const v = clean(r[k], 40);
      if (v) set[k] = v;
    }

    // Cột phụ: chỉ nhận cặp chữ–chữ, bỏ dấu chấm/$ ở tên cột (MongoDB không cho)
    if (r.extra && typeof r.extra === "object") {
      const extra: Record<string, string> = {};
      for (const [k, v] of Object.entries(r.extra as Record<string, unknown>)) {
        const key = clean(k, 60).replace(/[.$]/g, " ").trim();
        const val = clean(v, 300);
        if (key && val) extra[key] = val;
      }
      if (Object.keys(extra).length) set.extra = extra;
    }

    ops.push({
      updateOne: {
        filter: { code },
        update: {
          $set: set,
          // Hội viên mới mà bảng không có tên thì tạm lấy mã làm tên, sửa sau được
          $setOnInsert: { code, ...(fullName ? {} : { fullName: code }) },
        },
        upsert: true,
      },
    });
  }

  if (!ops.length) {
    return NextResponse.json({ message: "Không có dòng hợp lệ", skipped }, { status: 400 });
  }

  await connectDB();
  await ensureHnaaMemberIndexes();
  const res = await HnaaMember.bulkWrite(ops, { ordered: false });

  return NextResponse.json({
    ok: true,
    inserted: res.upsertedCount,
    updated: res.modifiedCount,
    matched: res.matchedCount,
    skipped,
  });
}
