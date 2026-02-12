"use client";

import { Navigation } from "@/components/navigation";
import  Footer  from "@/components/footer/Footer";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/language-context";
import Link from "next/link";
import { motion } from "framer-motion";

// Dữ liệu 14 phi công - ĐÃ CẬP NHẬT VỚI TRƯỜNG 'role' VÀ ĐẶNG VĂN MỸ LÊN ĐẦU
const pilotsData = [
  {
    name: "ĐẶNG VĂN MỸ",
    role: "Founder, Team Leader, PPG Pilot",
    nickname: "Đội trưởng Mỹ",
    slug: "dang-van-my",
    avatar: "/pilots/dang-van-my/dang-van-my.jpg",
  }, // Đã đưa lên đầu
  {
    name: "ALISH THAPA",
    role: "APPI & SIV Instructor, Acro Pilot, PPG Pilot",
    nickname: "Phantom bầu trời",
    slug: "alish-thapa",
    avatar: "/pilots/alish-thapa/alish-thapa.jpg",
  },
  {
    name: "BISHAL THAPA",
    role: "Team Pilot",
    nickname: "Đặc nhiệm cánh gió",
    slug: "bishal-thapa",
    avatar: "/pilots/bishal-thapa/bishal-thapa.jpg",
  },
  {
    name: "SUBASH THAPA",
    role: "Acro Pilot, SIV Instructor, PPG Pilot",
    nickname: "Kỵ sỹ không trung",
    slug: "subash-thapa",
    avatar: "/pilots/subash-thapa/subash-thapa.jpg",
  },
  {
    name: "TOÀN NGUYÊN",
    role: "Team Pilot",
    nickname: "Rambo",
    slug: "toan-nguyen",
    avatar: "/pilots/toan-nguyen/toan-nguyen.jpg",
  },
  {
    name: "MINH VÕ",
    role: "Team Pilot",
    nickname: "Đại bàng thép",
    slug: "minh-vo",
    avatar: "/pilots/minh-vo/minh-vo.jpg",
  },
  {
    name: "NGÔ ĐỘI",
    role: "Team Pilot",
    nickname: "Chiến binh lượn ách",
    slug: "ngo-doi",
    avatar: "/pilots/ngo-doi/ngo-doi.jpeg",
  },
  {
    name: "MINH TRUNG",
    role: "Team Pilot",
    nickname: "Chiến thần không gian",
    slug: "minh-trung",
    avatar: "/pilots/minh-trung/minh-trung.jpg",
  },
  {
    name: "TUẤN NGUYỄN",
    role: "Team Pilot, PPG Pilot",
    nickname: "Nhị ca",
    slug: "tuan-nguyen",
    avatar: "/pilots/tuan-nguyen/tuan-nguyen.jpg",
  },
  {
    name: "ĐỊNH THẾ ANH",
    role: "Team Pilot",
    nickname: "Thợ săn mây",
    slug: "dinh-the-anh",
    avatar: "/pilots/dinh-the-anh/dinh-the-anh.jpg",
  },
  {
    name: "CHIẾN THẮNG",
    role: "Team Pilot, PPG Pilot",
    nickname: "Thắng thần sét",
    slug: "chien-thang",
    avatar: "/pilots/chien-thang/chien-thang.jpg",
  },
  {
    name: "PHAN HÙNG",
    role: "Team Pilot",
    nickname: "Lãng khách bầu trời",
    slug: "phan-hung",
    avatar: "/pilots/phan-hung/phan-hung.jpg",
  },
  {
    name: "BISHAL SKYBOY",
    role: "Acro Pilot, Competition Pilot",
    nickname: "skyboy",
    slug: "bishal-skyboy",
    avatar: "/pilots/bishal-skyboy/bishal-skyboy.jpg",
  },
  {
    name: "SUMAN THAPA",
    role: "Acro Pilot",
    nickname: "Sky Rider",
    slug: "suman-thapa",
    avatar: "/pilots/suman-thapa/suman-thapa.jpg",
  },
]


