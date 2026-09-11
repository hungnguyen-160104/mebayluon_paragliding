"use client";

/**
 * GIẢN ĐỒ THÁM KHÔNG SKEW-T LOG-P — vẽ tay bằng SVG.
 *
 * Vì sao tự vẽ: số theo mực áp suất đã có sẵn ở Open-Meteo (nhiệt độ, điểm
 * sương, gió của 8–12 mực), còn ảnh Skew-T dựng sẵn trên mạng thì bám theo
 * trạm thám không thật — trạm gần Đồi Bù nhất là Hà Nội, thả bóng ngày hai
 * lần, không có ngày mai và không đúng toạ độ bãi. Vẽ từ chính mô hình mình
 * đang dùng thì giản đồ khớp với bảng giờ và biểu đồ bên cạnh, và có cho cả
 * 10 ngày tới.
 *
 * CÁCH ĐỌC (in luôn dưới hình cho người mới):
 *  - Trục đứng: áp suất theo thang log — lên cao các mực sát lại, đúng như
 *    khí quyển loãng dần. Bên trái ghi kèm độ cao mét để khỏi phải quy đổi.
 *  - Trục ngang: nhiệt độ, nhưng BỊ XIÊN sang phải khi lên cao. Xiên để đường
 *    "đoạn nhiệt khô" thành gần thẳng đứng: chỗ nào đường nhiệt độ NGHIÊNG
 *    PHẢI hơn đường xám mảnh là lớp bị nén (nắp), nghiêng trái hơn là lớp
 *    bốc được.
 *  - Đường ĐỎ = nhiệt độ, đường XANH = điểm sương. Hai đường sát nhau: không
 *    khí ẩm, dễ có mây và mưa rào. Tách xa: khô, trời trong, thermal "xanh".
 *  - Đường CAM đứt nét = bọt khí nóng bốc từ bãi. Nó còn nằm BÊN PHẢI đường
 *    đỏ nghĩa là còn ấm hơn xung quanh, còn tự lên; chỗ cắt lại đường đỏ là
 *    TRẦN THERMAL.
 *  - Dải tím = lớp nghịch nhiệt (càng lên càng nóng) — cái nắp chặn thermal.
 */

import { useEffect, useMemo, useState } from "react";

import {
  dayMay,
  duongBotKhi,
  lopNghichNhiet,
  tranBotKhi,
  type MucSkewT,
  type ThamKhong,
} from "@/lib/baobay/skew-t";
import { huongTheoNgonNgu } from "@/lib/i18n/thoi-tiet";
import { useManHinhHep } from "./cuon-ngay";

/* ------------------------------------------------------------------ */
/* Khung vẽ                                                            */
/* ------------------------------------------------------------------ */

/**
 * HAI KHUNG VẼ, CHỌN THEO BỀ RỘNG MÀN HÌNH.
 *
 * Máy tính: khung 820×620, chữ 11px — to, rõ, xem được từng mực (chủ 11/09:
 * "để nhỏ quá rất khó nhìn").
 *
 * Điện thoại: KHÔNG dùng lại khung ấy rồi bắt vuốt ngang (chủ 11/09: "bảng
 * skew-T trên mobile không hiện hết mà phải vuốt mới ra đủ"). Vẽ khung hẹp
 * riêng 400×520: lề mỏng hơn, cột gió sát hơn, chữ khai 9px — vì cả khung co
 * xuống vừa màn hình nên 9px trong khung hoá ra ~8px thật, vẫn đọc được, mà cả
 * giản đồ nằm gọn trong một màn.
 */
type Khung = {
  W: number;
  H: number;
  LE: { trai: number; phai: number; tren: number; duoi: number };
  veW: number;
  veH: number;
  chu: number;
  chuNho: number;
};

function taoKhung(hep: boolean): Khung {
  const W = hep ? 400 : 820;
  const H = hep ? 520 : 620;
  const LE = hep
    ? { trai: 40, phai: 54, tren: 12, duoi: 30 }
    : { trai: 62, phai: 92, tren: 16, duoi: 38 };
  return { W, H, LE, veW: W - LE.trai - LE.phai, veH: H - LE.tren - LE.duoi, chu: hep ? 9 : 11, chuNho: hep ? 8 : 10 };
}

