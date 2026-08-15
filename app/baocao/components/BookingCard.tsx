// app/baocao/components/BookingCard.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { formatDateKeyVN, shiftDateKey, todayInVN } from "@/lib/baobay/date";
import { parseQuickBooking } from "@/lib/baobay/booking-quick-parse";
import { spotName } from "@/lib/baobay/spots";
import type { BookingDTO } from "@/lib/baobay/types";

import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "./client-api";
import { shareBookingImage } from "./booking-image";
import {
  COMMISSION_PER_GUEST,
  FLIGHT_KIND_LABEL,
  FLIGHT_KIND_SHORT,
  MOUNTAIN_CAR_PRICE,
  SERVICE_PRICE,
  SERVICE_PRICE_LABEL,
  bookingTotal as computeBookingTotal,
  defaultFlightKind,
  flightKindsOf,
  comboDiscount,
  flightUnitPrice,
  priceNote,
  servicesAmount,
  type FlightKind,
} from "@/lib/baobay/flight-price";
import { Banner, Button, CollapseCard, CountInput, Field, MoneyInput, ServiceBox, TextInput } from "./ui";

/**
 * Bấm "Sửa" ở banner booking hôm nay thì thẻ 📒 BOOKING MỚI (ở dưới, có thể
 * đang gập) phải mở ra và nạp đúng booking đó. Hai mảnh này là hai component
 * đứng cạnh nhau, không cha con, nên nói với nhau bằng một sự kiện của trang —
 * gọn hơn là kéo trạng thái lên tận trang rồi truyền xuống hai nhánh.
 */
const EDIT_EVENT = "baobay:edit-booking";

function requestEditBooking(b: BookingDTO) {
  window.dispatchEvent(new CustomEvent<BookingDTO>(EDIT_EVENT, { detail: b }));
}

/**
 * BOOKING đặt trước: khách chốt hôm nay nhưng bay ngày khác (qua Klook, FB,
 * Zalo…). Điều phối nhập NGAY HÔM KHÁCH ĐẶT — thời điểm nhập tự ghi lại.
 *
 * Hai mảnh dùng chung API /api/baocao/booking:
 *  - `BookingTodayBanner`: đầu trang điều phối — booking bay ĐÚNG ngày đang
 *    xem, kèm nút "✓ Hoàn thành" để ẩn sau khi bay xong.
 *  - `BookingCard`: thẻ nhập booking mới + danh sách chữ nhỏ các booking sắp tới.
 */

export const BOOKING_SOURCES = ["TẠI CHỖ", "Facebook", "TikTok", "Zalo", "Klook", "SEEK", "GYG", "KKday"];

const PICKUP_LABEL: Record<BookingDTO["pickup"], string> = {
  self: "tự đến",
  bigc: "đón BigC",
  hotel: "đón KS",
  other: "đón",
};

/** "20/08 · Klook #KLK123 · anh Tú · 2 khách · 1×cam360 · đón KS 09:30 · cọc 500k" */
function BookingSummary({ b, withDate, dim }: { b: BookingDTO; withDate?: boolean; dim?: boolean }) {
  /**
   * Ba thứ quầy phải đọc được ngay giữa một dòng dài: TÊN KHÁCH, SỐ ĐIỆN THOẠI
   * và CÒN THU. Tách khỏi chuỗi chữ xám để tô nền riêng, phần còn lại vẫn là
   * chữ nhỏ liền mạch cho gọn.
   */
  const head: string[] = [];
  if (withDate) head.push(formatDateKeyVN(b.flightDate));
  head.push([b.source, b.bookingCode && `#${b.bookingCode}`].filter(Boolean).join(" ") || "booking");

  const parts: string[] = [];
  parts.push(`${b.guestCount} khách`);
  if (b.flycam) parts.push(`${b.flycam}×flycam`);
  if (b.video360) parts.push(`${b.video360}×cam360`);
  if (b.redFlag) parts.push(`${b.redFlag}×cờ đỏ`);
  if (b.sunset) parts.push(`${b.sunset}×hoàng hôn/săn mây`);
  if (b.mountainCar) parts.push(`${b.mountainCar}×xe núi`);
  if ((b.ppgGuests ?? 0) > 0 && b.guestCount > (b.ppgGuests ?? 0)) {
    parts.push(`${b.guestCount - (b.ppgGuests ?? 0)}PG + ${b.ppgGuests}PPG`);
  } else if (b.flightKind && b.flightKind !== "pg") {
    parts.push(FLIGHT_KIND_SHORT[b.flightKind]);
  }
  if (b.flagFlight) parts.push(`${b.flagFlight}×kéo cờ`);
  parts.push(
    [b.pickup === "other" ? `đón ${b.pickupNote || "?"}` : PICKUP_LABEL[b.pickup], b.expectedTime]
      .filter(Boolean)
      .join(" "),
  );
  if (b.totalAmount) parts.push(`tổng ${Math.round(b.totalAmount / 1000).toLocaleString("vi-VN")}k`);
  if (b.deposit) parts.push(`cọc ${Math.round(b.deposit / 1000).toLocaleString("vi-VN")}k`);
  /** "còn thu" tách khỏi chuỗi để tô ĐỎ — đây là số quầy phải nhớ thu trước khi bay. */
  const tail: string[] = [];
  if (b.transferCode) tail.push(`CK #${b.transferCode}`);
  if (b.depositToCompany) tail.push("cọc → TK cty");
  if (b.note) tail.push(b.note);

  return (
    <span className={dim ? "text-xs leading-snug text-slate-500" : "text-sm leading-snug text-slate-700"}>
      {/* SỐ THỨ TỰ trong ngày — đỏ đậm, đứng đầu, KHÔNG đổi kể cả đã bay/huỷ */}
      {b.daySeq > 0 && (
        <strong className="mr-1 rounded bg-red-600 px-1.5 font-bold text-white">{b.daySeq}</strong>
      )}
      {head.filter(Boolean).join(" · ")}
      {b.contactName ? (
        <>
          {" · "}
          <strong className="rounded bg-sky-100 px-1 font-bold text-sky-900">{b.contactName}</strong>
        </>
      ) : null}
      {b.phone ? (
        <>
          {" · "}
          <strong className="rounded bg-amber-100 px-1 font-bold tabular-nums text-amber-900">📞 {b.phone}</strong>
        </>
      ) : null}
      {" · "}
      {parts.filter(Boolean).join(" · ")}
      {b.remaining ? (
        <>
          {" · "}
          <strong className="rounded bg-rose-100 px-1 font-bold text-rose-700">
            còn thu {Math.round(b.remaining / 1000).toLocaleString("vi-VN")}k
          </strong>
        </>
      ) : null}
      {tail.length ? ` · ${tail.join(" · ")}` : ""}
      {/* Vệt thu tiền — in ĐẬM vì đây là câu trả lời cho "tiền booking này đâu rồi" */}
      {(b.collected ?? []).map((c, i) => (
        <strong key={i} className="ml-1 whitespace-nowrap rounded bg-emerald-100 px-1 font-bold text-emerald-800">
          đã thu {Math.round(c.amount / 1000).toLocaleString("vi-VN")}k {c.method === "cash" ? "TM" : "CK"}
          {c.byName ? ` - ${c.byName}` : ""}
        </strong>
      ))}
    </span>
  );
}

/** "HH:MM" hiện tại theo giờ Việt Nam — giờ dự kiến hôm nay không được sớm hơn. */
function nowHHMMVN(): string {
  return new Date().toLocaleTimeString("en-GB", { hour12: false, timeZone: "Asia/Ho_Chi_Minh" }).slice(0, 5);
}

/** Giờ nhập booking, hiện d/m + giờ VN — "13/08 20:15". */
function stampVN(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });
}

/** Người được giao lịch — badge tím hiện ở mọi nơi booking xuất hiện. */
function AssignedBadge({ b }: { b: BookingDTO }) {
  if (!b.assignedToName) return null;
  return (
    <span className="ml-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-800">
      → giao cho {b.assignedToName}
    </span>
  );
}

/**
 * Nút "⇢ Chuyển": xổ danh sách nhân sự ĐANG LÀM VIỆC tại điểm, chọn một người
 * rồi bấm chuyển — booking hiện lên trang của người đó (đón khách, tiếp khách,
 * có SĐT để gọi).
 */
