"use client";

import React from "react";
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
  soft: "#f8fafc",
  accent: "#0ea5e9",
  accentLight: "#e0f2fe",
  accentDark: "#0369a1",
  dark: "#0b1220",
  white: "#ffffff",
  success: "#10b981",
  successLight: "#d1fae5",
};

/* ── i18n ticket labels pulled from translations ── */
function useTicketLabels(lang: LangCode) {
  const t = bookingTranslations[lang];
  return {
    title:
      lang === "vi" ? "Vé đặt bay" :
      lang === "fr" ? "Billet de réservation" :
      lang === "ru" ? "Билет на полёт" :
      "Booking Ticket",
    brandName: "MEBAYLUON PARAGLIDING",
    created:
      lang === "vi" ? "Tạo lúc" :
      lang === "fr" ? "Créé le" :
      lang === "ru" ? "Создано" :
      "Created",
    ref:
      lang === "vi" ? "Mã đặt chỗ" :
      lang === "fr" ? "Réf. réservation" :
      lang === "ru" ? "Код бронирования" :
      "Booking Ref",
    flight: t.stepNames?.[0] ?? (lang === "vi" ? "Chuyến bay" : "Flight"),
    flightSection:
      lang === "vi" ? "Thông tin chuyến bay" :
      lang === "fr" ? "Détails du vol" :
      lang === "ru" ? "Информация о полёте" :
      "Flight details",
    contact: t.labels.contactInfo,
    addons: t.labels.addonsTitle,
    payment:
      lang === "vi" ? "Thanh toán" :
      lang === "fr" ? "Paiement" :
      lang === "ru" ? "Оплата" :
      "Payment",
    basePer: t.labels.basePricePerGuest,
    optionalServices: t.labels.addonsTitle,
    total:
      lang === "vi" ? "Tổng cộng" :
      lang === "fr" ? "Total" :
      lang === "ru" ? "Итого" :
      "Total",
    arrive:
      lang === "vi" ? "Vui lòng có mặt trước 15 phút để briefing an toàn." :
      lang === "fr" ? "Veuillez arriver 15 minutes avant pour le briefing de sécurité." :
      lang === "ru" ? "Пожалуйста, прибудьте за 15 минут до начала для инструктажа." :
      "Please arrive 15 minutes early for safety briefing.",
    location: t.labels.location,
    date: t.labels.date,
    time: t.labels.timeSlot,
    guests: t.labels.numGuests,
    phone: t.labels.phone,
    pax: lang === "vi" ? "khách" : lang === "fr" ? "pers" : lang === "ru" ? "чел" : "pax",
    none: lang === "vi" ? "Không có" : lang === "fr" ? "Aucun" : lang === "ru" ? "Нет" : "None",
    confirmed:
      lang === "vi" ? "Đã xác nhận" :
      lang === "fr" ? "Confirmé" :
      lang === "ru" ? "Подтверждено" :
      "Confirmed",
    discount: t.labels.groupDiscount,
  };
}

