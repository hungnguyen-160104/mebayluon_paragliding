"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { chiaSeAnhPhieu, chiaSeDuocFile, luuAnhPhieu, taoAnhPhieu, type AnhPhieu, type BookingImageData } from "./booking-image";

/**
 * NÚT "XUẤT ẢNH" + KHUNG XEM ẢNH PHIẾU (chủ 14/09).
 *
 * Trước đây bấm là tải file / mở khay chia sẻ luôn, khách đứng cạnh không kịp
 * nhìn. Giờ bấm là bày FULL ảnh phiếu lên màn hình — khách giơ máy chụp lại
 * màn hình là xong — kèm hai nút LƯU ẢNH và CHIA SẺ (Zalo/Messenger/AirDrop
 * khi máy hỗ trợ). Ảnh dựng sẵn ngay khi mở khung để cú bấm "Chia sẻ" không
 * phải chờ vẽ (trình duyệt chặn khay chia sẻ mở muộn sau cú bấm).
 *
 * `data` là hàm: form đang gõ dựng số liệu tại lúc bấm, không dựng trước mỗi
 * lần gõ một ký tự.
 */
export function XuatAnhBooking({
  data,
  className,
  title,
  disabled,
  children,
  onError,
}: {
  data: () => BookingImageData;
  className: string;
  title?: string;
  disabled?: boolean;
  children: ReactNode;
  onError?: (msg: string) => void;
}) {
  const [mo, setMo] = useState(false);
  const [anh, setAnh] = useState<AnhPhieu | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [baoLuu, setBaoLuu] = useState<string | null>(null);

  useEffect(() => {
    if (!mo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMo(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mo]);

  async function moKhung() {
    setLoi(null);
    setBaoLuu(null);
    setAnh(null);
    setMo(true);
    try {
      setAnh(await taoAnhPhieu(data()));
    } catch (e) {
      const m = e instanceof Error ? e.message : "Không xuất được ảnh phiếu";
      setLoi(m);
      onError?.(m);
    }
  }

  const chiaSeDuoc = anh ? chiaSeDuocFile(anh.file) : false;

  return (
    <>
      <button type="button" className={className} title={title} disabled={disabled} onClick={() => void moKhung()}>
        {children}
      </button>
      {mo &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[130] flex flex-col bg-slate-900/90"
            onClick={() => setMo(false)}
          >
            {/* Thanh trên: tên + đóng — dính, cuộn ảnh bao xa vẫn thấy */}
            <div
              className="flex shrink-0 items-center justify-between gap-2 px-3 py-2 text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="min-w-0 text-sm font-bold">🖼 Ảnh phiếu booking</div>
              <button
                type="button"
                onClick={() => setMo(false)}
                className="shrink-0 rounded-lg bg-white/15 px-3 py-1 text-sm font-bold hover:bg-white/25"
                title="Đóng (Esc)"
              >
                ✕ Đóng
              </button>
            </div>
            {/* Ảnh full chiều ngang màn hình, cuộn dọc nếu dài — khách chụp màn hình được */}
            <div className="min-h-0 flex-1 overflow-auto px-2" onClick={(e) => e.stopPropagation()}>
              {anh ? (
                <img
                  src={anh.dataUrl}
                  alt="Phiếu booking"
                  className="mx-auto block w-full max-w-3xl rounded-lg bg-white shadow-2xl"
                />
              ) : loi ? (
                <div className="mx-auto mt-6 max-w-md rounded-lg bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-900">{loi}</div>
              ) : (
                <div className="mt-10 text-center text-sm text-white/80">Đang dựng ảnh phiếu…</div>
              )}
            </div>
            {/* Nút thao tác — dính đáy */}
            <div
              className="shrink-0 border-t border-white/15 bg-slate-900 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto flex max-w-3xl gap-2">
                <button
                  type="button"
                  disabled={!anh}
                  className="h-11 flex-1 rounded-lg bg-white text-sm font-bold text-slate-800 hover:bg-slate-100 disabled:opacity-50"
                  onClick={() => {
                    if (!anh) return;
                    luuAnhPhieu(anh);
                    setBaoLuu("Đã tải ảnh về máy. Trên iPhone nếu không thấy: nhấn giữ vào ảnh → Lưu ảnh.");
                  }}
                >
                  💾 Lưu ảnh
                </button>
                <button
                  type="button"
                  disabled={!anh}
                  title={chiaSeDuoc ? "Gửi qua Zalo, Messenger, AirDrop…" : "Máy này không mở được khay chia sẻ — bấm Lưu ảnh rồi gửi file"}
                  className="h-11 flex-1 rounded-lg bg-sky-500 text-sm font-bold text-white hover:bg-sky-400 disabled:opacity-50"
                  onClick={() => {
                    if (!anh) return;
                    // Không await gì trước navigator.share — phải nằm ngay trong cú bấm
                    void chiaSeAnhPhieu(anh).then((ok) => {
                      if (!ok) setBaoLuu(chiaSeDuoc ? "Đã đóng khay chia sẻ." : "Máy này không mở được khay chia sẻ — bấm Lưu ảnh rồi gửi file, hoặc khách chụp màn hình.");
                    });
                  }}
                >
                  📤 Chia sẻ
                </button>
              </div>
              {baoLuu && <p className="mx-auto mt-1.5 max-w-3xl text-center text-xs text-white/80">{baoLuu}</p>}
              {anh && !baoLuu && (
                <p className="mx-auto mt-1.5 max-w-3xl text-center text-xs text-white/60">
                  Khách chụp màn hình được ngay · nhấn giữ ảnh để lưu (iPhone)
                </p>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
