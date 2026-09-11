// app/api/thoi-tiet/skew-t/route.ts
import { NextResponse } from "next/server";

import { diemThoiTietTheoSlug } from "@/lib/weather-spots";
import { TOA_DO_MAC_DINH } from "@/lib/baobay/thoi-tiet";
import { normalizeSpot } from "@/lib/baobay/spots";
import { caoTheoAp, MUC_AP, type ThamKhong } from "@/lib/baobay/skew-t";
import { moHinhTheoMa, MO_HINH_MAC_DINH } from "@/lib/baobay/mo-hinh";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * THÁM KHÔNG (SKEW-T) CHO MỘT ĐIỂM BAY, MỘT NGÀY.
 *
 * Lấy RIÊNG chứ không nhét vào `/api/thoi-tiet`: một ngày × 12 mực × 4 trường
 * là gần 50 con số mỗi giờ, nhân 10 ngày × 7 điểm thì gói dữ liệu trang chính
 * phình lên gấp mấy lần — trong khi giản đồ này chỉ mở khi có người bấm nút.
 *
 * GET /api/thoi-tiet/skew-t?spot=doi-bu&date=2026-09-12[&model=ecmwf_ifs04]
 */
const CACHE_HEADER = "public, s-maxage=1800, stale-while-revalidate=3600";

/** Mực nào cũng cần bốn trường; ghép sẵn để khỏi lặp. */
const TRUONG = MUC_AP.flatMap((p) => [
  `temperature_${p}hPa`,
  `dew_point_${p}hPa`,
  `wind_speed_${p}hPa`,
  `wind_direction_${p}hPa`,
  `geopotential_height_${p}hPa`,
]).join(",");

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = String(url.searchParams.get("spot") || "");
  const date = String(url.searchParams.get("date") || "");
  const model = url.searchParams.get("model") || undefined;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ message: "Thiếu ngày (YYYY-MM-DD)" }, { status: 400 });
  }

  /** Toạ độ: ưu tiên bảng điểm trang khách, không có thì tra bảng nội bộ. */
  const diem = diemThoiTietTheoSlug(slug);
  const noiBo = TOA_DO_MAC_DINH[normalizeSpot(slug)];
  const lat = diem?.lat ?? noiBo?.lat;
  const lon = diem?.lon ?? noiBo?.lon;
  const ten = diem?.ten ?? noiBo?.ten;
  if (lat === undefined || lon === undefined) {
    return NextResponse.json({ message: "Không có điểm bay này" }, { status: 404 });
  }

  try {
    const mh = moHinhTheoMa(model ?? MO_HINH_MAC_DINH);
    const q = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      hourly: TRUONG,
      start_date: date,
      end_date: date,
      timezone: "Asia/Bangkok",
      wind_speed_unit: "ms",
    });
    if (mh.id) q.set("models", mh.id);
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${q}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) throw new Error(`Open-Meteo trả ${res.status}`);
    const js = (await res.json()) as { hourly?: Record<string, Array<number | null>> & { time?: string[] } };
    const h = js.hourly;
    if (!h?.time?.length) throw new Error("Mô hình không trả giờ nào");

    const so = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
    const gio: ThamKhong[] = h.time.map((t, i) => ({
      gio: t,
      muc: MUC_AP.map((ap) => {
        const nhiet = so(h[`temperature_${ap}hPa`]?.[i]);
        const suong = so(h[`dew_point_${ap}hPa`]?.[i]);
        return {
          ap,
          cao: so(h[`geopotential_height_${ap}hPa`]?.[i]) ?? caoTheoAp(ap),
          nhiet: nhiet ?? NaN,
          suong: suong ?? NaN,
          gio: so(h[`wind_speed_${ap}hPa`]?.[i]),
          huong: so(h[`wind_direction_${ap}hPa`]?.[i]),
        };
      }).filter((m) => Number.isFinite(m.nhiet)),
    }));

    return NextResponse.json(
      { slug, ten, lat, lon, alt: diem ? undefined : noiBo?.alt, ngay: date, moHinh: mh.ten, gio },
      { headers: { "Cache-Control": CACHE_HEADER } },
    );
  } catch (err) {
    console.error("GET /api/thoi-tiet/skew-t error:", err);
    return NextResponse.json({ message: "Không lấy được dữ liệu thám không" }, { status: 502 });
  }
}
