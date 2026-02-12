"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import  Footer  from "@/components/footer/Footer";
import { useLanguage } from "@/contexts/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Shirt,
  PackageCheck,
  Ban,
  Calendar,
  Ticket
} from "lucide-react";


/** ============ Dynamic RecentPosts (client-only) ============ */
// Tránh lỗi async server/client: không SSR component này.
const RecentPosts = dynamic(() => import("@/components/posts/RecentPosts"), {
  ssr: false,
  loading: () => (
    <section className="relative z-10 py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="h-8 w-56 rounded-full bg-white/10 backdrop-blur-md mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-56 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 animate-pulse"
            />
          ))}
        </div>
      </div>
    </section>
  ),
});

/** ====== DATA (SAFE UPDATE - không đổi key cũ để tránh lỗi) ====== */
const flyingSpots = [
  {
    nameKey: "khauPha",
    slug: "khau-pha",
    locationKey: "yenBai",
    price: 2190000,
    image: "/mu-cang-chai-yen-bai-1.jpg",

    // UI đổi tên: Khau Pha -> Mù Cang Chải
    uiNameKey: "muCangChai",
    // location Yên Bái đã đúng sẵn, nên có thể bỏ dòng dưới nếu không cần
    uiLocationKey: "yenBai",
  },
  {
    nameKey: "sonTra",
    slug: "son-tra",
    locationKey: "daNang",
    price: 1790000,
    image: "/son-tra-da-nang.jpg",

    // UI đổi tên: Sơn Trà -> Đà Nẵng
    uiNameKey: "daNang",
  },
  {
    nameKey: "doiBu",
    slug: "doi-bu",
    locationKey: "haNoi",
    price: 1690000,
    image: "/doi-bu-chuong-my.jpg",
    // giữ nguyên (nếu cần đổi label thì thêm uiNameKey/uiLocationKey tương tự)
  },
  {
    nameKey: "muongHoaSapa",
    slug: "muong-hoa-sapa",
    locationKey: "saPa",
    price: 2190000,
    image: "/muong-hoa-sapa.jpg",

    // UI đổi tên: Mường Hoa... -> Sapa
    uiNameKey: "sapa",
  },
  {
    nameKey: "vienNam",
    slug: "vien-nam",
    locationKey: "hoaBinh",
    price: 1690000,
    image: "/vien-nam-hoa-binh.jpg",

    // UI đổi location: Hoà Bình -> Hà Nội (nhưng vẫn giữ locationKey cũ để không vỡ logic)
    uiLocationKey: "haNoi",
  },
  {
    nameKey: "tramTau",
    slug: "tram-tau",
    locationKey: "yenBaiTramTau",
    price: 2000000,
    image: "/tram-tau-yen-bai.jpg",

    // UI đổi location theo yêu cầu: -> Lào Cai (giữ locationKey cũ)
    uiLocationKey: "laoCai",
  },
];

/** ====== Khi render UI ====== */
// const title = t(spot.uiNameKey ?? spot.nameKey);
// const location = t(spot.uiLocationKey ?? spot.locationKey);


