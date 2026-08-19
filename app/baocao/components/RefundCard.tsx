// app/baocao/components/RefundCard.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import { formatDateKeyVN } from "@/lib/baobay/date";
import { formatVND } from "@/lib/pricing";
import type { RefundDTO } from "@/services/baobay.service";

import { apiGet, apiPatch } from "./client-api";
import { Banner, Button, CollapseCard, MoneyInput, TextInput } from "./ui";

/**
 * LỆNH HOÀN TIỀN CHỜ KẾ TOÁN.
 *
 * Người trực huỷ bay và chốt hoàn qua chuyển khoản thì họ không tự chuyển được
 * — tiền ra từ TK công ty. Lệnh rơi thẳng vào đây; kế toán chuyển xong bấm xác
 * nhận kèm mã giao dịch. Sửa được số tiền và ghi chú trước khi chốt, vì lúc gọi
 * lại khách có thể thoả thuận khác.
 */
export function RefundCard({ spot, date, canConfirm = false }: { spot: string; date: string; canConfirm?: boolean }) {
  const [rows, setRows] = useState<RefundDTO[]>([]);
  const [draft, setDraft] = useState<Record<string, { amount: number; code: string; note: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!spot) return;
    apiGet<{ refunds: RefundDTO[] }>(`/api/baocao/refund?spot=${spot}&date=${date}`)
      .then((r) => {
        setRows(r.refunds);
        setDraft((prev) => {
          const next = { ...prev };
          for (const x of r.refunds) next[x.id] ??= { amount: x.amount, code: "", note: x.note ?? "" };
          return next;
        });
      })
      .catch(() => {
        /* chưa có lệnh nào thì thôi */
      });
  }, [spot, date]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, [load]);

  async function confirm(r: RefundDTO) {
    const d = draft[r.id];
    if (!d?.code.trim()) return setError("Ghi mã giao dịch đã chuyển cho khách");
    setBusy(r.id);
    setError(null);
    try {
      await apiPatch(`/api/baocao/refund?spot=${spot}`, {
        id: r.id,
        amount: d.amount,
        transferCode: d.code,
        note: d.note,
      });
      setDone(`✓ Đã xác nhận hoàn ${formatVND(d.amount)} cho ${r.guestName} (#${d.code}).`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xác nhận được");
    } finally {
      setBusy(null);
    }
  }

  const pending = rows.filter((r) => r.status === "pending");
  if (!rows.length) return null;

  return (
    <CollapseCard
      className={pending.length ? "border-rose-400" : "border-slate-200"}
      title="💸 Hoàn tiền khách"
      hint={pending.length ? `${pending.length} lệnh chờ chuyển khoản` : `${rows.length} lệnh gần đây`}
      open={pending.length > 0 || undefined}
    >
      {done && <Banner tone="success" onClose={() => setDone(null)}>{done}</Banner>}
      {error && <Banner tone="error">{error}</Banner>}

      <ul className="divide-y divide-slate-100">
        {rows.map((r) => {
          const d = draft[r.id] ?? { amount: r.amount, code: "", note: r.note ?? "" };
          return (
            <li key={r.id} className="py-1.5 text-sm">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span
                  className={
                    "shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold " +
                    (r.status === "pending"
                      ? "bg-rose-100 text-rose-900"
                      : r.status === "paid"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-600")
                  }
                >
                  {r.status === "pending"
                    ? "chờ chuyển"
                    : r.status === "paid"
                      ? "đã chuyển ✓"
                      : r.status === "voided"
                        ? "vô hiệu (bay lại)"
                        : "đã trả TM"}
                </span>
                <span className="min-w-0 flex-1 leading-snug text-slate-700">
                  {formatDateKeyVN(r.date)} · <strong>{r.guestName}</strong>
                  {r.guests ? ` · ${r.guests} khách` : ""}
                  {r.reason ? ` · ${r.reason}` : ""}
                  {r.usedServices ? ` · đã dùng: ${r.usedServices}` : ""}
                  {r.usedFee ? ` · trừ phí ${formatVND(r.usedFee)}` : ""}
                  {r.bankAccount ? ` · TK ${r.bankAccount}` : ""}
                  {r.transferCode ? ` · CK #${r.transferCode}` : ""}
                  <span className="text-slate-400"> · {r.createdByName} lập</span>
                </span>
                <strong className="shrink-0 tabular-nums text-rose-700">{formatVND(r.amount)}</strong>
              </div>

              {canConfirm && r.status === "pending" && (
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <span className="w-28">
                    <MoneyInput
                      value={d.amount}
                      onChange={(v) => setDraft((p) => ({ ...p, [r.id]: { ...d, amount: v } }))}
                    />
                  </span>
                  <TextInput
                    value={d.code}
                    onChange={(e) => setDraft((p) => ({ ...p, [r.id]: { ...d, code: e.target.value } }))}
                    placeholder="Mã giao dịch"
                    className="h-8 w-32 rounded-lg text-xs"
                  />
                  <TextInput
                    value={d.note}
                    onChange={(e) => setDraft((p) => ({ ...p, [r.id]: { ...d, note: e.target.value } }))}
                    placeholder="Ghi chú"
                    className="h-8 min-w-32 flex-1 rounded-lg text-xs"
                  />
                  <Button
                    type="button"
                    className="h-8 shrink-0 bg-emerald-600 px-2 text-xs hover:bg-emerald-700"
                    disabled={busy === r.id}
                    onClick={() => confirm(r)}
                  >
                    ✓ Đã hoàn tiền
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </CollapseCard>
  );
}
