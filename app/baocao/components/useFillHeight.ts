"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * CHIỀU CAO CÒN LẠI THẬT SỰ của một khối, đo tại chỗ.
 *
 * Vì sao không dùng `calc(100vh - 210px)`: con số 210 là đoán. Phía trên lưới
 * có thanh tiêu đề, thanh ngày, dải nút lọc — mỗi màn hình một chiều cao khác,
 * hẹp thì các dải đó xuống dòng và cao gấp đôi. Đoán thiếu thì lưới thò xuống
 * dưới mép và phần đáy bị che; đoán thừa thì chừa một khoảng trắng vô duyên
 * giữa lúc người ta cần chỗ nhất.
 *
 * Đo bằng `getBoundingClientRect().top` thì luôn đúng: còn đúng bấy nhiêu chỗ
 * từ đỉnh khối tới đáy cửa sổ, trừ đi phần chừa cho dòng chú thích bên dưới.
 *
 * Dùng `innerHeight` chứ không `100vh`: trên điện thoại `100vh` tính cả thanh
 * địa chỉ đang ẩn, nên lưới luôn dài hơn màn hình đúng bằng chiều cao thanh đó.
 */
export function useFillHeight(bottomGap = 44, enabled = true) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number | null>(null);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el || !enabled) return setHeight(null);
    const top = el.getBoundingClientRect().top;
    /** Sàn 240px: cửa sổ quá thấp thì thà cuộn còn hơn lưới cụt còn hai dòng. */
    setHeight(Math.max(240, Math.round(window.innerHeight - top - bottomGap)));
  }, [bottomGap, enabled]);

  useEffect(() => {
    /**
     * Đo ở KHUNG HÌNH SAU, không đo ngay trong effect.
     *
     * Hai lý do, cùng một hướng: lúc effect chạy thì trình duyệt chưa dựng xong
     * bố cục nên `getBoundingClientRect().top` còn là số cũ; và đặt state ngay
     * trong effect thì React vẽ lại dây chuyền (eslint chặn đúng chỗ này).
     */
    const raf = requestAnimationFrame(measure);
    if (!enabled) return () => cancelAnimationFrame(raf);
    window.addEventListener("resize", measure);
    /**
       Dải nút phía trên xuống dòng (gõ vào ô tìm kiếm, đổi bộ lọc) là đỉnh lưới
       tụt xuống — phải đo lại, không thì đáy lưới chui xuống dưới mép cửa sổ.
     */
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro && ref.current?.parentElement) ro.observe(ref.current.parentElement);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      ro?.disconnect();
    };
  }, [measure, enabled]);

  return { ref, height, remeasure: measure };
}
