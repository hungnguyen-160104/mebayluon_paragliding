// app/baocao/components/AgencySummaryCard.tsx
"use client";

/**
 * TỔNG HỢP KHÁCH THEO ĐẠI LÝ — thẻ của trang kế toán.
 *
 * Cuối tháng kế toán quyết toán với Klook / Agoda / BlueHome / SEEK / GYG…:
 * đại lý trả tiền phần khách ĐÃ BAY, khách huỷ trừ ra, khách đổi lịch rơi
 * sang tháng khác. Thẻ này: chọn tháng → thấy bảng tổng từng đại lý (book,
 * khách, bay/huỷ/đổi lịch, tiền đại lý đang giữ) → bấm vào một đại lý để dò
 * từng booking một khi số hai bên vênh nhau.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import { formatDateKeyVN, todayInVN } from "@/lib/baobay/date";
import { formatVND } from "@/lib/pricing";
import type { AgencyBookingDTO } from "@/services/baobay-agency.service";

import { apiGet } from "./client-api";
import { Banner, CollapseCard } from "./ui";

type AgencyStat = {
  agency: string;
  bookings: number;
  guests: number;
  flownBookings: number;
  flownGuests: number;
  cancelledBookings: number;
  rescheduled: number;
  /** Tiền đại lý giữ của booking ĐÃ BAY — số đòi khi quyết toán. */
  agencyHeldFlown: number;
  /** Tiền đại lý giữ của booking HUỶ — nhắc để hai bên thống nhất cách xử. */
  agencyHeldCancelled: number;
};

