"use client";

import { useCallback, useMemo, useState } from "react";
import type { ChatMessage } from "../types/frontend/chatbot";
import { askFaq } from "../lib/chatbot-api";

export function useChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "hello",
      side: "bot",
      text: "Xin chào! Mình có thể giúp gì cho bạn? 😊",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      side: "user",
      text: content,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await askFaq(content);
      const botMsg: ChatMessage = {
        id: `b-${Date.now()}`,
        side: "bot",
        text: res.answer,
        score: res.score,
        matchedQuestion: res.matchedQuestion,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          side: "bot",
          text:
            "Xin lỗi, hệ thống đang bận hoặc không phản hồi. Vui lòng thử lại sau.",
        },
      ]);
      // Optionally log: console.error(err);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const api = useMemo(
    () => ({ open, setOpen, messages, setMessages, sendMessage, loading }),
    [open, messages, sendMessage, loading]
  );

  return api;
}
