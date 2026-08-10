"use client"
import { PageBackground } from "@/components/page-background";

import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Phone, Mail, MapPin, Clock, Instagram } from "lucide-react"
import { motion } from "framer-motion"
import { useLanguage } from "@/contexts/language-context"
import Image from "next/image"

export default function ContactPage() {
  const { t } = useLanguage()

  const socialLinks = [
    {
      name: "Facebook",
      iconSrc: "/social_icons/facebook.jpg",
      url: "https://www.facebook.com/mebayluon",
      color: "bg-[#1877F2]",
      description: t.contact.social.facebook,
    },
    {
      name: "TikTok",
      iconSrc: "/social_icons/tiktok.jpg",
      url: "https://www.tiktok.com/@mebayluon_paragliding",
      color: "bg-black",
      description: t.contact.social.tiktokDescription,
    },
    {
      name: "YouTube",
      iconSrc: "/social_icons/youtube.png",
      url: "https://www.youtube.com/@mebayluon",
      color: "bg-[#FF0000]",
      description: t.contact.social.youtube,
    },
    {
      name: "WhatsApp",
      iconSrc: "/social_icons/whatsapp.jpg",
      url: "https://api.whatsapp.com/send/?phone=84964073555",
      color: "bg-[#25D366]",
      description: t.contact.social.whatsapp,
    },
    {
      name: "Zalo",
      iconSrc: "/social_icons/zalo.png",
      url: "https://zalo.me/0964073555",
      color: "bg-[#0068FF]",
      description: t.contact.social.zalo,
    },
    {
      // Chưa có tệp biểu tượng Instagram trong public/social_icons như năm
      // kênh kia, mà next/image đang chặn SVG (dangerouslyAllowSVG: false)
      // nên dùng biểu tượng vẽ sẵn của lucide. Giống hệt cách làm ở mục
      // Liên hệ trên trang chủ.
      name: "Instagram",
      iconNode: <Instagram className="h-8 w-8 text-white" strokeWidth={2} />,
      url: "https://www.instagram.com/mebayluon.paragliding/",
      color: "bg-linear-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]",
      description: t.contact.social.instagram,
    },
  ]

  return (
    <main className="min-h-screen relative text-white">
      <PageBackground
        src="/contact.jpg"
        alt="Đội ngũ Mebayluon Paragliding tại điểm bay"
      />
      <div className="fixed inset-0 -z-10 bg-black/20" />

      {/* Hero Section */}
      <section className="relative h-[50vh] flex items-center justify-center z-10">
        <motion.div
          className="container mx-auto px-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-4 font-serif">{t.contact.title}</h1>
          <p className="text-xl md:text-2xl max-w-3xl mx-auto">{t.contact.subtitle}</p>
        </motion.div>
      </section>

      {/* Contact Methods Section */}
      <section className="relative z-10 py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold mb-4 font-serif">{t.contact.connectTitle}</h2>
            <p className="text-lg text-slate-200 max-w-2xl mx-auto">{t.contact.connectSubtitle}</p>
          </motion.div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6 lg:gap-4 max-w-7xl mx-auto mb-16">
            {socialLinks.map((social, index) => (
              <motion.div
                key={social.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={index === socialLinks.length - 1 && socialLinks.length % 2 !== 0 ? "col-span-2 md:col-span-1" : ""}
              >
                <Card className="h-full bg-white/20 backdrop-blur-md border border-white/30 hover:shadow-2xl transition-all duration-300 text-white">
                  <CardContent className="pt-8 pb-6 px-4 sm:px-6 text-center space-y-4 flex flex-col items-center">
                    <div
                      className={`relative inline-flex items-center justify-center w-16 h-16 rounded-full ${social.color} mb-2 overflow-hidden`}
                    >
                      {social.iconNode ?? (
                        <Image
                          src={social.iconSrc as string}
                          alt={social.name}
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold">{social.name}</h3>
                    <p className="text-xs sm:text-sm text-slate-200 min-h-12 sm:min-h-15 flex items-center justify-center px-1 sm:px-2">
                      {social.description}
                    </p>
                    {/* Dùng <a> thay cho <button onClick=window.open>: máy
                        tìm kiếm mới thấy đây là liên kết, và khách bấm giữa
                        chuột mở tab mới được. Nhãn ẩn nêu rõ nền tảng để năm
                        nút không còn trùng chữ "Liên hệ ngay". */}
                    <a
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`mt-auto inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 ${social.color}`}
                    >
                      {t.contact.contactNow}
                      <span className="sr-only"> — {social.name}</span>
                    </a>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Contact Info Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {([
              {
                icon: Phone,
                title: t.contact.phone,
                lines: [
                  { text: "+84 964 073 555 (Mr. My)", href: "tel:+84964073555" },
                  { text: "+84 385 907 789 (Ms Ngọc)", href: "tel:+84385907789" },
                  t.contact.support247,
                ],
              },
              {
                icon: Mail,
                title: "Email",
                lines: [{ text: "mebayluon@gmail.com", href: "mailto:mebayluon@gmail.com" }],
              },
              {
                icon: MapPin,
                title: t.contact.address,
                lines: [
                  t.contact.officeCity ?? "Thị trấn Sapa",
                  t.contact.officeProvince ?? "Lào Cai, Việt Nam",
                ],
              },
              {
                icon: Clock,
                title: t.contact.workingHours,
                lines: [t.contact.openDays ?? "Thứ 2 - CN", "6:00 - 19:00"],
              },
            ] as Array<{
              icon: React.ElementType;
              title: string;
              lines: Array<string | { text: string; href: string }>;
            }>).map((info, index) => (
              <motion.div
                key={info.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full bg-white/20 backdrop-blur-md border border-white/30 text-white">
                  <CardContent className="pt-8 pb-6">
                    <div className="flex flex-col items-center text-center gap-4">
                      <div className="shrink-0 w-12 h-12 rounded-full bg-white/25 flex items-center justify-center">
                        <info.icon className="text-white" size={24} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-2">{info.title}</h3>
                        {info.lines.map((line, i) => (
                          <p key={i} className="text-slate-200 text-sm">
                            {typeof line === "string" ? (
                              line
                            ) : (
                              <a
                                href={line.href}
                                className="underline-offset-2 transition-colors hover:text-white hover:underline"
                              >
                                {line.text}
                              </a>
                            )}
                          </p>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="relative z-10 py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <h2 className="text-3xl font-bold font-serif">{t.contact.connectTitle}</h2>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="aspect-video w-full rounded-2xl overflow-hidden border-2 border-white/30 shadow-xl"
          >
            {/* === LINK ĐÃ SỬA LẠI === */}
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d29699.47959938831!2d103.82914041083984!3d22.335398200000003!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x36cd410f70b20f01%3A0x2607f2a1a0f576e3!2zU2EgUGEsIExhbyBDYWksIFZpZXRuYW0!5e0!3m2!1sen!2s!4v1668581785955!5m2!1sen!2s"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="MBL Paragliding Location"
            />
          </motion.div>
        </div>
      </section>
      
      <div className="relative z-10">
        <Footer />
      </div>
    </main>
  )
}