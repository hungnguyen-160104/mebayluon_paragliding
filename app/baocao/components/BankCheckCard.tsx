// app/baocao/components/BankCheckCard.tsx
"use client";

import React, { useCallback, useEffect, useState } from "react";

import { formatDateKeyVN } from "@/lib/baobay/date";
import { SPOTS } from "@/lib/baobay/spots";
import { spotName } from "@/lib/baobay/spots";
import { formatVND } from "@/lib/pricing";

import { apiGet, apiPatch, apiPost } from "./client-api";
import { Banner, Button, Card, TextArea } from "./ui";

/**
 * MÁY SOÁT CHUYỂN KHOẢN trên trang kế toán.
 *
 * Kế toán dán nguyên tràng SMS banking / sao kê của ngày → máy bóc từng khoản
 * tiền VÀO rồi dò về đúng booking (mã GD → nội dung CK → số tiền). Khoản khớp
 * hiện XANH kèm căn cứ; khoản không tìm được chủ hiện ĐỎ và TREO lại — nhân
 * viên nhập booking xong thì bấm "Soát lại khoản treo" là tự tìm được chủ.
 *
 * Bảng dưới cùng đối chiếu NGƯỢC: app đã ghi bao nhiêu khoản CK trong ngày,
 * khoản nào sao kê chưa thấy tiền về — bắt được cả chiều "ghi khống/ghi nhầm".
 */

type LineDTO = {
  id: string;
  raw: string;
  amount: number;
  bankDate: string;
  bankTime: string;
  checkDate: string;
  status: "matched" | "pending" | "manual";
  matchLevel?: "code" | "note" | "amount" | "manual";
  matchWhy?: string;
  matchLabel?: string;
  matchSpot?: string;
  recorded?: boolean;
  candidates?: string[];
  resolvedNote?: string;
  resolvedBy?: string;
};

type AppTransferDTO = {
  refId: string;
  bookingId?: string;
  daySeq: number;
  label: string;
  amount: number;
  code: string;
  spot: string;
  source: string;
  seen: boolean;
  verified: boolean;
  locked: boolean;
};

type AppCashDTO = {
  refId: string;
  bookingId?: string;
  daySeq: number;
  label: string;
  amount: number;
  by: string;
  spot: string;
  verified: boolean;
  locked: boolean;
};

type GroupDTO = {
  label: string;
  parts: number[];
  total: number;
  expected: number;
  status: "du" | "thieu" | "thua";
};

type BookingRowDTO = {
  bookingId: string;
  daySeq: number;
  spot: string;
  label: string;
  summary: string;
  totalAmount: number;
  remaining: number;
  discount: number;
  overpaid: number;
  undoneChanges: number;
  note: string;
  agencyPaidAmount: number;
  agencyName: string;
  contactName: string;
  phone: string;
  bookingCode: string;
  flightDate: string;
  status: string;
  flown: boolean;
  ticketIssued: boolean;
  noTicket: boolean;
  locked: boolean;
  transfers: AppTransferDTO[];
  cash: AppCashDTO[];
  lines: LineDTO[];
  suggests: LineDTO[];
};

/** Một khoản CK còn chờ soát, gom từ MỌI ngày (không riêng ngày đang xem). */
type UncheckedDTO = {
  refId: string;
  kind: "collect" | "deposit" | "remaining";
  bookingId?: string;
  spot: string;
  label: string;
  flightDate: string;
  createdDate?: string;
  amount: number;
  code: string;
  recorded: boolean;
  matchedLine?: { id: string; raw: string; bankDate: string; why: string };
};

type Report = {
  date: string;
  spots: string[];
  lines: LineDTO[];
  pending: LineDTO[];
  appTransfers: AppTransferDTO[];
  appCash: AppCashDTO[];
  groups: GroupDTO[];
  bookingRows: BookingRowDTO[];
  unchecked: UncheckedDTO[];
  summary: {
    bankTotal: number;
    bankCount: number;
    appTotal: number;
    appCount: number;
    diffAmount: number;
    diffCount: number;
  };
  skipped: string[];
};

const LEVEL_BADGE: Record<string, { label: string; cls: string }> = {
  code: { label: "mã GD", cls: "bg-emerald-600 text-white" },
  note: { label: "nội dung", cls: "bg-emerald-500 text-white" },
  amount: { label: "số tiền", cls: "bg-amber-500 text-white" },
  manual: { label: "kiểm tay", cls: "bg-slate-500 text-white" },
};

/** Bỏ dấu + viết hoa để dò trùng — cùng công thức với máy khớp phía máy chủ. */
function ascii(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toUpperCase();
}

/**
 * TÔ SÁNG phần trùng trong dòng SMS: mã GD, "ddmm kN", tên khách, SĐT, số
 * tiền — kế toán nhìn phát thấy ngay VÌ SAO máy nói khớp, khỏi tự dò.
 */
function HighlightSms({ raw, row }: { raw: string; row: BookingRowDTO }) {
  const tokens: string[] = [];
  for (const t of row.transfers) if (t.code && t.code.length >= 3) tokens.push(t.code);
  if (row.flightDate && row.daySeq) {
    const dd = row.flightDate.slice(8, 10);
    const mm = row.flightDate.slice(5, 7);
    tokens.push(`${dd}${mm} k${row.daySeq}`, `${dd}${mm}k${row.daySeq}`, `${dd}/${mm} k${row.daySeq}`);
  }
  if (row.contactName.trim().length >= 6) tokens.push(row.contactName);
  if (row.bookingCode.trim().length >= 4) tokens.push(row.bookingCode);
  const phoneTail = row.phone.replace(/\D/g, "").slice(-9);
  if (phoneTail.length === 9) tokens.push(phoneTail);
  for (const amt of [
    ...row.transfers.map((t) => t.amount),
    ...row.lines.map((l) => l.amount),
    ...row.suggests.map((l) => l.amount),
  ]) {
    if (amt > 0) tokens.push(amt.toLocaleString("en-US"), amt.toLocaleString("vi-VN"), String(amt));
  }

  const hay = ascii(raw);
  /** Các đoạn [from,to) cần tô — gộp chồng lấn để render một lượt. */
  const spans: Array<[number, number]> = [];
  for (const tok of tokens) {
    const needle = ascii(tok);
    if (needle.length < 3) continue;
    let i = 0;
    while ((i = hay.indexOf(needle, i)) >= 0) {
      spans.push([i, i + needle.length]);
      i += needle.length;
    }
  }
  spans.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const sp of spans) {
    const last = merged[merged.length - 1];
    if (last && sp[0] <= last[1]) last[1] = Math.max(last[1], sp[1]);
    else merged.push([...sp] as [number, number]);
  }
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  merged.forEach(([a, b], i) => {
    if (a > cursor) parts.push(raw.slice(cursor, a));
    parts.push(
      <mark key={i} className="rounded bg-yellow-200 px-0.5 font-bold text-slate-900">
        {raw.slice(a, b)}
      </mark>,
    );
    cursor = b;
  });
  if (cursor < raw.length) parts.push(raw.slice(cursor));
  return <span className="break-all font-mono text-xs leading-relaxed text-slate-600">{parts}</span>;
}

