// app/baocao/components/DateBar.tsx
"use client";

import { formatDateKeyVN } from "@/lib/baobay/date";
import { spotName } from "@/lib/baobay/spots";

/**
 * MỘT thẻ cho cả "làm ở đâu" + "ngày nào" — giống nhau trên mọi trang /baocao.
 *
 * Nơi làm việc là nút TO (bấm bằng ngón cái trên điện thoại), ngày mặc định là
 * hôm nay. Gộp một chỗ vì đây là hai câu hỏi đầu tiên của mọi báo cáo: điểm
 * nào, ngày nào — trả lời xong mới tới số liệu.
 */
export function DateBar({
  date,
  onChange,
  min,
  max,
  loading,
  spot,
  spotOptions,
  onSpotChange,
}: {
  date: string;
  onChange: (next: string) => void;
  min?: string;
  max?: string;
  loading?: boolean;
  /** Điểm bay đang làm — truyền kèm options để thẻ hiện luôn nút chọn nơi làm việc. */
  spot?: string | null;
  spotOptions?: string[];
  onSpotChange?: (next: string) => void;
}) {
  const showSpots = Boolean(spot && spotOptions && onSpotChange);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm lg:[column-span:all]">
      {showSpots && (
        <div className="mb-2 border-b border-slate-100 pb-2">
          {spotOptions!.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {spotOptions!.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSpotChange!(id)}
                  className={
                    id === spot
                      ? "flex-1 rounded-xl bg-sky-600 px-4 py-3 text-base font-bold text-white"
                      : "flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-600 hover:bg-slate-50"
                  }
                >
                  {spotName(id)}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-base font-bold text-slate-900">📍 {spotName(spot!)}</div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span aria-hidden className="text-lg">
          📅
        </span>
        <span className="text-lg font-bold text-slate-900">Dữ liệu ngày {formatDateKeyVN(date)}</span>
        {loading && <span className="text-xs text-slate-400">đang tải…</span>}
        <input
          type="date"
          value={date}
          min={min}
          max={max}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="ml-auto h-12 rounded-xl border-2 border-sky-400 bg-white px-3 text-base font-semibold text-slate-900 outline-none focus:border-sky-600"
        />
      </div>
    </div>
  );
}
