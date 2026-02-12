"use client";

import { useState, useEffect } from "react";
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

// ====== HÀM CHUẨN HOÁ & BẮT NGÔN NGỮ HIỆN TẠI ======
function normalizeLang(value: string | null | undefined): StoreLang | null {
  if (!value) return null;
  const v = value.toLowerCase();

  if (v.startsWith("vi")) return "vi";
  if (v.startsWith("en")) return "en";
  if (v.startsWith("fr")) return "fr";
  if (v.startsWith("ru")) return "ru";

  return null;
}

function detectLang(): StoreLang {
  // 1. localStorage: tìm bất kỳ value nào = vi/en/fr/ru
  if (typeof window !== "undefined" && "localStorage" in window) {
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (!key) continue;
        const val = window.localStorage.getItem(key);
        const norm = normalizeLang(val);
        if (norm) return norm;
      }
    } catch {
      // ignore
    }
  }

  // 2. Cookie: lang / language / locale / i18nextLng / NEXT_LOCALE ...
  if (typeof document !== "undefined") {
    const cookieMatch = document.cookie.match(
      /(?:lang|language|locale|i18nextLng|NEXT_LOCALE|pll_language|trp_language|wp-wpml_current_language)=([^;]+)/i
    );
    const cookieLang = normalizeLang(cookieMatch?.[1]);
    if (cookieLang) return cookieLang;
  }

  // 3. navigator.language (trình duyệt)
  if (typeof navigator !== "undefined") {
    const navLang = normalizeLang(navigator.language);
    if (navLang) return navLang;
  }

  // 4. <html lang="xx">
  if (typeof document !== "undefined") {
    const htmlLang = normalizeLang(document.documentElement.lang);
    if (htmlLang) return htmlLang;
  }

  // 5. URL: /fr/... hoặc ?lang=fr
  if (typeof window !== "undefined") {
    const { pathname, search } = window.location;

    const segments = pathname.split("/").filter(Boolean);
    const firstSeg = normalizeLang(segments[0]);
    if (firstSeg) return firstSeg;

    const params = new URLSearchParams(search);
    const qpLang =
      normalizeLang(params.get("lang")) ||
      normalizeLang(params.get("locale"));
    if (qpLang) return qpLang;
  }

  // fallback
  return "vi";
}
// ==============================================

export default function StoreHomePage() {
  const [active, setActive] = useState<StoreCategory | "all">("all");
  const [products, setProducts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<StoreLang>("vi");

  // Lấy ngôn ngữ thực tế khi client mount (sau hydration → không gây lỗi)
  useEffect(() => {
    const detected = detectLang();
    setLang(detected);
    if (typeof window !== "undefined") {
      console.log("Store page lang =", detected);
    }
  }, []);

  const ui = getStoreTexts(lang);

  async function fetchProducts(category: StoreCategory | "all") {
    setLoading(true);
    try {
      if (category === "all") {
        const results = await Promise.all(
          STORE_CATEGORY_KEYS_EXCEPT_ALL.map((cat) =>
            listProductsByCategory({ category: cat })
          )
        );

        const merged = results.flatMap((result) => result.items);
        setProducts(merged);
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

          {/* Thanh menu ngang glassmorphism */}
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

          {/* Danh sách sản phẩm */}
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
