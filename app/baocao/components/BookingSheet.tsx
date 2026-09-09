"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { moneyDestsOf } from "@/lib/baobay/money-dest";
import { frozenCount, frozenOffsets, groupSpans, sheetColumns, shortPickup, type SheetCol } from "@/lib/baobay/sheet-columns";
import type { BookingDTO } from "@/lib/baobay/types";

import { apiPatch, apiPost } from "./client-api";
import { useFillHeight } from "./useFillHeight";

/**
 * SỔ BOOKING KIỂU BẢNG TÍNH — bấm thẳng vào ô là sửa.
 *
 * Kiểu xem thứ ba, cạnh THẺ và BẢNG, mỗi kiểu giải một việc khác:
 *   ☰ Thẻ   làm việc với MỘT khách — đủ nút, đủ chỗ đọc.
 *   ▦ Bảng  QUÉT MẮT cả ngày — xếp theo cột; sửa phải mở thẻ.
 *   ▤ Sheet GÕ cả ngày — sửa tại ô, chạy bằng bàn phím.
 *
 * BỐ CỤC lấy ở lib/baobay/sheet-columns.ts — Sa Pa bám đúng tab tháng của bảng
 * "Bảng theo dõi chuyến bay", kể cả hai hàng tiêu đề gộp ô.
 *
 * ĐÓNG BĂNG CỘT TRÁI đúng như bảng tính khai (`xSplit="7"`): phần nhận ra
 * khách (ngày · STT · nguồn · mã book · tên · số người) đứng yên khi cuộn sang
 * phải. Không có nó thì xem tới cột tiền là không biết đang nhìn dòng của ai —
 * và gõ nhầm dòng trên sổ tiền là mất tiền thật.
 *
 * CỘT THAO TÁC bày nút ra ngoài, xếp y như bên ▦ Bảng: chưa bay thì lưới hai
 * cột (thu tiền · in vé · đã bay · cần gọi · ⋯ Thêm) rộng 172px; đã bay/huỷ
 * thì nút nhỏ bằng nửa, xếp một cột 76px. Vị trí nút cố định nên tay bấm quen
 * chỗ. Bấm ⋯ Thêm thì phần còn lại (bay không vé · sửa thu · dời lịch · huỷ ·
 * khoá · bảo hiểm) xổ ra ngay dưới dòng, trải hết bề ngang.
 *
 * BÀN PHÍM: Tab/Shift+Tab sang ô bên (hết dòng thì xuống dòng dưới) · Enter và
 * ↑↓ chạy dọc một cột · Esc bỏ dở. LƯU TỪNG Ô: máy chủ tính lại tổng tiền rồi
 * trả CẢ DÒNG — trình duyệt không tự tính tiền bao giờ.
 */

const vnd = (n: number) => (n ? n.toLocaleString("vi-VN") : "");
const dayShort = (d: string) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : "");

const STATUS_LABEL: Record<string, string> = {
  open: "CHỜ BAY",
  done: "ĐÃ BAY",
  cancelled: "ĐÃ HUỶ",
  voided: "BỎ SỔ",
};

function guestNamesOf(b: BookingDTO): string {
  const names = (b.otaGuests ?? []).map((g) => String(g.fullName || "").trim()).filter(Boolean);
  return names.length ? names.join("\n") : b.contactName || "";
}

/** Tổng đã trả — cọc gõ tay và lệnh thu là HAI CÁCH GHI cùng một dòng tiền. */
function paidOf(b: BookingDTO): number {
  const collected = (b.collected ?? []).reduce((t, c) => t + (c.amount || 0), 0);
  const refunded = b.refunded ?? 0;
  return Math.max(0, Math.max(0, (b.deposit || 0) - collected + refunded) + collected - refunded);
}

