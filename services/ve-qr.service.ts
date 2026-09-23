// services/ve-qr.service.ts
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { formatDateKeyVN, isDateKey } from "@/lib/baobay/date";
import type { BaobaySession } from "@/lib/baobay/token";
import {
  DICH_VU_VE,
  DICH_VU_VE_TAT_CA,
  KHONG_DICH_VU,
  nhanVe,
  parseVeQrText,
  TEN_DICH_VU,
  trangThaiMa,
  veQrText,
  type DichVuKhach,
  type DichVuVe,
  type TrangThaiMa, loaiVePhuCua } from "@/lib/baobay/ve-qr";
import { BaobayBooking } from "@/models/BaobayBooking.model";
import { assertBookingUnlocked, assertSpotAllowed, BaobayError, toBookingDTO } from "@/services/baobay.service";

/**
 * MÃ VÉ QR — PHI CÔNG QUÉT, CHIẾM, BAY XONG, HOÀN (chủ 17/09/2026).
 *
 * Luật (xem lib/baobay/ve-qr.ts cho phần chuỗi QR):
 *  1. Quét mã của ngày đang báo cáo mới nhận; mã ngày khác báo "mã của ngày X".
 *     Mã DỜI NGÀY (booking đã dời sang ngày đang chọn) vẫn nhận, vì booking
 *     đang đứng ở ngày ấy — QR không đổi nhưng máy chủ biết nó ở đâu.
 *  2. Mã đã bị phi công khác chiếm → báo tên người ấy, không cho chiếm đè.
 *  3. Quét lại mã mình đã chiếm → bỏ qua êm (quét hàng loạt cuối ngày để soát).
 *  4. Phi công chỉ HOÀN mã của chính mình (mã trắng lại, người khác quét được);
 *     THU HỒI mã của người khác là việc của điều phối / quản trị.
 *  5. Hoàn DỊCH VỤ LẺ (360 / flycam / cờ đỏ không hoàn thành) — vẫn giữ chuyến.
 *  6. Điều phối huỷ / dời booking → mã bị thu hồi tự động (xem updateBookingStatus).
 */

export type MaVeDTO = {
  bookingId: string;
  nhan: string;
  qrText: string;
  /** Ngày cấp (trong QR) và ngày bay HIỆN TẠI của booking. */
  ngayCap: string;
  flightDate: string;
  daDoi: boolean;
  guestNo: number;
  guestCount: number;
  tenKhach: string;
  tenLienHe: string;
  bookingCode: string;
  dichVu: DichVuKhach;
  hoanDichVu: Partial<DichVuKhach>;
  /** Dịch vụ CÒN tính cho phi công = dịch vụ gắn − dịch vụ đã hoàn. */
  dichVuTinh: DichVuKhach;
  phiCong: { username: string; name: string; luc: string } | null;
  bayXong: string | null;
  trangThai: TrangThaiMa;
  bookingStatus: string;
  /** Khách bay PG trong đoàn gộp: vé giấy viết tay, không có mã QR (chủ 23/09). */
  veGiay: boolean;
  /** Vé bị THU HỒI HẲN (chủ 22/09) — null nếu còn hiệu lực. */
  huy: {
    luc: string;
    boi: string;
    ly: string;
    phiCong?: string;
    phiCongTen?: string;
    /** Thu hồi khi phi công ĐÃ báo bay xong → xung đột, cần hai bên xác minh. */
    daBayXong?: boolean;
    xacMinh?: { boi: string; luc: string; ket: string } | null;
  } | null;
};

export type ThuHoiDTO = {
  bookingId: string;
  nhan: string;
  qrText: string;
  ngayCap: string;
  flightDate: string;
  tenKhach: string;
  ly: "huy" | "doi" | "tay";
  luc: string;
  boi: string;
  daBayXong: boolean;
  dichVu: DichVuKhach;
  guestNo: number;
};

export type TongHopVe = {
  chuyen: number;
  bayXong: number;
  dangGiu: number;
  video360: number;
  flycam: number;
  redFlag: number;
};

/** Kết quả một lần quét — `daQuet` = mình đã chiếm từ trước (quét lại để soát). */
export type KetQuaQuet = { ma: MaVeDTO; daQuet: boolean };

const ten = (s: BaobaySession) => s.name || s.username;

