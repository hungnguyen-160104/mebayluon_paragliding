// app/api/baocao/booking/inbound-sheet/route.ts
import { NextResponse } from "next/server";

import { BaobayError, ingestSapaSheetRows } from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Một lượt quét gửi tối đa 60 dòng, mỗi dòng vài phép ghi Mongo — nới giờ chờ. */
export const maxDuration = 60;

/**
 * CỬA NHẬN DÒNG NHÂN VIÊN GÕ THẲNG VÀO SỔ TAY GOOGLE SHEETS CỦA SA PA.
 *
 * Chiều ngược lại (app → bảng tính) đi bằng đường cũ: mỗi lần booking được lưu,
 * `pushBookingRow` đẩy một dòng sang Apps Script. Cửa này lo chiều còn lại —
 * Apps Script chạy theo đồng hồ, thấy dòng nào nhân viên vừa sửa thì gửi sang.
 *
 *   POST { sheet: "T9-2026", rows: [ {row, key, daySeq, flightDate, …} ] }
 *   header: x-sheet-secret
 *
 * Trả về `{ sheet, results: [{ row, key, action, write, warn }] }` — Apps Script
 * lấy `key` ghi vào cột "Khoá app", lấy `write` ghi ngược các ô app làm chủ
 * (số thứ tự khách, trạng thái, đã thu), và dán `warn` vào ô ghi chú của dòng.
 *
 * Bên gọi là MÁY nên không dùng phiên đăng nhập: xác thực bằng mã bí mật dùng
 * chung `SAPA_SHEET_SECRET` (chưa khai thì rơi về `BAOBAY_SHEET_SECRET` — cùng
 * chuỗi đã dán trong Apps Script của bảng đó). Chưa khai cái nào thì cửa ĐÓNG:
 * thà không nhận còn hơn để ngỏ cho người lạ ghi booking vào sổ.
 */
export async function POST(req: Request) {
  const secret = process.env.SAPA_SHEET_SECRET || process.env.BAOBAY_SHEET_SECRET;
  if (!secret) {
    return NextResponse.json({ message: "Chưa khai SAPA_SHEET_SECRET trên máy chủ" }, { status: 503 });
  }
  if (req.headers.get("x-sheet-secret") !== secret) {
    return NextResponse.json({ message: "Sai mã bảo vệ" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ message: "Nội dung gửi lên không đọc được" }, { status: 400 });

  const rows = Array.isArray(body.rows) ? body.rows : [];
  /**
   * TRẦN 60 DÒNG mỗi lượt. Apps Script chỉ được chạy 6 phút một lượt và cửa
   * này có 60 giây — gửi cả tab tháng (600+ dòng) là cả hai bên cùng hết giờ
   * rồi KHÔNG ai ghi được gì, mà lần sau vẫn đúng chỗ đó lỗi tiếp. Thà nhận
   * 60 dòng rồi lượt sau nhận tiếp.
   */
  if (rows.length > 60) {
    return NextResponse.json({ message: `Gửi ${rows.length} dòng, tối đa 60 dòng mỗi lượt` }, { status: 400 });
  }

  try {
    const res = await ingestSapaSheetRows({ sheet: String(body.sheet ?? ""), rows });
    return NextResponse.json(res);
  } catch (err) {
    if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("POST /api/baocao/booking/inbound-sheet error:", err);
    return NextResponse.json({ message: "Không ghi được booking từ bảng tính" }, { status: 500 });
  }
}
