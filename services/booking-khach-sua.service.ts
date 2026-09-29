// services/booking-khach-sua.service.ts
/**
 * KHÁCH TỰ SỬA BOOKING TRÊN WEB (chủ 30/09/2026).
 *
 * Luồng:
 *  1. Khách vào /booking/sua, gõ MÃ BOOKING + SỐ ĐIỆN THOẠI → `traCuuBooking`.
 *     Khớp thì nhận một thẻ sửa (HMAC, sống 60 phút) để các lệnh sau khỏi hỏi lại.
 *  2. Sửa ngày, giờ, số khách, liên hệ, điểm đón, thông tin từng khách, ghi
 *     chú → `khachSuaBooking`. Hoặc bấm yêu cầu huỷ → `khachYeuCauHuy`.
 *
 * LUẬT KHOÁ (mặc định chủ chưa chốt khác): được sửa tới 18:00 NGÀY HÔM TRƯỚC
 * ngày bay (giờ Việt Nam). Khoá luôn khi: booking đã huỷ / đã bay, đã gửi yêu
 * cầu huỷ, hoặc bên sổ nội bộ đã IN VÉ, đã KHOÁ dòng, đã chốt ngày, dòng không
 * còn "đang mở".
 *
 * MỖI LẦN SỬA được áp vào CẢ HAI NƠI và để lại vết:
 *  - booking web: đổi ô, tính lại giá khi đổi ngày/số khách, thêm `lichSuSua`.
 *  - sổ nội bộ (BaobayBooking có webBookingId): đổi ngày theo đúng đường dời
 *    lịch (số thứ tự ngày mới, trả số ngày cũ, lưu `rescheduledFrom`), số
 *    khách, giờ, email, điểm đón, tổng tiền, tên khách; ghi thêm một dòng
 *    BaobayBookingLog "Khách (web)" nêu rõ trước → sau để lịch sử booking hiện.
 *  - Telegram báo nhân viên, email xác nhận cho khách.
 * Yêu cầu huỷ KHÔNG tự huỷ: cọc và hoàn tiền phải có người xử lý.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/models/Booking.model";
import { BaobayBooking } from "@/models/BaobayBooking.model";
import { BaobayBookingLog } from "@/models/BaobayBookingLog.model";
import { chuanMa, khoaSdt, maSoCu } from "@/lib/booking/ma-booking";
import { computePriceByLang, type LocationKey } from "@/lib/booking/calculate-price";
import { todayInVN, shiftDateKey } from "@/lib/baobay/date";
import { freeDaySeq, isDayClosed, nextDaySeq } from "@/services/baobay.service";
import { pushQueueNoToWeb } from "@/lib/baobay/web-queue";
import { sendTelegramToAll } from "@/services/telegram.service";
import { sendSmtpMail } from "@/lib/mailer";
import { customerEmailHtml, customerEmailSubject } from "@/lib/email/customer-booking";
import { thuNhanVien } from "@/services/yeu-cau-huy.service";

export class LoiKhachSua extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/* ------------------------------------------------------------------ */
/* Thẻ sửa                                                             */
/* ------------------------------------------------------------------ */
const THE_SONG_MS = 60 * 60 * 1000;
function biMat(): string {
  const s = process.env.BOOKING_EDIT_SECRET || process.env.JWT_SECRET || "";
  if (!s) throw new LoiKhachSua("Máy chủ chưa cấu hình khoá bí mật", 500);
  return s;
}
function kyThe(id: string, het: number): string {
  const sig = createHmac("sha256", biMat()).update(`${id}.${het}`).digest("base64url");
  return `${id}.${het}.${sig}`;
}
function docThe(the: unknown): string {
  const [id, hetS, sig] = String(the ?? "").split(".");
  const het = Number(hetS);
  if (!id || !Number.isFinite(het) || !sig) throw new LoiKhachSua("Phiên sửa không hợp lệ — tra cứu lại mã booking", 401);
  if (Date.now() > het) throw new LoiKhachSua("Phiên sửa đã hết hạn — tra cứu lại mã booking", 401);
  const dung = createHmac("sha256", biMat()).update(`${id}.${het}`).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(dung);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new LoiKhachSua("Phiên sửa không hợp lệ — tra cứu lại mã booking", 401);
  return id;
}

