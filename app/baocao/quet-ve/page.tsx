// app/baocao/quet-ve/page.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { formatDateKeyVN, todayInVN } from "@/lib/baobay/date";
import { DICH_VU_VE, TEN_DICH_VU, type DichVuVe } from "@/lib/baobay/ve-qr";
import type { KetQuaQuet, MaVeDTO, ThuHoiDTO, TongHopVe } from "@/services/ve-qr.service";

import { apiGet, apiPost } from "../components/client-api";
import { DateBar } from "../components/DateBar";
import { useBaobaySession } from "../components/session";
import { useSpot } from "../components/spot";
import { Shell } from "../components/Shell";
import { Banner, Button, Card, PageLoading } from "../components/ui";

/**
 * QUÉT VÉ — phi công (chủ 17/09/2026). Xem luật ở services/ve-qr.service.ts.
 *
 * Ba cách đưa mã vào: CAMERA (quét sống), CHỌN ẢNH (nhiều ảnh một lượt — cuối
 * ngày chụp lại các vé để soát; mã đã quét thì bỏ qua êm), hoặc GÕ TAY
 * "22/12 #3.2" khi máy ảnh hỏng. Mỗi mã quét xong hiện ngay tên khách và
 * dịch vụ đi kèm; danh sách bên dưới là mọi mã mình đang giữ trong ngày, có
 * nút BAY XONG · HOÀN MÃ · hoàn từng dịch vụ.
 */

type DongQuet = { luc: string; text: string; ok: boolean; cau: string; ma?: MaVeDTO; daQuet?: boolean };

function gio(iso: string): string {
  return iso ? new Date(iso).toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" }) : "";
}

function dichVuChip(m: MaVeDTO) {
  return DICH_VU_VE.filter((k) => m.dichVu[k]).map((k) => (
    <span key={k} className={"rounded px-1.5 py-0.5 text-[11px] font-bold " + (m.hoanDichVu[k] ? "bg-slate-200 text-slate-500 line-through" : "bg-amber-100 text-amber-900")}>
      {TEN_DICH_VU[k]}
    </span>
  ));
}

/** Ảnh → canvas (thu về 1600px là đủ cho QR vé, mã chỉ ~25 ô mỗi cạnh). */
async function toCanvas(file: File, maxSide = 1600): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Bộ đọc dựng sẵn của máy (Chrome/Android) — nhanh hơn thư viện; không có thì jsQR. */
async function docQr(canvas: HTMLCanvasElement): Promise<string | null> {
  const w = window as unknown as { BarcodeDetector?: new (o?: { formats?: string[] }) => { detect: (s: unknown) => Promise<Array<{ rawValue: string }>> } };
  if (w.BarcodeDetector) {
    try {
      const found = await new w.BarcodeDetector({ formats: ["qr_code"] }).detect(canvas);
      if (found[0]?.rawValue) return found[0].rawValue;
    } catch {
      /* rơi xuống jsQR */
    }
  }
  const { default: jsQR } = await import("jsqr");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const d = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return jsQR(d.data, d.width, d.height, { inversionAttempts: "attemptBoth" })?.data ?? null;
}

