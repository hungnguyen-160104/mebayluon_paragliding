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

import { formatDateKeyVN, isDateKey, shiftDateKey, todayInVN } from "@/lib/baobay/date";
import {
  parseKlookEmail,
  pickupFromDeparture,
  spotFromEmailText,
  spotFromProduct,
  type KlookBooking,
} from "@/lib/baobay/ota-klook";
import { OTA_CONFIG, isOtaKey, otaFromSender, readOtaMail, type OtaMailRead } from "@/lib/baobay/ota-parsers";
import { htmlToText, parseGenericOtaEmail } from "@/lib/baobay/ota-generic";
import { isSpotId } from "@/lib/baobay/spots";
import { connectDB } from "@/lib/mongodb";
import { freeDaySeq, nextDaySeq } from "@/services/baobay.service";
import { BaobayBooking } from "@/models/BaobayBooking.model";
import { OtaEmail } from "@/models/OtaEmail.model";

export type OtaInbound = {
  ota: string;
  gmailId: string;
  subject: string;
  body: string;
  /** Địa chỉ người gửi — dùng để đoán OTA khi script không gửi kèm tên nguồn. */
  from?: string;
  receivedAt?: string;
  /**
   * ĐIỂM BAY CỦA CẢ HỘP THƯ.
   *
   * Hộp sapa.paragliding@gmail.com chỉ nhận booking điểm Sa Pa, mà tên sản phẩm
   * của OTA thì thường không có chữ "Sapa" (vd "Standard Paragliding Tour") nên
   * đoán theo tên sản phẩm là rơi vào khay "không rõ điểm bay" — người trực lại
   * phải chọn tay từng thư. Script của hộp nào khai điểm bay của hộp đó là xong.
   *
   * Bỏ trống = đoán theo tên sản phẩm như cũ (hộp mebayluon nhận cả ba điểm).
   */
  spot?: string;
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

  /**
   * Tên OTA: tin ĐỊA CHỈ NGƯỜI GỬI trước, rồi mới đến tên script gửi kèm.
   * Mọi thư đều đổ về một hộp (mebayluon@gmail.com) nên tên miền gửi là dấu
   * hiệu bền nhất — nhãn Gmail có thể gắn nhầm, script có thể khai thiếu nguồn.
   */
  const from = String(input.from ?? "").trim();
  const claimed = (input.ota || "").toLowerCase();
  const ota = otaFromSender(from) ?? (claimed || "klook");
  /**
   * ĐIỂM BAY CỦA CẢ HỘP THƯ — script của hộp sapa.paragliding@gmail.com khai
   * "sapa". Tin nó trước mọi phép đoán, và dùng cho CẢ BA nhánh: bóc được bằng
   * bộ đọc riêng, đưa vào khay chờ duyệt, và cả nhánh không bóc được. Thiếu ở
   * nhánh nào là thư của hộp Sa Pa lại rơi về "chưa rõ điểm bay" ở nhánh đó.
   */
  const mailboxSpot = isSpotId(String(input.spot ?? "")) ? String(input.spot) : "";
  /**
   * ĐOÁN ĐIỂM BAY khi hộp thư không khai sẵn (hộp mebayluon nhận cả ba điểm).
   *
   * Thứ tự tin cậy: tên sản phẩm → tiêu đề → toàn bộ thân thư. Thân thư xếp cuối
   * vì dễ nhắc nhiều điểm cùng lúc, nhưng KHÔNG THỂ bỏ: điểm Sa Pa bán qua hộp
   * mebayluon thường chỉ lộ ra trong thân thư ("Sapa Paragliding", "dù lượn Sa
   * Pa", chỗ đón ở Lào Cai) còn tên sản phẩm chỉ ghi chung "Paragliding Tour".
   */
  const guessSpot = (productTitle?: string) =>
    mailboxSpot ||
    (productTitle ? spotFromProduct(productTitle) : null) ||
    spotFromProduct(input.subject ?? "") ||
    spotFromEmailText(`${input.subject ?? ""}\n${input.body ?? ""}`);
  const receivedAt = input.receivedAt ? new Date(input.receivedAt) : new Date();
  const base = {
    ota,
    gmailId,
    /** Hộp thư nào gửi về — khay Khau Phạ / Hà Nội không lấy thư của hộp Sa Pa. */
    mailboxSpot: mailboxSpot || "",
    subject: input.subject ?? "",
    body: (input.body ?? "").slice(0, 20_000),
    from,
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

  /**
   * OTA chưa có bộ đọc riêng (GYG, KKday, Seek Sophie, Viator, Trip.com…): đọc
   * theo bảng cấu hình rồi ĐỂ NGƯỜI DUYỆT quyết định — chưa có mẫu thư thật của
   * họ nên chưa dám tự dựng booking. Nguồn LẠ hoàn toàn (OTA mới ký, sender chưa
   * khai trong bảng) cũng đi lối này bằng bộ đọc chung: thư booking thật mà bị
   * bỏ im như rác là mất khách không ai hay.
   */
  if (!parsed && ota !== "klook") {
    const read: OtaMailRead = isOtaKey(ota)
      ? readOtaMail(ota, input.subject ?? "", input.body ?? "")
      : { ota: "gyg", ...parseGenericOtaEmail(input.subject ?? "", input.body ?? "") };
    const label = isOtaKey(ota) ? OTA_CONFIG[ota].label : ota.toUpperCase();

    /**
     * Thư OTP/quảng cáo lọt qua Apps Script: bỏ hẳn, đừng bắt người soát đọc rác.
     * OTA gửi quảng cáo cho ĐỐI TÁC bằng tên miền riêng (b2.viator.com,
     * edm.kkday.com…) — đơn hàng thật không bao giờ đi từ mấy tên miền đó, nên
     * chặn theo người gửi là an toàn.
     */
    const adsSender = /(b2\.viator\.com|edm\.kkday|newsletter@|marketing@|promo@)/i.test(from);
    if (adsSender || /verification code|\botp\b|newsletter|webinar|survey|password/.test(subject)) {
      await OtaEmail.create({ ...base, kind: "unknown", status: "ignored", result: "Thư quảng cáo / không phải đơn hàng — bỏ qua" });
      return { gmailId, action: "ignored", message: "Thư không phải đơn hàng, bỏ qua" };
    }

    if (read.kind === "pending") {
      await OtaEmail.create({
        ...base,
        kind: "pending",
        ref: read.ref,
        status: "ignored",
        result: `${label}: mới hỏi giữ chỗ / chờ duyệt — chưa thành đơn, không đưa vào lịch`,
      });
      return { gmailId, action: "ignored", ref: read.ref, message: "Chưa thành đơn, không đưa vào lịch" };
    }

    /**
     * Đơn ĐẶT MỚI mà ngày bay đã qua: thư cũ trong hộp, chuyến bay xong lâu rồi.
     * Bỏ qua thay vì treo cờ đỏ — 60 ngày thư cũ mà dồn hết vào cờ đỏ thì người
     * duyệt bỏ luôn thói quen đọc cờ. Huỷ/đổi lịch thì vẫn đưa vào duyệt.
     */
    if (read.kind === "new" && isDateKey(read.flightDate) && read.flightDate < todayInVN()) {
      await OtaEmail.create({
        ...base,
        kind: "new",
        ref: read.ref,
        status: "ignored",
        result: `${label}: ngày bay ${formatDateKeyVN(read.flightDate)} đã qua — không đưa vào lịch`,
      });
      return { gmailId, action: "ignored", ref: read.ref, message: "Ngày bay đã qua, bỏ qua" };
    }

    const known = read.ref ? await BaobayBooking.findOne({ otaRef: read.ref }).lean<any>() : null;
    const spotGuess = guessSpot();

    /**
     * Ngày bay xa hơn ~13 tháng gần như chắc là bắt nhầm số trong thư (mã đơn,
     * chân thư "© 2027"…) — thà bắt người duyệt chọn tay còn hơn ghi bừa.
     */
    if (isDateKey(read.flightDate) && read.flightDate > shiftDateKey(todayInVN(), 400)) read.flightDate = "";
    const mo = read.flightDate && isDateKey(read.flightDate) ? formatDateKeyVN(read.flightDate) : "?";
    const canNang = read.weights.length ? ` · cân nặng ${read.weights.join("/")}kg` : "";

    const result =
      read.kind === "cancel"
        ? `${label}: khách xin HUỶ ${read.ref || "(chưa rõ mã)"} — bấm duyệt để huỷ trong lịch`
        : read.kind === "amend"
          ? `${label}: khách xin ĐỔI LỊCH ${read.ref || ""} → ${mo} — bấm duyệt để đổi`
          : `${label}: đơn mới ${read.ref || ""} · ${mo} · ${read.guestCount} khách${read.contactName ? ` · ${read.contactName}` : ""}${canNang} — soát rồi bấm tạo`;

    await OtaEmail.create({
      ...base,
      kind: read.kind,
      ref: read.ref,
      spot: spotGuess ?? undefined,
      status: "review",
      result,
      bookingId: known?._id,
      draft: {
        intent: read.kind === "cancel" ? "cancel" : read.kind === "amend" ? "amend" : "create",
        ota,
        ref: read.ref,
        flightDate: read.flightDate,
        expectedTime: read.expectedTime,
        guestCount: read.guestCount,
        contactName: read.contactName,
        phone: read.phone,
        email: read.email,
        weights: read.weights,
        hotel: read.hotel,
        highlights: read.highlights,
      },
    });
    return { gmailId, action: "review", ref: read.ref, message: `${label}: đã đưa vào khay chờ duyệt` };
  }

  if (!parsed) {
    await OtaEmail.create({
      ...base,
      kind: "unknown",
      spot: guessSpot() || undefined,
      status: looksLikeJunk ? "ignored" : "review",
      result: looksLikeJunk ? "Không phải thư đơn hàng — bỏ qua" : "Chưa bóc được dữ liệu — cần soát tay",
    });
    return {
      gmailId,
      action: looksLikeJunk ? "ignored" : "review",
      message: looksLikeJunk ? "Thư không phải đơn hàng, bỏ qua" : "Không bóc được thư, đã đưa vào khay cần soát",
    };
  }

  const spot = guessSpot(parsed.productTitle);
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
    /**
     * KHÔNG tự huỷ. Điều phối thường đã gọi khách trước khi OTA gửi thư, nên máy
     * tự đổi lịch là dẫm lên việc người ta vừa xử lý. Thư nằm chờ DUYỆT TAY,
     * hiện cờ đỏ đầu trang điều phối và kế toán.
     */
    await OtaEmail.create({
      ...common,
      status: "review",
      result: `Khách xin HUỶ booking ${parsed.ref} (bay ${formatDateKeyVN(existing.flightDate)}) — bấm duyệt để huỷ trong lịch`,
      bookingId: existing._id,
      draft: { intent: "cancel", ref: parsed.ref },
    });
    return { gmailId, action: "review", ref: parsed.ref, message: "Thư huỷ — chờ người duyệt" };
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
    /** Cũng chờ DUYỆT TAY — xem quyết định ở nhánh huỷ phía trên. */
    await OtaEmail.create({
      ...common,
      status: "review",
      result:
        `Khách xin ĐỔI LỊCH booking ${parsed.ref}: ${parsed.previousDate ?? formatDateKeyVN(existing.flightDate)} → ` +
        `${parsed.flightDate}${parsed.expectedTime ? ` ${parsed.expectedTime}` : ""} — bấm duyệt để đổi trong lịch`,
      bookingId: existing._id,
      draft: {
        intent: "amend",
        ref: parsed.ref,
        flightDate: parsed.flightDate,
        expectedTime: parsed.expectedTime,
        note: parsed.specialRequirements,
      },
    });
    return { gmailId, action: "review", ref: parsed.ref, message: "Thư đổi lịch — chờ người duyệt" };
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
    daySeq: await nextDaySeq(spot, parsed.flightDate),
    createdByUsername: `ota:${ota}`,
    createdByName: `${ota.toUpperCase()} (thư tự động)`,
    source: ota === "klook" ? "Klook" : ota.toUpperCase(),
    contactName: parsed.leadName || parsed.guests[0]?.fullName || "khách OTA",
    phone: parsed.leadPhone,
    // Email khách Klook gửi kèm — app dùng để gửi thư báo khi booking thay đổi
    email: String(parsed.leadEmail ?? "").trim().toLowerCase(),
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

/**
 * NGƯỜI DUYỆT bấm nút: giờ mới đụng vào lịch bay.
 *
 * Máy chỉ đọc thư và đề xuất; huỷ hay đổi lịch đều phải có người xác nhận, vì
 * điều phối thường đã gọi khách xong trước khi thư OTA tới — máy tự đổi là dẫm
 * lên việc người ta vừa xử lý.
 */
export async function approveOtaEmail(
  id: string,
  by: string,
  override?: { spot?: string; flightDate?: string; guestCount?: number; contactName?: string },
): Promise<{ ok: boolean; message: string }> {
  await connectDB();
  const mail = await OtaEmail.findById(id).lean<any>();
  if (!mail) return { ok: false, message: "Không tìm thấy thư" };
  if (mail.status === "applied") return { ok: false, message: "Thư này đã xử lý rồi" };

  const draft = (mail.draft ?? {}) as Record<string, any>;
  const intent = String(draft.intent ?? (mail.kind === "cancel" ? "cancel" : mail.kind === "amend" ? "amend" : "create"));
  const ref = String(draft.ref ?? mail.ref ?? "");
  const booking = mail.bookingId
    ? await BaobayBooking.findById(mail.bookingId).lean<any>()
    : ref
      ? await BaobayBooking.findOne({ otaRef: ref }).lean<any>()
      : null;

  if (intent === "cancel") {
    if (!booking) return { ok: false, message: "Không tìm thấy booking để huỷ" };
    await BaobayBooking.updateOne(
      { _id: booking._id },
      {
        $set: {
          status: "cancelled",
          cancelledAt: new Date(),
          cancelledBy: by,
          remaining: 0,
          note: [booking.note, `${String(mail.ota).toUpperCase()} huỷ — ${by} duyệt`].filter(Boolean).join(" · "),
        },
      },
    );
    await OtaEmail.updateOne({ _id: id }, { $set: { status: "applied", result: `Đã huỷ booking ${ref} (${by} duyệt)` } });
    return { ok: true, message: "Đã huỷ booking trong lịch" };
  }

  if (intent === "amend") {
    if (!booking) return { ok: false, message: "Không tìm thấy booking để đổi lịch" };
    const newDate = String(override?.flightDate || draft.flightDate || "");
    const set: Record<string, unknown> = {
      note: [booking.note, `${String(mail.ota).toUpperCase()} đổi lịch — ${by} duyệt`, draft.note]
        .filter(Boolean)
        .join(" · "),
    };
    if (isDateKey(newDate) && newDate !== booking.flightDate) {
      set.flightDate = newDate;
      set.daySeq = await nextDaySeq(booking.spot, newDate);
      set.rescheduledFrom = [...(booking.rescheduledFrom ?? []), booking.flightDate];
      // Số cũ trả về kho ngày cũ — sổ ngày ấy không bị nhảy số
      await freeDaySeq(booking.spot, booking.flightDate, booking.daySeq);
    }
    if (draft.expectedTime) set.expectedTime = draft.expectedTime;
    await BaobayBooking.updateOne({ _id: booking._id }, { $set: set });
    await OtaEmail.updateOne(
      { _id: id },
      { $set: { status: "applied", result: `Đã đổi lịch ${ref} sang ${newDate || booking.flightDate} (${by} duyệt)` } },
    );
    return { ok: true, message: "Đã đổi lịch booking" };
  }

  /* ---- Tạo booking mới từ thư mà máy chưa dám tự dựng ---- */
  if (booking) {
    await OtaEmail.updateOne({ _id: id }, { $set: { status: "applied", result: `Booking ${ref} đã có sẵn` } });
    return { ok: true, message: "Booking đã có trong sổ" };
  }
  const spot = String(mail.spot || override?.spot || "");
  const flightDate = String(override?.flightDate || draft.flightDate || "");
  if (!spot) return { ok: false, message: "Chọn điểm bay giúp — thư không ghi rõ" };
  if (!isDateKey(flightDate)) return { ok: false, message: "Chọn ngày bay giúp — thư không ghi rõ" };

  const otaName = String(draft.ota ?? mail.ota ?? "ota");
  const created = await BaobayBooking.create({
    spot,
    flightDate,
    daySeq: await nextDaySeq(spot, flightDate),
    createdByUsername: `ota:${otaName}`,
    createdByName: `${otaName.toUpperCase()} (thư, ${by} duyệt)`,
    source: otaName.toUpperCase(),
    contactName: String(override?.contactName || draft.contactName || "khách OTA"),
    phone: String(draft.phone ?? ""),
    bookingCode: ref,
    otaRef: ref || undefined,
    otaName,
    guestCount: Math.max(1, Number(override?.guestCount ?? draft.guestCount ?? 1)),
    flycam: 0,
    video360: 0,
    redFlag: 0,
    sunset: 0,
    flagFlight: 0,
    mountainCar: 0,
    flightKind: spot === "ha-noi" ? "m650" : "pg",
    pickup: "self",
    pickupNote: "",
    expectedTime: String(draft.expectedTime ?? ""),
    unitPrice: 0,
    discount: 0,
    pickupFee: 0,
    totalAmount: 0,
    deposit: 0,
    remaining: 0,
    depositToCompany: false,
    transferCode: "",
    /**
     * Email khách từ thư OTA thành TRƯỜNG RIÊNG — chỗ app gửi thư báo khi
     * booking thay đổi. Vẫn chép cả vào ghi chú như trước cho người đọc,
     * nhưng nằm trong note thì máy không dùng được (đúng bài học của phần
     * đồng bộ web, xem services/baobay-web-sync.service.ts).
     */
    email: String(draft.email ?? "").trim().toLowerCase(),
    note: [
      Array.isArray(draft.weights) && draft.weights.length ? `cân nặng ${draft.weights.join("/")}kg` : "",
      draft.hotel ? `đón: ${draft.hotel}` : "",
      draft.email,
      ...(Array.isArray(draft.highlights) ? draft.highlights.slice(0, 4) : []),
    ]
      .filter(Boolean)
      .join(" · "),
    status: "open",
    rescheduledFrom: [],
  });
  await OtaEmail.updateOne(
    { _id: id },
    { $set: { status: "applied", spot, result: `Đã tạo booking ${ref} (${by} duyệt)`, bookingId: created._id } },
  );
  return { ok: true, message: "Đã đưa booking vào lịch" };
}

/**
 * Thư OTA gần đây cho khay theo dõi trên trang điều phối / kế toán.
 *
 * HAI ĐƯỜNG THƯ, chia theo điểm bay:
 *  - Khau Phạ và Hà Nội: chỉ thư của hộp **mebayluon@gmail.com**. Trong đó vẫn
 *    thấy CẢ thư máy chưa đoán được điểm và thư của điểm bạn — cố tình như vậy,
 *    vì thư huỷ của Khau Phạ mà biến mất chỉ vì người trực đang mở tab Hà Nội
 *    thì coi như mất thư. Thư của điểm nào thì đề tên điểm đó trên dòng.
 *  - Sa Pa: thư của hộp **sapa.paragliding@gmail.com** (hộp riêng, script khai
 *    sẵn `MAILBOX_SPOT = 'sapa'`) CỘNG thư hộp mebayluon mà nội dung nói tới Sa
 *    Pa ("Sapa Paragliding", "dù lượn Sa Pa", Lào Cai…). Khay Sa Pa KHÔNG lấy
 *    thư chưa rõ điểm: đó là thư của hộp chung, để hai điểm kia soát.
 */
export async function listOtaEmails(spot?: string, limit = 60) {
  await connectDB();
  /**
   * Thư rác (OTP, quảng cáo…) vẫn được LƯU để lần vết, nhưng không chiếm chỗ
   * trong khay: cả hai lời phân loại của máy đều chứa cụm "không phải thư đơn
   * hàng" nên lọc theo đó.
   */
  const where: Record<string, unknown> = { result: { $not: /không phải thư đơn hàng/i } };
  if (spot === "sapa") {
    where.spot = "sapa";
  } else if (spot) {
    // Thư hộp Sa Pa (và thư đã gắn điểm Sa Pa) không lọt sang khay hai điểm kia
    where.spot = { $ne: "sapa" };
    where.mailboxSpot = { $ne: "sapa" };
  }
  const docs = await OtaEmail.find(where).sort({ createdAt: -1 }).limit(limit).lean<any[]>();
  return docs.map((d) => {
    const draft = (d.draft ?? {}) as Record<string, any>;

    /**
     * NGUYÊN VĂN thư (rút gọn) để người duyệt đọc ngay trên app — bắt họ mở
     * Gmail đối chiếu từng thư thì chẳng ai duyệt nữa. Thư chỉ có HTML thì vứt
     * thẻ lấy chữ; cắt 2.500 ký tự đầu là đủ phần thân đơn hàng.
     */
    let bodyText = String(d.body ?? "");
    if (/<(html|body|table|div|p|br)[\s>]/i.test(bodyText)) bodyText = htmlToText(bodyText);
    const bodyExcerpt = bodyText.replace(/\n{3,}/g, "\n\n").trim().slice(0, 2500);

    return {
      id: String(d._id),
      ota: d.ota,
      kind: d.kind,
      ref: d.ref || "",
      subject: d.subject || "",
      from: d.from || "",
      status: d.status,
      result: d.result || "",
      receivedAt: d.receivedAt ? new Date(d.receivedAt).toISOString() : "",
      /** Lúc APP nhận thư (khác receivedAt là lúc thư tới Gmail) — để biết đường thư còn sống. */
      fetchedAt: d.createdAt ? new Date(d.createdAt).toISOString() : "",
      /** Việc sẽ làm khi bấm duyệt: "cancel" · "amend" · "create". */
      intent: String(draft.intent ?? ""),
      spot: d.spot || "",
      draftDate: String(draft.flightDate ?? ""),
      draftTime: String(draft.expectedTime ?? ""),
      draftGuests: Number(draft.guestCount ?? 0) || 0,
      draftName: String(draft.contactName ?? ""),
      draftPhone: String(draft.phone ?? ""),
      draftWeights: Array.isArray(draft.weights) ? (draft.weights as number[]) : [],
      draftHotel: String(draft.hotel ?? ""),
      bodyExcerpt,
    };
  });
}

/** Người soát bấm "đã xử lý" cho thư cần soát — bỏ khỏi khay. */
export async function resolveOtaEmail(id: string): Promise<void> {
  await connectDB();
  await OtaEmail.updateOne({ _id: id }, { $set: { status: "ignored" } });
}
