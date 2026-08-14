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
    /**
     * ĐÚNG MỘT HÀNG, thứ tự: Dữ liệu ngày [dd/mm/yyyy ▾] — [các điểm bay].
     *
     * `flex-nowrap` + cuộn ngang: máy hẹp thì kéo ngang chứ không gãy xuống dòng
     * (gãy dòng làm thanh này cao gấp đôi, đẩy hết nội dung xuống).
     */
    <div className="flex flex-nowrap items-center gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm lg:[column-span:all]">
      <span className="shrink-0 whitespace-nowrap text-base font-bold text-slate-900">Dữ liệu ngày</span>

      {/* Chính con số NGÀY là lịch: bấm vào là mở chọn ngày, chữ luôn dạng dd/mm/yyyy */}
      <label className="relative inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border-2 border-sky-400 bg-white px-2.5 focus-within:border-sky-600">
        <span className="whitespace-nowrap text-base font-bold tabular-nums text-sky-700">
          {formatDateKeyVN(date)}
        </span>
        <span aria-hidden className="text-xs text-sky-500">▾</span>
        <input
          type="date"
          value={date}
          min={min}
          max={max}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          onClick={(e) => (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.()}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label="Chọn ngày"
        />
      </label>

      {showSpots && <span aria-hidden className="shrink-0 text-slate-300">—</span>}

      {showSpots &&
        (spotOptions!.length > 1 ? (
          spotOptions!.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onSpotChange!(id)}
              className={
                id === spot
                  ? "h-10 shrink-0 whitespace-nowrap rounded-xl bg-sky-600 px-3 text-sm font-bold text-white"
                  : "h-10 shrink-0 whitespace-nowrap rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              }
            >
              {spotName(id)}
            </button>
          ))
        ) : (
          <span className="shrink-0 whitespace-nowrap text-base font-bold text-slate-900">
            📍 {spotName(spot!)}
          </span>
        ))}

      {loading && <span className="shrink-0 text-xs text-slate-400">đang tải…</span>}
    </div>
  );
}
