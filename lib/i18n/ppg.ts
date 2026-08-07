// lib/i18n/ppg.ts
/**
 * Nội dung trang /ppg — Dù lượn gắn động cơ (Paramotor / PPG).
 *
 * Tách riêng khỏi lib/i18n/common vì đây là nội dung của MỘT trang, để chung
 * sẽ phình cái file dùng chung ở mọi trang.
 *
 * Giá và link OTA KHÔNG khai ở đây:
 *  - giá lấy từ PPG_PRICING bên dưới (số, không phải chữ, nên không cần dịch)
 *  - link OTA lấy từ lib/spot-partner-links.ts, lọc theo kind = "paramotor"
 */

export type PpgLang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

/** Ảnh của bốn trải nghiệm. Chưa có ảnh thì để chuỗi rỗng — trang hiện ô trống
 *  kèm nhãn "ảnh đang cập nhật" chứ không vỡ bố cục. */
export const PPG_EXPERIENCE_IMAGES: Record<string, string> = {
  cloudHunting: "/ppg/san-may.jpg",
  sunrise: "/ppg/binh-minh.jpg",
  sunset: "/ppg/hoang-hon.jpg",
  highAltitude: "/ppg/cao-2000m.jpg",
};

/**
 * Ảnh nền cố định cho phần thân trang (dưới hero video).
 * TẠM dùng một khung cắt từ video quay ngoài — khách sẽ gửi ảnh flycam riêng,
 * lúc đó chỉ cần ghi đè file public/ppg/page-bg.jpg.
 */
export const PPG_PAGE_BACKGROUND = "/ppg/page-bg.jpg";

export const PPG_GALLERY = [
  "/ppg/gallery-1.jpg",
  "/ppg/gallery-2.jpg",
  "/ppg/gallery-3.jpg",
  "/ppg/gallery-4.jpg",
  "/ppg/gallery-5.jpg",
  "/ppg/gallery-6.jpg",
];

/**
 * Giá dịch vụ. Combo ảnh rẻ hơn mua lẻ 100.000đ — cùng mức giảm với ô combo ở
 * bước chọn dịch vụ của trang đặt bay, sửa một chỗ thì nhớ sửa cả hai.
 */
export const PPG_PRICING = {
  baseVND: 2_390_000,
  flycamVND: 400_000,
  camera360VND: 400_000,
  comboVND: 700_000,
  comboSaveVND: 100_000,
} as const;

/** Bài viết liên quan, mở trong cùng site. */
export const PPG_ARTICLE_SLUGS = {
  whoIsItFor: "du-luon-dong-co-phu-hop-voi-ai",
  vsParagliding: "phan-biet-du-luon-va-du-luon-dong-co",
} as const;

type Experience = { title: string; desc: string };
type Step = { title: string; desc: string };
/** Ảnh bay kèm mỗi cảm nhận — cùng thứ tự với mảng reviews của mọi ngôn ngữ. */
export const PPG_REVIEW_IMAGES = [
  "/ppg/review-1.jpg",
  "/ppg/review-2.jpg",
  "/ppg/review-3.jpg",
  "/ppg/review-4.jpg",
];

type Review = { name: string; from: string; text: string };

export type PpgCopy = {
  metaTitle: string;
  metaDescription: string;

  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  heroFrom: string;
  ctaBook: string;
  ctaPartners: string;

  introTitle: string;
  introBody: string[];
  readWhoIsItFor: string;
  readVsParagliding: string;

  experiencesTitle: string;
  experiencesSubtitle: string;
  experiences: {
    cloudHunting: Experience;
    sunrise: Experience;
    sunset: Experience;
    highAltitude: Experience;
  };
  imageComingSoon: string;

  locationTitle: string;
  /** Nhãn nút bản đồ: cất & hạ cánh dù máy đều ở sân Clubhouse. */
  mapLabel: string;
  locationBody: string;
  takeoffLabel: string;
  takeoffValue: string;
  /** Nhãn link bản đồ nằm ngay trong ô bãi cất cánh. */
  mapCta: string;
  landingLabel: string;
  landingValue: string;
  altitudeLabel: string;
  altitudeValue: string;
  durationLabel: string;
  durationValue: string;

  pricingTitle: string;
  pricingSubtitle: string;
  baseLabel: string;
  includedTitle: string;
  included: string[];
  flycamLabel: string;
  camera360Label: string;
  comboLabel: string;
  comboSave: string;
  perPax: string;

  guideTitle: string;
  steps: Step[];
  requirementsTitle: string;
  requirements: string[];

  galleryTitle: string;

  reviewsTitle: string;
  reviews: Review[];

  partnersTitle: string;
  partnersSubtitle: string;

  finalCtaTitle: string;
  finalCtaBody: string;
};

