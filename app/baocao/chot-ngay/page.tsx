// app/baocao/chot-ngay/page.tsx
"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { formatDateKeyVN, shiftDateKey, todayInVN } from "@/lib/baobay/date";
import { parseTicketCodeList, TICKET_CODE_HINT } from "@/lib/baobay/ticket-code";
import type { DailyCloseDTO, ReconcileDTO } from "@/lib/baobay/types";
import { BACKDATE_LIMIT_DAYS } from "@/lib/baobay/validation";
import { ROLE_LABEL } from "@/lib/baobay/roles";
import { formatVND } from "@/lib/pricing";

import { apiGet, apiPatch, apiPost } from "../components/client-api";
import {
  RangeRows,
  RescheduleRows,
  rangeRowsTotal,
  toRangeRows,
  toRescheduleRows,
  type RangeRow,
  type RescheduleRow,
  toExpenseRows,
  ExpenseRows,
  type ExpenseRow,
} from "../components/rows";
import { HandoverBox } from "../components/HandoverBox";
import { PenaltyCard } from "../components/PenaltyCard";
import { PilotReportEditor } from "../components/PilotReportEditor";
import { StaffReportEditor } from "../components/StaffReportEditor";
import { useBaobaySession } from "../components/session";
import { SpotSwitcher, useSpot } from "../components/spot";
import { Shell } from "../components/Shell";
import {
  Banner,
  Button,
  Card,
  CountInput,
  Field,
  MoneyInput,
  Readout,
  TextArea,
  TextInput,
} from "../components/ui";

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
  ticketsIssued: number;
  ticketsReturned: number;
  cancelledCount: number;
  rescheduledCount: number;
  issuedRanges: Array<{ from: string; to: string }>;
  cancelledCodesText: string;
  rescheduled: Array<{ code: string; toDate: string; note: string }>;
  cashTotal: number;
  transferTotal: number;
  flycam: number;
  video360: number;
  flagFlight: number;
  pilot: { flights: number; flycam: number; video360: number; flagFlight: number; hasData: boolean };
  dispatcher: { flycam: number; video360: number; flagFlight: number; hasData: boolean };
  hasData: boolean;
};

type FormState = {
  guestCount: number;
  ticketsIssued: number;
  ticketsReturned: number;
  cancelledCount: number;
  rescheduledCount: number;
  issuedRanges: RangeRow[];
  cancelledCodesText: string;
  rescheduled: RescheduleRow[];
  cashTotal: number;
  transferTotal: number;
  flycam: number;
  video360: number;
  flagFlight: number;
  ledger: ExpenseRow[];
  expensesApproved: boolean;
  expensesApprovedNote: string;
  varianceApproved: boolean;
  varianceNote: string;
  note: string;
};

