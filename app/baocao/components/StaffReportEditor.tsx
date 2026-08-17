// app/baocao/components/StaffReportEditor.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import { shiftDateKey } from "@/lib/baobay/date";
import type { CameramanReportDTO, DispatcherReportDTO } from "@/lib/baobay/types";
import { formatVND } from "@/lib/pricing";

import { apiGet, apiPost } from "./client-api";
import {
  CancelGuestRows,
  ExpenseRows,
  RangeRows,
  RescheduleGuestRows,
  dispatcherMoneyRows,
  toRangeRows,
  toExpenseRows,
  type CancelGuestRow,
  type ExpenseRow,
  type RangeRow,
  type RescheduleGuestRow,
} from "./rows";
import { Banner, Button, CountInput, Field, ServiceBox, TextInput, CollapseCard } from "./ui";

/**
 * Kế toán SỬA TRỰC TIẾP báo cáo ĐIỀU PHỐI và CAMERA MAN trên trang Chốt ngày.
 *
 * Triết lý vận hành: nhân viên NHẬP, kế toán chỉ XÁC NHẬN — nên trang chốt
 * không còn ô nhập vé/huỷ/dời riêng của kế toán nữa. Sai ở đâu thì kế toán mở
 * khung "Sửa" này và chỉnh thẳng vào số của người nhập: dải mã vé xuất, sổ
 * THU CHI, nhóm khách huỷ/dời (kèm mã vé ở điểm có vé), dịch vụ, ghi chú…
 *
 * Đi cùng một đường lưu với chính nhân viên: cùng kiểm tra, cùng chặn ngày
 * khoá, cùng đẩy bảng tính.
 */

export function StaffReportEditor({
  spot,
  date,
  locked,
  onSaved,
}: {
  spot: string;
  date: string;
  locked: boolean;
  onSaved: () => void;
}) {
  const [dispatchers, setDispatchers] = useState<DispatcherReportDTO[]>([]);
  const [cameramen, setCameramen] = useState<CameramanReportDTO[]>([]);
  type StaffLite = { username: string; name: string };
  const [dispatcherStaff, setDispatcherStaff] = useState<StaffLite[]>([]);
  const [cameramanStaff, setCameramanStaff] = useState<StaffLite[]>([]);
  /** Người CHƯA báo cáo được kế toán thêm tay để nhập hộ. */
  const [addedDp, setAddedDp] = useState<string[]>([]);
  const [addedCm, setAddedCm] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [reloadTick, setReloadTick] = useState(0);
  const load = useCallback(() => setReloadTick((t) => t + 1), []);

  useEffect(() => {
    let alive = true;
    Promise.all([
      apiGet<{ reports: DispatcherReportDTO[]; staff?: StaffLite[] }>(`/api/baocao/reports/dispatcher?date=${date}&all=1&spot=${spot}`),
      apiGet<{ reports: CameramanReportDTO[]; staff?: StaffLite[] }>(`/api/baocao/reports/cameraman?date=${date}&all=1&spot=${spot}`),
    ])
      .then(([d, c]) => {
        if (!alive) return;
        setDispatchers(d.reports);
        setCameramen(c.reports);
        setDispatcherStaff(d.staff ?? []);
        setCameramanStaff(c.staff ?? []);
        setAddedDp((prev) => prev.filter((u) => !d.reports.some((r) => r.username === u)));
        setAddedCm((prev) => prev.filter((u) => !c.reports.some((r) => r.username === u)));
        setError(null);
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : "Không tải được báo cáo nhân viên");
      });
    return () => {
      alive = false;
    };
  }, [date, spot, reloadTick]);

  const missingDp = dispatcherStaff.filter(
    (a) => !dispatchers.some((r) => r.username === a.username) && !addedDp.includes(a.username),
  );
  const missingCm = cameramanStaff.filter(
    (a) => !cameramen.some((r) => r.username === a.username) && !addedCm.includes(a.username),
  );
  const dpRows: DispatcherReportDTO[] = [
    ...dispatchers,
    ...addedDp
      .map((u) => dispatcherStaff.find((a) => a.username === u))
      .filter(Boolean)
      .map((a) => blankDispatcherReport(a!.username, a!.name, date)),
  ];
  const cmRows: CameramanReportDTO[] = [
    ...cameramen,
    ...addedCm
      .map((u) => cameramanStaff.find((a) => a.username === u))
      .filter(Boolean)
      .map((a) => blankCameramanReport(a!.username, a!.name, date)),
  ];

  if (!dpRows.length && !cmRows.length && !missingDp.length && !missingCm.length) return null;

  return (
    <CollapseCard
      title={`Báo cáo điều phối & camera man (${dispatchers.length + cameramen.length})`}
      hint="Nhân viên nhập — kế toán chỉ XÁC NHẬN. Sai ở đâu bấm Sửa: chỉnh được MỌI chi tiết (dải mã vé, thu chi, khách huỷ/dời, dịch vụ…) rồi lưu hộ; người chưa báo thì chọn thêm và nhập hộ."
    >
      {error && <Banner tone="error">{error}</Banner>}

      <ul className="divide-y divide-slate-100">
        {dpRows.map((r) => (
          <DispatcherRow key={r.username} report={r} spot={spot} date={date} locked={locked} fresh={addedDp.includes(r.username)} onSaved={() => { load(); onSaved(); }} />
        ))}
        {cmRows.map((r) => (
          <CameramanRow key={r.username} report={r} spot={spot} date={date} locked={locked} fresh={addedCm.includes(r.username)} onSaved={() => { load(); onSaved(); }} />
        ))}
      </ul>

      {!locked && (missingDp.length > 0 || missingCm.length > 0) && (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          {missingDp.length > 0 && (
            <StaffPicker label="điều phối" options={missingDp} onAdd={(u) => setAddedDp((prev) => [...prev, u])} />
          )}
          {missingCm.length > 0 && (
            <StaffPicker label="camera man" options={missingCm} onAdd={(u) => setAddedCm((prev) => [...prev, u])} />
          )}
        </div>
      )}
    </CollapseCard>
  );
}

