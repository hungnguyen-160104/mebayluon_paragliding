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
      title: "Mebayluon | Đặt Tour Bay Dù Lượn Tại Việt Nam",
      description:
        "Đặt bay dù lượn cùng Mebayluon tại Hà Nội, Sapa, Mù Cang Chải và nhiều điểm bay tại Việt Nam. Phi công chuyên nghiệp, bảo hiểm và GoPro miễn phí.",
    },
    en: {
      title: "Mebayluon | Paragliding Tours Across Vietnam",
      description:
        "Fly with Mebayluon in Hanoi, Sapa, Mu Cang Chai and many other sites across Vietnam. Certified pilots, insurance and free GoPro footage included.",
    },
    fr: {
      title: "Mebayluon | Vols en parapente partout au Vietnam",
      description:
        "Volez avec Mebayluon à Hanoï, Sapa, Mu Cang Chai et sur de nombreux autres sites du Vietnam. Pilotes certifiés, assurance et vidéo GoPro offerte.",
    },
    ru: {
      title: "Mebayluon | Полёты на параплане по всему Вьетнаму",
      description:
        "Летайте с Mebayluon в Ханое, Сапе, Мукангчае и на других площадках Вьетнама. Сертифицированные пилоты, страховка и бесплатная съёмка на GoPro.",
    },
    zh: {
      title: "Mebayluon | 越南各地滑翔伞飞行体验",
      description:
        "与 Mebayluon 一起在河内、沙坝、木江界等越南各地飞行。专业持证飞行员，含保险与免费 GoPro 拍摄。",
    },
    hi: {
      title: "Mebayluon | पूरे वियतनाम में पैराग्लाइडिंग टूर",
      description:
        "हनोई, सापा, मु कांग चाई और वियतनाम के कई अन्य स्थलों पर Mebayluon के साथ उड़ान भरें। प्रमाणित पायलट, बीमा और मुफ़्त GoPro रिकॉर्डिंग।",
    },
  },

  spots: {
    vi: {
      title: "Các Điểm Bay Dù Lượn Tại Việt Nam | Mebayluon",
      description:
        "Danh sách đầy đủ các điểm bay dù lượn của Mebayluon: Đèo Khau Phạ, Sapa, Sơn Trà, Trạm Tấu, Hà Giang, Đồi Bù, Viên Nam — kèm độ cao, thời gian bay và giá tour.",
    },
    en: {
      title: "Paragliding Sites in Vietnam | Mebayluon",
      description:
        "All Mebayluon paragliding sites: Khau Pha Pass, Sapa, Son Tra, Tram Tau, Ha Giang, Doi Bu and Vien Nam — with altitude, flight duration and tour prices.",
    },
    fr: {
      title: "Sites de parapente au Vietnam | Mebayluon",
      description:
        "Tous les sites de parapente Mebayluon : col de Khau Pha, Sapa, Son Tra, Tram Tau, Ha Giang, Doi Bu et Vien Nam — altitude, durée de vol et tarifs.",
    },
    ru: {
      title: "Места для полётов на параплане во Вьетнаме | Mebayluon",
      description:
        "Все площадки Mebayluon: перевал Кхау Фа, Сапа, Шонча, Чамтау, Хазянг, Дой Бу и Виен Нам — высота, длительность полёта и цены туров.",
    },
    zh: {
      title: "越南滑翔伞飞行点 | Mebayluon",
      description:
        "Mebayluon 全部飞行点：考帕山口、沙坝、山茶、占秋、河江、布山与员南——附海拔、飞行时长与价格。",
    },
    hi: {
      title: "वियतनाम में पैराग्लाइडिंग स्थल | Mebayluon",
      description:
        "Mebayluon के सभी पैराग्लाइडिंग स्थल: खाउ फ़ा दर्रा, सापा, सोन ट्रा, त्राम ताउ, हा जियांग, डोई बू और विएन नाम — ऊँचाई, उड़ान अवधि और कीमतों सहित।",
    },
  },

  store: {
    vi: {
      title: "Cửa Hàng Dù Lượn - Thiết Bị & Sách Bay | Mebayluon",
      description:
        "Mua sắm thiết bị dù lượn, sách kỹ thuật bay, phụ kiện và đăng ký khóa học dù lượn chuyên nghiệp tại cửa hàng Mebayluon.",
    },
    en: {
      title: "Paragliding Store — Gear & Books | Mebayluon",
      description:
        "Shop paragliding gear, technical flying books and accessories, or sign up for a professional paragliding course at the Mebayluon store.",
    },
    fr: {
      title: "Boutique parapente — Matériel & livres | Mebayluon",
      description:
        "Achetez du matériel de parapente, des livres techniques et des accessoires, ou inscrivez-vous à une formation professionnelle à la boutique Mebayluon.",
    },
    ru: {
      title: "Магазин парапланов — снаряжение и книги | Mebayluon",
      description:
        "Снаряжение для парапланеризма, техническая литература и аксессуары, а также запись на профессиональные курсы в магазине Mebayluon.",
    },
    zh: {
      title: "滑翔伞商店 — 装备与书籍 | Mebayluon",
      description:
        "在 Mebayluon 商店选购滑翔伞装备、飞行技术书籍与配件，或报名参加专业滑翔伞课程。",
    },
    hi: {
      title: "पैराग्लाइडिंग स्टोर — उपकरण और पुस्तकें | Mebayluon",
      description:
        "Mebayluon स्टोर पर पैराग्लाइडिंग उपकरण, तकनीकी पुस्तकें और सहायक सामग्री खरीदें, या पेशेवर पैराग्लाइडिंग कोर्स के लिए पंजीकरण करें।",
    },
  },

  contact: {
    vi: {
      title: "Liên Hệ Đặt Bay Dù Lượn | Mebayluon",
      description:
        "Liên hệ Mebayluon để đặt lịch bay dù lượn. Hotline: 0964073555. Bay tại Mù Cang Chải, Sapa, Hà Nội và khắp Việt Nam.",
    },
    en: {
      title: "Contact Us to Book a Paragliding Flight | Mebayluon",
      description:
        "Contact Mebayluon to book your paragliding flight. Hotline: +84 964 073 555. Flying in Mu Cang Chai, Sapa, Hanoi and across Vietnam.",
    },
    fr: {
      title: "Nous contacter pour réserver un vol | Mebayluon",
      description:
        "Contactez Mebayluon pour réserver votre vol en parapente. Hotline : +84 964 073 555. Vols à Mu Cang Chai, Sapa, Hanoï et partout au Vietnam.",
    },
    ru: {
      title: "Связаться с нами для брони полёта | Mebayluon",
      description:
        "Свяжитесь с Mebayluon, чтобы забронировать полёт на параплане. Горячая линия: +84 964 073 555. Полёты в Мукангчае, Сапе, Ханое и по всему Вьетнаму.",
    },
    zh: {
      title: "联系我们预订滑翔伞飞行 | Mebayluon",
      description:
        "联系 Mebayluon 预订您的滑翔伞飞行。热线：+84 964 073 555。飞行地点包括木江界、沙坝、河内及越南各地。",
    },
    hi: {
      title: "पैराग्लाइडिंग उड़ान बुक करने के लिए संपर्क करें | Mebayluon",
      description:
        "अपनी पैराग्लाइडिंग उड़ान बुक करने के लिए Mebayluon से संपर्क करें। हॉटलाइन: +84 964 073 555। मु कांग चाई, सापा, हनोई और पूरे वियतनाम में उड़ानें।",
    },
  },

  homestay: {
    vi: {
      title: "Homestay Tại Bãi Hạ Cánh Dù Lượn Đèo Khau Phạ — Café Check-in | Mebayluon",
      description:
        "Homestay Mebayluon nằm ngay tại bãi hạ cánh dù lượn đèo Khau Phạ — café check-in view ruộng bậc thang, ngắm dù lượn hạ cánh trước mắt. Phòng nghỉ truyền thống, combo bay + nghỉ tiết kiệm.",
    },
    en: {
      title: "Homestay at the Khau Pha Paragliding Landing Zone — Check-in Café | Mebayluon",
      description:
        "Mebayluon homestay right at the Khau Pha Pass paragliding landing zone — a check-in café overlooking the rice terraces, with paragliders touching down before your eyes. Flight + stay combos available.",
    },
    fr: {
      title: "Homestay sur la zone d'atterrissage parapente de Khau Pha — Café | Mebayluon",
      description:
        "Le homestay Mebayluon, situé sur la zone d'atterrissage des parapentes du col de Khau Pha — café avec vue sur les rizières, atterrissages sous vos yeux. Formules vol + séjour.",
    },
    ru: {
      title: "Хоумстей у зоны приземления парапланов Кхау Фа — кафе | Mebayluon",
      description:
        "Хоумстей Mebayluon прямо у зоны приземления парапланов перевала Кхау Фа — кафе с видом на рисовые террасы, парапланы приземляются у вас на глазах. Пакеты «полёт + проживание».",
    },
    zh: {
      title: "考帕滑翔伞降落场民宿 — 打卡咖啡馆 | Mebayluon",
      description:
        "Mebayluon 民宿位于考帕山口滑翔伞降落场旁——打卡咖啡馆俯瞰梯田，滑翔伞就在眼前降落。传统客房，飞行加住宿套餐更划算。",
    },
    hi: {
      title: "खाउ फ़ा पैराग्लाइडिंग लैंडिंग ज़ोन पर होमस्टे — कैफ़े | Mebayluon",
      description:
        "Mebayluon होमस्टे खाउ फ़ा दर्रे के पैराग्लाइडिंग लैंडिंग ज़ोन पर ही स्थित है — सीढ़ीनुमा खेतों के नज़ारे वाला चेक-इन कैफ़े, आँखों के सामने उतरते पैराग्लाइडर। उड़ान + ठहराव कॉम्बो उपलब्ध।",
    },
  },

  blog: {
    vi: {
      title: "Tin Tức & Blog Dù Lượn Việt Nam | Mebayluon",
      description:
        "Tin tức mới nhất về dù lượn, kinh nghiệm bay, hướng dẫn kỹ thuật và câu chuyện từ cộng đồng dù lượn Việt Nam của Mebayluon.",
    },
    en: {
      title: "Paragliding News & Blog in Vietnam | Mebayluon",
      description:
        "The latest paragliding news, flying tips, technical guides and stories from the Vietnamese paragliding community, by Mebayluon.",
    },
    fr: {
      title: "Actualités & blog parapente au Vietnam | Mebayluon",
      description:
        "Les dernières actualités du parapente, conseils de vol, guides techniques et récits de la communauté vietnamienne du parapente, par Mebayluon.",
    },
    ru: {
      title: "Новости и блог о парапланеризме во Вьетнаме | Mebayluon",
      description:
        "Свежие новости парапланеризма, советы по полётам, технические руководства и истории вьетнамского сообщества парапланеристов от Mebayluon.",
    },
    zh: {
      title: "越南滑翔伞资讯与博客 | Mebayluon",
      description:
        "Mebayluon 带来最新滑翔伞资讯、飞行经验、技术指南以及越南滑翔伞社群的故事。",
    },
    hi: {
      title: "वियतनाम में पैराग्लाइडिंग समाचार और ब्लॉग | Mebayluon",
      description:
        "Mebayluon द्वारा नवीनतम पैराग्लाइडिंग समाचार, उड़ान अनुभव, तकनीकी मार्गदर्शिकाएँ और वियतनामी पैराग्लाइडिंग समुदाय की कहानियाँ।",
    },
  },

  pilots: {
    vi: {
      title: "Đội Phi Công Dù Lượn Chuyên Nghiệp | Mebayluon",
      description:
        "Gặp gỡ đội phi công dù lượn chuyên nghiệp của Mebayluon — có chứng chỉ IPPI quốc tế, nhiều năm kinh nghiệm bay tại Mù Cang Chải, Sapa và khắp Việt Nam.",
    },
    en: {
      title: "Our Professional Paragliding Pilots | Mebayluon",
      description:
        "Meet the Mebayluon team of professional paragliding pilots — IPPI certified, with years of experience flying in Mu Cang Chai, Sapa and across Vietnam.",
    },
    fr: {
      title: "Nos pilotes de parapente professionnels | Mebayluon",
      description:
        "Rencontrez l’équipe de pilotes de parapente professionnels de Mebayluon — certifiés IPPI, avec des années d’expérience à Mu Cang Chai, Sapa et partout au Vietnam.",
    },
    ru: {
      title: "Наши профессиональные пилоты парапланов | Mebayluon",
      description:
        "Познакомьтесь с командой профессиональных пилотов Mebayluon — с сертификатами IPPI и многолетним опытом полётов в Мукангчае, Сапе и по всему Вьетнаму.",
    },
    zh: {
      title: "我们的专业滑翔伞飞行员 | Mebayluon",
      description:
        "认识 Mebayluon 的专业滑翔伞飞行员团队——持有 IPPI 国际证照，在木江界、沙坝及越南各地拥有多年飞行经验。",
    },
    hi: {
      title: "हमारे पेशेवर पैराग्लाइडिंग पायलट | Mebayluon",
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