const vi: PpgCopy = {
  metaTitle: "Dù lượn gắn động cơ (PPG) tại Đèo Khau Phạ | Mebayluon",
  metaDescription:
    "Bay dù lượn gắn động cơ tại đèo Khau Phạ — cất cánh ngay tại Clubhouse Mebayluon. Bay săn mây, bay hoàng hôn, bay cao 2.000m. Giá từ 2.390.000đ.",

  heroBadge: "Đèo Khau Phạ — Mù Cang Chải",
  heroTitle: "Dù lượn gắn động cơ",
  heroSubtitle:
    "Tự chọn thời lượng, chủ động độ cao, bay được cả khi trời lặng gió.",
  heroFrom: "Giá từ",
  ctaBook: "Đặt bay ngay",
  ctaPartners: "Đặt qua đối tác",

  introTitle: "Dù lượn gắn động cơ là gì?",
  introBody: [
    "Dù lượn gắn động cơ (paramotor, viết tắt PPG) là dù lượn có thêm một động cơ đẩy. Khác với dù lượn thường phải phụ thuộc vào gió nếu muốn bay lâu, bay cao, thì dù máy có thể chủ động: cất cánh từ dưới thấp, bay lên cao bao nhiêu tuỳ ý, bay lâu tuỳ ý và bay được cả lúc trời lặng gió. Đây là trải nghiệm cao cấp nhất vì khách có thể bay tới những góc mà dù lượn thông thường không thể làm được.",
    "Vì thế đây là lựa chọn cho những ai muốn bay đúng khung giờ đẹp nhất trong ngày — sáng sớm khi mây còn phủ kín thung lũng, hoặc chiều muộn lúc mặt trời xuống sau dãy núi — mà không phải phụ thuộc vào việc hôm đó gió có lên hay không.",
    "Tại Khau Phạ, chúng tôi bay bằng trike (dù động cơ có gắn bánh xe), khách ngồi ghế phía trước, phi công ngồi sau điều khiển. Không cần chạy đà, phù hợp cả với người lớn tuổi hoặc người không quen vận động mạnh.",
  ],
  readWhoIsItFor: "Dù lượn gắn động cơ phù hợp với ai?",
  readVsParagliding: "Dù lượn và dù lượn gắn động cơ khác nhau thế nào?",

  experiencesTitle: "Bốn trải nghiệm bay",
  experiencesSubtitle:
    "Cùng một điểm bay, mỗi khung giờ lại là một Khau Phạ khác nhau.",
  experiences: {
    cloudHunting: {
      title: "Bay săn mây",
      desc: "Bay xuyên qua tầng mây thấp phủ kín thung lũng Tú Lệ, ngoi lên trên biển mây trắng. Đẹp nhất vào sáng sớm sau một đêm mưa hoặc trời lạnh.",
    },
    sunrise: {
      title: "Bay bình minh",
      desc: "Cất cánh lúc trời vừa hửng, đón mặt trời lên từ trên không trong khi cả thung lũng còn chìm trong sương. Khung giờ yên gió nhất trong ngày.",
    },
    sunset: {
      title: "Bay hoàng hôn",
      desc: "Bay lúc chiều muộn, mặt trời hạ dần sau dãy núi và cả biển mây nhuộm vàng cam. Khung hình được khách chụp nhiều nhất.",
    },
    highAltitude: {
      title: "Bay cao 2.000m",
      desc: "Lên tới độ cao 2.000m, nhìn trọn đèo Khau Phạ, thung lũng Tú Lệ và những dãy núi trùng điệp phía sau. Độ cao mà dù lượn thường rất khó đạt tới.",
    },
  },
  imageComingSoon: "Ảnh đang cập nhật",

  locationTitle: "Địa điểm bay",
  mapLabel: "Toạ độ cất & hạ cánh dù lượn gắn động cơ (Clubhouse Mebayluon)",
  locationBody:
    "Toàn bộ chuyến bay dù máy diễn ra tại đèo Khau Phạ, Mù Cang Chải — đây là điểm bay duy nhất của Mebayluon có dịch vụ này. Bãi cất cánh nằm ngay tại sân Clubhouse Mebayluon, khách không phải di chuyển lên đỉnh đèo như khi bay dù lượn thường.",
  takeoffLabel: "Bãi cất cánh",
  takeoffValue: "Clubhouse Mebayluon — Thôn Lìm Thái, xã Tú Lệ",
  mapCta: "Xem toạ độ trên Google Maps",
  landingLabel: "Bãi hạ cánh",
  landingValue: "Cùng vị trí cất cánh",
  altitudeLabel: "Độ cao bay",
  altitudeValue: "Tới 2.000 m",
  durationLabel: "Thời lượng bay",
  durationValue: "10 – 25 phút (tự chọn)",

  pricingTitle: "Giá dịch vụ",
  pricingSubtitle: "Giá cho một khách, một chuyến bay.",
  baseLabel: "Bay dù lượn gắn động cơ",
  includedTitle: "Gói bay bao gồm",
  included: [
    "Phi công chuyên nghiệp và trang thiết bị đạt chuẩn",
    "Bảo hiểm cho khách bay",
    "Ảnh và video GoPro toàn bộ chuyến bay — miễn phí",
    "Chứng nhận tham gia, nước uống, quà lưu niệm",
    "Miễn phí đổi hoặc huỷ lịch do thời tiết",
  ],
  flycamLabel: "Quay flycam",
  camera360Label: "Quay camera 360°",
  comboLabel: "Combo flycam + camera 360°",
  comboSave: "Tiết kiệm",
  perPax: "/khách",

  guideTitle: "Chuyến bay diễn ra thế nào",
  steps: [
    {
      title: "1. Đặt lịch trước",
      desc: "Đặt qua website, hotline, Zalo/WhatsApp hoặc nền tảng đối tác. Chúng tôi xác nhận trong vòng 3 giờ và hẹn khung giờ theo dự báo thời tiết.",
    },
    {
      title: "2. Có mặt tại Clubhouse",
      desc: "Đến Clubhouse Mebayluon đúng giờ hẹn. Làm thủ tục check-in và nhận vé bay.",
    },
    {
      title: "3. Nghe hướng dẫn an toàn",
      desc: "Phi công hướng dẫn cách ngồi, cách giữ tay chân khi cất và hạ cánh, và trả lời mọi thắc mắc trước khi lên máy.",
    },
    {
      title: "4. Mặc trang bị và cất cánh",
      desc: "Mặc đai an toàn và mũ bảo hiểm. Trike chạy trên sân rồi rời mặt đất — khách chỉ việc ngồi yên, không cần chạy đà.",
    },
    {
      title: "5. Bay và ngắm cảnh",
      desc: "Trên không, khách hoàn toàn thoải mái ngắm cảnh, quay phim, trò chuyện với phi công. Muốn bay cao hơn hay êm hơn cứ nói.",
    },
    {
      title: "6. Hạ cánh và nhận ảnh",
      desc: "Hạ cánh nhẹ nhàng ngay tại sân. Ảnh và video GoPro bàn giao ngay sau chuyến bay; file camera 360° gửi trong vòng 24 giờ.",
    },
  ],
  requirementsTitle: "Điều kiện tham gia",
  requirements: [
    "Từ 3 tuổi trở lên; dưới 18 tuổi cần người giám hộ đồng ý",
    "Cân nặng dưới 120 kg (trên 90 kg hoặc dưới 30 kg báo trước)",
    "Không sử dụng rượu bia trước chuyến bay",
    "Mang được điện thoại và vật dụng nhỏ, khách tự bảo quản",
    "Mặc quần áo dài tay, đi giày thể thao hoặc giày leo núi",
    "Không phù hợp với người mắc động kinh, tim mạch nặng, cao huyết áp, bệnh cột sống và phụ nữ mang thai",
  ],

  galleryTitle: "Khoảnh khắc tại điểm bay",

  reviewsTitle: "Khách nói gì",
  reviews: [
    {
      name: "Nguyễn Hoàng Anh",
      from: "Hà Nội",
      text: "Đi Khau Phạ ba lần mới gặp được buổi sáng mây đẹp như thế. Ngồi ghế trước nên tầm nhìn không bị vướng gì, cảm giác như treo lơ lửng giữa biển mây. Phi công bay rất êm, mẹ mình 58 tuổi bay cùng cũng không thấy sợ.",
    },
    {
      name: "Minh Tâm",
      from: "TP. Hồ Chí Minh",
      text: "Chọn khung giờ hoàng hôn và không hối hận. Mặt trời xuống sau núi, mây bên dưới vàng rực. Video GoPro được gửi ngay sau khi hạ cánh, file 360 hôm sau có, chất lượng tốt hơn mình tưởng.",
    },
    {
      name: "Lê Thanh Quyên",
      from: "Đà Nẵng",
      text: "Hơn hẳn dù lượn thường ở chỗ chủ động. Hôm đó lặng gió, đoàn bay dù thường phải chờ, còn mình vẫn cất cánh đúng giờ và bay được hơn 20 phút. Cất cánh từ sân Clubhouse nên không phải leo đèo.",
    },
    {
      name: "Maysa",
      from: "Lào",
      text: "Mình đã đi nhiều nơi và thử rất nhiều trò chơi nhưng dù lượn rất đặc biệt, và dù máy thì càng đặc biệt hơn vì nó đưa mình lên độ cao rất lớn và chạm vào mây. Nói thật mình hơi sợ, nhưng rất ấn tượng và quyết định bay là một quyết định đúng.",
    },
  ],

  partnersTitle: "Đặt qua đối tác",
  partnersSubtitle:
    "Tour dù lượn gắn động cơ tại Khau Phạ cũng bán trên các nền tảng dưới đây.",

  finalCtaTitle: "Sẵn sàng bay chưa?",
  finalCtaBody:
    "Đặt trước để chúng tôi chọn khung giờ thời tiết đẹp nhất cho chuyến bay của bạn.",
};

