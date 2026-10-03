// lib/i18n/webcam.ts
/**
 * Chữ cho trang WEBCAM công khai (/webcam, /webcam/khau-pha, /webcam/vien-nam —
 * 03/10/2026, chủ: link "Webcam Khau Phạ", "Webcam Viên Nam 850" ở footer).
 * Sáu ngôn ngữ trong một tệp như lib/i18n/thoi-tiet.ts. Tên địa danh giữ nguyên.
 *
 * Giờ chụp lấy từ CAM_ACTIVE (lib/imou/cameras.ts) — đổi giờ ở đó là chữ đổi theo.
 */
import { CAM_ACTIVE, type WebcamSite } from "@/lib/imou/cameras";
import type { Locale } from "@/lib/site-config";

type CamCopy = {
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  /** Tên điểm bay dùng trong nút "Xem điểm bay …" */
  spotName: string;
  keywords: string[];
};

export type WebcamCopy = {
  listMetaTitle: string;
  listMetaDescription: string;
  listH1: string;
  listIntro: string;
  /** Tiêu đề khối giờ chụp + câu giờ chụp */
  hoursTitle: string;
  hours: string;
  /** Câu dặn: ảnh tĩnh, không phải video; xem dự báo trước khi đi */
  note: string;
  linksTitle: string;
  spotLink: (spot: string) => string;
  forecastLink: string;
  baobayLink: string;
  bookLink: string;
  otherCam: string;
  viewCam: string;
  /** Theo ĐIỂM (trang /webcam/<điểm>) — Viên Nam gồm camera bãi cất + bãi hạ cánh */
  cams: Record<WebcamSite, CamCopy>;
};

const H = CAM_ACTIVE.label;

const VI: WebcamCopy = {
  listMetaTitle: "Webcam dù lượn trực tiếp — Khau Phạ, Viên Nam | Mebayluon",
  listMetaDescription: `Ảnh camera trực tiếp bãi cất cánh dù lượn Khau Phạ (Mù Cang Chải) và Viên Nam (Hà Nội), cập nhật 1–3 phút, ${H} mỗi ngày.`,
  listH1: "Webcam bãi cất cánh dù lượn trực tiếp",
  listIntro:
    "Xem trời, mây và gió ở bãi cất trước khi lên đường. Camera do Mebayluon đặt ngay tại bãi, chụp tự động và giữ ảnh 60 phút gần nhất để xem lại diễn biến.",
  hoursTitle: "Giờ chụp",
  hours: `Mỗi ngày ${H} (giờ Việt Nam): 10:00–15:00 chụp mỗi phút, giờ khác 3 phút một ảnh. Kéo thanh trượt để xem lại 60 phút gần nhất hoặc bấm “Chạy timelapse”.`,
  note: "Ảnh tĩnh từ camera 4G, không phải video. Bay hay không do phi công quyết định tại bãi — xem thêm dự báo thời tiết bay.",
  linksTitle: "Xem thêm",
  spotLink: (s) => `Điểm bay ${s}`,
  forecastLink: "Dự báo thời tiết bay",
  baobayLink: "Báo bay cho phi công",
  bookLink: "Đặt bay đôi",
  otherCam: "Camera khác",
  viewCam: "Xem webcam",
  cams: {
    "khau-pha": {
      metaTitle: "Webcam Khau Phạ – bãi cất cánh dù lượn trực tiếp | Mebayluon",
      metaDescription: `Webcam Khau Phạ: ảnh trực tiếp bãi cất cánh dù lượn đèo Khau Phạ, Mù Cang Chải, cập nhật 1–3 phút, ${H}. Xem mây, gió trước khi lên bay.`,
      h1: "Webcam Khau Phạ – bãi cất cánh dù lượn trực tiếp",
      intro:
        "Camera đặt tại bãi cất cánh đèo Khau Phạ (Mù Cang Chải, Yên Bái) — một trong bốn đèo lớn của Tây Bắc, nơi bay dù lượn ngắm ruộng bậc thang Lìm Mông, Cao Phạ. Nhìn ảnh để biết đèo đang quang hay mây phủ.",
      spotName: "Khau Phạ",
      keywords: ["webcam Khau Phạ", "camera đèo Khau Phạ", "thời tiết Khau Phạ hôm nay", "dù lượn Khau Phạ", "Mù Cang Chải webcam"],
    },
    "vien-nam": {
      metaTitle: "Webcam Viên Nam 850 – bãi cất cánh dù lượn trực tiếp | Mebayluon",
      metaDescription: `Webcam Viên Nam: ảnh trực tiếp bãi cất cánh cao Viên Nam (~850 m) và bãi hạ cánh, Hà Nội, cập nhật 1–3 phút, ${H}. Xem trời, mây trước khi lên bãi.`,
      h1: "Webcam Viên Nam 850 – bãi cất cánh dù lượn trực tiếp",
      intro:
        "Camera đặt tại bãi cất cánh cao núi Viên Nam (khoảng 850 m) — điểm bay dù lượn gần Hà Nội nhất. Nhìn ảnh để biết đỉnh núi có mây hay quang trước khi chạy xe lên. Bên dưới là camera bãi hạ cánh dưới chân núi.",
      spotName: "Đồi Bù – Viên Nam",
      keywords: ["webcam Viên Nam", "camera núi Viên Nam", "camera bãi hạ cánh Viên Nam", "dù lượn Viên Nam", "bay dù lượn Hà Nội", "thời tiết Viên Nam hôm nay"],
    },
  },
};

