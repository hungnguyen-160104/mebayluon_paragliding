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

import { apiGet, apiPost } from "./client-api";
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

  /** Số khách của booking là trần: 2 khách thì tối đa 2 flycam, 2 cam360… */
  const capOf = (k: ServiceKey) => (picked ? Math.max(0, picked.guestCount - (picked[k] as number)) : 0);

  function reset() {
    setAdd({ ...EMPTY });
    setDiscount(0);
    setNote("");
    setCash(0);
    setBills([{ amount: 0, code: "" }]);
    setError(null);
  }

  async function submit() {
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
      title="➕ ĐĂNG KÝ THÊM"
      hint="khách mua thêm dịch vụ tại bãi — cộng vào booking sẵn có rồi thu tiền"
    >
      {done && (
        <Banner tone="success" onClose={() => setDone(null)}>
          {done}
        </Banner>
      )}
      {error && <Banner tone="error">{error}</Banner>}

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

          <TextInput
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú · VD: khách xin quay thêm cảnh hạ cánh"
            className="mt-1.5 h-9 rounded-lg text-xs"
          />

          {/* Thu tiền ngay tại chỗ — hoặc để nợ vào "còn thu" của booking */}
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

          {payNow && (
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
            {busy ? "Đang lưu…" : payNow ? "✓ Xác nhận & thu tiền" : "✓ Xác nhận (ghi nợ)"}
          </Button>
        </>
      )}
    </CollapseCard>
  );
}
