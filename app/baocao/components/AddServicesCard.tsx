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
import type { ServiceChangeDTO } from "@/services/baobay.service";
import { formatVND } from "@/lib/pricing";

import { apiDelete, apiGet, apiPatch, apiPost } from "./client-api";
import { PaymentQrButton } from "./PaymentQr";
import { Banner, Button, CollapseCard, DoneTag, Field, MoneyInput, TextInput, useDoneFlag } from "./ui";

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
  /** Sổ các lần thêm/huỷ trong ngày — bấm vào một dòng là sửa lại được. */
  const [changes, setChanges] = useState<ServiceChangeDTO[]>([]);
  /** Mọi booking của ngày (kể cả đã huỷ) — để đọc lại các lần sửa dịch vụ CŨ ghi trong ghi chú. */
  const [dayAll, setDayAll] = useState<BookingDTO[]>([]);
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
  const [justDone, flashDone] = useDoneFlag();
  /** Tiền lùi lại và tiền hoàn khi huỷ dịch vụ: bám theo số máy tính cho tới khi tự gõ. */
  const [backAmount, setBackAmount] = useState(0);
  const [backTouched, setBackTouched] = useState(false);
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundTouched, setRefundTouched] = useState(false);

  const load = useCallback(() => {
    if (!spot) return;
    apiGet<{ forDate: BookingDTO[] }>(`/api/baocao/booking?date=${date}&spot=${spot}`)
      .then((r) => {
        setBookings(r.forDate.filter((b) => b.status === "open" || b.status === "done"));
        setDayAll(r.forDate);
      })
      .catch(() => {
        /* ngày chưa có booking thì thôi */
      });
    apiGet<{ items: ServiceChangeDTO[] }>(`/api/baocao/booking/service-changes?date=${date}&spot=${spot}`)
      .then((r) => setChanges(r.items))
      .catch(() => {
        /* chưa có thao tác nào thì thôi */
      });
  }, [spot, date]);

  /**
   * Bấm "Sửa" một thao tác đã ghi = HOÀN TÁC nó rồi nạp lại đúng các số vào form
   * để nhập lại. Sửa thẳng lên booking đã bị thao tác đó làm đổi tiền là cách
   * chắc chắn sai — hoàn tác về ảnh chụp rồi làm lại mới khớp sổ.
   */
  const editChange = useCallback(
    async (c: ServiceChangeDTO, prefill: boolean) => {
      if (
        !window.confirm(
          prefill
            ? "Hoàn tác thao tác này rồi nạp lại số cũ vào form để sửa?"
            : "Bỏ hẳn thao tác này — số của booking trả về như trước khi làm?",
        )
      )
        return;
      setBusy(true);
      setError(null);
      try {
        await apiDelete(`/api/baocao/booking/service-changes?id=${c.id}&spot=${spot}`);
        if (prefill) {
          setMode(c.kind);
          setPickId(c.bookingId);
          setAdd({ ...EMPTY, ...c.items });
          setDiscount(c.discount);
          setNote(c.reason);
          if (c.kind === "remove") {
            setBackMode(c.mode === "refund" ? "refund" : "credit");
            setRefundMethod(c.refundMethod === "cash" ? "cash" : "transfer");
            setBackTouched(true);
            setBackAmount(c.back);
            setRefundTouched(true);
            setRefundAmount(c.refunded);
          }
          setDone("Đã hoàn tác — sửa lại số bên trên rồi bấm xác nhận.");
        } else {
          setDone("Đã bỏ thao tác — số của booking trả về như trước.");
        }
        load();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Không hoàn tác được");
      } finally {
        setBusy(false);
      }
    },
    [spot, load],
  );

  useEffect(() => {
    load();
  }, [load]);

  const picked = bookings.find((b) => b.id === pickId) ?? null;

  /**
   * CÁC LẦN SỬA DỊCH VỤ CŨ — đọc lại từ GHI CHÚ của booking.
   *
   * Sổ thao tác (có nút Sửa/Bỏ) chỉ ghi từ lúc có tính năng đó; những lần thêm
   * hoặc huỷ dịch vụ trước đó chỉ còn một dòng chữ trong ghi chú booking. Không
   * đọc chỗ này thì thẻ trông như "hôm nay không ai sửa dịch vụ" — trong khi
   * ngày 16/08 có khách huỷ cả dù cờ đỏ lẫn camera 360.
   *
   * Chỉ LIỆT KÊ, không có nút sửa: không có ảnh chụp trước-khi-sửa nên không hoàn
   * tác được, chỉ dùng để soát.
   */
  const legacy = dayAll.flatMap((b) =>
    (b.note ?? "")
      .split("·")
      .map((x) => x.trim())
      .filter((x) => /^(đăng ký thêm|huỷ dịch vụ):/i.test(x))
      .map((text) => ({
        id: `${b.id}-${text.slice(0, 24)}`,
        kind: /^huỷ/i.test(text) ? ("remove" as const) : ("add" as const),
        label: `#${b.daySeq} ${b.contactName || b.phone || "khách"}`,
        text,
      })),
  );

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
  /**
   * Huỷ dịch vụ hầu như luôn là lỗi bên mình, nên phần ưu đãi combo mất đi được
   * CHIA ĐÔI: khách chịu một nửa, công ty chịu một nửa. Bỏ 1 camera 360 (400k)
   * trong combo ⇒ khách nhận lại 350k chứ không phải 300k.
   */
  const comboCourtesy = Math.round(comboLost / 2);
  /** Số máy tính ra theo bảng giá — làm mặc định cho ô "lùi lại khách". */
  const autoBack = Math.max(0, addAmount - (comboLost - comboCourtesy));

  /** Chưa gõ tay thì hai ô tiền chạy theo số máy tính, gõ rồi thì để yên. */
  useEffect(() => {
    if (!backTouched) setBackAmount(autoBack);
  }, [autoBack, backTouched]);
  useEffect(() => {
    if (!refundTouched) setRefundAmount(backAmount);
  }, [backAmount, refundTouched]);

  function reset() {
    setAdd({ ...EMPTY });
    setDiscount(0);
    setNote("");
    setCash(0);
    setBills([{ amount: 0, code: "" }]);
    setBackAmount(0);
    setBackTouched(false);
    setRefundAmount(0);
    setRefundTouched(false);
    setError(null);
  }

  async function submitRemove() {
    if (!picked) return setError("Chọn khách đã đặt trước đã");
    if (backMode === "refund" && refundMethod === "transfer" && !bankAccount.trim()) {
      return setError("Hoàn chuyển khoản thì phải có số tài khoản của khách");
    }
    if (backMode === "refund" && refundAmount > picked.deposit) {
      return setError(
        `Khách mới trả ${formatVND(picked.deposit)} — không hoàn được ${formatVND(refundAmount)}`,
      );
    }
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await apiPatch<{ back: number; refunded: number }>(
        `/api/baocao/booking/add-services?spot=${spot}`,
        {
          id: picked.id,
          remove: add,
          mode: backMode,
          refundMethod,
          bankAccount,
          reason: note,
          backAmount,
          ...(backMode === "refund" ? { refundAmount } : {}),
        },
      );
      setDone(
        `✓ Đã huỷ dịch vụ cho ${picked.contactName || "khách"} — lùi lại ${formatVND(res.back)}` +
          (res.refunded > 0
            ? `, hoàn khách ${formatVND(res.refunded)} ${refundMethod === "cash" ? "tiền mặt" : "(chờ kế toán chuyển)"}.`
            : " (trừ vào phần còn phải thu)."),
      );
      flashDone();
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
      flashDone();
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
      /* Nền đổi màu theo việc đang làm: THÊM dịch vụ nền xanh, HUỶ nền đỏ —
         nhìn màu là biết mình đang cộng hay đang trừ, khỏi bấm nhầm chiều. */
      className={mode === "remove" ? "border-rose-400 bg-rose-50/60" : "border-emerald-400 bg-emerald-50/50"}
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
                ? `flex-1 text-xs font-bold text-white ${v === "remove" ? "bg-rose-600" : "bg-emerald-600"}`
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
          {/* Khách bay rồi mới biết flycam hỏng, thẻ nhớ lỗi… nên vẫn huỷ được
              dịch vụ, chỉ khoá khi kế toán đã chốt ngày. */}
          {picked.status === "done" && mode === "remove" && (
            <p className="mt-1 text-[11px] font-medium leading-tight text-amber-700">
              Khách đã bay — vẫn huỷ được dịch vụ chừng nào kế toán chưa chốt ngày.
            </p>
          )}
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
                {/* Ưu đãi combo mất đi chia đôi — công ty chịu một nửa vì lỗi thường ở bên mình */}
                {comboLost > 0 && (
                  <span className="text-rose-700">
                    − combo mất {formatVND(comboLost)}, khách chịu{" "}
                    <strong className="tabular-nums">{formatVND(comboLost - comboCourtesy)}</strong>
                    <span className="text-slate-500"> (công ty chịu {formatVND(comboCourtesy)})</span>
                  </span>
                )}
                {/* Số lùi lại SỬA ĐƯỢC: bảng giá là một chuyện, thoả thuận với
                    khách lại là chuyện khác. Số này dùng cho cả hai đường bên dưới:
                    trừ vào phần còn thu, hay trả lại tiền cho khách. */}
                <label className="ml-auto flex items-center gap-1.5 text-sm">
                  Lùi lại khách
                  <span className="w-32">
                    <MoneyInput value={backAmount} onChange={(v) => { setBackTouched(true); setBackAmount(v); }} />
                  </span>
                  {backTouched && backAmount !== autoBack && (
                    <button
                      type="button"
                      className="text-[11px] font-medium text-emerald-700 underline"
                      onClick={() => { setBackTouched(false); setBackAmount(autoBack); }}
                    >
                      lấy lại {formatVND(autoBack)}
                    </button>
                  )}
                </label>
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
                  {/* Số hoàn SỬA ĐƯỢC: bảng giá là một chuyện, thoả thuận với
                      khách là chuyện khác — hoàn bù thêm hay hoàn một phần đều có thật. */}
                  <label className="flex w-full items-center gap-2 text-xs font-semibold text-slate-700">
                    Tiền hoàn khách
                    <span className="w-36">
                      <MoneyInput value={refundAmount} onChange={(v) => { setRefundTouched(true); setRefundAmount(v); }} />
                    </span>
                    {refundTouched && refundAmount !== backAmount && (
                      <button
                        type="button"
                        className="text-[11px] font-medium text-emerald-700 underline"
                        onClick={() => { setRefundTouched(false); setRefundAmount(backAmount); }}
                      >
                        lấy lại {formatVND(backAmount)}
                      </button>
                    )}
                  </label>
                  <span className="w-full text-[11px] text-slate-500">
                    Lùi lại {formatVND(backAmount)}
                    {backAmount !== autoBack ? ` (bảng giá ${formatVND(autoBack)})` : ""} — khách đã trả{" "}
                    {formatVND(picked.deposit)}, hoàn nhiều nhất bằng số đó
                    {refundAmount < backAmount
                      ? picked.remaining > 0
                        ? ` · phần dôi ${formatVND(backAmount - refundAmount)} trừ vào tiền còn thu`
                        : ` · khách đã trả đủ nên ${formatVND(backAmount - refundAmount)} còn lại coi như không hoàn`
                      : ""}
                    {refundAmount > backAmount ? ` · hoàn thừa ${formatVND(refundAmount - backAmount)} sẽ thành tiền khách còn nợ` : ""}
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
            <span className="ml-auto flex items-center gap-1.5 text-sm">
              Cần thu <strong className="tabular-nums text-rose-700">{formatVND(charge)}</strong>
              {/* Khách mua thêm tại bãi mà không mang tiền mặt: quét mã trả luôn */}
              <PaymentQrButton
                amount={charge}
                note={picked.bookingCode || picked.phone || ""}
                purpose={`Dịch vụ thêm — ${picked.contactName || picked.phone || "khách"}`}
              />
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

          <div className="mt-1.5 flex items-center gap-2">
            <Button
              type="button"
              className={"h-10 flex-1 " + (mode === "remove" ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700")}
              disabled={busy}
              onClick={submit}
            >
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
            <DoneTag show={justDone}>{mode === "remove" ? "Đã huỷ" : "Đã ghi"}</DoneTag>
          </div>
        </>
      )}

      {/* ---- CÁC LẦN SỬA DỊCH VỤ CŨ (đọc từ ghi chú booking) — chỉ để soát ---- */}
      {legacy.length > 0 && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 p-2">
          <div className="text-xs font-bold text-slate-700">Đã sửa dịch vụ trong ngày ({legacy.length})</div>
          <ul className="mt-1 divide-y divide-slate-100">
            {legacy.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1 text-xs">
                <span
                  className={
                    "shrink-0 rounded px-1.5 py-0.5 font-bold " +
                    (x.kind === "add" ? "bg-emerald-100 text-emerald-900" : "bg-rose-100 text-rose-900")
                  }
                >
                  {x.kind === "add" ? "thêm" : "huỷ"}
                </span>
                <span className="min-w-0 flex-1 leading-snug text-slate-700">
                  <strong>{x.label}</strong> · {x.text}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[11px] leading-tight text-slate-500">
            Đọc lại từ ghi chú booking nên chỉ xem được, không sửa được. Các lần sửa TỪ NAY nằm ở khối dưới, có nút
            ✎ Sửa.
          </p>
        </div>
      )}

      {/* ---- SỔ THÊM / HUỶ TRONG NGÀY: bấm Sửa là hoàn tác rồi nhập lại ---- */}
      {changes.length > 0 && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-2">
          <div className="text-xs font-bold text-slate-700">Đã ghi trong ngày</div>
          <ul className="mt-1 divide-y divide-slate-100">
            {changes.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1.5 text-xs">
                <span
                  className={
                    "shrink-0 rounded px-1.5 py-0.5 font-bold " +
                    (c.undone
                      ? "bg-slate-100 text-slate-500"
                      : c.kind === "add"
                        ? "bg-emerald-100 text-emerald-900"
                        : "bg-rose-100 text-rose-900")
                  }
                >
                  {c.undone ? "đã bỏ" : c.kind === "add" ? "thêm" : "huỷ"}
                </span>
                <span className={"min-w-0 flex-1 leading-snug " + (c.undone ? "text-slate-400 line-through" : "text-slate-700")}>
                  {c.bookingLabel} ·{" "}
                  {SERVICE_PRICE_LABEL.filter((x) => (c.items[x.key] ?? 0) > 0)
                    .map((x) => `${c.items[x.key]}×${x.label}`)
                    .join(" · ") || "—"}
                  {c.kind === "add"
                    ? ` · thu ${formatVND(c.charge)}${c.discount ? ` (giảm ${formatVND(c.discount)})` : ""}`
                    : ` · lùi lại ${formatVND(c.back)}${c.refunded ? ` · hoàn ${formatVND(c.refunded)}` : " (trừ vào còn thu)"}`}
                  {c.reason ? ` · ${c.reason}` : ""}
                  <span className="text-slate-400"> — {c.by}</span>
                </span>
                {!c.undone && (
                  <span className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => editChange(c, true)}
                      className="rounded border border-sky-300 bg-white px-1.5 py-0.5 font-semibold text-sky-700 disabled:opacity-50"
                    >
                      ✎ Sửa
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => editChange(c, false)}
                      className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-medium text-slate-500 disabled:opacity-50"
                    >
                      ✕ Bỏ
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[11px] leading-tight text-slate-500">
            “Sửa” = trả booking về đúng trước lúc làm thao tác đó rồi nạp số cũ lên form để nhập lại. Kế toán chốt
            ngày rồi thì không sửa được nữa.
          </p>
        </div>
      )}
    </CollapseCard>
  );
}