type SafetyCopy = { title: string; items: { title: string; desc: string }[] };
// ... (Phần SAFETY_FALLBACK không thay đổi)
const SAFETY_FALLBACK: Record<"vi" | "en" | "fr" | "ru", SafetyCopy> = {
  vi: { title: "Cam kết an toàn", items: [{ title: "Đào tạo chuyên nghiệp", desc: "Tất cả phi công đều có chứng chỉ quốc tế APPI..." }, { title: "Thiết bị chuẩn quốc tế", desc: "Sử dụng dù, đai an toàn và mũ bảo hiểm từ các thương hiệu hàng đầu..." }, { title: "Bảo hiểm toàn diện", desc: "Mỗi chuyến bay đều bao gồm gói bảo hiểm an toàn bay cho hành khách..." }] },
  en: { title: "Safety Commitment", items: [{ title: "Professional training", desc: "All pilots hold international APPI certification..." }, { title: "International-grade gear", desc: "Using gliders, harnesses, and helmets from top brands..." }, { title: "Comprehensive insurance", desc: "Every flight includes a safety insurance package for passengers..." }] },
  fr: { title: "Engagement sécurité", items: [{ title: "Formation professionnelle", desc: "Tous les pilotes détiennent la certification internationale APPI..." }, { title: "Équipement aux normes internationales", desc: "Utilisation de voiles, sellettes et casques de grandes marques..." }, { title: "Assurance complète", desc: "Chaque vol inclut un forfait d'assurance sécurité pour les passagers..." }] },
  ru: { title: "Гарантия безопасности", items: [{ title: "Профессиональная подготовка", desc: "Все пилоты имеют международную сертификацию APPI..." }, { title: "Оборудование международного уровня", desc: "Использование парапланов, подвесок и шлемов от ведущих брендов..." }, { title: "Полное страхование", desc: "Каждый полет включает пакет страхования безопасности для пассажиров..." }] },
};

export default function PilotsPage() {
  const { t, language } = useLanguage();
  const P = t.pilots; // nhóm pilots trong translations.ts

  const safety: SafetyCopy = (P as any)?.safety ?? SAFETY_FALLBACK[language as keyof typeof SAFETY_FALLBACK];
  // Đặt fallback tiếng Việt là "Thông tin"
  const buttonText = P?.viewProfile ?? (language === "vi" ? "Thông tin" : "View Profile");

  return (
    <main
      className="min-h-screen relative bg-cover bg-center bg-fixed text-foreground"
      style={{ backgroundImage: "url(/pilots/hero.jpg)" }}
    >
      <div className="absolute inset-0 bg-black/10 z-0" />
      <div className="relative z-10"> {/* Container cho nội dung */}
        <Navigation />

        

        {/* Intro Section */}
        <section className="py-16 relative z-10 text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <h2 className="text-3xl font-bold font-serif">
                {P?.intro?.title ??
                  (language === "vi"
                    ? "Chuyên nghiệp - An toàn - Tận tâm"
                    : "Professional - Safe - Dedicated")}
              </h2>
              <p className="text-lg text-slate-200 leading-relaxed">
                {P?.intro?.description ??
                  (language === "vi"
                    ? "Tất cả phi công của chúng tôi đều được đào tạo bài bản theo tiêu chuẩn quốc tế, có chứng chỉ IPPI và nhiều năm kinh nghiệm bay."
                    : "All our pilots are trained to international standards, hold IPPI certificates, and have years of experience.")}
              </p>
            </div>
          </div>
        </section>

        {/* ============ PHẦN ĐÃ CHỈNH SỬA THIẾT KẾ THẺ ============ */}
        <section className="py-16 relative z-10">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {pilotsData.map((pilot, index) => (
                <motion.div
                  key={pilot.slug}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                  className="h-full"
                >
                  <Link href={`/pilots/${pilot.slug}`} aria-label={`${buttonText}: ${pilot.name}`} className="h-full">
                    
                    {/* GIỮ NGUYÊN KIỂU GLASSMORHISM */}
                    <div className="group h-full flex flex-col rounded-2xl overflow-hidden bg-white/30 backdrop-blur-md border border-white/40 shadow-lg hover:shadow-2xl transition-all duration-300 text-white">
                      
                      {/* Phần hình ảnh */}
                      <div className="relative h-80 overflow-hidden">
                        <div
                          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                          style={{ backgroundImage: `url(${pilot.avatar})` }}
                        />
                      </div>

                      {/* Khối nội dung với bố cục mới */}
                      <div className="p-6 flex flex-col flex-grow justify-between">
                        
                        {/* Tên và Chức vụ */}
                        <div>
                          <h3 className="text-2xl font-bold font-serif">{pilot.name}</h3>
                          <p className="text-lg text-white/90">{pilot.role}</p> {/* Hiển thị chức vụ */}
                        </div>
                        
                        {/* Biệt danh và nút "Thông tin" trên cùng một dòng */}
                        <div className="mt-4 flex items-center justify-between">
<p className="text-sm text-white/70">
  {t?.pilots?.nickname ?? "Biệt danh"}: {pilot.nickname}
</p>

                          <Button variant="secondary" className="px-4 py-2 text-sm">
                            {buttonText}
                          </Button>
                        </div>
                      </div>

                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
        {/* ============ KẾT THÚC PHẦN CHỈNH SỬA ============ */}


        {/* Safety Section */}
        <section className="py-20 relative z-10 text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center space-y-6">
              <h2 className="text-4xl font-bold mb-8 font-serif">{safety.title}</h2>
              <div className="grid md:grid-cols-3 gap-8 text-left">
                {safety.items.map((s, i) => (
                  <div key={i} className="space-y-3">
                    <h3 className="text-xl font-semibold">{s.title}</h3>
                    <p className="text-slate-200">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="relative z-10">
          <Footer />
        </div>
        
      </div>
    </main>
  );
}