// lib/chatbot/bot-client.ts
/**
 * Thay thế cho lib/chatbot/n8n-client.ts.
 *
 * Giữ NGUYÊN chữ ký hàm của bản n8n để phía trên không phải sửa gì nhiều:
 * chỉ services/chatbot.service.ts đổi dòng import. Route /api/chatbot,
 * rate limit, validate, session, câu fallback 6 thứ tiếng — không đụng tới.
 *
 * File n8n-client.ts cũ cứ để nguyên trong repo, không xoá: route đang
 * import kiểu ChatHistoryItem từ đó, và giữ lại thì còn đường lùi.
 */

import { createLogger } from "@/lib/logger";
import { buildSystem, askClaude, cleanReply, extractBooking, bookingEmailHtml } from "@/lib/bot/core";
import { getWebHistory, saveWebTurn, formatWebHistory } from "@/lib/bot/memory";
import { saveBooking } from "@/lib/bot/google-bridge";

const logger = createLogger("claude-chatbot");

export type ChatRole = "user" | "bot";

export type ChatHistoryItem = {
  role: ChatRole;
  text: string;
};

export type AskInput = {
  question: string;
  /**
   * Định danh hội thoại. Bản n8n gửi sang dưới dạng sender.id =
   * "web-<sessionId>"; giữ đúng tiền tố đó làm khoá bộ nhớ để lịch sử
   * khách web không lẫn với PSID Messenger thật.
   */
  sessionId: string;
  /** Giữ cho tương thích — lịch sử lấy từ database phía server, không tin client. */
  history?: ChatHistoryItem[];
  locale?: string;
};

/** Có cấu hình chưa — thiếu thì service tự rơi về câu fallback kèm hotline. */
export function isBotConfigured(): boolean {
  return (
    (process.env.ANTHROPIC_API_KEY ?? "").trim().length > 0 &&
    (process.env.BOT_BRIDGE_URL ?? "").trim().length > 0
  );
}

/**
 * Trả về câu trả lời, hoặc null để service dùng câu fallback.
 *
 * Không ném lỗi ra ngoài: khách gặp sự cố kỹ thuật thì thấy câu mời gọi
 * hotline, tốt hơn nhiều so với màn hình lỗi.
 */
export async function askBot(input: AskInput): Promise<string | null> {
  const key = `web-${input.sessionId}`;

  try {
    // Lịch sử lấy từ MongoDB chứ không dùng input.history do client gửi lên.
    // Client sửa được payload, mà lịch sử đi thẳng vào prompt — tin nó là
    // mở cửa cho người ngoài nhét chữ vào đầu con bot.
    const turns = await getWebHistory(key);
    const historyText = formatWebHistory(turns);

    const { staticPart, dynamicPart } = await buildSystem({
      psid: key,
      historyText: "",
    });

    const rawReply = await askClaude(staticPart, dynamicPart, historyText + input.question);
    const reply = cleanReply(rawReply);

    if (!reply) {
      logger.warn("Claude trả về rỗng sau khi làm sạch", { sessionId: input.sessionId });
      return null;
    }

    await saveWebTurn(key, input.question, reply);

    // Khách chốt lịch ngay trên web: ghi sheet + báo email, y như Messenger.
    const booking = extractBooking(rawReply);
    if (booking) {
      booking.psid = key;
      booking.ten_facebook = "(khách web)";
      booking.thoi_gian_chot = new Date().toISOString();
      booking.trang_thai_booking = "moi";

      // Ghi booking hỏng thì KHÔNG được nuốt mất câu trả lời của khách.
      await saveBooking(booking, bookingEmailHtml(booking, rawReply)).catch((err) => {
        logger.error("Ghi booking từ web thất bại", err instanceof Error ? err : undefined, {
          sessionId: input.sessionId,
        });
      });
    }

    return reply;
  } catch (err) {
    logger.error(
      "Không gọi được bot Claude",
      err instanceof Error ? err : undefined,
      { sessionId: input.sessionId },
    );
    return null;
  }
}
