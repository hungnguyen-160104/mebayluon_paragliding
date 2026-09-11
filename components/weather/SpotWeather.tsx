"use client";

/**
 * THỜI TIẾT BAY cho WEBSITE KHÁCH.
 *
 * Hai hình dạng, cùng một bộ dữ liệu:
 *  - `SpotWeatherWidget`: khối gọn nhúng trong trang một điểm bay (/spots/…),
 *    dải 5 ngày + bảng giờ của ngày đang chọn + bản đồ Windy bật theo yêu cầu.
 *  - `WeatherSpotCard`: thẻ một điểm trên trang "Thời tiết bay" tổng hợp.
 *
 * Vì sao khách cần thấy: câu hỏi đầu tiên của người sắp đặt bay luôn là "hôm
 * ấy có bay được không". Trước đây họ phải tự mở Windy, tự đoán ngưỡng gió,
 * rồi vẫn nhắn hỏi. Bày sẵn ở đây thì họ tự chọn được ngày đẹp, và số hiện ra
 * đúng bằng số người trong nhà đang nhìn — cùng mô hình, cùng ngưỡng.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { useLanguage } from "@/contexts/language-context";
import { getThoiTietCopy, huongTheoNgonNgu, type ThoiTietCopy } from "@/lib/i18n/thoi-tiet";
import { useCuonTheoNgay, useManHinhHep } from "./cuon-ngay";
import { DaiMua, dinhMua } from "./DaiMua";
import { Airgram, Meteogram, NHAN_METEOGRAM_VI, type NhanMeteogram } from "./Meteogram";
import { styleGiat, styleGio } from "./mau-gio";
import { NhanDinhNgayBay } from "./NhanDinhNgayBay";
import { ChonMoHinh, SoSanhMoHinh } from "./SoSanhMoHinh";
import { MO_HINH_MAC_DINH } from "@/lib/baobay/mo-hinh";
import { WindArrow } from "./WindArrow";
import { LOP_MAC_DINH, LOP_WINDY, WINDY_MODELS, windyEmbedUrl, windyPageUrl } from "./WindyModels";
import {
  bieuTuongTroi,
  BIEU_TUONG_MUC,
  chiSoBay,
  huongTheNao,
  tranMay,
  type LuatHuong,
  MUA_BAY,
  MUA_DANG_KE,
} from "@/lib/baobay/thoi-tiet";

type MucDo = "xanh" | "vang" | "do";

type Gio = {
  gio: string;
  /** Gió trung bình, m/s — đơn vị phi công dùng tại bãi. */
  gio10m: number;
  giat: number;
  huong: number;
  mua: number;
  /** Phần mưa rào / giông trong tổng lượng mưa — vẽ thành dải cam. */
  muaRao?: number;
  may: number;
  nhietDo: number;
  diemSuong?: number;
  mayThap?: number;
  xacSuatMua?: number;
  cape?: number;
  chiSoNang?: number;
  tranThermal?: number;
  buXa?: number;
  chenhDoCao?: number;
  muc: MucDo;
  lyDo: string[];
};

type Ngay = {
  ngay: string;
  muc: MucDo;
  gioXanh: number;
  gioVang: number;
  gioDo: number;
  khungDep: string | null;
  gioMax: number;
  giatMax: number;
  muaTong: number;
  nhietMin: number;
  nhietMax: number;
  xacSuatMuaMax: number;
  gioMua: number;
  muaTongThat: number;
  khungMua: string | null;
  gioMuaBay: number;
  khungMuaBay: string | null;
  matTroi?: { moc: string; lan: string };
  xacSuatDongMax: number;
  tranMax: number | null;
  gio: Gio[];
  nhanDinh?: unknown;
  /** Điểm 0–100 của chuyên gia — { diem, xepLoai, doTinCay, khungTotNhat }. */
  chuyenGia?: { diem: number; xepLoai: string; doTinCay: number; khungTotNhat: string | null };
};

export type DiemDuBao = {
  slug: string;
  ten: string;
  tinh: string;
  toaDo: { lat: number; lon: number; ten: string; alt?: number; luatHuong?: LuatHuong };
  ngay: Ngay[];
  moHinh: string;
  layLuc: string;
};

/* ------------------------------------------------------------------ */
/* Màu                                                                 */
/* ------------------------------------------------------------------ */

const VIEN: Record<MucDo, string> = {
  xanh: "border-emerald-300 bg-emerald-50 text-emerald-900",
  vang: "border-amber-300 bg-amber-50 text-amber-900",
  do: "border-rose-300 bg-rose-50 text-rose-900",
};

const DAC: Record<MucDo, string> = {
  xanh: "bg-emerald-500 text-white",
  vang: "bg-amber-400 text-amber-950",
  do: "bg-rose-500 text-white",
};


