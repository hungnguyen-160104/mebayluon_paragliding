// app/baocao/components/OtaMailCard.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import { apiGet, apiPatch } from "./client-api";
import { Button, CollapseCard } from "./ui";

type OtaMail = {
  id: string;
  ota: string;
  kind: string;
  ref: string;
  subject: string;
  status: string;
  result: string;
  receivedAt: string;
  /** Việc sẽ làm khi bấm duyệt: cancel · amend · create. */
  intent?: string;
  spot?: string;
  draftDate?: string;
};

const KIND_LABEL: Record<string, string> = {
  new: "đặt mới",
  cancel: "huỷ",
  amend: "đổi lịch",
  pending: "mới hỏi",
  unknown: "chưa hiểu",
};

/** Bấm nút này thì việc gì xảy ra — nói thẳng ra để không ai bấm nhầm. */
const INTENT_LABEL: Record<string, string> = {
  cancel: "Duyệt huỷ",
  amend: "Duyệt đổi lịch",
  create: "Đưa vào lịch",
};

function useOtaMails(spot: string) {
  const [mails, setMails] = useState<OtaMail[]>([]);

  const load = useCallback(() => {
    apiGet<{ emails: OtaMail[] }>(`/api/baocao/ota/log?spot=${spot}`)
      .then((r) => setMails(r.emails))
      .catch(() => {
        /* chưa có thư nào thì thôi */
      });
  }, [spot]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, [load]);

  return { mails, load };
}

/**
 * CỜ ĐỎ ĐẦU TRANG: thư OTA đang chờ người duyệt.
 *
 * Máy đọc được thư huỷ hay thư đổi lịch nhưng KHÔNG tự sửa lịch bay: điều phối
 * thường đã gọi khách xong trước khi thư tới, máy tự đổi là dẫm lên việc vừa làm.
 * Nên việc chỉ dừng ở đây — đỏ, nằm trên cùng, và chỉ chạy khi có người bấm.
 */
export function OtaReviewFlag({ spot, onApplied }: { spot: string; onApplied?: () => void }) {
  const { mails, load } = useOtaMails(spot);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<Record<string, string>>({});
  const [dateFix, setDateFix] = useState<Record<string, string>>({});

  const pending = mails.filter((m) => m.status === "review");
  if (!pending.length) return null;

  const act = async (m: OtaMail, action: "approve" | "ignore") => {
    setBusy(m.id);
    setError((prev) => ({ ...prev, [m.id]: "" }));
    try {
      const res = await apiPatch<{ ok?: boolean; message?: string }>(`/api/baocao/ota/log?spot=${spot}`, {
        id: m.id,
        action,
        spot,
        flightDate: dateFix[m.id] || m.draftDate || undefined,
      });
      if (action === "approve" && res && res.ok === false) {
        setError((prev) => ({ ...prev, [m.id]: res.message || "Chưa duyệt được" }));
        return;
      }
      load();
      onApplied?.();
    } catch (err) {
      setError((prev) => ({ ...prev, [m.id]: err instanceof Error ? err.message : "Chưa duyệt được" }));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mb-2 rounded-xl border-2 border-red-400 bg-red-50 p-2.5">
      <div className="mb-1.5 text-sm font-bold text-red-800">
        🚩 {pending.length} thư OTA chờ duyệt tay — lịch bay CHƯA đổi
      </div>
      <ul className="space-y-1.5">
        {pending.map((m) => {
          const intent = m.intent || (m.kind === "cancel" ? "cancel" : m.kind === "amend" ? "amend" : "create");
          const needDate = intent !== "cancel" && !m.draftDate;
          return (
            <li key={m.id} className="rounded-lg bg-white px-2 py-1.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-bold text-red-900">
                  {m.ota.toUpperCase()} · {KIND_LABEL[m.kind] ?? m.kind}
                </span>
                <span className="min-w-[12rem] flex-1 text-sm leading-snug text-slate-800">
                  {m.ref && <strong className="mr-1">#{m.ref}</strong>}
                  {m.result || m.subject}
                </span>
                {needDate && (
                  <input
                    type="date"
                    className="h-8 shrink-0 rounded-lg border border-slate-300 px-1.5 text-sm"
                    value={dateFix[m.id] ?? ""}
                    onChange={(e) => setDateFix((prev) => ({ ...prev, [m.id]: e.target.value }))}
                    title="Thư không ghi rõ ngày bay — chọn giúp trước khi duyệt"
                  />
                )}
                <Button
                  type="button"
                  className="h-8 shrink-0 bg-red-600 px-2.5 text-xs font-semibold text-white hover:bg-red-700"
                  disabled={busy === m.id}
                  onClick={() => act(m, "approve")}
                >
                  ✓ {INTENT_LABEL[intent] ?? "Duyệt"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 shrink-0 bg-white px-2 text-xs"
                  disabled={busy === m.id}
                  onClick={() => act(m, "ignore")}
                  title="Không đụng vào lịch, chỉ cất thư khỏi đây"
                >
                  ✕ Bỏ qua
                </Button>
              </div>
              {error[m.id] && <div className="mt-1 text-xs font-semibold text-red-700">{error[m.id]}</div>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Khay LỊCH SỬ thư OTA: thư máy đã đưa vào lịch, và thư người đã soát xong.
 *
 * Thư đang chờ duyệt không nằm ở đây mà nhảy lên cờ đỏ đầu trang — chỗ này chỉ để
 * tra lại "thư đó vào app chưa, ai duyệt".
 */
export function OtaMailCard({ spot }: { spot: string }) {
  const { mails } = useOtaMails(spot);
  const history = mails.filter((m) => m.status !== "review");
  if (!history.length) return null;

  return (
    <CollapseCard className="border-slate-200" title="📧 Thư OTA đã xử lý" hint={`${history.length} thư gần đây`}>
      <ul className="divide-y divide-slate-100">
        {history.map((m) => (
          <li key={m.id} className="flex items-start gap-2 py-1.5">
            <span
              className={
                "mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold " +
                (m.status === "applied" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600")
              }
            >
              {m.ota.toUpperCase()} · {KIND_LABEL[m.kind] ?? m.kind}
            </span>
            <span className="min-w-0 flex-1 text-sm leading-snug text-slate-700">
              {m.ref && <strong className="mr-1">#{m.ref}</strong>}
              {m.result || m.subject}
            </span>
          </li>
        ))}
      </ul>
    </CollapseCard>
  );
}
