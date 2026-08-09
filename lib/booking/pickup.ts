// lib/booking/pickup.ts
/**
 * Xác định khách CÓ đặt dịch vụ đón hay không, và tên điểm đón hiện ra.
 *
 * Trước đây vé và hai email mỗi nơi tự đoán một kiểu, và đều chỉ nhìn vào
 * `contact.pickupLocation` — tức địa chỉ khách tự gõ. Điểm đón CỐ ĐỊNH như
 * "GO! Thăng Long" không cần gõ địa chỉ nên trường đó rỗng, khiến email nội
 * bộ ghi "Không — khách tự tới điểm bay" trong khi bảng giá vẫn thu tiền xe
 * đón. Người trực đọc email đó là bỏ luôn chuyến xe.
 *
 * Nay mọi nơi dùng chung một hàm, nhận diện qua khoá và tên dịch vụ nên chạy
 * đúng cho cả điểm đón cố định lẫn đón tận nơi.
 */

import { shortServiceLabel } from "./service-label";

/** Khoá hoặc tên dịch vụ có những dấu hiệu này thì đó là dịch vụ đón trả. */
const PICKUP_KEY = /pickup|shuttle|don_tra|transfer/i;
const PICKUP_LABEL =
  /đón|trả|trung chuyển|shuttle|pickup|transfer|navette|трансфер|接送|पिकअप/i;

export function isPickupService(input: {
  key?: unknown;
  label?: unknown;
  exclusiveGroup?: unknown;
  requiresPickupInput?: unknown;
  fixedMapUrl?: unknown;
}): boolean {
  if (input.requiresPickupInput || input.fixedMapUrl) return true;
  if (PICKUP_KEY.test(String(input.key ?? ""))) return true;
  if (PICKUP_KEY.test(String(input.exclusiveGroup ?? ""))) return true;
  return PICKUP_LABEL.test(String(input.label ?? ""));
}

/**
 * Tên KHU VỰC đón, suy từ tên dịch vụ.
 *
 * Nhãn trong cấu hình ("Xe đón/trả từ TTTM GO! Thăng Long, Hà Nội", "Xe trung
 * chuyển xã Tú Lệ (Đón/Trả)") viết để GIẢI THÍCH cho khách lúc đang chọn ở
 * bước 1. Khi đã chốt thì tài xế chỉ cần biết khu vực, rồi tới địa chỉ cụ thể
 * khách nhập — nên vé và email ghi "Tú Lệ - Le Charm" thay vì cả câu dài.
 */
const PICKUP_AREAS: Array<[RegExp, string]> = [
  [/thăng long/i, "GO! Thăng Long (222 Trần Duy Hưng)"],
  [/tú lệ/i, "Tú Lệ"],
  [/garrya/i, "Garrya Mù Cang Chải"],
];

/**
 * Loại xe đón: riêng hay ghép chung. Hà Nội có cả hai và đây là khác biệt
 * người điều xe cần biết ngay — một bên chạy riêng một chuyến, một bên gom
 * khách cùng tuyến.
 */
export type PickupMode = "" | "private" | "shared";

const PRIVATE_PICKUP = /private|xe riêng|专车|индивидуальн|privé|प्राइवेट/i;
const SHARED_PICKUP = /shared|ghép xe|拼车|группов|partagé|शेयर्ड/i;

function pickupMode(input: { key?: unknown; label?: unknown }): PickupMode {
  const text = `${String(input.key ?? "")} ${String(input.label ?? "")}`;
  if (PRIVATE_PICKUP.test(text)) return "private";
  if (SHARED_PICKUP.test(text)) return "shared";
  return "";
}

function pickupArea(label: unknown): string {
  const text = String(label ?? "");
  for (const [pattern, name] of PICKUP_AREAS) {
    if (pattern.test(text)) return name;
  }
  return "";
}

export function pickupPointName(label: unknown): string {
  return pickupArea(label) || shortServiceLabel(String(label ?? ""));
}

type PickupRow = {
  key?: string;
  label?: string;
  /** Địa chỉ khách tự nhập cho dịch vụ đón (bước 1). */
  inputText?: string;
  note?: string;
};

type PickupSource = {
  contact?: { pickupLocation?: string };
  selectedServices?: PickupRow[];
  selectedServiceLines?: PickupRow[];
  price?: {
    addonsQty?: Record<string, number>;
    servicesBreakdown?: PickupRow[];
  };
};

/**
 * Kết luận về việc đón khách cho một booking đã chốt.
 *
 *  - `hasPickup`: có phải điều xe không
 *  - `name`: chỗ đón để in ra (địa chỉ khách gõ, hoặc tên điểm đón cố định)
 *  - `mode`: xe riêng hay xe ghép chung, nếu dịch vụ có phân biệt
 */
export function resolvePickup(b: PickupSource): {
  hasPickup: boolean;
  name: string;
  mode: PickupMode;
} {
  const rows: PickupRow[] = [
    ...(b.selectedServices || []),
    ...(b.selectedServiceLines || []),
    ...(b.price?.servicesBreakdown || []),
  ];

  const found = rows.find((row) => isPickupService(row || {}));

  // Địa chỉ cụ thể: ưu tiên ô khách nhập kèm chính dịch vụ đó, sau mới tới
  // trường pickupLocation chung.
  const typed = String(
    found?.inputText || found?.note || b.contact?.pickupLocation || "",
  ).trim();

  if (found) {
    const area = pickupArea(found.label || found.key);
    const name = area
      ? typed
        ? `${area} - ${typed}`
        : area
      : typed || shortServiceLabel(String(found.label || found.key || ""));

    return { hasPickup: true, name, mode: pickupMode(found) };
  }

  if (typed) return { hasPickup: true, name: typed, mode: "" };

  if (Number(b.price?.addonsQty?.pickup || 0) > 0) {
    return { hasPickup: true, name: "", mode: "" };
  }

  return { hasPickup: false, name: "", mode: "" };
}

/** "Cần đón xe riêng" / "Cần đón xe ghép" / "Cần đón" — cho email nội bộ. */
export function pickupHeadingVi(mode: PickupMode): string {
  if (mode === "private") return "Cần đón xe riêng";
  if (mode === "shared") return "Cần đón xe ghép";
  return "Cần đón";
}
