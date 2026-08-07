"use client";

// app/ppg/PpgClient.tsx
// Trang giới thiệu dịch vụ dù lượn gắn động cơ (PPG) tại đèo Khau Phạ.
//
// Nền trang là video bay PPG chạy nền (LazyVideo -> chỉ tải khi cuộn tới, ở
// đây nó nằm ngay đầu trang nên tải luôn; file đã nén còn 2MB và KHÔNG có
// tiếng). Dưới video có một lớp phủ tối để chữ trắng đọc được.
//
// Nội dung/bản dịch ở lib/i18n/ppg.ts; link OTA lọc từ lib/spot-partner-links.

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  MapPin,
  Mountain,
  Clock,
  Plane,
  ArrowRight,
  Check,
  Quote,
  BookOpen,
  ImageOff,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import Footer from "@/components/footer/Footer";
import { LazyVideo } from "@/components/lazy-video";
import { useLanguage } from "@/contexts/language-context";
import { BRAND_BUTTON_CLASS } from "@/lib/partner-links";
import { getSpotLinks, SPOT_LINK_I18N } from "@/lib/spot-partner-links";
import { bookingHrefForFlightType } from "@/lib/booking/spot-to-location";
import {
  getPpgCopy,
  PPG_EXPERIENCE_IMAGES,
  PPG_GALLERY,
  PPG_PAGE_BACKGROUND,
  PPG_REVIEW_IMAGES,
  PPG_PRICING,
  PPG_ARTICLE_SLUGS,
  type PpgLang,
} from "@/lib/i18n/ppg";

const formatVND = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

const safeLang = (v: unknown): PpgLang => {
  const code = String(v ?? "vi").slice(0, 2).toLowerCase() as PpgLang;
  return (["vi", "en", "fr", "ru", "zh", "hi"] as const).includes(code)
    ? code
    : "vi";
};

const EXPERIENCE_ORDER = [
  "cloudHunting",
  "sunrise",
  "sunset",
  "highAltitude",
] as const;

const sectionTitle =
  "text-hero-shadow text-center font-serif text-3xl font-bold text-white md:text-4xl";
const glassCard =
  "rounded-2xl border border-white/20 bg-slate-800/50 backdrop-blur-xl";

