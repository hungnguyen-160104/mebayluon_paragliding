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

import { useState } from "react";

import { formatDateKeyVN } from "@/lib/baobay/date";
import { countTicketRange } from "@/lib/baobay/ticket-code";
import type { DispatcherReportDTO, ExpenseDTO, IssuedRangeDTO, RescheduledDTO } from "@/lib/baobay/types";

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
              <div className="grid flex-1 gap-2 @md:grid-cols-2">
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
                  className="h-10 w-10 shrink-0 rounded-lg border border-slate-300 bg-white text-slate-400 hover:text-rose-600"
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
            <div className="grid flex-1 gap-2 @md:grid-cols-2">
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
                className="h-10 w-10 shrink-0 rounded-lg border border-slate-300 bg-white text-slate-400 hover:text-rose-600"
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

  /**
   * Khoản đã XÁC NHẬN co lại thành một dòng chữ nhỏ — nhập mười khoản mà mỗi
   * khoản một khung to thì cuộn mãi không hết. Khoản đang nhập (hoặc bấm Sửa)
   * mới mở ô ra. Đây là trạng thái hiển thị thuần, không lưu vào máy chủ:
   * khoản đọc từ báo cáo đã lưu mặc định coi như đã xác nhận.
   */
  const [openIdx, setOpenIdx] = useState<number[]>(() =>
    rows.map((r, i) => (!r.content.trim() && !r.amount ? i : -1)).filter((i) => i >= 0),
  );
  const isOpen = (i: number) => openIdx.includes(i) || (!rows[i].content.trim() && !rows[i].amount);
  const openRow = (i: number) => setOpenIdx((prev) => (prev.includes(i) ? prev : [...prev, i]));
  const closeRow = (i: number) => setOpenIdx((prev) => prev.filter((k) => k !== i));
  /** Xoá một dòng: chỉ số các dòng sau tụt một bậc, dấu "đang mở" phải tụt theo. */
  const removeRow = (i: number) => {
    onChange(rows.filter((_, k) => k !== i));
    setOpenIdx((prev) => prev.filter((k) => k !== i).map((k) => (k > i ? k - 1 : k)));
  };

  const totalChi = rows.reduce((s, r) => s + (r.kind !== "thu" ? r.amount || 0 : 0), 0);
  const totalThu = rows.reduce((s, r) => s + (r.kind === "thu" ? r.amount || 0 : 0), 0);
  const total = totalChi;

  return (
    <div className="space-y-3">
      {rows.map((row, i) =>
        !isOpen(i) ? (
          /* ĐÃ XÁC NHẬN — một dòng chữ nhỏ, kèm Sửa / Xoá */
          <div
            key={i}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5"
          >
            <span className="min-w-0 flex-1 text-sm leading-snug text-slate-700">
              <span
                className={
                  row.kind === "thu"
                    ? "mr-1 font-bold text-emerald-700"
                    : "mr-1 font-bold text-rose-700"
                }
              >
                {row.kind === "thu" ? "THU" : "CHI"}
              </span>
              {row.content || "(chưa ghi nội dung)"}
              <strong className="ml-1 tabular-nums">{(row.amount || 0).toLocaleString("vi-VN")}đ</strong>
              {withMethod && (
                <span className="ml-1 text-xs text-slate-500">· {row.method === "transfer" ? "CK" : "TM"}</span>
              )}
              {row.note && <span className="ml-1 text-xs text-slate-400">· {row.note}</span>}
            </span>
            {!disabled && (
              <span className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => openRow(i)}
                  className="h-7 rounded-lg border border-slate-300 bg-white px-2 text-xs font-medium text-slate-600 hover:border-sky-500 hover:text-sky-700"
                >
                  Sửa
                </button>
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="h-7 rounded-lg border border-slate-300 bg-white px-2 text-xs font-medium text-slate-400 hover:border-rose-500 hover:text-rose-600"
                >
                  Xoá
                </button>
              </span>
            )}
          </div>
        ) : (
        <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="flex items-start gap-2">
            <div className="grid flex-1 gap-2 @md:grid-cols-[1.3fr_7.5rem_1fr]">
              <TextInput
                value={row.content}
                onChange={(e) => set(i, { content: e.target.value })}
                placeholder={withKind ? "Nội dung · 3 khách trả tiền tại bãi…" : "Nội dung · sửa dù, gửi xe…"}
                disabled={disabled}
              />
              <MoneyInput value={row.amount} onChange={(v) => set(i, { amount: v })} />
              <TextInput
                value={row.note}
                onChange={(e) => set(i, { note: e.target.value })}
                placeholder="Ghi chú…"
                disabled={disabled}
              />
            </div>
            {withMethod && !disabled && (
              <div className="flex shrink-0 overflow-hidden rounded-xl border border-slate-300">
                <button
                  type="button"
                  onClick={() => set(i, { method: "cash" })}
                  className={
                    row.method !== "transfer"
                      ? "h-10 bg-sky-600 px-2.5 text-xs font-semibold text-white"
                      : "h-10 bg-white px-2.5 text-xs font-medium text-slate-500"
                  }
                >
                  TM
                </button>
                <button
                  type="button"
                  onClick={() => set(i, { method: "transfer" })}
                  className={
                    row.method === "transfer"
                      ? "h-10 bg-indigo-600 px-2.5 text-xs font-semibold text-white"
                      : "h-10 bg-white px-2.5 text-xs font-medium text-slate-500"
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
                      ? "h-10 bg-emerald-600 px-3 text-xs font-semibold text-white"
                      : "h-10 bg-white px-3 text-xs font-medium text-slate-500"
                  }
                >
                  Thu
                </button>
                <button
                  type="button"
                  onClick={() => set(i, { kind: "chi" })}
                  className={
                    row.kind !== "thu"
                      ? "h-10 bg-rose-600 px-3 text-xs font-semibold text-white"
                      : "h-10 bg-white px-3 text-xs font-medium text-slate-500"
                  }
                >
                  Chi
                </button>
              </div>
            )}
            {rows.length > 1 && !disabled && (
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="h-10 w-10 shrink-0 rounded-lg border border-slate-300 bg-white text-slate-400 hover:text-rose-600"
                aria-label="Bỏ khoản này"
              >
                ×
              </button>
            )}
          </div>
          {!disabled && (
            <div className="mt-2 flex items-center gap-2">
              <Button
                type="button"
                className="h-8 bg-emerald-600 px-3 text-xs hover:bg-emerald-700"
                disabled={!row.content.trim() && !row.amount}
                onClick={() => closeRow(i)}
                title="Xác nhận khoản này — dòng sẽ co lại cho gọn, sửa lại được"
              >
                ✓ Xác nhận
              </Button>
              <span className="text-[11px] text-slate-400">
                Xác nhận xong khoản này co lại một dòng, vẫn sửa/xoá được.
              </span>
            </div>
          )}
        </div>
        ),
      )}

      {!disabled && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            className="h-10 border border-sky-400 bg-sky-50 px-4 text-xs font-bold text-sky-800 hover:bg-sky-100"
            onClick={() => {
              onChange([...rows, { content: "", amount: 0, kind: "chi", note: "" }]);
              openRow(rows.length);
            }}
          >
            ＋ {withKind ? "Thêm dòng thu/chi" : "Thêm khoản chi"}
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

/** Trải mọi nguồn tiền của báo cáo (cũ lẫn mới) thành sổ THU CHI một dòng một khoản. */
export function dispatcherMoneyRows(r: DispatcherReportDTO): ExpenseRow[] {
  const rows: ExpenseRow[] = [];
  for (const e of r.revenueEntries) {
    rows.push({ content: e.content, amount: e.amount, kind: "thu", method: e.method, note: "" });
  }
  const cashRest = r.cashReceived - r.revenueEntries.filter((e) => e.method === "cash").reduce((a, e) => a + e.amount, 0);
  const transferRest =
    r.transferReceived - r.revenueEntries.filter((e) => e.method === "transfer").reduce((a, e) => a + e.amount, 0);
  if (cashRest > 0) rows.push({ content: "Tiền thu trong ngày", amount: cashRest, kind: "thu", method: "cash", note: "" });
  if (transferRest > 0)
    rows.push({ content: "Khách chuyển khoản", amount: transferRest, kind: "thu", method: "transfer", note: "" });
  if (r.guestWaterCost > 0) rows.push({ content: "Nước cho khách", amount: r.guestWaterCost, kind: "chi", method: "cash", note: "" });
  if (r.mountainCarCost > 0) rows.push({ content: "Xe lên núi", amount: r.mountainCarCost, kind: "chi", method: "cash", note: "" });
  if (r.shuttleCarCost > 0) rows.push({ content: "Xe đưa đón", amount: r.shuttleCarCost, kind: "chi", method: "cash", note: "" });
  for (const e of r.expenses) {
    if (!e.content && !e.amount) continue;
    rows.push({
      content: e.content,
      amount: e.amount,
      kind: e.kind === "thu" ? "thu" : "chi",
      method: e.method,
      note: e.note || "",
    });
  }
  return rows.length ? rows : [{ content: "", amount: 0, kind: "thu", method: "cash", note: "" }];
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
              <div className="grid gap-2 @md:grid-cols-2">
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
                className="h-10 w-10 shrink-0 rounded-lg border border-slate-300 bg-white text-slate-400 hover:text-rose-600"
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
              <div className="grid gap-2 @md:grid-cols-[1fr_11rem]">
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
              <div className="grid gap-2 @md:grid-cols-2 @2xl:grid-cols-3">
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
                className="h-10 w-10 shrink-0 rounded-lg border border-slate-300 bg-white text-slate-400 hover:text-rose-600"
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
  /** Huỷ khi CHƯA XUẤT VÉ — không có mã vé để thu hồi, chỉ hoàn tiền. */
  noTicket?: boolean;
  /** Đã bấm "Xác nhận huỷ" — booking trong sổ đã chuyển sang đã huỷ. */
  cancelledDone?: boolean;
  /** Tiền khách đã thanh toán trước đó. */
  paid?: number;
  /** Phí dịch vụ khách đã dùng — trừ vào tiền hoàn (xe đón, flycam đã quay…). */
  usedFee?: number;
  /** Hoàn bằng CK (ra từ TK công ty) hay TM (nhân viên chi tại chỗ). */
  refundMethod?: "cash" | "transfer";
  /** Booking đã chọn từ danh sách chờ bay — để khỏi gõ lại tên và số khách. */
  bookedId?: string;
};

/** Booking trong ngày để chọn — nơi gọi truyền vào, rỗng thì ô chọn tự ẩn. */
export type BookingPick = {
  id: string;
  daySeq: number;
  contactName: string;
  phone: string;
  guestCount: number;
  source: string;
  bookingCode: string;
  deposit: number;
  status: string;
  /** Quầy đã tích 🎫 xuất vé cho đoàn này chưa — quyết định có mã vé để thu hồi. */
  ticketIssued: boolean;
};

/**
 * CHỌN BOOKING rồi máy điền hộ tên / số khách / nguồn / tiền đã trả.
 *
 * Trước đây khách huỷ hay dời lịch đều phải gõ lại tay tên và số khách, trong
 * khi booking đó đang nằm sẵn trong danh sách chờ bay của ngày — gõ lại là vừa
 * mất công vừa lệch tên, đến lúc đối chiếu không biết là ai.
 */
function BookingPicker({
  bookings,
  value,
  onPick,
  disabled,
  label,
}: {
  bookings: BookingPick[];
  value: string;
  onPick: (b: BookingPick | null) => void;
  disabled?: boolean;
  label: string;
}) {
  if (!bookings.length) return null;
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onPick(bookings.find((b) => b.id === e.target.value) ?? null)}
      className="h-10 w-full rounded-lg border border-sky-300 bg-sky-50/60 px-2 text-sm font-medium text-slate-800 outline-none focus:border-sky-600 disabled:bg-slate-50"
    >
      <option value="">— {label} (hoặc gõ tay bên dưới) —</option>
      {bookings.map((b) => (
        <option key={b.id} value={b.id}>
          #{b.daySeq} {b.contactName || b.phone || "khách"} · {b.guestCount} khách
          {b.source ? ` · ${b.source}` : ""}
          {b.deposit ? ` · đã trả ${Math.round(b.deposit / 1000).toLocaleString("vi-VN")}k` : ""}
          {b.status === "done" ? " · đã bay" : ""}
        </option>
      ))}
    </select>
  );
}

