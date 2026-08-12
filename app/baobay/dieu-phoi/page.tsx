// app/baobay/dieu-phoi/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { formatDateKeyVN, shiftDateKey, todayInVN } from "@/lib/baobay/date";
import type { Issue } from "@/lib/baobay/reconcile";
import { parseTicketCodeList } from "@/lib/baobay/ticket-code";
import type { DispatcherReportDTO } from "@/lib/baobay/types";
import { BACKDATE_LIMIT_DAYS } from "@/lib/baobay/validation";
import { formatVND } from "@/lib/pricing";

import { apiGet, apiPost } from "../components/client-api";
import {
  CancelEntryRows,
  DiploEntryRows,
  ExpenseRows,
  RangeRows,
  RescheduleEntryRows,
  rangeRowsTotal,
  toExpenseRows,
  toRangeRows,
  type CancelRow,
  type DiploRow,
  type ExpenseRow,
  type RangeRow,
  type RescheduleEntryRow,
} from "../components/rows";
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
  diplomaticEntries: DiploRow[];
  flycam: number;
  flycamCodesText: string;
  video360: number;
  video360CodesText: string;
  redFlag: number;
  redFlagCodesText: string;
  flagFlight: number;
  flagFlightCodesText: string;
  cashReceived: number;
  transferReceived: number;
  guestWaterCost: number;
  mountainCarCost: number;
  shuttleCarCost: number;
  expenses: ExpenseRow[];
  note: string;
};

const EMPTY_FORM: FormState = {
  guestCount: 0,
  ticketsIssued: 0,
  ticketsReturned: 0,
  issuedRanges: [{ from: "", to: "" }],
  cancelledEntries: [{ codesText: "", reason: "", contactName: "" }],
  rescheduledEntries: [{ codesText: "", toDate: "", reason: "", contactName: "", phone: "" }],
  diplomaticEntries: [{ codesText: "", amount: 0 }],
  flycam: 0,
  flycamCodesText: "",
  video360: 0,
  video360CodesText: "",
  redFlag: 0,
  redFlagCodesText: "",
  flagFlight: 0,
  flagFlightCodesText: "",
  cashReceived: 0,
  transferReceived: 0,
  guestWaterCost: 0,
  mountainCarCost: 0,
  shuttleCarCost: 0,
  expenses: [{ content: "", amount: 0, kind: "chi", note: "" }],
  note: "",
};

