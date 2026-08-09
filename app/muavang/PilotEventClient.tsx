"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  EVENT_PLACES,
  GUIDE_LINKS,
  KIND_LABEL,
  PAYMENT_ACCOUNT,
  MOTOR_LABEL,
  MUA_VANG_COMBO_ITEMS,
  COMPANION_VND,
  MUA_VANG_COMBO_VND,
  MUA_VANG_MAX_COMPANIONS,
  MUA_VANG_FREE_SITE_FEE_TEXT,
  MUA_VANG_MAX_PILOTS,
  OPENING_BY_PERIOD,
  MUA_VANG_ZALO_GROUP,
  PILOT_DISCOUNT_TEXT,
  PERIODS,
  SITE_FEE_PER_DAY,
  SITE_FEE_PER_MONTH,
  computePilotFee,
  WING_CLASSES,
  formatVnDate,
  formatVnd,
  hasMotor,
  wingClassLabel,
  type FlyingKind,
  type MotorType,
  type PeriodKey,
  type SiteFeeMode,
  type WingClass,
} from "@/lib/pilot-event";
import { buildVietQrPayload } from "@/lib/vietqr";

/* ------------------------------------------------------------------ *
 * Lịch chọn ngày bay
 * ------------------------------------------------------------------ */

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Lưới ngày của một tháng, bắt đầu từ Thứ 2.
 * Trả về mảng phẳng gồm cả ô trống ở đầu để căn đúng cột.
 */
function monthGrid(year: number, month: number): Array<string | null> {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // JS đếm CN = 0
  const dayCount = new Date(year, month + 1, 0).getDate();

  const cells: Array<string | null> = Array(offset).fill(null);
  for (let d = 1; d <= dayCount; d++) cells.push(toISO(year, month, d));
  return cells;
}

const MONTH_NAME = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

/* ------------------------------------------------------------------ *
 * Mảnh giao diện dùng lại
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
  /** Câu giải thích ngắn vì sao phải khai trường này. */
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-white/80">
        {label}
        {required ? <span className="ml-1 text-amber-400">*</span> : null}
        {hint ? (
          <span className="ml-1.5 font-normal text-white/50">({hint})</span>
        ) : null}
      </span>
      {children}
      {error ? <span className="mt-1.5 block text-sm text-red-400">{error}</span> : null}
    </label>
  );
}

const inputClass =
  "h-12 w-full rounded-xl border border-white/25 bg-white/[0.13] px-3.5 text-[15px] text-white placeholder-white/45 outline-none transition focus:border-amber-400/80 focus:bg-white/[0.18]";

