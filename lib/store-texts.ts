// lib/store-texts.ts
import type { StoreCategory } from "@/types/frontend/post";

export type StoreLang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

export type MultiLangText = {
  vi: string;
  en: string;
  fr: string;
  ru: string;
  zh: string;
  hi: string;
};

export type StoreCategoryConfig = {
  key: StoreCategory | "all";
  title: MultiLangText;
};

export const STORE_TITLE: MultiLangText = {
  vi: "CỬA HÀNG",
  en: "STORE",
  fr: "BOUTIQUE",
  ru: "МАГАЗИН",
  zh: "商店",
  hi: "स्टोर",
};

export const EMPTY_CATEGORY_TEXT: MultiLangText = {
  vi: "Không có sản phẩm nào trong danh mục này.",
  en: "There are no products in this category.",
  fr: "Il n'y a aucun produit dans cette catégorie.",
  ru: "В этой категории нет товаров.",
  zh: "此分类暂无商品。",
  hi: "इस श्रेणी में कोई उत्पाद नहीं है।",
};

const STORE_CATEGORY_CONFIG: StoreCategoryConfig[] = [
  {
    key: "all",
    title: {
      vi: "Tất cả",
      en: "All",
      fr: "Tous",
      ru: "Все",
      zh: "全部",
      hi: "सभी",
    },
  },
  {
    key: "thiet-bi-bay",
    title: {
      vi: "Thiết bị bay",
      en: "Flying equipment",
      fr: "Équipement de vol",
      ru: "Оборудование для полётов",
      zh: "飞行装备",
      hi: "फ्लाइंग उपकरण",
    },
  },
  {
    key: "phu-kien",
    title: {
      vi: "Phụ kiện",
      en: "Accessories",
      fr: "Accessoires",
      ru: "Аксессуары",
      zh: "配件",
      hi: "एक्सेसरीज़",
    },
  },
  {
    key: "sach-du-luon",
    title: {
      vi: "Sách dù lượn",
      en: "Paragliding books",
      fr: "Livres de parapente",
      ru: "Книги о парапланеризме",
      zh: "滑翔伞书籍",
      hi: "पैराग्लाइडिंग पुस्तकें",
    },
  },
  {
    key: "khoa-hoc-du-luon",
    title: {
      vi: "Khoá học dù lượn",
      en: "Paragliding courses",
      fr: "Cours de parapente",
      ru: "Курсы по парапланеризму",
      zh: "滑翔伞课程",
      hi: "पैराग्लाइडिंग कोर्स",
    },
  },
];

// Key danh mục (bỏ "all") để gọi API khi chọn "Tất cả"
export const STORE_CATEGORY_KEYS_EXCEPT_ALL: StoreCategory[] =
  STORE_CATEGORY_CONFIG.map((c) => c.key).filter(
    (key): key is StoreCategory => key !== "all"
  );

export type StoreUiTexts = {
  title: string;
  emptyCategory: string;
  categories: { key: StoreCategory | "all"; title: string }[];
};

// Hàm lấy text theo lang
export function getStoreTexts(lang: StoreLang): StoreUiTexts {
  return {
    title: STORE_TITLE[lang],
    emptyCategory: EMPTY_CATEGORY_TEXT[lang],
    categories: STORE_CATEGORY_CONFIG.map((c) => ({
      key: c.key,
      title: c.title[lang],
    })),
  };
}