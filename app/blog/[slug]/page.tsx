import Image from "next/image";
import { notFound } from "next/navigation";
import RelatedPosts from "@/components/posts/RelatedPosts";
import { getPostBySlug } from "@/lib/posts-data";

/** ===== Types ===== */
type Post = {
  _id: string;
  title: string;
  content?: string;
  coverImage?: string;
  author?: string;
  category?: string | string[];
  tags?: string[];
  language?: string;
  slug: string;
  isPublished?: boolean;
  createdAt: string;
  publishedAt?: string;
  views?: number;
};

/** ===== Fetch post by slug ===== */
async function fetchPostBySlug(slug: string): Promise<Post | null> {
  // Gọi trực tiếp database thay vì fetch qua HTTP
  return await getPostBySlug(slug) as Post | null;
}

/** ===== SEO: generateMetadata ===== */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params; // 👈 phải await
  const post = await fetchPostBySlug(slug).catch(() => null);
  if (!post) return { title: "Bài viết không tồn tại" };

  const plain = String(post.content || "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const desc = plain.slice(0, 160);

  return {
    title: post.title,
    description: desc,
    openGraph: {
      title: post.title,
      description: desc,
      images: post.coverImage ? [{ url: post.coverImage }] : undefined,
    },
  };
}

/**
 * ===== Page: Blog post detail (Styled with Glassmorphism & BG Image) =====
 */
export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params; // 👈 phải await
  const post = await fetchPostBySlug(slug);
  if (!post) notFound();

  return (
    // ====== NỀN TRANG (BACKGROUND) ======
    <main
      className="relative min-h-screen w-full bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: "url('/images/mebayluon.jpg')",
      }}
    >
      {/* Lớp phủ mờ tối */}
      <div className="absolute inset-0 bg-black/30 z-0" />

      {/* ====== CONTAINER CĂN GIỮA ====== */}
      <div
        className="container mx-auto px-4 relative z-10 pt-28 pb-16" 
      >
        
        {/* ====== TẤM KÍNH MỜ (GLASS PANEL) ======
          - ⚠️ [SỬA LỖI 1]: Thêm 'text-white' để ép chữ mặc định là màu trắng
        */}
        <div className="prose prose-invert text-white bg-black/20 backdrop-blur-lg border border-white/10 rounded-2xl shadow-xl p-6 md:p-10 max-w-none">
          
          {/* Tiêu đề */}
          <h1 className="not-prose text-3xl md:text-4xl font-bold mb-4 text-white">
            {post.title}
          </h1>

          {/* Metadata */}
          <div className="not-prose text-sm text-gray-300 mb-6">
            {new Date(post.publishedAt ?? post.createdAt).toLocaleDateString(
              "vi-VN"
            )}{" "}
            • {post.views ?? 0} lượt xem
          </div>

          {/* Ảnh bìa */}
          {post.coverImage && (
            <div className="not-prose relative w-full h-64 md:h-96 mb-6">
              <Image
                src={post.coverImage}
                alt={post.title}
                fill
                className="object-cover rounded-lg"
                priority
              />
            </div>
          )}

          {/* Nội dung bài viết */}
          <article
            // ⚠️ [SỬA LỖI 2]: Xóa 'prose prose-invert'
            className="" 
            dangerouslySetInnerHTML={{ __html: String(post.content || "") }}
          />

          {/* Dấu gạch ngang */}
          <hr className="my-8" />

          {/* Bài viết liên quan */}
          <div className="not-prose text-white">
            <RelatedPosts
              idOrSlug={post._id || post.slug}
              title="Bài viết liên quan"
              limit={4}
              hrefBuilder={(s) => `/blog/${s}`}
            />
          </div>

        </div>
        {/* ====== HẾT TẤM KÍNH MỜ ====== */}
      </div>
      {/* ====== HẾT CONTAINER CĂN GIỮA ====== */}
    </main>
    // ====== HẾT NỀN TRANG ======
  );
}