// app/baocao/cafe/page.tsx
"use client";

/**
 * MÁY BÁN HÀNG QUẦY CAFE — chạy trên Sunmi V2s (Android có máy in nhiệt gắn
 * liền) nhưng mở trên điện thoại/máy tính nào cũng bán được.
 *
 * BA LUẬT SỐNG CÒN của trang này:
 *
 *  1. MẤT MẠNG VẪN BÁN ĐƯỢC. Mọi phiếu ghi vào HÀNG ĐỢI trong máy trước
 *     (localStorage), in phiếu ngay, rồi mới tính chuyện đẩy lên máy chủ. Có
 *     mạng lại là tự đẩy bù; máy chủ chống trùng theo clientId nên đẩy mấy
 *     lần cũng không đếm đôi. Trang được service worker cất sẵn nên mất mạng
 *     vẫn mở lại được; phiên đăng nhập cũng cất lại để khỏi bị đá ra.
 *
 *  2. BẤM BÁN LÀ IN PHIẾU LUÔN — in bằng hộp in của hệ thống (Sunmi V2s có
 *     sẵn dịch vụ in đổ ra máy in nhiệt của nó, khổ 58mm).
 *
 *  3. PHIẾU NƯỚC KHÁCH BAY đứng RIÊNG, to nhất: khách bay dù được nước miễn
 *     phí, mỗi khách một phiếu — một chạm là ra một phiếu, cuối ngày con số
 *     này đối chiếu với số khách bay.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  CAFE_COUNTERS,
  CAFE_DISCOUNTS,
  CAFE_GROUPS,
  CAFE_MENU,
  cafeDiscountRate,
  type CafeCounterId,
  type CafeDiscountId,
  type CafeEntry,
  type CafeMenuItem,
} from "@/lib/baobay/cafe";
import { formatDateKeyVN, todayInVN } from "@/lib/baobay/date";
import { buildVietQrPayload, toAsciiNote } from "@/lib/vietqr";
import type { BaobayUserDTO } from "@/lib/baobay/types";

import { apiDelete, apiGet, apiPost } from "../components/client-api";
import { PAY_ACCOUNT } from "../components/PaymentQr";
import { Banner, Button, PageLoading } from "../components/ui";
import { Shell } from "../components/Shell";

const QUEUE_KEY = "cafe-queue-v1";
const USER_KEY = "cafe-user-v1";
const COUNTER_KEY = "cafe-counter-v1";
/** Menu đã gộp (mã + món quầy tự thêm) cất trong máy — mất mạng vẫn bày đủ nút. */
const MENU_KEY = "cafe-menu-v1";

type DayDTO = {
  date: string;
  counters: Array<{ counter: string; counterName: string; cashTotal: number; transferTotal: number; expenseTotal: number; freeTickets: number; saleCount: number }>;
  totals: { cashTotal: number; transferTotal: number; expenseTotal: number; freeTickets: number; saleCount: number };
  recent: Array<{ clientId: string; counter: string; kind: string; label: string; total: number; method: string; soldAt: string; byName: string }>;
  menu?: CafeMenuItem[];
};

const vnd = (n: number) => n.toLocaleString("vi-VN");

