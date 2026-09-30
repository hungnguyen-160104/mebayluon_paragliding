// app/api/bao-bay/member/route.ts
/**
 * Tra mã hội viên HNAA cho trang /baobay.
 *
 * Mã đúng CHỈ trả họ tên và vài số cuối CCCD/SĐT — đủ để hội viên nhận ra là
 * mình, không đủ để người khác lấy được giấy tờ của hội viên. Dữ liệu đầy đủ
 * máy chủ tự gắn vào báo bay lúc lưu.
 */
import { NextResponse } from "next/server";

import { baoBayRateLimit, memberLookupBlocked, recordMemberFailure } from "@/lib/bao-bay-rate";
import { normalizeMemberCode } from "@/lib/bao-bay";
import { findActiveMember, publicMemberView } from "@/services/bao-bay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limited = baoBayRateLimit(req, "member", 30, 10 * 60_000) || memberLookupBlocked(req);
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  const code = normalizeMemberCode(body?.code);
  if (!code) {
    return NextResponse.json({ ok: false, code: "memberInvalid", message: "Chưa nhập mã hội viên" }, { status: 400 });
  }

  try {
    const member = await findActiveMember(code);
    if (!member) {
      recordMemberFailure(req);
      return NextResponse.json({ ok: false, code: "memberInvalid", message: "Mã hội viên không đúng" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, member: publicMemberView(member) });
  } catch (e) {
    console.error("[BaoBay] member lookup failed:", e);
    return NextResponse.json({ ok: false, code: "server", message: "Không tra được mã, vui lòng thử lại" }, { status: 500 });
  }
}
