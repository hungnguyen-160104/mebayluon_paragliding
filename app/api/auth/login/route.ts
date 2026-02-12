// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { validateAdmin } from "@/services/auth.service";
import { signToken } from "@/utils/jwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { username = "", password = "" } = await req.json();
    const u = String(username).trim();
    const p = String(password).trim();

    if (!u || !p) {
      return NextResponse.json(
        { message: "Missing username or password" },
        { status: 400 }
      );
    }

    const ok = await validateAdmin(u, p);
    if (!ok) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    const token = signToken({ username: u });

    return NextResponse.json({
      token,
      user: { username: u },
      expiresIn: process.env.JWT_EXPIRES_IN ?? "1d",
    });
  } catch (err) {
    console.error("POST /api/auth/login error:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
