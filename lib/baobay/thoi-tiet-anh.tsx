// lib/baobay/thoi-tiet-anh.tsx
/**
 * ẢNH PNG cho thư dự báo 20h (chủ 29/09/2026): BIỂU ĐỒ GIÓ theo tầng × giờ và
 * GIẢN ĐỒ SKEW-T lúc 12h.
 *
 * Vì sao PNG mà không SVG: Gmail và phần lớn ứng dụng thư chặn SVG. Vẽ bằng
 * `next/og` (satori + resvg) — có sẵn trong Next, chạy được trên Vercel, tự đổi
 * chữ thành nét theo font nạp vào (Be Vietnam Pro, đủ dấu tiếng Việt, giấy
 * phép OFL — lib/fonts). Ảnh vẽ gấp đôi (1200 px) để nét trên điện thoại.
 *
 * Satori: mọi <div> có hơn một con phải `display:flex`; chữ không đặt trong
 * <svg> (không vẽ được) mà đặt ở <div position:absolute> đè lên.
 */
import React from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";

import { duongBotKhi, dayMay, lopNghichNhiet, tranBotKhi, type MucSkewT } from "./skew-t";
import { huongChu, type GioThoiTiet } from "./thoi-tiet";
import { GIO_PHAN_TICH } from "./phan-tich-cao";

let fontCache: Array<{ name: string; data: Buffer; weight: 400 | 700; style: "normal" }> | null = null;
function fonts() {
  if (!fontCache) {
    const dir = path.join(process.cwd(), "lib", "fonts");
    fontCache = [
      { name: "BVP", data: readFileSync(path.join(dir, "BeVietnamPro-Regular.ttf")), weight: 400, style: "normal" },
      { name: "BVP", data: readFileSync(path.join(dir, "BeVietnamPro-Bold.ttf")), weight: 700, style: "normal" },
    ];
  }
  return fontCache;
}

async function png(el: React.ReactElement, width: number, height: number): Promise<Buffer> {
  const r = new ImageResponse(el, { width, height, fonts: fonts() });
  return Buffer.from(await r.arrayBuffer());
}

/* ------------------------------------------------------------------ */
/* Màu theo sức gió (m/s)                                              */
/* ------------------------------------------------------------------ */
function mauGio(v: number): { nen: string; chu: string } {
  if (v < 2) return { nen: "#e0f2fe", chu: "#0c4a6e" };
  if (v < 4) return { nen: "#bbf7d0", chu: "#14532d" };
  if (v < 6) return { nen: "#fef08a", chu: "#713f12" };
  if (v < 8) return { nen: "#fdba74", chu: "#7c2d12" };
  if (v < 11) return { nen: "#f87171", chu: "#450a0a" };
  return { nen: "#b91c1c", chu: "#ffffff" };
}

/** Mũi tên chỉ hướng GIÓ THỔI ĐI (ngược hướng gió tới), gốc hướng lên = Bắc. */
function MuiTen({ huong, size, mau }: { huong: number; size: number; mau: string }) {
  return (
    <div style={{ display: "flex", width: size, height: size, transform: `rotate(${(huong + 180) % 360}deg)` }}>
      <svg width={size} height={size} viewBox="0 0 24 24">
        <path d="M12 2 L19 12 L14 12 L14 22 L10 22 L10 12 L5 12 Z" fill={mau} />
      </svg>
    </div>
  );
}

const W = 1200;

/**
 * BIỂU ĐỒ GIÓ (windgram): hàng = tầng (700 / 850 / 925 hPa / mặt đất / giật),
 * cột = giờ 8h–16h. Mỗi ô: nền theo sức gió, mũi tên hướng gió, số m/s.
 */
