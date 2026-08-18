import { Booking } from "@/models/Booking.model";

/**
 * TRẢ SỐ THỨ TỰ NGƯỢC VỀ ĐƠN TRÊN WEB.
 *
 * Số thứ tự trong ngày (`daySeq` của sổ điều hành) chính là THỨ TỰ ƯU TIÊN
 * bay: ai đặt trước có số nhỏ, số nhỏ được bay trước. Khách đặt xong chỉ nhận
 * mã đơn, không biết mình đứng thứ mấy nên gọi điện hỏi suốt — ghi số này về
 * đơn web để trang cảm ơn nói được "số thứ tự của bạn là 3".
 *
 * Ghi kèm `queueDate` vì số chỉ có nghĩa trong đúng một ngày bay: dời lịch là
 * nhận số mới của ngày mới, số cũ bỏ lại ngày cũ.
 *
 * Lỗi ở đây KHÔNG được làm hỏng việc đang làm (đồng bộ, dời lịch, huỷ) — số
 * thứ tự chỉ là thông tin báo thêm cho khách.
 */
export async function pushQueueNoToWeb(webId: string, daySeq: number, flightDate: string) {
  if (!webId || !daySeq) return;
  try {
    await Booking.updateOne(
      { _id: webId },
      { $set: { queueNo: daySeq, queueDate: flightDate, queueUpdatedAt: new Date() } },
    );
  } catch (err) {
    console.error("[web-queue] không ghi được số thứ tự về đơn web:", err);
  }
}

/**
 * Đơn bị huỷ / nhập nhầm thì XOÁ số trên web: để lại số cũ là khách vẫn thấy
 * "số thứ tự của bạn là 3" trong khi chỗ đó đã trả cho người khác.
 */
export async function clearQueueNoOnWeb(webId: string) {
  if (!webId) return;
  try {
    await Booking.updateOne(
      { _id: webId },
      { $unset: { queueNo: "", queueDate: "" }, $set: { queueUpdatedAt: new Date() } },
    );
  } catch (err) {
    console.error("[web-queue] không xoá được số thứ tự trên đơn web:", err);
  }
}
