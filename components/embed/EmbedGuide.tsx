"use client";

/**
 * Nội dung trang /embed: xem trước + mã nhúng copy được cho đối tác.
 * Chiều cao khung ≈ 0,5625 × chiều rộng + 130px (tiêu đề 36 + thanh trượt 62 +
 * dòng nguồn ~30 + viền) — rộng 600px → ~470px.
 */

import { useEffect, useMemo, useRef, useState } from "react";

import { CAM_ACTIVE, CAM_IDS, CAMERAS, type CamId } from "@/lib/imou/cameras";

type Lang = "vi" | "en";
type Theme = "dark" | "light";

const TXT = {
  vi: {
    title: "Nhúng camera bãi cất cánh dù lượn",
    intro:
      `Hiện ảnh camera bãi cất Viên Nam, bãi hạ cánh Viên Nam hoặc bãi cất Khau Phạ (cập nhật mỗi phút, ${CAM_ACTIVE.label}) ngay trên website của bạn. Miễn phí, vui lòng giữ dòng nguồn.`,
    preview: "Xem trước",
    options: "Tuỳ chọn",
    langLabel: "Ngôn ngữ khung (lang)",
    themeLabel: "Giao diện (theme)",
    basic: "Mã nhúng cơ bản",
    basicNote: "Dán vào chỗ muốn hiện camera. Chạy được ngay, không cần script.",
    wp: "WordPress (khối HTML tuỳ chỉnh)",
    wpNote:
      "Trong trình soạn thảo: thêm khối “HTML tuỳ chỉnh” (Custom HTML) → dán đoạn dưới → Cập nhật. Đoạn này kèm script tự co giãn chiều cao. Gói WordPress.com miễn phí có thể chặn iframe/script — khi đó dùng plugin nhúng iframe hoặc gói có plugin.",
    auto: "Script tự co giãn chiều cao (tuỳ chọn)",
    autoNote:
      "Khung gửi chiều cao nội dung lên trang của bạn (postMessage kiểu {type:\"mbl-camera-height\", height}). Dán script này một lần ở cuối trang để iframe luôn vừa khít, không thừa khoảng trống.",
    params: "Tham số",
    paramLang: "lang=vi | en — ngôn ngữ chữ trong khung (mặc định vi).",
    paramTheme: "theme=dark | light — nền tối hoặc sáng (mặc định dark).",
    paramHeight:
      "Chiều cao khuyến nghị (không dùng script): khoảng 0,5625 × chiều rộng + 130px. Ví dụ rộng 360px → 335; 600px → 470; 800px → 580.",
    notes: "Ghi chú",
    note1: "Miễn phí, vui lòng giữ dòng nguồn “📷 Camera bãi cất cánh … — Mebayluon.com” cuối khung.",
    note2: "Ảnh lấy trực tiếp từ camera, khung tự làm mới mỗi 60 giây khi trang đang mở.",
    note3: `Ngoài giờ ${CAM_ACTIVE.label} khung hiện “Camera nghỉ” kèm ảnh cuối cùng.`,
    camLabel: "Camera",
    copy: "Copy",
    copied: "Đã copy ✓",
    switchUi: "English",
  },
  en: {
    title: "Embed a paragliding launch camera",
    intro:
      `Show the Vien Nam launch, Vien Nam landing field or Khau Pha launch camera (updated every minute, ${CAM_ACTIVE.label} Vietnam time) on your website. Free — please keep the credit line.`,
    preview: "Preview",
    options: "Options",
    langLabel: "Widget language (lang)",
    themeLabel: "Theme (theme)",
    basic: "Basic embed code",
    basicNote: "Paste where you want the camera to appear. Works as-is, no script needed.",
    wp: "WordPress (Custom HTML block)",
    wpNote:
      "In the editor add a “Custom HTML” block → paste the code below → Update. It includes the auto-height script. Free WordPress.com plans may strip iframes/scripts — use an iframe plugin or a plan with plugins.",
    auto: "Auto-height script (optional)",
    autoNote:
      "The widget posts its content height to your page (postMessage {type:\"mbl-camera-height\", height}). Paste this script once near the end of your page so the iframe always fits.",
    params: "Parameters",
    paramLang: "lang=vi | en — widget text language (default vi).",
    paramTheme: "theme=dark | light — dark or light background (default dark).",
    paramHeight:
      "Recommended height without the script: about 0.5625 × width + 130px. E.g. 360px wide → 335; 600px → 470; 800px → 580.",
    notes: "Notes",
    note1: "Free to use — please keep the credit line “📷 … launch camera — Mebayluon.com” at the bottom of the widget.",
    note2: "Photos come straight from the camera; the widget refreshes every 60 seconds while visible.",
    note3: `Outside ${CAM_ACTIVE.label} the widget shows “Camera resting” with the last photo.`,
    camLabel: "Camera",
    copy: "Copy",
    copied: "Copied ✓",
    switchUi: "Tiếng Việt",
  },
} as const;

