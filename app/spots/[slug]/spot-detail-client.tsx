"use client";

import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Mountain, Clock, Feather } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/language-context";
import { Footer } from "@/components/footer";

/* =========================
   Types
========================= */
type Lang = "vi" | "en" | "fr" | "ru";

type SpotPackage = {
  name: string;
  price: number;
  description: string;
  features: string[];
  popular?: boolean;
};

type SpotData = {
  name: string;
  title: string;
  altitude: string;
  description: string;
  landscape: string;
  duration: string;
  landingPoint: string;
  basePrice: number;
  image: string;
  galleryImages: string[];
  packages: SpotPackage[];
};

type Story = {
  id: number;
  title: string;
  author: string;
  date: string;
  content: string;
  image: string;
};

/* =========================
   Helpers
========================= */
const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

type SpotKey =
  | "muong-hoa-sapa"
  | "son-tra"
  | "khau-pha"
  | "tram-tau"
  | "vien-nam"
  | "doi-bu"
  | "dalat"
  | "generic";

const resolveSpotKey = (spotName: string): SpotKey => {
  const key = normalize(spotName);
  if (/(^| )sapa( |$)/.test(key) || /muong hoa/.test(key)) return "muong-hoa-sapa";
  if (/son tra/.test(key)) return "son-tra";
  if (/khau pha/.test(key)) return "khau-pha";
  if (/tram tau/.test(key)) return "tram-tau";
  if (/vien nam/.test(key)) return "vien-nam";
  if (/doi bu/.test(key)) return "doi-bu";
  if (/da lat|dalat|langbiang|ta nung/.test(key)) return "dalat";
  return "generic";
};

/* =========================
   UI Labels i18n (không phụ thuộc context)
========================= */
const uiI18n: Record<
  Lang,
  {
    aboutTitle: string;
    galleryTitle: string;
    storyTitle: string;
    storySubtitle: string;
    quickFacts: string;
    altitude: string;
    flightTime: string;
    windDependent: string;
    feeling: string;
    smoothAir: string;
    landscapeIntro: string;
    exploreMore: string;
    exploreMoreDescription: string;
    viewAllSpots: string;
    galleryAltPrefix: string;
  }
> = {
  vi: {
    aboutTitle: "Về điểm bay này",
    galleryTitle: "Khoảnh khắc tại đây",
    storyTitle: "Câu chuyện và Trải nghiệm",
    storySubtitle: "Lắng nghe những chia sẻ đáng nhớ từ du khách",
    quickFacts: "Thông số nhanh",
    altitude: "Độ Cao Cất Cánh",
    flightTime: "Thời Gian Bay",
    windDependent: "tùy điều kiện gió",
    feeling: "Cảm Giác",
    smoothAir: "Êm ái, ổn định",
    landscapeIntro: "Cảnh quan chính:",
    exploreMore: "Khám phá thêm các điểm bay khác",
    exploreMoreDescription: "Chúng tôi còn nhiều điểm bay tuyệt đẹp khắp Việt Nam",
    viewAllSpots: "Xem tất cả điểm bay",
    galleryAltPrefix: "Ảnh thư viện",
  },
  en: {
    aboutTitle: "About this flying spot",
    galleryTitle: "Moments here",
    storyTitle: "Stories and Experiences",
    storySubtitle: "Hear memorable stories from our flyers",
    quickFacts: "Quick facts",
    altitude: "Takeoff Altitude",
    flightTime: "Flight Time",
    windDependent: "depends on wind conditions",
    feeling: "Feeling",
    smoothAir: "Smooth and stable",
    landscapeIntro: "Main landscape:",
    exploreMore: "Explore other flying spots",
    exploreMoreDescription: "We have many other beautiful flying spots across Vietnam",
    viewAllSpots: "View all flying spots",
    galleryAltPrefix: "Gallery image",
  },
  fr: {
    aboutTitle: "À propos de ce site de vol",
    galleryTitle: "Moments ici",
    storyTitle: "Histoires et Expériences",
    storySubtitle: "Écoutez les témoignages mémorables de nos passagers",
    quickFacts: "Infos rapides",
    altitude: "Altitude de décollage",
    flightTime: "Temps de vol",
    windDependent: "selon les conditions de vent",
    feeling: "Sensation",
    smoothAir: "Fluide et stable",
    landscapeIntro: "Paysage principal :",
    exploreMore: "Découvrir d'autres sites de vol",
    exploreMoreDescription: "Nous avons de nombreux autres sites magnifiques à travers le Vietnam",
    viewAllSpots: "Voir tous les sites de vol",
    galleryAltPrefix: "Image de la galerie",
  },
  ru: {
    aboutTitle: "О лётной площадке",
    galleryTitle: "Моменты здесь",
    storyTitle: "Истории и впечатления",
    storySubtitle: "Услышьте запоминающиеся отзывы наших пассажиров",
    quickFacts: "Коротко о главном",
    altitude: "Высота старта",
    flightTime: "Время полёта",
    windDependent: "зависит от ветра",
    feeling: "Ощущение",
    smoothAir: "Плавно и стабильно",
    landscapeIntro: "Основной пейзаж:",
    exploreMore: "Откройте другие лётные точки",
    exploreMoreDescription: "У нас много красивых мест для полётов по всему Вьетнаму",
    viewAllSpots: "Все лётные точки",
    galleryAltPrefix: "Изображение галереи",
  },
};

/* =========================
   Copy Spot i18n (name/title/altitude/description/landscape/duration)
========================= */
type SpotCopy = Pick<
  SpotData,
  "name" | "title" | "altitude" | "description" | "landscape" | "duration"
>;

