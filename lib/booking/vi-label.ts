// lib/booking/vi-label.ts
import { LOCATIONS } from "@/lib/booking/calculate-price";

/**
 * Tên tiếng Việt của một dịch vụ / gói bay / loại hình bay, tra theo KHOÁ
 * trong cấu hình điểm bay.
 *
 * Nhãn đi kèm đơn hàng là nhãn khách nhìn thấy lúc đặt, tức theo ngôn ngữ
 * khách chọn. Mọi kênh báo đơn NỘI BỘ (email cho đội bay, tin Telegram) in
 * thẳng nhãn đó, nên đơn của khách Pháp về tới nơi là một mớ Việt lẫn Pháp:
 * "Gói bay: Forfait de vol", "Navette depuis Garrya". Tra ngược theo khoá
 * thì lấy được đúng tên tiếng Việt trong cấu hình, không phụ thuộc khách đặt
 * bằng tiếng gì.
 */
export function viFromConfig(location?: string, key?: string): string {
  const cfg = (LOCATIONS as any)?.[String(location || "")];
  if (!cfg || !key) return "";

  const wanted = String(key);
  const pools: any[] = [
    ...(cfg.services || []),
    ...(cfg.packages || []),
    ...(cfg.packages || []).flatMap((pkg: any) => pkg.flightTypes || []),
    ...(cfg.flightTypes || []),
  ];

  const found = pools.find((item) => String(item?.key || "") === wanted);
  return String(found?.label?.vi || "").trim();
}

/** Nhãn tiếng Việt cho những khoản không nằm trong cấu hình điểm bay. */
const EXTRA_VI_LABEL: Record<string, string> = {
  image_combo_discount: "Giảm combo ảnh",
  pickup: "Dịch vụ đón trả",
  flycam: "Flycam",
  camera360: "Camera 360",
  paragliding: "Bay dù không động cơ",
  paramotor: "Bay dù có động cơ",
};

/** Tên tiếng Việt, ưu tiên cấu hình rồi mới tới nhãn khách gửi lên. */
export function viLabel(location: string | undefined, key: unknown, fallback: unknown): string {
  const k = String(key || "");
  return (
    viFromConfig(location, k) ||
    EXTRA_VI_LABEL[k] ||
    String(fallback ?? "").trim()
  );
}
