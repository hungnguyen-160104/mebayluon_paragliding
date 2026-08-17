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
import { PaymentQrButton } from "./PaymentQr";
import { Banner, Button, DoneTag, MoneyInput, TextInput, useDoneFlag } from "./ui";

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
  cancelled = [],
  movedOut = [],
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
  /** Khách ĐÃ huỷ trong sổ booking của ngày — liệt kê để soát, không phải để nhập lại. */
  cancelled?: BookingPick[];
  /** Khách ĐÃ dời khỏi ngày này (sang ngày khác). */
  movedOut?: BookingPick[];
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
  /** Khách đã dùng NHỮNG GÌ — ghi ra để sau còn giải thích vì sao thu/hoàn thế. */
  const [usedServices, setUsedServices] = useState("");
  const [refundMethod, setRefundMethod] = useState<"cash" | "transfer">("transfer");
  /** Hoàn qua chuyển khoản thì phải có số tài khoản khách nhận. */
  const [bankAccount, setBankAccount] = useState("");
  /**
   * DỜI LỊCH cũng phát sinh phí (xe đã chạy, flycam đã quay) nhưng KHÔNG hoàn —
   * khách phải trả thêm phần đó. Thu ngay như mọi khoản thu khác: TM vào tiền
   * người trực đang giữ, CK vào TK công ty kèm mã giao dịch.
   */
  const [feeCash, setFeeCash] = useState(0);
  const [feeTransfer, setFeeTransfer] = useState(0);
  const [feeCode, setFeeCode] = useState("");
  const [toDate, setToDate] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [justDone, flashDone] = useDoneFlag();

  const picked = bookings.find((b) => b.id === pickId) ?? null;
  const whole = picked ? guests >= picked.guestCount : false;
  /** Dòng nào đang mở bảng chi tiết để sửa. */
  const [editing, setEditing] = useState<{ kind: "cancel" | "move"; index: number } | null>(null);
  /** Chỉ liệt kê dòng ĐÃ CÓ SỐ LIỆU — dòng trống mặc định không tính. */
  const usedCancel = cancelRows.map((row, i) => ({ row, i })).filter((x) => x.row.name.trim() || x.row.guests > 0);
  const usedMove = moveRows.map((row, i) => ({ row, i })).filter((x) => x.row.name.trim() || x.row.guests > 0);

  function pick(id: string) {
    setPickId(id);
    const b = bookings.find((x) => x.id === id);
    setGuests(b?.guestCount ?? 0);
    // Mặc định hoàn ĐÚNG SỐ KHÁCH ĐÃ TRẢ; trừ phí dịch vụ đã dùng thì gõ ô dưới
    setRefund(b?.deposit ?? 0);
    setUsedFee(0);
    setUsedServices("");
    setBankAccount("");
    setFeeCash(0);
    setFeeTransfer(0);
    setFeeCode("");
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
    setUsedServices("");
    setBankAccount("");
    setFeeCash(0);
    setFeeTransfer(0);
    setFeeCode("");
    setToDate("");
    setNote("");
  }

  async function submit() {
    if (!picked) return setError("Chọn đoàn khách trước");
    if (guests <= 0) return setError("Số khách phải lớn hơn 0");
    if (guests > picked.guestCount) return setError(`Đoàn này chỉ có ${picked.guestCount} khách`);
    if (kind === "move" && !toDate) return setError("Chọn ngày bay mới");
    if (kind === "cancel" && refund > 0 && refundMethod === "transfer" && !bankAccount.trim()) {
      return setError("Hoàn chuyển khoản thì phải có số tài khoản của khách");
    }
    if (kind === "move" && feeTransfer > 0 && !feeCode.trim()) {
      return setError("Thu phí bằng chuyển khoản phải ghi mã giao dịch");
    }
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
                usedServices,
                usedFee,
                bankAccount,
                note,
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
            ? {
                ticketIssued: Boolean(withCodes && picked.ticketIssued),
                ticketCodesText: codes,
                refund,
                refundMethod,
                usedServices,
                usedFee,
                bankAccount,
              }
            : { toDate }),
        });
      }

      /** Dời lịch có phí phát sinh: thu luôn vào booking (khách trả, không hoàn). */
      if (kind === "move" && feeCash + feeTransfer > 0) {
        await apiPatch(`/api/baocao/booking?spot=${spot}`, {
          id: picked.id,
          action: "collect",
          kind: "deposit",
          cash: feeCash,
          transfers: feeTransfer > 0 ? [{ amount: feeTransfer, code: feeCode }] : [],
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
          : `✓ Đã dời ${whole ? "cả đoàn" : `${guests}/${picked.guestCount} khách`} — ${name} sang ${formatDateKeyVN(toDate)}` +
            (feeCash + feeTransfer > 0 ? `, thu phí phát sinh ${formatVND(feeCash + feeTransfer)}.` : "."),
      );
      reset();
      flashDone();
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

            {/* Khách đã dùng gì — dùng cho cả huỷ (trừ vào hoàn) lẫn dời (khách trả thêm) */}
            <TextInput
              value={usedServices}
              onChange={(e) => setUsedServices(e.target.value)}
              placeholder="Dịch vụ đã dùng · VD: xe đón 2 chiều, đã quay flycam 1 khách"
              disabled={disabled}
              className="mt-1.5 h-9 rounded-lg text-xs"
            />

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
                <span className="flex w-full flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  Khách đã trả {formatVND(picked.deposit)}
                  {usedFee > 0 ? ` − phí đã dùng ${formatVND(usedFee)}` : ""} → hoàn {formatVND(refund)}
                  {/* Khách chưa trả đủ mà còn nợ phí đã dùng: đưa QR cho khách trả nốt */}
                  {usedFee > picked.deposit && (
                    <PaymentQrButton
                      amount={usedFee - picked.deposit}
                      note={picked.bookingCode || picked.phone || ""}
                      purpose={`Phí dịch vụ đã dùng — ${picked.contactName || "khách"}`}
                      label={`QR thu ${formatVND(usedFee - picked.deposit)}`}
                    />
                  )}
                </span>
                {refund > 0 && refundMethod === "transfer" && (
                  <>
                    <TextInput
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      placeholder="Số TK khách nhận · số TK – ngân hàng – tên chủ TK"
                      disabled={disabled}
                      className="h-9 w-full rounded-lg text-xs"
                    />
                    <span className="w-full text-[11px] font-medium text-rose-700">
                      Lệnh hoàn sẽ nhảy sang trang KẾ TOÁN để chuyển khoản và xác nhận.
                    </span>
                  </>
                )}
                {refund > 0 && refundMethod === "cash" && (
                  <span className="w-full text-[11px] text-slate-500">
                    Bạn trả tiền mặt tại chỗ — số này trừ vào tiền bạn đang giữ.
                  </span>
                )}
              </div>
            ) : (
              <>
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
                {/* Dời lịch KHÔNG hoàn tiền, nhưng phí đã phát sinh thì khách trả */}
                <div className="mt-1.5 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2">
                  <div className="text-[11px] font-semibold text-emerald-900">
                    Phí đã phát sinh — khách trả thêm (bỏ trống nếu không thu)
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-emerald-800">TM</span>
                    <span className="w-28">
                      <MoneyInput value={feeCash} onChange={setFeeCash} />
                    </span>
                    <span className="text-xs font-bold text-indigo-800">CK</span>
                    <span className="w-28">
                      <MoneyInput value={feeTransfer} onChange={setFeeTransfer} />
                    </span>
                    {feeTransfer > 0 && (
                      <TextInput
                        value={feeCode}
                        onChange={(e) => setFeeCode(e.target.value)}
                        placeholder="Mã giao dịch"
                        disabled={disabled}
                        className="h-8 w-36 rounded-lg text-xs"
                      />
                    )}
                    {feeCash + feeTransfer > 0 && (
                      <span className="text-[11px] font-semibold text-emerald-800">
                        thu {formatVND(feeCash + feeTransfer)}
                      </span>
                    )}
                    {/* Khách trả phí dời lịch từ xa: gửi mã QR qua Zalo cho tiện */}
                    <PaymentQrButton
                      amount={feeCash + feeTransfer}
                      note={picked?.bookingCode || picked?.phone || ""}
                      purpose={`Phí dời lịch — ${picked?.contactName || "khách"}`}
                    />
                  </div>
                </div>
              </>
            )}

            <TextInput
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Lý do · VD: khách sợ độ cao, gió to…"
              disabled={disabled}
              className="mt-1.5 h-9 rounded-lg text-xs"
            />

            <div className="mt-1.5 flex items-center gap-2">
              <Button type="button" className="h-10 flex-1" disabled={busy || disabled} onClick={submit}>
                {busy
                  ? "Đang xử lý…"
                  : kind === "cancel"
                    ? `✓ Xác nhận huỷ ${whole ? "cả đoàn" : `${guests} khách`}`
                    : `✓ Xác nhận dời ${whole ? "cả đoàn" : `${guests} khách`}`}
              </Button>
              {/* Dấu xong ngay cạnh nút — xác nhận huỷ/dời là việc không ai muốn bấm hai lần */}
              <DoneTag show={justDone}>Đã xác nhận</DoneTag>
            </div>
          </>
        )}
      </div>

      {/**
       * DANH SÁCH KHÁCH ĐÃ HUỶ / ĐÃ DỜI theo SỔ BOOKING.
       *
       * Khác với "Đã khai trong ngày" bên dưới (là mấy dòng chính người này vừa
       * gõ vào báo cáo): đây là sự thật trong sổ, gồm cả khách do người khác huỷ
       * hoặc huỷ ngay trên dòng booking. Không có danh sách này thì lúc chốt phải
       * mở lại cả trang booking để dò xem hôm nay ai huỷ, ai dời.
       */}
      {(cancelled.length > 0 || movedOut.length > 0) && (
        <div className="rounded-xl border-2 border-slate-300 bg-white p-2">
          <div className="text-xs font-bold text-slate-800">
            Trong sổ booking hôm nay: {cancelled.length} khách huỷ · {movedOut.length} khách dời
          </div>
          <ul className="mt-1 divide-y divide-slate-100">
            {cancelled.map((b) => (
              <li key={`c-${b.id}`} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1 text-xs">
                <span className="shrink-0 rounded bg-rose-100 px-1.5 py-0.5 font-bold text-rose-900">huỷ</span>
                <span className="min-w-0 flex-1 leading-snug text-slate-700">
                  #{b.daySeq} <strong>{b.contactName || b.phone || "khách"}</strong> · {b.guestCount} khách
                  {b.source ? ` · ${b.source}` : ""}
                  {(b.cancelTicketCodes ?? []).length ? ` · thu hồi ${(b.cancelTicketCodes ?? []).join(" ")}` : ""}
                  {b.cancelledBy ? <span className="text-slate-400"> — {b.cancelledBy}</span> : null}
                </span>
                {(b.refundAmount ?? 0) > 0 ? (
                  <strong className="shrink-0 tabular-nums text-rose-700">
                    hoàn {formatVND(b.refundAmount ?? 0)} {b.refundMethod === "cash" ? "TM" : "CK"}
                  </strong>
                ) : (
                  <span className="shrink-0 text-slate-400">không hoàn</span>
                )}
              </li>
            ))}
            {movedOut.map((b) => (
              <li key={`m-${b.id}`} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1 text-xs">
                <span className="shrink-0 rounded bg-indigo-100 px-1.5 py-0.5 font-bold text-indigo-900">dời</span>
                <span className="min-w-0 flex-1 leading-snug text-slate-700">
                  <strong>{b.contactName || b.phone || "khách"}</strong> · {b.guestCount} khách → bay{" "}
                  {b.flightDate ? formatDateKeyVN(b.flightDate) : "?"}
                  {(b.remaining ?? 0) > 0 ? ` · còn thu ${formatVND(b.remaining ?? 0)}` : ""}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[11px] leading-tight text-slate-500">
            Đây là số THẬT trong sổ. Muốn đưa vào báo cáo ngày thì khai bên trên (chọn booking → xác nhận).
          </p>
        </div>
      )}

      {/* ---- ĐÃ KHAI TRONG NGÀY: chỉ liệt kê một dòng, bấm Sửa mới mở bảng chi tiết ---- */}
      {(usedCancel.length > 0 || usedMove.length > 0) && (
        <div className="rounded-xl border border-slate-200 bg-white p-2">
          <div className="text-xs font-bold text-slate-700">Đã khai trong ngày</div>
          <ul className="mt-1 divide-y divide-slate-100">
            {usedCancel.map((r) => (
              <li key={`c-${r.i}`} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1 text-xs">
                <span className="shrink-0 rounded bg-rose-100 px-1.5 py-0.5 font-bold text-rose-900">huỷ</span>
                <span className="min-w-0 flex-1 truncate text-slate-700">
                  {r.row.name || "khách"} · {r.row.guests} khách
                  {r.row.refund ? ` · hoàn ${formatVND(r.row.refund)} ${r.row.refundMethod === "cash" ? "TM" : "CK"}` : ""}
                  {r.row.usedFee ? ` · trừ phí ${formatVND(r.row.usedFee)}` : ""}
                  {r.row.codesText ? ` · vé ${r.row.codesText}` : ""}
                  {r.row.note ? ` · ${r.row.note}` : ""}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-7 shrink-0 bg-white px-2 text-[11px]"
                  disabled={disabled}
                  onClick={() => setEditing({ kind: "cancel", index: r.i })}
                >
                  ✎ Sửa
                </Button>
              </li>
            ))}
            {usedMove.map((r) => (
              <li key={`m-${r.i}`} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1 text-xs">
                <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 font-bold text-amber-900">dời</span>
                <span className="min-w-0 flex-1 truncate text-slate-700">
                  {r.row.name || "khách"} · {r.row.guests} khách
                  {r.row.toDate ? ` → ${formatDateKeyVN(r.row.toDate)}` : ""}
                  {r.row.codesText ? ` · vé ${r.row.codesText}` : ""}
                  {r.row.note ? ` · ${r.row.note}` : ""}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-7 shrink-0 bg-white px-2 text-[11px]"
                  disabled={disabled}
                  onClick={() => setEditing({ kind: "move", index: r.i })}
                >
                  ✎ Sửa
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Bấm Sửa mới hiện bảng chi tiết của ĐÚNG dòng đó — khỏi cuộn qua cả danh sách */}
      {editing && (
        <div className="rounded-xl border-2 border-sky-300 bg-sky-50/40 p-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-bold text-sky-900">
              Sửa chi tiết — khách {editing.kind === "cancel" ? "huỷ" : "dời lịch"}
            </span>
            <Button
              type="button"
              variant="ghost"
              className="h-7 bg-white px-2 text-[11px]"
              onClick={() => setEditing(null)}
            >
              ✓ Xong
            </Button>
          </div>
          {editing.kind === "cancel" ? (
            <CancelGuestRows
              rows={[cancelRows[editing.index]]}
              onChange={(rows) => onCancelRows(cancelRows.map((r, i) => (i === editing.index ? rows[0] : r)))}
              disabled={disabled}
              withCodes={withCodes}
              bookings={bookings}
            />
          ) : (
            <RescheduleGuestRows
              rows={[moveRows[editing.index]]}
              onChange={(rows) => onMoveRows(moveRows.map((r, i) => (i === editing.index ? rows[0] : r)))}
              minDate={shiftDateKey(date, 1)}
              disabled={disabled}
              withCodes={withCodes}
              bookings={bookings}
            />
          )}
        </div>
      )}
    </div>
  );
}
