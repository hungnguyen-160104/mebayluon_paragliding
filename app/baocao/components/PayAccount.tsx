// app/baocao/components/PayAccount.tsx
"use client";

import { useState } from "react";

import {
  PAY_ACCOUNT_LABEL,
  PAY_ACCOUNT_SOURCE_LABEL,
  payAccountOf,
  payAccountSpotEnabled,
  type PayAccountKind,
} from "@/lib/baobay/pay-account";
import type { BookingDTO } from "@/lib/baobay/types";

import { apiPatch, apiPost } from "./client-api";

/**
 * TÀI KHOẢN NHẬN TIỀN của booking trên giao diện nhân sự (chủ 04/10/2026).
 * Luật chọn: lib/baobay/pay-account.ts.
 */

/**
 * NHÃN ĐỎ "TKCT" — booking chuyển khoản vào TK CÔNG TY (MB 168858888).
 * Chỉ trên màn hình nhân sự; ảnh/phiếu gửi khách KHÔNG in nhãn này (khách chỉ
 * cần mã QR đúng tài khoản).
 */
export function TkctBadge({
  b,
  className,
}: {
  b: { payAccount?: string | null } | null | undefined;
  className?: string;
}) {
  if (payAccountOf(b) !== "company") return null;
  return (
    <strong
      className={
        "inline-block rounded bg-red-600 px-1.5 align-middle text-[11px] font-extrabold leading-[1.35] tracking-wide text-white " +
        (className ?? "mr-1")
      }
      title="Khách chuyển khoản vào TK CÔNG TY — MB 168858888 (CN Tây Bắc - CTCP DL và TT Viên Nam). Kế toán xuất VAT cuối ngày."
    >
      TKCT
    </strong>
  );
}

/** Thông tin mã QR cần cho một booking: tài khoản đã chốt, hoặc phải hỏi máy chủ lúc mở. */
export type QrPayRef = {
  account?: PayAccountKind;
  /** Có id = booking còn chờ máy chọn tài khoản — mở QR thì hỏi máy chủ trước. */
  ensure?: { id: string; spot: string };
};

export function qrPayRef(
  b: { id: string; spot?: string; payAccount?: string | null; payAccountPending?: boolean } | null | undefined,
  spot?: string,
): QrPayRef {
  if (!b) return {};
  return {
    account: b.payAccount === "company" || b.payAccount === "personal" ? b.payAccount : undefined,
    ensure: b.payAccountPending && b.id ? { id: b.id, spot: b.spot || spot || "" } : undefined,
  };
}

/** Hỏi máy chủ chốt tài khoản (một lần) — lỗi thì rơi về TK cá nhân như trước, không chặn việc thu tiền. */
export async function ensurePayAccountClient(ref: QrPayRef): Promise<PayAccountKind> {
  if (!ref.ensure) return ref.account ?? "personal";
  try {
    const r = await apiPost<{ payAccount: PayAccountKind }>(
      `/api/baocao/booking/pay-account?spot=${encodeURIComponent(ref.ensure.spot)}`,
      { id: ref.ensure.id },
    );
    return r.payAccount === "company" ? "company" : "personal";
  } catch {
    return ref.account ?? "personal";
  }
}

/**
 * Ô "TK nhận tiền" trong phiếu chi tiết booking: hiện tài khoản đang dùng +
 * nút đổi tay (ghi người + lý do vào lịch sử booking).
 */
