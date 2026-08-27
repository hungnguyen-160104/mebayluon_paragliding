// lib/tripadvisor-reviews.ts
/**
 * Điểm sao + số đánh giá THẬT từ Tripadvisor cho bong bóng ở trang điểm bay —
 * làm y hệt lib/google-reviews.ts, để hai bong bóng cạnh nhau không phải một
 * cái tự cập nhật còn một cái gõ tay rồi lệch dần.
 *
 * Cần biến môi trường TRIPADVISOR_API_KEY (Tripadvisor Content API, đăng ký ở
 * tripadvisor.com/developers, gói miễn phí 5.000 lượt/tháng). KHÔNG có key thì
 * hàm trả về số gõ tay trong SPOT_TRIPADVISOR_RATING — trang vẫn chạy bình
 * thường, chỉ là số không tự cập nhật.
 *
 * MÃ ĐỊA ĐIỂM chính là số sau chữ "d" trong đường dẫn Tripadvisor, không phải
 * đi tìm ở đâu cả:
 *    .../Attraction_Review-g8146384-d34094462-Reviews-...  ->  34094462
 *
 * VƯỚNG CẦN BIẾT: Tripadvisor bắt giới hạn key theo IP máy chủ hoặc theo tên
 * miền gọi tới. Vercel chạy serverless nên IP đổi liên tục, không khai cố định
 * được — phải giới hạn theo tên miền, hoặc mua IP tĩnh. Key hết hạn mức hay bị
 * từ chối thì hàm này lặng lẽ rơi về số gõ tay, KHÔNG làm vỡ trang.
 *
 * Cache 6 tiếng nên dù bao nhiêu lượt truy cập cũng chỉ tốn vài lượt gọi/ngày.
 */
import { SPOT_TRIPADVISOR_RATING } from "./spot-partner-links";

export type TripadvisorReviewData = {
  rating: number;
  reviews: number | null;
  /** true khi số lấy được từ Tripadvisor, false khi đang dùng số gõ tay. */
  live: boolean;
  /** Ngày người ta soát tay lần cuối — chỉ có nghĩa khi `live` là false. */
  checkedOn?: string;
};

/** Cache 6 tiếng — đủ tươi mà gần như không tốn hạn mức. */
const REVALIDATE_SECONDS = 6 * 60 * 60;

/**
 * MÃ ĐỊA ĐIỂM TRIPADVISOR của từng điểm bay.
 *
 * Lấy từ trang ĐÁNH GIÁ (Attraction_Review), không lấy trang sản phẩm
 * (AttractionProductReview): trang đánh giá là hồ sơ của cả điểm bay, gom mọi
 * lượt đánh giá; trang sản phẩm chỉ có đánh giá của đúng một tour.
 */
export const TRIPADVISOR_LOCATION_ID: Record<string, string> = {
  "khau-pha": "34094462",
  "doi-bu": "27966587",
  "vien-nam": "27966587",
  "muong-hoa-sapa": "33242005",
};

function fallbackOf(slug: string): TripadvisorReviewData {
  const manual = SPOT_TRIPADVISOR_RATING[slug];
  if (!manual) return { rating: 0, reviews: null, live: false };
  return { rating: manual.rating, reviews: null, live: false, checkedOn: manual.checkedOn };
}

/**
 * Đọc rating/num_reviews từ phần trả lời của Content API.
 *
 * `num_reviews` về dưới dạng CHUỖI ("1552"), không phải số — đọc thẳng như số
 * là ra NaN rồi bong bóng in ra chữ "NaN đánh giá".
 */
function readDetails(data: unknown): { rating: number; reviews: number | null } | null {
  if (!data || typeof data !== "object") return null;
  const d = data as { rating?: unknown; num_reviews?: unknown };
  const rating = typeof d.rating === "number" ? d.rating : Number(d.rating);
  if (!Number.isFinite(rating) || rating <= 0) return null;
  const n = Number(d.num_reviews);
  return { rating, reviews: Number.isFinite(n) && n > 0 ? n : null };
}

/**
 * Điểm Tripadvisor của một điểm bay. KHÔNG BAO GIỜ ném lỗi: hỏng đường mạng,
 * hết hạn mức, key sai — tất cả đều rơi về số gõ tay. Bong bóng đánh giá không
 * đáng để làm sập cả trang điểm bay.
 */
export async function getTripadvisorReview(
  slug?: string | null,
): Promise<TripadvisorReviewData> {
  const key = slug ? TRIPADVISOR_LOCATION_ID[slug] : undefined;
  if (!slug || !key) return { rating: 0, reviews: null, live: false };

  const apiKey = process.env.TRIPADVISOR_API_KEY;
  if (!apiKey) return fallbackOf(slug);

  try {
    const res = await fetch(
      `https://api.content.tripadvisor.com/api/v1/location/${key}/details?language=vi&key=${encodeURIComponent(apiKey)}`,
      {
        headers: { accept: "application/json" },
        next: { revalidate: REVALIDATE_SECONDS },
      },
    );
    if (!res.ok) {
      console.warn(`[tripadvisor] ${slug}: HTTP ${res.status} — dùng số gõ tay`);
      return fallbackOf(slug);
    }
    const parsed = readDetails(await res.json());
    if (!parsed) return fallbackOf(slug);
    return { rating: parsed.rating, reviews: parsed.reviews, live: true };
  } catch (e) {
    console.warn("[tripadvisor] không gọi được API:", e instanceof Error ? e.message : e);
    return fallbackOf(slug);
  }
}
