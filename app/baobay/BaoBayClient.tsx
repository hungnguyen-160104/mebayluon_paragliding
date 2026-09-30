"use client";

/**
 * Trang BÁO BAY cho phi công bay đơn (/baobay).
 *
 * Giao diện chép và rút gọn từ app/muavang/PilotEventClient.tsx (cùng nền tối,
 * phiếu viền vàng, thẻ chọn lớn) — CHÉP chứ không tách dùng chung, để sửa trang
 * này không bao giờ làm lệch /muavang đang chạy.
 *
 * Bảng phí trên trang lấy từ máy chủ (/api/bao-bay/quote) chứ không tự tính:
 * mốc 8h00 của hội viên HNAA theo giờ MÁY CHỦ, và vé tháng/năm còn hạn chỉ máy
 * chủ tra được. Lúc gửi máy chủ tính lại lần nữa, màn hình kết quả hiện số đó.
 */

import { motion } from "framer-motion";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useLanguage } from "@/contexts/language-context";
import {
  BAO_BAY_FEE_PER_DAY,
  BAO_BAY_FEE_PER_MONTH,
  BAO_BAY_FEE_PER_YEAR,
  BAO_BAY_SPOTS,
  BAO_BAY_SPOT_CONFIG,
  vnParts,
  type BaoBayFee,
  type BaoBaySpot,
  type PurchaseMode,
} from "@/lib/bao-bay";
import { baoBayDict, type BaoBayErrKey } from "@/lib/i18n/bao-bay";
import {
  PAYMENT_ACCOUNT,
  WING_CLASSES,
  formatVnDate,
  formatVnd,
  wingClassLabel,
  type WingClass,
} from "@/lib/pilot-event";
import { buildVietQrPayload } from "@/lib/vietqr";

/* ------------------------------------------------------------------ *
 * Lịch chọn ngày bay (giống /muavang)
 * ------------------------------------------------------------------ */

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Lưới ngày của một tháng, bắt đầu từ Thứ 2, có ô trống đầu tháng để căn cột. */
function monthGrid(year: number, month: number): Array<string | null> {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const dayCount = new Date(year, month + 1, 0).getDate();
  const cells: Array<string | null> = Array(offset).fill(null);
  for (let d = 1; d <= dayCount; d++) cells.push(toISO(year, month, d));
  return cells;
}

/* ------------------------------------------------------------------ *
 * Mảnh giao diện (chép từ /muavang)
 * ------------------------------------------------------------------ */

function SectionTitle({ step, title, hint }: { step: number; title: string; hint?: string }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-extrabold text-black">
        {step}
      </span>
      <div className="min-w-0">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        {hint ? <p className="mt-0.5 text-sm text-white/60">{hint}</p> : null}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-white/80">
        {label}
        {required ? <span className="ml-1 text-amber-400">*</span> : null}
        {hint ? <span className="ml-1.5 font-normal text-white/50">({hint})</span> : null}
      </span>
      {children}
      {error ? <span className="mt-1.5 block text-sm text-red-400">{error}</span> : null}
    </label>
  );
}

const inputClass =
  "h-12 w-full rounded-xl border border-white/25 bg-white/[0.13] px-3.5 text-[15px] text-white placeholder-white/45 outline-none transition focus:border-amber-400/80 focus:bg-white/[0.18]";

