// lib/baobay/nhan-khach.ts
/**
 * NHÃN SỐ KHÁCH trong ô chọn booking của các thẻ thêm / bớt / huỷ dịch vụ
 * (chủ 12/09): đoàn có khách PPG phải lộ ngay "2 khách (1×PPG 1×PG)" để người
 * bấm biết đang cộng dịch vụ cho chuyến dù động cơ hay dù thường. Đoàn toàn
 * PG thì chỉ "2 khách" — PG là mặc định, không cần nhắc.
 */
export function nhanKhach(guestCount: number, ppgGuests?: number | null): string {
  const tong = Math.max(0, Number(guestCount) || 0);
  const ppg = Math.min(tong, Math.max(0, Number(ppgGuests) || 0));
  if (!ppg) return `${tong} khách`;
  const pg = tong - ppg;
  return `${tong} khách (${ppg}×PPG${pg ? ` ${pg}×PG` : ""})`;
}
