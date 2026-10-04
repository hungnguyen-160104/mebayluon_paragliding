"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { TkctBadge } from "./PayAccount";
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
/**
 * GỬI ẢNH PHIẾU QUA ZALO / WHATSAPP (chủ 01/10).
 *
 * Web KHÔNG thể tự thả ảnh vào khung chat của một số điện thoại — Zalo lẫn
 * WhatsApp đều không mở cách đó cho trang web. Làm được gần nhất: CHÉP ảnh vào
 * bộ nhớ tạm, rồi mở thẳng khung chat với SĐT của booking (zalo.me/<sđt>,
 * wa.me/<mã nước+sđt>) — nhân viên nhấn giữ ô chat → Dán → Gửi.
 * Máy nào không chép được ảnh thì vẫn mở khung chat, kèm lời nhắc dùng
 * "Chia sẻ" / "Lưu ảnh" để đính ảnh.
 */
function sdtZalo(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (/^84\d{9}$/.test(d)) return "0" + d.slice(2);
  if (/^0\d{9}$/.test(d)) return d;
  return null;
}

function sdtWhatsApp(raw: string): string | null {
  const t = raw.trim();
  const d = t.replace(/\D/g, "");
  if (!d) return null;
  if (t.startsWith("+") || t.startsWith("00")) return d.replace(/^00/, "");
  if (/^0\d{9}$/.test(d)) return "84" + d.slice(1);
  if (/^84\d{9}$/.test(d)) return d;
  return d.length >= 8 ? d : null;
}

/** Chép ảnh PNG vào bộ nhớ tạm — gọi ngay trong cú bấm. Trả false nếu máy không cho. */
function chepAnh(blob: Blob): Promise<boolean> {
  try {
    const CI = (window as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
    if (!CI || !navigator.clipboard?.write) return Promise.resolve(false);
    return navigator.clipboard
      .write([new CI({ "image/png": blob })])
      .then(() => true)
      .catch(() => false);
  } catch {
    return Promise.resolve(false);
  }
}

export function XuatAnhBooking({
  data,
  className,
  title,
  disabled,
  children,
  onError,
}: {
  /** Có thể chờ: booking chưa chốt tài khoản nhận tiền thì hỏi máy chủ trước khi vẽ mã QR. */
  data: () => BookingImageData | Promise<BookingImageData>;
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
  /** SĐT của booking lúc mở khung — để nút Zalo / WhatsApp mở đúng khung chat. */
  const [sdt, setSdt] = useState("");
  /** Tài khoản của mã QR trên ảnh — nhãn TKCT chỉ hiện ở khung NHÂN VIÊN, không vẽ vào ảnh gửi khách. */
  const [tk, setTk] = useState<string | undefined>(undefined);

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
      const d = await data();
      setSdt(d.phone || "");
      setTk(d.payAccount);
      setAnh(await taoAnhPhieu(d));
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
              <div className="min-w-0 text-sm font-bold">
                🖼 Ảnh phiếu booking <TkctBadge b={{ payAccount: tk }} className="ml-1" />
              </div>
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
            {/* Link chỉ đường dạng chữ: ảnh PNG không bấm được, nên gửi thêm dòng
                này vào Zalo/Messenger — khách bấm là mở Google Maps. */}
            {anh?.chiDuong && (
              <div className="shrink-0 px-3 pt-2" onClick={(e) => e.stopPropagation()}>
                <div className="mx-auto max-w-3xl rounded-lg bg-white/10 px-3 py-2 text-sm text-white">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold">📍 Link chỉ đường (bấm mở bản đồ)</span>
                    <button
                      type="button"
                      className="shrink-0 rounded-md bg-white/20 px-2.5 py-1 text-xs font-bold hover:bg-white/30"
                      onClick={() => {
                        void navigator.clipboard?.writeText(anh.chiDuong).then(
                          () => setBaoLuu("Đã chép link chỉ đường — dán vào Zalo/Messenger ngay sau ảnh phiếu."),
                          () => setBaoLuu("Máy này không chép được — nhấn giữ vào link để sao chép."),
                        );
                      }}
                    >
                      📋 Chép link chỉ đường
                    </button>
                  </div>
                  <ul className="mt-1 space-y-0.5">
                    {anh.chiDuong
                      .split("\n\n")
                      .slice(1)
                      .map((dong) => {
                        const [ten, link] = dong.split("\n");
                        return (
                          <li key={link + ten}>
                            <a href={link} target="_blank" rel="noopener noreferrer" className="underline decoration-white/50 hover:decoration-white">
                              {ten}
                            </a>
                          </li>
                        );
                      })}
                  </ul>
                </div>
              </div>
            )}
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
              {sdt && (sdtZalo(sdt) || sdtWhatsApp(sdt)) && (
                <div className="mx-auto mt-2 flex max-w-3xl gap-2">
                  {sdtZalo(sdt) && (
                    <button
                      type="button"
                      disabled={!anh}
                      title={`Chép ảnh phiếu rồi mở Zalo với ${sdt} — nhấn giữ ô chat → Dán → Gửi`}
                      className="h-11 flex-1 rounded-lg bg-[#0068ff] text-sm font-bold text-white hover:brightness-110 disabled:opacity-50"
                      onClick={() => {
                        if (!anh) return;
                        // Chép ảnh và mở Zalo NGAY trong cú bấm (không await) — trình duyệt chặn mở muộn
                        void chepAnh(anh.blob).then((ok) =>
                          setBaoLuu(
                            ok
                              ? "Đã chép ảnh phiếu — trong Zalo nhấn giữ ô chat → Dán → Gửi."
                              : "Máy này không chép được ảnh — trong Zalo bấm đính kèm ảnh, hoặc dùng Chia sẻ / Lưu ảnh.",
                          ),
                        );
                        window.open(`https://zalo.me/${sdtZalo(sdt)}`, "_blank", "noopener");
                      }}
                    >
                      Zalo · {sdt}
                    </button>
                  )}
                  {sdtWhatsApp(sdt) && (
                    <button
                      type="button"
                      disabled={!anh}
                      title={`Chép ảnh phiếu rồi mở WhatsApp với ${sdt} — dán ảnh vào khung chat rồi gửi`}
                      className="h-11 flex-1 rounded-lg bg-[#25d366] text-sm font-bold text-white hover:brightness-110 disabled:opacity-50"
                      onClick={() => {
                        if (!anh) return;
                        void chepAnh(anh.blob).then((ok) =>
                          setBaoLuu(
                            ok
                              ? "Đã chép ảnh phiếu — trong WhatsApp nhấn giữ ô chat → Dán → Gửi."
                              : "Máy này không chép được ảnh — trong WhatsApp bấm đính kèm ảnh, hoặc dùng Chia sẻ / Lưu ảnh.",
                          ),
                        );
                        window.open(`https://wa.me/${sdtWhatsApp(sdt)}`, "_blank", "noopener");
                      }}
                    >
                      WhatsApp
                    </button>
                  )}
                </div>
              )}
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
