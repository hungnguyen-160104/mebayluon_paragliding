// app/baocao/components/rows.tsx
"use client";

/**
 * Ba ô nhập dạng "nhiều dòng thêm bớt được", dùng chung cho trang quầy vé và
 * trang chốt ngày của kế toán:
 *
 *  - RangeRows      : các dải mã vé đã xuất (A1234–A1256 và B1234–B1239)
 *  - RescheduleRows : vé dời lịch, mỗi vé một mã + ngày dời tới
 *  - ExpenseRows    : chi tiêu khác của phi công (nội dung – số tiền – ghi chú)
 *
 * Đều theo lối "luôn có một dòng trống ở cuối": người nhập gõ vào là tự thêm
 * dòng mới, không phải bấm nút Thêm trước rồi mới gõ.
 */

import { formatDateKeyVN } from "@/lib/baobay/date";
import { countTicketRange } from "@/lib/baobay/ticket-code";
import type { ExpenseDTO, IssuedRangeDTO, RescheduledDTO } from "@/lib/baobay/types";

import { Button, CountInput, MoneyInput, Readout, TextInput } from "./ui";

/* ------------------------------------------------------------------ */
/* Dải mã vé                                                           */
/* ------------------------------------------------------------------ */

export type RangeRow = { from: string; to: string };

export function RangeRows({
  rows,
  onChange,
  disabled,
}: {
  rows: RangeRow[];
  onChange: (next: RangeRow[]) => void;
  disabled?: boolean;
}) {
  const set = (index: number, patch: Partial<RangeRow>) => {
    const next = rows.map((r, i) => (i === index ? { ...r, ...patch } : r));
    onChange(next);
  };

  const counts = rows.map((r) =>
    r.from.trim() || r.to.trim() ? countTicketRange(r.from, r.to) : null,
  );
  const total = counts.reduce((s, c) => s + (c?.ok ? c.count : 0), 0);

  return (
    <div className="space-y-3">
      {rows.map((row, i) => {
        const counted = counts[i];
        return (
          <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="flex items-start gap-2">
              <div className="grid flex-1 gap-2 sm:grid-cols-2">
                <TextInput
                  value={row.from}
                  onChange={(e) => set(i, { from: e.target.value.toUpperCase() })}
                  placeholder="Từ mã · MBL0001"
                  autoCapitalize="characters"
                  spellCheck={false}
                  disabled={disabled}
                />
                <TextInput
                  value={row.to}
                  onChange={(e) => set(i, { to: e.target.value.toUpperCase() })}
                  placeholder="Đến mã · MBL0056"
                  autoCapitalize="characters"
                  spellCheck={false}
                  disabled={disabled}
                />
              </div>
              {rows.length > 1 && !disabled && (
                <button
                  type="button"
                  onClick={() => onChange(rows.filter((_, k) => k !== i))}
                  className="h-12 w-10 shrink-0 rounded-xl border border-slate-300 bg-white text-slate-400 hover:text-rose-600"
                  aria-label="Bỏ dải này"
                >
                  ×
                </button>
              )}
            </div>

            {counted && (
              <p
                className={
                  counted.ok
                    ? "mt-2 text-xs font-medium text-slate-600"
                    : "mt-2 text-xs font-medium text-rose-600"
                }
              >
                {counted.ok ? `${counted.count} vé` : counted.error}
              </p>
            )}
          </div>
        );
      })}

      {!disabled && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            className="h-10 px-3 text-xs"
            onClick={() => onChange([...rows, { from: "", to: "" }])}
          >
            + Thêm dải mã
          </Button>
          <div className="min-w-32 flex-1">
            <Readout label="Tổng theo các dải mã" value={`${total} vé`} />
          </div>
        </div>
      )}
    </div>
  );
}

/** Tổng số vé của các dải — dùng để so với số vé đã khai. */
export function rangeRowsTotal(rows: RangeRow[]): number {
  return rows.reduce((s, r) => {
    const c = countTicketRange(r.from, r.to);
    return s + (c.ok ? c.count : 0);
  }, 0);
}

