// app/baocao/bao-cao-thang/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import { formatDateKeyVN, todayInVN } from "@/lib/baobay/date";
import type { MonthlyPilotDTO, MonthlyReportDTO, MonthlyTotalsDTO } from "@/lib/baobay/types";
import { formatVND } from "@/lib/pricing";

import { apiGet } from "../components/client-api";
import { useBaobaySession } from "../components/session";
import { SpotSwitcher, useSpot } from "../components/spot";
import { Shell } from "../components/Shell";
import { Banner, Button, Card, Field, TextInput } from "../components/ui";

/**
 * Báo cáo tháng: mỗi tháng một bản, mỗi phi công một khối.
 *
 * Mỗi khối là một bảng: dòng là chỉ tiêu (chuyến bay, Camera360, xe ôm, phí bãi
 * bay, nước cho khách, chi khác), cột là ngày 1…31 kèm hai cột tổng — "đến hôm
 * nay" và "cả tháng". Đây đúng là hình dáng tờ bảng kê kế toán vẫn dùng, nên
 * cột nhiều và phải cuộn ngang; bù lại đối chiếu được từng ngày.
 *
 * Ô ngày kế toán CHƯA chốt được tô vàng: số đó phi công còn sửa được nên chưa
 * dùng để trả tiền.
 */

type MetricKey = keyof Pick<
  MonthlyTotalsDTO,
  | "flights"
  | "ppgFlights"
  | "video360"
  | "redFlag"
  | "flagFlight"
  | "siteFeeGuests"
  | "pickupBigC"
  | "pickupHotel"
  | "mountainTrips"
  | "waterCost"
  | "thuTotal"
  | "chiTotal"
  | "advanceTotal"
  | "latePenalty"
>;

/**
 * Danh mục bảng kê THEO LỆNH chủ hệ thống (12/08/2026): ngắn gọn, tiền của
 * ngày nào ghi vào đúng cột ngày đó. Bốn dòng đầu là số đếm, bốn dòng cuối là
 * tiền; khối giữa chỉ hiện ở điểm Hà Nội.
 */
const BASE_METRICS: Array<{ key: MetricKey; label: string; money?: boolean }> = [
  { key: "flights", label: "PG" },
  { key: "video360", label: "360" },
  { key: "redFlag", label: "Cờ" },
  { key: "flagFlight", label: "Kéo cờ" },
];

/** PPG chỉ bay ở Khau Phạ. */
const KHAUPHA_METRICS: Array<{ key: MetricKey; label: string; money?: boolean }> = [
  { key: "ppgFlights", label: "PPG" },
];

/** Chỉ điểm Hà Nội mới có đưa đón và nước khách. */
const HANOI_METRICS: Array<{ key: MetricKey; label: string; money?: boolean }> = [
  { key: "siteFeeGuests", label: "Phí bãi (khách)" },
  { key: "pickupBigC", label: "Xe BigC" },
  { key: "pickupHotel", label: "Xe KS" },
  { key: "mountainTrips", label: "Xe lên núi" },
  { key: "waterCost", label: "Nước khách", money: true },
];

const MONEY_METRICS: Array<{ key: MetricKey; label: string; money?: boolean }> = [
  { key: "thuTotal", label: "Tiền thu", money: true },
  { key: "chiTotal", label: "Tiền chi", money: true },
  { key: "advanceTotal", label: "Tiền ứng", money: true },
  { key: "latePenalty", label: "Tiền phạt", money: true },
];