/** Tên khách thứ n — OTA có tên từng người thì đúng người; không thì tên liên hệ (giống vé in). */
function tenKhach(doc: any, guestNo: number): string {
  /** SỔ BẢO HIỂM trước (chủ 21/09) — đã khai đủ tên từng người thì mã #16.2 phải ra đúng người thứ hai, không phải tên booking. */
  const bh = (doc.insured ?? []).filter((g: any) => !g?.cancelled).map((g: any) => String(g?.fullName ?? "").trim()).filter(Boolean);
  if (bh.length >= guestNo) return bh[guestNo - 1];
  const ds = (doc.otaGuests ?? []).map((g: any) => String(g?.fullName ?? "").trim()).filter(Boolean);
  if (ds.length >= guestNo) return ds[guestNo - 1];
  return String(doc.contactName || "Khách");
}

function dv(x: any): DichVuKhach {
  return {
    video360: Boolean(x?.video360),
    flycam: Boolean(x?.flycam),
    redFlag: Boolean(x?.redFlag),
    sunset: Boolean(x?.sunset),
    flagFlight: Boolean(x?.flagFlight),
  };
}

/** Mã chống sao chép đã cấp cho khách thứ n (ticketSecurity) — rỗng nếu chưa in lần nào. */
function maChongGiaCua(doc: any, guestNo: number): string {
  const d = (doc?.ticketSecurity ?? []).find((x: any) => Number(x?.guestNo) === guestNo);
  return String(d?.code ?? "").trim().toUpperCase();
}

export function maVeDTO(doc: any, k: any): MaVeDTO {
  const v = doc.veQr;
  const dichVu = dv(k.dichVu);
  const hoan: Partial<DichVuKhach> = k.hoanDichVu ? dv(k.hoanDichVu) : {};
  const tinh: DichVuKhach = { ...KHONG_DICH_VU };
  for (const x of DICH_VU_VE_TAT_CA) tinh[x] = Boolean(dichVu[x] && !hoan[x]);
  const guestCount = Math.max(1, Number(doc.guestCount) || 1);
  const huy = k.huy?.luc
    ? {
        luc: new Date(k.huy.luc).toISOString(),
        boi: String(k.huy.boi ?? ""),
        ly: String(k.huy.ly ?? ""),
        phiCong: k.huy.phiCong ? String(k.huy.phiCong) : undefined,
        phiCongTen: k.huy.phiCongTen ? String(k.huy.phiCongTen) : undefined,
        daBayXong: Boolean(k.huy.daBayXong),
        xacMinh: k.huy.xacMinh?.luc
          ? { boi: String(k.huy.xacMinh.boi ?? ""), luc: new Date(k.huy.xacMinh.luc).toISOString(), ket: String(k.huy.xacMinh.ket ?? "") }
          : null,
      }
    : null;
  return {
    bookingId: String(doc._id),
    huy,
    veGiay: Boolean(k.veGiay),
    nhan: nhanVe(Number(v.so), Number(k.guestNo), guestCount),
    qrText: veQrText(String(doc.spot), String(v.ngay), Number(v.so), Number(k.guestNo), maChongGiaCua(doc, Number(k.guestNo))),
    ngayCap: String(v.ngay),
    flightDate: String(doc.flightDate),
    daDoi: String(v.ngay) !== String(doc.flightDate),
    guestNo: Number(k.guestNo),
    guestCount,
    tenKhach: tenKhach(doc, Number(k.guestNo)),
    tenLienHe: String(doc.contactName ?? ""),
    bookingCode: String(doc.bookingCode ?? ""),
    dichVu,
    hoanDichVu: hoan,
    dichVuTinh: tinh,
    phiCong: k.phiCong?.username ? { username: String(k.phiCong.username), name: String(k.phiCong.name ?? ""), luc: k.phiCong.luc ? new Date(k.phiCong.luc).toISOString() : "" } : null,
    bayXong: k.bayXong?.luc ? new Date(k.bayXong.luc).toISOString() : null,
    trangThai: trangThaiMa({ phiCong: k.phiCong?.username ? k.phiCong : null, bayXong: k.bayXong?.luc ? k.bayXong : null }),
    bookingStatus: String(doc.status ?? "open"),
  };
}

async function timBooking(spot: string, ngay: string, so: number) {
  return BaobayBooking.findOne({ spot, "veQr.ngay": ngay, "veQr.so": so, status: { $ne: "voided" } }).lean<any>();
}

