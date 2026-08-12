// app/baocao/components/StaffReportEditor.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import type { CameramanReportDTO, DispatcherReportDTO } from "@/lib/baobay/types";
import { formatVND } from "@/lib/pricing";

import { apiGet, apiPost } from "./client-api";
import { Banner, Button, Card, CountInput, Field, MoneyInput } from "./ui";

/**
 * Kế toán sửa hộ báo cáo ĐIỀU PHỐI và CAMERA MAN ngay trên trang Chốt ngày.
 *
 * Sinh ra từ một ca kẹt thật: điều phối khai 0 vé xuất nhưng lại có 10 triệu
 * chuyển khoản — mọi phép đối chiếu đỏ rực mà kế toán nhập số của MÌNH đúng
 * bao nhiêu cũng không hết, vì bên sai là dữ liệu của nhân viên. Khung này cho
 * kế toán sửa thẳng các Ô SỐ hay lệch nhất; nhóm vé huỷ/dời lịch (có mã, lý do,
 * liên hệ) vẫn để chính điều phối sửa trên trang của họ cho khỏi mất chi tiết.
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
  const [error, setError] = useState<string | null>(null);

  const [reloadTick, setReloadTick] = useState(0);
  const load = useCallback(() => setReloadTick((t) => t + 1), []);

  useEffect(() => {
    let alive = true;
    Promise.all([
      apiGet<{ reports: DispatcherReportDTO[] }>(`/api/baocao/reports/dispatcher?date=${date}&all=1&spot=${spot}`),
      apiGet<{ reports: CameramanReportDTO[] }>(`/api/baocao/reports/cameraman?date=${date}&all=1&spot=${spot}`),
    ])
      .then(([d, c]) => {
        if (!alive) return;
        setDispatchers(d.reports);
        setCameramen(c.reports);
        setError(null);
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : "Không tải được báo cáo nhân viên");
      });
    return () => {
      alive = false;
    };
  }, [date, spot, reloadTick]);

  if (!dispatchers.length && !cameramen.length) return null;

  return (
    <Card
      title={`Báo cáo điều phối & camera man trong ngày (${dispatchers.length + cameramen.length})`}
      hint="Kế toán sửa trực tiếp các ô số — nhóm vé huỷ/dời lịch (có mã và lý do) vẫn nhờ chính điều phối sửa trên trang của họ."
    >
      {error && <Banner tone="error">{error}</Banner>}

      <ul className="divide-y divide-slate-100">
        {dispatchers.map((r) => (
          <DispatcherRow key={r.id} report={r} spot={spot} date={date} locked={locked} onSaved={() => { load(); onSaved(); }} />
        ))}
        {cameramen.map((r) => (
          <CameramanRow key={r.id} report={r} spot={spot} date={date} locked={locked} onSaved={() => { load(); onSaved(); }} />
        ))}
      </ul>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

function DispatcherRow({
  report,
  spot,
  date,
  locked,
  onSaved,
}: {
  report: DispatcherReportDTO;
  spot: string;
  date: string;
  locked: boolean;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [form, setForm] = useState(() => dispatcherForm(report));

  const set = <K extends keyof ReturnType<typeof dispatcherForm>>(key: K, value: number) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function save() {
    setSaving(true);
    setError(null);
    setWarnings([]);
    try {
      /**
       * Gửi ĐỦ mọi trường: các nhóm huỷ/dời/ngoại giao/thu có tên và dải mã
       * lấy nguyên từ bản đã lưu — khung này chỉ sửa Ô SỐ, không được làm mất
       * chi tiết người nhập đã khai.
       */
      const res = await apiPost<{ report: DispatcherReportDTO; warnings: string[] }>(
        `/api/baocao/reports/dispatcher?spot=${spot}`,
        {
          date,
          targetUsername: report.username,
          ...form,
          issuedRanges: report.issuedRanges.map((x) => ({ from: x.from, to: x.to })),
          cancelledEntries: report.cancelledEntries.map((e) => ({
            codesText: e.codes.join(" "),
            reason: e.reason,
            contactName: e.contactName,
          })),
          rescheduledEntries: report.rescheduledEntries.map((e) => ({
            codesText: e.codes.join(" "),
            toDate: e.toDate,
            reason: e.reason,
            contactName: e.contactName,
            phone: e.phone,
          })),
          diplomaticEntries: report.diplomaticEntries.map((e) => ({
            codesText: e.codes.join(" "),
            amount: e.amount,
          })),
          // Tổng lưu = tiền vé + các dòng thu có tên; gửi lại phần "tiền vé" = tổng − các dòng
          cashReceived:
            form.cashReceived -
            report.revenueEntries.filter((e) => e.method === "cash").reduce((a, e) => a + e.amount, 0),
          transferReceived:
            form.transferReceived -
            report.revenueEntries.filter((e) => e.method === "transfer").reduce((a, e) => a + e.amount, 0),
          revenueEntries: report.revenueEntries,
          flycamCodesText: "",
          video360CodesText: "",
          redFlagCodesText: "",
          flagFlightCodesText: "",
          expenses: report.expenses,
          note: report.note,
        },
      );
      setWarnings(res.warnings || []);
      setForm(dispatcherForm(res.report));
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
          </div>
          <div className="text-xs text-slate-500">
            {report.guestCount} khách · {report.ticketsIssued} vé xuất · TM {formatVND(report.cashReceived)} · CK{" "}
            {formatVND(report.transferReceived)}
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
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Số khách">
              <CountInput value={form.guestCount} onChange={(v) => set("guestCount", v)} max={5000} />
            </Field>
            <Field label="Vé xuất ra">
              <CountInput value={form.ticketsIssued} onChange={(v) => set("ticketsIssued", v)} max={5000} />
            </Field>
            <Field label="Vé thu về">
              <CountInput value={form.ticketsReturned} onChange={(v) => set("ticketsReturned", v)} max={5000} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tiền mặt (tổng)">
              <MoneyInput value={form.cashReceived} onChange={(v) => set("cashReceived", v)} />
            </Field>
            <Field label="Chuyển khoản (tổng)">
              <MoneyInput value={form.transferReceived} onChange={(v) => set("transferReceived", v)} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Flycam">
              <CountInput value={form.flycam} onChange={(v) => set("flycam", v)} max={1000} />
            </Field>
            <Field label="Camera 360">
              <CountInput value={form.video360} onChange={(v) => set("video360", v)} max={1000} />
            </Field>
            <Field label="Cờ đỏ">
              <CountInput value={form.redFlag} onChange={(v) => set("redFlag", v)} max={1000} />
            </Field>
            <Field label="Kéo cờ">
              <CountInput value={form.flagFlight} onChange={(v) => set("flagFlight", v)} max={1000} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
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

          <Button type="button" className="h-10 w-full text-xs" disabled={saving} onClick={save}>
            {saving ? "Đang lưu…" : "Lưu hộ điều phối"}
          </Button>
        </div>
      )}
    </li>
  );
}