/** Khoảng nhiệt độ trục ngang (°C) tại mực dưới cùng. */
const T_MIN = -20;
const T_MAX = 45;
/**
 * ĐỘ XIÊN của trục nhiệt độ — và vì sao đường đỏ hay "nghiêng sang phải".
 *
 * Chủ hỏi 11/09: "sao đường nhiệt độ đều nghiêng sang phải, nhiệt độ tăng theo
 * độ cao à?" — KHÔNG. Trục ngang bị XIÊN có chủ ý: cùng một nhiệt độ thì càng
 * lên cao càng vẽ lệch sang phải. Nhờ thế đoạn nhiệt khô (khí bốc lên nguội
 * 1°C/100m) thành đường gần thẳng đứng, mắt so được ngay lớp nào bốc được.
 * Cái giá phải trả: trời lạnh dần theo độ cao mà đường vẫn có thể nghiêng
 * phải — số trên trục mới là nhiệt độ thật, nên hình này in kèm số °C ở từng
 * mực để khỏi đọc nhầm, và có nút chuyển sang EMAGRAM (không xiên) cho ai
 * muốn nhìn đúng như cảm nhận.
 *
 * Chọn 0,47: đúng bằng độ xiên khiến KHÍ QUYỂN CHUẨN (nguội 6,5°C/km) đọc ra
 * THẲNG ĐỨNG. Nghiêng phải = lớp khí ổn định hơn chuẩn (nguội chậm, thermal
 * yếu); nghiêng trái = nguội nhanh hơn chuẩn, thermal lên khoẻ.
 */
const XIEN = 0.47;

const AP_DUOI = 1000;
/**
 * TRẦN HÌNH = 4.000 m (≈ 616 hPa) — luật chủ 11/09: "dù lượn chỉ cần lên tới
 * khoảng 4.000 m là quá đủ, để cao quá thì phần mình bay bị bóp nhỏ khó nhìn".
 *
 * Mực NGAY TRÊN trần vẫn được lấy để nối đường (nếu không, đường nhiệt độ cụt
 * lửng giữa khung); phần thừa bị cắt bằng clip nên không tràn ra ngoài.
 */
const AP_TREN = 616;

const yTheoAp = (ap: number, k: Khung) =>
  k.LE.tren + (k.veH * (Math.log(AP_TREN) - Math.log(ap))) / (Math.log(AP_TREN) - Math.log(AP_DUOI));

type KieuGian = "skewt" | "emagram";

/** Emagram = cùng một giản đồ nhưng KHÔNG xiên trục: đường đẳng nhiệt thẳng đứng. */
const xTheoNhiet = (t: number, y: number, k: Khung, kieu: KieuGian = "skewt") =>
  k.LE.trai + ((t - T_MIN) / (T_MAX - T_MIN)) * k.veW + (k.LE.tren + k.veH - y) * (kieu === "emagram" ? 0 : XIEN);

/* ------------------------------------------------------------------ */
/* Hình                                                                */
/* ------------------------------------------------------------------ */

export type SkewTProps = {
  /** Slug điểm bay (trang khách hoặc điểm nội bộ). */
  spot: string;
  /** Ngày "YYYY-MM-DD". */
  ngay: string;
  /** Mã mô hình đang xem — để giản đồ khớp với bảng giờ bên cạnh. */
  moHinh?: string;
  /** Độ cao bãi cất cánh (m) — vẽ vạch "bãi" và cho đường thermal xuất phát từ đó. */
  altBai?: number;
  /** Độ cao bãi hạ (m) — vẽ vạch thứ hai, chênh hai vạch là độ cao thả. */
  altHa?: number;
  /** Bãi cất thứ hai (Viên Nam có hai chỗ cất) — vẽ thêm một vạch mảnh. */
  altCat2?: number;
  /** Khung giờ bay của điểm, mặc định 7–17. */
  gioBay?: [number, number];
  /** Chữ nghĩa theo ngôn ngữ trang — thiếu thì dùng tiếng Việt. */
  chu?: ChuSkewT;
  /** Mã ngôn ngữ — để viết tắt hướng gió theo đúng tiếng (B/N/С/北…). */
  lang?: string;
};

/** Nhãn hiện quanh giản đồ, tách ra để trang khách truyền bản đã dịch vào. */
export type ChuSkewT = {
  chartType: string;
  hourLabel: string;
  skewTemp: string;
  skewDew: string;
  skewParcel: string;
  skewDry: string;
  skewTiltNote: string;
  takeoff: string;
  landing: string;
  cloudBase: string;
  thermalTop: string;
  caption: string;
};

