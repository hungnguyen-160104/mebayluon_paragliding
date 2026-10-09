// lib/spot-route-maps.ts
/**
 * BẢN ĐỒ ĐƯỜNG ĐI của từng điểm bay — khối "Bản đồ đường đi" trên trang
 * /spots/<slug> (components/spots/SpotRouteMap.tsx). Chủ duyệt 08/10/2026.
 *
 * Năm hình đều là hình phối cảnh 3D dựng từ dữ liệu OpenStreetMap + độ cao thật,
 * nhãn SONG NGỮ Việt – Anh ngay trong ảnh, nên một ảnh dùng cho cả sáu ngôn ngữ;
 * chỉ tiêu đề, chú thích, alt và chữ của link là dịch.
 *
 * Ảnh đã nằm sẵn trên Cloudinary (cùng tệp với các bài viết đang dùng) — KHÔNG
 * tải lại. Đổi ảnh thì tải đè cùng public id rồi sửa số phiên bản (v…) ở đây.
 *
 * BẮT BUỘC trong chú thích (giấy phép ODbL của OpenStreetMap + yêu cầu của chủ):
 *  - hình KHÔNG theo tỉ lệ, số km là quãng đường thật  → ROUTE_MAP_I18N[lang].note
 *  - "Dữ liệu bản đồ © OpenStreetMap contributors"      → cũng nằm trong note
 *
 * Sự thật đã chốt, đừng viết khác: bãi cất cánh Khau Phạ ở GẦN đỉnh đèo (không
 * phải "trên đỉnh đèo"), cao 1.268 m; bãi hạ cánh ở bản Lìm Thái.
 *
 * THÊM BẢN ĐỒ CHO ĐIỂM BAY KHÁC: thêm một mục vào SPOT_ROUTE_MAPS theo slug
 * chuẩn (lib/spots-slugs.ts). Điểm bay không khai thì khối tự ẩn.
 */

export type RouteMapLang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

export type SpotRouteMap = {
  /** Khoá ổn định — dùng làm key và id neo (#route-map-<id>). */
  id: string;
  /** URL Cloudinary gốc (có số phiên bản). Trang tiếng Việt dùng `vi` nếu khác. */
  src: string;
  srcVi?: string;
  /** Kích thước thật của ảnh — để trình duyệt giữ chỗ, không xô lệch bố cục. */
  width: number;
  height: number;
  /** Bài "đường đi" liên quan (link nội bộ, đi qua components/locale-link). */
  href: string;
  text: Record<RouteMapLang, { title: string; alt: string; caption: string; link: string }>;
};

const CLD = "https://res.cloudinary.com/dxtzvakgd/image/upload";

/** Chữ dùng chung của khối. */
export const ROUTE_MAP_I18N: Record<
  RouteMapLang,
  { heading: string; lead: string; note: string; open: string }
> = {
  vi: {
    heading: "Bản đồ đường đi",
    lead: "Chạm vào hình để mở bản đầy đủ.",
    note: "Hình không theo tỉ lệ; số km ghi trên hình là quãng đường thật. Dữ liệu bản đồ © OpenStreetMap contributors.",
    open: "Mở hình cỡ đầy đủ",
  },
  en: {
    heading: "Route map",
    lead: "Tap a map to open it full size.",
    note: "Not to scale; the km shown are real road distances. Map data © OpenStreetMap contributors.",
    open: "Open the full-size picture",
  },
  fr: {
    heading: "Carte d'accès",
    lead: "Touchez une carte pour l'ouvrir en grand.",
    note: "Image non à l'échelle ; les km indiqués sont des distances routières réelles. Données cartographiques © OpenStreetMap contributors.",
    open: "Ouvrir l'image en grand",
  },
  ru: {
    heading: "Схема проезда",
    lead: "Нажмите на схему, чтобы открыть её в полном размере.",
    note: "Схема не в масштабе; километры на ней — реальные расстояния по дороге. Картографические данные © OpenStreetMap contributors.",
    open: "Открыть изображение в полном размере",
  },
  zh: {
    heading: "路线图",
    lead: "点击图片可查看大图。",
    note: "图片未按比例绘制；图上的公里数为实际道路里程。地图数据 © OpenStreetMap contributors。",
    open: "查看大图",
  },
  hi: {
    heading: "रास्ते का नक्शा",
    lead: "नक्शे को पूरे आकार में खोलने के लिए उस पर टैप करें।",
    note: "चित्र पैमाने के अनुसार नहीं है; दिखाए गए किमी सड़क की वास्तविक दूरी हैं। मानचित्र डेटा © OpenStreetMap contributors.",
    open: "पूरे आकार का चित्र खोलें",
  },
};