function AssignControl({
  spot,
  booking,
  onDone,
  buttonClassName,
}: {
  spot: string;
  booking: BookingDTO;
  onDone: () => void;
  /** Xếp nút vào đúng ô của lưới nút (vd. cột phải, dưới nút Sửa). */
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [staff, setStaff] = useState<Array<{ username: string; name: string; roleLabel: string }>>([]);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openList() {
    setOpen(true);
    setError(null);
    if (staff.length) return;
    try {
      // Danh sách TẤT CẢ nhân sự đang làm tại điểm (phi công, camera man, kế toán…)
      const r = await apiGet<{ staff: Array<{ username: string; name: string; roleLabel: string }> }>(
        `/api/baocao/booking?date=${todayInVN()}&spot=${spot}`,
      );
      setStaff(r.staff ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không tải được danh sách nhân sự");
    }
  }

  async function send() {
    if (!pick) return;
    setBusy(true);
    setError(null);
    try {
      await apiPatch(`/api/baocao/booking?spot=${spot}`, { id: booking.id, action: "assign", assignee: pick });
      setOpen(false);
      setPick("");
      onDone();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không chuyển được");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={openList}
        className={
          "h-7 rounded-lg border border-slate-300 bg-white px-2 text-xs font-medium text-slate-600 hover:border-indigo-500 hover:text-indigo-700" +
          (buttonClassName ? ` ${buttonClassName}` : "")
        }
      >
        {booking.assignedToName ? "⇢ Chuyển người khác" : "⇢ Chuyển"}
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={pick}
        onChange={(e) => setPick(e.target.value)}
        className="h-9 min-w-44 flex-1 rounded-lg border border-indigo-300 bg-white px-2 text-sm"
      >
        <option value="">— chọn nhân sự tiếp nhận —</option>
        {staff.map((a) => (
          <option key={a.username} value={a.username}>
            {a.name} — {a.roleLabel}
          </option>
        ))}
      </select>
      <Button type="button" className="h-9 px-3 text-xs" disabled={busy || !pick} onClick={send}>
        {busy ? "Đang chuyển…" : "✓ Chuyển"}
      </Button>
      <Button type="button" variant="ghost" className="h-9 bg-white px-3 text-xs" onClick={() => setOpen(false)}>
        Thôi
      </Button>
      {error && <span className="w-full text-xs text-rose-600">{error}</span>}
    </div>
  );
}


/**
 * CỤM NÚT ÍT DÙNG của một dòng booking — bấm "⋯ Thêm" mới xổ.
 *
 * Trước đây năm nút nằm phơi hết trên dòng, đọc thông tin khách phải len lỏi
 * giữa rừng nút. Việc làm thường xuyên (Đã bay · Thu tiền · Xuất vé) vẫn để
 * ngoài; đổi lịch, chuyển người, huỷ, sửa, chiết khấu nằm trong này.
 */
function RowMenu({
  spot,
  booking,
  onMove,
  onEdit,
  onDone,
}: {
  spot: string;
  booking: BookingDTO;
  onMove: () => void;
  onEdit: () => void;
  onDone: (message?: string) => void;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        className={
          "h-7 bg-white px-2 text-xs " + (booking.commission ? "border-violet-400 text-violet-800" : "")
        }
        onClick={() => setOpen(true)}
        title="Đổi lịch · Chuyển người · Chiết khấu đại lý · Huỷ · Sửa"
      >
        ⋯ Thêm{booking.commission ? " 🤝" : ""}
      </Button>
    );
  }

  return (
    <div className="w-56 rounded-xl border border-slate-300 bg-white p-1.5 shadow-lg">
      <button
        type="button"
        className="w-full rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100"
        onClick={() => {
          onMove();
          setOpen(false);
        }}
      >
        ⇢ Đổi lịch bay
      </button>
      <div className="px-1 py-0.5">
        <AssignControl
          spot={spot}
          booking={booking}
          onDone={() => {
            onDone();
            setOpen(false);
          }}
          buttonClassName="w-full justify-start"
        />
      </div>
      {/* Chiết khấu chỉ có ở Khau Phạ — nơi khách đi theo đại lý / hướng dẫn viên */}
      {spot === "khau-pha" && (
        <div className="px-1 py-0.5">
          <CommissionControl
            spot={spot}
            booking={booking}
            onDone={(m) => {
              onDone(m);
              setOpen(false);
            }}
          />
        </div>
      )}
      <div className="px-1 py-0.5">
        <CancelBookingControl
          spot={spot}
          booking={booking}
          onDone={(m) => {
            onDone(m);
            setOpen(false);
          }}
        />
      </div>
      <button
        type="button"
        className="w-full rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100"
        onClick={() => {
          onEdit();
          setOpen(false);
        }}
      >
        ✎ Sửa thông tin booking
      </button>
      <button
        type="button"
        className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50"
        onClick={() => setOpen(false)}
      >
        Đóng
      </button>
    </div>
  );
}

/**
 * CHI CHIẾT KHẤU cho đại lý / hướng dẫn viên dẫn đoàn.
 *
 * Khoản TRẢ NGOÀI: không cộng vào tiền khách, KHÔNG lên phiếu gửi khách. Mặc
 * định 150k/khách nhưng sửa được vì mỗi đại lý một mức thoả thuận.
 */
function CommissionControl({
  spot,
  booking,
  onDone,
}: {
  spot: string;
  booking: BookingDTO;
  onDone: (message: string) => void;
}) {
  const paid = booking.commission;
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(paid?.amount || booking.guestCount * COMMISSION_PER_GUEST);
  const [method, setMethod] = useState<"cash" | "transfer">(paid?.method ?? "cash");
  const [code, setCode] = useState(paid?.transferCode ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (amount <= 0) return setError("Chưa nhập số tiền chiết khấu");
    if (method === "transfer" && !code.trim()) return setError("Chuyển khoản phải ghi mã giao dịch");
    setBusy(true);
    setError(null);
    try {
      await apiPatch(`/api/baocao/booking?spot=${spot}`, {
        id: booking.id,
        action: "commission",
        amount,
        method,
        transferCode: code,
      });
      onDone(
        method === "cash"
          ? `✓ Đã chi chiết khấu ${amount.toLocaleString("vi-VN")} đ tiền mặt — trừ vào tiền bạn đang giữ.`
          : `✓ Đã ghi chiết khấu ${amount.toLocaleString("vi-VN")} đ chuyển khoản từ TK công ty (#${code}).`,
      );
      setOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không ghi nhận được khoản chi");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className={
          "w-full rounded-lg px-2 py-1.5 text-left text-xs font-semibold " +
          (paid ? "bg-violet-100 text-violet-900" : "text-slate-700 hover:bg-slate-100")
        }
        onClick={() => {
          setAmount(paid?.amount || booking.guestCount * COMMISSION_PER_GUEST);
          setMethod(paid?.method ?? "cash");
          setCode(paid?.transferCode ?? "");
          setOpen(true);
          setError(null);
        }}
      >
        {paid
          ? `🤝 CK đại lý: ${(paid.amount / 1000).toLocaleString("vi-VN")}k ${paid.method === "cash" ? "TM" : "CK"} — sửa`
          : "🤝 Chiết khấu đại lý"}
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-violet-300 bg-violet-50 p-2">
      <div className="text-[11px] font-bold text-violet-900">
        Chiết khấu trả đại lý — {booking.guestCount} khách × {(COMMISSION_PER_GUEST / 1000).toLocaleString("vi-VN")}k
      </div>
      <p className="mb-1 text-[10px] leading-tight text-violet-900/70">Khoản trả ngoài — không hiện trên phiếu khách.</p>
      <MoneyInput value={amount} onChange={setAmount} />
      <div className="mt-1 flex overflow-hidden rounded-lg border border-slate-300">
        {(["cash", "transfer"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMethod(m)}
            className={
              method === m
                ? "flex-1 bg-violet-600 py-1 text-xs font-bold text-white"
                : "flex-1 bg-white py-1 text-xs font-medium text-slate-500"
            }
          >
            {m === "cash" ? "Tiền mặt (trừ tiền tôi giữ)" : "CK từ TK công ty"}
          </button>
        ))}
      </div>
      {method === "transfer" && (
        <TextInput
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Mã giao dịch CK"
          className="mt-1 h-8 rounded-lg text-xs"
        />
      )}
      {error && <div className="mt-1 text-[11px] font-semibold text-rose-700">{error}</div>}
      <div className="mt-1.5 flex gap-1">
        <Button type="button" className="h-8 flex-1 bg-violet-600 px-2 text-xs hover:bg-violet-700" disabled={busy} onClick={send}>
          {busy ? "Đang ghi…" : "✓ Xác nhận chi"}
        </Button>
        <Button type="button" variant="ghost" className="h-8 bg-white px-2 text-xs" onClick={() => setOpen(false)}>
          Thôi
        </Button>
      </div>
    </div>
  );
}

/**
 * Nút 💵 THU TIỀN dùng chung cho cả hai danh sách (chờ bay hôm nay + sắp tới).
 *
 * Thu được từ xa: khách chuyển khoản trước ngày bay thì điều phối/kế toán ghi
 * nhận ngay, khỏi đợi tới bãi. Hai đường tiền vẫn tách bạch — CK về TK công ty,
 * TM vào tiền giữ hộ của chính người bấm.
 */
function CollectMoneyControl({
  spot,
  booking,
  onDone,
  big,
}: {
  spot: string;
  booking: BookingDTO;
  onDone: (message: string) => void;
  /** Bản NÚT TO cho trang phi công — bấm giữa nắng, đeo găng, phải to mới trúng. */
  big?: boolean;
}) {
  const [open, setOpen] = useState(false);
  /** "deposit" = thu cọc (gõ số tuỳ ý) · "full" = thu nốt toàn bộ còn phải thu. */
  const [kind, setKind] = useState<"deposit" | "full">("full");
  const [amount, setAmount] = useState(booking.remaining || 0);
  /**
   * Ngày bay KHÔNG phải hôm nay thì khách còn ở xa — trả tiền mặt là chuyện
   * không thể, nên mặc định CHUYỂN KHOẢN. Đúng ngày bay (khách đã ở bãi) mới
   * mặc định tiền mặt. Cả hai vẫn bấm đổi được.
   */
  const collectFromAfar = booking.flightDate !== todayInVN();
  const [method, setMethod] = useState<"cash" | "transfer">(collectFromAfar ? "transfer" : "cash");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (kind === "deposit" && amount <= 0) return setError("Chưa nhập số tiền cọc");
    if (kind === "full" && (booking.remaining || 0) <= 0) return setError("Booking này không còn phải thu");
    if (method === "transfer" && !code.trim()) return setError("Chuyển khoản phải ghi mã giao dịch");
    setBusy(true);
    setError(null);
    try {
      const paid = kind === "full" ? booking.remaining || 0 : amount;
      await apiPatch(`/api/baocao/booking?spot=${spot}`, {
        id: booking.id,
        action: "collect",
        kind,
        amount: paid,
        method,
        transferCode: code,
      });
      const what = kind === "full" ? "Thu đủ" : "Thu cọc";
      onDone(
        method === "transfer"
          ? `✓ ${what} ${paid.toLocaleString("vi-VN")} đ chuyển khoản vào TK công ty.`
          : `✓ ${what} ${paid.toLocaleString("vi-VN")} đ tiền mặt — cộng vào tiền giữ hộ công ty của bạn.`,
      );
      setOpen(false);
      setCode("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không ghi nhận được khoản thu");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        className={
          big
            ? "h-11 w-full bg-rose-600 px-3 text-base font-bold text-white hover:bg-rose-700"
            : "h-7 bg-rose-600 px-2 text-xs font-bold text-white hover:bg-rose-700"
        }
        title="Thu tiền cho booking này — tiền mặt tại bãi hoặc khách chuyển khoản trước"
        onClick={() => {
          setKind("full");
          setAmount(booking.remaining || 0);
          setMethod(collectFromAfar ? "transfer" : "cash");
          setOpen(true);
          setError(null);
        }}
      >
        {big ? "✅ ĐÃ THU — chọn tiền mặt / chuyển khoản" : "💵 Thu tiền"}
      </Button>
    );
  }

  return (
    <div className="flex w-60 flex-col gap-1 rounded-lg border border-rose-300 bg-rose-50/60 p-1.5">
      {/* Cọc = gõ số tuỳ ý · Thu đủ = lấy trọn phần còn phải thu, khỏi tự tính */}
      <div className="flex h-8 overflow-hidden rounded-lg border border-slate-300">
        {(
          [
            ["deposit", "Cọc"],
            ["full", "Thu đủ"],
          ] as Array<["deposit" | "full", string]>
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setKind(k);
              if (k === "full") setAmount(booking.remaining || 0);
            }}
            className={
              kind === k
                ? "flex-1 bg-slate-800 px-1 text-xs font-semibold text-white"
                : "flex-1 bg-white px-1 text-xs font-medium text-slate-500"
            }
          >
            {label}
          </button>
        ))}
      </div>
      {kind === "full" ? (
        <div className="flex h-10 items-center justify-end rounded-lg border-2 border-slate-300 bg-white px-3 text-base font-bold tabular-nums text-slate-900">
          {(booking.remaining || 0).toLocaleString("vi-VN")} đ
        </div>
      ) : (
        <MoneyInput value={amount} onChange={setAmount} />
      )}
      <div className="flex h-8 overflow-hidden rounded-lg border border-slate-300">
        {(
          [
            ["cash", "Tiền mặt"],
            ["transfer", "CK"],
          ] as Array<["cash" | "transfer", string]>
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setMethod(k)}
            className={
              method === k
                ? "flex-1 bg-emerald-600 px-1 text-xs font-semibold text-white"
                : "flex-1 bg-white px-1 text-xs font-medium text-slate-500"
            }
          >
            {label}
          </button>
        ))}
      </div>
      {method === "transfer" && (
        <TextInput
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Mã giao dịch ngân hàng…"
          className="h-8 rounded-lg text-xs"
        />
      )}
      <div className="text-[11px] leading-tight text-slate-600">
        {kind === "full"
          ? "Thu nốt: “đã cọc” cộng đủ, “còn thu” về 0."
          : "Thu cọc: “đã cọc” tăng, “còn thu” trừ đi tương ứng."}{" "}
        {method === "transfer" ? "Tiền vào thẳng TK CÔNG TY." : "Tiền mặt cộng vào TIỀN GIỮ HỘ của bạn."}
        {collectFromAfar && method === "cash" ? " Khách đặt trước, ở xa — chắc chắn thu được tiền mặt chứ?" : ""}
      </div>
      {error && <div className="text-[11px] font-medium leading-tight text-rose-700">{error}</div>}
      <div className="flex gap-1">
        <Button
          type="button"
          className="h-7 flex-1 bg-emerald-600 px-2 text-xs hover:bg-emerald-700"
          disabled={busy || (kind === "full" ? (booking.remaining || 0) <= 0 : amount <= 0)}
          onClick={send}
        >
          {busy ? "Đang lưu…" : "✓ Xác nhận"}
        </Button>
        <Button type="button" variant="ghost" className="h-7 bg-white px-2 text-xs" onClick={() => setOpen(false)}>
          Thôi
        </Button>
      </div>
    </div>
  );
}


/**
 * Nút ✕ HUỶ BAY kèm luồng hỏi cho đủ:
 *
 *  - Điểm có vé (Khau Phạ, Sa Pa): hỏi ĐÃ XUẤT VÉ CHƯA. Đã xuất thì phải ghi mã
 *    vé để thu hồi; chưa xuất thì bỏ qua phần mã.
 *  - Đã phát sinh tiền (cọc hoặc đã thu) mới hỏi HOÀN bao nhiêu và hoàn bằng gì:
 *    CK là tiền ra từ TK công ty, TM là nhân viên chi tại chỗ.
 *  - Booking chưa thu đồng nào: không hỏi tiền, bấm xác nhận là huỷ.
 */
