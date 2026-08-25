// utils/jwt.ts
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";

/**
 * `level` = mức quyền khu quản trị website (xem services/auth.service.ts).
 * Token CŨ phát trước ngày tách quyền không có trường này — mọi chỗ đọc phải
 * coi như "editor" (mức thấp), tuyệt đối đừng mặc định "owner": làm thế là
 * token cũ của tài khoản biên tập vẫn mở được sổ tiền báo bay.
 */
export type AdminLevel = "owner" | "editor";

export type TokenPayload = { username: string; level?: AdminLevel };

// Ép SECRET thành string theo cách an toàn để TS hiểu
const SECRET: string = (() => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is missing in environment variables");
  return s;
})();

// Mặc định thời hạn token
const DEFAULT_EXPIRES_IN: SignOptions["expiresIn"] =
  (process.env.JWT_EXPIRES_IN ?? "1d") as SignOptions["expiresIn"];

/** Tạo JWT (HS256) */
export function signToken(
  payload: TokenPayload,
  expiresIn?: SignOptions["expiresIn"]
): string {
  return jwt.sign(payload, SECRET, {
    algorithm: "HS256",
    expiresIn: expiresIn ?? DEFAULT_EXPIRES_IN,
  });
}

/** Verify JWT và đảm bảo có trường `username` */
export function verifyToken(token: string): JwtPayload & TokenPayload {
  const decoded = jwt.verify(token, SECRET, { algorithms: ["HS256"] });

  if (typeof decoded === "string" || !decoded || typeof (decoded as any).username !== "string") {
    throw new Error("Invalid token payload");
  }

  /** Thiếu `level` (token phát trước ngày tách quyền) thì hạ về mức thấp nhất. */
  if ((decoded as any).level !== "owner") (decoded as any).level = "editor";

  /**
   * Chặn token của khu khác dùng làm token admin.
   *
   * Trang báo bay (/baocao) ký token bằng CÙNG JWT_SECRET và cũng có trường
   * `username`, nên nếu không kiểm `scope` thì cookie của một phi công sẽ đi
   * qua requireAuth và mở được toàn bộ API admin. Token admin do signToken()
   * tạo ra không có `scope`, vì vậy chỉ cần từ chối mọi token CÓ scope khác
   * "admin" — không ảnh hưởng token đã phát trước đây.
   */
  const scope = (decoded as any).scope;
  if (scope !== undefined && scope !== "admin") {
    throw new Error(`Token thuộc phạm vi khác: ${String(scope)}`);
  }

  return decoded as JwtPayload & TokenPayload;
}
