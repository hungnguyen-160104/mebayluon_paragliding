"use client";

// components/lazy-video.tsx
import { useEffect, useRef, useState } from "react";

/**
 * Video chỉ bắt đầu tải khi người xem cuộn tới.
 *
 * Thẻ <video autoPlay> thường sẽ tải hết file ngay lúc mở trang dù nó nằm giữa
 * trang — video "Về chúng tôi" nặng 5,6 MB nên khách vào trang chủ bằng 4G tốn
 * ngần ấy dung lượng trước cả khi nhìn thấy nó. Ở đây để trống src cho tới khi
 * khối video lọt vào tầm nhìn (tính trước 300px cho kịp tải).
 */
export function LazyVideo({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (shouldLoad) return;
    const el = ref.current;
    if (!el) return;

    // Trình duyệt cũ không có IntersectionObserver thì tải luôn như trước.
    if (typeof IntersectionObserver === "undefined") {
      const id = window.setTimeout(() => setShouldLoad(true), 0);
      return () => window.clearTimeout(id);
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShouldLoad(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shouldLoad]);

  // Gán src muộn nên có máy không tự chạy theo thuộc tính autoPlay — gọi tay
  // cho chắc. Trình duyệt chặn thì bỏ qua, khung ảnh phía dưới vẫn hiển thị.
  useEffect(() => {
    if (!shouldLoad) return;
    ref.current?.play().catch(() => {});
  }, [shouldLoad]);

  return (
    <video
      ref={ref}
      src={shouldLoad ? src : undefined}
      autoPlay
      muted
      loop
      playsInline
      preload="none"
      className={className}
    />
  );
}