const EN: WebcamCopy = {
  listMetaTitle: "Live paragliding webcams — Khau Pha, Vien Nam | Mebayluon",
  listMetaDescription: `Live launch-site cameras at Khau Pha (Mu Cang Chai) and Vien Nam (Hanoi), updated every 1–3 minutes, ${H} Vietnam time.`,
  listH1: "Live paragliding launch webcams",
  listIntro:
    "Check the sky, clouds and wind at the launch before you set off. Mebayluon's cameras sit right on the take-off, shoot automatically and keep the last 60 minutes so you can see how conditions are developing.",
  hoursTitle: "Capture hours",
  hours: `Daily ${H} (Vietnam time): every minute 10:00–15:00, every 3 minutes otherwise. Drag the slider to review the last 60 minutes or tap “Play timelapse”.`,
  note: "Still photos from a 4G camera, not video. Whether flights go ahead is decided by the pilots on site — see the flying forecast too.",
  linksTitle: "More",
  spotLink: (s) => `${s} flying spot`,
  forecastLink: "Flying weather forecast",
  baobayLink: "Pilot flight register",
  bookLink: "Book a tandem flight",
  otherCam: "Other camera",
  viewCam: "Open webcam",
  cams: {
    "khau-pha": {
      metaTitle: "Khau Pha webcam – live paragliding launch | Mebayluon",
      metaDescription: `Khau Pha webcam: live photos of the Khau Pha Pass paragliding launch, Mu Cang Chai, updated every 1–3 minutes, ${H}. Check clouds and wind before flying.`,
      h1: "Khau Pha webcam – live paragliding launch",
      intro:
        "This camera sits on the Khau Pha Pass take-off (Mu Cang Chai, Yen Bai) — one of northern Vietnam's great passes, where you fly over the Lim Mong and Cao Pha rice terraces. See at a glance whether the pass is clear or in cloud.",
      spotName: "Khau Pha",
      keywords: ["Khau Pha webcam", "Khau Pha pass camera", "Mu Cang Chai webcam", "Khau Pha paragliding", "Khau Pha weather today"],
    },
    "vien-nam": {
      metaTitle: "Vien Nam 850 webcam – live paragliding launch | Mebayluon",
      metaDescription: `Vien Nam webcam: live photos of the Vien Nam top launch (~850 m) and landing field near Hanoi, updated every 1–3 minutes, ${H}. Check the sky before driving up.`,
      h1: "Vien Nam 850 webcam – live paragliding launch",
      intro:
        "This camera sits on the top launch of Vien Nam mountain (about 850 m) — the closest paragliding site to Hanoi. See whether the summit is clear or in cloud before you drive up. The landing field camera at the foot of the mountain is below.",
      spotName: "Doi Bu – Vien Nam",
      keywords: ["Vien Nam webcam", "Hanoi paragliding webcam", "Vien Nam paragliding", "Vien Nam mountain camera"],
    },
  },
};

