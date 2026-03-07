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

function buildBookingRef(dateISO?: string, phone?: string) {
  const ymd = normalizeDateToYYYYMMDD(dateISO);
  const phoneDigits = digitsOnly(phone || "");
  const last4 = phoneDigits ? phoneDigits.slice(-4) : "";
  if (ymd && last4) return `${ymd}-${last4}`;
  return `MBL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

const C = {
  text: "#0f172a",
  textSecondary: "#334155",
  muted: "#64748b",
  border: "#e2e8f0",
  bg: "#ffffff",
  dark: "#0b1220",
  soft: "#f8fafc",
  accentDark: "#0369a1",
  white: "#ffffff",
};

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
          ? "Подтверждение данных"
          : isHI
            ? "बुकिंग विवरण पुष्टि"
            : isZH || isZHTW
              ? zh("请确认预订信息", "請確認預訂資訊")
              : "Please review details",
    brandName: "MEBAYLUON PARAGLIDING",
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
    serviceDetails: isVI ? "Thông tin dịch vụ" : isFR ? "Détails du service" : isRU ? "Детали услуги" : isHI ? "सेवा विवरण" : isZH || isZHTW ? zh("服务信息", "服務資訊") : "Service details",
    contactInfo: (t as any)?.labels?.contactInfo ?? "Contact information",
    passengersList: isVI ? "Danh sách hành khách" : isFR ? "Liste des passagers" : isRU ? "Список пассажиров" : isHI ? "यात्रियों की सूची" : isZH || isZHTW ? zh("乘客名单", "乘客名單") : "Passengers list",
    additionalServices: isVI ? "Dịch vụ thêm" : isFR ? "Services supplémentaires" : isRU ? "Дополнительные услуги" : isHI ? "अतिरिक्त सेवाएँ" : isZH || isZHTW ? zh("附加服务", "附加服務") : "Additional services",
    total: isVI ? "Tổng cộng" : isFR ? "Total" : isRU ? "Итого" : isHI ? "कुल" : isZH || isZHTW ? zh("总计", "總計") : "Total",
    service: isVI ? "Dịch vụ" : isFR ? "Service" : isRU ? "Услуга" : isHI ? "सेवा" : isZH || isZHTW ? zh("服务", "服務") : "Service",
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
    pickupLocation: isVI ? "Điểm đón" : isFR ? "Lieu de prise en charge" : isRU ? "Место трансфера" : isHI ? "पिकअप स्थान" : isZH || isZHTW ? zh("接送地点", "接送地點") : "Pickup location",
    specialRequests: isVI ? "Yêu cầu đặc biệt" : isFR ? "Demandes spéciales" : isRU ? "Особые запросы" : isHI ? "विशेष अनुरोध" : isZH || isZHTW ? zh("特殊要求", "特殊要求") : "Special requests",
    flightCost: isVI ? "Giá bay" : isFR ? "Prix du vol" : isRU ? "Стоимость полёта" : isHI ? "फ्लाइट शुल्क" : isZH || isZHTW ? zh("飞行费用", "飛行費用") : "Flight cost",
    camera360Cost: isVI ? "Camera 360" : "Camera 360",
    droneCost: isVI ? "Flycam/Drone" : "Drone/Flycam",
    groupDiscount: (t as any)?.labels?.groupDiscount ?? (isVI ? "Giảm giá nhóm" : "Group discount"),
    free: isVI ? "Miễn phí" : "Free",
    included: isVI ? "Bao gồm" : "Included",
    yes: isVI ? "Có" : "Yes",
    no: isVI ? "Không" : "No",
    arrive: isVI
      ? "Vui lòng có mặt trước 15 phút để briefing an toàn."
      : isFR
        ? "Veuillez arriver 15 minutes à l’avance pour le briefing de sécurité."
        : isRU
          ? "Пожалуйста, прибудьте за 15 минут до инструктажа по безопасности."
          : isHI
            ? "कृपया सुरक्षा ब्रीफिंग के लिए 15 मिनट पहले पहुँचें।"
            : isZH || isZHTW
              ? zh("请提前15分钟到达参加安全简报。", "請提前15分鐘到達參加安全簡報。")
              : "Please arrive 15 minutes early for safety briefing.",
    notProvided: isVI ? "Chưa cung cấp" : isFR ? "Non fourni" : isRU ? "Не указано" : isHI ? "प्रदान नहीं किया गया" : isZH || isZHTW ? zh("未提供", "未提供") : "Not provided",
    pax: isVI ? "khách" : isFR ? "pers" : isRU ? "чел" : isHI ? "यात्री" : (isZH || isZHTW) ? zh("人", "人") : "pax",
    weekday: isVI ? "Ngày thường" : isFR ? "Jour ouvré" : isRU ? "Будний день" : isHI ? "कार्यदिवस" : (isZH || isZHTW) ? zh("工作日", "工作日") : "Weekday",
    weekend: isVI ? "Cuối tuần" : isFR ? "Week-end" : isRU ? "Выходной" : isHI ? "सप्ताहांत" : (isZH || isZHTW) ? zh("周末", "週末") : "Weekend",
    holiday: isVI ? "Ngày lễ" : isFR ? "Jour férié" : isRU ? "Праздничный день" : isHI ? "छुट्टी" : (isZH || isZHTW) ? zh("节假日", "節假日") : "Holiday",
    paragliding: isVI ? "Bay dù không động cơ" : isFR ? "Parapente" : isRU ? "Параплан" : isHI ? "पैराग्लाइडिंग" : (isZH || isZHTW) ? zh("无动力滑翔伞", "無動力滑翔傘") : "Paragliding",
    paramotor: isVI ? "Bay dù gắn động cơ" : isFR ? "Paramoteur" : isRU ? "Парамотор" : isHI ? "पैरामोटर" : (isZH || isZHTW) ? zh("动力伞", "動力傘") : "Paramotor",
    notSelected: isVI ? "Chưa chọn" : isFR ? "Non sélectionné" : isRU ? "Не выбрано" : isHI ? "चयन नहीं किया गया" : (isZH || isZHTW) ? zh("未选择", "未選擇") : "Not selected",
  };
}

type PriceLine = { label: string; detail?: string; amountText: string; type?: "normal" | "discount" };

function getFlightTypeLabel(labels: ReturnType<typeof useTicketLabels>, key?: string) {
  if (key === "paramotor") return labels.paramotor;
  if (key === "paragliding") return labels.paragliding;
  return labels.notSelected;
}

function getHolidayTypeLabel(labels: ReturnType<typeof useTicketLabels>, holidayType?: "weekday" | "weekend" | "holiday") {
  if (holidayType === "holiday") return labels.holiday;
  if (holidayType === "weekend") return labels.weekend;
  return labels.weekday;
}

export default function BookingTicket({ booking, totals, lang, bookingResult }: Props) {
  const cfg = LOCATIONS[booking.location];
  const labels = useTicketLabels(lang);

  const contact: any = (booking as any)?.contact;
  const contactName = (contact?.fullName ?? contact?.contactName ?? "").toString();
  const contactPhone = (contact?.phone ?? "").toString();
  const contactEmail = (contact?.email ?? "").toString();
  const specialRequest = (contact?.specialRequest ?? bookingResult?.specialRequest ?? "").toString();

  const locationName =
    bookingResult?.locationName || cfg?.name?.[lang] || cfg?.name?.vi || "—";

  const createdAt =
    bookingResult?.createdAt ||
    bookingResult?.createdAtISO ||
    new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

  const bookingRef = buildBookingRef(booking.dateISO, contactPhone);
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
        fixedMapUrl: svc.fixedMapUrl || "",
      }));
  }, [cfg?.services, booking.packageKey, booking.services, lang]);

  const addons = useMemo(() => {
    return ADDON_KEYS.map((k) => {
      const qty = totals.addonsQty?.[k] || 0;
      const unit = totals.addonsUnitPrice?.[k] || 0;
      const total = totals.addonsTotal?.[k] || 0;
      const label =
        cfg?.addons?.[k]?.label?.[lang] ??
        cfg?.addons?.[k]?.label?.vi ??
        String(k);
      return { k, qty, unit, total, label };
    }).filter((a) => a.qty > 0);
  }, [cfg?.addons, lang, totals.addonsQty, totals.addonsUnitPrice, totals.addonsTotal]);

  const priceLines: PriceLine[] = useMemo(() => {
    const lines: PriceLine[] = [];
    const flightUnit = guestsCount > 0 ? Math.round((totals.baseTotal || 0) / guestsCount) : 0;
    const flightSubtotal = flightUnit * guestsCount;

    lines.push({
      label: labels.flightCost,
      detail: `${formatByLang(lang, flightUnit, flightUnit)} × ${guestsCount}`,
      amountText: formatByLang(lang, flightSubtotal, flightSubtotal),
      type: "normal",
    });

    addons.forEach((a) => {
      lines.push({
        label: a.label,
        detail: `${formatByLang(lang, a.unit, a.unit)} × ${a.qty}`,
        amountText: formatByLang(lang, a.total, a.total),
        type: "normal",
      });
    });

    if ((totals.discountTotal || 0) > 0) {
      const perPax = guestsCount > 0 ? Math.round((totals.discountTotal || 0) / guestsCount) : totals.discountTotal || 0;
      lines.push({
        label: labels.groupDiscount,
        detail: `-${formatByLang(lang, perPax, perPax)} × ${guestsCount}`,
        amountText: `-${formatByLang(lang, totals.discountTotal, totals.discountTotal)}`,
        type: "discount",
      });
    }

    return lines;
  }, [addons, guestsCount, labels.flightCost, labels.groupDiscount, lang, totals.baseTotal, totals.discountTotal]);

  const passengers: any[] = (booking as any)?.guests ?? [];

  return (
    <div
      data-ticket
      style={{
        background: C.bg,
        color: C.text,
        borderRadius: 18,
        overflow: "hidden",
        border: `1px solid ${C.border}`,
        boxShadow: "0 6px 28px rgba(15,23,42,0.10)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)",
          padding: "18px 18px 14px",
          color: C.white,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
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
            <div>
              <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.9, textTransform: "uppercase", fontWeight: 700 }}>
                {labels.brandName}
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.15, marginTop: 2 }}>
                {labels.title}
              </div>
              <div style={{ fontSize: 12, opacity: 0.92, marginTop: 2 }}>
                {labels.subtitle}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <div
              style={{
                background: "rgba(255,255,255,0.18)",
                borderRadius: 12,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 1,
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              ✓ {labels.confirmed}
            </div>

            <div
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontWeight: 900,
                fontSize: 15,
                background: "rgba(255,255,255,0.18)",
                borderRadius: 10,
                padding: "6px 14px",
                letterSpacing: 1,
                whiteSpace: "nowrap",
              }}
            >
              {bookingRef}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.9 }}>
          {labels.created}: {createdAt}
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Card title={labels.serviceDetails} icon="✈">
            <KV label={labels.service} value={locationName} />
            <KV label={labels.location} value={locationName} />
            <KV label={labels.date} value={booking.dateISO || "—"} />
            <KV label={labels.time} value={booking.timeSlot || "—"} />
            <KV label={labels.guests} value={String(booking.guestsCount ?? "—")} />
            <KV label={labels.packageLabel} value={booking.location === "khau_pha" ? packageLabel : labels.notSelected} />
            <KV label={labels.flightTypeLabel} value={flightTypeLabel} />
            <KV label={labels.dayTypeLabel} value={getHolidayTypeLabel(labels, totals.holidayType)} />
          </Card>

          <Card title={labels.contactInfo} icon="👤">
            <KV label={labels.name} value={contactName || passengers?.[0]?.fullName || "—"} />
            <KV label={labels.phone} value={contactPhone || "—"} />
            <KV label={labels.email} value={contactEmail || "—"} />
          </Card>
        </div>

        {selectedServices.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <Card title={labels.pickupLocation} icon="🚐">
              {selectedServices.map((svc) => (
                <div key={svc.key} style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 8, marginBottom: 8 }}>
                  <KV label={svc.label} value={svc.fixedMapUrl ? "Google Map" : (svc.inputText || labels.notProvided)} />
                  {svc.fixedMapUrl ? (
                    <div style={{ fontSize: 12, color: C.accentDark, textAlign: "right" }}>
                      {svc.fixedMapUrl}
                    </div>
                  ) : null}
                </div>
              ))}
            </Card>
          </div>
        )}

        {passengers.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1, color: C.textSecondary }}>
                {labels.passengersList}
              </div>
              <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 900 }}>
                {passengers.length}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {passengers.map((p, idx) => (
                <div key={idx} style={{ background: C.soft, border: `1px solid ${C.border}`, borderRadius: 12, padding: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 999,
                      background: "#dc2626", color: "white",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 900
                    }}>
                      {idx + 1}
                    </div>
                    <div style={{ fontWeight: 900 }}>{p.fullName || "—"}</div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12, color: C.textSecondary, paddingLeft: 32 }}>
                    <Info label="DOB" value={p.dob || "—"} />
                    <Info label="Gender" value={p.gender || "—"} />
                    <Info label="ID" value={p.idNumber || "—"} />
                    <Info label="Nationality" value={p.nationality || "—"} />
                    <Info label="Weight" value={p.weightKg ? `${p.weightKg}kg` : "—"} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!!specialRequest && (
          <div style={{ marginTop: 12, background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 12, padding: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1, color: "#92400e" }}>
              {labels.specialRequests}
            </div>
            <div style={{ marginTop: 4, color: "#78350f", fontSize: 13, fontWeight: 700 }}>
              {specialRequest}
            </div>
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <Card title={labels.additionalServices} icon="🎒">
            <KV label={labels.pickupLocation} value={selectedServices.length ? labels.yes : labels.no} />
            <KV label={labels.camera360Cost} value={(totals.addonsQty?.camera360 || 0) ? `${totals.addonsQty?.camera360} ${labels.pax}` : labels.no} />
            <KV label={labels.droneCost} value={(totals.addonsQty?.flycam || 0) ? `${totals.addonsQty?.flycam} ${labels.pax}` : labels.no} />
            <KV label="GoPro" value={labels.free} />
            <KV label="Drinks" value={labels.free} />
            <KV label="Certificate" value={labels.included} />
          </Card>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ background: C.dark, color: C.white, borderRadius: 14, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
              <div style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", opacity: 0.85 }}>
                {labels.total}
              </div>
              <div style={{ fontSize: 20, fontWeight: 900 }}>
                {formatByLang(lang, totals.totalAfterDiscount, totals.totalAfterDiscount)}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
              {priceLines.map((line, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: line.type === "discount" ? "#fca5a5" : "#e5e7eb", fontWeight: 700 }}>
                      {line.label}
                    </div>
                    {line.detail && (
                      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                        {line.detail}
                      </div>
                    )}
                  </div>
                  <div style={{ fontWeight: 900, whiteSpace: "nowrap", color: line.type === "discount" ? "#fca5a5" : "#ffffff" }}>
                    {line.amountText}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 10, fontSize: 11, opacity: 0.9 }}>
              {labels.arrive}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, textAlign: "center", fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
          Hotline: 0964.073.555 — 097.970.2812 (Zalo / WhatsApp / Telegram)
          <br />
          mebayluon.com
        </div>
      </div>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.soft, border: `1px solid ${C.border}`, borderRadius: 14, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", color: C.accentDark }}>
          {title}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {children}
      </div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.muted }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 900, color: C.text, textAlign: "right", maxWidth: "60%" }}>{value}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ fontWeight: 800 }}>{label}:</span>{" "}
      <span style={{ color: C.text }}>{value}</span>
    </div>
  );
}