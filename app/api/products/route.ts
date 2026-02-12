// app/api/products/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { listProducts, createProduct } from "@/services/product.service";
import { requireAuth } from "@/middlewares/requireAuth";

// GET /api/products
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const query = Object.fromEntries(searchParams.entries());
    const products = await listProducts(query);
    return NextResponse.json(products);
  } catch (err) {
    console.error("GET /api/products error:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/products  (admin only)
export async function POST(req: Request) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth; // 401

  try {
    await connectDB();
    const body = await req.json();
    const created = await createProduct(body, auth);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/products error:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
