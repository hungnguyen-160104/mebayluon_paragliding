// app/baocao/components/AddServicesCard.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import {
  COMBO_DISCOUNT,
  SERVICE_PRICE,
  SERVICE_PRICE_LABEL,
  comboDiscount,
} from "@/lib/baobay/flight-price";
import type { BookingDTO } from "@/lib/baobay/types";
import { formatVND } from "@/lib/pricing";

import { apiGet, apiPatch, apiPost } from "./client-api";
import { Banner, Button, CollapseCard, Field, MoneyInput, TextInput } from "./ui";

/** Bộ đếm nhỏ để 5 dịch vụ nằm gọn một hàng — CountInput thường quá cao. */
function MiniCount({ value, onChange, max }: { value: number; onChange: (v: number) => void; max: number }) {
  const clamp = (n: number) => Math.max(0, Math.min(max, Math.trunc(n) || 0));
  const btn =
    "h-7 w-6 shrink-0 rounded border border-slate-300 bg-white text-sm font-semibold text-slate-600 active:bg-slate-200 disabled:opacity-40";
  return (
    <span className="inline-flex items-center gap-0.5">
      <button type="button" className={btn} onClick={() => onChange(clamp(value - 1))} aria-label="Giảm 1">
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value.replace(/\D/g, ""))))}
        className="h-7 w-8 rounded border border-slate-300 bg-white text-center text-sm font-bold tabular-nums"
      />
      <button type="button" className={btn} disabled={value >= max} onClick={() => onChange(clamp(value + 1))} aria-label="Thêm 1">
        ＋
      </button>
    </span>
  );
}

type ServiceKey = "flycam" | "video360" | "redFlag" | "sunset" | "flagFlight";
const EMPTY: Record<ServiceKey, number> = { flycam: 0, video360: 0, redFlag: 0, sunset: 0, flagFlight: 0 };

/**
 * KHÁCH ĐĂNG KÝ THÊM DỊCH VỤ TẠI BÃI.
 *
 * Đứng ở bãi thấy người khác bay flycam rồi đòi mua thêm là chuyện xảy ra suốt.
 * Trước đây quầy phải vào sửa booking, tự cộng tiền, rồi sang thẻ khác thu —
 * ba bước, dễ quên bước cuối. Thẻ này gom cả ba: chọn khách, chọn dịch vụ, thu
 * tiền, xong.
 *
 * Tiền do MÁY TÍNH theo bảng giá và tính lại combo trên TỔNG sau khi cộng (khách
 * đã có flycam, mua thêm 360 là thành cặp, được bớt 100k) — nhưng số thu vẫn
 * sửa tay được, vì quầy đôi khi chốt giá khác với khách quen.
 */
