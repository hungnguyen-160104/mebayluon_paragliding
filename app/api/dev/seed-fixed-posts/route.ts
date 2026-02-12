// app/api/dev/seed-fixed-posts/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { seedFixedPosts } from "@/lib/fixed-posts/fixedPosts.service";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!process.env.SEED_TOKEN || token !== process.env.SEED_TOKEN) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    await connectDB();
    await seedFixedPosts();
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[SEED] fixed posts error:", err);
    return NextResponse.json({ message: "Seed failed" }, { status: 500 });
  }
}
