// lib/i18n/bao-bay.ts
/**
 * Chữ trên trang /baobay theo 6 ngôn ngữ (vi, en, fr, ru, zh, hi).
 *
 * Để riêng khỏi lib/i18n/pilot-event (bảng chữ của /muavang) để sửa trang này
 * không bao giờ đụng tới trang kia. Thư nội bộ và trang quản trị vẫn tiếng
 * Việt — chúng lấy nhãn từ lib/bao-bay.ts.
 */
import type { BaoBayLineKey, BaoBaySpot, FeeMode } from "@/lib/bao-bay";

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
  spotPrices: Record<BaoBaySpot, string>;
  hnaaBadge: string;

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
  payLater: string;
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
  heroPlaces: "Viên Nam · Khau Phạ · Quản Bạ",
  heroNote: "Báo bay và đóng phí điểm bay trước khi cất cánh",
  heroCta: "Báo bay ngay",

  formTitle: "Phiếu báo bay",
  formSubtitle: "Chọn điểm bay, ngày bay, điền thông tin — phí và mã QR hiện ngay bên dưới.",

  step1: "Chọn điểm bay",
  spotName: { "vien-nam": "Viên Nam", "khau-pha": "Khau Phạ", "quan-ba": "Quản Bạ" },
  spotArea: {
    "vien-nam": "Gần Hà Nội",
    "khau-pha": "Mù Cang Chải",
    "quan-ba": "Hà Giang",
  },
  spotPrices: {
    "vien-nam": "100.000 đ/ngày · 800.000 đ/tháng · 2.500.000 đ/năm",
    "khau-pha": "100.000 đ/ngày · 800.000 đ/tháng",
    "quan-ba": "100.000 đ/ngày · 800.000 đ/tháng",
  },
  hnaaBadge: "Hội viên HNAA miễn phí",

  step2: "Chọn ngày bay",
  step2Hint: "Bấm vào các ngày bạn sẽ bay, không cần liền nhau.",
  pickSpotFirst: "Chọn điểm bay trước.",
  months: ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"],
  weekdays: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
  chosenDays: (n) => `Đã chọn ${n} ngày:`,

  step3: "Thông tin báo bay",
  hnaaLabel: "Mã hội viên HNAA",
  hnaaHint: "Nếu bạn là Hội viên HNAA hãy điền mã hội viên để được miễn phí báo bay.",
  hnaaCutoff: "Chỉ miễn phí khi báo bay TRƯỚC 8h00 sáng ngày bay (giờ Việt Nam). Báo cho các ngày sau thì lúc nào cũng được.",
  hnaaWarn: "Báo bay ảo mà không đi bay, vi phạm nhiều lần sẽ bị từ chối báo bay.",
  hnaaPh: "Ví dụ: HN123",
  hnaaCheck: "Kiểm tra",
  hnaaChecking: "Đang kiểm tra…",
  hnaaOk: "Đã xác nhận hội viên HNAA",
  hnaaWrong: "Mã hội viên không đúng",
  hnaaWrongContinue: "Bạn vẫn có thể báo bay bằng cách tự điền thông tin bên dưới và đóng phí.",
  hnaaChange: "Nhập mã khác",
  memberId: "CCCD/Hộ chiếu",
  memberPhone: "Điện thoại",
  memberNeedMore: "Danh sách hội còn thiếu thông tin này, vui lòng điền thêm:",

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
  modeYearDesc: "Trọn một năm tại Viên Nam, bay không giới hạn.",

  feeTitle: "Chi phí báo bay",
  feeLine: {
    hnaaFree: (n) => `Hội viên HNAA báo trước 8h00 × ${n} ngày`,
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
  hnaaLateNotice: "Đã qua 8h00 sáng ngày bay nên ngày đó hội viên HNAA cũng phải đóng phí như mọi phi công.",

  submit: "Gửi báo bay",
  submitting: "Đang gửi…",
  submitFoot: "Phí tính theo giờ máy chủ (giờ Việt Nam) tại thời điểm bấm gửi.",
  needHelp: "Cần hỗ trợ, gọi",

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
  payLater: "Chưa chuyển được ngay thì có thể trả tại bãi — báo bay vẫn được ghi nhận.",
  noFeeTitle: "Không phải đóng phí",
  noFeeDesc: "Báo bay của bạn đã được ghi nhận.",
  againBtn: "Báo bay khác",
  callBtn: "Gọi điều phối",
};

