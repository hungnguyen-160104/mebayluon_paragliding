// app/baocao/dieu-phoi/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { formatDateKeyVN, shiftDateKey, todayInVN } from "@/lib/baobay/date";
import type { Issue } from "@/lib/baobay/reconcile";
import { parseTicketCodeList } from "@/lib/baobay/ticket-code";
import type { DispatcherReportDTO } from "@/lib/baobay/types";
import { BACKDATE_LIMIT_DAYS } from "@/lib/baobay/validation";
import { formatVND } from "@/lib/pricing";

import { apiGet, apiPost } from "../components/client-api";
import { DateBar } from "../components/DateBar";
import {
  CancelGuestRows,
  RescheduleGuestRows,
  type CancelGuestRow,
  type RescheduleGuestRow,
  DiploEntryRows,
  ExpenseRows,
  RangeRows,
  rangeRowsTotal,
  toRangeRows,
  type CancelRow,
  type DiploRow,
  type ExpenseRow,
  type RangeRow,
  type RescheduleEntryRow,
  dispatcherMoneyRows,
} from "../components/rows";
import { HandoverBox } from "../components/HandoverBox";
import { PeriodSummary } from "../components/PeriodSummary";
import { BookingCard, BookingTodayBanner } from "../components/BookingCard";
import { CollectCreate, CollectInbox } from "../components/CollectBox";
import { ReviewNotices } from "../components/ReviewNotices";
import { useBaobaySession } from "../components/session";
import { useSpot } from "../components/spot";
import { Shell } from "../components/Shell";
import { Banner, Button, CountInput, Field, Readout, TextArea, TextInput, ServiceBox, CollapseCard } from "../components/ui";

/**
 * Điều phối bay báo cáo một ngày làm việc.
 *
 * Đây là người nắm mặt vé và tiền tại điểm bay, nên form dài nhất trong bốn
 * nhóm. Hai đẳng thức luôn được hiện ra để tự soát ngay lúc nhập:
 *
 *      vé xuất   = đã bay + vé thu về
 *      vé thu về = huỷ + dời lịch
 */

type FormState = {
  guestCount: number;
  ticketsIssued: number;
  ticketsReturned: number;
  issuedRanges: RangeRow[];
  cancelledEntries: CancelRow[];
  rescheduledEntries: RescheduleEntryRow[];
  /** HÀ NỘI: nhóm KHÁCH huỷ/dời — tên, mã book, số khách, nguồn, tiền hoàn/ngày dời. */
  cancelledGuests: CancelGuestRow[];
  rescheduledGuests: RescheduleGuestRow[];
  diplomaticEntries: DiploRow[];
  flycam: number;
  flycamCodesText: string;
  video360: number;
  video360CodesText: string;
  redFlag: number;
  redFlagCodesText: string;
  flagFlight: number;
  flagFlightCodesText: string;
  /** Sổ THU CHI hợp nhất: nội dung – số tiền – thu/chi – TM/CK – ghi chú. */
  money: ExpenseRow[];
  note: string;
};

const EMPTY_FORM: FormState = {
  guestCount: 0,
  ticketsIssued: 0,
  ticketsReturned: 0,
  issuedRanges: [{ from: "", to: "" }],
  cancelledEntries: [{ codesText: "", reason: "", contactName: "", note: "" }],
  rescheduledEntries: [{ codesText: "", toDate: "", reason: "", contactName: "", phone: "", note: "" }],
  cancelledGuests: [{ name: "", bookingCode: "", guests: 0, source: "", refund: 0, note: "", codesText: "" }],
  rescheduledGuests: [
    { name: "", guests: 0, toDate: "", note: "", phone: "", pickup: "self", pickupNote: "", expectedTime: "", codesText: "", bookedId: "" },
  ],
  diplomaticEntries: [{ codesText: "", amount: 0, note: "" }],
  flycam: 0,
  flycamCodesText: "",
  video360: 0,
  video360CodesText: "",
  redFlag: 0,
  redFlagCodesText: "",
  flagFlight: 0,
  flagFlightCodesText: "",
  money: [{ content: "", amount: 0, kind: "thu", method: "cash", note: "" }],
  note: "",
};

