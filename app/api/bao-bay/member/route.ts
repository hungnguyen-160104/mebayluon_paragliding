// app/api/bao-bay/member/route.ts
/**
 * Xác nhận hội viên HNAA cho trang /baobay — HAI BƯỚC (chủ 01/10):
 *
 *  1. { code }         → chỉ trả "mã có thật" + mã dạng chuẩn + cần SĐT hay
 *                        không. KHÔNG trả tên hay thông tin cá nhân nào — dò lần
 *                        lượt HNAA-01, 02… cũng không gom được danh sách tên.
 *  2. { code, phone }  → SĐT phải khớp SĐT đăng ký của hội viên (danh sách chưa
 *                        có số thì nhận theo ALLOW_MEMBER_WITHOUT_PHONE, gắn cờ
 *                        chưa đối chiếu). Khớp mới trả họ tên, quốc tịch.
 *
 * Giới hạn: nhập sai MÃ tính theo IP; nhập sai SĐT tính theo MÃ (5 lần/15 phút
 * khoá mã đó — đếm trên bản ghi hội viên trong DB, nên cửa báo giá/gửi cũng
 * thấy) và theo IP (bộ nhớ từng tiến trình).
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
import { checkMemberCode, confirmMember, publicMemberView } from "@/services/bao-bay.service";

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
  const key = memberCodeKey(code);
  const hasPhoneInput = String(body?.phone ?? "").trim() !== "";

  try {
    // ---- bước 1: chỉ mã ----
    if (!hasPhoneInput) {
      const found = await checkMemberCode(code);
      if (!found) {
        recordMemberFailure(req);
        return NextResponse.json({ ok: false, code: "memberInvalid", message: "Mã hội viên không đúng" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, step: "phone", code: found.code, hasPhone: found.hasPhone });
    }

    // ---- bước 2: mã + SĐT ----
    const locked = memberPhoneBlocked(req, key);
    if (locked) return locked;

    const c = await confirmMember(code, body.phone);
    if (!c.ok) {
      if (c.reason === "invalid") {
        recordMemberFailure(req);
        return NextResponse.json({ ok: false, code: "memberInvalid", message: "Mã hội viên không đúng" }, { status: 404 });
      }
      if (c.reason === "locked") {
        return NextResponse.json(
          { ok: false, code: "phoneLocked", message: "Nhập sai số điện thoại quá nhiều lần, mã hội viên này tạm khoá 15 phút" },
          { status: 429 },
        );
      }
      if (c.reason === "phoneMissing") {
        return NextResponse.json(
          { ok: false, code: "memberPhone", message: "Nhập số điện thoại đăng ký hội viên để xác nhận" },
          { status: 400 },
        );
      }
      recordMemberPhoneFailure(req, key);
      return NextResponse.json(
        { ok: false, code: "phoneMismatch", message: "Số điện thoại không khớp với hội viên này" },
        { status: 400 },
      );
    }
    return NextResponse.json({
      ok: true,
      step: "confirmed",
      member: publicMemberView(c.member),
      phoneUnverified: c.phoneUnverified,
    });
  } catch (e) {
    console.error("[BaoBay] member lookup failed:", e);
    return NextResponse.json({ ok: false, code: "server", message: "Không tra được mã, vui lòng thử lại" }, { status: 500 });
  }
}
