/**
 * ĐỌC MÃ QR trong trình duyệt — dùng chung cho trang Quét vé và hộp quét nhanh
 * trên trang phi công (chủ 20/09). Chỉ chạy phía client (canvas, BarcodeDetector).
 */

/** Ảnh → canvas (thu về 1600px là đủ cho QR vé, mã chỉ ~25 ô mỗi cạnh). */
export async function anhSangCanvas(file: File, maxSide = 1600): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Bộ đọc dựng sẵn của máy (Chrome/Android) — nhanh hơn thư viện; không có thì jsQR. */
export async function docQrTuCanvas(canvas: HTMLCanvasElement): Promise<string | null> {
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
