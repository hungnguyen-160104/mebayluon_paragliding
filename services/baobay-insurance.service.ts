// services/baobay-insurance.service.ts
/**
 * HỒ SƠ BẢO HIỂM CỦA TỪNG NGƯỜI BAY.
 *
 * Quy trình chuẩn: khách đặt bay → booking vào sổ (có thể chưa có giấy tờ) →
 * khách đến điểm bay checkin → nhân viên xem dòng bảo hiểm dưới booking: đủ thì
 * hiện "ĐỦ", thiếu thì app nhắc và mở ô nhập/quét → duyệt → thu tiền, xuất vé →
 * bay. Dữ liệu duyệt xong đẩy sang BẢNG BẢO HIỂM SẴN CÓ (bảng lâu nay nhân
 * viên nhập tay), mỗi người một dòng.
 *
 * Ba nguyên tắc:
 *
 *  1. KHÔNG XOÁ DÒNG. Khách huỷ hay đổi người thì đánh dấu, giữ vết — bên bảo
 *     hiểm phải thấy để rút tên, xoá trắng là họ vẫn tính phí cho người không bay.
 *
 *  2. MONGODB TRƯỚC, BẢNG TÍNH SAU. Apps Script hỏng không được làm nhân viên
 *     mất công nhập lại; đẩy không được thì ghi `insuranceSheetError` để bù sau.
 *
 *  3. AI THẤY BOOKING THÌ NGƯỜI ĐÓ NHẬP ĐƯỢC. Phi công đứng ở bãi hay quầy vé
 *     đều gặp khách trước giờ bay; bắt đúng một vai mới được nhập là dữ liệu
 *     không bao giờ đủ.
 */

import { after } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { spotName } from "@/lib/baobay/spots";
import type { BaobaySession } from "@/lib/baobay/token";
import {
  birthdayVN,
  emptyInsured,
  ID_TYPE_LABEL,
  insuranceState,
  normalizeGenderText,
  normalizeInsured,
  type InsuranceState,
  type InsuredGuest,
} from "@/lib/baobay/insurance";
import { isInsuranceSheetConfigured, pushInsuranceRows, type InsuranceSheetRow } from "@/lib/baobay/insurance-sheet";
import { BaobayBooking } from "@/models/BaobayBooking.model";
import { Booking } from "@/models/Booking.model";
import { assertSpotAllowed, BaobayError } from "@/services/baobay.service";

export type InsuranceView = {
  bookingId: string;
  daySeq: number;
  flightDate: string;
  spot: string;
  spotLabel: string;
  contactName: string;
  phone: string;
  bookingCode: string;
  source: string;
  guestCount: number;
  guests: InsuredGuest[];
  state: InsuranceState;
  approvedAt?: string;
  approvedBy?: string;
  updatedBy?: string;
  sheetAt?: string;
  sheetError?: string;
  sheetConfigured: boolean;
  /**
   * Số giấy tờ đã xuất hiện ở BOOKING KHÁC cùng ngày cùng điểm — khai hai lần
   * là bảo hiểm tính phí hai lần cho một người. Giao diện bôi đỏ.
   */
  duplicateElsewhere: Array<{ idNumber: string; where: string }>;
};

/** Số khách ĐANG CÒN BAY của booking (đã trừ phần huỷ). */
function liveGuestCount(doc: any): number {
  return Math.max(0, Number(doc?.guestCount) || 0);
}

/**
 * Dựng sẵn danh sách người bay để nhân viên chỉ phải BỔ SUNG chỗ thiếu.
 *
 * Ưu tiên: dữ liệu đã lưu → khách tự điền trên mebayluon.com → thư OTA gửi kèm
 * → tên người liên hệ cho dòng đầu. Cuối cùng đệm thêm dòng trống cho đủ số khách.
 */
