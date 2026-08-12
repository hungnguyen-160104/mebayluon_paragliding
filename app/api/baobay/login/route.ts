// app/api/baobay/login/route.ts
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

    const account = await authenticateBaobay(username, password);
    if (!account) {
      // Không phân biệt "sai mật khẩu" với "tài khoản bị khoá" — đỡ bị dò tài khoản.
      return NextResponse.json({ message: "Tài khoản hoặc mật khẩu không đúng" }, { status: 401 });
    }

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
    console.error("POST /api/baobay/login error:", err);
    return NextResponse.json({ message: "Lỗi máy chủ" }, { status: 500 });
  }
}
