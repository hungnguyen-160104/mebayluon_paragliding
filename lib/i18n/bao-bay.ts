// lib/i18n/bao-bay.ts
/**
 * Chữ trên trang /baobay theo 6 ngôn ngữ (vi, en, fr, ru, zh, hi).
 *
 * Để riêng khỏi lib/i18n/pilot-event (bảng chữ của /muavang) để sửa trang này
 * không bao giờ đụng tới trang kia. Thư nội bộ và trang quản trị vẫn tiếng
 * Việt — chúng lấy nhãn từ lib/bao-bay.ts.
 */
import type { BaoBayKnowledgeKey, BaoBayLineKey, BaoBaySpot, FeeMode, PurchaseMode } from "@/lib/bao-bay";

export type BaoBayLang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

export type BaoBayErrKey =
  | "spot"
  | "dates"
  | "datesPast"
  | "memberInvalid"
  | "name"
  | "id"
  | "phone"
  | "phoneBad"
  | "emergencyPhone"
  | "nationality"
  | "payConfirm"
  | "amountChanged"
  | "memberPhone"
  | "phoneMismatch"
  | "phoneLocked"
  | "rules"
  | "email"
  | "server"
  | "rate"
  | "network";

export type BaoBayDict = {
  altHero: string;
  altQr: string;
  heroBadge: string;
  heroTitle: string;
  heroPlaces: string;
  heroNote: string;
  heroCta: string;

  formTitle: string;
  formSubtitle: string;

  step1: string;
  spotName: Record<BaoBaySpot, string>;
  spotArea: Record<BaoBaySpot, string>;
  /** Giá gọn cho thẻ chọn điểm (3 thẻ một hàng trên điện thoại nên phải thật ngắn). */
  priceShort: Record<PurchaseMode, string>;
  /** Nhãn nhỏ trên thẻ Viên Nam. */
  hnaaTag: string;

  forecastOpen: (site: string) => string;
  forecastClose: string;
  forecastLoading: string;
  forecastSectionTitle: string;
  forecastSectionHint: string;

  step2: string;
  step2Hint: string;
  pickSpotFirst: string;
  months: string[];
  weekdays: string[];
  chosenDays: (n: number) => string;

  step3: string;
  hnaaLabel: string;
  hnaaHint: string;
  hnaaCutoff: string;
  hnaaWarn: string;
  hnaaPh: string;
  hnaaCheck: string;
  hnaaChecking: string;
  hnaaOk: string;
  hnaaWrong: string;
  hnaaWrongContinue: string;
  hnaaChange: string;
  memberId: string;
  memberPhone: string;
  memberNeedMore: string;
  memberCodeFound: (code: string) => string;
  memberPhoneLabel: string;
  memberPhoneNoFile: string;
  memberConfirm: string;
  memberPhoneUnverified: string;
  savedPrefilled: string;
  savedClear: string;
  savedNotYou: string;
  rulesAccept: string;
  rulesScrollHint: string;
  rulesTapZoom: string;

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
  fWing: string;
  wingPpg: string;
  fEmail: string;
  fEmailHint: string;
  fEmailPh: string;
  mailSubject: string;
  mailIntro: string;
  mailRulesTitle: string;
  mailRulesGeneric: string;
  mailRulesLink: string;
  mailBack: string;
  fLicence: string;
  fLicencePh: string;
  fNote: string;
  fNotePh: string;

  step4: string;
  modeDay: (price: string) => string;
  modeDayDesc: string;
  modeMonth: (price: string) => string;
  modeMonthDesc: string;
  modeYear: (price: string) => string;
  modeYearDesc: string;

  feeTitle: string;
  feeLine: Record<BaoBayLineKey, (n: number) => string>;
  feeTotal: string;
  feeFree: string;
  feeLoading: string;
  feeEmpty: string;
  passNotice: (until: string) => string;
  newPassNotice: (from: string, until: string) => string;
  autoMonthNotice: string;
  hnaaLateNotice: string;

  submit: string;
  submitting: string;
  submitFoot: string;
  needHelp: string;

  natAsk: string;
  natVn: string;
  natForeign: string;
  natForeignHint: string;
  fNationalityPh: string;
  fPassport: string;
  fPassportPh: string;

  knowTitle: string;
  knowMain: string;
  knowLinks: Record<BaoBayKnowledgeKey, string>;

  radioTitle: string;
  emergencyTitle: string;
  calFullForecast: string;

  todayTitle: (n: number) => string;
  todayNone: string;

  payBeforeTitle: string;
  payBeforeHint: string;
  payNeedPhone: string;
  payConfirmLabel: string;
  payConfirmFirst: string;
  /** Đã gõ mã hội viên nhưng chưa xác nhận đúng SĐT → khoá nút gửi (chủ 01/10). */
  memberPendingBlock: string;
  okPendingPay: string;
  okPendingPayDesc: string;

  err: Record<BaoBayErrKey, string>;

  okTitle: string;
  okSubtitle: string;
  okCode: string;
  okSpot: string;
  okDates: string;
  okFeeMode: Record<FeeMode, string>;
  payTitle: string;
  payScanHint: string;
  payMaking: string;
  payBank: string;
  payAccount: string;
  payOwner: string;
  payNote: string;
  noFeeTitle: string;
  noFeeDesc: string;
  againBtn: string;
  callBtn: string;
};

