"use client";

import { Navigation } from "@/components/navigation";
import Footer from "@/components/footer/Footer";
import { Button } from "@/components/ui/button";
import { useLanguage, type Language } from "@/contexts/language-context";
import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";

type Lang = Language; // "vi" | "en" | "fr" | "ru" | "zh" | "hi" (theo bạn đã thêm)

type PilotCard = {
  name: string;
  slug: string;
  avatar: string; // vẫn giữ file ảnh như bạn đang có
  nickname: Record<Lang, string>;
  role: Record<Lang, string>;
};

// ✅ Dữ liệu 14 phi công (giữ ảnh), thêm role/nickname theo ngôn ngữ
const pilotsData: PilotCard[] = [
  {
    name: "ĐẶNG VĂN MỸ",
    slug: "dang-van-my",
    avatar: "/pilots/dang-van-my/dang-van-my.jpg",
    nickname: {
      vi: "Đội trưởng Mỹ",
      en: "Captain My",
      fr: "Capitaine My",
      ru: "Капитан Мы",
      zh: "美国队长",
      hi: "कैप्टन माई",
    },
    role: {
      vi: "Phi công trưởng, Phi công PG & PPG",
      en: "Chief Pilot, PG & PPG Pilot",
      fr: "Pilote en chef, pilote PG & PPG",
      ru: "Главный пилот, пилот PG и PPG",
      zh: "首席飞行员，PG & PPG 飞行员",
      hi: "मुख्य पायलट, PG & PPG पायलट",
    },
  },
  {
    name: "ALISH THAPA",
    slug: "alish-thapa",
    avatar: "/pilots/alish-thapa/alish-thapa.jpg",
    nickname: {
      vi: "Phantom bầu trời",
      en: "Sky Phantom",
      fr: "Fantôme du Ciel",
      ru: "Небесный Фантом",
      zh: "天空幽灵",
      hi: "आसमान का फैंटम",
    },
    role: {
      vi: "HLV APPI & SIV, Phi công Acro, Phi công PPG",
      en: "APPI & SIV Instructor, Acro Pilot, PPG Pilot",
      fr: "Instructeur APPI & SIV, pilote Acro, pilote PPG",
      ru: "Инструктор APPI и SIV, акро-пилот, пилот PPG",
      zh: "APPI & SIV 教练，特技飞行员，PPG 飞行员",
      hi: "APPI & SIV प्रशिक्षक, एक्रो पायलट, PPG पायलट",
    },
  },
  {
    name: "BISHAL THAPA",
    slug: "bishal-thapa",
    avatar: "/pilots/bishal-thapa/bishal-thapa.jpg",
    nickname: {
      vi: "Đặc nhiệm cánh gió",
      en: "Wind Commando",
      fr: "Commando du Vent",
      ru: "Ветряной Коммандос",
      zh: "风翼特战",
      hi: "हवा कमांडो",
    },
    role: {
      vi: "Phi công đội bay",
      en: "Team Pilot",
      fr: "Pilote d'équipe",
      ru: "Пилот команды",
      zh: "团队飞行员",
      hi: "टीम पायलट",
    },
  },
  {
    name: "SUBASH THAPA",
    slug: "subash-thapa",
    avatar: "/pilots/subash-thapa/subash-thapa.jpg",
    nickname: {
      vi: "Kỵ sỹ không trung",
      en: "Sky Knight",
      fr: "Chevalier du Ciel",
      ru: "Небесный Рыцарь",
      zh: "空中骑士",
      hi: "स्काई नाइट",
    },
    role: {
      vi: "Phi công Acro, HLV SIV, Phi công PPG",
      en: "Acro Pilot, SIV Instructor, PPG Pilot",
      fr: "Pilote Acro, instructeur SIV, pilote PPG",
      ru: "Акро-пилот, инструктор SIV, пилот PPG",
      zh: "特技飞行员，SIV 教练，PPG 飞行员",
      hi: "एक्रो पायलट, SIV प्रशिक्षक, PPG पायलट",
    },
  },
  {
    name: "TOÀN NGUYÊN",
    slug: "toan-nguyen",
    avatar: "/pilots/toan-nguyen/toan-nguyen.jpg",
    nickname: {
      vi: "Rambo",
      en: "Rambo",
      fr: "Rambo",
      ru: "Рэмбо",
      zh: "兰博",
      hi: "रैम्बो",
    },
    role: {
      vi: "Phi công đội bay",
      en: "Team Pilot",
      fr: "Pilote d'équipe",
      ru: "Пилот команды",
      zh: "团队飞行员",
      hi: "टीम पायलट",
    },
  },
  {
    name: "MINH VÕ",
    slug: "minh-vo",
    avatar: "/pilots/minh-vo/minh-vo.jpg",
    nickname: {
      vi: "Đại bàng thép",
      en: "Steel Eagle",
      fr: "Aigle d'Acier",
      ru: "Стальной Орёл",
      zh: "钢铁雄鹰",
      hi: "स्टील ईगल",
    },
    role: {
      vi: "Phi công đội bay",
      en: "Team Pilot",
      fr: "Pilote d'équipe",
      ru: "Пилот команды",
      zh: "团队飞行员",
      hi: "टीम पायलट",
    },
  },
  {
    name: "NGÔ ĐỘI",
    slug: "ngo-doi",
    avatar: "/pilots/ngo-doi/ngo-doi.jpeg",
    nickname: {
      vi: "Chiến binh lượn lách",
      en: "Maneuver Warrior",
      fr: "Guerrier de la Manœuvre",
      ru: "Воин Манёвра",
      zh: "机动战士",
      hi: "मैन्युवर योद्धा",
    },
    role: {
      vi: "Phi công đội bay",
      en: "Team Pilot",
      fr: "Pilote d'équipe",
      ru: "Пилот команды",
      zh: "团队飞行员",
      hi: "टीम पायलट",
    },
  },
  {
    name: "MINH TRUNG",
    slug: "minh-trung",
    avatar: "/pilots/minh-trung/minh-trung.jpg",
    nickname: {
      vi: "Chiến thần không gian",
      en: "Space Warrior",
      fr: "Guerrier de l'Espace",
      ru: "Космический Воин",
      zh: "太空战神",
      hi: "स्पेस वॉरियर",
    },
    role: {
      vi: "Phi công đội bay",
      en: "Team Pilot",
      fr: "Pilote d'équipe",
      ru: "Пилот команды",
      zh: "团队飞行员",
      hi: "टीम पायलट",
    },
  },
  {
    name: "ĐỊNH THẾ ANH",
    slug: "dinh-the-anh",
    avatar: "/pilots/dinh-the-anh/dinh-the-anh.jpg",
    nickname: {
      vi: "Thợ săn mây",
      en: "Cloud Hunter",
      fr: "Chasseur de Nuages",
      ru: "Охотник за облаками",
      zh: "追云者",
      hi: "क्लाउड हंटर",
    },
    role: {
      vi: "Phi công",
      en: "Pilot",
      fr: "Pilote",
      ru: "Пилот",
      zh: "飞行员",
      hi: "पायलट",
    },
  },
  {
    name: "CHIẾN THẮNG",
    slug: "chien-thang",
    avatar: "/pilots/chien-thang/chien-thang.jpg",
    nickname: {
      vi: "Thắng thần sét",
      en: "Lightning Victor",
      fr: "Victor Foudroyant",
      ru: "Победитель-молния",
      zh: "雷霆胜者",
      hi: "लाइटनिंग विक्टर",
    },
    role: {
      vi: "Phi công đội bay, Phi công PPG",
      en: "Team Pilot, PPG Pilot",
      fr: "Pilote d'équipe, pilote PPG",
      ru: "Пилот команды, пилот PPG",
      zh: "团队飞行员，PPG 飞行员",
      hi: "टीम पायलट, PPG पायलट",
    },
  },
  {
    name: "PHAN HÙNG",
    slug: "phan-hung",
    avatar: "/pilots/phan-hung/phan-hung.jpg",
    nickname: {
      vi: "Lãng khách bầu trời",
      en: "Sky Wanderer",
      fr: "Vagabond du Ciel",
      ru: "Небесный странник",
      zh: "天空旅人",
      hi: "स्काई वांडरर",
    },
    role: {
      vi: "Phi công đội bay",
      en: "Team Pilot",
      fr: "Pilote d'équipe",
      ru: "Пилот команды",
      zh: "团队飞行员",
      hi: "टीम पायलट",
    },
  },
  {
    name: "BISHAL SKYBOY",
    slug: "bishal-skyboy",
    avatar: "/pilots/bishal-skyboy/bishal-skyboy.jpg",
    nickname: {
      vi: "Skyboy",
      en: "Skyboy",
      fr: "Skyboy",
      ru: "Скайбой",
      zh: "天空男孩",
      hi: "स्काईबॉय",
    },
    role: {
      vi: "Phi công Acro, Phi công thi đấu",
      en: "Acro Pilot, Competition Pilot",
      fr: "Pilote Acro, pilote de compétition",
      ru: "Акро-пилот, пилот-спортсмен",
      zh: "特技飞行员，竞赛飞行员",
      hi: "एक्रो पायलट, प्रतियोगिता पायलट",
    },
  },
  {
    name: "SUMAN THAPA",
    slug: "suman-thapa",
    avatar: "/pilots/suman-thapa/suman-thapa.jpg",
    nickname: {
      vi: "Sky Rider",
      en: "Sky Rider",
      fr: "Cavalier du Ciel",
      ru: "Небесный всадник",
      zh: "天空骑士",
      hi: "स्काई राइडर",
    },
    role: {
      vi: "Phi công Acro",
      en: "Acro Pilot",
      fr: "Pilote Acro",
      ru: "Акро-пилот",
      zh: "特技飞行员",
      hi: "एक्रो पायलट",
    },
  },
];

