"use client";

import React, { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useBookingStore } from "@/store/booking-store";
import type { LocationKey } from "@/lib/booking/calculate-price";
import SelectFlightStep from "@/components/booking/select-flight-step";
import ContactInfoStep from "@/components/booking/contact-info-step";
import GuestInfoStep from "@/components/booking/guest-info-step";
import ReviewConfirmStep from "@/components/booking/review-confirm-step";
import SuccessStep from "@/components/booking/success-step";
import StepIndicator from "@/components/booking/step-indicator";
import { useBookingText } from "@/lib/booking/translations-booking";

const BOOKING_LOCATIONS: LocationKey[] = [
  "sapa",
  "khau_pha",
  "da_nang",
  "ha_noi",
  "quan_ba",
];

/**
 * Đọc ?spot= trên URL (nút "Đặt bay ngay tại ..." ở trang điểm bay) và chọn
 * sẵn điểm bay. Tham số lạ / điểm chưa mở đặt online -> để trống cho khách
 * tự chọn. Tách riêng vì useSearchParams cần bọc trong <Suspense>.
 */
function SpotFromUrl() {
  const searchParams = useSearchParams();
  const applySpotFromUrl = useBookingStore((s) => s.applySpotFromUrl);

  useEffect(() => {
    const raw = searchParams.get("spot");
    if (!raw) return;

    const key = BOOKING_LOCATIONS.includes(raw as LocationKey)
      ? (raw as LocationKey)
      : null;
    applySpotFromUrl(key);
  }, [searchParams, applySpotFromUrl]);

  return null;
}

export default function BookingPage() {
  const step = useBookingStore((s) => s.step);
  const t = useBookingText();

  const currentStepContent = () => {
    switch (step) {
      case 1:
        return <SelectFlightStep />;
      case 2:
        return <ContactInfoStep />;
      case 3:
        return <GuestInfoStep />;
      case 4:
        return <ReviewConfirmStep />;
      case 5:
        return <SuccessStep />;
      default:
        return <SelectFlightStep />;
    }
  };

  return (
    <main className="min-h-screen bg-[#F5F7FA]">
      <Suspense fallback={null}>
        <SpotFromUrl />
      </Suspense>
      <div className="mx-auto flex min-h-screen w-full max-w-[1280px] flex-col px-3 pb-6 pt-20 md:px-4 md:pt-24 lg:px-5">
        <header className="shrink-0 overflow-hidden rounded-[24px] border border-[#DCE7F3] bg-white shadow-[0_8px_24px_rgba(1,148,243,0.08)]">
          <div className="bg-gradient-to-r from-[#0194F3] to-[#0B83D9] px-4 py-5 text-center md:px-6 md:py-6">
            <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
              {t.pageTitle}
            </h1>
            <p className="mt-2 text-sm font-bold italic text-white md:text-base">
              {t.pageSubtitle}
            </p>
          </div>
        </header>

        <section className="mt-4 shrink-0 rounded-2xl border border-[#DCE7F3] bg-white p-3 shadow-[0_4px_16px_rgba(28,41,48,0.04)] md:p-4">
          <StepIndicator />
        </section>

        <section className="mt-4 min-h-0 flex-1">
          <div className="h-full min-w-0 overflow-auto rounded-2xl border border-[#DCE7F3] bg-white p-2 shadow-[0_4px_16px_rgba(28,41,48,0.04)] md:p-3">
            {currentStepContent()}
          </div>
        </section>
      </div>
    </main>
  );
}