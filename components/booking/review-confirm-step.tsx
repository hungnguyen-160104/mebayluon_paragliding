"use client";

import React, { useEffect, useState } from "react";
import { useBookingStore } from "@/store/booking-store";
import { computePriceByLang, LOCATIONS, type AddonKey } from "@/lib/booking/calculate-price";
import { useBookingText, useLangCode, BIGC_THANG_LONG_MAP } from "@/lib/booking/translations-booking";
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

// AddonKey[] used: ["pickup", "flycam", "camera360"]

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

  // ── Turnstile anti-bot ──
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const [turnstileKey, setTurnstileKey] = useState(0); // bump to force re-render widget

  const ui = UI_I18N[lang] ?? UI_I18N.vi;

  // Lấy nội dung terms theo ngôn ngữ
  const termsContent = TERMS_HTML[(lang as LangCode)] || TERMS_HTML.vi;

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
      addons: data.addons,        // backward compat
      addonsQty: data.addonsQty,  // NEW
    },
    lang
  );

  const getAddonQty = (k: AddonKey) => {
    const q = (data.addonsQty?.[k] ?? 0) || (data.addons?.[k] ? data.guestsCount : 0);
    return Math.max(0, Math.min(data.guestsCount || 1, Number(q) || 0));
  };

  const pickupQty = getAddonQty("pickup");
  const isHaNoi = data.location === "ha_noi";

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(undefined);

    try {
      const primaryName =
        (data as any)?.contact?.fullName?.trim?.() ||
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
          addonsQty: billInLang.addonsQty,
          addonsUnitPrice: billInLang.addonsUnitPrice,
          addonsTotal: billInLang.addonsTotal,
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

      // fetchJson throw Error với .status và .data khi response không ok
      const isTurnstileError =
        e?.status === 403 ||
        e?.data?.error === "TURNSTILE_FAILED";

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
  const innerBlockClass = "rounded-2xl border border-white/40 p-4 text-sm text-white/90";

  // Trang điều khoản (thay cho PDF)
  const termsUrl = `/terms?lang=${lang}`;

  return (
    <div className="space-y-6 text-white">
      <div className={glassWrapperClass}>
        <h3 className="text-lg font-semibold text-white">{ui.reviewTitle}</h3>

        <div className={innerBlockClass}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="font-medium">{t.labels.date}: </span>
              {data.dateISO}
            </div>
            <div>
              <span className="font-medium">{t.labels.timeSlot}: </span>
              {data.timeSlot}
            </div>
            <div>
              <span className="font-medium">{t.labels.location}: </span>
              {cfg?.name?.[lang] ?? cfg?.name?.vi ?? data.location}
            </div>
            <div>
              <span className="font-medium">{t.labels.numGuests}: </span>
              {data.guestsCount}
            </div>
          </div>
        </div>

        <div className={innerBlockClass}>
          <h4 className="font-semibold text-white">{t.labels.contactInfo}</h4>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="font-medium">{t.labels.phone}: </span>
              {data.contact?.phone}
            </div>
            <div>
              <span className="font-medium">{t.labels.email}: </span>
              {data.contact?.email}
            </div>

            {/* pickup selected if qty>0 */}
            {pickupQty > 0 && isHaNoi && (
              <div className="md:col-span-2">
                <span className="font-medium">{t.labels.pickup}: </span>
                {t.labels.pickupFixed}{" "}
                <a className="text-blue-400 underline" href={BIGC_THANG_LONG_MAP} target="_blank" rel="noreferrer">
                  {t.buttons.viewMap}
                </a>
              </div>
            )}
            {pickupQty > 0 && !isHaNoi && data.contact?.pickupLocation && (
              <div className="md:col-span-2">
                <span className="font-medium">{t.labels.pickup}: </span>
                {data.contact?.pickupLocation}
              </div>
            )}

            {data.contact?.specialRequest && (
              <div className="md:col-span-2">
                <span className="font-medium">{t.labels.specialRequest}: </span>
                {data.contact?.specialRequest}
              </div>
            )}
          </div>
        </div>

        <div className={innerBlockClass}>
          <h4 className="font-semibold text-white">{t.labels.passengerList}</h4>
          <div className="mt-2 space-y-2">
            {(data.guests ?? []).map((g: any, i: number) => (
              <div key={i} className="rounded-lg border border-white/40 p-3 text-white/80">
                <div>
                  <span className="font-medium">Khách {i + 1}:</span> {g.fullName}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div>
                    {t.labels.dob}: {g.dob}
                  </div>
                  <div>
                    {t.labels.gender}: {g.gender}
                  </div>
                  {g.idNumber && (
                    <div>
                      {t.labels.idNumber}: {g.idNumber}
                    </div>
                  )}
                  {g.weightKg && (
                    <div>
                      {t.labels.weightKg}: {g.weightKg} kg
                    </div>
                  )}
                  {g.nationality && (
                    <div>
                      {t.labels.nationality}: {g.nationality}
                    </div>
                  )}
                </div>
              </div>
            ))}
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
            {t.labels.termsText}{" "}
            <button type="button" onClick={() => setShowTerms(true)} className="text-blue-400 underline">
              {t.labels.viewTerms}
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
