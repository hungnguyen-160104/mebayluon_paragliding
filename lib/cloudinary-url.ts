// lib/cloudinary-url.ts
/**
 * Gắn phép biến đổi Cloudinary vào URL ảnh lúc RENDER (SEO 01/10/2026).
 *
 * Ảnh trong bài viết lưu nguyên URL gốc Cloudinary (…/image/upload/v123/x.png)
 * nên khách tải đúng tệp gốc: 428 ảnh > 500 KB, 65 ảnh > 2 MB, PNG 4 MB. Chèn
 * `f_auto,q_auto,c_limit,w_1600` thì Cloudinary tự đổi sang WebP/AVIF, nén vừa
 * mắt và thu ảnh to hơn 1600px về 1600px (c_limit không phóng ảnh nhỏ lên).
 *
 * Không đụng dữ liệu trong DB — chỉ đổi URL khi xuất HTML. File thuần TS, dùng
 * được cả server lẫn client.
 *
 * URL đã có sẵn phép biến đổi (người biên tập tự gõ, vd `w_800,c_fill`): GIỮ
 * nguyên chuỗi đó và chỉ nối thêm một bước phía sau cho phần còn thiếu
 * (định dạng/chất lượng/trần bề rộng) — không ghi đè ý đồ cắt ảnh của họ.
 */

const CLOUDINARY_UPLOAD = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/i;

/** Một đoạn biến đổi: "w_800,c_fill" / "f_auto" … (không phải "v123" hay tên tệp). */
const TRANSFORM_SEGMENT = /^(?:[a-z]{1,3}_[^/,]+)(?:,[a-z]{1,3}_[^/,]+)*$/i;

export function isCloudinaryImage(url: string | null | undefined): boolean {
  return CLOUDINARY_UPLOAD.test(String(url || ""));
}

/**
 * @param url    URL bất kỳ — không phải ảnh Cloudinary thì trả nguyên.
 * @param width  Trần bề rộng (mặc định 1600).
 */
export function cloudinaryOptimize(url: string, width = 1600): string {
  return withTransform(url, (existing) => {
    const has = (p: string) => existing.some((seg) => seg.split(",").some((t) => t.startsWith(p)));
    const parts: string[] = [];
    if (!has("f_")) parts.push("f_auto");
    if (!has("q_")) parts.push("q_auto");
    if (!has("w_") && !has("h_")) parts.push("c_limit", `w_${width}`);
    return parts;
  });
}

/**
 * Ảnh chia sẻ (og:image): 1200×630 đúng khung Facebook/Zalo, JPEG ~q80 để
 * nhẹ (thẻ xem trước của Zalo/WhatsApp hay hỏng khi ảnh > 300 KB–1 MB).
 * g_auto để Cloudinary tự chọn vùng đáng giữ khi cắt.
 */
export function cloudinaryOgImage(url: string): string {
  return withTransform(url, () => ["c_fill", "g_auto", "w_1200", "h_630", "f_jpg", "q_80"]);
}

function withTransform(url: string, build: (existing: string[]) => string[]): string {
  const raw = String(url || "");
  const m = CLOUDINARY_UPLOAD.exec(raw);
  if (!m) return raw;
  // SVG: f_auto sẽ raster hoá — để nguyên
  if (/\.svg(\?|#|$)/i.test(raw)) return raw;

  const [, prefix, rest] = m;
  const segments = rest.split("/");
  const existing: string[] = [];
  while (segments.length > 1 && TRANSFORM_SEGMENT.test(segments[0])) {
    existing.push(segments.shift() as string);
  }

  const added = build(existing);
  if (added.length === 0) return raw;

  return `${prefix}${[...existing, added.join(","), ...segments].join("/")}`;
}

/**
 * Viết lại mọi <img> trong HTML bài viết cũ:
 *  - src / srcset Cloudinary → bản đã tối ưu,
 *  - thêm loading="lazy" + decoding="async" nếu chưa có (ảnh trong thân bài
 *    luôn nằm dưới ảnh bìa, tức ngoài màn hình đầu).
 * Giữ nguyên width/height sẵn có; HTML cũ không có kích thước thì không đoán.
 */
export function optimizeContentImages(html: string): string {
  return String(html || "").replace(/<img\b[^>]*>/gi, (tag) => {
    let out = tag.replace(
      /\b(src)\s*=\s*("([^"]*)"|'([^']*)')/i,
      (_all, attr: string, _q: string, d?: string, s?: string) => {
        const v = d ?? s ?? "";
        return `${attr}="${cloudinaryOptimize(v)}"`;
      },
    );
    out = out.replace(
      /\b(srcset)\s*=\s*("([^"]*)"|'([^']*)')/i,
      (_all, attr: string, _q: string, d?: string, s?: string) => {
        const v = d ?? s ?? "";
        const next = v
          .split(",")
          .map((part) => {
            const [u, ...desc] = part.trim().split(/\s+/);
            return [cloudinaryOptimize(u), ...desc].join(" ");
          })
          .join(", ");
        return `${attr}="${next}"`;
      },
    );
    if (!/\bloading\s*=/i.test(out)) out = out.replace(/<img\b/i, '<img loading="lazy"');
    if (!/\bdecoding\s*=/i.test(out)) out = out.replace(/<img\b/i, '<img decoding="async"');
    return out;
  });
}