export default function PpgClient() {
  const { language } = useLanguage();
  const lang = safeLang(language);
  const c = getPpgCopy(lang);

  // Khối đặt qua đối tác: chỉ lấy các link BÁN TOUR DÙ MÁY của Khau Phạ,
  // không lấy link dù lượn thường để khách khỏi bấm nhầm sang sản phẩm khác.
  const spotLinks = getSpotLinks("khau-pha");
  const paramotorLinks =
    spotLinks?.partners.filter((p) => p.kind === "paramotor") ?? [];
  // Trang này chỉ nói về dù máy: chỉ lấy toạ độ Clubhouse (nơi vừa cất vừa
  // hạ cánh dù máy), bỏ toạ độ bãi cất cánh của dù lượn thường trên đỉnh đèo.
  const paramotorMap =
    spotLinks?.maps.find((m) => m.kind === "paramotorTakeoff") ?? null;
  const SL = SPOT_LINK_I18N[lang] ?? SPOT_LINK_I18N.vi;

  // Nút đặt bay mở thẳng /booking với Khau Phạ + dù lượn gắn động cơ chọn sẵn.
  const bookingHref = bookingHrefForFlightType("khau-pha", "paramotor");

  const facts = [
    {
      icon: Plane,
      label: c.takeoffLabel,
      value: c.takeoffValue,
      // Toạ độ gắn thẳng vào ô bãi cất cánh thay vì để một nút bản đồ rời.
      href: paramotorMap?.url,
    },
    { icon: MapPin, label: c.landingLabel, value: c.landingValue },
    { icon: Mountain, label: c.altitudeLabel, value: c.altitudeValue },
    { icon: Clock, label: c.durationLabel, value: c.durationValue },
  ];

  return (
    <main className="relative min-h-screen text-white">
      {/* ===== HERO: video bay PPG làm nền ===== */}
      {/* items-end + pb: đẩy khối chữ xuống 1/3 dưới màn hình để không che
          mặt khách trong video. */}
      <section className="relative flex min-h-[80vh] items-end justify-center overflow-hidden pb-8 pt-28 sm:min-h-[92vh] md:pb-10">
        <div className="absolute inset-0 bg-slate-950">
          {/* Video quay ngang (1600x1080). Trên điện thoại dọc, object-cover sẽ
              phóng to và cắt mất gần hết bề ngang — chỉ còn thấy một dải giữa.
              Nên ở màn hẹp dùng object-contain để lọt trọn khung hình, từ sm
              trở lên mới phủ kín. */}
          <Image
            src="/ppg/hero-bg.jpg"
            alt=""
            aria-hidden
            fill
            sizes="100vw"
            className="scale-110 object-cover blur-2xl sm:hidden"
          />
          <Image
            src="/ppg/hero-bg.jpg"
            alt=""
            aria-hidden
            fill
            priority
            sizes="100vw"
            className="object-contain sm:object-cover"
          />
          <LazyVideo
            src="/ppg/hero-bg.mp4"
            className="absolute inset-0 h-full w-full object-contain sm:object-cover"
          />
          {/* Chỉ tối vừa đủ ở dải dưới nơi có chữ; phần trên để video sáng rõ.
              Video đã được nâng sáng sẵn lúc nén nên lớp phủ nhẹ hơn trước. */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/65" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 container mx-auto max-w-4xl px-4 text-center"
          style={{ textShadow: "1px 2px 8px rgba(0,0,0,.75)" }}
        >
          {/* Nền accent (đỏ) cho đồng bộ với Badge tên điểm bay ở /spots/[slug] */}
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-accent/90 px-4 py-1.5 text-sm font-semibold text-white shadow-lg backdrop-blur-sm">
            <MapPin size={15} />
            {c.heroBadge}
          </span>

          <h1 className="mt-5 font-serif text-4xl font-bold md:text-6xl">
            {c.heroTitle}
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-100 md:text-xl">
            {c.heroSubtitle}
          </p>

          {/* Bỏ dòng "Giá từ ..." ở hero theo yêu cầu — giá vẫn nằm đầy đủ ở
              mục "Giá dịch vụ" phía dưới. */}
          {/* Chỉ còn một nút: khuyến khích khách đặt trực tiếp, không đẩy
              sang nền tảng đối tác ngay từ đầu trang. */}
          <div className="mt-8 flex justify-center">
            <Button
              asChild
              size="lg"
              className="cta-btn h-13 bg-accent px-8 text-base text-white hover:bg-accent/90"
            >
              <Link href={bookingHref}>{c.ctaBook}</Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Từ đây xuống nền là ẢNH bay dù máy (cố định khi cuộn), phủ một lớp
          tối để chữ đọc được. Ảnh thay ở PPG_PAGE_BACKGROUND. */}
      <div className="relative">
        <div className="fixed inset-0 -z-10">
          <Image
            src={PPG_PAGE_BACKGROUND}
            alt=""
            aria-hidden
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-slate-950/50" />
        </div>
        {/* ===== GIỚI THIỆU ===== */}
        <section className="py-16">
          <div className="container mx-auto max-w-3xl px-4">
            <h2 className={sectionTitle}>{c.introTitle}</h2>

            <div className="mt-8 space-y-4">
              {c.introBody.map((p, i) => (
                <p key={i} className="text-hero-shadow-soft text-[17px] leading-relaxed text-white">
                  {p}
                </p>
              ))}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                { slug: PPG_ARTICLE_SLUGS.whoIsItFor, label: c.readWhoIsItFor },
                {
                  slug: PPG_ARTICLE_SLUGS.vsParagliding,
                  label: c.readVsParagliding,
                },
              ].map((a) => (
                <Link
                  key={a.slug}
                  href={`/blog/${a.slug}`}
                  className="group flex items-center gap-3 rounded-xl border-2 border-accent/60 bg-slate-800/80 p-4 shadow-lg backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-accent hover:bg-slate-700/80 hover:shadow-xl"
                >
                  <BookOpen size={18} className="shrink-0 text-accent" />
                  <span className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-white">
                    {a.label}
                  </span>
                  <ArrowRight
                    size={17}
                    className="shrink-0 text-white/50 transition-transform group-hover:translate-x-1 group-hover:text-accent"
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ===== BỐN TRẢI NGHIỆM ===== */}
        <section className="py-16">
          <div className="container mx-auto max-w-6xl px-4">
            <h2 className={sectionTitle}>{c.experiencesTitle}</h2>
            <p className="text-hero-shadow-soft mx-auto mt-3 max-w-2xl text-center font-medium text-white/95">
              {c.experiencesSubtitle}
            </p>

            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {EXPERIENCE_ORDER.map((key, index) => {
                const exp = c.experiences[key];
                const img = PPG_EXPERIENCE_IMAGES[key];

                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.08 }}
                    className={`${glassCard} overflow-hidden`}
                  >
                    <div className="relative aspect-video w-full bg-white/5">
                      {img ? (
                        <Image
                          src={img}
                          alt={exp.title}
                          fill
                          sizes="(min-width: 640px) 50vw, 100vw"
                          className="object-cover"
                        />
                      ) : (
                        /* Chưa có ảnh -> ô trống có nhãn, chờ điền sau. */
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 border-b border-dashed border-white/20 text-slate-400">
                          <ImageOff size={26} />
                          <span className="text-xs">{c.imageComingSoon}</span>
                        </div>
                      )}
                    </div>

                    <div className="p-6">
                      <h3 className="font-serif text-xl font-bold">{exp.title}</h3>
                      <p className="mt-2 text-[15px] leading-relaxed text-slate-200">
                        {exp.desc}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===== ĐỊA ĐIỂM ===== */}
        <section className="py-16">
          <div className="container mx-auto max-w-5xl px-4">
            <h2 className={sectionTitle}>{c.locationTitle}</h2>

            <p className="text-hero-shadow-soft mx-auto mt-6 max-w-3xl text-center text-[17px] leading-relaxed text-white">
              {c.locationBody}
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {facts.map(({ icon: Icon, label, value, href }) => (
                <div key={label} className={`${glassCard} p-5 text-center`}>
                  <Icon size={22} className="mx-auto mb-3 text-accent" />
                  <p className="text-[11px] uppercase tracking-wider text-slate-400">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-semibold">{value}</p>

                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent underline decoration-from-font underline-offset-2 hover:text-white"
                    >
                      <MapPin size={13} />
                      {c.mapCta}
                    </a>
                  ) : null}
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* ===== GIÁ ===== */}
        <section className="py-16">
          <div className="container mx-auto max-w-4xl px-4">
            <h2 className={sectionTitle}>{c.pricingTitle}</h2>
            <p className="text-hero-shadow-soft mt-3 text-center font-medium text-white/95">{c.pricingSubtitle}</p>

            <div className={`${glassCard} mt-8 overflow-hidden`}>
              <div className="border-b border-white/15 p-6 sm:p-8">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="font-serif text-xl font-bold">{c.baseLabel}</h3>
                  <p className="text-2xl font-bold text-amber-300">
                    {formatVND(PPG_PRICING.baseVND)}
                    <span className="text-sm font-normal text-slate-200">
                      {c.perPax}
                    </span>
                  </p>
                </div>

                <p className="mt-6 text-[11px] uppercase tracking-wider text-slate-400">
                  {c.includedTitle}
                </p>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {c.included.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check size={17} className="mt-0.5 shrink-0 text-emerald-400" />
                      <span className="text-sm text-slate-100">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid gap-px bg-white/10 sm:grid-cols-3">
                {[
                  { label: c.flycamLabel, price: PPG_PRICING.flycamVND },
                  { label: c.camera360Label, price: PPG_PRICING.camera360VND },
                ].map((o) => (
                  <div key={o.label} className="bg-slate-900/60 p-5 text-center">
                    <p className="text-sm text-slate-200">{o.label}</p>
                    <p className="mt-1 text-lg font-bold">{formatVND(o.price)}</p>
                  </div>
                ))}

                {/* Combo rẻ hơn mua lẻ 100.000đ — tô nổi vì đây là lựa chọn
                    chúng tôi muốn khách chọn. */}
                <div className="bg-amber-400/15 p-5 text-center ring-1 ring-inset ring-amber-400/40">
                  <p className="text-sm font-medium text-amber-100">
                    {c.comboLabel}
                  </p>
                  <p className="mt-1 text-lg font-bold text-amber-300">
                    {formatVND(PPG_PRICING.comboVND)}
                  </p>
                  <p className="mt-0.5 text-xs text-amber-200/90">
                    {c.comboSave} {formatVND(PPG_PRICING.comboSaveVND)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== HƯỚNG DẪN ===== */}
        <section className="py-16">
          <div className="container mx-auto max-w-5xl px-4">
            <h2 className={sectionTitle}>{c.guideTitle}</h2>

            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {c.steps.map((step, index) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className={`${glassCard} p-5`}
                >
                  <h3 className="font-semibold text-amber-200">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-200">
                    {step.desc}
                  </p>
                </motion.div>
              ))}
            </div>

            <div className={`${glassCard} mt-8 p-6 sm:p-8`}>
              <h3 className="font-serif text-xl font-bold">
                {c.requirementsTitle}
              </h3>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {c.requirements.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check size={17} className="mt-0.5 shrink-0 text-emerald-400" />
                    <span className="text-sm text-slate-100">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ===== THƯ VIỆN ẢNH ===== */}
        <section className="py-16">
          <div className="container mx-auto max-w-6xl px-4">
            <h2 className={sectionTitle}>{c.galleryTitle}</h2>

            <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3">
              {PPG_GALLERY.map((src, index) => (
                <motion.div
                  key={src}
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="relative aspect-4/3 overflow-hidden rounded-2xl border border-white/20"
                >
                  <Image
                    src={src}
                    alt={c.galleryTitle}
                    fill
                    sizes="(min-width: 768px) 33vw, 50vw"
                    className="object-cover transition-transform duration-500 hover:scale-105"
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== CẢM NHẬN KHÁCH ===== */}
        <section className="py-16">
          <div className="container mx-auto max-w-6xl px-4">
            <h2 className={sectionTitle}>{c.reviewsTitle}</h2>

            {/* 4 cảm nhận: 1 hàng trên màn rộng, 2 hàng trên tablet — không để
                thẻ thứ 4 đứng lẻ loi như khi chia 3 cột. */}
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {c.reviews.map((r, index) => (
                <motion.div
                  key={r.name}
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  className={`${glassCard} flex h-full flex-col overflow-hidden`}
                >
                  {/* Ảnh chuyến bay của chính khách đó, đặt trên lời nhận xét. */}
                  {PPG_REVIEW_IMAGES[index] ? (
                    <div className="relative aspect-4/3 w-full">
                      <Image
                        src={PPG_REVIEW_IMAGES[index]}
                        alt={r.name}
                        fill
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover"
                      />
                    </div>
                  ) : null}

                  <div className="flex grow flex-col p-5">
                  <Quote size={20} className="mb-2.5 text-accent" />
                  <p className="grow text-[13px] leading-relaxed text-slate-100">
                    {r.text}
                  </p>
                  <div className="mt-5 border-t border-white/10 pt-3">
                    <p className="text-sm font-semibold">{r.name}</p>
                    <p className="text-xs text-slate-400">{r.from}</p>
                  </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== ĐẶT QUA ĐỐI TÁC ===== */}
        {paramotorLinks.length > 0 && (
          <section id="partners" className="scroll-mt-24 py-16">
            <div className="container mx-auto max-w-4xl px-4 text-center">
              <h2 className={sectionTitle}>{c.partnersTitle}</h2>
              <p className="text-hero-shadow-soft mx-auto mt-3 max-w-2xl font-medium text-white/95">
                {c.partnersSubtitle}
              </p>

              <ul className="mt-8 flex flex-wrap justify-center gap-3">
                {paramotorLinks.map((p) => (
                  <li key={p.url}>
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-md ring-1 ring-black/10 transition-all hover:-translate-y-0.5 hover:shadow-lg ${BRAND_BUTTON_CLASS[p.brand]}`}
                    >
                      <span>{p.platform}</span>
                      <span className="opacity-75">· {SL.paramotor}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* ===== CTA CUỐI ===== */}
        <section className="py-16">
          <div
            className={`${glassCard} container mx-auto max-w-3xl px-6 py-10 text-center`}
          >
            <h2 className="font-serif text-3xl font-bold">{c.finalCtaTitle}</h2>
            <p className="text-hero-shadow-soft mx-auto mt-3 max-w-xl font-medium text-white/95">
              {c.finalCtaBody}
            </p>
            <Button
              asChild
              size="lg"
              className="cta-btn mt-7 h-13 bg-accent px-10 text-base text-white hover:bg-accent/90"
            >
              <Link href={bookingHref}>{c.ctaBook}</Link>
            </Button>
          </div>
        </section>

        <div className="pb-6">
          <div className="container mx-auto">
            <Footer />
          </div>
        </div>
      </div>
    </main>
  );
}