/* ------------------------------------------------------------------ */
/* Chống dò mã: mỗi IP tối đa 10 lần tra sai / 15 phút                  */
/* ------------------------------------------------------------------ */
const TRA_SAI = new Map<string, { n: number; tu: number }>();
function ghiTraSai(ip: string) {
  const now = Date.now();
  const cu = TRA_SAI.get(ip);
  if (!cu || now - cu.tu > 15 * 60 * 1000) TRA_SAI.set(ip, { n: 1, tu: now });
  else cu.n++;
}
function kiemTraSai(ip: string) {
  const cu = TRA_SAI.get(ip);
  if (cu && Date.now() - cu.tu <= 15 * 60 * 1000 && cu.n >= 10) {
    throw new LoiKhachSua("Bạn đã nhập sai nhiều lần — thử lại sau 15 phút hoặc gọi hotline 0964 073 555", 429);
  }
}

/* ------------------------------------------------------------------ */
/* Khoá                                                                */
/* ------------------------------------------------------------------ */
/** Giờ Việt Nam hiện tại "HH:MM". */
const gioVN = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(11, 16);

/** Hạn sửa của một ngày bay: 18:00 hôm trước (giờ VN). */
export function hanSua(ngayBay: string): { ngay: string; gio: string } {
  return { ngay: shiftDateKey(ngayBay, -1), gio: "18:00" };
}
function quaHan(ngayBay: string): boolean {
  const h = hanSua(ngayBay);
  const homNay = todayInVN();
  return homNay > h.ngay || (homNay === h.ngay && gioVN() >= h.gio);
}

type Khoa = { khoa: boolean; lyDo: string };
async function xetKhoa(b: any, ops: any | null): Promise<Khoa> {
  if (b.status === "cancelled") return { khoa: true, lyDo: "Booking đã huỷ." };
  if (b.status === "completed") return { khoa: true, lyDo: "Chuyến bay đã hoàn thành." };
  if (b.yeuCauHuy?.at) return { khoa: true, lyDo: "Bạn đã gửi yêu cầu huỷ — nhân viên sẽ liên hệ để xử lý." };
  if (!b.dateISO || quaHan(b.dateISO)) {
    return { khoa: true, lyDo: "Đã quá hạn sửa (18:00 hôm trước ngày bay) — vui lòng gọi hotline 0964 073 555." };
  }
  if (ops) {
    if (ops.status && ops.status !== "open") return { khoa: true, lyDo: "Booking đã được điều phối xử lý — vui lòng gọi hotline 0964 073 555." };
    if (ops.lockedAt) return { khoa: true, lyDo: "Booking đã được khoá sổ — vui lòng gọi hotline 0964 073 555." };
    if (ops.ticketIssuedAt) return { khoa: true, lyDo: "Vé đã được xuất — vui lòng gọi hotline 0964 073 555 để đổi." };
    if (await isDayClosed(ops.spot, ops.flightDate)) return { khoa: true, lyDo: "Ngày bay đã chốt sổ — vui lòng gọi hotline 0964 073 555." };
  }
  return { khoa: false, lyDo: "" };
}

/* ------------------------------------------------------------------ */
/* Tra cứu                                                             */
/* ------------------------------------------------------------------ */
const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Mã cũ gửi trong email trước 30/09: "DDMM.<số điện thoại>". */
function maCuTheoNgaySdt(b: any): string {
  const d = String(b.dateISO || "");
  const ddmm = d.length === 10 ? `${d.slice(8, 10)}${d.slice(5, 7)}` : "";
  return chuanMa(`${ddmm}${String(b.contact?.phone || "").replace(/\D/g, "")}`);
}

