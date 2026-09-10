"use client";

/**
 * CUỘN NGANG QUA NHIỀU NGÀY, đồng bộ với dải ngày phía trên.
 *
 * Dùng chung cho cả ba kiểu xem (Basic · Meteogram · Airgram) để chúng cư xử
 * y như nhau: vuốt ngang là chạy tiếp sang ngày sau, bấm ngày ở dải trên thì
 * trượt tới ngày đó, và gạt tới ngày nào thì dải trên sáng ngày ấy.
 *
 * Bắt theo MỐC TRONG DOM (`data-ngay="YYYY-MM-DD"`) chứ không theo bề rộng cột:
 * bảng Basic là `<table>` với cột co giãn theo nội dung, còn biểu đồ là các ô
 * rộng cố định — nhân bề rộng ra thì bảng lệch dần rồi nhảy sai ngày. Đo bằng
 * vị trí thật của mốc thì kiểu nào cũng đúng.
 *
 * Cột nhãn trục bên trái DÍNH khi cuộn nên phải trừ bề ngang của nó ra, nếu
 * không ngày vừa trượt tới lại nằm khuất sau nhãn. Đánh dấu cột ấy bằng
 * `data-truc`.
 */

import { useCallback, useEffect, useRef } from "react";

export function useCuonTheoNgay(ngayChon?: string | null, onNgayHien?: (ngay: string) => void) {
  const ref = useRef<HTMLDivElement>(null);
  /** Ngày CHÍNH MÌNH vừa báo lên do người gạt — để cái effect dưới không kéo ngược lại. */
  const daBao = useRef<string | null>(null);
  const dangCho = useRef<number | null>(null);

  /** Vị trí của một mốc, tính theo hệ toạ độ TRONG khung cuộn. */
  const viTri = (khung: HTMLElement, moc: HTMLElement) =>
    moc.getBoundingClientRect().left - khung.getBoundingClientRect().left + khung.scrollLeft;

  /** Bề ngang cột nhãn trục dính bên trái (0 nếu kiểu xem đó không có). */
  const beNgangTruc = (khung: HTMLElement) =>
    khung.querySelector<HTMLElement>("[data-truc]")?.getBoundingClientRect().width ?? 0;

  useEffect(() => {
    const el = ref.current;
    if (!el || !ngayChon || ngayChon === daBao.current) return;
    const moc = el.querySelector<HTMLElement>(`[data-ngay="${ngayChon}"]`);
    if (!moc) return;
    el.scrollTo({ left: Math.max(0, viTri(el, moc) - beNgangTruc(el)), behavior: "smooth" });
  }, [ngayChon]);

  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el || !onNgayHien) return;
    /** Gộp nhiều sự kiện cuộn vào một khung hình — vuốt một cái bắn ra hàng chục lần. */
    if (dangCho.current !== null) return;
    dangCho.current = requestAnimationFrame(() => {
      dangCho.current = null;
      const moc = [...el.querySelectorAll<HTMLElement>("[data-ngay]")];
      if (!moc.length) return;
      /** Ngày "đang xem" = mốc cuối cùng đã trôi qua mép trái (chừa 8px cho khỏi rung ở ranh giới). */
      const mep = el.scrollLeft + beNgangTruc(el) + 8;
      let chon = moc[0];
      for (const m of moc) if (viTri(el, m) <= mep) chon = m;
      const d = chon.dataset.ngay;
      if (d && d !== daBao.current) {
        daBao.current = d;
        onNgayHien(d);
      }
    });
  }, [onNgayHien]);

  return { ref, onScroll };
}
