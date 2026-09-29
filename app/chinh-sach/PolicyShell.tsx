// app/chinh-sach/PolicyShell.tsx
/**
 * Khung chung của các trang chính sách: ảnh nền + thanh menu + tấm nội dung
 * nền tối + footer (footer có khối thông tin pháp nhân và logo Bộ Công Thương).
 *
 * Server component — nội dung là HTML tĩnh ta tự viết ở lib/policies, không
 * chứa dữ liệu người dùng nên dùng dangerouslySetInnerHTML như trang /terms.
 */
import type { ReactNode } from "react";

import { Footer } from "@/components/footer";
import { Navigation } from "@/components/navigation";
import { PageBackground } from "@/components/page-background";

export function PolicyShell({
  title,
  updatedLabel,
  html,
  children,
}: {
  title: string;
  /** Dòng "Cập nhật lần cuối: …" dưới tiêu đề. */
  updatedLabel?: string;
  html?: string;
  children?: ReactNode;
}) {
  return (
    <main className="relative min-h-screen text-white">
      <PageBackground src="/hinh-nen.jpg" />
      <div className="fixed inset-0 -z-10 bg-black/60" />
      <div className="relative z-20">
        <Navigation />
      </div>

      <div className="relative z-10 mx-auto w-[min(960px,94vw)] pb-10 pt-24 md:pt-28">
        <article className="rounded-3xl border border-white/20 bg-slate-900/80 p-5 shadow-2xl backdrop-blur-xl md:p-8">
          <h1 className="text-2xl font-extrabold leading-tight md:text-3xl">{title}</h1>
          {updatedLabel ? (
            <p className="mt-2 text-sm italic text-slate-300">{updatedLabel}</p>
          ) : null}

          {html ? (
            <div
              className="
                prose prose-invert mt-6 max-w-none
                prose-headings:text-white prose-h2:mt-8 prose-h2:text-xl
                prose-p:leading-7 prose-li:my-1 prose-a:text-sky-300
                prose-strong:text-white
              "
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : null}

          {children}
        </article>
      </div>

      <div className="relative z-10">
        <Footer />
      </div>
    </main>
  );
}
