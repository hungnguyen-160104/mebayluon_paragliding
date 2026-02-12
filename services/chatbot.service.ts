// services/chatbot.service.ts
// ❌ Không dùng Ollama/embeddings nữa — chỉ dựa trên FAQ + fuzzy

import faqRaw from "@/data/faq.json"; // cần "resolveJsonModule": true trong tsconfig
import { normalizeTextVN } from "@/utils/text";
import { fuzzyRatio } from "@/utils/fuzzy";

// Kiểu trả lời cho API /chatbot
export type ChatAnswer = {
  answer: string;
  matchedQuestion: string | null;
  score: number | null;
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
          return { answer: qa.answer, matchedQuestion: qa.question, score: 1 };
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
    return { answer: qa.answer, matchedQuestion: qa.question, score: bestAliasScore };
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
    return { answer: qa.answer, matchedQuestion: qa.question, score: bestF };
  }

  // 3) Fallback cuối
  return {
    answer:
      "Xin lỗi, tôi chưa có thông tin cho câu hỏi này. Vui lòng để lại số điện thoại/email, hoặc xem mục Liên hệ/FAQ để được hỗ trợ nhanh.",
    matchedQuestion: null,
    score: null,
  };
}

/** Wrapper dùng trong API route: nhận body và trả ChatAnswer */
export async function postAsk(body: any): Promise<ChatAnswer> {
  const question = (body?.question ?? body?.q ?? body?.message ?? "").toString().trim();

  if (!question) {
    return {
      answer: "Vui lòng cung cấp câu hỏi.",
      matchedQuestion: null,
      score: null,
    };
  }

  return answerFromFaq(question);
}
