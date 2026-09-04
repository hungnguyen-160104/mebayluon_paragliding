// services/baobay-web-sync.service.ts

/**
 * Đưa booking khách tự đặt trên mebayluon.com/booking vào sổ booking nội bộ
 * (/baocao) để hiện luôn trong danh sách chờ bay.
 *
 * Vì sao cần: điều phối đang phải mở email/trang quản trị đọc rồi gõ lại tay,
 * mà gõ lại là sinh sai. Đồng bộ theo `webBookingId` nên bấm bao nhiêu lần cũng
 * không nhân đôi bản ghi.
 *
 * Ranh giới rõ ràng giữa hai phía:
 *  - Trang khách là chủ của: ngày bay, giờ, số khách, dịch vụ đã chọn, số tiền
 *    đã báo giá. Khách sửa bên đó thì lần đồng bộ sau cập nhật theo.
 *  - Nhân sự là chủ của: tiền cọc, người thu, người được giao, trạng thái bay
 *    (đã bay / huỷ). Đồng bộ KHÔNG bao giờ ghi đè mấy thứ này.
 */

import mongoose from "mongoose";

import { todayInVN } from "@/lib/baobay/date";
import { normalizeSpot } from "@/lib/baobay/spots";
import { pushQueueNoToWeb } from "@/lib/baobay/web-queue";
import { isTestBooking } from "@/lib/baobay/test-booking";
import { connectDB } from "@/lib/mongodb";
import { nextDaySeq } from "@/services/baobay.service";
import { BaobayBooking } from "@/models/BaobayBooking.model";
import { BaobaySetting } from "@/models/BaobaySetting.model";
import { Booking } from "@/models/Booking.model";
import { LOCATIONS, type LocationKey } from "@/lib/booking/calculate-price";

/** Điểm bay của trang khách ↔ điểm bay trong app. Điểm nào không có ở đây (Đà Nẵng, Quản Bạ…) thì bỏ qua. */
const WEB_LOCATION_BY_SPOT: Record<string, string> = {
  "khau-pha": "khau_pha",
  "ha-noi": "ha_noi",
  sapa: "sapa",
};

export const WEB_SYNC_SPOTS = Object.keys(WEB_LOCATION_BY_SPOT);

type WebServiceField = "flycam" | "video360" | "sunset" | "flagFlight" | "redFlag";

/**
 * Dịch vụ bên trang khách ↔ ô dịch vụ trong app. Xét THEO THỨ TỰ, khớp đầu tiên
 * thắng: "keo_co" (bay kéo cờ 100k) phải đứng trước "flag" chung, vì
 * `khau_pha_flag` trên web là "Bay DÙ CỜ ĐỎ sao vàng" (400k) = ô `redFlag`,
 * không phải bay kéo cờ — trước 05/09 gán nhầm sang flagFlight, sổ ghi kéo cờ
 * 100k cho khách mua dù cờ đỏ 400k.
 */
const SERVICE_MAP: Array<{ match: RegExp; field: WebServiceField }> = [
  { match: /flycam/i, field: "flycam" },
  { match: /camera360|cam360/i, field: "video360" },
  { match: /sunset|hoang_hon/i, field: "sunset" },
  { match: /keo_co|flag_flight|flagflight/i, field: "flagFlight" },
  { match: /flag|co_do|red_flag/i, field: "redFlag" },
];

/** Khoá dịch vụ mang nghĩa ĐƯA ĐÓN — quyết định ô "đưa đón" chứ không phải dịch vụ bay. */
const PICKUP_KEYS = /pickup|shuttle|garrya/i;

