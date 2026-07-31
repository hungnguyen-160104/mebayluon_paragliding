"use client";

import Image from "next/image";
// import Link from "next/link"; // tạm ẩn cùng nút "Đặt phòng online"
import { useMemo } from "react";
import {
  Phone,
  MapPin,
  Coffee,
  Home,
  Users,
  Wifi,
  Car,
  Utensils,
  Music,
  Flame,
  Waves,
  Star,
  Mountain,
  Camera,
} from "lucide-react";

import { useLanguage } from "@/contexts/language-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
  amenities,
  type AmenityKey,
  roomTypes,
  type RoomFeatureKey,
  type RoomType,
  menuItems,
  type HomestayLang,
  locationInfo,
  locationTranslations,
} from "@/lib/homestay-data";

/* ================= Helpers ================= */
const getAmenityIcon = (amenity: AmenityKey) => {
  const icons: Partial<Record<AmenityKey, React.ElementType>> = {
    "free-handmade-tea": Home,
    "free-parking": Car,
    "free-wifi": Wifi,
    "shared-bathroom": Home,
    "bbq-area": Utensils,
    campfire: Flame,
    karaoke: Music,
    "swimming-pool": Waves,
    "camping-area": Home,
    "team-building-space": Users,
    paragliding: Mountain,
    "flycam-service": Camera,
  };

  return icons[amenity] ?? Home;
};

type IntroTitleKey = "location" | "traditional" | "cafe";
type IntroDescKey = "traditionalDesc" | "cafeDesc";

/* =============== Google Review Floating Badge =============== */
const GOOGLE_REVIEW_URL =
  "https://www.google.com/maps/place/Clubhouse+Mebayluon+Paragliding/@21.7764187,104.2636752,1008m/data=!3m1!1e3!4m11!3m10!1s0x3132d86a65a88495:0x69a2a48b9f14bb71!5m2!4m1!1i2!8m2!3d21.7764187!4d104.2636752!9m1!1b1!16s%2Fg%2F11dxdh48gt!17m2!4m1!1e3!18m1!1e1?entry=ttu";

type Lang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

/** Định dạng số tiền theo ngôn ngữ khách đang xem. */
const LOCALE_FOR_PRICE: Record<string, string> = {
  vi: "vi-VN", en: "en-US", fr: "fr-FR", ru: "ru-RU", zh: "zh-CN", hi: "hi-IN",
};

function formatRating(rating: number, langKey: Lang) {
  const LOCALE_BY_LANG: Record<Lang, string> = {
    vi: "vi-VN",
    en: "en-US",
    fr: "fr-FR",
    ru: "ru-RU",
    zh: "zh-CN",
    hi: "hi-IN",
  };
  const locale = LOCALE_BY_LANG[langKey] ?? "vi-VN";

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(rating);
}