const en: PpgCopy = {
  metaTitle: "Powered Paragliding (PPG) at Khau Pha Pass | Mebayluon",
  metaDescription:
    "Powered paragliding at Khau Pha Pass — take off right at Clubhouse Mebayluon. Cloud hunting, sunset flights, climbs to 2,000 m. From 2,390,000 VND.",

  heroBadge: "Khau Pha Pass — Mu Cang Chai",
  heroTitle: "Powered paragliding",
  heroSubtitle:
    "Choose your own airtime, control your altitude, fly even when the wind is still.",
  heroFrom: "From",
  ctaBook: "Book a flight",
  ctaPartners: "Book via partners",

  introTitle: "What is powered paragliding?",
  introBody: [
    "Powered paragliding (paramotor, PPG) is a paraglider with an engine behind you. An unpowered glider depends on the wind if you want to stay up long or climb high; a paramotor does not. It takes off from low ground, climbs as high as you want, stays up as long as you want, and flies even on a still day. It is the premium way to fly here, because it reaches viewpoints an ordinary paraglider simply cannot.",
    "That makes it the choice for anyone who wants to fly at the best hour of the day — early morning while cloud still fills the valley, or late afternoon as the sun drops behind the ridge — without depending on whether the wind turns up.",
    "At Khau Pha we fly a trike — a paramotor mounted on wheels. You sit in the front seat, the pilot sits behind and flies. There is no take-off run, so it also suits older guests and anyone not used to physical exertion.",
  ],
  readWhoIsItFor: "Who is powered paragliding for?",
  readVsParagliding: "Paragliding vs powered paragliding — what's the difference?",

  experiencesTitle: "Four ways to fly",
  experiencesSubtitle: "Same site — every hour gives you a different Khau Pha.",
  experiences: {
    cloudHunting: {
      title: "Cloud hunting",
      desc: "Climb through the low cloud that fills the Tu Le valley and come out above a white sea of cloud. Best in the early morning after a rainy night or on a cold day.",
    },
    sunrise: {
      title: "Sunrise flight",
      desc: "Take off at first light and meet the sun in the air while the whole valley is still under mist. The calmest hour of the day.",
    },
    sunset: {
      title: "Sunset flight",
      desc: "Fly late in the afternoon as the sun sinks behind the ridge and the cloud below turns gold and orange. The shot our guests photograph most.",
    },
    highAltitude: {
      title: "Climb to 2,000 m",
      desc: "Go up to 2,000 metres for the whole of Khau Pha Pass, the Tu Le valley and the ranges behind it — an altitude an unpowered glider rarely reaches.",
    },
  },
  imageComingSoon: "Photo coming soon",

  locationTitle: "Where you fly",
  mapLabel: "Paramotor take-off & landing coordinates (Clubhouse Mebayluon)",
  locationBody:
    "Every paramotor flight takes place at Khau Pha Pass, Mu Cang Chai — the only Mebayluon site offering this. The take-off field is the Clubhouse Mebayluon ground itself, so unlike unpowered paragliding you do not have to drive up to the top of the pass.",
  takeoffLabel: "Take-off",
  takeoffValue: "Clubhouse Mebayluon — Lim Thai, Tu Le",
  mapCta: "View coordinates on Google Maps",
  landingLabel: "Landing",
  landingValue: "Same as take-off",
  altitudeLabel: "Altitude",
  altitudeValue: "Up to 2,000 m",
  durationLabel: "Airtime",
  durationValue: "10 – 25 minutes (your choice)",

  pricingTitle: "Prices",
  pricingSubtitle: "Per passenger, per flight.",
  baseLabel: "Powered paragliding flight",
  includedTitle: "The flight includes",
  included: [
    "Professional pilot and certified equipment",
    "Passenger insurance",
    "GoPro photos and video of the whole flight — free",
    "Participation certificate, drinking water, souvenir",
    "Free rescheduling or cancellation due to weather",
  ],
  flycamLabel: "Drone filming",
  camera360Label: "360° camera",
  comboLabel: "Drone + 360° camera combo",
  comboSave: "You save",
  perPax: "/passenger",

  guideTitle: "How the flight works",
  steps: [
    {
      title: "1. Book ahead",
      desc: "Book via the website, hotline, Zalo/WhatsApp or a partner platform. We confirm within 3 hours and set a time slot based on the forecast.",
    },
    {
      title: "2. Arrive at the Clubhouse",
      desc: "Come to Clubhouse Mebayluon at the agreed time. Complete check-in and collect your flight ticket.",
    },
    {
      title: "3. Safety briefing",
      desc: "The pilot shows you how to sit and where to keep your hands and feet on take-off and landing, and answers any question before you board.",
    },
    {
      title: "4. Gear up and take off",
      desc: "Harness and helmet on. The trike rolls across the field and lifts off — you simply sit still, no running required.",
    },
    {
      title: "5. Fly and enjoy",
      desc: "In the air you are free to look around, film and talk to the pilot. Want to go higher, or take it gently? Just say so.",
    },
    {
      title: "6. Land and get your footage",
      desc: "A gentle landing back on the same field. GoPro photos and video are handed over right after the flight; 360° files follow within 24 hours.",
    },
  ],
  requirementsTitle: "Who can fly",
  requirements: [
    "From 3 years old; under 18 needs guardian consent",
    "Under 120 kg (tell us if over 90 kg or under 30 kg)",
    "No alcohol before the flight",
    "Phone and small items allowed, at your own risk",
    "Long sleeves, sports or hiking shoes",
    "Not suitable with epilepsy, serious heart conditions, high blood pressure, spinal problems, or during pregnancy",
  ],

  galleryTitle: "Moments at the flying site",

  reviewsTitle: "What guests say",
  reviews: [
    {
      name: "Nguyen Hoang Anh",
      from: "Hanoi",
      text: "It took three trips to Khau Pha to catch a morning with cloud like that. The front seat means nothing blocks your view — it really feels like hanging in the middle of a sea of cloud. The pilot flew very smoothly; my mother is 58 and she flew too without being scared.",
    },
    {
      name: "Minh Tam",
      from: "Ho Chi Minh City",
      text: "We picked the sunset slot and had no regrets. The sun went down behind the mountain and the cloud below turned gold. The GoPro video was handed over right after landing, the 360 file arrived the next day, better quality than I expected.",
    },
    {
      name: "Le Thanh Quyen",
      from: "Da Nang",
      text: "The big advantage over normal paragliding is control. It was dead calm that day, the unpowered group had to wait, but we took off on time and stayed up for more than 20 minutes. Taking off from the Clubhouse field also saved the drive up the pass.",
    },
    {
      name: "Maysa",
      from: "Laos",
      text: "I have travelled a lot and tried many activities, but paragliding is really special — and the paramotor even more so, because it takes you very high and right into the clouds. Honestly I was a little scared, but it left a strong impression and deciding to fly was the right call.",
    },
  ],

  partnersTitle: "Book via partners",
  partnersSubtitle:
    "The Khau Pha paramotor experience is also sold on the platforms below.",

  finalCtaTitle: "Ready to fly?",
  finalCtaBody:
    "Book ahead so we can put you in the best weather window of the day.",
};

