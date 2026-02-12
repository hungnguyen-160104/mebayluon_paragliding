// mbl-paragliding/lib/chatbot-api.ts
import api from "@/lib/api";

export async function askFaq(question: string) {
  return api("/api/chatbot", {
    method: "POST",
    body: JSON.stringify({ question }),
  }) as Promise<{
    answer: string;
    matchedQuestion: string | null;
    score: number | null;
  }>;
}
