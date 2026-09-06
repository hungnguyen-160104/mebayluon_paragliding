// app/baocao/components/HandoverBox.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import { formatDateKeyVN, todayInVN } from "@/lib/baobay/date";
import type { HandoverDTO } from "@/lib/baobay/types";
import type { MoneyBoard } from "@/services/baobay.service";
import { formatVND } from "@/lib/pricing";

import { apiGet, apiPost } from "./client-api";
import { Banner, Button, DoneTag, Field, MoneyInput, TextInput, CollapseCard, useDoneFlag } from "./ui";

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

export function HandoverBox({
  spot,
  bilingual = false,
  boardDate,
  embedded = false,
}: {
  spot: string;
  bilingual?: boolean;
  /** Ngày đang xem trên trang — bảng "khách đã trả tiền" bám theo ngày này. */
  boardDate?: string;
  /**
   * Nhúng vào trong thẻ khác (khối THU CHI của điều phối): bỏ vỏ thẻ riêng,
   * chỉ hiện tiêu đề con — hai khối tiền chung một chỗ cho đỡ phải nhảy thẻ.
   */
  embedded?: boolean;
}) {
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
  /** Dấu "✓ Đã ghi / Đã gửi" cạnh nút — tiền nong thì phải chắc lệnh đã ăn. */
  const [justSent, flashSent] = useDoneFlag();
  const [justAsked, flashAsked] = useDoneFlag();

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
      flashSent();
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
      flashAsked();
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

  /** Thu chi CỦA MÌNH theo ngày — tải một lần 45 ngày, "xem thêm" mở dần. */
  /** Khách đã trả tiền trong ngày: phần tiền mặt CỦA MÌNH + phần chuyển khoản của điểm. */
  const [board, setBoard] = useState<MoneyBoard | null>(null);
  const [me, setMe] = useState<string>("");
  const [moneyDays, setMoneyDays] = useState<
    Array<{ date: string; rows: Array<{ content: string; amount: number; kind: "thu" | "chi"; method?: string; note?: string }> }>
  >([]);
  const [visibleDays, setVisibleDays] = useState(7);
  useEffect(() => {
    let alive = true;
    apiGet<{ user: { username: string } }>("/api/baocao/me")
      .then((r) => setMe(r.user.username))
      .catch(() => {});
    apiGet<{ days: typeof moneyDays }>(`/api/baocao/my-money?spot=${spot}&days=45`)
      .then((r) => {
        if (alive) setMoneyDays(r.days);
      })
      .catch(() => {
        /* danh sách chỉ để tham khảo */
      });
    return () => {
      alive = false;
    };
  }, [spot]);

  const b = data?.balance;
  const inboxPending = (data?.incoming ?? []).filter((h) => !h.confirmed && !h.rejected);
  const inboxPendingCount = inboxPending.length;
  const mine = data?.handovers ?? [];
  const pendingCount = mine.filter((h) => h.kind !== "advance" && !h.confirmed && !h.rejected).length;
  const myAdvances = mine.filter((h) => h.kind === "advance");
  const advanceApproved = myAdvances.filter((h) => h.confirmed).reduce((sum, h) => sum + h.amount, 0);

  const boardDay = boardDate || today;
  useEffect(() => {
    if (!spot) return;
    let alive = true;
    const load = () =>
      apiGet<MoneyBoard>(`/api/baocao/money-board?spot=${spot}&date=${boardDay}`)
        .then((r) => alive && setBoard(r))
        .catch(() => {
          /* chưa có khoản nào thì thôi */
        });
    load();
    const timer = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [spot, boardDay]);

  const myCash = board?.cashByPerson.find((p) => p.username === me);
  /**
   * KHOẢN CHUYỂN KHOẢN CỦA CHÍNH MÌNH (luật chủ 06/09).
   *
   * Thẻ này là SỔ CÁ NHÂN — trước đây nó bày mọi khoản CK của cả điểm bay, hơn
   * sáu chục triệu một ngày, người trực phải dò giữa đống không phải việc mình
   * mới thấy khoản mình lập. Kế toán muốn xem toàn cảnh thì đã có bảng tiền
   * trong ngày ở trang riêng.
   *
   * Khoản CŨ chưa ghi tài khoản phụ trách thì vẫn hiện: giấu đi là mất dấu
   * khoản có thật, còn tệ hơn là hiện thừa.
   */
  const myTransfers = (board?.transfer.items ?? []).filter((it) => !it.byUsername || it.byUsername === me);
  const myTransferTotal = myTransfers.reduce((t, it) => t + (it.amount || 0), 0);

  const inner = (
    <>
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
        <div className="grid grid-cols-2 gap-2">
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

      {/* --------- KHÁCH ĐÃ TRẢ TIỀN TRONG NGÀY: mình cầm những khoản nào, ai chuyển khoản --------- */}
      {(myCash || myTransfers.length > 0) && (
        <div className="mt-4 space-y-2">
          {myCash && (
            <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-2.5">
              <h3 className="text-sm font-bold text-sky-900">
                💵 {t("Khách tôi đã thu tiền mặt", "cash I collected")} {formatDateKeyVN(boardDay)} —{" "}
                <span className="tabular-nums">{formatVND(myCash.total)}</span>
              </h3>
              <ul className="mt-1 divide-y divide-sky-100">
                {myCash.items.map((it, i) => (
                  <li key={`${it.label}-${i}`} className="flex items-center gap-2 py-1 text-sm text-slate-700">
                    <span className="min-w-0 flex-1 leading-snug">
                      {it.daySeq > 0 && (
                        <strong className="mr-1 rounded bg-red-600 px-1.5 font-bold text-white">{it.daySeq}</strong>
                      )}
                      {it.label}
                      {it.bookingCode ? <span className="text-slate-400"> · #{it.bookingCode}</span> : null}
                      {it.guests ? <span className="text-slate-400"> · {it.guests} khách</span> : null}
                      <span className="text-[11px] text-slate-400"> · {it.from}</span>
                    </span>
                    <strong className="shrink-0 tabular-nums text-slate-900">{formatVND(it.amount)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {myTransfers.length > 0 && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-2.5">
              <h3 className="text-sm font-bold text-indigo-900">
                🏦 {t("Khách TÔI lập đã chuyển khoản vào TK công ty", "transfers to company I recorded")} —{" "}
                <span className="tabular-nums">{formatVND(myTransferTotal)}</span>
              </h3>
              <ul className="mt-1 divide-y divide-indigo-100">
                {myTransfers.map((it, i) => (
                  <li key={`${it.label}-${i}`} className="flex items-center gap-2 py-1 text-sm text-slate-700">
                    <span className="min-w-0 flex-1 leading-snug">
                      {it.daySeq > 0 && (
                        <strong className="mr-1 rounded bg-red-600 px-1.5 font-bold text-white">{it.daySeq}</strong>
                      )}
                      {it.label}
                      {it.bookingCode ? <span className="text-slate-400"> · #{it.bookingCode}</span> : null}
                      {it.transferCode ? <span className="text-slate-400"> · CK #{it.transferCode}</span> : null}
                    </span>
                    <strong className="shrink-0 tabular-nums text-slate-900">{formatVND(it.amount)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ---------------------- Thu chi CỦA TÔI theo ngày — sổ quan trọng nhất ---------------------- */}
      {moneyDays.length > 0 && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
          <h3 className="text-sm font-bold text-slate-900">
            📜 {t("Thu chi của tôi theo ngày", "my money by day")}
            <span className="ml-1 text-xs font-normal text-slate-400">({t("tối đa 45 ngày", "45 days max")})</span>
          </h3>
          <div className="mt-2 space-y-3">
            {moneyDays.slice(0, visibleDays).map((d) => {
              const thu = d.rows.reduce((a, r) => a + (r.kind === "thu" ? r.amount : 0), 0);
              const chi = d.rows.reduce((a, r) => a + (r.kind !== "thu" ? r.amount : 0), 0);
              return (
                <div key={d.date}>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-semibold text-slate-700">{formatDateKeyVN(d.date)}</span>
                    <span className="tabular-nums">
                      {thu > 0 && <span className="font-semibold text-emerald-700">+{formatVND(thu)}</span>}
                      {thu > 0 && chi > 0 && <span className="text-slate-300"> · </span>}
                      {chi > 0 && <span className="font-semibold text-rose-700">−{formatVND(chi)}</span>}
                    </span>
                  </div>
                  <ul className="mt-1 divide-y divide-slate-100 rounded-lg border border-slate-100">
                    {d.rows.map((r, i) => (
                      <li key={i} className="flex flex-wrap items-baseline gap-2 px-2.5 py-1.5 text-xs">
                        <span className="flex-1 text-slate-800">
                          {r.content}
                          {r.note && <span className="ml-1 text-slate-400">— {r.note}</span>}
                        </span>
                        {r.method && (
                          <span className="rounded bg-slate-100 px-1 text-[10px] text-slate-500">
                            {r.method === "transfer" ? "CK" : "TM"}
                          </span>
                        )}
                        <span
                          className={
                            "font-semibold tabular-nums " + (r.kind === "thu" ? "text-emerald-700" : "text-rose-700")
                          }
                        >
                          {r.kind === "thu" ? "+" : "−"}
                          {formatVND(r.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          {visibleDays < moneyDays.length && (
            <Button
              type="button"
              variant="ghost"
              className="mt-2 h-9 w-full border border-slate-300 text-xs"
              onClick={() => setVisibleDays((v) => Math.min(v + 7, 45))}
            >
              {t("Xem thêm", "show more")} ({moneyDays.length - visibleDays} {t("ngày nữa", "more days")})
            </Button>
          )}
        </div>
      )}

      {/* ---------------------- Giao tiền — ít dùng, gập mặc định ---------------------- */}
      <details className="group mt-5 rounded-xl border-2 border-sky-300 bg-sky-50/70 p-3">
        <summary className="cursor-pointer">
          <h3 className="inline text-sm font-bold text-sky-900">💵 {t("Chuyển tiền", "transfer")}</h3>
          <span aria-hidden className="float-right text-sky-400 transition-transform group-open:rotate-180">▾</span>
        </summary>
        <p className="mt-0.5 text-xs text-slate-600">
          {t("Người nhận bấm xác nhận thì mới xong", "recipient confirms")}
        </p>

        <div className="mt-3">
        <Field
          label={t("Chuyển cho ai", "transfer to")}
          hint={data && data.recipients.length === 0 ? "Chưa có ai để nhận tiền ở điểm này" : undefined}
        >
          <select
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="h-10 w-full rounded-lg border border-sky-300 bg-white px-3 text-slate-900 outline-none focus:border-sky-600"
          >
            {(data?.recipients ?? []).map((r) => (
              <option key={r.username} value={r.username}>
                {r.name} — {r.roleLabel}
              </option>
            ))}
          </select>
        </Field>
        </div>

      <div className="mt-3 grid gap-3 @md:grid-cols-2">
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

      <div className="mt-3 flex items-center gap-2">
        <Button
          type="button"
          className="flex-1 bg-sky-600 hover:bg-sky-700"
          disabled={busy}
          onClick={submit}
        >
          {busy ? "Đang ghi…" : t("Đã chuyển tiền", "sent")}
        </Button>
        <DoneTag show={justSent}>Đã ghi</DoneTag>
      </div>
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

        <div className="mt-3 grid gap-3 @md:grid-cols-2">
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
              className="h-10 w-full rounded-lg border border-violet-300 bg-white px-3 text-slate-900 outline-none focus:border-violet-600"
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

        <div className="mt-3 flex items-center gap-2">
          <Button
            type="button"
            className="flex-1 bg-violet-600 hover:bg-violet-700"
            disabled={advBusy}
            onClick={askAdvance}
          >
            {advBusy ? "Đang gửi…" : t("Gửi yêu cầu", "send request")}
          </Button>
          <DoneTag show={justAsked}>Đã gửi</DoneTag>
        </div>

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
    </>
  );

  if (embedded) {
    return (
      <div className="mt-4 border-t border-slate-200 pt-3">
        <div className="mb-2 flex items-baseline gap-2">
          <span className="text-sm font-bold text-teal-900">
            💰 {t("Tiền nong", "Money")}
            {inboxPendingCount ? ` · ${inboxPendingCount} chờ xác nhận` : ""}
          </span>
          <span className="text-xs text-slate-500">{t("máy tự cộng từ báo cáo của bạn", "auto-computed")}</span>
        </div>
        {inner}
      </div>
    );
  }

  return (
    <CollapseCard
      className="border-teal-200 bg-teal-50/40"
      title={`${t("Tiền nong", "Money")}${inboxPendingCount ? ` · ${inboxPendingCount} chờ xác nhận` : ""}`}
      hint={t("Máy tự cộng từ báo cáo của bạn", "auto-computed")}
    >
      {inner}
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
