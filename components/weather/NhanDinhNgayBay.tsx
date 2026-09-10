"use client";

/**
 * KHỐI "NHẬN ĐỊNH NGÀY BAY" — hiện trên thẻ thời tiết, cho ngày đang chọn.
 *
 * Dùng chung cho sổ nội bộ và trang khách (bản tiếng Việt). Bản `gon` cho trang
 * điều phối: chỉ một dòng kết luận, bấm vào mới xổ chi tiết — trang ấy còn cả
 * sổ booking bên dưới, không thể dành nửa màn hình cho thời tiết.
 */

import { useState } from "react";

import type { NgayThoiTiet } from "@/lib/baobay/thoi-tiet";
import { nhanMucNhanDinh, type MucNhanDinh, type NhanDinhNgay } from "@/lib/baobay/nhan-dinh";

const MAU_MUC: Record<MucNhanDinh, string> = {
  tot: "border-emerald-300 bg-emerald-50 text-emerald-900",
  kha: "border-sky-300 bg-sky-50 text-sky-900",
  hanChe: "border-amber-300 bg-amber-50 text-amber-900",
  nghi: "border-rose-300 bg-rose-50 text-rose-900",
};

const MAU_TONG: Record<"tot" | "chuY" | "xau" | "thongTin", string> = {
  tot: "text-emerald-800",
  chuY: "text-amber-800",
  xau: "font-bold text-rose-800",
  thongTin: "text-slate-700",
};

export function NhanDinhNgayBay({ ngay, gon = false }: { ngay: NgayThoiTiet; gon?: boolean }) {
  const [mo, setMo] = useState(!gon);
  const nd = ngay.nhanDinh as NhanDinhNgay | undefined;
  if (!nd) return null;

  const tieuDe = `${ngay.ngay.slice(8, 10)}/${ngay.ngay.slice(5, 7)}`;

  return (
    <div className={"mb-2 rounded-lg border px-2 py-1.5 " + MAU_MUC[nd.muc]}>
      <button
        type="button"
        onClick={() => gon && setMo((x) => !x)}
        className={"flex w-full items-start gap-2 text-left " + (gon ? "cursor-pointer" : "cursor-default")}
        title={gon ? "Bấm để xem chi tiết nhận định" : undefined}
      >
        <span className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-black tracking-wide ring-1 ring-current/30">
          {nhanMucNhanDinh(nd.muc)}
        </span>
        <span className="min-w-0 flex-1 text-[12px] font-semibold leading-snug">
          <span className="opacity-70">{tieuDe} · </span>
          {nd.tomTat.replace(/^[^—]*— /, "")}
        </span>
        {gon && <span className="shrink-0 text-[11px] opacity-70">{mo ? "▾" : "▸"}</span>}
      </button>

      {mo && (
        <div className="mt-1.5 grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
          {nd.diem.map((d) => (
            <div key={d.ten} className={"text-[11px] leading-snug " + MAU_TONG[d.tong]}>
              <span className="mr-1">{d.icon}</span>
              <span className="font-bold">{d.ten}:</span> {d.noiDung}
            </div>
          ))}
        </div>
      )}

      {mo && nd.khuyenCao.length > 0 && (
        <div className="mt-1.5 rounded border border-current/20 bg-white/60 px-2 py-1 text-[11px] leading-snug">
          <span className="font-bold">👉 Khuyến cáo: </span>
          {nd.khuyenCao.map((k, i) => (
            <span key={i}>
              {i > 0 && " · "}
              {k}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
