// lib/checkin-map/embed.ts
/**
 * KHỐI "BẢN ĐỒ CHECK-IN" NHÚNG TRONG BÀI VIẾT (chủ duyệt mô hình bài trụ – bài vệ tinh, 10/10/2026).
 *
 * Khối là một embed thường, thêm embedType "checkinMap" (cùng kiểu với "haGiangLoop"):
 *   { type: "embed", data: { embedType: "checkinMap", url: CK_HUB_URL, focus?: "<mã điểm>", caption?: "…" } }
 *   - focus: mã điểm (lib/checkin-map/types.ts CK_STOP_IDS) → bản đồ mở sẵn ở điểm đó, kèm thẻ điểm.
 *     Bỏ trống → toàn cảnh {n} điểm.
 *   - url: link bài trụ (bản đồ du lịch {n} điểm) — chỉ dùng cho bản HTML dự phòng (RSS, /store, nơi đọc HTML)
 *     và để trình soạn bài nhận ra loại khối khi sửa link.
 *   - caption: chữ dưới bản đồ; trống thì dùng câu mặc định theo ngôn ngữ (CK_UI).
 * Vì là embed nên trình soạn bài, bản dịch (lib/post-translation) và sitemap giữ nguyên khối, không cần nhánh mới.
 *
 * Tệp này KHÔNG import dữ liệu nặng — trình soạn bài (client) và script đăng bài cùng dùng được.
 */

export const CK_EMBED_TYPE = "checkinMap" as const;
export const CK_SITE = "https://mebayluon.com";
/** Bài trụ: "Bản đồ du lịch Tú Lệ – đèo Khau Phạ – Mù Cang Chải: {n} điểm check-in". */
export const CK_HUB_SLUG = "ban-do-du-lich-tu-le-khau-pha-mu-cang-chai";
export const CK_HUB_PATH = `/blog/${CK_HUB_SLUG}`;
export const CK_HUB_URL = `${CK_SITE}${CK_HUB_PATH}`;
/** Ảnh sơ đồ tĩnh — khung đầu của bản đồ và ảnh của bản HTML dự phòng. */
export const CK_POSTER_PATH = "/checkin-map/nen-1600.webp";

/** Link của khối bản đồ check-in (bài trụ, hay mục #check-in-map trên /spots/khau-pha). */
export function isCheckinMapUrl(url: string): boolean {
  return new RegExp(`/blog/${CK_HUB_SLUG}(?:[/?#]|$)|#check-in-map\\b`).test(String(url || ""));
}

import { CK_STOP_COUNT } from "./count";

const esc = (s: string) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/**
 * BẢN HTML DỰ PHÒNG của khối (content/contentVi, RSS, /store…): ảnh sơ đồ tĩnh + link tới bài trụ.
 * Trang /blog/<slug> vẽ bản đồ 3D thật từ khối, không dùng HTML này.
 */
export function checkinMapFallbackHtml(data: { url?: string; caption?: string; focus?: string }, lang: string = "vi"): string {
  const ui = ckUi(lang);
  const href = String(data.url || "").trim() || CK_HUB_URL;
  const abs = href.startsWith("/") ? CK_SITE + href : href;
  const cap = String(data.caption || "").trim() || ui.caption;
  return `<figure class="checkin-map"><a href="${esc(abs)}"><img src="${CK_SITE}${CK_POSTER_PATH}" alt="${esc(ui.alt)}" loading="lazy" style="width:100%;max-width:640px;height:auto;border-radius:12px" /></a><figcaption><a href="${esc(abs)}">${esc(cap)}</a> ${esc(ui.attrib)}</figcaption></figure>`;
}

/** Chữ giao diện của bản đồ, đủ 6 ngôn ngữ (thẻ điểm có chữ Việt cho vi, tiếng Anh cho các ngôn ngữ khác). */
export type CkUiText = {
  alt: string; home: string; hint: string; close: string; read: string; details: string; stops: string; dem: string;
  /** Câu mặc định dưới bản đồ trong bài viết. */
  caption: string;
  /** Ghi công dữ liệu bản đồ (chữ thường, không link — chủ 10/10). */
  attrib: string;
  /** Dòng dẫn sang bài trụ dưới bản đồ trên /spots/khau-pha. */
  hubLink: string;
};

