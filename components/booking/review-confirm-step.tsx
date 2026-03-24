"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
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

type LangUI = "vi" | "en" | "fr" | "ru" | "hi" | "zh";

type LocalizedValue =
  | string
  | Partial<Record<LangUI | "vi" | "en", string>>
  | undefined;

type PackageLike = {
  key?: string;
  label?: LocalizedValue;
  name?: LocalizedValue;
  title?: LocalizedValue;
};

type PriceLine = {
  label: string;
  detail?: string;
  amountText: string;
  type?: "normal" | "discount";
};

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
      "Ce vol ne comprend pas le transfert vers le point de départ. Veuillez arriver 15 minutes à l'avance pour l'enregistrement.",
    pickupAddressMissing:
      "Veuillez renseigner l'adresse de prise en charge pour le service sélectionné.",
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
      "Après l'envoi de la réservation, notre équipe vous contactera pour confirmer l'horaire, les services et la météo.",
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

function getLocalizedText(value: unknown, lang: string, fallback = "") {
  if (!value) return fallback;
  if (typeof value === "string") return value;

  if (typeof value === "object") {
    const obj = value as Record<string, string | undefined>;
    return obj[lang] || obj.en || obj.vi || fallback;
  }

  return fallback;
}

function extractPackages(rawPackages: unknown): PackageLike[] {
  if (Array.isArray(rawPackages)) {
    return rawPackages as PackageLike[];
  }

  if (rawPackages && typeof rawPackages === "object") {
    return Object.values(rawPackages as Record<string, unknown>) as PackageLike[];
  }

  return [];
}

function getFlightTypeLabel(lang: string, key?: string) {
  const ui = UI_I18N[lang] ?? UI_I18N.vi;
  if (key === "paramotor") return ui.paramotor;
  if (key === "paragliding") return ui.paragliding;
  return ui.notSelected;
}

function getHolidayTypeLabel(
  lang: string,
  holidayType?: "weekday" | "weekend" | "holiday",
) {
  const ui = UI_I18N[lang] ?? UI_I18N.vi;
  if (holidayType === "holiday") return ui.holiday;
  if (holidayType === "weekend") return ui.weekend;
  return ui.weekday;
}