/** Khách huỷ hoàn tiền: Tên – mã book – số khách – nguồn – tiền hoàn. */
export function CancelGuestRows({
  rows,
  onChange,
  disabled,
  withCodes,
  bookings,
  onConfirmCancel,
}: {
  rows: CancelGuestRow[];
  onChange: (next: CancelGuestRow[]) => void;
  disabled?: boolean;
  /** Điểm có vé (Khau Phạ, Sa Pa): hiện ô mã vé của nhóm. */
  withCodes?: boolean;
  /** Booking trong ngày — chọn thay vì gõ tay. */
  bookings?: BookingPick[];
  /**
   * Có truyền thì mỗi nhóm hiện nút "Xác nhận huỷ" — HUỶ THẬT booking đã chọn
   * trong sổ (chuyển sang đã huỷ, ghi tiền hoàn, thu hồi mã vé). Không bấm thì
   * dòng này chỉ là số liệu trong báo cáo ngày.
   */
  onConfirmCancel?: (index: number) => void;
}) {
  const set = (index: number, patch: Partial<CancelGuestRow>) =>
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  /** Chọn booking: điền hộ tên, số khách, nguồn, mã book và tiền đã trả. */
  const pick = (i: number, b: BookingPick | null) =>
    set(i, {
      bookedId: b?.id ?? "",
      ...(b
        ? {
            name: b.contactName || b.phone || "",
            guests: b.guestCount,
            source: b.source,
            bookingCode: b.bookingCode || b.phone || "",
            paid: b.deposit,
            refund: b.deposit,
            usedFee: 0,
            /**
             * Lấy luôn trạng thái VÉ từ sổ booking: quầy đã tích 🎫 xuất vé thì
             * nhóm này có vé phải thu hồi, chưa tích thì không. Để người nhập tự
             * chọn là thừa một bước và sai một cách vô nghĩa — sổ biết rồi.
             */
            noTicket: !b.ticketIssued,
          }
        : {}),
    });

  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-2">
              {/* Có nhóm huỷ TRƯỚC khi quầy kịp xuất vé — không có mã nào để thu hồi,
                  chỉ có tiền đã thu phải hoàn lại. */}
              {withCodes && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex h-10 shrink-0 overflow-hidden rounded-lg border border-slate-300">
                    {(
                      [
                        [false, "Đã xuất vé"],
                        [true, "Chưa xuất vé"],
                      ] as Array<[boolean, string]>
                    ).map(([v, label]) => (
                      <button
                        key={label}
                        type="button"
                        disabled={disabled}
                        onClick={() => set(i, { noTicket: v, ...(v ? { codesText: "" } : {}) })}
                        className={
                          Boolean(row.noTicket) === v
                            ? "bg-slate-800 px-2.5 text-xs font-semibold text-white"
                            : "bg-white px-2.5 text-xs font-medium text-slate-500"
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {row.bookedId && (
                    <span className="text-[11px] text-slate-500">
                      (lấy theo sổ booking — sửa được nếu sổ ghi nhầm)
                    </span>
                  )}
                  {!row.noTicket && (
                    <TextInput
                      value={row.codesText}
                      onChange={(e) => set(i, { codesText: e.target.value.toUpperCase() })}
                      placeholder="Mã vé (cùng đoàn ghi chung) · MBL0005 MBL0006"
                      autoCapitalize="characters"
                      spellCheck={false}
                      disabled={disabled}
                      className="min-w-48 flex-1"
                    />
                  )}
                </div>
              )}
              <BookingPicker
                bookings={bookings ?? []}
                value={row.bookedId ?? ""}
                onPick={(b) => pick(i, b)}
                disabled={disabled}
                label="chọn booking cần huỷ"
              />
              <div className="grid gap-2 @md:grid-cols-[1fr_10rem]">
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
              <div className="grid grid-cols-2 gap-2 @md:grid-cols-3">
                <div>
                  <div className="mb-1 text-[11px] font-medium text-slate-500">
                    Số khách{(() => {
                      const b = bookings?.find((x) => x.id === row.bookedId);
                      return b ? ` (tối đa ${b.guestCount})` : "";
                    })()}
                  </div>
                  {/* Chọn booking rồi thì KHÔNG huỷ quá số khách của đoàn đó — huỷ 6
                      người trong đoàn 1 người là số liệu vô nghĩa, mà lại lọt vào
                      đối chiếu vé thu về. */}
                  <CountInput
                    compact
                    value={row.guests}
                    onChange={(v) => set(i, { guests: v })}
                    max={bookings?.find((x) => x.id === row.bookedId)?.guestCount ?? 100}
                  />
                </div>
                <div>
                  <div className="mb-1 truncate text-[11px] font-medium text-slate-500">Nguồn khách</div>
                  <TextInput
                    value={row.source}
                    onChange={(e) => set(i, { source: e.target.value })}
                    placeholder="Klook / FB…"
                    disabled={disabled}
                  />
                </div>
                <div className="col-span-2 @md:col-span-1">
                  <div className="mb-1 truncate text-[11px] font-medium text-slate-500">Số tiền hoàn</div>
                  <MoneyInput value={row.refund} onChange={(v) => set(i, { refund: v })} />
                </div>
                {/* Hoàn tiền là chuyện của TIỀN, không liên quan đã xuất vé hay chưa —
                    bản cũ chỉ hiện khi "chưa xuất vé" nên khách đã cầm vé mà đòi hoàn
                    thì không ghi được bằng gì. */}
                {
                  <>
                    <div>
                      <div className="mb-1 truncate text-[11px] font-medium text-slate-500">Tiền đã thanh toán</div>
                      <MoneyInput value={row.paid ?? 0} onChange={(v) => set(i, { paid: v })} />
                    </div>
                    <div>
                      <div className="mb-1 truncate text-[11px] font-medium text-slate-500">Phí dịch vụ đã dùng</div>
                      {/* Trừ vào tiền hoàn — khách huỷ nhưng đã dùng xe/flycam thì chịu phần đó */}
                      <MoneyInput
                        value={row.usedFee ?? 0}
                        onChange={(v) =>
                          set(i, { usedFee: v, refund: Math.max(0, (row.paid ?? 0) - v) })
                        }
                      />
                    </div>
                    <div>
                      <div className="mb-1 truncate text-[11px] font-medium text-slate-500">Hoàn bằng</div>
                      <div className="flex h-10 overflow-hidden rounded-lg border border-slate-300">
                        {(
                          [
                            ["transfer", "CK"],
                            ["cash", "TM"],
                          ] as Array<["transfer" | "cash", string]>
                        ).map(([k, label]) => (
                          <button
                            key={k}
                            type="button"
                            disabled={disabled}
                            onClick={() => set(i, { refundMethod: k })}
                            title={
                              k === "transfer"
                                ? "Tiền hoàn ra từ TK công ty"
                                : "Nhân viên chi tiền mặt tại chỗ"
                            }
                            className={
                              (row.refundMethod ?? "transfer") === k
                                ? k === "transfer"
                                  ? "flex-1 bg-indigo-600 text-xs font-semibold text-white"
                                  : "flex-1 bg-sky-600 text-xs font-semibold text-white"
                                : "flex-1 bg-white text-xs font-medium text-slate-500"
                            }
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                }
              </div>
              {row.refund > 0 && (
                <p className="text-[11px] leading-tight text-slate-500">
                  {(row.refundMethod ?? "transfer") === "transfer"
                    ? "CK: tiền hoàn ra từ TK CÔNG TY."
                    : "TM: nhân viên chi tại chỗ — nhớ ghi khoản chi này vào sổ THU CHI của mình."}
                </p>
              )}
              <TextInput
                value={row.note}
                onChange={(e) => set(i, { note: e.target.value })}
                placeholder="Ghi chú · lý do huỷ, hoàn qua đâu…"
                disabled={disabled}
              />
              {/* Huỷ THẬT trong sổ booking, không chỉ ghi số vào báo cáo ngày */}
              {onConfirmCancel &&
                (row.cancelledDone ? (
                  <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">
                    ✓ Đã huỷ trong sổ booking — nhóm này chuyển sang “đã huỷ”, tiền hoàn đã ghi.
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-10 w-full border border-rose-300 bg-rose-50 text-xs font-semibold text-rose-800"
                    disabled={disabled || !row.bookedId}
                    onClick={() => onConfirmCancel(i)}
                    title={row.bookedId ? "Huỷ booking đã chọn trong sổ" : "Chọn booking ở ô trên trước"}
                  >
                    {row.bookedId ? "✓ Xác nhận huỷ booking này trong sổ" : "Chọn booking ở ô trên rồi mới xác nhận huỷ được"}
                  </Button>
                ))}
            </div>
            {rows.length > 1 && !disabled && (
              <button
                type="button"
                onClick={() => onChange(rows.filter((_, k) => k !== i))}
                className="h-10 w-10 shrink-0 rounded-lg border border-slate-300 bg-white text-slate-400 hover:text-rose-600"
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
  bookings,
}: {
  rows: RescheduleGuestRow[];
  onChange: (next: RescheduleGuestRow[]) => void;
  minDate: string;
  disabled?: boolean;
  /** Có truyền thì mỗi nhóm hiện nút "Xác nhận dời" — đẩy nhóm vào SỔ BOOKING của ngày dời. */
  onConfirmMove?: (index: number) => void;
  /** Điểm có vé: hiện ô mã vé của nhóm. */
  withCodes?: boolean;
  /** Booking đang chờ bay hôm nay — chọn thay vì gõ tay. */
  bookings?: BookingPick[];
}) {
  const set = (index: number, patch: Partial<RescheduleGuestRow>) =>
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  /**
   * Chọn booking cần dời: điền hộ tên, số khách, SĐT.
   *
   * `bookedId` ở đây KHÁC nghĩa với lúc bấm "Xác nhận dời": chọn xong mới là
   * đang chỉ định nhóm nào, còn bấm xác nhận mới thật sự đẩy sang ngày mới. Nên
   * chọn xong vẫn hiện nút xác nhận như thường.
   */
  const pick = (i: number, b: BookingPick | null) =>
    set(i, b ? { name: b.contactName || b.phone || "", guests: b.guestCount, phone: b.phone, bookedId: "" } : {});

  /** Dời không quá số khách của đoàn đã chọn — như bên huỷ. */
  const capOf = (row: RescheduleGuestRow) =>
    bookings?.find((b) => b.contactName === row.name || (row.phone && b.phone === row.phone))?.guestCount ?? 100;

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
              <BookingPicker
                bookings={bookings ?? []}
                value=""
                onPick={(b) => pick(i, b)}
                disabled={disabled || Boolean(row.bookedId)}
                label="chọn booking cần dời"
              />
              <div className="grid gap-2 @md:grid-cols-2">
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
              {/* 4 ô một hàng chỉ khi thẻ thật rộng — khổ vừa giữ 2×2, nhãn ngắn
                  lại để không đè lên ô bên cạnh. */}
              <div className="grid grid-cols-2 gap-2 @2xl:grid-cols-4">
                <div>
                  <div className="mb-1 truncate text-[11px] font-medium text-slate-500">
                    Số khách{capOf(row) < 100 ? ` (tối đa ${capOf(row)})` : ""}
                  </div>
                  {/* Không dời quá số khách của đoàn đã chọn — xem chú thích bên huỷ */}
                  <CountInput compact value={row.guests} onChange={(v) => set(i, { guests: v })} max={capOf(row)} />
                </div>
                <div>
                  <div className="mb-1 truncate text-[11px] font-medium text-slate-500">Dời sang</div>
                  <TextInput
                    type="date"
                    value={row.toDate}
                    min={minDate}
                    onChange={(e) => set(i, { toDate: e.target.value })}
                    disabled={disabled}
                  />
                </div>
                <div>
                  <div className="mb-1 truncate text-[11px] font-medium text-slate-500">Đưa đón</div>
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
                  <div className="mb-1 truncate text-[11px] font-medium text-slate-500">Giờ hẹn</div>
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
                className="h-10 w-10 shrink-0 rounded-lg border border-slate-300 bg-white text-slate-400 hover:text-rose-600"
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
            <div className="grid gap-2 @md:grid-cols-[1fr_11rem]">
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
              className="h-10 w-10 shrink-0 rounded-lg border border-slate-300 bg-white text-slate-400 hover:text-rose-600"
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
          <div className="grid flex-1 gap-2 @md:grid-cols-[1fr_11rem]">
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
                  ? "h-10 bg-sky-600 px-3 text-xs font-semibold text-white"
                  : "h-10 bg-white px-3 text-xs font-medium text-slate-500"
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
                  ? "h-10 bg-sky-600 px-3 text-xs font-semibold text-white"
                  : "h-10 bg-white px-3 text-xs font-medium text-slate-500"
              }
            >
              CK
            </button>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, k) => k !== i))}
              className="h-10 w-10 shrink-0 rounded-lg border border-slate-300 bg-white text-slate-400 hover:text-rose-600"
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
