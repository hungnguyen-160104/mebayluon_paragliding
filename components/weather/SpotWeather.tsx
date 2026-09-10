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
import { chiSoBay, muiTenGio, sucGiat, sucGio, tranMay, type SucGio } from "@/lib/baobay/thoi-tiet";

type MucDo = "xanh" | "vang" | "do";

type Gio = {
  gio: string;
  /** Gió trung bình, m/s — đơn vị phi công dùng tại bãi. */
  gio10m: number;
  giat: number;
  huong: number;
  mua: number;
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
  xacSuatDongMax: number;
  tranMax: number | null;
  gio: Gio[];
};

export type DiemDuBao = {
  slug: string;
  ten: string;
  tinh: string;
  toaDo: { lat: number; lon: number; ten: string };
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

/** Thang SỨC GIÓ — cùng bộ màu với sổ nội bộ để hai bên đọc như nhau. */
const MAU_GIO: Record<SucGio, string> = {
  nhe: "bg-emerald-200 text-emerald-900",
  vua: "bg-emerald-500 text-white",
  hoiManh: "bg-amber-300 text-amber-950",
  manh: "bg-orange-400 text-white",
  ratManh: "bg-rose-500 text-white",
};

/** Giật chỉ đáng chú ý từ 14 m/s: dưới đó để chữ mờ cho khỏi bắt mắt vô ích. */
const MAU_GIAT: Record<"nhe" | "vua" | "manh" | "ratManh", string> = {
  nhe: "text-slate-400",
  vua: "text-slate-500",
  manh: "font-bold text-orange-700",
  ratManh: "font-bold text-rose-700",
};

function nhanMuc(muc: MucDo, t: ThoiTietCopy): string {
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
    <div className="grid grid-cols-5 gap-1.5">
      {ngay.slice(0, 5).map((n) => {
        const noiDung = (
          <>
            <div className="text-[10px] font-bold uppercase tracking-wide opacity-80">
              {nhanNgay(n.ngay, homNay, lang, t)}
            </div>
            <div className="mt-0.5 text-lg font-black leading-none">{n.gioMax.toFixed(1)}</div>
            <div className="text-[10px] opacity-70">{t.windUnit}</div>
            <div className="mt-0.5 text-[10px] font-semibold leading-tight">
              {n.gioXanh > 0 ? `${n.gioXanh} ${t.goodHours}` : nhanMuc(n.muc, t)}
            </div>
            {n.xacSuatMuaMax >= 50 && <div className="text-[10px] leading-tight">☔ {n.xacSuatMuaMax}%</div>}
            {n.xacSuatDongMax >= 20 && <div className="text-[10px] font-bold leading-tight">⚡ {n.xacSuatDongMax}%</div>}
          </>
        );
        const lop =
          "rounded-xl border px-1 py-2 text-center transition " +
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

/* ------------------------------------------------------------------ */
/* Bảng giờ                                                            */
/* ------------------------------------------------------------------ */

function BangGio({ ngay, t, lang }: { ngay: Ngay; t: ThoiTietCopy; lang: string }) {
  const gio = ngay.gio.filter((g) => {
    const h = Number(g.gio.slice(11, 13));
    return h >= 6 && h <= 18;
  });
  if (!gio.length) return null;

  const hang = (nhan: string, ve: (g: Gio) => React.ReactNode, lopO?: (g: Gio) => string) => (
    <tr>
      <th className="sticky left-0 z-10 bg-white px-2 py-1 text-left text-[11px] font-bold text-slate-500">{nhan}</th>
      {gio.map((g) => (
        <td key={g.gio} className={"px-1 py-1 text-center text-[11px] " + (lopO?.(g) ?? "text-slate-700")}>
          {ve(g)}
        </td>
      ))}
    </tr>
  );

  return (
    <div className="mt-3 overflow-x-auto overscroll-x-contain rounded-xl border border-slate-200">
      <table className="w-full min-w-[600px] border-collapse">
        <tbody>
          {hang(t.hour, (g) => <span className="font-bold text-slate-800">{g.gio.slice(11, 13)}h</span>)}
          {hang(
            `${t.wind} ${t.windUnit}`,
            (g) => <span className="font-black">{g.gio10m.toFixed(1)}</span>,
            (g) => "rounded " + MAU_GIO[sucGio(g.gio10m)],
          )}
          {hang(
            t.canFly,
            (g) => (g.muc === "xanh" ? "✔" : g.muc === "vang" ? "⚠" : "✕"),
            (g) => "rounded font-bold " + DAC[g.muc],
          )}
          {hang(t.gust, (g) => g.giat.toFixed(1), (g) => MAU_GIAT[sucGiat(g.giat)])}
          {/**
            * MŨI TÊN thay chữ hướng: đọc bằng mắt nhanh hơn, và không phải dịch
            * tên hướng sang sáu thứ tiếng cho mỗi ô. Tên hướng vẫn nằm ở tooltip.
            */}
          {hang(
            t.direction,
            (g) => <span className="text-base leading-none" title={huongTheoNgonNgu(g.huong, lang)}>{muiTenGio(g.huong)}</span>,
          )}
          {hang(
            t.rainChance,
            (g) => (g.xacSuatMua === undefined ? "–" : `${Math.round(g.xacSuatMua)}%`),
            (g) => ((g.xacSuatMua ?? 0) >= 60 ? "font-bold text-sky-800" : "text-slate-500"),
          )}
          {hang(
            t.rain,
            (g) => (g.mua > 0.05 ? g.mua.toFixed(1) : "–"),
            (g) => (g.mua > 0.5 ? "font-bold text-sky-700" : "text-slate-400"),
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
          {hang(t.cloud, (g) => `${Math.round(g.may)}%`, () => "text-slate-500")}
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
  const q = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    detailLat: String(lat),
    detailLon: String(lon),
    zoom: "10",
    level: "surface",
    overlay: "wind",
    product: "ecmwf",
    menu: "",
    message: "true",
    marker: "true",
    calendar: "now",
    pressure: "",
    type: "map",
    location: "coordinates",
    detail: "true",
    metricWind: "km/h",
    metricTemp: "°C",
    radarRange: "-1",
  });
  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-slate-200">
      <iframe
        title={`Windy — ${ten}`}
        src={`https://embed.windy.com/embed2.html?${q}`}
        className="h-[400px] w-full"
        loading="lazy"
      />
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

  const tai = useCallback(async () => {
    setLoi(false);
    try {
      const res = await fetch(`/api/thoi-tiet?spot=${encodeURIComponent(slug)}`);
      if (!res.ok) throw new Error();
      const j = (await res.json()) as DiemDuBao;
      setDu(j);
      setChon(j.ngay[0]?.ngay ?? null);
    } catch {
      setLoi(true);
    }
  }, [slug]);

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
        <h3 className="text-base font-bold text-slate-900">⛅ {t.widgetTitle}</h3>
        <span className="text-xs text-slate-500">
          {du.toaDo.ten} · {t.widgetNote}
        </span>
      </div>

      <DaiNgay ngay={du.ngay} chon={chon} onChon={setChon} t={t} lang={lang} />

      {ngayChon && (
        <div className="mt-2 text-xs font-semibold text-slate-700">
          {ngayChon.khungDep ? (
            <>
              {t.bestWindow}: <span className="text-emerald-700">{ngayChon.khungDep}</span>
            </>
          ) : (
            <span className="text-rose-700">{t.noWindow}</span>
          )}
        </div>
      )}

      {ngayChon && <BangGio ngay={ngayChon} t={t} lang={lang} />}

      <button
        type="button"
        onClick={() => setMoBanDo((x) => !x)}
        className="mt-2 rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-800 hover:bg-sky-100"
      >
        {moBanDo ? t.mapToggleClose : t.mapToggleOpen}
      </button>
      {moBanDo && <BanDoWindy lat={du.toaDo.lat} lon={du.toaDo.lon} ten={du.toaDo.ten} />}

      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
        {t.disclaimer} · {t.source}: {du.moHinh}
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Thẻ một điểm trên trang tổng hợp                                    */
/* ------------------------------------------------------------------ */

export function WeatherSpotCard({ diem, lang, t }: { diem: DiemDuBao; lang: string; t: ThoiTietCopy }) {
  const homNay = diem.ngay[0];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className={"rounded-lg border px-2 py-1 text-xs font-black " + VIEN[homNay.muc]}>
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
          <span className="text-rose-700">{t.noWindow}</span>
        )}{" "}
        · {t.wind} {homNay.gioMax.toFixed(1)} {t.windUnit} · {t.gust} {homNay.giatMax.toFixed(1)}
        {homNay.xacSuatMuaMax >= 0 ? ` · ${t.rainChance} ${homNay.xacSuatMuaMax}%` : ""}
        {homNay.xacSuatDongMax >= 20 ? ` · ⚡ ${t.storm} ${homNay.xacSuatDongMax}%` : ""}
      </div>

      <DaiNgay ngay={diem.ngay} t={t} lang={lang} />
    </div>
  );
}