/** Đọc lại form từ bản đã lưu — báo cáo cũ (trước bản nhóm đoàn) rơi về bản phẳng. */
function fromReport(r: DispatcherReportDTO): FormState {
  const cancelled: CancelRow[] = r.cancelledEntries.length
    ? r.cancelledEntries.map((e) => ({
        codesText: e.codes.join(", "),
        reason: e.reason,
        contactName: e.contactName,
        note: e.note || "",
      }))
    : r.cancelledCodes.length
      ? [{ codesText: r.cancelledCodes.join(", "), reason: "", contactName: "", note: "" }]
      : [];
  const rescheduled: RescheduleEntryRow[] = r.rescheduledEntries.length
    ? r.rescheduledEntries.map((e) => ({
        codesText: e.codes.join(", "),
        toDate: e.toDate,
        reason: e.reason,
        contactName: e.contactName,
        phone: e.phone,
        note: e.note || "",
      }))
    : r.rescheduled.map((e) => ({ codesText: e.code, toDate: e.toDate, reason: e.note || "", contactName: "", phone: "", note: "" }));
  const diplo: DiploRow[] = r.diplomaticEntries.length
    ? r.diplomaticEntries.map((e) => ({ codesText: e.codes.join(", "), amount: e.amount, note: e.note || "" }))
    : r.diplomaticCodes.length
      ? [{ codesText: r.diplomaticCodes.join(", "), amount: 0, note: "" }]
      : [];

  return {
    guestCount: r.guestCount,
    ticketsIssued: r.ticketsIssued,
    ticketsReturned: r.ticketsReturned,
    issuedRanges: toRangeRows(r.issuedRanges),
    cancelledEntries: cancelled.length ? cancelled : EMPTY_FORM.cancelledEntries,
    rescheduledEntries: rescheduled.length ? rescheduled : EMPTY_FORM.rescheduledEntries,
    cancelledGuests: r.cancelledGuestEntries.length
      ? r.cancelledGuestEntries.map((e) => ({ ...e, note: e.note || "", codesText: (e.codes ?? []).join(", ") }))
      : cancelled.length
        ? cancelled.map((e) => ({
            // báo cáo thời còn nhóm vé cũ (mã – lý do – liên hệ): trải sang nhóm khách để sửa tiếp
            name: e.contactName,
            bookingCode: "",
            guests: 0,
            source: "",
            refund: 0,
            note: [e.reason, e.note].filter(Boolean).join(" — "),
            codesText: e.codesText,
          }))
        : EMPTY_FORM.cancelledGuests,
    rescheduledGuests: r.rescheduledGuestEntries.length
      ? r.rescheduledGuestEntries.map((e) => ({
          ...e,
          note: e.note || "",
          phone: e.phone || "",
          pickup: e.pickup === "other" ? ("other" as const) : ("self" as const),
          pickupNote: e.pickupNote || "",
          expectedTime: e.expectedTime || "",
          codesText: (e.codes ?? []).join(", "),
          bookedId: e.bookedId || "",
        }))
      : rescheduled.length
        ? rescheduled.map((e) => ({
            name: e.contactName,
            guests: 0,
            toDate: e.toDate,
            note: [e.reason, e.note].filter(Boolean).join(" — "),
            phone: e.phone,
            pickup: "self" as const,
            pickupNote: "",
            expectedTime: "",
            codesText: e.codesText,
            bookedId: "",
          }))
        : EMPTY_FORM.rescheduledGuests,
    diplomaticEntries: diplo.length ? diplo : EMPTY_FORM.diplomaticEntries,
    flycam: r.flycam,
    flycamCodesText: r.flycamCodes.join(", "),
    video360: r.video360,
    video360CodesText: r.video360ServiceCodes.join(", "),
    redFlag: r.redFlag,
    redFlagCodesText: r.redFlagCodes.join(", "),
    flagFlight: r.flagFlight,
    flagFlightCodesText: r.flagFlightCodes.join(", "),
    /**
     * Sổ THU CHI hợp nhất — báo cáo cũ (thời còn ô tổng tiền mặt/CK và ba
     * khoản chi có tên) được trải phẳng thành từng dòng để sửa tiếp: phần tổng
     * chưa có tên thành dòng "Tiền thu trong ngày", nước/xe thành dòng chi.
     */
    money: dispatcherMoneyRows(r),
    note: r.note,
  };
}