function khachCua(doc: any, guestNo: number) {
  return (doc.veQr?.khach ?? []).find((k: any) => Number(k.guestNo) === guestNo);
}

/* ------------------------------------------------------------------ */
/* QUÉT                                                                */
/* ------------------------------------------------------------------ */

export async function quetVe(session: BaobaySession, spotRaw: string, input: { text: string; date: string }): Promise<KetQuaQuet> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  const date = String(input.date ?? "");
  if (!isDateKey(date)) throw new BaobayError("Chọn ngày bay trước khi quét", 400);
  const ma = parseVeQrText(input.text, date);
  if (!ma) {
    /** Vé phụ Khau Phạ (đồ uống / xe ôm) có QR riêng — nói rõ để người quét tìm đúng VÉ BAY DÙ. */
    const phu = loaiVePhuCua(input.text);
    if (phu) throw new BaobayError(`Đây là ${phu === "nuoc" ? "VÉ ĐỒ UỐNG" : "VÉ XE ÔM"} của khách, không phải vé bay — quét mã trên VÉ BAY DÙ`, 400);
    throw new BaobayError("Không phải mã vé của hệ thống (cần dạng “22/12/2026 #3.2”)", 400);
  }
  if (ma.spot && ma.spot !== spot) throw new BaobayError(`Mã này của điểm ${ma.spot}, không phải ${spot}`, 400);

  const doc = await timBooking(spot, ma.ngay, ma.so);
  if (!doc) throw new BaobayError(`Không có vé ${formatDateKeyVN(ma.ngay)} #${ma.so} trong sổ — vé chép hoặc chưa cấp mã`, 404);
  const k = khachCua(doc, ma.guestNo);
  if (!k) throw new BaobayError(`Booking #${ma.so} ngày ${formatDateKeyVN(ma.ngay)} không có khách thứ ${ma.guestNo}`, 404);
  /** MÃ CHỐNG GIẢ ở đuôi QR phải khớp mã đã cấp cho đúng khách ấy (chủ 18/09). */
  const maSo = maChongGiaCua(doc, ma.guestNo);
  if (ma.ma && maSo && ma.ma !== maSo) {
    throw new BaobayError(`Mã chống giả trên vé (${ma.ma}) KHÔNG KHỚP sổ (${maSo}) — vé chép hoặc vé tự in, không bay`, 409);
  }

  if (doc.status === "cancelled") {
    throw new BaobayError(`Mã ${formatDateKeyVN(ma.ngay)} #${ma.so}.${ma.guestNo} đã bị HUỶ (booking huỷ${doc.cancelledBy ? ` bởi ${doc.cancelledBy}` : ""}) — không bay`, 409);
  }
  /** VÉ GIẤY VIẾT TAY (đoàn gộp, khách PG) — không có mã QR nên không quét được. */
  if (k.veGiay) {
    throw new BaobayError(`Khách ${ma.guestNo} của booking này bay PG, nhận vé giấy viết tay — không có vé QR`, 409);
  }
  /** VÉ BỊ THU HỒI HẲN (chủ 22/09) — không ai quét được nữa, kể cả phi công khác. */
  if (k.huy?.luc) {
    const luc = new Date(k.huy.luc).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
    throw new BaobayError(`Vé ${formatDateKeyVN(ma.ngay)} #${ma.so}.${ma.guestNo} ĐÃ BỊ THU HỒI (${k.huy.boi || "quầy vé"}, ${luc}${k.huy.ly ? ` — ${k.huy.ly}` : ""}) — không bay`, 409);
  }
  if (String(doc.flightDate) !== date) {
    if (String(doc.veQr.ngay) === date) {
      throw new BaobayError(`Mã này đã DỜI sang ngày ${formatDateKeyVN(doc.flightDate)} — quét khi báo cáo ngày đó`, 409);
    }
    throw new BaobayError(
      `Mã này của ngày ${formatDateKeyVN(doc.flightDate)}${String(doc.veQr.ngay) !== String(doc.flightDate) ? ` (cấp ngày ${formatDateKeyVN(doc.veQr.ngay)})` : ""}, không phải ngày ${formatDateKeyVN(date)} đang báo cáo`,
      409,
    );
  }
  if (k.phiCong?.username) {
    if (k.phiCong.username === session.username) return { ma: maVeDTO(doc, k), daQuet: true };
    const luc = k.phiCong.luc ? new Date(k.phiCong.luc).toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" }) : "";
    throw new BaobayError(`Phi công ${k.phiCong.name || k.phiCong.username} đã quét mã này${luc ? ` lúc ${luc}` : ""}`, 409);
  }

  await assertBookingUnlocked(spot, String(doc._id), session);
  const luc = new Date();
  const updated = await BaobayBooking.findOneAndUpdate(
    {
      _id: doc._id,
      spot,
      status: { $in: ["open", "done"] },
      "veQr.khach": { $elemMatch: { guestNo: ma.guestNo, $or: [{ phiCong: null }, { "phiCong.username": { $exists: false } }] } },
    },
    {
      $set: {
        "veQr.khach.$.phiCong": { username: session.username, name: ten(session), luc },
        "veQr.khach.$.thuHoi": null,
      },
      $push: { "veQr.khach.$.lichSu": { luc, boi: ten(session), viec: "chiem" } },
    },
    { new: true },
  ).lean<any>();
  if (!updated) throw new BaobayError("Mã vừa được người khác quét — tải lại danh sách", 409);
  return { ma: maVeDTO(updated, khachCua(updated, ma.guestNo)), daQuet: false };
}

