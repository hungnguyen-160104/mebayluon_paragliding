// lib/email/customer-booking.ts
/**
 * Email xác nhận gửi khách sau khi đặt bay.
 *
 * Viết lại từ bản cũ trong lib/templates.ts vì bản đó cứng tiếng Anh cho mọi
 * khách, danh sách "đã bao gồm" viết chết trong code (nên Khau Phạ mất dòng
 * "Xe lên/xuống núi", điểm nào cũng ghi "Welcome drink"), thiếu điểm hẹn,
 * thiếu yêu cầu đặc biệt và ngày thì in thô dạng ISO.
 *
 * Nguyên tắc: khách đặt bằng giao diện ngôn ngữ nào thì nhận email đúng ngôn
 * ngữ đó — `lang` được gửi kèm payload từ bước 4.
 *
 * HTML dùng bảng và style nội tuyến, không dùng flexbox/grid: Gmail và
 * Outlook bỏ qua phần lớn CSS hiện đại.
 */

import { resolvePickup } from "@/lib/booking/pickup";
import { CLUBHOUSE_MAP_URL, KHAU_PHA_TAKEOFF_MAP_URL } from "@/lib/spot-partner-links";

export type EmailLang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

const LANGS: EmailLang[] = ["vi", "en", "fr", "ru", "zh", "hi"];

export function normalizeEmailLang(raw: unknown): EmailLang {
  const code = String(raw ?? "vi").slice(0, 2).toLowerCase() as EmailLang;
  return LANGS.includes(code) ? code : "vi";
}

type Dict = {
  subject: (id: string) => string;
  /** Thư CẬP NHẬT / HUỶ — cùng bố cục thư xác nhận, khác tiêu đề + lời mở. */
  subjectUpdate: (id: string) => string;
  subjectCancel: (id: string) => string;
  introUpdate: string;
  introCancel: string;
  sectionChanges: string;
  /** Đã thanh toán / còn lại — thư gửi từ app nội bộ có số này, thư web không. */
  paidLabel: string;
  balanceLabel: string;
  fullyPaid: string;
  hello: (name: string) => string;
  intro: string;
  bookingRef: string;
  headerTitle: string;

  sectionFlight: string;
  sectionPassengers: string;
  sectionPrice: string;
  sectionIncluded: string;
  sectionServices: string;
  noService: string;
  sectionNotes: string;
  sectionRequest: string;
  sectionNext: string;

  location: string;
  dateTime: string;
  guests: string;
  flightType: string;
  packageLabel: string;
  pickupPoint: string;
  meetingPoint: string;
  pickupNote: string;
  meetingSelf: string;
  meetingHanoi: string;

  colName: string;
  colDob: string;
  colGender: string;
  colWeight: string;
  colNationality: string;
  colId: string;

  basePrice: string;
  groupDiscount: string;
  total: string;
  paymentNote: string;

  nextSteps: string[];
  guideWear: string;
  guideBring: string;
  guideAvoid: string;

  contactIntro: string;
  footerRights: string;
  attachmentNote: string;
  idMaskedNote: string;
  spotMore: (name: string) => string;
  /**
   * CHỈ ĐƯỜNG KHAU PHẠ theo loại bay (luật chủ 04/09): PPG đến thẳng
   * Clubhouse; PG nhận cả toạ độ bãi cất cánh (check-in Quầy Vé đỉnh đèo nếu
   * đến từ hướng Ngã Ba Kim) lẫn bãi hạ cánh (Tú Lệ/Cao Phạ qua đây làm thủ
   * tục rồi xe trung chuyển). Kèm QR toạ độ cho khách quét.
   */
  dirTitle: string;
  dirPpgTitle: string;
  dirPpgNote: string;
  dirTakeoffTitle: string;
  dirTakeoffNote: string;
  dirLandingTitle: string;
  dirLandingNote: string;
  dirOpenMap: string;
};

