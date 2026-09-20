// app/baocao/components/QuetVeModal.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { docQrTuCanvas } from "@/lib/baobay/doc-qr";
import type { KetQuaQuet, MaVeDTO } from "@/services/ve-qr.service";

import { apiPost } from "./client-api";
import { Button } from "./ui";

type Dong = { luc: string; ok: boolean; cau: string; nhan?: string; ten?: string };

/**
 * HỘP QUÉT VÉ NHANH trên trang phi công (chủ 20/09: "nhấn vào quét vé là mở
 * camera luôn"). Mở là bật camera sau ngay, đọc liên tục, mỗi mã nhận xong
 * rung nhẹ và ghi một dòng; đóng hộp thì tắt camera và báo cho khối "Từ quét
 * vé" tải lại số. Có ô gõ tay phòng khi camera hỏng / vé nhoè.
 */
export function QuetVeModal({ spot, date, onClose }: { spot: string; date: string; onClose: (soMaMoi: number) => void }) {
  const [nhatKy, setNhatKy] = useState<Dong[]>([]);
  const [loiCam, setLoiCam] = useState<string | null>(null);
  const [goTay, setGoTay] = useState("");
  const [dangBat, setDangBat] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const vuaDoc = useRef<{ text: string; luc: number } | null>(null);
  const soMoi = useRef(0);

  const quet = useCallback(
    async (text: string) => {
      const luc = new Date().toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", second: "2-digit" });
      try {
        const r = await apiPost<KetQuaQuet>(`/api/baocao/ve-qr?spot=${spot}`, { action: "quet", text, date });
        const m: MaVeDTO = r.ma;
        if (!r.daQuet) soMoi.current++;
        setNhatKy((x) => [{ luc, ok: true, nhan: m.nhan, ten: m.tenKhach, cau: r.daQuet ? "đã quét trước đó" : "✓ đã nhận" }, ...x].slice(0, 30));
      } catch (e) {
        setNhatKy((x) => [{ luc, ok: false, cau: `${text.slice(0, 28)} — ${e instanceof Error ? e.message : "lỗi"}` }, ...x].slice(0, 30));
      }
    },
    [spot, date],
  );

  /** Bật camera NGAY khi hộp mở. */
  useEffect(() => {
    let huy = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (huy) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setDangBat(true);
        requestAnimationFrame(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            void videoRef.current.play();
          }
        });
      } catch (e) {
        setLoiCam(`Không mở được camera: ${e instanceof Error ? e.message : String(e)} — gõ tay mã bên dưới hoặc mở trang Quét vé để chọn ảnh.`);
      }
    })();
    return () => {
      huy = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!dangBat) return;
    let dung = false;
    const canvas = document.createElement("canvas");
    const tick = async () => {
      if (dung) return;
      const v = videoRef.current;
      if (v && v.readyState >= 2 && v.videoWidth) {
        const scale = Math.min(1, 900 / Math.max(v.videoWidth, v.videoHeight));
        canvas.width = Math.round(v.videoWidth * scale);
        canvas.height = Math.round(v.videoHeight * scale);
        canvas.getContext("2d")?.drawImage(v, 0, 0, canvas.width, canvas.height);
        const text = await docQrTuCanvas(canvas).catch(() => null);
        if (text) {
          const cu = vuaDoc.current;
          if (!cu || cu.text !== text || Date.now() - cu.luc > 4000) {
            vuaDoc.current = { text, luc: Date.now() };
            if (navigator.vibrate) navigator.vibrate(60);
            await quet(text);
          }
        }
      }
      if (!dung) setTimeout(() => void tick(), 250);
    };
    void tick();
    return () => {
      dung = true;
    };
  }, [dangBat, quet]);

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-black text-white">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div className="text-sm font-bold">📷 Quét vé — đưa mã QR trên vé vào khung</div>
        <Button type="button" className="h-9 bg-white px-4 text-slate-900 hover:bg-slate-200" onClick={() => onClose(soMoi.current)}>
          ✕ Xong
        </Button>
      </div>
      <div className="relative flex-1 overflow-hidden bg-black">
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        {loiCam && <div className="absolute inset-x-3 top-3 rounded-lg bg-rose-600/90 px-3 py-2 text-sm">{loiCam}</div>}
        {!loiCam && !dangBat && <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">Đang mở camera…</div>}
      </div>
      <div className="max-h-[38vh] overflow-y-auto bg-slate-900 px-3 py-2">
        <form
          className="mb-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (goTay.trim()) {
              void quet(goTay.trim());
              setGoTay("");
            }
          }}
        >
          <input
            value={goTay}
            onChange={(e) => setGoTay(e.target.value)}
            placeholder="Gõ tay: 22/12 #3.2 A2D8"
            className="h-9 flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 text-sm text-white placeholder:text-slate-400"
            autoCapitalize="off"
          />
          <Button type="submit" variant="ghost" className="h-9 border-slate-600 bg-slate-800 px-3 text-white" disabled={!goTay.trim()}>
            Nhận
          </Button>
        </form>
        {nhatKy.length === 0 ? (
          <p className="text-xs text-slate-400">Chưa quét mã nào. Mỗi mã nhận xong máy rung nhẹ và hiện một dòng ở đây.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {nhatKy.map((d, i) => (
              <li key={i} className={"flex items-baseline gap-2 " + (d.ok ? "text-emerald-300" : "text-rose-300")}>
                <span className="shrink-0 text-[11px] text-slate-400">{d.luc}</span>
                {d.nhan && <strong>{d.nhan}</strong>}
                {d.ten && <span className="text-white">{d.ten}</span>}
                <span>{d.cau}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
