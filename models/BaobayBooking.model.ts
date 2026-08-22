// models/BaobayBooking.model.ts
import mongoose, { Schema } from "mongoose";

import { DEFAULT_SPOT } from "@/lib/baobay/spots";

/**
 * Một BOOKING đặt trước: khách chốt hôm nay nhưng bay một ngày khác
 * (VD 13/08 đặt qua Klook cho ngày 20/08, 2 khách, đón khách sạn, 1 cam360).
 *
 * Bảng RIÊNG, không nhét vào báo cáo ngày, vì:
 *  - Booking thuộc về NGÀY BAY tương lai, còn thời điểm nhập là hôm nay —
 *    báo cáo ngày chỉ ôm số liệu của chính ngày đó.
 *  - Vòng đời khác hẳn: nhập → chờ tới ngày bay → bấm "Hoàn thành" để ẩn;
 *    không bị khoá theo ngày kế toán đã chốt.
 *
 * `createdAt` (timestamps) chính là "thời điểm điều phối nhập liệu" — dùng
 * để đối chiếu khách đặt lúc nào, không cho sửa.
 */

/** "other" = đón chỗ khác — ghi rõ địa điểm vào pickupNote (Khau Phạ/Sa Pa dùng). */
export type BookingPickup = "self" | "bigc" | "hotel" | "other";
/** open = chờ bay · done = đã bay (ghi nhận vào ngày bay) · cancelled = khách huỷ. */
/** "voided" = bỏ khỏi sổ do nhập nhầm / nhập trùng (vẫn giữ bản ghi để lần vết). */
export type BookingStatus = "open" | "done" | "cancelled" | "voided";

export interface IBaobayBooking {
  spot: string;
  /** Ngày khách BAY, "YYYY-MM-DD" giờ Việt Nam — booking hiện lên trang điều phối đúng ngày này. */
  flightDate: string;

  /** Điều phối (hoặc kế toán/quản trị) đã nhập booking. */
  createdByUsername: string;
  createdByName: string;

  /** Nguồn khách: FB / TikTok / Zalo / Klook / SEEK / GYG / KKday… — chữ tự do. */
  source: string;
  contactName: string;
  /** SĐT khách — người được giao lịch gọi đón/tiếp. */
  phone: string;
  /** Mã booking bên nguồn (số booking Klook, mã đơn…). */
  bookingCode: string;

