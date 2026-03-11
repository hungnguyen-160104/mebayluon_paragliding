"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useBookingStore } from "@/store/booking-store";
import {
  computePriceByLang,
  LOCATIONS,
  type AddonKey,
} from "@/lib/booking/calculate-price";
import { useBookingText, useLangCode } from "@/lib/booking/translations-booking";
import { createBooking } from "@/lib/booking/api";
import { notifyTelegram } from "@/lib/booking/chatbot-api";
import { TERMS_HTML, type LangCode } from "@/lib/terms";
import TurnstileWidget from "@/components/booking/turnstile-widget";

const UI_I18N: Record<
  string,
  {
    title: string;
    subtitle: string;
    termsTitle: string;
    openInNewTab: string;
    close: string;
    packageLabel: string;
    flightTypeLabel: string;
    pickupDetails: string;
    noPickupSelected: string;
    pickupAddressMissing: string;
    paragliding: string;
    paramotor: string;
    notSelected: string;
    weekday: string;
    weekend: string;
    holiday: string;
    selectedCount: string;
    passengerList: string;
    paymentTitle: string;
    supportNote: string;
  }
> = {
  vi: {
    title: "Xác nhận thông tin đặt bay",
    subtitle:
      "Vui lòng kiểm tra thật kỹ thông tin chuyến bay, hành khách và dịch vụ đã chọn trước khi xác nhận.",
    termsTitle: "Điều khoản & điều kiện",
    openInNewTab: "Mở trong tab mới",
    close: "Đóng",
    packageLabel: "Gói bay",
    flightTypeLabel: "Loại bay",
    pickupDetails: "Thông tin đón / trả",
    noPickupSelected:
      "Chuyến bay không bao gồm xe trung chuyển đến điểm bay. Khách cần có mặt trước 15 phút để check-in.",
    pickupAddressMissing: "Vui lòng nhập đầy đủ địa chỉ đón cho dịch vụ đã chọn.",
    paragliding: "Bay dù không động cơ",
    paramotor: "Bay dù gắn động cơ",
    notSelected: "Chưa chọn",
    weekday: "Ngày thường",
    weekend: "Cuối tuần",
    holiday: "Ngày lễ",
    selectedCount: "đã chọn",
    passengerList: "Danh sách hành khách",
    paymentTitle: "Phương thức thanh toán",
    supportNote:
      "Sau khi gửi booking, đội ngũ sẽ liên hệ xác nhận lịch bay, dịch vụ và các điều kiện thời tiết.",
  },
  en: {
    title: "Review and confirm",
    subtitle:
      "Please review your flight details, passengers, and selected services carefully before confirming.",
    termsTitle: "Terms & Conditions",
    openInNewTab: "Open in new tab",
    close: "Close",
    packageLabel: "Flight package",
    flightTypeLabel: "Flight type",
    pickupDetails: "Pickup details",
    noPickupSelected:
      "This flight does not include transfer to the takeoff point. Please arrive 15 minutes early for check-in.",
    pickupAddressMissing: "Please provide the pickup address for the selected service.",
    paragliding: "Paragliding",
    paramotor: "Paramotor",
    notSelected: "Not selected",
    weekday: "Weekday",
    weekend: "Weekend",
    holiday: "Holiday",
    selectedCount: "selected",
    passengerList: "Passenger list",
    paymentTitle: "Payment methods",
    supportNote:
      "After you submit the booking, our team will contact you to confirm schedule, services, and weather conditions.",
  },
  fr: {
    title: "Vérification et confirmation",
    subtitle:
      "Veuillez vérifier soigneusement les détails du vol, les passagers et les services sélectionnés avant de confirmer.",
    termsTitle: "Conditions générales",
    openInNewTab: "Ouvrir dans un nouvel onglet",
    close: "Fermer",
    packageLabel: "Forfait de vol",
    flightTypeLabel: "Type de vol",
    pickupDetails: "Informations de prise en charge",
    noPickupSelected:
      "Ce vol ne comprend pas le transfert vers le point de départ. Veuillez arriver 15 minutes à l’avance pour l’enregistrement.",
    pickupAddressMissing:
      "Veuillez renseigner l’adresse de prise en charge pour le service sélectionné.",
    paragliding: "Parapente",
    paramotor: "Paramoteur",
    notSelected: "Non sélectionné",
    weekday: "Jour ouvré",
    weekend: "Week-end",
    holiday: "Jour férié",
    selectedCount: "sélectionné",
    passengerList: "Liste des passagers",
    paymentTitle: "Modes de paiement",
    supportNote:
      "Après l’envoi de la réservation, notre équipe vous contactera pour confirmer l’horaire, les services et la météo.",
  },
  ru: {
    title: "Проверка и подтверждение",
    subtitle:
      "Пожалуйста, внимательно проверьте детали полёта, пассажиров и выбранные услуги перед подтверждением.",
    termsTitle: "Правила и условия",
    openInNewTab: "Открыть в новой вкладке",
    close: "Закрыть",
    packageLabel: "Пакет полёта",
    flightTypeLabel: "Тип полёта",
    pickupDetails: "Информация о трансфере",
    noPickupSelected:
      "Этот полёт не включает трансфер до точки старта. Пожалуйста, прибудьте за 15 минут до регистрации.",
    pickupAddressMissing: "Пожалуйста, укажите адрес трансфера для выбранной услуги.",
    paragliding: "Параплан",
    paramotor: "Парамотор",
    notSelected: "Не выбрано",
    weekday: "Будний день",
    weekend: "Выходной",
    holiday: "Праздничный день",
    selectedCount: "выбрано",
    passengerList: "Список пассажиров",
    paymentTitle: "Способы оплаты",
    supportNote:
      "После отправки бронирования команда свяжется с вами для подтверждения времени, услуг и погодных условий.",
  },
  hi: {
    title: "जाँचें और पुष्टि करें",
    subtitle:
      "कृपया पुष्टि करने से पहले फ्लाइट विवरण, यात्रियों और चुनी गई सेवाओं की अच्छी तरह जाँच करें।",
    termsTitle: "नियम और शर्तें",
    openInNewTab: "नए टैब में खोलें",
    close: "बंद करें",
    packageLabel: "फ्लाइट पैकेज",
    flightTypeLabel: "फ्लाइट प्रकार",
    pickupDetails: "पिकअप जानकारी",
    noPickupSelected:
      "इस फ्लाइट में टेकऑफ पॉइंट तक ट्रांसफर शामिल नहीं है। कृपया चेक-इन के लिए 15 मिनट पहले पहुँचें।",
    pickupAddressMissing: "कृपया चुनी गई सेवा के लिए पिकअप पता भरें।",
    paragliding: "पैराग्लाइडिंग",
    paramotor: "पैरामोटर",
    notSelected: "चयन नहीं किया गया",
    weekday: "कार्यदिवस",
    weekend: "सप्ताहांत",
    holiday: "छुट्टी",
    selectedCount: "चयनित",
    passengerList: "यात्री सूची",
    paymentTitle: "भुगतान के तरीके",
    supportNote:
      "बुकिंग भेजने के बाद हमारी टीम समय, सेवाओं और मौसम की स्थिति की पुष्टि के लिए आपसे संपर्क करेगी।",
  },
  zh: {
    title: "确认预订信息",
    subtitle:
      "请在确认前仔细检查飞行信息、乘客信息以及已选择的服务。",
    termsTitle: "条款和条件",
    openInNewTab: "在新标签页中打开",
    close: "关闭",
    packageLabel: "飞行套餐",
    flightTypeLabel: "飞行类型",
    pickupDetails: "接送信息",
    noPickupSelected:
      "该飞行不包含前往起飞点的接送服务。请提前 15 分钟到达办理登记。",
    pickupAddressMissing: "请选择接送服务后填写接送地址。",
    paragliding: "无动力滑翔伞",
    paramotor: "动力伞",
    notSelected: "未选择",
    weekday: "工作日",
    weekend: "周末",
    holiday: "节假日",
    selectedCount: "已选择",
    passengerList: "乘客名单",
    paymentTitle: "支付方式",
    supportNote:
      "提交预订后，团队将联系您确认飞行时间、服务内容和天气条件。",
  },
};

