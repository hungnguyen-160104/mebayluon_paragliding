"use client";

/**
 * Ô CHỌN NGÀY GỌN — chữ hiện ra do MÌNH vẽ (14/09/2026), còn ô ngày gốc của
 * trình duyệt chỉ nằm phủ trong suốt lên trên để bấm vào vẫn mở lịch chọn.
 *
 * Vì sao (chủ 14/09): ô `<input type="date">` gốc tự in ngày theo ngôn ngữ và
 * máy của khách — Safari trên iPhone/Mac in cả "September 14, 2026" — nên chữ
 * tràn ra ngoài ô hẹp trên lịch homestay, không có CSS nào ép nó viết tắt được.
 * Tự vẽ chữ thì ô nào cũng gọn như nhau ở mọi máy; lịch chọn của hệ thống vẫn
 * dùng như thường vì ô gốc vẫn còn đó, chỉ là không nhìn thấy.
 */

import type { ChangeEvent } from "react";

function ddmmyyyy(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

export function NgayGon({
  value,
  onChange,
  min,
  max,
  placeholder = "chọn ngày",
  className = "",
  title,
}: {
  value: string;
  onChange: (iso: string, e: ChangeEvent<HTMLInputElement>) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  /** Lớp cho khung ngoài — cao, viền, chữ. Mặc định giống ô nhập của khu báo bay. */
  className?: string;
  title?: string;
}) {
  return (
    <span
      className={
        "relative inline-flex select-none items-center whitespace-nowrap rounded-lg border border-slate-300 bg-white px-2 " +
        (className || "h-9 text-sm")
      }
      title={title}
    >
      <span className={value ? "tabular-nums" : "text-slate-400"}>{ddmmyyyy(value) || placeholder}</span>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value, e)}
        aria-label={title || placeholder}
        /** Phủ kín khung, trong suốt: bấm đâu trong ô cũng mở lịch, mà chữ gốc không lộ ra. */
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </span>
  );
}