  guestCount: number;
  /** Dịch vụ đặt kèm — SỐ LƯỢNG, khớp cách đếm của báo cáo ngày. */
  flycam: number;
  video360: number;
  redFlag: number;
  sunset: number;
  flagFlight: number;
  /**
   * HUỶ MỘT PHẦN: đăng ký 2 huỷ 1 thì số đang chạy giảm còn 1, các ô dưới đây
   * NHỚ phần đã huỷ — dòng booking in "2 khách (huỷ 1 đỏ)" thay vì lặng lẽ
   * thành 1 khách, và không ai phải tạo booking trùng chỉ để ghi dấu huỷ nữa.
   */
  cancelledGuests: number;
  cancelledFlycam: number;
  cancelledVideo360: number;
  cancelledRedFlag: number;
  cancelledSunset: number;
  cancelledFlagFlight: number;
  /** Booking gốc từ trang khách mebayluon.com/booking — khoá chống nhập trùng. */
  webBookingId?: string;
  /** Booking từ THƯ OTA (Klook…): mã của OTA — khoá chống nhập trùng. */
  otaRef?: string;
  otaName?: string;
  /** Hành khách kèm giấy tờ (OTA gửi sẵn) — dùng làm bảo hiểm, khỏi hỏi lại khách. */
  otaGuests?: Array<{ fullName: string; birthday: string; gender: string; idNumber: string; nationality: string }>;
  /**
   * HỒ SƠ BẢO HIỂM — mỗi NGƯỜI BAY một dòng, không phải mỗi booking một dòng.
   *
   * Công ty bảo hiểm cần đủ: họ tên, ngày sinh, số giấy tờ, giới tính, ngày bay,
   * điểm bay. Trẻ em chưa có CCCD thì điền SỐ ĐỊNH DANH do người nhà cung cấp
   * (idType = "dinhdanh"); trẻ nước ngoài luôn có hộ chiếu.
   *
   * Khách huỷ thì GIỮ dòng lại và bật `cancelled` chứ không xoá: bảng bảo hiểm
   * bên kia phải biết mà rút tên, xoá trắng ở đây là bên đó vẫn còn tên và vẫn
   * mất phí. Đổi người bay (đăng ký A, đến nơi B đi thay) thì ghi tên cũ vào
   * `replacedName` để đối chiếu.
   */
  insured?: Array<{
    fullName: string;
    /** Chuẩn hoá "yyyy-mm-dd". */
    birthday: string;
    gender: "nam" | "nu" | "";
    idNumber: string;
    idType: "cccd" | "passport" | "dinhdanh" | "";
    nationality: string;
    isChild: boolean;
    note: string;
    /** Dữ liệu đến từ đâu: web khách tự điền · OTA gửi · quét giấy tờ · gõ tay. */
    source: "web" | "ota" | "scan" | "manual" | "";
    cancelled?: boolean;
    replacedName?: string;
  }>;
  insuranceUpdatedAt?: Date;
  insuranceUpdatedBy?: string;
  /** Nhân viên đã DUYỆT là đủ và đúng — hồ sơ SẴN SÀNG, nhưng CHƯA gửi đi. */
  insuranceApprovedAt?: Date;
  insuranceApprovedBy?: string;
  /**
   * MỐC GỬI BẢO HIỂM — thứ quyết định người bay có được bảo hiểm hay không.
   *
   * Gửi ĐÚNG LÚC XUẤT VÉ, không sớm hơn cũng không muộn hơn:
   *  - Sớm hơn (lúc duyệt hồ sơ): trời xấu không bay được là mất phí bảo hiểm.
   *  - Muộn hơn (lúc tích "đã bay", thường cuối ngày): sự cố xảy ra trước khi
   *    gửi thì hồ sơ vô nghĩa — đây là cái không được phép sai.
   * Xuất vé nghĩa là 99% sẽ bay, nên đó là mốc đúng. Chuyến KHÔNG XÉ VÉ thì
   * dùng nút "bay không vé" làm mốc thay thế.
   */
  insuranceSentAt?: Date;
  insuranceSentBy?: string;
  /** Vì sao gửi: "xuất vé" · "bay không vé" · "gửi tay" · "đã bay". */
  insuranceSentReason?: string;
  /**
   * THU HỒI BẢO HIỂM: bấm nhầm, khách huỷ, dời lịch. Giữ mốc lại để còn biết
   * hồ sơ từng được gửi và đã rút lúc nào — xoá trắng là mất dấu.
   */
  insuranceRecalledAt?: Date;
  insuranceRecalledBy?: string;
  insuranceRecallReason?: string;
  /** Lần đẩy sang Google Sheets bảo hiểm gần nhất và lỗi nếu có. */
  insuranceSheetAt?: Date;
  insuranceSheetError?: string;
  /**
   * SỐ DÒNG NHIỀU NHẤT đã từng đẩy sang bảng bảo hiểm.
   *
   * Khoá của mỗi dòng bên đó là "<mã booking>:<thứ tự người>". Xoá bớt một
   * người là danh sách ngắn lại, những khoá đuôi không còn ai đại diện — không
   * nhớ mốc này thì dòng thừa nằm lại trên bảng vĩnh viễn và bên bảo hiểm vẫn
   * tính phí cho người đã bị xoá.
   */
  insuranceMaxRows?: number;
  /** Trạng thái bên trang khách lúc đồng bộ gần nhất. */
  webStatus?: string;
  syncedAt?: Date;
  /** Loại hình bay — quyết định đơn giá: "pg" dù lượn · "ppg" có động cơ. */
  flightKind: "pg" | "ppg" | "m650" | "m850";
  /** Số khách bay PPG khi nhóm đặt PG + PPG chung một booking (Khau Phạ). */
  ppgGuests: number;
  /** Tiền giảm combo flycam+360 — máy điền sẵn, quầy sửa được. */
  comboDiscount: number;
  /**
   * CHIẾT KHẤU trả đại lý / hướng dẫn viên dẫn đoàn này.
   *
   * KHÔNG nằm trong tổng tiền khách trả và KHÔNG lên phiếu gửi khách — đây là
   * khoản trả ngoài, chỉ nội bộ thấy. Trả tiền mặt thì trừ vào tiền người bấm
   * đang giữ; trả chuyển khoản thì công ty chi từ TK, ghi mã giao dịch.
   */
  commission?: {
    amount: number;
    method: "cash" | "transfer";
    transferCode?: string;
    /** Tên đại lý nhận chiết khấu — mặc định lấy tên đại lý khách đã đặt qua. */
    agencyName?: string;
    /** Số tài khoản và tên chủ tài khoản để chuyển tiền chiết khấu. */
    bankAccount?: string;
    bankAccountName?: string;
    /** Ghi chú riêng của khoản chi này. */
    note2?: string;
    byUsername: string;
    byName: string;
    at: Date;
    note?: string;
  };
  /** Phí đưa đón thu của khách (nếu có). */
  pickupFee: number;
  /** Số suất xe chuyên dụng lên núi (Hà Nội) — 150k/khách. */
  mountainCar: number;
  /** HUỶ BAY: đã xuất vé chưa · mã vé thu hồi · tiền hoàn và hoàn bằng gì. */
  cancelTicketIssued?: boolean;
  cancelTicketCodes?: string[];
  /** Khách ĐÃ ĐẾN LẤY VÉ chưa — quầy tích để khỏi xuất trùng và đếm vé đã xuất. */
  /**
   * KHOÁ SỔ MỘT BOOKING — kế toán bấm 🔒 thì không ai sửa được nữa.
   *
   * Khác "kế toán chốt ngày" (khoá cả ngày): đây là khoá TỪNG dòng, dùng khi số
   * của riêng khách đó đã đối soát xong, hoặc đang có tranh cãi và phải giữ
   * nguyên hiện trạng để soi. Chỉ kế toán mở lại được.
   */
  lockedAt?: Date;
  lockedBy?: string;
  /** Kế toán đã "ĐÃ NHẬN" phần cọc GÕ TAY (không qua lệnh thu) khi soát CK. */
  depositVerifiedAt?: Date;
  depositVerifiedBy?: string;
  /**
   * TÍCH XANH ĐẬM trên chi tiết booking: mọi khoản CK (lệnh thu CK + cọc gõ
   * tay) đã được kế toán "Đã nhận" → ✓CK; mọi khoản TIỀN MẶT đã nhận → ✓TM.
   * Số liệu gốc nằm ở từng lệnh thu (verifiedAt) — đây là bản dồn để dòng
   * booking hiện tích mà không phải join; có khoản mới là cờ tự xoá.
   */
  ckCheckedAt?: Date;
  tmCheckedAt?: Date;
  ticketIssuedAt?: Date;
  ticketIssuedBy?: string;
  /**
   * BAY KHÔNG VÉ — chuyến có thật nhưng không xé vé (khách ngoại giao, bay bù,
   * quầy hết vé giấy…). Đánh dấu để đối chiếu cuối ngày không đòi mã vé, nhưng
   * BẮT GHI LÝ DO: bay không vé mà không ai giải thích thì đúng là chỗ thất thoát.
   */
  noTicketFlight?: boolean;
  noTicketReason?: string;
  noTicketBy?: string;
  noTicketAt?: Date;
  refundAmount?: number;
  /**
   * TỔNG đã hoàn lại cho khách của booking này (huỷ bay, huỷ dịch vụ, thu nhầm).
   * Cộng dồn theo từng lệnh hoàn, để dòng tóm tắt kể đúng vệt tiền: đã thanh
   * toán bao nhiêu, hoàn bao nhiêu, còn thu bao nhiêu — thay vì gộp hết vào
   * "cọc" rồi hiện một con số không ai hiểu ở đâu ra.
   */
  refundedTotal?: number;
  /**
   * VỆT THU TIỀN của booking: ai thu, bao nhiêu, TM hay CK, lúc nào.
   * Ghi thẳng lên booking để quầy nhìn một dòng là biết tiền nong tới đâu,
   * khỏi lật sổ lệnh thu.
   */
  collectedLog?: Array<{ amount: number; method: "cash" | "transfer"; byName: string; at: Date; kind: string; code?: string }>;
  refundMethod?: "cash" | "transfer";
  cancelledAt?: Date;
  cancelledBy?: string;
  /** Đơn giá một khách theo loại hình + ngày bay (thường / cuối tuần & lễ). */
  unitPrice: number;
  /** Giảm trừ cả đoàn (chiết khấu đại lý, khuyến mãi…) — số tiền tuyệt đối. */
  discount: number;
  /** Tổng tiền chốt với khách — máy tự tính, lưu lại để đối chiếu về sau. */
  totalAmount: number;

