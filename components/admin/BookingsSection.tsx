// components/admin/BookingsSection.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { authHeader, clearToken } from "@/lib/auth";
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

type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

interface BookingItem {
  _id: string;
  customerId: string;
  location: string;
  locationName?: string;
  dateISO?: string;
  timeSlot?: string;
  guestsCount?: number;
  status: BookingStatus;
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

const STATUS_META: Record<BookingStatus, { label: string; className: string }> = {
  pending: { label: "Chờ xử lý", className: "bg-amber-100 text-amber-800 border-amber-200" },
  confirmed: { label: "Đã xác nhận", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  completed: { label: "Đã hoàn thành", className: "bg-blue-100 text-blue-800 border-blue-200" },
  cancelled: { label: "Đã hủy", className: "bg-rose-100 text-rose-800 border-rose-200" },
};

function StatusBadge({ status }: { status: BookingStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

const LIMIT = 15;

export function BookingsSection() {
  const router = useRouter();
  const [data, setData] = useState<BookingListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const headers = authHeader();
      if (!headers.Authorization) {
        setError("Vui lòng đăng nhập lại để xem danh sách đặt bay");
        return;
      }
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(LIMIT));
      if (searchQuery) params.set("q", searchQuery);
      if (statusFilter) params.set("status", statusFilter);

      const res = await api<BookingListResponse>(
        `/api/admin/bookings?${params.toString()}`,
        { headers }
      );

      setData(res);
    } catch (err: any) {
      if (err?.status === 401) {
        clearToken();
        router.replace("/admin/login");
        setError("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
        return;
      }
      setError(err?.message || "Không thể tải danh sách");
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  const updateStatus = useCallback(
    async (bookingId: string, nextStatus: BookingStatus) => {
      setUpdatingId(bookingId);
      try {
        const headers = authHeader();
        if (!headers.Authorization) {
          setError("Phiên đăng nhập đã hết hạn");
          setUpdatingId(null);
          return;
        }
        await api(`/api/admin/bookings/${bookingId}`, {
          method: "PATCH",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        });
        await loadBookings();
      } catch (err: any) {
        if (err?.status === 401) {
          clearToken();
          router.replace("/admin/login");
          setError("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
          return;
        }
        setError(err?.message || "Không thể cập nhật trạng thái");
      } finally {
        setUpdatingId(null);
      }
    },
    [loadBookings, router]
  );

  const deleteBooking = useCallback(
    async (bookingId: string) => {
      if (!window.confirm("Bạn chắc chắn muốn xoá đơn đặt bay này?")) return;
      setUpdatingId(bookingId);
      try {
        const headers = authHeader();
        if (!headers.Authorization) {
          setError("Phiên đăng nhập đã hết hạn");
          setUpdatingId(null);
          return;
        }
        await api(`/api/admin/bookings/${bookingId}`, {
          method: "DELETE",
          headers,
        });
        await loadBookings();
      } catch (err: any) {
        if (err?.status === 401) {
          clearToken();
          router.replace("/admin/login");
          setError("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
          return;
        }
        setError(err?.message || "Không thể xoá đơn");
      } finally {
        setUpdatingId(null);
      }
    },
    [loadBookings, router]
  );

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="backdrop-blur-md bg-white/30 rounded-xl border border-white/40 p-4 shadow-lg">
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder="Tìm theo phone, email, địa điểm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/50 border-white/40 backdrop-blur-sm"
            />
            <Select value={statusFilter || "all"} onValueChange={(value) => {
              setStatusFilter(value === "all" ? "" : value);
              setPage(1);
            }}>
              <SelectTrigger className="bg-white/50 border-white/40 backdrop-blur-sm">
                <SelectValue placeholder="Tất cả trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="pending">Chờ xử lý</SelectItem>
                <SelectItem value="confirmed">Đã xác nhận</SelectItem>
                <SelectItem value="completed">Đã hoàn thành</SelectItem>
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
        <div className="bg-red-50/80 backdrop-blur-sm border border-red-200/40 rounded-xl p-4 text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-slate-500">Đang tải...</div>
      ) : !data || data.items.length === 0 ? (
        <div className="text-center py-8 text-slate-500">Không có đơn đặt bay</div>
      ) : (
        <>
          <div className="backdrop-blur-md bg-white/30 rounded-xl border border-white/40 overflow-hidden shadow-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-white/20 hover:bg-white/20">
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
                  <TableRow key={booking._id} className="hover:bg-white/10">
                    <TableCell className="text-sm">{formatDate(booking.createdAt)}</TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{booking.contact?.phone || "—"}</div>
                      <div className="text-xs text-slate-600">{booking.contact?.email || "—"}</div>
                    </TableCell>
                    <TableCell className="text-sm">{booking.locationName || booking.location}</TableCell>
                    <TableCell className="text-sm">
                      {booking.dateISO} {booking.timeSlot ? `@ ${booking.timeSlot}` : ""}
                    </TableCell>
                    <TableCell className="text-sm text-center">{booking.guestsCount || 1}</TableCell>
                    <TableCell className="text-sm">
                      <StatusBadge status={booking.status} />
                    </TableCell>
                    <TableCell className="text-sm text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {booking.status !== "confirmed" && booking.status !== "completed" && (
                          <Button
                            size="sm"
                            className="bg-emerald-500 hover:bg-emerald-600"
                            disabled={updatingId === booking._id}
                            onClick={() => updateStatus(booking._id, "confirmed")}
                          >
                            Xác nhận
                          </Button>
                        )}
                        {booking.status === "confirmed" && (
                          <Button
                            size="sm"
                            className="bg-blue-500 hover:bg-blue-600"
                            disabled={updatingId === booking._id}
                            onClick={() => updateStatus(booking._id, "completed")}
                          >
                            Hoàn thành
                          </Button>
                        )}
                        {booking.status !== "cancelled" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={updatingId === booking._id}
                            onClick={() => updateStatus(booking._id, "cancelled")}
                          >
                            Hủy
                          </Button>
                        )}
                        {booking.status !== "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updatingId === booking._id}
                            onClick={() => updateStatus(booking._id, "pending")}
                          >
                            Đặt lại chờ
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={updatingId === booking._id}
                          onClick={() => deleteBooking(booking._id)}
                        >
                          Xoá
                        </Button>
                      </div>
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