/** Ô chọn người CHƯA báo cáo + nút thêm — dùng chung cho điều phối và camera man. */
function StaffPicker({
  label,
  options,
  onAdd,
}: {
  label: string;
  options: Array<{ username: string; name: string }>;
  onAdd: (username: string) => void;
}) {
  const [pick, setPick] = useState("");
  return (
    <div className="flex gap-2">
      <select
        value={pick}
        onChange={(e) => setPick(e.target.value)}
        className="h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-sky-600"
      >
        <option value="">— chọn {label} chưa báo cáo ({options.length}) —</option>
        {options.map((a) => (
          <option key={a.username} value={a.username}>
            {a.name}
          </option>
        ))}
      </select>
      <Button
        type="button"
        variant="ghost"
        className="h-11 shrink-0 whitespace-nowrap px-3 text-xs"
        disabled={!pick}
        onClick={() => {
          onAdd(pick);
          setPick("");
        }}
      >
        ＋ Thêm & nhập hộ
      </Button>
    </div>
  );
}

/** Bản trắng cho điều phối chưa báo cáo — kế toán điền số rồi lưu là tạo báo cáo thật. */
function blankDispatcherReport(username: string, staffName: string, date: string): DispatcherReportDTO {
  return {
    id: `new-${username}`,
    date,
    username,
    staffName,
    guestCount: 0,
    ticketsIssued: 0,
    ticketsReturned: 0,
    issuedRanges: [],
    cancelledCount: 0,
    cancelledCodes: [],
    cancelledEntries: [],
    cancelledGuestEntries: [],
    rescheduledGuestEntries: [],
    rescheduledCount: 0,
    rescheduled: [],
    rescheduledEntries: [],
    diplomaticEntries: [],
    diplomaticAmount: 0,
    flycam: 0,
    flycamCodes: [],
    video360: 0,
    video360ServiceCodes: [],
    redFlag: 0,
    redFlagCodes: [],
    sunset: 0,
    sunsetCodes: [],
    flagFlight: 0,
    flagFlightCodes: [],
    diplomaticGuests: 0,
    diplomaticCodes: [],
    cashReceived: 0,
    transferReceived: 0,
    revenueEntries: [],
    guestWaterCost: 0,
    mountainCarCost: 0,
    shuttleCarCost: 0,
    expenses: [],
    note: "",
    submitted: false,
    sheetSynced: false,
    updatedAt: "",
  } as unknown as DispatcherReportDTO;
}

/** Bản trắng cho camera man chưa báo cáo. */
function blankCameramanReport(username: string, cameramanName: string, date: string): CameramanReportDTO {
  return {
    id: `new-${username}`,
    date,
    username,
    cameramanName,
    flycamFlights: 0,
    flycamCodes: [],
    paraglidingFlights: 0,
    paraglidingCodes: [],
    expenses: [],
    note: "",
    submitted: false,
    sheetSynced: false,
    updatedAt: "",
  } as unknown as CameramanReportDTO;
}