export function toRangeRows(ranges: IssuedRangeDTO[]): RangeRow[] {
  const rows = ranges.map((r) => ({ from: r.from, to: r.to }));
  return rows.length ? rows : [{ from: "", to: "" }];
}

/* ------------------------------------------------------------------ */
/* Vé dời lịch                                                         */
/* ------------------------------------------------------------------ */

export type RescheduleRow = { code: string; toDate: string; note: string };

export function RescheduleRows({
  rows,
  onChange,
  minDate,
  disabled,
}: {
  rows: RescheduleRow[];
  onChange: (next: RescheduleRow[]) => void;
  /** Ngày báo cáo — vé chỉ dời được sang ngày SAU ngày này. */
  minDate: string;
  disabled?: boolean;
}) {
  const set = (index: number, patch: Partial<RescheduleRow>) =>
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="flex items-start gap-2">
            <div className="grid flex-1 gap-2 sm:grid-cols-2">
              <TextInput
                value={row.code}
                onChange={(e) => set(i, { code: e.target.value.toUpperCase() })}
                placeholder="Mã vé dời · MBL0044"
                autoCapitalize="characters"
                spellCheck={false}
                disabled={disabled}
              />
              <TextInput
                type="date"
                value={row.toDate}
                min={minDate}
                onChange={(e) => set(i, { toDate: e.target.value })}
                disabled={disabled}
              />
            </div>
            {rows.length > 1 && !disabled && (
              <button
                type="button"
                onClick={() => onChange(rows.filter((_, k) => k !== i))}
                className="h-12 w-10 shrink-0 rounded-xl border border-slate-300 bg-white text-slate-400 hover:text-rose-600"
                aria-label="Bỏ dòng này"
              >
                ×
              </button>
            )}
          </div>
          <TextInput
            value={row.note}
            onChange={(e) => set(i, { note: e.target.value })}
            placeholder="Ghi chú (không bắt buộc)"
            className="mt-2"
            disabled={disabled}
          />
        </div>
      ))}

      {!disabled && (
        <Button
          type="button"
          variant="ghost"
          className="h-10 px-3 text-xs"
          onClick={() => onChange([...rows, { code: "", toDate: "", note: "" }])}
        >
          + Thêm vé dời lịch
        </Button>
      )}
    </div>
  );
}

export function toRescheduleRows(list: RescheduledDTO[]): RescheduleRow[] {
  const rows = list.map((r) => ({ code: r.code, toDate: r.toDate, note: r.note || "" }));
  return rows.length ? rows : [{ code: "", toDate: "", note: "" }];
}

/* ------------------------------------------------------------------ */
/* Chi tiêu khác                                                       */
/* ------------------------------------------------------------------ */

export type ExpenseRow = {
  content: string;
  amount: number;
  kind: "thu" | "chi";
  /** Tiền mặt / chuyển khoản — chỉ sổ "Tiền trong ngày" của kế toán dùng. */
  method?: "cash" | "transfer";
  note: string;
};