function cellText(b: BookingDTO, col: SheetCol): string {
  switch (col.key) {
    case "monthLabel":
      return b.flightDate ? `thg ${Number(b.flightDate.slice(5, 7))}` : "";
    case "flightDate":
      return dayShort(b.flightDate);
    case "guestNames":
      return guestNamesOf(b);
    case "pgGuests":
      return String(Math.max(0, (b.guestCount || 0) - (b.ppgGuests || 0)) || "");
    case "lineAmount":
      return vnd((b.unitPrice || 0) * (b.guestCount || 0));
    case "total":
      return vnd(b.totalAmount || 0);
    case "paid":
      return vnd(paidOf(b));
    default:
      break;
  }
  /** Điểm đón: tên bãi dài dòng rút về "Tự đến" — xem shortPickup. */
  if (col.key === "pickupNote") return shortPickup((b as unknown as Record<string, unknown>).pickupNote);
  /** Cột kế toán bên bảng tính mà app chưa quản — để TRỐNG, không bịa số. */
  if (col.ketToan) return "";
  const v = (b as unknown as Record<string, unknown>)[col.key];
  if (col.kind === "money") return vnd(Number(v) || 0);
  if (col.kind === "num") return Number(v) ? String(v) : "";
  if (col.kind === "status") return STATUS_LABEL[String(v)] ?? String(v ?? "");
  return String(v ?? "");
}

function editValueOf(b: BookingDTO, col: SheetCol): string {
  if (col.key === "guestNames") return guestNamesOf(b);
  if (col.key === "pgGuests") return String(Math.max(0, (b.guestCount || 0) - (b.ppgGuests || 0)) || "");
  if (col.kind === "money" || col.kind === "num") {
    const n = Number((b as unknown as Record<string, unknown>)[col.key]) || 0;
    return n ? String(n) : "";
  }
  return String((b as unknown as Record<string, unknown>)[col.key] ?? "");
}

