"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import React, { useEffect, useState, useCallback } from "react";
import { Menu, X } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLanguage } from "@/contexts/language-context";
import { AnimatePresence, motion } from "framer-motion";

type PathItem = { type: "path"; href: string; label: string };
type HashItem = { type: "hash"; href: string; hashId: string; label: string };
type NavItem = PathItem | HashItem;

/**
 * Bảng màu riêng cho từng phím — dải màu thiên nhiên trời/biển/rừng/nắng cùng
 * độ bão hoà để hài hoà với nhau và với tông xanh + cam của thương hiệu.
 * Dùng chung cho cả thanh ngang desktop lẫn menu xổ trên điện thoại.
 */
const NAV_COLORS: Record<string, { normal: string; active: string }> = {
  "/":         { normal: "bg-[#0EA5E9] hover:bg-[#0284C7]", active: "bg-[#0369A1]" }, // Trang chủ — xanh da trời
  "/booking":  { normal: "bg-[#FF5E1F] hover:bg-[#EA4E10]", active: "bg-[#C2410C]" }, // Đặt bay — cam thương hiệu (CTA)
  "/spots":    { normal: "bg-[#0D9488] hover:bg-[#0F766E]", active: "bg-[#115E59]" }, // Điểm bay — xanh ngọc
  "/pilots":   { normal: "bg-[#6366F1] hover:bg-[#4F46E5]", active: "bg-[#4338CA]" }, // Phi công — chàm
  "/homestay": { normal: "bg-[#16A34A] hover:bg-[#15803D]", active: "bg-[#166534]" }, // Homestay — xanh lá
  "/store":    { normal: "bg-[#D97706] hover:bg-[#B45309]", active: "bg-[#92400E]" }, // Cửa hàng — hổ phách
  "/blog":     { normal: "bg-[#0284C7] hover:bg-[#0369A1]", active: "bg-[#075985]" }, // Tin tức — xanh dương đậm
  "/knowledge":{ normal: "bg-[#8B5CF6] hover:bg-[#7C3AED]", active: "bg-[#6D28D9]" }, // Kiến thức — tím
};

const navColorOf = (item: NavItem) =>
  NAV_COLORS[item.type === "hash" ? `/#${item.hashId}` : item.href] ?? {
    normal: "bg-[#0194F3] hover:bg-[#0177C8]",
    active: "bg-[#0166AE]",
  };

