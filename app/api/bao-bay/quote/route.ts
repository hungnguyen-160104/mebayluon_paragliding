// app/api/bao-bay/quote/route.ts
/**
 * Báo giá báo bay theo giờ MÁY CHỦ — trang /baobay gọi mỗi khi phi công đổi
 * điểm bay, ngày, cách trả hay số giấy tờ, để bảng phí hiện đúng mốc 8h00 HNAA
 * và vé tháng/năm còn hạn (hai thứ trình duyệt không tự biết được).
 */
import { NextResponse } from "next/server";

import {
  baoBayRateLimit,
  memberLookupBlocked,
  memberPhoneBlocked,
  recordMemberFailure,
  recordMemberPhoneFailure,
} from "@/lib/bao-bay-rate";
import { memberCodeKey, normalizeMemberCode } from "@/lib/bao-bay";
import { BaoBayError, quoteBaoBay } from "@/services/bao-bay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limited = baoBayRateLimit(req, "quote", 120, 10 * 60_000);
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));

  // Có mã hội viên thì cửa này cũng là một cách dò mã — chịu chung giới hạn nhập sai
  const hasCode = Boolean(normalizeMemberCode(body?.memberCode));
  if (hasCode) {
    // Sai SĐT hội viên quá nhiều lần thì mã đó bị khoá — báo giá cũng không đi đường vòng được
    const blocked = memberLookupBlocked(req) || memberPhoneBlocked(req, memberCodeKey(body?.memberCode));
    if (blocked) return blocked;
  }

  try {
    const quote = await quoteBaoBay(body ?? {}, new Date());
    return NextResponse.json({ ok: true, ...quote });
  } catch (e) {
    if (e instanceof BaoBayError) {
      if (e.code === "memberInvalid") recordMemberFailure(req);
      if (e.code === "phoneMismatch") recordMemberPhoneFailure(req, memberCodeKey(body?.memberCode));
      return NextResponse.json({ ok: false, code: e.code, message: e.message }, { status: e.status });
    }
    console.error("[BaoBay] quote failed:", e);
    return NextResponse.json({ ok: false, code: "server", message: "Không tính được phí" }, { status: 500 });
  }
}
