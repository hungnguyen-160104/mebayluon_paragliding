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

/* ------------------------------------------------------------------ */
/* CHỐNG GHI TRÙNG BOOKING                                             */
/*                                                                     */
/* Quy tắc trong prompt không đủ tin cậy — mô hình thỉnh thoảng vẫn    */
/* xuất lại khối BOOKING_DATA cho cùng một đơn. Chặn ở tầng code:      */
/* mỗi (khách + ngày bay + điểm bay) chỉ được ghi MỘT lần. Unique      */
/* index của MongoDB là trọng tài — hai request chạy song song cũng    */
/* chỉ một bên thắng.                                                  */
/* ------------------------------------------------------------------ */

type BookingSentDoc = { key: string; createdAt: Date };

const BookingSentSchema = new Schema<BookingSentDoc>({
  key: { type: String, required: true, unique: true, index: true },
  // Hiệu lực 2 GIỜ: một cuộc trò chuyện = một đơn. Khách quay lại đặt
  // chuyến khác (kể cả cùng psid Messenger) sau đó thì khoá đã hết hạn.
  createdAt: { type: Date, default: Date.now, expires: 2 * 60 * 60 },
});

// Tên collection mới (v2): đổi TTL trên collection cũ sẽ đụng index đã
// tạo với thời hạn cũ — tạo collection sạch đỡ rắc rối hơn sửa index.
const BookingSent: Model<BookingSentDoc> =
  (mongoose.models.BotBookingSent2 as Model<BookingSentDoc>) ||
  mongoose.model<BookingSentDoc>("BotBookingSent2", BookingSentSchema);

/**
 * true  = lần đầu thấy đơn này -> cho ghi sheet + gửi email
 * false = đã ghi trước đó      -> bỏ qua trong im lặng
 *
 * Lỗi kết nối thì trả true: thà lọt một dòng trùng (điều phối viên
 * thấy ngay) còn hơn nuốt mất một đơn thật.
 */
export async function markBookingOnce(parts: {
  psid?: unknown;
  ngay_dat_bay?: unknown;
  dia_diem_dich_vu?: unknown;
}): Promise<boolean> {
  // Khoá CHỈ là psid. Bài học sau ba vòng vá: mọi trường do mô hình tự
  // viết (điểm bay, thậm chí định dạng ngày) đều mỗi lần một kiểu — đưa
  // vào khoá là chống trùng thủng. psid là thứ duy nhất do máy sinh,
  // ổn định tuyệt đối. Phạm vi "một đơn" = một phiên chat trong 2 giờ
  // (TTL ở schema); parts còn lại giữ trong chữ ký để khỏi đổi chỗ gọi.
  void parts.ngay_dat_bay;
  void parts.dia_diem_dich_vu;
  const key = String(parts.psid ?? "").trim().toLowerCase();

  try {
    await connectDB();
    await BookingSent.create({ key });
    return true;
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 11000) return false; // trùng khoá -> đơn đã ghi rồi
    console.error("[booking-dedup] lỗi, cho ghi để không mất đơn:", err);
    return true;
  }
}
