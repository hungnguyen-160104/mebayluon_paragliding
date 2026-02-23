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

/* ── helpers ── */
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

/* ── Export-safe palette (HEX only — no oklch) ── */
const C = {
  text: "#0f172a",
  textSecondary: "#334155",
  muted: "#64748b",
  border: "#e2e8f0",
  borderLight: "#f1f5f9",
  bg: "#ffffff",
  dark: "#0b1220",
  soft: "#f8fafc",
  accent: "#0ea5e9",
  accentDark: "#0369a1",
  white: "#ffffff",
  danger: "#ef4444",
};

/* ── i18n ticket labels (fallback safe) ── */
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
    ref: isVI
      ? "Mã đặt chỗ"
      : isFR
        ? "Réf. réservation"
        : isRU
          ? "Код бронирования"
          : isHI
            ? "बुकिंग संदर्भ"
            : isZH || isZHTW
              ? zh("预订编号", "預訂編號")
              : "Booking Ref",
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
    serviceDetails: isVI ? "Thông tin dịch vụ" : "Service details",
    contactInfo: (t as any)?.labels?.contactInfo ?? "Contact information",
    passengerInfo: isVI ? "Thông tin hành khách" : "Passenger information",
    passengersList: isVI ? "Danh sách hành khách" : "Passengers list",
    additionalServices: isVI ? "Dịch vụ thêm" : "Additional services",
    priceBreakdown: isVI ? "Chi tiết giá" : "Price breakdown",
    total: isVI ? "Tổng cộng" : "Total",
    service: isVI ? "Dịch vụ" : "Service",
    date: (t as any)?.labels?.date ?? "Date",
    time: (t as any)?.labels?.timeSlot ?? "Time",
    location: (t as any)?.labels?.location ?? "Location",
    guests: (t as any)?.labels?.numGuests ?? "Passengers",
    name: isVI ? "Tên" : "Name",
    phone: (t as any)?.labels?.phone ?? "Phone",
    email: "Email",
    pickupLocation: isVI ? "Điểm đón" : "Pickup location",
    pickupTime: isVI ? "Giờ đón" : "Pickup time",
    pickupTimeDefault: isVI ? "30 phút trước giờ bay" : "30 minutes before departure",
    flexible: isVI ? "Linh hoạt" : "Flexible",
    launchSite: isVI ? "Điểm bay" : "Launch site",
    yes: isVI ? "Có" : "Yes",
    no: isVI ? "Không" : "No",
    free: isVI ? "Miễn phí" : "Free",
    included: isVI ? "Bao gồm" : "Included",
    groupDiscount: (t as any)?.labels?.groupDiscount ?? (isVI ? "Giảm giá nhóm" : "Discount"),
    notProvided: isVI ? "Chưa cung cấp" : "Not provided",
    specialRequests: isVI ? "Yêu cầu đặc biệt" : "Special requests",
    flightCost: isVI ? "Giá bay" : "Flight cost",
    transferCost: isVI ? "Xe đưa đón" : "Hotel transfer",
    camera360Cost: isVI ? "Camera 360" : "Camera 360",
    droneCost: isVI ? "Flycam/Drone" : "Drone/Flycam",
    arrive: isVI
      ? "Vui lòng có mặt trước 15 phút để briefing an toàn."
      : "Please arrive 15 minutes early for safety briefing.",
    pax: isVI ? "khách" : isFR ? "pers" : isRU ? "чел" : isHI ? "यात्री" : (isZH || isZHTW) ? zh("人", "人") : "pax",
  };
}

type PriceLine = { label: string; detail?: string; amountText: string; type?: "normal" | "discount" };

