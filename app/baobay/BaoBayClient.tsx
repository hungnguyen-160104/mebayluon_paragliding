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

import Link from "@/components/locale-link";
import CameraGallery from "@/components/baobay/CameraGallery";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useLanguage } from "@/contexts/language-context";
import {
  BAO_BAY_BG,
  BAO_BAY_FEE_PER_DAY,
  BAO_BAY_FEE_PER_MONTH,
  BAO_BAY_FEE_PER_YEAR,
  BAO_BAY_HOTLINE,
  BAO_BAY_GENERAL_KNOWLEDGE,
  BAO_BAY_KNOWLEDGE_LINKS,
  BAO_BAY_SITE_POSTS,
  BAO_BAY_RADIO,
  BAO_BAY_SPOTS,
  BAO_BAY_SPOT_CONFIG,
  formatVndNb,
  memberCodeDisplay,
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
  wingClassLabel,
  type WingClass,
} from "@/lib/pilot-event";
import {
  calDay,
  dayParts,
  levelLabel,
  renderDaySummary,
  renderDaySummaryParts,
  type CalDay,
  type DayLevel,
  type DayParts,
  type NgayApi,
} from "@/lib/bao-bay-weather";
import { VIEN_NAM_RULE_IMAGES, vienNamRules } from "@/lib/bao-bay-rules";
import { buildVietQrPayload } from "@/lib/vietqr";
import { WindArrow } from "@/components/weather/WindArrow";

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

/** Cộng n ngày vào "YYYY-MM-DD" (tính theo lịch, không dính múi giờ). */
function addDaysISO(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return toISO(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
}

/**
 * Lưới ngày của một tháng, bắt đầu từ Thứ 2 — KHÔNG CÓ Ô TRỐNG (chủ 30/09).
 *
 * Trước đây cuối tháng để trống (30/9 là thứ Tư thì T5–CN trống trơn), đúng
 * chỗ phi công cần chọn nhất là mấy ngày tới. Nay:
 *  - đầu tuần đầu điền ngày cuối tháng TRƯỚC, cuối tuần cuối điền ngày đầu
 *    tháng SAU (hiện mờ, `inMonth: false`) — vẫn chọn được nếu chưa qua;
 *  - `showUntil`: nếu tháng đang xem hết trước ngày này thì kéo thêm cả tuần
 *    cho tới khi phủ ngày đó — cuối tháng mở trang vẫn thấy đủ ~2 tuần tới
 *    (và dự báo) mà không phải bấm ›.
 * Ô lưu theo ngày ISO nên một ngày hiện ở hai tháng liền nhau vẫn chỉ là một
 * lựa chọn — chọn ở tháng này thì sang tháng kia cũng thấy đã chọn.
 */
function monthGrid(year: number, month: number, showUntil?: string): Array<{ iso: string; inMonth: boolean }> {
  const first = toISO(year, month, 1);
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const dayCount = new Date(year, month + 1, 0).getDate();
  const last = toISO(year, month, dayCount);

  const cells: Array<{ iso: string; inMonth: boolean }> = [];
  for (let i = offset; i > 0; i--) cells.push({ iso: addDaysISO(first, -i), inMonth: false });
  for (let d = 1; d <= dayCount; d++) cells.push({ iso: toISO(year, month, d), inMonth: true });

  let cur = last;
  // Lấp nốt tuần cuối, rồi thêm tuần cho tới khi phủ `showUntil`
  while (cells.length % 7 !== 0 || (showUntil && cur < showUntil)) {
    cur = addDaysISO(cur, 1);
    cells.push({ iso: cur, inMonth: false });
  }
  return cells;
}

/* ------------------------------------------------------------------ *
 * Mảnh giao diện
 * ------------------------------------------------------------------ */

/**
 * Một câu hai thứ tiếng: tiếng Việt, rồi " / tiếng Anh" nhỏ và nhạt hơn NGAY
 * CÙNG DÒNG (chủ 01/10: "Chọn ngày bay / Choose your flying dates") — để chữ
 * tự xuống dòng như câu thường, không tốn thêm một hàng cho bản tiếng Anh.
 * `inline` giữ lại cho tương thích chỗ gọi cũ, giờ hai kiểu vẽ như nhau.
 */
function Bi({ t, subClass = "" }: { t: BiText; inline?: boolean; subClass?: string }) {
  if (!t.sub) return <>{t.main}</>;
  return (
    <>
      {t.main}
      <span className={`text-[0.82em] font-normal opacity-60 ${subClass}`}> / {t.sub}</span>
    </>
  );
}

/**
 * MẶT TRÒN MÀU cho mức ngày (chủ 30/09): emoji không tô màu được, mà ba mặt
 * vàng giống nhau thì liếc lịch không phân biệt ngày tốt/xấu. Vẽ SVG: xanh
 * cười · vàng miệng thẳng · đỏ mếu, viền tối để nổi trên nền lịch tối và trên
 * ô đang chọn (nền vàng).
 */
const FACE_FILL: Record<DayLevel, string> = { xanh: "#22c55e", vang: "#facc15", do: "#ef4444" };
const FACE_MOUTH: Record<DayLevel, string> = {
  xanh: "M7 13.5 Q12 18 17 13.5",
  vang: "M7.5 15 H16.5",
  do: "M7 16.5 Q12 12 17 16.5",
};

function FaceIcon({ level, label, className = "" }: { level: DayLevel; label: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} role="img" aria-label={label}>
      <title>{label}</title>
      <circle cx="12" cy="12" r="10.5" fill={FACE_FILL[level]} stroke="#0f172a" strokeWidth="1.6" />
      <circle cx="8.6" cy="9.6" r="1.4" fill="#0f172a" />
      <circle cx="15.4" cy="9.6" r="1.4" fill="#0f172a" />
      <path d={FACE_MOUTH[level]} fill="none" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
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
  foreigner?: boolean;
};

/**
 * Hai bước xác nhận hội viên (chủ 01/10): mã → SĐT đăng ký. Bước mã KHÔNG
 * trả tên; chỉ khi SĐT khớp mới có thông tin hội viên (status "ok").
 */
type MemberState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "codeOk"; code: string; hasPhone: boolean; error?: "phoneMismatch" | "phoneLocked" | "memberPhone" }
  | { status: "confirming"; code: string; hasPhone: boolean }
  | { status: "ok"; member: MemberView; phoneUnverified: boolean }
  | { status: "wrong" }
  | { status: "rate" };

