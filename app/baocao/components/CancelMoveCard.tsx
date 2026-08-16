// app/baocao/components/CancelMoveCard.tsx
"use client";

import { useState } from "react";

import { formatDateKeyVN, shiftDateKey } from "@/lib/baobay/date";
import { formatVND } from "@/lib/pricing";

import { apiPatch } from "./client-api";
import {
  CancelGuestRows,
  RescheduleGuestRows,
  type BookingPick,
  type CancelGuestRow,
  type RescheduleGuestRow,
} from "./rows";
import { Banner, Button, MoneyInput, TextInput } from "./ui";

/**
 * KHÁCH HUỶ / DỜI LỊCH — một thẻ chung.
 *
 * Trước đây tách hai thẻ, mà thực tế người trực xử lý cùng một tình huống: đoàn
 * gọi báo "bọn em không bay được", rồi mới quyết là bỏ hẳn hay chuyển hôm khác.
 * Tách ra thì phải nhớ mình đang ở thẻ nào, và nhóm nào đã xử lý ở thẻ kia.
 *
 * ĐOÀN ĐÔNG BỎ MỘT NỬA là chuyện thường (4 người thì 2 người sợ độ cao). Nên số
 * khách khai được ít hơn cả đoàn: máy tự tách nhóm — phần bỏ/dời thành bản ghi
 * riêng, phần còn lại vẫn bay và tiền tính lại theo số khách còn.
 */
