// app/baocao/components/MoneyBoardCard.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import { formatDateKeyVN } from "@/lib/baobay/date";
import { ROLE_LABEL, type BaobayRole } from "@/lib/baobay/roles";
import { formatVND } from "@/lib/pricing";
import type { MoneyBoard, MoneyBoardPerson } from "@/services/baobay.service";

import { apiGet } from "./client-api";
import { CollapseCard } from "./ui";

/** Một người + các khoản của họ, bấm tên là xổ ra từng khoản. */
function PersonRows({ people, tone }: { people: MoneyBoardPerson[]; tone: "cash" | "spend" }) {
  const [open, setOpen] = useState<string | null>(null);
  const money = tone === "cash" ? "text-sky-800" : "text-rose-700";

  return (
    <ul className="mt-1.5 space-y-1">
      {people.map((p) => (
        <li key={p.username} className="rounded-lg bg-white px-2 py-1">
          <button
            type="button"
            onClick={() => setOpen((prev) => (prev === p.username ? null : p.username))}
            className="flex w-full items-center gap-2 text-left text-sm"
          >
            <span className="min-w-0 flex-1 truncate">
              <strong className="text-slate-900">{p.name}</strong>
              <span className="text-xs text-slate-400">
                {" "}
                · {ROLE_LABEL[p.role as BaobayRole] ?? p.role ?? "nhân sự"} · {p.items.length} khoản
              </span>
            </span>
            <strong className={"shrink-0 tabular-nums " + money}>{formatVND(p.total)}</strong>
            <span aria-hidden className="shrink-0 text-xs text-slate-400">
              {open === p.username ? "▴" : "▾"}
            </span>
          </button>
          {open === p.username && (
            <ul className="mt-1 space-y-0.5 border-t border-slate-100 pt-1 text-xs text-slate-600">
              {p.items.map((it, i) => (
                <li key={`${it.label}-${i}`} className="flex gap-2">
                  <span className="min-w-0 flex-1 truncate">
                    {it.daySeq > 0 && (
                      <strong className="mr-1 rounded bg-red-600 px-1 font-bold text-white">{it.daySeq}</strong>
                    )}
                    {it.label}
                    {it.bookingCode ? ` · #${it.bookingCode}` : ""}
                    <span className="text-slate-400"> · {it.from}</span>
                  </span>
                  <strong className="shrink-0 tabular-nums">{formatVND(it.amount)}</strong>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * BẢNG TIỀN TRONG NGÀY cho kế toán: khách nào chuyển khoản về TK công ty, TỪNG
 * NGƯỜI đang cầm bao nhiêu tiền mặt, TỪNG NGƯỜI đã chi ra bao nhiêu.
 *
 * Trước đây kế toán phải mở từng báo cáo cộng tay mới biết ai giữ bao nhiêu —
 * mà đó lại là con số cần biết trước khi gọi người ta nộp tiền, và trước khi
 * hoàn lại khoản họ đã bỏ tiền túi chi tại bãi.
 */
export function MoneyBoardCard({
  spot,
  date,
  embedded = false,
}: {
  spot: string;
  date: string;
  /** Nhúng trong thẻ khác (thẻ THU CHI của kế toán): bỏ vỏ thẻ, chỉ hiện tiêu đề con. */
  embedded?: boolean;
}) {
  const [board, setBoard] = useState<MoneyBoard | null>(null);

  const load = useCallback(() => {
    if (!spot) return;
    apiGet<MoneyBoard>(`/api/baocao/money-board?spot=${spot}&date=${date}`)
      .then(setBoard)
      .catch(() => {
        /* ngày chưa có khoản nào thì thôi */
      });
  }, [spot, date]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, [load]);

  if (!board) return null;
  if (board.cashTotal === 0 && board.transfer.total === 0 && board.spendTotal === 0 && board.companySpend.total === 0)
    return null;

  const inner = (
    <div className="grid gap-2 @md:grid-cols-2">
      {/* Tiền đã về công ty — không ai phải nộp lại */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-2.5">
        <div className="text-xs font-semibold text-indigo-900">🏦 Khách chuyển khoản vào TK công ty</div>
        <div className="text-xl font-bold tabular-nums text-indigo-800">{formatVND(board.transfer.total)}</div>
        <div className="mt-0.5 text-[11px] text-indigo-900/70">
          {board.transfer.items.length} khoản · ngày {formatDateKeyVN(board.date)}
        </div>
        {board.transfer.items.length > 0 && (
          <ul className="mt-1.5 max-h-56 space-y-0.5 overflow-y-auto text-xs text-slate-700">
            {board.transfer.items.map((it, i) => (
              <li key={`${it.label}-${i}`} className="flex gap-2">
                <span className="min-w-0 flex-1 truncate">
                  {it.daySeq > 0 && (
                    <strong className="mr-1 rounded bg-red-600 px-1 font-bold text-white">{it.daySeq}</strong>
                  )}
                  {it.label}
                  {it.transferCode ? ` · #${it.transferCode}` : ""}
                </span>
                <strong className="shrink-0 tabular-nums">{formatVND(it.amount)}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Khách trả TIỀN MẶT — từng khách, ai thu. Đối chiếu với sổ vé của quầy */}
      <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-2.5">
        <div className="text-xs font-semibold text-sky-900">💵 Khách trả tiền mặt</div>
        <div className="text-xl font-bold tabular-nums text-sky-800">{formatVND(board.cashTotal)}</div>
        <div className="mt-0.5 text-[11px] text-sky-900/70">
          {board.cashItems.length ? `${board.cashItems.length} khoản · kèm người thu` : "chưa có khoản tiền mặt nào"}
        </div>
        {board.cashItems.length > 0 && (
          <ul className="mt-1.5 max-h-56 space-y-0.5 overflow-y-auto text-xs text-slate-700">
            {board.cashItems.map((it, i) => (
              <li key={`${it.label}-${i}`} className="flex gap-2">
                <span className="min-w-0 flex-1 truncate">
                  {it.daySeq > 0 && (
                    <strong className="mr-1 rounded bg-red-600 px-1 font-bold text-white">{it.daySeq}</strong>
                  )}
                  {it.label}
                  {it.bookingCode ? ` · #${it.bookingCode}` : ""}
                  {it.by ? (
                    <span className="ml-1 rounded bg-sky-200/70 px-1 font-semibold text-sky-900">{it.by} thu</span>
                  ) : null}
                </span>
                <strong className="shrink-0 tabular-nums">{formatVND(it.amount)}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Cộng theo NGƯỜI — con số phải gọi đi nộp về cuối ngày */}
      <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-2.5 @md:col-span-2">
        <div className="text-xs font-semibold text-teal-900">🧑 Ai đang giữ tiền mặt (cộng theo người)</div>
        <div className="mt-0.5 text-[11px] text-teal-900/70">
          {board.cashByPerson.length
            ? `${board.cashByPerson.length} người · bấm tên để xem từng khoản`
            : "chưa ai thu tiền mặt"}
        </div>
        <PersonRows people={board.cashByPerson} tone="cash" />
      </div>

      {/* Công ty chi thẳng từ TK — chiết khấu đại lý trả bằng chuyển khoản */}
      {board.companySpend.total > 0 && (
        <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-2.5 @md:col-span-2">
          <div className="text-xs font-semibold text-violet-900">🤝 Công ty chi từ TK (chiết khấu đại lý)</div>
          <div className="text-xl font-bold tabular-nums text-violet-800">{formatVND(board.companySpend.total)}</div>
          <ul className="mt-1.5 space-y-0.5 text-xs text-slate-700">
            {board.companySpend.items.map((it, i) => (
              <li key={`${it.label}-${i}`} className="flex gap-2">
                <span className="min-w-0 flex-1 truncate">
                  {it.daySeq > 0 && (
                    <strong className="mr-1 rounded bg-red-600 px-1 font-bold text-white">{it.daySeq}</strong>
                  )}
                  {it.label}
                  {it.transferCode ? ` · CK #${it.transferCode}` : ""}
                  {it.by ? <span className="text-slate-400"> · {it.by} ghi</span> : null}
                </span>
                <strong className="shrink-0 tabular-nums">{formatVND(it.amount)}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tiền nhân sự đã bỏ ra tại bãi — kế toán phải hoàn lại */}
      {board.spendTotal > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-2.5 @md:col-span-2">
          <div className="text-xs font-semibold text-rose-900">🧾 Ai đã chi tiền (hoàn lại cho nhân sự)</div>
          <div className="text-xl font-bold tabular-nums text-rose-700">{formatVND(board.spendTotal)}</div>
          <div className="mt-0.5 text-[11px] text-rose-900/70">
            {board.spendByPerson.length} người · bấm tên để xem từng khoản
          </div>
          <PersonRows people={board.spendByPerson} tone="spend" />
        </div>
      )}
    </div>
  );

  if (embedded) {
    return (
      <div className="mt-4 border-t border-slate-200 pt-3">
        <div className="mb-2 flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-bold text-emerald-900">🧮 Tiền trong ngày</span>
          <span className="text-xs text-slate-500">
            CK {formatVND(board.transfer.total)} · tiền mặt {formatVND(board.cashTotal)}
            {board.spendTotal ? ` · đã chi ${formatVND(board.spendTotal)}` : ""}
          </span>
        </div>
        {inner}
      </div>
    );
  }

  return (
    <CollapseCard
      className="border-emerald-300"
      headerClassName="bg-emerald-600 text-white"
      title="🧮 Tiền trong ngày — ai đang giữ"
      hint={`CK ${formatVND(board.transfer.total)} · tiền mặt ${formatVND(board.cashTotal)}`}
    >
      {inner}
    </CollapseCard>
  );
}
