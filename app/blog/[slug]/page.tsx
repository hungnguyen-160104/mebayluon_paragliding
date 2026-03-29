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
  return (await getPostBySlug(slug)) as Post | null;
}

/** ===== SEO: generateMetadata ===== */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await fetchPostBySlug(slug).catch(() => null);

  if (!post) {
    return { title: "Bài viết không tồn tại" };
  }

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
 * ===== Page: Blog post detail =====
 * Ảnh bìa hiển thị full chiều ngang, giữ nguyên tỉ lệ, không crop
 */
export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await fetchPostBySlug(slug);

  if (!post) notFound();

  return (
    <main
      className="relative min-h-screen w-full bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: "url('/images/mebayluon.jpg')",
      }}
    >
      <div className="absolute inset-0 z-0 bg-black/30" />

      <div className="container mx-auto relative z-10 px-4 pt-28 pb-16">
        <div className="max-w-none rounded-2xl border border-white/10 bg-black/20 p-6 text-white shadow-xl backdrop-blur-lg md:p-10">
          <h1 className="not-prose mb-4 text-3xl font-bold text-white md:text-4xl">
            {post.title}
          </h1>

          <div className="not-prose mb-6 text-sm text-gray-300">
            {new Date(post.publishedAt ?? post.createdAt).toLocaleDateString(
              "vi-VN"
            )}{" "}
            • {post.views ?? 0} lượt xem
          </div>

          {post.coverImage && (
            <div className="not-prose mb-6 w-full overflow-hidden rounded-lg bg-white/5">
              <Image
                src={post.coverImage}
                alt={post.title}
                width={1600}
                height={900}
                priority
                className="h-auto w-full rounded-lg"
                style={{
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>
          )}

          <article
            className="prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: String(post.content || "") }}
          />

          <hr className="my-8" />

          <div className="not-prose text-white">
            <RelatedPosts
              idOrSlug={post._id || post.slug}
              title="Bài viết liên quan"
              limit={4}
              hrefBuilder={(s) => `/blog/${s}`}
            />
          </div>
        </div>
      </div>
    </main>
  );
}