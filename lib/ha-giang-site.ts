// lib/ha-giang-site.ts
/**
 * Web Hà Giang Paragliding MỚI của chủ (27/09/2026) — đang chạy ở tên miền
 * tạm trên Vercel. Có tên miền thật thì CHỈ SỬA MỘT DÒNG NÀY, mọi backlink từ
 * trang điểm bay Quản Bạ (khối Hà Giang Loop, bản đồ loop) tự đổi theo.
 *
 * KHÔNG dùng hagiangparagliding.com: đó là web của đối thủ.
 */
export const HA_GIANG_SITE_URL = "https://hagiangparagliding.vercel.app";

/** Trang một điểm dừng trên vòng loop của web Hà Giang, ví dụ "quan-ba". */
export const haGiangLoopStopUrl = (slug: string) =>
  `${HA_GIANG_SITE_URL}/ha-giang-loop/${slug}`;
