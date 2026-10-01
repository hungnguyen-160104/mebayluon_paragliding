// File thuần TS, dùng chung cho client & server

type Lang6 = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

/**
 * MỤC CON KIẾN THỨC — nguồn duy nhất (10/2026, phân nhóm lại bài viết).
 *  - `db`: giá trị subCategory lưu trong MongoDB (models/Post.model.ts).
 *  - `url`: mã trên URL /knowledge/<url> (tiếng Anh, giữ nguyên các mã cũ).
 *  - `label`: tên hiển thị đủ 6 ngôn ngữ.
 * Thứ tự ở đây là thứ tự tab. Tab không có bài nào bị ẩn (xem
 * getKnowledgeSubCounts ở lib/posts-data.ts) và không vào sitemap.
 */
export const KNOWLEDGE_TOPICS = [
  {
    db: "can-ban", url: "basic",
    label: { vi: "Dù lượn căn bản", en: "Basic paragliding", fr: "Parapente débutant", ru: "Парапланеризм для начинающих", zh: "滑翔伞基础", hi: "बेसिक पैराग्लाइडिंग" },
  },
  {
    db: "nang-cao", url: "advanced",
    label: { vi: "Dù lượn nâng cao", en: "Advanced paragliding", fr: "Parapente avancé", ru: "Продвинутый парапланеризм", zh: "滑翔伞进阶", hi: "एडवांस्ड पैराग्लाइडिंग" },
  },
  {
    db: "thermal", url: "thermal",
    label: { vi: "Bay thermal", en: "Thermal flying", fr: "Vol en thermique", ru: "Полёт в термиках", zh: "热气流飞行", hi: "थर्मल फ्लाइंग" },
  },
  {
    db: "xc", url: "xc",
    label: { vi: "Bay XC", en: "Cross-country flying", fr: "Vol de distance", ru: "Маршрутные полёты", zh: "越野飞行", hi: "क्रॉस-कंट्री उड़ान" },
  },
  {
    db: "khi-tuong", url: "weather",
    label: { vi: "Khí tượng bay", en: "Aviation weather", fr: "Météo de vol", ru: "Погода для полётов", zh: "飞行气象", hi: "उड़ान मौसम" },
  },
  {
    db: "thiet-bi", url: "gear",
    label: { vi: "Thiết bị dù lượn", en: "Paragliding gear", fr: "Matériel de parapente", ru: "Снаряжение", zh: "滑翔伞装备", hi: "पैराग्लाइडिंग उपकरण" },
  },
  {
    db: "ppg", url: "ppg",
    label: { vi: "Dù lượn gắn động cơ (PPG)", en: "Paramotor (PPG)", fr: "Paramoteur (PPG)", ru: "Парамотор (PPG)", zh: "动力滑翔伞 (PPG)", hi: "पैरामोटर (PPG)" },
  },
  {
    db: "hoc-bay", url: "training",
    label: { vi: "Học bay & chứng chỉ", en: "Training & licences", fr: "Formation et brevets", ru: "Обучение и лицензии", zh: "培训与执照", hi: "प्रशिक्षण और लाइसेंस" },
  },
  {
    db: "quy-dinh", url: "rules",
    label: { vi: "Quy định & không phận", en: "Rules & airspace", fr: "Réglementation et espace aérien", ru: "Правила и воздушное пространство", zh: "法规与空域", hi: "नियम और हवाई क्षेत्र" },
  },
] as const satisfies readonly { db: string; url: string; label: Record<Lang6, string> }[];

export type KnowledgeDbKey = (typeof KNOWLEDGE_TOPICS)[number]["db"];
export type KnowledgeUrlKey = (typeof KNOWLEDGE_TOPICS)[number]["url"];

export function knowledgeTopicByUrl(url: string) {
  return KNOWLEDGE_TOPICS.find((t) => t.url === url) ?? null;
}

export function knowledgeTopicByDb(db: string) {
  return KNOWLEDGE_TOPICS.find((t) => t.db === db) ?? null;
}

// ---- Giữ cho mã cũ (nhãn tiếng Việt) ----
export const KNOWLEDGE_SUBS = [
  { key: "all", label: "Tất cả" },
  ...KNOWLEDGE_TOPICS.map((t) => ({ key: t.db, label: t.label.vi })),
] as const;

export type KnowledgeKey = "all" | KnowledgeDbKey;

export const KNOWLEDGE_LABEL = Object.fromEntries(
  KNOWLEDGE_TOPICS.map((t) => [t.db, t.label.vi]),
) as Record<KnowledgeDbKey, string>;
