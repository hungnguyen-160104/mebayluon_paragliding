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
 */

import { useCallback, useEffect, useState } from "react";

import { isDateKey } from "@/lib/baobay/date";

function docUrl(khoa: string): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(khoa) ?? "";
}

function ghiUrl(khoa: string, giaTri: string): void {
  if (typeof window === "undefined") return;
  const u = new URL(window.location.href);
  if (giaTri) u.searchParams.set(khoa, giaTri);
  else u.searchParams.delete(khoa);
  window.history.replaceState(null, "", u.toString());
}

/**
 * Ngày làm việc của trang. `macDinh` thường là hôm nay.
 *
 * Lần dựng đầu LUÔN trả `macDinh` để bản dựng ở máy chủ và ở trình duyệt giống
 * nhau (React báo lỗi nếu lệch); đọc địa chỉ ngay sau đó trong effect.
 */
export function useNgayLamViec(macDinh: string): [string, (next: string) => void] {
  const [date, setDateState] = useState(macDinh);

  useEffect(() => {
    const tuUrl = docUrl("date");
    if (tuUrl && isDateKey(tuUrl) && tuUrl !== macDinh) setDateState(tuUrl);
    // chỉ đọc một lần lúc mở trang
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setDate = useCallback((next: string) => {
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