const spotCopyI18n: Record<SpotKey, Record<Lang, SpotCopy>> = {
  "muong-hoa-sapa": {
    vi: {
      name: "Mường Hoa (Sa Pa)",
      title: "Bay Trên Thung Lũng Mường Hoa",
      altitude: "1.500 – 2.000 m",
      description:
        "Bay trên thung lũng Mường Hoa huyền ảo, ngắm ruộng bậc thang và dãy Hoàng Liên trong biển mây.",
      landscape: "Mây luồn – ruộng bậc thang – Fansipan",
      duration: "8 – 15 phút",
    },
    en: {
      name: "Muong Hoa (Sa Pa)",
      title: "Fly Over Muong Hoa Valley",
      altitude: "1,500–2,000 m",
      description:
        "Float above magical Muong Hoa Valley, with layered rice terraces and the Hoang Lien range rising through a sea of clouds.",
      landscape: "Cloud streets – rice terraces – Fansipan",
      duration: "8–15 minutes",
    },
    fr: {
      name: "Mường Hoa (Sa Pa)",
      title: "Survol de la Vallée de Mường Hoa",
      altitude: "1 500–2 000 m",
      description:
        "Planez au-dessus de la vallée féerique de Mường Hoa, ses rizières en terrasses et la chaîne Hoàng Liên émergeant d’une mer de nuages.",
      landscape: "Lignes de nuages – rizières en terrasses – Fansipan",
      duration: "8–15 minutes",
    },
    ru: {
      name: "Муонг Хоа (Са Па)",
      title: "Полёт над долиной Муонг Хоа",
      altitude: "1 500–2 000 м",
      description:
        "Парите над волшебной долиной Муонг Хоа: рисовые террасы и хребет Хоанглиен, поднимающийся из моря облаков.",
      landscape: "Облачные потоки – рисовые террасы – Фансипан",
      duration: "8–15 минут",
    },
  },
  "son-tra": {
    vi: {
      name: "Sơn Trà",
      title: "Lướt Trên Bán Đảo Sơn Trà",
      altitude: "600 – 800 m",
      description:
        "Hướng vịnh Đà Nẵng với gió biển ổn định, nhìn toàn cảnh thành phố và bãi biển.",
      landscape: "Bán đảo – đại dương – vịnh Đà Nẵng",
      duration: "8 – 15 phút",
    },
    en: {
      name: "Son Tra",
      title: "Glide Over Son Tra Peninsula",
      altitude: "600–800 m",
      description:
        "Face Da Nang Bay with steady sea breeze, taking in panoramic views of the city and coastline.",
      landscape: "Peninsula – ocean – Da Nang Bay",
      duration: "8–15 minutes",
    },
    fr: {
      name: "Sơn Trà",
      title: "Glisser au-dessus de la presqu’île de Sơn Trà",
      altitude: "600–800 m",
      description:
        "Face à la baie de Đà Nẵng, la brise marine régulière offre une vue panoramique sur la ville et le littoral.",
      landscape: "Presqu’île – océan – baie de Đà Nẵng",
      duration: "8–15 minutes",
    },
    ru: {
      name: "Шон Тра",
      title: "Полёт над полуостровом Шон Тра",
      altitude: "600–800 м",
      description:
        "Смотрим на бухту Дананга при устойчивом морском бризе — панорама города и побережья.",
      landscape: "Полуостров – океан – бухта Дананга",
      duration: "8–15 минут",
    },
  },
  "khau-pha": {
    vi: {
      name: "Đèo Khau Phạ",
      title: "Bay Trên Tứ Đại Đỉnh Đèo",
      altitude: "1.200 – 1.500 m",
      description:
        "Một trong những cung đèo đẹp nhất Việt Nam, đặc biệt rực rỡ mùa lúa chín.",
      landscape: "Đèo cao – thung lũng – mùa vàng",
      duration: "8 – 15 phút",
    },
    en: {
      name: "Khau Pha Pass",
      title: "Fly Over the Legendary Pass",
      altitude: "1,200–1,500 m",
      description:
        "One of Vietnam’s most stunning mountain passes, especially radiant during the golden rice harvest.",
      landscape: "High pass – valley – golden season",
      duration: "8–15 minutes",
    },
    fr: {
      name: "Col de Khau Phạ",
      title: "Survol du col légendaire",
      altitude: "1 200–1 500 m",
      description:
        "L’un des plus beaux cols du Vietnam, particulièrement éclatant à la saison du riz mûr.",
      landscape: "Haut col – vallée – saison dorée",
      duration: "8–15 minutes",
    },
    ru: {
      name: "Перевал Кхау Фа",
      title: "Полёт над легендарным перевалом",
      altitude: "1 200–1 500 м",
      description:
        "Один из самых красивых перевалов Вьетнама, особенно впечатляет в сезон золотых рисовых полей.",
      landscape: "Высокий перевал – долина – золотой сезон",
      duration: "8–15 минут",
    },
  },
  "tram-tau": {
    vi: {
      name: "Trạm Tấu",
      title: "Săn Mây Trên Đồi Núi Trùng Điệp",
      altitude: "1.000 – 1.500 m",
      description:
        "Không khí trong lành, cảnh quan núi non hùng vĩ, rất hợp săn mây.",
      landscape: "Săn mây – núi rừng – thung lũng",
      duration: "8 – 15 phút",
    },
    en: {
      name: "Tram Tau",
      title: "Chasing Clouds over Rolling Hills",
      altitude: "1,000–1,500 m",
      description:
        "Fresh air and majestic mountains — perfect conditions for cloud-hunting flights.",
      landscape: "Cloud-chasing – forests – valleys",
      duration: "8–15 minutes",
    },
    fr: {
      name: "Trạm Tấu",
      title: "Chasse aux nuages au-dessus des collines",
      altitude: "1 000–1 500 m",
      description:
        "Air pur et montagnes majestueuses — conditions idéales pour « chasser les nuages ».",
      landscape: "Chasse aux nuages – forêts – vallées",
      duration: "8–15 minutes",
    },
    ru: {
      name: "Чыам Тау (Trạm Tấu)",
      title: "Охота за облаками над холмами",
      altitude: "1 000–1 500 м",
      description:
        "Свежий воздух и величественные горы — идеальные условия для «охоты за облаками».",
      landscape: "Облака – леса – долины",
      duration: "8–15 минут",
    },
  },
  "vien-nam": {
    vi: {
      name: "Viên Nam",
      title: "Điểm Bay Gần Hà Nội",
      altitude: "600 – 1000 m",
      description:
        "Phù hợp luyện tập, di chuyển thuận tiện từ trung tâm Hà Nội.",
      landscape: "Đồi núi – gần Hà Nội",
      duration: "10 – 20 phút",
    },
    en: {
      name: "Vien Nam",
      title: "Closest Flying Spot to Hanoi",
      altitude: "600–1000 m",
      description:
        "Great for practice with convenient access from central Hanoi.",
      landscape: "Hills – near Hanoi",
      duration: "10–20 minutes",
    },
    fr: {
      name: "Viên Nam",
      title: "Site de vol proche de Hanoï",
      altitude: "600–1000 m",
      description:
        "Idéal pour s’entraîner, accès pratique depuis le centre de Hanoï.",
      landscape: "Collines – proche de Hanoï",
      duration: "10–20 minutes",
    },
    ru: {
      name: "Вьен Нам",
      title: "Площадка рядом с Ханоем",
      altitude: "600–1000 м",
      description:
        "Подходит для тренировок, удобно добираться из центра Ханоя.",
      landscape: "Холмы – рядом с Ханоем",
      duration: "10–20 минут",
    },
  },
  "doi-bu": {
    vi: {
      name: "Đồi Bù",
      title: "Điểm Bay Phổ Biến Cuối Tuần",
      altitude: "600 – 900 m",
      description:
        "Gần Hà Nội, dễ tiếp cận, phù hợp cho người mới trải nghiệm.",
      landscape: "Đồi núi – thuận tiện – dễ tiếp cận",
      duration: "10 – 20 phút",
    },
    en: {
      name: "Doi Bu",
      title: "Popular Weekend Flying Spot",
      altitude: "600–900 m",
      description:
        "Close to Hanoi and easy to access — perfect for first-timers.",
      landscape: "Hills – convenient – accessible",
      duration: "10–20 minutes",
    },
    fr: {
      name: "Đồi Bù",
      title: "Site de vol prisé le week-end",
      altitude: "600–900 m",
      description:
        "Proche de Hanoï et facile d’accès — idéal pour une première expérience.",
      landscape: "Collines – pratique – accessible",
      duration: "10–20 minutes",
    },
    ru: {
      name: "Дой Бу",
      title: "Популярная точка на выходных",
      altitude: "600–900 м",
      description:
        "Близко к Ханою и удобно добираться — отлично для новичков.",
      landscape: "Холмы – удобно – доступно",
      duration: "10–20 минут",
    },
  },
  dalat: {
    vi: {
      name: "Đà Lạt",
      title: "Chạm vào bầu trời mộng mơ",
      altitude: "1.400 m",
      description:
        "Bay giữa thành phố ngàn hoa, đón gió se lạnh và ngắm cảnh lãng mạn. Tà Nung – rừng thông – sương mù – hoa dã quỳ tạo nên khung cảnh tuyệt đẹp.",
      landscape: "Thung lũng Tà Nung – rừng thông – sương mù",
      duration: "10–20 phút",
    },
    en: {
      name: "Da Lat",
      title: "Touch the Dreamy Sky",
      altitude: "1,400 m",
      description:
        "Soar above the city of flowers in cool mountain breeze. Ta Nung valley, pine forests and mist paint a romantic scene.",
      landscape: "Ta Nung valley – pine forests – mist",
      duration: "10–20 minutes",
    },
    fr: {
      name: "Đà Lạt",
      title: "Toucher le ciel rêveur",
      altitude: "1 400 m",
      description:
        "Survolez la « ville des fleurs » dans une brise montagnarde fraîche. Vallée de Tà Nung, forêts de pins et brume composent un décor romantique.",
      landscape: "Vallée de Tà Nung – forêts de pins – brume",
      duration: "10–20 minutes",
    },
    ru: {
      name: "Далат",
      title: "Касаясь мечтательного неба",
      altitude: "1 400 м",
      description:
        "Летайте над «городом цветов» в прохладном горном бризе. Долина Та Нунг, сосновые леса и туман создают романтичные виды.",
      landscape: "Долина Та Нунг – сосновые леса – туман",
      duration: "10–20 минут",
    },
  },
  generic: {
    vi: {
      name: "Điểm bay",
      title: "Trải nghiệm bay tuyệt vời",
      altitude: "—",
      description: "Một hành trình ngắm cảnh từ trên cao đầy cảm hứng.",
      landscape: "Núi đồi – thung lũng – mây trời",
      duration: "—",
    },
    en: {
      name: "Flying spot",
      title: "A Wonderful Flight Experience",
      altitude: "—",
      description: "An inspiring sightseeing journey from above.",
      landscape: "Mountains – valleys – sky",
      duration: "—",
    },
    fr: {
      name: "Site de vol",
      title: "Une expérience de vol magnifique",
      altitude: "—",
      description: "Un voyage panoramique inspirant depuis le ciel.",
      landscape: "Montagnes – vallées – ciel",
      duration: "—",
    },
    ru: {
      name: "Лётная точка",
      title: "Замечательный полёт",
      altitude: "—",
      description: "Вдохновляющее путешествие над прекрасными пейзажами.",
      landscape: "Горы – долины – небо",
      duration: "—",
    },
  },
};