type SafetyCopy = { title: string; items: { title: string; desc: string }[] };

const SAFETY_FALLBACK: Record<Lang, SafetyCopy> = {
  vi: {
    title: "Cam kết an toàn",
    items: [
      { title: "Đào tạo chuyên nghiệp", desc: "Tất cả phi công đều có chứng chỉ quốc tế APPI..." },
      { title: "Thiết bị chuẩn quốc tế", desc: "Sử dụng dù, đai an toàn và mũ bảo hiểm từ các thương hiệu hàng đầu..." },
      { title: "Bảo hiểm toàn diện", desc: "Mỗi chuyến bay đều bao gồm gói bảo hiểm an toàn bay cho hành khách..." },
    ],
  },
  en: {
    title: "Safety Commitment",
    items: [
      { title: "Professional training", desc: "All pilots hold international APPI certification..." },
      { title: "International-grade gear", desc: "Using gliders, harnesses, and helmets from top brands..." },
      { title: "Comprehensive insurance", desc: "Every flight includes a safety insurance package for passengers..." },
    ],
  },
  fr: {
    title: "Engagement sécurité",
    items: [
      { title: "Formation professionnelle", desc: "Tous les pilotes détiennent la certification internationale APPI..." },
      { title: "Équipement aux normes internationales", desc: "Utilisation de voiles, sellettes et casques de grandes marques..." },
      { title: "Assurance complète", desc: "Chaque vol inclut un forfait d'assurance sécurité pour les passagers..." },
    ],
  },
  ru: {
    title: "Гарантия безопасности",
    items: [
      { title: "Профессиональная подготовка", desc: "Все пилоты имеют международную сертификацию APPI..." },
      { title: "Оборудование международного уровня", desc: "Использование парапланов, подвесок и шлемов от ведущих брендов..." },
      { title: "Полное страхование", desc: "Каждый полет включает пакет страхования безопасности для пассажиров..." },
    ],
  },
  // ✅ thêm fallback cho zh/hi để khỏi undefined
  zh: {
    title: "安全承诺",
    items: [
      { title: "专业培训", desc: "所有飞行员均持有国际 APPI 认证..." },
      { title: "国际标准装备", desc: "使用顶级品牌的伞翼、座袋和头盔..." },
      { title: "全面保险", desc: "每次飞行均包含乘客安全保险..." },
    ],
  },
  hi: {
    title: "सुरक्षा प्रतिबद्धता",
    items: [
      { title: "प्रोफेशनल ट्रेनिंग", desc: "सभी पायलट अंतरराष्ट्रीय APPI प्रमाणित हैं..." },
      { title: "इंटरनेशनल ग्रेड गियर", desc: "टॉप ब्रांड के ग्लाइडर, हार्नेस और हेलमेट..." },
      { title: "कम्प्रीहेंसिव इंश्योरेंस", desc: "हर उड़ान में यात्रियों के लिए सुरक्षा बीमा शामिल..." },
    ],
  },
};

