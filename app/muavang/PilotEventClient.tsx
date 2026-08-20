"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useLanguage } from "@/contexts/language-context";
import { pilotDict } from "@/lib/i18n/pilot-event";
import {
  EVENT_PLACES,
  GUIDE_LINKS,
  MUA_VANG_CONTACTS,
  MUA_VANG_GALLERY,
  MUA_VANG_RADIO_FREQ,
  PAYMENT_ACCOUNT,
  COMPANION_VND,
  GALA_COMPANION_VND,
  MUA_VANG_COMBO_VND,
  MUA_VANG_MAX_COMPANIONS,
  MUA_VANG_MAX_PILOTS,
  OPENING_BY_PERIOD,
  MUA_VANG_ZALO_GROUP,
  PERIODS,
  SITE_FEE_PER_DAY,
  SITE_FEE_PER_MONTH,
  computePilotFee,
  WING_CLASSES,
  formatVnDate,
  formatVnd,
  hasMotor,
  wingClassLabel,
  SHIRT_SIZES,
  type ShirtSize,
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
  "emergencyPhone",
  "period",
  "dates",
  "motorType",
  "shirtSize",
] as const;

type ErrorKey = (typeof ERROR_ORDER)[number];

export default function PilotEventClient() {
  // Trang này dựng chữ từ lib/i18n/pilot-event chứ không viết thẳng vào JSX:
  // phi công nước ngoài đọc được, mà email nội bộ và Google Sheets vẫn tiếng
  // Việt vì chúng lấy nhãn từ lib/pilot-event.ts.
  const { language } = useLanguage();
  const T = pilotDict(language);

  const formRef = useRef<HTMLDivElement>(null);

  /**
   * Bóng đổ của tên sự kiện, dày hơn trên điện thoại.
   *
   * Khung hero trên máy nhỏ đã hạ thấp và bỏ phóng to nên nền sáng hơn hẳn;
   * chữ vàng đặt trên ruộng lúa vàng rất dễ chìm. drop-shadow không viết được
   * theo điểm ngắt của Tailwind nên phải chọn bằng JS.
   */
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const sync = () => setIsNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const heroTitleShadow = isNarrow
    ? "drop-shadow(0 2px 3px rgba(0,0,0,.95)) drop-shadow(0 4px 10px rgba(0,0,0,.9)) drop-shadow(0 10px 26px rgba(0,0,0,.85))"
    : "drop-shadow(0 2px 6px rgba(0,0,0,.85)) drop-shadow(0 10px 30px rgba(0,0,0,.75))";

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
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [supportPilotName, setSupportPilotName] = useState("");
  const [supportPilotPhone, setSupportPilotPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [club, setClub] = useState("");
  const [specialRequest, setSpecialRequest] = useState("");
  const [shirtSize, setShirtSize] = useState<ShirtSize | "">("");
  /** "Có đăng ký áo sự kiện không?" — CÓ mới hỏi cỡ; sau 17/8 áo tính 400k. */
  const [wantShirt, setWantShirt] = useState(false);
  const [openingFlagFlight, setOpeningFlagFlight] = useState(false);

  const [period, setPeriod] = useState<PeriodKey | "">("");
  const [dates, setDates] = useState<string[]>([]);
  const [viewMonth, setViewMonth] = useState({ year: 2026, month: 7 }); // tháng 8/2026

  const [motorType, setMotorType] = useState<MotorType | "">("");
  const [wingClass, setWingClass] = useState<WingClass | "">("");
  const [siteFeeMode, setSiteFeeMode] = useState<SiteFeeMode>("day");
  const [companionCount, setCompanionCount] = useState(0);
  /** Người nhà CHỈ dự Gala dinner — suất 400k, không ăn ở full lịch trình. */
  const [galaCompanionCount, setGalaCompanionCount] = useState(0);
  const [muaVangRegistered, setMuaVangRegistered] = useState(false);
  /** Phi công Mùa Vàng muốn bay thêm ngày ngoài ba ngày lễ hội. */
  const [wantExtraDays, setWantExtraDays] = useState(false);

  const [slots, setSlots] = useState<{
    remaining: number;
    taken: number;
    pilots: Array<{ name: string; kind: string }>;
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
  /** Ảnh đang xem phóng to trong bộ sưu tập; null = đang đóng. */
  const [lightbox, setLightbox] = useState<number | null>(null);
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

  useEffect(() => {
    if (lightbox === null) return;

    // Khoá cuộn nền và cho dùng bàn phím: mở ảnh to trên máy tính mà phải
    // rê chuột đi tìm nút mới chuyển được ảnh thì rất khó chịu.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight")
        setLightbox((n) => ((n ?? 0) + 1) % MUA_VANG_GALLERY.length);
      if (e.key === "ArrowLeft")
        setLightbox(
          (n) => ((n ?? 0) - 1 + MUA_VANG_GALLERY.length) % MUA_VANG_GALLERY.length,
        );
    };

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [lightbox]);

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
      galaCompanionCount,
      muaVangRegistered,
      openingFlagFlight,
      // Hỏi thẳng CÓ/KHÔNG — có áo thì sau hạn 17/8 tính 400k, không ngoại lệ
      wantShirt,
    });
  }, [
    period,
    flyingKind,
    dates,
    siteFeeMode,
    companionCount,
    galaCompanionCount,
    muaVangRegistered,
    openingFlagFlight,
    wantShirt,
  ]);

  // Chỉ ngày thường mới có phí điểm bay; hai đợt lễ hội không thu.
  const showSiteFeeChoice = period === "ngay_thuong";

  const validate = useCallback((): Errors => {
    const next: Errors = {};
    if (!fullName.trim()) next.fullName = T.err.name;
    if (!idNumber.trim()) next.idNumber = T.err.id;

    const digits = phone.replace(/\D/g, "");
    if (!phone.trim()) next.phone = T.err.phone;
    else if (digits.length < 8) next.phone = T.err.phoneBad;

    // SĐT khẩn cấp: bắt buộc với MỌI phi công — người nhà/bạn bay để gọi khi có sự cố
    const emgDigits = emergencyPhone.replace(/\D/g, "");
    if (!emergencyPhone.trim()) next.emergencyPhone = T.err.emergencyPhone;
    else if (emgDigits.length < 8) next.emergencyPhone = T.err.phoneBad;

    if (!dates.length) next.dates = T.err.dates;
    if (motor && !motorType) next.motorType = T.err.motor;
    // Bấm CÓ áo thì phải chọn cỡ — xưởng in không in được "cỡ gì cũng được"
    if (period === "mua_vang" && wantShirt && !shirtSize) next.shirtSize = T.err.shirtSize;
    return next;
  }, [fullName, idNumber, phone, emergencyPhone, dates.length, motor, motorType, period, wantShirt, shirtSize, T]);

  const submit = async () => {
    setServerError("");

    const found: Errors = {
      ...(flyingKind ? {} : { flyingKind: T.err.kind }),
      ...(period ? {} : { period: T.err.period }),
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
          emergencyPhone: emergencyPhone.trim(),
          supportPilotName: supportPilotName.trim(),
          supportPilotPhone: supportPilotPhone.trim(),
          email: email.trim(),
          address: address.trim(),
          club: club.trim(),
          specialRequest: specialRequest.trim(),
          shirtSize: wantShirt ? shirtSize : "",
          openingFlagFlight,
          flyingKind,
          period,
          dates,
          motorType: motor ? motorType : "",
          wingClass,
          siteFeeMode,
          companionCount,
          galaCompanionCount,
          muaVangRegistered,
          wantExtraDays,
          editCode,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setServerError(data?.message || T.errSubmit);
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
      setServerError(T.errNetwork);
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
            {T.okTitle}
          </motion.h1>

          <p className="mt-3 text-white/75">
            {T.okSubtitle}
          </p>

          <div className="mt-7 w-full rounded-2xl border border-amber-400/30 bg-amber-400/10 p-5">
            <div className="text-xs font-bold uppercase tracking-[.15em] text-amber-300">
              {T.okCode}
            </div>
            <div className="mt-1.5 font-mono text-3xl font-extrabold tracking-wider text-white">
              {result.code}
            </div>
          </div>

          {period && OPENING_BY_PERIOD[period] ? (
            <div className="mt-5 w-full rounded-2xl border-2 border-amber-400/60 bg-gradient-to-b from-amber-400/25 to-amber-400/5 px-5 py-4 text-center shadow-[0_0_30px_rgba(251,191,36,.22)]">
              <div className="text-xs font-bold uppercase tracking-[.15em] text-amber-300">
                🎬 {T.openingLabel}
              </div>
              <div className="mt-1 text-base font-extrabold text-white">
                {period === "mua_vang" ? T.openingMuaVang : T.openingCom}
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
              <div className="text-base font-bold text-sky-300">{T.zaloTitle}</div>
              <p className="mt-1.5 text-sm leading-relaxed text-white/70">
                {T.zaloDesc}
              </p>
              <a
                href={MUA_VANG_ZALO_GROUP}
                target="_blank"
                rel="noreferrer"
                className="cta-btn mt-4 inline-flex h-12 items-center rounded-xl bg-[#0068FF] px-6 text-base font-bold text-white transition hover:brightness-110"
              >
                {T.zaloBtn}
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
                {T.payTitle}
              </div>
              <div className="mt-1 text-center text-3xl font-extrabold text-amber-300">
                {formatVnd(result.feeTotal)}
              </div>

              <div className="mt-4 flex justify-center">
                {qrDataUrl ? (
                  <div className="rounded-2xl bg-white p-3 shadow-lg">
                    <img
                      src={qrDataUrl}
                      alt={T.altQr}
                      width={230}
                      height={230}
                      className="block h-[230px] w-[230px]"
                    />
                  </div>
                ) : (
                  <div className="flex h-[254px] w-[254px] items-center justify-center rounded-2xl bg-white/10 text-sm text-white/50">
                    {T.payMaking}
                  </div>
                )}
              </div>

              <p className="mt-3 text-center text-sm text-white/60">
                {T.payScanHint}
              </p>

              {/* Hai câu này quyết định việc phi công có chuyển tiền hay không,
                  nên đặt ngay dưới mã QR chứ không nhét xuống cuối trang. */}
              <div className="mt-3 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm leading-relaxed text-amber-100">
                {T.payNotice}
                <span className="mt-1 block text-emerald-300">{T.payRefund}</span>
              </div>

              <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-black/25 p-4 text-sm">
                {[
                  [T.payBank, PAYMENT_ACCOUNT.bankName],
                  [T.payAccount, PAYMENT_ACCOUNT.accountDisplay],
                  [T.payOwner, "Đặng Văn Mỹ"],
                  [T.payNote, result.transferNote],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-3">
                    <span className="shrink-0 text-white/50">{label}</span>
                    <span className="text-right font-semibold text-white">{value}</span>
                  </div>
                ))}
              </div>

              {paidDeclared ? (
                <div className="mt-4 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-center text-sm font-semibold text-emerald-300">
                  {T.payDone}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={declarePaid}
                  disabled={declaring}
                  className="cta-btn mt-4 h-13 w-full rounded-xl bg-emerald-500 py-3.5 text-base font-extrabold text-white transition hover:bg-emerald-400 disabled:opacity-60"
                >
                  {declaring ? T.payButtonBusy : T.payButton}
                </button>
              )}
            </motion.div>
          ) : (
            <div className="mt-6 w-full rounded-2xl border border-emerald-400/35 bg-emerald-400/10 p-5 text-center">
              <div className="text-lg font-bold text-emerald-300">
                {T.noFeeTitle}
              </div>
              <p className="mt-1 text-sm text-white/65">
                {T.noFeeDesc}
              </p>
            </div>
          )}

          <p className="mt-5 text-sm leading-relaxed text-white/60">
            {result.emailSent ? T.okEmailSent : T.okNoEmail}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="tel:+84964073555"
              className="cta-btn inline-flex h-12 items-center rounded-xl bg-amber-400 px-6 text-base font-bold text-black transition hover:bg-amber-300"
            >
              {T.callBtn}
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
              {T.editBtn}
            </button>

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

  /* ---------------- trang đăng ký ---------------- */
  const grid = monthGrid(viewMonth.year, viewMonth.month);

  return (
    <main className="relative">
      {/* ============ HERO ============ */}
      <section className="relative flex min-h-[52vh] items-center justify-center overflow-hidden sm:min-h-[68vh] lg:min-h-[86vh]">
        <div className="absolute inset-0">
          <Image
            src="/spots/khau-pha/hero.jpg"
            alt={T.altHero}
            fill
            priority
            className="object-cover brightness-[1.12] contrast-[1.05] saturate-[1.12] sm:scale-105"
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
        <div className="relative z-10 mx-auto max-w-6xl px-4 pb-8 pt-28 text-center sm:pb-16 sm:pt-[14vh] lg:pt-[18vh]">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-amber-300 backdrop-blur sm:gap-2 sm:px-4 sm:py-1.5 sm:text-[13px] sm:tracking-[.18em]"
          >
            {T.heroBadge}
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="mt-[7vh] sm:mt-[15vh] lg:mt-[22vh]"
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
              {T.heroWelcome}
            </span>

            {/* Tên sự kiện: chữ khối, nén chiều cao còn 83% cho ra dáng tít áp
                phích — béo và lùn. Không dùng viền bao quanh chữ; độ nổi lấy
                từ bóng đổ mềm phía sau, để nét chữ vẫn sạch.
                whitespace-nowrap giữ "Mùa Vàng 2026" không bị bẻ đôi. */}
            <span
              className="mt-3 block whitespace-nowrap pt-[0.12em] text-[clamp(2.5rem,10.2vw,6.5rem)] font-black uppercase leading-[1.12] tracking-[-0.03em] text-transparent"
              style={{
                fontFamily:
                  "'Arial Black','Helvetica Neue',Helvetica,Arial,sans-serif",
                transform: "scaleY(0.83)",
                transformOrigin: "center top",
                backgroundImage:
                  "linear-gradient(180deg,#FFFDF2 0%,#FDE68A 30%,#F59E0B 62%,#B45309 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                filter: heroTitleShadow,
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
            {T.heroPlace}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm"
          >
            {[
              { icon: "🌾", text: T.chipFestival },
              { icon: "🍚", text: T.chipCom },
              { icon: "⛰️", text: T.chipAltitude },
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
              {T.heroCta}
            </button>
            <p className="mt-3 text-sm text-white/55">
              {T.heroCtaNote}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ============ BA ĐỢT BAY ============ */}
      <section className="relative bg-[#0B0A08] py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center font-serif text-3xl font-bold text-white">
            {T.periodsTitle}
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-white/60">
            {T.periodsSubtitle}
          </p>

          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {[
              {
                key: "mua_vang" as const,
                icon: "🌾",
                dates: "29 – 31/08/2026",
                highlight: true,
                lines: [
                  T.openingMuaVang,
                  `${T.comboTitle.split("—")[0].trim()} ${formatVnd(MUA_VANG_COMBO_VND)}`,
                  ...T.muaVangLines,
                ],
              },
              {
                key: "le_hoi_com" as const,
                icon: "🍚",
                dates: "21 – 23/08/2026",
                highlight: false,
                lines: [T.openingCom, ...T.comLines],
              },
              {
                key: "ngay_thuong" as const,
                icon: "🗓️",
                dates: T.normalDates,
                highlight: false,
                lines: [
                  `${T.normalLines[2]} ${T.feeModeDay(formatVnd(SITE_FEE_PER_DAY))}`,
                  T.feeModeMonth(formatVnd(SITE_FEE_PER_MONTH)),
                  T.normalLines[0],
                  T.normalLines[1],
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
                    {T.periodName[card.key]}
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
              {T.discountText}
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
              {T.comboTitle} — {formatVnd(MUA_VANG_COMBO_VND)}
            </h3>
            <p className="mt-1 text-sm text-white/60">
              {T.comboSubtitle}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {T.comboItems.map((item) => (
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
            {T.placesTitle}
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-white/60">
            {T.placesSubtitle}
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
                      {T.placeRoles[i]}
                    </div>
                    <div className="mt-1 text-lg font-bold text-white">
                      {T.placeNames[i]}
                    </div>
                    <div className="mt-0.5 text-sm text-white/60">
                      {T.placeDetails[i]}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <a
                        href={place.mapUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-300 underline underline-offset-4 transition hover:text-amber-200"
                      >
                        📍 {T.viewMap}
                      </a>

                      {place.pageUrl ? (
                        <a
                          href={place.pageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/70 underline underline-offset-4 transition hover:text-white"
                        >
                          🏡 {T.viewHomestay}
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
            {T.guideTitle}
          </h2>
          <p className="mt-1.5 text-center text-sm text-white/55">
            {T.guideSubtitle}
          </p>

          {/* Dải chip một dòng thay cho lưới thẻ: đây là mục tham khảo, không
              nên chiếm chỗ của phần đăng ký ngay bên dưới. */}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {GUIDE_LINKS.map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                title={item.desc}
                className="group inline-flex items-center gap-1.5 rounded-full border border-white/18 bg-white/[0.06] px-3.5 py-2 text-[13px] font-medium text-white/80 transition-colors hover:border-amber-400/50 hover:bg-white/[0.12] hover:text-amber-200"
              >
                <span>{item.icon}</span>
                {T.guideLinks[i] ?? item.title}
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
                {editCode ? T.formTitleEdit : T.formTitle}
              </h2>
              <p className="mt-1 text-sm text-white/65">
                {editCode ? T.formSubtitleEdit(editCode) : T.formSubtitle}
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
              <SectionTitle step={1} title={T.step1} />
              <div className="grid gap-3 sm:grid-cols-3">
                {(["paragliding", "paramotor", "both"] as FlyingKind[]).map((k) => (
                  <ChoiceCard
                    key={k}
                    active={flyingKind === k}
                    icon={k === "paragliding" ? "🪂" : k === "paramotor" ? "🛩️" : "✨"}
                    title={T.kind[k]}
                    desc={k === "paragliding" ? T.kindParaDesc : ""}
                    highlight={
                      k === "paramotor" || k === "both" ? T.ppgPerk : undefined
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
              <SectionTitle step={2} title={T.step2} />
              <div className="grid gap-4 sm:grid-cols-2">
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
                    label={T.fId}
                    required
                    hint={T.fIdHint}
                    error={errors.idNumber}
                  >
                    <input
                      className={inputClass}
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      placeholder={T.fIdPh}
                    />
                  </Field>
                </div>

                <Field label={T.fNationality}>
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
                    placeholder={T.fNationality}
                  />
                </Field>

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
                    />
                  </Field>
                </div>

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

                {/* Phi công mới / diện giám sát bay khai người hỗ trợ tại đây —
                    lời giải thích nằm ngay dưới nhãn nên không bắt buộc với người khác */}
                <div className="sm:col-span-2">
                  <Field label={T.fSupportPilot}>
                    <p className="mb-2 text-xs leading-relaxed text-slate-500">
                      {T.fSupportPilotHint}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        className={inputClass}
                        value={supportPilotName}
                        onChange={(e) => setSupportPilotName(e.target.value)}
                        placeholder={T.fSupportPilotPh}
                      />
                      <input
                        className={inputClass}
                        value={supportPilotPhone}
                        inputMode="tel"
                        onChange={(e) => setSupportPilotPhone(e.target.value)}
                        placeholder={T.fSupportPilotPhonePh}
                      />
                    </div>
                  </Field>
                </div>

                <div className="sm:col-span-2">
                  <Field label={T.fEmail}>
                    <input
                      className={inputClass}
                      value={email}
                      type="email"
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={T.fEmailPh}
                    />
                  </Field>
                </div>

                <div className="sm:col-span-2">
                  <Field label={T.fAddress}>
                    <input
                      className={inputClass}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder={T.fAddressPh}
                    />
                  </Field>
                </div>

                <div className="sm:col-span-2">
                  <Field label={T.fClub}>
                    <input
                      className={inputClass}
                      value={club}
                      onChange={(e) => setClub(e.target.value)}
                      placeholder={T.fClubPh}
                    />
                  </Field>
                </div>

                {/* Cỡ áo hiện luôn, không chờ chọn đợt bay.
                    Áo chỉ có trong combo Mùa Vàng, nhưng đợt bay lại chọn ở
                    bước 3 — nằm DƯỚI khối này. Nếu để hiện theo điều kiện thì
                    ô mới nhảy ra ở chỗ phi công vừa cuộn qua và gần như chắc
                    chắn bị bỏ sót. Điều kiện nói rõ ở dòng chú thích. */}
                <div className="sm:col-span-2">
                  {/* HỎI CÓ/KHÔNG trước — CÓ mới hỏi cỡ. Sau 17/8 áo 400k, không ngoại lệ. */}
                  <Field label={T.fShirtAsk} hint={T.fShirtHint} error={errors.shirtSize}>
                    <div className="flex flex-wrap gap-2">
                      {[
                        [true, T.fShirtYes],
                        [false, T.fShirtNo],
                      ].map(([val, label]) => {
                        const on = wantShirt === val;
                        return (
                          <button
                            key={String(val)}
                            type="button"
                            onClick={() => {
                              setWantShirt(val as boolean);
                              if (!val) setShirtSize("");
                            }}
                            className={[
                              "h-11 rounded-xl border px-5 text-sm font-bold transition",
                              on
                                ? "border-amber-400 bg-amber-400 text-black"
                                : "border-white/25 bg-white/[0.12] text-white/85 hover:bg-white/20",
                            ].join(" ")}
                          >
                            {label as string}
                          </button>
                        );
                      })}
                    </div>
                    {wantShirt && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {SHIRT_SIZES.map((s) => {
                          const on = shirtSize === s;
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setShirtSize(on ? "" : s)}
                              className={[
                                "h-11 min-w-[62px] rounded-xl border px-4 text-sm font-bold transition",
                                on
                                  ? "border-amber-400 bg-amber-400 text-black"
                                  : "border-white/25 bg-white/[0.12] text-white/85 hover:bg-white/20",
                              ].join(" ")}
                            >
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </Field>
                </div>

                <div className="sm:col-span-2">
                  <Field label={T.fRequest} hint={T.fRequestHint}>
                    {/* Ô nhiều dòng: phi công hay viết vài câu (ăn chay, đi
                        cùng bạn, cần chỗ để xe, tới muộn…) chứ không phải một
                        cụm ngắn như các ô trên. */}
                    <textarea
                      className={`${inputClass} h-auto min-h-[88px] resize-y py-3 leading-relaxed`}
                      value={specialRequest}
                      maxLength={500}
                      onChange={(e) => setSpecialRequest(e.target.value)}
                      placeholder={T.fRequestPh}
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
              <SectionTitle step={3} title={T.step3} />
              <div className="grid gap-3">
                {(["mua_vang", "le_hoi_com", "ngay_thuong"] as PeriodKey[]).map((k) => (
                  <ChoiceCard
                    key={k}
                    active={period === k}
                    icon={k === "mua_vang" ? "🌾" : k === "le_hoi_com" ? "🍚" : "🗓️"}
                    title={T.periodName[k]}
                    desc={
                      PERIODS[k].dates.length
                        ? `${formatVnDate(PERIODS[k].dates[0])} – ${formatVnDate(
                            PERIODS[k].dates[PERIODS[k].dates.length - 1],
                          )} · ${T.periodNote[k]}`
                        : T.periodNote[k]
                    }
                    badge={k === "mua_vang" ? T.chipFestival.split("·")[0].trim() : undefined}
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
                    {T.openingLabel}
                  </span>
                  <span className="mt-0.5 block text-base font-extrabold leading-snug text-white">
                    {period === "mua_vang" ? T.openingMuaVang : T.openingCom}
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
                {/* Một câu duy nhất: đã có bao nhiêu người và còn bao nhiêu
                    chỗ. Trước đây là con số lớn kèm nhãn riêng, đọc phải ghép
                    hai mảnh mới hiểu. */}
                <div className="text-xs font-bold uppercase tracking-[.15em] text-amber-300">
                  {T.slotsLeft}
                </div>
                <div className="mt-1 text-[17px] font-bold leading-snug text-white sm:text-lg">
                  {T.slotsLine(slots.taken, slots.remaining, MUA_VANG_MAX_PILOTS)}
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
                      {T.slotsListTitle}
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
                              ? `· ${T.kindShort.paramotor}`
                              : p.kind === "both"
                                ? `· ${T.kindShort.both}`
                                : `· ${T.kindShort.paragliding}`}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : (
                  <div className="mt-4 border-t border-white/12 pt-4 text-sm text-white/50">
                    {T.slotsEmpty}
                  </div>
                )}

                {slots.taken >= MUA_VANG_MAX_PILOTS ? (
                  <div className="mt-4 rounded-xl border border-amber-400/45 bg-amber-400/15 px-4 py-3 text-sm font-semibold text-amber-200">
                    {T.slotsFullNote}
                  </div>
                ) : null}
              </motion.div>
            ) : null}

            {/* --- 4. lịch chọn ngày --- */}
            <div
              className="mt-9 scroll-mt-24"
              ref={(el) => {
                fieldRefs.current.dates = el;
              }}
            >
              <SectionTitle
                step={4}
                title={T.step4}
                hint={period ? T.hint[period] : ""}
              />

              {!period ? (
                <p className="rounded-xl border border-white/18 bg-white/[0.08] px-4 py-3 text-sm text-white/60">
                  {T.pickPeriodFirst}
                </p>
              ) : null}
            </div>

            {period ? (
              <div className="mt-6">

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
                      <b className="text-amber-300">{T.extraDaysLabel}</b>
                      <span className="mt-1 block text-white/60">{T.extraDaysNote}</span>
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
                      {T.months[viewMonth.month]} {viewMonth.year}
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
                    {T.weekdays.map((w) => (
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
                              ? T.festivalDateTip
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
                      {T.chosenDays(dates.length)} {dates.map(formatVnDate).join(" · ")}
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
                            ? T.feeModeDay(formatVnd(SITE_FEE_PER_DAY))
                            : T.feeModeMonth(formatVnd(SITE_FEE_PER_MONTH))
                        }
                        desc={
                          m === "day" ? T.feeModeDayDesc : T.feeModeMonthDesc
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
                      {T.companionTitle}
                    </div>
                    <p className="mt-1 max-w-md text-sm leading-relaxed text-white/60">
                      {T.companionDesc(formatVnd(COMPANION_VND))}{" "}
                      <b className="text-white/80">{T.companionNoRoom}</b>.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCompanionCount((n) => Math.max(0, n - 1))}
                      className="h-11 w-11 rounded-xl border border-white/25 bg-white/[0.12] text-xl font-bold text-white transition hover:bg-white/20"
                      aria-label={T.minusOne}
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
                      aria-label={T.plusOne}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Suất RIÊNG cho người nhà chỉ dự Gala dinner — rẻ hơn suất full */}
                <div className="mt-4 flex flex-wrap items-start justify-between gap-4 border-t border-white/10 pt-4">
                  <div className="min-w-0">
                    <div className="text-[15px] font-bold text-white">{T.galaTitle}</div>
                    <p className="mt-1 max-w-md text-sm leading-relaxed text-white/60">
                      {T.galaDesc(formatVnd(GALA_COMPANION_VND))}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setGalaCompanionCount((n) => Math.max(0, n - 1))}
                      className="h-11 w-11 rounded-xl border border-white/25 bg-white/[0.12] text-xl font-bold text-white transition hover:bg-white/20"
                      aria-label={T.minusOne}
                    >
                      −
                    </button>
                    <span className="w-10 text-center text-2xl font-extrabold text-amber-300">
                      {galaCompanionCount}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setGalaCompanionCount((n) => Math.min(MUA_VANG_MAX_COMPANIONS, n + 1))
                      }
                      className="h-11 w-11 rounded-xl border border-white/25 bg-white/[0.12] text-xl font-bold text-white transition hover:bg-white/20"
                      aria-label={T.plusOne}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Nhận bay PPG kéo cờ khai mạc thì được miễn toàn bộ phí sự kiện.
                Chỉ hỏi phi công có bay máy — dù lượn thường không kéo cờ được. */}
            {period === "mua_vang" && motor ? (
              <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 transition hover:border-amber-400/70">
                <input
                  type="checkbox"
                  checked={openingFlagFlight}
                  onChange={(e) => setOpeningFlagFlight(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-white/30 accent-amber-400"
                />
                <span className="text-sm leading-relaxed text-white/90">
                  <b className="text-amber-300">{T.flagFlight}</b>
                  <span className="mt-1 block text-white/60">
                    {T.flagFlightNote}
                  </span>
                </span>
              </label>
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
                  {T.muaVangCheckbox}
                  <span className="mt-1 block text-white/50">
                    {T.muaVangCheckboxNote}
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
                title={T.step5}
                hint={T.step5Hint}
              />

              {motor ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {(["trike", "foot"] as MotorType[]).map((m) => (
                    <ChoiceCard
                      key={m}
                      active={motorType === m}
                      icon={m === "trike" ? "🛺" : "🎒"}
                      title={T.motor[m]}
                      desc=""
                      /* Xăng là thứ phi công bay máy lo nhất khi bay xa nhà:
                         đổ nhầm E10 pha cồn là hỏng chế hoà khí. Nói ngay
                         trong thẻ chọn máy chứ không giấu dưới ghi chú. */
                      highlight={
                        m === "trike"
                          ? T.fuelPerk
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
                  {T.motorLocked}
                </p>
              )}

              {errors.motorType ? (
                <p className="mt-2 text-sm text-red-400">{errors.motorType}</p>
              ) : null}

              <div className="mt-4">
                <span className="mb-2 block text-sm font-medium text-white/80">
                  {T.wingLabel}
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
                        {w === "PPG" ? T.wingPpg : wingClassLabel(w)}
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
                    {T.zaloInlineTitle}
                  </div>
                  <div className="mt-0.5 text-sm text-white/65">
                    {T.zaloInlineDesc}
                  </div>
                </div>
                <a
                  href={MUA_VANG_ZALO_GROUP}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 shrink-0 items-center rounded-lg bg-[#0068FF] px-4 text-sm font-bold text-white transition hover:brightness-110"
                >
                  {T.zaloInlineBtn}
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
                  {T.feeTitle}
                </div>

                <div className="mt-3 space-y-2">
                  {fee.lines.map((line) => (
                    <div key={line.label} className="flex items-baseline justify-between gap-3">
                      <span className="text-sm text-white/85">
                        {T.fee[line.key](line.count ?? 0, formatVnd(SITE_FEE_PER_DAY))}
                      </span>
                      <span
                        className={`shrink-0 text-sm font-bold ${line.free ? "text-emerald-400" : "text-white"}`}
                      >
                        {line.free
                          ? line.freeLabel
                            ? T.feeFreePpg
                            : T.feeFree
                          : formatVnd(line.amount)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-white/15 pt-3">
                  <span className="text-base font-bold text-white">{T.feeTotal}</span>
                  <span
                    className={`text-2xl font-extrabold ${fee.total > 0 ? "text-amber-300" : "text-emerald-400"}`}
                  >
                    {fee.total > 0 ? formatVnd(fee.total) : T.feeFree}
                  </span>
                </div>

                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  {T.note[fee.noteKey]}
                </p>

                {/* Tự chuyển sang gói tháng thì phải nói rõ, kèm ngày hết hạn —
                    không thì khách tưởng mình vẫn đang trả theo ngày. */}
                {fee.monthFrom && fee.monthTo ? (
                  <div className="mt-3 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm font-semibold leading-relaxed text-emerald-200">
                    {T.monthNotice(
                      formatVnDate(fee.monthFrom),
                      formatVnDate(fee.monthTo),
                    )}
                  </div>
                ) : null}

                {fee.total > 0 ? (
                  <div className="mt-3 border-t border-white/15 pt-3 text-sm leading-relaxed text-white/75">
                    {T.payNotice}
                    <span className="mt-0.5 block font-semibold text-emerald-300">
                      {T.payRefund}
                    </span>
                  </div>
                ) : null}
              </motion.div>
            ) : (
              <div className="mt-9 rounded-2xl border border-white/18 bg-white/[0.08] p-5 text-sm text-white/60">
                {T.feeEmpty}
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
                {submitting ? T.submitting : editCode ? T.submitEdit : T.submit}
              </button>
              <p className="text-center text-xs leading-relaxed text-white/45">
                {T.submitFoot}
                <br />
                {T.needHelp} <b className="text-white/70">0964 073 555</b> (Mr. Mỹ).
              </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ BAN ĐIỀU HÀNH ============ */}
      <section className="relative bg-[#0B0A08] pb-14">
        <div className="mx-auto max-w-3xl px-4">
          {/* Gom cả tần số bộ đàm lẫn danh bạ vào MỘT khung: đây là bảng tra
              cứu khi có việc, không phải nội dung để đọc — càng gọn càng dễ
              liếc, và không đẩy phần đăng ký xuống xa. */}
          <div className="rounded-2xl border border-white/15 bg-white/[0.05] p-4 sm:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-white/12 pb-3">
              <h2 className="text-base font-bold text-white">{T.contactsTitle}</h2>
              <span className="text-sm text-white/60">
                📻 {T.radioLabel}:{" "}
                <b className="font-mono text-amber-300">{MUA_VANG_RADIO_FREQ}</b>
              </span>
            </div>

            <ul className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {MUA_VANG_CONTACTS.map((c) => (
                <li
                  key={c.roleKey}
                  className="flex items-baseline gap-2 text-[13px] leading-snug"
                >
                  <span className="shrink-0">{c.icon}</span>
                  <span className="min-w-0 flex-1 text-white/55">
                    {T.contactRole[c.roleKey]}
                  </span>
                  <span className="shrink-0 font-semibold text-white">{c.name}</span>
                  {c.phone ? (
                    <a
                      href={`tel:+84${c.phone.replace(/^0/, "")}`}
                      className="shrink-0 font-mono text-sky-300 underline underline-offset-2 transition hover:text-sky-200"
                    >
                      {c.phone}
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ============ BỘ SƯU TẬP ẢNH ============ */}
      <section className="relative bg-[#0B0A08] pb-24">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center font-serif text-2xl font-bold text-white sm:text-3xl">
            {T.galleryTitle}
          </h2>
          <p className="mt-1.5 text-center text-sm text-white/55">
            {T.gallerySubtitle}
          </p>

          {/* Lưới ô vuông: ảnh gốc mỗi tấm một tỉ lệ, để nguyên thì lưới so le
              rất rối. Bấm vào ảnh mới mở đúng khung hình đầy đủ. */}
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
            {MUA_VANG_GALLERY.map((src, i) => (
              <motion.button
                key={src}
                type="button"
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 8) * 0.04 }}
                onClick={() => setLightbox(i)}
                className="group relative aspect-square overflow-hidden rounded-xl border border-white/12 bg-white/[0.04]"
              >
                <Image
                  src={src}
                  alt={`${T.galleryTitle} ${i + 1}`}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* ---- ảnh phóng to ---- */}
      {lightbox !== null ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/92 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            aria-label={T.close}
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-2xl leading-none text-white transition hover:bg-white/20"
          >
            ×
          </button>

          <button
            type="button"
            aria-label={T.prevPhoto}
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(
                (n) => ((n ?? 0) - 1 + MUA_VANG_GALLERY.length) % MUA_VANG_GALLERY.length,
              );
            }}
            className="absolute left-3 flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-white/10 text-2xl text-white transition hover:bg-white/20 sm:left-6"
          >
            ‹
          </button>

          <button
            type="button"
            aria-label={T.nextPhoto}
            onClick={(e) => {
              e.stopPropagation();
              setLightbox((n) => ((n ?? 0) + 1) % MUA_VANG_GALLERY.length);
            }}
            className="absolute right-3 flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-white/10 text-2xl text-white transition hover:bg-white/20 sm:right-6"
          >
            ›
          </button>

          <div
            className="relative h-[80vh] w-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={MUA_VANG_GALLERY[lightbox]}
              alt={`${T.galleryTitle} ${lightbox + 1}`}
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />
          </div>

          <div className="absolute bottom-5 font-mono text-sm text-white/60">
            {lightbox + 1} / {MUA_VANG_GALLERY.length}
          </div>
        </div>
      ) : null}
    </main>
  );
}
