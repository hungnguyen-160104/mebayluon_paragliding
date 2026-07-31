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

export const STORE_CATEGORY_CONFIG: StoreCategoryConfig[] = [
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

/**
 * Chữ trên thẻ sản phẩm và trang chi tiết sản phẩm.
 * Trước đây các trang này dùng `isVietnamese ? "..." : "..."` — chỉ 2 nhánh
 * nên khách Pháp/Nga/Trung/Ấn đều nhận bản tiếng Anh.
 */
export type ProductUiTexts = {
  price: string;
  details: string;
  contact: string;
  back: string;
  noDescription: string;
  orderNow: string;
  moreProducts: string;
  relatedProducts: string;
};

export const PRODUCT_UI: Record<StoreLang, ProductUiTexts> = {
  vi: {
    price: "Giá: ",
    details: "Chi tiết",
    contact: "Liên hệ",
    back: "Quay lại",
    noDescription: "Sản phẩm chưa có mô tả.",
    orderNow: "Liên hệ đặt mua",
    moreProducts: "Xem thêm sản phẩm",
    relatedProducts: "Sản phẩm liên quan",
  },
  en: {
    price: "Price: ",
    details: "Details",
    contact: "Contact",
    back: "Back",
    noDescription: "No description available.",
    orderNow: "Contact to order",
    moreProducts: "More products",
    relatedProducts: "Related products",
  },
  fr: {
    price: "Prix : ",
    details: "Détails",
    contact: "Contact",
    back: "Retour",
    noDescription: "Aucune description disponible.",
    orderNow: "Nous contacter pour commander",
    moreProducts: "Voir plus de produits",
    relatedProducts: "Produits similaires",
  },
  ru: {
    price: "Цена: ",
    details: "Подробнее",
    contact: "Связаться",
    back: "Назад",
    noDescription: "Описание отсутствует.",
    orderNow: "Связаться для заказа",
    moreProducts: "Другие товары",
    relatedProducts: "Похожие товары",
  },
  zh: {
    price: "价格：",
    details: "详情",
    contact: "联系",
    back: "返回",
    noDescription: "暂无产品描述。",
    orderNow: "联系订购",
    moreProducts: "查看更多产品",
    relatedProducts: "相关产品",
  },
  hi: {
    price: "क़ीमत: ",
    details: "विवरण",
    contact: "संपर्क",
    back: "वापस",
    noDescription: "कोई विवरण उपलब्ध नहीं है।",
    orderNow: "ऑर्डर के लिए संपर्क करें",
    moreProducts: "और उत्पाद देखें",
    relatedProducts: "संबंधित उत्पाद",
  },
};

/** Định dạng ngày/số theo ngôn ngữ cửa hàng. */
export const STORE_LOCALE: Record<StoreLang, string> = {
  vi: "vi-VN", en: "en-US", fr: "fr-FR", ru: "ru-RU", zh: "zh-CN", hi: "hi-IN",
};

export function getProductUi(lang: unknown): ProductUiTexts {
  const code = String(lang ?? "vi").slice(0, 2).toLowerCase() as StoreLang;
  return PRODUCT_UI[code] ?? PRODUCT_UI.vi;
}

export function getStoreLocale(lang: unknown): string {
  const code = String(lang ?? "vi").slice(0, 2).toLowerCase() as StoreLang;
  return STORE_LOCALE[code] ?? STORE_LOCALE.vi;
}
