"use client";

/**
 * IN THẲNG QUA RAWBT — dành cho máy in nhiệt chỉ có BLUETOOTH CỔ ĐIỂN (SPP),
 * đúng kiểu Gainscha B300 (chủ 13/09: "tôi không muốn trạm in, tôi cần in
 * trực tiếp từ máy được kết nối"; máy Honor Pad 10 không ghép được BLE).
 *
 * Vì sao phải qua một ứng dụng: trình duyệt CHỈ nối được Bluetooth năng lượng
 * thấp (BLE). Bluetooth cổ điển — thứ B300 dùng và thứ Android ghép trong
 * phần Cài đặt — không có cửa nào cho trang web. RawBT là cầu nối: máy in ghép
 * MỘT LẦN ở Cài đặt Bluetooth của máy, trang web đẩy luồng ESC/POS sang RawBT
 * bằng đường liên kết `rawbt:`, RawBT in ra máy in. Không qua máy nào khác,
 * đúng nghĩa in thẳng từ máy đang bấm.
 *
 * Cài một lần: RawBT (ru.a402d.rawbtprinter) trên CH Play / AppGallery, mở ra
 * chọn máy in Bluetooth đã ghép. Từ đó bấm IN VÉ là ra vé.
 *
 * Giới hạn: chỉ Android. Dữ liệu đi qua đường liên kết nên GỬI TỪNG LIÊN, mỗi
 * liên một lượt, nghỉ giữa các lượt cho RawBT kịp nhận.
 */

import { anhSangEscPos, RONG_CHAM } from "./may-in-usb";

const KHOA_LUU = "baobay.mayInRawbt";

/** Android mới mở được RawBT. */
export function mayCoTheDungRawbt(): boolean {
  return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
}

export function rawbtDaBat(): boolean {
  try {
    return localStorage.getItem(KHOA_LUU) === "1";
  } catch {
    return false;
  }
}

export function batRawbt(bat: boolean): void {
  try {
    if (bat) localStorage.setItem(KHOA_LUU, "1");
    else localStorage.removeItem(KHOA_LUU);
  } catch {
    /* bộ nhớ bị chặn */
  }
}

/** Uint8Array → base64, cắt khúc để không tràn ngăn xếp khi ảnh lớn. */
function sangBase64(d: Uint8Array): string {
  let s = "";
  const KHUC = 0x8000;
  for (let i = 0; i < d.length; i += KHUC) s += String.fromCharCode(...d.subarray(i, i + KHUC));
  return btoa(s);
}

const ESC_INIT = new Uint8Array([0x1b, 0x40]);
/**
 * CẮT GIẤY: `GS V 66 0` = tự đẩy giấy ĐÚNG tới lưỡi cắt rồi cắt một phần — thay
 * cho "đẩy 4 dòng rồi cắt" trước đây (chủ 18/09: đuôi vé trắng tới 1,5 cm vì
 * đẩy thừa). Máy không hiểu lệnh 66 thì rơi về cắt thường ở dòng hiện tại.
 */
const ESC_CAT = new Uint8Array([0x1d, 0x56, 0x42, 0x00]);

function noi(...phan: Uint8Array[]): Uint8Array {
  const tong = phan.reduce((t, p) => t + p.length, 0);
  const ra = new Uint8Array(tong);
  let o = 0;
  for (const p of phan) {
    ra.set(p, o);
    o += p.length;
  }
  return ra;
}

/**
 * Mở một liên kết `rawbt:` — phải dùng thẻ <a> bấm giả lập chứ không đổi
 * location.href: Chrome Android chặn chuyển hướng sang scheme lạ khi không
 * phải hành động của người dùng, còn thẻ <a> thì đi được.
 */
function moRawbt(url: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => a.parentNode && document.body.removeChild(a), 1000);
}

/**
 * IN MỘT LOẠT ẢNH qua RawBT.
 *
 * Chủ 18/09: "vé có 2 liên mà chỉ in liên 1.1". Nguyên nhân: mỗi liên gửi một
 * liên kết `rawbt:` và giữa hai lượt có `await` nghỉ 1,2 giây — sang lượt hai
 * cú bấm đã nguội, Chrome Android CHẶN mở scheme lạ không do người dùng bấm,
 * nên liên 2 rơi mất mà không báo. Nay: GỘP các liên vào MỘT liên kết (cắt sau
 * mỗi liên vẫn có), miễn tổng dưới ~180 nghìn ký tự base64; dài hơn thì chia
 * thành vài gói và MỞ TẤT CẢ NGAY TRONG CÚ BẤM (không await ở giữa) — RawBT
 * xếp hàng các lệnh tới và in lần lượt.
 */
export async function inAnhQuaRawbt(anh: HTMLCanvasElement[], baoTienDo?: (chu: string) => void): Promise<void> {
  if (!mayCoTheDungRawbt()) throw new Error("Đường RawBT chỉ chạy trên máy Android");
  const GIOI_HAN = 180_000;
  const goi: Uint8Array[] = [];
  let dang: Uint8Array[] = [];
  let doDai = 0;
  for (let i = 0; i < anh.length; i++) {
    const c = anh[i];
    if (c.width !== RONG_CHAM) throw new Error(`Ảnh vé phải rộng ${RONG_CHAM} chấm (đang ${c.width})`);
    const phan = noi(anhSangEscPos(c), ESC_CAT);
    const them = Math.ceil((phan.length * 4) / 3);
    if (dang.length && doDai + them > GIOI_HAN) {
      goi.push(noi(...dang));
      dang = [];
      doDai = 0;
    }
    dang.push(phan);
    doDai += them;
  }
  if (dang.length) goi.push(noi(...dang));
  baoTienDo?.(`Đang gửi ${anh.length} liên sang RawBT…`);
  /** Tất cả trong cùng một cú bấm — không await giữa các gói. */
  /** ESC_INIT nối vào BYTE của gói đầu rồi mới mã hoá — nối hai chuỗi base64 có đệm "=" là hỏng. */
  goi.forEach((bytes, i) => moRawbt(`rawbt:base64,${sangBase64(i === 0 ? noi(ESC_INIT, bytes) : bytes)}`));
}

/** Liên kết cài RawBT — hiện trong hướng dẫn khi máy chưa có. */
export const LINK_CAI_RAWBT = "https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter";
