"use client";

import Image from "next/image";
import Link from "next/link";
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
  Mountain,
  Star,
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
  locationInfo,
  locationTranslations,
} from "@/lib/homestay-data";

/* ================= Helpers ================= */
const getAmenityIcon = (amenity: AmenityKey) => {
  const icons: Partial<Record<AmenityKey, React.ElementType>> = {
    "free-wifi": Wifi,
    "free-parking": Car,
    "bbq-area": Utensils,
    karaoke: Music,
    campfire: Flame,
    "swimming-pool": Waves,
    "team-building-space": Users,
    "trekking-tours": Mountain,
  };
  return icons[amenity] ?? Home;
};

// Intro card keys are limited -> TS knows exactly what we index
type IntroTitleKey = "location" | "traditional" | "cafe";
type IntroDescKey = "traditionalDesc" | "cafeDesc";

/* =============== Google Review Floating Badge =============== */
const GOOGLE_REVIEW_URL =
  "https://www.google.com/maps/place/Clubhouse+Mebayluon+Paragliding/@21.7764187,104.2636752,1008m/data=!3m1!1e3!4m11!3m10!1s0x3132d86a65a88495:0x69a2a48b9f14bb71!5m2!4m1!1i2!8m2!3d21.7764187!4d104.2636752!9m1!1b1!16s%2Fg%2F11dxdh48gt!17m2!4m1!1e3!18m1!1e1?entry=ttu";

type Lang = "vi" | "en" | "fr" | "ru";

function formatRating(rating: number, langKey: Lang) {
  const locale =
    langKey === "vi" ? "vi-VN" : langKey === "fr" ? "fr-FR" : langKey === "ru" ? "ru-RU" : "en-US";
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(
    rating
  );
}

function GoogleReviewBadge() {
  const { language } = useLanguage();
  const langKey = ((language ?? "vi").toString().slice(0, 2).toLowerCase() as Lang);

  // Số liệu thực tế bạn cung cấp
  const rating = 4.6;
  const reviewsCount = 93;

  const i18n: Record<Lang, { reviews: string; open: string; onGoogle: string }> = {
    vi: { reviews: "đánh giá", open: "Xem", onGoogle: "trên Google" },
    en: { reviews: "reviews", open: "Open", onGoogle: "on Google" },
    fr: { reviews: "avis", open: "Voir", onGoogle: "sur Google" },
    ru: { reviews: "отзывов", open: "Открыть", onGoogle: "в Google" },
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
        {/* Logo Google */}
        <span className="relative inline-flex items-center justify-center w-6 h-6 rounded-sm overflow-hidden">
          <Image src="/logo_gg.png" alt="Google" width={24} height={24} />
        </span>

        {/* Rating + stars (with partial fill) */}
        <div className="flex items-center gap-1">
          <span className="font-semibold">{formatRating(rating, langKey)}</span>

          <div className="relative h-4">
            {/* Empty row */}
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={`e-${i}`} className="w-4 h-4 text-neutral-300" strokeWidth={1.5} />
              ))}
            </div>
            {/* Filled row clipped by rating */}
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

        {/* Count */}
        <div className="flex items-center gap-1 text-sm text-neutral-700">
          <span className="mx-1 w-px h-4 bg-neutral-300" />
          <span className="font-medium">{reviewsCount}</span>
          <span className="font-semibold">{text.reviews}</span>
        </div>

        {/* CTA nhỏ */}
        <span className="ml-2 text-xs md:text-sm text-blue-600 underline decoration-from-font">
          {text.open} {text.onGoogle}
        </span>
      </a>
    </div>
  );
}

