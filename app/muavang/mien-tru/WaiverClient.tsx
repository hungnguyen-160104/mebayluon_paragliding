"use client";

/**
 * KÝ BIÊN BẢN MIỄN TRỪ TẠI CHECK-IN — luồng bốn màn:
 *
 *   [tra cứu] mã đăng ký + SĐT ─▶ [thanh toán] nếu chưa xác nhận chuyển phí
 *        │                              │ (QR VietQR + "Tôi đã chuyển khoản")
 *        └──────────▶ [ký] hồ sơ tự điền + biên bản + ký tay ─▶ [hoàn tất]
 *
 * PDF dựng ngay trên máy phi công bằng html2canvas + jspdf (đúng cách tấm vé
 * bay đang dùng) rồi gửi lên máy chủ để email về phi công + BTC. Vì thế toàn
 * bộ VÙNG BIÊN BẢN (docRef) phải là inline-style thuần — html2canvas không
 * đọc được màu oklch của Tailwind, class nào lọt vào đó là mất màu trên PDF.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PAYMENT_ACCOUNT, formatVnd } from "@/lib/pilot-event";
import { buildVietQrPayload } from "@/lib/vietqr";
import {
  WAIVER_AFFIRMATION,
  WAIVER_SECTIONS,
  WAIVER_SUBTITLE,
  WAIVER_TITLE,
  WAIVER_VERSION,
} from "@/lib/pilot-waiver";

type Registration = {
  code: string;
  fullName: string;
  idNumber: string;
  nationality: string;
  phone: string;
  emergencyPhone: string;
  emergencyName: string;
  supportPilotName: string;
  supportPilotPhone: string;
  email: string;
  club: string;
  flyingKindLabel: string;
  motorTypeLabel: string;
  period: string;
  periodName: string;
  dates: string[];
  shirtSize: string;
  openingFlagFlight: boolean;
  feeTotal: number;
  /** Số tiền BTC đã thực nhận (kế toán ghi) — null = chưa đối chiếu. */
  paidAmount: number | null;
  transferNote: string;
  paymentDeclaredAt: string | null;
  waiverSignedAt: string | null;
  waiverEmail: string;
};

type Step = "lookup" | "pay" | "ppg" | "sign" | "done";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[15px] text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100";
const btnPrimary =
  "inline-flex w-full items-center justify-center rounded-xl bg-sky-600 px-5 py-3.5 text-[15px] font-bold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50";
const btnGhost =
  "inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50";

/** Đầu mối BTC xác nhận thanh toán — mọi màn nhắc phí đều chỉ về đây. */
const BTC_CONTACT = { name: "anh Mỹ", phone: "0964073555", display: "0964 073 555" };

/** Bảng màu của vùng biên bản (inline-style cho html2canvas). */
const D = {
  text: "#1C2930",
  sub: "#5B6B7A",
  line: "#DCE7F3",
  soft: "#F5F7FA",
  accent: "#0B83D9",
  danger: "#B91C1C",
};

