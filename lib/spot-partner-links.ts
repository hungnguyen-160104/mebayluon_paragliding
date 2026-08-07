// lib/spot-partner-links.ts
/**
 * Vị trí trên Google Maps + các trang bán tour của TỪNG ĐIỂM BAY.
 *
 * Khác với lib/partner-links.ts (hồ sơ doanh nghiệp, dùng cho `sameAs` và
 * footer), file này chứa trang SẢN PHẨM của từng điểm bay — hiện thành khối
 * "Xem thêm thông tin điểm bay tại…" ngay trên mục "Khoảnh khắc tại đây".
 *
 * THÊM LINK MỚI: thêm một dòng vào đúng slug bên dưới.
 *  - `kind` quyết định phần chữ mô tả (đã dịch 6 ngôn ngữ ở SPOT_LINK_I18N).
 *  - `brand` quyết định màu nút (bảng màu ở lib/partner-links.ts).
 * Nhớ dùng URL sạch: bỏ ?ranking_uuid=, ?gclid=, ?srsltid= và bỏ tiền tố khoá
 * vùng khi nền tảng cho phép (klook.com/activity/... và getyourguide.com/...
 * tự chuyển sang ngôn ngữ của khách). Riêng KKday bắt buộc có mã ngôn ngữ
 * trong đường dẫn nên phải giữ /vi/ hoặc /en/.
 */
import type { PartnerBrand } from "./partner-links";

export type SpotLinkKind =
  | "takeoff"
  | "paramotorTakeoff"
  | "landing"
  | "site"
  | "paragliding"
  | "paramotor"
  | "course"
  | "reviews";

export type SpotLink = {
  /** Tên nền tảng hiện trên nút — danh từ riêng, không dịch. */
  platform: string;
  url: string;
  kind: SpotLinkKind;
  brand: PartnerBrand;
};

/** Link nội bộ tới bài khoá học — điểm bay cũng là trường dạy dù. */
export type SpotCourseLink = {
  href: string;
  labelKey: "courseP1P2" | "courseOneOnOne";
};

export type SpotLinkGroup = {
  /** Vị trí bãi cất cánh / hạ cánh trên Google Maps. */
  maps: SpotLink[];
  /** Trang bán tour trên các nền tảng OTA. */
  partners: SpotLink[];
  /** Khoá học dạy bay tổ chức tại chính điểm bay này. */
  courses?: SpotCourseLink[];
};

/** Hai điểm bay có trường dạy dù đều dẫn về cùng bộ bài khoá học. */
const SCHOOL_COURSES: SpotCourseLink[] = [
  { href: "/blog/khoa-hoc-du-luon-p1-p2", labelKey: "courseP1P2" },
  { href: "/blog/khoa-hoc-du-luon-1-kem-1", labelKey: "courseOneOnOne" },
];

const CLUBHOUSE_MAP_URL =
  "https://www.google.com/maps/place/Clubhouse+Mebayluon+Paragliding/@21.7764187,104.2636752,1008m/data=!3m1!1e3!4m11!3m10!1s0x3132d86a65a88495:0x69a2a48b9f14bb71!5m2!4m1!1i2!8m2!3d21.7764187!4d104.2636752!9m1!1b1!16s%2Fg%2F11dxdh48gt!17m2!4m1!1e3!18m1!1e1?entry=ttu";

const KHAU_PHA_TAKEOFF_MAP_URL =
  "https://www.google.com/maps/place/%C4%90i%E1%BB%83m+Bay+D%C3%B9+L%C6%B0%E1%BB%A3n+Khau+Ph%E1%BA%A1/@21.7549587,104.2655369,922m/data=!3m1!1e3!4m8!3m7!1s0x3132d88af2212c0d:0x40d25338c1dac102!8m2!3d21.7549587!4d104.2655369!9m1!1b1!16s%2Fg%2F11fyzcp8gc!17m2!4m1!1e3!18m1!1e1?entry=ttu";

const SAPA_TAKEOFF_MAP_URL =
  "https://www.google.com/maps/place/Sapa+Paragliding+-+%C4%90i%E1%BB%83m+C%E1%BA%A5t+c%C3%A1nh+D%C3%B9+L%C6%B0%E1%BB%A3n+Sapa/@22.3219262,103.8766636,918m/data=!3m1!1e3!4m8!3m7!1s0x36cd476f881a83e9:0x34a10d4a5bf8d07c!8m2!3d22.3219262!4d103.8766636!9m1!1b1!16s%2Fg%2F11x2s56ydh!17m2!4m1!1e3!18m1!1e1?entry=ttu";

