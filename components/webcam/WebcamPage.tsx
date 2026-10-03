// components/webcam/WebcamPage.tsx
/**
 * Thân trang WEBCAM công khai (03/10/2026): /webcam (cả hai camera) và
 * /webcam/<điểm> (khau-pha; vien-nam = bãi cất + bãi hạ cánh). Server component — chỉ khung ảnh CameraGallery là client.
 * Nền tối vì CameraGallery vẽ chữ trắng trên nền trong suốt (giống /baobay).
 */
import CameraGallery from "@/components/baobay/CameraGallery";
import { OptionalCameraGallery } from "@/components/baobay/CameraSwitcher";
import Link from "@/components/locale-link";
import { Navigation } from "@/components/navigation";
import { CAMERAS, WEBCAM_SITES, type CamLang, type WebcamSite } from "@/lib/imou/cameras";
import { WEBCAM_SPOT_PATH, type WebcamCopy } from "@/lib/i18n/webcam";

const linkCls =
  "inline-flex min-h-10 items-center rounded-lg border border-white/20 bg-white/[0.06] px-3 py-2 text-sm font-semibold text-amber-200 transition-colors hover:bg-white/[0.12]";

const SITES = Object.keys(WEBCAM_SITES) as WebcamSite[];

function CamBlock({ cam, t, heading, lang }: { cam: WebcamSite; t: WebcamCopy; heading: "h1" | "h2"; lang: CamLang }) {
  const c = t.cams[cam];
  const camIds = WEBCAM_SITES[cam];
  const H = heading;
  return (
    <section className="space-y-3">
      <H className={heading === "h1" ? "text-2xl font-bold leading-tight sm:text-3xl" : "text-xl font-bold leading-tight"}>
        {heading === "h1" ? (
          c.h1
        ) : (
          <Link href={`/webcam/${cam}`} className="hover:underline">
            {c.h1}
          </Link>
        )}
      </H>
      <p className="text-[15px] leading-relaxed text-white/80">{c.intro}</p>
      {/* Điểm có nhiều camera (Viên Nam: bãi cất rồi bãi hạ cánh) — mỗi khung một tiêu đề nhỏ */}
      {camIds.map((id) => {
        const title =
          camIds.length > 1 ? <h3 className="mt-4 text-base font-semibold text-white/90">📷 {CAMERAS[id].name[lang]}</h3> : null;
        // Mắt phụ (hideWhenEmpty) chưa có ảnh nào thì ẩn hẳn — khung + tiêu đề
        return CAMERAS[id].hideWhenEmpty ? (
          <OptionalCameraGallery key={id} cam={id} title={title} />
        ) : (
          <div key={id}>
            {title}
            <CameraGallery cam={id} />
          </div>
        );
      })}
      <div className="flex flex-wrap gap-2 pt-1">
        <Link href={WEBCAM_SPOT_PATH[cam]} className={linkCls}>
          {t.spotLink(c.spotName)}
        </Link>
        {heading === "h2" ? (
          <Link href={`/webcam/${cam}`} className={linkCls}>
            {t.viewCam} {c.spotName}
          </Link>
        ) : null}
      </div>
    </section>
  );
}

export default function WebcamPage({ t, cam, lang }: { t: WebcamCopy; cam?: WebcamSite; lang: CamLang }) {
  const others = cam ? SITES.filter((c) => c !== cam) : [];
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <Navigation />
      <main className="mx-auto max-w-3xl space-y-8 px-4 pb-16 pt-28">
        {cam ? (
          <CamBlock cam={cam} t={t} heading="h1" lang={lang} />
        ) : (
          <>
            <header className="space-y-3">
              <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{t.listH1}</h1>
              <p className="text-[15px] leading-relaxed text-white/80">{t.listIntro}</p>
            </header>
            {SITES.map((c) => (
              <CamBlock key={c} cam={c} t={t} heading="h2" lang={lang} />
            ))}
          </>
        )}

        <section className="space-y-2 rounded-xl border border-white/15 bg-white/[0.04] p-4">
          <h2 className="text-lg font-bold">🕔 {t.hoursTitle}</h2>
          <p className="text-sm leading-relaxed text-white/80">{t.hours}</p>
          <p className="text-sm leading-relaxed text-white/60">{t.note}</p>
        </section>

        <nav className="space-y-2" aria-label={t.linksTitle}>
          <h2 className="text-lg font-bold">{t.linksTitle}</h2>
          <div className="flex flex-wrap gap-2">
            {others.map((c) => (
              <Link key={c} href={`/webcam/${c}`} className={linkCls}>
                📷 {t.otherCam}: {t.cams[c].spotName}
              </Link>
            ))}
            <Link href="/thoi-tiet-bay" className={linkCls}>
              {t.forecastLink}
            </Link>
            <Link href="/baobay" className={linkCls}>
              {t.baobayLink}
            </Link>
            <Link href="/booking" className={linkCls}>
              {t.bookLink}
            </Link>
          </div>
        </nav>
      </main>
    </div>
  );
}
