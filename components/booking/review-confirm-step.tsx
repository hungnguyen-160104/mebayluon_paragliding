"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useBookingStore } from "@/store/booking-store";
import {
  computePriceByLang,
  LOCATIONS,
  type AddonKey,
} from "@/lib/booking/calculate-price";
import {
  useBookingText,
  useLangCode,
  BIGC_THANG_LONG_MAP,
} from "@/lib/booking/translations-booking";
import { createBooking } from "@/lib/booking/api";
import { notifyTelegram } from "@/lib/booking/chatbot-api";
import { TERMS_HTML, type LangCode } from "@/lib/terms";
import TurnstileWidget from "@/components/booking/turnstile-widget";

/** UI i18n (đã bỏ Download PDF) */
const UI_I18N: Record<
  string,
  { reviewTitle: string; termsTitle: string; openInNewTab: string; close: string }
> = {
  vi: {
    reviewTitle: "Vui lòng kiểm tra lại thông tin đặt bay",
    termsTitle: "Điều khoản & điều kiện",
    openInNewTab: "Mở trong tab mới",
    close: "Đóng",
  },
  en: {
    reviewTitle: "Please review your booking details",
    termsTitle: "Terms & Conditions",
    openInNewTab: "Open in new tab",
    close: "Close",
  },
  fr: {
    reviewTitle: "Veuillez vérifier les informations de votre réservation",
    termsTitle: "Conditions générales",
    openInNewTab: "Ouvrir dans un nouvel onglet",
    close: "Fermer",
  },
  ru: {
    reviewTitle: "Пожалуйста, проверьте данные бронирования",
    termsTitle: "Правила и условия",
    openInNewTab: "Открыть в новой вкладке",
    close: "Закрыть",
  },
};

type PriceLine = {
  label: string;
  detail?: string;
  amountText: string;
  type?: "normal" | "discount";
};

// AddonKey[] used: ["pickup", "flycam", "camera360"]

function Row({
  label,
  value,
  enabled,
}: {
  label: string;
  value: React.ReactNode;
  enabled: boolean;
}) {
  return (
    <div className="flex justify-between items-center gap-3">
      <span className="text-white/70">{label}</span>
      <span className={`font-semibold ${enabled ? "text-green-300" : "text-white/40"}`}>
        {value}
      </span>
    </div>
  );
}

