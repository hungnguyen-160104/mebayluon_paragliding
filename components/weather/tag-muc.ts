import type { CSSProperties } from "react";

/**
 * TAG CẢNH BÁO NGÀY BAY nổi hẳn lên (chủ 16/09): "NÊN NGHỈ BAY", "NGÀY HẠN
 * CHẾ", "BAY TỐT"… đặt trên NỀN ĐẶC — xanh đậm / vàng / đỏ — chữ trắng ĐỔ
 * BÓNG, thay cho chữ màu trên nền nhạt trước đây (liếc qua không thấy).
 * Dùng chung cho ô ngày, khối tóm tắt ngoại ngữ và đầu khối nhận định.
 */
export const NEN_TAG: Record<"xanh" | "vang" | "do", string> = {
  xanh: "bg-emerald-600",
  vang: "bg-amber-400",
  do: "bg-rose-600",
};

/** Nền theo mức nhận định tiếng Việt (tốt / khá / hạn chế / nghỉ). */
export const NEN_TAG_NHAN_DINH: Record<"tot" | "kha" | "hanChe" | "nghi", string> = {
  tot: "bg-emerald-600",
  kha: "bg-sky-600",
  hanChe: "bg-amber-400",
  nghi: "bg-rose-600",
};

export const LOP_TAG = "inline-block rounded-md px-1.5 py-0.5 font-black tracking-wide text-white shadow-sm";

/** Bóng chữ: đủ tối để chữ trắng đọc được cả trên nền vàng. */
export const BONG_CHU: CSSProperties = { textShadow: "0 1px 1px rgba(0,0,0,.6), 0 0 3px rgba(0,0,0,.35)" };
