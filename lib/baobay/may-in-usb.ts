"use client";

/**
 * MÁY IN NHIỆT QUA USB — nói chuyện thẳng với máy in bằng ESC/POS, không cần
 * driver, không cần hộp thoại in.
 *
 * Vì sao có đường này bên cạnh hộp thoại in của trình duyệt (chủ 12/09: quầy
 * Khau Phạ và Sa Pa bắt đầu in vé bằng Gainscha B300 khổ 80mm):
 *  - Hộp thoại in cần cài DRIVER của hãng lên từng máy, và trên máy tính bảng /
 *    Android thì không có driver mà cài. WebUSB đi thẳng vào cổng USB.
 *  - Máy in nhiệt hiểu ESC/POS; ta gửi vé dưới dạng ẢNH BITMAP (lệnh GS v 0)
 *    chứ không gửi chữ: bảng mã của máy không có tiếng Việt có dấu, gửi chữ
 *    là mất dấu, còn gửi ảnh thì in ra đúng từng nét, kể cả mã QR.
 *
 * Giới hạn thật, nói trước:
 *  - Chrome / Edge mới có WebUSB. Safari và Firefox không có → dùng hộp thoại in.
 *  - Windows: cổng USB của máy in thường bị driver của hãng "giữ", Chrome không
 *    chen vào được; phải gán WinUSB (công cụ Zadig) cho máy in — làm một lần.
 *  - Bluetooth của B300 là kiểu SPP cổ điển, Web Bluetooth không nối được.
 *
 * Toàn bộ module chỉ chạy trong trình duyệt (dùng `navigator.usb`).
 */

/** 80mm giấy → vùng in 72mm → 576 chấm ở 203 dpi. Mọi ảnh đưa vào phải rộng đúng 576. */
export const RONG_CHAM = 576;

const KHOA_LUU = "baobay.mayInUsb";

type ThietBi = { vendorId: number; productId: number };

/** Máy in đã ghép lần trước (lưu trong máy này) — chưa ghép thì null. */
export function mayInDaGhep(): ThietBi | null {
  try {
    const raw = localStorage.getItem(KHOA_LUU);
    if (!raw) return null;
    const v = JSON.parse(raw) as ThietBi;
    return typeof v?.vendorId === "number" && typeof v?.productId === "number" ? v : null;
  } catch {
    return null;
  }
}

export function boGhepMayIn(): void {
  try {
    localStorage.removeItem(KHOA_LUU);
  } catch {
    /* bộ nhớ trình duyệt bị chặn thì thôi */
  }
}

export function trinhDuyetCoUsb(): boolean {
  return typeof navigator !== "undefined" && "usb" in navigator;
}

type UsbDeviceLike = {
  vendorId: number;
  productId: number;
  productName?: string;
  opened: boolean;
  configuration: { interfaces: Array<{ interfaceNumber: number; alternate: { interfaceClass: number; endpoints: Array<{ direction: string; endpointNumber: number; type: string }> } }> } | null;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(n: number): Promise<void>;
  claimInterface(n: number): Promise<void>;
  releaseInterface(n: number): Promise<void>;
  transferOut(ep: number, data: BufferSource): Promise<{ status: string; bytesWritten: number }>;
};

type UsbLike = {
  requestDevice(o: { filters: Array<Record<string, number>> }): Promise<UsbDeviceLike>;
  getDevices(): Promise<UsbDeviceLike[]>;
};

function usb(): UsbLike {
  return (navigator as unknown as { usb: UsbLike }).usb;
}

/**
 * GHÉP MÁY IN: trình duyệt bật hộp chọn thiết bị USB, người trực chọn máy in.
 * Lọc theo LỚP THIẾT BỊ "máy in" (class 7) chứ không theo mã hãng — Gainscha
 * có nhiều đời, mã đổi theo đời, lọc cứng là hụt.
 */
export async function ghepMayIn(): Promise<string> {
  if (!trinhDuyetCoUsb()) throw new Error("Trình duyệt này không có WebUSB — dùng Chrome hoặc Edge.");
  const d = await usb().requestDevice({ filters: [{ classCode: 7 }] });
  try {
    localStorage.setItem(KHOA_LUU, JSON.stringify({ vendorId: d.vendorId, productId: d.productId }));
  } catch {
    /* không lưu được thì lần sau ghép lại */
  }
  return d.productName || `USB ${d.vendorId.toString(16)}:${d.productId.toString(16)}`;
}

