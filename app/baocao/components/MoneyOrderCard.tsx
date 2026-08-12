// app/baocao/components/MoneyOrderCard.tsx
"use client";

import { useEffect, useState } from "react";

import { formatDateKeyVN } from "@/lib/baobay/date";
import type { HandoverDTO } from "@/lib/baobay/types";
import { formatVND } from "@/lib/pricing";

import { apiGet, apiPost } from "./client-api";
import { Banner, Button, Card, Field, MoneyInput, TextInput } from "./ui";

/**
 * Kế toán / quản trị chủ động LẬP LỆNH CHUYỂN TIỀN cho nhân sự: chuyển lương,
 * ứng, trả phí, khoản khác. Lệnh chạy về trang của người nhận với nút "Đã
 * nhận tiền" — họ bấm là xong hai bên; loại ỨNG tự cộng vào cột tiền ứng và
 * trừ vào lương của đúng người.
 */

type Recipient = { username: string; name: string; role: string; roleLabel: string };

const CATEGORIES = [
  { id: "luong", label: "Chuyển lương" },
  { id: "ung", label: "Ứng tiền (trừ lương)" },
  { id: "phi", label: "Trả phí" },
  { id: "khac", label: "Khác" },
] as const;

export function MoneyOrderCard({ spot }: { spot: string }) {
  const [staff, setStaff] = useState<Recipient[]>([]);
  const [orders, setOrders] = useState<HandoverDTO[]>([]);
  const [who, setWho] = useState("");
  const [category, setCategory] = useState<string>("luong");
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<"cash" | "transfer">("transfer");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.all([
      // danh sách người nhận: dùng chung API giao tiền (kế toán thấy mọi vai trò)
      apiGet<{ recipients: Recipient[] }>(`/api/baocao/handover?spot=${spot}`),
      apiGet<{ orders: HandoverDTO[] }>(`/api/baocao/money-order?spot=${spot}`),
    ])
      .then(([a, b]) => {
        if (!alive) return;
        setStaff(a.recipients);
        setOrders(b.orders);
        setWho((prev) => (a.recipients.some((r) => r.username === prev) ? prev : a.recipients[0]?.username || ""));
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : "Không tải được danh sách");
      });
    return () => {
      alive = false;
    };
  }, [spot, tick]);

  async function send() {
    if (!who) return setError("Chưa chọn nhân sự");
    if (amount <= 0) return setError("Chưa nhập số tiền");
    const target = staff.find((r) => r.username === who);
    const catLabel = CATEGORIES.find((c) => c.id === category)?.label ?? category;
    if (!window.confirm(`Lập lệnh ${catLabel} ${formatVND(amount)} cho ${target?.name ?? who}?`)) return;

    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await apiPost<{ order: HandoverDTO }>(`/api/baocao/money-order?spot=${spot}`, {
        targetUsername: who,
        category,
        amount,
        method,
        content,
      });
      setDone(`Đã lập lệnh cho ${res.order.recipientName} — chờ họ bấm "Đã nhận tiền".`);
      setAmount(0);
      setContent("");
      setTick((t) => t + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không lập được lệnh");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      className="border-cyan-200 bg-cyan-50/40"
      title="💸 Lập lệnh chuyển tiền cho nhân sự"
      hint="Chuyển lương / ứng / trả phí — nhân sự vào app bấm 'Đã nhận tiền' là xong. Loại ỨNG tự trừ vào lương người nhận."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nhân sự nhận tiền">
          <select
            value={who}
            onChange={(e) => setWho(e.target.value)}
            className="h-12 w-full rounded-xl border border-cyan-300 bg-white px-3.5 text-slate-900 outline-none focus:border-cyan-600"
          >
            {staff.map((r) => (
              <option key={r.username} value={r.username}>
                {r.name} — {r.roleLabel}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Loại lệnh">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-12 w-full rounded-xl border border-cyan-300 bg-white px-3.5 text-slate-900 outline-none focus:border-cyan-600"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
        <Field label="Số tiền">
          <MoneyInput value={amount} onChange={setAmount} />
        </Field>
        <Field label="Hình thức">
          <div className="flex h-12 overflow-hidden rounded-xl border border-slate-300">
            {(
              [
                ["transfer", "CK"],
                ["cash", "Tiền mặt"],
              ] as Array<["transfer" | "cash", string]>
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setMethod(key)}
                className={
                  method === key
                    ? "bg-cyan-600 px-4 text-sm font-semibold text-white"
                    : "bg-white px-4 text-sm font-medium text-slate-500"
                }
              >
                {label}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div className="mt-3">
        <Field label="Nội dung">
          <TextInput value={content} onChange={(e) => setContent(e.target.value)} placeholder="VD: lương tháng 8" />
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

      <Button type="button" className="mt-3 w-full bg-cyan-600 hover:bg-cyan-700" disabled={busy} onClick={send}>
        {busy ? "Đang lập…" : "Lập lệnh chuyển"}
      </Button>

      {orders.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {orders.slice(0, 10).map((o) => (
            <li key={o.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
              <span className="text-slate-500">{formatDateKeyVN(o.date)}</span>
              <span className="font-medium text-slate-900">{o.recipientName}</span>
              <span className="flex-1 truncate text-xs text-slate-600">{o.content}</span>
              <span className="font-semibold tabular-nums text-slate-900">{formatVND(o.amount)}</span>
              {o.rejected ? (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-800" title={o.rejectedReason}>
                  từ chối
                </span>
              ) : o.confirmed ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                  đã nhận ✓
                </span>
              ) : (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                  chờ nhận
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
