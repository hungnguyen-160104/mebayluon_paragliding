// lib/imou/client.ts
/**
 * GỌI IMOU OPEN API (chỉ chạy ở máy chủ).
 *
 * Theo tài liệu thật (open.imoulife.com/book/http/develop.html, đọc 30/09/2026):
 *  - Mọi lệnh là HTTPS POST tới https://openapi-sg.easy4ip.com/openapi/<method>
 *    (tài khoản thuộc trung tâm dữ liệu Đông Á = "sg").
 *  - Thân: { system:{ver:"1.0", appId, sign, time, nonce}, id, params }.
 *  - CHỮ KÝ ĐÃ ĐỔI so với mẫu cũ (md5): nay là
 *      nguồn    = "time:{time},nonce:{nonce},appSecret:{appSecret}"
 *      khoá     = hex thường của SHA-256(appSecret)
 *      sign     = Base64(HMAC-SHA256(nguồn, khoá))
 *    Đã thử đúng bộ số mẫu trong tài liệu (ra "xjhCQBoJ…oxU=").
 *  - nonce không được lặp trong 5 phút (SN1005); time lệch quá 5 phút là SN1002.
 *  - Trả về { result:{ code:"0", msg, data }, id }; code khác "0" là lỗi.
 *
 * accessToken sống 3 ngày: giữ trong biến của tiến trình + một bản trong
 * MongoDB (collection `imou_tokens`) để lambda mới của Vercel khỏi xin lại mỗi
 * phút — tài liệu dặn "đừng gọi thường xuyên". Gặp TK1002/TK1003 thì xin mới.
 *
 * AppSecret CHỈ đọc từ IMOU_APP_SECRET, không bao giờ ghi ra log.
 */
import { createHash, createHmac, randomUUID } from "crypto";

import { connectDB } from "@/lib/mongodb";

export const IMOU_BASE = (process.env.IMOU_API_BASE || "https://openapi-sg.easy4ip.com/openapi").replace(/\/+$/, "");

export class ImouError extends Error {
  code: string;
  constructor(code: string, msg: string) {
    super(`Imou ${code}: ${msg}`);
    this.code = code;
  }
}

function creds() {
  const appId = (process.env.IMOU_APP_ID || "").trim();
  const appSecret = (process.env.IMOU_APP_SECRET || "").trim();
  if (!appId || !appSecret) throw new ImouError("CONFIG", "Chưa khai IMOU_APP_ID / IMOU_APP_SECRET");
  return { appId, appSecret };
}

export function imouConfigured(): boolean {
  return Boolean((process.env.IMOU_APP_ID || "").trim() && (process.env.IMOU_APP_SECRET || "").trim());
}

/** Chữ ký system.sign theo mục 4 của Development Specification. */
export function imouSign(time: number, nonce: string, appSecret: string): string {
  const password = createHash("sha256").update(appSecret, "utf8").digest("hex").toLowerCase();
  return createHmac("sha256", password).update(`time:${time},nonce:${nonce},appSecret:${appSecret}`, "utf8").digest("base64");
}