type WebDoc = {
  _id: mongoose.Types.ObjectId;
  location?: string;
  dateISO?: string;
  timeSlot?: string;
  guestsCount?: number;
  packageKey?: string;
  packageLabel?: string;
  flightTypeKey?: string;
  status?: string;
  contact?: { phone?: string; email?: string; pickupLocation?: string; specialRequest?: string };
  guests?: Array<{ fullName?: string; weightKg?: number }>;
  addonsQty?: Record<string, number>;
  services?: Record<string, { selected?: boolean; qty?: number; inputText?: string }>;
  selectedServices?: Array<{ key?: string; label?: string; inputText?: string }>;
  price?: {
    currency?: string;
    basePerPerson?: number;
    perPerson?: number;
    discountPerPerson?: number;
    addonsTotal?: Record<string, number>;
    total?: number;
  };
  createdAt?: Date;
};

/**
 * Tỉ giá dùng khi khách đặt bằng USD trên trang khách. App CHỈ dùng VND, nên
 * quy đổi ngay lúc đồng bộ — cùng tỉ giá trang khách dùng để báo giá USD, để hai
 * bên không lệch nhau. Đổi tỉ giá thì sửa một chỗ này.
 */
const USD_TO_VND = 25_000;

/** Đưa mọi số tiền của trang khách về VND. */
function toVND(amount: number | undefined, currency?: string): number {
  const n = Math.max(0, Math.round(amount || 0));
  if (!n) return 0;
  return (currency ?? "VND") === "VND" ? n : Math.round(n * USD_TO_VND);
}

/**
 * Khách có THẬT SỰ CHỌN dịch vụ này không.
 *
 * Trang khách lưu MỌI dịch vụ của điểm bay kèm `qty` mặc định 1, kể cả những
 * thứ khách không tích (`selected: false, qty: 1`). Nhìn qty mà đếm là sinh ra
 * "flycam ma": WebMBLE4B182 (05/09) khách chỉ lấy cam360 + xe trung chuyển mà sổ
 * ghi thêm 1 flycam, tổng nội bộ vênh 380k so với giá web đã hứa. Cờ `selected`
 * là lời khách; chỉ bản ghi cũ không có cờ mới được nhìn qty.
 */
function chosen(v?: { selected?: boolean; qty?: number }): boolean {
  if (!v) return false;
  if (typeof v.selected === "boolean") return v.selected;
  return (v.qty ?? 0) > 0;
}

/** Cấu hình dịch vụ trên trang khách (giá, kiểu đếm) theo điểm bay + khoá. */
function webServiceConfig(spot: string, key: string) {
  const loc = LOCATIONS[WEB_LOCATION_BY_SPOT[spot] as LocationKey];
  return loc?.services?.find((s) => s.key === key);
}

/** Số lượng một dịch vụ khách đã chọn (gộp cả hai kiểu dữ liệu của trang khách). */
function serviceQty(doc: WebDoc, field: WebServiceField, guests: number): number {
  let qty = 0;
  for (const [key, value] of Object.entries(doc.services ?? {})) {
    if (PICKUP_KEYS.test(key)) continue;
    const hit = SERVICE_MAP.find((m) => m.match.test(key));
    if (hit?.field !== field || !chosen(value)) continue;
    qty += value.qty && value.qty > 0 ? value.qty : guests;
  }
  // Bản đặt cũ dùng addonsQty (chỉ có flycam + camera360)
  const legacy = doc.addonsQty ?? {};
  if (field === "flycam") qty += legacy.flycam || 0;
  if (field === "video360") qty += legacy.camera360 || 0;
  return Math.min(qty, Math.max(guests, 0) || qty);
}

/**
 * Số suất "xe chuyên dụng lên núi" — CHỈ HÀ NỘI (150k/khách, cộng vào tổng nội
 * bộ). Ở Khau Phạ / Sa Pa, "shuttle" là XE TRUNG CHUYỂN (Tú Lệ 70k…) — đó là
 * đưa đón, đi vào `pickupFee` với đúng giá web (xem shuttleFee), không phải xe
 * lên núi: gán nhầm là tổng nội bộ đội thêm 150k/khách so với giá khách đã thấy.
 */
function mountainCarQty(doc: WebDoc, guests: number, spot: string): number {
  if (spot !== "ha-noi") return 0;
  for (const [key, value] of Object.entries(doc.services ?? {})) {
    if (!/shuttle|mountain/i.test(key)) continue;
    if (!chosen(value)) continue;
    return value?.qty && value.qty > 0 ? Math.min(value.qty, guests) : guests;
  }
  return 0;
}

