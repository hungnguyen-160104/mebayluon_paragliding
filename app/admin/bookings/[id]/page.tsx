// app/admin/bookings/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { authHeader, getToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BookingDetail {
  _id: string;
  customerId: {
    _id: string;
    phone: string;
    email?: string;
    fullName?: string;
    lastBookingAt?: string;
    createdAt: string;
  };
  location: string;
  locationName?: string;
  dateISO?: string;
  timeSlot?: string;
  guestsCount?: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  contact?: {
    phone?: string;
    email?: string;
    pickupLocation?: string;
    specialRequest?: string;
  };
  guests?: Array<{
    fullName?: string;
    dob?: string;
    gender?: string;
    idNumber?: string;
    weightKg?: number;
    nationality?: string;
  }>;
  price?: {
    currency?: string;
    total?: number;
  };
}

export default function BookingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusValue, setStatusValue] = useState("");
  const [saving, setSaving] = useState(false);

  // Load booking detail
  useEffect(() => {
    if (!getToken()) {
      router.replace("/admin/login");
      return;
    }

    const loadBooking = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await api<{ ok: boolean; booking: BookingDetail }>(
          `/api/admin/bookings/${id}`,
          { headers: authHeader() }
        );

        setBooking(res.booking);
        setStatusValue(res.booking.status);
      } catch (err: any) {
        setError(err?.message || "Failed to load booking");
      } finally {
        setLoading(false);
      }
    };

    loadBooking();
  }, [id, router]);

  const handleStatusChange = async (newStatus: string) => {
    if (!booking || newStatus === booking.status) return;

    setSaving(true);
    setError(null);

    try {
      const res = await api<{ ok: boolean; booking: BookingDetail }>(
        `/api/admin/bookings/${id}`,
        {
          method: "PATCH",
          headers: authHeader(),
          body: JSON.stringify({ status: newStatus }),
        }
      );

      setBooking(res.booking);
      setStatusValue(res.booking.status);
    } catch (err: any) {
      setError(err?.message || "Failed to update booking");
      setStatusValue(booking.status);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatMoney = (num?: number, currency?: string) => {
    if (typeof num !== "number") return "—";
    const c = (currency || "VND").toUpperCase();
    if (c === "USD") {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
    }
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Đang tải...</div>;
  }

  if (error && !booking) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
        <Link href="/admin/bookings">
          <Button variant="outline">← Quay lại</Button>
        </Link>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="space-y-4">
        <div className="text-center py-12 text-slate-500">Không tìm thấy đơn</div>
        <Link href="/admin/bookings">
          <Button variant="outline">← Quay lại</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Chi Tiết Đơn Đặt Bay</h1>
          <p className="text-sm text-slate-500 mt-1">Booking ID: {booking._id}</p>
        </div>
        <Link href="/admin/bookings">
          <Button variant="outline">← Quay lại</Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
      )}

      {/* Status Update */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold mb-4 text-slate-900">Trạng thái</h2>
        <div className="flex items-center gap-4">
          <Select value={statusValue} onValueChange={handleStatusChange} disabled={saving}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Chờ xử lý</SelectItem>
              <SelectItem value="confirmed">Xác nhận</SelectItem>
              <SelectItem value="cancelled">Hủy</SelectItem>
            </SelectContent>
          </Select>
          {saving && <span className="text-sm text-slate-500">Đang lưu...</span>}
        </div>
      </div>

      {/* Customer Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold mb-4 text-slate-900">Thông Tin Khách Hàng</h2>
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium text-slate-600">Họ và tên</div>
              <div className="text-slate-900">{booking.customerId.fullName || "—"}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-600">Điện thoại</div>
              <div className="text-slate-900 font-mono">{booking.customerId.phone}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-600">Email</div>
              <div className="text-slate-900">{booking.customerId.email || "—"}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-600">Ngày tạo</div>
              <div className="text-slate-900">{formatDate(booking.customerId.createdAt)}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-600">Lần đặt gần nhất</div>
              <div className="text-slate-900">
                {booking.customerId.lastBookingAt
                  ? formatDate(booking.customerId.lastBookingAt)
                  : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold mb-4 text-slate-900">Thông Tin Liên Hệ</h2>
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium text-slate-600">Số điện thoại</div>
              <div className="text-slate-900">{booking.contact?.phone || "—"}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-600">Email</div>
              <div className="text-slate-900">{booking.contact?.email || "—"}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-600">Điểm đón</div>
              <div className="text-slate-900">{booking.contact?.pickupLocation || "—"}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-600">Yêu cầu đặc biệt</div>
              <div className="text-slate-900">{booking.contact?.specialRequest || "—"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Info */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold mb-4 text-slate-900">Thông Tin Đặt Bay</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <div className="text-sm font-medium text-slate-600">Địa điểm</div>
            <div className="text-slate-900 font-semibold">{booking.locationName}</div>
            <div className="text-xs text-slate-500">({booking.location})</div>
          </div>
          <div>
            <div className="text-sm font-medium text-slate-600">Ngày bay</div>
            <div className="text-slate-900 font-semibold">{booking.dateISO || "—"}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-slate-600">Giờ bay</div>
            <div className="text-slate-900 font-semibold">{booking.timeSlot || "—"}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-slate-600">Số khách</div>
            <div className="text-slate-900 font-semibold">{booking.guestsCount || 1}</div>
          </div>
        </div>
      </div>

      {/* Guests */}
      {booking.guests && booking.guests.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold mb-4 text-slate-900">Danh Sách Khách</h2>
          <div className="space-y-3">
            {booking.guests.map((guest, idx) => (
              <div key={idx} className="border-t pt-3 first:border-0 first:pt-0">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-slate-600">Họ tên</div>
                    <div className="text-slate-900">{guest.fullName || "—"}</div>
                  </div>
                  <div>
                    <div className="font-medium text-slate-600">Ngày sinh</div>
                    <div className="text-slate-900">{guest.dob || "—"}</div>
                  </div>
                  <div>
                    <div className="font-medium text-slate-600">Giới tính</div>
                    <div className="text-slate-900">{guest.gender || "—"}</div>
                  </div>
                  <div>
                    <div className="font-medium text-slate-600">CMND/ID</div>
                    <div className="text-slate-900 font-mono">{guest.idNumber || "—"}</div>
                  </div>
                  <div>
                    <div className="font-medium text-slate-600">Cân nặng</div>
                    <div className="text-slate-900">{guest.weightKg ? `${guest.weightKg}kg` : "—"}</div>
                  </div>
                  <div>
                    <div className="font-medium text-slate-600">Quốc tịch</div>
                    <div className="text-slate-900">{guest.nationality || "—"}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pricing */}
      {booking.price && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold mb-4 text-slate-900">Chi Phí</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Loại tiền</span>
              <span className="font-medium text-slate-900">{booking.price.currency || "VND"}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-slate-600 font-semibold">Tổng</span>
              <span className="font-semibold text-emerald-600">
                {formatMoney(booking.price.total, booking.price.currency)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="bg-slate-50 rounded-lg p-6 text-sm text-slate-600">
        <div className="flex justify-between mb-2">
          <span>Tạo lúc:</span>
          <span className="font-mono">{formatDate(booking.createdAt)}</span>
        </div>
        <div className="flex justify-between">
          <span>Cập nhật lúc:</span>
          <span className="font-mono">{formatDate(booking.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
}