export function PayAccountControl({
  spot,
  booking,
  canEdit = true,
  onChanged,
}: {
  spot: string;
  booking: BookingDTO;
  canEdit?: boolean;
  onChanged?: (b: BookingDTO) => void;
}) {
  const [b, setB] = useState(booking);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const acc = payAccountOf(b);
  const enabled = payAccountSpotEnabled(b.spot || spot);
  if (!enabled && acc !== "company") return <span className="text-slate-500">{PAY_ACCOUNT_LABEL.personal}</span>;

  async function flip() {
    const to: PayAccountKind = acc === "company" ? "personal" : "company";
    const reason = window.prompt(
      `Đổi tài khoản nhận tiền sang ${PAY_ACCOUNT_LABEL[to]}?\n\nKhoản đã chuyển khoản trước đó vẫn ghi đúng tài khoản cũ; mã QR từ giờ theo tài khoản mới.\nLý do (bắt buộc):`,
    );
    if (reason === null) return;
    if (!reason.trim()) return setErr("Phải ghi lý do đổi tài khoản");
    setBusy(true);
    setErr(null);
    try {
      const r = await apiPatch<{ booking: BookingDTO }>(`/api/baocao/booking/pay-account?spot=${encodeURIComponent(b.spot || spot)}`, {
        id: b.id,
        account: to,
        reason: reason.trim(),
      });
      setB(r.booking);
      onChanged?.(r.booking);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Không đổi được");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="flex flex-wrap items-center gap-1">
      <TkctBadge b={b} className="mr-0" />
      <span className="font-medium">{PAY_ACCOUNT_LABEL[acc]}</span>
      {b.payAccountSource && (
        <span className="text-[11px] text-slate-500">
          · {PAY_ACCOUNT_SOURCE_LABEL[b.payAccountSource]}
          {b.payAccountSource === "manual" && b.payAccountBy ? ` (${b.payAccountBy})` : ""}
        </span>
      )}
      {!b.payAccount && b.payAccountPending && <span className="text-[11px] text-slate-500">· máy chọn khi đưa QR lần đầu</span>}
      {canEdit && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void flip()}
          className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {busy ? "Đang đổi…" : acc === "company" ? "↺ Đổi sang TK cá nhân" : "↺ Đổi sang TKCT"}
        </button>
      )}
      {err && <span className="w-full text-[11px] font-semibold text-rose-700">{err}</span>}
    </span>
  );
}

/** Phần doanh thu TK công ty của một ngày bay — xem services/pay-account.service.ts (RevenueShareDTO). */
export type RevenueShare = {
  flightDate: string;
  companyValue: number;
  decidedValue: number;
  share: number | null;
  companyBookings: number;
  decidedBookings: number;
  target: number;
  low: number;
  high: number;
};

/**
 * "TK công ty: x đ / y đ = z%" — chủ nhìn là biết máy cân 30% DOANH THU của
 * ngày bay tới đâu. Xanh khi nằm trong dải (25–35%), đỏ khi lệch.
 */
export function RevenueShareLine({ s, className }: { s: RevenueShare | null | undefined; className?: string }) {
  if (!s) return null;
  const vnd = (n: number) => `${Math.round(n).toLocaleString("vi-VN")} đ`;
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const inBand = s.share !== null && s.share >= s.low && s.share <= s.high;
  return (
    <div
      className={
        "rounded-lg border px-2.5 py-1.5 text-xs leading-snug " +
        (s.share === null ? "border-slate-200 bg-slate-50 text-slate-600" : inBand ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-red-300 bg-red-50 text-red-900") +
        " " +
        (className ?? "")
      }
      title={`Mục tiêu ${pct(s.target)} doanh thu chuyển khoản (dải ${pct(s.low)}–${pct(s.high)}) — tính trên booking Khau Phạ bay ngày này, không tính OTA`}
    >
      <strong>Ngày bay {s.flightDate.split("-").reverse().slice(0, 2).join("/")} — TK công ty: </strong>
      {s.share === null ? (
        "chưa có booking nào thuộc diện"
      ) : (
        <>
          <span className="tabular-nums">
            {vnd(s.companyValue)} / {vnd(s.decidedValue)} = <strong>{pct(s.share)}</strong>
          </span>{" "}
          <span className="opacity-75">
            ({s.companyBookings}/{s.decidedBookings} booking · mục tiêu {pct(s.target)}, dải {pct(s.low)}–{pct(s.high)})
          </span>
        </>
      )}
    </div>
  );
}