const vi: BaoBayDict = {
  altHero: "Điểm bay dù lượn",
  altQr: "Mã QR chuyển khoản",
  heroBadge: "🪂 Dành cho phi công bay đơn",
  heroTitle: "Báo bay",
  heroPlaces: "Núi Viên Nam · Khau Phạ · Quản Bạ",
  heroNote: "Báo bay và đóng phí điểm bay trước khi cất cánh",
  heroCta: "Báo bay ngay",

  formTitle: "Phiếu báo bay",
  formSubtitle: "Chọn điểm bay, ngày bay, điền thông tin — phí và mã QR hiện ngay bên dưới.",

  step1: "Chọn điểm bay",
  spotName: { "vien-nam": "Núi Viên Nam", "khau-pha": "Khau Phạ", "quan-ba": "Quản Bạ" },
  spotArea: {
    "vien-nam": "Gần Hà Nội",
    "khau-pha": "Mù Cang Chải",
    "quan-ba": "Hà Giang",
  },
  priceShort: { day: "100k/ngày", month: "800k/tháng", year: "2,5tr/năm" },
  hnaaTag: "Hội viên HNAA Free",

  forecastOpen: (s) => `Xem dự báo thời tiết ${s}`,
  forecastClose: "Thu gọn dự báo",
  forecastLoading: "Đang tải dự báo…",
  forecastSectionTitle: "Dự báo 3 điểm bay",
  forecastSectionHint: "Bấm vào từng điểm để mở dự báo đầy đủ.",

  step2: "Chọn ngày bay",
  step2Hint: "Bấm vào các ngày bạn sẽ bay, không cần liền nhau.",
  pickSpotFirst: "Chọn điểm bay trước.",
  months: ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"],
  weekdays: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
  chosenDays: (n) => `Đã chọn ${n} ngày:`,

  step3: "Thông tin báo bay",
  hnaaLabel: "Mã hội viên HNAA",
  hnaaHint: "Nếu bạn là Hội viên HNAA hãy điền mã hội viên để được miễn phí báo bay.",
  hnaaCutoff: "Chỉ miễn phí khi báo bay TRƯỚC 9h00 sáng ngày bay. Báo cho các ngày sau thì lúc nào cũng được.",
  hnaaWarn: "Hội viên báo bay ảo mà không đi bay, vi phạm nhiều lần sẽ bị từ chối báo bay.",
  hnaaPh: "Ví dụ: HNAA-01",
  hnaaCheck: "Kiểm tra",
  hnaaChecking: "Đang kiểm tra…",
  hnaaOk: "Đã xác nhận hội viên HNAA",
  hnaaWrong: "Mã hội viên không đúng",
  hnaaWrongContinue: "Bạn vẫn có thể báo bay bằng cách tự điền thông tin bên dưới và đóng phí.",
  hnaaChange: "Nhập mã khác",
  memberId: "CCCD/Hộ chiếu",
  memberPhone: "Điện thoại",
  memberNeedMore: "Danh sách hội còn thiếu thông tin này, vui lòng điền thêm:",
  memberCodeFound: (c) => `Mã ${c} hợp lệ`,
  memberPhoneLabel: "Nhập số điện thoại đăng ký hội viên của bạn để xác nhận",
  memberPhoneNoFile: "Danh sách hội chưa có số điện thoại của bạn — nhập số của bạn để tiếp tục.",
  memberConfirm: "Xác nhận",
  memberPhoneUnverified: "SĐT chưa có trong danh sách hội — ban điều phối sẽ đối chiếu sau.",
  savedPrefilled: "Đã điền sẵn thông tin lần trước",
  savedClear: "Xoá thông tin đã lưu",
  savedNotYou: "Không phải bạn?",
  rulesAccept: "Tôi chấp nhận tuân thủ nghiêm mọi Nội quy của điểm bay Núi Viên Nam",
  rulesScrollHint: "Kéo trong khung để đọc hết nội quy",
  rulesTapZoom: "Chạm để phóng to",

  fFullName: "Họ và tên",
  fFullNamePh: "Nguyễn Văn A",
  fId: "Số CCCD / Hộ chiếu",
  fIdHint: "để mua bảo hiểm và nhận vé tháng/năm",
  fIdPh: "001099012345",
  fNationality: "Quốc tịch",
  fPhone: "Số điện thoại",
  fPhonePh: "0912 345 678",
  fEmergencyPhone: "Số điện thoại khẩn cấp",
  fEmergencyPhonePh: "Người thân / bạn bay",
  fWing: "Cấp cánh dù",
  wingPpg: "Dù PPG",
  fEmail: "Email",
  fEmailHint: "không bắt buộc — để nhận thư xác nhận",
  fEmailPh: "ban@email.com",
  mailSubject: "Xác nhận báo bay",
  mailIntro: "Cảm ơn bạn đã báo bay. Đây là thông tin báo bay của bạn:",
  mailRulesTitle: "Nhắc nội quy điểm bay",
  mailRulesGeneric: "Hãy tuân thủ nội quy điểm bay và hướng dẫn của điều phối; chỉ bay trong vùng được phép, đủ mũ bảo hiểm, bộ đàm, dù phụ.",
  mailRulesLink: "Xem đầy đủ Nội quy điểm bay",
  mailBack: "Báo bay lần sau tại",
  fLicence: "Bằng / cấp phi công",
  fLicencePh: "Ví dụ: P3, IPPI 4",
  fNote: "Ghi chú",
  fNotePh: "Giờ dự kiến lên bãi, đi cùng ai…",

  step4: "Phí điểm bay",
  modeDay: (p) => `Theo ngày · ${p}`,
  modeDayDesc: "Bay ngày nào tính ngày đó.",
  modeMonth: (p) => `Vé tháng · ${p}`,
  modeMonthDesc: "Từ ngày bay đầu tiên tới cùng ngày tháng sau, bay không giới hạn.",
  modeYear: (p) => `Vé năm · ${p}`,
  modeYearDesc: "Trọn một năm tại điểm bay đã chọn, bay không giới hạn.",

  feeTitle: "Chi phí báo bay",
  feeLine: {
    hnaaFree: (n) => `Hội viên HNAA báo trước 9h00 × ${n} ngày`,
    passCovered: (n) => `Vé tháng/năm còn hạn × ${n} ngày`,
    day: (n) => `Phí điểm bay × ${n} ngày`,
    month: () => "Vé tháng",
    year: () => "Vé năm",
  },
  feeTotal: "Tổng cộng",
  feeFree: "Miễn phí",
  feeLoading: "Đang tính phí…",
  feeEmpty: "Chọn điểm bay và ngày bay để xem phí.",
  passNotice: (d) => `Vé tháng/năm còn hạn tới ${d}`,
  newPassNotice: (f, t) => `Vé của bạn có hiệu lực từ ${f} tới hết ${t}. Những lần báo bay sau trong thời gian này sẽ tự miễn phí.`,
  autoMonthNotice: "Từ 8 ngày trở lên vé tháng rẻ hơn — đã tự chuyển sang vé tháng.",
  hnaaLateNotice: "Đã qua 9h00 sáng ngày bay nên ngày đó hội viên HNAA cũng phải đóng phí như mọi phi công.",

  submit: "Gửi báo bay",
  submitting: "Đang gửi…",
  submitFoot: "Phí tính theo giờ máy chủ tại thời điểm bấm gửi.",
  needHelp: "Cần hỗ trợ, gọi",

  natAsk: "Bạn là",
  natVn: "Người Việt Nam",
  natForeign: "Người nước ngoài",
  natForeignHint: "Người nước ngoài bắt buộc khai quốc tịch và số hộ chiếu.",
  fNationalityPh: "Ví dụ: Pháp, Hàn Quốc",
  fPassport: "Số hộ chiếu",
  fPassportPh: "Số hộ chiếu",

  knowTitle: "Kiến thức dù lượn",
  knowMain: "Xem tất cả kiến thức dù lượn",
  knowLinks: {"weather": "Khí tượng dù lượn", "wind": "Gió và gradient gió", "thermal": "Bay thermal", "active": "Bay chủ động: kiểm soát bổ ngửa", "p3p4": "Kỹ thuật P3–P4 & lộ trình chứng chỉ"},

  radioTitle: "Tần số bộ đàm thông dụng",
  emergencyTitle: "Hotline khẩn cấp",
  calFullForecast: "Xem dự báo chi tiết",

  todayTitle: (n) => `Hôm nay đã có ${n} phi công báo bay:`,
  todayNone: "Chưa có ai báo bay hôm nay.",

  payBeforeTitle: "Thanh toán trước khi gửi",
  payBeforeHint: "Quét mã QR để chuyển khoản, rồi tích ô xác nhận bên dưới mới gửi được báo bay.",
  payNeedPhone: "Nhập số điện thoại ở bước 3 để hiện mã QR thanh toán.",
  payConfirmLabel: "Tôi đã thanh toán phí báo bay",
  payConfirmFirst: "Hãy thanh toán và tích ô “Tôi đã thanh toán phí báo bay” để gửi.",
  memberPendingBlock: "Hãy xác nhận đúng số điện thoại hội viên, hoặc xoá mã hội viên nếu bạn không phải hội viên HNAA.",
  okPendingPay: "Đã nhận báo bay, chờ xác nhận thanh toán",
  okPendingPayDesc: "Ban điều phối sẽ đối chiếu chuyển khoản và xác nhận.",

  err: {
    spot: "Chưa chọn điểm bay",
    dates: "Chưa chọn ngày bay",
    datesPast: "Không báo bay cho ngày đã qua",
    memberInvalid: "Mã hội viên không đúng",
    name: "Chưa nhập họ tên",
    id: "Chưa nhập số CCCD/Hộ chiếu",
    phone: "Chưa nhập số điện thoại",
    phoneBad: "Số điện thoại chưa đúng",
    emergencyPhone: "Chưa nhập số điện thoại khẩn cấp",
    nationality: "Người nước ngoài phải khai quốc tịch",
    payConfirm: "Vui lòng thanh toán và tích ô xác nhận trước khi gửi",
    amountChanged: "Phí báo bay vừa thay đổi — vui lòng thanh toán theo mã QR mới rồi tích lại ô xác nhận",
    memberPhone: "Nhập số điện thoại đăng ký hội viên để xác nhận",
    phoneMismatch: "Số điện thoại không khớp với hội viên này",
    phoneLocked: "Nhập sai số điện thoại quá nhiều lần — mã hội viên này tạm khoá 15 phút",
    rules: "Vui lòng đọc và tích chấp nhận Nội quy điểm bay Núi Viên Nam",
    email: "Email chưa đúng định dạng",
    server: "Không gửi được báo bay, vui lòng thử lại",
    rate: "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút",
    network: "Mất kết nối mạng, vui lòng thử lại",
  },

  okTitle: "Đã nhận báo bay!",
  okSubtitle: "Chúc bạn một chuyến bay an toàn. Giữ lại mã báo bay bên dưới.",
  okCode: "Mã báo bay",
  okSpot: "Điểm bay",
  okDates: "Ngày bay",
  okFeeMode: {
    hnaa_free: "Hội viên HNAA — miễn phí",
    pass: "Đã có vé tháng/năm — miễn phí",
    day: "Theo ngày",
    month: "Vé tháng",
    year: "Vé năm",
  },
  payTitle: "Chuyển khoản phí điểm bay",
  payScanHint: "Mở app ngân hàng, quét mã — số tiền và nội dung đã điền sẵn.",
  payMaking: "Đang tạo mã…",
  payBank: "Ngân hàng",
  payAccount: "Số tài khoản",
  payOwner: "Chủ tài khoản",
  payNote: "Nội dung",
  noFeeTitle: "Không phải đóng phí",
  noFeeDesc: "Báo bay của bạn đã được ghi nhận.",
  againBtn: "Báo bay khác",
  callBtn: "Gọi điều phối",
};

