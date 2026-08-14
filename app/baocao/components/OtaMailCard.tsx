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
};

const KIND_LABEL: Record<string, string> = {
  new: "đặt mới",
  cancel: "huỷ",
  amend: "đổi lịch",
  unknown: "chưa hiểu",
};

/**
 * Khay theo dõi THƯ OTA: máy đã tự đưa booking nào vào lịch, và thư nào cần người
 * soát (mẫu thư lạ, huỷ mà không tìm thấy booking, không rõ điểm bay…).
 *
 * Có khay này thì OTA đổi mẫu thư cũng không mất khách: thư rơi vào đây chờ người
 * đọc, thay vì biến mất im lặng.
 */
export function OtaMailCard({ spot }: { spot: string }) {
  const [mails, setMails] = useState<OtaMail[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

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

  const needReview = mails.filter((m) => m.status === "review");
  if (!mails.length) return null;

  return (
    <CollapseCard
      className={needReview.length ? "border-amber-300" : "border-slate-200"}
      headerClassName={needReview.length ? "bg-amber-500 text-white" : undefined}
      title="📧 Thư OTA"
      hint={needReview.length ? `${needReview.length} thư cần soát` : `${mails.length} thư gần đây`}
      open={needReview.length > 0 || undefined}
    >
      <ul className="divide-y divide-slate-100">
        {mails.map((m) => (
          <li key={m.id} className="flex items-start gap-2 py-1.5">
            <span
              className={
                "mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold " +
                (m.status === "review" ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800")
              }
            >
              {m.ota.toUpperCase()} · {KIND_LABEL[m.kind] ?? m.kind}
            </span>
            <span className="min-w-0 flex-1 text-sm leading-snug text-slate-700">
              {m.ref && <strong className="mr-1">#{m.ref}</strong>}
              {m.result || m.subject}
            </span>
            {m.status === "review" && (
              <Button
                type="button"
                variant="ghost"
                className="h-7 shrink-0 bg-white px-2 text-xs"
                disabled={busy === m.id}
                onClick={async () => {
                  setBusy(m.id);
                  try {
                    await apiPatch(`/api/baocao/ota/log?spot=${spot}`, { id: m.id });
                    load();
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                ✓ Đã soát
              </Button>
            )}
          </li>
        ))}
      </ul>
    </CollapseCard>
  );
}
