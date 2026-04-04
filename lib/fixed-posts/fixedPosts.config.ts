// lib/fixed-posts/fixedPosts.config.ts
import type { FixedKey } from "@/models/Post.model";

export type FixedPostConfig = {
  key: FixedKey;
  title: string;
};

export const FIXED_POSTS: FixedPostConfig[] = [
  { key: "hoa-binh", title: "Bay tại Viên Nam - Hòa Bình" },
  { key: "ha-noi", title: "Bay tại Đồi Bù - Hà Nội" },
  { key: "mu-cang-chai", title: "Bay tại Khau Phạ - Mù Cang Chải" },
  { key: "yen-bai", title: "Bay tại Trạm Tấu - Yên Bái" },
  { key: "da-nang", title: "Bay tại Sơn Trà - Đà Nẵng" },
  { key: "sapa", title: "Bay tại Sapa - Lào Cai" },
];

export const FIXED_ORDER = new Map<FixedKey, number>(
  FIXED_POSTS.map((post, index) => [post.key, index] as const)
);