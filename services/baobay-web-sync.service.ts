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

/** Điểm bay của trang khách ↔ điểm bay trong app. Điểm nào không có ở đây (Đà Nẵng, Quản Bạ…) thì bỏ qua. */
const WEB_LOCATION_BY_SPOT: Record<string, string> = {
  "khau-pha": "khau_pha",
  "ha-noi": "ha_noi",
  sapa: "sapa",
};

export const WEB_SYNC_SPOTS = Object.keys(WEB_LOCATION_BY_SPOT);

/** Dịch vụ bên trang khách ↔ ô dịch vụ trong app. */
const SERVICE_MAP: Array<{ match: RegExp; field: "flycam" | "video360" | "sunset" | "flagFlight" }> = [
  { match: /flycam/i, field: "flycam" },
  { match: /camera360|cam360/i, field: "video360" },
  { match: /sunset|hoang_hon/i, field: "sunset" },
  { match: /flag|keo_co/i, field: "flagFlight" },
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

/** Số lượng một dịch vụ khách đã chọn (gộp cả hai kiểu dữ liệu của trang khách). */
function serviceQty(doc: WebDoc, field: "flycam" | "video360" | "sunset" | "flagFlight", guests: number): number {
  let qty = 0;
  for (const [key, value] of Object.entries(doc.services ?? {})) {
    if (PICKUP_KEYS.test(key)) continue;
    const hit = SERVICE_MAP.find((m) => m.match.test(key));
    if (hit?.field !== field || !value) continue;
    if (!value.selected && !value.qty) continue;
    qty += value.qty && value.qty > 0 ? value.qty : guests;
  }
  // Bản đặt cũ dùng addonsQty (chỉ có flycam + camera360)
  const legacy = doc.addonsQty ?? {};
  if (field === "flycam") qty += legacy.flycam || 0;
  if (field === "video360") qty += legacy.camera360 || 0;
  return Math.min(qty, Math.max(guests, 0) || qty);
}

/** Số suất "xe chuyên dụng lên núi" khách đã chọn (Hà Nội tính 150k/khách). */
function mountainCarQty(doc: WebDoc, guests: number): number {
  for (const [key, value] of Object.entries(doc.services ?? {})) {
    if (!/shuttle|mountain/i.test(key)) continue;
    if (!(value?.selected || (value?.qty ?? 0) > 0)) continue;
    return value?.qty && value.qty > 0 ? Math.min(value.qty, guests) : guests;
  }
  return 0;
}

/** Loại hình bay: Hà Nội theo gói 650m/850m, nơi khác theo có động cơ hay không. */
function flightKindOf(doc: WebDoc, spot: string): "pg" | "ppg" | "m650" | "m850" {
  if (spot === "ha-noi") return doc.packageKey === "ha_noi_850m" ? "m850" : "m650";
  const ppgByService = Object.entries(doc.services ?? {}).some(
    ([k, v]) => /paramotor|ppg/i.test(k) && (v?.selected || (v?.qty ?? 0) > 0),
  );
  return doc.flightTypeKey === "paramotor" || ppgByService ? "ppg" : "pg";
}

/** Ô "đưa đón" + ghi chú chỗ đón, suy từ dịch vụ khách chọn. */
function pickupOf(doc: WebDoc): { pickup: "self" | "bigc" | "hotel" | "other"; pickupNote: string } {
  const picked: string[] = [];
  for (const [key, value] of Object.entries(doc.services ?? {})) {
    if (!PICKUP_KEYS.test(key) || !(value?.selected || (value?.qty ?? 0) > 0)) continue;
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
function mapWebBooking(doc: WebDoc, spot: string) {
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
    redFlag: 0,
    sunset: serviceQty(doc, "sunset", guests),
    flagFlight: serviceQty(doc, "flagFlight", guests),
    flightKind: flightKindOf(doc, spot),
    pickup,
    pickupNote,
    expectedTime: (doc.timeSlot || "").trim(),
    pickupFee: toVND(doc.price?.addonsTotal?.pickup, currency),
    mountainCar: mountainCarQty(doc, guests),
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
        for (const k of ["flycam", "video360", "sunset", "flagFlight", "mountainCar"] as const) {
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
