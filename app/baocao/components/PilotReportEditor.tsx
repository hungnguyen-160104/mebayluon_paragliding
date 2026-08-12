// app/baocao/components/PilotReportEditor.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import type { PilotReportDTO } from "@/lib/baobay/types";
import { formatVND } from "@/lib/pricing";

import { apiGet, apiPost } from "./client-api";
import { Banner, Button, Card, CountInput, Field, MoneyInput, TextArea, TextInput } from "./ui";

/**
 * Khung cho KẾ TOÁN sửa báo cáo phi công ngay trên trang chốt ngày.
 *
 * Đi cùng một đường lưu với chính phi công (POST kèm targetUsername): cùng
 * kiểm tra mã vé, cùng chạy lại đối chiếu, cùng bị chặn khi ngày đã chốt.
 * Phạt nộp muộn KHÔNG bị tính lại khi kế toán sửa — phạt chỉ tính theo lần
 * chốt đầu tiên của chính phi công.
 */
export function PilotReportEditor({
  spot,
  date,
  locked,
  onSaved,
}: {
  /** Điểm bay đang xem — mỗi điểm một hệ thống riêng. */
  spot: string;
  date: string;
  locked: boolean;
  /** Gọi sau khi lưu để trang chốt ngày tải lại phần đối chiếu. */
  onSaved: () => void;
}) {
  const [reports, setReports] = useState<PilotReportDTO[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiGet<{ reports: PilotReportDTO[] }>(
        `/api/baocao/reports/pilot?date=${date}&all=1&spot=${spot}`,
      );
      setReports(res.reports);
    } catch (err: any) {
      setError(err?.message || "Không tải được báo cáo phi công");
    } finally {
      setBusy(false);
    }
  }, [date, spot]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card
      title={`Báo cáo phi công trong ngày (${reports.length})`}
      hint="Kế toán sửa trực tiếp được — lưu hộ đi cùng một đường kiểm tra với chính phi công. Phạt nộp muộn không bị tính lại khi sửa."
    >
      {error && <Banner tone="error">{error}</Banner>}
      {busy && <p className="text-sm text-slate-500">Đang tải…</p>}

      {!busy && reports.length === 0 && (
        <p className="text-sm text-slate-500">Chưa phi công nào báo cáo ngày này.</p>
      )}

      <ul className="divide-y divide-slate-100">
        {reports.map((r) => (
          <PilotRow key={r.id} report={r} spot={spot} date={date} locked={locked} onSaved={() => { load(); onSaved(); }} />
        ))}
      </ul>
    </Card>
  );
}

