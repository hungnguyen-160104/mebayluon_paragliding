"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChatHistoryPayload, ChatMessage } from "../types/frontend/chatbot";
import { askChatbot } from "../lib/chatbot-api";
import { useLanguage } from "@/contexts/language-context";
import { getChatbotTexts } from "@/lib/i18n/chatbot";

const SESSION_STORAGE_KEY = "mbl_chat_session_id";
const GREETING_ID = "hello";
const MAX_HISTORY = 10;

/** Câu chào đổi theo ngôn ngữ khách đang xem. */
function makeGreeting(text: string): ChatMessage {
  return { id: GREETING_ID, side: "bot", text };
}

function createSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback cho trình duyệt cũ / ngữ cảnh không bảo mật.
  return `s-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/**
 * sessionId được giữ trong localStorage để bot n8n nhớ ngữ cảnh cuộc trò
 * chuyện kể cả khi khách chuyển trang hoặc tải lại trang.
 */
function loadSessionId(): string {
  if (typeof window === "undefined") return "";

  try {
    const saved = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) return saved;

    const created = createSessionId();
    window.localStorage.setItem(SESSION_STORAGE_KEY, created);
    return created;
  } catch {
    // localStorage bị chặn (chế độ riêng tư) — vẫn chat được, chỉ là mỗi
    // lần tải trang sẽ là một phiên mới.
    return createSessionId();
  }
}

export function useChatbot() {
  const { language } = useLanguage();
  const t = getChatbotTexts(language);

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    makeGreeting(getChatbotTexts(language).greeting),
  ]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");

  // Chỉ đọc localStorage sau khi mount để tránh lệch hydration.
  useEffect(() => {
    setSessionId(loadSessionId());
  }, []);

  // Giữ bản mới nhất của messages/sessionId cho callback bên dưới.
  const messagesRef = useRef<ChatMessage[]>(messages);
  const sessionIdRef = useRef(sessionId);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const sendMessage = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || loading) return;

      const history: ChatHistoryPayload = messagesRef.current
        .filter((m) => m.id !== GREETING_ID)
        .slice(-MAX_HISTORY)
        .map((m) => ({ role: m.side, text: m.text }));

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        side: "user",
        text: content,
      };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        const currentSessionId = sessionIdRef.current || loadSessionId();
        if (!sessionIdRef.current) {
          sessionIdRef.current = currentSessionId;
          setSessionId(currentSessionId);
        }

        const res = await askChatbot({
          question: content,
          sessionId: currentSessionId,
          history,
          locale: "vi",
        });

        setMessages((prev) => [
          ...prev,
          {
            id: `b-${Date.now()}`,
            side: "bot",
            text: res.answer,
            score: res.score,
            matchedQuestion: res.matchedQuestion,
            source: res.source,
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            side: "bot",
            text: t.error,
            source: "fallback",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, t.error],
  );

  /** Bắt đầu hội thoại mới: xoá khung chat và cấp sessionId mới cho n8n. */
  const resetConversation = useCallback(() => {
    const created = createSessionId();

    try {
      window.localStorage.setItem(SESSION_STORAGE_KEY, created);
    } catch {
      // bỏ qua khi localStorage bị chặn
    }

    sessionIdRef.current = created;
    setSessionId(created);
    setMessages([makeGreeting(t.greeting)]);
  }, [t.greeting]);

  /**
   * Câu chào luôn bám theo ngôn ngữ ĐANG xem. State `messages` được khởi
   * tạo một lần lúc mount — thời điểm đó bộ chọn ngôn ngữ chưa kịp đọc
   * ngôn ngữ thật của khách (mặc định "vi"), nên nếu trả thẳng state thì
   * khách nước ngoài luôn thấy câu chào tiếng Việt. Thay text của riêng
   * tin nhắn chào lúc render để nó tự đổi khi ngôn ngữ đổi.
   */
  const localizedMessages = useMemo(
    () =>
      messages.map((message) =>
        message.id === GREETING_ID ? { ...message, text: t.greeting } : message,
      ),
    [messages, t.greeting],
  );

  const api = useMemo(
    () => ({
      open,
      setOpen,
      messages: localizedMessages,
      setMessages,
      sendMessage,
      resetConversation,
      loading,
      sessionId,
    }),
    [open, localizedMessages, sendMessage, resetConversation, loading, sessionId],
  );

  return api;
}
