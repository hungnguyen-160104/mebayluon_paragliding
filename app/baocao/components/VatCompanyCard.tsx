// app/baocao/components/VatCompanyCard.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import { formatDateKeyVN } from "@/lib/baobay/date";
import { payAccountSpotEnabled } from "@/lib/baobay/pay-account";
import { formatVND } from "@/lib/pricing";
import type { VatRowDTO } from "@/services/pay-account.service";

import { apiGet, apiPatch } from "./client-api";
import { RevenueShareLine, type RevenueShare } from "./PayAccount";
import { Banner, Card } from "./ui";

/**
 * XUẤT VAT CUỐI NGÀY — TK CÔNG TY (chủ 04/10/2026).
 *
 * Mọi booking có tiền CHUYỂN KHOẢN về TK công ty MB 168858888 trong ngày (ngày
 * tiền về, không phải ngày bay): tên, SĐT, mã booking, số tiền về TK công ty,
 * từng dòng dịch vụ để gõ hoá đơn. Kế toán xuất xong thì tích "đã xuất VAT"
 * (+ số hoá đơn) — dấu tích lưu trên booking.
 *
 * Nút "Chép bảng" chép dạng TAB (dán thẳng vào Excel / phần mềm hoá đơn điện tử):
 * mỗi dòng dịch vụ một hàng, thông tin khách lặp lại ở từng hàng.
 */
