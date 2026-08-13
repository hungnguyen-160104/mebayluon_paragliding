// app/baocao/components/DateBar.tsx
"use client";

import { formatDateKeyVN } from "@/lib/baobay/date";

/**
 * Thanh chọn NGÀY LÀM VIỆC gọn — một cái lịch nhỏ, giống nhau trên mọi trang
 * /baocao (phi công, điều phối, camera, chốt ngày). Thay cho thẻ "Ngày làm
 * việc" to bản cũ: đỡ chiếm màn hình điện thoại, mắt quen một chỗ.
 */
export function DateBar({
  date,
  onChange,
  min,
  max,
  loading,
}: {
  date: string;
  onChange: (next: string) => void;
  min?: string;
  max?: string;
  loading?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
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
        className="ml-auto h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-sky-600"
      />
    </div>
  );
}
