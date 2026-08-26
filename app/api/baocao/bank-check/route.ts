// app/api/baocao/bank-check/route.ts
import { NextResponse } from "next/server";

import { requireBaobay } from "@/middlewares/requireBaobay";
import { BaobayError } from "@/services/baobay.service";
import {
  aiMatchBankLines,
  applyAiBankMatch,
  assignBankLine,
  confirmBankItem,
  lockBookingChecked,
  deleteBankLine,
  detachBankLine,
  skipBankItem,
  getBankCheck,
  listAssignOptions,
  recheckBankPending,
  resolveBankLine,
  runBankCheck,
} from "@/services/bank-check.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/**
 * Nhánh "ai-match" gọi sang Anthropic và đợi trả lời — chạy thật mất 60-170
 * giây tuỳ số dòng treo. Không khai thì rơi vào trần mặc định của Vercel và
 * đứt giữa chừng, người dùng chỉ thấy lỗi mạng không hiểu vì sao.
 */
export const maxDuration = 300;

/**
 * SOÁT CHUYỂN KHOẢN của kế toán — dán SMS banking / sao kê, máy dò từng khoản
 * về đúng booking. Chỉ kế toán (và quản trị) đụng được: đây là việc đối chiếu
 * tiền của cả công ty, không theo điểm bay.
 *
 * GET   ?date=YYYY-MM-DD&spots=khau-pha -> bảng soát của ngày + khoản treo (spots bỏ trống = mọi điểm được phân)
 * GET   ?options=1&q=thao               -> danh sách khoản để gán tay; có q thì tìm XUYÊN NGÀY
 * POST  {date, text}                    -> dán sao kê, soát rồi lưu từng dòng
 * PATCH {action: "recheck", date}       -> soát lại mọi khoản treo
 * PATCH {action: "ai-match", date}       -> nhờ AI đọc các dòng treo, TRẢ ĐỀ XUẤT (không ghi gì)
 * PATCH {action: "ai-apply", id, refId}  -> kế toán đồng ý một đề xuất của AI
 * PATCH {action: "confirm", refId, on}  -> kế toán "ĐÃ NHẬN" một khoản (quyền cao nhất, khỏi soát tiếp)
 * PATCH {action: "resolve", id, note}   -> kết luận tay một khoản treo
 * PATCH {action: "delete", id}          -> xoá dòng dán nhầm
 */

const ROLES = { roles: ["accountant", "admin"] as ("accountant" | "admin")[] };

function fail(err: unknown, fallback: string) {
  if (err instanceof BaobayError) return NextResponse.json({ message: err.message }, { status: err.status });
  console.error("bank-check error:", err);
  return NextResponse.json({ message: fallback }, { status: 500 });
}

export async function GET(req: Request) {
  const auth = requireBaobay(req, { ...ROLES, allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const date = url.searchParams.get("date") ?? "";
  const spots = (url.searchParams.get("spots") ?? "").split(",").filter(Boolean);
  try {
    // ?options=1: danh sách khoản của ngày để kế toán CHỈ ĐỊNH dòng sao kê lạc chủ
    if (url.searchParams.get("options") === "1") {
      // q = tìm xuyên ngày (khách cọc hôm nay, bay tháng sau) — xem listAssignOptions
      const q = url.searchParams.get("q") ?? "";
      return NextResponse.json({ options: await listAssignOptions(auth, date, spots, q) });
    }
    return NextResponse.json(await getBankCheck(auth, date, spots));
  } catch (err) {
    return fail(err, "Không tải được bảng soát chuyển khoản");
  }
}

export async function POST(req: Request) {
  const auth = requireBaobay(req, { ...ROLES, allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const spots = Array.isArray(body?.spots) ? body.spots.map(String) : [];
  try {
    return NextResponse.json(await runBankCheck(auth, String(body?.date ?? ""), String(body?.text ?? ""), spots));
  } catch (err) {
    return fail(err, "Không soát được sao kê");
  }
}

export async function PATCH(req: Request) {
  const auth = requireBaobay(req, { ...ROLES, allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "");
  try {
    if (action === "recheck") {
      const spots = Array.isArray(body?.spots) ? body.spots.map(String) : [];
      return NextResponse.json(await recheckBankPending(auth, String(body?.date ?? ""), spots));
    }
    if (action === "ai-match") {
      const spots = Array.isArray(body?.spots) ? body.spots.map(String) : [];
      return NextResponse.json(await aiMatchBankLines(auth, String(body?.date ?? ""), spots));
    }
    if (action === "ai-apply") {
      await applyAiBankMatch(auth, String(body?.id ?? ""), String(body?.refId ?? ""), String(body?.why ?? ""));
      return NextResponse.json({ ok: true });
    }
    if (action === "lock-booking") {
      // Đủ chuẩn (đã bay + hết nợ + mọi khoản đã nhận) → khoá ngay; thiếu thì
      // trả cảnh báo, bấm lại với force=true là "Tôi hiểu & vẫn khoá"
      return NextResponse.json(await lockBookingChecked(auth, String(body?.bookingId ?? ""), body?.force === true));
    }
    if (action === "confirm") {
      await confirmBankItem(auth, String(body?.refId ?? ""), body?.on !== false);
      return NextResponse.json({ ok: true });
    }
    if (action === "assign") {
      // Kế toán chỉ định dòng sao kê thuộc khoản nào (chọn ngày + khoản)
      await assignBankLine(auth, String(body?.id ?? ""), String(body?.refId ?? ""), String(body?.date ?? ""));
      return NextResponse.json({ ok: true });
    }
    if (action === "resolve") {
      await resolveBankLine(auth, String(body?.id ?? ""), String(body?.note ?? ""));
      return NextResponse.json({ ok: true });
    }
    if (action === "skip") {
      // Bỏ qua đối soát khoản này (hoặc lấy lại) — bắt buộc có lý do khi bỏ qua
      await skipBankItem(auth, String(body?.refId ?? ""), body?.on !== false, String(body?.reason ?? ""));
      return NextResponse.json({ ok: true });
    }
    if (action === "detach") {
      // Dòng tiền thật nhưng khớp nhầm booking: gỡ về trạng thái treo, không xoá
      await detachBankLine(String(body?.id ?? ""));
      return NextResponse.json({ ok: true });
    }
    if (action === "delete") {
      await deleteBankLine(String(body?.id ?? ""));
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ message: "Hành động không hợp lệ" }, { status: 400 });
  } catch (err) {
    return fail(err, "Không xử lý được khoản này");
  }
}
