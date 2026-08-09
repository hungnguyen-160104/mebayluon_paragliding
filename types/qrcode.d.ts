// types/qrcode.d.ts
/**
 * Gói `qrcode` không kèm khai báo kiểu và dự án chưa cài @types/qrcode.
 * Chỉ khai đúng những hàm đang dùng thay vì `declare module` trống, để
 * TypeScript vẫn kiểm được lời gọi:
 *   - toDataURL: vẽ mã QR ngay trên trình duyệt (vé bay, trang đăng ký)
 *   - toBuffer : vẽ ở máy chủ để đính kèm vào email
 */
declare module "qrcode" {
  export interface QRCodeToDataURLOptions {
    margin?: number;
    width?: number;
    scale?: number;
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    color?: { dark?: string; light?: string };
  }

  export function toDataURL(
    text: string,
    options?: QRCodeToDataURLOptions,
  ): Promise<string>;

  export function toBuffer(
    text: string,
    options?: QRCodeToDataURLOptions,
  ): Promise<Buffer>;

  const _default: {
    toDataURL: typeof toDataURL;
    toBuffer: typeof toBuffer;
  };
  export default _default;
}
