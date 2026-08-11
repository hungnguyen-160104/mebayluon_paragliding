/**
 * Bộ nhớ hội thoại — bản MongoDB.
 *
 * n8n cũ dùng $getWorkflowStaticData('global') — một biến nằm trong tiến
 * trình n8n. Trên Vercel mỗi request có thể chạy ở tiến trình khác, biến đó
 * KHÔNG tồn tại. Chép nguyên sang là bot quên sạch sau mỗi câu.
 *
 * Hai kênh dùng hai nguồn khác nhau, đúng yêu cầu cũ:
 *
 *  - MESSENGER: lấy thẳng lịch sử từ Graph API. Facebook đã lưu sẵn toàn bộ
 *    đoạn chat, vĩnh viễn, miễn phí — không cần collection nào.
 *
 *  - WEB: khách không có tài khoản, Facebook không giữ hộ, nên tự lưu vào
 *    MongoDB. Hết hạn sau 7 ngày, do TTL index tự dọn — không cần cron.
 *
 * Dùng lại đúng MONGODB_URI đang chạy cho trang đăng ký phi công.
 */

import { MongoClient, type Db } from 'mongodb';

export type Turn = { u: string; a: string; ts: number };

const WEB_MAX_TURNS = 12;
const WEB_TTL_SECONDS = 7 * 24 * 60 * 60;
const COLLECTION = 'bot_web_memory';
const GRAPH = 'https://graph.facebook.com/v25.0';

/* ---------------------------------------------------------------------
 * Kết nối dùng lại giữa các lần gọi.
 *
 * Serverless gọi hàm rất nhiều lần trên cùng một tiến trình ấm. Mở
 * MongoClient mới mỗi request sẽ đốt hết connection pool của cluster và
 * Atlas sẽ bắt đầu từ chối kết nối. Giữ promise ở scope module là cách
 * chuẩn để tái dùng.
 * ------------------------------------------------------------------ */
let clientPromise: Promise<MongoClient> | null = null;
let indexReady = false;

async function db(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('chưa khai MONGODB_URI');

  if (!clientPromise) {
    clientPromise = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    }).connect();
  }

  const client = await clientPromise;
  const database = client.db();

  // TTL index: MongoDB tự xoá document quá 7 ngày. Tạo một lần cho mỗi
  // tiến trình; createIndex là idempotent nên gọi lại vô hại.
  if (!indexReady) {
    try {
      await database
        .collection(COLLECTION)
        .createIndex({ updatedAt: 1 }, { expireAfterSeconds: WEB_TTL_SECONDS });
      indexReady = true;
    } catch (err) {
      console.error('[memory] tạo TTL index lỗi:', err);
    }
  }

  return database;
}

/* ---------------------------------------------------------------------
 * WEB
 * ------------------------------------------------------------------ */
export async function getWebHistory(sessionId: string): Promise<Turn[]> {
  try {
    const doc = await (await db())
      .collection<{ sessionId: string; turns: Turn[] }>(COLLECTION)
      .findOne({ sessionId });
    return doc?.turns || [];
  } catch (err) {
    // Mất trí nhớ vẫn hơn là sập cả câu trả lời.
    console.error('[memory] đọc lỗi:', err);
    return [];
  }
}

export async function saveWebTurn(sessionId: string, user: string, reply: string) {
  const turn: Turn = { u: user, a: String(reply).slice(0, 900), ts: Date.now() };

  try {
    // $push kèm $slice: MongoDB tự cắt còn 12 lượt gần nhất ngay trong
    // một lệnh ghi. Không phải đọc lên, nối, rồi ghi đè — cách đó sẽ mất
    // dữ liệu khi khách gõ hai tin sát nhau.
    await (await db()).collection(COLLECTION).updateOne(
      { sessionId },
      {
        $push: { turns: { $each: [turn], $slice: -WEB_MAX_TURNS } },
        $set: { updatedAt: new Date() },
      },
      { upsert: true },
    );
  } catch (err) {
    console.error('[memory] ghi lỗi:', err);
  }
}

/* ---------------------------------------------------------------------
 * MESSENGER — lịch sử lấy từ Facebook
 * ------------------------------------------------------------------ */
export async function getMessengerHistory(
  pageId: string,
  psid: string,
  pageToken: string,
): Promise<string> {
  const url =
    `${GRAPH}/${pageId}/conversations` +
    `?platform=messenger&user_id=${encodeURIComponent(psid)}` +
    `&fields=${encodeURIComponent('messages.limit(40){message,from}')}` +
    `&access_token=${encodeURIComponent(pageToken)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error('[memory] Graph history lỗi', res.status, await res.text());
      return '';
    }
    const json = await res.json();
    const arr = json?.data?.[0]?.messages?.data;
    if (!Array.isArray(arr)) return '';

    // Graph trả mới nhất trước — đảo lại cho đúng thứ tự đọc.
    return arr
      .slice()
      .reverse()
      .filter((m: any) => m?.message)
      .map((m: any) =>
        (String(m.from?.id) === String(pageId) ? 'Nhân viên: ' : 'Khách: ') + m.message,
      )
      .join('\n');
  } catch (err) {
    console.error('[memory] Graph history ném lỗi:', err);
    return '';
  }
}

/** Định dạng lịch sử web thành khối văn bản giống hệt bản n8n cũ. */
export function formatWebHistory(turns: Turn[]): string {
  if (!turns.length) return '';
  const body = turns
    .slice(-10)
    .map((t) => 'Khách: ' + t.u + '\nMebayluon: ' + t.a)
    .join('\n');
  return (
    '=== LICH SU HOI THOAI VOI CHINH KHACH NAY ' +
    '(doc ky, KHONG hoi lai thong tin khach da noi) ===\n' +
    body +
    '\n=== HET LICH SU. Tin nhan moi cua khach: ===\n'
  );
}