export function ExpenseRows({
  rows,
  onChange,
  disabled,
  withKind,
  withMethod,
  hideTotals,
}: {
  rows: ExpenseRow[];
  onChange: (next: ExpenseRow[]) => void;
  disabled?: boolean;
  /** Hiện tick THU/CHI trên từng dòng — hiện chỉ camera man dùng (khách trả tiền tại bãi). */
  withKind?: boolean;
  /** Hiện tick Tiền mặt/CK trên từng dòng — sổ "Tiền trong ngày" của kế toán. */
  withMethod?: boolean;
  /** Ẩn cặp tổng mặc định — nơi gọi tự vẽ tổng theo kiểu riêng. */
  hideTotals?: boolean;
}) {
  const set = (index: number, patch: Partial<ExpenseRow>) =>
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const totalChi = rows.reduce((s, r) => s + (r.kind !== "thu" ? r.amount || 0 : 0), 0);
  const totalThu = rows.reduce((s, r) => s + (r.kind === "thu" ? r.amount || 0 : 0), 0);
  const total = totalChi;

  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="flex items-start gap-2">
            <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_10rem]">
              <TextInput
                value={row.content}
                onChange={(e) => set(i, { content: e.target.value })}
                placeholder={withKind ? "Nội dung · 3 khách trả tiền tại bãi…" : "Nội dung · sửa dù, gửi xe…"}
                disabled={disabled}
              />
              <MoneyInput value={row.amount} onChange={(v) => set(i, { amount: v })} />
            </div>
            {withMethod && !disabled && (
              <div className="flex shrink-0 overflow-hidden rounded-xl border border-slate-300">
                <button
                  type="button"
                  onClick={() => set(i, { method: "cash" })}
                  className={
                    row.method !== "transfer"
                      ? "h-12 bg-sky-600 px-2.5 text-xs font-semibold text-white"
                      : "h-12 bg-white px-2.5 text-xs font-medium text-slate-500"
                  }
                >
                  TM
                </button>
                <button
                  type="button"
                  onClick={() => set(i, { method: "transfer" })}
                  className={
                    row.method === "transfer"
                      ? "h-12 bg-indigo-600 px-2.5 text-xs font-semibold text-white"
                      : "h-12 bg-white px-2.5 text-xs font-medium text-slate-500"
                  }
                >
                  CK
                </button>
              </div>
            )}
            {withKind && !disabled && (
              <div className="flex shrink-0 overflow-hidden rounded-xl border border-slate-300">
                <button
                  type="button"
                  onClick={() => set(i, { kind: "thu" })}
                  className={
                    row.kind === "thu"
                      ? "h-12 bg-emerald-600 px-3 text-xs font-semibold text-white"
                      : "h-12 bg-white px-3 text-xs font-medium text-slate-500"
                  }
                >
                  Thu
                </button>
                <button
                  type="button"
                  onClick={() => set(i, { kind: "chi" })}
                  className={
                    row.kind !== "thu"
                      ? "h-12 bg-rose-600 px-3 text-xs font-semibold text-white"
                      : "h-12 bg-white px-3 text-xs font-medium text-slate-500"
                  }
                >
                  Chi
                </button>
              </div>
            )}
            {rows.length > 1 && !disabled && (
              <button
                type="button"
                onClick={() => onChange(rows.filter((_, k) => k !== i))}
                className="h-12 w-10 shrink-0 rounded-xl border border-slate-300 bg-white text-slate-400 hover:text-rose-600"
                aria-label="Bỏ khoản này"
              >
                ×
              </button>
            )}
          </div>
          <TextInput
            value={row.note}
            onChange={(e) => set(i, { note: e.target.value })}
            placeholder="Ghi chú (không bắt buộc)"
            className="mt-2"
            disabled={disabled}
          />
        </div>
      ))}

      {!disabled && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            className="h-10 px-3 text-xs"
            onClick={() => onChange([...rows, { content: "", amount: 0, kind: "chi", note: "" }])}
          >
            {withKind ? "+ Thêm dòng thu/chi" : "+ Thêm khoản chi"}
          </Button>
          {hideTotals ? null : withKind ? (
            <>
              <div className="min-w-32 flex-1">
                <Readout label="Tổng thu" value={`${totalThu.toLocaleString("vi-VN")}đ`} />
              </div>
              <div className="min-w-32 flex-1">
                <Readout label="Tổng chi" value={`${totalChi.toLocaleString("vi-VN")}đ`} />
              </div>
            </>
          ) : (
            <div className="min-w-40 flex-1">
              <Readout label="Tổng chi khác" value={`${total.toLocaleString("vi-VN")}đ`} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function toExpenseRows(list: ExpenseDTO[]): ExpenseRow[] {
  const rows = list.map((e) => ({
    content: e.content,
    amount: e.amount,
    kind: (e.kind === "thu" ? "thu" : "chi") as "thu" | "chi",
    method: e.method,
    note: e.note || "",
  }));
  return rows.length ? rows : [{ content: "", amount: 0, kind: "chi" as const, note: "" }];
}

/* ------------------------------------------------------------------ */
/* Vé huỷ / dời lịch / ngoại giao theo nhóm đoàn — của điều phối       */
/* ------------------------------------------------------------------ */


/* ------------------------------------------------------------------ */
/* Vé huỷ / dời lịch / ngoại giao theo nhóm đoàn — của điều phối       */
/* ------------------------------------------------------------------ */

/** Lý do gợi ý khi huỷ / dời lịch — vẫn gõ tự do được. */
export const CANCEL_REASONS = ["Đợi lâu", "Gió/mưa", "Đến trễ"];

export type CancelRow = { codesText: string; reason: string; contactName: string; note: string };

export function CancelEntryRows({
  rows,
  onChange,
  disabled,
  noTickets,
}: {
  rows: CancelRow[];
  onChange: (next: CancelRow[]) => void;
  disabled?: boolean;
  /** Điểm không xuất vé (Hà Nội): ô mã vé đổi thành ô ghi chú nhóm khách. */
  noTickets?: boolean;
}) {
  const set = (index: number, patch: Partial<CancelRow>) =>
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-2">
              {noTickets ? (
                <TextInput
                  value={row.note}
                  onChange={(e) => set(i, { note: e.target.value })}
                  placeholder="Ghi chú · nhóm khách nào, mấy khách…"
                  disabled={disabled}
                />
              ) : (
                <TextInput
                  value={row.codesText}
                  onChange={(e) => set(i, { codesText: e.target.value.toUpperCase() })}
                  placeholder="Mã vé (cùng đoàn ghi chung) · MBL0005 MBL0006"
                  autoCapitalize="characters"
                  spellCheck={false}
                  disabled={disabled}
                />
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                <TextInput
                  value={row.reason}
                  onChange={(e) => set(i, { reason: e.target.value })}
                  placeholder="Lý do · đợi lâu / gió mưa / đến trễ"
                  list="cancel-reasons"
                  disabled={disabled}
                />
                <TextInput
                  value={row.contactName}
                  onChange={(e) => set(i, { contactName: e.target.value })}
                  placeholder="Tên liên hệ"
                  disabled={disabled}
                />
              </div>
            </div>
            {rows.length > 1 && !disabled && (
              <button
                type="button"
                onClick={() => onChange(rows.filter((_, k) => k !== i))}
                className="h-12 w-10 shrink-0 rounded-xl border border-slate-300 bg-white text-slate-400 hover:text-rose-600"
                aria-label="Bỏ nhóm này"
              >
                ×
              </button>
            )}
          </div>
        </div>
      ))}

      <datalist id="cancel-reasons">
        {CANCEL_REASONS.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>

      {!disabled && (
        <Button
          type="button"
          variant="ghost"
          className="h-10 px-3 text-xs"
          onClick={() => onChange([...rows, { codesText: "", reason: "", contactName: "", note: "" }])}
        >
          {noTickets ? "+ Thêm nhóm khách huỷ" : "+ Thêm nhóm vé huỷ"}
        </Button>
      )}
    </div>
  );
}

export type RescheduleEntryRow = {
  codesText: string;
  toDate: string;
  reason: string;
  contactName: string;
  phone: string;
  note: string;
};

export function RescheduleEntryRows({
  rows,
  onChange,
  minDate,
  disabled,
  noTickets,
}: {
  rows: RescheduleEntryRow[];
  onChange: (next: RescheduleEntryRow[]) => void;
  minDate: string;
  disabled?: boolean;
  /** Điểm không xuất vé (Hà Nội): ô mã vé đổi thành ô ghi chú nhóm khách. */
  noTickets?: boolean;
}) {
  const set = (index: number, patch: Partial<RescheduleEntryRow>) =>
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-2">
              <div className="grid gap-2 sm:grid-cols-[1fr_11rem]">
                {noTickets ? (
                  <TextInput
                    value={row.note}
                    onChange={(e) => set(i, { note: e.target.value })}
                    placeholder="Ghi chú · nhóm khách nào, mấy khách…"
                    disabled={disabled}
                  />
                ) : (
                  <TextInput
                    value={row.codesText}
                    onChange={(e) => set(i, { codesText: e.target.value.toUpperCase() })}
                    placeholder="Mã vé (cùng đoàn ghi chung) · MBL0044 MBL0045"
                    autoCapitalize="characters"
                    spellCheck={false}
                    disabled={disabled}
                  />
                )}
                <TextInput
                  type="date"
                  value={row.toDate}
                  min={minDate}
                  onChange={(e) => set(i, { toDate: e.target.value })}
                  disabled={disabled}
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <TextInput
                  value={row.reason}
                  onChange={(e) => set(i, { reason: e.target.value })}
                  placeholder="Lý do"
                  list="cancel-reasons"
                  disabled={disabled}
                />
                <TextInput
                  value={row.contactName}
                  onChange={(e) => set(i, { contactName: e.target.value })}
                  placeholder="Tên liên hệ"
                  disabled={disabled}
                />
                <TextInput
                  value={row.phone}
                  onChange={(e) => set(i, { phone: e.target.value })}
                  placeholder="Số điện thoại"
                  inputMode="tel"
                  disabled={disabled}
                />
              </div>
            </div>
            {rows.length > 1 && !disabled && (
              <button
                type="button"
                onClick={() => onChange(rows.filter((_, k) => k !== i))}
                className="h-12 w-10 shrink-0 rounded-xl border border-slate-300 bg-white text-slate-400 hover:text-rose-600"
                aria-label="Bỏ nhóm này"
              >
                ×
              </button>
            )}
          </div>
        </div>
      ))}

      {!disabled && (
        <Button
          type="button"
          variant="ghost"
          className="h-10 px-3 text-xs"
          onClick={() => onChange([...rows, { codesText: "", toDate: "", reason: "", contactName: "", phone: "", note: "" }])}
        >
          + Thêm nhóm dời lịch
        </Button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* HÀ NỘI (không xuất vé): nhóm KHÁCH huỷ / dời của kế toán chốt ngày   */
/* ------------------------------------------------------------------ */

export type CancelGuestRow = {
  name: string;
  bookingCode: string;
  guests: number;
  source: string;
  refund: number;
  note: string;
  /** Điểm có vé: mã vé của nhóm (nhiều mã một ô) — Hà Nội để trống. */
  codesText: string;
};

/** Khách huỷ hoàn tiền: Tên – mã book – số khách – nguồn – tiền hoàn. */
export function CancelGuestRows({
  rows,
  onChange,
  disabled,
  withCodes,
}: {
  rows: CancelGuestRow[];
  onChange: (next: CancelGuestRow[]) => void;
  disabled?: boolean;
  /** Điểm có vé (Khau Phạ, Sa Pa): hiện ô mã vé của nhóm. */
  withCodes?: boolean;
}) {
  const set = (index: number, patch: Partial<CancelGuestRow>) =>
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-2">
              {withCodes && (
                <TextInput
                  value={row.codesText}
                  onChange={(e) => set(i, { codesText: e.target.value.toUpperCase() })}
                  placeholder="Mã vé (cùng đoàn ghi chung) · MBL0005 MBL0006"
                  autoCapitalize="characters"
                  spellCheck={false}
                  disabled={disabled}
                />
              )}
              <div className="grid gap-2 sm:grid-cols-[1fr_10rem]">
                <TextInput
                  value={row.name}
                  onChange={(e) => set(i, { name: e.target.value })}
                  placeholder="Tên khách / đoàn"
                  disabled={disabled}
                />
                <TextInput
                  value={row.bookingCode}
                  onChange={(e) => set(i, { bookingCode: e.target.value })}
                  placeholder="Mã book"
                  disabled={disabled}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <div>
                  <div className="mb-1 text-[11px] font-medium text-slate-500">Số khách</div>
                  <CountInput compact value={row.guests} onChange={(v) => set(i, { guests: v })} max={100} />
                </div>
                <div>
                  <div className="mb-1 text-[11px] font-medium text-slate-500">Nguồn khách</div>
                  <TextInput
                    value={row.source}
                    onChange={(e) => set(i, { source: e.target.value })}
                    placeholder="Klook / FB…"
                    disabled={disabled}
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <div className="mb-1 text-[11px] font-medium text-slate-500">Số tiền hoàn</div>
                  <MoneyInput value={row.refund} onChange={(v) => set(i, { refund: v })} />
                </div>
              </div>
              <TextInput
                value={row.note}
                onChange={(e) => set(i, { note: e.target.value })}
                placeholder="Ghi chú · lý do huỷ, hoàn qua đâu…"
                disabled={disabled}
              />
            </div>
            {rows.length > 1 && !disabled && (
              <button
                type="button"
                onClick={() => onChange(rows.filter((_, k) => k !== i))}
                className="h-12 w-10 shrink-0 rounded-xl border border-slate-300 bg-white text-slate-400 hover:text-rose-600"
                aria-label="Bỏ nhóm này"
              >
                ×
              </button>
            )}
          </div>
        </div>
      ))}

      {!disabled && (
        <Button
          type="button"
          variant="ghost"
          className="h-10 px-3 text-xs"
          onClick={() =>
            onChange([...rows, { name: "", bookingCode: "", guests: 0, source: "", refund: 0, note: "", codesText: "" }])
          }
        >
          + Thêm khách huỷ
        </Button>
      )}
    </div>
  );
}