/* ------------------------------------------------------------------ */
/* BAY XONG · HOÀN MÃ · HOÀN DỊCH VỤ · THU HỒI                          */
/* ------------------------------------------------------------------ */

async function layCuaToi(session: BaobaySession, spotRaw: string, bookingId: string, guestNo: number) {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  if (!mongoose.Types.ObjectId.isValid(bookingId)) throw new BaobayError("Booking không hợp lệ", 400);
  const doc = await BaobayBooking.findOne({ _id: bookingId, spot }).lean<any>();
  if (!doc?.veQr) throw new BaobayError("Booking này chưa cấp mã vé QR", 404);
  const k = khachCua(doc, guestNo);
  if (!k) throw new BaobayError("Không có khách này trên booking", 404);
  if (k.phiCong?.username !== session.username) {
    throw new BaobayError(k.phiCong?.username ? `Mã này do phi công ${k.phiCong.name || k.phiCong.username} giữ, không phải của anh/chị` : "Mã này chưa ai quét", 403);
  }
  await assertBookingUnlocked(spot, bookingId, session);
  return { spot, doc, k };
}

export async function bayXong(session: BaobaySession, spotRaw: string, bookingId: string, guestNo: number): Promise<MaVeDTO> {
  const { spot, doc, k } = await layCuaToi(session, spotRaw, bookingId, guestNo);
  if (k.bayXong?.luc) return maVeDTO(doc, k);
  const luc = new Date();
  const updated = await BaobayBooking.findOneAndUpdate(
    { _id: doc._id, spot, "veQr.khach": { $elemMatch: { guestNo, "phiCong.username": session.username } } },
    { $set: { "veQr.khach.$.bayXong": { luc } }, $push: { "veQr.khach.$.lichSu": { luc, boi: ten(session), viec: "bay-xong" } } },
    { new: true },
  ).lean<any>();
  if (!updated) throw new BaobayError("Mã vừa bị thay đổi — tải lại", 409);
  return maVeDTO(updated, khachCua(updated, guestNo));
}

/** Bỏ tích bay xong (bấm nhầm) — vẫn giữ mã. */
export async function boBayXong(session: BaobaySession, spotRaw: string, bookingId: string, guestNo: number): Promise<MaVeDTO> {
  const { spot, doc } = await layCuaToi(session, spotRaw, bookingId, guestNo);
  const luc = new Date();
  const updated = await BaobayBooking.findOneAndUpdate(
    { _id: doc._id, spot, "veQr.khach": { $elemMatch: { guestNo, "phiCong.username": session.username } } },
    { $set: { "veQr.khach.$.bayXong": null }, $push: { "veQr.khach.$.lichSu": { luc, boi: ten(session), viec: "bo-bay-xong" } } },
    { new: true },
  ).lean<any>();
  if (!updated) throw new BaobayError("Mã vừa bị thay đổi — tải lại", 409);
  return maVeDTO(updated, khachCua(updated, guestNo));
}

