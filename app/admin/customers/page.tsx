// app/admin/customers/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

interface CustomerItem {
  _id: string;
  phone: string;
  email?: string;
  fullName?: string;
  lastBookingAt?: string;
  createdAt: string;
}

interface CustomerListResponse {
  ok: boolean;
  items: CustomerItem[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const LIMIT = 20;

export default function AdminCustomersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<CustomerListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pageFromUrl = Number(searchParams.get("page") || "1");
  const [page, setPage] = useState(pageFromUrl);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "latest");

  // Sync page to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    if (searchQuery) params.set("q", searchQuery);
    if (sortBy !== "latest") params.set("sort", sortBy);

    const queryStr = params.toString();
    router.replace(`/admin/customers${queryStr ? "?" + queryStr : ""}`);
  }, [page, searchQuery, sortBy, router]);

  // Load customers
  const loadCustomers = useCallback(async () => {
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
      if (sortBy) params.set("sort", sortBy);

      const res = await api<CustomerListResponse>(
        `/api/admin/customers?${params.toString()}`,
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
      setError(err?.message || "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, sortBy, router]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    setPage(1);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Khách Hàng</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Tìm theo phone, email, tên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger>
                <SelectValue />
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-500">Đang tải...</div>
      ) : !data || data.items.length === 0 ? (
        <div className="text-center py-12 text-slate-500">Không có khách hàng</div>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="font-semibold">Số điện thoại</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">Họ và tên</TableHead>
                  <TableHead className="font-semibold">Đặt bay gần nhất</TableHead>
                  <TableHead className="font-semibold">Ngày tạo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((customer) => (
                  <TableRow key={customer._id} className="hover:bg-slate-50">
                    <TableCell className="text-sm font-mono font-semibold text-slate-900">
                      {customer.phone}
                    </TableCell>
                    <TableCell className="text-sm text-slate-700">
                      {customer.email || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-slate-700">
                      {customer.fullName || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {customer.lastBookingAt ? formatDateTime(customer.lastBookingAt) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {formatDate(customer.createdAt)}
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
                Trang {data.page} của {data.pages} | Tổng: {data.total} khách hàng
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
