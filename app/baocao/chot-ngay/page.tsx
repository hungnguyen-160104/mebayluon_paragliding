// app/baocao/chot-ngay/page.tsx
"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { formatDateKeyVN, shiftDateKey, todayInVN } from "@/lib/baobay/date";
import type { DailyCloseDTO, ReconcileDTO } from "@/lib/baobay/types";
import { BACKDATE_LIMIT_DAYS } from "@/lib/baobay/validation";
import { ROLE_LABEL } from "@/lib/baobay/roles";
import { formatVND } from "@/lib/pricing";

import { apiGet, apiPatch, apiPost } from "../components/client-api";
import {
  toRangeRows,
  toRescheduleRows,
  type RangeRow,
  type RescheduleRow,
  toExpenseRows,
  ExpenseRows,
  type CancelGuestRow,
  type RescheduleGuestRow,
  type ExpenseRow,
} from "../components/rows";
import { DateBar } from "../components/DateBar";
import { AddServicesCard } from "../components/AddServicesCard";
import { BookingCard, BookingTodayBanner } from "../components/BookingCard";
import { CollectCreate, CollectInbox } from "../components/CollectBox";
import { FlownServicesHint, type FlownServices } from "../components/FlownServicesHint";
import { HandoverBox } from "../components/HandoverBox";
import { FlycamCancelCard } from "../components/FlycamCancelCard";
import { MoneyBoardCard } from "../components/MoneyBoardCard";
import { RefundCard } from "../components/RefundCard";
import { IdScanCard } from "../components/IdScanCard";
import { OtaMailCard, OtaReviewFlag } from "../components/OtaMailCard";
import { PilotReportEditor } from "../components/PilotReportEditor";
import { StaffReportEditor } from "../components/StaffReportEditor";
import { useBaobaySession } from "../components/session";
import { useSpot } from "../components/spot";
import { Shell } from "../components/Shell";
import { Banner, Button, CollapseCard, CountInput, DoneTag, PageLoading, Readout, ServiceBox, TextArea, TextInput, useDoneFlag } from "../components/ui";

/**
 * Kế toán tổng hợp chốt ngày.
 *
 * Kế toán TỰ GÕ số tổng của mình — app không điền hộ. Bên cạnh mỗi ô có con số
 * app cộng từ báo cáo nhân viên kèm nút "lấy số này": tiện khi hai bên đã khớp,
 * mà vẫn giữ được ý nghĩa đối chiếu (nếu app điền hộ thì chẳng còn gì để so).
 *
 * Hai việc duyệt trước khi chốt:
 *  - XÁC NHẬN CHI TIÊU: mọi khoản nhân viên khai được liệt kê để kế toán đọc.
 *  - DUYỆT LỆCH dịch vụ gia tăng (flycam/360): khách phát sinh tại bãi là chuyện
 *    thật, nên lệch không chặn cứng — kế toán duyệt là chốt được.
 *
 * Bấm "Chốt ngày" chỉ được khi sạch lỗi đỏ. Chốt xong ngày bị KHOÁ: mọi nhân
 * viên hết sửa được, và ngày đó mới được tính vào tổng của kỳ.
 */

/** Số nhân viên báo, do máy chủ gom — nguồn cho nút "chép để xác nhận". */
type CloseSuggestion = {
  guestCount: number;
  /** Khách bay KHÔNG VÉ theo sổ booking. */
  noTicketGuests: number;
  ticketsIssued: number;
  ticketsReturned: number;
  cancelledCount: number;
  cancelledRefundCount: number;
  cancelledNoRefundCount: number;
  rescheduledCount: number;
  /** Số KHÁCH dời lịch — gom quầy khai + sổ booking, đếm theo đầu khách. */
  rescheduledGuestCount: number;
  /** Trong số đó, bao nhiêu khách ĐÃ cầm vé — vé của họ phải được thu hồi. */
  rescheduledTicketGuests: number;
  issuedRanges: Array<{ from: string; to: string }>;
  /** Dải mã dựng tự động từ mã phi công báo đã bay (+PPG). */
  pilotRanges: Array<{ from: string; to: string }>;
  cancelledCodesText: string;
  rescheduled: Array<{ code: string; toDate: string; note: string }>;
  cashTotal: number;
  transferTotal: number;
  reportedBy: Record<string, Array<{ name: string; qty: number }>>;
  /** Tiền sổ booking ghi dưới tên từng người (TM theo người thu, CK theo người ghi). */
  moneyByPerson: Array<{ name: string; cash: number; transfer: number; income: number; spend: number }>;
  booking: {
    flycam: number;
    video360: number;
    redFlag: number;
    sunset: number;
    flagFlight: number;
    hasData: boolean;
  };
  insurance: {
    sent: number;
    recalled: number;
    active: number;
    notSent: number;
    notSentBookings: Array<{ label: string; guests: number; reason: string }>;
  };
  agencyHeld: Array<{ name: string; amount: number; bookings: string[] }>;
  agencyHeldTotal: number;
  overpaidBookings: Array<{ label: string; amount: number; undoneChanges: number }>;
  dispatcherSpend: number;
  registeredGuests: number;
  /** Khách đã xác nhận bay trong sổ booking — đăng ký trừ huỷ/dời. */
  flownGuests: number;
  /** Chuyến PPG phi công khai thêm ngoài sổ booking — vẫn là khách bay thật. */
  pilotExtraPpg?: number;
  cancelledGuestEntries: Array<{
    /** Hoàn bằng CK (từ TK công ty) hay TM (nhân viên chi tại chỗ). */
    refundMethod?: "cash" | "transfer";
    name: string;
    bookingCode: string;
    guests: number;
    source: string;
    refund: number;
    note?: string;
    codes?: string[];
  }>;
  rescheduledGuestEntries: Array<{
    name: string;
    guests: number;
    toDate: string;
    note?: string;
    phone?: string;
    pickup?: "self" | "other";
    pickupNote?: string;
    expectedTime?: string;
    codes?: string[];
    bookedId?: string;
  }>;
  dispatcherLedger: Array<{ content: string; amount: number; kind: "thu" | "chi"; method?: "cash" | "transfer" }>;
  dispatcherNames: string[];
  flycam: number;
  video360: number;
  redFlag: number;
  sunset: number;
  flagFlight: number;
  pilot: { flights: number; ppg: number; ppgNoTicket?: number; flycam: number; video360: number; redFlag: number; sunset: number; flagFlight: number; hasData: boolean };
  dispatcher: { flycam: number; video360: number; redFlag: number; sunset: number; flagFlight: number; hasData: boolean };
  hasData: boolean;
};

type FormState = {
  /** Khách bay KHÔNG VÉ theo sổ booking. */
  noTicketGuests: number;
  guestCount: number;
  ticketsIssued: number;
  ticketsReturned: number;
  cancelledCount: number;
  cancelledRefundCount: number;
  cancelledNoRefundCount: number;
  rescheduledCount: number;
  issuedRanges: RangeRow[];
  cancelledCodesText: string;
  cancelledNote: string;
  rescheduled: RescheduleRow[];
  /** Hà Nội (không xuất vé): khách đăng ký + nhóm khách huỷ/dời. */
  registeredGuests: number;
  cancelledGuests: CancelGuestRow[];
  rescheduledGuests: RescheduleGuestRow[];
  cashTotal: number;
  transferTotal: number;
  flycam: number;
  video360: number;
  redFlag: number;
  sunset: number;
  flagFlight: number;
  ledger: ExpenseRow[];
  /** Dấu duyệt/từ chối từng khoản nhân viên khai — khoá theo expenseLines.key. */
  expenseReviews: Array<{ key: string; status: "ok" | "no"; reason?: string }>;
  expensesApproved: boolean;
  expensesApprovedNote: string;
  varianceApproved: boolean;
  varianceNote: string;
  note: string;
};

const EMPTY_FORM: FormState = {
  guestCount: 0,
  noTicketGuests: 0,
  ticketsIssued: 0,
  ticketsReturned: 0,
  cancelledCount: 0,
  cancelledRefundCount: 0,
  cancelledNoRefundCount: 0,
  rescheduledCount: 0,
  issuedRanges: [{ from: "", to: "" }],
  cancelledCodesText: "",
  cancelledNote: "",
  rescheduled: [{ code: "", toDate: "", note: "" }],
  registeredGuests: 0,
  cancelledGuests: [{ name: "", bookingCode: "", guests: 0, source: "", refund: 0, note: "", codesText: "" }],
  rescheduledGuests: [
    { name: "", guests: 0, toDate: "", note: "", phone: "", pickup: "self", pickupNote: "", expectedTime: "", codesText: "", bookedId: "" },
  ],
  cashTotal: 0,
  transferTotal: 0,
  flycam: 0,
  video360: 0,
  redFlag: 0,
  sunset: 0,
  flagFlight: 0,
  ledger: [],
  expenseReviews: [],
  expensesApproved: false,
  expensesApprovedNote: "",
  varianceApproved: false,
  varianceNote: "",
  note: "",
};

/**
 * useSearchParams() bắt buộc phải nằm trong <Suspense> khi build production
 * (Next dừng build nếu thiếu) — nên tách phần thân trang ra một component con.
 */
export default function DailyClosePage() {
  return (
    <Suspense
      fallback={<PageLoading />}
    >
      <DailyCloseInner />
    </Suspense>
  );
}