async function timBooking(maRaw: unknown, sdtRaw: unknown) {
  const ma = chuanMa(maRaw);
  const k = khoaSdt(sdtRaw);
  if (!ma || !k) return null;
  const theoSdt = { "contact.phone": { $regex: `${escRe(k)}$` } };
  const moi = await Booking.findOne({ maBooking: ma, ...theoSdt }).lean<any>();
  if (moi) return moi;
  /** Booking cũ chưa có mã mới: khớp mã sổ WebMBL<6 ký tự cuối id> hoặc mã cũ DDMM.sđt. */
  const ungVien = await Booking.find({ ...theoSdt, maBooking: { $exists: false } })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean<any[]>();
  return ungVien.find((b) => maSoCu(String(b._id)) === ma || maCuTheoNgaySdt(b) === ma) ?? null;
}

async function opsCua(b: any) {
  return BaobayBooking.findOne({ webBookingId: String(b._id) }).lean<any>();
}

function xemBooking(b: any, khoa: Khoa) {
  return {
    ma: b.maBooking || maSoCu(String(b._id)),
    locationName: b.locationName || "",
    location: b.location,
    goi: [b.packageLabel, b.flightTypeLabel].filter(Boolean).join(" · "),
    dateISO: b.dateISO || "",
    timeSlot: b.timeSlot || "",
    guestsCount: b.guestsCount || 1,
    contact: {
      phone: b.contact?.phone || "",
      email: b.contact?.email || "",
      pickupLocation: b.contact?.pickupLocation || "",
      specialRequest: b.contact?.specialRequest || "",
    },
    guests: (b.guests ?? []).map((g: any) => ({
      fullName: g.fullName || "",
      dob: g.dob || "",
      gender: g.gender || "",
      idNumber: g.idNumber || "",
      weightKg: g.weightKg ?? null,
      nationality: g.nationality || "",
    })),
    dichVu: (b.selectedServices ?? []).map((s: any) => s.label).filter(Boolean),
    gia: { tong: b.price?.total ?? 0, tienTe: b.price?.currency || "VND" },
    status: b.status,
    queueNo: b.queueNo ?? null,
    han: b.dateISO ? hanSua(b.dateISO) : null,
    khoa,
    yeuCauHuy: b.yeuCauHuy ?? null,
    lichSuSua: (b.lichSuSua ?? []).slice(-10),
  };
}

export async function traCuuBooking(input: { ma: unknown; sdt: unknown; ip: string }) {
  await connectDB();
  kiemTraSai(input.ip);
  const b = await timBooking(input.ma, input.sdt);
  if (!b) {
    ghiTraSai(input.ip);
    throw new LoiKhachSua("Không tìm thấy booking với mã và số điện thoại này. Kiểm tra lại mã trong email xác nhận.", 404);
  }
  const ops = await opsCua(b);
  const khoa = await xetKhoa(b, ops);
  return { booking: xemBooking(b, khoa), the: kyThe(String(b._id), Date.now() + THE_SONG_MS) };
}

/* ------------------------------------------------------------------ */
/* Sửa                                                                 */
/* ------------------------------------------------------------------ */
export type ThayDoiKhach = {
  dateISO?: string;
  timeSlot?: string;
  guestsCount?: number;
  contact?: { email?: string; pickupLocation?: string; specialRequest?: string };
  guests?: Array<{ fullName?: string; dob?: string; gender?: string; idNumber?: string; weightKg?: number | null; nationality?: string }>;
};

const NHAN: Record<string, string> = {
  dateISO: "Ngày bay",
  timeSlot: "Giờ bay",
  guestsCount: "Số khách",
  email: "Email",
  pickupLocation: "Điểm đón",
  specialRequest: "Ghi chú / yêu cầu",
  guests: "Thông tin khách",
  total: "Tổng tiền",
};
const ngayVN = (d: string) => (d.length === 10 ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : d);
const cat = (s: unknown, n: number) => String(s ?? "").trim().slice(0, n);

