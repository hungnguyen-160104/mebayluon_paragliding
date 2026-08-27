// lib/homestay-room-names.ts
/**
 * TÊN HẠNG PHÒNG theo ngôn ngữ — dùng chung cho TRANG ĐẶT PHÒNG và THƯ XÁC NHẬN.
 *
 * Trước đây bảng tên này nằm trong từ điển của riêng trang đặt phòng. Thư xác
 * nhận cũng cần đúng những cái tên ấy: khách đọc thư thấy "Small attic room"
 * mà lúc đặt trên trang lại là tên khác thì tưởng bị xếp nhầm phòng. Để một
 * chỗ thì sửa tên là cả hai nơi đổi theo, không có cửa lệch nhau.
 */
import type { HomestayLang } from "@/lib/homestay-data";

export const ROOM_NAMES: Record<HomestayLang, Record<string, string>> = {
  vi: {
    "double-room": "Phòng giường đôi view suối",
    dormitory: "Chỗ nằm sàn cộng đồng",
    "single-room": "Phòng giường đơn view dù lượn",
    "couple-attic-single": "Phòng gác mái nhỏ",
    "couple-attic-double": "Phòng áp mái lớn",
    "whole-home-small": "Phòng gia đình",
    "floor-combo": "Nguyên sàn (trừ 2 phòng đôi)",
    "whole-home-large": "Nguyên nhà sàn",
  },
  en: {
    "double-room": "Double bed room — stream view",
    dormitory: "Shared dorm bed",
    "single-room": "Single bed room — paragliding view",
    "couple-attic-single": "Small attic room",
    "couple-attic-double": "Large attic room",
    "whole-home-small": "Family room",
    "floor-combo": "Whole floor (excl. 2 double rooms)",
    "whole-home-large": "Entire stilt house",
  },
  fr: {
    "double-room": "Chambre lit double — vue ruisseau",
    dormitory: "Lit en dortoir",
    "single-room": "Chambre lit simple — vue parapentes",
    "couple-attic-single": "Petite chambre mansardée",
    "couple-attic-double": "Grande chambre mansardée",
    "whole-home-small": "Chambre familiale",
    "floor-combo": "Étage entier (hors 2 ch. doubles)",
    "whole-home-large": "Maison sur pilotis entière",
  },
  ru: {
    "double-room": "Номер с двуспальной кроватью — вид на ручей",
    dormitory: "Место в общем зале",
    "single-room": "Номер с односпальной кроватью — вид на парапланы",
    "couple-attic-single": "Малая мансарда",
    "couple-attic-double": "Большая мансарда",
    "whole-home-small": "Семейный номер",
    "floor-combo": "Весь этаж (кроме 2 двухместных)",
    "whole-home-large": "Весь дом на сваях",
  },
  zh: {
    "double-room": "双人床房 — 溪流景观",
    dormitory: "多人间床位",
    "single-room": "单人床房 — 滑翔伞景观",
    "couple-attic-single": "小阁楼房",
    "couple-attic-double": "大阁楼房",
    "whole-home-small": "家庭房",
    "floor-combo": "整层包场（不含2间双人房）",
    "whole-home-large": "整栋高脚屋",
  },
  hi: {
    "double-room": "डबल बेड कमरा — नदी का दृश्य",
    dormitory: "डॉर्मिटरी बेड",
    "single-room": "सिंगल बेड कमरा — पैराग्लाइडिंग दृश्य",
    "couple-attic-single": "छोटा अटारी कमरा",
    "couple-attic-double": "बड़ा अटारी कमरा",
    "whole-home-small": "फ़ैमिली कमरा",
    "floor-combo": "पूरी मंज़िल (2 डबल कमरों को छोड़कर)",
    "whole-home-large": "पूरा स्टिल्ट हाउस",
  },
};

/** Tên phòng theo ngôn ngữ; thiếu bản dịch thì rơi về tiếng Việt rồi tới mã phòng. */
export function roomNameOf(id: string, lang: HomestayLang): string {
  return ROOM_NAMES[lang]?.[id] || ROOM_NAMES.vi[id] || id;
}
