// lib/baobay/tham-khong-api.ts
/**
 * LẤY SỐ LIỆU THÁM KHÔNG (SKEW-T) từ Open-Meteo cho một toạ độ, một ngày.
 *
 * Tách khỏi route /api/thoi-tiet/skew-t (29/09/2026) để thư dự báo 20h dùng
 * chung — thư cần giản đồ 12h cho từng điểm, từng ngày.
 */
import { caoTheoAp, MUC_AP, type ThamKhong } from "@/lib/baobay/skew-t";
import { moHinhTheoMa, MO_HINH_MAC_DINH } from "@/lib/baobay/mo-hinh";

/** Mực nào cũng cần năm trường; ghép sẵn để khỏi lặp. */
const TRUONG = MUC_AP.flatMap((p) => [
  `temperature_${p}hPa`,
  `dew_point_${p}hPa`,
  `wind_speed_${p}hPa`,
  `wind_direction_${p}hPa`,
  `geopotential_height_${p}hPa`,
]).join(",");

export async function layThamKhong(opts: {
  lat: number;
  lon: number;
  /** "YYYY-MM-DD". */
  ngay: string;
  model?: string;
}): Promise<{ moHinh: string; gio: ThamKhong[] }> {
  const mh = moHinhTheoMa(opts.model ?? MO_HINH_MAC_DINH);
  const q = new URLSearchParams({
    latitude: String(opts.lat),
    longitude: String(opts.lon),
    hourly: TRUONG,
    start_date: opts.ngay,
    end_date: opts.ngay,
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
  return { moHinh: mh.ten, gio };
}