export default function MonthlyReportPage() {
  const { user, loading } = useBaobaySession("accountant");
  const { spot, setSpot, options: spotOptions } = useSpot(user?.spots);

  const [month, setMonth] = useState(todayInVN().slice(0, 7));
  const [data, setData] = useState<MonthlyReportDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (m: string) => {
    if (!spot) return;
    setBusy(true);
    setError(null);
    try {
      setData(await apiGet<MonthlyReportDTO>(`/api/baocao/monthly?month=${m}&spot=${spot}`));
    } catch (err: any) {
      setError(err?.message || "Không tải được báo cáo tháng");
    } finally {
      setBusy(false);
    }
  }, [spot]);

  useEffect(() => {
    if (user && spot) load(month);
  }, [user, spot, month, load]);

  if (loading || !user || !spot) {
    return <div className="flex min-h-dvh items-center justify-center text-sm text-slate-500">Đang tải…</div>;
  }

  return (
    <Shell
      user={user}
      title="Báo cáo tháng"
      subtitle="Mỗi tháng một bản, tách theo từng phi công: số từng ngày, tổng đến hôm nay và tổng cả tháng."
    >
      <SpotSwitcher spot={spot} options={spotOptions} onChange={setSpot} />

      <Card title="Chọn tháng">
        <div className="grid gap-3 @md:grid-cols-2">
          <Field label="Tháng">
            <TextInput
              type="month"
              value={month}
              max={todayInVN().slice(0, 7)}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
            />
          </Field>
          <div className="flex items-end">
            <div className="flex flex-wrap gap-2">
              <a
                href={`/api/baocao/export?month=${month}&spot=${spot}`}
                className="inline-flex h-12 items-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Tải Excel cả tháng (.xlsx)
              </a>
              <a
                href={`/api/baocao/monthly?month=${month}&format=csv&spot=${spot}`}
                className="inline-flex h-12 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                CSV
              </a>
            </div>
          </div>
        </div>
      </Card>

      {error && <Banner tone="error">{error}</Banner>}
      {busy && <p className="text-sm text-slate-500">Đang tải…</p>}

      {!busy && data && (
        <>
          {data.unclosedDays.length > 0 && (
            <Banner tone="warning">
              <strong>{data.unclosedDays.length} ngày trong tháng chưa kế toán chốt</strong> — ô của những ngày
              này được tô vàng, số còn có thể đổi: {data.unclosedDays.slice(0, 12).map(formatDateKeyVN).join(", ")}
              {data.unclosedDays.length > 12 ? "…" : ""}
            </Banner>
          )}

          <Card title={`Tổng cả đội tháng ${month}`}>
            <div className="grid grid-cols-2 gap-3 @md:grid-cols-4">
              <Stat label="Chuyến đến hôm nay" value={String(data.grandToDate.flights)} />
              <Stat label="Chuyến cả tháng" value={String(data.grandMonth.flights)} strong />
              <Stat label="Camera 360 cả tháng" value={String(data.grandMonth.video360)} />
              <Stat label="Khách ngoại giao" value={String(data.grandMonth.diplomaticGuests)} />
              <Stat label="Phí bãi (khách)" value={String(data.grandMonth.siteFeeGuests)} />
              <Stat label="Nước cho khách" value={formatVND(data.grandMonth.waterCost)} />
              <Stat label="Xe cho khách + chi khác" value={formatVND(data.grandMonth.guestCarCost + data.grandMonth.otherExpense)} />
              <Stat label="Tổng chi cả tháng" value={formatVND(data.grandMonth.expenseTotal)} strong />
            </div>
            {data.isCurrentMonth && (
              <p className="mt-3 text-xs text-slate-500">
                Tháng đang chạy — cột “đến hôm nay” tính tới {formatDateKeyVN(data.today)}.
              </p>
            )}
          </Card>

          {data.pilots.length === 0 ? (
            <Card>
              <p className="text-sm text-slate-500">Tháng này chưa có phi công nào báo cáo.</p>
            </Card>
          ) : (
            data.pilots.map((pilot) => <PilotBlock key={pilot.username} pilot={pilot} data={data} />)
          )}
        </>
      )}
    </Shell>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <div className="text-xs text-slate-500">{label}</div>
      <div
        className={
          strong
            ? "text-base font-bold tabular-nums text-emerald-700"
            : "text-base font-semibold tabular-nums text-slate-900"
        }
      >
        {value}
      </div>
    </div>
  );
}