export function BankCheckCard({ date }: { date: string }) {
  const [text, setText] = useState("");
  /** Soát theo điểm nào: chọn 1, 2 hay cả 3 — rỗng là cả ba (mặc định, tiền chung một TK). */
  const [spots, setSpots] = useState<string[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  /** Thẻ booking nào đang mở "Xem lại" (hiện nguyên văn SMS). */
  const [expanded, setExpanded] = useState<string[]>([]);
  /** Khoản thu đang chờ chọn booking để chuyển sang (ghi nhầm khách). */
  const [moving, setMoving] = useState<{ refId: string; spot: string; label: string; amount: number } | null>(null);
  /**
   * SOÁT TRÀN — mọi mã CK chưa "đã nhận", bất kể ngày. Gập sẵn vì danh sách này
   * dài (hàng trăm khoản); kế toán mở ra khi muốn làm cho hết chứ không phải
   * thứ nhìn hằng ngày.
   */
  const [allOpen, setAllOpen] = useState(false);
  const [allFilter, setAllFilter] = useState<"all" | "hasLine" | "noCode">("all");

  const load = useCallback(() => {
    apiGet<Report>(`/api/baocao/bank-check?date=${date}&spots=${spots.join(",")}`)
      .then(setReport)
      .catch(() => {
        /* chưa soát ngày nào thì bảng trống, không phải lỗi */
      });
  }, [date, spots]);

  useEffect(() => {
    load();
  }, [load]);

  async function run() {
    if (!text.trim()) return setError("Dán nội dung SMS banking / sao kê vào ô trên đã");
    setBusy(true);
    setError(null);
    try {
      setReport(await apiPost<Report>(`/api/baocao/bank-check`, { date, text, spots }));
      setText("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không soát được sao kê");
    } finally {
      setBusy(false);
    }
  }

  async function recheck() {
    setBusy(true);
    setError(null);
    try {
      setReport(await apiPatch<Report>(`/api/baocao/bank-check`, { action: "recheck", date, spots }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không soát lại được");
    } finally {
      setBusy(false);
    }
  }

  /**
   * "ĐÃ NHẬN" một khoản — lệnh QUYỀN CAO NHẤT của kế toán: khoản này coi như
   * soát xong, khỏi cần sao kê xác nhận nữa. KHÔNG khoá booking (khách cọc
   * cho ngày tương lai thì điều phối còn phải thao tác tiếp); khoá là nút riêng.
   */
  async function confirmItem(refId: string, on: boolean) {
    if (!on && !window.confirm("Bỏ đánh dấu ĐÃ NHẬN khoản này?")) return;
    setRowBusy(refId);
    setError(null);
    try {
      await apiPatch(`/api/baocao/bank-check`, { action: "confirm", refId, on });
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không đánh dấu được");
    } finally {
      setRowBusy(null);
    }
  }

  /**
   * "ĐÚNG — KHOÁ BOOKING": tiền đã soát khớp thì khoá sổ booking bằng đúng
   * cơ chế 🔒 sẵn có của kế toán — mọi cửa sửa (thu tiền, sửa số, tích bay)
   * đều bị chặn, trên trang điều phối booking hiện ✓🔒. Mở lại thì vào sổ
   * booking bấm "Mở khoá" như thường lệ.
   */
  async function lockBooking(t: { refId: string; bookingId?: string; label: string; spot: string }) {
    if (!t.bookingId) return;
    setRowBusy(t.refId);
    setError(null);
    try {
      /**
       * Máy chủ tự kiểm: ĐÃ BAY + hết nợ + mọi khoản đã "Đã nhận" → khoá NGAY
       * không hỏi. Thiếu điều nào thì liệt kê ra và vẫn chừa đường
       * "Tôi hiểu & vẫn khoá booking" — quyền quyết cuối cùng là của kế toán.
       */
      const r = await apiPatch<{ locked: boolean; warnings: string[] }>(`/api/baocao/bank-check`, {
        action: "lock-booking",
        bookingId: t.bookingId,
      });
      if (!r.locked) {
        const msg =
          `⚠ ${t.label} CHƯA ĐỦ CHUẨN ĐỂ KHOÁ:\n\n` +
          r.warnings.map((w) => `• ${w}`).join("\n") +
          `\n\nTôi hiểu & vẫn khoá booking?`;
        if (!window.confirm(msg)) return;
        await apiPatch(`/api/baocao/bank-check`, { action: "lock-booking", bookingId: t.bookingId, force: true });
      }
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không khoá được booking");
    } finally {
      setRowBusy(null);
    }
  }

  /** "ĐÃ NHẬN ĐỦ": đánh dấu đã nhận MỌI khoản chưa tích của một booking. */
  async function confirmAllOf(row: BookingRowDTO) {
    const refs = [...row.transfers, ...row.cash].filter((x) => !x.verified).map((x) => x.refId);
    if (!refs.length) return;
    setRowBusy(row.bookingId);
    setError(null);
    try {
      for (const refId of refs) {
        await apiPatch(`/api/baocao/bank-check`, { action: "confirm", refId, on: true });
      }
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không đánh dấu được");
    } finally {
      setRowBusy(null);
    }
  }

  /** Kế toán chỉ định dòng sao kê thuộc khoản nào — máy chịu thì người chỉ. */
  async function assignLine(id: string, refId: string, d: string) {
    setRowBusy(id);
    setError(null);
    try {
      await apiPatch(`/api/baocao/bank-check`, { action: "assign", id, refId, date: d });
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không chỉ định được");
    } finally {
      setRowBusy(null);
    }
  }

  /**
   * SỬA / XOÁ / CHUYỂN một khoản thu ngay tại màn soát.
   *
   * Nhân viên ghi nhầm mã CK sang booking khác là chuyện xảy ra thật (21/08:
   * một mã 9476 nằm ở hai booking). Trước đây kế toán phát hiện ở đây nhưng
   * phải sang trang điều phối, tìm đúng dòng, mở menu ⋯ mới sửa được — nên
   * hay để đó rồi quên. Nay xử ngay tại chỗ nhìn thấy lỗi.
   */
  async function editCollect(
    refId: string,
    /** Điểm bay của chính booking đó — KHÔNG dùng bộ lọc `spots` (có thể rỗng = mọi điểm). */
    rowSpot: string,
    patch: { amount?: number; transferCode?: string; remove?: boolean; moveTo?: string },
  ) {
    const collectId = refId.startsWith("collect:") ? refId.slice("collect:".length) : "";
    if (!collectId) {
      setError("Khoản cọc gõ tay lúc nhập booking — sửa trong sổ booking, không sửa ở đây");
      return;
    }
    setRowBusy(refId);
    setError(null);
    try {
      await apiPatch(`/api/baocao/booking/collect?spot=${rowSpot}`, { id: collectId, ...patch });
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không sửa được khoản thu");
    } finally {
      setRowBusy(null);
    }
  }

  async function act(id: string, action: "resolve" | "delete") {
    let note = "";
    if (action === "resolve") {
      note = window.prompt("Kết luận của bạn về khoản này (VD: tiền của đối tác X, không phải khách bay)") ?? "";
      if (!note.trim()) return;
    } else if (!window.confirm("Xoá dòng này khỏi bảng soát? (chỉ xoá dòng dán nhầm)")) {
      return;
    }
    setRowBusy(id);
    setError(null);
    try {
      await apiPatch(`/api/baocao/bank-check`, { action, id, note });
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không xử lý được khoản này");
    } finally {
      setRowBusy(null);
    }
  }

  const lines = report?.lines ?? [];
  const matched = lines.filter((l) => l.status !== "pending");
  const unmatched = lines.filter((l) => l.status === "pending");
  const appTransfers = report?.appTransfers ?? [];
  const pendingOld = report?.pending ?? [];

  return (
    <Card title="🏦 Soát chuyển khoản" hint="dán SMS banking / sao kê — máy dò từng khoản về đúng booking">
      {/* Soát dữ liệu điểm nào — tích 1, 2 hay cả 3 điểm; tích hết (hoặc chưa
          tích gì) tự hiểu là soát mọi điểm, khỏi cần nút riêng */}
      <div className="mb-2 flex h-9 w-fit overflow-hidden rounded-lg border border-slate-300">
        {SPOTS.map((x, i) => {
          const on = spots.includes(x.id);
          return (
            <button
              key={x.id}
              type="button"
              onClick={() => setSpots((p) => (on ? p.filter((v) => v !== x.id) : [...p, x.id]))}
              className={
                (i > 0 ? "border-l border-slate-300 " : "") +
                (on
                  ? "bg-sky-600 px-3 text-xs font-bold text-white"
                  : "bg-white px-3 text-xs font-medium text-slate-500")
              }
            >
              {on ? "✓ " : ""}
              {x.name}
            </button>
          );
        })}
      </div>
      <TextArea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Dán mỗi khoản một dòng (dán cả tràng SMS cũng được), ví dụ:\nTK 887xxx9685 tai BIDV +2,590,000VND vao 12:09 18/08/2026. ND: NGUYEN TRAN PHUONG THAO chuyen tien`}
        className="min-h-28 font-mono text-xs"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button type="button" className="h-10 bg-sky-600 px-4 hover:bg-sky-700" disabled={busy} onClick={run}>
          {busy ? "Đang soát…" : "🔍 Soát sao kê"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-10 bg-white px-3 text-sm"
          disabled={busy || (unmatched.length === 0 && pendingOld.length === 0)}
          onClick={recheck}
          title="Nhân viên vừa nhập thêm booking? Bấm để các khoản treo tự dò lại"
        >
          ↻ Soát lại khoản treo
        </Button>
        {lines.length > 0 && (
          <span className="text-xs font-semibold text-slate-600">
            Sao kê ngày {formatDateKeyVN(date)}: {lines.length} khoản ={" "}
            <span className="tabular-nums">{formatVND(lines.reduce((t, l) => t + l.amount, 0))}</span> ·{" "}
            <span className="text-emerald-700">{matched.length} khớp</span>
            {unmatched.length > 0 && <span className="text-rose-700"> · {unmatched.length} chưa khớp</span>}
          </span>
        )}
      </div>

      {error && (
        <div className="mt-2">
          <Banner tone="error">{error}</Banner>
        </div>
      )}
      {(report?.skipped ?? []).length > 0 && (
        <ul className="mt-2 space-y-0.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          {report!.skipped.map((s, i) => (
            <li key={i} className="text-[11px] text-slate-500">
              ⤷ {s}
            </li>
          ))}
        </ul>
      )}

      {/* ---- ĐỐI CHIẾU TỔNG: sao kê ↔ app, lệch đồng nào khoản nào báo ngay ---- */}
      {report && (lines.length > 0 || appTransfers.length > 0) && (
        <div
          className={
            "mt-3 rounded-xl border-2 p-2.5 " +
            (report.summary.diffAmount === 0 && report.summary.diffCount === 0
              ? "border-emerald-300 bg-emerald-50/60"
              : "border-rose-300 bg-rose-50/60")
          }
        >
          <div className="grid grid-cols-2 gap-2 text-xs @md:grid-cols-4">
            <div>
              <div className="text-slate-500">Sao kê (tiền vào)</div>
              <div className="font-bold tabular-nums text-slate-900">
                {report.summary.bankCount} khoản · {formatVND(report.summary.bankTotal)}
              </div>
            </div>
            <div>
              <div className="text-slate-500">App ghi nhận</div>
              <div className="font-bold tabular-nums text-slate-900">
                {report.summary.appCount} khoản · {formatVND(report.summary.appTotal)}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Lệch tiền</div>
              <div
                className={
                  "font-bold tabular-nums " +
                  (report.summary.diffAmount === 0 ? "text-emerald-700" : "text-rose-700")
                }
              >
                {report.summary.diffAmount === 0
                  ? "✓ khớp"
                  : `${report.summary.diffAmount > 0 ? "+" : "−"}${formatVND(Math.abs(report.summary.diffAmount))}`}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Lệch số khoản</div>
              <div
                className={
                  "font-bold tabular-nums " + (report.summary.diffCount === 0 ? "text-emerald-700" : "text-rose-700")
                }
              >
                {report.summary.diffCount === 0
                  ? "✓ khớp"
                  : `${report.summary.diffCount > 0 ? "+" : ""}${report.summary.diffCount} khoản`}
              </div>
            </div>
          </div>
          {(report.summary.diffAmount !== 0 || report.summary.diffCount !== 0) && (
            <p className="mt-1.5 text-[11px] leading-tight text-rose-800/80">
              Sao kê nhiều hơn app: có tiền về chưa ai ghi thu (xem khoản treo/khớp-chưa-ghi bên dưới). App nhiều
              hơn sao kê: có khoản ghi trong app mà tiền chưa thấy về — dò mục ✗ đỏ cuối bảng.
            </p>
          )}
        </div>
      )}

      {/* CHUYỂN KHOẢN THU SANG BOOKING KHÁC — chọn đúng chủ trong danh sách
          booking của ngày; khoản tiền giữ nguyên mã GD và người thu. */}
      {moving && (
        <div className="mt-3 rounded-xl border-2 border-sky-400 bg-sky-50/70 p-3">
          <div className="text-sm font-bold text-sky-900">
            Chuyển {formatVND(moving.amount)} khỏi {moving.label} — chọn booking ĐÚNG:
          </div>
          <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
            {(report?.bookingRows ?? [])
              .filter((r) => r.bookingId !== (report?.bookingRows ?? []).find((x) => x.label === moving.label)?.bookingId)
              .map((r) => (
                <button
                  key={r.bookingId}
                  type="button"
                  disabled={rowBusy === moving.refId}
                  onClick={() => {
                    if (!window.confirm(`Chuyển ${formatVND(moving.amount)} sang ${r.label}?`)) return;
                    editCollect(moving.refId, moving.spot, { moveTo: r.bookingId });
                    setMoving(null);
                  }}
                  className={
                    "flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs hover:bg-white " +
                    (r.remaining === moving.amount
                      ? "border-emerald-400 bg-emerald-50 font-semibold"
                      : "border-slate-200 bg-white/70")
                  }
                >
                  <span className="min-w-0 flex-1 truncate">{r.label}</span>
                  <span className="shrink-0 tabular-nums text-slate-500">
                    còn thu {formatVND(r.remaining)}
                  </span>
                  {r.remaining === moving.amount && (
                    <span className="shrink-0 text-[10px] font-bold text-emerald-700">= đúng số</span>
                  )}
                </button>
              ))}
          </div>
          <button
            type="button"
            onClick={() => setMoving(null)}
            className="mt-2 rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
          >
            Thôi
          </button>
        </div>
      )}

      {/* ================= SỔ BOOKING & TIỀN TRONG NGÀY =================
          Mỗi booking MỘT THẺ: tóm tắt dịch vụ + từng khoản TM/CK + các dòng
          sao kê khớp (hoặc nghi) nằm ngay bên dưới — soát theo từng khách,
          không phải nhảy qua lại giữa ba danh sách như trước. */}
      {/* SOÁT TRÀN: mọi mã CK của booking chưa khoá mà kế toán chưa tích "đã
          nhận" — gom từ MỌI ngày. Làm hết danh sách này là hết việc đối soát,
          thay vì phải nhớ mở lại từng ngày một. */}
      {(report?.unchecked ?? []).length > 0 && (
        <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50/60">
          <button
            type="button"
            onClick={() => setAllOpen((v) => !v)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left"
          >
            <span className="text-xs font-bold text-amber-900">
              📋 Mọi mã CK chưa soát ({report!.unchecked.length}) — không theo ngày
            </span>
            <span className="flex-1" />
            <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-amber-900">
              {allOpen ? "Thu gọn" : "Mở ra"}
            </span>
          </button>

          {allOpen && (
            <div className="px-3 pb-3">
              <div className="mb-2 flex flex-wrap gap-1">
                {(
                  [
                    ["all", `Tất cả (${report!.unchecked.length})`],
                    ["hasLine", `Đã có dòng sao kê (${report!.unchecked.filter((u) => u.matchedLine).length})`],
                    ["noCode", `Chưa ghi mã GD (${report!.unchecked.filter((u) => !u.code).length})`],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setAllFilter(k)}
                    className={
                      "rounded-lg border px-2 py-1 text-[11px] font-semibold " +
                      (allFilter === k ? "border-amber-600 bg-amber-600 text-white" : "border-amber-300 bg-white text-amber-900")
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>

              <ul className="space-y-1">
                {report!.unchecked
                  .filter((u) => (allFilter === "hasLine" ? u.matchedLine : allFilter === "noCode" ? !u.code : true))
                  .slice(0, 80)
                  .map((u) => (
                    <li key={u.refId} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-xs font-semibold text-slate-800">{u.label}</span>
                        <span className="text-[11px] text-slate-500">
                          bay {u.flightDate || "—"}
                          {u.createdDate ? ` · lập ${u.createdDate}` : ""}
                        </span>
                        <span className="text-xs font-bold tabular-nums text-slate-900">{formatVND(u.amount)}</span>
                        {u.code ? (
                          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[11px] font-bold text-rose-700">
                            mã {u.code}
                          </span>
                        ) : (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">chưa ghi mã GD</span>
                        )}
                        {!u.recorded && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">
                            mới là “còn phải thu”
                          </span>
                        )}
                        <span className="flex-1" />
                        <button
                          type="button"
                          disabled={rowBusy === u.refId || !u.recorded}
                          onClick={() => confirmItem(u.refId, true)}
                          title={u.recorded ? "Đánh dấu đã nhận" : "Chưa có lệnh thu — không đánh dấu được"}
                          className="h-7 shrink-0 rounded-lg border border-emerald-400 bg-white px-2 text-[11px] font-bold text-emerald-700 disabled:opacity-40"
                        >
                          Đã nhận
                        </button>
                      </div>
                      {u.matchedLine && (
                        <div className="mt-1 rounded bg-sky-50 px-2 py-1 text-[11px] leading-tight text-sky-900">
                          ↳ sao kê {u.matchedLine.bankDate}: {u.matchedLine.raw.slice(0, 110)}
                          {u.matchedLine.why ? ` — ${u.matchedLine.why}` : ""}
                        </div>
                      )}
                    </li>
                  ))}
              </ul>
              {report!.unchecked.filter((u) => (allFilter === "hasLine" ? u.matchedLine : allFilter === "noCode" ? !u.code : true)).length >
                80 && (
                <p className="mt-1 text-[11px] text-slate-500">
                  … còn nữa, làm bớt rồi tải lại để xem tiếp (đang hiện 80 khoản đầu).
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {(report?.bookingRows ?? []).length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="text-xs font-bold text-slate-700">
            📒 Sổ booking &amp; tiền trong ngày ({report!.bookingRows.length} booking)
          </div>
          {report!.bookingRows.map((row) => {
            const paidCk = row.transfers.reduce((t, x) => t + x.amount, 0);
            const paidTm = row.cash.reduce((t, x) => t + x.amount, 0);
            const allVerified =
              [...row.transfers, ...row.cash].length > 0 &&
              [...row.transfers, ...row.cash].every((x) => x.verified);
            // Mặc định MỞ — SMS phải đập vào mắt; bấm Thu gọn thì chỉ còn dòng tóm tắt
            const collapsed = expanded.includes(row.bookingId);
            return (
              <div
                key={row.bookingId}
                className={
                  "rounded-xl border p-2.5 " +
                  (row.locked
                    ? "border-slate-300 bg-slate-50"
                    : allVerified
                      ? "border-emerald-300 bg-emerald-50/40"
                      : "border-slate-200 bg-white")
                }
              >
                {/* dòng tóm tắt: #6 · tên · ngày bay — dịch vụ — tiền */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="min-w-0 font-bold text-slate-900">{row.label}</span>
                  {/* SĐT + mã booking đứng ngay đầu thẻ — hai thứ kế toán dò trong SMS */}
                  {row.phone && (
                    <strong className="rounded bg-amber-100 px-1 text-xs font-bold tabular-nums text-amber-900">
                      📞 {row.phone}
                    </strong>
                  )}
                  {/* Mã booking bỏ trống thì hệ lấy luôn SĐT làm mã — in đúp vô nghĩa */}
                  {row.bookingCode && row.bookingCode !== row.phone && (
                    <strong className="rounded bg-sky-100 px-1 text-xs font-bold text-sky-900">
                      mã {row.bookingCode}
                    </strong>
                  )}
                  <span className="text-xs text-slate-500">{row.summary}</span>
                  {row.flown && (
                    <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">đã bay</span>
                  )}
                  {row.ticketIssued && (
                    <span className="rounded bg-sky-600 px-1.5 py-0.5 text-[10px] font-bold text-white">đã xuất vé</span>
                  )}
                  {row.noTicket && (
                    <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">không vé</span>
                  )}
                  {row.status === "cancelled" && (
                    <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">đã huỷ</span>
                  )}
                  {row.locked && (
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-white">🔒 đã khoá</span>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs tabular-nums">
                  {paidCk > 0 && <span className="text-sky-800">đã CK <strong>{formatVND(paidCk)}</strong></span>}
                  {paidTm > 0 && <span className="text-emerald-800">đã TM <strong>{formatVND(paidTm)}</strong></span>}
                  {row.agencyPaidAmount > 0 && (
                    <span
                      className="rounded bg-orange-100 px-1 font-semibold text-orange-800"
                      title="Đại lý THU HỘ tiền bay — tiền đang nằm ở đại lý, phải đòi về (không phải chiết khấu)"
                    >
                      ĐL đã thu <strong>{formatVND(row.agencyPaidAmount)}</strong>
                      {row.agencyName ? ` (${row.agencyName})` : ""} — thu hộ
                    </span>
                  )}
                  {row.discount > 0 && <span className="text-violet-700">giảm trừ {formatVND(row.discount)}</span>}
                  <span className={row.remaining > 0 ? "font-bold text-rose-700" : "text-emerald-700"}>
                    {row.remaining > 0 ? `còn thu ${formatVND(row.remaining)}` : "✓ hết nợ"}
                  </span>
                  <span className="text-slate-400">tổng {formatVND(row.totalAmount)}</span>
                </div>
                {/* Thu đủ toàn tiền mặt: nói thẳng để kế toán khỏi đợi sao kê nào cả */}
                {row.remaining <= 0 && paidTm > 0 && row.transfers.length === 0 && (
                  <div className="mt-1 w-fit rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                    💵 Đã thu đủ bằng TIỀN MẶT — không cần soát sao kê
                  </div>
                )}
                {/* LỆCH TIỀN sau khi ai đó sửa/bỏ lệnh dịch vụ — kế toán phải bù hoặc hoàn */}
                {row.overpaid > 0 && (
                  <div className="mt-1 rounded-lg border-2 border-rose-400 bg-rose-50 px-2 py-1 text-xs font-bold text-rose-800">
                    ⚠ THU THỪA {formatVND(row.overpaid)} — khách đã trả nhiều hơn tổng phải trả. Kiểm lại lệnh
                    thêm/bớt dịch vụ rồi bù hoặc hoàn cho khách.
                  </div>
                )}
                {row.undoneChanges > 0 && (
                  <div className="mt-1 text-[11px] font-semibold text-amber-700">
                    🕵 Booking này có {row.undoneChanges} lệnh dịch vụ ĐÃ BỊ BỎ — xem ghi chú bên dưới để soát
                  </div>
                )}
                {row.note && (
                  <div className="mt-1 text-[11px] italic text-slate-500">📝 {row.note}</div>
                )}

                {/* từng khoản tiền của booking */}
                {!collapsed && (
                <ul className="mt-1.5 space-y-0.5">
                  {row.transfers.map((t) => (
                    <li key={t.refId} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                      {t.seen ? (
                        <span className="shrink-0 font-bold text-emerald-600">✓</span>
                      ) : (
                        <span className="shrink-0 font-bold text-rose-600">✗</span>
                      )}
                      <span className="min-w-0 flex-1 text-slate-600">
                        CK {t.source}
                        {t.code ? (
                          <>
                            {" · mã GD "}
                            <strong className="rounded bg-rose-100 px-0.5 font-bold text-rose-700">{t.code}</strong>
                          </>
                        ) : (
                          ""
                        )}
                        {!t.seen && !t.verified && (
                          <span className="ml-1 rounded bg-rose-100 px-1 py-0.5 text-[10px] font-semibold text-rose-800">
                            sao kê chưa thấy
                          </span>
                        )}
                      </span>
                      <strong className="shrink-0 tabular-nums">{formatVND(t.amount)}</strong>
                      <button
                        type="button"
                        disabled={rowBusy === t.refId}
                        onClick={() => confirmItem(t.refId, !t.verified)}
                        className={
                          "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold disabled:opacity-50 " +
                          (t.verified
                            ? "bg-emerald-700 text-white"
                            : "border border-emerald-400 bg-emerald-50 text-emerald-800 hover:bg-emerald-100")
                        }
                      >
                        {t.verified ? "✓ đã nhận" : "Đã nhận"}
                      </button>
                      {/* SỬA ngay tại chỗ: đổi mã GD / số tiền, xoá, hoặc chuyển
                          sang đúng booking nếu nhân viên ghi nhầm khách */}
                      <span className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          disabled={rowBusy === t.refId}
                          title="Sửa mã giao dịch hoặc số tiền"
                          onClick={() => {
                            const code = window.prompt("Mã giao dịch (để trống nếu không đổi):", t.code ?? "");
                            if (code === null) return;
                            const raw = window.prompt("Số tiền (đ):", String(t.amount));
                            if (raw === null) return;
                            const amount = Number(raw.replace(/\D/g, ""));
                            if (!amount) return setError("Số tiền phải lớn hơn 0");
                            editCollect(t.refId, row.spot, { amount, transferCode: code });
                          }}
                          className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 disabled:opacity-50"
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          disabled={rowBusy === t.refId}
                          title="Ghi nhầm sang khách này — chuyển khoản tiền sang đúng booking"
                          onClick={() => setMoving({ refId: t.refId, spot: row.spot, label: row.label, amount: t.amount })}
                          className="rounded border border-sky-300 bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 disabled:opacity-50"
                        >
                          ⇄
                        </button>
                        <button
                          type="button"
                          disabled={rowBusy === t.refId}
                          title="Xoá hẳn khoản thu này khỏi sổ"
                          onClick={() => {
                            if (!window.confirm(`Xoá khoản ${formatVND(t.amount)} khỏi ${row.label}?`)) return;
                            editCollect(t.refId, row.spot, { remove: true });
                          }}
                          className="rounded border border-rose-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 disabled:opacity-50"
                        >
                          ✕
                        </button>
                      </span>
                    </li>
                  ))}
                  {row.cash.map((t) => (
                    <li key={t.refId} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                      <span className="shrink-0">💵</span>
                      <span className="min-w-0 flex-1 text-slate-600">TM · {t.by} đang giữ</span>
                      <strong className="shrink-0 tabular-nums">{formatVND(t.amount)}</strong>
                      <button
                        type="button"
                        disabled={rowBusy === t.refId}
                        onClick={() => confirmItem(t.refId, !t.verified)}
                        className={
                          "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold disabled:opacity-50 " +
                          (t.verified
                            ? "bg-emerald-700 text-white"
                            : "border border-emerald-400 bg-emerald-50 text-emerald-800 hover:bg-emerald-100")
                        }
                      >
                        {t.verified ? "✓ đã nhận" : "Đã nhận"}
                      </button>
                      {/* SỬA ngay tại chỗ: đổi mã GD / số tiền, xoá, hoặc chuyển
                          sang đúng booking nếu nhân viên ghi nhầm khách */}
                      <span className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          disabled={rowBusy === t.refId}
                          title="Sửa mã giao dịch hoặc số tiền"
                          onClick={() => {
                            const raw = window.prompt("Số tiền tiền mặt (đ):", String(t.amount));
                            if (raw === null) return;
                            const amount = Number(raw.replace(/\D/g, ""));
                            if (!amount) return setError("Số tiền phải lớn hơn 0");
                            editCollect(t.refId, row.spot, { amount });
                          }}
                          className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 disabled:opacity-50"
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          disabled={rowBusy === t.refId}
                          title="Ghi nhầm sang khách này — chuyển khoản tiền sang đúng booking"
                          onClick={() => setMoving({ refId: t.refId, spot: row.spot, label: row.label, amount: t.amount })}
                          className="rounded border border-sky-300 bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 disabled:opacity-50"
                        >
                          ⇄
                        </button>
                        <button
                          type="button"
                          disabled={rowBusy === t.refId}
                          title="Xoá hẳn khoản thu này khỏi sổ"
                          onClick={() => {
                            if (!window.confirm(`Xoá khoản ${formatVND(t.amount)} khỏi ${row.label}?`)) return;
                            editCollect(t.refId, row.spot, { remove: true });
                          }}
                          className="rounded border border-rose-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 disabled:opacity-50"
                        >
                          ✕
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
                )}

                {/* SMS khớp / nghi ngờ — nằm ngay dưới booking để soát hai luồng cạnh nhau */}
                {!collapsed && (row.lines.length > 0 || row.suggests.length > 0) && (
                  <ul className="mt-1.5 space-y-0.5 border-t border-slate-100 pt-1.5">
                    {row.lines.map((l) => (
                      <li key={l.id} className="rounded bg-emerald-50/70 px-2 py-1.5">
                        <div className="text-xs font-semibold text-emerald-800">
                          🧾 +{l.amount.toLocaleString("vi-VN")}đ · {l.bankTime || l.bankDate} · khớp: {l.matchWhy || "đã kiểm tay"}
                        </div>
                        <div className="mt-0.5">
                          <HighlightSms raw={l.raw} row={row} />
                        </div>
                      </li>
                    ))}
                    {row.suggests.map((l) => (
                      <li key={l.id} className="rounded bg-amber-50 px-2 py-1.5">
                        <div className="text-xs font-bold text-amber-900">
                          ❓ +{l.amount.toLocaleString("vi-VN")}đ · {l.bankTime || l.bankDate} · máy NGHI của booking này — {l.matchWhy}
                          <button
                            type="button"
                            disabled={rowBusy === l.id}
                            onClick={() => act(l.id, "resolve")}
                            className="ml-2 rounded border border-amber-400 bg-white px-1.5 py-0.5 text-[10px] font-bold text-amber-800"
                          >
                            ✓ Đã kiểm tay
                          </button>
                        </div>
                        <div className="mt-0.5">
                          <HighlightSms raw={l.raw} row={row} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {/* ba nút của thẻ */}
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {!allVerified && [...row.transfers, ...row.cash].length > 0 && (
                    <button
                      type="button"
                      disabled={rowBusy === row.bookingId}
                      onClick={() => confirmAllOf(row)}
                      className="rounded-lg border border-emerald-500 bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      ✓ Đã nhận đủ
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded((p) =>
                        p.includes(row.bookingId) ? p.filter((x) => x !== row.bookingId) : [...p, row.bookingId],
                      )
                    }
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
                  >
                    {collapsed ? "Xem lại" : "Thu gọn"}
                  </button>
                  {!row.locked && (
                    <button
                      type="button"
                      disabled={rowBusy === row.bookingId}
                      onClick={() =>
                        lockBooking({ refId: row.bookingId, bookingId: row.bookingId, label: row.label, spot: row.spot })
                      }
                      className="rounded-lg border border-slate-400 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                    >
                      🔒 Khoá booking
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---- SMS CHƯA KHỚP AI (không nghi cho booking nào ở trên) ---- */}
      {(() => {
        const suggestedIds = new Set((report?.bookingRows ?? []).flatMap((r) => r.suggests.map((l) => l.id)));
        const orphanPending = unmatched.filter((l) => !suggestedIds.has(l.id));
        const orphanMatched = matched.filter(
          (l) => !(report?.bookingRows ?? []).some((r) => r.lines.some((x) => x.id === l.id)),
        );
        if (!orphanPending.length && !orphanMatched.length) return null;
        return (
          <div className="mt-3">
            {orphanMatched.length > 0 && (
              <>
                <div className="text-xs font-bold text-slate-700">SMS đã khớp (khoản không gắn booking)</div>
                <ul className="mt-1 space-y-1.5">
                  {orphanMatched.map((l) => (
                    <BankLineRow key={l.id} line={l} busy={rowBusy === l.id} onAct={act} onAssign={assignLine} />
                  ))}
                </ul>
              </>
            )}
            {orphanPending.length > 0 && (
              <>
                <div className="mt-2 text-xs font-bold text-rose-800">SMS chưa khớp ai — kiểm tay</div>
                <ul className="mt-1 space-y-1.5">
                  {orphanPending.map((l) => (
                    <BankLineRow key={l.id} line={l} busy={rowBusy === l.id} onAct={act} onAssign={assignLine} />
                  ))}
                </ul>
              </>
            )}
          </div>
        );
      })()}

      {/* ---- KHOẢN TREO các ngày trước — chưa tìm được chủ ---- */}
      {pendingOld.length > 0 && (
        <div className="mt-3 rounded-xl border-2 border-rose-300 bg-rose-50/60 p-2">
          <div className="text-xs font-bold text-rose-900">
            ⚠ {pendingOld.length} khoản treo từ ngày khác — chưa biết của booking nào
          </div>
          <ul className="mt-1.5 space-y-1.5">
            {pendingOld.map((l) => (
              <BankLineRow key={l.id} line={l} busy={rowBusy === l.id} onAct={act} onAssign={assignLine} showDate />
            ))}
          </ul>
        </div>
      )}

      {/* ---- Khoản app ghi mà KHÔNG gắn booking nào (hiếm — lệnh thu gõ tay) ---- */}
      {(() => {
        const strayT = appTransfers.filter((t) => !t.bookingId);
        const strayC = (report?.appCash ?? []).filter((t) => !t.bookingId);
        if (!strayT.length && !strayC.length) return null;
        return (
          <div className="mt-3">
            <div className="text-xs font-bold text-slate-700">Khoản không gắn booking</div>
            <ul className="mt-1 divide-y divide-slate-100">
              {[...strayT, ...strayC].map((t: any) => (
                <li key={t.refId} className="flex flex-wrap items-center gap-x-2 py-1 text-xs">
                  <span className="min-w-0 flex-1 text-slate-700">{t.label}</span>
                  <strong className="shrink-0 tabular-nums">{formatVND(t.amount)}</strong>
                  <button
                    type="button"
                    disabled={rowBusy === t.refId}
                    onClick={() => confirmItem(t.refId, !t.verified)}
                    className={
                      "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold disabled:opacity-50 " +
                      (t.verified
                        ? "bg-emerald-700 text-white"
                        : "border border-emerald-400 bg-emerald-50 text-emerald-800 hover:bg-emerald-100")
                    }
                  >
                    {t.verified ? "✓ đã nhận" : "Đã nhận"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })()}

      {lines.length === 0 && pendingOld.length === 0 && appTransfers.length === 0 && (
        <p className="mt-2 text-xs text-slate-500">
          Chưa soát khoản nào cho ngày {formatDateKeyVN(date)} — dán sao kê vào ô trên rồi bấm Soát.
        </p>
      )}
    </Card>
  );
}

function BankLineRow({
  line,
  busy,
  onAct,
  onAssign,
  showDate,
}: {
  line: LineDTO;
  busy: boolean;
  onAct: (id: string, action: "resolve" | "delete") => void;
  /** Kế toán chỉ định dòng này thuộc khoản nào (chọn ngày + khoản). */
  onAssign?: (id: string, refId: string, date: string) => Promise<void>;
  showDate?: boolean;
}) {
  const ok = line.status !== "pending";
  /**
   * PANEL CHỈ ĐỊNH: máy chịu thì người chỉ — chọn ngày, tải danh sách khoản
   * của ngày đó rồi bấm khoản đúng. Chỉ mở khi kế toán bấm nút.
   */
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignDate, setAssignDate] = useState(line.bankDate || line.checkDate);
  const [options, setOptions] = useState<Array<{ refId: string; label: string; amount: number }> | null>(null);
  useEffect(() => {
    if (!assignOpen) return;
    setOptions(null);
    apiGet<{ options: Array<{ refId: string; label: string; amount: number }> }>(
      `/api/baocao/bank-check?date=${assignDate}&options=1`,
    )
      .then((r) => setOptions(r.options))
      .catch(() => setOptions([]));
  }, [assignOpen, assignDate]);
  /** Dòng treo vì GỢI Ý tên giống — tô hổ phách cho khác dòng chưa khớp thường. */
  const isSuggest = !ok && /GIỐNG tên khách/.test(line.matchWhy ?? "");
  const badge = line.matchLevel ? LEVEL_BADGE[line.matchLevel] : null;
  return (
    <li
      className={
        "rounded-xl border-2 px-2.5 py-1.5 " +
        (ok ? "border-emerald-300 bg-emerald-50/60" : "border-rose-300 bg-rose-50/60")
      }
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <strong className={"shrink-0 tabular-nums " + (ok ? "text-emerald-800" : "text-rose-800")}>
          +{formatVND(line.amount)}
        </strong>
        {(line.bankTime || showDate) && (
          <span className="shrink-0 text-[11px] text-slate-500">
            {[showDate ? formatDateKeyVN(line.bankDate || line.checkDate) : "", line.bankTime]
              .filter(Boolean)
              .join(" ")}
          </span>
        )}
        {badge && (
          <span className={"shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold " + badge.cls}>{badge.label}</span>
        )}
        {ok ? (
          <span className="min-w-0 flex-1 text-xs font-semibold text-slate-800">
            {line.status === "manual"
              ? `${line.resolvedNote || "đã kiểm tay"} — ${line.resolvedBy || ""}`
              : line.matchLabel}
            {line.matchSpot && line.status === "matched" && (
              <span className="font-normal text-slate-500"> · {spotName(line.matchSpot)}</span>
            )}
          </span>
        ) : isSuggest ? (
          <span className="min-w-0 flex-1 text-xs font-bold text-amber-800">
            Gợi ý — máy không tự nhận, soát tay
          </span>
        ) : (
          <span className="min-w-0 flex-1 text-xs font-bold text-rose-800">Chưa khớp — kiểm tay</span>
        )}
        {!ok && (
          <span className="flex shrink-0 gap-1">
            <Button
              type="button"
              variant="ghost"
              className="h-7 bg-white px-2 text-[11px]"
              disabled={busy}
              onClick={() => onAct(line.id, "resolve")}
            >
              ✓ Đã kiểm tay
            </Button>
            {onAssign && (
              <Button
                type="button"
                variant="ghost"
                className="h-7 bg-sky-50 px-2 text-[11px] text-sky-800"
                disabled={busy}
                onClick={() => setAssignOpen((v) => !v)}
                title="Chỉ định dòng tiền này thuộc khoản thanh toán nào"
              >
                → Chỉ định khoản
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              className="h-7 bg-white px-2 text-[11px] text-rose-700"
              disabled={busy}
              onClick={() => onAct(line.id, "delete")}
            >
              Xoá
            </Button>
          </span>
        )}
      </div>
      {/* Khớp rồi vẫn phải nhắc nếu app CHƯA ghi thu — tiền về mà sổ chưa ghi */}
      {ok && line.status === "matched" && line.recorded === false && (
        <div className="mt-0.5 text-[11px] font-bold text-amber-700">
          ⚠ Tiền đã về đúng khách nhưng app CHƯA ghi thu khoản này — nhắc người phụ trách bấm thu tiền.
        </div>
      )}
      {ok && line.matchWhy && line.status === "matched" && (
        <div className="mt-0.5 text-[11px] text-slate-500">khớp vì: {line.matchWhy}</div>
      )}
      {/* Phân vân / gợi ý: liệt kê ứng viên NGAY TRONG DÒNG — hai luồng (sao kê
          và booking nghi ngờ) nằm cạnh nhau cho kế toán đối soát bằng mắt */}
      {!ok && (line.candidates ?? []).length > 0 && (
        <div
          className={
            "mt-0.5 rounded px-1.5 py-1 text-[11px] font-semibold leading-snug " +
            (isSuggest ? "bg-amber-100 text-amber-900" : "text-rose-900/80")
          }
        >
          {line.matchWhy ? `${line.matchWhy}: ` : "Có thể là: "}
          {line.candidates!.join(" · ")}
        </div>
      )}
      {assignOpen && onAssign && (
        <div className="mt-1.5 rounded-lg border border-sky-200 bg-sky-50/60 p-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-sky-900">Khoản này thuộc ngày:</span>
            <input
              type="date"
              value={assignDate}
              onChange={(e) => setAssignDate(e.target.value)}
              className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs"
            />
          </div>
          <div className="mt-1.5 max-h-44 space-y-0.5 overflow-y-auto">
            {options === null ? (
              <p className="text-[11px] text-slate-500">Đang tải danh sách khoản…</p>
            ) : options.length === 0 ? (
              <p className="text-[11px] text-slate-500">Ngày này không có khoản nào — chọn ngày khác.</p>
            ) : (
              options.map((o) => (
                <button
                  key={o.refId}
                  type="button"
                  disabled={busy}
                  onClick={() => onAssign(line.id, o.refId, assignDate).then(() => setAssignOpen(false))}
                  className={
                    "flex w-full items-center gap-2 rounded-lg border px-2 py-1 text-left text-xs hover:bg-white " +
                    (o.amount === line.amount
                      ? "border-emerald-400 bg-emerald-50 font-semibold"
                      : "border-slate-200 bg-white/60")
                  }
                >
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  <strong className="shrink-0 tabular-nums">{formatVND(o.amount)}</strong>
                  {o.amount === line.amount && <span className="shrink-0 text-[10px] text-emerald-700">= số tiền</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
      <div className="mt-0.5 break-all font-mono text-[10px] leading-snug text-slate-400">{line.raw}</div>
    </li>
  );
}
