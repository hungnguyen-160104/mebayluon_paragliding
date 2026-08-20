// app/baocao/components/BankCheckCard.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

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

type Report = {
  date: string;
  spots: string[];
  lines: LineDTO[];
  pending: LineDTO[];
  appTransfers: AppTransferDTO[];
  appCash: AppCashDTO[];
  groups: GroupDTO[];
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

export function BankCheckCard({ date }: { date: string }) {
  const [text, setText] = useState("");
  /** Soát theo điểm nào: chọn 1, 2 hay cả 3 — rỗng là cả ba (mặc định, tiền chung một TK). */
  const [spots, setSpots] = useState<string[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);

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
  const unseen = appTransfers.filter((t) => !t.seen);
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

      {/* ---- CÔNG THỨC CHIA BILL: booking nhận nhiều lần chuyển ---- */}
      {(report?.groups ?? []).length > 0 && (
        <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/50 p-2.5">
          <div className="text-xs font-bold text-indigo-900">
            🧮 {report!.groups.length} booking chia bill / tiền về chưa đủ
          </div>
          <ul className="mt-1.5 space-y-1">
            {report!.groups.map((g, i) => (
              <li key={i} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                <span className="min-w-0 flex-1 font-semibold text-slate-800">{g.label}</span>
                {/* Một bill thì nói "mới ghi nhận", nhiều bill mới in công thức cộng */}
                <span className="shrink-0 tabular-nums text-slate-600">
                  {g.parts.length === 1
                    ? "mới ghi nhận "
                    : g.parts.map((n) => n.toLocaleString("vi-VN")).join(" + ") + " = "}
                  <strong className="text-slate-900">{g.total.toLocaleString("vi-VN")} đ</strong>
                </span>
                {g.status === "du" ? (
                  <span className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                    ✓ đủ {g.expected.toLocaleString("vi-VN")} đ
                  </span>
                ) : g.status === "thieu" ? (
                  <span className="shrink-0 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">
                    còn thiếu {(g.expected - g.total).toLocaleString("vi-VN")} đ / cần {g.expected.toLocaleString("vi-VN")}
                  </span>
                ) : (
                  <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                    dư {(g.total - g.expected).toLocaleString("vi-VN")} đ / cần {g.expected.toLocaleString("vi-VN")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---- TỪNG DÒNG SAO KÊ của ngày: xanh = khớp, đỏ = treo ---- */}
      {lines.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {lines.map((l) => (
            <BankLineRow key={l.id} line={l} busy={rowBusy === l.id} onAct={act} />
          ))}
        </ul>
      )}

      {/* ---- KHOẢN TREO các ngày trước — chưa tìm được chủ ---- */}
      {pendingOld.length > 0 && (
        <div className="mt-3 rounded-xl border-2 border-rose-300 bg-rose-50/60 p-2">
          <div className="text-xs font-bold text-rose-900">
            ⚠ {pendingOld.length} khoản treo từ ngày khác — chưa biết của booking nào
          </div>
          <ul className="mt-1.5 space-y-1.5">
            {pendingOld.map((l) => (
              <BankLineRow key={l.id} line={l} busy={rowBusy === l.id} onAct={act} showDate />
            ))}
          </ul>
        </div>
      )}

      {/* ---- ĐỐI CHIẾU NGƯỢC: app ghi CK mà sao kê chưa thấy ---- */}
      {appTransfers.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-bold text-slate-700">
            App ghi nhận {appTransfers.length} khoản CK trong ngày ={" "}
            <span className="tabular-nums">{formatVND(appTransfers.reduce((t, x) => t + x.amount, 0))}</span>
            {unseen.length > 0 && (
              <span className="text-rose-700"> · {unseen.length} khoản sao kê chưa thấy</span>
            )}
          </div>
          <ul className="mt-1 divide-y divide-slate-100">
            {appTransfers.map((t) => (
              <li key={t.refId} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 py-1 text-xs">
                {t.seen ? (
                  <span className="shrink-0 font-bold text-emerald-600">✓</span>
                ) : (
                  <span className="shrink-0 font-bold text-rose-600">✗</span>
                )}
                <span className="min-w-0 flex-1 text-slate-700">
                  {t.label}
                  <span className="text-slate-400">
                    {" "}
                    · {t.source}
                    {t.code ? ` · mã GD ${t.code}` : ""}
                  </span>
                </span>
                <strong className="shrink-0 tabular-nums text-slate-900">{formatVND(t.amount)}</strong>
                {!t.seen && (
                  <span className="shrink-0 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-800">
                    sao kê chưa thấy — kiểm lại
                  </span>
                )}
                {/* HAI NÚT TÁCH BẠCH: "Đã nhận" đánh dấu từng khoản (cọc trước cho
                    ngày tương lai vẫn nhận được mà không khoá); "Khoá booking" là
                    chuyện riêng, chỉ bấm khi booking đã xong xuôi hẳn. */}
                {t.verified ? (
                  <button
                    type="button"
                    disabled={rowBusy === t.refId}
                    onClick={() => confirmItem(t.refId, false)}
                    title="Kế toán đã nhận khoản này — bấm để bỏ đánh dấu"
                    className="shrink-0 rounded bg-emerald-700 px-2 py-0.5 text-[10px] font-bold text-white disabled:opacity-50"
                  >
                    ✓ đã nhận
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={rowBusy === t.refId}
                    onClick={() => confirmItem(t.refId, true)}
                    className="shrink-0 rounded-lg border border-emerald-400 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                  >
                    ✓ Đã nhận
                  </button>
                )}
                {t.locked ? (
                  <span
                    className="shrink-0 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-white"
                    title="Kế toán đã khoá — không sửa được nữa"
                  >
                    🔒 đã khoá
                  </span>
                ) : t.bookingId ? (
                  <button
                    type="button"
                    disabled={rowBusy === t.refId}
                    onClick={() => lockBooking(t)}
                    title="Chỉ khoá khi booking đã xong hẳn — khoá rồi điều phối không thao tác được nữa"
                    className="shrink-0 rounded-lg border border-slate-400 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  >
                    🔒 Khoá booking
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[11px] leading-tight text-slate-500">
            “Sao kê chưa thấy” = app có ghi khoản CK này nhưng chưa dòng sao kê nào khớp về nó — có thể chưa dán
            đủ sao kê, khách chưa chuyển, hoặc nhập nhầm. Khoản đã bấm “Đã nhận” coi như soát xong, không đòi sao kê nữa.
          </p>
        </div>
      )}

      {/* ---- TIỀN MẶT ghi nhận trong ngày: tích "Đã nhận" từng khoản (không tính vào đối chiếu sao kê) ---- */}
      {(report?.appCash ?? []).length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-bold text-slate-700">
            💵 Tiền mặt ghi nhận trong ngày ({report!.appCash.length} khoản ={" "}
            <span className="tabular-nums">{formatVND(report!.appCash.reduce((t, x) => t + x.amount, 0))}</span>)
          </div>
          <ul className="mt-1 divide-y divide-slate-100">
            {report!.appCash.map((t) => (
              <li key={t.refId} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 py-1 text-xs">
                <span className="min-w-0 flex-1 text-slate-700">
                  {t.label}
                  <span className="text-slate-400"> · {t.by} đang giữ</span>
                </span>
                <strong className="shrink-0 tabular-nums text-slate-900">{formatVND(t.amount)}</strong>
                {t.verified ? (
                  <button
                    type="button"
                    disabled={rowBusy === t.refId}
                    onClick={() => confirmItem(t.refId, false)}
                    title="Đã nhận khoản tiền mặt này — bấm để bỏ đánh dấu"
                    className="shrink-0 rounded bg-emerald-700 px-2 py-0.5 text-[10px] font-bold text-white disabled:opacity-50"
                  >
                    ✓ đã nhận
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={rowBusy === t.refId}
                    onClick={() => confirmItem(t.refId, true)}
                    className="shrink-0 rounded-lg border border-emerald-400 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                  >
                    ✓ Đã nhận
                  </button>
                )}
                {t.locked ? (
                  <span className="shrink-0 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-white">🔒</span>
                ) : t.bookingId ? (
                  <button
                    type="button"
                    disabled={rowBusy === t.refId}
                    onClick={() => lockBooking(t)}
                    className="shrink-0 rounded-lg border border-slate-400 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  >
                    🔒 Khoá
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}

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
  showDate,
}: {
  line: LineDTO;
  busy: boolean;
  onAct: (id: string, action: "resolve" | "delete") => void;
  showDate?: boolean;
}) {
  const ok = line.status !== "pending";
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
      <div className="mt-0.5 break-all font-mono text-[10px] leading-snug text-slate-400">{line.raw}</div>
    </li>
  );
}