/* ------------------------------------------------------------------ */
/* Điều phối: kế toán sửa được MỌI chi tiết                            */
/* ------------------------------------------------------------------ */

type DispatcherEditForm = {
  guestCount: number;
  ticketsIssued: number;
  ticketsReturned: number;
  issuedRanges: RangeRow[];
  flycam: number;
  video360: number;
  redFlag: number;
  sunset: number;
  flagFlight: number;
  money: ExpenseRow[];
  cancelledGuests: CancelGuestRow[];
  rescheduledGuests: RescheduleGuestRow[];
  note: string;
};

function dispatcherEditForm(r: DispatcherReportDTO): DispatcherEditForm {
  const cancelled: CancelGuestRow[] = r.cancelledGuestEntries.length
    ? r.cancelledGuestEntries.map((e) => ({ ...e, note: e.note || "", codesText: (e.codes ?? []).join(", ") }))
    : r.cancelledEntries.length
      ? r.cancelledEntries.map((e) => ({
          name: e.contactName,
          bookingCode: "",
          guests: 0,
          source: "",
          refund: 0,
          note: [e.reason, e.note].filter(Boolean).join(" — "),
          codesText: e.codes.join(", "),
        }))
      : [{ name: "", bookingCode: "", guests: 0, source: "", refund: 0, note: "", codesText: "" }];
  const rescheduled: RescheduleGuestRow[] = r.rescheduledGuestEntries.length
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
    : r.rescheduledEntries.length
      ? r.rescheduledEntries.map((e) => ({
          name: e.contactName,
          guests: 0,
          toDate: e.toDate,
          note: [e.reason, e.note].filter(Boolean).join(" — "),
          phone: e.phone,
          pickup: "self" as const,
          pickupNote: "",
          expectedTime: "",
          codesText: e.codes.join(", "),
          bookedId: "",
        }))
      : [
          { name: "", guests: 0, toDate: "", note: "", phone: "", pickup: "self", pickupNote: "", expectedTime: "", codesText: "", bookedId: "" },
        ];

  return {
    guestCount: r.guestCount,
    ticketsIssued: r.ticketsIssued,
    ticketsReturned: r.ticketsReturned,
    issuedRanges: toRangeRows(r.issuedRanges),
    flycam: r.flycam,
    video360: r.video360,
    redFlag: r.redFlag,
    sunset: r.sunset,
    flagFlight: r.flagFlight,
    money: dispatcherMoneyRows(r),
    cancelledGuests: cancelled,
    rescheduledGuests: rescheduled,
    note: r.note,
  };
}

