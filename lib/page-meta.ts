// lib/page-meta.ts
/**
 * Tiêu đề + mô tả cho kết quả tìm kiếm của các trang tĩnh, dịch đủ 6 ngôn ngữ.
 *
 * Trước đây mỗi trang khai một chuỗi tiếng Việt cứng, nên khách Pháp mở
 * /fr/spots vẫn thấy tiêu đề tiếng Việt trên tab trình duyệt lẫn trên Google.
 * Gom về một chỗ để sau này sửa câu chữ chỉ phải sửa một nơi.
 *
 * Trang bài viết / sản phẩm KHÔNG dùng file này — chúng lấy tiêu đề từ nội
 * dung bài trong database (xem lib/post-locales.ts).
 */

import type { Locale } from "@/lib/site-config";

export type PageMeta = { title: string; description: string };
export type PageKey =
  | "home"
  | "spots"
  | "store"
  | "contact"
  | "homestay"
  | "blog"
  | "pilots";

const META: Record<PageKey, Record<Locale, PageMeta>> = {
  home: {
    vi: {
      title: "Bay Dù Lượn Việt Nam: 6 Điểm Bay, Giá Từ 1.790.000đ | Mebayluon",
      description:
        "Đặt bay dù lượn cùng Mebayluon tại Hà Nội, Sapa, Mù Cang Chải và nhiều điểm bay tại Việt Nam. Phi công chuyên nghiệp, bảo hiểm và GoPro miễn phí.",
    },
    en: {
      title: "Paragliding in Vietnam: 6 Sites, From 1,790,000₫ | Mebayluon",
      description:
        "Fly with Mebayluon in Hanoi, Sapa, Mu Cang Chai and many other sites across Vietnam. Certified pilots, insurance and free GoPro footage included.",
    },
    fr: {
      title: "Parapente au Vietnam : 6 sites, dès 1 790 000 ₫ | Mebayluon",
      description:
        "Volez avec Mebayluon à Hanoï, Sapa, Mu Cang Chai et sur de nombreux autres sites du Vietnam. Pilotes certifiés, assurance et vidéo GoPro offerte.",
    },
    ru: {
      title: "Парапланеризм во Вьетнаме: 6 площадок, от 1 790 000 ₫ | Mebayluon",
      description:
        "Летайте с Mebayluon в Ханое, Сапе, Мукангчае и на других площадках Вьетнама. Сертифицированные пилоты, страховка и бесплатная съёмка на GoPro.",
    },
    zh: {
      title: "越南滑翔伞：6 大飞行点，1,790,000 越南盾起 | Mebayluon",
      description:
        "与 Mebayluon 一起在河内、沙坝、木江界等越南各地飞行。专业持证飞行员，含保险与免费 GoPro 拍摄。",
    },
    hi: {
      title: "वियतनाम पैराग्लाइडिंग: 6 स्थल, 1,790,000₫ से | Mebayluon",
      description:
        "हनोई, सापा, मु कांग चाई और वियतनाम के कई अन्य स्थलों पर Mebayluon के साथ उड़ान भरें। प्रमाणित पायलट, बीमा और मुफ़्त GoPro रिकॉर्डिंग।",
    },
  },

  spots: {
    vi: {
      title: "6 Điểm Bay Dù Lượn Việt Nam: Giá & Mùa Đẹp | Mebayluon",
      description:
        "Danh sách đầy đủ các điểm bay dù lượn của Mebayluon: Đèo Khau Phạ, Sapa, Sơn Trà, Trạm Tấu, Hà Giang, Đồi Bù, Viên Nam — kèm độ cao, thời gian bay và giá tour.",
    },
    en: {
      title: "6 Paragliding Sites in Vietnam: Prices & Season | Mebayluon",
      description:
        "All Mebayluon paragliding sites: Khau Pha Pass, Sapa, Son Tra, Tram Tau, Ha Giang, Doi Bu and Vien Nam — with altitude, flight duration and tour prices.",
    },
    fr: {
      title: "6 sites de parapente au Vietnam : prix & saison | Mebayluon",
      description:
        "Tous les sites de parapente Mebayluon : col de Khau Pha, Sapa, Son Tra, Tram Tau, Ha Giang, Doi Bu et Vien Nam — altitude, durée de vol et tarifs.",
    },
    ru: {
      title: "6 площадок для полётов во Вьетнаме: цены и сезон | Mebayluon",
      description:
        "Все площадки Mebayluon: перевал Кхау Фа, Сапа, Шонча, Чамтау, Хазянг, Дой Бу и Виен Нам — высота, длительность полёта и цены туров.",
    },
    zh: {
      title: "越南 6 大滑翔伞飞行点：价格与最佳季节 | Mebayluon",
      description:
        "Mebayluon 全部飞行点：考帕山口、沙坝、山茶、占秋、河江、布山与员南——附海拔、飞行时长与价格。",
    },
    hi: {
      title: "वियतनाम में 6 पैराग्लाइडिंग स्थल: क़ीमत व मौसम | Mebayluon",
      description:
        "Mebayluon के सभी पैराग्लाइडिंग स्थल: खाउ फ़ा दर्रा, सापा, सोन ट्रा, त्राम ताउ, हा जियांग, डोई बू और विएन नाम — ऊँचाई, उड़ान अवधि और कीमतों सहित।",
    },
  },

  store: {
    vi: {
      title: "Cửa Hàng Dù Lượn: Thiết Bị, Sách Bay & Khoá Học | Mebayluon",
      description:
        "Mua sắm thiết bị dù lượn, sách kỹ thuật bay, phụ kiện và đăng ký khóa học dù lượn chuyên nghiệp tại cửa hàng Mebayluon.",
    },
    en: {
      title: "Paragliding Store: Gear, Books & Courses | Mebayluon",
      description:
        "Shop paragliding gear, technical flying books and accessories, or sign up for a professional paragliding course at the Mebayluon store.",
    },
    fr: {
      title: "Boutique parapente : matériel, livres & stages | Mebayluon",
      description:
        "Achetez du matériel de parapente, des livres techniques et des accessoires, ou inscrivez-vous à une formation professionnelle à la boutique Mebayluon.",
    },
    ru: {
      title: "Магазин парапланов: снаряжение, книги, курсы | Mebayluon",
      description:
        "Снаряжение для парапланеризма, техническая литература и аксессуары, а также запись на профессиональные курсы в магазине Mebayluon.",
    },
    zh: {
      title: "滑翔伞商店：装备、书籍与飞行课程 | Mebayluon",
      description:
        "在 Mebayluon 商店选购滑翔伞装备、飞行技术书籍与配件，或报名参加专业滑翔伞课程。",
    },
    hi: {
      title: "पैराग्लाइडिंग स्टोर: उपकरण, पुस्तकें व कोर्स | Mebayluon",
      description:
        "Mebayluon स्टोर पर पैराग्लाइडिंग उपकरण, तकनीकी पुस्तकें और सहायक सामग्री खरीदें, या पेशेवर पैराग्लाइडिंग कोर्स के लिए पंजीकरण करें।",
    },
  },

  contact: {
    vi: {
      title: "Liên Hệ Đặt Bay Dù Lượn: Hotline, Zalo & WhatsApp | Mebayluon",
      description:
        "Liên hệ Mebayluon để đặt lịch bay dù lượn. Hotline: 0964073555. Bay tại Mù Cang Chải, Sapa, Hà Nội và khắp Việt Nam.",
    },
    en: {
      title: "Contact Us: Book a Flight via Hotline, Zalo, WhatsApp | Mebayluon",
      description:
        "Contact Mebayluon to book your paragliding flight. Hotline: +84 964 073 555. Flying in Mu Cang Chai, Sapa, Hanoi and across Vietnam.",
    },
    fr: {
      title: "Nous contacter : réserver par hotline, Zalo, WhatsApp | Mebayluon",
      description:
        "Contactez Mebayluon pour réserver votre vol en parapente. Hotline : +84 964 073 555. Vols à Mu Cang Chai, Sapa, Hanoï et partout au Vietnam.",
    },
    ru: {
      title: "Связаться с нами: телефон, Zalo, WhatsApp | Mebayluon",
      description:
        "Свяжитесь с Mebayluon, чтобы забронировать полёт на параплане. Горячая линия: +84 964 073 555. Полёты в Мукангчае, Сапе, Ханое и по всему Вьетнаму.",
    },
    zh: {
      title: "联系我们预订滑翔伞：热线、Zalo 与 WhatsApp | Mebayluon",
      description:
        "联系 Mebayluon 预订您的滑翔伞飞行。热线：+84 964 073 555。飞行地点包括木江界、沙坝、河内及越南各地。",
    },
    hi: {
      title: "संपर्क करें: हॉटलाइन, Zalo व WhatsApp से बुकिंग | Mebayluon",
      description:
        "अपनी पैराग्लाइडिंग उड़ान बुक करने के लिए Mebayluon से संपर्क करें। हॉटलाइन: +84 964 073 555। मु कांग चाई, सापा, हनोई और पूरे वियतनाम में उड़ानें।",
    },
  },

  homestay: {
    vi: {
      title: "Homestay Khau Phạ: Ngủ Ngay Bãi Hạ Cánh Dù Lượn | Mebayluon",
      description:
        "Homestay Mebayluon nằm ngay tại bãi hạ cánh dù lượn đèo Khau Phạ — café check-in view ruộng bậc thang, ngắm dù lượn hạ cánh trước mắt. Phòng nghỉ truyền thống, combo bay + nghỉ tiết kiệm.",
    },
    en: {
      title: "Khau Pha Homestay by the Paragliding Landing Zone | Mebayluon",
      description:
        "Mebayluon homestay right at the Khau Pha Pass paragliding landing zone — a check-in café overlooking the rice terraces, with paragliders touching down before your eyes. Flight + stay combos available.",
    },
    fr: {
      title: "Homestay Khau Pha, au bord de l'aire d'atterrissage | Mebayluon",
      description:
        "Le homestay Mebayluon, situé sur la zone d'atterrissage des parapentes du col de Khau Pha — café avec vue sur les rizières, atterrissages sous vos yeux. Formules vol + séjour.",
    },
    ru: {
      title: "Хоумстей Кхау Фа у зоны приземления парапланов | Mebayluon",
      description:
        "Хоумстей Mebayluon прямо у зоны приземления парапланов перевала Кхау Фа — кафе с видом на рисовые террасы, парапланы приземляются у вас на глазах. Пакеты «полёт + проживание».",
    },
    zh: {
      title: "考帕民宿：就在滑翔伞降落场旁，含打卡咖啡馆 | Mebayluon",
      description:
        "Mebayluon 民宿位于考帕山口滑翔伞降落场旁——打卡咖啡馆俯瞰梯田，滑翔伞就在眼前降落。传统客房，飞行加住宿套餐更划算。",
    },
    hi: {
      title: "खाउ फ़ा होमस्टे: पैराग्लाइडिंग लैंडिंग ज़ोन पर | Mebayluon",
      description:
        "Mebayluon होमस्टे खाउ फ़ा दर्रे के पैराग्लाइडिंग लैंडिंग ज़ोन पर ही स्थित है — सीढ़ीनुमा खेतों के नज़ारे वाला चेक-इन कैफ़े, आँखों के सामने उतरते पैराग्लाइडर। उड़ान + ठहराव कॉम्बो उपलब्ध।",
    },
  },

  blog: {
    vi: {
      title: "Blog Dù Lượn: Điểm Bay, Mùa Đẹp & Kinh Nghiệm Bay | Mebayluon",
      description:
        "Tin tức mới nhất về dù lượn, kinh nghiệm bay, hướng dẫn kỹ thuật và câu chuyện từ cộng đồng dù lượn Việt Nam của Mebayluon.",
    },
    en: {
      title: "Paragliding Blog: Sites, Seasons & Flying Tips | Mebayluon",
      description:
        "The latest paragliding news, flying tips, technical guides and stories from the Vietnamese paragliding community, by Mebayluon.",
    },
    fr: {
      title: "Blog parapente : sites, saisons & conseils de vol | Mebayluon",
      description:
        "Les dernières actualités du parapente, conseils de vol, guides techniques et récits de la communauté vietnamienne du parapente, par Mebayluon.",
    },
    ru: {
      title: "Блог о парапланеризме: площадки, сезоны, советы | Mebayluon",
      description:
        "Свежие новости парапланеризма, советы по полётам, технические руководства и истории вьетнамского сообщества парапланеристов от Mebayluon.",
    },
    zh: {
      title: "滑翔伞博客：飞行点、最佳季节与飞行经验 | Mebayluon",
      description:
        "Mebayluon 带来最新滑翔伞资讯、飞行经验、技术指南以及越南滑翔伞社群的故事。",
    },
    hi: {
      title: "पैराग्लाइडिंग ब्लॉग: स्थल, मौसम व उड़ान टिप्स | Mebayluon",
      description:
        "Mebayluon द्वारा नवीनतम पैराग्लाइडिंग समाचार, उड़ान अनुभव, तकनीकी मार्गदर्शिकाएँ और वियतनामी पैराग्लाइडिंग समुदाय की कहानियाँ।",
    },
  },

  pilots: {
    vi: {
      title: "Đội Phi Công Dù Lượn: Chứng Chỉ APPI & IPPI | Mebayluon",
      description:
        "Gặp gỡ đội phi công dù lượn chuyên nghiệp của Mebayluon — có chứng chỉ IPPI quốc tế, nhiều năm kinh nghiệm bay tại Mù Cang Chải, Sapa và khắp Việt Nam.",
    },
    en: {
      title: "Our Paragliding Pilots: APPI & IPPI Certified | Mebayluon",
      description:
        "Meet the Mebayluon team of professional paragliding pilots — IPPI certified, with years of experience flying in Mu Cang Chai, Sapa and across Vietnam.",
    },
    fr: {
      title: "Nos pilotes de parapente : certifiés APPI & IPPI | Mebayluon",
      description:
        "Rencontrez l’équipe de pilotes de parapente professionnels de Mebayluon — certifiés IPPI, avec des années d’expérience à Mu Cang Chai, Sapa et partout au Vietnam.",
    },
    ru: {
      title: "Наши пилоты парапланов: сертификаты APPI и IPPI | Mebayluon",
      description:
        "Познакомьтесь с командой профессиональных пилотов Mebayluon — с сертификатами IPPI и многолетним опытом полётов в Мукангчае, Сапе и по всему Вьетнаму.",
    },
    zh: {
      title: "我们的滑翔伞飞行员：APPI 与 IPPI 国际认证 | Mebayluon",
      description:
        "认识 Mebayluon 的专业滑翔伞飞行员团队——持有 IPPI 国际证照，在木江界、沙坝及越南各地拥有多年飞行经验。",
    },
    hi: {
      title: "हमारे पैराग्लाइडिंग पायलट: APPI व IPPI प्रमाणित | Mebayluon",
      description:
        "Mebayluon की पेशेवर पैराग्लाइडिंग पायलट टीम से मिलें — IPPI प्रमाणित, मु कांग चाई, सापा और पूरे वियतनाम में वर्षों का उड़ान अनुभव।",
    },
  },
};

/** Tiêu đề + mô tả của một trang theo ngôn ngữ URL (thiếu thì lùi về tiếng Việt). */
export function pageMeta(key: PageKey, locale: Locale | string): PageMeta {
  const dict = META[key];
  const code = String(locale ?? "vi").slice(0, 2).toLowerCase() as Locale;
  return dict[code] ?? dict.vi;
}
