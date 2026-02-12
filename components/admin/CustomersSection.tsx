// components/admin/CustomersSection.tsx
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

interface CustomerItem {
  _id: string;
  phone: string;
  email?: string;
  fullName?: string;
  lastBookingAt?: string;
  createdAt: string;
  contactStatus?: "pending" | "contacted";
  contactedAt?: string | null;
  totalBookings?: number;
  totalGuests?: number;
  totalSpent?: number;
  lastBookingDateISO?: string;
  lastBookingTimeSlot?: string;
  lastBookingLocation?: string;
  lastBookingStatus?: string;
}

interface CustomerListResponse {
  ok: boolean;
  items: CustomerItem[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const LIMIT = 15;

export function CustomersSection() {
  const router = useRouter();
  const [data, setData] = useState<CustomerListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("latest");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const headers = authHeader();
      if (!headers.Authorization) {
        setError("Vui lòng đăng nhập lại để xem danh sách khách hàng");
        setLoading(false);
        return;
      }
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(LIMIT));
      if (searchQuery) params.set("q", searchQuery);
      params.set("sort", sortOrder);

      const res = await api<CustomerListResponse>(
        `/api/admin/customers?${params.toString()}`,
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
  }, [page, searchQuery, sortOrder, router]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  const formatDateTime = (dateISO?: string, timeSlot?: string) => {
    if (!dateISO) return "—";
    const dt = new Date(dateISO);
    if (Number.isNaN(dt.getTime())) return dateISO;
    const dateLabel = dt.toLocaleDateString("vi-VN");
    return `${dateLabel}${timeSlot ? ` @ ${timeSlot}` : ""}`;
  };

  const formatCurrency = (value?: number) => {
    if (typeof value !== "number" || Number.isNaN(value)) return "—";
    return value.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
  };

  const toggleContactStatus = useCallback(
    async (customer: CustomerItem) => {
      const nextStatus = customer.contactStatus === "contacted" ? "pending" : "contacted";
      setUpdatingId(customer._id);
      try {
        const headers = authHeader();
        if (!headers.Authorization) {
          setError("Phiên đăng nhập đã hết hạn");
          setUpdatingId(null);
          return;
        }
        await api(`/api/admin/customers/${customer._id}`, {
          method: "PATCH",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ contactStatus: nextStatus }),
        });
        await loadCustomers();
      } catch (err: any) {
        if (err?.status === 401) {
          clearToken();
          router.replace("/admin/login");
          setError("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
          return;
        }
        setError(err?.message || "Không thể cập nhật trạng thái khách hàng");
      } finally {
        setUpdatingId(null);
      }
    },
    [loadCustomers, router]
  );

  const deleteCustomer = useCallback(
    async (customer: CustomerItem) => {
      const totalBookings = customer.totalBookings || 0;
      const confirmMsg = totalBookings
        ? `Xoá khách hàng này và ${totalBookings} đơn liên quan?`
        : "Xoá khách hàng này?";
      if (!window.confirm(confirmMsg)) return;

      setUpdatingId(customer._id);
      try {
        const headers = authHeader();
        if (!headers.Authorization) {
          setError("Phiên đăng nhập đã hết hạn");
          setUpdatingId(null);
          return;
        }
        await api(`/api/admin/customers/${customer._id}`, {
          method: "DELETE",
          headers,
        });
        await loadCustomers();
      } catch (err: any) {
        if (err?.status === 401) {
          clearToken();
          router.replace("/admin/login");
          setError("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
          return;
        }
        setError(err?.message || "Không thể xoá khách hàng");
      } finally {
        setUpdatingId(null);
      }
    },
    [loadCustomers, router]
  );

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="backdrop-blur-md bg-white/30 rounded-xl border border-white/40 p-4 shadow-lg">
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder="Tìm theo phone, email, tên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/50 border-white/40 backdrop-blur-sm"
            />
            <Select value={sortOrder} onValueChange={(value) => {
              setSortOrder(value);
              setPage(1);
            }}>
              <SelectTrigger className="bg-white/50 border-white/40 backdrop-blur-sm">
                <SelectValue placeholder="Sắp xếp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Đặt bay gần nhất</SelectItem>
                <SelectItem value="oldest">Đặt bay lâu nhất</SelectItem>
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
        <div className="text-center py-8 text-slate-500">Không có khách hàng</div>
      ) : (
        <>
          <div className="backdrop-blur-md bg-white/30 rounded-xl border border-white/40 overflow-hidden shadow-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-white/20 hover:bg-white/20">
                  <TableHead className="font-semibold">Số điện thoại</TableHead>
                  <TableHead className="font-semibold">Khách hàng</TableHead>
                  <TableHead className="font-semibold">Thống kê</TableHead>
                  <TableHead className="font-semibold">Lần đặt gần nhất</TableHead>
                  <TableHead className="font-semibold">Liên hệ</TableHead>
                  <TableHead className="font-semibold text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((customer) => (
                  <TableRow key={customer._id} className="hover:bg-white/10">
                    <TableCell className="text-sm">
                      <div className="font-mono font-semibold text-base">{customer.phone}</div>
                      <div className="text-xs text-slate-600">{customer.email || "—"}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium text-slate-800">{customer.fullName || "—"}</div>
                      <div className="text-xs text-slate-500">Tham gia: {formatDate(customer.createdAt)}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex flex-wrap gap-4">
                        <span className="text-slate-700">Đơn: {customer.totalBookings || 0}</span>
                        <span className="text-slate-700">Khách: {customer.totalGuests || 0}</span>
                        <span className="font-semibold text-emerald-700">
                          {formatCurrency(customer.totalSpent)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {customer.lastBookingDateISO ? (
                        <div className="space-y-1">
                          <div className="font-semibold text-slate-800">
                            {formatDateTime(customer.lastBookingDateISO, customer.lastBookingTimeSlot)}
                          </div>
                          <div className="text-xs text-slate-500">
                            {customer.lastBookingLocation || "—"}
                          </div>
                          {customer.lastBookingStatus && (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                customer.lastBookingStatus === "confirmed"
                                  ? "bg-green-100 text-green-700"
                                  : customer.lastBookingStatus === "cancelled"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {customer.lastBookingStatus === "confirmed"
                                ? "Đã xác nhận"
                                : customer.lastBookingStatus === "cancelled"
                                  ? "Đã hủy"
                                  : "Chờ xử lý"}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500">Chưa có đơn</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          customer.contactStatus === "contacted"
                            ? "bg-teal-100 text-teal-700"
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {customer.contactStatus === "contacted" ? "Đã liên hệ" : "Chưa liên hệ"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updatingId === customer._id}
                          onClick={() => toggleContactStatus(customer)}
                        >
                          {customer.contactStatus === "contacted" ? "Đặt lại chờ" : "Đánh dấu đã liên hệ"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={updatingId === customer._id}
                          onClick={() => deleteCustomer(customer)}
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
                Trang {data.page} của {data.pages} | Tổng: {data.total} khách
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
