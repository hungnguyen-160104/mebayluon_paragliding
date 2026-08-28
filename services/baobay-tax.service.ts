// services/baobay-tax.service.ts
/**
 * KẾ TOÁN THUẾ — nhặt booking để xuất hoá đơn VAT.
 *
 * Việc hằng ngày của kế toán thuế: mở danh sách booking theo khoảng ngày, nhặt
 * những khách CẦN xuất hoá đơn (không phải 100%), soát/sửa thông tin trên từng
 * hồ sơ (tên, CCCD/hộ chiếu, công ty, mã số thuế…), rồi bấm xuất MỘT file
 * Excel đúng dạng cột mà phần mềm thuế nhận — dán vào là xong.
 *
 * BẢO MẬT: mọi hàm ở đây chỉ chạy sau cửa vai trò "tax" (xem
 * app/api/baocao/thue/route.ts). Kế toán TỔNG HỢP không có cửa nào tới dữ
 * liệu này — lý do tách vai ghi ở lib/baobay/roles.ts, lý do tách bảng ghi ở
 * models/BaobayTaxRecord.model.ts.
 */
import { depositDayOf, formatDateKeyVN, isDateKey, toDateKeyVN } from "@/lib/baobay/date";
import { SPOT_IDS, spotName } from "@/lib/baobay/spots";
import type { BaobaySession } from "@/lib/baobay/token";
import { buildXlsx } from "@/lib/baobay/xlsx";
import { connectDB } from "@/lib/mongodb";
import { BaobayBooking } from "@/models/BaobayBooking.model";
import { BaobayTaxRecord } from "@/models/BaobayTaxRecord.model";
import { BaobayError } from "@/services/baobay.service";

/* ------------------------------------------------------------------ */
/* Kiểu dữ liệu trả cho trang                                          */
/* ------------------------------------------------------------------ */

/** Hồ sơ thuế của một booking — đúng các cột của bảng xuất. */
export type TaxRecordDTO = {
  collectDate: string;
  flightDate: string;
  cancelDate: string;
  customerName: string;
  companyName: string;
  taxCode: string;
  address: string;
  payMethod: string;
  guests: number;
  /** Tiền ĐÃ THU (gộp, có thuế). */
  amount: number;
  /** Thuế suất VAT (%): 8 · 10 · 0. */
  vatRate: number;
  currency: string;
  idNumber: string;
  passportNo: string;
  bookingCode: string;
  agency: string;
  note: string;
  pickedBy: string;
  /** ISO lần xuất file gần nhất — trống là chưa vào file nào. */
  exportedAt: string;
};

/** Một booking trong danh sách soát của kế toán thuế. */
export type TaxCandidateDTO = {
  bookingId: string;
  spot: string;
  spotLabel: string;
  flightDate: string;
  daySeq: number;
  contactName: string;
  phone: string;
  bookingCode: string;
  source: string;
  guestCount: number;
  totalAmount: number;
  deposit: number;
  status: string;
  /** Đã có hồ sơ thuế chưa — có là "đã nhặt". */
  picked: boolean;
  record: TaxRecordDTO | null;
  /** Bản MÁY GỢI Ý điền sẵn khi bấm nhặt — từ sổ vận hành + hồ sơ bảo hiểm. */
  suggest: TaxRecordDTO;
};

/* ------------------------------------------------------------------ */
/* Gợi ý điền sẵn                                                      */
/* ------------------------------------------------------------------ */

/**
 * "TM" / "CK" / "TM/CK" từ đường tiền thật của booking: cọc gõ tay
 * (depositMethod) + từng lệnh thu (collectedLog). Không đoán được thì để trống
 * cho kế toán tự chọn — điền bừa "TM" lên hoá đơn thuế còn tệ hơn bỏ trống.
 */
function payMethodOf(b: {
  depositMethod?: string;
  collectedLog?: Array<{ method?: string }>;
}): string {
  const ways = new Set<string>();
  if (b.depositMethod === "cash") ways.add("TM");
  if (b.depositMethod === "transfer") ways.add("CK");
  for (const c of b.collectedLog ?? []) {
    if (c.method === "cash") ways.add("TM");
    if (c.method === "transfer") ways.add("CK");
  }
  if (ways.size === 2) return "TM/CK";
  return [...ways][0] ?? "";
}

/**
 * Dựng bản GỢI Ý từ sổ vận hành. Hồ sơ bảo hiểm là nguồn quý nhất: nó có họ
 * tên khai đúng giấy tờ, số CCCD/hộ chiếu và quốc tịch — đúng những thứ hoá
 * đơn cần mà booking không có.
 */