  /** Đưa đón: tự đến / đón BigC (chỉ Hà Nội) / đón khách sạn / khác. */
  pickup: BookingPickup;
  /** Đón tại đâu khi chọn "khác" — chữ tự do. */
  pickupNote: string;
  /** Giờ bay dự kiến "HH:MM" — không bắt buộc. */
  expectedTime: string;
  /** Tiền khách đã cọc (VND). */
  deposit: number;
  /**
   * Khách ĐÃ TRẢ CHO ĐẠI LÝ một phần (đặt qua Klook/đối tác...) — phần này
   * khách khỏi trả nữa nhưng CÔNG TY CHƯA CẦM: đại lý đang nợ. Trừ vào "còn
   * thu của khách", đồng thời cộng vào bảng công nợ đại lý của ngày.
   */
  agencyPaidAmount: number;
  /** Tên đại lý giữ khoản đó — để báo cáo "đại lý ABC còn nợ X". */
  agencyName: string;
  /** Số tiền CÒN LẠI phải thu khi khách đến bay (VND). */
  remaining: number;
  /** Mã chuyển khoản của khoản cọc — soi lại sao kê ngân hàng. */
  transferCode: string;
  /** Cọc CK vào thẳng TK công ty. */
  depositToCompany: boolean;
  note: string;

