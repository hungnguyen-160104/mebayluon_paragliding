"use client";

/**
 * DẢI NƯỚC TRONG Ô MƯA của bảng giờ — kiểu bảng Basic trên windy.com.
 *
 * Con số milimét nói chính xác, nhưng đọc một hàng hai chục con số thì mắt
 * không dựng lại được HÌNH DÁNG cơn mưa: mưa dồn vào ba tiếng trưa hay rả rích
 * cả ngày, đỉnh mưa rơi vào lúc nào. Dải nước dâng theo lượng mưa trả lời đúng
 * câu đó trong một cái liếc, mà số vẫn nằm nguyên trên nền (luật chủ 10/09).
 *
 * HAI MÀU như cột mưa của meteogram: xanh là mưa thường, cam là phần mưa rào /
 * giông chồng lên trên — mưa dầm thì chờ ngớt là bay, còn giông thì gió đổ
 * xuống quét qua bãi trước khi mưa tới.
 *
 * Thang cao thấp lấy theo GIỜ MƯA TO NHẤT đang bày, kẹp trong 2–10mm: ngày mưa
 * nhỏ mà chia theo chính nó thì 0,5mm đã dâng đầy ô, nhìn như bão; ngược lại
 * một giờ 25mm ở cuối dải sẽ dìm mọi giờ khác xuống sát đáy.
 *
 * Dâng theo CĂN BẬC HAI của lượng mưa, không theo tỉ lệ thẳng: mắt so diện
 * tích chứ không so số, và mưa 1mm với mưa 8mm đều là chuyện phải biết — chia
 * thẳng thì 1mm chỉ còn một vệt 12% không ai thấy.
 */

import { MUA_BAY, MUA_DANG_KE } from "@/lib/baobay/thoi-tiet";

export function DaiMua({ mm, rao = 0, max, cao = 18 }: { mm: number; rao?: number; max: number; cao?: number }) {
  if (!Number.isFinite(mm) || mm < MUA_BAY) return null;
  const thang = Math.min(10, Math.max(2, max));
  /** Sàn 20%: giờ mưa bé nhất vẫn phải thấy được vệt nước, không thì coi như không vẽ. */
  const pt = Math.max(20, Math.min(100, Math.sqrt(mm / thang) * 100));
  const phanRao = Math.max(0, Math.min(mm, rao)) / mm;
  const that = mm >= MUA_DANG_KE;
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden"
      style={{ height: `${(pt / 100) * cao}px` }}
    >
      {/* Nền là phần mưa thường; dải cam phủ từ trên xuống theo tỉ lệ giông. */}
      <span className="absolute inset-0" style={{ background: that ? "#60a5fa" : "#bfdbfe" }} />
      {phanRao > 0 && (
        <span
          className="absolute inset-x-0 top-0"
          style={{ height: `${phanRao * 100}%`, background: that ? "#fb923c" : "#fed7aa" }}
        />
      )}
    </span>
  );
}

/** Giờ mưa to nhất trong dải đang bày — dùng làm thang cho mọi ô. */
export function dinhMua(gio: Array<{ mua: number }>): number {
  return gio.reduce((t, g) => Math.max(t, g.mua || 0), 0);
}
