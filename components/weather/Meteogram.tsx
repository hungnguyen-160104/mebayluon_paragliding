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
 * Vẽ bằng SVG thay vì thư viện biểu đồ: chỉ mấy hình chữ nhật và một đường
 * cong, mà thư viện thì kéo theo vài trăm KB và một cách nghĩ riêng về trục —
 * nhiều hơn hẳn phần việc thật.
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

/** Bề ngang một cột giờ. Hẹp thì cả ngày vừa màn hình, rộng thì đọc số dễ. */
const W = 42;
/** Chiều cao khối mây/mưa/áp suất — phần "có hình" nhất của meteogram. */
const H_KHOI = 150;

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

  /* ---- Thang nhiệt độ: chỉ để vẽ đường nền, số vẫn in thẳng ---- */
  const nhiet = ds.map((g) => g.nhietDo);
  const tMin = Math.min(...nhiet);
  const tMax = Math.max(...nhiet);
  const yNhiet = (t: number) => 26 - ((t - tMin) / Math.max(1, tMax - tMin)) * 18;

  /* ---- Thang độ cao cho khối mây: 0 → 6km trên mực biển ---- */
  const CAO_MAX = 6000;
  const yCao = (m: number) => H_KHOI - (Math.min(m, CAO_MAX) / CAO_MAX) * H_KHOI;

  /* ---- Áp suất: đường cong trong khối ---- */
  const ap = ds.map((g) => g.apSuat).filter((x): x is number => typeof x === "number");
  const apMin = ap.length ? Math.min(...ap) : 0;
  const apMax = ap.length ? Math.max(...ap) : 1;
  /** Ép đường áp suất nằm ở nửa trên khối, khỏi đè lên cột mưa. */
  const yAp = (p: number) => 20 + (1 - (p - apMin) / Math.max(0.5, apMax - apMin)) * (H_KHOI * 0.4);

  /* ---- Mưa: cột từ đáy khối lên ---- */
  const muaMax = Math.max(2, ...ds.map((g) => g.mua));

  const duongAp = ds
    .map((g, i) => (typeof g.apSuat === "number" ? `${i === 0 ? "M" : "L"}${i * W + W / 2},${yAp(g.apSuat).toFixed(1)}` : ""))
    .filter(Boolean)
    .join(" ");

  const duongNhiet = ds.map((g, i) => `${i === 0 ? "M" : "L"}${i * W + W / 2},${yNhiet(g.nhietDo).toFixed(1)}`).join(" ");

  return (
    <div className="mt-2 overflow-x-auto overscroll-x-contain rounded-xl border border-slate-200 bg-white">
      <div style={{ width: rong + 46 }} className="relative">
        {/* ---- Nhãn trục bên trái, dính khi cuộn ngang ---- */}
        <div className="pointer-events-none absolute left-0 top-0 z-10 flex h-full w-11 flex-col text-[9px] font-bold text-slate-400">
          <div className="h-5 pt-1">Giờ</div>
          <div className="h-6 pt-1">Trời</div>
          <div className="h-7 pt-1">°C</div>
          <div className="h-[52px] pt-1">m/s</div>
          <div style={{ height: H_KHOI }} className="pt-1">
            Mây
            <div className="mt-1 font-normal">mưa</div>
            <div className="mt-1 font-normal">hPa</div>
          </div>
          <div className="h-5 pt-0.5">Trần</div>
        </div>

        <div className="ml-11">
          {/* ---- 1. Giờ ---- */}
          <div className="flex h-5 items-center">
            {ds.map((g) => (
              <div
                key={g.gio}
                style={{ width: W }}
                className={
                  "shrink-0 text-center text-[10px] font-bold " +
                  (Number(g.gio.slice(11, 13)) % 3 === 0 ? "text-slate-700" : "text-slate-300")
                }
              >
                {g.gio.slice(11, 13)}
              </div>
            ))}
          </div>

          {/* ---- 2. Biểu tượng trời ---- */}
          <div className="flex h-6 items-center">
            {ds.map((g) => (
              <div key={g.gio} style={{ width: W }} className="shrink-0 text-center text-base leading-none">
                {bieuTuongTroi(g.may, g.mua, g.buXa)}
              </div>
            ))}
          </div>

          {/* ---- 3. Nhiệt độ: số + đường nền ---- */}
          <div className="relative h-7">
            <svg width={rong} height={28} className="absolute inset-0" aria-hidden>
              <path d={`${duongNhiet} L${rong},28 L0,28 Z`} fill="#fef3c7" />
              <path d={duongNhiet} fill="none" stroke="#f59e0b" strokeWidth="1.5" />
            </svg>
            <div className="relative flex h-7 items-center">
              {ds.map((g) => (
                <div key={g.gio} style={{ width: W }} className="shrink-0 text-center text-[11px] font-bold text-slate-800">
                  {Math.round(g.nhietDo)}°
                </div>
              ))}
            </div>
          </div>

          {/* ---- 4. Gió: mũi tên + tốc độ (nền theo sức gió) + giật ---- */}
          <div className="flex h-[52px] items-stretch">
            {ds.map((g) => (
              <div key={g.gio} style={{ width: W }} className="shrink-0 text-center" title={`${huongChu(g.huong)} · giật ${g.giat.toFixed(1)} m/s`}>
                <WindArrow deg={g.huong} className="text-slate-600" />
                <div
                  className="mx-0.5 rounded text-[11px] font-black leading-tight"
                  style={{ background: MAU_GIO[sucGio(g.gio10m)], color: sucGio(g.gio10m) === "nhe" ? "#065f46" : "#fff" }}
                >
                  {g.gio10m.toFixed(1)}
                </div>
                <div className={"text-[9px] leading-tight " + (g.giat >= 14 ? "font-bold text-rose-600" : "text-slate-400")}>
                  {g.giat.toFixed(0)}
                </div>
              </div>
            ))}
          </div>

          {/* ---- 5. Khối chính: mây theo độ cao + mưa + áp suất ---- */}
          <svg width={rong} height={H_KHOI} className="block">
            {/**
             * NỀN ĐÊM tô tím nhạt như Windy: mắt tự tách ngày với đêm mà không
             * cần đọc số giờ, và biết ngay khúc nào là khung bay được.
             */}
            {ds.map((g, i) => {
              const h = Number(g.gio.slice(11, 13));
              return h < 6 || h >= 18 ? <rect key={`d${g.gio}`} x={i * W} y={0} width={W} height={H_KHOI} fill="#eef2ff" /> : null;
            })}
            {/**
             * MÂY VẼ THEO ĐỘ CAO THẬT, mỗi tầng một dải:
             *   thấp 0–2km · giữa 2–6km · cao 6km trở lên (vẽ sát mép trên).
             * Đậm nhạt theo phần trăm mây tầng đó — đúng cách Windy vẽ, nên
             * nhìn quen mắt: vệt xám dày ở dưới là mây trùm núi.
             */}
            {ds.map((g, i) => {
              const x = i * W;
              const tang: Array<[number, number, number]> = [
                [g.mayThap ?? 0, yCao(2000), H_KHOI - yCao(2000)],
                [g.mayGiua ?? 0, yCao(6000), yCao(2000) - yCao(6000)],
                [g.mayCao ?? 0, 0, yCao(6000)],
              ];
              return (
                <g key={g.gio}>
                  {tang.map(([pt, y, h], k) =>
                    pt > 5 ? (
                      /**
                       * Vẽ hai lớp: một dải mờ trùm cả tầng, một dải đậm hơn ở
                       * GIỮA tầng. Windy vẽ mây thành đám có lõi đậm chứ không
                       * phải khối chữ nhật phẳng — hai lớp là đủ gợi ra điều đó
                       * mà không cần đến gradient hay bộ lọc làm mờ.
                       */
                      <g key={k}>
                        <rect x={x} y={y} width={W} height={h} fill="#64748b" opacity={Math.min(0.5, pt / 200)} />
                        <rect
                          x={x}
                          y={y + h * 0.25}
                          width={W}
                          height={h * 0.5}
                          fill="#475569"
                          opacity={Math.min(0.55, pt / 160)}
                        />
                      </g>
                    ) : null,
                  )}
                </g>
              );
            })}

            {/* Vạch độ cao tham chiếu + mặt bãi */}
            {[1000, 2000, 3000, 4000, 5000].map((m) => (
              <g key={m}>
                <line x1={0} y1={yCao(m)} x2={rong} y2={yCao(m)} stroke="#cbd5e1" strokeDasharray="3 4" strokeWidth="0.7" />
                {/* Ghi cả feet như Windy — phi công đọc trần bay bằng feet quen hơn. */}
                <text x={2} y={yCao(m) - 2} fill="#94a3b8" fontSize="8">
                  {m / 1000}km {Math.round((m * 3.28) / 100) * 100}ft
                </text>
              </g>
            ))}
            {altBai > 0 && (
              <g>
                <line x1={0} y1={yCao(altBai)} x2={rong} y2={yCao(altBai)} stroke="#0f766e" strokeWidth="1.2" />
                <text x={2} y={yCao(altBai) - 2} fill="#0f766e" fontSize="8" fontWeight="bold">
                  bãi {altBai}m
                </text>
              </g>
            )}

            {/* Cột mưa — từ đáy lên, cao theo lượng mm */}
            {ds.map((g, i) =>
              g.mua > 0.05 ? (
                <g key={`m${g.gio}`}>
                  <rect
                    x={i * W + W * 0.3}
                    y={H_KHOI - (g.mua / muaMax) * (H_KHOI * 0.45)}
                    width={W * 0.4}
                    height={(g.mua / muaMax) * (H_KHOI * 0.45)}
                    fill={g.mua >= MUA_DANG_KE ? "#2563eb" : "#93c5fd"}
                    rx="1"
                  />
                  {g.mua >= 1 && (
                    <text x={i * W + W / 2} y={H_KHOI - (g.mua / muaMax) * (H_KHOI * 0.45) - 2} fill="#1d4ed8" fontSize="8" fontWeight="bold" textAnchor="middle">
                      {g.mua.toFixed(1)}
                    </text>
                  )}
                </g>
              ) : null,
            )}

            {/* Đường áp suất — dấu hiệu sớm nhất của thời tiết chuyển */}
            {duongAp && <path d={duongAp} fill="none" stroke="#475569" strokeWidth="1.2" opacity="0.8" />}
            {ap.length > 0 && (
              <text x={4} y={yAp(ap[0]) - 3} fill="#475569" fontSize="8">
                {Math.round(ap[0])}hPa
              </text>
            )}
          </svg>

          {/* ---- 6. Trần mây ---- */}
          <div className="flex h-5 items-center border-t border-slate-200">
            {ds.map((g) => {
              const cm = tranMay(g.nhietDo, g.diemSuong, g.mayThap, g.chenhDoCao ?? 0);
              const mu = cm !== null && cm < 400 && (g.mayThap ?? 0) >= 70;
              return (
                <div
                  key={g.gio}
                  style={{ width: W, background: mauTranMay(cm, mu) }}
                  title={g.mayThap !== undefined ? `mây thấp ${Math.round(g.mayThap)}%` : undefined}
                  className={"shrink-0 text-center text-[9px] " + (mu ? "font-bold text-slate-900" : "text-slate-600")}
                >
                  {cm === null ? "–" : cm >= 1000 ? `${(cm / 1000).toFixed(1)}k` : cm}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 px-2 py-1 text-[10px] leading-snug text-slate-500">
        Vệt xám là mây vẽ theo <strong>độ cao thật</strong> (vạch xanh là mặt bãi) · cột xanh là mưa (mm) · đường xám là
        áp suất · hàng gió tô theo sức gió, số nhỏ bên dưới là gió giật · hàng cuối là trần mây tính từ bãi.
      </div>
    </div>
  );
}
