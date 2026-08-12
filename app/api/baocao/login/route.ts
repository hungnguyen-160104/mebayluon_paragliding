// app/api/baocao/login/route.ts
import { NextResponse } from "next/server";

import { ROLE_HOME } from "@/lib/baobay/roles";
import {
  BAOBAY_TOKEN_TTL_SECONDS,
  baobayCookieOptions,
  signBaobayToken,
} from "@/lib/baobay/token";
import type { BaobayUserDTO } from "@/lib/baobay/types";
import { authenticateBaobay, toSession } from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const username = String(body?.username ?? "").trim();
    const password = String(body?.password ?? "");

    if (!username || !password) {
      return NextResponse.json({ message: "Chưa nhập tài khoản hoặc mật khẩu" }, { status: 400 });
    }

    const result = await authenticateBaobay(username, password);

    if (!result.ok) {
      /**
       * Sai quá nhiều lần thì nói rõ là đang bị khoá tạm — người gõ nhầm cần
       * biết chờ bao lâu. Ngoài ra vẫn không phân biệt "sai mật khẩu" với
       * "không có tài khoản", để người ngoài không dò ra danh sách tài khoản.
       */
      const message =
        result.reason === "locked"
          ? `Sai quá nhiều lần — tài khoản tạm khoá ${result.minutes} phút. Thử lại sau hoặc nhờ quản trị đặt lại mật khẩu.`
          : "Tài khoản hoặc mật khẩu không đúng";
      return NextResponse.json({ message }, { status: result.reason === "locked" ? 429 : 401 });
    }

    const account = result.account;
    const session = toSession(account);
    const user: BaobayUserDTO = {
      id: session.id,
      username: session.username,
      name: session.name,
      role: session.role,
      spots: session.spots,
      mustChangePassword: Boolean(account.mustChangePassword),
    };

    const res = NextResponse.json({ user, redirectTo: ROLE_HOME[session.role] });
    res.cookies.set({
      ...baobayCookieOptions(BAOBAY_TOKEN_TTL_SECONDS),
      value: signBaobayToken(session),
    });
    return res;
  } catch (err) {
    console.error("POST /api/baocao/login error:", err);
    return NextResponse.json({ message: "Lỗi máy chủ" }, { status: 500 });
  }
}
