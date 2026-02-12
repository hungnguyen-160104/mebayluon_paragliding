// app/api/admin/customers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/middlewares/requireAuth";
import { connectDB } from "@/lib/mongodb";
import { Customer } from "@/models/Customer.model";
import { Booking } from "@/models/Booking.model";

export const runtime = "nodejs";

/**
 * GET /api/admin/customers
 * List customers with pagination and search
 * Query params:
 * - page: number (default 1)
 * - limit: number (default 20, max 100)
 * - q: string (search by phone/email/fullName)
 * - sort: "latest" | "oldest" (default latest booking)
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
    const sort = searchParams.get("sort") || "latest"; // latest | oldest

    // Build query filter
    const filter: any = {};

    // Add search filter
    if (q) {
      const searchRegex = { $regex: q, $options: "i" };
      filter.$or = [
        { phone: searchRegex },
        { email: searchRegex },
        { fullName: searchRegex },
      ];
    }

    // Determine sort order
    const sortOrder = sort === "oldest" ? 1 : -1; // -1 for newest, 1 for oldest

    // Execute query with pagination + aggregated stats
    const skip = (page - 1) * limit;
    const bookingCollection = Booking.collection?.name || "bookings";

    const [items, total] = await Promise.all([
      Customer.aggregate([
        { $match: filter },
        { $sort: { lastBookingAt: sortOrder, createdAt: sortOrder } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: bookingCollection,
            let: { customerId: "$_id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$customerId", "$$customerId"] } } },
              { $sort: { createdAt: -1 } },
              {
                $group: {
                  _id: null,
                  totalBookings: { $sum: 1 },
                  totalGuests: {
                    $sum: {
                      $cond: [
                        { $gt: [{ $ifNull: ["$guestsCount", 0] }, 0] },
                        { $ifNull: ["$guestsCount", 1] },
                        1,
                      ],
                    },
                  },
                  totalSpent: { $sum: { $ifNull: ["$price.total", 0] } },
                  lastBookingAt: { $max: "$createdAt" },
                  lastBookingDateISO: { $first: "$dateISO" },
                  lastBookingTimeSlot: { $first: "$timeSlot" },
                  lastBookingLocation: { $first: "$locationName" },
                  lastBookingStatus: { $first: "$status" },
                  lastBookingPrice: { $first: { $ifNull: ["$price.total", 0] } },
                },
              },
            ],
            as: "stats",
          },
        },
        {
          $addFields: {
            stats: { $arrayElemAt: ["$stats", 0] },
          },
        },
        {
          $addFields: {
            totalBookings: { $ifNull: ["$stats.totalBookings", 0] },
            totalGuests: { $ifNull: ["$stats.totalGuests", 0] },
            totalSpent: { $ifNull: ["$stats.totalSpent", 0] },
            lastBookingAt: {
              $ifNull: ["$stats.lastBookingAt", "$lastBookingAt"]
            },
            lastBookingDateISO: "$stats.lastBookingDateISO",
            lastBookingTimeSlot: "$stats.lastBookingTimeSlot",
            lastBookingLocation: "$stats.lastBookingLocation",
            lastBookingStatus: "$stats.lastBookingStatus",
            lastBookingPrice: "$stats.lastBookingPrice",
          },
        },
        {
          $project: {
            phone: 1,
            email: 1,
            fullName: 1,
            lastBookingAt: 1,
            createdAt: 1,
            contactStatus: 1,
            contactedAt: 1,
            totalBookings: 1,
            totalGuests: 1,
            totalSpent: 1,
            lastBookingDateISO: 1,
            lastBookingTimeSlot: 1,
            lastBookingLocation: 1,
            lastBookingStatus: 1,
            lastBookingPrice: 1,
          },
        },
      ]),
      Customer.countDocuments(filter),
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
    console.error("[AdminCustomers] Error:", err?.message);
    return NextResponse.json(
      { ok: false, error: "FETCH_ERROR", message: err?.message || "Failed to fetch customers" },
      { status: 500 }
    );
  }
}