type PriceLine = {
  label: string;
  detail?: string;
  amountText: string;
  type?: "normal" | "discount";
};

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
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
      <span className="text-sm text-white/70">{label}</span>
      <span
        className={`text-sm font-semibold text-right ${
          enabled ? "text-white" : "text-white/45"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function getFlightTypeLabel(lang: string, key?: string) {
  const ui = UI_I18N[lang] ?? UI_I18N.vi;
  if (key === "paramotor") return ui.paramotor;
  if (key === "paragliding") return ui.paragliding;
  return ui.notSelected;
}

function getHolidayTypeLabel(
  lang: string,
  holidayType?: "weekday" | "weekend" | "holiday"
) {
  const ui = UI_I18N[lang] ?? UI_I18N.vi;
  if (holidayType === "holiday") return ui.holiday;
  if (holidayType === "weekend") return ui.weekend;
  return ui.weekday;
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

  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const [turnstileKey, setTurnstileKey] = useState(0);

  const ui = UI_I18N[lang] ?? UI_I18N.vi;
  const termsContent = TERMS_HTML[lang as LangCode] || TERMS_HTML.vi;

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
      packageKey: data.packageKey,
      flightTypeKey: data.flightTypeKey,
      addons: data.addons,
      addonsQty: data.addonsQty,
    },
    lang
  );

  const formatMoney = (n: number) => {
    return lang === "vi"
      ? new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
        }).format(Number(n || 0))
      : `${Number(n || 0).toLocaleString("en-US")} USD`;
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const pax = data.guestsCount || 1;

  const getAddonQty = (k: AddonKey) => {
    const q =
      (data.addonsQty?.[k] ?? 0) || (data.addons?.[k] ? data.guestsCount : 0);
    return Math.max(0, Math.min(data.guestsCount || 1, Number(q) || 0));
  };

  const contactAny = (data as any)?.contact;
  const contactName = (
    contactAny?.fullName ??
    contactAny?.contactName ??
    ""
  ).toString();
  const contactPhone = (contactAny?.phone ?? "").toString();
  const contactEmail = (contactAny?.email ?? "").toString();
  const specialRequest = (contactAny?.specialRequest ?? "").toString();
  const firstGuestName = (data as any)?.guests?.[0]?.fullName ?? "";

  const visibleSelectedServices = (cfg?.services || []).filter((svc) => {
    if (svc.visibleForPackages?.length) {
      if (!data.packageKey) return false;
      if (!svc.visibleForPackages.includes(data.packageKey as any)) return false;
    }
    return !!data.services?.[svc.key]?.selected;
  });

  const selectedPickupServices = visibleSelectedServices.filter(
    (svc) => svc.requiresPickupInput || svc.fixedMapUrl
  );

  const missingPickupAddress = selectedPickupServices.some((svc) => {
    if (svc.fixedMapUrl) return false;
    if (!svc.requiresPickupInput) return false;
    return !(data.services?.[svc.key]?.inputText || "").trim();
  });

  const packageLabel =
    cfg?.packages?.find((p) => p.key === data.packageKey)?.label?.[lang] ??
    cfg?.packages?.find((p) => p.key === data.packageKey)?.label?.vi ??
    ui.notSelected;

  const serviceLines = visibleSelectedServices.map((svc) => {
    const label = svc.label[lang] ?? svc.label.vi;
    const inputText = data.services?.[svc.key]?.inputText || "";
    return { key: svc.key, label, inputText, fixedMapUrl: svc.fixedMapUrl };
  });

  const termsUrl = `/terms?lang=${lang}`;

  const { priceLines, totalText } = useMemo(() => {
    const lines: PriceLine[] = [];

    const flightUnit = Number(billInLang.basePricePerPerson || 0);
    const flightSub = flightUnit * pax;

    lines.push({
      label: (t as any)?.labels?.flightCost ?? "Flight",
      detail: `${formatMoney(flightUnit)} × ${pax}`,
      amountText: formatMoney(flightSub),
      type: "normal",
    });

    const addonLabel: Record<string, string> = {
      pickup: (t as any)?.labels?.pickupCost ?? "Pickup",
      camera360: (t as any)?.labels?.camera360Cost ?? "Camera 360",
      flycam: (t as any)?.labels?.droneCost ?? "Drone/Flycam",
    };

    (["pickup", "camera360", "flycam"] as AddonKey[]).forEach((k) => {
      const qty = Number((billInLang as any)?.addonsQty?.[k] || 0);
      if (!qty) return;

      const unit = Number((billInLang as any)?.addonsUnitPrice?.[k] || 0);
      const sub =
        Number((billInLang as any)?.addonsTotal?.[k] || 0) || unit * qty;

      lines.push({
        label: addonLabel[k] ?? String(k),
        detail: `${formatMoney(unit)} × ${qty}`,
        amountText: formatMoney(sub),
        type: "normal",
      });
    });

    const discountPerPerson = Number(billInLang.discountPerPerson || 0);
    if (discountPerPerson > 0) {
      const discountTotal = discountPerPerson * pax;
      lines.push({
        label: (t as any)?.labels?.groupDiscount ?? "Group discount",
        detail: `-${formatMoney(discountPerPerson)} × ${pax}`,
        amountText: `-${formatMoney(discountTotal)}`,
        type: "discount",
      });
    }

    return {
      priceLines: lines,
      totalText: formatMoney(Number(billInLang.totalAfterDiscount || 0)),
    };
  }, [
    billInLang.basePricePerPerson,
    billInLang.discountPerPerson,
    billInLang.totalAfterDiscount,
    (billInLang as any)?.addonsQty,
    (billInLang as any)?.addonsUnitPrice,
    (billInLang as any)?.addonsTotal,
    pax,
    lang,
    t,
  ]);

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(undefined);

    try {
      const primaryName =
        (data as any)?.contact?.fullName?.trim?.() ||
        (data as any)?.contact?.contactName?.trim?.() ||
        data?.guests?.[0]?.fullName?.trim?.() ||
        "";
      const primaryPhone = (data as any)?.contact?.phone?.trim?.() || "";

      const missing: string[] = [];
      if (!primaryName) missing.push("contact name");
      if (!primaryPhone) missing.push("phone");
      if (!data?.dateISO) missing.push("date");
      if (!data?.location) missing.push("location");
      if (data.location === "khau_pha" && !data.packageKey) missing.push("package");
      if (data.location === "khau_pha" && !data.flightTypeKey) missing.push("flight type");
      if (missingPickupAddress) throw new Error(ui.pickupAddressMissing);
      if (missing.length) {
        throw new Error(`Missing ${missing.join(", ")}.`);
      }

      const payload = {
        ...data,
        name: primaryName,
        phone: primaryPhone,
        date: data.dateISO,
        location: data.location,
        locationName: cfg?.name?.[lang] ?? cfg?.name?.vi ?? data.location,
        packageLabel,
        flightTypeLabel: getFlightTypeLabel(lang, data.flightTypeKey),

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

        selectedServices: serviceLines,
        holidayType: billInLang.holidayType,
        createdAt: new Date().toISOString(),
      };

      const createResp: any = await createBooking(payload, turnstileToken);
      if (!createResp?.ok) {
        const serverMsg = createResp?.message || "Create booking failed";
        const serverErrs = createResp?.errors
          ? `\n${JSON.stringify(createResp.errors)}`
          : "";
        throw new Error(`${serverMsg}${serverErrs}`);
      }

      setBookingResult(createResp.booking || payload);

      try {
        await notifyTelegram(createResp.booking || payload);
      } catch (tgErr: any) {
        console.warn("Telegram failed:", tgErr?.message || tgErr);
      }

      next();
    } catch (e: any) {
      console.error("Booking confirmation failed:", e);

      const isTurnstileError =
        e?.status === 403 || e?.data?.error === "TURNSTILE_FAILED";

      if (isTurnstileError) {
        setError(
          e?.data?.message || "Turnstile validation failed. Please try again."
        );
      } else {
        setError(e?.message || "Unable to submit. Please try again.");
      }

      setTurnstileToken("");
      setTurnstileKey((k) => k + 1);
    } finally {
      setSubmitting(false);
    }
  };

  const L = (key: string, fallback: string) =>
    ((t as any)?.labels?.[key] as string) || fallback;

  const noKhauPhaPkg2Pickup =
    data.location === "khau_pha" &&
    data.packageKey === "khau_pha_pkg_2" &&
    !data.services?.["khau_pha_pkg_2_tu_le_pickup"]?.selected &&
    !data.services?.["khau_pha_pkg_2_garrya_pickup"]?.selected;

  return (
    <div className="space-y-5 text-white">
      <div className="rounded-[28px] border border-white/20 bg-white/10 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.18)] overflow-hidden">
        <div className="border-b border-white/10 bg-gradient-to-r from-sky-500/20 via-cyan-400/10 to-transparent px-4 py-4 md:px-6">
          <h3 className="text-lg md:text-xl font-semibold">{ui.title}</h3>
          <p className="mt-1 text-sm text-white/80 max-w-3xl">{ui.subtitle}</p>
        </div>

        <div className="p-4 md:p-6 space-y-5">
          <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.95fr] gap-5">
            <section className="rounded-2xl border border-white/15 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-sky-200/90 font-semibold">
                {L("serviceDetails", "Service details")}
              </div>

              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                <InfoBox
                  label={L("service", "Service")}
                  value={cfg?.name?.[lang] ?? cfg?.name?.vi ?? L("flight", "Flight")}
                />
                <InfoBox label={L("numGuests", "Passengers")} value={String(data.guestsCount)} />
                <InfoBox label={L("date", "Date")} value={formatDate(data.dateISO)} />
                <InfoBox
                  label={L("timeSlot", "Time")}
                  value={data.timeSlot || L("flexibleTime", "Flexible")}
                />
                <InfoBox
                  label={ui.packageLabel}
                  value={data.location === "khau_pha" ? packageLabel : ui.notSelected}
                />
                <InfoBox
                  label={ui.flightTypeLabel}
                  value={
                    data.location === "khau_pha"
                      ? getFlightTypeLabel(lang, data.flightTypeKey)
                      : getFlightTypeLabel(lang, "paragliding")
                  }
                />
                <InfoBox
                  label={L("dayType", "Day type")}
                  value={getHolidayTypeLabel(lang, billInLang.holidayType)}
                />
                <InfoBox
                  label={ui.pickupDetails}
                  value={
                    selectedPickupServices.length
                      ? `${selectedPickupServices.length} ${ui.selectedCount}`
                      : ui.notSelected
                  }
                />
              </div>
            </section>

            <section className="rounded-2xl border border-white/15 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-sky-200/90 font-semibold">
                {L("contactInfo", "Contact information")}
              </div>

              <div className="mt-4 space-y-3">
                <InfoLine
                  label={L("name", "Name")}
                  value={contactName || firstGuestName || ""}
                />
                <InfoLine
                  label={L("email", "Email")}
                  value={contactEmail || ""}
                />
                <InfoLine
                  label={L("phone", "Phone")}
                  value={contactPhone || ""}
                />
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white/75">
                {ui.supportNote}
              </div>
            </section>
          </div>

          {selectedPickupServices.length > 0 && (
            <section className="rounded-2xl border border-white/15 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-sky-200/90 font-semibold">
                {ui.pickupDetails}
              </div>

              <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
                {serviceLines
                  .filter((x) => x.fixedMapUrl || x.inputText)
                  .map((x) => (
                    <div
                      key={x.key}
                      className="rounded-2xl border border-white/12 bg-white/8 p-4"
                    >
                      <div className="text-sm font-semibold text-white">{x.label}</div>

                      {x.fixedMapUrl ? (
                        <a
                          href={x.fixedMapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex h-10 items-center rounded-full border border-sky-300/40 bg-sky-400/10 px-4 text-sm font-medium text-sky-200 hover:bg-sky-400/20"
                        >
                          {L("viewMap", "View map")}
                        </a>
                      ) : (
                        <div className="mt-2 text-sm text-white/80 break-words">
                          {x.inputText}
                        </div>
                      )}
                    </div>
                  ))}
              </div>

              {missingPickupAddress ? (
                <p className="mt-3 text-sm text-red-300">{ui.pickupAddressMissing}</p>
              ) : null}
            </section>
          )}

          {noKhauPhaPkg2Pickup && (
            <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4">
              <p className="text-sm text-amber-100">{ui.noPickupSelected}</p>
            </div>
          )}

          <section className="rounded-2xl border border-white/15 bg-black/20 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPassengers((v) => !v)}
              className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left hover:bg-white/5"
            >
              <div className="flex items-center gap-3">
                <div className="text-xs uppercase tracking-[0.18em] text-sky-200/90 font-semibold">
                  {ui.passengerList}
                </div>
                <span className="rounded-full bg-red-500/20 px-2.5 py-1 text-xs font-semibold text-red-100">
                  {(data.guests ?? []).length}
                </span>
              </div>

              <span className={`transition-transform ${showPassengers ? "rotate-180" : ""}`}>
                ▾
              </span>
            </button>

            {showPassengers && (
              <div className="border-t border-white/10 p-4 space-y-3">
                {(data.guests ?? []).map((g: any, i: number) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-white/12 bg-white/8 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 text-sm font-bold text-red-100">
                        {i + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white">{g.fullName}</p>

                        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-white/70">
                          <MiniInfo label={L("dob", "DOB")} value={g.dob} />
                          <MiniInfo label={L("gender", "Gender")} value={g.gender} />
                          {g.idNumber ? (
                            <MiniInfo label={L("idNumber", "ID")} value={g.idNumber} />
                          ) : null}
                          {g.nationality ? (
                            <MiniInfo
                              label={L("nationality", "Nationality")}
                              value={g.nationality}
                            />
                          ) : null}
                          {g.weightKg ? (
                            <MiniInfo
                              label={L("weightKg", "Weight")}
                              value={`${g.weightKg}kg`}
                            />
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {!!specialRequest && (
            <div className="rounded-2xl border border-yellow-400/40 bg-yellow-400/10 p-4">
              <p className="text-xs font-semibold text-yellow-200 mb-1">
                {L("specialRequest", "Special requests")}
              </p>
              <p className="text-sm text-yellow-100 break-words">{specialRequest}</p>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-5">
            <section className="rounded-2xl border border-white/15 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-sky-200/90 font-semibold">
                {L("additionalServices", "Additional services")}
              </div>

              <div className="mt-4 space-y-3">
                <Row
                  label={L("hotelTransfer", "Pickup / transfer")}
                  value={
                    selectedPickupServices.length
                      ? `${selectedPickupServices.length}`
                      : L("no", "No")
                  }
                  enabled={!!selectedPickupServices.length}
                />
                <Row
                  label={L("camera360", "Camera 360")}
                  value={
                    getAddonQty("camera360")
                      ? `${getAddonQty("camera360")} pax`
                      : L("no", "No")
                  }
                  enabled={!!getAddonQty("camera360")}
                />
                <Row
                  label={L("drone", "Drone/Flycam")}
                  value={
                    getAddonQty("flycam")
                      ? `${getAddonQty("flycam")} pax`
                      : L("no", "No")
                  }
                  enabled={!!getAddonQty("flycam")}
                />

                <SimpleInfo label={L("gopro", "GoPro")} value={L("free", "Free")} />
                <SimpleInfo label={L("drinks", "Drinks")} value={L("free", "Free")} />
                <SimpleInfo
                  label={L("certificate", "Certificate")}
                  value={L("included", "Included")}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-white/15 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-sky-200/90 font-semibold">
                {L("priceBreakdown", "Price breakdown")}
              </div>

              <div className="mt-4 space-y-3">
                {priceLines.map((line, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start justify-between gap-3 ${
                      line.type === "discount" ? "text-red-300" : "text-white/90"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-white/70 break-words">{line.label}</p>
                      {line.detail ? (
                        <p className="mt-1 text-xs text-white/45 break-words">
                          {line.detail}
                        </p>
                      ) : null}
                    </div>

                    <span className="whitespace-nowrap text-sm font-semibold">
                      {line.amountText}
                    </span>
                  </div>
                ))}

                <div className="h-px bg-white/10" />

                <div className="flex items-center justify-between gap-3">
                  <span className="text-lg font-bold">{L("totalCost", "Total")}</span>
                  <span className="text-xl font-bold">{totalText}</span>
                </div>
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-white/15 bg-black/20 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-sky-200/90 font-semibold">
              {ui.paymentTitle}
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-white/80">
              <PaymentItem text={L("cashPayment", "Cash payment")} />
              <PaymentItem text={L("bankTransfer", "Bank transfer")} />
              <PaymentItem text={L("paypalPayment", "PayPal")} />
              <PaymentItem text={L("creditCard", "Credit card")} />
            </div>
          </section>

          <section className="rounded-2xl border border-white/15 bg-black/20 p-4">
            <TurnstileWidget
              key={turnstileKey}
              onVerify={(token) => setTurnstileToken(token)}
              onExpire={() => setTurnstileToken("")}
              onError={() => setTurnstileToken("")}
              lang={lang}
              theme="dark"
            />
          </section>

          <label className="flex items-start gap-3 rounded-2xl border border-white/12 bg-black/15 p-4">
            <input
              type="checkbox"
              checked={!!data.acceptedTerms}
              onChange={(e) => update({ acceptedTerms: e.target.checked })}
              className="mt-1 h-4 w-4 accent-green-500"
            />
            <span className="text-sm text-white">
              {(t as any)?.labels?.termsText ?? "I agree to the terms"}{" "}
              <button
                type="button"
                onClick={() => setShowTerms(true)}
                className="text-sky-300 underline"
              >
                {(t as any)?.labels?.viewTerms ?? "View terms"}
              </button>
            </span>
          </label>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/50 bg-red-900/35 p-4 text-sm text-white">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={back}
          className="h-12 rounded-full border border-white/25 bg-black/25 px-5 text-sm font-medium text-white hover:bg-black/35"
        >
          {t.buttons.back}
        </button>

        <button
          disabled={!data.acceptedTerms || !turnstileToken || submitting || missingPickupAddress}
          onClick={handleConfirm}
          className="h-12 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 px-6 text-sm font-semibold text-slate-950 shadow-[0_10px_30px_rgba(45,212,191,0.32)] transition hover:brightness-105 disabled:opacity-50"
        >
          {submitting ? t.buttons.processing : t.buttons.confirm}
        </button>
      </div>

      {showTerms && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowTerms(false)}
          />
          <div className="relative mx-auto my-6 flex h-[min(92vh,860px)] w-[min(96vw,1040px)] flex-col overflow-hidden rounded-[28px] border border-white/15 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/6 px-4 py-3">
              <span className="text-sm font-medium text-white">{ui.termsTitle}</span>

              <div className="flex items-center gap-3">
                <a
                  href={termsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-sky-300 underline"
                >
                  {ui.openInNewTab}
                </a>
                <button
                  onClick={() => setShowTerms(false)}
                  className="rounded-full border border-white/20 px-3 py-1.5 text-sm text-white hover:bg-white/8"
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

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.14em] text-white/55">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white break-words">{value}</div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
      <span className="text-sm text-white/65">{label}</span>
      <span className="text-sm font-semibold text-white text-right break-words">
        {value}
      </span>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/15 px-3 py-2">
      <span className="font-medium text-white/60">{label}:</span>{" "}
      <span className="text-white">{value}</span>
    </div>
  );
}

function SimpleInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
      <span className="text-sm text-white/70">{label}</span>
      <span className="text-sm font-semibold text-sky-200">{value}</span>
    </div>
  );
}

function PaymentItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
      <span className="text-emerald-300">✔</span>
      <span>{text}</span>
    </div>
  );
}