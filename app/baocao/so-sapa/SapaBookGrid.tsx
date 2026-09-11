"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { frozenCount, frozenOffsets, groupSpans, sheetColumns, shortPickupSo, type SheetCol } from "@/lib/baobay/sheet-columns";
import type { SapaBookRow, SapaBookView } from "@/services/baobay.service";

import { apiPatch, apiPost } from "../components/client-api";
import { useFillHeight } from "../components/useFillHeight";

/**
 * LƯỚI SỔ SA PA — cả tháng một màn hình, gõ như bảng tính.
 *
 * Bố cục cột dựng lại ĐÚNG tab tháng của bảng "Bảng theo dõi chuyến bay" (xem
 * lib/baobay/sheet-columns.ts), kể cả hai hàng tiêu đề gộp ô, những cột kế toán
 * app chưa quản, và phép ĐÓNG BĂNG 7 cột đầu mà chính bảng khai
 * (`<pane xSplit="7" ySplit="4" state="frozen"/>`).
 *
 * Vì sao bám sát đến thế: người đang giữ sổ đã quen mắt thứ tự ấy suốt nhiều
 * tháng. Đổi bố cục là bắt họ học lại, mà học lại thì họ quay về gõ bảng tính
 * cho nhanh — và ta lại có hai sổ như cũ.
 *
 * BÀN PHÍM: Tab/Shift+Tab sang ô bên (hết dòng thì xuống dòng dưới) · Enter và
 * ↑↓ chạy dọc một cột · Shift+Enter xuống dòng trong ô ghi chú · Esc bỏ dở.
 * LƯU TỪNG Ô: máy chủ tính lại tổng rồi trả CẢ DÒNG.
 */

const vnd = (n: number) => (n ? n.toLocaleString("vi-VN") : "");
const dayShort = (d: string) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : "");

const STATUS_LABEL: Record<string, string> = {
  open: "CHỜ BAY",
  done: "ĐÃ BAY",
  cancelled: "ĐÃ HUỶ",
  voided: "BỎ SỔ",
};

/** POS quy sang USD — đúng công thức =POS/1,08 của bảng. */
const USD_RATE = 1.08;

function cellText(row: SapaBookRow, col: SheetCol): string {
  if (col.key.startsWith("dest:")) return vnd(row.received[col.key.slice(5)] ?? 0);
  switch (col.key) {
    case "monthLabel":
      return row.flightDate ? `thg ${Number(row.flightDate.slice(5, 7))}` : "";
    case "flightDate":
      return dayShort(row.flightDate);
    case "usd": {
      const pos = row.received["pos"] ?? 0;
      return pos ? Math.round(pos / USD_RATE).toLocaleString("vi-VN") : "";
    }
    default:
      break;
  }
  /** Điểm đón: tên bãi dài rút về "Tự đến", "Khách sạn" còn "KS" — xem shortPickupSo (chỉ dùng trong sổ). */
  if (col.key === "pickupNote") return shortPickupSo(row.pickupNote);
  /** Cột của kế toán bên bảng tính mà app chưa quản — để TRỐNG, không bịa số. */
  if (col.ketToan) return "";
  const v = (row as unknown as Record<string, unknown>)[col.key];
  if (col.kind === "money") return vnd(Number(v) || 0);
  if (col.kind === "num") return Number(v) ? String(v) : "";
  if (col.kind === "status") return STATUS_LABEL[String(v)] ?? String(v ?? "");
  return String(v ?? "");
}

function editValueOf(row: SapaBookRow, col: SheetCol): string {
  if (col.kind === "money" || col.kind === "num") {
    const n = Number((row as unknown as Record<string, unknown>)[col.key]) || 0;
    return n ? String(n) : "";
  }
  return String((row as unknown as Record<string, unknown>)[col.key] ?? "");
}

