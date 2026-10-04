// app/baocao/components/CafeMoneySummary.tsx
"use client";

/**
 * TỔNG TIỀN QUẦY CAFE (chủ 04/10: "phần cafe, cần hiện tổng tiền đã chi, tổng
 * tiền còn giữ đến hiện tại, và theo tháng").
 *
 * Số lấy từ /api/baocao/cafe/tien — cùng một đường tính với số "đang giữ" của
 * khung nộp tiền sổ cafe (cafeCashDays), nên hai chỗ không thể lệch nhau.
 * Quản trị / kế toán thấy mọi người từng đứng quầy; người khác chỉ thấy mình.
 */

import { Fragment, useEffect, useMemo, useState } from "react";

import type { CafeMoneyPerson } from "@/services/baobay.service";
import { formatVND } from "@/lib/pricing";

import { apiGet } from "./client-api";
import { Banner, Card } from "./ui";

const ALL = "all";

/** Số gọn trong bảng ("13.217k") để 5 cột vừa màn điện thoại; rê chuột/giữ tay xem số đủ. */
function K({ n, className }: { n: number; className?: string }) {
  return (
    <span className={className} title={formatVND(n)}>
      {n ? `${(n / 1000).toLocaleString("vi-VN")}k` : "0"}
    </span>
  );
}

function monthLabel(m: string): string {
  const [y, mo] = m.split("-");
  return `T${Number(mo)}/${y}`;
}

