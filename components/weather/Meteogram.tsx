"use client";

/**
 * METEOGRAM — biểu đồ nhiều tầng theo giờ, vẽ theo lối Windy, NỐI LIỀN 7 NGÀY.
 *
 * Bảng số nói chính xác từng ô, nhưng mắt phải đọc từng ô một. Meteogram nói
 * HÌNH DÁNG CỦA NGÀY trong một cái liếc: mây dày lên lúc nào, mưa rơi vào khúc
 * nào, gió mạnh dần hay dịu đi, áp suất đang lên hay xuống. Người bay quen nhìn
 * hình này trên Windy nên đọc được ngay, không phải học lại.
 *
 * VÌ SAO NỐI LIỀN NHIỀU NGÀY (luật chủ 10/09): trước đây mỗi lần chỉ vẽ một
 * ngày, muốn xem ngày mai phải ngước lên dải ngày bấm. Gạt ngang dưới biểu đồ
 * mà hết ngày là cụt — trong khi cái người ta muốn thấy là "cơn mưa chiều nay
 * kéo sang sáng mai không". Nay cả dãy ngày nằm trên một dải cuộn ngang; bấm
 * ngày ở dải phía trên thì biểu đồ TRƯỢT tới ngày đó, và ngược lại gạt biểu đồ
 * tới ngày nào thì dải phía trên sáng ngày ấy.
 *
 * Bố cục tầng, theo thứ tự Windy (ảnh chủ gửi 10/09):
 *   tiêu đề ngày (chấm màu + tổng mưa + mọc/lặn) → giờ → biểu tượng trời →
 *   nhiệt độ → gió (mũi tên + tốc độ) → giật → khối MÂY theo độ cao với CỘT
 *   MƯA từng giờ và đường áp suất → trần mây tô màu.
 *
 * Ba việc làm cho hình "nét" như Windy:
 *  1. Mây vẽ theo LƯỚI MỊN: mỗi giờ chia bốn cột con, phần trăm mây NỘI SUY
 *     giữa hai giờ kề nhau, rồi phủ một bộ lọc mờ — thành đám mây mép mềm.
 *  2. Đường nhiệt độ và áp suất là ĐƯỜNG CONG qua các điểm, không gãy khúc.
 *  3. Màu gió/giật CHUYỂN DẦN xanh → vàng → đỏ → đỏ thẫm (xem `mau-gio.ts`),
 *     không nhảy bậc.
 *
 * KHÔNG CÒN hàng "% mưa" (luật chủ 10/09): phần trăm của mô hình là "có mưa ở
 * đâu đó trong ô 25 km", khách đọc thành "mưa cả ngày". Cột mưa theo giờ (mm)
 * nói thẳng: lúc nào, bao nhiêu.
 *
 * Đêm tô theo GIỜ MỌC/LẶN THẬT của từng ngày (mô hình cấp, đổi theo mùa) —
 * không phải 6h/18h cứng. Tháng 12 ở Khau Phạ 6h vẫn còn tối.
 *
 * Vẫn SVG thuần, không thư viện.
 */

import { useCallback, useEffect, useRef } from "react";

import {
  bieuTuongTroi,
  huongChu,
  MUA_BAY,
  MUA_DANG_KE,
  tranMay,
  type GioThoiTiet,
  type MucDo,
} from "@/lib/baobay/thoi-tiet";

import { chuTrenNen, mauGiat, mauGio } from "./mau-gio";
import { WindArrow } from "./WindArrow";

type GioVe = GioThoiTiet & { muc?: MucDo };

/** Một ngày đưa vào biểu đồ — phần tối thiểu của `NgayThoiTiet`. */
export type NgayVe = {
  ngay: string;
  muc: MucDo;
  gio: GioVe[];
  matTroi?: { moc: string; lan: string };
  muaTong?: number;
};

/** Nhãn trục trái — trang khách đưa bản dịch vào, sổ nội bộ dùng tiếng Việt. */
export type NhanMeteogram = {
  gio: string;
  troi: string;
  gioMs: string;
  giat: string;
  may: string;
  mua: string;
  ap: string;
  tran: string;
  matDat: string;
  vuot: string;
};