/** HOÀN MÃ: không phục vụ được khách này — mã trắng lại cho phi công khác quét. */
export async function hoanMa(session: BaobaySession, spotRaw: string, bookingId: string, guestNo: number, lyDo = ""): Promise<MaVeDTO> {
  const { spot, doc } = await layCuaToi(session, spotRaw, bookingId, guestNo);
  const luc = new Date();
  const updated = await BaobayBooking.findOneAndUpdate(
    { _id: doc._id, spot, "veQr.khach": { $elemMatch: { guestNo, "phiCong.username": session.username } } },
    {
      $set: { "veQr.khach.$.phiCong": null, "veQr.khach.$.bayXong": null, "veQr.khach.$.hoanDichVu": {} },
      $push: { "veQr.khach.$.lichSu": { luc, boi: ten(session), viec: "hoan", ghiChu: lyDo.trim() || undefined } },
    },
    { new: true },
  ).lean<any>();
  if (!updated) throw new BaobayError("Mã vừa bị thay đổi — tải lại", 409);
  return maVeDTO(updated, khachCua(updated, guestNo));
}

/** HOÀN DỊCH VỤ LẺ (360 / flycam / cờ đỏ không hoàn thành) — chuyến vẫn tính; bấm lại để lấy lại. */
export async function hoanDichVu(session: BaobaySession, spotRaw: string, bookingId: string, guestNo: number, dichVu: DichVuVe, lyDo = ""): Promise<MaVeDTO> {
  if (!DICH_VU_VE.includes(dichVu)) throw new BaobayError("Dịch vụ không hợp lệ", 400);
  const { spot, doc, k } = await layCuaToi(session, spotRaw, bookingId, guestNo);
  if (!k.dichVu?.[dichVu]) throw new BaobayError(`Khách này không có ${TEN_DICH_VU[dichVu]} trên vé`, 400);
  const dang = Boolean(k.hoanDichVu?.[dichVu]);
  const luc = new Date();
  const updated = await BaobayBooking.findOneAndUpdate(
    { _id: doc._id, spot, "veQr.khach": { $elemMatch: { guestNo, "phiCong.username": session.username } } },
    {
      $set: { [`veQr.khach.$.hoanDichVu.${dichVu}`]: !dang },
      $push: { "veQr.khach.$.lichSu": { luc, boi: ten(session), viec: dang ? `lay-lai-${dichVu}` : `hoan-${dichVu}`, ghiChu: lyDo.trim() || undefined } },
    },
    { new: true },
  ).lean<any>();
  if (!updated) throw new BaobayError("Mã vừa bị thay đổi — tải lại", 409);
  return maVeDTO(updated, khachCua(updated, guestNo));
}

/** THU HỒI TAY — điều phối / quầy / quản trị lấy mã khỏi phi công đang giữ (phi công thấy cảnh báo). */
export async function thuHoiMa(session: BaobaySession, spotRaw: string, bookingId: string, guestNo: number, lyDo = ""): Promise<MaVeDTO> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  if (!mongoose.Types.ObjectId.isValid(bookingId)) throw new BaobayError("Booking không hợp lệ", 400);
  const doc = await BaobayBooking.findOne({ _id: bookingId, spot }).lean<any>();
  const k = doc ? khachCua(doc, guestNo) : null;
  if (!doc?.veQr || !k) throw new BaobayError("Không có mã này", 404);
  if (!k.phiCong?.username) throw new BaobayError("Mã đang trống, không có gì để thu hồi", 400);
  await assertBookingUnlocked(spot, bookingId, session);
  const luc = new Date();
  const updated = await BaobayBooking.findOneAndUpdate(
    { _id: doc._id, spot, "veQr.khach": { $elemMatch: { guestNo, "phiCong.username": k.phiCong.username } } },
    {
      $set: {
        "veQr.khach.$.phiCong": null,
        "veQr.khach.$.bayXong": null,
        "veQr.khach.$.hoanDichVu": {},
        "veQr.khach.$.thuHoi": { ly: "tay", luc, phiCong: k.phiCong.username, phiCongTen: k.phiCong.name ?? "", boi: ten(session), daXem: false, daBayXong: Boolean(k.bayXong?.luc), dichVu: dv(k.dichVu) },
      },
      $push: { "veQr.khach.$.lichSu": { luc, boi: ten(session), viec: "thu-hoi-tay", ghiChu: lyDo.trim() || undefined } },
    },
    { new: true },
  ).lean<any>();
  if (!updated) throw new BaobayError("Mã vừa bị thay đổi — tải lại", 409);
  return maVeDTO(updated, khachCua(updated, guestNo));
}

