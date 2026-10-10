// lib/spot-hub.ts
/**
 * MỤC "CẨM NANG & BÀI VIẾT" Ở TRANG ĐIỂM BAY (/spots/<slug>) — 10/2026.
 *
 * Trước đây mục này là danh sách gõ tay (lib/spot-articles.ts), chỉ có ở 3
 * điểm bay và tiêu đề chép cứng vi/en. Nay gom từ DB theo trường `spots` của
 * bài viết, chia nhóm theo CỤM nội dung:
 *
 *   1. Bài nổi bật (chọn tay ở SPOT_ARTICLES[x].featured)
 *   2. Cẩm nang điểm bay — bài chỉ nói về điểm này (category news + du-lich)
 *   3. So sánh các điểm bay — bài cẩm nang nói về nhiều điểm một lúc (một hàng nhỏ)
 *   4. Cho phi công — bài kiến thức gắn điểm này + vài bài chọn tay hợp địa hình
 *   5. Giá & dịch vụ — bài dịch vụ/hỏi đáp + sản phẩm cửa hàng gắn điểm
 *   6. Tin tức & sự kiện — 4 bài mới nhất
 *
 * Nhóm rỗng thì ẩn. Không đổi URL bài, không đụng /knowledge hay /blog —
 * đây chỉ là một lối vào thêm theo điểm bay. Chỉ dùng phía máy chủ.
 */

import { getPosts } from "@/lib/posts-data";
import { categoryOfPost } from "@/lib/blog-categories";
import { chonTieuDe } from "@/lib/post-translation";
import { spotTagsOfPage } from "@/lib/spot-tags";
import { SPOT_ARTICLES, type SpotHubGroupKey } from "@/lib/spot-articles";
import type { Post } from "@/types/frontend/post";

export type PostCluster = "kien-thuc" | "cam-nang" | "tin-tuc" | "dich-vu";

/**
 * Cụm nội dung của một bài, suy ra từ các trường đang có (không lưu riêng):
 *  - sản phẩm cửa hàng → dịch vụ
 *  - category knowledge → kiến thức
 *  - bài blog: du-lich → cẩm nang; tip / dich-vu → dịch vụ; còn lại → tin tức
 */
export function clusterOf(post: Pick<Post, "slug" | "category" | "blogCategory" | "type">): PostCluster {
  if (post.type === "product" || post.category === "store") return "dich-vu";
  if (post.category === "knowledge") return "kien-thuc";
  const c = categoryOfPost(post);
  if (c === "du-lich") return "cam-nang";
  if (c === "tip" || c === "dich-vu") return "dich-vu";
  return "tin-tuc";
}

/**
 * Bài kiến thức CHUNG (không gắn điểm) hợp với địa hình/gió của từng điểm —
 * bổ sung cho nhóm "Cho phi công". Bài nào chưa xuất bản thì tự bị bỏ.
 */
const PILOT_PICKS: Record<string, string[]> = {
  "khau-pha": [
    "khi-quyen-bat-on-dinh-va-thermal-phan-1",
    "ky-thuat-bay-thermal-phan-1",
    "ky-thuat-ha-canh-du-luon",
    "thoi-tiet-bay-du-luon-phi-cong-can-xem-gi",
  ],
  "doi-bu": [
    "phong-tranh-thoi-lui",
    "nhieu-loan-phan-3-bay-trong-nhieu-loan",
    "kiem-tra-truoc-bay-va-cat-canh",
    "ky-thuat-cat-canh-reverse",
  ],
  "muong-hoa-sapa": [
    "cac-loai-may-du-luon",
    "thoi-tiet-bay-du-luon-phi-cong-can-xem-gi",
    "doc-bieu-do-skew-t-cho-du-luon",
  ],
  "ha-giang": [
    "phong-tranh-thoi-lui",
    "ky-thuat-ha-canh-du-luon",
  ],
  "tram-tau": [
    "khi-quyen-bat-on-dinh-va-thermal-phan-1",
    "thoi-tiet-bay-du-luon-phi-cong-can-xem-gi",
  ],
  "son-tra": [
    "phong-tranh-thoi-lui",
    "ky-thuat-cat-canh-reverse",
  ],
};

const PILOT_MAX = 6;
const EVENTS_MAX = 4;

export type SpotHubItem = {
  slug: string;
  href: string;
  title: string;
};

