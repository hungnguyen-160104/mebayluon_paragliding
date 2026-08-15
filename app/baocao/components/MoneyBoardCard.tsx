// app/baocao/components/MoneyBoardCard.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import { formatDateKeyVN } from "@/lib/baobay/date";
import { ROLE_LABEL, type BaobayRole } from "@/lib/baobay/roles";
import { formatVND } from "@/lib/pricing";
import type { MoneyBoard } from "@/services/baobay.service";

import { apiGet } from "./client-api";
import { CollapseCard } from "./ui";

/**
 * BẢNG TIỀN TRONG NGÀY cho kế toán: tiền chuyển khoản đã về TK công ty, và
 * TỪNG NGƯỜI đang cầm bao nhiêu tiền mặt.
 *
 * Trước đây kế toán phải mở từng báo cáo cộng tay mới biết ai giữ bao nhiêu —
 * mà đó lại là con số cần biết trước khi gọi người ta nộp tiền.
 */
export function MoneyBoardCard({ spot, date }: { spot: string; date: string }) {
  const [board, setBoard] = useState<MoneyBoard | null>(null);
  const [openPerson, setOpenPerson] = useState<string | null>(null);

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

  if (!board || (board.cashTotal === 0 && board.transfer.total === 0)) return null;

  return (
    <CollapseCard
      className="border-emerald-300"
      headerClassName="bg-emerald-600 text-white"
      title="🧮 Tiền trong ngày — ai đang giữ"
      hint={`CK ${formatVND(board.transfer.total)} · tiền mặt ${formatVND(board.cashTotal)}`}
    >
      <div className="grid gap-2 @md:grid-cols-2">
        {/* Tiền đã về công ty — không ai phải nộp lại */}
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-2.5">
          <div className="text-xs font-semibold text-indigo-900">Chuyển khoản về TK công ty</div>
          <div className="text-xl font-bold tabular-nums text-indigo-800">{formatVND(board.transfer.total)}</div>
          <div className="mt-0.5 text-[11px] text-indigo-900/70">
            {board.transfer.items.length} khoản · ngày {formatDateKeyVN(board.date)}
          </div>
          {board.transfer.items.length > 0 && (
            <ul className="mt-1.5 max-h-40 space-y-0.5 overflow-y-auto text-xs text-slate-700">
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

        {/* Tiền mặt đang nằm trong tay nhân sự — đây là phần phải đi thu về */}
        <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-2.5">
          <div className="text-xs font-semibold text-sky-900">Tiền mặt nhân sự đang giữ</div>
          <div className="text-xl font-bold tabular-nums text-sky-800">{formatVND(board.cashTotal)}</div>
          <div className="mt-0.5 text-[11px] text-sky-900/70">{board.cashByPerson.length} người</div>
          <ul className="mt-1.5 space-y-1">
            {board.cashByPerson.map((p) => (
              <li key={p.username} className="rounded-lg bg-white px-2 py-1">
                <button
                  type="button"
                  onClick={() => setOpenPerson((prev) => (prev === p.username ? null : p.username))}
                  className="flex w-full items-center gap-2 text-left text-sm"
                >
                  <span className="min-w-0 flex-1 truncate">
                    <strong className="text-slate-900">{p.name}</strong>
                    <span className="text-xs text-slate-400">
                      {" "}
                      · {ROLE_LABEL[p.role as BaobayRole] ?? p.role ?? "nhân sự"}
                    </span>
                  </span>
                  <strong className="shrink-0 tabular-nums text-sky-800">{formatVND(p.total)}</strong>
                  <span aria-hidden className="shrink-0 text-xs text-slate-400">
                    {openPerson === p.username ? "▴" : "▾"}
                  </span>
                </button>
                {openPerson === p.username && (
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
        </div>
      </div>
    </CollapseCard>
  );
}
