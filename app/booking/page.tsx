"use client";

import React from "react";
import { useBookingStore } from "@/store/booking-store";
import SelectFlightStep from "@/components/booking/select-flight-step";
import ContactInfoStep from "@/components/booking/contact-info-step";
import GuestInfoStep from "@/components/booking/guest-info-step";
import ReviewConfirmStep from "@/components/booking/review-confirm-step";
import SuccessStep from "@/components/booking/success-step";
import StepIndicator from "@/components/booking/step-indicator";
import { useBookingText } from "@/lib/booking/translations-booking";

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
    <main className="relative min-h-screen overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-fixed"
        style={{ backgroundImage: "url('/dat_bay.jpeg')" }}
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/45" />

      {/* Optional soft gradient overlay for better readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/25 to-black/50" />

      {/* Content */}
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1280px] flex-col px-3 pt-20 pb-4 md:px-4 md:pt-24 lg:px-5">
        <header className="shrink-0 text-center text-white">
          <h1
            className="text-2xl font-bold tracking-tight md:text-3xl"
            style={{ textShadow: "0 2px 10px rgba(0,0,0,0.55)" }}
          >
            {t.pageTitle}
          </h1>

          <p
            className="mt-1 text-sm text-white/90 md:text-base"
            style={{ textShadow: "0 1px 8px rgba(0,0,0,0.45)" }}
          >
            {t.pageSubtitle}
          </p>
        </header>

        <section className="mt-4 shrink-0 rounded-2xl border border-white/15 bg-white/10 p-3 text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur-md md:p-4">
          <StepIndicator />
        </section>

        <section className="mt-4 min-h-0 flex-1">
          <div className="h-full min-w-0 overflow-auto rounded-2xl border border-white/10 bg-black/20 p-2 shadow-[0_10px_30px_rgba(0,0,0,0.2)] backdrop-blur-sm md:p-3">
            {currentStepContent()}
          </div>
        </section>
      </div>
    </main>
  );
}