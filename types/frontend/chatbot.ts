export type ChatSide = "user" | "bot";

/**
 * Nguồn sinh câu trả lời — chỉ dùng để debug, không hiển thị cho khách.
 * "faq" đã bỏ cùng lúc với tầng FAQ tĩnh (data/faq.json).
 */
export type ChatAnswerSource = "n8n" | "fallback";

export interface ChatMessage {
  id: string;
  side: ChatSide;
  text: string;
  score?: number | null;
  matchedQuestion?: string | null;
  source?: ChatAnswerSource;
}

/** Lịch sử hội thoại gửi kèm để bot n8n giữ ngữ cảnh. */
export type ChatHistoryPayload = Array<{
  role: ChatSide;
  text: string;
}>;

export interface ChatbotReply {
  answer: string;
  matchedQuestion: string | null;
  score: number | null;
  source?: ChatAnswerSource;
  sessionId?: string;
}