  /**
   * Điều phối GIAO lịch cho một nhân sự của điểm (phi công đón khách, tiếp
   * khách…) — người được giao thấy booking trên trang của mình.
   */
  assignedToUsername?: string;
  assignedToName?: string;
  assignedBy?: string;
  /** Người được giao ĐÃ BẤM XÁC NHẬN nhận khách — điều phối biết họ đã đọc lịch. */
  acceptedAt?: Date;
  acceptedBy?: string;
  /**
   * TỜ GIẤY NHỚ của điều phối: gọi khách xong ghi lại đã hẹn giờ nào, khách dặn
   * gì, đổi ý ra sao. Tách khỏi `note` (ghi chú chung, có cả chữ máy tự ghi) để
   * lời người gọi không bị chìm giữa vệt hệ thống — và luôn hiện màu vàng.
   */
  contactNote?: string;
  /** Đã gọi xác nhận với khách chưa — booking web/OTA phải gọi trước khi tới ngày. */
  contactedAt?: Date;
  contactedBy?: string;
  /**
   * BỎ KHỎI SỔ vì nhập nhầm hoặc nhập trùng.
   *
   * KHÔNG xoá bản ghi: xoá hẳn thì mất dấu, mà mất dấu là mở đường cho gian
   * lận. Bản ghi ở lại, chỉ không tính vào thống kê và không lên lịch bay.
   * `mergedInto` là booking được giữ lại khi gộp trùng — tiền đã thu chuyển hết
   * sang đó, không mất đồng nào.
   */
  voidedAt?: Date;
  voidedBy?: string;
  voidReason?: string;
  voidKind?: "mistake" | "duplicate";
  mergedInto?: mongoose.Types.ObjectId;
  assignedAt?: Date;