function DailyCloseInner() {
  const { user, loading } = useBaobaySession("accountant");
  const { spot, setSpot, options: spotOptions } = useSpot(user?.spots);
  const searchParams = useSearchParams();

  const today = todayInVN();
  const [date, setDate] = useState(() => {
    const q = searchParams.get("date");
    return q && /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : today;
  });
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  /** Số cộng từ SỔ BOOKING (đã bay) — để đối chiếu và vẽ dòng "ai nhập bao nhiêu". */
  const [flown, setFlown] = useState<FlownServices | null>(null);
  const [suggest, setSuggest] = useState<CloseSuggestion | null>(null);
  /** Khung "yêu cầu soát lại": chủ đề + lời nhắn + các lệnh đang treo. */
  const [reviewTopic, setReviewTopic] = useState("flycam");
  const [reviewNote, setReviewNote] = useState("");
  const [reviews, setReviews] = useState<Array<{ id: string; topicLabel: string; note: string; resolvedAt?: string; requestedBy: string }>>([]);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [close, setClose] = useState<DailyCloseDTO | null>(null);
  const [check, setCheck] = useState<ReconcileDTO | null>(null);
  const [loadingDay, setLoadingDay] = useState(false);
  /** Tăng sau mỗi lần tải/lưu/chốt để bảng phạt nộp muộn tải lại theo. */
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState<"save" | "close" | "reopen" | null>(null);
  /** Dấu "✓ Đã lưu / Đã chốt / Đã gỡ khoá" cạnh nút vừa bấm. */
  const [justDone, flashDone] = useDoneFlag();
  const [doneWhat, setDoneWhat] = useState("Đã lưu");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  /** Vừa lưu thành công và CHƯA sửa gì thêm — nút Lưu chuyển "✓ Đã lưu" cho tới khi sửa. */
  const [savedClean, setSavedClean] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setSavedClean(false);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const locked = close?.status === "closed";

  /** Hà Nội không xuất vé — form chốt chạy theo KHÁCH thay vì mã vé. */
  const noTickets = spot === "ha-noi";

  /**
   * Tổng tiền mặt / chuyển khoản KHÔNG nhập tay nữa — tự cộng từ các dòng THU
   * trong sổ "Tiền trong ngày" theo tick TM/CK. Kế toán kê dòng nào thì tổng
   * chạy theo dòng đó; CK cũng phải kê (tiền về tài khoản công ty vẫn là thu
   * trong ngày của báo cáo).
   */
  const ledgerCash = useMemo(
    () => form.ledger.reduce((a, e) => a + (e.kind === "thu" && e.method !== "transfer" ? e.amount || 0 : 0), 0),
    [form.ledger],
  );
  const ledgerTransfer = useMemo(
    () => form.ledger.reduce((a, e) => a + (e.kind === "thu" && e.method === "transfer" ? e.amount || 0 : 0), 0),
    [form.ledger],
  );

  const rescheduledFilled = form.rescheduled.filter((r) => r.code.trim());

  const apply = useCallback((res: { close: DailyCloseDTO | null; reconcile: ReconcileDTO; suggest?: CloseSuggestion }) => {
    setClose(res.close);
    setCheck(res.reconcile);
    if (res.suggest) setSuggest(res.suggest);
    setReloadKey((k) => k + 1);
    setForm(
      res.close
        ? {
            guestCount: res.close.guestCount,
            noTicketGuests: res.close.noTicketGuests ?? 0,
            ticketsIssued: res.close.ticketsIssued,
            ticketsReturned: res.close.ticketsReturned,
            cancelledCount: res.close.cancelledCount,
            cancelledRefundCount: res.close.cancelledRefundCount ?? 0,
            cancelledNoRefundCount: res.close.cancelledNoRefundCount ?? 0,
            rescheduledCount: res.close.rescheduledCount,
            issuedRanges: toRangeRows(res.close.issuedRanges),
            cancelledCodesText: res.close.cancelledCodes.join(", "),
            cancelledNote: res.close.cancelledNote,
            rescheduled: toRescheduleRows(res.close.rescheduled),
            registeredGuests: res.close.registeredGuests,
            cancelledGuests: res.close.cancelledGuestEntries.length
              ? res.close.cancelledGuestEntries.map((e) => ({
                  ...e,
                  note: e.note || "",
                  codesText: (e.codes ?? []).join(", "),
                }))
              : EMPTY_FORM.cancelledGuests,
            rescheduledGuests: res.close.rescheduledGuestEntries.length
              ? res.close.rescheduledGuestEntries.map((e) => ({
                  ...e,
                  note: e.note || "",
                  phone: e.phone || "",
                  pickup: e.pickup === "other" ? ("other" as const) : ("self" as const),
                  pickupNote: e.pickupNote || "",
                  expectedTime: e.expectedTime || "",
                  codesText: (e.codes ?? []).join(", "),
                  bookedId: e.bookedId || "",
                }))
              : EMPTY_FORM.rescheduledGuests,
            cashTotal: res.close.cashTotal,
            transferTotal: res.close.transferTotal,
            flycam: res.close.flycam,
            video360: res.close.video360,
            redFlag: res.close.redFlag,
            sunset: res.close.sunset,
            flagFlight: res.close.flagFlight,
            ledger: toExpenseRows(res.close.ledger).filter((e) => e.content || e.amount),
            expenseReviews: res.close.expenseReviews.map((r) => ({ ...r })),
            expensesApproved: res.close.expensesApproved,
            expensesApprovedNote: res.close.expensesApprovedNote,
            varianceApproved: res.close.varianceApproved,
            varianceNote: res.close.varianceNote,
            note: res.close.note,
          }
        : EMPTY_FORM,
    );
  }, []);

  const loadDay = useCallback(
    async (targetDate: string) => {
      if (!spot) return;
      setLoadingDay(true);
      setError(null);
      setMessage(null);
      setWarnings([]);
      setSavedClean(false);
      try {
        apply(
          await apiGet<{ close: DailyCloseDTO | null; reconcile: ReconcileDTO; suggest?: CloseSuggestion }>(
            `/api/baocao/close?date=${targetDate}&spot=${spot}`,
          ),
        );
      } catch (err: any) {
        setError(err?.message || "Không tải được số ngày này");
      } finally {
        setLoadingDay(false);
      }
    },
    [apply, spot],
  );

  useEffect(() => {
    if (user && spot) loadDay(date);
  }, [user, spot, date, loadDay]);

  useEffect(() => {
    if (!user || !spot) return;
    let alive = true;
    apiGet<{ reviews: typeof reviews }>(`/api/baocao/review?date=${date}&spot=${spot}`)
      .then((r) => {
        if (alive) setReviews(r.reviews);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user, spot, date, reloadKey]);

  /**
   * Lấy số QUẦY/ĐIỀU PHỐI báo: hai vai NGANG CẤP, cùng một bản báo cáo ngày, ai
   * trực thì người đó khai — phía này nắm mặt vé và tiền nên cho được trọn bộ:
   * khách, vé, dải mã, huỷ/dời, tiền, và cả ba dịch vụ theo con số quầy đếm.
   */
  function copyFromDispatcher() {
    if (!suggest?.dispatcher.hasData) return;
    setForm((prev) => ({
      ...prev,
      /**
       * SỐ KHÁCH ĐÃ BAY lấy theo SỔ BOOKING (`flownGuests`), không lấy số quầy
       * tự khai (`guestCount`).
       *
       * Quầy đếm đầu ngày rồi số đứng yên: khách huỷ giữa chừng, vé thu hồi
       * lại, nhưng con số quầy khai vẫn là con số cũ. Ngày 25/08 xuất 7 vé,
       * huỷ 1, bay thật 6 — quầy khai 7 còn sổ booking (đếm dòng đã tích "đã
       * bay") ra đúng 6. Điền sẵn số quầy là kế toán chốt nhầm 7.
       *
       * Số quầy vẫn hiện ngay dưới ô để đối chiếu, bấm một cái là lấy lại.
       */
      /**
       * + PPG phi công khai NGOÀI sổ booking: PPG hay bay không kịp lập
       * booking (khách tới bãi hỏi bay luôn), sổ booking không có dòng nào để
       * tích — điều phối cũng không nắm hết. Phi công đã khai thì chuyến đó là
       * khách bay thật, phải vào số tổng trong ngày.
       */
      guestCount: (suggest.flownGuests ?? suggest.guestCount) + (suggest.pilotExtraPpg ?? 0),
      ticketsIssued: suggest.ticketsIssued,
      ticketsReturned: suggest.ticketsReturned,
      cancelledCount: suggest.cancelledCount,
      cancelledRefundCount: suggest.cancelledRefundCount ?? 0,
      cancelledNoRefundCount: suggest.cancelledNoRefundCount ?? 0,
      rescheduledCount: suggest.rescheduledCount,
      issuedRanges: suggest.issuedRanges.length ? suggest.issuedRanges.map((r) => ({ ...r })) : prev.issuedRanges,
      cancelledCodesText: suggest.cancelledCodesText,
      rescheduled: suggest.rescheduled.length ? suggest.rescheduled.map((r) => ({ ...r })) : prev.rescheduled,
      cashTotal: suggest.cashTotal,
      transferTotal: suggest.transferTotal,
      flycam: suggest.dispatcher.flycam,
      video360: suggest.dispatcher.video360,
      redFlag: suggest.dispatcher.redFlag,
      sunset: suggest.dispatcher.sunset,
      flagFlight: suggest.dispatcher.flagFlight,
    }));
    setMessage("Đã lấy số QUẦY/ĐIỀU PHỐI báo — soát lại rồi bấm Lưu.");
  }

  /**
   * Lấy số DỊCH VỤ THEO SỔ BOOKING — nguồn chuẩn để cân tiền.
   *
   * Sổ booking là nơi mọi lệnh thêm/bớt dịch vụ tại bãi ghi vào (kể cả lệnh
   * bị bỏ), nên nó luôn khớp với số tiền đã thu; báo cáo nhân viên khai một
   * lần rồi đứng yên. Chỉ đụng 5 ô dịch vụ, không đụng khách/vé/tiền.
   */
  function copyFromBookings() {
    if (!suggest?.booking?.hasData) return;
    setForm((prev) => ({
      ...prev,
      flycam: suggest.booking.flycam,
      video360: suggest.booking.video360,
      redFlag: suggest.booking.redFlag,
      sunset: suggest.booking.sunset,
      flagFlight: suggest.booking.flagFlight,
    }));
    setMessage("Đã lấy số dịch vụ theo SỔ BOOKING — số này khớp với tiền đã thu.");
  }

  /**
   * Lấy tổng số PHI CÔNG báo: phi công chỉ nắm phần mình bay — dịch vụ trên
   * từng chuyến và tổng chuyến. Khách/tiền/dải mã là việc của quầy, giữ nguyên.
   */
  function copyFromPilots() {
    if (!suggest?.pilot.hasData) return;
    setForm((prev) => ({
      ...prev,
      // Khách theo PHI CÔNG = tổng chuyến PG + PPG (khách PPG cũng là khách bay)
      guestCount: suggest.pilot.flights + suggest.pilot.ppg,
      flycam: suggest.pilot.flycam,
      video360: suggest.pilot.video360,
      redFlag: suggest.pilot.redFlag,
      sunset: suggest.pilot.sunset,
      flagFlight: suggest.pilot.flagFlight,
      // Dải mã dựng tự động từ mã phi công báo đã bay — quầy chưa nhập thì đỡ phải dò tay
      issuedRanges: suggest.pilotRanges.length ? suggest.pilotRanges.map((r) => ({ ...r })) : prev.issuedRanges,
    }));
    setMessage(
      `Đã lấy tổng PHI CÔNG báo (flycam/360/kéo cờ; tổng ${suggest.pilot.flights} chuyến)` +
        (suggest.pilotRanges.length
          ? ` + dải mã ${suggest.pilotRanges.map((r) => `${r.from}–${r.to}`).join(", ")} dựng từ mã đã bay`
          : "") +
        ` — khách và tiền vẫn theo số đang nhập.`,
    );
  }

  /** Gửi lệnh "soát lại" tới đúng các vai trò của chủ đề (flycam -> điều phối + camera man…). */
  async function sendReview() {
    setReviewBusy(true);
    try {
      await apiPost(`/api/baocao/review?spot=${spot}`, { date, topic: reviewTopic, note: reviewNote });
      setReviewNote("");
      const r = await apiGet<{ reviews: typeof reviews }>(`/api/baocao/review?date=${date}&spot=${spot}`);
      setReviews(r.reviews);
      setMessage("Đã gửi yêu cầu soát lại — lệnh hiện ngay trên trang của các vai trò liên quan.");
    } catch (err: any) {
      setError(err?.message || "Không gửi được yêu cầu");
    } finally {
      setReviewBusy(false);
    }
  }

  async function resolveReview(id: string) {
    try {
      await apiPatch(`/api/baocao/review?spot=${spot}`, { id });
      setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, resolvedAt: new Date().toISOString() } : r)));
    } catch (err: any) {
      setError(err?.message || "Không đánh dấu được");
    }
  }

  /** "fiona" / "fiona + havan" — nút chấp nhận ghi rõ số đến từ ai. */
  const reporterNames = suggest?.dispatcherNames.length ? suggest.dispatcherNames.join(" + ") : "điều phối";

  async function action(kind: "save" | "close" | "reopen") {
    setError(null);
    setMessage(null);
    setBusy(kind);
    try {
      if (kind === "save") {
        const res = await apiPost<{ close: DailyCloseDTO; warnings: string[]; reconcile: ReconcileDTO }>(
          `/api/baocao/close?spot=${spot}`,
          {
            action: "save",
            date,
            ...form,
            cashTotal: ledgerCash,
            transferTotal: ledgerTransfer,
            issuedRanges: form.issuedRanges.filter((r) => r.from.trim() || r.to.trim()),
            rescheduled: rescheduledFilled,
            ledger: form.ledger.filter((e) => e.content.trim() || e.amount),
            cancelledGuestEntries: form.cancelledGuests.filter((e) => e.name.trim() || e.guests || e.bookingCode.trim()),
            rescheduledGuestEntries: form.rescheduledGuests.filter((e) => e.name.trim() || e.guests || e.toDate),
          },
        );
        apply(res);
        setWarnings(res.warnings || []);
        setSavedClean(true);
        setDoneWhat("Đã lưu");
        flashDone();
        setMessage(`Đã lưu số chốt ngày ${formatDateKeyVN(date)} (chưa chốt).`);
        return;
      }

      if (kind === "close") {
        /**
         * LƯU trước — CHỐT sau, trong một cú bấm. Trước đây nút Chốt dựa vào
         * kết quả đối chiếu của lần lưu TRƯỚC: kế toán vừa sửa số hay vừa tick
         * "chấp nhận lệch" mà bấm Chốt ngay là bị trạng thái cũ chặn oan,
         * tưởng "sửa hết lỗi mà vẫn không cho chốt".
         */
        const saved = await apiPost<{ close: DailyCloseDTO; warnings: string[]; reconcile: ReconcileDTO }>(
          `/api/baocao/close?spot=${spot}`,
          {
            action: "save",
            date,
            ...form,
            cashTotal: ledgerCash,
            transferTotal: ledgerTransfer,
            issuedRanges: form.issuedRanges.filter((r) => r.from.trim() || r.to.trim()),
            rescheduled: rescheduledFilled,
            ledger: form.ledger.filter((e) => e.content.trim() || e.amount),
            cancelledGuestEntries: form.cancelledGuests.filter((e) => e.name.trim() || e.guests || e.bookingCode.trim()),
            rescheduledGuestEntries: form.rescheduledGuests.filter((e) => e.name.trim() || e.guests || e.toDate),
          },
        );
        apply(saved);
        setWarnings(saved.warnings || []);
        setSavedClean(true);
        if (!saved.reconcile.canClose) {
          const reds = saved.reconcile.issues.filter((i) => i.severity === "red");
          setError(
            `Đã lưu số nhưng còn ${reds.length} lỗi đỏ, chưa chốt được: ${reds[0]?.message ?? ""}`,
          );
          return;
        }
        const res = await apiPost<{ close: DailyCloseDTO; reconcile: ReconcileDTO }>(`/api/baocao/close?spot=${spot}`, {
          action: "close",
          date,
        });
        apply(res);
        setDoneWhat("Đã chốt");
        flashDone();
        setMessage(`Đã CHỐT ngày ${formatDateKeyVN(date)}. Số liệu đã khoá và được tính vào tổng.`);
        return;
      }

      const reason = window.prompt("Gỡ khoá ngày đã chốt — ghi lý do để lưu vết:");
      if (reason === null) return;

      const res = await apiPost<{ close: DailyCloseDTO; reconcile: ReconcileDTO }>(`/api/baocao/close?spot=${spot}`, {
        action: "reopen",
        date,
        reason,
      });
      apply(res);
      setDoneWhat("Đã gỡ khoá");
      flashDone();
      setMessage(`Đã gỡ khoá ngày ${formatDateKeyVN(date)} — nhân viên sửa được số trở lại.`);
    } catch (err: any) {
      setError(err?.message || "Không thực hiện được");
    } finally {
      setBusy(null);
    }
  }

  if (loading || !user || !spot) {
    return <PageLoading />;
  }

  const t = check?.totals;
  const reds = (check?.issues || []).filter((i) => i.severity === "red");
  const warns = (check?.issues || []).filter((i) => i.severity === "warn");
  /** Thu chi NHÂN VIÊN khai (sổ của kế toán sửa ngay bên dưới nên không lặp lại ở danh sách này). */
  const staffLines = (check?.expenseLines || []).filter((e) => e.role !== "accountant");
  const reviewOf = (key: string) => form.expenseReviews.find((r) => r.key === key);
  /** Đặt dấu duyệt/từ chối một khoản; từ chối thì đẩy lệnh soát lại về đúng vai trò. */
  function markExpense(line: (typeof staffLines)[number], status: "ok" | "no", reason?: string) {
    set("expenseReviews", [
      ...form.expenseReviews.filter((r) => r.key !== line.key),
      { key: line.key, status, reason: reason || "" },
    ]);
    if (status === "no") {
      apiPost(`/api/baocao/review?spot=${spot}`, {
        date,
        topic: "general",
        note: `Khoản "${line.content}" ${formatVND(line.amount)} của ${line.who} bị kế toán TỪ CHỐI${reason ? ` — ${reason}` : ""}. Sửa lại báo cáo ngày ${formatDateKeyVN(date)}.`,
      }).catch(() => {
        /* lệnh soát chỉ là kênh báo — dấu từ chối đã lưu trong form */
      });
    }
  }
  const staffThu = staffLines.reduce((a, e) => a + (e.kind === "thu" ? e.amount : 0), 0);
  const staffChi = staffLines.reduce((a, e) => a + (e.kind !== "thu" ? e.amount : 0), 0);
  /** Riêng tiền phi công cầm hộ/thu tại bãi — hiện cạnh tổng thu để kế toán soát. */
  const staffPilotThu = staffLines.reduce(
    (a, e) => a + (e.role === "pilot" && e.kind === "thu" ? e.amount : 0),
    0,
  );

  return (
    <Shell
      user={user}
      title="Chốt ngày"
      subtitle="Nhập số tổng của ngày, đối chiếu với báo cáo nhân viên, duyệt chi tiêu, rồi chốt để khoá số."
    >
      <DateBar
        date={date}
        onChange={setDate}
        min={shiftDateKey(today, -BACKDATE_LIMIT_DAYS)}
        loading={loadingDay}
        spot={spot}
        spotOptions={spotOptions}
        onSpotChange={(v) => setSpot(v as never)}
      />

      {/* Cờ đỏ: thư OTA huỷ/đổi lịch chờ duyệt tay — máy không tự sửa lịch */}
      <OtaReviewFlag spot={spot} />

      {/* Booking đặt trước — thứ hai từ trên xuống, ngay dưới thẻ chọn điểm + ngày */}
      {/* Booking bay đúng ngày đang xem — bản GẬP cho kế toán, bấm tiêu đề mới xổ */}
      <BookingTodayBanner spot={spot} date={date} collapsible />

      <BookingCard spot={spot} spotOptions={spotOptions} />


      {/* Lệnh thu tiền chờ mình xử lý */}
      <CollectInbox spot={spot} />

      <div>
        {!loadingDay && (
          <div className="mt-1">
            {locked ? (
              <Banner tone="success">
                <strong>{close?.closedBy ? `${close.closedBy} đã chốt` : "Ngày này đã chốt"}</strong>
                {close?.closedAt ? ` lúc ${new Date(close.closedAt).toLocaleString("vi-VN")}` : ""}. Số liệu đã
                khoá với mọi nhân viên.
              </Banner>
            ) : check?.empty ? (
              <Banner tone="info">
                <strong>Chưa có dữ liệu.</strong> Ngày này chưa ai báo cáo gì — không phát sinh chuyến bay hay
                thu chi thì không cần xử lý.
              </Banner>
            ) : reds.length ? (
              <Banner tone="error">
                <strong>Ngày đang treo — còn {reds.length} chỗ chưa khớp.</strong> Chưa chốt được cho tới khi
                sạch lỗi đỏ, và ngày này chưa tính vào tổng của kỳ.
              </Banner>
            ) : (
              <Banner tone="success">Không còn lỗi đỏ — chốt được ngày này.</Banner>
            )}
          </div>
        )}
      </div>

      {/* Danh sách lỗi LUÔN HIỆN, không gập — khung gọn, dòng sát nhau */}
      {(reds.length > 0 || warns.length > 0) && (
        <div className="rounded-2xl border-2 border-rose-300 bg-rose-50/60 px-4 py-2.5 lg:[column-span:all]">
          <div className="text-sm font-bold text-rose-900">Cần xử lý ({reds.length + warns.length})</div>
          <ul className="mt-1 space-y-0.5">
            {reds.map((i, k) => (
              <li key={`r${k}`} className="flex gap-1.5 text-sm leading-snug text-rose-900">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                <span>
                  {i.message}
                  {i.who.length > 0 && <span className="text-xs text-rose-600"> — {i.who.join(", ")}</span>}
                </span>
              </li>
            ))}
            {warns.map((i, k) => (
              <li key={`w${k}`} className="flex gap-1.5 text-sm leading-snug text-amber-800">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                <span>{i.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ==================== BỐ CỤC HAI KHỔ ====================
          DESKTOP: 2 cột cố định — TRÁI sổ kế toán (số tổng, THU CHI, duyệt lệch,
          nút chốt) · PHẢI báo cáo nhân viên + tiền nong.

          ĐIỆN THOẠI: một cột, nhưng thẻ xen kẽ giữa hai cột theo thứ tự làm việc
          thật (số tổng → báo cáo phi công → báo cáo quầy → thu chi → tiền nong →
          duyệt lệch → lệnh thu → ghi chú). Làm được nhờ `contents`: trên khổ hẹp
          hai div cột (và cả <form>) biến mất khỏi bố cục nên các thẻ thành con
          trực tiếp của lưới flex, xếp lại được bằng order-*. Lên lg thì hai div
          trở lại thành cột như thường. */}
      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4">
      <div className="contents lg:block lg:space-y-4 lg:order-2">
      {/* Kế toán sửa báo cáo phi công ngay tại đây — sửa xong đối chiếu tự chạy lại */}
      <div className="order-2 lg:order-none">
        <PilotReportEditor spot={spot} date={date} locked={locked} onSaved={() => loadDay(date)} />
      </div>

      {/* Và sửa hộ cả điều phối / camera man — chỗ hay kẹt nhất khi số quầy sai */}
      <div className="order-3 lg:order-none">
        <StaffReportEditor
          spot={spot}
          date={date}
          locked={locked}
          moneyByPerson={suggest?.moneyByPerson}
          onSaved={() => loadDay(date)}
        />
      </div>

      {/* Khách chốt lịch trả TM tại bãi / CK về TK công ty — lập lệnh thu.
          Desktop: đứng cột phải cùng nhóm tiền · Điện thoại: vẫn ở vị trí thứ 7. */}
      <div className="order-7 lg:order-none">
        <CollectCreate spot={spot} />
      </div>

      {/* Lệnh hoàn tiền khách (huỷ bay) — kế toán chuyển khoản rồi xác nhận */}
      <div className="order-6 lg:order-none">
        <RefundCard spot={spot} date={date} canConfirm />
      </div>

      {/* Lệnh hoàn tiền khách do huỷ flycam — kế toán chuyển khoản rồi xác nhận */}
      <div className="order-6 lg:order-none">
        <FlycamCancelCard spot={spot} date={date} canConfirm />
      </div>

      {/* Quét giấy tờ khách để làm bảo hiểm bay */}
      <div className="order-8 lg:order-none">
        <IdScanCard />
      </div>

      {/* Thư OTA: máy đã đưa vào lịch những gì, thư nào cần soát */}
      <div className="order-9 lg:order-none">
        <OtaMailCard spot={spot} />
      </div>
      </div>

      <div className="contents lg:block lg:order-1">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          action("save");
        }}
        className="contents lg:block lg:space-y-4"
      >
        <CollapseCard
          className="order-1 lg:order-none"
          title="Số tổng trong ngày"
        >
          {/**
           * HAI NGUỒN SỐ, ĐẶT CẠNH NHAU ĐỂ CHỌN.
           *
           * Kế toán không gõ số của mình từ đầu: quầy và phi công đều đã báo.
           * Hiện thẳng số của từng bên rồi bấm lấy bên nào — lệch nhau thì nhìn
           * là thấy ngay, khỏi mở hai trang so tay. Lấy xong vẫn sửa tay được.
           */}
          {suggest?.hasData && !locked && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <div className="text-sm font-semibold text-emerald-900">
                Nhân viên đã báo — chọn lấy số của bên nào, khỏi gõ lại:
              </div>
              <div className="mt-2 grid gap-2 @md:grid-cols-2">
                {/* SỔ BOOKING đứng trước: đây là số ăn khớp với tiền, hai bên
                    kia chỉ để đối chiếu (khai một lần đầu ngày rồi đứng yên) */}
                {suggest.booking?.hasData && (
                  <div className="rounded-xl border-2 border-emerald-400 bg-emerald-50/60 p-2.5 @md:col-span-2">
                    <div className="text-xs font-bold text-emerald-900">
                      📒 Sổ booking (đã gồm mọi lệnh thêm/bớt dịch vụ tại bãi) — khớp với tiền
                    </div>
                    <div className="mt-1 text-[11px] leading-snug text-emerald-900/80">
                      flycam {suggest.booking.flycam} · 360 {suggest.booking.video360} · cờ đỏ{" "}
                      {suggest.booking.redFlag} · hoàng hôn {suggest.booking.sunset} · kéo cờ{" "}
                      {suggest.booking.flagFlight}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="mt-1.5 h-9 w-full border-emerald-500 bg-white text-xs font-bold text-emerald-800"
                      onClick={copyFromBookings}
                    >
                      ⧉ Lấy số DỊCH VỤ theo sổ booking (nên dùng)
                    </Button>
                  </div>
                )}
                {suggest.dispatcher.hasData && (
                  <div className="rounded-xl border border-slate-300 bg-white p-2.5">
                    <div className="text-xs font-bold text-slate-800">
                      Quầy vé / điều phối báo
                      {reporterNames ? <span className="font-normal text-slate-500"> — {reporterNames}</span> : null}
                    </div>
                    <div className="mt-1 text-[11px] leading-snug text-slate-600">
                      {/* Ghi rõ ĐĂNG KÝ: đây là số quầy đếm lúc nhận khách, chưa
                          trừ ai huỷ — để cạnh "vé thu về" mà không nói rõ thì
                          rất dễ đọc nhầm thành số khách đã bay. */}
                      {suggest.guestCount} khách đăng ký · {suggest.ticketsIssued} vé xuất ·{" "}
                      {suggest.ticketsReturned} vé thu về · huỷ {suggest.cancelledCount} · dời{" "}
                      {suggest.rescheduledCount}
                      {" → "}
                      <strong className="text-slate-800">
                        bay {Math.max(0, suggest.ticketsIssued - suggest.ticketsReturned)}
                      </strong>
                      <br />
                      TM {formatVND(suggest.cashTotal)} · CK {formatVND(suggest.transferTotal)}
                      <br />
                      flycam {suggest.dispatcher.flycam} · 360 {suggest.dispatcher.video360} · cờ đỏ{" "}
                      {suggest.dispatcher.redFlag} · hoàng hôn {suggest.dispatcher.sunset} · kéo cờ{" "}
                      {suggest.dispatcher.flagFlight}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="mt-1.5 h-9 w-full border-emerald-400 bg-white text-xs font-semibold text-emerald-800"
                      onClick={copyFromDispatcher}
                    >
                      ⧉ Lấy trọn bộ số QUẦY/ĐIỀU PHỐI
                    </Button>
                  </div>
                )}
                {suggest.pilot.hasData && (
                  <div className="rounded-xl border border-slate-300 bg-white p-2.5">
                    <div className="text-xs font-bold text-slate-800">Phi công báo</div>
                    <div className="mt-1 text-[11px] leading-snug text-slate-600">
                      {suggest.pilot.flights + suggest.pilot.ppg} khách ({suggest.pilot.flights} chuyến PG
                      {suggest.pilot.ppg ? ` + ${suggest.pilot.ppg} PPG` : ""})
                      <br />
                      flycam {suggest.pilot.flycam} · 360 {suggest.pilot.video360} · cờ đỏ {suggest.pilot.redFlag} ·
                      hoàng hôn {suggest.pilot.sunset} · kéo cờ {suggest.pilot.flagFlight}
                      <br />
                      <span className="text-slate-400">
                        Phi công không nắm vé và tiền — hai phần đó giữ nguyên số đang có.
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="mt-1.5 h-9 w-full border-sky-400 bg-white text-xs font-semibold text-sky-800"
                      onClick={copyFromPilots}
                    >
                      ⧉ Lấy số PHI CÔNG (khách + dịch vụ)
                    </Button>
                  </div>
                )}
              </div>
              <p className="mt-1.5 text-[11px] leading-tight text-emerald-900/70">
                Lấy xong vẫn sửa tay từng ô được — số chốt là số kế toán chịu trách nhiệm.
              </p>
            </div>
          )}

          {/* 5 ô đếm xếp 3/hàng khi đủ rộng — gọn còn 2 hàng */}
          <div className="grid grid-cols-2 gap-2 @md:grid-cols-3">
            <ServiceBox tone="guests" label="Số khách đã bay">
              <CountInput compact value={form.guestCount} onChange={(v) => set("guestCount", v)} max={5000} />
              {/* Ba nguồn đối chiếu: sổ booking (đã tích đã bay), quầy đếm khách,
                  phi công đếm chuyến (PG + PPG, mỗi chuyến 1 khách) */}
              <Compare
                label={(suggest?.pilotExtraPpg ?? 0) > 0 ? "sổ booking + PPG phi công khai thêm" : "sổ booking (đã bay)"}
                value={
                  suggest?.flownGuests === undefined
                    ? undefined
                    : suggest.flownGuests + (suggest.pilotExtraPpg ?? 0)
                }
                mine={form.guestCount}
                onTake={locked ? undefined : (v) => set("guestCount", v)}
              />
              {(suggest?.pilotExtraPpg ?? 0) > 0 && (
                <p className="mt-0.5 rounded bg-amber-100 px-1.5 py-1 text-[10px] leading-tight text-amber-900">
                  Phi công khai <strong>{suggest!.pilotExtraPpg}</strong> chuyến PPG KHÔNG có trong sổ
                  booking (điều phối không nắm hết chuyến PPG là chuyện thường). Máy đã cộng vào số điền
                  sẵn — nếu thực ra chuyến đó có booking rồi thì trừ tay lại.
                </p>
              )}
              {/**
               * SỐ QUẦY KHAI LÀ KHÁCH ĐĂNG KÝ, KHÔNG PHẢI KHÁCH ĐÃ BAY.
               *
               * Quầy gõ "Số khách" lúc nhận khách đầu ngày; khách huỷ giữa
               * chừng thì con số ấy không lùi lại. Đem nguyên số đó so với ô
               * "đã bay" là so hai thứ khác nhau — ngày 25/08 quầy khai 7
               * trong khi chỉ 6 người bay, mà bên cạnh lại có sẵn nút "⧉ lấy".
               *
               * Nên quy về ĐÃ BAY bằng chính số quầy khai:
               *  - Điểm có vé: vé xuất − vé thu hồi (7 − 1 = 6). Đúng luật
               *    "vé thu hồi = huỷ + dời" mà bộ đối chiếu vẫn dùng.
               *  - Hà Nội (không vé): khách − khách huỷ.
               */}
              <Compare
                label={
                  (t?.carriedIn ?? 0) > 0
                    ? `quầy báo (vé − thu hồi + không vé + ${t!.carriedIn} vé hôm trước mang sang)`
                    : "quầy báo (vé − thu hồi + bay không vé)"
                }
                value={(() => {
                  if (noTickets) {
                    const khach = t?.dispatcherGuests ?? suggest?.guestCount;
                    if (khach === undefined) return undefined;
                    return Math.max(0, khach - (suggest?.cancelledCount ?? 0));
                  }
                  const xuat = t?.dispatcherIssued ?? suggest?.ticketsIssued;
                  const thuVe = t?.dispatcherReturned ?? suggest?.ticketsReturned ?? 0;
                  /**
                   * + khách bay KHÔNG VÉ (PPG là chính): quầy đếm bằng vé nên
                   * chuyến không xé vé nằm ngoài phép đếm của họ — không cộng
                   * lại đây thì dòng này đỏ lệch giả mỗi ngày có PPG không vé.
                   */
                  const khongVe = flown?.noTicketGuests ?? 0;
                  /**
                   * + VÉ MANG SANG: khách dời lịch hôm trước cầm vé cũ bay hôm
                   * nay — vé ấy xuất Ở NGÀY TRƯỚC nên "vé xuất hôm nay" không
                   * đếm được họ (bộ soát đã xác minh từng mã, xem VE_MANG_SANG).
                   */
                  const mangSang = t?.carriedIn ?? 0;
                  return xuat === undefined ? undefined : Math.max(0, xuat - thuVe) + khongVe + mangSang;
                })()}
                mine={form.guestCount}
                onTake={locked ? undefined : (v) => set("guestCount", v)}
              />
              <Compare label="phi công báo" value={t ? t.pilotFlights + t.pilotPpg : suggest?.pilot?.hasData ? suggest.pilot.flights + suggest.pilot.ppg : undefined} mine={form.guestCount}
                onTake={locked ? undefined : (v) => set("guestCount", v)} />
              <p className="mt-0.5 text-[10px] leading-tight text-slate-500">
                Khách bay THẬT — đã trừ khách huỷ/dời. Số điền sẵn lấy theo sổ booking.
              </p>
            </ServiceBox>

            {/* KHÁCH BAY KHÔNG VÉ — đếm theo sổ booking (dòng nào tích "bay
                không vé"). Vẫn là chuyến bay, chỉ không dùng vé giấy; số này
                giải thích vì sao khách nhiều hơn vé xuất. */}
            {!noTickets && (
              <ServiceBox tone="guests" label="Khách bay KHÔNG VÉ">
                <CountInput compact value={form.noTicketGuests} onChange={(v) => set("noTicketGuests", v)} max={5000} />
                <Compare
                  label="phi công báo (PPG không vé)"
                  value={suggest?.pilot?.hasData ? suggest.pilot.ppgNoTicket ?? 0 : undefined}
                  mine={form.noTicketGuests}
                  onTake={locked ? undefined : (v) => set("noTicketGuests", v)}
                />
                <Compare
                  label="sổ booking (tích không vé)"
                  value={flown?.noTicketGuests}
                  mine={form.noTicketGuests}
                  onTake={locked ? undefined : (v) => set("noTicketGuests", v)}
                />
                <p className="mt-0.5 text-[10px] leading-tight text-slate-500">
                  Bay thật nhưng không dùng vé giấy
                </p>
              </ServiceBox>
            )}

            {noTickets ? (
              /* Hà Nội không xuất vé — theo dõi KHÁCH: đăng ký (từ sổ booking), huỷ, dời */
              <>
                <ServiceBox tone="tickets" label="Số khách đăng ký">
                  <CountInput compact value={form.registeredGuests} onChange={(v) => set("registeredGuests", v)} max={5000} />
                  <Compare label="sổ booking" value={suggest?.registeredGuests} mine={form.registeredGuests}
                    onTake={locked ? undefined : (v) => set("registeredGuests", v)} />
                </ServiceBox>
                <ServiceBox tone="cancelled" label="Số khách huỷ">
                  <CountInput compact value={form.cancelledCount} onChange={(v) => set("cancelledCount", v)} max={5000} />
                  <Compare label="quầy/điều phối báo" value={suggest?.cancelledCount} mine={form.cancelledCount}
                    onTake={locked ? undefined : (v) => set("cancelledCount", v)} />
                </ServiceBox>
                <ServiceBox tone="moved" label="Số khách dời">
                  <CountInput compact value={form.rescheduledCount} onChange={(v) => set("rescheduledCount", v)} max={5000} />
                  <Compare label="quầy/điều phối báo" value={suggest?.rescheduledCount} mine={form.rescheduledCount}
                    onTake={locked ? undefined : (v) => set("rescheduledCount", v)} />
                </ServiceBox>
              </>
            ) : (
              <>
                <ServiceBox tone="tickets" label="Số vé được xuất ra">
                  <CountInput compact value={form.ticketsIssued} onChange={(v) => set("ticketsIssued", v)} max={5000} />
                  <Compare label="quầy/điều phối báo" value={t?.dispatcherIssued} mine={form.ticketsIssued}
                    onTake={locked ? undefined : (v) => set("ticketsIssued", v)} />
                  {/* Tổng số MÃ VÉ phi công đã khai bay trong ngày (gồm cả vé PPG) */}
                  <Compare label="phi công báo" value={t?.pilotCodes} mine={form.ticketsIssued}
                    onTake={locked ? undefined : (v) => set("ticketsIssued", v)} />
                </ServiceBox>

                <ServiceBox tone="returned" label="Số vé thu hồi (huỷ + dời)">
                  <CountInput compact value={form.ticketsReturned} onChange={(v) => set("ticketsReturned", v)} max={5000} />
                  <Compare label="quầy/điều phối báo" value={t?.dispatcherReturned} mine={form.ticketsReturned}
                    onTake={locked ? undefined : (v) => set("ticketsReturned", v)} />
                </ServiceBox>

                {/* Tên phải nói rõ ĐƠN VỊ: ô này đếm VÉ và nằm trong phép tính
                    "vé thu hồi = huỷ + dời". Để trống chữ "vé" thì thấy số 0
                    bên cạnh dòng "5 khách dời" là tưởng máy bỏ sót. */}
                <ServiceBox tone="moved" label="Vé dời lịch">
                  <CountInput compact value={form.rescheduledCount} onChange={(v) => set("rescheduledCount", v)} max={5000} />
                  <Compare label="quầy/điều phối báo" value={suggest?.rescheduledCount} mine={form.rescheduledCount}
                    onTake={locked ? undefined : (v) => set("rescheduledCount", v)} />
                  {(() => {
                    const khach = suggest?.rescheduledGuestCount ?? 0;
                    if (khach <= 0) {
                      return (
                        <p className="mt-0.5 text-[10px] leading-tight text-slate-500">
                          Đếm theo VÉ — vé thu về từ nhóm đổi sang ngày khác
                        </p>
                      );
                    }
                    const coVe = suggest?.rescheduledTicketGuests ?? 0;
                    return (
                      <>
                        <p className="mt-0.5 text-[10px] font-semibold leading-tight text-amber-700">
                          Sổ booking: {khach} khách dời (xem bảng tóm tắt bên dưới)
                        </p>
                        {/**
                         * GIẢI THÍCH VÌ SAO Ô NÀY VẪN LÀ 0.
                         *
                         * Nhóm dời mà CHƯA xuất vé thì không có tờ vé nào để thu
                         * hồi, nên ô đếm-theo-vé đứng im — đúng, nhưng nhìn vào
                         * thì tưởng máy bỏ sót. Ngược lại nhóm ĐÃ cầm vé mà dời
                         * thì vé của họ BẮT BUỘC phải nằm trong "vé thu hồi";
                         * lúc ấy phải kêu lên.
                         */}
                        {coVe > 0 ? (
                          <p className="mt-0.5 text-[10px] font-bold leading-tight text-rose-700">
                            ⚠ {coVe} khách trong đó ĐÃ cầm vé — hoặc thu hồi vé và tính vào ô này, hoặc
                            khách CẦM VÉ CŨ sang ngày mới bay (ngày đông): khi đó để nguyên, mai phi công
                            khai mã là máy tự đối chiếu vé giữa hai ngày
                          </p>
                        ) : (
                          <p className="mt-0.5 text-[10px] leading-tight text-slate-500">
                            Nhóm này CHƯA xuất vé nên không có vé nào để thu hồi — ô này để 0 là đúng
                          </p>
                        )}
                      </>
                    );
                  })()}
                </ServiceBox>

                {/* Ô này đếm theo VÉ và bị ràng vào phép tính "vé thu hồi =
                    huỷ + dời" — KHÔNG phải cặp với hai ô đếm khách bên dưới,
                    nên tên phải nói rõ đơn vị kẻo bị đem cộng nhầm. */}
                <ServiceBox tone="cancelled" label="Vé huỷ">
                  <CountInput compact value={form.cancelledCount} onChange={(v) => set("cancelledCount", v)} max={5000} />
                  <Compare label="quầy/điều phối báo" value={suggest?.cancelledCount} mine={form.cancelledCount}
                    onTake={locked ? undefined : (v) => set("cancelledCount", v)} />
                  <p className="mt-0.5 text-[10px] leading-tight text-slate-500">Đếm theo VÉ — khớp danh sách mã vé huỷ</p>
                </ServiceBox>

                {/* Hai ô dưới đếm theo ĐẦU KHÁCH và là một CẶP: cộng lại đúng
                    bằng tổng khách huỷ trong ngày. Tách ra vì bên cần hoàn thì
                    có lệnh hoàn phải theo tới cùng, bên kia thì không. */}
                <ServiceBox tone="cancelled" label="Huỷ CẦN hoàn">
                  <CountInput compact value={form.cancelledRefundCount} onChange={(v) => set("cancelledRefundCount", v)} max={5000} />
                  <Compare label="sổ booking + điều phối" value={suggest?.cancelledRefundCount} mine={form.cancelledRefundCount}
                    onTake={locked ? undefined : (v) => set("cancelledRefundCount", v)} />
                  <p className="mt-0.5 text-[10px] leading-tight text-slate-500">Khách huỷ ĐÃ trả tiền — có lệnh hoàn phải theo</p>
                </ServiceBox>

                {/* Booking huỷ mà CHƯA thanh toán đồng nào — không có lệnh hoàn phải theo,
                    nhưng vẫn phải đếm để tổng khách huỷ trong ngày không rơi mất. */}
                <ServiceBox tone="cancelled" label="Huỷ không cần hoàn">
                  <CountInput compact value={form.cancelledNoRefundCount} onChange={(v) => set("cancelledNoRefundCount", v)} max={5000} />
                  <Compare label="sổ booking + điều phối" value={suggest?.cancelledNoRefundCount} mine={form.cancelledNoRefundCount}
                    onTake={locked ? undefined : (v) => set("cancelledNoRefundCount", v)} />
                  <p className="mt-0.5 text-[10px] leading-tight text-slate-500">Khách huỷ chưa thanh toán — không có lệnh hoàn</p>
                </ServiceBox>

                {/* Cộng sẵn tổng khách huỷ — kế toán khỏi nhẩm, và nhìn ra ngay
                    khi một trong hai ô bị bỏ quên. */}
                <div className="col-span-full -mt-1 text-[11px] font-semibold text-slate-600">
                  Tổng khách huỷ hôm nay:{" "}
                  <strong className="tabular-nums text-slate-900">
                    {form.cancelledRefundCount + form.cancelledNoRefundCount}
                  </strong>{" "}
                  khách ({form.cancelledRefundCount} cần hoàn + {form.cancelledNoRefundCount} không cần hoàn)
                </div>

              </>
            )}
          </div>

          {/**
           * BỐN BẢNG TÓM TẮT — trả lời ngay tại chỗ mấy câu kế toán vẫn phải
           * mở sang trang khác mới biết: dời ai sang ngày nào, huỷ những ai,
           * hoàn bao nhiêu, và dải mã vé xuất/thu hồi.
           *
           * Số lấy từ SỔ BOOKING (khối gợi ý của máy), không phải số kế toán
           * gõ vào mấy ô trên — đây là phần để ĐỐI CHIẾU, nên phải là số máy.
           */}
          {suggest?.hasData && (
            <div className="mt-4 space-y-2">
              {(() => {
                const moved = suggest.rescheduledGuestEntries ?? [];
                const cancels = suggest.cancelledGuestEntries ?? [];
                const canHoan = cancels.filter((e) => (e.refund ?? 0) > 0);
                const khongHoan = cancels.filter((e) => !((e.refund ?? 0) > 0));
                const tongHoan = canHoan.reduce((a, e) => a + (e.refund ?? 0), 0);
                const codes = (e: { codes?: string[] }) =>
                  (e.codes ?? []).length ? ` · vé ${(e.codes ?? []).join(" ")}` : "";

                const Box = ({ tone, title, children }: { tone: string; title: React.ReactNode; children: React.ReactNode }) => (
                  <div className={`rounded-xl border px-3 py-2 ${tone}`}>
                    <div className="text-xs font-bold">{title}</div>
                    <ul className="mt-1 space-y-0.5 text-[11px] leading-snug">{children}</ul>
                  </div>
                );

                return (
                  <>
                    {moved.length > 0 && (
                      <Box tone="border-amber-300 bg-amber-50/70 text-amber-900" title={`⇢ Dời lịch — ${moved.length} nhóm`}>
                        {moved.map((e, i) => (
                          <li key={i}>
                            <strong>{e.name || "khách"}</strong> · {e.guests} khách · sang{" "}
                            <strong>{e.toDate ? formatDateKeyVN(e.toDate) : "?"}</strong>
                            {codes(e)}
                            {e.note ? ` · ${e.note}` : ""}
                          </li>
                        ))}
                      </Box>
                    )}

                    {canHoan.length > 0 && (
                      <Box
                        tone="border-rose-300 bg-rose-50/70 text-rose-900"
                        title={
                          <>
                            ✕ Huỷ CẦN hoàn — {canHoan.length} nhóm · tổng hoàn{" "}
                            <span className="tabular-nums">{formatVND(tongHoan)}</span>
                          </>
                        }
                      >
                        {canHoan.map((e, i) => (
                          <li key={i}>
                            <strong>{e.name || "khách"}</strong> · {e.guests} khách · hoàn{" "}
                            <strong className="tabular-nums">{formatVND(e.refund ?? 0)}</strong>
                            {e.refundMethod ? ` (${e.refundMethod === "cash" ? "TM" : "CK"})` : ""}
                            {codes(e)}
                          </li>
                        ))}
                      </Box>
                    )}

                    {khongHoan.length > 0 && (
                      <Box tone="border-slate-300 bg-slate-50 text-slate-700" title={`✕ Huỷ không cần hoàn — ${khongHoan.length} nhóm`}>
                        {khongHoan.map((e, i) => (
                          <li key={i}>
                            <strong>{e.name || "khách"}</strong> · {e.guests} khách
                            {codes(e)}
                            {e.note ? ` · ${e.note}` : ""}
                          </li>
                        ))}
                      </Box>
                    )}

                    {!noTickets && ((suggest.issuedRanges ?? []).length > 0 || suggest.cancelledCodesText) && (
                      <Box tone="border-sky-300 bg-sky-50/70 text-sky-900" title="🎫 Mã vé">
                        {(suggest.issuedRanges ?? []).length > 0 && (
                          <li>
                            Xuất ra:{" "}
                            <strong>
                              {(suggest.issuedRanges ?? [])
                                .map((r) => (r.from === r.to ? r.from : `${r.from} → ${r.to}`))
                                .join(" · ")}
                            </strong>
                          </li>
                        )}
                        {suggest.cancelledCodesText && (
                          <li className="text-rose-800">
                            Thu hồi: <strong>{suggest.cancelledCodesText}</strong>
                          </li>
                        )}
                      </Box>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* Cộng dồn dịch vụ của khách đã tích "đã bay" trong sổ booking */}
          <FlownServicesHint
            spot={spot}
            date={date}
            onData={setFlown}
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

          {/* Mỗi dịch vụ một khung màu riêng, cụm đếm nhỏ — hai nguồn hiện bên dưới, bấm nguồn nào nhận nguồn đó */}
          <div className="mt-3 grid grid-cols-2 gap-2 @md:grid-cols-3">
            {/* Mỗi ô so ĐÚNG HAI nguồn: SỔ BOOKING (tiền khách trả) và người
                THỰC LÀM (flycam ← camera man; 360/cờ đỏ/hoàng hôn/kéo cờ ←
                phi công). Bỏ dòng "quầy/điều phối báo": quầy chỉ khai lại phần
                mình nắm nên luôn thiếu phần người khác nhập — số booking đã là
                nguồn chuẩn. Ai nhập bao nhiêu thì xem thẻ xanh phía trên. */}
            <ServiceBox tone="flycam" label="Flycam">
              <CountInput compact value={form.flycam} onChange={(v) => set("flycam", v)} max={1000} />
              <Compare label="số trên booking" value={flown?.flycam} mine={form.flycam}
                onTake={locked ? undefined : (v) => set("flycam", v)} />
              <Compare label="camera man báo" value={t?.cameramanFlycam} mine={form.flycam}
                onTake={locked ? undefined : (v) => set("flycam", v)} />
              <ByPerson list={suggest?.reportedBy?.flycam} prefix="camera man" />
            </ServiceBox>
            <ServiceBox tone="video360" label="Camera 360">
              <CountInput compact value={form.video360} onChange={(v) => set("video360", v)} max={1000} />
              <Compare label="số trên booking" value={flown?.video360} mine={form.video360}
                onTake={locked ? undefined : (v) => set("video360", v)} />
              <Compare label="phi công báo" value={t?.pilot360} mine={form.video360}
                onTake={locked ? undefined : (v) => set("video360", v)} />
              <ByPerson list={suggest?.reportedBy?.video360} prefix="phi công" />
            </ServiceBox>
            <ServiceBox tone="redFlag" label="Dù cờ đỏ">
              <CountInput compact value={form.redFlag} onChange={(v) => set("redFlag", v)} max={1000} />
              <Compare label="số trên booking" value={flown?.redFlag} mine={form.redFlag}
                onTake={locked ? undefined : (v) => set("redFlag", v)} />
              <Compare label="phi công báo" value={t?.pilotRedFlag} mine={form.redFlag}
                onTake={locked ? undefined : (v) => set("redFlag", v)} />
              <ByPerson list={suggest?.reportedBy?.redFlag} prefix="phi công" />
            </ServiceBox>
            {spot !== "sapa" && (
            <ServiceBox tone="sunset" label="Bay hoàng hôn/săn mây">
              <CountInput compact value={form.sunset} onChange={(v) => set("sunset", v)} max={1000} />
              <Compare label="số trên booking" value={flown?.sunset} mine={form.sunset}
                onTake={locked ? undefined : (v) => set("sunset", v)} />
              <Compare label="phi công báo" value={t?.pilotSunset} mine={form.sunset}
                onTake={locked ? undefined : (v) => set("sunset", v)} />
              <ByPerson list={suggest?.reportedBy?.sunset} prefix="phi công" />
            </ServiceBox>
            )}
            <ServiceBox tone="flagFlight" label="Bay kéo cờ/bánh">
              <CountInput compact value={form.flagFlight} onChange={(v) => set("flagFlight", v)} max={1000} />
              <Compare label="số trên booking" value={flown?.flagFlight} mine={form.flagFlight}
                onTake={locked ? undefined : (v) => set("flagFlight", v)} />
              <Compare label="phi công báo" value={t?.pilotFlagFlight} mine={form.flagFlight}
                onTake={locked ? undefined : (v) => set("flagFlight", v)} />
              <ByPerson list={suggest?.reportedBy?.flagFlight} prefix="phi công" />
            </ServiceBox>
          </div>

          {/* Hai nguồn lệch mà chưa rõ ai đúng: gửi lệnh cho đúng các vai trò soát lại */}
          {!locked && (
            <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50/60 p-3">
              <div className="text-sm font-semibold text-orange-900">📣 Yêu cầu soát lại</div>
              <p className="mt-0.5 text-xs text-slate-600">
                Lệnh hiện ngay trên trang của đúng vai trò liên quan (flycam → điều phối + camera man;
                360/cờ đỏ/kéo cờ → điều phối + phi công). Tự tan khi chốt ngày.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  value={reviewTopic}
                  onChange={(e) => setReviewTopic(e.target.value)}
                  className="h-10 rounded-xl border border-orange-300 bg-white px-2 text-sm"
                >
                  <option value="flycam">Flycam</option>
                  <option value="video360">Camera 360</option>
                  <option value="redFlag">Dù cờ đỏ</option>
                  <option value="sunset">Bay hoàng hôn/săn mây</option>
                  <option value="flagFlight">Bay kéo cờ/bánh</option>
                  <option value="general">Số liệu chung</option>
                </select>
                <input
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Lời nhắn · VD: điều phối báo 5, camera man báo 4"
                  className="h-10 min-w-52 flex-1 rounded-xl border border-orange-300 bg-white px-3 text-sm"
                />
                <Button type="button" variant="ghost" className="h-10 bg-white px-3 text-xs" disabled={reviewBusy} onClick={sendReview}>
                  {reviewBusy ? "Đang gửi…" : "Gửi lệnh"}
                </Button>
              </div>
              {reviews.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {reviews.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 text-xs">
                      <strong className={r.resolvedAt ? "text-slate-400 line-through" : "text-orange-900"}>
                        {r.topicLabel}
                      </strong>
                      <span className={"flex-1 truncate " + (r.resolvedAt ? "text-slate-400" : "text-slate-700")}>
                        {r.note}
                      </span>
                      {r.resolvedAt ? (
                        <span className="text-emerald-700">đã xử lý</span>
                      ) : (
                        <button type="button" onClick={() => resolveReview(r.id)} className="rounded-md border border-slate-300 px-2 py-0.5 font-medium text-slate-600">
                          đánh dấu xong
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {!noTickets && (
          <div className="mt-4">
            <Readout
              label={
                spot === "khau-pha"
                  ? "Vé xuất − vé thu hồi (phải bằng số MÃ đã bay, gồm cả vé PPG)"
                  : "Vé xuất − vé thu hồi (phải bằng tổng chuyến phi công báo)"
              }
              value={`${form.ticketsIssued - form.ticketsReturned} / ${
                (spot === "khau-pha" ? t?.pilotCodes : t?.pilotFlights) ?? "?"
              } ${spot === "khau-pha" ? "mã" : "chuyến"}`}
              tone={
                t &&
                form.ticketsIssued - form.ticketsReturned !==
                  (spot === "khau-pha" ? t.pilotCodes : t.pilotFlights)
                  ? "warning"
                  : "normal"
              }
            />
          </div>
          )}
        </CollapseCard>

        {/* Khách mua thêm dịch vụ tại bãi — ngay trên sổ THU CHI */}
        <div className="order-4 lg:order-none">
          <AddServicesCard spot={spot} date={date} />
        </div>

        <CollapseCard
          className="order-4 lg:order-none"
          title="THU CHI & TIỀN NONG"
          hint="Thu chi nhân viên khai · sổ của kế toán · bảng tiền trong ngày (ai giữ tiền mặt, ai đã chi, khách nào chuyển khoản) · nộp tiền / xin ứng."
        >
          {/* ===== Thu chi nhân viên khai — kế toán chỉ duyệt và ghi chú ===== */}
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-bold text-slate-900">Thu chi nhân viên khai</span>
              <span className="text-xs text-slate-600">
                thu <strong className="text-emerald-700">{formatVND(staffThu)}</strong> · chi{" "}
                <strong className="text-rose-700">{formatVND(staffChi)}</strong>
              </span>
            </div>
            {staffLines.length > 0 ? (
              <>
                {!locked && (
                  <div className="mb-2 flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-9 flex-1 border border-emerald-300 bg-emerald-50 text-xs font-semibold text-emerald-800"
                      onClick={() => {
                        set(
                          "expenseReviews",
                          staffLines.map((l) => ({ key: l.key, status: "ok" as const, reason: "" })),
                        );
                        set("expensesApproved", true);
                      }}
                    >
                      ✓ Xác nhận toàn bộ
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-9 flex-1 border border-rose-300 bg-rose-50 text-xs font-semibold text-rose-800"
                      onClick={() => {
                        const reason = window.prompt("Từ chối TOÀN BỘ các khoản — lý do?") ?? "";
                        if (!reason.trim()) return;
                        set(
                          "expenseReviews",
                          staffLines.map((l) => ({ key: l.key, status: "no" as const, reason })),
                        );
                        set("expensesApproved", false);
                        apiPost(`/api/baocao/review?spot=${spot}`, {
                          date,
                          topic: "general",
                          note: `Kế toán TỪ CHỐI toàn bộ ${staffLines.length} khoản thu chi ngày ${formatDateKeyVN(date)} — ${reason}. Mọi người soát và sửa lại báo cáo.`,
                        }).catch(() => {});
                      }}
                    >
                      ✕ Từ chối toàn bộ
                    </Button>
                  </div>
                )}
                <ul className="mb-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                  {staffLines.map((e, k) => {
                    const rv = reviewOf(e.key);
                    return (
                      <li
                        key={k}
                        className={
                          "flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 text-sm" +
                          (rv?.status === "ok" ? " bg-emerald-50/70" : rv?.status === "no" ? " bg-rose-50/80" : "")
                        }
                      >
                        <span className="text-xs text-slate-500">
                          {e.who} · {ROLE_LABEL[e.role]}
                        </span>
                        <span className="flex-1 text-slate-900">
                          {e.content}
                          {rv?.status === "no" && (
                            <span className="ml-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-800">
                              từ chối{rv.reason ? `: ${rv.reason}` : ""} — chờ sửa
                            </span>
                          )}
                        </span>
                        {e.note && <span className="text-xs text-slate-500">{e.note}</span>}
                        <span
                          className={
                            "font-semibold tabular-nums " + (e.kind === "thu" ? "text-emerald-700" : "text-rose-700")
                          }
                        >
                          {e.kind === "thu" ? "+" : "−"}
                          {formatVND(e.amount)}
                        </span>
                        {!locked && (
                          <span className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              title="Xác nhận khoản này"
                              onClick={() => markExpense(e, "ok")}
                              className={
                                "rounded-lg border px-2 py-0.5 text-xs font-bold " +
                                (rv?.status === "ok"
                                  ? "border-emerald-500 bg-emerald-500 text-white"
                                  : "border-slate-300 bg-white text-emerald-700 hover:border-emerald-500")
                              }
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              title="Từ chối — đẩy về người khai sửa lại"
                              onClick={() => {
                                const reason = window.prompt(`Từ chối "${e.content}" của ${e.who} — lý do?`) ?? "";
                                if (!reason.trim()) return;
                                markExpense(e, "no", reason);
                              }}
                              className={
                                "rounded-lg border px-2 py-0.5 text-xs font-bold " +
                                (rv?.status === "no"
                                  ? "border-rose-500 bg-rose-500 text-white"
                                  : "border-slate-300 bg-white text-rose-700 hover:border-rose-500")
                              }
                            >
                              ✕
                            </button>
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <p className="mb-3 text-sm text-slate-500">Hôm nay nhân viên chưa khai khoản thu chi nào.</p>
            )}
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={form.expensesApproved}
                onChange={(e) => set("expensesApproved", e.target.checked)}
                disabled={locked}
                className="mt-1 h-5 w-5 rounded border-slate-300"
              />
              <span className="text-sm text-slate-800">
                <strong>Tôi đã đọc và xác nhận các khoản thu chi trên.</strong>
              </span>
            </label>
            <TextInput
              value={form.expensesApprovedNote}
              onChange={(e) => set("expensesApprovedNote", e.target.value)}
              placeholder="Ghi chú duyệt (không bắt buộc)"
              className="mt-2"
              disabled={locked}
            />
          </div>

          {/* LỆCH TIỀN vì sửa/bỏ lệnh dịch vụ sau khi đã thu — phải xử lý trước khi chốt */}
          {(suggest?.overpaidBookings ?? []).length > 0 && (
            <div className="mb-3 rounded-xl border-2 border-rose-400 bg-rose-50/80 px-3 py-2">
              <div className="text-sm font-bold text-rose-900">
                ⚠ {suggest!.overpaidBookings.length} booking THU THỪA — khách trả nhiều hơn tổng phải trả, xử lý bù
                hoặc hoàn trước khi chốt ngày
              </div>
              <ul className="mt-1 space-y-0.5 text-xs text-rose-900/90">
                {suggest!.overpaidBookings.map((b) => (
                  <li key={b.label}>
                    <strong>{b.label}</strong> thừa {formatVND(b.amount)}
                    {b.undoneChanges > 0 ? ` — có ${b.undoneChanges} lệnh dịch vụ đã bị bỏ, soát kỹ` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* BẢO HIỂM CỦA NGÀY — đếm theo đầu người, không theo booking.
              Kế toán chốt ngày phải nhìn thấy: đã đẩy bao nhiêu người sang bên
              bảo hiểm, rút lại bao nhiêu, còn hiệu lực bao nhiêu. */}
          {suggest && (suggest.insurance.sent > 0 || suggest.insurance.notSent > 0) && (
            <div
              className={
                "mb-3 rounded-xl border-2 px-3 py-2 " +
                (suggest.insurance.notSent > 0
                  ? "border-rose-400 bg-rose-50"
                  : "border-emerald-300 bg-emerald-50/70")
              }
            >
              <div className="text-sm font-bold text-slate-800">
                🛡 Bảo hiểm trong ngày:{" "}
                <span className="tabular-nums">
                  đã đẩy {suggest.insurance.sent} − thu hồi {suggest.insurance.recalled} ={" "}
                  <span className="text-emerald-800">còn lại {suggest.insurance.active} người</span>
                </span>
              </div>
              {suggest.insurance.notSent > 0 && (
                <>
                  <div className="mt-1 text-sm font-bold text-rose-800">
                    ⚠ {suggest.insurance.notSent} khách đã bay/đã xuất vé mà CHƯA GỬI ĐƯỢC bảo hiểm — xử lý xong hãy chốt
                    ngày:
                  </div>
                  <ul className="mt-0.5 space-y-0.5 text-xs text-rose-900">
                    {suggest.insurance.notSentBookings.map((b, i) => (
                      <li key={i}>
                        <strong>{b.label}</strong> — {b.guests} khách ({b.reason})
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          {/* ĐẠI LÝ THU HỘ: tiền bay của khách hôm nay đang nằm ở đại lý —
              kế toán phải nhớ đòi, không phải chiết khấu chi ra */}
          {(suggest?.agencyHeldTotal ?? 0) > 0 && (
            <div className="mb-3 rounded-xl border-2 border-orange-300 bg-orange-50/70 px-3 py-2">
              <div className="text-sm font-bold text-orange-900">
                🤝 Đại lý đang cầm hộ {formatVND(suggest!.agencyHeldTotal)} tiền bay của ngày — nhớ yêu cầu chuyển về
              </div>
              <ul className="mt-1 space-y-0.5 text-xs text-orange-900/90">
                {suggest!.agencyHeld.map((a) => (
                  <li key={a.name}>
                    <strong>{a.name}</strong> nợ {formatVND(a.amount)} — {a.bookings.join(" · ")}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Từ dưới đẩy lên: điều phối báo gì, kế toán nhận nguyên bộ từng dòng
              (thu đúng tiền mặt/CK, chi hộ khách) rồi sửa tay nếu cần */}
          {suggest?.dispatcher.hasData && suggest.dispatcherLedger.length > 0 && !locked && (
            <div className="mb-3">
              <LedgerSuggest
                label={`lấy ${suggest.dispatcherLedger.length} dòng thu chi từ ${reporterNames} — thu ${formatVND(suggest.cashTotal + suggest.transferTotal)} · chi ${formatVND(suggest.dispatcherSpend)}`}
                taken={suggest.dispatcherLedger.every((d) =>
                  form.ledger.some((e) => e.kind === d.kind && e.amount === d.amount && e.content === d.content),
                )}
                onTake={() => {
                  const kept = form.ledger.filter((e) => e.content.trim() || e.amount);
                  const fresh = suggest.dispatcherLedger
                    .filter((d) => !kept.some((e) => e.kind === d.kind && e.amount === d.amount && e.content === d.content))
                    .map((d) => ({ content: d.content, amount: d.amount, kind: d.kind, method: d.method, note: "" }));
                  set("ledger", [...kept, ...fresh]);
                }}
              />
              {suggest.transferTotal > 0 && (
                <p className="mt-1.5 text-xs text-slate-500">
                  Dòng CK là tiền vào thẳng tài khoản công ty — điều phối không cầm, ghi để sổ đủ bức tranh ngày.
                </p>
              )}
            </div>
          )}

          <ExpenseRows rows={form.ledger} onChange={(rows) => set("ledger", rows)} disabled={locked} withKind withMethod />

          {/* ===== Tổng tự cộng từ các dòng THU của sổ — so ngay với số nhân viên báo ===== */}
          <div className="mt-3 grid grid-cols-1 gap-2 @md:grid-cols-3">
            <div>
              <Readout
                label="Tổng TM thu (tự cộng)"
                value={formatVND(ledgerCash)}
                tone={t && ledgerCash !== t.dispatcherCash ? "warning" : "normal"}
              />
              <Compare label="quầy/điều phối báo" value={t?.dispatcherCash} mine={ledgerCash} money />
            </div>
            <div>
              <Readout
                label="Tổng CK (tự cộng)"
                value={formatVND(ledgerTransfer)}
                tone={t && ledgerTransfer !== t.dispatcherTransfer ? "warning" : "normal"}
              />
              <Compare label="quầy/điều phối báo" value={t?.dispatcherTransfer} mine={ledgerTransfer} money />
            </div>
            <div>
              <Readout label="Tổng thu trong ngày" value={formatVND(ledgerCash + ledgerTransfer)} />
              <Compare label="phi công báo (thu tại bãi)" value={staffPilotThu} mine={staffPilotThu} money />
            </div>
          </div>

          {/* Bảng tiền cả ngày: khách CK về công ty · ai giữ tiền mặt · ai đã chi */}
          <MoneyBoardCard spot={spot} date={date} embedded />

          {/* Kế toán cũng nộp tiền / xin ứng được như mọi nhân sự khác */}
          <HandoverBox spot={spot} boardDate={date} embedded />
        </CollapseCard>

        {/* Dải mã vé do ĐIỀU PHỐI nhập — kế toán sửa qua khung "Sửa" bên dưới nếu sai */}

        {/* Vé/khách huỷ & dời lịch do ĐIỀU PHỐI nhập — kế toán xác nhận số ở thẻ Số tổng, sai thì bấm "Sửa" báo cáo điều phối */}

        {/* Duyệt lệch: kế toán là người quyết định cuối cùng */}
        <CollapseCard
          className="order-6 lg:order-none"
          title="Duyệt lệch số liệu"
          hint="Các nhân viên báo lệch nhau (điều phối · phi công · camera man). Đúng thực tế thì tick duyệt — ngày vẫn chốt theo SỐ CỦA KẾ TOÁN. Sai ở phía nhân viên thì bấm Sửa trong báo cáo của họ."
        >
          {/* CHỈ kê lệch GIỮA CÁC NHÂN VIÊN với nhau (điều phối · phi công · camera
              man). Không so với số kế toán: số kế toán là số ghi sổ, tự thắng —
              so với chính mình thì chẳng có gì để duyệt. */}
          <div className="mb-3 grid grid-cols-2 gap-2 @md:grid-cols-3">
            {(
              [
                ["Khách: điều phối / phi công", t?.dispatcherGuests, t ? t.pilotFlights + t.pilotPpg : undefined],
                ...(noTickets
                  ? ([] as Array<[string, number | undefined, number | undefined]>)
                  : ([
                      ["Vé xuất: điều phối / mã phi công", t?.dispatcherIssued, t?.pilotCodes],
                      [
                        "Vé thu hồi: điều phối khai / huỷ+dời",
                        t?.dispatcherReturned,
                        suggest ? suggest.cancelledCount + suggest.rescheduledCount : undefined,
                      ],
                    ] as Array<[string, number | undefined, number | undefined]>)),
                ["Flycam: camera man / điều phối", t?.cameramanFlycam, t?.dispatcherFlycam],
                ["Cam 360: phi công / điều phối", t?.pilot360, t?.dispatcher360],
                ["Cờ đỏ: phi công / điều phối", t?.pilotRedFlag, t?.dispatcherRedFlag],
                ...(spot === "sapa"
                  ? ([] as Array<[string, number | undefined, number | undefined]>)
                  : ([["Hoàng hôn/săn mây: phi công / điều phối", t?.pilotSunset, t?.dispatcherSunset]] as Array<
                      [string, number | undefined, number | undefined]
                    >)),
                ["Kéo cờ/bánh: phi công / điều phối", t?.pilotFlagFlight, t?.dispatcherFlagFlight],
                ["Ngoại giao: phi công / điều phối", t?.pilotDiplomatic, t?.dispatcherDiplomatic],
              ] as Array<[string, number | undefined, number | undefined]>
            ).map(([label, a, b]) => {
              const has = typeof a === "number" && typeof b === "number";
              return (
                <Readout
                  key={label}
                  label={label}
                  value={has ? `${a} / ${b}` : "— / —"}
                  tone={has && a !== b ? "warning" : "normal"}
                />
              );
            })}
          </div>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={form.varianceApproved}
              onChange={(e) => set("varianceApproved", e.target.checked)}
              disabled={locked}
              className="mt-1 h-5 w-5 rounded border-slate-300"
            />
            <span className="text-sm text-slate-800">
              <strong>Chấp nhận lệch</strong> — số của kế toán là số ghi sổ; các lệch với nhân viên chỉ còn nhắc
              vàng, không chặn chốt nữa.
            </span>
          </label>
          <TextInput
            value={form.varianceNote}
            onChange={(e) => set("varianceNote", e.target.value)}
            placeholder="Lý do lệch (nên ghi để sau còn nhớ)"
            className="mt-2"
            disabled={locked}
          />
        </CollapseCard>

        <CollapseCard className="order-8 lg:order-none" title="Ghi chú">
          <TextArea
            value={form.note}
            onChange={(e) => set("note", e.target.value)}
            placeholder="Ghi chú của kế toán về ngày này…"
            disabled={locked}
          />
        </CollapseCard>

        {error && (
          <div className="order-9 lg:order-none">
            <Banner tone="error">{error}</Banner>
          </div>
        )}
        {message && (
          <div className="order-9 lg:order-none">
            <Banner tone="success" onClose={() => setMessage(null)}>{message}</Banner>
          </div>
        )}
        {warnings.length > 0 && (
          <div className="order-9 lg:order-none">
          <Banner tone="warning" onClose={() => setWarnings([])}>
            <ul className="list-inside list-disc space-y-0.5 text-xs">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </Banner>
          </div>
        )}

        {date > today && (
          <div className="order-9 lg:order-none">
            <Banner tone="info">
              📅 Ngày {formatDateKeyVN(date)} ở tương lai — xem trước lịch, đến ngày mới nhập báo cáo được.
            </Banner>
          </div>
        )}
        {date <= today && (
        <div className="sticky bottom-3 z-10 order-10 flex items-center gap-2 lg:order-none">
          {locked ? (
            <>
              <Button
                type="button"
                variant="ghost"
                className="flex-1 bg-white shadow-lg"
                disabled={busy !== null}
                onClick={() => action("reopen")}
              >
                {busy === "reopen" ? "Đang gỡ khoá…" : "Gỡ khoá ngày để sửa"}
              </Button>
              <DoneTag show={justDone}>{doneWhat}</DoneTag>
            </>
          ) : (
            <>
              <DoneTag show={justDone}>{doneWhat}</DoneTag>
              <Button
                type="submit"
                variant="ghost"
                className="flex-1 bg-white shadow-lg"
                disabled={busy !== null || loadingDay || savedClean}
              >
                {busy === "save" ? "Đang lưu…" : savedClean ? "✓ Đã lưu" : "Lưu số (chưa chốt)"}
              </Button>
              <Button
                type="button"
                className="flex-1 shadow-lg"
                disabled={busy !== null || loadingDay}
                onClick={() => action("close")}
                title={check?.canClose ? undefined : "Sẽ lưu số hiện tại rồi đối chiếu lại — còn lỗi đỏ thật thì báo cụ thể"}
              >
                {busy === "close" ? "Đang chốt…" : "Lưu & chốt ngày"}
              </Button>
            </>
          )}
        </div>
        )}
      </form>
      </div>
      </div>

    </Shell>
  );
}

/**
 * Dòng so sánh nhỏ dưới mỗi ô: số app cộng được từ báo cáo nhân viên.
 * Khớp thì hiện dấu ✓ xanh, lệch thì hiện nút "lấy số này" để kế toán chọn.
 */
/** Dòng gợi ý cho SỔ THU/CHI: bấm là thành một dòng trong sổ, nhận rồi thì đánh dấu ✓. */
function LedgerSuggest({ label, taken, onTake }: { label: string; taken: boolean; onTake: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className={taken ? "text-emerald-700" : "text-slate-600"}>
        {taken ? "✓ " : ""}
        {label}
      </span>
      {!taken && (
        <button
          type="button"
          onClick={onTake}
          className="rounded-md border border-slate-300 bg-white px-2 py-0.5 font-medium text-slate-700 hover:bg-slate-50"
        >
          ⧉ nhận vào sổ
        </button>
      )}
    </div>
  );
}


/**
 * "camera 360 = Ms Duyên 19 + Đặng V.M 2 + web 1 = 22" — ai nhập bao nhiêu.
 *
 * Cả điều phối lẫn kế toán đều lập booking và thêm/bớt dịch vụ được, nên khi
 * hai bên báo lệch, kế toán cần thấy ngay số nào từ đâu ra thay vì đi hỏi.
 */
function ByPerson({
  list,
  prefix,
}: {
  list?: Array<{ name: string; qty: number }>;
  /** "camera man" / "phi công" — nói rõ dòng này là AI LÀM, không phải ai nhập. */
  prefix?: string;
}) {
  if (!list?.length) return null;
  const total = list.reduce((t, x) => t + x.qty, 0);
  return (
    <p className="mt-1 border-t border-slate-200/70 pt-1 text-[10px] leading-snug text-slate-600">
      {prefix ? <span className="text-slate-400">{prefix} báo: </span> : null}
      {list.map((x, i) => (
        <span key={x.name}>
          {i > 0 && (x.qty < 0 ? " − " : " + ")}
          {x.name} {Math.abs(x.qty)}
        </span>
      ))}{" "}
      = <strong className="text-slate-800">{total}</strong>
    </p>
  );
}

function Compare({
  label,
  value,
  mine,
  money,
  onTake,
}: {
  label: string;
  value: number | undefined;
  mine: number;
  money?: boolean;
  onTake?: (value: number) => void;
}) {
  if (value === undefined) return null;

  const same = value === mine;
  const shown = money ? formatVND(value) : String(value);

  return (
    <div className="mt-1.5 flex items-center gap-1.5 text-xs leading-none">
      {/* Số đứng SÁT nhãn — dồn hết sang phải làm mắt phải nhảy cả ô mới đọc được */}
      <span className={"flex min-w-0 items-baseline gap-1 " + (same ? "text-emerald-700" : "text-amber-700")}>
        <span className="shrink-0">{same ? "✓" : "≠"}</span>
        <span className="truncate">{label}:</span>
        <strong className="shrink-0 tabular-nums">{shown}</strong>
      </span>
      {!same && onTake && (
        <button
          type="button"
          onClick={() => onTake(value)}
          title={`Lấy ${shown}`}
          className="shrink-0 rounded-md border border-amber-300 bg-white px-1.5 py-0.5 font-semibold text-amber-800 hover:bg-amber-50"
        >
          ⧉ lấy
        </button>
      )}
    </div>
  );
}
