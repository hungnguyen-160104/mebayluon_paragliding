// app/baocao/components/PaymentQr.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import { BANK_BIN, buildVietQrPayload, toAsciiNote } from "@/lib/vietqr";
import { formatVND } from "@/lib/pricing";

import { Button } from "./ui";

/**
 * MÃ QR THU TIỀN cho khách quét — dùng chung cho mọi chỗ có số tiền đã chốt:
 * tiền đặt bay, tiền còn thu, tiền đăng ký thêm dịch vụ.
 *
 * Vì sao vẽ tại máy thay vì gọi ảnh của img.vietqr.io: mã QR nằm giữa việc thu
 * tiền, phụ thuộc dịch vụ ngoài nghĩa là hôm nào họ sập thì cả ba điểm bay
 * không thu được chuyển khoản. Chuỗi dựng theo chuẩn EMVCo trong lib/vietqr.ts
 * rồi vẽ bằng `qrcode` — thư viện đã có sẵn trong dự án.
 *
 * Ảnh chia sẻ vẽ kèm SỐ TIỀN và NỘI DUNG bằng chữ to: khách nhận qua Zalo
 * thường xem ảnh trước khi quét, và khi ngân hàng của họ không tự điền nội dung
 * thì vẫn còn chỗ để đọc mà gõ tay.
 */

/** Tài khoản nhận tiền của công ty. */
export const PAY_ACCOUNT = {
  bankBin: BANK_BIN.bidv,
  bankName: "BIDV",
  accountNumber: "8875639685",
  accountName: "Đặng Thị Thuỷ",
} as const;

async function qrDataUrl(payload: string, size = 720): Promise<string> {
  const QRCode = (await import("qrcode")).default;
  return QRCode.toDataURL(payload, {
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0f172a", light: "#FFFFFF" },
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Không tải được ảnh mã QR"));
    img.src = src;
  });
}

