// app/baocao/components/CollectBox.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import { formatDateKeyVN, todayInVN } from "@/lib/baobay/date";
import type { CollectDTO } from "@/lib/baobay/types";
import { formatVND } from "@/lib/pricing";

import { apiGet, apiPatch, apiPost } from "./client-api";
import { Banner, Button, CollapseCard, CountInput, Field, MoneyInput, TextInput } from "./ui";

/**
 * LỆNH THU TIỀN — khách chốt lịch nhưng trả TIỀN MẶT tại hiện trường hoặc
 * CHUYỂN KHOẢN vào TK công ty:
 *
 *  - `CollectInbox`: banner "lệnh thu chờ bạn" trên trang MỌI nhân sự — người
 *    được chỉ định bấm "Đã thu tiền" hoặc "Từ chối" kèm lý do.
 *  - `CollectCreate`: thẻ lập lệnh cho KẾ TOÁN / ĐIỀU PHỐI — TM chọn người
 *    thu, CK tích TK công ty + mã CK.
 *
 * Tiền lệnh thu ĐÃ XÁC NHẬN tự cộng vào "tiền giữ hộ công ty" của người thu —
 * không ghi lại vào sổ THU CHI (kẻo đếm trùng). Không chỉ định ai = CHÍNH MÌNH
 * thu, hoàn tất ngay không cần xác nhận.
 */