const en: BaoBayDict = {
  altHero: "Paragliding site",
  altQr: "Bank transfer QR code",
  heroBadge: "🪂 For solo pilots",
  heroTitle: "Flight register",
  heroPlaces: "Vien Nam Mountain · Khau Pha · Quan Ba",
  heroNote: "Submit your flight register and pay the site fee before take-off",
  heroCta: "Register a flight",

  formTitle: "Flight register form",
  formSubtitle: "Choose a site and dates, fill in your details — the fee and QR code appear right below.",

  step1: "Choose a flying site",
  spotName: { "vien-nam": "Vien Nam Mountain", "khau-pha": "Khau Pha", "quan-ba": "Quan Ba" },
  spotArea: {
    "vien-nam": "Near Hanoi",
    "khau-pha": "Mu Cang Chai",
    "quan-ba": "Ha Giang",
  },
  priceShort: { day: "100k/day", month: "800k/month", year: "2.5M/year" },
  hnaaTag: "HNAA members Free",

  forecastOpen: (s) => `Weather forecast for ${s}`,
  forecastClose: "Hide forecast",
  forecastLoading: "Loading forecast…",
  forecastSectionTitle: "Forecast for the 3 sites",
  forecastSectionHint: "Tap a site to open its full forecast.",

  step2: "Choose your flying dates",
  step2Hint: "Tap every day you will fly — they don't need to be consecutive.",
  pickSpotFirst: "Choose a site first.",
  months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  weekdays: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
  chosenDays: (n) => `${n} day${n === 1 ? "" : "s"} selected:`,

  step3: "Pilot details",
  hnaaLabel: "HNAA member code",
  hnaaHint: "If you are an HNAA member, enter your member code to fly for free.",
  hnaaCutoff: "Free only when the register is submitted BEFORE 09:00 on the flying day. Registers for later days are always in time.",
  hnaaWarn: "Members who register flights but don't fly will be refused registration after repeated violations.",
  hnaaPh: "e.g. HNAA-01",
  hnaaCheck: "Check",
  hnaaChecking: "Checking…",
  hnaaOk: "HNAA membership confirmed",
  hnaaWrong: "Incorrect member code",
  hnaaWrongContinue: "You can still submit by filling in your details below and paying the fee.",
  hnaaChange: "Use another code",
  memberId: "ID / Passport",
  memberPhone: "Phone",
  memberNeedMore: "The member list is missing this information, please add it:",
  memberCodeFound: (c) => `Code ${c} found`,
  memberPhoneLabel: "Enter your registered phone number to confirm",
  memberPhoneNoFile: "Your number isn't in the member list yet — enter your phone to continue.",
  memberConfirm: "Confirm",
  memberPhoneUnverified: "Phone not in the member list yet — the coordinators will check it later.",
  savedPrefilled: "Filled from your last register",
  savedClear: "Clear saved info",
  savedNotYou: "Not you?",
  rulesAccept: "I agree to strictly comply with all Vien Nam flying site regulations",
  rulesScrollHint: "Scroll inside the box to read all the rules",
  rulesTapZoom: "Tap to enlarge",

  fFullName: "Full name",
  fFullNamePh: "John Smith",
  fId: "ID card / Passport number",
  fIdHint: "for insurance and month/year passes",
  fIdPh: "C1234567",
  fNationality: "Nationality",
  fPhone: "Phone number",
  fPhonePh: "+84 912 345 678",
  fEmergencyPhone: "Emergency phone",
  fEmergencyPhonePh: "Family member / flying buddy",
  fWing: "Wing class",
  wingPpg: "PPG wing",
  fEmail: "Email",
  fEmailHint: "optional — to receive a confirmation",
  fEmailPh: "you@email.com",
  mailSubject: "Flight register confirmation",
  mailIntro: "Thank you for registering your flight. Here are your details:",
  mailRulesTitle: "Site rules reminder",
  mailRulesGeneric: "Follow the site rules and the coordinators' instructions; fly only inside the permitted zone, with helmet, radio and reserve.",
  mailRulesLink: "Read the full site regulations",
  mailBack: "Register your next flight at",
  fLicence: "Licence / pilot level",
  fLicencePh: "e.g. P3, IPPI 4",
  fNote: "Notes",
  fNotePh: "Expected arrival at launch, who you fly with…",

  step4: "Site fee",
  modeDay: (p) => `Per day · ${p}`,
  modeDayDesc: "Pay only for the days you fly.",
  modeMonth: (p) => `Month pass · ${p}`,
  modeMonthDesc: "From your first flying day to the same day next month, unlimited flying.",
  modeYear: (p) => `Year pass · ${p}`,
  modeYearDesc: "A full year at the selected site, unlimited flying.",

  feeTitle: "Register fee",
  feeLine: {
    hnaaFree: (n) => `HNAA member, submitted before 09:00 × ${n} day${n === 1 ? "" : "s"}`,
    passCovered: (n) => `Valid month/year pass × ${n} day${n === 1 ? "" : "s"}`,
    day: (n) => `Site fee × ${n} day${n === 1 ? "" : "s"}`,
    month: () => "Month pass",
    year: () => "Year pass",
  },
  feeTotal: "Total",
  feeFree: "Free",
  feeLoading: "Calculating…",
  feeEmpty: "Choose a site and dates to see the fee.",
  passNotice: (d) => `Month/year pass valid until ${d}`,
  newPassNotice: (f, t) => `Your pass is valid from ${f} through ${t}. Later registers within this period are free automatically.`,
  autoMonthNotice: "From 8 days a month pass is cheaper — switched to a month pass for you.",
  hnaaLateNotice: "It is already past 09:00 on the flying day, so HNAA members pay the normal fee for that day.",

  submit: "Submit flight register",
  submitting: "Submitting…",
  submitFoot: "The fee is calculated with the server clock at the moment you submit.",
  needHelp: "Need help? Call",

  natAsk: "You are",
  natVn: "Vietnamese",
  natForeign: "Foreigner",
  natForeignHint: "Foreign pilots must declare their nationality and passport number.",
  fNationalityPh: "e.g. France, Korea",
  fPassport: "Passport number",
  fPassportPh: "Passport number",

  knowTitle: "Paragliding knowledge",
  knowMain: "All paragliding knowledge",
  knowLinks: {"weather": "Paragliding meteorology", "wind": "Wind and wind gradient", "thermal": "Thermal flying", "active": "Active flying: pitch control", "p3p4": "P3–P4 skills & licence roadmap"},

  radioTitle: "Common radio frequencies",
  emergencyTitle: "Emergency hotline",
  calFullForecast: "See full forecast",

  todayTitle: (n) => `${n} pilot${n === 1 ? "" : "s"} registered a flight today:`,
  todayNone: "No one has registered a flight today yet.",

  payBeforeTitle: "Pay before submitting",
  payBeforeHint: "Scan the QR code to transfer, then tick the box below to submit your register.",
  payNeedPhone: "Enter your phone number in step 3 to show the payment QR code.",
  payConfirmLabel: "I have paid the register fee",
  payConfirmFirst: "Please pay and tick “I have paid the register fee” to submit.",
  memberPendingBlock: "Confirm the member's registered phone number, or clear the member code if you are not an HNAA member.",
  okPendingPay: "Register received, awaiting payment confirmation",
  okPendingPayDesc: "The coordinators will check your transfer and confirm.",

  err: {
    spot: "Please choose a flying site",
    dates: "Please choose your flying dates",
    datesPast: "You cannot register a flight for a past date",
    memberInvalid: "Incorrect member code",
    name: "Please enter your full name",
    id: "Please enter your ID/passport number",
    phone: "Please enter your phone number",
    phoneBad: "This phone number doesn't look right",
    emergencyPhone: "Please enter an emergency phone number",
    nationality: "Foreign pilots must declare their nationality",
    payConfirm: "Please pay and tick the confirmation box before submitting",
    amountChanged: "The fee has just changed — please pay with the new QR code and tick the box again",
    memberPhone: "Enter your registered member phone number to confirm",
    phoneMismatch: "Phone number doesn't match this member",
    phoneLocked: "Too many wrong phone numbers — this member code is locked for 15 minutes",
    rules: "Please read and accept the Vien Nam flying site regulations",
    email: "This email address doesn't look right",
    server: "Could not submit the register, please try again",
    rate: "Too many attempts, please try again in a few minutes",
    network: "Network error, please try again",
  },

  okTitle: "Flight register received!",
  okSubtitle: "Have a safe flight. Keep the register code below.",
  okCode: "Register code",
  okSpot: "Site",
  okDates: "Flying dates",
  okFeeMode: {
    hnaa_free: "HNAA member — free",
    pass: "Month/year pass — free",
    day: "Per day",
    month: "Month pass",
    year: "Year pass",
  },
  payTitle: "Pay the site fee by bank transfer",
  payScanHint: "Open your banking app and scan — the amount and message are pre-filled.",
  payMaking: "Generating code…",
  payBank: "Bank",
  payAccount: "Account number",
  payOwner: "Account holder",
  payNote: "Message",
  noFeeTitle: "No fee to pay",
  noFeeDesc: "Your flight register has been recorded.",
  againBtn: "Register another flight",
  callBtn: "Call the coordinator",
};