function suggestOf(b: any): TaxRecordDTO {
  /** Người ĐẠI DIỆN đoàn: khách còn bay đầu tiên trong hồ sơ bảo hiểm. */
  const nguoiDaiDien = (b.insured ?? []).find((g: any) => !g?.cancelled && g?.fullName);

  const laHoChieu = nguoiDaiDien?.idType === "passport";
  const quocTich = String(nguoiDaiDien?.nationality ?? "").trim();
  /** Khách ngoại: cột địa chỉ trên bảng thuế ghi tên nước (đúng mẫu kế toán đưa). */
  const nuocNgoai = laHoChieu || (quocTich && !/^(viet\s?nam|vn)$/i.test(quocTich));

  /** Ngày thu tiền: lần thu CUỐI (khách trả nốt), không có lệnh thu thì ngày cọc. */
  const lanThuCuoi = [...(b.collectedLog ?? [])]
    .filter((c: any) => c?.at)
    .sort((x: any, y: any) => new Date(x.at).getTime() - new Date(y.at).getTime())
    .pop();
  const ngayThu = lanThuCuoi?.at
    ? toDateKeyVN(new Date(lanThuCuoi.at))
    : (b.deposit ?? 0) > 0
      ? depositDayOf(b)
      : "";

  return {
    collectDate: ngayThu,
    flightDate: b.flightDate || "",
    cancelDate: b.status === "cancelled" && b.cancelledAt ? toDateKeyVN(new Date(b.cancelledAt)) : "",
    customerName: String(nguoiDaiDien?.fullName || b.contactName || "").trim(),
    companyName: "",
    taxCode: "",
    address: nuocNgoai && quocTich ? quocTich.toUpperCase() : "",
    payMethod: payMethodOf(b),
    guests: Math.max(0, (b.guestCount ?? 0) - (b.cancelledGuests ?? 0)),
    amount: b.totalAmount ?? 0,
    vatRate: 8,
    currency: "VND",
    idNumber: !laHoChieu ? String(nguoiDaiDien?.idNumber ?? "").trim() : "",
    passportNo: laHoChieu ? String(nguoiDaiDien?.idNumber ?? "").trim() : "",
    bookingCode: b.bookingCode || "",
    agency: (b.agencyName || b.source || "").trim(),
    note: "",
    pickedBy: "",
    exportedAt: "",
  };
}

function toRecordDTO(r: any): TaxRecordDTO {
  return {
    collectDate: r.collectDate || "",
    flightDate: r.flightDate || "",
    cancelDate: r.cancelDate || "",
    customerName: r.customerName || "",
    companyName: r.companyName || "",
    taxCode: r.taxCode || "",
    address: r.address || "",
    payMethod: r.payMethod || "",
    guests: r.guests ?? 0,
    amount: r.amount ?? 0,
    vatRate: r.vatRate ?? 8,
    currency: r.currency || "VND",
    idNumber: r.idNumber || "",
    passportNo: r.passportNo || "",
    bookingCode: r.bookingCode || "",
    agency: r.agency || "",
    note: r.note || "",
    pickedBy: r.pickedBy || "",
    exportedAt: r.exportedAt ? new Date(r.exportedAt).toISOString() : "",
  };
}

/* ------------------------------------------------------------------ */
/* Danh sách soát                                                      */
/* ------------------------------------------------------------------ */

function assertRange(from: string, to: string) {
  if (!isDateKey(from) || !isDateKey(to) || to < from) {
    throw new BaobayError("Khoảng ngày không hợp lệ", 400);
  }
}

/**
 * Booking trong khoảng ngày BAY, đủ mọi điểm — kế toán thuế nhìn cả công ty,
 * không bị chia theo điểm như nhân sự vận hành. Bỏ booking nhập nhầm (voided);
 * booking HUỶ vẫn hiện vì tiền đã thu của khách huỷ vẫn có thể phải xuất.
 */