const ERROR_ORDER = ["spot", "dates", "fullName", "nationality", "idNumber", "phone", "emergencyPhone", "email", "rules"] as const;
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
  rules: "rules",
  email: "email",
};

const SUPPORT_PHONE = BAO_BAY_HOTLINE.display;
const SUPPORT_TEL = BAO_BAY_HOTLINE.tel;

/**
 * NHỚ THÔNG TIN PHI CÔNG TRÊN MÁY (chủ 01/10): lần sau chỉ việc chọn ngày.
 * Chỉ lưu ở trình duyệt (localStorage), không lưu gì thêm ở máy chủ. KHÔNG lưu
 * ngày bay, cách trả phí, tích "đã thanh toán", tích "chấp nhận nội quy" — mấy
 * thứ ấy mỗi lần phải chọn lại. Khoá có số phiên bản: đổi cấu trúc thì đổi v2,
 * bản cũ tự bị bỏ qua chứ không làm vỡ trang.
 */
const SAVED_KEY = "baobay:pilot:v1";

type SavedPilot = {
  v: 1;
  spot?: BaoBaySpot;
  foreigner?: boolean;
  nationality?: string;
  fullName?: string;
  idNumber?: string;
  phone?: string;
  emergencyPhone?: string;
  licence?: string;
  email?: string;
  wingClass?: string;
  memberCode?: string;
  memberPhone?: string;
};

/** Mọi lần chạm localStorage đều bọc try/catch: chế độ ẩn danh / bị chặn thì coi như không có. */
function readSaved(): SavedPilot | null {
  try {
    const raw = window.localStorage.getItem(SAVED_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as SavedPilot;
    return o && o.v === 1 ? o : null;
  } catch {
    return null;
  }
}
function writeSaved(o: SavedPilot): void {
  try {
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(o));
  } catch {
    /* không lưu được thì thôi */
  }
}
function clearSaved(): void {
  try {
    window.localStorage.removeItem(SAVED_KEY);
  } catch {
    /* bỏ qua */
  }
}
const str = (v: unknown, max = 120) => (typeof v === "string" ? v.slice(0, max) : "");

const isBaoBaySpotClient = (v: unknown): v is BaoBaySpot => BAO_BAY_SPOTS.includes(v as BaoBaySpot);

const SPOT_ICON: Record<BaoBaySpot, string> = { "vien-nam": "🏞️", "khau-pha": "🌾", "quan-ba": "⛰️" };

