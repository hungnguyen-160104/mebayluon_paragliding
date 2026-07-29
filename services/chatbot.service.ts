// services/chatbot.service.ts
// Nguồn trả lời chính: bot n8n (cùng bot đang chạy Messenger fanpage).
// FAQ + fuzzy giữ lại làm phương án dự phòng khi n8n chưa cấu hình hoặc lỗi.

import faqRaw from "@/data/faq.json"; // cần "resolveJsonModule": true trong tsconfig
import { normalizeTextVN } from "@/utils/text";
import { fuzzyRatio } from "@/utils/fuzzy";
import {
  askN8n,
  isN8nChatConfigured,
  type ChatHistoryItem,
} from "@/lib/chatbot/n8n-client";

// Nguồn sinh ra câu trả lời — dùng để debug, không hiển thị cho khách.
export type ChatSource = "n8n" | "faq" | "fallback";

// Kiểu trả lời cho API /chatbot
export type ChatAnswer = {
  answer: string;
  matchedQuestion: string | null;
  score: number | null;
  source?: ChatSource;
};

// Kiểu phần tử trong FAQ
type FaqItem = {
  id?: string | number;
  question: string;
  answer: string;
  aliases?: string[];
};

// Ngưỡng match
const DEFAULT_THRESHOLD = parseFloat(process.env.CHATBOT_MATCH_THRESHOLD ?? "0.45");
const FUZZY_THRESHOLD = 0.5;

function readFaq(): FaqItem[] {
  // Có thể thêm tiền xử lý/caching nếu cần
  return (faqRaw as FaqItem[]) || [];
}

function tokenize(s: string) {
  return normalizeTextVN(s)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(" ")
    .filter(Boolean);
}

function keywordScore(qTokens: string[], candTokens: string[]) {
  const qSet = new Set(qTokens);
  const cSet = new Set(candTokens);
  const inter = [...qSet].filter((w) => cSet.has(w)).length;
  const uni = new Set([...qSet, ...cSet]).size;
  return uni === 0 ? 0 : inter / uni;
}

/** Trả lời từ FAQ bằng 2 tầng: alias/keyword → fuzzy */
export async function answerFromFaq(userQuestion: string): Promise<ChatAnswer> {
  const normalized = normalizeTextVN(userQuestion);
  const tokensQ = tokenize(normalized);
  const faq = readFaq();

  // 1) RULE-BASED: alias + keyword
  let bestAliasIdx = -1;
  let bestAliasScore = -1;

  for (let i = 0; i < faq.length; i++) {
    const qa = faq[i];

    // alias: khớp tuyệt đối/bao hàm
    if (qa.aliases && qa.aliases.length) {
      for (const a of qa.aliases) {
        const an = normalizeTextVN(a);
        if (an === normalized || an.includes(normalized) || normalized.includes(an)) {
          return { answer: qa.answer, matchedQuestion: qa.question, score: 1, source: "faq" };
        }
      }
    }

    // keyword: Jaccard
    const scoreKW = keywordScore(tokensQ, tokenize(qa.question));
    if (scoreKW > bestAliasScore) {
      bestAliasScore = scoreKW;
      bestAliasIdx = i;
    }
  }

  if (bestAliasIdx >= 0 && bestAliasScore >= DEFAULT_THRESHOLD) {
    const qa = faq[bestAliasIdx];
    return {
      answer: qa.answer,
      matchedQuestion: qa.question,
      score: bestAliasScore,
      source: "faq",
    };
  }

  // 2) FUZZY fallback
  let bestF = -1;
  let bestIdx = -1;
  faq.forEach((qa, i) => {
    const r = fuzzyRatio(normalized, qa.question);
    if (r > bestF) {
      bestF = r;
      bestIdx = i;
    }
  });

  if (bestF >= FUZZY_THRESHOLD) {
    const qa = faq[bestIdx];
    return { answer: qa.answer, matchedQuestion: qa.question, score: bestF, source: "faq" };
  }

  // 3) Fallback cuối
  return {
    answer:
      "Xin lỗi, tôi chưa có thông tin cho câu hỏi này. Vui lòng để lại số điện thoại/email, hoặc xem mục Liên hệ/FAQ để được hỗ trợ nhanh.",
    matchedQuestion: null,
    score: null,
    source: "fallback",
  };
}

export type AskChatbotInput = {
  question: string;
  sessionId: string;
  history?: ChatHistoryItem[];
  locale?: string;
};

/**
 * Luồng trả lời chính của widget trên website:
 *
 * 1. Ưu tiên hỏi bot n8n (có ngữ cảnh hội thoại theo sessionId).
 * 2. n8n chưa cấu hình / lỗi / timeout / trả rỗng → rơi về FAQ tĩnh.
 *
 * Nhờ vậy khách luôn nhận được câu trả lời, kể cả khi workflow n8n chết.
 */
export async function askChatbot(input: AskChatbotInput): Promise<ChatAnswer> {
  const question = input.question.trim();

  if (!question) {
    return {
      answer: "Vui lòng nhập câu hỏi.",
      matchedQuestion: null,
      score: null,
      source: "fallback",
    };
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

  return answerFromFaq(question);
}

/** Wrapper cũ dùng trong Express controller: chỉ FAQ, không có ngữ cảnh. */
export async function postAsk(body: any): Promise<ChatAnswer> {
  const question = (body?.question ?? body?.q ?? body?.message ?? "").toString().trim();

  if (!question) {
    return {
      answer: "Vui lòng cung cấp câu hỏi.",
      matchedQuestion: null,
      score: null,
      source: "fallback",
    };
  }

  return answerFromFaq(question);
}