const FR: WebcamCopy = {
  listMetaTitle: "Webcams parapente en direct — Khau Phạ, Viên Nam | Mebayluon",
  listMetaDescription: `Caméras en direct des décollages de Khau Phạ (Mù Cang Chải) et Viên Nam (Hanoï), mises à jour toutes les 1–3 minutes, ${H} heure du Vietnam.`,
  listH1: "Webcams des décollages de parapente en direct",
  listIntro:
    "Vérifiez le ciel, les nuages et le vent au décollage avant de partir. Les caméras de Mebayluon sont installées sur le décollage, prennent des photos automatiquement et gardent les 60 dernières minutes.",
  hoursTitle: "Heures de prise de vue",
  hours: `Tous les jours ${H} (heure du Vietnam) : chaque minute de 10:00 à 15:00, toutes les 3 minutes sinon. Faites glisser le curseur pour revoir les 60 dernières minutes ou lancez le timelapse.`,
  note: "Photos fixes d'une caméra 4G, pas de vidéo. Les pilotes décident sur place si l'on vole — consultez aussi la météo de vol.",
  linksTitle: "Voir aussi",
  spotLink: (s) => `Site de vol ${s}`,
  forecastLink: "Météo de vol",
  baobayLink: "Registre de vol des pilotes",
  bookLink: "Réserver un vol biplace",
  otherCam: "Autre caméra",
  viewCam: "Voir la webcam",
  cams: {
    "khau-pha": {
      metaTitle: "Webcam Khau Phạ – décollage parapente en direct | Mebayluon",
      metaDescription: `Webcam Khau Phạ : photos en direct du décollage parapente du col de Khau Phạ, Mù Cang Chải, toutes les 1–3 minutes, ${H}.`,
      h1: "Webcam Khau Phạ – décollage parapente en direct",
      intro:
        "Caméra installée au décollage du col de Khau Phạ (Mù Cang Chải, Yên Bái), l'un des grands cols du nord du Vietnam, au-dessus des rizières en terrasses de Lìm Mông et Cao Phạ. Voyez d'un coup d'œil si le col est dégagé ou dans les nuages.",
      spotName: "Khau Phạ",
      keywords: ["webcam Khau Phạ", "parapente Khau Phạ", "webcam Mù Cang Chải", "météo Khau Phạ"],
    },
    "vien-nam": {
      metaTitle: "Webcam Viên Nam 850 – décollage parapente en direct | Mebayluon",
      metaDescription: `Webcam Viên Nam : photos en direct du décollage haut de Viên Nam (~850 m) et de l'atterrissage, près de Hanoï, toutes les 1–3 minutes, ${H}.`,
      h1: "Webcam Viên Nam 850 – décollage parapente en direct",
      intro:
        "Caméra installée au décollage haut du mont Viên Nam (environ 850 m) — le site de parapente le plus proche de Hanoï. Voyez si le sommet est dégagé avant de monter. La caméra de l'atterrissage, au pied de la montagne, est plus bas.",
      spotName: "Đồi Bù – Viên Nam",
      keywords: ["webcam Viên Nam", "parapente Hanoï", "parapente Viên Nam"],
    },
  },
};

const RU: WebcamCopy = {
  listMetaTitle: "Веб-камеры парапланерных стартов онлайн — Khau Phạ, Viên Nam | Mebayluon",
  listMetaDescription: `Камеры на стартах Khau Phạ (Мукангчай) и Viên Nam (Ханой) онлайн, обновление каждые 1–3 минуты, ${H} по времени Вьетнама.`,
  listH1: "Веб-камеры парапланерных стартов онлайн",
  listIntro:
    "Посмотрите небо, облака и ветер на старте перед поездкой. Камеры Mebayluon стоят прямо на старте, снимают автоматически и хранят последние 60 минут.",
  hoursTitle: "Время съёмки",
  hours: `Ежедневно ${H} (время Вьетнама): каждую минуту с 10:00 до 15:00, в остальное время раз в 3 минуты. Двигайте ползунок, чтобы посмотреть последние 60 минут, или запустите таймлапс.`,
  note: "Фотографии с 4G-камеры, не видео. Решение о полётах принимают пилоты на месте — смотрите также прогноз погоды для полётов.",
  linksTitle: "Ещё",
  spotLink: (s) => `Место полётов ${s}`,
  forecastLink: "Прогноз погоды для полётов",
  baobayLink: "Регистрация полётов пилотов",
  bookLink: "Забронировать тандем",
  otherCam: "Другая камера",
  viewCam: "Открыть камеру",
  cams: {
    "khau-pha": {
      metaTitle: "Веб-камера Khau Phạ – старт парапланов онлайн | Mebayluon",
      metaDescription: `Веб-камера Khau Phạ: фото старта на перевале Khau Phạ (Мукангчай) онлайн, обновление каждые 1–3 минуты, ${H}.`,
      h1: "Веб-камера Khau Phạ – старт парапланов онлайн",
      intro:
        "Камера стоит на старте перевала Khau Phạ (Мукангчай, Йенбай) — одного из крупнейших перевалов севера Вьетнама, над рисовыми террасами Lìm Mông и Cao Phạ. Сразу видно, ясно на перевале или он в облаках.",
      spotName: "Khau Phạ",
      keywords: ["веб-камера Khau Phạ", "параплан Вьетнам", "Мукангчай камера"],
    },
    "vien-nam": {
      metaTitle: "Веб-камера Viên Nam 850 – старт парапланов онлайн | Mebayluon",
      metaDescription: `Веб-камера Viên Nam: фото верхнего старта Viên Nam (~850 м) под Ханоем онлайн, обновление каждые 1–3 минуты, ${H}.`,
      h1: "Веб-камера Viên Nam 850 – старт парапланов онлайн",
      intro:
        "Камера стоит на верхнем старте горы Viên Nam (около 850 м) — ближайшее к Ханою место для полётов на параплане. Проверьте, нет ли облаков на вершине, прежде чем ехать. Ниже — камера посадочной площадки у подножия горы.",
      spotName: "Đồi Bù – Viên Nam",
      keywords: ["веб-камера Viên Nam", "параплан Ханой"],
    },
  },
};

