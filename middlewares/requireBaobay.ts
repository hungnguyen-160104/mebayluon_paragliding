// middlewares/requireBaobay.ts
import { NextResponse } from "next/server";

import type { BaobayRole } from "@/lib/baobay/roles";
import { ROLE_LABEL } from "@/lib/baobay/roles";
import { readBaobayCookie, verifyBaobayToken, type BaobaySession } from "@/lib/baobay/token";
import { SPOT_IDS } from "@/lib/baobay/spots";
import { verifyToken } from "@/utils/jwt";
import { AUTH_TOKEN_KEY } from "@/lib/auth-constants";

export type BaobayAuth = BaobaySession & {
  /** true khi vào bằng token quản trị website chứ không phải tài khoản báo bay. */
  viaAdmin?: boolean;
};

type Options = {
  /** Chỉ cho các vai trò này; bỏ trống là cho mọi vai trò đã đăng nhập. */
  roles?: BaobayRole[];
  /**
   * Cho phép token quản trị website đi qua (nhận vai trò kế toán).
   * Dùng cho các endpoint CHỈ ĐỌC như bảng tổng hợp — quản trị vốn đã xem được
   * dữ liệu này ở khu admin. Không bật cho endpoint ghi báo cáo: báo cáo phải
   * gắn với một tài khoản người thật để còn biết hỏi ai khi lệch số.
   */
  allowAdmin?: boolean;
};

/**
 * Xác thực phiên báo bay cho route handler.
 * Thành công trả về phiên, thất bại trả về NextResponse 401/403 để `return` luôn.
 */
export function requireBaobay(req: Request, opts: Options = {}): BaobayAuth | NextResponse {
  const session = resolveSession(req, opts.allowAdmin === true);

  if (!session) {
    return NextResponse.json(
      { message: "Chưa đăng nhập hoặc phiên đã hết hạn" },
      { status: 401, headers: { "WWW-Authenticate": 'Cookie realm="baobay"' } },
    );
  }

  /**
   * Token quản trị WEBSITE (viaAdmin) đi qua mọi kiểm vai trò: chủ site vốn đã
   * là quyền cao nhất, tách vai trò chỉ để phân nhau giữa NHÂN SỰ báo bay.
   */
  /** Người kiêm nhiệm (vd. phi công kiêm camera man) đi qua cửa của cả hai vai. */
  const wearing = [session.role, ...(session.extraRoles ?? [])];
  if (!session.viaAdmin && opts.roles?.length && !opts.roles.some((r) => wearing.includes(r))) {
    const allowed = opts.roles.map((r) => ROLE_LABEL[r]).join(", ");
    return NextResponse.json(
      { message: `Tài khoản ${ROLE_LABEL[session.role]} không có quyền ở đây (cần: ${allowed})` },
      { status: 403 },
    );
  }

  return session;
}

function resolveSession(req: Request, allowAdmin: boolean): BaobayAuth | null {
  const cookieToken = readBaobayCookie(req);
  if (cookieToken) {
    const session = verifyBaobayToken(cookieToken);
    if (session) return session;
  }

  // Cho phép Authorization: Bearer <token báo bay> để tiện gọi bằng script.
  const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (bearer) {
    const session = verifyBaobayToken(bearer);
    if (session) return session;
  }

  if (!allowAdmin) return null;

  const adminToken = bearer || readCookie(req, AUTH_TOKEN_KEY);
  if (!adminToken) return null;

  try {
    const payload = verifyToken(adminToken);
    /**
     * CHỈ TÀI KHOẢN CHỦ mới được mượn cửa này.
     *
     * Cờ `viaAdmin` bỏ qua mọi kiểm vai trò bên dưới, nên nó là chìa vạn năng
     * của cả khu báo bay: sổ booking, sổ tiền, soát chuyển khoản, tài khoản
     * nhân sự, sổ phòng homestay. Tài khoản BIÊN TẬP (điều phối vào đăng bài)
     * không có việc gì ở đó — cho qua là lộ thông tin nhân sự và tiền bạc.
     */
    if (payload.level !== "owner") return null;
    return {
      id: "admin",
      username: payload.username,
      name: "Quản trị",
      role: "accountant",
      // Token quản trị website xem được mọi điểm bay
      spots: SPOT_IDS as unknown as string[],
      viaAdmin: true,
    };
  } catch {
    return null;
  }
}

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}