export type RescheduleGuestRow = {
  name: string;
  guests: number;
  toDate: string;
  note: string;
  phone: string;
  /** Điểm có vé: mã vé của nhóm — Hà Nội để trống. */
  codesText: string;
  /** Tự đến hay hẹn đón — theo nhóm sang booking của ngày dời. */
  pickup: "self" | "other";
  pickupNote: string;
  expectedTime: string;
  /** id booking đã đẩy vào lịch ngày dời — có rồi thì nút xác nhận chuyển sang "đã đẩy". */
  bookedId: string;
};

/** Khách dời lịch: tên – số lượng – SĐT – ngày dời – ghi chú (+ nút đẩy vào lịch ngày mới). */
export function RescheduleGuestRows({
  rows,
  onChange,
  minDate,
  disabled,
  onConfirmMove,
  withCodes,
}: {
  rows: RescheduleGuestRow[];
  onChange: (next: RescheduleGuestRow[]) => void;
  minDate: string;
  disabled?: boolean;
  /** Có truyền thì mỗi nhóm hiện nút "Xác nhận dời" — đẩy nhóm vào SỔ BOOKING của ngày dời. */
  onConfirmMove?: (index: number) => void;
  /** Điểm có vé: hiện ô mã vé của nhóm. */
  withCodes?: boolean;
}) {
  const set = (index: number, patch: Partial<RescheduleGuestRow>) =>
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-2">
              {withCodes && (
                <TextInput
                  value={row.codesText}
                  onChange={(e) => set(i, { codesText: e.target.value.toUpperCase() })}
                  placeholder="Mã vé (cùng đoàn ghi chung) · MBL0044 MBL0045"
                  autoCapitalize="characters"
                  spellCheck={false}
                  disabled={disabled}
                />
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                <TextInput
                  value={row.name}
                  onChange={(e) => set(i, { name: e.target.value })}
                  placeholder="Tên khách / đoàn"
                  disabled={disabled}
                />
                <TextInput
                  value={row.phone}
                  onChange={(e) => set(i, { phone: e.target.value })}
                  placeholder="SĐT khách · 09xx…"
                  inputMode="tel"
                  disabled={disabled}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="mb-1 text-[11px] font-medium text-slate-500">Số lượng khách</div>
                  <CountInput compact value={row.guests} onChange={(v) => set(i, { guests: v })} max={100} />
                </div>
                <div>
                  <div className="mb-1 text-[11px] font-medium text-slate-500">Dời sang ngày</div>
                  <TextInput
                    type="date"
                    value={row.toDate}
                    min={minDate}
                    onChange={(e) => set(i, { toDate: e.target.value })}
                    disabled={disabled}
                  />
                </div>
              </div>
              {/* Tự đến hay hẹn đón + giờ hẹn — theo nhóm sang booking của ngày dời */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="mb-1 text-[11px] font-medium text-slate-500">Đưa đón</div>
                  <select
                    value={row.pickup}
                    onChange={(e) => set(i, { pickup: e.target.value as "self" | "other", pickupNote: "" })}
                    disabled={disabled}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-sky-600"
                  >
                    <option value="self">Tự đến</option>
                    <option value="other">Hẹn đón — ghi chỗ</option>
                  </select>
                </div>
                <div>
                  <div className="mb-1 text-[11px] font-medium text-slate-500">Giờ hẹn</div>
                  <TextInput
                    type="time"
                    value={row.expectedTime}
                    onChange={(e) => set(i, { expectedTime: e.target.value })}
                    disabled={disabled}
                  />
                </div>
              </div>
              {row.pickup === "other" && (
                <TextInput
                  value={row.pickupNote}
                  onChange={(e) => set(i, { pickupNote: e.target.value })}
                  placeholder="Đón ở đâu · khách sạn, BigC, homestay…"
                  disabled={disabled}
                />
              )}
              <TextInput
                value={row.note}
                onChange={(e) => set(i, { note: e.target.value })}
                placeholder="Ghi chú · lý do dời…"
                disabled={disabled}
              />
              {onConfirmMove &&
                (row.bookedId ? (
                  <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                    ✓ Đã đẩy vào lịch booking ngày {row.toDate ? formatDateKeyVN(row.toDate) : "?"} — nhóm sẽ hiện
                    trong "🛫 Booking bay ngày đó" kèm ghi chú dời từ hôm nay.
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-10 w-full border border-sky-300 bg-sky-50 text-xs font-semibold text-sky-800"
                    disabled={disabled || !row.toDate || (!row.guests && !row.codesText.trim())}
                    onClick={() => onConfirmMove(i)}
                  >
                    ✓ Xác nhận dời — đẩy vào lịch booking ngày {row.toDate ? formatDateKeyVN(row.toDate) : "…"}
                  </Button>
                ))}
            </div>
            {rows.length > 1 && !disabled && (
              <button
                type="button"
                onClick={() => onChange(rows.filter((_, k) => k !== i))}
                className="h-12 w-10 shrink-0 rounded-xl border border-slate-300 bg-white text-slate-400 hover:text-rose-600"
                aria-label="Bỏ nhóm này"
              >
                ×
              </button>
            )}
          </div>
        </div>
      ))}

      {!disabled && (
        <Button
          type="button"
          variant="ghost"
          className="h-10 px-3 text-xs"
          onClick={() =>
            onChange([
              ...rows,
              { name: "", guests: 0, toDate: "", note: "", phone: "", pickup: "self", pickupNote: "", expectedTime: "", codesText: "", bookedId: "" },
            ])
          }
        >
          + Thêm khách dời
        </Button>
      )}
    </div>
  );
}

