// services/chatbot.service.ts
//
// Nguồn trả lời DUY NHẤT: bot AI trên n8n (cùng bot đang trả lời Messenger
// của fanpage). Khi n8n chưa cấu hình / lỗi / timeout / trả rỗng thì chỉ đưa
// lời nhắn ngắn kèm hotline, KHÔNG cố tự trả lời.
//
// Trước đây có thêm một tầng FAQ tĩnh đọc từ data/faq.json (9MB, 5150 mục
// nhưng chỉ 277 câu trả lời khác nhau, và dữ liệu tự xung đột: cùng một alias
// trỏ tới hai câu trả lời khác nhau). Tầng này đã bỏ vì:
//   - Toàn bộ tri thức nghiệp vụ giờ nằm trong workflow n8n.
//   - 9MB JSON bị bundle vào serverless function, phình bundle và chậm cold
//     start, đổi lại những câu trả lời chất lượng thấp.
// Trả lời sai/cũ còn tệ hơn thừa nhận không biết rồi mời khách gọi hotline.

import { askN8n, isN8nChatConfigured, type ChatHistoryItem } from "@/lib/chatbot/n8n-client";

/** Nguồn sinh ra câu trả lời — dùng để debug, không hiển thị cho khách. */
export type ChatSource = "n8n" | "fallback";

/** Kiểu trả lời cho API /chatbot */
export type ChatAnswer = {
  answer: string;
  /** Giữ để tương thích với client cũ — luôn null từ khi bỏ FAQ. */
  matchedQuestion: string | null;
  /** Giữ để tương thích với client cũ — luôn null từ khi bỏ FAQ. */
  score: number | null;
  source?: ChatSource;
};

const HOTLINE = "0964 073 555";

/**
 * Lời nhắn khi không gọi được bot, theo ngôn ngữ khách đang xem.
 * Cố tình ngắn: mục đích duy nhất là đưa khách sang kênh có người thật.
 */
const UNAVAILABLE_MESSAGE: Record<string, string> = {
  vi: `Xin lỗi, trợ lý đang tạm thời không phản hồi. Bạn vui lòng liên hệ hotline/Zalo/WhatsApp ${HOTLINE} để được hỗ trợ ngay nhé.`,
  en: `Sorry, our assistant is temporarily unavailable. Please contact our hotline/Zalo/WhatsApp ${HOTLINE} for immediate help.`,
  fr: `Désolé, notre assistant est momentanément indisponible. Merci de nous contacter par hotline/Zalo/WhatsApp ${HOTLINE} pour une aide immédiate.`,
  ru: `Извините, наш ассистент временно недоступен. Пожалуйста, свяжитесь с нами по hotline/Zalo/WhatsApp ${HOTLINE}.`,
  zh: `抱歉，智能助手暂时无法回复。请通过热线/Zalo/WhatsApp ${HOTLINE} 联系我们，我们会立即为您服务。`,
  hi: `क्षमा करें, हमारा सहायक अस्थायी रूप से उपलब्ध नहीं है। तुरंत सहायता के लिए कृपया hotline/Zalo/WhatsApp ${HOTLINE} पर संपर्क करें।`,
};

const EMPTY_QUESTION_MESSAGE: Record<string, string> = {
  vi: "Vui lòng nhập câu hỏi.",
  en: "Please enter your question.",
  fr: "Veuillez saisir votre question.",
  ru: "Пожалуйста, введите ваш вопрос.",
  zh: "请输入您的问题。",
  hi: "कृपया अपना प्रश्न लिखें।",
};

function pick(dict: Record<string, string>, locale?: string): string {
  const code = (locale ?? "vi").slice(0, 2).toLowerCase();
  return dict[code] ?? dict.vi;
}

function fallbackAnswer(message: string): ChatAnswer {
  return { answer: message, matchedQuestion: null, score: null, source: "fallback" };
}

export type AskChatbotInput = {
  question: string;
  sessionId: string;
  history?: ChatHistoryItem[];
  locale?: string;
};

/**
 * Luồng trả lời của widget chat trên website.
 *
 * Ngữ cảnh hội thoại do n8n tự giữ theo sessionId (được gửi sang dưới dạng
 * sender.id), nên phía này không cần lưu gì.
 */
export async function askChatbot(input: AskChatbotInput): Promise<ChatAnswer> {
  const question = input.question.trim();

  if (!question) {
    return fallbackAnswer(pick(EMPTY_QUESTION_MESSAGE, input.locale));
  }

  if (isN8nChatConfigured()) {
    const answer = await askN8n({
      question,
      sessionId: input.sessionId,
      history: input.history,
      locale: input.locale,
    });

    if (answer) {
      return { answer, matchedQuestion: null, score: null, source: "n8n" };
    }
  }

  return fallbackAnswer(pick(UNAVAILABLE_MESSAGE, input.locale));
}