const en: BaoBayDict = {
  altHero: "Paragliding site",
  altQr: "Bank transfer QR code",
  heroBadge: "🪂 For solo pilots",
  heroTitle: "Flight notice",
  heroPlaces: "Vien Nam · Khau Pha · Quan Ba",
  heroNote: "Submit your flight notice and pay the site fee before take-off",
  heroCta: "Submit a notice",

  formTitle: "Flight notice form",
  formSubtitle: "Choose a site and dates, fill in your details — the fee and QR code appear right below.",

  step1: "Choose a flying site",
  spotName: { "vien-nam": "Vien Nam", "khau-pha": "Khau Pha", "quan-ba": "Quan Ba" },
  spotArea: {
    "vien-nam": "Near Hanoi",
    "khau-pha": "Mu Cang Chai",
    "quan-ba": "Ha Giang",
  },
  spotPrices: {
    "vien-nam": "100,000 đ/day · 800,000 đ/month · 2,500,000 đ/year",
    "khau-pha": "100,000 đ/day · 800,000 đ/month",
    "quan-ba": "100,000 đ/day · 800,000 đ/month",
  },
  hnaaBadge: "Free for HNAA members",

  step2: "Choose your flying dates",
  step2Hint: "Tap every day you will fly — they don't need to be consecutive.",
  pickSpotFirst: "Choose a site first.",
  months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  weekdays: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
  chosenDays: (n) => `${n} day${n === 1 ? "" : "s"} selected:`,

  step3: "Pilot details",
  hnaaLabel: "HNAA member code",
  hnaaHint: "If you are an HNAA member, enter your member code to fly for free.",
  hnaaCutoff: "Free only when the notice is submitted BEFORE 08:00 on the flying day (Vietnam time). Notices for later days are always in time.",
  hnaaWarn: "Submitting notices without actually flying — repeat offenders will have their notices refused.",
  hnaaPh: "e.g. HN123",
  hnaaCheck: "Check",
  hnaaChecking: "Checking…",
  hnaaOk: "HNAA membership confirmed",
  hnaaWrong: "Incorrect member code",
  hnaaWrongContinue: "You can still submit by filling in your details below and paying the fee.",
  hnaaChange: "Use another code",
  memberId: "ID / Passport",
  memberPhone: "Phone",
  memberNeedMore: "The member list is missing this information, please add it:",

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
  modeYearDesc: "A full year at Vien Nam, unlimited flying.",

  feeTitle: "Notice fee",
  feeLine: {
    hnaaFree: (n) => `HNAA member, submitted before 08:00 × ${n} day${n === 1 ? "" : "s"}`,
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
  newPassNotice: (f, t) => `Your pass is valid from ${f} through ${t}. Later notices within this period are free automatically.`,
  autoMonthNotice: "From 8 days a month pass is cheaper — switched to a month pass for you.",
  hnaaLateNotice: "It is already past 08:00 on the flying day, so HNAA members pay the normal fee for that day.",

  submit: "Submit flight notice",
  submitting: "Submitting…",
  submitFoot: "The fee is calculated with the server clock (Vietnam time) at the moment you submit.",
  needHelp: "Need help? Call",

  err: {
    spot: "Please choose a flying site",
    dates: "Please choose your flying dates",
    datesPast: "You cannot submit a notice for a past date",
    memberInvalid: "Incorrect member code",
    name: "Please enter your full name",
    id: "Please enter your ID/passport number",
    phone: "Please enter your phone number",
    phoneBad: "This phone number doesn't look right",
    emergencyPhone: "Please enter an emergency phone number",
    server: "Could not submit the notice, please try again",
    rate: "Too many attempts, please try again in a few minutes",
    network: "Network error, please try again",
  },

  okTitle: "Flight notice received!",
  okSubtitle: "Have a safe flight. Keep the notice code below.",
  okCode: "Notice code",
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
  payLater: "Can't transfer now? You can pay at the site — your notice is already recorded.",
  noFeeTitle: "No fee to pay",
  noFeeDesc: "Your flight notice has been recorded.",
  againBtn: "Submit another notice",
  callBtn: "Call the coordinator",
};

const fr: BaoBayDict = {
  altHero: "Site de parapente",
  altQr: "QR code de virement",
  heroBadge: "🪂 Pour les pilotes solo",
  heroTitle: "Déclaration de vol",
  heroPlaces: "Vien Nam · Khau Pha · Quan Ba",
  heroNote: "Déclarez votre vol et réglez la taxe de site avant de décoller",
  heroCta: "Déclarer un vol",

  formTitle: "Formulaire de déclaration",
  formSubtitle: "Choisissez le site et les dates, remplissez vos informations — le tarif et le QR code s'affichent juste en dessous.",

  step1: "Choisissez le site",
  spotName: { "vien-nam": "Vien Nam", "khau-pha": "Khau Pha", "quan-ba": "Quan Ba" },
  spotArea: {
    "vien-nam": "Près de Hanoï",
    "khau-pha": "Mu Cang Chai",
    "quan-ba": "Ha Giang",
  },
  spotPrices: {
    "vien-nam": "100 000 đ/jour · 800 000 đ/mois · 2 500 000 đ/an",
    "khau-pha": "100 000 đ/jour · 800 000 đ/mois",
    "quan-ba": "100 000 đ/jour · 800 000 đ/mois",
  },
  hnaaBadge: "Gratuit pour les membres HNAA",

  step2: "Choisissez vos dates de vol",
  step2Hint: "Touchez chaque jour où vous volerez — pas besoin de jours consécutifs.",
  pickSpotFirst: "Choisissez d'abord un site.",
  months: ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"],
  weekdays: ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"],
  chosenDays: (n) => `${n} jour${n > 1 ? "s" : ""} choisi${n > 1 ? "s" : ""} :`,

  step3: "Informations du pilote",
  hnaaLabel: "Numéro de membre HNAA",
  hnaaHint: "Si vous êtes membre de la HNAA, saisissez votre numéro de membre pour voler gratuitement.",
  hnaaCutoff: "Gratuit uniquement si la déclaration est envoyée AVANT 8h00 le jour du vol (heure du Vietnam). Pour les jours suivants, c'est toujours dans les temps.",
  hnaaWarn: "Déclarer sans voler réellement : en cas de récidive, vos déclarations seront refusées.",
  hnaaPh: "ex. HN123",
  hnaaCheck: "Vérifier",
  hnaaChecking: "Vérification…",
  hnaaOk: "Adhésion HNAA confirmée",
  hnaaWrong: "Numéro de membre incorrect",
  hnaaWrongContinue: "Vous pouvez tout de même déclarer en remplissant vos informations ci-dessous et en payant la taxe.",
  hnaaChange: "Saisir un autre numéro",
  memberId: "Pièce d'identité / Passeport",
  memberPhone: "Téléphone",
  memberNeedMore: "La liste des membres ne contient pas cette information, merci de la compléter :",

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
  modeYearDesc: "Une année complète à Vien Nam, vols illimités.",

  feeTitle: "Coût de la déclaration",
  feeLine: {
    hnaaFree: (n) => `Membre HNAA, déclaré avant 8h00 × ${n} jour${n > 1 ? "s" : ""}`,
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
  newPassNotice: (f, t) => `Votre forfait est valable du ${f} au ${t} inclus. Les déclarations suivantes sur cette période seront gratuites automatiquement.`,
  autoMonthNotice: "À partir de 8 jours, le forfait mois est moins cher — nous l'avons choisi pour vous.",
  hnaaLateNotice: "Il est déjà plus de 8h00 le jour du vol : ce jour-là, les membres HNAA paient la taxe normale.",

  submit: "Envoyer la déclaration",
  submitting: "Envoi…",
  submitFoot: "Le tarif est calculé selon l'horloge du serveur (heure du Vietnam) au moment de l'envoi.",
  needHelp: "Besoin d'aide ? Appelez le",

  err: {
    spot: "Veuillez choisir un site",
    dates: "Veuillez choisir vos dates de vol",
    datesPast: "Impossible de déclarer un vol pour une date passée",
    memberInvalid: "Numéro de membre incorrect",
    name: "Veuillez saisir votre nom complet",
    id: "Veuillez saisir votre n° de pièce d'identité/passeport",
    phone: "Veuillez saisir votre numéro de téléphone",
    phoneBad: "Ce numéro de téléphone semble incorrect",
    emergencyPhone: "Veuillez saisir un téléphone d'urgence",
    server: "Impossible d'envoyer la déclaration, veuillez réessayer",
    rate: "Trop de tentatives, réessayez dans quelques minutes",
    network: "Erreur réseau, veuillez réessayer",
  },

  okTitle: "Déclaration reçue !",
  okSubtitle: "Bon vol. Conservez le code de déclaration ci-dessous.",
  okCode: "Code de déclaration",
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
  payLater: "Impossible de virer maintenant ? Vous pouvez payer sur place — votre déclaration est déjà enregistrée.",
  noFeeTitle: "Rien à payer",
  noFeeDesc: "Votre déclaration de vol est enregistrée.",
  againBtn: "Nouvelle déclaration",
  callBtn: "Appeler le coordinateur",
};

const ru: BaoBayDict = {
  altHero: "Парапланерный старт",
  altQr: "QR-код для перевода",
  heroBadge: "🪂 Для самостоятельных пилотов",
  heroTitle: "Заявка на полёт",
  heroPlaces: "Вьен Нам · Кхау Фа · Куан Ба",
  heroNote: "Подайте заявку и оплатите сбор за площадку до старта",
  heroCta: "Подать заявку",

  formTitle: "Форма заявки на полёт",
  formSubtitle: "Выберите площадку и даты, заполните данные — сумма и QR-код появятся ниже.",

  step1: "Выберите площадку",
  spotName: { "vien-nam": "Вьен Нам", "khau-pha": "Кхау Фа", "quan-ba": "Куан Ба" },
  spotArea: {
    "vien-nam": "Рядом с Ханоем",
    "khau-pha": "Мукангчай",
    "quan-ba": "Хазянг",
  },
  spotPrices: {
    "vien-nam": "100 000 ₫/день · 800 000 ₫/месяц · 2 500 000 ₫/год",
    "khau-pha": "100 000 ₫/день · 800 000 ₫/месяц",
    "quan-ba": "100 000 ₫/день · 800 000 ₫/месяц",
  },
  hnaaBadge: "Бесплатно для членов HNAA",

  step2: "Выберите даты полётов",
  step2Hint: "Отметьте все дни, когда будете летать, — не обязательно подряд.",
  pickSpotFirst: "Сначала выберите площадку.",
  months: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
  weekdays: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
  chosenDays: (n) => `Выбрано дней: ${n} —`,

  step3: "Данные пилота",
  hnaaLabel: "Членский номер HNAA",
  hnaaHint: "Если вы член HNAA, введите членский номер, чтобы летать бесплатно.",
  hnaaCutoff: "Бесплатно, только если заявка подана ДО 08:00 в день полёта (время Вьетнама). Заявки на последующие дни всегда вовремя.",
  hnaaWarn: "Фиктивные заявки без полёта: при повторных нарушениях заявки будут отклоняться.",
  hnaaPh: "напр. HN123",
  hnaaCheck: "Проверить",
  hnaaChecking: "Проверка…",
  hnaaOk: "Членство HNAA подтверждено",
  hnaaWrong: "Неверный членский номер",
  hnaaWrongContinue: "Вы можете подать заявку, заполнив данные ниже и оплатив сбор.",
  hnaaChange: "Ввести другой номер",
  memberId: "Удостоверение / паспорт",
  memberPhone: "Телефон",
  memberNeedMore: "В списке членов нет этих данных, пожалуйста, дополните:",

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
  modeYearDesc: "Целый год во Вьен Нам, без ограничений.",

  feeTitle: "Стоимость",
  feeLine: {
    hnaaFree: (n) => `Член HNAA, заявка до 08:00 × ${n} дн.`,
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
  newPassNotice: (f, t) => `Ваш абонемент действует с ${f} по ${t} включительно. Последующие заявки в этот период будут бесплатными автоматически.`,
  autoMonthNotice: "От 8 дней абонемент на месяц выгоднее — мы переключили вас на него.",
  hnaaLateNotice: "В день полёта уже больше 08:00, поэтому за этот день члены HNAA платят обычный сбор.",

  submit: "Отправить заявку",
  submitting: "Отправка…",
  submitFoot: "Сумма рассчитывается по времени сервера (время Вьетнама) в момент отправки.",
  needHelp: "Нужна помощь? Звоните",

  err: {
    spot: "Выберите площадку",
    dates: "Выберите даты полётов",
    datesPast: "Нельзя подать заявку на прошедшую дату",
    memberInvalid: "Неверный членский номер",
    name: "Введите полное имя",
    id: "Введите номер удостоверения/паспорта",
    phone: "Введите номер телефона",
    phoneBad: "Номер телефона указан неверно",
    emergencyPhone: "Введите экстренный телефон",
    server: "Не удалось отправить заявку, попробуйте ещё раз",
    rate: "Слишком много попыток, попробуйте через несколько минут",
    network: "Ошибка сети, попробуйте ещё раз",
  },

  okTitle: "Заявка принята!",
  okSubtitle: "Удачного полёта. Сохраните код заявки ниже.",
  okCode: "Код заявки",
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
  payLater: "Не получается перевести сейчас? Можно оплатить на площадке — заявка уже записана.",
  noFeeTitle: "Оплата не требуется",
  noFeeDesc: "Ваша заявка на полёт записана.",
  againBtn: "Ещё одна заявка",
  callBtn: "Позвонить координатору",
};

const zh: BaoBayDict = {
  altHero: "滑翔伞飞行场地",
  altQr: "转账二维码",
  heroBadge: "🪂 独立飞行员专用",
  heroTitle: "飞行报备",
  heroPlaces: "Vien Nam · 考帕 · 管坝",
  heroNote: "起飞前完成飞行报备并缴纳场地费",
  heroCta: "立即报备",

  formTitle: "飞行报备表",
  formSubtitle: "选择场地和日期、填写信息——费用和二维码会立即显示在下方。",

  step1: "选择飞行场地",
  spotName: { "vien-nam": "Vien Nam", "khau-pha": "考帕 Khau Pha", "quan-ba": "管坝 Quan Ba" },
  spotArea: {
    "vien-nam": "河内附近",
    "khau-pha": "木江界",
    "quan-ba": "河江",
  },
  spotPrices: {
    "vien-nam": "100,000 越南盾/天 · 800,000 越南盾/月 · 2,500,000 越南盾/年",
    "khau-pha": "100,000 越南盾/天 · 800,000 越南盾/月",
    "quan-ba": "100,000 越南盾/天 · 800,000 越南盾/月",
  },
  hnaaBadge: "HNAA 会员免费",

  step2: "选择飞行日期",
  step2Hint: "点选所有要飞的日期，无需连续。",
  pickSpotFirst: "请先选择场地。",
  months: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
  weekdays: ["一", "二", "三", "四", "五", "六", "日"],
  chosenDays: (n) => `已选 ${n} 天：`,

  step3: "飞行员信息",
  hnaaLabel: "HNAA 会员编号",
  hnaaHint: "如果您是 HNAA 会员，请填写会员编号以免费报备。",
  hnaaCutoff: "仅在飞行当天 08:00（越南时间）之前报备才免费。报备之后日期的飞行则随时都来得及。",
  hnaaWarn: "报备后不飞行属虚假报备，多次违规将被拒绝报备。",
  hnaaPh: "例如 HN123",
  hnaaCheck: "验证",
  hnaaChecking: "验证中…",
  hnaaOk: "已确认 HNAA 会员身份",
  hnaaWrong: "会员编号不正确",
  hnaaWrongContinue: "您仍可在下方自行填写信息并缴费完成报备。",
  hnaaChange: "输入其他编号",
  memberId: "身份证 / 护照",
  memberPhone: "电话",
  memberNeedMore: "会员名单缺少以下信息，请补充：",

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
  modeYearDesc: "在 Vien Nam 整年不限次数飞行。",

  feeTitle: "报备费用",
  feeLine: {
    hnaaFree: (n) => `HNAA 会员 08:00 前报备 × ${n} 天`,
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
  newPassNotice: (f, t) => `您的票自 ${f} 起至 ${t}（含）有效。此期间内之后的报备将自动免费。`,
  autoMonthNotice: "满 8 天时月票更划算——已自动为您改为月票。",
  hnaaLateNotice: "飞行当天已过 08:00，因此当天 HNAA 会员也需按普通标准缴费。",

  submit: "提交报备",
  submitting: "提交中…",
  submitFoot: "费用按提交时服务器时间（越南时间）计算。",
  needHelp: "需要帮助请致电",

  err: {
    spot: "请选择飞行场地",
    dates: "请选择飞行日期",
    datesPast: "不能为已过去的日期报备",
    memberInvalid: "会员编号不正确",
    name: "请填写姓名",
    id: "请填写身份证/护照号码",
    phone: "请填写电话号码",
    phoneBad: "电话号码格式不正确",
    emergencyPhone: "请填写紧急联系电话",
    server: "报备提交失败，请重试",
    rate: "操作过于频繁，请几分钟后再试",
    network: "网络错误，请重试",
  },

  okTitle: "已收到飞行报备！",
  okSubtitle: "祝您飞行平安。请保存下方的报备编号。",
  okCode: "报备编号",
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
  payLater: "暂时无法转账？可在场地现场支付——报备已记录。",
  noFeeTitle: "无需缴费",
  noFeeDesc: "您的飞行报备已记录。",
  againBtn: "再报备一次",
  callBtn: "致电调度",
};

const hi: BaoBayDict = {
  altHero: "पैराग्लाइडिंग साइट",
  altQr: "बैंक ट्रांसफ़र QR कोड",
  heroBadge: "🪂 सोलो पायलटों के लिए",
  heroTitle: "उड़ान सूचना",
  heroPlaces: "विएन नाम · खाउ फ़ा · क्वान बा",
  heroNote: "टेक-ऑफ़ से पहले उड़ान सूचना दें और साइट शुल्क चुकाएँ",
  heroCta: "सूचना दें",

  formTitle: "उड़ान सूचना फ़ॉर्म",
  formSubtitle: "साइट और तारीखें चुनें, विवरण भरें — शुल्क और QR कोड नीचे तुरंत दिखेंगे।",

  step1: "उड़ान साइट चुनें",
  spotName: { "vien-nam": "विएन नाम", "khau-pha": "खाउ फ़ा", "quan-ba": "क्वान बा" },
  spotArea: {
    "vien-nam": "हनोई के पास",
    "khau-pha": "मु कांग चाई",
    "quan-ba": "हा जियांग",
  },
  spotPrices: {
    "vien-nam": "100,000 đ/दिन · 800,000 đ/माह · 2,500,000 đ/वर्ष",
    "khau-pha": "100,000 đ/दिन · 800,000 đ/माह",
    "quan-ba": "100,000 đ/दिन · 800,000 đ/माह",
  },
  hnaaBadge: "HNAA सदस्यों के लिए निःशुल्क",

  step2: "उड़ान की तारीखें चुनें",
  step2Hint: "जिन दिनों उड़ेंगे उन पर टैप करें — लगातार होना ज़रूरी नहीं।",
  pickSpotFirst: "पहले साइट चुनें।",
  months: ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"],
  weekdays: ["सो", "मं", "बु", "गु", "शु", "श", "र"],
  chosenDays: (n) => `${n} दिन चुने गए:`,

  step3: "पायलट विवरण",
  hnaaLabel: "HNAA सदस्य कोड",
  hnaaHint: "यदि आप HNAA सदस्य हैं, तो निःशुल्क उड़ान सूचना के लिए अपना सदस्य कोड दर्ज करें।",
  hnaaCutoff: "निःशुल्क केवल तब, जब सूचना उड़ान वाले दिन सुबह 08:00 (वियतनाम समय) से पहले दी जाए। आगे की तारीखों के लिए सूचना हमेशा समय पर है।",
  hnaaWarn: "बिना उड़े फ़र्ज़ी सूचना देना — बार-बार उल्लंघन पर सूचना अस्वीकार कर दी जाएगी।",
  hnaaPh: "जैसे HN123",
  hnaaCheck: "जाँचें",
  hnaaChecking: "जाँच हो रही है…",
  hnaaOk: "HNAA सदस्यता की पुष्टि हुई",
  hnaaWrong: "सदस्य कोड ग़लत है",
  hnaaWrongContinue: "आप नीचे अपना विवरण भरकर और शुल्क चुकाकर फिर भी सूचना दे सकते हैं।",
  hnaaChange: "दूसरा कोड डालें",
  memberId: "पहचान पत्र / पासपोर्ट",
  memberPhone: "फ़ोन",
  memberNeedMore: "सदस्य सूची में यह जानकारी नहीं है, कृपया जोड़ें:",

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
  modeYearDesc: "विएन नाम में पूरा एक वर्ष, असीमित उड़ान।",

  feeTitle: "सूचना शुल्क",
  feeLine: {
    hnaaFree: (n) => `HNAA सदस्य, 08:00 से पहले सूचना × ${n} दिन`,
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
  newPassNotice: (f, t) => `आपका पास ${f} से ${t} तक (सहित) मान्य है। इस अवधि में आगे की सूचनाएँ अपने-आप निःशुल्क होंगी।`,
  autoMonthNotice: "8 दिन या अधिक पर मासिक पास सस्ता है — आपके लिए मासिक पास चुन लिया गया।",
  hnaaLateNotice: "उड़ान वाले दिन 08:00 बज चुके हैं, इसलिए उस दिन HNAA सदस्य भी सामान्य शुल्क देंगे।",

  submit: "उड़ान सूचना भेजें",
  submitting: "भेजा जा रहा है…",
  submitFoot: "शुल्क भेजने के समय सर्वर घड़ी (वियतनाम समय) के अनुसार गिना जाता है।",
  needHelp: "मदद चाहिए? कॉल करें",

  err: {
    spot: "कृपया साइट चुनें",
    dates: "कृपया उड़ान की तारीखें चुनें",
    datesPast: "बीती तारीख के लिए सूचना नहीं दी जा सकती",
    memberInvalid: "सदस्य कोड ग़लत है",
    name: "कृपया पूरा नाम दर्ज करें",
    id: "कृपया पहचान पत्र/पासपोर्ट नंबर दर्ज करें",
    phone: "कृपया फ़ोन नंबर दर्ज करें",
    phoneBad: "फ़ोन नंबर सही नहीं लगता",
    emergencyPhone: "कृपया आपातकालीन फ़ोन दर्ज करें",
    server: "सूचना नहीं भेजी जा सकी, कृपया फिर कोशिश करें",
    rate: "बहुत अधिक प्रयास, कुछ मिनट बाद फिर कोशिश करें",
    network: "नेटवर्क त्रुटि, कृपया फिर कोशिश करें",
  },

  okTitle: "उड़ान सूचना मिल गई!",
  okSubtitle: "सुरक्षित उड़ान हो। नीचे दिया सूचना कोड सँभाल कर रखें।",
  okCode: "सूचना कोड",
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
  payLater: "अभी ट्रांसफ़र नहीं कर पा रहे? साइट पर भुगतान कर सकते हैं — आपकी सूचना दर्ज हो चुकी है।",
  noFeeTitle: "कोई शुल्क नहीं",
  noFeeDesc: "आपकी उड़ान सूचना दर्ज हो गई है।",
  againBtn: "एक और सूचना दें",
  callBtn: "समन्वयक को कॉल करें",
};

const DICTS: Record<BaoBayLang, BaoBayDict> = { vi, en, fr, ru, zh, hi };

/** Bảng chữ theo ngôn ngữ đang xem; ngôn ngữ lạ thì về tiếng Việt. */
export function baoBayDict(lang: unknown): BaoBayDict {
  const code = String(lang ?? "vi").slice(0, 2).toLowerCase() as BaoBayLang;
  return DICTS[code] ?? vi;
}
