"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "../../../types/frontend/chatbot";

type Props = {
  open: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSend: (text: string) => Promise<void> | void;
  loading?: boolean;
};

export default function ChatbotWidget({
  open,
  onClose,
  messages,
  onSend,
  loading,
}: Props) {
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  if (!open) return null;

  return (
    <div
      className="fixed bottom-24 right-4 z-[60] w-[320px] max-w-[85vw]
                 rounded-2xl border border-neutral-200 bg-white shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 rounded-t-2xl bg-gradient-to-r from-sky-500 to-blue-600 text-white">
        <div className="text-sm font-semibold">Hỗ trợ Mebayluon</div>
        <button
          onClick={onClose}
          className="rounded-md px-2 py-1 text-white/90 hover:text-white hover:bg-white/20"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div ref={listRef} className="h-72 overflow-y-auto px-3 py-2 space-y-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.side === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed
                ${m.side === "user" ? "bg-sky-100 text-sky-900" : "bg-neutral-100 text-neutral-900"}`}
            >
              {m.text}
              {m.matchedQuestion && (
                <div className="mt-1 text-[11px] text-neutral-500">
                  (Khớp: {m.matchedQuestion}{typeof m.score === "number" ? ` • score ${m.score.toFixed(2)}` : ""})
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-xs text-neutral-500 animate-pulse">Đang soạn trả lời…</div>
        )}
      </div>

      {/* Input */}
      <form
        className="flex items-center gap-2 px-3 py-2 border-t border-neutral-200"
        onSubmit={(e) => {
          e.preventDefault();
          const text = input.trim();
          if (!text) return;
          onSend(text);
          setInput("");
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhập câu hỏi…"
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm
                     outline-none focus:ring-2 focus:ring-sky-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          Gửi
        </button>
      </form>
    </div>
  );
}