function resolveFlightTypeKey(cfg: any, selected?: string) {
  if (selected === "paramotor" || selected === "paragliding") {
    return selected;
  }

  const candidates = [
    cfg?.defaultFlightTypeKey,
    cfg?.defaultFlightType,
    cfg?.flightTypeKey,
    cfg?.flightType,
    cfg?.type,
  ];

  const found = candidates.find(
    (value) => value === "paramotor" || value === "paragliding",
  );

  return (found as string | undefined) || "paragliding";
}

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
    <div className="flex items-start justify-between gap-3 rounded-lg border border-[#DCE7F3] bg-[#F5F7FA] px-4 py-3">
      <span className="text-sm text-[#5B6B7A]">{label}</span>
      <span
        className={`text-right text-sm font-semibold ${
          enabled ? "text-[#1C2930]" : "text-[#94A3B8]"
        }`}
      >
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

  const cfg = data.location ? LOCATIONS[data.location] : undefined;

  const packages = useMemo(() => extractPackages(cfg?.packages), [cfg?.packages]);

  const selectedPackage = useMemo(() => {
    return packages.find((pkg) => pkg?.key === data.packageKey);
  }, [packages, data.packageKey]);

  const packageLabel = useMemo(() => {
    if (!selectedPackage) return ui.notSelected;

    return getLocalizedText(
      selectedPackage.label || selectedPackage.name || selectedPackage.title,
      lang,
      ui.notSelected,
    );
  }, [selectedPackage, lang, ui.notSelected]);

  const resolvedFlightTypeKey = useMemo(() => {
    return resolveFlightTypeKey(cfg, data.flightTypeKey);
  }, [cfg, data.flightTypeKey]);

  const locationName = useMemo(() => {
    return getLocalizedText(
      cfg?.name,
      lang,
      data.location || ((t as any)?.labels?.flight as string) || "Flight",
    );
  }, [cfg?.name, data.location, lang, t]);

  const visibleSelectedServices = useMemo(() => {
    if (!cfg?.services?.length) return [];

    return cfg.services.filter((svc: any) => {
      if (svc.visibleForPackages?.length) {
        if (!data.packageKey) return false;
        if (!svc.visibleForPackages.includes(data.packageKey as any)) return false;
      }

      return !!data.services?.[svc.key]?.selected;
    });
  }, [cfg?.services, data.packageKey, data.services]);

  const selectedPickupServices = useMemo(() => {
    return visibleSelectedServices.filter(
      (svc: any) => svc.requiresPickupInput || svc.fixedMapUrl,
    );
  }, [visibleSelectedServices]);

  const missingPickupAddress = useMemo(() => {
    return selectedPickupServices.some((svc: any) => {
      if (svc.fixedMapUrl) return false;
      if (!svc.requiresPickupInput) return false;

      return !(data.services?.[svc.key]?.inputText || "").trim();
    });
  }, [selectedPickupServices, data.services]);

  const serviceLines = useMemo(() => {
    return visibleSelectedServices.map((svc: any) => {
      const label = getLocalizedText(svc.label, lang, String(svc.key));
      const inputText = data.services?.[svc.key]?.inputText || "";

      return {
        key: svc.key,
        label,
        inputText,
        fixedMapUrl: svc.fixedMapUrl,
      };
    });
  }, [visibleSelectedServices, data.services, lang]);

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
    lang,
  );

  const guestsCount = Math.max(1, data.guestsCount || 1);

  const getServiceLineTotal = useCallback(
    (svc: any): number => {
      const serviceState = data.services?.[svc.key];
      if (!serviceState?.selected) return 0;

      const qty = Math.max(1, serviceState.qty || 1);
      const unitPrice = lang === "vi"
        ? Number(svc.priceVND || 0)
        : Number(svc.priceUSD || 0);

      const key = String(svc.key || "");

      if (
        key === "khau_pha_paragliding_garrya_pickup" ||
        key === "khau_pha_paramotor_garrya_pickup"
      ) {
        const carCount = Math.ceil(guestsCount / 4);
        return lang === "vi" ? carCount * 700_000 : carCount * 28;
      }

      if (key === "ha_noi_private_hotel_pickup") {
        return lang === "vi"
          ? 1_500_000 + Math.max(0, guestsCount - 3) * 350_000
          : 60 + Math.max(0, guestsCount - 3) * 14;
      }

      if (svc.controlType === "counter") {
        return unitPrice * qty;
      }

      return unitPrice * guestsCount;
    },
    [data.services, guestsCount, lang],
  );

  const selectedServicesTotal = useMemo(() => {
    if (!cfg?.services?.length) return 0;

    return cfg.services.reduce((sum: number, svc: any) => {
      if (svc.visibleForPackages?.length) {
        if (!data.packageKey) return sum;
        if (!svc.visibleForPackages.includes(data.packageKey)) return sum;
      }

      if (svc.visibleForFlightTypes?.length) {
        if (!data.flightTypeKey) return sum;
        if (!svc.visibleForFlightTypes.includes(data.flightTypeKey)) return sum;
      }

      const serviceState = data.services?.[svc.key];
      if (!serviceState?.selected) return sum;

      return sum + getServiceLineTotal(svc);
    }, 0);
  }, [cfg?.services, data.packageKey, data.flightTypeKey, data.services, getServiceLineTotal]);

  const formatMoney = (n: number) => {
    return lang === "vi"
      ? new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
        }).format(Number(n || 0))
      : `${Number(n || 0).toLocaleString("en-US")} USD`;
  };

  const formatDate = (iso?: string) => {
    if (!iso) return ui.notSelected;

    const d = new Date(iso);

    const localeMap: Record<string, string> = {
      vi: "vi-VN",
      en: "en-US",
      fr: "fr-FR",
      ru: "ru-RU",
      hi: "hi-IN",
      zh: "zh-CN",
    };

    return new Intl.DateTimeFormat(localeMap[lang] || "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(d);
  };

  const pax = data.guestsCount || 1;

  const getAddonQty = (k: AddonKey) => {
    const qty =
      (data.addonsQty?.[k] ?? 0) || (data.addons?.[k] ? data.guestsCount : 0);

    return Math.max(0, Math.min(data.guestsCount || 1, Number(qty) || 0));
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
  const firstGuestName = ((data as any)?.guests?.[0]?.fullName ?? "").toString();

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

    if (cfg?.services?.length) {
      cfg.services.forEach((svc: any) => {
        if (svc.visibleForPackages?.length) {
          if (!data.packageKey) return;
          if (!svc.visibleForPackages.includes(data.packageKey)) return;
        }

        if (svc.visibleForFlightTypes?.length) {
          if (!data.flightTypeKey) return;
          if (!svc.visibleForFlightTypes.includes(data.flightTypeKey)) return;
        }

        const serviceState = data.services?.[svc.key];
        if (!serviceState?.selected) return;

        const qty = Math.max(1, serviceState.qty || 1);
        const lineTotal = getServiceLineTotal(svc);

        if (lineTotal <= 0) return;

        const label = getLocalizedText(svc.label, lang, String(svc.key));
        const unitPrice = lang === "vi"
          ? Number(svc.priceVND || 0)
          : Number(svc.priceUSD || 0);

        const key = String(svc.key || "");
        let detailText = "";

        if (
          key === "khau_pha_paragliding_garrya_pickup" ||
          key === "khau_pha_paramotor_garrya_pickup"
        ) {
          const carCount = Math.ceil(guestsCount / 4);
          const carPrice = lang === "vi" ? 700_000 : 28;
          detailText = `${formatMoney(carPrice)} × ${carCount} xe`;
        } else if (key === "ha_noi_private_hotel_pickup") {
          detailText = "";
        } else if (svc.controlType === "counter") {
          detailText = `${formatMoney(unitPrice)} × ${qty}`;
        } else {
          detailText = `${formatMoney(unitPrice)} × ${guestsCount}`;
        }

        lines.push({
          label,
          detail: detailText,
          amountText: formatMoney(lineTotal),
          type: "normal",
        });
      });
    }

    const addonLabel: Record<string, string> = {
      pickup: (t as any)?.labels?.pickupCost ?? "Pickup",
      camera360: (t as any)?.labels?.camera360Cost ?? "Camera 360",
      flycam: (t as any)?.labels?.droneCost ?? "Drone/Flycam",
    };

    (["pickup", "camera360", "flycam"] as AddonKey[]).forEach((key) => {
      const qty = Number((billInLang as any)?.addonsQty?.[key] || 0);
      if (!qty) return;

      const unit = Number((billInLang as any)?.addonsUnitPrice?.[key] || 0);
      const sub =
        Number((billInLang as any)?.addonsTotal?.[key] || 0) || unit * qty;

      lines.push({
        label: addonLabel[key] ?? String(key),
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

    const grandTotal = Number(billInLang.totalAfterDiscount || 0) + selectedServicesTotal;

    return {
      priceLines: lines,
      totalText: formatMoney(grandTotal),
    };
  }, [
    billInLang,
    cfg?.services,
    data.packageKey,
    data.flightTypeKey,
    data.services,
    guestsCount,
    pax,
    lang,
    t,
    getServiceLineTotal,
    selectedServicesTotal,
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
        locationName,
        packageLabel,
        flightTypeLabel: getFlightTypeLabel(lang, resolvedFlightTypeKey),

        price: {
          currency: billInLang.currency,
          perPerson: billInLang.totalPerPerson,
          basePerPerson: billInLang.basePricePerPerson,
          discountPerPerson: billInLang.discountPerPerson,
          addonsQty: (billInLang as any).addonsQty,
          addonsUnitPrice: (billInLang as any).addonsUnitPrice,
          addonsTotal: (billInLang as any).addonsTotal,
          servicesTotal: selectedServicesTotal,
          total: Number(billInLang.totalAfterDiscount || 0) + selectedServicesTotal,
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
          e?.data?.message || "Turnstile validation failed. Please try again.",
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

  const pickupAddonQty = getAddonQty("pickup");
  const camera360Qty = getAddonQty("camera360");
  const flycamQty = getAddonQty("flycam");

  const selectedServicesCount = visibleSelectedServices.length;

  const noPickupSelected =
    selectedPickupServices.length === 0 &&
    pickupAddonQty === 0 &&
    visibleSelectedServices.some(
      (svc: any) => svc.key?.toString().toLowerCase().includes("pickup"),
    );

  const hasPackages = cfg?.packages && cfg.packages.length > 0;
  const showPackageRow = hasPackages || data.location === "khau_pha";

  const serviceDetails = [
    {
      label: L("service", "Service"),
      value: locationName,
    },
    {
      label: L("numGuests", "Passengers"),
      value: String(data.guestsCount || 1),
    },
    {
      label: L("date", "Date"),
      value: formatDate(data.dateISO),
    },
    {
      label: L("timeSlot", "Time"),
      value: data.timeSlot || ui.notSelected,
    },
    ...(showPackageRow
      ? [
          {
            label: ui.packageLabel,
            value: packageLabel,
          },
        ]
      : []),
    {
      label: ui.flightTypeLabel,
      value: getFlightTypeLabel(lang, resolvedFlightTypeKey),
    },
    {
      label: L("dayType", "Day type"),
      value: getHolidayTypeLabel(lang, billInLang.holidayType),
    },
    {
      label: L("selectedServices", "Selected services"),
      value:
        selectedServicesCount > 0
          ? `${selectedServicesCount} ${ui.selectedCount}`
          : ui.notSelected,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-xl border border-[#DCE7F3] bg-white shadow-sm">
        <div className="border-b border-[#DCE7F3] bg-[#0194F3] px-4 py-4 md:px-6">
          <h3 className="text-lg font-bold text-white md:text-xl">{ui.title}</h3>
          <p className="mt-1 max-w-3xl text-sm text-white/90">{ui.subtitle}</p>
        </div>

        <div className="space-y-5 bg-[#F5F7FA] p-4 md:p-6">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.95fr]">
            <section className="rounded-xl border border-[#DCE7F3] bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0194F3]">
                {L("serviceDetails", "Service details")}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                {serviceDetails.map((item) => (
                  <InfoBox
                    key={item.label}
                    label={item.label}
                    value={item.value}
                  />
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-[#DCE7F3] bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0194F3]">
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

              <div className="mt-4 rounded-lg border border-[#B9DDFB] bg-[#EAF4FE] px-4 py-3 text-sm text-[#355166]">
                {ui.supportNote}
              </div>
            </section>
          </div>

          {selectedPickupServices.length > 0 && (
            <section className="rounded-xl border border-[#DCE7F3] bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0194F3]">
                {ui.pickupDetails}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                {serviceLines
                  .filter((item) => item.fixedMapUrl || item.inputText)
                  .map((item) => (
                    <div
                      key={item.key}
                      className="rounded-lg border border-[#DCE7F3] bg-[#F5F7FA] p-4"
                    >
                      <div className="text-sm font-semibold text-[#1C2930]">
                        {item.label}
                      </div>

                      {item.fixedMapUrl ? (
                        <a
                          href={item.fixedMapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex h-10 items-center rounded-lg border border-[#0194F3] bg-[#EAF4FE] px-4 text-sm font-medium text-[#0194F3] transition hover:bg-[#0194F3] hover:text-white"
                        >
                          {L("viewMap", "View map")}
                        </a>
                      ) : (
                        <div className="mt-2 break-words text-sm text-[#5B6B7A]">
                          {item.inputText}
                        </div>
                      )}
                    </div>
                  ))}
              </div>

              {missingPickupAddress ? (
                <p className="mt-3 text-sm text-[#DC2626]">{ui.pickupAddressMissing}</p>
              ) : null}
            </section>
          )}

          {noPickupSelected && (
            <div className="rounded-lg border border-[#FF5E1F] bg-[#FFF4ED] p-4">
              <p className="text-sm text-[#FF5E1F]">{ui.noPickupSelected}</p>
            </div>
          )}

          <section className="overflow-hidden rounded-xl border border-[#DCE7F3] bg-white">
            <button
              type="button"
              onClick={() => setShowPassengers((v) => !v)}
              className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-[#F5F7FA]"
            >
              <div className="flex items-center gap-3">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0194F3]">
                  {ui.passengerList}
                </div>
                <span className="rounded-full bg-[#EAF4FE] px-2.5 py-1 text-xs font-semibold text-[#0194F3]">
                  {(data.guests ?? []).length}
                </span>
              </div>

              <span
                className={`text-[#5B6B7A] transition-transform ${
                  showPassengers ? "rotate-180" : ""
                }`}
              >
                ▾
              </span>
            </button>

            {showPassengers && (
              <div className="space-y-3 border-t border-[#DCE7F3] p-4">
                {(data.guests ?? []).map((guest: any, index: number) => (
                  <div
                    key={index}
                    className="rounded-lg border border-[#DCE7F3] bg-[#F5F7FA] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EAF4FE] text-sm font-bold text-[#0194F3]">
                        {index + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#1C2930]">
                          {guest.fullName}
                        </p>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#5B6B7A] md:grid-cols-3">
                          <MiniInfo label={L("dob", "DOB")} value={guest.dob || ui.notSelected} />
                          <MiniInfo
                            label={L("gender", "Gender")}
                            value={guest.gender || ui.notSelected}
                          />
                          <MiniInfo
                            label={L("idNumber", "ID")}
                            value={guest.idNumber || ui.notSelected}
                          />
                          <MiniInfo
                            label={L("nationality", "Nationality")}
                            value={guest.nationality || ui.notSelected}
                          />
                          <MiniInfo
                            label={L("weightKg", "Weight")}
                            value={
                              guest.weightKg
                                ? `${guest.weightKg}kg`
                                : ui.notSelected
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {!!specialRequest && (
            <div className="rounded-lg border border-[#FF5E1F] bg-[#FFF4ED] p-4">
              <p className="mb-1 text-xs font-semibold text-[#FF5E1F]">
                {L("specialRequest", "Special requests")}
              </p>
              <p className="break-words text-sm text-[#1C2930]">{specialRequest}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
            <section className="rounded-xl border border-[#DCE7F3] bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0194F3]">
                {L("additionalServices", "Additional services")}
              </div>

              <div className="mt-4 space-y-3">
                <Row
                  label={L("hotelTransfer", "Pickup / transfer")}
                  value={
                    selectedPickupServices.length
                      ? `${selectedPickupServices.length}`
                      : pickupAddonQty
                        ? `${pickupAddonQty} pax`
                        : L("no", "No")
                  }
                  enabled={!!selectedPickupServices.length || !!pickupAddonQty}
                />
                <Row
                  label={L("camera360", "Camera 360")}
                  value={camera360Qty ? `${camera360Qty} pax` : L("no", "No")}
                  enabled={!!camera360Qty}
                />
                <Row
                  label={L("drone", "Drone/Flycam")}
                  value={flycamQty ? `${flycamQty} pax` : L("no", "No")}
                  enabled={!!flycamQty}
                />

                <SimpleInfo label={L("gopro", "GoPro")} value={L("free", "Free")} />
                <SimpleInfo label={L("drinks", "Drinks")} value={L("free", "Free")} />
                <SimpleInfo
                  label={L("certificate", "Certificate")}
                  value={L("included", "Included")}
                />
              </div>
            </section>

            <section className="rounded-xl border border-[#D6EAFB] bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0194F3]">
                {L("priceBreakdown", "Price breakdown")}
              </div>

              <div className="mt-4 space-y-3">
                {priceLines.map((line, index) => (
                  <div
                    key={index}
                    className={`flex items-start justify-between gap-3 ${
                      line.type === "discount" ? "text-[#16A34A]" : "text-[#1C2930]"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="break-words text-sm text-[#5B6B7A]">
                        {line.label}
                      </p>
                      {line.detail ? (
                        <p className="mt-1 break-words text-xs text-[#94A3B8]">
                          {line.detail}
                        </p>
                      ) : null}
                    </div>

                    <span className="whitespace-nowrap text-sm font-semibold">
                      {line.amountText}
                    </span>
                  </div>
                ))}

                <div className="h-px bg-[#DCE7F3]" />

                <div className="flex items-center justify-between gap-3">
                  <span className="text-lg font-bold text-[#1C2930]">
                    {L("totalCost", "Total")}
                  </span>
                  <span className="text-xl font-bold text-[#FF5E1F]">
                    {totalText}
                  </span>
                </div>
              </div>
            </section>
          </div>

          <section className="rounded-xl border border-[#DCE7F3] bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0194F3]">
              {ui.paymentTitle}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-[#5B6B7A] md:grid-cols-2">
              <PaymentItem text={L("cashPayment", "Cash payment")} />
              <PaymentItem text={L("bankTransfer", "Bank transfer")} />
              <PaymentItem text={L("paypalPayment", "PayPal")} />
              <PaymentItem text={L("creditCard", "Credit card")} />
            </div>
          </section>

          <section className="rounded-xl border border-[#DCE7F3] bg-white p-4">
            <TurnstileWidget
              key={turnstileKey}
              onVerify={(token) => setTurnstileToken(token)}
              onExpire={() => setTurnstileToken("")}
              onError={() => setTurnstileToken("")}
              lang={lang}
              theme="light"
            />
          </section>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#DCE7F3] bg-white p-4 transition hover:border-[#B9DDFB]">
            <input
              type="checkbox"
              checked={!!data.acceptedTerms}
              onChange={(e) => update({ acceptedTerms: e.target.checked })}
              className="mt-1 h-4 w-4 rounded border-[#DCE7F3] text-[#0194F3] focus:ring-[#0194F3]"
            />
            <span className="text-sm text-[#1C2930]">
              {(t as any)?.labels?.termsText ?? "I agree to the terms"}{" "}
              <button
                type="button"
                onClick={() => setShowTerms(true)}
                className="text-[#0194F3] underline"
              >
                {(t as any)?.labels?.viewTerms ?? "View terms"}
              </button>
            </span>
          </label>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-[#DC2626] bg-red-50 p-4 text-sm text-[#DC2626]">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={back}
          className="h-12 rounded-xl border border-[#DCE7F3] bg-white px-5 text-sm font-medium text-[#5B6B7A] transition hover:border-[#B9DDFB] hover:bg-[#F5F7FA]"
        >
          {t.buttons.back}
        </button>

        <button
          type="button"
          disabled={
            !data.acceptedTerms ||
            !turnstileToken ||
            submitting ||
            missingPickupAddress
          }
          onClick={handleConfirm}
          className="h-12 rounded-xl bg-[#0194F3] px-6 text-sm font-semibold text-white shadow-md transition hover:bg-[#0B83D9] disabled:bg-[#B9DDFB] disabled:shadow-none"
        >
          {submitting ? t.buttons.processing : t.buttons.confirm}
        </button>
      </div>

      {showTerms && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowTerms(false)}
          />
          <div className="relative mx-auto my-6 flex h-[min(92vh,860px)] w-[min(96vw,1040px)] flex-col overflow-hidden rounded-xl border border-[#DCE7F3] bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-[#DCE7F3] bg-[#F5F7FA] px-4 py-3">
              <span className="text-sm font-semibold text-[#1C2930]">
                {ui.termsTitle}
              </span>

              <div className="flex items-center gap-3">
                <a
                  href={termsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-[#0194F3] underline"
                >
                  {ui.openInNewTab}
                </a>
                <button
                  type="button"
                  onClick={() => setShowTerms(false)}
                  className="rounded-lg border border-[#DCE7F3] px-3 py-1.5 text-sm text-[#5B6B7A] transition hover:bg-[#EAF4FE]"
                >
                  {ui.close}
                </button>
              </div>
            </div>

            <div
              className="prose prose-sm max-w-none flex-1 overflow-y-auto p-6 text-[#1C2930]
                [&_h1]:mb-4 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-[#1C2930]
                [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-[#1C2930]
                [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-[#1C2930]
                [&_p]:mb-3 [&_p]:leading-relaxed
                [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5
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
    <div className="rounded-lg border border-[#DCE7F3] bg-[#F5F7FA] px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.14em] text-[#5B6B7A]">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-semibold text-[#1C2930]">
        {value}
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-[#DCE7F3] bg-[#F5F7FA] px-4 py-3">
      <span className="text-sm text-[#5B6B7A]">{label}</span>
      <span className="break-words text-right text-sm font-semibold text-[#1C2930]">
        {value}
      </span>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#DCE7F3] bg-white px-3 py-2">
      <span className="font-medium text-[#5B6B7A]">{label}:</span>{" "}
      <span className="text-[#1C2930]">{value}</span>
    </div>
  );
}

function SimpleInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[#DCE7F3] bg-[#F5F7FA] px-4 py-3">
      <span className="text-sm text-[#5B6B7A]">{label}</span>
      <span className="text-sm font-semibold text-[#16A34A]">{value}</span>
    </div>
  );
}

function PaymentItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[#DCE7F3] bg-[#F5F7FA] px-4 py-3">
      <span className="text-[#16A34A]">✔</span>
      <span className="text-[#1C2930]">{text}</span>
    </div>
  );
}