const KHAU_PHA: SpotRouteMap = {
  id: "khau-pha",
  src: `${CLD}/v1791454720/uploads/posts/ban-do-duong-den-khau-pha-en.jpg`,
  srcVi: `${CLD}/v1791454718/uploads/posts/ban-do-duong-den-khau-pha-vi.jpg`,
  width: 1600,
  height: 2094,
  href: "/blog/di-chuyen-den-diem-bay-du-luon-khau-pha",
  text: {
    vi: {
      title: "Đường đến điểm bay Khau Phạ",
      alt: "Hình phối cảnh 3D đường đến điểm bay dù lượn Khau Phạ nhìn từ phía Tú Lệ: Quốc lộ 32 leo đèo, điểm cất cánh gần đỉnh đèo Khau Phạ (1.268 m), bãi hạ cánh ở bản Lìm Thái và số km từng đoạn",
      caption:
        "Quốc lộ 32 từ Tú Lệ leo đèo Khau Phạ rồi sang Mù Cang Chải. Điểm cất cánh nằm gần đỉnh đèo Khau Phạ, cao 1.268 m, cách Tú Lệ khoảng 14 km; bãi hạ cánh ở bản Lìm Thái.",
      link: "Chỉ đường chi tiết tới điểm bay Khau Phạ",
    },
    en: {
      title: "The road to the Khau Pha site",
      alt: "3D terrain view of the road to the Khau Pha paragliding site seen from Tu Le: National Road 32 climbing the pass, the take-off near the top of Khau Pha Pass (1,268 m), the landing field in Lim Thai village and the km of each stretch",
      caption:
        "National Road 32 climbs from Tu Le over Khau Pha Pass and on to Mu Cang Chai. The take-off is near the top of Khau Pha Pass at 1,268 m, about 14 km from Tu Le; the landing field is in Lim Thai village.",
      link: "Detailed directions to the Khau Pha site",
    },
    fr: {
      title: "La route du site de Khau Pha",
      alt: "Vue 3D du relief de la route menant au site de parapente de Khau Pha depuis Tu Le : la route nationale 32 qui monte au col, le décollage près du sommet du col de Khau Pha (1 268 m), l'atterrissage au village de Lim Thai et les km de chaque tronçon",
      caption:
        "La route nationale 32 monte de Tu Le au col de Khau Pha puis continue vers Mu Cang Chai. Le décollage se trouve près du sommet du col de Khau Pha, à 1 268 m, à environ 14 km de Tu Le ; l'atterrissage est au village de Lim Thai.",
      link: "Itinéraire détaillé vers le site de Khau Pha",
    },
    ru: {
      title: "Дорога к месту полётов Кхау Фа",
      alt: "Объёмная схема дороги к месту полётов на параплане Кхау Фа со стороны Ту Ле: национальная дорога 32 поднимается на перевал, старт рядом с вершиной перевала Кхау Фа (1268 м), посадка в деревне Лим Тхай и километры каждого участка",
      caption:
        "Национальная дорога 32 поднимается от Ту Ле на перевал Кхау Фа и идёт дальше в Му Канг Чай. Старт находится рядом с вершиной перевала Кхау Фа, на высоте 1268 м, примерно в 14 км от Ту Ле; посадка — в деревне Лим Тхай.",
      link: "Подробно: как добраться до Кхау Фа",
    },
    zh: {
      title: "前往考帕飞行点的路线",
      alt: "从秀丽（Tu Le）方向看前往考帕（Khau Pha）滑翔伞飞行点的三维地形图：32号国道上山口，起飞场在考帕山口顶附近（1268米），降落场在林泰村（Lim Thai），并标有各路段公里数",
      caption:
        "32号国道从秀丽（Tu Le）翻越考帕山口通往木江界。起飞场在考帕山口顶附近，海拔1268米，距秀丽约14公里；降落场在林泰村（Lim Thai）。",
      link: "前往考帕飞行点的详细路线",
    },
    hi: {
      title: "खाउ फा उड़ान स्थल तक का रास्ता",
      alt: "तू ले की ओर से खाउ फा पैराग्लाइडिंग स्थल तक के रास्ते का 3D दृश्य: दर्रे पर चढ़ता राष्ट्रीय मार्ग 32, खाउ फा दर्रे के शिखर के पास टेक-ऑफ (1,268 मी), लिम थाई गाँव में लैंडिंग मैदान और हर हिस्से की दूरी किमी में",
      caption:
        "राष्ट्रीय मार्ग 32 तू ले से खाउ फा दर्रे पर चढ़कर मू कांग चाई की ओर जाता है। टेक-ऑफ खाउ फा दर्रे के शिखर के पास 1,268 मी पर है, तू ले से लगभग 14 किमी; लैंडिंग मैदान लिम थाई गाँव में है।",
      link: "खाउ फा स्थल तक पहुँचने का विस्तृत रास्ता",
    },
  },
};

