// app/api/pilot-registration/slots/route.ts
/**
 * Còn bao nhiêu suất phi công cho Festival Mùa Vàng, và ai đã đăng ký.
 *
 * Đếm theo số bản ghi đợt mua_vang, KHÔNG tính người nhà đi kèm — giới hạn 50
 * là giới hạn phi công.
 *
 * Danh sách trả về CHỈ có tên viết gọn và loại hình bay. Số điện thoại, CCCD,
 * email không bao giờ rời khỏi máy chủ qua đường này: ai cũng gọi được điểm
 * cuối này mà không cần đăng nhập.
 */

import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { MUA_VANG_MAX_PILOTS, shortenPilotName } from "@/lib/pilot-event";
import { PilotRegistration } from "@/models/PilotRegistration.model";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    const docs = (await PilotRegistration.find({
      period: "mua_vang",
      status: { $ne: "cancelled" },
    })
      .select("fullName flyingKind companionCount createdAt")
      .sort({ createdAt: 1 })
      .lean()) as Array<{
      fullName?: string;
      flyingKind?: string;
      companionCount?: number;
    }>;

    const taken = docs.length;

    return NextResponse.json({
      ok: true,
      max: MUA_VANG_MAX_PILOTS,
      taken,
      remaining: Math.max(0, MUA_VANG_MAX_PILOTS - taken),
      pilots: docs.map((d) => ({
        name: shortenPilotName(String(d.fullName || "")),
        kind: String(d.flyingKind || ""),
        companions: Number(d.companionCount || 0),
      })),
    });
  } catch (e) {
    console.warn("[PilotRegistration] slots failed:", e);
    // Không đếm được thì đừng chặn phi công đăng ký — cứ báo là còn chỗ.
    return NextResponse.json({
      ok: false,
      max: MUA_VANG_MAX_PILOTS,
      taken: 0,
      remaining: MUA_VANG_MAX_PILOTS,
      pilots: [],
    });
  }
}
