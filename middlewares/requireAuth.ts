// middlewares/requireAuth.ts
import { NextResponse } from "next/server";
import { verifyToken } from "@/utils/jwt";
import { AUTH_TOKEN_KEY } from "@/lib/auth-constants";

const AUTH_COOKIE_NAME = AUTH_TOKEN_KEY;

export type AuthUser = {
  username: string;
  iat?: number;
  exp?: number;
};

/**
 * Require JWT auth for Next.js App Router handlers.
 * - On success: returns payload { username, iat, exp }
 * - On failure: returns NextResponse 401 with WWW-Authenticate header
 */
export function requireAuth(req: Request): AuthUser | NextResponse {
  const token = extractToken(req);

  if (!token) {
    return NextResponse.json(
      { message: "Missing authentication token" },
      {
        status: 401,
        headers: { "WWW-Authenticate": 'Bearer realm="api"' },
      }
    );
  }

  try {
    const payload = verifyToken(token);
    const user: AuthUser = {
      username: (payload as any).username,
      iat: (payload as any).iat,
      exp: (payload as any).exp,
    };
    return user;
  } catch (err) {
    console.warn("[requireAuth] invalid token", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { message: "Invalid or expired token" },
      {
        status: 401,
        headers: { "WWW-Authenticate": 'Bearer error="invalid_token"' },
      }
    );
  }
}

/**
 * 404 helper for API routes (optional)
 */
export function notFound() {
  return NextResponse.json({ message: "Route not found" }, { status: 404 });
}

/**
 * Generic error helper for API routes (optional)
 */
export function errorHandler(err: any) {
  console.error("❌ Error:", err);
  const status = err?.status || 500;
  const message = err?.message || "Internal Server Error";
  return NextResponse.json({ message }, { status });
}

function extractToken(req: Request): string | null {
  const header = req.headers.get("authorization") || "";
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (m) {
    return m[1].trim();
  }

  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";");
  for (const raw of cookies) {
    const [name, ...rest] = raw.trim().split("=");
    if (!name) continue;
    if (name === AUTH_COOKIE_NAME) {
      return decodeURIComponent(rest.join("="));
    }
  }

  return null;
}