/**
 * THU HỒI HẲN MỘT VÉ QR (chủ 22/09) — quầy vé / điều phối bấm, từng khách một
 * (cùng booking có người bay được người không). Vé thành vô hiệu: không ai quét
 * được nữa, mọi bảng đếm bỏ qua. Phi công đang giữ vé thì bị rút, và nếu người
 * ấy ĐÃ báo bay xong thì ghi cờ XUNG ĐỘT để hai bên xác minh.
 */
export async function huyVe(session: BaobaySession, spotRaw: string, bookingId: string, guestNo: number, lyDo = ""): Promise<MaVeDTO> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  if (!mongoose.Types.ObjectId.isValid(bookingId)) throw new BaobayError("Booking không hợp lệ", 400);
  const doc = await BaobayBooking.findOne({ _id: bookingId, spot }).lean<any>();
  const k = doc ? khachCua(doc, guestNo) : null;
  if (!doc?.veQr || !k) throw new BaobayError("Không có mã này", 404);
  if (k.huy?.luc) throw new BaobayError("Vé này đã bị thu hồi trước đó", 400);
  await assertBookingUnlocked(spot, bookingId, session);
  const luc = new Date();
  const daBayXong = Boolean(k.bayXong?.luc);
  const huy = {
    luc,
    boi: ten(session),
    ly: lyDo.trim(),
    phiCong: k.phiCong?.username ?? "",
    phiCongTen: k.phiCong?.name ?? "",
    daBayXong,
    xacMinh: null,
  };
  const updated = await BaobayBooking.findOneAndUpdate(
    { _id: doc._id, spot, "veQr.khach": { $elemMatch: { guestNo, huy: null } } },
    {
      $set: {
        "veQr.khach.$.huy": huy,
        "veQr.khach.$.phiCong": null,
        "veQr.khach.$.bayXong": null,
        /** Phi công đang giữ vé phải được báo — dùng chung dải cảnh báo "thu hồi" sẵn có. */
        ...(k.phiCong?.username
          ? {
              "veQr.khach.$.thuHoi": {
                ly: "tay",
                luc,
                phiCong: k.phiCong.username,
                phiCongTen: k.phiCong.name ?? "",
                boi: ten(session),
                daXem: false,
                daBayXong,
                dichVu: dv(k.dichVu),
              },
            }
          : {}),
      },
      $push: { "veQr.khach.$.lichSu": { luc, boi: ten(session), viec: "thu-hoi-ve", ghiChu: lyDo.trim() || undefined } },
    },
    { new: true },
  ).lean<any>();
  if (!updated) throw new BaobayError("Vé vừa bị thay đổi — tải lại", 409);
  return maVeDTO(updated, khachCua(updated, guestNo));
}

/**
 * CẤP LẠI VÉ ĐÃ THU HỒI (chủ 23/09: "thu hồi thì có thể cấp lại chứ nhỉ? nhưng
 * cấp lại thì phi công phải quét lại"). Vé trở lại TRỐNG — cùng mã cũ, cùng mã
 * chống giả, nhưng không còn phi công nào giữ nên ai bay khách ấy phải quét
 * lại từ đầu. Dấu vết thu hồi giữ nguyên trong lịch sử.
 */
export async function capLaiVe(session: BaobaySession, spotRaw: string, bookingId: string, guestNo: number, lyDo = ""): Promise<MaVeDTO> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  if (!mongoose.Types.ObjectId.isValid(bookingId)) throw new BaobayError("Booking không hợp lệ", 400);
  const doc = await BaobayBooking.findOne({ _id: bookingId, spot }).lean<any>();
  const k = doc ? khachCua(doc, guestNo) : null;
  if (!doc?.veQr || !k) throw new BaobayError("Không có mã này", 404);
  if (!k.huy?.luc) throw new BaobayError("Vé này đang dùng bình thường, không cần cấp lại", 400);
  if (doc.status === "cancelled") throw new BaobayError("Booking đã huỷ — không cấp lại vé được", 409);
  await assertBookingUnlocked(spot, bookingId, session);
  const luc = new Date();
  const updated = await BaobayBooking.findOneAndUpdate(
    { _id: doc._id, spot, "veQr.khach": { $elemMatch: { guestNo, "huy.luc": { $ne: null } } } },
    {
      $set: {
        "veQr.khach.$.huy": null,
        "veQr.khach.$.phiCong": null,
        "veQr.khach.$.bayXong": null,
        "veQr.khach.$.thuHoi": null,
        "veQr.khach.$.veGiay": false,
      },
      $push: { "veQr.khach.$.lichSu": { luc, boi: ten(session), viec: "cap-lai", ghiChu: lyDo.trim() || undefined } },
    },
    { new: true },
  ).lean<any>();
  if (!updated) throw new BaobayError("Vé vừa bị thay đổi — tải lại", 409);
  return maVeDTO(updated, khachCua(updated, guestNo));
}

