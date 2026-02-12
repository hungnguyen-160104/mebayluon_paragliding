// app/api/products/slug/[slug]/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getProductBySlug } from "@/services/product.service";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> } // 👈 params là Promise
) {
  try {
    await connectDB();
    const { slug } = await ctx.params;       // 👈 phải await
    const product = await getProductBySlug(slug);
    if (!product) {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (err) {
    console.error("GET /api/products/slug/[slug] error:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
