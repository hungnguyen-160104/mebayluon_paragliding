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
import { ExpenseRows, toExpenseRows, type ExpenseRow } from "../components/rows";
import { HandoverBox } from "../components/HandoverBox";
import { PeriodSummary } from "../components/PeriodSummary";
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
 * Phi công KHÔNG khai flycam (camera man khai) và không khai cờ đỏ / bay kéo cờ
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
  siteFee: number;
  waterCost: number;
  guestCarCost: number;
  expenses: ExpenseRow[];
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
  siteFee: 0,
  waterCost: 0,
  guestCarCost: 0,
  expenses: [{ content: "", amount: 0, kind: "chi", note: "" }],
  note: "",
};

type DayCheck = { dayBlocked: boolean; myIssues: Issue[]; otherIssueCount: number };

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
              siteFee: res.report.siteFee,
              waterCost: res.report.waterCost,
              guestCarCost: res.report.guestCarCost,
              expenses: toExpenseRows(res.report.expenses),
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

  if (loading || !user || !spot) {
    return <div className="flex min-h-dvh items-center justify-center text-sm text-slate-500">Đang tải…</div>;
  }

  const codeCountMismatch = parsedCodes.codes.length !== form.flightCount;
  const canSubmit = !locked && !parsedCodes.malformed.length && !codeCountMismatch && form.flightCount > 0;
  const myReds = (check?.myIssues || []).filter((i) => i.severity === "red");
  // Dòng THU (phi công cầm hộ tiền khách) không phải khoản chi — không cộng vào tổng chi
  const expenseSum =
    form.siteFee +
    form.waterCost +
    form.guestCarCost +
    form.expenses.reduce((s, e) => s + (e.kind !== "thu" ? e.amount || 0 : 0), 0);
  const thuSum = form.expenses.reduce((s, e) => s + (e.kind === "thu" ? e.amount || 0 : 0), 0);

  return (
    <Shell
      user={user}
      title="Báo cáo ngày bay (Daily flight report)"
      subtitle="Bay xong nhập số liệu trong ngày, rồi bấm Chốt để kế toán soát (fill in after flying, then Submit). Chưa chốt vẫn sửa được (editable until submitted)."
    >
      <SpotSwitcher spot={spot} options={spotOptions} onChange={setSpot} />

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
        className="space-y-4"
      >
        <Card title="Ngày bay (Flight date)">
          <Field
            label="Chọn ngày (Select date)"
            hint={`Chỉ nhập được trong ${BACKDATE_LIMIT_DAYS} ngày gần đây. Đang xem: ${formatDateKeyVN(date)}`}
          >
            <TextInput
              type="date"
              value={date}
              max={today}
              min={shiftDateKey(today, -BACKDATE_LIMIT_DAYS)}
              onChange={(e) => e.target.value && setDate(e.target.value)}
            />
          </Field>

          {loadingDay && <p className="mt-2 text-xs text-slate-500">Đang tải số liệu ngày này…</p>}

          {!loadingDay && existing && (
            <div className="mt-3">
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
        </Card>

        <Card title="Số chuyến bay (Flights)" hint="Số chuyến dù đôi đã bay trong ngày, kèm mã vé từng chuyến (tandem flights today, with ticket codes)">
          <div className="space-y-3">
            <CountInput value={form.flightCount} onChange={(v) => set("flightCount", v)} max={300} />

            <Field
              label="Mã vé đã bay (Ticket codes flown)"
              hint={`Cách nhau bằng khoảng trắng, phẩy, chấm hoặc gạch — app tự nhận. Bay liền dải thì viết A1234..A1240. ${TICKET_CODE_HINT}`}
            >
              <TextArea
                value={form.ticketCodesText}
                onChange={(e) => set("ticketCodesText", e.target.value)}
                placeholder="AB1234, AB1235, AB1236"
                autoCapitalize="characters"
                spellCheck={false}
                disabled={locked}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Readout
                label="Số mã vé đã nhập (codes entered)"
                value={String(parsedCodes.codes.length)}
                tone={codeCountMismatch ? "warning" : "normal"}
              />
              <Readout label="Số chuyến đã khai (flights declared)" value={String(form.flightCount)} />
            </div>

            {codeCountMismatch && !locked && (
              <Banner tone="warning">
                Số mã vé ({parsedCodes.codes.length}) khác số chuyến bay ({form.flightCount}) — phải bằng nhau
                mới chốt được.
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

        <Card
          title="Dịch vụ gia tăng (Add-on services)"
          hint="Chỉ SỐ LƯỢNG là bắt buộc — mã vé để trống cũng được, chỉ cần điền khi kế toán báo lệch số với điều phối (quantity required; ticket codes optional)"
        >
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Flycam">
              <CountInput value={form.flycam} onChange={(v) => set("flycam", v)} />
            </Field>
            <Field label="Camera 360">
              <CountInput value={form.video360} onChange={(v) => set("video360", v)} />
            </Field>
            <Field label="Dù cờ đỏ (red flag)">
              <CountInput value={form.redFlag} onChange={(v) => set("redFlag", v)} />
            </Field>
            <Field label="Bay kéo cờ (flag flight)">
              <CountInput value={form.flagFlight} onChange={(v) => set("flagFlight", v)} />
            </Field>
          </div>

          <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <summary className="cursor-pointer text-sm font-medium text-slate-700">
              Mã vé từng dịch vụ — không bắt buộc (optional ticket codes)
            </summary>
            <div className="mt-3 space-y-3">
              <Field label="Mã vé Flycam">
                <TextInput
                  value={form.flycamCodesText}
                  onChange={(e) => set("flycamCodesText", e.target.value.toUpperCase())}
                  placeholder="để trống nếu không cần"
                  autoCapitalize="characters"
                  spellCheck={false}
                  disabled={locked}
                />
              </Field>
              <Field label="Mã vé Camera 360">
                <TextInput
                  value={form.video360CodesText}
                  onChange={(e) => set("video360CodesText", e.target.value.toUpperCase())}
                  placeholder="AB1235, AB1236"
                  autoCapitalize="characters"
                  spellCheck={false}
                  disabled={locked}
                />
              </Field>
              <Field label="Mã vé dù cờ đỏ">
                <TextInput
                  value={form.redFlagCodesText}
                  onChange={(e) => set("redFlagCodesText", e.target.value.toUpperCase())}
                  autoCapitalize="characters"
                  spellCheck={false}
                  disabled={locked}
                />
              </Field>
              <Field label="Mã vé bay kéo cờ">
                <TextInput
                  value={form.flagFlightCodesText}
                  onChange={(e) => set("flagFlightCodesText", e.target.value.toUpperCase())}
                  autoCapitalize="characters"
                  spellCheck={false}
                  disabled={locked}
                />
              </Field>

              {parsed360.codes.length > 0 && parsed360.codes.length !== form.video360 && (
                <Banner tone="warning">
                  Số mã 360 ({parsed360.codes.length}) khác số lượng đã khai ({form.video360}) — không chặn lưu,
                  chỉ nhắc để anh/chị soát.
                </Banner>
              )}
            </div>
          </details>
        </Card>

        <Card title="Khách ngoại giao (Complimentary guests)" hint="Không thu tiền nhưng vẫn xuất vé — để trống nếu hôm đó không có (free of charge but still ticketed — leave empty if none)">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Số khách ngoại giao (guest count)">
              <CountInput value={form.diplomaticGuests} onChange={(v) => set("diplomaticGuests", v)} />
            </Field>
            <Field label="Mã vé ngoại giao (ticket codes)">
              <TextInput
                value={form.diplomaticCodesText}
                onChange={(e) => set("diplomaticCodesText", e.target.value.toUpperCase())}
                placeholder="A1250"
                autoCapitalize="characters"
                spellCheck={false}
                disabled={locked}
              />
            </Field>
          </div>
        </Card>

        <Card title="Thu / Chi trong ngày (Money in & out)" hint="Tiền đã bỏ ra, và tiền cầm hộ của khách nếu có — không có thì để trống (money spent, and cash collected from guests if any)">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Phí bãi bay (Site fee)">
              <MoneyInput value={form.siteFee} onChange={(v) => set("siteFee", v)} />
            </Field>
            <Field label="Nước cho khách (Water for guests)">
              <MoneyInput value={form.waterCost} onChange={(v) => set("waterCost", v)} />
            </Field>
            <Field label="Xe cho khách (Car for guests)">
              <MoneyInput value={form.guestCarCost} onChange={(v) => set("guestCarCost", v)} />
            </Field>
          </div>

          <div className="mt-4">
            <Field
              label="Thu / chi khác (Other money in & out)"
              hint="Mỗi dòng: nội dung – số tiền – tick Thu hoặc Chi – ghi chú. VD: khách đưa tiền vé tại bãi — 1.800.000đ — Thu (one line each: item – amount – In/Out – note)"
            >
              <div />
            </Field>
            <ExpenseRows rows={form.expenses} onChange={(rows) => set("expenses", rows)} disabled={locked} withKind />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <Readout label="Tổng chi trong ngày (total expenses)" value={formatVND(expenseSum)} />
            <Readout label="Tổng thu hộ tại bãi (collected)" value={formatVND(thuSum)} />
          </div>
        </Card>

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
              title={canSubmit ? undefined : "Sửa mã vé và số chuyến cho khớp rồi mới chốt được"}
            >
              {saving === "submit" ? "Đang chốt…" : existing?.submitted ? "Chốt lại (Re-submit)" : "Chốt báo cáo (Submit)"}
            </Button>
          </div>
        )}
      </form>

      <HandoverBox spot={spot} bilingual />

      <PeriodSummary
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
                      {r.siteFee + r.waterCost + r.guestCarCost
                        ? ` · chi ${formatVND(r.siteFee + r.waterCost + r.guestCarCost)}`
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