export function Navigation() {
  const { t } = useLanguage();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [currentHash, setCurrentHash] = useState<string>("");

  /**
   * Khu báo bay nội bộ (/baocao) không có thanh menu khách.
   *
   * Thanh này là `fixed top-0` cao h-20 và được render ở app/layout.tsx cho
   * MỌI route. Phi công nhập liệu bằng điện thoại, giữ menu "Đặt bay / Điểm
   * bay" ở đó chỉ chiếm chỗ và dễ bấm nhầm ra trang khách giữa lúc nhập.
   * Khu /admin thì vẫn giữ (đã tự chừa pt-20 từ trước).
   *
   * Đặt SAU các hook: gọi hook có điều kiện là vi phạm quy tắc hook của React.
   */
  const isInternalTool = pathname?.startsWith("/baocao") ?? false;

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

  // ✅ Tránh hydration mismatch: chỉ đọc hash sau khi mount
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

  const navItems: NavItem[] = [
    // Trỏ thẳng "/" chứ không phải "/#hero": mọi trang đều link về trang chủ
    // kèm fragment thì tín hiệu nội bộ về trang chủ bị loãng. Bỏ fragment cũng
    // làm mục "Trang chủ" sáng đúng khi đang ở trang chủ (trước phải bấm vào
    // mới sáng vì điều kiện dựa trên hash).
    { type: "path", href: "/", label: t?.nav?.home ?? "Trang chủ" },
    { type: "path", href: "/booking", label: t?.nav?.booking ?? "Đặt bay" },
    { type: "path", href: "/spots", label: t?.nav?.spots ?? "Điểm bay" },
    { type: "path", href: "/ppg", label: t?.nav?.ppg ?? "Dù máy (PPG)" },
    { type: "path", href: "/pilots", label: t?.nav?.pilots ?? "Phi công" },
    { type: "path", href: "/homestay", label: t?.nav?.homestay ?? "Homestay & Cà phê" },
    { type: "path", href: "/store", label: t?.nav?.store ?? "Cửa hàng" },
    { type: "path", href: "/blog", label: t?.nav?.blog ?? "Tin tức" },
    { type: "path", href: "/knowledge", label: t?.nav?.knowledge ?? "Kiến thức dù lượn – Học bay" },
  ];

  const strongShadow = "0 2px 8px rgba(0,0,0,.7)";
  const subtleShadow = "0 1px 4px rgba(0,0,0,.5)";

  const navClasses = `
    fixed top-0 left-0 right-0 z-50 transition-all duration-300
    ${
      isScrolled
        ? "bg-white/80 backdrop-blur-lg shadow-md border-b border-[#DCE7F3]"
        : "bg-transparent border-b border-transparent"
    }
  `;

  const isItemActive = (item: NavItem) => {
    if (item.type === "path") return pathname === item.href;
    if (item.type === "hash") return pathname === "/" && currentHash === `#${item.hashId}`;
    return false;
  };

  if (isInternalTool) return null;

  return (
    <>
      <nav className={navClasses} data-nav-root>
        <div className="mx-auto px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <div style={{ filter: isScrolled ? "none" : "drop-shadow(0 2px 5px rgb(0 0 0 / .6))" }}>
                <Image
                  src="/logo.png"
                  alt="Mebayluon Paragliding"
                  width={50}
                  height={50}
                  className="object-contain rounded-full"
                />
              </div>
              <div className="flex flex-col" style={{ textShadow: isScrolled ? "none" : strongShadow }}>
                <span
                  className={`text-xl font-bold tracking-wide transition-colors ${
                    isScrolled ? "text-[#1C2930]" : "text-white"
                  }`}
                >
                  MEBAYLUON
                </span>
                {/* Bỏ lặp "Mebayluon" — chỉ còn "Paragliding" kiểu chữ
                    serif nghiêng, to hơn, canh theo LỀ PHẢI của MEBAYLUON */}
                <span
                  className={`hidden sm:block -mt-0.5 text-right text-lg font-medium tracking-wide transition-colors ${
                    isScrolled ? "text-[#1C2930]" : "text-white"
                  }`}
                >
                  Paragliding
                </span>
              </div>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-2">
              {navItems
                .filter((it) => typeof (it as any)?.href === "string" && (it as any).href.length > 0)
                .map((item) => {
                  const active = isItemActive(item);
                  const color = navColorOf(item);
                  const base = active
                    ? `${color.active} text-white font-semibold shadow-md ring-2 ring-white/60`
                    : `${color.normal} text-white shadow-md`;

                  if (item.type === "hash") {
                    const href = `/#${item.hashId}`;
                    return (
                      <Link
                        key={`hash-${item.hashId}`}
                        href={href}
                        onClick={(e) => handleHashClick(e, item.hashId)}
                        className={`text-sm font-medium rounded-full px-4 py-2 transition-all duration-300 transform hover:scale-105 ${base}`}
                      >
                        {item.label}
                      </Link>
                    );
                  }

                  return (
                    <Link
                      key={`path-${item.href}`}
                      href={item.href}
                      className={`text-sm font-medium rounded-full px-4 py-2 transition-all duration-300 transform hover:scale-105 ${base}`}
                    >
                      {item.label}
                    </Link>
                  );
                })}

              <div
                className={`${isScrolled ? "text-[#1C2930]" : "text-white"}`}
                style={{ textShadow: isScrolled ? "none" : subtleShadow }}
              >
                <LanguageSwitcher />
              </div>
            </div>

            {/* Mobile toggles */}
            <div className="flex items-center gap-2 md:hidden">
              <div className={`${isScrolled ? "text-[#1C2930]" : "text-white"}`}>
                <LanguageSwitcher />
              </div>
              {/* Menu giờ là các phím rời xổ ngay dưới thanh nav nên chính nút
                  này kiêm luôn việc đóng — đổi icon cho khách biết. */}
              <button
                onClick={() => setIsOpen((s) => !s)}
                aria-label={isOpen ? "Đóng menu" : "Mở menu"}
                aria-expanded={isOpen}
                className={`relative z-100 p-2 ${isScrolled ? "text-[#1C2930]" : "text-white"}`}
                style={{ filter: isScrolled ? "none" : "drop-shadow(0 1px 2px rgb(0 0 0 / .6))" }}
              >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Menu điện thoại: các phím rời nổi trên trang, KHÔNG phủ kín nền.
          Lớp bắt chạm bên dưới trong suốt hoàn toàn — chỉ để chạm ra ngoài là
          đóng menu, không làm tối trang phía sau. */}
      <AnimatePresence>
        {isOpen && (
          <>
            <div
              key="mobile-menu-catcher"
              className="fixed inset-0 z-90 md:hidden"
              onClick={() => setIsOpen(false)}
              aria-hidden
            />
            <motion.nav
              key="mobile-menu"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              aria-label="Menu chính"
              className="fixed top-20 right-3 z-100 flex w-44 flex-col gap-2 md:hidden"
            >
              {navItems
                .filter((it) => typeof (it as any)?.href === "string" && (it as any).href.length > 0)
                .map((item, i) => {
                  const href = item.type === "hash" ? `/#${item.hashId}` : item.href;
                  const active = isItemActive(item);
                  const color = navColorOf(item);

                  return (
                    <motion.div
                      key={`${item.type}-${item.type === "hash" ? item.hashId : item.href}`}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      // Xổ lần lượt từng phím cho thấy rõ đây là các nút rời
                      transition={{ duration: 0.18, delay: i * 0.035, ease: "easeOut" }}
                    >
                      <Link
                        href={href}
                        onClick={(e) => {
                          if (item.type === "hash") handleHashClick(e, item.hashId);
                          setIsOpen(false);
                        }}
                        className={`block rounded-full px-4 py-3 text-center text-base font-semibold leading-snug text-white shadow-xl shadow-black/60 ring-1 backdrop-blur-sm transition-transform active:scale-95 ${
                          active
                            ? `${color.active} ring-white/70`
                            : `${color.normal} ring-white/25`
                        }`}
                      >
                        {item.label}
                      </Link>
                    </motion.div>
                  );
                })}
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
}