export async function listTaxCandidates(
  _session: BaobaySession,
  from: string,
  to: string,
): Promise<{ rows: TaxCandidateDTO[] }> {
  await connectDB();
  assertRange(from, to);

  const bookings = await BaobayBooking.find({
    spot: { $in: SPOT_IDS },
    flightDate: { $gte: from, $lte: to },
    status: { $ne: "voided" },
  })
    .sort({ flightDate: 1, spot: 1, daySeq: 1 })
    .limit(2_000)
    .select(
      "spot flightDate daySeq contactName phone bookingCode source guestCount cancelledGuests totalAmount deposit depositDate depositMethod collectedLog status cancelledAt agencyName insured createdAt",
    )
    .lean<any[]>();

  const records = await BaobayTaxRecord.find({ bookingId: { $in: bookings.map((b) => b._id) } }).lean<any[]>();
  const byBooking = new Map(records.map((r) => [String(r.bookingId), r]));

  return {
    rows: bookings.map((b) => {
      const r = byBooking.get(String(b._id));
      return {
        bookingId: String(b._id),
        spot: b.spot,
        spotLabel: spotName(b.spot),
        flightDate: b.flightDate || "",
        daySeq: b.daySeq ?? 0,
        contactName: b.contactName || "",
        phone: b.phone || "",
        bookingCode: b.bookingCode || "",
        source: b.source || "",
        guestCount: b.guestCount ?? 0,
        totalAmount: b.totalAmount ?? 0,
        deposit: b.deposit ?? 0,
        status: b.status || "open",
        picked: Boolean(r),
        record: r ? toRecordDTO(r) : null,
        suggest: suggestOf(b),
      };
    }),
  };
}

/* ------------------------------------------------------------------ */
/* Nhặt / sửa / bỏ nhặt                                                */
/* ------------------------------------------------------------------ */

const TEXT_FIELDS = [
  "collectDate",
  "flightDate",
  "cancelDate",
  "customerName",
  "companyName",
  "taxCode",
  "address",
  "payMethod",
  "currency",
  "idNumber",
  "passportNo",
  "bookingCode",
  "agency",
  "note",
] as const;

/** Nhặt một booking vào danh sách xuất thuế, hoặc sửa hồ sơ đã nhặt. */
export async function saveTaxRecord(
  session: BaobaySession,
  bookingId: string,
  input: Partial<TaxRecordDTO>,
): Promise<TaxRecordDTO> {
  await connectDB();

  const booking = await BaobayBooking.findById(bookingId).select("spot status").lean<any>();
  if (!booking || booking.status === "voided") throw new BaobayError("Không tìm thấy booking", 404);

  const setObj: Record<string, unknown> = { spot: booking.spot, pickedBy: session.name || session.username };
  for (const k of TEXT_FIELDS) {
    if (input[k] !== undefined) setObj[k] = String(input[k] ?? "").trim().slice(0, 300);
  }
  // Ba cột ngày phải đúng dạng "YYYY-MM-DD" — chuỗi lạ thì bỏ, không đoán
  for (const k of ["collectDate", "flightDate", "cancelDate"] as const) {
    if (setObj[k] !== undefined && setObj[k] !== "" && !isDateKey(setObj[k])) delete setObj[k];
  }
  if (input.guests !== undefined) setObj.guests = Math.max(0, Math.round(Number(input.guests) || 0));
  if (input.amount !== undefined) setObj.amount = Math.max(0, Math.round(Number(input.amount) || 0));
  // Thuế suất chỉ nhận 0 / 8 / 10 — gõ nhầm 80 là hoá đơn sai không cứu được
  if (input.vatRate !== undefined) {
    const r = Math.round(Number(input.vatRate) || 0);
    if ([0, 8, 10].includes(r)) setObj.vatRate = r;
  }

  const doc = await BaobayTaxRecord.findOneAndUpdate(
    { bookingId },
    { $set: setObj, $setOnInsert: { bookingId } },
    { new: true, upsert: true },
  ).lean<any>();
  return toRecordDTO(doc);
}

/** Bỏ nhặt — khách này thôi không xuất hoá đơn nữa. */
export async function removeTaxRecord(_session: BaobaySession, bookingId: string): Promise<void> {
  await connectDB();
  await BaobayTaxRecord.deleteOne({ bookingId });
}

/* ------------------------------------------------------------------ */
/* Xuất Excel                                                          */
/* ------------------------------------------------------------------ */

/** "2026-08-25" -> "25/08/2026" — đúng dạng ngày phần mềm thuế nhận. */
const dmy = (key: string) => (isDateKey(key) ? formatDateKeyVN(key) + "/" + key.slice(0, 4) : key || "");

/**
 * TÁCH GIÁ CHƯA THUẾ từ tiền đã thu: net = gộp ÷ (1 + thuế suất).
 *
 * Đúng phép tính trên mẫu kế toán đưa: thu 515.000, VAT 8% → "Thành tiền"
 * 476.852 (= 515.000 ÷ 1,08). Tiền thuế = gộp − net, tính bằng PHÉP TRỪ chứ
 * không nhân lại — nhân lại rồi làm tròn hai lần là gộp ≠ net + thuế, lệch
 * một đồng và phần mềm thuế từ chối cả dòng.
 */
export function splitVat(gross: number, ratePercent: number): { net: number; vat: number } {
  const g = Math.max(0, Math.round(gross));
  const r = Math.max(0, ratePercent) / 100;
  const net = r > 0 ? Math.round(g / (1 + r)) : g;
  return { net, vat: g - net };
}