/** Giật chỉ đáng chú ý TRÊN 16 m/s (gust mạnh): dưới đó để chữ mờ cho khỏi bắt mắt vô ích. */
/** Mũi tên chỉ hai màu — xanh bay được, đỏ thì không. Xem ghi chú ở sổ nội bộ. */
function mauMuiTen(the: "tot" | "xau" | "thuong", muc: MucDo): string {
  if (the === "tot") return "text-emerald-600";
  if (the === "xau") return "text-rose-600";
  return muc === "do" ? "text-rose-600" : muc === "vang" ? "text-amber-500" : "text-emerald-600";
}


/** Mức đỏ chỉ có mặt buồn — "KHÔNG BAY" quá tuyệt đối, mưa có lúc ngớt. Chữ để trong tooltip. */
function nhanMuc(muc: MucDo, t: ThoiTietCopy): string {
  if (muc === "do") return BIEU_TUONG_MUC.do;
  return `${BIEU_TUONG_MUC[muc]} ${muc === "xanh" ? t.good : t.fair}`;
}
function moTaMuc(muc: MucDo, t: ThoiTietCopy): string {
  return muc === "xanh" ? t.good : muc === "vang" ? t.fair : t.bad;
}

/** "2026-09-10" → "T5 10/09" theo tiếng đang xem; hôm nay thì hiện "Hôm nay". */
function nhanNgay(d: string, homNay: string, lang: string, t: ThoiTietCopy): string {
  if (d === homNay) return t.today;
  const ngay = new Date(`${d}T12:00:00+07:00`);
  const ma = ({ vi: "vi-VN", en: "en-GB", fr: "fr-FR", ru: "ru-RU", zh: "zh-CN", hi: "hi-IN" } as Record<string, string>)[lang] ?? "vi-VN";
  return ngay.toLocaleDateString(ma, { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });
}

function homNayVN(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
}

/* ------------------------------------------------------------------ */
/* Dải 5 ngày — phần dùng lại ở cả hai hình dạng                       */
/* ------------------------------------------------------------------ */