export function AgencySummaryCard() {
  const [month, setMonth] = useState(todayInVN().slice(0, 7));
  const [rows, setRows] = useState<AgencyBookingDTO[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await apiGet<{ rows: AgencyBookingDTO[] }>(`/api/baocao/agency?month=${month}`);
      setRows(r.rows);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không tải được bảng đại lý");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  /** Đổi tháng thì bỏ chọn đại lý — danh sách đại lý của tháng mới có thể khác hẳn. */
  useEffect(() => {
    setPicked(null);
  }, [month]);

  const stats = useMemo<AgencyStat[]>(() => {
    const map = new Map<string, AgencyStat>();
    for (const b of rows) {
      let s = map.get(b.agency);
      if (!s) {
        s = {
          agency: b.agency,
          bookings: 0,
          guests: 0,
          flownBookings: 0,
          flownGuests: 0,
          cancelledBookings: 0,
          rescheduled: 0,
          agencyHeldFlown: 0,
          agencyHeldCancelled: 0,
        };
        map.set(b.agency, s);
      }
      s.bookings += 1;
      s.guests += b.guestCount;
      if (b.status === "done") {
        s.flownBookings += 1;
        s.flownGuests += b.guestCount;
        s.agencyHeldFlown += b.agencyPaidAmount;
      }
      if (b.status === "cancelled") {
        s.cancelledBookings += 1;
        s.agencyHeldCancelled += b.agencyPaidAmount;
      }
      if (b.rescheduledFrom.length > 0) s.rescheduled += 1;
    }
    return [...map.values()].sort((a, b) => b.bookings - a.bookings || a.agency.localeCompare(b.agency, "vi"));
  }, [rows]);

  const detail = picked ? rows.filter((b) => b.agency === picked) : [];

  const statusBadge = (b: AgencyBookingDTO) => (
    <span className="inline-flex flex-wrap items-center gap-1">
      {b.status === "done" ? (
        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-800">Đã bay</span>
      ) : b.status === "cancelled" ? (
        <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[11px] font-semibold text-rose-700">Huỷ</span>
      ) : (
        <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[11px] font-semibold text-sky-800">Chờ bay</span>
      )}
      {b.rescheduledFrom.length > 0 && (
        <span
          className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800"
          title="Booking đã được dời sang ngày bay hiện tại"
        >
          Đổi lịch từ {b.rescheduledFrom.map((d) => formatDateKeyVN(d)).join(", ")}
        </span>
      )}
    </span>
  );

  return (
    <CollapseCard
      title="🤝 Khách theo đại lý"
      hint="Klook / Agoda / BlueHome / SEEK / GYG… — lọc theo tháng, xem bay/huỷ/đổi lịch để quyết toán"
    >
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm font-medium text-slate-700">
          Tháng bay{" "}
          <input
            type="month"
            value={month}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
          />
        </label>
        {loading && <span className="text-xs text-slate-500">Đang tải…</span>}
      </div>

      {error && (
        <div className="mt-2">
          <Banner tone="error">{error}</Banner>
        </div>
      )}

      {!loading && rows.length === 0 && !error && (
        <p className="mt-3 text-sm text-slate-500">Tháng này chưa có booking nào gắn đại lý/nguồn.</p>
      )}

      {stats.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-600">
                <th className="whitespace-nowrap py-2 pr-3">Đại lý / Nguồn</th>
                <th className="whitespace-nowrap py-2 pr-3 text-right">Book</th>
                <th className="whitespace-nowrap py-2 pr-3 text-right">Khách</th>
                <th className="whitespace-nowrap py-2 pr-3 text-right">Đã bay</th>
                <th className="whitespace-nowrap py-2 pr-3 text-right">Huỷ</th>
                <th className="whitespace-nowrap py-2 pr-3 text-right">Đổi lịch</th>
                <th className="whitespace-nowrap py-2 pr-3 text-right" title="Tiền khách đã trả cho đại lý ở các booking ĐÃ BAY — số đòi đại lý khi quyết toán">
                  Đại lý giữ (đã bay)
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr
                  key={s.agency}
                  onClick={() => setPicked(picked === s.agency ? null : s.agency)}
                  className={
                    "cursor-pointer border-b border-slate-100 hover:bg-sky-50" +
                    (picked === s.agency ? " bg-sky-50 font-semibold" : "")
                  }
                  title="Bấm để xem từng booking của đại lý này"
                >
                  <td className="whitespace-nowrap py-1.5 pr-3">{picked === s.agency ? "▾ " : "▸ "}{s.agency}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{s.bookings}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{s.guests}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-emerald-700">
                    {s.flownBookings ? `${s.flownBookings} (${s.flownGuests}k)` : "—"}
                  </td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-rose-700">{s.cancelledBookings || "—"}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-amber-700">{s.rescheduled || "—"}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums font-semibold">
                    {s.agencyHeldFlown ? formatVND(s.agencyHeldFlown) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {picked && (
        <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50/50 p-2.5">
          <p className="mb-2 text-sm font-semibold text-slate-900">
            {picked} — {detail.length} booking tháng {month.slice(5)}/{month.slice(0, 4)}
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-600">
                  <th className="whitespace-nowrap px-2 py-2">Ngày bay</th>
                  <th className="whitespace-nowrap px-2 py-2">#</th>
                  <th className="whitespace-nowrap px-2 py-2">Khách</th>
                  <th className="whitespace-nowrap px-2 py-2">Mã booking</th>
                  <th className="whitespace-nowrap px-2 py-2 text-right">SL</th>
                  <th className="whitespace-nowrap px-2 py-2">Tình trạng</th>
                  <th className="whitespace-nowrap px-2 py-2 text-right">Tổng tiền</th>
                  <th className="whitespace-nowrap px-2 py-2 text-right">Đại lý đã thu</th>
                </tr>
              </thead>
              <tbody>
                {detail.map((b) => (
                  <tr key={b.bookingId} className={"border-b border-slate-100" + (b.status === "cancelled" ? " opacity-70" : "")}>
                    <td className="whitespace-nowrap px-2 py-1.5">{formatDateKeyVN(b.flightDate)}</td>
                    <td className="px-2 py-1.5 tabular-nums">#{b.daySeq || "?"}</td>
                    <td className="max-w-[180px] truncate px-2 py-1.5" title={b.contactName}>{b.contactName || "—"}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 font-mono text-xs">{b.bookingCode || "—"}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {b.guestCount}
                      {b.cancelledGuests > 0 && <span className="text-rose-600"> (−{b.cancelledGuests})</span>}
                    </td>
                    <td className="px-2 py-1.5">{statusBadge(b)}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">
                      {b.totalAmount ? formatVND(b.totalAmount) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">
                      {b.agencyPaidAmount ? formatVND(b.agencyPaidAmount) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="text-xs font-semibold text-slate-700">
                  <td colSpan={4} className="px-2 py-2">
                    Cộng: bay {detail.filter((b) => b.status === "done").length} · huỷ{" "}
                    {detail.filter((b) => b.status === "cancelled").length} · chờ{" "}
                    {detail.filter((b) => b.status === "open").length} · đổi lịch{" "}
                    {detail.filter((b) => b.rescheduledFrom.length > 0).length}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {detail.reduce((t, b) => t + b.guestCount, 0)}
                  </td>
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2 text-right tabular-nums">
                    {formatVND(detail.filter((b) => b.status !== "cancelled").reduce((t, b) => t + b.totalAmount, 0))}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-emerald-800">
                    {formatVND(detail.filter((b) => b.status === "done").reduce((t, b) => t + b.agencyPaidAmount, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">
            Dòng “Đại lý đã thu” là phần khách trả cho đại lý — cộng ở chân bảng CHỈ tính booking đã bay
            (số đòi đại lý khi quyết toán). Booking huỷ mà đại lý vẫn giữ tiền thì hai bên tự thống nhất, máy
            không cộng vào.
          </p>
        </div>
      )}
    </CollapseCard>
  );
}