export const NHAN_METEOGRAM_VI: NhanMeteogram = {
  gio: "Giờ",
  troi: "Trời",
  gioMs: "Gió m/s",
  giat: "Giật",
  may: "Mây",
  mua: "mưa mm",
  ap: "áp hPa",
  tran: "Trần m",
  matDat: "mặt đất",
  vuot: "Vuốt ngang để xem các ngày tiếp theo · bấm ngày ở dải trên để nhảy tới",
};

/** Bề ngang một cột giờ — rộng để số 11px và mũi tên 22px không chen nhau. */
const W = 56;
/** Bề ngang cột nhãn trục trái (dính khi cuộn). */
const W_NHAN = 54;
/** Chiều cao khối mây/mưa/áp suất — phần "có hình" nhất. */
const H_KHOI = 200;
const H_NHIET = 36;
/** Mỗi giờ chia mấy cột con khi vẽ mây — 4 là đủ mềm. */
const CON = 4;

const CHAM_NGAY: Record<MucDo, string> = { xanh: "#16a34a", vang: "#eab308", do: "#e11d48" };

/**
 * MÀU HÀNG TRẦN MÂY như Windy: cao thì xanh lá (bay thoải mái), thấp dần chuyển
 * xanh nước, tím, rồi hồng khi mây sát bãi/mù. Không có mây thấp thì ô xám
 * nhạt "--". Nhìn dải màu là biết khúc nào mở.
 */
function mauTranMay(cm: number | null): string {
  if (cm === null) return "#f1f5f9";
  if (cm >= 1500) return "#bbf7d0";
  if (cm >= 1000) return "#d9f99d";
  if (cm >= 500) return "#bae6fd";
  if (cm >= 200) return "#c7d2fe";
  return "#f5d0fe";
}

/**
 * ĐƯỜNG CONG MƯỢT qua dãy điểm (Catmull-Rom → bezier bậc ba). Đi QUA đúng các
 * điểm nên số in trên đường vẫn đúng chỗ.
 */
function duongCong(diem: Array<[number, number]>): string {
  if (diem.length < 2) return "";
  if (diem.length === 2) return `M${diem[0][0]},${diem[0][1]} L${diem[1][0]},${diem[1][1]}`;
  let d = `M${diem[0][0].toFixed(1)},${diem[0][1].toFixed(1)}`;
  for (let i = 0; i < diem.length - 1; i++) {
    const p0 = diem[Math.max(0, i - 1)];
    const p1 = diem[i];
    const p2 = diem[i + 1];
    const p3 = diem[Math.min(diem.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

/** "05:52" → 5.87 giờ. */
function gioThapPhan(hhmm?: string): number | null {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return null;
  return Number(hhmm.slice(0, 2)) + Number(hhmm.slice(3, 5)) / 60;
}

/** Một cột giờ trên dải, kèm ngày nó thuộc về. */
type Cot = {
  g: GioVe;
  ngay: NgayVe;
  h: number;
  dem: boolean;
  /** Cột đầu tiên của ngày — vẽ vạch phân ngày. */
  dau: boolean;
};

/** Nhãn ngày: "T5 11/09" / "Thu 11/09" theo ngôn ngữ trang. */
function nhanNgay(ngay: string, lang: string): string {
  const ma = lang === "vi" ? "vi-VN" : lang === "zh" ? "zh-CN" : lang === "hi" ? "hi-IN" : lang;
  try {
    return new Date(`${ngay}T12:00:00+07:00`).toLocaleDateString(ma, { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });
  } catch {
    return ngay.slice(5);
  }
}

/**
 * Dựng dải cột từ dãy ngày. Lọc giờ 4–21: đêm khuya không ai bay, vẽ thêm chỉ
 * kéo dài dải cuộn; khoảng trống 22–3h vẫn thấy được nhờ nền đêm hai bên.
 */
function dungCot(ngay: NgayVe[], tuGio: number, denGio: number): Cot[] {
  const cot: Cot[] = [];
  for (const n of ngay) {
    const moc = gioThapPhan(n.matTroi?.moc) ?? 6;
    const lan = gioThapPhan(n.matTroi?.lan) ?? 18;
    let dau = true;
    for (const g of n.gio) {
      const h = Number(g.gio.slice(11, 13));
      if (h < tuGio || h > denGio) continue;
      cot.push({ g, ngay: n, h, dem: h + 0.5 < moc || h + 0.5 >= lan, dau });
      dau = false;
    }
  }
  return cot;
}

/**
 * KHUNG CUỘN dùng chung cho meteogram và airgram: cột nhãn trái dính, dải cột
 * cuộn ngang, đồng bộ hai chiều với ngày đang chọn ở dải phía trên.
 */
function useCuonTheoNgay(cot: Cot[], ngayChon: string | null | undefined, onNgayHien?: (ngay: string) => void) {
  const ref = useRef<HTMLDivElement>(null);
  /** Ngày cuối cùng CHÍNH MÌNH báo lên do người gạt — để không cuộn ngược lại nó. */
  const daBao = useRef<string | null>(null);
  const khung = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !ngayChon || ngayChon === daBao.current) return;
    const i = cot.findIndex((c) => c.ngay.ngay === ngayChon);
    if (i < 0) return;
    el.scrollTo({ left: i * W, behavior: "smooth" });
  }, [ngayChon, cot]);

  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el || !onNgayHien || !cot.length) return;
    if (khung.current !== null) return;
    khung.current = requestAnimationFrame(() => {
      khung.current = null;
      /** Ngày "đang xem" = ngày của cột nằm ở mép trái (cộng nửa cột cho khỏi nhấp nháy ở ranh giới). */
      const i = Math.max(0, Math.min(cot.length - 1, Math.floor((el.scrollLeft + W / 2) / W)));
      const d = cot[i].ngay.ngay;
      if (d !== daBao.current) {
        daBao.current = d;
        onNgayHien(d);
      }
    });
  }, [cot, onNgayHien]);

  return { ref, onScroll };
}

