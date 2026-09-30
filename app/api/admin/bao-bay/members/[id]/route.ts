// app/api/admin/bao-bay/members/[id]/route.ts
/**
 * Sửa một hội viên HNAA / bật-tắt hiệu lực.
 *
 * Không có nút xoá: tắt (active=false) là đủ để mã báo "không đúng", mà các báo
 * bay cũ vẫn giữ được liên kết memberId để tra lại về sau.
 */
import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { requireBaoBayAdmin } from "@/lib/bao-bay-admin-auth";
import { normalizeMemberCode } from "@/lib/bao-bay";
import { connectDB } from "@/lib/mongodb";
import { ensureHnaaMemberIndexes, HnaaMember } from "@/models/HnaaMember.model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const clean = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireBaoBayAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Mã bản ghi không hợp lệ" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const set: Record<string, unknown> = {};

  if (body.code !== undefined) {
    const code = normalizeMemberCode(body.code);
    if (!code) return NextResponse.json({ message: "Mã hội viên không được trống" }, { status: 400 });
    set.code = code;
  }
  if (body.fullName !== undefined) {
    const name = clean(body.fullName, 120);
    if (!name) return NextResponse.json({ message: "Họ tên không được trống" }, { status: 400 });
    set.fullName = name;
  }
  for (const k of ["idNumber", "phone", "emergencyPhone"] as const) {
    if (body[k] !== undefined) set[k] = clean(body[k], 40);
  }
  if (body.active !== undefined) set.active = Boolean(body.active);

  if (!Object.keys(set).length) {
    return NextResponse.json({ message: "Không có gì để sửa" }, { status: 400 });
  }

  await connectDB();
  await ensureHnaaMemberIndexes();
  try {
    const item = await HnaaMember.findByIdAndUpdate(id, { $set: set }, { new: true }).lean();
    if (!item) return NextResponse.json({ message: "Không tìm thấy hội viên" }, { status: 404 });
    return NextResponse.json({ ok: true, item });
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && (e as { code?: number }).code === 11000) {
      return NextResponse.json({ message: "Mã hội viên này đã có người khác dùng" }, { status: 409 });
    }
    throw e;
  }
}
