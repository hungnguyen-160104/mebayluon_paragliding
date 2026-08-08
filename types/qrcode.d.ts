// types/qrcode.d.ts
/**
 * Gói `qrcode` không kèm khai báo kiểu và dự án chưa cài @types/qrcode.
 * Chỉ khai đúng hàm đang dùng (toDataURL) thay vì `declare module` trống,
 * để TypeScript vẫn kiểm được lời gọi.
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

  const _default: { toDataURL: typeof toDataURL };
  export default _default;
}
