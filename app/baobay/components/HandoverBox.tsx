// app/baobay/components/HandoverBox.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import { formatDateKeyVN, todayInVN } from "@/lib/baobay/date";
import type { HandoverDTO } from "@/lib/baobay/types";
import { formatVND } from "@/lib/pricing";

import { apiGet, apiPost } from "./client-api";
import { Banner, Button, Card, Field, MoneyInput, TextInput } from "./ui";

/**
 * "Tiền đang giữ" + "Đưa tiền cho quản lý/giám đốc" — khung dùng chung cho cả
 * phi công, điều phối và camera man.
 *
 * Số đang giữ do MÁY CHỦ cộng từ chính báo cáo hằng ngày của người đó (các dòng
 * THU, và với điều phối là tiền mặt bán vé), trừ đi chi tại bãi và những khoản
 * đã khai đưa. Khai đưa là trừ ngay — người đưa không còn cầm tiền nữa; phần
 * giám đốc chưa ký nhận hiện riêng dòng "còn chờ xác nhận" để hai bên cùng thấy.
 */

type CashOnHand = {
  collected: number;
  spent: number;
  handedConfirmed: number;
  handedPending: number;
  handedRejected: number;
  holding: number;
};

type Recipient = { username: string; name: string; role: string; roleLabel: string };

type Payload = {
  balance: CashOnHand;
  /** Các lần MÌNH đưa tiền. */
  handovers: HandoverDTO[];
  /** Tiền người khác giao CHO MÌNH, chờ mình xác nhận. */
  incoming: HandoverDTO[];
  recipients: Recipient[];
};

