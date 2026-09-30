// lib/bao-bay-weather.ts
/**
 * DỰ BÁO TRÊN LỊCH BÁO BAY (/baobay) — phần tính thuần, chạy trên trình duyệt.
 *
 * Nhận đúng object ngày của /api/thoi-tiet (không gọi thêm API nào) rồi rút
 * ra hai thứ:
 *  - ô lịch: mặt cười, mũi tên gió, nắng/mưa;
 *  - dòng TÓM TẮT NGÀY kiểu chủ viết (30/09): "gió Đông Nam 3.5 m/s, thermal
 *    mạnh, 5h nắng, 4h mưa, nhiễu động nhẹ, trần mây 500m, có nghịch nhiệt ở
 *    1000m, gió trên cao cực mạnh".
 *
 * Tách phần SỐ LIỆU (dayParts) khỏi phần CÂU CHỮ (renderDaySummary) để dịch
 * được sáu thứ tiếng: câu nhận định sẵn có (nhanDinh) chỉ có tiếng Việt, nên
 * chỉ mượn phần CẤU TRÚC của nó (tên mục, tông, con số) chứ không chép chữ.
 * Thiếu số liệu mục nào thì BỎ mục đó — không đoán.
 */

import { caoAmsl, huongTroiNgay, tranMay, type SucThermal } from "@/lib/baobay/thoi-tiet";

/** Những trường của một ngày dự báo mà trang báo bay dùng tới. */
export type NgayApi = {
  ngay: string;
  muc: string;
  /** Số giờ MƯA THẬT (≥ 0,8 mm/giờ) trong khung bay. */
  gioMua?: number;
  /** Số giờ "mưa bay" — mưa phùn 0,4–0,8 mm/giờ, bay vẫn được. */
  gioMuaBay?: number;
  thermal?: { diem: number; muc: SucThermal };
  gio?: Array<{
    gio: string;
    huong: number;
    gio10m: number;
    may?: number;
    giayNang?: number;
    nhietDo?: number;
    diemSuong?: number;
    mayThap?: number;
    chenhDoCao?: number;
  }>;
  nhanDinh?: { diem?: Array<{ ten: string; ngan: string; noiDung: string; tong: string }> };
};

/** Mức bay của ngày — vẽ thành mặt tròn XANH / VÀNG / ĐỎ (BaoBayClient FaceIcon). */
export type DayLevel = "xanh" | "vang" | "do";

export type CalDay = { level: DayLevel | null; wind: number | null; sky: string };

function mucNgay(muc: string): DayLevel | null {
  return muc === "xanh" || muc === "vang" || muc === "do" ? muc : null;
}

const gioCuaMot = (g: { gio: string }) => Number(String(g.gio).slice(11, 13));

/** Ô lịch: mặt theo mức ngày, mũi tên gió 6h–18h, nắng/mây/mưa. */
export function calDay(n: NgayApi): CalDay {
  const gio = Array.isArray(n.gio) ? n.gio : [];
  const bay = gio.filter((g) => {
    const h = gioCuaMot(g);
    return h >= 8 && h <= 17 && Number.isFinite(g.may);
  });
  const may = bay.length ? bay.reduce((t, g) => t + (g.may as number), 0) / bay.length : 0;
  return {
    level: mucNgay(n.muc),
    // Cùng hàm và cùng khung 6h–18h với ô ngày của bảng dự báo (huongTroiCuaNgay)
    wind: huongTroiNgay(gio as never, [6, 18]),
    /**
     * Mưa THẬT trong khung bay mới là 🌧️; chỉ "mưa bay" (mưa phùn, bay vẫn được)
     * là 🌦️ — gộp chung thì ngày mưa phùn vài giờ trông như ngày nghỉ.
     */
    sky: (n.gioMua ?? 0) > 0 ? "🌧️" : (n.gioMuaBay ?? 0) > 0 ? "🌦️" : may < 50 ? "☀️" : "⛅",
  };
}

/* ------------------------------------------------------------------ *
 * Số liệu cho dòng tóm tắt
 * ------------------------------------------------------------------ */

export type Turb = "nhe" | "vua" | "manh";
export type UpperLevel = "em" | "vua" | "manh" | "cucManh" | "cat";

