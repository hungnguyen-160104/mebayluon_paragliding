"use client";

import Image from "next/image";

type Props = {
  onClick?: () => void;
  className?: string;
  title?: string;
};

export default function ChatbotButton({
  onClick,
  className,
  title = "Mở chatbot",
}: Props) {
  return (
    <button
      aria-label="Mở chatbot"
      title={title}
      onClick={onClick}
      className={`relative flex h-12 w-12 items-center justify-center rounded-full
                  border border-white/60 bg-white shadow-lg hover:scale-105
                  transition focus:outline-none focus:ring-2 focus:ring-sky-500 ${className ?? ""}`}
    >
      <Image
        src="/chatbot/launcher.jpg"
        alt="Chatbot"
        fill
        sizes="48px"
        className="object-contain p-1.5"
        priority
      />
    </button>
  );
}