export default function QuetVePage() {
  const { user, loading } = useBaobaySession(["pilot", "dispatcher", "counter", "admin"]);
  const { spot, setSpot, options: spotOptions } = useSpot(user?.spots);
  const [date, setDate] = useState(todayInVN());
  const [ma, setMa] = useState<MaVeDTO[]>([]);
  const [thuHoi, setThuHoi] = useState<ThuHoiDTO[]>([]);
  const [tong, setTong] = useState<TongHopVe | null>(null);
  const [nhatKy, setNhatKy] = useState<DongQuet[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [goTay, setGoTay] = useState("");
  const [cam, setCam] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  /** Mã vừa đọc từ camera — chống đọc lặp một mã 10 lần/giây. */
  const vuaDoc = useRef<{ text: string; luc: number } | null>(null);

  const load = useCallback(() => {
    if (!spot) return;
    apiGet<{ ma: MaVeDTO[]; thuHoi: ThuHoiDTO[]; tongHop: TongHopVe }>(`/api/baocao/ve-qr?spot=${spot}&date=${date}`)
      .then((r) => {
        setMa(r.ma);
        setThuHoi(r.thuHoi);
        setTong(r.tongHop);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Không tải được danh sách mã"));
  }, [spot, date]);

  useEffect(() => {
    load();
  }, [load]);

  const ghi = (d: DongQuet) => setNhatKy((x) => [d, ...x].slice(0, 60));

  const quet = useCallback(
    async (text: string): Promise<boolean> => {
      if (!spot) return false;
      const luc = new Date().toISOString();
      try {
        const r = await apiPost<KetQuaQuet>(`/api/baocao/ve-qr?spot=${spot}`, { action: "quet", text, date });
        ghi({ luc, text, ok: true, ma: r.ma, daQuet: r.daQuet, cau: r.daQuet ? "đã quét trước đó — bỏ qua" : "đã nhận" });
        if (!r.daQuet) {
          setMa((x) => [...x.filter((m) => !(m.bookingId === r.ma.bookingId && m.guestNo === r.ma.guestNo)), r.ma]);
          load();
        }
        return true;
      } catch (e) {
        ghi({ luc, text, ok: false, cau: e instanceof Error ? e.message : "Lỗi" });
        return false;
      }
    },
    [spot, date, load],
  );

  /* ---- Camera ---- */
  const tatCam = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCam(false);
  }, []);
  useEffect(() => () => tatCam(), [tatCam]);

  async function batCam() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      setCam(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch (e) {
      setError(`Không mở được camera: ${e instanceof Error ? e.message : String(e)} — dùng CHỌN ẢNH hoặc gõ tay.`);
    }
  }

  useEffect(() => {
    if (!cam) return;
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
        const text = await docQr(canvas).catch(() => null);
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
  }, [cam, quet]);

  /* ---- Chọn nhiều ảnh ---- */
  async function chonAnh(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    let ok = 0;
    let bo = 0;
    for (const f of Array.from(files)) {
      try {
        const text = await docQr(await toCanvas(f));
        if (!text) {
          ghi({ luc: new Date().toISOString(), text: f.name, ok: false, cau: "không thấy mã QR trong ảnh" });
          continue;
        }
        if (await quet(text)) ok++;
        else bo++;
      } catch (e) {
        ghi({ luc: new Date().toISOString(), text: f.name, ok: false, cau: e instanceof Error ? e.message : "không đọc được ảnh" });
      }
    }
    setBusy(false);
    setError(null);
    ghi({ luc: new Date().toISOString(), text: `${files.length} ảnh`, ok: bo === 0, cau: `đọc xong: ${ok} mã nhận / đã có, ${bo} mã báo lỗi` });
  }

  async function lenh(action: string, m: MaVeDTO, extra?: Record<string, unknown>) {
    if (!spot) return;
    setBusy(true);
    try {
      const r = await apiPost<{ ma: MaVeDTO }>(`/api/baocao/ve-qr?spot=${spot}`, { action, bookingId: m.bookingId, guestNo: m.guestNo, ...extra });
      setMa((x) => (action === "hoan" ? x.filter((y) => !(y.bookingId === m.bookingId && y.guestNo === m.guestNo)) : x.map((y) => (y.bookingId === m.bookingId && y.guestNo === m.guestNo ? r.ma : y))));
      load();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thực hiện được");
    } finally {
      setBusy(false);
    }
  }

  async function daXem(t: ThuHoiDTO) {
    if (!spot) return;
    await apiPost(`/api/baocao/ve-qr?spot=${spot}`, { action: "daxem", bookingId: t.bookingId, guestNo: t.guestNo }).catch(() => null);
    setThuHoi((x) => x.filter((y) => !(y.bookingId === t.bookingId && y.guestNo === t.guestNo)));
  }

  if (loading || !user) return <PageLoading />;

  return (
    <Shell user={user} title="Quét vé" subtitle="Quét mã QR trên vé của khách trước khi bay — mã nào mình quét là của mình">
      <div className="mb-3">
        <DateBar date={date} onChange={setDate} spot={spot ?? undefined} spotOptions={spotOptions.length > 1 ? spotOptions : undefined} onSpotChange={(s) => setSpot(s as never)} />
      </div>

      {error && (
        <div className="mb-3">
          <Banner tone="error">{error}</Banner>
        </div>
      )}

      {thuHoi.length > 0 && (
        <div className="mb-3 space-y-2">
          {thuHoi.map((t) => (
            <Banner key={`${t.bookingId}-${t.guestNo}`} tone="warning">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  ⚠ <strong>Mã {t.nhan} ({t.tenKhach}) bị THU HỒI</strong> —{" "}
                  {t.ly === "huy" ? "điều phối đã HUỶ booking" : t.ly === "doi" ? `điều phối đã DỜI booking sang ${formatDateKeyVN(t.flightDate)} (phải quét lại ở ngày đó)` : "điều phối thu hồi tay"}
                  {t.boi ? ` (${t.boi}, ${gio(t.luc)})` : ""}. Chuyến này{t.daBayXong ? " (đã tích bay xong)" : ""}
                  {DICH_VU_VE.some((k) => t.dichVu[k]) ? ` và ${DICH_VU_VE.filter((k) => t.dichVu[k]).map((k) => TEN_DICH_VU[k]).join(", ")}` : ""} bị rút khỏi báo cáo của anh/chị.
                </div>
                <Button type="button" variant="ghost" className="h-8 px-3 text-xs" onClick={() => void daXem(t)}>
                  Đã xem
                </Button>
              </div>
            </Banner>
          ))}
        </div>
      )}

      <div className="space-y-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0">
        <div className="space-y-3">
          <Card title={`Quét mã — ngày ${formatDateKeyVN(date)}`} hint="chỉ nhận mã của ngày này (mã dời ngày vẫn nhận nếu booking đã dời tới đây)">
            <div className="flex flex-wrap gap-2">
              {!cam ? (
                <Button type="button" className="h-10 px-4" onClick={() => void batCam()}>
                  📷 Mở camera
                </Button>
              ) : (
                <Button type="button" variant="ghost" className="h-10 px-4" onClick={tatCam}>
                  ■ Tắt camera
                </Button>
              )}
              <label className="inline-flex h-10 cursor-pointer items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                🖼 Chọn ảnh (nhiều ảnh)
                <input type="file" accept="image/*" multiple className="hidden" disabled={busy} onChange={(e) => void chonAnh(e.target.files)} />
              </label>
            </div>
            {cam && (
              <div className="mt-2 overflow-hidden rounded-xl border border-slate-300 bg-black">
                <video ref={videoRef} playsInline muted className="block max-h-[60vh] w-full object-contain" />
              </div>
            )}
            <form
              className="mt-2 flex gap-2"
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
                placeholder="Gõ tay: 22/12 #3.2"
                className="h-10 flex-1 rounded-lg border border-slate-300 px-3 text-sm"
                autoCapitalize="off"
              />
              <Button type="submit" variant="ghost" className="h-10 px-3" disabled={!goTay.trim()}>
                Nhận
              </Button>
            </form>

            {nhatKy.length > 0 && (
              <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto text-xs">
                {nhatKy.map((d, i) => (
                  <li key={i} className={"rounded-lg px-2 py-1 " + (d.ok ? (d.daQuet ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-900") : "bg-rose-50 text-rose-900")}>
                    <span className="mr-1 opacity-60">{gio(d.luc)}</span>
                    {d.ma ? (
                      <>
                        <strong>{d.ma.nhan}</strong> · {d.ma.tenKhach} {dichVuChip(d.ma)} — {d.cau}
                      </>
                    ) : (
                      <>
                        <span className="font-mono">{d.text}</span> — {d.cau}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {tong && (
            <Card title="Tổng hợp trong ngày (để tính lương)" hint="tự cộng từ các mã đang giữ; số này cũng hiện ở trang Phi công">
              <div className="grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
                {(
                  [
                    ["Chuyến", tong.chuyen],
                    ["Bay xong", tong.bayXong],
                    ["Đang giữ", tong.dangGiu],
                    ["Cam 360", tong.video360],
                    ["Flycam", tong.flycam],
                    ["Cờ đỏ", tong.redFlag],
                  ] as Array<[string, number]>
                ).map(([n, v]) => (
                  <div key={n} className="rounded-lg bg-slate-50 px-2 py-2">
                    <div className="text-xl font-black text-slate-900">{v}</div>
                    <div className="text-[11px] font-semibold text-slate-500">{n}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <Card title={`Mã tôi đang giữ (${ma.length})`} hint="bay xong thì tích; không phục vụ được thì hoàn mã cho người khác quét">
          {ma.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa quét mã nào cho ngày {formatDateKeyVN(date)}.</p>
          ) : (
            <ul className="space-y-2">
              {ma.map((m) => (
                <li key={`${m.bookingId}-${m.guestNo}`} className={"rounded-xl border p-2 " + (m.bayXong ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white")}>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-base font-black text-slate-900">{m.nhan}</span>
                    <span className="text-sm font-semibold text-slate-800">{m.tenKhach}</span>
                    {m.guestCount > 1 && <span className="text-[11px] text-slate-500">({m.guestNo}/{m.guestCount})</span>}
                    {m.daDoi && <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[11px] font-bold text-violet-800">mã dời từ {formatDateKeyVN(m.ngayCap)}</span>}
                    {dichVuChip(m)}
                    <span className="ml-auto text-[11px] text-slate-500">quét {gio(m.phiCong?.luc ?? "")}{m.bayXong ? ` · bay xong ${gio(m.bayXong)}` : ""}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {m.bayXong ? (
                      <Button type="button" variant="ghost" className="h-8 px-3 text-xs" disabled={busy} onClick={() => void lenh("bobayxong", m)}>
                        ↩ Bỏ tích bay xong
                      </Button>
                    ) : (
                      <Button type="button" className="h-8 bg-emerald-600 px-3 text-xs hover:bg-emerald-700" disabled={busy} onClick={() => void lenh("bayxong", m)}>
                        ✅ Bay xong
                      </Button>
                    )}
                    {DICH_VU_VE.filter((k) => m.dichVu[k]).map((k: DichVuVe) => (
                      <Button key={k} type="button" variant="ghost" className={"h-8 px-3 text-xs " + (m.hoanDichVu[k] ? "border-slate-400 bg-slate-100 text-slate-700" : "border-amber-400 bg-amber-50 text-amber-900")} disabled={busy} onClick={() => void lenh("hoandv", m, { dichVu: k })}>
                        {m.hoanDichVu[k] ? `↩ Lấy lại ${TEN_DICH_VU[k]}` : `✕ Hoàn ${TEN_DICH_VU[k]}`}
                      </Button>
                    ))}
                    {!m.bayXong && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 border-rose-300 bg-rose-50 px-3 text-xs text-rose-800"
                        disabled={busy}
                        onClick={() => {
                          if (window.confirm(`Hoàn mã ${m.nhan} (${m.tenKhach})? Mã trắng lại, phi công khác quét được.`)) void lenh("hoan", m);
                        }}
                      >
                        ⟲ Hoàn mã
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Shell>
  );
}
