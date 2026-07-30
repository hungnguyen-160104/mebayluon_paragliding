"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Footer from "@/components/footer/Footer";
import { useLanguage } from "@/contexts/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  Shirt,
  PackageCheck,
  Ban,
  Ticket,
  Car,
} from "lucide-react";

/** ============ Dynamic RecentPosts (client-only) ============ */
const RecentPosts = dynamic(() => import("@/components/posts/RecentPosts"), {
  ssr: false,
  loading: () => (
    <section className="relative z-10 py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="mb-6 h-8 w-56 rounded-full bg-white/10 backdrop-blur-md" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md"
            />
          ))}
        </div>
      </div>
    </section>
  ),
});

type FlyingSpot = {
  nameKey: string;
  slug: string;
  locationKey: string;
  price: number;
  image: string;
};

const flyingSpots: FlyingSpot[] = [
  {
    nameKey: "khauPha",
    slug: "khau-pha",
    locationKey: "yenBai",
    price: 2190000,
    image: "/mu-cang-chai-yen-bai-1.jpg",
  },
  {
    nameKey: "sonTra",
    slug: "son-tra",
    locationKey: "daNang",
    price: 2190000,
    image: "/da-nang.jpg",
  },
  {
    nameKey: "doiBu",
    slug: "doi-bu",
    locationKey: "haNoi",
    price: 1790000,
    image: "/doi-bu-chuong-my.jpg",
  },
  {
    nameKey: "muongHoaSapa",
    slug: "muong-hoa-sapa",
    locationKey: "saPa",
    price: 2190000,
    image: "/muong-hoa-sapa.jpg",
  },
  {
    nameKey: "vienNam",
    slug: "ha-giang",
    locationKey: "hoaBinh",
    price: 2190000,
    image: "/ha-giang.JPG",
  },
  {
    nameKey: "tramTau",
    slug: "tram-tau",
    locationKey: "yenBaiTramTau",
    price: 2590000,
    image: "/tram-tau-yen-bai.jpg",
  },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);

const normalizeText = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const normalizeList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

