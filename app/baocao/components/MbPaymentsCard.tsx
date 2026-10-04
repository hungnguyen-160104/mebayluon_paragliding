// app/baocao/components/MbPaymentsCard.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import { formatDateKeyVN, shiftDateKey, todayInVN } from "@/lib/baobay/date";
import { spotName } from "@/lib/baobay/spots";
import { formatVND } from "@/lib/pricing";
import type { PayLedgerRow } from "@/services/pay-account.service";

import { apiGet, apiPatch } from "./client-api";
import { MbVatTag } from "./PayAccount";
import { Banner, Card } from "./ui";

/**
 * PHÂN LOẠI TIỀN NGÂN HÀNG cho kế toán thuế (chủ 04/10 vòng 3): 100% tiền vào
 * TK công ty MB phải có hoá đơn VAT.
 *
 * Lọc: khoảng ngày (ngày tiền đi) · Tài khoản nhận: Tất cả / MB công ty / BIDV
 * · VAT: chưa xuất / đã xuất. Mỗi dòng: ngày giờ, booking (#số, tên, SĐT),
 * khoản gì (cọc / còn thu / thêm dịch vụ / hoàn), số tiền, tài khoản, mã GD,
 * tình trạng VAT + ô tích + số hoá đơn — CÙNG chỗ lưu với thẻ "Xuất VAT cuối
 * ngày" ở chốt ngày (dấu đã xuất nằm trên booking). Hoàn tiền ra từ MB là dòng
 * ÂM để số hoá đơn trừ đúng. Nút "Chép bảng" chép dạng TAB cho Excel / HĐĐT.
 */
