// app/api/admin/baobay/accounts/route.ts
import { NextResponse } from "next/server";

import { isBaobayRole } from "@/lib/baobay/roles";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { createAccount, createAccountsBulk, listAccounts, randomPassword } from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Quản lý tài khoản báo bay. Chỉ token quản trị website (khu /admin) gọi được —
 * chính phi công hay quầy vé không tự tạo tài khoản cho nhau.
 */
export async function GET(req: Request) {
  const auth = requireBaobay(req, { roles: ["admin"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json({ accounts: await listAccounts() });
}

export async function POST(req: Request) {
  const auth = requireBaobay(req, { roles: ["admin"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const role = body?.role;

  if (!isBaobayRole(role)) {
    return NextResponse.json({ message: "Vai trò không hợp lệ" }, { status: 400 });
  }

  // Tạo cả loạt từ danh sách tên (mỗi dòng một người)
  if (body?.mode === "bulk") {
    const names = String(body?.names ?? "")
      .split(/[\n\r]+/)
      .map((s: string) => s.trim())
      .filter(Boolean);

    if (!names.length) {
      return NextResponse.json({ message: "Chưa nhập danh sách tên" }, { status: 400 });
    }
    if (names.length > 100) {
      return NextResponse.json({ message: "Mỗi lần tạo tối đa 100 tài khoản" }, { status: 400 });
    }

    const result = await createAccountsBulk(names, role, body?.spots);
    return NextResponse.json(result, { status: result.created.length ? 201 : 400 });
  }

  // Tạo một tài khoản, mật khẩu để trống thì sinh ngẫu nhiên
  const password = String(body?.password ?? "").trim() || randomPassword();
  const result = await createAccount({
    username: String(body?.username ?? ""),
    password,
    displayName: String(body?.displayName ?? ""),
    role,
    email: body?.email ? String(body.email) : undefined,
    phone: body?.phone ? String(body.phone) : undefined,
    spots: Array.isArray(body?.spots) ? body.spots.map(String) : undefined,
    note: body?.note ? String(body.note) : undefined,
  });

  if (!result.ok) return NextResponse.json({ message: result.error }, { status: 400 });

  /**
   * Trả mật khẩu thô về ĐÚNG MỘT LẦN để quản trị đọc cho người dùng.
   * Cơ sở dữ liệu chỉ giữ bản băm bcrypt; quên thì đặt lại chứ không tra được.
   */
  return NextResponse.json({ account: result.account, password }, { status: 201 });
}