export type SpotHubData = {
  featured: SpotHubItem | null;
  groups: { key: SpotHubGroupKey; items: SpotHubItem[] }[];
};

function hrefOf(p: Post): string {
  if (p.type === "product") return `/store/${p.storeCategory ?? "all"}/${p.slug}`;
  return `/blog/${p.slug}`;
}

/**
 * Dữ liệu mục "Cẩm nang & bài viết" cho trang /spots/<page> (slug CHUẨN).
 * Trả null khi không có bài nào (DB lỗi hoặc điểm chưa có bài) — trang dùng
 * danh sách tĩnh cũ hoặc ẩn mục.
 */
export async function getSpotHub(page: string, lang: string): Promise<SpotHubData | null> {
  const tags = spotTagsOfPage(page);
  if (!tags.length) return null;

  const [tagged, picks] = await Promise.all([
    getPosts({
      forList: true,
      type: "all",
      isPublished: true,
      // Trang tiếng nước ngoài không liệt kê bài chỉ có tiếng Việt (lib/post-locales.ts)
      lang,
      spots: tags,
      limit: 200,
      sort: "-publishedAt,-createdAt",
    }),
    PILOT_PICKS[page]?.length
      ? getPosts({
          forList: true,
          type: "blog",
          category: "knowledge",
          isPublished: true,
          lang,
          slugs: PILOT_PICKS[page],
          limit: PILOT_PICKS[page].length,
        })
      : Promise.resolve({ items: [] as Post[] }),
  ]);

  const posts = (tagged.items ?? []) as Post[];
  if (!posts.length) return null;

  const item = (p: Post): SpotHubItem => ({
    slug: p.slug,
    href: hrefOf(p),
    title: chonTieuDe(p, lang),
  });

  // Thứ tự gõ tay ở SPOT_ARTICLES (nếu có) đứng trước, còn lại theo ngày mới → cũ
  const manual = SPOT_ARTICLES[page];
  const manualOrder = manual ? manual.articles.map((a) => a.slug) : [];
  const rank = (slug: string) => {
    const i = manualOrder.indexOf(slug);
    return i < 0 ? Number.MAX_SAFE_INTEGER : i;
  };
  const byManual = (a: Post, b: Post) => rank(a.slug) - rank(b.slug);

  const onlyHere = (p: Post) => (p.spots ?? []).every((s) => tags.includes(s as never));

  const featuredPost =
    (manual && posts.find((p) => p.slug === manual.featured.slug)) ||
    posts.find((p) => clusterOf(p) === "cam-nang" && onlyHere(p)) ||
    null;
  const used = new Set<string>(featuredPost ? [featuredPost.slug] : []);
  const take = (list: Post[]) => list.filter((p) => !used.has(p.slug) && (used.add(p.slug), true));

  const byCluster = (c: PostCluster) => posts.filter((p) => clusterOf(p) === c);

  const guides = take([...byCluster("cam-nang").filter(onlyHere)].sort(byManual));
  const compare = take(byCluster("cam-nang").filter((p) => !onlyHere(p)));

  const pickItems = ((picks.items ?? []) as Post[]).sort(
    (a, b) => PILOT_PICKS[page].indexOf(a.slug) - PILOT_PICKS[page].indexOf(b.slug),
  );
  // Bài hướng dẫn bay RIÊNG cho điểm này (vd 3 kịch bản gió Khau Phạ) đứng đầu
  const pilotTagged = byCluster("kien-thuc");
  const pilot = take([
    ...pilotTagged.filter(onlyHere),
    ...pilotTagged.filter((p) => !onlyHere(p)),
    ...pickItems,
  ]).slice(0, PILOT_MAX);

  const services = take(byCluster("dich-vu").filter(onlyHere).concat(byCluster("dich-vu").filter((p) => !onlyHere(p))));
  const events = take(byCluster("tin-tuc")).slice(0, EVENTS_MAX);

  const groups = (
    [
      { key: "guides", items: guides },
      { key: "compare", items: compare },
      { key: "pilot", items: pilot },
      { key: "services", items: services },
      { key: "events", items: events },
    ] as { key: SpotHubGroupKey; items: Post[] }[]
  )
    .filter((g) => g.items.length > 0)
    .map((g) => ({ key: g.key, items: g.items.map(item) }));

  return { featured: featuredPost ? item(featuredPost) : null, groups };
}
