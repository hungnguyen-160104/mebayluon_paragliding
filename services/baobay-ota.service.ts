// services/baobay-ota.service.ts

/**
 * Đưa booking OTA từ THƯ ĐIỆN TỬ vào sổ nội bộ (/baocao).
 *
 * Gmail (Apps Script) quét nhãn OTA rồi gọi vào đây, gửi kèm mã thư của Gmail.
 * Mã thư là khoá chống trùng: chạy lại bao nhiêu lần cũng không nhân đôi booking.
 *
 * Nguyên tắc giữ an toàn số liệu:
 *  - Thư ĐẶT MỚI: tạo booking. Tiền để 0 vì khách trả cho OTA rồi, quầy không thu.
 *  - Thư HUỶ: chuyển booking sang "đã huỷ", KHÔNG tự hoàn tiền (OTA hoàn cho khách).
 *  - Thư ĐỔI LỊCH: đổi ngày/giờ và ghi thêm một dòng ghi chú, nhưng KHÔNG đụng
 *    tiền cọc, người thu, người được giao — mấy thứ đó là của nhân sự.
 *  - Bóc không nổi, hoặc không rõ điểm bay, hoặc huỷ mà không tìm thấy booking:
 *    thư nằm lại trạng thái "cần soát" kèm nguyên văn, KHÔNG bao giờ bỏ im.
 */

import { formatDateKeyVN, isDateKey, todayInVN } from "@/lib/baobay/date";
import { parseKlookEmail, pickupFromDeparture, spotFromProduct, type KlookBooking } from "@/lib/baobay/ota-klook";
import { connectDB } from "@/lib/mongodb";
import { BaobayBooking } from "@/models/BaobayBooking.model";
import { OtaEmail } from "@/models/OtaEmail.model";

export type OtaInbound = {
  ota: string;
  gmailId: string;
  subject: string;
  body: string;
  receivedAt?: string;
};

export type OtaIngestResult = {
  gmailId: string;
  /** "created" | "cancelled" | "amended" | "duplicate" | "review" */
  action: string;
  ref?: string;
  message: string;
};

/** Ghi chú gộp cho booking — thứ điều phối cần đọc trước khi gọi khách. */
function noteOf(b: KlookBooking): string {
  const parts = [b.packageLabel, b.specialRequirements, b.preferredTimeRaw ? `giờ khách muốn: ${b.preferredTimeRaw}` : ""];
  if (b.leadEmail) parts.push(b.leadEmail);
  const guests = b.guests
    .map((g) => [g.fullName, g.birthday, g.idNumber].filter(Boolean).join(" "))
    .filter(Boolean);
  if (guests.length) parts.push(`giấy tờ: ${guests.join(" · ")}`);
  return parts.filter(Boolean).join(" · ");
}