const HA_NOI_MU_CANG_CHAI: SpotRouteMap = {
  id: "ha-noi-mu-cang-chai",
  src: `${CLD}/v1791454752/uploads/posts/ban-do-ha-noi-mu-cang-chai.jpg`,
  width: 1600,
  height: 2800,
  href: "/blog/duong-ha-noi-di-mu-cang-chai-qua-ic14",
  text: {
    vi: {
      title: "Hà Nội → Khau Phạ → Mù Cang Chải",
      alt: "Bản đồ 3D năm cách lái xe từ Mỹ Đình, Hà Nội lên Tú Lệ, điểm bay dù lượn Khau Phạ và Mù Cang Chải: Quốc lộ 32, hoặc cao tốc Nội Bài – Lào Cai ra nút IC12, IC13, IC14, IC15, kèm bảng số km từng cách",
      caption:
        "Năm cách lái xe từ Mỹ Đình (Hà Nội) lên Tú Lệ, điểm bay Khau Phạ và Mù Cang Chải: Quốc lộ 32 suốt tuyến, hoặc cao tốc Nội Bài – Lào Cai rồi ra nút IC12, IC13, IC14 hay IC15 (nút IC15 chưa thông).",
      link: "Đường Hà Nội đi Mù Cang Chải qua nút IC14",
    },
    en: {
      title: "Hanoi → Khau Pha → Mu Cang Chai",
      alt: "3D map of five ways to drive from My Dinh, Hanoi to Tu Le, the Khau Pha paragliding site and Mu Cang Chai: National Road 32, or the Noi Bai – Lao Cai expressway leaving at exit IC12, IC13, IC14 or IC15, with a table of km for each option",
      caption:
        "Five ways to drive from My Dinh (Hanoi) to Tu Le, the Khau Pha site and Mu Cang Chai: National Road 32 all the way, or the Noi Bai – Lao Cai expressway leaving at exit IC12, IC13, IC14 or IC15 (the IC15 exit is not open yet).",
      link: "Hanoi to Mu Cang Chai via exit IC14",
    },
    fr: {
      title: "Hanoï → Khau Pha → Mu Cang Chai",
      alt: "Carte 3D de cinq itinéraires en voiture de My Dinh, Hanoï, à Tu Le, au site de parapente de Khau Pha et à Mu Cang Chai : la route nationale 32, ou l'autoroute Noi Bai – Lao Cai avec sortie IC12, IC13, IC14 ou IC15, et un tableau des km de chaque option",
      caption:
        "Cinq itinéraires en voiture de My Dinh (Hanoï) à Tu Le, au site de Khau Pha et à Mu Cang Chai : la route nationale 32 de bout en bout, ou l'autoroute Noi Bai – Lao Cai avec sortie IC12, IC13, IC14 ou IC15 (la sortie IC15 n'est pas encore ouverte).",
      link: "De Hanoï à Mu Cang Chai par la sortie IC14",
    },
    ru: {
      title: "Ханой → Кхау Фа → Му Канг Чай",
      alt: "Объёмная карта пяти вариантов поездки на машине из Ми Динь (Ханой) в Ту Ле, к месту полётов Кхау Фа и в Му Канг Чай: национальная дорога 32 или автомагистраль Ной Бай – Лао Кай со съездом IC12, IC13, IC14 или IC15, с таблицей километров для каждого варианта",
      caption:
        "Пять вариантов поездки на машине из Ми Динь (Ханой) в Ту Ле, к месту полётов Кхау Фа и в Му Канг Чай: по национальной дороге 32 на всём пути или по автомагистрали Ной Бай – Лао Кай со съездом IC12, IC13, IC14 или IC15 (съезд IC15 пока не открыт).",
      link: "Из Ханоя в Му Канг Чай через съезд IC14",
    },
    zh: {
      title: "河内 → 考帕 → 木江界",
      alt: "从河内美亭自驾前往秀丽、考帕滑翔伞飞行点和木江界的五种走法三维地图：32号国道，或走内排—老街高速并从IC12、IC13、IC14或IC15出口下高速，附各走法公里数表",
      caption:
        "从河内美亭自驾前往秀丽（Tu Le）、考帕飞行点和木江界的五种走法：全程走32号国道，或走内排—老街高速，从IC12、IC13、IC14或IC15出口下高速（IC15出口尚未开通）。",
      link: "从河内经IC14出口前往木江界",
    },
    hi: {
      title: "हनोई → खाउ फा → मू कांग चाई",
      alt: "हनोई के मी दिन्ह से तू ले, खाउ फा पैराग्लाइडिंग स्थल और मू कांग चाई तक गाड़ी से जाने के पाँच रास्तों का 3D नक्शा: राष्ट्रीय मार्ग 32, या नोई बाई – लाओ काई एक्सप्रेसवे से निकास IC12, IC13, IC14 या IC15, हर विकल्प की किमी तालिका के साथ",
      caption:
        "मी दिन्ह (हनोई) से तू ले, खाउ फा स्थल और मू कांग चाई तक गाड़ी से जाने के पाँच रास्ते: पूरा रास्ता राष्ट्रीय मार्ग 32 से, या नोई बाई – लाओ काई एक्सप्रेसवे से निकास IC12, IC13, IC14 या IC15 पर उतरकर (IC15 निकास अभी खुला नहीं है)।",
      link: "हनोई से मू कांग चाई, निकास IC14 होकर",
    },
  },
};