export default function BaoBayClient() {
  const { language } = useLanguage();
  const { T, b, s, isVi } = baoBayBilingual(language);

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
  /** SĐT đăng ký hội viên — bước xác nhận thứ hai; máy chủ đối chiếu lại ở mọi lần báo giá/gửi. */
  const [memberPhone, setMemberPhone] = useState("");
  /** Đã tích "chấp nhận tuân thủ Nội quy điểm bay" — bắt buộc ở Viên Nam. */
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [zoomImg, setZoomImg] = useState("");
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
  /** Email không bắt buộc — có thì máy chủ gửi thư xác nhận (từ hộp dangky). */
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  /** Phiếu đang được điền sẵn từ lần báo bay trước (localStorage). */
  const [prefilled, setPrefilled] = useState(false);

  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /** Tóm tắt dự báo theo ngày cho ô lịch — nhớ theo mã điểm, mỗi điểm tải MỘT lần. */
  const [calFc, setCalFc] = useState<Record<string, Record<string, { cal: CalDay; parts: DayParts }>>>({});
  /** Ngày vừa bấm gần nhất — dòng tóm tắt dự báo của nó đứng đầu. */
  const [lastTapped, setLastTapped] = useState("");
  const forecastCardRef = useRef<HTMLDivElement>(null);

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
  /**
   * ĐÃ GÕ MÃ HỘI VIÊN mà chưa xác nhận đúng SĐT (sai SĐT, mã sai, chưa bấm xác
   * nhận…) → KHOÁ nút gửi (chủ 01/10: nhập sai SĐT thì không nhận). Muốn báo
   * như phi công thường thì xoá mã đi.
   */
  const memberPending = hnaaSpot && memberCode.trim() !== "" && !verifiedMember;

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

  /**
   * Dự báo cho Ô LỊCH: 15 ngày (mô hình mặc định cho tới 15–16 ngày, API cache
   * 30 phút ở biên). Tải ngầm — lịch vẫn bấm được trong lúc chờ; hỏng thì lịch
   * cứ trơn như cũ, không báo lỗi gì.
   */
  const weatherSlug = spot ? BAO_BAY_SPOT_CONFIG[spot].weatherSlug : "";
  useEffect(() => {
    if (!weatherSlug || calFc[weatherSlug]) return;
    let alive = true;
    (async () => {
      const res = await fetch(`/api/thoi-tiet?spot=${encodeURIComponent(weatherSlug)}&days=15`);
      if (!res.ok) return;
      const j = (await res.json()) as { ngay?: NgayApi[]; toaDo?: { alt?: number } };
      // Độ cao bãi cất của CHÍNH hệ dự báo — đổi trần mây / nghịch nhiệt sang AMSL
      const alt = j.toaDo?.alt;
      const map: Record<string, { cal: CalDay; parts: DayParts }> = {};
      for (const n of j.ngay ?? []) map[n.ngay] = { cal: calDay(n), parts: dayParts(n, alt) };
      if (alive) setCalFc((c) => ({ ...c, [weatherSlug]: map }));
    })().catch(() => {
      /* không có dự báo thì lịch trơn */
    });
    return () => {
      alive = false;
    };
  }, [weatherSlug, calFc]);

  const openFullForecast = () => {
    setForecastSelectedOpen(true);
    window.setTimeout(
      () => forecastCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      60,
    );
  };

  // Điểm bay không bán vé năm thì hạ lựa chọn về theo ngày
  useEffect(() => {
    if (cfg && !cfg.purchaseModes.includes(purchase)) setPurchase("day");
  }, [cfg, purchase]);

  const selectSpot = (sp: BaoBaySpot) => {
    setSpot(sp);
    setErrors((e) => ({ ...e, spot: undefined }));
  };

  const toggleDate = (iso: string) => {
    setLastTapped(iso);
    setDates((prev) => (prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso].sort()));
    setErrors((e) => ({ ...e, dates: undefined }));
  };

  /* ---------------- tra mã hội viên ---------------- */

  /** Bước 1: chỉ mã — máy chủ trả "mã có thật" + mã dạng chuẩn, KHÔNG trả tên. */
  const checkMember = async () => {
    const code = memberCodeDisplay(memberCode.trim());
    if (!code) return;
    setMemberCode(code);
    setMemberState({ status: "checking" });
    try {
      const res = await fetch("/api/bao-bay/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok && data.step === "phone") {
        setMemberCode(String(data.code));
        setMemberState({ status: "codeOk", code: String(data.code), hasPhone: Boolean(data.hasPhone) });
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

  /** Bước 2: mã + SĐT đăng ký — khớp mới hiện tên, quốc tịch và tính giá hội viên. */
  const confirmMemberPhone = async () => {
    if (memberState.status !== "codeOk") return;
    const { code, hasPhone } = memberState;
    if (memberPhone.replace(/\D/g, "").length < 8) {
      setMemberState({ status: "codeOk", code, hasPhone, error: "memberPhone" });
      return;
    }
    setMemberState({ status: "confirming", code, hasPhone });
    try {
      const res = await fetch("/api/bao-bay/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, phone: memberPhone.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok && data.member) {
        setMemberState({ status: "ok", member: data.member as MemberView, phoneUnverified: Boolean(data.phoneUnverified) });
        setErrors((e) => ({ ...e, fullName: undefined, idNumber: undefined, phone: undefined, emergencyPhone: undefined }));
      } else {
        const c = String(data?.code || "");
        setMemberState({
          status: "codeOk",
          code,
          hasPhone,
          error: c === "phoneLocked" ? "phoneLocked" : c === "memberPhone" ? "memberPhone" : "phoneMismatch",
        });
      }
    } catch {
      setMemberState({ status: "codeOk", code, hasPhone });
      setServerError(s((d) => d.err.network));
    }
  };

  /**
   * Tự xác nhận lại hội viên đã lưu trên máy (mã + SĐT) khi mở trang — máy chủ
   * vẫn đối chiếu như thường; sai thì dừng ở bước nhập SĐT cho phi công sửa.
   */
  const autoVerifyMember = async (rawCode: string, phoneRaw: string) => {
    try {
      const r1 = await fetch("/api/bao-bay/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: rawCode }),
      });
      const d1 = await r1.json().catch(() => ({}));
      if (!r1.ok || !d1?.ok || d1.step !== "phone") {
        setMemberState(r1.status === 429 ? { status: "rate" } : { status: "wrong" });
        return;
      }
      const code = String(d1.code);
      setMemberCode(code);
      const r2 = await fetch("/api/bao-bay/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, phone: phoneRaw }),
      });
      const d2 = await r2.json().catch(() => ({}));
      if (r2.ok && d2?.ok && d2.member) {
        setMemberState({ status: "ok", member: d2.member as MemberView, phoneUnverified: Boolean(d2.phoneUnverified) });
      } else {
        const c = String(d2?.code || "");
        setMemberState({
          status: "codeOk",
          code,
          hasPhone: Boolean(d1.hasPhone),
          error: c === "phoneLocked" ? "phoneLocked" : c === "memberPhone" ? "memberPhone" : "phoneMismatch",
        });
      }
    } catch {
      setMemberState({ status: "idle" });
    }
  };

  // Mở trang: điền sẵn từ lần trước (chạy SAU khi hydrate — không làm lệch HTML máy chủ)
  useEffect(() => {
    const o = readSaved();
    if (!o) return;
    if (o.spot && isBaoBaySpotClient(o.spot)) setSpot(o.spot);
    setForeigner(Boolean(o.foreigner));
    setNationality(str(o.nationality, 60));
    setFullName(str(o.fullName));
    setIdNumber(str(o.idNumber, 40));
    setPhone(str(o.phone, 30));
    setEmergencyPhone(str(o.emergencyPhone, 30));
    setLicence(str(o.licence, 60));
    setEmail(str(o.email, 120));
    if (o.wingClass && (WING_CLASSES as string[]).includes(o.wingClass)) setWingClass(o.wingClass as WingClass);
    const mc = str(o.memberCode, 40);
    const mp = str(o.memberPhone, 30);
    if (mc && mp) {
      setMemberCode(mc);
      setMemberPhone(mp);
      setMemberState({ status: "checking" });
      void autoVerifyMember(mc, mp);
    }
    setPrefilled(true);
    // chỉ chạy một lần lúc mở trang
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** "Xoá thông tin đã lưu" / "Không phải bạn?": xoá khỏi máy và làm trống phiếu. */
  const forgetSaved = () => {
    clearSaved();
    setPrefilled(false);
    setForeigner(false);
    setNationality("");
    setFullName("");
    setIdNumber("");
    setPhone("");
    setEmergencyPhone("");
    setLicence("");
    setEmail("");
    setWingClass("");
    setMemberCode("");
    setMemberPhone("");
    setMemberState({ status: "idle" });
  };

  const resetMember = () => {
    setMemberCode("");
    setMemberPhone("");
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
            memberPhone: verifiedMember ? memberPhone.trim() : "",
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
          // SĐT hội viên không còn khớp (máy chủ đối chiếu lại) → quay về bước nhập SĐT
          if ((code === "phoneMismatch" || code === "memberPhone" || code === "phoneLocked") && verifiedMember) {
            setMemberState({
              status: "codeOk",
              code: verifiedMember.code,
              hasPhone: true,
              error: code === "phoneLocked" ? "phoneLocked" : code === "memberPhone" ? "memberPhone" : "phoneMismatch",
            });
          }
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
    if (spot === "vien-nam" && !rulesAccepted) next.rules = err((d) => d.err.rules);
    if (!verifiedMember && foreigner && (!nationality.trim() || /^vi[eệ]t ?nam$/i.test(nationality.trim()))) {
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
    // Email không bắt buộc — chỉ kiểm khi đã điền
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) next.email = err((d) => d.err.email);
    return next;
  };

  const submit = async () => {
    if (memberPending) return;
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
          memberPhone: verifiedMember ? memberPhone.trim() : "",
          rulesAccepted: spot === "vien-nam" ? rulesAccepted : undefined,
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
          email: email.trim(),
          // Ngôn ngữ trang — thư xác nhận viết đúng thứ tiếng phi công đang đọc
          lang: language,
          note: note.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        const code = String(data?.code || "server");
        if (code === "memberInvalid") setMemberState({ status: "wrong" });
          // SĐT hội viên không còn khớp (máy chủ đối chiếu lại) → quay về bước nhập SĐT
          if ((code === "phoneMismatch" || code === "memberPhone" || code === "phoneLocked") && verifiedMember) {
            setMemberState({
              status: "codeOk",
              code: verifiedMember.code,
              hasPhone: true,
              error: code === "phoneLocked" ? "phoneLocked" : code === "memberPhone" ? "memberPhone" : "phoneMismatch",
            });
          }
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

      // Nhớ thông tin CỦA PHI CÔNG cho lần sau (không nhớ ngày, phí, các ô tích)
      writeSaved({
        v: 1,
        spot: spot || undefined,
        foreigner,
        nationality: nationality.trim(),
        fullName: fullName.trim(),
        idNumber: idNumber.trim(),
        phone: phone.trim(),
        emergencyPhone: emergencyPhone.trim(),
        licence: licence.trim(),
        email: email.trim() || undefined,
        wingClass: wingClass || undefined,
        memberCode: verifiedMember ? verifiedMember.code : undefined,
        memberPhone: verifiedMember ? memberPhone.trim() : undefined,
      });

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
            <span className={`shrink-0 whitespace-nowrap text-right text-sm font-bold ${line.amount ? "text-white" : "text-emerald-400"}`}>
              {line.amount ? formatVndNb(line.amount) : <Bi t={b((d) => d.feeFree)} />}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-white/15 pt-3">
        <span className="text-base font-bold text-white">
          <Bi t={b((d) => d.feeTotal)} inline />
        </span>
        <span className={`whitespace-nowrap text-right text-2xl font-extrabold ${fee.total > 0 ? "text-amber-300" : "text-emerald-400"}`}>
          {fee.total > 0 ? formatVndNb(fee.total) : <Bi t={b((d) => d.feeFree)} />}
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

  /**
   * TOÀN VĂN NỘI QUY VIÊN NAM trong khung cuộn cao cố định (~220px): đọc bằng
   * cách vuốt trong khung, không đẩy phần trả tiền xuống quá xa. Trang tiếng
   * Việt: bản vi rồi bản en; ngôn ngữ khác: bản en (biển chỉ có hai bản).
   */
  const rulesBox = () => {
    const versions = isVi ? [vienNamRules("vi"), vienNamRules("en")] : [vienNamRules(language)];
    return (
      <div className="mt-2">
        <p className="mb-1 text-[11px] text-white/50">
          ↕ <Bi t={b((d) => d.rulesScrollHint)} />
        </p>
        <div
          className="h-[220px] overflow-y-auto overscroll-contain rounded-xl border border-white/15 bg-black/30 p-3 text-[13px] leading-relaxed text-white/85"
          tabIndex={0}
        >
          {versions.map((r, vi) => (
            <div key={r.title} className={vi ? "mt-5 border-t border-white/10 pt-4" : ""}>
              <div className="text-sm font-extrabold uppercase tracking-wide text-amber-300">{r.title}</div>
              <div className="mt-1 font-bold text-white">{r.sectionA}</div>
              <ol className="mt-1 list-decimal space-y-1 pl-5">
                {r.items.map((it) => (
                  <li key={it.text}>
                    {it.text}
                    {it.sub ? (
                      <ul className="mt-1 space-y-0.5">
                        {it.sub.map((x) => (
                          <li key={x}>❌ {x}</li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ol>
              <div className="mt-3 font-bold text-white">{r.zoneTitle}</div>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {r.zoneNotes.map((z) => (
                  <li key={z}>{z}</li>
                ))}
              </ul>
              <div className="mt-3 space-y-0.5">
                <div>
                  <b>{r.windLabel}:</b> {r.wind}
                </div>
                <div>
                  <b>{r.radioLabel}:</b> {r.radio}
                </div>
                <div>
                  <b>{r.emergencyLabel}:</b>{" "}
                  {r.emergency.map((e) => (
                    <a key={e.tel} href={e.tel} className="whitespace-nowrap font-semibold text-red-300 underline">
                      {e.display} ({e.name})
                    </a>
                  ))}
                </div>
                <div>
                  <b>{r.hotlineLabel}:</b>{" "}
                  <a href={r.hotline.tel} className="whitespace-nowrap font-semibold text-amber-300 underline">
                    {r.hotline.display}
                  </a>
                </div>
              </div>
              {vi === versions.length - 1 ? (
                <div className="mt-3 grid gap-2">
                  {(
                    [
                      [VIEN_NAM_RULE_IMAGES.zone, r.mapZoneAlt],
                      [VIEN_NAM_RULE_IMAGES.site, r.mapSiteAlt],
                    ] as const
                  ).map(([src, alt]) => (
                    <button key={src} type="button" onClick={() => setZoomImg(src)} className="block text-left">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={alt} loading="lazy" className="w-full rounded-lg border border-white/15" />
                      <span className="mt-0.5 block text-[11px] text-white/50">
                        🔍 <Bi t={b((d) => d.rulesTapZoom)} />
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    );
  };

  /** Tần số bộ đàm + hotline khẩn cấp — trên phiếu và trên màn hình gửi xong. */
  const radioBox = () => (
    <div className="rounded-2xl border border-sky-300/30 bg-sky-400/[0.08] px-4 py-3 text-left text-sm text-white/85">
      <div className="text-xs font-bold uppercase tracking-[.12em] text-sky-200">
        📻 <Bi t={b((d) => d.radioTitle)} inline />
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
        {BAO_BAY_RADIO.map((r) => (
          <span key={r.name} className="whitespace-nowrap">
            <b className="text-white">{r.name}</b> <span className="font-mono text-sky-100">{r.freq}</span>
          </span>
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2.5">
        <span className="text-xs font-bold uppercase tracking-[.12em] text-red-200">
          🚨 <Bi t={b((d) => d.emergencyTitle)} inline />
        </span>
        <a
          href={BAO_BAY_HOTLINE.tel}
          className="rounded-lg bg-red-500 px-3 py-1.5 font-mono text-base font-extrabold text-white hover:bg-red-400"
        >
          📞 {BAO_BAY_HOTLINE.display}
        </a>
      </div>
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
              <div className="mt-1 whitespace-nowrap text-2xl font-extrabold text-amber-300">{formatVndNb(result.fee.total)}</div>
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

          <div className="mt-5 w-full">{radioBox()}</div>

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
  const [todayYY, todayMM] = todayISO.split("-").map(Number);
  // Đang xem tháng hiện tại thì lưới kéo tới ít nhất 13 ngày sau hôm nay
  const isCurrentMonthView = viewMonth.year === todayYY && viewMonth.month === todayMM - 1;
  const fullGrid = monthGrid(viewMonth.year, viewMonth.month, isCurrentMonthView ? addDaysISO(todayISO, 13) : undefined);
  /**
   * Tháng hiện tại: BỎ những hàng tuần đã qua trọn vẹn — cuối tháng mà giữ bốn
   * hàng ngày cũ xám xịt thì hai tuần tới (chỗ có dự báo) bị đẩy khỏi màn hình
   * điện thoại. Hàng có hôm nay vẫn giữ nguyên.
   */
  const grid = isCurrentMonthView
    ? fullGrid.filter((_, i) => fullGrid[Math.floor(i / 7) * 7 + 6].iso >= todayISO)
    : fullGrid;
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
        {/* Bộ đàm + hotline khẩn cấp ngay trên phiếu: thứ phi công cần lưu trước khi lên bãi */}
        <div className="mx-auto mb-4 max-w-3xl px-4">{radioBox()}</div>
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
                        <span className="mt-1 text-sm leading-none">{SPOT_ICON[sp]}</span>
                        {/* Tên điểm KHÔNG kèm tiếng Anh trên thẻ (chủ 01/10: thẻ phải thật gọn,
                            "Núi Viên Nam / Vien Nam Mountain" chỉ là lặp chữ) */}
                        <span
                          className={`mt-0.5 text-[13px] font-bold leading-tight sm:text-[15px] ${on ? "text-amber-300" : "text-white"}`}
                        >
                          {T.spotName[sp]}
                        </span>
                        <span className="mt-0.5 text-[11px] leading-tight text-white/55 sm:text-xs">
                          <Bi t={b((d) => d.spotArea[sp])} subClass="text-[10px]" />
                        </span>
                        <span className="mt-1.5 space-y-0.5 text-[11px] font-semibold leading-tight text-white/80 sm:text-xs">
                          {priceUnits(sp).map(({ m, t }) => (
                            // Mỗi mức giá một khối không ngắt: "2,5tr/năm", "2,5 млн/год" không bị bẻ đôi
                            <span key={m} className="block whitespace-nowrap">
                              {t.main}
                            </span>
                          ))}
                        </span>
                        {BAO_BAY_SPOT_CONFIG[sp].hnaa ? (
                          <span className="mt-1.5 rounded-md bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-bold leading-tight text-emerald-300 ring-1 ring-emerald-400/40">
                            {/* Nhãn đã chứa chữ "Free" — không cần thêm bản tiếng Anh cho gọn thẻ */}
                            {T.hnaaTag}
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
                  <div ref={forecastCardRef} className="mt-3 scroll-mt-24">
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
                {spot === "vien-nam" && <CameraGallery cam="vien-nam" />}
              </div>

              {/* --- 2. ngày bay --- */}
              <div
                className="mt-9 scroll-mt-24"
                ref={(el) => {
                  fieldRefs.current.dates = el;
                }}
              >
                <SectionTitle step={2} title={b((d) => d.step2)} hint={b((d) => d.step2Hint)} />
                <div className="rounded-2xl border border-white/20 bg-white/[0.10] p-2.5 sm:p-4">
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

                  <div className="grid grid-cols-7 gap-0.5 text-center sm:gap-1">
                    {T.weekdays.map((w, i) => (
                      <div key={w} className="pb-1 text-xs font-semibold text-white/40">
                        {w}
                        {/* Thứ tiếng Anh viết tắt dưới thứ tiếng Việt (T2/Mo) */}
                        {/* Ô thứ quá hẹp (≈41px) cho "T2 / Mo" một dòng — riêng chỗ này để chữ
                            viết tắt tiếng Anh nhỏ ngay dưới */}
                        {isVi ? <span className="block text-[9px] opacity-60">{b((d) => d.weekdays[i]).sub}</span> : null}
                      </div>
                    ))}
                    {grid.map(({ iso, inMonth }) => {
                      const selected = dates.includes(iso);
                      const past = iso < todayISO;
                      const isToday = iso === todayISO;
                      const fc = !past && weatherSlug ? calFc[weatherSlug]?.[iso]?.cal : undefined;
                      return (
                        <button
                          key={iso}
                          type="button"
                          disabled={past}
                          onClick={() => toggleDate(iso)}
                          className={[
                            // Cao cố định (không vuông) để chứa số ngày + ba ký hiệu dự báo xếp chồng
                            "flex min-h-[3.1rem] flex-col items-center justify-start rounded-lg pb-0.5 pt-1 text-sm font-semibold leading-none transition",
                            selected
                              ? "bg-amber-400 text-black shadow-[0_0_18px_rgba(251,191,36,.4)]"
                              : past
                                ? "cursor-not-allowed text-white/15"
                                : inMonth
                                  ? "text-white/80 hover:bg-white/10"
                                  : // Ngày của tháng kề: mờ hơn nhưng vẫn đọc được và bấm được
                                    "bg-white/[0.03] text-white/50 hover:bg-white/10",
                            isToday && !selected ? "ring-1 ring-amber-400/60" : "",
                          ].join(" ")}
                        >
                          <span>{Number(iso.slice(-2))}</span>
                          {fc ? (
                            <>
                              {fc.level ? (
                                <FaceIcon level={fc.level} label={levelLabel(fc.level, language)} className="mt-0.5 h-3.5 w-3.5" />
                              ) : null}
                              <span className="mt-0.5 flex items-center gap-px text-[9px] leading-none">
                                {fc.wind !== null ? <WindArrow deg={fc.wind} className="!h-2.5 !w-2.5" /> : null}
                                <span>{fc.sky}</span>
                              </span>
                            </>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  {/* Bỏ chú thích ký hiệu (chủ 30/09) — thay bằng dòng tóm tắt khi bấm
                      vào ngày; chỉ giữ lối mở bảng dự báo đầy đủ. */}
                  {weatherSlug && calFc[weatherSlug] && Object.keys(calFc[weatherSlug]).length ? (
                    <div className="mt-2 border-t border-white/10 pt-2 text-[12px]">
                      <button
                        type="button"
                        onClick={openFullForecast}
                        className="font-semibold text-sky-300 underline underline-offset-2"
                      >
                        ⛅ <Bi t={b((d) => d.calFullForecast)} inline />
                      </button>
                    </div>
                  ) : null}

                  {/* TÓM TẮT DỰ BÁO của ngày đã chọn (chủ 30/09): ngày vừa bấm đứng
                      đầu, tối đa 5 ngày; ngày ngoài tầm dự báo thì không có dòng. */}
                  {(() => {
                    const fcMap = weatherSlug ? calFc[weatherSlug] : undefined;
                    if (!fcMap) return null;
                    const order = [...dates].sort((x, y) => (x === lastTapped ? -1 : y === lastTapped ? 1 : x < y ? -1 : 1));
                    const rows = order.filter((iso) => fcMap[iso]).slice(0, 5);
                    if (!rows.length) return null;
                    return (
                      <div className="mt-2 space-y-2 border-t border-white/10 pt-2">
                        {rows.map((iso) => {
                          const mainParts = renderDaySummaryParts(iso, fcMap[iso].parts, language);
                          const sub = isVi ? renderDaySummary(iso, fcMap[iso].parts, "en") : "";
                          return (
                            <p key={iso} className="text-[13px] leading-snug text-white/85">
                              {fcMap[iso].parts.level ? (
                                <FaceIcon
                                  level={fcMap[iso].parts.level as DayLevel}
                                  label={levelLabel(fcMap[iso].parts.level as DayLevel, language)}
                                  className="mr-1 inline-block h-4 w-4 align-[-3px]"
                                />
                              ) : null}
                              {mainParts.label}:{" "}
                              {/* Mục nguy hiểm (gió trên cao mạnh, gió đứt, nhiễu động mạnh) tô ĐỎ ĐẬM — chủ 01/10 */}
                              {mainParts.parts.map((x, i) => (
                                <span key={i}>
                                  {i ? mainParts.sep : ""}
                                  {x.warn ? <strong className="font-bold text-red-400">{x.text}</strong> : x.text}
                                </span>
                              ))}
                              {/* Bản tiếng Anh CÙNG DÒNG, nhỏ và nhạt (chủ 01/10) */}
                              {sub ? <span className="text-[11px] text-white/50"> / {sub}</span> : null}
                            </p>
                          );
                        })}
                      </div>
                    );
                  })()}

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

                {prefilled ? (
                  <div className="-mt-2 mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-sky-300/25 bg-sky-400/[0.07] px-3 py-2 text-xs text-sky-100/90">
                    <span>
                      💾 <Bi t={b((d) => d.savedPrefilled)} />
                    </span>
                    <button type="button" onClick={forgetSaved} className="font-semibold text-amber-300 underline underline-offset-2">
                      <Bi t={b((d) => d.savedClear)} />
                    </button>
                    <button type="button" onClick={forgetSaved} className="font-semibold text-amber-300 underline underline-offset-2">
                      <Bi t={b((d) => d.savedNotYou)} />
                    </button>
                  </div>
                ) : null}

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
                            <b className="whitespace-nowrap font-mono text-white">{memberState.member.code}</b>
                          </span>
                          {memberState.member.idMasked ? (
                            <span>
                              <Bi t={b((d) => d.memberId)} inline />:{" "}
                              <b className="text-white">{memberState.member.idMasked}</b>
                            </span>
                          ) : null}
                          {memberState.member.nationality ? (
                            <span>
                              <Bi t={b((d) => d.fNationality)} inline />:{" "}
                              <b className="text-white">{memberState.member.nationality}</b>
                            </span>
                          ) : null}
                          {memberState.phoneUnverified ? (
                            <span className="basis-full text-xs text-amber-200/90">
                              ⓘ <Bi t={b((d) => d.memberPhoneUnverified)} />
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
                        {memberState.status === "codeOk" || memberState.status === "confirming" ? (
                          <div>
                            {/* Bước 2: mã đã có thật — hỏi SĐT đăng ký, chưa hiện tên */}
                            <div className="flex flex-wrap items-baseline gap-x-3 text-sm">
                              <span className="font-bold text-emerald-300">
                                ✓ <Bi t={b((d) => d.memberCodeFound(memberState.code))} />
                              </span>
                              <button
                                type="button"
                                onClick={resetMember}
                                className="text-xs font-semibold text-amber-300 underline underline-offset-4"
                              >
                                <Bi t={b((d) => d.hnaaChange)} />
                              </button>
                            </div>
                            <span className="mb-1.5 mt-3 block text-sm font-medium text-white/85">
                              <Bi t={b((d) => d.memberPhoneLabel)} />
                            </span>
                            {!memberState.hasPhone ? (
                              <p className="mb-2 text-xs text-white/60">
                                <Bi t={b((d) => d.memberPhoneNoFile)} />
                              </p>
                            ) : null}
                            <div className="flex gap-2">
                              <input
                                className={inputClass}
                                value={memberPhone}
                                inputMode="tel"
                                autoComplete="tel"
                                onChange={(e) => setMemberPhone(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    confirmMemberPhone();
                                  }
                                }}
                                placeholder={T.fPhonePh}
                              />
                              <button
                                type="button"
                                onClick={confirmMemberPhone}
                                disabled={!memberPhone.trim() || memberState.status === "confirming"}
                                className="h-12 shrink-0 rounded-xl bg-emerald-500 px-3 text-sm font-bold leading-tight text-white transition hover:bg-emerald-400 disabled:opacity-50"
                              >
                                {memberState.status === "confirming" ? "…" : <Bi t={b((d) => d.memberConfirm)} />}
                              </button>
                            </div>
                            {memberState.status === "codeOk" && memberState.error ? (
                              <p className="mt-2 text-sm font-semibold text-red-400">
                                <Bi t={b((d) => d.err[memberState.error as BaoBayErrKey])} />
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <>
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
                                /* Tự sửa về dạng chuẩn "HNAA-05" khi RỜI ô — sửa theo
                                   từng phím thì con trỏ nhảy lung tung */
                                onBlur={(e) => setMemberCode(memberCodeDisplay(e.target.value.trim()))}
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
                                className="h-12 shrink-0 rounded-xl bg-emerald-500 px-3 text-sm font-bold leading-tight text-white transition hover:bg-emerald-400 disabled:opacity-50"
                              >
                                <Bi t={b((d) => (memberState.status === "checking" ? d.hnaaChecking : d.hnaaCheck))} />
                              </button>
                            </div>
                            {memberState.status === "wrong" ? (
                              <div className="mt-2 text-sm">
                                <span className="font-bold text-red-400">
                                  <Bi t={b((d) => d.hnaaWrong)} />
                                </span>{" "}
                                <span className="text-white/65">
                                  <Bi t={b((d) => d.hnaaWrongContinue)} />
                                </span>
                              </div>
                            ) : null}
                            {memberState.status === "rate" ? (
                              <p className="mt-2 text-sm text-red-400">
                                <Bi t={b((d) => d.err.rate)} />
                              </p>
                            ) : null}
                          </>
                        )}
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
                  {/* Người Việt / người nước ngoài — người thường bắt buộc chọn (chủ 30/09).
                      HỘI VIÊN HNAA thì KHÔNG hỏi: quốc tịch lấy từ danh sách hội (chủ 01/10:
                      "chỉ cần điền mã là được"). */}
                  {!verifiedMember ? (
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
                  ) : null}

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

                  {/* EMAIL: không bắt buộc, hiện cả với hội viên HNAA (các ô khác của hội
                      viên đã ẩn). Hội viên để trống thì máy chủ dùng email trong danh sách
                      hội để gửi thư — email ấy KHÔNG bao giờ hiện ra đây. */}
                  <div
                    className="scroll-mt-24"
                    ref={(el) => {
                      fieldRefs.current.email = el;
                    }}
                  >
                    <Field label={b((d) => d.fEmail)} hint={b((d) => d.fEmailHint)} error={errors.email}>
                      <input
                        className={inputClass}
                        value={email}
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        maxLength={120}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setErrors((er) => ({ ...er, email: undefined }));
                        }}
                        placeholder={T.fEmailPh}
                      />
                    </Field>
                  </div>

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
                          ? d.modeDay(formatVndNb(BAO_BAY_FEE_PER_DAY))
                          : m === "month"
                            ? d.modeMonth(formatVndNb(BAO_BAY_FEE_PER_MONTH))
                            : d.modeYear(formatVndNb(BAO_BAY_FEE_PER_YEAR)),
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

                {/* ---- NỘI QUY VIÊN NAM (chủ 01/10) ----
                    Ô chấp nhận BẮT BUỘC ngay trước phần trả tiền/gửi; ngay dưới là
                    khung cuộn chứa toàn văn nội quy + hai sơ đồ (chạm để phóng to). */}
                {spot === "vien-nam" ? (
                  <div
                    id="rules"
                    className="mt-5 scroll-mt-24"
                    ref={(el) => {
                      fieldRefs.current.rules = el;
                    }}
                  >
                    <label
                      className={[
                        "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition",
                        rulesAccepted
                          ? "border-emerald-400/70 bg-emerald-400/15"
                          : "border-amber-400/60 bg-amber-400/10 hover:bg-amber-400/15",
                      ].join(" ")}
                    >
                      <input
                        type="checkbox"
                        checked={rulesAccepted}
                        onChange={(e) => {
                          setRulesAccepted(e.target.checked);
                          setErrors((er) => ({ ...er, rules: undefined }));
                        }}
                        className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-500"
                      />
                      <span className="text-[15px] font-bold text-white">
                        <Bi t={b((d) => d.rulesAccept)} />
                        <span className="ml-1 text-amber-400">*</span>
                      </span>
                    </label>
                    {errors.rules ? <p className="mt-2 text-sm text-red-400">{errors.rules}</p> : null}
                    {rulesBox()}
                  </div>
                ) : null}

                {/* ---- TRẢ TIỀN TRƯỚC KHI GỬI (chủ 30/09) ----
                    Tổng 0 đ thì không có khối này, gửi thẳng. Có tiền thì QR +
                    tài khoản + nội dung CK ngay đây, và ô xác nhận bắt buộc. */}
                {needsPay ? (
                  <div className="mt-5 rounded-2xl border border-white/15 bg-white/[0.06] p-5">
                    <div className="text-center text-xs font-bold uppercase tracking-[.15em] text-amber-300">
                      <Bi t={b((d) => d.payBeforeTitle)} />
                    </div>
                    <div className="mt-1 whitespace-nowrap text-center text-3xl font-extrabold text-amber-300">{formatVndNb(payTotal)}</div>
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
                  disabled={
                    submitting ||
                    memberPending ||
                    (needsPay && (!paidConfirmed || quote.loading)) ||
                    // Viên Nam: phải tích chấp nhận Nội quy mới gửi được
                    (spot === "vien-nam" && !rulesAccepted)
                  }
                  onClick={submit}
                  className="cta-btn flex min-h-14 w-full max-w-sm flex-col items-center justify-center rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 py-2 text-lg font-extrabold text-black shadow-[0_10px_36px_rgba(251,191,36,.3)] transition hover:brightness-110 disabled:opacity-60"
                >
                  <Bi t={b((d) => (submitting ? d.submitting : d.submit))} />
                </button>
                {memberPending ? (
                  <p className="text-center text-sm font-semibold text-red-300">
                    <Bi t={b((d) => d.memberPendingBlock)} />
                  </p>
                ) : null}
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

      {/* ============ KIẾN THỨC DÙ LƯỢN ============
          Link công khai qua locale-link để giữ tiền tố /en, /fr… */}
      <section className="relative bg-[#0B0A08] pb-10">
        <div className="mx-auto max-w-3xl px-4">
          <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-bold text-white">
                📚 <Bi t={b((d) => d.knowTitle)} inline />
              </h2>
              <Link href="/knowledge" className="text-sm font-semibold text-amber-300 underline underline-offset-4">
                <Bi t={b((d) => d.knowMain)} inline /> →
              </Link>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {/* Bài của ĐIỂM ĐANG CHỌN đứng đầu (chủ 01/10), đổi theo điểm; sau đó
                  vài bài chung cho phi công bay đơn */}
              {(spot ? BAO_BAY_SITE_POSTS[spot] : []).map((p) => (
                <Link
                  key={p.href}
                  href={p.href}
                  className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] px-3 py-2.5 text-sm font-semibold text-white/90 transition hover:border-amber-400/60 hover:bg-amber-400/[0.12]"
                >
                  <span>{p.icon}</span>
                  <span className="min-w-0">
                    {isVi ? <Bi t={{ main: p.vi, sub: p.en }} /> : p.en}
                  </span>
                </Link>
              ))}
              {BAO_BAY_KNOWLEDGE_LINKS.filter((k) => BAO_BAY_GENERAL_KNOWLEDGE.includes(k.key)).map((k) => (
                <Link
                  key={k.key}
                  href={k.href}
                  className="flex items-start gap-2 rounded-xl border border-white/12 bg-white/[0.05] px-3 py-2.5 text-sm font-semibold text-white/90 transition hover:border-amber-400/50 hover:bg-white/[0.1]"
                >
                  <span>{k.icon}</span>
                  <span className="min-w-0">
                    <Bi t={b((d) => d.knowLinks[k.key])} />
                  </span>
                </Link>
              ))}
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
      {/* Ảnh sơ đồ phóng to — chạm bất kỳ đâu để đóng */}
      {zoomImg ? (
        <button
          type="button"
          onClick={() => setZoomImg("")}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-2"
          aria-label="Close"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoomImg} alt="" className="max-h-full max-w-full object-contain" />
        </button>
      ) : null}
    </main>
  );
}