/** Hai điểm bay Hà Nội dùng chung một bộ link (cùng một tour bán ra). */
const HA_NOI_GROUP: SpotLinkGroup = {
  maps: [
    {
      platform: "Đồi Bù",
      url: "https://maps.app.goo.gl/EpmHGVy2b2rnmGYz7",
      kind: "takeoff",
      brand: "google",
    },
    {
      platform: "Viên Nam",
      url: "https://maps.app.goo.gl/G2exRZW5wgSFQASY9",
      kind: "takeoff",
      brand: "google",
    },
  ],
  partners: [
    {
      platform: "Klook",
      url: "https://www.klook.com/activity/65949-paragliding-experience-in-ha-noi-city/",
      kind: "paragliding",
      brand: "klook",
    },
    {
      platform: "KKday",
      url: "https://www.kkday.com/vi/product/529322",
      kind: "paragliding",
      brand: "kkday",
    },
    {
      platform: "GetYourGuide",
      url: "https://www.getyourguide.com/hanoi-l205/paragliding-tour-near-hanoi-roundtrip-transfer-from-city-t1138375/",
      kind: "paragliding",
      brand: "getyourguide",
    },
    {
      platform: "GetYourGuide",
      url: "https://www.getyourguide.com/hanoi-l205/hanoi-7-day-paragliding-training-course-for-beginners-t1191130/",
      kind: "course",
      brand: "getyourguide",
    },
    {
      platform: "Seek Sophie",
      url: "https://www.seeksophie.com/experiences/hanoi-me-bay-luon-paragliding-doi-bu-hanoi-owe5om00jo",
      kind: "paragliding",
      brand: "seeksophie",
    },
    {
      platform: "Tripadvisor",
      url: "https://www.tripadvisor.com/Attraction_Review-g293924-d27966587-Reviews-Mebayluon_Paragliding-Hanoi.html",
      kind: "reviews",
      brand: "tripadvisor",
    },
  ],
  courses: SCHOOL_COURSES,
};

export const SPOT_LINKS: Record<string, SpotLinkGroup> = {
  "khau-pha": {
    maps: [
      {
        platform: "Google Maps",
        url: KHAU_PHA_TAKEOFF_MAP_URL,
        kind: "takeoff",
        brand: "google",
      },
      {
        // Dù lượn gắn động cơ cất cánh ngay tại sân Clubhouse Mebayluon,
        // cũng chính là bãi hạ cánh của dù lượn thường.
        platform: "Clubhouse Mebayluon",
        url: CLUBHOUSE_MAP_URL,
        kind: "paramotorTakeoff",
        brand: "google",
      },
      {
        platform: "Clubhouse Mebayluon",
        url: CLUBHOUSE_MAP_URL,
        kind: "landing",
        brand: "google",
      },
    ],
    partners: [
      {
        platform: "Tripadvisor",
        url: "https://www.tripadvisor.com/Attraction_Review-g8146384-d34094462-Reviews-Mu_Cang_Chai_Paragliding_Experience_with_Free_Accommodation-Mu_Cang_Chai_Lao_Ca.html",
        kind: "reviews",
        brand: "tripadvisor",
      },
      {
        platform: "Klook",
        url: "https://www.klook.com/activity/76583-paragliding-experience-north-viet-nam/",
        kind: "paragliding",
        brand: "klook",
      },
      {
        platform: "Klook",
        url: "https://www.klook.com/activity/208894-paramotor-paragliding-experience-in-mu-cang-chai/",
        kind: "paramotor",
        brand: "klook",
      },
      {
        platform: "GetYourGuide",
        url: "https://www.getyourguide.com/mu-cang-chai-l149196/mu-cang-chai-paragliding-adventure-flying-over-scenic-spot-t1139081/",
        kind: "paragliding",
        brand: "getyourguide",
      },
      {
        platform: "GetYourGuide",
        url: "https://www.getyourguide.com/lao-cai-l244871/paramotor-paragliding-experience-in-mu-cang-chai-t1295428/",
        kind: "paramotor",
        brand: "getyourguide",
      },
      {
        platform: "GetYourGuide",
        url: "https://www.getyourguide.com/mu-cang-chai-l149196/10-day-paragliding-course-in-mu-cang-chai-beginner-level-t1186083/",
        kind: "course",
        brand: "getyourguide",
      },
    ],
    courses: SCHOOL_COURSES,
  },

  "doi-bu": HA_NOI_GROUP,
  "vien-nam": HA_NOI_GROUP,

  "muong-hoa-sapa": {
    maps: [
      {
        platform: "Google Maps",
        url: SAPA_TAKEOFF_MAP_URL,
        kind: "takeoff",
        brand: "google",
      },
      {
        platform: "Google Maps",
        url: "https://maps.app.goo.gl/R78tpZfmfiP8WgTN9",
        kind: "landing",
        brand: "google",
      },
    ],
    // Sapa Paragliding là công ty con của Mebayluon nên dùng chung hồ sơ OTA
    // (nguồn: paraglidingsapa.com).
    partners: [
      {
        platform: "Tripadvisor",
        url: "https://www.tripadvisor.com/Attraction_Review-g311304-d33242005-Reviews-Paragliding_Experience_in_Sapa_Hotel_Pickup_and_Drop-off-Sapa_Lao_Cai_Province.html",
        kind: "reviews",
        brand: "tripadvisor",
      },
      {
        platform: "Klook",
        url: "https://www.klook.com/activity/158451-paragliding-experience-in-sapa/",
        kind: "paragliding",
        brand: "klook",
      },
      {
        platform: "GetYourGuide",
        url: "https://www.getyourguide.com/sa-pa-l1049/paragliding-adventure-in-sapa-with-top-vietnamese-pilots-t1128335/",
        kind: "paragliding",
        brand: "getyourguide",
      },
      {
        platform: "Viator",
        url: "https://www.viator.com/tours/Sapa/Paragliding-Experience-in-Sapa-Hotel-Pickup-and-Drop-off/d50492-5583754P4",
        kind: "paragliding",
        brand: "viator",
      },
      {
        platform: "Seek Sophie",
        url: "https://www.seeksophie.com/experiences/sapa-sapa-paragliding-over-terraced-valleys-o32jl0rgj6",
        kind: "paragliding",
        brand: "seeksophie",
      },
    ],
  },

  "son-tra": {
    maps: [],
    partners: [
      {
        platform: "Klook",
        url: "https://www.klook.com/activity/90127-paragliding-experience-in-da-nang/",
        kind: "paragliding",
        brand: "klook",
      },
      {
        platform: "KKday",
        url: "https://www.kkday.com/en/product/529519",
        kind: "paragliding",
        brand: "kkday",
      },
      {
        platform: "Seek Sophie",
        url: "https://www.seeksophie.com/experiences/da-nang-soar-over-da-nang-paragliding-adventure-ol2zmr1dj7",
        kind: "paragliding",
        brand: "seeksophie",
      },
    ],
  },
};

