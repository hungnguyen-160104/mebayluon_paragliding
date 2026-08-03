// lib/video-schema.ts
/**
 * Gom video nhúng trong bài viết và dựng schema VideoObject cho chúng.
 *
 * Lý do có file này: Search Console báo "Video không nằm trên trang xem" —
 * Google thấy video trên site nhưng không có dữ liệu có cấu trúc nào nói cho
 * nó biết video tên gì, ảnh đại diện ra sao, đăng ngày nào, nên không dựng
 * được trang xem để đưa vào tab Video. Trang bài viết dùng để gắn JSON-LD,
 * sitemap dùng để khai báo video cho Google tìm ra.
 */

import { SITE_URL } from "@/lib/site-config";
import type { ContentBlock } from "@/types/frontend/post";

export type PostVideo = {
  videoId: string;
  /** Tên video — ưu tiên chú thích của khối nhúng, không có thì lấy tiêu đề bài. */
  name: string;
  description: string;
  /** Ảnh đại diện: bản to trước, bản hqdefault sau vì bản này video nào cũng có. */
  thumbnailUrl: string[];
  embedUrl: string;
};

/** Rút video id từ mọi kiểu link YouTube (watch, youtu.be, embed, shorts, live). */
export function youTubeIdFrom(rawUrl: unknown): string | null {
  const value = String(rawUrl || "").trim();
  if (!value) return null;

  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    let id = "";

    if (host.includes("youtu.be")) {
      id = parsed.pathname.replace(/^\/+/, "").split("/")[0] || "";
    } else if (host.includes("youtube.com") || host.includes("youtube-nocookie.com")) {
      if (parsed.pathname.startsWith("/watch")) {
        id = parsed.searchParams.get("v") || "";
      } else {
        const m = parsed.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/);
        id = m?.[1] || "";
      }
    }

    id = id.replace(/[^a-zA-Z0-9_-]/g, "");
    return id || null;
  } catch {
    return null;
  }
}

/**
 * Quét các khối nội dung của bài, trả về video YouTube tìm được (bỏ trùng).
 * Chỉ nhận khối "embed" — khối nhúng Google Maps cũng đi qua đây nên phải
 * lọc bằng youTubeIdFrom chứ không tin vào embedType.
 */
export function collectPostVideos(
  blocks: ContentBlock[] | undefined,
  fallback: { title: string; description: string },
): PostVideo[] {
  if (!Array.isArray(blocks)) return [];

  const seen = new Set<string>();
  const videos: PostVideo[] = [];

  for (const block of blocks) {
    if (block?.type !== "embed") continue;

    const videoId = youTubeIdFrom(block.data?.url);
    if (!videoId || seen.has(videoId)) continue;
    seen.add(videoId);

    const caption = String(block.data?.caption || "").trim();

    videos.push({
      videoId,
      name: caption || fallback.title,
      // Tên đã là chú thích rồi nên mô tả lấy tóm tắt bài — để hai trường
      // trùng nhau vừa thừa vừa không nói thêm được gì cho Google.
      description: fallback.description || caption || fallback.title,
      thumbnailUrl: [
        `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      ],
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
    });
  }

  return videos;
}

/**
 * VideoObject cho một video nhúng trong bài.
 *
 * uploadDate lấy ngày đăng bài chứ không phải ngày up lên YouTube — YouTube
 * không cho biết ngày đó nếu không gọi API, mà Google lại bắt buộc có trường
 * này. Ngày đăng bài là mốc gần đúng và hợp lý nhất đang có.
 */
export function generateVideoSchema(
  video: PostVideo,
  opts: { pageUrl: string; uploadDate: Date },
) {
  const page = new URL(pathOf(opts.pageUrl), SITE_URL).toString();

  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.name,
    description: video.description,
    thumbnailUrl: video.thumbnailUrl,
    uploadDate: opts.uploadDate.toISOString(),
    // Chỉ khai embedUrl, KHÔNG khai contentUrl: Google quy định contentUrl
    // phải trỏ tới file video thật (.mp4...), mà video YouTube thì không có
    // file như vậy — khai link watch vào đó là sai chuẩn.
    embedUrl: video.embedUrl,
    // Nói rõ trang nào là trang xem của video — đúng chỗ Search Console đang
    // báo thiếu.
    mainEntityOfPage: { "@type": "WebPage", "@id": page },
    url: page,
  };
}

function pathOf(input: string) {
  return input.startsWith("http") ? new URL(input).pathname : input;
}
