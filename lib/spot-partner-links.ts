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
    ],
  },

  // Đà Nẵng chưa có hồ sơ Tripadvisor riêng nên khối "Xem thêm" không hiện.
  "son-tra": {
    maps: [],
    partners: [],
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
