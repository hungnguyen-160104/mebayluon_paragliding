"use client";

/**
 * MÁY IN NHIỆT QUA BLUETOOTH (Gainscha B300 là máy in DI ĐỘNG — chủ 12/09:
 * "ghép nối máy in nhiệt là qua Bluetooth chứ không phải USB").
 *
 * Trình duyệt chỉ nối được Bluetooth NĂNG LƯỢNG THẤP (BLE, qua Web Bluetooth),
 * không nối được Bluetooth cổ điển (SPP) mà ứng dụng in của hãng hay dùng. May
 * là hầu hết máy in nhiệt đời mới phát cả hai kênh: trong danh sách Bluetooth
 * của điện thoại thường thấy hai tên gần giống nhau, một cái là BLE. Ta nối
 * kênh BLE và gửi đúng luồng ESC/POS như qua USB (vé dạng ảnh 576 chấm).
 *
 * Không biết trước máy in dùng dịch vụ BLE nào (mỗi hãng một mã), nên:
 *  - xin mọi thiết bị (acceptAllDevices) kèm danh sách dịch vụ hay gặp ở máy in
 *    ESC/POS để được phép đọc chúng sau khi nối;
 *  - nối xong, duyệt mọi dịch vụ, lấy đặc tính đầu tiên GHI ĐƯỢC làm cổng in.
 *
 * Giới hạn: chỉ Chrome / Edge trên Android, Windows, macOS, ChromeOS có Web
 * Bluetooth; Safari (iPhone/iPad) không có. Tốc độ BLE thấp: một liên ~50 KB
 * mất 3–6 giây, bốn liên mất khoảng 20 giây — chấp nhận được với quầy, nhưng
 * đừng bấm in hai lần liền.
 */

import { anhSangEscPos, RONG_CHAM } from "./may-in-usb";

const KHOA_LUU = "baobay.mayInBluetooth";

/** Dịch vụ BLE hay gặp ở máy in ESC/POS (Gainscha, Xprinter, Goojprt, Sunmi, Microchip UART, Nordic UART, HM-10). */
const DICH_VU_MAY_IN = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "0000ffe5-0000-1000-8000-00805f9b34fb",
  "0000fff0-0000-1000-8000-00805f9b34fb",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
  "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
];

type DacTinh = {
  properties: { write?: boolean; writeWithoutResponse?: boolean };
  writeValueWithResponse?(v: BufferSource): Promise<void>;
  writeValueWithoutResponse?(v: BufferSource): Promise<void>;
  writeValue(v: BufferSource): Promise<void>;
};
type DichVu = { getCharacteristics(): Promise<DacTinh[]> };
type Gatt = { connected: boolean; connect(): Promise<Gatt>; disconnect(): void; getPrimaryServices(): Promise<DichVu[]> };
type ThietBiBle = { id: string; name?: string; gatt?: Gatt };
type BluetoothLike = {
  requestDevice(o: { acceptAllDevices?: boolean; optionalServices?: string[] }): Promise<ThietBiBle>;
  getDevices?(): Promise<ThietBiBle[]>;
};

function bt(): BluetoothLike | null {
  return typeof navigator !== "undefined" && "bluetooth" in navigator ? ((navigator as unknown as { bluetooth: BluetoothLike }).bluetooth ?? null) : null;
}

export function trinhDuyetCoBluetooth(): boolean {
  return bt() !== null;
}

/** Máy in đã ghép lần trước (chỉ tên và mã để hiện chữ "đã ghép"; kết nối thật giữ trong phiên). */
export function mayInBluetoothDaGhep(): { id: string; name: string } | null {
  try {
    const raw = localStorage.getItem(KHOA_LUU);
    if (!raw) return null;
    const v = JSON.parse(raw) as { id: string; name: string };
    return v?.id ? v : null;
  } catch {
    return null;
  }
}

export function boGhepMayInBluetooth(): void {
  try {
    localStorage.removeItem(KHOA_LUU);
  } catch {
    /* bỏ qua */
  }
  thietBiPhien = null;
}

/** Thiết bị đang giữ trong phiên (sau khi ghép hoặc lấy lại) — tải lại trang là mất, phải tìm lại. */
let thietBiPhien: ThietBiBle | null = null;

/** GHÉP: bật hộp chọn Bluetooth của trình duyệt, người trực chọn máy in. Phải gọi trong cú bấm. */
export async function ghepMayInBluetooth(): Promise<string> {
  const b = bt();
  if (!b) throw new Error("Trình duyệt này không có Web Bluetooth — dùng Chrome trên Android / máy tính.");
  const d = await b.requestDevice({ acceptAllDevices: true, optionalServices: DICH_VU_MAY_IN });
  thietBiPhien = d;
  try {
    localStorage.setItem(KHOA_LUU, JSON.stringify({ id: d.id, name: d.name || "Máy in Bluetooth" }));
  } catch {
    /* không lưu được thì lần sau ghép lại */
  }
  return d.name || "Máy in Bluetooth";
}