/** Hai bên chốt lại vụ XUNG ĐỘT (vé thu hồi sau khi phi công đã báo bay xong). */
export async function xacMinhHuyVe(session: BaobaySession, spotRaw: string, bookingId: string, guestNo: number, ket: string): Promise<MaVeDTO> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  if (!mongoose.Types.ObjectId.isValid(bookingId)) throw new BaobayError("Booking không hợp lệ", 400);
  const luc = new Date();
  const updated = await BaobayBooking.findOneAndUpdate(
    { _id: bookingId, spot, "veQr.khach": { $elemMatch: { guestNo, "huy.luc": { $ne: null } } } },
    {
      $set: { "veQr.khach.$.huy.xacMinh": { boi: ten(session), luc, ket: String(ket ?? "").trim() } },
      $push: { "veQr.khach.$.lichSu": { luc, boi: ten(session), viec: "xac-minh-thu-hoi", ghiChu: String(ket ?? "").trim() || undefined } },
    },
    { new: true },
  ).lean<any>();
  if (!updated) throw new BaobayError("Vé này chưa bị thu hồi hoặc vừa thay đổi", 409);
  return maVeDTO(updated, khachCua(updated, guestNo));
}

/** Phi công bấm "đã xem" cảnh báo thu hồi. */
export async function daXemThuHoi(session: BaobaySession, spotRaw: string, bookingId: string, guestNo: number): Promise<void> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  if (!mongoose.Types.ObjectId.isValid(bookingId)) throw new BaobayError("Booking không hợp lệ", 400);
  await BaobayBooking.updateOne(
    { _id: bookingId, spot, "veQr.khach": { $elemMatch: { guestNo, "thuHoi.phiCong": session.username } } },
    { $set: { "veQr.khach.$.thuHoi.daXem": true } },
  );
}

/* ------------------------------------------------------------------ */
/* DANH SÁCH CỦA PHI CÔNG                                              */
/* ------------------------------------------------------------------ */

export function tongHop(ma: MaVeDTO[]): TongHopVe {
  const t: TongHopVe = { chuyen: 0, bayXong: 0, dangGiu: 0, video360: 0, flycam: 0, redFlag: 0 };
  for (const m of ma) {
    t.chuyen++;
    if (m.bayXong) t.bayXong++;
    else t.dangGiu++;
    for (const x of DICH_VU_VE) if (m.dichVuTinh[x]) t[x]++;
  }
  return t;
}

/**
 * Mã tôi đang giữ / đã bay trong NGÀY, cảnh báo thu hồi chưa xem (mọi ngày),
 * và tổng hợp để điền báo cáo. `tatCa` (điều phối) = mọi mã của ngày, ai giữ cũng liệt kê.
 */