export function VatCompanyCard({ spot, date }: { spot: string; date: string }) {
  const [rows, setRows] = useState<VatRowDTO[] | null>(null);
  /** Phần doanh thu TK công ty của NGÀY BAY đang xem (chủ 04/10: cân 30% doanh thu). */
  const [share, setShare] = useState<RevenueShare | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<Record<string, string>>({});
  const enabled = payAccountSpotEnabled(spot);

  const load = useCallback(() => {
    if (!enabled) return;
    setError(null);
    apiGet<{ rows: VatRowDTO[]; share: RevenueShare | null }>(`/api/baocao/vat?spot=${spot}&date=${date}`)
      .then((r) => {
        setRows(r.rows ?? []);
        setShare(r.share ?? null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Không tải được danh sách xuất VAT"));
  }, [spot, date, enabled]);

  useEffect(() => {
    setRows(null);
    load();
  }, [load]);

  if (!enabled) return null;

  async function tick(r: VatRowDTO, on: boolean) {
    setBusy(r.bookingId);
    setError(null);
    try {
      await apiPatch(`/api/baocao/vat?spot=${spot}`, {
        id: r.bookingId,
        on,
        invoiceNo: invoice[r.bookingId] ?? r.invoiceNo ?? "",
      });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được");
    } finally {
      setBusy(null);
    }
  }

  async function copyTable() {
    const head = [
      "Ngày tiền về",
      "Số TT",
      "Ngày bay",
      "Mã booking",
      "Tên khách",
      "SĐT",
      "Dịch vụ",
      "SL",
      "Đơn giá",
      "Thành tiền",
      "Tiền về TK cty (ngày)",
      "Tiền về TK cty (cả booking)",
      "Mã GD",
      "Đã xuất VAT",
      "Số HĐ",
    ];
    const out = [head.join("\t")];
    for (const r of rows ?? []) {
      const lines = r.lines.length ? r.lines : [{ label: "", qty: 0, unitPrice: 0, amount: 0 }];
      for (const l of lines) {
        out.push(
          [
            formatDateKeyVN(date),
            r.daySeq || "",
            formatDateKeyVN(r.flightDate),
            r.bookingCode,
            r.contactName,
            r.phone,
            l.label,
            l.qty || "",
            l.unitPrice || "",
            l.amount || "",
            r.amountDay,
            r.amountTotal,
            r.payments.map((p) => p.code).filter(Boolean).join(" "),
            r.issuedAt ? "x" : "",
            r.invoiceNo ?? "",
          ]
            .map((v) => String(v).replace(/\t|\n/g, " "))
            .join("\t"),
        );
      }
    }
    try {
      await navigator.clipboard.writeText(out.join("\n"));
      setMsg(`Đã chép ${out.length - 1} dòng — dán vào Excel / phần mềm hoá đơn.`);
    } catch {
      setError("Máy không cho chép tự động.");
    }
  }

  const list = rows ?? [];
  const pending = list.filter((r) => !r.issuedAt || (r.issuedAmount ?? 0) < r.amountTotal);
  const dayTotal = list.reduce((t, r) => t + r.amountDay, 0);

  return (
    <Card
      title={
        <span className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-red-600 px-1.5 text-[11px] font-extrabold text-white">TKCT</span>
          Xuất VAT cuối ngày — TK công ty
        </span>
      }
      hint={`Khách chuyển khoản vào MB 168858888 ngày ${formatDateKeyVN(date)} — tích “đã xuất VAT” sau khi lập hoá đơn.`}
    >
      <RevenueShareLine s={share} className="mb-2" />
      {error && <Banner tone="error">{error}</Banner>}
      {msg && (
        <Banner tone="success" onClose={() => setMsg(null)}>
          {msg}
        </Banner>
      )}
      {rows === null ? (
        <p className="text-xs text-slate-400">Đang tải…</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-slate-500">Ngày này chưa có khoản nào về TK công ty.</p>
      ) : (
        <>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>
              {list.length} booking · <strong className="tabular-nums">{formatVND(dayTotal)}</strong> về TK cty
              {pending.length > 0 ? (
                <span className="ml-1 font-bold text-red-700">· {pending.length} chưa xuất VAT</span>
              ) : (
                <span className="ml-1 font-bold text-emerald-700">· đã xuất hết ✓</span>
              )}
            </span>
            <button
              type="button"
              onClick={() => void copyTable()}
              className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              📋 Chép bảng (Excel / HĐĐT)
            </button>
          </div>
          <ul className="space-y-2">
            {list.map((r) => {
              const done = Boolean(r.issuedAt);
              const more = done && (r.issuedAmount ?? 0) < r.amountTotal;
              return (
                <li
                  key={r.bookingId}
                  className={
                    "rounded-xl border-2 px-2.5 py-2 " +
                    (done && !more ? "border-emerald-300 bg-emerald-50/50" : "border-red-300 bg-red-50/40")
                  }
                >
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <strong className="rounded bg-red-600 px-1.5 text-xs font-bold text-white">{r.daySeq || "?"}</strong>
                    <span className="min-w-0 font-semibold text-slate-900">{r.contactName || "khách"}</span>
                    <span className="text-xs tabular-nums text-slate-600">{r.phone}</span>
                    <span className="text-xs text-slate-500">
                      #{r.bookingCode || "—"} · bay {formatDateKeyVN(r.flightDate)}
                    </span>
                    <strong className="ml-auto tabular-nums text-red-700">{formatVND(r.amountDay)}</strong>
                  </div>
                  {r.amountTotal !== r.amountDay && (
                    <div className="text-[11px] text-slate-600">
                      Cả booking đã về TK cty: <strong className="tabular-nums">{formatVND(r.amountTotal)}</strong> (tổng
                      booking {formatVND(r.totalAmount)})
                    </div>
                  )}
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    CK: {r.payments.map((p) => `${formatVND(p.amount)}${p.code ? ` #${p.code}` : ""}`).join(" · ")}
                  </div>
                  <ul className="mt-1 space-y-px text-xs text-slate-700">
                    {r.lines.map((l, i) => (
                      <li key={i} className="flex justify-between gap-2">
                        <span className="min-w-0">
                          {l.label}
                          {l.qty > 1 || l.unitPrice > 0 ? (
                            <span className="text-slate-500">
                              {" "}
                              — {l.qty} × {formatVND(l.unitPrice)}
                            </span>
                          ) : null}
                        </span>
                        <span className={"shrink-0 tabular-nums " + (l.amount < 0 ? "text-rose-700" : "")}>
                          {formatVND(l.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <label className="flex min-h-9 items-center gap-1.5 text-sm font-semibold text-slate-800">
                      <input
                        type="checkbox"
                        className="h-5 w-5 accent-emerald-600"
                        checked={done && !more}
                        disabled={busy === r.bookingId}
                        onChange={(e) => void tick(r, e.target.checked)}
                      />
                      Đã xuất VAT
                    </label>
                    <input
                      value={invoice[r.bookingId] ?? r.invoiceNo ?? ""}
                      onChange={(e) => setInvoice((m) => ({ ...m, [r.bookingId]: e.target.value }))}
                      onBlur={() => {
                        const v = invoice[r.bookingId];
                        if (done && v !== undefined && v !== (r.invoiceNo ?? "")) void tick(r, true);
                      }}
                      placeholder="Số HĐ (tuỳ chọn)"
                      className="h-9 w-36 rounded-lg border border-slate-300 px-2 text-sm"
                    />
                    {done && (
                      <span className="text-[11px] text-slate-500">
                        {r.issuedBy} · {r.issuedAt ? new Date(r.issuedAt).toLocaleString("vi-VN") : ""}
                      </span>
                    )}
                    {more && (
                      <span className="w-full text-[11px] font-bold text-red-700">
                        ⚠ Tiền về thêm sau khi xuất ({formatVND(r.amountTotal - (r.issuedAmount ?? 0))}) — xuất bổ sung
                        rồi tích lại.
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Card>
  );
}
