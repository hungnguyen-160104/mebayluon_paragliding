"use client";

import { useState, useEffect, useMemo } from "react";
import { listProductsByCategory } from "@/lib/product-api";
import ProductCard from "./components/ProductCard";
import type { Post, StoreCategory } from "@/types/frontend/post";
import { Loader2 } from "lucide-react";
import clsx from "clsx";

import {
  getStoreTexts,
  STORE_CATEGORY_KEYS_EXCEPT_ALL,
  type StoreLang,
} from "@/lib/store-texts";

import { useLanguage } from "@/contexts/language-context";

function toStoreLang(v: unknown): StoreLang {
  const s = String(v ?? "vi").toLowerCase();
  const code = s.slice(0, 2);
  if (code === "vi" || code === "en" || code === "fr" || code === "ru" || code === "zh" || code === "hi") {
    return code;
  }
  return "vi";
}

export default function StoreHomePage() {
  const { language } = useLanguage(); // ✅ lấy ngôn ngữ hiện tại từ context
  const lang = toStoreLang(language);

  const ui = useMemo(() => getStoreTexts(lang), [lang]);

  const [active, setActive] = useState<StoreCategory | "all">("all");
  const [products, setProducts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchProducts(category: StoreCategory | "all") {
    setLoading(true);
    try {
      if (category === "all") {
        const results = await Promise.all(
          STORE_CATEGORY_KEYS_EXCEPT_ALL.map((cat) =>
            listProductsByCategory({ category: cat })
          )
        );
        setProducts(results.flatMap((r) => r.items));
      } else {
        const res = await listProductsByCategory({ category });
        setProducts(res.items);
      }
    } catch (err) {
      console.error("Error loading products:", err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts("all");
  }, []);

  return (
    <main
      className="min-h-screen relative bg-cover bg-center"
      style={{ backgroundImage: "url(/hinh-nen.jpg)" }}
    >
      <div className="absolute inset-0 bg-black/20" />
      <section className="relative z-10 py-24">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white text-center mb-10">
            {ui.title}
          </h1>

          <div className="w-fit mx-auto flex flex-wrap justify-center gap-3 bg-white/10 backdrop-blur-md border border-white/30 shadow-lg rounded-2xl px-6 py-3 mb-12">
            {ui.categories.map((c) => (
              <button
                key={c.key}
                onClick={() => {
                  setActive(c.key as any);
                  fetchProducts(c.key as any);
                }}
                className={clsx(
                  "px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                  active === c.key
                    ? "bg-white/70 text-black shadow-md"
                    : "text-white hover:bg-white/10"
                )}
              >
                {c.title}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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