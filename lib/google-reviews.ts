// lib/google-reviews.ts
/**
 * Lấy điểm sao + số đánh giá THẬT từ Google cho bong bóng review ở trang
 * điểm bay, thay cho con số gõ tay (trước đây nhập tháng 02/2026 nên càng
 * ngày càng lệch so với Google).
 *
 * Cần biến môi trường GOOGLE_PLACES_API_KEY (Places API New, Google Cloud).
 * KHÔNG có key thì hàm trả về số dự phòng bên dưới — trang vẫn chạy bình
 * thường, chỉ là số không tự cập nhật.
 *
 * Chính xác nhất là khai thẳng place ID qua env (xem PLACE_ID_ENV). Nếu
 * không khai, hàm tự tìm địa điểm theo tên + toạ độ; place ID tìm được sẽ
 * được ghi ra log server để bạn dán vào env cho lần sau.
 *
 * Kết quả được cache 6 tiếng (fetch next.revalidate) nên không tốn quota
 * dù có bao nhiêu lượt truy cập.
 */

export type SpotReviewId = "sapa" | "khau-pha" | "clubhouse";

export type SpotReviewData = {
  rating: number;
  reviews: number | null;
  /** true khi số lấy được từ Google, false khi đang dùng số dự phòng. */
  live: boolean;
};

/** Cache 6 tiếng — đủ tươi mà gần như không tốn quota Places API. */
const REVALIDATE_SECONDS = 6 * 60 * 60;

type SpotConfig = {
  /** Tên dùng để tìm trên Google khi chưa khai place ID. */
  query: string;
  lat: number;
  lng: number;
  /** Biến env khai thẳng place ID (chính xác tuyệt đối). */
  placeIdEnv: string;
  /** Số dự phòng khi chưa có API key hoặc Google lỗi. */
  fallback: { rating: number; reviews: number };
};

const SPOTS: Record<SpotReviewId, SpotConfig> = {
  sapa: {
    query: "Sapa Paragliding - Điểm Cất cánh Dù Lượn Sapa",
    lat: 22.3219262,
    lng: 103.8766636,
    placeIdEnv: "GOOGLE_PLACE_ID_SAPA",
    fallback: { rating: 4.9, reviews: 36 },
  },
  "khau-pha": {
    query: "Điểm Bay Dù Lượn Khau Phạ",
    lat: 21.7549587,
    lng: 104.2655369,
    placeIdEnv: "GOOGLE_PLACE_ID_KHAU_PHA",
    fallback: { rating: 4.4, reviews: 1552 },
  },
  /**
   * HOMESTAY CLUBHOUSE — hồ sơ Google RIÊNG, không phải điểm bay.
   *
   * Trước đây bong bóng đánh giá của trang /homestay gõ cứng 4,6 · 93 lượt
   * ngay trong giao diện, nên nó KHÔNG chạy qua đường lấy điểm sống này và
   * càng ngày càng lệch — đúng cái bệnh mà tệp này sinh ra để chữa.
   */
  clubhouse: {
    query: "Clubhouse Mebayluon Paragliding",
    lat: 21.7764187,
    lng: 104.2636752,
    placeIdEnv: "GOOGLE_PLACE_ID_CLUBHOUSE",
    fallback: { rating: 4.6, reviews: 93 },
  },
};

function fallbackOf(spot: SpotReviewId): SpotReviewData {
  const f = SPOTS[spot].fallback;
  return { rating: f.rating, reviews: f.reviews, live: false };
}

/** Đọc rating/userRatingCount từ một object place của Places API (New). */
function readPlace(place: unknown): { rating: number; reviews: number } | null {
  if (!place || typeof place !== "object") return null;
  const p = place as { rating?: unknown; userRatingCount?: unknown };
  const rating = typeof p.rating === "number" ? p.rating : null;
  const reviews =
    typeof p.userRatingCount === "number" ? p.userRatingCount : null;
  if (rating == null) return null;
  return { rating, reviews: reviews ?? 0 };
}

/** Tra theo place ID — cách chính xác nhất. */
async function fetchByPlaceId(
  placeId: string,
  apiKey: string
): Promise<SpotReviewData | null> {
  const res = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "rating,userRatingCount,displayName",
      },
      next: { revalidate: REVALIDATE_SECONDS },
    }
  );

  if (!res.ok) {
    console.error(
      `[google-reviews] places/${placeId} lỗi ${res.status}: ${await res.text()}`
    );
    return null;
  }

  const data = readPlace(await res.json());
  return data ? { ...data, live: true } : null;
}

/** Tìm theo tên + toạ độ khi chưa khai place ID. */
async function fetchBySearch(
  cfg: SpotConfig,
  apiKey: string
): Promise<SpotReviewData | null> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.rating,places.userRatingCount",
    },
    body: JSON.stringify({
      textQuery: cfg.query,
      maxResultCount: 1,
      locationBias: {
        circle: {
          center: { latitude: cfg.lat, longitude: cfg.lng },
          radius: 1000,
        },
      },
    }),
    next: { revalidate: REVALIDATE_SECONDS },
  });

  if (!res.ok) {
    console.error(
      `[google-reviews] searchText lỗi ${res.status}: ${await res.text()}`
    );
    return null;
  }

  const json = (await res.json()) as { places?: unknown[] };
  const first = Array.isArray(json.places) ? json.places[0] : null;
  const data = readPlace(first);
  if (!data) return null;

  // Ghi place ID ra log để có thể "ghim" vào env, khỏi phải tìm lại mỗi lần
  const id = (first as { id?: string })?.id;
  if (id) {
    console.info(
      `[google-reviews] "${cfg.query}" -> place ID ${id}. ` +
        `Khai ${cfg.placeIdEnv}=${id} để tra chính xác tuyệt đối.`
    );
  }

  return { ...data, live: true };
}

/**
 * Điểm sao + số đánh giá của một điểm bay.
 * Không bao giờ ném lỗi — hỏng ở đâu cũng rơi về số dự phòng.
 */
export async function getSpotReview(
  spot: SpotReviewId
): Promise<SpotReviewData> {
  const cfg = SPOTS[spot];
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) return fallbackOf(spot);

  try {
    const placeId = process.env[cfg.placeIdEnv];
    const result = placeId
      ? await fetchByPlaceId(placeId, apiKey)
      : await fetchBySearch(cfg, apiKey);

    return result ?? fallbackOf(spot);
  } catch (err) {
    console.error("[google-reviews] lỗi khi gọi Places API:", err);
    return fallbackOf(spot);
  }
}
