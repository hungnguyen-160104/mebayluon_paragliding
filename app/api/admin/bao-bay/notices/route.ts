// app/api/admin/bao-bay/notices/route.ts
/**
 * Danh sách báo bay cho khu /admin/baobay.
 *
 * GET ?date=YYYY-MM-DD (mặc định hôm nay giờ VN) | date=all
 *     &spot=vien-nam|khau-pha|quan-ba|all
 *     &paid=paid|unpaid|all
 *     &q=… (tên, SĐT, mã báo bay, mã hội viên)
 *
 * Lọc theo NGÀY BAY chứ không theo ngày gửi: câu admin cần trả lời ngoài bãi
 * là "hôm nay ai bay, ai đã đóng tiền".
 */
import { NextResponse } from "next/server";

import { requireBaoBayAdmin } from "@/lib/bao-bay-admin-auth";
import { isBaoBaySpot, vnParts } from "@/lib/bao-bay";
import { connectDB } from "@/lib/mongodb";
import { FlightNotice } from "@/models/FlightNotice.model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function GET(req: Request) {
  const auth = requireBaoBayAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const rawDate = String(searchParams.get("date") || "").trim();
  const date = rawDate === "all" ? "all" : /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : vnParts(new Date()).date;
  const spot = searchParams.get("spot");
  const paid = searchParams.get("paid");
  const q = String(searchParams.get("q") || "").trim().slice(0, 80);

  const filter: Record<string, unknown> = {};
  if (date !== "all") filter.dates = date;
  if (isBaoBaySpot(spot)) filter.spot = spot;
  if (paid === "paid") filter.paid = true;
  if (paid === "unpaid") filter.paid = false;
  if (q) {
    const rx = { $regex: escapeRegex(q), $options: "i" };
    filter.$or = [{ fullName: rx }, { phone: rx }, { noticeCode: rx }, { memberCode: rx }, { idNumber: rx }];
  }

  await connectDB();
  const items = await FlightNotice.find(filter).sort({ submittedAt: -1 }).limit(date === "all" ? 500 : 1000).lean();

  const totals = items.reduce(
    (t, n) => {
      t.count++;
      t.amount += n.amount || 0;
      if (n.paid) t.paidAmount += n.amount || 0;
      else t.unpaidAmount += n.amount || 0;
      t.byMode[n.feeMode] = (t.byMode[n.feeMode] || 0) + 1;
      return t;
    },
    { count: 0, amount: 0, paidAmount: 0, unpaidAmount: 0, byMode: {} as Record<string, number> },
  );

  return NextResponse.json({ ok: true, date, items, totals });
}
