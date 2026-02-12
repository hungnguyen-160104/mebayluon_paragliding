// app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/middlewares/requireAuth";

export async function GET(req: Request) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth; // 401 nếu token không hợp lệ

  return NextResponse.json({ user: auth });
}
