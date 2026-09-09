// app/api/baocao/thoi-tiet/route.ts
import { NextResponse } from "next/server";

import { resolveSpot } from "@/lib/baobay/request-spot";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { chamNgay, duBaoDiemBay, luuCauHinhDiem, soKinhNghiem } from "@/services/baobay-thoitiet.service";

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
  const days = Number(url.searchParams.get("days") || 5);

  try {
    /**
     * Hai việc song song: gọi mạng lấy dự báo và đọc Mongo lấy sổ chấm. Nối
     * tiếp thì người xem phải chờ cả hai cộng lại, mà chúng chẳng cần nhau.
     */
    const [duBao, so] = await Promise.all([
      duBaoDiemBay(spot, { soNgay: Number.isFinite(days) ? days : 5, boCache: url.searchParams.get("moi") === "1" }),
      soKinhNghiem(spot),
    ]);
    return NextResponse.json({ ...duBao, cham: so.cham, hoc: so.hoc });
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
  const r = await chamNgay(
    spot,
    { date: String(body?.date ?? ""), verdict: body?.verdict, note: body?.note },
    auth.username,
  );
  if (!r.ok) return NextResponse.json({ message: r.error }, { status: 400 });

  const so = await soKinhNghiem(spot);
  return NextResponse.json({ ok: true, cham: so.cham, hoc: so.hoc });
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
