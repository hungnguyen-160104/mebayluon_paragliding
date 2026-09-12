// app/baocao/components/useHoSo.ts
"use client";

import { useEffect, useState } from "react";

import { apiGet } from "./client-api";

/* ------------------------------------------------------------------ */
/* Hồ sơ một người trong một ngày                                      */
/* ------------------------------------------------------------------ */

/**
 * NẠP HỒ SƠ NGÀY của một người — dùng chung cho khối THU CHI (số tổng) và khối
 * "đã làm gì trong ngày" (chi tiết).
 *
 * Trước đây chỉ khối chi tiết nạp, mà lại nạp KHI BẤM MỞ, nên THU CHI không
 * biết gì về tiền khách trả qua tay người ấy: kế toán mở báo cáo Duyên ra thấy
 * "Tổng thu +0 ₫" trong khi cô ấy thu 13,5 triệu tiền mặt và 56,7 triệu chuyển
 * khoản (chủ báo 11/09). Nay nạp NGAY khi mở khung sửa — một lượt hỏi máy chủ
 * cho mỗi người đang sửa, không phải cả chục người trong danh sách.
 */
export function useHoSo(spot: string, date: string, username: string) {
  /**
   * Giữ KÈM KHOÁ (`khoa`) thay vì xoá dữ liệu cũ ngay trong effect: gọi
   * `setState` thẳng trong effect làm React dựng lại một lượt thừa, và eslint
   * chặn đúng. Đổi người hay đổi ngày thì khoá đổi theo, phần render tự coi
   * dữ liệu cũ là không hợp lệ.
   */
  const khoa = `${spot}|${date}|${username}`;
  const [du, setDu] = useState<{ khoa: string; hoSo: HoSo } | null>(null);
  const [loi, setLoi] = useState<{ khoa: string; cau: string } | null>(null);
  useEffect(() => {
    let song = true;
    /** Chưa biết người (phiên đang nạp) thì chưa hỏi — hỏi với tên rỗng chỉ ăn 400. */
    if (!username) return;
    apiGet<HoSo>(`/api/baocao/reports/nhan-su?spot=${spot}&date=${date}&username=${encodeURIComponent(username)}`)
      .then((r) => song && setDu({ khoa, hoSo: r }))
      .catch((e) => song && setLoi({ khoa, cau: e instanceof Error ? e.message : "Không lấy được hồ sơ" }));
    return () => {
      song = false;
    };
  }, [spot, date, username, khoa]);
  return { du: du?.khoa === khoa ? du.hoSo : null, loi: loi?.khoa === khoa ? loi.cau : null };
}

export type HoSo = {
  name: string;
  tien: {
    lenhThuTM: number; lenhThuCK: number; soThu: number; soChi: number;
    hoaHongTM: number; hangTM: number; hangCK: number; daNop: number; daUng: number;
  };
  huy: Array<{ bookingCode: string; contactName: string; guests: number; refund: number; luc: string }>;
  doi: Array<{ bookingCode: string; contactName: string; guests: number; denNgay: string; luc: string }>;
  dichVu: Array<{ kieu: "add" | "remove"; nhan: string; items: string; tien: number; luc: string }>;
  lenhThu: Array<{ nhan: string; soTien: number; cach: "cash" | "transfer"; trangThai: string }>;
};