/** Gọi một method của Imou; trả `result.data`, lỗi thì ném ImouError(code). */
export async function imouCall<T = Record<string, unknown>>(
  method: string,
  params: Record<string, unknown>,
  timeoutMs = 10_000,
): Promise<T> {
  const { appId, appSecret } = creds();
  const time = Math.floor(Date.now() / 1000);
  const nonce = randomUUID();
  const body = {
    system: { ver: "1.0", appId, sign: imouSign(time, nonce, appSecret), time, nonce },
    id: randomUUID(),
    params,
  };
  const res = await fetch(`${IMOU_BASE}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!res.ok) throw new ImouError(`HTTP${res.status}`, `${method} trả HTTP ${res.status}`);
  const json = (await res.json()) as { result?: { code?: string; msg?: string; data?: T } };
  const code = String(json?.result?.code ?? "");
  if (code !== "0") throw new ImouError(code || "UNKNOWN", json?.result?.msg || `${method} lỗi`);
  return (json.result?.data ?? {}) as T;
}

/* ------------------------------------------------------------------ *
 * accessToken — cache hai tầng
 * ------------------------------------------------------------------ */

type TokenDoc = { _id: string; token: string; expiresAt: Date };
const TOKEN_COLL = "imou_tokens";
/** Xin mới khi còn dưới 1 giờ, cho chắc không hết hạn giữa chừng */
const TOKEN_MARGIN_MS = 3600_000;

let memToken: { token: string; expiresAt: number; appId: string } | null = null;

async function tokenColl() {
  await connectDB();
  const mongoose = (await import("mongoose")).default;
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB chưa sẵn sàng");
  return db.collection<TokenDoc>(TOKEN_COLL);
}

/** accessToken quản trị; `force` = bỏ cache, xin mới (sau TK1002/TK1003). */
export async function imouToken(force = false): Promise<string> {
  const { appId } = creds();
  const now = Date.now();
  if (!force && memToken && memToken.appId === appId && memToken.expiresAt - TOKEN_MARGIN_MS > now) return memToken.token;

  // Tầng 2: MongoDB — không có Mongo (chạy thử cục bộ) thì bỏ qua, vẫn chạy
  let coll: Awaited<ReturnType<typeof tokenColl>> | null = null;
  try {
    coll = await tokenColl();
    if (!force) {
      const doc = await coll.findOne({ _id: appId });
      if (doc && doc.expiresAt.getTime() - TOKEN_MARGIN_MS > now) {
        memToken = { token: doc.token, expiresAt: doc.expiresAt.getTime(), appId };
        return doc.token;
      }
    }
  } catch (e) {
    console.warn("[imou] không đọc được token trong MongoDB:", e instanceof Error ? e.message : e);
  }

  const data = await imouCall<{ accessToken: string; expireTime: number }>("accessToken", {});
  const expiresAt = now + Number(data.expireTime || 0) * 1000;
  memToken = { token: data.accessToken, expiresAt, appId };
  if (coll) {
    await coll
      .updateOne({ _id: appId }, { $set: { token: data.accessToken, expiresAt: new Date(expiresAt) } }, { upsert: true })
      .catch((e) => console.warn("[imou] không lưu được token:", e instanceof Error ? e.message : e));
  }
  return data.accessToken;
}

/** Gọi method cần token; token hết hạn/sai (TK1002/TK1003) thì xin mới và thử lại MỘT lần. */
export async function imouCallWithToken<T = Record<string, unknown>>(
  method: string,
  params: Record<string, unknown>,
  timeoutMs?: number,
): Promise<T> {
  const token = await imouToken();
  try {
    return await imouCall<T>(method, { ...params, token }, timeoutMs);
  } catch (e) {
    if (e instanceof ImouError && (e.code === "TK1002" || e.code === "TK1003")) {
      const fresh = await imouToken(true);
      return imouCall<T>(method, { ...params, token: fresh }, timeoutMs);
    }
    throw e;
  }
}

/* ------------------------------------------------------------------ *
 * Thiết bị
 * ------------------------------------------------------------------ */

/** checkDeviceBindOrNot → { isBind, isMine } */
export function checkDeviceBind(deviceId: string) {
  return imouCallWithToken<{ isBind: boolean; isMine: boolean }>("checkDeviceBindOrNot", { deviceId });
}

/**
 * bindDevice(deviceId, code). `code` là mã an toàn 6 số dưới đáy máy (hoặc mật
 * khẩu thiết bị nếu máy có bộ auth). DV1003 = đã gắn vào chính tài khoản này → coi là xong.
 */
export async function bindDevice(deviceId: string, code: string) {
  try {
    await imouCallWithToken("bindDevice", { deviceId, code });
  } catch (e) {
    if (e instanceof ImouError && e.code === "DV1003") return;
    throw e;
  }
}

/** Mã lỗi nghĩa là "thiết bị chưa gắn vào tài khoản dev" — gặp thì thử bindDevice. */
export const NOT_BOUND_CODES = new Set(["DV1011", "OP1009", "OP1015"]);

/** setDeviceSnapEnhanced → URL ảnh (sống 7 ngày, có thể chưa tải được ngay). */
export async function snapDevice(deviceId: string, channelId: string): Promise<string> {
  const data = await imouCallWithToken<{ url: string }>("setDeviceSnapEnhanced", { deviceId, channelId }, 15_000);
  if (!data?.url) throw new ImouError("NOURL", "setDeviceSnapEnhanced không trả url");
  return data.url;
}

/**
 * Chụp; nếu Imou báo thiết bị chưa gắn thì kiểm tra rồi bindDevice MỘT lần và
 * chụp lại. Trả thêm `bound: true` khi vừa gắn.
 */
export async function snapWithAutoBind(deviceId: string, channelId: string, bindCode: string) {
  try {
    return { url: await snapDevice(deviceId, channelId), bound: false };
  } catch (e) {
    if (!(e instanceof ImouError) || !NOT_BOUND_CODES.has(e.code)) throw e;
    const st = await checkDeviceBind(deviceId);
    if (st.isBind && st.isMine) throw e; // đã là của mình — lỗi khác, không gắn lại
    if (st.isBind && !st.isMine) {
      throw new ImouError("DV1001", "Camera đang gắn vào tài khoản Imou KHÁC — gỡ trong app Imou rồi thử lại");
    }
    if (!bindCode) throw new ImouError("NOCODE", "Camera chưa gắn vào tài khoản dev và chưa khai mã an toàn");
    await bindDevice(deviceId, bindCode);
    return { url: await snapDevice(deviceId, channelId), bound: true };
  }
}

/** Tải ảnh chụp: URL có thể 404 vài giây đầu → chờ rồi thử lại. */
export async function downloadSnap(url: string, { tries = 6, waitMs = 2000, timeoutMs = 10_000 } = {}): Promise<Buffer> {
  let last = "";
  for (let i = 0; i < tries; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, waitMs));
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 1000) return buf;
        last = `ảnh rỗng (${buf.length} byte)`;
      } else {
        last = `HTTP ${res.status}`;
      }
    } catch (e) {
      last = e instanceof Error ? e.message : String(e);
    }
  }
  throw new ImouError("DOWNLOAD", `Không tải được ảnh chụp sau ${tries} lần: ${last}`);
}
