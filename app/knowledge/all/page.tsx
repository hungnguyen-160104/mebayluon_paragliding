import Image from 'next/image';
import Link from 'next/link';
import KnowledgeTabs from '../KnowledgeTabs';
import { getPosts } from '@/lib/posts-data';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

const fmt = (s?: string) =>
  s ? new Date(s).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

async function fetchPosts() {
  // Gọi trực tiếp database thay vì fetch qua HTTP
  const data = await getPosts({
    category: 'knowledge',
    isPublished: true,
    sort: '-publishedAt,-createdAt',
    limit: 100, // Lấy nhiều hơn để hiển thị tất cả
  });
  return { items: data.items || [] };
}

export default async function KnowledgeAllPage() {
  const data = await fetchPosts();

  return (
    <div className="min-h-screen relative bg-cover bg-center" style={{ backgroundImage: "url('/hinh-nen.jpg')" }}>
      <div className="absolute inset-0 bg-black/35" />
      <main className="relative z-10 container mx-auto px-4 py-14 text-white">
        <h1 className="text-5xl md:text-6xl font-extrabold text-center drop-shadow mb-8">Kiến thức dù lượn</h1>

        <KnowledgeTabs />

        {data.items?.length ? (
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-8">
            {data.items.map((p: any) => (
              <li key={p._id} className="group">
                <Link href={`/blog/${p.slug}`}>
                  <div className="bg-white/12 border border-white/25 rounded-lg overflow-hidden backdrop-blur-md hover:bg-white/20 transition hover:scale-[1.01]">
                    {p.coverImage && (
                      <div className="relative h-48 w-full">
                        <Image src={p.coverImage} alt={p.title} fill className="object-cover" />
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="text-xl font-bold mb-2 line-clamp-2">{p.title}</h3>
                      <div className="text-sm text-white/75 flex items-center gap-4 mb-2">
                        <span>{fmt(p.publishedAt || p.createdAt)}</span>
                        <span>{p.views ?? 0} lượt xem</span>
                      </div>
                      <p className="text-white/85 text-sm line-clamp-3">
                        {String(p.content || '').replace(/<[^>]*>/g, '').slice(0, 120)}…
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-white/80 mt-10">Chưa có bài viết nào.</p>
        )}
      </main>
    </div>
  );
}
