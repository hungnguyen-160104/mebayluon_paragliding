// app/baobay/components/spot.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import { normalizeSpot, spotName, type SpotId } from "@/lib/baobay/spots";

/**
 * Chọn điểm bay đang làm việc.
 *
 * Mỗi điểm bay là một hệ thống riêng, nên MỌI lời gọi API đọc/ghi số liệu đều
 * phải kèm ?spot=… Component này giữ điểm đang chọn và nhớ lại lựa chọn lần
 * trước trong localStorage — phi công bay Khau Phạ cả tuần thì mở app lên là
 * đúng điểm ấy, khỏi chọn lại mỗi ngày.
 *
 * Người chỉ được chỉ định MỘT điểm thì không thấy nút chọn, chỉ thấy tên điểm.
 */

const STORAGE_KEY = "mbl_baobay_spot";

export function useSpot(spots: string[] | undefined): {
  spot: SpotId | null;
  setSpot: (next: SpotId) => void;
  options: SpotId[];
} {
  const options = (spots ?? []).map(normalizeSpot);
  const [spot, setSpotState] = useState<SpotId | null>(null);

  useEffect(() => {
    if (!options.length) return;

    // Lựa chọn cũ chỉ dùng lại khi người này vẫn còn được chỉ định điểm đó
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    const next = saved && options.includes(normalizeSpot(saved)) ? normalizeSpot(saved) : options[0];

    setSpotState((current) => (current && options.includes(current) ? current : next));
    // options là mảng mới mỗi lần render nên so theo nội dung, không so tham chiếu
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.join(",")]);

  const setSpot = useCallback((next: SpotId) => {
    setSpotState(next);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  return { spot, setSpot, options };
}

export function SpotSwitcher({
  spot,
  options,
  onChange,
  hint,
}: {
  spot: SpotId | null;
  options: SpotId[];
  onChange: (next: SpotId) => void;
  hint?: string;
}) {
  if (!spot) return null;

  // Một điểm duy nhất: hiện nhãn cho biết mình đang ở đâu, không cần nút bấm
  if (options.length <= 1) {
    return (
      <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="text-xs text-slate-500">Điểm bay</div>
        <div className="text-base font-semibold text-slate-900">{spotName(spot)}</div>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50/60 px-4 py-3">
      <div className="mb-2 text-xs font-medium text-sky-900">
        Điểm bay — chọn đúng nơi làm việc của ngày này
        {hint ? ` · ${hint}` : ""}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={
              id === spot
                ? "rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white"
                : "rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            }
          >
            {spotName(id)}
          </button>
        ))}
      </div>
    </div>
  );
}
