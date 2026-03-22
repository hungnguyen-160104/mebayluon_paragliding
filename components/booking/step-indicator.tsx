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
    <div className="overflow-hidden rounded-[26px] border border-slate-300/80 bg-white/88 shadow-[0_16px_40px_rgba(0,0,0,0.14)] backdrop-blur-md">
      <div className="border-b border-slate-200 bg-gradient-to-r from-sky-50 via-white to-slate-50 px-4 py-4 md:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
              Booking progress
            </div>
            <div className="mt-1 text-lg font-bold text-slate-800 md:text-xl">
              {currentLabel}
            </div>
          </div>

          <div className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
            {step}/{steps.length}
          </div>
        </div>

        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="hidden items-stretch gap-2 px-4 py-5 md:flex md:px-6">
        {steps.map((label, idx) => {
          const id = idx + 1;
          const active = step === id;
          const done = step > id;

          return (
            <React.Fragment key={id}>
              <div
                className={`flex min-w-0 flex-1 items-center gap-3 rounded-2xl border px-4 py-4 transition-all duration-300 ${
                  done
                    ? "border-emerald-300 bg-emerald-50"
                    : active
                      ? "border-sky-400 bg-sky-50 shadow-[0_8px_20px_rgba(14,165,233,0.12)]"
                      : "border-slate-200 bg-white"
                }`}
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold ${
                    done
                      ? "bg-emerald-500 text-white"
                      : active
                        ? "bg-sky-500 text-white"
                        : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {done ? <Check className="h-5 w-5" /> : id}
                </div>

                <div className="min-w-0 flex-1">
                  <div
                    className={`text-sm font-semibold leading-5 md:text-base ${
                      done
                        ? "text-emerald-700"
                        : active
                          ? "text-sky-700"
                          : "text-slate-700"
                    }`}
                  >
                    {label}
                  </div>
                </div>
              </div>

              {idx < steps.length - 1 && (
                <div className="flex shrink-0 items-center justify-center">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full border ${
                      step > id
                        ? "border-emerald-300 bg-emerald-50 text-emerald-600"
                        : active
                          ? "border-sky-300 bg-sky-50 text-sky-600"
                          : "border-slate-200 bg-slate-50 text-slate-400"
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

      <div className="grid grid-cols-5 gap-2 px-4 py-4 md:hidden">
        {steps.map((_, idx) => {
          const id = idx + 1;
          const active = step === id;
          const done = step > id;

          return (
            <div key={id} className="flex items-center justify-center">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-full border text-sm font-bold ${
                  done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : active
                      ? "border-sky-500 bg-sky-500 text-white"
                      : "border-slate-300 bg-white text-slate-600"
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