/**
 * Lấy lại thiết bị đã ghép sau khi tải lại trang: trình duyệt có getDevices()
 * (Chrome mới) thì tìm theo mã; không có thì phải bấm ghép lại (hộp chọn sẽ
 * hiện sẵn máy đã từng ghép).
 */
async function timThietBi(): Promise<ThietBiBle> {
  if (thietBiPhien) return thietBiPhien;
  const luu = mayInBluetoothDaGhep();
  if (!luu) throw new Error("Chưa ghép máy in Bluetooth");
  const b = bt();
  if (b?.getDevices) {
    const ds = await b.getDevices();
    const d = ds.find((x) => x.id === luu.id);
    if (d) {
      thietBiPhien = d;
      return d;
    }
  }
  throw new Error("Trang vừa tải lại nên mất kết nối máy in — bấm “Ghép máy in Bluetooth” lại (chọn đúng máy cũ)");
}

async function moCongGhi(): Promise<{ gatt: Gatt; dt: DacTinh }> {
  const d = await timThietBi();
  if (!d.gatt) throw new Error("Thiết bị này không có kênh BLE để in");
  const gatt = d.gatt.connected ? d.gatt : await d.gatt.connect();
  const dvs = await gatt.getPrimaryServices();
  /** Ưu tiên đặc tính ghi CÓ xác nhận (chắc từng byte), không có thì ghi không xác nhận. */
  let khongXacNhan: DacTinh | null = null;
  for (const dv of dvs) {
    for (const dt of await dv.getCharacteristics()) {
      if (dt.properties.write) return { gatt, dt };
      if (dt.properties.writeWithoutResponse && !khongXacNhan) khongXacNhan = dt;
    }
  }
  if (khongXacNhan) return { gatt, dt: khongXacNhan };
  gatt.disconnect();
  throw new Error("Máy in này không mở cổng ghi qua BLE — thử tên có chữ “BLE” trong danh sách, hoặc in qua USB");
}

const ESC_INIT = new Uint8Array([0x1b, 0x40]);
const ESC_CAT = new Uint8Array([0x1b, 0x64, 0x04, 0x1d, 0x56, 0x01]);

/**
 * GỬI DỮ LIỆU THEO KHÚC, tự co khúc khi máy từ chối: bắt đầu 512 byte (MTU lớn
 * của Android mới), lỗi thì 244 → 100 → 20 (MTU mặc định BLE). Ghi không xác
 * nhận thì nghỉ 15ms giữa các khúc cho bộ đệm máy in kịp thở.
 */
async function guiKhuc(dt: DacTinh, data: Uint8Array, baoTienDo?: (phan: number) => void): Promise<void> {
  const cac = [512, 244, 100, 20];
  let ci = 0;
  let i = 0;
  const coXacNhan = Boolean(dt.properties.write);
  while (i < data.length) {
    const khuc = cac[ci];
    const phan = data.slice(i, i + khuc);
    try {
      if (coXacNhan && dt.writeValueWithResponse) await dt.writeValueWithResponse(phan);
      else if (dt.writeValueWithoutResponse) await dt.writeValueWithoutResponse(phan);
      else await dt.writeValue(phan);
      i += khuc;
      if (!coXacNhan) await new Promise((r) => setTimeout(r, 15));
      baoTienDo?.(i / data.length);
    } catch (e) {
      if (ci < cac.length - 1) {
        ci += 1;
        continue;
      }
      throw e;
    }
  }
}

/** IN MỘT LOẠT ẢNH (mỗi ảnh một liên, cắt sau mỗi liên) qua Bluetooth. */
export async function inAnhQuaBluetooth(anh: HTMLCanvasElement[], baoTienDo?: (chu: string) => void): Promise<void> {
  const { gatt, dt } = await moCongGhi();
  try {
    await guiKhuc(dt, ESC_INIT);
    for (let k = 0; k < anh.length; k++) {
      const c = anh[k];
      if (c.width !== RONG_CHAM) throw new Error(`Ảnh vé phải rộng ${RONG_CHAM} chấm (đang ${c.width})`);
      await guiKhuc(dt, anhSangEscPos(c), (p) => baoTienDo?.(`Đang in liên ${k + 1}/${anh.length} · ${Math.round(p * 100)}%`));
      await guiKhuc(dt, ESC_CAT);
    }
  } finally {
    /** Giữ kết nối cho lần in sau trong cùng phiên — nối lại BLE mất 1–3 giây mỗi lần. */
  }
  void gatt;
}
