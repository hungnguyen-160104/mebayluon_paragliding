// lib/spots-registry.ts
/**
 * Danh mục điểm bay cho trang /spots (trang danh sách).
 *
 * Tên điểm bay và tỉnh/thành là danh từ riêng nên dùng chung cho mọi ngôn ngữ.
 * Giá/độ cao/thời gian lấy theo dữ liệu chi tiết trong
 * app/spots/[slug]/page.tsx — khi đổi giá ở đó, nhớ cập nhật ở đây.
 *
 * `i18nKey` trỏ vào t.spots.locations.<key> (đã dịch 6 ngôn ngữ) để lấy
 * mô tả/điểm nhấn; các điểm không có key thì thẻ chỉ hiện thông tin cơ bản.
 *
 * Thứ tự hiển thị (theo yêu cầu kinh doanh):
 *   Khau Phạ – Hà Nội – Sa Pa – Đà Nẵng – Hà Giang – Phình Hồ (Trạm Tấu)
 */
export type SpotListItem = {
  slug: string;
  name: string;
  province: string;
  altitude: string;
  duration: string;
  priceVND: number;
  image: string;
  i18nKey?: string;
};

export const SPOTS_LIST: SpotListItem[] = [
  {
    slug: "khau-pha",
    name: "Đèo Khau Phạ",
    province: "Tú Lệ - Mù Cang Chải",
    altitude: "1.268 – 2.000 m",
    duration: "10 – 20'",
    priceVND: 2_190_000,
    image: "/spots/khau-pha/hero.jpg",
    i18nKey: "khauPha",
  },
  {
    // Gộp Đồi Bù + Viên Nam thành một thẻ "Hà Nội" (giống trang chủ);
    // link vào /spots/doi-bu — trang /spots/vien-nam vẫn tồn tại riêng.
    slug: "doi-bu",
    name: "Đồi Bù | Viên Nam",
    province: "Hà Nội",
    altitude: "650m | 850m – 1.000m",
    duration: "10 – 20'",
    priceVND: 1_790_000,
    image: "/spots/ha-noi/hero.jpg",
    i18nKey: "doiBu",
  },
  {
    slug: "muong-hoa-sapa",
    name: "Sapa (Thung lũng Mường Hoa)",
    province: "Lào Cai",
    altitude: "1.500 – 2.000 m",
    duration: "10 – 15'",
    priceVND: 2_190_000,
    image: "/spots/sapa/hero.jpg",
    i18nKey: "muongHoaSapa",
  },
  {
    slug: "son-tra",
    name: "Sơn Trà",
    province: "Đà Nẵng",
    altitude: "600 – 800 m",
    duration: "8 – 15'",
    priceVND: 2_190_000,
    image: "/spots/da-nang/hero.jpg",
    i18nKey: "sonTra",
  },
  {
    slug: "ha-giang",
    name: "Bắc Sum | Quản Bạ",
    province: "Hà Giang",
    altitude: "1.000 – 1.200 m",
    duration: "10 – 15'",
    priceVND: 2_190_000,
    image: "/spots/ha-giang/hero.jpeg",
    i18nKey: "vienNam",
  },
  {
    slug: "tram-tau",
    name: "Phình Hồ - Trạm Tấu",
    // Trạm Tấu / Phình Hồ nay thuộc tỉnh Lào Cai sau khi sáp nhập Yên Bái.
    province: "Lào Cai",
    altitude: "1.000 – 1.500 m",
    duration: "10 – 15'",
    priceVND: 2_590_000,
    image: "/spots/tram-tau/hero.jpg",
    i18nKey: "tramTau",
  },

  // Đà Lạt TẠM ẨN khỏi danh sách (điểm bay chưa mở lại) — trang chi tiết
  // /spots/dalat vẫn truy cập được qua URL trực tiếp. Mở lại thì bỏ comment:
  // {
  //   slug: "dalat",
  //   name: "Đà Lạt",
  //   province: "Lâm Đồng",
  //   altitude: "1.400 m",
  //   duration: "10 – 20'",
  //   priceVND: 2_290_000,
  //   image: "/dalat-city-pine-forests-aerial-view-vietnam.jpg",
  // },
];
