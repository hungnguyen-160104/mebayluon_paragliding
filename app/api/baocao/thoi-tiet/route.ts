// app/api/baocao/thoi-tiet/route.ts
import { NextResponse } from "next/server";

import { resolveSpot } from "@/lib/baobay/request-spot";
import { requireBaobay } from "@/middlewares/requireBaobay";
import {
  chamNgay,
  duBaoCuaChu,
  duBaoDiemBay,
  luuCauHinhDiem,
  soKinhNghiem,
  SO_NGAY,
} from "@/services/baobay-thoitiet.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/**
 * Gọi hai mô hình khí tượng qua mạng — rộng hơn hẳn route đọc Mongo. Trang nội
 * bộ mở ra là gọi cho cả ba điểm cùng lúc, mỗi điểm hai mô hình.
 */
export const maxDuration = 45;

/**
 * THỜI TIẾT ĐIỂM BAY.
 *
 * GET  ?spot=&days=  → dự báo đã chấm màu + sổ kinh nghiệm + ngưỡng máy học được
 * POST ?spot=        → chấm một ngày đã qua (bay tốt / hạn chế / nghỉ)
 * PUT  ?spot=        → sửa toạ độ chỗ cất cánh và ngưỡng gió (chỉ quản trị)
 *
 * AI XEM ĐƯỢC: mọi vai trò có mặt ở điểm bay. Trời xấu là việc của cả ca trực,
 * không riêng điều phối — quầy vé cần biết để dừng bán, phi công cần biết để
 * khỏi lên đèo sớm.
 */
const XEM = ["pilot", "dispatcher", "counter", "cameraman", "accountant", "admin"] as const;

export async function GET(req: Request) {
  const auth = requireBaobay(req, { roles: [...XEM], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const url = new URL(req.url);
  const days = Number(url.searchParams.get("days") || SO_NGAY);

  try {
    const duBao = await duBaoDiemBay(spot, {
      soNgay: Number.isFinite(days) ? days : SO_NGAY,
      boCache: url.searchParams.get("moi") === "1",
      /** ?model=gfs — chọn mô hình; bỏ trống là ECMWF. So sánh thì trình duyệt gọi từng mô hình một. */
      moHinh: url.searchParams.get("model") ?? undefined,
    });
    /**
     * Sổ kinh nghiệm đọc SAU dự báo, không song song như trước: nó cần số của
     * mấy ngày đang hiện để đi tìm ngày cũ giống từng ngày. Đây là đọc Mongo,
     * nhanh hơn hẳn lần gọi mạng phía trên nên không đáng kể.
     */
    const so = await soKinhNghiem(
      spot,
      120,
      duBao.ngay.map((n) => ({ ngay: n.ngay, gioMax: n.gioMax, giatMax: n.giatMax, muaTong: n.muaTong })),
    );
    return NextResponse.json({ ...duBao, cham: so.cham, hoc: so.hoc, chinhXac: so.chinhXac, giong: so.giong });
  } catch (err) {
    console.error("GET /api/baocao/thoi-tiet error:", err);
    return NextResponse.json({ message: "Không lấy được dự báo thời tiết" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  /** Chấm ngày là ghi kinh nghiệm của điểm — người đứng điểm làm: điều phối, quầy vé, quản trị. */
  const auth = requireBaobay(req, { roles: ["dispatcher", "counter", "admin"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const body = await req.json().catch(() => ({}));

  /**
   * Một route, hai việc: `forecast` là NÓI TRƯỚC cho ngày sắp tới, `verdict` là
   * CHẤM SAU khi ngày đã qua. Gộp vì cùng ghi vào một dòng của một ngày, và
   * người dùng thấy chúng cạnh nhau trên cùng một thẻ.
   */
  const r = body?.forecast
    ? await duBaoCuaChu(
        spot,
        { date: String(body?.date ?? ""), forecast: body.forecast, window: body?.window, note: body?.note },
        auth.username,
      )
    : await chamNgay(
        spot,
        { date: String(body?.date ?? ""), verdict: body?.verdict, note: body?.note },
        auth.username,
      );
  if (!r.ok) return NextResponse.json({ message: r.error }, { status: 400 });

  const so = await soKinhNghiem(spot);
  return NextResponse.json({ ok: true, cham: so.cham, hoc: so.hoc, chinhXac: so.chinhXac });
}

export async function PUT(req: Request) {
  const auth = requireBaobay(req, { roles: ["admin"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const body = await req.json().catch(() => ({}));
  const r = await luuCauHinhDiem(spot, body ?? {}, auth.username);
  if (!r.ok) return NextResponse.json({ message: r.error }, { status: 400 });

  const duBao = await duBaoDiemBay(spot, { boCache: true });
  return NextResponse.json({ ok: true, ...duBao });
}