/** "13/08 20:15" giờ Việt Nam. */
function stampVN(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

function CollectLine({ c }: { c: CollectDTO }) {
  const parts = [
    [c.guestName, c.bookingCode && `#${c.bookingCode}`].filter(Boolean).join(" ") || "khách",
    c.agency,
    c.guests ? `${c.guests} người` : "",
    c.method === "transfer" ? `CK${c.transferCode ? ` #${c.transferCode}` : ""}` : "tiền mặt",
    c.toCompanyAccount ? "→ TK công ty" : "",
    c.note,
  ].filter(Boolean);
  return <span className="text-xs text-slate-600">{parts.join(" · ")}</span>;
}

/* ================================================================== */
/* Banner: lệnh thu CHỜ BẠN — hiện trên trang mọi nhân sự               */
/* ================================================================== */

export function CollectInbox({ spot }: { spot: string }) {
  const [assigned, setAssigned] = useState<CollectDTO[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    apiGet<{ assigned: CollectDTO[] }>(`/api/baocao/collect?spot=${spot}`)
      .then((r) => setAssigned(r.assigned))
      .catch(() => {
        /* không có lệnh thì thôi */
      });
  }, [spot]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30_000);
    return () => clearInterval(timer);
  }, [load]);

  if (!assigned.length) return null;

  async function act(c: CollectDTO, collected: boolean) {
    const reason = collected ? "" : window.prompt(`Từ chối thu ${formatVND(c.amount)} của ${c.guestName || "khách"} — lý do?`) ?? "";
    if (!collected && !reason.trim()) return;
    if (collected && !window.confirm(`Xác nhận ĐÃ THU ${formatVND(c.amount)} từ ${c.guestName || "khách"}? Khoản này sẽ cộng vào tiền giữ hộ công ty của bạn.`)) return;
    setBusy(c.id);
    setError(null);
    try {
      await apiPatch(`/api/baocao/collect?spot=${spot}`, { id: c.id, collected, reason });
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không xử lý được");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 lg:[column-span:all]">
      <h2 className="text-sm font-bold text-amber-900">💰 Lệnh THU TIỀN chờ bạn ({assigned.length})</h2>
      {error && (
        <div className="mt-2">
          <Banner tone="error">{error}</Banner>
        </div>
      )}
      <ul className="mt-2 space-y-2">
        {assigned.map((c) => (
          <li key={c.id} className="rounded-lg bg-white px-3 py-2">
            <div className="flex flex-wrap items-baseline gap-2">
              <div className="min-w-0 flex-1">
                <CollectLine c={c} />
                <div className="text-[11px] text-slate-400">
                  lập {stampVN(c.createdAt)} bởi {c.createdByName}
                </div>
              </div>
              <span className="font-bold tabular-nums text-slate-900">{formatVND(c.amount)}</span>
            </div>
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                className="h-9 flex-1 bg-emerald-600 text-xs hover:bg-emerald-700"
                disabled={busy === c.id}
                onClick={() => act(c, true)}
              >
                {busy === c.id ? "Đang lưu…" : "✓ Xác nhận đã thu tiền"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-9 flex-1 bg-white text-xs text-rose-700"
                disabled={busy === c.id}
                onClick={() => act(c, false)}
              >
                ✕ Từ chối
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-amber-800/80">
        Bấm "Đã thu tiền" là khoản này tự cộng vào TIỀN GIỮ HỘ CÔNG TY của bạn — đừng ghi lại vào sổ THU CHI kẻo
        đếm trùng.
      </p>
    </div>
  );
}

/* ================================================================== */
/* Thẻ lập lệnh thu — kế toán / điều phối                              */
/* ================================================================== */

type CollectForm = {
  guestName: string;
  bookingCode: string;
  agency: string;
  guests: number;
  amount: number;
  method: "cash" | "transfer";
  collectorUsername: string;
  toCompanyAccount: boolean;
  transferCode: string;
  note: string;
};

const EMPTY: CollectForm = {
  guestName: "",
  bookingCode: "",
  agency: "",
  guests: 0,
  amount: 0,
  method: "cash",
  collectorUsername: "",
  toCompanyAccount: true,
  transferCode: "",
  note: "",
};

export function CollectCreate({ spot }: { spot: string }) {
  const [form, setForm] = useState<CollectForm>(EMPTY);
  const [staff, setStaff] = useState<Array<{ username: string; name: string; roleLabel: string }>>([]);
  const [created, setCreated] = useState<CollectDTO[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const set = <K extends keyof CollectForm>(key: K, value: CollectForm[K]) => {
    setDone(null);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const load = useCallback(() => {
    apiGet<{ created: CollectDTO[] }>(`/api/baocao/collect?spot=${spot}`)
      .then((r) => setCreated(r.created))
      .catch(() => {});
    // Danh sách MỌI nhân sự đang làm tại điểm — chọn người thu
    apiGet<{ staff: Array<{ username: string; name: string; roleLabel: string }> }>(
      `/api/baocao/booking?date=${todayInVN()}&spot=${spot}`,
    )
      .then((r) => setStaff(r.staff ?? []))
      .catch(() => {});
  }, [spot]);

  useEffect(() => {
    load();
  }, [load]);

  async function send() {
    setError(null);
    setDone(null);
    if (form.amount <= 0) return setError("Chưa nhập số tiền");
    if (form.method === "transfer" && !form.toCompanyAccount) return setError("Chuyển khoản phải tích 'TK công ty'");
    const who = staff.find((a) => a.username === form.collectorUsername);
    const confirmMsg =
      form.method === "cash"
        ? form.collectorUsername
          ? `Gửi lệnh thu ${formatVND(form.amount)} (${form.guestName || form.bookingCode || "khách"}) cho ${who?.name ?? "?"}?`
          : `Ghi nhận CHÍNH BẠN đã thu ${formatVND(form.amount)} (${form.guestName || form.bookingCode || "khách"}) — cộng vào tiền giữ hộ công ty của bạn?`
        : `Ghi nhận ${formatVND(form.amount)} chuyển khoản vào TK CÔNG TY?`;
    if (!window.confirm(confirmMsg)) return;
    setBusy(true);
    try {
      await apiPost(`/api/baocao/collect?spot=${spot}`, form);
      setDone(
        form.method === "cash"
          ? form.collectorUsername
            ? `Đã gửi lệnh thu cho ${who?.name ?? ""} — chờ họ bấm "Đã thu tiền".`
            : "Đã ghi nhận bạn thu tiền — cộng vào tiền giữ hộ công ty của bạn."
          : "Đã ghi nhận khoản chuyển khoản vào TK công ty.",
      );
      setForm(EMPTY);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không lập được lệnh thu");
    } finally {
      setBusy(false);
    }
  }

  return (
    <CollapseCard
      className="border-emerald-200 bg-emerald-50/40"
      title="💰 Lệnh thu tiền"
      hint="khách chốt lịch — TM chỉ định người thu, CK ghi vào TK công ty"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Tên khách">
          <TextInput value={form.guestName} onChange={(e) => set("guestName", e.target.value)} placeholder="anh Tú…" />
        </Field>
        <Field label="Mã booking">
          <TextInput value={form.bookingCode} onChange={(e) => set("bookingCode", e.target.value)} placeholder="KLK123…" />
        </Field>
        <Field label="Đại lý">
          <TextInput value={form.agency} onChange={(e) => set("agency", e.target.value)} placeholder="Klook / GYG / FB…" />
        </Field>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Field label="Số người">
          <CountInput compact value={form.guests} onChange={(v) => set("guests", v)} max={100} />
        </Field>
        <Field label="Số tiền">
          <MoneyInput value={form.amount} onChange={(v) => set("amount", v)} />
        </Field>
      </div>

      <div className="mt-3">
        <Field label="Khách trả bằng">
          <div className="flex h-12 overflow-hidden rounded-xl border border-slate-300">
            {(
              [
                ["cash", "Tiền mặt"],
                ["transfer", "Chuyển khoản"],
              ] as Array<["cash" | "transfer", string]>
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => set("method", key)}
                className={
                  form.method === key
                    ? "flex-1 bg-emerald-600 text-sm font-semibold text-white"
                    : "flex-1 bg-white text-sm font-medium text-slate-500"
                }
              >
                {label}
              </button>
            ))}
          </div>
        </Field>
      </div>

      {form.method === "cash" ? (
        <div className="mt-3">
          <Field label="Người thu">
            <select
              value={form.collectorUsername}
              onChange={(e) => set("collectorUsername", e.target.value)}
              className="h-12 w-full rounded-xl border border-emerald-300 bg-white px-3.5 text-slate-900 outline-none focus:border-emerald-600"
            >
              <option value="">✓ Chính tôi thu (mặc định)</option>
              {staff.map((a) => (
                <option key={a.username} value={a.username}>
                  {a.name} — {a.roleLabel}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">
              {form.collectorUsername
                ? "Lệnh chạy về trang người được chọn — họ bấm \"Đã thu tiền\" mới xong."
                : "Chính mình thu: tiền ghi thẳng vào TIỀN GIỮ HỘ CÔNG TY của bạn, không cần xác nhận."}
            </p>
          </Field>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <label className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-3 py-2.5">
            <input
              type="checkbox"
              checked={form.toCompanyAccount}
              onChange={(e) => set("toCompanyAccount", e.target.checked)}
              className="h-5 w-5 rounded border-slate-300"
            />
            <span className="text-sm font-medium text-slate-800">
              TK công ty — tiền vào thẳng tài khoản công ty, không ai cầm
            </span>
          </label>
          <Field label="Mã chuyển khoản">
            <TextInput
              value={form.transferCode}
              onChange={(e) => set("transferCode", e.target.value)}
              placeholder="Mã GD ngân hàng…"
            />
          </Field>
        </div>
      )}

      <div className="mt-3">
        <Field label="Ghi chú">
          <TextInput value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="Bay ngày nào, hẹn gì thêm…" />
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

      <Button type="button" className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700" disabled={busy} onClick={send}>
        {busy ? "Đang gửi…" : "✓ Xác nhận"}
      </Button>

      {created.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {created.slice(0, 10).map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
              <span className="text-slate-500">{formatDateKeyVN(c.date)}</span>
              <span className="min-w-0 flex-1">
                <CollectLine c={c} />
                {c.collectorName && <span className="ml-1 text-xs text-slate-500">→ {c.collectorName}</span>}
              </span>
              <span className="font-semibold tabular-nums">{formatVND(c.amount)}</span>
              {c.status === "collected" && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">đã thu ✓</span>
              )}
              {c.status === "pending" && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">chờ thu</span>
              )}
              {c.status === "company" && (
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-800">TK công ty ✓</span>
              )}
              {c.status === "rejected" && (
                <span
                  className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-800"
                  title={c.rejectedReason}
                >
                  từ chối
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </CollapseCard>
  );
}
