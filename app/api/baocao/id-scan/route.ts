// app/api/baocao/id-scan/route.ts
import { NextResponse } from "next/server";

import { askAiIdScan } from "@/lib/baobay/ai-id-scan";
import { requireBaobay } from "@/middlewares/requireBaobay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Mô hình nhìn ảnh mất vài chục giây là thường. */
export const maxDuration = 60;

/**
 * ĐỌC ẢNH GIẤY TỜ BẰNG AI — đường CUỐI của thẻ quét CCCD, chỉ được gọi sau
 * khi cả hai bộ đọc trong máy (QR + OCR dãy MRZ) đã trượt.
 *
 * POST {image: "data:image/jpeg;base64,..."} -> {person} | 422 {message}
 *
 * Mọi vai trò báo bay đã đăng nhập đều gọi được: quầy, điều phối lẫn phi công
 * đều là người nhập hồ sơ bảo hiểm. Ảnh KHÔNG được lưu ở máy chủ mình — đọc
 * xong trong yêu cầu là hết.
 */
export async function POST(req: Request) {
  const auth = requireBaobay(req, {});
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const image = String(body?.image ?? "");
  const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(image);
  if (!m) {
    return NextResponse.json({ message: "Ảnh gửi lên không đúng dạng" }, { status: 400 });
  }
  // ~4.5MB ảnh thật — thẻ đã thu nhỏ về 1600px trước khi gửi nên không thể chạm trần này
  if (m[2].length > 6_000_000) {
    return NextResponse.json({ message: "Ảnh quá nặng — thử lại giúp" }, { status: 413 });
  }

  try {
    const person = await askAiIdScan(m[2], m[1] as "image/jpeg" | "image/png" | "image/webp");
    if (!person) {
      return NextResponse.json(
        { message: "AI cũng không đọc được ảnh này — chụp lại gần hơn, đủ sáng, thẻ nằm ngang." },
        { status: 422 },
      );
    }
    return NextResponse.json({ person });
  } catch (err) {
    console.error("POST /api/baocao/id-scan error:", err);
    return NextResponse.json({ message: "Không gọi được AI đọc giấy tờ — thử lại sau" }, { status: 502 });
  }
}