export async function ingestOtaEmail(input: OtaInbound): Promise<OtaIngestResult> {
  await connectDB();
  const gmailId = String(input.gmailId ?? "").trim();
  if (!gmailId) throw new Error("Thiếu mã thư Gmail");

  // Đã nhận thư này rồi thì thôi — Gmail có thể gửi lại cùng một thư
  const seen = await OtaEmail.findOne({ gmailId }).lean<any>();
  if (seen) {
    return { gmailId, action: "duplicate", ref: seen.ref, message: "Thư này đã xử lý trước đó" };
  }

  const ota = (input.ota || "klook").toLowerCase();
  const receivedAt = input.receivedAt ? new Date(input.receivedAt) : new Date();
  const base = {
    ota,
    gmailId,
    subject: input.subject ?? "",
    body: (input.body ?? "").slice(0, 20_000),
    receivedAt,
  };

  /**
   * Nhãn OTA lẫn cả thư mã xác thực và thư quảng cáo. Mấy thư này KHÔNG phải đơn
   * hàng nên bỏ qua hẳn, đừng đẩy vào khay soát — khay đầy rác thì người ta thôi
   * đọc, rồi bỏ sót đúng cái thư cần soát.
   */
  const subject = (input.subject ?? "").toLowerCase();
  const looksLikeJunk =
    /verification code|\botp\b|newsletter|webinar|merchants support|password/.test(subject) ||
    !/(order confirmed|order cancel|booking amendment)/.test(subject);
  const parsed = ota === "klook" ? parseKlookEmail(input.subject ?? "", input.body ?? "") : null;

  if (!parsed) {
    await OtaEmail.create({
      ...base,
      kind: "unknown",
      status: looksLikeJunk ? "ignored" : "review",
      result: looksLikeJunk ? "Không phải thư đơn hàng — bỏ qua" : "Chưa bóc được dữ liệu — cần soát tay",
    });
    return {
      gmailId,
      action: looksLikeJunk ? "ignored" : "review",
      message: looksLikeJunk ? "Thư không phải đơn hàng, bỏ qua" : "Không bóc được thư, đã đưa vào khay cần soát",
    };
  }

  const spot = spotFromProduct(parsed.productTitle) ?? spotFromProduct(input.subject ?? "");
  const common = { ...base, kind: parsed.kind, ref: parsed.ref, spot: spot ?? undefined };

  if (!spot) {
    await OtaEmail.create({
      ...common,
      status: "review",
      result: `Không rõ điểm bay từ tên sản phẩm “${parsed.productTitle}” — chọn tay giúp`,
    });
    return { gmailId, action: "review", ref: parsed.ref, message: "Không rõ điểm bay, đã đưa vào khay cần soát" };
  }

  const existing = await BaobayBooking.findOne({ otaRef: parsed.ref }).lean<any>();

  /* ---------------- Thư HUỶ ---------------- */
  if (parsed.kind === "cancel") {
    if (!existing) {
      await OtaEmail.create({
        ...common,
        status: "review",
        result: `Thư huỷ nhưng chưa có booking ${parsed.ref} trong sổ — soát lại giúp`,
      });
      return { gmailId, action: "review", ref: parsed.ref, message: "Huỷ nhưng không tìm thấy booking" };
    }
    await BaobayBooking.updateOne(
      { _id: existing._id },
      {
        $set: {
          status: "cancelled",
          cancelledAt: new Date(),
          cancelledBy: `ota:${ota}`,
          // OTA hoàn tiền cho khách, quầy không xuất tiền — để 0, nhân sự tự sửa nếu đã thu tại bãi
          refundAmount: existing.refundAmount ?? 0,
          remaining: 0,
          note: [existing.note, `${ota.toUpperCase()} huỷ ${formatDateKeyVN(new Date().toISOString().slice(0, 10))}`]
            .filter(Boolean)
            .join(" · "),
        },
      },
    );
    await OtaEmail.create({
      ...common,
      status: "applied",
      result: `Đã chuyển booking ${parsed.ref} sang ĐÃ HUỶ`,
      bookingId: existing._id,
    });
    return { gmailId, action: "cancelled", ref: parsed.ref, message: "Đã huỷ booking theo thư OTA" };
  }

  /* ---------------- Thư ĐỔI LỊCH ---------------- */
  if (parsed.kind === "amend") {
    if (!existing) {
      await OtaEmail.create({
        ...common,
        status: "review",
        result: `Thư đổi lịch nhưng chưa có booking ${parsed.ref} — soát lại giúp`,
      });
      return { gmailId, action: "review", ref: parsed.ref, message: "Đổi lịch nhưng không tìm thấy booking" };
    }
    const set: Record<string, unknown> = {
      note: [existing.note, `${ota.toUpperCase()} xin đổi: ${parsed.previousDate ?? "?"} → ${parsed.flightDate}`, parsed.specialRequirements]
        .filter(Boolean)
        .join(" · "),
    };
    if (isDateKey(parsed.flightDate) && parsed.flightDate !== existing.flightDate) {
      set.flightDate = parsed.flightDate;
      set.rescheduledFrom = [...(existing.rescheduledFrom ?? []), existing.flightDate];
    }
    if (parsed.expectedTime) set.expectedTime = parsed.expectedTime;
    await BaobayBooking.updateOne({ _id: existing._id }, { $set: set });
    await OtaEmail.create({
      ...common,
      status: "applied",
      result: `Đã đổi lịch booking ${parsed.ref}${set.flightDate ? ` sang ${parsed.flightDate}` : " (giữ nguyên ngày)"}`,
      bookingId: existing._id,
    });
    return { gmailId, action: "amended", ref: parsed.ref, message: "Đã cập nhật theo thư đổi lịch" };
  }

  /* ---------------- Thư ĐẶT MỚI ---------------- */
  if (existing) {
    await OtaEmail.create({
      ...common,
      status: "applied",
      result: `Booking ${parsed.ref} đã có trong sổ — không tạo trùng`,
      bookingId: existing._id,
    });
    return { gmailId, action: "duplicate", ref: parsed.ref, message: "Booking đã có trong sổ" };
  }
  if (!isDateKey(parsed.flightDate)) {
    await OtaEmail.create({ ...common, status: "review", result: `Ngày bay không đọc được: “${parsed.flightDate}”` });
    return { gmailId, action: "review", ref: parsed.ref, message: "Không đọc được ngày bay" };
  }

  /**
   * Ngày bay ĐÃ QUA thì không đưa vào lịch. Hộp thư có sẵn hàng trăm thư cũ; lần
   * chạy đầu mà nhận hết là danh sách chờ bay đầy chuyến của mấy tháng trước.
   * Vẫn ghi vào sổ thư (trạng thái "bỏ qua") để biết máy đã đọc và cố tình bỏ.
   */
  if (parsed.flightDate < todayInVN()) {
    await OtaEmail.create({
      ...common,
      status: "ignored",
      result: `Ngày bay ${formatDateKeyVN(parsed.flightDate)} đã qua — không đưa vào lịch`,
    });
    return { gmailId, action: "ignored", ref: parsed.ref, message: "Ngày bay đã qua, bỏ qua" };
  }

  const { pickup, pickupNote } = pickupFromDeparture(parsed.departure);
  const created = await BaobayBooking.create({
    spot,
    flightDate: parsed.flightDate,
    createdByUsername: `ota:${ota}`,
    createdByName: `${ota.toUpperCase()} (thư tự động)`,
    source: ota === "klook" ? "Klook" : ota.toUpperCase(),
    contactName: parsed.leadName || parsed.guests[0]?.fullName || "khách OTA",
    phone: parsed.leadPhone,
    bookingCode: parsed.ref,
    otaRef: parsed.ref,
    otaName: ota,
    otaGuests: parsed.guests,
    guestCount: parsed.guestCount,
    flycam: 0,
    video360: 0,
    redFlag: 0,
    sunset: 0,
    flagFlight: 0,
    mountainCar: 0,
    flightKind: spot === "ha-noi" ? "m650" : "pg",
    pickup,
    pickupNote,
    expectedTime: parsed.expectedTime,
    /**
     * Tiền để 0: khách đã trả cho OTA, quầy không thu gì tại bãi. Kế toán đối
     * soát doanh thu với OTA theo kỳ, không đi qua sổ tiền của điểm bay.
     */
    unitPrice: 0,
    discount: 0,
    pickupFee: 0,
    totalAmount: 0,
    deposit: 0,
    remaining: 0,
    depositToCompany: false,
    transferCode: "",
    note: noteOf(parsed),
    status: "open",
    rescheduledFrom: [],
  });

  await OtaEmail.create({
    ...common,
    status: "applied",
    result: `Đã tạo booking ${parsed.ref} — ${parsed.guestCount} khách, bay ${formatDateKeyVN(parsed.flightDate)}`,
    bookingId: created._id,
  });
  return { gmailId, action: "created", ref: parsed.ref, message: "Đã đưa booking vào lịch" };
}

/** Thư OTA gần đây cho khay theo dõi trên trang điều phối / kế toán. */
export async function listOtaEmails(spot?: string, limit = 20) {
  await connectDB();
  const where = spot ? { $or: [{ spot }, { spot: { $in: [null, ""] } }] } : {};
  const docs = await OtaEmail.find(where).sort({ createdAt: -1 }).limit(limit).lean<any[]>();
  return docs.map((d) => ({
    id: String(d._id),
    ota: d.ota,
    kind: d.kind,
    ref: d.ref || "",
    subject: d.subject || "",
    status: d.status,
    result: d.result || "",
    receivedAt: d.receivedAt ? new Date(d.receivedAt).toISOString() : "",
  }));
}

/** Người soát bấm "đã xử lý" cho thư cần soát — bỏ khỏi khay. */
export async function resolveOtaEmail(id: string): Promise<void> {
  await connectDB();
  await OtaEmail.updateOne({ _id: id }, { $set: { status: "ignored" } });
}