function DaiNgay({
  ngay,
  chon,
  onChon,
  t,
  lang,
}: {
  ngay: Ngay[];
  chon?: string | null;
  onChon?: (d: string) => void;
  t: ThoiTietCopy;
  lang: string;
}) {
  const homNay = homNayVN();
  return (
    /* Năm ô một hàng từ 640px — hai hàng đủ mười ngày; điện thoại bốn ô cho chữ
       còn đọc được. Xem ghi chú ở SO_NGAY. */
    <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
      {/**
       * Ô NGÀY GỌN LẠI (chủ 10/09): trước đây mỗi ô xếp SÁU dòng chồng nhau —
       * ngày, số gió, đơn vị, số giờ đẹp, mưa, dông, điểm — cao gần bằng cả
       * bảng giờ bên dưới, mà người ta chỉ liếc để chọn ngày. Nay gộp lại: một
       * dòng ngày, một dòng "gió · điểm", một dòng mưa/dông chỉ hiện khi có.
       */}
      {ngay.map((n) => {
        const noiDung = (
          <>
            <div className="text-[11px] font-bold uppercase tracking-wide opacity-80">
              {nhanNgay(n.ngay, homNay, lang, t)}
            </div>
            <div className="mt-0.5 flex items-baseline justify-center gap-1 leading-none">
              <span className="text-[15px] font-black">{n.gioMax.toFixed(1)}</span>
              <span className="text-[10px] opacity-70">{t.windUnit}</span>
              {n.chuyenGia && (
                <span className="text-[11px] font-black opacity-90" title={`${t.score} ${n.chuyenGia.diem}/100`}>
                  · {n.chuyenGia.diem}
                </span>
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center justify-center gap-x-1 text-[11px] font-semibold leading-tight">
              <span>{n.gioXanh > 0 ? `${n.gioXanh} ${t.goodHours}` : nhanMuc(n.muc, t)}</span>
              {n.gioMua > 0 && <span className="font-normal">☔{n.gioMua}h</span>}
              {n.xacSuatDongMax >= 20 && <span>⚡{n.xacSuatDongMax}%</span>}
            </div>
          </>
        );
        const lop =
          "rounded-xl border px-1 py-1.5 text-center transition " +
          VIEN[n.muc] +
          (chon === n.ngay ? " ring-2 ring-sky-500" : "");
        return onChon ? (
          <button key={n.ngay} type="button" onClick={() => onChon(n.ngay)} className={lop + " hover:brightness-95"}>
            {noiDung}
          </button>
        ) : (
          <div key={n.ngay} className={lop}>
            {noiDung}
          </div>
        );
      })}
    </div>
  );
}

/**
 * KHỐI VỊ TRÍ: toạ độ bãi, độ cao, mặt trời mọc/lặn và độ dài ngày.
 *
 * Mọc/lặn LẤY THEO NGÀY ĐANG CHỌN chứ không phải một con số cố định: ở Khau Phạ
 * tháng 6 mặt trời lặn 18:40, tháng 12 mới 17:30 — hơn một tiếng, đúng bằng
 * khoảng thời gian quyết định còn kịp một chuyến cuối hay không. Số do mô hình
 * tính cho đúng toạ độ bãi nên tự đổi theo mùa, không phải khai tay.
 */
function KhoiViTri({ toaDo, ngay, t }: { toaDo: { lat: number; lon: number; ten: string; alt?: number }; ngay: Ngay | null; t: ThoiTietCopy }) {
  const daiNgay = (() => {
    if (!ngay?.matTroi) return null;
    const p = (x: string) => Number(x.slice(0, 2)) * 60 + Number(x.slice(3, 5));
    const m = p(ngay.matTroi.lan) - p(ngay.matTroi.moc);
    return m > 0 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}` : null;
  })();
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-600">
      <span className="font-bold text-slate-800">📍 {toaDo.ten}</span>
      <span className="tabular-nums">
        {toaDo.lat.toFixed(4)}, {toaDo.lon.toFixed(4)}
        {toaDo.alt ? ` · ${toaDo.alt}m` : ""}
      </span>
      {ngay?.matTroi && (
        <span className="font-semibold text-amber-700">
          ☀ {t.sunrise} {ngay.matTroi.moc} · {t.sunset} {ngay.matTroi.lan}
          {daiNgay ? ` (${daiNgay})` : ""}
        </span>
      )}
    </div>
  );
}

/**
 * TÓM TẮT ĐÁNH GIÁ NGÀY BAY cho các thứ tiếng KHÔNG PHẢI tiếng Việt.
 *
 * Khối nhận định tiếng Việt (`NhanDinhNgayBay`) sinh câu chữ chuyên môn theo
 * hàng chục mẫu — dịch cả bộ ấy sang năm thứ tiếng là việc riêng, mà để trống
 * thì khách nước ngoài mở trang ra chỉ thấy bảng số, không có lấy một câu kết
 * luận (chủ báo 10/09). Khối này rút cùng những con số ấy thành mấy dòng nhãn
 * — số thì ngôn ngữ nào cũng đọc được, còn nhãn đã có sẵn trong bộ dịch.
 *
 * Cố ý KHÔNG dịch máy phần câu chữ: câu khuyến cáo bay sai một chữ là chuyện
 * an toàn, thà nói ít mà chắc.
 */
function TomTatNgay({ ngay, t, lang }: { ngay: Ngay; t: ThoiTietCopy; lang: string }) {
  const cg = ngay.chuyenGia;
  const chot = ngay.muc === "xanh" ? t.verdictGood : ngay.muc === "vang" ? t.verdictFair : t.verdictBad;
  const gioTb = ngay.gio.length ? ngay.gio.reduce((a, g) => a + g.gio10m, 0) / ngay.gio.length : 0;
  const mayTb = ngay.gio.length ? Math.round(ngay.gio.reduce((a, g) => a + g.may, 0) / ngay.gio.length) : 0;
  /** Khung giờ giật trên 16 m/s — thứ duy nhất của gió giật đáng nói ra. */
  const gust = ngay.gio.filter((g) => g.giat > 16);
  const khungGust = gust.length
    ? gust.length === 1
      ? gust[0].gio.slice(11, 16)
      : `${gust[0].gio.slice(11, 16)}–${gust[gust.length - 1].gio.slice(11, 16)}`
    : null;

  const dong: Array<{ icon: string; nhan: string; giaTri: string }> = [
    {
      icon: "🌬",
      nhan: `${t.wind} ${t.windUnit}`,
      giaTri: `${gioTb.toFixed(1)} → ${ngay.gioMax.toFixed(1)}${ngay.gio.length ? ` ${huongTheoNgonNgu(ngay.gio[Math.floor(ngay.gio.length / 2)].huong, lang)}` : ""}`,
    },
  ];
  if (khungGust) dong.push({ icon: "💨", nhan: t.strongGusts, giaTri: `${khungGust} · ${ngay.giatMax.toFixed(0)} ${t.windUnit}` });
  dong.push({
    icon: ngay.gioMua > 0 ? "🌧" : ngay.gioMuaBay > 0 ? "🌦" : "☀️",
    nhan: t.rain,
    giaTri:
      ngay.gioMua > 0
        ? `${ngay.gioMua}${t.hourShort}${ngay.khungMua ? ` (${ngay.khungMua})` : ""} · ${ngay.muaTongThat.toFixed(1)}mm`
        : ngay.gioMuaBay > 0
          ? `${t.lightRain}${ngay.khungMuaBay ? ` · ${ngay.khungMuaBay}` : ""}`
          : t.noRain,
  });
  if (ngay.xacSuatDongMax >= 20) dong.push({ icon: "⚡", nhan: t.storm, giaTri: `${ngay.xacSuatDongMax}%` });
  if (ngay.tranMax) dong.push({ icon: "🔥", nhan: t.thermal, giaTri: `~${ngay.tranMax} m` });
  dong.push({ icon: "☁️", nhan: t.cloudCover, giaTri: `${mayTb}%` });

  return (
    <div className={"mt-2 rounded-xl border p-2.5 " + VIEN[ngay.muc]}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-sm font-black">{nhanMuc(ngay.muc, t)}</span>
        {cg && (
          <span className="rounded-lg bg-white/70 px-1.5 py-0.5 text-xs font-bold text-slate-700">
            {cg.diem}/100 · {t.confidence} {cg.doTinCay}%
          </span>
        )}
        {ngay.khungDep && (
          <span className="text-xs font-semibold">
            {t.bestWindow}: <strong>{ngay.khungDep}</strong>
          </span>
        )}
      </div>
      <p className="mt-1 text-xs leading-snug text-slate-700">{chot}</p>
      <ul className="mt-1.5 grid grid-cols-1 gap-x-4 gap-y-0.5 text-xs text-slate-700 sm:grid-cols-2">
        {dong.map((d) => (
          <li key={d.nhan} className="flex items-baseline gap-1">
            <span aria-hidden>{d.icon}</span>
            <span className="text-slate-500">{d.nhan}:</span>
            <strong className="font-semibold">{d.giaTri}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Nhãn trục của meteogram/airgram theo ngôn ngữ trang. */
function nhanBieuDo(t: ThoiTietCopy): NhanMeteogram {
  return {
    ...NHAN_METEOGRAM_VI,
    gio: t.hour,
    troi: t.sky,
    gioMs: `${t.wind} ${t.windUnit}`,
    giat: t.gust,
    may: t.cloud,
    mua: `${t.rain} mm`,
    tran: t.cloudBase,
    matDat: t.ground,
    vuot: t.swipeDays,
  };
}

/* ------------------------------------------------------------------ */
/* Bảng giờ                                                            */
/* ------------------------------------------------------------------ */

/**
 * BẢNG GIỜ (Basic) — NỐI LIỀN CẢ DÃY NGÀY, y như hai biểu đồ.
 *
 * Trước đây bảng chỉ vẽ ngày đang chọn nên vuốt hết ngày là cụt, trong khi
 * Meteogram thì chạy tiếp — ba tab cùng một chỗ mà cư xử khác nhau (chủ báo
 * 10/09). Nay bấm ngày ở dải trên thì bảng trượt tới, gạt bảng tới ngày nào
 * thì dải trên sáng ngày ấy.
 */
function BangGio({
  ngay,
  ngayChon,
  onNgayHien,
  t,
  lang,
  luat,
}: {
  ngay: Ngay[];
  ngayChon?: string | null;
  onNgayHien?: (ngay: string) => void;
  t: ThoiTietCopy;
  lang: string;
  luat?: LuatHuong;
}) {
  const { ref, onScroll } = useCuonTheoNgay(ngayChon, onNgayHien);
  /**
   * ĐIỆN THOẠI chỉ bày 7h–17h: cả dải 6–18 thì một ngày dài 463px trong khung
   * 286px, vuốt gần hai màn mới hết một ngày (chủ báo 10/09). Ca bay của mọi
   * điểm đều nằm trong 7–17 nên bỏ hai giờ đầu cuối không mất gì.
   */
  const hep = useManHinhHep();
  const cot = ngay.flatMap((n) => {
    const trong = n.gio.filter((g) => {
      const h = Number(g.gio.slice(11, 13));
      return h >= (hep ? 7 : 6) && h <= (hep ? 17 : 18);
    });
    return trong.map((g, i) => ({ g, ngay: n, dau: i === 0 }));
  });
  const gio = cot.map((c) => c.g);
  const dauNgay = new Set(cot.filter((c) => c.dau).map((c) => c.g.gio));
  /** Vạch đứng ở ô mở đầu mỗi ngày — mắt cần biết chỗ nào sang ngày mới. */
  const bd = (g: Gio) => (dauNgay.has(g.gio) ? " border-l-2 border-l-slate-300" : "");
  if (!gio.length) return null;

  const hang = (
    nhan: string,
    ve: (g: Gio) => React.ReactNode,
    lopO?: (g: Gio) => string,
    /** Màu nền/chữ CHUYỂN DẦN — dùng cho hàng gió và giật, xem `mau-gio.ts`. */
    styleO?: (g: Gio) => { background: string; color: string },
  ) => (
    <tr>
      {/* Chữ trong bảng nhích lên 12px: 11px trên điện thoại ngoài nắng là đọc không ra (chủ 10/09). */}
      <th data-truc className="sticky left-0 z-10 bg-white px-2 py-1 text-left text-xs font-bold text-slate-500">{nhan}</th>
      {gio.map((g) => (
        <td key={g.gio} style={styleO?.(g)} className={"px-1 py-1 text-center text-xs " + (lopO?.(g) ?? (styleO ? "" : "text-slate-700")) + bd(g)}>
          {ve(g)}
        </td>
      ))}
    </tr>
  );

  return (
    <div ref={ref} onScroll={onScroll} className="mt-3 overflow-x-auto overscroll-x-contain rounded-xl border border-slate-200">
      <table className="w-full min-w-[600px] border-collapse">
        <tbody>
          {/* Dải TÊN NGÀY — mốc để dải ngày phía trên và bảng bám theo nhau. */}
          <tr>
            <th data-truc className="sticky left-0 z-10 bg-white px-2 py-1 text-left text-xs font-bold text-slate-400" />
            {cot.map(({ ngay: n, dau }, i) =>
              dau ? (
                <td
                  key={`ngay-${n.ngay}`}
                  data-ngay={n.ngay}
                  colSpan={cot.filter((c) => c.ngay.ngay === n.ngay).length}
                  className={
                    "bg-slate-50 px-2 py-1 text-left text-xs font-bold text-slate-700" +
                    (i > 0 ? " border-l-2 border-l-slate-300" : "")
                  }
                >
                  <span className="sticky left-14 inline-flex items-center gap-1 whitespace-nowrap">
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ background: n.muc === "xanh" ? "#16a34a" : n.muc === "vang" ? "#eab308" : "#e11d48" }}
                      aria-hidden
                    />
                    {nhanNgay(n.ngay, homNayVN(), lang, t)}
                    {n.matTroi && (
                      <span className="font-medium text-amber-700">
                        ☀ {n.matTroi.moc}–{n.matTroi.lan}
                      </span>
                    )}
                  </span>
                </td>
              ) : null,
            )}
          </tr>
          {hang(t.hour, (g) => <span className="font-bold text-slate-800">{g.gio.slice(11, 13)}h</span>)}
          {hang(
            t.sky,
            (g) => (
              <span className="text-base leading-none" title={`${Math.round(g.may)}%`}>
                {bieuTuongTroi(g.may, g.mua, g.buXa)}
              </span>
            ),
          )}
          {hang(
            `${t.wind} ${t.windUnit}`,
            (g) => <span className="font-black">{g.gio10m.toFixed(1)}</span>,
            undefined,
            (g) => styleGio(g.gio10m),
          )}
          {hang(
            t.canFly,
            (g) => BIEU_TUONG_MUC[g.muc],
            (g) => "rounded font-bold " + DAC[g.muc],
          )}
          {hang(t.gust, (g) => <span className="font-bold">{g.giat.toFixed(1)}</span>, undefined, (g) => styleGiat(g.giat))}
          {/**
            * MŨI TÊN thay chữ hướng: đọc bằng mắt nhanh hơn, và không phải dịch
            * tên hướng sang sáu thứ tiếng cho mỗi ô. Tên hướng vẫn nằm ở tooltip.
            */}
          {hang(
            t.direction,
            (g) => (
              <span title={huongTheoNgonNgu(g.huong, lang)}>
                <WindArrow deg={g.huong} className={mauMuiTen(huongTheNao(g.huong, g.gio10m, luat), g.muc)} />
              </span>
            ),
          )}
          {/** BỎ HÀNG "% MƯA" (luật chủ 10/09): số phần trăm của mô hình là "có mưa
           * đâu đó trong ô 25 km", khách đọc thành "mưa cả ngày". Hàng mm nói thẳng. */}
          {/* DẢI NƯỚC dâng theo lượng mưa, kiểu bảng Basic của Windy — xem DaiMua. */}
          {hang(
            t.rain,
            (g) => (
              <>
                <DaiMua mm={g.mua} rao={g.muaRao} max={dinhMua(gio)} />
                <span className="relative">{g.mua >= MUA_BAY ? g.mua.toFixed(1) : "–"}</span>
              </>
            ),
            (g) => "relative " + (g.mua >= MUA_DANG_KE ? "font-bold text-sky-900" : "text-slate-400"),
          )}
          {hang(
            `⚡ ${t.storm}`,
            (g) => {
              const d = chiSoBay(g).xacSuatDong;
              return d > 0 ? `${d}%` : "–";
            },
            (g) => {
              const d = chiSoBay(g).xacSuatDong;
              return d >= 40 ? "bg-rose-200 font-bold text-rose-900" : d >= 20 ? "bg-amber-100 font-bold text-amber-900" : "text-slate-400";
            },
          )}
          {hang(
            t.cloudBase,
            (g) => {
              const cm = tranMay(g.nhietDo, g.diemSuong, g.mayThap, g.chenhDoCao ?? 0);
              return cm === null ? "–" : cm >= 1000 ? `${(cm / 1000).toFixed(1)}km` : `${cm}m`;
            },
            (g) => {
              const cm = tranMay(g.nhietDo, g.diemSuong, g.mayThap, g.chenhDoCao ?? 0);
              return cm !== null && cm < 400 && (g.mayThap ?? 0) >= 70
                ? "bg-slate-300 font-bold text-slate-900"
                : "text-slate-500";
            },
          )}
          {hang(
            t.thermal,
            (g) => t.thermalLevels[chiSoBay(g).thermal],
            (g) => (chiSoBay(g).thermal === "gat" ? "font-bold text-orange-700" : "text-slate-500"),
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bản đồ Windy                                                        */
/* ------------------------------------------------------------------ */

/**
 * Chỉ dựng iframe KHI khách bấm mở: khung Windy kéo vài trăm KB và chạy hoạt
 * hình liên tục. Trang điểm bay vốn đã nặng ảnh, thêm cái này nạp sẵn thì điểm
 * tốc độ tụt mà phần lớn khách không mở tới.
 */
function BanDoWindy({ lat, lon, ten }: { lat: number; lon: number; ten: string }) {
  /** Cho khách đổi mô hình luôn — người bay quen Windy sẽ tìm đúng cái họ hay xem. */
  const [moHinh, setMoHinh] = useState("ecmwf");
  const [lop, setLop] = useState(LOP_MAC_DINH);
  return (
    <div className="mt-2">
      {/* Lớp mây / mù — nhìn hình là biết sáng mai núi có bị trùm mây không. */}
      <div className="mb-1 flex flex-wrap items-center gap-1">
        {LOP_WINDY.map((l) => (
          <button
            key={l.ma}
            type="button"
            title={l.mo}
            onClick={() => setLop(l.ma)}
            className={
              "rounded-lg border px-2 py-0.5 text-xs font-bold " +
              (lop === l.ma ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white text-slate-700")
            }
          >
            {l.ten}
          </button>
        ))}
      </div>
      <div className="mb-1 flex flex-wrap gap-1">
        {WINDY_MODELS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMoHinh(m.id)}
            title={m.mo}
            className={
              "rounded-lg border px-2 py-0.5 text-xs font-bold " +
              (moHinh === m.id ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white text-slate-700")
            }
          >
            {m.ten}
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <iframe
          key={`${moHinh}:${lop}`}
          title={`Windy — ${ten} (${moHinh}, ${lop})`}
          src={windyEmbedUrl(lat, lon, moHinh, lop)}
          className="h-[400px] w-full"
          loading="lazy"
        />
      </div>
      {/**
       * MỞ WINDY GỐC: khung nhúng chỉ có bảng Basic (đã dò thật — mọi tham số
       * meteogram/airgram đều bị bỏ qua). Ai muốn xem đúng bản Windy thì bấm
       * ra tab mới; còn biểu đồ trong app nằm ở tab Meteogram / Airgram phía
       * trên, vẽ từ cùng số liệu và có thêm mặt bãi, trần mây theo bãi.
       */}
      <div className="mt-1 flex flex-wrap gap-1">
        {(
          [
            ["meteogram", "📊 Meteogram trên Windy ↗"],
            ["airgram", "🪂 Airgram trên Windy ↗"],
          ] as Array<["meteogram" | "airgram", string]>
        ).map(([k, nhan]) => (
          <a
            key={k}
            href={windyPageUrl(lat, lon, k)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-violet-300 bg-violet-50 px-2 py-0.5 text-xs font-bold text-violet-800 hover:bg-violet-100"
          >
            {nhan}
          </a>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Widget cho trang một điểm bay                                       */
/* ------------------------------------------------------------------ */

export function SpotWeatherWidget({ slug }: { slug: string }) {
  const { language } = useLanguage() as { language?: string };
  const lang = language ?? "vi";
  const t = useMemo(() => getThoiTietCopy(lang), [lang]);

  const [du, setDu] = useState<DiemDuBao | null>(null);
  const [loi, setLoi] = useState(false);
  const [chon, setChon] = useState<string | null>(null);
  const [moBanDo, setMoBanDo] = useState(false);
  const [moHinh, setMoHinh] = useState(MO_HINH_MAC_DINH);
  const [soSanh, setSoSanh] = useState(false);
  /** Basic (bảng số) hay Meteogram (biểu đồ) — như hai tab của Windy, mặc định Basic. */
  const [kieuXem, setKieuXem] = useState<"basic" | "meteogram" | "airgram">("basic");

  const tai = useCallback(async () => {
    setLoi(false);
    try {
      const res = await fetch(`/api/thoi-tiet?spot=${encodeURIComponent(slug)}&model=${moHinh}`);
      if (!res.ok) throw new Error();
      const j = (await res.json()) as DiemDuBao;
      setDu(j);
      /** Đổi mô hình thì giữ nguyên ngày đang xem — người ta đang so cùng một ngày. */
      setChon((c) => (c && j.ngay.some((n) => n.ngay === c) ? c : (j.ngay[0]?.ngay ?? null)));
    } catch {
      setLoi(true);
    }
  }, [slug, moHinh]);

  useEffect(() => {
    void tai();
  }, [tai]);

  const ngayChon = du?.ngay.find((n) => n.ngay === chon) ?? du?.ngay[0] ?? null;

  /**
   * KHÔNG có dự báo thì KHÔNG vẽ gì cả.
   *
   * Đây là khối phụ giữa trang bán hàng: hiện một hộp báo lỗi đỏ chỉ làm khách
   * nghi ngờ cả trang. Im lặng biến mất thì không ai mất gì.
   */
  if (loi) return null;

  if (!du) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">⛅ {t.loading}</div>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        {/** Tên bãi nằm ngay trong tiêu đề: trang Hà Nội có hai bảng cạnh nhau, không được lẫn. */}
        <h3 className="text-base font-bold text-slate-900">
          ⛅ {t.widgetTitle} — {du.ten}
        </h3>
        <span className="text-xs text-slate-500">{t.widgetNote}</span>
      </div>

      {/**
       * Nhận định ngày bay — mới có bản TIẾNG VIỆT. Câu chữ sinh động theo số
       * liệu (hàng chục mẫu câu), dịch sáu thứ tiếng là việc riêng; khách nước
       * ngoài vẫn đọc được màu và bảng giờ phía dưới, không mất gì.
       */}
      {/**
       * Tiếng Việt: khối nhận định đầy đủ (câu chữ chuyên môn theo hàng chục
       * mẫu). Thứ tiếng khác: bản TÓM TẮT rút từ cùng những con số ấy — trước
       * đây khách nước ngoài mở ra không có lấy một câu kết luận (chủ 10/09).
       */}
      {ngayChon &&
        (lang === "vi" ? (
          <NhanDinhNgayBay ngay={ngayChon as unknown as import("@/lib/baobay/thoi-tiet").NgayThoiTiet} />
        ) : (
          <TomTatNgay ngay={ngayChon} t={t} lang={lang} />
        ))}

      <DaiNgay ngay={du.ngay} chon={chon} onChon={setChon} t={t} lang={lang} />

      <KhoiViTri toaDo={du.toaDo} ngay={ngayChon} t={t} />

      {ngayChon && (
        <div className="mt-2 text-xs font-semibold text-slate-700">
          {ngayChon.khungDep ? (
            <>
              {t.bestWindow}: <span className="text-emerald-700">{ngayChon.khungDep}</span>
            </>
          ) : (
            /** Không có khung đẹp thì IM — câu "không có khung giờ đẹp" làm khách hoang mang, trong khi ngày còn có thể ngớt. */
            null
          )}
        </div>
      )}

      {/** Chọn mô hình đứng NGAY TRÊN bảng/biểu đồ — xem ghi chú ở sổ nội bộ. */}
      <div className="mt-2">
        <ChonMoHinh dangChon={moHinh} onChon={setMoHinh} soSanh={soSanh} onSoSanh={setSoSanh} />
      </div>

      {ngayChon && (
        <div className="mt-1.5 flex gap-1">
          {(
            [
              ["basic", "▦ Basic"],
              ["meteogram", "📊 Meteogram"],
              ["airgram", "🪂 Airgram"],
            ] as Array<["basic" | "meteogram" | "airgram", string]>
          ).map(([v, nhan]) => (
            <button
              key={v}
              type="button"
              onClick={() => setKieuXem(v)}
              className={
                "rounded-lg border px-2 py-0.5 text-xs font-bold " +
                (kieuXem === v ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white text-slate-700")
              }
            >
              {nhan}
            </button>
          ))}
        </div>
      )}

      {/**
       * Meteogram / Airgram vẽ CẢ DÃY NGÀY nối liền: khách gạt ngang là chạy
       * tiếp sang ngày sau, không phải bấm ngày ở dải trên (luật chủ 10/09).
       */}
      {ngayChon &&
        (kieuXem === "meteogram" ? (
          <Meteogram ngay={du.ngay as never} altBai={(du.toaDo as { alt?: number }).alt ?? 0} ngayChon={chon} onNgayHien={setChon} nhan={nhanBieuDo(t)} lang={lang} />
        ) : kieuXem === "airgram" ? (
          <Airgram ngay={du.ngay as never} altBai={(du.toaDo as { alt?: number }).alt ?? 0} ngayChon={chon} onNgayHien={setChon} nhan={nhanBieuDo(t)} lang={lang} />
        ) : (
          <BangGio ngay={du.ngay} ngayChon={chon} onNgayHien={setChon} t={t} lang={lang} luat={du.toaDo.luatHuong} />
        ))}

      {soSanh && (
        <SoSanhMoHinh
          ngayChon={chon}
          onChonNgay={setChon}
          homNay={homNayVN()}
          fetcher={async (ma) => {
            const res = await fetch(`/api/thoi-tiet?spot=${encodeURIComponent(slug)}&model=${ma}`);
            if (!res.ok) throw new Error();
            const j = (await res.json()) as DiemDuBao;
            return { ngay: j.ngay as never, moHinh: j.moHinh };
          }}
        />
      )}

      <button
        type="button"
        onClick={() => setMoBanDo((x) => !x)}
        className="mt-2 rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-800 hover:bg-sky-100"
      >
        {moBanDo ? t.mapToggleClose : t.mapToggleOpen}
      </button>
      {moBanDo && <BanDoWindy lat={du.toaDo.lat} lon={du.toaDo.lon} ten={du.toaDo.ten} />}

      {/** Nguồn xuống DÒNG RIÊNG: nó là chú thích kỹ thuật, không phải phần tiếp của câu miễn trừ. */}
      <p className="mt-2 text-xs leading-relaxed text-slate-500">{t.disclaimer}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
        {t.source}: {du.moHinh}
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Thẻ một điểm trên trang tổng hợp                                    */
/* ------------------------------------------------------------------ */

/**
 * THẺ MỘT ĐIỂM BAY trên trang tổng hợp.
 *
 * BẤM VÀO MỘT NGÀY LÀ XỔ BIỂU ĐỒ NGAY TẠI CHỖ (luật chủ 11/09) — trước đây
 * phải sang trang điểm bay mới xem được chi tiết, tức là rời khỏi đúng cái
 * màn hình đang so sáu điểm với nhau, xem xong lại bấm quay lại. Khách hỏi
 * "cuối tuần bay ở đâu" thì họ cần so, mà so thì phải ở yên một chỗ.
 *
 * Thẻ đang mở chiếm TRỌN BỀ NGANG lưới: biểu đồ giờ cần chỗ, nhét trong nửa
 * cột thì cuộn ngang gấp đôi.
 */
export function WeatherSpotCard({ diem, lang, t }: { diem: DiemDuBao; lang: string; t: ThoiTietCopy }) {
  const homNay = diem.ngay[0];
  const [chon, setChon] = useState<string | null>(null);
  const [kieuXem, setKieuXem] = useState<"basic" | "meteogram" | "airgram">("basic");
  const ngayChon = chon ? (diem.ngay.find((n) => n.ngay === chon) ?? null) : null;

  return (
    <div className={"rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" + (ngayChon ? " sm:col-span-2" : "")}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className={"rounded-lg border px-2 py-1 text-xs font-black " + VIEN[homNay.muc]} title={moTaMuc(homNay.muc, t)}>
          {nhanMuc(homNay.muc, t)}
        </div>
        <div className="leading-tight">
          <div className="text-base font-bold text-slate-900">{diem.ten}</div>
          <div className="text-xs text-slate-500">{diem.tinh}</div>
        </div>
        <Link
          href={`/spots/${diem.slug}`}
          className="ml-auto rounded-lg border border-slate-300 px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          {t.seeSpot} →
        </Link>
      </div>

      <div className="mb-2 text-xs text-slate-600">
        {homNay.khungDep ? (
          <>
            {t.bestWindow} <strong className="text-emerald-700">{homNay.khungDep}</strong>
          </>
        ) : (
          /** Không có khung đẹp thì IM — câu "không có khung giờ đẹp" làm khách hoang mang, trong khi ngày còn có thể ngớt. */
            null
        )}{" "}
        · {t.wind} {homNay.gioMax.toFixed(1)} {t.windUnit} · {t.gust} {homNay.giatMax.toFixed(1)}
        {homNay.gioMua > 0 ? ` · ${t.rain} ~${homNay.gioMua}h${homNay.khungMua ? ` (${homNay.khungMua})` : ""} · ${homNay.muaTongThat.toFixed(1)}mm` : ""}
        {homNay.xacSuatDongMax >= 20 ? ` · ⚡ ${t.storm} ${homNay.xacSuatDongMax}%` : ""}
      </div>

      <DaiNgay
        ngay={diem.ngay}
        chon={chon}
        onChon={(d) => setChon((cu) => (cu === d ? null : d))}
        t={t}
        lang={lang}
      />

      {ngayChon && (
        <div className="mt-3 border-t border-slate-200 pt-3">
          {lang === "vi" ? (
            <NhanDinhNgayBay ngay={ngayChon as unknown as import("@/lib/baobay/thoi-tiet").NgayThoiTiet} />
          ) : (
            <TomTatNgay ngay={ngayChon} t={t} lang={lang} />
          )}

          <KhoiViTri toaDo={diem.toaDo} ngay={ngayChon} t={t} />

          <div className="mt-2 flex flex-wrap items-center gap-1">
            {(
              [
                ["basic", "▦ Basic"],
                ["meteogram", "📊 Meteogram"],
                ["airgram", "🪂 Airgram"],
              ] as Array<["basic" | "meteogram" | "airgram", string]>
            ).map(([v, nhan]) => (
              <button
                key={v}
                type="button"
                onClick={() => setKieuXem(v)}
                className={
                  "rounded-lg border px-2 py-0.5 text-xs font-bold " +
                  (kieuXem === v ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white text-slate-700")
                }
              >
                {nhan}
              </button>
            ))}
            {/* Lối ĐÓNG rõ ràng: bấm lại đúng ngày ấy cũng đóng, nhưng không ai đoán ra. */}
            <button
              type="button"
              onClick={() => setChon(null)}
              className="ml-auto rounded-lg border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold text-slate-600"
            >
              ✕
            </button>
          </div>

          {kieuXem === "meteogram" ? (
            <Meteogram
              ngay={diem.ngay as never}
              altBai={(diem.toaDo as { alt?: number }).alt ?? 0}
              ngayChon={chon}
              onNgayHien={setChon}
              nhan={nhanBieuDo(t)}
              lang={lang}
            />
          ) : kieuXem === "airgram" ? (
            <Airgram
              ngay={diem.ngay as never}
              altBai={(diem.toaDo as { alt?: number }).alt ?? 0}
              ngayChon={chon}
              onNgayHien={setChon}
              nhan={nhanBieuDo(t)}
              lang={lang}
            />
          ) : (
            <BangGio ngay={diem.ngay} ngayChon={chon} onNgayHien={setChon} t={t} lang={lang} luat={diem.toaDo.luatHuong} />
          )}
        </div>
      )}
    </div>
  );
}
