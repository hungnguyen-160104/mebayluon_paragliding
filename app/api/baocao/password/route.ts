// app/api/baocao/password/route.ts
import { NextResponse } from "next/server";

import { changePasswordSchema, firstZodMessage } from "@/lib/baobay/validation";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { changeOwnPassword } from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Người dùng tự đổi mật khẩu — mật khẩu ban đầu do quản trị đặt và đọc qua điện thoại. */
export async function POST(req: Request) {
  const auth = requireBaobay(req);
  if (auth instanceof NextResponse) return auth;

  if (auth.viaAdmin) {
    return NextResponse.json(
      { message: "Token quản trị không đổi được mật khẩu tài khoản báo bay" },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: firstZodMessage(parsed.error) }, { status: 400 });
  }

  const result = await changeOwnPassword(auth.id, parsed.data.currentPassword, parsed.data.newPassword);
  if (!result.ok) return NextResponse.json({ message: result.error }, { status: 400 });

  return NextResponse.json({ ok: true });
}
