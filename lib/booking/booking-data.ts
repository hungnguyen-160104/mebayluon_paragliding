// -----------------------------
// 🪂 DỮ LIỆU CÁC ĐIỂM BAY MEBAYLUON (legacy shape)
// -----------------------------

import type { LocationKey } from "./calculate-price";

export interface FlightOption {
  id: string;
  name: string;
  price: {
    weekday?: number;
    weekend?: number;
    unit: string;
  };
  included: string[];
  excluded?: string[];
  options?: {
    name: string;
    price: number;
    description: string;
  }[];
  promotion?: string;
  coordinates: {
    takeoff: string;
    landing: string;
  };
  image: string;
}

export const flightOptions: FlightOption[] = [
  // 1️⃣ Hà Nội – Đồi Bù / Viên Nam
  {
    id: "ha-noi",
    name: "Hà Nội (Đồi Bù, Viên Nam)",
    price: { weekday: 1690000, unit: "VND" },
    included: [
      "01 chuyến bay dù lượn từ 8–20 phút (tùy điều kiện gió)",
      "Quay phim & chụp hình từ GoPro",
      "Nước uống",
      "Bảo hiểm dù lượn",
      "Giấy chứng nhận",
      "Xe lên xuống núi",
    ],
    excluded: ["Bữa ăn"],
    options: [
      {
        name: "Xe đón/trả 2 chiều từ BigC Thăng Long",
        price: 200000,
        description:
          "Dịch vụ xe đón/trả 2 chiều từ điểm đón cố định tại BigC Thăng Long.",
      },
      {
        name: "Camera 360",
        price: 500000,
        description:
          "Phi công sử dụng camera 360 quay toàn bộ chuyến bay và edit dữ liệu cho bạn.",
      },
      {
        name: "Flycam",
        price: 350000,
        description:
          "Dịch vụ flycam có thể không luôn sẵn có. Nếu không có sẽ hoàn lại 100% phí flycam.",
      },
    ],
    coordinates: {
      takeoff: "https://maps.app.goo.gl/RxfRus3UfSz2m4nP6",
      landing: "https://maps.app.goo.gl/3vB2qYuThwBASQZj8",
    },
    image: "/images/anh-demo.jpg",
  },

  // 2️⃣ Yên Bái – Đèo Khau Phạ (Mù Cang Chải)
  {
    id: "yen-bai",
    name: "Yên Bái (Đèo Khau Phạ – Mù Cang Chải)",
    price: { weekday: 2190000, weekend: 2590000, unit: "VND" },
    included: [
      "01 chuyến bay dù lượn từ 8–15 phút (tùy điều kiện gió)",
      "Quay phim & chụp hình từ GoPro",
      "Menu đồ uống (Miễn phí cà phê & trà tại điểm bay)",
      "Bảo hiểm dù lượn",
      "Giấy chứng nhận",
      "Xe lên/xuống núi",
      "Quà lưu niệm",
    ],
    excluded: ["Bữa ăn"],
    options: [
      {
        name: "Flycam (Drone camera)",
        price: 300000,
        description:
          "Quay chuyến bay của bạn bằng Flycam, toàn bộ dữ liệu gốc sẽ gửi cho bạn.",
      },
      {
        name: "Camera 360",
        price: 500000,
        description:
          "Phi công sử dụng camera 360 quay toàn bộ chuyến bay và edit dữ liệu cho bạn.",
      },
    ],
    promotion:
      "Free chỗ ở tại Mebayluon Clubhouse khi đặt bay dù (hiển thị tùy vào khung thời gian trong năm).",
    coordinates: {
      takeoff: "https://maps.app.goo.gl/Z9X6BnNV4eaUKTE29",
      landing: "https://maps.app.goo.gl/QJWD6Em4b9RYYQMc8",
    },
    image: "/images/anh-demo.jpg",
  },

  // 3️⃣ Lào Cai – Sapa
  {
    id: "lao-cai",
    name: "Lào Cai (Sapa)",
    price: { weekday: 2090000, unit: "VND" },
    included: [
      "01 chuyến bay dù lượn từ 8–15 phút (tùy điều kiện gió)",
      "Quay phim & chụp hình từ GoPro",
      "Menu đồ uống (Miễn phí cà phê & trà tại điểm bay)",
      "Bảo hiểm dù lượn",
      "Giấy chứng nhận",
    ],
    excluded: ["Bữa ăn"],
    options: [
      {
        name: "Xe đón trả tại khách sạn (Trung tâm Sapa, bản Lao Chải, bản Tả Van)",
        price: 100000,
        description: "Dịch vụ xe đưa đón tại khu vực trung tâm và các bản Sapa.",
      },
      {
        name: "Flycam (Drone camera)",
        price: 300000,
        description: "Quay chuyến bay bằng Flycam, toàn bộ dữ liệu gốc sẽ gửi cho bạn.",
      },
      {
        name: "Camera 360",
        price: 500000,
        description:
          "Phi công sử dụng camera 360 quay toàn bộ chuyến bay và edit dữ liệu cho bạn.",
      },
    ],
    coordinates: {
      takeoff: "https://maps.app.goo.gl/bGtKFTuxyZvJhsJZ9",
      landing: "https://maps.app.goo.gl/mYnh4KJVk3aQZLYC6",
    },
    image: "/images/anh-demo.jpg",
  },

  // 4️⃣ Đà Nẵng – Bán đảo Sơn Trà
  {
    id: "da-nang",
    name: "Đà Nẵng (Bán đảo Sơn Trà)",
    price: { weekday: 1690000, unit: "VND" },
    included: [
      "01 chuyến bay dù lượn từ 8–15 phút (tùy điều kiện gió)",
      "Quay phim & chụp hình từ GoPro",
      "Nước uống",
      "Bảo hiểm dù lượn",
      "Giấy chứng nhận",
      "Xe lên/xuống núi",
    ],
    excluded: ["Bữa ăn"],
    options: [
      {
        name: "Flycam (Drone camera)",
        price: 500000,
        description:
          "Quay chuyến bay bằng Flycam, toàn bộ dữ liệu gốc sẽ gửi cho bạn.",
      },
      {
        name: "Camera 360",
        price: 500000,
        description:
          "Phi công sử dụng camera 360 quay toàn bộ chuyến bay và edit dữ liệu cho bạn.",
      },
      {
        name: "Đón/trả từ khách sạn",
        price: 200000,
        description:
          "Dịch vụ đưa đón 2 chiều từ khách sạn. Giá có thể thay đổi theo vị trí đón và số lượng khách.",
      },
    ],
    coordinates: {
      takeoff: "https://maps.app.goo.gl/6NDgTSg8PZb5BtGX8",
      landing: "https://maps.app.goo.gl/ETF9PiL4ijd5hYKQ6",
    },
    image: "/images/anh-demo.jpg",
  },

  // 5️⃣ Hà Giang – Quản Bạ
  {
    id: "quan-ba",
    name: "Hà Giang (Quản Bạ)",
    price: { weekday: 2190000, unit: "VND" },
    included: [
      "01 chuyến bay dù lượn",
      "Quay phim & chụp hình từ GoPro",
      "Bảo hiểm dù lượn",
      "Giấy chứng nhận",
    ],
    excluded: ["Bữa ăn"],
    options: [
      {
        name: "Xe đón/trả 2 chiều trong khu vực Quản Bạ",
        price: 150000,
        description:
          "Dịch vụ đón/trả 2 chiều trong khu vực Quản Bạ. Nếu tự di chuyển, khách cần có mặt trước 15 phút.",
      },
      {
        name: "Flycam (Drone camera)",
        price: 350000,
        description:
          "Quay chuyến bay bằng Flycam, toàn bộ dữ liệu gốc sẽ gửi cho bạn.",
      },
      {
        name: "Camera 360",
        price: 500000,
        description:
          "Phi công sử dụng camera 360 quay toàn bộ chuyến bay và edit dữ liệu cho bạn.",
      },
    ],
    coordinates: {
      takeoff: "",
      landing: "",
    },
    image: "/images/anh-demo.jpg",
  },
];

// -----------------------------
// 🔗 Mapping: FlightOption.id  <->  LocationKey
// để tái sử dụng các logic tính giá / store hiện có
// -----------------------------

export const locationKeyToOptionId: Record<LocationKey, FlightOption["id"]> = {
  ha_noi: "ha-noi",
  khau_pha: "yen-bai",
  sapa: "lao-cai",
  da_nang: "da-nang",
  quan_ba: "quan-ba",
};

export function getFlightByLocationKey(key: LocationKey): FlightOption {
  const id = locationKeyToOptionId[key];
  const item = flightOptions.find((x) => x.id === id);
  if (!item) throw new Error("Không tìm thấy flight option cho key: " + key);
  return item;
}