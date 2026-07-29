// lib/chatbot/n8n-client.ts
/**
 * Client gọi sang workflow chatbot n8n — cùng con bot đang trả lời Messenger
 * của fanpage. Chỉ chạy phía server để URL/token webhook không lộ ra browser.
 */

import { createLogger } from "@/lib/logger";

const logger = createLogger("n8n-chatbot");

export type ChatRole = "user" | "bot";

export type ChatHistoryItem = {
  role: ChatRole;
  text: string;
};

export type N8nAskInput = {
  question: string;
  sessionId: string;
  history?: ChatHistoryItem[];
  locale?: string;
};

const DEFAULT_TIMEOUT_MS = 25_000;
const MAX_HISTORY = 10;

function getWebhookUrl(): string {
  return (process.env.N8N_CHAT_WEBHOOK_URL ?? "").trim();
}

/** Có cấu hình n8n hay chưa — chưa thì service sẽ tự rơi về FAQ. */
export function isN8nChatConfigured(): boolean {
  return getWebhookUrl().length > 0;
}

function getTimeoutMs(): number {
  const raw = Number(process.env.N8N_CHAT_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS;
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/plain;q=0.9, */*;q=0.8",
  };

  // n8n Webhook node hỗ trợ Header Auth: đặt tên header + token trong env.
  const token = (process.env.N8N_CHAT_AUTH_TOKEN ?? "").trim();
  if (token) {
    const headerName = (process.env.N8N_CHAT_AUTH_HEADER ?? "Authorization").trim();
    headers[headerName] = token;
  }

  return headers;
}

/**
 * n8n trả về rất nhiều dạng tuỳ theo node "Respond to Webhook" được cấu hình
 * thế nào: chuỗi thuần, mảng item, hoặc object lồng nhau. Hàm này dò các key
 * phổ biến để lấy ra câu trả lời.
 */
const ANSWER_KEYS = [
  "output",
  "answer",
  "reply",
  "text",
  "response",
  "message",
  "content",
  "result",
  "data",
  "json",
  "body",
] as const;

function extractAnswer(payload: unknown, depth = 0): string {
  if (depth > 6 || payload == null) return "";

  if (typeof payload === "string") return payload.trim();
  if (typeof payload === "number" || typeof payload === "boolean") {
    return String(payload);
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = extractAnswer(item, depth + 1);
      if (found) return found;
    }
    return "";
  }

  if (typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ANSWER_KEYS) {
      if (key in record) {
        const found = extractAnswer(record[key], depth + 1);
        if (found) return found;
      }
    }
  }

  return "";
}

/**
 * Nhận diện response "vọng lại request" của n8n.
 *
 * Khi node Webhook để Respond = "Immediately" (mặc định) hoặc workflow không
 * có node "Respond to Webhook", n8n trả về chính dữ liệu request:
 *   { headers, params, query, body, webhookUrl, executionMode }
 *
 * Nếu không chặn, extractAnswer() sẽ đào vào body.message và bot nhại lại
 * đúng câu khách vừa hỏi — tệ hơn cả việc không trả lời.
 */
function isEchoedRequest(payload: unknown): boolean {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return false;
  }

  const keys = new Set(Object.keys(payload as Record<string, unknown>));
  const hasWebhookMeta = keys.has("webhookUrl") || keys.has("executionMode");
  const looksLikeRequest = keys.has("headers") && (keys.has("body") || keys.has("query"));

  return hasWebhookMeta || looksLikeRequest;
}

async function readResponse(res: Response): Promise<unknown> {
  const contentType = res.headers.get("content-type") ?? "";
  const raw = await res.text();

  if (!raw.trim()) return null;

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  // n8n có thể trả text/plain hoặc không set content-type — vẫn thử parse JSON.
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/**
 * Gửi câu hỏi sang n8n.
 *
 * Trả về câu trả lời dạng chuỗi, hoặc `null` khi chưa cấu hình / lỗi mạng /
 * timeout / workflow trả rỗng — để tầng trên rơi về FAQ thay vì vỡ giao diện.
 */
export async function askN8n(input: N8nAskInput): Promise<string | null> {
  const url = getWebhookUrl();
  if (!url) return null;

  const history = (input.history ?? []).slice(-MAX_HISTORY);

  // Gửi kèm nhiều tên field để tương thích cả Webhook node lẫn Chat Trigger
  // của n8n mà không phải sửa workflow đang chạy cho Messenger.
  const payload = {
    action: "sendMessage",
    sessionId: input.sessionId,
    chatInput: input.question,
    message: input.question,
    question: input.question,
    locale: input.locale ?? "vi",
    source: "website",
    history: history.map((item) => ({
      role: item.role === "user" ? "user" : "assistant",
      content: item.text,
    })),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getTimeoutMs());

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      logger.error("n8n trả lỗi HTTP", undefined, {
        status: res.status,
        detail,
      });
      return null;
    }

    const data = await readResponse(res);

    if (isEchoedRequest(data)) {
      logger.error(
        "n8n vọng lại request thay vì trả câu trả lời — node Webhook cần đặt " +
          "Respond = 'Using Respond to Webhook Node' và workflow phải có node " +
          "'Respond to Webhook' xuất nội dung của AI",
        undefined,
        { sessionId: input.sessionId },
      );
      return null;
    }

    const answer = extractAnswer(data);

    if (!answer) {
      logger.warn("n8n trả về rỗng — kiểm tra node 'Respond to Webhook'", {
        sessionId: input.sessionId,
      });
      return null;
    }

    return answer;
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "AbortError";
    logger.error(
      isTimeout ? "n8n timeout" : "Không gọi được n8n",
      err instanceof Error ? err : undefined,
      { sessionId: input.sessionId },
    );
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
