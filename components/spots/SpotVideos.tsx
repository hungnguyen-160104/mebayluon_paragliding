"use client";

// components/spots/SpotVideos.tsx
// Video toàn cảnh của điểm bay, đặt ngay trên mục "Khoảnh khắc tại đây".
//
// Cố ý KHÔNG tự phát: chỉ hiện ảnh chờ (một khung hình cắt từ chính video) và
// nút play; bấm rồi mới tải file. Hai video cộng lại cả chục MB, để autoplay
// thì mọi khách vào trang đều tốn ngần ấy băng thông Vercel dù không xem.
//
// Nguồn là một video quay dọc và một video quay ngang nên hai ô từng cao thấp
// lệch hẳn nhau. Xử lý ngay từ lúc nén: cả hai cắt về khung VUÔNG canh giữa
// (1080x1080), nên ở đây chỉ cần một khung vuông duy nhất — hai ô bằng chằn
// chặn, không viền.
//
// Ảnh chờ dùng object-COVER để luôn lấp kín ô vuông, không chừa rìa — poster
// hiện tại vốn đã vuông nên không cắt gì, nhưng nếu sau này có video không
// vuông thì thumbnail vẫn kín khung.
// Còn lúc phát thì dùng object-contain + nền poster làm mờ, để video không
// vuông vẫn hiện đủ hình chứ không bị cắt cụt.

import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import { Play } from "lucide-react";

import { getSpotVideos, SPOT_VIDEO_I18N } from "@/lib/spot-videos";

type Lang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

export default function SpotVideos({
  slug,
  lang,
}: {
  slug?: string | null;
  lang: Lang;
}) {
  const videos = getSpotVideos(slug);
  const [playing, setPlaying] = useState<string | null>(null);

  if (videos.length === 0) return null;

  const L = SPOT_VIDEO_I18N[lang] ?? SPOT_VIDEO_I18N.vi;

  return (
    <section className="relative z-10 py-8">
      <div className="container mx-auto max-w-6xl px-4">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8 text-center font-serif text-3xl font-bold text-white md:text-4xl"
        >
          {L.sectionTitle}
        </motion.h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {videos.map((video, index) => {
            const title = L[video.kind];
            const isPlaying = playing === video.src;

            return (
              <motion.div
                key={video.src}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative mx-auto aspect-square w-full max-w-[480px] overflow-hidden rounded-2xl border border-white/20 bg-black shadow-xl"
              >
                {/* Nền lấp chỗ thừa: chính ảnh poster phóng to và làm mờ, thay
                    cho hai dải đen thẳng đuột. */}
                <Image
                  src={video.poster}
                  alt=""
                  aria-hidden
                  fill
                  sizes="480px"
                  className="scale-125 object-cover blur-2xl saturate-150"
                />
                <span className="absolute inset-0 bg-black/35" />

                {isPlaying ? (
                  <video
                    src={video.src}
                    poster={video.poster}
                    controls
                    autoPlay
                    playsInline
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setPlaying(video.src)}
                    aria-label={`${L.play}: ${title}`}
                    className="group absolute inset-0 h-full w-full"
                  >
                    <Image
                      src={video.poster}
                      alt={title}
                      fill
                      sizes="(min-width: 768px) 480px, 100vw"
                      className="object-cover"
                    />

                    <span className="absolute inset-0 transition-colors group-hover:bg-black/10" />

                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-accent shadow-2xl transition-transform group-hover:scale-110">
                        <Play size={28} className="ml-1 fill-current" />
                      </span>
                    </span>
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
