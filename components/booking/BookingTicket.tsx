"use client";

import React, { useMemo } from "react";
import type { BookingData } from "@/store/booking-store";
import {
  LOCATIONS,
  formatByLang,
  type AddonKey,
  type ComputeResult,
} from "@/lib/booking/calculate-price";
import type { LangCode } from "@/lib/booking/translations-booking";
import { bookingTranslations } from "@/lib/booking/translations-booking";

const ADDON_KEYS: AddonKey[] = ["pickup", "flycam", "camera360"];

type Props = {
  booking: BookingData;
  totals: ComputeResult;
  lang: LangCode;
  bookingResult?: any;
};

type PriceLine = {
  label: string;
  detail?: string;
  amountText: string;
  type?: "normal" | "discount";
};

const C = {
  bg: "#ffffff",
  card: "#F5F7FA",
  text: "#1C2930",
  subtext: "#5B6B7A",
  muted: "#5B6B7A",
  border: "#DCE7F3",
  line: "#DCE7F3",
  accent: "#0194F3",
  accentDark: "#0B83D9",
  accentSoft: "#EAF4FE",
  success: "#16A34A",
  warningBg: "#FFF4ED",
  warningBorder: "#FF5E1F",
  warningText: "#9a3412",
  totalBg: "#0194F3",
  white: "#ffffff",
  badgeBg: "#EAF4FE",
  badgeText: "#0194F3",
  orange: "#FF5E1F",
  orangeSoft: "#FFF4ED",
};

function digitsOnly(s: string) {
  return (s || "").replace(/\D+/g, "");
}

function normalizeDateToYYYYMMDD(dateISO?: string) {
  const raw = (dateISO || "").trim();
  if (!raw) return "";
  const parts = raw.split(/[\/\-]/).map((p) => p.trim());
  if (parts.length !== 3) return "";
  if (parts[0].length === 4) {
    const [yyyy, mm, dd] = parts;
    return `${yyyy}${mm.padStart(2, "0")}${dd.padStart(2, "0")}`;
  }
  if (parts[2].length === 4) {
    const [dd, mm, yyyy] = parts;
    return `${yyyy}${mm.padStart(2, "0")}${dd.padStart(2, "0")}`;
  }
  return "";
}