/**
 * Phí ĐƯA ĐÓN khách đã trả trên web cho các dịch vụ kiểu pickup/shuttle/garrya,
 * tính y hệt phiếu của trang khách (components/booking/BookingTicket.tsx):
 * dịch vụ đếm (counter) = giá × qty; dịch vụ tích = giá × số khách; xe Garrya =
 * 500k × số xe (4 khách/xe) × số chiều; xe riêng Hà Nội = 1.4tr + 350k/khách từ
 * khách thứ 4. Bản đặt cũ để giá trong addonsTotal.pickup — cộng cả hai không
 * trùng vì hai kiểu dữ liệu không xuất hiện cùng lúc.
 */
function shuttleFee(doc: WebDoc, guests: number, spot: string): number {
  let fee = 0;
  for (const [key, value] of Object.entries(doc.services ?? {})) {
    if (!PICKUP_KEYS.test(key) || !chosen(value)) continue;
    const qty = Math.max(1, value?.qty || 1);
    if (key === "khau_pha_garrya_pickup") {
      fee += Math.ceil(guests / 4) * qty * 500_000;
      continue;
    }
    if (key === "ha_noi_private_hotel_pickup") {
      fee += 1_400_000 + Math.max(0, guests - 3) * 350_000;
      continue;
    }
    const cfg = webServiceConfig(spot, key);
    const unit = Number(cfg?.priceVND || 0);
    fee += cfg?.controlType === "counter" ? unit * qty : unit * guests;
  }
  return fee;
}

/** Loại hình bay: Hà Nội theo gói 650m/850m, nơi khác theo có động cơ hay không. */
function flightKindOf(doc: WebDoc, spot: string): "pg" | "ppg" | "m650" | "m850" {
  if (spot === "ha-noi") return doc.packageKey === "ha_noi_850m" ? "m850" : "m650";
  const ppgByService = Object.entries(doc.services ?? {}).some(([k, v]) => /paramotor|ppg/i.test(k) && chosen(v));
  return doc.flightTypeKey === "paramotor" || ppgByService ? "ppg" : "pg";
}

/** Ô "đưa đón" + ghi chú chỗ đón, suy từ dịch vụ khách chọn. */
function pickupOf(doc: WebDoc): { pickup: "self" | "bigc" | "hotel" | "other"; pickupNote: string } {
  const picked: string[] = [];
  for (const [key, value] of Object.entries(doc.services ?? {})) {
    if (!PICKUP_KEYS.test(key) || !chosen(value)) continue;
    picked.push(key);
  }
  const labelOf = (key: string) =>
    (doc.selectedServices ?? []).find((s) => s.key === key)?.label ||
    (doc.selectedServices ?? []).find((s) => s.key === key)?.inputText ||
    key;

  const written = (doc.contact?.pickupLocation || "").trim();
  if (picked.some((k) => /fixed_pickup/i.test(k))) return { pickup: "bigc", pickupNote: "" };
  if (picked.some((k) => /hotel/i.test(k))) {
    return { pickup: "hotel", pickupNote: written };
  }
  if (picked.length || written) {
    return { pickup: "other", pickupNote: written || picked.map(labelOf).join(" · ") };
  }
  return { pickup: "self", pickupNote: "" };
}

/** Ghi chú gộp: yêu cầu riêng, xe lên núi, cân nặng khách — thứ nhân sự cần biết trước. */
function noteOf(doc: WebDoc): string {
  const parts: string[] = [];
  const special = (doc.contact?.specialRequest || "").trim();
  if (special) parts.push(special);

  const weights = (doc.guests ?? []).map((g) => g.weightKg).filter((w): w is number => typeof w === "number" && w > 0);
  if (weights.length) parts.push(`cân nặng ${weights.join("/")}kg`);

  if (doc.contact?.email) parts.push(doc.contact.email);
  if (doc.price?.currency && doc.price.currency !== "VND") {
    parts.push(`khách đặt bằng ${doc.price.currency} ${doc.price.total ?? 0} — đã quy về VND`);
  }
  return parts.join(" · ");
}

