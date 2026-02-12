// lib/fixed-posts/fixedPosts.config.ts
import type { FixedKey } from "@/models/Post.model";

export const FIXED_POSTS: { key: FixedKey; title: string }[] = [
  { key: "hoa-binh",     title: "Bay tại Viên Nam - Hòa Bình" },
  { key: "ha-noi",       title: "Bay tại Đồi Bù - Hà Nội" },
  { key: "mu-cang-chai", title: "Bay tại Khau Phạ - Mù Cang Chải" },
  { key: "yen-bai",      title: "Bay tại Trạm Tấu - Yên Bái" },
  { key: "da-nang",      title: "Bay tại Sơn Trà - Đà Nẵng" },
  { key: "sapa",         title: "Bay tại Sapa - Lào Cai" },
];

export const FIXED_ORDER = new Map(FIXED_POSTS.map((p, i) => [p.key, i]));
