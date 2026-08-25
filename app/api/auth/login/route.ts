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

    const level = await validateAdmin(u, p);
    if (!level) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    // Mức quyền đi THEO TOKEN — giao diện đọc để ẩn/hiện, máy chủ đọc để chặn
    const token = signToken({ username: u, level });

    return NextResponse.json({
      token,
      user: { username: u, level },
      expiresIn: process.env.JWT_EXPIRES_IN ?? "1d",
    });
  } catch (err) {
    console.error("POST /api/auth/login error:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
