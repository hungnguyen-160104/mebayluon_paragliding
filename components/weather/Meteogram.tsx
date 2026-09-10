"use client";

/**
 * METEOGRAM — biểu đồ nhiều tầng theo giờ, kiểu Windy.
 *
 * Bảng số nói chính xác từng ô, nhưng mắt phải đọc từng ô một. Meteogram nói
 * HÌNH DÁNG CỦA NGÀY trong một cái liếc: mây dày lên lúc nào, mưa rơi vào khúc
 * nào, gió mạnh dần hay dịu đi, áp suất đang lên hay xuống. Người bay quen nhìn
 * hình này trên Windy nên đọc được ngay, không phải học lại.
 *
 * Sáu tầng, xếp đúng thứ tự Windy để ai quen Windy không phải tìm:
 *   giờ → biểu tượng trời → nhiệt độ → gió (mũi tên + tốc độ + giật) →
 *   khối mây/mưa/áp suất → trần mây.
 *
 * VÌ SAO BẢN ĐẦU "KHÔNG NÉT": không phải vì ảnh mờ (SVG là vector, phóng bao
 * nhiêu cũng sắc) mà vì HÌNH THÔ — mây là khối chữ nhật vuông vức đổi màu đột
 * ngột giữa hai giờ, đường nhiệt độ gãy khúc, chữ 8px. Windy mềm vì nó làm ba
 * việc, bản này làm đúng ba việc ấy:
 *  1. Mây vẽ theo LƯỚI MỊN: mỗi giờ chia bốn cột con, phần trăm mây NỘI SUY
 *     giữa hai giờ kề nhau, rồi phủ một bộ lọc mờ nhẹ — thành đám mây có mép
 *     mềm, không còn ô vuông.
 *  2. Đường nhiệt độ và áp suất vẽ bằng ĐƯỜNG CONG (bezier qua các điểm), không
 *     nối thẳng.
 *  3. Cột rộng hơn, chữ 10–12px, khối cao hơn — chỗ để mắt nghỉ.
 *
 * Vẫn SVG thuần, không thư viện: mọi thứ trên đây chỉ là hình chữ nhật, đường
 * cong và một bộ lọc.
 */

import {
  bieuTuongTroi,
  huongChu,
  MUA_DANG_KE,
  sucGio,
  tranMay,
  type GioThoiTiet,
  type MucDo,
} from "@/lib/baobay/thoi-tiet";

import { WindArrow } from "./WindArrow";

type GioVe = GioThoiTiet & { muc?: MucDo };

const MAU_GIO: Record<"nhe" | "vua" | "hoiManh" | "manh" | "ratManh", string> = {
  nhe: "#a7f3d0",
  vua: "#10b981",
  hoiManh: "#fcd34d",
  manh: "#fb923c",
  ratManh: "#f43f5e",
};

/**
 * MÀU HÀNG TRẦN MÂY như Windy: trần cao thì xanh lá (bay thoải mái), thấp dần
 * chuyển xanh nước rồi xám (mây sát bãi). Nhìn dải màu là biết khúc nào mở.
 */
function mauTranMay(cm: number | null, mu: boolean): string {
  if (mu) return "#cbd5e1";
  if (cm === null) return "transparent";
  if (cm >= 2000) return "#bbf7d0";
  if (cm >= 1000) return "#d9f99d";
  if (cm >= 500) return "#e0f2fe";
  return "#bae6fd";
}

/** Bề ngang một cột giờ — rộng để số 11px và mũi tên 22px không chen nhau. */
const W = 56;
/** Chiều cao khối mây/mưa/áp suất — phần "có hình" nhất, cho cao để mây có chỗ tạo hình. */
const H_KHOI = 190;
/** Mỗi giờ chia mấy cột con khi vẽ mây — 4 là đủ mềm, 8 thì thêm nghìn hình mà mắt không thấy khác. */
const CON = 4;