export default function ReviewConfirmStep() {
  const t = useBookingText();
  const lang = useLangCode();

  const data = useBookingStore((s) => s.data);
  const update = useBookingStore((s) => s.update);
  const setBookingResult = useBookingStore((s) => s.setBookingResult);
  const back = useBookingStore((s) => s.back);
  const next = useBookingStore((s) => s.next);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [showTerms, setShowTerms] = useState(false);
  const [showPassengers, setShowPassengers] = useState(false);

  // ── Turnstile anti-bot ──
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const [turnstileKey, setTurnstileKey] = useState(0); // bump to force re-render widget

  const ui = UI_I18N[lang] ?? UI_I18N.vi;

  // Lấy nội dung terms theo ngôn ngữ
  const termsContent = TERMS_HTML[lang as LangCode] || TERMS_HTML.vi;

  // Khóa cuộn nền khi mở modal
  useEffect(() => {
    if (!showTerms) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showTerms]);

  const cfg = LOCATIONS[data.location];

  const billInLang = computePriceByLang(
    {
      location: data.location,
      guestsCount: data.guestsCount,
      dateISO: data.dateISO,
      addons: data.addons, // backward compat
      addonsQty: data.addonsQty, // NEW
    },
    lang
  );

  const formatVND = (n: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(n || 0));

  const formatDate = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const pax = data.guestsCount || 1;

  // Giữ logic cũ của bạn: qty add-on = min(qty, pax); fallback backward compat
  const getAddonQty = (k: AddonKey) => {
    const q = (data.addonsQty?.[k] ?? 0) || (data.addons?.[k] ? data.guestsCount : 0);
    return Math.max(0, Math.min(data.guestsCount || 1, Number(q) || 0));
  };

  const pickupQty = getAddonQty("pickup");
  const isHaNoi = data.location === "ha_noi";

  // Lấy contact theo style code cũ (tránh lỗi TS do ContactInfo không có fullName)
  const contactAny = (data as any)?.contact;
  const contactName = (contactAny?.fullName ?? contactAny?.contactName ?? "").toString();
  const contactPhone = (contactAny?.phone ?? "").toString();
  const contactEmail = (contactAny?.email ?? "").toString();
  const pickupLocation = (contactAny?.pickupLocation ?? "").toString();
  const specialRequest = (contactAny?.specialRequest ?? "").toString();

  const firstGuestName = (data as any)?.guests?.[0]?.fullName ?? "";

  // Trang điều khoản (thay cho PDF)
  const termsUrl = `/terms?lang=${lang}`;

  // ===== Price breakdown lines: unit × qty = subtotal (không đổi logic giá cũ) =====
  const { priceLines, totalText } = useMemo(() => {
    const lines: PriceLine[] = [];

    const flightUnit = Number(billInLang.basePricePerPerson || 0);
    const flightSub = flightUnit * pax;

    lines.push({
      label: (t as any)?.labels?.flightCost ?? "Flight",
      detail: `${formatVND(flightUnit)} × ${pax}`,
      amountText: formatVND(flightSub),
      type: "normal",
    });

    const addonLabel: Record<string, string> = {
      pickup: (t as any)?.labels?.pickupCost ?? "Hotel transfer",
      camera360: (t as any)?.labels?.camera360Cost ?? "Camera 360",
      flycam: (t as any)?.labels?.droneCost ?? "Drone/Flycam",
    };

    (["pickup", "camera360", "flycam"] as AddonKey[]).forEach((k) => {
      const qty = Number((billInLang as any)?.addonsQty?.[k] || 0);
      if (!qty) return;

      const unit = Number((billInLang as any)?.addonsUnitPrice?.[k] || 0);
      const sub = Number((billInLang as any)?.addonsTotal?.[k] || 0) || unit * qty;

      lines.push({
        label: addonLabel[k] ?? String(k),
        detail: `${formatVND(unit)} × ${qty}`,
        amountText: formatVND(sub),
        type: "normal",
      });
    });

    const discountPerPerson = Number(billInLang.discountPerPerson || 0);
    if (discountPerPerson > 0) {
      const discountTotal = discountPerPerson * pax;
      lines.push({
        label: (t as any)?.labels?.groupDiscount ?? "Group discount",
        detail: `-${formatVND(discountPerPerson)} × ${pax}`,
        amountText: `-${formatVND(discountTotal)}`,
        type: "discount",
      });
    }

    const total = Number(billInLang.totalAfterDiscount || 0);
    return { priceLines: lines, totalText: formatVND(total) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    billInLang.basePricePerPerson,
    billInLang.discountPerPerson,
    billInLang.totalAfterDiscount,
    (billInLang as any)?.addonsQty,
    (billInLang as any)?.addonsUnitPrice,
    (billInLang as any)?.addonsTotal,
    pax,
    lang,
  ]);

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(undefined);

    try {
      // giữ y nguyên logic cũ của bạn
      const primaryName =
        (data as any)?.contact?.fullName?.trim?.() ||
        (data as any)?.contact?.contactName?.trim?.() ||
        data?.guests?.[0]?.fullName?.trim?.() ||
        "";
      const primaryPhone = (data as any)?.contact?.phone?.trim?.() || "";

      const missing: string[] = [];
      if (!primaryName) missing.push("tên liên hệ");
      if (!primaryPhone) missing.push("số điện thoại");
      if (!data?.dateISO) missing.push("ngày bay");
      if (!data?.location) missing.push("điểm bay");
      if (missing.length) {
        throw new Error(`Thiếu ${missing.join(", ")}. Vui lòng bổ sung trước khi xác nhận.`);
      }

      const payload = {
        ...data,
        name: primaryName,
        phone: primaryPhone,
        date: data.dateISO,
        location: data.location,
        locationName: cfg?.name?.[lang] ?? cfg?.name?.vi ?? data.location,

        // NEW: gửi breakdown để Telegram/backend hiển thị đúng qty
        price: {
          currency: billInLang.currency,
          perPerson: billInLang.totalPerPerson,
          basePerPerson: billInLang.basePricePerPerson,
          discountPerPerson: billInLang.discountPerPerson,
          addonsQty: (billInLang as any).addonsQty,
          addonsUnitPrice: (billInLang as any).addonsUnitPrice,
          addonsTotal: (billInLang as any).addonsTotal,
          total: billInLang.totalAfterDiscount,
        },

        createdAt: new Date().toISOString(),
      };

      const createResp: any = await createBooking(payload, turnstileToken);
      if (!createResp?.ok) {
        const serverMsg = createResp?.message || "Tạo booking thất bại";
        const serverErrs = createResp?.errors ? `\n${JSON.stringify(createResp.errors)}` : "";
        throw new Error(`${serverMsg}${serverErrs}`);
      }

      // NEW: lưu kết quả để step Success in vé PDF
      setBookingResult(createResp.booking || payload);

      try {
        await notifyTelegram(createResp.booking || payload);
      } catch (tgErr: any) {
        console.warn("⚠️ Gửi Telegram thất bại (không chặn flow):", tgErr?.message || tgErr);
      }

      next();
    } catch (e: any) {
      console.error("❌ Lỗi khi xác nhận:", e);

      const isTurnstileError = e?.status === 403 || e?.data?.error === "TURNSTILE_FAILED";

      if (isTurnstileError) {
        setError(e?.data?.message || "Xác thực Turnstile thất bại. Vui lòng thử lại.");
      } else {
        setError(e?.message || "Không gửi được yêu cầu. Vui lòng thử lại.");
      }

      // Reset Turnstile token (token đã bị dùng hoặc hết hạn)
      setTurnstileToken("");
      setTurnstileKey((k) => k + 1);
    } finally {
      setSubmitting(false);
    }
  };

  const glassWrapperClass =
    "bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-lg p-5 space-y-6";

  // label fallback helper (không ảnh hưởng logic)
  const L = (key: string, fallback: string) => ((t as any)?.labels?.[key] as string) || fallback;

  return (
    <div className="space-y-6 text-white">
      <div className={glassWrapperClass}>
        <h3 className="text-lg font-semibold text-white">{ui.reviewTitle}</h3>

        {/* ===== Summary cards giống step4 ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Service Details */}
          <div className="p-4 rounded-2xl border border-white/30 bg-gradient-to-br from-red-500/20 to-orange-500/10">
            <h4 className="text-sm font-bold uppercase tracking-wide text-white mb-3">
              {L("serviceDetails", "Service details")}
            </h4>

            <div className="grid grid-cols-2 gap-3 text-sm text-white/90">
              <div>
                <p className="text-white/60 text-xs">{L("service", "Service")}</p>
                <p className="font-semibold">{(cfg as any)?.name?.[lang] ?? (cfg as any)?.name?.vi ?? L("flight", "Flight")}</p>
              </div>

              <div>
                <p className="text-white/60 text-xs">{L("numGuests", "Passengers")}</p>
                <p className="font-semibold">{data.guestsCount}</p>
              </div>

              <div>
                <p className="text-white/60 text-xs">{L("date", "Date")}</p>
                <p className="font-semibold">{formatDate(data.dateISO)}</p>
              </div>

              <div>
                <p className="text-white/60 text-xs">{L("timeSlot", "Time")}</p>
                <p className="font-semibold">{data.timeSlot || L("flexibleTime", "Flexible")}</p>
              </div>

              <div>
                <p className="text-white/60 text-xs">{L("pickupLocation", "Pickup location")}</p>
                <p className="font-semibold">
                  {pickupQty > 0
                    ? isHaNoi
                      ? L("pickupFixed", "BigC Thăng Long")
                      : pickupLocation || L("launchSite", "Launch site")
                    : L("launchSite", "Launch site")}
                </p>
              </div>

              <div>
                <p className="text-white/60 text-xs">{L("pickupTime", "Pickup time")}</p>
                <p className="font-semibold">{L("pickupTimeDefault", "Before departure")}</p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="p-4 rounded-2xl border border-white/30 bg-white/10">
            <h4 className="text-sm font-bold uppercase tracking-wide text-white mb-3">
              {L("contactInfo", "Contact information")}
            </h4>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-white/60">{L("name", "Name")}</span>
                <span className="font-semibold text-white text-right">
                  {contactName || firstGuestName || ""}
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-white/60">{L("email", "Email")}</span>
                <span className="font-semibold text-white truncate max-w-[220px] text-right">
                  {contactEmail || ""}
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-white/60">{L("phone", "Phone")}</span>
                <span className="font-semibold text-white text-right">
                  {contactPhone || ""}
                </span>
              </div>

              {/* pickup note + map (giữ đúng logic cũ) */}
              {pickupQty > 0 && isHaNoi && (
                <div className="pt-2 text-sm text-white/80">
                  <span className="font-medium">{L("pickup", "Pickup")}: </span>
                  {L("pickupFixed", "BigC Thăng Long")}{" "}
                  <a className="text-blue-400 underline" href={BIGC_THANG_LONG_MAP} target="_blank" rel="noreferrer">
                    {t.buttons.viewMap}
                  </a>
                </div>
              )}

              {pickupQty > 0 && !isHaNoi && pickupLocation && (
                <div className="pt-2 text-sm text-white/80">
                  <span className="font-medium">{L("pickup", "Pickup")}: </span>
                  {pickupLocation}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== Passenger section collapsible giống step4 ===== */}
        <div className="rounded-2xl border border-white/30 bg-white/10 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowPassengers((v) => !v)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition"
          >
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold uppercase tracking-wide text-white">
                {L("passengerList", "Passenger information")}
              </h4>
              <span className="bg-red-600 text-white text-xs px-2 py-0.5 font-semibold rounded-full">
                {(data.guests ?? []).length}
              </span>
            </div>
            <span className={`transition-transform ${showPassengers ? "rotate-180" : ""}`}>▾</span>
          </button>

          {showPassengers && (
            <div className="border-t border-white/20 max-h-64 overflow-y-auto">
              {(data.guests ?? []).map((g: any, i: number) => (
                <div key={i} className="px-4 py-4 border-b border-white/10 last:border-b-0 hover:bg-white/5">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-sm">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm mb-2">{g.fullName}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs text-white/70">
                        <div>
                          <span className="font-medium">{L("dob", "DOB")}:</span>{" "}
                          <span className="ml-1">{g.dob}</span>
                        </div>
                        <div>
                          <span className="font-medium">{L("gender", "Gender")}:</span>{" "}
                          <span className="ml-1">{g.gender}</span>
                        </div>
                        {g.idNumber && (
                          <div>
                            <span className="font-medium">{L("idNumber", "ID")}:</span>{" "}
                            <span className="ml-1">{g.idNumber}</span>
                          </div>
                        )}
                        {g.nationality && (
                          <div>
                            <span className="font-medium">{L("nationality", "Nationality")}:</span>{" "}
                            <span className="ml-1">{g.nationality}</span>
                          </div>
                        )}
                        {g.weightKg && (
                          <div>
                            <span className="font-medium">{L("weightKg", "Weight")}:</span>{" "}
                            <span className="ml-1">{g.weightKg}kg</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ===== Special request box giống step4 ===== */}
        {!!specialRequest && (
          <div className="rounded-2xl border border-yellow-400/40 bg-yellow-400/10 p-4">
            <p className="text-xs text-yellow-200 font-semibold mb-1">
              {L("specialRequest", "Special requests")}
            </p>
            <p className="text-sm text-yellow-100">{specialRequest}</p>
          </div>
        )}

        {/* ===== Additional services giống step4 ===== */}
        <div className="p-4 rounded-2xl border border-white/30 bg-white/10">
          <h4 className="text-sm font-bold uppercase tracking-wide text-white mb-3">
            {L("additionalServices", "Additional services")}
          </h4>

          <div className="space-y-3 text-sm">
            <Row label={L("hotelTransfer", "Hotel transfer")} value={pickupQty > 0 ? L("yes", "Yes") : L("no", "No")} enabled={pickupQty > 0} />
            <Row label={L("camera360", "Camera 360")} value={getAddonQty("camera360") ? `${getAddonQty("camera360")} pax` : L("no", "No")} enabled={!!getAddonQty("camera360")} />
            <Row label={L("drone", "Drone/Flycam")} value={getAddonQty("flycam") ? `${getAddonQty("flycam")} pax` : L("no", "No")} enabled={!!getAddonQty("flycam")} />

            <div className="flex justify-between items-center">
              <span className="text-white/70">{L("gopro", "GoPro")}</span>
              <span className="text-blue-300 font-semibold">{L("free", "Free")}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/70">{L("drinks", "Drinks")}</span>
              <span className="text-blue-300 font-semibold">{L("free", "Free")}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/70">{L("certificate", "Certificate")}</span>
              <span className="text-blue-300 font-semibold">{L("included", "Included")}</span>
            </div>
          </div>
        </div>

        {/* ===== Price breakdown giống step4 (unit × qty = subtotal) ===== */}
        <div className="p-4 rounded-2xl border border-white/30 bg-white/10">
          <h4 className="text-sm font-bold uppercase tracking-wide text-white mb-3">
            {L("priceBreakdown", "Price breakdown")}
          </h4>

          <div className="space-y-2 text-sm">
            {priceLines.map((line, idx) => (
              <div key={idx} className={`flex justify-between gap-3 ${line.type === "discount" ? "text-red-300" : "text-white/90"}`}>
                <div className="min-w-0">
                  <p className="text-white/70 break-words">{line.label}</p>
                  {line.detail && <p className="text-xs text-white/50 break-words">{line.detail}</p>}
                </div>
                <span className="font-semibold whitespace-nowrap">{line.amountText}</span>
              </div>
            ))}

            <hr className="my-2 border-white/20" />

            <div className="flex justify-between font-bold text-lg">
              <span>{L("totalCost", "Total")}</span>
              <span>{totalText}</span>
            </div>
          </div>
        </div>

        {/* ===== Payment method giống step4 (chỉ hiển thị) ===== */}
        <div className="p-4 rounded-2xl border border-white/30 bg-white/10">
          <h4 className="text-sm font-bold uppercase tracking-wide text-white mb-3">
            {L("paymentMethod", "Payment method")}
          </h4>

          <div className="space-y-2 text-sm text-white/80">
            <div className="flex items-center gap-2"><span className="text-green-300">✔</span><span>{L("cashPayment", "Cash payment")}</span></div>
            <div className="flex items-center gap-2"><span className="text-green-300">✔</span><span>{L("bankTransfer", "Bank transfer")}</span></div>
            <div className="flex items-center gap-2"><span className="text-green-300">✔</span><span>{L("paypalPayment", "PayPal")}</span></div>
            <div className="flex items-center gap-2"><span className="text-green-300">✔</span><span>{L("creditCard", "Credit card")}</span></div>
          </div>
        </div>

        {/* ── Turnstile CAPTCHA widget ── */}
        <div className="rounded-2xl border border-white/40 p-4">
          <TurnstileWidget
            key={turnstileKey}
            onVerify={(token) => setTurnstileToken(token)}
            onExpire={() => setTurnstileToken("")}
            onError={() => setTurnstileToken("")}
            lang={lang}
            theme="dark"
          />
        </div>

        {/* Terms checkbox + mở modal */}
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={!!data.acceptedTerms}
            onChange={(e) => update({ acceptedTerms: e.target.checked })}
            className="mt-1 h-4 w-4 accent-green-500"
          />
          <span className="text-sm text-white">
            {(t as any)?.labels?.termsText ?? "I agree to the terms"}{" "}
            <button type="button" onClick={() => setShowTerms(true)} className="text-blue-400 underline">
              {(t as any)?.labels?.viewTerms ?? "View terms"}
            </button>
          </span>
        </label>
      </div>

      {error && (
        <div className="text-sm text-white bg-red-900/40 border border-red-500/60 rounded-lg p-3 backdrop-blur-sm">
          {error}
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={back}
          className="px-4 py-2 rounded-xl border border-white/40 bg-black/30 text-white hover:bg-black/50 transition backdrop-blur-sm"
        >
          {t.buttons.back}
        </button>
        <button
          disabled={!data.acceptedTerms || !turnstileToken || submitting}
          onClick={handleConfirm}
          className="px-5 py-2 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-50 transition"
        >
          {submitting ? t.buttons.processing : t.buttons.confirm}
        </button>
      </div>

      {/* Modal: hiển thị nội dung terms trực tiếp */}
      {showTerms && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowTerms(false)} />
          <div className="relative mx-auto my-8 w-[min(96vw,1000px)] h-[min(90vh,800px)] bg-gray-900 rounded-2xl shadow-2xl ring-1 ring-white/20 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 bg-white/10 shrink-0">
              <span className="text-sm font-medium text-white">{ui.termsTitle}</span>
              <div className="flex items-center gap-3">
                <a href={termsUrl} target="_blank" rel="noreferrer" className="underline text-sm text-white hover:text-blue-300">
                  {ui.openInNewTab}
                </a>
                <button
                  onClick={() => setShowTerms(false)}
                  className="px-2 py-1 rounded-md border border-white/30 hover:bg-white/10 text-white"
                >
                  {ui.close}
                </button>
              </div>
            </div>

            <div
              className="flex-1 overflow-y-auto p-6 text-white/90 prose prose-invert prose-sm max-w-none
                [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:text-white
                [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-white
                [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-white
                [&_p]:mb-3 [&_p]:leading-relaxed
                [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3
                [&_li]:mb-1"
              dangerouslySetInnerHTML={{ __html: termsContent }}
            />
          </div>
        </div>
      )}
    </div>
  );
}