async function moMayIn(): Promise<{ d: UsbDeviceLike; ep: number; iface: number }> {
  const luu = mayInDaGhep();
  if (!luu) throw new Error("Chưa ghép máy in USB");
  const ds = await usb().getDevices();
  const d = ds.find((x) => x.vendorId === luu.vendorId && x.productId === luu.productId);
  if (!d) throw new Error("Không thấy máy in đã ghép — cắm lại USB hoặc ghép lại");
  if (!d.opened) await d.open();
  if (!d.configuration) await d.selectConfiguration(1);
  const cfg = d.configuration;
  if (!cfg) throw new Error("Máy in không có cấu hình USB");
  /** Tìm giao diện lớp máy in có endpoint OUT kiểu bulk. */
  for (const it of cfg.interfaces) {
    const alt = it.alternate;
    const out = alt.endpoints.find((e) => e.direction === "out" && e.type === "bulk");
    if (out && (alt.interfaceClass === 7 || cfg.interfaces.length === 1)) {
      await d.claimInterface(it.interfaceNumber);
      return { d, ep: out.endpointNumber, iface: it.interfaceNumber };
    }
  }
  throw new Error("Không tìm thấy cổng ghi của máy in (WinUSB chưa gán?)");
}

/**
 * ẢNH → LỆNH ESC/POS RASTER (GS v 0).
 *
 * Mỗi byte là 8 chấm ngang, bit 1 = đen. Ngưỡng đen 160/255 — chữ đen trên
 * nền trắng in rõ, xám nhạt (viền bảng) rơi về trắng chứ không lấm tấm.
 * Cắt thành từng khúc tối đa 512 dòng: một lệnh quá dài là máy nghẹn bộ đệm.
 */
export function anhSangEscPos(canvas: HTMLCanvasElement): Uint8Array {
  const w = canvas.width;
  const h = canvas.height;
  const g = canvas.getContext("2d");
  if (!g) throw new Error("Không đọc được ảnh vé");
  const px = g.getImageData(0, 0, w, h).data;
  const bytesRow = Math.ceil(w / 8);
  const khuc: Uint8Array[] = [];
  const KHUC_DONG = 512;
  for (let y0 = 0; y0 < h; y0 += KHUC_DONG) {
    const soDong = Math.min(KHUC_DONG, h - y0);
    const dau = new Uint8Array([0x1d, 0x76, 0x30, 0x00, bytesRow & 0xff, (bytesRow >> 8) & 0xff, soDong & 0xff, (soDong >> 8) & 0xff]);
    const than = new Uint8Array(bytesRow * soDong);
    for (let y = 0; y < soDong; y++) {
      for (let x = 0; x < w; x++) {
        const i = ((y0 + y) * w + x) * 4;
        /** Ảnh có thể trong suốt (alpha 0) — coi như trắng. */
        const a = px[i + 3] / 255;
        const sang = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) * a + 255 * (1 - a);
        if (sang < 160) than[y * bytesRow + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
    khuc.push(dau, than);
  }
  const tong = khuc.reduce((t, k) => t + k.length, 0);
  const ra = new Uint8Array(tong);
  let o = 0;
  for (const k of khuc) {
    ra.set(k, o);
    o += k.length;
  }
  return ra;
}

const ESC_INIT = new Uint8Array([0x1b, 0x40]);
/** Đẩy giấy 4 dòng rồi CẮT NỬA (giữ một mép cho dễ xé) — B300 có dao cắt. */
const ESC_CAT = new Uint8Array([0x1b, 0x64, 0x04, 0x1d, 0x56, 0x01]);

/**
 * IN MỘT LOẠT ẢNH, mỗi ảnh một liên, cắt giấy sau mỗi liên.
 * Gửi từng khúc 16KB: transferOut một cục quá to hay bị trình duyệt từ chối.
 */
export async function inAnhQuaUsb(anh: HTMLCanvasElement[]): Promise<void> {
  const { d, ep, iface } = await moMayIn();
  try {
    const gui = async (data: Uint8Array) => {
      const KHUC = 16 * 1024;
      for (let i = 0; i < data.length; i += KHUC) {
        const phan = data.slice(i, i + KHUC);
        const r = await d.transferOut(ep, phan);
        if (r.status !== "ok") throw new Error(`Máy in trả về ${r.status}`);
      }
    };
    await gui(ESC_INIT);
    for (const c of anh) {
      if (c.width !== RONG_CHAM) throw new Error(`Ảnh vé phải rộng ${RONG_CHAM} chấm (đang ${c.width})`);
      await gui(anhSangEscPos(c));
      await gui(ESC_CAT);
    }
  } finally {
    try {
      await d.releaseInterface(iface);
    } catch {
      /* máy rút giữa chừng thì thôi */
    }
  }
}
