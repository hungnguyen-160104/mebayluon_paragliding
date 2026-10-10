// components/spots/checkin-map/CheckinMapSection.tsx
/**
 * Khối "Bản đồ check-in Tú Lệ – Khau Phạ – Mù Cang Chải" (#check-in-map) trên /spots/khau-pha.
 *
 * Component MÁY CHỦ: tiêu đề, chú giải và danh sách 18 điểm (kèm đường đi, mùa, vé, lưu ý) render
 * sẵn trong HTML — Google đọc được, khách không bật JS vẫn có nội dung — và KHÔNG vào gói JS.
 * Chỉ khung bản đồ <CheckinMap3D> là client (tải lười).
 *
 * Ngôn ngữ: tiếng Việt cho vi, tiếng Anh cho mọi ngôn ngữ khác; tên địa danh giữ tiếng Việt.
 * Link bài: chỉ bài ĐÃ ĐĂNG (page.tsx hỏi DB qua lib/checkin-map-published.ts).
 */
import Link from "@/components/locale-link";
import { CK_STOPS, ckArticleHref, ckTextLang, type CkStopId } from "@/lib/checkin-map";
import { SPOT_SECTION_HEADING } from "@/components/spots/section-heading";
import CheckinMap3D from "./CheckinMap3D";
import { CK_HUB_PATH, ckUi } from "@/lib/checkin-map/embed";

const UI = {
  vi: {
    heading: "Bản đồ check-in Tú Lệ – Khau Phạ – Mù Cang Chải",
    lead: "18 điểm dừng dọc quốc lộ 32, gần 50 km từ thung lũng Tú Lệ qua đèo Khau Phạ tới thị trấn Mù Cang Chải. Chạm một điểm để bay tới gần; kéo, xoay, thu phóng tuỳ ý.",
    alt: "Bản đồ 3D đường đến điểm bay Khau Phạ và 18 điểm check-in từ Tú Lệ tới Mù Cang Chải",
    legend: ["Quốc lộ 32", "đường nhánh", "đường bay dù lượn"],
    attrib: "Dữ liệu bản đồ",
    elev: "Độ cao: AWS Terrain Tiles",
    photos: "Ảnh: ghi nguồn dưới từng ảnh.",
    listHeading: "18 điểm trên bản đồ",
    ele: "độ cao",
    fromTuLe: "từ chợ Tú Lệ",
    fromClub: "từ Clubhouse",
    min: "phút",
    route: "Đường đi",
    season: "Mùa · giờ đẹp",
    ticket: "Vé",
    noTicket: "Chưa có nguồn ghi giá vé — chúng tôi không đoán.",
    tips: "Lưu ý",
    read: "Đọc bài đầy đủ",
    showOnMap: "Xem trên bản đồ",
    gmaps: "Mở Google Maps",
  },
  en: {
    heading: "Check-in map: Tú Lệ – Khau Phạ – Mù Cang Chải",
    lead: "18 stops along Highway QL32, about 50 km from the Tú Lệ valley over Khau Phạ pass to Mù Cang Chải town. Tap a stop to fly in; drag, rotate and zoom freely.",
    alt: "3D map of the road to the Khau Phạ paragliding site and 18 check-in stops from Tú Lệ to Mù Cang Chải",
    legend: ["Highway QL32", "side road", "paragliding flight line"],
    attrib: "Map data",
    elev: "Elevation: AWS Terrain Tiles",
    photos: "Photos: credited under each photo.",
    listHeading: "18 stops on the map",
    ele: "elevation",
    fromTuLe: "from Tú Lệ market",
    fromClub: "from the Clubhouse",
    min: "min",
    route: "Getting there",
    season: "Best season & light",
    ticket: "Tickets",
    noTicket: "",
    tips: "Good to know",
    read: "Read the full article",
    showOnMap: "Show on the map",
    gmaps: "Open in Google Maps",
  },
} as const;

/** Số kiểu Việt (1.268 · 34,8) hoặc kiểu Anh (1,268 · 34.8). */
function fmt(v: number, lang: "vi" | "en") {
  return v.toLocaleString(lang === "vi" ? "vi-VN" : "en-US", { maximumFractionDigits: 1 });
}