type DayCheck = { dayBlocked: boolean; myIssues: Issue[]; otherIssueCount: number };

export default function DispatcherReportPage() {
  const { user, loading } = useBaobaySession("dispatcher");
  const { spot, setSpot, options: spotOptions } = useSpot(user?.spots);

  const today = todayInVN();
  const [date, setDate] = useState(today);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [existing, setExisting] = useState<DispatcherReportDTO | null>(null);
  const [locked, setLocked] = useState(false);
  const [check, setCheck] = useState<DayCheck | null>(null);
  const [loadingDay, setLoadingDay] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ warnings: string[] } | null>(null);
  const [history, setHistory] = useState<DispatcherReportDTO[]>([]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const rangeTotal = useMemo(() => rangeRowsTotal(form.issuedRanges), [form.issuedRanges]);
  const cancelledCodes = useMemo(
    () => [...new Set(form.cancelledEntries.flatMap((e) => parseTicketCodeList(e.codesText).codes))],
    [form.cancelledEntries],
  );
  const rescheduledCodes = useMemo(
    () => form.rescheduledEntries.flatMap((e) => parseTicketCodeList(e.codesText).codes),
    [form.rescheduledEntries],
  );
  const returned = cancelledCodes.length + rescheduledCodes.length;

  const loadDay = useCallback(async (targetDate: string) => {
    if (!spot) return;
    setLoadingDay(true);
    setError(null);
    setSaved(null);
    try {
      const res = await apiGet<{ report: DispatcherReportDTO | null; locked: boolean; check: DayCheck }>(
        `/api/baocao/reports/dispatcher?date=${targetDate}&spot=${spot}`,
      );
      setExisting(res.report);
      setLocked(res.locked);
      setCheck(res.check);
      setForm(res.report ? fromReport(res.report) : EMPTY_FORM);
    } catch (err: any) {
      setError(err?.message || "Không tải được số liệu ngày này");
    } finally {
      setLoadingDay(false);
    }
  }, [spot]);

  const loadHistory = useCallback(async () => {
    if (!spot) return;
    try {
      const { reports } = await apiGet<{ reports: DispatcherReportDTO[] }>(`/api/baocao/reports/dispatcher?spot=${spot}`);
      setHistory(reports);
    } catch {
      /* danh sách gần đây chỉ để tham khảo */
    }
  }, [spot]);

  useEffect(() => {
    if (user && spot) loadDay(date);
  }, [user, spot, date, loadDay]);

  useEffect(() => {
    if (user && spot) loadHistory();
  }, [user, spot, loadHistory]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(null);
    setSaving(true);
    try {
      await persist(form);
    } catch (err: any) {
      setError(err?.message || "Không lưu được báo cáo");
    } finally {
      setSaving(false);
    }
  }

  /** Lưu báo cáo với đúng bản form truyền vào — dùng cho cả nút Lưu lẫn "xác nhận dời". */
  async function persist(f: FormState) {
    const res = await apiPost<{ report: DispatcherReportDTO; warnings: string[]; check: DayCheck }>(
      `/api/baocao/reports/dispatcher?spot=${spot}`,
      {
        date,
        ...f,
        // Sổ THU CHI tách hai ngả: dòng THU thành khoản thu có tên (đúng TM/CK),
        // dòng CHI thành khoản chi — các ô tổng cũ về 0 để máy chủ tự cộng từ dòng
        cashReceived: 0,
        transferReceived: 0,
        revenueEntries: f.money
          .filter((e) => e.kind === "thu" && (e.content.trim() || e.amount))
          .map((e) => ({
            content: e.content.trim() || "Tiền thu",
            method: e.method === "transfer" ? ("transfer" as const) : ("cash" as const),
            amount: e.amount,
          })),
        guestWaterCost: 0,
        mountainCarCost: 0,
        shuttleCarCost: 0,
        expenses: f.money.filter((e) => e.kind !== "thu" && (e.content.trim() || e.amount)),
        issuedRanges: f.issuedRanges.filter((r) => r.from.trim() || r.to.trim()),
        // Nhóm vé kiểu cũ đã trải hết sang nhóm khách khi mở lại — gửi rỗng
        cancelledEntries: [],
        rescheduledEntries: [],
        cancelledGuestEntries: f.cancelledGuests.filter(
          (e) => e.name.trim() || e.guests || e.bookingCode.trim() || e.codesText.trim(),
        ),
        rescheduledGuestEntries: f.rescheduledGuests.filter(
          (e) => e.name.trim() || e.guests || e.toDate || e.codesText.trim(),
        ),
        diplomaticEntries: f.diplomaticEntries.filter((e) => e.codesText.trim() || e.amount || e.note.trim()),
      },
    );
    setExisting(res.report);
    setCheck(res.check);
    setForm(fromReport(res.report));
    setSaved({ warnings: res.warnings || [] });
    loadHistory();
  }

  /**
   * "Xác nhận dời": đẩy nhóm khách vào SỔ BOOKING của ngày dời — nhóm hiện
   * trong "🛫 Booking bay ngày đó" kèm nhãn "dời từ hôm nay" + tên/SĐT/ghi chú.
   * Xong tự lưu lại báo cáo để ghi nhớ đã đẩy (không đẩy trùng lần hai).
   */
  async function confirmMove(index: number) {
    const row = form.rescheduledGuests[index];
    if (!row || !row.toDate || row.bookedId) return;
    const codeCount = parseTicketCodeList(row.codesText).codes.length;
    const guestTotal = row.guests || codeCount;
    if (!guestTotal) return;
    setError(null);
    setSaving(true);
    try {
      const res = await apiPost<{ booking: { id: string } }>(`/api/baocao/booking?spot=${spot}`, {
        flightDate: row.toDate,
        source: "Dời lịch",
        contactName: row.name,
        phone: row.phone,
        bookingCode: "",
        guestCount: guestTotal,
        flycam: 0,
        video360: 0,
        redFlag: 0,
        flagFlight: 0,
        pickup: row.pickup === "other" ? "other" : "self",
        pickupNote: row.pickup === "other" ? row.pickupNote : "",
        expectedTime: row.expectedTime,
        deposit: 0,
        remaining: 0,
        note: `Khách dời từ ngày ${formatDateKeyVN(date)}${row.codesText.trim() ? ` — vé: ${row.codesText.trim()}` : ""}${row.note ? ` — ${row.note}` : ""}`,
        rescheduledFrom: date,
      });
      const next = {
        ...form,
        rescheduledGuests: form.rescheduledGuests.map((r, i) => (i === index ? { ...r, bookedId: res.booking.id } : r)),
      };
      setForm(next);
      await persist(next);
    } catch (err: any) {
      setError(err?.message || "Không đẩy được vào lịch booking");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user || !spot) {
    return <div className="flex min-h-dvh items-center justify-center text-sm text-slate-500">Đang tải…</div>;
  }

  /** Hà Nội không xuất vé giấy: ẩn toàn bộ khối vé, nhóm huỷ/dời ghi chú thay mã. */
  const noTickets = spot === "ha-noi";
  const rangeMismatch = !noTickets && rangeTotal > 0 && form.ticketsIssued > 0 && rangeTotal !== form.ticketsIssued;
  const returnMismatch = !noTickets && form.ticketsReturned !== returned;
  const revenue = form.money.reduce((a, e) => a + (e.kind === "thu" ? e.amount || 0 : 0), 0);
  const expenseSum = form.money.reduce((a, e) => a + (e.kind !== "thu" ? e.amount || 0 : 0), 0);
  const myReds = (check?.myIssues || []).filter((i) => i.severity === "red");

  return (
    <Shell
      user={user}
      title="Báo cáo điều phối bay"
      subtitle="Cuối buổi nhập vé xuất/thu, tiền mặt, dịch vụ gia tăng và các khoản chi cho khách."
    >
      {/* Lệnh soát lại của kế toán cho đúng ngày đang mở */}
      {/* Chọn NƠI LÀM VIỆC + NGÀY ngay trên đầu — bản thứ hai nằm cạnh form bên dưới */}
      <DateBar
        date={date}
        onChange={setDate}
        max={today}
        min={shiftDateKey(today, -BACKDATE_LIMIT_DAYS)}
        loading={loadingDay}
        spot={spot}
        spotOptions={spotOptions}
        onSpotChange={(v) => setSpot(v as never)}
      />

      <ReviewNotices spot={spot} date={date} />

      {/* Lệnh thu tiền chờ mình — việc phải làm ngay */}
      <CollectInbox spot={spot} />

      {/* Booking đặt trước bay ĐÚNG ngày đang xem — bay xong bấm Hoàn thành */}
      <BookingTodayBanner spot={spot} date={date} />

      {/* Khách đặt trước: nhập ngay hôm khách chốt, tự hiện đúng ngày bay */}
      <BookingCard spot={spot} spotOptions={spotOptions} />

      {myReds.length > 0 && (
        <Banner tone="error">
          <strong>Kế toán cần {myReds.length} chỗ được kiểm lại:</strong>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs">
            {myReds.map((i, k) => (
              <li key={k}>{i.message}</li>
            ))}
          </ul>
        </Banner>
      )}

      {locked && (
        <Banner tone="info">
          Ngày {formatDateKeyVN(date)} <strong>đã được kế toán chốt</strong> — số liệu đã khoá, chỉ xem được.
        </Banner>
      )}

      <DateBar
        date={date}
        onChange={setDate}
        max={today}
        min={shiftDateKey(today, -BACKDATE_LIMIT_DAYS)}
        loading={loadingDay}
        spot={spot}
        spotOptions={spotOptions}
        onSpotChange={(v) => setSpot(v as never)}
      />

      {/* ============ DESKTOP 2 CỘT CỐ ĐỊNH — MỘT lưới duy nhất, hai cột độc lập ============
          TRÁI: form nhập hằng ngày (khách, vé, dịch vụ, THU CHI, nút lưu)
          PHẢI: lệnh thu + khách huỷ/dời/ngoại giao + ghi chú + tiền bạc + lịch sử */}
      <div className="space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5 lg:space-y-0">
      <div>
      <form onSubmit={submit} className="space-y-4">
        {/* Ô quan trọng nhất của quầy — thanh ngang luôn mở: tiêu đề bên trái, cụm đếm bên phải */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-rose-300 bg-rose-50/70 px-4 py-2.5 shadow-sm">
          <span className="text-base font-bold text-rose-900">Tổng khách trong ngày</span>
          <div className="ml-auto">
            <CountInput compact value={form.guestCount} onChange={(v) => set("guestCount", v)} max={5000} />
          </div>
        </div>

        {/* Vé chỉ có ở điểm xuất vé giấy — vẫn gập cho gọn */}
        {!noTickets && (
        <CollapseCard title="Vé trong ngày" hint="vé xuất, vé thu về, dải mã">
          <div className="grid gap-4 @md:grid-cols-2">
            <Field label="Số vé xuất ra">
              <CountInput value={form.ticketsIssued} onChange={(v) => set("ticketsIssued", v)} max={5000} />
            </Field>
            <Field label="Số vé thu về" hint="Vé huỷ + vé dời lịch">
              <CountInput value={form.ticketsReturned} onChange={(v) => set("ticketsReturned", v)} max={5000} />
            </Field>
          </div>

          <div className="mt-4">
            <Field
              label="Dải mã vé đã xuất"
              hint="Nhiều cuốn khác tiền tố thì thêm dòng: A1234–A1256 và B1234–B1239"
            >
              <div />
            </Field>
            <RangeRows rows={form.issuedRanges} onChange={(rows) => set("issuedRanges", rows)} disabled={locked} />
          </div>

          {rangeMismatch && !locked && (
            <div className="mt-3">
              <Banner tone="warning">
                Các dải mã cho ra {rangeTotal} vé, khác số vé xuất đã khai ({form.ticketsIssued}).
                <div className="mt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 px-3 text-xs"
                    onClick={() => set("ticketsIssued", rangeTotal)}
                  >
                    Lấy số vé xuất = {rangeTotal}
                  </Button>
                </div>
              </Banner>
            </div>
          )}
        </CollapseCard>
        )}

        <CollapseCard
          title="Dịch vụ gia tăng"
          hint="Flycam đối soát với camera man; 360, cờ đỏ, kéo cờ đối soát với phi công. Mã vé chỉ cần điền khi số lệch."
        >
          {/* Mỗi dịch vụ một khung màu riêng, cụm đếm nhỏ — sát nhau không còn lẫn */}
          <div className="grid grid-cols-2 gap-3">
            <ServiceBox tone="flycam" label="Flycam">
              <CountInput compact value={form.flycam} onChange={(v) => set("flycam", v)} max={1000} />
            </ServiceBox>
            <ServiceBox tone="video360" label="Camera 360">
              <CountInput compact value={form.video360} onChange={(v) => set("video360", v)} max={1000} />
            </ServiceBox>
            <ServiceBox tone="redFlag" label="Dù cờ đỏ">
              <CountInput compact value={form.redFlag} onChange={(v) => set("redFlag", v)} max={1000} />
            </ServiceBox>
            <ServiceBox tone="flagFlight" label="Bay kéo cờ/bánh">
              <CountInput compact value={form.flagFlight} onChange={(v) => set("flagFlight", v)} max={1000} />
            </ServiceBox>
          </div>

          <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <summary className="cursor-pointer text-sm font-medium text-slate-700">
              Mã vé từng dịch vụ — không bắt buộc, điền khi cần soát lệch
            </summary>
            <div className="mt-3 space-y-3">
              <ServiceBox tone="flycam" label="Mã vé Flycam">
                <TextInput
                  value={form.flycamCodesText}
                  onChange={(e) => set("flycamCodesText", e.target.value.toUpperCase())}
                  autoCapitalize="characters"
                  spellCheck={false}
                  disabled={locked}
                />
              </ServiceBox>
              <ServiceBox tone="video360" label="Mã vé Camera 360">
                <TextInput
                  value={form.video360CodesText}
                  onChange={(e) => set("video360CodesText", e.target.value.toUpperCase())}
                  autoCapitalize="characters"
                  spellCheck={false}
                  disabled={locked}
                />
              </ServiceBox>
              <ServiceBox tone="redFlag" label="Mã vé dù cờ đỏ">
                <TextInput
                  value={form.redFlagCodesText}
                  onChange={(e) => set("redFlagCodesText", e.target.value.toUpperCase())}
                  autoCapitalize="characters"
                  spellCheck={false}
                  disabled={locked}
                />
              </ServiceBox>
              <ServiceBox tone="flagFlight" label="Mã vé bay kéo cờ/bánh">
                <TextInput
                  value={form.flagFlightCodesText}
                  onChange={(e) => set("flagFlightCodesText", e.target.value.toUpperCase())}
                  autoCapitalize="characters"
                  spellCheck={false}
                  disabled={locked}
                />
              </ServiceBox>
            </div>
          </details>
        </CollapseCard>





        <CollapseCard
          title="THU CHI"
          hint="Mỗi khoản một dòng: nội dung – số tiền – THU/CHI – Tiền mặt/CK – ghi chú. Bấm + để thêm. Chi hộ khách (nước, xe…) kế toán xác nhận rồi hoàn lại."
        >
          <ExpenseRows rows={form.money} onChange={(rows) => set("money", rows)} disabled={locked} withKind withMethod hideTotals />

          {/* Tổng chạy theo sổ: thu xanh dấu +, chi đỏ dấu − */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
              <div className="text-xs font-medium text-emerald-800">Tổng thu</div>
              <div className="text-lg font-bold tabular-nums text-emerald-700">+{formatVND(revenue)}</div>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5">
              <div className="text-xs font-medium text-rose-800">Tổng chi</div>
              <div className="text-lg font-bold tabular-nums text-rose-700">−{formatVND(expenseSum)}</div>
            </div>
          </div>
        </CollapseCard>


        {error && <Banner tone="error">{error}</Banner>}

        {saved && (
          <Banner tone="success" onClose={() => setSaved(null)}>
            <strong>Đã lưu báo cáo ngày {formatDateKeyVN(date)}.</strong>
            {saved.warnings.length > 0 && (
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs">
                {saved.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}
          </Banner>
        )}

        {!locked && (
          <div className="sticky bottom-3 z-10">
            <Button type="submit" disabled={saving || loadingDay} className="w-full shadow-lg">
              {saving ? "Đang lưu…" : existing ? "Cập nhật báo cáo" : "Lưu báo cáo"}
            </Button>
          </div>
        )}
      </form>
      </div>

      <div className="space-y-4">
        {/* Khách chốt lịch trả TM tại bãi / CK về TK công ty — lập lệnh thu */}
        <CollectCreate spot={spot} />

        {/* Các mục ít dùng — gập mặc định, bấm mới xổ */}
        <CollapseCard
          title="Khách huỷ"
          hint={
            noTickets
              ? "Mỗi nhóm khách huỷ một dòng: tên – mã book – số khách – nguồn – tiền hoàn – ghi chú. Kế toán sẽ bấm xác nhận đúng bộ số này."
              : "Mỗi nhóm một dòng: MÃ VÉ (cùng đoàn ghi chung) – tên – mã book – số khách – nguồn – tiền hoàn – ghi chú."
          }
        >
          <CancelGuestRows
            rows={form.cancelledGuests}
            onChange={(rows) => set("cancelledGuests", rows)}
            disabled={locked}
            withCodes={!noTickets}
          />
        </CollapseCard>

        <CollapseCard
          title="Khách dời lịch"
          hint={
            noTickets
              ? "Mỗi nhóm khách dời một dòng: tên – SĐT – số lượng – ngày dời – đón – giờ hẹn – ghi chú."
              : "Mỗi nhóm một dòng: MÃ VÉ – tên – SĐT – số lượng – ngày dời – đón – giờ hẹn. Vé dời coi như huỷ hôm nay, ngày mới xuất vé khác."
          }
        >
          <RescheduleGuestRows
            rows={form.rescheduledGuests}
            onChange={(rows) => set("rescheduledGuests", rows)}
            minDate={shiftDateKey(date, 1)}
            disabled={locked}
            onConfirmMove={confirmMove}
            withCodes={!noTickets}
          />

          {!noTickets && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Readout label="Huỷ + dời lịch" value={`${returned} vé`} tone={returnMismatch ? "warning" : "normal"} />
            <Readout label="Vé thu về đã khai" value={`${form.ticketsReturned} vé`} />
          </div>
          )}

          {returnMismatch && !locked && (
            <div className="mt-2">
              <Banner tone="warning">
                Số vé thu về ({form.ticketsReturned}) khác tổng huỷ + dời lịch ({returned}).
                <div className="mt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 px-3 text-xs"
                    onClick={() => set("ticketsReturned", returned)}
                  >
                    Lấy số vé thu về = {returned}
                  </Button>
                </div>
              </Banner>
            </div>
          )}
        </CollapseCard>

        <CollapseCard
          title="Khách ngoại giao"
          hint="Vẫn xuất vé; có thu được tiền thì nhập số tiền, không thì để 0. Số khách tự đếm theo mã."
        >
          <DiploEntryRows
            rows={form.diplomaticEntries}
            onChange={(rows) => set("diplomaticEntries", rows)}
            disabled={locked}
          />
        </CollapseCard>

        <CollapseCard title="Ghi chú">
          <TextArea
            value={form.note}
            onChange={(e) => set("note", e.target.value)}
            placeholder="Khách nợ, vé in lỗi, ca làm việc…"
            disabled={locked}
          />
        </CollapseCard>

      <HandoverBox spot={spot} />

      <PeriodSummary spot={spot} title="Tổng theo chu kỳ" hint="Chọn khoảng ngày để xem tổng từng nội dung mình đã báo" />

      <CollapseCard title="Đã báo gần đây" hint="Bấm vào một ngày để mở lại và sửa">
        {history.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có báo cáo nào.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {history.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setDate(r.date)}
                  className="flex w-full items-center justify-between gap-3 py-3 text-left hover:bg-slate-50"
                >
                  <div>
                    <div className="font-medium text-slate-900">{formatDateKeyVN(r.date)}</div>
                    <div className="text-xs text-slate-500">
                      {r.guestCount} khách · {r.ticketsIssued} vé xuất · {r.ticketsReturned} thu về
                      {r.flycam ? ` · ${r.flycam} flycam` : ""}
                      {r.flagFlight ? ` · ${r.flagFlight} kéo cờ` : ""}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-sm font-semibold tabular-nums text-slate-900">
                    {formatVND(r.cashReceived + r.transferReceived)}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CollapseCard>
      </div>
      </div>
    </Shell>
  );
}
