"use client";

import Image from "next/image";
import { useLanguage } from "@/contexts/language-context";
import { getChatbotTexts } from "@/lib/i18n/chatbot";

type Props = {
  onClick?: () => void;
  className?: string;
  title?: string;
};

export default function ChatbotButton({ onClick, className, title }: Props) {
  const { language } = useLanguage();
  const t = getChatbotTexts(language);
  const label = title ?? t.openChat;

  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`relative flex h-10 w-10 items-center justify-center rounded-full
                  border border-[#DCE7F3] bg-white shadow-lg hover:scale-105
                  transition focus:outline-none focus:ring-2 focus:ring-[#0194F3] ${className ?? ""}`}
    >
      <Image
        src="/chatbot/launcher.jpg"
        alt="Chatbot"
        fill
        sizes="40px"
        className="object-contain p-1.5"
        priority
      />
    </button>
  );
}
