// app/baocao/dieu-phoi/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { formatDateKeyVN, shiftDateKey, todayInVN } from "@/lib/baobay/date";
import type { Issue } from "@/lib/baobay/reconcile";
import { parseTicketCodeList } from "@/lib/baobay/ticket-code";
import type { DispatcherReportDTO } from "@/lib/baobay/types";
import { BACKDATE_LIMIT_DAYS } from "@/lib/baobay/validation";
import { formatVND } from "@/lib/pricing";

import { apiGet, apiPost } from "../components/client-api";
import { DateBar } from "../components/DateBar";
import {
  type BookingPick,
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
import { FlownServicesHint } from "../components/FlownServicesHint";
import { HandoverBox } from "../components/HandoverBox";
import { IdScanCard } from "../components/IdScanCard";
import { OtaMailCard, OtaReviewFlag } from "../components/OtaMailCard";
import { RefundCard } from "../components/RefundCard";
import { PeriodSummary } from "../components/PeriodSummary";
import { AddServicesCard } from "../components/AddServicesCard";
import { CancelMoveCard } from "../components/CancelMoveCard";
import { BookingCard, BookingTodayBanner } from "../components/BookingCard";
import { CollectCreate, CollectInbox } from "../components/CollectBox";
import { ReviewNotices } from "../components/ReviewNotices";
import { useBaobaySession } from "../components/session";
import { DISPATCHER_LIKE_ROLES } from "@/lib/baobay/roles";
import { useSpot } from "../components/spot";
import { Shell } from "../components/Shell";
import { Banner, Button, CollapseCard, CountInput, DoneTag, Field, PageLoading, Readout, ServiceBox, TextArea, TextInput, useDoneFlag } from "../components/ui";

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
  sunset: number;
  sunsetCodesText: string;
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
  sunset: 0,
  sunsetCodesText: "",
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
    sunset: r.sunset,
    sunsetCodesText: r.sunsetCodes.join(", "),
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
  /** Quầy vé dùng chung trang này — chỉ khác: không có thẻ lệnh thu tiền. */
  const { user, loading } = useBaobaySession(DISPATCHER_LIKE_ROLES);
  const { spot, setSpot, options: spotOptions } = useSpot(user?.spots);

  const today = todayInVN();
  const [date, setDate] = useState(today);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [existing, setExisting] = useState<DispatcherReportDTO | null>(null);
  const [locked, setLocked] = useState(false);
  /** Tên kế toán đã chốt ngày — hiện banner xanh cho mọi vai trò. */
  const [closedBy, setClosedBy] = useState("");
  const [check, setCheck] = useState<DayCheck | null>(null);
  const [loadingDay, setLoadingDay] = useState(false);
  /** null = rảnh · "draft" = đang lưu nháp · "submit" = đang chốt ca. */
  const [saving, setSaving] = useState<"draft" | "submit" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ warnings: string[]; submitted: boolean } | null>(null);
  /** Dấu "✓ Đã lưu / Đã chốt" nhấp nháy cạnh nút, tự tắt sau vài giây. */
  const [justSaved, flashSaved] = useDoneFlag();
  /** Booking chờ bay của ngày — cho ô "chọn booking" ở thẻ Khách huỷ / dời lịch. */
  const [dayBookings, setDayBookings] = useState<BookingPick[]>([]);
  /** Khách ĐÃ huỷ và khách ĐÃ dời khỏi ngày — liệt kê trong thẻ Khách huỷ / dời lịch. */
  const [cancelledBookings, setCancelledBookings] = useState<BookingPick[]>([]);
  const [movedOutBookings, setMovedOutBookings] = useState<BookingPick[]>([]);
  useEffect(() => {
    if (!spot) return;
    let alive = true;
    apiGet<{ forDate: BookingPick[]; movedOut?: BookingPick[] }>(`/api/baocao/booking?date=${date}&spot=${spot}`)
      /** Cả khách đã tích "đã bay" cũng hiện: huỷ/dời sau khi lỡ tích là chuyện có thật. */
      .then((r) => {
        if (!alive) return;
        setDayBookings(r.forDate.filter((b) => b.status === "open" || b.status === "done"));
        setCancelledBookings(r.forDate.filter((b) => b.status === "cancelled"));
        setMovedOutBookings(r.movedOut ?? []);
      })
      .catch(() => {
        /* ngày chưa có booking thì thôi */
      });
    return () => {
      alive = false;
    };
  }, [spot, date]);

  const [history, setHistory] = useState<DispatcherReportDTO[]>([]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const rangeTotal = useMemo(() => rangeRowsTotal(form.issuedRanges), [form.issuedRanges]);
  /** Hà Nội không xuất vé giấy — bản dùng được TRONG hook (biến `noTickets` bên dưới nằm sau return sớm). */
  const noTicketSpot = spot === "ha-noi";

  /**
   * "TỔNG KHÁCH TRONG NGÀY" TỰ CỘNG theo bảng kê của chính người nhập:
   *   - điểm có vé giấy (Khau Phạ, Sa Pa): theo DẢI MÃ VÉ đã xuất — mỗi vé một khách;
   *   - Hà Nội (không vé giấy): theo số khách của các booking đã tích "đã bay".
   *
   * Chỉ tự điền khi ô đang 0 hoặc đang mang đúng số máy điền lần trước — người
   * đã gõ tay số khác thì máy không giành: khách vãng lai không vé vẫn có thật.
   */
  const [flownGuests, setFlownGuests] = useState(0);
  /** Khách "bay không vé" đã tích đã bay — không nằm trong dải vé nên phải cộng bù. */
  const [noTicketGuests, setNoTicketGuests] = useState(0);
  const lastAutoGuests = useRef<number | null>(null);
  /**
   * Hook này phải nằm TRƯỚC mọi `return` sớm của component (màn "Đang tải…"),
   * không thì số hook đổi giữa hai lần render và React sập cả trang.
   */
  /**
   * Điểm vé: tổng khách = SỐ VÉ ĐÃ XUẤT + KHÁCH BAY KHÔNG VÉ. Chuyến đánh dấu
   * "không vé" vẫn là chuyến bay thật (khách ngoại giao, bay bù, hết vé giấy)
   * — chỉ đếm theo dải vé là hụt đúng nhóm này: 4 khách bay (2 vé + 2 không
   * vé) mà ô tổng hiện 2.
   */
  const autoGuests = spot === "ha-noi" ? flownGuests : rangeTotal + noTicketGuests;
  useEffect(() => {
    if (locked || autoGuests <= 0) return;
    setForm((prev) => {
      if (prev.guestCount !== 0 && prev.guestCount !== lastAutoGuests.current) return prev;
      if (prev.guestCount === autoGuests) return prev;
      lastAutoGuests.current = autoGuests;
      return { ...prev, guestCount: autoGuests };
    });
  }, [autoGuests, locked]);
  /**
   * "SỐ VÉ XUẤT RA" TỰ ĐẾM theo DẢI MÃ VÉ — dải mã là thứ nhân viên bắt buộc
   * khai, còn con số thì chỉ là phép đếm của dải đó. Bắt gõ tay lần nữa chỉ tạo
   * thêm một chỗ lệch.
   *
   * Vẫn sửa được: gõ số khác thì máy thôi giành (đúng như ô "tổng khách" ngay
   * trên). Cách nhận biết: ô đang 0, hoặc đang mang đúng số máy điền lần trước.
   */
  const lastAutoTickets = useRef<number | null>(null);
  useEffect(() => {
    if (locked || noTicketSpot || rangeTotal <= 0) return;
    setForm((prev) => {
      if (prev.ticketsIssued !== 0 && prev.ticketsIssued !== lastAutoTickets.current) return prev;
      if (prev.ticketsIssued === rangeTotal) return prev;
      lastAutoTickets.current = rangeTotal;
      return { ...prev, ticketsIssued: rangeTotal };
    });
  }, [rangeTotal, locked, noTicketSpot]);

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
      const res = await apiGet<{ report: DispatcherReportDTO | null; locked: boolean; closedBy?: string; check: DayCheck }>(
        `/api/baocao/reports/dispatcher?date=${targetDate}&spot=${spot}`,
      );
      setExisting(res.report);
      setLocked(res.locked);
      setClosedBy(res.closedBy || "");
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

  /** Nút Lưu nháp (và phím Enter trong form) — giữ nguyên trạng thái chốt hiện có. */
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await save(false);
  }

  /**
   * Lưu ca: `submitNow = false` là bản nháp (còn nhập tiếp), `true` là chốt ca
   * cho kế toán soát. Chốt xong vẫn sửa và chốt lại được — y như phi công.
   */
  async function save(submitNow: boolean) {
    setError(null);
    setSaved(null);
    setSaving(submitNow ? "submit" : "draft");
    try {
      await persist(form, submitNow);
    } catch (err: any) {
      setError(err?.message || "Không lưu được báo cáo");
    } finally {
      setSaving(null);
    }
  }

  /** Lưu báo cáo với đúng bản form truyền vào — dùng cho cả nút Lưu lẫn "xác nhận dời". */
  async function persist(f: FormState, submitNow = false) {
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
        submit: submitNow,
      },
    );
    setExisting(res.report);
    setCheck(res.check);
    setForm(fromReport(res.report));
    setSaved({ warnings: res.warnings || [], submitted: res.report.submitted });
    flashSaved();
    loadHistory();
  }

  /**
   * "Xác nhận dời": đẩy nhóm khách vào SỔ BOOKING của ngày dời — nhóm hiện
   * trong "🛫 Booking bay ngày đó" kèm nhãn "dời từ hôm nay" + tên/SĐT/ghi chú.
   * Xong tự lưu lại báo cáo để ghi nhớ đã đẩy (không đẩy trùng lần hai).
   */


  if (loading || !user || !spot) {
    return <PageLoading />;
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
    >
      {/* Lệnh soát lại của kế toán cho đúng ngày đang mở */}
      {/* Chọn NƠI LÀM VIỆC + NGÀY ngay trên đầu — bản thứ hai nằm cạnh form bên dưới */}
      <DateBar
        date={date}
        onChange={setDate}
        min={shiftDateKey(today, -BACKDATE_LIMIT_DAYS)}
        loading={loadingDay}
        spot={spot}
        spotOptions={spotOptions}
        onSpotChange={(v) => setSpot(v as never)}
      />

      <ReviewNotices spot={spot} date={date} />

      {/* Cờ đỏ: thư OTA huỷ/đổi lịch chờ duyệt tay — máy không tự sửa lịch.
          QUẦY VÉ tạm thời không thấy mục thư OTA (cả cờ đỏ lẫn lịch sử). */}
      {user.role !== "counter" && <OtaReviewFlag spot={spot} />}

      {/* Lệnh thu tiền chờ mình — việc phải làm ngay */}
      {user.role !== "counter" && <CollectInbox spot={spot} />}

      {/* Booking đặt trước bay ĐÚNG ngày đang xem — bay xong bấm Hoàn thành */}
      <BookingTodayBanner spot={spot} date={date} collapsible defaultOpen />

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
        <Banner tone="success">
          ✅ <strong>{closedBy || "Kế toán"} đã chốt ngày {formatDateKeyVN(date)}</strong> — số liệu đã khoá, chỉ xem được.
        </Banner>
      )}

      <DateBar
        date={date}
        onChange={setDate}
        min={shiftDateKey(today, -BACKDATE_LIMIT_DAYS)}
        loading={loadingDay}
        spot={spot}
        spotOptions={spotOptions}
        onSpotChange={(v) => setSpot(v as never)}
      />

      {/* ============ DESKTOP 2 CỘT CỐ ĐỊNH — MỘT lưới duy nhất, hai cột độc lập ============
          TRÁI: form nhập hằng ngày (khách, vé, dịch vụ, THU CHI, nút lưu) + ghi chú + tiền bạc
          PHẢI: lệnh thu + khách huỷ/dời/ngoại giao + lịch sử */}
      <div className="space-y-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0">
      <div className="space-y-3">
      <form onSubmit={submit} className="space-y-3">
        {/* Ô quan trọng nhất của quầy — thanh ngang luôn mở: tiêu đề bên trái, cụm đếm bên phải */}
        <div className="rounded-2xl border-2 border-rose-300 bg-rose-50/70 px-4 py-2.5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-base font-bold text-rose-900">Tổng khách trong ngày</span>
            <div className="ml-auto">
              <CountInput compact value={form.guestCount} onChange={(v) => set("guestCount", v)} max={5000} />
            </div>
          </div>
          <div className="mt-0.5 text-[11px] text-rose-900/60">
            {noTickets
              ? "Tự cộng theo booking đã tích “đã bay” — sửa tay được."
              : "Tự cộng theo dải mã vé đã xuất + khách bay không vé — sửa tay được."}
            {!noTickets && noTicketGuests > 0 && (
              <span className="ml-1 font-semibold">(gồm {noTicketGuests} khách bay không vé)</span>
            )}
            {autoGuests > 0 && form.guestCount !== autoGuests && (
              <button
                type="button"
                className="ml-2 font-semibold text-rose-800 underline"
                onClick={() => {
                  lastAutoGuests.current = autoGuests;
                  set("guestCount", autoGuests);
                }}
              >
                Lấy {autoGuests}
              </button>
            )}
            {/* Điểm vé đếm theo DẢI VÉ, nhưng sổ booking là nguồn thứ hai: tích
                "đã bay" 4 booking mà ô này vẫn 2 nghĩa là dải vé nhập thiếu —
                hiện số của sổ booking kèm nút lấy để khỏi ngồi đoán vì đâu lệch. */}
            {!noTickets && flownGuests > 0 && form.guestCount !== flownGuests && (
              <span className="ml-2">
                · sổ booking đã tích “đã bay”: <strong>{flownGuests}</strong> khách
                <button
                  type="button"
                  className="ml-1 font-semibold text-rose-800 underline"
                  onClick={() => {
                    lastAutoGuests.current = flownGuests;
                    set("guestCount", flownGuests);
                  }}
                >
                  Lấy {flownGuests}
                </button>
              </span>
            )}
          </div>
        </div>

        {/* Vé chỉ có ở điểm xuất vé giấy — vẫn gập cho gọn */}
        {!noTickets && (
        <CollapseCard title="Vé trong ngày" hint="vé xuất, vé thu về, dải mã">
          <div className="grid gap-3 @md:grid-cols-2">
            <Field label="Số vé xuất ra" hint="Tự đếm theo dải mã vé bên dưới">
              <CountInput value={form.ticketsIssued} onChange={(v) => set("ticketsIssued", v)} max={5000} />
            </Field>
            <Field label="Số vé thu về" hint="Vé huỷ + vé dời lịch">
              <CountInput value={form.ticketsReturned} onChange={(v) => set("ticketsReturned", v)} max={5000} />
            </Field>
          </div>

          <div className="mt-4">
            <Field
              label="Dải mã vé đã xuất"
            >
              <div />
            </Field>
            <RangeRows rows={form.issuedRanges} onChange={(rows) => set("issuedRanges", rows)} disabled={locked} />
          </div>

          {rangeMismatch && !locked && (
            <div className="mt-3">
              <Banner tone="warning">
                Các dải mã cho ra {rangeTotal} vé, mà ô “số vé xuất ra” đang là {form.ticketsIssued} (đã sửa tay).
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
          title="Thống kê dịch vụ tuỳ chọn"
        >
          {/* Cộng dồn dịch vụ của khách đã tích "đã bay" — bấm là điền vào ô */}
          <FlownServicesHint
            spot={spot}
            date={date}
            onData={(f) => {
              setFlownGuests(f.guests);
              setNoTicketGuests(f.noTicketGuests ?? 0);
            }}
            onTake={(f) =>
              setForm((prev) => ({
                ...prev,
                flycam: f.flycam,
                video360: f.video360,
                redFlag: f.redFlag,
                sunset: f.sunset,
                flagFlight: f.flagFlight,
              }))
            }
          />

          {/* Mỗi dịch vụ một khung màu riêng — 3 khung/hàng khi đủ rộng cho 5 dịch vụ nằm gọn 2 hàng */}
          <div className="grid grid-cols-2 gap-2 @md:grid-cols-3">
            <ServiceBox tone="flycam" label="Flycam">
              <CountInput compact value={form.flycam} onChange={(v) => set("flycam", v)} max={1000} />
            </ServiceBox>
            <ServiceBox tone="video360" label="Camera 360">
              <CountInput compact value={form.video360} onChange={(v) => set("video360", v)} max={1000} />
            </ServiceBox>
            <ServiceBox tone="redFlag" label="Dù cờ đỏ">
              <CountInput compact value={form.redFlag} onChange={(v) => set("redFlag", v)} max={1000} />
            </ServiceBox>
            {spot !== "sapa" && (
            <ServiceBox tone="sunset" label="Bay hoàng hôn/săn mây">
              <CountInput compact value={form.sunset} onChange={(v) => set("sunset", v)} max={1000} />
            </ServiceBox>
            )}
            <ServiceBox tone="flagFlight" label="Bay kéo cờ/bánh">
              <CountInput compact value={form.flagFlight} onChange={(v) => set("flagFlight", v)} max={1000} />
            </ServiceBox>
          </div>

          <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <summary className="cursor-pointer text-sm font-medium text-slate-700">
              Mã vé từng dịch vụ — không bắt buộc, điền khi cần soát lệch
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-2 @md:grid-cols-3">
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
              {spot !== "sapa" && (
              <ServiceBox tone="sunset" label="Mã vé hoàng hôn/săn mây">
                <TextInput
                  value={form.sunsetCodesText}
                  onChange={(e) => set("sunsetCodesText", e.target.value.toUpperCase())}
                  autoCapitalize="characters"
                  spellCheck={false}
                  disabled={locked}
                />
              </ServiceBox>
              )}
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





        {/* Khách mua thêm dịch vụ tại bãi — đứng ngay trên sổ THU CHI vì tiền
            thu ở đây chảy thẳng vào sổ đó */}
        <AddServicesCard spot={spot} date={date} />

        {/* KHÁCH HUỶ / DỜI LỊCH nằm CỘT TRÁI, trên sổ THU CHI: huỷ hay dời là kéo
            theo tiền hoàn và phí — phải đọc liền mạch với sổ tiền ngay bên dưới,
            chứ không nằm lạc ở cột phải cùng mấy mục tra cứu. */}
        <CollapseCard title="Khách huỷ / dời lịch">
          <CancelMoveCard
            spot={spot}
            date={date}
            bookings={dayBookings}
            cancelled={cancelledBookings}
            movedOut={movedOutBookings}
            cancelRows={form.cancelledGuests}
            moveRows={form.rescheduledGuests}
            onCancelRows={(rows) => set("cancelledGuests", rows)}
            onMoveRows={(rows) => set("rescheduledGuests", rows)}
            withCodes={!noTickets}
            disabled={locked}
            onChanged={() => loadDay(date)}
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
          title="THU CHI & TIỀN NONG"
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

          {/* Tiền nong (giao tiền, ứng, ai đang giữ bao nhiêu) — chung thẻ, mọi nút bên trong đều type="button" nên không đụng nút Lưu báo cáo */}
          <HandoverBox spot={spot} boardDate={date} embedded />
        </CollapseCard>


        {/* Nút lưu KHÔNG nằm ở đây nữa: cả hai nằm ở thanh cuối trang, sau khi
            đã xem hết cả hai cột (khách huỷ/dời, ngoại giao cũng là số của ca). */}
      </form>

      <CollapseCard title="Ghi chú">
        <TextArea
          value={form.note}
          onChange={(e) => set("note", e.target.value)}
          placeholder="Khách nợ, vé in lỗi, ca làm việc…"
          disabled={locked}
        />
      </CollapseCard>


      {/* Quét giấy tờ khách để làm bảo hiểm bay */}
      <IdScanCard />
      </div>

      <div className="space-y-3">
        {/* Khách chốt lịch trả TM tại bãi / CK về TK công ty — lập lệnh thu.
            QUẦY VÉ không có chức năng này. */}
        {user.role !== "counter" && <CollectCreate spot={spot} />}

        {/* Các mục ít dùng — gập mặc định, bấm mới xổ */}
        {/* Lệnh hoàn tiền mình đã lập — theo dõi kế toán chuyển tới đâu */}
        <RefundCard spot={spot} date={date} />


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

      <PeriodSummary spot={spot} title="Tổng theo chu kỳ" />

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
                    <div className="font-medium text-slate-900">
                      {formatDateKeyVN(r.date)}
                      <span
                        className={
                          "ml-2 rounded px-1.5 py-0.5 text-[11px] font-semibold " +
                          (r.submitted ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900")
                        }
                      >
                        {r.submitted ? "đã chốt" : "còn nháp"}
                      </span>
                    </div>
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

      {/* Lịch sử thư OTA — cột phải, và QUẦY VÉ không cần xem mục này */}
      {user.role !== "counter" && <OtaMailCard spot={spot} />}
      </div>
      </div>

      {/* ============ THANH LƯU — CUỐI TRANG, DƯỚI CẢ HAI CỘT ============
          Trước đây thanh này nằm giữa trang (cuối cột trái) nên bấm lưu xong
          vẫn còn khách huỷ/dời + ngoại giao ở cột phải chưa xem tới. Đưa xuống
          đây thì thứ tự làm việc là: nhập hết → xem lại cả trang → lưu.

          Hai nút y như phi công/camera man: LƯU NHÁP để khỏi mất số khi ca còn
          dài, CHỐT BÁO CÁO khi hết ca — kế toán chỉ soát bản đã chốt. */}
      <div className="mt-3 space-y-3">
        {error && <Banner tone="error">{error}</Banner>}

        {saved && (
          <Banner tone="success" onClose={() => setSaved(null)}>
            <strong>
              {saved.submitted ? "Đã chốt báo cáo" : "Đã lưu nháp"} ngày {formatDateKeyVN(date)}.
            </strong>
            {saved.warnings.length > 0 && (
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs">
                {saved.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}
          </Banner>
        )}

        {date > today && (
          <Banner tone="info">
            📅 Ngày {formatDateKeyVN(date)} ở tương lai — xem trước lịch booking, đến ngày mới nhập báo cáo được.
          </Banner>
        )}

        {!locked && date <= today && existing && (
          <p className={"text-center text-xs " + (existing.submitted ? "text-emerald-700" : "text-amber-700")}>
            {existing.submitted
              ? "✓ Ca này đã chốt — sửa tiếp thì nhớ bấm Chốt lại."
              : "Đang là bản nháp — hết ca nhớ bấm Chốt báo cáo cho kế toán soát."}
          </p>
        )}

        {!locked && date <= today && (
          <div className="sticky bottom-3 z-10 flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => save(false)}
              disabled={saving !== null || loadingDay}
              className="flex-1 bg-white shadow-lg"
            >
              {saving === "draft" ? "Đang lưu…" : "Lưu nháp"}
            </Button>
            <Button
              type="button"
              onClick={() => save(true)}
              disabled={saving !== null || loadingDay}
              className="flex-1 shadow-lg"
            >
              {saving === "submit" ? "Đang chốt…" : existing?.submitted ? "Chốt lại" : "Chốt báo cáo"}
            </Button>
            {/* Dấu xong ngay cạnh nút — băng thông báo bên dưới dễ trôi khỏi màn */}
            <DoneTag show={justSaved}>{saved?.submitted ? "Đã chốt" : "Đã lưu"}</DoneTag>
          </div>
        )}
      </div>
    </Shell>
  );
}
