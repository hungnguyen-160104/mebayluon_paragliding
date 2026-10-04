// app/baocao/components/ngay-lam-viec.ts
"use client";

/**
 * NGÀY ĐANG XEM, GIỮ QUA F5 (chủ 13/09: "khó chịu nhất là khi F5 thì app tự
 * đưa về ngày hôm nay và điểm bay mặc định chứ không phải tải lại theo lựa
 * chọn sẵn có").
 *
 * Giữ trong ĐỊA CHỈ TRANG (?date=…&spot=…) chứ không phải bộ nhớ máy:
 *  - F5 là tải lại đúng trang đang xem, vì địa chỉ đã nói rõ ngày và điểm;
 *  - nút lùi/tiến của trình duyệt chạy đúng;
 *  - gửi link cho đồng nghiệp là họ mở ra thấy đúng thứ mình đang xem;
 *  - mở link mới (không có ?date=) thì vẫn là hôm nay, không bị kẹt ở ngày cũ
 *    như khi nhớ trong máy.
 *
 * Đổi địa chỉ bằng `replaceState` chứ không phải router.replace: chuyển ngày là
 * việc bấm liên tục, đẩy vào lịch sử điều hướng của Next thì mỗi lần bấm là một
 * lượt dựng lại trang, và nút lùi phải bấm hai chục lần mới ra khỏi trang.
 *
 * QUA NỬA ĐÊM (chủ 04/10: "F5 hay bị nhảy ngày"): trang mở không có ?date= thì
 * đang xem "hôm nay" — nhưng hôm nay của LÚC MỞ. Để qua 0h rồi F5 là nhảy sang
 * ngày mới, dù màn hình đang hiện ngày cũ. Nay:
 *  - đang NHÌN trang lúc qua 0h → ghim ngày đang hiện vào địa chỉ, F5 vẫn y nguyên;
 *  - tab nằm NỀN qua 0h rồi mới mở lại → chuyển sang hôm nay (chưa ai nhìn ngày
 *    cũ, mở lại sáng hôm sau mà còn kẹt ngày hôm qua là nhập nhầm ngày).
 * Ngày đã chọn tay (hoặc có sẵn trong địa chỉ) thì không bao giờ tự đổi.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { isDateKey, todayInVN } from "@/lib/baobay/date";

function docUrl(khoa: string): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(khoa) ?? "";
}

/** Ghi một hay nhiều tham số trong MỘT lần đổi địa chỉ; giá trị rỗng là xoá. */
function ghiUrlNhieu(giaTri: Record<string, string>): void {
  if (typeof window === "undefined") return;
  const u = new URL(window.location.href);
  let doi = false;
  for (const [khoa, v] of Object.entries(giaTri)) {
    if ((u.searchParams.get(khoa) ?? "") === v) continue;
    doi = true;
    if (v) u.searchParams.set(khoa, v);
    else u.searchParams.delete(khoa);
  }
  if (!doi) return;
  /**
   * PHẢI truyền `null`, KHÔNG truyền window.history.state: Next 15 vá sẵn
   * replaceState — state không mang dấu __NA của nó thì nó chép state nội bộ
   * sang VÀ cập nhật địa chỉ chuẩn của router. Truyền nguyên state của Next là
   * đi lối tắt, router không biết địa chỉ đã đổi và lần dựng lại sau sẽ ghi đè
   * mất ?date=.
   */
  window.history.replaceState(null, "", u.toString());
}

function ghiUrl(khoa: string, giaTri: string): void {
  ghiUrlNhieu({ [khoa]: giaTri });
}

/**
 * Ngày làm việc của trang. `macDinh` thường là hôm nay.
 *
 * Lần dựng đầu LUÔN trả `macDinh` để bản dựng ở máy chủ và ở trình duyệt giống
 * nhau (React báo lỗi nếu lệch); đọc địa chỉ ngay sau đó trong effect. Trang
 * nào cũng chỉ hiện thanh ngày SAU khi có phiên đăng nhập (vẫn là màn "Đang
 * tải…" lúc effect này chạy), nên người dùng không thấy ngày mặc định chớp qua.
 */
export function useNgayLamViec(macDinh: string): [string, (next: string) => void] {
  const [date, setDateState] = useState(macDinh);
  /** Ngày đã nằm trong địa chỉ (chọn tay / link có sẵn / đã ghim) — không tự đổi nữa. */
  const daGhim = useRef(false);
  const dangXem = useRef(date);
  useEffect(() => {
    dangXem.current = date;
  }, [date]);

  useEffect(() => {
    const tuUrl = docUrl("date");
    if (tuUrl && isDateKey(tuUrl)) {
      daGhim.current = true;
      if (tuUrl !== macDinh) setDateState(tuUrl);
    }
    // chỉ đọc một lần lúc mở trang
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Qua nửa đêm khi trang chưa ghim ngày — xem ghi chú đầu tệp. */
  useEffect(() => {
    const soat = () => {
      if (daGhim.current) return;
      const homNay = todayInVN();
      if (homNay === dangXem.current) return;
      if (document.visibilityState === "visible") {
        // Đang nhìn: giữ ngày đang hiện, ghim vào địa chỉ để F5 không nhảy
        daGhim.current = true;
        ghiUrl("date", dangXem.current);
      }
    };
    const khiHienLai = () => {
      if (document.visibilityState !== "visible" || daGhim.current) return;
      const homNay = todayInVN();
      if (homNay !== dangXem.current) setDateState(homNay);
    };
    const timer = window.setInterval(soat, 30_000);
    document.addEventListener("visibilitychange", khiHienLai);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", khiHienLai);
    };
  }, []);

  const setDate = useCallback((next: string) => {
    daGhim.current = true;
    setDateState(next);
    ghiUrl("date", next);
  }, []);

  return [date, setDate];
}

/** Đọc điểm bay từ địa chỉ trang (nếu có) — dùng chung với useSpot. */
export function spotTuUrl(): string {
  return docUrl("spot");
}

/** Ghi điểm bay vào địa chỉ trang. */
export function ghiSpotUrl(spot: string): void {
  ghiUrl("spot", spot);
}

/**
 * SỔ BOOKING TOÀN MÀN HÌNH cũng nằm trong địa chỉ (?fs=1&fsDate=…&fsSpot=…).
 *
 * Sổ phóng to có thanh chọn ngày/điểm RIÊNG (thoát ra là về đúng ngày của
 * trang). Trước đây lựa chọn đó chỉ nằm trong bộ nhớ: soát sổ ngày 28/09 ở chế
 * độ toàn màn hình, F5 một cái là sổ co lại và nhảy về ngày của trang — đúng
 * cảnh "F5 hay bị nhảy ngày" chủ báo 04/10.
 */
export type ToanManHinhUrl = { date: string | null; spot: string | null };

export function docToanManHinhUrl(): ToanManHinhUrl | null {
  if (docUrl("fs") !== "1") return null;
  const d = docUrl("fsDate");
  const s = docUrl("fsSpot");
  return { date: d && isDateKey(d) ? d : null, spot: s || null };
}

export function ghiToanManHinhUrl(trangThai: ToanManHinhUrl | null): void {
  ghiUrlNhieu({ fs: trangThai ? "1" : "", fsDate: trangThai?.date ?? "", fsSpot: trangThai?.spot ?? "" });
}