const DOI_BU: SpotRouteMap = {
  id: "doi-bu",
  src: `${CLD}/v1791517611/uploads/posts/ban-do-duong-den-doi-bu.jpg`,
  width: 1600,
  height: 2565,
  href: "/blog/bay-du-luon-doi-bu",
  text: {
    vi: {
      title: "Đường đến điểm bay Đồi Bù",
      alt: "Hình phối cảnh 3D đường đến điểm bay dù lượn Đồi Bù từ GO! Thăng Long (Hà Nội): tuyến Quốc lộ 6 qua Hà Đông và tuyến Đại lộ Thăng Long gặp nhau ở ngã tư Xuân Mai, đường Hồ Chí Minh tới ngã ba Chợ Cá, Núi Bé nơi có bãi hạ cánh, đường đất lên bãi cất cánh và số km từng đoạn",
      caption:
        "Hai tuyến từ điểm đón GO! Thăng Long (Hà Nội) — theo Quốc lộ 6 hoặc Đại lộ Thăng Long — gặp nhau ở ngã tư Xuân Mai, khoảng 38–39 km tới Núi Bé, nơi có bãi hạ cánh. Từ đó xe chuyên dụng theo đường đất lên bãi cất cánh (khoảng 630 m).",
      link: "Bài chi tiết: bay dù lượn Đồi Bù",
    },
    en: {
      title: "The road to the Doi Bu site",
      alt: "3D terrain view of the road to the Doi Bu paragliding site from GO! Thang Long in Hanoi: the National Road 6 route via Ha Dong and the Thang Long Boulevard route meeting at the Xuan Mai crossroads, the Ho Chi Minh road to the Cho Ca junction, Nui Be with the landing field, the dirt road up to the take-off and the km of each stretch",
      caption:
        "Two routes from the GO! Thang Long pick-up point (Hanoi) — National Road 6 or Thang Long Boulevard — meet at the Xuan Mai crossroads; it is about 38–39 km to Nui Be, where the landing field is. From there a 4×4 shuttle climbs the dirt road to the take-off (about 630 m).",
      link: "Full guide: paragliding at Doi Bu",
    },
    fr: {
      title: "La route du site de Doi Bu",
      alt: "Vue 3D du relief de la route menant au site de parapente de Doi Bu depuis GO! Thang Long à Hanoï : l'itinéraire par la route nationale 6 via Ha Dong et celui par le boulevard Thang Long se rejoignent au carrefour de Xuan Mai, la route Ho Chi Minh jusqu'au carrefour de Cho Ca, Nui Be avec l'atterrissage, la piste en terre vers le décollage et les km de chaque tronçon",
      caption:
        "Deux itinéraires depuis le point de prise en charge GO! Thang Long (Hanoï) — par la route nationale 6 ou par le boulevard Thang Long — se rejoignent au carrefour de Xuan Mai ; comptez environ 38–39 km jusqu'à Nui Be, où se trouve l'atterrissage. De là, une navette 4×4 monte par la piste en terre jusqu'au décollage (environ 630 m).",
      link: "Guide complet : le parapente à Doi Bu",
    },
    ru: {
      title: "Дорога к месту полётов Дой Бу",
      alt: "Объёмная схема дороги к месту полётов на параплане Дой Бу от GO! Тханг Лонг в Ханое: маршрут по национальной дороге 6 через Ха Донг и маршрут по бульвару Тханг Лонг сходятся на перекрёстке Суан Май, дорога Хо Ши Мина до развилки Чо Ка, Нуй Бе с посадочной площадкой, грунтовая дорога к старту и километры каждого участка",
      caption:
        "Два маршрута от места сбора GO! Тханг Лонг (Ханой) — по национальной дороге 6 или по бульвару Тханг Лонг — сходятся на перекрёстке Суан Май; до Нуй Бе, где находится посадочная площадка, около 38–39 км. Оттуда внедорожник поднимается по грунтовой дороге к старту (около 630 м).",
      link: "Подробный гид: полёты на Дой Бу",
    },
    zh: {
      title: "前往堆布飞行点的路线",
      alt: "从河内GO! Thang Long出发前往堆布（Doi Bu）滑翔伞飞行点的三维地形图：经河东的6号国道路线与升龙大道路线在春梅十字路口汇合，胡志明公路至鱼市三岔路口，设有降落场的Nui Be，通往起飞场的土路，并标有各路段公里数",
      caption:
        "从河内GO! Thang Long接送点出发有两条路线——走6号国道或升龙大道——在春梅（Xuan Mai）十字路口汇合，到设有降落场的Nui Be约38–39公里。之后换乘越野车沿土路上到起飞场（约630米）。",
      link: "详细攻略：堆布滑翔伞",
    },
    hi: {
      title: "दोई बू उड़ान स्थल तक का रास्ता",
      alt: "हनोई के GO! थांग लोंग से दोई बू पैराग्लाइडिंग स्थल तक के रास्ते का 3D दृश्य: हा दोंग होकर राष्ट्रीय मार्ग 6 वाला रास्ता और थांग लोंग बुलेवार्ड वाला रास्ता शुआन माई चौराहे पर मिलते हैं, चो का तिराहे तक हो ची मिन्ह मार्ग, लैंडिंग मैदान वाला नुई बे, टेक-ऑफ तक कच्ची सड़क और हर हिस्से की दूरी किमी में",
      caption:
        "GO! थांग लोंग पिक-अप पॉइंट (हनोई) से दो रास्ते — राष्ट्रीय मार्ग 6 या थांग लोंग बुलेवार्ड — शुआन माई चौराहे पर मिलते हैं; लैंडिंग मैदान वाले नुई बे तक लगभग 38–39 किमी। वहाँ से 4×4 गाड़ी कच्ची सड़क से टेक-ऑफ (लगभग 630 मी) तक ले जाती है।",
      link: "पूरी जानकारी: दोई बू में पैराग्लाइडिंग",
    },
  },
};