export function SapaBookGrid({
  view,
  onReload,
  canEdit,
  tall,
}: {
  view: SapaBookView;
  onReload: () => void;
  canEdit: boolean;
  /** Toàn màn hình — lưới ăn hết chỗ còn lại của cửa sổ. */
  tall?: boolean;
}) {
  const cols = useMemo(() => sheetColumns("sapa", view.dests, { thang: true, keToan: true }), [view.dests]);
  const editCols = useMemo(() => cols.map((c, i) => (c.edit ? i : -1)).filter((i) => i >= 0), [cols]);
  const froze = useMemo(() => frozenCount(cols), [cols]);
  const offs = useMemo(() => frozenOffsets(cols, froze), [cols, froze]);

  const [rows, setRows] = useState<SapaBookRow[]>([]);
  const [days, setDays] = useState<SapaBookView["days"]>(view.days);
  useEffect(() => {
    setDays(view.days);
    setRows(view.days.flatMap((d) => d.rows));
  }, [view]);

  const [sel, setSel] = useState<{ r: number; c: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>(null);
  const { ref: boxRef, height, width: boxW } = useFillHeight(tall ? 30 : 60, true);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing, sel]);

  const startEdit = useCallback(
    (r: number, c: number) => {
      const row = rows[r];
      const col = cols[c];
      if (!row || !col?.edit || row.locked || !canEdit) return;
      setSel({ r, c });
      setDraft(editValueOf(row, col));
      setEditing(true);
    },
    [rows, cols, canEdit],
  );

  const move = useCallback(
    (dr: number, dc: number) => {
      setSel((cur) => {
        if (!cur) return cur;
        let ci = editCols.indexOf(cur.c);
        let r = cur.r;
        if (dc) {
          ci += dc;
          if (ci < 0) {
            r -= 1;
            ci = editCols.length - 1;
          } else if (ci >= editCols.length) {
            r += 1;
            ci = 0;
          }
        }
        if (dr) r += dr;
        if (r < 0 || r >= rows.length) return cur;
        return { r, c: editCols[Math.max(0, Math.min(editCols.length - 1, ci))] };
      });
      setEditing(true);
    },
    [editCols, rows.length],
  );

  const commit = useCallback(
    async (r: number, c: number, value: string) => {
      const row = rows[r];
      const col = cols[c];
      if (!row || !col?.edit || value === editValueOf(row, col)) return;
      const key = `${row.id}:${col.edit}`;
      setSaving(key);
      setError(null);
      try {
        const res = await apiPatch<{ row: SapaBookRow }>("/api/baocao/so-sapa", { id: row.id, field: col.edit, value });
        setRows((prev) => prev.map((x) => (x.id === row.id ? res.row : x)));
      } catch (e: unknown) {
        setError(
          `Ngày ${dayShort(row.flightDate)} · dòng ${row.daySeq || "?"} · ô "${col.label || col.key}": ` +
            (e instanceof Error ? e.message : "không lưu được"),
        );
      } finally {
        setSaving((s) => (s === key ? null : s));
      }
    },
    [rows, cols],
  );

  async function addRow(date: string) {
    setAdding(date);
    setError(null);
    try {
      await apiPost("/api/baocao/so-sapa", { flightDate: date });
      onReload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không thêm được hàng");
    } finally {
      setAdding(null);
    }
  }

  function onKey(e: React.KeyboardEvent, r: number, c: number) {
    if (e.key === "Escape") {
      e.preventDefault();
      setEditing(false);
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      void commit(r, c, draft);
      move(0, e.shiftKey ? -1 : 1);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void commit(r, c, draft);
      move(1, 0);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      void commit(r, c, draft);
      move(e.key === "ArrowDown" ? 1 : -1, 0);
    }
  }

  const g1 = useMemo(() => groupSpans(cols, 1), [cols]);
  const g2 = useMemo(() => groupSpans(cols, 2), [cols]);
  const hasG2 = g2.some((x) => x.label);
  /** Bề ngang cả bảng = tổng số đã khai — để table-layout:fixed có mốc chắc chắn. */
  const totalW = cols.reduce((t, c) => t + c.w, 0) + 0;
  /**
   * MÀN HÌNH HẸP THÌ THÔI ĐÓNG BĂNG — xem giải thích ở BookingSheet.
   * Khối dán trái ~500px, điện thoại rộng ~390px: giữ dán là lưới không cuộn
   * ra được cột nào khác. Chừa 150px cho phần cuộn thì mới đáng dán.
   */
  const frozeW = cols.slice(0, froze).reduce((t, c) => t + c.w, 0);
  const hep = boxW != null && boxW < frozeW + 150;
  const freezeStyle = (c: number): React.CSSProperties =>
    c < froze && !hep
      ? { position: "sticky", left: offs[c], zIndex: 6, boxShadow: c === froze - 1 ? "2px 0 0 0 rgb(100 116 139)" : undefined }
      : {};
  const headFreeze = (c: number): React.CSSProperties =>
    c < froze && !hep
      ? { position: "sticky", left: offs[c], zIndex: 26, boxShadow: c === froze - 1 ? "2px 0 0 0 rgb(100 116 139)" : undefined }
      : {};

  /** Chỉ số dòng phẳng của dòng đầu mỗi ngày — bàn phím và màn hình cùng một trục. */
  let cursor = 0;
  const dayStart = days.map((d) => {
    const at = cursor;
    cursor += d.rows.length;
    return at;
  });

  return (
    <div className="space-y-1">
      {error && (
        <div className="rounded-lg border-2 border-rose-400 bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-800">
          ⚠ {error}
          <button type="button" onClick={() => setError(null)} className="ml-2 underline">
            bỏ qua
          </button>
        </div>
      )}

      <div
        ref={boxRef}
        className="overflow-auto overscroll-x-contain rounded-lg border border-slate-300 bg-white"
        style={{ maxHeight: height ? `${height}px` : "70vh" }}
      >
        {/**
         * BỐ CỤC CỐ ĐỊNH + VIỀN TÁCH RỜI — hai thứ này quyết định cột đóng băng
         * có đè lên nhau hay không.
         *
         * Mép dán của cột đóng băng (`left`) tính bằng TỔNG BỀ NGANG ĐÃ KHAI của
         * các cột trước nó. Nên bề ngang THẬT phải đúng bằng số đã khai:
         *  - `table-layout: fixed` để nội dung dài không nới cột ra (auto layout
         *    thì một ô ghi chú dài là cả cột phình, mọi mép dán sau đó trượt);
         *  - `border-separate` vì `border-collapse` cho hai ô KỀ NHAU dùng CHUNG
         *    một đường viền, mỗi cột hụt đi nửa pixel và sai số dồn dần — tới
         *    cột thứ bảy là lệch hẳn, cột dán đè lên cột cuộn.
         * Viền vẽ ở cạnh PHẢI và DƯỚI của từng ô nên nhìn vẫn là lưới một nét.
         */}
        <table
          className="text-[11px]"
          style={{ tableLayout: "fixed", width: totalW, borderCollapse: "separate", borderSpacing: 0 }}
        >
          <colgroup>
            {cols.map((c) => (
              <col key={c.key} style={{ width: c.w, minWidth: c.w, maxWidth: c.w }} />
            ))}
          </colgroup>

          <thead className="sticky top-0 z-20">
            <tr>
              {g1.map((g, i) => (
                <th
                  key={`g1-${i}`}
                  colSpan={g.span}
                  style={i === 0 ? { position: "sticky", left: 0, zIndex: 26 } : undefined}
                  className={
                    "border-b border-r border-slate-300 px-1 py-px text-[10px] font-bold uppercase tracking-wide " +
                    (g.label ? "bg-slate-700 text-white" : "bg-slate-400 text-slate-100")
                  }
                >
                  {g.label}
                </th>
              ))}
            </tr>
            {hasG2 && (
              <tr>
                {g2.map((g, i) => (
                  <th
                    key={`g2-${i}`}
                    colSpan={g.span}
                    style={i === 0 ? { position: "sticky", left: 0, zIndex: 26 } : undefined}
                    className={
                      "border-b border-r border-slate-300 px-1 py-px text-[10px] font-semibold " +
                      (g.label ? "bg-slate-500 text-white" : "bg-slate-300 text-slate-600")
                    }
                  >
                    {g.label}
                  </th>
                ))}
              </tr>
            )}
            <tr>
              {cols.map((c, i) => (
                <th
                  key={c.key}
                  /** Màu tiêu đề chép từ bảng Google gốc (sheet-columns.ts → MAU). */
                  style={{ ...headFreeze(i), ...(c.bg ? { background: c.bg } : {}) }}
                  title={c.title ?? (c.edit ? "Bấm vào ô để sửa" : "Máy tự tính — sửa ở ô gốc")}
                  className={
                    "border-b border-r border-slate-300 px-1 py-px text-[10px] font-bold text-slate-800 " +
                    (c.right ? "text-right " : "text-left ") +
                    (c.edit ? "bg-slate-100" : "bg-slate-200 text-slate-500")
                  }
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {days.map((day, di) => (
              <DayBlock
                key={day.date}
                day={day}
                cols={cols}
                base={dayStart[di]}
                rows={rows}
                sel={sel}
                editing={editing}
                draft={draft}
                saving={saving}
                canEdit={canEdit}
                inputRef={inputRef}
                setDraft={setDraft}
                startEdit={startEdit}
                onKey={onKey}
                onBlur={(r, c) => {
                  void commit(r, c, draft);
                  setEditing(false);
                }}
                onAdd={() => addRow(day.date)}
                adding={adding === day.date}
                freezeStyle={freezeStyle}
              />
            ))}

            {!days.length && (
              <tr>
                <td colSpan={cols.length} className="px-3 py-6 text-center text-slate-500">
                  Tháng này chưa có booking nào.
                </td>
              </tr>
            )}
          </tbody>

          {days.length > 0 && (
            <tfoot className="sticky bottom-0 z-20">
              <tr>
                {cols.map((c, i) => (
                  <td
                    key={c.key}
                    style={freezeStyle(i)}
                    className={
                      "border-b border-r border-slate-600 bg-slate-800 px-1 py-px font-bold text-white " + (c.right ? "text-right" : "")
                    }
                  >
                    {c.key === "daySeq"
                      ? "Σ"
                      : c.key === "guestCount"
                        ? view.totals.guests
                        : c.key === "total"
                          ? vnd(view.totals.total)
                          : c.key === "paid"
                            ? vnd(view.totals.paid)
                            : c.key.startsWith("dest:")
                              ? vnd(view.totals.received[c.key.slice(5)] ?? 0)
                              : ""}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <p className="text-[10px] leading-tight text-slate-500">
        Bấm ô để sửa · <strong>Tab</strong> sang ô bên · <strong>Enter</strong>/<strong>↑↓</strong> chạy dọc ·{" "}
        <strong>Shift+Enter</strong> xuống dòng trong ô ghi chú · <strong>Esc</strong> bỏ dở. {froze} cột đầu đứng yên khi
        cuộn ngang (đúng như bảng tính). Ô nền xám là máy tự tính; ô <em>Phụ thu khác</em> gõ số âm nghĩa là giảm giá.
      </p>
    </div>
  );
}

function DayBlock({
  day,
  cols,
  base,
  rows,
  sel,
  editing,
  draft,
  saving,
  canEdit,
  inputRef,
  setDraft,
  startEdit,
  onKey,
  onBlur,
  onAdd,
  adding,
  freezeStyle,
}: {
  day: SapaBookView["days"][number];
  cols: SheetCol[];
  base: number;
  rows: SapaBookRow[];
  sel: { r: number; c: number } | null;
  editing: boolean;
  draft: string;
  saving: string | null;
  canEdit: boolean;
  inputRef: React.MutableRefObject<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>;
  setDraft: (v: string) => void;
  startEdit: (r: number, c: number) => void;
  onKey: (e: React.KeyboardEvent, r: number, c: number) => void;
  onBlur: (r: number, c: number) => void;
  onAdd: () => void;
  adding: boolean;
  freezeStyle: (c: number) => React.CSSProperties;
}) {
  const dayRows = rows.slice(base, base + day.rows.length);
  return (
    <>
      {/* Đầu khối ngày kèm số cộng — sổ tay cũng gạch ngang theo ngày */}
      <tr>
        <td
          colSpan={cols.length}
          className="sticky left-0 border-b border-r border-slate-300 bg-sky-100 px-2 py-0.5"
          style={{ zIndex: 5 }}
        >
          <span className="text-[12px] font-bold text-sky-900">{dayShort(day.date)}</span>
          <span className="ml-3 text-[10px] text-sky-800">
            {day.guests} khách · tổng {vnd(day.total)} đ · đã thu {vnd(day.paid)} đ
          </span>
        </td>
      </tr>

      {dayRows.map((row, i) => {
        const r = base + i;
        /** Hàng xen kẽ trắng / xám nhạt — cùng luật với lưới ngày (BookingSheet). */
        const rowBg = row.locked ? "bg-slate-200/70" : row.status !== "open" ? (i % 2 ? "bg-slate-100" : "bg-slate-50") : i % 2 ? "bg-slate-50" : "bg-white";
        return (
          <tr key={row.id}>
            {cols.map((col, c) => {
              const active = sel?.r === r && sel?.c === c;
              const isEditing = active && editing && Boolean(col.edit);
              const busy = saving === `${row.id}:${col.edit}`;
              const finish = () => onBlur(r, c);
              return (
                <td
                  key={col.key}
                  onClick={() => col.edit && startEdit(r, c)}
                  /** Màu ô dữ liệu theo bảng gốc; ô đang gõ / đang lưu thì màu trạng thái thắng. */
                  style={{ ...freezeStyle(c), ...(col.bgCell && !isEditing && !busy ? { background: col.bgCell } : {}) }}
                  className={
                    "border-b border-r border-slate-200 px-1 py-px align-middle leading-tight " +
                    (busy ? "bg-amber-100 " : col.edit ? `${rowBg} ` : "bg-slate-50 text-slate-500 ") +
                    (col.right ? "text-right tabular-nums " : "") +
                    (col.edit && !row.locked ? "cursor-text " : "") +
                    (col.strong ? "font-bold text-sky-900 " : "") +
                    (active ? "outline outline-2 -outline-offset-1 outline-sky-500" : "")
                  }
                >
                  {isEditing ? (
                    col.kind === "status" ? (
                      <select
                        ref={inputRef as React.MutableRefObject<HTMLSelectElement>}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => onKey(e, r, c)}
                        onBlur={finish}
                        className="w-full bg-white text-[11px] outline-none"
                      >
                        <option value="open">CHỜ BAY</option>
                        <option value="done">ĐÃ BAY</option>
                        <option value="cancelled">ĐÃ HUỶ</option>
                      </select>
                    ) : col.wrap || col.kind === "names" ? (
                      <textarea
                        ref={inputRef as React.MutableRefObject<HTMLTextAreaElement>}
                        value={draft}
                        rows={Math.min(6, Math.max(1, draft.split("\n").length))}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => onKey(e, r, c)}
                        onBlur={finish}
                        placeholder={col.kind === "names" ? "mỗi khách một dòng" : ""}
                        title="Shift+Enter để xuống dòng · Enter là xong, sang dòng dưới"
                        className="w-full resize-none bg-white text-[11px] leading-tight outline-none"
                      />
                    ) : (
                      <input
                        ref={inputRef as React.MutableRefObject<HTMLInputElement>}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => onKey(e, r, c)}
                        onBlur={finish}
                        inputMode={col.kind === "money" || col.kind === "num" ? "numeric" : undefined}
                        placeholder={col.kind === "time" ? "08:00" : ""}
                        className={"w-full bg-white text-[11px] outline-none" + (col.right ? " text-right" : "")}
                      />
                    )
                  ) : (
                    <span
                      className={
                        "block min-h-[15px] " +
                        (col.wrap || col.kind === "names" ? "whitespace-pre-line break-words" : "truncate")
                      }
                    >
                      {cellText(row, col)}
                    </span>
                  )}
                </td>
              );
            })}
          </tr>
        );
      })}

      {/* Dòng trống cuối khối ngày: chỗ gõ khách mới, đúng chỗ tay đang đặt */}
      <tr>
        <td colSpan={cols.length} className="sticky left-0 border-b border-r border-slate-200 bg-white px-1 py-0.5" style={{ zIndex: 5 }}>
          <button
            type="button"
            disabled={!canEdit || adding}
            onClick={onAdd}
            className="rounded border border-dashed border-slate-400 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:border-sky-500 hover:text-sky-700 disabled:opacity-50"
          >
            {adding ? "Đang thêm…" : `+ Thêm hàng · ngày ${dayShort(day.date)}`}
          </button>
        </td>
      </tr>
    </>
  );
}
