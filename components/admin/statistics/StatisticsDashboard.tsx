"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { subDays, startOfMonth, startOfYear, startOfDay, endOfDay } from "date-fns";
import { Users, Plane, CheckCircle2, Clock, DollarSign, TrendingUp } from "lucide-react";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { StatisticsBundle, OverviewStats, SeriesResponse, StatusBreakdown, TopLocation, GroupByOption } from "@/types/frontend/statistics";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const currency = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const numberFormat = new Intl.NumberFormat("vi-VN");

export type FilterState = {
  from: string;
  to: string;
  groupBy: GroupByOption;
};

type Props = {
  initialRange: FilterState;
  initialData: StatisticsBundle;
};

export async function fetchStatisticsBundle(state: FilterState): Promise<StatisticsBundle> {
  const rangeParams = new URLSearchParams();
  if (state.from) rangeParams.set("from", state.from);
  if (state.to) rangeParams.set("to", state.to);

  const bookingsParams = new URLSearchParams(rangeParams);
  bookingsParams.set("groupBy", state.groupBy);

  const revenueParams = new URLSearchParams(rangeParams);
  revenueParams.set("groupBy", state.groupBy);

  const fetchJson = async <T,>(url: string): Promise<T> => {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(await res.text());
    }
    return res.json();
  };

  const [overview, bookings, revenue, status, locations] = await Promise.all([
    fetchJson<OverviewStats>(`/api/stats/overview?${rangeParams.toString()}`),
    fetchJson<SeriesResponse>(`/api/stats/bookings?${bookingsParams.toString()}`),
    fetchJson<SeriesResponse>(`/api/stats/revenue?${revenueParams.toString()}`),
    fetchJson<StatusBreakdown>(`/api/stats/status?${rangeParams.toString()}`),
    fetchJson<TopLocation[]>(`/api/stats/top-locations?${rangeParams.toString()}`),
  ]);

  return { overview, bookings, revenue, status, locations };
}