/** Đọc lại form từ bản đã lưu — báo cáo cũ (trước bản nhóm đoàn) rơi về bản phẳng. */
function fromReport(r: DispatcherReportDTO): FormState {
  const cancelled: CancelRow[] = r.cancelledEntries.length
    ? r.cancelledEntries.map((e) => ({ codesText: e.codes.join(", "), reason: e.reason, contactName: e.contactName }))
    : r.cancelledCodes.length
      ? [{ codesText: r.cancelledCodes.join(", "), reason: "", contactName: "" }]
      : [];
  const rescheduled: RescheduleEntryRow[] = r.rescheduledEntries.length
    ? r.rescheduledEntries.map((e) => ({
        codesText: e.codes.join(", "),
        toDate: e.toDate,
        reason: e.reason,
        contactName: e.contactName,
        phone: e.phone,
      }))
    : r.rescheduled.map((e) => ({ codesText: e.code, toDate: e.toDate, reason: e.note || "", contactName: "", phone: "" }));
  const diplo: DiploRow[] = r.diplomaticEntries.length
    ? r.diplomaticEntries.map((e) => ({ codesText: e.codes.join(", "), amount: e.amount }))
    : r.diplomaticCodes.length
      ? [{ codesText: r.diplomaticCodes.join(", "), amount: 0 }]
      : [];

  return {
    guestCount: r.guestCount,
    ticketsIssued: r.ticketsIssued,
    ticketsReturned: r.ticketsReturned,
    issuedRanges: toRangeRows(r.issuedRanges),
    cancelledEntries: cancelled.length ? cancelled : EMPTY_FORM.cancelledEntries,
    rescheduledEntries: rescheduled.length ? rescheduled : EMPTY_FORM.rescheduledEntries,
    diplomaticEntries: diplo.length ? diplo : EMPTY_FORM.diplomaticEntries,
    flycam: r.flycam,
    flycamCodesText: r.flycamCodes.join(", "),
    video360: r.video360,
    video360CodesText: r.video360ServiceCodes.join(", "),
    redFlag: r.redFlag,
    redFlagCodesText: r.redFlagCodes.join(", "),
    flagFlight: r.flagFlight,
    flagFlightCodesText: r.flagFlightCodes.join(", "),
    cashReceived: r.cashReceived,
    transferReceived: r.transferReceived,
    guestWaterCost: r.guestWaterCost,
    mountainCarCost: r.mountainCarCost,
    shuttleCarCost: r.shuttleCarCost,
    expenses: toExpenseRows(r.expenses),
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
        `/api/baobay/reports/dispatcher?date=${targetDate}&spot=${spot}`,
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
      const { reports } = await apiGet<{ reports: DispatcherReportDTO[] }>(`/api/baobay/reports/dispatcher?spot=${spot}`);
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
      const res = await apiPost<{ report: DispatcherReportDTO; warnings: string[]; check: DayCheck }>(
        `/api/baobay/reports/dispatcher?spot=${spot}`,
        {
          date,
          ...form,
          issuedRanges: form.issuedRanges.filter((r) => r.from.trim() || r.to.trim()),
          cancelledEntries: form.cancelledEntries.filter((e) => e.codesText.trim() || e.reason.trim() || e.contactName.trim()),
          rescheduledEntries: form.rescheduledEntries.filter((e) => e.codesText.trim() || e.toDate),
          diplomaticEntries: form.diplomaticEntries.filter((e) => e.codesText.trim() || e.amount),
          expenses: form.expenses.filter((x) => x.content.trim() || x.amount),
        },
      );
      setExisting(res.report);
      setCheck(res.check);
      setForm(fromReport(res.report));
      setSaved({ warnings: res.warnings || [] });
      loadHistory();
    } catch (err: any) {
      setError(err?.message || "Không lưu được báo cáo");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user || !spot) {
    return <div className="flex min-h-dvh items-center justify-center text-sm text-slate-500">Đang tải…</div>;
  }

  const rangeMismatch = rangeTotal > 0 && form.ticketsIssued > 0 && rangeTotal !== form.ticketsIssued;
  const returnMismatch = form.ticketsReturned !== returned;
  const revenue = form.cashReceived + form.transferReceived;
  const expenseSum =
    form.guestWaterCost +
    form.mountainCarCost +
    form.shuttleCarCost +
    form.expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const myReds = (check?.myIssues || []).filter((i) => i.severity === "red");

  return (
    <Shell
      user={user}
      title="Báo cáo điều phối bay"
      subtitle="Cuối buổi nhập vé xuất/thu, tiền mặt, dịch vụ gia tăng và các khoản chi cho khách."
    >
      <SpotSwitcher spot={spot} options={spotOptions} onChange={setSpot} />

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

      <form onSubmit={submit} className="space-y-4">
        <Card title="Ngày làm việc">
          <Field
            label="Chọn ngày"
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
        </Card>

        <Card title="Khách và vé">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Số khách">
              <CountInput value={form.guestCount} onChange={(v) => set("guestCount", v)} max={5000} />
            </Field>
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
        </Card>

        <Card
          title="Vé huỷ"
          hint="Cùng đoàn thì ghi nhiều mã trong một ô. Mỗi nhóm: mã vé – lý do (đợi lâu / gió mưa / đến trễ) – tên liên hệ."
        >
          <CancelEntryRows
            rows={form.cancelledEntries}
            onChange={(rows) => set("cancelledEntries", rows)}
            disabled={locked}
          />
        </Card>

        <Card
          title="Vé dời lịch"
          hint="Cùng đoàn ghi chung một nhóm: mã vé – dời sang ngày – lý do – tên liên hệ – sđt. Vé dời coi như huỷ hôm nay, ngày dời tới sẽ xuất vé mới."
        >
          <RescheduleEntryRows
            rows={form.rescheduledEntries}
            onChange={(rows) => set("rescheduledEntries", rows)}
            minDate={shiftDateKey(date, 1)}
            disabled={locked}
          />

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Readout label="Huỷ + dời lịch" value={`${returned} vé`} tone={returnMismatch ? "warning" : "normal"} />
            <Readout label="Vé thu về đã khai" value={`${form.ticketsReturned} vé`} />
          </div>

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
        </Card>

        <Card
          title="Dịch vụ gia tăng"
          hint="Flycam đối soát với camera man; 360, cờ đỏ, kéo cờ đối soát với phi công. Mã vé chỉ cần điền khi số lệch."
        >
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Flycam">
              <CountInput value={form.flycam} onChange={(v) => set("flycam", v)} max={1000} />
            </Field>
            <Field label="Camera 360">
              <CountInput value={form.video360} onChange={(v) => set("video360", v)} max={1000} />
            </Field>
            <Field label="Dù cờ đỏ">
              <CountInput value={form.redFlag} onChange={(v) => set("redFlag", v)} max={1000} />
            </Field>
            <Field label="Bay kéo cờ">
              <CountInput value={form.flagFlight} onChange={(v) => set("flagFlight", v)} max={1000} />
            </Field>
          </div>

          <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <summary className="cursor-pointer text-sm font-medium text-slate-700">
              Mã vé từng dịch vụ — không bắt buộc, điền khi cần soát lệch
            </summary>
            <div className="mt-3 space-y-3">
              <Field label="Mã vé Flycam">
                <TextInput
                  value={form.flycamCodesText}
                  onChange={(e) => set("flycamCodesText", e.target.value.toUpperCase())}
                  autoCapitalize="characters"
                  spellCheck={false}
                  disabled={locked}
                />
              </Field>
              <Field label="Mã vé Camera 360">
                <TextInput
                  value={form.video360CodesText}
                  onChange={(e) => set("video360CodesText", e.target.value.toUpperCase())}
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
            </div>
          </details>
        </Card>

        <Card
          title="Khách ngoại giao"
          hint="Vẫn xuất vé; có thu được tiền thì nhập số tiền, không thì để 0. Số khách tự đếm theo mã."
        >
          <DiploEntryRows
            rows={form.diplomaticEntries}
            onChange={(rows) => set("diplomaticEntries", rows)}
            disabled={locked}
          />
        </Card>

        <Card title="Tiền thu về">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tiền mặt">
              <MoneyInput value={form.cashReceived} onChange={(v) => set("cashReceived", v)} />
            </Field>
            <Field label="Chuyển khoản">
              <MoneyInput value={form.transferReceived} onChange={(v) => set("transferReceived", v)} />
            </Field>
          </div>
          <div className="mt-3">
            <Readout label="Tổng thu trong ngày" value={formatVND(revenue)} />
          </div>
        </Card>

        <Card title="Chi cho khách" hint="Tiền đã bỏ ra hộ khách, kế toán xác nhận rồi hoàn lại">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Nước cho khách">
              <MoneyInput value={form.guestWaterCost} onChange={(v) => set("guestWaterCost", v)} />
            </Field>
            <Field label="Xe lên núi">
              <MoneyInput value={form.mountainCarCost} onChange={(v) => set("mountainCarCost", v)} />
            </Field>
            <Field label="Xe đưa đón">
              <MoneyInput value={form.shuttleCarCost} onChange={(v) => set("shuttleCarCost", v)} />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Khoản chi khác" hint="Mỗi khoản một dòng: nội dung – số tiền – ghi chú">
              <div />
            </Field>
            <ExpenseRows rows={form.expenses} onChange={(rows) => set("expenses", rows)} disabled={locked} />
          </div>

          <div className="mt-3">
            <Readout label="Tổng chi trong ngày" value={formatVND(expenseSum)} />
          </div>
        </Card>

        <Card title="Ghi chú">
          <TextArea
            value={form.note}
            onChange={(e) => set("note", e.target.value)}
            placeholder="Khách nợ, vé in lỗi, ca làm việc…"
            disabled={locked}
          />
        </Card>

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

      <HandoverBox spot={spot} />

      <PeriodSummary spot={spot} title="Tổng theo chu kỳ" hint="Chọn khoảng ngày để xem tổng từng nội dung mình đã báo" />

      <Card title="Đã báo gần đây" hint="Bấm vào một ngày để mở lại và sửa">
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
      </Card>
    </Shell>
  );
}