function GoogleReviewBadge() {
  const { language } = useLanguage();
  const langKey = (
    (language ?? "vi").toString().slice(0, 2).toLowerCase() as Lang
  );

  const rating = 4.6;
  const reviewsCount = 93;

  const i18n: Record<Lang, { reviews: string; open: string; onGoogle: string }> =
    {
      vi: { reviews: "đánh giá", open: "Xem", onGoogle: "trên Google" },
      en: { reviews: "reviews", open: "Open", onGoogle: "on Google" },
      fr: { reviews: "avis", open: "Voir", onGoogle: "sur Google" },
      ru: { reviews: "отзывов", open: "Открыть", onGoogle: "в Google" },
      zh: { reviews: "条评价", open: "查看", onGoogle: "在 Google 上" },
      hi: { reviews: "समीक्षाएँ", open: "देखें", onGoogle: "Google पर" },
    };

  const text = i18n[langKey] ?? i18n.vi;
  const ratingPercent = `${(Math.max(0, Math.min(5, rating)) / 5) * 100}%`;

  return (
    <div
      className="
        fixed z-[9999]
        bottom-4 left-1/2 -translate-x-1/2
        md:bottom-6 md:right-6 md:left-auto md:translate-x-0
        print:hidden
      "
    >
      <a
        href={GOOGLE_REVIEW_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${text.open} ${text.onGoogle}`}
        className="
          group pointer-events-auto
          flex items-center gap-3
          rounded-2xl bg-white/95 text-neutral-900
          shadow-xl border border-black/10
          px-4 py-2.5 md:px-5 md:py-3
          backdrop-blur-md
          hover:-translate-y-0.5 hover:shadow-2xl
          transition-all
        "
      >
        <span className="relative inline-flex items-center justify-center w-6 h-6 rounded-sm overflow-hidden">
          <Image src="/logo_gg.png" alt="Google" width={24} height={24} />
        </span>

        <div className="flex items-center gap-1">
          <span className="font-semibold">{formatRating(rating, langKey)}</span>

          <div className="relative h-4">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={`e-${i}`}
                  className="w-4 h-4 text-neutral-300"
                  strokeWidth={1.5}
                />
              ))}
            </div>

            <div
              className="absolute left-0 top-0 h-4 overflow-hidden"
              style={{ width: ratingPercent }}
            >
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={`f-${i}`}
                    className="w-4 h-4 text-yellow-400 fill-yellow-400"
                    strokeWidth={1.5}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 text-sm text-neutral-700">
          <span className="mx-1 w-px h-4 bg-neutral-300" />
          <span className="font-medium">{reviewsCount}</span>
          <span className="font-semibold">{text.reviews}</span>
        </div>

        <span className="ml-2 text-xs md:text-sm text-blue-600 underline decoration-from-font">
          {text.open} {text.onGoogle}
        </span>
      </a>
    </div>
  );
}

/* ================= Banner cho thuê xe máy ================= */
/**
 * Khung nổi bật "treo" đầu trang homestay: dịch vụ cho thuê xe máy.
 * Giá giữ nguyên bằng số cho mọi ngôn ngữ, chỉ dịch chữ.
 */
const MOTORBIKE_RENTAL: Record<string, { title: string; price: string }> = {
  vi: { title: "Home có xe máy cho thuê", price: "120k – 200k/ngày" },
  en: { title: "Motorbikes for rent here", price: "120K–200K VND/day" },
  fr: { title: "Scooters à louer ici", price: "120K–200K VND/jour" },
  ru: { title: "Аренда мотобайков здесь", price: "120–200 тыс. VND/день" },
  zh: { title: "本店提供摩托车出租", price: "120K–200K 越南盾/天" },
  hi: { title: "यहाँ मोटरबाइक किराये पर", price: "120K–200K VND/दिन" },
};

const MOTORBIKE_PHONE_DISPLAY = "(+84) 033 7632532";
const MOTORBIKE_PHONE_TEL = "+84337632532";

/* ================= Page ================= */
export default function HomestayPage() {
  const { t, language } = useLanguage();
  const currentLocale = LOCALE_FOR_PRICE[String(language ?? "vi").slice(0,2).toLowerCase()] ?? "vi-VN";

  // Ngôn ngữ dùng cho tên món & đơn vị trong menu (fallback tiếng Việt)
  const menuLang: HomestayLang = (
    ["vi", "en", "fr", "ru", "zh", "hi"].includes(language ?? "")
      ? language
      : "vi"
  ) as HomestayLang;

  const priceFormatter = useMemo(
    () =>
      new Intl.NumberFormat(currentLocale, {
        style: "decimal",
      }),
    [currentLocale]
  );

  const introCards: Array<{
    icon: React.ElementType;
    titleKey: IntroTitleKey;
    desc?: string;
    descKey?: IntroDescKey;
  }> = [
    { icon: MapPin, titleKey: "location", desc: locationInfo.address },
    { icon: Home, titleKey: "traditional", descKey: "traditionalDesc" },
    { icon: Coffee, titleKey: "cafe", descKey: "cafeDesc" },
  ];

  const locText = locationTranslations[language] || locationTranslations.vi;

  return (
    <div className="min-h-screen pt-20 relative antialiased">
      <div className="fixed inset-0 -z-10 bg-cover bg-center" style={{ backgroundImage: "url(/contact.jpg)" }} />
      <div className="fixed inset-0 -z-10 bg-black/30" />

      <div className="relative z-10 text-white">
        {/* ===== Introduction ===== */}
        <section className="relative pt-16 pb-2 bg-transparent md:min-h-[calc(100vh-5rem)]">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="hidden">
                {t.homestay.intro.title}
              </h2>

              <h1 className="mx-auto w-fit rounded-2xl bg-black/50 px-6 py-3 text-4xl md:text-6xl font-extrabold text-white leading-tight shadow-lg mb-8 mt-8">
                {t.homestay.intro.title}
              </h1>

              {/* ===== Khung cho thuê xe máy — nổi bật đầu trang ===== */}
              {(() => {
                const rental =
                  MOTORBIKE_RENTAL[
                    String(language ?? "vi").slice(0, 2).toLowerCase()
                  ] ?? MOTORBIKE_RENTAL.vi;

                return (
                  <div className="rotate-3 -mt-4 mb-4 flex w-full flex-col items-end pr-3 lg:absolute lg:right-[4%] lg:top-44 lg:mt-0 lg:mb-0 lg:w-auto lg:items-center lg:pr-0">
                    {/* Icon xe máy đứng riêng phía trên (mobile +20%, desktop gấp đôi) */}
                    <span aria-hidden className="text-[53px] drop-shadow-lg lg:text-[88px]">
                      🛵
                    </span>

                    {/* Tấm bảng gỗ (ảnh vân gỗ) treo đung đưa dưới đinh */}
                    <div className="relative mt-1.5">
                      <span
                        aria-hidden
                        className="absolute -top-2.5 left-1/2 z-10 -translate-x-1/2 text-sm drop-shadow lg:-top-4 lg:text-2xl"
                      >
                        📌
                      </span>

                      <div
                        className="sign-swing w-36 rounded-md px-2.5 py-2.5 text-center shadow-2xl lg:w-72 lg:px-5 lg:py-5"
                        style={{
                          backgroundImage: "url(/wood-sign.svg)",
                          backgroundSize: "100% 100%",
                        }}
                      >
                        <p className="text-xs font-extrabold leading-snug text-amber-50 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] lg:text-xl">
                          {rental.title}
                        </p>
                        <p className="mt-0.5 text-[11px] font-bold text-yellow-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] lg:mt-1.5 lg:text-base">
                          💰 {rental.price}
                        </p>
                      </div>
                    </div>

                    {/* Nút gọi ở dưới cùng */}
                    <a
                      href={`tel:${MOTORBIKE_PHONE_TEL}`}
                      className="cta-btn mt-2 gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-amber-950 shadow-lg transition-transform hover:scale-105 hover:bg-amber-300 lg:mt-3 lg:px-4 lg:py-2 lg:text-sm"
                    >
                      📞 {MOTORBIKE_PHONE_DISPLAY}
                    </a>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {introCards.map((card) => {
                  const Icon = card.icon;

                  return (
                    <Card key={card.titleKey} className="hidden">
                      <CardContent className="pt-6 pb-6 text-center space-y-2">
                        <Icon className="h-12 w-12 mx-auto mb-2 text-accent" />
                        <h3 className="font-semibold text-white/95 drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">
                          {t.homestay.intro[card.titleKey]}
                        </h3>
                        <p className="text-sm text-white/80">
                          {card.desc ??
                            (card.descKey
                              ? t.homestay.intro[card.descKey]
                              : "")}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ===== Room Types ===== */}
        <section
          id="rooms"
          className="py-16 bg-transparent border-y border-white/10"
        >
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                {t.homestay.rooms.title}
              </h2>
              <p className="text-white/85">{t.homestay.rooms.subtitle}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {roomTypes.map((room: RoomType) => (
                <Card
                  key={room.id}
                  className="overflow-hidden hover:shadow-2xl transition-shadow flex flex-col rounded-2xl bg-black/30 backdrop-blur-lg border border-white/10 text-white"
                >
                  <div className="relative h-64">
                    <Image
                      src={room.image || "/placeholder.svg"}
                      alt={t.homestay.rooms[room.nameKey].name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <CardContent className="p-6 flex flex-col grow">
                    <h3 className="text-2xl font-bold mb-2 drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">
                      {t.homestay.rooms[room.nameKey].name}
                    </h3>

                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-3xl font-bold text-accent">
                        {priceFormatter.format(room.price)} ₫
                      </span>
                      <span className="text-sm text-white/80">
                        {t.homestay.rooms.priceTypes[room.priceType]}
                      </span>
                    </div>

                    <p className="text-sm text-white/85 mb-4 grow leading-relaxed">
                      {t.homestay.rooms[room.nameKey].description}
                    </p>

                    <div className="flex items-center gap-2 mb-4">
                      <Users className="h-4 w-4 text-white/70" />
                      <span className="text-sm text-white/90">
                        {t.homestay.rooms.capacity}: {room.capacity.adults}{" "}
                        {t.homestay.rooms.adults}
                        {typeof room.capacity.children === "number" &&
                          room.capacity.children > 0 &&
                          ` + ${room.capacity.children} ${t.homestay.rooms.children}`}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {room.features.map((feature: RoomFeatureKey) => (
                        <Badge
                          key={feature}
                          variant="secondary"
                          className="bg-white/15 text-white border-none"
                        >
                          {t.homestay.features[feature]}
                        </Badge>
                      ))}
                    </div>

                    <Button
                      className="w-full mt-auto bg-accent hover:bg-accent/90"
                      asChild
                    >
                      <a href={`tel:${locationInfo.phone}`}>
                        {t.homestay.rooms.bookNow}
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Café & Restaurant ===== */}
        <section className="py-16 bg-transparent">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                {t.homestay.cafe.title}
              </h2>
              <p className="text-white/85">{t.homestay.cafe.subtitle}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="relative w-full overflow-hidden border border-white/10 shadow-xl">
                <Image
                  src="/homestay/menu-cafe.jpg"
                  alt="Menu"
                  width={800}
                  height={1200}
                  className="w-full h-auto"
                />
              </div>

              <div>
                <div className="space-y-8">
                  {menuItems.map((category) => (
                    <div key={category.category}>
                      <h3 className="text-2xl font-bold mb-4 flex items-center gap-2 drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">
                        <Coffee className="h-6 w-6 text-accent" />
                        {t.homestay.cafe.categories[category.category]}
                      </h3>

                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {category.items.map((item) => (
                          <li
                            key={item.name.vi}
                            className="flex justify-between items-center p-3 rounded-lg bg-black/20 backdrop-blur-lg border border-white/10"
                          >
                            <span className="font-medium text-white/95">
                              {item.name[menuLang] ?? item.name.vi}
                            </span>
                            {item.price > 0 && (
                              <span className="text-accent font-semibold">
                                {priceFormatter.format(item.price)}₫
                                {item.unit && `/${item.unit[menuLang] ?? item.unit.vi}`}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="mt-8 p-6 rounded-lg bg-accent/20 border border-accent/30">
                  <p className="text-lg font-semibold mb-2 drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">
                    {t.homestay.cafe.specialNote}
                  </p>
                  <p className="text-white/90">
                    {t.homestay.cafe.specialNoteDesc}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Amenities ===== */}
        <section className="py-16 bg-transparent border-y border-white/10">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                {t.homestay.amenities.title}
              </h2>
              <p className="text-white/85">{t.homestay.amenities.subtitle}</p>
            </div>

            <div className="max-w-[1500px] mx-auto">
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2">
                {amenities.map((amenityKey) => {
                  const Icon = getAmenityIcon(amenityKey);

                  return (
                    <Card
                      key={amenityKey}
                      className="
                        text-center rounded-xl
                        bg-black/30 backdrop-blur-lg border border-white/10 text-white shadow-xl
                        min-h-[84px] sm:min-h-[92px]
                      "
                    >
                      <CardContent className="h-full px-1.5 py-2 flex flex-col items-center justify-center">
                        <Icon className="h-8 w-8 sm:h-9 sm:w-9 mb-1.5 text-accent" />
                        <p className="font-medium text-sm sm:text-base leading-snug text-white/90 mx-auto">
                          {t.homestay.amenities.list[amenityKey]}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ===== Location & Experience ===== */}
        <section className="py-16 bg-transparent border-b border-white/10">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
              <Card className="p-0 overflow-hidden bg-transparent border-none shadow-none">
                <Image
                  src="/homestay/signage.png"
                  alt="Location"
                  width={1000}
                  height={800}
                  className="w-full h-full object-cover"
                />
              </Card>

              <Card className="flex flex-col justify-center bg-black/30 backdrop-blur-lg border border-white/10 text-white rounded-2xl shadow-xl">
                <CardContent className="p-8">
                  <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-6 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                    {locText.title}
                  </h2>
                  <p className="text-white/90 mb-6 leading-relaxed">
                    {locText.description}
                  </p>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-6 w-6 text-accent shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold text-white/95">
                          {locText.addressLabel}
                        </p>
                        <p className="text-sm text-white/80">
                          {locationInfo.address}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Car className="h-6 w-6 text-accent shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold text-white/95">
                          {locText.fromHanoi}
                        </p>
                        <p className="text-sm text-white/80">
                          {locationInfo.distanceFromHanoi} -{" "}
                          {locationInfo.travelTime}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Home className="h-6 w-6 text-accent shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold mb-2 text-white/95">
                          {locText.nearby}
                        </p>
                        <ul className="space-y-1 text-white/85">
                          {locText.nearbyList.map((line: string, i: number) => (
                            <li key={i} className="text-sm">
                              • {line}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* ===== CTA ===== */}
        <section className="py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
              {t.homestay.cta.title}
            </h2>

            <p className="text-xl mb-8 max-w-2xl mx-auto text-white/90 leading-relaxed drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]">
              {t.homestay.cta.subtitle}
            </p>

            <div className="flex flex-wrap gap-4 justify-center">
              <Button
                size="lg"
                className="bg-accent hover:bg-accent/90 text-white"
                asChild
              >
                <a href={`tel:${locationInfo.phone}`}>
                  <Phone className="mr-2 h-5 w-5" />
                  {t.homestay.callNow}
                </a>
              </Button>

              {/* Nút "Đặt phòng online" tạm ẩn — chưa triển khai đặt phòng
                  homestay online. Khi nào có tính năng thì mở lại:
              <Button
                size="lg"
                variant="outline"
                className="border-white/60 text-white hover:bg-white/20 bg-transparent"
                asChild
              >
                <Link href="/booking">{t.homestay.cta.bookOnline}</Link>
              </Button>
              */}
            </div>
          </div>
        </section>
      </div>

      <GoogleReviewBadge />
    </div>
  );
}