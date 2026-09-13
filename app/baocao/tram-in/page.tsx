// app/baocao/tram-in/page.tsx
"use client";

/**
 * TRẠM IN VÉ (chủ 12/09: "làm cho chạy được cả trên iPhone, và setup một lần").
 *
 * Một máy ở quầy (điện thoại / máy tính bảng Android, hoặc máy tính) ghép
 * Bluetooth hay USB với máy in Gainscha MỘT LẦN, mở trang này, bấm "Bắt đầu
 * trực" và để đó. Mọi máy khác của điểm — kể cả iPhone — bấm IN VÉ là lệnh
 * vào hàng đợi, trạm nhận và in trong vài giây.
 *
 * Trang giữ màn hình sáng (Wake Lock), gửi nhịp tim 10 giây/lần, hỏi lệnh mới
 * 2,5 giây/lần. Tải lại trang: USB tự nhận lại (WebUSB nhớ quyền); Bluetooth
 * nhận lại được nếu Chrome hỗ trợ getDevices(), không thì bấm ghép lại một
 * chạm (hộp chọn hiện sẵn máy cũ).
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { formatDateKeyVN } from "@/lib/baobay/date";
import { wearsRole } from "@/lib/baobay/roles";
import { spotName } from "@/lib/baobay/spots";
import type { BookingDTO } from "@/lib/baobay/types";

import { apiGet, apiPatch } from "../components/client-api";
import { MayInUsb } from "../components/MayInUsb";
import { useBaobaySession } from "../components/session";
import { Shell } from "../components/Shell";
import { useSpot } from "../components/spot";
import { trinhDuyetCoBluetooth } from "@/lib/baobay/may-in-bluetooth";

import { buildTicketsHtml, coInVe, inQuaMayInThang, mayInThangDaGhep } from "../components/TicketPrint";
import { Banner, Button, Card, PageLoading } from "../components/ui";

type Job = { id: string; bookingLabel: string; status: string; createdByName: string; createdAt: string; doneAt?: string; error?: string };

/**
 * TỰ KIỂM TRA MÁY — chủ 13/09 báo "Honor Pad 10 không in vé được". Máy tính
 * bảng của hãng Trung Quốc hay mở bằng trình duyệt riêng (không có Web
 * Bluetooth) hoặc tắt vị trí (Android bắt bật vị trí mới quét được BLE). Khối
 * này nói thẳng máy đang thiếu gì, khỏi phải đoán qua điện thoại.
 */
function KiemTraMay() {
  const [mo, setMo] = useState(false);
  const [viTri, setViTri] = useState<string>("chưa kiểm");
  if (typeof window === "undefined") return null;
  const ua = navigator.userAgent;
  const laChrome = /Chrome\//.test(ua) && !/EdgA|OPR|SamsungBrowser|HuaweiBrowser|HeyTap|MiuiBrowser/i.test(ua);
  const dong = (nhan: string, ok: boolean, chu: string) => (
    <li className="flex flex-wrap items-baseline gap-1.5 py-0.5">
      <span className={ok ? "text-emerald-700" : "text-rose-700"}>{ok ? "✓" : "✗"}</span>
      <b>{nhan}:</b> <span className={ok ? "text-slate-700" : "text-rose-800"}>{chu}</span>
    </li>
  );
  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-2">
      <button type="button" className="text-xs font-bold text-sky-700 underline" onClick={() => setMo((v) => !v)}>
        {mo ? "Ẩn" : "🔎 Máy này in được không? (bấm để kiểm tra)"}
      </button>
      {mo && (
        <ul className="mt-1.5 text-[11px] leading-snug text-slate-700">
          {dong("Trình duyệt", laChrome, laChrome ? "Chrome — đúng loại" : "KHÔNG phải Chrome. Máy Honor / Huawei phải cài Google Chrome và mở trang bằng Chrome.")}
          {dong("Địa chỉ https", window.isSecureContext, window.isSecureContext ? "đúng" : "đang mở qua http — vào https://www.mebayluon.com")}
          {dong("Web Bluetooth", trinhDuyetCoBluetooth(), trinhDuyetCoBluetooth() ? "có" : "không có — trình duyệt sai loại hoặc bị tắt trong chrome://flags")}
          {dong("WebUSB (cáp OTG)", typeof navigator !== "undefined" && "usb" in navigator, "usb" in navigator ? "có" : "không có")}
          <li className="flex flex-wrap items-baseline gap-1.5 py-0.5">
            <b>Vị trí (GPS):</b> <span>{viTri}</span>
            <button
              type="button"
              className="rounded border border-slate-300 bg-white px-1.5 font-semibold text-slate-600"
              onClick={() => {
                setViTri("đang hỏi…");
                navigator.geolocation?.getCurrentPosition(
                  () => setViTri("đang BẬT — đúng"),
                  (e) => setViTri(`chưa bật / bị từ chối (${e.message}). Android bắt bật vị trí mới quét được Bluetooth.`),
                  { timeout: 8000 },
                );
              }}
            >
              kiểm tra
            </button>
          </li>
          <li className="mt-1 text-slate-500">Máy: {ua.slice(0, 120)}</li>
        </ul>
      )}
    </div>
  );
}