/**
 * ĐƯỜNG CONG MƯỢT qua dãy điểm (Catmull-Rom → bezier bậc ba).
 *
 * Nối thẳng từng đoạn thì đường nhiệt độ gãy khúc ở mỗi mốc giờ — trông như
 * đồ thị bảng tính. Catmull-Rom đi QUA đúng các điểm (không như bezier tự do
 * chỉ tiến gần), nên số in trên đường vẫn đúng chỗ.
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

export function Meteogram({
  gio,
  altBai = 0,
  tuGio = 4,
  denGio = 21,
}: {
  gio: GioVe[];
  /** Độ cao bãi (m) — để vẽ vạch "mặt bãi" trên trục độ cao. */
  altBai?: number;
  tuGio?: number;
  denGio?: number;
}) {
  const ds = gio.filter((g) => {
    const h = Number(g.gio.slice(11, 13));
    return h >= tuGio && h <= denGio;
  });
  if (ds.length < 2) return null;

  const rong = ds.length * W;
  const xGiua = (i: number) => i * W + W / 2;

  /* ---- Nhiệt độ: đường cong nền, số in đè ---- */
  const nhiet = ds.map((g) => g.nhietDo);
  const tMin = Math.min(...nhiet);
  const tMax = Math.max(...nhiet);
  const H_NHIET = 34;
  const yNhiet = (t: number) => H_NHIET - 6 - ((t - tMin) / Math.max(1, tMax - tMin)) * (H_NHIET - 14);
  const duongNhiet = duongCong(ds.map((g, i) => [xGiua(i), yNhiet(g.nhietDo)]));

  /* ---- Độ cao cho khối mây: 0 → 6km trên mực biển ---- */
  const CAO_MAX = 6000;
  const yCao = (m: number) => H_KHOI - (Math.min(m, CAO_MAX) / CAO_MAX) * H_KHOI;

  /* ---- Áp suất: đường cong ở nửa trên khối, khỏi đè cột mưa ---- */
  const ap = ds.map((g) => g.apSuat).filter((x): x is number => typeof x === "number");
  const apMin = ap.length ? Math.min(...ap) : 0;
  const apMax = ap.length ? Math.max(...ap) : 1;
  const yAp = (p: number) => 18 + (1 - (p - apMin) / Math.max(0.5, apMax - apMin)) * (H_KHOI * 0.38);
  const diemAp: Array<[number, number]> = ds.flatMap((g, i) => (typeof g.apSuat === "number" ? [[xGiua(i), yAp(g.apSuat)] as [number, number]] : []));
  const duongAp = duongCong(diemAp);

  /* ---- Mưa: cột từ đáy khối ---- */
  const muaMax = Math.max(2, ...ds.map((g) => g.mua));

  /**
   * MÂY TRÊN LƯỚI MỊN: nội suy phần trăm mây giữa giờ i và i+1 cho từng cột
   * con. Ba tầng có độ cao khác nhau (thấp 0–2km, giữa 2–6km, cao > 6km vẽ ở
   * dải trên cùng), mỗi tầng tô đậm nhạt theo phần trăm — rồi cả khối phủ một
   * lớp mờ nhẹ ở dưới. Kết quả là đám mây có mép mềm như trên Windy.
   */
  const oMay: Array<{ x: number; y: number; h: number; pt: number }> = [];
  const tang: Array<{ lay: (g: GioVe) => number; y: number; h: number }> = [
    { lay: (g) => g.mayThap ?? 0, y: yCao(2000), h: H_KHOI - yCao(2000) },
    { lay: (g) => g.mayGiua ?? 0, y: yCao(6000), h: yCao(2000) - yCao(6000) },
    { lay: (g) => g.mayCao ?? 0, y: 0, h: Math.max(10, yCao(6000)) },
  ];
  for (let i = 0; i < ds.length; i++) {
    const a = ds[i];
    const b = ds[Math.min(i + 1, ds.length - 1)];
    for (const t of tang) {
      const pa = t.lay(a);
      const pb = t.lay(b);
      for (let k = 0; k < CON; k++) {
        /** Cột con k nằm ở tỉ lệ (k+0.5)/CON giữa hai mốc giờ — cột đầu gần giờ a, cột cuối gần giờ b. */
        const f = (k + 0.5) / CON;
        const pt = pa + (pb - pa) * f;
        if (pt > 8) oMay.push({ x: i * W + (k * W) / CON, y: t.y, h: t.h, pt });
      }
    }
  }

  const gioDem = (g: GioVe) => {
    const h = Number(g.gio.slice(11, 13));
    return h < 6 || h >= 18;
  };

  return (
    <div className="mt-2 overflow-x-auto overscroll-x-contain rounded-xl border border-slate-200 bg-white">
      <div style={{ width: rong + 52 }} className="relative">
        {/* ---- Nhãn trục bên trái ---- */}
        <div className="pointer-events-none absolute left-0 top-0 z-10 flex h-full w-[52px] flex-col text-[10px] font-bold text-slate-400">
          <div className="h-6 pt-1.5">Giờ</div>
          <div className="h-7 pt-1.5">Trời</div>
          <div style={{ height: H_NHIET }} className="pt-2">
            °C
          </div>
          <div className="h-[62px] pt-1.5">Gió m/s</div>
          <div style={{ height: H_KHOI }} className="pt-1.5">
            Mây
            <div className="mt-1 font-normal">mưa mm</div>
            <div className="mt-1 font-normal">áp hPa</div>
          </div>
          <div className="h-6 pt-1.5">Trần m</div>
        </div>

        <div className="ml-[52px]">
          {/* ---- 1. Giờ ---- */}
          <div className="flex h-6 items-center">
            {ds.map((g) => (
              <div
                key={g.gio}
                style={{ width: W }}
                className={
                  "shrink-0 text-center text-[11px] font-bold " +
                  (gioDem(g) ? "bg-indigo-50 " : "") +
                  (Number(g.gio.slice(11, 13)) % 3 === 0 ? "text-slate-800" : "text-slate-400")
                }
              >
                {g.gio.slice(11, 13)}
              </div>
            ))}
          </div>

          {/* ---- 2. Biểu tượng trời ---- */}
          <div className="flex h-7 items-center">
            {ds.map((g) => (
              <div key={g.gio} style={{ width: W }} className={"shrink-0 text-center text-lg leading-none " + (gioDem(g) ? "bg-indigo-50" : "")}>
                {bieuTuongTroi(g.may, g.mua, g.buXa)}
              </div>
            ))}
          </div>

          {/* ---- 3. Nhiệt độ ---- */}
          <div className="relative" style={{ height: H_NHIET }}>
            <svg width={rong} height={H_NHIET} className="absolute inset-0" aria-hidden>
              {ds.map((g, i) => (gioDem(g) ? <rect key={g.gio} x={i * W} y={0} width={W} height={H_NHIET} fill="#eef2ff" /> : null))}
              <path d={`${duongNhiet} L${rong},${H_NHIET} L0,${H_NHIET} Z`} fill="#fde68a" opacity="0.45" />
              <path d={duongNhiet} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round" />
            </svg>
            <div className="relative flex items-start" style={{ height: H_NHIET }}>
              {ds.map((g) => (
                <div key={g.gio} style={{ width: W }} className="shrink-0 pt-1 text-center text-[12px] font-black text-slate-800">
                  {Math.round(g.nhietDo)}°
                </div>
              ))}
            </div>
          </div>

          {/* ---- 4. Gió: mũi tên + tốc độ (nền theo sức gió) + giật ---- */}
          <div className="flex h-[62px] items-stretch">
            {ds.map((g) => (
              <div
                key={g.gio}
                style={{ width: W }}
                className={"shrink-0 pt-0.5 text-center " + (gioDem(g) ? "bg-indigo-50" : "")}
                title={`${huongChu(g.huong)} · giật ${g.giat.toFixed(1)} m/s`}
              >
                <WindArrow deg={g.huong} className="h-[22px] w-[22px] text-slate-600" />
                <div
                  className="mx-1 rounded text-[12px] font-black leading-tight"
                  style={{ background: MAU_GIO[sucGio(g.gio10m)], color: sucGio(g.gio10m) === "nhe" ? "#065f46" : "#fff" }}
                >
                  {g.gio10m.toFixed(1)}
                </div>
                <div className={"text-[10px] leading-tight " + (g.giat >= 14 ? "font-bold text-rose-600" : "text-slate-400")}>
                  {g.giat.toFixed(0)}
                </div>
              </div>
            ))}
          </div>

          {/* ---- 5. Khối chính: mây theo độ cao + mưa + áp suất ---- */}
          <svg width={rong} height={H_KHOI} className="block">
            <defs>
              {/* Bộ lọc mờ cho mây — mép mềm như đám mây thật, không còn ô vuông. */}
              <filter id="mayMem" x="-5%" y="-5%" width="110%" height="110%">
                <feGaussianBlur stdDeviation="3.5" />
              </filter>
            </defs>

            {/* Nền đêm */}
            {ds.map((g, i) => (gioDem(g) ? <rect key={`d${g.gio}`} x={i * W} y={0} width={W} height={H_KHOI} fill="#eef2ff" /> : null))}

            {/* Vạch độ cao tham chiếu (km + feet như Windy) */}
            {[1000, 2000, 3000, 4000, 5000].map((m) => (
              <g key={m}>
                <line x1={0} y1={yCao(m)} x2={rong} y2={yCao(m)} stroke="#e2e8f0" strokeWidth="1" />
                <text x={3} y={yCao(m) - 3} fill="#94a3b8" fontSize="9">
                  {m / 1000}km {Math.round((m * 3.28) / 100) * 100}ft
                </text>
              </g>
            ))}

            {/* Mây: lưới mịn + mờ */}
            <g filter="url(#mayMem)">
              {oMay.map((o, k) => (
                <rect key={k} x={o.x} y={o.y} width={W / CON + 0.6} height={o.h} fill="#64748b" opacity={Math.min(0.72, o.pt / 125)} />
              ))}
            </g>

            {/* Mặt bãi — thứ Windy không có, vì nó không biết bãi mình ở độ cao nào */}
            {altBai > 0 && (
              <g>
                <line x1={0} y1={yCao(altBai)} x2={rong} y2={yCao(altBai)} stroke="#0f766e" strokeWidth="1.5" strokeDasharray="6 3" />
                <text x={3} y={yCao(altBai) - 3} fill="#0f766e" fontSize="9" fontWeight="bold">
                  bãi {altBai}m
                </text>
              </g>
            )}

            {/* Cột mưa */}
            {ds.map((g, i) =>
              g.mua > 0.05 ? (
                <g key={`m${g.gio}`}>
                  <rect
                    x={i * W + W * 0.32}
                    y={H_KHOI - (g.mua / muaMax) * (H_KHOI * 0.42)}
                    width={W * 0.36}
                    height={(g.mua / muaMax) * (H_KHOI * 0.42)}
                    fill={g.mua >= MUA_DANG_KE ? "#2563eb" : "#93c5fd"}
                    rx="2"
                  />
                  {g.mua >= 0.5 && (
                    <text
                      x={xGiua(i)}
                      y={H_KHOI - (g.mua / muaMax) * (H_KHOI * 0.42) - 3}
                      fill="#1d4ed8"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {g.mua.toFixed(1)}
                    </text>
                  )}
                </g>
              ) : null,
            )}

            {/* Áp suất: đường cong mảnh + nhãn */}
            {duongAp && <path d={duongAp} fill="none" stroke="#475569" strokeWidth="1.4" opacity="0.85" strokeLinejoin="round" />}
            {diemAp.length > 0 && (
              <>
                {/* Nhãn đầu đặt ở cột THỨ HAI: cột đầu đã có chữ "3km 9800ft" của trục độ cao, hai chữ chồng nhau. */}
                <text
                  x={(diemAp[1] ?? diemAp[0])[0]}
                  y={(diemAp[1] ?? diemAp[0])[1] - 5}
                  fill="#475569"
                  fontSize="9"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {Math.round(ap[Math.min(1, ap.length - 1)])}hPa
                </text>
                {ap.length > 1 && (
                  <text x={diemAp[diemAp.length - 1][0] - 4} y={diemAp[diemAp.length - 1][1] - 4} fill="#475569" fontSize="9" fontWeight="bold" textAnchor="end">
                    {Math.round(ap[ap.length - 1])}hPa
                  </text>
                )}
              </>
            )}
          </svg>

          {/* ---- 6. Trần mây ---- */}
          <div className="flex h-6 items-center border-t border-slate-200">
            {ds.map((g) => {
              const cm = tranMay(g.nhietDo, g.diemSuong, g.mayThap, g.chenhDoCao ?? 0);
              const mu = cm !== null && cm < 400 && (g.mayThap ?? 0) >= 70;
              return (
                <div
                  key={g.gio}
                  style={{ width: W, background: mauTranMay(cm, mu) }}
                  title={g.mayThap !== undefined ? `mây thấp ${Math.round(g.mayThap)}%` : undefined}
                  className={"h-full shrink-0 pt-1 text-center text-[10px] " + (mu ? "font-bold text-slate-900" : "text-slate-600")}
                >
                  {cm === null ? "–" : cm >= 1000 ? `${(cm / 1000).toFixed(1)}k` : cm}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 px-2 py-1 text-[10px] leading-snug text-slate-500">
        Mây vẽ theo <strong>độ cao thật</strong> (vạch xanh đứt là mặt bãi) · cột xanh là mưa (mm) · đường xám là áp suất
        · nền tím là ban đêm · hàng gió tô theo sức gió, số nhỏ dưới là gió giật · hàng cuối là trần mây tính từ bãi.
      </div>
    </div>
  );
}