function giaCoSo(b: any, soKhach: number, ngay: string) {
  const lang = String(b.price?.currency || "VND").toUpperCase() === "USD" ? "en" : "vi";
  const r = computePriceByLang(
    { location: b.location as LocationKey, guestsCount: soKhach, dateISO: ngay, packageKey: b.packageKey, flightTypeKey: b.flightTypeKey },
    lang,
  );
  return { rong: r.basePricePerPerson * soKhach - r.discountPerPerson * soKhach, base: r.basePricePerPerson, giam: r.discountPerPerson };
}

export async function khachSuaBooking(input: { the: unknown; thayDoi: ThayDoiKhach }) {
  await connectDB();
  const id = docThe(input.the);
  if (!mongoose.Types.ObjectId.isValid(id)) throw new LoiKhachSua("Phiên sửa không hợp lệ", 401);
  const b = await Booking.findById(id).lean<any>();
  if (!b) throw new LoiKhachSua("Không tìm thấy booking", 404);
  const ops = await opsCua(b);
  const khoa = await xetKhoa(b, ops);
  if (khoa.khoa) throw new LoiKhachSua(khoa.lyDo, 409);

  const td = input.thayDoi ?? {};
  const set: Record<string, unknown> = {};
  const vet: Array<{ truong: string; cu: string; moi: string }> = [];
  const doi = (truong: string, cu: unknown, moi: unknown, duong: string, giaTri: unknown) => {
    if (String(cu ?? "") === String(moi ?? "")) return;
    set[duong] = giaTri;
    vet.push({ truong, cu: String(cu ?? ""), moi: String(moi ?? "") });
  };

  /* Ngày bay */
  let ngayMoi = b.dateISO as string;
  if (td.dateISO !== undefined && td.dateISO !== b.dateISO) {
    const d = String(td.dateISO);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new LoiKhachSua("Ngày bay không hợp lệ");
    if (quaHan(d)) throw new LoiKhachSua("Ngày mới phải còn hạn: đặt trước 18:00 hôm trước ngày bay");
    if (b.location === "quan_ba" && d < "2026-10-15") throw new LoiKhachSua("Điểm bay Quản Bạ mở từ 15/10/2026");
    if (ops && (await isDayClosed(ops.spot, d))) throw new LoiKhachSua("Ngày này đã chốt sổ, vui lòng chọn ngày khác");
    ngayMoi = d;
    doi("dateISO", ngayVN(b.dateISO || ""), ngayVN(d), "dateISO", d);
  }
  /* Giờ bay */
  if (td.timeSlot !== undefined) {
    const t = String(td.timeSlot);
    if (!/^(0[7-9]|1[0-8]):00$/.test(t)) throw new LoiKhachSua("Giờ bay phải từ 07:00 tới 18:00");
    doi("timeSlot", b.timeSlot, t, "timeSlot", t);
  }
  /* Số khách */
  let soKhachMoi = Number(b.guestsCount || 1);
  if (td.guestsCount !== undefined) {
    const n = Math.round(Number(td.guestsCount));
    if (!Number.isFinite(n) || n < 1 || n > 30) throw new LoiKhachSua("Số khách phải từ 1 tới 30");
    soKhachMoi = n;
    doi("guestsCount", b.guestsCount, n, "guestsCount", n);
  }
  /* Liên hệ */
  if (td.contact) {
    if (td.contact.email !== undefined) {
      const e = cat(td.contact.email, 120).toLowerCase();
      if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new LoiKhachSua("Email không hợp lệ");
      doi("email", b.contact?.email, e, "contact.email", e);
    }
    if (td.contact.pickupLocation !== undefined) {
      const v = cat(td.contact.pickupLocation, 300);
      doi("pickupLocation", b.contact?.pickupLocation, v, "contact.pickupLocation", v);
    }
    if (td.contact.specialRequest !== undefined) {
      const v = cat(td.contact.specialRequest, 1000);
      doi("specialRequest", b.contact?.specialRequest, v, "contact.specialRequest", v);
    }
  }
  /* Thông tin khách */
  if (Array.isArray(td.guests)) {
    const ds = td.guests.slice(0, 30).map((g) => ({
      fullName: cat(g.fullName, 120),
      dob: /^\d{4}-\d{2}-\d{2}$/.test(String(g.dob || "")) ? String(g.dob) : "",
      gender: cat(g.gender, 20),
      idNumber: cat(g.idNumber, 40),
      weightKg: Number.isFinite(Number(g.weightKg)) && Number(g.weightKg) > 0 ? Math.round(Number(g.weightKg)) : undefined,
      nationality: cat(g.nationality, 60),
    }));
    const tom = (arr: any[]) => arr.map((g) => [g.fullName, g.dob, g.weightKg ? `${g.weightKg}kg` : ""].filter(Boolean).join(" ")).join("; ");
    if (JSON.stringify(ds) !== JSON.stringify((b.guests ?? []).map((g: any) => ({ fullName: g.fullName || "", dob: g.dob || "", gender: g.gender || "", idNumber: g.idNumber || "", weightKg: g.weightKg ?? undefined, nationality: g.nationality || "" })))) {
      set.guests = ds;
      vet.push({ truong: "guests", cu: tom(b.guests ?? []), moi: tom(ds) });
    }
  }

  if (!vet.length) return { booking: xemBooking(b, khoa), thayDoi: [] as typeof vet };

  /* Tính lại giá khi đổi ngày hoặc số khách: chỉ phần vé bay, dịch vụ giữ nguyên để nhân viên xác nhận. */
  let tongMoi = b.price?.total ?? 0;
  if (ngayMoi !== b.dateISO || soKhachMoi !== Number(b.guestsCount || 1)) {
    try {
      const cu = giaCoSo(b, Number(b.guestsCount || 1), b.dateISO);
      const moi = giaCoSo(b, soKhachMoi, ngayMoi);
      tongMoi = Math.max(0, Math.round((b.price?.total ?? 0) - cu.rong + moi.rong));
      if (tongMoi !== (b.price?.total ?? 0)) {
        set["price.total"] = tongMoi;
        set["price.basePerPerson"] = moi.base;
        set["price.discountPerPerson"] = moi.giam;
        vet.push({ truong: "total", cu: String(b.price?.total ?? 0), moi: String(tongMoi) });
      }
    } catch {
      /* Không tính được giá mới thì giữ giá cũ — nhân viên sẽ báo lại. */
    }
  }

  const luc = new Date();
  await Booking.updateOne({ _id: b._id }, { $set: set, $push: { lichSuSua: { at: luc, thayDoi: vet } } });

  /* ---- Sổ nội bộ ---- */
  if (ops) await apVaoSo(ops, b, set, vet, tongMoi);

  const moi = await Booking.findById(b._id).lean<any>();
  void baoTin(moi, vet, "sua");
  return { booking: xemBooking(moi, await xetKhoa(moi, ops ? await opsCua(moi) : null)), thayDoi: vet };
}