export default function HomePage() {
  // Lấy thêm language từ context để phục vụ chuyển đổi ngôn ngữ cho RecentPosts
  const { t, language } = useLanguage() as any; 
  const [hoveredSpot, setHoveredSpot] = useState<number | null>(null);

  // Logic xác định tiêu đề Bài viết mới nhất
  const currentLang = language || t?.locale || "vi"; // fallback về "vi" nếu không lấy được
  const recentPostsTitle = currentLang === "vi" ? "BÀI VIẾT MỚI NHẤT" : "LATEST POSTS";

  const locations = ((t as any)?.spots?.locations ?? {}) as Record<string, any>;

  const aboutDescription = Array.isArray((t as any)?.about?.description)
    ? ((t as any).about.description as string[]).join(" ")
    : normalizeText(
        (t as any)?.about?.description,
        "Trang thiết bị đạt tiêu chuẩn quốc tế, bảo hiểm đầy đủ cho mỗi chuyến bay, đội ngũ phi công chuyên nghiệp, tận tâm và luôn đồng hành cùng bạn từ mặt đất đến bầu trời.",
      );

  const socialLinks = [
    {
      name: "Facebook",
      iconSrc: "/social_icons/facebook.jpg",
      url: "https://www.facebook.com/mebayluon",
      color: "bg-[#1877F2]",
      description:
        t?.contact?.social?.facebook ?? "Theo dõi chúng tôi trên Facebook",
    },
    {
      name: "TikTok",
      iconSrc: "/social_icons/tiktok.jpg",
      url: "https://www.tiktok.com/@mebayluon_paragliding",
      color: "bg-black",
      description:
        t?.contact?.social?.tiktokDescription ??
        "Video trải nghiệm bay mỗi ngày",
    },
    {
      name: "YouTube",
      iconSrc: "/social_icons/youtube.png",
      url: "https://www.youtube.com/@dangvm",
      color: "bg-[#FF0000]",
      description:
        t?.contact?.social?.youtube ?? "Xem lại các chuyến bay ấn tượng",
    },
    {
      name: "WhatsApp",
      iconSrc: "/social_icons/whatsapp.jpg",
      url: "https://api.whatsapp.com/send/?phone=84964073555",
      color: "bg-[#25D366]",
      description:
        t?.contact?.social?.whatsapp ?? "Liên hệ nhanh qua WhatsApp",
    },
    {
      name: "Zalo",
      iconSrc: "/social_icons/zalo.png",
      url: "https://zalo.me/0964073555",
      color: "bg-[#0068FF]",
      description: t?.contact?.social?.zalo ?? "Chat Zalo 24/7",
    },
  ];

  const preNotice = {
    preparation: {
      title: t?.preNotice?.preparation?.title ?? "Chuẩn bị trước khi bay",
      clothing: {
        title: t?.preNotice?.preparation?.clothing?.title ?? "Trang phục",
        items: normalizeList(t?.preNotice?.preparation?.clothing?.items),
      },
      process: {
        title: t?.preNotice?.preparation?.items?.title ?? "Quy trình bay",
        items: normalizeList(t?.preNotice?.preparation?.items?.list),
      },
      transport: {
        title:
          (t?.preNotice as any)?.preparation?.transport?.title ?? "Xe đưa đón",
        items: normalizeList(
          (t?.preNotice as any)?.preparation?.transport?.items,
        ),
      },
    },

    requirements: {
      title:
        t?.preNotice?.requirements?.title ??
        t?.preNotice?.posters?.title ??
        "Điều kiện quy định đối với hành khách",

      eligible: {
        title:
          t?.preNotice?.requirements?.eligible?.title ??
          "Điều kiện tham gia bay",
        items: normalizeList(t?.preNotice?.requirements?.eligible?.items),
      },

      booking: {
        title: t?.preNotice?.requirements?.notEligible?.title ?? "Đặt vé",
        items: normalizeList(t?.preNotice?.requirements?.notEligible?.items),
      },

      cancellation: (() => {
        const cancel = (t?.preNotice as any)?.requirements?.cancellation;
        return {
          title: cancel?.title ?? "Chính sách huỷ & đổi lịch bay",
          items: normalizeList(cancel?.items),
        };
      })(),
    },
  };

  const sectionHeadingClass =
    "text-4xl md:text-5xl font-bold font-serif text-white";
  const glassCardClass =
    "h-full border border-white/20 bg-white/10 text-white shadow-lg backdrop-blur-md";

  const preparationCards = [
    {
      title: preNotice.preparation.clothing.title,
      items: preNotice.preparation.clothing.items,
      icon: Shirt,
      accentClassName: "text-green-400",
      bulletIcon: CheckCircle2,
    },
    {
      title: preNotice.preparation.process.title,
      items: preNotice.preparation.process.items,
      icon: PackageCheck,
      accentClassName: "text-green-400",
      bulletIcon: CheckCircle2,
    },
    {
      title: preNotice.preparation.transport.title,
      items: preNotice.preparation.transport.items,
      icon: Car,
      accentClassName: "text-sky-400",
      bulletIcon: CheckCircle2,
    },
  ];

  const requirementCards = [
    {
      title: preNotice.requirements.eligible.title,
      items: preNotice.requirements.eligible.items,
      icon: CheckCircle2,
      accentClassName: "text-green-400",
      bulletIcon: CheckCircle2,
    },
    {
      title: preNotice.requirements.booking.title,
      items: preNotice.requirements.booking.items,
      icon: Ticket,
      accentClassName: "text-yellow-400",
      bulletIcon: CheckCircle2,
    },
    {
      title: preNotice.requirements.cancellation.title,
      items: preNotice.requirements.cancellation.items,
      icon: Ban,
      accentClassName: "text-red-400",
      bulletIcon: Ban,
    },
  ];

  /**
   * Mỗi dòng trong thẻ liên hệ: chuỗi thường, hoặc kèm href để bấm được
   * (tel: gọi luôn trên điện thoại, mailto: mở ứng dụng mail).
   */
  type ContactLine = string | { text: string; href: string };

  const contactInfoCards: Array<{
    icon: React.ElementType;
    title: string;
    lines: ContactLine[];
  }> = [
    {
      icon: Phone,
      title: t?.contact?.phone ?? "Điện thoại",
      lines: [
        { text: "+84 964 073 555 (Mr. My)", href: "tel:+84964073555" },
        { text: "+84 385 907 789 (Ms Ngọc)", href: "tel:+84385907789" },
        t?.contact?.support247 ?? "Hỗ trợ 24/7",
      ],
    },
    {
      icon: Mail,
      title: "Email",
      lines: [
        { text: "mebayluon@gmail.com", href: "mailto:mebayluon@gmail.com" },
      ],
    },
    {
      icon: MapPin,
      title: t?.contact?.address ?? "Địa chỉ",
      lines: [
        "GO! Thăng Long (Hà Nội)",
        "Đèo Khau Phạ (Tú Lệ)",
        "Xuân Mai (Hà Nội)",
        "Sapa (Lào Cai)",
        "Đồng Văn (Hà Giang)",
      ],
    },
    {
      icon: Clock,
      title: t?.contact?.workingHours ?? "Giờ làm việc",
      lines: ["Thứ 2 - CN", "6:00 - 19:00"],
    },
  ];

  return (
    <div className="relative text-foreground">
      {/* Fixed background - iOS Safari does not support background-attachment:fixed on non-body elements */}
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: "url(/hinh-nen.jpg)" }}
      />
      <div className="fixed inset-0 -z-10 bg-black/20" />

      {/* ================= HERO ================= */}
      <section
        id="hero"
        className="relative z-10 flex min-h-svh items-center justify-center overflow-visible pt-24 md:pt-28"
      >
        <motion.div
          className="container mx-auto max-w-275 px-5 text-center text-white"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
        >
          {/* Viền chữ mảnh + bóng nhiều lớp: chữ bật hẳn khỏi nền ảnh
              nhưng vẫn mềm nhờ lớp bóng khuếch tán rộng phía sau */}
          <h1
            className="
              wrap-break-word mb-5 font-serif font-extrabold leading-[0.92] tracking-tight
              text-[clamp(2.4rem,10vw,5.2rem)] md:text-[clamp(3.5rem,8vw,7rem)]
            "
            style={{
              WebkitTextStroke: "1.5px rgba(255,255,255,0.35)",
              textShadow:
                "0 2px 4px rgba(0,0,0,0.9), 0 6px 18px rgba(0,0,0,0.75), 0 12px 40px rgba(1,148,243,0.55)",
            }}
          >
            {t?.hero?.title ?? "MEBAYLUON PARAGLIDING"}
          </h1>

          <p
            className="mx-auto mb-8 max-w-3xl text-[clamp(0.95rem,3.2vw,1.25rem)]"
            style={{
              textShadow:
                "0 1px 3px rgba(0,0,0,0.95), 0 4px 12px rgba(0,0,0,0.7), 0 8px 26px rgba(1,148,243,0.45)",
            }}
          >
            {t?.hero?.description ??
              "Trải nghiệm bay tự do giữa mây trời Việt Nam"}
          </p>

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-14 bg-accent px-8 text-lg hover:bg-accent/90"
            >
              <Link href="/booking">
                {t?.hero?.bookNow ?? "Đặt Lịch Bay Ngay"}
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-14 border-white bg-white/10 px-8 text-lg text-white backdrop-blur-sm hover:bg-white hover:text-foreground"
            >
              <Link href="/spots">{t?.hero?.learnMore ?? "Tìm hiểu thêm"}</Link>
            </Button>
          </div>
        </motion.div>

        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="flex h-10 w-6 items-start justify-center rounded-full border-2 border-white/50 p-2">
            <div className="h-3 w-1 rounded-full bg-white/50" />
          </div>
        </motion.div>
      </section>

      {/* ================= ABOUT ================= */}
      <section id="about" className="relative z-10 py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="rounded-3xl bg-white/25 p-8 shadow-2xl ring-1 ring-white/40 backdrop-blur-md md:p-10">
                <h2 className="mb-4 font-serif text-4xl font-bold text-white md:text-5xl">
                  {t?.about?.title ?? "VỀ CHÚNG TÔI"}
                </h2>

                <p className="mb-5 text-lg text-white/95 md:text-xl">
                  {t?.about?.subtitle ??
                    "Mebayluon Paragliding – nơi những giấc mơ bay cao trở thành hiện thực!"}
                </p>

                <p className="text-base leading-relaxed text-white/90 md:text-lg">
                  {aboutDescription}
                </p>

                <div className="mt-6">
                  {/* Chỉ một nút — trước đây có thêm nút "Phi công" nhưng
                      cùng trỏ /pilots nên trùng lặp, đã bỏ. */}
                  <Button asChild className="h-11 px-6 text-white">
                    <Link href="/pilots">
                      {t?.spots?.viewDetails ?? "Xem Chi Tiết"}
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="relative aspect-16/10 w-full overflow-hidden rounded-[28px] shadow-2xl ring-1 ring-white/30 md:aspect-video lg:ml-[-5%] lg:w-[110%]">
                {/* Trước đây là <video src="/about-us-video1.mp4"> nhưng file
                    không tồn tại trong public/ nên ô hiển thị trống. Tạm dùng
                    ảnh; khi có video thì thêm file vào public/ rồi đổi lại. */}
                <Image
                  src="/about-us.jpg"
                  alt="Mebayluon Paragliding - Về chúng tôi"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ================= SPOTS ================= */}
      <section id="spots" className="relative z-10 py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-16 text-center"
          >
            <h2 className="mb-6 text-5xl font-bold text-white md:text-6xl">
              {t?.spots?.title ?? "Các điểm bay nổi bật"}
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-slate-100">
              {t?.spots?.subtitle ??
                "Những địa điểm nổi tiếng với cảnh quan hùng vĩ và điều kiện gió lý tưởng."}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {flyingSpots.map((spot, index) => {
              const spotData = locations[spot.nameKey] ?? {};
              const spotName = normalizeText(
                spotData.name,
                spot.slug.replace(/-/g, " "),
              );
              const spotLocation = normalizeText(
                spotData.location,
                spot.locationKey,
              );
              const spotArea = normalizeText(spotData.area);
              const spotDescription = normalizeText(spotData.description);
              const spotHighlight = normalizeText(spotData.highlight);
              const spotDuration = normalizeText(spotData.duration);

              return (
                <motion.div
                  key={spot.slug}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  onHoverStart={() => setHoveredSpot(index)}
                  onHoverEnd={() => setHoveredSpot(null)}
                  className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/30 bg-white/40 shadow-lg backdrop-blur-md transition-all duration-500 hover:shadow-2xl"
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

                      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent" />

                      <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 backdrop-blur-sm">
                        <MapPin size={16} className="text-accent" />
                        <span className="text-sm font-semibold text-foreground">
                          {spotLocation}
                        </span>
                      </div>

                      <div className="absolute right-4 top-4 rounded-2xl bg-accent/90 px-3 py-2 text-right text-white backdrop-blur-sm">
                        <div className="text-sm font-bold">
                          {formatCurrency(spot.price)}
                        </div>
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                        <h3 className="mb-2 font-serif text-2xl font-bold">
                          {spotName}
                        </h3>

                        {spotArea ? (
                          <p className="mb-1 text-sm font-medium text-white/90">
                            {spotArea}
                          </p>
                        ) : null}

                        {spotDescription ? (
                          <p className="mb-3 text-sm text-white/85">
                            {spotDescription}
                          </p>
                        ) : null}

                        <div className="mb-4 flex flex-wrap gap-2">
                          {spotDuration ? (
                            <span className="rounded-full bg-white/15 px-3 py-1 text-xs text-white/90 backdrop-blur-sm">
                              {spotDuration}
                            </span>
                          ) : null}

                          {spotHighlight ? (
                            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80 backdrop-blur-sm">
                              {spotHighlight}
                            </span>
                          ) : null}
                        </div>

                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{
                            opacity: hoveredSpot === index ? 1 : 0,
                            y: hoveredSpot === index ? 0 : 20,
                          }}
                          transition={{ duration: 0.3 }}
                        >
                          <Button
                            variant="secondary"
                            size="sm"
                            className="bg-white text-foreground hover:bg-white/90"
                          >
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
            className="mb-12 text-center"
          >
            <h2 className={sectionHeadingClass}>
              {preNotice.preparation.title}
            </h2>
          </motion.div>

          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-3">
            {preparationCards.map(
              ({ title, items, icon: Icon, accentClassName, bulletIcon: BulletIcon }, index) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                  className="h-full transition-transform duration-300"
                >
                  <Card className={glassCardClass}>
                    <CardHeader className="px-4 pb-3 pt-4">
                      <CardTitle className="flex items-center gap-3 text-xl">
                        <Icon className={accentClassName} />
                        {title}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="px-4 pb-4 pt-0">
                      <ul className="space-y-2">
                        {items.map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <BulletIcon
                              className={`${accentClassName} mt-0.5 shrink-0`}
                              size={18}
                            />
                            <span className="text-sm text-slate-200">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              ),
            )}
          </div>

          <div className="mt-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-12 text-center"
            >
              <h3 className={sectionHeadingClass}>
                {preNotice.requirements.title}
              </h3>
            </motion.div>
          </div>

          <div className="mx-auto mt-16 max-w-7xl">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              {requirementCards.map(
                ({ title, items, icon: Icon, accentClassName, bulletIcon: BulletIcon }, index) => (
                  <motion.div
                    key={title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="h-full"
                  >
                    <Card className={glassCardClass}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-2xl">
                          <Icon className={accentClassName} />
                          {title}
                        </CardTitle>
                      </CardHeader>

                      <CardContent>
                        <ul className="space-y-3">
                          {items.map((item, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <BulletIcon
                                className={`${accentClassName} mt-1 shrink-0`}
                                size={18}
                              />
                              <span className="text-slate-200">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </motion.div>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ================= LATEST POSTS ================= */}
      {/* Đã truyền thêm prop `title` xuống component RecentPosts. 
        Bạn cần cập nhật file RecentPosts.tsx để nhận prop `title` này nhé! 
      */}
      <RecentPosts title={recentPostsTitle} />

      {/* ================= CONTACT ================= */}
      <section id="contact" className="relative z-10 py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="mb-4 font-serif text-4xl font-bold text-white">
              {t?.contact?.title ?? "Liên hệ"}
            </h2>
            <p className="mx-auto max-w-3xl text-lg text-slate-200">
              {t?.contact?.subtitle ??
                "Chúng tôi luôn sẵn sàng hỗ trợ bạn mọi lúc!"}
            </p>
          </motion.div>

          <div className="mx-auto mb-16 grid max-w-7xl grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5 md:gap-6">
            {socialLinks.map((social, index) => (
              <motion.div
                key={social.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={index === socialLinks.length - 1 && socialLinks.length % 2 !== 0 ? "col-span-2 md:col-span-1" : ""}
              >
                <Card className="h-full border border-white/30 bg-white/20 text-white backdrop-blur-md transition-all duration-300 hover:shadow-2xl">
                  <CardContent className="flex flex-col items-center space-y-3 px-3 pb-4 pt-5 text-center sm:px-4">
                    <div
                      className={`relative inline-flex h-14 w-14 items-center justify-center overflow-hidden rounded-full ${social.color}`}
                    >
                      <Image
                        src={social.iconSrc}
                        alt={social.name}
                        fill
                        className="object-cover"
                      />
                    </div>

                    <h3 className="text-base font-bold sm:text-lg">{social.name}</h3>

                    <p className="px-1 text-xs text-slate-200 sm:px-2 sm:text-sm">
                      {social.description}
                    </p>

                    <Button
                      className={`w-full ${social.color} text-white hover:opacity-90 text-sm`}
                      onClick={() => window.open(social.url, "_blank")}
                    >
                      {t?.contact?.contactNow ?? "Liên hệ ngay"}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 md:gap-8 lg:grid-cols-4">
            {contactInfoCards.map((info, index) => (
              <motion.div
                key={info.title as string}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full border border-white/30 bg-white/20 text-white backdrop-blur-md">
                  <CardContent className="px-3 pb-4 pt-4 md:px-4 md:pb-5 md:pt-5">
                    <div className="flex flex-col items-center gap-2 text-center md:gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/25 md:h-10 md:w-10">
                        <info.icon className="text-white" size={18} />
                      </div>

                      <div>
                        <h3 className="mb-1.5 text-sm font-semibold md:text-base">
                          {info.title}
                        </h3>
                        {info.lines.map((line, i) =>
                          typeof line === "string" ? (
                            <p key={i} className="text-xs text-slate-200">
                              {line}
                            </p>
                          ) : (
                            <p key={i} className="text-xs text-slate-200">
                              <a
                                href={line.href}
                                className="underline-offset-2 transition-colors hover:text-white hover:underline"
                              >
                                {line.text}
                              </a>
                            </p>
                          )
                        )}
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
      <div className="relative z-10 pb-6 pt-12">
        <div className="container mx-auto">
          <Footer />
        </div>
      </div>
    </div>
  );
}