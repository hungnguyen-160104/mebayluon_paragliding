// components/footer/constants.ts
export type FixedKey =
  | "vien-nam-hoa-binh"
  | "doi-bu"
  | "khau-pha"
  | "tram-tau"
  | "son-tra"
  | "sapa";

export interface FixedSpot {
  key: FixedKey;
  name: string;
  lat: number;
  lng: number;
  gmaps: string; // link Google Maps
}

export const FIXED_SPOTS: FixedSpot[] = [
  {
    key: "vien-nam-hoa-binh",
    name: "Viên Nam – Hoà Bình",
    lat: 20.8829,
    lng: 105.4082,
    gmaps: "https://maps.google.com/?q=20.8829,105.4082",
  },
  {
    key: "doi-bu",
    name: "Đồi Bù – Chương Mỹ",
    lat: 20.8447,
    lng: 105.5872,
    gmaps: "https://maps.google.com/?q=20.8447,105.5872",
  },
  {
    key: "khau-pha",
    name: "Khau Phạ – Mù Cang Chải",
    lat: 21.7945,
    lng: 104.1642,
    gmaps: "https://maps.google.com/?q=21.7945,104.1642",
  },
  {
    key: "tram-tau",
    name: "Trạm Tấu – Yên Bái",
    lat: 21.5177,
    lng: 104.4833,
    gmaps: "https://maps.google.com/?q=21.5177,104.4833",
  },
  {
    key: "son-tra",
    name: "Sơn Trà – Đà Nẵng",
    lat: 16.108,
    lng: 108.25,
    gmaps: "https://maps.google.com/?q=16.108,108.25",
  },
  {
    key: "sapa",
    name: "Sa Pa – Lào Cai",
    lat: 22.3355,
    lng: 103.8438,
    gmaps: "https://maps.google.com/?q=22.3355,103.8438",
  },
];