function dispatcherForm(r: DispatcherReportDTO) {
  return {
    guestCount: r.guestCount,
    ticketsIssued: r.ticketsIssued,
    ticketsReturned: r.ticketsReturned,
    cashReceived: r.cashReceived,
    transferReceived: r.transferReceived,
    flycam: r.flycam,
    video360: r.video360,
    redFlag: r.redFlag,
    flagFlight: r.flagFlight,
    guestWaterCost: r.guestWaterCost,
    mountainCarCost: r.mountainCarCost,
    shuttleCarCost: r.shuttleCarCost,
  };
}

/* ------------------------------------------------------------------ */

function CameramanRow({
  report,
  spot,
  date,
  locked,
  onSaved,
}: {
  report: CameramanReportDTO;
  spot: string;
  date: string;
  locked: boolean;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flycam, setFlycam] = useState(report.flycamFlights);
  const [paragliding, setParagliding] = useState(report.paraglidingFlights);

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
        paraglidingCodesText: report.paraglidingCodes.join(", "),
        expenses: report.expenses,
        note: report.note,
        submit: report.submitted,
      });
      setFlycam(res.report.flycamFlights);
      setParagliding(res.report.paraglidingFlights);
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
            {report.flycamFlights} flycam · {report.paraglidingFlights} quay dù
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
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Số chuyến flycam">
              <CountInput value={flycam} onChange={setFlycam} max={1000} />
            </Field>
            <Field label="Số quay dù lượn">
              <CountInput value={paragliding} onChange={setParagliding} max={1000} />
            </Field>
          </div>
          {error && <Banner tone="error">{error}</Banner>}
          <Button type="button" className="h-10 w-full text-xs" disabled={saving} onClick={save}>
            {saving ? "Đang lưu…" : "Lưu hộ camera man"}
          </Button>
        </div>
      )}
    </li>
  );
}
