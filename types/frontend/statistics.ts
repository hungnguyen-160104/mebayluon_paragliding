export type GroupByOption = "day" | "month" | "year";

export type OverviewStats = {
  totalCustomers: number;
  totalBookings: number;
  completedBookings: number;
  pendingBookings: number;
  totalRevenue: number;
  averageRevenuePerBooking: number;
};

export type SeriesResponse = {
  labels: string[];
  data: number[];
};

export type StatusBreakdown = {
  pending: number;
  confirmed: number;
  completed: number;
};

export type TopLocation = {
  location: string;
  bookings: number;
  revenue: number;
};

export type StatisticsBundle = {
  overview: OverviewStats;
  bookings: SeriesResponse;
  revenue: SeriesResponse;
  status: StatusBreakdown;
  locations: TopLocation[];
};
