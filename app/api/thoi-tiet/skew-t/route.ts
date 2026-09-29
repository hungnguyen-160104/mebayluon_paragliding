// app/api/thoi-tiet/skew-t/route.ts
import { NextResponse } from "next/server";

import { diemThoiTietTheoSlug } from "@/lib/weather-spots";
import { TOA_DO_MAC_DINH } from "@/lib/baobay/thoi-tiet";
import { normalizeSpot } from "@/lib/baobay/spots";
import { layThamKhong } from "@/lib/baobay/tham-khong-api";

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
    const { moHinh, gio } = await layThamKhong({ lat, lon, ngay: date, model });

    return NextResponse.json(
      { slug, ten, lat, lon, alt: diem ? undefined : noiBo?.alt, ngay: date, moHinh, gio },
      { headers: { "Cache-Control": CACHE_HEADER } },
    );
  } catch (err) {
    console.error("GET /api/thoi-tiet/skew-t error:", err);
    return NextResponse.json({ message: "Không lấy được dữ liệu thám không" }, { status: 502 });
  }
}