function formatDateDisplay(dateISO?: string) {
  const raw = (dateISO || "").trim();
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function splitInputEntries(raw?: string) {
  return String(raw || "")
    .split(/\r?\n|[,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildBookingRef(dateISO?: string, phone?: string) {
  const ymd = normalizeDateToYYYYMMDD(dateISO);
  const phoneDigits = digitsOnly(phone || "");
  const last4 = phoneDigits ? phoneDigits.slice(-4) : "";
  if (ymd && last4) return `${ymd}-${last4}`;
  return `MBL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function useTicketLabels(lang: LangCode) {
  const L = lang as unknown as string;
  const t = (bookingTranslations as any)[L] ?? bookingTranslations.en;

  const isVI = L === "vi";
  const isFR = L === "fr";
  const isRU = L === "ru";
  const isHI = L === "hi";
  const isZH = L === "zh" || L === "zh-CN" || L === "zh-Hans";
  const isZHTW = L === "zh-TW" || L === "zh-Hant";

  const zh = (simplified: string, traditional: string) =>
    isZHTW ? traditional : simplified;

  return {
    title: isVI
      ? "Vé đặt bay"
      : isFR
        ? "Billet de réservation"
        : isRU
          ? "Билет на полёт"
          : isHI
            ? "बुकिंग टिकट"
            : isZH || isZHTW
              ? zh("预订票", "預訂票")
              : "Booking Ticket",
    subtitle: isVI
      ? "Xác nhận thông tin đặt bay"
      : isFR
        ? "Confirmation des détails"
        : isRU
          ? "Подтверждение dữ liệu"
          : isHI
            ? "बुकिंग विवरण पुष्टि"
            : isZH || isZHTW
              ? zh("请确认预订信息", "請確認預訂資訊")
              : "Booking details confirmed",
    created: isVI
      ? "Tạo lúc"
      : isFR
        ? "Créé le"
        : isRU
          ? "Создано"
          : isHI
            ? "बनाया गया"
            : isZH || isZHTW
              ? zh("创建时间", "建立時間")
              : "Created",
    confirmed: isVI
      ? "Đã xác nhận"
      : isFR
        ? "Confirmé"
        : isRU
          ? "Подтверждено"
          : isHI
            ? "पुष्ट"
            : isZH || isZHTW
              ? zh("已确认", "已確認")
              : "Confirmed",
    brandName: "MEBAYLUON PARAGLIDING",
    serviceDetails: isVI ? "Thông tin chuyến bay" : isFR ? "Détails du vol" : isRU ? "Детали полёта" : isHI ? "फ्लाइट विवरण" : isZH || isZHTW ? zh("飞行信息", "飛行資訊") : "Flight details",
    contactInfo: (t as any)?.labels?.contactInfo ?? "Contact information",
    passengersList: isVI ? "Danh sách hành khách" : isFR ? "Liste des passagers" : isRU ? "Список пассажиров" : isHI ? "यात्रियों की सूची" : isZH || isZHTW ? zh("乘客名单", "乘客名單") : "Passengers",
    additionalServices: isVI ? "Dịch vụ đã chọn" : isFR ? "Services sélectionnés" : isRU ? "Выбранные услуги" : isHI ? "चयनित सेवाएँ" : isZH || isZHTW ? zh("已选服务", "已選服務") : "Selected services",
    priceBreakdown: isVI ? "Chi tiết giá" : isFR ? "Détail des prix" : isRU ? "Детализация цены" : isHI ? "मूल्य विवरण" : isZH || isZHTW ? zh("价格明细", "價格明細") : "Price breakdown",
    total: isVI ? "Tổng cộng" : isFR ? "Total" : isRU ? "Итого" : isHI ? "कुल" : isZH || isZHTW ? zh("总计", "總計") : "Total",
    service: isVI ? "Điểm bay" : isFR ? "Site" : isRU ? "Локация" : isHI ? "स्थान" : isZH || isZHTW ? zh("飞行点", "飛行點") : "Location",
    date: (t as any)?.labels?.date ?? "Date",
    time: (t as any)?.labels?.timeSlot ?? "Time",
    location: (t as any)?.labels?.location ?? "Location",
    guests: (t as any)?.labels?.numGuests ?? "Passengers",
    packageLabel: isVI ? "Gói bay" : isFR ? "Forfait" : isRU ? "Пакет" : isHI ? "पैकेज" : isZH || isZHTW ? zh("套餐", "套餐") : "Package",
    flightTypeLabel: isVI ? "Loại bay" : isFR ? "Type de vol" : isRU ? "Тип полёта" : isHI ? "फ्लाइट प्रकार" : isZH || isZHTW ? zh("飞行类型", "飛行類型") : "Flight type",
    dayTypeLabel: isVI ? "Loại ngày" : isFR ? "Type de jour" : isRU ? "Тип дня" : isHI ? "दिन का प्रकार" : isZH || isZHTW ? zh("日期类型", "日期類型") : "Day type",
    name: isVI ? "Tên" : "Name",
    phone: (t as any)?.labels?.phone ?? "Phone",
    email: "Email",
    pickupLocation: isVI ? "Đón / trả" : isFR ? "Prise en charge" : isRU ? "Трансфер" : isHI ? "पिकअप" : isZH || isZHTW ? zh("接送", "接送") : "Pickup",
    selectedServicesList: isVI ? "Danh sách dịch vụ" : isFR ? "Liste des services" : isRU ? "Список услуг" : isHI ? "सेवा सूची" : isZH || isZHTW ? zh("服务列表", "服務列表") : "Service list",
    specialRequests: isVI ? "Yêu cầu đặc biệt" : isFR ? "Demandes spéciales" : isRU ? "Особые запросы" : isHI ? "विशेष अनुरोध" : isZH || isZHTW ? zh("特殊要求", "特殊要求") : "Special requests",
    flightCost: isVI ? "Giá bay" : isFR ? "Prix du vol" : isRU ? "Стоимость полёта" : isHI ? "फ्लाइट शुल्क" : isZH || isZHTW ? zh("飞行费用", "飛行費用") : "Flight cost",
    camera360Cost: isVI ? "Camera 360" : "Camera 360",
    droneCost: isVI ? "Flycam / Drone" : "Drone / Flycam",
    groupDiscount: (t as any)?.labels?.groupDiscount ?? (isVI ? "Giảm giá nhóm" : "Group discount"),
    free: isVI ? "Miễn phí" : "Free",
    included: isVI ? "Bao gồm" : "Included",
    yes: isVI ? "Có" : "Yes",
    no: isVI ? "Không" : "No",
    notProvided: isVI ? "Chưa cung cấp" : isFR ? "Non fourni" : isRU ? "Не указано" : isHI ? "प्रदान नहीं" : isZH || isZHTW ? zh("未提供", "未提供") : "Not provided",
    pax: isVI ? "khách" : isFR ? "pers" : isRU ? "чел" : isHI ? "यात्री" : isZH || isZHTW ? zh("人", "人") : "pax",
    weekday: isVI ? "Ngày thường" : isFR ? "Jour ouvré" : isRU ? "Будний день" : isHI ? "कार्यदिवस" : isZH || isZHTW ? zh("工作日", "工作日") : "Weekday",
    weekend: isVI ? "Cuối tuần" : isFR ? "Week-end" : isRU ? "Выходной" : isHI ? "सप्ताहांत" : isZH || isZHTW ? zh("周末", "週末") : "Weekend",
    holiday: isVI ? "Ngày lễ" : isFR ? "Jour férié" : isRU ? "Праздничный день" : isHI ? "छुट्टी" : isZH || isZHTW ? zh("节假日", "節假日") : "Holiday",
    paragliding: isVI ? "Bay dù không động cơ" : isFR ? "Parapente" : isRU ? "Параплан" : isHI ? "पैराग्लाइडिंग" : isZH || isZHTW ? zh("无动力滑翔伞", "無動力滑翔傘") : "Paragliding",
    paramotor: isVI ? "Bay dù gắn động cơ" : isFR ? "Paramoteur" : isRU ? "Парамотор" : isHI ? "पैरामोटर" : isZH || isZHTW ? zh("动力伞", "動力傘") : "Paramotor",
    notSelected: isVI ? "Chưa chọn" : isFR ? "Non sélectionné" : isRU ? "Не выбрано" : isHI ? "चयन नहीं" : isZH || isZHTW ? zh("未选择", "未選擇") : "Not selected",
    safetyNote: isVI
      ? "Vui lòng có mặt trước 15 phút để briefing an toàn."
      : isFR
        ? "Veuillez arriver 15 minutes à l'avance pour le briefing de sécurité."
        : isRU
          ? "Пожалуйста, прибудьте за 15 минут до инструктажа по безопасности."
          : isHI
            ? "कृपया सुरक्षा ब्रीफिंग के लिए 15 मिनट पहले पहुँचें।"
            : isZH || isZHTW
              ? zh("请提前15分钟到达参加安全简报。", "請提前15分鐘到達參加安全簡報。")
              : "Please arrive 15 minutes early for safety briefing.",
  };
}

function getFlightTypeLabel(
  labels: ReturnType<typeof useTicketLabels>,
  key?: string
) {
  if (key === "paramotor") return labels.paramotor;
  if (key === "paragliding") return labels.paragliding;
  return labels.notSelected;
}

function getHolidayTypeLabel(
  labels: ReturnType<typeof useTicketLabels>,
  holidayType?: "weekday" | "weekend" | "holiday"
) {
  if (holidayType === "holiday") return labels.holiday;
  if (holidayType === "weekend") return labels.weekend;
  return labels.weekday;
}

export default function BookingTicket({
  booking,
  totals,
  lang,
  bookingResult,
}: Props) {
  const cfg = LOCATIONS[booking.location];
  const labels = useTicketLabels(lang);

  const contact: any = booking?.contact || {};
  const contactName = (
    contact?.fullName ??
    contact?.contactName ??
    ""
  ).toString();
  const contactPhone = (contact?.phone ?? "").toString();
  const contactEmail = (contact?.email ?? "").toString();
  const specialRequest = (
    contact?.specialRequest ??
    bookingResult?.specialRequest ??
    ""
  ).toString();

  const createdAt =
    bookingResult?.createdAt ||
    bookingResult?.createdAtISO ||
    new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

  const locationName = cfg?.name?.[lang] || cfg?.name?.vi || "—";
  const hasPackages = !!(cfg?.packages && cfg.packages.length > 0);

  const bookingRef = buildBookingRef(booking.dateISO, contactPhone);
  const passengers: any[] = (booking as any)?.guests ?? [];
  const guestsCount = Math.max(1, booking.guestsCount || 1);

  const packageLabel =
    cfg?.packages?.find((p: any) => p.key === booking.packageKey)?.label?.[lang] ??
    cfg?.packages?.find((p: any) => p.key === booking.packageKey)?.label?.vi ??
    labels.notSelected;

  const flightTypeLabel =
    booking.location === "khau_pha"
      ? getFlightTypeLabel(labels, booking.flightTypeKey)
      : getFlightTypeLabel(labels, "paragliding");

  const selectedServices = useMemo(() => {
    const services = cfg?.services || [];
    return services
      .filter((svc: any) => {
        if (svc.visibleForPackages?.length) {
          if (!booking.packageKey) return false;
          if (!svc.visibleForPackages.includes(booking.packageKey)) return false;
        }
        return !!booking.services?.[svc.key]?.selected;
      })
      .map((svc: any) => ({
        key: svc.key,
        label: svc.label?.[lang] ?? svc.label?.vi ?? svc.key,
        inputText: booking.services?.[svc.key]?.inputText || "",
        qty: Math.max(1, Number(booking.services?.[svc.key]?.qty || 1)),
        controlType: svc.controlType,
        priceVND: Number(svc.priceVND || 0),
        priceUSD: Number(svc.priceUSD || 0),
        requiresPickupInput: !!svc.requiresPickupInput,
        fixedMapUrl: svc.fixedMapUrl || "",
      }));
  }, [booking.packageKey, booking.services, cfg?.services, lang]);

  const selectedServiceItems = useMemo(() => {
    return selectedServices.map((svc) => {
      const inputs = splitInputEntries(svc.inputText);
      let detail: string | undefined;

      if (inputs.length) {
        detail = inputs.join(" | ");
      } else if (svc.fixedMapUrl) {
        detail = lang === "vi" ? "Xem bản đồ" : "View map";
      } else {
        detail = labels.yes;
      }

      return {
        key: String(svc.key),
        label: String(svc.label),
        detail,
      };
    });
  }, [selectedServices, lang, labels.yes]);

  const selectedAddonItems = useMemo(() => {
    const hasCameraService = selectedServices.some((svc) =>
      String(svc.key || "").toLowerCase().includes("camera360"),
    );
    const hasFlycamService = selectedServices.some((svc) => {
      const key = String(svc.key || "").toLowerCase();
      return key.includes("flycam") || key.includes("drone");
    });

    return ADDON_KEYS.map((k) => {
      const qty = Number(totals.addonsQty?.[k] || 0);
      if (qty <= 0) return null;

      if (k === "camera360" && hasCameraService) return null;
      if (k === "flycam" && hasFlycamService) return null;

      const label =
        cfg?.addons?.[k]?.label?.[lang] ??
        cfg?.addons?.[k]?.label?.vi ??
        String(k);

      return {
        key: `addon-${k}`,
        label: String(label),
        detail: `${qty} ${labels.pax}`,
      };
    }).filter(Boolean) as Array<{ key: string; label: string; detail?: string }>;
  }, [selectedServices, totals.addonsQty, cfg?.addons, lang, labels.pax]);

  const additionalServiceItems = useMemo(() => {
    return [...selectedServiceItems, ...selectedAddonItems];
  }, [selectedServiceItems, selectedAddonItems]);

  const selectedServicePriceRows = useMemo(() => {
    return selectedServices
      .map((svc) => {
        const baseUnit = lang === "vi" ? Number(svc.priceVND || 0) : Number(svc.priceUSD || 0);
        const qty = Math.max(1, Number(svc.qty || 1));

        const serviceKey = String(svc.key || "");
        let lineTotal =
          svc.controlType === "counter" ? baseUnit * qty : baseUnit * guestsCount;
        let detail: string | undefined =
          svc.controlType === "counter"
            ? `${formatByLang(lang, baseUnit, baseUnit)} × ${qty}`
            : `${formatByLang(lang, baseUnit, baseUnit)} × ${guestsCount}`;

        if (serviceKey === "khau_pha_garrya_pickup") {
          const carCount = Math.ceil(guestsCount / 4);
          const carPrice = lang === "vi" ? 600_000 : 24;
          lineTotal = carCount * carPrice;
          detail = `${formatByLang(lang, carPrice, carPrice)} × ${carCount} ${lang === "vi" ? "xe" : "car"}`;
        }

        if (serviceKey === "ha_noi_private_hotel_pickup") {
          lineTotal = lang === "vi"
            ? 1_500_000 + Math.max(0, guestsCount - 3) * 350_000
            : 60 + Math.max(0, guestsCount - 3) * 14;
          detail = undefined;
        }

        if (lineTotal <= 0) return null;

        return {
          label: String(svc.label),
          detail,
          lineTotal,
        };
      })
      .filter(Boolean) as Array<{ label: string; detail?: string; lineTotal: number }>;
  }, [selectedServices, lang, guestsCount]);

  const bookingPrice = bookingResult?.price || {};
  const servicesBreakdownFromResult = Array.isArray(bookingPrice?.servicesBreakdown)
    ? bookingPrice.servicesBreakdown
    : [];
  const hasServicesBreakdownFromResult = servicesBreakdownFromResult.length > 0;
  const servicesTotalFromResult = Number(bookingPrice?.servicesTotal);
  const hasServicesTotalFromResult = Number.isFinite(servicesTotalFromResult) && servicesTotalFromResult > 0;
  const totalFromResult = Number(bookingPrice?.total);
  const hasTotalFromResult = Number.isFinite(totalFromResult) && totalFromResult > 0;

  const selectedServicesTotal = useMemo(() => {
    if (hasServicesTotalFromResult) return servicesTotalFromResult;
    return selectedServicePriceRows.reduce((sum, row) => sum + Number(row.lineTotal || 0), 0);
  }, [hasServicesTotalFromResult, servicesTotalFromResult, selectedServicePriceRows]);

  const totalWithSelectedServices = hasTotalFromResult
    ? totalFromResult
    : Number(totals.totalAfterDiscount || 0) + selectedServicesTotal;

  const addonRows = useMemo(() => {
    return ADDON_KEYS.map((k) => {
      const qty = totals.addonsQty?.[k] || 0;
      const unit = totals.addonsUnitPrice?.[k] || 0;
      const total = totals.addonsTotal?.[k] || 0;
      const label =
        cfg?.addons?.[k]?.label?.[lang] ??
        cfg?.addons?.[k]?.label?.vi ??
        String(k);
      return { key: k, qty, unit, total, label };
    }).filter((x) => x.qty > 0);
  }, [cfg?.addons, lang, totals.addonsQty, totals.addonsTotal, totals.addonsUnitPrice]);

  const priceLines: PriceLine[] = useMemo(() => {
    const rows: PriceLine[] = [];
    const flightUnit =
      guestsCount > 0 ? Math.round((totals.baseTotal || 0) / guestsCount) : 0;
    const flightSub = flightUnit * guestsCount;

    rows.push({
      label: labels.flightCost,
      detail: `${formatByLang(lang, flightUnit, flightUnit)} × ${guestsCount}`,
      amountText: formatByLang(lang, flightSub, flightSub),
    });

    if (hasServicesBreakdownFromResult) {
      servicesBreakdownFromResult.forEach((row: any) => {
        const lineTotal = Number(row?.lineTotal || 0);
        if (lineTotal <= 0) return;

        rows.push({
          label: String(row?.label || labels.additionalServices),
          detail: row?.detail ? String(row.detail) : undefined,
          amountText: formatByLang(lang, lineTotal, lineTotal),
        });
      });
    } else if (hasServicesTotalFromResult) {
      rows.push({
        label: labels.additionalServices,
        amountText: formatByLang(lang, servicesTotalFromResult, servicesTotalFromResult),
      });
    } else {
      selectedServicePriceRows.forEach((row) => {
        rows.push({
          label: row.label,
          detail: row.detail,
          amountText: formatByLang(lang, row.lineTotal, row.lineTotal),
        });
      });
    }

    addonRows.forEach((a) => {
      rows.push({
        label: a.label,
        detail: `${formatByLang(lang, a.unit, a.unit)} × ${a.qty}`,
        amountText: formatByLang(lang, a.total, a.total),
      });
    });

    if ((totals.discountTotal || 0) > 0) {
      const perPax =
        guestsCount > 0
          ? Math.round((totals.discountTotal || 0) / guestsCount)
          : totals.discountTotal || 0;

      rows.push({
        label: labels.groupDiscount,
        detail: `-${formatByLang(lang, perPax, perPax)} × ${guestsCount}`,
        amountText: `-${formatByLang(lang, totals.discountTotal, totals.discountTotal)}`,
        type: "discount",
      });
    }

    return rows;
  }, [
    addonRows,
    guestsCount,
    labels.flightCost,
    labels.groupDiscount,
    lang,
    labels.additionalServices,
    hasServicesBreakdownFromResult,
    servicesBreakdownFromResult,
    hasServicesTotalFromResult,
    servicesTotalFromResult,
    selectedServicePriceRows,
    totals.baseTotal,
    totals.discountTotal,
  ]);

  return (
    <div
      data-ticket
      style={{
        background: C.bg,
        color: C.text,
        borderRadius: 22,
        overflow: "hidden",
        border: `1px solid ${C.border}`,
        boxShadow: "0 18px 48px rgba(28,41,48,0.08)",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        style={{
          background:
            "linear-gradient(135deg, #0194F3 0%, #0B83D9 100%)",
          color: C.white,
          padding: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 14,
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "rgba(255,255,255,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <img
                src="/logo.png"
                alt="MBL"
                crossOrigin="anonymous"
                style={{ width: 30, height: 30, objectFit: "contain" }}
              />
            </div>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: 1.6,
                  textTransform: "uppercase",
                  opacity: 0.95,
                }}
              >
                {labels.brandName}
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  lineHeight: 1.1,
                  marginTop: 4,
                }}
              >
                {labels.title}
              </div>
              <div style={{ fontSize: 12, opacity: 0.92, marginTop: 4 }}>
                {labels.subtitle}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              alignItems: "flex-end",
              maxWidth: "100%",
            }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.18)",
                borderRadius: 999,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 800,
                whiteSpace: "nowrap",
              }}
            >
              ✓ {labels.confirmed}
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.18)",
                borderRadius: 12,
                padding: "8px 12px",
                fontSize: 14,
                fontWeight: 900,
                letterSpacing: 1,
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              }}
            >
              {bookingRef}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.94 }}>
          {labels.created}: {createdAt}
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <SectionCard title={labels.serviceDetails}>
          <PillRow
            items={[
              { label: labels.service, value: locationName },
              { label: labels.date, value: formatDateDisplay(booking.dateISO) },
              { label: labels.time, value: booking.timeSlot || "—" },
              { label: labels.guests, value: String(booking.guestsCount ?? "—") },
              ...(hasPackages
                ? [
                    {
                      label: labels.packageLabel,
                      value: packageLabel,
                    },
                    {
                      label: labels.flightTypeLabel,
                      value: flightTypeLabel,
                    },
                    {
                      label: labels.dayTypeLabel,
                      value: getHolidayTypeLabel(labels, totals.holidayType),
                    },
                  ]
                : []),
            ]}
          />
        </SectionCard>

        <SectionSpacer />

        <SectionCard title={labels.contactInfo}>
          <StackInfo
            rows={[
              { label: labels.name, value: contactName || passengers?.[0]?.fullName || "—" },
              { label: labels.phone, value: contactPhone || "—" },
              { label: labels.email, value: contactEmail || "—" },
            ]}
          />
        </SectionCard>

        {passengers.length > 0 && (
          <>
            <SectionSpacer />
            <SectionCard
              title={labels.passengersList}
              rightBadge={String(passengers.length)}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {passengers.map((p, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: C.bg,
                      border: `1px solid ${C.border}`,
                      borderRadius: 16,
                      padding: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 999,
                          background: C.accentSoft,
                          color: C.accent,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          fontWeight: 900,
                          flexShrink: 0,
                        }}
                      >
                        {idx + 1}
                      </div>

                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 900,
                          color: C.text,
                          wordBreak: "break-word",
                        }}
                      >
                        {p.fullName || "—"}
                      </div>
                    </div>

                    <PillRow
                      items={[
                        { label: "DOB", value: formatDateDisplay(p.dob) },
                        { label: "Gender", value: p.gender || "—" },
                        { label: "ID", value: p.idNumber || "—" },
                        { label: "Nationality", value: p.nationality || "—" },
                        {
                          label: "Weight",
                          value: p.weightKg ? `${p.weightKg}kg` : "—",
                        },
                      ]}
                      soft
                    />
                  </div>
                ))}
              </div>
            </SectionCard>
          </>
        )}

        {!!specialRequest && (
          <>
            <SectionSpacer />
            <div
              style={{
                background: C.orangeSoft,
                border: `1px solid ${C.orange}`,
                borderRadius: 16,
                padding: 14,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  color: C.warningText,
                }}
              >
                {labels.specialRequests}
              </div>
              <div
                style={{
                  marginTop: 6,
                  color: C.warningText,
                  fontSize: 13,
                  fontWeight: 700,
                  wordBreak: "break-word",
                }}
              >
                {specialRequest}
              </div>
            </div>
          </>
        )}

        <SectionSpacer />

        {/* What's Included in the Flight */}
        <SectionCard
          title={lang === "vi" ? "Dịch vụ bao gồm" : lang === "en" ? "Services Included" : "Services Included"}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(cfg?.included?.[lang] || cfg?.included?.vi || []).map((item, idx) => (
              <div key={idx} style={{ display: "flex", gap: 10, textAlign: lang === "vi" ? "left" : "left" }}>
                <span style={{ color: C.success, fontWeight: 900, flexShrink: 0 }}>✓</span>
                <span
                  style={{
                    fontSize: 13,
                    color: C.text,
                    fontWeight: 500,
                    lineHeight: 1.4,
                  }}
                >
                  {item}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionSpacer />

        <SectionCard title={labels.additionalServices}>
          {additionalServiceItems.length ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {additionalServiceItems.map((item) => (
                <div
                  key={item.key}
                  style={{
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 12,
                    padding: "10px 12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 900,
                        color: C.text,
                        wordBreak: "break-word",
                        flex: 1,
                      }}
                    >
                      {item.label}
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: C.text,
                        textAlign: "right",
                        lineHeight: 1.45,
                        wordBreak: "break-word",
                        maxWidth: "55%",
                      }}
                    >
                      {item.detail || labels.no}
                    </div>
                  </div>
                </div>
              ))}

            </div>
          ) : (
            <div
              style={{
                fontSize: 13,
                color: C.muted,
                fontWeight: 700,
              }}
            >
              {labels.no}
            </div>
          )}
        </SectionCard>

        <SectionSpacer />

        <div
          style={{
            background: C.totalBg,
            color: C.white,
            borderRadius: 18,
            padding: 16,
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: 1,
              textTransform: "uppercase",
              opacity: 0.85,
            }}
          >
            {labels.priceBreakdown}
          </div>

          <div
            style={{
              marginTop: 14,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {priceLines.map((line, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: line.type === "discount" ? "#fca5a5" : "rgba(255,255,255,0.95)",
                    }}
                  >
                    {line.label}
                  </div>
                  {line.detail ? (
                    <div
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.7)",
                        marginTop: 3,
                      }}
                    >
                      {line.detail}
                    </div>
                  ) : null}
                </div>

                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 900,
                    whiteSpace: "nowrap",
                    color: line.type === "discount" ? "#fca5a5" : C.white,
                  }}
                >
                  {line.amountText}
                </div>
              </div>
            ))}

            <div
              style={{
                marginTop: 6,
                paddingTop: 12,
                borderTop: "1px solid rgba(255,255,255,0.25)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 900 }}>
                {labels.total}
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  color: C.white,
                }}
              >
                {formatByLang(lang, totalWithSelectedServices, totalWithSelectedServices)}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: "1px solid rgba(255,255,255,0.15)",
              fontSize: 11,
              color: "rgba(255,255,255,0.8)",
              lineHeight: 1.5,
            }}
          >
            {labels.safetyNote}
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            textAlign: "center",
            fontSize: 11,
            color: C.muted,
            lineHeight: 1.6,
          }}
        >
          Hotline: 0964.073.555 — 097.970.2812
          <br />
          Zalo / WhatsApp / Telegram — mebayluon.com
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  children,
  rightBadge,
}: {
  title: string;
  children: React.ReactNode;
  rightBadge?: string;
}) {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 18,
        padding: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: 1,
            textTransform: "uppercase",
            color: C.accentDark,
          }}
        >
          {title}
        </div>

        {rightBadge ? (
          <div
            style={{
              background: C.accentSoft,
              color: C.accent,
              borderRadius: 999,
              padding: "2px 8px",
              fontSize: 11,
              fontWeight: 900,
            }}
          >
            {rightBadge}
          </div>
        ) : null}
      </div>

      {children}
    </div>
  );
}

function PillRow({
  items,
  soft = false,
}: {
  items: Array<{ label: string; value: string }>;
  soft?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {items.map((item, idx) => (
        <div
          key={`${item.label}-${idx}`}
          style={{
            minWidth: 120,
            flex: "1 1 180px",
            background: soft ? C.accentSoft : C.bg,
            border: `1px solid ${soft ? "#B9DDFB" : C.border}`,
            borderRadius: 14,
            padding: "10px 12px",
          }}
        >
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>
            {item.label}
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 13,
              color: C.text,
              fontWeight: 900,
              wordBreak: "break-word",
            }}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function StackInfo({
  rows,
}: {
  rows: Array<{ label: string; value: React.ReactNode }>;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {rows.map((row, idx) => (
        <div
          key={`${row.label}-${idx}`}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "flex-start",
            paddingBottom: 10,
            borderBottom:
              idx === rows.length - 1 ? "none" : `1px dashed ${C.line}`,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: C.muted,
              flexShrink: 0,
            }}
          >
            {row.label}
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 900,
              color: C.text,
              textAlign: "right",
              wordBreak: "break-word",
            }}
          >
            {row.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionSpacer() {
  return <div style={{ height: 12 }} />;
}
