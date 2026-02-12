export interface ChatQA {
  id: string;
  question: string;
  answer: string;
  aliases?: string[]; // 👈 thêm
}


export interface EmbeddingItem {
  id: string;
  question: string;
  vector: number[];
}

export interface EmbeddingsCache {
  model: string;
  updatedAt: string;     // ISO date
  sourceMtimeMs: number; // mtime của file FAQ
  items: EmbeddingItem[];
}

export interface ChatAnswer {
  answer: string;
  matchedQuestion: string | null;
  score: number | null;
}