async function seedGuests(doc: any): Promise<InsuredGuest[]> {
  const saved: InsuredGuest[] = Array.isArray(doc.insured) ? doc.insured.map(normalizeInsured) : [];
  if (saved.length) return padTo(saved, liveGuestCount(doc), doc);

  const out: InsuredGuest[] = [];

  if (doc.webBookingId) {
    const web = await Booking.findById(String(doc.webBookingId))
      .select("guests")
      .lean<{ guests?: Array<Record<string, unknown>> }>();
    for (const g of web?.guests ?? []) {
      out.push(
        normalizeInsured({
          fullName: String(g.fullName || ""),
          birthday: String(g.dob || ""),
          gender: normalizeGenderText(String(g.gender || "")),
          idNumber: String(g.idNumber || ""),
          idType: String(g.idNumber || "").length >= 12 ? "cccd" : String(g.idNumber || "") ? "passport" : "",
          nationality: String(g.nationality || "") || "Việt Nam",
          source: "web",
        }),
      );
    }
  }

  if (!out.length && Array.isArray(doc.otaGuests)) {
    for (const g of doc.otaGuests) {
      out.push(
        normalizeInsured({
          fullName: String(g.fullName || ""),
          birthday: String(g.birthday || ""),
          gender: normalizeGenderText(String(g.gender || "")),
          idNumber: String(g.idNumber || ""),
          idType: String(g.idNumber || "").length >= 12 ? "cccd" : String(g.idNumber || "") ? "passport" : "",
          nationality: String(g.nationality || "") || "Việt Nam",
          source: "ota",
        }),
      );
    }
  }

  if (!out.length && doc.contactName) {
    // Giữ mặc định "Việt Nam" của dòng trống — phần lớn khách vãng lai là người Việt
    out.push(normalizeInsured({ ...emptyInsured(), fullName: String(doc.contactName) }));
  }

  return padTo(out, liveGuestCount(doc), doc);
}

/** Thêm/bớt dòng cho khớp số khách đang còn bay. Bớt thì đánh dấu huỷ, không xoá. */
function padTo(list: InsuredGuest[], need: number, doc: any): InsuredGuest[] {
  const out = [...list];
  const activeIdx = out.map((g, i) => (g.cancelled ? -1 : i)).filter((i) => i >= 0);

  if (activeIdx.length < need) {
    for (let i = activeIdx.length; i < need; i++) {
      const g = emptyInsured();
      // Dòng đầu của booking tại chỗ: điền sẵn tên người liên hệ cho đỡ gõ
      if (!out.length && doc?.contactName) g.fullName = String(doc.contactName);
      out.push(g);
    }
  } else if (activeIdx.length > need) {
    /** Thừa dòng (khách bớt người mà chưa ai sửa hồ sơ): đánh dấu huỷ từ cuối lên. */
    for (let k = activeIdx.length - 1; k >= need; k--) {
      out[activeIdx[k]] = { ...out[activeIdx[k]], cancelled: true, note: joinNote(out[activeIdx[k]].note, "bớt người") };
    }
  }
  return out;
}

function joinNote(old: string, add: string): string {
  const o = String(old || "").trim();
  if (!o) return add;
  return o.includes(add) ? o : `${o}; ${add}`;
}

/** Giấy tờ trùng với booking KHÁC cùng ngày cùng điểm. */
async function findDuplicatesElsewhere(
  spot: string,
  flightDate: string,
  bookingId: string,
  guests: InsuredGuest[],
): Promise<Array<{ idNumber: string; where: string }>> {
  const ids = guests.filter((g) => !g.cancelled && g.idNumber).map((g) => g.idNumber);
  if (!ids.length) return [];

  const others = await BaobayBooking.find({
    spot,
    flightDate,
    _id: { $ne: bookingId },
    "insured.idNumber": { $in: ids },
  })
    .select("contactName daySeq insured")
    .lean<Array<any>>();

  const out: Array<{ idNumber: string; where: string }> = [];
  for (const o of others) {
    for (const g of o.insured ?? []) {
      if (g.cancelled) continue;
      const id = String(g.idNumber || "").toUpperCase();
      if (ids.includes(id) && !out.some((x) => x.idNumber === id)) {
        out.push({ idNumber: id, where: `#${o.daySeq || "?"} ${o.contactName || "booking khác"}` });
      }
    }
  }
  return out;
}

