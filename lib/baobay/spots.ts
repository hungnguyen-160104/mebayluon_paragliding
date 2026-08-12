// lib/baobay/spots.ts
/**
 * Ba điểm bay chạy hệ thống báo bay. MỖI ĐIỂM LÀ MỘT HỆ THỐNG RIÊNG: báo cáo
 * riêng, đối chiếu riêng, chốt ngày riêng, bảng Google Sheets riêng.
 *
 * Một người có thể được chỉ định nhiều điểm (phi công bay cả Khau Phạ lẫn Sa Pa,
 * kế toán quản cả ba) — lúc báo cáo thì chọn đúng điểm của ngày hôm đó, số liệu
 * chỉ chảy vào điểm ấy.
 *
 * Trong cơ sở dữ liệu LUÔN lưu MÃ điểm bay ("khau-pha"), không lưu tên hiển thị:
 * đổi tên hiển thị sau này không làm hỏng dữ liệu cũ, và mã không dấu thì dùng
 * làm khoá, tên tab, tên tệp đều tiện.
 */

export const SPOTS = [
  { id: "ha-noi", name: "Hà Nội" },
  { id: "khau-pha", name: "Khau Phạ" },
  { id: "sapa", name: "Sa Pa" },
] as const;

export type SpotId = (typeof SPOTS)[number]["id"];

export const SPOT_IDS = SPOTS.map((s) => s.id) as SpotId[];

/** Điểm mặc định khi tài khoản chưa được chỉ định điểm nào. */
export const DEFAULT_SPOT: SpotId = "khau-pha";

export function isSpotId(value: unknown): value is SpotId {
  return typeof value === "string" && (SPOT_IDS as string[]).includes(value);
}

export function spotName(id: string): string {
  return SPOTS.find((s) => s.id === id)?.name ?? id;
}

/**
 * Đưa giá trị bất kỳ về mã điểm bay hợp lệ.
 *
 * Nhận cả TÊN hiển thị vì dữ liệu đợt đầu (khi hệ thống mới chỉ chạy một điểm)
 * lưu thẳng chuỗi "Khau Phạ" vào trường `spot`. Không có phép quy đổi này thì
 * mọi bản ghi cũ rơi ra ngoài bộ lọc theo điểm và biến mất khỏi báo cáo.
 */
export function normalizeSpot(value: unknown): SpotId {
  const raw = String(value ?? "").trim();
  if (isSpotId(raw)) return raw;

  const byName = SPOTS.find((s) => s.name.toLowerCase() === raw.toLowerCase());
  if (byName) return byName.id;

  // "Khau Pha", "khaupha", "SAPA"… — bỏ dấu và ký tự ngăn cách rồi so lại
  const flat = raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const loose = SPOTS.find(
    (s) =>
      s.id.replace(/-/g, "") === flat ||
      s.name
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "") === flat,
  );

  return loose?.id ?? DEFAULT_SPOT;
}

/** Lọc danh sách điểm được chỉ định cho một tài khoản, bỏ giá trị lạ và trùng. */
export function normalizeSpotList(value: unknown): SpotId[] {
  const list = Array.isArray(value) ? value : [value];
  const ids = list.filter((v) => v !== undefined && v !== null && v !== "").map(normalizeSpot);
  return [...new Set(ids)];
}
