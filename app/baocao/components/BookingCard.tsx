// app/baocao/components/BookingCard.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import { formatDateKeyVN, shiftDateKey, todayInVN } from "@/lib/baobay/date";
import { spotName } from "@/lib/baobay/spots";
import type { BookingDTO } from "@/lib/baobay/types";

import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "./client-api";
import { Banner, Button, CollapseCard, CountInput, Field, MoneyInput, ServiceBox, TextInput } from "./ui";

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
  const parts: string[] = [];
  if (withDate) parts.push(formatDateKeyVN(b.flightDate));
  parts.push([b.source, b.bookingCode && `#${b.bookingCode}`].filter(Boolean).join(" ") || "booking");
  if (b.contactName) parts.push(b.contactName);
  if (b.phone) parts.push(`📞 ${b.phone}`);
  parts.push(`${b.guestCount} khách`);
  if (b.flycam) parts.push(`${b.flycam}×flycam`);
  if (b.video360) parts.push(`${b.video360}×cam360`);
  if (b.redFlag) parts.push(`${b.redFlag}×cờ đỏ`);
  if (b.flagFlight) parts.push(`${b.flagFlight}×kéo cờ`);
  parts.push(
    [b.pickup === "other" ? `đón ${b.pickupNote || "?"}` : PICKUP_LABEL[b.pickup], b.expectedTime]
      .filter(Boolean)
      .join(" "),
  );
  if (b.deposit) parts.push(`cọc ${Math.round(b.deposit / 1000).toLocaleString("vi-VN")}k`);
  if (b.remaining) parts.push(`còn thu ${Math.round(b.remaining / 1000).toLocaleString("vi-VN")}k`);
  if (b.transferCode) parts.push(`CK #${b.transferCode}`);
  if (b.depositToCompany) parts.push("cọc → TK cty");
  if (b.note) parts.push(b.note);

  return <span className="text-xs text-slate-600">{parts.filter(Boolean).join(" · ")}</span>;
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
function AssignControl({ spot, booking, onDone }: { spot: string; booking: BookingDTO; onDone: () => void }) {
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
        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-indigo-500 hover:text-indigo-700"
      >
        {booking.assignedToName ? "⇢ Chuyển người khác" : "⇢ Chuyển"}
      </button>
    );
  }
  return (
    <div className="flex w-full flex-wrap items-center gap-2">
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

/* ================================================================== */
/* Banner đầu trang: booking bay đúng ngày đang xem                     */
/* ================================================================== */

export function BookingTodayBanner({ spot, date }: { spot: string; date: string }) {
  const [rows, setRows] = useState<BookingDTO[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** id booking đang mở ô chọn ngày dời + ngày đã chọn. */
  const [moving, setMoving] = useState<{ id: string; toDate: string } | null>(null);

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

  return (
    <div className="rounded-2xl border-2 border-sky-400 bg-sky-50 p-4 lg:[column-span:all]">
      <h2 className="text-sm font-bold text-sky-900">
        🛫 Booking bay ngày {formatDateKeyVN(date)} ({open.length} chờ bay)
      </h2>
      <p className="mt-0.5 text-[11px] text-sky-800/70">
        Chỉ gồm khách ĐẶT TRƯỚC — khách đến đột xuất bay luôn thì vẫn báo số chuyến/dịch vụ trong báo cáo ngày
        như thường, không cần khớp với danh sách này.
      </p>
      {error && (
        <div className="mt-2">
          <Banner tone="error">{error}</Banner>
        </div>
      )}
      <ul className="mt-2 space-y-2">
        {open.map((b) => (
          <li key={b.id} className="rounded-lg bg-white px-3 py-2">
            <div className="min-w-0">
              <BookingSummary b={b} />
              <AssignedBadge b={b} />
              {b.rescheduledFrom.length > 0 && (
                <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                  dời từ {b.rescheduledFrom.map((d) => formatDateKeyVN(d)).join(", ")}
                </span>
              )}
              <div className="text-[11px] text-slate-400">
                nhập {stampVN(b.createdAt)} bởi {b.createdByName}
              </div>
            </div>

            {moving?.id === b.id ? (
              /* Khách dời lịch: chọn ngày mới — booking tự chuyển sang ngày đó */
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={moving.toDate}
                  min={shiftDateKey(todayInVN(), 1)}
                  onChange={(e) => setMoving({ id: b.id, toDate: e.target.value })}
                  className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm"
                />
                <Button
                  type="button"
                  className="h-9 px-3 text-xs"
                  disabled={busy === b.id || !moving.toDate}
                  onClick={() => act(b, "move", moving.toDate)}
                >
                  {busy === b.id ? "Đang lưu…" : "✓ Dời sang ngày này"}
                </Button>
                <Button type="button" variant="ghost" className="h-9 bg-white px-3 text-xs" onClick={() => setMoving(null)}>
                  Thôi
                </Button>
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <AssignControl spot={spot} booking={b} onDone={load} />
                <Button
                  type="button"
                  className="h-9 flex-1 bg-emerald-600 px-3 text-xs hover:bg-emerald-700"
                  disabled={busy === b.id}
                  onClick={() => act(b, "flown")}
                >
                  {busy === b.id ? "Đang lưu…" : "✈ Đã bay"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 flex-1 bg-white px-3 text-xs"
                  disabled={busy === b.id}
                  onClick={() => setMoving({ id: b.id, toDate: "" })}
                >
                  ⇢ Dời
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 flex-1 bg-white px-3 text-xs text-rose-700"
                  disabled={busy === b.id}
                  onClick={() => act(b, "cancel")}
                >
                  ✕ Huỷ
                </Button>
              </div>
            )}
          </li>
        ))}
        {closed.map((b) => (
          <li key={b.id} className="rounded-lg bg-white/60 px-3 py-2 opacity-60">
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

  return (
    <div className="rounded-2xl border-2 border-indigo-400 bg-indigo-50 p-4 lg:[column-span:all]">
      <h2 className="text-sm font-bold text-indigo-900">
        🤝 Lịch điều phối giao cho bạn — ngày {formatDateKeyVN(date)} ({forDate.filter((b) => b.status === "open").length})
      </h2>
      <ul className="mt-2 space-y-2">
        {forDate.map((b) => (
          <li key={b.id} className={"rounded-lg bg-white px-3 py-2" + (b.status !== "open" ? " opacity-60" : "")}>
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
      {upcoming.length > 0 && (
        <div className="mt-2">
          <div className="text-[11px] font-semibold text-indigo-800">Sắp tới:</div>
          <ul className="mt-1 space-y-1">
            {upcoming.map((b) => (
              <li key={b.id} className="rounded-lg bg-white/70 px-3 py-1.5">
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
  flagFlight: number;
  pickup: BookingDTO["pickup"];
  pickupNote: string;
  phone: string;
  expectedTime: string;
  deposit: number;
  remaining: number;
  transferCode: string;
  depositToCompany: boolean;
  note: string;
};

function emptyBooking(today: string): BookingForm {
  return {
    flightDate: today,
    source: "",
    contactName: "",
    bookingCode: "",
    guestCount: 0,
    flycam: 0,
    video360: 0,
    redFlag: 0,
    flagFlight: 0,
    pickup: "self",
    pickupNote: "",
    phone: "",
    expectedTime: "",
    deposit: 0,
    remaining: 0,
    transferCode: "",
    depositToCompany: false,
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
  const [form, setForm] = useState<BookingForm>(() => emptyBooking(today));
  const [upcoming, setUpcoming] = useState<BookingDTO[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  /** Đang SỬA booking nào trong danh sách sắp tới — nạp vào form phía trên. */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  const set = <K extends keyof BookingForm>(key: K, value: BookingForm[K]) => {
    setDone(null);
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Dịch vụ bám theo đầu khách — giảm số khách thì các dịch vụ tự kẹp xuống
      if (key === "guestCount") {
        const cap = Number(value) || 0;
        next.flycam = Math.min(next.flycam, cap);
        next.video360 = Math.min(next.video360, cap);
        next.redFlag = Math.min(next.redFlag, cap);
        next.flagFlight = Math.min(next.flagFlight, cap);
      }
      return next;
    });
  };

  const load = useCallback(() => {
    apiGet<{ upcoming: BookingDTO[] }>(`/api/baocao/booking?date=${todayInVN()}&spot=${bookSpot}`)
      .then((r) => setUpcoming(r.upcoming))
      .catch(() => {
        /* danh sách chỉ để tham khảo */
      });
  }, [bookSpot]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    setError(null);
    setDone(null);
    // Giờ dự kiến hôm nay không được lùi về quá khứ — máy chủ cũng chặn lại lần nữa
    if (form.flightDate === todayInVN() && form.expectedTime && form.expectedTime < nowHHMMVN()) {
      setError(`Giờ dự kiến ${form.expectedTime} đã qua (bây giờ là ${nowHHMMVN()}).`);
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await apiPut(`/api/baocao/booking?spot=${bookSpot}`, { id: editingId, ...form });
        setDone(`✓ Đã cập nhật booking ${form.contactName || form.bookingCode || form.source}.`);
      } else {
        await apiPost(`/api/baocao/booking?spot=${bookSpot}`, form);
        setDone(
          `✓ Đã lưu booking ${form.contactName || form.bookingCode || form.source} — bay ${formatDateKeyVN(form.flightDate)}. Booking sẽ tự hiện trên đầu trang vào đúng ngày bay.`,
        );
      }
      setEditingId(null);
      setForm(emptyBooking(today));
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
      flagFlight: b.flagFlight,
      pickup: b.pickup,
      pickupNote: b.pickupNote,
      phone: b.phone,
      expectedTime: b.expectedTime,
      deposit: b.deposit,
      remaining: b.remaining,
      transferCode: b.transferCode,
      depositToCompany: b.depositToCompany,
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
        setForm(emptyBooking(today));
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
    <CollapseCard
      className="border-sky-200 bg-sky-50/40"
      title="📒 BOOKING MỚI"
      hint="bấm để nhập khách đặt trước"
    >
      <div className="grid gap-3 @md:grid-cols-2 @2xl:grid-cols-3">
        <Field label="Ngày bay">
          <TextInput
            type="date"
            value={form.flightDate}
            min={today}
            onChange={(e) => e.target.value && set("flightDate", e.target.value)}
          />
        </Field>
        <Field label="Điểm bay">
          <select
            value={bookSpot}
            onChange={(e) => {
              setBookSpot(e.target.value);
              // đổi điểm thì lựa chọn đón kiểu HN không còn hợp lệ
              setForm((prev) => ({ ...prev, pickup: "self", pickupNote: "" }));
            }}
            disabled={spots.length <= 1}
            className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-slate-900 outline-none focus:border-sky-600 disabled:bg-slate-50 disabled:text-slate-500"
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
            list="booking-sources"
          />
          <datalist id="booking-sources">
            {BOOKING_SOURCES.map((sName) => (
              <option key={sName} value={sName} />
            ))}
          </datalist>
        </Field>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 @md:grid-cols-2">
        <Field label="Tên liên hệ">
          <TextInput value={form.contactName} onChange={(e) => set("contactName", e.target.value)} placeholder="anh Tú…" />
        </Field>
        <Field label="SĐT">
          <TextInput value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="09xx…" inputMode="tel" />
        </Field>
        <Field label="Số booking">
          <TextInput value={form.bookingCode} onChange={(e) => set("bookingCode", e.target.value)} placeholder="KLK12345…" />
        </Field>
        <Field label="Số khách">
          <CountInput value={form.guestCount} onChange={(v) => set("guestCount", v)} max={100} />
        </Field>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
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
      </div>
      {form.guestCount === 0 && (
        <p className="mt-1 text-[11px] text-slate-500">Nhập số khách trước — dịch vụ tối đa bằng số khách.</p>
      )}

      <div className="mt-3 grid gap-3 @md:grid-cols-2">
        <Field label="Đưa đón">
          <select
            value={form.pickup}
            onChange={(e) => set("pickup", e.target.value as BookingDTO["pickup"])}
            className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-slate-900 outline-none focus:border-sky-600"
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
              className="mt-2"
            />
          )}
        </Field>
        <Field label="Giờ dự kiến">
          <TextInput
            type="time"
            value={form.expectedTime}
            min={form.flightDate === todayInVN() ? nowHHMMVN() : undefined}
            onChange={(e) => set("expectedTime", e.target.value)}
          />
        </Field>
      </div>

      {/* Tiền nong đứng cạnh nhau: đã cọc — còn phải thu — mã CK để soi sao kê */}
      <div className="mt-3 grid grid-cols-2 gap-3 @md:grid-cols-2 @2xl:grid-cols-3">
        <Field label="Đã cọc">
          <MoneyInput value={form.deposit} onChange={(v) => set("deposit", v)} />
        </Field>
        <Field label="Còn lại (thu trước khi bay)">
          <MoneyInput value={form.remaining} onChange={(v) => set("remaining", v)} />
        </Field>
        <Field label="Mã chuyển khoản (cọc)">
          <TextInput
            value={form.transferCode}
            onChange={(e) => set("transferCode", e.target.value)}
            placeholder="Mã GD ngân hàng…"
          />
        </Field>
      </div>

      {/* Cọc CK về thẳng tài khoản công ty — không ai cầm khoản này */}
      <label className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
        <input
          type="checkbox"
          checked={form.depositToCompany}
          onChange={(e) => set("depositToCompany", e.target.checked)}
          className="h-5 w-5 rounded border-slate-300"
        />
        <span className="text-sm text-slate-800">
          Cọc chuyển khoản vào <strong>TK công ty</strong>
        </span>
      </label>

      <div className="mt-3">
        <Field label="Ghi chú">
          <TextInput value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="Khách Hàn, cần HDV tiếng Anh…" />
        </Field>
      </div>

      {error && (
        <div className="mt-3">
          <Banner tone="error">{error}</Banner>
        </div>
      )}
      {done && (
        <div className="mt-3">
          <Banner tone="success" onClose={() => setDone(null)}>
            {done}
          </Banner>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        {editingId && (
          <Button
            type="button"
            variant="ghost"
            className="flex-1 bg-white"
            disabled={saving}
            onClick={() => {
              setEditingId(null);
              setForm(emptyBooking(today));
              setError(null);
            }}
          >
            Thôi sửa
          </Button>
        )}
        <Button type="button" className="flex-[2] bg-sky-600 hover:bg-sky-700" disabled={saving} onClick={save}>
          {saving ? "Đang lưu…" : editingId ? "✓ Cập nhật booking" : "Lưu booking"}
        </Button>
      </div>

      {upcoming.length > 0 && (
        <div className="mt-4">
          <div className="mb-1 text-xs font-semibold text-slate-700">Booking sắp tới ({upcoming.length})</div>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {upcoming.map((b) => (
              <li key={b.id} className={"flex flex-wrap items-center gap-2 px-3 py-2" + (editingId === b.id ? " bg-sky-50" : "")}>
                <div className="min-w-0 flex-1">
                  <BookingSummary b={b} withDate />
                  <AssignedBadge b={b} />
                  <span className="ml-1 text-[11px] text-slate-400">
                    — nhập {stampVN(b.createdAt)} bởi {b.createdByName}
                  </span>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <AssignControl spot={bookSpot} booking={b} onDone={load} />
                  <button
                    type="button"
                    onClick={() => startEdit(b)}
                    disabled={rowBusy === b.id}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-sky-500 hover:text-sky-700"
                  >
                    {editingId === b.id ? "đang sửa…" : "Sửa"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeBooking(b)}
                    disabled={rowBusy === b.id}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-400 hover:border-rose-500 hover:text-rose-600"
                  >
                    {rowBusy === b.id ? "…" : "Xoá"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </CollapseCard>
  );
}
