"use client";

import { useState, useMemo } from "react";
import ProductCard from "./ProductCard";
import type { Post, StoreCategory } from "@/types/frontend/post";
import clsx from "clsx";
import { getStoreTexts, type StoreLang, type StoreUiTexts } from "@/lib/store-texts";
import { useLanguage } from "@/contexts/language-context";

function toStoreLang(v: string): StoreLang {
  const code = v.toLowerCase().slice(0, 2);
  const supported: StoreLang[] = ["vi", "en", "fr", "ru", "zh", "hi"];
  return supported.includes(code as StoreLang) ? (code as StoreLang) : "vi";
}

export default function StoreHomeClient({
  allProducts,
  lang: serverLang,
}: {
  allProducts: Post[];
  lang: StoreLang;
}) {
  const { language } = useLanguage();
  const lang = toStoreLang(language) || serverLang;
  const ui: StoreUiTexts = useMemo(() => getStoreTexts(lang), [lang]);
  const [active, setActive] = useState<StoreCategory | "all">("all");

  const products = useMemo(() => {
    if (active === "all") return allProducts;
    return allProducts.filter((p) => p.storeCategory === active);
  }, [active, allProducts]);

  return (
    <main
      className="min-h-screen relative bg-cover bg-center"
      style={{ backgroundImage: "url(/cua-hang.jpg)" }}
    >
      <div className="absolute inset-0 bg-black/20" />
      <section className="relative z-10 py-24">
        <div className="container mx-auto px-4">
          <h1 className="mx-auto w-fit rounded-2xl bg-black/50 px-6 py-3 text-4xl md:text-5xl font-extrabold text-white shadow-lg mb-10">
            {ui.title}
          </h1>

          <div className="w-fit mx-auto flex flex-wrap justify-center gap-3 bg-white/10 backdrop-blur-md border border-white/30 shadow-lg rounded-2xl px-6 py-3 mb-12">
            {ui.categories.map((c) => (
              <button
                key={c.key}
                onClick={() => setActive(c.key as StoreCategory | "all")}
                className={clsx(
                  "flex min-h-12 items-center justify-center rounded-2xl border px-4 py-3 text-base font-semibold text-center leading-snug transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40",
                  active === c.key
                    ? "bg-black text-white border-white/40 shadow-lg scale-105 font-extrabold"
                    : "bg-white/15 text-white border-white/30 hover:bg-white/25 hover:-translate-y-0.5 hover:shadow-md"
                )}
              >
                {c.title}
              </button>
            ))}
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {products.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>
          ) : (
            <p className="text-center text-white text-lg mt-10">
              {ui.emptyCategory}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
