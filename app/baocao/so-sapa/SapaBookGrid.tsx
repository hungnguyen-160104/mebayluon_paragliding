"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { SapaBookRow, SapaBookView } from "@/services/baobay.service";

import { apiPatch, apiPost } from "../components/client-api";

/**
 * LƯỚI SỔ SA PA — gõ như bảng tính, ngay trong app.
 *
 * Bố cục cột dựng lại ĐÚNG sổ tay Google Sheets của điểm, không bày lại theo
 * kiểu app: người đang giữ sổ đã quen mắt thứ tự ấy suốt nhiều tháng. Đổi bố
 * cục là bắt họ học lại, mà học lại thì họ quay về gõ bảng tính cho nhanh — và
 * ta lại có hai sổ như cũ.
 *
 * BA THỨ QUYẾT ĐỊNH NÓ CÓ ĐƯỢC DÙNG HAY KHÔNG, và cả ba đều là bàn phím:
 *  - Tab / Shift+Tab chạy ngang, cuối dòng thì sang dòng dưới;
 *  - Enter và ↑↓ chạy dọc đúng một cột;
 *  - Esc bỏ dở ô đang gõ, trả lại số cũ.
 * Thiếu chúng thì đây chỉ là một cái bảng phải rê chuột, và không ai đổi thói
 * quen để dùng một thứ chậm hơn cái họ đang có.
 *
 * LƯU TỪNG Ô, KHÔNG GOM CẢ DÒNG: gõ xong một ô là nó bay đi ngay, ô kế bên gõ
 * tiếp không phải chờ. Hỏng mạng thì chỉ hỏng đúng ô đó — số cũ tự quay lại và
 * lưới nói rõ ô nào không lưu được.
 */

type CellKind = "text" | "num" | "money" | "time" | "status" | "names";

type Col = {
  key: string;
  label: string;
  /** Tên trường máy chủ nhận — có thì ô sửa được, không thì máy tính. */
  edit?: string;
  kind: CellKind;
  /** Bề ngang cố định: cột nhảy qua nhảy lại mỗi lần gõ là không đọc nổi. */
  w: string;
  right?: boolean;
  /** Đậm — dùng cho TỔNG THU. */
  strong?: boolean;
  head?: string;
};

const vnd = (n: number) => (n ? n.toLocaleString("vi-VN") : "");
const dayLabel = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

const STATUS_LABEL: Record<string, string> = {
  open: "CHỜ BAY",
  done: "ĐÃ BAY",
  cancelled: "ĐÃ HUỶ",
  voided: "BỎ SỔ",
};

/**
 * Cột cố định của lưới. Các cột "người nhận tiền" chèn thêm ở giữa theo danh
 * sách quỹ máy chủ gửi về (mỗi điểm một danh sách, xem lib/baobay/money-dest).
 */