function CancelBookingControl({
  spot,
  booking,
  onDone,
}: {
  spot: string;
  booking: BookingDTO;
  onDone: (message: string) => void;
}) {
  /** Số tiền khách đã trả cho booking này — mốc để đề xuất tiền hoàn. */
  const paid = booking.deposit || Math.max(0, (booking.totalAmount || 0) - (booking.remaining || 0));
  const hasTicketFlow = spot !== "ha-noi";

  const [open, setOpen] = useState(false);
  /** Cả đoàn nghỉ bay, hay chỉ vài người trong đoàn? */
  const [scope, setScope] = useState<"all" | "part">("all");
  const [partGuests, setPartGuests] = useState(1);
  const [ticketIssued, setTicketIssued] = useState(false);
  const [codes, setCodes] = useState("");
  const [refund, setRefund] = useState(paid);
  const [refundMethod, setRefundMethod] = useState<"cash" | "transfer">("transfer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (hasTicketFlow && ticketIssued && !codes.trim()) return setError("Đã xuất vé thì phải ghi mã vé thu hồi");
    if (scope === "part" && (partGuests < 1 || partGuests >= booking.guestCount)) {
      return setError(`Số khách huỷ phải từ 1 đến ${booking.guestCount - 1} (huỷ hết thì chọn “cả đoàn”)`);
    }
    setBusy(true);
    setError(null);
    try {
      if (scope === "part") {
        await apiPatch(`/api/baocao/booking?spot=${spot}`, {
          id: booking.id,
          action: "split",
          mode: "cancel",
          guests: partGuests,
          ticketIssued: hasTicketFlow ? ticketIssued : false,
          ticketCodesText: codes,
          refund: paid > 0 ? refund : 0,
          refundMethod,
        });
        onDone(
          `✓ Đã huỷ ${partGuests} khách trong đoàn (còn ${booking.guestCount - partGuests} khách bay)` +
            (refund > 0 ? `, hoàn ${refund.toLocaleString("vi-VN")} đ.` : "."),
        );
      } else {
        await apiPatch(`/api/baocao/booking?spot=${spot}`, {
          id: booking.id,
          action: "cancel",
          ticketIssued: hasTicketFlow ? ticketIssued : false,
          ticketCodesText: codes,
          refund: paid > 0 ? refund : 0,
          refundMethod,
        });
        onDone(
          paid > 0 && refund > 0
            ? `✓ Đã huỷ bay và hoàn ${refund.toLocaleString("vi-VN")} đ bằng ${refundMethod === "cash" ? "tiền mặt" : "chuyển khoản"}.`
            : "✓ Đã huỷ bay (không phát sinh hoàn tiền).",
        );
      }
      setOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không huỷ được booking");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        className="h-7 bg-white px-2 text-xs text-rose-700"
        onClick={() => {
          setRefund(paid);
          setScope("all");
          setPartGuests(1);
          setTicketIssued(false);
          setCodes("");
          setRefundMethod("transfer");
          setError(null);
          setOpen(true);
        }}
      >
        ✕ Huỷ
      </Button>
    );
  }

  return (
    <div className="flex w-60 flex-col gap-1 rounded-lg border border-rose-300 bg-rose-50/60 p-1.5">
      <div className="text-[11px] font-bold text-rose-900">
        Huỷ bay — {booking.contactName || "khách"} ({booking.guestCount} khách)
      </div>

      {/* Đoàn 10 người bay được 6 là chuyện thường — huỷ được đúng phần không bay */}
      {booking.guestCount > 1 && (
        <div className="flex h-8 overflow-hidden rounded-lg border border-slate-300">
          {(
            [
              ["all", "Huỷ cả đoàn"],
              ["part", "Huỷ một phần"],
            ] as Array<["all" | "part", string]>
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setScope(v)}
              className={
                scope === v
                  ? "flex-1 bg-rose-600 px-1 text-xs font-bold text-white"
                  : "flex-1 bg-white px-1 text-xs font-medium text-slate-500"
              }
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {scope === "part" && (
        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-900">
          Số khách huỷ:
          <MiniCount value={partGuests} onChange={setPartGuests} max={Math.max(1, booking.guestCount - 1)} />
          <span className="font-normal text-slate-500">còn {Math.max(0, booking.guestCount - partGuests)} khách bay</span>
        </label>
      )}

      {hasTicketFlow && (
        <>
          <div className="flex h-8 overflow-hidden rounded-lg border border-slate-300">
            {(
              [
                [false, "Chưa xuất vé"],
                [true, "Đã xuất vé"],
              ] as Array<[boolean, string]>
            ).map(([v, label]) => (
              <button
                key={label}
                type="button"
                onClick={() => setTicketIssued(v)}
                className={
                  ticketIssued === v
                    ? "flex-1 bg-slate-800 px-1 text-xs font-semibold text-white"
                    : "flex-1 bg-white px-1 text-xs font-medium text-slate-500"
                }
              >
                {label}
              </button>
            ))}
          </div>
          {ticketIssued && (
            <TextInput
              value={codes}
              onChange={(e) => setCodes(e.target.value.toUpperCase())}
              placeholder="Mã vé thu hồi · MBL0005 MBL0006"
              autoCapitalize="characters"
              spellCheck={false}
              className="h-8 rounded-lg text-xs"
            />
          )}
        </>
      )}

      {paid > 0 ? (
        <>
          <div className="text-[11px] leading-tight text-slate-600">
            Khách đã trả {paid.toLocaleString("vi-VN")} đ — hoàn lại:
          </div>
          <MoneyInput value={refund} onChange={setRefund} />
          <div className="flex h-8 overflow-hidden rounded-lg border border-slate-300">
            {(
              [
                ["transfer", "CK"],
                ["cash", "TM"],
              ] as Array<["transfer" | "cash", string]>
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setRefundMethod(k)}
                className={
                  refundMethod === k
                    ? "flex-1 bg-emerald-600 px-1 text-xs font-semibold text-white"
                    : "flex-1 bg-white px-1 text-xs font-medium text-slate-500"
                }
              >
                {label}
              </button>
            ))}
          </div>
          <div className="text-[11px] leading-tight text-slate-600">
            {refundMethod === "transfer"
              ? "CK: tiền hoàn ra từ TK CÔNG TY."
              : "TM: nhân viên chi tại chỗ — ghi thêm khoản chi này vào sổ THU CHI của mình."}
          </div>
        </>
      ) : (
        <div className="text-[11px] leading-tight text-slate-600">
          Booking chưa phát sinh cọc hay thanh toán — không cần hoàn tiền.
        </div>
      )}

      {error && <div className="text-[11px] font-medium leading-tight text-rose-700">{error}</div>}
      <div className="flex gap-1">
        <Button
          type="button"
          className="h-7 flex-1 bg-rose-600 px-2 text-xs hover:bg-rose-700"
          disabled={busy}
          onClick={send}
        >
          {busy ? "Đang huỷ…" : "✕ Xác nhận huỷ"}
        </Button>
        <Button type="button" variant="ghost" className="h-7 bg-white px-2 text-xs" onClick={() => setOpen(false)}>
          Thôi
        </Button>
      </div>
    </div>
  );
}

/* ================================================================== */
/* Banner đầu trang: booking bay đúng ngày đang xem                     */
/* ================================================================== */

export function BookingTodayBanner({
  spot,
  date,
  collapsible = false,
}: {
  spot: string;
  date: string;
  /** Trang kế toán: gập được — mở trang không bị choán chỗ, bấm tiêu đề mới xổ danh sách. */
  collapsible?: boolean;
}) {
  const [rows, setRows] = useState<BookingDTO[]>([]);
  const [moved, setMoved] = useState<{ bookings: number; guests: number }>({ bookings: 0, guests: 0 });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Danh sách dài thì gập lại còn 10 dòng. */
  const [showAll, setShowAll] = useState(false);
  /** id booking đang mở ô chọn ngày dời + ngày đã chọn. `guests` > 0 = chỉ dời bấy nhiêu khách. */
  const [moving, setMoving] = useState<{ id: string; toDate: string; guests?: number } | null>(null);
  /** Câu báo sau khi thu tiền xong — hiện trên đầu banner. */
  const [collectDone, setCollectDone] = useState<string | null>(null);

  const load = useCallback(() => {
    apiGet<{ forDate: BookingDTO[]; moved?: { bookings: number; guests: number } }>(
      `/api/baocao/booking?date=${date}&spot=${spot}`,
    )
      .then((r) => {
        setRows(r.forDate);
        setMoved(r.moved ?? { bookings: 0, guests: 0 });
      })
      .catch(() => {
        /* không có booking thì thôi */
      });
  }, [spot, date]);

  useEffect(() => {
    load();
    // Booking đồng nghiệp vừa nhập cũng hiện trong vòng nửa phút
    const timer = setInterval(load, 30_000);
    return () => clearInterval(timer);
  }, [load]);

  const open = rows.filter((b) => b.status === "open");
  const doneGuestsAll = rows.filter((b) => b.status === "done").reduce((t, b) => t + b.guestCount, 0);
  const cancelledGuests = rows.filter((b) => b.status === "cancelled").reduce((t, b) => t + b.guestCount, 0);
  const closed = rows.filter((b) => b.status !== "open");
  /** Ngày đông khách: chỉ hiện 10 dòng đầu, bấm mũi tên mới xổ hết. */
  const openShown = showAll ? open : open.slice(0, 10);
  if (!rows.length) return null;

  async function act(b: BookingDTO, action: "flown" | "cancel" | "move" | "ticket", toDate?: string) {
    const name = b.contactName || b.bookingCode || b.source;
    if (action === "flown" && !window.confirm(`Xác nhận khách ${name} ĐÃ BAY?`)) return;
    if (action === "cancel" && !window.confirm(`Xác nhận booking ${name} bị HUỶ? Hệ thống sẽ báo huỷ, không làm gì thêm.`)) return;
    setBusy(b.id);
    setError(null);
    try {
      await apiPatch(`/api/baocao/booking?spot=${spot}`, { id: b.id, action, toDate });
      setMoving(null);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không cập nhật được");
    } finally {
      setBusy(null);
    }
  }

  /**
   * Đếm CẢ ngày, không riêng nhóm chờ bay: xem lại ngày cũ thì đa số booking đã
   * "đã bay" — chỉ đếm chờ bay sẽ ra "1 booking" trong khi danh sách có 10.
   * Khách huỷ không tính (họ không bay), nhưng vẫn nằm trong danh sách bên dưới.
   */
  /**
   * Thống kê CẢ NGÀY ngay trên tiêu đề: tổng book (kể cả huỷ + dời đi), tổng
   * khách, rồi đã bay / dời / huỷ — nhìn một dòng là biết ngày đó chốt ra sao.
   */
  // Vé đã xuất = tổng KHÁCH của các booking đã tích 🎫 (khách huỷ không tính)
  const issuedGuests = rows
    .filter((b) => b.ticketIssued && b.status !== "cancelled")
    .reduce((t, b) => t + b.guestCount, 0);
  const stats = [
    `${rows.length + moved.bookings} Book`,
    `Tổng ${rows.reduce((t, b) => t + b.guestCount, 0) + moved.guests}k`,
    issuedGuests ? `Đã xuất vé ${issuedGuests}k` : "",
    doneGuestsAll ? `Đã bay ${doneGuestsAll}k` : "",
    moved.guests ? `Dời ${moved.guests}k` : "",
    cancelledGuests ? `Huỷ ${cancelledGuests}k` : "",
  ].filter(Boolean);
  /** Dời lịch: cả đoàn thì đổi ngày tại chỗ, một phần thì tách nhóm sang ngày mới. */
  async function moveBooking(b: BookingDTO, m: { toDate: string; guests?: number }) {
    const part = m.guests ?? 0;
    if (part <= 0) return act(b, "move", m.toDate);
    setBusy(b.id);
    setError(null);
    try {
      await apiPatch(`/api/baocao/booking?spot=${spot}`, {
        id: b.id,
        action: "split",
        mode: "move",
        guests: part,
        toDate: m.toDate,
      });
      setMoving(null);
      setCollectDone(
        `✓ Đã dời ${part} khách sang ${formatDateKeyVN(m.toDate)} — còn ${b.guestCount - part} khách bay hôm nay.`,
      );
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không dời được");
    } finally {
      setBusy(null);
    }
  }

  /** Hoàn tác: bấm nhầm "đã bay" hoặc "huỷ" thì trả booking về chờ bay. */
  async function restore(b: BookingDTO) {
    const what = b.status === "done" ? "về CHƯA BAY" : "về CHỜ BAY";
    if (!window.confirm(`Hoàn tác booking ${b.contactName || ""} ${what}?`)) return;
    setBusy(b.id);
    setError(null);
    try {
      await apiPatch(`/api/baocao/booking?spot=${spot}`, { id: b.id, action: "restore" });
      setCollectDone("✓ Đã hoàn tác — booking trở lại danh sách chờ bay.");
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không hoàn tác được");
    } finally {
      setBusy(null);
    }
  }

  const title = <>🛫 Booking bay ngày {formatDateKeyVN(date)} ({stats.join(" - ")})</>;
  const body = (
    <>
      <p className="mt-0.5 text-[11px] text-sky-800/70">
        Chỉ gồm khách ĐẶT TRƯỚC — khách đến đột xuất bay luôn thì vẫn báo số chuyến/dịch vụ trong báo cáo ngày
        như thường, không cần khớp với danh sách này.
      </p>
      {error && (
        <div className="mt-2">
          <Banner tone="error">{error}</Banner>
        </div>
      )}
      {collectDone && (
        <div className="mt-2">
          <Banner tone="success" onClose={() => setCollectDone(null)}>
            {collectDone}
          </Banner>
        </div>
      )}
      <ul className={"mt-2" + (rows.length >= 8 ? " lg:columns-2 lg:gap-x-3" : "")}>
        {openShown.map((b, i) => (
          <li key={b.id} className="mb-1.5 break-inside-avoid rounded-lg bg-white px-2.5 py-1.5" style={{ display: "flow-root" }}>
            {moving?.id === b.id ? (
              /* Khách dời lịch: chọn ngày mới — cả đoàn hoặc chỉ vài người */
              <div className="float-right ml-2 flex w-56 flex-wrap items-center justify-end gap-1 rounded-lg border border-amber-300 bg-amber-50/70 p-1.5">
                {b.guestCount > 1 && (
                  <div className="flex h-7 w-full overflow-hidden rounded-lg border border-slate-300">
                    {(
                      [
                        [0, "Dời cả đoàn"],
                        [1, "Dời một phần"],
                      ] as Array<[number, string]>
                    ).map(([v, label]) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setMoving({ ...moving, guests: v })}
                        className={
                          (moving.guests ?? 0) > 0 === (v > 0)
                            ? "flex-1 bg-amber-600 px-1 text-[11px] font-bold text-white"
                            : "flex-1 bg-white px-1 text-[11px] font-medium text-slate-500"
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
                {(moving.guests ?? 0) > 0 && (
                  <label className="flex w-full items-center gap-1.5 text-[11px] font-semibold text-amber-900">
                    Số khách dời:
                    <MiniCount
                      value={moving.guests ?? 1}
                      onChange={(v) => setMoving({ ...moving, guests: Math.min(v, b.guestCount - 1) })}
                      max={Math.max(1, b.guestCount - 1)}
                    />
                  </label>
                )}
                <input
                  type="date"
                  value={moving.toDate}
                  min={shiftDateKey(todayInVN(), 1)}
                  onChange={(e) => setMoving({ ...moving, toDate: e.target.value })}
                  className="h-8 flex-1 rounded-lg border border-slate-300 bg-white px-2 text-xs"
                />
                <Button
                  type="button"
                  className="h-7 px-2 text-xs"
                  disabled={busy === b.id || !moving.toDate}
                  onClick={() => moveBooking(b, moving)}
                >
                  {busy === b.id ? "Đang lưu…" : "✓ Đổi"}
                </Button>
                <Button type="button" variant="ghost" className="h-7 bg-white px-2 text-xs" onClick={() => setMoving(null)}>
                  Thôi
                </Button>
              </div>
            ) : (
              /* Hai khối nút NỔI riêng: hàng trên Đã bay · Đổi lịch · Chuyển, hàng
                 dưới Huỷ · Sửa (hẹp hơn) — chữ chảy quanh, tràn tới sát nút Huỷ. */
              <>
              <div className="float-right ml-2 flex items-center gap-1">
                <Button
                  type="button"
                  className="h-7 bg-emerald-600 px-2 text-xs hover:bg-emerald-700"
                  disabled={busy === b.id}
                  onClick={() => act(b, "flown")}
                >
                  {busy === b.id ? "Đang lưu…" : "✈ Đã bay"}
                </Button>
                <RowMenu
                  booking={b}
                  spot={spot}
                  onMove={() => setMoving({ id: b.id, toDate: "" })}
                  onEdit={() => requestEditBooking(b)}
                  onDone={(msg) => {
                    if (msg) setCollectDone(msg);
                    load();
                  }}
                />
              </div>
              <div className="float-right clear-right ml-2 mt-1 flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  className={
                    "h-7 px-2 text-xs font-semibold " +
                    (b.ticketIssued
                      ? "border-amber-400 bg-amber-100 text-amber-900"
                      : "bg-white text-slate-600")
                  }
                  disabled={busy === b.id}
                  onClick={() => act(b, "ticket")}
                  title={
                    b.ticketIssued
                      ? `Đã xuất vé${b.ticketIssuedBy ? ` (${b.ticketIssuedBy})` : ""} — bấm để bỏ tích nếu lỡ tay`
                      : "Khách đến lấy vé thì bấm — để cả quầy biết ai lấy vé rồi"
                  }
                >
                  {b.ticketIssued ? "🎫 Đã xuất vé ✓" : "🎫 Xuất vé"}
                </Button>
                <CollectMoneyControl
                  spot={spot}
                  booking={b}
                  onDone={(msg) => {
                    setCollectDone(msg);
                    load();
                  }}
                />
              </div>
              </>
            )}
            <div className="min-w-0">
              {/* Số thứ tự đỏ — gọi nhau "booking số 3" là biết ngay dòng nào */}
              <span className="mr-1 text-sm font-bold tabular-nums text-rose-600">{i + 1}.</span>
              <BookingSummary b={b} />
              <AssignedBadge b={b} />
              {b.rescheduledFrom.length > 0 && (
                <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                  dời từ {b.rescheduledFrom.map((d) => formatDateKeyVN(d)).join(", ")}
                </span>
              )}
              <span className="ml-1 text-xs text-slate-400">
                — nhập {stampVN(b.createdAt)} bởi {b.createdByName}
              </span>
            </div>
          </li>
        ))}
        {open.length > 10 && (
          <li className="mt-1">
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="w-full rounded-lg border border-sky-300 bg-white py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-50"
            >
              {showAll ? "▴ Thu gọn danh sách" : `▾ Xem thêm ${open.length - 10} booking`}
            </button>
          </li>
        )}
        {closed.map((b) => (
          <li key={b.id} className="mb-1.5 flow-root break-inside-avoid rounded-lg bg-white/70 px-3 py-1.5">
            {/* ĐÃ BAY / ĐÃ HUỶ vẫn sửa và thu tiền được: tiền của chuyến bám vào
                đúng booking này, chặn lại là kế toán phải ghi tay ra ngoài sổ. */}
            <div className="float-right ml-2 flex items-center gap-1">
              <CollectMoneyControl
                spot={spot}
                booking={b}
                onDone={(msg) => {
                  setCollectDone(msg);
                  load();
                }}
              />
              <Button
                type="button"
                variant="ghost"
                className="h-7 bg-white px-2 text-xs"
                onClick={() => requestEditBooking(b)}
              >
                ✎ Sửa
              </Button>
            </div>
            {/* Bấm nhầm thì có đường lui — khỏi tạo booking mới để chữa (sổ đếm hai lần) */}
            <Button
              type="button"
              variant="ghost"
              className="float-right ml-2 h-7 bg-white px-2 text-xs font-semibold text-slate-600"
              disabled={busy === b.id}
              onClick={() => restore(b)}
              title="Trả booking về danh sách chờ bay"
            >
              {b.status === "done" ? "↩ Chưa bay" : "↩ Bay lại"}
            </Button>
            {b.status === "done" ? (
              <span className="mr-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                đã bay ✓
              </span>
            ) : (
              <span className="mr-1.5 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                đã huỷ
                {b.refundAmount
                  ? ` · hoàn ${Math.round(b.refundAmount / 1000).toLocaleString("vi-VN")}k ${b.refundMethod === "cash" ? "TM" : "CK"}`
                  : ""}
                {b.cancelTicketCodes?.length ? ` · thu hồi ${b.cancelTicketCodes.join(" ")}` : ""}
              </span>
            )}
            <BookingSummary b={b} dim={b.status === "done"} />
          </li>
        ))}
      </ul>
    </>
  );

  if (collapsible) {
    return (
      <details className="group rounded-2xl border-2 border-sky-400 bg-sky-50 lg:[column-span:all]">
        <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2.5">
          <span className="text-sm font-bold text-sky-900">{title}</span>
          <span aria-hidden className="text-sky-700 transition-transform group-open:rotate-180">▾</span>
        </summary>
        <div className="border-t border-sky-200 px-3 pb-3">{body}</div>
      </details>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-sky-400 bg-sky-50 p-3 lg:[column-span:all]">
      <h2 className="text-sm font-bold text-sky-900">{title}</h2>
      {body}
    </div>
  );
}

/* ================================================================== */
/* Trang phi công / camera man: lịch ĐƯỢC GIAO cho mình                 */
/* ================================================================== */

/**
 * Banner "lịch được giao cho bạn" — máy chủ tự lọc theo tài khoản đang đăng
 * nhập (phi công/camera man chỉ thấy booking điều phối đã chuyển cho mình).
 */
export function AssignedBookings({
  spot,
  date,
  me,
}: {
  spot: string;
  date: string;
  /** Tài khoản đang đăng nhập — để tách "khách của tôi" khỏi "khách của nhóm". */
  me?: string;
}) {
  const [forDate, setForDate] = useState<BookingDTO[]>([]);
  const [upcoming, setUpcoming] = useState<BookingDTO[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = () =>
      apiGet<{ forDate: BookingDTO[]; upcoming: BookingDTO[] }>(`/api/baocao/booking?date=${date}&spot=${spot}`)
        .then((r) => {
          if (!alive) return;
          setForDate(r.forDate);
          setUpcoming(r.upcoming.filter((b) => b.flightDate !== date));
        })
        .catch(() => {
          /* chưa được giao lịch nào thì thôi */
        });
    load();
    const timer = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [spot, date, tick]);

  /** Bấm XÁC NHẬN: điều phối biết mình đã đọc lịch và nhận khách. */
  async function accept(b: BookingDTO) {
    setBusy(b.id);
    setMsg(null);
    try {
      await apiPatch(`/api/baocao/booking?spot=${spot}`, { id: b.id, action: "accept" });
      setMsg(`✓ Đã xác nhận nhận khách ${b.contactName || b.bookingCode || ""}.`);
      setTick((n) => n + 1);
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Không xác nhận được");
    } finally {
      setBusy(null);
    }
  }

  if (!forDate.length && !upcoming.length) return null;

  /** Khách của MÌNH đứng trước, khách của đồng đội xếp sau (vẫn xem/thu hộ được). */
  const isMine = (b: BookingDTO) => Boolean(me) && b.assignedToUsername === me;
  /** Máy chủ chỉ trả khách của mình ở Khau Phạ — nhận ra bằng chính dữ liệu nhận được. */
  const crewView = forDate.some((b) => !isMine(b));
  const mine = forDate.filter((b) => isMine(b) && b.status === "open");
  const ordered = [...forDate].sort((a, b) => Number(isMine(b)) - Number(isMine(a)));

  // Nhắc trước 3 ngày: booking đã giao cho mình bay trong hôm nay + 3 ngày tới
  const today = todayInVN();
  const soonLimit = shiftDateKey(today, 3);
  const soon = upcoming.filter((b) => b.flightDate <= soonLimit);
  const later = upcoming.filter((b) => b.flightDate > soonLimit);
  const soonByDate = soon.reduce<Record<string, BookingDTO[]>>((acc, b) => {
    (acc[b.flightDate] ??= []).push(b);
    return acc;
  }, {});

  return (
    <div className="rounded-2xl border-2 border-indigo-400 bg-indigo-50 p-3 lg:[column-span:all]">
      {msg && (
        <div className="mb-2 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-sm font-semibold text-emerald-800">
          {msg}
        </div>
      )}
      {forDate.length > 0 && (
        <>
          <h2 className="text-sm font-bold text-indigo-900">
            🤝 Khách bay ngày {formatDateKeyVN(date)} —{" "}
            {crewView
              ? `của bạn ${mine.length}/${forDate.filter((b) => b.status === "open").length} khách`
              : `${mine.length} khách giao cho bạn`}
          </h2>
          <p className="text-[11px] leading-tight text-indigo-900/70">
            {crewView
              ? "Cả nhóm bay hôm nay nhìn chung một danh sách: chuyển khách cho nhau và thu tiền hộ nhau được."
              : "Chỉ hiện khách điều phối giao cho bạn. Giá cả và nguồn khách do quầy giữ."}
          </p>
          <ul className="mt-2 space-y-1.5">
            {ordered.map((b) => (
              <li key={b.id} className={"rounded-lg bg-white px-3 py-1.5" + (b.status !== "open" ? " opacity-60" : "")}>
                {b.status === "done" && (
                  <span className="mr-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">đã bay ✓</span>
                )}
                {b.status === "cancelled" && (
                  <span className="mr-1.5 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">đã huỷ</span>
                )}
                {!isMine(b) && b.assignedToName && (
                  <span className="mr-1.5 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                    khách của {b.assignedToName}
                  </span>
                )}
                <BookingSummary b={b} dim={b.status === "done"} />
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                  <span>giao bởi {b.assignedBy || "điều phối"}</span>
                  {/* Nhóm tự san khách tại bãi — khỏi gọi điều phối mỗi lần đổi */}
                  {b.status === "open" && (
                    <AssignControl spot={spot} booking={b} onDone={() => setTick((n) => n + 1)} />
                  )}
                </div>

                {b.status === "open" && (
                  <>
                    {/* Chưa bấm nhận: nút TO — điều phối cần biết mình đã đọc lịch */}
                    {!isMine(b) ? null : !b.acceptedAt ? (
                      <button
                        type="button"
                        disabled={busy === b.id}
                        onClick={() => accept(b)}
                        className="mt-1.5 w-full rounded-xl bg-indigo-600 px-3 py-2.5 text-base font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
                      >
                        {busy === b.id ? "Đang xác nhận…" : "🙋 Bạn được giao khách — BẤM XÁC NHẬN"}
                      </button>
                    ) : (
                      <div className="mt-1 text-xs font-semibold text-emerald-700">
                        ✓ Bạn đã nhận khách này{b.acceptedBy ? ` (${b.acceptedBy})` : ""}
                      </div>
                    )}

                    {/* Còn phải thu: nhắc TO, kèm nút thu ngay tại đây */}
                    {b.remaining > 0 && (
                      <div
                        className={
                          "mt-1.5 rounded-xl px-3 py-2 " +
                          (isMine(b) ? "border-2 border-rose-400 bg-rose-50" : "border border-slate-300 bg-slate-50")
                        }
                      >
                        <div
                          className={
                            isMine(b)
                              ? "text-base font-bold leading-snug text-rose-800"
                              : "text-sm font-semibold leading-snug text-slate-700"
                          }
                        >
                          {isMine(b)
                            ? `💰 Bạn nhớ thu tiền khách này: ${b.remaining.toLocaleString("vi-VN")} đ`
                            : `💰 Khách của ${b.assignedToName || "đồng đội"} còn thu ${b.remaining.toLocaleString("vi-VN")} đ — thu hộ được`}
                        </div>
                        <p className="mt-0.5 text-[11px] leading-tight text-rose-900/70">
                          Thu tiền mặt thì tiền tính vào phần bạn đang giữ · khách chuyển khoản vào TK công ty thì
                          KHÔNG tính vào bạn (nhớ ghi mã giao dịch).
                        </p>
                        <div className="mt-1.5">
                          <CollectMoneyControl
                            spot={spot}
                            booking={b}
                            big={isMine(b)}
                            onDone={(m) => {
                              setMsg(m);
                              setTick((n) => n + 1);
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {soon.length > 0 && (
        <div className={forDate.length > 0 ? "mt-2.5 border-t border-indigo-200 pt-2" : ""}>
          <h2 className="text-sm font-bold text-indigo-900">🔔 Lịch bay tới đây của bạn — được giao khách:</h2>
          <ul className="mt-1.5 space-y-1.5">
            {Object.entries(soonByDate).map(([d, list]) => (
              <li key={d} className="rounded-lg bg-white px-3 py-1.5">
                <div className="text-xs font-bold text-indigo-800">
                  ✈️ Ngày {formatDateKeyVN(d)}{d === today ? " (hôm nay)" : ""} — {list.reduce((t, b) => t + b.guestCount, 0)} khách:
                </div>
                <ul className="mt-0.5 space-y-0.5">
                  {list.map((b) => (
                    <li key={b.id}>
                      <BookingSummary b={b} />
                      <span className="ml-1 text-[11px] text-slate-400">giao bởi {b.assignedBy || "điều phối"}</span>
                      {/* Lịch mai/kia cũng xác nhận được ngay, khỏi đợi tới ngày bay */}
                      {b.status === "open" &&
                        (b.acceptedAt ? (
                          <span className="ml-1 text-[11px] font-semibold text-emerald-700">✓ đã nhận</span>
                        ) : (
                          <button
                            type="button"
                            disabled={busy === b.id}
                            onClick={() => accept(b)}
                            className="ml-1 rounded-lg bg-indigo-600 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
                          >
                            {busy === b.id ? "…" : "🙋 Xác nhận nhận khách"}
                          </button>
                        ))}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}

      {later.length > 0 && (
        <div className="mt-2">
          <div className="text-[11px] font-semibold text-indigo-800">Xa hơn:</div>
          <ul className="mt-1 space-y-1">
            {later.map((b) => (
              <li key={b.id} className="rounded-lg bg-white/70 px-3 py-1">
                <BookingSummary b={b} withDate />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/* Thẻ nhập booking mới + danh sách sắp tới                            */
/* ================================================================== */

/** Bộ đếm nhỏ cho hàng PG/PPG — vừa nửa hàng lưới, đứng cạnh ô Điểm bay. */
function MiniCount({ value, onChange, max = 100 }: { value: number; onChange: (v: number) => void; max?: number }) {
  const clamp = (n: number) => Math.max(0, Math.min(max, Math.trunc(n) || 0));
  const btn = "h-8 w-6 shrink-0 rounded border border-slate-300 bg-white text-sm font-semibold text-slate-600 active:bg-slate-200";
  return (
    <span className="inline-flex items-center gap-0.5">
      <button type="button" className={btn} aria-label="Giảm 1" onClick={() => onChange(clamp(value - 1))}>−</button>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value.replace(/\D/g, ""))))}
        className="h-8 w-8 rounded border border-slate-300 bg-white text-center text-sm font-bold tabular-nums"
      />
      <button type="button" className={btn} aria-label="Thêm 1" onClick={() => onChange(clamp(value + 1))}>＋</button>
    </span>
  );
}

/** Tổng tiền của form: giá PG (ô đơn giá) × khách PG + bảng giá PPG × khách PPG − combo − giảm trừ. */
function totalOf(f: {
  flightDate: string;
  flightKind: BookingDTO["flightKind"];
  ppgGuests: number;
  guestCount: number;
  unitPrice: number;
  mountainCar: number;
  flycam: number;
  video360: number;
  redFlag: number;
  flagFlight: number;
  sunset: number;
  pickupFee: number;
  discount: number;
  comboDiscount: number;
}): number {
  return computeBookingTotal({
    ...f,
    ppgGuests: f.flightKind === "ppg" ? 0 : f.ppgGuests,
    ppgUnitPrice: flightUnitPrice("ppg", f.flightDate),
  });
}

type BookingForm = {
  flightDate: string;
  source: string;
  contactName: string;
  bookingCode: string;
  guestCount: number;
  /** Khách PPG khi nhóm trộn PG + PPG (Khau Phạ) — 0 nếu cả nhóm một loại. */
  ppgGuests: number;
  /** Tiền giảm combo flycam+360 — máy điền sẵn theo min(flycam,360)×100k, sửa tay được. */
  comboDiscount: number;
  flycam: number;
  video360: number;
  redFlag: number;
  sunset: number;
  flagFlight: number;
  pickup: BookingDTO["pickup"];
  pickupNote: string;
  phone: string;
  expectedTime: string;
  /** PG hay PPG — quyết định đơn giá theo ngày bay. */
  flightKind: FlightKind;
  /** Phí đưa đón thu của khách. */
  pickupFee: number;
  /** Số suất xe lên núi (chỉ Hà Nội) — 150k/khách. */
  mountainCar: number;
  /** Đơn giá một khách (máy điền theo loại hình + ngày bay, sửa được). */
  unitPrice: number;
  discount: number;
  deposit: number;
  remaining: number;
  transferCode: string;
  /** Còn lại > 0: người được chỉ định thu trước khi bay + lời nhắn cho họ. */
  collectorUsername: string;
  collectorNote: string;
  note: string;
};

function emptyBooking(today: string, spot: string): BookingForm {
  return {
    flightDate: today,
    source: "",
    contactName: "",
    bookingCode: "",
    guestCount: 0,
    ppgGuests: 0,
    comboDiscount: 0,
    flycam: 0,
    video360: 0,
    redFlag: 0,
    sunset: 0,
    flagFlight: 0,
    pickup: "self",
    pickupNote: "",
    phone: "",
    expectedTime: "",
    flightKind: defaultFlightKind(spot),
    pickupFee: 0,
    mountainCar: 0,
    unitPrice: flightUnitPrice(defaultFlightKind(spot), today),
    discount: 0,
    deposit: 0,
    remaining: 0,
    transferCode: "",
    collectorUsername: "",
    collectorNote: "",
    note: "",
  };
}

export function BookingCard({
  spot,
  spotOptions,
  onChanged,
}: {
  spot: string;
  /** Các điểm bay tài khoản này được làm — khách gọi đặt cho điểm nào thì chọn điểm đó. */
  spotOptions?: string[];
  onChanged?: () => void;
}) {
  const today = todayInVN();
  /** Điểm bay của BOOKING — mặc định theo trang, đổi được nếu tài khoản làm nhiều điểm. */
  const [bookSpot, setBookSpot] = useState(spot);
  useEffect(() => setBookSpot(spot), [spot]);
  const spots = spotOptions?.length ? spotOptions : [spot];
  const [form, setForm] = useState<BookingForm>(() => emptyBooking(today, bookSpot));
  const [upcoming, setUpcoming] = useState<BookingDTO[]>([]);
  /** Nhân sự đang làm tại điểm — để chỉ định người thu số "còn lại". */
  const [staff, setStaff] = useState<Array<{ username: string; name: string; roleLabel: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  /** Đang SỬA booking nào trong danh sách sắp tới — nạp vào form phía trên. */
  const [editingId, setEditingId] = useState<string | null>(null);
  /** Người nhập đã tự gõ "còn phải thu" thì máy thôi tự điền số đó. */
  const [remainingTouched, setRemainingTouched] = useState(false);
  /** Đã gõ đè đơn giá thì máy thôi áp bảng giá theo ngày. */
  const [priceTouched, setPriceTouched] = useState(false);
  /** Danh sách sắp tới dài thì chỉ hiện 5 dòng gần nhất, bấm mới xổ hết. */
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  /** Bấm "Sửa" từ banner hôm nay thì thẻ này phải xổ ra dù đang gập. */
  const [forceOpen, setForceOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  /** Đang kéo booking khách tự đặt trên web về sổ nội bộ. */
  const [syncing, setSyncing] = useState(false);
  /** Lần check web & OTA gần nhất — hiện cạnh nút để biết còn phải bấm không. */
  const [webSyncAt, setWebSyncAt] = useState("");
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  /** Ô NHẬP NHANH: dán một dòng chữ, máy bóc và điền form — người nhập soát rồi lưu. */
  const [quick, setQuick] = useState("");
  /** Đã sửa tay ô giảm combo — máy thôi tự điền lại. */
  const [comboTouched, setComboTouched] = useState(false);
  const [quickMsg, setQuickMsg] = useState<string | null>(null);

  const set = <K extends keyof BookingForm>(key: K, value: BookingForm[K]) => {
    setDone(null);
    if (key === "remaining") setRemainingTouched(true);
    if (key === "unitPrice") setPriceTouched(true);
    if (key === "comboDiscount") setComboTouched(true);
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Combo flycam+360: máy điền lại mỗi khi hai dịch vụ này đổi, trừ khi đã sửa tay
      if (!comboTouched && (key === "flycam" || key === "video360" || key === "guestCount")) {
        next.comboDiscount = comboDiscount(next.flycam, next.video360);
      }
      // Dịch vụ bám theo đầu khách — giảm số khách thì các dịch vụ tự kẹp xuống
      if (key === "guestCount") {
        const cap = Number(value) || 0;
        next.flycam = Math.min(next.flycam, cap);
        next.video360 = Math.min(next.video360, cap);
        next.redFlag = Math.min(next.redFlag, cap);
        next.sunset = Math.min(next.sunset, cap);
        next.mountainCar = Math.min(next.mountainCar, cap);
        next.flagFlight = Math.min(next.flagFlight, cap);
      }
      /**
       * Tổng tiền = đơn giá × số khách − giảm trừ (dịch vụ kèm không cộng tiền).
       * "Còn phải thu" tự điền = tổng − đã cọc, nhưng người nhập gõ đè được:
       * khách OTA trả trước hay khách nợ thì con số không theo công thức.
       */
      /** Đơn giá theo BẢNG GIÁ: đổi ngày bay hay loại hình là điền lại, trừ khi người nhập đã gõ đè. */
      if (!priceTouched && (key === "flightDate" || key === "flightKind")) {
        next.unitPrice = flightUnitPrice(next.flightKind, next.flightDate);
      }
      const total = totalOf(next);
      if (
        !remainingTouched &&
        ["unitPrice", "discount", "comboDiscount", "guestCount", "ppgGuests", "deposit", "flightDate", "flightKind",
         "pickupFee", "flycam", "video360", "redFlag", "sunset", "flagFlight", "mountainCar"].includes(key as string)
      ) {
        next.remaining = Math.max(0, total - (next.deposit || 0));
      }
      return next;
    });
  };

  const load = useCallback(() => {
    apiGet<{
      upcoming: BookingDTO[];
      staff?: Array<{ username: string; name: string; roleLabel: string }>;
      webSyncAt?: string;
    }>(`/api/baocao/booking?date=${todayInVN()}&spot=${bookSpot}`)
      .then((r) => {
        setUpcoming(r.upcoming);
        setStaff(r.staff ?? []);
        setWebSyncAt(r.webSyncAt ?? "");
      })
      .catch(() => {
        /* danh sách chỉ để tham khảo */
      });
  }, [bookSpot]);

  useEffect(() => {
    load();
  }, [load]);

  /** Nhận lệnh "Sửa" từ banner booking hôm nay: mở thẻ, nạp form, cuộn tới. */
  useEffect(() => {
    const onEdit = (e: Event) => {
      const b = (e as CustomEvent<BookingDTO>).detail;
      if (!b) return;
      startEdit(b);
      setForceOpen(true);
      requestAnimationFrame(() => {
        rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    };
    window.addEventListener(EDIT_EVENT, onEdit);
    return () => window.removeEventListener(EDIT_EVENT, onEdit);
  });

  /** Tổng tiền hiện trên form — máy chủ tính lại đúng công thức này khi lưu. */
  const bookingTotal = totalOf(form);
  const serviceMoney = servicesAmount(form);
  const comboMoney = form.comboDiscount;
  /** Khách PG/PPG đang khai — nhóm thuần PPG lưu kiểu cũ (flightKind "ppg"). */
  const pgCount = form.flightKind === "ppg" ? 0 : Math.max(0, form.guestCount - form.ppgGuests);
  const ppgCount = form.flightKind === "ppg" ? form.guestCount : form.ppgGuests;
  const ppgPrice = flightUnitPrice("ppg", form.flightDate);

  /** Bóc dòng nhập nhanh và điền vào form — KHÔNG tự lưu, người nhập soát lại. */
  function applyQuick() {
    const r = parseQuickBooking(quick, today);
    const targetSpot = r.spot && spots.includes(r.spot) ? r.spot : bookSpot;
    if (targetSpot !== bookSpot) setBookSpot(targetSpot);
    setDone(null);
    setForm((prev) => {
      const next = { ...prev };
      if (r.flightDate && r.flightDate >= today) next.flightDate = r.flightDate;
      if (r.contactName) next.contactName = r.contactName;
      if (r.phone) next.phone = r.phone;
      if (r.expectedTime) next.expectedTime = r.expectedTime;
      if (r.source) next.source = r.source;
      if (r.flycam !== undefined) next.flycam = r.flycam;
      if (r.video360 !== undefined) next.video360 = r.video360;
      if (r.redFlag !== undefined) next.redFlag = r.redFlag;
      if (r.sunset !== undefined) next.sunset = r.sunset;
      if (r.flagFlight !== undefined) next.flagFlight = r.flagFlight;
      if (r.mountainCar !== undefined) next.mountainCar = r.mountainCar;
      if (r.pickup) {
        next.pickup = r.pickup;
        next.pickupNote = r.pickupNote || "";
      }
      if (r.deposit !== undefined) next.deposit = r.deposit;
      if (r.discount !== undefined) next.discount = r.discount;

      // Khách + loại hình: Khau Phạ cho trộn PG/PPG, nơi khác chỉ tổng khách
      if (targetSpot === "khau-pha" && (r.pgCount || r.ppgCount)) {
        const pg = r.pgCount || 0;
        const ppg = r.ppgCount || 0;
        const purePpg = pg === 0 && ppg > 0;
        next.flightKind = purePpg ? "ppg" : "pg";
        next.guestCount = pg + ppg;
        next.ppgGuests = purePpg ? 0 : ppg;
      } else if (r.guestCount) {
        next.guestCount = r.guestCount;
      }
      next.unitPrice = flightUnitPrice(next.flightKind, next.flightDate);
      if (!comboTouched) next.comboDiscount = comboDiscount(next.flycam, next.video360);
      next.remaining = Math.max(0, totalOf(next) - (next.deposit || 0));
      return next;
    });

    const filled = [
      r.flightDate && `ngày ${r.flightDate.split("-").reverse().slice(0, 2).join("/")}`,
      r.contactName,
      r.phone,
      r.guestCount && `${r.guestCount} khách${r.ppgCount ? ` (${r.pgCount || 0}PG+${r.ppgCount}PPG)` : ""}`,
      r.expectedTime && `giờ ${r.expectedTime}`,
      r.deposit && `cọc ${(r.deposit / 1000).toLocaleString("vi-VN")}k`,
      r.discount && `giảm ${(r.discount / 1000).toLocaleString("vi-VN")}k`,
    ].filter(Boolean);
    setQuickMsg(
      filled.length
        ? `✓ Đã điền: ${filled.join(" · ")} — soát lại rồi bấm Lưu.${r.leftover ? ` (chưa hiểu: “${r.leftover}”)` : ""}`
        : "Chưa bóc được gì từ dòng này — nhập tay giúp.",
    );
  }

  /**
   * KHAU PHẠ đặt PG + PPG chung một booking: hai ô số khách, tổng khách tự cộng.
   * Nhóm thuần PPG lưu kiểu cũ (flightKind "ppg", ppgGuests 0) — báo cáo và
   * booking cũ không phải đổi cách đọc.
   */
  function setKindCounts(pg: number, ppg: number) {
    setDone(null);
    setForm((prev) => {
      const purePpg = pg === 0 && ppg > 0;
      const kind: BookingDTO["flightKind"] = purePpg ? "ppg" : "pg";
      const guestCount = pg + ppg;
      const next = {
        ...prev,
        flightKind: kind,
        guestCount,
        ppgGuests: purePpg ? 0 : ppg,
        unitPrice: priceTouched ? prev.unitPrice : flightUnitPrice(kind, prev.flightDate),
      };
      // Dịch vụ bám theo đầu khách — giảm khách thì kẹp dịch vụ xuống
      next.flycam = Math.min(next.flycam, guestCount);
      next.video360 = Math.min(next.video360, guestCount);
      next.redFlag = Math.min(next.redFlag, guestCount);
      next.sunset = Math.min(next.sunset, guestCount);
      next.mountainCar = Math.min(next.mountainCar, guestCount);
      next.flagFlight = Math.min(next.flagFlight, guestCount);
      if (!comboTouched) next.comboDiscount = comboDiscount(next.flycam, next.video360);
      if (!remainingTouched) next.remaining = Math.max(0, totalOf(next) - (next.deposit || 0));
      return next;
    });
  }

  /** Kéo booking khách tự đặt trên mebayluon.com/booking vào danh sách chờ bay. */
  /**
   * Một nút kiểm CẢ HAI cửa khách đặt trước: website mebayluon.com (kéo về ngay)
   * và thư OTA (thư do Gmail tự đẩy về ~10 phút/lần — ở đây chỉ ĐẾM xem có thư
   * đang chờ duyệt không và nhắc người ta ngước lên cờ đỏ, chứ app không tự mở
   * hộp thư của công ty được).
   */
  async function syncFromWeb() {
    setSyncing(true);
    setError(null);
    setDone(null);
    try {
      const r = await apiPost<{
        created: number;
        updated: number;
        merged: number;
        cancelled: number;
        skipped: number;
      }>(`/api/baocao/booking/sync-web?spot=${bookSpot}`);
      const webMsg =
        r.created + r.updated + r.merged + r.cancelled === 0
          ? `Web: không có booking mới (${r.skipped} đơn đã có sẵn)`
          : `Web: ${r.created} booking mới` +
            (r.merged ? ` · ${r.merged} gộp vào booking đã nhập tay` : "") +
            (r.updated ? ` · ${r.updated} cập nhật` : "") +
            (r.cancelled ? ` · ${r.cancelled} khách huỷ` : "");

      let otaMsg = "";
      try {
        const ota = await apiGet<{ emails: Array<{ status: string }> }>(`/api/baocao/ota/log?spot=${bookSpot}`);
        const waiting = ota.emails.filter((m) => m.status === "review").length;
        otaMsg = waiting
          ? ` · OTA: ${waiting} thư chờ duyệt — xem cờ đỏ 🚩 đầu trang`
          : " · OTA: không có thư chờ duyệt";
      } catch {
        /* chưa xem được sổ thư thì thôi, phần web vẫn báo */
      }

      setDone(`✓ ${webMsg}${otaMsg}.`);
      load();
      onChanged?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không đồng bộ được booking từ website");
    } finally {
      setSyncing(false);
    }
  }

  async function save() {
    setError(null);
    setDone(null);
    // Giờ dự kiến hôm nay không được lùi về quá khứ — máy chủ cũng chặn lại lần nữa
    if (form.flightDate === todayInVN() && form.expectedTime && form.expectedTime < nowHHMMVN()) {
      setError(`Giờ dự kiến ${form.expectedTime} đã qua (bây giờ là ${nowHHMMVN()}).`);
      return;
    }
    if (!editingId && form.remaining > 0 && staff.length > 0 && !form.collectorUsername) {
      setError(`Còn ${form.remaining.toLocaleString("vi-VN")} đ phải thu — hãy chỉ định người thu bên dưới.`);
      return;
    }
    setSaving(true);
    try {
      // Khách lẻ không có mã OTA: để trống thì lấy SĐT làm mã cho dễ tra
      const payload = { ...form, bookingCode: form.bookingCode.trim() || form.phone.trim() };
      if (editingId) {
        await apiPut(`/api/baocao/booking?spot=${bookSpot}`, { id: editingId, ...payload });
        setDone(`✓ Đã cập nhật booking ${form.contactName || form.bookingCode || form.source}.`);
      } else {
        await apiPost(`/api/baocao/booking?spot=${bookSpot}`, payload);
        const collectorName = staff.find((a) => a.username === form.collectorUsername)?.name;
        setDone(
          `✓ Đã lưu booking ${form.contactName || form.bookingCode || form.source} — bay ${formatDateKeyVN(form.flightDate)}. Lịch bay sẽ tự hiện đúng ngày.` +
            (form.remaining > 0 && collectorName
              ? ` 💰 Lệnh thu ${form.remaining.toLocaleString("vi-VN")} đ đã gửi tới ${collectorName}.`
              : ""),
        );
      }
      setEditingId(null);
      setForm(emptyBooking(today, bookSpot));
      setRemainingTouched(false);
      setPriceTouched(false);
      load();
      onChanged?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không lưu được booking");
    } finally {
      setSaving(false);
    }
  }

  /** Nạp booking vào form phía trên để sửa. */
  function startEdit(b: BookingDTO) {
    setEditingId(b.id);
    setRemainingTouched(true); // booking cũ: giữ đúng số đã lưu, khỏi bị tính lại
    setPriceTouched(true);
    setDone(null);
    setError(null);
    setForm({
      flightDate: b.flightDate,
      source: b.source,
      contactName: b.contactName,
      bookingCode: b.bookingCode,
      guestCount: b.guestCount,
      flycam: b.flycam,
      video360: b.video360,
      redFlag: b.redFlag,
      sunset: b.sunset,
      flagFlight: b.flagFlight,
      pickup: b.pickup,
      pickupNote: b.pickupNote,
      phone: b.phone,
      expectedTime: b.expectedTime,
      flightKind: b.flightKind,
      ppgGuests: b.ppgGuests ?? 0,
      comboDiscount: b.comboDiscount ?? 0,
      pickupFee: b.pickupFee,
      mountainCar: b.mountainCar,
      unitPrice: b.unitPrice,
      discount: b.discount,
      deposit: b.deposit,
      remaining: b.remaining,
      transferCode: b.transferCode,
      // Sửa booking KHÔNG lập lại lệnh thu — tránh gửi trùng lệnh cho người thu
      collectorUsername: "",
      collectorNote: "",
      note: b.note,
    });
  }

  async function removeBooking(b: BookingDTO) {
    const name = b.contactName || b.bookingCode || b.source;
    if (!window.confirm(`XOÁ hẳn booking ${name} (bay ${formatDateKeyVN(b.flightDate)})? Không hoàn tác được.`)) return;
    setRowBusy(b.id);
    setError(null);
    try {
      await apiDelete(`/api/baocao/booking?spot=${bookSpot}`, { id: b.id });
      if (editingId === b.id) {
        setEditingId(null);
        setForm(emptyBooking(today, bookSpot));
      }
      load();
      onChanged?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không xoá được booking");
    } finally {
      setRowBusy(null);
    }
  }

  return (
    <div ref={rootRef}>
    <CollapseCard
      className="border-sky-300 bg-sky-50/40"
      headerClassName="bg-sky-600 text-white"
      title={
        <span className="inline-flex flex-wrap items-center gap-2">
          📒 BOOKING MỚI
          {/* Nút nằm trong <summary>: chặn toggle thẻ khi bấm */}
          <button
            type="button"
            disabled={syncing}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void syncFromWeb();
            }}
            className="rounded-lg border border-white/50 bg-white/15 px-2 py-0.5 text-xs font-semibold text-white hover:bg-white/25 disabled:opacity-60"
            title="Kéo booking khách đặt trên mebayluon.com + kiểm thư OTA đang chờ duyệt"
          >
            {syncing ? "Đang kiểm…" : "🔄 Lấy book từ website & OTA"}
          </button>
          {webSyncAt && (
            <span className="text-[11px] font-normal text-white/80">
              check lần cuối: {new Date(webSyncAt).toLocaleString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
              })}
            </span>
          )}
        </span>
      }
      open={forceOpen || undefined}
    >
      {/* NHẬP NHANH: dán một dòng "mcc 18.8 tên sđt PG 8h00…" là máy điền hộ */}
      <div className="mb-2 rounded-lg border border-violet-200 bg-violet-50/60 p-2">
        <div className="flex gap-2">
          <TextInput
            value={quick}
            onChange={(e) => setQuick(e.target.value)}
            placeholder="⚡ Nhập nhanh: mcc 18.8 nguyễn trang 0956778444 PG 8h00 đón tại bluehome 2k 2xflycam cọc 300k giảm 200k"
            className="h-10 flex-1 rounded-lg bg-white text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (quick.trim()) applyQuick();
              }
            }}
          />
          <Button
            type="button"
            className="h-10 shrink-0 bg-violet-600 px-3 text-sm font-semibold hover:bg-violet-700"
            disabled={!quick.trim()}
            onClick={applyQuick}
          >
            ⚡ Đọc & điền
          </Button>
        </div>
        {quickMsg && <p className="mt-1 text-[11px] leading-snug text-violet-900">{quickMsg}</p>}
      </div>
      {/* Desktop: trái = cửa sổ nhập booking, phải = lịch bay & booking sắp tới */}
      <div className="@3xl:grid @3xl:grid-cols-2 @3xl:items-start @3xl:gap-4">
      <div className="@container">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Giờ dự kiến">
          <TextInput
            type="time"
            value={form.expectedTime}
            min={form.flightDate === todayInVN() ? nowHHMMVN() : undefined}
            onChange={(e) => set("expectedTime", e.target.value)} className="h-10 rounded-lg text-sm"
          />
        </Field>
        <Field label="Ngày bay">
          <TextInput
            type="date"
            value={form.flightDate}
            min={today}
            onChange={(e) => e.target.value && set("flightDate", e.target.value)} className="h-10 rounded-lg text-sm"
          />
        </Field>
        {bookSpot === "khau-pha" ? (
          /* Khau Phạ: đặt PG và PPG CHUNG một booking — bộ đếm MINI để cả hai
             nằm gọn nửa hàng, cùng hàng với ô Điểm bay. */
          <div className="col-span-2 @md:col-span-1">
          <Field label="PG / PPG (số khách)">
            <div className="flex min-h-10 flex-wrap items-center gap-x-2.5 gap-y-1">
              <label className="flex items-center gap-1 text-xs font-bold text-sky-800">
                PG
                <MiniCount value={pgCount} onChange={(v) => setKindCounts(v, ppgCount)} />
              </label>
              <label className="flex items-center gap-1 text-xs font-bold text-violet-800">
                PPG
                <MiniCount value={ppgCount} onChange={(v) => setKindCounts(pgCount, v)} />
              </label>
            </div>
          </Field>
          </div>
        ) : (
        <Field label="Loại hình bay">
          <div className="flex h-10 overflow-hidden rounded-lg border border-slate-300">
            {flightKindsOf(bookSpot).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => set("flightKind", k)}
                title={FLIGHT_KIND_LABEL[k]}
                className={
                  form.flightKind === k
                    ? "flex-1 bg-sky-600 text-sm font-bold text-white"
                    : "flex-1 bg-white text-sm font-medium text-slate-500"
                }
              >
                {FLIGHT_KIND_SHORT[k]}
              </button>
            ))}
          </div>
        </Field>
        )}
        <Field label="Điểm bay">
          <select
            value={bookSpot}
            onChange={(e) => {
              const next = e.target.value;
              setBookSpot(next);
              // Đổi điểm: lựa chọn đón kiểu HN hết hợp lệ, và loại hình bay khác hẳn
              // (Hà Nội 650m/850m đồng giá · Khau Phạ PG/PPG theo ngày) nên đặt lại.
              setForm((prev) => {
                const kind = flightKindsOf(next).includes(prev.flightKind)
                  ? prev.flightKind
                  : defaultFlightKind(next);
                return {
                  ...prev,
                  pickup: "self",
                  pickupNote: "",
                  flightKind: kind,
                  unitPrice: priceTouched ? prev.unitPrice : flightUnitPrice(kind, prev.flightDate),
                };
              });
            }}
            disabled={spots.length <= 1}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-sky-600 disabled:bg-slate-50 disabled:text-slate-500"
          >
            {spots.map((id) => (
              <option key={id} value={id}>
                {spotName(id)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nguồn">
          <TextInput
            value={form.source}
            onChange={(e) => set("source", e.target.value)}
            placeholder="Klook / FB / Zalo / GYG…"
            list="booking-sources" className="h-10 rounded-lg text-sm"
          />
          <datalist id="booking-sources">
            {BOOKING_SOURCES.map((sName) => (
              <option key={sName} value={sName} />
            ))}
          </datalist>
        </Field>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 @md:grid-cols-3">
        <Field label="Tên liên hệ">
          <TextInput value={form.contactName} onChange={(e) => set("contactName", e.target.value)} placeholder="anh Tú…" className="h-10 rounded-lg text-sm" />
        </Field>
        <Field label="SĐT">
          <TextInput value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="09xx…" inputMode="tel" className="h-10 rounded-lg text-sm" />
        </Field>
        <Field label={bookSpot === "khau-pha" ? "Số khách (tự cộng PG + PPG)" : "Số khách"}>
          {bookSpot === "khau-pha" ? (
            <div
              className="flex h-10 items-center justify-end rounded-lg border border-slate-200 bg-slate-50 px-3 text-base font-bold tabular-nums text-slate-700"
              title="Tự cộng từ hai ô PG / PPG phía trên"
            >
              {form.guestCount}
            </div>
          ) : (
          <CountInput value={form.guestCount} onChange={(v) => set("guestCount", v)} max={100} />
          )}
        </Field>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        {/* Tối đa = số khách: 2 khách thì nhiều nhất 2 flycam, 2 cam360… */}
        <ServiceBox tone="flycam" label="Flycam">
          <CountInput compact value={form.flycam} onChange={(v) => set("flycam", v)} max={form.guestCount} />
        </ServiceBox>
        <ServiceBox tone="video360" label="Cam 360">
          <CountInput compact value={form.video360} onChange={(v) => set("video360", v)} max={form.guestCount} />
        </ServiceBox>
        <ServiceBox tone="redFlag" label="Dù cờ đỏ">
          <CountInput compact value={form.redFlag} onChange={(v) => set("redFlag", v)} max={form.guestCount} />
        </ServiceBox>
        <ServiceBox tone="flagFlight" label="Bay kéo cờ/bánh">
          <CountInput compact value={form.flagFlight} onChange={(v) => set("flagFlight", v)} max={form.guestCount} />
        </ServiceBox>
        {bookSpot !== "sapa" && (
        <ServiceBox tone="sunset" label="Bay hoàng hôn/săn mây">
          <CountInput compact value={form.sunset} onChange={(v) => set("sunset", v)} max={form.guestCount} />
        </ServiceBox>
        )}
        {/* Xe chuyên dụng lên núi — chỉ Hà Nội, 150k mỗi khách */}
        {bookSpot === "ha-noi" && (
        <ServiceBox tone="car" label="Xe lên núi">
          <CountInput compact value={form.mountainCar} onChange={(v) => set("mountainCar", v)} max={form.guestCount} />
        </ServiceBox>
        )}
      </div>
      <p className="mt-0.5 text-[11px] leading-tight text-slate-500">
        {form.guestCount === 0 ? "Nhập số khách trước — dịch vụ tối đa bằng số khách. " : ""}
        Đơn giá dịch vụ:{" "}
        {SERVICE_PRICE_LABEL.map((x, i) => (
          <span key={x.key}>
            {i ? " · " : ""}
            {x.label} {(SERVICE_PRICE[x.key] / 1000).toLocaleString("vi-VN")}k
          </span>
        ))}
        {bookSpot === "ha-noi" ? ` · Xe lên núi ${(MOUNTAIN_CAR_PRICE / 1000).toLocaleString("vi-VN")}k/khách` : ""}
      </p>

      <div className="mt-2 grid grid-cols-2 gap-2 @md:grid-cols-3">
        <Field label="Đưa đón">
          <select
            value={form.pickup}
            onChange={(e) => set("pickup", e.target.value as BookingDTO["pickup"])}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-sky-600"
          >
            <option value="self">Tự đến</option>
            {/* Hà Nội có tuyến đón cố định; điểm khác (Khau Phạ, Sa Pa) chọn "Khác" rồi ghi chỗ đón */}
            {bookSpot === "ha-noi" ? (
              <>
                <option value="bigc">Đón BigC</option>
                <option value="hotel">Đón khách sạn</option>
              </>
            ) : (
              <option value="other">Khác — ghi chỗ đón</option>
            )}
          </select>
          {form.pickup === "other" && (
            <TextInput
              value={form.pickupNote}
              onChange={(e) => set("pickupNote", e.target.value)}
              placeholder="Đón tại đâu · VD: homestay Tú Lệ, ngã ba Lìm Mông…"
              className="mt-2 h-10 rounded-lg text-sm"
            />
          )}
        </Field>
        {/* Tiền nong: đơn giá × số khách − giảm trừ = tổng · cọc · còn thu · mã CK */}
        <Field label="Đơn giá bay / khách">
          <MoneyInput value={form.unitPrice} onChange={(v) => set("unitPrice", v)} />
          <p className="mt-0.5 text-[11px] leading-tight text-slate-500">
            {FLIGHT_KIND_SHORT[form.flightKind]} · {priceNote(form.flightKind, form.flightDate)} → bảng giá{" "}
            {(flightUnitPrice(form.flightKind, form.flightDate) / 1000).toLocaleString("vi-VN")}k
          </p>
        </Field>
        <Field label="Phí đưa đón">
          <MoneyInput value={form.pickupFee} onChange={(v) => set("pickupFee", v)} />
        </Field>
        <Field label="Giảm combo (flycam+360)">
          <MoneyInput value={form.comboDiscount} onChange={(v) => set("comboDiscount", v)} />
          <p className="mt-0.5 text-[11px] leading-tight text-slate-500">
            Máy tính {`${Math.min(form.flycam, form.video360)}`} cặp ×100k — sửa được nếu chốt khác
          </p>
        </Field>
        <Field label="Giảm trừ (chiết khấu)">
          <MoneyInput value={form.discount} onChange={(v) => set("discount", v)} />
        </Field>
        <Field label="Tổng tiền (tự tính)">
          <div className="flex h-10 items-center justify-end rounded-lg border-2 border-sky-300 bg-sky-50 px-3 text-base font-bold tabular-nums text-sky-800">
            {bookingTotal.toLocaleString("vi-VN")} đ
          </div>
          <p className="mt-0.5 text-[11px] leading-tight text-slate-500">
            {bookSpot === "khau-pha" && pgCount > 0 && ppgCount > 0
              ? `PG ${(form.unitPrice / 1000).toLocaleString("vi-VN")}k×${pgCount} + PPG ${(ppgPrice / 1000).toLocaleString("vi-VN")}k×${ppgCount}`
              : `${(form.unitPrice / 1000).toLocaleString("vi-VN")}k×${form.guestCount}`}
            {serviceMoney ? ` + dịch vụ ${(serviceMoney / 1000).toLocaleString("vi-VN")}k` : ""}
            {form.mountainCar
              ? ` + xe núi ${((form.mountainCar * MOUNTAIN_CAR_PRICE) / 1000).toLocaleString("vi-VN")}k`
              : ""}
            {form.pickupFee ? ` + đón ${(form.pickupFee / 1000).toLocaleString("vi-VN")}k` : ""}
            {comboMoney ? ` − combo ${(comboMoney / 1000).toLocaleString("vi-VN")}k (giảm tiền combo)` : ""}
            {form.discount ? ` − giảm ${(form.discount / 1000).toLocaleString("vi-VN")}k` : ""}
          </p>
        </Field>
        <Field label="Đã cọc vào TK công ty">
          <MoneyInput value={form.deposit} onChange={(v) => set("deposit", v)} />
        </Field>
        <Field label="Còn lại (thu trước khi bay)">
          <MoneyInput value={form.remaining} onChange={(v) => set("remaining", v)} />
        </Field>
        <Field label="Mã chuyển khoản (cọc)">
          <TextInput
            value={form.transferCode}
            onChange={(e) => set("transferCode", e.target.value)}
            placeholder="Mã GD ngân hàng…" className="h-10 rounded-lg text-sm"
          />
        </Field>
      </div>

      {/* Còn tiền phải thu: chỉ định người thu — lưu xong lệnh thu tự gửi tới người đó */}
      {!editingId && form.remaining > 0 && staff.length > 0 && (
        <div className="mt-2 rounded-lg border border-emerald-300 bg-emerald-50/70 p-2">
          <div className="text-xs font-bold text-emerald-900">
            💰 Còn {form.remaining.toLocaleString("vi-VN")} đ thu trước khi bay — chỉ định người thu:
          </div>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <select
              value={form.collectorUsername}
              onChange={(e) => set("collectorUsername", e.target.value)}
              className="h-10 w-full rounded-lg border border-emerald-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-600"
            >
              <option value="">— Chọn người thu —</option>
              {staff.map((a) => (
                <option key={a.username} value={a.username}>
                  {a.name} — {a.roleLabel}
                </option>
              ))}
            </select>
            <TextInput
              value={form.collectorNote}
              onChange={(e) => set("collectorNote", e.target.value)}
              placeholder="Ghi chú cho người thu…"
              className="h-10 rounded-lg text-sm"
            />
          </div>
          <p className="mt-1 text-[11px] leading-tight text-emerald-800/80">
            Lưu booking xong, LỆNH THU TIỀN hiện ngay trên trang của người này — khi cầm tiền họ bấm
            &ldquo;Đã thu tiền&rdquo; là khoản vào tiền giữ hộ công ty của họ.
          </p>
        </div>
      )}

      {/* Cọc thì 100% qua STK công ty — bỏ ô tích, máy chủ tự đánh dấu khi có cọc */}
      <div className="mt-2">
      <Field label="Ghi chú">
          <TextInput value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="Tên khách (nếu liên hệ là đại lý), khách Hàn cần HDV…" className="h-10 rounded-lg text-sm" />
      </Field>
      </div>

      {error && (
        <div className="mt-2">
          <Banner tone="error">{error}</Banner>
        </div>
      )}
      {done && (
        <div className="mt-2">
          <Banner tone="success" onClose={() => setDone(null)}>
            {done}
          </Banner>
        </div>
      )}

      <div className="mt-2.5 flex gap-2">
        {editingId && (
          <Button
            type="button"
            variant="ghost"
            className="h-11 flex-1 bg-white"
            disabled={saving}
            onClick={() => {
              setEditingId(null);
              setForm(emptyBooking(today, bookSpot));
              setError(null);
              setForceOpen(false);
              // Cờ "đã sửa tay" của lần sửa trước không được vắt sang booking mới
              setRemainingTouched(false);
              setPriceTouched(false);
              setComboTouched(false);
            }}
          >
            Thôi sửa
          </Button>
        )}
        {/* Nhập dở mà muốn làm lại từ đầu: xoá trắng form + các cờ "đã sửa tay" */}
        {!editingId && (
          <Button
            type="button"
            variant="ghost"
            className="h-11 shrink-0 border-rose-300 bg-white px-3 text-rose-700"
            disabled={saving}
            title="Xoá trắng toàn bộ ô nhập để làm lại từ đầu — không đụng booking đã lưu"
            onClick={() => {
              if (!window.confirm("Xoá hết dữ liệu đang nhập trên form để nhập lại từ đầu?")) return;
              setForm(emptyBooking(today, bookSpot));
              setQuick("");
              setQuickMsg(null);
              setError(null);
              setDone(null);
              setRemainingTouched(false);
              setPriceTouched(false);
              setComboTouched(false);
            }}
          >
            🗑 Nhập lại
          </Button>
        )}
        <Button type="button" className="h-11 flex-[2] bg-sky-600 hover:bg-sky-700" disabled={saving} onClick={save}>
          {saving ? "Đang lưu…" : editingId ? "✓ Cập nhật booking" : "Lưu booking"}
        </Button>
        {/* Xuất phiếu gửi khách: điện thoại mở khay chia sẻ (Zalo), máy tính tải PNG */}
        <Button
          type="button"
          variant="ghost"
          className="h-11 flex-1 bg-white"
          disabled={saving || form.guestCount === 0}
          title="Xuất phiếu booking thành ảnh để gửi khách"
          onClick={async () => {
            try {
              await shareBookingImage({
                spot: bookSpot,
                flightDate: form.flightDate,
                expectedTime: form.expectedTime,
                contactName: form.contactName,
                phone: form.phone,
                bookingCode: form.bookingCode.trim() || form.phone.trim(),
                source: form.source,
                guestCount: form.guestCount,
                flycam: form.flycam,
                video360: form.video360,
                redFlag: form.redFlag,
                sunset: form.sunset,
                flagFlight: form.flagFlight,
                pickupLabel:
                  form.pickup === "other"
                    ? `Đón: ${form.pickupNote || "?"}`
                    : form.pickup === "bigc"
                      ? "Đón BigC"
                      : form.pickup === "hotel"
                        ? "Đón khách sạn"
                        : "Tự đến",
                flightKindLabel: FLIGHT_KIND_SHORT[form.flightKind],
                unitPrice: form.unitPrice,
                serviceMoney,
                pickupFee: form.pickupFee,
                mountainCarMoney: form.mountainCar * MOUNTAIN_CAR_PRICE,
                mountainCar: form.mountainCar,
                discount: form.discount,
                total: bookingTotal,
                deposit: form.deposit,
                remaining: form.remaining,
                note: form.note,
              });
            } catch (err: unknown) {
              setError(err instanceof Error ? err.message : "Không xuất được ảnh phiếu");
            }
          }}
        >
          🖼 Xuất ảnh
        </Button>
      </div>
      </div>

      <div className="@container mt-4 @3xl:mt-0">
        <div className="mb-1 text-xs font-semibold text-slate-700">🗓 Lịch bay & booking sắp tới ({upcoming.length})</div>
        {upcoming.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-400">
            Chưa có booking nào sắp tới.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {(showAllUpcoming ? upcoming : upcoming.slice(0, 5)).map((b, i) => (
              <li key={b.id} className={"flow-root px-2.5 py-1.5" + (editingId === b.id ? " bg-sky-50" : "")}>
                {/* Nút FLOAT góc phải — chữ dòng 1 né nút, từ dòng 2 tràn hết bề ngang */}
                <div className="float-right ml-2 flex flex-wrap items-center justify-end gap-1">
                  {/* Thu tiền TỪ XA: khách chuyển khoản trước ngày bay là ghi nhận được luôn */}
                  <CollectMoneyControl
                    spot={bookSpot}
                    booking={b}
                    onDone={(msg) => {
                      setDone(msg);
                      load();
                      onChanged?.();
                    }}
                  />
                  <AssignControl spot={bookSpot} booking={b} onDone={load} />
                  <CancelBookingControl
                    spot={bookSpot}
                    booking={b}
                    onDone={(msg) => {
                      setDone(msg);
                      load();
                      onChanged?.();
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => startEdit(b)}
                    disabled={rowBusy === b.id}
                    className="h-7 rounded-lg border border-slate-300 bg-white px-2 text-xs font-medium text-slate-600 hover:border-sky-500 hover:text-sky-700"
                  >
                    {editingId === b.id ? "đang sửa…" : "Sửa"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeBooking(b)}
                    disabled={rowBusy === b.id}
                    className="h-7 rounded-lg border border-slate-300 bg-white px-2 text-xs font-medium text-slate-400 hover:border-rose-500 hover:text-rose-600"
                  >
                    {rowBusy === b.id ? "…" : "Xoá"}
                  </button>
                </div>
                {/* Số thứ tự đỏ — nhìn phát biết đang nói booking số mấy */}
                <span className="mr-1 text-sm font-bold tabular-nums text-rose-600">{i + 1}.</span>
                <BookingSummary b={b} withDate />
                <AssignedBadge b={b} />
                <span className="ml-1 text-xs text-slate-400">
                  — nhập {stampVN(b.createdAt)} bởi {b.createdByName}
                </span>
              </li>
            ))}
          </ul>
        )}
        {upcoming.length > 5 && (
          <button
            type="button"
            onClick={() => setShowAllUpcoming((v) => !v)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            {showAllUpcoming ? "▴ Thu gọn danh sách" : `▾ Xem thêm ${upcoming.length - 5} booking`}
          </button>
        )}
      </div>
      </div>
    </CollapseCard>
    </div>
  );
}