const fr: BaoBayDict = {
  altHero: "Site de parapente",
  altQr: "QR code de virement",
  heroBadge: "🪂 Pour les pilotes solo",
  heroTitle: "Enregistrement de vol",
  heroPlaces: "Vien Nam · Khau Pha · Quan Ba",
  heroNote: "Enregistrez votre vol et réglez la taxe de site avant de décoller",
  heroCta: "Enregistrer un vol",

  formTitle: "Formulaire d'enregistrement",
  formSubtitle: "Choisissez le site et les dates, remplissez vos informations — le tarif et le QR code s'affichent juste en dessous.",

  step1: "Choisissez le site",
  spotName: { "vien-nam": "Vien Nam", "khau-pha": "Khau Pha", "quan-ba": "Quan Ba" },
  spotArea: {
    "vien-nam": "Près de Hanoï",
    "khau-pha": "Mu Cang Chai",
    "quan-ba": "Ha Giang",
  },
  priceShort: { day: "100k/jour", month: "800k/mois", year: "2,5M/an" },
  hnaaTag: "Membres HNAA gratuit",

  forecastOpen: (s) => `Prévisions météo — ${s}`,
  forecastClose: "Masquer les prévisions",
  forecastLoading: "Chargement des prévisions…",
  forecastSectionTitle: "Prévisions des 3 sites",
  forecastSectionHint: "Touchez un site pour ouvrir ses prévisions complètes.",

  step2: "Choisissez vos dates de vol",
  step2Hint: "Touchez chaque jour où vous volerez — pas besoin de jours consécutifs.",
  pickSpotFirst: "Choisissez d'abord un site.",
  months: ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"],
  weekdays: ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"],
  chosenDays: (n) => `${n} jour${n > 1 ? "s" : ""} choisi${n > 1 ? "s" : ""} :`,

  step3: "Informations du pilote",
  hnaaLabel: "Numéro de membre HNAA",
  hnaaHint: "Si vous êtes membre de la HNAA, saisissez votre numéro de membre pour voler gratuitement.",
  hnaaCutoff: "Gratuit uniquement si l'enregistrement est envoyé AVANT 9h00 le jour du vol. Pour les jours suivants, c'est toujours dans les temps.",
  hnaaWarn: "Les membres qui enregistrent un vol sans voler verront leurs enregistrements refusés en cas de récidive.",
  hnaaPh: "ex. HNAA-01",
  hnaaCheck: "Vérifier",
  hnaaChecking: "Vérification…",
  hnaaOk: "Adhésion HNAA confirmée",
  hnaaWrong: "Numéro de membre incorrect",
  hnaaWrongContinue: "Vous pouvez tout de même vous enregistrer en remplissant vos informations ci-dessous et en payant la taxe.",
  hnaaChange: "Saisir un autre numéro",
  memberId: "Pièce d'identité / Passeport",
  memberPhone: "Téléphone",
  memberNeedMore: "La liste des membres ne contient pas cette information, merci de la compléter :",
  memberCodeFound: (c) => `Code ${c} trouvé`,
  memberPhoneLabel: "Saisissez votre numéro de téléphone enregistré pour confirmer",
  memberPhoneNoFile: "Votre numéro n'est pas encore dans la liste des membres — saisissez votre téléphone pour continuer.",
  memberConfirm: "Confirmer",
  memberPhoneUnverified: "Téléphone absent de la liste des membres — les coordinateurs vérifieront plus tard.",
  savedPrefilled: "Rempli avec votre dernier enregistrement",
  savedClear: "Effacer les infos enregistrées",
  savedNotYou: "Ce n'est pas vous ?",
  rulesAccept: "J'accepte de respecter strictement le règlement du site de vol de Vien Nam",
  rulesScrollHint: "Faites défiler le cadre pour lire tout le règlement",
  rulesTapZoom: "Touchez pour agrandir",

  fFullName: "Nom complet",
  fFullNamePh: "Jean Dupont",
  fId: "N° de pièce d'identité / passeport",
  fIdHint: "pour l'assurance et les forfaits mois/année",
  fIdPh: "C1234567",
  fNationality: "Nationalité",
  fPhone: "Téléphone",
  fPhonePh: "+84 912 345 678",
  fEmergencyPhone: "Téléphone d'urgence",
  fEmergencyPhonePh: "Proche / compagnon de vol",
  fWing: "Classe de voile",
  wingPpg: "Voile PPG",
  fEmail: "Email",
  fEmailHint: "facultatif — pour recevoir une confirmation",
  fEmailPh: "vous@email.com",
  mailSubject: "Confirmation d'enregistrement de vol",
  mailIntro: "Merci pour votre enregistrement. Voici vos informations :",
  mailRulesTitle: "Rappel du règlement du site",
  mailRulesGeneric: "Respectez le règlement du site et les consignes des coordinateurs ; volez uniquement dans la zone autorisée, avec casque, radio et secours.",
  mailRulesLink: "Lire le règlement complet du site",
  mailBack: "Enregistrez votre prochain vol sur",
  fLicence: "Brevet / niveau de pilote",
  fLicencePh: "ex. P3, IPPI 4",
  fNote: "Remarques",
  fNotePh: "Heure d'arrivée au déco, avec qui vous volez…",

  step4: "Taxe de site",
  modeDay: (p) => `À la journée · ${p}`,
  modeDayDesc: "Vous payez uniquement les jours de vol.",
  modeMonth: (p) => `Forfait mois · ${p}`,
  modeMonthDesc: "Du premier jour de vol au même jour du mois suivant, vols illimités.",
  modeYear: (p) => `Forfait année · ${p}`,
  modeYearDesc: "Une année complète sur le site choisi, vols illimités.",

  feeTitle: "Coût de l'enregistrement",
  feeLine: {
    hnaaFree: (n) => `Membre HNAA, enregistré avant 9h00 × ${n} jour${n > 1 ? "s" : ""}`,
    passCovered: (n) => `Forfait mois/année valide × ${n} jour${n > 1 ? "s" : ""}`,
    day: (n) => `Taxe de site × ${n} jour${n > 1 ? "s" : ""}`,
    month: () => "Forfait mois",
    year: () => "Forfait année",
  },
  feeTotal: "Total",
  feeFree: "Gratuit",
  feeLoading: "Calcul en cours…",
  feeEmpty: "Choisissez un site et des dates pour voir le tarif.",
  passNotice: (d) => `Forfait mois/année valable jusqu'au ${d}`,
  newPassNotice: (f, t) => `Votre forfait est valable du ${f} au ${t} inclus. Les enregistrements suivants sur cette période seront gratuits automatiquement.`,
  autoMonthNotice: "À partir de 8 jours, le forfait mois est moins cher — nous l'avons choisi pour vous.",
  hnaaLateNotice: "Il est déjà plus de 9h00 le jour du vol : ce jour-là, les membres HNAA paient la taxe normale.",

  submit: "Envoyer l'enregistrement",
  submitting: "Envoi…",
  submitFoot: "Le tarif est calculé selon l'horloge du serveur au moment de l'envoi.",
  needHelp: "Besoin d'aide ? Appelez le",

  natAsk: "Vous êtes",
  natVn: "Vietnamien",
  natForeign: "Étranger",
  natForeignHint: "Les pilotes étrangers doivent indiquer leur nationalité et leur numéro de passeport.",
  fNationalityPh: "ex. France, Corée",
  fPassport: "Numéro de passeport",
  fPassportPh: "Numéro de passeport",

  knowTitle: "Connaissances parapente",
  knowMain: "Toutes les connaissances parapente",
  knowLinks: {"weather": "Météo pour le parapente", "wind": "Vent et gradient de vent", "thermal": "Vol en thermique", "active": "Pilotage actif : contrôle du tangage", "p3p4": "Techniques P3–P4 et brevets"},

  radioTitle: "Fréquences radio courantes",
  emergencyTitle: "Numéro d'urgence",
  calFullForecast: "Voir les prévisions détaillées",

  todayTitle: (n) => `${n} pilote${n > 1 ? "s ont" : " a"} enregistré un vol aujourd'hui :`,
  todayNone: "Personne n'a encore enregistré de vol aujourd'hui.",

  payBeforeTitle: "Payer avant d'envoyer",
  payBeforeHint: "Scannez le QR code pour virer, puis cochez la case ci-dessous pour envoyer l'enregistrement.",
  payNeedPhone: "Saisissez votre téléphone à l'étape 3 pour afficher le QR code de paiement.",
  payConfirmLabel: "J'ai payé la taxe d'enregistrement",
  payConfirmFirst: "Payez puis cochez « J'ai payé la taxe d'enregistrement » pour envoyer.",
  memberPendingBlock: "Confirmez le numéro de téléphone du membre, ou effacez le code membre si vous n'êtes pas membre HNAA.",
  okPendingPay: "Enregistrement reçu, paiement en attente de confirmation",
  okPendingPayDesc: "Les coordinateurs vérifieront votre virement et confirmeront.",

  err: {
    spot: "Veuillez choisir un site",
    dates: "Veuillez choisir vos dates de vol",
    datesPast: "Impossible d'enregistrer un vol pour une date passée",
    memberInvalid: "Numéro de membre incorrect",
    name: "Veuillez saisir votre nom complet",
    id: "Veuillez saisir votre n° de pièce d'identité/passeport",
    phone: "Veuillez saisir votre numéro de téléphone",
    phoneBad: "Ce numéro de téléphone semble incorrect",
    emergencyPhone: "Veuillez saisir un téléphone d'urgence",
    nationality: "Les pilotes étrangers doivent indiquer leur nationalité",
    payConfirm: "Veuillez payer et cocher la case de confirmation avant d'envoyer",
    amountChanged: "Le tarif vient de changer — payez avec le nouveau QR code puis recochez la case",
    memberPhone: "Saisissez le téléphone enregistré du membre pour confirmer",
    phoneMismatch: "Le numéro ne correspond pas à ce membre",
    phoneLocked: "Trop de numéros erronés — ce code membre est bloqué 15 minutes",
    rules: "Veuillez lire et accepter le règlement du site de Vien Nam",
    email: "Cette adresse email semble incorrecte",
    server: "Impossible d'envoyer l'enregistrement, veuillez réessayer",
    rate: "Trop de tentatives, réessayez dans quelques minutes",
    network: "Erreur réseau, veuillez réessayer",
  },

  okTitle: "Enregistrement reçu !",
  okSubtitle: "Bon vol. Conservez le code d'enregistrement ci-dessous.",
  okCode: "Code d'enregistrement",
  okSpot: "Site",
  okDates: "Dates de vol",
  okFeeMode: {
    hnaa_free: "Membre HNAA — gratuit",
    pass: "Forfait mois/année — gratuit",
    day: "À la journée",
    month: "Forfait mois",
    year: "Forfait année",
  },
  payTitle: "Réglez la taxe de site par virement",
  payScanHint: "Ouvrez votre application bancaire et scannez — montant et message sont pré-remplis.",
  payMaking: "Création du code…",
  payBank: "Banque",
  payAccount: "N° de compte",
  payOwner: "Titulaire",
  payNote: "Message",
  noFeeTitle: "Rien à payer",
  noFeeDesc: "Votre enregistrement de vol est pris en compte.",
  againBtn: "Nouvel enregistrement",
  callBtn: "Appeler le coordinateur",
};

