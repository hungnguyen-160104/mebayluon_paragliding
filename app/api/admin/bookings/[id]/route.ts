// app/api/admin/bookings/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/middlewares/requireAuth";
import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/models/Booking.model";
import { Customer } from "@/models/Customer.model";
import mongoose from "mongoose";

export const runtime = "nodejs";

/**
 * GET /api/admin/bookings/[id]
 * Get booking detail with customer info
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify admin auth
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) {
    return auth;
  }

  try {
    await connectDB();

    const { id } = await params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_ID", message: "Invalid booking ID" },
        { status: 400 }
      );
    }

    // Fetch booking with customer
    const booking = await Booking.findById(id)
      .populate({
        path: "customerId",
        select: "phone email fullName lastBookingAt createdAt",
        model: Customer,
      })
      .lean();

    if (!booking) {
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND", message: "Booking not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      booking,
    });
  } catch (err: any) {
    console.error("[AdminBookingDetail] Error:", err?.message);
    return NextResponse.json(
      { ok: false, error: "FETCH_ERROR", message: err?.message || "Failed to fetch booking" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/bookings/[id]
 * Update booking (e.g., change status)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify admin auth
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) {
    return auth;
  }

  try {
    await connectDB();

    const { id } = await params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_ID", message: "Invalid booking ID" },
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

    const { status } = body;

    // Validate status if provided
    if (status && !["pending", "confirmed", "completed", "cancelled"].includes(status)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_STATUS", message: "Invalid status value" },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: any = {};
    if (status) {
      updateData.status = status;
    }

    // Update booking
    const booking = await Booking.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate({
        path: "customerId",
        select: "phone email fullName lastBookingAt createdAt",
        model: Customer,
      })
      .lean();

    if (!booking) {
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND", message: "Booking not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Booking updated",
      booking,
    });
  } catch (err: any) {
    console.error("[AdminBookingUpdate] Error:", err?.message);
    return NextResponse.json(
      { ok: false, error: "UPDATE_ERROR", message: err?.message || "Failed to update booking" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/bookings/[id]
 * Remove a booking
 */
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
        { ok: false, error: "INVALID_ID", message: "Invalid booking ID" },
        { status: 400 }
      );
    }

    const deleted = await Booking.findByIdAndDelete(id).lean();

    if (!deleted) {
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND", message: "Booking not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, message: "Booking deleted", bookingId: id });
  } catch (err: any) {
    console.error("[AdminBookingDelete] Error:", err?.message);
    return NextResponse.json(
      { ok: false, error: "DELETE_ERROR", message: err?.message || "Failed to delete booking" },
      { status: 500 }
    );
  }
}