const ZH: WebcamCopy = {
  listMetaTitle: "滑翔伞起飞场实时摄像头 — Khau Phạ、Viên Nam | Mebayluon",
  listMetaDescription: `Khau Phạ（木岗寨）与 Viên Nam（河内）滑翔伞起飞场实时照片，每 1–3 分钟更新，越南时间 ${H}。`,
  listH1: "滑翔伞起飞场实时摄像头",
  listIntro: "出发前先看看起飞场的天空、云和风。Mebayluon 的摄像头就装在起飞场，自动拍照并保留最近 60 分钟的照片。",
  hoursTitle: "拍摄时间",
  hours: `每天 ${H}（越南时间）：10:00–15:00 每分钟一张，其他时间每 3 分钟一张。拖动滑块可回看最近 60 分钟，或播放延时摄影。`,
  note: "照片来自 4G 摄像头，并非视频。能否飞行由现场飞行员决定——请同时查看飞行天气预报。",
  linksTitle: "更多",
  spotLink: (s) => `${s} 飞行点`,
  forecastLink: "飞行天气预报",
  baobayLink: "飞行员飞行登记",
  bookLink: "预订双人飞行",
  otherCam: "其他摄像头",
  viewCam: "查看摄像头",
  cams: {
    "khau-pha": {
      metaTitle: "Khau Phạ 实时摄像头 – 滑翔伞起飞场 | Mebayluon",
      metaDescription: `Khau Phạ 摄像头：木岗寨 Khau Phạ 山口滑翔伞起飞场实时照片，每 1–3 分钟更新，${H}。`,
      h1: "Khau Phạ 实时摄像头 – 滑翔伞起飞场",
      intro: "摄像头位于 Khau Phạ 山口起飞场（安沛省木岗寨），越南西北大山口之一，下方是 Lìm Mông、Cao Phạ 梯田。一眼就能看出山口是晴朗还是云雾笼罩。",
      spotName: "Khau Phạ",
      keywords: ["Khau Phạ 摄像头", "木岗寨 滑翔伞", "越南 滑翔伞"],
    },
    "vien-nam": {
      metaTitle: "Viên Nam 850 实时摄像头 – 滑翔伞起飞场 | Mebayluon",
      metaDescription: `Viên Nam 摄像头：河内附近 Viên Nam 高起飞场（约 850 米）实时照片，每 1–3 分钟更新，${H}。`,
      h1: "Viên Nam 850 实时摄像头 – 滑翔伞起飞场",
      intro: "摄像头位于 Viên Nam 山高起飞场（约 850 米），是离河内最近的滑翔伞飞行点。上山前先看看山顶有没有云。下方是山脚降落场的摄像头。",
      spotName: "Đồi Bù – Viên Nam",
      keywords: ["Viên Nam 摄像头", "河内 滑翔伞"],
    },
  },
};