export const getSpotLinks = (slug?: string | null): SpotLinkGroup | null =>
  (slug && SPOT_LINKS[slug]) || null;

/**
 * Hồ sơ Tripadvisor của điểm bay — dùng cho bong bóng đánh giá nổi cạnh bong
 * bóng Google. Điểm bay chưa có hồ sơ thì trả null và bong bóng không hiện.
 */
export const getSpotTripadvisorUrl = (slug?: string | null): string | null =>
  getSpotLinks(slug)?.partners.find((p) => p.brand === "tripadvisor")?.url ??
  null;

/**
 * Tên rút gọn của điểm bay, dùng làm nhãn nút ở footer ("Klook · Khau Phạ").
 * Danh từ riêng nên không dịch.
 */
const SPOT_SHORT_NAME: Record<string, string> = {
  "khau-pha": "Khau Phạ",
  "doi-bu": "Hà Nội",
  "vien-nam": "Hà Nội",
  "muong-hoa-sapa": "Sapa",
  "son-tra": "Đà Nẵng",
};

export type FooterPartnerLink = {
  name: string;
  url: string;
  brand: PartnerBrand;
};

/**
 * Gom link OTA của TẤT CẢ điểm bay theo loại, khử trùng theo URL (Đồi Bù và
 * Viên Nam dùng chung một bộ link nên URL sẽ lặp).
 *
 * Footer lấy từ đây chứ không khai riêng, để thêm link vào SPOT_LINKS là
 * footer tự có luôn — không bao giờ lệch nhau.
 */
function collectSpotLinks(kinds: SpotLinkKind[]): FooterPartnerLink[] {
  const seen = new Set<string>();
  const out: FooterPartnerLink[] = [];

  for (const [slug, group] of Object.entries(SPOT_LINKS)) {
    for (const link of group.partners) {
      if (!kinds.includes(link.kind) || seen.has(link.url)) continue;
      seen.add(link.url);

      const place = SPOT_SHORT_NAME[slug] ?? slug;
      const suffix = link.kind === "paramotor" ? " (Paramotor)" : "";

      out.push({
        name: `${link.platform} · ${place}${suffix}`,
        url: link.url,
        brand: link.brand,
      });
    }
  }

  return out;
}