export type DiploRow = { codesText: string; amount: number; note: string };

export function DiploEntryRows({
  rows,
  onChange,
  disabled,
}: {
  rows: DiploRow[];
  onChange: (next: DiploRow[]) => void;
  disabled?: boolean;
}) {
  const set = (index: number, patch: Partial<DiploRow>) =>
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="flex-1 space-y-2">
            <div className="grid gap-2 sm:grid-cols-[1fr_11rem]">
              <TextInput
                value={row.codesText}
                onChange={(e) => set(i, { codesText: e.target.value.toUpperCase() })}
                placeholder="Mã vé ngoại giao · MBL0001"
                autoCapitalize="characters"
                spellCheck={false}
                disabled={disabled}
              />
              <MoneyInput value={row.amount} onChange={(v) => set(i, { amount: v })} />
            </div>
            <TextInput
              value={row.note}
              onChange={(e) => set(i, { note: e.target.value })}
              placeholder="Ghi chú · đoàn nào, có vé/không vé…"
              disabled={disabled}
            />
          </div>
          {rows.length > 1 && !disabled && (
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, k) => k !== i))}
              className="h-12 w-10 shrink-0 rounded-xl border border-slate-300 bg-white text-slate-400 hover:text-rose-600"
              aria-label="Bỏ dòng này"
            >
              ×
            </button>
          )}
        </div>
      ))}

      {!disabled && (
        <Button
          type="button"
          variant="ghost"
          className="h-10 px-3 text-xs"
          onClick={() => onChange([...rows, { codesText: "", amount: 0, note: "" }])}
        >
          + Thêm khách ngoại giao
        </Button>
      )}
    </div>
  );
}


