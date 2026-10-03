"use client";

/**
 * Camera theo ĐIỂM trên /baobay (03/10/2026): Viên Nam có hai máy (bãi cất 850
 * và bãi hạ cánh), Khau Phạ có một máy HAI MẮT (kênh 0 toàn cảnh, kênh 1) → các
 * nút nhỏ chuyển qua lại, mỗi lúc chỉ MỘT CameraGallery (một ảnh, một lượt gọi
 * API) — nhẹ ở màn 390px. Còn một camera thì hiện thẳng, không có nút.
 *
 * Camera đánh dấu `hideWhenEmpty` (mắt 2 Khau Phạ) chỉ hiện khi đã có ít nhất
 * một ảnh — máy chỉ báo một kênh thì tab tự ẩn, không hiện lỗi.
 */
import { useEffect, useState } from "react";

import CameraGallery from "@/components/baobay/CameraGallery";
import { useLanguage } from "@/contexts/language-context";
import { CAMERAS, WEBCAM_SITES, type CamFeed, type CamId, type WebcamSite } from "@/lib/imou/cameras";

const SHORT: Partial<Record<CamId, { vi: string; en: string }>> = {
  "vien-nam": { vi: "Bãi cất 850", en: "Launch 850 m" },
  "vien-nam-bhc": { vi: "Bãi hạ cánh", en: "Landing field" },
  "khau-pha": { vi: "Mắt 1 – toàn cảnh", en: "Lens 1 – wide view" },
  "khau-pha-2": { vi: "Mắt 2", en: "Lens 2" },
};

/**
 * Lọc camera `hideWhenEmpty` chưa có ảnh nào. Trong lúc chưa biết thì CHƯA hiện
 * (tránh tab hiện rồi biến mất); camera thường luôn giữ.
 */
export function useVisibleCams(cams: readonly CamId[]): CamId[] {
  const optional = cams.filter((c) => CAMERAS[c].hideWhenEmpty);
  const key = optional.join(",");
  const [has, setHas] = useState<Partial<Record<CamId, boolean>>>({});
  useEffect(() => {
    if (!key) return;
    let alive = true;
    for (const c of key.split(",") as CamId[]) {
      fetch(`/api/camera/${c}`, { cache: "no-store" })
        .then((r) => (r.ok ? (r.json() as Promise<CamFeed>) : null))
        .then((f) => alive && setHas((h) => ({ ...h, [c]: Boolean(f?.latest) })))
        .catch(() => alive && setHas((h) => ({ ...h, [c]: false })));
    }
    return () => {
      alive = false;
    };
  }, [key]);
  return cams.filter((c) => !CAMERAS[c].hideWhenEmpty || has[c] === true);
}

/** Một khung camera phụ cho trang /webcam: chưa có ảnh nào thì không hiện gì. */
export function OptionalCameraGallery({ cam, title }: { cam: CamId; title?: React.ReactNode }) {
  const visible = useVisibleCams([cam]);
  if (!visible.length) return null;
  return (
    <div>
      {title}
      <CameraGallery cam={cam} />
    </div>
  );
}

export default function CameraSwitcher({ site }: { site: WebcamSite }) {
  const { language } = useLanguage();
  const cams = useVisibleCams(WEBCAM_SITES[site]);
  const [picked, setPicked] = useState<CamId>(cams[0]);
  // Tab đang chọn bị ẩn (hiếm) → quay về camera đầu
  const cam = cams.includes(picked) ? picked : cams[0];
  if (cams.length < 2) return <CameraGallery cam={cams[0]} />;
  return (
    <div>
      <div className="mt-3 flex flex-wrap gap-1.5" role="tablist">
        {cams.map((c) => {
          const label = SHORT[c] ? (language === "vi" ? SHORT[c].vi : SHORT[c].en) : c;
          return (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={cam === c}
              onClick={() => setPicked(c)}
              className={`h-8 rounded-lg border px-3 text-xs font-bold ${
                cam === c ? "border-amber-400/70 bg-amber-400/20 text-amber-100" : "border-white/20 bg-white/[0.06] text-white/70"
              }`}
            >
              📷 {label}
            </button>
          );
        })}
      </div>
      <CameraGallery key={cam} cam={cam} />
    </div>
  );
}
