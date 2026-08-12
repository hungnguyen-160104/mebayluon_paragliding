// app/baocao/components/PenaltyCard.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import { formatVND } from "@/lib/pricing";

import { apiGet, apiPost } from "./client-api";
import { Banner, Button, Card } from "./ui";

/**
 * Phạt nộp muộn của một ngày, cho kế toán xem và quyết.
 *
 * Hai nhóm tách bạch, đúng như thực tế ngoài bãi:
 *  - **Đã ghi phạt**: phi công có bay và chốt muộn — tiền thật, đã vào bảng lương.
 *  - **Tạm tính**: quá giờ mà chưa thấy báo cáo. Hệ thống chưa biết người đó có
 *    bay hay không (hôm nay 10 phi công nhưng chỉ 7 người bay). Ai không bay thì
 *    không phải báo cáo, khoản tạm tính TỰ HUỶ khi bấm chốt ngày.
 *
 * Nút "Huỷ phạt" là quyền của kế toán: nộp muộn thì vẫn bị ghi phạt, kể cả khi
 * kế toán chốt hộ — trừ khi chính kế toán huỷ, có ghi lý do.
 */

type PenaltyRow = {
  username: string;
  pilotName: string;
  flightCount: number;
  kind: "recorded" | "pending";
  amount: number;
  waived: boolean;
  waivedBy?: string;
  waiveReason?: string;
  submittedAt?: string;
};

type PenaltyStatus = {
  date: string;
  deadline: string;
  pastDeadline: boolean;
  dayClosed: boolean;
  rows: PenaltyRow[];
  total: number;
};

export function PenaltyCard({ spot, date, reloadKey }: { spot: string; date: string; reloadKey?: number }) {
  const [data, setData] = useState<PenaltyStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await apiGet<PenaltyStatus>(`/api/baocao/penalty?date=${date}&spot=${spot}`));
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Không tải được bảng phạt");
    }
  }, [date, spot]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  async function toggle(row: PenaltyRow) {
    const reason = row.waived
      ? ""
      : window.prompt(`Huỷ phạt ${formatVND(row.amount)} của ${row.pilotName} — lý do?`) || "";
    if (!row.waived && !reason.trim()) return;

    setBusy(row.username);
    setError(null);
    try {
      await apiPost(`/api/baocao/penalty?spot=${spot}`, {
        date,
        username: row.username,
        waive: !row.waived,
        reason,
      });
      await load();
    } catch (err: any) {
      setError(err?.message || "Không đổi được lệnh phạt");
    } finally {
      setBusy(null);
    }
  }

  if (!data) return null;

  const recorded = data.rows.filter((r) => r.kind === "recorded");
  const pending = data.rows.filter((r) => r.kind === "pending");

  return (
    <Card
      className="border-rose-200 bg-rose-50/40"
      title="⏰ Phạt nộp muộn"
      hint={`Giờ chốt ${data.deadline} · nộp muộn là phạt, trừ khi kế toán huỷ`}
    >
      {error && <Banner tone="error">{error}</Banner>}

      {recorded.length === 0 && pending.length === 0 && (
        <p className="text-sm text-slate-500">
          {data.pastDeadline
            ? "Không ai nộp muộn."
            : `Chưa tới giờ chốt (${data.deadline}).`}
        </p>
      )}

      {recorded.length > 0 && (
        <>
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Đã ghi phạt ({recorded.length})</h3>
            <span className="text-sm font-semibold tabular-nums text-rose-700">{formatVND(data.total)}</span>
          </div>
          <ul className="mt-1 divide-y divide-slate-100 rounded-xl border border-slate-200">
            {recorded.map((r) => (
              <li key={r.username} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                <span className="font-medium text-slate-900">{r.pilotName}</span>
                <span className="text-xs text-slate-500">{r.flightCount} chuyến</span>
                <span className="flex-1" />
                {r.waived ? (
                  <>
                    <span
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                      title={r.waiveReason}
                    >
                      đã huỷ phạt{r.waivedBy ? ` · ${r.waivedBy}` : ""}
                    </span>
                    <span className="text-xs text-slate-400 line-through">200.000đ</span>
                  </>
                ) : (
                  <span className="font-semibold tabular-nums text-rose-700">{formatVND(r.amount)}</span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 px-3 text-xs"
                  disabled={busy === r.username}
                  onClick={() => toggle(r)}
                >
                  {busy === r.username ? "Đang lưu…" : r.waived ? "Phạt lại" : "Huỷ phạt"}
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}

      {pending.length > 0 && (
        <>
          <h3 className="mt-4 text-sm font-semibold text-amber-800">Tạm tính ({pending.length})</h3>
          <p className="text-xs text-slate-500">
            Chưa biết ai có bay. Ai 0 chuyến thì <strong>tự huỷ khi Chốt ngày</strong>; ai có bay thành phạt thật.
          </p>
          <ul className="mt-1 divide-y divide-amber-100 rounded-xl border border-amber-200">
            {pending.map((r) => (
              <li
                key={r.username}
                className="flex flex-wrap items-center gap-2 bg-amber-50/50 px-3 py-2 text-sm"
              >
                <span className="text-slate-800">{r.pilotName}</span>
                <span className="flex-1 text-xs text-slate-500">chưa báo cáo</span>
                <span className="tabular-nums text-amber-800">{formatVND(r.amount)} (tạm)</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
