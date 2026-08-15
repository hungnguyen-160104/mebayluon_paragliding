// app/api/baocao/me/route.ts
import { NextResponse } from "next/server";

import { ROLE_HOME } from "@/lib/baobay/roles";
import { BAOBAY_TOKEN_TTL_SECONDS, baobayCookieOptions, signBaobayToken } from "@/lib/baobay/token";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { BaobayAccount } from "@/models/BaobayAccount.model";
import { connectDB } from "@/lib/mongodb";
import { toSession } from "@/services/baobay.service";

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
      .select("username displayName role spots isActive mustChangePassword pilotKind extraRoles adminLevel")
      .lean<any>();

    if (!account || account.isActive === false) {
      return NextResponse.json({ message: "Tài khoản đã bị khoá" }, { status: 401 });
    }

    const extraRoles = (account.extraRoles ?? []).filter((r: string) => r !== account.role);
    const res = NextResponse.json({
      user: {
        id: auth.id,
        username: auth.username,
        name: account.displayName,
        role: account.role,
        spots: account.spots?.length ? account.spots : ["khau-pha"],
        pilotKind: account.pilotKind === "ppg" ? "ppg" : account.pilotKind === "both" ? "both" : "pg",
        extraRoles,
        mustChangePassword: Boolean(account.mustChangePassword),
      },
      redirectTo: ROLE_HOME[account.role as keyof typeof ROLE_HOME],
    });

    /**
     * VAI TRÒ ĐỔI GIỮA CHỪNG thì CẤP LẠI THẺ ĐĂNG NHẬP ngay.
     *
     * Quyền của các cửa API đọc từ thẻ trong máy người dùng, mà thẻ sống 7 ngày.
     * Admin thêm vai kiêm nhiệm xong, người đang đăng nhập vẫn mang thẻ cũ nên
     * bấm vào trang mới là bị chặn — trông y như lỗi phần mềm. Chuyện này đã xảy
     * ra thật với tài khoản quản trị kiêm kế toán.
     */
    const sameRole = auth.role === account.role;
    const sameExtra = [...(auth.extraRoles ?? [])].sort().join(",") === [...extraRoles].sort().join(",");
    if (!sameRole || !sameExtra) {
      res.cookies.set({
        ...baobayCookieOptions(BAOBAY_TOKEN_TTL_SECONDS),
        // Dựng phiên từ bản ghi vừa đọc — nhớ giữ đúng id/tên đăng nhập của thẻ cũ
        value: signBaobayToken(toSession({ ...account, _id: auth.id, username: account.username || auth.username } as never)),
      });
    }
    return res;
  }

  return NextResponse.json({
    user: { ...auth, mustChangePassword: false },
    redirectTo: ROLE_HOME[auth.role],
  });
}
