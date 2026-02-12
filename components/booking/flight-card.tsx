"use client";
import React from "react";
import type { LocationKey } from "@/lib/booking/calculate-price";
import { LOCATIONS, formatVND } from "@/lib/booking/calculate-price";
import { getFlightByLocationKey } from "@/lib/booking/booking-data";
import { isWeekend } from "@/lib/booking/date-utils";

type Props = {
  location: LocationKey;
  selected?: boolean;
  onSelect?: (loc: LocationKey) => void;
  dateISO?: string; // nếu truyền, sẽ dùng để hiển thị giá có thể khác cuối tuần
};

export default function FlightCard({ location, selected, onSelect, dateISO }: Props) {
  const opt = getFlightByLocationKey(location);
  const cfg = LOCATIONS[location];

  // Ưu tiên hiển thị giá theo dataset cũ (weekday/weekend)
  const priceFromLegacy = (() => {
    const weekend = isWeekend(dateISO);
    if (weekend && opt.price.weekend) return opt.price.weekend;
    return opt.price.weekday ?? opt.price.weekend ?? 0;
  })();

  // nếu dataset cũ không có giá, fallback sang cấu hình LOCATIONS
  const basePrice = priceFromLegacy || cfg.basePriceVND(dateISO);

  return (
    <div
      role="button"
      onClick={() => onSelect?.(location)}
      className={`group overflow-hidden rounded-2xl border transition hover:shadow-md cursor-pointer ${
        selected ? "border-blue-600 ring-2 ring-blue-200" : "border-neutral-200"
      }`}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-100">
        <img
          src={opt.image}
          alt={opt.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">{opt.name}</div>
            {cfg.included?.length ? (
              <ul className="text-sm text-neutral-600 list-disc ml-5 mt-2">
                {cfg.included.slice(0, 3).map((it, i) => <li key={i}>{it}</li>)}
              </ul>
            ) : null}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{formatVND(basePrice)}</div>
            <div className="text-xs text-neutral-500">/ khách (giá cơ bản)</div>
          </div>
        </div>

        {opt.options?.length ? (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-neutral-600">
            {opt.options.slice(0, 2).map((o, i) => (
              <div key={i} className="rounded-md bg-neutral-100 px-2 py-1">
                {o.name} (+{o.price.toLocaleString("vi-VN")}₫)
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex justify-end">
          <span
            className={`rounded-xl px-3 py-1 text-sm font-medium ${
              selected ? "bg-blue-600 text-white" : "bg-neutral-100 text-neutral-700"
            }`}
          >
            {selected ? "Đã chọn" : "Chọn điểm bay"}
          </span>
        </div>
      </div>
    </div>
  );
}
