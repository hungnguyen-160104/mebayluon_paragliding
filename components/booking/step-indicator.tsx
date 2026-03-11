"use client";

import React from "react";
import { useBookingStore } from "@/store/booking-store";
import { useBookingText } from "@/lib/booking/translations-booking";

export default function StepIndicator() {
  const step = useBookingStore((s) => s.step);
  const t = useBookingText();
  const steps = t.stepNames;
  const currentLabel = steps[step - 1] || "";

  return (
    <div className="rounded-[24px] border border-white/15 bg-white/10 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] overflow-hidden">
      <div className="px-4 py-3 md:px-5 border-b border-white/10 bg-gradient-to-r from-sky-500/15 to-transparent">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">
              Booking progress
            </div>
            <div className="mt-1 text-sm md:text-base font-semibold text-white">
              {currentLabel}
            </div>
          </div>

          <div className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs font-semibold text-white/80">
            {step}/{steps.length}
          </div>
        </div>

        <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-400 transition-all duration-300"
            style={{ width: `${(step / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="hidden md:grid grid-cols-5 gap-2 px-4 py-4 md:px-5">
        {steps.map((label, idx) => {
          const id = idx + 1;
          const active = step === id;
          const done = step > id;

          return (
            <div
              key={id}
              className={`rounded-2xl border px-3 py-3 transition ${
                done
                  ? "border-emerald-300/30 bg-emerald-400/10"
                  : active
                    ? "border-sky-300/40 bg-sky-400/12"
                    : "border-white/10 bg-white/5"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                    done
                      ? "bg-emerald-400 text-slate-950"
                      : active
                        ? "bg-sky-300 text-slate-950"
                        : "bg-white/10 text-white/70"
                  }`}
                >
                  {done ? "✓" : id}
                </div>

                <div className="min-w-0">
                  <div
                    className={`text-xs uppercase tracking-[0.14em] ${
                      done || active ? "text-white/65" : "text-white/40"
                    }`}
                  >
                    Step {id}
                  </div>
                  <div
                    className={`mt-1 text-sm font-medium truncate ${
                      done || active ? "text-white" : "text-white/55"
                    }`}
                  >
                    {label}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid md:hidden grid-cols-5 gap-2 px-4 py-4">
        {steps.map((_, idx) => {
          const id = idx + 1;
          const active = step === id;
          const done = step > id;

          return (
            <div
              key={id}
              className={`h-10 rounded-2xl border flex items-center justify-center text-sm font-semibold ${
                done
                  ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
                  : active
                    ? "border-sky-300/40 bg-sky-400/12 text-sky-100"
                    : "border-white/10 bg-white/5 text-white/45"
              }`}
            >
              {done ? "✓" : id}
            </div>
          );
        })}
      </div>
    </div>
  );
}