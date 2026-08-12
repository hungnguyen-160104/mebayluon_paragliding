// app/api/baocao/me/route.ts
import { NextResponse } from "next/server";

import { ROLE_HOME } from "@/lib/baobay/roles";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { BaobayAccount } from "@/models/BaobayAccount.model";
import { connectDB } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = requireBaobay(req);
  if (auth instanceof NextResponse) return auth;

  /**
   * Đọc lại tài khoản trong cơ sở dữ liệu thay vì tin hết vào token: quản trị
   * khoá tài khoản hoặc đổi vai trò thì phải có tác dụng ngay, chứ không đợi
   * token hết hạn sau 30 ngày.
   */
  if (!auth.viaAdmin) {
    await connectDB();
    const account = await BaobayAccount.findById(auth.id)
      .select("displayName role spots isActive mustChangePassword")
      .lean<any>();

    if (!account || account.isActive === false) {
      return NextResponse.json({ message: "Tài khoản đã bị khoá" }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: auth.id,
        username: auth.username,
        name: account.displayName,
        role: account.role,
        spots: account.spots?.length ? account.spots : ["khau-pha"],
        mustChangePassword: Boolean(account.mustChangePassword),
      },
      redirectTo: ROLE_HOME[account.role as keyof typeof ROLE_HOME],
    });
  }

  return NextResponse.json({
    user: { ...auth, mustChangePassword: false },
    redirectTo: ROLE_HOME[auth.role],
  });
}