function PilotRow({
  report,
  spot,
  date,
  locked,
  onSaved,
}: {
  report: PilotReportDTO;
  spot: string;
  date: string;
  locked: boolean;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [form, setForm] = useState(() => toForm(report));

  const set = <K extends keyof ReturnType<typeof toForm>>(key: K, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function save(submit: boolean) {
    setSaving(true);
    setError(null);
    setWarnings([]);
    try {
      const res = await apiPost<{ report: PilotReportDTO; warnings: string[] }>(
        `/api/baocao/reports/pilot?spot=${spot}`,
        { date, targetUsername: report.username, ...form, expenses: report.expenses, submit },
      );
      setWarnings(res.warnings || []);
      setForm(toForm(res.report));
      onSaved();
    } catch (err: any) {
      setError(err?.message || "Không lưu được");
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-medium text-slate-900">{report.pilotName}</div>
          <PilotSummaryLine report={report} />
        </div>
        <div className="flex items-center gap-2">
          {report.latePenalty > 0 && (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-800">
              phạt {formatVND(report.latePenalty)}
            </span>
          )}
          <span
            className={
              report.submitted
                ? "rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800"
                : "rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800"
            }
          >
            {report.submitted ? "đã chốt" : "còn nháp"}
          </span>
          {!locked && (
            <Button type="button" variant="ghost" className="h-8 px-3 text-xs" onClick={() => setOpen((v) => !v)}>
              {open ? "Đóng" : "Sửa"}
            </Button>
          )}
        </div>
      </div>

      {open && !locked && (
        <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Số chuyến">
              <CountInput value={form.flightCount} onChange={(v) => set("flightCount", v)} max={300} />
            </Field>
            <Field label="Camera 360">
              <CountInput value={form.video360} onChange={(v) => set("video360", v)} max={300} />
            </Field>
          </div>

          <Field label="Mã vé đã bay">
            <TextArea
              value={form.ticketCodesText}
              onChange={(e) => set("ticketCodesText", e.target.value)}
              autoCapitalize="characters"
              spellCheck={false}
              className="min-h-16"
            />
          </Field>

          <Field label="Mã vé Camera 360">
            <TextInput
              value={form.video360CodesText}
              onChange={(e) => set("video360CodesText", e.target.value.toUpperCase())}
              autoCapitalize="characters"
              spellCheck={false}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Khách ngoại giao">
              <CountInput value={form.diplomaticGuests} onChange={(v) => set("diplomaticGuests", v)} max={300} />
            </Field>
            <Field label="Mã vé ngoại giao">
              <TextInput
                value={form.diplomaticCodesText}
                onChange={(e) => set("diplomaticCodesText", e.target.value.toUpperCase())}
                autoCapitalize="characters"
                spellCheck={false}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Phí bãi (khách)">
              <CountInput value={form.siteFeeGuests} onChange={(v) => set("siteFeeGuests", v)} max={500} />
            </Field>
            <Field label="Nước cho khách">
              <MoneyInput value={form.waterCost} onChange={(v) => set("waterCost", v)} />
            </Field>
            {/* "Xe cho khách" đã bỏ khỏi form — tiền xe nằm trong sổ Thu/Chi của phi công */}
          </div>

          {/* Đưa đón tự trả — chỉ điểm Hà Nội */}
          {spot === "ha-noi" && (
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Đón BigC (lượt)">
              <CountInput value={form.pickupBigC} onChange={(v) => set("pickupBigC", v)} max={100} />
            </Field>
            <Field label="Đón khách sạn (lượt)">
              <CountInput value={form.pickupHotel} onChange={(v) => set("pickupHotel", v)} max={100} />
            </Field>
            <Field label="Xe lên núi (lượt)">
              <CountInput value={form.mountainTrips} onChange={(v) => set("mountainTrips", v)} max={100} />
            </Field>
          </div>
          )}

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

          <div className="flex gap-2">
            <Button type="button" variant="ghost" className="h-10 flex-1 bg-white text-xs" disabled={saving} onClick={() => save(false)}>
              {saving ? "Đang lưu…" : "Lưu (để nháp)"}
            </Button>
            <Button type="button" className="h-10 flex-1 text-xs" disabled={saving} onClick={() => save(true)}>
              {saving ? "Đang lưu…" : "Lưu và chốt hộ"}
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

/** 500000 -> "500k", 1200000 -> "1.200k" — chữ k thay cho .000đ, đọc nhanh trên một dòng. */
function kVND(amount: number): string {
  return `${Math.round(amount / 1000).toLocaleString("vi-VN")}k`;
}

/**
 * Một dòng liệt kê ĐỦ những gì phi công đã khai — kế toán lướt danh sách là
 * thấy hết, không phải mở từng người: chuyến/mã, dịch vụ, PPG, lượt đưa đón,
 * rồi tiền — THU màu xanh dấu +, CHI màu đỏ dấu −, "k" thay cho nghìn đồng.
 * Khoản bằng 0 không hiện cho đỡ rối.
 */
function PilotSummaryLine({ report: r }: { report: PilotReportDTO }) {
  const thu = r.expenses.reduce((a, e) => a + (e.kind === "thu" ? e.amount : 0), 0);
  const chiKhac = r.expenses.reduce((a, e) => a + (e.kind !== "thu" ? e.amount : 0), 0);

  const parts: React.ReactNode[] = [];
  const add = (node: React.ReactNode, key: string) =>
    parts.push(
      <span key={key} className="whitespace-nowrap">
        {node}
      </span>,
    );

  add(`${r.flightCount} chuyến`, "fl");
  add(`${r.ticketCodes.length} mã`, "codes");
  if (r.flycam) add(`${r.flycam}×flycam`, "flycam");
  if (r.video360) add(`${r.video360}×360`, "v360");
  if (r.redFlag) add(`${r.redFlag}×cờ đỏ`, "red");
  if (r.flagFlight) add(`${r.flagFlight}×kéo cờ`, "flag");
  if (r.ppgFlights) add(`${r.ppgFlights}×PPG${r.ppgNoTicket ? ` (${r.ppgNoTicket} không vé)` : ""}`, "ppg");
  if (r.diplomaticGuests) add(`${r.diplomaticGuests} ngoại giao`, "diplo");
  if (r.pickupBigC) add(`xe BigC ×${r.pickupBigC}`, "bigc");
  if (r.pickupHotel) add(`xe đón KS ×${r.pickupHotel}`, "hotel");
  if (r.mountainTrips) add(`xe lên núi ×${r.mountainTrips}`, "mount");

  const money: React.ReactNode[] = [];
  const addMoney = (label: string, amount: number, kind: "thu" | "chi", key: string) =>
    money.push(
      <span
        key={key}
        className={"whitespace-nowrap font-medium " + (kind === "thu" ? "text-emerald-700" : "text-rose-700")}
      >
        {label ? `${label} ` : ""}
        {kind === "thu" ? "+" : "−"}
        {kVND(amount)}
      </span>,
    );

  // Phí bãi tính theo ĐẦU KHÁCH — "3k" = 3 khách, không phải tiền
  if (r.siteFeeGuests) add(`phí bãi ${r.siteFeeGuests}k`, "site");
  if (r.waterCost) addMoney("nước", r.waterCost, "chi", "water");
  if (r.guestCarCost) addMoney("xe khách", r.guestCarCost, "chi", "car");
  if (chiKhac) addMoney("chi khác", chiKhac, "chi", "other");
  if (thu) addMoney("thu", thu, "thu", "thu");

  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-slate-500">
      {parts.map((node, i) => (
        <span key={i} className="flex items-baseline gap-x-2">
          {i > 0 && <span className="text-slate-300">·</span>}
          {node}
        </span>
      ))}
      {money.length > 0 && <span className="text-slate-300">·</span>}
      {money.map((node, i) => (
        <span key={`m${i}`} className="flex items-baseline gap-x-2">
          {i > 0 && <span className="text-slate-300">·</span>}
          {node}
        </span>
      ))}
    </div>
  );
}

/**
 * Gửi ĐỦ mọi trường của schema, kể cả những ô form này không cho sửa
 * (flycam, cờ đỏ, kéo cờ, số lượt đưa đón): máy chủ kiểm đủ trường, thiếu là
 * bị từ chối; mà gửi giá trị mặc định thay vì giá trị hiện có thì lại xoá
 * nhầm số phi công đã khai.
 */
function toForm(r: PilotReportDTO) {
  return {
    flightCount: r.flightCount,
    ticketCodesText: r.ticketCodes.join(", "),
    flycam: r.flycam,
    flycamCodesText: r.flycamCodes.join(", "),
    video360: r.video360,
    video360CodesText: r.video360Codes.join(", "),
    redFlag: r.redFlag,
    redFlagCodesText: r.redFlagCodes.join(", "),
    flagFlight: r.flagFlight,
    flagFlightCodesText: r.flagFlightCodes.join(", "),
    diplomaticGuests: r.diplomaticGuests,
    diplomaticCodesText: r.diplomaticCodes.join(", "),
    siteFeeGuests: r.siteFeeGuests,
    waterCost: r.waterCost,
    guestCarCost: r.guestCarCost,
    pickupBigC: r.pickupBigC,
    pickupHotel: r.pickupHotel,
    mountainTrips: r.mountainTrips,
    ppgFlights: r.ppgFlights,
    ppgCodesText: r.ppgCodes.join(", "),
    ppgNoTicket: r.ppgNoTicket,
    note: r.note,
  };
}
