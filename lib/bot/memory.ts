// lib/bot/memory.ts
//
// Bộ nhớ hội thoại.
//
// n8n cũ dùng $getWorkflowStaticData("global") — một biến nằm trong tiến trình
// n8n. Trên Vercel mỗi request có thể chạy ở tiến trình khác, biến đó KHÔNG
// tồn tại. Chép nguyên sang là bot quên sạch sau mỗi câu.
//
// Hai kênh dùng hai nguồn khác nhau, đúng yêu cầu ban đầu:
//
//  - MESSENGER: lấy thẳng lịch sử từ Graph API. Facebook đã lưu sẵn toàn bộ
//    đoạn chat, vĩnh viễn, miễn phí — không cần collection nào.
//
//  - WEB: khách không có tài khoản, Facebook không giữ hộ, nên tự lưu vào
//    MongoDB. Tự hết hạn sau 7 ngày bằng TTL index, không cần cron dọn.
//
// Dùng lại connectDB() và mongoose sẵn có của dự án, KHÔNG mở kết nối riêng:
// serverless mà mỗi module tự mở pool là cạn connection của cluster.

import mongoose, { Schema, type Model } from "mongoose";
import { connectDB } from "@/lib/mongodb";

export type Turn = { u: string; a: string; ts: number };

const WEB_MAX_TURNS = 12;
const WEB_TTL_SECONDS = 7 * 24 * 60 * 60;
const GRAPH = "https://graph.facebook.com/v25.0";

type BotWebMemoryDoc = {
  sessionId: string;
  turns: Turn[];
  updatedAt: Date;
};

const TurnSchema = new Schema<Turn>(
  {
    u: { type: String, required: true },
    a: { type: String, required: true },
    ts: { type: Number, required: true },
  },
  { _id: false },
);

const BotWebMemorySchema = new Schema<BotWebMemoryDoc>({
  sessionId: { type: String, required: true, unique: true, index: true },
  turns: { type: [TurnSchema], default: [] },
  // TTL: MongoDB tự xoá document quá 7 ngày kể từ lần ghi cuối.
  updatedAt: { type: Date, default: Date.now, expires: WEB_TTL_SECONDS },
});

// Next.js giữ module giữa các lần gọi; đăng ký lại model đã có sẽ ném
// OverwriteModelError, nên phải lấy lại từ mongoose.models.
const BotWebMemory: Model<BotWebMemoryDoc> =
  (mongoose.models.BotWebMemory as Model<BotWebMemoryDoc>) ||
  mongoose.model<BotWebMemoryDoc>("BotWebMemory", BotWebMemorySchema);

/* ------------------------------------------------------------------ */
/* WEB                                                                 */
/* ------------------------------------------------------------------ */
export async function getWebHistory(sessionId: string): Promise<Turn[]> {
  try {
    await connectDB();
    const doc = await BotWebMemory.findOne({ sessionId }).lean();
    return (doc?.turns as Turn[]) ?? [];
  } catch (err) {
    // Mất trí nhớ vẫn hơn là sập cả câu trả lời.
    console.error("[memory] đọc lỗi:", err);
    return [];
  }
}

export async function saveWebTurn(sessionId: string, user: string, reply: string) {
  const turn: Turn = { u: user, a: String(reply).slice(0, 900), ts: Date.now() };

  try {
    await connectDB();
    // $push kèm $slice: MongoDB tự cắt còn 12 lượt gần nhất ngay trong một
    // lệnh ghi. Đọc lên rồi ghi đè sẽ mất tin khi khách gõ hai câu sát nhau.
    await BotWebMemory.updateOne(
      { sessionId },
      {
        $push: { turns: { $each: [turn], $slice: -WEB_MAX_TURNS } },
        $set: { updatedAt: new Date() },
      },
      { upsert: true },
    );
  } catch (err) {
    console.error("[memory] ghi lỗi:", err);
  }
}

/* ------------------------------------------------------------------ */
/* MESSENGER — lịch sử lấy từ Facebook                                 */
/* ------------------------------------------------------------------ */
export async function getMessengerHistory(
  pageId: string,
  psid: string,
  pageToken: string,
): Promise<string> {
  const url =
    `${GRAPH}/${pageId}/conversations` +
    `?platform=messenger&user_id=${encodeURIComponent(psid)}` +
    `&fields=${encodeURIComponent("messages.limit(40){message,from}")}` +
    `&access_token=${encodeURIComponent(pageToken)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error("[memory] Graph history lỗi", res.status, await res.text());
      return "";
    }
    const json = await res.json();
    const arr = json?.data?.[0]?.messages?.data;
    if (!Array.isArray(arr)) return "";

    // Graph trả mới nhất trước — đảo lại cho đúng thứ tự đọc.
    return arr
      .slice()
      .reverse()
      .filter((m: { message?: string }) => m?.message)
      .map((m: { message: string; from?: { id?: string } }) =>
        (String(m.from?.id) === String(pageId) ? "Nhân viên: " : "Khách: ") + m.message,
      )
      .join("\n");
  } catch (err) {
    console.error("[memory] Graph history ném lỗi:", err);
    return "";
  }
}

/** Định dạng lịch sử web thành khối văn bản giống hệt bản n8n cũ. */
export function formatWebHistory(turns: Turn[]): string {
  if (!turns.length) return "";
  const body = turns
    .slice(-10)
    .map((t) => "Khách: " + t.u + "\nMebayluon: " + t.a)
    .join("\n");
  return (
    "=== LICH SU HOI THOAI VOI CHINH KHACH NAY " +
    "(doc ky, KHONG hoi lai thong tin khach da noi) ===\n" +
    body +
    "\n=== HET LICH SU. Tin nhan moi cua khach: ===\n"
  );
}