const fr: PpgCopy = {
  metaTitle: "Paramoteur (PPG) au col de Khau Pha | Mebayluon",
  metaDescription:
    "Paramoteur au col de Khau Pha — décollage sur le terrain du Clubhouse Mebayluon. Vol sur mer de nuages, coucher de soleil, montée à 2 000 m. À partir de 2 390 000 VND.",

  heroBadge: "Col de Khau Pha — Mu Cang Chai",
  heroTitle: "Vol en paramoteur",
  heroSubtitle:
    "Vous choisissez la durée, maîtrisez l’altitude et volez même par vent nul.",
  heroFrom: "À partir de",
  ctaBook: "Réserver un vol",
  ctaPartners: "Réserver via nos partenaires",

  introTitle: "Qu’est-ce que le paramoteur ?",
  introBody: [
    "Le paramoteur (PPG) est un parapente équipé d’un moteur. Un parapente classique dépend du vent pour voler longtemps ou monter haut ; le paramoteur non. Il décolle d’un terrain bas, monte aussi haut que vous le voulez, reste en l’air aussi longtemps que vous le souhaitez et vole même par temps calme. C’est l’expérience la plus haut de gamme, car elle atteint des points de vue qu’un parapente classique ne peut tout simplement pas atteindre.",
    "C’est donc le choix idéal pour voler à la plus belle heure de la journée — tôt le matin quand la vallée est encore noyée de nuages, ou en fin d’après-midi quand le soleil descend derrière la crête — sans dépendre du vent.",
    "À Khau Pha nous volons en chariot — un paramoteur monté sur roues : vous êtes assis à l’avant, le pilote derrière. Aucune course au décollage, ce qui convient aussi aux personnes âgées ou peu sportives.",
  ],
  readWhoIsItFor: "À qui s’adresse le paramoteur ?",
  readVsParagliding: "Parapente et paramoteur : quelles différences ?",

  experiencesTitle: "Quatre façons de voler",
  experiencesSubtitle:
    "Même site — chaque heure vous offre un Khau Pha différent.",
  experiences: {
    cloudHunting: {
      title: "Vol sur mer de nuages",
      desc: "Traversez la couche nuageuse qui remplit la vallée de Tu Le et ressortez au-dessus d’une mer de nuages blanche. Idéal tôt le matin après une nuit de pluie ou par temps froid.",
    },
    sunrise: {
      title: "Vol au lever du soleil",
      desc: "Décollez aux premières lueurs et accueillez le soleil depuis les airs pendant que la vallée dort encore sous la brume. L’heure la plus calme de la journée.",
    },
    sunset: {
      title: "Vol au coucher du soleil",
      desc: "Volez en fin d’après-midi, quand le soleil plonge derrière la crête et que les nuages en dessous virent à l’or et à l’orange. La photo la plus prise par nos clients.",
    },
    highAltitude: {
      title: "Montée à 2 000 m",
      desc: "Montez à 2 000 mètres pour embrasser tout le col de Khau Pha, la vallée de Tu Le et les chaînes qui s’étendent derrière — une altitude qu’un parapente atteint rarement.",
    },
  },
  imageComingSoon: "Photo à venir",

  locationTitle: "Le lieu de vol",
  mapLabel: "Coordonnées décollage & atterrissage paramoteur (Clubhouse Mebayluon)",
  locationBody:
    "Tous les vols en paramoteur ont lieu au col de Khau Pha, Mu Cang Chai — le seul site Mebayluon qui propose cette activité. Le terrain de décollage est celui du Clubhouse Mebayluon : contrairement au parapente, pas besoin de monter jusqu’au sommet du col.",
  takeoffLabel: "Décollage",
  takeoffValue: "Clubhouse Mebayluon — Lim Thai, Tu Le",
  mapCta: "Voir les coordonnées sur Google Maps",
  landingLabel: "Atterrissage",
  landingValue: "Au même endroit",
  altitudeLabel: "Altitude",
  altitudeValue: "Jusqu’à 2 000 m",
  durationLabel: "Durée de vol",
  durationValue: "10 à 25 minutes (au choix)",

  pricingTitle: "Tarifs",
  pricingSubtitle: "Par passager et par vol.",
  baseLabel: "Vol en paramoteur",
  includedTitle: "Le vol comprend",
  included: [
    "Pilote professionnel et matériel certifié",
    "Assurance passager",
    "Photos et vidéo GoPro de tout le vol — offertes",
    "Certificat de participation, eau, souvenir",
    "Report ou annulation sans frais en cas de météo défavorable",
  ],
  flycamLabel: "Prise de vue par drone",
  camera360Label: "Caméra 360°",
  comboLabel: "Pack drone + caméra 360°",
  comboSave: "Vous économisez",
  perPax: "/passager",

  guideTitle: "Comment se déroule le vol",
  steps: [
    {
      title: "1. Réservez à l’avance",
      desc: "Via le site, la hotline, Zalo/WhatsApp ou une plateforme partenaire. Nous confirmons sous 3 heures et fixons un créneau selon les prévisions.",
    },
    {
      title: "2. Rendez-vous au Clubhouse",
      desc: "Présentez-vous au Clubhouse Mebayluon à l’heure convenue. Effectuez l’enregistrement et retirez votre billet de vol.",
    },
    {
      title: "3. Briefing sécurité",
      desc: "Le pilote vous montre comment vous asseoir et où placer mains et pieds au décollage et à l’atterrissage, et répond à toutes vos questions.",
    },
    {
      title: "4. Équipement et décollage",
      desc: "Harnais et casque enfilés. Le chariot roule sur le terrain puis quitte le sol — vous restez simplement assis, sans course d’élan.",
    },
    {
      title: "5. Vol et panorama",
      desc: "En vol, vous êtes libre de regarder, filmer et discuter avec le pilote. Vous voulez monter plus haut ou voler tout en douceur ? Dites-le.",
    },
    {
      title: "6. Atterrissage et remise des images",
      desc: "Atterrissage en douceur sur le même terrain. Photos et vidéo GoPro remises juste après le vol ; fichiers 360° sous 24 heures.",
    },
  ],
  requirementsTitle: "Conditions de participation",
  requirements: [
    "À partir de 3 ans ; accord du tuteur avant 18 ans",
    "Moins de 120 kg (prévenez au-delà de 90 kg ou sous 30 kg)",
    "Pas d’alcool avant le vol",
    "Téléphone et petits objets admis, sous votre responsabilité",
    "Manches longues, chaussures de sport ou de randonnée",
    "Déconseillé en cas d’épilepsie, maladie cardiaque grave, hypertension, problème de colonne ou de grossesse",
  ],

  galleryTitle: "Instants sur le site de vol",

  reviewsTitle: "Ce que disent nos clients",
  reviews: [
    {
      name: "Nguyen Hoang Anh",
      from: "Hanoï",
      text: "Il a fallu trois voyages à Khau Pha pour tomber sur un matin avec de tels nuages. Assis à l’avant, rien ne gêne la vue — on a vraiment l’impression de flotter au milieu d’une mer de nuages. Le pilote vole très doucement ; ma mère de 58 ans a volé aussi sans avoir peur.",
    },
    {
      name: "Minh Tam",
      from: "Hô Chi Minh-Ville",
      text: "Nous avons choisi le créneau coucher de soleil, sans regret. Le soleil est passé derrière la montagne et les nuages en dessous sont devenus dorés. La vidéo GoPro nous a été remise juste après l’atterrissage, le fichier 360 le lendemain, avec une meilleure qualité qu’attendu.",
    },
    {
      name: "Le Thanh Quyen",
      from: "Da Nang",
      text: "Le gros avantage sur le parapente, c’est la maîtrise. Ce jour-là il n’y avait aucun vent, le groupe parapente a dû attendre, alors que nous avons décollé à l’heure et volé plus de 20 minutes. Décoller du terrain du Clubhouse évite aussi la montée au col.",
    },
    {
      name: "Maysa",
      from: "Laos",
      text: "J’ai beaucoup voyagé et essayé de nombreuses activités, mais le parapente est vraiment à part — et le paramoteur encore plus, car il vous emmène très haut, jusque dans les nuages. Honnêtement j’avais un peu peur, mais l’impression est forte et décider de voler était le bon choix.",
    },
  ],

  partnersTitle: "Réserver via nos partenaires",
  partnersSubtitle:
    "L’expérience paramoteur de Khau Pha est également vendue sur les plateformes ci-dessous.",

  finalCtaTitle: "Prêt à décoller ?",
  finalCtaBody:
    "Réservez à l’avance pour que nous vous placions dans la meilleure fenêtre météo de la journée.",
};