async function apVaoSo(ops: any, b: any, set: Record<string, unknown>, vet: Array<{ truong: string; cu: string; moi: string }>, tongMoi: number) {
  const up: Record<string, any> = { $set: {} as Record<string, unknown> };
  const s = up.$set as Record<string, unknown>;
  if (set.dateISO) {
    const ngay = String(set.dateISO);
    s.flightDate = ngay;
    s.daySeq = await nextDaySeq(ops.spot, ngay);
    await freeDaySeq(ops.spot, ops.flightDate, ops.daySeq);
    up.$push = { rescheduledFrom: ops.flightDate };
  }
  if (set.timeSlot) s.expectedTime = String(set.timeSlot);
  if (set.guestsCount !== undefined) s.guestCount = Number(set.guestsCount);
  if (set["contact.email"] !== undefined) s.email = String(set["contact.email"]);
  if (set["contact.pickupLocation"] !== undefined) {
    const v = String(set["contact.pickupLocation"]);
    if (v) {
      s.pickup = "other";
      s.pickupNote = v;
    }
  }
  if (set.guests) {
    const names = (set.guests as any[]).map((g) => g.fullName).filter(Boolean);
    if (names.length) {
      s.contactName = names[0];
      s.otaGuests = (set.guests as any[]).map((g) => ({
        fullName: g.fullName,
        birthday: g.dob || "",
        gender: /^n[uữ]/i.test(g.gender) ? "nu" : /^nam/i.test(g.gender) ? "nam" : "",
        idNumber: g.idNumber || "",
        nationality: g.nationality || "",
      }));
    }
  }
  if (set["price.total"] !== undefined) {
    s.totalAmount = tongMoi;
    s.remaining = Math.max(0, tongMoi - (ops.deposit ?? 0) - (ops.agencyPaidAmount ?? 0));
  }
  const tomTat = vet.map((v) => `${NHAN[v.truong] ?? v.truong}: ${v.cu || "—"} → ${v.moi || "—"}`).join("; ");
  const dong = `[Khách tự sửa trên web ${new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 16).replace("T", " ")}] ${tomTat}`;
  s.note = [String(ops.note || "").trim(), dong].filter(Boolean).join("\n");
  s.webStatus = b.status;

  await BaobayBooking.updateOne({ _id: ops._id }, up);
  await BaobayBookingLog.create({
    bookingId: ops._id,
    spot: ops.spot,
    op: "api",
    action: "khach-sua-web",
    byUsername: "khach-web",
    byName: "Khách (web)",
    update: JSON.stringify(vet).slice(0, 4000),
    snap: {
      contactName: ops.contactName,
      flightDate: String(s.flightDate ?? ops.flightDate),
      daySeq: Number(s.daySeq ?? ops.daySeq),
      status: ops.status,
      guestCount: Number(s.guestCount ?? ops.guestCount),
    },
    at: new Date(),
  });
  if (s.daySeq !== undefined) {
    await pushQueueNoToWeb(String(b._id), Number(s.daySeq), String(s.flightDate)).catch(() => {});
  }
}