/* ------------------------------------------------------------------ */
/* Khoản thu có tên — nút "+" dưới hai ô Tiền mặt / Chuyển khoản       */
/* ------------------------------------------------------------------ */

export type RevenueRow = { content: string; method: "cash" | "transfer"; amount: number };

/**
 * Mỗi dòng: nội dung – chọn Tiền mặt HOẶC CK (hai nút, chỉ một sáng) – số tiền.
 * Máy chủ tự cộng các dòng này vào tổng tiền mặt / chuyển khoản của ngày.
 */
export function RevenueRows({
  rows,
  onChange,
  disabled,
}: {
  rows: RevenueRow[];
  onChange: (next: RevenueRow[]) => void;
  disabled?: boolean;
}) {
  const set = (index: number, patch: Partial<RevenueRow>) =>
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_11rem]">
            <TextInput
              value={row.content}
              onChange={(e) => set(i, { content: e.target.value })}
              placeholder="Nội dung · VD: khách đoàn trả thêm"
              disabled={disabled}
            />
            <MoneyInput value={row.amount} onChange={(v) => set(i, { amount: v })} />
          </div>
          <div className="flex shrink-0 overflow-hidden rounded-xl border border-slate-300">
            <button
              type="button"
              disabled={disabled}
              onClick={() => set(i, { method: "cash" })}
              className={
                row.method === "cash"
                  ? "h-12 bg-sky-600 px-3 text-xs font-semibold text-white"
                  : "h-12 bg-white px-3 text-xs font-medium text-slate-500"
              }
            >
              Tiền mặt
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => set(i, { method: "transfer" })}
              className={
                row.method === "transfer"
                  ? "h-12 bg-sky-600 px-3 text-xs font-semibold text-white"
                  : "h-12 bg-white px-3 text-xs font-medium text-slate-500"
              }
            >
              CK
            </button>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, k) => k !== i))}
              className="h-12 w-10 shrink-0 rounded-xl border border-slate-300 bg-white text-slate-400 hover:text-rose-600"
              aria-label="Bỏ dòng này"
            >
              ×
            </button>
          )}
        </div>
      ))}

      {!disabled && (
        <Button
          type="button"
          variant="ghost"
          className="h-10 px-3 text-xs"
          onClick={() => onChange([...rows, { content: "", method: "cash", amount: 0 }])}
        >
          + Thêm khoản thu
        </Button>
      )}
    </div>
  );
}
