// app/terms/page.tsx
"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { TERMS_HTML, LangCode } from "@/lib/terms";
import { useLangCode } from "@/lib/booking/translations-booking";

const isLang = (v: string | null): v is LangCode =>
  v === "vi" || v === "en" || v === "fr" || v === "ru";

export default function TermsPage() {
  // Ưu tiên ?lang=; nếu không có thì theo ngôn ngữ hệ thống
  const systemLang = (useLangCode?.() as LangCode) ?? "vi";
  const sp = useSearchParams();
  const langFromQuery = sp.get("lang");
  const lang: LangCode = isLang(langFromQuery) ? langFromQuery : systemLang;

  const raw = TERMS_HTML[lang] || TERMS_HTML.vi;

  const docRef = useRef<HTMLDivElement>(null);

  // Đánh số các đoạn giới thiệu trước H2, bỏ qua đoạn mở đầu in đậm có dấu ":"
  useEffect(() => {
    const root = docRef.current;
    if (!root) return;

    // Xóa trạng thái cũ (nếu người dùng đổi lang)
    root.querySelectorAll(".doc-intro").forEach((el) => el.classList.remove("doc-intro"));

    // Xác định phần "intro": từ đầu tới trước H2 đầu tiên
    const children = Array.from(root.children) as HTMLElement[];
    let firstH2Index = children.findIndex((n) => n.tagName === "H2");
    if (firstH2Index === -1) firstH2Index = children.length;

    // Tìm các <p> trong khoảng intro
    const introPs: HTMLElement[] = [];
    for (let i = 0; i < firstH2Index; i++) {
      const el = children[i];
      if (el.tagName === "P" && el.textContent?.trim()) {
        introPs.push(el);
      }
    }

    // Nếu đoạn P đầu tiên là tiêu đề mở đầu in đậm và kết thúc bằng ":" => không đánh số
    if (introPs.length > 0) {
      const first = introPs[0];
      const hasStrong = !!first.querySelector("strong, b");
      const endsWithColon = first.textContent!.trim().endsWith(":");
      if (hasStrong && endsWithColon) {
        introPs.shift();
      }
    }

    // Áp class để CSS tạo số thứ tự 1..n
    introPs.forEach((p) => p.classList.add("doc-intro"));
  }, [lang]);

  return (
    <main
      className="min-h-screen relative bg-cover bg-center bg-fixed text-white"
      style={{ backgroundImage: "url(/hinh-nen.jpg)" }}
      aria-label="Terms & Conditions"
    >
      {/* Ẩn toàn bộ header/nav/footer & widget nổi; bỏ khoảng trắng mặc định */}
      <style jsx global>{`
        html, body, #__next { margin: 0 !important; padding: 0 !important; }
        header, footer, nav, .site-header, .main-header, .navbar, .topbar, [role="navigation"], [data-header], [data-footer] {
          display: none !important;
        }
        .fixed, .sticky,
        [style*="position:fixed"], [style*="position: sticky"],
        .social, .socials, .social-bar, .social-sidebar, .social-floating, .social-icons,
        .chatbot, .chat-bot, .chat-widget, .zalo-chat-widget, .fb_dialog,
        [id*="zalo"], [id*="fb"], [class*="zalo"], [class*="facebook"], [class*="messenger"], [class*="chat"] {
          display: none !important; visibility: hidden !important; pointer-events: none !important;
        }
        html, body { overflow: auto !important; }

        /* Bộ đếm cho phần intro (trước H2) */
        .doc-scope { counter-reset: intro; }
        .doc-scope .doc-intro {
          counter-increment: intro;
          position: relative;
          padding-left: 1.75rem;
        }
        .doc-scope .doc-intro::before {
          content: counter(intro) ".";
          position: absolute;
          left: 0;
          top: 0;
          font-weight: 700;
          opacity: 0.95;
        }
      `}</style>

      {/* Veil tối & mờ hơn để chữ rõ */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0" />

      {/* Khung glass — KHÔNG margin top/bottom */}
      <div className="relative z-10 mx-auto px-3 md:px-6 w-[min(1000px,96vw)]">
        <div className="rounded-3xl bg-white/22 backdrop-blur-2xl border border-white/25 shadow-2xl overflow-hidden">

          {/* Header nhỏ riêng của trang Terms: CÓ LOGO */}
          <div className="flex items-center gap-3 p-4 md:p-5 bg-white/10 border-b border-white/20">
            <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden ring-1 ring-white/40">
              <Image src="/logo.png" alt="Mebayluon Paragliding" fill className="object-cover" />
            </div>
            <div className="text-sm md:text-base text-white/85">
              <b>Terms &amp; Conditions</b>
            </div>
          </div>

          {/* Nội dung DOC: giữ nguyên cấu trúc/đánh số list; intro được đánh số tự động */}
          <div className="p-4 md:p-6">
            <div
              ref={docRef}
              className="doc-scope prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: raw }}
            />
          </div>
        </div>
      </div>

      {/* Style đọc rõ nhưng KHÔNG đổi cấu trúc gốc */}
      <style jsx global>{`
        .doc-scope { color: #fff; }
        .doc-scope * { color: inherit !important; }
        .doc-scope h1, .doc-scope h2, .doc-scope h3 {
          margin: 0.5rem 0 0.75rem; font-weight: 700;
        }
        .doc-scope p { margin: 0.5rem 0; line-height: 1.75; }
        .doc-scope ul, .doc-scope ol { margin: 0.5rem 0 0.75rem 1.25rem; }
        .doc-scope li { margin: 0.25rem 0; }
        .doc-scope b, .doc-scope strong { font-weight: 700; }
      `}</style>
    </main>
  );
}
