// components/FixedSpotLinks.tsx
export type FixedKey = "hoa-binh" | "ha-noi" | "mu-cang-chai" | "yen-bai" | "da-nang" | "sapa";

export const FIXED_SPOTS: { key: FixedKey; label: string }[] = [
  { key: "hoa-binh", label: "Viên Nam – Hòa Bình" },
  { key: "ha-noi", label: "Đồi Bù – Chương Mỹ – Hà Nội" },
  { key: "mu-cang-chai", label: "Khau Phạ – Mù Cang Chải – Yên Bái" },
  { key: "yen-bai", label: "Trạm Tấu – Yên Bái" },
  { key: "da-nang", label: "Sơn Trà – Đà Nẵng" },
  { key: "sapa", label: "Sapa, Lào Cai, Vietnam" },
];

export const fixedHref = (key: FixedKey) => `/fixed/${key}`;
