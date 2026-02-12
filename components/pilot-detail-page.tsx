// components/pilot-detail-page.tsx
"use client"

import { motion } from "framer-motion"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Pilot } from "@/lib/pilots-data"
import { useLanguage } from "@/contexts/language-context"


interface PilotDetailClientPageProps {
  pilotData: Pilot
}

export default function PilotDetailClientPage({ pilotData }: PilotDetailClientPageProps) {
  const { language: lang, setLanguage } = useLanguage() // 🔹 dùng context
  const heroCollage = pilotData.gallery.slice(0, 5)
  const contentImages = pilotData.gallery.slice(5, 8)

  return (
    <div
      className="min-h-screen text-white relative"
      style={{
        backgroundImage: `url(${pilotData.hero})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="absolute inset-0 bg-black/30 z-0" />

      <Navigation />

      {/* 🔹 Nút đổi ngôn ngữ từ context */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={() => setLanguage(lang === "vi" ? "en" : "vi")}
          className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl border border-white/30 text-sm font-semibold"
        >
          {lang === "vi" ? "English" : "Tiếng Việt"}
        </button>
      </div>

      <main className="relative z-10">
        {/* Section 1: Hero */}
        <section className="relative w-full h-screen min-h-[700px] flex items-center pt-16">
          <div className="relative z-10 container mx-auto px-4 h-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full items-center">
              {/* Left */}
              <motion.div
                className="text-white space-y-2"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7 }}
              >
                <h1
                  className="text-5xl md:text-7xl font-bold font-serif"
                  style={{ textShadow: "2px 2px 6px rgba(0,0,0,0.7)" }}
                >
                  {pilotData.name}
                </h1>
                <p
                  className="text-3xl md:text-4xl font-medium"
                  style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.5)" }}
                >
                  {pilotData.role}
                </p>
                <div className="h-4 md:h-8" />
                <h2 className="text-lg md:text-xl font-medium">
                  {pilotData.nickname[lang] &&
                    (lang === "vi"
                      ? `Biệt danh: "${pilotData.nickname[lang]}"`
                      : `Nickname: "${pilotData.nickname[lang]}"`)}
                </h2>
              </motion.div>

              {/* Right collage */}
              <motion.div
                className="relative h-[400px] md:h-[550px] group"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.3 }}
              >
                {heroCollage.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`Collage ${i + 1}`}
                    className={`absolute rounded-lg shadow-2xl border-4 border-white transition-all duration-300 group-hover:rotate-0 group-hover:scale-110 ${
                      i === 0
                        ? "top-[-5%] left-[-8%] w-[40%] -rotate-12 z-10"
                        : i === 1
                        ? "top-[0%] right-[-12%] w-[40%] rotate-6 z-20"
                        : i === 2
                        ? "bottom-[25%] left-[30%] w-[40%] rotate-2 z-30"
                        : i === 3
                        ? "bottom-[-10%] left-[5%] w-[40%] -rotate-6 z-20"
                        : "bottom-[-5%] right-[-2%] w-[40%] rotate-12 z-10"
                    }`}
                  />
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* Section 2: Content */}
        <section className="py-16 lg:py-24 relative z-10">
          <div className="container mx-auto px-4">
            <motion.div
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden p-6 md:p-10 lg:p-12"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
                <div className="lg:col-span-3 space-y-10">
                  <div className="space-y-10">
                    <div>
                      <h2 className="text-lg font-bold text-white/80">
                        {lang === "vi" ? "TÔI LÀ AI" : "WHO I AM"}
                      </h2>
                      <p className="text-2xl font-bold mt-1 text-white">
                        {lang === "vi"
                          ? `BIỆT DANH: "${pilotData.nickname[lang]}"`
                          : `NICKNAME: "${pilotData.nickname[lang]}"`}
                      </p>
                      <p className="mt-4 text-xl text-white/90">
                        {pilotData.bio[lang]}
                      </p>
                    </div>

                    {/* Achievements */}
                    <div>
                      <h3 className="text-2xl md:text-3xl font-bold text-cyan-400 mb-4">
                        {lang === "vi"
                          ? "KINH NGHIỆM & THÀNH TÍCH"
                          : "EXPERIENCE & ACHIEVEMENTS"}
                      </h3>
                      <ul className="list-disc list-outside ml-5 space-y-2 text-lg text-white/90">
                        {pilotData.achievements[lang].map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Fun facts */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <img
                      src={contentImages[1]}
                      alt={`Phi công ${pilotData.name}`}
                      className="w-full rounded-2xl shadow-xl"
                    />
                    <div>
                      <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                        {lang === "vi" ? "CÁ TÍNH" : "PERSONALITY"}
                      </h3>
                      <div className="space-y-3">
                        {pilotData.funFacts[lang].map((fact, idx) => (
                          <p key={idx} className="italic text-lg text-white/90">
                            "{fact}"
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right column images */}
                <div className="lg:col-span-2 space-y-8">
                  <img
                    src={contentImages[0]}
                    alt={`Phi công ${pilotData.name} bay đôi`}
                    className="w-full rounded-2xl shadow-xl border-4 border-purple-400"
                  />
                  <img
                    src={contentImages[2]}
                    alt={`Phi công ${pilotData.name} selfie`}
                    className="w-full rounded-2xl shadow-xl"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer className="relative z-10 bg-white/10 backdrop-blur-xl border-t border-white/20" />
    </div>
  )
}