const getSpotCopy = (spot: SpotData, lang: Lang): SpotCopy => {
  const key = resolveSpotKey(spot.name);
  return spotCopyI18n[key][lang];
};

/* =========================
   Stories i18n
========================= */
type StoryBase = Omit<Story, "image">;
const storiesI18n: Record<SpotKey, Record<Lang, StoryBase[]>> = {
  "muong-hoa-sapa": {
    vi: [
      {
        id: 1,
        title: "Bay trên thung lũng Mường Hoa",
        author: "Louis Dubois",
        date: "20/03/2025",
        content:
          "Đường bay ôm thung lũng Mường Hoa, ruộng bậc thang xếp lớp và Fansipan sừng sững phía xa. Lên cao là chạm tầng mây mỏng — rất 'Sapa'.",
      },
      {
        id: 2,
        title: "Sương muối & ánh nắng",
        author: "Kiều Công Đức Huy",
        date: "12/12/2024",
        content:
          "Sáng sớm lạnh tê nhưng gió êm. Khi mặt trời ló, sương tan để lộ bản làng và ruộng bậc thang lấp lánh.",
      },
      {
        id: 3,
        title: "Hạ cánh ở Mường Hoa",
        author: "Trần Kinh Khánh",
        date: "25/04/2025",
        content:
          "Hạ cánh giữa đồng lúa đang thì con gái, trẻ nhỏ chạy ra vẫy tay — kỷ niệm rất đáng nhớ.",
      },
    ],
    en: [
      {
        id: 1,
        title: "Flying over Muong Hoa Valley",
        author: "Nguyen Trung Hieu",
        date: "2025-03-20",
        content:
          "The flight traces Muong Hoa Valley with layered terraces and Fansipan towering in the distance. Higher up we skim a thin cloud layer — pure Sa Pa.",
      },
      {
        id: 2,
        title: "Frost and sunshine",
        author: "Tran Bao Ngoc",
        date: "2024-12-12",
        content:
          "A biting cold morning but smooth air. As the sun rose, the frost melted to reveal sparkling villages and terraces.",
      },
      {
        id: 3,
        title: "Touchdown in Muong Hoa",
        author: "Doan Van Son",
        date: "2025-04-25",
        content:
          "Landing amid young rice fields, kids ran over waving — an unforgettable memory.",
      },
    ],
    fr: [
      {
        id: 1,
        title: "Au-dessus de la vallée de Mường Hoa",
        author: "Nguyễn Trung Hiếu",
        date: "20/03/2025",
        content:
          "La trajectoire longe la vallée, rizières en terrasses et Fansipan au loin. Plus haut, on frôle une fine couche de nuages — tout l’esprit de Sa Pa.",
      },
      {
        id: 2,
        title: "Givre et rayon de soleil",
        author: "Trần Bảo Ngọc",
        date: "12/12/2024",
        content:
          "Matin mordant mais air stable. Quand le soleil perce, le givre fond et révèle villages et terrasses scintillants.",
      },
      {
        id: 3,
        title: "Atterrissage à Mường Hoa",
        author: "Đoàn Văn Sơn",
        date: "25/04/2025",
        content:
          "Posé au milieu des jeunes rizières, des enfants accourent en faisant signe — souvenir inoubliable.",
      },
    ],
    ru: [
      {
        id: 1,
        title: "Над долиной Муонг Хоа",
        author: "Нгуен Трунг Хьеу",
        date: "20.03.2025",
        content:
          "Маршрут огибает долину: террасы риса и Фансипан вдалеке. Выше касаемся тонкой облачной прослойки — весь дух Са Па.",
      },
      {
        id: 2,
        title: "Иней и солнечные лучи",
        author: "Чан Бао Нгок",
        date: "12.12.2024",
        content:
          "Колкий морозец, но ровный воздух. С восходом иней тает, открывая сияющие деревни и террасы.",
      },
      {
        id: 3,
        title: "Посадка в Муонг Хоа",
        author: "Доан Ван Сон",
        date: "25.04.2025",
        content:
          "Приземлились среди молодых рисовых полей; дети подбежали, машут руками — незабываемо.",
      },
    ],
  },
  "son-tra": {
    vi: [
      {
        id: 1,
        title: "Một bên rừng, một bên biển",
        author: "Lê Ngọc Ánh",
        date: "05/06/2025",
        content:
          "Từ sườn núi Sơn Trà phóng ra: trái là rừng, phải là biển xanh. Hạ cánh sát bãi cát mịn, quá đã.",
      },
      {
        id: 2,
        title: "Đà Nẵng từ trên cao",
        author: "Võ Quang Huy",
        date: "12/07/2025",
        content:
          "Thấy trọn cầu Rồng và dải Mỹ Khê cong mềm. Gió biển đều giúp chuyến bay êm và dài.",
      },
      {
        id: 3,
        title: "Gió biển ổn định",
        author: "Phan Thị Mai",
        date: "28/06/2025",
        content:
          "Ngày gió đẹp mình được thử kéo toggles nhẹ — video selfie nền biển xanh ngọc bích siêu 'đỉnh'.",
      },
    ],
    en: [
      {
        id: 1,
        title: "Forest on one side, sea on the other",
        author: "Le Ngoc Anh",
        date: "2025-06-05",
        content:
          "Launching from Son Tra’s slopes: forest to the left, turquoise sea to the right. Landing right by the fine sandy beach — bliss.",
      },
      {
        id: 2,
        title: "Da Nang from above",
        author: "Vo Quang Huy",
        date: "2025-07-12",
        content:
          "The Dragon Bridge and the soft curve of My Khe came into full view. The steady sea breeze made for long, smooth flight.",
      },
      {
        id: 3,
        title: "Steady sea breeze",
        author: "Phan Thi Mai",
        date: "2025-06-28",
        content:
          "With perfect wind I tried gentle toggle inputs — a selfie video with jade-green sea in the background was epic.",
      },
    ],
    fr: [
      {
        id: 1,
        title: "La forêt d’un côté, la mer de l’autre",
        author: "Lê Ngọc Ánh",
        date: "05/06/2025",
        content:
          "Décollage des pentes de Sơn Trà : forêt à gauche, mer turquoise à droite. Atterrissage au bord du sable fin — le bonheur.",
      },
      {
        id: 2,
        title: "Đà Nẵng vue du ciel",
        author: "Võ Quang Huy",
        date: "12/07/2025",
        content:
          "Le pont du Dragon et la courbe douce de Mỹ Khê se dévoilent. La brise marine régulière allonge le vol tout en douceur.",
      },
      {
        id: 3,
        title: "Brise marine régulière",
        author: "Phan Thị Mai",
        date: "28/06/2025",
        content:
          "Par vent parfait, j’ai tenté de légères actions aux commandes — vidéo selfie avec la mer vert-jade en arrière-plan, épique.",
      },
    ],
    ru: [
      {
        id: 1,
        title: "Слева лес, справа море",
        author: "Ле Нгок Ань",
        date: "05.06.2025",
        content:
          "Старт со склонов Шон Тра: слева лес, справа бирюзовое море. Посадка у самой кромки мягкого песка — кайф.",
      },
      {
        id: 2,
        title: "Дананг с высоты",
        author: "Во Куанг Хюи",
        date: "12.07.2025",
        content:
          "Мост Дракона и мягкая дуга Ми Кхе видны целиком. Ровный морской бриз дал длинный и плавный полёт.",
      },
      {
        id: 3,
        title: "Стабильный морской бриз",
        author: "Фан Тхи Май",
        date: "28.06.2025",
        content:
          "В идеальный ветер я попробовал лёгкие движения строп — селфи-видео с нефритовым морем получилось бомбическим.",
      },
    ],
  },
  "khau-pha": {
    vi: [
      {
        id: 1,
        title: "Đèo Khau Phạ hùng vĩ",
        author: "Ngô Văn Phát",
        date: "10/09/2025",
        content:
          "Chênh cao lớn, lift tốt. Thung lũng Mù Cang Chải vàng rực ngay dưới chân — phấn khích tột độ.",
      },
      {
        id: 2,
        title: "Mùa lúa chín",
        author: "Hoàng Minh Tuấn",
        date: "01/10/2025",
        content:
          "Cả thung lũng thành tấm thảm vàng khổng lồ. Bay xong chỉ muốn vòng thêm nữa.",
      },
      {
        id: 3,
        title: "Nhìn từ đèo về thung lũng",
        author: "Phạm Thuỷ Tiên",
        date: "18/10/2025",
        content:
          "Điểm cất cánh thoáng, gió chuẩn; đội hỗ trợ chuyên nghiệp, lên là bay ngay.",
      },
    ],
    en: [
      {
        id: 1,
        title: "Majestic Khau Pha Pass",
        author: "Ngo Van Phat",
        date: "2025-09-10",
        content:
          "Big height difference and solid lift. Mu Cang Chai Valley glowed golden below — pure exhilaration.",
      },
      {
        id: 2,
        title: "Harvest season",
        author: "Hoang Minh Tuan",
        date: "2025-10-01",
        content:
          "The entire valley turned into a giant golden carpet. After landing I just wanted to go again.",
      },
      {
        id: 3,
        title: "From the pass down to the valley",
        author: "Pham Thuy Tien",
        date: "2025-10-18",
        content:
          "A clear takeoff and clean wind; the ground crew was pro — up and flying in no time.",
      },
    ],
    fr: [
      {
        id: 1,
        title: "Le col de Khau Phạ, grandiose",
        author: "Ngô Văn Phát",
        date: "10/09/2025",
        content:
          "Grand dénivelé, portance solide. La vallée de Mù Cang Chải dorée à nos pieds — excitation totale.",
      },
      {
        id: 2,
        title: "Saison des moissons",
        author: "Hoàng Minh Tuấn",
        date: "01/10/2025",
        content:
          "Toute la vallée devient un immense tapis doré. Une fois posé, on n’a qu’une envie : repartir.",
      },
      {
        id: 3,
        title: "Du col jusqu’à la vallée",
        author: "Phạm Thuỷ Tiên",
        date: "18/10/2025",
        content:
          "Décollage dégagé, vent propre ; équipe au sol pro — en l’air en un rien de temps.",
      },
    ],
    ru: [
      {
        id: 1,
        title: "Величественный перевал Кхау Фа",
        author: "Нго Ван Фат",
        date: "10.09.2025",
        content:
          "Большой перепад высот и уверенный подъём. Внизу сияет золотая долина Му Канг Чай — чистый восторг.",
      },
      {
        id: 2,
        title: "Сезон урожая",
        author: "Хоанг Минь Туан",
        date: "01.10.2025",
        content:
          "Вся долина — словно гигантский золотой ковер. После посадки хотелось взлететь снова.",
      },
      {
        id: 3,
        title: "С перевала в долину",
        author: "Фам Тхи Тьен",
        date: "18.10.2025",
        content:
          "Чистая площадка и правильный ветер; наземная команда — профи. Взлетели моментально.",
      },
    ],
  },
  "tram-tau": {
    vi: [
      {
        id: 1,
        title: "Yên bình Trạm Tấu",
        author: "Đinh Thị Quỳnh",
        date: "15/10/2025",
        content:
          "Gió nhẹ, không gian rộng. Lượn trên cánh đồng và suối nước nóng — đúng chất thư giãn cuối tuần.",
      },
      {
        id: 2,
        title: "Mây lững lờ",
        author: "Lê Thị Mai Linh",
        date: "22/04/2025",
        content:
          "Độ cao vừa phải, hợp người mới. Có lúc lướt qua tầng mây mỏng, cảnh ôm sườn núi đẹp bất ngờ.",
      },
      {
        id: 3,
        title: "Hạ cánh êm như nhung",
        author: "Nguyễn Minh Châu",
        date: "03/05/2025",
        content:
          "Bãi hạ cánh rộng, gió đều nên touchdown rất mượt. Team quay/chụp nhiệt tình.",
      },
    ],
    en: [
      {
        id: 1,
        title: "Tram Tau serenity",
        author: "Dinh Thi Quynh",
        date: "2025-10-15",
        content:
          "Light wind and wide airspace. We cruised over fields and hot springs — perfect weekend unwind.",
      },
      {
        id: 2,
        title: "Clouds drifting by",
        author: "Vu Hai Long",
        date: "2025-04-22",
        content:
          "Comfortable height, beginner-friendly. Sometimes we brushed a thin cloud layer hugging the ridge — unexpectedly beautiful.",
      },
      {
        id: 3,
        title: "Velvet-soft landing",
        author: "Nguyen Minh Chau",
        date: "2025-05-03",
        content:
          "A broad LZ with steady wind made for a silky touchdown. The photo/video crew was super helpful.",
      },
    ],
    fr: [
      {
        id: 1,
        title: "La quiétude de Trạm Tấu",
        author: "Đinh Thị Quỳnh",
        date: "15/10/2025",
        content:
          "Vent léger et espace aérien large. On survole champs et sources chaudes — détente parfaite du week-end.",
      },
      {
        id: 2,
        title: "Nuages à la dérive",
        author: "Vũ Hải Long",
        date: "22/04/2025",
        content:
          "Altitude confortable, adapté aux débutants. Par moments on frôle une fine couche nuageuse sur l’arête — superbe.",
      },
      {
        id: 3,
        title: "Atterrissage velouté",
        author: "Nguyễn Minh Châu",
        date: "03/05/2025",
        content:
          "Grande zone d’atterrissage et vent régulier pour une pose toute en douceur. L’équipe photo/vidéo aux petits soins.",
      },
    ],
    ru: [
      {
        id: 1,
        title: "Спокойный Чыам Тау",
        author: "Динь Тхи Куинь",
        date: "15.10.2025",
        content:
          "Лёгкий ветер и широкое воздушное пространство. Парили над полями и горячими источниками — идеальный уик-энд.",
      },
      {
        id: 2,
        title: "Плывущие облака",
        author: "Ву Хай Лонг",
        date: "22.04.2025",
        content:
          "Комфортная высота, подходит новичкам. Местами касались тонкой облачной дымки вдоль хребта — неожиданно красиво.",
      },
      {
        id: 3,
        title: "Мягкая, как бархат, посадка",
        author: "Нгуен Минь Чау",
        date: "03.05.2025",
        content:
          "Широкая площадка и ровный ветер — посадка как по маслу. Фото/видео-команда очень помогла.",
      },
    ],
  },
  "vien-nam": {
    vi: [
      {
        id: 1,
        title: "Thung lũng Viên Nam",
        author: "Phan Minh Ngọc",
        date: "09/06/2025",
        content:
          "Launch nhìn xuống thung lũng xanh mướt, dải núi nối nhau đã mắt. Ngày mình đi gió sạch và ổn định.",
      },
      {
        id: 2,
        title: "Đi gần Hà Nội",
        author: "Phạm Thu Huyền",
        date: "21/06/2025",
        content:
          "Sáng xuất phát Hà Nội, 1–1.5 giờ là tới. Bay xong vẫn kịp về ăn trưa — quá tiện!",
      },
      {
        id: 3,
        title: "Đồi thông & gió laminar",
        author: "Đỗ Bảo Quyên",
        date: "02/07/2025",
        content:
          "Ngày gió nam lift bền, treo lâu trên sườn — hợp luyện cảm giác cho người mới.",
      },
    ],
    en: [
      {
        id: 1,
        title: "Vien Nam valley",
        author: "Bui Duc Manh",
        date: "2025-06-09",
        content:
          "From launch you look down a lush green valley and endless ridges. Clean, steady wind on our day.",
      },
      {
        id: 2,
        title: "So close to Hanoi",
        author: "Pham Thu Huyen",
        date: "2025-06-21",
        content:
          "Left Hanoi in the morning; 1–1.5 hours and we were there. Still made it back for lunch — super convenient!",
      },
      {
        id: 3,
        title: "Pine hills & laminar air",
        author: "Hoang Nhat Tan",
        date: "2025-07-02",
        content:
          "With southerly wind the lift was consistent; we ridge-soared for ages — great feel training for beginners.",
      },
    ],
    fr: [
      {
        id: 1,
        title: "Vallée de Viên Nam",
        author: "Bùi Đức Mạnh",
        date: "09/06/2025",
        content:
          "Au déco, on domine une vallée d’un vert intense et des crêtes à perte de vue. Vent propre et régulier ce jour-là.",
      },
      {
        id: 2,
        title: "Si proche de Hanoï",
        author: "Phạm Thu Huyền",
        date: "21/06/2025",
        content:
          "Départ de Hanoï le matin ; 1–1,5 h plus tard on y est. Retour pour déjeuner — ultra pratique !",
      },
      {
        id: 3,
        title: "Collines de pins & air laminaire",
        author: "Hoàng Nhật Tân",
        date: "02/07/2025",
        content:
          "Par vent de sud, la portance reste constante ; on tient longtemps en vol de pente — parfait pour le ressenti des débutants.",
      },
    ],
    ru: [
      {
        id: 1,
        title: "Долина Вьен Нам",
        author: "Буй Дык Мань",
        date: "09.06.2025",
        content:
          "Со старта видно изумрудную долину и бесконечные гряды холмов. В тот день ветер был чистый и стабильный.",
      },
      {
        id: 2,
        title: "Близко к Ханою",
        author: "Фам Тху Хуен",
        date: "21.06.2025",
        content:
          "Выезжаем из Ханоя утром: через 1–1,5 часа на месте. Успели вернуться к обеду — очень удобно!",
      },
      {
        id: 3,
        title: "Сосновые холмы и ламинарный воздух",
        author: "Хоанг Нят Тан",
        date: "02.07.2025",
        content:
          "При южном ветре подъём ровный; парили на склоне долго — отличная тренировка ощущений для новичков.",
      },
    ],
  },
  "doi-bu": {
    vi: [
      {
        id: 1,
        title: "Chuyến bay đầu đời",
        author: "Phạm Khánh Linh",
        date: "15/05/2025",
        content:
          "Đồi Bù là 'địa điểm nhập môn' tuyệt vời: đường vào dễ, bãi hạ cánh rộng, đội ngũ đông. Cảm giác cất cánh lần đầu khó quên.",
      },
      {
        id: 2,
        title: "Hoàng hôn ngoại thành",
        author: "Trịnh Mỹ Dung",
        date: "30/06/2025",
        content:
          "Chiều muộn gió mát, bầu trời chuyển cam. Lơ lửng nhìn hồ và cánh đồng vùng Xuân Sơn đẹp mê ly.",
      },
      {
        id: 3,
        title: "Gần mà chất",
        author: "Nguyễn Huyền Trang",
        date: "01/09/2025",
        content:
          "Từ nội thành chạy hơn tiếng là tới. Gần Hà Nội nhưng cảnh đồi núi thoáng đãng, bay xong còn kịp cafe view hồ.",
      },
    ],
    en: [
      {
        id: 1,
        title: "First-ever flight",
        author: "Pham Khanh Linh",
        date: "2025-05-15",
        content:
          "Doi Bu is the perfect entry point: easy access, large LZ and big crew. That first takeoff feeling is unforgettable.",
      },
      {
        id: 2,
        title: "Suburban sunset",
        author: "Trinh My Dung",
        date: "2025-06-30",
        content:
          "Cool evening wind and an orange sky. Hovering over lakes and fields around Xuan Son felt magical.",
      },
      {
        id: 3,
        title: "Close yet impressive",
        author: "Nguyen Huyen Trang",
        date: "2025-09-01",
        content:
          "Just over an hour from downtown. Close to Hanoi yet open hilly views — even time for a lakeside coffee after.",
      },
    ],
    fr: [
      {
        id: 1,
        title: "Premier vol de ma vie",
        author: "Phạm Khánh Linh",
        date: "15/05/2025",
        content:
          "Đồi Bù est parfait pour débuter : accès facile, grande zone d’atterrissage et équipe nombreuse. Le premier décollage, inoubliable.",
      },
      {
        id: 2,
        title: "Coucher de soleil en périphérie",
        author: "Trịnh Mỹ Dung",
        date: "30/06/2025",
        content:
          "Brise du soir et ciel orangé. En vol stationnaire au-dessus des lacs et champs de Xuân Sơn — magique.",
      },
      {
        id: 3,
        title: "Proche mais bluffant",
        author: "Nguyễn Huyền Trang",
        date: "01/09/2025",
        content:
          "À un peu plus d’une heure du centre. Proche de Hanoï mais vue dégagée sur les collines — café au bord du lac après le vol !",
      },
    ],
    ru: [
      {
        id: 1,
        title: "Первый полёт в жизни",
        author: "Фам Кхан Линь",
        date: "15.05.2025",
        content:
          "Дой Бу — идеальное место для старта: удобный подъезд, широкая площадка и большая команда. Первое отрывание от земли — незабываемо.",
      },
      {
        id: 2,
        title: "Пригородный закат",
        author: "Чинь Ми Зунг",
        date: "30.06.2025",
        content:
          "Прохладный вечерний ветер и оранжевое небо. Парение над озёрами и полями района Суан Шон — чистая магия.",
      },
      {
        id: 3,
        title: "Близко, но впечатляет",
        author: "Нгуен Хуен Чанг",
        date: "01.09.2025",
        content:
          "Чуть больше часа от центра. Близко к Ханою, но виды на холмы открытые — после полёта успели на кофе у озера.",
      },
    ],
  },
  dalat: {
    vi: [
      {
        id: 1,
        title: "Sớm mai ở Đà Lạt",
        author: "Phạm Gia Huy",
        date: "04/04/2025",
        content:
          "Sương còn giăng mặt hồ, gió mát rượi. Bay qua rừng thông nghe mùi nhựa gỗ, nhìn phố phường thức dậy.",
      },
      {
        id: 2,
        title: "Tà Nung mộng mơ",
        author: "Lưu Bảo Trâm",
        date: "10/07/2025",
        content:
          "Thung lũng Tà Nung như bức tranh — mây lững lờ, nắng rải vàng trên đồi chè.",
      },
      {
        id: 3,
        title: "Chạm mây Langbiang",
        author: "Đặng Hoài An",
        date: "19/08/2025",
        content:
          "Vệt mây lùa qua sống núi, cánh dù trôi êm như lụa. Đà Lạt đúng là thành phố của cảm hứng.",
      },
    ],
    en: [
      {
        id: 1,
        title: "Early morning in Da Lat",
        author: "Pham Gia Huy",
        date: "2025-04-04",
        content:
          "Mist hugged the lake and the breeze was crisp. Gliding past pine forests with a resin scent as the town woke up.",
      },
      {
        id: 2,
        title: "Dreamy Ta Nung",
        author: "Luu Bao Tram",
        date: "2025-07-10",
        content:
          "Ta Nung valley looked like a painting — drifting clouds and sunlight sprinkled over tea hills.",
      },
      {
        id: 3,
        title: "Brushing Langbiang’s clouds",
        author: "Dang Hoai An",
        date: "2025-08-19",
        content:
          "Cloud bands spilled over the ridge while the wing floated like silk. Da Lat truly fuels inspiration.",
      },
    ],
    fr: [
      {
        id: 1,
        title: "Tôt le matin à Đà Lạt",
        author: "Phạm Gia Huy",
        date: "04/04/2025",
        content:
          "La brume ceint le lac, l’air est vif. On glisse près des pins au parfum de résine, la ville s’éveille.",
      },
      {
        id: 2,
        title: "Tà Nung, tout en rêverie",
        author: "Lưu Bảo Trâm",
        date: "10/07/2025",
        content:
          "La vallée de Tà Nung ressemble à un tableau — nuages flâneurs et soleil sur les collines de thé.",
      },
      {
        id: 3,
        title: "Effleurer les nuages de Langbiang",
        author: "Đặng Hoài An",
        date: "19/08/2025",
        content:
          "Des rubans de nuages franchissent l’arête, l’aile file comme de la soie. Đà Lạt est une source d’inspiration.",
      },
    ],
    ru: [
      {
        id: 1,
        title: "Раннее утро в Далате",
        author: "Фам Зя Хуи",
        date: "04.04.2025",
        content:
          "Туман обнимает озеро, свежий ветер. Скользим вдоль сосновых лесов с ароматом смолы, город просыпается.",
      },
      {
        id: 2,
        title: "Мечтательный Та Нунг",
        author: "Лыу Бао Трам",
        date: "10.07.2025",
        content:
          "Долина Та Нунг — как картина: плывущие облака и солнечные блики на чайных холмах.",
      },
      {
        id: 3,
        title: "Задевая облака Лангбианга",
        author: "Данг Хоай Ан",
        date: "19.08.2025",
        content:
          "Полосы облаков переливаются через хребет, крыло плывёт как шёлк. Далат действительно вдохновляет.",
      },
    ],
  },
  generic: {
    vi: [
      {
        id: 1,
        title: "Khoảnh khắc đáng nhớ",
        author: "Lê Thị Ánh Tuyết",
        date: "—",
        content:
          "Một vài khoảnh khắc đẹp từ chuyến bay gần đây. Tận hưởng gió và cảnh quan tuyệt vời từ trên cao!",
      },
      {
        id: 2,
        title: "Gió đẹp, bay mượt",
        author: "Lê Thị Linh Đan",
        date: "—",
        content:
          "Điều kiện gió ổn định giúp chuyến bay êm ái và an toàn — thích hợp cả cho người mới.",
      },
      {
        id: 3,
        title: "Hạ cánh an toàn",
        author: "Đặng Đình Minh",
        date: "—",
        content:
          "Kết thúc hành trình bằng một cú touchdown mượt mà, lưu lại kỷ niệm bằng ảnh và video.",
      },
    ],
    en: [
      {
        id: 1,
        title: "Memorable moments",
        author: "Mebayluon Team",
        date: "—",
        content:
          "A few beautiful frames from recent flights. Enjoy the wind and breathtaking views from above!",
      },
      {
        id: 2,
        title: "Good wind, silky flight",
        author: "Mebayluon Team",
        date: "—",
        content:
          "Steady conditions make flights smooth and safe — great for first-timers, too.",
      },
      {
        id: 3,
        title: "Safe touchdown",
        author: "Mebayluon Team",
        date: "—",
        content:
          "Wrap the journey with a smooth landing and capture memories with photos and video.",
      },
    ],
    fr: [
      {
        id: 1,
        title: "Moments mémorables",
        author: "Équipe Mebayluon",
        date: "—",
        content:
          "Quelques beaux instants de vols récents. Profitez du vent et des vues splendides depuis le ciel !",
      },
      {
        id: 2,
        title: "Beau vent, vol soyeux",
        author: "Équipe Mebayluon",
        date: "—",
        content:
          "Des conditions régulières pour un vol doux et sûr — idéal aussi pour une première.",
      },
      {
        id: 3,
        title: "Atterrissage en douceur",
        author: "Équipe Mebayluon",
        date: "—",
        content:
          "On termine par une pose fluide et on garde le souvenir en photo et vidéo.",
      },
    ],
    ru: [
      {
        id: 1,
        title: "Памятные моменты",
        author: "Команда Mebayluon",
        date: "—",
        content:
          "Несколько красивых кадров с недавних полётов. Наслаждайтесь ветром и видами с высоты!",
      },
      {
        id: 2,
        title: "Хороший ветер — мягкий полёт",
        author: "Команда Mebayluon",
        date: "—",
        content:
          "Стабильные условия делают полёт плавным и безопасным — отлично и для новичков.",
      },
      {
        id: 3,
        title: "Мягкая посадка",
        author: "Команда Mebayluon",
        date: "—",
        content:
          "Завершаем путешествие мягким касанием и сохраняем воспоминания на фото и видео.",
      },
    ],
  },
};

