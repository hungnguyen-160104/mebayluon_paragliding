// app/baocao/phi-cong/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { formatDateKeyVN, shiftDateKey, todayInVN } from "@/lib/baobay/date";
import type { Issue } from "@/lib/baobay/reconcile";
import { parseTicketCodeList, TICKET_CODE_HINT } from "@/lib/baobay/ticket-code";
import type { PilotReportDTO } from "@/lib/baobay/types";
import { BACKDATE_LIMIT_DAYS } from "@/lib/baobay/validation";
import { formatVND } from "@/lib/pricing";

import { apiGet, apiPost } from "../components/client-api";
import { DateBar } from "../components/DateBar";
import { AssignedBookings } from "../components/BookingCard";
import { CollectInbox } from "../components/CollectBox";
import {
  ExpenseRows,
  toExpenseRows,
  type ExpenseRow,
  CancelGuestRows,
  RescheduleGuestRows,
  type CancelGuestRow,
  type RescheduleGuestRow,
} from "../components/rows";
import { HandoverBox } from "../components/HandoverBox";
import { MyShifts } from "../components/MyShifts";
import { PeriodSummary } from "../components/PeriodSummary";
import { ReviewNotices } from "../components/ReviewNotices";
import { useBaobaySession } from "../components/session";
import { useSpot } from "../components/spot";
import { Shell } from "../components/Shell";
import { Banner, Button, Card, CountInput, Field, MoneyInput, Readout, ServiceBox, TextArea, TextInput, CollapseCard } from "../components/ui";

/**
 * Phi công báo cáo một ngày bay.
 *
 * Ba quy tắc chi phối trang này:
 *
 *  1. Một ngày một bản ghi. Mở lại đúng ngày đó thì form hiện số cũ và lưu là
 *     ghi đè — bay xong nhập tạm rồi tối bổ sung cũng không làm cộng trùng.
 *  2. LƯU NHÁP lúc nào cũng được, nhưng CHỐT thì phải sạch: mã vé đúng dạng và
 *     số chuyến bằng số mã. Kế toán chỉ chốt được ngày khi mọi phi công đã chốt.
 *  3. Kế toán chốt ngày rồi là khoá — form chuyển sang chỉ đọc.
 *
 * Phi công KHÔNG khai flycam (camera man khai) và không khai cờ đỏ / bay kéo cờ/bánh
 * (điều phối khai) — chỉ khai thứ mình nắm chắc.
 */

type FormState = {
  flightCount: number;
  ticketCodesText: string;
  flycam: number;
  flycamCodesText: string;
  video360: number;
  video360CodesText: string;
  redFlag: number;
  redFlagCodesText: string;
  flagFlight: number;
  flagFlightCodesText: string;
  diplomaticGuests: number;
  diplomaticCodesText: string;
  diplomaticNoTicket: number;
  diplomaticNote: string;
  siteFeeGuests: number;
  waterCost: number;
  guestCarCost: number;
  pickupBigC: number;
  pickupHotel: number;
  mountainTrips: number;
  ppgFlights: number;
  ppgCodesText: string;
  ppgNoTicket: number;
  expenses: ExpenseRow[];
  /** Khách huỷ / dời lịch phi công báo — kênh phụ bên cạnh điều phối. */
  cancelledGuests: CancelGuestRow[];
  rescheduledGuests: RescheduleGuestRow[];
  note: string;
};

const EMPTY_FORM: FormState = {
  flightCount: 0,
  ticketCodesText: "",
  flycam: 0,
  flycamCodesText: "",
  video360: 0,
  video360CodesText: "",
  redFlag: 0,
  redFlagCodesText: "",
  flagFlight: 0,
  flagFlightCodesText: "",
  diplomaticGuests: 0,
  diplomaticCodesText: "",
  diplomaticNoTicket: 0,
  diplomaticNote: "",
  siteFeeGuests: 0,
  waterCost: 0,
  guestCarCost: 0,
  pickupBigC: 0,
  pickupHotel: 0,
  mountainTrips: 0,
  ppgFlights: 0,
  ppgCodesText: "",
  ppgNoTicket: 0,
  expenses: [{ content: "", amount: 0, kind: "chi", note: "" }],
  cancelledGuests: [{ name: "", bookingCode: "", guests: 0, source: "", refund: 0, note: "", codesText: "" }],
  rescheduledGuests: [
    { name: "", guests: 0, toDate: "", note: "", phone: "", pickup: "self", pickupNote: "", expectedTime: "", codesText: "", bookedId: "" },
  ],
  note: "",
};