/* ================= Page ================= */
export default function HomestayPage() {
  const { t, language } = useLanguage();
  const currentLocale = language === "en" ? "en-US" : "vi-VN";
  const priceFormatter = useMemo(
    () => new Intl.NumberFormat(currentLocale, { style: "decimal" }),
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
    <div
      className="min-h-screen pt-20 relative bg-cover bg-center bg-fixed antialiased"
      style={{ backgroundImage: "url(/contact.jpg)" }}
    >
      <div className="absolute inset-0 bg-black/30 z-0" />

      <div className="relative z-10 text-white">
        {/* ===== Introduction ===== */}
        <section className="py-16 bg-transparent">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-6 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                {t.homestay.intro.title}
              </h2>
              <p className="text-base md:text-lg text-white/90 leading-relaxed md:leading-8 mb-8 drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]">
                {t.homestay.intro.description}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {introCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <Card
                      key={card.titleKey}
                      className="rounded-2xl bg-black/20 backdrop-blur-lg border border-white/10 text-white shadow-xl hover:shadow-2xl transition-shadow"
                    >
                      <CardContent className="pt-6 pb-6 text-center space-y-2">
                        <Icon className="h-12 w-12 mx-auto mb-2 text-accent" />
                        <h3 className="font-semibold text-white/95 drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">
                          {t.homestay.intro[card.titleKey]}
                        </h3>
                        <p className="text-sm text-white/80">
                          {card.desc ?? (card.descKey ? t.homestay.intro[card.descKey] : "")}
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
        <section id="rooms" className="py-16 bg-transparent border-y border-white/10">
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

                  <CardContent className="p-6 flex flex-col flex-grow">
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

                    <p className="text-sm text-white/85 mb-4 flex-grow leading-relaxed">
                      {t.homestay.rooms[room.nameKey].description}
                    </p>

                    <div className="flex items-center gap-2 mb-4">
                      <Users className="h-4 w-4 text-white/70" />
                      <span className="text-sm text-white/90">
                        {t.homestay.rooms.capacity}: {room.capacity.adults} {t.homestay.rooms.adults}
                        {typeof room.capacity.children === "number" &&
                          room.capacity.children > 0 &&
                          ` + ${room.capacity.children} ${t.homestay.rooms.children}`}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {room.features.map((feature: RoomFeatureKey) => (
                        <Badge key={feature} variant="secondary" className="bg-white/15 text-white border-none">
                          {t.homestay.features[feature]}
                        </Badge>
                      ))}
                    </div>

                    <Button className="w-full mt-auto bg-accent hover:bg-accent/90" asChild>
                      <a href={`tel:${locationInfo.phone}`}>{t.homestay.rooms.bookNow}</a>
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
                        <Coffee className="h-6 w-6 text-accent" /> {t.homestay.cafe.categories[category.category]}
                      </h3>

                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {category.items.map((item) => (
                          <li
                            key={item.name}
                            className="flex justify-between items-center p-3 rounded-lg bg-black/20 backdrop-blur-lg border border-white/10"
                          >
                            <span className="font-medium text-white/95">{item.name}</span>
                            {item.price > 0 && (
                              <span className="text-accent font-semibold">
                                {priceFormatter.format(item.price)}₫{item.unit && `/${item.unit}`}
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
                  <p className="text-white/90">{t.homestay.cafe.specialNoteDesc}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Amenities ===== */}
        <section className="py-16 bg-transparent border-y border-white/10">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                {t.homestay.amenities.title}
              </h2>
              <p className="text-white/85">{t.homestay.amenities.subtitle}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {amenities.map((amenityKey) => {
                const Icon = getAmenityIcon(amenityKey);
                return (
                  <Card
                    key={amenityKey}
                    className="text-center rounded-2xl bg-black/30 backdrop-blur-lg border border-white/10 text-white shadow-xl"
                  >
                    <CardContent className="pt-6 pb-6">
                      <Icon className="h-10 w-10 mx-auto mb-3 text-accent" />
                      <p className="font-medium text-sm text-white/90">
                        {t.homestay.amenities.list[amenityKey]}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
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
                  <p className="text-white/90 mb-6 leading-relaxed">{locText.description}</p>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-6 w-6 text-accent flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold text-white/95">{locText.addressLabel}</p>
                        <p className="text-sm text-white/80">{locationInfo.address}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Car className="h-6 w-6 text-accent flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold text-white/95">{locText.fromHanoi}</p>
                        <p className="text-sm text-white/80">
                          {locationInfo.distanceFromHanoi} - {locationInfo.travelTime}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Mountain className="h-6 w-6 text-accent flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold mb-2 text-white/95">{locText.nearby}</p>
                        <ul className="space-y-1 text-white/85">
                          {locText.nearbyList.map((line: string, i: number) => (
                            <li key={i} className="text-sm">• {line}</li>
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
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-white" asChild>
                <a href={`tel:${locationInfo.phone}`}>
                  <Phone className="mr-2 h-5 w-5" /> {t.homestay.callNow}
                </a>
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="border-white/60 text-white hover:bg-white/20 bg-transparent"
                asChild
              >
                <Link href="/booking">{t.homestay.cta.bookOnline}</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>

      {/* ===== Google Review Badge (always visible) ===== */}
      <GoogleReviewBadge />
    </div>
  );
}
