"use client";

import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Award, Heart, Target } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { motion } from "framer-motion";
import Image from "next/image"; // <--- IMPORT THÊM IMAGE

export default function AboutPage() {
  const { t, language } = useLanguage();

  // ===== Fallback text =====
  const vi = {
    heroTitle: "Về Mebayluon Paragliding",
    heroSubtitle: "Đội ngũ chuyên nghiệp mang đến cho bạn trải nghiệm bay mạo hiểm và đáng nhớ nhất",
    storyTitle: "Câu chuyện của chúng tôi",
    storyParagraphs: [
      "Mebayluon Paragliding được thành lập từ niềm đam mê bay lượn và mong muốn chia sẻ vẻ đẹp của Việt Nam từ trên cao. Chúng tôi tin rằng mỗi chuyến bay không chỉ là một cuộc phiêu lưu, mà còn là cơ hội để kết nối với thiên nhiên và khám phá bản thân.",
      "Với đội ngũ phi công được đào tạo quốc tế, thiết bị hiện đại và quy trình an toàn nghiêm ngặt, chúng tôi cam kết mang đến cho bạn những khoảnh khắc bay an toàn và khó quên.",
      "Sapa với núi non hùng vĩ, thung lũng xanh và điều kiện thời tiết thuận lợi là điểm đến hoàn hảo cho dù lượn. Hãy để chúng tôi đưa bạn bay qua ruộng bậc thang và những bản làng từ một góc nhìn hoàn toàn mới.",
    ],
    valuesTitle: "Giá trị cốt lõi",
    values: [
      { title: "Mạo hiểm", desc: "Thiết bị chuẩn quốc tế, quy trình kiểm tra nghiêm ngặt." },
      { title: "Chuyên nghiệp", desc: "Phi công có chứng chỉ quốc tế, nhiều năm kinh nghiệm." },
      { title: "Tận tâm", desc: "Chú trọng từng chi tiết để mang đến trải nghiệm tốt nhất." },
      { title: "Đam mê", desc: "Niềm đam mê bay và chia sẻ trải nghiệm mỗi ngày." },
    ],
    stats: {
      years: "Năm kinh nghiệm",
      pilots: "Phi công chuyên nghiệp",
      flights: "Chuyến bay thành công",
      satisfaction: "Hài lòng khách hàng",
    },
  };

  const en = {
    heroTitle: "About Mebayluon Paragliding",
    heroSubtitle: "Professional team bringing you the safest and most memorable paragliding experience",
    storyTitle: "Our Story",
    storyParagraphs: [
      "Mebayluon Paragliding was founded with a passion for flying and a desire to share the breathtaking beauty of Vietnam from above. We believe every flight is not just an adventure but a chance to connect with nature and discover yourself.",
      "With internationally trained pilots, modern equipment, and strict safety protocols, we are committed to providing you with the safest and most memorable flying moments.",
      "Sapa, with majestic mountains, lush valleys, and ideal weather, is the perfect location for paragliding. Let us take you soaring above terraced rice fields and villages from a whole new perspective.",
    ],
    valuesTitle: "Our Values",
    values: [
      { title: "Safety", desc: "International-standard gear and rigorous check procedures." },
      { title: "Professional", desc: "Certified pilots with years of experience." },
      { title: "Dedicated", desc: "We care about every detail for the best experience." },
      { title: "Passion", desc: "Passion for flight and sharing memorable moments." },
    ],
    stats: {
      years: "Years Experience",
      pilots: "Professional Pilots",
      flights: "Successful Flights",
      satisfaction: "Customer Satisfaction",
    },
  };

  const fb = language === "vi" ? vi : en;

  const tx = {
    heroTitle: t?.about?.hero?.title ?? fb.heroTitle,
    heroSubtitle: t?.about?.hero?.subtitle ?? fb.heroSubtitle,
    storyTitle: t?.about?.storyTitle ?? fb.storyTitle,
    storyParagraphs: t?.about?.storyParagraphs ?? fb.storyParagraphs,
    valuesTitle: t?.about?.values?.title ?? fb.valuesTitle,
    values: t?.about?.values?.items ?? fb.values,
    stats: {
      years: t?.about?.stats?.years ?? fb.stats.years,
      pilots: t?.about?.stats?.pilots ?? fb.stats.pilots,
      flights: t?.about?.stats?.flights ?? fb.stats.flights,
      satisfaction: t?.about?.stats?.satisfaction ?? fb.stats.satisfaction,
    },
  };

  const images = [
    "/about-us-1.jpg",
    "/about-us-2.jpg",
    "/about-us-3.jpg",
  ];

  return (
    <main
      className="min-h-screen relative bg-cover bg-center bg-fixed text-white"
      style={{ backgroundImage: "url(/about-us.jpg)" }}
    >
      <div className="absolute inset-0 bg-black/20 z-0" />
      <div className="relative z-20">
        <Navigation />
      </div>

      {/* Hero Section */}
      <section className="relative h-[60vh] flex items-center justify-center -mt-16 z-10">
        <div className="container mx-auto px-4 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="text-5xl md:text-6xl font-bold mb-4 font-serif"
          >
            {tx.heroTitle}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl md:text-2xl max-w-3xl mx-auto text-slate-200"
          >
            {tx.heroSubtitle}
          </motion.p>
        </div>
      </section>

      {/* Story Section */}
      <section className="relative z-10 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-4xl font-bold mb-8 text-center font-serif text-white"
            >
              {tx.storyTitle}
            </motion.h2>
            <div className="space-y-6">
              {tx.storyParagraphs.map((p: string, i: number) => (
                <motion.p 
                  key={i}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className="text-lg leading-relaxed text-slate-200"
                >
                  {p}
                </motion.p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* THAY THẾ TOÀN BỘ SECTION NÀY */}
      {/* Image Gallery Section */}
      <section className="relative z-10 py-24">
        {/* Bỏ max-w-screen-xl để ảnh rộng hết cỡ */}
        <div className="container mx-auto px-4"> 
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {images.map((src, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                whileHover={{ y: -8, scale: 1.03 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                viewport={{ once: true }}
                // THAY ĐỔI TỈ LỆ SANG VUÔNG (1:1)
                className="group relative aspect-square w-full rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl border border-white/20"
              >
                <Image
                  src={src}
                  alt={`Mebayluon About Us ${index + 1}`}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* Values Section */}
      <section className="relative z-10 py-20">
        <div className="container mx-auto px-4">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-4xl font-bold mb-12 text-center text-white font-serif"
          >
            {tx.valuesTitle}
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {tx.values.map((v: { title: string; desc: string }, idx: number) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
              >
                <Card className="h-full bg-white/20 backdrop-blur-md border border-white/30 text-white hover:shadow-xl transition-shadow">
                  <CardContent className="pt-8 pb-6 text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/25 text-white">
                      {idx === 0 && <Shield size={32} />}
                      {idx === 1 && <Award size={32} />}
                      {idx === 2 && <Heart size={32} />}
                      {idx === 3 && <Target size={32} />}
                    </div>
                    <h3 className="text-xl font-semibold">{v.title}</h3>
                    <p className="text-slate-200">{v.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "5+", label: tx.stats.years },
              { value: "10+", label: tx.stats.pilots },
              { value: "5000+", label: tx.stats.flights },
              { value: "100%", label: tx.stats.satisfaction },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="text-5xl font-bold mb-2">{stat.value}</div>
                <div className="text-lg text-slate-200">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      <div className="relative z-10">
        <Footer />
      </div>
    </main>
  );
}