// app/api/admin/customers/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/middlewares/requireAuth";
import { connectDB } from "@/lib/mongodb";
import { Customer } from "@/models/Customer.model";
import { Booking } from "@/models/Booking.model";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) {
    return auth;
  }

  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_ID", message: "Invalid customer ID" },
        { status: 400 }
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "INVALID_JSON", message: "Invalid JSON" },
        { status: 400 }
      );
    }

    const { contactStatus } = body;

    if (contactStatus && !["pending", "contacted"].includes(contactStatus)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_STATUS", message: "Invalid contact status" },
        { status: 400 }
      );
    }

    const update: Record<string, any> = {};

    if (contactStatus) {
      update.contactStatus = contactStatus;
      update.contactedAt = contactStatus === "contacted" ? new Date() : null;
    }

    if (!Object.keys(update).length) {
      return NextResponse.json(
        { ok: false, error: "NO_CHANGES", message: "No valid fields provided" },
        { status: 400 }
      );
    }

    const customer = await Customer.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();

    if (!customer) {
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND", message: "Customer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, customer });
  } catch (err: any) {
    console.error("[AdminCustomerUpdate] Error:", err?.message);
    return NextResponse.json(
      { ok: false, error: "UPDATE_ERROR", message: err?.message || "Failed to update customer" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) {
    return auth;
  }

  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_ID", message: "Invalid customer ID" },
        { status: 400 }
      );
    }

    const customer = await Customer.findById(id)
      .select({ _id: 1 })
      .lean<{ _id: mongoose.Types.ObjectId }>();
    if (!customer) {
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND", message: "Customer not found" },
        { status: 404 }
      );
    }

    await Promise.all([
      Booking.deleteMany({ customerId: customer._id }),
      Customer.deleteOne({ _id: customer._id }),
    ]);

    return NextResponse.json({ ok: true, customerId: id });
  } catch (err: any) {
    console.error("[AdminCustomerDelete] Error:", err?.message);
    return NextResponse.json(
      { ok: false, error: "DELETE_ERROR", message: err?.message || "Failed to delete customer" },
      { status: 500 }
    );
  }
}