/** Dựng bộ trường của một booking web để ghi vào sổ nội bộ. */
export function mapWebBooking(doc: WebDoc, spot: string) {
  const guests = Math.max(1, doc.guestsCount || (doc.guests ?? []).length || 1);
  const currency = doc.price?.currency ?? "VND";
  const total = toVND(doc.price?.total, currency);
  const { pickup, pickupNote } = pickupOf(doc);
  const shortId = String(doc._id).slice(-6).toUpperCase();

  return {
    spot,
    flightDate: doc.dateISO || todayInVN(),
    source: "Website",
    contactName: (doc.guests ?? [])[0]?.fullName?.trim() || "khách web",
    phone: (doc.contact?.phone || "").replace(/\s+/g, ""),
    /**
     * MÃ BOOKING NÓI RÕ TỪ WEB NÀO.
     *
     * Điểm SA PA được bán trên CẢ HAI web: mebayluon.com và paraglidingsapa.com.
     * Chung một tiền tố "WEB" thì mở sổ ra không biết đơn của web nào, mà hai web
     * là hai đường khách và hai bộ đối soát khác nhau. Nên:
     *    WebMBL…   đơn từ mebayluon.com   (chính chỗ này)
     *    WebSapa…  đơn từ paraglidingsapa.com (xem ingestSapaWebBooking)
     */
    bookingCode: `WebMBL${shortId}`,
    guestCount: guests,
    flycam: serviceQty(doc, "flycam", guests),
    video360: serviceQty(doc, "video360", guests),
    redFlag: serviceQty(doc, "redFlag", guests),
    sunset: serviceQty(doc, "sunset", guests),
    flagFlight: serviceQty(doc, "flagFlight", guests),
    flightKind: flightKindOf(doc, spot),
    pickup,
    pickupNote,
    expectedTime: (doc.timeSlot || "").trim(),
    pickupFee: toVND(doc.price?.addonsTotal?.pickup, currency) + shuttleFee(doc, guests, spot),
    mountainCar: mountainCarQty(doc, guests, spot),
    unitPrice: toVND(doc.price?.basePerPerson, currency),
    discount: toVND((doc.price?.discountPerPerson || 0) * guests, currency),
    /**
     * Tổng tiền lấy ĐÚNG số trang khách đã báo giá, không tính lại: khách nhìn
     * thấy con số nào thì quầy phải thu đúng con số ấy.
     */
    totalAmount: total,
    note: noteOf(doc),
    /**
     * EMAIL KHÁCH thành một TRƯỜNG RIÊNG, không chỉ nằm lẫn trong ghi chú.
     *
     * Đặt qua web thì luôn có email — đó là chỗ app gửi thư báo khi booking
     * thay đổi. Trước đây địa chỉ này chỉ được chép vào `note` cho người đọc,
     * máy không dùng được, nên khách đặt web sửa lịch cũng chẳng ai báo.
     * Vẫn giữ nguyên trong ghi chú: quầy quen đọc ở đó.
     */
    email: (doc.contact?.email || "").trim().toLowerCase(),
    webBookingId: String(doc._id),
    webStatus: doc.status || "pending",
    syncedAt: new Date(),
  };
}

/** 9 số cuối của SĐT: "+84 832935046" và "0832935046" phải ra cùng một khoá. */
function phoneKey(raw?: string): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  return digits.length >= 9 ? digits.slice(-9) : "";
}