export type DayParts = {
  level: DayLevel | null;
  /** Hướng gió TỚI TỪ (quy ước khí tượng), độ — "gió Đông Nam" là gió từ Đông Nam thổi lại. */
  windFrom: number | null;
  /** Gió trung bình mặt đất 6h–18h, m/s. */
  windAvg: number | null;
  thermal: SucThermal | null;
  sunHours: number | null;
  rainHours: number;
  drizzleHours: number;
  turb: Turb | null;
  /** Trần mây, mét AMSL (trên mực nước biển) — xem chú thích ở dayParts. */
  cloudBase: number | null;
  /** Độ cao nghịch nhiệt / lớp chặn, mét AMSL. */
  inversion: { kind: "nghich" | "chan"; m: number } | "none" | null;
  upper: { level: UpperLevel; ms: number | null } | null;
};

function trungVi(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/**
 * `altBai`: độ cao BÃI CẤT (m AMSL) — lấy `toaDo.alt` của chính phản hồi
 * /api/thoi-tiet, tức cùng con số hệ dự báo dùng (lib/weather-spots.ts). Không
 * có thì KHÔNG hiện trần mây / nghịch nhiệt, chứ không in số "trên bãi" dưới
 * nhãn AMSL.
 */
export function dayParts(n: NgayApi, altBai?: number): DayParts {
  const coAlt = typeof altBai === "number" && Number.isFinite(altBai);
  const gio = Array.isArray(n.gio) ? n.gio : [];
  const khung = gio.filter((g) => gioCuaMot(g) >= 6 && gioCuaMot(g) <= 18 && Number.isFinite(g.gio10m));
  const diem = n.nhanDinh?.diem ?? [];
  const tim = (ten: string) => diem.find((d) => d.ten === ten);

  /**
   * GIỜ NẮNG = cộng giây có nắng của từng giờ (giayNang). Ngày không có trường
   * này (mô hình không cho) thì bỏ, không suy từ % mây.
   */
  const coNang = gio.filter((g) => Number.isFinite(g.giayNang));
  const sunHours = coNang.length ? Math.round(coNang.reduce((t, g) => t + (g.giayNang as number), 0) / 3600) : null;

  /** NHIỄU ĐỘNG: mục "Nhiễu động" của nhận định; có nhận định mà không có mục = nhẹ. */
  const nd = tim("Nhiễu động");
  const turb: Turb | null = nd ? (/mạnh/i.test(nd.ngan) ? "manh" : "vua") : diem.length ? "nhe" : null;

  /**
   * TRẦN MÂY: dùng tranMay (thoi-tiet.ts) — khoảng nhiệt độ/điểm sương × 125m,
   * đã cộng chênh độ cao ô lưới → bãi cất, nên là mét TRÊN BÃI CẤT. Lấy trung vị
   * 10h–15h (giữa ngày bay). KHÔNG dùng tranMax: đó là ĐỈNH THERMAL, khác trần mây.
   * Giờ nào trời không có mây thấp thì tranMay trả null — cả khung null thì bỏ.
   */
  const tran = gio
    .filter((g) => gioCuaMot(g) >= 10 && gioCuaMot(g) <= 15 && Number.isFinite(g.nhietDo))
    .map((g) => tranMay(g.nhietDo as number, g.diemSuong, g.mayThap, g.chenhDoCao ?? 0))
    .filter((v): v is number => v !== null && Number.isFinite(v));
  const tb = trungVi(tran);

  /**
   * NGHỊCH NHIỆT: mục "Nghịch nhiệt"/"Lớp chặn" của nhận định, tính từ nhiệt độ
   * các mực 925/850/700 hPa đã có sẵn trong số liệu giờ — không cần gọi thêm
   * sounding. Độ cao là mét TRÊN BÃI (số trong câu ngắn "nghịch nhiệt ~800m").
   */
  const nn = tim("Nghịch nhiệt") ?? tim("Lớp chặn");
  let inversion: DayParts["inversion"] = null;
  if (nn) {
    const m = nn.ngan.match(/~(\d+)\s*m/);
    // Số trong câu là mét TRÊN BÃI → đổi sang AMSL cho cùng thước với trần mây (chủ 30/09)
    if (m && coAlt) inversion = { kind: nn.ten === "Lớp chặn" ? "chan" : "nghich", m: Math.round(caoAmsl(altBai as number, Number(m[1])) / 50) * 50 };
    else if (/không/i.test(nn.ngan)) inversion = "none";
  }

  /**
   * GIÓ TRÊN CAO: mức lấy theo TÔNG của mục "Gió trên cao" (cùng thước 8/12 m/s
   * của nhận định), số lấy từ dãy "= gió a/b/c m/s" (bãi cất / tầng bay / +1000m)
   * — lấy số lớn nhất của hai tầng trên.
   */
  const gc = tim("Gió trên cao");
  let upper: DayParts["upper"] = null;
  if (gc) {
    const so = gc.noiDung.match(/= gió\s*([\d–-]+)\/([\d–-]+)\/([\d–-]+)\s*m\/s/);
    const nums = so ? [so[2], so[3]].map(Number).filter(Number.isFinite) : [];
    const level: UpperLevel = /gió đứt/i.test(gc.ngan)
      ? "cat"
      : gc.tong === "xau"
        ? "cucManh"
        : gc.tong === "chuY"
          ? "manh"
          : gc.tong === "thongTin"
            ? "vua"
            : "em";
    upper = { level, ms: nums.length ? Math.max(...nums) : null };
  }

  return {
    level: mucNgay(n.muc),
    windFrom: huongTroiNgay(gio as never, [6, 18]),
    windAvg: khung.length ? khung.reduce((t, g) => t + g.gio10m, 0) / khung.length : null,
    thermal: n.thermal?.muc ?? null,
    sunHours,
    rainHours: n.gioMua ?? 0,
    drizzleHours: n.gioMuaBay ?? 0,
    turb,
    /**
     * TRẦN MÂY AMSL (chủ 30/09: phi công đọc độ cao theo máy đo, tức AMSL):
     * tranMay cho mét TRÊN BÃI CẤT → cộng độ cao bãi (caoAmsl), làm tròn 50 m.
     */
    cloudBase: tb === null || !coAlt ? null : Math.round(caoAmsl(altBai as number, tb) / 50) * 50,
    inversion,
    upper,
  };
}

/* ------------------------------------------------------------------ *
 * Câu chữ — 6 ngôn ngữ
 * ------------------------------------------------------------------ */

type Words = {
  /** Định dạng số theo thói quen từng thứ tiếng: 1.500 (vi) · 1,500 (en) · 1 500 (fr). */
  locale: string;
  /** Nhãn đọc cho mặt tròn mức ngày (aria-label/title). */
  level: Record<DayLevel, string>;
  dirs: string[];
  wind: (dir: string, ms: string) => string;
  windCalm: (ms: string) => string;
  thermal: Record<SucThermal, string>;
  sun: (h: number) => string;
  rain: (h: number) => string;
  drizzle: (h: number) => string;
  turb: Record<Turb, string>;
  /** Nhận số ĐÃ định dạng ("1.500") — xem `fmt` trong renderDaySummary. */
  cloudBase: (m: string) => string;
  inversion: (m: string) => string;
  stableLayer: (m: string) => string;
  noInversion: string;
  upper: Record<UpperLevel, string>;
  upperMs: (level: string, ms: number) => string;
  weekdays: string[];
};

const WORDS: Record<string, Words> = {
  vi: {
    locale: "vi-VN",
    level: { xanh: "bay tốt", vang: "cân nhắc", do: "nên nghỉ" },
    dirs: ["Bắc", "Đông Bắc", "Đông", "Đông Nam", "Nam", "Tây Nam", "Tây", "Tây Bắc"],
    wind: (d, ms) => `gió ${d} ${ms} m/s`,
    windCalm: (ms) => `gió lặng ${ms} m/s`,
    thermal: { khong: "không thermal", nhe: "thermal nhẹ", vua: "thermal vừa", manh: "thermal mạnh", gat: "thermal gắt" },
    sun: (h) => `${h}h nắng`,
    rain: (h) => `${h}h mưa`,
    drizzle: (h) => `${h}h mưa bay`,
    turb: { nhe: "nhiễu động nhẹ", vua: "nhiễu động vừa", manh: "nhiễu động mạnh" },
    cloudBase: (m) => `trần mây ${m}m AMSL`,
    inversion: (m) => `có nghịch nhiệt ở ${m}m AMSL`,
    stableLayer: (m) => `lớp chặn ở ${m}m AMSL`,
    noInversion: "không nghịch nhiệt",
    upper: { em: "gió trên cao êm", vua: "gió trên cao vừa", manh: "gió trên cao mạnh", cucManh: "gió trên cao cực mạnh", cat: "gió đứt ngay trên bãi" },
    upperMs: (l, ms) => `${l} (${ms} m/s)`,
    weekdays: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"],
  },
  en: {
    locale: "en-US",
    level: { xanh: "good to fly", vang: "marginal", do: "not flyable" },
    dirs: ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"],
    wind: (d, ms) => `${d} wind ${ms} m/s`,
    windCalm: (ms) => `calm, ${ms} m/s`,
    thermal: { khong: "no thermals", nhe: "weak thermals", vua: "moderate thermals", manh: "strong thermals", gat: "rough thermals" },
    sun: (h) => `${h}h sunshine`,
    rain: (h) => `${h}h rain`,
    drizzle: (h) => `${h}h drizzle`,
    turb: { nhe: "light turbulence", vua: "moderate turbulence", manh: "strong turbulence" },
    cloudBase: (m) => `cloud base ${m}m AMSL`,
    inversion: (m) => `inversion at ${m}m AMSL`,
    stableLayer: (m) => `stable layer at ${m}m AMSL`,
    noInversion: "no inversion",
    upper: { em: "light winds aloft", vua: "moderate winds aloft", manh: "strong winds aloft", cucManh: "very strong winds aloft", cat: "wind shear just above launch" },
    upperMs: (l, ms) => `${l} (${ms} m/s)`,
    weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  },
  fr: {
    locale: "fr-FR",
    level: { xanh: "bon pour voler", vang: "limite", do: "pas volable" },
    dirs: ["nord", "nord-est", "est", "sud-est", "sud", "sud-ouest", "ouest", "nord-ouest"],
    // "vent d'est", "vent d'ouest" — élision devant voyelle
    wind: (d, ms) => `vent ${/^[aeiou]/.test(d) ? `d'${d}` : `de ${d}`} ${ms} m/s`,
    windCalm: (ms) => `vent calme ${ms} m/s`,
    thermal: { khong: "pas de thermiques", nhe: "thermiques faibles", vua: "thermiques moyens", manh: "thermiques forts", gat: "thermiques musclés" },
    sun: (h) => `${h} h de soleil`,
    rain: (h) => `${h} h de pluie`,
    drizzle: (h) => `${h} h de bruine`,
    turb: { nhe: "turbulences faibles", vua: "turbulences modérées", manh: "turbulences fortes" },
    cloudBase: (m) => `plafond ${m} m AMSL`,
    inversion: (m) => `inversion à ${m} m AMSL`,
    stableLayer: (m) => `couche stable à ${m} m AMSL`,
    noInversion: "pas d'inversion",
    upper: { em: "vent en altitude faible", vua: "vent en altitude modéré", manh: "vent en altitude fort", cucManh: "vent en altitude très fort", cat: "cisaillement juste au-dessus du déco" },
    upperMs: (l, ms) => `${l} (${ms} m/s)`,
    weekdays: ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"],
  },
  ru: {
    locale: "ru-RU",
    level: { xanh: "хорошо для полётов", vang: "на грани", do: "нелётно" },
    dirs: ["северный", "северо-восточный", "восточный", "юго-восточный", "южный", "юго-западный", "западный", "северо-западный"],
    wind: (d, ms) => `ветер ${d} ${ms} м/с`,
    windCalm: (ms) => `штиль ${ms} м/с`,
    thermal: { khong: "без термиков", nhe: "слабые термики", vua: "умеренные термики", manh: "сильные термики", gat: "жёсткие термики" },
    sun: (h) => `${h} ч солнца`,
    rain: (h) => `${h} ч дождя`,
    drizzle: (h) => `${h} ч мороси`,
    turb: { nhe: "слабая турбулентность", vua: "умеренная турбулентность", manh: "сильная турбулентность" },
    cloudBase: (m) => `нижняя граница облаков ${m} м AMSL`,
    inversion: (m) => `инверсия на ${m} м AMSL`,
    stableLayer: (m) => `задерживающий слой на ${m} м AMSL`,
    noInversion: "без инверсии",
    upper: { em: "ветер на высоте слабый", vua: "ветер на высоте умеренный", manh: "ветер на высоте сильный", cucManh: "ветер на высоте очень сильный", cat: "сдвиг ветра над стартом" },
    upperMs: (l, ms) => `${l} (${ms} м/с)`,
    weekdays: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
  },
  zh: {
    locale: "zh-CN",
    level: { xanh: "适合飞行", vang: "需斟酌", do: "不宜飞行" },
    dirs: ["北", "东北", "东", "东南", "南", "西南", "西", "西北"],
    wind: (d, ms) => `${d}风 ${ms} 米/秒`,
    windCalm: (ms) => `静风 ${ms} 米/秒`,
    thermal: { khong: "无热气流", nhe: "热气流弱", vua: "热气流中等", manh: "热气流强", gat: "热气流猛烈" },
    sun: (h) => `日照 ${h} 小时`,
    rain: (h) => `降雨 ${h} 小时`,
    drizzle: (h) => `毛毛雨 ${h} 小时`,
    turb: { nhe: "轻度乱流", vua: "中度乱流", manh: "强乱流" },
    cloudBase: (m) => `云底 ${m} 米（海拔）`,
    inversion: (m) => `海拔 ${m} 米处有逆温`,
    stableLayer: (m) => `海拔 ${m} 米处有稳定层`,
    noInversion: "无逆温",
    upper: { em: "高空风弱", vua: "高空风中等", manh: "高空风强", cucManh: "高空风极强", cat: "起飞场上方风切变" },
    upperMs: (l, ms) => `${l}（${ms} 米/秒）`,
    weekdays: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
  },
  hi: {
    locale: "en-IN",
    level: { xanh: "उड़ान के लिए अच्छा", vang: "सीमांत", do: "उड़ान योग्य नहीं" },
    dirs: ["उत्तर", "उत्तर-पूर्व", "पूर्व", "दक्षिण-पूर्व", "दक्षिण", "दक्षिण-पश्चिम", "पश्चिम", "उत्तर-पश्चिम"],
    wind: (d, ms) => `${d} की हवा ${ms} m/s`,
    windCalm: (ms) => `शांत हवा ${ms} m/s`,
    thermal: { khong: "थर्मल नहीं", nhe: "कमज़ोर थर्मल", vua: "मध्यम थर्मल", manh: "तेज़ थर्मल", gat: "बहुत तेज़ थर्मल" },
    sun: (h) => `${h} घंटे धूप`,
    rain: (h) => `${h} घंटे बारिश`,
    drizzle: (h) => `${h} घंटे बूंदाबांदी`,
    turb: { nhe: "हल्की अशांति", vua: "मध्यम अशांति", manh: "तेज़ अशांति" },
    cloudBase: (m) => `क्लाउड बेस ${m} मी AMSL`,
    inversion: (m) => `${m} मी AMSL पर इनवर्ज़न`,
    stableLayer: (m) => `${m} मी AMSL पर स्थिर परत`,
    noInversion: "इनवर्ज़न नहीं",
    upper: { em: "ऊपरी हवा हल्की", vua: "ऊपरी हवा मध्यम", manh: "ऊपरी हवा तेज़", cucManh: "ऊपरी हवा बहुत तेज़", cat: "लॉन्च के ठीक ऊपर विंड शियर" },
    upperMs: (l, ms) => `${l} (${ms} m/s)`,
    weekdays: ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"],
  },
};

function words(lang: string): Words {
  return WORDS[String(lang).slice(0, 2)] ?? WORDS.vi;
}

/** "2026-10-01" → "T5 01/10" (thứ theo ngôn ngữ). */
export function shortDayLabel(iso: string, lang: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${words(lang).weekdays[wd]} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

/**
 * Dòng tóm tắt, vd: "T5 01/10: gió Đông Nam 1.5 m/s, thermal mạnh, 11h nắng,
 * 3h mưa bay, nhiễu động vừa, trần mây 1.500m AMSL, không nghịch nhiệt, gió trên cao êm".
 * Mục nào không có số liệu thì không có mặt trong câu.
 */
/** Nhãn đọc của mức ngày — aria-label / title cho mặt tròn màu. */
export function levelLabel(level: DayLevel, lang: string): string {
  return words(lang).level[level];
}

/**
 * Câu tóm tắt KHÔNG kèm mặt: trang tự vẽ mặt tròn màu (SVG) đứng trước câu.
 */
export function renderDaySummary(iso: string, p: DayParts, lang: string): string {
  const w = words(lang);
  const fmt = (m: number) => m.toLocaleString(w.locale);
  const out: string[] = [];
  if (p.windAvg !== null) {
    const ms = p.windAvg.toFixed(1);
    out.push(
      p.windFrom !== null && p.windAvg >= 0.5
        ? w.wind(w.dirs[Math.round((((p.windFrom % 360) + 360) % 360) / 45) % 8], ms)
        : w.windCalm(ms),
    );
  }
  if (p.thermal) out.push(w.thermal[p.thermal]);
  if (p.sunHours !== null) out.push(w.sun(p.sunHours));
  if (p.rainHours > 0) out.push(w.rain(p.rainHours));
  else if (p.drizzleHours > 0) out.push(w.drizzle(p.drizzleHours));
  if (p.turb) out.push(w.turb[p.turb]);
  if (p.cloudBase !== null) out.push(w.cloudBase(fmt(p.cloudBase)));
  if (p.inversion === "none") out.push(w.noInversion);
  else if (p.inversion) out.push(p.inversion.kind === "nghich" ? w.inversion(fmt(p.inversion.m)) : w.stableLayer(fmt(p.inversion.m)));
  if (p.upper) {
    const l = w.upper[p.upper.level];
    out.push(p.upper.ms !== null && p.upper.level !== "cat" ? w.upperMs(l, p.upper.ms) : l);
  }
  const sep = String(lang).startsWith("zh") ? "，" : ", ";
  return `${shortDayLabel(iso, lang)}: ${out.join(sep)}`;
}