export const CK_UI: Record<"vi" | "en" | "fr" | "ru" | "zh" | "hi", CkUiText> = {
  vi: {
    alt: "Bản đồ 3D đường đến điểm bay Khau Phạ và {n} điểm check-in từ Tú Lệ tới Mù Cang Chải",
    home: "← Toàn cảnh", hint: "Chạm vào một điểm để soi gần", close: "Thu nhỏ bản đồ", read: "Đọc bài đầy đủ →", details: "Chi tiết ↓",
    stops: "điểm", dem: "Độ cao: AWS Terrain Tiles",
    caption: "Bản đồ 3D {n} điểm check-in Tú Lệ – Khau Phạ – Mù Cang Chải: chạm một điểm để xem gần; kéo, xoay, thu phóng tuỳ ý.",
    attrib: "Dữ liệu bản đồ: © OpenStreetMap contributors · OpenFreeMap · Độ cao: AWS Terrain Tiles.",
    hubLink: "Đọc bài tổng hợp: Bản đồ du lịch Tú Lệ – đèo Khau Phạ – Mù Cang Chải, {n} điểm check-in",
  },
  en: {
    alt: "3D map of the road to the Khau Phạ paragliding site and {n} check-in stops from Tú Lệ to Mù Cang Chải",
    home: "← Overview", hint: "Tap a stop to zoom in", close: "Zoom out", read: "Read the full article →", details: "Details ↓",
    stops: "stops", dem: "Elevation: AWS Terrain Tiles",
    caption: "3D map of {n} check-in stops from Tú Lệ over Khau Phạ pass to Mù Cang Chải: tap a stop to zoom in; drag, rotate and zoom freely.",
    attrib: "Map data: © OpenStreetMap contributors · OpenFreeMap · Elevation: AWS Terrain Tiles.",
    hubLink: "Read the guide: Tú Lệ – Khau Phạ pass – Mù Cang Chải travel map, {n} check-in stops",
  },
  fr: {
    alt: "Carte 3D de la route vers le site de parapente de Khau Phạ et de {n} arrêts entre Tú Lệ et Mù Cang Chải",
    home: "← Vue d'ensemble", hint: "Touchez un arrêt pour zoomer", close: "Dézoomer", read: "Lire l'article →", details: "Détails ↓",
    stops: "arrêts", dem: "Altitude : AWS Terrain Tiles",
    caption: "Carte 3D de {n} arrêts entre Tú Lệ et Mù Cang Chải par le col de Khau Phạ : touchez un arrêt pour zoomer ; faites glisser, pivotez et zoomez librement.",
    attrib: "Données cartographiques : © OpenStreetMap contributors · OpenFreeMap · Altitude : AWS Terrain Tiles.",
    hubLink: "Lire le guide : carte de voyage Tú Lệ – col de Khau Phạ – Mù Cang Chải, {n} arrêts",
  },
  ru: {
    alt: "3D-карта дороги к месту полётов на параплане Khau Phạ и {n} остановок от Tú Lệ до Mù Cang Chải",
    home: "← Обзор", hint: "Нажмите на точку, чтобы приблизить", close: "Отдалить", read: "Читать статью →", details: "Подробнее ↓",
    stops: "точек", dem: "Высоты: AWS Terrain Tiles",
    caption: "3D-карта {n} остановок от Tú Lệ через перевал Khau Phạ до Mù Cang Chải: нажмите на точку, чтобы приблизить; карту можно двигать, вращать и масштабировать.",
    attrib: "Картографические данные: © участники OpenStreetMap · OpenFreeMap · Высоты: AWS Terrain Tiles.",
    hubLink: "Читать путеводитель: карта маршрута Tú Lệ – перевал Khau Phạ – Mù Cang Chải, {n} остановок",
  },
  zh: {
    alt: "通往 Khau Phạ 滑翔伞飞行点道路及 Tú Lệ 至 Mù Cang Chải {n} 个打卡点的三维地图",
    home: "← 全景", hint: "点击一个地点放大查看", close: "缩小地图", read: "阅读全文 →", details: "详情 ↓",
    stops: "个地点", dem: "高程：AWS Terrain Tiles",
    caption: "从 Tú Lệ 经 Khau Phạ 山口到 Mù Cang Chải 的 {n} 个打卡点三维地图：点击地点放大查看，可自由拖动、旋转和缩放。",
    attrib: "地图数据：© OpenStreetMap 贡献者 · OpenFreeMap · 高程：AWS Terrain Tiles。",
    hubLink: "阅读攻略：Tú Lệ – Khau Phạ 山口 – Mù Cang Chải 旅游地图，{n} 个打卡点",
  },
  hi: {
    alt: "Khau Phạ पैराग्लाइडिंग स्थल तक सड़क और Tú Lệ से Mù Cang Chải तक {n} चेक-इन स्थानों का 3D नक्शा",
    home: "← पूरा नक्शा", hint: "नज़दीक से देखने के लिए किसी स्थान पर टैप करें", close: "छोटा करें", read: "पूरा लेख पढ़ें →", details: "विवरण ↓",
    stops: "स्थान", dem: "ऊँचाई: AWS Terrain Tiles",
    caption: "Tú Lệ से Khau Phạ दर्रे होते हुए Mù Cang Chải तक {n} चेक-इन स्थानों का 3D नक्शा: नज़दीक देखने के लिए किसी स्थान पर टैप करें; नक्शे को खींचें, घुमाएँ और ज़ूम करें।",
    attrib: "मानचित्र डेटा: © OpenStreetMap योगदानकर्ता · OpenFreeMap · ऊँचाई: AWS Terrain Tiles।",
    hubLink: "गाइड पढ़ें: Tú Lệ – Khau Phạ दर्रा – Mù Cang Chải यात्रा नक्शा, {n} चेक-इन स्थान",
  },
};

/** Chữ giao diện theo ngôn ngữ; "{n}" = số điểm hiện có (CK_STOP_COUNT — thêm điểm thì tự đổi). */
export function ckUi(lang: string): CkUiText {
  const t = CK_UI[lang as keyof typeof CK_UI] ?? CK_UI.en;
  return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, v.replace(/\{n\}/g, String(CK_STOP_COUNT))])) as CkUiText;
}
