// lib/authors.ts
/**
 * TÁC GIẢ BÀI VIẾT có hồ sơ thật trên web (SEO 01/10/2026).
 *
 * Trường `author` của bài trong DB là chuỗi tên. Tên nằm trong bảng này thì:
 *  - JSON-LD BlogPosting khai `author` là Person có `@id` trùng với Person ở
 *    trang hồ sơ /pilots/<slug> (Google nối bài ↔ người viết ↔ hồ sơ),
 *  - thẻ meta author kèm link hồ sơ,
 *  - dưới tiêu đề bài hiện dòng "Tác giả: … · <chức danh>" bấm sang hồ sơ.
 *
 * Tên KHÔNG có trong bảng: "Admin", "Mebayluon"… (bài do thương hiệu viết)
 * → JSON-LD khai Organization "Mebayluon Paragliding", không hiện dòng tác giả.
 * Thêm người viết mới: thêm một mục ở đây, slug phải khớp lib/pilots-data.ts.
 */
import { SITE_URL, localizedUrl, type Locale } from "@/lib/site-config";

export type ArticleAuthor = {
  name: string;
  /** Slug trang /pilots/<slug>. */
  pilotSlug: string;
  jobTitle: Record<Locale, string>;
};

const AUTHORS: Record<string, ArticleAuthor> = {
  "Đặng Văn Mỹ": {
    name: "Đặng Văn Mỹ",
    pilotSlug: "dang-van-my",
    jobTitle: {
      vi: "Phi công dù lượn, huấn luyện viên",
      en: "Paragliding pilot and instructor",
      fr: "Pilote de parapente et moniteur",
      ru: "Пилот параплана и инструктор",
      zh: "滑翔伞飞行员、教练",
      hi: "पैराग्लाइडिंग पायलट और प्रशिक्षक",
    },
  },
};

/** Tên chung của thương hiệu — bài mang tên này coi là do tổ chức viết. */
const BRAND_AUTHOR_NAMES = new Set(["", "admin", "mebayluon", "mebayluon team", "mebayluon paragliding"]);

export function findArticleAuthor(name: string | null | undefined): ArticleAuthor | null {
  const key = String(name ?? "").normalize("NFC").trim();
  return AUTHORS[key] ?? null;
}

export function isBrandAuthor(name: string | null | undefined): boolean {
  return BRAND_AUTHOR_NAMES.has(String(name ?? "").trim().toLowerCase());
}

/** @id của Person ở trang hồ sơ — KHÔNG kèm tiền tố ngôn ngữ, mọi bản dùng chung. */
export function pilotPersonId(pilotSlug: string): string {
  return `${SITE_URL}/pilots/${pilotSlug}#person`;
}

export function authorProfileUrl(a: ArticleAuthor, locale: Locale): string {
  return localizedUrl(`/pilots/${a.pilotSlug}`, locale);
}

/** Nhãn dòng tác giả dưới tiêu đề bài. */
export const AUTHOR_LABEL: Record<Locale, string> = {
  vi: "Tác giả",
  en: "Author",
  fr: "Auteur",
  ru: "Автор",
  zh: "作者",
  hi: "लेखक",
};
