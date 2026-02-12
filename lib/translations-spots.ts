// lib/translations-spots.ts
export type SpotLanguage = "vi" | "en" | "fr" | "ru";

type SpotDetailStrings = {
  aboutTitle: string;
  galleryTitle: string;
  storyTitle: string;
  storySubtitle: string;
  exploreMore: string;
  exploreMoreDescription: string;
  viewAllSpots: string;
  altitude: string;
  flightTime: string;
  windDependent: string;
  feeling: string;
  smoothAir: string;
  quickFacts: string;
  landscapeIntro: string;
  notFoundTitle: string;
  backToList: string;
  viewReviews: string; // ✅ mới: nút xem đánh giá Google
};

export type SpotTranslations = {
  spotDetail: SpotDetailStrings;
};

export const spotTranslations: Record<SpotLanguage, SpotTranslations> = {
  vi: {
    spotDetail: {
      aboutTitle: "Về điểm bay này",
      galleryTitle: "Khoảnh khắc tại đây",
      storyTitle: "Câu chuyện và Trải nghiệm",
      storySubtitle: "Lắng nghe những chia sẻ đáng nhớ từ du khách",
      exploreMore: "Khám phá thêm các điểm bay khác",
      exploreMoreDescription: "Chúng tôi còn nhiều điểm bay tuyệt đẹp khắp Việt Nam",
      viewAllSpots: "Xem tất cả điểm bay",
      altitude: "Độ Cao Cất Cánh",
      flightTime: "Thời Gian Bay",
      windDependent: "tùy điều kiện gió",
      feeling: "Cảm Giác",
      smoothAir: "Êm ái, ổn định",
      quickFacts: "Thông số nhanh",
      landscapeIntro: "Cảnh quan chính:",
      notFoundTitle: "Không tìm thấy điểm bay",
      backToList: "Quay về danh sách điểm bay",
      viewReviews: "Xem đánh giá Google"
    },
  },
  en: {
    spotDetail: {
      aboutTitle: "About this flying spot",
      galleryTitle: "Moments here",
      storyTitle: "Stories and Experiences",
      storySubtitle: "Hear memorable stories from our flyers",
      exploreMore: "Explore other flying spots",
      exploreMoreDescription: "We have many other beautiful flying spots across Vietnam",
      viewAllSpots: "View all flying spots",
      altitude: "Takeoff Altitude",
      flightTime: "Flight Time",
      windDependent: "depends on wind conditions",
      feeling: "Feeling",
      smoothAir: "Smooth and stable",
      quickFacts: "Quick facts",
      landscapeIntro: "Main landscape:",
      notFoundTitle: "Spot not found",
      backToList: "Back to flying spots list",
      viewReviews: "View Google reviews"
    },
  },
  fr: {
    spotDetail: {
      aboutTitle: "À propos de ce site de vol",
      galleryTitle: "Moments ici",
      storyTitle: "Histoires et Expériences",
      storySubtitle: "Écoutez les témoignages mémorables de nos passagers",
      exploreMore: "Découvrir d'autres sites de vol",
      exploreMoreDescription: "Nous avons de nombreux autres sites magnifiques à travers le Vietnam",
      viewAllSpots: "Voir tous les sites de vol",
      altitude: "Altitude de décollage",
      flightTime: "Temps de vol",
      windDependent: "selon les conditions de vent",
      feeling: "Sensation",
      smoothAir: "Fluide et stable",
      quickFacts: "Infos rapides",
      landscapeIntro: "Paysage principal :",
      notFoundTitle: "Site introuvable",
      backToList: "Retour à la liste des sites",
      viewReviews: "Voir les avis Google"
    },
  },
  ru: {
    spotDetail: {
      aboutTitle: "О лётной площадке",
      galleryTitle: "Моменты здесь",
      storyTitle: "Истории и впечатления",
      storySubtitle: "Услышьте запоминающиеся отзывы наших пассажиров",
      exploreMore: "Откройте другие лётные точки",
      exploreMoreDescription: "У нас много красивых мест для полётов по всему Вьетнаму",
      viewAllSpots: "Все лётные точки",
      altitude: "Высота старта",
      flightTime: "Время полёта",
      windDependent: "зависит от ветра",
      feeling: "Ощущение",
      smoothAir: "Плавно и стабильно",
      quickFacts: "Коротко о главном",
      landscapeIntro: "Основной пейзаж:",
      notFoundTitle: "Локация не найдена",
      backToList: "Назад к списку локаций",
      viewReviews: "Открыть отзывы Google"
    },
  },
};

export const getSpotTranslation = (lang: SpotLanguage) =>
  spotTranslations[lang] ?? spotTranslations.vi;
