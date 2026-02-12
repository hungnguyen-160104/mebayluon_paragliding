"use client"

import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Phone, Mail, MapPin, Clock } from "lucide-react"
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
      url: "https://www.youtube.com/@dangvm",
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
      iconSrc: "/social_icons/zalo.jpg",
      url: "https://zalo.me/0964073555",
      color: "bg-[#0068FF]",
      description: t.contact.social.zalo,
    },
  ]

  return (
    <main
      className="min-h-screen relative bg-cover bg-center bg-fixed text-white"
      style={{ backgroundImage: "url(/contact.jpg)" }}
    >
      <div className="absolute inset-0 bg-black/20 z-0" />

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
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 max-w-7xl mx-auto mb-16">
            {socialLinks.map((social, index) => (
              <motion.div
                key={social.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="h-full bg-white/20 backdrop-blur-md border border-white/30 hover:shadow-2xl transition-all duration-300 text-white">
                  <CardContent className="pt-8 pb-6 text-center space-y-4 flex flex-col items-center">
                    <div
                      className={`relative inline-flex items-center justify-center w-16 h-16 rounded-full ${social.color} mb-2 overflow-hidden`}
                    >
                      <Image
                        src={social.iconSrc}
                        alt={social.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <h3 className="text-xl font-bold">{social.name}</h3>
                    <p className="text-sm text-slate-200 min-h-[60px] flex items-center justify-center px-2">
                      {social.description}
                    </p>
                    <Button
                      className={`w-full mt-auto ${social.color} hover:${social.color}/90 text-white`}
                      onClick={() => window.open(social.url, "_blank")}
                    >
                      {t.contact.contactNow}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Contact Info Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {[
              { icon: Phone, title: t.contact.phone, lines: ["+84 964 073 555", t.contact.support247] },
              { icon: Mail, title: "Email", lines: ["mebayluon@gmail.com"] },
              { icon: MapPin, title: t.contact.address, lines: ["Thị trấn Sapa", "Lào Cai, Việt Nam"] },
              { icon: Clock, title: t.contact.workingHours, lines: ["Thứ 2 - CN", "6:00 - 19:00"] },
            ].map((info, index) => (
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
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white/25 flex items-center justify-center">
                        <info.icon className="text-white" size={24} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-2">{info.title}</h3>
                        {info.lines.map((line, i) => (
                          <p key={i} className="text-slate-200 text-sm">{line}</p>
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
            <h2 className="text-3xl font-bold font-serif">{t.contact.locationTitle}</h2>
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