const ru: BaoBayDict = {
  altHero: "Парапланерный старт",
  altQr: "QR-код для перевода",
  heroBadge: "🪂 Для самостоятельных пилотов",
  heroTitle: "Регистрация полёта",
  heroPlaces: "Вьен Нам · Кхау Фа · Куан Ба",
  heroNote: "Зарегистрируйте полёт и оплатите сбор за площадку до старта",
  heroCta: "Зарегистрировать полёт",

  formTitle: "Форма регистрации полёта",
  formSubtitle: "Выберите площадку и даты, заполните данные — сумма и QR-код появятся ниже.",

  step1: "Выберите площадку",
  spotName: { "vien-nam": "Вьен Нам", "khau-pha": "Кхау Фа", "quan-ba": "Куан Ба" },
  spotArea: {
    "vien-nam": "Рядом с Ханоем",
    "khau-pha": "Мукангчай",
    "quan-ba": "Хазянг",
  },
  priceShort: { day: "100k/день", month: "800k/мес", year: "2,5 млн/год" },
  hnaaTag: "Члены HNAA бесплатно",

  forecastOpen: (s) => `Прогноз погоды: ${s}`,
  forecastClose: "Скрыть прогноз",
  forecastLoading: "Загрузка прогноза…",
  forecastSectionTitle: "Прогноз для 3 площадок",
  forecastSectionHint: "Нажмите на площадку, чтобы открыть полный прогноз.",

  step2: "Выберите даты полётов",
  step2Hint: "Отметьте все дни, когда будете летать, — не обязательно подряд.",
  pickSpotFirst: "Сначала выберите площадку.",
  months: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
  weekdays: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
  chosenDays: (n) => `Выбрано дней: ${n} —`,

  step3: "Данные пилота",
  hnaaLabel: "Членский номер HNAA",
  hnaaHint: "Если вы член HNAA, введите членский номер, чтобы летать бесплатно.",
  hnaaCutoff: "Бесплатно, только если регистрация подана ДО 09:00 в день полёта. Регистрация на последующие дни всегда вовремя.",
  hnaaWarn: "Членам, которые регистрируют полёты, но не летают, при повторных нарушениях будет отказано в регистрации.",
  hnaaPh: "напр. HNAA-01",
  hnaaCheck: "Проверить",
  hnaaChecking: "Проверка…",
  hnaaOk: "Членство HNAA подтверждено",
  hnaaWrong: "Неверный членский номер",
  hnaaWrongContinue: "Вы можете зарегистрироваться, заполнив данные ниже и оплатив сбор.",
  hnaaChange: "Ввести другой номер",
  memberId: "Удостоверение / паспорт",
  memberPhone: "Телефон",
  memberNeedMore: "В списке членов нет этих данных, пожалуйста, дополните:",
  memberCodeFound: (c) => `Код ${c} найден`,
  memberPhoneLabel: "Введите зарегистрированный номер телефона для подтверждения",
  memberPhoneNoFile: "Вашего номера ещё нет в списке членов — введите свой телефон, чтобы продолжить.",
  memberConfirm: "Подтвердить",
  memberPhoneUnverified: "Телефона нет в списке членов — координаторы проверят позже.",
  savedPrefilled: "Заполнено по вашей прошлой регистрации",
  savedClear: "Удалить сохранённые данные",
  savedNotYou: "Это не вы?",
  rulesAccept: "Я обязуюсь строго соблюдать все правила площадки Вьен Нам",
  rulesScrollHint: "Прокрутите окно, чтобы прочитать все правила",
  rulesTapZoom: "Нажмите, чтобы увеличить",

  fFullName: "Полное имя",
  fFullNamePh: "Иван Иванов",
  fId: "Номер удостоверения / паспорта",
  fIdHint: "для страховки и абонементов на месяц/год",
  fIdPh: "C1234567",
  fNationality: "Гражданство",
  fPhone: "Телефон",
  fPhonePh: "+84 912 345 678",
  fEmergencyPhone: "Экстренный телефон",
  fEmergencyPhonePh: "Родственник / напарник по полётам",
  fWing: "Класс крыла",
  wingPpg: "Крыло PPG",
  fEmail: "Email",
  fEmailHint: "необязательно — для письма-подтверждения",
  fEmailPh: "vy@email.com",
  mailSubject: "Подтверждение регистрации полёта",
  mailIntro: "Спасибо за регистрацию полёта. Ваши данные:",
  mailRulesTitle: "Напоминание о правилах площадки",
  mailRulesGeneric: "Соблюдайте правила площадки и указания координаторов; летайте только в разрешённой зоне, со шлемом, рацией и запаской.",
  mailRulesLink: "Полные правила площадки",
  mailBack: "Следующую регистрацию можно сделать на",
  fLicence: "Свидетельство / уровень пилота",
  fLicencePh: "напр. P3, IPPI 4",
  fNote: "Примечание",
  fNotePh: "Когда будете на старте, с кем летите…",

  step4: "Сбор за площадку",
  modeDay: (p) => `За день · ${p}`,
  modeDayDesc: "Платите только за дни полётов.",
  modeMonth: (p) => `Абонемент на месяц · ${p}`,
  modeMonthDesc: "С первого дня полёта до того же числа следующего месяца, без ограничений.",
  modeYear: (p) => `Абонемент на год · ${p}`,
  modeYearDesc: "Целый год на выбранной площадке, без ограничений.",

  feeTitle: "Стоимость регистрации",
  feeLine: {
    hnaaFree: (n) => `Член HNAA, регистрация до 09:00 × ${n} дн.`,
    passCovered: (n) => `Действующий абонемент × ${n} дн.`,
    day: (n) => `Сбор за площадку × ${n} дн.`,
    month: () => "Абонемент на месяц",
    year: () => "Абонемент на год",
  },
  feeTotal: "Итого",
  feeFree: "Бесплатно",
  feeLoading: "Расчёт…",
  feeEmpty: "Выберите площадку и даты, чтобы увидеть стоимость.",
  passNotice: (d) => `Абонемент действует до ${d}`,
  newPassNotice: (f, t) => `Ваш абонемент действует с ${f} по ${t} включительно. Последующие регистрации в этот период будут бесплатными автоматически.`,
  autoMonthNotice: "От 8 дней абонемент на месяц выгоднее — мы переключили вас на него.",
  hnaaLateNotice: "В день полёта уже больше 09:00, поэтому за этот день члены HNAA платят обычный сбор.",

  submit: "Отправить регистрацию",
  submitting: "Отправка…",
  submitFoot: "Сумма рассчитывается по времени сервера в момент отправки.",
  needHelp: "Нужна помощь? Звоните",

  natAsk: "Вы",
  natVn: "Гражданин Вьетнама",
  natForeign: "Иностранец",
  natForeignHint: "Иностранные пилоты обязаны указать гражданство и номер паспорта.",
  fNationalityPh: "напр. Россия, Корея",
  fPassport: "Номер паспорта",
  fPassportPh: "Номер паспорта",

  knowTitle: "Знания о парапланеризме",
  knowMain: "Все материалы о парапланеризме",
  knowLinks: {"weather": "Метеорология для пилотов", "wind": "Ветер и градиент ветра", "thermal": "Полёты в термиках", "active": "Активное пилотирование: тангаж", "p3p4": "Техника P3–P4 и путь к лицензии"},

  radioTitle: "Основные частоты раций",
  emergencyTitle: "Экстренная горячая линия",
  calFullForecast: "Подробный прогноз",

  todayTitle: (n) => `Сегодня зарегистрировались пилотов: ${n} —`,
  todayNone: "Сегодня ещё никто не зарегистрировал полёт.",

  payBeforeTitle: "Оплата до отправки",
  payBeforeHint: "Отсканируйте QR-код и переведите оплату, затем отметьте поле ниже, чтобы отправить регистрацию.",
  payNeedPhone: "Введите телефон на шаге 3, чтобы показать QR-код для оплаты.",
  payConfirmLabel: "Я оплатил(а) сбор за регистрацию",
  payConfirmFirst: "Оплатите и отметьте «Я оплатил(а) сбор за регистрацию», чтобы отправить.",
  memberPendingBlock: "Подтвердите номер телефона члена HNAA или удалите код, если вы не член HNAA.",
  okPendingPay: "Регистрация принята, ожидается подтверждение оплаты",
  okPendingPayDesc: "Координаторы проверят перевод и подтвердят.",

  err: {
    spot: "Выберите площадку",
    dates: "Выберите даты полётов",
    datesPast: "Нельзя зарегистрировать полёт на прошедшую дату",
    memberInvalid: "Неверный членский номер",
    name: "Введите полное имя",
    id: "Введите номер удостоверения/паспорта",
    phone: "Введите номер телефона",
    phoneBad: "Номер телефона указан неверно",
    emergencyPhone: "Введите экстренный телефон",
    nationality: "Иностранные пилоты обязаны указать гражданство",
    payConfirm: "Оплатите и отметьте подтверждение перед отправкой",
    amountChanged: "Сумма изменилась — оплатите по новому QR-коду и снова отметьте поле",
    memberPhone: "Введите зарегистрированный телефон члена для подтверждения",
    phoneMismatch: "Номер телефона не совпадает с этим членом",
    phoneLocked: "Слишком много неверных номеров — код члена заблокирован на 15 минут",
    rules: "Прочитайте и примите правила площадки Вьен Нам",
    email: "Адрес email указан неверно",
    server: "Не удалось отправить регистрацию, попробуйте ещё раз",
    rate: "Слишком много попыток, попробуйте через несколько минут",
    network: "Ошибка сети, попробуйте ещё раз",
  },

  okTitle: "Регистрация принята!",
  okSubtitle: "Удачного полёта. Сохраните код регистрации ниже.",
  okCode: "Код регистрации",
  okSpot: "Площадка",
  okDates: "Даты полётов",
  okFeeMode: {
    hnaa_free: "Член HNAA — бесплатно",
    pass: "Абонемент — бесплатно",
    day: "За день",
    month: "Абонемент на месяц",
    year: "Абонемент на год",
  },
  payTitle: "Оплата сбора переводом",
  payScanHint: "Откройте банковское приложение и отсканируйте — сумма и назначение уже заполнены.",
  payMaking: "Создаём код…",
  payBank: "Банк",
  payAccount: "Номер счёта",
  payOwner: "Владелец счёта",
  payNote: "Назначение",
  noFeeTitle: "Оплата не требуется",
  noFeeDesc: "Ваша регистрация полёта записана.",
  againBtn: "Ещё одна регистрация",
  callBtn: "Позвонить координатору",
};

