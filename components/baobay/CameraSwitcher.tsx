"use client";

/**
 * Camera theo ĐIỂM trên /baobay (03/10/2026): Viên Nam có hai máy (bãi cất 850
 * và bãi hạ cánh) → hai nút nhỏ chuyển qua lại, mỗi lúc chỉ MỘT CameraGallery
 * (một ảnh, một lượt gọi API) — nhẹ ở màn 390px. Điểm một máy thì hiện thẳng.
 */
import { useState } from "react";

import CameraGallery from "@/components/baobay/CameraGallery";
import { useLanguage } from "@/contexts/language-context";
import { WEBCAM_SITES, type CamId, type WebcamSite } from "@/lib/imou/cameras";

const SHORT: Partial<Record<CamId, { vi: string; en: string }>> = {
  "vien-nam": { vi: "Bãi cất 850", en: "Launch 850 m" },
  "vien-nam-bhc": { vi: "Bãi hạ cánh", en: "Landing field" },
};

export default function CameraSwitcher({ site }: { site: WebcamSite }) {
  const { language } = useLanguage();
  const cams = WEBCAM_SITES[site];
  const [cam, setCam] = useState<CamId>(cams[0]);
  if (cams.length < 2) return <CameraGallery cam={cams[0]} />;
  return (
    <div>
      <div className="mt-3 flex gap-1.5" role="tablist">
        {cams.map((c) => {
          const label = SHORT[c] ? (language === "vi" ? SHORT[c].vi : SHORT[c].en) : c;
          return (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={cam === c}
              onClick={() => setCam(c)}
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