const EMPTY_FORM: FormState = {
  guestCount: 0,
  ticketsIssued: 0,
  ticketsReturned: 0,
  cancelledCount: 0,
  rescheduledCount: 0,
  issuedRanges: [{ from: "", to: "" }],
  cancelledCodesText: "",
  rescheduled: [{ code: "", toDate: "", note: "" }],
  cashTotal: 0,
  transferTotal: 0,
  flycam: 0,
  video360: 0,
  flagFlight: 0,
  ledger: [],
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
      fallback={<div className="flex min-h-dvh items-center justify-center text-sm text-slate-500">Đang tải…</div>}
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
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const locked = close?.status === "closed";

  const rangeTotal = useMemo(() => rangeRowsTotal(form.issuedRanges), [form.issuedRanges]);
  const cancelled = useMemo(() => parseTicketCodeList(form.cancelledCodesText), [form.cancelledCodesText]);
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
            ticketsIssued: res.close.ticketsIssued,
            ticketsReturned: res.close.ticketsReturned,
            cancelledCount: res.close.cancelledCount,
            rescheduledCount: res.close.rescheduledCount,
            issuedRanges: toRangeRows(res.close.issuedRanges),
            cancelledCodesText: res.close.cancelledCodes.join(", "),
            rescheduled: toRescheduleRows(res.close.rescheduled),
            cashTotal: res.close.cashTotal,
            transferTotal: res.close.transferTotal,
            flycam: res.close.flycam,
            video360: res.close.video360,
            flagFlight: res.close.flagFlight,
            ledger: toExpenseRows(res.close.ledger).filter((e) => e.content || e.amount),
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
   * Lấy số ĐIỀU PHỐI báo: điều phối nắm quầy vé nên phía này cho được trọn bộ —
   * khách, vé, dải mã, huỷ/dời, tiền, và cả ba dịch vụ theo con số quầy đếm.
   */
  function copyFromDispatcher() {
    if (!suggest?.dispatcher.hasData) return;
    setForm((prev) => ({
      ...prev,
      guestCount: suggest.guestCount,
      ticketsIssued: suggest.ticketsIssued,
      ticketsReturned: suggest.ticketsReturned,
      cancelledCount: suggest.cancelledCount,
      rescheduledCount: suggest.rescheduledCount,
      issuedRanges: suggest.issuedRanges.length ? suggest.issuedRanges.map((r) => ({ ...r })) : prev.issuedRanges,
      cancelledCodesText: suggest.cancelledCodesText,
      rescheduled: suggest.rescheduled.length ? suggest.rescheduled.map((r) => ({ ...r })) : prev.rescheduled,
      cashTotal: suggest.cashTotal,
      transferTotal: suggest.transferTotal,
      flycam: suggest.dispatcher.flycam,
      video360: suggest.dispatcher.video360,
      flagFlight: suggest.dispatcher.flagFlight,
    }));
    setMessage("Đã lấy số ĐIỀU PHỐI báo — soát lại rồi bấm Lưu.");
  }

  /**
   * Lấy tổng số PHI CÔNG báo: phi công chỉ nắm phần mình bay — dịch vụ trên
   * từng chuyến và tổng chuyến. Khách/tiền/dải mã là việc của quầy, giữ nguyên.
   */
  function copyFromPilots() {
    if (!suggest?.pilot.hasData) return;
    setForm((prev) => ({
      ...prev,
      flycam: suggest.pilot.flycam,
      video360: suggest.pilot.video360,
      flagFlight: suggest.pilot.flagFlight,
    }));
    setMessage(
      `Đã lấy tổng PHI CÔNG báo (flycam/360/kéo cờ; tổng ${suggest.pilot.flights} chuyến) — khách, tiền và mã vé vẫn theo số đang nhập.`,
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
            issuedRanges: form.issuedRanges.filter((r) => r.from.trim() || r.to.trim()),
            rescheduled: rescheduledFilled,
            ledger: form.ledger.filter((e) => e.content.trim() || e.amount),
          },
        );
        apply(res);
        setWarnings(res.warnings || []);
        setMessage(`Đã lưu số chốt ngày ${formatDateKeyVN(date)} (chưa chốt).`);
        return;
      }

      if (kind === "close") {
        const res = await apiPost<{ close: DailyCloseDTO; reconcile: ReconcileDTO }>(`/api/baocao/close?spot=${spot}`, {
          action: "close",
          date,
        });
        apply(res);
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
      setMessage(`Đã gỡ khoá ngày ${formatDateKeyVN(date)} — nhân viên sửa được số trở lại.`);
    } catch (err: any) {
      setError(err?.message || "Không thực hiện được");
    } finally {
      setBusy(null);
    }
  }

  if (loading || !user || !spot) {
    return <div className="flex min-h-dvh items-center justify-center text-sm text-slate-500">Đang tải…</div>;
  }

  const t = check?.totals;
  const reds = (check?.issues || []).filter((i) => i.severity === "red");
  const warns = (check?.issues || []).filter((i) => i.severity === "warn");

  return (
    <Shell
      user={user}
      title="Chốt ngày"
      subtitle="Nhập số tổng của ngày, đối chiếu với báo cáo nhân viên, duyệt chi tiêu, rồi chốt để khoá số."
    >
      <SpotSwitcher spot={spot} options={spotOptions} onChange={setSpot} />

      <Card title="Ngày chốt">
        <Field label="Chọn ngày" hint={`Đang xem: ${formatDateKeyVN(date)}`}>
          <TextInput
            type="date"
            value={date}
            max={today}
            min={shiftDateKey(today, -BACKDATE_LIMIT_DAYS)}
            onChange={(e) => e.target.value && setDate(e.target.value)}
          />
        </Field>

        {loadingDay && <p className="mt-2 text-xs text-slate-500">Đang tải…</p>}

        {!loadingDay && (
          <div className="mt-3">
            {locked ? (
              <Banner tone="success">
                <strong>Ngày này đã chốt</strong>
                {close?.closedAt ? ` lúc ${new Date(close.closedAt).toLocaleString("vi-VN")}` : ""}
                {close?.closedBy ? ` bởi ${close.closedBy}` : ""}. Số liệu đã khoá với mọi nhân viên.
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
      </Card>

      {/* Danh sách lỗi: thứ kế toán cần đọc trước khi làm gì */}
      {(reds.length > 0 || warns.length > 0) && (
        <Card title="Cần xử lý">
          <ul className="space-y-2">
            {reds.map((i, k) => (
              <li key={`r${k}`} className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm">
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                <div>
                  <div className="text-rose-900">{i.message}</div>
                  {i.who.length > 0 && (
                    <div className="mt-0.5 text-xs text-rose-700">Liên quan: {i.who.join(", ")}</div>
                  )}
                </div>
              </li>
            ))}
            {warns.map((i, k) => (
              <li key={`w${k}`} className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                <div className="text-amber-900">{i.message}</div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Kế toán sửa báo cáo phi công ngay tại đây — sửa xong đối chiếu tự chạy lại */}
      <PilotReportEditor spot={spot} date={date} locked={locked} onSaved={() => loadDay(date)} />

      {/* Và sửa hộ cả điều phối / camera man — chỗ hay kẹt nhất khi số quầy sai */}
      <StaffReportEditor spot={spot} date={date} locked={locked} onSaved={() => loadDay(date)} />

      {/* Phạt nộp muộn: khoản đã ghi (huỷ được) và khoản tạm tính (tự huỷ khi chốt) */}
      <PenaltyCard spot={spot} date={date} reloadKey={reloadKey} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          action("save");
        }}
        className="space-y-4"
      >
        <Card
          title="Số tổng trong ngày"
          hint="Kế toán tự gõ. Con số nhỏ bên dưới là số app cộng từ báo cáo nhân viên — để so, không phải để điền hộ."
        >
          {/* Nhân viên nhập, kế toán chỉ XÁC NHẬN: chép cả bảng rồi soát, sai chỗ nào sửa tay hoặc truy người nhập */}
          {suggest?.hasData && !locked && (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
              <span className="text-sm text-emerald-900">Nhân viên đã báo — đúng thì lấy, khỏi gõ lại:</span>
              {suggest.dispatcher.hasData && (
                <Button type="button" variant="ghost" className="h-9 bg-white px-3 text-xs" onClick={copyFromDispatcher}>
                  ⧉ Lấy số ĐIỀU PHỐI báo
                </Button>
              )}
              {suggest.pilot.hasData && (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 bg-white px-3 text-xs"
                  onClick={copyFromPilots}
                  title={`Tổng phi công: ${suggest.pilot.flights} chuyến · flycam ${suggest.pilot.flycam} · 360 ${suggest.pilot.video360} · kéo cờ ${suggest.pilot.flagFlight}`}
                >
                  ⧉ Lấy tổng PHI CÔNG báo
                </Button>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Số khách bay trong ngày">
              <CountInput value={form.guestCount} onChange={(v) => set("guestCount", v)} max={5000} />
              <Compare label="điều phối báo" value={t?.dispatcherGuests} mine={form.guestCount}
                onTake={locked ? undefined : (v) => set("guestCount", v)} />
            </Field>

            <Field label="Số vé được xuất ra">
              <CountInput value={form.ticketsIssued} onChange={(v) => set("ticketsIssued", v)} max={5000} />
              <Compare label="điều phối báo" value={t?.dispatcherIssued} mine={form.ticketsIssued}
                onTake={locked ? undefined : (v) => set("ticketsIssued", v)} />
            </Field>

            <Field label="Số vé thu hồi (huỷ + dời)">
              <CountInput value={form.ticketsReturned} onChange={(v) => set("ticketsReturned", v)} max={5000} />
              <Compare label="điều phối báo" value={t?.dispatcherReturned} mine={form.ticketsReturned}
                onTake={locked ? undefined : (v) => set("ticketsReturned", v)} />
            </Field>

            <Field label="Trong đó: vé huỷ hoàn tiền">
              <CountInput value={form.cancelledCount} onChange={(v) => set("cancelledCount", v)} max={5000} />
              <Compare label="đếm theo mã đã liệt kê" value={cancelled.codes.length} mine={form.cancelledCount}
                onTake={locked ? undefined : (v) => set("cancelledCount", v)} />
            </Field>

            <Field label="Trong đó: vé dời lịch">
              <CountInput value={form.rescheduledCount} onChange={(v) => set("rescheduledCount", v)} max={5000} />
              <Compare label="đếm theo mã đã liệt kê" value={rescheduledFilled.length} mine={form.rescheduledCount}
                onTake={locked ? undefined : (v) => set("rescheduledCount", v)} />
            </Field>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {/* Mỗi dịch vụ hiện CẢ HAI nguồn — kế toán chấp nhận nguồn nào thì bấm nguồn đó */}
            <Field label="Số lượng flycam">
              <CountInput value={form.flycam} onChange={(v) => set("flycam", v)} max={1000} />
              <Compare label="camera man báo" value={t?.cameramanFlycam} mine={form.flycam}
                onTake={locked ? undefined : (v) => set("flycam", v)} />
              <Compare label="điều phối báo" value={t?.dispatcherFlycam} mine={form.flycam}
                onTake={locked ? undefined : (v) => set("flycam", v)} />
            </Field>
            <Field label="Số lượng Camera 360">
              <CountInput value={form.video360} onChange={(v) => set("video360", v)} max={1000} />
              <Compare label="phi công báo" value={t?.pilot360} mine={form.video360}
                onTake={locked ? undefined : (v) => set("video360", v)} />
              <Compare label="điều phối báo" value={t?.dispatcher360} mine={form.video360}
                onTake={locked ? undefined : (v) => set("video360", v)} />
            </Field>
            <Field label="Số lượng bay kéo cờ">
              <CountInput value={form.flagFlight} onChange={(v) => set("flagFlight", v)} max={1000} />
              <Compare label="phi công báo" value={t?.pilotFlagFlight} mine={form.flagFlight}
                onTake={locked ? undefined : (v) => set("flagFlight", v)} />
              <Compare label="điều phối báo" value={t?.dispatcherFlagFlight} mine={form.flagFlight}
                onTake={locked ? undefined : (v) => set("flagFlight", v)} />
            </Field>
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
                  <option value="flagFlight">Bay kéo cờ</option>
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

          <div className="mt-4">
            <Readout
              label="Vé xuất − vé thu hồi (phải bằng tổng chuyến phi công báo)"
              value={`${form.ticketsIssued - form.ticketsReturned} / ${t?.pilotFlights ?? "?"} chuyến`}
              tone={
                t && form.ticketsIssued - form.ticketsReturned !== t.pilotFlights ? "warning" : "normal"
              }
            />
          </div>
        </Card>

        <Card
          title="Sổ THU / CHI của kế toán"
          hint="Khoản tiền kế toán trực tiếp thu hoặc chi trong ngày — mỗi dòng: nội dung – số tiền – tick Thu hoặc Chi"
        >
          <ExpenseRows rows={form.ledger} onChange={(rows) => set("ledger", rows)} disabled={locked} withKind />
        </Card>

        <Card title="Mã vé đã xuất" hint="Nhiều cuốn khác tiền tố thì thêm dòng: A1234–A1256 và B1234–B1239">
          <RangeRows rows={form.issuedRanges} onChange={(rows) => set("issuedRanges", rows)} disabled={locked} />
          {suggest && suggest.issuedRanges.length > 0 && !locked && (
            <CopyLine
              label={`điều phối khai ${suggest.issuedRanges.length} dải: ${suggest.issuedRanges.map((r) => `${r.from}→${r.to}`).join(" · ")}`}
              onCopy={() => set("issuedRanges", suggest.issuedRanges.map((r) => ({ ...r })))}
            />
          )}
          <div className="mt-3">
            <Readout
              label="Tổng theo dải mã (phải bằng số vé xuất ra)"
              value={`${rangeTotal} / ${form.ticketsIssued}`}
              tone={rangeTotal > 0 && rangeTotal !== form.ticketsIssued ? "warning" : "normal"}
            />
          </div>
        </Card>

        <Card title="Vé huỷ và vé dời lịch">
          <Field label="Mã vé huỷ hoàn tiền" hint={TICKET_CODE_HINT}>
            <TextArea
              value={form.cancelledCodesText}
              onChange={(e) => set("cancelledCodesText", e.target.value)}
              placeholder="A1235, B1235, A1244"
              autoCapitalize="characters"
              spellCheck={false}
              className="min-h-16"
              disabled={locked}
            />
            {suggest && suggest.cancelledCodesText && !locked && (
              <CopyLine
                label={`điều phối khai: ${suggest.cancelledCodesText}`}
                onCopy={() => set("cancelledCodesText", suggest.cancelledCodesText)}
              />
            )}
          </Field>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <Field label="Vé dời lịch" hint="Dời sang ngày nào phải ghi rõ — ngày đó sẽ xuất vé mới cho khách">
              <div />
            </Field>
            <RescheduleRows
              rows={form.rescheduled}
              onChange={(rows) => set("rescheduled", rows)}
              minDate={shiftDateKey(date, 1)}
              disabled={locked}
            />
            {suggest && suggest.rescheduled.length > 0 && !locked && (
              <CopyLine
                label={`điều phối khai ${suggest.rescheduled.length} vé dời: ${suggest.rescheduled.map((r) => `${r.code}→${r.toDate}`).join(" · ")}`}
                onCopy={() => set("rescheduled", suggest.rescheduled.map((r) => ({ ...r })))}
              />
            )}
          </div>
        </Card>

        <Card title="Tiền trong ngày">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tổng tiền mặt thu về">
              <MoneyInput value={form.cashTotal} onChange={(v) => set("cashTotal", v)} />
              <Compare label="điều phối báo" value={t?.dispatcherCash} mine={form.cashTotal} money
                onTake={locked ? undefined : (v) => set("cashTotal", v)} />
            </Field>
            <Field label="Tổng chuyển khoản">
              <MoneyInput value={form.transferTotal} onChange={(v) => set("transferTotal", v)} />
              <Compare label="điều phối báo" value={t?.dispatcherTransfer} mine={form.transferTotal} money
                onTake={locked ? undefined : (v) => set("transferTotal", v)} />
            </Field>
          </div>
          <div className="mt-3">
            <Readout label="Tổng thu" value={formatVND(form.cashTotal + form.transferTotal)} />
          </div>
        </Card>

        {/* Xác nhận chi tiêu — liệt kê từng khoản để kế toán đọc rồi tick */}
        <Card
          title={`Chi tiêu nhân viên khai · ${formatVND(check?.expenseTotal ?? 0)}`}
          hint="Kế toán đọc từng khoản rồi xác nhận. Có chi tiêu mà chưa xác nhận thì chưa chốt được ngày."
        >
          {check && check.expenseLines.length > 0 ? (
            <ul className="mb-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
              {check.expenseLines.map((e, k) => (
                <li key={k} className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 text-sm">
                  <span className="text-xs text-slate-500">
                    {e.who} · {ROLE_LABEL[e.role]}
                  </span>
                  <span className="flex-1 text-slate-900">{e.content}</span>
                  {e.note && <span className="text-xs text-slate-500">{e.note}</span>}
                  <span className="font-semibold tabular-nums text-slate-900">{formatVND(e.amount)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 text-sm text-slate-500">Hôm nay không có khoản chi nào.</p>
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
              <strong>Tôi đã đọc và xác nhận các khoản chi trên.</strong>
            </span>
          </label>
          <TextInput
            value={form.expensesApprovedNote}
            onChange={(e) => set("expensesApprovedNote", e.target.value)}
            placeholder="Ghi chú duyệt chi (không bắt buộc)"
            className="mt-2"
            disabled={locked}
          />
        </Card>

        {/* Duyệt lệch dịch vụ gia tăng */}
        <Card
          title="Duyệt lệch dịch vụ gia tăng"
          hint="Khách hay đăng ký thêm flycam/360 ngay tại bãi nên số các bên có thể lệch. Đúng thực tế thì duyệt; sai thì yêu cầu người báo sửa lại."
        >
          <div className="mb-3 grid grid-cols-3 gap-3">
            <Readout label="Flycam: camera man / điều phối" value={`${t?.cameramanFlycam ?? 0} / ${t?.dispatcherFlycam ?? 0}`}
              tone={t && t.cameramanFlycam !== t.dispatcherFlycam ? "warning" : "normal"} />
            <Readout label="360: phi công / điều phối" value={`${t?.pilot360 ?? 0} / ${t?.dispatcher360 ?? 0}`}
              tone={t && t.pilot360 !== t.dispatcher360 ? "warning" : "normal"} />
            <Readout label="Ngoại giao: phi công / điều phối" value={`${t?.pilotDiplomatic ?? 0} / ${t?.dispatcherDiplomatic ?? 0}`}
              tone={t && t.pilotDiplomatic !== t.dispatcherDiplomatic ? "warning" : "normal"} />
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
              <strong>Chấp nhận lệch</strong> — số lệch là phát sinh thật tại bãi, không phải khai sai.
            </span>
          </label>
          <TextInput
            value={form.varianceNote}
            onChange={(e) => set("varianceNote", e.target.value)}
            placeholder="Lý do lệch (nên ghi để sau còn nhớ)"
            className="mt-2"
            disabled={locked}
          />
        </Card>

        <Card title="Ghi chú">
          <TextArea
            value={form.note}
            onChange={(e) => set("note", e.target.value)}
            placeholder="Ghi chú của kế toán về ngày này…"
            disabled={locked}
          />
        </Card>

        {error && <Banner tone="error">{error}</Banner>}
        {message && <Banner tone="success" onClose={() => setMessage(null)}>{message}</Banner>}
        {warnings.length > 0 && (
          <Banner tone="warning" onClose={() => setWarnings([])}>
            <ul className="list-inside list-disc space-y-0.5 text-xs">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </Banner>
        )}

        <div className="sticky bottom-3 z-10 flex gap-2">
          {locked ? (
            <Button
              type="button"
              variant="ghost"
              className="w-full bg-white shadow-lg"
              disabled={busy !== null}
              onClick={() => action("reopen")}
            >
              {busy === "reopen" ? "Đang gỡ khoá…" : "Gỡ khoá ngày để sửa"}
            </Button>
          ) : (
            <>
              <Button
                type="submit"
                variant="ghost"
                className="flex-1 bg-white shadow-lg"
                disabled={busy !== null || loadingDay}
              >
                {busy === "save" ? "Đang lưu…" : "Lưu số (chưa chốt)"}
              </Button>
              <Button
                type="button"
                className="flex-1 shadow-lg"
                disabled={busy !== null || loadingDay || !check?.canClose}
                onClick={() => action("close")}
                title={check?.canClose ? undefined : "Còn lỗi đỏ, chưa chốt được"}
              >
                {busy === "close" ? "Đang chốt…" : "Chốt ngày"}
              </Button>
            </>
          )}
        </div>
      </form>

      {/* Kế toán cũng có lúc cầm tiền hộ và phải nộp lại — cùng một khung với nhân sự khác */}
      <div className="mt-4">
        <HandoverBox spot={spot} />
      </div>
    </Shell>
  );
}

/**
 * Dòng so sánh nhỏ dưới mỗi ô: số app cộng được từ báo cáo nhân viên.
 * Khớp thì hiện dấu ✓ xanh, lệch thì hiện nút "lấy số này" để kế toán chọn.
 */
/** Một dòng "điều phối khai: …" kèm nút chép — cho các trường mã vé, không phải ô số. */
function CopyLine({ label, onCopy }: { label: string; onCopy: () => void }) {
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
      <span className="text-slate-600">{label}</span>
      <button
        type="button"
        onClick={onCopy}
        className="rounded-md border border-slate-300 bg-white px-2 py-0.5 font-medium text-slate-700 hover:bg-slate-50"
      >
        ⧉ chép để xác nhận
      </button>
    </div>
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
    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
      <span className={same ? "text-emerald-700" : "text-amber-700"}>
        {same ? "✓" : "≠"} {label}: <strong className="tabular-nums">{shown}</strong>
      </span>
      {!same && onTake && (
        <button
          type="button"
          onClick={() => onTake(value)}
          className="rounded-md border border-slate-300 bg-white px-2 py-0.5 font-medium text-slate-700 hover:bg-slate-50"
        >
          lấy số này
        </button>
      )}
    </div>
  );
}
