// app/baocao/components/FlownServicesHint.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import { apiGet } from "./client-api";
import { Button } from "./ui";

export type FlownServices = {
  bookings: number;
  guests: number;
  flycam: number;
  video360: number;
  redFlag: number;
  sunset: number;
  flagFlight: number;
  mountainCar: number;
};

/**
 * Dịch vụ gia tăng CỘNG DỒN từ các booking đã tích "đã bay" trong ngày.
 *
 * Ba khách đều đăng ký camera 360, tích đã bay cả ba thì dòng này hiện "3×cam
 * 360" — quầy khỏi đếm tay. Đây chỉ là SỐ GỢI Ý: bấm "lấy số này" mới điền vào
 * form, và điền xong vẫn sửa được, vì khách hay đổi ý ngay tại bãi.
 *
 * Dùng chung cho trang điều phối · quầy vé · kế toán để ba bên nhìn cùng một số.
 */
export function FlownServicesHint({
  spot,
  date,
  onTake,
}: {
  spot: string;
  date: string;
  /** Bấm "lấy số này" — nơi gọi tự quyết định điền vào ô nào. */
  onTake?: (s: FlownServices) => void;
}) {
  const [flown, setFlown] = useState<FlownServices | null>(null);

  const load = useCallback(() => {
    if (!spot) return;
    apiGet<{ flown: FlownServices }>(`/api/baocao/booking?date=${date}&spot=${spot}`)
      .then((r) => setFlown(r.flown ?? null))
      .catch(() => {
        /* ngày chưa có booking nào thì thôi */
      });
  }, [spot, date]);

  useEffect(() => {
    load();
    // Điều phối tích "đã bay" bên banner thì số ở đây phải theo kịp
    const timer = setInterval(load, 30_000);
    return () => clearInterval(timer);
  }, [load]);

  if (!flown || flown.bookings === 0) return null;

  const parts = [
    flown.flycam ? `${flown.flycam}×flycam` : "",
    flown.video360 ? `${flown.video360}×cam 360` : "",
    flown.redFlag ? `${flown.redFlag}×cờ đỏ` : "",
    flown.sunset ? `${flown.sunset}×hoàng hôn/săn mây` : "",
    flown.flagFlight ? `${flown.flagFlight}×kéo cờ/bánh` : "",
    flown.mountainCar ? `${flown.mountainCar}×xe núi` : "",
  ].filter(Boolean);

  return (
    <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50/70 px-2.5 py-1.5">
      <span className="text-xs leading-snug text-emerald-900">
        🛫 <strong>{flown.bookings} booking đã bay</strong> ({flown.guests} khách)
        {parts.length ? <> — đăng ký: <strong>{parts.join(" · ")}</strong></> : " — không đăng ký dịch vụ nào"}
      </span>
      {onTake && parts.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          className="h-7 shrink-0 border-emerald-400 bg-white px-2 text-xs font-semibold text-emerald-800"
          onClick={() => onTake(flown)}
          title="Điền số này vào các ô dịch vụ — vẫn sửa lại được"
        >
          ⧉ Lấy số này
        </Button>
      )}
    </div>
  );
}
