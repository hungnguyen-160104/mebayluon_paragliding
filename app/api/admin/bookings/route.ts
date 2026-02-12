// app/api/admin/bookings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/middlewares/requireAuth";
import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/models/Booking.model";
//import { Customer } from "@/models/Customer.model";

export const runtime = "nodejs";

/**
 * GET /api/admin/bookings
 * List bookings with pagination, filtering, and search
 * Query params:
 * - page: number (default 1)
 * - limit: number (default 20, max 100)
 * - q: string (search by phone/email/fullName)
 * - status: "pending" | "confirmed" | "cancelled"
 * - sort: "newest" default
 */
export async function GET(req: NextRequest) {
  // Verify admin auth
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) {
    return auth;
  }

  try {
    await connectDB();

    // Parse query params
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const q = (searchParams.get("q") || "").trim();
    const status = searchParams.get("status");

    // Build query filter
    const filter: any = {};

    // Add status filter if provided
    if (status && ["pending", "confirmed", "completed", "cancelled"].includes(status)) {
      filter.status = status;
    }

    // Add search filter
    if (q) {
      const searchRegex = { $regex: q, $options: "i" };
      filter.$or = [
        { "contact.phone": searchRegex },
        { "contact.email": searchRegex },
        { locationName: searchRegex },
      ];
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Booking.find(filter)
        .select({
          _id: 1,
          customerId: 1,
          location: 1,
          locationName: 1,
          dateISO: 1,
          timeSlot: 1,
          guestsCount: 1,
          status: 1,
          createdAt: 1,
          "contact.phone": 1,
          "contact.email": 1,
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Booking.countDocuments(filter),
    ]);

    return NextResponse.json({
      ok: true,
      items,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    console.error("[AdminBookings] Error:", err?.message);
    return NextResponse.json(
      { ok: false, error: "FETCH_ERROR", message: err?.message || "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}
