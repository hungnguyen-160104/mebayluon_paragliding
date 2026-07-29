// app/api/chatbot/route.ts
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { askChatbot } from "@/services/chatbot.service";
import type { ChatHistoryItem } from "@/lib/chatbot/n8n-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_QUESTION_LENGTH = 1000;
const MAX_HISTORY = 10;
const MAX_HISTORY_TEXT = 2000;
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{6,64}$/;

// Chặn spam: bot n8n gọi LLM nên mỗi request đều tốn tiền.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 15;
const hits = new Map<string, { count: number; resetAt: number }>();

function getClientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  const ip =
    forwarded.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown";
  return ip;
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });

    // Dọn các entry đã hết hạn để Map không phình theo thời gian.
    if (hits.size > 500) {
      for (const [k, v] of hits) {
        if (v.resetAt <= now) hits.delete(k);
      }
    }

    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

function normalizeSessionId(value: unknown): string {
  const id = typeof value === "string" ? value.trim() : "";
  return SESSION_ID_PATTERN.test(id) ? id : randomUUID();
}

function normalizeHistory(value: unknown): ChatHistoryItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .slice(-MAX_HISTORY)
    .map((item) => {
      const record = item as Record<string, unknown> | null;
      const text = typeof record?.text === "string" ? record.text.trim() : "";
      const role = record?.role === "user" ? "user" : "bot";
      return { role, text: text.slice(0, MAX_HISTORY_TEXT) } as ChatHistoryItem;
    })
    .filter((item) => item.text.length > 0);
}

export async function POST(req: Request) {
  try {
    if (isRateLimited(getClientKey(req))) {
      return NextResponse.json(
        {
          answer:
            "Bạn đang gửi hơi nhiều tin nhắn. Vui lòng chờ một chút rồi thử lại nhé.",
          matchedQuestion: null,
          score: null,
          source: "fallback",
        },
        { status: 429 },
      );
    }

    const body = await req.json().catch(() => ({}));

    const rawQuestion = body?.question ?? body?.q ?? body?.message ?? "";
    const question = String(rawQuestion).trim().slice(0, MAX_QUESTION_LENGTH);

    if (!question) {
      return NextResponse.json(
        {
          answer: "Vui lòng nhập câu hỏi.",
          matchedQuestion: null,
          score: null,
          source: "fallback",
        },
        { status: 400 },
      );
    }

    const sessionId = normalizeSessionId(body?.sessionId);

    const result = await askChatbot({
      question,
      sessionId,
      history: normalizeHistory(body?.history),
      locale: typeof body?.locale === "string" ? body.locale.slice(0, 5) : "vi",
    });

    return NextResponse.json({ ...result, sessionId });
  } catch (err) {
    console.error("POST /api/chatbot error:", err);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