async function buildView(doc: any): Promise<InsuranceView> {
  const guests = await seedGuests(doc);
  const state = insuranceState(guests, liveGuestCount(doc));
  return {
    bookingId: String(doc._id),
    daySeq: Number(doc.daySeq) || 0,
    flightDate: String(doc.flightDate || ""),
    spot: String(doc.spot || ""),
    spotLabel: spotName(String(doc.spot || "")),
    contactName: String(doc.contactName || ""),
    phone: String(doc.phone || ""),
    bookingCode: String(doc.bookingCode || ""),
    source: String(doc.source || ""),
    guestCount: liveGuestCount(doc),
    guests,
    state,
    approvedAt: doc.insuranceApprovedAt ? new Date(doc.insuranceApprovedAt).toISOString() : undefined,
    approvedBy: doc.insuranceApprovedBy || undefined,
    updatedBy: doc.insuranceUpdatedBy || undefined,
    sheetAt: doc.insuranceSheetAt ? new Date(doc.insuranceSheetAt).toISOString() : undefined,
    sheetError: doc.insuranceSheetError || undefined,
    sheetConfigured: isInsuranceSheetConfigured(),
    duplicateElsewhere: await findDuplicatesElsewhere(
      String(doc.spot),
      String(doc.flightDate),
      String(doc._id),
      guests,
    ),
  };
}

export async function getBookingInsurance(
  session: BaobaySession,
  spotRaw: string,
  id: string,
): Promise<InsuranceView> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  const doc = await BaobayBooking.findOne({ _id: id, spot }).lean<any>();
  if (!doc) throw new BaobayError("Không tìm thấy booking", 404);
  return buildView(doc);
}

export async function saveBookingInsurance(
  session: BaobaySession,
  spotRaw: string,
  id: string,
  guestsRaw: Array<Partial<InsuredGuest>>,
  opts: { approve?: boolean } = {},
): Promise<InsuranceView> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  const doc = await BaobayBooking.findOne({ _id: id, spot }).lean<any>();
  if (!doc) throw new BaobayError("Không tìm thấy booking", 404);

  const guests = (guestsRaw || []).map(normalizeInsured);
  const state = insuranceState(guests, liveGuestCount(doc));

  /**
   * Duyệt là hành động khẳng định "đủ và đúng", nên chỉ cho duyệt khi thật sự
   * đủ. Còn LƯU thì lúc nào cũng cho: nhân viên hay nhập được một nửa rồi khách
   * chạy đi lấy giấy tờ, mất phần đã gõ là lần sau không ai buồn nhập nữa.
   */
  if (opts.approve && !state.ok) {
    const first = state.missing[0];
    throw new BaobayError(
      state.duplicateIds.length
        ? `Trùng số giấy tờ trong cùng booking: ${state.duplicateIds.join(", ")}`
        : `Chưa duyệt được — người thứ ${(first?.index ?? 0) + 1} còn thiếu ${first?.fields.join(", ")}`,
      400,
    );
  }

  const by = session.name || session.username;
  const set: Record<string, unknown> = {
    insured: guests,
    insuranceUpdatedAt: new Date(),
    insuranceUpdatedBy: by,
  };
  if (opts.approve) {
    set.insuranceApprovedAt = new Date();
    set.insuranceApprovedBy = by;
  }

  const saved = await BaobayBooking.findOneAndUpdate({ _id: id, spot }, { $set: set }, { new: true }).lean<any>();

  /** Đủ rồi thì đẩy sang bảng bảo hiểm ở nền — nhân viên không phải đứng chờ. */
  if (state.ok || opts.approve) {
    after(async () => {
      await syncInsuranceToSheet(spot, id);
    });
  }

  return buildView(saved);
}

