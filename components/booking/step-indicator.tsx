"use client";

import React from "react";
import { ChevronRight, Check } from "lucide-react";
import { useBookingStore } from "@/store/booking-store";
import { useBookingText } from "@/lib/booking/translations-booking";

export default function StepIndicator() {
  const step = useBookingStore((s) => s.step);
  const t = useBookingText();
  const steps = t.stepNames;
  const currentLabel = steps[step - 1] || "";
  const progressPercent = (step / steps.length) * 100;

  return (
    <div className="overflow-hidden rounded-xl border border-[#DCE7F3] bg-white shadow-sm">
      <div className="border-b border-[#DCE7F3] bg-[#F5F7FA] px-4 py-4 md:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-[#5B6B7A]">
              Booking progress
            </div>
            <div className="mt-1 text-lg font-bold text-[#1C2930] md:text-xl">
              {currentLabel}
            </div>
          </div>

          <div className="rounded-full border border-[#B9DDFB] bg-[#EAF4FE] px-3 py-1 text-sm font-semibold text-[#0194F3]">
            {step}/{steps.length}
          </div>
        </div>

        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#DCE7F3]">
          <div
            className="h-full rounded-full bg-[#0194F3] transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="hidden items-stretch gap-2 bg-white px-4 py-5 md:flex md:px-6">
        {steps.map((label, idx) => {
          const id = idx + 1;
          const active = step === id;
          const done = step > id;

          return (
            <React.Fragment key={id}>
              <div
                className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl border-2 px-4 py-4 transition-all duration-300 ${
                  done
                    ? "border-[#16A34A] bg-[#F0FDF4]"
                    : active
                      ? "border-[#0194F3] bg-[#EAF4FE] shadow-md"
                      : "border-[#DCE7F3] bg-white"
                }`}
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold ${
                    done
                      ? "bg-[#16A34A] text-white"
                      : active
                        ? "bg-[#0194F3] text-white"
                        : "bg-[#DCE7F3] text-[#5B6B7A]"
                  }`}
                >
                  {done ? <Check className="h-5 w-5" /> : id}
                </div>

                <div className="min-w-0 flex-1">
                  <div
                    className={`text-sm font-semibold leading-5 md:text-base ${
                      done
                        ? "text-[#16A34A]"
                        : active
                          ? "text-[#0194F3]"
                          : "text-[#5B6B7A]"
                    }`}
                  >
                    {label}
                  </div>
                </div>
              </div>

              {idx < steps.length - 1 && (
                <div className="flex shrink-0 items-center justify-center">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${
                      step > id
                        ? "border-[#16A34A] bg-[#F0FDF4] text-[#16A34A]"
                        : active
                          ? "border-[#0194F3] bg-[#EAF4FE] text-[#0194F3]"
                          : "border-[#DCE7F3] bg-[#F5F7FA] text-[#5B6B7A]"
                    }`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="grid grid-cols-5 gap-2 bg-white px-4 py-4 md:hidden">
        {steps.map((_, idx) => {
          const id = idx + 1;
          const active = step === id;
          const done = step > id;

          return (
            <div key={id} className="flex items-center justify-center">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-sm font-bold ${
                  done
                    ? "border-[#16A34A] bg-[#16A34A] text-white"
                    : active
                      ? "border-[#0194F3] bg-[#0194F3] text-white"
                      : "border-[#DCE7F3] bg-white text-[#5B6B7A]"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : id}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