export function MbPaymentsCard({ defaultAccount = "company" }: { defaultAccount?: "all" | "company" | "personal" }) {
  const today = todayInVN();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [account, setAccount] = useState<"all" | "company" | "personal">(defaultAccount);
  const [vat, setVat] = useState<"all" | "pending" | "issued">("all");
  const [rows, setRows] = useState<PayLedgerRow[] | null>(null);
  const [totals, setTotals] = useState<{ company: number; personal: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    setError(null);
    const q = new URLSearchParams({ ledger: "1", from, to, account, vat });
    apiGet<{ rows: PayLedgerRow[]; totals: { company: number; personal: number } }>(`/api/baocao/vat?${q.toString()}`)
      .then((r) => {
        setRows(r.rows ?? []);
        setTotals(r.totals ?? null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Không tải được bảng tiền"));
  }, [from, to, account, vat]);

  useEffect(() => {
    setRows(null);
    load();
  }, [load]);

  async function tick(r: PayLedgerRow, on: boolean) {
    if (!r.bookingId) return;
    setBusy(r.key);
    setError(null);
    try {
      await apiPatch(`/api/baocao/vat`, { id: r.bookingId, spot: r.spot, on, invoiceNo: invoice[r.bookingId] ?? r.invoiceNo ?? "" });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được");
    } finally {
      setBusy(null);
    }
  }

  const gio = (iso?: string) =>
    iso ? new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }) : "";
  const tk = (a: string) => (a === "company" ? "MB công ty" : "BIDV Thuỷ");
  const vatText = (r: PayLedgerRow) =>
    r.account !== "company"
      ? ""
      : !r.bookingId
        ? "không gắn booking"
        : r.vatIssued && (r.vatAmount ?? 0) >= (r.bookingMbTotal ?? 0)
          ? "đã xuất"
          : r.vatIssued
            ? "xuất thiếu"
            : "chưa xuất";

  async function copyTable() {
    const head = ["Ngày", "Giờ", "Điểm", "Số TT", "Khách", "SĐT", "Mã booking", "Ngày bay", "Khoản", "Số tiền", "Tài khoản", "Mã GD", "VAT", "Số HĐ"];
    const out = [head.join("\t")];
    for (const r of rows ?? []) {
      out.push(
        [
          formatDateKeyVN(r.date),
          gio(r.at),
          spotName(r.spot),
          r.daySeq || "",
          r.guestName,
          r.phone,
          r.bookingCode,
          r.flightDate ? formatDateKeyVN(r.flightDate) : "",
          r.purpose,
          r.amount,
          tk(r.account),
          r.code,
          vatText(r),
          r.invoiceNo ?? "",
        ]
          .map((v) => String(v).replace(/\t|\n/g, " "))
          .join("\t"),
      );
    }
    try {
      await navigator.clipboard.writeText(out.join("\n"));
      setMsg(`Đã chép ${out.length - 1} dòng — dán vào Excel / phần mềm hoá đơn.`);
    } catch {
      setError("Máy không cho chép tự động.");
    }
  }

  const list = rows ?? [];
  const sum = list.reduce((t, r) => t + r.amount, 0);
  const pill = (on: boolean, red?: boolean) =>
    "h-8 rounded-lg border px-2.5 text-xs font-semibold " +
    (on ? (red ? "border-red-600 bg-red-600 text-white" : "border-sky-600 bg-sky-600 text-white") : "border-slate-300 bg-white text-slate-600");

  return (
    <Card
      title="🏦 Phân loại tiền ngân hàng — MB công ty / BIDV"
      hint="100% tiền vào TK công ty MB 168858888 phải có hoá đơn VAT. Hoàn tiền ra từ MB hiện số âm."
    >
      <div className="flex flex-wrap items-end gap-2 text-xs">
        <label className="flex flex-col gap-0.5">
          <span className="font-semibold text-slate-600">Từ ngày</span>
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-lg border border-slate-300 px-2" />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="font-semibold text-slate-600">Đến ngày</span>
          <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-lg border border-slate-300 px-2" />
        </label>
        <button type="button" className={pill(false)} onClick={() => { setFrom(shiftDateKey(today, -6)); setTo(today); }}>
          7 ngày
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="font-semibold text-slate-600">Tài khoản nhận:</span>
        <button type="button" className={pill(account === "all")} onClick={() => setAccount("all")}>Tất cả</button>
        <button type="button" className={pill(account === "company", true)} onClick={() => setAccount("company")}>MB công ty</button>
        <button type="button" className={pill(account === "personal")} onClick={() => setAccount("personal")}>BIDV</button>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="font-semibold text-slate-600">VAT:</span>
        <button type="button" className={pill(vat === "all")} onClick={() => setVat("all")}>Tất cả</button>
        <button type="button" className={pill(vat === "pending", true)} onClick={() => setVat("pending")}>Chưa xuất</button>
        <button type="button" className={pill(vat === "issued")} onClick={() => setVat("issued")}>Đã xuất</button>
      </div>

      {error && <div className="mt-2"><Banner tone="error">{error}</Banner></div>}
      {msg && (
        <div className="mt-2">
          <Banner tone="success" onClose={() => setMsg(null)}>{msg}</Banner>
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span>
          {list.length} dòng · <strong className="tabular-nums">{formatVND(sum)}</strong>
          {totals && (
            <span className="ml-1 text-xs text-slate-500">
              (MB {formatVND(totals.company)} · BIDV {formatVND(totals.personal)})
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={() => void copyTable()}
          disabled={!list.length}
          className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          📋 Chép bảng
        </button>
      </div>

      {rows === null ? (
        <p className="mt-2 text-xs text-slate-400">Đang tải…</p>
      ) : list.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Không có khoản nào khớp bộ lọc.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {list.map((r) => {
            const mb = r.account === "company";
            const done = vatText(r) === "đã xuất";
            return (
              <li
                key={r.key}
                className={
                  "rounded-xl border-2 px-2.5 py-1.5 text-sm " +
                  (mb ? (done ? "border-emerald-300 bg-emerald-50/50" : "border-red-300 bg-red-50/40") : "border-slate-200 bg-white")
                }
              >
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-[11px] tabular-nums text-slate-500">
                    {formatDateKeyVN(r.date)} {gio(r.at)}
                  </span>
                  {r.daySeq > 0 && <strong className="rounded bg-red-600 px-1 text-[11px] text-white">{r.daySeq}</strong>}
                  <span className="min-w-0 font-semibold text-slate-900">{r.guestName || "—"}</span>
                  <span className="text-xs tabular-nums text-slate-600">{r.phone}</span>
                  <strong className={"ml-auto tabular-nums " + (r.amount < 0 ? "text-rose-700" : mb ? "text-red-700" : "text-slate-900")}>
                    {r.amount < 0 ? "−" : "+"}
                    {formatVND(Math.abs(r.amount))}
                  </strong>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-slate-600">
                  <span>{r.purpose}</span>
                  <span>· {spotName(r.spot)}</span>
                  {r.bookingCode && <span>· #{r.bookingCode}</span>}
                  {r.flightDate && <span>· bay {formatDateKeyVN(r.flightDate)}</span>}
                  {r.code && <span>· GD {r.code}</span>}
                  {mb ? <MbVatTag issued={done} /> : <span className="rounded bg-slate-200 px-1 font-bold text-slate-700">BIDV</span>}
                </div>
                {mb && r.bookingId && (
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <label className="flex min-h-9 items-center gap-1.5 text-xs font-semibold text-slate-800">
                      <input
                        type="checkbox"
                        className="h-5 w-5 accent-emerald-600"
                        checked={done}
                        disabled={busy === r.key}
                        onChange={(e) => void tick(r, e.target.checked)}
                      />
                      Đã xuất VAT
                    </label>
                    <input
                      value={invoice[r.bookingId] ?? r.invoiceNo ?? ""}
                      onChange={(e) => setInvoice((m) => ({ ...m, [r.bookingId!]: e.target.value }))}
                      onBlur={() => {
                        const v = invoice[r.bookingId!];
                        if (r.vatIssued && v !== undefined && v !== (r.invoiceNo ?? "")) void tick(r, true);
                      }}
                      placeholder="Số HĐ"
                      className="h-9 w-32 rounded-lg border border-slate-300 px-2 text-xs"
                    />
                    {r.vatIssued && (r.vatAmount ?? 0) < (r.bookingMbTotal ?? 0) && (
                      <span className="text-[11px] font-bold text-red-700">
                        Xuất thiếu {formatVND((r.bookingMbTotal ?? 0) - (r.vatAmount ?? 0))} — tích lại sau khi xuất bổ sung
                      </span>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
