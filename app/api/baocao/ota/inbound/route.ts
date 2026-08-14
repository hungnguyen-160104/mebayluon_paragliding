// app/api/baocao/ota/inbound/route.ts
import { NextResponse } from "next/server";

import { ingestOtaEmail } from "@/services/baobay-ota.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Gmail (Apps Script) đẩy THƯ OTA về đây.
 *
 * Không dùng phiên đăng nhập vì bên gọi là máy, không phải người: xác thực bằng
 * MÃ BÍ MẬT dùng chung, khai trong biến môi trường OTA_INBOUND_SECRET trên Vercel.
 * Chưa khai biến thì cửa này ĐÓNG — thà không nhận còn hơn để ngỏ cho người lạ
 * ghi booking vào sổ.
 *
 * POST { ota, gmailId, subject, body, from, receivedAt } — header x-ota-secret.
 * `from` là địa chỉ người gửi: app ưu tiên nó để nhận diện OTA, vì tên miền gửi
 * thư bền hơn mọi nhãn hay cấu hình tay.
 */
export async function POST(req: Request) {
  const secret = process.env.OTA_INBOUND_SECRET;
  if (!secret) {
    return NextResponse.json({ message: "Chưa khai OTA_INBOUND_SECRET trên máy chủ" }, { status: 503 });
  }
  if (req.headers.get("x-ota-secret") !== secret) {
    return NextResponse.json({ message: "Sai mã bảo vệ" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.gmailId) {
    return NextResponse.json({ message: "Thiếu gmailId" }, { status: 400 });
  }

  try {
    const result = await ingestOtaEmail({
      ota: String(body.ota ?? ""),
      gmailId: String(body.gmailId),
      subject: String(body.subject ?? ""),
      body: String(body.body ?? ""),
      from: body.from ? String(body.from) : undefined,
      receivedAt: body.receivedAt ? String(body.receivedAt) : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/baocao/ota/inbound error:", err);
    return NextResponse.json({ message: "Không xử lý được thư OTA" }, { status: 500 });
  }
}