const HI: WebcamCopy = {
  listMetaTitle: "लाइव पैराग्लाइडिंग वेबकैम — Khau Phạ, Viên Nam | Mebayluon",
  listMetaDescription: `Khau Phạ (मू कांग चाई) और Viên Nam (हनोई) टेक-ऑफ़ के लाइव फ़ोटो, हर 1–3 मिनट में अपडेट, वियतनाम समय ${H}।`,
  listH1: "लाइव पैराग्लाइडिंग टेक-ऑफ़ वेबकैम",
  listIntro:
    "निकलने से पहले टेक-ऑफ़ पर आसमान, बादल और हवा देख लें। Mebayluon के कैमरे ठीक टेक-ऑफ़ पर लगे हैं, अपने-आप फ़ोटो लेते हैं और पिछले 60 मिनट रखते हैं।",
  hoursTitle: "फ़ोटो का समय",
  hours: `रोज़ ${H} (वियतनाम समय): 10:00–15:00 हर मिनट, बाकी समय हर 3 मिनट। पिछले 60 मिनट देखने के लिए स्लाइडर खींचें या टाइमलैप्स चलाएँ।`,
  note: "4G कैमरे की तस्वीरें, वीडियो नहीं। उड़ान होगी या नहीं, यह मौके पर पायलट तय करते हैं — उड़ान मौसम पूर्वानुमान भी देखें।",
  linksTitle: "और देखें",
  spotLink: (s) => `${s} उड़ान स्थल`,
  forecastLink: "उड़ान मौसम पूर्वानुमान",
  baobayLink: "पायलट उड़ान रजिस्टर",
  bookLink: "टैंडम उड़ान बुक करें",
  otherCam: "दूसरा कैमरा",
  viewCam: "वेबकैम देखें",
  cams: {
    "khau-pha": {
      metaTitle: "Khau Phạ वेबकैम – लाइव पैराग्लाइडिंग टेक-ऑफ़ | Mebayluon",
      metaDescription: `Khau Phạ वेबकैम: मू कांग चाई के Khau Phạ दर्रे के टेक-ऑफ़ के लाइव फ़ोटो, हर 1–3 मिनट में, ${H}।`,
      h1: "Khau Phạ वेबकैम – लाइव पैराग्लाइडिंग टेक-ऑफ़",
      intro:
        "यह कैमरा Khau Phạ दर्रे (मू कांग चाई, येन बाई) के टेक-ऑफ़ पर लगा है — उत्तरी वियतनाम के बड़े दर्रों में से एक, Lìm Mông और Cao Phạ के सीढ़ीदार खेतों के ऊपर। एक नज़र में देखें कि दर्रा साफ़ है या बादलों में।",
      spotName: "Khau Phạ",
      keywords: ["Khau Phạ webcam", "वियतनाम पैराग्लाइडिंग"],
    },
    "vien-nam": {
      metaTitle: "Viên Nam 850 वेबकैम – लाइव पैराग्लाइडिंग टेक-ऑफ़ | Mebayluon",
      metaDescription: `Viên Nam वेबकैम: हनोई के पास Viên Nam ऊपरी टेक-ऑफ़ (~850 मी) के लाइव फ़ोटो, हर 1–3 मिनट में, ${H}।`,
      h1: "Viên Nam 850 वेबकैम – लाइव पैराग्लाइडिंग टेक-ऑफ़",
      intro:
        "यह कैमरा Viên Nam पर्वत (लगभग 850 मी) के ऊपरी टेक-ऑफ़ पर लगा है — हनोई के सबसे पास का पैराग्लाइडिंग स्थल। ऊपर जाने से पहले देखें कि चोटी पर बादल हैं या नहीं। नीचे पहाड़ की तलहटी में लैंडिंग फ़ील्ड का कैमरा है।",
      spotName: "Đồi Bù – Viên Nam",
      keywords: ["Viên Nam webcam", "हनोई पैराग्लाइडिंग"],
    },
  },
};

const ALL: Record<Locale, WebcamCopy> = { vi: VI, en: EN, fr: FR, ru: RU, zh: ZH, hi: HI };

export function getWebcamCopy(locale: Locale): WebcamCopy {
  return ALL[locale] ?? EN;
}

/** Trang điểm bay của từng camera (Viên Nam đã gộp vào thẻ Đồi Bù) */
export const WEBCAM_SPOT_PATH: Record<WebcamSite, string> = {
  "khau-pha": "/spots/khau-pha",
  "vien-nam": "/spots/doi-bu",
};
