"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Image from "next/image";

// ✅ chatbot import
import { useChatbot } from "@/hooks/useChatbot";
import { ChatbotButton, ChatbotWidget } from "@/components/ui/chatbot";

export function FloatingSocial() {
  // Hook chatbot
  const { open, setOpen, messages, sendMessage, loading } = useChatbot();

  // Các mạng xã hội sẵn có
  const socialLinks = [
    {
      name: "Facebook",
      iconSrc: "/social_icons/facebook.jpg",
      url: "https://www.facebook.com/mebayluon",
      color: "bg-[#1877F2] hover:bg-[#1877F2]/90",
      iconSize: 28,
    },
    {
      name: "YouTube",
      iconSrc: "/social_icons/youtube.png",
      url: "https://www.youtube.com/@dangvm",
      color: "bg-[#FF0000] hover:bg-[#FF0000]/90",
      iconSize: 28,
    },
    {
      name: "Zalo",
      iconSrc: "/social_icons/zalo.jpg",
      url: "https://zalo.me/0964073555",
      color: "bg-[#0068FF] hover:bg-[#0068FF]/90",
      iconSize: 32,
    },
    {
      name: "WhatsApp",
      iconSrc: "/social_icons/whatsapp.jpg",
      url: "https://api.whatsapp.com/send/?phone=840964073555",
      color: "bg-[#25D366] hover:bg-[#25D366]/90",
      iconSize: 28,
    },
    {
      name: "TikTok",
      iconSrc: "/social_icons/tiktok.jpg",
      url: "https://www.tiktok.com/@mebayluon_paragliding",
      color: "bg-black hover:bg-black/90",
      iconSize: 28,
    },
  ];

  return (
    <>
      {/* Cụm nút nổi */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 1 }}
        className="fixed right-6 bottom-6 z-50 flex flex-col gap-3"
      >
        {/* ✅ Nút chatbot (đặt TRÊN CÙNG) */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.8 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <ChatbotButton onClick={() => setOpen(true)} />
        </motion.div>

        {/* Các nút mạng xã hội */}
        {socialLinks.map((social, index) => (
          <motion.div
            key={social.name}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 1 + index * 0.1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              size="icon"
              className={`w-12 h-12 rounded-full shadow-lg ${social.color} flex items-center justify-center`}
              onClick={() => window.open(social.url, "_blank")}
              title={social.name}
            >
              <Image
                src={social.iconSrc}
                alt={social.name}
                width={social.iconSize || 28}
                height={social.iconSize || 28}
                className="object-contain rounded-full"
              />
            </Button>
          </motion.div>
        ))}
      </motion.div>

      {/* ✅ Cửa sổ chat nhỏ */}
      <ChatbotWidget
        open={open}
        onClose={() => setOpen(false)}
        messages={messages}
        onSend={sendMessage}
        loading={loading}
      />
    </>
  );
}
