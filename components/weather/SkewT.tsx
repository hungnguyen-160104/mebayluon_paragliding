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
import { huongChu } from "@/lib/baobay/thoi-tiet";

/* ------------------------------------------------------------------ */
/* Khung vẽ                                                            */
/* ------------------------------------------------------------------ */

const W = 560;
const H = 430;
const LE = { trai: 54, phai: 78, tren: 14, duoi: 34 };
const VE_W = W - LE.trai - LE.phai;
const VE_H = H - LE.tren - LE.duoi;

/** Khoảng nhiệt độ trục ngang (°C) tại mực dưới cùng. */
const T_MIN = -40;
const T_MAX = 40;
/** Độ xiên: mỗi pixel lên cao thì dịch phải bấy nhiêu pixel. */
const XIEN = 0.55;

const AP_DUOI = 1000;
const AP_TREN = 300;

const yTheoAp = (ap: number) =>
  LE.tren + (VE_H * (Math.log(AP_TREN) - Math.log(ap))) / (Math.log(AP_TREN) - Math.log(AP_DUOI));

const xTheoNhiet = (t: number, y: number) =>
  LE.trai + ((t - T_MIN) / (T_MAX - T_MIN)) * VE_W + (y - LE.tren) * 0 + (LE.tren + VE_H - y) * XIEN;

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
  /** Độ cao bãi cất cánh (m) — vẽ vạch "bãi" và cho bọt khí xuất phát từ đó. */
  altBai?: number;
  /** Khung giờ bay của điểm, mặc định 7–17. */
  gioBay?: [number, number];
};

export function SkewT({ spot, ngay, moHinh, altBai = 0, gioBay = [7, 17] }: SkewTProps) {
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

  /** Các giờ trong khung bay — mặc định chọn 13h (lúc thermal khoẻ nhất). */
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

  if (loi?.khoa === khoa) return <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{loi.cau}</div>;
  if (!duHopLe) return <div className="p-3 text-xs text-slate-500">Đang lấy số thám không…</div>;
  if (!hienTai) return <div className="p-3 text-xs text-slate-500">Mô hình không có đủ mực cho ngày này.</div>;

  return (
    <div className="min-w-0">
      {/* Chọn giờ: mỗi giờ một cột khí khác nhau — sáng còn nắp, trưa mở ra. */}
      <div className="mb-2 flex flex-wrap items-center gap-1">
        <span className="text-[11px] font-bold text-slate-500">Giờ:</span>
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

      <div className="overflow-x-auto">
        <HinhSkewT muc={hienTai.muc} altBai={altBai} gio={hienTai.gio} />
      </div>

      <CachDoc />
    </div>
  );
}