export function HandoverBox({ spot, bilingual = false }: { spot: string; bilingual?: boolean }) {
  const today = todayInVN();
  const [data, setData] = useState<Payload | null>(null);
  const [date, setDate] = useState(today);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<"cash" | "transfer">("cash");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [inboxBusy, setInboxBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const t = (vi: string, en: string) => (bilingual ? `${vi} (${en})` : vi);

  const load = useCallback(async () => {
    try {
      const res = await apiGet<Payload>(`/api/baobay/handover?spot=${spot}`);
      setData(res);
      // Nhớ lựa chọn cũ nếu người đó vẫn còn trong danh sách
      setRecipient((prev) => (res.recipients.some((r) => r.username === prev) ? prev : res.recipients[0]?.username || ""));
    } catch (err: any) {
      setError(err?.message || "Không tải được tiền đang giữ");
    }
  }, [spot]);

  useEffect(() => {
    load();
    // Có người giao tiền cho mình thì thấy trong vòng 20 giây, khỏi phải tải lại trang
    const timer = setInterval(load, 20_000);
    return () => clearInterval(timer);
  }, [load]);

  async function submit() {
    if (amount <= 0) {
      setError("Chưa nhập số tiền");
      return;
    }
    if (!recipient) {
      setError("Chưa chọn người nhận tiền");
      return;
    }
    const who = data?.recipients.find((r) => r.username === recipient);
    const label = method === "cash" ? "tiền mặt" : "chuyển khoản";
    if (
      !window.confirm(
        `Xác nhận đã đưa ${formatVND(amount)} (${label}) cho ${who?.name ?? recipient} ngày ${formatDateKeyVN(date)}?`,
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await apiPost<{ handover: HandoverDTO; balance: CashOnHand }>(
        `/api/baobay/handover?spot=${spot}`,
        { date, recipientUsername: recipient, amount, method, content },
      );
      setDone(`Đã ghi ${formatVND(res.handover.amount)} — chờ ${res.handover.recipientName} xác nhận.`);
      setAmount(0);
      setContent("");
      await load();
    } catch (err: any) {
      setError(err?.message || "Không ghi được khoản tiền");
    } finally {
      setBusy(false);
    }
  }

  async function answer(row: HandoverDTO, accept: boolean) {
    const reason = accept
      ? ""
      : window.prompt(`Từ chối ${formatVND(row.amount)} của ${row.staffName} — lý do?`) || "";
    if (!accept && !reason.trim()) return;
    if (
      accept &&
      !window.confirm(`Xác nhận ĐÃ NHẬN ${formatVND(row.amount)} từ ${row.staffName}?`)
    ) {
      return;
    }

    setInboxBusy(row.id);
    setError(null);
    try {
      await apiPost(`/api/baobay/handover/confirm?spot=${spot}`, { id: row.id, reject: reason });
      await load();
    } catch (err: any) {
      setError(err?.message || "Không xử lý được");
    } finally {
      setInboxBusy(null);
    }
  }

  const b = data?.balance;
  const inboxPending = (data?.incoming ?? []).filter((h) => !h.confirmed && !h.rejected);
  const pendingCount = (data?.handovers ?? []).filter((h) => !h.confirmed && !h.rejected).length;

  return (
    <Card
      title={t("Tiền đang giữ và giao tiền", "Cash on hand & hand over")}
      hint={t(
        "Số đang giữ máy tự cộng từ các khoản thu trong báo cáo của bạn, trừ chi tại bãi và tiền đã đưa",
        "auto-computed from your reports",
      )}
    >
      {/* Có người giao tiền cho mình: việc cần bấm ngay, đặt trên cùng */}
      {inboxPending.length > 0 && (
        <div className="mb-4 rounded-xl border-2 border-sky-300 bg-sky-50 p-3">
          <h3 className="text-sm font-semibold text-sky-900">
            {t("Có người giao tiền cho anh/chị", "money handed to you")} ({inboxPending.length})
          </h3>
          <ul className="mt-2 space-y-2">
            {inboxPending.map((h) => (
              <li key={h.id} className="rounded-lg bg-white px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-900">{h.staffName}</span>
                  <span className="text-xs text-slate-500">{formatDateKeyVN(h.date)}</span>
                  <span className="text-xs text-slate-500">
                    {h.method === "cash" ? t("tiền mặt", "cash") : t("chuyển khoản", "transfer")}
                  </span>
                  <span className="flex-1" />
                  <span className="font-semibold tabular-nums text-slate-900">{formatVND(h.amount)}</span>
                </div>
                {h.content && <p className="mt-0.5 text-xs text-slate-600">{h.content}</p>}
                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    className="h-9 flex-1 text-xs"
                    disabled={inboxBusy === h.id}
                    onClick={() => answer(h, true)}
                  >
                    {inboxBusy === h.id ? "Đang lưu…" : t("Xác nhận đã nhận", "confirm")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 flex-1 bg-white text-xs"
                    disabled={inboxBusy === h.id}
                    onClick={() => answer(h, false)}
                  >
                    {t("Từ chối", "reject")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {b && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Cell label={t("Thu hộ", "collected")} value={b.collected} />
          <Cell label={t("Chi tại bãi", "spent on site")} value={-b.spent} />
          <Cell label={t("Đã đưa", "handed over")} value={-(b.handedConfirmed + b.handedPending)} />
          <Cell
            label={t("Còn giữ", "still holding")}
            value={b.holding}
            strong
            tone={b.holding > 0 ? "amber" : "emerald"}
          />
        </div>
      )}

      {b && b.holding < 0 && (
        <p className="mt-2 text-xs text-emerald-700">
          Số âm nghĩa là bạn đã chi và đưa nhiều hơn tiền thu hộ — phần {formatVND(-b.holding)} này công ty
          hoàn lại cho bạn.
        </p>
      )}
      {b && b.handedPending > 0 && (
        <p className="mt-2 text-xs text-amber-700">
          Trong đó {formatVND(b.handedPending)} đã trừ nhưng người nhận CHƯA xác nhận ({pendingCount} khoản).
        </p>
      )}
      {b && b.handedRejected > 0 && (
        <p className="mt-1 text-xs text-rose-700">
          {formatVND(b.handedRejected)} bị người nhận từ chối — đã cộng lại vào tiền đang giữ.
        </p>
      )}

      <div className="mt-4">
        <Field
          label={t("Giao tiền cho ai", "hand over to")}
          hint={
            data && data.recipients.length === 0
              ? "Điểm bay này chưa có kế toán / điều phối / quản trị nào để nhận tiền"
              : undefined
          }
        >
          <select
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-slate-900 outline-none focus:border-sky-500"
          >
            {(data?.recipients ?? []).map((r) => (
              <option key={r.username} value={r.username}>
                {r.name} — {r.roleLabel}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label={t("Ngày đưa", "date")}>
          <TextInput type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </Field>
        <Field label={t("Số tiền", "amount")}>
          <MoneyInput value={amount} onChange={setAmount} />
        </Field>
      </div>

      <div className="mt-3 flex gap-2">
        {(
          [
            ["cash", t("Tiền mặt", "cash")],
            ["transfer", t("Chuyển khoản", "transfer")],
          ] as Array<["cash" | "transfer", string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setMethod(key)}
            className={
              "h-11 flex-1 rounded-xl border text-sm font-medium " +
              (method === key
                ? "border-sky-600 bg-sky-600 text-white"
                : "border-slate-300 bg-white text-slate-700")
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-3">
        <Field label={t("Nội dung", "note")}>
          <TextInput
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="VD: tiền 3 khách trả tại bãi"
          />
        </Field>
      </div>

      {error && (
        <div className="mt-3">
          <Banner tone="error">{error}</Banner>
        </div>
      )}
      {done && (
        <div className="mt-3">
          <Banner tone="success" onClose={() => setDone(null)}>
            {done}
          </Banner>
        </div>
      )}

      <Button type="button" className="mt-3 w-full" disabled={busy} onClick={submit}>
        {busy ? "Đang ghi…" : t("Xác nhận đã đưa tiền", "confirm handed over")}
      </Button>

      {(data?.handovers.length ?? 0) > 0 && (
        <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {data!.handovers.slice(0, 10).map((h) => (
            <li key={h.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
              <span className="text-slate-500">{formatDateKeyVN(h.date)}</span>
              <span className="flex-1 truncate text-slate-700">
                <span className="text-slate-500">→ {h.recipientName}</span>
                {h.content ? ` · ${h.content}` : ""}
              </span>
              <span className="font-semibold tabular-nums text-slate-900">{formatVND(h.amount)}</span>
              {h.rejected ? (
                <span
                  className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-800"
                  title={h.rejectedReason}
                >
                  bị từ chối
                </span>
              ) : h.confirmed ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                  đã nhận
                </span>
              ) : (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                  chờ xác nhận
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Cell({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: number;
  strong?: boolean;
  tone?: "amber" | "emerald";
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : "border-slate-200 bg-slate-50 text-slate-900";
  return (
    <div className={"rounded-xl border px-3 py-2.5 " + toneClass}>
      <div className="text-xs opacity-70">{label}</div>
      <div className={"tabular-nums " + (strong ? "text-lg font-bold" : "text-base font-semibold")}>
        {formatVND(value)}
      </div>
    </div>
  );
}
