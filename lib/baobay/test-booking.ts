// lib/baobay/test-booking.ts

/**
 * Booking THỬ NGHIỆM: nhận diện DUY NHẤT bằng email đặt chỗ.
 *
 * Trước đây còn soi chữ "test" trong tên khách, nhưng tên thật cũng có thể chứa
 * chuỗi đó ("Matesten", "Tester"…) nên đã bỏ hẳn — nhận diện sai một khách thật
 * là mất luôn đơn của họ khỏi sổ vận hành, hại hơn nhiều so với việc phải xoá
 * tay một đơn thử.
 *
 * Đơn thử nghiệm KHÔNG chảy vào sổ nội bộ (/baocao) và KHÔNG lên Google Sheet.
 * Thêm hộp thư thử mới thì chỉ cần thêm một dòng vào danh sách dưới đây.
 */
const TEST_EMAILS = ["dangvm@gmail.com", "dnh0388@gmail.com"];

export function isTestBookingEmail(email?: string | null): boolean {
  const value = String(email ?? "")
    .trim()
    .toLowerCase();
  return value.length > 0 && TEST_EMAILS.includes(value);
}

/** Đơn thử nghiệm hay không — chỉ căn cứ email đặt chỗ. */
export function isTestBooking(input: { email?: string | null }): boolean {
  return isTestBookingEmail(input.email);
}
