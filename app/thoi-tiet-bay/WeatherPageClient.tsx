"use client";

/**
 * TRANG "THỜI TIẾT BAY" — thời tiết mọi điểm bay trên một màn hình.
 *
 * Khách đang phân vân "cuối tuần này bay ở đâu được" thì đây là trang trả lời:
 * các điểm xếp cạnh nhau, mỗi điểm một dải ngày cùng thang màu, so ngang là
 * thấy ngay nơi nào đẹp. BẤM VÀO MỘT NGÀY là xổ biểu đồ ngay tại chỗ, không
 * phải rời trang (luật chủ 11/09).
 *
 * THỨ TỰ: bảng thời tiết LÊN TRÊN, chữ nghĩa XUỐNG DƯỚI. Người mở trang này
 * đang cần một câu trả lời — mai bay được không — chứ chưa cần đọc bài; ai
 * muốn hiểu vì sao thì cuộn xuống phần khí tượng ở cuối.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import Footer from "@/components/footer/Footer";
import { PageBackground } from "@/components/page-background";
import { useLanguage } from "@/contexts/language-context";
import { getThoiTietCopy } from "@/lib/i18n/thoi-tiet";
import { WeatherSpotCard, type DiemDuBao } from "@/components/weather/SpotWeather";

export default function WeatherPageClient() {
  const { language } = useLanguage() as { language?: string };
  const lang = language ?? "vi";
  const t = useMemo(() => getThoiTietCopy(lang), [lang]);

  const [diem, setDiem] = useState<DiemDuBao[] | null>(null);
  const [loi, setLoi] = useState(false);

  useEffect(() => {
    let huy = false;
    (async () => {
      try {
        const res = await fetch("/api/thoi-tiet");
        if (!res.ok) throw new Error();
        const j = (await res.json()) as { diem: DiemDuBao[] };
        if (!huy) setDiem(j.diem);
      } catch {
        if (!huy) setLoi(true);
      }
    })();
    return () => {
      huy = true;
    };
  }, []);

  return (
    <div className="relative min-h-screen">
      {/* Cùng ảnh nền với trang /spots để hai trang liền mạch khi khách chuyển qua lại. */}
      <PageBackground src="/hinh-nen.jpg" />
      {/* Lớp phủ tối: chữ trắng trên ảnh trời mây không đủ tương phản nếu để trần. */}
      <div className="fixed inset-0 -z-10 bg-black/25" />
      <main className="relative z-10 container mx-auto max-w-5xl px-4 pb-16 pt-28">
        <h1 className="text-hero-shadow font-serif text-3xl font-bold text-white md:text-4xl">{t.pageTitle}</h1>
        <p className="text-hero-shadow-soft mt-2 text-base font-medium text-white/95">{t.pageSubtitle}</p>

        {/* Chú giải màu — đặt trên bảng vì đây là thứ phải hiểu trước khi đọc số */}
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold [&>span]:shadow-sm">
          <span className="rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-emerald-900">
            😊 {t.good}
          </span>
          <span className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-amber-900">😐 {t.fair}</span>
          <span className="rounded-lg border border-rose-300 bg-rose-50 px-2 py-1 text-rose-900" title={t.bad}>
            😞
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {loi && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 sm:col-span-2">
              ⛅ {t.error}
            </div>
          )}
          {!diem && !loi && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 sm:col-span-2">
              ⛅ {t.loading}
            </div>
          )}
          {diem?.map((d) => (
            <WeatherSpotCard key={d.slug} diem={d} lang={lang} t={t} />
          ))}
        </div>

        {diem?.length ? (
          <>
            <p className="mt-4 text-xs leading-relaxed text-white/85">{t.disclaimer}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-white/70">
              {t.source}: {diem[0].moHinh}
            </p>
          </>
        ) : null}

        <div className="mt-6">
          <Link
            href="/booking"
            className="inline-block rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-700"
          >
            {t.bookNow}
          </Link>
        </div>

        {/* ---- Phần chữ: để CUỐI trang, sau khi người đọc đã có câu trả lời ---- */}
        <div className="mt-10 space-y-2 rounded-2xl bg-black/30 p-4 text-sm leading-relaxed text-white/95 backdrop-blur-sm">
          {t.intro.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <section className="mt-4 rounded-2xl bg-black/30 p-4 text-white/95 backdrop-blur-sm">
          <h2 className="font-serif text-xl font-bold text-white">{t.khiTuongTieuDe}</h2>
          {/**
           * Hai cột từ 1024px: mỗi mục dài hai đoạn, một cột thì dòng chữ kéo
           * ngang cả màn hình rộng, mắt mỏi. Dùng CỘT CHẢY chứ không lưới —
           * lưới xếp theo hàng nên mục ngắn đứng cạnh mục dài là hở một mảng.
           */}
          <div className="mt-3 space-y-5 lg:columns-2 lg:gap-8 lg:space-y-0">
            {t.khiTuong.map((m) => (
              <article key={m.tieuDe} className="break-inside-avoid lg:mb-5">
                <h3 className="text-sm font-bold uppercase tracking-wide text-sky-200">{m.tieuDe}</h3>
                {m.y.map((doan, i) => (
                  <p key={i} className="mt-1.5 text-sm leading-relaxed text-white/90">
                    {doan}
                  </p>
                ))}
              </article>
            ))}
          </div>
        </section>
      </main>
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
