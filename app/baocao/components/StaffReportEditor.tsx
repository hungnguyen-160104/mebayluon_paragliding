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
 * Kế toán SỬA TRỰC TIẾP báo cáo QUẦY VÉ / ĐIỀU PHỐI và CAMERA MAN trên trang Chốt ngày.
 *
 * Quầy vé và điều phối là hai vai NGANG CẤP, dùng chung một bản báo cáo ngày —
 * trong mã gọi chung là "dispatcher" cho gọn.
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
  moneyByPerson,
}: {
  spot: string;
  date: string;
  locked: boolean;
  onSaved: () => void;
  /** Tiền sổ booking ghi dưới tên từng người — trang chốt ngày truyền xuống. */
  moneyByPerson?: PersonMoney[];
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
  /** ĐÃ TẢI XONG cho ngày/điểm nào — chống vẽ thẻ với số của ngày cũ (cùng lỗi PilotReportEditor 04/09). */
  const [loadedFor, setLoadedFor] = useState("");

  const [reloadTick, setReloadTick] = useState(0);
  const load = useCallback(() => setReloadTick((t) => t + 1), []);

  /**
   * Đổi ngày thì danh sách "nhập hộ" của ngày cũ không được lôi theo.
   *
   * Chỉnh NGAY LÚC DỰNG chứ không đặt trong effect: đặt trong effect là React
   * dựng một lượt với dữ liệu cũ rồi mới dựng lại — nhấp nháy, và ESLint chặn
   * đúng vì lý do ấy. Đây là cách React khuyến nghị cho "state phụ thuộc prop".
   */
  const [ngayCu, setNgayCu] = useState(date);
  if (ngayCu !== date) {
    setNgayCu(date);
    setAddedDp([]);
    setAddedCm([]);
  }

  useEffect(() => {
    let alive = true;
    Promise.all([
      apiGet<{ reports: DispatcherReportDTO[]; staff?: StaffLite[] }>(`/api/baocao/reports/dispatcher?date=${date}&all=1&spot=${spot}`),
      apiGet<{ reports: CameramanReportDTO[]; staff?: StaffLite[] }>(`/api/baocao/reports/cameraman?date=${date}&all=1&spot=${spot}`),
    ])
      .then(([d, c]) => {
        if (!alive) return;
        /**
         * Luôn rơi về mảng rỗng nếu máy chủ trả hình dạng khác: một lần API đổi
         * nhánh theo vai (quản trị kiêm kế toán) là `reports` thành undefined,
         * `.some()` nổ ngay giữa lúc dựng trang và cả trang Chốt ngày trắng bốc
         * kèm "Application error". Trắng cả trang vì một ô dữ liệu thiếu là quá đắt.
         */
        const dReports = Array.isArray(d.reports) ? d.reports : [];
        const cReports = Array.isArray(c.reports) ? c.reports : [];
        setDispatchers(dReports);
        setCameramen(cReports);
        setDispatcherStaff(d.staff ?? []);
        setCameramanStaff(c.staff ?? []);
        setAddedDp((prev) => prev.filter((u) => !dReports.some((r) => r.username === u)));
        setAddedCm((prev) => prev.filter((u) => !cReports.some((r) => r.username === u)));
        setLoadedFor(`${spot}|${date}`);
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
  /** Dữ liệu trong tay có đúng ngày/điểm đang xem không — sai thì không vẽ thẻ. */
  const ready = loadedFor === `${spot}|${date}`;
  const dpRows: DispatcherReportDTO[] = !ready ? [] : [
    ...dispatchers,
    ...addedDp
      .map((u) => dispatcherStaff.find((a) => a.username === u))
      .filter(Boolean)
      .map((a) => blankDispatcherReport(a!.username, a!.name, date)),
  ];
  const cmRows: CameramanReportDTO[] = !ready ? [] : [
    ...cameramen,
    ...addedCm
      .map((u) => cameramanStaff.find((a) => a.username === u))
      .filter(Boolean)
      .map((a) => blankCameramanReport(a!.username, a!.name, date)),
  ];

  if (!dpRows.length && !cmRows.length && !missingDp.length && !missingCm.length) return null;

  return (
    <CollapseCard
      title={`Báo cáo quầy/điều phối & camera man (${dispatchers.length + cameramen.length})`}
      hint="Nhân viên nhập — kế toán chỉ XÁC NHẬN. Sai ở đâu bấm Sửa: chỉnh được MỌI chi tiết (dải mã vé, thu chi, khách huỷ/dời, dịch vụ…) rồi lưu hộ; người chưa báo thì chọn thêm và nhập hộ."
    >
      {error && <Banner tone="error">{error}</Banner>}

      <ul className="divide-y divide-slate-100">
        {dpRows.map((r) => (
          <DispatcherRow
            key={`${r.username}|${date}`}
            report={r}
            spot={spot}
            date={date}
            locked={locked}
            fresh={addedDp.includes(r.username)}
            /* Khớp theo TÊN vì lệnh thu lưu tên người, không lưu tên đăng nhập */
            money={(moneyByPerson ?? []).find((m) => m.name === r.staffName)}
            onSaved={() => { load(); onSaved(); }}
          />
        ))}
        {cmRows.map((r) => (
          <CameramanRow key={`${r.username}|${date}`} report={r} spot={spot} date={date} locked={locked} fresh={addedCm.includes(r.username)} onSaved={() => { load(); onSaved(); }} />
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
  /** Mã vé TRẢ LẠI QUẦY (không phải vé huỷ) — xem ghi chú ở chỗ lưu. */
  recalledCodesText: string;
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
    recalledCodesText: (r.recalledCodes ?? []).join(", "),
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

/** Tiền ghi dưới tên một người trong sổ booking — xem moneyByPerson ở máy chủ. */
export type PersonMoney = {
  name: string;
  /** Tiền khách trả — TM người này đang giữ, CK người này ghi nhận. */
  cash: number;
  transfer: number;
  /** Khoản THU tại bãi người này tự liệt kê trong sổ thu chi. */
  income: number;
  /** Tổng CHI: nước, xe, khoản chi tự liệt kê, và hoa hồng đại lý trả bằng TM. */
  spend: number;
  /** Phần người đó tự liệt kê trong sổ thu chi. */
  spendOwn?: number;
  /** Phần hoa hồng đại lý trả bằng tiền mặt — ghi trên booking, KHÔNG có trong sổ thu chi. */
  spendCommission?: number;
  commissionDetail?: Array<{ label: string; amount: number }>;
};

/** "500.000" -> "500k" — dòng tóm tắt phải lướt được, không phải đọc từng số. */
function kVND(amount: number): string {
  return `${Math.round(amount / 1000).toLocaleString("vi-VN")}k`;
}

function DispatcherRow({
  report,
  spot,
  date,
  locked,
  onSaved,
  fresh,
  money,
}: {
  report: DispatcherReportDTO;
  /** Tiền SỔ BOOKING ghi dưới tên người này — không phải số họ tự gõ. */
  money?: PersonMoney;
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
          /**
           * MÃ VÉ THU HỒI phải gửi kèm, nếu không là XOÁ SẠCH của người nhập.
           *
           * Máy chủ đọc `recalledCodesText ?? ""` rồi ghi đè — khung này trước
           * đây không có ô ấy nên mỗi lần kế toán bấm "Lưu hộ" là mã thu hồi
           * của quầy bay mất không dấu vết, kéo theo bảng soát mất luôn đường
           * truy vé (chủ báo 11/09).
           */
          recalledCodesText: form.recalledCodesText,
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
            {report.staffName} <span className="text-xs font-normal text-slate-500">— quầy/điều phối</span>
            <span
              className={
                "ml-2 rounded px-1.5 py-0.5 text-[11px] font-semibold " +
                (report.submitted ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900")
              }
            >
              {report.submitted ? "đã chốt" : "còn nháp"}
            </span>
          </div>
          {/**
           * TIỀN LẤY TỪ SỔ BOOKING, không lấy hai ô người ta tự gõ.
           *
           * Ô tự gõ hay để trống — ngày 25/08 Ms Duyên bỏ trống cả hai nên dòng
           * này hiện "TM 0đ · CK 0đ" trong khi ngày đó thu thật 5,48tr tiền mặt
           * và 8,96tr chuyển khoản. Số cộng từ lệnh thu thì bám tiền thật.
           */}
          <div className="text-xs text-slate-500">
            {report.guestCount} khách{noTickets ? "" : ` · ${report.ticketsIssued} vé xuất`}
            {!noTickets && report.cancelledCount > 0 && (
              <span className="font-semibold text-rose-600"> · {report.cancelledCount} vé huỷ</span>
            )}
            {" · "}
            <span className={money && money.cash > 0 ? "font-semibold text-emerald-700" : undefined}>
              TM {formatVND(money?.cash ?? report.cashReceived)}
            </span>
            {" · "}
            <span className={money && money.transfer > 0 ? "font-semibold text-emerald-700" : undefined}>
              CK {formatVND(money?.transfer ?? report.transferReceived)}
            </span>
            {money && <span className="text-slate-400"> (theo sổ booking)</span>}
            {/* THU xanh, CHI đỏ — cùng quy ước màu với dòng phi công. Khoản
                bằng 0 không hiện cho đỡ rối. */}
            {money && money.income > 0 && (
              <span className="font-semibold text-emerald-700"> · Thu +{kVND(money.income)}</span>
            )}
            {money && money.spend > 0 && (
              /**
               * NÓI RÕ KHOẢN CHI TỪ ĐÂU RA (chủ báo 10/09): hoa hồng đại lý trả
               * bằng tiền mặt ghi thẳng trên booking, không nằm trong sổ thu chi
               * — nên dòng này từng hiện "Chi −300k" trong khi thẻ THU CHI của
               * người ấy trống, nhìn như máy bịa số. Nay ghi thẳng nguồn, và rê
               * chuột thấy đúng booking nào.
               */
              <span
                className="font-semibold text-rose-700"
                title={(money.commissionDetail ?? []).map((c) => `${c.label}: ${formatVND(c.amount)}`).join("\n") || undefined}
              >
                {" "}· Chi −{kVND(money.spend)}
                {(money.spendCommission ?? 0) > 0 && (
                  <span className="font-normal text-rose-600">
                    {" "}
                    ({(money.spendOwn ?? 0) > 0 ? `sổ thu chi ${kVND(money.spendOwn ?? 0)} + ` : ""}
                    hoa hồng đại lý {kVND(money.spendCommission ?? 0)})
                  </span>
                )}
              </span>
            )}
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

          {!noTickets && (
            <Field
              label="Mã vé THU HỒI (vé trả lại quầy, không phải vé huỷ)"
              hint="Cách nhau bằng dấu phẩy hoặc khoảng trắng. Gõ tắt 4 số cuối cũng được: 1105, 1106."
            >
              <TextInput
                value={form.recalledCodesText}
                onChange={(e) => set("recalledCodesText", e.target.value)}
                placeholder="MBL1105, MBL1106"
              />
            </Field>
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

          <HoSoNgay spot={spot} date={date} username={report.username} />

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
            {saving ? "Đang lưu…" : savedClean ? "✓ Đã lưu" : "Lưu hộ quầy/điều phối"}
          </Button>
        </div>
      )}
    </li>
  );
}


/* ------------------------------------------------------------------ */
/* Hồ sơ một người trong một ngày                                      */
/* ------------------------------------------------------------------ */

type HoSo = {
  name: string;
  tien: {
    lenhThuTM: number; lenhThuCK: number; soThu: number; soChi: number;
    hoaHongTM: number; hangTM: number; hangCK: number; daNop: number; daUng: number;
  };
  huy: Array<{ bookingCode: string; contactName: string; guests: number; refund: number; luc: string }>;
  doi: Array<{ bookingCode: string; contactName: string; guests: number; denNgay: string; luc: string }>;
  dichVu: Array<{ kieu: "add" | "remove"; nhan: string; items: string; tien: number; luc: string }>;
  lenhThu: Array<{ nhan: string; soTien: number; cach: "cash" | "transfer"; trangThai: string }>;
};

/**
 * MỌI VIỆC NGƯỜI NÀY ĐÃ BẤM TRONG NGÀY — thu tiền khách nào, huỷ ai, dời ai,
 * thêm bớt dịch vụ gì, nộp/ứng bao nhiêu.
 *
 * Vì sao phải có ngay trong khung sửa (chủ chốt 11/09): kế toán mở báo cáo của
 * một người ra soát thì chỉ thấy mấy ô số họ TỰ KHAI. Việc họ bấm trong sổ
 * booking nằm rải ở bốn năm trang khác, muốn đối chiếu phải mở từng trang mà
 * tra — nên số lệch thì chỉ biết là lệch, không biết lệch ở đâu.
 *
 * Nạp KHI BẤM MỞ, không nạp sẵn: một ngày có cả chục người, nạp hết là chục
 * lượt hỏi máy chủ cho thứ phần lớn lần không ai mở tới.
 */
function HoSoNgay({ spot, date, username }: { spot: string; date: string; username: string }) {
  const [mo, setMo] = useState(false);
  const [du, setDu] = useState<HoSo | null>(null);
  const [loi, setLoi] = useState<string | null>(null);

  useEffect(() => {
    if (!mo || du) return;
    let song = true;
    apiGet<HoSo>(`/api/baocao/reports/nhan-su?spot=${spot}&date=${date}&username=${encodeURIComponent(username)}`)
      .then((r) => song && setDu(r))
      .catch((e) => song && setLoi(e instanceof Error ? e.message : "Không lấy được hồ sơ"));
    return () => {
      song = false;
    };
  }, [mo, du, spot, date, username]);

  const o = (nhan: string, tien: number, mau: string) =>
    tien === 0 ? null : (
      <span className={"rounded-lg border px-1.5 py-0.5 " + mau}>
        {nhan} <strong className="tabular-nums">{formatVND(tien)}</strong>
      </span>
    );

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setMo((x) => !x)}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs font-bold text-slate-700"
      >
        <span className="text-[10px]">{mo ? "▾" : "▸"}</span>
        Người này đã làm gì trong ngày
        <span className="font-normal text-slate-400">— lệnh thu · huỷ · dời · dịch vụ · nộp tiền</span>
      </button>

      {mo && (
        <div className="space-y-2 border-t border-slate-100 px-2.5 py-2 text-[11px] text-slate-700">
          {loi && <p className="font-medium text-rose-700">{loi}</p>}
          {!du && !loi && <p className="text-slate-500">Đang lấy…</p>}
          {du && (
            <>
              <div className="flex flex-wrap gap-1.5">
                {o("Lệnh thu TM", du.tien.lenhThuTM, "border-emerald-200 bg-emerald-50 text-emerald-800")}
                {o("Lệnh thu CK", du.tien.lenhThuCK, "border-indigo-200 bg-indigo-50 text-indigo-800")}
                {o("Sổ thu", du.tien.soThu, "border-emerald-200 bg-emerald-50 text-emerald-800")}
                {o("Sổ chi", du.tien.soChi, "border-rose-200 bg-rose-50 text-rose-800")}
                {o("Hoa hồng đại lý (TM)", du.tien.hoaHongTM, "border-rose-200 bg-rose-50 text-rose-800")}
                {o("Hàng bán thêm TM", du.tien.hangTM, "border-emerald-200 bg-emerald-50 text-emerald-800")}
                {o("Hàng bán thêm CK", du.tien.hangCK, "border-indigo-200 bg-indigo-50 text-indigo-800")}
                {o("Đã nộp", du.tien.daNop, "border-slate-300 bg-slate-50 text-slate-700")}
                {o("Đã ứng", du.tien.daUng, "border-amber-200 bg-amber-50 text-amber-800")}
              </div>

              {du.lenhThu.length > 0 && (
                <div>
                  <div className="font-bold text-slate-600">Lệnh thu ({du.lenhThu.length})</div>
                  <ul className="mt-0.5 space-y-0.5">
                    {du.lenhThu.map((x, i) => (
                      <li key={i} className="flex flex-wrap items-baseline gap-x-1.5">
                        <span className="min-w-0 flex-1 truncate">{x.nhan}</span>
                        <span className={x.cach === "cash" ? "font-semibold text-emerald-700" : "font-semibold text-indigo-700"}>
                          {x.cach === "cash" ? "TM" : "CK"} {formatVND(x.soTien)}
                        </span>
                        <span className="text-slate-400">{x.trangThai}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {du.huy.length > 0 && (
                <div>
                  <div className="font-bold text-rose-700">Khách huỷ ({du.huy.length})</div>
                  <ul className="mt-0.5 space-y-0.5">
                    {du.huy.map((x, i) => (
                      <li key={i}>
                        {x.luc} · {x.contactName || x.bookingCode} · {x.guests} khách
                        {x.refund > 0 ? ` · hoàn ${formatVND(x.refund)}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {du.doi.length > 0 && (
                <div>
                  <div className="font-bold text-amber-700">Khách dời lịch ({du.doi.length})</div>
                  <ul className="mt-0.5 space-y-0.5">
                    {du.doi.map((x, i) => (
                      <li key={i}>
                        {x.luc} · {x.contactName || x.bookingCode} · {x.guests} khách → {x.denNgay}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {du.dichVu.length > 0 && (
                <div>
                  <div className="font-bold text-sky-700">Dịch vụ thêm / bớt ({du.dichVu.length})</div>
                  <ul className="mt-0.5 space-y-0.5">
                    {du.dichVu.map((x, i) => (
                      <li key={i}>
                        {x.luc} · {x.kieu === "add" ? "thêm" : "bớt"} {x.items} — {x.nhan}
                        {x.tien !== 0 && (
                          <strong className={x.tien > 0 ? " text-emerald-700" : " text-rose-700"}>
                            {" "}
                            {x.tien > 0 ? "+" : "−"}
                            {formatVND(Math.abs(x.tien))}
                          </strong>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!du.lenhThu.length && !du.huy.length && !du.doi.length && !du.dichVu.length && (
                <p className="text-slate-500">Ngày này người đó không bấm gì trong sổ booking.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
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