function getSafeLang(language: unknown): Lang {
  const l = String(language ?? "vi") as Lang;
  return (["vi", "en", "fr", "ru", "zh", "hi"] as const).includes(l) ? l : "vi";
}

function PilotImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative h-80 md:h-88 overflow-hidden bg-white/10">
      {!failed ? (
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover object-top transition-transform duration-500 group-hover:scale-110"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
          onError={() => setFailed(true)}
          priority={false}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white/70">
          <span className="text-sm">Image not found</span>
        </div>
      )}
    </div>
  );
}

export default function PilotsPage() {
  const { t, language } = useLanguage();
  const lang = getSafeLang(language);

  const P = (t as any)?.pilots ?? {};
  const safety: SafetyCopy = (P as any)?.safety ?? SAFETY_FALLBACK[lang];

  const buttonText =
    P?.viewProfile ??
    (lang === "vi" ? "Thông tin" : lang === "zh" ? "查看资料" : lang === "hi" ? "प्रोफ़ाइल" : "View Profile");

  const nicknameLabel =
    P?.nickname ??
    (lang === "vi" ? "Biệt danh" : lang === "fr" ? "Surnom" : lang === "ru" ? "Прозвище" : lang === "zh" ? "昵称" : "Nickname");

  const introTitle =
    P?.intro?.title ??
    (lang === "vi"
      ? "Chuyên nghiệp - An toàn - Tận tâm"
      : lang === "zh"
      ? "专业 - 安全 - 用心"
      : lang === "hi"
      ? "प्रोफेशनल - सुरक्षित - समर्पित"
      : "Professional - Safe - Dedicated");

  const introDesc =
    P?.intro?.description ??
    (lang === "vi"
      ? "Tất cả phi công của chúng tôi đều được đào tạo bài bản theo tiêu chuẩn quốc tế, có chứng chỉ IPPI và nhiều năm kinh nghiệm bay."
      : lang === "zh"
      ? "我们的飞行员均按国际标准培训，持有 IPPI 证书，并拥有多年飞行经验。"
      : lang === "hi"
      ? "हमारे सभी पायलट अंतरराष्ट्रीय मानकों के अनुसार प्रशिक्षित हैं, IPPI प्रमाणपत्र रखते हैं और वर्षों का अनुभव है।"
      : "All our pilots are trained to international standards, hold IPPI certificates, and have years of experience.");

  return (
    <main
      className="min-h-screen relative bg-cover bg-center bg-fixed text-foreground"
      style={{ backgroundImage: "url(/pilots/hero.jpg)" }}
    >
      <div className="absolute inset-0 bg-black/10 z-0" />
      <div className="relative z-10">
        <Navigation />

        {/* Intro */}
        <section className="py-16 relative z-10 text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <h2 className="text-3xl font-bold font-serif">{introTitle}</h2>
              <p className="text-lg text-slate-200 leading-relaxed">{introDesc}</p>
            </div>
          </div>
        </section>

        {/* Cards */}
        <section className="py-16 relative z-10">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {pilotsData.map((pilot, index) => {
                const role = pilot.role[lang] ?? pilot.role.vi;
                const nickname = pilot.nickname[lang] ?? pilot.nickname.vi;

                return (
                  <motion.div
                    key={pilot.slug}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.08 }}
                    className="h-full"
                  >
                    <Link
                      href={`/pilots/${pilot.slug}`}
                      aria-label={`${buttonText}: ${pilot.name}`}
                      className="h-full"
                    >
                      <div className="group h-full flex flex-col rounded-2xl overflow-hidden bg-white/30 backdrop-blur-md border border-white/40 shadow-lg hover:shadow-2xl transition-all duration-300 text-white">
                        {/* ✅ ảnh dùng next/image để chắc chắn hiển thị + fallback */}
                        <PilotImage src={pilot.avatar} alt={pilot.name} />

                        <div className="p-6 flex flex-col grow justify-between">
                          <div>
                            <h3 className="text-2xl font-bold font-serif">{pilot.name}</h3>
                            <p className="text-lg text-white/90">{role}</p>
                          </div>

                          <div className="mt-4 flex items-center justify-between gap-3">
                            <p className="text-sm text-white/70">
                              {nicknameLabel}: {nickname}
                            </p>

                            <Button variant="secondary" className="px-4 py-2 text-sm shrink-0">
                              {buttonText}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Safety */}
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

        <div className="relative z-10">
          <Footer />
        </div>
      </div>
    </main>
  );
}