  status: BookingStatus;
  /** Thời điểm + người bấm xác nhận cuối (đã bay hoặc huỷ). */
  doneAt?: Date;
  doneBy?: string;
  /** Các ngày bay CŨ nếu khách dời lịch — booking tự chuyển sang ngày mới. */
  rescheduledFrom: string[];
  /** Người bấm dời lịch lần gần nhất — truy vết "dời by ai". */
  movedBy?: string;
  movedAt?: Date;
  /**
   * SỐ THỨ TỰ KHÁCH TRONG NGÀY, cấp theo thời điểm đặt và KHÔNG đổi nữa —
   * quầy gọi "khách số 4" là cả ngày ai cũng hiểu, kể cả khi khách đó đã bay
   * hay đã huỷ. Dời lịch sang ngày khác thì cấp số mới của ngày mới.
   */
  daySeq: number;

  sheetSynced: boolean;
  sheetError?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

const BaobayBookingSchema = new Schema<IBaobayBooking>(
  {
    spot: { type: String, default: DEFAULT_SPOT, index: true },
    flightDate: { type: String, required: true },

    createdByUsername: { type: String, required: true },
    createdByName: { type: String, required: true },

    source: { type: String, default: "" },
    contactName: { type: String, default: "" },
    phone: { type: String, default: "" },
    bookingCode: { type: String, default: "" },

    guestCount: { type: Number, default: 0, min: 0 },
    flycam: { type: Number, default: 0, min: 0 },
    video360: { type: Number, default: 0, min: 0 },
    redFlag: { type: Number, default: 0, min: 0 },
    sunset: { type: Number, default: 0, min: 0 },
    flagFlight: { type: Number, default: 0, min: 0 },
    cancelledGuests: { type: Number, default: 0, min: 0 },
    cancelledFlycam: { type: Number, default: 0, min: 0 },
    cancelledVideo360: { type: Number, default: 0, min: 0 },
    cancelledRedFlag: { type: Number, default: 0, min: 0 },
    cancelledSunset: { type: Number, default: 0, min: 0 },
    cancelledFlagFlight: { type: Number, default: 0, min: 0 },
    webBookingId: { type: String, index: true, sparse: true },
    otaRef: { type: String, index: true, sparse: true },
    otaName: String,
    otaGuests: {
      type: [
        new Schema(
          {
            fullName: { type: String, default: "" },
            birthday: { type: String, default: "" },
            gender: { type: String, default: "" },
            idNumber: { type: String, default: "" },
            nationality: { type: String, default: "" },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    insured: {
      type: [
        new Schema(
          {
            fullName: { type: String, default: "" },
            birthday: { type: String, default: "" },
            gender: { type: String, enum: ["nam", "nu", ""], default: "" },
            idNumber: { type: String, default: "" },
            idType: { type: String, enum: ["cccd", "passport", "dinhdanh", ""], default: "" },
            nationality: { type: String, default: "" },
            isChild: { type: Boolean, default: false },
            note: { type: String, default: "" },
            source: { type: String, enum: ["web", "ota", "scan", "manual", ""], default: "" },
            cancelled: { type: Boolean, default: false },
            replacedName: { type: String, default: "" },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    insuranceUpdatedAt: Date,
    insuranceUpdatedBy: String,
    insuranceApprovedAt: Date,
    insuranceApprovedBy: String,
    insuranceSentAt: Date,
    insuranceSentBy: String,
    insuranceSentReason: String,
    insuranceRecalledAt: Date,
    insuranceRecalledBy: String,
    insuranceRecallReason: String,
    insuranceSheetAt: Date,
    insuranceSheetError: String,
    insuranceMaxRows: { type: Number, default: 0 },
    webStatus: String,
    syncedAt: Date,
    flightKind: { type: String, enum: ["pg", "ppg", "m650", "m850"], default: "pg" },
    ppgGuests: { type: Number, default: 0, min: 0 },
    comboDiscount: { type: Number, default: 0, min: 0 },
    commission: {
      type: {
        amount: { type: Number, default: 0 },
        method: { type: String, enum: ["cash", "transfer"], default: "cash" },
        transferCode: String,
        agencyName: String,
        bankAccount: String,
        bankAccountName: String,
        note2: String,
        byUsername: String,
        byName: String,
        at: Date,
        note: String,
        _id: false,
      },
      default: undefined,
    },
    pickupFee: { type: Number, default: 0, min: 0 },
    mountainCar: { type: Number, default: 0, min: 0 },
    cancelTicketIssued: Boolean,
    cancelTicketCodes: { type: [String], default: [] },
    lockedAt: Date,
    lockedBy: String,
    depositVerifiedAt: Date,
    depositVerifiedBy: String,
    ckCheckedAt: Date,
    tmCheckedAt: Date,
    ticketIssuedAt: Date,
    ticketIssuedBy: String,
    noTicketFlight: { type: Boolean, default: false },
    noTicketReason: String,
    noTicketBy: String,
    noTicketAt: Date,
    refundAmount: { type: Number, default: 0, min: 0 },
    refundedTotal: { type: Number, default: 0, min: 0 },
    collectedLog: {
      type: [
        {
          amount: { type: Number, default: 0 },
          method: { type: String, enum: ["cash", "transfer"], default: "cash" },
          byName: { type: String, default: "" },
          code: String,
          at: Date,
          kind: { type: String, default: "" },
          _id: false,
        },
      ],
      default: [],
    },
    refundMethod: { type: String, enum: ["cash", "transfer"] },
    cancelledAt: Date,
    cancelledBy: String,
    unitPrice: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, default: 0, min: 0 },

    pickup: { type: String, enum: ["self", "bigc", "hotel", "other"], default: "self" },
    pickupNote: { type: String, default: "" },
    expectedTime: { type: String, default: "" },
    deposit: { type: Number, default: 0, min: 0 },
    remaining: { type: Number, default: 0, min: 0 },
    agencyPaidAmount: { type: Number, default: 0, min: 0 },
    agencyName: { type: String, default: "" },
    transferCode: { type: String, default: "" },
    depositToCompany: { type: Boolean, default: false },
    note: { type: String, default: "" },

    assignedToUsername: String,
    assignedToName: String,
    assignedBy: String,
    acceptedAt: Date,
    acceptedBy: String,
    contactNote: String,
    contactedAt: Date,
    contactedBy: String,
    voidedAt: Date,
    voidedBy: String,
    voidReason: String,
    voidKind: { type: String, enum: ["mistake", "duplicate"] },
    mergedInto: { type: Schema.Types.ObjectId, ref: "BaobayBooking" },
    assignedAt: Date,

    status: { type: String, enum: ["open", "done", "cancelled", "voided"], default: "open" },
    doneAt: Date,
    doneBy: String,
    rescheduledFrom: { type: [String], default: [] },
    movedBy: String,
    movedAt: Date,
    daySeq: { type: Number, default: 0 },

    sheetSynced: { type: Boolean, default: false },
    sheetError: String,
  },
  { timestamps: true },
);

// Trang điều phối hỏi "booking của ngày X" và "booking đang chờ" mỗi lần mở
BaobayBookingSchema.index({ spot: 1, flightDate: 1, status: 1 });

export const BaobayBooking =
  mongoose.models.BaobayBooking || mongoose.model<IBaobayBooking>("BaobayBooking", BaobayBookingSchema);
