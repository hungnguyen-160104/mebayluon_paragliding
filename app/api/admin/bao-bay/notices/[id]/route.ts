// app/api/admin/bao-bay/notices/[id]/route.ts
/**
 * Đánh dấu đã thu / chưa thu tiền một báo bay, kèm ghi chú của admin.
 *
 * Bỏ dấu "đã thu" KHÔNG gỡ vé tháng/năm: chủ chốt vé có hiệu lực ngay khi báo
 * bay được lưu, trả tiền hay chưa là chuyện admin đòi.
 */
import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { requireBaoBayAdmin } from "@/lib/bao-bay-admin-auth";
import { connectDB } from "@/lib/mongodb";
import { FlightNotice } from "@/models/FlightNotice.model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireBaoBayAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Mã bản ghi không hợp lệ" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const set: Record<string, unknown> = {};
  const unset: Record<string, 1> = {};

  if (body.paid !== undefined) {
    set.paid = Boolean(body.paid);
    if (body.paid) set.paidAt = new Date();
    else unset.paidAt = 1;
  }
  if (body.note !== undefined) set.note = String(body.note ?? "").trim().slice(0, 500);

  /**
   * "KHÔNG ĐẾN BAY (báo ảo)" theo TỪNG NGÀY — { noShow: { date, value } }.
   * Chỉ nhận ngày có trong báo bay; bật thì thêm (một lần), tắt thì gỡ.
   */
  if (body.noShow && typeof body.noShow === "object") {
    const date = String(body.noShow.date ?? "").slice(0, 10);
    await connectDB();
    const cur = await FlightNotice.findById(id).select("dates noShowDates").lean();
    if (!cur) return NextResponse.json({ message: "Không tìm thấy báo bay" }, { status: 404 });
    if (!cur.dates.includes(date)) return NextResponse.json({ message: "Ngày không thuộc báo bay này" }, { status: 400 });
    const item = body.noShow.value
      ? await FlightNotice.findOneAndUpdate(
          { _id: id, "noShowDates.date": { $ne: date } },
          { $push: { noShowDates: { date, at: new Date(), by: auth.username } } },
          { new: true },
        ).lean() ?? (await FlightNotice.findById(id).lean())
      : await FlightNotice.findByIdAndUpdate(id, { $pull: { noShowDates: { date } } }, { new: true }).lean();
    return NextResponse.json({ ok: true, item });
  }

  if (!Object.keys(set).length) {
    return NextResponse.json({ message: "Không có gì để sửa" }, { status: 400 });
  }

  await connectDB();
  const item = await FlightNotice.findByIdAndUpdate(
    id,
    { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
    { new: true },
  ).lean();
  if (!item) return NextResponse.json({ message: "Không tìm thấy báo bay" }, { status: 404 });
  return NextResponse.json({ ok: true, item });
}