function DispatcherRow({
  report,
  spot,
  date,
  locked,
  onSaved,
  fresh,
}: {
  report: DispatcherReportDTO;
  spot: string;
  date: string;
  locked: boolean;
  onSaved: () => void;
  /** true = dòng kế toán vừa thêm tay — mở sẵn form nhập. */
  fresh?: boolean;
}) {
  const [open, setOpen] = useState(Boolean(fresh));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [form, setForm] = useState<DispatcherEditForm>(() => dispatcherEditForm(report));
  const [savedClean, setSavedClean] = useState(false);
  const noTickets = spot === "ha-noi";

  const set = <K extends keyof DispatcherEditForm>(key: K, value: DispatcherEditForm[K]) => {
    setSavedClean(false);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const revenue = form.money.reduce((a, e) => a + (e.kind === "thu" ? e.amount || 0 : 0), 0);
  const expenseSum = form.money.reduce((a, e) => a + (e.kind !== "thu" ? e.amount || 0 : 0), 0);

  async function save() {
    setSaving(true);
    setError(null);
    setWarnings([]);
    try {
      const res = await apiPost<{ report: DispatcherReportDTO; warnings: string[] }>(
        `/api/baocao/reports/dispatcher?spot=${spot}`,
        {
          date,
          targetUsername: report.username,
          guestCount: form.guestCount,
          ticketsIssued: form.ticketsIssued,
          ticketsReturned: form.ticketsReturned,
          issuedRanges: form.issuedRanges.filter((x) => x.from.trim() || x.to.trim()).map((x) => ({ from: x.from, to: x.to })),
          cancelledEntries: [],
          rescheduledEntries: [],
          cancelledGuestEntries: form.cancelledGuests.filter(
            (e) => e.name.trim() || e.guests || e.bookingCode.trim() || e.codesText.trim(),
          ),
          rescheduledGuestEntries: form.rescheduledGuests.filter(
            (e) => e.name.trim() || e.guests || e.toDate || e.codesText.trim(),
          ),
          diplomaticEntries: report.diplomaticEntries.map((e) => ({
            codesText: e.codes.join(" "),
            amount: e.amount,
            note: e.note || "",
          })),
          flycam: form.flycam,
          video360: form.video360,
          redFlag: form.redFlag,
          sunset: form.sunset,
          flagFlight: form.flagFlight,
          // Giữ nguyên mã dịch vụ người nhập đã khai — khung này không sửa mã dịch vụ
          flycamCodesText: report.flycamCodes.join(" "),
          video360CodesText: report.video360ServiceCodes.join(" "),
          redFlagCodesText: report.redFlagCodes.join(" "),
          sunsetCodesText: report.sunsetCodes.join(" "),
          flagFlightCodesText: report.flagFlightCodes.join(" "),
          // Sổ THU CHI: dòng thu thành khoản thu có tên (đúng TM/CK), dòng chi vào sổ chi
          cashReceived: 0,
          transferReceived: 0,
          revenueEntries: form.money
            .filter((e) => e.kind === "thu" && (e.content.trim() || e.amount))
            .map((e) => ({
              content: e.content.trim() || "Tiền thu",
              method: e.method === "transfer" ? ("transfer" as const) : ("cash" as const),
              amount: e.amount,
            })),
          guestWaterCost: 0,
          mountainCarCost: 0,
          shuttleCarCost: 0,
          expenses: form.money.filter((e) => e.kind !== "thu" && (e.content.trim() || e.amount)),
          note: form.note,
          // Kế toán sửa hộ thì GIỮ NGUYÊN trạng thái chốt/nháp của người nhập —
          // không gửi thì mặc định false, hoá ra kế toán tự mở khoá bản đã chốt.
          submit: report.submitted,
        },
      );
      setWarnings(res.warnings || []);
      setForm(dispatcherEditForm(res.report));
      setSavedClean(true);
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không lưu được");
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-medium text-slate-900">
            {report.staffName} <span className="text-xs font-normal text-slate-500">— điều phối</span>
            <span
              className={
                "ml-2 rounded px-1.5 py-0.5 text-[11px] font-semibold " +
                (report.submitted ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900")
              }
            >
              {report.submitted ? "đã chốt" : "còn nháp"}
            </span>
          </div>
          <div className="text-xs text-slate-500">
            {report.guestCount} khách{noTickets ? "" : ` · ${report.ticketsIssued} vé xuất`} · TM{" "}
            {formatVND(report.cashReceived)} · CK {formatVND(report.transferReceived)}
          </div>
        </div>
        {!locked && (
          <Button type="button" variant="ghost" className="h-8 px-3 text-xs" onClick={() => setOpen((v) => !v)}>
            {open ? "Đóng" : "Sửa"}
          </Button>
        )}
      </div>

      {open && !locked && (
        <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="grid gap-3 @md:grid-cols-2 @2xl:grid-cols-3">
            <Field label="Số khách">
              <CountInput value={form.guestCount} onChange={(v) => set("guestCount", v)} max={5000} />
            </Field>
            {!noTickets && (
              <>
                <Field label="Vé xuất ra">
                  <CountInput value={form.ticketsIssued} onChange={(v) => set("ticketsIssued", v)} max={5000} />
                </Field>
                <Field label="Vé thu về">
                  <CountInput value={form.ticketsReturned} onChange={(v) => set("ticketsReturned", v)} max={5000} />
                </Field>
              </>
            )}
          </div>

          {!noTickets && (
            <div>
              <div className="mb-1 text-xs font-semibold text-slate-700">Dải mã vé đã xuất</div>
              <RangeRows rows={form.issuedRanges} onChange={(rows) => set("issuedRanges", rows)} />
            </div>
          )}

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
            <ServiceBox tone="flagFlight" label="Bay kéo cờ/bánh">
              <CountInput compact value={form.flagFlight} onChange={(v) => set("flagFlight", v)} max={1000} />
            </ServiceBox>
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold text-slate-700">THU CHI</div>
            <ExpenseRows rows={form.money} onChange={(rows) => set("money", rows)} withKind withMethod hideTotals />
            <div className="mt-2 flex gap-3 text-sm font-semibold">
              <span className="text-emerald-700">Tổng thu +{formatVND(revenue)}</span>
              <span className="text-rose-700">Tổng chi −{formatVND(expenseSum)}</span>
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold text-slate-700">Khách huỷ</div>
            <CancelGuestRows rows={form.cancelledGuests} onChange={(rows) => set("cancelledGuests", rows)} withCodes={!noTickets} />
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold text-slate-700">Khách dời lịch</div>
            <RescheduleGuestRows
              rows={form.rescheduledGuests}
              onChange={(rows) => set("rescheduledGuests", rows)}
              minDate={shiftDateKey(date, 1)}
              withCodes={!noTickets}
            />
          </div>

          <Field label="Ghi chú">
            <TextInput value={form.note} onChange={(e) => set("note", e.target.value)} />
          </Field>

          {error && <Banner tone="error">{error}</Banner>}
          {warnings.length > 0 && (
            <Banner tone="warning" onClose={() => setWarnings([])}>
              <ul className="list-inside list-disc space-y-0.5 text-xs">
                {warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </Banner>
          )}

          {savedClean && <Banner tone="success">✓ Đã lưu thành công — sửa ô nào thì nút lưu bật lại.</Banner>}
          <Button type="button" className="h-10 w-full text-xs" disabled={saving || savedClean} onClick={save}>
            {saving ? "Đang lưu…" : savedClean ? "✓ Đã lưu" : "Lưu hộ điều phối"}
          </Button>
        </div>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Camera man: số chuyến + sổ THU CHI + ghi chú                        */
/* ------------------------------------------------------------------ */

function CameramanRow({
  report,
  spot,
  date,
  locked,
  onSaved,
  fresh,
}: {
  report: CameramanReportDTO;
  spot: string;
  date: string;
  locked: boolean;
  onSaved: () => void;
  fresh?: boolean;
}) {
  const [open, setOpen] = useState(Boolean(fresh));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flycam, setFlycamRaw] = useState(report.flycamFlights);
  const [paragliding, setParaglidingRaw] = useState(report.paraglidingFlights);
  const [money, setMoneyRaw] = useState<ExpenseRow[]>(() => toExpenseRows(report.expenses));
  const [note, setNoteRaw] = useState(report.note);
  const [savedClean, setSavedClean] = useState(false);
  const setFlycam = (v: number) => { setSavedClean(false); setFlycamRaw(v); };
  const setParagliding = (v: number) => { setSavedClean(false); setParaglidingRaw(v); };
  const setMoney = (rows: ExpenseRow[]) => { setSavedClean(false); setMoneyRaw(rows); };
  const setNote = (v: string) => { setSavedClean(false); setNoteRaw(v); };

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await apiPost<{ report: CameramanReportDTO }>(`/api/baocao/reports/cameraman?spot=${spot}`, {
        date,
        targetUsername: report.username,
        flycamFlights: flycam,
        flycamCodesText: report.flycamCodes.join(", "),
        paraglidingFlights: paragliding,
        paraglidingCodesText: "",
        expenses: money.filter((e) => e.content.trim() || e.amount),
        note,
        submit: report.submitted,
      });
      setFlycamRaw(res.report.flycamFlights);
      setParaglidingRaw(res.report.paraglidingFlights);
      setMoneyRaw(toExpenseRows(res.report.expenses));
      setNoteRaw(res.report.note);
      setSavedClean(true);
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không lưu được");
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-medium text-slate-900">
            {report.cameramanName} <span className="text-xs font-normal text-slate-500">— camera man</span>
          </div>
          <div className="text-xs text-slate-500">
            {report.flycamFlights} quay dù · {report.paraglidingFlights} quay checkin
          </div>
        </div>
        {!locked && (
          <Button type="button" variant="ghost" className="h-8 px-3 text-xs" onClick={() => setOpen((v) => !v)}>
            {open ? "Đóng" : "Sửa"}
          </Button>
        )}
      </div>

      {open && !locked && (
        <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="grid gap-3 @md:grid-cols-2">
            <Field label="Số quay dù lượn (flycam)">
              <CountInput value={flycam} onChange={setFlycam} max={1000} />
            </Field>
            <Field label="Số quay checkin">
              <CountInput value={paragliding} onChange={setParagliding} max={1000} />
            </Field>
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold text-slate-700">THU CHI</div>
            <ExpenseRows rows={money} onChange={setMoney} withKind hideTotals />
          </div>

          <Field label="Ghi chú">
            <TextInput value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>

          {error && <Banner tone="error">{error}</Banner>}
          {savedClean && <Banner tone="success">✓ Đã lưu thành công — sửa ô nào thì nút lưu bật lại.</Banner>}
          <Button type="button" className="h-10 w-full text-xs" disabled={saving || savedClean} onClick={save}>
            {saving ? "Đang lưu…" : savedClean ? "✓ Đã lưu" : "Lưu hộ camera man"}
          </Button>
        </div>
      )}
    </li>
  );
}