const T: Record<EmailLang, Dict> = {
  vi: {
    subject: (id) => `Xác nhận đặt lịch bay dù lượn Mebayluon - ID: ${id}`,
    subjectUpdate: (id) => `Cập nhật đặt chỗ bay dù lượn Mebayluon - ID: ${id}`,
    subjectCancel: (id) => `Huỷ chuyến bay Mebayluon - ID: ${id}`,
    introUpdate: "Đặt chỗ của bạn vừa được cập nhật. Những thay đổi và thông tin mới nhất ở dưới đây.",
    introCancel: "Chuyến bay của bạn đã được huỷ. Chi tiết ở dưới đây — nếu có khoản hoàn, chúng tôi sẽ xử lý sớm nhất.",
    sectionChanges: "Những thay đổi",
    paidLabel: "Đã thanh toán",
    balanceLabel: "Còn lại phải trả",
    fullyPaid: "Đã thanh toán đủ",
    hello: (n) => `Chào ${n},`,
    intro:
      "Cảm ơn bạn đã đặt lịch bay dù lượn cùng Mebayluon Paragliding. Lịch bay của bạn được xác nhận, chi tiết như sau:",
    bookingRef: "Mã đặt chỗ",
    headerTitle: "XÁC NHẬN ĐẶT LỊCH BAY",
    sectionFlight: "Thông tin chuyến bay",
    sectionPassengers: "Danh sách khách bay",
    sectionPrice: "Chi tiết giá",
    sectionIncluded: "Giá trên đã bao gồm",
    sectionServices: "Dịch vụ bạn đã chọn thêm",
    noService: "Bạn chưa chọn thêm dịch vụ nào.",
    sectionNotes: "Chuẩn bị trước khi bay",
    sectionRequest: "Yêu cầu đặc biệt của bạn",
    sectionNext: "Việc tiếp theo",
    location: "Điểm bay",
    dateTime: "Ngày & giờ bay",
    guests: "Số khách",
    flightType: "Loại bay",
    packageLabel: "Gói bay",
    pickupPoint: "Điểm đón",
    meetingPoint: "Điểm hẹn",
    pickupNote: "Xe đón trước giờ bay khoảng 1 tiếng, tài xế sẽ gọi trước khi tới.",
    meetingSelf: "Khách tự tới điểm bay",
    meetingHanoi: "Điểm bay Đồi Bù | Viên Nam",
    colName: "Họ và tên",
    colDob: "Ngày sinh",
    colGender: "Giới tính",
    colWeight: "Cân nặng",
    colNationality: "Quốc tịch",
    colId: "CCCD/Passport",
    basePrice: "Giá chuyến bay cơ bản",
    groupDiscount: "Giảm giá nhóm",
    total: "TỔNG CỘNG",
    paymentNote:
      "Thanh toán trực tiếp tại điểm bay trước giờ cất cánh. Nhận tiền mặt, chuyển khoản và thẻ.",
    nextSteps: [
      "Chúng tôi sẽ gọi xác nhận lịch bay và thời tiết trong thời gian sớm nhất.",
      "Có mặt trước giờ bay 15 phút để làm thủ tục và nghe hướng dẫn an toàn.",
      "Mang theo giấy tờ tuỳ thân và email này (hoặc ảnh vé đính kèm).",
      "Đổi lịch hoặc huỷ bay miễn phí, chỉ cần báo trước vài giờ.",
    ],
    guideWear: "Quần áo dài tay, giày thể thao. Không váy, không cao gót, không dép lê.",
    guideBring: "Giấy tờ tuỳ thân, kính râm, áo khoác mỏng, túi nhỏ 1–2 kg. Điện thoại còn trống ~4GB để chép ảnh & video.",
    guideAvoid: "Vật sắc nhọn, đồ cồng kềnh, tư trang giá trị cao, đồ nặng.",
    contactIntro: "Cần hỗ trợ, bạn gọi hoặc nhắn cho chúng tôi bất cứ lúc nào:",
    footerRights: "Mebayluon Paragliding. Bảo lưu mọi quyền.",
    attachmentNote: "🎫 Vé bay của bạn được đính kèm trong email này.",
    idMaskedNote: "Số giấy tờ được ẩn bớt để bảo vệ thông tin cá nhân của bạn.",
    spotMore: (n) => `Vui lòng xem chi tiết thông tin điểm bay ${n}`,
    dirTitle: "📍 Đường đến điểm bay Khau Phạ",
    dirPpgTitle: "Điểm bay DÙ MÁY (PPG) — Mebayluon Clubhouse",
    dirPpgNote: "Bạn bay dù máy (PPG): vui lòng đến thẳng điểm này (quét QR hoặc bấm mở bản đồ) để làm thủ tục và bay.",
    dirTakeoffTitle: "Bãi CẤT CÁNH — đỉnh đèo Khau Phạ",
    dirTakeoffNote: "Đây là điểm cất cánh. Nếu bạn đến từ hướng Ngã Ba Kim / Mù Cang Chải / Garrya: ghé QUẦY VÉ tại đỉnh đèo để check-in lấy vé bay.",
    dirLandingTitle: "Bãi HẠ CÁNH — Mebayluon Clubhouse",
    dirLandingNote: "Nếu bạn ở Tú Lệ hoặc Cao Phạ (cũ): qua bãi hạ cánh làm thủ tục trước, rồi đi xe trung chuyển lên bãi cất cánh.",
    dirOpenMap: "Mở bản đồ",
  },

  en: {
    subject: (id) => `Mebayluon paragliding booking confirmation - ID: ${id}`,
    subjectUpdate: (id) => `Mebayluon paragliding booking updated - ID: ${id}`,
    subjectCancel: (id) => `Mebayluon flight cancelled - ID: ${id}`,
    introUpdate: "Your booking has just been updated. The changes and the latest details are below.",
    introCancel: "Your flight has been cancelled. Details below — any refund will be processed shortly.",
    sectionChanges: "What changed",
    paidLabel: "Paid",
    balanceLabel: "Balance due",
    fullyPaid: "Fully paid",
    hello: (n) => `Hello ${n},`,
    intro:
      "Thank you for booking a paragliding flight with Mebayluon Paragliding. Your flight is confirmed — here are the details:",
    bookingRef: "Booking reference",
    headerTitle: "BOOKING CONFIRMATION",
    sectionFlight: "Flight details",
    sectionPassengers: "Passengers",
    sectionPrice: "Price breakdown",
    sectionIncluded: "The price includes",
    sectionServices: "Optional services you selected",
    noService: "You did not add any optional service.",
    sectionNotes: "Before you fly",
    sectionRequest: "Your special request",
    sectionNext: "What happens next",
    location: "Flying site",
    dateTime: "Date & time",
    guests: "Guests",
    flightType: "Flight type",
    packageLabel: "Package",
    pickupPoint: "Pickup point",
    meetingPoint: "Meeting point",
    pickupNote:
      "The car picks you up about 1 hour before the flight; the driver will call ahead.",
    meetingSelf: "Guest makes their own way to the site",
    meetingHanoi: "Doi Bu | Vien Nam flying site",
    colName: "Full name",
    colDob: "Date of birth",
    colGender: "Gender",
    colWeight: "Weight",
    colNationality: "Nationality",
    colId: "ID / Passport",
    basePrice: "Base flight price",
    groupDiscount: "Group discount",
    total: "TOTAL",
    paymentNote:
      "Payment is made on site before take-off. We accept cash, bank transfer and cards.",
    nextSteps: [
      "We will call to confirm your schedule and the weather as soon as possible.",
      "Arrive 15 minutes early for check-in and the safety briefing.",
      "Bring your ID and this email (or the attached ticket image).",
      "Rescheduling and cancellation are free with a few hours' notice.",
    ],
    guideWear: "Long trousers and sleeves, trainers. No skirts, heels or flip-flops.",
    guideBring: "ID or passport, sunglasses, a light jacket, a small 1–2 kg bag. Phone with ~4GB free for your photos and video.",
    guideAvoid: "Sharp objects, bulky items, valuables, heavy items.",
    contactIntro: "Need help? Call or message us any time:",
    footerRights: "Mebayluon Paragliding. All rights reserved.",
    attachmentNote: "🎫 Your flight ticket is attached to this email.",
    idMaskedNote: "ID numbers are partly hidden to protect your personal data.",
    spotMore: (n) => `See full details about the ${n} flying site`,
    dirTitle: "📍 Getting to the Khau Pha flying site",
    dirPpgTitle: "PARAMOTOR (PPG) site — Mebayluon Clubhouse",
    dirPpgNote: "You are flying paramotor (PPG): please come straight to this point (scan the QR or open the map) for check-in and your flight.",
    dirTakeoffTitle: "TAKE-OFF site — Khau Pha pass summit",
    dirTakeoffNote: "This is the take-off point. Coming from Nga Ba Kim / Mu Cang Chai / Garrya? Stop at the TICKET COUNTER on the pass summit to check in and collect your ticket.",
    dirLandingTitle: "LANDING site — Mebayluon Clubhouse",
    dirLandingNote: "Staying in Tu Le or Cao Pha? Check in at the landing site first, then take our shuttle up to the take-off site.",
    dirOpenMap: "Open map",
  },

  fr: {
    subject: (id) => `Confirmation de réservation parapente Mebayluon - ID : ${id}`,
    subjectUpdate: (id) => `Mise à jour de votre réservation Mebayluon - ID : ${id}`,
    subjectCancel: (id) => `Vol annulé Mebayluon - ID : ${id}`,
    introUpdate: "Votre réservation vient d’être mise à jour. Les changements et les informations à jour sont ci-dessous.",
    introCancel: "Votre vol a été annulé. Détails ci-dessous — tout remboursement sera traité rapidement.",
    sectionChanges: "Ce qui a changé",
    paidLabel: "Payé",
    balanceLabel: "Reste à payer",
    fullyPaid: "Entièrement payé",
    hello: (n) => `Bonjour ${n},`,
    intro:
      "Merci d'avoir réservé un vol en parapente avec Mebayluon Paragliding. Votre vol est confirmé, voici le détail :",
    bookingRef: "Référence",
    headerTitle: "CONFIRMATION DE RÉSERVATION",
    sectionFlight: "Détails du vol",
    sectionPassengers: "Passagers",
    sectionPrice: "Détail des prix",
    sectionIncluded: "Ce prix comprend",
    sectionServices: "Services en option choisis",
    noService: "Vous n'avez ajouté aucun service en option.",
    sectionNotes: "Avant de voler",
    sectionRequest: "Votre demande particulière",
    sectionNext: "La suite",
    location: "Site de vol",
    dateTime: "Date et heure",
    guests: "Participants",
    flightType: "Type de vol",
    packageLabel: "Forfait",
    pickupPoint: "Point de prise en charge",
    meetingPoint: "Point de rendez-vous",
    pickupNote:
      "La navette passe environ 1 heure avant le vol ; le chauffeur vous appellera.",
    meetingSelf: "Le client se rend au site par ses propres moyens",
    meetingHanoi: "Site de vol Doi Bu | Vien Nam",
    colName: "Nom complet",
    colDob: "Date de naissance",
    colGender: "Sexe",
    colWeight: "Poids",
    colNationality: "Nationalité",
    colId: "CNI / Passeport",
    basePrice: "Prix de base du vol",
    groupDiscount: "Remise groupe",
    total: "TOTAL",
    paymentNote:
      "Le paiement se fait sur place avant le décollage. Espèces, virement et carte acceptés.",
    nextSteps: [
      "Nous vous appellerons pour confirmer l'horaire et la météo dès que possible.",
      "Arrivez 15 minutes en avance pour l'enregistrement et le briefing.",
      "Apportez une pièce d'identité et cet e-mail (ou le billet joint).",
      "Report et annulation gratuits en prévenant quelques heures à l'avance.",
    ],
    guideWear: "Pantalon et manches longues, baskets. Ni jupe, ni talons, ni tongs.",
    guideBring: "Pièce d'identité, lunettes de soleil, veste légère, petit sac de 1 à 2 kg. Téléphone avec ~4 Go libres pour vos photos et vidéos.",
    guideAvoid: "Objets pointus, objets encombrants, objets de valeur, objets lourds.",
    contactIntro: "Besoin d'aide ? Appelez-nous ou écrivez-nous à tout moment :",
    footerRights: "Mebayluon Paragliding. Tous droits réservés.",
    attachmentNote: "🎫 Votre billet de vol est joint à cet e-mail.",
    idMaskedNote: "Les numéros de pièce d'identité sont partiellement masqués pour protéger vos données.",
    spotMore: (n) => `Voir toutes les informations sur le site de vol ${n}`,
    dirTitle: "📍 Se rendre au site de vol de Khau Pha",
    dirPpgTitle: "Site PARAMOTEUR (PPG) — Mebayluon Clubhouse",
    dirPpgNote: "Vous volez en paramoteur (PPG) : rendez-vous directement à ce point (scannez le QR ou ouvrez la carte) pour l’enregistrement et le vol.",
    dirTakeoffTitle: "Site de DÉCOLLAGE — sommet du col de Khau Pha",
    dirTakeoffNote: "Ceci est le point de décollage. Vous arrivez de Nga Ba Kim / Mu Cang Chai / Garrya ? Passez au GUICHET au sommet du col pour l’enregistrement et votre billet.",
    dirLandingTitle: "Site d’ATTERRISSAGE — Mebayluon Clubhouse",
    dirLandingNote: "Vous logez à Tu Le ou Cao Pha ? Enregistrez-vous d’abord au site d’atterrissage, puis prenez la navette jusqu’au décollage.",
    dirOpenMap: "Ouvrir la carte",
  },

  ru: {
    subject: (id) => `Подтверждение брони полёта Mebayluon - ID: ${id}`,
    subjectUpdate: (id) => `Обновление брони Mebayluon - ID: ${id}`,
    subjectCancel: (id) => `Полёт отменён Mebayluon - ID: ${id}`,
    introUpdate: "Ваша бронь только что обновлена. Изменения и актуальные данные ниже.",
    introCancel: "Ваш полёт отменён. Подробности ниже — возврат, если он положен, оформим в ближайшее время.",
    sectionChanges: "Что изменилось",
    paidLabel: "Оплачено",
    balanceLabel: "Осталось оплатить",
    fullyPaid: "Оплачено полностью",
    hello: (n) => `Здравствуйте, ${n}!`,
    intro:
      "Спасибо за бронирование полёта на параплане с Mebayluon Paragliding. Ваш полёт подтверждён, детали ниже:",
    bookingRef: "Номер брони",
    headerTitle: "ПОДТВЕРЖДЕНИЕ БРОНИРОВАНИЯ",
    sectionFlight: "Детали полёта",
    sectionPassengers: "Пассажиры",
    sectionPrice: "Детализация цены",
    sectionIncluded: "В цену входит",
    sectionServices: "Выбранные дополнительные услуги",
    noService: "Дополнительные услуги не выбраны.",
    sectionNotes: "Перед полётом",
    sectionRequest: "Ваше особое пожелание",
    sectionNext: "Что дальше",
    location: "Площадка",
    dateTime: "Дата и время",
    guests: "Гостей",
    flightType: "Тип полёта",
    packageLabel: "Пакет",
    pickupPoint: "Место посадки",
    meetingPoint: "Место встречи",
    pickupNote:
      "Трансфер подаётся примерно за 1 час до полёта, водитель позвонит заранее.",
    meetingSelf: "Гость добирается до площадки самостоятельно",
    meetingHanoi: "Площадка Дой Бу | Виен Нам",
    colName: "Полное имя",
    colDob: "Дата рождения",
    colGender: "Пол",
    colWeight: "Вес",
    colNationality: "Гражданство",
    colId: "Паспорт",
    basePrice: "Базовая стоимость полёта",
    groupDiscount: "Групповая скидка",
    total: "ИТОГО",
    paymentNote:
      "Оплата на месте перед взлётом. Принимаем наличные, перевод и карты.",
    nextSteps: [
      "Мы позвоним, чтобы подтвердить время и погоду, в ближайшее время.",
      "Приходите за 15 минут до полёта на регистрацию и инструктаж.",
      "Возьмите документ и это письмо (или приложенный билет).",
      "Перенос и отмена бесплатны, предупредите за несколько часов.",
    ],
    guideWear: "Длинные брюки и рукава, кроссовки. Без юбки, каблуков и шлёпанцев.",
    guideBring: "Документ, очки от солнца, лёгкая куртка, небольшая сумка 1–2 кг. Телефон со свободными ~4 ГБ для фото и видео.",
    guideAvoid: "Острые предметы, громоздкие вещи, ценные вещи, тяжёлые предметы.",
    contactIntro: "Нужна помощь? Звоните или пишите в любое время:",
    footerRights: "Mebayluon Paragliding. Все права защищены.",
    attachmentNote: "🎫 Ваш билет прикреплён к этому письму.",
    idMaskedNote: "Номера документов частично скрыты для защиты ваших данных.",
    spotMore: (n) => `Подробная информация о площадке ${n}`,
    dirTitle: "📍 Как добраться до лётной площадки Кхау Фа",
    dirPpgTitle: "Площадка ПАРАМОТОРА (PPG) — Mebayluon Clubhouse",
    dirPpgNote: "Вы летите на парамоторе (PPG): приезжайте сразу в эту точку (отсканируйте QR или откройте карту) для регистрации и полёта.",
    dirTakeoffTitle: "Площадка ВЗЛЁТА — вершина перевала Кхау Фа",
    dirTakeoffNote: "Это точка взлёта. Едете со стороны Нга Ба Ким / Му Канг Чай / Garrya? Загляните в КАССУ на вершине перевала для регистрации и получения билета.",
    dirLandingTitle: "Площадка ПОСАДКИ — Mebayluon Clubhouse",
    dirLandingNote: "Вы в Ту Ле или Као Фа? Сначала пройдите регистрацию на площадке посадки, затем наш трансфер отвезёт вас к точке взлёта.",
    dirOpenMap: "Открыть карту",
  },

  zh: {
    subject: (id) => `Mebayluon 滑翔伞预订确认 - ID: ${id}`,
    subjectUpdate: (id) => `Mebayluon 预订更新 - ID: ${id}`,
    subjectCancel: (id) => `Mebayluon 航程取消 - ID: ${id}`,
    introUpdate: "您的预订刚刚更新，变更内容与最新信息如下。",
    introCancel: "您的飞行已取消，详情如下——如有退款我们会尽快处理。",
    sectionChanges: "变更内容",
    paidLabel: "已付款",
    balanceLabel: "待付余额",
    fullyPaid: "已付清",
    hello: (n) => `${n} 您好，`,
    intro:
      "感谢您通过 Mebayluon Paragliding 预订滑翔伞飞行。您的飞行已确认，详情如下：",
    bookingRef: "预订编号",
    headerTitle: "预订确认",
    sectionFlight: "飞行信息",
    sectionPassengers: "飞行乘客",
    sectionPrice: "价格明细",
    sectionIncluded: "价格已包含",
    sectionServices: "您加购的服务",
    noService: "您没有加购任何服务。",
    sectionNotes: "飞行前准备",
    sectionRequest: "您的特殊要求",
    sectionNext: "接下来",
    location: "飞行点",
    dateTime: "日期与时间",
    guests: "人数",
    flightType: "飞行类型",
    packageLabel: "套餐",
    pickupPoint: "接送地点",
    meetingPoint: "集合地点",
    pickupNote: "车辆约在飞行前 1 小时来接，司机会提前致电。",
    meetingSelf: "客人自行前往飞行点",
    meetingHanoi: "堆布山 | 员南飞行点",
    colName: "姓名",
    colDob: "出生日期",
    colGender: "性别",
    colWeight: "体重",
    colNationality: "国籍",
    colId: "证件号",
    basePrice: "飞行基础价格",
    groupDiscount: "团体优惠",
    total: "总计",
    paymentNote: "起飞前在飞行点现场付款，接受现金、转账与刷卡。",
    nextSteps: [
      "我们会尽快致电确认飞行时间与天气。",
      "请提前 15 分钟抵达办理登记并听安全讲解。",
      "请携带身份证件与本邮件（或附件中的电子票）。",
      "改期或取消免费，只需提前几小时告知。",
    ],
    guideWear: "长裤、长袖、运动鞋。请勿穿裙子、高跟鞋或拖鞋。",
    guideBring: "身份证件、墨镜、薄外套、1–2 公斤随身小包。手机预留约 4GB 空间用于拷贝照片和视频。",
    guideAvoid: "尖锐物品、体积过大的物品、贵重物品、过重的物品。",
    contactIntro: "需要协助，请随时来电或留言：",
    footerRights: "Mebayluon Paragliding 版权所有。",
    attachmentNote: "🎫 您的电子票已作为附件随本邮件发送。",
    idMaskedNote: "证件号码已部分隐藏，以保护您的个人信息。",
    spotMore: (n) => `查看飞行点 ${n} 的详细信息`,
    dirTitle: "📍 如何前往 Khau Pha 飞行点",
    dirPpgTitle: "动力伞（PPG）飞行点 — Mebayluon Clubhouse",
    dirPpgNote: "您预订的是动力伞（PPG）：请直接前往此地点（扫描二维码或打开地图）办理登记并飞行。",
    dirTakeoffTitle: "起飞场 — Khau Pha 垭口山顶",
    dirTakeoffNote: "这里是起飞点。若您从 Nga Ba Kim / Mu Cang Chai / Garrya 方向前来，请先到垭口山顶的售票处办理登记并领取机票。",
    dirLandingTitle: "降落场 — Mebayluon Clubhouse",
    dirLandingNote: "若您住在 Tu Le 或 Cao Pha，请先到降落场办理手续，再乘坐接驳车前往起飞场。",
    dirOpenMap: "打开地图",
  },

  hi: {
    subject: (id) => `Mebayluon पैराग्लाइडिंग बुकिंग पुष्टि - ID: ${id}`,
    subjectUpdate: (id) => `Mebayluon बुकिंग अपडेट - ID: ${id}`,
    subjectCancel: (id) => `Mebayluon उड़ान रद्द - ID: ${id}`,
    introUpdate: "आपकी बुकिंग अभी अपडेट हुई है। बदलाव और नवीनतम विवरण नीचे हैं।",
    introCancel: "आपकी उड़ान रद्द हो गई है। विवरण नीचे हैं — रिफ़ंड होने पर हम जल्द प्रोसेस करेंगे।",
    sectionChanges: "क्या बदला",
    paidLabel: "भुगतान किया",
    balanceLabel: "बकाया राशि",
    fullyPaid: "पूरा भुगतान हो चुका",
    hello: (n) => `नमस्ते ${n},`,
    intro:
      "Mebayluon Paragliding के साथ उड़ान बुक करने के लिए धन्यवाद। आपकी उड़ान पुष्ट हो गई है, विवरण नीचे है:",
    bookingRef: "बुकिंग संख्या",
    headerTitle: "बुकिंग पुष्टि",
    sectionFlight: "उड़ान विवरण",
    sectionPassengers: "यात्री",
    sectionPrice: "मूल्य विवरण",
    sectionIncluded: "इस क़ीमत में शामिल है",
    sectionServices: "आपकी चुनी हुई वैकल्पिक सेवाएँ",
    noService: "आपने कोई वैकल्पिक सेवा नहीं चुनी।",
    sectionNotes: "उड़ान से पहले",
    sectionRequest: "आपका विशेष अनुरोध",
    sectionNext: "आगे क्या",
    location: "उड़ान स्थल",
    dateTime: "तिथि व समय",
    guests: "यात्री संख्या",
    flightType: "उड़ान प्रकार",
    packageLabel: "पैकेज",
    pickupPoint: "पिकअप स्थान",
    meetingPoint: "मिलन स्थल",
    pickupNote: "गाड़ी उड़ान से क़रीब 1 घंटा पहले आएगी; ड्राइवर पहले कॉल करेगा।",
    meetingSelf: "मेहमान स्वयं उड़ान स्थल पर पहुँचें",
    meetingHanoi: "उड़ान स्थल दोई बू | वियन नाम",
    colName: "पूरा नाम",
    colDob: "जन्म तिथि",
    colGender: "लिंग",
    colWeight: "वज़न",
    colNationality: "राष्ट्रीयता",
    colId: "आईडी / पासपोर्ट",
    basePrice: "उड़ान का मूल मूल्य",
    groupDiscount: "समूह छूट",
    total: "कुल",
    paymentNote:
      "भुगतान उड़ान स्थल पर उड़ान से पहले। नकद, बैंक ट्रांसफ़र और कार्ड स्वीकार्य।",
    nextSteps: [
      "हम जल्द ही समय और मौसम की पुष्टि के लिए कॉल करेंगे।",
      "चेक-इन और सुरक्षा ब्रीफ़िंग के लिए 15 मिनट पहले पहुँचें।",
      "पहचान पत्र और यह ईमेल (या संलग्न टिकट) साथ लाएँ।",
      "कुछ घंटे पहले सूचित करने पर बदलाव या रद्दीकरण निःशुल्क।",
    ],
    guideWear: "लंबी पैंट व पूरी बाँह, स्नीकर्स। स्कर्ट, हील्स या चप्पल नहीं।",
    guideBring: "पहचान पत्र, धूप का चश्मा, हल्की जैकेट, 1–2 किग्रा का छोटा बैग। फ़ोटो-वीडियो के लिए ~4GB खाली फ़ोन।",
    guideAvoid: "नुकीली चीज़ें, भारी-भरकम सामान, क़ीमती सामान, वज़नी वस्तुएँ।",
    contactIntro: "मदद चाहिए? कभी भी कॉल या मैसेज करें:",
    footerRights: "Mebayluon Paragliding. सर्वाधिकार सुरक्षित।",
    attachmentNote: "🎫 आपका उड़ान टिकट इस ईमेल के साथ संलग्न है।",
    idMaskedNote: "आपकी निजता की रक्षा के लिए आईडी नंबर आंशिक रूप से छिपाया गया है।",
    spotMore: (n) => `उड़ान स्थल ${n} की पूरी जानकारी देखें`,
    dirTitle: "📍 खाउ फा उड़ान स्थल तक पहुँचना",
    dirPpgTitle: "पैरामोटर (PPG) स्थल — Mebayluon Clubhouse",
    dirPpgNote: "आप पैरामोटर (PPG) उड़ान भर रहे हैं: कृपया सीधे इस स्थान पर आएँ (QR स्कैन करें या नक्शा खोलें) — यहीं चेक-इन और उड़ान होगी।",
    dirTakeoffTitle: "टेक-ऑफ़ स्थल — खाउ फा दर्रे की चोटी",
    dirTakeoffNote: "यह टेक-ऑफ़ पॉइंट है। यदि आप Nga Ba Kim / Mu Cang Chai / Garrya की ओर से आ रहे हैं, तो दर्रे की चोटी पर टिकट काउंटर पर चेक-इन कर टिकट लें।",
    dirLandingTitle: "लैंडिंग स्थल — Mebayluon Clubhouse",
    dirLandingNote: "यदि आप Tu Le या Cao Pha में ठहरे हैं, तो पहले लैंडिंग स्थल पर औपचारिकताएँ पूरी करें, फिर शटल से टेक-ऑफ़ स्थल जाएँ।",
    dirOpenMap: "नक्शा खोलें",
  },
};