const zh: BaoBayDict = {
  altHero: "滑翔伞飞行场地",
  altQr: "转账二维码",
  heroBadge: "🪂 独立飞行员专用",
  heroTitle: "飞行登记",
  heroPlaces: "Vien Nam · 考帕 · 管坝",
  heroNote: "起飞前完成飞行登记并缴纳场地费",
  heroCta: "立即登记",

  formTitle: "飞行登记表",
  formSubtitle: "选择场地和日期、填写信息——费用和二维码会立即显示在下方。",

  step1: "选择飞行场地",
  spotName: { "vien-nam": "Vien Nam", "khau-pha": "考帕 Khau Pha", "quan-ba": "管坝 Quan Ba" },
  spotArea: {
    "vien-nam": "河内附近",
    "khau-pha": "木江界",
    "quan-ba": "河江",
  },
  priceShort: { day: "10万/天", month: "80万/月", year: "250万/年" },
  hnaaTag: "HNAA 会员免费",

  forecastOpen: (s) => `${s} 天气预报`,
  forecastClose: "收起预报",
  forecastLoading: "正在加载预报…",
  forecastSectionTitle: "3 个场地的天气预报",
  forecastSectionHint: "点击场地即可展开完整预报。",

  step2: "选择飞行日期",
  step2Hint: "点选所有要飞的日期，无需连续。",
  pickSpotFirst: "请先选择场地。",
  months: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
  weekdays: ["一", "二", "三", "四", "五", "六", "日"],
  chosenDays: (n) => `已选 ${n} 天：`,

  step3: "飞行员信息",
  hnaaLabel: "HNAA 会员编号",
  hnaaHint: "如果您是 HNAA 会员，请填写会员编号以免费登记。",
  hnaaCutoff: "仅在飞行当天 09:00 之前登记才免费。登记之后日期的飞行则随时都来得及。",
  hnaaWarn: "会员登记后不飞行属虚假登记，多次违规将被拒绝登记。",
  hnaaPh: "例如 HNAA-01",
  hnaaCheck: "验证",
  hnaaChecking: "验证中…",
  hnaaOk: "已确认 HNAA 会员身份",
  hnaaWrong: "会员编号不正确",
  hnaaWrongContinue: "您仍可在下方自行填写信息并缴费完成登记。",
  hnaaChange: "输入其他编号",
  memberId: "身份证 / 护照",
  memberPhone: "电话",
  memberNeedMore: "会员名单缺少以下信息，请补充：",
  memberCodeFound: (c) => `会员编号 ${c} 有效`,
  memberPhoneLabel: "请输入您登记的会员电话号码以确认",
  memberPhoneNoFile: "会员名单中尚无您的电话号码——请输入您的电话以继续。",
  memberConfirm: "确认",
  memberPhoneUnverified: "会员名单中尚无该电话——调度人员稍后核对。",
  savedPrefilled: "已按您上次登记预填",
  savedClear: "清除已保存的信息",
  savedNotYou: "不是您？",
  rulesAccept: "我同意严格遵守 Vien Nam 飞行场地的全部规章",
  rulesScrollHint: "在框内滚动以阅读全部规章",
  rulesTapZoom: "点击放大",

  fFullName: "姓名",
  fFullNamePh: "张三",
  fId: "身份证 / 护照号码",
  fIdHint: "用于保险及月票/年票",
  fIdPh: "E12345678",
  fNationality: "国籍",
  fPhone: "电话号码",
  fPhonePh: "+84 912 345 678",
  fEmergencyPhone: "紧急联系电话",
  fEmergencyPhonePh: "家人 / 飞友",
  fWing: "伞翼级别",
  wingPpg: "动力伞翼",
  fEmail: "电子邮箱",
  fEmailHint: "选填——用于接收确认邮件",
  fEmailPh: "you@email.com",
  mailSubject: "飞行登记确认",
  mailIntro: "感谢您的飞行登记。以下是您的登记信息：",
  mailRulesTitle: "场地规章提醒",
  mailRulesGeneric: "请遵守场地规章和调度指示；只在允许区域内飞行，并配备头盔、对讲机和备份伞。",
  mailRulesLink: "查看完整场地规章",
  mailBack: "下次登记请访问",
  fLicence: "执照 / 飞行员等级",
  fLicencePh: "例如 P3、IPPI 4",
  fNote: "备注",
  fNotePh: "预计到达起飞场时间、同行飞友…",

  step4: "场地费",
  modeDay: (p) => `按天 · ${p}`,
  modeDayDesc: "飞哪天付哪天。",
  modeMonth: (p) => `月票 · ${p}`,
  modeMonthDesc: "从第一个飞行日到下月同一天，不限次数。",
  modeYear: (p) => `年票 · ${p}`,
  modeYearDesc: "在所选场地整年不限次数飞行。",

  feeTitle: "登记费用",
  feeLine: {
    hnaaFree: (n) => `HNAA 会员 09:00 前登记 × ${n} 天`,
    passCovered: (n) => `有效月票/年票 × ${n} 天`,
    day: (n) => `场地费 × ${n} 天`,
    month: () => "月票",
    year: () => "年票",
  },
  feeTotal: "合计",
  feeFree: "免费",
  feeLoading: "计算中…",
  feeEmpty: "选择场地和日期即可查看费用。",
  passNotice: (d) => `月票/年票有效期至 ${d}`,
  newPassNotice: (f, t) => `您的票自 ${f} 起至 ${t}（含）有效。此期间内之后的登记将自动免费。`,
  autoMonthNotice: "满 8 天时月票更划算——已自动为您改为月票。",
  hnaaLateNotice: "飞行当天已过 09:00，因此当天 HNAA 会员也需按普通标准缴费。",

  submit: "提交登记",
  submitting: "提交中…",
  submitFoot: "费用按提交时服务器时间计算。",
  needHelp: "需要帮助请致电",

  natAsk: "您是",
  natVn: "越南公民",
  natForeign: "外国人",
  natForeignHint: "外国飞行员必须填写国籍和护照号码。",
  fNationalityPh: "例如：中国、韩国",
  fPassport: "护照号码",
  fPassportPh: "护照号码",

  knowTitle: "滑翔伞知识",
  knowMain: "查看全部滑翔伞知识",
  knowLinks: {"weather": "滑翔伞气象", "wind": "风与风梯度", "thermal": "热气流飞行", "active": "主动飞行：俯仰控制", "p3p4": "P3–P4 技术与执照路线"},

  radioTitle: "常用对讲机频率",
  emergencyTitle: "紧急热线",
  calFullForecast: "查看详细预报",

  todayTitle: (n) => `今天已有 ${n} 位飞行员登记：`,
  todayNone: "今天还没有人登记。",

  payBeforeTitle: "先付款再提交",
  payBeforeHint: "扫描二维码转账，然后勾选下方确认框即可提交登记。",
  payNeedPhone: "请在第 3 步填写电话号码以显示付款二维码。",
  payConfirmLabel: "我已支付登记费",
  payConfirmFirst: "请先付款并勾选“我已支付登记费”再提交。",
  memberPendingBlock: "请确认会员登记的电话号码；若您不是 HNAA 会员，请清除会员编号。",
  okPendingPay: "已收到登记，等待付款确认",
  okPendingPayDesc: "调度人员将核对转账并确认。",

  err: {
    spot: "请选择飞行场地",
    dates: "请选择飞行日期",
    datesPast: "不能为已过去的日期登记",
    memberInvalid: "会员编号不正确",
    name: "请填写姓名",
    id: "请填写身份证/护照号码",
    phone: "请填写电话号码",
    phoneBad: "电话号码格式不正确",
    emergencyPhone: "请填写紧急联系电话",
    nationality: "外国飞行员必须填写国籍",
    payConfirm: "提交前请先付款并勾选确认框",
    amountChanged: "费用刚刚发生变化——请按新的二维码付款并重新勾选确认框",
    memberPhone: "请输入会员登记的电话号码以确认",
    phoneMismatch: "电话号码与该会员不符",
    phoneLocked: "电话号码错误次数过多——该会员编号锁定 15 分钟",
    rules: "请阅读并同意 Vien Nam 飞行场地规章",
    email: "电子邮箱格式不正确",
    server: "登记提交失败，请重试",
    rate: "操作过于频繁，请几分钟后再试",
    network: "网络错误，请重试",
  },

  okTitle: "已收到飞行登记！",
  okSubtitle: "祝您飞行平安。请保存下方的登记编号。",
  okCode: "登记编号",
  okSpot: "场地",
  okDates: "飞行日期",
  okFeeMode: {
    hnaa_free: "HNAA 会员 — 免费",
    pass: "已有月票/年票 — 免费",
    day: "按天",
    month: "月票",
    year: "年票",
  },
  payTitle: "转账缴纳场地费",
  payScanHint: "打开银行 App 扫码——金额和附言已自动填好。",
  payMaking: "正在生成二维码…",
  payBank: "银行",
  payAccount: "账号",
  payOwner: "户名",
  payNote: "附言",
  noFeeTitle: "无需缴费",
  noFeeDesc: "您的飞行登记已记录。",
  againBtn: "再登记一次",
  callBtn: "致电调度",
};

