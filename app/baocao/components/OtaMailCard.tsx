// app/baocao/components/OtaMailCard.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import { spotName } from "@/lib/baobay/spots";

import { apiGet, apiPatch } from "./client-api";
import { Button, CollapseCard } from "./ui";

type OtaMail = {
  id: string;
  ota: string;
  kind: string;
  ref: string;
  subject: string;
  from: string;
  status: string;
  result: string;
  receivedAt: string;
  /** Lúc app nhận thư từ Gmail. */
  fetchedAt?: string;
  /** Việc sẽ làm khi bấm duyệt: cancel · amend · create. */
  intent?: string;
  spot?: string;
  draftDate?: string;
  draftTime?: string;
  draftGuests?: number;
  draftName?: string;
  draftPhone?: string;
  draftWeights?: number[];
  draftHotel?: string;
  /** Nguyên văn thư (rút gọn) — để duyệt ngay trên app, khỏi mở Gmail. */
  bodyExcerpt?: string;
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

function whenVN(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * PHẦN XỔ RA của một thư: các trường máy bóc được + nguyên văn thư.
 *
 * Người duyệt phải quyết được NGAY TẠI ĐÂY — dòng tóm tắt nhiều khi chỉ ra "?"
 * (thư ghi nhãn kiểu lạ), mà bắt mở Gmail đối chiếu từng thư thì không ai duyệt
 * nữa. Nguyên văn thư là nguồn sự thật cuối cùng.
 */
function MailDetail({ m }: { m: OtaMail }) {
  const facts = [
    m.draftDate ? `ngày bay ${m.draftDate.split("-").reverse().join("/")}` : "",
    m.draftTime ? `giờ ${m.draftTime}` : "",
    m.draftGuests ? `${m.draftGuests} khách` : "",
    m.draftName,
    m.draftPhone,
    m.draftWeights?.length ? `cân nặng ${m.draftWeights.join("/")}kg` : "",
    m.draftHotel ? `đón: ${m.draftHotel}` : "",
  ].filter(Boolean);

  return (
    <div className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs leading-snug">
      <div className="text-slate-500">
        {whenVN(m.receivedAt)} · từ <span className="break-all">{m.from || "?"}</span>
      </div>
      <div className="mt-0.5 font-semibold text-slate-800">{m.subject}</div>
      {facts.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {facts.map((f, i) => (
            <span key={i} className="rounded bg-sky-100 px-1.5 py-0.5 font-semibold text-sky-900">
              {f}
            </span>
          ))}
        </div>
      )}
      {m.bodyExcerpt ? (
        <pre className="mt-1.5 max-h-56 overflow-y-auto whitespace-pre-wrap break-words rounded border border-slate-200 bg-white p-2 font-sans text-[11px] text-slate-700">
          {m.bodyExcerpt}
        </pre>
      ) : (
        <div className="mt-1.5 text-slate-400">Thư không có phần chữ để hiện.</div>
      )}
    </div>
  );
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
  const [openMail, setOpenMail] = useState<string | null>(null);
  /**
   * Thư thiếu ngày bay: bấm "Đưa vào lịch" KHÔNG chạy ngay mà mở dải chọn ngày
   * có nút "Thôi" — người bấm nhầm còn đường lui, không bị kẹt giữa chừng.
   */
  const [armed, setArmed] = useState<string | null>(null);
  /** 18 thư cùng lúc là bức tường đỏ — hiện 5 thư đầu, còn lại nằm sau nút xổ. */
  const [showAll, setShowAll] = useState(false);

  const pending = mails.filter((m) => m.status === "review");
  /** Thư mới nhất APP nhận được (mọi trạng thái) — danh sách đã xếp mới trước. */
  const lastFetch = mails[0]?.fetchedAt || "";
  if (!pending.length) return null;
  const shown = showAll ? pending : pending.slice(0, 5);
  const hidden = pending.length - shown.length;

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
      <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2 text-sm font-bold text-red-800">
        <span>🚩 {pending.length} thư OTA chờ duyệt tay — lịch bay CHƯA đổi</span>
        {lastFetch && (
          <span className="text-[11px] font-medium text-red-900/60" title="Lần gần nhất Gmail đẩy được thư về app">
            thư về gần nhất {whenVN(lastFetch)}
          </span>
        )}
      </div>
      <ul className="space-y-1.5">
        {shown.map((m) => {
          const intent = m.intent || (m.kind === "cancel" ? "cancel" : m.kind === "amend" ? "amend" : "create");
          const needDate = intent !== "cancel" && !m.draftDate;
          return (
            <li key={m.id} className="rounded-lg bg-white px-2 py-1.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-bold text-red-900">
                  {m.ota.toUpperCase()} · {KIND_LABEL[m.kind] ?? m.kind}
                </span>
                {m.spot && (
                  <span className="shrink-0 rounded bg-sky-100 px-1.5 py-0.5 text-[11px] font-bold text-sky-900">
                    📍 {spotName(m.spot)}
                  </span>
                )}
                <span className="min-w-[12rem] flex-1 text-sm leading-snug text-slate-800">
                  {m.ref && <strong className="mr-1">#{m.ref}</strong>}
                  {m.result || m.subject}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  className={
                    "h-8 shrink-0 px-2 text-xs font-semibold " +
                    (openMail === m.id ? "border-sky-400 bg-sky-50 text-sky-800" : "bg-white text-slate-600")
                  }
                  onClick={() => setOpenMail((prev) => (prev === m.id ? null : m.id))}
                  title="Xem nguyên văn thư ngay tại đây — khỏi mở Gmail"
                >
                  ✉ Thư {openMail === m.id ? "▴" : "▾"}
                </Button>
                <Button
                  type="button"
                  className="h-8 shrink-0 bg-red-600 px-2.5 text-xs font-semibold text-white hover:bg-red-700"
                  disabled={busy === m.id}
                  onClick={() => {
                    // Thiếu ngày bay: mở dải chọn ngày thay vì chạy luôn
                    if (needDate && !dateFix[m.id]) setArmed(m.id);
                    else void act(m, "approve");
                  }}
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
              {armed === m.id && (
                <div className="mt-1.5 flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50/60 px-2 py-1.5">
                  <span className="text-xs font-semibold text-red-900">Thư không ghi ngày bay — chọn giúp:</span>
                  <input
                    type="date"
                    className="h-8 shrink-0 rounded-lg border border-slate-300 bg-white px-1.5 text-sm"
                    value={dateFix[m.id] ?? ""}
                    onChange={(e) => setDateFix((prev) => ({ ...prev, [m.id]: e.target.value }))}
                  />
                  <Button
                    type="button"
                    className="h-8 shrink-0 bg-red-600 px-2.5 text-xs font-semibold text-white hover:bg-red-700"
                    disabled={busy === m.id || !dateFix[m.id]}
                    onClick={async () => {
                      await act(m, "approve");
                      setArmed(null);
                    }}
                  >
                    ✓ Xác nhận
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 shrink-0 bg-white px-2 text-xs"
                    disabled={busy === m.id}
                    onClick={() => {
                      // Đường lui: bỏ ngày đã chọn + xoá lỗi, thư về nguyên trạng chờ duyệt
                      setArmed(null);
                      setDateFix((prev) => ({ ...prev, [m.id]: "" }));
                      setError((prev) => ({ ...prev, [m.id]: "" }));
                    }}
                  >
                    ↩ Thôi, để lại
                  </Button>
                </div>
              )}
              {error[m.id] && <div className="mt-1 text-xs font-semibold text-red-700">{error[m.id]}</div>}
              {openMail === m.id && <MailDetail m={m} />}
            </li>
          );
        })}
      </ul>
      {(hidden > 0 || showAll) && pending.length > 5 && (
        <button
          type="button"
          className="mt-1.5 w-full rounded-lg border border-red-200 bg-white py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? "▴ Thu gọn, chỉ hiện 5 thư đầu" : `▾ Hiện thêm ${hidden} thư nữa`}
        </button>
      )}
    </div>
  );
}

/**
 * Khay LỊCH SỬ thư OTA: thư máy đã đưa vào lịch, và thư người đã soát xong.
 *
 * Thư đang chờ duyệt không nằm ở đây mà nhảy lên cờ đỏ đầu trang — chỗ này chỉ để
 * tra lại "thư đó vào app chưa, ai duyệt". Cũng xổ xem được nguyên văn.
 */
export function OtaMailCard({ spot }: { spot: string }) {
  const { mails } = useOtaMails(spot);
  const [openMail, setOpenMail] = useState<string | null>(null);
  const history = mails.filter((m) => m.status !== "review");
  if (!history.length) return null;

  return (
    <CollapseCard className="border-slate-200" title="📧 Thư OTA đã xử lý" hint={`${history.length} thư gần đây`}>
      <ul className="divide-y divide-slate-100">
        {history.map((m) => (
          <li key={m.id} className="py-1.5">
            <button
              type="button"
              className="flex w-full items-start gap-2 text-left"
              onClick={() => setOpenMail((prev) => (prev === m.id ? null : m.id))}
              title="Bấm để xem nguyên văn thư"
            >
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
              <span aria-hidden className="shrink-0 text-xs text-slate-400">
                {openMail === m.id ? "▴" : "▾"}
              </span>
            </button>
            {openMail === m.id && <MailDetail m={m} />}
          </li>
        ))}
      </ul>
    </CollapseCard>
  );
}