const ru: PpgCopy = {
  metaTitle: "Парамотор (PPG) на перевале Khau Pha | Mebayluon",
  metaDescription:
    "Полёты на парамоторе на перевале Khau Pha — старт прямо на площадке Clubhouse Mebayluon. Над морем облаков, на закате, подъём до 2 000 м. От 2 390 000 VND.",

  heroBadge: "Перевал Khau Pha — Mu Cang Chai",
  heroTitle: "Полёт на парамоторе",
  heroSubtitle:
    "Вы выбираете длительность, управляете высотой и летите даже в полный штиль.",
  heroFrom: "От",
  ctaBook: "Забронировать полёт",
  ctaPartners: "Бронирование у партнёров",

  introTitle: "Что такое парамотор?",
  introBody: [
    "Парамотор (PPG) — это параплан с мотором за спиной. Обычному параплану нужен ветер, чтобы летать долго и высоко; парамотору — нет. Он стартует с низкой площадки, набирает любую высоту, держится в воздухе сколько угодно и летает даже в безветренный день. Это самый премиальный формат: он открывает ракурсы, недоступные обычному параплану.",
    "Поэтому это выбор для тех, кто хочет лететь в самый красивый час дня — ранним утром, когда долина ещё укрыта облаками, или под вечер, когда солнце садится за хребет, — не завися от того, поднимется ли ветер.",
    "На Khau Pha мы летаем на трайке — парамоторе, установленном на колёсах. Вы сидите впереди, пилот сзади. Разбег не нужен, поэтому полёт подходит и пожилым гостям, и тем, кто не привык к физическим нагрузкам.",
  ],
  readWhoIsItFor: "Кому подходит парамотор?",
  readVsParagliding: "Чем параплан отличается от парамотора?",

  experiencesTitle: "Четыре формата полёта",
  experiencesSubtitle: "Одна площадка — каждый час свой Khau Pha.",
  experiences: {
    cloudHunting: {
      title: "Полёт над морем облаков",
      desc: "Пройдите сквозь низкую облачность, заполняющую долину Tu Le, и выйдите над белым морем облаков. Лучше всего ранним утром после дождливой ночи или в холодный день.",
    },
    sunrise: {
      title: "Полёт на рассвете",
      desc: "Взлетите на первом свете и встретьте солнце в воздухе, пока вся долина ещё в тумане. Самый спокойный час дня.",
    },
    sunset: {
      title: "Полёт на закате",
      desc: "Летите под вечер, когда солнце уходит за хребет, а облака внизу становятся золотыми и оранжевыми. Самый фотографируемый нашими гостями кадр.",
    },
    highAltitude: {
      title: "Подъём до 2 000 м",
      desc: "Поднимитесь на 2 000 метров и увидите весь перевал Khau Pha, долину Tu Le и гряды за ней — высота, которой параплан достигает редко.",
    },
  },
  imageComingSoon: "Фото скоро появится",

  locationTitle: "Где проходит полёт",
  mapLabel: "Координаты старта и посадки парамотора (Clubhouse Mebayluon)",
  locationBody:
    "Все полёты на парамоторе проходят на перевале Khau Pha, Mu Cang Chai — это единственная площадка Mebayluon с такой услугой. Старт — прямо на площадке Clubhouse Mebayluon, поэтому в отличие от параплана подниматься на вершину перевала не нужно.",
  takeoffLabel: "Старт",
  takeoffValue: "Clubhouse Mebayluon — Lim Thai, Tu Le",
  mapCta: "Смотреть координаты на Google Maps",
  landingLabel: "Посадка",
  landingValue: "Там же, где старт",
  altitudeLabel: "Высота",
  altitudeValue: "До 2 000 м",
  durationLabel: "Время в воздухе",
  durationValue: "10 – 25 минут (на выбор)",

  pricingTitle: "Цены",
  pricingSubtitle: "За одного пассажира за один полёт.",
  baseLabel: "Полёт на парамоторе",
  includedTitle: "В полёт входит",
  included: [
    "Профессиональный пилот и сертифицированное снаряжение",
    "Страхование пассажира",
    "Фото и видео с GoPro за весь полёт — бесплатно",
    "Сертификат участника, вода, сувенир",
    "Бесплатный перенос или отмена из-за погоды",
  ],
  flycamLabel: "Съёмка с дрона",
  camera360Label: "Камера 360°",
  comboLabel: "Комбо: дрон + камера 360°",
  comboSave: "Экономия",
  perPax: "/пассажир",

  guideTitle: "Как проходит полёт",
  steps: [
    {
      title: "1. Забронируйте заранее",
      desc: "Через сайт, горячую линию, Zalo/WhatsApp или партнёрскую площадку. Мы подтверждаем в течение 3 часов и назначаем время по прогнозу погоды.",
    },
    {
      title: "2. Приезжайте в Clubhouse",
      desc: "Приходите в Clubhouse Mebayluon в назначенное время. Пройдите регистрацию и получите посадочный билет.",
    },
    {
      title: "3. Инструктаж по безопасности",
      desc: "Пилот показывает, как сидеть и куда держать руки и ноги при старте и посадке, и отвечает на все вопросы до посадки в аппарат.",
    },
    {
      title: "4. Снаряжение и взлёт",
      desc: "Надеваем подвеску и шлем. Трайк разгоняется по площадке и отрывается от земли — вам нужно просто сидеть, разбег не требуется.",
    },
    {
      title: "5. Полёт и виды",
      desc: "В воздухе вы свободно смотрите по сторонам, снимаете и общаетесь с пилотом. Хотите выше или помягче — просто скажите.",
    },
    {
      title: "6. Посадка и получение материалов",
      desc: "Мягкая посадка на ту же площадку. Фото и видео с GoPro передаются сразу после полёта; файлы 360° — в течение 24 часов.",
    },
  ],
  requirementsTitle: "Кто может лететь",
  requirements: [
    "От 3 лет; до 18 лет — согласие опекуна",
    "До 120 кг (сообщите, если более 90 кг или менее 30 кг)",
    "Без алкоголя перед полётом",
    "Телефон и мелкие вещи можно, под вашу ответственность",
    "Длинный рукав, спортивная или треккинговая обувь",
    "Не подходит при эпилепсии, тяжёлых болезнях сердца, гипертонии, болезнях позвоночника и при беременности",
  ],

  galleryTitle: "Моменты на месте полётов",

  reviewsTitle: "Отзывы гостей",
  reviews: [
    {
      name: "Nguyen Hoang Anh",
      from: "Ханой",
      text: "Понадобилось три поездки на Khau Pha, чтобы застать такое утро с облаками. Переднее кресло — обзору ничего не мешает, ощущение, будто висишь посреди моря облаков. Пилот вёл очень мягко; моей маме 58, она тоже летела и совсем не боялась.",
    },
    {
      name: "Minh Tam",
      from: "Хошимин",
      text: "Выбрали закатное окно и не пожалели. Солнце ушло за гору, облака внизу стали золотыми. Видео с GoPro отдали сразу после посадки, файл 360 пришёл на следующий день, качество лучше, чем я ожидала.",
    },
    {
      name: "Le Thanh Quyen",
      from: "Дананг",
      text: "Главное преимущество перед обычным парапланом — управляемость. В тот день был полный штиль, группе парапланеристов пришлось ждать, а мы стартовали вовремя и пролетали больше 20 минут. Старт с площадки Clubhouse избавил ещё и от подъёма на перевал.",
    },
    {
      name: "Maysa",
      from: "Лаос",
      text: "Я много путешествовала и пробовала разные активности, но параплан — это особенное, а парамотор ещё сильнее: он поднимает очень высоко, прямо в облака. Честно, было немного страшно, но впечатление огромное, и решение лететь оказалось верным.",
    },
  ],

  partnersTitle: "Бронирование у партнёров",
  partnersSubtitle:
    "Полёт на парамоторе на Khau Pha также продаётся на площадках ниже.",

  finalCtaTitle: "Готовы лететь?",
  finalCtaBody:
    "Бронируйте заранее, чтобы мы поставили вас в лучшее погодное окно дня.",
};

