// app/baocao/components/FlycamCancelCard.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import { formatDateKeyVN } from "@/lib/baobay/date";
import { formatVND } from "@/lib/pricing";
import type { FlycamCancelDTO, TicketLookup } from "@/services/baobay.service";

import { apiGet, apiPatch, apiPost } from "./client-api";
import { Banner, Button, CollapseCard, Field, MoneyInput, TextInput } from "./ui";

type Pilot = { username: string; name: string };

/**
 * HUỶ FLYCAM vì lỗi vận hành (máy hỏng, gió to, hình không dùng được) và lệnh
 * hoàn tiền cho khách.
 *
 * Chỗ khó nhất là biết mã vé thuộc chuyến nào: mã vé xé tại quầy lúc khách tới,
 * còn booking đặt trước cả tuần, hai thứ không có mối nối sẵn. Nên gõ mã xong
 * máy đi TRA NGƯỢC: phi công nào khai đã bay mã đó ⇒ ra ngày bay và phi công;
 * rồi liệt kê các đoàn của ngày đó CÓ ĐĂNG KÝ FLYCAM để chọn đúng đoàn. Máy
 * không tự gán — gán nhầm đoàn còn tệ hơn để trống.
 */
export function FlycamCancelCard({
  spot,
  date,
  canConfirm = false,
}: {
  spot: string;
  date: string;
  /** Kế toán: hiện nút "đã chuyển tiền" cho các lệnh đang chờ. */
  canConfirm?: boolean;
}) {
  const [items, setItems] = useState<FlycamCancelDTO[]>([]);
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [lookup, setLookup] = useState<TicketLookup | null>(null);

  const [code, setCode] = useState("");
  const [pilot, setPilot] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState<"self" | "company">("self");
  const [amount, setAmount] = useState(0);
  const [bank, setBank] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [payCode, setPayCode] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    if (!spot) return;
    apiGet<{ items: FlycamCancelDTO[]; pilots: Pilot[] }>(`/api/baocao/flycam-cancel?spot=${spot}&date=${date}`)
      .then((r) => {
        setItems(r.items);
        setPilots(r.pilots);
      })
      .catch(() => {
        /* chưa có lệnh nào thì thôi */
      });
  }, [spot, date]);

  useEffect(() => {
    load();
  }, [load]);

  /** Gõ xong mã vé thì tra ngược xem chuyến nào — người dùng chốt lại. */
  async function findTicket() {
    if (!code.trim()) return;
    setError(null);
    try {
      const r = await apiGet<{ lookup: TicketLookup | null }>(
        `/api/baocao/flycam-cancel?spot=${spot}&date=${date}&code=${encodeURIComponent(code.trim())}`,
      );
      setLookup(r.lookup);
      if (r.lookup?.pilotUsername) setPilot(r.lookup.pilotUsername);
      if (r.lookup?.candidates.length === 1) setBookingId(r.lookup.candidates[0].id);
    } catch {
      setError("Không tra được mã vé");
    }
  }

  async function submit() {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      await apiPost(`/api/baocao/flycam-cancel?spot=${spot}`, {
        date: lookup?.date || date,
        ticketCode: code,
        pilotUsername: pilot,
        bookingId,
        reason,
        refundMode: mode,
        amount,
        bankAccount: bank,
      });
      setDone(
        mode === "self"
          ? `✓ Đã ghi huỷ flycam — trừ ${formatVND(amount)} vào tiền phi công đang giữ.`
          : `✓ Đã gửi lệnh hoàn ${formatVND(amount)} cho kế toán chuyển khoản.`,
      );
      setCode("");
      setReason("");
      setBank("");
      setAmount(0);
      setBookingId("");
      setLookup(null);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không lưu được lệnh huỷ flycam");
    } finally {
      setBusy(false);
    }
  }

  async function confirmPaid(it: FlycamCancelDTO) {
    const tc = (payCode[it.id] ?? "").trim();
    if (!tc) return setError("Ghi mã giao dịch đã chuyển cho khách");
    setBusy(true);
    setError(null);
    try {
      await apiPatch(`/api/baocao/flycam-cancel?spot=${spot}`, { id: it.id, transferCode: tc });
      setDone(`✓ Đã xác nhận chuyển ${formatVND(it.amount)} cho khách (#${tc}).`);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không xác nhận được");
    } finally {
      setBusy(false);
    }
  }

  const pending = items.filter((i) => i.status === "pending");

  return (
    <CollapseCard
      className={pending.length ? "border-amber-400" : "border-slate-200"}
      title="🎥 Huỷ flycam & hoàn tiền khách"
      hint={pending.length ? `${pending.length} lệnh hoàn đang chờ kế toán` : `${items.length} lệnh gần đây`}
      open={pending.length > 0 || undefined}
    >
      {done && <Banner tone="success" onClose={() => setDone(null)}>{done}</Banner>}
      {error && <Banner tone="error">{error}</Banner>}

      <div className="grid gap-2 @md:grid-cols-2">
        <Field label="Mã vé bị huỷ flycam">
          <div className="flex gap-1">
            <TextInput
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onBlur={findTicket}
              placeholder="MBL1234"
              autoCapitalize="characters"
              spellCheck={false}
              className="h-10 flex-1 rounded-lg text-sm"
            />
            <Button type="button" variant="ghost" className="h-10 shrink-0 bg-white px-2 text-xs" onClick={findTicket}>
              🔎 Tra
            </Button>
          </div>
          {lookup && (
            <p className="mt-0.5 text-[11px] leading-tight text-slate-600">
              {lookup.date
                ? `Phi công ${lookup.pilotName} khai đã bay mã này ngày ${formatDateKeyVN(lookup.date)}.`
                : lookup.issuedOn
                  ? `Mã nằm trong dải vé xuất ngày ${formatDateKeyVN(lookup.issuedOn)} — chưa ai khai đã bay.`
                  : "Chưa tra được mã này trong báo cáo nào — vẫn ghi được, chọn phi công giúp."}
            </p>
          )}
        </Field>

        <Field label="Phi công bay kèm">
          <select
            value={pilot}
            onChange={(e) => setPilot(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-600"
          >
            <option value="">— chọn phi công —</option>
            {pilots.map((p) => (
              <option key={p.username} value={p.username}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>

        {(lookup?.candidates.length ?? 0) > 0 && (
          <Field label="Đoàn khách (đoàn có đăng ký flycam hôm đó)">
            <select
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-600"
            >
              <option value="">— chưa rõ đoàn nào —</option>
              {lookup!.candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.daySeq} {c.label} · {c.guestCount} khách · {c.flycam}×flycam
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Lý do huỷ">
          <TextInput
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Máy hỏng giữa chuyến · gió to không cất được · hình vỡ…"
            className="h-10 rounded-lg text-sm"
          />
        </Field>

        <Field label="Cách hoàn tiền khách" group>
          <div className="flex h-10 overflow-hidden rounded-lg border border-slate-300">
            {(
              [
                ["self", "Tự hoàn tại bãi"],
                ["company", "Công ty chuyển khoản"],
              ] as Array<["self" | "company", string]>
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setMode(v)}
                className={
                  mode === v
                    ? "flex-1 bg-sky-600 text-xs font-bold text-white"
                    : "flex-1 bg-white text-xs font-medium text-slate-500"
                }
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-0.5 text-[11px] leading-tight text-slate-500">
            {mode === "self"
              ? "Trừ thẳng vào tiền mặt phi công bay kèm đang giữ."
              : "Gửi lệnh cho kế toán chuyển khoản — kế toán xác nhận xong mới tính là đã hoàn."}
          </p>
        </Field>

        <Field label="Số tiền hoàn khách">
          <MoneyInput value={amount} onChange={setAmount} />
        </Field>

        {mode === "company" && (
          <Field label="Số tài khoản khách nhận">
            <TextInput
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              placeholder="Số TK · ngân hàng · tên chủ TK"
              className="h-10 rounded-lg text-sm"
            />
          </Field>
        )}
      </div>

      <Button type="button" className="mt-2.5 w-full" disabled={busy} onClick={submit}>
        {busy ? "Đang lưu…" : mode === "self" ? "✓ Ghi huỷ flycam & đã hoàn tại bãi" : "✓ Gửi lệnh hoàn cho kế toán"}
      </Button>

      {items.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-200 pt-2">
          {items.map((it) => (
            <li key={it.id} className="py-1.5 text-sm">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span
                  className={
                    "shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold " +
                    (it.status === "pending"
                      ? "bg-amber-100 text-amber-900"
                      : it.status === "paid"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-600")
                  }
                >
                  {it.status === "pending" ? "chờ kế toán chuyển" : it.status === "paid" ? "đã chuyển ✓" : "đã hoàn tại bãi"}
                </span>
                <span className="min-w-0 flex-1 leading-snug text-slate-700">
                  {formatDateKeyVN(it.date)} · <strong>{it.ticketCode || "không mã"}</strong>
                  {it.bookingLabel ? ` · ${it.bookingLabel}` : ""} · PC {it.pilotName} · {it.reason}
                  {it.bankAccount ? ` · TK ${it.bankAccount}` : ""}
                  {it.transferCode ? ` · CK #${it.transferCode}` : ""}
                </span>
                <strong className="shrink-0 tabular-nums text-rose-700">{formatVND(it.amount)}</strong>
              </div>
              {canConfirm && it.status === "pending" && (
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <TextInput
                    value={payCode[it.id] ?? ""}
                    onChange={(e) => setPayCode((prev) => ({ ...prev, [it.id]: e.target.value }))}
                    placeholder="Mã giao dịch đã chuyển"
                    className="h-8 flex-1 rounded-lg text-xs"
                  />
                  <Button
                    type="button"
                    className="h-8 shrink-0 bg-emerald-600 px-2 text-xs hover:bg-emerald-700"
                    disabled={busy}
                    onClick={() => confirmPaid(it)}
                  >
                    ✓ Đã chuyển
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </CollapseCard>
  );
}