function ChoiceCard({
  active,
  title,
  desc,
  highlight,
  icon,
  onClick,
}: {
  active: boolean;
  title: string;
  desc?: string;
  highlight?: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative w-full rounded-2xl border p-4 text-left transition-all",
        active
          ? "border-amber-400 bg-amber-400/20 shadow-[0_0_0_1px_rgba(251,191,36,.5)]"
          : "border-white/20 bg-white/[0.10] hover:border-white/35 hover:bg-white/[0.15]",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className={`block text-[15px] font-bold ${active ? "text-amber-300" : "text-white"}`}>{title}</span>
          {desc ? <span className="mt-1 block text-sm leading-relaxed text-white/60">{desc}</span> : null}
          {highlight ? (
            <span className="mt-2 inline-block rounded-lg bg-emerald-400/15 px-2.5 py-1.5 text-[13px] font-bold leading-snug text-emerald-300 ring-1 ring-emerald-400/40">
              🎁 {highlight}
            </span>
          ) : null}
        </span>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Trang chính
 * ------------------------------------------------------------------ */

type MemberView = {
  code: string;
  fullName: string;
  idMasked: string;
  phoneMasked: string;
  needId: boolean;
  needPhone: boolean;
  needEmergencyPhone: boolean;
};

type MemberState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "ok"; member: MemberView }
  | { status: "wrong" }
  | { status: "rate" };

const ERROR_ORDER = ["spot", "dates", "fullName", "idNumber", "phone", "emergencyPhone"] as const;
type ErrorKey = (typeof ERROR_ORDER)[number];
type Errors = Partial<Record<ErrorKey, string>>;

/** Mã lỗi máy chủ → ô trên phiếu để cuộn tới đúng chỗ. */
const SERVER_ERR_FIELD: Partial<Record<BaoBayErrKey, ErrorKey>> = {
  spot: "spot",
  dates: "dates",
  datesPast: "dates",
  name: "fullName",
  id: "idNumber",
  phone: "phone",
  emergencyPhone: "emergencyPhone",
};

const SUPPORT_PHONE = "0964 073 555";
const SUPPORT_TEL = "tel:+84964073555";

export default function BaoBayClient() {
  const { language } = useLanguage();
  const T = baoBayDict(language);

  const formRef = useRef<HTMLDivElement>(null);
  const fieldRefs = useRef<Partial<Record<ErrorKey, HTMLElement | null>>>({});

  const focusFirstError = useCallback((found: Errors) => {
    const key = ERROR_ORDER.find((k) => found[k]);
    const el = key ? fieldRefs.current[key] : null;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const input = el.querySelector("input, textarea, select");
    if (input instanceof HTMLElement) window.setTimeout(() => input.focus({ preventScroll: true }), 400);
  }, []);

  /**
   * "Hôm nay" theo giờ Việt Nam — chỉ để khoá các ngày đã qua trên lịch.
   * Phi công ở nước ngoài mà lấy giờ máy thì lịch lệch một ngày; còn quyết định
   * thật (ngày quá khứ, mốc 8h00) máy chủ tự kiểm lại.
   */
  const todayISO = useMemo(() => vnParts(new Date()).date, []);

  const [spot, setSpot] = useState<BaoBaySpot | "">("");
  const [dates, setDates] = useState<string[]>([]);
  const [viewMonth, setViewMonth] = useState(() => {
    const [y, m] = todayISO.split("-").map(Number);
    return { year: y, month: m - 1 };
  });
  const [purchase, setPurchase] = useState<PurchaseMode>("day");

  const [memberCode, setMemberCode] = useState("");
  const [memberState, setMemberState] = useState<MemberState>({ status: "idle" });

  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [nationality, setNationality] = useState("Việt Nam");
  const [nationalityTouched, setNationalityTouched] = useState(false);
  const [phone, setPhone] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [wingClass, setWingClass] = useState<WingClass | "">("");
  const [licence, setLicence] = useState("");
  const [note, setNote] = useState("");

  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [quote, setQuote] = useState<{ loading: boolean; fee: BaoBayFee | null; error: string }>({
    loading: false,
    fee: null,
    error: "",
  });

  const [result, setResult] = useState<{
    code: string;
    spot: BaoBaySpot;
    dates: string[];
    fee: BaoBayFee;
    transferNote: string;
  } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");

  const cfg = spot ? BAO_BAY_SPOT_CONFIG[spot] : null;
  const hnaaSpot = Boolean(cfg?.hnaa);
  /** Hội viên đã xác nhận VÀ đang ở điểm bay có thoả thuận HNAA. */
  const verifiedMember = hnaaSpot && memberState.status === "ok" ? memberState.member : null;

  // Điểm bay không bán vé năm thì hạ lựa chọn về theo ngày
  useEffect(() => {
    if (cfg && !cfg.purchaseModes.includes(purchase)) setPurchase("day");
  }, [cfg, purchase]);

  const selectSpot = (s: BaoBaySpot) => {
    setSpot(s);
    setErrors((e) => ({ ...e, spot: undefined }));
  };

  const toggleDate = (iso: string) => {
    setDates((prev) => (prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso].sort()));
    setErrors((e) => ({ ...e, dates: undefined }));
  };

  /* ---------------- tra mã hội viên ---------------- */

  const checkMember = async () => {
    const code = memberCode.trim();
    if (!code) return;
    setMemberState({ status: "checking" });
    try {
      const res = await fetch("/api/bao-bay/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok && data.member) {
        setMemberState({ status: "ok", member: data.member as MemberView });
        setErrors((e) => ({ ...e, fullName: undefined, idNumber: undefined, phone: undefined, emergencyPhone: undefined }));
      } else if (res.status === 429) {
        setMemberState({ status: "rate" });
      } else {
        setMemberState({ status: "wrong" });
      }
    } catch {
      setMemberState({ status: "idle" });
      setServerError(T.err.network);
    }
  };

  const resetMember = () => {
    setMemberCode("");
    setMemberState({ status: "idle" });
  };

  /* ---------------- báo giá từ máy chủ ---------------- */

  /**
   * Gửi kèm CCCD/SĐT để máy chủ tra vé tháng/năm còn hạn. Đợi phi công ngừng gõ
   * 450ms mới hỏi — gõ từng chữ mà gọi từng lần thì tốn lượt giới hạn vô ích.
   */
  const quoteKey = JSON.stringify([spot, dates, purchase, verifiedMember?.code ?? "", idNumber.trim(), phone.trim()]);

  useEffect(() => {
    if (!spot || !dates.length) {
      setQuote({ loading: false, fee: null, error: "" });
      return;
    }
    let alive = true;
    setQuote((q) => ({ ...q, loading: true, error: "" }));

    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/bao-bay/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            spot,
            dates,
            purchase,
            memberCode: verifiedMember?.code ?? "",
            idNumber: idNumber.trim(),
            phone: phone.trim(),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        if (res.ok && data?.ok) {
          setQuote({ loading: false, fee: data.fee as BaoBayFee, error: "" });
        } else {
          const code = String(data?.code || "server") as BaoBayErrKey;
          // Mã hội viên vừa bị admin tắt giữa chừng → quay về nhập tay
          if (code === "memberInvalid") setMemberState({ status: "wrong" });
          setQuote({ loading: false, fee: null, error: T.err[code] ?? T.err.server });
        }
      } catch {
        if (alive) setQuote({ loading: false, fee: null, error: T.err.network });
      }
    }, 450);

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
    // quoteKey gom đủ mọi thứ ảnh hưởng tới phí
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey]);

  /* ---------------- gửi báo bay ---------------- */

  const validate = (): Errors => {
    const next: Errors = {};
    if (!spot) next.spot = T.err.spot;
    if (!dates.length) next.dates = T.err.dates;

    // Hội viên: chỉ kiểm những ô danh sách hội còn thiếu
    const needName = !verifiedMember;
    const needId = !verifiedMember || verifiedMember.needId;
    const needPhone = !verifiedMember || verifiedMember.needPhone;
    const needEmg = !verifiedMember || verifiedMember.needEmergencyPhone;

    if (needName && !fullName.trim()) next.fullName = T.err.name;
    if (needId && !idNumber.trim()) next.idNumber = T.err.id;
    if (needPhone) {
      if (!phone.trim()) next.phone = T.err.phone;
      else if (phone.replace(/\D/g, "").length < 8) next.phone = T.err.phoneBad;
    }
    if (needEmg) {
      if (!emergencyPhone.trim()) next.emergencyPhone = T.err.emergencyPhone;
      else if (emergencyPhone.replace(/\D/g, "").length < 8) next.emergencyPhone = T.err.phoneBad;
    }
    return next;
  };

  const submit = async () => {
    setServerError("");
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      focusFirstError(found);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/bao-bay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spot,
          dates,
          purchase,
          memberCode: verifiedMember?.code ?? "",
          fullName: fullName.trim(),
          idNumber: idNumber.trim(),
          phone: phone.trim(),
          emergencyPhone: emergencyPhone.trim(),
          nationality: nationality.trim(),
          wingClass,
          licence: licence.trim(),
          note: note.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        const code = String(data?.code || "server") as BaoBayErrKey;
        if (code === "memberInvalid") setMemberState({ status: "wrong" });
        const field = SERVER_ERR_FIELD[code];
        const msg = T.err[code] ?? data?.message ?? T.err.server;
        if (field) {
          const fe = { [field]: msg } as Errors;
          setErrors(fe);
          focusFirstError(fe);
        }
        setServerError(msg);
        return;
      }

      setResult({
        code: String(data.code),
        spot: data.spot as BaoBaySpot,
        dates: Array.isArray(data.dates) ? data.dates : dates,
        fee: data.fee as BaoBayFee,
        transferNote: String(data.transferNote || ""),
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setServerError(T.err.network);
    } finally {
      setSubmitting(false);
    }
  };

  /** Vẽ mã VietQR ngay trên máy phi công — cùng tài khoản và cách dựng với /muavang. */
  useEffect(() => {
    if (!result || result.fee.total <= 0) return;
    let alive = true;
    (async () => {
      const payload = buildVietQrPayload({
        bankBin: PAYMENT_ACCOUNT.bankBin,
        accountNumber: PAYMENT_ACCOUNT.accountNumber,
        amount: result.fee.total,
        note: result.transferNote,
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
      /* Không vẽ được thì phi công vẫn chuyển khoản tay theo số hiện bên dưới. */
    });
    return () => {
      alive = false;
    };
  }, [result]);

  const heroImage = cfg?.image ?? BAO_BAY_SPOT_CONFIG["khau-pha"].image;

  /* ---------------- bảng phí (dùng chung cho phiếu và màn kết quả) ---------------- */

  // Hàm vẽ chứ không phải component con: khai component trong thân component
  // là mỗi lần gõ phím React dựng lại cả khối từ đầu.
  const feeBox = (fee: BaoBayFee) => (
    <div className="rounded-2xl border border-amber-400/35 bg-amber-400/[0.08] p-5">
      <div className="text-xs font-bold uppercase tracking-[.15em] text-amber-300">{T.feeTitle}</div>
      <div className="mt-3 space-y-2">
        {fee.lines.map((line) => (
          <div key={`${line.key}-${line.dates.join()}`} className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-white/85">
              {T.feeLine[line.key](line.dates.length)}
              {line.key === "month" || line.key === "year" ? (
                <span className="text-white/55">
                  {" "}
                  ({formatVnDate(fee.passFrom ?? "")} – {formatVnDate(fee.passValidUntil ?? "")})
                </span>
              ) : null}
            </span>
            <span className={`shrink-0 text-sm font-bold ${line.amount ? "text-white" : "text-emerald-400"}`}>
              {line.amount ? formatVnd(line.amount) : T.feeFree}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-white/15 pt-3">
        <span className="text-base font-bold text-white">{T.feeTotal}</span>
        <span className={`text-2xl font-extrabold ${fee.total > 0 ? "text-amber-300" : "text-emerald-400"}`}>
          {fee.total > 0 ? formatVnd(fee.total) : T.feeFree}
        </span>
      </div>

      {fee.coveredByPass ? (
        <div className="mt-3 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-200">
          🎫 {T.passNotice(formatVnDate(fee.coveredByPass.until))}
        </div>
      ) : null}
      {fee.passFrom && fee.passValidUntil ? (
        <div className="mt-3 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm leading-relaxed text-emerald-200">
          {T.newPassNotice(formatVnDate(fee.passFrom), formatVnDate(fee.passValidUntil))}
        </div>
      ) : null}
      {fee.autoMonth ? <p className="mt-2 text-sm text-amber-200">{T.autoMonthNotice}</p> : null}
      {fee.hnaaLateDates.length ? (
        <div className="mt-3 rounded-xl border border-amber-400/45 bg-amber-400/15 px-4 py-3 text-sm leading-relaxed text-amber-100">
          ⏰ {T.hnaaLateNotice}
        </div>
      ) : null}
    </div>
  );

  /* ---------------- màn hình báo bay thành công ---------------- */
  if (result) {
    const rCfg = BAO_BAY_SPOT_CONFIG[result.spot];
    return (
      <main className="relative min-h-screen">
        <div className="absolute inset-0">
          <Image src={rCfg.image} alt="" fill priority className="object-cover brightness-[1.05]" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/35 to-[#0B0A08]" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 py-28 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-400 text-4xl shadow-[0_0_50px_rgba(251,191,36,.5)]"
          >
            🪂
          </motion.div>
          <h1
            className="mt-6 font-serif text-3xl font-extrabold text-white md:text-4xl"
            style={{ textShadow: "0 3px 18px rgba(0,0,0,.6)" }}
          >
            {T.okTitle}
          </h1>
          <p className="mt-3 text-white/75">{T.okSubtitle}</p>

          <div className="mt-7 w-full rounded-2xl border border-amber-400/30 bg-amber-400/10 p-5">
            <div className="text-xs font-bold uppercase tracking-[.15em] text-amber-300">{T.okCode}</div>
            <div className="mt-1.5 font-mono text-3xl font-extrabold tracking-wider text-white">{result.code}</div>
            <div className="mt-4 space-y-1.5 border-t border-white/10 pt-3 text-left text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-white/55">{T.okSpot}</span>
                <span className="text-right font-semibold text-white">{T.spotName[result.spot]}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="shrink-0 text-white/55">{T.okDates}</span>
                <span className="text-right font-semibold text-white">{result.dates.map(formatVnDate).join(" · ")}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-white/55">{T.step4}</span>
                <span className="text-right font-semibold text-amber-200">{T.okFeeMode[result.fee.feeMode]}</span>
              </div>
            </div>
          </div>

          <div className="mt-5 w-full text-left">
            {feeBox(result.fee)}
          </div>

          {result.fee.total > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-5 w-full rounded-2xl border border-white/15 bg-white/[0.06] p-5 text-left"
            >
              <div className="text-center text-xs font-bold uppercase tracking-[.15em] text-amber-300">{T.payTitle}</div>
              <div className="mt-1 text-center text-3xl font-extrabold text-amber-300">{formatVnd(result.fee.total)}</div>
              <div className="mt-4 flex justify-center">
                {qrDataUrl ? (
                  <div className="rounded-2xl bg-white p-3 shadow-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrDataUrl} alt={T.altQr} width={230} height={230} className="block h-[230px] w-[230px]" />
                  </div>
                ) : (
                  <div className="flex h-[254px] w-[254px] items-center justify-center rounded-2xl bg-white/10 text-sm text-white/50">
                    {T.payMaking}
                  </div>
                )}
              </div>
              <p className="mt-3 text-center text-sm text-white/60">{T.payScanHint}</p>
              <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-black/25 p-4 text-sm">
                {[
                  [T.payBank, PAYMENT_ACCOUNT.bankName],
                  [T.payAccount, PAYMENT_ACCOUNT.accountDisplay],
                  [T.payOwner, "Đặng Văn Mỹ"],
                  [T.payNote, result.transferNote],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-3">
                    <span className="shrink-0 text-white/50">{label}</span>
                    <span className="break-all text-right font-semibold text-white">{value}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-center text-xs leading-relaxed text-white/50">{T.payLater}</p>
            </motion.div>
          ) : (
            <div className="mt-5 w-full rounded-2xl border border-emerald-400/35 bg-emerald-400/10 p-5 text-center">
              <div className="text-lg font-bold text-emerald-300">{T.noFeeTitle}</div>
              <p className="mt-1 text-sm text-white/65">{T.noFeeDesc}</p>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href={SUPPORT_TEL}
              className="cta-btn inline-flex h-12 items-center rounded-xl bg-amber-400 px-6 text-base font-bold text-black transition hover:bg-amber-300"
            >
              {T.callBtn}
            </a>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-12 items-center rounded-xl border border-white/25 bg-white/10 px-6 text-base font-medium text-white transition hover:bg-white/20"
            >
              {T.againBtn}
            </button>
          </div>
        </div>
      </main>
    );
  }

  /* ---------------- phiếu báo bay ---------------- */
  const grid = monthGrid(viewMonth.year, viewMonth.month);
  const [todayY, todayM] = todayISO.split("-").map(Number);
  const atCurrentMonth = viewMonth.year === todayY && viewMonth.month === todayM - 1;

  return (
    <main className="relative">
      {/* ============ HERO (gọn hơn /muavang — phi công vào đây để báo bay, không để đọc) ============ */}
      <section className="relative flex min-h-[46vh] items-end justify-center overflow-hidden sm:min-h-[56vh]">
        <div className="absolute inset-0">
          <Image
            key={heroImage}
            src={heroImage}
            alt={T.altHero}
            fill
            priority
            className="object-cover brightness-[1.08] saturate-[1.1]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/20 to-[#0B0A08]" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-4 pb-10 pt-28 text-center">
          <span className="inline-flex items-center rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[.14em] text-amber-300 backdrop-blur sm:text-[13px]">
            {T.heroBadge}
          </span>
          <h1
            className="mt-5 font-serif text-5xl font-extrabold text-white sm:text-6xl"
            style={{ textShadow: "0 2px 6px rgba(0,0,0,.85), 0 10px 30px rgba(0,0,0,.7)" }}
          >
            {T.heroTitle}
          </h1>
          <p
            className="mt-3 text-base font-semibold uppercase tracking-[.12em] text-white/90 sm:text-lg"
            style={{ textShadow: "0 2px 12px rgba(0,0,0,.7)" }}
          >
            {T.heroPlaces}
          </p>
          <p className="mt-2 text-sm text-white/70">{T.heroNote}</p>
          <button
            type="button"
            onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="cta-btn mt-7 inline-flex h-13 items-center rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 px-8 py-3.5 text-base font-extrabold text-black shadow-[0_10px_40px_rgba(251,191,36,.35)] transition hover:brightness-110"
          >
            {T.heroCta}
          </button>
        </div>
      </section>

      {/* ============ PHIẾU BÁO BAY ============ */}
      <section className="relative bg-[#0B0A08] pb-24 pt-6">
        <div ref={formRef} className="mx-auto max-w-3xl scroll-mt-20 px-4">
          <div className="overflow-hidden rounded-3xl border-2 border-amber-400/50 bg-[#28344A] shadow-[0_0_70px_rgba(251,191,36,.22),0_24px_60px_rgba(0,0,0,.55)]">
            <div className="border-b border-white/15 bg-gradient-to-r from-amber-400/30 via-amber-400/15 to-transparent px-5 py-5 sm:px-7">
              <h2 className="font-serif text-2xl font-bold text-white sm:text-3xl">{T.formTitle}</h2>
              <p className="mt-1 text-sm text-white/65">{T.formSubtitle}</p>
            </div>

            <div className="p-5 sm:p-7">
              {/* --- 1. điểm bay --- */}
              <div
                className="scroll-mt-24"
                ref={(el) => {
                  fieldRefs.current.spot = el;
                }}
              >
                <SectionTitle step={1} title={T.step1} />
                <div className="grid gap-3">
                  {BAO_BAY_SPOTS.map((s) => (
                    <ChoiceCard
                      key={s}
                      active={spot === s}
                      icon={s === "vien-nam" ? "🏞️" : s === "khau-pha" ? "🌾" : "⛰️"}
                      title={`${T.spotName[s]} · ${T.spotArea[s]}`}
                      desc={T.spotPrices[s]}
                      highlight={BAO_BAY_SPOT_CONFIG[s].hnaa ? T.hnaaBadge : undefined}
                      onClick={() => selectSpot(s)}
                    />
                  ))}
                </div>
                {errors.spot ? <p className="mt-2 text-sm text-red-400">{errors.spot}</p> : null}
              </div>

              {/* --- 2. ngày bay --- */}
              <div
                className="mt-9 scroll-mt-24"
                ref={(el) => {
                  fieldRefs.current.dates = el;
                }}
              >
                <SectionTitle step={2} title={T.step2} hint={T.step2Hint} />
                <div className="rounded-2xl border border-white/20 bg-white/[0.10] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <button
                      type="button"
                      disabled={atCurrentMonth}
                      aria-label="‹"
                      onClick={() =>
                        setViewMonth((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 }))
                      }
                      className="h-9 w-9 rounded-lg border border-white/25 bg-white/[0.08] text-white/80 transition hover:bg-white/20 disabled:opacity-25"
                    >
                      ‹
                    </button>
                    <span className="text-base font-bold text-white">
                      {T.months[viewMonth.month]} {viewMonth.year}
                    </span>
                    <button
                      type="button"
                      aria-label="›"
                      onClick={() =>
                        setViewMonth((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 }))
                      }
                      className="h-9 w-9 rounded-lg border border-white/25 bg-white/[0.08] text-white/80 transition hover:bg-white/20"
                    >
                      ›
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center">
                    {T.weekdays.map((w) => (
                      <div key={w} className="pb-1 text-xs font-semibold text-white/40">
                        {w}
                      </div>
                    ))}
                    {grid.map((iso, i) => {
                      if (!iso) return <div key={`empty-${i}`} />;
                      const selected = dates.includes(iso);
                      const past = iso < todayISO;
                      const isToday = iso === todayISO;
                      return (
                        <button
                          key={iso}
                          type="button"
                          disabled={past}
                          onClick={() => toggleDate(iso)}
                          className={[
                            "aspect-square rounded-lg text-sm font-semibold transition",
                            selected
                              ? "bg-amber-400 text-black shadow-[0_0_18px_rgba(251,191,36,.4)]"
                              : past
                                ? "cursor-not-allowed text-white/15"
                                : "text-white/80 hover:bg-white/10",
                            isToday && !selected ? "ring-1 ring-amber-400/60" : "",
                          ].join(" ")}
                        >
                          {Number(iso.slice(-2))}
                        </button>
                      );
                    })}
                  </div>

                  {dates.length ? (
                    <div className="mt-3 border-t border-white/10 pt-3 text-sm text-white/70">
                      {T.chosenDays(dates.length)} {dates.map(formatVnDate).join(" · ")}
                    </div>
                  ) : null}
                </div>
                {errors.dates ? <p className="mt-2 text-sm text-red-400">{errors.dates}</p> : null}
              </div>

              {/* --- 3. thông tin báo bay --- */}
              <div className="mt-9">
                <SectionTitle step={3} title={T.step3} />

                {/* Mã hội viên HNAA: ô ĐẦU TIÊN, chỉ ở Viên Nam (chủ chốt). Mã đúng
                    thì trang chỉ nhận họ tên + vài số cuối, dữ liệu đầy đủ máy chủ
                    tự gắn vào báo bay. */}
                {hnaaSpot ? (
                  <div className="mb-5 rounded-2xl border border-emerald-400/35 bg-emerald-400/[0.07] p-4">
                    {memberState.status === "ok" ? (
                      <div>
                        <div className="text-sm font-bold text-emerald-300">✅ {T.hnaaOk}</div>
                        <div className="mt-2 text-lg font-bold text-white">{memberState.member.fullName}</div>
                        <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/70">
                          <span>
                            {T.hnaaLabel}: <b className="font-mono text-white">{memberState.member.code}</b>
                          </span>
                          {memberState.member.idMasked ? (
                            <span>
                              {T.memberId}: <b className="text-white">{memberState.member.idMasked}</b>
                            </span>
                          ) : null}
                          {memberState.member.phoneMasked ? (
                            <span>
                              {T.memberPhone}: <b className="text-white">{memberState.member.phoneMasked}</b>
                            </span>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={resetMember}
                          className="mt-3 text-sm font-semibold text-amber-300 underline underline-offset-4"
                        >
                          {T.hnaaChange}
                        </button>
                      </div>
                    ) : (
                      <Field label={T.hnaaLabel}>
                        <p className="mb-2 text-sm leading-relaxed text-white/75">{T.hnaaHint}</p>
                        <div className="flex gap-2">
                          <input
                            className={`${inputClass} uppercase`}
                            value={memberCode}
                            onChange={(e) => {
                              setMemberCode(e.target.value);
                              if (memberState.status !== "idle" && memberState.status !== "checking") {
                                setMemberState({ status: "idle" });
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                checkMember();
                              }
                            }}
                            placeholder={T.hnaaPh}
                            autoComplete="off"
                          />
                          <button
                            type="button"
                            onClick={checkMember}
                            disabled={!memberCode.trim() || memberState.status === "checking"}
                            className="h-12 shrink-0 rounded-xl bg-emerald-500 px-4 text-sm font-bold text-white transition hover:bg-emerald-400 disabled:opacity-50"
                          >
                            {memberState.status === "checking" ? T.hnaaChecking : T.hnaaCheck}
                          </button>
                        </div>
                        {memberState.status === "wrong" ? (
                          <div className="mt-2 text-sm">
                            <span className="font-bold text-red-400">{T.hnaaWrong}</span>
                            <span className="mt-0.5 block text-white/65">{T.hnaaWrongContinue}</span>
                          </div>
                        ) : null}
                        {memberState.status === "rate" ? (
                          <p className="mt-2 text-sm text-red-400">{T.err.rate}</p>
                        ) : null}
                      </Field>
                    )}
                    <p className="mt-3 text-[13px] leading-relaxed text-emerald-200/90">⏰ {T.hnaaCutoff}</p>
                    <p className="mt-2 rounded-lg border border-red-400/35 bg-red-500/10 px-3 py-2 text-[13px] font-semibold leading-relaxed text-red-200">
                      ⚠️ {T.hnaaWarn}
                    </p>
                  </div>
                ) : null}

                {verifiedMember &&
                (verifiedMember.needId || verifiedMember.needPhone || verifiedMember.needEmergencyPhone) ? (
                  <p className="mb-3 text-sm text-white/65">{T.memberNeedMore}</p>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  {!verifiedMember ? (
                    <div
                      className="scroll-mt-24"
                      ref={(el) => {
                        fieldRefs.current.fullName = el;
                      }}
                    >
                      <Field label={T.fFullName} required error={errors.fullName}>
                        <input
                          className={inputClass}
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder={T.fFullNamePh}
                          autoComplete="name"
                        />
                      </Field>
                    </div>
                  ) : null}

                  {!verifiedMember || verifiedMember.needId ? (
                    <div
                      className="scroll-mt-24"
                      ref={(el) => {
                        fieldRefs.current.idNumber = el;
                      }}
                    >
                      <Field label={T.fId} required hint={T.fIdHint} error={errors.idNumber}>
                        <input
                          className={inputClass}
                          value={idNumber}
                          onChange={(e) => setIdNumber(e.target.value)}
                          placeholder={T.fIdPh}
                        />
                      </Field>
                    </div>
                  ) : null}

                  {!verifiedMember || verifiedMember.needPhone ? (
                    <div
                      className="scroll-mt-24"
                      ref={(el) => {
                        fieldRefs.current.phone = el;
                      }}
                    >
                      <Field label={T.fPhone} required error={errors.phone}>
                        <input
                          className={inputClass}
                          value={phone}
                          inputMode="tel"
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder={T.fPhonePh}
                          autoComplete="tel"
                        />
                      </Field>
                    </div>
                  ) : null}

                  {!verifiedMember || verifiedMember.needEmergencyPhone ? (
                    <div
                      className="scroll-mt-24"
                      ref={(el) => {
                        fieldRefs.current.emergencyPhone = el;
                      }}
                    >
                      <Field label={T.fEmergencyPhone} required error={errors.emergencyPhone}>
                        <input
                          className={inputClass}
                          value={emergencyPhone}
                          inputMode="tel"
                          onChange={(e) => setEmergencyPhone(e.target.value)}
                          placeholder={T.fEmergencyPhonePh}
                        />
                      </Field>
                    </div>
                  ) : null}

                  {!verifiedMember ? (
                    <Field label={T.fNationality}>
                      <input
                        className={inputClass}
                        value={nationality}
                        onChange={(e) => {
                          setNationality(e.target.value);
                          setNationalityTouched(true);
                        }}
                        // Điền sẵn "Việt Nam"; chạm vào là bôi đen, gõ chữ đầu là thay luôn
                        onFocus={(e) => {
                          if (!nationalityTouched && nationality === "Việt Nam") e.target.select();
                        }}
                        placeholder={T.fNationality}
                      />
                    </Field>
                  ) : null}

                  <Field label={T.fLicence}>
                    <input
                      className={inputClass}
                      value={licence}
                      maxLength={60}
                      onChange={(e) => setLicence(e.target.value)}
                      placeholder={T.fLicencePh}
                    />
                  </Field>

                  <div className="sm:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-white/80">{T.fWing}</span>
                    {/* Chọn MỘT: bấm cấp khác là đổi, bấm lại chính nó là bỏ chọn */}
                    <div className="flex flex-wrap gap-2">
                      {WING_CLASSES.map((w) => {
                        const on = wingClass === w;
                        return (
                          <button
                            key={w}
                            type="button"
                            onClick={() => setWingClass(on ? "" : w)}
                            className={[
                              "h-11 min-w-[74px] rounded-xl border px-4 text-sm font-bold transition",
                              on
                                ? "border-amber-400 bg-amber-400 text-black"
                                : "border-white/25 bg-white/[0.12] text-white/85 hover:bg-white/20",
                            ].join(" ")}
                          >
                            {w === "PPG" ? T.wingPpg : wingClassLabel(w)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <Field label={T.fNote}>
                      <textarea
                        className={`${inputClass} h-auto min-h-[80px] resize-y py-3 leading-relaxed`}
                        value={note}
                        maxLength={500}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={T.fNotePh}
                      />
                    </Field>
                  </div>
                </div>
              </div>

              {/* --- 4. cách trả phí + bảng phí --- */}
              <div className="mt-9">
                <SectionTitle step={4} title={T.step4} />
                {cfg ? (
                  <div className={`grid gap-3 ${cfg.purchaseModes.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                    {cfg.purchaseModes.map((m) => (
                      <ChoiceCard
                        key={m}
                        active={purchase === m}
                        icon={m === "day" ? "☀️" : m === "month" ? "📅" : "🗓️"}
                        title={
                          m === "day"
                            ? T.modeDay(formatVnd(BAO_BAY_FEE_PER_DAY))
                            : m === "month"
                              ? T.modeMonth(formatVnd(BAO_BAY_FEE_PER_MONTH))
                              : T.modeYear(formatVnd(BAO_BAY_FEE_PER_YEAR))
                        }
                        desc={m === "day" ? T.modeDayDesc : m === "month" ? T.modeMonthDesc : T.modeYearDesc}
                        onClick={() => setPurchase(m)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-white/18 bg-white/[0.08] px-4 py-3 text-sm text-white/60">
                    {T.pickSpotFirst}
                  </p>
                )}

                <div className="mt-5">
                  {quote.fee ? (
                    <div className={quote.loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
                      {feeBox(quote.fee)}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/18 bg-white/[0.08] p-5 text-sm text-white/60">
                      {quote.loading ? T.feeLoading : quote.error || T.feeEmpty}
                    </div>
                  )}
                </div>
              </div>

              {serverError ? (
                <div className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {serverError}
                </div>
              ) : null}

              <div className="mt-7 flex flex-col items-center gap-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={submit}
                  className="cta-btn h-14 w-full max-w-sm rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 text-lg font-extrabold text-black shadow-[0_10px_36px_rgba(251,191,36,.3)] transition hover:brightness-110 disabled:opacity-60"
                >
                  {submitting ? T.submitting : T.submit}
                </button>
                <p className="text-center text-xs leading-relaxed text-white/45">
                  {T.submitFoot}
                  <br />
                  {T.needHelp}{" "}
                  <a href={SUPPORT_TEL} className="font-bold text-white/70">
                    {SUPPORT_PHONE}
                  </a>{" "}
                  (Mr. Mỹ).
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