const hi: BaoBayDict = {
  altHero: "पैराग्लाइडिंग साइट",
  altQr: "बैंक ट्रांसफ़र QR कोड",
  heroBadge: "🪂 सोलो पायलटों के लिए",
  heroTitle: "उड़ान पंजीकरण",
  heroPlaces: "विएन नाम · खाउ फ़ा · क्वान बा",
  heroNote: "टेक-ऑफ़ से पहले उड़ान पंजीकरण करें और साइट शुल्क चुकाएँ",
  heroCta: "पंजीकरण करें",

  formTitle: "उड़ान पंजीकरण फ़ॉर्म",
  formSubtitle: "साइट और तारीखें चुनें, विवरण भरें — शुल्क और QR कोड नीचे तुरंत दिखेंगे।",

  step1: "उड़ान साइट चुनें",
  spotName: { "vien-nam": "विएन नाम", "khau-pha": "खाउ फ़ा", "quan-ba": "क्वान बा" },
  spotArea: {
    "vien-nam": "हनोई के पास",
    "khau-pha": "मु कांग चाई",
    "quan-ba": "हा जियांग",
  },
  priceShort: { day: "100k/दिन", month: "800k/माह", year: "2.5M/वर्ष" },
  hnaaTag: "HNAA सदस्य निःशुल्क",

  forecastOpen: (s) => `${s} का मौसम पूर्वानुमान`,
  forecastClose: "पूर्वानुमान छिपाएँ",
  forecastLoading: "पूर्वानुमान लोड हो रहा है…",
  forecastSectionTitle: "3 साइटों का पूर्वानुमान",
  forecastSectionHint: "पूरा पूर्वानुमान खोलने के लिए साइट पर टैप करें।",

  step2: "उड़ान की तारीखें चुनें",
  step2Hint: "जिन दिनों उड़ेंगे उन पर टैप करें — लगातार होना ज़रूरी नहीं।",
  pickSpotFirst: "पहले साइट चुनें।",
  months: ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"],
  weekdays: ["सो", "मं", "बु", "गु", "शु", "श", "र"],
  chosenDays: (n) => `${n} दिन चुने गए:`,

  step3: "पायलट विवरण",
  hnaaLabel: "HNAA सदस्य कोड",
  hnaaHint: "यदि आप HNAA सदस्य हैं, तो निःशुल्क उड़ान पंजीकरण के लिए अपना सदस्य कोड दर्ज करें।",
  hnaaCutoff: "निःशुल्क केवल तब, जब पंजीकरण उड़ान वाले दिन सुबह 09:00 से पहले किया जाए। आगे की तारीखों के लिए पंजीकरण हमेशा समय पर है।",
  hnaaWarn: "जो सदस्य पंजीकरण करके उड़ान नहीं भरते, बार-बार उल्लंघन पर उनका पंजीकरण अस्वीकार कर दिया जाएगा।",
  hnaaPh: "जैसे HNAA-01",
  hnaaCheck: "जाँचें",
  hnaaChecking: "जाँच हो रही है…",
  hnaaOk: "HNAA सदस्यता की पुष्टि हुई",
  hnaaWrong: "सदस्य कोड ग़लत है",
  hnaaWrongContinue: "आप नीचे अपना विवरण भरकर और शुल्क चुकाकर फिर भी पंजीकरण कर सकते हैं।",
  hnaaChange: "दूसरा कोड डालें",
  memberId: "पहचान पत्र / पासपोर्ट",
  memberPhone: "फ़ोन",
  memberNeedMore: "सदस्य सूची में यह जानकारी नहीं है, कृपया जोड़ें:",
  memberCodeFound: (c) => `कोड ${c} मिला`,
  memberPhoneLabel: "पुष्टि के लिए अपना पंजीकृत फ़ोन नंबर दर्ज करें",
  memberPhoneNoFile: "सदस्य सूची में अभी आपका नंबर नहीं है — जारी रखने के लिए अपना फ़ोन दर्ज करें।",
  memberConfirm: "पुष्टि करें",
  memberPhoneUnverified: "फ़ोन सदस्य सूची में नहीं है — समन्वयक बाद में जाँचेंगे।",
  savedPrefilled: "आपके पिछले पंजीकरण से भरा गया",
  savedClear: "सहेजी जानकारी हटाएँ",
  savedNotYou: "आप नहीं हैं?",
  rulesAccept: "मैं विएन नाम उड़ान स्थल के सभी नियमों का सख़्ती से पालन करने के लिए सहमत हूँ",
  rulesScrollHint: "सभी नियम पढ़ने के लिए बॉक्स में स्क्रॉल करें",
  rulesTapZoom: "बड़ा करने के लिए टैप करें",

  fFullName: "पूरा नाम",
  fFullNamePh: "राहुल शर्मा",
  fId: "पहचान पत्र / पासपोर्ट नंबर",
  fIdHint: "बीमा और मासिक/वार्षिक पास के लिए",
  fIdPh: "C1234567",
  fNationality: "राष्ट्रीयता",
  fPhone: "फ़ोन नंबर",
  fPhonePh: "+84 912 345 678",
  fEmergencyPhone: "आपातकालीन फ़ोन",
  fEmergencyPhonePh: "परिजन / उड़ान साथी",
  fWing: "विंग श्रेणी",
  wingPpg: "PPG विंग",
  fEmail: "ईमेल",
  fEmailHint: "वैकल्पिक — पुष्टि पाने के लिए",
  fEmailPh: "you@email.com",
  mailSubject: "उड़ान पंजीकरण की पुष्टि",
  mailIntro: "उड़ान पंजीकरण के लिए धन्यवाद। आपका विवरण:",
  mailRulesTitle: "साइट नियमों की याद",
  mailRulesGeneric: "साइट नियमों और समन्वयकों के निर्देशों का पालन करें; केवल अनुमत क्षेत्र में, हेलमेट, रेडियो और रिज़र्व के साथ उड़ें।",
  mailRulesLink: "साइट के पूरे नियम पढ़ें",
  mailBack: "अगला पंजीकरण यहाँ करें",
  fLicence: "लाइसेंस / पायलट स्तर",
  fLicencePh: "जैसे P3, IPPI 4",
  fNote: "टिप्पणी",
  fNotePh: "लॉन्च पर पहुँचने का समय, किसके साथ उड़ रहे हैं…",

  step4: "साइट शुल्क",
  modeDay: (p) => `प्रति दिन · ${p}`,
  modeDayDesc: "केवल उड़ान वाले दिनों का भुगतान।",
  modeMonth: (p) => `मासिक पास · ${p}`,
  modeMonthDesc: "पहले उड़ान दिवस से अगले महीने की उसी तारीख तक, असीमित उड़ान।",
  modeYear: (p) => `वार्षिक पास · ${p}`,
  modeYearDesc: "चुनी गई साइट पर पूरा एक वर्ष, असीमित उड़ान।",

  feeTitle: "पंजीकरण शुल्क",
  feeLine: {
    hnaaFree: (n) => `HNAA सदस्य, 09:00 से पहले पंजीकरण × ${n} दिन`,
    passCovered: (n) => `मान्य मासिक/वार्षिक पास × ${n} दिन`,
    day: (n) => `साइट शुल्क × ${n} दिन`,
    month: () => "मासिक पास",
    year: () => "वार्षिक पास",
  },
  feeTotal: "कुल",
  feeFree: "निःशुल्क",
  feeLoading: "गणना हो रही है…",
  feeEmpty: "शुल्क देखने के लिए साइट और तारीखें चुनें।",
  passNotice: (d) => `मासिक/वार्षिक पास ${d} तक मान्य`,
  newPassNotice: (f, t) => `आपका पास ${f} से ${t} तक (सहित) मान्य है। इस अवधि में आगे के पंजीकरण अपने-आप निःशुल्क होंगे।`,
  autoMonthNotice: "8 दिन या अधिक पर मासिक पास सस्ता है — आपके लिए मासिक पास चुन लिया गया।",
  hnaaLateNotice: "उड़ान वाले दिन 09:00 बज चुके हैं, इसलिए उस दिन HNAA सदस्य भी सामान्य शुल्क देंगे।",

  submit: "उड़ान पंजीकरण भेजें",
  submitting: "भेजा जा रहा है…",
  submitFoot: "शुल्क भेजने के समय सर्वर घड़ी के अनुसार गिना जाता है।",
  needHelp: "मदद चाहिए? कॉल करें",

  natAsk: "आप हैं",
  natVn: "वियतनामी",
  natForeign: "विदेशी",
  natForeignHint: "विदेशी पायलटों को राष्ट्रीयता और पासपोर्ट नंबर बताना अनिवार्य है।",
  fNationalityPh: "जैसे भारत, कोरिया",
  fPassport: "पासपोर्ट नंबर",
  fPassportPh: "पासपोर्ट नंबर",

  knowTitle: "पैराग्लाइडिंग ज्ञान",
  knowMain: "पैराग्लाइडिंग का पूरा ज्ञान",
  knowLinks: {"weather": "पैराग्लाइडिंग मौसम विज्ञान", "wind": "हवा और हवा का ग्रेडिएंट", "thermal": "थर्मल उड़ान", "active": "सक्रिय उड़ान: पिच नियंत्रण", "p3p4": "P3–P4 तकनीक और लाइसेंस मार्ग"},

  radioTitle: "सामान्य रेडियो आवृत्तियाँ",
  emergencyTitle: "आपातकालीन हेल्पलाइन",
  calFullForecast: "पूरा पूर्वानुमान देखें",

  todayTitle: (n) => `आज ${n} पायलटों ने उड़ान पंजीकरण किया:`,
  todayNone: "आज अभी तक किसी ने पंजीकरण नहीं किया।",

  payBeforeTitle: "भेजने से पहले भुगतान करें",
  payBeforeHint: "QR कोड स्कैन करके ट्रांसफ़र करें, फिर पंजीकरण भेजने के लिए नीचे का बॉक्स टिक करें।",
  payNeedPhone: "भुगतान QR कोड देखने के लिए चरण 3 में फ़ोन नंबर दर्ज करें।",
  payConfirmLabel: "मैंने पंजीकरण शुल्क चुका दिया है",
  payConfirmFirst: "भेजने के लिए भुगतान करें और “मैंने पंजीकरण शुल्क चुका दिया है” टिक करें।",
  memberPendingBlock: "सदस्य का पंजीकृत फ़ोन नंबर पुष्टि करें, या यदि आप HNAA सदस्य नहीं हैं तो सदस्य कोड हटा दें।",
  okPendingPay: "पंजीकरण मिल गया, भुगतान की पुष्टि बाकी है",
  okPendingPayDesc: "समन्वयक आपका ट्रांसफ़र जाँचकर पुष्टि करेंगे।",

  err: {
    spot: "कृपया साइट चुनें",
    dates: "कृपया उड़ान की तारीखें चुनें",
    datesPast: "बीती तारीख के लिए पंजीकरण नहीं किया जा सकता",
    memberInvalid: "सदस्य कोड ग़लत है",
    name: "कृपया पूरा नाम दर्ज करें",
    id: "कृपया पहचान पत्र/पासपोर्ट नंबर दर्ज करें",
    phone: "कृपया फ़ोन नंबर दर्ज करें",
    phoneBad: "फ़ोन नंबर सही नहीं लगता",
    emergencyPhone: "कृपया आपातकालीन फ़ोन दर्ज करें",
    nationality: "विदेशी पायलटों को राष्ट्रीयता बतानी होगी",
    payConfirm: "भेजने से पहले भुगतान करें और पुष्टि बॉक्स टिक करें",
    amountChanged: "शुल्क अभी बदल गया है — नए QR कोड से भुगतान करें और बॉक्स फिर से टिक करें",
    memberPhone: "पुष्टि के लिए सदस्य का पंजीकृत फ़ोन दर्ज करें",
    phoneMismatch: "फ़ोन नंबर इस सदस्य से मेल नहीं खाता",
    phoneLocked: "बहुत बार ग़लत फ़ोन नंबर — यह सदस्य कोड 15 मिनट के लिए लॉक है",
    rules: "कृपया विएन नाम उड़ान स्थल के नियम पढ़कर स्वीकार करें",
    email: "ईमेल पता सही नहीं लगता",
    server: "पंजीकरण नहीं भेजा जा सका, कृपया फिर कोशिश करें",
    rate: "बहुत अधिक प्रयास, कुछ मिनट बाद फिर कोशिश करें",
    network: "नेटवर्क त्रुटि, कृपया फिर कोशिश करें",
  },

  okTitle: "उड़ान पंजीकरण मिल गया!",
  okSubtitle: "सुरक्षित उड़ान हो। नीचे दिया पंजीकरण कोड सँभाल कर रखें।",
  okCode: "पंजीकरण कोड",
  okSpot: "साइट",
  okDates: "उड़ान की तारीखें",
  okFeeMode: {
    hnaa_free: "HNAA सदस्य — निःशुल्क",
    pass: "मासिक/वार्षिक पास — निःशुल्क",
    day: "प्रति दिन",
    month: "मासिक पास",
    year: "वार्षिक पास",
  },
  payTitle: "बैंक ट्रांसफ़र से साइट शुल्क चुकाएँ",
  payScanHint: "अपना बैंकिंग ऐप खोलें और स्कैन करें — राशि और संदेश पहले से भरे हैं।",
  payMaking: "कोड बन रहा है…",
  payBank: "बैंक",
  payAccount: "खाता संख्या",
  payOwner: "खाताधारक",
  payNote: "संदेश",
  noFeeTitle: "कोई शुल्क नहीं",
  noFeeDesc: "आपका उड़ान पंजीकरण दर्ज हो गया है।",
  againBtn: "एक और पंजीकरण करें",
  callBtn: "समन्वयक को कॉल करें",
};

