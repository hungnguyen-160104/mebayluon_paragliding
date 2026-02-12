import type { FilterQuery, PipelineStage } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Booking, type IBooking } from "@/models/Booking.model";
import { Customer, type ICustomer } from "@/models/Customer.model";

export type GroupByGranularity = "day" | "month" | "year";

export type DateRange = {
  from?: Date;
  to?: Date;
};

const DATE_FORMAT: Record<GroupByGranularity, string> = {
  day: "%Y-%m-%d",
  month: "%Y-%m",
  year: "%Y",
};

function buildCreatedAtFilter(range?: DateRange): FilterQuery<IBooking>["createdAt"] | undefined {
  if (!range?.from && !range?.to) return undefined;
  const filter: FilterQuery<IBooking>["createdAt"] = {};
  if (range.from) filter.$gte = range.from;
  if (range.to) filter.$lte = range.to;
  return filter;
}

function buildMatchStage(range?: DateRange): PipelineStage.Match | null {
  const createdAt = buildCreatedAtFilter(range);
  if (!createdAt) return null;
  return { $match: { createdAt } };
}

function sumPriceExpression() {
  return { $ifNull: ["$price.total", 0] };
}

export async function getOverviewStats(range?: DateRange) {
  await connectDB();

  const createdAt = buildCreatedAtFilter(range);
  const bookingFilter: FilterQuery<IBooking> = createdAt ? { createdAt } : {};
  const customerFilter: FilterQuery<ICustomer> = createdAt ? { createdAt } : {};

  const [customerCount, bookingAggregation, completedCount, pendingCount] = await Promise.all([
    Customer.countDocuments(customerFilter),
    Booking.aggregate<{ total: number; revenue: number }>([
      ...(createdAt ? [{ $match: { createdAt } } satisfies PipelineStage.Match] : []),
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          revenue: { $sum: sumPriceExpression() },
        },
      },
    ]),
    Booking.countDocuments({ ...bookingFilter, status: "completed" }),
    Booking.countDocuments({ ...bookingFilter, status: "pending" }),
  ]);

  const totalBookings = bookingAggregation[0]?.total ?? 0;
  const totalRevenue = bookingAggregation[0]?.revenue ?? 0;
  const averageRevenuePerBooking = totalBookings > 0 ? totalRevenue / totalBookings : 0;

  return {
    totalCustomers: customerCount,
    totalBookings,
    completedBookings: completedCount,
    pendingBookings: pendingCount,
    totalRevenue,
    averageRevenuePerBooking,
  };
}

export async function getBookingsTimeSeries(groupBy: GroupByGranularity, range?: DateRange) {
  await connectDB();

  const pipeline: PipelineStage[] = [];
  const matchStage = buildMatchStage(range);
  if (matchStage) pipeline.push(matchStage);
  pipeline.push(
    {
      $group: {
        _id: {
          $dateToString: {
            format: DATE_FORMAT[groupBy],
            date: "$createdAt",
          },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  );

  const rows = await Booking.aggregate<{ _id: string; count: number }>(pipeline);

  return {
    labels: rows.map((row) => row._id),
    data: rows.map((row) => row.count),
  };
}

export async function getRevenueTimeSeries(groupBy: GroupByGranularity, range?: DateRange) {
  await connectDB();

  const pipeline: PipelineStage[] = [];
  const matchStage = buildMatchStage(range);
  if (matchStage) pipeline.push(matchStage);
  pipeline.push(
    {
      $group: {
        _id: {
          $dateToString: {
            format: DATE_FORMAT[groupBy],
            date: "$createdAt",
          },
        },
        revenue: { $sum: sumPriceExpression() },
      },
    },
    { $sort: { _id: 1 } },
  );

  const rows = await Booking.aggregate<{ _id: string; revenue: number }>(pipeline);

  return {
    labels: rows.map((row) => row._id),
    data: rows.map((row) => row.revenue),
  };
}

export async function getStatusBreakdown(range?: DateRange) {
  await connectDB();

  const pipeline: PipelineStage[] = [];
  const matchStage = buildMatchStage(range);
  if (matchStage) pipeline.push(matchStage);
  pipeline.push({
    $group: {
      _id: "$status",
      count: { $sum: 1 },
    },
  });

  const grouped = await Booking.aggregate<{ _id: string; count: number }>(pipeline);

  const fallback: Record<"pending" | "confirmed" | "completed", number> = {
    pending: 0,
    confirmed: 0,
    completed: 0,
  };

  grouped.forEach((row) => {
    if (row._id === "pending" || row._id === "confirmed" || row._id === "completed") {
      fallback[row._id] = row.count;
    }
  });

  return fallback;
}

export async function getTopLocations(range?: DateRange, limit = 5) {
  await connectDB();

  const pipeline: PipelineStage[] = [];
  const matchStage = buildMatchStage(range);
  if (matchStage) pipeline.push(matchStage);
  pipeline.push(
    {
      $group: {
        _id: "$location",
        bookings: { $sum: 1 },
        revenue: { $sum: sumPriceExpression() },
      },
    },
    { $sort: { bookings: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        location: "$_id",
        bookings: 1,
        revenue: 1,
      },
    },
  );

  return Booking.aggregate<{ location: string; bookings: number; revenue: number }>(pipeline);
}
