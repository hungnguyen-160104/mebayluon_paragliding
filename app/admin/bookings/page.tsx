// app/admin/bookings/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { authHeader, getToken, clearToken } from "@/lib/auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BookingItem {
  _id: string;
  customerId: string;
  location: string;
  locationName?: string;
  dateISO?: string;
  timeSlot?: string;
  guestsCount?: number;
  status: string;
  createdAt: string;
  contact?: {
    phone?: string;
    email?: string;
  };
}

interface BookingListResponse {
  ok: boolean;
  items: BookingItem[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const LIMIT = 20;

export default function AdminBookingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<BookingListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pageFromUrl = Number(searchParams.get("page") || "1");
  const [page, setPage] = useState(pageFromUrl);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");

  // Sync page to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    if (searchQuery) params.set("q", searchQuery);
    if (statusFilter) params.set("status", statusFilter);

    const queryStr = params.toString();
    router.replace(`/admin/bookings${queryStr ? "?" + queryStr : ""}`);
  }, [page, searchQuery, statusFilter, router]);

  // Load bookings
  const loadBookings = useCallback(async () => {
    if (!getToken()) {
      router.replace("/admin/login");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(LIMIT));
      if (searchQuery) params.set("q", searchQuery);
      if (statusFilter) params.set("status", statusFilter);

      const res = await api<BookingListResponse>(
        `/api/admin/bookings?${params.toString()}`,
        { headers: authHeader() }
      );

      setData(res);
    } catch (err: any) {
      if (err?.status === 401) {
        clearToken();
        setError("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
        router.replace("/admin/login");
        return;
      }
      setError(err?.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, statusFilter, router]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value === "all" ? "" : value);
    setPage(1);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Đơn Đặt Bay</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Tìm theo phone, email, địa điểm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select value={statusFilter || "all"} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="Tất cả trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="pending">Chờ xử lý</SelectItem>
                <SelectItem value="confirmed">Xác nhận</SelectItem>
                <SelectItem value="cancelled">Hủy</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
              Tìm kiếm
            </Button>
          </div>
        </form>
      </div>

      {/* Results */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-500">Đang tải...</div>
      ) : !data || data.items.length === 0 ? (
        <div className="text-center py-12 text-slate-500">Không có đơn đặt bay</div>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="font-semibold">Thời gian</TableHead>
                  <TableHead className="font-semibold">Khách hàng</TableHead>
                  <TableHead className="font-semibold">Địa điểm</TableHead>
                  <TableHead className="font-semibold">Ngày bay</TableHead>
                  <TableHead className="font-semibold">Số khách</TableHead>
                  <TableHead className="font-semibold">Trạng thái</TableHead>
                  <TableHead className="font-semibold text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((booking) => (
                  <TableRow key={booking._id} className="hover:bg-slate-50">
                    <TableCell className="text-sm text-slate-600">
                      {formatDate(booking.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium text-slate-900">
                        {booking.contact?.phone || "—"}
                      </div>
                      <div className="text-xs text-slate-500">{booking.contact?.email || "—"}</div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-700">
                      {booking.locationName || booking.location}
                    </TableCell>
                    <TableCell className="text-sm text-slate-700">
                      {booking.dateISO} {booking.timeSlot ? `@ ${booking.timeSlot}` : ""}
                    </TableCell>
                    <TableCell className="text-sm text-slate-700 text-center">
                      {booking.guestsCount || 1}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          booking.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : booking.status === "confirmed"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {booking.status === "pending"
                          ? "Chờ xử lý"
                          : booking.status === "confirmed"
                            ? "Xác nhận"
                            : "Hủy"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/bookings/${booking._id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          Xem chi tiết
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {data.pages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Trang {data.page} của {data.pages} | Tổng: {data.total} đơn
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage(Math.max(1, page - 1))}
                >
                  ← Trước
                </Button>
                <Button
                  variant="outline"
                  disabled={page >= data.pages}
                  onClick={() => setPage(Math.min(data.pages, page + 1))}
                >
                  Tiếp →
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