/** Trang bán tour bay trải nghiệm (dù lượn + dù lượn gắn động cơ). */
export const TOUR_PARTNER_LINKS = collectSpotLinks(["paragliding", "paramotor"]);

/** Trang bán khoá học bay. */
export const COURSE_PARTNER_LINKS = collectSpotLinks(["course"]);

type SpotLinkLang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

export const SPOT_LINK_I18N: Record<
  SpotLinkLang,
  {
    mapsTitle: string;
    partnersTitle: string;
    coursesTitle: string;
    courseP1P2: string;
    courseOneOnOne: string;
  } & Record<SpotLinkKind, string>
> = {
  vi: {
    mapsTitle: "Vị trí điểm bay trên Google Maps",
    partnersTitle: "Xem thêm thông tin điểm bay tại",
    coursesTitle: "Học bay dù lượn tại điểm bay này",
    courseP1P2: "Khoá học P1 – P2",
    courseOneOnOne: "Khoá học 1 kèm 1",
    takeoff: "Bãi cất cánh dù lượn",
    paramotorTakeoff: "Bãi cất cánh dù lượn gắn động cơ",
    landing: "Bãi hạ cánh",
    site: "Điểm bay",
    paragliding: "Dù lượn",
    paramotor: "Dù lượn có động cơ",
    course: "Khoá học P1 – P2",
    reviews: "Đánh giá của khách",
  },
  en: {
    mapsTitle: "Flying site on Google Maps",
    partnersTitle: "More about this site on",
    coursesTitle: "Learn to fly at this site",
    courseP1P2: "P1 – P2 course",
    courseOneOnOne: "One-to-one course",
    takeoff: "Paragliding take-off",
    paramotorTakeoff: "Paramotor take-off",
    landing: "Landing",
    site: "Flying site",
    paragliding: "Paragliding",
    paramotor: "Paramotor",
    course: "P1 – P2 course",
    reviews: "Guest reviews",
  },
  fr: {
    mapsTitle: "Le site de vol sur Google Maps",
    partnersTitle: "Plus d’infos sur ce site sur",
    coursesTitle: "Apprendre à voler sur ce site",
    courseP1P2: "Stage P1 – P2",
    courseOneOnOne: "Cours en tête-à-tête",
    takeoff: "Décollage parapente",
    paramotorTakeoff: "Décollage paramoteur",
    landing: "Atterrissage",
    site: "Site de vol",
    paragliding: "Parapente",
    paramotor: "Paramoteur",
    course: "Stage P1 – P2",
    reviews: "Avis des clients",
  },
  ru: {
    mapsTitle: "Место полётов на Google Maps",
    partnersTitle: "Подробнее об этом месте на",
    coursesTitle: "Обучение полётам на этом месте",
    courseP1P2: "Курс P1 – P2",
    courseOneOnOne: "Индивидуальный курс",
    takeoff: "Старт параплана",
    paramotorTakeoff: "Старт парамотора",
    landing: "Посадка",
    site: "Место полётов",
    paragliding: "Параплан",
    paramotor: "Парамотор",
    course: "Курс P1 – P2",
    reviews: "Отзывы гостей",
  },
  zh: {
    mapsTitle: "飞行点在 Google 地图上的位置",
    partnersTitle: "在以下平台了解更多",
    coursesTitle: "在这个飞行点学飞",
    courseP1P2: "P1 – P2 课程",
    courseOneOnOne: "一对一课程",
    takeoff: "滑翔伞起飞场",
    paramotorTakeoff: "动力滑翔伞起飞场",
    landing: "降落场",
    site: "飞行点",
    paragliding: "滑翔伞",
    paramotor: "动力滑翔伞",
    course: "P1 – P2 课程",
    reviews: "客人评价",
  },
  hi: {
    mapsTitle: "Google Maps पर उड़ान स्थल",
    partnersTitle: "इस स्थल की और जानकारी यहाँ",
    coursesTitle: "इसी स्थल पर उड़ान सीखें",
    courseP1P2: "P1 – P2 कोर्स",
    courseOneOnOne: "वन-टू-वन कोर्स",
    takeoff: "पैराग्लाइडिंग टेक-ऑफ़ पॉइंट",
    paramotorTakeoff: "पैरामोटर टेक-ऑफ़ पॉइंट",
    landing: "लैंडिंग पॉइंट",
    site: "उड़ान स्थल",
    paragliding: "पैराग्लाइडिंग",
    paramotor: "पैरामोटर",
    course: "P1 – P2 कोर्स",
    reviews: "मेहमानों की समीक्षाएँ",
  },
};