/* ------------------------------------------------------------------ */
/* Yêu cầu huỷ                                                         */
/* ------------------------------------------------------------------ */
export async function khachYeuCauHuy(input: { the: unknown; lyDo?: unknown }) {
  await connectDB();
  const id = docThe(input.the);
  const b = await Booking.findById(id).lean<any>();
  if (!b) throw new LoiKhachSua("Không tìm thấy booking", 404);
  const ops = await opsCua(b);
  const khoa = await xetKhoa(b, ops);
  if (khoa.khoa && !quaHan(b.dateISO || "")) throw new LoiKhachSua(khoa.lyDo, 409);
  const lyDo = cat(input.lyDo, 500);
  const at = new Date();
  await Booking.updateOne({ _id: b._id }, { $set: { yeuCauHuy: { at, lyDo } } });
  if (ops) {
    const dong = `[KHÁCH YÊU CẦU HUỶ trên web ${new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 16).replace("T", " ")}]${lyDo ? ` Lý do: ${lyDo}` : ""}`;
    await BaobayBooking.updateOne(
      { _id: ops._id },
      {
        $set: {
          note: [String(ops.note || "").trim(), dong].filter(Boolean).join("\n"),
          /** App hiện cảnh báo đỏ tới khi nhân viên Xác nhận / Từ chối. */
          yeuCauHuyWeb: { at, lyDo, xuLy: "" },
        },
      },
    );
    await BaobayBookingLog.create({
      bookingId: ops._id,
      spot: ops.spot,
      op: "api",
      action: "khach-yeu-cau-huy",
      byUsername: "khach-web",
      byName: "Khách (web)",
      update: JSON.stringify({ lyDo }),
      snap: { contactName: ops.contactName, flightDate: ops.flightDate, daySeq: ops.daySeq, status: ops.status, guestCount: ops.guestCount },
      at,
    });
  }
  const moi = await Booking.findById(b._id).lean<any>();
  void baoTin(moi, [{ truong: "huy", cu: "", moi: lyDo }], "huy");
  return { booking: xemBooking(moi, await xetKhoa(moi, ops)) };
}

