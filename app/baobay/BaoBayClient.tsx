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
 *
 * Bản tiếng Việt hiện KÈM tiếng Anh (chủ 30/09) qua `b()`/`s()` của
 * baoBayBilingual — mọi chữ đều lấy từ bảng, không viết thẳng vào JSX.
 */

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useLanguage } from "@/contexts/language-context";
import {
  BAO_BAY_BG,
  BAO_BAY_FEE_PER_DAY,
  BAO_BAY_FEE_PER_MONTH,
  BAO_BAY_FEE_PER_YEAR,
  BAO_BAY_SPOTS,
  BAO_BAY_SPOT_CONFIG,
  vnParts,
  VN_NATIONALITY,
  type BaoBayFee,
  type BaoBaySpot,
  type PurchaseMode,
} from "@/lib/bao-bay";
import { baoBayBilingual, type BaoBayDict, type BaoBayErrKey, type BiText } from "@/lib/i18n/bao-bay";
import {
  PAYMENT_ACCOUNT,
  WING_CLASSES,
  formatVnDate,
  formatVnd,
  wingClassLabel,
  type WingClass,
} from "@/lib/pilot-event";
import { buildVietQrPayload } from "@/lib/vietqr";

/**
 * Bảng dự báo dùng lại nguyên khối của trang điểm bay (/spots/…), nạp ĐỘNG:
 * mã của nó nặng (bảng giờ, biểu đồ, Skew-T, bản đồ Windy) mà phần lớn phi công
 * vào đây chỉ để báo bay — chỉ tải khi có người bấm mở dự báo.
 */
const SpotWeatherWidget = dynamic(
  () => import("@/components/weather/SpotWeather").then((m) => m.SpotWeatherWidget),
  { ssr: false, loading: () => <div className="rounded-2xl bg-white p-4 text-sm text-slate-500">⛅ …</div> },
);

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
 * Mảnh giao diện
 * ------------------------------------------------------------------ */

/**
 * Một câu hai thứ tiếng: chữ chính, tiếng Anh nhỏ và nhạt hơn.
 * `inline` = tiếng Anh trong ngoặc ngay sau (nhãn ngắn); mặc định xuống dòng.
 */
function Bi({ t, inline, subClass = "" }: { t: BiText; inline?: boolean; subClass?: string }) {
  if (!t.sub) return <>{t.main}</>;
  return inline ? (
    <>
      {t.main}
      <span className={`ml-1 text-[0.82em] font-normal opacity-60 ${subClass}`}>({t.sub})</span>
    </>
  ) : (
    <>
      {t.main}
      <span className={`mt-0.5 block text-[0.8em] font-normal leading-snug opacity-60 ${subClass}`}>{t.sub}</span>
    </>
  );
}

function SectionTitle({ step, title, hint }: { step: number; title: BiText; hint?: BiText }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-extrabold text-black">
        {step}
      </span>
      <div className="min-w-0">
        <h3 className="text-lg font-bold text-white">
          <Bi t={title} />
        </h3>
        {hint ? (
          <p className="mt-0.5 text-sm text-white/60">
            <Bi t={hint} />
          </p>
        ) : null}
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
  label: BiText;
  required?: boolean;
  hint?: BiText;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-white/80">
        <Bi t={label} inline />
        {required ? <span className="ml-1 text-amber-400">*</span> : null}
        {hint ? (
          <span className="mt-0.5 block text-xs font-normal text-white/50">
            <Bi t={hint} inline />
          </span>
        ) : null}
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
  icon,
  onClick,
}: {
  active: boolean;
  title: React.ReactNode;
  desc?: React.ReactNode;
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
        </span>
      </div>
    </button>
  );
}

/**
 * Nút mở/thu dự báo thời tiết của một điểm. Bấm MỘT lần là ra đủ bảng dự báo
 * (chủ 30/09: "có đủ mọi thứ"); chỉ khi mở mới nạp mã và gọi API thời tiết.
 */
