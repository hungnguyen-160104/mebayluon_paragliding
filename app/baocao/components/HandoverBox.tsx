// app/baocao/components/HandoverBox.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import { formatDateKeyVN, todayInVN } from "@/lib/baobay/date";
import type { HandoverDTO } from "@/lib/baobay/types";
import { formatVND } from "@/lib/pricing";

import { apiGet, apiPost } from "./client-api";
import { Banner, Button, Field, MoneyInput, TextInput, CollapseCard } from "./ui";

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
  received: number;
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
  /** Lệnh MÌNH gửi đi: đưa tiền và xin ứng tiền. */
  handovers: HandoverDTO[];
  /** Lệnh gửi CHO MÌNH, chờ mình xác nhận / duyệt. */
  incoming: HandoverDTO[];
  /** Người có thể NHẬN tiền (quản trị, kế toán, điều phối). */
  recipients: Recipient[];
  /** Người có thể DUYỆT ứng tiền (chỉ kế toán, quản trị). */
  approvers: Recipient[];
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
  /** Form ứng tiền — tách hẳn khỏi form giao tiền, hai việc khác nhau. */
  const [advApprover, setAdvApprover] = useState("");
  const [advAmount, setAdvAmount] = useState(0);
  const [advContent, setAdvContent] = useState("");
  const [advBusy, setAdvBusy] = useState(false);
  const [advDone, setAdvDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const t = (vi: string, en: string) => (bilingual ? `${vi} (${en})` : vi);

  const load = useCallback(async () => {
    try {
      const res = await apiGet<Payload>(`/api/baocao/handover?spot=${spot}`);
      setData(res);
      // Nhớ lựa chọn cũ nếu người đó vẫn còn trong danh sách
      setRecipient((prev) => (res.recipients.some((r) => r.username === prev) ? prev : res.recipients[0]?.username || ""));
      setAdvApprover((prev) => (res.approvers.some((r) => r.username === prev) ? prev : res.approvers[0]?.username || ""));
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
        `/api/baocao/handover?spot=${spot}`,
        { kind: "handover", date, recipientUsername: recipient, amount, method, content },
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

  async function askAdvance() {
    if (advAmount <= 0) {
      setError("Chưa nhập số tiền ứng");
      return;
    }
    if (!advContent.trim()) {
      setError("Ghi rõ nội dung ứng tiền");
      return;
    }
    if (!advApprover) {
      setError("Chưa chọn người xác nhận");
      return;
    }

    setAdvBusy(true);
    setError(null);
    setAdvDone(null);
    try {
      const res = await apiPost<{ handover: HandoverDTO }>(`/api/baocao/handover?spot=${spot}`, {
        kind: "advance",
        date: today,
        recipientUsername: advApprover,
        amount: advAmount,
        method: "cash",
        content: advContent,
      });
      setAdvDone(`Đã gửi yêu cầu ứng ${formatVND(res.handover.amount)} — chờ ${res.handover.recipientName} duyệt.`);
      setAdvAmount(0);
      setAdvContent("");
      await load();
    } catch (err: any) {
      setError(err?.message || "Không gửi được yêu cầu ứng tiền");
    } finally {
      setAdvBusy(false);
    }
  }

  async function answer(row: HandoverDTO, accept: boolean) {
    const isAdvance = row.kind === "advance";
    const reason = accept
      ? ""
      : window.prompt(
          isAdvance
            ? `Từ chối yêu cầu ứng ${formatVND(row.amount)} của ${row.staffName} — lý do?`
            : `Từ chối ${formatVND(row.amount)} của ${row.staffName} — lý do?`,
        ) || "";
    if (!accept && !reason.trim()) return;
    if (
      accept &&
      !window.confirm(
        isAdvance
          ? `Đồng ý cho ${row.staffName} ứng ${formatVND(row.amount)}?`
          : `Xác nhận ĐÃ NHẬN ${formatVND(row.amount)} từ ${row.staffName}?`,
      )
    ) {
      return;
    }

    setInboxBusy(row.id);
    setError(null);
    try {
      await apiPost(`/api/baocao/handover/confirm?spot=${spot}`, { id: row.id, reject: reason });
      await load();
    } catch (err: any) {
      setError(err?.message || "Không xử lý được");
    } finally {
      setInboxBusy(null);
    }
  }

  const b = data?.balance;
  const inboxPending = (data?.incoming ?? []).filter((h) => !h.confirmed && !h.rejected);
  const inboxPendingCount = inboxPending.length;
  const mine = data?.handovers ?? [];
  const pendingCount = mine.filter((h) => h.kind !== "advance" && !h.confirmed && !h.rejected).length;
  const myAdvances = mine.filter((h) => h.kind === "advance");
  const advanceApproved = myAdvances.filter((h) => h.confirmed).reduce((sum, h) => sum + h.amount, 0);

  return (
    <CollapseCard
      className="border-teal-200 bg-teal-50/40"
      title={`${t("Tiền bạc", "Money")}${inboxPendingCount ? ` · ${inboxPendingCount} chờ xác nhận` : ""}`}
      hint={t("Máy tự cộng từ báo cáo của bạn", "auto-computed")}
    >
      {/* Có người giao tiền cho mình: việc cần bấm ngay, đặt trên cùng */}
      {inboxPending.length > 0 && (
        <div className="mb-4 rounded-xl border-2 border-amber-400 bg-amber-50 p-3">
          <h3 className="text-sm font-bold text-amber-900">
            🔔 {t("Chờ anh/chị duyệt", "waiting for you")} ({inboxPending.length})
          </h3>
          <ul className="mt-2 space-y-2">
            {inboxPending.map((h) => (
              <li key={h.id} className="rounded-lg bg-white px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold " +
                      (h.kind === "advance"
                        ? "bg-violet-100 text-violet-800"
                        : "bg-sky-100 text-sky-800")
                    }
                  >
                    {h.kind === "advance"
                      ? h.createdBy
                        ? t("lệnh ứng — trừ lương", "advance order")
                        : t("xin ứng", "advance")
                      : h.createdBy
                        ? t("lệnh chuyển tiền", "transfer order")
                        : t("giao tiền", "hand over")}
                  </span>
                  <span className="font-medium text-slate-900">{h.staffName}</span>
                  <span className="text-xs text-slate-500">{formatDateKeyVN(h.date)}</span>
                  {h.kind !== "advance" && (
                    <span className="text-xs text-slate-500">
                      {h.method === "cash" ? t("tiền mặt", "cash") : t("chuyển khoản", "transfer")}
                    </span>
                  )}
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
                    {inboxBusy === h.id
                      ? "Đang lưu…"
                      : h.createdBy
                        ? t("Đã nhận tiền", "received")
                        : h.kind === "advance"
                          ? t("Đồng ý", "approve")
                          : t("Đã nhận", "confirm")}
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
          <Cell label={t("Thu hộ", "collected")} value={b.collected} tone="sky" />
          {b.received > 0 && <Cell label={t("Nhận từ nhân sự", "received")} value={b.received} tone="sky" />}
          <Cell label={t("Đã chi", "spent")} value={-b.spent} tone="slate" />
          <Cell label={t("Đã nộp", "handed over")} value={-(b.handedConfirmed + b.handedPending)} tone="slate" />
          <Cell
            label={t("Còn giữ", "holding")}
            value={b.holding}
            strong
            tone={b.holding > 0 ? "amber" : "emerald"}
          />
        </div>
      )}

      {b && b.holding < 0 && (
        <p className="mt-2 text-xs text-emerald-700">
          Số âm: công ty hoàn lại anh/chị {formatVND(-b.holding)}.
        </p>
      )}
      {b && b.handedPending > 0 && (
        <p className="mt-2 text-xs text-amber-700">
          {formatVND(b.handedPending)} chờ người nhận xác nhận ({pendingCount} khoản).
        </p>
      )}
      {b && b.handedRejected > 0 && (
        <p className="mt-1 text-xs text-rose-700">
          {formatVND(b.handedRejected)} bị từ chối — đã cộng lại.
        </p>
      )}

      {/* ---------------------- Giao tiền — ít dùng, gập mặc định ---------------------- */}
      <details className="group mt-5 rounded-xl border-2 border-sky-300 bg-sky-50/70 p-3">
        <summary className="cursor-pointer">
          <h3 className="inline text-sm font-bold text-sky-900">💵 {t("Nộp tiền", "hand over")}</h3>
          <span aria-hidden className="float-right text-sky-400 transition-transform group-open:rotate-180">▾</span>
        </summary>
        <p className="mt-0.5 text-xs text-slate-600">
          {t("Người nhận bấm xác nhận thì mới xong", "recipient confirms")}
        </p>

        <div className="mt-3">
        <Field
          label={t("Nộp cho ai", "hand over to")}
          hint={data && data.recipients.length === 0 ? "Chưa có ai để nhận tiền ở điểm này" : undefined}
        >
          <select
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="h-12 w-full rounded-xl border border-sky-300 bg-white px-3.5 text-slate-900 outline-none focus:border-sky-600"
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
        <Field label={t("Ngày", "date")}>
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

      <Button
        type="button"
        className="mt-3 w-full bg-sky-600 hover:bg-sky-700"
        disabled={busy}
        onClick={submit}
      >
        {busy ? "Đang ghi…" : t("Đã nộp tiền", "sent")}
      </Button>
      </details>

      {/* ---------------------- Ứng tiền — ít dùng, gập mặc định ---------------------- */}
      <details className="group mt-4 rounded-xl border-2 border-violet-300 bg-violet-50/70 p-3">
        <summary className="cursor-pointer">
          <h3 className="inline text-sm font-bold text-violet-900">🧾 {t("Ứng tiền", "advance")}</h3>
          <span aria-hidden className="float-right text-violet-400 transition-transform group-open:rotate-180">▾</span>
        </summary>
        <p className="mt-0.5 text-xs text-slate-600">
          {t("Kế toán hoặc quản trị duyệt · trừ vào lương cuối tháng", "approved = deducted from pay")}
          {advanceApproved > 0 && (
            <>
              {" · "}
              <strong className="text-violet-900">
                {t("đã ứng", "so far")} {formatVND(advanceApproved)}
              </strong>
            </>
          )}
        </p>

        <div className="mt-3">
          <Field label={t("Ứng để làm gì", "reason")}>
            <TextInput
              value={advContent}
              onChange={(e) => setAdvContent(e.target.value)}
              placeholder="VD: sửa dù"
            />
          </Field>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label={t("Số tiền", "amount")}>
            <MoneyInput value={advAmount} onChange={setAdvAmount} />
          </Field>
          <Field
            label={t("Ai duyệt", "approver")}
            hint={data && data.approvers.length === 0 ? "Chưa có ai duyệt được ở điểm này" : undefined}
          >
            <select
              value={advApprover}
              onChange={(e) => setAdvApprover(e.target.value)}
              className="h-12 w-full rounded-xl border border-violet-300 bg-white px-3.5 text-slate-900 outline-none focus:border-violet-600"
            >
              {(data?.approvers ?? []).map((r) => (
                <option key={r.username} value={r.username}>
                  {r.name} — {r.roleLabel}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {advDone && (
          <div className="mt-3">
            <Banner tone="success" onClose={() => setAdvDone(null)}>
              {advDone}
            </Banner>
          </div>
        )}

        <Button
          type="button"
          className="mt-3 w-full bg-violet-600 hover:bg-violet-700"
          disabled={advBusy}
          onClick={askAdvance}
        >
          {advBusy ? "Đang gửi…" : t("Gửi yêu cầu", "send request")}
        </Button>

        {myAdvances.length > 0 && (
          <ul className="mt-3 divide-y divide-violet-100 rounded-xl border border-violet-200 bg-white">
            {myAdvances.slice(0, 8).map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                <span className="text-slate-500">{formatDateKeyVN(h.date)}</span>
                <span className="flex-1 truncate text-slate-700">
                  {h.content} <span className="text-slate-400">→ {h.recipientName}</span>
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
                    đã duyệt
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                    chờ duyệt
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </details>

      {(data?.handovers.filter((h) => h.kind !== "advance").length ?? 0) > 0 && (
        <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {data!.handovers.filter((h) => h.kind !== "advance").slice(0, 10).map((h) => (
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
    </CollapseCard>
  );
}

function Cell({
  label,
  value,
  strong,
  tone = "slate",
}: {
  label: string;
  value: number;
  strong?: boolean;
  tone?: "amber" | "emerald" | "sky" | "slate";
}) {
  const toneClass = {
    amber: "border-amber-300 bg-amber-100 text-amber-900",
    emerald: "border-emerald-300 bg-emerald-100 text-emerald-900",
    sky: "border-sky-200 bg-sky-50 text-sky-900",
    slate: "border-slate-200 bg-white text-slate-900",
  }[tone];

  return (
    <div className={"rounded-xl border px-3 py-2.5 " + toneClass}>
      <div className="text-xs opacity-70">{label}</div>
      <div className={"tabular-nums " + (strong ? "text-lg font-bold" : "text-base font-semibold")}>
        {formatVND(value)}
      </div>
    </div>
  );
}