const zh: PpgCopy = {
  metaTitle: "Khau Pha 山口动力滑翔伞（PPG）| Mebayluon",
  metaDescription:
    "在 Khau Pha 山口体验动力滑翔伞——直接从 Clubhouse Mebayluon 场地起飞。追云飞行、日落飞行、爬升至 2,000 米。2,390,000 越南盾起。",

  heroBadge: "Khau Pha 山口 — Mù Cang Chải",
  heroTitle: "动力滑翔伞飞行",
  heroSubtitle:
    "自选时长、自主控制高度，无风的日子也能飞。",
  heroFrom: "起价",
  ctaBook: "立即预订",
  ctaPartners: "通过合作平台预订",

  introTitle: "什么是动力滑翔伞？",
  introBody: [
    "动力滑翔伞（paramotor，简称 PPG）是加装了发动机的滑翔伞。无动力滑翔伞若想飞得久、飞得高就得靠风；动力伞不用。它可以从低处起飞，想爬多高就爬多高，想飞多久就飞多久，无风的日子照样能飞。这是最高端的飞行体验，因为它能抵达普通滑翔伞根本到不了的视角。",
    "因此它适合想在一天中最美时段飞行的人——清晨云雾还填满山谷时，或傍晚太阳落到山脊后时——完全不必看当天有没有风。",
    "在 Khau Pha 我们使用三轮车式动力伞（trike，即装有轮子的动力滑翔伞）：您坐前座，飞行员坐后座操控。无需助跑，因此年长的客人或不习惯剧烈运动的人同样适合。",
  ],
  readWhoIsItFor: "动力滑翔伞适合哪些人？",
  readVsParagliding: "滑翔伞与动力滑翔伞有什么区别？",

  experiencesTitle: "四种飞行体验",
  experiencesSubtitle: "同一个飞行点，每个时段都是不一样的 Khau Pha。",
  experiences: {
    cloudHunting: {
      title: "追云飞行",
      desc: "穿过填满 Tú Lệ 山谷的低云层，冲上洁白的云海之上。清晨、雨夜之后或天气转凉时最佳。",
    },
    sunrise: {
      title: "日出飞行",
      desc: "天刚破晓即起飞，在空中迎接日出，而整座山谷仍沉睡在晨雾中。一天中气流最平稳的时段。",
    },
    sunset: {
      title: "日落飞行",
      desc: "傍晚起飞，太阳沉入山脊，脚下的云海被染成金橙色。客人拍照最多的画面。",
    },
    highAltitude: {
      title: "爬升至 2,000 米",
      desc: "爬升到 2,000 米高空，将整条 Khau Pha 山口、Tú Lệ 山谷及其后重重山脉尽收眼底——这是无动力滑翔伞很难达到的高度。",
    },
  },
  imageComingSoon: "照片即将上线",

  locationTitle: "飞行地点",
  mapLabel: "动力滑翔伞起降坐标（Clubhouse Mebayluon）",
  locationBody:
    "所有动力伞飞行均在 Mù Cang Chải 的 Khau Pha 山口进行——这是 Mebayluon 唯一提供该服务的飞行点。起飞场就是 Clubhouse Mebayluon 的场地，因此不像无动力滑翔伞那样需要驱车上到山口顶部。",
  takeoffLabel: "起飞场",
  takeoffValue: "Clubhouse Mebayluon — Lìm Thái, Tú Lệ",
  mapCta: "在 Google 地图上查看坐标",
  landingLabel: "降落场",
  landingValue: "与起飞场相同",
  altitudeLabel: "飞行高度",
  altitudeValue: "最高 2,000 米",
  durationLabel: "飞行时长",
  durationValue: "10–25 分钟（自选）",

  pricingTitle: "价格",
  pricingSubtitle: "每位乘客每次飞行的价格。",
  baseLabel: "动力滑翔伞飞行",
  includedTitle: "套餐包含",
  included: [
    "专业飞行员与合格装备",
    "乘客保险",
    "全程 GoPro 照片与视频——免费",
    "参与证书、饮用水、纪念品",
    "因天气原因免费改期或取消",
  ],
  flycamLabel: "航拍",
  camera360Label: "360° 相机",
  comboLabel: "航拍 + 360° 相机套餐",
  comboSave: "立省",
  perPax: "/人",

  guideTitle: "飞行流程",
  steps: [
    {
      title: "1. 提前预订",
      desc: "可通过网站、热线、Zalo/WhatsApp 或合作平台预订。我们在 3 小时内确认，并依据天气预报安排时段。",
    },
    {
      title: "2. 到 Clubhouse 集合",
      desc: "按约定时间抵达 Clubhouse Mebayluon。办理登记手续并领取飞行票。",
    },
    {
      title: "3. 安全讲解",
      desc: "飞行员讲解坐姿、起降时手脚的位置，并在登机前解答您的所有疑问。",
    },
    {
      title: "4. 穿戴装备并起飞",
      desc: "穿上安全带、戴好头盔。三轮动力伞在场地滑行后离地——您只需安坐，无需助跑。",
    },
    {
      title: "5. 飞行与观景",
      desc: "在空中您可以尽情观景、拍摄，也可以和飞行员交谈。想飞更高或更平稳，说一声即可。",
    },
    {
      title: "6. 降落并取素材",
      desc: "在同一场地平稳降落。GoPro 照片与视频飞行后立即交付；360° 文件在 24 小时内发送。",
    },
  ],
  requirementsTitle: "参加条件",
  requirements: [
    "3 周岁以上；未满 18 周岁需监护人同意",
    "体重 120 公斤以下（超 90 或低于 30 公斤请提前告知）",
    "飞行前请勿饮酒",
    "可携带手机及小件物品，请自行保管",
    "穿长袖衣物及运动鞋或登山鞋",
    "癫痫、严重心脏病、高血压、脊柱疾病患者及孕妇不宜参加",
  ],

  galleryTitle: "飞行点的瞬间",

  reviewsTitle: "客人评价",
  reviews: [
    {
      name: "Nguyen Hoang Anh",
      from: "河内",
      text: "去了 Khau Pha 三次才碰上云这么美的早晨。坐前座视野完全没有遮挡，真的像悬在云海中间。飞行员飞得非常平稳，我 58 岁的母亲也一起飞，完全不害怕。",
    },
    {
      name: "Minh Tam",
      from: "胡志明市",
      text: "选了日落时段，一点也不后悔。太阳落到山后，脚下的云被染成金色。GoPro 视频降落后马上就给了，360 的文件第二天到，画质比我想象的好。",
    },
    {
      name: "Le Thanh Quyen",
      from: "岘港",
      text: "比普通滑翔伞强的地方在于自主。那天完全无风，无动力那组只能等，我们却准时起飞并飞了 20 多分钟。从 Clubhouse 场地起飞还省去了上山口的车程。",
    },
    {
      name: "Maysa",
      from: "老挝",
      text: "我去过很多地方，也玩过很多项目，但滑翔伞真的很特别，动力伞更特别——它能把人带到很高的地方，直接触到云。说实话我有点害怕，但印象非常深刻，决定去飞是对的选择。",
    },
  ],

  partnersTitle: "通过合作平台预订",
  partnersSubtitle: "Khau Pha 的动力滑翔伞项目也在以下平台销售。",

  finalCtaTitle: "准备好起飞了吗？",
  finalCtaBody: "提前预订，我们会把您安排在当天天气最好的时段。",
};

