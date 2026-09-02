// services/baobay-agency.service.ts
/**
 * TỔNG HỢP KHÁCH THEO ĐẠI LÝ — cho kế toán quyết toán tiền theo tháng.
 *
 * Klook / Agoda / BlueHome / SEEK / GYG… gửi khách cho công ty, khách thường
 * đã trả (một phần) cho đại lý; cuối tháng hai bên đối chiếu: đại lý phải trả
 * cho công ty phần khách của những booking ĐÃ BAY, khách huỷ thì tuỳ chính
 * sách, khách đổi lịch thì rơi sang tháng của ngày bay mới. Bảng này bày đúng
 * ba tình trạng đó theo từng đại lý để kế toán chốt số.
 *
 * "Đại lý" của một booking lấy từ ô agencyName (đi kèm khoản "Đại lý đã thu");
 * booking chưa điền agencyName thì lấy theo Nguồn (source) — cùng quy tắc với
 * ô tự điền tên đại lý ở form booking. Gom nhóm KHÔNG phân biệt hoa thường để
 * "Klook" với "KLOOK" không thành hai đại lý.
 */
import { spotName } from "@/lib/baobay/spots";
import type { BaobaySession } from "@/lib/baobay/token";
import { connectDB } from "@/lib/mongodb";
import { BaobayBooking } from "@/models/BaobayBooking.model";
import { BaobayError } from "@/services/baobay.service";

export type AgencyBookingDTO = {
  bookingId: string;
  /** Khoá gom nhóm — tên đại lý viết HOA, đã trim. */
  agency: string;
  spot: string;
  spotLabel: string;
  flightDate: string;
  daySeq: number;
  contactName: string;
  bookingCode: string;
  source: string;
  guestCount: number;
  cancelledGuests: number;
  status: "open" | "done" | "cancelled";
  /** Booking từng bị dời từ (các) ngày này sang flightDate hiện tại. */
  rescheduledFrom: string[];
  totalAmount: number;
  /** Phần khách đã trả cho đại lý — số công ty đòi đại lý khi quyết toán. */
  agencyPaidAmount: number;
  deposit: number;
};

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Booking của MỘT THÁNG có dính đại lý (theo ngày bay). Trả phẳng từng booking
 * — trang tự gom theo cột `agency`, đỡ một vòng khứ hồi khi kế toán bấm qua
 * lại giữa các đại lý.
 */
export async function listAgencyMonth(
  session: BaobaySession,
  month: string,
): Promise<{ rows: AgencyBookingDTO[] }> {
  await connectDB();
  if (!MONTH_RE.test(month)) throw new BaobayError("Tháng không hợp lệ (YYYY-MM)", 400);

  /** So sánh chuỗi YYYY-MM-DD: "-99" chặn trên là đủ, khỏi tính ngày cuối tháng. */
  const spots = session.spots?.length ? session.spots : undefined;
  const bookings = await BaobayBooking.find({
    ...(spots ? { spot: { $in: spots } } : {}),
    flightDate: { $gte: `${month}-01`, $lte: `${month}-99` },
    status: { $ne: "voided" },
    /**
     * Chỉ booking CÓ đại lý/nguồn. Nguồn tự do nên FB/Zalo… cũng lọt vào —
     * cố ý: kế toán tự lựa tên cần đối soát trên danh sách, máy không nên
     * đoán chữ nào là đại lý "thật" rồi giấu mất một nguồn tiền.
     */
    $or: [{ agencyName: { $nin: ["", null] } }, { source: { $nin: ["", null] } }],
  })
    .sort({ flightDate: 1, spot: 1, daySeq: 1 })
    .limit(3_000)
    .select(
      "spot flightDate daySeq contactName bookingCode source guestCount cancelledGuests status rescheduledFrom totalAmount agencyPaidAmount agencyName deposit",
    )
    .lean<any[]>();

  return {
    rows: bookings.map((b) => ({
      bookingId: String(b._id),
      agency: String(b.agencyName || b.source || "").trim().toUpperCase() || "KHÔNG RÕ",
      spot: b.spot,
      spotLabel: spotName(b.spot),
      flightDate: b.flightDate || "",
      daySeq: b.daySeq ?? 0,
      contactName: b.contactName || "",
      bookingCode: b.bookingCode || "",
      source: b.source || "",
      guestCount: b.guestCount ?? 0,
      cancelledGuests: b.cancelledGuests ?? 0,
      status: (b.status as AgencyBookingDTO["status"]) || "open",
      rescheduledFrom: Array.isArray(b.rescheduledFrom) ? b.rescheduledFrom.filter(Boolean) : [],
      totalAmount: b.totalAmount ?? 0,
      agencyPaidAmount: b.agencyPaidAmount ?? 0,
      deposit: b.deposit ?? 0,
    })),
  };
}