const getStories = (spot: SpotData, lang: Lang): Story[] => {
  const key = resolveSpotKey(spot.name);
  const baseList = storiesI18n[key][lang] ?? storiesI18n["generic"][lang];
  const img = (i: number, fallback: string) => spot.galleryImages[i] ?? fallback;

  return baseList.map((s, i) => {
    const fallbackByKey =
      key === "muong-hoa-sapa"
        ? `/placeholder-sapa-${i + 1}.jpg`
        : key === "son-tra"
        ? `/placeholder-son-tra-${i + 1}.jpg`
        : key === "khau-pha"
        ? `/placeholder-khau-pha-${i + 1}.jpg`
        : key === "tram-tau"
        ? `/placeholder-tram-tau-${i + 1}.jpg`
        : key === "vien-nam"
        ? `/placeholder-vien-nam-${i + 1}.jpg`
        : key === "doi-bu"
        ? `/placeholder-doi-bu-${i + 1}.jpg`
        : `/placeholder-generic-${i + 1}.jpg`;

    return {
      ...s,
      image: img(i, fallbackByKey),
    };
  });
};

/* =========================
   Component
========================= */
export function SpotDetailClient({ spot }: { spot: SpotData }) {
  const { language } = useLanguage();
  const lang: Lang = (language as Lang) ?? "vi";
  const ui = uiI18n[lang];

  const copy = getSpotCopy(spot, lang);
  const stories = getStories(spot, lang);

  return (
    <main
      className="min-h-screen relative bg-cover bg-center bg-fixed text-white"
      style={{ backgroundImage: `url(${spot.image})` }}
    >
      <div className="absolute inset-0 bg-black/40 z-0" />

      {/* Hero */}
      <section className="relative h-[70vh] flex items-center justify-center -mt-16 z-10">
        <motion.div
          className="relative z-10 container mx-auto px-4 text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          style={{ textShadow: "1px 1px 4px rgba(0,0,0,0.8)" }}
        >
          <Badge className="mb-4 text-base px-4 py-1.5 bg-accent/80 backdrop-blur-sm border border-white/20">
            {copy.name}
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 font-serif">
            {copy.title}
          </h1>
          <p className="text-xl md:text-2xl mb-4 max-w-3xl mx-auto text-slate-200">
            {copy.landscape}
          </p>
          <div className="flex items-center justify-center gap-6 text-lg text-slate-100">
            <div className="flex items-center gap-2">
              <Mountain size={20} />
              <span>{copy.altitude}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={20} />
              <span>{copy.duration}</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Description */}
      <section className="relative z-10 py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-6xl mx-auto p-8 md:p-12 bg-black/20 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg"
          >
            <div className="grid lg:grid-cols-3 gap-10">
              {/* Col 1-2 */}
              <div className="lg:col-span-2 space-y-6 border-b lg:border-b-0 lg:border-r border-white/20 lg:pr-10 pb-8 lg:pb-0">
                <h2 className="text-4xl font-bold font-serif text-white">
                  {ui.aboutTitle}
                </h2>
                <p className="text-lg text-slate-200 leading-relaxed">
                  {copy.description}
                </p>
                <p className="text-md text-slate-300 italic">
                  {ui.landscapeIntro}{" "}
                  <span className="font-semibold">{copy.landscape}</span>
                </p>
              </div>

              {/* Col 3 - Quick facts */}
              <div className="lg:col-span-1 space-y-6 pt-6 lg:pt-0">
                <h3 className="text-2xl font-semibold mb-4 border-b border-white/20 pb-2">
                  {ui.quickFacts}
                </h3>

                <motion.div
                  whileHover={{ x: 5 }}
                  className="flex items-center gap-4 transition-transform duration-300"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                    <Mountain className="text-accent" size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">{ui.altitude}</h4>
                    <p className="text-slate-200 font-bold">{copy.altitude}</p>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ x: 5 }}
                  className="flex items-center gap-4 transition-transform duration-300"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Clock className="text-green-400" size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">{ui.flightTime}</h4>
                    <p className="text-slate-200 font-bold">{copy.duration}</p>
                    <p className="text-xs text-slate-400">({ui.windDependent})</p>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ x: 5 }}
                  className="flex items-center gap-4 transition-transform duration-300"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-sky-500/20 flex items-center justify-center">
                    <Feather className="text-sky-400" size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">{ui.feeling}</h4>
                    <p className="text-slate-200 font-bold">{ui.smoothAir}</p>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Gallery */}
      {spot.galleryImages && spot.galleryImages.length > 0 && (
        <section className="relative z-10 py-16">
          <div className="container mx-auto px-4 max-w-7xl">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl font-bold font-serif mb-12 text-center text-white"
            >
              {ui.galleryTitle}
            </motion.h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {spot.galleryImages.map((src, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="group relative aspect-[4/3] w-full rounded-2xl overflow-hidden shadow-xl border border-white/20"
                >
                  <Image
                    src={src}
                    alt={`${ui.galleryAltPrefix} ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Stories */}
      <section className="relative z-10 py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold mb-4 font-serif text-white">
              {ui.storyTitle}
            </h2>
            <p className="text-lg text-slate-200">{ui.storySubtitle}</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {stories.map((story, index) => (
              <motion.div
                key={story.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.03 }}
                className="group relative h-full bg-black/20 backdrop-blur-lg border border-white/20 text-white rounded-2xl shadow-lg overflow-hidden"
              >
                <div className="flex flex-col h-full">
                  {/* Image */}
                  <div className="relative h-56 w-full overflow-hidden">
                    <Image
                      src={story.image}
                      alt={story.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/20" />
                  </div>

                  {/* Content */}
                  <CardContent className="pt-6 pb-6 space-y-4 flex flex-col flex-grow">
                    <h3 className="text-xl font-bold font-serif group-hover:text-accent transition-colors">
                      {story.title}
                    </h3>
                    <p className="text-sm text-slate-300 line-clamp-4 flex-grow">
                      {story.content}
                    </p>
                    <div className="mt-auto flex justify-between items-center text-xs text-slate-400 border-t border-white/10 pt-3">
                      <span className="font-semibold">{story.author}</span>
                      <span className="font-light">{story.date}</span>
                    </div>
                  </CardContent>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="container mx-auto px-4 text-center p-12 bg-black/20 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg max-w-4xl"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 font-serif text-white">
            {ui.exploreMore}
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto text-slate-200">
            {ui.exploreMoreDescription}
          </p>

          <Button
            asChild
            size="lg"
            className="bg-accent text-white hover:bg-accent/90 h-14 px-8"
          >
            <a href="/#flying-spots">
              <span>{ui.viewAllSpots}</span>
            </a>
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <div className="relative z-10 pt-16">
        <div className="container mx-auto">
          <Footer />
        </div>
      </div>
    </main>
  );
}