export async function veCuaToi(
  session: BaobaySession,
  spotRaw: string,
  date: string,
  tatCa = false,
): Promise<{ ma: MaVeDTO[]; thuHoi: ThuHoiDTO[]; tongHop: TongHopVe; date: string }> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  if (!isDateKey(date)) throw new BaobayError("Ngày không hợp lệ", 400);
  const me = session.username;
  const docs = await BaobayBooking.find({
    spot,
    status: { $ne: "voided" },
    "veQr.ngay": { $exists: true },
    $or: [{ flightDate: date }, { "veQr.khach.thuHoi.phiCong": me }],
  }).lean<any[]>();

  const ma: MaVeDTO[] = [];
  const thuHoi: ThuHoiDTO[] = [];
  for (const doc of docs) {
    for (const k of doc.veQr?.khach ?? []) {
      if (String(doc.flightDate) === date && doc.status !== "cancelled" && !k.huy?.luc && !k.veGiay && (tatCa ? true : k.phiCong?.username === me)) ma.push(maVeDTO(doc, k));
      if (k.thuHoi?.luc && k.thuHoi.phiCong === me && !k.thuHoi.daXem) {
        thuHoi.push({
          bookingId: String(doc._id),
          nhan: nhanVe(Number(doc.veQr.so), Number(k.guestNo), Math.max(1, Number(doc.guestCount) || 1)),
          qrText: veQrText(spot, String(doc.veQr.ngay), Number(doc.veQr.so), Number(k.guestNo), maChongGiaCua(doc, Number(k.guestNo))),
          ngayCap: String(doc.veQr.ngay),
          flightDate: String(doc.flightDate),
          tenKhach: tenKhach(doc, Number(k.guestNo)),
          ly: k.thuHoi.ly,
          luc: new Date(k.thuHoi.luc).toISOString(),
          boi: String(k.thuHoi.boi ?? ""),
          daBayXong: Boolean(k.thuHoi.daBayXong),
          dichVu: dv(k.thuHoi.dichVu),
          guestNo: Number(k.guestNo),
        });
      }
    }
  }
  ma.sort((a, b) => a.ngayCap.localeCompare(b.ngayCap) || Number(a.nhan.replace(/[^\d.]/g, "").split(".")[0]) - Number(b.nhan.replace(/[^\d.]/g, "").split(".")[0]) || a.guestNo - b.guestNo);
  return { ma, thuHoi, tongHop: tongHop(tatCa ? ma.filter((m) => m.phiCong?.username === me) : ma), date };
}

/** Điều phối sửa dịch vụ trên vé sau khi đã cấp mã (khách chưa bay xong). */
export async function suaDichVuVe(
  session: BaobaySession,
  spotRaw: string,
  bookingId: string,
  dichVu: Array<{ guestNo: number; video360?: boolean; flycam?: boolean; redFlag?: boolean; sunset?: boolean; flagFlight?: boolean }>,
  /**
   * ĐỔI LẠI AI BAY PPG (chủ 23/09) — danh sách khách nhận VÉ QR. Chỉ đổi được
   * vé CHƯA ai quét và chưa bị thu hồi; vé đang có phi công giữ thì giữ nguyên
   * (muốn đổi phải thu hồi trước).
   */
  guestNos?: number[],
) {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  if (!mongoose.Types.ObjectId.isValid(bookingId)) throw new BaobayError("Booking không hợp lệ", 400);
  await assertBookingUnlocked(spot, bookingId, session);
  const doc = await BaobayBooking.findOne({ _id: bookingId, spot }).lean<any>();
  if (!doc?.veQr) throw new BaobayError("Booking này chưa cấp mã vé QR — bấm IN VÉ trước", 404);
  const luc = new Date();
  const doiVeQr = Array.isArray(guestNos) && guestNos.length > 0;
  const nosQr = new Set((guestNos ?? []).map((x) => Number(x)));
  const khach = (doc.veQr.khach ?? []).map((k: any) => {
    let ra = k;
    /** Đổi PG ↔ PPG: chỉ vé còn trống (chưa quét, chưa bay, chưa thu hồi). */
    if (doiVeQr && !k.phiCong?.username && !k.bayXong?.luc && !k.huy?.luc) {
      const veGiayMoi = !nosQr.has(Number(k.guestNo));
      if (Boolean(k.veGiay) !== veGiayMoi) {
        ra = {
          ...ra,
          veGiay: veGiayMoi,
          lichSu: [...(ra.lichSu ?? []), { luc, boi: ten(session), viec: veGiayMoi ? "doi-ve-giay" : "doi-ve-qr" }],
        };
      }
    }
    const x = dichVu.find((d) => Number(d.guestNo) === Number(ra.guestNo));
    if (!x || ra.bayXong?.luc) return ra;
    const moi = {
      video360: Boolean(x.video360),
      flycam: Boolean(x.flycam),
      redFlag: Boolean(x.redFlag),
      sunset: Boolean(x.sunset),
      flagFlight: Boolean(x.flagFlight),
    };
    if (DICH_VU_VE_TAT_CA.every((t) => Boolean(ra.dichVu?.[t]) === Boolean(moi[t]))) return ra;
    return { ...ra, dichVu: moi, lichSu: [...(ra.lichSu ?? []), { luc, boi: ten(session), viec: "sua-dv" }] };
  });
  const updated = await BaobayBooking.findOneAndUpdate({ _id: bookingId, spot }, { $set: { "veQr.khach": khach } }, { new: true }).lean<any>();
  return { booking: toBookingDTO(updated) };
}