const VIEN_NAM: SpotRouteMap = {
  id: "vien-nam",
  src: `${CLD}/v1791517604/uploads/posts/ban-do-duong-den-vien-nam.jpg`,
  width: 1600,
  height: 2780,
  href: "/blog/du-luon-vien-nam",
  text: {
    vi: {
      title: "Đường đến điểm bay Viên Nam",
      alt: "Hình phối cảnh 3D đường đến điểm bay dù lượn Viên Nam từ GO! Thăng Long (Hà Nội): Đại lộ Thăng Long, nút giao Hoà Lạc, đường Hoà Lạc – Hoà Bình, bãi hạ cánh sát đường lớn cũng là điểm tập kết Mebayluon, đường đất lên hai bãi cất cánh, sông Đà, núi Ba Vì và số km từng đoạn",
      caption:
        "Từ điểm đón GO! Thăng Long (Hà Nội) theo Đại lộ Thăng Long qua nút giao Hoà Lạc, rồi đường Hoà Lạc – Hoà Bình tới bãi hạ cánh nằm sát đường lớn, cũng là điểm tập kết Mebayluon. Từ đó xe chuyên dụng lên bãi cất cánh 1 (khoảng 650 m) hoặc bãi cất cánh 2 (khoảng 850 m).",
      link: "Bài chi tiết: bay dù lượn Viên Nam",
    },
    en: {
      title: "The road to the Vien Nam site",
      alt: "3D terrain view of the road to the Vien Nam paragliding site from GO! Thang Long in Hanoi: Thang Long Boulevard, the Hoa Lac interchange, the Hoa Lac – Hoa Binh road, the roadside landing field that is also the Mebayluon meeting point, the dirt tracks up to the two take-offs, the Da River, Ba Vi mountain and the km of each stretch",
      caption:
        "From the GO! Thang Long pick-up point (Hanoi), follow Thang Long Boulevard past the Hoa Lac interchange, then the Hoa Lac – Hoa Binh road to the landing field beside the main road, which is also the Mebayluon meeting point. From there a 4×4 shuttle climbs to take-off 1 (about 650 m) or take-off 2 (about 850 m).",
      link: "Full guide: paragliding at Vien Nam",
    },
    fr: {
      title: "La route du site de Vien Nam",
      alt: "Vue 3D du relief de la route menant au site de parapente de Vien Nam depuis GO! Thang Long à Hanoï : le boulevard Thang Long, l'échangeur de Hoa Lac, la route Hoa Lac – Hoa Binh, l'atterrissage en bord de route, qui est aussi le point de rendez-vous Mebayluon, les pistes en terre vers les deux décollages, la rivière Da, le mont Ba Vi et les km de chaque tronçon",
      caption:
        "Depuis le point de prise en charge GO! Thang Long (Hanoï), suivez le boulevard Thang Long, passez l'échangeur de Hoa Lac puis prenez la route Hoa Lac – Hoa Binh jusqu'à l'atterrissage, au bord de la grande route, qui est aussi le point de rendez-vous Mebayluon. De là, une navette 4×4 monte au décollage 1 (environ 650 m) ou au décollage 2 (environ 850 m).",
      link: "Guide complet : le parapente à Vien Nam",
    },
    ru: {
      title: "Дорога к месту полётов Вьен Нам",
      alt: "Объёмная схема дороги к месту полётов на параплане Вьен Нам от GO! Тханг Лонг в Ханое: бульвар Тханг Лонг, развязка Хоа Лак, дорога Хоа Лак – Хоа Бинь, посадочная площадка у дороги — она же место сбора Mebayluon, грунтовые дороги к двум стартам, река Да, гора Бави и километры каждого участка",
      caption:
        "От места сбора GO! Тханг Лонг (Ханой) по бульвару Тханг Лонг через развязку Хоа Лак, затем по дороге Хоа Лак – Хоа Бинь до посадочной площадки у главной дороги — она же место сбора Mebayluon. Оттуда внедорожник поднимается к старту 1 (около 650 м) или к старту 2 (около 850 м).",
      link: "Подробный гид: полёты на Вьен Нам",
    },
    zh: {
      title: "前往圆南飞行点的路线",
      alt: "从河内GO! Thang Long出发前往圆南（Vien Nam）滑翔伞飞行点的三维地形图：升龙大道、和乐立交、和乐—和平公路、路边的降落场（也是Mebayluon集合点）、通往两个起飞场的土路、沱江、巴位山，并标有各路段公里数",
      caption:
        "从河内GO! Thang Long接送点出发，沿升龙大道经和乐（Hoa Lac）立交，再走和乐—和平公路到大路旁的降落场，这里也是Mebayluon集合点。之后换乘越野车上到1号起飞场（约650米）或2号起飞场（约850米）。",
      link: "详细攻略：圆南滑翔伞",
    },
    hi: {
      title: "विएन नाम उड़ान स्थल तक का रास्ता",
      alt: "हनोई के GO! थांग लोंग से विएन नाम पैराग्लाइडिंग स्थल तक के रास्ते का 3D दृश्य: थांग लोंग बुलेवार्ड, होआ लाक इंटरचेंज, होआ लाक – होआ बिन्ह मार्ग, सड़क किनारे लैंडिंग मैदान जो Mebayluon मिलन-स्थल भी है, दोनों टेक-ऑफ तक कच्चे रास्ते, दा नदी, बा वी पर्वत और हर हिस्से की दूरी किमी में",
      caption:
        "GO! थांग लोंग पिक-अप पॉइंट (हनोई) से थांग लोंग बुलेवार्ड पर होआ लाक इंटरचेंज पार करें, फिर होआ लाक – होआ बिन्ह मार्ग से मुख्य सड़क के किनारे लैंडिंग मैदान तक, जो Mebayluon मिलन-स्थल भी है। वहाँ से 4×4 गाड़ी टेक-ऑफ 1 (लगभग 650 मी) या टेक-ऑफ 2 (लगभग 850 मी) तक ले जाती है।",
      link: "पूरी जानकारी: विएन नाम में पैराग्लाइडिंग",
    },
  },
};

