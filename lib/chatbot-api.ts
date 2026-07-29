// mbl-paragliding/lib/chatbot-api.ts
import api from "@/lib/api";
import type { ChatHistoryPayload, ChatbotReply } from "@/types/frontend/chatbot";

export type AskChatbotParams = {
  question: string;
  sessionId: string;
  history?: ChatHistoryPayload;
  locale?: string;
};

/** Gửi câu hỏi tới bot (n8n) qua proxy nội bộ /api/chatbot. */
export async function askChatbot(params: AskChatbotParams) {
  return api<ChatbotReply>("/api/chatbot", {
    method: "POST",
    body: JSON.stringify(params),
  });
}