/**
 * Đẩy hồ sơ của một booking sang bảng bảo hiểm. Gọi được từ mọi chỗ làm hồ sơ
 * đổi: duyệt xong, khách dời ngày, khách huỷ, thêm bớt người, đổi người bay.
 */
export async function syncInsuranceToSheet(spot: string, id: string): Promise<{ ok: boolean; error?: string }> {
  if (!isInsuranceSheetConfigured()) return { ok: false, error: "Chưa cấu hình bảng bảo hiểm" };
  await connectDB();
  const doc = await BaobayBooking.findOne({ _id: id, spot }).lean<any>();
  if (!doc) return { ok: false, error: "Không tìm thấy booking" };

  const guests: InsuredGuest[] = (doc.insured ?? []).map(normalizeInsured);
  if (!guests.length) return { ok: true };

  const stamp = new Date().toISOString();
  const rows: InsuranceSheetRow[] = guests.map((g, i) => ({
    key: `${String(doc._id)}:${i}`,
    flightDate: String(doc.flightDate || ""),
    spotName: spotName(String(doc.spot || "")),
    fullName: g.fullName,
    birthday: birthdayVN(g.birthday),
    gender: g.gender === "nam" ? "Nam" : g.gender === "nu" ? "Nữ" : "",
    idType: ID_TYPE_LABEL[g.idType],
    idNumber: g.idNumber,
    nationality: g.nationality,
    isChild: g.isChild ? "Trẻ em" : "",
    bookingCode: String(doc.bookingCode || "") || `#${doc.daySeq || ""}`,
    phone: String(doc.phone || ""),
    note: [g.note, g.replacedName ? `bay thay ${g.replacedName}` : ""].filter(Boolean).join("; "),
    status: g.cancelled ? "HUỶ" : "BAY",
    updatedAt: stamp,
  }));

  const res = await pushInsuranceRows(rows);
  await BaobayBooking.updateOne(
    { _id: id, spot },
    {
      $set: {
        insuranceSheetAt: res.ok ? new Date() : doc.insuranceSheetAt,
        insuranceSheetError: res.ok ? "" : res.error || "Không rõ lỗi",
      },
    },
  );
  return { ok: res.ok, error: res.error };
}

/**
 * KHÁCH HUỶ BỚT NGƯỜI: đánh dấu `count` dòng còn hiệu lực từ cuối lên là huỷ,
 * rồi đẩy lại bảng. Gọi ngay sau khi nghiệp vụ huỷ khách chạy xong.
 */
export async function cancelInsuredGuests(spot: string, id: string, count: number, reason: string): Promise<void> {
  if (count <= 0) return;
  await connectDB();
  const doc = await BaobayBooking.findOne({ _id: id, spot }).lean<any>();
  if (!doc || !Array.isArray(doc.insured) || !doc.insured.length) return;

  const guests: InsuredGuest[] = doc.insured.map(normalizeInsured);
  let left = count;
  for (let i = guests.length - 1; i >= 0 && left > 0; i--) {
    if (guests[i].cancelled) continue;
    guests[i] = { ...guests[i], cancelled: true, note: joinNote(guests[i].note, reason || "khách huỷ") };
    left -= 1;
  }
  await BaobayBooking.updateOne({ _id: id, spot }, { $set: { insured: guests } });
  after(async () => {
    await syncInsuranceToSheet(spot, id);
  });
}

/**
 * KHÁCH DỜI NGÀY / ĐỔI ĐIỂM: hồ sơ đi theo booking nên chỉ cần đẩy lại — dòng
 * trên bảng mang khoá cũ, script ghi đè đúng dòng đó với ngày bay mới.
 */
export async function resyncInsuranceAfterMove(spot: string, id: string): Promise<void> {
  after(async () => {
    await syncInsuranceToSheet(spot, id);
  });
}