const SA_PA: SpotRouteMap = {
  id: "sa-pa",
  src: `${CLD}/v1791517617/uploads/posts/ban-do-duong-den-sa-pa.jpg`,
  width: 1600,
  height: 1921,
  href: "/blog/bay-du-luon-sa-pa-muong-hoa",
  text: {
    vi: {
      title: "Đường đến điểm bay Sa Pa",
      alt: "Hình phối cảnh 3D đường đến điểm bay dù lượn Sa Pa ở thung lũng Mường Hoa: từ Sun Plaza theo đường tỉnh 152, ngã ba lên bản Hang Đá tới bãi cất cánh, đường xuống cầu Lao Chải nơi có bãi hạ cánh, Tả Van, bản Cát Cát và số km từng đoạn",
      caption:
        "Từ Sun Plaza ở trung tâm Sa Pa theo phố Mường Hoa và đường tỉnh 152 khoảng 2,2 km tới ngã ba, đi thẳng lên bản Hang Đá 3,2 km là tới bãi cất cánh (khoảng 1.500 m). Bãi hạ cánh ở cầu Lao Chải (khoảng 1.000 m), dưới đáy thung lũng Mường Hoa.",
      link: "Bài chi tiết: bay dù lượn Sa Pa",
    },
    en: {
      title: "The road to the Sa Pa site",
      alt: "3D terrain view of the road to the Sa Pa paragliding site in the Muong Hoa valley: from Sun Plaza along provincial road 152, the fork up to Hang Da village and the take-off, the road down to Lao Chai bridge with the landing field, Ta Van, Cat Cat village and the km of each stretch",
      caption:
        "From Sun Plaza in Sa Pa town centre, follow Muong Hoa street and provincial road 152 for about 2.2 km to the fork, then keep straight up to Hang Da village for 3.2 km to the take-off (about 1,500 m). The landing field is at Lao Chai bridge (about 1,000 m), on the floor of the Muong Hoa valley.",
      link: "Full guide: paragliding in Sa Pa",
    },
    fr: {
      title: "La route du site de Sa Pa",
      alt: "Vue 3D du relief de la route menant au site de parapente de Sa Pa dans la vallée de Muong Hoa : depuis Sun Plaza par la route provinciale 152, la bifurcation vers le village de Hang Da et le décollage, la descente vers le pont de Lao Chai et l'atterrissage, Ta Van, le village de Cat Cat et les km de chaque tronçon",
      caption:
        "Depuis Sun Plaza, au centre de Sa Pa, suivez la rue Muong Hoa et la route provinciale 152 sur environ 2,2 km jusqu'à la bifurcation, puis continuez tout droit vers le village de Hang Da sur 3,2 km jusqu'au décollage (environ 1 500 m). L'atterrissage se trouve au pont de Lao Chai (environ 1 000 m), au fond de la vallée de Muong Hoa.",
      link: "Guide complet : le parapente à Sa Pa",
    },
    ru: {
      title: "Дорога к месту полётов в Сапе",
      alt: "Объёмная схема дороги к месту полётов на параплане в Сапе, долина Мыонг Хоа: от Sun Plaza по провинциальной дороге 152, развилка к деревне Ханг Да и старту, спуск к мосту Лао Чай с посадочной площадкой, Та Ван, деревня Кат Кат и километры каждого участка",
      caption:
        "От Sun Plaza в центре Сапы по улице Мыонг Хоа и провинциальной дороге 152 около 2,2 км до развилки, затем прямо вверх к деревне Ханг Да ещё 3,2 км — до старта (около 1500 м). Посадочная площадка находится у моста Лао Чай (около 1000 м), на дне долины Мыонг Хоа.",
      link: "Подробный гид: полёты в Сапе",
    },
    zh: {
      title: "前往沙巴飞行点的路线",
      alt: "前往沙巴芒花谷滑翔伞飞行点的三维地形图：从Sun Plaza沿152号省道，岔路口上行至Hang Da村和起飞场，下行至设有降落场的老寨桥，以及大湾、猫猫村，并标有各路段公里数",
      caption:
        "从沙巴镇中心的Sun Plaza出发，沿芒花街和152号省道行驶约2.2公里到岔路口，直行上山3.2公里到Hang Da村，即到起飞场（约1500米）。降落场在芒花谷谷底的老寨（Lao Chai）桥（约1000米）。",
      link: "详细攻略：沙巴滑翔伞",
    },
    hi: {
      title: "सा पा उड़ान स्थल तक का रास्ता",
      alt: "मुओंग होआ घाटी में सा पा पैराग्लाइडिंग स्थल तक के रास्ते का 3D दृश्य: Sun Plaza से प्रांतीय मार्ग 152, हांग दा गाँव और टेक-ऑफ की ओर जाने वाला तिराहा, लैंडिंग मैदान वाले लाओ चाई पुल तक उतरती सड़क, ता वान, कैट कैट गाँव और हर हिस्से की दूरी किमी में",
      caption:
        "सा पा के केंद्र में Sun Plaza से मुओंग होआ स्ट्रीट और प्रांतीय मार्ग 152 पर लगभग 2.2 किमी चलकर तिराहे तक पहुँचें, फिर सीधे हांग दा गाँव की ओर 3.2 किमी ऊपर टेक-ऑफ (लगभग 1,500 मी) है। लैंडिंग मैदान मुओंग होआ घाटी के तल पर लाओ चाई पुल (लगभग 1,000 मी) के पास है।",
      link: "पूरी जानकारी: सा पा में पैराग्लाइडिंग",
    },
  },
};

/**
 * Điểm bay → các bản đồ. Khoá là slug CHUẨN của trang /spots/<slug>.
 * "doi-bu" là trang Hà Nội gộp hai bãi Đồi Bù + Viên Nam (/spots/vien-nam 301
 * về đây) nên hiện cả hai hình, mỗi hình một tiêu đề riêng.
 */
export const SPOT_ROUTE_MAPS: Record<string, SpotRouteMap[]> = {
  "khau-pha": [KHAU_PHA, HA_NOI_MU_CANG_CHAI],
  "doi-bu": [DOI_BU, VIEN_NAM],
  "muong-hoa-sapa": [SA_PA],
};

export const getSpotRouteMaps = (slug?: string | null): SpotRouteMap[] =>
  (slug && SPOT_ROUTE_MAPS[slug]) || [];