function buildCols(dests: SapaBookView["dests"]): Col[] {
  return [
    { key: "daySeq", label: "STT", kind: "num", w: "w-12", right: true },
    { key: "source", label: "Code đại lý or lẻ", edit: "source", kind: "text", w: "w-36", head: "THÔNG TIN CHUYẾN BAY" },
    { key: "bookingCode", label: "Số booking", edit: "bookingCode", kind: "text", w: "w-32" },
    { key: "guestNames", label: "TÊN ĐĂNG KÝ", edit: "guestNames", kind: "names", w: "w-56" },
    { key: "guestCount", label: "SL MCC", edit: "guestCount", kind: "num", w: "w-16", right: true },
    { key: "unitPrice", label: "Đơn giá", edit: "unitPrice", kind: "money", w: "w-28", right: true, head: "THÔNG TIN VÉ" },
    { key: "lineAmount", label: "Thành tiền", kind: "money", w: "w-28", right: true },
    { key: "flycam", label: "Flycam", edit: "flycam", kind: "num", w: "w-16", right: true },
    { key: "flycamMoney", label: "Tiền flycam", kind: "money", w: "w-24", right: true },
    { key: "video360", label: "360", edit: "video360", kind: "num", w: "w-16", right: true },
    { key: "video360Money", label: "Tiền 360", kind: "money", w: "w-24", right: true },
    { key: "extraFee", label: "Phụ thu khác", edit: "extraFee", kind: "money", w: "w-28", right: true },
    { key: "total", label: "TỔNG THU", kind: "money", w: "w-32", right: true, strong: true },
    { key: "deposit", label: "ĐẶT CỌC", edit: "deposit", kind: "money", w: "w-28", right: true, head: "CỌC VÀ CK" },
    ...dests.map(
      (d, i): Col => ({
        key: `dest:${d.id}`,
        label: d.label,
        kind: "money",
        w: "w-28",
        right: true,
        head: i === 0 ? "NGƯỜI NHẬN TIỀN" : undefined,
      }),
    ),
    { key: "paid", label: "Đã thu", kind: "money", w: "w-28", right: true },
    { key: "remaining", label: "Còn thu", kind: "money", w: "w-28", right: true },
    { key: "commission", label: "Chiết khấu đại lý", edit: "commission", kind: "money", w: "w-28", right: true, head: "KHOẢN PHỤ" },
    { key: "phone", label: "SĐT", edit: "phone", kind: "text", w: "w-32", head: "ĐÓN KHÁCH" },
    { key: "pickupNote", label: "Điểm đón", edit: "pickupNote", kind: "text", w: "w-44" },
    { key: "expectedTime", label: "Giờ đón", edit: "expectedTime", kind: "time", w: "w-20" },
    { key: "status", label: "Trạng thái", edit: "status", kind: "status", w: "w-28" },
    { key: "note", label: "Ghi chú", edit: "note", kind: "text", w: "w-56" },
  ];
}

function cellValue(row: SapaBookRow, col: Col): string {
  if (col.key.startsWith("dest:")) return vnd(row.received[col.key.slice(5)] ?? 0);
  const v = (row as unknown as Record<string, unknown>)[col.key];
  if (col.kind === "money") return vnd(Number(v) || 0);
  if (col.kind === "num") return Number(v) ? String(v) : "";
  if (col.kind === "status") return STATUS_LABEL[String(v)] ?? String(v ?? "");
  return String(v ?? "");
}