const CHU_VI: ChuSkewT = {
  chartType: "Kiểu",
  hourLabel: "Giờ",
  skewTemp: "Nhiệt độ không khí",
  skewDew: "Điểm sương (độ ẩm)",
  skewParcel: "Thermal từ mặt đất",
  skewDry: "Đoạn nhiệt khô −1°C/100m",
  skewTiltNote:
    "Trục nhiệt độ của Skew-T bị xiên: đường đỏ ngả phải KHÔNG phải là càng lên càng nóng — số °C in trên đường mới là nhiệt độ thật. Bấm Emagram để xem trục thẳng.",
  takeoff: "bãi cất",
  landing: "bãi hạ",
  cloudBase: "đáy mây",
  thermalTop: "trần thermal",
  caption: "nhiệt độ (°C), trục ngang · gió m/s bên phải",
};

export function SkewT({ spot, ngay, moHinh, altBai = 0, altHa, altCat2, gioBay = [7, 17], chu = CHU_VI, lang = "vi" }: SkewTProps) {
  /** Màn hẹp thì vẽ khung riêng cho vừa một màn — xem ghi chú ở `taoKhung`. */
  const hep = useManHinhHep(700);
  const khung = taoKhung(hep);
  /**
   * SKEW-T hay EMAGRAM — cùng số liệu, khác mỗi trục nhiệt độ có xiên hay không
   * (chủ 11/09 xin thêm emagram). Emagram dễ đọc hơn cho người mới: đường đỏ
   * nghiêng TRÁI đúng như cảm nhận "càng lên càng lạnh". Skew-T bù lại cho
   * phép so ngay với đoạn nhiệt khô, nên giữ cả hai.
   */
  const [kieu, setKieu] = useState<KieuGian>("skewt");
  const [du, setDu] = useState<{ khoa: string; gio: ThamKhong[]; moHinh: string } | null>(null);
  const [loi, setLoi] = useState<{ khoa: string; cau: string } | null>(null);
  const [gioChon, setGioChon] = useState<string | null>(null);

  /**
   * Khoá của lần tải hiện tại: đổi điểm/ngày/mô hình là đổi khoá, và phần
   * render bên dưới tự coi dữ liệu cũ là "chưa có". Không gọi `setDu(null)`
   * ngay trong effect — eslint chặn đúng (set state trong effect gây render
   * thừa), mà cũng không cần: dữ liệu cũ bị khoá loại ra rồi.
   */
  const khoa = `${spot}|${ngay}|${moHinh ?? ""}`;

  useEffect(() => {
    let huy = false;
    const q = new URLSearchParams({ spot, date: ngay });
    if (moHinh) q.set("model", moHinh);
    fetch(`/api/thoi-tiet/skew-t?${q}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((js) => {
        if (huy) return;
        setDu({ khoa, gio: js.gio ?? [], moHinh: js.moHinh ?? "" });
      })
      .catch(() => {
        if (!huy) setLoi({ khoa, cau: "Không lấy được dữ liệu thám không" });
      });
    return () => {
      huy = true;
    };
  }, [spot, ngay, moHinh, khoa]);

  /** Các giờ trong khung bay — mặc định chọn 13h (lúc thermal mạnh nhất). */
  const duHopLe = du?.khoa === khoa ? du : null;
  const gioTrongKhung = useMemo(
    () => (duHopLe?.gio ?? []).filter((g) => {
      const h = Number(g.gio.slice(11, 13));
      return h >= gioBay[0] && h <= gioBay[1] && g.muc.length >= 3;
    }),
    [duHopLe, gioBay],
  );
  const hienTai =
    gioTrongKhung.find((g) => g.gio === gioChon) ??
    gioTrongKhung.find((g) => g.gio.slice(11, 13) === "13") ??
    gioTrongKhung[Math.floor(gioTrongKhung.length / 2)] ??
    null;

  /**
   * Ba con số mà khối "đọc giản đồ" cần: đáy mây, trần thermal, có nghịch nhiệt
   * hay không. Tính ở đây chứ không để hình tự tính rồi báo ngược lên — báo
   * ngược từ con lên cha phải đi qua effect, mà effect chỉ để set state là thứ
   * eslint chặn đúng.
   */
  const soLieu = (() => {
    const m = hienTai?.muc.filter((x) => x.ap <= AP_DUOI && x.ap >= AP_TREN) ?? [];
    if (!m.length) return { dayMay: null as number | null, tran: null as number | null, coNghich: false };
    const batDau = m.find((x) => x.cao >= altBai - 50) ?? m[0];
    const bot = duongBotKhi(
      { ap: batDau.ap, cao: batDau.cao, nhiet: batDau.nhiet, suong: batDau.suong },
      m.map((x) => ({ ap: x.ap, cao: x.cao })),
    );
    return {
      dayMay: batDau.cao + dayMay(batDau.nhiet, batDau.suong),
      tran: tranBotKhi(bot, m.map((x) => ({ cao: x.cao, nhiet: x.nhiet }))),
      coNghich: lopNghichNhiet(m).length > 0,
    };
  })();

  if (loi?.khoa === khoa) return <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{loi.cau}</div>;
  if (!duHopLe) return <div className="p-3 text-xs text-slate-500">Đang lấy số thám không…</div>;
  if (!hienTai) return <div className="p-3 text-xs text-slate-500">Mô hình không có đủ mực cho ngày này.</div>;

  return (
    <div className="min-w-0">
      {/* Chọn kiểu giản đồ: Skew-T (trục xiên) hay Emagram (trục thẳng). */}
      <div className="mb-2 flex flex-wrap items-center gap-1">
        <span className="text-[11px] font-bold text-slate-500">{chu.chartType}:</span>
        {(
          [
            ["skewt", "Skew-T"],
            ["emagram", "Emagram"],
          ] as Array<[KieuGian, string]>
        ).map(([v, ten]) => (
          <button
            key={v}
            type="button"
            onClick={() => setKieu(v)}
            title={v === "skewt" ? "Trục nhiệt độ xiên — so nhanh với đoạn nhiệt khô" : "Trục nhiệt độ thẳng đứng — đọc như cảm nhận thường"}
            className={
              "rounded px-1.5 py-0.5 text-[11px] font-bold " +
              (kieu === v ? "bg-slate-800 text-white" : "border border-slate-300 bg-white text-slate-700")
            }
          >
            {ten}
          </button>
        ))}
      </div>

      {/* Chọn giờ: mỗi giờ một cột khí khác nhau — sáng còn nắp, trưa mở ra. */}
      <div className="mb-2 flex flex-wrap items-center gap-1">
        <span className="text-[11px] font-bold text-slate-500">{chu.hourLabel}:</span>
        {gioTrongKhung.map((g) => {
          const h = g.gio.slice(11, 16);
          const dang = g.gio === hienTai.gio;
          return (
            <button
              key={g.gio}
              type="button"
              onClick={() => setGioChon(g.gio)}
              className={
                "rounded px-1.5 py-0.5 text-[11px] font-bold " +
                (dang ? "bg-sky-600 text-white" : "border border-slate-300 bg-white text-slate-700")
              }
            >
              {h}
            </button>
          );
        })}
      </div>

      {/* Máy tính: hình to, cuộn ngang nếu chỗ đặt hẹp. Điện thoại: khung hẹp nên vừa màn, không phải vuốt. */}
      <div className={hep ? "" : "overflow-x-auto"}>
        <HinhSkewT muc={hienTai.muc} altBai={altBai} altHa={altHa} altCat2={altCat2} gio={hienTai.gio} k={khung} kieu={kieu} chu={chu} lang={lang} />
      </div>

      <CachDoc coNghich={soLieu.coNghich} tranThermal={soLieu.tran} caoDayMay={soLieu.dayMay} chu={chu} viet={chu === CHU_VI} />
    </div>
  );
}

function HinhSkewT({ muc, altBai, altHa, altCat2, gio, k, kieu, chu, lang }: { muc: MucSkewT[]; altBai: number; altHa?: number; altCat2?: number; gio: string; k: Khung; kieu: KieuGian; chu: ChuSkewT; lang: string }) {
  const { LE } = k;
  const VE_W = k.veW;
  const VE_H = k.veH;
  const W = k.W;
  const H = k.H;
  /** Chỉ tầng mình bay: từ sát đất lên 4.000 m. */
  const trongKhung = muc.filter((m) => m.ap <= AP_DUOI && m.ap >= AP_TREN);
  /** Thêm ĐÚNG MỘT mực trên trần để đường vẽ chạy tới mép khung rồi mới bị cắt. */
  const noiDai = (() => {
    const tren = muc.filter((m) => m.ap < AP_TREN).sort((a, b) => b.ap - a.ap)[0];
    return tren ? [...trongKhung, tren] : trongKhung;
  })();
  /** Mực xuất phát của bọt khí: mực thấp nhất còn NẰM TRÊN bãi (đứng ở bãi thì khí dưới bãi không liên quan). */
  const batDau = trongKhung.find((m) => m.cao >= altBai - 50) ?? trongKhung[0];
  const bot = duongBotKhi(
    { ap: batDau.ap, cao: batDau.cao, nhiet: batDau.nhiet, suong: batDau.suong },
    noiDai.map((m) => ({ ap: m.ap, cao: m.cao })),
  );
  const tranThermal = tranBotKhi(bot, noiDai.map((m) => ({ cao: m.cao, nhiet: m.nhiet })));
  const caoDayMay = batDau.cao + dayMay(batDau.nhiet, batDau.suong);
  const nghich = lopNghichNhiet(trongKhung);

  /** Đổi độ cao (m) sang y bằng cách tra ngược bảng mực — chính xác hơn công thức khí quyển chuẩn. */
  const yTheoCao = (cao: number): number => {
    for (let i = 1; i < trongKhung.length; i++) {
      const a = trongKhung[i - 1];
      const b = trongKhung[i];
      if (cao >= a.cao && cao <= b.cao) {
        const f = (cao - a.cao) / Math.max(1, b.cao - a.cao);
        return yTheoAp(a.ap, k) + (yTheoAp(b.ap, k) - yTheoAp(a.ap, k)) * f;
      }
    }
    return cao < trongKhung[0].cao ? yTheoAp(trongKhung[0].ap, k) : yTheoAp(trongKhung[trongKhung.length - 1].ap, k);
  };

  const duong = (lay: (m: MucSkewT) => number) =>
    noiDai
      .map((m) => {
        const y = yTheoAp(m.ap, k);
        return `${xTheoNhiet(lay(m), y, k, kieu).toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={"block h-auto w-full " + (k.W > 500 ? "min-w-[560px]" : "")}
      role="img"
      aria-label={`Skew-T ${gio}`}
    >
      <defs>
        {/* Cắt mọi đường ở đúng khung vẽ — mực nối dài phía trên không được tràn ra lề. */}
        <clipPath id="khungSkewT">
          <rect x={LE.trai} y={LE.tren} width={VE_W + LE.phai - 20} height={VE_H} />
        </clipPath>
      </defs>
      <rect x={LE.trai} y={LE.tren} width={VE_W + LE.phai - 20} height={VE_H} fill="#f8fafc" />

      {/* Đường đẳng nhiệt xiên, mỗi 10°C */}
      {Array.from({ length: 14 }, (_, i) => T_MIN + i * 5).map((t) => {
        const yD = LE.tren + VE_H;
        const yT = LE.tren;
        const chan = t % 10 === 0;
        return (
          <line
            key={`t${t}`}
            x1={xTheoNhiet(t, yD, k, kieu)}
            y1={yD}
            x2={xTheoNhiet(t, yT, k, kieu)}
            y2={yT}
            stroke={t === 0 ? "#60a5fa" : "#e2e8f0"}
            strokeWidth={t === 0 ? 1.2 : chan ? 0.8 : 0.5}
          />
        );
      })}

      {/* Đoạn nhiệt khô: bọt khí khô nguội 9,8°C/km — đường tham chiếu để mắt so độ nghiêng. */}
      {Array.from({ length: 9 }, (_, i) => -20 + i * 10).map((t0) => {
        const diem: string[] = [];
        for (let ap = AP_DUOI; ap >= AP_TREN; ap -= 25) {
          const y = yTheoAp(ap, k);
          /** Nhiệt độ thế vị không đổi: T = (T0+273,15)·(p/1000)^0,286 − 273,15. */
          const t = (t0 + 273.15) * Math.pow(ap / 1000, 0.286) - 273.15;
          diem.push(`${xTheoNhiet(t, y, k, kieu).toFixed(1)},${y.toFixed(1)}`);
        }
        return <polyline key={`k${t0}`} points={diem.join(" ")} fill="none" stroke="#cbd5e1" strokeWidth={0.6} strokeDasharray="3 3" />;
      })}

      {/* Lớp nghịch nhiệt — dải tím nằm ngang, cái nắp chặn thermal */}
      {nghich.map((n, i) => {
        const y1 = yTheoCao(n.den);
        const y2 = yTheoCao(n.tu);
        return (
          <rect key={`n${i}`} x={LE.trai} y={y1} width={VE_W + LE.phai - 20} height={Math.max(1, y2 - y1)} fill="#a78bfa" opacity={0.16} />
        );
      })}

      {/* Trục áp suất + độ cao */}
      {trongKhung.map((m) => {
        const y = yTheoAp(m.ap, k);
        return (
          <g key={`p${m.ap}`}>
            <line x1={LE.trai} y1={y} x2={LE.trai + VE_W + LE.phai - 20} y2={y} stroke="#e2e8f0" strokeWidth={0.7} />
            <text x={LE.trai - 6} y={y + 3} textAnchor="end" fontSize={k.chu} fill="#64748b">
              {/* Ghi rõ "hPa" — không thì 700 bị đọc nhầm thành 700 mét (chủ 11/09). */}
              {m.ap}
              <tspan fontSize={k.chuNho} fill="#94a3b8">
                {" "}hPa
              </tspan>
            </text>
            <text x={LE.trai - 6} y={y + 12} textAnchor="end" fontSize={k.chuNho} fill="#94a3b8">
              {m.cao >= 1000 ? `${(m.cao / 1000).toFixed(1)}km` : `${Math.round(m.cao)}m`}
            </text>
          </g>
        );
      })}

      {/* Vạch BÃI CẤT CÁNH */}
      {altBai > 0 && (
        <g>
          <line x1={LE.trai} y1={yTheoCao(altBai)} x2={LE.trai + VE_W} y2={yTheoCao(altBai)} stroke="#0f172a" strokeWidth={1} strokeDasharray="5 3" />
          <text x={LE.trai + 3} y={yTheoCao(altBai) - 3} fontSize={k.chu} fontWeight={700} fill="#0f172a">
            {chu.takeoff} {altBai}m
          </text>
        </g>
      )}

      {/* Bãi cất thứ hai (điểm có hai chỗ cất) — vạch mảnh hơn để không tranh chỗ với bãi chính. */}
      {altCat2 !== undefined && altCat2 !== altBai && (
        <g>
          <line x1={LE.trai} y1={yTheoCao(altCat2)} x2={LE.trai + VE_W} y2={yTheoCao(altCat2)} stroke="#0f172a" strokeWidth={0.7} strokeDasharray="3 4" opacity={0.7} />
          <text x={LE.trai + 3} y={yTheoCao(altCat2) - 3} fontSize={k.chuNho} fontWeight={700} fill="#334155">
            {chu.takeoff} {altCat2}m
          </text>
        </g>
      )}

      {/* Vạch BÃI HẠ — chênh với bãi cất là độ cao thả, mốc để xem mây có nằm trong đường bay không. */}
      {altHa !== undefined && altHa < altBai && (
        <g>
          <line x1={LE.trai} y1={yTheoCao(altHa)} x2={LE.trai + VE_W} y2={yTheoCao(altHa)} stroke="#475569" strokeWidth={0.9} strokeDasharray="2 4" />
          <text x={LE.trai + 3} y={yTheoCao(altHa) - 3} fontSize={k.chu} fontWeight={700} fill="#475569">
            {chu.landing} {altHa}m
          </text>
        </g>
      )}

      {/* Đáy mây và trần thermal */}
      {caoDayMay > altBai && (
        <g>
          <line x1={LE.trai} y1={yTheoCao(caoDayMay)} x2={LE.trai + VE_W} y2={yTheoCao(caoDayMay)} stroke="#0284c7" strokeWidth={1} strokeDasharray="2 3" />
          <text x={LE.trai + VE_W - 3} y={yTheoCao(caoDayMay) - 3} textAnchor="end" fontSize={k.chu} fill="#0284c7" fontWeight={700}>
            {chu.cloudBase} ~{Math.round(caoDayMay)}m
          </text>
        </g>
      )}
      {tranThermal !== null && tranThermal > altBai && (
        <g>
          <line x1={LE.trai} y1={yTheoCao(tranThermal)} x2={LE.trai + VE_W} y2={yTheoCao(tranThermal)} stroke="#ea580c" strokeWidth={1.2} />
          <text x={LE.trai + VE_W - 3} y={yTheoCao(tranThermal) + 11} textAnchor="end" fontSize={k.chu} fill="#ea580c" fontWeight={700}>
            {chu.thermalTop} ~{tranThermal}m
          </text>
        </g>
      )}

      {/* Bọt khí, điểm sương, nhiệt độ — cắt theo khung */}
      <g clipPath="url(#khungSkewT)">
      <polyline
        points={bot.map((p) => `${xTheoNhiet(p.nhiet, yTheoAp(p.ap, k), k, kieu).toFixed(1)},${yTheoAp(p.ap, k).toFixed(1)}`).join(" ")}
        fill="none"
        stroke="#f97316"
        strokeWidth={1.6}
        strokeDasharray="5 4"
      />
      <polyline points={duong((m) => m.suong)} fill="none" stroke="#2563eb" strokeWidth={2.4} />
      <polyline points={duong((m) => m.nhiet)} fill="none" stroke="#dc2626" strokeWidth={2.4} />
      </g>

      {/**
       * SỐ °C IN NGAY TRÊN ĐƯỜNG ĐỎ. Trục bị xiên nên mắt dễ đọc nhầm là "càng
       * lên càng nóng"; có số thật ở từng mực thì không cãi nhau nữa (chủ 11/09).
       */}
      <g clipPath="url(#khungSkewT)">
        {trongKhung.map((m) => {
          const y = yTheoAp(m.ap, k);
          return (
            <text
              key={`tt${m.ap}`}
              x={xTheoNhiet(m.nhiet, y, k, kieu) + 4}
              y={y - 4}
              fontSize={k.chuNho}
              fontWeight={700}
              fill="#b91c1c"
            >
              {m.nhiet.toFixed(0)}°
            </text>
          );
        })}
      </g>

      {/* Cờ gió bên phải: mũi tên chỉ hướng gió THỔI TỚI, kèm số m/s */}
      {trongKhung.map((m) => {
        if (m.gio === null || m.huong === null) return null;
        const y = yTheoAp(m.ap, k);
        const x = W - LE.phai + 26;
        return (
          <g key={`w${m.ap}`}>
            <g transform={`translate(${x},${y}) rotate(${m.huong + 180})`}>
              <line x1={0} y1={-7} x2={0} y2={7} stroke="#0f172a" strokeWidth={1.2} />
              <polygon points="0,9 -3.2,3 3.2,3" fill="#0f172a" />
            </g>
            <text x={x + 10} y={y + 3} fontSize={k.chu} fill="#334155">
              {m.gio.toFixed(0)}
            </text>
            <text x={x - 12} y={y + 3} textAnchor="end" fontSize={k.chuNho} fill="#64748b">
              {huongTheoNgonNgu(m.huong, lang)}
            </text>
          </g>
        );
      })}

      {/**
       * CHÚ THÍCH NGAY TRÊN HÌNH (chủ 11/09) — bốn đường phải gọi tên tại chỗ,
       * không bắt người xem dò xuống khối chữ bên dưới rồi ngước lên đối chiếu.
       */}
      <g transform={`translate(${LE.trai + 6},${LE.tren + 6})`}>
        <rect x={0} y={0} width={k.W > 500 ? 214 : 170} height={k.W > 500 ? 64 : 54} rx={4} fill="#ffffff" opacity={0.88} stroke="#e2e8f0" />
        {[
          ["#dc2626", chu.skewTemp, "2.4", ""],
          ["#2563eb", chu.skewDew, "2.4", ""],
          ["#f97316", chu.skewParcel, "1.6", "5 4"],
          ["#cbd5e1", chu.skewDry, "1", "3 3"],
        ].map(([mau, ten, day, net], i) => (
          <g key={ten} transform={`translate(8,${(k.W > 500 ? 13 : 11) + i * (k.W > 500 ? 14 : 12)})`}>
            <line x1={0} y1={0} x2={20} y2={0} stroke={mau} strokeWidth={Number(day)} strokeDasharray={net || undefined} />
            <text x={26} y={4} fontSize={k.chu} fill="#334155">
              {ten}
            </text>
          </g>
        ))}
      </g>

      {/* Trục nhiệt độ dưới cùng */}
      {Array.from({ length: 7 }, (_, i) => T_MIN + i * 10).map((t) => (
        <text key={`x${t}`} x={xTheoNhiet(t, LE.tren + VE_H, k, kieu)} y={H - LE.duoi + 14} textAnchor="middle" fontSize={k.chu} fill="#64748b">
          {t}°
        </text>
      ))}
      <text x={LE.trai} y={H - 6} fontSize={k.chu} fill="#94a3b8">
        {gio.slice(11, 16)} · {chu.caption}
      </text>
    </svg>
  );
}

function CachDoc({
  coNghich,
  tranThermal,
  caoDayMay,
  chu,
  viet,
}: {
  coNghich: boolean;
  tranThermal: number | null;
  caoDayMay: number | null;
  chu: ChuSkewT;
  /** Chỉ tiếng Việt mới có bài đọc dài; thứ tiếng khác nhận bản gọn đã dịch. */
  viet: boolean;
}) {
  if (!viet) {
    return (
      <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px] leading-snug text-slate-700">
        <div className="mb-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-1">{chu.skewTiltNote}</div>
        <ul className="ml-3 list-disc space-y-0.5">
          <li>
            <b className="text-rose-700">—</b> {chu.skewTemp}
          </li>
          <li>
            <b className="text-blue-700">—</b> {chu.skewDew}
          </li>
          <li>
            <b className="text-orange-600">- -</b> {chu.skewParcel}
            {tranThermal !== null ? ` · ~${tranThermal}m` : ""}
          </li>
          <li>
            <b className="text-slate-500">- -</b> {chu.skewDry}
          </li>
        </ul>
      </div>
    );
  }
  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px] leading-snug text-slate-700">
      <div className="mb-1 font-bold">Giản đồ này nói gì</div>
      <div className="mb-1">
        Mỗi đường là MỘT SỐ ĐO THEO ĐỘ CAO của cột không khí trên bãi, lúc giờ đang chọn. Trục dọc là độ cao (ghi kèm
        áp suất tính bằng hPa), trục ngang là nhiệt độ.
      </div>
      <div className="mb-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-1">
        <b>Đường đỏ nghiêng sang phải KHÔNG có nghĩa là càng lên càng nóng.</b> Ở kiểu <b>Skew-T</b>, trục nhiệt độ bị
        xiên có chủ ý (để đoạn nhiệt khô thành gần thẳng đứng), nên trời vẫn lạnh dần mà đường có thể ngả phải — số °C
        in ngay trên đường mới là nhiệt độ thật. Nghiêng phải = lớp khí <b>ổn định hơn</b> bình thường (thermal yếu),
        nghiêng trái = nguội nhanh, thermal lên tốt. Muốn nhìn đúng như cảm nhận thì bấm <b>Emagram</b>: trục thẳng,
        đường đỏ ngả trái vì càng lên càng lạnh.
      </div>
      <ul className="ml-3 list-disc space-y-0.5">
        <li>
          <b className="text-rose-700">Đỏ — nhiệt độ không khí</b>: trời ở độ cao ấy đang bao nhiêu độ. Bình thường càng
          lên càng lạnh, nên đường này nghiêng dần sang trái.
        </li>
        <li>
          <b className="text-blue-700">Xanh — điểm sương</b>: không khí phải nguội tới bao nhiêu độ thì hơi nước ngưng
          thành mây. Hai đường <b>sát nhau</b> là không khí ẩm (dễ có mây, mưa rào); <b>tách xa</b> là khô, trời trong,
          thermal không có mây đánh dấu nên khó nhìn.
        </li>
        <li>
          <b className="text-orange-600">Cam đứt nét — thermal từ mặt đất</b>: khối khí nóng tách khỏi mặt đất và bốc
          lên sẽ nguội dần theo đường này. Chừng nào nó còn nằm <b>bên phải đường đỏ</b> (còn ấm hơn trời xung quanh)
          thì còn tự lên — tức là còn nâng để bay; chỗ nó chạm đường đỏ là hết nâng.
        </li>
        <li>
          <b className="text-slate-500">Xám đứt nét — đoạn nhiệt khô</b>: không phải số đo của hôm nay, mà là quy luật
          vật lý — khối khí khô bốc lên thì nguội đúng 1°C mỗi 100m. Vẽ ra để <b>so độ nghiêng với đường đỏ</b>: đoạn nào
          đường đỏ nghiêng đứng như nó là lớp khí đang xáo trộn đều, thermal lên thoải mái; đường đỏ mà <b>đổ sang phải
          hơn</b> là lớp khí bị nén, thermal yếu dần rồi tắt.
        </li>
      </ul>
      <div className="mt-1">
        Vạch ngang: <b>bãi cất</b> và <b>bãi hạ</b> (chênh nhau là độ cao thả)
        {caoDayMay !== null ? (
          <>
            , <b className="text-sky-700">đáy mây ~{Math.round(caoDayMay)}m</b>
          </>
        ) : null}
        {tranThermal !== null ? (
          <>
            , <b className="text-orange-700">trần thermal ~{tranThermal}m</b> — chỗ thermal nguội bằng trời xung quanh
            rồi dừng
          </>
        ) : null}
        .
      </div>
      {coNghich ? (
        <div className="mt-1">
          <span className="inline-block h-2 w-4 rounded-sm bg-violet-300 align-middle" />{" "}
          <b>Dải tím</b> là lớp nghịch nhiệt: càng lên càng NÓNG, thermal lên tới đó là tắt — cái nắp chặn thermal.
        </div>
      ) : (
        <div className="mt-1 opacity-80">Hôm nay không có lớp nghịch nhiệt nào trong tầng này (nếu có, nó hiện thành một dải tím nằm ngang).</div>
      )}
      <div className="mt-1 opacity-80">
        Cột bên phải là gió từng độ cao: mũi tên chỉ chiều gió thổi tới, số là m/s.
      </div>
    </div>
  );
}