export function CancelMoveCard({
  spot,
  date,
  bookings,
  cancelRows,
  moveRows,
  onCancelRows,
  onMoveRows,
  withCodes,
  disabled,
  onChanged,
}: {
  spot: string;
  date: string;
  bookings: BookingPick[];
  cancelRows: CancelGuestRow[];
  moveRows: RescheduleGuestRow[];
  onCancelRows: (rows: CancelGuestRow[]) => void;
  onMoveRows: (rows: RescheduleGuestRow[]) => void;
  /** Điểm có vé giấy (Khau Phạ, Sa Pa): hỏi mã vé thu hồi. */
  withCodes?: boolean;
  disabled?: boolean;
  /** Đã đụng vào sổ booking — nơi gọi tải lại danh sách. */
  onChanged?: () => void;
}) {
  const [kind, setKind] = useState<"cancel" | "move">("cancel");
  const [pickId, setPickId] = useState("");
  const [guests, setGuests] = useState(0);
  const [codes, setCodes] = useState("");
  const [refund, setRefund] = useState(0);
  /**
   * PHÍ DỊCH VỤ ĐÃ DÙNG — trừ vào tiền hoàn.
   *
   * Đoàn huỷ nửa chừng nhưng đã dùng xe đưa đón, đã quay flycam, đã ăn ở bãi…
   * thì khách chịu phần đó. Trước đây người trực phải tự trừ trong đầu rồi gõ
   * số cuối, không ai biết vì sao hoàn thiếu — giờ ghi rõ ra một ô.
   */
  const [usedFee, setUsedFee] = useState(0);
  const [refundMethod, setRefundMethod] = useState<"cash" | "transfer">("transfer");
  const [toDate, setToDate] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const picked = bookings.find((b) => b.id === pickId) ?? null;
  const whole = picked ? guests >= picked.guestCount : false;

  function pick(id: string) {
    setPickId(id);
    const b = bookings.find((x) => x.id === id);
    setGuests(b?.guestCount ?? 0);
    // Mặc định hoàn ĐÚNG SỐ KHÁCH ĐÃ TRẢ; trừ phí dịch vụ đã dùng thì gõ ô dưới
    setRefund(b?.deposit ?? 0);
    setUsedFee(0);
    setCodes("");
    setNote("");
    setError(null);
  }

  /** Đổi phí đã dùng thì tiền hoàn tự tính lại — vẫn gõ đè được. */
  function setFee(v: number) {
    setUsedFee(v);
    setRefund(Math.max(0, (picked?.deposit ?? 0) - v));
  }

  function reset() {
    setPickId("");
    setGuests(0);
    setCodes("");
    setRefund(0);
    setUsedFee(0);
    setToDate("");
    setNote("");
  }

  async function submit() {
    if (!picked) return setError("Chọn đoàn khách trước");
    if (guests <= 0) return setError("Số khách phải lớn hơn 0");
    if (guests > picked.guestCount) return setError(`Đoàn này chỉ có ${picked.guestCount} khách`);
    if (kind === "move" && !toDate) return setError("Chọn ngày bay mới");
    setBusy(true);
    setError(null);
    try {
      /**
       * Cả đoàn thì đổi thẳng trạng thái booking; một phần thì TÁCH NHÓM — phần
       * bỏ/dời thành bản ghi riêng, phần còn lại giữ nguyên chuyến và tính lại
       * tiền theo số khách còn.
       */
      if (whole) {
        await apiPatch(`/api/baocao/booking?spot=${spot}`, {
          id: picked.id,
          action: kind === "cancel" ? "cancel" : "move",
          ...(kind === "cancel"
            ? {
                ticketIssued: Boolean(withCodes && picked.ticketIssued),
                ticketCodesText: codes,
                refund,
                refundMethod,
              }
            : { toDate }),
        });
      } else {
        await apiPatch(`/api/baocao/booking?spot=${spot}`, {
          id: picked.id,
          action: "split",
          mode: kind,
          guests,
          ...(kind === "cancel"
            ? { ticketIssued: Boolean(withCodes && picked.ticketIssued), ticketCodesText: codes, refund, refundMethod }
            : { toDate }),
        });
      }

      /**
       * Ghi luôn vào BÁO CÁO NGÀY: sổ booking và báo cáo là hai sổ khác nhau,
       * đối chiếu vé thu về lấy số từ báo cáo. Không ghi vào đây thì kế toán
       * thấy lệch dù việc đã xử lý xong trong sổ booking.
       */
      const name = picked.contactName || picked.phone || "khách";
      if (kind === "cancel") {
        onCancelRows([
          ...cancelRows.filter((r) => r.name.trim() || r.guests > 0 || r.codesText.trim()),
          {
            name,
            bookingCode: picked.bookingCode || picked.phone || "",
            guests,
            source: picked.source,
            refund,
            refundMethod,
            note: [
              whole ? "huỷ cả đoàn" : `huỷ ${guests}/${picked.guestCount} khách`,
              usedFee > 0 ? `trừ phí dịch vụ đã dùng ${formatVND(usedFee)}` : "",
              note,
            ]
              .filter(Boolean)
              .join(" — "),
            codesText: codes,
            noTicket: !picked.ticketIssued,
            paid: picked.deposit,
            bookedId: picked.id,
            cancelledDone: true,
          },
        ]);
      } else {
        onMoveRows([
          ...moveRows.filter((r) => r.name.trim() || r.guests > 0 || r.codesText.trim()),
          {
            name,
            guests,
            toDate,
            note: [whole ? "dời cả đoàn" : `dời ${guests}/${picked.guestCount} khách`, note].filter(Boolean).join(" — "),
            phone: picked.phone,
            pickup: "self",
            pickupNote: "",
            expectedTime: "",
            codesText: codes,
            bookedId: picked.id,
          },
        ]);
      }

      setDone(
        kind === "cancel"
          ? `✓ Đã huỷ ${whole ? "cả đoàn" : `${guests}/${picked.guestCount} khách`} — ${name}${refund > 0 ? `, hoàn ${formatVND(refund)}` : ""}.`
          : `✓ Đã dời ${whole ? "cả đoàn" : `${guests}/${picked.guestCount} khách`} — ${name} sang ${formatDateKeyVN(toDate)}.`,
      );
      reset();
      onChanged?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không xử lý được");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {done && (
        <Banner tone="success" onClose={() => setDone(null)}>
          {done}
        </Banner>
      )}
      {error && <Banner tone="error">{error}</Banner>}

      {/* ---- Xử lý NHANH từ sổ booking: chọn đoàn, chọn huỷ/dời, xong ---- */}
      <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-2.5">
        <div className="flex h-9 overflow-hidden rounded-lg border border-slate-300">
          {(
            [
              ["cancel", "✕ Khách huỷ"],
              ["move", "⇢ Dời lịch"],
            ] as Array<["cancel" | "move", string]>
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              disabled={disabled}
              onClick={() => setKind(v)}
              className={
                kind === v
                  ? "flex-1 bg-slate-800 text-xs font-bold text-white"
                  : "flex-1 bg-white text-xs font-medium text-slate-500"
              }
            >
              {label}
            </button>
          ))}
        </div>

        <select
          value={pickId}
          disabled={disabled}
          onChange={(e) => pick(e.target.value)}
          className="mt-1.5 h-10 w-full rounded-lg border border-sky-300 bg-white px-2 text-sm font-medium outline-none focus:border-sky-600"
        >
          <option value="">— chọn đoàn khách trong sổ booking —</option>
          {bookings.map((b) => (
            <option key={b.id} value={b.id}>
              #{b.daySeq} {b.contactName || b.phone || "khách"} · {b.guestCount} khách
              {b.deposit ? ` · đã trả ${Math.round(b.deposit / 1000).toLocaleString("vi-VN")}k` : ""}
              {b.status === "done" ? " · đã bay" : ""}
            </option>
          ))}
        </select>

        {picked && (
          <>
            {/* Đoàn đông bỏ một nửa: gõ số khách thật sự huỷ/dời */}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-xs font-semibold text-slate-700">
                Số khách {kind === "cancel" ? "huỷ" : "dời"}:
              </span>
              <input
                type="number"
                min={1}
                max={picked.guestCount}
                value={guests}
                disabled={disabled}
                onChange={(e) => setGuests(Math.max(0, Math.min(picked.guestCount, Number(e.target.value) || 0)))}
                className="h-8 w-16 rounded-lg border border-slate-300 bg-white px-2 text-center text-sm font-bold tabular-nums"
              />
              <span className="text-xs text-slate-500">/ {picked.guestCount} khách</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => setGuests(picked.guestCount)}
                className={
                  "rounded-lg px-2 py-0.5 text-[11px] font-semibold " +
                  (whole ? "bg-slate-800 text-white" : "border border-slate-300 bg-white text-slate-600")
                }
              >
                cả đoàn
              </button>
              {!whole && guests > 0 && (
                <span className="text-[11px] font-semibold text-emerald-700">
                  còn {picked.guestCount - guests} khách vẫn bay
                </span>
              )}
            </div>

            {/* Trạng thái VÉ lấy thẳng từ sổ booking — quầy đã tích 🎫 hay chưa */}
            {withCodes &&
              (picked.ticketIssued ? (
                <>
                  <div className="mt-1.5 text-[11px] font-semibold text-amber-800">
                    🎫 Đoàn này ĐÃ XUẤT VÉ — ghi mã vé thu hồi:
                  </div>
                  <TextInput
                    value={codes}
                    onChange={(e) => setCodes(e.target.value.toUpperCase())}
                    placeholder="MBL0005 MBL0006 (cùng đoàn ghi chung)"
                    autoCapitalize="characters"
                    spellCheck={false}
                    disabled={disabled}
                    className="mt-1 h-9 rounded-lg text-xs"
                  />
                </>
              ) : (
                <div className="mt-1.5 text-[11px] text-slate-500">
                  Đoàn này CHƯA XUẤT VÉ theo sổ — không có mã vé nào để thu hồi.
                </div>
              ))}

            {kind === "cancel" ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">Phí dịch vụ đã dùng</span>
                <span className="w-32">
                  <MoneyInput value={usedFee} onChange={setFee} />
                </span>
                <span className="text-xs font-semibold text-slate-700">Hoàn khách</span>
                <span className="w-36">
                  <MoneyInput value={refund} onChange={setRefund} />
                </span>
                <div className="flex h-8 overflow-hidden rounded-lg border border-slate-300">
                  {(
                    [
                      ["transfer", "CK"],
                      ["cash", "TM"],
                    ] as Array<["transfer" | "cash", string]>
                  ).map(([m, label]) => (
                    <button
                      key={m}
                      type="button"
                      disabled={disabled}
                      onClick={() => setRefundMethod(m)}
                      className={
                        refundMethod === m
                          ? "bg-emerald-600 px-2.5 text-xs font-bold text-white"
                          : "bg-white px-2.5 text-xs font-medium text-slate-500"
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <span className="w-full text-[11px] text-slate-500">
                  Khách đã trả {formatVND(picked.deposit)}
                  {usedFee > 0 ? ` − phí đã dùng ${formatVND(usedFee)}` : ""} → hoàn {formatVND(refund)}
                </span>
              </div>
            ) : (
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">Bay lại ngày</span>
                <input
                  type="date"
                  value={toDate}
                  min={shiftDateKey(date, 1)}
                  disabled={disabled}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-sm"
                />
              </div>
            )}

            <TextInput
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Lý do · VD: khách sợ độ cao, gió to…"
              disabled={disabled}
              className="mt-1.5 h-9 rounded-lg text-xs"
            />

            <Button type="button" className="mt-1.5 h-10 w-full" disabled={busy || disabled} onClick={submit}>
              {busy
                ? "Đang xử lý…"
                : kind === "cancel"
                  ? `✓ Xác nhận huỷ ${whole ? "cả đoàn" : `${guests} khách`}`
                  : `✓ Xác nhận dời ${whole ? "cả đoàn" : `${guests} khách`}`}
            </Button>
          </>
        )}
      </div>

      {/* ---- Danh sách đã khai: vẫn sửa tay được, và ghi được nhóm không có trong sổ ---- */}
      <details className="rounded-xl border border-slate-200 bg-white p-2">
        <summary className="cursor-pointer text-xs font-semibold text-slate-600">
          Danh sách khách huỷ ({cancelRows.filter((r) => r.name.trim() || r.guests > 0).length}) — bấm để sửa tay
        </summary>
        <div className="mt-2">
          <CancelGuestRows
            rows={cancelRows}
            onChange={onCancelRows}
            disabled={disabled}
            withCodes={withCodes}
            bookings={bookings}
          />
        </div>
      </details>

      <details className="rounded-xl border border-slate-200 bg-white p-2">
        <summary className="cursor-pointer text-xs font-semibold text-slate-600">
          Danh sách khách dời lịch ({moveRows.filter((r) => r.name.trim() || r.guests > 0).length}) — bấm để sửa tay
        </summary>
        <div className="mt-2">
          <RescheduleGuestRows
            rows={moveRows}
            onChange={onMoveRows}
            minDate={shiftDateKey(date, 1)}
            disabled={disabled}
            withCodes={withCodes}
            bookings={bookings}
          />
        </div>
      </details>
    </div>
  );
}