const hi: PpgCopy = {
  metaTitle: "Khau Pha दर्रे पर पैरामोटर (PPG) | Mebayluon",
  metaDescription:
    "Khau Pha दर्रे पर पैरामोटर उड़ान — Clubhouse Mebayluon के मैदान से सीधे टेक-ऑफ़। बादलों के ऊपर, सूर्यास्त उड़ान, 2,000 मीटर तक चढ़ाई। 2,390,000 VND से।",

  heroBadge: "Khau Pha दर्रा — Mu Cang Chai",
  heroTitle: "पैरामोटर उड़ान",
  heroSubtitle:
    "अवधि आप चुनें, ऊँचाई आपके नियंत्रण में, हवा शांत हो तब भी उड़ान।",
  heroFrom: "शुरू",
  ctaBook: "उड़ान बुक करें",
  ctaPartners: "पार्टनर के ज़रिए बुक करें",

  introTitle: "पैरामोटर क्या है?",
  introBody: [
    "पैरामोटर (PPG) इंजन लगा हुआ पैराग्लाइडर है। लंबी और ऊँची उड़ान के लिए बिना इंजन वाले ग्लाइडर को हवा पर निर्भर रहना पड़ता है; पैरामोटर को नहीं। यह नीचे से ही उड़ान भरता है, जितना चाहें उतना ऊपर चढ़ता है, जितनी देर चाहें उड़ता है, और शांत मौसम में भी उड़ता है। यही सबसे प्रीमियम अनुभव है, क्योंकि यह उन नज़ारों तक ले जाता है जहाँ सामान्य पैराग्लाइडर पहुँच ही नहीं सकता।",
    "इसलिए यह उनके लिए है जो दिन के सबसे सुंदर समय पर उड़ना चाहते हैं — सुबह जब घाटी बादलों से भरी हो, या देर दोपहर जब सूरज पहाड़ी के पीछे उतर रहा हो — और हवा चली या नहीं, इस पर निर्भर नहीं रहना चाहते।",
    "Khau Pha में हम ट्राइक उड़ाते हैं — यानी पहियों पर लगा पैरामोटर: आप आगे की सीट पर बैठते हैं, पायलट पीछे। कोई दौड़ नहीं लगानी पड़ती, इसलिए यह बुज़ुर्ग मेहमानों और कम शारीरिक श्रम के अभ्यस्त लोगों के लिए भी उपयुक्त है।",
  ],
  readWhoIsItFor: "पैरामोटर किसके लिए उपयुक्त है?",
  readVsParagliding: "पैराग्लाइडिंग और पैरामोटर में क्या अंतर है?",

  experiencesTitle: "उड़ान के चार अनुभव",
  experiencesSubtitle: "एक ही स्थल — हर घंटे एक अलग Khau Pha।",
  experiences: {
    cloudHunting: {
      title: "बादलों के ऊपर उड़ान",
      desc: "Tú Lệ घाटी को भरने वाली नीची बादल परत को चीरते हुए सफ़ेद बादलों के समुद्र के ऊपर निकलें। बारिश वाली रात के बाद या ठंडे दिन की सुबह सबसे अच्छी।",
    },
    sunrise: {
      title: "सूर्योदय उड़ान",
      desc: "पहली रोशनी में उड़ान भरें और हवा में सूरज का स्वागत करें, जबकि पूरी घाटी अब भी कोहरे में हो। दिन का सबसे शांत समय।",
    },
    sunset: {
      title: "सूर्यास्त उड़ान",
      desc: "देर दोपहर उड़ें, जब सूरज पहाड़ी के पीछे उतरता है और नीचे के बादल सुनहरे-नारंगी हो जाते हैं। मेहमानों की सबसे पसंदीदा तस्वीर।",
    },
    highAltitude: {
      title: "2,000 मीटर तक चढ़ाई",
      desc: "2,000 मीटर तक जाएँ और पूरा Khau Pha दर्रा, Tú Lệ घाटी तथा पीछे फैली पर्वत शृंखलाएँ देखें — यह ऊँचाई बिना इंजन वाला ग्लाइडर मुश्किल से छूता है।",
    },
  },
  imageComingSoon: "तस्वीर जल्द आ रही है",

  locationTitle: "उड़ान का स्थान",
  mapLabel: "पैरामोटर टेक-ऑफ़ और लैंडिंग निर्देशांक (Clubhouse Mebayluon)",
  locationBody:
    "सभी पैरामोटर उड़ानें Mù Cang Chải के Khau Pha दर्रे पर होती हैं — Mebayluon का यही एकमात्र स्थल है जहाँ यह सेवा है। टेक-ऑफ़ मैदान Clubhouse Mebayluon का ही है, इसलिए सामान्य पैराग्लाइडिंग की तरह दर्रे की चोटी तक जाने की ज़रूरत नहीं।",
  takeoffLabel: "टेक-ऑफ़",
  takeoffValue: "Clubhouse Mebayluon — Lìm Thái, Tú Lệ",
  mapCta: "Google Maps पर निर्देशांक देखें",
  landingLabel: "लैंडिंग",
  landingValue: "टेक-ऑफ़ वाली जगह ही",
  altitudeLabel: "ऊँचाई",
  altitudeValue: "2,000 मीटर तक",
  durationLabel: "उड़ान अवधि",
  durationValue: "10 – 25 मिनट (आपकी पसंद)",

  pricingTitle: "मूल्य",
  pricingSubtitle: "प्रति यात्री, प्रति उड़ान।",
  baseLabel: "पैरामोटर उड़ान",
  includedTitle: "उड़ान में शामिल",
  included: [
    "पेशेवर पायलट और प्रमाणित उपकरण",
    "यात्री बीमा",
    "पूरी उड़ान के GoPro फ़ोटो और वीडियो — निःशुल्क",
    "भागीदारी प्रमाणपत्र, पीने का पानी, स्मृति चिह्न",
    "मौसम के कारण निःशुल्क पुनर्निर्धारण या रद्दीकरण",
  ],
  flycamLabel: "ड्रोन फ़िल्मांकन",
  camera360Label: "360° कैमरा",
  comboLabel: "ड्रोन + 360° कैमरा कॉम्बो",
  comboSave: "आपकी बचत",
  perPax: "/यात्री",

  guideTitle: "उड़ान कैसे होती है",
  steps: [
    {
      title: "1. पहले से बुक करें",
      desc: "वेबसाइट, हॉटलाइन, Zalo/WhatsApp या साझेदार प्लेटफ़ॉर्म से बुक करें। हम 3 घंटे में पुष्टि करते हैं और मौसम पूर्वानुमान के अनुसार समय तय करते हैं।",
    },
    {
      title: "2. Clubhouse पहुँचें",
      desc: "तय समय पर Clubhouse Mebayluon पहुँचें। चेक-इन पूरा करें और अपना फ़्लाइट टिकट लें।",
    },
    {
      title: "3. सुरक्षा ब्रीफ़िंग",
      desc: "पायलट बताते हैं कि कैसे बैठना है और टेक-ऑफ़ व लैंडिंग के समय हाथ-पैर कहाँ रखने हैं, तथा हर सवाल का जवाब देते हैं।",
    },
    {
      title: "4. उपकरण और टेक-ऑफ़",
      desc: "हार्नेस और हेलमेट पहनें। ट्राइक मैदान पर दौड़ता है और ज़मीन छोड़ देता है — आपको बस बैठे रहना है, दौड़ने की ज़रूरत नहीं।",
    },
    {
      title: "5. उड़ान और नज़ारे",
      desc: "हवा में आप स्वतंत्र रूप से नज़ारे देख सकते हैं, शूट कर सकते हैं और पायलट से बात कर सकते हैं। और ऊँचा या और आराम से — बस कह दीजिए।",
    },
    {
      title: "6. लैंडिंग और सामग्री",
      desc: "उसी मैदान पर आराम से लैंडिंग। GoPro फ़ोटो-वीडियो उड़ान के तुरंत बाद; 360° फ़ाइलें 24 घंटे के भीतर।",
    },
  ],
  requirementsTitle: "कौन उड़ सकता है",
  requirements: [
    "3 वर्ष से ऊपर; 18 से कम पर अभिभावक की सहमति",
    "120 किग्रा से कम (90 से अधिक या 30 से कम हो तो बताएँ)",
    "उड़ान से पहले शराब नहीं",
    "फ़ोन और छोटी वस्तुएँ ले जा सकते हैं, अपनी ज़िम्मेदारी पर",
    "पूरी बाँह के कपड़े, स्पोर्ट्स या ट्रेकिंग जूते",
    "मिर्गी, गंभीर हृदय रोग, उच्च रक्तचाप, रीढ़ की समस्या और गर्भावस्था में उपयुक्त नहीं",
  ],

  galleryTitle: "उड़ान स्थल के पल",

  reviewsTitle: "मेहमान क्या कहते हैं",
  reviews: [
    {
      name: "Nguyen Hoang Anh",
      from: "हनोई",
      text: "ऐसे बादलों वाली सुबह पाने के लिए Khau Pha तीन बार जाना पड़ा। आगे की सीट से नज़ारे में कोई रुकावट नहीं — सचमुच बादलों के समुद्र के बीच लटकने जैसा लगता है। पायलट ने बहुत सहज उड़ाया; मेरी 58 वर्षीय माँ ने भी उड़ान भरी और बिल्कुल नहीं डरीं।",
    },
    {
      name: "Minh Tam",
      from: "हो ची मिन्ह सिटी",
      text: "हमने सूर्यास्त का समय चुना और ज़रा भी अफ़सोस नहीं हुआ। सूरज पहाड़ के पीछे गया और नीचे के बादल सुनहरे हो गए। GoPro वीडियो लैंडिंग के तुरंत बाद मिल गया, 360 फ़ाइल अगले दिन — गुणवत्ता उम्मीद से बेहतर।",
    },
    {
      name: "Le Thanh Quyen",
      from: "दा नांग",
      text: "सामान्य पैराग्लाइडिंग पर बड़ी बढ़त नियंत्रण की है। उस दिन बिल्कुल हवा नहीं थी, बिना इंजन वाले समूह को इंतज़ार करना पड़ा, पर हमने समय पर उड़ान भरी और 20 मिनट से ज़्यादा उड़े। Clubhouse मैदान से टेक-ऑफ़ ने दर्रे तक की चढ़ाई भी बचा दी।",
    },
    {
      name: "Maysa",
      from: "लाओस",
      text: "मैंने बहुत जगहें घूमी हैं और कई गतिविधियाँ आज़माई हैं, पर पैराग्लाइडिंग वाक़ई ख़ास है — और पैरामोटर तो और भी, क्योंकि यह बहुत ऊँचाई तक ले जाता है और सीधे बादलों तक। सच कहूँ तो थोड़ा डर लगा, पर छाप बहुत गहरी पड़ी और उड़ने का फ़ैसला सही था।",
    },
  ],

  partnersTitle: "पार्टनर के ज़रिए बुक करें",
  partnersSubtitle:
    "Khau Pha का पैरामोटर अनुभव नीचे दिए प्लेटफ़ॉर्म पर भी उपलब्ध है।",

  finalCtaTitle: "उड़ान के लिए तैयार?",
  finalCtaBody:
    "पहले से बुक करें ताकि हम आपको दिन की सबसे अच्छी मौसम-खिड़की में रख सकें।",
};

export const PPG_COPY: Record<PpgLang, PpgCopy> = { vi, en, fr, ru, zh, hi };

export const getPpgCopy = (lang: unknown): PpgCopy => {
  const code = String(lang ?? "vi").slice(0, 2).toLowerCase() as PpgLang;
  return PPG_COPY[code] ?? PPG_COPY.vi;
};