export function BookingSheet({
  spot,
  date,
  open,
  closed,
  movedOut,
  tall,
  canEdit,
  canLock,
  onSaved,
  onAdded,
  renderQuick,
  renderClosedQuick,
  renderMovedActions,
  renderMore,
  renderInsurance,
  renderMoneyCell,
}: {
  spot: string;
  /** Ngày đang xem — nút "thêm hàng" tạo booking trống cho đúng ngày này. */
  date: string;
  open: BookingDTO[];
  closed: BookingDTO[];
  movedOut: BookingDTO[];
  tall?: boolean;
  canEdit: boolean;
  /** Kế toán/quản trị sửa được cả dòng đã khoá — họ là người khoá và mở khoá. */
  canLock?: boolean;
  onSaved: (b: BookingDTO) => void;
  onAdded: () => void;
  renderQuick?: (b: BookingDTO) => ReactNode;
  renderClosedQuick?: (b: BookingDTO) => ReactNode;
  renderMovedActions?: (b: BookingDTO) => ReactNode;
  renderMore?: (b: BookingDTO, close?: () => void) => ReactNode;
  renderInsurance?: (b: BookingDTO) => ReactNode;
  renderMoneyCell?: (b: BookingDTO) => ReactNode;
}) {
  const dests = useMemo(() => moneyDestsOf(spot).map((d) => ({ id: d.id, label: d.label })), [spot]);
  const cols = useMemo(() => sheetColumns(spot, dests, { thang: false }), [spot, dests]);
  const editCols = useMemo(() => cols.map((c, i) => (c.edit ? i : -1)).filter((i) => i >= 0), [cols]);
  const froze = useMemo(() => frozenCount(cols), [cols]);
  const offs = useMemo(() => frozenOffsets(cols, froze), [cols, froze]);
  const rows = useMemo(() => [...open, ...closed], [open, closed]);

  const [sel, setSel] = useState<{ r: number; c: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [strip, setStrip] = useState<{ id: string; what: "more" | "bh" } | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>(null);

  /** Toàn màn hình: lưới ăn hết chỗ còn lại — đo thật, không đoán bằng vh. */
  const { ref: boxRef, height } = useFillHeight(30, Boolean(tall));

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing, sel]);

  const lockedFor = useCallback((b: BookingDTO) => Boolean(b.locked) && !canLock, [canLock]);

  const startEdit = useCallback(
    (r: number, c: number) => {
      const b = rows[r];
      const col = cols[c];
      if (!b || !col?.edit || !canEdit || lockedFor(b)) return;
      setSel({ r, c });
      setDraft(editValueOf(b, col));
      setEditing(true);
    },
    [rows, cols, canEdit, lockedFor],
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
      const b = rows[r];
      const col = cols[c];
      if (!b || !col?.edit || value === editValueOf(b, col)) return;
      const key = `${b.id}:${col.edit}`;
      setSaving(key);
      setError(null);
      try {
        const res = await apiPatch<{ booking: BookingDTO }>(`/api/baocao/booking?spot=${spot}`, {
          id: b.id,
          action: "cell",
          field: col.edit,
          value,
        });
        onSaved(res.booking);
      } catch (e: unknown) {
        setError(
          `#${b.daySeq || "?"} ${b.contactName || b.phone || "khách"} — ô "${col.label || col.key}": ` +
            (e instanceof Error ? e.message : "không lưu được"),
        );
      } finally {
        setSaving((s) => (s === key ? null : s));
      }
    },
    [rows, cols, spot, onSaved],
  );

  /** THÊM HÀNG — dựng ngay một booking trống của ngày này rồi gõ tiếp vào nó. */
  async function addRow() {
    setAdding(true);
    setError(null);
    try {
      await apiPost(`/api/baocao/booking/blank?spot=${spot}`, { flightDate: date });
      onAdded();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không thêm được hàng");
    } finally {
      setAdding(false);
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
    /** Ô ghi chú xuống dòng bằng Shift+Enter; Enter trơn vẫn là "xong, xuống dòng dưới". */
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
  const totals = {
    guests: rows.reduce((t, b) => t + (b.guestCount || 0), 0),
    total: rows.reduce((t, b) => t + (b.totalAmount || 0), 0),
    remaining: rows.reduce((t, b) => t + (b.remaining || 0), 0),
  };

  /** Ô đóng băng: dán trái + nền đục + gạch mép để thấy rõ chỗ giáp phần cuộn. */
  const freezeStyle = (c: number): React.CSSProperties =>
    c < froze
      ? { position: "sticky", left: offs[c], zIndex: 6, boxShadow: c === froze - 1 ? "2px 0 0 0 rgb(100 116 139)" : undefined }
      : {};
  const headFreeze = (c: number): React.CSSProperties =>
    c < froze ? { position: "sticky", left: offs[c], zIndex: 26, boxShadow: c === froze - 1 ? "2px 0 0 0 rgb(100 116 139)" : undefined } : {};
  /** Bề ngang cả khối đóng băng — ô tiêu đề nhóm đầu tiên trùm đúng khối đó. */
  /** Bề ngang cả bảng = tổng số đã khai — để table-layout:fixed có mốc chắc chắn. */
  const totalW = cols.reduce((t, c) => t + c.w, 0) + 190;

  return (
    <div className="mt-2 space-y-1">
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
        className="overflow-auto rounded-lg border border-slate-300 bg-white"
        style={{ maxHeight: height ? `${height}px` : "68vh" }}
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
            {/* Cột thao tác: 190px = hai ô ~94px, vừa cho nhãn dài nhất ở 9px. */}
            <col style={{ width: 190 }} />
          </colgroup>

          <thead className="sticky top-0 z-20">
            {/* Hai hàng tiêu đề gộp ô — y như hàng 1 và 2 của bảng tính */}
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
              <th
                rowSpan={hasG2 ? 3 : 2}
                title="Thao tác"
                className="sticky right-0 z-30 border-b border-r border-slate-300 bg-slate-700 px-1 text-[10px] font-bold text-white"
              >
                ⚙
              </th>
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
                  style={headFreeze(i)}
                  title={c.title ?? (c.edit ? "Bấm vào ô để sửa" : "Máy tự tính — sửa ở ô gốc")}
                  className={
                    "border-b border-r border-slate-300 px-1 py-px text-[10px] font-bold " +
                    (c.right ? "text-right " : "text-left ") +
                    (c.edit ? "bg-slate-100 text-slate-700" : "bg-slate-200 text-slate-500")
                  }
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((b, r) => {
              const done = b.status !== "open";
              const rowBg = b.locked ? "bg-slate-100" : done ? "bg-slate-50" : "bg-white";
              return (
                <tr key={b.id}>
                  {cols.map((col, c) => {
                    const active = sel?.r === r && sel?.c === c;
                    const isEditing = active && editing && Boolean(col.edit);
                    const busy = saving === `${b.id}:${col.edit}`;
                    const finish = () => {
                      void commit(r, c, draft);
                      setEditing(false);
                    };
                    const editable = Boolean(col.edit) && !lockedFor(b);
                    return (
                      <td
                        key={col.key}
                        onClick={() => col.edit && startEdit(r, c)}
                        style={freezeStyle(c)}
                        className={
                          "border-b border-r border-slate-200 px-1 py-px align-top leading-tight " +
                          (busy ? "bg-amber-100 " : col.edit ? `${rowBg} ` : "bg-slate-50 text-slate-500 ") +
                          (col.right ? "text-right tabular-nums " : "") +
                          (editable ? "cursor-text " : "") +
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
                            /**
                             * Ô nhiều dòng: tên đoàn, ghi chú, điểm đón. Gõ dài
                             * mà bắt nằm một dòng thì cột phải nới rộng ra và
                             * đẩy hết phần tiền ra khỏi màn hình — thà cho ô cao
                             * lên vài dòng.
                             */
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
                            {cellText(b, col)}
                          </span>
                        )}
                      </td>
                    );
                  })}

                  {/**
                   * THAO TÁC — bày nút ra ngoài, xếp y như bên ▦ Bảng.
                   *
                   * Chưa bay thì LƯỚI HAI CỘT: [Thu tiền][In vé] · [Đã bay]
                   * [Cần gọi] · [⋯ Thêm]. Vị trí nút cố định nên tay bấm quen
                   * chỗ, khỏi nhìn. Đã bay/huỷ thì nút nhỏ bằng nửa và xếp một
                   * cột — dòng xong việc chỉ còn nút hoàn tác, hiếm khi bấm.
                   *
                   * Bấm ⋯ Thêm thì phần còn lại (bay không vé · sửa thu · dời
                   * lịch · huỷ · khoá · bảo hiểm) xổ ra ngay dưới dòng.
                   */}
                  <td className={"sticky right-0 z-10 border-b border-r border-slate-200 px-1 py-px align-top " + rowBg}>
                    <div
                      className={
                        /**
                         * NÚT CHO XUỐNG DÒNG và CHỮ NHỎ 9px.
                         *
                         * Nhãn ở đây dài hơn người ta tưởng vì nó gánh cả vệt
                         * truy vết: "🎫 đã xuất vé by Mai Hoàn 08:56",
                         * "☎ Đã LH by Hoàn ✓", "☎ Cần gọi xác nhận". Ép một
                         * hàng (`whitespace-nowrap`) là chữ tràn khỏi viền nút
                         * và đè sang cột bên — đúng thứ đang thấy trên sổ.
                         *
                         * Ba thứ cùng lúc mới đủ: cho bẻ dòng, cho bẻ cả trong
                         * từ (`break-words`, phòng tên dài không dấu cách), và
                         * `overflow-hidden` chặn phần thừa nếu vẫn còn. Không
                         * cắt cụt bằng `truncate`: nhãn nút mà cụt thì người ta
                         * bấm bằng đoán.
                         */
                        "gap-0.5 [&_button]:!h-auto [&_button]:!min-h-5 [&_button]:!px-1 [&_button]:!py-0.5 [&_button]:!text-[9px] [&_button]:!leading-tight [&_button]:whitespace-normal [&_button]:break-words [&_button]:overflow-hidden " +
                        (done
                          ? "flex w-[76px] flex-col items-stretch [&_button]:justify-center [&_button]:text-center"
                          : "grid grid-cols-2 items-start [&_button]:w-full [&_button]:justify-center [&_button]:text-center")
                      }
                    >
                      {/**
                       * Ô THU TIỀN luôn CHIẾM CHỖ dù không có nút.
                       *
                       * Booking thu đủ rồi thì nút biến mất; nếu để ô đó xẹp
                       * theo thì ba nút còn lại dồn lên một bậc — dòng này
                       * "In vé" nằm góc trái, dòng kia lại là "Đã bay", và tay
                       * đang bấm nhanh thì bấm nhầm. Chừa ô trống 76px đắt hơn
                       * một cú tích nhầm "đã bay".
                       */}
                      {done ? renderMoneyCell?.(b) : <span>{renderMoneyCell?.(b)}</span>}
                      {done ? renderClosedQuick?.(b) : renderQuick?.(b)}
                      <button
                        type="button"
                        title="Các chức năng còn lại: bay không vé · sửa thu · dời lịch · huỷ · khoá · bảo hiểm"
                        onClick={() => setStrip((x) => (x?.id === b.id ? null : { id: b.id, what: "more" }))}
                        className={
                          "h-5 rounded border px-1 text-[10px] font-bold " +
                          (strip?.id === b.id ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white text-slate-700")
                        }
                      >
                        ⋯ Thêm
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {/* Dải thao tác đầy đủ — trải hết bề ngang, ngay dưới đúng dòng vừa bấm */}
            {rows.map((b) =>
              strip?.id === b.id ? (
                <tr key={`s-${b.id}`}>
                  <td colSpan={cols.length + 1} className="border-b border-r border-slate-200 bg-sky-50/70 px-2 py-1.5">
                    <div className="mb-1 flex flex-wrap items-center gap-1">
                      <span className="mr-1 text-[11px] font-bold text-sky-900">
                        #{b.daySeq || "?"} {b.contactName || b.phone || "khách"}
                      </span>
                      {/* Nút nhanh đã nằm ngoài dòng rồi — ở đây chỉ còn phần "thêm" */}
                      {renderInsurance && (
                        <button
                          type="button"
                          onClick={() => setStrip({ id: b.id, what: strip.what === "bh" ? "more" : "bh" })}
                          className={
                            "h-7 rounded-lg border px-2 text-[11px] font-semibold " +
                            (strip.what === "bh"
                              ? "border-violet-600 bg-violet-600 text-white"
                              : "border-violet-300 bg-violet-50 text-violet-800")
                          }
                        >
                          Bảo hiểm
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setStrip(null)}
                        className="ml-auto rounded px-1.5 text-[11px] font-semibold text-slate-500 hover:underline"
                      >
                        ✕ Đóng
                      </button>
                    </div>
                    {strip.what === "bh" ? renderInsurance?.(b) : renderMore?.(b, () => setStrip(null))}
                  </td>
                </tr>
              ) : null,
            )}

            {movedOut.map((b) => (
              <tr key={`m-${b.id}`}>
                <td colSpan={cols.length} className="border-b border-r border-slate-200 bg-amber-50 px-1 py-px leading-tight text-amber-900">
                  #{b.daySeq || "?"} {b.contactName || b.phone || "khách"} — <strong>đã dời sang ngày khác</strong>
                </td>
                <td className="sticky right-0 z-10 border-b border-r border-slate-200 bg-amber-50 px-0.5 py-px">{renderMovedActions?.(b)}</td>
              </tr>
            ))}

            {/* THÊM HÀNG — dòng cuối, đúng chỗ tay đang đặt sau khi gõ xong dòng trên */}
            {canEdit && (
              <tr>
                <td colSpan={cols.length + 1} className="border-b border-r border-slate-200 bg-white px-1 py-0.5">
                  <button
                    type="button"
                    disabled={adding}
                    onClick={() => void addRow()}
                    className="rounded border border-dashed border-slate-400 px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:border-sky-500 hover:text-sky-700 disabled:opacity-50"
                  >
                    {adding ? "Đang thêm…" : `+ Thêm hàng · ngày ${dayShort(date)}`}
                  </button>
                </td>
              </tr>
            )}

            {!rows.length && !movedOut.length && (
              <tr>
                <td colSpan={cols.length + 1} className="px-3 py-5 text-center text-slate-500">
                  Ngày này chưa có booking nào.
                </td>
              </tr>
            )}
          </tbody>

          {rows.length > 0 && (
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
                        ? totals.guests
                        : c.key === "total"
                          ? vnd(totals.total)
                          : c.key === "remaining"
                            ? vnd(totals.remaining)
                            : ""}
                  </td>
                ))}
                <td className="sticky right-0 z-10 border-b border-r border-slate-600 bg-slate-800" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <p className="text-[10px] leading-tight text-slate-500">
        Bấm ô để sửa · <strong>Tab</strong> sang ô bên · <strong>Enter</strong>/<strong>↑↓</strong> chạy dọc ·{" "}
        <strong>Shift+Enter</strong> xuống dòng trong ô ghi chú · <strong>Esc</strong> bỏ dở · <strong>⋯</strong> mở đủ nút.
        {froze} cột đầu đứng yên khi cuộn ngang; ô nền xám là máy tự tính.
      </p>
    </div>
  );
}