const DICTS: Record<BaoBayLang, BaoBayDict> = { vi, en, fr, ru, zh, hi };

/** Bảng chữ theo ngôn ngữ đang xem; ngôn ngữ lạ thì về tiếng Việt. */
export function baoBayDict(lang: unknown): BaoBayDict {
  const code = String(lang ?? "vi").slice(0, 2).toLowerCase() as BaoBayLang;
  return DICTS[code] ?? vi;
}

/* ------------------------------------------------------------------ *
 * SONG NGỮ trên bản tiếng Việt
 * ------------------------------------------------------------------ */

/** Một câu hiện ra: chữ chính + (bản tiếng Anh đi kèm khi đang xem tiếng Việt). */
export type BiText = { main: string; sub?: string };

/**
 * Bản tiếng Việt hiện KÈM tiếng Anh (chủ 30/09): Viên Nam có nhiều phi công
 * nước ngoài ở Hà Nội mở link tiếng Việt do bạn bay gửi qua Zalo, không biết
 * đổi ngôn ngữ. Tiếng Việt vẫn là chữ chính, tiếng Anh nhỏ và nhạt bên dưới.
 * Năm ngôn ngữ còn lại giữ một thứ tiếng như cũ.
 *
 * Không chép thêm bảng chữ nào: `pick` là hàm lấy đúng một ô trong bảng, gọi
 * trên cả bảng vi lẫn en — thêm câu mới vào bảng là tự có đủ hai thứ tiếng.
 */
function boDau(x: string): string {
  return String(x ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function baoBayBilingual(lang: unknown) {
  const T = baoBayDict(lang);
  const isVi = String(lang ?? "vi").slice(0, 2).toLowerCase() === "vi" || T === vi;
  const E = isVi ? en : null;

  /**
   * BỎ BẢN TIẾNG ANH khi nó chỉ là tiếng Việt bỏ dấu (chủ 01/10: "Khau Phạ /
   * Khau Pha", "Hà Giang / Ha Giang" lặp chữ vô ích) — so sau khi bỏ dấu, đổi
   * đ→d, chữ thường, bỏ dấu câu/khoảng trắng.
   */
  const trung = (a: string, c: string) => boDau(a) === boDau(c);

  /** Cho chỗ vẽ được hai tầng (tiêu đề, nhãn, nút, dòng phí…). */
  const b = (pick: (d: BaoBayDict) => string): BiText => {
    const main = pick(T);
    if (!E) return { main };
    const sub = pick(E);
    return trung(main, sub) ? { main } : { main, sub };
  };

  /** Cho chỗ chỉ nhận một chuỗi (placeholder, thông báo lỗi, alt ảnh). */
  const s = (pick: (d: BaoBayDict) => string, sep = " · "): string => {
    const main = pick(T);
    if (!E) return main;
    const sub = pick(E);
    return trung(main, sub) ? main : `${main}${sep}${sub}`;
  };

  return { T, isVi, b, s };
}
