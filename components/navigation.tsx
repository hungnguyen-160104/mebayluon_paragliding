"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLanguage } from "@/contexts/language-context";
import { AnimatePresence, motion } from "framer-motion";

type PathItem = { type: "path"; href: string; label: string };
type HashItem = { type: "hash"; href: string; hashId: string; label: string };
type NavItem = PathItem | HashItem;

export function Navigation() {
  const { t } = useLanguage();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [currentHash, setCurrentHash] = useState<string>("");

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    const onResize = () => {
      if (window.innerWidth >= 768) setIsOpen(false);
    };
    onScroll();
    window.addEventListener("scroll", onScroll);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = isOpen ? "hidden" : prev || "auto";
    return () => {
      document.body.style.overflow = prev || "auto";
    };
  }, [isOpen]);

  useEffect(() => {
    const applyHash = () => setCurrentHash(window.location.hash || "");
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  const scrollToId = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const nav = document.querySelector<HTMLElement>("nav[data-nav-root]");
    const offset = (nav?.offsetHeight ?? 80) + 8;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  }, []);

  const handleHashClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      if (pathname === "/") {
        e.preventDefault();
        setIsOpen(false);
        scrollToId(id);
        history.replaceState(null, "", `#${id}`);
        setCurrentHash(`#${id}`);
      }
    },
    [pathname, scrollToId]
  );

  useEffect(() => {
    if (pathname === "/" && window.location.hash) {
      const id = window.location.hash.replace("#", "");
      setTimeout(() => scrollToId(id), 0);
    }
  }, [pathname, scrollToId]);

  // ✨ Cấu hình menu mới:
  // - Bỏ: Về chúng tôi / Điểm bay nổi bật / Chuẩn bị trước khi bay / Liên hệ
  // - Đổi "Blog" -> "Tin tức" (giữ đường dẫn /blog)
  // - Thêm: "Kiến thức dù lượn - Học bay" (/kien-thuc)
const navItems: NavItem[] = [
  { type: "hash", href: "/#hero", hashId: "hero", label: t?.nav?.home ?? "Trang chủ" },
  { type: "path", href: "/pilots", label: t?.nav?.pilots ?? "Phi công" },
  { type: "path", href: "/homestay", label: t?.nav?.homestay ?? "Homestay & Cà phê" },
  { type: "path", href: "/booking", label: t?.nav?.booking ?? "Đặt bay" },
  { type: "path", href: "/store", label: t?.nav?.store ?? "Cửa hàng" },
  { type: "path", href: "/blog", label: t?.nav?.blog ?? "Tin tức" },
  { type: "path", href: "/knowledge", label: t?.nav?.knowledge ?? "Kiến thức dù lượn – Học bay" },
];


  const strongShadow = "0 2px 8px rgba(0,0,0,.7)";
  const subtleShadow = "0 1px 4px rgba(0,0,0,.5)";

  const navClasses = `
    fixed top-0 left-0 right-0 z-50 transition-all duration-300
    ${isScrolled ? "bg-white/60 backdrop-blur-lg shadow-md border-b border-gray-200/80" : "bg-transparent border-b border-transparent"}
  `;

  const isItemActive = (item: NavItem) => {
    if (item.type === "path") return pathname === item.href;
    if (item.type === "hash") return pathname === "/" && currentHash === `#${item.hashId}`;
    return false;
  };

  return (
    <>
      <nav className={navClasses} data-nav-root>
        <div className="mx-auto px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <div style={{ filter: isScrolled ? "none" : "drop-shadow(0 2px 5px rgb(0 0 0 / .6))" }}>
                <Image src="/logo.png" alt="Mebayluon Paragliding" width={50} height={50} className="object-contain rounded-full" />
              </div>
              <div className="flex flex-col" style={{ textShadow: isScrolled ? "none" : strongShadow }}>
                <span className={`text-xl font-bold tracking-wide transition-colors ${isScrolled ? "text-gray-800" : "text-white"}`}>
                  MEBAYLUON
                </span>
                <span className={`text-xs hidden sm:block transition-colors tracking-wider ${isScrolled ? "text-gray-500" : "text-white"}`}>
                  Mebayluon paragliding
                </span>
              </div>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-2">
              {navItems.map((item) => {
                const active = isItemActive(item);
                const base =
                  isScrolled
                    ? `text-gray-700 hover:bg-gray-100 ${active ? "bg-primary/10 text-primary font-semibold" : ""}`
                    : `border border-white/40 text-white hover:bg-white/20 hover:border-white ${active ? "bg-white/20 border-white font-semibold" : ""}`;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={item.type === "hash" ? (e) => handleHashClick(e, item.hashId) : undefined}
                    className={`text-sm font-medium rounded-full px-4 py-2 transition-all duration-300 transform hover:scale-105 ${base}`}
                    style={{ textShadow: isScrolled ? "none" : subtleShadow }}
                  >
                    {item.label}
                  </Link>
                );
              })}

              <div className={`${isScrolled ? "text-gray-800" : "text-white"}`} style={{ textShadow: isScrolled ? "none" : subtleShadow }}>
                <LanguageSwitcher />
              </div>

              <Button asChild className="ml-2 hover:scale-105 transition-transform duration-300">
                <Link href="/admin/login">Đăng nhập</Link>
              </Button>
            </div>

            {/* Mobile toggles */}
            <div className="flex items-center gap-2 md:hidden">
              <div className={`${isScrolled ? "text-gray-800" : "text-white"}`}>
                <LanguageSwitcher />
              </div>
              <button
                onClick={() => setIsOpen((s) => !s)}
                aria-label="Toggle menu"
                className={`p-2 ${isScrolled ? "text-gray-800" : "text-white"}`}
                style={{ filter: isScrolled ? "none" : "drop-shadow(0 1px 2px rgb(0 0 0 / .6))" }}
              >
                <Menu size={24} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-lg md:hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/20">
              <Link href="/" onClick={() => setIsOpen(false)} className="flex items-center gap-3">
                <Image src="/logo.png" alt="Logo" width={40} height={40} className="rounded-full" />
                <div>
                  <h1 className="font-bold text-white">MEBAYLUON</h1>
                  <p className="text-xs text-slate-300">Mebayluon paragliding</p>
                </div>
              </Link>
              <button onClick={() => setIsOpen(false)} className="p-2 text-white" aria-label="Close menu">
                <X size={28} />
              </button>
            </div>

            {/* Links */}
            <nav className="mt-8 flex flex-col p-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`text-2xl py-4 transition-colors font-medium ${
                    (item.type === "path" && pathname === item.href) ||
                    (item.type === "hash" && pathname === "/" && currentHash === `#${item.hashId}`)
                      ? "text-red-400"
                      : "text-slate-100 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Login button */}
            <div className="absolute bottom-6 left-4 right-4">
              <Button asChild className="w-full bg-red-600 hover:bg-red-700 h-14 text-lg" onClick={() => setIsOpen(false)}>
                <Link href="/admin/login">Đăng nhập</Link>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