function PilotBlock({ pilot, data }: { pilot: MonthlyPilotDTO; data: MonthlyReportDTO }) {
  // Khối đưa đón + nước khách chỉ có ở điểm Hà Nội
  // Mỗi điểm chỉ hiện dịch vụ mình có: PPG riêng Khau Phạ; phí bãi/nước/đưa đón riêng Hà Nội
  const metrics = [
    ...BASE_METRICS,
    ...(data.spot === "khau-pha" ? KHAUPHA_METRICS : []),
    ...(data.spot === "ha-noi" ? HANOI_METRICS : []),
    ...MONEY_METRICS,
  ];
  const [showExpenses, setShowExpenses] = useState(false);

  const fmt = (value: number, money?: boolean) => {
    if (!value) return "";
    return money ? value.toLocaleString("vi-VN") : String(value);
  };

  return (
    <Card
      title={pilot.pilotName}
      hint={`${pilot.month.days} ngày bay · ${pilot.month.flights} chuyến cả tháng · tổng chi ${formatVND(pilot.month.expenseTotal)}`}
    >
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 whitespace-nowrap bg-white px-2 py-2 text-left text-xs font-semibold text-slate-600">
                Chỉ tiêu
              </th>
              {pilot.daily.map((cell) => (
                <th
                  key={cell.day}
                  className={
                    "w-10 px-1 py-2 text-center text-xs font-semibold " +
                    (cell.hasReport && !cell.closed ? "bg-amber-50 text-amber-800" : "text-slate-500")
                  }
                  title={
                    cell.hasReport
                      ? cell.closed
                        ? "Đã chốt"
                        : "Chưa chốt — số còn có thể đổi"
                      : "Không có báo cáo"
                  }
                >
                  {cell.day}
                </th>
              ))}
              <th className="whitespace-nowrap bg-sky-50 px-3 py-2 text-right text-xs font-semibold text-sky-900">
                Đến hôm nay
              </th>
              <th className="whitespace-nowrap bg-emerald-50 px-3 py-2 text-right text-xs font-semibold text-emerald-900">
                Cả tháng
              </th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => (
              <tr key={metric.key} className="border-b border-slate-100">
                <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-2 py-2 text-xs font-medium text-slate-700">
                  {metric.label}
                </td>
                {pilot.daily.map((cell) => (
                  <td
                    key={cell.day}
                    className={
                      "px-1 py-2 text-center text-xs tabular-nums " +
                      (cell.hasReport && !cell.closed ? "bg-amber-50 text-amber-900" : "text-slate-800")
                    }
                  >
                    {fmt(cell[metric.key], metric.money)}
                  </td>
                ))}
                <td className="whitespace-nowrap bg-sky-50 px-3 py-2 text-right text-sm font-semibold tabular-nums text-sky-900">
                  {metric.money
                    ? formatVND(pilot.toDate[metric.key])
                    : pilot.toDate[metric.key] || "—"}
                </td>
                <td className="whitespace-nowrap bg-emerald-50 px-3 py-2 text-right text-sm font-bold tabular-nums text-emerald-900">
                  {metric.money ? formatVND(pilot.month[metric.key]) : pilot.month[metric.key] || "—"}
                </td>
              </tr>
            ))}
            <tr>
              <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-2 py-2 text-xs font-semibold text-slate-900">
                Tổng chi
              </td>
              <td colSpan={data.daysInMonth} />
              <td className="whitespace-nowrap bg-sky-50 px-3 py-2 text-right text-sm font-semibold tabular-nums text-sky-900">
                {formatVND(pilot.toDate.expenseTotal)}
              </td>
              <td className="whitespace-nowrap bg-emerald-50 px-3 py-2 text-right text-sm font-bold tabular-nums text-emerald-900">
                {formatVND(pilot.month.expenseTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {pilot.expenses.length > 0 && (
        <div className="mt-3">
          <Button
            type="button"
            variant="ghost"
            className="h-9 px-3 text-xs"
            onClick={() => setShowExpenses((v) => !v)}
          >
            {showExpenses ? "Ẩn" : `Chi tiết ${pilot.expenses.length} khoản thu chi theo ngày`}
          </Button>

          {showExpenses && (
            <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
              {pilot.expenses.map((e, k) => (
                <li key={k} className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 text-sm">
                  <span className="text-slate-500">{formatDateKeyVN(e.date)}</span>
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold " +
                      (e.kind === "thu" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800")
                    }
                  >
                    {e.kind === "thu" ? "THU" : "CHI"}
                  </span>
                  <span className="flex-1 text-slate-900">{e.content}</span>
                  {e.note && <span className="text-xs text-slate-500">{e.note}</span>}
                  <span
                    className={
                      "font-semibold tabular-nums " + (e.kind === "thu" ? "text-emerald-700" : "text-rose-700")
                    }
                  >
                    {e.kind === "thu" ? "+" : "−"}
                    {formatVND(e.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
