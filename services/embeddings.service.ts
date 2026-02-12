import fsp from "fs/promises";
import path from "path";
import { ChatQA, EmbeddingItem, EmbeddingsCache } from "../types/backend/chatbot";
import { normalizeTextVN } from "../utils/text";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL ?? "mxbai-embed-large";
const DATA_PATH = process.env.FAQ_PATH
  ? path.resolve(process.env.FAQ_PATH)
  : path.resolve(process.cwd(), "src", "data", "faq.json");
// Vercel serverless has read-only filesystem except /tmp
const CACHE_DIR = process.env.VERCEL
  ? path.resolve("/tmp", ".cache")
  : path.resolve(process.cwd(), ".cache");
const CACHE_PATH = path.join(CACHE_DIR, "faq_embeddings.json");

async function fileMtimeMs(p: string) { return (await fsp.stat(p)).mtimeMs; }

export async function readFaq(): Promise<ChatQA[]> {
  const raw = await fsp.readFile(DATA_PATH, "utf8");
  const arr = JSON.parse(raw) as Array<{ question: string; answer: string; aliases?: string[] }>;
  return arr.map((x, idx) => ({
    id: String(idx),
    question: x.question.trim(),
    answer: x.answer.trim(),
    aliases: Array.isArray(x.aliases) ? x.aliases : [], // 👈 thêm
  }));
}


export async function getEmbedding(text: string): Promise<number[]> {
  const input = normalizeTextVN(text);
  const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: OLLAMA_EMBED_MODEL, input }),
  });
  if (!res.ok) throw new Error(`Ollama embeddings error ${res.status}: ${await res.text()}`);
  const j = await res.json() as any;
  const embedding = (j.embedding ?? j.data?.[0]?.embedding) as number[] | undefined;
  if (!embedding) throw new Error("No embedding returned from Ollama");
  return embedding;
}

export async function buildEmbeddings(): Promise<EmbeddingsCache> {
  const faq = await readFaq();
  const items: EmbeddingItem[] = [];
  for (const qa of faq) {
    // ⬅️ Embed "question + answer" để giàu ngữ cảnh
    const joined = `${qa.question}\n${qa.answer}`;
    const vector = await getEmbedding(joined);
    items.push({ id: qa.id, question: qa.question, vector });
  }
  const cache: EmbeddingsCache = {
    model: OLLAMA_EMBED_MODEL,
    updatedAt: new Date().toISOString(),
    sourceMtimeMs: await fileMtimeMs(DATA_PATH),
    items,
  };
  await fsp.mkdir(CACHE_DIR, { recursive: true });
  await fsp.writeFile(CACHE_PATH, JSON.stringify(cache), "utf8");
  return cache;
}

export async function loadEmbeddingsFromCache(): Promise<EmbeddingsCache | null> {
  try { return JSON.parse(await fsp.readFile(CACHE_PATH, "utf8")) as EmbeddingsCache; }
  catch { return null; }
}

export async function ensureEmbeddings(): Promise<EmbeddingsCache> {
  const sourceMtime = await fileMtimeMs(DATA_PATH);
  const cache = await loadEmbeddingsFromCache();
  if (!cache || cache.model !== OLLAMA_EMBED_MODEL || cache.sourceMtimeMs !== sourceMtime) {
    console.log("[chatbot] (re)building embeddings…");
    return buildEmbeddings();
  }
  return cache;
}
