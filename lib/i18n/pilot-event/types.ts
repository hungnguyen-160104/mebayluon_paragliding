// lib/i18n/pilot-event/types.ts
/**
 * Chữ nghĩa của trang đăng ký bay cho phi công (/muavang).
 *
 * Tách khỏi lib/pilot-event.ts vì file đó là NGUỒN NGHIỆP VỤ — giá, ngày,
 * quy định — và được dùng chung cho email nội bộ lẫn dòng ghi sang Google
 * Sheets, hai nơi luôn tiếng Việt. Đây chỉ là phần khách nhìn thấy.
 *
 * Các dòng trong bảng phí KHÔNG dịch bằng cách so chuỗi: mỗi dòng mang theo
 * một `key` do computePilotFee sinh ra, trang tra key này để lấy câu chữ đúng
 * ngôn ngữ. Nhờ vậy sửa câu tiếng Việt không làm hỏng bản dịch.
 */

import type { FeeKey, NoteKey } from "@/lib/pilot-event";

export type PilotLang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

export type PilotDict = {
  /* hero */
  /* nhãn cho trình đọc màn hình */
  altHero: string;
  altQr: string;
  minusOne: string;
  plusOne: string;

  heroBadge: string;
  heroWelcome: string;
  heroPlace: string;
  chipFestival: string;
  chipCom: string;
  chipAltitude: string;
  heroCta: string;
  heroCtaNote: string;

  /* ba đợt bay */
  periodsTitle: string;
  periodsSubtitle: string;
  periodName: Record<"mua_vang" | "le_hoi_com" | "ngay_thuong", string>;
  periodNote: Record<"mua_vang" | "le_hoi_com" | "ngay_thuong", string>;
  openingMuaVang: string;
  openingCom: string;
  normalDates: string;
  muaVangLines: [string, string];
  comLines: [string, string, string];
  normalLines: [string, string, string];
  discountText: string;
  comboTitle: string;
  comboSubtitle: string;
  comboItems: string[];

  /* địa điểm */
  placesTitle: string;
  placesSubtitle: string;
  placeRoles: [string, string, string, string];
  placeNames: [string, string, string, string];
  placeDetails: [string, string, string, string];
  contactsTitle: string;
  radioLabel: string;
  contactRole: Record<
    "shuttle" | "flightOps" | "tech" | "launch" | "lead" | "band" | "media" | "catering",
    string
  >;
  viewMap: string;
  viewHomestay: string;

  /* bộ sưu tập ảnh */
  galleryTitle: string;
  gallerySubtitle: string;
  close: string;
  prevPhoto: string;
  nextPhoto: string;

  /* đọc thêm */
  guideTitle: string;
  guideSubtitle: string;
  guideLinks: string[];

  /* phiếu đăng ký */
  formTitle: string;
  formTitleEdit: string;
  formSubtitle: string;
  formSubtitleEdit: (code: string) => string;

  step1: string;
  kind: Record<"paragliding" | "paramotor" | "both", string>;
  kindParaDesc: string;
  ppgPerk: string;
  /** Ô tích nhận bay PPG kéo cờ trong lễ khai mạc. */
  flagFlight: string;
  flagFlightNote: string;

  step2: string;
  fFullName: string;
  fFullNamePh: string;
  fId: string;
  fIdHint: string;
  fIdPh: string;
  fNationality: string;
  fPhone: string;
  fPhonePh: string;
  fEmergencyPhone: string;
  fEmergencyPhonePh: string;
  /** Phi công/HLV local nhận hỗ trợ — kèm lời giải thích cho phi công mới/diện giám sát. */
  fSupportPilot: string;
  fSupportPilotHint: string;
  fSupportPilotPh: string;
  fSupportPilotPhonePh: string;
  fEmail: string;
  fEmailPh: string;
  fAddress: string;
  fAddressPh: string;
  fClub: string;
  fClubPh: string;
  fRequest: string;
  fRequestHint: string;
  fRequestPh: string;
  /** Cỡ áo sự kiện — chỉ hiện với đợt Mùa Vàng. */
  fShirt: string;
  /** Câu hỏi CÓ/KHÔNG đăng ký áo — có mới hỏi cỡ. */
  fShirtAsk: string;
  fShirtYes: string;
  fShirtNo: string;
  fShirtHint: string;
  fShirtPh: string;

  step3: string;
  openingLabel: string;
  slotsLeft: string;
  slotsLine: (taken: number, remaining: number, max: number) => string;
  slotsFullNote: string;
  slotsListTitle: string;
  slotsEmpty: string;
  kindShort: Record<"paragliding" | "paramotor" | "both", string>;

  step4: string;
  pickPeriodFirst: string;
  hint: Record<"mua_vang" | "le_hoi_com" | "ngay_thuong", string>;
  extraDaysLabel: string;
  extraDaysNote: string;
  weekdays: [string, string, string, string, string, string, string];
  months: string[];
  chosenDays: (n: number) => string;
  festivalDateTip: string;
  feeModeDay: (price: string) => string;
  feeModeMonth: (price: string) => string;
  feeModeDayDesc: string;
  feeModeMonthDesc: string;

  companionTitle: string;
  companionDesc: (price: string) => string;
  companionNoRoom: string;
  /** Người nhà CHỈ dự Gala dinner. */
  galaTitle: string;
  galaDesc: (price: string) => string;
  muaVangCheckbox: string;
  muaVangCheckboxNote: string;

  step5: string;
  step5Hint: string;
  motor: Record<"trike" | "foot", string>;
  fuelPerk: string;
  motorLocked: string;
  wingLabel: string;
  wingPpg: string;

  feeTitle: string;
  feeTotal: string;
  feeFree: string;
  feeFreePpg: string;
  feeEmpty: string;
  monthNotice: (from: string, to: string) => string;
  payNotice: string;
  payRefund: string;

  zaloInlineTitle: string;
  zaloInlineDesc: string;
  zaloInlineBtn: string;
  zaloTitle: string;
  zaloDesc: string;
  zaloBtn: string;

  submit: string;
  submitEdit: string;
  submitting: string;
  submitFoot: string;
  needHelp: string;

  /* lỗi */
  err: Record<
    "kind" | "period" | "name" | "id" | "phone" | "phoneBad" | "emergencyPhone" | "dates" | "motor" | "shirtSize",
    string
  >;
  errNetwork: string;
  errSubmit: string;

  /* màn hình thành công */
  okTitle: string;
  okSubtitle: string;
  okCode: string;
  okEmailSent: string;
  okNoEmail: string;
  payTitle: string;
  payScanHint: string;
  payMaking: string;
  payBank: string;
  payAccount: string;
  payOwner: string;
  payNote: string;
  payButton: string;
  payButtonBusy: string;
  payDone: string;
  noFeeTitle: string;
  noFeeDesc: string;
  callBtn: string;
  editBtn: string;
  againBtn: string;

  /* nhãn từng dòng phí, tra theo key */
  fee: Record<FeeKey, (n: number, unit: string) => string>;
  note: Record<NoteKey, string>;
};
