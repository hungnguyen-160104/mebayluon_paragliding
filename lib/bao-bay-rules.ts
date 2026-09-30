// lib/bao-bay-rules.ts
/**
 * NỘI QUY ĐIỂM BAY NÚI VIÊN NAM — phần dành cho PHI CÔNG (mục A), chép NGUYÊN
 * VĂN từ biển nội quy 2026 (Dropbox "0 Hoso Cty Viennam/2026/NVN/Biển Nội quy
 * NVN 2026.pdf", bản cập nhật 30/09: trang 1 tiếng Việt, trang 3 tiếng Anh,
 * trang 2 và 4 là sơ đồ). Mục B (khách bay đôi) không đưa lên trang phi công.
 *
 * Biển có hai bản ngôn ngữ nên chỉ có vi + en; bốn ngôn ngữ còn lại hiện bản
 * tiếng Anh. Sửa chữ trên biển thì sửa ở đây, trang và phần kiểm ở máy chủ đọc
 * cùng một chỗ.
 *
 * GHI CHÚ SỐ LIỆU (không sửa ở đây): biển ghi hai bãi cất cánh cao 600m, còn
 * lib/weather-spots.ts khai Viên Nam alt 850 / altCat2 650 (dùng cho trần mây
 * AMSL). Trang 2 của PDF còn một bản sơ đồ 5 điểm có "Bãi cất cánh gió Đông
 * (độ cao 200m)".
 */

export type SiteRules = {
  title: string;
  sectionA: string;
  /** Các điều khoản; `sub` là danh sách con (mục "KHÔNG BAY"). */
  items: Array<{ text: string; sub?: string[] }>;
  zoneTitle: string;
  zoneNotes: string[];
  windLabel: string;
  wind: string;
  radioLabel: string;
  radio: string;
  emergencyLabel: string;
  /** Số khẩn cấp in trên biển — KHÁC hotline chung của trang (0964 073 555). */
  emergency: Array<{ display: string; tel: string; name: string }>;
  hotlineLabel: string;
  hotline: { display: string; tel: string };
  mapZoneAlt: string;
  mapSiteAlt: string;
};

export const VIEN_NAM_RULE_IMAGES = {
  /** Trang 1 của biển: vùng bay màu vàng, vùng cấm (sân bay Hoà Lạc, thuỷ điện Hoà Bình), đường điện cao thế. */
  zone: "/baobay/vien-nam-vung-bay.jpg",
  /** Trang 4 của biển: bãi cất cánh 1 & 2 (600m), bãi hạ cánh 1 & 2 (50m). */
  site: "/baobay/vien-nam-so-do-bai.jpg",
} as const;

const EMERGENCY = [{ display: "097.677.1204", tel: "tel:+84976771204", name: "Mr. Ngự" }];
const HOTLINE = { display: "0964.073.555", tel: "tel:+84964073555" };

