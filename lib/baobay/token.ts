// lib/baobay/token.ts
/**
 * Phiên đăng nhập của phi công / quầy vé / kế toán ở /baobay.
 *
 * Tách khỏi token admin (utils/jwt.ts) ở hai điểm:
 *
 *  1. Có trường `scope: "baobay"`. Hai bên dùng chung JWT_SECRET, nên nếu
 *     không đánh dấu thì token phi công (cũng có `username`) sẽ lọt qua
 *     requireAuth của khu admin. utils/jwt.ts đã được vá để từ chối token có
 *     scope lạ — đừng bỏ trường này.
 *
 *  2. Lưu trong cookie httpOnly, KHÔNG dùng localStorage như khu admin.
 *     Máy ở quầy vé và điện thoại phi công dùng chung nhiều người; cookie
 *     httpOnly không đọc được bằng JavaScript và tự hết hạn.
 */

import jwt, { type JwtPayload } from "jsonwebtoken";

import { BAOBAY_COOKIE } from "@/lib/baobay/cookie";
import type { BaobayRole } from "@/lib/baobay/roles";
import { isBaobayRole } from "@/lib/baobay/roles";

export { BAOBAY_COOKIE };

/** 30 ngày: phi công nhập bằng điện thoại, bắt đăng nhập lại mỗi ngày là quá phiền. */
export const BAOBAY_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

export type BaobaySession = {
  /** _id của tài khoản trong MongoDB. */
  id: string;
  username: string;
  name: string;
  role: BaobayRole;
  /** Các điểm bay admin đã chỉ định — người này chỉ làm việc trong danh sách này. */
  spots: string[];
};

type BaobayClaims = BaobaySession & { scope: "baobay" };

function getSecret(): string {
  const s = process.env.JWT_SECRET;
  // Đọc lúc gọi, không đọc lúc nạp module: import ở build time cũng không nổ.
  if (!s) throw new Error("Thiếu JWT_SECRET trong biến môi trường");
  return s;
}

export function signBaobayToken(session: BaobaySession): string {
  const claims: BaobayClaims = { ...session, scope: "baobay" };
  return jwt.sign(claims, getSecret(), {
    algorithm: "HS256",
    expiresIn: BAOBAY_TOKEN_TTL_SECONDS,
  });
}

/** Trả về phiên, hoặc null nếu token sai / hết hạn / không phải token báo bay. */
export function verifyBaobayToken(token: string): BaobaySession | null {
  try {
    const decoded = jwt.verify(token, getSecret(), { algorithms: ["HS256"] });
    if (typeof decoded === "string") return null;

    const p = decoded as JwtPayload & Partial<BaobayClaims>;
    if (p.scope !== "baobay") return null;
    if (!p.id || !p.username || !isBaobayRole(p.role)) return null;

    /**
     * Token phát TRƯỚC bản đa điểm bay chỉ có `spot` (một chuỗi). Quy về mảng
     * để phiên đang đăng nhập không bị đá ra ngoài sau khi cập nhật.
     */
    const legacySpot = (p as { spot?: string }).spot;
    const spots = Array.isArray(p.spots) ? p.spots.map(String) : legacySpot ? [String(legacySpot)] : [];

    return {
      id: String(p.id),
      username: String(p.username),
      name: String(p.name || p.username),
      role: p.role,
      spots,
    };
  } catch {
    return null;
  }
}

/** Đọc cookie phiên báo bay từ một Request thuần (App Router handler). */
export function readBaobayCookie(req: Request): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;

  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === BAOBAY_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return null;
}

/** Tuỳ chọn cookie dùng chung cho lúc đăng nhập và đăng xuất. */
export function baobayCookieOptions(maxAge: number) {
  return {
    name: BAOBAY_COOKIE,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}