export default function BookingTicket({ booking, totals, lang, bookingResult }: Props) {
  const cfg = LOCATIONS[booking.location];
  const labels = useTicketLabels(lang);

  // giữ theo “code cũ”: contact có thể thiếu field trong type
  const contact: any = (booking as any)?.contact;
  const contactName = (contact?.fullName ?? contact?.contactName ?? "").toString();
  const contactPhone = (contact?.phone ?? "").toString();
  const contactEmail = (contact?.email ?? "").toString();
  const pickupLocation = (contact?.pickupLocation ?? bookingResult?.pickupLocation ?? "").toString();
  const specialRequest = (contact?.specialRequest ?? bookingResult?.specialRequest ?? "").toString();

  const locationName =
    bookingResult?.locationName || cfg?.name?.[lang] || cfg?.name?.vi || "—";

  const createdAt =
    bookingResult?.createdAt ||
    bookingResult?.createdAtISO ||
    new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

  const bookingRef = buildBookingRef(booking.dateISO, contactPhone);

  const guestsCount = Math.max(1, booking.guestsCount || 1);

  // Service name (Step4 có) — nếu cfg có serviceName thì lấy, không có thì fallback
  const serviceName =
    (cfg as any)?.serviceName?.[lang] ??
    (cfg as any)?.serviceName?.vi ??
    (cfg as any)?.name?.[lang] ??
    (cfg as any)?.name?.vi ??
    "—";

  // Addons list (đang có logic cũ)
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

  // Step4-style price breakdown: unit × qty = subtotal
  const priceLines: PriceLine[] = useMemo(() => {
    const lines: PriceLine[] = [];

    // base flight
    const flightUnit = guestsCount > 0 ? Math.round((totals.baseTotal || 0) / guestsCount) : 0;
    const flightSubtotal = flightUnit * guestsCount;
    lines.push({
      label: labels.flightCost,
      detail: `${formatByLang(lang, flightUnit, flightUnit)} × ${guestsCount}`,
      amountText: formatByLang(lang, flightSubtotal, flightSubtotal),
      type: "normal",
    });

    // addons by qty/unit
    addons.forEach((a) => {
      lines.push({
        label: a.label,
        detail: `${formatByLang(lang, a.unit, a.unit)} × ${a.qty}`,
        amountText: formatByLang(lang, a.total, a.total),
        type: "normal",
      });
    });

    // discount
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

  const hasPickup = (totals.addonsQty?.pickup || 0) > 0;

  // passenger list (Step4 có)
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
      {/* Header */}
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

      {/* Body */}
      <div style={{ padding: 16 }}>
        {/* Summary cards (Service + Contact) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {/* Service details */}
          <Card title={labels.serviceDetails} icon="✈">
            <KV label={labels.service} value={serviceName} />
            <KV label={labels.location} value={locationName} />
            <KV label={labels.date} value={booking.dateISO || "—"} />
            <KV label={labels.time} value={booking.timeSlot || labels.flexible} />
            <KV label={labels.guests} value={String(booking.guestsCount ?? "—")} />
            <KV
              label={labels.pickupLocation}
              value={
                hasPickup
                  ? (pickupLocation || labels.notProvided)
                  : labels.launchSite
              }
            />
            {hasPickup && (
              <KV label={labels.pickupTime} value={labels.pickupTimeDefault} />
            )}
          </Card>

          {/* Contact */}
          <Card title={labels.contactInfo} icon="👤">
            <KV label={labels.name} value={contactName || passengers?.[0]?.fullName || "—"} />
            <KV label={labels.phone} value={contactPhone || "—"} />
            <KV label={labels.email} value={contactEmail || "—"} />
          </Card>
        </div>

        {/* Passenger list */}
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
                    <Info label="DOB" value={p.dob || p.dateOfBirth || "—"} />
                    <Info label="Gender" value={p.gender || "—"} />
                    <Info label="ID" value={p.idNumber || p.passportOrId || "—"} />
                    <Info label="Nationality" value={p.nationality || "—"} />
                    <Info label="Weight" value={p.weightKg ? `${p.weightKg}kg` : (p.weight ? `${p.weight}kg` : "—")} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Special request */}
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

        {/* Additional services */}
        <div style={{ marginTop: 12 }}>
          <Card title={labels.additionalServices} icon="🎒">
            <KV label={labels.transferCost} value={hasPickup ? labels.yes : labels.no} />
            <KV label={labels.camera360Cost} value={(totals.addonsQty?.camera360 || 0) ? `${totals.addonsQty?.camera360} ${labels.pax}` : labels.no} />
            <KV label={labels.droneCost} value={(totals.addonsQty?.flycam || 0) ? `${totals.addonsQty?.flycam} ${labels.pax}` : labels.no} />
            <KV label="GoPro" value={labels.free} />
            <KV label="Drinks" value={labels.free} />
            <KV label="Certificate" value={labels.included} />
          </Card>
        </div>

        {/* Price breakdown (Step4 style) */}
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

        {/* Footer */}
        <div style={{ marginTop: 12, textAlign: "center", fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
          Hotline: 0964.073.555 — 097.970.2812 (Zalo / WhatsApp / Telegram)
          <br />
          mebayluon.com
        </div>
      </div>
    </div>
  );
}

/* ── UI sub components ── */
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
      <div style={{ fontSize: 13, fontWeight: 900, color: C.text, textAlign: "right" }}>{value}</div>
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