/**
 * MỘT file Excel: sheet 1 đúng TỪNG CỘT theo mẫu kế toán thuế đưa (thứ tự cột
 * là thứ tự phần mềm thuế nhận, KHÔNG tự ý thêm bớt), sheet 2 là bảng đối
 * chiếu gộp / chưa thuế/tiền thuế + dòng tổng để kế toán soát trước khi nhập.
 *
 * "Thành tiền" trên sheet 1 là giá CHƯA thuế, máy tự tách từ tiền đã thu theo
 * thuế suất của từng hồ sơ. Đơn giá = thành tiền ÷ số khách, tính lúc xuất —
 * hai cột này mà lưu rời nhau thì sớm muộn cũng lệch.
 *
 * Xuất xong ĐÓNG DẤU `exportedAt` lên từng hồ sơ: hồ sơ đã vào một file rồi
 * mà kỳ sau lại lọt vào file nữa là hai hoá đơn cho một khoản thu — trang soát
 * phải nhìn thấy dấu này để kế toán tự quyết có xuất lại hay không.
 */
export async function buildTaxXlsx(
  _session: BaobaySession,
  from: string,
  to: string,
): Promise<{ file: Buffer; name: string; count: number }> {
  await connectDB();
  assertRange(from, to);

  const records = await BaobayTaxRecord.find({ flightDate: { $gte: from, $lte: to } })
    .sort({ flightDate: 1, collectDate: 1 })
    .lean<any[]>();

  const rows = records.map((r) => {
    const guests = Math.max(0, r.guests ?? 0);
    const { net } = splitVat(r.amount ?? 0, r.vatRate ?? 8);
    return [
      dmy(r.collectDate),
      dmy(r.flightDate),
      dmy(r.cancelDate),
      r.customerName || "",
      r.companyName || "",
      r.taxCode || "",
      r.address || "",
      r.payMethod || "",
      guests || null,
      guests > 0 ? Math.round(net / guests) : net,
      net,
      r.currency || "VND",
      r.idNumber || "",
      r.passportNo || "",
      r.bookingCode || "",
      r.agency || "",
    ];
  });

  /** Sheet đối chiếu: gộp / chưa thuế / tiền thuế từng dòng + dòng tổng. */
  let tongGop = 0, tongNet = 0, tongVat = 0;
  const doiChieu = records.map((r) => {
    const { net, vat } = splitVat(r.amount ?? 0, r.vatRate ?? 8);
    tongGop += Math.round(r.amount ?? 0); tongNet += net; tongVat += vat;
    return [
      dmy(r.flightDate),
      r.customerName || "",
      r.bookingCode || "",
      Math.round(r.amount ?? 0),
      `${r.vatRate ?? 8}%`,
      net,
      vat,
      r.exportedAt ? `đã xuất ${toDateKeyVN(new Date(r.exportedAt))}` : "",
    ];
  });
  doiChieu.push(["TỔNG", "", "", tongGop, "", tongNet, tongVat, ""]);

  const file = buildXlsx([
    {
      name: `Thue ${from} ${to}`.slice(0, 31),
      header: [
        "Ngày thu tiền",
        "Ngày bay",
        "Ngày Hủy",
        "Tên khách hàng",
        "TenDonVi (nếu là công ty)",
        "MaSoThue (nếu là công ty)",
        "DiaChiKhachHang",
        "Hình thức tt",
        "SL người bay",
        "DonGia",
        "Thành tiền",
        "Loại tiền",
        "CCCD (nếu khách là cá nhân)",
        "Số hộ chiếu (nếu khách nước ngoài)",
        "Số Booking",
        "Đại lý",
      ],
      rows,
      widths: [13, 13, 12, 24, 22, 16, 20, 11, 12, 13, 13, 9, 20, 20, 14, 14],
    },
    {
      name: "Doi chieu",
      header: ["Ngày bay", "Khách", "Số booking", "Đã thu (gộp)", "Thuế suất", "Chưa thuế", "Tiền thuế", "Ghi chú"],
      rows: doiChieu,
      widths: [12, 24, 14, 14, 10, 14, 12, 20],
    },
  ]);

  // Đóng dấu SAU khi file dựng xong — dựng hỏng thì không hồ sơ nào bị dấu oan
  await BaobayTaxRecord.updateMany(
    { _id: { $in: records.map((r) => r._id) } },
    { $set: { exportedAt: new Date() } },
  );

  return { file, name: `xuat-thue-${from}_${to}.xlsx`, count: rows.length };
}
