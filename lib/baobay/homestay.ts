// lib/baobay/homestay.ts
/**
 * PHÒNG HOMESTAY (Clubhouse Mebayluon — Mù Cang Chải) cho máy quản phòng.
 *
 * Danh sách và ĐƠN GIÁ dưới đây lấy đúng theo BẢNG TÍNH QUẢN PHÒNG THÁNG 8
 * của chủ nhà (gác mái đơn 350k, gác mái to 500k, đơn 350k, đôi 650k, gia
 * đình 800k, sàn cộng đồng 200k/chỗ) — khác với phần chữ quảng bá trên trang
 * /homestay (lib/homestay-data.ts): bên đó là bài giới thiệu, bên này là tồn
 * kho để tính phòng trống và tính tiền. Giá tính theo ĐỒNG/PHÒNG/ĐÊM.
 *
 * Toàn bộ là hàm thuần — trang kế toán, trang đặt phòng và bộ đọc thư dùng
 * chung một cách tính, không mỗi nơi một kiểu.
 */

/** Giờ nhận/trả phòng cố định của nhà. */
export const CHECK_IN_TIME = "13:00";
export const CHECK_OUT_TIME = "11:00";

export type HomestayBedKind = "double-bed" | "single-bed" | "single-mattress";

export type HomestayFeature =
  | "stilt-house"
  | "private-room"
  | "shared-bathroom"
  | "ensuite-bathroom"
  | "stream-view"
  | "paragliding-view"
  | "attic"
  // Các lựa chọn của GÓI NGUYÊN SÀN / NGUYÊN NHÀ SÀN
  | "big-family"
  | "company"
  | "karaoke"
  | "campfire-camp"
  | "teambuilding"
  | "view-both"
  | "free-pool";

export type HomestayRoom = {
  id: string;
  /** Số ĐƠN VỊ bán được: phòng lẻ đếm phòng, phòng cộng đồng đếm chỗ nằm. */
  units: number;
  /** Đồng/phòng/đêm (đã quy về phòng — xem chú thích đầu file). */
  pricePerNight: number;
  beds: Array<{ kind: HomestayBedKind; count: number }>;
  features: HomestayFeature[];
  maxAdults: number;
  /** Số trẻ dưới 6 tuổi ở kèm được. */
  maxChildren: number;
  /**
   * MỨC Ở TỐT NHẤT (thoải mái) — thấp hơn mức tối đa: sàn cộng đồng 14 đệm
   * nhưng nên nằm 10; combo tầng 2 chứa được 36 nhưng nên nhận 30. Không khai
   * = tối đa cũng là mức tốt.
   */
  comfort?: number;
  /** Cho khách tự đặt trên web không — phòng cộng đồng/nguyên căn thì liên hệ trực tiếp. */
  webBookable: boolean;
};

/**
 * Id GIỮ NGUYÊN như đợt đầu (double-room, couple-attic-single…) dù tên gọi đã
 * đổi: sổ đặt phòng trong MongoDB và bộ quy đổi tên phòng Agoda đều đang trỏ
 * vào các id này — đổi id là booking cũ rơi khỏi bảng phòng.
 */