/** Vẽ tấm ảnh gửi khách: mã QR + số tiền + số tài khoản + nội dung. */
async function drawQrCard(d: { amount: number; note: string; purpose: string; qrUrl: string }): Promise<HTMLCanvasElement> {
  const img = await loadImage(d.qrUrl);
  const W = 720;
  const QR = 460;
  /** Chiều cao tính TRƯỚC rồi mới vẽ: đặt lại canvas.height sẽ xoá sạch nét đã vẽ. */
  const H = 150 + 30 + QR + 50 + 54 + 34 + 46 + (d.note ? 40 : 0) + 48;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d");
  if (!g) throw new Error("Máy không vẽ được ảnh");

  const font = (size: number, weight = "400") =>
    `${weight} ${size}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;

  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#0284c7";
  g.fillRect(0, 0, W, 96);
  g.fillStyle = "#ffffff";
  g.font = font(34, "700");
  g.textAlign = "center";
  g.fillText("MEBAYLUON — THANH TOÁN", W / 2, 60);

  let y = 150;
  g.fillStyle = "#0f172a";
  g.font = font(26, "600");
  g.fillText(d.purpose, W / 2, y);

  y += 30;
  g.drawImage(img, (W - QR) / 2, y, QR, QR);
  y += QR + 50;

  g.fillStyle = "#0f172a";
  g.font = font(48, "800");
  g.fillText(formatVND(d.amount), W / 2, y);

  y += 54;
  g.fillStyle = "#475569";
  g.font = font(24);
  g.fillText(`${PAY_ACCOUNT.bankName} — ${PAY_ACCOUNT.accountNumber}`, W / 2, y);

  y += 34;
  g.fillText(PAY_ACCOUNT.accountName, W / 2, y);

  y += 46;
  if (d.note) {
    g.fillStyle = "#b45309";
    g.font = font(26, "700");
    g.fillText(`Nội dung: ${toAsciiNote(d.note)}`, W / 2, y);
    y += 40;
  }

  g.fillStyle = "#94a3b8";
  g.font = font(20);
  g.fillText("Quét bằng app ngân hàng · giữ lại biên lai để đối chiếu", W / 2, y + 8);

  return canvas;
}

/**
 * Nút QR đứng cạnh một số tiền đã chốt. Bấm là hiện mã to giữa màn hình cho
 * khách quét tại chỗ, kèm nút CHIA SẺ để gửi Zalo/Messenger cho khách trả sau.
 */
export function PaymentQrButton({
  amount,
  note,
  purpose = "Tiền bay dù lượn",
  label = "QR",
  className,
  disabled,
}: {
  /** Số tiền đã chốt — 0 thì nút mờ đi, không mở được. */
  amount: number;
  /** Nội dung chuyển khoản: MÃ BOOKING (hoặc số điện thoại khách). */
  note: string;
  /** Dòng chữ nhỏ trên mã: tiền đặt bay · còn thu · dịch vụ thêm… */
  purpose?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className={className ?? "h-8 shrink-0 border-sky-300 bg-white px-2 text-xs font-bold text-sky-700"}
        disabled={disabled || amount <= 0}
        title={amount > 0 ? `Tạo mã QR thu ${formatVND(amount)}` : "Chốt số tiền rồi mới tạo được mã QR"}
        onClick={() => setOpen(true)}
      >
        ⬛ {label}
      </Button>
      {open && <PaymentQrModal amount={amount} note={note} purpose={purpose} onClose={() => setOpen(false)} />}
    </>
  );
}

function PaymentQrModal({
  amount,
  note,
  purpose,
  onClose,
}: {
  amount: number;
  note: string;
  purpose: string;
  onClose: () => void;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const asciiNote = toAsciiNote(note) || "MEBAYLUON";

  useEffect(() => {
    let alive = true;
    qrDataUrl(
      buildVietQrPayload({
        bankBin: PAY_ACCOUNT.bankBin,
        accountNumber: PAY_ACCOUNT.accountNumber,
        amount,
        note: asciiNote,
      }),
    )
      .then((u) => alive && setUrl(u))
      .catch(() => alive && setError("Không vẽ được mã QR — khách chuyển tay theo số tài khoản bên dưới."));
    return () => {
      alive = false;
    };
  }, [amount, asciiNote]);

  /** Gửi khách: điện thoại mở khay chia sẻ (Zalo/Messenger), máy tính tải ảnh. */
  const share = useCallback(async () => {
    setError(null);
    try {
      const canvas = await drawQrCard({ amount, note: asciiNote, purpose, qrUrl: url });
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob((b) => r(b), "image/png"));
      if (!blob) throw new Error("Không tạo được ảnh");
      const name = `thanh-toan-${asciiNote.replace(/\s+/g, "-")}-${amount}.png`;
      const file = new File([blob], name, { type: "image/png" });

      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (typeof nav.share === "function" && nav.canShare?.({ files: [file] })) {
        await nav.share({
          files: [file],
          title: "Thanh toán MEBAYLUON",
          text: `${purpose}: ${formatVND(amount)} — ${PAY_ACCOUNT.bankName} ${PAY_ACCOUNT.accountNumber} (${PAY_ACCOUNT.accountName}), nội dung ${asciiNote}`,
        });
        return;
      }

      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(objUrl), 5_000);
      setMsg("Đã tải ảnh mã QR về máy — gửi cho khách qua Zalo/Messenger.");
    } catch (err) {
      // Khách bấm huỷ khay chia sẻ cũng rơi vào đây, không coi là lỗi nặng
      if ((err as Error)?.name !== "AbortError") setError("Không chia sẻ được ảnh — thử tải về rồi gửi tay.");
    }
  }, [amount, asciiNote, purpose, url]);

  const copyInfo = useCallback(async () => {
    const text = `${PAY_ACCOUNT.bankName} ${PAY_ACCOUNT.accountNumber} — ${PAY_ACCOUNT.accountName}\nSố tiền: ${formatVND(amount)}\nNội dung: ${asciiNote}`;
    try {
      await navigator.clipboard.writeText(text);
      setMsg("Đã chép thông tin chuyển khoản — dán vào Zalo gửi khách.");
    } catch {
      setError("Máy không cho chép tự động — đọc số bên trên gửi khách.");
    }
  }, [amount, asciiNote]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-full w-full max-w-sm overflow-auto rounded-2xl bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-sm font-bold text-slate-900">Khách quét mã để trả tiền</div>
            <div className="text-[11px] text-slate-500">{purpose}</div>
          </div>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-slate-400" aria-label="Đóng">
            ×
          </button>
        </div>

        <div className="mt-2 flex justify-center rounded-xl border border-slate-200 bg-white p-2">
          {url ? (
            // Ảnh dựng tại máy (data URL) nên dùng thẳng <img>, không qua next/image
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Mã QR thanh toán" className="h-56 w-56" />
          ) : (
            <div className="flex h-56 w-56 items-center justify-center text-xs text-slate-400">Đang vẽ mã…</div>
          )}
        </div>

        <div className="mt-2 text-center">
          <div className="text-2xl font-extrabold tabular-nums text-slate-900">{formatVND(amount)}</div>
          <div className="mt-0.5 text-xs text-slate-600">
            {PAY_ACCOUNT.bankName} · <strong className="tabular-nums">{PAY_ACCOUNT.accountNumber}</strong> ·{" "}
            {PAY_ACCOUNT.accountName}
          </div>
          <div className="mt-0.5 text-xs font-bold text-amber-700">Nội dung: {asciiNote}</div>
        </div>

        {error && <p className="mt-2 text-center text-[11px] font-medium text-rose-700">{error}</p>}
        {msg && <p className="mt-2 text-center text-[11px] font-medium text-emerald-700">{msg}</p>}

        <div className="mt-3 flex gap-2">
          <Button type="button" className="h-10 flex-1" disabled={!url} onClick={share}>
            📤 Chia sẻ cho khách
          </Button>
          <Button type="button" variant="ghost" className="h-10 bg-white px-3 text-xs" onClick={copyInfo}>
            Chép số TK
          </Button>
        </div>
        <p className="mt-1.5 text-center text-[11px] leading-tight text-slate-500">
          Khách trả xong vẫn phải bấm <strong>thu tiền</strong> trong app thì sổ mới ghi — mã QR chỉ để khách chuyển.
        </p>
      </div>
    </div>
  );
}