/* ------------------------------------------------------------------ */

const esc = (s?: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Che số CCCD / hộ chiếu, chỉ để lộ 4 ký tự cuối: "001095001234" -> "xxxxxx1234".
 *
 * Email đi qua nhiều máy chủ và nằm mãi trong hộp thư, không nên chở số giấy
 * tờ đầy đủ. Bản nội bộ gửi đội bay vẫn giữ nguyên số vì cần đối chiếu khi
 * khách tới điểm bay.
 */
function maskIdNumber(raw?: string): string {
  const value = String(raw ?? "").trim();
  if (!value) return "";
  if (value.length <= 4) return value;
  return "x".repeat(Math.max(4, value.length - 4)) + value.slice(-4);
}

const money = (n?: number) =>
  typeof n === "number"
    ? n.toLocaleString("vi-VN", { style: "currency", currency: "VND" })
    : "—";

/** "2026-09-15" -> "15/09/2026". Bản cũ in nguyên chuỗi ISO ra email. */
function formatDate(raw?: string): string {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

const C = {
  ink: "#1C2930",
  soft: "#5B6B7A",
  line: "#DCE7F3",
  bg: "#F5F7FA",
  blue: "#0194F3",
  blueDark: "#0B6FC4",
  green: "#16A34A",
  orange: "#FF5E1F",
  orangeBg: "#FFF4ED",
};

function sectionTitle(text: string) {
  return `<tr><td style="padding:22px 0 8px;">
    <div style="font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${C.blueDark};border-bottom:2px solid ${C.line};padding-bottom:6px;">${esc(text)}</div>
  </td></tr>`;
}

function kvRow(label: string, value: string) {
  return `<tr>
    <td style="padding:6px 0;font-size:14px;color:${C.soft};width:38%;">${esc(label)}</td>
    <td style="padding:6px 0;font-size:14px;color:${C.ink};font-weight:600;text-align:right;">${esc(value)}</td>
  </tr>`;
}

export type CustomerEmailInput = {
  lang?: unknown;
  bookingId?: string;
  location?: string;
  locationName?: string;
  dateISO?: string;
  timeSlot?: string;
  guestsCount?: number;
  packageLabel?: string;
  flightTypeLabel?: string;
  /** Tên liên hệ do bước 4 gửi lên dưới khoá `name`. */
  name?: string;
  contact?: {
    contactName?: string;
    fullName?: string;
    phone?: string;
    email?: string;
    pickupLocation?: string;
    specialRequest?: string;
  };
  guests?: Array<{
    fullName?: string;
    dob?: string;
    gender?: string;
    idNumber?: string;
    weightKg?: number;
    nationality?: string;
  }>;
  /** Danh sách "đã bao gồm" của đúng gói / điểm bay, đã dịch sẵn. */
  includedLines?: string[];
  /** Dịch vụ khách chọn thêm, đã dịch sẵn: [{ label, qty }]. */
  selectedServiceLines?: Array<{ label: string; qty?: number; note?: string }>;
  /** Đường dẫn tuyệt đối tới trang giới thiệu điểm bay đã đặt. */
  spotPageUrl?: string;
  /** Có ảnh vé đính kèm hay không — quyết định hiện dòng nhắc trong thư. */
  hasTicketAttachment?: boolean;
  /**
   * Loại bay để chọn khối chỉ đường Khau Phạ: "pg" · "ppg" · "mixed" (đoàn
   * lẫn nhận cả hai khối). Không truyền thì đoán từ flightTypeLabel.
   */
  flightKind?: string;
  /**
   * CHẾ ĐỘ THƯ CẬP NHẬT / HUỶ — app nội bộ dùng khi nhân viên sửa booking.
   * Cùng bố cục thư xác nhận (khách quen một kiểu đọc), chỉ đổi tiêu đề, lời
   * mở đầu và chèn khối "Những thay đổi" vàng ngay dưới lời chào.
   */
  update?: { changes: string[]; cancelled?: boolean };
  /** Đã thanh toán / còn lại (VND) — thư từ app nội bộ có số này, thư web không. */
  paid?: number;
  balance?: number;
  /**
   * Nguồn ảnh logo. Mặc định là "cid:mbl-logo" — logo được đính kèm ngay
   * trong thư nên hiện được cả khi khách chưa cho phép tải ảnh từ ngoài, và
   * không phụ thuộc vào việc www.mebayluon.com đã deploy tệp đó hay chưa.
   */
  logoSrc?: string;
  price?: {
    basePerPerson?: number;
    perPerson?: number;
    discountPerPerson?: number;
    addonsQty?: Record<string, number>;
    addonsUnitPrice?: Record<string, number>;
    addonsTotal?: Record<string, number>;
    servicesBreakdown?: Array<{
      key?: string;
      label?: string;
      detail?: string;
      lineTotal?: number;
    }>;
    total?: number;
  };
};

export function customerEmailSubject(input: CustomerEmailInput): string {
  const t = T[normalizeEmailLang(input.lang)];
  const id = String(input.bookingId || "—");
  if (input.update?.cancelled) return t.subjectCancel(id);
  if (input.update) return t.subjectUpdate(id);
  return t.subject(id);
}

export function customerEmailHtml(input: CustomerEmailInput): string {
  const lang = normalizeEmailLang(input.lang);
  const t = T[lang];

  const guests = input.guests || [];
  const pax = Number(input.guestsCount) > 0 ? Number(input.guestsCount) : guests.length || 1;
  const contactName =
    input.name?.trim() ||
    input.contact?.contactName?.trim() ||
    input.contact?.fullName?.trim() ||
    guests[0]?.fullName?.trim() ||
    "";

  /* ---------- điểm đón / điểm hẹn ---------- */
  // Xem chú thích ở lib/booking/pickup.ts: phải xét cả dịch vụ đón cố định,
  // không chỉ địa chỉ khách tự gõ.
  const pickup = resolvePickup(input as any);
  const meetingLabel = pickup.hasPickup ? t.pickupPoint : t.meetingPoint;
  const meetingValue = pickup.hasPickup
    ? pickup.name || t.pickupPoint
    : input.location === "ha_noi"
      ? t.meetingHanoi
      : t.meetingSelf;

  /* ---------- thông tin chuyến bay ---------- */
  const factRows = [
    kvRow(t.location, input.locationName || "—"),
    kvRow(
      t.dateTime,
      [formatDate(input.dateISO), input.timeSlot].filter(Boolean).join(" · "),
    ),
    kvRow(t.guests, String(pax)),
    input.flightTypeLabel ? kvRow(t.flightType, input.flightTypeLabel) : "",
    input.packageLabel ? kvRow(t.packageLabel, input.packageLabel) : "",
    kvRow(meetingLabel, meetingValue),
  ].join("");

  const pickupNoteHtml = pickup.hasPickup
    ? `<tr><td style="padding:8px 0 0;">
        <div style="background:#EAF4FE;border-radius:8px;padding:9px 12px;font-size:14px;color:${C.blueDark};line-height:1.5;">⏱️ ${esc(t.pickupNote)}</div>
      </td></tr>`
    : "";

  /* ---------- khách bay ---------- */
  const th = (label: string) =>
    `<th align="left" style="padding:6px 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:${C.soft};border-bottom:1px solid ${C.line};">${esc(label)}</th>`;
  const td = (value: string, bold = false) =>
    `<td style="padding:7px 8px;font-size:14px;color:${C.ink};border-bottom:1px solid ${C.line};${bold ? "font-weight:600;" : ""}">${esc(value || "—")}</td>`;

  const guestRows = guests
    .map(
      (g, i) => `<tr>
        <td style="padding:7px 8px;font-size:14px;color:${C.blue};font-weight:700;border-bottom:1px solid ${C.line};">${i + 1}</td>
        ${td(g.fullName || "", true)}
        ${td(g.dob || "")}
        ${td(g.gender || "")}
        ${td(typeof g.weightKg === "number" ? `${g.weightKg} kg` : "")}
        ${td(g.nationality || "")}
        ${td(maskIdNumber(g.idNumber))}
      </tr>`,
    )
    .join("");

  const guestTable = guests.length
    ? `<tr><td style="padding-top:6px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <tr>
            ${th("#")}${th(t.colName)}${th(t.colDob)}${th(t.colGender)}${th(t.colWeight)}${th(t.colNationality)}${th(t.colId)}
          </tr>
          ${guestRows}
        </table>
        <div style="margin-top:6px;font-size:12px;color:${C.soft};">🔒 ${esc(t.idMaskedNote)}</div>
      </td></tr>`
    : "";

  /* ---------- bảng giá ---------- */
  const priceRow = (label: string, detail: string, amount: number, discount = false) =>
    `<tr>
      <td style="padding:7px 0;font-size:14px;color:${discount ? C.green : C.ink};border-bottom:1px solid ${C.line};">
        ${esc(label)}${detail ? `<br/><span style="font-size:12px;color:${C.soft};">${esc(detail)}</span>` : ""}
      </td>
      <td style="padding:7px 0;font-size:14px;font-weight:700;text-align:right;white-space:nowrap;color:${discount ? C.green : C.ink};border-bottom:1px solid ${C.line};">${money(amount)}</td>
    </tr>`;

  const base = Number(input.price?.basePerPerson ?? input.price?.perPerson ?? 0);
  const rows: string[] = [];

  if (base > 0) {
    rows.push(
      priceRow(
        t.basePrice,
        `${money(base)} × ${pax}`,
        base * pax,
      ),
    );
  }

  /**
   * Khoản giảm luôn nằm CUỐI bảng. Trước đây "Giảm combo ảnh" nằm lẫn giữa
   * các dịch vụ (vì nó đi chung mảng servicesBreakdown) nên đứng trên cả
   * flycam và camera 360 — nhìn như giảm cho thứ chưa liệt kê.
   */
  const breakdown = input.price?.servicesBreakdown || [];
  const discountRows: string[] = [];

  for (const row of breakdown) {
    const amount = Number(row?.lineTotal || 0);
    if (!amount) continue;

    const html = priceRow(
      String(row?.label || ""),
      String(row?.detail || ""),
      amount,
      amount < 0,
    );

    if (amount < 0) discountRows.push(html);
    else rows.push(html);
  }

  for (const key of ["pickup", "flycam", "camera360"] as const) {
    const qty = Number(input.price?.addonsQty?.[key] || 0);
    if (qty <= 0) continue;
    const unit = Number(input.price?.addonsUnitPrice?.[key] || 0);
    const total = Number(input.price?.addonsTotal?.[key] || unit * qty);
    if (!total) continue;
    const name =
      key === "pickup"
        ? t.pickupPoint
        : key === "flycam"
          ? "Flycam (drone camera)"
          : "Camera 360";
    rows.push(priceRow(name, `${money(unit)} × ${qty}`, total));
  }

  rows.push(...discountRows);

  const discountPerPerson = Number(input.price?.discountPerPerson || 0);
  if (discountPerPerson > 0) {
    rows.push(
      priceRow(
        t.groupDiscount,
        `-${money(discountPerPerson)} × ${pax}`,
        -discountPerPerson * pax,
        true,
      ),
    );
  }

  /* ---------- dịch vụ khách chọn thêm ---------- */
  const chosen = (input.selectedServiceLines || []).filter((x) => x?.label);
  const servicesHtml =
    sectionTitle(t.sectionServices) +
    `<tr><td style="padding-top:4px;">${
      chosen.length
        ? chosen
            .map(
              (item) =>
                `<div style="font-size:14px;color:${C.ink};line-height:1.7;"><span style="color:${C.green};font-weight:700;">✓</span> ${esc(item.label)}${
                  item.qty && item.qty > 0
                    ? ` <span style="color:${C.green};font-weight:700;">×${item.qty}</span>`
                    : ""
                }${item.note ? ` <span style="color:${C.soft};">· ${esc(item.note)}</span>` : ""}</div>`,
            )
            .join("")
        : `<div style="font-size:14px;color:${C.soft};">${esc(t.noService)}</div>`
    }</td></tr>`;

  /* ---------- đã bao gồm ---------- */
  const included = (input.includedLines || []).filter(Boolean);
  const includedHtml = included.length
    ? sectionTitle(t.sectionIncluded) +
      `<tr><td style="padding-top:4px;">${included
        .map(
          (item) =>
            `<div style="font-size:14px;color:${C.ink};line-height:1.7;"><span style="color:${C.green};font-weight:700;">✓</span> ${esc(item)}</div>`,
        )
        .join("")}</td></tr>`
    : "";

  /* ---------- yêu cầu đặc biệt ---------- */
  const request = input.contact?.specialRequest?.trim();
  const requestHtml = request
    ? sectionTitle(t.sectionRequest) +
      `<tr><td style="padding-top:4px;">
        <div style="background:${C.orangeBg};border-left:4px solid ${C.orange};border-radius:6px;padding:10px 12px;font-size:14px;color:#9a3412;line-height:1.6;">${esc(request)}</div>
      </td></tr>`
    : "";

  /* ---------- HTML ---------- */
  return `<!doctype html>
<html lang="${lang}">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(t.subject(String(input.bookingId || "")))}</title></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:24px 12px;">
<tr><td align="center">

<table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 18px rgba(0,0,0,.06);">

  <tr><td style="background:linear-gradient(135deg,#0194F3 0%,#0B6FC4 100%);padding:22px 28px;color:#ffffff;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="76" valign="middle" style="padding-right:14px;">
        <img src="${esc(input.logoSrc || "cid:mbl-logo")}" alt="Mebayluon Paragliding" width="72" height="72" style="display:block;width:72px;height:72px;border:0;"/>
      </td>
      <td valign="middle">
        <div style="font-size:11px;letter-spacing:2px;font-weight:700;opacity:.9;">MEBAYLUON PARAGLIDING</div>
        <div style="font-size:22px;font-weight:800;margin-top:3px;">${esc(t.headerTitle)}</div>
        <div style="margin-top:8px;font-size:13px;opacity:.92;">${esc(t.bookingRef)}:
          <span style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:16px;font-weight:800;letter-spacing:1px;">${esc(input.bookingId || "—")}</span>
        </div>
      </td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:24px 28px 28px;">
    <table width="100%" cellpadding="0" cellspacing="0">

      <tr><td style="font-size:16px;color:${C.ink};line-height:1.6;">
        <strong>${esc(t.hello(contactName || ""))}</strong><br/>${esc(
          input.update ? (input.update.cancelled ? t.introCancel : t.introUpdate) : t.intro,
        )}
      </td></tr>

      ${
        input.update && input.update.changes.length > 0
          ? `${sectionTitle(t.sectionChanges)}
      <tr><td>
        <div style="background:${input.update.cancelled ? "#FEF2F2" : "#FFFBEB"};border:1px solid ${
          input.update.cancelled ? "#FCA5A5" : "#FCD34D"
        };border-radius:8px;padding:11px 14px;">
          ${input.update.changes
            .map((c) =>
              /**
               * Dòng báo HUỶ nổi đỏ đậm — đó là dòng duy nhất khách không được
               * phép đọc lướt qua; các thay đổi thường giữ màu nâu vàng.
               */
              /HUỶ|HỦY|CANCEL|ANNUL|ОТМЕН|取消|रद्द/i.test(c)
                ? `<div style="font-size:15px;font-weight:800;color:#FFFFFF;background:#DC2626;border-radius:6px;padding:6px 10px;margin:2px 0;line-height:1.5;">• ${esc(c)}</div>`
                : `<div style="font-size:14px;font-weight:600;color:#78350F;line-height:1.7;">• ${esc(c)}</div>`,
            )
            .join("")}
        </div>
      </td></tr>`
          : ""
      }

      ${
        input.hasTicketAttachment
          ? `<tr><td style="padding-top:14px;">
              <div style="background:#EAF4FE;border:1px solid #B9DDFB;border-radius:8px;padding:11px 14px;font-size:14px;font-weight:600;color:${C.blueDark};">${esc(t.attachmentNote)}</div>
            </td></tr>`
          : ""
      }

      ${sectionTitle(t.sectionFlight)}
      <tr><td><table width="100%" cellpadding="0" cellspacing="0">${factRows}</table></td></tr>
      ${pickupNoteHtml}

      ${guests.length ? sectionTitle(t.sectionPassengers) : ""}
      ${guestTable}

      ${sectionTitle(t.sectionPrice)}
      <tr><td><table width="100%" cellpadding="0" cellspacing="0">${rows.join("")}</table></td></tr>
      <tr><td style="padding-top:12px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;">
          <tr>
            <td style="padding:12px 14px;font-size:15px;font-weight:700;color:#166534;">${esc(t.total)}</td>
            <td style="padding:12px 14px;font-size:20px;font-weight:800;color:#15803D;text-align:right;">${money(input.price?.total)}</td>
          </tr>
        </table>
        ${
          typeof input.paid === "number"
            ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px;">
                <tr>
                  <td style="padding:4px 14px;font-size:14px;color:${C.soft};">${esc(t.paidLabel)}</td>
                  <td style="padding:4px 14px;font-size:14px;font-weight:700;text-align:right;color:${C.ink};">${money(input.paid)}</td>
                </tr>
                <tr>
                  <td style="padding:4px 14px;font-size:14px;color:${C.soft};">${esc(t.balanceLabel)}</td>
                  <td style="padding:4px 14px;font-size:14px;font-weight:800;text-align:right;color:${(input.balance ?? 0) > 0 ? "#B91C1C" : "#15803D"};">${
                    (input.balance ?? 0) > 0 ? money(input.balance) : esc(t.fullyPaid)
                  }</td>
                </tr>
              </table>`
            : ""
        }
        <div style="margin-top:6px;font-size:12px;color:${C.soft};line-height:1.5;">${esc(t.paymentNote)}</div>
      </td></tr>

      ${
        input.spotPageUrl
          ? `<tr><td style="padding-top:16px;">
              <div style="background:#EAF4FE;border:1px solid #B9DDFB;border-radius:8px;padding:11px 14px;font-size:14px;">
                🔗 <a href="${esc(input.spotPageUrl)}" style="color:${C.blueDark};font-weight:700;">${esc(t.spotMore(input.locationName || ""))}</a>
              </div>
            </td></tr>`
          : ""
      }

      ${servicesHtml}
      ${includedHtml}
      ${requestHtml}

      ${sectionTitle(t.sectionNotes)}
      <tr><td style="padding-top:4px;font-size:14px;color:${C.ink};line-height:1.65;">
        <div>👕 ${esc(t.guideWear)}</div>
        <div>🎒 ${esc(t.guideBring)}</div>
        <div>🚫 ${esc(t.guideAvoid)}</div>
      </td></tr>

      ${(() => {
        /**
         * CHỈ ĐƯỜNG KHAU PHẠ theo loại bay (luật chủ 04/09), kèm QR toạ độ:
         *  - PPG: đến thẳng Mebayluon Clubhouse.
         *  - PG: bãi cất cánh (check-in Quầy Vé đỉnh đèo nếu từ hướng Ngã Ba
         *    Kim) + bãi hạ cánh (Tú Lệ/Cao Phạ qua đây rồi xe trung chuyển).
         *  - Đoàn lẫn PG+PPG: nhận cả hai khối.
         * QR vẽ bằng dịch vụ ảnh công cộng — thư là HTML tĩnh, khách chặn ảnh
         * thì vẫn còn nút "Mở bản đồ".
         */
        const nơi = `${String(input.location ?? "")} ${String(input.locationName ?? "")}`.toLowerCase();
        if (!/khau/.test(nơi)) return "";
        const kind = String(input.flightKind ?? "").toLowerCase();
        const nhãn = String(input.flightTypeLabel ?? "").toLowerCase();
        const hasPpg = kind.includes("ppg") || kind === "mixed" || /ppg|paramotor|dù máy|du may|động cơ|dong co/.test(nhãn);
        const hasPg = !hasPpg || kind === "mixed" || kind === "pg";
        const qr = (url: string) =>
          `<img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(url)}" width="140" height="140" alt="QR" style="display:block;border:1px solid ${C.line};border-radius:8px;"/>`;
        const card = (title: string, note: string, url: string) => `<tr><td style="padding-top:10px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.line};border-radius:10px;"><tr>
            <td style="vertical-align:top;padding:12px;">
              <div style="font-size:14px;font-weight:700;color:${C.ink};">${esc(title)}</div>
              <div style="font-size:13px;color:${C.soft};margin-top:4px;line-height:1.6;">${esc(note)}</div>
              <div style="margin-top:8px;"><a href="${esc(url)}" style="color:${C.blueDark};font-weight:700;">🗺 ${esc(t.dirOpenMap)}</a></div>
            </td>
            <td width="152" style="vertical-align:top;padding:12px 12px 12px 0;">${qr(url)}</td>
          </tr></table>
        </td></tr>`;
        return (
          sectionTitle(t.dirTitle) +
          (hasPpg ? card(t.dirPpgTitle, t.dirPpgNote, CLUBHOUSE_MAP_URL) : "") +
          (hasPg
            ? card(t.dirTakeoffTitle, t.dirTakeoffNote, KHAU_PHA_TAKEOFF_MAP_URL) +
              card(t.dirLandingTitle, t.dirLandingNote, CLUBHOUSE_MAP_URL)
            : "")
        );
      })()}

      ${sectionTitle(t.sectionNext)}
      <tr><td style="padding-top:4px;">
        <ol style="margin:0;padding-left:20px;font-size:14px;color:${C.ink};line-height:1.7;">
          ${t.nextSteps.map((x) => `<li>${esc(x)}</li>`).join("")}
        </ol>
      </td></tr>

      <tr><td style="padding-top:22px;">
        <div style="background:${C.bg};border-radius:10px;padding:16px;text-align:center;">
          <div style="font-size:14px;color:${C.soft};">${esc(t.contactIntro)}</div>
          <div style="font-size:18px;font-weight:800;color:${C.orange};margin-top:6px;">0964.073.555 &nbsp;•&nbsp; 0385.907.789</div>
          <div style="font-size:14px;color:${C.soft};margin-top:4px;">Zalo &nbsp;•&nbsp; WhatsApp &nbsp;•&nbsp; www.mebayluon.com</div>
        </div>
      </td></tr>

    </table>
  </td></tr>

  <tr><td style="background:${C.bg};border-top:1px solid ${C.line};padding:16px;text-align:center;font-size:12px;color:#94A3B8;">
    © ${esc(t.footerRights)}<br/>
    <a href="https://www.mebayluon.com" style="color:${C.blue};text-decoration:none;">www.mebayluon.com</a>
  </td></tr>

</table>

</td></tr>
</table>
</body></html>`;
}