export const VIEN_NAM_RULES: Record<"vi" | "en", SiteRules> = {
  vi: {
    title: "Nội quy điểm bay Núi Viên Nam",
    sectionA: "A. ĐỐI VỚI PHI CÔNG DÙ LƯỢN",
    items: [
      { text: "Chỉ sử dụng các thiết bị bay theo đúng tiêu chuẩn và có kiểm định theo định kỳ." },
      { text: "Dù lượn bay bằng mắt, TUYỆT ĐỐI KHÔNG BAY trong điều kiện tầm nhìn kém." },
      {
        text: "Hãy nhớ, an toàn phụ thuộc 100% vào chính quyết định của phi công! Hãy đảm bảo có đủ mọi điều kiện an toàn trước khi bay và chịu trách nhiệm với mọi sự cố xảy ra.",
      },
      { text: "Điều kiện gió vùng núi đôi khi thay đổi nhanh bất thường, hãy thận trọng!" },
      {
        text: "KHÔNG:",
        sub: [
          "KHÔNG BAY khi chưa được phép (chưa đăng ký bay)",
          "KHÔNG BAY trong điều kiện xấu",
          "KHÔNG BAY vào các khu vực có cảnh báo nguy hiểm",
          "KHÔNG BAY gần các đường dây điện",
          "KHÔNG BAY ra ngoài vùng cấp phép",
          "KHÔNG BAY nếu không có đầy đủ: mũ bảo hiểm, bộ đàm, dù phụ",
        ],
      },
      {
        text: "Phi công trình độ P2 trở xuống (hoặc tương đương), có dưới 50 chuyến bay hoặc dưới 15 giờ bay phải cam kết có HLV giám sát khi bay.",
      },
      { text: "Hãy tham gia các khoá SIV và khoá huấn luyện kỹ năng sơ cấp cứu hàng năm!" },
      {
        text: "Nghiêm chỉnh chấp hành mọi nội quy của điểm bay Núi Viên Nam và chấp hành mọi hướng dẫn bay của Công ty.",
      },
      { text: "Liên hệ đăng ký bay qua hotline: 0964.073.555" },
    ],
    zoneTitle: "Lưu ý vùng bay",
    zoneNotes: [
      "Khu vực được phép bay nằm trong vùng màu vàng",
      "Độ cao bay: 200m so với điểm cất cánh",
      "Không bay vào các khu vực cấm",
      "Không bay qua các đường dây điện cao thế",
    ],
    windLabel: "Hướng gió cất cánh",
    wind: "Đông, Nam, Tây",
    radioLabel: "Tần số bộ đàm",
    radio: "170.500 (HNAA) & 148.770 (HNPG)",
    emergencyLabel: "Khẩn cấp",
    emergency: EMERGENCY,
    hotlineLabel: "Hotline đăng ký bay",
    hotline: HOTLINE,
    mapZoneAlt: "Sơ đồ vùng bay Viên Nam: vùng vàng được phép bay, vùng đỏ cấm (sân bay Hoà Lạc, thuỷ điện Hoà Bình), đường điện cao thế",
    mapSiteAlt: "Sơ đồ bãi: bãi cất cánh 1 và 2 (600m), bãi hạ cánh 1 và 2 (50m)",
  },
  en: {
    title: "Vien Nam flying site regulations",
    sectionA: "A. FOR PARAGLIDING PILOTS",
    items: [
      { text: "Only use flying equipment that meets the proper standards and has been periodically inspected." },
      { text: "Paragliding is a visual flight activity. DO NOT FLY UNDER ANY CIRCUMSTANCES in poor visibility conditions." },
      { text: "Please remember: flight safety depends 100% on the pilot’s own decision." },
      {
        text: "Make sure that all safety conditions are fully met before takeoff, and take full responsibility for any incidents that may occur.",
      },
      { text: "Mountain wind conditions can sometimes change rapidly and unexpectedly. Please exercise caution." },
      {
        text: "DO NOT:",
        sub: [
          "DO NOT FLY without permission (without flight registration)",
          "DO NOT FLY in poor or unsafe conditions",
          "DO NOT FLY into areas with hazard warnings",
          "DO NOT FLY near power lines",
          "DO NOT FLY outside the permitted flight zone",
          "DO NOT FLY without all required equipment: helmet, radio, reserve parachute.",
        ],
      },
      {
        text: "Pilots with P2 level or below (or equivalent), with fewer than 50 flights or less than 15 flight hours, must ensure that they are supervised by an instructor during flight.",
      },
      { text: "Please attend annual SIV courses and basic first aid training courses." },
      {
        text: "Strictly comply with all regulations of Vien Nam Mountain Flying Site and follow all flight instructions issued by the Company.",
      },
      { text: "To register for a flight, please contact the hotline: 0964.073.555" },
    ],
    zoneTitle: "Flight Zone Notes",
    zoneNotes: [
      "The authorized flight area is marked in yellow.",
      "Maximum flight altitude: 200 meters above takeoff.",
      "Do not enter restricted areas.",
      "Do not fly over high-voltage power lines.",
    ],
    windLabel: "Take off direction",
    wind: "East, South, West",
    radioLabel: "Radio Frequency",
    radio: "170.500 (HNAA) & 148.770 (HNPG)",
    emergencyLabel: "Emergency",
    emergency: EMERGENCY,
    hotlineLabel: "Flight registration hotline",
    hotline: HOTLINE,
    mapZoneAlt: "Vien Nam flight zone map: yellow = authorised area, red = restricted (Hoa Lac airport, Hoa Binh dam), high-voltage power line",
    mapSiteAlt: "Site map: take-off 1 and 2 (600 m), landing 1 and 2 (50 m)",
  },
};

/** Bản nội quy theo ngôn ngữ trang: tiếng Việt → vi, mọi thứ tiếng khác → en. */
export function vienNamRules(lang: unknown): SiteRules {
  return String(lang ?? "vi").slice(0, 2) === "vi" ? VIEN_NAM_RULES.vi : VIEN_NAM_RULES.en;
}
