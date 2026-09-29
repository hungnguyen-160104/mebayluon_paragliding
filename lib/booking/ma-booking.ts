// lib/booking/ma-booking.ts
/**
 * MÃ BOOKING CHO KHÁCH + khớp số điện thoại (30/09/2026).
 *
 * Mã mới: "MBL" + 6 ký tự ngẫu nhiên, bỏ các ký tự dễ nhầm (0/O, 1/I/L) —
 * khách đọc qua điện thoại hay gõ lại từ email không bị sai. 31^6 ≈ 887 triệu
 * tổ hợp, lại phải kèm đúng số điện thoại, nên không đoán mò được.
 */
import { randomInt } from "node:crypto";

const BANG = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function taoMaBooking(): string {
  let s = "MBL";
  for (let i = 0; i < 6; i++) s += BANG[randomInt(BANG.length)];
  return s;
}

/**
 * Chuẩn hoá mã khách gõ: bỏ khoảng trắng, gạch, chấm; viết hoa; bỏ tiền tố
 * "WEB" (mã trên sổ nội bộ là WebMBLxxxxxx — khách đọc theo nhân viên cũng khớp).
 */
export function chuanMa(raw: unknown): string {
  return String(raw ?? "")
    .toUpperCase()
    .replace(/[\s.\-_#]/g, "")
    .replace(/^WEB/, "");
}

/** 9 số cuối điện thoại: "+84 912 345 678" và "0912345678" ra cùng một khoá. */
export function khoaSdt(raw: unknown): string {
  const d = String(raw ?? "").replace(/\D/g, "");
  return d.length >= 9 ? d.slice(-9) : "";
}

/** Mã sổ nội bộ của booking web cũ (chưa có maBooking): MBL + 6 ký tự cuối _id. */
export const maSoCu = (id: string) => `MBL${String(id).slice(-6).toUpperCase()}`;
