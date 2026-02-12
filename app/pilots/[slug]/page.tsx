// app/pilots/[slug]/page.tsx

import { pilots, Pilot } from "@/lib/pilots-data"
import { notFound } from "next/navigation"
import PilotDetailClientPage from "@/components/pilot-detail-page" // Bước 1: Import component client mới

// Helper function để lấy dữ liệu phi công bằng slug
function getPilotBySlug(slug: string): Pilot | undefined {
  return pilots.find((pilot) => pilot.slug === slug)
}

// generateStaticParams VẪN GIỮ Ở ĐÂY (file server)
export async function generateStaticParams() {
  return pilots.map((pilot) => ({
    slug: pilot.slug,
  }))
}

// Props cho trang động
interface PilotDetailPageProps {
  params: {
    slug: string
  }
}

// Đây là Server Component, nó chạy ở server
export default function PilotDetailPage({ params }: PilotDetailPageProps) {
  const pilotData = getPilotBySlug(params.slug)

  // Nếu không tìm thấy phi công, hiển thị trang 404
  if (!pilotData) {
    notFound()
  }

  // Bước 2: Render Client Component và truyền data xuống
  return <PilotDetailClientPage pilotData={pilotData} />
}