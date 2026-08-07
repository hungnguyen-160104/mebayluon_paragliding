// lib/spot-videos.ts
/**
 * Video toàn cảnh của điểm bay, phát trên trang /spots/<slug>.
 *
 * Video tự host trong public/spots/<slug>/ chứ không đưa lên Cloudinary: tài
 * khoản Cloudinary đang ở gói Free, mỗi GB băng thông tốn 1 credit dùng CHUNG
 * với toàn bộ ảnh của web — tràn hạn mức thì ảnh cả site ngừng phục vụ. Băng
 * thông Vercel rộng hơn nhiều và có tràn cũng không kéo sập ảnh.
 *
 * THÊM VIDEO MỚI:
 *  1. Thả file gốc vào media-inbox/ (thư mục này đã gitignore)
 *  2. node scripts/compress-spot-video.mjs media-inbox/<file> khau-pha <ten-file> 8 square
 *     -> nén video, cắt về khung vuông canh giữa và cắt ảnh poster vào
 *        public/spots/<slug>/. Cắt vuông để hai video đứng cạnh nhau cho cân,
 *        dù nguồn có cái quay dọc cái quay ngang.
 *  3. Khai thêm một dòng vào SPOT_VIDEOS bên dưới
 *  4. Thêm ngoại lệ cho file .mp4 mới trong .gitignore (mặc định *.mp4 bị bỏ qua)
 * Điểm bay nào không khai thì khối video tự ẩn.
 */

export type SpotVideoKind = "paragliding" | "paramotor";

export type SpotVideo = {
  /** Đường dẫn file mp4 trong public/, ví dụ "/spots/khau-pha/du-luon.mp4". */
  src: string;
  /** Ảnh chờ cắt từ chính video (script nén sinh ra cùng lúc). */
  poster: string;
  kind: SpotVideoKind;
};

export const SPOT_VIDEOS: Record<string, SpotVideo[]> = {
  "khau-pha": [
    {
      src: "/spots/khau-pha/toan-canh-du-luon.mp4",
      poster: "/spots/khau-pha/toan-canh-du-luon.jpg",
      kind: "paragliding",
    },
    {
      src: "/spots/khau-pha/toan-canh-du-luon-gan-dong-co.mp4",
      poster: "/spots/khau-pha/toan-canh-du-luon-gan-dong-co.jpg",
      kind: "paramotor",
    },
  ],
};

export const getSpotVideos = (slug?: string | null): SpotVideo[] =>
  (slug && SPOT_VIDEOS[slug]) || [];

type SpotVideoLang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

export const SPOT_VIDEO_I18N: Record<
  SpotVideoLang,
  { sectionTitle: string; play: string } & Record<SpotVideoKind, string>
> = {
  vi: {
    sectionTitle: "Video toàn cảnh điểm bay",
    play: "Xem video",
    paragliding: "Toàn cảnh bay dù lượn",
    paramotor: "Toàn cảnh bay dù lượn gắn động cơ",
  },
  en: {
    sectionTitle: "Flying site videos",
    play: "Watch video",
    paragliding: "Paragliding — full view",
    paramotor: "Paramotor — full view",
  },
  fr: {
    sectionTitle: "Vidéos du site de vol",
    play: "Voir la vidéo",
    paragliding: "Parapente — vue d’ensemble",
    paramotor: "Paramoteur — vue d’ensemble",
  },
  ru: {
    sectionTitle: "Видео места полётов",
    play: "Смотреть видео",
    paragliding: "Параплан — общий вид",
    paramotor: "Парамотор — общий вид",
  },
  zh: {
    sectionTitle: "飞行点全景视频",
    play: "观看视频",
    paragliding: "滑翔伞飞行全景",
    paramotor: "动力滑翔伞飞行全景",
  },
  hi: {
    sectionTitle: "उड़ान स्थल के वीडियो",
    play: "वीडियो देखें",
    paragliding: "पैराग्लाइडिंग — पूरा नज़ारा",
    paramotor: "पैरामोटर — पूरा नज़ारा",
  },
};
