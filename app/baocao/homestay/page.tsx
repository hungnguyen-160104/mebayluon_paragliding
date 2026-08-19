// app/baocao/homestay/page.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { formatDateKeyVN, shiftDateKey, todayInVN } from "@/lib/baobay/date";
import {
  BOARD_COLUMN_ORDER,
  COMBO_COMPONENTS,
  HOMESTAY_ROOMS,
  ROOM_SHORT_VI,
  WHOLE_HOME_ID,
  homestayRoom,
  isComboRoom,
  roomUnitLabel,
} from "@/lib/baobay/homestay";
import { formatVND } from "@/lib/pricing";

import { apiGet, apiPatch, apiPost } from "../components/client-api";
import { useBaobaySession } from "../components/session";
import { Shell } from "../components/Shell";
import {
  Banner,
  Button,
  Card,
  CollapseCard,
  CountInput,
  Field,
  MoneyInput,
  PageLoading,
  TextInput,
} from "../components/ui";

/**
 * SỔ PHÒNG HOMESTAY của kế toán (Clubhouse Mebayluon — Mù Cang Chải).
 *
 * Trên cùng là BẢNG PHÒNG 14 ĐÊM: mỗi hàng một hạng phòng, mỗi ô một đêm —
 * nhìn màu là biết đêm nào trống, đêm nào vơi, đêm nào kín. Dưới là SỔ ĐẶT
 * PHÒNG từ ba cửa: thư OTA (Agoda…, máy tự đọc từ hộp mebayluon@gmail.com),
 * khách đặt web /homestay/dat-phong, và kế toán nhập tay (điện thoại, B2B).
 *
 * Thư máy không bóc trọn không bao giờ bị vứt — nó nằm trong KHAY CẦN SOÁT
 * kèm nguyên văn, kế toán đọc rồi duyệt vào lịch hoặc xoá.
 */

type BookingDTO = {
  id: string;
  source: string;
  ref: string;
  guestName: string;
  phone: string;
  email: string;
  country: string;
  roomTypeId: string;
  roomLabel: string;
  rooms: number;
  adults: number;
  children: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  amount: number;
  netAmount: number;
  prepaid: boolean;
  collect: number;
  collected: number;
  status: string;
  reviewReason?: string;
  raw?: string;
  note: string;
  createdAt: string;
};

type Overview = {
  board: { dates: string[]; rooms: Array<{ id: string; units: number; free: number[] }> };
  boardBookings: BookingDTO[];
  bookings: BookingDTO[];
  review: BookingDTO[];
  mailSyncAt: string;
};

const SOURCE_BADGE: Record<string, { label: string; cls: string }> = {
  agoda: { label: "Agoda", cls: "bg-rose-100 text-rose-800" },
  airbnb: { label: "Airbnb", cls: "bg-pink-100 text-pink-800" },
  booking: { label: "Booking", cls: "bg-blue-100 text-blue-800" },
  trip: { label: "Trip.com", cls: "bg-indigo-100 text-indigo-800" },
  traveloka: { label: "Traveloka", cls: "bg-cyan-100 text-cyan-800" },
  klook: { label: "Klook", cls: "bg-orange-100 text-orange-800" },
  web: { label: "Web", cls: "bg-emerald-100 text-emerald-800" },
  b2b: { label: "B2B", cls: "bg-violet-100 text-violet-800" },
  manual: { label: "Nhập tay", cls: "bg-slate-200 text-slate-700" },
};

function SourceBadge({ source }: { source: string }) {
  const b = SOURCE_BADGE[source] ?? { label: source, cls: "bg-slate-100 text-slate-600" };
  return <span className={"shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold " + b.cls}>{b.label}</span>;
}