export default function BookingTicket({
  booking,
  totals,
  lang,
  bookingResult,
}: Props) {
  const cfg = LOCATIONS[booking.location];
  const contact = booking.contact;
  const labels = useTicketLabels(lang);

  const locationName =
    bookingResult?.locationName || cfg?.name?.[lang] || cfg?.name?.vi || "—";

  const createdAt =
    bookingResult?.createdAt ||
    bookingResult?.createdAtISO ||
    new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

  const bookingRef = buildBookingRef(booking.dateISO, contact?.phone);

  const guestsCount = Math.max(1, booking.guestsCount || 1);
  const basePerGuest =
    guestsCount > 0 ? Math.round((totals.baseTotal || 0) / guestsCount) : totals.baseTotal || 0;

  const addons = ADDON_KEYS.map((k) => {
    const qty = totals.addonsQty?.[k] || 0;
    const unit = totals.addonsUnitPrice?.[k] || 0;
    const total = totals.addonsTotal?.[k] || 0;
    const label =
      cfg?.addons?.[k]?.label?.[lang] ??
      cfg?.addons?.[k]?.label?.vi ??
      k;
    return { k, qty, unit, total, label };
  }).filter((a) => a.qty > 0);

  return (
    <div
      data-ticket
      style={{
        background: C.bg,
        color: C.text,
        borderRadius: 24,
        overflow: "hidden",
        border: `1px solid ${C.border}`,
        boxShadow: "0 4px 24px rgba(15,23,42,0.08)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* ═══ Header gradient band ═══ */}
      <div
        style={{
          background: "linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)",
          padding: "24px 28px 20px",
          color: C.white,
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "rgba(255,255,255,0.2)",
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
                style={{ width: 32, height: 32, objectFit: "contain" }}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.85, textTransform: "uppercase", fontWeight: 600 }}>
                {labels.brandName}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2, marginTop: 2 }}>
                {labels.title}
              </div>
            </div>
          </div>

          {/* Status badge */}
          <div
            style={{
              background: "rgba(255,255,255,0.2)",
              borderRadius: 12,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            ✓ {labels.confirmed}
          </div>
        </div>

        {/* Ref + Created */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            {labels.created}: {createdAt}
          </div>
          <div
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontWeight: 800,
              fontSize: 15,
              background: "rgba(255,255,255,0.2)",
              borderRadius: 10,
              padding: "6px 16px",
              letterSpacing: 1,
            }}
          >
            {bookingRef}
          </div>
        </div>
      </div>

      {/* ═══ Body ═══ */}
      <div style={{ padding: "24px 28px 28px" }}>
        {/* ── Flight + Contact ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Flight card */}
          <div
            style={{
              borderRadius: 16,
              border: `1px solid ${C.border}`,
              padding: 18,
              background: C.soft,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 16 }}>✈</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.accentDark, letterSpacing: 1, textTransform: "uppercase" }}>
                {labels.flightSection}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Row label={labels.location} value={locationName} />
              <Row label={labels.date} value={booking.dateISO || "—"} />
              <Row label={labels.time} value={booking.timeSlot || "—"} />
              <Row label={labels.guests} value={String(booking.guestsCount ?? "—")} />
            </div>
          </div>

          {/* Contact card */}
          <div
            style={{
              borderRadius: 16,
              border: `1px solid ${C.border}`,
              padding: 18,
              background: C.soft,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 16 }}>👤</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.accentDark, letterSpacing: 1, textTransform: "uppercase" }}>
                {labels.contact}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Row label={labels.phone} value={contact?.phone || "—"} />
              <Row label="Email" value={contact?.email || "—"} />
            </div>
          </div>
        </div>

        {/* ── Dashed separator ── */}
        <div
          style={{
            borderTop: `2px dashed ${C.border}`,
            margin: "20px 0",
            position: "relative",
          }}
        >
          {/* Left notch */}
          <div
            style={{
              position: "absolute",
              left: -36,
              top: -12,
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: C.bg,
              border: `1px solid ${C.border}`,
            }}
          />
          {/* Right notch */}
          <div
            style={{
              position: "absolute",
              right: -36,
              top: -12,
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: C.bg,
              border: `1px solid ${C.border}`,
            }}
          />
        </div>

        {/* ── Addons + Payment ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Add-ons card */}
          <div
            style={{
              borderRadius: 16,
              border: `1px solid ${C.border}`,
              padding: 18,
              background: C.soft,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 16 }}>🎒</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.accentDark, letterSpacing: 1, textTransform: "uppercase" }}>
                {labels.addons}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {addons.length ? (
                addons.map((a) => (
                  <div
                    key={a.k}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 8,
                      borderRadius: 12,
                      padding: "10px 12px",
                      background: C.bg,
                      border: `1px solid ${C.borderLight}`,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{a.label}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                        {formatByLang(lang, a.unit, a.unit)} / {labels.pax} × {a.qty}
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 13, whiteSpace: "nowrap" }}>
                      {formatByLang(lang, a.total, a.total)}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: C.muted, fontSize: 13 }}>{labels.none}</div>
              )}
            </div>
          </div>

          {/* Payment card */}
          <div
            style={{
              borderRadius: 16,
              border: `1px solid ${C.border}`,
              padding: 18,
              background: C.soft,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 16 }}>💳</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.accentDark, letterSpacing: 1, textTransform: "uppercase" }}>
                {labels.payment}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <PriceRow label={labels.basePer} value={formatByLang(lang, basePerGuest, basePerGuest)} />

              {totals.addonsGrandTotal > 0 && (
                <PriceRow
                  label={labels.optionalServices}
                  value={formatByLang(lang, totals.addonsGrandTotal, totals.addonsGrandTotal)}
                />
              )}

              {totals.discountTotal > 0 && (
                <PriceRow
                  label={labels.discount}
                  value={`-${formatByLang(lang, totals.discountTotal, totals.discountTotal)}`}
                  valueColor={C.success}
                />
              )}

              {/* Total bar */}
              <div
                style={{
                  marginTop: 8,
                  borderRadius: 14,
                  padding: "14px 16px",
                  background: "linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)",
                  color: C.white,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 900, fontSize: 16 }}>
                  <span>{labels.total}</span>
                  <span>{formatByLang(lang, totals.totalAfterDiscount, totals.totalAfterDiscount)}</span>
                </div>
                <div style={{ marginTop: 8, fontSize: 11, opacity: 0.9, lineHeight: 1.4 }}>
                  {labels.arrive}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            marginTop: 20,
            textAlign: "center",
            fontSize: 11,
            color: C.muted,
            lineHeight: 1.5,
          }}
        >
          Hotline: 0964.073.555 — 097.970.2812 (Zalo / WhatsApp / Telegram)
          <br />
          mebayluon.com
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 800, textAlign: "right", color: "#0f172a" }}>{value}</div>
    </div>
  );
}

function PriceRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 13 }}>
      <span style={{ color: "#334155" }}>{label}</span>
      <span style={{ fontWeight: 800, color: valueColor || "#0f172a" }}>{value}</span>
    </div>
  );
}