function HinhSkewT({ muc, altBai, gio }: { muc: MucSkewT[]; altBai: number; gio: string }) {
  const trongKhung = muc.filter((m) => m.ap <= AP_DUOI && m.ap >= AP_TREN);
  /** Mực xuất phát của bọt khí: mực thấp nhất còn NẰM TRÊN bãi (đứng ở bãi thì khí dưới bãi không liên quan). */
  const batDau = trongKhung.find((m) => m.cao >= altBai - 50) ?? trongKhung[0];
  const bot = duongBotKhi(
    { ap: batDau.ap, cao: batDau.cao, nhiet: batDau.nhiet, suong: batDau.suong },
    trongKhung.map((m) => ({ ap: m.ap, cao: m.cao })),
  );
  const tranThermal = tranBotKhi(bot, trongKhung.map((m) => ({ cao: m.cao, nhiet: m.nhiet })));
  const caoDayMay = batDau.cao + dayMay(batDau.nhiet, batDau.suong);
  const nghich = lopNghichNhiet(trongKhung);

  /** Đổi độ cao (m) sang y bằng cách tra ngược bảng mực — chính xác hơn công thức khí quyển chuẩn. */
  const yTheoCao = (cao: number): number => {
    for (let i = 1; i < trongKhung.length; i++) {
      const a = trongKhung[i - 1];
      const b = trongKhung[i];
      if (cao >= a.cao && cao <= b.cao) {
        const f = (cao - a.cao) / Math.max(1, b.cao - a.cao);
        return yTheoAp(a.ap) + (yTheoAp(b.ap) - yTheoAp(a.ap)) * f;
      }
    }
    return cao < trongKhung[0].cao ? yTheoAp(trongKhung[0].ap) : yTheoAp(trongKhung[trongKhung.length - 1].ap);
  };

  const duong = (lay: (m: MucSkewT) => number) =>
    trongKhung
      .map((m) => {
        const y = yTheoAp(m.ap);
        return `${xTheoNhiet(lay(m), y).toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block" role="img" aria-label={`Skew-T ${gio}`}>
      <rect x={LE.trai} y={LE.tren} width={VE_W + LE.phai - 20} height={VE_H} fill="#f8fafc" />

      {/* Đường đẳng nhiệt xiên, mỗi 10°C */}
      {Array.from({ length: 17 }, (_, i) => T_MIN + i * 5).map((t) => {
        const yD = LE.tren + VE_H;
        const yT = LE.tren;
        const chan = t % 10 === 0;
        return (
          <line
            key={`t${t}`}
            x1={xTheoNhiet(t, yD)}
            y1={yD}
            x2={xTheoNhiet(t, yT)}
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
          const y = yTheoAp(ap);
          /** Nhiệt độ thế vị không đổi: T = (T0+273,15)·(p/1000)^0,286 − 273,15. */
          const t = (t0 + 273.15) * Math.pow(ap / 1000, 0.286) - 273.15;
          diem.push(`${xTheoNhiet(t, y).toFixed(1)},${y.toFixed(1)}`);
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
        const y = yTheoAp(m.ap);
        return (
          <g key={`p${m.ap}`}>
            <line x1={LE.trai} y1={y} x2={LE.trai + VE_W + LE.phai - 20} y2={y} stroke="#e2e8f0" strokeWidth={0.7} />
            <text x={LE.trai - 6} y={y + 3} textAnchor="end" fontSize={9} fill="#64748b">
              {m.ap}
            </text>
            <text x={LE.trai - 6} y={y + 12} textAnchor="end" fontSize={8} fill="#94a3b8">
              {m.cao >= 1000 ? `${(m.cao / 1000).toFixed(1)}km` : `${Math.round(m.cao)}m`}
            </text>
          </g>
        );
      })}

      {/* Vạch BÃI CẤT CÁNH */}
      {altBai > 0 && (
        <g>
          <line x1={LE.trai} y1={yTheoCao(altBai)} x2={LE.trai + VE_W} y2={yTheoCao(altBai)} stroke="#0f172a" strokeWidth={1} strokeDasharray="5 3" />
          <text x={LE.trai + 3} y={yTheoCao(altBai) - 3} fontSize={9} fontWeight={700} fill="#0f172a">
            bãi {altBai}m
          </text>
        </g>
      )}

      {/* Đáy mây và trần thermal */}
      {caoDayMay > altBai && (
        <g>
          <line x1={LE.trai} y1={yTheoCao(caoDayMay)} x2={LE.trai + VE_W} y2={yTheoCao(caoDayMay)} stroke="#0284c7" strokeWidth={1} strokeDasharray="2 3" />
          <text x={LE.trai + VE_W - 3} y={yTheoCao(caoDayMay) - 3} textAnchor="end" fontSize={9} fill="#0284c7" fontWeight={700}>
            đáy mây ~{Math.round(caoDayMay)}m
          </text>
        </g>
      )}
      {tranThermal !== null && tranThermal > altBai && (
        <g>
          <line x1={LE.trai} y1={yTheoCao(tranThermal)} x2={LE.trai + VE_W} y2={yTheoCao(tranThermal)} stroke="#ea580c" strokeWidth={1.2} />
          <text x={LE.trai + VE_W - 3} y={yTheoCao(tranThermal) + 11} textAnchor="end" fontSize={9} fill="#ea580c" fontWeight={700}>
            trần thermal ~{tranThermal}m
          </text>
        </g>
      )}

      {/* Bọt khí, điểm sương, nhiệt độ */}
      <polyline
        points={bot.map((p) => `${xTheoNhiet(p.nhiet, yTheoAp(p.ap)).toFixed(1)},${yTheoAp(p.ap).toFixed(1)}`).join(" ")}
        fill="none"
        stroke="#f97316"
        strokeWidth={1.6}
        strokeDasharray="5 4"
      />
      <polyline points={duong((m) => m.suong)} fill="none" stroke="#2563eb" strokeWidth={2} />
      <polyline points={duong((m) => m.nhiet)} fill="none" stroke="#dc2626" strokeWidth={2} />

      {/* Cờ gió bên phải: mũi tên chỉ hướng gió THỔI TỚI, kèm số m/s */}
      {trongKhung.map((m) => {
        if (m.gio === null || m.huong === null) return null;
        const y = yTheoAp(m.ap);
        const x = W - LE.phai + 26;
        return (
          <g key={`w${m.ap}`}>
            <g transform={`translate(${x},${y}) rotate(${m.huong + 180})`}>
              <line x1={0} y1={-7} x2={0} y2={7} stroke="#0f172a" strokeWidth={1.2} />
              <polygon points="0,9 -3.2,3 3.2,3" fill="#0f172a" />
            </g>
            <text x={x + 10} y={y + 3} fontSize={9} fill="#334155">
              {m.gio.toFixed(0)}
            </text>
            <text x={x - 12} y={y + 3} textAnchor="end" fontSize={8} fill="#64748b">
              {huongChu(m.huong)}
            </text>
          </g>
        );
      })}

      {/* Trục nhiệt độ dưới cùng */}
      {Array.from({ length: 9 }, (_, i) => T_MIN + i * 10).map((t) => (
        <text key={`x${t}`} x={xTheoNhiet(t, LE.tren + VE_H)} y={H - LE.duoi + 14} textAnchor="middle" fontSize={9} fill="#64748b">
          {t}°
        </text>
      ))}
      <text x={LE.trai} y={H - 6} fontSize={9} fill="#94a3b8">
        {gio.slice(11, 16)} · nhiệt độ (°C), trục xiên · gió m/s bên phải
      </text>
    </svg>
  );
}

function CachDoc() {
  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px] leading-snug text-slate-700">
      <div className="mb-1 font-bold">Đọc giản đồ</div>
      <div>
        <span className="font-bold text-rose-700">— đỏ</span> nhiệt độ ·{" "}
        <span className="font-bold text-blue-700">— xanh</span> điểm sương: hai đường sát nhau là không khí ẩm (dễ có mây,
        mưa rào), tách xa là khô — thermal “xanh”, khó nhìn.
      </div>
      <div>
        <span className="font-bold text-orange-600">- - cam</span> là bọt khí nóng bốc lên từ bãi. Còn nằm bên phải đường đỏ
        là còn ấm hơn xung quanh nên còn tự lên; chỗ cắt lại đường đỏ là <b>trần thermal</b>.
      </div>
      <div>
        Dải <span className="font-bold text-violet-700">tím</span> là lớp nghịch nhiệt — càng lên càng nóng, thermal bị chặn
        ở đó. Đường xám đứt nét là đoạn nhiệt khô để so độ nghiêng.
      </div>
    </div>
  );
}
