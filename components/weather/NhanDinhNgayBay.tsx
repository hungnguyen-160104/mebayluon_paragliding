"use client";

/**
 * KHỐI "NHẬN ĐỊNH NGÀY BAY" — hiện trên thẻ thời tiết, cho ngày đang chọn.
 *
 * Dùng chung cho sổ nội bộ và trang khách (bản tiếng Việt). Bản `gon` cho trang
 * điều phối: chỉ một dòng kết luận, bấm vào mới xổ chi tiết — trang ấy còn cả
 * sổ booking bên dưới, không thể dành nửa màn hình cho thời tiết.
 */

import { useState } from "react";
import { NHAN_MUC_THERMAL, type TiemNangThermal } from "@/lib/baobay/thermal";

import type { NgayThoiTiet } from "@/lib/baobay/thoi-tiet";
import { nhanMucNhanDinh, type MucNhanDinh, type NhanDinhNgay } from "@/lib/baobay/nhan-dinh";
import { NHAN_XEP_LOAI, type DanhGiaNgay } from "@/lib/baobay/chuyen-gia";

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
  const cg = ngay.chuyenGia as DanhGiaNgay | undefined;
  const th = ngay.thermal as TiemNangThermal | undefined;
  if (!nd) return null;

  /**
   * TÊN THỨ ĐỨNG TRƯỚC NGÀY, IN HOA VÀ NỔI LÊN (chủ 11/09): đọc "13/09" thì
   * phải tự nhẩm xem rơi vào thứ mấy, mà lịch bay của khách nghĩ theo thứ —
   * "CHỦ NHẬT 13/09" là đọc xong biết ngay có bán được ca không.
   *
   * Dựng mốc giờ Việt Nam rồi hỏi thứ theo đúng múi ấy: lấy `new Date("2026-09-13")`
   * suông là mốc UTC, ở múi +7 nó vẫn đúng ngày nhưng thói quen ấy sai ở múi âm.
   */
  const THU = ["CHỦ NHẬT", "THỨ HAI", "THỨ BA", "THỨ TƯ", "THỨ NĂM", "THỨ SÁU", "THỨ BẢY"];
  const thu = THU[new Date(`${ngay.ngay}T12:00:00+07:00`).getDay()];
  const tieuDe = `${thu} ${ngay.ngay.slice(8, 10)}/${ngay.ngay.slice(5, 7)}`;

  return (
    <div className={"mb-2 rounded-lg border px-2 py-1.5 " + MAU_MUC[nd.muc]}>
      <button
        type="button"
        onClick={() => gon && setMo((x) => !x)}
        /**
         * WRAP TRÊN ĐIỆN THOẠI (chủ báo 10/09): ba phần trên một hàng cứng thì
         * hai huy hiệu chiếm gần hết bề ngang, câu tóm tắt bị ép thành cột hẹp
         * cao bốn năm dòng — dưới hai huy hiệu hở một khoảng trắng đúng bằng
         * phần chênh, nhìn như lỗi. Cho câu tóm tắt xuống dòng riêng, đủ rộng.
         */
        className={"flex w-full flex-wrap items-start gap-x-2 gap-y-1 text-left sm:flex-nowrap " + (gon ? "cursor-pointer" : "cursor-default")}
        title={gon ? "Bấm để xem chi tiết nhận định" : undefined}
      >
        <span className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-black tracking-wide ring-1 ring-current/30">
          {nhanMucNhanDinh(nd.muc)}
        </span>
        {/* Điểm chuyên gia — cùng một ngày có hai thước: chữ (nhận định) và số (0–100). */}
        {cg && (
          <span
            className="shrink-0 rounded bg-white/70 px-1.5 py-0.5 text-[11px] font-black ring-1 ring-current/20"
            title={`${NHAN_XEP_LOAI[cg.xepLoai]} · ${cg.gioBayDuoc} giờ bay được${cg.khungTotNhat ? ` · đẹp nhất ${cg.khungTotNhat}` : ""} · tin cậy ${cg.doTinCay}%: ${cg.lyDoTinCay.join("; ")}`}
          >
            {cg.diem}<span className="font-normal opacity-60">/100</span>
            <span className="ml-1 font-semibold opacity-70">tin cậy {cg.doTinCay}%</span>
          </span>
        )}
        <span className="min-w-0 w-full flex-1 basis-full text-[12px] font-semibold leading-snug sm:w-auto sm:basis-auto">
          <span className="mr-1 rounded bg-white/70 px-1 py-0.5 text-[11px] font-black uppercase tracking-wide ring-1 ring-current/20">
            {tieuDe}
          </span>
          {nd.tomTat.replace(/^[^—]*— /, "")}
        </span>
        {gon && <span className="shrink-0 text-[11px] opacity-70">{mo ? "▾" : "▸"}</span>}
      </button>

      {/* KIỂU NGÀY — câu phi công nói với nhau ở bãi, hiện ngay dưới dòng tóm tắt. */}
      {mo && nd.kieuNgay && <div className="mt-1 text-[12px] font-bold leading-snug">🧭 {nd.kieuNgay}</div>}

      {mo && (
        /**
         * CỘT CHẢY (`columns-2`) chứ không phải LƯỚI hai cột.
         *
         * Lưới xếp theo HÀNG: hai mục cùng hàng phải cao bằng nhau, nên mục
         * ngắn ("Nắng: 11/11 giờ") đứng cạnh mục dài hai dòng ("Ổn định: BẤT
         * ỔN ĐỊNH (LI −2,4) — thermal gắt…") thì dưới nó hở một khoảng trắng
         * đúng bằng phần chênh. Cột chảy thì các mục nối tiếp nhau, hết cột
         * này sang cột kia, không có hàng nên không có chỗ hở.
         *
         * `break-inside-avoid` để một mục không bị cắt đôi giữa hai cột.
         */
        <div className="mt-1.5 sm:columns-2 sm:gap-x-4">
          {nd.diem.map((d) => (
            <div key={d.ten} className={"mb-0.5 break-inside-avoid text-[11px] leading-snug " + MAU_TONG[d.tong]}>
              <span className="mr-1">{d.icon}</span>
              <span className="font-bold">{d.ten}:</span> {d.noiDung}
            </div>
          ))}
        </div>
      )}

      {/**
       * TIỀM NĂNG THERMAL — quy tắc riêng sáu yếu tố (chủ 11/09), trả lời "có
       * NÂNG không" tách khỏi "êm hay xóc" của khối nhận định. Nói rõ khung 3
       * giờ đỉnh và số giờ dùng được, rồi vì sao — để phi công đối chiếu được
       * với trần, LI, nắng ở bảng giờ bên dưới thay vì tin một chữ "mạnh".
       */}
      {mo && th && (
        <div className="mt-1.5 rounded border border-current/20 bg-white/60 px-2 py-1 text-[11px] leading-snug">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-bold">🔥 Tiềm năng thermal:</span>
            <span className={"font-black uppercase " + (th.muc === "gat" ? "text-rose-800" : th.muc === "manh" ? "text-orange-800" : "")}>
              {NHAN_MUC_THERMAL[th.muc]}
            </span>
            <span className="rounded bg-white/80 px-1 font-bold ring-1 ring-current/20">{th.diem}/100</span>
            {th.khung && (
              <span>
                mạnh nhất <strong>{th.khung}</strong>
              </span>
            )}
            <span className="opacity-80">· {th.gioDung} giờ có thermal</span>
          </div>
          {th.lyDo.map((l, i) => (
            <div key={i}>• {l}</div>
          ))}
          {th.canhBao.map((c, i) => (
            <div key={`c${i}`} className="font-bold text-rose-800">
              ⚠ {c}
            </div>
          ))}
        </div>
      )}

      {mo && nd.khuyenCao.length > 0 && (
        <div className="mt-1.5 rounded border border-current/20 bg-white/60 px-2 py-1 text-[11px] leading-snug">
          <div className="font-bold">👉 Khuyến cáo</div>
          {/* Mỗi câu một dòng; câu đầu (xấu nhất) in đậm — đó là câu quyết định bay hay không. */}
          {nd.khuyenCao.map((k, i) => (
            <div key={i} className={i === 0 ? "font-bold" : ""}>
              • {k}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
