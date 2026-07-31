"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "../../../types/frontend/chatbot";
import { useLanguage } from "@/contexts/language-context";
import { getChatbotTexts } from "@/lib/i18n/chatbot";

type Props = {
  open: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSend: (text: string) => Promise<void> | void;
  onReset?: () => void;
  loading?: boolean;
};

// Tách URL / email / số điện thoại ra khỏi phần chữ để render thành link.
const LINK_PATTERN =
  /(https?:\/\/[^\s<]+|www\.[^\s<]+|[\w.+-]+@[\w-]+\.[\w.-]+|(?:0|\+84)[\d.\s]{8,13}\d)/gi;

function toHref(token: string): string {
  if (/^https?:\/\//i.test(token)) return token;
  if (/^www\./i.test(token)) return `https://${token}`;
  if (token.includes("@")) return `mailto:${token}`;
  return `tel:${token.replace(/[^\d+]/g, "")}`;
}

/**
 * Câu trả lời của bot n8n thường có xuống dòng, link đặt bay và số hotline.
 * Render giữ nguyên xuống dòng và bấm được vào link.
 */
function renderText(text: string) {
  const parts = text.split(LINK_PATTERN);

  return parts.map((part, index) => {
    if (!part) return null;

    // Các phần tử ở vị trí lẻ là nhóm bắt được của regex.
    if (index % 2 === 1) {
      return (
        <a
          key={index}
          href={toHref(part)}
          target={part.includes("@") || /^(?:0|\+84)/.test(part) ? undefined : "_blank"}
          rel="noopener noreferrer"
          className="text-[#0194F3] underline underline-offset-2 break-words"
        >
          {part}
        </a>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

export default function ChatbotWidget({
  open,
  onClose,
  messages,
  onSend,
  onReset,
  loading,
}: Props) {
  const { language } = useLanguage();
  const t = getChatbotTexts(language);

  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, loading]);

  // Trả con trỏ về ô nhập sau khi bot trả lời xong.
  useEffect(() => {
    if (open && !loading) inputRef.current?.focus();
  }, [open, loading]);

  if (!open) return null;

  return (
    <div
      className="fixed bottom-24 right-4 z-[60] w-[320px] max-w-[85vw]
                 rounded-2xl border border-[#DCE7F3] bg-white shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 rounded-t-2xl bg-gradient-to-r from-[#0194F3] to-[#0B83D9] text-white">
        <div className="text-sm font-semibold">{t.title}</div>

        <div className="flex items-center gap-1">
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              aria-label={t.newChat}
              title={t.newChat}
              className="rounded-md px-2 py-1 text-white/90 hover:text-white hover:bg-white/20"
            >
              ↻
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            title={t.close}
            className="rounded-md px-2 py-1 text-white/90 hover:text-white hover:bg-white/20"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        aria-live="polite"
        className="h-72 overflow-y-auto px-3 py-2 space-y-2"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.side === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm leading-relaxed
                ${m.side === "user" ? "bg-[#EAF4FE] text-[#1C2930]" : "bg-[#F5F7FA] text-[#1C2930]"}`}
            >
              {renderText(m.text)}
            </div>
          </div>
        ))}

        {loading && (
          <div className="text-xs text-[#5B6B7A] animate-pulse">Đang soạn trả lời…</div>
        )}
      </div>

      {/* Input */}
      <form
        className="flex items-center gap-2 px-3 py-2 border-t border-[#DCE7F3]"
        onSubmit={(e) => {
          e.preventDefault();
          const text = input.trim();
          if (!text || loading) return;
          onSend(text);
          setInput("");
        }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          maxLength={1000}
          placeholder={loading ? t.botTyping : t.inputPlaceholder}
          aria-label={t.inputPlaceholder}
          className="flex-1 rounded-lg border border-[#DCE7F3] px-3 py-2 text-sm
                     outline-none focus:ring-2 focus:ring-[#0194F3] focus:border-[#0194F3]
                     disabled:bg-[#F5F7FA]"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-lg bg-[#0194F3] px-3 py-2 text-sm font-medium text-white hover:bg-[#0B83D9] disabled:opacity-60"
        >
          {t.send}
        </button>
      </form>
    </div>
  );
}
