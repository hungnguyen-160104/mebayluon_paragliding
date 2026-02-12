"use client";
import React from "react";
import { useBookingStore } from "@/store/booking-store";
import { LOCATIONS } from "@/lib/booking/calculate-price";

export default function ServiceOptions() {
  const data = useBookingStore((s) => s.data);
  const update = useBookingStore((s) => s.update);
  const cfg = LOCATIONS[data.location];

  const toggle = (key: "pickup"|"flycam"|"camera360") => {
    update({ addons: { ...data.addons, [key]: !(data.addons as any)[key] } })
  };

  return (
    <div className="space-y-3">
      <h4 className="font-semibold">Dịch vụ tuỳ chọn</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(["pickup", "flycam", "camera360"] as const).map((k) => {
          const conf = cfg.addons[k];
          const disabled = conf.pricePerPersonVND === null;
          return (
            <label key={k} className={`flex items-start gap-3 rounded-xl border p-3 ${disabled ? "opacity-50" : "hover:shadow"} `}>
              <input
                type="checkbox"
                disabled={disabled}
                checked={Boolean((data.addons as any)[k])}
                onChange={() => toggle(k)}
                className="mt-1 h-4 w-4"
              />
              <div>
                <div className="font-medium">{conf.label}</div>
                {conf.pricePerPersonVND !== null && (
                  <div className="text-sm text-neutral-600">{conf.pricePerPersonVND.toLocaleString("vi-VN")}₫ / khách</div>
                )}
                {conf.pricePerPersonVND === null && (
                  <div className="text-sm text-neutral-600">Không khả dụng tại điểm bay này</div>
                )}
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
