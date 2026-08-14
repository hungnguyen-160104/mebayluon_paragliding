// app/baocao/components/BookingCard.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { formatDateKeyVN, shiftDateKey, todayInVN } from "@/lib/baobay/date";
import { spotName } from "@/lib/baobay/spots";
import type { BookingDTO } from "@/lib/baobay/types";

import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "./client-api";
import { shareBookingImage } from "./booking-image";
import {
  FLIGHT_KIND_LABEL,
  FLIGHT_KIND_SHORT,
  MOUNTAIN_CAR_PRICE,
  SERVICE_PRICE,
  SERVICE_PRICE_LABEL,
  bookingTotal as computeBookingTotal,
  defaultFlightKind,
  flightKindsOf,
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

export const BOOKING_SOURCES = ["Facebook", "TikTok", "Zalo", "Klook", "SEEK", "GYG", "KKday", "Walk-in"];

const PICKUP_LABEL: Record<BookingDTO["pickup"], string> = {
  self: "tự đến",
  bigc: "đón BigC",
  hotel: "đón KS",
  other: "đón",
};

/** "20/08 · Klook #KLK123 · anh Tú · 2 khách · 1×cam360 · đón KS 09:30 · cọc 500k" */
function BookingSummary({ b, withDate }: { b: BookingDTO; withDate?: boolean }) {
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
  if (b.flightKind && b.flightKind !== "pg") parts.push(FLIGHT_KIND_SHORT[b.flightKind]);
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
    <span className="text-sm leading-snug text-slate-700">
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
}: {
  spot: string;
  booking: BookingDTO;
  onDone: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(booking.remaining || 0);
  const [method, setMethod] = useState<"cash" | "transfer">("cash");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (amount <= 0) return setError("Chưa nhập số tiền");
    if (method === "transfer" && !code.trim()) return setError("Chuyển khoản phải ghi mã giao dịch");
    setBusy(true);
    setError(null);
    try {
      await apiPatch(`/api/baocao/booking?spot=${spot}`, {
        id: booking.id,
        action: "collect",
        amount,
        method,
        transferCode: code,
      });
      onDone(
        method === "transfer"
          ? `✓ Đã ghi nhận ${amount.toLocaleString("vi-VN")} đ chuyển khoản vào TK công ty.`
          : `✓ Đã thu ${amount.toLocaleString("vi-VN")} đ tiền mặt — cộng vào tiền giữ hộ công ty của bạn.`,
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
        className="h-7 bg-rose-600 px-2 text-xs font-bold text-white hover:bg-rose-700"
        title="Thu tiền cho booking này — tiền mặt tại bãi hoặc khách chuyển khoản trước"
        onClick={() => {
          setAmount(booking.remaining || 0);
          setOpen(true);
          setError(null);
        }}
      >
        💵 Thu tiền
      </Button>
    );
  }

  return (
    <div className="flex w-60 flex-col gap-1 rounded-lg border border-rose-300 bg-rose-50/60 p-1.5">
      {/* Số tiền điền sẵn phần còn phải thu, sửa được: thu một phần cũng ghi nhận */}
      <MoneyInput value={amount} onChange={setAmount} />
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
        {method === "transfer" ? "Tiền vào thẳng TK CÔNG TY." : "Tiền mặt cộng vào TIỀN GIỮ HỘ CÔNG TY của bạn."}
      </div>
      {error && <div className="text-[11px] font-medium leading-tight text-rose-700">{error}</div>}
      <div className="flex gap-1">
        <Button
          type="button"
          className="h-7 flex-1 bg-emerald-600 px-2 text-xs hover:bg-emerald-700"
          disabled={busy || amount <= 0}
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
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Danh sách dài thì gập lại còn 10 dòng. */
  const [showAll, setShowAll] = useState(false);
  /** id booking đang mở ô chọn ngày dời + ngày đã chọn. */
  const [moving, setMoving] = useState<{ id: string; toDate: string } | null>(null);
  /** Câu báo sau khi thu tiền xong — hiện trên đầu banner. */
  const [collectDone, setCollectDone] = useState<string | null>(null);

  const load = useCallback(() => {
    apiGet<{ forDate: BookingDTO[] }>(`/api/baocao/booking?date=${date}&spot=${spot}`)
      .then((r) => setRows(r.forDate))
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
  const closed = rows.filter((b) => b.status !== "open");
  /** Ngày đông khách: chỉ hiện 10 dòng đầu, bấm mũi tên mới xổ hết. */
  const openShown = showAll ? open : open.slice(0, 10);
  if (!rows.length) return null;

  async function act(b: BookingDTO, action: "flown" | "cancel" | "move", toDate?: string) {
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

  const title = <>🛫 Booking bay ngày {formatDateKeyVN(date)} ({open.length} chờ bay)</>;
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
              /* Khách dời lịch: chọn ngày mới — booking tự chuyển sang ngày đó */
              <div className="float-right ml-2 flex flex-wrap items-center justify-end gap-1">
                <input
                  type="date"
                  value={moving.toDate}
                  min={shiftDateKey(todayInVN(), 1)}
                  onChange={(e) => setMoving({ id: b.id, toDate: e.target.value })}
                  className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs"
                />
                <Button
                  type="button"
                  className="h-7 px-2 text-xs"
                  disabled={busy === b.id || !moving.toDate}
                  onClick={() => act(b, "move", moving.toDate)}
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
                <Button
                  type="button"
                  variant="ghost"
                  className="h-7 bg-white px-2 text-xs"
                  disabled={busy === b.id}
                  onClick={() => setMoving({ id: b.id, toDate: "" })}
                >
                  ⇢ Đổi lịch
                </Button>
                <AssignControl spot={spot} booking={b} onDone={load} />
              </div>
              <div className="float-right clear-right ml-2 mt-1 flex items-center gap-1">
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
                  className="h-7 bg-white px-2 text-xs text-rose-700"
                  disabled={busy === b.id}
                  onClick={() => act(b, "cancel")}
                >
                  ✕ Huỷ
                </Button>
                {/* Sửa dịch vụ / số tiền: mở thẻ BOOKING MỚI bên dưới với đúng booking này */}
                <Button
                  type="button"
                  variant="ghost"
                  className="h-7 bg-white px-2 text-xs"
                  disabled={busy === b.id}
                  onClick={() => requestEditBooking(b)}
                >
                  ✎ Sửa
                </Button>
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
          <li key={b.id} className="mb-1.5 break-inside-avoid rounded-lg bg-white/60 px-3 py-1.5 opacity-60">
            <BookingSummary b={b} />
            {b.status === "done" ? (
              <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                đã bay ✓
              </span>
            ) : (
              <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-800">
                đã huỷ
              </span>
            )}
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
export function AssignedBookings({ spot, date }: { spot: string; date: string }) {
  const [forDate, setForDate] = useState<BookingDTO[]>([]);
  const [upcoming, setUpcoming] = useState<BookingDTO[]>([]);

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
  }, [spot, date]);

  if (!forDate.length && !upcoming.length) return null;

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
      {forDate.length > 0 && (
        <>
          <h2 className="text-sm font-bold text-indigo-900">
            🤝 Lịch điều phối giao cho bạn — ngày {formatDateKeyVN(date)} ({forDate.filter((b) => b.status === "open").length})
          </h2>
          <ul className="mt-2 space-y-1.5">
            {forDate.map((b) => (
              <li key={b.id} className={"rounded-lg bg-white px-3 py-1.5" + (b.status !== "open" ? " opacity-60" : "")}>
                <BookingSummary b={b} />
                {b.status === "done" && (
                  <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">đã bay ✓</span>
                )}
                {b.status === "cancelled" && (
                  <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-800">đã huỷ</span>
                )}
                <div className="text-[11px] text-slate-400">giao bởi {b.assignedBy || "điều phối"}</div>
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

type BookingForm = {
  flightDate: string;
  source: string;
  contactName: string;
  bookingCode: string;
  guestCount: number;
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
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  const set = <K extends keyof BookingForm>(key: K, value: BookingForm[K]) => {
    setDone(null);
    if (key === "remaining") setRemainingTouched(true);
    if (key === "unitPrice") setPriceTouched(true);
    setForm((prev) => {
      const next = { ...prev, [key]: value };
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
      const total = computeBookingTotal(next);
      if (
        !remainingTouched &&
        ["unitPrice", "discount", "guestCount", "deposit", "flightDate", "flightKind", "pickupFee",
         "flycam", "video360", "redFlag", "sunset", "flagFlight", "mountainCar"].includes(key as string)
      ) {
        next.remaining = Math.max(0, total - (next.deposit || 0));
      }
      return next;
    });
  };

  const load = useCallback(() => {
    apiGet<{ upcoming: BookingDTO[]; staff?: Array<{ username: string; name: string; roleLabel: string }> }>(
      `/api/baocao/booking?date=${todayInVN()}&spot=${bookSpot}`,
    )
      .then((r) => {
        setUpcoming(r.upcoming);
        setStaff(r.staff ?? []);
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
  const bookingTotal = computeBookingTotal(form);
  const serviceMoney = servicesAmount(form);

  /** Kéo booking khách tự đặt trên mebayluon.com/booking vào danh sách chờ bay. */
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
      setDone(
        r.created + r.updated + r.merged + r.cancelled === 0
          ? `✓ Đã kiểm tra website — không có booking mới (${r.skipped} đơn đã có sẵn).`
          : `✓ Từ website: ${r.created} booking mới` +
            (r.merged ? ` · ${r.merged} gộp vào booking đã nhập tay` : "") +
            (r.updated ? ` · ${r.updated} cập nhật` : "") +
            (r.cancelled ? ` · ${r.cancelled} khách huỷ` : "") +
            ".",
      )
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
      title="📒 BOOKING MỚI"
      open={forceOpen || undefined}
    >
      {/* Khách tự đặt trên web: kéo về đây, khỏi gõ lại tay */}
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50/70 px-2.5 py-1.5">
        <Button
          type="button"
          variant="ghost"
          className="h-8 shrink-0 whitespace-nowrap border-indigo-300 bg-white px-2.5 text-xs font-semibold text-indigo-800"
          disabled={syncing}
          onClick={syncFromWeb}
        >
          {syncing ? "Đang đồng bộ…" : "🔄 Lấy booking từ website"}
        </Button>
        <span className="text-[11px] leading-tight text-indigo-900/80">
          Khách đặt trên mebayluon.com tự chảy vào danh sách chờ bay; bấm đây để kéo lại nếu thiếu.
        </span>
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
        <Field label="Số booking">
          <TextInput value={form.bookingCode} onChange={(e) => set("bookingCode", e.target.value)} placeholder="KLK12345…" className="h-10 rounded-lg text-sm" />
        </Field>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 @md:grid-cols-3">
        <Field label="Tên liên hệ">
          <TextInput value={form.contactName} onChange={(e) => set("contactName", e.target.value)} placeholder="anh Tú…" className="h-10 rounded-lg text-sm" />
        </Field>
        <Field label="SĐT">
          <TextInput value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="09xx…" inputMode="tel" className="h-10 rounded-lg text-sm" />
        </Field>
        <Field label="Số khách">
          <CountInput value={form.guestCount} onChange={(v) => set("guestCount", v)} max={100} />
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
        <Field label="Giảm trừ (chiết khấu)">
          <MoneyInput value={form.discount} onChange={(v) => set("discount", v)} />
        </Field>
        <Field label="Tổng tiền (tự tính)">
          <div className="flex h-10 items-center justify-end rounded-lg border-2 border-sky-300 bg-sky-50 px-3 text-base font-bold tabular-nums text-sky-800">
            {bookingTotal.toLocaleString("vi-VN")} đ
          </div>
          <p className="mt-0.5 text-[11px] leading-tight text-slate-500">
            {(form.unitPrice / 1000).toLocaleString("vi-VN")}k×{form.guestCount}
            {serviceMoney ? ` + dịch vụ ${(serviceMoney / 1000).toLocaleString("vi-VN")}k` : ""}
            {form.mountainCar
              ? ` + xe núi ${((form.mountainCar * MOUNTAIN_CAR_PRICE) / 1000).toLocaleString("vi-VN")}k`
              : ""}
            {form.pickupFee ? ` + đón ${(form.pickupFee / 1000).toLocaleString("vi-VN")}k` : ""}
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
            }}
          >
            Thôi sửa
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
