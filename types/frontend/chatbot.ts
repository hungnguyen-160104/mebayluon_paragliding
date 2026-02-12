export type ChatSide = "user" | "bot";

export interface ChatMessage {
  id: string;
  side: ChatSide;
  text: string;
  score?: number | null;
  matchedQuestion?: string | null;
}
