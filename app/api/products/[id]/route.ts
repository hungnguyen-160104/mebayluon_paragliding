// app/api/products/[id]/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { updateProduct, deleteProduct } from "@/services/product.service";
import { requireAuth } from "@/middlewares/requireAuth";

// PATCH /api/products/:id  (admin only)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth; // 401

  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    const updated = await updateProduct(id, body, auth);
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/products/[id] error:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/products/:id  (admin only)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth; // 401

  try {
    await connectDB();
    const { id } = await params;
    const removed = await deleteProduct(id, auth);
    return NextResponse.json(removed);
  } catch (err) {
    console.error("DELETE /api/products/[id] error:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