/** "2026-08-15" -> "Thứ 7, 15/08" — đúng kiểu cột ngày trong bảng tính cũ của nhà. */
function dayRowLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const thu = dow === 0 ? "CN" : `Thứ ${dow + 1}`;
  return `${thu}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

function isWeekend(key: string): boolean {
  const [y, m, d] = key.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return dow === 0 || dow === 6;
}

/**
 * XẾP BOOKING VÀO TỪNG PHÒNG THẬT để vẽ bảng kiểu sổ (cột = phòng, ô = tên
 * khách). Booking chỉ ghi HẠNG phòng + số lượng, không ghi phòng số mấy — nên
 * máy tự xếp: duyệt theo ngày nhận phòng, nhét vào phòng trống đầu tiên còn
 * rảnh TRỌN kỳ ở, để một khách nằm nguyên một cột suốt kỳ (đúng thói quen đọc
 * bảng tính cũ). Xếp không nổi (trùng kỳ quá tay) thì booking vào danh sách
 * cảnh báo chứ không lặng lẽ biến mất.
 */
type BoardGrid = {
  /** grid[roomTypeId][unitIndex] = các booking đã xếp vào phòng đó. */
  grid: Map<string, BookingDTO[][]>;
  /** Đêm nào cả nhà bị khoá nguyên căn thì ghi booking đó vào đây. */
  wholeByDate: Map<string, BookingDTO>;
  /** Danh sách khách sàn cộng đồng theo đêm. */
  dormByDate: Map<string, BookingDTO[]>;
  overbooked: BookingDTO[];
};

function overlaps(b: BookingDTO, others: BookingDTO[]): boolean {
  return others.some((o) => b.checkIn < o.checkOut && o.checkIn < b.checkOut);
}

function buildBoardGrid(dates: string[], bookings: BookingDTO[]): BoardGrid {
  const raw = bookings.filter((b) => b.status === "confirmed" && b.checkIn && b.checkOut);
  /**
   * COMBO (trừ nguyên khu — nó có dải đỏ riêng) bung thành các phòng THÀNH
   * PHẦN chiếm trọn: "Sàn + 4 gác mái" vẽ kín cột sàn lẫn bốn cột gác mái,
   * cùng một màu vì cùng id booking.
   */
  const active = raw.flatMap((b) => {
    if (!isComboRoom(b.roomTypeId) || b.roomTypeId === WHOLE_HOME_ID) return [b];
    return COMBO_COMPONENTS[b.roomTypeId].map((id) => ({
      ...b,
      roomTypeId: id,
      rooms: homestayRoom(id)?.units ?? 1,
    }));
  });
  const grid = new Map<string, BookingDTO[][]>();
  const wholeByDate = new Map<string, BookingDTO>();
  const dormByDate = new Map<string, BookingDTO[]>();
  const overbooked: BookingDTO[] = [];

  for (const b of active.filter((x) => x.roomTypeId === WHOLE_HOME_ID)) {
    for (const d of dates) if (b.checkIn <= d && d < b.checkOut) wholeByDate.set(d, b);
  }
  for (const b of active.filter((x) => x.roomTypeId === "dormitory")) {
    for (const d of dates) {
      if (b.checkIn <= d && d < b.checkOut) (dormByDate.get(d) ?? dormByDate.set(d, []).get(d)!).push(b);
    }
  }

  for (const roomId of BOARD_COLUMN_ORDER) {
    if (roomId === "dormitory") continue;
    const units = homestayRoom(roomId)?.units ?? 1;
    const cols: BookingDTO[][] = Array.from({ length: units }, () => []);
    const mine = active
      .filter((b) => b.roomTypeId === roomId)
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn) || a.createdAt.localeCompare(b.createdAt));
    for (const b of mine) {
      let need = Math.max(1, b.rooms || 1);
      for (let u = 0; u < units && need > 0; u++) {
        if (!overlaps(b, cols[u])) {
          cols[u].push(b);
          need--;
        }
      }
      if (need > 0) overbooked.push(b);
    }
    grid.set(roomId, cols);
  }
  return { grid, wholeByDate, dormByDate, overbooked };
}

/** Mỗi booking một màu nhạt cố định (băm theo id) — nhìn khối màu là biết cùng một khách. */
const CELL_COLORS = [
  "bg-cyan-100 text-cyan-900",
  "bg-amber-100 text-amber-900",
  "bg-fuchsia-100 text-fuchsia-900",
  "bg-emerald-100 text-emerald-900",
  "bg-violet-100 text-violet-900",
  "bg-orange-100 text-orange-900",
  "bg-sky-100 text-sky-900",
  "bg-lime-100 text-lime-900",
  "bg-rose-100 text-rose-900",
] as const;

function cellColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CELL_COLORS[h % CELL_COLORS.length];
}

/** Nhãn trong ô: nguồn + tên khách + mã — kiểu "Agoda Cường 1754233687" của sổ cũ. */
function cellLabel(b: BookingDTO): string {
  const src = b.source === "web" ? "Web" : b.source === "manual" ? "" : SOURCE_BADGE[b.source]?.label ?? b.source;
  return [src, b.guestName || b.ref].filter(Boolean).join(" ");
}

export default function HomestayPage() {
  const { user, loading } = useBaobaySession("accountant");
  const today = todayInVN();
  const [from, setFrom] = useState(today);
  /** Mốc cuối khung xem — mặc định một tháng; nút "Thêm 30 ngày" nối dài dần. */
  const [to, setTo] = useState(shiftDateKey(today, 30));
  const [data, setData] = useState<Overview | null>(null);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  /** Số đêm của khung xem — máy chủ chặn trần 180. */
  const nightsCount = Math.max(
    7,
    Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000),
  );

  const load = useCallback(() => {
    apiGet<Overview>(`/api/baocao/homestay?from=${from}&nights=${nightsCount}`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Không tải được sổ phòng"));
  }, [from, nightsCount]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  /** Quét hộp thư — lần đầu đọc cả tràng thư cũ nên có thể mất nửa phút. */
  async function syncMail() {
    setSyncing(true);
    setError(null);
    setMsg(null);
    try {
      const r = await apiPatch<{ sync: { scanned: number; created: number; cancelled: number; review: number; errors: string[] } }>(
        `/api/baocao/homestay`,
        { action: "sync-mail" },
      );
      const s = r.sync;
      setMsg(
        `✓ Quét ${s.scanned} thư — thêm ${s.created} đặt phòng, ${s.cancelled} huỷ, ${s.review} cần soát.` +
          (s.errors.length ? ` ${s.errors.length} thư lỗi.` : ""),
      );
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không quét được hộp thư");
    } finally {
      setSyncing(false);
    }
  }

  /**
   * GHI NHANH TỪ Ô SỔ PHÒNG — gõ chữ vào ô trống là phòng đó KÍN đêm đó:
   * mỗi ô thành một booking nhập tay 1 đêm (tên = chữ vừa gõ), nên trang đặt
   * phòng của khách cũng thấy kín ngay. Ô nhập tay sửa lại được, xoá chữ là
   * trả phòng trống; ô từ thư OTA/web thì sửa ở sổ đặt phòng bên dưới.
   */
  async function quickCell(roomTypeId: string, date: string, text: string, existing?: BookingDTO) {
    const name = text.trim();
    setBusy(true);
    setError(null);
    try {
      if (existing) {
        if (!name) {
          if (!window.confirm(`Trả trống ô "${existing.guestName || existing.ref}"?`)) return;
          await apiPatch(`/api/baocao/homestay`, { action: "delete", id: existing.id });
        } else if (name !== existing.guestName) {
          await apiPatch(`/api/baocao/homestay`, { action: "rename", id: existing.id, guestName: name });
        } else {
          return;
        }
      } else {
        if (!name) return;
        await apiPost(`/api/baocao/homestay`, {
          source: "manual",
          ref: "",
          guestName: name,
          phone: "",
          lines: [{ roomTypeId, qty: 1 }],
          adults: 0,
          children: 0,
          checkIn: date,
          checkOut: shiftDateKey(date, 1),
          amount: 0,
          prepaid: true,
          note: "ghi nhanh từ sổ phòng",
        });
      }
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không ghi được vào ô");
    } finally {
      setBusy(false);
    }
  }

  async function act(id: string, action: string, payload: Record<string, unknown> = {}) {
    setBusy(true);
    setError(null);
    try {
      await apiPatch(`/api/baocao/homestay`, { action, id, ...payload });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xử lý được");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) return <PageLoading />;

  const bookings = data?.bookings ?? [];
  const review = data?.review ?? [];
  const collectTotal = bookings.reduce((t, b) => t + (b.collect || 0), 0);

  return (
    <Shell user={user} title="Homestay">
      {error && <Banner tone="error">{error}</Banner>}
      {msg && (
        <Banner tone="success" onClose={() => setMsg(null)}>
          {msg}
        </Banner>
      )}

      {/* ---- LẤY THƯ + chọn mốc xem bảng ---- */}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" className="h-10 bg-sky-600 px-4 hover:bg-sky-700" disabled={syncing} onClick={syncMail}>
          {syncing ? "Đang quét hộp thư…" : "📥 Lấy thư đặt phòng (Agoda, Airbnb…)"}
        </Button>
        <span className="text-[11px] text-slate-500">
          {data?.mailSyncAt
            ? `Quét lần cuối ${new Date(data.mailSyncAt).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}`
            : "Chưa quét hộp thư lần nào"}
        </span>
        {/* Chọn KHOẢNG thời gian xem — book đoàn hay hỏi lịch cách vài tháng */}
        <span className="ml-auto flex flex-wrap items-center gap-1 text-xs text-slate-600">
          Xem từ
          <input
            type="date"
            value={from}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              setFrom(v);
              if (to <= v) setTo(shiftDateKey(v, 30));
            }}
            className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm"
          />
          đến
          <input
            type="date"
            value={to}
            min={shiftDateKey(from, 7)}
            onChange={(e) => e.target.value && e.target.value > from && setTo(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm"
          />
          <Button
            type="button"
            variant="ghost"
            className="h-9 bg-white px-2 text-xs"
            onClick={() => {
              setFrom(today);
              setTo(shiftDateKey(today, 30));
            }}
          >
            Hôm nay
          </Button>
        </span>
      </div>

      {/* ---- BẢNG SỔ PHÒNG: hàng = ngày, cột = từng phòng thật ---- */}
      <BoardCard
        dates={data?.board.dates ?? []}
        bookings={data?.boardBookings ?? []}
        today={today}
        onQuick={quickCell}
        onExtend={nightsCount < 180 ? () => setTo(shiftDateKey(to, 30)) : undefined}
      />

      {/* ---- KHAY CẦN SOÁT — mở sẵn nhưng gập lại được, desktop hai cột ---- */}
      {review.length > 0 && (
        <CollapseCard
          open
          className="border-amber-400 bg-amber-50"
          headerClassName="text-amber-900"
          title={`⚠ ${review.length} thư cần soát tay`}
          hint="đọc thư gốc rồi duyệt vào lịch hoặc xoá"
        >
          <ul className="grid gap-2 @2xl:grid-cols-2">
            {review.map((b) => (
              <ReviewRow key={b.id} b={b} busy={busy} onAct={act} />
            ))}
          </ul>
        </CollapseCard>
      )}

      {/* ---- NHẬP TAY ---- */}
      <ManualCard onSaved={load} />

      {/* ---- SỔ ĐẶT PHÒNG — mở sẵn nhưng gập lại được, desktop hai cột ---- */}
      <CollapseCard
        open
        title={`Sổ đặt phòng (${bookings.length})`}
        hint={collectTotal > 0 ? `còn phải thu tại nhà ${formatVND(collectTotal)}` : "các booking chưa trả phòng"}
      >
        {bookings.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có đặt phòng nào — bấm “Lấy thư đặt phòng” để quét hộp thư.</p>
        ) : (
          <ul className="grid gap-2 @2xl:grid-cols-2">
            {bookings.map((b) => (
              <BookingRow key={b.id} b={b} busy={busy} onAct={act} />
            ))}
          </ul>
        )}
      </CollapseCard>
    </Shell>
  );
}

/* ================================================================== */
/* BẢNG SỔ PHÒNG — bố cục y bảng tính cũ của nhà                        */
/* ================================================================== */

function BoardCard({
  dates,
  bookings,
  today,
  onQuick,
  onExtend,
}: {
  dates: string[];
  bookings: BookingDTO[];
  today: string;
  onQuick: (roomTypeId: string, date: string, text: string, existing?: BookingDTO) => void;
  /** Nối dài khung xem thêm 30 ngày — hết trần (180 đêm) thì không truyền. */
  onExtend?: () => void;
}) {
  const { grid, wholeByDate, dormByDate, overbooked } = buildBoardGrid(dates, bookings);
  /** Ô đang gõ — "roomId:unit:date"; mỗi lúc một ô cho nhẹ bảng. */
  const [editing, setEditing] = useState<string | null>(null);
  /** Bấm Esc thì bỏ, không lưu — cờ đặt trước khi blur chạy. */
  const cancelRef = useRef(false);

  /** Ô nhập tay được: trống, hoặc đang chứa bản ghi nhập tay/b2b. */
  const editable = (b?: BookingDTO) => !b || b.source === "manual" || b.source === "b2b";

  const CellInput = ({ initial, onDone }: { initial: string; onDone: (text: string | null) => void }) => (
    <input
      autoFocus
      defaultValue={initial}
      onFocus={(e) => e.target.select()}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          cancelRef.current = true;
          (e.target as HTMLInputElement).blur();
        }
      }}
      onBlur={(e) => {
        const cancelled = cancelRef.current;
        cancelRef.current = false;
        onDone(cancelled ? null : e.target.value);
      }}
      className="w-full rounded border border-sky-400 bg-white px-0.5 py-0.5 text-[10px] font-semibold outline-none"
    />
  );

  /** Cột phẳng: mỗi phòng thật một cột, giữ thứ tự nhóm của bảng tính cũ. */
  const columns = BOARD_COLUMN_ORDER.flatMap((roomId) => {
    const room = homestayRoom(roomId)!;
    const n = roomId === "dormitory" ? 1 : room.units;
    return Array.from({ length: n }, (_, u) => ({ roomId, u, room }));
  });

  /** Tra booking đang nằm ở (phòng, đêm) — grid đã xếp sẵn theo cột. */
  const at = (roomId: string, u: number, d: string): BookingDTO | undefined =>
    grid.get(roomId)?.[u]?.find((b) => b.checkIn <= d && d < b.checkOut);

  return (
    <Card
      title={`Sổ phòng ${dates.length} đêm`}
      hint="mỗi cột một phòng thật — ô ghi tên khách, trống là còn phòng · bao nguyên nhà sàn phủ đỏ cả hàng"
    >
      {/* table-fixed + không đặt min-width: bảng CO cho lọt chiều ngang màn
          hình, khỏi kéo sang ngang — chữ dài thì cắt bớt, rê chuột đọc đủ. */}
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-center text-xs">
          <colgroup>
            <col className="w-[86px]" />
            {columns.map((c) => (
              <col key={`${c.roomId}:${c.u}`} />
            ))}
          </colgroup>
          <thead>
            {/* Hàng 1: tên phòng · Hàng 2: công suất (người) · Hàng 3: đơn giá — y bảng tính cũ */}
            <tr>
              <th className="sticky left-0 z-10 bg-white py-1 pr-2 text-left font-semibold text-slate-700">Ngày</th>
              {columns.map((c) => (
                <th
                  key={`${c.roomId}:${c.u}`}
                  className="truncate border border-slate-200 bg-slate-50 px-0.5 py-1 text-[11px] font-bold text-slate-800"
                  title={roomUnitLabel(c.roomId, c.u)}
                >
                  {roomUnitLabel(c.roomId, c.u)}
                </th>
              ))}
            </tr>
            <tr>
              <th className="sticky left-0 z-10 bg-white py-0.5 pr-2 text-left text-[10px] font-medium text-slate-400">
                Công suất (người)
              </th>
              {columns.map((c) => (
                <th key={`${c.roomId}:${c.u}`} className="border border-slate-200 bg-slate-50/60 py-0.5 text-[10px] font-semibold text-slate-500">
                  {/* Sàn cộng đồng: 14 đệm tối đa nhưng Ở TỐT NHẤT 10 — ghi cả hai */}
                  {c.roomId === "dormitory" && c.room.comfort ? `${c.room.comfort}–${c.room.units}` : c.roomId === "dormitory" ? c.room.units : c.room.maxAdults}
                </th>
              ))}
            </tr>
            <tr>
              <th className="sticky left-0 z-10 bg-white py-0.5 pr-2 text-left text-[10px] font-medium text-slate-400">Đơn giá</th>
              {columns.map((c) => (
                <th key={`${c.roomId}:${c.u}`} className="border border-slate-200 bg-slate-50/60 py-0.5 text-[10px] font-bold tabular-nums text-rose-600">
                  {(c.room.pricePerNight / 1000).toLocaleString("vi-VN")}k
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dates.map((d) => {
              const whole = wholeByDate.get(d);
              const weekend = isWeekend(d);
              const dayCell = (
                <td
                  className={
                    "sticky left-0 z-10 truncate border border-slate-200 py-1 pl-1 pr-1 text-left text-[10px] font-semibold " +
                    (d === today ? "bg-sky-100 text-sky-800" : weekend ? "bg-emerald-50 text-slate-700" : "bg-white text-slate-700")
                  }
                >
                  {dayRowLabel(d)}
                </td>
              );
              /* Nguyên khu tầng 2 / khoá sự kiện: dải đỏ phủ mọi cột TRỪ Gia đình —
                 phòng gia đình khép kín không nằm trong khu, vẫn bán song song được */
              if (whole) {
                const gd = at("whole-home-small", 0, d);
                return (
                  <tr key={d}>
                    {dayCell}
                    <td
                      colSpan={columns.length - 1}
                      className="border border-rose-300 bg-rose-600 py-1.5 text-sm font-bold text-white"
                      title={`${cellLabel(whole)} · ${formatDateKeyVN(whole.checkIn)} → ${formatDateKeyVN(whole.checkOut)}`}
                    >
                      {cellLabel(whole)} — bao nguyên nhà sàn
                    </td>
                    <td
                      className={
                        "truncate border border-slate-200 px-0.5 py-1 text-[10px] font-semibold " +
                        (gd ? cellColor(gd.id) : weekend ? "bg-emerald-50/40" : "")
                      }
                      title={gd ? `${cellLabel(gd)} · ${formatDateKeyVN(gd.checkIn)} → ${formatDateKeyVN(gd.checkOut)}` : "Phòng gia đình vẫn trống"}
                    >
                      {gd ? cellLabel(gd) : ""}
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={d}>
                  {dayCell}
                  {columns.map((c) => {
                    if (c.roomId === "dormitory") {
                      const list = dormByDate.get(d) ?? [];
                      const taken = list.reduce((t, b) => t + Math.max(1, b.rooms || 1), 0);
                      const key = `${c.roomId}:0:${d}`;
                      // Một khách nhập tay duy nhất thì cho sửa thẳng; đông hơn thì chỉ ghi thêm
                      const solo = list.length === 1 && editable(list[0]) ? list[0] : undefined;
                      return (
                        <td
                          key={`${c.roomId}:${c.u}`}
                          onClick={() => setEditing(key)}
                          className={
                            "cursor-text truncate border border-slate-200 px-0.5 py-1 text-[10px] font-semibold hover:outline hover:outline-1 hover:outline-sky-300 " +
                            (taken ? "bg-cyan-50 text-cyan-900" : weekend ? "bg-emerald-50/40" : "")
                          }
                          title={
                            (list.map((b) => `${cellLabel(b)} (${b.rooms} chỗ)`).join(" · ") || "Sàn trống") +
                            " · bấm để ghi"
                          }
                        >
                          {editing === key ? (
                            <CellInput
                              initial={solo ? solo.guestName || solo.ref : ""}
                              onDone={(text) => {
                                setEditing(null);
                                if (text !== null) onQuick("dormitory", d, text, solo);
                              }}
                            />
                          ) : taken > 0 ? (
                            `${list.map(cellLabel).join(", ")} · ${taken}/${c.room.units}`
                          ) : (
                            ""
                          )}
                        </td>
                      );
                    }
                    const b = at(c.roomId, c.u, d);
                    const key = `${c.roomId}:${c.u}:${d}`;
                    return (
                      <td
                        key={`${c.roomId}:${c.u}`}
                        onClick={() => editable(b) && setEditing(key)}
                        className={
                          "truncate border border-slate-200 px-0.5 py-1 text-[10px] font-semibold " +
                          (b ? cellColor(b.id) : weekend ? "bg-emerald-50/40 " : "") +
                          (editable(b) ? " cursor-text hover:outline hover:outline-1 hover:outline-sky-300" : "")
                        }
                        title={
                          b
                            ? `${cellLabel(b)} · ${formatDateKeyVN(b.checkIn)} → ${formatDateKeyVN(b.checkOut)}` +
                              (b.prepaid ? "" : b.collect > 0 ? ` · còn thu ${formatVND(b.collect)}` : "") +
                              (editable(b) ? " · bấm để sửa (xoá chữ = trả trống)" : " · booking OTA/web — sửa ở sổ bên dưới")
                            : `${roomUnitLabel(c.roomId, c.u)} trống đêm ${formatDateKeyVN(d)} — bấm để ghi`
                        }
                      >
                        {editing === key ? (
                          <CellInput
                            initial={b ? b.guestName || b.ref : ""}
                            onDone={(text) => {
                              setEditing(null);
                              if (text !== null) onQuick(c.roomId, d, text, b);
                            }}
                          />
                        ) : b ? (
                          cellLabel(b)
                        ) : (
                          ""
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {onExtend && (
        <Button type="button" variant="ghost" className="mt-2 h-9 w-full border-dashed bg-white text-xs" onClick={onExtend}>
          ＋ Thêm 30 ngày
        </Button>
      )}
      {overbooked.length > 0 && (
        <p className="mt-2 text-[11px] font-bold text-rose-700">
          ⚠ {overbooked.length} booking không xếp nổi vào phòng (trùng kỳ quá số phòng):{" "}
          {overbooked.map((b) => `${cellLabel(b)} (${formatDateKeyVN(b.checkIn)})`).join(" · ")} — kiểm lại kẻo nhận quá tay.
        </p>
      )}
    </Card>
  );
}

/* ================================================================== */
/* Một dòng sổ                                                          */
/* ================================================================== */

function BookingRow({
  b,
  busy,
  onAct,
}: {
  b: BookingDTO;
  busy: boolean;
  onAct: (id: string, action: string, payload?: Record<string, unknown>) => void;
}) {
  const staying = b.checkIn <= todayInVN() && todayInVN() < b.checkOut;
  return (
    <li className="rounded-xl border border-slate-200 bg-white px-2.5 py-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <SourceBadge source={b.source} />
        <strong className="text-sm text-slate-900">{b.guestName || b.ref || "khách"}</strong>
        {b.ref && <span className="text-[11px] text-slate-400">#{b.ref}</span>}
        <span className="text-xs text-slate-600">
          {formatDateKeyVN(b.checkIn)} → {formatDateKeyVN(b.checkOut)} · {b.nights} đêm
        </span>
        <span className="text-xs font-medium text-slate-700">
          {b.roomTypeId ? ROOM_SHORT_VI[b.roomTypeId] : ""}
          {b.rooms > 1 ? ` ×${b.rooms}` : ""}
          {b.roomLabel && b.roomLabel !== b.roomTypeId ? ` (${b.roomLabel})` : ""}
        </span>
        {staying && <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-800">đang ở</span>}
        <span className="ml-auto text-right">
          <span className="block text-sm font-bold tabular-nums text-slate-900">{formatVND(b.amount)}</span>
          {b.prepaid ? (
            <span className="text-[10px] font-semibold text-emerald-700">
              OTA trả trước{b.netAmount ? ` · về TK ${formatVND(b.netAmount)}` : ""}
            </span>
          ) : b.collect > 0 ? (
            <span className="text-[10px] font-bold text-rose-700">còn thu {formatVND(b.collect)}</span>
          ) : (
            <span className="text-[10px] font-semibold text-emerald-700">đã thu đủ</span>
          )}
        </span>
      </div>
      {(b.adults > 0 || b.note || b.phone) && (
        <div className="mt-0.5 text-[11px] text-slate-500">
          {[
            b.adults > 0 ? `${b.adults} NL${b.children ? ` + ${b.children} TE` : ""}` : "",
            b.phone,
            b.country,
            b.note,
          ]
            .filter(Boolean)
            .join(" · ")}
        </div>
      )}
      <div className="mt-1 flex flex-wrap gap-1.5">
        {/* Máy không đoán được hạng phòng: bắt gán ngay tại dòng — chưa gán thì bảng phòng không trừ */}
        {!b.roomTypeId && (
          <select
            defaultValue=""
            disabled={busy}
            onChange={(e) => e.target.value && onAct(b.id, "assign-room", { roomTypeId: e.target.value })}
            className="h-7 rounded-lg border-2 border-amber-400 bg-amber-50 px-1.5 text-[11px] font-bold text-amber-900"
          >
            <option value="">⚠ Gán hạng phòng…</option>
            {HOMESTAY_ROOMS.map((r) => (
              <option key={r.id} value={r.id}>
                {ROOM_SHORT_VI[r.id]}
              </option>
            ))}
          </select>
        )}
        {!b.prepaid && b.collect > 0 && (
          <Button
            type="button"
            variant="ghost"
            className="h-7 bg-white px-2 text-[11px] font-bold text-emerald-700"
            disabled={busy}
            onClick={() => {
              const raw = window.prompt(`Thu bao nhiêu? (còn ${b.collect.toLocaleString("vi-VN")} đ)`, String(b.collect));
              const amount = Number((raw ?? "").replace(/\D/g, ""));
              if (amount > 0) onAct(b.id, "collect", { amount });
            }}
          >
            💵 Ghi thu
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          className="h-7 bg-white px-2 text-[11px]"
          disabled={busy}
          onClick={() => {
            const note = window.prompt("Ghi chú cho booking này", b.note);
            if (note !== null) onAct(b.id, "note", { note });
          }}
        >
          Ghi chú
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-7 bg-white px-2 text-[11px] text-rose-700"
          disabled={busy}
          onClick={() => {
            if (window.confirm(`Huỷ đặt phòng của ${b.guestName || b.ref}?`)) onAct(b.id, "cancel");
          }}
        >
          ✕ Huỷ
        </Button>
      </div>
    </li>
  );
}

/** Thư trong khay soát: hiện lý do + trích thư, kế toán gán phòng rồi duyệt. */
function ReviewRow({
  b,
  busy,
  onAct,
}: {
  b: BookingDTO;
  busy: boolean;
  onAct: (id: string, action: string, payload?: Record<string, unknown>) => void;
}) {
  const [roomTypeId, setRoomTypeId] = useState(b.roomTypeId);
  const canConfirm = Boolean(b.checkIn && b.checkOut && roomTypeId);
  return (
    <li className="rounded-xl bg-white p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <SourceBadge source={b.source} />
        <strong className="text-sm text-slate-900">{b.guestName || b.ref || "thư chưa rõ"}</strong>
        {b.checkIn && b.checkOut && (
          <span className="text-xs text-slate-600">
            {formatDateKeyVN(b.checkIn)} → {formatDateKeyVN(b.checkOut)}
          </span>
        )}
      </div>
      <div className="mt-0.5 text-[11px] font-medium text-amber-800">{b.reviewReason}</div>
      {b.raw && (
        <details className="mt-1">
          <summary className="cursor-pointer text-[11px] font-semibold text-slate-500">Đọc thư gốc</summary>
          <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-[10px] leading-snug text-slate-600">
            {b.raw}
          </pre>
        </details>
      )}
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <select
          value={roomTypeId}
          disabled={busy}
          onChange={(e) => setRoomTypeId(e.target.value)}
          className="h-8 rounded-lg border border-slate-300 bg-white px-1.5 text-xs"
        >
          <option value="">Hạng phòng…</option>
          {HOMESTAY_ROOMS.map((r) => (
            <option key={r.id} value={r.id}>
              {ROOM_SHORT_VI[r.id]}
            </option>
          ))}
        </select>
        <Button
          type="button"
          className="h-8 bg-emerald-600 px-3 text-xs hover:bg-emerald-700"
          disabled={busy || !canConfirm}
          title={canConfirm ? "Đưa booking này vào lịch phòng" : "Thư thiếu ngày ở hoặc chưa chọn hạng phòng"}
          onClick={() => onAct(b.id, "confirm-review", { roomTypeId })}
        >
          ✓ Duyệt vào lịch
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-8 bg-white px-2 text-xs text-rose-700"
          disabled={busy}
          onClick={() => {
            if (window.confirm("Xoá thư này khỏi khay soát? (không phải đơn đặt phòng)")) onAct(b.id, "delete");
          }}
        >
          Xoá
        </Button>
      </div>
    </li>
  );
}

/* ================================================================== */
/* Nhập tay (điện thoại / B2B)                                          */
/* ================================================================== */

const EMPTY_FORM = {
  source: "manual",
  ref: "",
  guestName: "",
  phone: "",
  adults: 2,
  children: 0,
  checkIn: "",
  checkOut: "",
  amount: 0,
  prepaid: false,
  note: "",
};

function ManualCard({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, checkIn: todayInVN(), checkOut: shiftDateKey(todayInVN(), 1) });
  /** GIỎ PHÒNG: hạng phòng -> số lượng (0 = chưa lấy) — giống trang khách. */
  const [qty, setQty] = useState<Record<string, number>>({});
  /** Kế toán đã gõ đè tổng tiền thì máy thôi tự điền theo giá niêm yết. */
  const [amountTouched, setAmountTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const set = <K extends keyof typeof EMPTY_FORM>(k: K, v: (typeof EMPTY_FORM)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const lines = HOMESTAY_ROOMS.filter((r) => (qty[r.id] ?? 0) > 0).map((r) => ({ room: r, qty: qty[r.id]! }));
  const nights = Math.max(
    0,
    Math.round((Date.parse(`${form.checkOut}T00:00:00Z`) - Date.parse(`${form.checkIn}T00:00:00Z`)) / 86_400_000),
  );
  /** Giá niêm yết của giỏ — điền sẵn vào ô tổng tiền, kế toán sửa thoải mái. */
  const listTotal = lines.reduce((t, l) => t + l.room.pricePerNight * l.qty * Math.max(1, nights), 0);
  const suggested = amountTouched ? form.amount : listTotal;

  async function save() {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      await apiPost(`/api/baocao/homestay`, {
        ...form,
        amount: suggested,
        lines: lines.map((l) => ({ roomTypeId: l.room.id, qty: l.qty })),
      });
      setDone(`✓ Đã ghi đặt phòng cho ${form.guestName}.`);
      setForm({ ...EMPTY_FORM, checkIn: todayInVN(), checkOut: shiftDateKey(todayInVN(), 1) });
      setQty({});
      setAmountTouched(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được");
    } finally {
      setBusy(false);
    }
  }

  return (
    <CollapseCard title="＋ Nhập đặt phòng tay" hint="khách gọi điện, đoàn B2B, sự kiện — lấy được nhiều phòng một đơn">
      {/* GIỎ PHÒNG: mỗi hạng một dòng, bấm +/− lấy số lượng — như trang khách */}
      <div className="grid gap-1.5 @md:grid-cols-2 @2xl:grid-cols-3">
        {HOMESTAY_ROOMS.map((r) => {
          const n = qty[r.id] ?? 0;
          return (
            <div
              key={r.id}
              className={
                "flex items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5 " +
                (n > 0 ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white")
              }
            >
              <div className="min-w-0">
                <div className="truncate text-xs font-bold text-slate-800">{ROOM_SHORT_VI[r.id] ?? r.id}</div>
                <div className="text-[10px] text-slate-500">
                  {(r.pricePerNight / 1000).toLocaleString("vi-VN")}k/đêm · có {r.units}
                </div>
              </div>
              <div className="flex shrink-0 items-center overflow-hidden rounded-lg border border-slate-300 bg-white">
                <button
                  type="button"
                  onClick={() => setQty((p) => ({ ...p, [r.id]: Math.max(0, n - 1) }))}
                  className="h-8 w-8 text-base font-bold text-slate-500 hover:bg-slate-100"
                  aria-label="bớt"
                >
                  −
                </button>
                <span className={"w-7 text-center text-sm font-bold tabular-nums " + (n > 0 ? "text-emerald-700" : "text-slate-300")}>
                  {n}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((p) => ({ ...p, [r.id]: Math.min(r.units, n + 1) }))}
                  disabled={n >= r.units}
                  className="h-8 w-8 text-base font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                  aria-label="thêm"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 grid gap-2.5 @md:grid-cols-2 @2xl:grid-cols-3">
        <Field label="Tên khách / đoàn ★">
          <TextInput value={form.guestName} onChange={(e) => set("guestName", e.target.value)} placeholder="anh Tú · đoàn Cty X…" />
        </Field>
        <Field label="Điện thoại">
          <TextInput value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="09xx…" />
        </Field>
        <Field label="Nguồn" group>
          <div className="flex h-10 overflow-hidden rounded-lg border border-slate-300">
            {(
              [
                ["manual", "Trực tiếp"],
                ["b2b", "B2B"],
              ] as Array<[string, string]>
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => set("source", k)}
                className={
                  form.source === k
                    ? "flex-1 bg-slate-800 text-xs font-semibold text-white"
                    : "flex-1 bg-white text-xs font-medium text-slate-500"
                }
              >
                {label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Nhận phòng ★">
          <TextInput type="date" value={form.checkIn} onChange={(e) => set("checkIn", e.target.value)} />
        </Field>
        <Field label="Trả phòng ★">
          <TextInput type="date" value={form.checkOut} onChange={(e) => set("checkOut", e.target.value)} />
        </Field>
        <Field label="Người lớn + trẻ em" group>
          <div className="flex items-center gap-1.5">
            <CountInput compact value={form.adults} onChange={(v) => set("adults", v)} max={35} />
            <span className="text-xs text-slate-400">+</span>
            <CountInput compact value={form.children} onChange={(v) => set("children", v)} max={20} />
          </div>
        </Field>
        <Field
          label="Tổng tiền cả đơn"
          hint={
            !amountTouched && listTotal > 0
              ? `máy điền theo giá niêm yết (${nights} đêm) — sửa được`
              : undefined
          }
        >
          <MoneyInput
            value={suggested}
            onChange={(v) => {
              setAmountTouched(true);
              set("amount", v);
            }}
          />
        </Field>
        <Field label="Mã đơn (nếu có)">
          <TextInput value={form.ref} onChange={(e) => set("ref", e.target.value)} placeholder="mã hợp đồng, mã đại lý…" />
        </Field>
        <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3">
          <input
            type="checkbox"
            checked={form.prepaid}
            onChange={(e) => set("prepaid", e.target.checked)}
            className="h-5 w-5 rounded border-slate-300"
          />
          <span className="text-sm text-slate-800">Đã trả trước — không thu tại nhà</span>
        </label>
        <Field label="Ghi chú">
          <TextInput value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="ăn tối, đón muộn…" />
        </Field>
      </div>

      {/* Tóm tắt giỏ ngay trên nút lưu — soát lại một dòng trước khi ghi sổ */}
      {lines.length > 0 && (
        <p className="mt-2 text-xs font-semibold text-slate-600">
          Giỏ: {lines.map((l) => `${ROOM_SHORT_VI[l.room.id]} ×${l.qty}`).join(" · ")}
          {nights > 0 ? ` · ${nights} đêm` : ""} · {formatVND(suggested)}
        </p>
      )}
      {error && (
        <div className="mt-2">
          <Banner tone="error">{error}</Banner>
        </div>
      )}
      {done && (
        <div className="mt-2">
          <Banner tone="success" onClose={() => null}>
            {done}
          </Banner>
        </div>
      )}
      <Button
        type="button"
        className="mt-2.5 h-10 w-full bg-emerald-600 hover:bg-emerald-700"
        disabled={busy || lines.length === 0}
        onClick={save}
      >
        {busy ? "Đang lưu…" : lines.length === 0 ? "Chọn phòng đã rồi lưu" : "✓ Lưu đặt phòng"}
      </Button>
    </CollapseCard>
  );
}