export function CafeMoneySummary({ refreshKey }: { refreshKey?: unknown }) {
  const [people, setPeople] = useState<CafeMoneyPerson[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState<string>(ALL);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    apiGet<{ people: CafeMoneyPerson[] }>(`/api/baocao/cafe/tien`)
      .then((r) => {
        if (!alive) return;
        setPeople(r.people);
        setError(null);
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : "Không tải được tiền quầy cafe");
      });
    return () => {
      alive = false;
    };
  }, [refreshKey]);

  const months = useMemo(
    () => [...new Set((people ?? []).flatMap((p) => p.months.map((m) => m.month)))].sort((a, b) => b.localeCompare(a)),
    [people],
  );

  if (error) return <Banner tone="error">{error}</Banner>;
  if (!people) return null;

  const one = people.length === 1 ? people[0] : null;
  /** Số của một người theo lựa chọn tháng: "mọi tháng" = luỹ kế, còn giữ = hiện tại. */
  const rowOf = (p: CafeMoneyPerson) => {
    if (month === ALL) return { collected: p.collectedTotal, spent: p.spentTotal, handed: p.handedTotal, holding: p.holding };
    const m = p.months.find((x) => x.month === month);
    if (!m) {
      // Tháng đó không phát sinh: còn giữ = số cuối của tháng gần nhất trước đó
      const prev = p.months.find((x) => x.month < month);
      return { collected: 0, spent: 0, handed: 0, holding: prev?.holdingEnd ?? 0 };
    }
    return { collected: m.collected, spent: m.spent, handed: m.handed, holding: m.holdingEnd };
  };
  const sum = people.reduce(
    (t, p) => {
      const r = rowOf(p);
      return { collected: t.collected + r.collected, spent: t.spent + r.spent, handed: t.handed + r.handed, holding: t.holding + r.holding };
    },
    { collected: 0, spent: 0, handed: 0, holding: 0 },
  );
  const holdLabel = month === ALL ? "Còn giữ đến hiện tại" : `Còn giữ cuối ${monthLabel(month)}`;

  return (
    <Card
      title="💰 TIỀN QUẦY CAFE — TỔNG & THEO THÁNG"
      hint="Chỉ tiền MẶT (khách quét mã vào thẳng TK công ty). Chi = phiếu chi máy bán + chi gõ trong báo cáo. Đã nộp gồm cả lệnh còn chờ ký nhận."
    >
      {one ? (
        /* Người trực quầy: hai con số lớn + bảng từng tháng của chính mình */
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">Tổng đã chi</div>
              <div className="text-lg font-bold tabular-nums text-rose-900">{formatVND(one.spentTotal)}</div>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Còn giữ đến hiện tại</div>
              <div className="text-lg font-bold tabular-nums text-emerald-900">{formatVND(one.holding)}</div>
            </div>
          </div>
          <MonthTable person={one} />
        </>
      ) : (
        /* Quản trị / kế toán: mọi người, chọn tháng, bấm tên xem từng tháng */
        <>
          <div className="mb-2 flex flex-wrap gap-1">
            {[ALL, ...months].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMonth(m)}
                className={
                  "rounded-full border px-2.5 py-0.5 text-xs " +
                  (month === m ? "border-slate-800 bg-slate-800 font-semibold text-white" : "border-slate-300 bg-white text-slate-600")
                }
              >
                {m === ALL ? "Mọi tháng" : monthLabel(m)}
              </button>
            ))}
          </div>
          {people.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có ai phát sinh tiền quầy cafe.</p>
          ) : (
            <div className="-mx-1 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wide text-slate-500">
                    <th className="px-1 py-1">Nhân viên</th>
                    <th className="px-1 py-1 text-right">Thu TM</th>
                    <th className="px-1 py-1 text-right">Đã chi</th>
                    <th className="px-1 py-1 text-right">Đã nộp</th>
                    <th className="px-1 py-1 text-right">{holdLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {people.map((p) => {
                    const r = rowOf(p);
                    return (
                      <Fragment key={p.username}>
                        <tr
                          className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                          onClick={() => setOpen((o) => (o === p.username ? null : p.username))}
                          title="Bấm để xem từng tháng"
                        >
                          <td className="px-1 py-1 font-semibold text-slate-800">
                            {open === p.username ? "▾" : "▸"} {p.name}
                          </td>
                          <td className="px-1 py-1 text-right tabular-nums"><K n={r.collected} /></td>
                          <td className="px-1 py-1 text-right tabular-nums text-rose-700"><K n={r.spent} /></td>
                          <td className="px-1 py-1 text-right tabular-nums"><K n={r.handed} /></td>
                          <td className="px-1 py-1 text-right font-bold tabular-nums text-emerald-800"><K n={r.holding} /></td>
                        </tr>
                        {open === p.username && (
                          <tr>
                            <td colSpan={5} className="bg-slate-50 px-1 pb-2">
                              <div className="pt-1 text-[11px] text-slate-600">
                                Tổng đã chi <b className="text-rose-700">{formatVND(p.spentTotal)}</b> · còn giữ đến hiện tại{" "}
                                <b className="text-emerald-800">{formatVND(p.holding)}</b>
                              </div>
                              <MonthTable person={p} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                  <tr className="border-t-2 border-slate-300 font-bold">
                    <td className="px-1 py-1">Cộng</td>
                    <td className="px-1 py-1 text-right tabular-nums"><K n={sum.collected} /></td>
                    <td className="px-1 py-1 text-right tabular-nums text-rose-700"><K n={sum.spent} /></td>
                    <td className="px-1 py-1 text-right tabular-nums"><K n={sum.handed} /></td>
                    <td className="px-1 py-1 text-right tabular-nums text-emerald-800"><K n={sum.holding} /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

/** Bảng từng tháng của một người — mới nhất trên cùng. */
function MonthTable({ person }: { person: CafeMoneyPerson }) {
  if (!person.months.length) return null;
  return (
    <div className="-mx-1 mt-2 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wide text-slate-500">
            <th className="px-1 py-1">Tháng</th>
            <th className="px-1 py-1 text-right">Thu TM</th>
            <th className="px-1 py-1 text-right">Chi</th>
            <th className="px-1 py-1 text-right">Đã nộp/giao</th>
            <th className="px-1 py-1 text-right">Còn giữ cuối tháng</th>
          </tr>
        </thead>
        <tbody>
          {person.months.map((m) => (
            <tr key={m.month} className="border-b border-slate-100">
              <td className="px-1 py-1 font-medium">{monthLabel(m.month)}</td>
              <td className="px-1 py-1 text-right tabular-nums"><K n={m.collected} /></td>
              <td className="px-1 py-1 text-right tabular-nums text-rose-700"><K n={m.spent} /></td>
              <td className="px-1 py-1 text-right tabular-nums">
                <K n={m.handed} />
                {m.handedPending > 0 && <span className="block text-[10px] text-amber-700">chờ ký <K n={m.handedPending} /></span>}
              </td>
              <td className="px-1 py-1 text-right font-semibold tabular-nums text-emerald-800"><K n={m.holdingEnd} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