export function StatisticsDashboard({ initialRange, initialData }: Props) {
  const [filters, setFilters] = useState<FilterState>(initialRange);
  const [data, setData] = useState<StatisticsBundle>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const didMountRef = useRef(false);

  const handleRangeChange = (partial: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  };

  const handleQuickPreset = (preset: "today" | "week" | "month" | "year") => {
    const now = new Date();
    let fromDate = startOfMonth(now);
    if (preset === "today") fromDate = startOfDay(now);
    if (preset === "week") fromDate = startOfDay(subDays(now, 6));
    if (preset === "month") fromDate = startOfMonth(now);
    if (preset === "year") fromDate = startOfYear(now);
    const nextGroupBy: GroupByOption = preset === "year" ? "month" : "day";
    handleRangeChange({
      from: fromDate.toISOString(),
      to: endOfDay(now).toISOString(),
      groupBy: nextGroupBy,
    });
  };

  const fetchStats = useCallback((state: FilterState) => fetchStatisticsBundle(state), []);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    setLoading(true);
    setError(null);
    fetchStats(filters)
      .then((next) => setData(next))
      .catch((err) => {
        console.error(err);
        setError("Không thể tải dữ liệu thống kê");
      })
      .finally(() => setLoading(false));
  }, [filters, fetchStats]);

  const bookingSeriesData = useMemo(
    () => data.bookings.labels.map((label, index) => ({ label, value: data.bookings.data[index] ?? 0 })),
    [data.bookings],
  );

  const revenueSeriesData = useMemo(
    () => data.revenue.labels.map((label, index) => ({ label, value: data.revenue.data[index] ?? 0 })),
    [data.revenue],
  );

  const statusData = useMemo(
    () => [
      { label: "Chờ xử lý", value: data.status.pending, key: "pending", color: "#fcd34d" },
      { label: "Đã xác nhận", value: data.status.confirmed, key: "confirmed", color: "#38bdf8" },
      { label: "Hoàn thành", value: data.status.completed, key: "completed", color: "#34d399" },
    ],
    [data.status],
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-slate-900">Thống kê & Phân tích</h1>
        <p className="text-slate-600">Theo dõi hiệu suất kinh doanh theo ngày, tháng và năm.</p>
      </header>

      <Card className="backdrop-blur-xl bg-white/40 border-white/60 shadow-2xl">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="text-lg">Bộ lọc thời gian</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => handleQuickPreset("today")}>Hôm nay</Button>
              <Button variant="secondary" size="sm" onClick={() => handleQuickPreset("week")}>7 ngày qua</Button>
              <Button variant="secondary" size="sm" onClick={() => handleQuickPreset("month")}>Tháng này</Button>
              <Button variant="secondary" size="sm" onClick={() => handleQuickPreset("year")}>Năm nay</Button>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <p className="text-xs uppercase text-slate-500">Nhóm theo</p>
              <Select value={filters.groupBy} onValueChange={(value: GroupByOption) => handleRangeChange({ groupBy: value })}>
                <SelectTrigger className="bg-white/70 border-white/60">
                  <SelectValue placeholder="Chọn" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Ngày</SelectItem>
                  <SelectItem value="month">Tháng</SelectItem>
                  <SelectItem value="year">Năm</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase text-slate-500">Từ ngày</p>
              <input
                type="date"
                value={filters.from.slice(0, 10)}
                onChange={(e) => {
                  if (!e.target.value) return;
                  const iso = startOfDay(new Date(e.target.value)).toISOString();
                  handleRangeChange({ from: iso });
                }}
                className="w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm shadow-sm"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase text-slate-500">Đến ngày</p>
              <input
                type="date"
                value={filters.to.slice(0, 10)}
                onChange={(e) => {
                  if (!e.target.value) return;
                  const iso = endOfDay(new Date(e.target.value)).toISOString();
                  handleRangeChange({ to: iso });
                }}
                className="w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm shadow-sm"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {error && <p className="rounded-2xl border border-red-200 bg-red-50/80 p-4 text-red-700">{error}</p>}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <KpiCard icon={Users} label="Tổng khách hàng" value={data.overview.totalCustomers} loading={loading} />
        <KpiCard icon={Plane} label="Tổng lượt đặt" value={data.overview.totalBookings} loading={loading} />
        <KpiCard icon={CheckCircle2} label="Hoàn thành" value={data.overview.completedBookings} loading={loading} />
        <KpiCard icon={Clock} label="Đang chờ" value={data.overview.pendingBookings} loading={loading} />
        <KpiCard icon={DollarSign} label="Doanh thu" value={currency.format(data.overview.totalRevenue)} loading={loading} highlight />
        <KpiCard icon={TrendingUp} label="Doanh thu / đơn" value={currency.format(data.overview.averageRevenuePerBooking)} loading={loading} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="backdrop-blur-xl bg-white/40 border-white/60 shadow-xl">
          <CardHeader>
            <CardTitle>Số lượng đặt bay</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full rounded-2xl" />
            ) : (
              <ChartContainer
                config={{ value: { label: "Lượt đặt", color: "hsl(160, 84%, 39%)" } }}
                className="h-72"
              >
                <BarChart data={bookingSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <Bar dataKey="value" fill="var(--color-value)" radius={[6, 6, 0, 0]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/40 border-white/60 shadow-xl">
          <CardHeader>
            <CardTitle>Doanh thu</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full rounded-2xl" />
            ) : (
              <ChartContainer
                config={{ revenue: { label: "Doanh thu", color: "hsl(215, 85%, 45%)" } }}
                className="h-72"
              >
                <LineChart data={revenueSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(value) => `${Math.round(value / 1_000_000)}tr`} tickLine={false} axisLine={false} />
                  <Line type="monotone" dataKey="value" stroke="var(--color-revenue)" strokeWidth={3} dot={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="backdrop-blur-xl bg-white/40 border-white/60 shadow-xl">
          <CardHeader>
            <CardTitle>Tỷ lệ trạng thái</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {loading ? (
              <Skeleton className="h-64 w-full rounded-2xl" />
            ) : (
              <ChartContainer config={{}} className="h-72">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="label" innerRadius={60} strokeWidth={4}>
                    {statusData.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/40 border-white/60 shadow-xl">
          <CardHeader>
            <CardTitle>Top địa điểm</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <Skeleton key={idx} className="h-14 w-full rounded-2xl" />
                ))}
              </div>
            ) : data.locations.length === 0 ? (
              <p className="text-sm text-slate-500">Chưa có dữ liệu cho khoảng thời gian này.</p>
            ) : (
              <ul className="space-y-3">
                {data.locations.map((loc) => (
                  <li
                    key={loc.location}
                    className="flex items-center justify-between rounded-2xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{loc.location}</p>
                      <p className="text-sm text-slate-500">{numberFormat.format(loc.bookings)} lượt đặt</p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600">{currency.format(loc.revenue)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

type KpiProps = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  loading?: boolean;
  highlight?: boolean;
};

function KpiCard({ icon: Icon, label, value, loading, highlight }: KpiProps) {
  return (
    <Card className={`backdrop-blur-xl border border-white/60 shadow-xl ${highlight ? "bg-linear-to-br from-emerald-500/80 via-emerald-400/70 to-emerald-600/80 text-white" : "bg-white/40"}`}>
      <CardContent className="flex items-start gap-4 p-6">
        <div className={`rounded-2xl p-3 ${highlight ? "bg-white/20" : "bg-emerald-50 text-emerald-600"}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className={`text-sm font-medium ${highlight ? "text-white/80" : "text-slate-500"}`}>{label}</p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-32" />
          ) : (
            <p className={`text-2xl font-bold ${highlight ? "text-white" : "text-slate-900"}`}>
              {typeof value === "number" ? numberFormat.format(value) : value}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