export default function CheckinMapSection({
  lang,
  articles,
  hubPublished = false,
}: {
  lang: string;
  /** Mã điểm → slug bài ĐÃ ĐĂNG. */
  articles?: Partial<Record<CkStopId, string>>;
  /** Bài trụ đã đăng → hiện link sang bài dưới bản đồ. */
  hubPublished?: boolean;
}) {
  const L = ckTextLang(lang);
  const t = UI[L];
  const links = articles ?? {};

  return (
    <section id="check-in-map" className="relative z-10 scroll-mt-24 pb-4 pt-12">
      <div className="container mx-auto max-w-5xl rounded-2xl border border-white/20 bg-black/25 px-3 py-7 shadow-lg backdrop-blur-xl sm:px-6">
        <h2 className={`${SPOT_SECTION_HEADING} text-center`}>{t.heading}</h2>
        <p className="mx-auto mt-2 max-w-3xl text-center text-sm text-slate-200">{t.lead}</p>

        <div className="mt-6">
          <CheckinMap3D lang={L} pageLang={lang} articles={links} alt={ckUi(lang).alt} withDetails />
        </div>

        <p className="mt-3 text-center text-[13px] leading-relaxed text-slate-200">
          <span className="mr-3 whitespace-nowrap"><b className="text-[#e24a28]">━━</b> {t.legend[0]}</span>
          <span className="mr-3 whitespace-nowrap"><b className="text-[#e8743c]">━</b> {t.legend[1]}</span>
          <span className="whitespace-nowrap"><b className="text-[#c46ab8]">╌╌</b> {t.legend[2]}</span>
        </p>
        {/* Ghi công bắt buộc — chữ thường, không link sang web khác (chủ 10/10). */}
        <p className="mt-1 text-center text-[11.5px] leading-relaxed text-slate-300/90">
          {t.attrib}: © OpenStreetMap contributors · OpenFreeMap · {t.elev} · {t.photos}
        </p>

        {hubPublished && (
          <p className="mt-4 text-center">
            <Link
              href={CK_HUB_PATH}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-300 underline underline-offset-4 hover:text-emerald-200"
            >
              {ckUi(lang).hubLink} →
            </Link>
          </p>
        )}

        <h3 className="mt-8 font-serif text-lg font-bold text-white sm:text-xl">{t.listHeading}</h3>
        <ol className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          {CK_STOPS.map((s) => {
            const x = s[L];
            const slug = links[s.id];
            const vi = L === "vi" ? s.vi : null;
            const en = L === "en" ? s.en : null;
            return (
              <li key={s.id}>
                <details id={`ck-stop-${s.id}`} className="group scroll-mt-24 rounded-xl border border-white/20 bg-white/5 text-left text-white open:bg-white/10">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5">
                    <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-[#da251d] text-[13px] font-bold">{s.n}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold leading-snug">{x.name}</span>
                      <span className="block text-xs text-slate-300">
                        {x.type ? `${x.type} · ` : ""}
                        {fmt(s.ele, L)} m · Km {fmt(s.km, L)}
                      </span>
                    </span>
                    <span aria-hidden className="text-slate-300 transition-transform group-open:rotate-90">›</span>
                  </summary>
                  <div className="space-y-2 px-3 pb-3 text-[13.5px] leading-relaxed text-slate-100">
                    <p className="text-xs text-slate-300">
                      {s.fromTuLe?.km != null && (
                        <>
                          {fmt(s.fromTuLe.km, L)} km {t.fromTuLe}
                          {s.fromTuLe.min ? ` · ~${s.fromTuLe.min} ${t.min}` : ""}
                        </>
                      )}
                      {s.fromClubhouse?.km != null && (
                        <>
                          {" · "}
                          {fmt(s.fromClubhouse.km, L)} km {t.fromClub}
                          {s.fromClubhouse.min ? ` · ~${s.fromClubhouse.min} ${t.min}` : ""}
                        </>
                      )}
                    </p>
                    {en?.what && <p>{en.what}</p>}
                    {x.why && <p>{x.why}</p>}
                    {vi && vi.duongDi.length > 0 && (
                      <>
                        <h4 className="pt-1 text-xs font-bold uppercase tracking-wide text-slate-300">{t.route}</h4>
                        <ul className="list-disc space-y-1 pl-5">
                          {vi.duongDi.map((d) => (
                            <li key={d}>{d}</li>
                          ))}
                        </ul>
                      </>
                    )}
                    {(vi?.mua || en?.when) && (
                      <>
                        <h4 className="pt-1 text-xs font-bold uppercase tracking-wide text-slate-300">{t.season}</h4>
                        <p>{vi?.mua || en?.when}</p>
                      </>
                    )}
                    {vi && (
                      <>
                        <h4 className="pt-1 text-xs font-bold uppercase tracking-wide text-slate-300">{t.ticket}</h4>
                        <p>{vi.ve || t.noTicket}</p>
                      </>
                    )}
                    {((vi && vi.luuY.length > 0) || en?.tip) && (
                      <>
                        <h4 className="pt-1 text-xs font-bold uppercase tracking-wide text-slate-300">{t.tips}</h4>
                        {vi ? (
                          <ul className="list-disc space-y-1 pl-5">
                            {vi.luuY.map((d) => (
                              <li key={d}>{d}</li>
                            ))}
                          </ul>
                        ) : (
                          <p>{en?.tip}</p>
                        )}
                      </>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {slug && (
                        <Link
                          href={ckArticleHref(slug)}
                          className="rounded-full bg-[#0f2e21] px-3.5 py-1.5 text-[13px] font-semibold text-[#fbf6ea] ring-1 ring-[#f2963e]/70 hover:bg-[#164030]"
                        >
                          {t.read} →
                        </Link>
                      )}
                      <button
                        type="button"
                        data-ck-tap={s.id}
                        className="rounded-full bg-white/15 px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-white/25"
                      >
                        {t.showOnMap}
                      </button>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lon}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-white/15 px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-white/25"
                      >
                        {t.gmaps}
                      </a>
                    </div>
                  </div>
                </details>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