/** Dải TIÊU ĐỀ NGÀY: nhãn dính trong ô ngày, chấm màu mức, tổng mưa, mọc/lặn. */
function HangNgay({ cot, lang }: { cot: Cot[]; lang: string }) {
  const nhom: Array<{ ngay: NgayVe; n: number }> = [];
  for (const c of cot) {
    const cuoi = nhom[nhom.length - 1];
    if (cuoi && cuoi.ngay.ngay === c.ngay.ngay) cuoi.n++;
    else nhom.push({ ngay: c.ngay, n: 1 });
  }
  return (
    <div className="flex h-[22px] items-center border-b border-slate-200 bg-slate-50">
      {nhom.map(({ ngay, n }, k) => {
        const mua = ngay.muaTong ?? ngay.gio.reduce((t, g) => t + (g.mua >= MUA_BAY ? g.mua : 0), 0);
        return (
          <div
            key={ngay.ngay}
            style={{ width: n * W }}
            className={"relative h-full shrink-0 overflow-hidden " + (k > 0 ? "border-l-2 border-slate-300" : "")}
          >
            {/* Nhãn DÍNH bên trái trong ô ngày: gạt tới đâu vẫn thấy đang ở ngày nào. */}
            <div className="sticky left-0 inline-flex h-full items-center gap-1.5 whitespace-nowrap px-1.5 text-[11px] font-bold text-slate-800">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: CHAM_NGAY[ngay.muc] }} aria-hidden />
              {nhanNgay(ngay.ngay, lang)}
              {mua >= MUA_BAY && (
                <span className="rounded bg-blue-600 px-1 text-[10px] font-black text-white">{mua.toFixed(1)}mm</span>
              )}
              {ngay.matTroi && (
                <span className="text-[10px] font-medium text-amber-700">
                  ☀ {ngay.matTroi.moc}–{ngay.matTroi.lan}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Hàng GIỜ: số đậm mỗi 3 tiếng, nền tím khi đêm. */
function HangGio({ cot }: { cot: Cot[] }) {
  return (
    <div className="flex h-[22px] items-center">
      {cot.map((c) => (
        <div
          key={c.g.gio}
          style={{ width: W }}
          className={
            "h-full shrink-0 pt-1 text-center text-[11px] font-bold " +
            (c.dem ? "bg-indigo-50 " : "") +
            (c.dau ? "border-l-2 border-slate-300 " : "") +
            (c.h % 3 === 0 ? "text-slate-800" : "text-slate-400")
          }
        >
          {c.g.gio.slice(11, 13)}
        </div>
      ))}
    </div>
  );
}

/** Hàng gió ở MỘT MỰC: mũi tên + tốc độ trên nền màu chuyển dần. */
function HangGioMuc({
  cot,
  lay,
  layHuong,
  cao,
}: {
  cot: Cot[];
  lay: (g: GioVe) => number | undefined;
  layHuong: (g: GioVe) => number | undefined;
  cao: number;
}) {
  return (
    <div className="flex items-stretch" style={{ height: cao }}>
      {cot.map((c) => {
        const v = lay(c.g);
        const hd = layHuong(c.g);
        const bg = v === undefined ? "#f8fafc" : mauGio(v);
        return (
          <div
            key={c.g.gio}
            style={{ width: W, background: bg, color: chuTrenNen(bg) }}
            className={"flex shrink-0 flex-col items-center justify-center " + (c.dau ? "border-l-2 border-slate-300" : "")}
            title={v === undefined ? undefined : `${v.toFixed(1)} m/s${hd !== undefined ? ` · ${huongChu(hd)}` : ""}`}
          >
            {hd !== undefined && v !== undefined && <WindArrow deg={hd} className="h-[20px] w-[20px]" />}
            <div className="text-[12px] font-black leading-tight">{v === undefined ? "–" : v.toFixed(1)}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ================================================================== */
/* METEOGRAM                                                           */
/* ================================================================== */

export function Meteogram({
  ngay,
  altBai = 0,
  tuGio = 4,
  denGio = 21,
  ngayChon,
  onNgayHien,
  nhan = NHAN_METEOGRAM_VI,
  lang = "vi",
}: {
  /** CẢ DÃY NGÀY — vẽ nối liền trên một dải cuộn ngang. */
  ngay: NgayVe[];
  /** Độ cao bãi (m) — để vẽ vạch "mặt bãi" trên trục độ cao. */
  altBai?: number;
  tuGio?: number;
  denGio?: number;
  /** Ngày đang chọn ở dải phía trên — biểu đồ trượt tới ngày đó. */
  ngayChon?: string | null;
  /** Người gạt biểu đồ sang ngày khác — báo lên để dải phía trên sáng theo. */
  onNgayHien?: (ngay: string) => void;
  nhan?: NhanMeteogram;
  lang?: string;
}) {
  const cot = dungCot(ngay, tuGio, denGio);
  const { ref, onScroll } = useCuonTheoNgay(cot, ngayChon, onNgayHien);
  if (cot.length < 2) return null;

  const rong = cot.length * W;
  const xGiua = (i: number) => i * W + W / 2;

  /* ---- Nhiệt độ: đường cong nền, số in đè ---- */
  const nhiet = cot.map((c) => c.g.nhietDo);
  const tMin = Math.min(...nhiet);
  const tMax = Math.max(...nhiet);
  const yNhiet = (t: number) => H_NHIET - 6 - ((t - tMin) / Math.max(1, tMax - tMin)) * (H_NHIET - 14);
  const duongNhiet = duongCong(cot.map((c, i) => [xGiua(i), yNhiet(c.g.nhietDo)]));

  /* ---- Độ cao cho khối mây: 0 → 6km trên mực biển ---- */
  const CAO_MAX = 6000;
  const yCao = (m: number) => H_KHOI - (Math.min(m, CAO_MAX) / CAO_MAX) * H_KHOI;

  /* ---- Áp suất: đường cong ở nửa trên khối, khỏi đè cột mưa ---- */
  const ap = cot.map((c) => c.g.apSuat).filter((x): x is number => typeof x === "number");
  const apMin = ap.length ? Math.min(...ap) : 0;
  const apMax = ap.length ? Math.max(...ap) : 1;
  const yAp = (p: number) => 18 + (1 - (p - apMin) / Math.max(0.5, apMax - apMin)) * (H_KHOI * 0.36);
  const diemAp: Array<[number, number]> = cot.flatMap((c, i) => (typeof c.g.apSuat === "number" ? [[xGiua(i), yAp(c.g.apSuat)] as [number, number]] : []));
  const duongAp = duongCong(diemAp);
  /** Nhãn áp suất: mỗi ngày một nhãn ở cột thứ ba (cột đầu có chữ trục độ cao). */
  const nhanAp = cot
    .map((c, i) => ({ c, i }))
    .filter(({ c, i }) => c.dau && typeof cot[Math.min(i + 2, cot.length - 1)].g.apSuat === "number")
    .map(({ i }) => {
      const j = Math.min(i + 2, cot.length - 1);
      return { x: xGiua(j), y: yAp(cot[j].g.apSuat as number) - 5, p: Math.round(cot[j].g.apSuat as number) };
    });

  /* ---- Mưa: cột từ đáy khối, cao nhất chiếm 45% khối ---- */
  const muaMax = Math.max(2, ...cot.map((c) => c.g.mua));

  /* ---- Mây trên lưới mịn ---- */
  const oMay: Array<{ x: number; y: number; h: number; pt: number }> = [];
  const tang: Array<{ lay: (g: GioVe) => number; y: number; h: number }> = [
    { lay: (g) => g.mayThap ?? 0, y: yCao(2000), h: H_KHOI - yCao(2000) },
    { lay: (g) => g.mayGiua ?? 0, y: yCao(6000), h: yCao(2000) - yCao(6000) },
    { lay: (g) => g.mayCao ?? 0, y: 0, h: Math.max(12, yCao(6000)) },
  ];
  for (let i = 0; i < cot.length; i++) {
    const a = cot[i].g;
    const b = cot[Math.min(i + 1, cot.length - 1)].g;
    for (const t of tang) {
      const pa = t.lay(a);
      const pb = t.lay(b);
      for (let k = 0; k < CON; k++) {
        const f = (k + 0.5) / CON;
        const pt = pa + (pb - pa) * f;
        if (pt > 8) oMay.push({ x: i * W + (k * W) / CON, y: t.y, h: t.h, pt });
      }
    }
  }

  const nhanTrai = "pt-1 text-[10px] font-bold text-slate-400";

  return (
    <div className="mt-2 rounded-xl border border-slate-200 bg-white">
      <div ref={ref} onScroll={onScroll} className="overflow-x-auto overscroll-x-contain">
        <div className="flex" style={{ width: W_NHAN + rong }}>
          {/* ---- Cột nhãn trục trái — DÍNH khi cuộn ---- */}
          <div className="sticky left-0 z-20 shrink-0 border-r border-slate-200 bg-white" style={{ width: W_NHAN }}>
            <div className="h-[22px] border-b border-slate-200 bg-slate-50" />
            <div className={"h-[22px] " + nhanTrai}>{nhan.gio}</div>
            <div className={"h-[26px] " + nhanTrai}>{nhan.troi}</div>
            <div style={{ height: H_NHIET }} className={nhanTrai}>
              °C
            </div>
            <div className={"h-[44px] " + nhanTrai}>{nhan.gioMs}</div>
            <div className={"h-[20px] " + nhanTrai}>{nhan.giat}</div>
            <div style={{ height: H_KHOI }} className={nhanTrai}>
              {nhan.may}
              <div className="mt-1 font-normal text-blue-600">{nhan.mua}</div>
              <div className="mt-1 font-normal">{nhan.ap}</div>
            </div>
            <div className={"h-[22px] border-t border-slate-200 " + nhanTrai}>{nhan.tran}</div>
          </div>

          <div style={{ width: rong }}>
            <HangNgay cot={cot} lang={lang} />
            <HangGio cot={cot} />

            {/* ---- Biểu tượng trời ---- */}
            <div className="flex h-[26px] items-center">
              {cot.map((c) => (
                <div
                  key={c.g.gio}
                  style={{ width: W }}
                  className={"h-full shrink-0 pt-0.5 text-center text-lg leading-none " + (c.dem ? "bg-indigo-50 " : "") + (c.dau ? "border-l-2 border-slate-300" : "")}
                  title={`${Math.round(c.g.may)}% mây`}
                >
                  {bieuTuongTroi(c.g.may, c.g.mua, c.g.buXa)}
                </div>
              ))}
            </div>

            {/* ---- Nhiệt độ ---- */}
            <div className="relative" style={{ height: H_NHIET }}>
              <svg width={rong} height={H_NHIET} className="absolute inset-0" aria-hidden>
                {cot.map((c, i) => (c.dem ? <rect key={c.g.gio} x={i * W} y={0} width={W} height={H_NHIET} fill="#eef2ff" /> : null))}
                <path d={`${duongNhiet} L${rong},${H_NHIET} L0,${H_NHIET} Z`} fill="#fecaca" opacity="0.5" />
                <path d={duongNhiet} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round" />
                {cot.map((c, i) => (c.dau && i > 0 ? <line key={`v${c.g.gio}`} x1={i * W} y1={0} x2={i * W} y2={H_NHIET} stroke="#cbd5e1" strokeWidth="2" /> : null))}
              </svg>
              <div className="relative flex items-start" style={{ height: H_NHIET }}>
                {cot.map((c) => (
                  <div key={c.g.gio} style={{ width: W }} className="shrink-0 pt-1 text-center text-[13px] font-black text-slate-800">
                    {Math.round(c.g.nhietDo)}°
                  </div>
                ))}
              </div>
            </div>

            {/* ---- Gió mặt đất: mũi tên + tốc độ, nền chuyển dần ---- */}
            <HangGioMuc cot={cot} lay={(g) => g.gio10m} layHuong={(g) => g.huong} cao={44} />

            {/* ---- Giật: hàng riêng như Windy, nền chuyển dần theo thang giật ---- */}
            <div className="flex h-[20px] items-stretch">
              {cot.map((c) => {
                const bg = mauGiat(c.g.giat);
                return (
                  <div
                    key={c.g.gio}
                    style={{ width: W, background: bg, color: chuTrenNen(bg) }}
                    className={"shrink-0 pt-0.5 text-center text-[11px] font-bold leading-tight " + (c.dau ? "border-l-2 border-slate-300" : "")}
                    title={`giật ${c.g.giat.toFixed(1)} m/s`}
                  >
                    {c.g.giat.toFixed(0)}
                  </div>
                );
              })}
            </div>

            {/* ---- Khối chính: mây theo độ cao + cột mưa + áp suất ---- */}
            <svg width={rong} height={H_KHOI} className="block">
              <defs>
                <filter id="mayMem" x="-5%" y="-5%" width="110%" height="110%">
                  <feGaussianBlur stdDeviation="5" />
                </filter>
              </defs>

              {cot.map((c, i) => (c.dem ? <rect key={`d${c.g.gio}`} x={i * W} y={0} width={W} height={H_KHOI} fill="#eef2ff" /> : null))}

              {[1000, 2000, 3000, 4000, 5000].map((m) => (
                <line key={m} x1={0} y1={yCao(m)} x2={rong} y2={yCao(m)} stroke="#e2e8f0" strokeWidth="1" />
              ))}
              {/* Nhãn độ cao lặp mỗi ngày (đầu ngày), vì dải dài — cuộn tới đâu cũng đọc được trục. */}
              {cot.map((c, i) =>
                c.dau
                  ? [1000, 2000, 3000, 4000, 5000].map((m) => (
                      <text key={`${c.g.gio}-${m}`} x={i * W + 3} y={yCao(m) - 3} fill="#94a3b8" fontSize="9">
                        {m / 1000}km {Math.round((m * 3.28) / 100) * 100}ft
                      </text>
                    ))
                  : null,
              )}

              <g filter="url(#mayMem)">
                {oMay.map((o, k) => (
                  <rect key={k} x={o.x} y={o.y} width={W / CON + 0.6} height={o.h} fill="#64748b" opacity={Math.min(0.8, o.pt / 110)} />
                ))}
              </g>

              {altBai > 0 && (
                <g>
                  <line x1={0} y1={yCao(altBai)} x2={rong} y2={yCao(altBai)} stroke="#0f766e" strokeWidth="1.5" strokeDasharray="6 3" />
                  {cot.map((c, i) =>
                    c.dau ? (
                      <text key={`b${c.g.gio}`} x={i * W + 3} y={yCao(altBai) - 3} fill="#0f766e" fontSize="9" fontWeight="bold">
                        bãi {altBai}m
                      </text>
                    ) : null,
                  )}
                </g>
              )}

              {/* Cột mưa từng giờ — xanh đậm là mưa thật (≥ 0,8), nhạt là mưa bay (0,4–0,8); từ 0,3 trở xuống không vẽ. */}
              {cot.map((c, i) =>
                c.g.mua >= MUA_BAY ? (
                  <g key={`m${c.g.gio}`}>
                    <rect
                      x={i * W + W * 0.34}
                      y={H_KHOI - (c.g.mua / muaMax) * (H_KHOI * 0.45)}
                      width={W * 0.32}
                      height={(c.g.mua / muaMax) * (H_KHOI * 0.45)}
                      fill={c.g.mua >= MUA_DANG_KE ? "#2563eb" : "#93c5fd"}
                      rx="2"
                    />
                    {c.g.mua >= MUA_DANG_KE && (
                      <text
                        x={xGiua(i)}
                        y={H_KHOI - (c.g.mua / muaMax) * (H_KHOI * 0.45) - 3}
                        fill="#1d4ed8"
                        fontSize="10"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {c.g.mua.toFixed(1)}mm
                      </text>
                    )}
                  </g>
                ) : null,
              )}

              {duongAp && <path d={duongAp} fill="none" stroke="#475569" strokeWidth="1.4" opacity="0.85" strokeLinejoin="round" />}
              {nhanAp.map((n, k) => (
                <text key={k} x={n.x} y={n.y} fill="#475569" fontSize="9" fontWeight="bold" textAnchor="middle">
                  {n.p}hPa
                </text>
              ))}

              {cot.map((c, i) => (c.dau && i > 0 ? <line key={`v${c.g.gio}`} x1={i * W} y1={0} x2={i * W} y2={H_KHOI} stroke="#cbd5e1" strokeWidth="2" /> : null))}
            </svg>

            {/* ---- Trần mây: ô tô màu như Windy ---- */}
            <div className="flex h-[22px] items-center border-t border-slate-200">
              {cot.map((c) => {
                const cm = tranMay(c.g.nhietDo, c.g.diemSuong, c.g.mayThap, c.g.chenhDoCao ?? 0);
                return (
                  <div
                    key={c.g.gio}
                    style={{ width: W, background: mauTranMay(cm) }}
                    title={c.g.mayThap !== undefined ? `mây thấp ${Math.round(c.g.mayThap)}%${cm !== null ? ` · trần ~${cm}m trên bãi` : ""}` : undefined}
                    className={
                      "h-full shrink-0 pt-1 text-center text-[11px] font-bold " +
                      (cm !== null && cm < 200 ? "text-fuchsia-900" : cm === null ? "text-slate-400" : "text-slate-800") +
                      (c.dau ? " border-l-2 border-slate-300" : "")
                    }
                  >
                    {cm === null ? "--" : cm}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 px-2 py-1 text-[10px] leading-snug text-slate-500">{nhan.vuot}</div>
    </div>
  );
}

/* ================================================================== */
/* AIRGRAM — gió theo độ cao, theo giờ                                */
/* ================================================================== */

/**
 * AIRGRAM: mỗi hàng là một MỰC ĐỘ CAO, từ trên xuống — ~3.000m (700 hPa),
 * ~1.500m (850 hPa), ~750m (925 hPa), mặt đất. Ô nào cũng có mũi tên hướng và
 * tốc độ trên nền màu chuyển dần. Dân bay nhìn hàng dọc một giờ là thấy ngay
 * gió TĂNG THEO ĐỘ CAO hay ĐỔI HƯỚNG ở tầng nào (đứt gió) — thứ bảng mặt đất
 * không bao giờ hiện. Windy có tab này trong bản đầy đủ nhưng bản nhúng chỉ có
 * Basic, nên vẽ lấy từ cùng số liệu Open-Meteo.
 */
export function Airgram({
  ngay,
  altBai = 0,
  tuGio = 4,
  denGio = 21,
  ngayChon,
  onNgayHien,
  nhan = NHAN_METEOGRAM_VI,
  lang = "vi",
}: {
  ngay: NgayVe[];
  altBai?: number;
  tuGio?: number;
  denGio?: number;
  ngayChon?: string | null;
  onNgayHien?: (ngay: string) => void;
  nhan?: NhanMeteogram;
  lang?: string;
}) {
  const cot = dungCot(ngay, tuGio, denGio);
  const { ref, onScroll } = useCuonTheoNgay(cot, ngayChon, onNgayHien);
  if (cot.length < 2) return null;
  const rong = cot.length * W;

  /** Độ cao thật của hai mực dưới lấy từ mô hình (đổi theo áp suất từng ngày); 700 hPa lấy ~3.000m. */
  const h925 = cot.map((c) => c.g.h925).find((x): x is number => typeof x === "number");
  const h850 = cot.map((c) => c.g.h850).find((x): x is number => typeof x === "number");
  const muc: Array<{ ten: string; lay: (g: GioVe) => number | undefined; layHuong: (g: GioVe) => number | undefined; t: (g: GioVe) => number | undefined }> = [
    { ten: "~3000m", lay: (g) => g.gio700, layHuong: (g) => g.huong700, t: (g) => g.t700 },
    { ten: `~${h850 ? Math.round(h850 / 50) * 50 : 1500}m`, lay: (g) => g.gio850, layHuong: (g) => g.huong850, t: (g) => g.t850 },
    { ten: `~${h925 ? Math.round(h925 / 50) * 50 : 750}m`, lay: (g) => g.gio925, layHuong: (g) => g.huong925, t: (g) => g.t925 },
    { ten: nhan.matDat + (altBai ? ` ${altBai}m` : ""), lay: (g) => g.gio10m, layHuong: (g) => g.huong, t: (g) => g.nhietDo },
  ];
  const CAO = 46;
  const nhanTrai = "pt-1 text-[10px] font-bold text-slate-400";

  return (
    <div className="mt-2 rounded-xl border border-slate-200 bg-white">
      <div ref={ref} onScroll={onScroll} className="overflow-x-auto overscroll-x-contain">
        <div className="flex" style={{ width: W_NHAN + rong }}>
          <div className="sticky left-0 z-20 shrink-0 border-r border-slate-200 bg-white" style={{ width: W_NHAN }}>
            <div className="h-[22px] border-b border-slate-200 bg-slate-50" />
            <div className={"h-[22px] " + nhanTrai}>{nhan.gio}</div>
            {muc.map((m) => (
              <div key={m.ten} style={{ height: CAO }} className={nhanTrai + " leading-tight"}>
                {m.ten}
              </div>
            ))}
          </div>
          <div style={{ width: rong }}>
            <HangNgay cot={cot} lang={lang} />
            <HangGio cot={cot} />
            {muc.map((m) => (
              <div key={m.ten} className="relative border-t border-white">
                <HangGioMuc cot={cot} lay={m.lay} layHuong={m.layHuong} cao={CAO} />
                {/* Nhiệt độ mực đó, chữ nhỏ góc phải mỗi ô — để thấy nghịch nhiệt (trên ấm hơn dưới). */}
                <div className="pointer-events-none absolute inset-0 flex">
                  {cot.map((c) => {
                    const t = m.t(c.g);
                    return (
                      <div key={c.g.gio} style={{ width: W }} className="shrink-0 pr-1 pt-0.5 text-right text-[9px] font-semibold text-slate-700/80">
                        {t === undefined ? "" : `${Math.round(t)}°`}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-slate-100 px-2 py-1 text-[10px] leading-snug text-slate-500">{nhan.vuot}</div>
    </div>
  );
}