/** Giá trị đưa vào ô nhập khi bắt đầu sửa — số thì bỏ dấu chấm cho dễ gõ đè. */
function editValue(row: SapaBookRow, col: Col): string {
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
}: {
  view: SapaBookView;
  onReload: () => void;
  canEdit: boolean;
}) {
  const cols = useMemo(() => buildCols(view.dests), [view.dests]);
  const editCols = useMemo(() => cols.map((c, i) => (c.edit ? i : -1)).filter((i) => i >= 0), [cols]);

  /** Bản đang hiện — sửa xong một ô thì thay đúng dòng đó, khỏi tải lại cả tháng. */
  const [rows, setRows] = useState<SapaBookRow[]>([]);
  const [days, setDays] = useState<SapaBookView["days"]>(view.days);
  useEffect(() => {
    setDays(view.days);
    setRows(view.days.flatMap((d) => d.rows));
  }, [view]);

  /** Ô đang chọn theo (thứ tự dòng phẳng, thứ tự cột) — null là không chọn gì. */
  const [sel, setSel] = useState<{ r: number; c: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  /** Dòng phẳng theo đúng thứ tự hiện trên màn hình — bàn phím chạy trên mảng này. */
  const flat = rows;

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing, sel]);

  const startEdit = useCallback(
    (r: number, c: number) => {
      const row = flat[r];
      const col = cols[c];
      if (!row || !col?.edit || row.locked || !canEdit) return;
      setSel({ r, c });
      setDraft(editValue(row, col));
      setEditing(true);
    },
    [flat, cols, canEdit],
  );

  /** Sang ô sửa được kế tiếp; hết dòng thì xuống dòng dưới (như bảng tính). */
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
        if (r < 0 || r >= flat.length) return cur;
        return { r, c: editCols[Math.max(0, Math.min(editCols.length - 1, ci))] };
      });
      setEditing(true);
    },
    [editCols, flat.length],
  );

  /**
   * LƯU MỘT Ô.
   *
   * Sửa ngay trên màn hình trước khi máy chủ trả lời (gõ mà phải chờ mạng thì
   * không ai gõ nổi cả trăm dòng), nhưng máy chủ mới là nơi chốt: nó tính lại
   * tổng tiền và còn thu rồi trả về CẢ DÒNG, mình thay nguyên dòng đó. Hỏng thì
   * trả lại số cũ và nói rõ ô nào — im lặng nuốt lỗi ở đây là mất tiền thật.
   */
  const commit = useCallback(
    async (r: number, c: number, value: string) => {
      const row = flat[r];
      const col = cols[c];
      if (!row || !col?.edit) return;
      if (value === editValue(row, col)) return;

      const key = `${row.id}:${col.edit}`;
      setSaving(key);
      setError(null);
      try {
        const res = await apiPatch<{ row: SapaBookRow }>("/api/baocao/so-sapa", {
          id: row.id,
          field: col.edit,
          value,
        });
        setRows((prev) => prev.map((x) => (x.id === row.id ? res.row : x)));
      } catch (e: unknown) {
        setError(
          `Dòng ${row.daySeq || "?"} ngày ${dayLabel(row.flightDate)}, ô "${col.label}": ` +
            (e instanceof Error ? e.message : "không lưu được"),
        );
      } finally {
        setSaving((s) => (s === key ? null : s));
      }
    },
    [flat, cols],
  );

  async function addRow(date: string) {
    setAdding(date);
    setError(null);
    try {
      await apiPost<{ row: SapaBookRow }>("/api/baocao/so-sapa", { flightDate: date });
      onReload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không thêm được dòng");
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

  /** Chỉ số dòng phẳng của dòng đầu mỗi ngày — để bàn phím và màn hình cùng một trục. */
  let cursor = 0;
  const dayStart = days.map((d) => {
    const at = cursor;
    cursor += d.rows.length;
    return at;
  });

  return (
    <div className="space-y-2">
      {error && (
        <div className="sticky top-0 z-30 rounded-lg border-2 border-rose-400 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">
          ⚠ {error}
          <button type="button" onClick={() => setError(null)} className="ml-2 underline">
            bỏ qua
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white">
        <table className="min-w-max border-collapse text-[12px]">
          <thead className="sticky top-0 z-20">
            {/* Hàng gộp nhóm — y như hai hàng tiêu đề trên cùng của sổ tay */}
            <tr>
              {cols.map((c, i) => {
                if (!c.head) return null;
                const span = cols.slice(i).findIndex((x, j) => j > 0 && x.head) ;
                return (
                  <th
                    key={`h-${c.key}`}
                    colSpan={span < 0 ? cols.length - i : span}
                    className="border border-slate-300 bg-slate-700 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white"
                  >
                    {c.head}
                  </th>
                );
              })}
            </tr>
            <tr>
              {cols.map((c) => (
                <th
                  key={c.key}
                  className={
                    "border border-slate-300 bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700 " +
                    c.w +
                    (c.right ? " text-right" : " text-left") +
                    (c.edit ? "" : " bg-slate-200/80 text-slate-500")
                  }
                  title={c.edit ? "Sửa được" : "Máy tự tính — sửa ở ô gốc"}
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
              <tr className="bg-slate-800 text-white">
                {cols.map((c) => (
                  <td key={c.key} className={"border border-slate-600 px-2 py-1 font-bold " + (c.right ? "text-right" : "")}>
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

      <p className="text-[11px] leading-tight text-slate-500">
        Bấm vào ô để sửa · <strong>Tab</strong> sang ô bên, hết dòng thì xuống dòng dưới ·{" "}
        <strong>Enter</strong> và <strong>↑ ↓</strong> chạy dọc một cột · <strong>Esc</strong> bỏ dở ô đang gõ.
        Ô nền xám là máy tự tính. Ô <em>Phụ thu khác</em> gõ số âm nghĩa là giảm giá, đúng nếp sổ tay.
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
}: {
  day: SapaBookView["days"][number];
  cols: Col[];
  base: number;
  rows: SapaBookRow[];
  sel: { r: number; c: number } | null;
  editing: boolean;
  draft: string;
  saving: string | null;
  canEdit: boolean;
  inputRef: React.MutableRefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  setDraft: (v: string) => void;
  startEdit: (r: number, c: number) => void;
  onKey: (e: React.KeyboardEvent, r: number, c: number) => void;
  onBlur: (r: number, c: number) => void;
  onAdd: () => void;
  adding: boolean;
}) {
  const dayRows = rows.slice(base, base + day.rows.length);
  return (
    <>
      {/* Đầu khối ngày kèm số cộng của ngày — sổ tay cũng gạch ngang theo ngày */}
      <tr className="bg-sky-100">
        <td colSpan={cols.length} className="border border-slate-300 px-2 py-1">
          <span className="text-sm font-bold text-sky-900">{dayLabel(day.date)}</span>
          <span className="ml-3 text-[11px] text-sky-800">
            {day.guests} khách · tổng {vnd(day.total)} đ · đã thu {vnd(day.paid)} đ
          </span>
        </td>
      </tr>

      {dayRows.map((row, i) => {
        const r = base + i;
        return (
          <tr key={row.id} className={row.locked ? "bg-slate-50 opacity-70" : "hover:bg-amber-50/40"}>
            {cols.map((col, c) => {
              const active = sel?.r === r && sel?.c === c;
              const isEditing = active && editing && Boolean(col.edit);
              const busy = saving === `${row.id}:${col.edit}`;
              return (
                <td
                  key={col.key}
                  onClick={() => col.edit && startEdit(r, c)}
                  className={
                    "border border-slate-200 px-1 py-0.5 align-top " +
                    col.w +
                    (col.right ? " text-right tabular-nums" : "") +
                    (col.edit ? " cursor-text" : " bg-slate-50 text-slate-500") +
                    (col.strong ? " font-bold text-sky-900" : "") +
                    (active ? " outline outline-2 outline-sky-500" : "") +
                    (busy ? " bg-amber-100" : "")
                  }
                >
                  {isEditing ? (
                    col.kind === "status" ? (
                      <select
                        ref={inputRef as React.MutableRefObject<never>}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => onKey(e, r, c)}
                        onBlur={() => onBlur(r, c)}
                        className="w-full bg-white text-[12px] outline-none"
                      >
                        <option value="open">CHỜ BAY</option>
                        <option value="done">ĐÃ BAY</option>
                        <option value="cancelled">ĐÃ HUỶ</option>
                      </select>
                    ) : col.kind === "names" ? (
                      <textarea
                        ref={inputRef as React.MutableRefObject<HTMLTextAreaElement>}
                        value={draft}
                        rows={Math.max(2, draft.split("\n").length)}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => onKey(e, r, c)}
                        onBlur={() => onBlur(r, c)}
                        placeholder="mỗi khách một dòng"
                        className="w-full resize-none bg-white text-[12px] leading-tight outline-none"
                      />
                    ) : (
                      <input
                        ref={inputRef as React.MutableRefObject<HTMLInputElement>}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => onKey(e, r, c)}
                        onBlur={() => onBlur(r, c)}
                        inputMode={col.kind === "money" || col.kind === "num" ? "numeric" : undefined}
                        placeholder={col.kind === "time" ? "08:00" : ""}
                        className={"w-full bg-white text-[12px] outline-none" + (col.right ? " text-right" : "")}
                      />
                    )
                  ) : (
                    <span className={"block min-h-[18px] whitespace-pre-line " + (col.kind === "names" ? "leading-tight" : "truncate")}>
                      {cellValue(row, col)}
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
        <td colSpan={cols.length} className="border border-slate-200 px-2 py-1">
          <button
            type="button"
            disabled={!canEdit || adding}
            onClick={onAdd}
            className="rounded-lg border border-dashed border-slate-400 px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:border-sky-500 hover:text-sky-700 disabled:opacity-50"
          >
            {adding ? "Đang thêm…" : `+ thêm khách cho ngày ${dayLabel(day.date)}`}
          </button>
        </td>
      </tr>
    </>
  );
}
