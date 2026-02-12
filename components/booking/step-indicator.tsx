"use client";
import React from "react";
import { useBookingStore } from "@/store/booking-store";
import { useBookingText } from "@/lib/booking/translations-booking";

export default function StepIndicator() {
  const step = useBookingStore((s) => s.step);
  const t = useBookingText();
  const steps = t.stepNames;

  return (
    <ol className="flex items-center justify-between gap-2">
      {steps.map((label, idx) => {
        const id = idx + 1;
        const active = step === id;
        const done = step > id;
        return (
          <li key={id} className="flex-1">
            <div className="flex items-center">
              <div
                className={`flex size-9 items-center justify-center rounded-full border text-sm font-semibold
                ${done ? "bg-green-500 text-white border-green-500" : active ? "bg-blue-600 text-white border-blue-600" : "bg-white border-neutral-300 text-neutral-600"}`}
              >
                {done ? "✓" : id}
              </div>
              <div className="ml-3 text-sm font-medium text-neutral-700">{label}</div>
              {idx < steps.length - 1 && (
                <div className={`mx-3 h-px flex-1 ${step > id ? "bg-green-400" : "bg-neutral-200"}`} />
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
