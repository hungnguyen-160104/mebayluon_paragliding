// /app/fixed/[key]/page.tsx
import { redirect, notFound } from "next/navigation";
import { getServerBaseUrl } from "@/lib/server-base";

const FIXED_KEYS = new Set([
  "hoa-binh",
  "ha-noi",
  "mu-cang-chai",
  "yen-bai",
  "da-nang",
  "sapa",
]);

export default async function FixedAliasPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  if (!FIXED_KEYS.has(key)) notFound();

  const base = await getServerBaseUrl();
  const url = `${base}/api/posts?isPublished=true&category=news&fixed=true&fixedKey=${encodeURIComponent(
    key
  )}&limit=1&sort=-publishedAt,-createdAt`;

  const res = await fetch(url, { next: { revalidate: 120 } });
  if (!res.ok) notFound();

  const data = await res.json();
  const item = Array.isArray(data?.items) ? data.items[0] : undefined;
  if (!item?.slug) notFound();

  redirect(`/blog/${item.slug}`);
}