/** Tên bỏ dấu, gộp khoảng trắng, chữ thường — để so tên khách hai bên. */
function nameKey(raw?: string): string {
  return String(raw ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export type WebSyncResult = {
  created: number;
  updated: number;
  /** Gộp vào booking nhân sự đã gõ tay trước đó — không tạo dòng thứ hai. */
  merged: number;
  cancelled: number;
  skipped: number;
};


/**
 * Đồng bộ booking web của MỘT điểm bay, từ `fromDate` (mặc định hôm nay) trở đi.
 *
 * Chỉ ngày bay từ hôm nay trở đi: quá khứ thì bay xong rồi, đưa vào danh sách
 * chờ chỉ làm rối. Khách huỷ bên web thì bản ghi nội bộ chuyển sang "đã huỷ"
 * chứ không xoá — mất dấu vết là mất luôn lý do vì sao ngày đó thiếu khách.
 */
export async function syncWebBookings(
  spotRaw: string,
  opts?: { fromDate?: string },
): Promise<WebSyncResult> {
  await connectDB();
  const spot = normalizeSpot(spotRaw);
  const webLocation = WEB_LOCATION_BY_SPOT[spot];
  const out: WebSyncResult = { created: 0, updated: 0, merged: 0, cancelled: 0, skipped: 0 };
  if (!webLocation) return out;

  // Ghi mốc "check lần cuối" cho nút trên app — chạy tay hay chạy nền đều tính
  await BaobaySetting.updateOne({ key: spot }, { $set: { webSyncAt: new Date() } }, { upsert: true });

  const fromDate = opts?.fromDate || todayInVN();
  const docs = (await Booking.find({ location: webLocation, dateISO: { $gte: fromDate } })
    .sort({ dateISO: 1 })
    .lean()) as unknown as WebDoc[];

  for (const doc of docs) {
    /**
     * Đơn THỬ NGHIỆM — nhận diện bằng EMAIL đặt chỗ (xem lib/baobay/test-booking)
     * — không vào sổ nội bộ, cũng không lên bảng tính.
     */
    if (isTestBooking({ email: doc.contact?.email })) {
      out.skipped += 1;
      continue;
    }
    const webId = String(doc._id);
    const existing = await BaobayBooking.findOne({ webBookingId: webId }).lean<any>();
    const mapped = mapWebBooking(doc, spot);

    if (doc.status === "cancelled") {
      if (existing && existing.status !== "cancelled") {
        await BaobayBooking.updateOne(
          { _id: existing._id },
          { $set: { status: "cancelled", webStatus: "cancelled", syncedAt: new Date() } },
        );
        out.cancelled += 1;
      } else {
        out.skipped += 1;
      }
      continue;
    }

    if (!existing) {
      /**
       * Nhân sự có thể đã gõ tay chính đơn này trước khi có đồng bộ (khách gọi
       * Zalo xác nhận lại chẳng hạn). Tạo thêm một dòng nữa là danh sách chờ có
       * hai lần cùng một khách — nên tìm bản cũ mà GỘP vào: cùng điểm, cùng ngày
       * bay, và trùng SĐT (chắc nhất) hoặc trùng tên + số khách.
       */
      const sameDay = (await BaobayBooking.find({
        spot,
        flightDate: mapped.flightDate,
        status: "open",
        webBookingId: { $in: [null, ""] },
      }).lean<any[]>()) ?? [];
      const wantPhone = phoneKey(mapped.phone);
      const wantName = nameKey(mapped.contactName);
      const twin = sameDay.find(
        (b) =>
          (wantPhone && phoneKey(b.phone) === wantPhone) ||
          (wantName && wantName !== "khach web" && nameKey(b.contactName) === wantName && b.guestCount === mapped.guestCount),
      );

      if (twin) {
        // Chỉ ĐIỀN THÊM phần còn trống — số nhân sự đã gõ mới là số họ nắm chắc
        const fill: Record<string, unknown> = {
          webBookingId: mapped.webBookingId,
          webStatus: mapped.webStatus,
          syncedAt: new Date(),
        };
        if (!(twin.source || "").trim()) fill.source = mapped.source;
        if (!(twin.bookingCode || "").trim()) fill.bookingCode = mapped.bookingCode;
        if (!(twin.expectedTime || "").trim() && mapped.expectedTime) fill.expectedTime = mapped.expectedTime;
        if (!(twin.phone || "").trim() && mapped.phone) fill.phone = mapped.phone;
        // Quầy gõ tay trước rồi đơn web mới về: điền email vào chỗ còn trống
        if (!(twin.email || "").trim() && mapped.email) fill.email = mapped.email;
        if (!twin.unitPrice && mapped.unitPrice) fill.unitPrice = mapped.unitPrice;
        if (!twin.totalAmount && mapped.totalAmount) fill.totalAmount = mapped.totalAmount;
        for (const k of ["flycam", "video360", "redFlag", "sunset", "flagFlight", "mountainCar"] as const) {
          if (!twin[k] && mapped[k]) fill[k] = mapped[k];
        }
        if (mapped.note) fill.note = [twin.note, `web: ${mapped.note}`].filter(Boolean).join(" · ");
        await BaobayBooking.updateOne({ _id: twin._id }, { $set: fill });
        await pushQueueNoToWeb(webId, twin.daySeq, twin.flightDate);
        out.merged += 1;
        continue;
      }

      const daySeq = await nextDaySeq(mapped.spot, mapped.flightDate);
      await BaobayBooking.create({
        ...mapped,
        daySeq,
        // Giữ đúng THỜI ĐIỂM KHÁCH ĐẶT để danh sách chờ xếp theo thứ tự đặt chỗ
        createdAt: doc.createdAt ?? new Date(),
        createdByUsername: "web",
        createdByName: "Khách đặt trên web",
        depositToCompany: false,
        deposit: 0,
        remaining: mapped.totalAmount,
        transferCode: "",
        status: "open",
        rescheduledFrom: [],
      });
      await pushQueueNoToWeb(webId, daySeq, mapped.flightDate);
      out.created += 1;
      continue;
    }

    /**
     * Bản ghi ĐÃ CÓ thì thôi, không đụng vào nữa.
     *
     * Trang khách khoá đơn ngay khi khách bấm gửi — khách không sửa, không huỷ
     * được — nên bên đó chẳng còn gì mới để nhận. Trong khi nhân sự thì liên tục
     * sửa: thêm dịch vụ, ghi cọc, thu tiền, giao người. Đồng bộ mà ghi đè là xoá
     * mất công của họ (thêm 1 flycam xong kéo lại là về 0), nên tuyệt đối không.
     */
    await pushQueueNoToWeb(webId, existing.daySeq, existing.flightDate);
    out.skipped += 1;
  }

  return out;
}

/** Đồng bộ cả ba điểm bay có trong app — dùng cho nút "đồng bộ" và lịch chạy nền. */
export async function syncWebBookingsAllSpots(opts?: { fromDate?: string }): Promise<WebSyncResult> {
  const total: WebSyncResult = { created: 0, updated: 0, merged: 0, cancelled: 0, skipped: 0 };
  for (const spot of WEB_SYNC_SPOTS) {
    const r = await syncWebBookings(spot, opts);
    total.created += r.created;
    total.updated += r.updated;
    total.merged += r.merged;
    total.cancelled += r.cancelled;
    total.skipped += r.skipped;
  }
  return total;
}

/**
 * Khách vừa đặt xong trên web: đưa ngay vào sổ nội bộ, khỏi đợi ai bấm đồng bộ.
 * Gọi trong `after()` của route tạo booking nên lỗi ở đây không được làm hỏng
 * đơn của khách — vì vậy bọc try/catch và chỉ ghi log.
 */
export async function syncOneWebBooking(webBookingId: string): Promise<void> {
  try {
    await connectDB();
    const doc = (await Booking.findById(webBookingId).lean()) as unknown as WebDoc | null;
    if (!doc?.location) return;
    const spot = Object.keys(WEB_LOCATION_BY_SPOT).find((s) => WEB_LOCATION_BY_SPOT[s] === doc.location);
    if (!spot) return; // điểm bay không có trong app (Đà Nẵng, Quản Bạ…)
    await syncWebBookings(spot, { fromDate: doc.dateISO || todayInVN() });
  } catch (err) {
    console.error("syncOneWebBooking error:", err);
  }
}