/** Hàng đợi phiếu trong máy — bọc try/catch vì localStorage có thể bị chặn. */
function readQueue(): CafeEntry[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}
function writeQueue(q: CafeEntry[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {
    /* đầy bộ nhớ thì đành chịu — phiếu vẫn đã in */
  }
}

export default function CafePosPage() {
  const router = useRouter();
  /**
   * PHIÊN CHỊU ĐƯỢC MẤT MẠNG: hỏi /me như thường; hỏi KHÔNG TỚI (offline) thì
   * dùng phiên đã cất từ lần có mạng — đá người bán ra ngoài lúc mất mạng là
   * phản bội đúng mục đích của trang. Chỉ khi máy chủ trả lời hẳn "không có
   * quyền" mới đuổi.
   */
  const [user, setUser] = useState<BaobayUserDTO | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    apiGet<{ user: BaobayUserDTO }>("/api/baocao/me", { timeoutMs: 6000 })
      .then(({ user: u }) => {
        if (!alive) return;
        try {
          localStorage.setItem(USER_KEY, JSON.stringify(u));
        } catch { /* thiếu chỗ cất phiên thì lần offline sau phải đăng nhập lại — không chặn bán */ }
        setUser(u);
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        try {
          const cached = JSON.parse(localStorage.getItem(USER_KEY) || "null");
          if (cached) {
            setUser(cached);
            setLoading(false);
            return;
          }
        } catch { /* không đọc được phiên cất — rơi xuống đăng nhập */ }
        router.replace("/baocao");
      });
    return () => {
      alive = false;
    };
  }, [router]);

  /**
   * Cất trang vào máy để mất mạng vẫn mở được — NHƯNG CHỈ Ở BẢN CHẠY THẬT.
   *
   * Tệp sw-cafe.js nằm ở gốc nên phạm vi của nó là CẢ SITE, và nó bắt mọi yêu
   * cầu /_next/static/* theo lối "có bản cũ thì trả bản cũ". Ở bản chạy thật
   * điều đó đúng: tên tệp đã băm theo nội dung, đổi mã là đổi tên. Ở BẢN DEV
   * thì tên tệp giữ nguyên trong khi nội dung đổi liên tục — máy đã mở trang
   * này một lần là từ đó ăn mã cũ cho toàn bộ khu /baocao, sửa gì cũng không
   * thấy (chuyện thật 06/09: chủ xuất ảnh phiếu trên điện thoại mãi không ra
   * dòng giảm combo dù mã đã sửa).
   *
   * Nên ở bản dev: GỠ service worker đã cài và xoá sạch phần đã cất.
   */
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw-cafe.js").catch(() => {});
      return;
    }
    void navigator.serviceWorker
      .getRegistrations()
      .then((rs) => Promise.all(rs.map((r) => r.unregister())))
      .then(() => (typeof caches !== "undefined" ? caches.keys() : []))
      .then((keys) => Promise.all([...keys].filter((k) => k.startsWith("cafe-pos")).map((k) => caches.delete(k))))
      .catch(() => {
        /* trình duyệt chặn — không sao, chỉ là bản dev có thể còn ăn mã cũ */
      });
  }, []);

  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(MENU_KEY) || "null");
      if (Array.isArray(cached) && cached.length) setMenu(cached);
    } catch { /* không đọc được menu đã cất — dùng bản trong mã */ }
  }, []);

  const [counter, setCounter] = useState<CafeCounterId>("bai-ha");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(COUNTER_KEY);
      if (saved === "bai-ha" || saved === "bai-cat") setCounter(saved);
    } catch { /* không nhớ được quầy thì mặc định quầy 1 */ }
  }, []);
  const pickCounter = (c: CafeCounterId) => {
    setCounter(c);
    try {
      localStorage.setItem(COUNTER_KEY, c);
    } catch { /* như trên */ }
  };

  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [method, setMethod] = useState<"cash" | "transfer">("cash");
  /**
   * MENU ĐANG BÀY = menu trong mã, thay bằng bản máy chủ ngay khi tải được.
   * Bắt đầu bằng bản trong mã chứ không phải mảng rỗng: mở máy lúc mất mạng
   * vẫn phải bán được ngay, không chờ hỏi ai.
   */
  const [menu, setMenu] = useState<CafeMenuItem[]>(CAFE_MENU);
  /** Mức giảm cho phiếu đang tính: khách thường · phi công/người nhà · ngoại giao. */
  const [discount, setDiscount] = useState<CafeDiscountId>("none");
  const [showAddItem, setShowAddItem] = useState(false);
  /** Màn xoay cho khách xem: chi tiết đơn + mã QR chuyển khoản. */
  const [showCustomer, setShowCustomer] = useState(false);
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(true);
  const [day, setDay] = useState<DayDTO | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expenseNote, setExpenseNote] = useState("");
  const [expenseAmount, setExpenseAmount] = useState(0);
  const printRef = useRef<HTMLIFrameElement>(null);
  const syncingRef = useRef(false);

  const loadDay = useCallback(() => {
    apiGet<DayDTO>(`/api/baocao/cafe?date=${todayInVN()}`)
      .then((d) => {
        setDay(d);
        if (Array.isArray(d.menu) && d.menu.length) {
          setMenu(d.menu);
          try {
            localStorage.setItem(MENU_KEY, JSON.stringify(d.menu));
          } catch { /* hết chỗ cất — menu vẫn dùng được trong phiên này */ }
        }
      })
      .catch(() => {});
  }, []);

  /** Đẩy hàng đợi lên máy chủ — gọi thoải mái, tự chống gọi chồng. */
  const sync = useCallback(async () => {
    if (syncingRef.current) return;
    const q = readQueue();
    setPending(q.length);
    if (!q.length) return;
    syncingRef.current = true;
    try {
      const res = await apiPost<{ acked: string[] }>(`/api/baocao/cafe`, { entries: q });
      const acked = new Set(res.acked ?? []);
      const left = readQueue().filter((e) => !acked.has(e.clientId));
      writeQueue(left);
      setPending(left.length);
      if (acked.size) loadDay();
    } catch {
      /* mất mạng — giữ nguyên hàng đợi, lần sau đẩy tiếp */
    } finally {
      syncingRef.current = false;
    }
  }, [loadDay]);

  useEffect(() => {
    if (!user) return;
    setOnline(navigator.onLine);
    setPending(readQueue().length);
    loadDay();
    sync();
    const onOn = () => {
      setOnline(true);
      sync();
      loadDay();
    };
    const onOff = () => setOnline(false);
    window.addEventListener("online", onOn);
    window.addEventListener("offline", onOff);
    // Mạng chập chờn không bắn sự kiện tử tế — cứ 45 giây thử đẩy một lần
    const timer = window.setInterval(sync, 45_000);
    return () => {
      window.removeEventListener("online", onOn);
      window.removeEventListener("offline", onOff);
      window.clearInterval(timer);
    };
  }, [user, sync, loadDay]);

  const cartLines = useMemo(
    () =>
      [...cart.entries()]
        .map(([id, qty]) => {
          const m = menu.find((x) => x.id === id);
          return m ? { ...m, qty } : null;
        })
        .filter((x): x is NonNullable<typeof x> => Boolean(x)),
    [cart, menu],
  );
  /** Tiền hàng trước giảm — máy chủ tính lại đúng công thức này khi nhận phiếu. */
  const cartSubtotal = cartLines.reduce((t, l) => t + l.price * l.qty, 0);
  const discountAmount = Math.round(cartSubtotal * cafeDiscountRate(discount));
  const cartTotal = cartSubtotal - discountAmount;
  const onlyFree = cartLines.length > 0 && cartLines.every((l) => l.freeTicket);

  function addItem(id: string) {
    setCart((p) => new Map(p).set(id, (p.get(id) ?? 0) + 1));
    setMsg(null);
    setError(null);
  }
  function decItem(id: string) {
    setCart((p) => {
      const next = new Map(p);
      const q = (next.get(id) ?? 0) - 1;
      if (q <= 0) next.delete(id);
      else next.set(id, q);
      return next;
    });
  }

  /** In phiếu 58mm qua hộp in hệ thống — Sunmi tự đổ ra máy in nhiệt của nó. */
  function printReceipt(entry: CafeEntry) {
    const f = printRef.current;
    const doc = f?.contentDocument;
    if (!doc) return;
    const counterName = CAFE_COUNTERS.find((c) => c.id === entry.counter)?.name ?? entry.counter;
    const when = new Date(entry.soldAt);
    const rows = entry.items
      .map(
        (it) =>
          `<tr><td>${it.name}${it.qty > 1 ? ` ×${it.qty}` : ""}</td><td style="text-align:right">${it.price ? vnd(it.price * it.qty) : "FREE"}</td></tr>`,
      )
      .join("");
    /** Phiếu in ghi rõ mức giảm — khách cầm phiếu thấy được vì sao rẻ hơn bảng giá. */
    const sub = entry.items.reduce((t, it) => t + it.price * it.qty, 0);
    const disc = CAFE_DISCOUNTS.find((d) => d.id === entry.discount);
    const discRows =
      disc && disc.rate > 0
        ? `<tr><td>Tam tinh</td><td style="text-align:right">${vnd(sub)}</td></tr>` +
          `<tr><td>Giam ${Math.round(disc.rate * 100)}% (${disc.id === "staff" ? "phi cong/nguoi nha" : "khach ngoai giao"})</td>` +
          `<td style="text-align:right">-${vnd(Math.round(sub * disc.rate))}</td></tr>`
        : "";
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><style>
      @page { size: 58mm auto; margin: 2mm; }
      body { font-family: "Courier New", monospace; font-size: 12px; width: 54mm; margin: 0; color: #000; }
      h1 { font-size: 14px; text-align: center; margin: 0 0 2px; }
      p { margin: 1px 0; text-align: center; }
      table { width: 100%; border-collapse: collapse; margin-top: 4px; }
      td { padding: 1px 0; font-size: 12px; }
      .tong { border-top: 1px dashed #000; font-weight: bold; font-size: 14px; }
    </style></head><body>
      <h1>MEBAYLUON CAFE</h1>
      <p>${counterName}</p>
      <p>${formatDateKeyVN(todayInVN())} ${String(when.getHours()).padStart(2, "0")}:${String(when.getMinutes()).padStart(2, "0")}</p>
      <table>${rows}${discRows}
        <tr class="tong"><td>TONG</td><td style="text-align:right">${entry.method === "free" ? "MIEN PHI" : vnd(entry.total) + " d"}</td></tr>
        <tr><td colspan="2" style="text-align:center">${entry.method === "transfer" ? "Chuyen khoan" : entry.method === "free" ? (disc?.id === "diplomatic" ? "Khach ngoai giao - khong thu tien" : "Phieu nuoc khach bay") : "Tien mat"}</td></tr>
      </table>
      <p style="margin-top:6px">Cam on quy khach!</p>
    </body></html>`);
    doc.close();
    // Cho trình duyệt kịp dựng trang rồi mới gọi in
    window.setTimeout(() => f?.contentWindow?.print(), 150);
  }

  /** Ghi phiếu: vào hàng đợi TRƯỚC, in luôn, rồi mới thử đẩy mạng. */
  function commit(entry: CafeEntry, print: boolean) {
    writeQueue([...readQueue(), entry]);
    setPending(readQueue().length);
    if (print) printReceipt(entry);
    void sync();
  }

  function sell() {
    if (!cartLines.length) return setError("Chưa chọn món nào");
    const entry: CafeEntry = {
      clientId: crypto.randomUUID(),
      counter,
      kind: "sale",
      items: cartLines.map((l) => ({ id: l.id, name: l.name, price: l.price, qty: l.qty })),
      total: cartTotal,
      discount,
      method: onlyFree || cartTotal === 0 ? "free" : method,
      note: "",
      soldAt: new Date().toISOString(),
    };
    commit(entry, true);
    setCart(new Map());
    const label = CAFE_DISCOUNTS.find((d) => d.id === discount)?.short;
    setMsg(
      `✓ Đã bán ${entry.items.map((i) => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ""}`).join(", ")}${
        label ? ` [${label}]` : ""
      } — ${
        entry.method === "free" ? "không thu tiền" : `${vnd(entry.total)} đ ${entry.method === "cash" ? "TM" : "CK"}`
      }.`,
    );
    // Mức giảm KHÔNG dính sang phiếu sau: khách kế tiếp là khách thường
    setDiscount("none");
  }

  /** Một chạm: một phiếu nước khách bay, in luôn. */
  function sellFreeTicket() {
    const free = menu.find((m) => m.freeTicket) ?? CAFE_MENU.find((m) => m.freeTicket)!;
    commit(
      {
        clientId: crypto.randomUUID(),
        counter,
        kind: "sale",
        items: [{ id: free.id, name: free.name, price: 0, qty: 1 }],
        total: 0,
        method: "free",
        note: "",
        soldAt: new Date().toISOString(),
      },
      true,
    );
    setMsg("✓ Đã in 1 phiếu nước khách bay.");
    setError(null);
  }

  function addExpense() {
    if (!expenseNote.trim()) return setError("Ghi nội dung khoản chi");
    if (expenseAmount <= 0) return setError("Chưa nhập số tiền chi");
    commit(
      {
        clientId: crypto.randomUUID(),
        counter,
        kind: "expense",
        items: [],
        total: expenseAmount,
        method: "cash",
        note: expenseNote.trim(),
        soldAt: new Date().toISOString(),
      },
      false,
    );
    setMsg(`✓ Đã ghi chi ${vnd(expenseAmount)} đ — ${expenseNote.trim()}.`);
    setExpenseNote("");
    setExpenseAmount(0);
  }

  async function removeRecent(clientId: string) {
    if (!window.confirm("Xoá phiếu này khỏi sổ?")) return;
    try {
      await apiDelete(`/api/baocao/cafe`, { clientId });
      loadDay();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không xoá được");
    }
  }

  if (loading || !user) return <PageLoading />;

  const myCounter = day?.counters.find((c) => c.counter === counter);

  return (
    <Shell user={user} title="Quầy cafe" subtitle="Bấm món → Bán & in phiếu. Mất mạng vẫn bán được — phiếu tự đẩy lên khi có mạng lại.">
      {/* iframe in phiếu — vô hình, chỉ để đổ nội dung 58mm rồi gọi hộp in */}
      <iframe ref={printRef} title="in-phieu" className="hidden" />

      {/* ---- Trạng thái mạng + hàng đợi ---- */}
      <div className="flex flex-wrap items-center gap-2">
        {CAFE_COUNTERS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => pickCounter(c.id)}
            className={
              "h-10 rounded-xl px-4 text-sm font-bold " +
              (counter === c.id ? "bg-slate-800 text-white" : "border border-slate-300 bg-white text-slate-600")
            }
          >
            {c.name}
          </button>
        ))}
        <span
          className={
            "ml-auto rounded-full px-3 py-1 text-xs font-bold " +
            (online ? "bg-emerald-100 text-emerald-800" : "bg-rose-600 text-white")
          }
        >
          {online ? "● Có mạng" : "● MẤT MẠNG — vẫn bán bình thường"}
        </span>
        {pending > 0 && (
          <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-amber-950" title="Phiếu đã in, đang chờ mạng để vào sổ">
            {pending} phiếu chờ mạng
          </span>
        )}
      </div>

      {msg && <div className="mt-2"><Banner tone="success" onClose={() => setMsg(null)}>{msg}</Banner></div>}
      {error && <div className="mt-2"><Banner tone="error" onClose={() => setError(null)}>{error}</Banner></div>}

      {/* ---- PHIẾU NƯỚC KHÁCH BAY — nút to nhất trang ---- */}
      <button
        type="button"
        onClick={sellFreeTicket}
        className="mt-3 w-full rounded-2xl bg-sky-600 py-4 text-lg font-black text-white shadow-lg active:bg-sky-700"
      >
        🎫 PHIẾU NƯỚC KHÁCH BAY — bấm 1 cái, in 1 phiếu
        {myCounter ? <span className="ml-2 rounded bg-white/20 px-2 py-0.5 text-sm">hôm nay: {myCounter.freeTickets}</span> : null}
      </button>

      {/* ---- Menu: xếp theo KHỐI (cà phê · trà · đồ uống · ăn vặt) — 27 món dồn
           một lưới thì quầy phải dò từng nút, chia khối là bấm theo phản xạ ---- */}
      {CAFE_GROUPS.map((g) => {
        const items = menu.filter((m) => !m.freeTicket && m.group === g.id);
        if (items.length === 0) return null;
        return (
          <div key={g.id} className="mt-3">
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">{g.name}</h3>
            {/* ĐIỆN THOẠI 3 NÚT MỘT HÀNG (luật chủ 06/09): nút gọn lại, tên
                tiếng Anh giấu đi trên màn nhỏ — quầy bấm theo tên Việt, chữ Anh
                chỉ tổ đẩy nút cao lên và phải cuộn nhiều hơn. */}
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5">
              {items.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => addItem(m.id)}
                  className="relative rounded-xl border border-slate-300 bg-white p-1.5 text-left shadow-sm active:bg-sky-50"
                >
                  <span className="block text-[13px] font-bold leading-tight text-slate-800">{m.name}</span>
                  {m.en && <span className="hidden text-[10px] leading-tight text-slate-400 sm:block">{m.en}</span>}
                  <span className="mt-0.5 block text-xs font-semibold text-sky-700">{vnd(m.price)}</span>
                  {(cart.get(m.id) ?? 0) > 0 && (
                    <span className="absolute right-1 top-1 rounded-full bg-sky-600 px-1.5 text-[11px] font-bold text-white">
                      {cart.get(m.id)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {/* ---- Thêm món ngay tại quầy (cần mạng) ---- */}
      {online && (
        <AddItemBox
          open={showAddItem}
          onOpen={() => setShowAddItem(true)}
          onClose={() => setShowAddItem(false)}
          onSaved={(next) => {
            setMenu(next);
            try {
              localStorage.setItem(MENU_KEY, JSON.stringify(next));
            } catch { /* hết chỗ cất — menu vẫn dùng được trong phiên này */ }
            setShowAddItem(false);
            setMsg("✓ Đã thêm món vào menu.");
          }}
          onError={setError}
        />
      )}

      {/* ---- Giỏ + bán ---- */}
      {cartLines.length > 0 && (
        <div className="mt-3 rounded-2xl border-2 border-sky-400 bg-white p-3 shadow-lg">
          {cartLines.map((l) => (
            <div key={l.id} className="flex items-center gap-2 border-b border-slate-100 py-1 text-sm">
              <strong className="flex-1">{l.name}</strong>
              <button type="button" onClick={() => decItem(l.id)} className="h-8 w-8 rounded-lg border border-slate-300 font-bold">−</button>
              <span className="w-6 text-center font-bold">{l.qty}</span>
              <button type="button" onClick={() => addItem(l.id)} className="h-8 w-8 rounded-lg border border-slate-300 font-bold">＋</button>
              <span className="w-24 text-right tabular-nums">{l.price ? `${vnd(l.price * l.qty)} đ` : "FREE"}</span>
            </div>
          ))}
          {/* GIẢM GIÁ — bấm trước khi bán. Phiếu giảm 100% vẫn là phiếu bán:
              hàng đã rời kho nên phải vào bảng kiểm kê. */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CAFE_DISCOUNTS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDiscount(d.id)}
                className={
                  "rounded-xl border px-3 py-1.5 text-xs font-bold " +
                  (discount === d.id
                    ? d.id === "none"
                      ? "border-slate-700 bg-slate-800 text-white"
                      : "border-amber-500 bg-amber-500 text-white"
                    : "border-slate-300 bg-white text-slate-600")
                }
              >
                {d.name}
                {d.rate > 0 ? ` −${Math.round(d.rate * 100)}%` : ""}
              </button>
            ))}
          </div>

          {discountAmount > 0 && (
            <div className="mt-1.5 flex items-center justify-between rounded-xl bg-amber-50 px-3 py-1.5 text-sm text-amber-900">
              <span>Tạm tính {vnd(cartSubtotal)} đ</span>
              <strong>− {vnd(discountAmount)} đ</strong>
            </div>
          )}

          <div className="mt-2 flex items-center gap-2">
            <span className="text-lg font-black">TỔNG: {vnd(cartTotal)} đ</span>
            {!onlyFree && cartTotal > 0 && (
              <span className="ml-auto flex overflow-hidden rounded-xl border border-slate-300">
                {(["cash", "transfer"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={"px-4 py-2 text-sm font-bold " + (method === m ? (m === "cash" ? "bg-emerald-600 text-white" : "bg-indigo-600 text-white") : "bg-white text-slate-500")}
                  >
                    {m === "cash" ? "Tiền mặt" : "CK"}
                  </button>
                ))}
              </span>
            )}
          </div>
          {/* Xoay máy cho khách đọc đơn rồi quét mã — bấm được cả khi trả tiền mặt */}
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowCustomer(true)}
            className="mt-2 h-11 w-full border-slate-400 bg-white text-sm font-bold"
          >
            👀 CHO KHÁCH XEM{method === "transfer" && cartTotal > 0 ? " & QUÉT MÃ QR" : ""}
          </Button>

          <div className="mt-2 flex gap-2">
            <Button type="button" onClick={sell} className="h-12 flex-[2] bg-sky-600 text-base font-black hover:bg-sky-700">
              🖨 BÁN & IN PHIẾU
            </Button>
            <Button type="button" variant="ghost" onClick={() => setCart(new Map())} className="h-12 flex-1 bg-white">
              Xoá giỏ
            </Button>
          </div>
        </div>
      )}

      {/* ---- Khoản chi ---- */}
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3">
        <strong className="text-sm text-slate-700">Ghi CHI:</strong>
        <input
          value={expenseNote}
          onChange={(e) => setExpenseNote(e.target.value)}
          placeholder="Mua đá, mua sữa…"
          className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 px-2 text-sm"
        />
        <input
          type="number"
          min={0}
          value={expenseAmount || ""}
          onChange={(e) => setExpenseAmount(Math.max(0, Math.round(Number(e.target.value) || 0)))}
          placeholder="Số tiền"
          className="h-10 w-28 rounded-lg border border-slate-300 px-2 text-right text-sm tabular-nums"
        />
        <Button type="button" onClick={addExpense} className="h-10 bg-rose-600 px-3 text-sm hover:bg-rose-700">
          Ghi chi
        </Button>
      </div>

      {/* ---- Tổng ngày (cần mạng) ---- */}
      {day && (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
          <p className="text-sm font-bold text-slate-800">Hôm nay {formatDateKeyVN(day.date)}</p>
          <div className="mt-1 grid gap-1 text-sm sm:grid-cols-2">
            {day.counters.map((c) => (
              <div key={c.counter} className={"rounded-xl border p-2 " + (c.counter === counter ? "border-sky-400 bg-sky-50" : "border-slate-200")}>
                <strong>{c.counterName}</strong>: thu TM <strong className="text-emerald-700">{vnd(c.cashTotal)}</strong> · CK{" "}
                <strong className="text-indigo-700">{vnd(c.transferTotal)}</strong> · chi{" "}
                <strong className="text-rose-700">{vnd(c.expenseTotal)}</strong> · 🎫 nước free <strong>{c.freeTickets}</strong> ·{" "}
                {c.saleCount} phiếu
              </div>
            ))}
          </div>
          <p className="mt-1 text-sm font-bold">
            CẢ HAI QUẦY: TM {vnd(day.totals.cashTotal)} · CK {vnd(day.totals.transferTotal)} · chi {vnd(day.totals.expenseTotal)} · 🎫{" "}
            {day.totals.freeTickets} khách uống nước
          </p>
          {day.recent.length > 0 && (
            <details className="mt-1">
              <summary className="cursor-pointer text-xs font-semibold text-slate-500">Phiếu gần nhất ({day.recent.length})</summary>
              <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                {day.recent.map((r) => (
                  <li key={r.clientId} className="flex items-center gap-2">
                    <span className="text-slate-400">{r.soldAt ? new Date(r.soldAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                    <span className="flex-1">{r.label}</span>
                    <span className="tabular-nums">{r.kind === "expense" ? `−${vnd(r.total)}` : r.method === "free" ? "FREE" : vnd(r.total)}</span>
                    <button type="button" onClick={() => removeRecent(r.clientId)} className="text-rose-500 hover:underline">xoá</button>
                  </li>
                ))}
              </ul>
            </details>
          )}
          {/* Cuối ca thì sang trang báo cáo: chốt tiền, thu chi, nộp tiền, xin nhập hàng */}
          <a
            href="/baocao/cafe/bao-cao"
            className="mt-2 block rounded-xl border border-sky-300 bg-sky-50 px-3 py-2 text-center text-sm font-bold text-sky-800"
          >
            📋 Báo cáo cuối ca — chốt tiền · thu chi · nộp tiền · yêu cầu nhập hàng
          </a>
        </div>
      )}
      {showCustomer && cartLines.length > 0 && (
        <CustomerView
          lines={cartLines.map((l) => ({ id: l.id, name: l.name, price: l.price, qty: l.qty }))}
          subtotal={cartSubtotal}
          discountAmount={discountAmount}
          total={cartTotal}
          discountLabel={CAFE_DISCOUNTS.find((d) => d.id === discount && d.rate > 0)?.name}
          method={cartTotal > 0 ? method : "cash"}
          counterName={CAFE_COUNTERS.find((c) => c.id === counter)?.name ?? ""}
          onClose={() => setShowCustomer(false)}
        />
      )}
    </Shell>
  );
}

/**
 * "＋ THÊM MÓN" — quầy tự thêm món vào menu, không phải chờ sửa mã rồi deploy.
 *
 * Cần mạng: món mới phải về máy chủ thì máy quầy kia mới thấy. Nút chỉ hiện
 * khi đang có mạng — bày ra lúc mất mạng chỉ tổ bấm rồi mất công gõ lại.
 *
 * Món trùng tên món cũ thì máy chủ coi là SỬA món đó (đổi giá) — đúng ý người
 * bấm, và cũng là đường đổi giá nhanh nhất tại quầy.
 */
function AddItemBox({
  open,
  onOpen,
  onClose,
  onSaved,
  onError,
}: {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSaved: (menu: CafeMenuItem[]) => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState("");
  const [en, setEn] = useState("");
  const [price, setPrice] = useState(0);
  const [group, setGroup] = useState<string>("do-uong");
  const [saving, setSaving] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="mt-3 w-full rounded-2xl border-2 border-dashed border-slate-300 py-3 text-sm font-bold text-slate-500 active:bg-slate-50"
      >
        ＋ Thêm món vào menu
      </button>
    );
  }

  async function save() {
    if (!name.trim()) return onError("Chưa đặt tên món");
    setSaving(true);
    try {
      const res = await apiPost<{ menu: CafeMenuItem[] }>("/api/baocao/cafe", {
        action: "product",
        product: { name: name.trim(), en: en.trim(), price, group },
      });
      onSaved(res.menu);
      setName("");
      setEn("");
      setPrice(0);
    } catch (err: any) {
      onError(err?.message || "Không thêm được món");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 rounded-2xl border-2 border-slate-300 bg-white p-3">
      <p className="text-sm font-bold text-slate-800">Thêm món vào menu</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="mb-0.5 block text-xs font-medium text-slate-500">Tên món</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Trà vải"
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-xs font-medium text-slate-500">Tên tiếng Anh (để trống được)</span>
          <input
            value={en}
            onChange={(e) => setEn(e.target.value)}
            placeholder="Lychee tea"
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-xs font-medium text-slate-500">Giá bán</span>
          <input
            value={price ? price.toLocaleString("vi-VN") : ""}
            inputMode="numeric"
            onChange={(e) => setPrice(Number(e.target.value.replace(/[^\d]/g, "").slice(0, 9)) || 0)}
            placeholder="0"
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-right text-sm font-semibold tabular-nums"
          />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-xs font-medium text-slate-500">Xếp vào khối</span>
          <select
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 px-2 text-sm"
          >
            {CAFE_GROUPS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-1.5 text-xs text-slate-500">
        Định mức nguyên liệu (một ly rút bao nhiêu gam) khai ở trang Báo cáo quầy → khối KHO.
      </p>
      <div className="mt-2 flex gap-2">
        <Button type="button" onClick={save} disabled={saving} className="flex-1">
          {saving ? "Đang lưu…" : "Lưu món"}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose} className="flex-1 bg-white">
          Đóng
        </Button>
      </div>
    </div>
  );
}

/**
 * MÀN CHO KHÁCH XEM — chi tiết đơn + mã QR chuyển khoản.
 *
 * Quầy xoay máy về phía khách, khách đọc từng món rồi quét luôn. Ba điều quyết
 * định cách dựng màn này:
 *
 *  1. CHỮ TO, NỀN TRẮNG, che kín màn hình. Khách nhìn máy của người bán trong
 *     nắng bãi cất — chữ nhỏ như bản của quầy là không đọc nổi.
 *  2. MÃ QR VẼ TẠI MÁY từ chuỗi EMVCo (lib/vietqr.ts), không gọi ảnh dịch vụ
 *     ngoài: hôm nào họ sập thì quầy vẫn thu được chuyển khoản.
 *  3. NỘI DUNG CHUYỂN KHOẢN có sẵn tên quầy + giờ, để kế toán dò lại được
 *     khoản nào của phiếu nào khi soát sao kê.
 *
 * Vẽ QR cần tải chunk `qrcode`; mất mạng lần đầu thì không có mã — vẫn hiện
 * đủ số tài khoản và số tiền để khách gõ tay, chứ không bỏ trống màn hình.
 */
function CustomerView({
  lines,
  subtotal,
  discountAmount,
  total,
  discountLabel,
  method,
  counterName,
  onClose,
}: {
  lines: Array<{ id: string; name: string; price: number; qty: number }>;
  subtotal: number;
  discountAmount: number;
  total: number;
  discountLabel?: string;
  method: "cash" | "transfer";
  counterName: string;
  onClose: () => void;
}) {
  const [qr, setQr] = useState<string>("");
  const [qrError, setQrError] = useState(false);

  /** Nội dung chuyển khoản: quầy nào, mấy giờ — kế toán dò sao kê theo chuỗi này. */
  const note = useMemo(() => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    return toAsciiNote(`CAFE ${counterName} ${p(d.getDate())}${p(d.getMonth() + 1)} ${p(d.getHours())}${p(d.getMinutes())}`);
  }, [counterName]);

  useEffect(() => {
    if (method !== "transfer" || total <= 0) return;
    let alive = true;
    const payload = buildVietQrPayload({
      bankBin: PAY_ACCOUNT.bankBin,
      accountNumber: PAY_ACCOUNT.accountNumber,
      amount: total,
      note,
    });
    import("qrcode")
      .then((m) =>
        m.default.toDataURL(payload, { width: 640, margin: 1, errorCorrectionLevel: "M", color: { dark: "#0f172a", light: "#ffffff" } }),
      )
      .then((url) => {
        if (alive) setQr(url);
      })
      .catch(() => {
        if (alive) setQrError(true);
      });
    return () => {
      alive = false;
    };
  }, [method, total, note]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white">
      <div className="mx-auto max-w-md px-4 py-4">
        <div className="flex items-center gap-2">
          <div>
            <p className="text-lg font-black text-slate-900">MEBAYLUON CAFE</p>
            <p className="text-xs text-slate-500">{counterName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-600"
          >
            ✕ Đóng
          </button>
        </div>

        <ul className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
          {lines.map((l) => (
            <li key={l.id} className="flex items-baseline gap-2 py-2">
              <span className="flex-1 text-base font-semibold text-slate-900">{l.name}</span>
              <span className="text-base text-slate-500">×{l.qty}</span>
              <span className="w-28 text-right text-base font-semibold tabular-nums text-slate-900">
                {l.price ? `${vnd(l.price * l.qty)} đ` : "FREE"}
              </span>
            </li>
          ))}
        </ul>

        {discountAmount > 0 && (
          <div className="mt-2 space-y-1 text-base">
            <div className="flex justify-between text-slate-500">
              <span>Tạm tính</span>
              <span className="tabular-nums">{vnd(subtotal)} đ</span>
            </div>
            <div className="flex justify-between font-semibold text-amber-700">
              <span>Giảm{discountLabel ? ` · ${discountLabel}` : ""}</span>
              <span className="tabular-nums">− {vnd(discountAmount)} đ</span>
            </div>
          </div>
        )}

        <div className="mt-3 flex items-baseline justify-between rounded-2xl bg-slate-900 px-4 py-3 text-white">
          <span className="text-lg font-bold">TỔNG</span>
          <span className="text-3xl font-black tabular-nums">{total > 0 ? `${vnd(total)} đ` : "MIỄN PHÍ"}</span>
        </div>

        {method === "transfer" && total > 0 && (
          <div className="mt-3 rounded-2xl border-2 border-sky-300 bg-sky-50 p-3 text-center">
            <p className="text-sm font-bold text-sky-900">Quét mã để chuyển khoản</p>
            {qr ? (
              <img src={qr} alt="Mã QR chuyển khoản" className="mx-auto mt-2 w-full max-w-[17rem] rounded-xl bg-white p-2" />
            ) : qrError ? (
              <p className="mt-2 text-sm font-semibold text-rose-600">
                Chưa vẽ được mã QR — khách chuyển tay theo số tài khoản dưới đây.
              </p>
            ) : (
              <p className="mt-2 text-sm text-sky-700">Đang tạo mã…</p>
            )}
            <div className="mt-2 text-left text-sm">
              <p>
                <span className="text-slate-500">Ngân hàng:</span>{" "}
                <strong className="text-slate-900">{PAY_ACCOUNT.bankName}</strong>
              </p>
              <p>
                <span className="text-slate-500">Số tài khoản:</span>{" "}
                <strong className="text-lg tabular-nums text-slate-900">{PAY_ACCOUNT.accountNumber}</strong>
              </p>
              <p>
                <span className="text-slate-500">Chủ tài khoản:</span>{" "}
                <strong className="text-slate-900">{PAY_ACCOUNT.accountName}</strong>
              </p>
              <p>
                <span className="text-slate-500">Nội dung:</span>{" "}
                <strong className="text-slate-900">{note}</strong>
              </p>
            </div>
          </div>
        )}

        {method === "cash" && (
          <p className="mt-3 text-center text-base font-semibold text-emerald-700">Thanh toán tiền mặt</p>
        )}
      </div>
    </div>
  );
}