type DayCheck = { dayBlocked: boolean; myIssues: Issue[]; otherIssueCount: number };

/** Phụ đề tiếng Anh cỡ chữ rất nhỏ, mờ — tiếng Việt vẫn là chữ chính. */
function bi(vi: string, en: string) {
  return (
    <>
      {vi} <span className="text-[10px] font-normal text-slate-400">({en})</span>
    </>
  );
}

export default function PilotReportPage() {
  const { user, loading } = useBaobaySession("pilot");
  const { spot, setSpot, options: spotOptions } = useSpot(user?.spots);

  const today = todayInVN();
  const [date, setDate] = useState(today);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [existing, setExisting] = useState<PilotReportDTO | null>(null);
  const [locked, setLocked] = useState(false);
  const [check, setCheck] = useState<DayCheck | null>(null);
  const [deadline, setDeadline] = useState<{ time: string; past: boolean } | null>(null);
  const [loadingDay, setLoadingDay] = useState(false);
  const [saving, setSaving] = useState<"draft" | "submit" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ warnings: string[]; submitted: boolean } | null>(null);
  const [history, setHistory] = useState<PilotReportDTO[]>([]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  /** Đọc mã vé ngay khi gõ để phi công thấy số mã có khớp số chuyến hay không. */
  const parsedCodes = useMemo(() => parseTicketCodeList(form.ticketCodesText), [form.ticketCodesText]);
  const parsed360 = useMemo(() => parseTicketCodeList(form.video360CodesText), [form.video360CodesText]);
  const parsedPpg = useMemo(() => parseTicketCodeList(form.ppgCodesText), [form.ppgCodesText]);

  const loadDay = useCallback(async (targetDate: string) => {
    if (!spot) return;
    setLoadingDay(true);
    setError(null);
    setSaved(null);
    try {
      const res = await apiGet<{
        report: PilotReportDTO | null;
        locked: boolean;
        check: DayCheck;
        submitDeadline: string;
        pastDeadline: boolean;
      }>(`/api/baocao/reports/pilot?date=${targetDate}&spot=${spot}`);

      setExisting(res.report);
      setLocked(res.locked);
      setCheck(res.check);
      setDeadline({ time: res.submitDeadline, past: res.pastDeadline });
      setForm(
        res.report
          ? {
              flightCount: res.report.flightCount,
              ticketCodesText: res.report.ticketCodes.join(", "),
              flycam: res.report.flycam,
              flycamCodesText: res.report.flycamCodes.join(", "),
              video360: res.report.video360,
              video360CodesText: res.report.video360Codes.join(", "),
              redFlag: res.report.redFlag,
              redFlagCodesText: res.report.redFlagCodes.join(", "),
              flagFlight: res.report.flagFlight,
              flagFlightCodesText: res.report.flagFlightCodes.join(", "),
              diplomaticGuests: res.report.diplomaticGuests,
              diplomaticCodesText: res.report.diplomaticCodes.join(", "),
              diplomaticNoTicket: res.report.diplomaticNoTicket,
              diplomaticNote: res.report.diplomaticNote,
              siteFeeGuests: res.report.siteFeeGuests,
              waterCost: res.report.waterCost,
              guestCarCost: res.report.guestCarCost,
              pickupBigC: res.report.pickupBigC,
              pickupHotel: res.report.pickupHotel,
              mountainTrips: res.report.mountainTrips,
              ppgFlights: res.report.ppgFlights,
              ppgCodesText: res.report.ppgCodes.join(", "),
              ppgNoTicket: res.report.ppgNoTicket,
              expenses: toExpenseRows(res.report.expenses),
              cancelledGuests: res.report.cancelledGuestEntries.length
                ? res.report.cancelledGuestEntries.map((e) => ({
                    ...e,
                    note: e.note || "",
                    codesText: (e.codes ?? []).join(", "),
                  }))
                : EMPTY_FORM.cancelledGuests,
              rescheduledGuests: res.report.rescheduledGuestEntries.length
                ? res.report.rescheduledGuestEntries.map((e) => ({
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
              note: res.report.note,
            }
          : EMPTY_FORM,
      );
    } catch (err: any) {
      setError(err?.message || "Không tải được số liệu ngày này");
    } finally {
      setLoadingDay(false);
    }
  }, [spot]);

  const loadHistory = useCallback(async () => {
    if (!spot) return;
    try {
      const { reports } = await apiGet<{ reports: PilotReportDTO[] }>(`/api/baocao/reports/pilot?spot=${spot}`);
      setHistory(reports);
    } catch {
      /* danh sách gần đây chỉ để tham khảo, hỏng thì bỏ qua */
    }
  }, [spot]);

  useEffect(() => {
    if (user && spot) loadDay(date);
  }, [user, spot, date, loadDay]);

  useEffect(() => {
    if (user && spot) loadHistory();
  }, [user, spot, loadHistory]);

  async function save(submit: boolean) {
    setError(null);
    setSaved(null);
    setSaving(submit ? "submit" : "draft");
    try {
      const res = await apiPost<{ report: PilotReportDTO; warnings: string[]; check: DayCheck }>(
        `/api/baocao/reports/pilot?spot=${spot}`,
        {
          date,
          ...form,
          expenses: form.expenses.filter((e) => e.content.trim() || e.amount),
          cancelledGuestEntries: form.cancelledGuests.filter(
            (e) => e.name.trim() || e.guests || e.bookingCode.trim() || e.codesText.trim(),
          ),
          rescheduledGuestEntries: form.rescheduledGuests.filter(
            (e) => e.name.trim() || e.guests || e.toDate || e.codesText.trim(),
          ),
          submit,
        },
      );

      setExisting(res.report);
      setCheck(res.check);
      // Chuẩn hoá lại các ô mã theo bản máy chủ đã lưu (in hoa, bỏ trùng).
      setForm((prev) => ({
        ...prev,
        ticketCodesText: res.report.ticketCodes.join(", "),
        flycamCodesText: res.report.flycamCodes.join(", "),
        video360CodesText: res.report.video360Codes.join(", "),
        redFlagCodesText: res.report.redFlagCodes.join(", "),
        flagFlightCodesText: res.report.flagFlightCodes.join(", "),
        diplomaticCodesText: res.report.diplomaticCodes.join(", "),
        expenses: toExpenseRows(res.report.expenses),
      }));
      setSaved({ warnings: res.warnings || [], submitted: res.report.submitted });
      loadHistory();
    } catch (err: any) {
      setError(err?.message || "Không lưu được báo cáo");
    } finally {
      setSaving(null);
    }
  }

  /**
   * "Xác nhận dời" của PHI CÔNG — y hệt điều phối: đẩy nhóm khách vào SỔ
   * BOOKING của ngày dời (hiện trong 🛫 Booking bay ngày đó), khoá chống đẩy
   * trùng lưu ngay vào báo cáo.
   */
  async function confirmMove(index: number) {
    const row = form.rescheduledGuests[index];
    if (!row || !row.toDate || row.bookedId) return;
    const codeCount = parseTicketCodeList(row.codesText).codes.length;
    const guestTotal = row.guests || codeCount;
    if (!guestTotal) return;
    setError(null);
    setSaving("draft");
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
        note: `Khách dời từ ngày ${formatDateKeyVN(date)} (phi công ${user?.name ?? ""} báo)${row.codesText.trim() ? ` — vé: ${row.codesText.trim()}` : ""}${row.note ? ` — ${row.note}` : ""}`,
        rescheduledFrom: date,
      });
      set("rescheduledGuests", form.rescheduledGuests.map((r, i) => (i === index ? { ...r, bookedId: res.booking.id } : r)));
      setSaved({ warnings: [`Đã đẩy nhóm khách vào lịch booking ngày ${formatDateKeyVN(row.toDate)} — nhớ bấm Lưu/Chốt báo cáo.`], submitted: existing?.submitted ?? false });
    } catch (err: any) {
      setError(err?.message || "Không đẩy được vào lịch booking");
    } finally {
      setSaving(null);
    }
  }

  if (loading || !user || !spot) {
    return <div className="flex min-h-dvh items-center justify-center text-sm text-slate-500">Đang tải…</div>;
  }

  /** Mã vé chỉ BẮT BUỘC ở Khau Phạ (vé 3 liên in mã) — điểm khác khai được thì tốt. */
  const requireCodes = spot === "khau-pha";
  const codeCountMismatch = parsedCodes.codes.length !== form.flightCount;
  /**
   * Ngày CHỈ BAY PPG (0 chuyến PG) vẫn phải chốt được — trước đây nút chốt đòi
   * flightCount > 0 nên phi công nhập PPG xong mà nút vẫn xám, tưởng app hỏng.
   */
  const hasAnyFlights = form.flightCount > 0 || form.ppgFlights > 0;
  const ppgConsistent =
    spot !== "khau-pha" ||
    form.ppgFlights === 0 ||
    (!parsedPpg.malformed.length && parsedPpg.codes.length + form.ppgNoTicket === form.ppgFlights);
  const canSubmit =
    !locked &&
    !parsedCodes.malformed.length &&
    (!requireCodes || !codeCountMismatch) &&
    ppgConsistent &&
    hasAnyFlights;
  const myReds = (check?.myIssues || []).filter((i) => i.severity === "red");
  // Dòng THU (phi công cầm hộ tiền khách) không phải khoản chi — không cộng vào tổng chi
  const expenseSum =
    form.waterCost +
    form.guestCarCost +
    form.expenses.reduce((s, e) => s + (e.kind !== "thu" ? e.amount || 0 : 0), 0);
  const thuSum = form.expenses.reduce((s, e) => s + (e.kind === "thu" ? e.amount || 0 : 0), 0);

  /**
   * Loại phi công do quản trị gán: PG / PPG / cả hai. Khối PPG chỉ hiện cho
   * người có PPG; người thuần PPG thì ẩn luôn khối chuyến PG cho gọn.
   */
  const flyPg = user.pilotKind !== "ppg";
  const flyPpg = user.pilotKind === "ppg" || user.pilotKind === "both";

  return (
    <Shell
      user={user}
      title="Báo cáo ngày bay (Daily flight report)"
      subtitle="Bay xong nhập số liệu trong ngày, rồi bấm Chốt để kế toán soát (fill in after flying, then Submit). Chưa chốt vẫn sửa được (editable until submitted)."
    >
      {/* Lịch bay do quản lý chấm — xem là chính, không khoá gì việc nhập số */}
      <MyShifts spot={spot} bilingual />

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

      {/* Booking điều phối chuyển cho mình: đón khách, tiếp khách, có SĐT */}
      <AssignedBookings spot={spot} date={date} />

      {/* Lệnh thu tiền chờ mình — việc phải làm ngay */}
      <CollectInbox spot={spot} />

      {/* Báo đỏ của riêng mình — thứ phải xử lý trước khi làm gì khác */}
      {myReds.length > 0 && (
        <Banner tone="error">
          <strong>Cần kiểm tra lại {myReds.length} chỗ trong báo cáo ngày {formatDateKeyVN(date)}:</strong>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs">
            {myReds.map((i, k) => (
              <li key={k}>{i.message}</li>
            ))}
          </ul>
          <div className="mt-1 text-xs">
            Chưa sửa đúng thì cả ngày bị treo, kế toán không chốt được và ngày này chưa tính vào tổng số chuyến.
          </div>
        </Banner>
      )}

      {myReds.length === 0 && check?.dayBlocked && (
        <Banner tone="warning">
          Số của anh/chị không có vấn đề (your report is clean), nhưng ngày {formatDateKeyVN(date)} vẫn đang
          treo vì còn {check.otherIssueCount} chỗ chưa khớp ở nơi khác — của người khác hoặc ở số tổng của kế
          toán. Kế toán sẽ liên hệ nếu cần soát lại.
        </Banner>
      )}

      {locked && (
        <Banner tone="info">
          Ngày {formatDateKeyVN(date)} <strong>đã được kế toán chốt</strong> — số liệu đã khoá, chỉ xem được.
          Cần sửa thì nhờ kế toán gỡ khoá ngày.
        </Banner>
      )}

      {/* Quá giờ chốt mà chưa từng chốt: cảnh báo phạt TRƯỚC khi bấm, khỏi bất ngờ */}
      {!locked && deadline?.past && !existing?.submitted && (
        <Banner tone="warning">
          <strong>Đã quá giờ chốt báo cáo ({deadline.time}) — đang bị báo phạt tạm tính 200.000đ</strong>{" "}
          (provisional late fine). Hôm nay <strong>có bay</strong> thì chốt ngay, phạt sẽ được ghi thật. Hôm
          nay <strong>không bay</strong> thì không cần báo cáo gì cả — khoản tạm tính này TỰ HUỶ khi kế toán
          chốt ngày (auto-cancelled if you did not fly). Sửa báo cáo ĐÃ chốt kịp giờ thì không bị tính lại.
        </Banner>
      )}

      {existing?.lateSubmit && !existing.latePenaltyWaived && (
        <Banner tone="warning">
          Báo cáo ngày {formatDateKeyVN(date)} chốt sau giờ quy định — đã ghi phạt{" "}
          <strong>{existing.latePenalty.toLocaleString("vi-VN")}đ</strong> (late fine recorded).
        </Banner>
      )}

      {existing?.latePenaltyWaived && (
        <Banner tone="success">
          Ngày {formatDateKeyVN(date)} nộp muộn nhưng <strong>kế toán đã huỷ lệnh phạt</strong> (fine waived)
          {existing.latePenaltyWaiveReason ? ` — lý do: ${existing.latePenaltyWaiveReason}` : ""}.
        </Banner>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(false);
        }}
        className="space-y-4 lg:columns-2 lg:gap-5 lg:space-y-0 [&>*]:lg:mb-5 [&>*]:lg:break-inside-avoid"
      >
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
        <div className="space-y-3">
          {!loadingDay && existing && (
            <div>
              <Banner tone={existing.submitted ? "success" : "info"}>
                {existing.submitted ? (
                  <>
                    Đã chốt báo cáo ngày này ({existing.flightCount} chuyến). Vẫn sửa được cho tới khi kế toán
                    chốt ngày.
                  </>
                ) : (
                  <>
                    Đang là bản nháp ({existing.flightCount} chuyến) — nhớ bấm <strong>Chốt báo cáo</strong> khi
                    xong.
                  </>
                )}
              </Banner>
            </div>
          )}
        </div>

        {/* Phi công thuần PPG không có chuyến PG — ẩn cả khối */}
        {flyPg && (
<Card title="Số chuyến bay (Flights)" hint="Số chuyến dù đôi đã bay trong ngày, kèm mã vé từng chuyến (tandem flights today, with ticket codes)">
          <div className="space-y-3">
            <CountInput value={form.flightCount} onChange={(v) => set("flightCount", v)} max={300} />

            <Field
              label={
                requireCodes
                  ? "Mã vé đã bay (Ticket codes flown)"
                  : "Mã vé đã bay — không bắt buộc ở điểm này (Ticket codes — optional here)"
              }
              hint="Vé năm nay là MBLxxxx — gõ tắt 4 số cuối cũng nhận: 1299 hay MBL1299 như nhau. Bay liền dải viết 1299..1305; cách nhau bằng khoảng trắng, phẩy hay gạch đều được"
            >
              <TextArea
                value={form.ticketCodesText}
                onChange={(e) => set("ticketCodesText", e.target.value)}
                placeholder="MBL0001, MBL0002 — gõ tắt: 0001 0002"
                autoCapitalize="characters"
                spellCheck={false}
                disabled={locked}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Readout
                label={bi("Số mã vé đã nhập", "codes entered")}
                value={String(parsedCodes.codes.length)}
                tone={codeCountMismatch ? "warning" : "normal"}
              />
              <Readout label={bi("Số chuyến đã khai", "flights declared")} value={String(form.flightCount)} />
            </div>

            {codeCountMismatch && !locked && (requireCodes || parsedCodes.codes.length > 0) && (
              <Banner tone="warning">
                Số mã vé ({parsedCodes.codes.length}) khác số chuyến bay ({form.flightCount})
                {requireCodes ? " — phải bằng nhau mới chốt được." : " — điểm này không bắt buộc mã, vẫn chốt được."}
                <div className="mt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 px-3 text-xs"
                    onClick={() => set("flightCount", parsedCodes.codes.length)}
                  >
                    Lấy số chuyến = {parsedCodes.codes.length}
                  </Button>
                </div>
              </Banner>
            )}

            {parsedCodes.malformed.length > 0 && (
              <Banner tone="error">
                {parsedCodes.malformed.length} mã sai dạng:{" "}
                <strong>{parsedCodes.malformed.slice(0, 6).join(", ")}</strong>
                <div className="mt-1 text-xs">{TICKET_CODE_HINT} — sửa xong mới chốt được.</div>
              </Banner>
            )}

            {parsedCodes.invalid.length > 0 && (
              <Banner tone="error">
                Không đọc được {parsedCodes.invalid.length} cụm:{" "}
                <strong>{parsedCodes.invalid.slice(0, 6).join(", ")}</strong>
              </Banner>
            )}

            {parsedCodes.duplicates.length > 0 && (
              <Banner tone="warning">
                Mã nhập trùng, chỉ tính một lần:{" "}
                <strong>{parsedCodes.duplicates.slice(0, 6).join(", ")}</strong>
              </Banner>
            )}
          </div>
        </Card>
        )}

        <Card
          title="Dịch vụ gia tăng (Add-on services)"
          hint="Chỉ SỐ LƯỢNG là bắt buộc — mã vé để trống cũng được, chỉ cần điền khi kế toán báo lệch số với điều phối (quantity required; ticket codes optional)"
        >
          {/* Mỗi dịch vụ một khung màu riêng — các cụm đếm sát nhau không còn lẫn */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ServiceBox tone="flycam" label="Flycam">
              <CountInput compact value={form.flycam} onChange={(v) => set("flycam", v)} />
            </ServiceBox>
            <ServiceBox tone="video360" label="Camera 360">
              <CountInput compact value={form.video360} onChange={(v) => set("video360", v)} />
            </ServiceBox>
            <ServiceBox tone="redFlag" label={bi("Dù cờ đỏ", "red flag")}>
              <CountInput compact value={form.redFlag} onChange={(v) => set("redFlag", v)} />
            </ServiceBox>
            <ServiceBox tone="flagFlight" label={bi("Bay kéo cờ/bánh", "flag flight")}>
              <CountInput compact value={form.flagFlight} onChange={(v) => set("flagFlight", v)} />
            </ServiceBox>
          </div>

          <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <summary className="cursor-pointer text-sm font-medium text-slate-700">
              Mã vé từng dịch vụ — không bắt buộc (optional ticket codes)
            </summary>
            {/* Cùng bộ màu với cụm đếm phía trên — nhìn màu là biết đang gõ mã cho dịch vụ nào */}
            <div className="mt-3 space-y-3">
              <ServiceBox tone="flycam" label="Mã vé Flycam">
                <TextInput
                  value={form.flycamCodesText}
                  onChange={(e) => set("flycamCodesText", e.target.value.toUpperCase())}
                  placeholder="để trống nếu không cần"
                  autoCapitalize="characters"
                  spellCheck={false}
                  disabled={locked}
                />
              </ServiceBox>
              <ServiceBox tone="video360" label="Mã vé Camera 360">
                <TextInput
                  value={form.video360CodesText}
                  onChange={(e) => set("video360CodesText", e.target.value.toUpperCase())}
                  placeholder="MBL0001, MBL0002"
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

              {parsed360.codes.length > 0 && parsed360.codes.length !== form.video360 && (
                <Banner tone="warning">
                  Số mã 360 ({parsed360.codes.length}) khác số lượng đã khai ({form.video360}) — không chặn lưu,
                  chỉ nhắc để anh/chị soát.
                </Banner>
              )}
            </div>
          </details>
        </Card>

        <CollapseCard
          title={bi("Khách ngoại giao", "complimentary guests")}
          hint="Khách ngoại giao CÓ THỂ không xuất vé — có vé thì ghi mã, không vé thì đếm vào ô 'không vé' cho rõ"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={bi("Số khách ngoại giao", "guest count")}>
              <CountInput value={form.diplomaticGuests} onChange={(v) => set("diplomaticGuests", v)} />
            </Field>
            <Field label={bi("Mã vé — nếu CÓ vé", "codes if ticketed")}>
              <TextInput
                value={form.diplomaticCodesText}
                onChange={(e) => set("diplomaticCodesText", e.target.value.toUpperCase())}
                placeholder="MBL0001"
                autoCapitalize="characters"
                spellCheck={false}
                disabled={locked}
              />
            </Field>
            <Field label={bi("Trong đó KHÔNG vé", "ticketless")}>
              <CountInput value={form.diplomaticNoTicket} onChange={(v) => set("diplomaticNoTicket", v)} />
            </Field>
            <Field label={bi("Ghi chú khách ngoại giao", "notes")}>
              <TextInput
                value={form.diplomaticNote}
                onChange={(e) => set("diplomaticNote", e.target.value)}
                placeholder="Đoàn nào, có vé hay không vé, ai duyệt…"
                disabled={locked}
              />
            </Field>
          </div>
        </CollapseCard>

        {/* PPG chỉ bay ở KHAU PHẠ — điểm khác không có dịch vụ này nên giấu hẳn khối */}
        {spot === "khau-pha" && flyPpg && (
        <Card
          title="Chuyến PPG — có động cơ (PPG flights, engine-powered)"
          hint="Các ô bên trên mặc định là PG. PPG không bắt buộc vé: có vé thì điền mã, không vé thì đếm vào ô 'không vé' (default above is PG; codes optional — count ticketless flights)"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={bi("Số chuyến PPG", "PPG flights")}>
              <CountInput
                value={form.ppgFlights}
                onChange={(v) => {
                  /**
                   * PPG đa phần bay KHÔNG vé — chưa gõ mã nào thì ô "không vé"
                   * tự chạy theo số chuyến, khỏi phải điền hai lần rồi thắc mắc
                   * vì sao nút chốt xám. Đã có mã thì thôi, để người nhập tự cân.
                   */
                  setForm((prev) => ({
                    ...prev,
                    ppgFlights: v,
                    ppgNoTicket: prev.ppgCodesText.trim() === "" ? v : prev.ppgNoTicket,
                  }));
                }}
                max={300}
              />
            </Field>
            <Field label={bi("Trong đó KHÔNG vé", "ticketless")}>
              <CountInput value={form.ppgNoTicket} onChange={(v) => set("ppgNoTicket", v)} max={300} />
            </Field>
          </div>
          {form.ppgFlights > 0 && (
            <div className="mt-3">
              <Field
                label={bi("Mã vé PPG", "PPG codes")}
                hint={`Chuyến có vé phải khai đủ mã: mã + không vé = số chuyến (${parsedPpg.codes.length} mã + ${form.ppgNoTicket} không vé / ${form.ppgFlights} chuyến)`}
              >
                <TextInput
                  value={form.ppgCodesText}
                  onChange={(e) => set("ppgCodesText", e.target.value.toUpperCase())}
                  placeholder="P1234, P1235 — không có vé thì để trống và đếm vào ô 'không vé'"
                  autoCapitalize="characters"
                  spellCheck={false}
                  disabled={locked}
                />
              </Field>
              {form.ppgFlights !== parsedPpg.codes.length + form.ppgNoTicket && (
                <Banner tone="warning">
                  PPG: {form.ppgFlights} chuyến nhưng {parsedPpg.codes.length} mã + {form.ppgNoTicket} không vé ={" "}
                  {parsedPpg.codes.length + form.ppgNoTicket} — hai bên phải bằng nhau mới chốt được (codes +
                  ticketless must equal flights).
                </Banner>
              )}
            </div>
          )}
        </Card>
        )}

        <CollapseCard title={bi("Thu / Chi trong ngày", "money in & out")} hint="Tiền đã bỏ ra, và tiền cầm hộ của khách nếu có — không có thì để trống (money spent, and cash collected from guests if any)">
          {/* Phí bãi + nước: đặc thù RIÊNG Hà Nội — Sa Pa và Khau Phạ được miễn phí */}
          {spot === "ha-noi" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={bi("Phí bãi — số khách", "site fee, per guest")}
                hint="Tính theo đầu khách, bấm +/−"
              >
                <CountInput value={form.siteFeeGuests} onChange={(v) => set("siteFeeGuests", v)} max={500} />
              </Field>
              <Field label={bi("Nước cho khách", "water for guests")}>
                <MoneyInput value={form.waterCost} onChange={(v) => set("waterCost", v)} />
              </Field>
            </div>
          )}

          {/* Ba khoản đưa đón tự trả tiền — ĐẶC THÙ RIÊNG điểm Hà Nội, điểm khác không có */}
          {spot === "ha-noi" && (
          <div className="mt-4">
            <Field
              label="Đưa đón tự trả tiền — số lượt (Self-paid transfers — trips)"
              hint="Phi công tự thanh toán khi đi bay, kế toán hoàn theo đơn giá (paid by pilot, reimbursed later)"
            >
              <div />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Đón khách từ BigC">
                <CountInput value={form.pickupBigC} onChange={(v) => set("pickupBigC", v)} max={100} />
              </Field>
              <Field label="Đón khách từ khách sạn">
                <CountInput value={form.pickupHotel} onChange={(v) => set("pickupHotel", v)} max={100} />
              </Field>
              <Field label={bi("Xe lên núi", "ride up the mountain")}>
                <CountInput value={form.mountainTrips} onChange={(v) => set("mountainTrips", v)} max={100} />
              </Field>
            </div>
          </div>
          )}

          <div className="mt-4">
            <Field
              label="THU CHI (money in & out)"
              hint="Mỗi dòng: nội dung – số tiền – THU/CHI – ghi chú. VD: khách đưa tiền vé tại bãi — 1.800.000đ — Thu"
            >
              <div />
            </Field>
            {/* Phi công chi từ tiền túi — không cần phân tiền mặt/CK */}
            <ExpenseRows
              rows={form.expenses}
              onChange={(rows) => set("expenses", rows)}
              disabled={locked}
              withKind
              hideTotals
            />
          </div>

          {/* Tổng chạy theo sổ: thu xanh dấu +, chi đỏ dấu − — cùng mẫu mọi trang */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
              <div className="text-xs font-medium text-emerald-800">Tổng thu (collected)</div>
              <div className="text-lg font-bold tabular-nums text-emerald-700">+{formatVND(thuSum)}</div>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5">
              <div className="text-xs font-medium text-rose-800">Tổng chi (expenses)</div>
              <div className="text-lg font-bold tabular-nums text-rose-700">−{formatVND(expenseSum)}</div>
            </div>
          </div>
        </CollapseCard>

        {/* Khách huỷ / dời — kênh phụ của phi công, gập mặc định như bên điều phối */}
        <CollapseCard
          title={bi("Khách huỷ", "cancellations")}
          hint="tên – mã book – số khách – nguồn – tiền hoàn – ghi chú"
        >
          <CancelGuestRows
            rows={form.cancelledGuests}
            onChange={(rows) => set("cancelledGuests", rows)}
            disabled={locked}
            withCodes={spot !== "ha-noi"}
          />
        </CollapseCard>

        <CollapseCard
          title={bi("Khách dời lịch", "reschedules")}
          hint="tên – SĐT – số lượng – ngày dời – đón – giờ hẹn"
        >
          <RescheduleGuestRows
            rows={form.rescheduledGuests}
            onChange={(rows) => set("rescheduledGuests", rows)}
            minDate={shiftDateKey(date, 1)}
            disabled={locked}
            onConfirmMove={confirmMove}
            withCodes={spot !== "ha-noi"}
          />
        </CollapseCard>

        <Card title="Ghi chú (Notes)">
          <TextArea
            value={form.note}
            onChange={(e) => set("note", e.target.value)}
            placeholder="Thời tiết, sự cố, vé khách huỷ giữa buổi…"
            disabled={locked}
          />
        </Card>

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

        {!locked && (
          <div className="sticky bottom-3 z-10 flex gap-2">
            <Button
              type="submit"
              variant="ghost"
              disabled={saving !== null || loadingDay}
              className="flex-1 bg-white shadow-lg"
            >
              {saving === "draft" ? "Đang lưu…" : "Lưu nháp (Save draft)"}
            </Button>
            <Button
              type="button"
              onClick={() => save(true)}
              disabled={saving !== null || loadingDay || !canSubmit}
              className="flex-1 shadow-lg"
              title={
                canSubmit
                  ? undefined
                  : !hasAnyFlights
                    ? "Khai số chuyến (PG hoặc PPG) rồi mới chốt được"
                    : !ppgConsistent
                      ? "PPG: mã vé + không vé phải bằng số chuyến"
                      : requireCodes
                        ? "Sửa mã vé và số chuyến cho khớp rồi mới chốt được"
                        : "Sửa mã sai dạng rồi mới chốt được"
              }
            >
              {saving === "submit" ? "Đang chốt…" : existing?.submitted ? "Chốt lại (Re-submit)" : "Chốt báo cáo (Submit)"}
            </Button>
          </div>
        )}
      </form>

      <HandoverBox spot={spot} bilingual />

      <PeriodSummary
        statement
        spot={spot}
        title="Tổng theo chu kỳ (Period totals)"
        hint="Chọn khoảng ngày để xem tổng từng nội dung của anh/chị (pick a date range to see your totals)"
      />

      <Card title="Đã báo gần đây (Recent reports)" hint="Bấm vào một ngày để mở lại và sửa (tap a day to reopen and edit)">
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
                      {r.flightCount} chuyến · {r.ticketCodes.length} mã vé
                      {r.flycam ? ` · ${r.flycam} flycam` : ""}
                      {r.video360 ? ` · ${r.video360}×360` : ""}
                      {r.redFlag ? ` · ${r.redFlag} cờ đỏ` : ""}
                      {r.flagFlight ? ` · ${r.flagFlight} kéo cờ` : ""}
                      {r.diplomaticGuests ? ` · ${r.diplomaticGuests} ngoại giao` : ""}
                      {r.waterCost + r.guestCarCost
                        ? ` · chi ${formatVND(r.waterCost + r.guestCarCost)}`
                        : ""}
                    </div>
                  </div>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={
                        r.submitted
                          ? "rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800"
                          : "rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800"
                      }
                    >
                      {r.submitted ? "đã chốt (submitted)" : "còn nháp (draft)"}
                    </span>
                    {r.latePenalty > 0 && (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-800">
                        phạt {r.latePenalty.toLocaleString("vi-VN")}đ
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Shell>
  );
}
