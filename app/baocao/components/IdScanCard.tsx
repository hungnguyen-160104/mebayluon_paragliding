// app/baocao/components/IdScanCard.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";

import { parseCccdQr, parseMrz, type ScannedPerson } from "@/lib/baobay/id-scan";

import { Banner, Button, CollapseCard, TextInput } from "./ui";

/**
 * Quét CCCD / hộ chiếu để lấy đủ 5 trường làm BẢO HIỂM BAY:
 * họ tên · ngày sinh · giới tính · số giấy tờ · quốc tịch.
 *
 * Chụp bằng camera hay chọn ảnh có sẵn đều được. Tất cả chạy NGAY TRONG MÁY:
 *  - CCCD gắn chip → đọc mã QR mặt trước (dữ liệu chữ, gần như không sai).
 *  - Hộ chiếu → đọc hai dòng MRZ ở đáy trang bằng OCR, có số kiểm tra nên đọc
 *    sai là báo ngay chứ không ghi bừa.
 *
 * Ảnh KHÔNG rời khỏi máy và KHÔNG được lưu ở đâu cả — chỉ giữ 5 trường vừa bóc,
 * đúng thứ cần cho bảo hiểm. Danh sách nằm trong bộ nhớ trang, đóng trang là hết.
 */
export function IdScanCard({
  onPick,
  embedded = false,
}: {
  /**
   * Có hàm này nghĩa là thẻ đang được NHÚNG vào hồ sơ bảo hiểm của một người
   * bay cụ thể: quét xong bấm một nút là điền thẳng vào dòng người đó, không
   * còn danh sách rời để chép tay nữa.
   */
  onPick?: (p: ScannedPerson) => void;
  /** Bỏ vỏ thẻ tím (đã nằm trong khối khác rồi). */
  embedded?: boolean;
} = {}) {
  const [busy, setBusy] = useState<"" | "qr" | "ocr">("");
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<ScannedPerson | null>(null);
  const [list, setList] = useState<ScannedPerson[]>([]);
  const [copied, setCopied] = useState(false);
  const [scanning, setScanning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const passportRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<number | null>(null);

  // Rời thẻ mà quên tắt thì camera vẫn sáng — dọn khi tháo thành phần
  useEffect(() => () => stopCamera(), []);

  /** Ảnh → canvas, thu nhỏ cạnh dài về 1600px cho OCR chạy nhanh mà vẫn đủ nét. */
  async function toCanvas(file: File, maxSide = 1600): Promise<HTMLCanvasElement> {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  /**
   * Bộ đọc mã vạch DỰNG SẴN trong máy (Chrome/Android) — chạy bằng mã máy nên
   * nhanh và nhạy hơn hẳn thư viện JS. Không có thì mới dùng jsQR.
   */
  async function nativeQr(source: HTMLCanvasElement | ImageBitmap): Promise<string | null> {
    const w = window as unknown as { BarcodeDetector?: new (o?: { formats?: string[] }) => { detect: (s: unknown) => Promise<Array<{ rawValue: string }>> } };
    if (!w.BarcodeDetector) return null;
    try {
      const detector = new w.BarcodeDetector({ formats: ["qr_code"] });
      const found = await detector.detect(source);
      return found[0]?.rawValue ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Ảnh chụp cả thẻ thì mã QR chỉ chiếm một góc nhỏ, giải một lần thường trượt.
   * Nên thử theo thứ tự rẻ→đắt: bộ đọc của máy · toàn ảnh · rồi CẮT TỪNG GÓC
   * (QR của CCCD nằm góc phải) và phóng to lên. Trượt hết mới chịu.
   */
  async function readQr(canvas: HTMLCanvasElement): Promise<string | null> {
    const native = await nativeQr(canvas);
    if (native) return native;

    const { default: jsQR } = await import("jsqr");
    const tryPart = (sx: number, sy: number, sw: number, sh: number, out = 900): string | null => {
      const c = document.createElement("canvas");
      const scale = out / Math.max(sw, sh);
      c.width = Math.round(sw * scale);
      c.height = Math.round(sh * scale);
      const ctx = c.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, c.width, c.height);
      const d = ctx.getImageData(0, 0, c.width, c.height);
      return jsQR(d.data, d.width, d.height, { inversionAttempts: "attemptBoth" })?.data ?? null;
    };

    const W = canvas.width;
    const H = canvas.height;
    const attempts: Array<[number, number, number, number]> = [
      [0, 0, W, H], // toàn ảnh
      [W * 0.45, 0, W * 0.55, H * 0.6], // góc trên phải
      [W * 0.45, H * 0.4, W * 0.55, H * 0.6], // góc dưới phải
      [W * 0.25, H * 0.2, W * 0.5, H * 0.6], // giữa thẻ
      [0, 0, W * 0.55, H * 0.6], // góc trên trái
      [0, H * 0.4, W * 0.55, H * 0.6], // góc dưới trái
    ];
    for (const [sx, sy, sw, sh] of attempts) {
      // Phóng to hơn nữa cho mã in mờ: 900px trượt thì thử lại ở 1400px
      const hit = tryPart(sx, sy, sw, sh) ?? tryPart(sx, sy, sw, sh, 1400);
      if (hit) return hit;
    }
    return null;
  }

  /**
   * OCR chỉ chạy trên DẢI ĐÁY của ảnh — MRZ luôn nằm đó. Cắt bớt vừa nhanh gấp
   * mấy lần vừa đỡ đọc nhầm chữ ở phần trên hộ chiếu.
   */
  async function ocrStrip(src: HTMLCanvasElement, fromRatio: number): Promise<string> {
    const strip = document.createElement("canvas");
    strip.width = src.width;
    strip.height = Math.round(src.height * (1 - fromRatio));
    strip
      .getContext("2d")
      ?.drawImage(src, 0, Math.round(src.height * fromRatio), src.width, strip.height, 0, 0, strip.width, strip.height);

    const { default: Tesseract } = await import("tesseract.js");
    const { data } = await Tesseract.recognize(strip, "eng", {
      // @ts-expect-error tuỳ chọn của tesseract không có trong kiểu
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<",
    });
    return data.text ?? "";
  }

  /**
   * Đọc dãy MRZ. Thử DẢI ĐÁY trước (MRZ luôn nằm đó, cắt bớt vừa nhanh vừa đỡ
   * đọc nhầm chữ phía trên), trượt thì thử NỬA DƯỚI rồi cả ảnh — ảnh chụp lệch
   * hay thẻ nằm nghiêng thì dải 32% có khi cắt mất một dòng.
   */
  async function readMrz(canvas: HTMLCanvasElement): Promise<string> {
    for (const ratio of [0.68, 0.5, 0]) {
      const text = await ocrStrip(canvas, ratio);
      if (parseMrz(text)) return text;
    }
    return "";
  }

  /**
   * Đọc ảnh theo ĐÚNG LOẠI GIẤY TỜ người dùng chọn.
   *
   * Trước đây gộp một nút: QR trượt là tự rơi xuống OCR — chờ chục giây rồi bóc
   * ra dữ liệu rác. Nay tách hẳn: CCCD chỉ đọc QR (không bao giờ chờ OCR), hộ
   * chiếu mới chạy OCR dải MRZ.
   */
  async function handleFile(file: File | undefined, kind: "cccd" | "passport") {
    if (!file) return;
    setError(null);
    setCopied(false);
    setCurrent(null);
    try {
      const canvas = await toCanvas(file, 1800);

      if (kind === "cccd") {
        setBusy("qr");
        const qr = await readQr(canvas);
        const person = qr ? parseCccdQr(qr) : null;
        if (person) return setCurrent(person);

        /**
         * QR TRƯỢT THÌ ĐỌC CHỮ.
         *
         * Mã QR trên CCCD nhỏ, in mờ dần theo thời gian, gặp ánh sáng chéo là
         * trượt — đó là lý do tỉ lệ quét ra thấp. Mặt sau thẻ có DÃY MRZ (ba
         * dòng chữ máy in bằng phông riêng, có số kiểm tra) — thứ sinh ra để
         * máy đọc, nên đọc chữ ở đó ăn đứt việc soi lại mã QR mờ.
         */
        setBusy("ocr");
        const person2 = parseMrz(await readMrz(canvas));
        if (person2) return setCurrent(person2);

        setError(
          qr
            ? "Đọc được mã QR nhưng không phải QR của CCCD gắn chip."
            : "Chưa đọc được thẻ này. Cách chắc ăn nhất: chụp MẶT SAU thẻ, lấy trọn ba dòng chữ máy ở đáy (dòng có nhiều dấu <<<), để ngang, đủ sáng.",
        );
        return;
      }

      setBusy("ocr");
      const text = await readMrz(canvas);
      const person = parseMrz(text);
      if (person) return setCurrent(person);
      setError("Chưa đọc được hai dòng chữ máy. Chụp lại trang có ảnh, để NGANG, chụp sát phần đáy, đủ sáng.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không đọc được ảnh giấy tờ");
    } finally {
      setBusy("");
      if (fileRef.current) fileRef.current.value = "";
      if (passportRef.current) passportRef.current.value = "";
    }
  }

  /**
   * QUÉT TRỰC TIẾP bằng camera — cách nhanh nhất với CCCD: soi thẻ vào khung,
   * máy đọc liên tục ~8 lần/giây và tự dừng ngay khi bắt được mã. Khỏi phải
   * chụp, khỏi chờ, khỏi lo ảnh mờ.
   */
  async function startCamera() {
    setError(null);
    setCurrent(null);
    setCopied(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      setScanning(true);
      // Chờ React vẽ thẻ video ra rồi mới gắn luồng hình
      requestAnimationFrame(async () => {
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play().catch(() => {});
        loopRef.current = window.setInterval(async () => {
          const v = videoRef.current;
          if (!v || v.readyState < 2) return;
          const c = document.createElement("canvas");
          c.width = 960;
          c.height = Math.round((v.videoHeight / v.videoWidth) * 960) || 720;
          c.getContext("2d")?.drawImage(v, 0, 0, c.width, c.height);
          const raw = (await nativeQr(c)) ?? (await readQr(c));
          const person = raw ? parseCccdQr(raw) : null;
          if (person) {
            stopCamera();
            setCurrent(person);
          }
        }, 120);
      });
    } catch (err: unknown) {
      /**
       * Nói ĐÚNG nguyên nhân. Bản trước lúc nào cũng đổ cho "quyền camera" nên
       * ai gặp lỗi cũng đi chỉnh cài đặt máy — trong khi thủ phạm thật có thể
       * là trang đang mở qua http (trình duyệt chỉ cho camera trên https), hay
       * máy đang có ứng dụng khác giữ camera.
       */
      const name = err instanceof Error ? err.name : "";
      const insecure = typeof window !== "undefined" && !window.isSecureContext;
      setError(
        insecure
          ? "Trang đang mở qua http nên trình duyệt cấm camera. Vào bằng địa chỉ https://www.mebayluon.com rồi thử lại."
          : name === "NotAllowedError"
            ? "Bạn (hoặc trình duyệt) đã từ chối quyền camera. Bấm vào biểu tượng ổ khoá cạnh địa chỉ web → Quyền → Camera → Cho phép, rồi tải lại trang."
            : name === "NotFoundError"
              ? "Máy này không thấy camera nào. Dùng nút “CCCD từ ảnh có sẵn” để chọn ảnh chụp sẵn."
              : name === "NotReadableError"
                ? "Camera đang bị ứng dụng khác chiếm (Zalo, Camera…). Đóng ứng dụng đó rồi thử lại."
                : `Không mở được camera${name ? ` (${name})` : ""} — thử nút “CCCD từ ảnh có sẵn”.`,
      );
    }
  }

  function stopCamera() {
    if (loopRef.current) window.clearInterval(loopRef.current);
    loopRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }

  const set = (patch: Partial<ScannedPerson>) => setCurrent((prev) => (prev ? { ...prev, ...patch } : prev));

  /** Một dòng cho danh sách bảo hiểm: dán thẳng vào Zalo hay bảng của bên bảo hiểm. */
  const lineOf = (p: ScannedPerson) =>
    [p.fullName, p.birthday, p.gender, p.idNumber, p.nationality].filter(Boolean).join(" · ");

  async function copyAll() {
    const text = list.map((p, i) => `${i + 1}. ${lineOf(p)}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setError("Máy không cho chép tự động — bấm giữ vào danh sách để chép tay.");
    }
  }

  /**
   * Ruột thẻ tách ra biến, KHÔNG bọc bằng một component khai trong thân hàm:
   * component khai lại mỗi lần vẽ là React coi như thẻ khác, dựng lại cả cây —
   * khung camera đang quét bị tháo và ô đang gõ mất con trỏ.
   */
  const body = (
    <>
      {/*
        KHÔNG dùng thuộc tính `capture`. Có `capture` là điện thoại/tablet mở
        THẲNG camera, nút "CCCD từ ảnh" hoá ra lại là chụp ảnh — đúng thứ người
        dùng không muốn khi đã có sẵn ảnh trong máy. Bỏ đi thì máy hiện khay
        chọn có cả "Thư viện ảnh" lẫn "Chụp ảnh", ai cần gì chọn nấy.
      */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0], "cccd")}
      />
      <input
        ref={passportRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0], "passport")}
      />
      {/* CCCD MẶT SAU đi thẳng đường đọc chữ máy — dùng chung bộ đọc MRZ với hộ chiếu */}
      <input
        ref={backRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0], "passport")}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          className="h-10 bg-violet-600 px-3 text-xs hover:bg-violet-700"
          disabled={busy !== "" || scanning}
          onClick={startCamera}
        >
          🎥 Quét CCCD bằng camera (nhanh nhất)
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-10 bg-white px-3 text-xs"
          disabled={busy !== "" || scanning}
          onClick={() => fileRef.current?.click()}
        >
          {busy === "qr" ? "Đang đọc mã QR…" : "🖼 CCCD từ ảnh có sẵn"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-10 bg-white px-3 text-xs"
          disabled={busy !== "" || scanning}
          onClick={() => backRef.current?.click()}
          title="Ảnh mặt sau thẻ — máy đọc ba dòng chữ máy ở đáy, chắc ăn hơn soi mã QR mờ"
        >
          {busy === "ocr" ? "Đang đọc chữ…" : "🔤 CCCD MẶT SAU (đọc chữ)"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-10 bg-white px-3 text-xs"
          disabled={busy !== "" || scanning}
          onClick={() => passportRef.current?.click()}
        >
          {busy === "ocr" ? "Đang đọc hộ chiếu…" : "🛂 Hộ chiếu (ảnh dòng đáy)"}
        </Button>
      </div>
      <p className="mt-1 text-[11px] leading-tight text-slate-500">
        <strong>Mã QR mờ hay loá thì đừng cố:</strong> chụp <strong>MẶT SAU</strong> thẻ, lấy trọn ba dòng chữ máy ở
        đáy (dòng nhiều dấu <code>&lt;&lt;&lt;</code>) — dãy đó sinh ra để máy đọc, có số kiểm tra nên đọc sai là báo
        ngay. Quét QR mặt trước bằng camera vẫn nhanh nhất khi thẻ còn mới. Hộ chiếu: chụp trang có ảnh, để ngang,
        thấy rõ hai dòng chữ máy ở đáy. Ảnh chỉ đọc trong máy, không gửi đi đâu, không lưu lại.
      </p>

      {scanning && (
        <div className="mt-2 overflow-hidden rounded-xl border-2 border-violet-400 bg-black">
          <video ref={videoRef} playsInline muted className="block max-h-72 w-full object-contain" />
          <div className="flex items-center justify-between gap-2 bg-violet-600 px-2.5 py-1.5">
            <span className="text-xs font-semibold text-white">Đưa mã QR trên CCCD vào khung…</span>
            <Button type="button" variant="ghost" className="h-7 bg-white px-2.5 text-xs" onClick={stopCamera}>
              Đóng camera
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-2">
          <Banner tone="error">{error}</Banner>
        </div>
      )}

      {current && (
        <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50/60 p-2.5">
          <div className="mb-1.5 text-xs font-bold text-violet-900">
            Đọc từ {current.source === "cccd" ? "CCCD gắn chip (mã QR)" : "hộ chiếu (dòng MRZ)"} — soát lại rồi thêm
            vào danh sách:
          </div>
          {current.warnings.length > 0 && (
            <ul className="mb-1.5 list-inside list-disc text-[11px] leading-tight text-amber-800">
              {current.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
          <div className="grid grid-cols-2 gap-2 @md:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-slate-500">Họ và tên</span>
              <TextInput value={current.fullName} onChange={(e) => set({ fullName: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-slate-500">Ngày sinh</span>
              <TextInput value={current.birthday} onChange={(e) => set({ birthday: e.target.value })} placeholder="dd/mm/yyyy" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-slate-500">Giới tính</span>
              <TextInput value={current.gender} onChange={(e) => set({ gender: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-slate-500">Số CCCD / Hộ chiếu</span>
              <TextInput value={current.idNumber} onChange={(e) => set({ idNumber: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-slate-500">Quốc tịch</span>
              <TextInput value={current.nationality} onChange={(e) => set({ nationality: e.target.value })} />
            </label>
          </div>
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              className="h-9 flex-1 bg-emerald-600 px-3 text-xs hover:bg-emerald-700"
              onClick={() => {
                if (onPick) onPick(current);
                else setList((prev) => [...prev, current]);
                setCurrent(null);
                setCopied(false);
              }}
            >
              {onPick ? "✓ Điền vào hồ sơ người này" : "＋ Thêm vào danh sách bảo hiểm"}
            </Button>
            <Button type="button" variant="ghost" className="h-9 bg-white px-3 text-xs" onClick={() => setCurrent(null)}>
              Bỏ
            </Button>
          </div>
        </div>
      )}

      {!onPick && list.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-700">Danh sách bảo hiểm ({list.length})</span>
            <span className="flex gap-1">
              <Button type="button" variant="ghost" className="h-8 bg-white px-2.5 text-xs" onClick={copyAll}>
                {copied ? "✓ Đã chép" : "📋 Chép danh sách"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-8 bg-white px-2.5 text-xs text-rose-700"
                onClick={() => {
                  setList([]);
                  setCopied(false);
                }}
              >
                Xoá hết
              </Button>
            </span>
          </div>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {list.map((p, i) => (
              <li key={`${p.idNumber}-${i}`} className="flex items-center gap-2 px-2.5 py-1.5">
                <span className="shrink-0 text-sm font-bold tabular-nums text-violet-700">{i + 1}.</span>
                <span className="min-w-0 flex-1 text-sm leading-snug text-slate-700">{lineOf(p)}</span>
                <button
                  type="button"
                  onClick={() => setList((prev) => prev.filter((_, k) => k !== i))}
                  className="h-7 shrink-0 rounded-lg border border-slate-300 bg-white px-2 text-xs font-medium text-slate-400 hover:border-rose-500 hover:text-rose-600"
                >
                  Xoá
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );

  if (embedded) return <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-2.5">{body}</div>;
  return (
    <CollapseCard
      className="border-violet-300"
      headerClassName="bg-violet-600 text-white"
      title="🪪 Quét CCCD / Hộ chiếu"
      hint="lấy thông tin làm bảo hiểm"
    >
      {body}
    </CollapseCard>
  );
}