export default function TrangTramIn() {
  const { user, loading } = useBaobaySession(["dispatcher", "counter", "accountant", "admin"]);
  const { spot, setSpot, options } = useSpot(user?.spots);
  const [truc, setTruc] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangIn, setDangIn] = useState<string | null>(null);
  const [nhatKy, setNhatKy] = useState<Job[]>([]);
  const [daIn, setDaIn] = useState(0);
  const [kenh, setKenh] = useState<"bluetooth" | "usb" | "rawbt" | null>(() => (typeof window !== "undefined" ? mayInThangDaGhep() : null));
  const dangXuLy = useRef(false);
  const wakeRef = useRef<{ release: () => Promise<void> } | null>(null);
  const tenMay = typeof navigator !== "undefined" ? navigator.userAgent.replace(/^.*\((.*?)\).*$/, "$1").slice(0, 40) : "trạm";

  /** Nhật ký 20 lệnh gần nhất — soát xem vé nào chưa ra. */
  const taiNhatKy = useCallback(async () => {
    if (!spot) return;
    try {
      const r = await apiGet<{ items: Job[] }>(`/api/baocao/in-ve?spot=${spot}&nhatky=1`);
      setNhatKy(r.items);
    } catch {
      /* mất mạng thì giữ danh sách cũ */
    }
  }, [spot]);

  useEffect(() => {
    void taiNhatKy();
  }, [taiNhatKy]);

  /** Vòng trực: nhịp tim + nhận lệnh + in + báo xong. */
  useEffect(() => {
    if (!truc || !spot) return;
    let song = true;
    const nhip = async () => {
      try {
        await apiPatch(`/api/baocao/in-ve?spot=${spot}`, { action: "nhip", deviceName: tenMay, kenh: kenh ?? "" });
      } catch {
        /* mất mạng — lần sau */
      }
    };
    const xuLy = async () => {
      if (dangXuLy.current) return;
      dangXuLy.current = true;
      try {
        const k = mayInThangDaGhep();
        setKenh(k);
        if (!k) return;
        const r = await apiGet<{ lenh: { job: Job; booking: BookingDTO } | null }>(`/api/baocao/in-ve?spot=${spot}&nhan=1&tram-ten=${encodeURIComponent(tenMay)}`);
        if (!r.lenh) return;
        const { job, booking } = r.lenh;
        setDangIn(job.bookingLabel);
        try {
          const html = await buildTicketsHtml(booking, spot);
          await inQuaMayInThang(html, k);
          await apiPatch(`/api/baocao/in-ve?spot=${spot}`, { action: "xong", id: job.id });
          setDaIn((n) => n + 1);
          setLoi(null);
        } catch (e) {
          const m = e instanceof Error ? e.message : String(e);
          setLoi(`Không in được ${job.bookingLabel}: ${m}`);
          await apiPatch(`/api/baocao/in-ve?spot=${spot}`, { action: "loi", id: job.id, error: m }).catch(() => {});
        } finally {
          setDangIn(null);
          void taiNhatKy();
        }
      } catch (e) {
        setLoi(e instanceof Error ? e.message : String(e));
      } finally {
        dangXuLy.current = false;
      }
    };
    void nhip();
    void xuLy();
    const t1 = window.setInterval(() => song && void nhip(), 10_000);
    const t2 = window.setInterval(() => song && void xuLy(), 2_500);
    /** Giữ màn hình sáng — trạm ngủ là hàng đợi đứng. */
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((w) => (wakeRef.current = w)).catch(() => {});
    return () => {
      song = false;
      window.clearInterval(t1);
      window.clearInterval(t2);
      void wakeRef.current?.release().catch(() => {});
      wakeRef.current = null;
      void apiPatch(`/api/baocao/in-ve?spot=${spot}`, { action: "nghi" }).catch(() => {});
    };
  }, [truc, spot, kenh, tenMay, taiNhatKy]);

  if (loading || !user) return <PageLoading />;
  const laQuanLy = wearsRole(user, "admin") || wearsRole(user, "accountant");
  const diemIn = options.filter((s) => coInVe(s));

  return (
    <Shell user={user} title="Trạm in vé" subtitle="Máy ghép với máy in Gainscha — nhận lệnh IN VÉ từ mọi máy khác của điểm (kể cả iPhone)">
      {diemIn.length === 0 ? (
        <Banner tone="warning">Tài khoản này không thuộc điểm nào có in vé (Khau Phạ, Sa Pa).</Banner>
      ) : (
        <>
          {diemIn.length > 1 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {diemIn.map((s) => (
                <button key={s} type="button" onClick={() => setSpot(s)} disabled={truc} className={"rounded-lg border px-2 py-1 text-xs font-bold " + (spot === s ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white text-slate-700")}>
                  {spotName(s)}
                </button>
              ))}
            </div>
          )}
          <Card title="1. Ghép máy in (một lần)" hint="Bật máy in Gainscha và Bluetooth của máy này, bấm ghép, chọn máy in trong hộp hiện ra.">
            <MayInUsb />
            {!kenh && <p className="mt-2 text-xs text-amber-800">Chưa ghép máy in — trạm không in được. Ghép xong trạng thái trên sẽ hiện tên máy.</p>}
            <KiemTraMay />
          </Card>
          <Card title="2. Trực" hint="Bấm rồi để nguyên trang này mở. Màn hình được giữ sáng. Nên cắm sạc.">
            <div className="flex flex-wrap items-center gap-2">
              {!truc ? (
                <Button type="button" className="h-11 px-5 text-base" disabled={!spot || !coInVe(spot ?? "")} onClick={() => setTruc(true)}>
                  ▶ Bắt đầu trực {spot ? `— ${spotName(spot)}` : ""}
                </Button>
              ) : (
                <Button type="button" variant="ghost" className="h-11 px-5 text-base" onClick={() => setTruc(false)}>
                  ■ Dừng trực
                </Button>
              )}
              {truc && (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-800">
                  ● Đang trực · đã in {daIn} lệnh{dangIn ? ` · đang in ${dangIn}` : ""}
                </span>
              )}
            </div>
            {loi && (
              <div className="mt-2">
                <Banner tone="error">{loi}</Banner>
              </div>
            )}
            <p className="mt-2 text-xs text-slate-500">
              Mẹo: thêm trang này vào màn hình chính (Chrome → ⋮ → Thêm vào màn hình chính) để lần sau mở một chạm. Tải lại trang có thể phải bấm ghép Bluetooth lại một lần — hộp chọn hiện sẵn máy cũ.
            </p>
          </Card>
          <Card title="Nhật ký lệnh in" hint="20 lệnh gần nhất của điểm — ai bấm, lúc nào, đã ra vé chưa">
            {nhatKy.length === 0 ? (
              <p className="text-sm text-slate-500">Chưa có lệnh nào.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {nhatKy.map((j) => (
                  <li key={j.id} className="flex flex-wrap items-center gap-2 py-1.5">
                    <span className="text-xs text-slate-400">{j.createdAt ? new Date(j.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                    <span className="min-w-0 flex-1">{j.bookingLabel} <span className="text-slate-400">— {j.createdByName}</span></span>
                    <span className={"rounded-full px-2 py-0.5 text-[11px] font-bold " + (j.status === "done" ? "bg-emerald-100 text-emerald-800" : j.status === "failed" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800")}>
                      {j.status === "done" ? "đã in" : j.status === "failed" ? `lỗi: ${j.error || ""}` : j.status === "printing" ? "đang in" : "chờ"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {laQuanLy && <p className="mt-2 text-[11px] text-slate-400">Ngày {formatDateKeyVN(new Date().toISOString().slice(0, 10))} · quản trị / kế toán xem được mọi điểm.</p>}
          </Card>
        </>
      )}
    </Shell>
  );
}