/* ------------------------------------------------------------------ */
/* Báo tin                                                             */
/* ------------------------------------------------------------------ */
const escH = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const tien = (v: string) => (/^\d+$/.test(v) ? `${Number(v).toLocaleString("vi-VN")} đ` : v);

async function baoTin(b: any, vet: Array<{ truong: string; cu: string; moi: string }>, kieu: "sua" | "huy") {
  const ma = b.maBooking || maSoCu(String(b._id));
  const tieuDe = kieu === "huy" ? "🛑 <b>KHÁCH YÊU CẦU HUỶ</b> (web)" : "✏️ <b>KHÁCH TỰ SỬA BOOKING</b> (web)";
  const dong =
    kieu === "huy"
      ? [`Lý do: ${escH(vet[0]?.moi || "—")}`, "→ Quầy liên hệ khách xử lý cọc / hoàn tiền rồi huỷ trong app."]
      : vet.map((v) => `• ${NHAN[v.truong] ?? v.truong}: ${escH(v.truong === "total" ? tien(v.cu) : v.cu || "—")} → <b>${escH(v.truong === "total" ? tien(v.moi) : v.moi || "—")}</b>`);
  const text = [
    tieuDe,
    `Mã: <b>${ma}</b> · ${escH(b.locationName || b.location || "")} · ${ngayVN(b.dateISO || "")} ${escH(b.timeSlot || "")} · ${b.guestsCount} khách`,
    `SĐT: ${escH(b.contact?.phone || "")}${b.contact?.email ? ` · ${escH(b.contact.email)}` : ""}`,
    ...dong,
  ].join("\n");
  await sendTelegramToAll(text, true).catch(() => {});
  /** Telegram chập chờn (chủ 30/09) — EMAIL nhân viên là kênh chính. */
  await thuNhanVien(
    kieu === "huy" ? `🛑 KHÁCH YÊU CẦU HUỶ — ${ma} · ${b.locationName || ""} · ${ngayVN(b.dateISO || "")}` : `✏️ Khách tự sửa booking — ${ma} · ${b.locationName || ""} · ${ngayVN(b.dateISO || "")}`,
    text.split("\n").slice(1).map((l) => l.replace(/<[^>]+>/g, "")),
  );

  const to = String(b.contact?.email || "").trim();
  if (!to) return;
  try {
    const input = {
      lang: "vi",
      bookingId: ma,
      location: b.location,
      locationName: b.locationName,
      dateISO: b.dateISO,
      timeSlot: b.timeSlot,
      guestsCount: b.guestsCount,
      packageLabel: b.packageLabel,
      flightTypeLabel: b.flightTypeLabel,
      contact: b.contact,
      guests: b.guests,
      price: { total: b.price?.total },
      update:
        kieu === "huy"
          ? { changes: ["Chúng tôi đã nhận yêu cầu huỷ của bạn. Nhân viên sẽ liên hệ để xử lý cọc và hoàn tiền (nếu có)."] }
          : { changes: vet.map((v) => `${NHAN[v.truong] ?? v.truong}: ${v.truong === "total" ? tien(v.cu) : v.cu || "—"} → ${v.truong === "total" ? tien(v.moi) : v.moi || "—"}`) },
    };
    await sendSmtpMail({ to, subject: customerEmailSubject(input as any), html: customerEmailHtml(input as any) });
  } catch (e) {
    console.error("booking-khach-sua: gửi email khách lỗi", e);
  }
}
