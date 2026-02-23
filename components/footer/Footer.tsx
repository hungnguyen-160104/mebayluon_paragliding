"use client";

// /components/footer/Footer.tsx
import Link from "next/link";
import { Facebook, Youtube, Phone, Mail, MapPin, Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type FixedKey =
  | "hoa-binh"
  | "ha-noi"
  | "mu-cang-chai"
  | "yen-bai"
  | "da-nang"
  | "sapa";

export const FIXED_SPOTS: { key: FixedKey; name: string }[] = [
  { key: "hoa-binh", name: "Viên Nam - Hòa Bình" },
  { key: "ha-noi", name: "Đồi Bù - Chương Mỹ - Hà Nội" },
  { key: "mu-cang-chai", name: "Khau phạ - Tú Lệ - Lào Cai" },
  { key: "yen-bai", name: "Trạm Tấu - Lào Cai" },
  { key: "da-nang", name: "Sơn Trà - Đà Nẵng" },
  { key: "sapa", name: "Sapa - Lào Cai" },
];

export default function Footer() {
  const [showAdmin, setShowAdmin] = useState(false);

  // mobile long-press timer
  const holdTimerRef = useRef<number | null>(null);

  // desktop "rê chuột để click" => delay hide
  const hideTimerRef = useRef<number | null>(null);

  const clearHideTimer = () => {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
  };

  const scheduleHide = (ms = 500) => {
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => setShowAdmin(false), ms);
  };

  // long-press vào © để hiện
  const startHold = () => {
    holdTimerRef.current = window.setTimeout(() => setShowAdmin(true), 700);
  };

  const cancelHold = () => {
    if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
  };

  // auto-hide sau 10s khi đã hiện (nhất là trên mobile)
  useEffect(() => {
    if (!showAdmin) return;
    const t = window.setTimeout(() => setShowAdmin(false), 10_000);
    return () => window.clearTimeout(t);
  }, [showAdmin]);

  return (
    <div className="w-full px-4 pb-4">
      <footer
        className="
          w-full max-w-7xl mx-auto rounded-3xl
          bg-slate-800/50 backdrop-blur-xl border border-white/20
        "
      >
        <div className="relative px-6 md:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* BRAND */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold bg-linear-to-r from-orange-400 via-red-400 to-orange-300 bg-clip-text text-transparent">
                Mebayluon Paragliding
              </h2>
              <p className="text-sm text-slate-300">
                Experience the best paragliding in Vietnam
              </p>
            </div>

            {/* QUICK LINKS */}
            <div>
              <h3 className="font-semibold text-white mb-4">Quick Links</h3>
              <ul className="space-y-2">
                {[
                  { href: "/pilots", label: "Pilots" },
                  { href: "/booking", label: "Book Tour" },
                  { href: "/pre-notice", label: "Pre-Notice" },
                ].map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-slate-300 hover:text-white hover:underline underline-offset-4 transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* CONTACT + ĐIỂM BAY */}
            <div>
              <h3 className="font-semibold text-white mb-4">Contact</h3>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-center gap-2">
                  <Phone size={16} />
                  <span>0964 073 555</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail size={16} />
                  <span>mebayluon@gmail.com</span>
                </li>
              </ul>

              <ul className="space-y-2 mt-3 text-sm text-slate-300">
                {FIXED_SPOTS.map((s) => (
                  <li key={s.key} className="flex items-center gap-2">
                    <MapPin size={16} />
                    <Link
                      href={`/fixed/${s.key}`}
                      className="hover:text-white hover:underline underline-offset-4 transition-colors"
                    >
                      {s.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* SOCIAL */}
            <div>
              <h3 className="font-semibold text-white mb-4">Follow Us</h3>
              <div className="flex gap-5">
                <a
                  href="https://www.facebook.com/mebayluon"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="text-slate-300 hover:text-white transition-colors"
                >
                  <Facebook size={22} />
                </a>
                <a
                  href="https://www.youtube.com/@dangvm"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className="text-slate-300 hover:text-white transition-colors"
                >
                  <Youtube size={22} />
                </a>
              </div>
            </div>
          </div>

          {/* COPYRIGHT: ✅ chỉ tương tác ở đây */}
          <div className="mt-12 pt-6 border-t border-white/15 text-center text-sm text-slate-400">
            <p className="inline-flex items-center gap-2 select-none">
              {/* ✅ hover/long-press đúng vào cụm © */}
              <span
                className="inline-flex items-center gap-2"
                onMouseEnter={() => {
                  clearHideTimer();
                  setShowAdmin(true);
                }}
                onMouseLeave={() => scheduleHide(400)}
                onTouchStart={startHold}
                onTouchEnd={cancelHold}
                onTouchCancel={cancelHold}
                title="(Admin) Hold"
              >
                &copy; {new Date().getFullYear()}{" "}
                <span className="font-medium text-slate-200">Mebayluon Paragliding</span>. All rights
                reserved.
              </span>
            </p>
          </div>

          {/* ADMIN BUTTON: fixed bottom-left */}
          {showAdmin && (
            <div
              className="fixed left-4 bottom-4 z-[9999]"
              onMouseEnter={() => clearHideTimer()}
              onMouseLeave={() => scheduleHide(400)}
            >
              <Link
                href="/admin/login"
                className="
                  inline-flex items-center gap-2
                  rounded-full px-3 py-2
                  bg-black/60 backdrop-blur-md border border-white/20
                  text-white/90 hover:text-white
                  shadow-lg
                "
                aria-label="Admin login"
              >
                <Lock className="h-4 w-4" />
                <span className="text-sm font-medium">Admin</span>
              </Link>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}