export function AddServicesCard({ spot, date }: { spot: string; date: string }) {
  const [bookings, setBookings] = useState<BookingDTO[]>([]);
  /**
   * Cùng một thao tác "sửa dịch vụ của một booking", chỉ khác dấu cộng/trừ —
   * nên hai chế độ chung một thẻ, khỏi bắt người dùng nhớ hai chỗ.
   */
  const [mode, setMode] = useState<"add" | "remove">("add");
  /** Huỷ dịch vụ: tiền lùi lại trừ vào phần còn thu, hay trả lại khách. */
  const [backMode, setBackMode] = useState<"credit" | "refund">("credit");
  const [refundMethod, setRefundMethod] = useState<"cash" | "transfer">("transfer");
  const [bankAccount, setBankAccount] = useState("");
  const [pickId, setPickId] = useState("");
  const [add, setAdd] = useState<Record<ServiceKey, number>>({ ...EMPTY });
  const [discount, setDiscount] = useState(0);
  const [note, setNote] = useState("");
  /** Thu tiền ngay: tiền mặt + các bill chuyển khoản (mỗi bill một mã). */
  const [payNow, setPayNow] = useState(true);
  const [cash, setCash] = useState(0);
  const [bills, setBills] = useState<Array<{ amount: number; code: string }>>([{ amount: 0, code: "" }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!spot) return;
    apiGet<{ forDate: BookingDTO[] }>(`/api/baocao/booking?date=${date}&spot=${spot}`)
      .then((r) => setBookings(r.forDate.filter((b) => b.status === "open" || b.status === "done")))
      .catch(() => {
        /* ngày chưa có booking thì thôi */
      });
  }, [spot, date]);

  useEffect(() => {
    load();
  }, [load]);

  const picked = bookings.find((b) => b.id === pickId) ?? null;

  /** Tiền dịch vụ thêm, phần combo được bớt thêm, và số cuối cùng phải thu. */
  const addAmount = (Object.keys(SERVICE_PRICE) as ServiceKey[]).reduce(
    (t, k) => t + add[k] * SERVICE_PRICE[k],
    0,
  );
  const comboBefore = picked ? comboDiscount(picked.flycam, picked.video360) : 0;
  const comboAfter = picked ? comboDiscount(picked.flycam + add.flycam, picked.video360 + add.video360) : 0;
  const comboGain = Math.max(0, comboAfter - comboBefore);
  const charge = Math.max(0, addAmount - comboGain - discount);
  const payTotal = cash + bills.reduce((t, b) => t + (b.amount || 0), 0);

  /**
   * THÊM: trần là số khách còn trống (2 khách thì tối đa 2 flycam).
   * HUỶ : trần là số đã đăng ký — không huỷ nhiều hơn thứ khách đã mua.
   */
  const capOf = (k: ServiceKey) =>
    picked ? (mode === "add" ? Math.max(0, picked.guestCount - (picked[k] as number)) : (picked[k] as number)) : 0;

  /** Tiền lùi lại khi huỷ = tiền dịch vụ bỏ đi + phần combo tan rã theo. */
  const comboLost = picked
    ? Math.max(
        0,
        comboDiscount(picked.flycam, picked.video360) -
          comboDiscount(picked.flycam - add.flycam, picked.video360 - add.video360),
      )
    : 0;
  const backAmount = Math.max(0, addAmount - comboLost);

  function reset() {
    setAdd({ ...EMPTY });
    setDiscount(0);
    setNote("");
    setCash(0);
    setBills([{ amount: 0, code: "" }]);
    setError(null);
  }

  async function submitRemove() {
    if (!picked) return setError("Chọn khách đã đặt trước đã");
    if (backMode === "refund" && refundMethod === "transfer" && !bankAccount.trim()) {
      return setError("Hoàn chuyển khoản thì phải có số tài khoản của khách");
    }
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await apiPatch<{ back: number; refunded: number }>(
        `/api/baocao/booking/add-services?spot=${spot}`,
        { id: picked.id, remove: add, mode: backMode, refundMethod, bankAccount, reason: note },
      );
      setDone(
        `✓ Đã huỷ dịch vụ cho ${picked.contactName || "khách"} — lùi lại ${formatVND(res.back)}` +
          (res.refunded > 0
            ? `, hoàn khách ${formatVND(res.refunded)} ${refundMethod === "cash" ? "tiền mặt" : "(chờ kế toán chuyển)"}.`
            : " (trừ vào phần còn phải thu)."),
      );
      reset();
      setPickId("");
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không huỷ được dịch vụ");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (mode === "remove") return submitRemove();
    if (!picked) return setError("Chọn khách đã đặt trước đã");
    const used = bills.filter((b) => b.amount > 0);
    if (payNow && used.some((b) => !b.code.trim())) return setError("Mỗi bill chuyển khoản phải có mã giao dịch");
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await apiPost<{ charge: number; added: number }>(
        `/api/baocao/booking/add-services?spot=${spot}`,
        {
          id: picked.id,
          add,
          discount,
          note,
          ...(payNow && payTotal > 0 ? { pay: { cash, transfers: used } } : {}),
        },
      );
      setDone(
        `✓ Đã thêm ${res.added} dịch vụ cho ${picked.contactName || "khách"} — phải thu ${formatVND(res.charge)}` +
          (payNow && payTotal > 0 ? `, đã thu ${formatVND(payTotal)}.` : " (chưa thu, còn nợ trong booking)."),
      );
      reset();
      setPickId("");
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không ghi được đăng ký thêm");
    } finally {
      setBusy(false);
    }
  }

  return (
    <CollapseCard
      className="border-amber-300 bg-amber-50/30"
      title="➕➖ DỊCH VỤ TUỲ CHỌN"
      hint="khách mua thêm hoặc huỷ dịch vụ — cộng/trừ vào booking sẵn có rồi thu / hoàn tiền"
    >
      {done && (
        <Banner tone="success" onClose={() => setDone(null)}>
          {done}
        </Banner>
      )}
      {error && <Banner tone="error">{error}</Banner>}

      {/* Thêm hay huỷ dịch vụ — cùng một khung, chỉ khác dấu */}
      <div className="mb-1.5 flex h-9 overflow-hidden rounded-lg border border-slate-300">
        {(
          [
            ["add", "➕ Đăng ký thêm"],
            ["remove", "➖ Huỷ dịch vụ"],
          ] as Array<["add" | "remove", string]>
        ).map(([v, label]) => (
          <button
            key={v}
            type="button"
            onClick={() => {
              setMode(v);
              setAdd({ ...EMPTY });
              setError(null);
            }}
            className={
              mode === v
                ? "flex-1 bg-slate-800 text-xs font-bold text-white"
                : "flex-1 bg-white text-xs font-medium text-slate-500"
            }
          >
            {label}
          </button>
        ))}
      </div>

      <Field label="Khách đã đặt trước">
        <select
          value={pickId}
          onChange={(e) => {
            setPickId(e.target.value);
            reset();
          }}
          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm outline-none focus:border-sky-600"
        >
          <option value="">— chọn booking —</option>
          {bookings.map((b) => (
            <option key={b.id} value={b.id}>
              #{b.daySeq} {b.contactName || b.phone || "khách"} · {b.guestCount} khách
              {b.status === "done" ? " · đã bay" : ""}
              {b.remaining ? ` · còn thu ${Math.round(b.remaining / 1000).toLocaleString("vi-VN")}k` : ""}
            </option>
          ))}
        </select>
      </Field>

      {picked && (
        <>
          <p className="mt-1 text-[11px] leading-tight text-slate-500">
            Đang có:{" "}
            {SERVICE_PRICE_LABEL.filter((s) => (picked[s.key] as number) > 0)
              .map((s) => `${picked[s.key] as number}×${s.label}`)
              .join(" · ") || "chưa đăng ký dịch vụ nào"}
          </p>

          {/* 5 dịch vụ nằm một hàng ngang, bộ đếm nhỏ — cả thẻ gọn trong một màn */}
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1.5">
            {SERVICE_PRICE_LABEL.map((s) => (
              <label key={s.key} className="flex items-center gap-1 text-[11px] font-semibold text-slate-700">
                {s.label}
                <span className="font-normal text-slate-400">{(SERVICE_PRICE[s.key] / 1000).toLocaleString("vi-VN")}k</span>
                <MiniCount
                  value={add[s.key]}
                  onChange={(v) => setAdd((p) => ({ ...p, [s.key]: Math.min(v, capOf(s.key)) }))}
                  max={capOf(s.key)}
                />
              </label>
            ))}
          </div>

          {mode === "remove" ? (
            <>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs">
                <span className="text-slate-600">
                  Tiền dịch vụ huỷ <strong className="tabular-nums text-slate-900">{formatVND(addAmount)}</strong>
                </span>
                {/* Bỏ một nửa cặp thì ưu đãi combo tan theo — khách nhận lại ít hơn giá dịch vụ */}
                {comboLost > 0 && (
                  <span className="text-rose-700">
                    − mất ưu đãi combo <strong className="tabular-nums">{formatVND(comboLost)}</strong>
                  </span>
                )}
                <span className="ml-auto text-sm">
                  Lùi lại khách <strong className="tabular-nums text-emerald-700">{formatVND(backAmount)}</strong>
                </span>
              </div>

              <div className="mt-1.5 flex h-8 overflow-hidden rounded-lg border border-slate-300">
                {(
                  [
                    ["credit", "Trừ vào phần còn thu"],
                    ["refund", "Hoàn tiền khách"],
                  ] as Array<["credit" | "refund", string]>
                ).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setBackMode(v)}
                    className={
                      backMode === v
                        ? "flex-1 bg-emerald-600 text-xs font-bold text-white"
                        : "flex-1 bg-white text-xs font-medium text-slate-500"
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>

              {backMode === "refund" && (
                <div className="mt-1.5 flex flex-wrap items-center gap-2 rounded-lg border border-rose-200 bg-rose-50/60 p-2">
                  <span className="text-xs font-semibold text-slate-700">Hoàn bằng</span>
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
                  {refundMethod === "transfer" ? (
                    <TextInput
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      placeholder="Số TK khách nhận…"
                      className="h-8 min-w-40 flex-1 rounded-lg text-xs"
                    />
                  ) : (
                    <span className="text-[11px] text-slate-500">Bạn trả tại chỗ — trừ vào tiền bạn đang giữ.</span>
                  )}
                  <span className="w-full text-[11px] text-slate-500">
                    Khách đã trả {formatVND(picked.deposit)} → hoàn tối đa {formatVND(Math.min(backAmount, picked.deposit))}
                    {refundMethod === "transfer" ? " · lệnh hoàn sẽ chờ kế toán chuyển khoản" : ""}
                  </span>
                </div>
              )}
            </>
          ) : (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs">
            <span className="text-slate-600">
              Dịch vụ <strong className="tabular-nums text-slate-900">{formatVND(addAmount)}</strong>
            </span>
            {comboGain > 0 && (
              <span className="text-emerald-700">
                − combo {comboGain / COMBO_DISCOUNT} cặp{" "}
                <strong className="tabular-nums">{formatVND(comboGain)}</strong>
              </span>
            )}
            <label className="flex items-center gap-1 text-slate-600">
              − giảm trừ
              <span className="w-28">
                <MoneyInput value={discount} onChange={setDiscount} />
              </span>
            </label>
            <span className="ml-auto text-sm">
              Cần thu <strong className="tabular-nums text-rose-700">{formatVND(charge)}</strong>
            </span>
          </div>
          )}

          <TextInput
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú · VD: khách xin quay thêm cảnh hạ cánh"
            className="mt-1.5 h-9 rounded-lg text-xs"
          />

          {/* Thu tiền ngay tại chỗ — hoặc để nợ vào "còn thu" của booking */}
          {mode === "add" && (
          <div className="mt-1.5 flex h-8 overflow-hidden rounded-lg border border-slate-300">
            {(
              [
                [true, "Thu tiền luôn"],
                [false, "Ghi nợ vào booking"],
              ] as Array<[boolean, string]>
            ).map(([v, label]) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setPayNow(v);
                  if (v) setCash(charge);
                }}
                className={
                  payNow === v
                    ? "flex-1 bg-emerald-600 text-xs font-bold text-white"
                    : "flex-1 bg-white text-xs font-medium text-slate-500"
                }
              >
                {label}
              </button>
            ))}
          </div>

          )}

          {mode === "add" && payNow && (
            <div className="mt-1.5 space-y-1 rounded-xl border border-emerald-200 bg-emerald-50/60 p-2">
              <label className="flex items-center gap-1.5">
                <span className="w-8 shrink-0 text-xs font-bold text-emerald-800">TM</span>
                <span className="min-w-0 flex-1">
                  <MoneyInput value={cash} onChange={setCash} />
                </span>
              </label>
              {bills.map((b, i) => (
                <div key={i} className="space-y-1">
                  <label className="flex items-center gap-1.5">
                    <span className="w-8 shrink-0 text-xs font-bold text-indigo-800">
                      CK{bills.length > 1 ? ` ${i + 1}` : ""}
                    </span>
                    <span className="min-w-0 flex-1">
                      <MoneyInput
                        value={b.amount}
                        onChange={(v) => setBills((p) => p.map((x, k) => (k === i ? { ...x, amount: v } : x)))}
                      />
                    </span>
                    {bills.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setBills((p) => p.filter((_, k) => k !== i))}
                        className="h-8 w-7 shrink-0 rounded-lg border border-slate-300 bg-white text-slate-400 hover:text-rose-600"
                        aria-label="Bỏ bill này"
                      >
                        ×
                      </button>
                    )}
                  </label>
                  {b.amount > 0 && (
                    <TextInput
                      value={b.code}
                      onChange={(e) => setBills((p) => p.map((x, k) => (k === i ? { ...x, code: e.target.value } : x)))}
                      placeholder="Mã giao dịch…"
                      className="h-8 rounded-lg text-xs"
                    />
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setBills((p) => [...p, { amount: Math.max(0, charge - payTotal), code: "" }])}
                className="w-full rounded-lg border border-dashed border-indigo-300 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50"
              >
                ＋ Chia bill CK
              </button>
              <div className="flex justify-between border-t border-emerald-200 pt-1 text-xs">
                <span className="font-semibold text-slate-700">Tổng thu</span>
                <strong className={"tabular-nums " + (payTotal === charge ? "text-emerald-700" : "text-amber-700")}>
                  {formatVND(payTotal)}
                  {payTotal !== charge ? ` (cần ${formatVND(charge)})` : ""}
                </strong>
              </div>
              <p className="text-[10px] leading-tight text-slate-500">
                TM cộng vào tiền bạn đang giữ · CK vào thẳng TK công ty.
              </p>
            </div>
          )}

          <Button type="button" className="mt-1.5 h-10 w-full" disabled={busy} onClick={submit}>
            {busy
              ? "Đang lưu…"
              : mode === "remove"
                ? backMode === "refund"
                  ? "✓ Huỷ dịch vụ & hoàn tiền"
                  : "✓ Huỷ dịch vụ & trừ vào còn thu"
                : payNow
                  ? "✓ Xác nhận & thu tiền"
                  : "✓ Xác nhận (ghi nợ)"}
          </Button>
        </>
      )}
    </CollapseCard>
  );
}