export const HOMESTAY_ROOMS: HomestayRoom[] = [
  {
    // Phòng giường đôi view suối
    id: "double-room",
    units: 2,
    pricePerNight: 650_000,
    beds: [{ kind: "double-bed", count: 1 }],
    features: ["stilt-house", "private-room", "shared-bathroom", "stream-view"],
    maxAdults: 2,
    maxChildren: 1,
    webBookable: true,
  },
  {
    // Phòng giường đơn view dù lượn
    id: "single-room",
    units: 2,
    pricePerNight: 350_000,
    beds: [{ kind: "single-bed", count: 1 }],
    features: ["stilt-house", "private-room", "shared-bathroom", "paragliding-view"],
    maxAdults: 1,
    maxChildren: 1,
    webBookable: true,
  },
  {
    // Gác mái đơn 1·2·3 (cặp đôi)
    id: "couple-attic-single",
    units: 3,
    pricePerNight: 350_000,
    beds: [{ kind: "single-mattress", count: 2 }],
    features: ["attic", "private-room", "shared-bathroom"],
    maxAdults: 2,
    maxChildren: 0,
    webBookable: true,
  },
  {
    // Phòng gác mái to
    id: "couple-attic-double",
    units: 1,
    pricePerNight: 500_000,
    beds: [{ kind: "single-mattress", count: 3 }],
    features: ["attic", "private-room", "shared-bathroom"],
    maxAdults: 3,
    maxChildren: 0,
    webBookable: true,
  },
  {
    // Phòng gia đình — khép kín, hai view
    id: "whole-home-small",
    units: 1,
    pricePerNight: 800_000,
    beds: [{ kind: "double-bed", count: 2 }],
    features: ["ensuite-bathroom", "stream-view", "paragliding-view"],
    maxAdults: 5,
    maxChildren: 0,
    webBookable: true,
  },
  {
    // Sàn cộng đồng — 14 đệm tối đa, Ở TỐT NHẤT 10; bán theo CHỖ NẰM qua liên hệ/OTA
    id: "dormitory",
    units: 14,
    pricePerNight: 200_000,
    beds: [{ kind: "single-mattress", count: 1 }],
    features: ["stilt-house", "shared-bathroom"],
    maxAdults: 1,
    maxChildren: 0,
    comfort: 10,
    webBookable: false,
  },
  {
    /**
     * BAO SÀN TRONG (TẦNG 2): toàn bộ sàn cộng đồng + 4 áp mái + 2 phòng đơn
     * — tất cả đi cùng một cửa. Tối đa 30 người, khuyến cáo 24 (gồm trẻ em).
     * Giá chủ nhà chốt: 3.600.000đ/đêm.
     */
    id: "floor-combo",
    units: 1,
    pricePerNight: 3_600_000,
    beds: [],
    features: ["big-family", "company", "karaoke", "campfire-camp", "teambuilding", "view-both", "free-pool"],
    maxAdults: 30,
    // Trẻ em tính trong tổng người — vẫn mở ô khai để nhà chuẩn bị đệm
    maxChildren: 10,
    comfort: 24,
    webBookable: true,
  },
  {
    /**
     * BAO NGUYÊN NHÀ SÀN (KHU TẦNG 2): toàn bộ sàn cộng đồng + 4 áp mái +
     * 2 phòng đơn + 2 phòng đôi — tối đa 36 người, khuyến cáo 30 (gồm trẻ
     * em). KHÔNG gồm phòng gia đình (khép kín, vẫn bán riêng được).
     */
    id: "whole-home-large",
    units: 1,
    pricePerNight: 4_500_000,
    beds: [],
    features: ["big-family", "company", "karaoke", "campfire-camp", "teambuilding", "view-both", "free-pool"],
    maxAdults: 36,
    maxChildren: 10,
    comfort: 30,
    webBookable: true,
  },
];

/** Tiện nghi dùng chung của khu nhà sàn — hiện cho khách trước khi đặt. */
export const SHARED_FACILITIES_VI = "4 nhà vệ sinh · 3 nhà tắm chung · 6 chậu rửa mặt";

export const WHOLE_HOME_ID = "whole-home-large";

/**
 * COMBO chiếm TRỌN các phòng thành phần: đặt combo là các phòng trong danh
 * sách kín hết, và ngược lại — một phòng thành phần có khách là combo kín.
 * Phòng gia đình không nằm trong combo nào: khép kín, bán song song được.
 */
export const COMBO_COMPONENTS: Record<string, string[]> = {
  // Bao sàn trong: sàn + 4 áp mái + 2 phòng đơn (cùng một cửa)
  "floor-combo": ["dormitory", "couple-attic-single", "couple-attic-double", "single-room"],
  // Bao nguyên nhà sàn: thêm cả 2 phòng đôi
  [WHOLE_HOME_ID]: ["dormitory", "couple-attic-single", "couple-attic-double", "single-room", "double-room"],
};

export function isComboRoom(id: string): boolean {
  return id in COMBO_COMPONENTS;
}

export function homestayRoom(id: string): HomestayRoom | undefined {
  return HOMESTAY_ROOMS.find((r) => r.id === id);
}

/**
 * BẢNG SỔ PHÒNG của kế toán (hàng = ngày, cột = TỪNG PHÒNG THẬT) — thứ tự cột
 * và tên cột lấy đúng theo bảng tính tháng 8 của chủ nhà cho quen mắt.
 */
export const BOARD_COLUMN_ORDER = [
  "dormitory",
  "couple-attic-single",
  "couple-attic-double",
  "single-room",
  "double-room",
  "whole-home-small",
] as const;

/**
 * Tên cột của từng phòng thật — cố ý NGẮN ("Gác 1", "Đơn 2"…) để cả bảng
 * nằm lọt chiều ngang màn hình, không phải kéo sang ngang mới thấy hết phòng.
 */
export function roomUnitLabel(roomTypeId: string, unitIndex: number): string {
  const one: Record<string, string> = {
    dormitory: "Cộng đồng",
    "couple-attic-double": "Gác to",
    "whole-home-small": "Gia đình",
  };
  if (one[roomTypeId]) return one[roomTypeId];
  const base: Record<string, string> = {
    "couple-attic-single": "Gác",
    "single-room": "Đơn",
    "double-room": "Đôi",
  };
  return `${base[roomTypeId] ?? roomTypeId} ${unitIndex + 1}`;
}