export default function WaiverClient() {
  const [step, setStep] = useState<Step>("lookup");
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [reg, setReg] = useState<Registration | null>(null);
  const [email, setEmail] = useState("");
  /** Người liên hệ khẩn cấp — bắt buộc điền trước khi ký (hồ sơ cũ thường trống). */
  const [emgPhone, setEmgPhone] = useState("");
  const [emgName, setEmgName] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // ---- chữ ký vẽ tay ----
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  const docRef = useRef<HTMLDivElement | null>(null);

  // ---- QR thanh toán ----
  const [qrDataUrl, setQrDataUrl] = useState("");

  /* ---------------- tra cứu ---------------- */
  const lookup = async () => {
    setError("");
    if (!code.trim() || !phone.trim()) {
      setError("Vui lòng nhập cả mã đăng ký và số điện thoại đã đăng ký");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/pilot-registration/waiver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lookup", code: code.trim(), phone: phone.trim() }),
      });
      const json = await res.json();
      if (!json?.ok) {
        setError(json?.message || "Không tra cứu được, vui lòng thử lại");
        return;
      }
      const r: Registration = json.registration;
      setReg(r);
      setEmail(r.waiverEmail || r.email || "");
      setEmgPhone(r.emergencyPhone || "");
      setEmgName(r.emergencyName || "");
      // CHỈ khoản kế toán ĐÃ THỰC NHẬN ĐỦ (paidAmount >= phí) mới đi thẳng vào
      // ký — theo lệnh chủ: mọi phi công chưa thu phí đều phải thấy nhắc nhở,
      // kể cả người tự khai "đã chuyển khoản" hay bản ghi phí đang là 0đ.
      const settled = r.paidAmount !== null && r.paidAmount >= r.feeTotal;
      // PPG kéo cờ khai mạc được miễn phí (có điều kiện) — báo riêng, cho bỏ qua
      setStep(settled ? "sign" : r.openingFlagFlight ? "ppg" : "pay");
    } catch {
      setError("Mạng chập chờn, vui lòng thử lại");
    } finally {
      setBusy(false);
    }
  };

  /** Số còn phải thu = tổng phí trừ phần kế toán đã ghi nhận. */
  const dueAmount = reg ? Math.max(0, reg.feeTotal - (reg.paidAmount ?? 0)) : 0;

  /* ---------------- màn thanh toán: vẽ QR (đúng số CÒN THIẾU) ---------------- */
  useEffect(() => {
    if (step !== "pay" || !reg || dueAmount <= 0) return;
    let alive = true;
    (async () => {
      const payload = buildVietQrPayload({
        bankBin: PAYMENT_ACCOUNT.bankBin,
        accountNumber: PAYMENT_ACCOUNT.accountNumber,
        amount: dueAmount,
        note: reg.transferNote,
      });
      const QRCode = (await import("qrcode")).default;
      const url = await QRCode.toDataURL(payload, {
        width: 640,
        margin: 1,
        errorCorrectionLevel: "M",
        color: { dark: "#0B0A08", light: "#FFFFFF" },
      });
      if (alive) setQrDataUrl(url);
    })().catch(() => {
      /* Không vẽ được QR thì phi công chuyển tay theo số tài khoản bên dưới. */
    });
    return () => {
      alive = false;
    };
  }, [step, reg, dueAmount]);

  const declarePaid = async () => {
    if (!reg) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/pilot-registration/paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: reg.code }),
      });
      const json = await res.json();
      if (!json?.ok) {
        setError(json?.message || "Không ghi nhận được, vui lòng thử lại");
        return;
      }
      setReg({ ...reg, paymentDeclaredAt: new Date().toISOString() });
      setStep("sign");
    } catch {
      setError("Mạng chập chờn, vui lòng thử lại");
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- canvas ký ---------------- */
  const setupCanvas = useCallback((el: HTMLCanvasElement | null) => {
    canvasRef.current = el;
    if (!el) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = el.getBoundingClientRect();
    el.width = Math.round(rect.width * dpr);
    el.height = Math.round(rect.height * dpr);
    const ctx = el.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#12315e";
    // nền trắng đặc để PDF không ra ô trong suốt đen sì
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, []);

  const pointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const { x, y } = pointerPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const { x, y } = pointerPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasInk) setHasInk(true);
  };
  const onPointerUp = () => {
    drawing.current = false;
  };

  const clearSignature = () => {
    const el = canvasRef.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, el.width, el.height);
    ctx.restore();
    setHasInk(false);
  };

  /* ---------------- ký & gửi ---------------- */
  const submitSign = async () => {
    if (!reg) return;
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Vui lòng nhập email hợp lệ để nhận biên bản đã ký");
      return;
    }
    if (emgPhone.replace(/\D/g, "").length < 8) {
      setError("Vui lòng nhập số điện thoại khẩn cấp");
      return;
    }
    if (emgName.trim().length < 2) {
      setError("Vui lòng nhập tên người liên hệ khẩn cấp");
      return;
    }
    if (!hasInk) {
      setError("Vui lòng ký tên vào ô chữ ký");
      return;
    }
    if (!agree) {
      setError("Vui lòng tích xác nhận đã đọc và đồng ý với biên bản");
      return;
    }
    if (!docRef.current || !canvasRef.current) return;

    setBusy(true);
    try {
      const signature = canvasRef.current.toDataURL("image/png");

      // Chụp vùng biên bản thành ảnh — cùng công thức với tấm vé bay
      const { default: html2canvas } = await import("html2canvas");
      const liveCanvas = canvasRef.current;
      const canvas = await html2canvas(docRef.current, {
        scale: 1.5,
        backgroundColor: "#ffffff",
        useCORS: true,
        onclone: (doc) => {
          doc.querySelectorAll('style, link[rel="stylesheet"]').forEach((el) => el.remove());
          // html2canvas nhân bản tài liệu nên canvas chữ ký trong bản sao TRẮNG
          // TRƠN — phải tự chép nét ký từ canvas thật sang trước khi chụp.
          const cloned = doc.getElementById("waiver-signature-pad") as HTMLCanvasElement | null;
          if (cloned && liveCanvas) {
            cloned.width = liveCanvas.width;
            cloned.height = liveCanvas.height;
            cloned.getContext("2d")?.drawImage(liveCanvas, 0, 0);
          }
        },
      });

      const { default: jsPDF } = await import("jspdf");
      const width = 210;
      const height = (width * canvas.height) / canvas.width;
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [width, height] });
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.82), "JPEG", 0, 0, width, height);
      const pdfDataUrl = pdf.output("datauristring");

      const res = await fetch("/api/pilot-registration/waiver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sign",
          code: reg.code,
          phone: phone.trim(),
          email: email.trim(),
          emergencyPhone: emgPhone.trim(),
          emergencyName: emgName.trim(),
          signature,
          pdf: pdfDataUrl,
        }),
      });
      const json = await res.json();
      if (!json?.ok) {
        setError(json?.message || "Không gửi được, vui lòng thử lại");
        return;
      }
      setReg(json.registration);
      setStep("done");
    } catch (err) {
      console.error(err);
      setError("Không tạo được bản PDF, vui lòng thử lại");
    } finally {
      setBusy(false);
    }
  };

  // Đánh số kiểu văn bản pháp lý: mỗi mục là một ĐIỀU (Điều 1, Điều 2...),
  // bên trong là các KHOẢN "1.1, 1.2..." — nhắc "khoản 3.2" là lần ra ngay.
  const numberedSections = useMemo(
    () =>
      WAIVER_SECTIONS.map((sec, i) => ({
        title: `Điều ${i + 1}. ${sec.title}`,
        items: sec.items.map((text, j) => ({ n: `${i + 1}.${j + 1}`, text })),
      })),
    [],
  );

  const nowVN = new Date().toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour12: false,
  });

  /**
   * ĐANG MỞ TRONG TRÌNH DUYỆT CỦA ZALO?
   *
   * Link biên bản được gửi cho phi công qua Zalo là chính, mà WebView trong
   * Zalo hay vỡ ở trang này: nó cắt bớt tính năng (canvas ký tay, tải PDF,
   * lưu cookie) và vướng cả lớp chặn của Vercel — phi công báo "cứ bị lỗi"
   * đúng kiểu ấy. Máy không tự nhảy ra Safari/Chrome hộ được (Zalo không cho),
   * nên việc làm được là NÓI TO ngay đầu trang kèm nút chép link, hướng dẫn
   * đúng nút ba chấm của Zalo.
   *
   * Đọc userAgent trong useEffect chứ không lúc render — trang này dựng sẵn
   * trên máy chủ, đọc lúc render là hai bên vẽ khác nhau (lỗi hydration).
   */
  const [inZalo, setInZalo] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (/zalo/i.test(navigator.userAgent)) setInZalo(true);
  }, []);

  /* =============================================================== */
  // pt-24: thanh menu của site là `fixed` cao h-20 — thiếu lề trên là nó đè lên tiêu đề
  return (
    <main className="min-h-screen bg-slate-100 px-3 pb-12 pt-24 sm:pb-16">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-6 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-600">
            Mebayluon Paragliding
          </p>
          <h1 className="mt-1 text-2xl font-black text-slate-800 sm:text-3xl">
            Ký biên bản miễn trừ trách nhiệm
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Mỗi phi công ký một lần khi check-in — nhập mã đăng ký và số điện thoại để bắt đầu.
          </p>
        </header>

        {inZalo && (
          <div className="mb-4 rounded-2xl border-2 border-amber-400 bg-amber-50 px-4 py-3">
            <p className="text-sm font-bold text-amber-900">
              ⚠ Bạn đang mở trong Zalo — trang ký hay bị lỗi ở đây.
            </p>
            <p className="mt-1 text-sm leading-relaxed text-amber-900">
              Hãy mở bằng trình duyệt ngoài: bấm nút <strong>⋮</strong> (góc trên bên phải màn hình
              Zalo) → chọn <strong>“Mở bằng trình duyệt”</strong>. Hoặc chép link rồi dán vào
              Safari/Chrome:
            </p>
            <button
              type="button"
              className="mt-2 w-full rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white active:bg-amber-600"
              onClick={() => {
                navigator.clipboard
                  ?.writeText("https://www.mebayluon.com/muavang/mien-tru")
                  .then(() => setCopied(true))
                  .catch(() => setCopied(false));
              }}
            >
              {copied ? "✓ Đã chép link — dán vào Safari/Chrome" : "📋 Chép link trang này"}
            </button>
          </div>
        )}

        {error ? (
          <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        {/* ============ MÀN 1: TRA CỨU ============ */}
        {step === "lookup" ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <label className="mb-1 block text-sm font-bold text-slate-700">Mã đăng ký</label>
            <input
              className={inputClass}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ví dụ: MV2908-1234"
              autoCapitalize="characters"
            />
            <label className="mb-1 mt-4 block text-sm font-bold text-slate-700">
              Số điện thoại đã đăng ký
            </label>
            <input
              className={inputClass}
              value={phone}
              inputMode="tel"
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Đúng số đã khai khi đăng ký bay"
            />
            <button className={`${btnPrimary} mt-5`} onClick={lookup} disabled={busy}>
              {busy ? "Đang tra cứu…" : "Tra cứu đăng ký"}
            </button>
          </div>
        ) : null}

        {/* ============ MÀN 2: CHẶN THANH TOÁN ============ */}
        {step === "pay" && reg ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            {reg.feeTotal <= 0 ? (
              <div className="rounded-xl border-2 border-red-400 bg-red-50 px-4 py-3 text-sm font-bold leading-relaxed text-red-700">
                BTC chưa ghi nhận phí đăng ký sự kiện của bạn. Vui lòng liên hệ BTC —{" "}
                {BTC_CONTACT.name}{" "}
                <a className="underline" href={`tel:${BTC_CONTACT.phone}`}>
                  {BTC_CONTACT.display}
                </a>{" "}
                — để xác nhận trước khi tiếp tục ký biên bản.
              </div>
            ) : reg.paidAmount !== null && reg.paidAmount > 0 ? (
              <div className="rounded-xl border-2 border-red-400 bg-red-50 px-4 py-3 text-sm font-bold leading-relaxed text-red-700">
                Phí đăng ký của bạn là {formatVnd(reg.feeTotal)}, bạn mới thanh toán{" "}
                {formatVnd(reg.paidAmount)} — còn thiếu {formatVnd(dueAmount)}. Vui lòng thanh
                toán nốt để tiếp tục ký biên bản.
              </div>
            ) : (
              <div className="rounded-xl border-2 border-red-400 bg-red-50 px-4 py-3 text-sm font-bold leading-relaxed text-red-700">
                Bạn chưa thanh toán phí đăng ký sự kiện — số tiền là{" "}
                {formatVnd(reg.feeTotal)}. Vui lòng thanh toán và xác nhận thanh toán trước khi
                tiếp tục ký biên bản.
              </div>
            )}

            {dueAmount > 0 ? (
            <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <div className="w-56 shrink-0 rounded-xl border border-slate-200 bg-white p-2">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrDataUrl} alt="QR chuyển khoản" className="h-auto w-full" />
                ) : (
                  <div className="flex h-52 items-center justify-center text-xs text-slate-400">
                    Đang tạo mã QR…
                  </div>
                )}
              </div>
              <div className="w-full text-sm text-slate-700">
                <p className="text-lg font-black text-slate-800">{formatVnd(dueAmount)}</p>
                {reg.paidAmount !== null && reg.paidAmount > 0 ? (
                  <p className="text-xs text-slate-500">
                    (tổng phí {formatVnd(reg.feeTotal)} − đã nhận {formatVnd(reg.paidAmount)})
                  </p>
                ) : null}
                <p className="mt-2">
                  <span className="text-slate-500">Ngân hàng:</span>{" "}
                  <b>{PAYMENT_ACCOUNT.bankName}</b>
                </p>
                <p>
                  <span className="text-slate-500">Số tài khoản:</span>{" "}
                  <b>{PAYMENT_ACCOUNT.accountDisplay}</b>
                </p>
                <p>
                  <span className="text-slate-500">Chủ tài khoản:</span>{" "}
                  <b>{PAYMENT_ACCOUNT.accountName}</b>
                </p>
                <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[13px]">
                  <span className="text-slate-500">Nội dung CK:</span>{" "}
                  <b className="break-words">{reg.transferNote}</b>
                </p>
              </div>
            </div>

            ) : null}

            <p className="mt-4 text-sm font-semibold text-slate-600">
              Đã thanh toán hoặc cần xác nhận? Liên hệ BTC — {BTC_CONTACT.name}:{" "}
              <a className="font-bold text-sky-700 underline" href={`tel:${BTC_CONTACT.phone}`}>
                {BTC_CONTACT.display}
              </a>
            </p>

            <button className={`${btnPrimary} mt-4`} onClick={declarePaid} disabled={busy}>
              {busy
                ? "Đang ghi nhận…"
                : dueAmount > 0
                  ? "✓ Tôi đã chuyển khoản — tiếp tục ký biên bản"
                  : "✓ Tôi đã xác nhận với BTC — tiếp tục ký biên bản"}
            </button>
            <button className={`${btnGhost} mt-3 w-full`} onClick={() => setStep("lookup")}>
              ← Quay lại
            </button>
          </div>
        ) : null}

        {/* ============ MÀN 2b: PPG KÉO CỜ KHAI MẠC — MIỄN PHÍ CÓ ĐIỀU KIỆN ============ */}
        {step === "ppg" && reg ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="rounded-xl border-2 border-sky-400 bg-sky-50 px-4 py-3 text-sm font-bold leading-relaxed text-sky-800">
              Bạn có đăng ký bay PPG biểu diễn trong lễ khai mạc — vui lòng xác nhận với BTC để
              được xác nhận MIỄN PHÍ tham dự sự kiện.
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700">
              <p className="font-bold text-slate-800">
                Ghi chú — phi công được miễn phí sự kiện với điều kiện:
              </p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5">
                <li>
                  Tự túc máy PPG và có mặt đúng giờ để tham gia bay kéo cờ khai mạc sự kiện lúc{" "}
                  <b>7h00 sáng ngày 30/8</b>;
                </li>
                <li>
                  Phi công phải có kinh nghiệm bay PPG và từng bay biểu diễn trong các sự kiện
                  trước đây;
                </li>
                <li>Phi công tự nguyện tham gia bay kéo cờ sáng 30/8.</li>
              </ol>
              <p className="mt-3">
                Phi công bay <b>PPG FUN</b> (không tham gia bay kéo cờ biểu diễn) vui lòng đóng
                góp phí sự kiện để BTC sắp xếp ăn ở theo đoàn. Xin trân trọng cảm ơn!
              </p>
            </div>

            <p className="mt-4 text-sm font-semibold text-slate-600">
              Xác nhận với BTC — {BTC_CONTACT.name}:{" "}
              <a className="font-bold text-sky-700 underline" href={`tel:${BTC_CONTACT.phone}`}>
                {BTC_CONTACT.display}
              </a>
              . Nếu đã xác nhận, vui lòng bỏ qua thông báo này.
            </p>

            <button className={`${btnPrimary} mt-4`} onClick={() => setStep("sign")}>
              Bỏ qua — tiếp tục ký biên bản
            </button>
            <button className={`${btnGhost} mt-3 w-full`} onClick={() => setStep("pay")}>
              Đóng góp phí sự kiện (chuyển khoản QR) — {formatVnd(dueAmount)}
            </button>
            <button className={`${btnGhost} mt-3 w-full`} onClick={() => setStep("lookup")}>
              ← Quay lại
            </button>
          </div>
        ) : null}

        {/* ============ MÀN 3: BIÊN BẢN + KÝ ============ */}
        {step === "sign" && reg ? (
          <div className="space-y-5">
            {reg.waiverSignedAt ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                Bạn đã ký biên bản lúc{" "}
                {new Date(reg.waiverSignedAt).toLocaleString("vi-VN", {
                  timeZone: "Asia/Ho_Chi_Minh",
                })}
                . Ký lại sẽ thay bản cũ và email sẽ được gửi lại.
              </div>
            ) : null}

            {/* ---- VÙNG CHỤP PDF: inline-style thuần, KHÔNG Tailwind ---- */}
            <div
              ref={docRef}
              style={{
                background: "#ffffff",
                border: `1px solid ${D.line}`,
                borderRadius: 14,
                padding: "26px 24px",
                color: D.text,
                fontFamily: "Arial, Helvetica, sans-serif",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: D.accent }}>
                  MEBAYLUON PARAGLIDING
                </div>
                <div style={{ fontSize: 19, fontWeight: 900, marginTop: 4 }}>{WAIVER_TITLE}</div>
                <div style={{ fontSize: 12.5, color: D.sub, marginTop: 3 }}>{WAIVER_SUBTITLE}</div>
                <div style={{ fontSize: 11, color: D.sub, marginTop: 2 }}>
                  Bản điều khoản: {WAIVER_VERSION}
                </div>
              </div>

              {/* thông tin phi công tự điền từ đăng ký */}
              <div
                style={{
                  marginTop: 18,
                  background: D.soft,
                  borderRadius: 10,
                  padding: "12px 14px",
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: 6 }}>
                  THÔNG TIN PHI CÔNG (theo đăng ký {reg.code})
                </div>
                {(
                  [
                    ["Họ và tên", reg.fullName],
                    ["CCCD/Passport", reg.idNumber],
                    ["Quốc tịch", reg.nationality],
                    ["Số điện thoại", reg.phone],
                    ["Liên hệ khẩn cấp", [emgName.trim(), emgPhone.trim()].filter(Boolean).join(" — ") || "—"],
                    ["CLB / Hội", reg.club || "—"],
                    ["Loại hình bay", reg.flyingKindLabel + (reg.motorTypeLabel ? ` (${reg.motorTypeLabel})` : "")],
                    ["Đợt bay", reg.periodName],
                    ["Ngày bay", reg.dates.join(", ") || "—"],
                    [
                      "Phi công/HLV hỗ trợ",
                      reg.supportPilotName
                        ? reg.supportPilotName +
                          (reg.supportPilotPhone ? ` — ${reg.supportPilotPhone}` : "")
                        : "—",
                    ],
                    ["Tổng phí sự kiện", formatVnd(reg.feeTotal)],
                  ] as Array<[string, string]>
                ).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", padding: "2.5px 0" }}>
                    <div style={{ width: 160, flexShrink: 0, color: D.sub }}>{k}</div>
                    <div style={{ fontWeight: 700 }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* điều khoản */}
              {numberedSections.map((sec) => (
                <div key={sec.title} style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: D.accent }}>
                    {sec.title}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    {sec.items.map((it) => (
                      <div
                        key={it.n}
                        style={{ display: "flex", marginTop: 4, fontSize: 12.5, lineHeight: 1.65 }}
                      >
                        <div
                          style={{
                            width: 34,
                            flexShrink: 0,
                            fontWeight: 800,
                            color: D.accent,
                          }}
                        >
                          {it.n}
                        </div>
                        <div style={{ color: D.text }}>{it.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div
                style={{
                  marginTop: 18,
                  fontSize: 13,
                  fontWeight: 800,
                  color: D.danger,
                  lineHeight: 1.6,
                }}
              >
                {WAIVER_AFFIRMATION}
              </div>

              {/* ô ký */}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: D.sub, marginBottom: 6 }}>
                  Chữ ký của phi công (ký bằng tay trên màn hình):
                </div>
                <canvas
                  id="waiver-signature-pad"
                  ref={setupCanvas}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerLeave={onPointerUp}
                  style={{
                    width: "100%",
                    height: 170,
                    border: `2px dashed ${hasInk ? D.accent : "#B6C6D8"}`,
                    borderRadius: 10,
                    background: "#ffffff",
                    touchAction: "none",
                    display: "block",
                  }}
                />
                <div style={{ marginTop: 10, fontSize: 12.5 }}>
                  <span style={{ color: D.sub }}>Người ký:</span>{" "}
                  <b>{reg.fullName}</b>
                  {" · "}
                  <span style={{ color: D.sub }}>Thời điểm:</span> <b>{nowVN}</b>
                </div>
              </div>
            </div>
            {/* ---- HẾT VÙNG CHỤP PDF ---- */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-slate-500">
                  Ký nhầm? Xoá và ký lại trước khi xác nhận.
                </p>
                <button className={btnGhost} onClick={clearSignature}>
                  ✕ Xoá chữ ký
                </button>
              </div>

              {/* Liên hệ khẩn cấp: biên bản có điều khoản gọi số này khi có sự cố,
                  nên phải điền đủ TÊN và SỐ trước khi đặt bút ký */}
              <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50/70 p-3">
                <p className="text-sm font-bold text-amber-900">
                  Người liên hệ khẩn cấp <span className="text-red-500">*</span>
                </p>
                <p className="mt-0.5 text-xs text-amber-800/80">
                  BTC gọi số này nếu có sự cố xảy ra với bạn trong sự kiện.
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <input
                    className={inputClass}
                    value={emgName}
                    onChange={(e) => setEmgName(e.target.value)}
                    placeholder="Tên người liên hệ (vợ/chồng, người thân…)"
                  />
                  <input
                    className={inputClass}
                    value={emgPhone}
                    inputMode="tel"
                    onChange={(e) => setEmgPhone(e.target.value)}
                    placeholder="Số điện thoại khẩn cấp"
                  />
                </div>
              </div>

              <label className="mb-1 mt-4 block text-sm font-bold text-slate-700">
                Email nhận biên bản đã ký <span className="text-red-500">*</span>
              </label>
              <input
                className={inputClass}
                value={email}
                type="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Bản PDF đã ký sẽ gửi về đây"
              />

              <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4.5 w-4.5 accent-sky-600"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                />
                <span>
                  Tôi đã đọc toàn bộ biên bản, hiểu rõ và đồng ý với tất cả các điều khoản trên.
                </span>
              </label>

              <button className={`${btnPrimary} mt-5`} onClick={submitSign} disabled={busy}>
                {busy ? "Đang tạo PDF và gửi…" : "Xác nhận ký & gửi biên bản"}
              </button>
              <button
                className={`${btnGhost} mt-3 w-full`}
                onClick={() => setStep("lookup")}
                disabled={busy}
              >
                ← Quay lại
              </button>
            </div>
          </div>
        ) : null}

        {/* ============ MÀN 4: HOÀN TẤT ============ */}
        {step === "done" && reg ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
            <div className="text-5xl">✅</div>
            <h2 className="mt-3 text-xl font-black text-slate-800">Bạn đã hoàn tất!</h2>
            {reg.period === "mua_vang" ? (
              <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
                Vui lòng <b>nhận áo sự kiện</b> khi đến check-in tại{" "}
                <b>Mebayluon Clubhouse</b> và <b>nhận chỗ ở</b>.
              </p>
            ) : (
              <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
                Hẹn gặp bạn tại điểm bay. Chúc bạn bay an toàn và thật đẹp!
              </p>
            )}
            {reg.period === "mua_vang" && !reg.shirtSize ? (
              <div className="mx-auto mt-4 max-w-md rounded-xl border border-orange-300 bg-orange-50 px-4 py-3 text-sm font-semibold leading-relaxed text-orange-800">
                Bạn chưa đăng ký áo sự kiện — nếu muốn nhận áo, vui lòng liên hệ BTC. Chi phí
                phát sinh: 400.000đ/áo.
              </div>
            ) : null}
            <p className="mt-4 text-sm text-slate-500">
              Biên bản đã ký (PDF) được gửi về <b>{email}</b> và lưu tại BTC.
            </p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