/** Thẻ chọn dạng nút lớn — dùng cho loại hình bay và đợt bay. */
function ChoiceCard({
  active,
  title,
  desc,
  highlight,
  icon,
  badge,
  onClick,
}: {
  active: boolean;
  title: string;
  /** Bỏ trống khi tên thẻ đã đủ rõ — thẻ sẽ tự thu gọn. */
  desc?: string;
  /** Ưu đãi cần đập vào mắt — tô nổi hẳn thay vì để lẫn với mô tả. */
  highlight?: string;
  icon: string;
  badge?: string;
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
      {badge ? (
        <span className="absolute right-3 top-3 rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-black">
          {badge}
        </span>
      ) : null}

      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className={`block text-[15px] font-bold ${active ? "text-amber-300" : "text-white"}`}>
            {title}
          </span>
          {desc ? (
            <span className="mt-1 block text-sm leading-relaxed text-white/60">
              {desc}
            </span>
          ) : null}
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

type Errors = Partial<Record<ErrorKey, string>>;

/** Thứ tự ưu tiên khi nhảy tới ô lỗi — theo đúng thứ tự phi công điền. */
const ERROR_ORDER = [
  "flyingKind",
  "fullName",
  "idNumber",
  "phone",
  "period",
  "dates",
  "motorType",
] as const;

type ErrorKey = (typeof ERROR_ORDER)[number];

export default function PilotEventClient() {
  const formRef = useRef<HTMLDivElement>(null);

  /**
   * Neo tới từng ô có thể báo lỗi, để bấm xác nhận mà thiếu gì thì màn hình
   * tự cuộn tới đúng chỗ đó. Trước đây lỗi hiện ở tận trên cùng còn nút bấm
   * ở cuối trang — phi công bấm mãi không được mà không hiểu tại sao.
   */
  const fieldRefs = useRef<Partial<Record<ErrorKey, HTMLElement | null>>>({});

  const focusFirstError = useCallback((found: Record<string, unknown>) => {
    const key = ERROR_ORDER.find((k) => found[k]);
    if (!key) return;

    const el = fieldRefs.current[key];
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });

    // Ô nhập thì đặt con trỏ vào luôn; thẻ chọn thì chỉ cuộn tới.
    const input = el.querySelector("input, textarea, select");
    if (input instanceof HTMLElement) {
      window.setTimeout(() => input.focus({ preventScroll: true }), 400);
    }
  }, []);

  const [flyingKind, setFlyingKind] = useState<FlyingKind | "">("");
  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [nationality, setNationality] = useState("Việt Nam");
  const [nationalityTouched, setNationalityTouched] = useState(false);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [club, setClub] = useState("");
  const [specialRequest, setSpecialRequest] = useState("");

  const [period, setPeriod] = useState<PeriodKey | "">("");
  const [dates, setDates] = useState<string[]>([]);
  const [viewMonth, setViewMonth] = useState({ year: 2026, month: 7 }); // tháng 8/2026

  const [motorType, setMotorType] = useState<MotorType | "">("");
  const [wingClass, setWingClass] = useState<WingClass | "">("");
  const [siteFeeMode, setSiteFeeMode] = useState<SiteFeeMode>("day");
  const [companionCount, setCompanionCount] = useState(0);
  const [muaVangRegistered, setMuaVangRegistered] = useState(false);
  /** Phi công Mùa Vàng muốn bay thêm ngày ngoài ba ngày lễ hội. */
  const [wantExtraDays, setWantExtraDays] = useState(false);

  const [slots, setSlots] = useState<{
    remaining: number;
    taken: number;
    pilots: Array<{ name: string; kind: string; companions: number }>;
  } | null>(null);

  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    code: string;
    emailSent: boolean;
    feeTotal: number;
    transferNote: string;
  } | null>(null);
  /** Mã của đăng ký đang sửa lại; rỗng = đăng ký mới. */
  const [editCode, setEditCode] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [paidDeclared, setPaidDeclared] = useState(false);
  const [declaring, setDeclaring] = useState(false);
  const [serverError, setServerError] = useState("");

  const motor = flyingKind ? hasMotor(flyingKind) : false;

  /**
   * Ngày được phép chọn theo đợt bay.
   * Hai đợt lễ hội có ngày cố định nên khoá cứng, tránh phi công đăng ký
   * "Mùa Vàng" nhưng lại tích ngày 12/8.
   */
  const allowedDates = useMemo(() => {
    // Bấm "muốn bay thêm" là mở toàn bộ lịch; ba ngày lễ hội vẫn nằm trong
    // danh sách đã chọn và không gỡ ra được.
    if (period === "mua_vang") return wantExtraDays ? null : PERIODS.mua_vang.dates;
    if (period === "le_hoi_com") return PERIODS.le_hoi_com.dates;
    return null; // ngày thường: tự chọn
  }, [period, wantExtraDays]);

  const festivalDates = useMemo(
    () => new Set([...PERIODS.mua_vang.dates, ...PERIODS.le_hoi_com.dates]),
    [],
  );

  /**
   * Số suất còn lại và danh sách phi công đã đăng ký Mùa Vàng.
   *
   * Gọi ngay khi mở trang chứ không đợi tới lúc chọn đợt: con số "còn N/50
   * suất" chính là thứ thúc phi công đăng ký sớm, giấu đi thì phí.
   */
  useEffect(() => {
    let alive = true;
    fetch("/api/pilot-registration/slots")
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setSlots({
          remaining: Number(d?.remaining ?? MUA_VANG_MAX_PILOTS),
          taken: Number(d?.taken ?? 0),
          pilots: Array.isArray(d?.pilots) ? d.pilots : [],
        });
      })
      .catch(() => {
        /* Không lấy được thì trang vẫn dùng bình thường, chỉ thiếu con số. */
      });
    return () => {
      alive = false;
    };
  }, []);

  const todayISO = useMemo(() => {
    const d = new Date();
    return toISO(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  const selectPeriod = useCallback((key: PeriodKey) => {
    setPeriod(key);
    setErrors((e) => ({ ...e, dates: undefined }));

    // Mùa Vàng là trọn gói 3 ngày nên chọn sẵn cả ba, phi công khỏi phải tích.
    if (key === "mua_vang") {
      setDates([...PERIODS.mua_vang.dates]);
      setViewMonth({ year: 2026, month: 7 });
      setWantExtraDays(false);
      return;
    }

    setWantExtraDays(false);

    if (key === "le_hoi_com") {
      setDates([]);
      setViewMonth({ year: 2026, month: 7 });
      return;
    }

    setDates([]);
  }, []);

  const toggleDate = useCallback(
    (iso: string) => {
      // Ba ngày lễ hội là trọn gói, không bỏ lẻ ngày nào; ngày bay thêm thì
      // tích hay bỏ tuỳ ý.
      if (period === "mua_vang" && PERIODS.mua_vang.dates.includes(iso)) return;

      setDates((prev) =>
        prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso].sort(),
      );
      setErrors((e) => ({ ...e, dates: undefined }));
    },
    [period],
  );

  const fee = useMemo(() => {
    if (!period || !flyingKind) return null;
    return computePilotFee({
      period,
      kind: flyingKind,
      dates,
      siteFeeMode,
      companionCount,
      muaVangRegistered,
    });
  }, [period, flyingKind, dates, siteFeeMode, companionCount, muaVangRegistered]);

  // Chỉ ngày thường mới có phí điểm bay; hai đợt lễ hội không thu.
  const showSiteFeeChoice = period === "ngay_thuong";

  const validate = useCallback((): Errors => {
    const next: Errors = {};
    if (!fullName.trim()) next.fullName = "Vui lòng nhập họ tên";
    if (!idNumber.trim()) next.idNumber = "Vui lòng nhập số CCCD/Passport";

    const digits = phone.replace(/\D/g, "");
    if (!phone.trim()) next.phone = "Số điện thoại là bắt buộc";
    else if (digits.length < 8) next.phone = "Số điện thoại chưa đúng, vui lòng kiểm tra lại";

    if (!dates.length) next.dates = "Vui lòng chọn ít nhất một ngày bay";
    if (motor && !motorType) next.motorType = "Vui lòng chọn loại máy";
    return next;
  }, [fullName, idNumber, phone, dates.length, motor, motorType]);

  const submit = async () => {
    setServerError("");

    const found: Errors = {
      ...(flyingKind ? {} : { flyingKind: "Vui lòng chọn loại hình bay" }),
      ...(period ? {} : { period: "Vui lòng chọn đợt bay" }),
      ...(flyingKind && period ? validate() : {}),
    };

    setErrors(found);
    if (Object.keys(found).length) {
      focusFirstError(found);
      return;
    }

    if (!flyingKind || !period) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/pilot-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          idNumber: idNumber.trim(),
          nationality: nationality.trim() || "Việt Nam",
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          club: club.trim(),
          specialRequest: specialRequest.trim(),
          flyingKind,
          period,
          dates,
          motorType: motor ? motorType : "",
          wingClass,
          siteFeeMode,
          companionCount,
          muaVangRegistered,
          wantExtraDays,
          editCode,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setServerError(data?.message || "Không gửi được đăng ký, vui lòng thử lại");
        return;
      }

      setEditCode(data.code);
      setResult({
        code: data.code,
        emailSent: Boolean(data.emailSent),
        feeTotal: Number(data.feeTotal) || 0,
        transferNote: String(data.transferNote || ""),
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setServerError("Mất kết nối, vui lòng thử lại");
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Vẽ mã VietQR ngay trên máy phi công.
   *
   * Nhập `qrcode` theo kiểu động để thư viện chỉ tải khi thật sự cần — trang
   * này phần lớn thời gian là đọc thông tin sự kiện, chưa tới bước trả tiền.
   */
  useEffect(() => {
    if (!result || result.feeTotal <= 0) return;

    let alive = true;
    (async () => {
      const payload = buildVietQrPayload({
        bankBin: PAYMENT_ACCOUNT.bankBin,
        accountNumber: PAYMENT_ACCOUNT.accountNumber,
        amount: result.feeTotal,
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

  const declarePaid = async () => {
    if (!result) return;
    setDeclaring(true);
    try {
      const res = await fetch("/api/pilot-registration/paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: result.code }),
      });
      if (res.ok) setPaidDeclared(true);
    } catch {
      /* Bấm lại được, nên nuốt lỗi mạng ở đây. */
    } finally {
      setDeclaring(false);
    }
  };

  /* ---------------- màn hình đăng ký thành công ---------------- */
  if (result) {
    return (
      <main className="relative min-h-screen">
        <div className="absolute inset-0">
          <Image
            src="/spots/khau-pha/hero.jpg"
            alt=""
            fill
            priority
            className="object-cover brightness-[1.1] saturate-[1.08]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/25 to-[#0B0A08]" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 py-28 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-400 text-4xl shadow-[0_0_50px_rgba(251,191,36,.5)]"
          >
            🪂
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6 font-serif text-3xl font-extrabold text-white md:text-4xl"
            style={{ textShadow: "0 3px 18px rgba(0,0,0,.6)" }}
          >
            Đăng ký thành công — Hẹn gặp trên mùa vàng!
          </motion.h1>

          <p className="mt-3 text-white/75">
            Ban tổ chức đã nhận thông tin của bạn và sẽ liên hệ để xác nhận lịch bay.
          </p>

          <div className="mt-7 w-full rounded-2xl border border-amber-400/30 bg-amber-400/10 p-5">
            <div className="text-xs font-bold uppercase tracking-[.15em] text-amber-300">
              Mã đăng ký
            </div>
            <div className="mt-1.5 font-mono text-3xl font-extrabold tracking-wider text-white">
              {result.code}
            </div>
          </div>

          {period && OPENING_BY_PERIOD[period] ? (
            <div className="mt-5 w-full rounded-2xl border-2 border-amber-400/60 bg-gradient-to-b from-amber-400/25 to-amber-400/5 px-5 py-4 text-center shadow-[0_0_30px_rgba(251,191,36,.22)]">
              <div className="text-xs font-bold uppercase tracking-[.15em] text-amber-300">
                🎬 Lễ khai mạc
              </div>
              <div className="mt-1 text-base font-extrabold text-white">
                {OPENING_BY_PERIOD[period]}
              </div>
            </div>
          ) : null}

          {/* ---- nhóm Zalo, chỉ với đợt Mùa Vàng ---- */}
          {period === "mua_vang" ? (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
              className="mt-5 w-full rounded-2xl border border-sky-400/40 bg-sky-400/10 p-5 text-center"
            >
              <div className="text-base font-bold text-sky-300">
                Vui lòng tham gia nhóm Zalo của sự kiện
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-white/70">
                Ba ngày sự kiện lịch bay thay đổi theo gió — ban tổ chức báo tin
                trong nhóm, không gọi từng người.
              </p>
              <a
                href={MUA_VANG_ZALO_GROUP}
                target="_blank"
                rel="noreferrer"
                className="cta-btn mt-4 inline-flex h-12 items-center rounded-xl bg-[#0068FF] px-6 text-base font-bold text-white transition hover:brightness-110"
              >
                Vào nhóm Zalo sự kiện
              </a>
            </motion.div>
          ) : null}

          {/* ---- chuyển khoản cọc ---- */}
          {result.feeTotal > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="mt-6 w-full rounded-2xl border border-white/15 bg-white/[0.06] p-5 text-left"
            >
              <div className="text-center text-xs font-bold uppercase tracking-[.15em] text-amber-300">
                Chuyển khoản cọc
              </div>
              <div className="mt-1 text-center text-3xl font-extrabold text-amber-300">
                {formatVnd(result.feeTotal)}
              </div>

              <div className="mt-4 flex justify-center">
                {qrDataUrl ? (
                  <div className="rounded-2xl bg-white p-3 shadow-lg">
                    <img
                      src={qrDataUrl}
                      alt="Mã QR chuyển khoản"
                      width={230}
                      height={230}
                      className="block h-[230px] w-[230px]"
                    />
                  </div>
                ) : (
                  <div className="flex h-[254px] w-[254px] items-center justify-center rounded-2xl bg-white/10 text-sm text-white/50">
                    Đang tạo mã QR…
                  </div>
                )}
              </div>

              <p className="mt-3 text-center text-sm text-white/60">
                Quét bằng app ngân hàng — số tiền và nội dung đã điền sẵn.
              </p>

              {/* Hai câu này quyết định việc phi công có chuyển tiền hay không,
                  nên đặt ngay dưới mã QR chứ không nhét xuống cuối trang. */}
              <div className="mt-3 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm leading-relaxed text-amber-100">
                <b>Lưu ý:</b> đăng ký chỉ được ghi nhận sau khi phi công chuyển
                khoản phí đăng ký.
                <span className="mt-1 block text-emerald-300">
                  Yên tâm — nếu huỷ lịch bay, bạn sẽ được hoàn tiền.
                </span>
              </div>

              <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-black/25 p-4 text-sm">
                {[
                  ["Ngân hàng", PAYMENT_ACCOUNT.bankName],
                  ["Số tài khoản", PAYMENT_ACCOUNT.accountDisplay],
                  ["Chủ tài khoản", "Đặng Văn Mỹ"],
                  ["Nội dung", result.transferNote],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-3">
                    <span className="shrink-0 text-white/50">{label}</span>
                    <span className="text-right font-semibold text-white">{value}</span>
                  </div>
                ))}
              </div>

              {paidDeclared ? (
                <div className="mt-4 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-center text-sm font-semibold text-emerald-300">
                  ✓ Đã ghi nhận. Ban tổ chức sẽ đối chiếu sao kê và liên hệ lại với bạn.
                </div>
              ) : (
                <button
                  type="button"
                  onClick={declarePaid}
                  disabled={declaring}
                  className="cta-btn mt-4 h-13 w-full rounded-xl bg-emerald-500 py-3.5 text-base font-extrabold text-white transition hover:bg-emerald-400 disabled:opacity-60"
                >
                  {declaring ? "Đang ghi nhận…" : "Tôi đã CK cọc"}
                </button>
              )}
            </motion.div>
          ) : (
            <div className="mt-6 w-full rounded-2xl border border-emerald-400/35 bg-emerald-400/10 p-5 text-center">
              <div className="text-lg font-bold text-emerald-300">
                Đợt bay này không thu phí
              </div>
              <p className="mt-1 text-sm text-white/65">
                Bạn không phải chuyển khoản gì cả, chỉ cần có mặt đúng lịch.
              </p>
            </div>
          )}

          <p className="mt-5 text-sm leading-relaxed text-white/60">
            {result.emailSent
              ? "Bản xác nhận chi tiết đã được gửi vào email của bạn."
              : "Bạn chưa khai email nên ban tổ chức sẽ gọi điện xác nhận trực tiếp."}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="tel:+84964073555"
              className="cta-btn inline-flex h-12 items-center rounded-xl bg-amber-400 px-6 text-base font-bold text-black transition hover:bg-amber-300"
            >
              Gọi ban tổ chức: 0964 073 555
            </a>
            {/* Quay lại phiếu với nguyên dữ liệu đã điền. Gửi lại sẽ CẬP NHẬT
                đúng bản ghi cũ (nhờ editCode) chứ không tạo thêm đăng ký mới. */}
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setPaidDeclared(false);
                setQrDataUrl("");
                formRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
              className="inline-flex h-12 items-center rounded-xl border border-amber-400/60 bg-amber-400/15 px-6 text-base font-semibold text-amber-200 transition hover:bg-amber-400/25"
            >
              Sửa lại thông tin đăng ký
            </button>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-12 items-center rounded-xl border border-white/25 bg-white/10 px-6 text-base font-medium text-white transition hover:bg-white/20"
            >
              Đăng ký cho phi công khác
            </button>
          </div>
        </div>
      </main>
    );
  }

  /* ---------------- trang đăng ký ---------------- */
  const grid = monthGrid(viewMonth.year, viewMonth.month);

  return (
    <main className="relative">
      {/* ============ HERO ============ */}
      <section className="relative flex min-h-[86vh] items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/spots/khau-pha/hero.jpg"
            alt="Ruộng bậc thang mùa vàng tại đèo Khau Phạ"
            fill
            priority
            className="scale-105 object-cover brightness-[1.12] contrast-[1.05] saturate-[1.12]"
          />
          {/* Lớp phủ mỏng hơn hẳn bản đầu: ruộng bậc thang mùa vàng là thứ
              đáng khoe nhất ở đây, phủ đen dày quá thì ảnh thành nền xám. Chữ
              vẫn đọc được nhờ bóng đổ riêng trên từng dòng. */}
          {/* Chỉ còn một dải mờ rất nhẹ ở trên và một dải đậm dần ở đáy để nối
              xuống nền trang. Phần giữa ảnh gần như để mộc — chữ vẫn đọc được
              vì mỗi dòng đã có bóng đổ riêng. */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/15 to-[#0B0A08]" />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#0B0A08] to-transparent" />
        </div>

        {/* Chip đứng cao gần đầu ảnh, cụm tên sự kiện dồn hẳn xuống dưới —
            khoảng giữa để trống cho cánh dù trong ảnh nền.
            max-w-6xl chứ không phải 4xl: dòng "MÙA VÀNG 2026" cỡ chữ khối
            rộng hơn 4xl, mà <section> có overflow-hidden nên tràn ra là bị
            cắt cụt mất đuôi. */}
        <div className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-[18vh] text-center sm:pt-[20vh]">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/15 px-4 py-1.5 text-[13px] font-bold uppercase tracking-[.18em] text-amber-300 backdrop-blur"
          >
            🪂 Trang dành riêng cho phi công
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="mt-[22vh] sm:mt-[24vh]"
          >
            {/* Dòng dẫn nên nhường hẳn cho tên sự kiện: chữ nhỏ lại, nhưng
                bóng đổ dày ba lớp để vẫn tách khỏi nền ảnh nay đã sáng. */}
            <span
              className="block font-serif text-lg font-bold text-white sm:text-xl md:text-2xl"
              style={{
                textShadow:
                  "0 1px 2px rgba(0,0,0,.95), 0 3px 10px rgba(0,0,0,.85), 0 8px 26px rgba(0,0,0,.7)",
              }}
            >
              Chào mừng đến với
            </span>

            {/* Tên sự kiện: chữ khối, nén chiều cao còn 83% cho ra dáng tít áp
                phích — béo và lùn. Không dùng viền bao quanh chữ; độ nổi lấy
                từ bóng đổ mềm phía sau, để nét chữ vẫn sạch.
                whitespace-nowrap giữ "Mùa Vàng 2026" không bị bẻ đôi. */}
            <span
              className="mt-3 block whitespace-nowrap text-[clamp(2.5rem,10.2vw,6.5rem)] font-black uppercase leading-[0.9] tracking-[-0.03em] text-transparent"
              style={{
                fontFamily:
                  "'Arial Black','Helvetica Neue',Helvetica,Arial,sans-serif",
                transform: "scaleY(0.83)",
                transformOrigin: "center top",
                backgroundImage:
                  "linear-gradient(180deg,#FFFDF2 0%,#FDE68A 30%,#F59E0B 62%,#B45309 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                filter:
                  "drop-shadow(0 2px 6px rgba(0,0,0,.85)) drop-shadow(0 10px 30px rgba(0,0,0,.75))",
              }}
            >
              Mùa Vàng 2026
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="mx-auto mt-4 max-w-2xl text-lg font-semibold uppercase tracking-[.12em] text-white/90 sm:text-xl"
            style={{ textShadow: "0 2px 12px rgba(0,0,0,.7)" }}
          >
            Khau Phạ · Tú Lệ · Mù Cang Chải
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm"
          >
            {[
              { icon: "🌾", text: "Bay trên mùa vàng · 29–31/8" },
              { icon: "🍚", text: "Lễ hội Cốm Tú Lệ · 21–23/8" },
              { icon: "⛰️", text: "Cất cánh 1.268m" },
            ].map((chip) => (
              <span
                key={chip.text}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/35 px-4 py-2 font-medium text-white/90 backdrop-blur-md"
              >
                <span>{chip.icon}</span>
                {chip.text}
              </span>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
            className="mt-10"
          >
            <button
              type="button"
              onClick={() =>
                formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
              className="cta-btn inline-flex h-14 items-center rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 px-9 text-lg font-extrabold text-black shadow-[0_10px_40px_rgba(251,191,36,.35)] transition hover:brightness-110"
            >
              Đăng ký bay ngay
            </button>
            <p className="mt-3 text-sm text-white/55">
              Phi công phải đăng ký trước khi bay tại điểm bay
            </p>
          </motion.div>
        </div>
      </section>

      {/* ============ BA ĐỢT BAY ============ */}
      <section className="relative bg-[#0B0A08] py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center font-serif text-3xl font-bold text-white">
            Chọn thời điểm bay
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-white/60">
            Hai đợt lễ hội không thu phí điểm bay. Phí điểm bay chỉ áp dụng cho những
            ngày bay thường ngoài hai đợt này.
          </p>

          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {[
              {
                key: "mua_vang" as const,
                icon: "🌾",
                dates: "29 – 31/08/2026",
                highlight: true,
                lines: [
                  OPENING_BY_PERIOD.mua_vang as string,
                  `Combo trọn gói ${formatVnd(MUA_VANG_COMBO_VND)}`,
                  "**Phi công PPG: Được FREE**",
                  "Không tách lẻ từng mục",
                ],
              },
              {
                key: "le_hoi_com" as const,
                icon: "🍚",
                dates: "21 – 23/08/2026",
                highlight: false,
                lines: [
                  OPENING_BY_PERIOD.le_hoi_com as string,
                  "Không thu phí điểm bay",
                  "Mọi phi công đều được bay miễn phí",
                  "Phi công dù lượn tự túc ăn ở",
                ],
              },
              {
                key: "ngay_thuong" as const,
                icon: "🗓️",
                dates: "ngoài thời điểm lễ hội",
                highlight: false,
                lines: [
                  `Phí điểm bay: ${formatVnd(SITE_FEE_PER_DAY)}/ngày`,
                  `hoặc ${formatVnd(SITE_FEE_PER_MONTH)}/tháng`,
                  "Vui lòng đăng ký trước khi bay",
                  "Chưa bao gồm ăn ở và đi lại",
                ],
              },
            ].map((card, i) => (
              <motion.div
                key={card.key}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                /* Hai đợt lễ hội là thứ phi công tới đây để tìm, nên viền vàng
                   dày, nền ấm và có quầng sáng; đợt ngày thường để trầm hơn. */
                className={[
                  "rounded-2xl border p-5 transition-shadow",
                  card.key === "ngay_thuong"
                    ? "border-white/12 bg-white/[0.04]"
                    : "border-2 border-amber-400/60 bg-gradient-to-b from-amber-400/[0.22] via-amber-400/[0.08] to-transparent shadow-[0_0_36px_rgba(251,191,36,.22)]",
                ].join(" ")}
              >
                {/* Phần đầu thẻ căn giữa; ngày tháng luôn tô vàng để mắt bắt
                    ngay đợt nào diễn ra lúc nào. */}
                <div className="text-center">
                  <div className="text-3xl leading-none">{card.icon}</div>
                  <h3 className="mt-2 text-lg font-bold leading-snug text-white">
                    {PERIODS[card.key].name}
                  </h3>
                  <div className="mt-1 text-sm font-bold text-amber-300">
                    {card.dates}
                  </div>
                </div>

                {/* Dòng bọc trong ** ** là ưu đãi cần đập vào mắt: chữ to,
                    đậm và tô nền xanh thay vì nằm lẫn với các gạch đầu dòng. */}
                <ul className="mt-4 space-y-1.5 border-t border-white/10 pt-4">
                  {card.lines.map((line) => {
                    const strong = line.startsWith("**") && line.endsWith("**");
                    const text = strong ? line.slice(2, -2) : line;

                    return (
                      <li
                        key={line}
                        className={
                          strong
                            ? "mt-2 flex items-center gap-2 rounded-lg bg-emerald-400/15 px-2.5 py-2 text-[15px] font-extrabold text-emerald-300 ring-1 ring-emerald-400/40"
                            : "flex gap-2 text-sm text-white/75"
                        }
                      >
                        <span className={strong ? "" : "text-amber-400"}>
                          {strong ? "🎁" : "•"}
                        </span>
                        {text}
                      </li>
                    );
                  })}
                </ul>
              </motion.div>
            ))}
          </div>

          {/* Ưu đãi áp dụng cho mọi phi công, không riêng đợt nào. */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-5 flex items-center justify-center gap-3 rounded-2xl border border-emerald-400/35 bg-emerald-400/[0.08] px-5 py-4 text-center"
          >
            <span className="text-2xl">🎁</span>
            <span className="text-[15px] font-semibold text-emerald-200">
              {PILOT_DISCOUNT_TEXT}
            </span>
          </motion.div>

          {/* Combo Mùa Vàng gồm gì */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/[0.07] p-5"
          >
            <h3 className="text-base font-bold text-amber-300">
              Combo tham dự Festival dù lượn Bay trên mùa vàng 2026 trọn gói —{" "}
              {formatVnd(MUA_VANG_COMBO_VND)}
            </h3>
            <p className="mt-1 text-sm text-white/60">
              Ban tổ chức bao trọn từ chiều 29/8 đến trưa 31/8.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {MUA_VANG_COMBO_ITEMS.map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-white/80">
                  <span className="mt-0.5 text-emerald-400">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============ ĐỊA ĐIỂM ============ */}
      <section className="relative bg-[#0B0A08] pb-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center font-serif text-3xl font-bold text-white">
            Địa điểm sự kiện
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-white/60">
            Bấm vào từng thẻ để mở chỉ đường trên Google Maps.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {EVENT_PLACES.map((place, i) => (
              <motion.div
                key={place.role}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="group rounded-2xl border border-white/20 bg-white/[0.10] p-5 transition-colors hover:border-amber-400/45 hover:bg-white/[0.07]"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl leading-none">{place.icon}</span>

                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold uppercase tracking-[.14em] text-amber-400">
                      {place.role}
                    </div>
                    <div className="mt-1 text-lg font-bold text-white">
                      {place.name}
                    </div>
                    <div className="mt-0.5 text-sm text-white/60">
                      {place.detail}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <a
                        href={place.mapUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-300 underline underline-offset-4 transition hover:text-amber-200"
                      >
                        📍 Xem bản đồ
                      </a>

                      {place.pageUrl ? (
                        <a
                          href={place.pageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/70 underline underline-offset-4 transition hover:text-white"
                        >
                          🏡 {place.pageLabel}
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ ĐỌC THÊM ============ */}
      <section className="relative bg-[#0B0A08] pb-14">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-center font-serif text-2xl font-bold text-white">
            Đọc thêm trước khi lên đường
          </h2>
          <p className="mt-1.5 text-center text-sm text-white/55">
            Đường đi, nhà xe và những gì có ở Mù Cang Chải — cho cả người nhà đi cùng.
          </p>

          {/* Dải chip một dòng thay cho lưới thẻ: đây là mục tham khảo, không
              nên chiếm chỗ của phần đăng ký ngay bên dưới. */}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {GUIDE_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                title={item.desc}
                className="group inline-flex items-center gap-1.5 rounded-full border border-white/18 bg-white/[0.06] px-3.5 py-2 text-[13px] font-medium text-white/80 transition-colors hover:border-amber-400/50 hover:bg-white/[0.12] hover:text-amber-200"
              >
                <span>{item.icon}</span>
                {item.title}
                <span className="text-amber-400/70 transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FORM ============ */}
      <section ref={formRef} className="relative scroll-mt-20 bg-[#0B0A08] pb-24">
        <div className="mx-auto max-w-3xl px-4">
          {/* Phiếu đăng ký tách hẳn khỏi nền tối của trang: nền xanh đêm sáng
              hơn, viền vàng và quầng sáng quanh khối. Đây là chỗ phi công phải
              làm việc thật, không nên chìm vào phần giới thiệu phía trên. */}
          <div className="overflow-hidden rounded-3xl border-2 border-amber-400/50 bg-[#28344A] shadow-[0_0_70px_rgba(251,191,36,.22),0_24px_60px_rgba(0,0,0,.55)]">
            <div className="border-b border-white/15 bg-gradient-to-r from-amber-400/30 via-amber-400/15 to-transparent px-5 py-5 sm:px-7">
              <h2 className="font-serif text-2xl font-bold text-white sm:text-3xl">
                {editCode ? "Sửa phiếu đăng ký" : "Phiếu đăng ký bay"}
              </h2>
              <p className="mt-1 text-sm text-white/65">
                {editCode ? (
                  <>
                    Đang sửa đăng ký{" "}
                    <b className="font-mono text-amber-300">{editCode}</b> — gửi lại sẽ
                    cập nhật chính đăng ký này, không tạo thêm bản mới.
                  </>
                ) : (
                  <>
                    Điền đủ các mục có dấu{" "}
                    <span className="text-amber-400">*</span> rồi bấm xác nhận.
                  </>
                )}
              </p>
            </div>

            <div className="p-5 sm:p-7">

            {/* --- 1. loại hình bay --- */}
            <div
              className="mt-8 scroll-mt-24"
              ref={(el) => {
                fieldRefs.current.flyingKind = el;
              }}
            >
              <SectionTitle step={1} title="Bạn bay loại nào?" />
              <div className="grid gap-3 sm:grid-cols-3">
                {(["paragliding", "paramotor", "both"] as FlyingKind[]).map((k) => (
                  <ChoiceCard
                    key={k}
                    active={flyingKind === k}
                    icon={k === "paragliding" ? "🪂" : k === "paramotor" ? "🛩️" : "✨"}
                    title={KIND_LABEL[k]}
                    desc={k === "paragliding" ? "Dù không động cơ" : ""}
                    highlight={
                      k === "paramotor" || k === "both"
                        ? "Phi công PPG được miễn phí ăn ở trong đợt lễ hội"
                        : undefined
                    }
                    onClick={() => {
                      setFlyingKind(k);
                      if (!hasMotor(k)) setMotorType("");
                    }}
                  />
                ))}
              </div>
              {errors.flyingKind ? (
                <p className="mt-2 text-sm text-red-400">{errors.flyingKind}</p>
              ) : null}
            </div>

            {/* --- 2. thông tin phi công --- */}
            <div className="mt-9">
              <SectionTitle step={2} title="Thông tin phi công" />
              <div className="grid gap-4 sm:grid-cols-2">
                <div
                  className="scroll-mt-24"
                  ref={(el) => {
                    fieldRefs.current.fullName = el;
                  }}
                >
                  <Field label="Họ và tên" required error={errors.fullName}>
                    <input
                      className={inputClass}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                    />
                  </Field>
                </div>

                <div
                  className="scroll-mt-24"
                  ref={(el) => {
                    fieldRefs.current.idNumber = el;
                  }}
                >
                  <Field
                    label="Số CCCD/Passport"
                    required
                    hint="để đăng ký lưu trú"
                    error={errors.idNumber}
                  >
                    <input
                      className={inputClass}
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      placeholder="0010xxxxxxx"
                    />
                  </Field>
                </div>

                <Field label="Quốc tịch">
                  <input
                    className={inputClass}
                    value={nationality}
                    onChange={(e) => {
                      setNationality(e.target.value);
                      setNationalityTouched(true);
                    }}
                    /* Ô điền sẵn "Việt Nam"; phi công nước ngoài chạm vào là
                       chữ đó được bôi đen, gõ chữ đầu tiên là thay luôn. */
                    onFocus={(e) => {
                      if (!nationalityTouched && nationality === "Việt Nam") {
                        e.target.select();
                      }
                    }}
                    placeholder="Việt Nam"
                  />
                </Field>

                <div
                  className="scroll-mt-24"
                  ref={(el) => {
                    fieldRefs.current.phone = el;
                  }}
                >
                  <Field label="Số điện thoại" required error={errors.phone}>
                    <input
                      className={inputClass}
                      value={phone}
                      inputMode="tel"
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0912 345 678 hoặc +33 6 12 34 56 78"
                    />
                  </Field>
                </div>

                <div className="sm:col-span-2">
                  <Field label="Email (không bắt buộc)">
                    <input
                      className={inputClass}
                      value={email}
                      type="email"
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Có email thì bản xác nhận sẽ được gửi tới đây"
                    />
                  </Field>
                </div>

                <div className="sm:col-span-2">
                  <Field label="Địa chỉ">
                    <input
                      className={inputClass}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Số nhà, phường/xã, tỉnh/thành"
                    />
                  </Field>
                </div>

                <div className="sm:col-span-2">
                  <Field label="CLB / Hội">
                    <input
                      className={inputClass}
                      value={club}
                      onChange={(e) => setClub(e.target.value)}
                      placeholder="Ví dụ: HNAA, VWHN, SGPG, …"
                    />
                  </Field>
                </div>

                <div className="sm:col-span-2">
                  <Field label="Yêu cầu riêng" hint="không bắt buộc">
                    {/* Ô nhiều dòng: phi công hay viết vài câu (ăn chay, đi
                        cùng bạn, cần chỗ để xe, tới muộn…) chứ không phải một
                        cụm ngắn như các ô trên. */}
                    <textarea
                      className={`${inputClass} h-auto min-h-[88px] resize-y py-3 leading-relaxed`}
                      value={specialRequest}
                      maxLength={500}
                      onChange={(e) => setSpecialRequest(e.target.value)}
                      placeholder="Ví dụ: ăn chay, đi cùng bạn cùng phòng, tới muộn tối 29, cần chỗ để xe…"
                    />
                  </Field>
                </div>
              </div>
            </div>

            {/* --- 3. đợt bay --- */}
            <div
              className="mt-9 scroll-mt-24"
              ref={(el) => {
                fieldRefs.current.period = el;
              }}
            >
              <SectionTitle step={3} title="Đợt bay" />
              <div className="grid gap-3">
                {(["mua_vang", "le_hoi_com", "ngay_thuong"] as PeriodKey[]).map((k) => (
                  <ChoiceCard
                    key={k}
                    active={period === k}
                    icon={k === "mua_vang" ? "🌾" : k === "le_hoi_com" ? "🍚" : "🗓️"}
                    title={PERIODS[k].name}
                    desc={
                      PERIODS[k].dates.length
                        ? `${formatVnDate(PERIODS[k].dates[0])} – ${formatVnDate(
                            PERIODS[k].dates[PERIODS[k].dates.length - 1],
                          )} · ${PERIODS[k].note}`
                        : PERIODS[k].note
                    }
                    badge={k === "mua_vang" ? "Sự kiện chính" : undefined}
                    onClick={() => selectPeriod(k)}
                  />
                ))}
              </div>
              {errors.period ? (
                <p className="mt-2 text-sm text-red-400">{errors.period}</p>
              ) : null}
            </div>

            {/* Giờ khai mạc: mốc phi công phải có mặt, nên đặt ngay sau khi
                chọn đợt chứ không giấu trong danh sách combo. */}
            {period && OPENING_BY_PERIOD[period] ? (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border-2 border-amber-400/70 bg-gradient-to-r from-amber-400/30 to-amber-400/10 px-5 py-4 shadow-[0_0_28px_rgba(251,191,36,.25)]">
                <span className="text-3xl">🎬</span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold uppercase tracking-[.16em] text-amber-300">
                    Lễ khai mạc
                  </span>
                  <span className="mt-0.5 block text-base font-extrabold leading-snug text-white">
                    {OPENING_BY_PERIOD[period]}
                  </span>
                </span>
              </div>
            ) : null}

            {/* Suất còn lại và ai đã ghi tên — chỉ hiện khi chọn Mùa Vàng. */}
            {period === "mua_vang" && slots ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-2xl border border-amber-400/35 bg-amber-400/[0.08] p-5"
              >
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[.15em] text-amber-300">
                      {slots.taken >= MUA_VANG_MAX_PILOTS
                        ? "Phi công đã đăng ký"
                        : "Suất phi công còn lại"}
                    </div>
                    <div className="mt-1 text-3xl font-extrabold text-white">
                      {slots.taken >= MUA_VANG_MAX_PILOTS
                        ? slots.taken
                        : slots.remaining}
                      <span className="ml-1 text-lg font-bold text-white/50">
                        / {MUA_VANG_MAX_PILOTS}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-white/60">
                    Đã có <b className="text-amber-300">{slots.taken}</b> phi công đăng ký
                  </div>
                </div>

                {/* Thanh lấp đầy: nhìn phát biết còn nhiều hay sắp hết. */}
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 transition-all"
                    style={{
                      width: `${Math.min(100, (slots.taken / MUA_VANG_MAX_PILOTS) * 100)}%`,
                    }}
                  />
                </div>

                {slots.pilots.length ? (
                  <div className="mt-4 border-t border-white/12 pt-4">
                    <div className="text-xs font-bold uppercase tracking-[.14em] text-white/50">
                      Phi công đã đăng ký
                    </div>
                    {/* Danh sách chỉ để phi công liếc xem có ai quen, không
                        phải nội dung chính — để chữ nhỏ và xếp nhiều cột cho
                        khỏi đẩy phần đăng ký xuống quá xa. */}
                    <ol className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                      {slots.pilots.map((p, idx) => (
                        <li
                          key={`${p.name}-${idx}`}
                          className="flex items-baseline gap-1.5 text-[11px] leading-snug text-white/70"
                        >
                          <span className="w-4 shrink-0 text-right font-mono text-white/30">
                            {idx + 1}.
                          </span>
                          <span className="font-semibold">{p.name}</span>
                          <span className="text-white/35">
                            {p.kind === "paramotor"
                              ? "· dù máy"
                              : p.kind === "both"
                                ? "· cả hai"
                                : "· dù lượn"}
                            {p.companions > 0 ? ` · +${p.companions} người nhà` : ""}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : (
                  <div className="mt-4 border-t border-white/12 pt-4 text-sm text-white/50">
                    Chưa có phi công nào đăng ký — bạn có thể là người đầu tiên.
                  </div>
                )}

                {slots.taken >= MUA_VANG_MAX_PILOTS ? (
                  <div className="mt-4 rounded-xl border border-amber-400/45 bg-amber-400/15 px-4 py-3 text-sm font-semibold text-amber-200">
                    Đã hơn {MUA_VANG_MAX_PILOTS} phi công đăng ký sự kiện. Bạn vẫn đăng ký
                    được, ban tổ chức sẽ liên hệ để sắp xếp.
                  </div>
                ) : null}
              </motion.div>
            ) : null}

            {/* --- 4. lịch chọn ngày --- */}
            {period ? (
              <div
                className="mt-9 scroll-mt-24"
                ref={(el) => {
                  fieldRefs.current.dates = el;
                }}
              >
                <SectionTitle
                  step={4}
                  title="Ngày bay"
                  hint={
                    period === "mua_vang"
                      ? "Ba ngày lễ hội đi trọn gói nên đã chọn sẵn, không bỏ lẻ ngày nào."
                      : period === "le_hoi_com"
                        ? "Tích những ngày bạn bay trong Lễ hội Cốm Tú Lệ."
                        : "Tích những ngày bạn dự định bay — chọn ngày rời rạc cũng được, bay bao nhiêu ngày tính bấy nhiêu."
                  }
                />

                {/* Bay thêm ngày ngoài ba ngày lễ hội. Để ngay trên lịch vì
                    bấm vào đây mới mở khoá được các ngày còn lại. */}
                {period === "mua_vang" ? (
                  <label className="mb-3 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/20 bg-white/[0.10] p-4 transition hover:border-amber-400/40">
                    <input
                      type="checkbox"
                      checked={wantExtraDays}
                      onChange={(e) => {
                        setWantExtraDays(e.target.checked);
                        // Bỏ tích thì thu lại đúng ba ngày lễ hội.
                        if (!e.target.checked) {
                          setDates([...PERIODS.mua_vang.dates]);
                        }
                      }}
                      className="mt-1 h-4 w-4 rounded border-white/30 accent-amber-400"
                    />
                    <span className="text-sm leading-relaxed text-white/80">
                      <b className="text-amber-300">Tôi muốn bay thêm ngày</b> ngoài ba
                      ngày lễ hội.
                      <span className="mt-1 block text-white/60">
                        {MUA_VANG_FREE_SITE_FEE_TEXT}. Ngày nằm ngoài khoảng này vẫn thu
                        phí điểm bay như thường.
                      </span>
                    </span>
                  </label>
                ) : null}

                <div className="rounded-2xl border border-white/20 bg-white/[0.10] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <button
                      type="button"
                      disabled={!!allowedDates}
                      onClick={() =>
                        setViewMonth((v) =>
                          v.month === 0
                            ? { year: v.year - 1, month: 11 }
                            : { ...v, month: v.month - 1 },
                        )
                      }
                      className="h-9 w-9 rounded-lg border border-white/25 bg-white/[0.08] text-white/80 transition hover:bg-white/20 disabled:opacity-25"
                    >
                      ‹
                    </button>
                    <span className="text-base font-bold text-white">
                      {MONTH_NAME[viewMonth.month]} {viewMonth.year}
                    </span>
                    <button
                      type="button"
                      disabled={!!allowedDates}
                      onClick={() =>
                        setViewMonth((v) =>
                          v.month === 11
                            ? { year: v.year + 1, month: 0 }
                            : { ...v, month: v.month + 1 },
                        )
                      }
                      className="h-9 w-9 rounded-lg border border-white/25 bg-white/[0.08] text-white/80 transition hover:bg-white/20 disabled:opacity-25"
                    >
                      ›
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center">
                    {WEEKDAYS.map((w) => (
                      <div key={w} className="pb-1 text-xs font-semibold text-white/40">
                        {w}
                      </div>
                    ))}

                    {grid.map((iso, i) => {
                      if (!iso) return <div key={`empty-${i}`} />;

                      const day = Number(iso.slice(-2));
                      const selected = dates.includes(iso);
                      const past = iso < todayISO;
                      const outOfPeriod = allowedDates ? !allowedDates.includes(iso) : false;
                      // Ngày thường không nhận ngày thuộc hai đợt lễ hội.
                      const isFestival = !allowedDates && festivalDates.has(iso);
                      const disabled = past || outOfPeriod || isFestival;

                      return (
                        <button
                          key={iso}
                          type="button"
                          disabled={disabled}
                          onClick={() => toggleDate(iso)}
                          title={
                            isFestival
                              ? "Ngày này thuộc đợt lễ hội, hãy chọn đợt tương ứng ở trên"
                              : undefined
                          }
                          className={[
                            "aspect-square rounded-lg text-sm font-semibold transition",
                            selected
                              ? "bg-amber-400 text-black shadow-[0_0_18px_rgba(251,191,36,.4)]"
                              : disabled
                                ? "cursor-not-allowed text-white/15"
                                : "text-white/80 hover:bg-white/10",
                          ].join(" ")}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>

                  {dates.length ? (
                    <div className="mt-3 border-t border-white/10 pt-3 text-sm text-white/70">
                      Đã chọn <b className="text-amber-300">{dates.length}</b> ngày:{" "}
                      {dates.map(formatVnDate).join(" · ")}
                    </div>
                  ) : null}
                </div>

                {errors.dates ? (
                  <p className="mt-2 text-sm text-red-400">{errors.dates}</p>
                ) : null}

                {/* phí điểm bay theo ngày hay theo tháng */}
                {showSiteFeeChoice ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {(["day", "month"] as SiteFeeMode[]).map((m) => (
                      <ChoiceCard
                        key={m}
                        active={siteFeeMode === m}
                        icon={m === "day" ? "☀️" : "📅"}
                        title={
                          m === "day"
                            ? `${formatVnd(SITE_FEE_PER_DAY)} / ngày`
                            : `${formatVnd(SITE_FEE_PER_MONTH)} / tháng`
                        }
                        desc={
                          m === "day"
                            ? "Trả theo đúng số ngày đã chọn"
                            : "Bằng đúng 7 ngày lẻ, bay thoải mái cả tháng"
                        }
                        onClick={() => setSiteFeeMode(m)}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Người nhà đi kèm — chỉ có ở đợt Mùa Vàng. */}
            {period === "mua_vang" ? (
              <div className="mt-6 rounded-2xl border border-white/20 bg-white/[0.10] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-[15px] font-bold text-white">
                      Người nhà đi kèm
                    </div>
                    <p className="mt-1 max-w-md text-sm leading-relaxed text-white/60">
                      {formatVnd(COMPANION_VND)}/người. Ăn ở cùng đoàn,{" "}
                      <b className="text-white/80">không có phòng riêng</b>.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCompanionCount((n) => Math.max(0, n - 1))}
                      className="h-11 w-11 rounded-xl border border-white/25 bg-white/[0.12] text-xl font-bold text-white transition hover:bg-white/20"
                      aria-label="Bớt một người"
                    >
                      −
                    </button>
                    <span className="w-10 text-center text-2xl font-extrabold text-amber-300">
                      {companionCount}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCompanionCount((n) =>
                          Math.min(MUA_VANG_MAX_COMPANIONS, n + 1),
                        )
                      }
                      className="h-11 w-11 rounded-xl border border-white/25 bg-white/[0.12] text-xl font-bold text-white transition hover:bg-white/20"
                      aria-label="Thêm một người"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Miễn phí điểm bay 26/8–4/9, chỉ cho phi công đã đăng ký VÀ thanh
                toán sự kiện Mùa Vàng. */}
            {period === "ngay_thuong" ? (
              <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/20 bg-white/[0.10] p-4 transition hover:border-amber-400/40">
                <input
                  type="checkbox"
                  checked={muaVangRegistered}
                  onChange={(e) => setMuaVangRegistered(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-white/30 accent-amber-400"
                />
                <span className="text-sm leading-relaxed text-white/80">
                  Tôi đã đăng ký <b>và thanh toán</b>{" "}
                  <b className="text-amber-300">Festival Bay trên mùa vàng 2026</b> —
                  được miễn phí điểm bay 10 ngày, từ 26/8 đến hết 4/9.
                  <span className="mt-1 block text-white/50">
                    Ban tổ chức đối chiếu lại khi bạn tới điểm bay.
                  </span>
                </span>
              </label>
            ) : null}

            {/* --- 5. phương tiện --- */}
            <div
              className="mt-9 scroll-mt-24"
              ref={(el) => {
                fieldRefs.current.motorType = el;
              }}
            >
              <SectionTitle
                step={5}
                title="Phương tiện"
                hint="Vui lòng khai báo cấp dù của bạn."
              />

              {motor ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {(["trike", "foot"] as MotorType[]).map((m) => (
                    <ChoiceCard
                      key={m}
                      active={motorType === m}
                      icon={m === "trike" ? "🛺" : "🎒"}
                      title={MOTOR_LABEL[m]}
                      desc=""
                      /* Xăng là thứ phi công bay máy lo nhất khi bay xa nhà:
                         đổ nhầm E10 pha cồn là hỏng chế hoà khí. Nói ngay
                         trong thẻ chọn máy chứ không giấu dưới ghi chú. */
                      highlight={
                        m === "trike"
                          ? "Chúng tôi có xăng A95, không phải lo xăng E10 — anh em yên tâm quạt máy"
                          : undefined
                      }
                      onClick={() => {
                        setMotorType(m);
                        setErrors((e) => ({ ...e, motorType: undefined }));
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-white/18 bg-white/[0.08] px-4 py-3 text-sm text-white/60">
                  Chọn loại hình có dù gắn động cơ ở bước 1 thì mục chọn máy sẽ hiện ra.
                </p>
              )}

              {errors.motorType ? (
                <p className="mt-2 text-sm text-red-400">{errors.motorType}</p>
              ) : null}

              <div className="mt-4">
                <span className="mb-2 block text-sm font-medium text-white/80">
                  Cấp dù — vui lòng khai báo
                </span>
                {/* Mỗi phi công bay một cánh dù, nên đây là chọn MỘT: bấm cấp
                    khác là đổi, bấm lại chính nó là bỏ chọn. Dù PPG đứng riêng
                    vì không xếp theo thang EN. */}
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
                        {wingClassLabel(w)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Nhắc sớm ngay khi chọn Mùa Vàng, chứ không đợi tới lúc đăng ký
                xong — phi công còn kịp lưu nhóm trước khi rời trang. */}
            {period === "mua_vang" ? (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-400/35 bg-sky-400/10 p-4">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-sky-300">
                    Sự kiện có nhóm Zalo riêng
                  </div>
                  <div className="mt-0.5 text-sm text-white/65">
                    Đăng ký xong nhớ vào nhóm để nhận lịch bay từng ngày.
                  </div>
                </div>
                <a
                  href={MUA_VANG_ZALO_GROUP}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 shrink-0 items-center rounded-lg bg-[#0068FF] px-4 text-sm font-bold text-white transition hover:brightness-110"
                >
                  Vào nhóm Zalo
                </a>
              </div>
            ) : null}

            {/* --- bảng phí --- */}
            {fee ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-9 rounded-2xl border border-amber-400/35 bg-amber-400/[0.08] p-5"
              >
                <div className="text-xs font-bold uppercase tracking-[.15em] text-amber-300">
                  Chi phí đăng ký
                </div>

                <div className="mt-3 space-y-2">
                  {fee.lines.map((line) => (
                    <div key={line.label} className="flex items-baseline justify-between gap-3">
                      <span className="text-sm text-white/85">{line.label}</span>
                      <span
                        className={`shrink-0 text-sm font-bold ${line.free ? "text-emerald-400" : "text-white"}`}
                      >
                        {line.free
                          ? line.freeLabel || "Miễn phí"
                          : formatVnd(line.amount)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-white/15 pt-3">
                  <span className="text-base font-bold text-white">Tổng cộng</span>
                  <span
                    className={`text-2xl font-extrabold ${fee.total > 0 ? "text-amber-300" : "text-emerald-400"}`}
                  >
                    {fee.total > 0 ? formatVnd(fee.total) : "Miễn phí"}
                  </span>
                </div>

                <p className="mt-2 text-sm leading-relaxed text-white/60">{fee.note}</p>

                {fee.total > 0 ? (
                  <div className="mt-3 border-t border-white/15 pt-3 text-sm leading-relaxed text-white/75">
                    Đăng ký chỉ được ghi nhận sau khi phi công chuyển khoản phí đăng ký.
                    <span className="mt-0.5 block font-semibold text-emerald-300">
                      Yên tâm — nếu huỷ lịch bay, bạn sẽ được hoàn tiền.
                    </span>
                  </div>
                ) : null}
              </motion.div>
            ) : (
              <div className="mt-9 rounded-2xl border border-white/18 bg-white/[0.08] p-5 text-sm text-white/60">
                Chọn loại hình bay và đợt bay để xem chi phí.
              </div>
            )}

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
                {submitting
                  ? "Đang gửi…"
                  : editCode
                    ? "Cập nhật đăng ký"
                    : "Xác nhận đăng ký"}
              </button>
              <p className="text-center text-xs leading-relaxed text-white/45">
                Thông tin đăng ký được gửi về ban tổ chức Mebayluon Paragliding.
                <br />
                Cần hỗ trợ, gọi <b className="text-white/70">0964 073 555</b> (Mr. Mỹ).
              </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
