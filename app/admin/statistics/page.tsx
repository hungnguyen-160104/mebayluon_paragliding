import { Metadata } from "next";
import { startOfMonth, endOfDay } from "date-fns";
import {
  getOverviewStats,
  getBookingsTimeSeries,
  getRevenueTimeSeries,
  getStatusBreakdown,
  getTopLocations,
} from "@/services/statistics.service";
import { StatisticsDashboard } from "@/components/admin/statistics/StatisticsDashboard";
import type { StatisticsBundle } from "@/types/frontend/statistics";

export const metadata: Metadata = {
  title: "Thống kê & Phân tích | MBL Admin",
};

export default async function AdminStatisticsPage() {
  const now = new Date();
  const from = startOfMonth(now);
  const to = endOfDay(now);

  const [overview, bookings, revenue, status, locations] = await Promise.all([
    getOverviewStats({ from, to }),
    getBookingsTimeSeries("day", { from, to }),
    getRevenueTimeSeries("day", { from, to }),
    getStatusBreakdown({ from, to }),
    getTopLocations({ from, to }),
  ]);

  const initialData: StatisticsBundle = {
    overview,
    bookings,
    revenue,
    status,
    locations,
  };

  return (
    <StatisticsDashboard
      initialRange={{
        from: from.toISOString(),
        to: to.toISOString(),
        groupBy: "day",
      }}
      initialData={initialData}
    />
  );
}
