// app/pilots/[slug]/page.tsx

import type { Metadata } from "next";
import { pilots, Pilot, REMOVED_PILOT_SLUGS } from "@/lib/pilots-data"
import { notFound } from "next/navigation"
import PilotDetailClientPage from "@/components/pilot-detail-page"
import { buildMetadata, generateBreadcrumbSchema, generatePilotSchema } from "@/lib/metadata-builder"
import { getUrlLocale } from "@/lib/locale"

// Helper function để lấy dữ liệu phi công bằng slug
function getPilotBySlug(slug: string): Pilot | undefined {
  if (REMOVED_PILOT_SLUGS.has(slug)) return undefined
  return pilots.find((pilot) => pilot.slug === slug && !REMOVED_PILOT_SLUGS.has(pilot.slug))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const pilot = getPilotBySlug(slug);
  if (!pilot) return { title: "Phi công | Mebayluon" };

  const locale = await getUrlLocale();

  return buildMetadata({
    title: `${pilot.name} - ${pilot.role.vi} | Mebayluon`,
    description: `${pilot.bio.vi.slice(0, 155)}…`,
    image: pilot.avatar,
    url: `/pilots/${slug}`,
    type: "website",
    locale,
  });
}

// generateStaticParams VẪN GIỮ Ở ĐÂY (file server)
export async function generateStaticParams() {
  return pilots
    .filter((pilot) => !REMOVED_PILOT_SLUGS.has(pilot.slug))
    .map((pilot) => ({
    slug: pilot.slug,
  }))
}

// Props cho trang động
interface PilotDetailPageProps {
  params: Promise<{
    slug: string
  }>
}

// Đây là Server Component, nó chạy ở server
export default async function PilotDetailPage({ params }: PilotDetailPageProps) {
  const { slug } = await params;
  const pilotData = getPilotBySlug(slug)

  // Nếu không tìm thấy phi công, hiển thị trang 404
  if (!pilotData) {
    notFound()
  }

  const personSchema = generatePilotSchema({
    name: pilotData.name,
    nickname: pilotData.nickname.vi,
    role: pilotData.role.vi,
    bio: pilotData.bio.vi,
    image: pilotData.avatar,
    url: `/pilots/${slug}`,
    certificates: Array.isArray(pilotData.certificates?.vi) ? pilotData.certificates.vi : [],
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Trang chủ", url: "/" },
    { name: "Phi công", url: "/pilots" },
    { name: pilotData.name, url: `/pilots/${slug}` },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <PilotDetailClientPage pilotData={pilotData} />
    </>
  );
}