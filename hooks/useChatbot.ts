"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChatHistoryPayload, ChatMessage } from "../types/frontend/chatbot";
import { askChatbot } from "../lib/chatbot-api";

const SESSION_STORAGE_KEY = "mbl_chat_session_id";
const GREETING_ID = "hello";
const MAX_HISTORY = 10;

const GREETING: ChatMessage = {
  id: GREETING_ID,
  side: "bot",
  text: "Xin chào! Mình có thể giúp gì cho bạn? 😊",
};

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
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
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
            text:
              "Xin lỗi, hệ thống đang bận hoặc không phản hồi. Bạn vui lòng thử lại sau, hoặc liên hệ hotline 0964 073 555 để được hỗ trợ ngay.",
            source: "fallback",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading],
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
    setMessages([GREETING]);
  }, []);

  const api = useMemo(
    () => ({
      open,
      setOpen,
      messages,
      setMessages,
      sendMessage,
      resetConversation,
      loading,
      sessionId,
    }),
    [open, messages, sendMessage, resetConversation, loading, sessionId],
  );

  return api;
}