function heightScript(origin: string): string {
  return `<script>
window.addEventListener("message", function (e) {
  if (e.origin !== "${origin}" || !e.data || e.data.type !== "mbl-camera-height") return;
  document.querySelectorAll("iframe[data-mbl-camera]").forEach(function (f) {
    if (f.contentWindow === e.source) f.style.height = e.data.height + "px";
  });
});
</script>`;
}

function CodeBlock({ code, copyLabel, copiedLabel }: { code: string; copyLabel: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Trình duyệt chặn clipboard (http, iframe…) → chọn sẵn chữ để người dùng tự Ctrl+C
      const ta = document.createElement("textarea");
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="relative">
      <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-slate-900 p-3 pr-20 text-xs leading-5 text-slate-100">
        <code>{code}</code>
      </pre>
      <button
        type="button"
        onClick={copy}
        className="absolute right-2 top-2 rounded-md bg-amber-400 px-2.5 py-1 text-xs font-bold text-slate-900 hover:bg-amber-300"
      >
        {copied ? copiedLabel : copyLabel}
      </button>
    </div>
  );
}

function Toggle<V extends string>({
  value,
  options,
  onChange,
  labels,
}: {
  value: V;
  options: readonly V[];
  onChange: (v: V) => void;
  labels?: Partial<Record<V, string>>;
}) {
  return (
    <div className="inline-flex flex-wrap overflow-hidden rounded-lg border border-slate-300">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={value === o}
          onClick={() => onChange(o)}
          className={`px-3 py-1 text-sm ${value === o ? "bg-slate-900 text-white" : "bg-white text-slate-700"}`}
        >
          {labels?.[o] ?? o}
        </button>
      ))}
    </div>
  );
}

export default function EmbedGuide({ siteUrl, ui }: { siteUrl: string; ui: Lang }) {
  const t = TXT[ui];
  const [lang, setLang] = useState<Lang>(ui);
  const [theme, setTheme] = useState<Theme>("dark");
  const [cam, setCam] = useState<CamId>("vien-nam");
  const credit = CAMERAS[cam].credit.vi;
  const origin = siteUrl.replace(/\/$/, "");
  const previewRef = useRef<HTMLIFrameElement>(null);

  // Xem trước tự co giãn theo chiều cao khung gửi lên — đúng cơ chế script đối tác dùng
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const el = previewRef.current;
      if (el && e.source === el.contentWindow && e.data?.type === "mbl-camera-height") el.style.height = `${e.data.height}px`;
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const src = `${origin}/embed/camera/${cam}?lang=${lang}&theme=${theme}`;
  const iframe = useMemo(
    () =>
      `<iframe src="${src}" title="${credit}" data-mbl-camera width="100%" height="470" style="border:0;width:100%;max-width:800px;display:block" loading="lazy" allowfullscreen></iframe>`,
    [src, credit],
  );
  const wordpress = `<!-- ${credit} -->\n${iframe}\n${heightScript(origin)}`;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">{t.title}</h1>
            <p className="mt-1 text-sm text-slate-600">{t.intro}</p>
          </div>
          <a href={ui === "vi" ? "/embed?ui=en" : "/embed"} className="shrink-0 text-sm text-sky-700 underline">
            {t.switchUi}
          </a>
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-bold">{t.options}</h2>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              {t.camLabel}: <Toggle
                value={cam}
                options={CAM_IDS}
                onChange={setCam}
                labels={Object.fromEntries(CAM_IDS.map((c) => [c, CAMERAS[c].name[ui]]))}
              />
            </div>
            <div className="flex items-center gap-2">
              {t.langLabel}: <Toggle value={lang} options={["vi", "en"] as const} onChange={setLang} />
            </div>
            <div className="flex items-center gap-2">
              {t.themeLabel}: <Toggle value={theme} options={["dark", "light"] as const} onChange={setTheme} />
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">{t.preview}</h2>
          {/* Xem trước dùng đường dẫn cùng origin để chạy được cả ở máy dev */}
          <iframe
            key={`${cam}-${lang}-${theme}`}
            src={`/embed/camera/${cam}?lang=${lang}&theme=${theme}`}
            title={credit}
            data-mbl-camera
            height={470}
            className="block w-full max-w-[800px] border-0"
            ref={previewRef}
          />
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">{t.basic}</h2>
          <p className="text-sm text-slate-600">{t.basicNote}</p>
          <CodeBlock code={iframe} copyLabel={t.copy} copiedLabel={t.copied} />
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">{t.wp}</h2>
          <p className="text-sm text-slate-600">{t.wpNote}</p>
          <CodeBlock code={wordpress} copyLabel={t.copy} copiedLabel={t.copied} />
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">{t.auto}</h2>
          <p className="text-sm text-slate-600">{t.autoNote}</p>
          <CodeBlock code={heightScript(origin)} copyLabel={t.copy} copiedLabel={t.copied} />
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">{t.params}</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>
              <code>{t.paramLang}</code>
            </li>
            <li>
              <code>{t.paramTheme}</code>
            </li>
            <li>{t.paramHeight}</li>
          </ul>
        </section>

        <section className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <h2 className="text-lg font-bold">{t.notes}</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li className="font-semibold">{t.note1}</li>
            <li>{t.note2}</li>
            <li>{t.note3}</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