export async function anhBieuDoGio(opts: {
  ten: string;
  nhanNgay: string;
  gio: GioThoiTiet[];
  altCat: number;
}): Promise<Buffer> {
  const ds = opts.gio.filter((g) => {
    const h = Number(g.gio.slice(11, 13));
    return h >= GIO_PHAN_TICH[0] && h <= GIO_PHAN_TICH[1];
  });
  const tb = (k: keyof GioThoiTiet, macDinh: number) => {
    const v = ds.map((g) => g[k]).filter((x): x is number => typeof x === "number");
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length / 50) * 50 : macDinh;
  };
  const hang: Array<{ nhan: string; phu: string; v: (g: GioThoiTiet) => number | undefined; d: (g: GioThoiTiet) => number | undefined; laBay?: boolean }> = [
    { nhan: "~3.000 m", phu: "700 hPa", v: (g) => g.gio700, d: (g) => g.huong700 },
    { nhan: `~${tb("h850", 1500).toLocaleString("vi-VN")} m`, phu: "850 hPa", v: (g) => g.gio850, d: (g) => g.huong850 },
    { nhan: `~${tb("h925", 800).toLocaleString("vi-VN")} m`, phu: "925 hPa", v: (g) => g.gio925, d: (g) => g.huong925 },
    { nhan: "Mặt đất", phu: "10 m", v: (g) => g.gio10m, d: (g) => g.huong, laBay: true },
  ];
  const TRAI = 200;
  const COT = Math.floor((W - TRAI - 30) / Math.max(1, ds.length));
  const HANG = 96;
  const DAU = 150;
  const H = DAU + 40 + HANG * hang.length + 70 + 60;

  return png(
    <div style={{ display: "flex", flexDirection: "column", width: W, height: H, background: "#ffffff", fontFamily: "BVP", padding: "24px 20px 0 10px" }}>
      <div style={{ display: "flex", flexDirection: "column", marginLeft: 14 }}>
        <div style={{ display: "flex", fontSize: 38, fontWeight: 700, color: "#0f172a" }}>{`Gió theo độ cao — ${opts.ten}`}</div>
        <div style={{ display: "flex", fontSize: 26, color: "#475569", marginTop: 4 }}>{`${opts.nhanNgay} · bãi cất ${opts.altCat.toLocaleString("vi-VN")} m · mũi tên = hướng gió thổi tới · số = m/s`}</div>
      </div>
      <div style={{ display: "flex", marginTop: 26, marginLeft: TRAI }}>
        {ds.map((g) => (
          <div key={g.gio} style={{ display: "flex", width: COT, justifyContent: "center", fontSize: 26, fontWeight: 700, color: "#334155" }}>
            {`${Number(g.gio.slice(11, 13))}h`}
          </div>
        ))}
      </div>
      {hang.map((r) => (
        <div key={r.phu} style={{ display: "flex", height: HANG, marginTop: 4 }}>
          <div style={{ display: "flex", flexDirection: "column", width: TRAI, justifyContent: "center", paddingLeft: 14 }}>
            <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: "#0f172a" }}>{r.nhan}</div>
            <div style={{ display: "flex", fontSize: 21, color: "#64748b" }}>{r.phu}</div>
          </div>
          {ds.map((g) => {
            const v = r.v(g);
            const d = r.d(g);
            if (typeof v !== "number") {
              return <div key={g.gio} style={{ display: "flex", width: COT - 4, marginRight: 4, background: "#f1f5f9", borderRadius: 10 }} />;
            }
            const m = mauGio(v);
            return (
              <div key={g.gio} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: COT - 4, marginRight: 4, background: m.nen, borderRadius: 10 }}>
                {typeof d === "number" ? <MuiTen huong={d} size={38} mau={m.chu} /> : <div style={{ display: "flex", height: 38 }} />}
                <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: m.chu, marginTop: 2 }}>{v.toFixed(v >= 10 ? 0 : 1).replace(".", ",")}</div>
              </div>
            );
          })}
        </div>
      ))}
      <div style={{ display: "flex", height: 70, marginTop: 4 }}>
        <div style={{ display: "flex", flexDirection: "column", width: TRAI, justifyContent: "center", paddingLeft: 14 }}>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: "#be123c" }}>Gió giật</div>
          <div style={{ display: "flex", fontSize: 21, color: "#64748b" }}>mặt đất</div>
        </div>
        {ds.map((g) => (
          <div key={g.gio} style={{ display: "flex", width: COT - 4, marginRight: 4, justifyContent: "center", alignItems: "center", fontSize: 27, fontWeight: 700, color: g.giat >= 8 ? "#be123c" : "#334155" }}>
            {g.giat.toFixed(g.giat >= 10 ? 0 : 1).replace(".", ",")}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", marginLeft: 14, marginTop: 8, fontSize: 21, color: "#475569", alignItems: "center" }}>
        {[
          ["#e0f2fe", "<2"],
          ["#bbf7d0", "2–4"],
          ["#fef08a", "4–6"],
          ["#fdba74", "6–8"],
          ["#f87171", "8–11"],
          ["#b91c1c", "≥11 m/s"],
        ].map(([c, t]) => (
          <div key={t} style={{ display: "flex", alignItems: "center", marginRight: 22 }}>
            <div style={{ display: "flex", width: 26, height: 20, background: c, borderRadius: 4, marginRight: 8 }} />
            {t}
          </div>
        ))}
      </div>
    </div>,
    W,
    H,
  );
}

/**
 * GIẢN ĐỒ SKEW-T (trục đứng theo độ cao 0–5.000 m cho dễ đọc với phi công dù
 * lượn; trục ngang nhiệt độ xiên 8°C mỗi km). Nhiệt độ đỏ, điểm sương xanh,
 * đường bọt khí cam đứt nét, nghịch nhiệt tô vàng, vạch bãi cất/đáy mây/trần
 * thermal, cột gió bên phải.
 */
export async function anhSkewT(opts: {
  ten: string;
  nhanNgay: string;
  gio: string;
  muc: MucSkewT[];
  altCat: number;
  altHa?: number;
}): Promise<Buffer> {
  const H = 1100;
  const TRAI = 120;
  const PHAI = 190;
  const TREN = 130;
  const DUOI = 70;
  const plotW = W - TRAI - PHAI;
  const plotH = H - TREN - DUOI;
  const CAO_MAX = 5000;
  const XIEN = 8; // °C mỗi km

  const m = opts.muc.filter((x) => Number.isFinite(x.nhiet) && Number.isFinite(x.suong) && x.cao <= CAO_MAX + 600).sort((a, b) => a.cao - b.cao);
  /** Mực sát bãi cất nhất — cùng cách với phanTichSkewT để số trên ảnh khớp chữ trong thư. */
  const batDau = m.length ? m.reduce((a, b) => (Math.abs(b.cao - opts.altCat) < Math.abs(a.cao - opts.altCat) ? b : a), m[0]) : undefined;
  const bot = batDau ? duongBotKhi({ ap: batDau.ap, cao: batDau.cao, nhiet: batDau.nhiet, suong: batDau.suong }, m.map((x) => ({ ap: x.ap, cao: x.cao }))) : [];
  const lcl = batDau ? batDau.cao + dayMay(batDau.nhiet, batDau.suong) : null;
  const tran = tranBotKhi(bot, m.map((x) => ({ cao: x.cao, nhiet: x.nhiet })));
  const nghich = lopNghichNhiet(m).filter((l) => l.tu < CAO_MAX);

  const xien = (t: number, cao: number) => t + (XIEN * cao) / 1000;
  const giaTri = [...m.flatMap((x) => [xien(x.nhiet, x.cao), xien(x.suong, x.cao)]), ...bot.map((p) => xien(p.nhiet, p.cao))].filter(Number.isFinite);
  const tMin = Math.floor((Math.min(...giaTri) - 3) / 5) * 5;
  const tMax = Math.ceil((Math.max(...giaTri) + 3) / 5) * 5;
  const X = (t: number, cao: number) => TRAI + ((xien(t, cao) - tMin) / (tMax - tMin)) * plotW;
  const Y = (cao: number) => TREN + plotH - (Math.min(CAO_MAX, Math.max(0, cao)) / CAO_MAX) * plotH;
  const duong = (ds: Array<{ t: number; cao: number }>) =>
    ds.filter((p) => p.cao <= CAO_MAX).map((p, i) => `${i ? "L" : "M"}${X(p.t, p.cao).toFixed(1)} ${Y(p.cao).toFixed(1)}`).join(" ");

  /** Đường đẳng nhiệt 10°C một: từ đáy lên đỉnh là đường xiên. */
  const dangNhiet: number[] = [];
  for (let t = Math.floor((tMin - (XIEN * CAO_MAX) / 1000) / 10) * 10; t <= tMax; t += 10) dangNhiet.push(t);
  /** Đoạn nhiệt khô: T0 giảm 9,8°C/km. */
  const doanNhiet: number[] = [];
  for (let t0 = Math.floor(tMin / 10) * 10; t0 <= tMax + 50; t0 += 10) doanNhiet.push(t0);

  const clip = { x: TRAI, y: TREN, w: plotW, h: plotH };
  const vach = (cao: number, mau: string, day: number, net?: string) => (
    <line x1={TRAI} y1={Y(cao)} x2={TRAI + plotW} y2={Y(cao)} stroke={mau} strokeWidth={day} strokeDasharray={net} />
  );
  const nhanVach: Array<{ cao: number; chu: string; mau: string }> = [];
  nhanVach.push({ cao: opts.altCat, chu: `Bãi cất ${opts.altCat.toLocaleString("vi-VN")} m`, mau: "#0f172a" });
  if (opts.altHa !== undefined && opts.altHa !== opts.altCat) nhanVach.push({ cao: opts.altHa, chu: `Bãi hạ ${opts.altHa.toLocaleString("vi-VN")} m`, mau: "#334155" });
  if (lcl !== null && lcl < CAO_MAX) nhanVach.push({ cao: lcl, chu: `Đáy mây ~${(Math.round(lcl / 50) * 50).toLocaleString("vi-VN")} m`, mau: "#0369a1" });
  if (tran !== null && tran < CAO_MAX) nhanVach.push({ cao: tran, chu: `Trần thermal ~${(Math.round(tran / 50) * 50).toLocaleString("vi-VN")} m`, mau: "#c2410c" });
  /** Tránh nhãn đè nhau: đẩy nhãn sau xuống nếu sát nhãn trước. */
  const nhanSap = [...nhanVach].sort((a, b) => b.cao - a.cao);
  let yTruoc = -999;
  const viTriNhan = nhanSap.map((n) => {
    let y = Y(n.cao) - 34;
    if (y < yTruoc + 34) y = yTruoc + 34;
    yTruoc = y;
    return { ...n, y };
  });

  const mucGio = m.filter((x) => x.cao <= CAO_MAX && x.gio !== null && x.huong !== null && x.cao >= opts.altCat - 300);

  return png(
    <div style={{ display: "flex", position: "relative", width: W, height: H, background: "#ffffff", fontFamily: "BVP" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <clipPath id="k">
            <rect x={clip.x} y={clip.y} width={clip.w} height={clip.h} />
          </clipPath>
        </defs>
        <rect x={TRAI} y={TREN} width={plotW} height={plotH} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={2} />
        <g clipPath="url(#k)">
          {nghich.map((l, i) => (
            <rect key={i} x={TRAI} y={Y(l.den)} width={plotW} height={Math.max(2, Y(l.tu) - Y(l.den))} fill="#fde68a" opacity={0.55} />
          ))}
          {[0, 1000, 2000, 3000, 4000, 5000].map((c) => (
            <line key={c} x1={TRAI} y1={Y(c)} x2={TRAI + plotW} y2={Y(c)} stroke="#e2e8f0" strokeWidth={2} />
          ))}
          {dangNhiet.map((t) => (
            <path key={`t${t}`} d={duong([{ t, cao: 0 }, { t, cao: CAO_MAX }])} stroke={t === 0 ? "#60a5fa" : "#cbd5e1"} strokeWidth={t === 0 ? 2.5 : 1.5} fill="none" />
          ))}
          {doanNhiet.map((t0) => (
            <path key={`d${t0}`} d={duong([0, 1000, 2000, 3000, 4000, 5000].map((c) => ({ t: t0 - 9.8 * (c / 1000), cao: c })))} stroke="#d6d3d1" strokeWidth={1.5} strokeDasharray="10 8" fill="none" />
          ))}
          {vach(opts.altCat, "#0f172a", 2.5, "12 8")}
          {opts.altHa !== undefined && opts.altHa !== opts.altCat ? vach(opts.altHa, "#64748b", 2, "6 8") : null}
          {lcl !== null && lcl < CAO_MAX ? vach(lcl, "#0369a1", 3) : null}
          {tran !== null && tran < CAO_MAX ? vach(tran, "#c2410c", 3, "14 6") : null}
          <path d={duong(bot.map((p) => ({ t: p.nhiet, cao: p.cao })))} stroke="#f97316" strokeWidth={5} strokeDasharray="16 10" fill="none" />
          <path d={duong(m.map((x) => ({ t: x.suong, cao: x.cao })))} stroke="#16a34a" strokeWidth={6} fill="none" strokeLinejoin="round" />
          <path d={duong(m.map((x) => ({ t: x.nhiet, cao: x.cao })))} stroke="#dc2626" strokeWidth={6} fill="none" strokeLinejoin="round" />
        </g>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", position: "absolute", left: 24, top: 18 }}>
        <div style={{ display: "flex", fontSize: 38, fontWeight: 700, color: "#0f172a" }}>{`Skew-T ${opts.gio} — ${opts.ten}`}</div>
        <div style={{ display: "flex", fontSize: 24, color: "#475569", marginTop: 4, alignItems: "center" }}>
          {[
            ["#dc2626", "nhiệt độ"],
            ["#16a34a", "điểm sương"],
            ["#f97316", "bọt khí từ bãi cất"],
            ["#fde68a", "nghịch nhiệt"],
          ].map(([c, t]) => (
            <div key={t} style={{ display: "flex", alignItems: "center", marginRight: 18 }}>
              <div style={{ display: "flex", width: 28, height: 8, background: c, borderRadius: 3, marginRight: 7 }} />
              {t}
            </div>
          ))}
          <div style={{ display: "flex" }}>{opts.nhanNgay}</div>
        </div>
      </div>
      {[0, 1000, 2000, 3000, 4000, 5000].map((c) => (
        <div key={c} style={{ display: "flex", position: "absolute", left: 8, top: Y(c) - 16, width: TRAI - 16, justifyContent: "flex-end", fontSize: 24, color: "#475569" }}>
          {`${c.toLocaleString("vi-VN")} m`}
        </div>
      ))}
      {dangNhiet
        .filter((t) => X(t, 0) >= TRAI && X(t, 0) <= TRAI + plotW)
        .map((t) => (
          <div key={t} style={{ display: "flex", position: "absolute", left: X(t, 0) - 30, top: TREN + plotH + 10, width: 60, justifyContent: "center", fontSize: 22, color: "#64748b" }}>
            {`${t}°`}
          </div>
        ))}
      {viTriNhan.map((n) => (
        <div key={n.chu} style={{ display: "flex", position: "absolute", left: TRAI + 10, top: n.y, fontSize: 25, fontWeight: 700, color: n.mau, background: "rgba(255,255,255,0.85)", padding: "0 6px", borderRadius: 6 }}>
          {n.chu}
        </div>
      ))}
      <div style={{ display: "flex", position: "absolute", left: TRAI + plotW + 12, top: TREN - 44, fontSize: 22, fontWeight: 700, color: "#334155" }}>Gió</div>
      {mucGio.map((x) => {
        const mau = mauGio(x.gio as number);
        return (
          <div key={x.ap} style={{ display: "flex", position: "absolute", left: TRAI + plotW + 10, top: Y(x.cao) - 22, alignItems: "center" }}>
            <MuiTen huong={x.huong as number} size={36} mau={mau.nen === "#e0f2fe" ? "#0369a1" : mau.nen === "#bbf7d0" ? "#15803d" : mau.nen === "#fef08a" ? "#a16207" : mau.nen} />
            <div style={{ display: "flex", fontSize: 23, fontWeight: 700, color: "#0f172a", marginLeft: 6 }}>{`${Math.round(x.gio as number)} m/s ${huongChu(x.huong as number)}`}</div>
          </div>
        );
      })}
    </div>,
    W,
    H,
  );
}

/**
 * METEOGRAM — dự báo theo giờ 6h–18h, cùng lối trang thời tiết (Windy): nhiệt
 * độ (đường cong), gió (mũi tên + số, nền theo sức gió), giật, mây theo ba
 * tầng (thấp / giữa / cao, càng đậm càng dày), mưa từng giờ (cột mm), áp suất
 * và trần thermal. Chủ 30/09/2026: "gửi thêm hình biểu đồ dự báo, không phải
 * mỗi cái airgram".
 */
export async function anhMeteogram(opts: {
  ten: string;
  nhanNgay: string;
  ngay: { gio: GioThoiTiet[]; matTroi?: { moc: string; lan: string }; muaTong?: number };
}): Promise<Buffer> {
  const ds = opts.ngay.gio.filter((g) => {
    const h = Number(g.gio.slice(11, 13));
    return h >= 6 && h <= 18;
  });
  const TRAI = 190;
  const COT = Math.floor((W - TRAI - 20) / Math.max(1, ds.length));
  const x0 = (i: number) => TRAI + i * COT;
  const DAU = 128;
  const H_GIO = 40;
  const H_NHIET = 150;
  const H_GIOMS = 92;
  const H_GIAT = 46;
  const H_MAY = 44;
  const H_MUA = 110;
  const H_AP = 90;
  const H_TRAN = 46;
  let y = DAU;
  const yGio = y; y += H_GIO;
  const yNhiet = y; y += H_NHIET;
  const yGioMs = y; y += H_GIOMS;
  const yGiat = y; y += H_GIAT;
  const yMay = y; y += H_MAY * 3 + 8;
  const yMua = y; y += H_MUA;
  const yAp = y; y += H_AP;
  const yTran = y; y += H_TRAN;
  const H = y + 24;

  const nhiet = ds.map((g) => g.nhietDo);
  const tMin = Math.floor(Math.min(...nhiet) - 1);
  const tMax = Math.ceil(Math.max(...nhiet) + 1);
  const yT = (t: number) => yNhiet + 18 + (1 - (t - tMin) / Math.max(1, tMax - tMin)) * (H_NHIET - 40);
  const duongT = ds.map((g, i) => `${i ? "L" : "M"}${(x0(i) + COT / 2).toFixed(1)} ${yT(g.nhietDo).toFixed(1)}`).join(" ");
  const muaMax = Math.max(2, ...ds.map((g) => g.mua ?? 0));
  const ap = ds.map((g) => g.apSuat).filter((v): v is number => typeof v === "number");
  const apMin = ap.length ? Math.min(...ap) - 0.5 : 0;
  const apMax = ap.length ? Math.max(...ap) + 0.5 : 1;
  const yA = (v: number) => yAp + 14 + (1 - (v - apMin) / Math.max(0.5, apMax - apMin)) * (H_AP - 28);
  const duongAp = ds
    .map((g, i) => (typeof g.apSuat === "number" ? `${x0(i) + COT / 2} ${yA(g.apSuat).toFixed(1)}` : null))
    .filter(Boolean)
    .map((p, i) => `${i ? "L" : "M"}${p}`)
    .join(" ");
  const tangMay: Array<{ nhan: string; k: "mayCao" | "mayGiua" | "mayThap" }> = [
    { nhan: "Mây cao", k: "mayCao" },
    { nhan: "Mây giữa", k: "mayGiua" },
    { nhan: "Mây thấp", k: "mayThap" },
  ];
  const nhanTrai = (y: number, h: number, chu: string, phu?: string, mau = "#334155") => (
    <div key={chu} style={{ display: "flex", flexDirection: "column", justifyContent: "center", position: "absolute", left: 18, top: y, height: h, width: TRAI - 26 }}>
      <div style={{ display: "flex", fontSize: 25, fontWeight: 700, color: mau }}>{chu}</div>
      {phu ? <div style={{ display: "flex", fontSize: 19, color: "#64748b" }}>{phu}</div> : null}
    </div>
  );
  const soVN = (v: number, le = 1) => v.toFixed(le).replace(".", ",");

  return png(
    <div style={{ display: "flex", position: "relative", width: W, height: H, background: "#ffffff", fontFamily: "BVP" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* nền đêm theo giờ mọc / lặn */}
        {ds.map((g, i) => {
          const hm = g.gio.slice(11, 16);
          const dem = opts.ngay.matTroi ? hm < opts.ngay.matTroi.moc.slice(0, 5) || hm >= opts.ngay.matTroi.lan.slice(0, 5) : false;
          return dem ? <rect key={`d${i}`} x={x0(i)} y={yNhiet} width={COT} height={yTran + H_TRAN - yNhiet} fill="#eef2ff" /> : null;
        })}
        {[yNhiet, yGioMs, yGiat, yMay, yMua, yAp, yTran, yTran + H_TRAN].map((yy, i) => (
          <line key={`h${i}`} x1={TRAI} y1={yy} x2={x0(ds.length)} y2={yy} stroke="#e2e8f0" strokeWidth={2} />
        ))}
        <path d={`${duongT} L${x0(ds.length - 1) + COT / 2} ${yNhiet + H_NHIET} L${x0(0) + COT / 2} ${yNhiet + H_NHIET} Z`} fill="#fecaca" opacity={0.45} />
        <path d={duongT} stroke="#f59e0b" strokeWidth={5} fill="none" strokeLinejoin="round" />
        {tangMay.map((t, j) =>
          ds.map((g, i) => {
            const pt = Math.max(0, Math.min(100, (g[t.k] as number | undefined) ?? 0));
            return <rect key={`${t.k}${i}`} x={x0(i)} y={yMay + j * H_MAY + 2} width={COT} height={H_MAY - 4} fill="#475569" opacity={Math.min(0.9, (pt / 100) ** 0.8)} />;
          }),
        )}
        {ds.map((g, i) => {
          const mm = g.mua ?? 0;
          if (mm <= 0) return null;
          const h = (mm / muaMax) * (H_MUA - 36);
          const mau = mm >= 0.8 ? "#2563eb" : "#93c5fd";
          return <rect key={`m${i}`} x={x0(i) + COT * 0.2} y={yMua + H_MUA - 6 - h} width={COT * 0.6} height={h} fill={mau} rx={4} />;
        })}
        {duongAp ? <path d={duongAp} stroke="#475569" strokeWidth={3.5} fill="none" strokeLinejoin="round" /> : null}
        {ds.map((g, i) => {
          const tr = g.tranThermal ?? 0;
          if (!(tr > 0)) return null;
          const w = Math.min(1, tr / 2500) * (COT - 10);
          return <rect key={`t${i}`} x={x0(i) + (COT - w) / 2} y={yTran + 10} width={w} height={H_TRAN - 20} fill="#fed7aa" rx={4} />;
        })}
      </svg>

      <div style={{ display: "flex", flexDirection: "column", position: "absolute", left: 18, top: 16 }}>
        <div style={{ display: "flex", fontSize: 38, fontWeight: 700, color: "#0f172a" }}>{`Dự báo theo giờ — ${opts.ten}`}</div>
        <div style={{ display: "flex", fontSize: 24, color: "#475569", marginTop: 6 }}>
          {`${opts.nhanNgay}` +
            (opts.ngay.matTroi ? ` · mọc ${opts.ngay.matTroi.moc.slice(0, 5)} · lặn ${opts.ngay.matTroi.lan.slice(0, 5)}` : "") +
            ` · tổng mưa 6h–18h ${soVN(ds.reduce((a, g) => a + (g.mua ?? 0), 0))} mm`}
        </div>
      </div>

      {nhanTrai(yGio, H_GIO, "Giờ")}
      {nhanTrai(yNhiet, H_NHIET, "Nhiệt độ", "°C", "#b45309")}
      {nhanTrai(yGioMs, H_GIOMS, "Gió", "m/s")}
      {nhanTrai(yGiat, H_GIAT, "Giật m/s", undefined, "#be123c")}
      {tangMay.map((t, j) => nhanTrai(yMay + j * H_MAY, H_MAY, t.nhan, undefined, "#475569"))}
      {nhanTrai(yMua, H_MUA, "Mưa", "mm/giờ", "#1d4ed8")}
      {nhanTrai(yAp, H_AP, "Áp suất", "hPa")}
      {nhanTrai(yTran, H_TRAN, "Trần thermal", "m trên mặt đất", "#c2410c")}

      {ds.flatMap((g, i) => {
        const m = mauGio(g.gio10m);
        const mg = mauGio(g.giat);
        /** Trả MẢNG phần tử con trực tiếp của khung ngoài — satori không đặt được phần tử tuyệt đối lồng trong khung trung gian. */
        return [
            <div key={`g${i}`} style={{ display: "flex", position: "absolute", left: x0(i), top: yGio, width: COT, height: H_GIO, justifyContent: "center", alignItems: "center", fontSize: 25, fontWeight: 700, color: "#334155" }}>
              {`${Number(g.gio.slice(11, 13))}h`}
            </div>,
            i % 2 === 0 ? (
              <div key={`t${i}`} style={{ display: "flex", position: "absolute", left: x0(i), top: yT(g.nhietDo) - 40, width: COT, justifyContent: "center", fontSize: 23, fontWeight: 700, color: "#92400e" }}>
                {`${Math.round(g.nhietDo)}°`}
              </div>
            ) : null,
            <div key={`w${i}`} style={{ display: "flex", flexDirection: "column", position: "absolute", left: x0(i) + 3, top: yGioMs + 6, width: COT - 6, height: H_GIOMS - 12, alignItems: "center", justifyContent: "center", background: m.nen, borderRadius: 10 }}>
              <MuiTen huong={g.huong} size={32} mau={m.chu} />
              <div style={{ display: "flex", fontSize: 24, fontWeight: 700, color: m.chu }}>{soVN(g.gio10m)}</div>
            </div>,
            <div key={`gi${i}`} style={{ display: "flex", position: "absolute", left: x0(i) + 3, top: yGiat + 6, width: COT - 6, height: H_GIAT - 12, alignItems: "center", justifyContent: "center", background: mg.nen, borderRadius: 8, fontSize: 23, fontWeight: 700, color: mg.chu }}>
              {soVN(g.giat)}
            </div>,
            (g.mua ?? 0) >= 0.1 ? (
              <div key={`mu${i}`} style={{ display: "flex", position: "absolute", left: x0(i), top: yMua + 4, width: COT, justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#1d4ed8" }}>
                {soVN(g.mua ?? 0)}
              </div>
            ) : null,
            typeof g.apSuat === "number" && i % 3 === 0 ? (
              <div key={`ap${i}`} style={{ display: "flex", position: "absolute", left: x0(i), top: yA(g.apSuat) - 34, width: COT, justifyContent: "center", fontSize: 19, color: "#334155" }}>
                {Math.round(g.apSuat)}
              </div>
            ) : null,
            (g.tranThermal ?? 0) > 0 ? (
              <div key={`tr${i}`} style={{ display: "flex", position: "absolute", left: x0(i), top: yTran + 8, width: COT, height: H_TRAN - 16, justifyContent: "center", alignItems: "center", fontSize: 19, fontWeight: 700, color: "#7c2d12" }}>
                {Math.round((g.tranThermal ?? 0) / 100) / 10 >= 1 ? `${(Math.round((g.tranThermal ?? 0) / 100) / 10).toString().replace(".", ",")}k` : Math.round(g.tranThermal ?? 0)}
              </div>
            ) : null,
        ];
      })}
    </div>,
    W,
    H,
  );
}