export default function HomePage() {
  const { t } = useLanguage();
  const [hoveredSpot, setHoveredSpot] = useState<number | null>(null);

  // i18n helpers
  const locations = (t as any)?.spots?.locations ?? {};

  // ====== CONTACT Social links ======
  const socialLinks = [
    {
      name: "Facebook",
      iconSrc: "/social_icons/facebook.jpg",
      url: "https://www.facebook.com/mebayluon",
      color: "bg-[#1877F2]",
      description: t?.contact?.social?.facebook ?? "Theo dõi chúng tôi trên Facebook",
    },
    {
      name: "TikTok",
      iconSrc: "/social_icons/tiktok.jpg",
      url: "https://www.tiktok.com/@mebayluon_paragliding",
      color: "bg-black",
      description:
        t?.contact?.social?.tiktokDescription ?? "Video trải nghiệm bay mỗi ngày",
    },
    {
      name: "YouTube",
      iconSrc: "/social_icons/youtube.png",
      url: "https://www.youtube.com/@dangvm",
      color: "bg-[#FF0000]",
      description: t?.contact?.social?.youtube ?? "Xem lại các chuyến bay ấn tượng",
    },
    {
      name: "WhatsApp",
      iconSrc: "/social_icons/whatsapp.jpg",
      url: "https://api.whatsapp.com/send/?phone=84964073555",
      color: "bg-[#25D366]",
      description: t?.contact?.social?.whatsapp ?? "Liên hệ nhanh qua WhatsApp",
    },
    {
      name: "Zalo",
      iconSrc: "/social_icons/zalo.jpg",
      url: "https://zalo.me/0964073555",
      color: "bg-[#0068FF]",
      description: t?.contact?.social?.zalo ?? "Chat Zalo 24/7",
    },
  ];

  // ====== PRE-NOTICE content (from translations.ts) ======
  const preNotice = {
    posters: {
      title: t?.preNotice?.posters?.title ?? "ĐIỀU KIỆN QUY ĐỊNH ĐỐI VỚI HÀNH KHÁCH",
      subtitle: t?.preNotice?.posters?.subtitle ?? "",
    },
    preparation: {
      title: t?.preNotice?.preparation?.title ?? "CHUẨN BỊ TRƯỚC KHI BAY",
      clothing: {
        title: t?.preNotice?.preparation?.clothing?.title ?? "Trang phục",
        items: t?.preNotice?.preparation?.clothing?.items ?? [],
      },
      items: {
        title: t?.preNotice?.preparation?.items?.title ?? "Quy trình bay",
        list: t?.preNotice?.preparation?.items?.list ?? [],
      },
    },
    
    requirements: {
      title: t?.preNotice?.requirements?.title ?? "ĐIỀU KIỆN QUY ĐỊNH ĐỐI VỚI HÀNH KHÁCH",
      eligible: {
        title: t?.preNotice?.requirements?.eligible?.title ?? "Điều kiện tham gia bay",
        items: t?.preNotice?.requirements?.eligible?.items ?? [],
      },

      notEligible: {
        title: t?.preNotice?.requirements?.notEligible?.title ?? "Đặt vé",
        items: t?.preNotice?.requirements?.notEligible?.items ?? [],
      },
      special: {
        title: t?.preNotice?.requirements?.cancellation?.title ?? "Huỷ bay",
        items: [
          ...(t?.preNotice?.requirements?.cancellation?.byCompany?.items ?? []),
          ...(t?.preNotice?.requirements?.cancellation?.byCustomer?.items ?? []),
          ...(t?.preNotice?.requirements?.cancellation?.reschedule?.items ?? []),
        ],
      },
    },
  };

  return (
    <main
      className="min-h-screen relative bg-cover bg-center bg-fixed text-foreground"
      style={{ backgroundImage: "url(/hinh-nen.jpg)" }}
    >
      {/* Global dark veil */}
      <div className="absolute inset-0 bg-black/20 z-0" />

      {/* ================= HERO ================= */}
      <section
        id="hero"
        className="relative min-h-[100svh] pt-24 md:pt-28 flex items-center justify-center z-10 overflow-visible"
      >
        <motion.div
          className="container mx-auto px-5 text-center text-white max-w-[1100px]"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
        >
          <h1
            className="
              font-serif font-extrabold mb-5 leading-[0.92] tracking-tight break-words
              text-[clamp(2.4rem,10vw,5.2rem)] md:text-[clamp(3.5rem,8vw,7rem)]
            "
          >
            {t?.hero?.title ?? "MEBAYLUON PARAGLIDING"}
          </h1>

          <p className="text-[clamp(0.95rem,3.2vw,1.25rem)] mb-8 max-w-3xl mx-auto opacity-90">
            {t?.hero?.description ?? "Trải nghiệm cảm giác bay tự do giữa mây trời Việt Nam"}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-lg bg-accent hover:bg-accent/90 h-14 px-8">
              <Link href="/booking">{t?.hero?.bookNow ?? "Đặt Lịch Bay Ngay"}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="text-lg bg-white/10 backdrop-blur-sm border-white text-white hover:bg-white hover:text-foreground h-14 px-8"
            >
              <Link href="#about">{t?.hero?.learnMore ?? "Tìm hiểu thêm"}</Link>
            </Button>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex items-start justify-center p-2">
            <div className="w-1 h-3 bg-white/50 rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* ================= ABOUT ================= */}
      <section id="about" className="relative z-10 py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            {/* Text block (glass) */}
            <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="rounded-3xl p-8 md:p-10 bg-white/25 backdrop-blur-md shadow-2xl ring-1 ring-white/40">
                <h2 className="text-4xl md:text-5xl font-bold mb-4 font-serif text-white">
                  {t?.about?.title ?? "VỀ CHÚNG TÔI"}
                </h2>

                <p className="text-lg md:text-xl text-white/95 mb-5">
                  {t?.about?.subtitle ?? "Mebayluon Paragliding – nơi những giấc mơ bay cao trở thành hiện thực!"}
                </p>

                <p className="text-base md:text-lg text-white/90 leading-relaxed">
                  {t?.about?.description ??
                    "Trang thiết bị đạt tiêu chuẩn quốc tế, bảo hiểm đầy đủ cho mỗi chuyến bay, đội ngũ phi công chuyên nghiệp, tận tâm và luôn đồng hành cùng bạn từ mặt đất đến bầu trời."}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild className="h-11 px-6 text-white">
                    <a
                      href="#spots"
                      onClick={(e) => {
                        e.preventDefault();
                        const el = document.getElementById("spots");
                        if (!el) return;
                        const nav = document.querySelector<HTMLElement>("nav[data-nav-root]");
                        const offset = (nav?.offsetHeight ?? 80) + 8;
                        const top = el.getBoundingClientRect().top + window.scrollY - offset;
                        window.scrollTo({ top, behavior: "smooth" });
                        history.replaceState(null, "", "#spots");
                      }}
                    >
                      {t?.spots?.viewDetails ?? "Xem Chi Tiết"}
                    </a>
                  </Button>

                  <Button
                    asChild
                    variant="outline"
                    className="h-11 px-6 border-white/60 text-white bg-white/10 hover:bg-white/20"
                  >
                    <Link href="/pilots">{t?.nav?.pilots ?? "Phi công"}</Link>
                  </Button>
                </div>
              </div>
            </motion.div>

{/* Video (wider on large screens) */}
<motion.div
  initial={{ opacity: 0, x: 24 }}
  whileInView={{ opacity: 1, x: 0 }}
  viewport={{ once: true }}
>
  <div className="relative w-full lg:w-[110%] lg:ml-[-5%] aspect-[16/10] md:aspect-[16/9] rounded-[28px] overflow-hidden shadow-2xl ring-1 ring-white/30">
    <video
      className="absolute inset-0 h-full w-full object-cover"
      src="/about-us-video1.mp4"
      autoPlay
      loop
      playsInline
      preload="metadata"
      muted
      aria-label="Mebayluon Paragliding - About"
    />
  </div>
</motion.div>




          </div>
        </div>
      </section>

      {/* ================= LATEST POSTS (NEW) ================= */}
      <RecentPosts limit={3} title="BÀI VIẾT MỚI NHẤT" />

      {/* ================= SPOTS ================= */}
      <section id="spots" className="relative z-10 py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-6 text-white">
              {t?.spots?.title ?? "Các điểm bay nổi bật"}
            </h2>
            <p className="text-xl text-slate-100 max-w-2xl mx-auto">
              {t?.spots?.subtitle ?? "Những địa điểm nổi tiếng với cảnh quan hùng vĩ và điều kiện gió lý tưởng."}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {flyingSpots.map((spot, index) => {
              const spotData =
                locations[spot.nameKey] ?? {
                  name: spot.slug.replace(/-/g, " "),
                  location: spot.locationKey,
                  description: "",
                  highlight: "",
                };
              return (
                <motion.div
                  key={spot.slug}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  onHoverStart={() => setHoveredSpot(index)}
                  onHoverEnd={() => setHoveredSpot(null)}
                  className="group relative overflow-hidden rounded-2xl bg-white/40 backdrop-blur-md shadow-lg hover:shadow-2xl border border-white/30 transition-all duration-500 cursor-pointer"
                >
                  <Link href={`/spots/${spot.slug}`}>
                    <div className="relative h-80 overflow-hidden">
                      <motion.div
                        className="absolute inset-0"
                        animate={{ scale: hoveredSpot === index ? 1.1 : 1 }}
                        transition={{ duration: 0.6 }}
                        style={{
                          backgroundImage: `url(${spot.image})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                      <div className="absolute top-4 left-4 flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full">
                        <MapPin size={16} className="text-accent" />
                        <span className="text-sm font-semibold text-foreground">{spotData.location}</span>
                      </div>
                      <div className="absolute top-4 right-4 bg-accent/90 backdrop-blur-sm px-3 py-1.5 rounded-full">
                        <span className="text-sm font-bold text-white">
                          {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(spot.price)}
                        </span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                        <h3 className="text-2xl font-bold mb-2 font-serif">{spotData.name}</h3>
                        {spotData.description && <p className="text-sm opacity-90 mb-1">{spotData.description}</p>}
                        {spotData.highlight && <p className="text-xs opacity-75 mb-4">{spotData.highlight}</p>}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: hoveredSpot === index ? 1 : 0, y: hoveredSpot === index ? 0 : 20 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Button variant="secondary" size="sm" className="bg-white text-foreground hover:bg-white/90">
                            {t?.spots?.viewDetails ?? "Xem chi tiết"}
                          </Button>
                        </motion.div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= PRE-NOTICE ================= */}
      <section id="pre-notice" className="relative z-10 py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold mb-4 font-serif text-white">{preNotice.preparation.title}</h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Clothing */}
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} whileHover={{ y: -5 }} className="transition-transform duration-300">
              <Card className="h-full bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-3">
                    <Shirt /> {preNotice.preparation.clothing.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {preNotice.preparation.clothing.items.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="text-green-400 mt-1 flex-shrink-0" size={20} />
                        <span className="text-slate-200">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            {/* Items */}
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} whileHover={{ y: -5 }} className="transition-transform duration-300">
              <Card className="h-full bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-3">
                    <PackageCheck /> {preNotice.preparation.items.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {preNotice.preparation.items.list.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="text-green-400 mt-1 flex-shrink-0" size={20} />
                        <span className="text-slate-200">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* posters */}
          <div className="mt-16">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
              <h3 className="text-3xl font-bold mb-3 font-serif text-white">{preNotice.posters.title}</h3>
              <p className="text-slate-200 max-w-3xl mx-auto">{preNotice.posters.subtitle}</p>
            </motion.div>
          </div>

          {/* requirements */}
          <div className="mt-16 max-w-5xl mx-auto space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* eligible - Dieu kien tham gia */}
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <Card className="h-full bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      <CheckCircle2 className="text-green-400" /> {preNotice.requirements.eligible.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {preNotice.requirements.eligible.items.map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-3">
                          <CheckCircle2 className="text-green-400 mt-1 flex-shrink-0" size={18} />
                          <span className="text-slate-200">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>



              {/* not eligible - Dat ve */}
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
                <Card className="h-full bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      <Ticket className="text-yellow-400" /> {preNotice.requirements.notEligible.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {preNotice.requirements.notEligible.items.map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-3">
                          <CheckCircle2 className="text-yellow-400 mt-1 flex-shrink-0" size={18} />
                          <span className="text-slate-200">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>

              {/* special - Huy bay */}
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}>
                <Card className="h-full bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      <Ban className="text-red-400" /> {preNotice.requirements.special.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {preNotice.requirements.special.items.map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-3">
                          <Ban className="text-red-400 mt-1 flex-shrink-0" size={18} />
                          <span className="text-slate-200">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CONTACT ================= */}
      <section id="contact" className="relative z-10 py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold mb-4 font-serif text-white">{t?.contact?.title ?? "Liên hệ"}</h2>
            <p className="text-lg text-slate-200 max-w-3xl mx-auto">
              {t?.contact?.subtitle ?? "Chúng tôi luôn sẵn sàng hỗ trợ bạn mọi lúc!"}
            </p>
          </motion.div>

          {/* Social grid */}
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
                      <Image src={social.iconSrc} alt={social.name} fill className="object-cover" />
                    </div>
                    <h3 className="text-xl font-bold">{social.name}</h3>
                    <p className="text-sm text-slate-200 min-h-[60px] flex items-center justify-center px-2">
                      {social.description}
                    </p>
                    <Button
                      className={`w-full mt-auto ${social.color} hover:opacity-90 text-white`}
                      onClick={() => window.open(social.url, "_blank")}
                    >
                      {t?.contact?.contactNow ?? "Liên hệ ngay"}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Info grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: Phone,
                title: t?.contact?.phone ?? "Điện thoại",
                lines: [
                  "+84 964 073 555 (Mr. My)",
                  "+84 979 702 812 (Ms. Yupi)",
                  t?.contact?.support247 ?? "Hỗ trợ 24/7",
                ],
              },
              { icon: Mail, title: "Email", lines: ["mebayluon@gmail.com"] },
              {
                icon: MapPin,
                title: t?.contact?.address ?? "Địa chỉ",
                lines: ["Chương Mỹ (Hà Nội)", "Đèo Khau Phạ (Yên Bái)", " Sapa (Lào Cai)", " Sơn Trà (Đà Nẵng)", ],
              },
              { icon: Clock, title: t?.contact?.workingHours ?? "Giờ làm việc", lines: ["Thứ 2 - CN", "6:00 - 19:00"] },
            ].map((info, index) => (
              <motion.div
                key={info.title as string}
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
                        {(info.lines as string[]).map((line, i) => (
                          <p key={i} className="text-slate-200 text-sm">
                            {line}
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

      {/* ================= FOOTER ================= */}
      <div className="relative z-10 pt-12 pb-6">
        <div className="container mx-auto">
          <Footer />
        </div>
      </div>
    </main>
  );
}