function ForecastToggle({
  open,
  onToggle,
  label,
  closeLabel,
  slug,
  compact,
}: {
  open: boolean;
  onToggle: () => void;
  label: BiText;
  closeLabel: BiText;
  slug: string;
  compact?: boolean;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={[
          "flex w-full items-center justify-between gap-3 rounded-xl border text-left transition",
          compact ? "px-3.5 py-2.5" : "px-4 py-3",
          open
            ? "border-sky-300/60 bg-sky-400/15 text-sky-100"
            : "border-sky-300/35 bg-sky-400/[0.08] text-sky-100 hover:bg-sky-400/15",
        ].join(" ")}
      >
        <span className="min-w-0 text-sm font-bold">
          ⛅ <Bi t={open ? closeLabel : label} />
        </span>
        <span className={`shrink-0 text-lg transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>
      {/* Khối dự báo nền trắng — trên nền tối của trang nó đọc như một tờ bảng
          riêng, giữ nguyên màu cảnh báo gió/mây mà phi công đã quen ở /spots. */}
      {open ? (
        <div className="mt-2 text-slate-900">
          <SpotWeatherWidget slug={slug} />
        </div>
      ) : null}
    </div>
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
  nationality?: string;
};

type MemberState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "ok"; member: MemberView }
  | { status: "wrong" }
  | { status: "rate" };

const ERROR_ORDER = ["spot", "dates", "fullName", "nationality", "idNumber", "phone", "emergencyPhone"] as const;
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
  nationality: "nationality",
};

const SUPPORT_PHONE = "0964 073 555";
const SUPPORT_TEL = "tel:+84964073555";

const SPOT_ICON: Record<BaoBaySpot, string> = { "vien-nam": "🏞️", "khau-pha": "🌾", "quan-ba": "⛰️" };

export default function BaoBayClient() {
  const { language } = useLanguage();
  const { T, b, s } = baoBayBilingual(language);

  /** Lỗi theo mã (máy chủ trả về) → câu đúng ngôn ngữ; mã lạ thì null. */
  const errText = (code: string): string | null =>
    code in T.err ? s((d) => d.err[code as BaoBayErrKey]) : null;

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

  /**
   * Chọn sẵn NÚI VIÊN NAM (chủ 30/09): phần lớn báo bay là ở đây, và ô mã hội
   * viên HNAA — thứ phi công Viên Nam cần đầu tiên — hiện ra ngay khi mở trang.
   */
  const [spot, setSpot] = useState<BaoBaySpot | "">("vien-nam");
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
  /**
   * NGƯỜI VIỆT / NGƯỜI NƯỚC NGOÀI (chủ 30/09): người nước ngoài bắt buộc khai
   * quốc tịch và ô giấy tờ đổi thành số hộ chiếu. Người Việt lưu "Việt Nam".
   */
  const [foreigner, setForeigner] = useState(false);
  const [nationality, setNationality] = useState("");
  const [phone, setPhone] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [wingClass, setWingClass] = useState<WingClass | "">("");
  const [licence, setLicence] = useState("");
  const [note, setNote] = useState("");

  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /** Dự báo đang mở: dưới ô chọn điểm (điểm đang chọn) và ở khối "3 điểm bay". */
  const [forecastSelectedOpen, setForecastSelectedOpen] = useState(false);
  const [forecastOpen, setForecastOpen] = useState<Partial<Record<BaoBaySpot, boolean>>>({});

  const [quote, setQuote] = useState<{ loading: boolean; fee: BaoBayFee | null; paymentNote: string; error: string }>({
    loading: false,
    fee: null,
    paymentNote: "",
    error: "",
  });

  /** Phi công tự tích "Tôi đã thanh toán phí báo bay" — bắt buộc khi phải trả tiền. */
  const [paidConfirmed, setPaidConfirmed] = useState(false);
  const [payQr, setPayQr] = useState("");

  /** Ai đã báo bay HÔM NAY ở điểm đang chọn (chỉ số người + tên gọn). */
  const [todayList, setTodayList] = useState<{ spot: BaoBaySpot; count: number; names: string[] } | null>(null);

  const [result, setResult] = useState<{
    code: string;
    spot: BaoBaySpot;
    dates: string[];
    fee: BaoBayFee;
    transferNote: string;
  } | null>(null);

  const cfg = spot ? BAO_BAY_SPOT_CONFIG[spot] : null;
  const hnaaSpot = Boolean(cfg?.hnaa);
  /** Hội viên đã xác nhận VÀ đang ở điểm bay có thoả thuận HNAA. */
  const verifiedMember = hnaaSpot && memberState.status === "ok" ? memberState.member : null;

  const loadToday = useCallback(async (sp: BaoBaySpot) => {
    try {
      const res = await fetch(`/api/bao-bay/today?spot=${sp}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        setTodayList({ spot: sp, count: Number(data.count) || 0, names: Array.isArray(data.names) ? data.names : [] });
      }
    } catch {
      /* Chỉ là dòng thông tin phụ — lỗi mạng thì thôi không hiện. */
    }
  }, []);

  useEffect(() => {
    if (spot) void loadToday(spot);
  }, [spot, loadToday]);

  // Điểm bay không bán vé năm thì hạ lựa chọn về theo ngày
  useEffect(() => {
    if (cfg && !cfg.purchaseModes.includes(purchase)) setPurchase("day");
  }, [cfg, purchase]);

  const selectSpot = (sp: BaoBaySpot) => {
    setSpot(sp);
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
        const m = data.member as MemberView;
        setMemberState({ status: "ok", member: m });
        // Bảng hội có cột quốc tịch khác Việt Nam → điền sẵn "người nước ngoài"
        if (m.nationality && !/^vi[eệ]t ?nam$/i.test(m.nationality)) {
          setForeigner(true);
          setNationality(m.nationality);
        }
        setErrors((e) => ({ ...e, fullName: undefined, idNumber: undefined, phone: undefined, emergencyPhone: undefined }));
      } else if (res.status === 429) {
        setMemberState({ status: "rate" });
      } else {
        setMemberState({ status: "wrong" });
      }
    } catch {
      setMemberState({ status: "idle" });
      setServerError(s((d) => d.err.network));
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
  const quoteKey = JSON.stringify([
    spot,
    dates,
    purchase,
    verifiedMember?.code ?? "",
    idNumber.trim(),
    phone.trim(),
    fullName.trim(),
  ]);

  useEffect(() => {
    if (!spot || !dates.length) {
      setQuote({ loading: false, fee: null, paymentNote: "", error: "" });
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
            fullName: fullName.trim(),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        if (res.ok && data?.ok) {
          setQuote({
            loading: false,
            fee: data.fee as BaoBayFee,
            paymentNote: String(data.paymentNote || ""),
            error: "",
          });
        } else {
          const code = String(data?.code || "server");
          // Mã hội viên vừa bị admin tắt giữa chừng → quay về nhập tay
          if (code === "memberInvalid") setMemberState({ status: "wrong" });
          setQuote({ loading: false, fee: null, paymentNote: "", error: errText(code) ?? s((d) => d.err.server) });
        }
      } catch {
        if (alive) setQuote({ loading: false, fee: null, paymentNote: "", error: s((d) => d.err.network) });
      }
    }, 450);

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
    // quoteKey gom đủ mọi thứ ảnh hưởng tới phí
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey]);

  /* ---------------- trả tiền TRƯỚC khi gửi ---------------- */

  const payTotal = quote.fee?.total ?? 0;
  /** Tổng 0 đ (HNAA trước 8h, vé còn hạn…) thì bỏ qua hẳn bước trả tiền. */
  const needsPay = payTotal > 0;

  /**
   * Đổi điểm/ngày/cách trả/mã hội viên (hay bất cứ gì làm đổi số tiền hoặc nội
   * dung chuyển khoản) thì QR vẽ lại và ô "đã thanh toán" BỎ TÍCH — tích từ
   * trước là tích cho một khoản khác.
   */
  const payKey = JSON.stringify([
    payTotal,
    quote.paymentNote,
    spot,
    dates,
    purchase,
    verifiedMember?.code ?? "",
  ]);
  useEffect(() => {
    setPaidConfirmed(false);
  }, [payKey]);

  useEffect(() => {
    if (!needsPay || !quote.paymentNote) {
      setPayQr("");
      return;
    }
    let alive = true;
    (async () => {
      const payload = buildVietQrPayload({
        bankBin: PAYMENT_ACCOUNT.bankBin,
        accountNumber: PAYMENT_ACCOUNT.accountNumber,
        amount: payTotal,
        note: quote.paymentNote,
      });
      const QRCode = (await import("qrcode")).default;
      const url = await QRCode.toDataURL(payload, {
        width: 640,
        margin: 1,
        errorCorrectionLevel: "M",
        color: { dark: "#0B0A08", light: "#FFFFFF" },
      });
      if (alive) setPayQr(url);
    })().catch(() => {
      /* Không vẽ được thì phi công vẫn chuyển khoản tay theo số hiện bên cạnh. */
    });
    return () => {
      alive = false;
    };
  }, [needsPay, payTotal, quote.paymentNote]);

  /* ---------------- gửi báo bay ---------------- */

  const validate = (): Errors => {
    const next: Errors = {};
    const err = (pick: (d: BaoBayDict) => string) => s(pick);
    if (!spot) next.spot = err((d) => d.err.spot);
    if (!dates.length) next.dates = err((d) => d.err.dates);

    // Hội viên: chỉ kiểm những ô danh sách hội còn thiếu
    const needName = !verifiedMember;
    const needId = !verifiedMember || verifiedMember.needId;
    const needPhone = !verifiedMember || verifiedMember.needPhone;
    const needEmg = !verifiedMember || verifiedMember.needEmergencyPhone;

    if (needName && !fullName.trim()) next.fullName = err((d) => d.err.name);
    if (foreigner && (!nationality.trim() || /^vi[eệ]t ?nam$/i.test(nationality.trim()))) {
      next.nationality = err((d) => d.err.nationality);
    }
    if (needId && !idNumber.trim()) next.idNumber = err((d) => d.err.id);
    if (needPhone) {
      if (!phone.trim()) next.phone = err((d) => d.err.phone);
      else if (phone.replace(/\D/g, "").length < 8) next.phone = err((d) => d.err.phoneBad);
    }
    if (needEmg) {
      if (!emergencyPhone.trim()) next.emergencyPhone = err((d) => d.err.emergencyPhone);
      else if (emergencyPhone.replace(/\D/g, "").length < 8) next.emergencyPhone = err((d) => d.err.phoneBad);
    }
    return next;
  };

  const submit = async () => {
    setServerError("");
    // Nút đã khoá khi chưa tích, đây chỉ là chốt thứ hai
    if (needsPay && !paidConfirmed) {
      setServerError(s((d) => d.payConfirmFirst));
      return;
    }
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
          foreigner,
          nationality: foreigner ? nationality.trim() : VN_NATIONALITY,
          paidConfirmed: needsPay ? paidConfirmed : false,
          expectedAmount: payTotal,
          wingClass,
          licence: licence.trim(),
          note: note.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        const code = String(data?.code || "server");
        if (code === "memberInvalid") setMemberState({ status: "wrong" });
        /**
         * Phí vừa đổi lúc gửi (vd. qua 8h00): máy chủ trả số mới — vẽ lại QR theo
         * số đó, ô "đã thanh toán" tự bỏ tích (payKey đổi), phi công trả thêm.
         */
        if (code === "amountChanged" && data?.fee) {
          setQuote({
            loading: false,
            fee: data.fee as BaoBayFee,
            paymentNote: String(data.paymentNote || ""),
            error: "",
          });
          setPaidConfirmed(false);
        }
        const field = SERVER_ERR_FIELD[code as BaoBayErrKey];
        const msg = errText(code) ?? data?.message ?? s((d) => d.err.server);
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
      if (data.spot) void loadToday(data.spot as BaoBaySpot);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setServerError(s((d) => d.err.network));
    } finally {
      setSubmitting(false);
    }
  };


  /* ---------------- bảng phí (dùng chung cho phiếu và màn kết quả) ---------------- */

  // Hàm vẽ chứ không phải component con: khai component trong thân component
  // là mỗi lần gõ phím React dựng lại cả khối từ đầu.
  const feeBox = (fee: BaoBayFee) => (
    <div className="rounded-2xl border border-amber-400/35 bg-amber-400/[0.08] p-5">
      <div className="text-xs font-bold uppercase tracking-[.15em] text-amber-300">
        <Bi t={b((d) => d.feeTitle)} inline />
      </div>
      <div className="mt-3 space-y-2.5">
        {fee.lines.map((line) => (
          <div key={`${line.key}-${line.dates.join()}`} className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-white/85">
              <Bi t={b((d) => d.feeLine[line.key](line.dates.length))} />
              {line.key === "month" || line.key === "year" ? (
                <span className="block text-white/55">
                  {formatVnDate(fee.passFrom ?? "")} – {formatVnDate(fee.passValidUntil ?? "")}
                </span>
              ) : null}
            </span>
            <span className={`shrink-0 text-right text-sm font-bold ${line.amount ? "text-white" : "text-emerald-400"}`}>
              {line.amount ? formatVnd(line.amount) : <Bi t={b((d) => d.feeFree)} />}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-white/15 pt-3">
        <span className="text-base font-bold text-white">
          <Bi t={b((d) => d.feeTotal)} inline />
        </span>
        <span className={`text-right text-2xl font-extrabold ${fee.total > 0 ? "text-amber-300" : "text-emerald-400"}`}>
          {fee.total > 0 ? formatVnd(fee.total) : <Bi t={b((d) => d.feeFree)} />}
        </span>
      </div>

      {fee.coveredByPass ? (
        <div className="mt-3 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-200">
          🎫 <Bi t={b((d) => d.passNotice(formatVnDate(fee.coveredByPass?.until ?? "")))} />
        </div>
      ) : null}
      {fee.passFrom && fee.passValidUntil ? (
        <div className="mt-3 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm leading-relaxed text-emerald-200">
          <Bi t={b((d) => d.newPassNotice(formatVnDate(fee.passFrom ?? ""), formatVnDate(fee.passValidUntil ?? "")))} />
        </div>
      ) : null}
      {fee.autoMonth ? (
        <p className="mt-2 text-sm text-amber-200">
          <Bi t={b((d) => d.autoMonthNotice)} />
        </p>
      ) : null}
      {fee.hnaaLateDates.length ? (
        <div className="mt-3 rounded-xl border border-amber-400/45 bg-amber-400/15 px-4 py-3 text-sm leading-relaxed text-amber-100">
          ⏰ <Bi t={b((d) => d.hnaaLateNotice)} />
        </div>
      ) : null}
    </div>
  );

  /** Dòng "Hôm nay đã có N phi công báo bay: 1. N.G. Ngọc; 2. …". */
  const todayBox = (list: { count: number; names: string[] }) => (
    <div className="rounded-xl border border-white/15 bg-white/[0.07] px-4 py-3 text-sm leading-relaxed text-white/80">
      {list.count ? (
        <>
          <span className="font-bold text-white">
            👥 <Bi t={b((d) => d.todayTitle(list.count))} />
          </span>
          <span className="mt-1 block text-white/75">
            {/* Mỗi tên một khối không ngắt dòng — "L.T. Bay" không bị bẻ đôi */}
            {list.names.map((n, i) => (
              <span key={i} className="whitespace-nowrap">
                {i + 1}. {n}
                {i < list.names.length - 1 ? "; " : ""}{" "}
              </span>
            ))}
          </span>
        </>
      ) : (
        <span className="text-white/60">
          👥 <Bi t={b((d) => d.todayNone)} />
        </span>
      )}
    </div>
  );

  /** Tài khoản nhận tiền — cùng tài khoản /muavang (PAYMENT_ACCOUNT). */
  const payRows = (note: string) => (
    <div className="space-y-2 rounded-xl border border-white/10 bg-black/25 p-4 text-sm">
      {(
        [
          [b((d) => d.payBank), PAYMENT_ACCOUNT.bankName],
          [b((d) => d.payAccount), PAYMENT_ACCOUNT.accountDisplay],
          [b((d) => d.payOwner), "Đặng Văn Mỹ"],
          [b((d) => d.payNote), note],
        ] as Array<[BiText, string]>
      ).map(([label, value]) => (
        <div key={label.main} className="flex items-start justify-between gap-3">
          <span className="shrink-0 text-white/50">
            <Bi t={label} />
          </span>
          <span className="break-words text-right font-semibold text-white [overflow-wrap:anywhere]">{value}</span>
        </div>
      ))}
    </div>
  );

  /* ---------------- màn hình báo bay thành công ---------------- */
  if (result) {
    return (
      <main className="relative min-h-screen">
        <div className="absolute inset-0">
          <Image src={BAO_BAY_BG} alt="" fill priority className="object-cover brightness-[1.05]" />
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
            <Bi t={b((d) => d.okTitle)} subClass="font-sans text-lg" />
          </h1>
          <p className="mt-3 text-white/75">
            <Bi t={b((d) => d.okSubtitle)} />
          </p>

          <div className="mt-7 w-full rounded-2xl border border-amber-400/30 bg-amber-400/10 p-5">
            <div className="text-xs font-bold uppercase tracking-[.15em] text-amber-300">
              <Bi t={b((d) => d.okCode)} inline />
            </div>
            <div className="mt-1.5 font-mono text-3xl font-extrabold tracking-wider text-white">{result.code}</div>
            <div className="mt-4 space-y-2 border-t border-white/10 pt-3 text-left text-sm">
              <div className="flex justify-between gap-3">
                <span className="shrink-0 text-white/55">
                  <Bi t={b((d) => d.okSpot)} />
                </span>
                <span className="text-right font-semibold text-white">
                  <Bi t={b((d) => d.spotName[result.spot])} />
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="shrink-0 text-white/55">
                  <Bi t={b((d) => d.okDates)} />
                </span>
                <span className="text-right font-semibold text-white">{result.dates.map(formatVnDate).join(" · ")}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="shrink-0 text-white/55">
                  <Bi t={b((d) => d.step4)} />
                </span>
                <span className="text-right font-semibold text-amber-200">
                  <Bi t={b((d) => d.okFeeMode[result.fee.feeMode])} />
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 w-full text-left">{feeBox(result.fee)}</div>

          {/* Tiền đã trả TRƯỚC khi gửi (chủ 30/09) nên ở đây không còn QR — chỉ
              báo đã nhận và đang chờ ban điều phối đối chiếu chuyển khoản. */}
          {result.fee.total > 0 ? (
            <div className="mt-5 w-full rounded-2xl border border-amber-400/35 bg-amber-400/10 p-5 text-center">
              <div className="text-lg font-bold text-amber-200">
                ⏳ <Bi t={b((d) => d.okPendingPay)} />
              </div>
              <div className="mt-1 text-2xl font-extrabold text-amber-300">{formatVnd(result.fee.total)}</div>
              <p className="mt-1 text-sm text-white/65">
                <Bi t={b((d) => d.okPendingPayDesc)} />
              </p>
              {result.transferNote ? (
                <p className="mt-2 break-all text-xs text-white/50">
                  <Bi t={b((d) => d.payNote)} inline />: <span className="font-mono">{result.transferNote}</span>
                </p>
              ) : null}
            </div>
          ) : (
            <div className="mt-5 w-full rounded-2xl border border-emerald-400/35 bg-emerald-400/10 p-5 text-center">
              <div className="text-lg font-bold text-emerald-300">
                <Bi t={b((d) => d.noFeeTitle)} />
              </div>
              <p className="mt-1 text-sm text-white/65">
                <Bi t={b((d) => d.noFeeDesc)} />
              </p>
            </div>
          )}

          {todayList && todayList.spot === result.spot ? (
            <div className="mt-5 w-full text-left">{todayBox(todayList)}</div>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href={SUPPORT_TEL}
              className="cta-btn inline-flex min-h-12 flex-col items-center justify-center rounded-xl bg-amber-400 px-6 py-2 text-base font-bold text-black transition hover:bg-amber-300"
            >
              <Bi t={b((d) => d.callBtn)} />
            </a>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex min-h-12 flex-col items-center justify-center rounded-xl border border-white/25 bg-white/10 px-6 py-2 text-base font-medium text-white transition hover:bg-white/20"
            >
              <Bi t={b((d) => d.againBtn)} />
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

  const priceUnits = (sp: BaoBaySpot) =>
    BAO_BAY_SPOT_CONFIG[sp].purchaseModes.map((m) => ({ m, t: b((d) => d.priceShort[m]) }));

  return (
    <main className="relative">
      {/* ============ HERO (gọn hơn /muavang — phi công vào đây để báo bay, không để đọc) ============ */}
      <section className="relative flex min-h-[46vh] items-end justify-center overflow-hidden sm:min-h-[56vh]">
        <div className="absolute inset-0">
          <Image
            src={BAO_BAY_BG}
            alt={s((d) => d.altHero)}
            fill
            priority
            className="object-cover brightness-[1.08] saturate-[1.1]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/20 to-[#0B0A08]" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-4 pb-10 pt-28 text-center">
          <span className="inline-flex items-center rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[.14em] text-amber-300 backdrop-blur sm:text-[13px]">
            🪂 {s((d) => d.heroBadge.replace(/^🪂\s*/, ""))}
          </span>
          <h1
            className="mt-5 font-serif text-5xl font-extrabold text-white sm:text-6xl"
            style={{ textShadow: "0 2px 6px rgba(0,0,0,.85), 0 10px 30px rgba(0,0,0,.7)" }}
          >
            <Bi t={b((d) => d.heroTitle)} subClass="mt-1 font-sans text-lg tracking-wide opacity-80" />
          </h1>
          <p
            className="mt-3 text-base font-semibold uppercase tracking-[.12em] text-white/90 sm:text-lg"
            style={{ textShadow: "0 2px 12px rgba(0,0,0,.7)" }}
          >
            <Bi t={b((d) => d.heroPlaces)} subClass="normal-case tracking-normal" />
          </p>
          <p className="mt-2 text-sm text-white/70">
            <Bi t={b((d) => d.heroNote)} />
          </p>
          <button
            type="button"
            onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="cta-btn mt-7 inline-flex flex-col items-center rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 px-8 py-3 text-base font-extrabold text-black shadow-[0_10px_40px_rgba(251,191,36,.35)] transition hover:brightness-110"
          >
            <Bi t={b((d) => d.heroCta)} />
          </button>
        </div>
      </section>

      {/* ============ PHIẾU BÁO BAY ============ */}
      <section className="relative bg-[#0B0A08] pb-12 pt-6">
        <div ref={formRef} className="mx-auto max-w-3xl scroll-mt-20 px-4">
          <div className="overflow-hidden rounded-3xl border-2 border-amber-400/50 bg-[#28344A] shadow-[0_0_70px_rgba(251,191,36,.22),0_24px_60px_rgba(0,0,0,.55)]">
            <div className="border-b border-white/15 bg-gradient-to-r from-amber-400/30 via-amber-400/15 to-transparent px-5 py-5 sm:px-7">
              <h2 className="font-serif text-2xl font-bold text-white sm:text-3xl">
                <Bi t={b((d) => d.formTitle)} subClass="font-sans text-base" />
              </h2>
              <p className="mt-1 text-sm text-white/65">
                <Bi t={b((d) => d.formSubtitle)} />
              </p>
            </div>

            <div className="p-4 sm:p-7">
              {/* --- 1. điểm bay: KIỂU NÚT RADIO, ba thẻ MỘT HÀNG kể cả trên điện
                  thoại (chủ 30/09) — thẻ phải gọn: chấm radio trên cùng, tên,
                  vùng, giá ngắn; nhãn HNAA thu thành tag nhỏ. --- */}
              <div
                className="scroll-mt-24"
                ref={(el) => {
                  fieldRefs.current.spot = el;
                }}
              >
                <SectionTitle step={1} title={b((d) => d.step1)} />
                <div role="radiogroup" className="grid grid-cols-3 gap-2 sm:gap-3">
                  {BAO_BAY_SPOTS.map((sp) => {
                    const on = spot === sp;
                    return (
                      <button
                        key={sp}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => selectSpot(sp)}
                        className={[
                          "flex min-w-0 flex-col items-center rounded-2xl border px-1.5 pb-3 pt-2.5 text-center transition-all sm:px-3",
                          on
                            ? "border-amber-400 bg-amber-400/20 shadow-[0_0_0_1px_rgba(251,191,36,.5)]"
                            : "border-white/20 bg-white/[0.10] hover:border-white/35 hover:bg-white/[0.15]",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "flex h-5 w-5 items-center justify-center rounded-full border-2",
                            on ? "border-amber-400" : "border-white/45",
                          ].join(" ")}
                        >
                          {on ? <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> : null}
                        </span>
                        <span className="mt-1.5 text-lg leading-none">{SPOT_ICON[sp]}</span>
                        <span
                          className={`mt-1 text-[13px] font-bold leading-tight sm:text-[15px] ${on ? "text-amber-300" : "text-white"}`}
                        >
                          <Bi t={b((d) => d.spotName[sp])} subClass="text-[10px] sm:text-xs" />
                        </span>
                        <span className="mt-1 text-[11px] leading-tight text-white/55 sm:text-xs">
                          <Bi t={b((d) => d.spotArea[sp])} subClass="text-[10px]" />
                        </span>
                        <span className="mt-1.5 space-y-0.5 text-[11px] font-semibold leading-tight text-white/80 sm:text-xs">
                          {priceUnits(sp).map(({ m, t }) => (
                            <span key={m} className="block">
                              {t.main}
                            </span>
                          ))}
                        </span>
                        {BAO_BAY_SPOT_CONFIG[sp].hnaa ? (
                          <span className="mt-1.5 rounded-md bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-bold leading-tight text-emerald-300 ring-1 ring-emerald-400/40">
                            <Bi t={b((d) => d.hnaaTag)} subClass="text-[9px]" />
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                {errors.spot ? <p className="mt-2 text-sm text-red-400">{errors.spot}</p> : null}

                {/* Ai đã báo bay HÔM NAY ở điểm này (chủ 30/09) — chỉ tên gọn */}
                {spot && todayList && todayList.spot === spot ? <div className="mt-3">{todayBox(todayList)}</div> : null}

                {/* Dự báo của ĐIỂM ĐANG CHỌN, ngay dưới ô chọn: phi công chọn điểm
                    xong là hỏi "mai bay được không" trước khi chọn ngày. */}
                {spot ? (
                  <div className="mt-3">
                    <ForecastToggle
                      key={spot}
                      open={forecastSelectedOpen}
                      onToggle={() => setForecastSelectedOpen((x) => !x)}
                      label={b((d) => d.forecastOpen(d.spotName[spot]))}
                      closeLabel={b((d) => d.forecastClose)}
                      slug={BAO_BAY_SPOT_CONFIG[spot].weatherSlug}
                    />
                  </div>
                ) : null}
              </div>

              {/* --- 2. ngày bay --- */}
              <div
                className="mt-9 scroll-mt-24"
                ref={(el) => {
                  fieldRefs.current.dates = el;
                }}
              >
                <SectionTitle step={2} title={b((d) => d.step2)} hint={b((d) => d.step2Hint)} />
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
                    <span className="text-center text-base font-bold text-white">
                      <Bi
                        t={b((d) => `${d.months[viewMonth.month]} ${viewMonth.year}`)}
                        subClass="text-xs"
                      />
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
                    {T.weekdays.map((w, i) => (
                      <div key={w} className="pb-1 text-xs font-semibold text-white/40">
                        {w}
                        {/* Thứ tiếng Anh viết tắt dưới thứ tiếng Việt (T2/Mo) */}
                        <Bi t={{ main: "", sub: b((d) => d.weekdays[i]).sub }} subClass="text-[9px]" />
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
                      <Bi t={b((d) => d.chosenDays(dates.length))} inline /> {dates.map(formatVnDate).join(" · ")}
                    </div>
                  ) : null}
                </div>
                {errors.dates ? <p className="mt-2 text-sm text-red-400">{errors.dates}</p> : null}
              </div>

              {/* --- 3. thông tin báo bay --- */}
              <div className="mt-9">
                <SectionTitle step={3} title={b((d) => d.step3)} />

                {/* Mã hội viên HNAA: ô ĐẦU TIÊN, chỉ ở Viên Nam (chủ chốt). Mã đúng
                    thì trang chỉ nhận họ tên + vài số cuối, dữ liệu đầy đủ máy chủ
                    tự gắn vào báo bay. */}
                {hnaaSpot ? (
                  <div className="mb-5 rounded-2xl border border-emerald-400/35 bg-emerald-400/[0.07] p-4">
                    {memberState.status === "ok" ? (
                      <div>
                        <div className="text-sm font-bold text-emerald-300">
                          ✅ <Bi t={b((d) => d.hnaaOk)} inline />
                        </div>
                        <div className="mt-2 text-lg font-bold text-white">{memberState.member.fullName}</div>
                        <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/70">
                          <span>
                            <Bi t={b((d) => d.hnaaLabel)} inline />:{" "}
                            <b className="font-mono text-white">{memberState.member.code}</b>
                          </span>
                          {memberState.member.idMasked ? (
                            <span>
                              <Bi t={b((d) => d.memberId)} inline />:{" "}
                              <b className="text-white">{memberState.member.idMasked}</b>
                            </span>
                          ) : null}
                          {memberState.member.phoneMasked ? (
                            <span>
                              <Bi t={b((d) => d.memberPhone)} inline />:{" "}
                              <b className="text-white">{memberState.member.phoneMasked}</b>
                            </span>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={resetMember}
                          className="mt-3 text-sm font-semibold text-amber-300 underline underline-offset-4"
                        >
                          <Bi t={b((d) => d.hnaaChange)} inline />
                        </button>
                      </div>
                    ) : (
                      <Field label={b((d) => d.hnaaLabel)}>
                        <p className="mb-2 text-sm leading-relaxed text-white/75">
                          <Bi t={b((d) => d.hnaaHint)} />
                        </p>
                        <div className="flex gap-2">
                          <input
                            className={`${inputClass} uppercase placeholder:normal-case`}
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
                            placeholder={s((d) => d.hnaaPh, " / ")}
                            autoComplete="off"
                          />
                          <button
                            type="button"
                            onClick={checkMember}
                            disabled={!memberCode.trim() || memberState.status === "checking"}
                            className="flex h-12 shrink-0 flex-col items-center justify-center rounded-xl bg-emerald-500 px-3 text-sm font-bold leading-tight text-white transition hover:bg-emerald-400 disabled:opacity-50"
                          >
                            <Bi t={b((d) => (memberState.status === "checking" ? d.hnaaChecking : d.hnaaCheck))} />
                          </button>
                        </div>
                        {memberState.status === "wrong" ? (
                          <div className="mt-2 text-sm">
                            <span className="font-bold text-red-400">
                              <Bi t={b((d) => d.hnaaWrong)} inline />
                            </span>
                            <span className="mt-0.5 block text-white/65">
                              <Bi t={b((d) => d.hnaaWrongContinue)} />
                            </span>
                          </div>
                        ) : null}
                        {memberState.status === "rate" ? (
                          <p className="mt-2 text-sm text-red-400">
                            <Bi t={b((d) => d.err.rate)} />
                          </p>
                        ) : null}
                      </Field>
                    )}
                    <p className="mt-3 text-[13px] leading-relaxed text-emerald-200/90">
                      ⏰ <Bi t={b((d) => d.hnaaCutoff)} />
                    </p>
                    <p className="mt-2 rounded-lg border border-red-400/35 bg-red-500/10 px-3 py-2 text-[13px] font-semibold leading-relaxed text-red-200">
                      ⚠️ <Bi t={b((d) => d.hnaaWarn)} />
                    </p>
                  </div>
                ) : null}

                {verifiedMember &&
                (verifiedMember.needId || verifiedMember.needPhone || verifiedMember.needEmergencyPhone) ? (
                  <p className="mb-3 text-sm text-white/65">
                    <Bi t={b((d) => d.memberNeedMore)} />
                  </p>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Người Việt / người nước ngoài — hỏi MỌI phi công, kể cả hội viên
                      (chủ 30/09): người nước ngoài bắt buộc khai quốc tịch. */}
                  <div
                    className="scroll-mt-24 sm:col-span-2"
                    ref={(el) => {
                      fieldRefs.current.nationality = el;
                    }}
                  >
                    <span className="mb-1.5 block text-sm font-medium text-white/80">
                      <Bi t={b((d) => d.natAsk)} inline />
                      <span className="ml-1 text-amber-400">*</span>
                    </span>
                    <div role="radiogroup" className="grid grid-cols-2 gap-2">
                      {([false, true] as const).map((isF) => {
                        const on = foreigner === isF;
                        return (
                          <button
                            key={String(isF)}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => {
                              setForeigner(isF);
                              setErrors((e) => ({ ...e, nationality: undefined }));
                            }}
                            className={[
                              "flex min-h-12 items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm font-bold transition",
                              on
                                ? "border-amber-400 bg-amber-400/20 text-amber-200"
                                : "border-white/25 bg-white/[0.10] text-white/85 hover:bg-white/[0.16]",
                            ].join(" ")}
                          >
                            <span
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-amber-400" : "border-white/45"}`}
                            >
                              {on ? <span className="h-2 w-2 rounded-full bg-amber-400" /> : null}
                            </span>
                            <span className="min-w-0">
                              {isF ? "🌍 " : "🇻🇳 "}
                              <Bi t={b((d) => (isF ? d.natForeign : d.natVn))} />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {foreigner ? (
                      <div className="mt-3">
                        <Field
                          label={b((d) => d.fNationality)}
                          required
                          hint={b((d) => d.natForeignHint)}
                          error={errors.nationality}
                        >
                          <input
                            className={inputClass}
                            value={nationality}
                            maxLength={60}
                            onChange={(e) => setNationality(e.target.value)}
                            placeholder={s((d) => d.fNationalityPh, " / ")}
                            autoComplete="country-name"
                          />
                        </Field>
                      </div>
                    ) : null}
                  </div>

                  {!verifiedMember ? (
                    <div
                      className="scroll-mt-24"
                      ref={(el) => {
                        fieldRefs.current.fullName = el;
                      }}
                    >
                      <Field label={b((d) => d.fFullName)} required error={errors.fullName}>
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
                      {/* Người nước ngoài: ô giấy tờ đổi thành SỐ HỘ CHIẾU */}
                      <Field
                        label={b((d) => (foreigner ? d.fPassport : d.fId))}
                        required
                        hint={b((d) => d.fIdHint)}
                        error={errors.idNumber}
                      >
                        <input
                          className={inputClass}
                          value={idNumber}
                          onChange={(e) => setIdNumber(e.target.value)}
                          placeholder={foreigner ? s((d) => d.fPassportPh, " / ") : T.fIdPh}
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
                      <Field label={b((d) => d.fPhone)} required error={errors.phone}>
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
                      <Field label={b((d) => d.fEmergencyPhone)} required error={errors.emergencyPhone}>
                        <input
                          className={inputClass}
                          value={emergencyPhone}
                          inputMode="tel"
                          onChange={(e) => setEmergencyPhone(e.target.value)}
                          placeholder={s((d) => d.fEmergencyPhonePh, " / ")}
                        />
                      </Field>
                    </div>
                  ) : null}

                  <Field label={b((d) => d.fLicence)}>
                    <input
                      className={inputClass}
                      value={licence}
                      maxLength={60}
                      onChange={(e) => setLicence(e.target.value)}
                      placeholder={s((d) => d.fLicencePh, " / ")}
                    />
                  </Field>

                  <div className="sm:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-white/80">
                      <Bi t={b((d) => d.fWing)} inline />
                    </span>
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
                            {w === "PPG" ? s((d) => d.wingPpg, " / ") : wingClassLabel(w)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <Field label={b((d) => d.fNote)}>
                      <textarea
                        className={`${inputClass} h-auto min-h-[80px] resize-y py-3 leading-relaxed`}
                        value={note}
                        maxLength={500}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={s((d) => d.fNotePh, "\n")}
                      />
                    </Field>
                  </div>
                </div>
              </div>

              {/* --- 4. cách trả phí + bảng phí --- */}
              <div className="mt-9">
                <SectionTitle step={4} title={b((d) => d.step4)} />
                {cfg ? (
                  <div className={`grid gap-3 ${cfg.purchaseModes.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                    {cfg.purchaseModes.map((m) => {
                      const title = b((d) =>
                        m === "day"
                          ? d.modeDay(formatVnd(BAO_BAY_FEE_PER_DAY))
                          : m === "month"
                            ? d.modeMonth(formatVnd(BAO_BAY_FEE_PER_MONTH))
                            : d.modeYear(formatVnd(BAO_BAY_FEE_PER_YEAR)),
                      );
                      const desc = b((d) => (m === "day" ? d.modeDayDesc : m === "month" ? d.modeMonthDesc : d.modeYearDesc));
                      return (
                        <ChoiceCard
                          key={m}
                          active={purchase === m}
                          icon={m === "day" ? "☀️" : m === "month" ? "📅" : "🗓️"}
                          title={<Bi t={title} />}
                          desc={<Bi t={desc} />}
                          onClick={() => setPurchase(m)}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-xl border border-white/18 bg-white/[0.08] px-4 py-3 text-sm text-white/60">
                    <Bi t={b((d) => d.pickSpotFirst)} />
                  </p>
                )}

                <div className="mt-5">
                  {quote.fee ? (
                    <div className={quote.loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
                      {feeBox(quote.fee)}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/18 bg-white/[0.08] p-5 text-sm text-white/60">
                      {quote.loading ? (
                        <Bi t={b((d) => d.feeLoading)} />
                      ) : quote.error ? (
                        quote.error
                      ) : (
                        <Bi t={b((d) => d.feeEmpty)} />
                      )}
                    </div>
                  )}
                </div>

                {/* ---- TRẢ TIỀN TRƯỚC KHI GỬI (chủ 30/09) ----
                    Tổng 0 đ thì không có khối này, gửi thẳng. Có tiền thì QR +
                    tài khoản + nội dung CK ngay đây, và ô xác nhận bắt buộc. */}
                {needsPay ? (
                  <div className="mt-5 rounded-2xl border border-white/15 bg-white/[0.06] p-5">
                    <div className="text-center text-xs font-bold uppercase tracking-[.15em] text-amber-300">
                      <Bi t={b((d) => d.payBeforeTitle)} />
                    </div>
                    <div className="mt-1 text-center text-3xl font-extrabold text-amber-300">{formatVnd(payTotal)}</div>
                    <p className="mt-2 text-center text-sm text-white/65">
                      <Bi t={b((d) => d.payBeforeHint)} />
                    </p>

                    {quote.paymentNote ? (
                      <>
                        <div className="mt-4 flex justify-center">
                          {payQr && !quote.loading ? (
                            <div className="rounded-2xl bg-white p-3 shadow-lg">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={payQr}
                                alt={s((d) => d.altQr)}
                                width={230}
                                height={230}
                                className="block h-[230px] w-[230px]"
                              />
                            </div>
                          ) : (
                            <div className="flex h-[254px] w-[254px] items-center justify-center rounded-2xl bg-white/10 text-center text-sm text-white/50">
                              <Bi t={b((d) => d.payMaking)} />
                            </div>
                          )}
                        </div>
                        <p className="mt-3 text-center text-sm text-white/60">
                          <Bi t={b((d) => d.payScanHint)} />
                        </p>
                        <div className="mt-4">{payRows(quote.paymentNote)}</div>

                        <label
                          className={[
                            "mt-4 flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition",
                            paidConfirmed
                              ? "border-emerald-400/70 bg-emerald-400/15"
                              : "border-amber-400/60 bg-amber-400/10 hover:bg-amber-400/15",
                          ].join(" ")}
                        >
                          <input
                            type="checkbox"
                            checked={paidConfirmed}
                            disabled={quote.loading}
                            onChange={(e) => {
                              setPaidConfirmed(e.target.checked);
                              setServerError("");
                            }}
                            className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-500"
                          />
                          <span className="text-[15px] font-bold text-white">
                            <Bi t={b((d) => d.payConfirmLabel)} />
                          </span>
                        </label>
                      </>
                    ) : (
                      <p className="mt-4 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-center text-sm text-amber-100">
                        <Bi t={b((d) => d.payNeedPhone)} />
                      </p>
                    )}
                  </div>
                ) : null}
              </div>

              {serverError ? (
                <div className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {serverError}
                </div>
              ) : null}

              <div className="mt-7 flex flex-col items-center gap-3">
                <button
                  type="button"
                  disabled={submitting || (needsPay && (!paidConfirmed || quote.loading))}
                  onClick={submit}
                  className="cta-btn flex min-h-14 w-full max-w-sm flex-col items-center justify-center rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 py-2 text-lg font-extrabold text-black shadow-[0_10px_36px_rgba(251,191,36,.3)] transition hover:brightness-110 disabled:opacity-60"
                >
                  <Bi t={b((d) => (submitting ? d.submitting : d.submit))} />
                </button>
                {needsPay && !paidConfirmed ? (
                  <p className="text-center text-sm text-amber-200">
                    <Bi t={b((d) => d.payConfirmFirst)} />
                  </p>
                ) : null}
                <p className="text-center text-xs leading-relaxed text-white/45">
                  <Bi t={b((d) => d.submitFoot)} />
                  <span className="mt-1.5 block">
                    <Bi t={b((d) => d.needHelp)} inline />{" "}
                    <a href={SUPPORT_TEL} className="font-bold text-white/70">
                      {SUPPORT_PHONE}
                    </a>{" "}
                    (Mr. Mỹ).
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ DỰ BÁO 3 ĐIỂM BAY ============
          Mỗi điểm một nút; bấm một lần là mở đủ bảng dự báo của điểm đó. Chỉ
          điểm nào được mở mới nạp dữ liệu — đóng hết thì trang không tốn gì. */}
      <section className="relative bg-[#0B0A08] pb-24">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="font-serif text-2xl font-bold text-white">
            ⛅ <Bi t={b((d) => d.forecastSectionTitle)} subClass="font-sans text-base" />
          </h2>
          <p className="mt-1 text-sm text-white/60">
            <Bi t={b((d) => d.forecastSectionHint)} />
          </p>
          <div className="mt-4 space-y-2.5">
            {BAO_BAY_SPOTS.map((sp) => (
              <ForecastToggle
                key={sp}
                compact
                open={Boolean(forecastOpen[sp])}
                onToggle={() => setForecastOpen((o) => ({ ...o, [sp]: !o[sp] }))}
                label={b((d) => `${SPOT_ICON[sp]} ${d.spotName[sp]} — ${d.spotArea[sp]}`)}
                closeLabel={b((d) => `${SPOT_ICON[sp]} ${d.spotName[sp]} — ${d.forecastClose}`)}
                slug={BAO_BAY_SPOT_CONFIG[sp].weatherSlug}
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
