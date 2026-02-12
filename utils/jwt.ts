// utils/jwt.ts
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";

export type TokenPayload = { username: string };

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

  return decoded as JwtPayload & TokenPayload;
}