/** Tên tiếng Việt ngắn cho bảng nội bộ — trang khách dùng bản dịch riêng. */
export const ROOM_SHORT_VI: Record<string, string> = {
  "double-room": "Giường đôi view suối",
  "single-room": "Giường đơn view dù",
  "couple-attic-single": "Gác mái nhỏ",
  "couple-attic-double": "Áp mái lớn",
  "whole-home-small": "Phòng gia đình",
  dormitory: "Cộng đồng (chỗ)",
  "floor-combo": "Bao sàn trong (T2)",
  "whole-home-large": "Bao nguyên nhà sàn",
};

/**
 * Đoán hạng phòng từ TÊN TRÊN THƯ OTA. Mỗi OTA đặt tên một kiểu ("Loft A",
 * "Deluxe Double", "Dormitory Bed"...) nên so bằng từ khoá, không so bằng.
 * Không đoán được thì trả "" — booking vẫn vào sổ, kế toán gán phòng tay.
 */
export function resolveRoomType(label: string): string {
  const s = String(label ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");
  if (!s.trim()) return "";
  if (/bao san trong|san trong/.test(s)) return "floor-combo";
  if (/entire|whole|nguyen can|nguyen khu|nguyen nha san|bao nguyen|toan bo|tang 2/.test(s)) return "whole-home-large";
  if (/family|gia dinh|khep kin|en.?suite/.test(s)) return "whole-home-small";
  if (/dorm|cong dong|shared|bunk/.test(s)) return "dormitory";
  if (/loft|ap mai|gac mai|attic|mezzanine/.test(s)) {
    return /large|lon|\bto\b|triple|3 (adult|nguoi|pax)/.test(s) ? "couple-attic-double" : "couple-attic-single";
  }
  if (/double|twin|phong doi|giuong doi/.test(s)) return "double-room";
  if (/single|phong don|giuong don/.test(s)) return "single-room";
  return "";
}

/** Tiền một dòng đặt phòng: giá phòng × số phòng × số đêm. */
export function homestayPrice(roomTypeId: string, nights: number, qty: number): number {
  const room = homestayRoom(roomTypeId);
  if (!room || nights <= 0) return 0;
  return room.pricePerNight * Math.max(1, qty) * nights;
}

/** Số đêm giữa hai chuỗi ngày "YYYY-MM-DD" (check-out không tính là đêm ở). */
export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = Date.parse(`${checkIn}T00:00:00Z`);
  const b = Date.parse(`${checkOut}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

/** Booking rút gọn đủ để tính phòng trống — model thật có thêm trường khác. */
export type OccupancyBooking = {
  roomTypeId: string;
  rooms: number;
  checkIn: string;
  checkOut: string;
  status: string;
};

/**
 * SỐ ĐƠN VỊ ĐÃ BỊ GIỮ của một hạng phòng trong một ĐÊM (đêm `date` = ở từ tối
 * `date` sang sáng hôm sau). Booking giữ phòng các đêm [checkIn, checkOut).
 *
 * Luật COMBO hai chiều (xem COMBO_COMPONENTS):
 *  - Đặt combo ⇒ mọi phòng THÀNH PHẦN của nó kín trọn.
 *  - Một phòng thành phần có khách ⇒ combo (và combo lớn hơn trùm nó) kín.
 * Phòng gia đình đứng ngoài mọi combo — khép kín, bán song song được.
 */
export function unitsTaken(bookings: OccupancyBooking[], roomTypeId: string, date: string): number {
  const room = homestayRoom(roomTypeId);
  if (!room) return 0;
  const active = bookings.filter(
    (b) => b.status === "confirmed" && b.checkIn <= date && date < b.checkOut,
  );

  if (isComboRoom(roomTypeId)) {
    const components = COMBO_COMPONENTS[roomTypeId];
    const blocked = active.some(
      (b) =>
        b.roomTypeId === roomTypeId ||
        components.includes(b.roomTypeId) ||
        // Combo khác đang chiếm phòng chung thành phần (nguyên khu ⟷ sàn+gác mái)
        (isComboRoom(b.roomTypeId) && COMBO_COMPONENTS[b.roomTypeId].some((c) => components.includes(c))),
    );
    return blocked ? room.units : 0;
  }

  // Phòng lẻ: combo nào chứa nó đang có khách là nó kín trọn
  if (active.some((b) => isComboRoom(b.roomTypeId) && COMBO_COMPONENTS[b.roomTypeId].includes(roomTypeId))) {
    return room.units;
  }

  return active
    .filter((b) => b.roomTypeId === roomTypeId)
    .reduce((t, b) => t + Math.max(1, b.rooms || 1), 0);
}

/** Còn trống bao nhiêu đơn vị của hạng phòng trong một đêm. */
export function unitsFree(bookings: OccupancyBooking[], roomTypeId: string, date: string): number {
  const room = homestayRoom(roomTypeId);
  if (!room) return 0;
  return Math.max(0, room.units - unitsTaken(bookings, roomTypeId, date));
}
