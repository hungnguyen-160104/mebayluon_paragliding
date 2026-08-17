// app/thanh-toan/QrClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { buildVietQrPayload, toAsciiNote, BANK_BIN } from "@/lib/vietqr";
import { formatVND } from "@/lib/pricing";

/**
 * TRANG MÃ QR GỬI KHÁCH — mở bằng liên kết, không cần đăng nhập.
 *
 * Vì sao phải có trang này: ảnh mã QR sinh ngay trên máy nhân viên nên chỉ gửi
 * được qua khay chia sẻ của điện thoại. Nhân viên ngồi máy tính thì khay đó
 * không có, mà Zalo/Messenger/Facebook chỉ nhận LIÊN KẾT chứ không nhận ảnh dán
 * từ web. Có trang này thì mọi cửa chia sẻ đều dùng được: gửi link, khách bấm
 * vào là thấy mã QR đúng số tiền, quét luôn bằng app ngân hàng.
 *
 * Trang chỉ đọc tham số trên URL rồi vẽ mã — không đụng cơ sở dữ liệu, không
 * lộ thông tin gì ngoài số tài khoản nhận tiền (thứ vốn phải đưa khách).
 */

const PAY = {
  bankBin: BANK_BIN.bidv,
  bankName: "BIDV",
  accountNumber: "8875639685",
  accountName: "Đặng Thị Thuỷ",
};

export function QrClient() {
  const params = useSearchParams();
  const amount = Math.max(0, Math.round(Number(params.get("a")) || 0));
  const note = toAsciiNote(params.get("n") || "") || "MEBAYLUON";
  const purpose = (params.get("p") || "Thanh toán dịch vụ bay dù lượn").slice(0, 120);

  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const QRCode = (await import("qrcode")).default;
      const payload = buildVietQrPayload({
        bankBin: PAY.bankBin,
        accountNumber: PAY.accountNumber,
        amount,
        note,
      });
      const dataUrl = await QRCode.toDataURL(payload, {
        width: 720,
        margin: 1,
        errorCorrectionLevel: "M",
        color: { dark: "#0f172a", light: "#FFFFFF" },
      });
      if (alive) setUrl(dataUrl);
    })().catch(() => {
      /* Không vẽ được thì khách vẫn chuyển tay theo số tài khoản bên dưới. */
    });
    return () => {
      alive = false;
    };
  }, [amount, note]);

  async function copyAccount() {
    try {
      await navigator.clipboard.writeText(PAY.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 3_000);
    } catch {
      /* Máy không cho chép thì khách đọc số bên trên. */
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center px-4 py-6">
      <h1 className="text-center text-lg font-bold text-slate-900">MEBAYLUON — Thanh toán</h1>
      <p className="mt-1 text-center text-sm text-slate-600">{purpose}</p>

      <div className="mt-4 w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex justify-center">
          {url ? (
            // Ảnh dựng ngay tại trình duyệt (data URL) nên dùng thẻ img thường
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Mã QR chuyển khoản" className="h-64 w-64" />
          ) : (
            <div className="flex h-64 w-64 items-center justify-center text-sm text-slate-400">Đang vẽ mã…</div>
          )}
        </div>

        {amount > 0 && (
          <div className="mt-3 text-center text-3xl font-extrabold tabular-nums text-slate-900">
            {formatVND(amount)}
          </div>
        )}

        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Ngân hàng</dt>
            <dd className="font-semibold text-slate-900">{PAY.bankName}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Số tài khoản</dt>
            <dd className="font-bold tabular-nums text-slate-900">{PAY.accountNumber}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Chủ tài khoản</dt>
            <dd className="font-semibold text-slate-900">{PAY.accountName}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Nội dung</dt>
            <dd className="font-bold text-amber-700">{note}</dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={copyAccount}
          className="mt-3 h-11 w-full rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 active:bg-slate-100"
        >
          {copied ? "✓ Đã chép số tài khoản" : "Chép số tài khoản"}
        </button>
      </div>

      <p className="mt-3 text-center text-xs leading-relaxed text-slate-500">
        Mở app ngân hàng → quét mã → số tiền và nội dung tự điền. Chuyển xong nhớ gửi lại ảnh biên lai cho nhân viên
        để đối chiếu.
      </p>
    </main>
  );
}
