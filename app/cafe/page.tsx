// app/cafe/page.tsx
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
import { buildVietQrPayload, PAY_ACCOUNT_CAFE_HOMESTAY, toAsciiNote } from "@/lib/vietqr";
import type { BaobayUserDTO } from "@/lib/baobay/types";

import { apiDelete, apiGet, apiPost } from "@/app/baocao/components/client-api";
import { Banner, Button, PageLoading } from "@/app/baocao/components/ui";
import { Shell } from "@/app/baocao/components/Shell";

const QUEUE_KEY = "cafe-queue-v1";
const USER_KEY = "cafe-user-v1";
const COUNTER_KEY = "cafe-counter-v1";
/** Menu đã gộp (mã + món quầy tự thêm) cất trong máy — mất mạng vẫn bày đủ nút. */
const MENU_KEY = "cafe-menu-v1";
/**
 * ĐƠN ĐANG GIỮ — khách gọi nước lúc chờ bay, bay xong xuống mới trả tiền.
 * Cất trong máy chứ không lên máy chủ: đơn chưa chốt thì chưa phải doanh thu,
 * và quầy vẫn giữ đơn được lúc mất mạng như mọi việc khác của trang này.
 */
const HOLD_KEY = "cafe-hold-v1";

/** Câu dặn hay gặp nhất ở quầy — bấm một chạm thay vì gõ. */
const QUICK_NOTES = ["ít đá", "không đá", "ít đường", "không đường", "nóng", "mang đi"];

type DayDTO = {
  date: string;
  counters: Array<{ counter: string; counterName: string; cashTotal: number; transferTotal: number; expenseTotal: number; otherIncomeTotal: number; freeTickets: number; saleCount: number }>;
  totals: { cashTotal: number; transferTotal: number; expenseTotal: number; otherIncomeTotal: number; freeTickets: number; saleCount: number };
  recent: Array<{
    clientId: string;
    counter: string;
    kind: string;
    direction?: string;
    label: string;
    items?: Array<{ id: string; name: string; note: string; qty: number; price: number }>;
    discountKind?: string;
    total: number;
    method: string;
    soldAt: string;
    byName: string;
  }>;
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

/** Một đơn đang giữ: tên gọi (bàn/khách), các món, ghi chú, mức giảm. */
type HeldOrder = {
  id: string;
  name: string;
  at: string;
  lines: Array<[string, number]>;
  notes: Array<[string, string]>;
  discount: CafeDiscountId;
};

/** Bỏ dấu + gộp khoảng trắng để so khớp lúc tìm món. */
function deburr(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function readHolds(): HeldOrder[] {
  try {
    const raw = JSON.parse(localStorage.getItem(HOLD_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}
function writeHolds(list: HeldOrder[]) {
  try {
    localStorage.setItem(HOLD_KEY, JSON.stringify(list));
  } catch {
    /* đầy bộ nhớ — đơn giữ mất, nhưng chưa ai mất tiền */
  }
}

export default function CafePosPage() {
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
        /**
         * KHÔNG đá sang /baocao: máy bán ngoài bãi là thiết bị một-việc, người
         * trực chỉ biết địa chỉ /cafe. Bắt họ đi vòng qua cổng chung rồi tự tìm
         * đường về là thừa một bước ở đúng lúc đang có khách đứng đợi.
         */
        setUser(null);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

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
    setHolds(readHolds());
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
  /**
   * GHI CHÚ THEO MÓN ("ít đá", "không đường") — thứ quầy cafe cần nhất sau
   * chính món, vì gần như đơn nào cũng có một câu dặn. Gắn theo MÃ MÓN nên
   * cùng một món trong một đơn dùng chung một câu dặn; tách riêng từng ly là
   * việc của quán lớn, quầy hai người ngoài bãi không cần.
   */
  const [notes, setNotes] = useState<Map<string, string>>(new Map());
  const [method, setMethod] = useState<"cash" | "transfer">("cash");
  /** Ô tìm món — 27 món chia bốn khối vẫn phải cuộn, gõ hai chữ là ra ngay. */
  const [q, setQ] = useState("");
  /** Khách đưa bao nhiêu tiền mặt — máy tính tiền thối, khỏi nhẩm lúc đông. */
  const [tendered, setTendered] = useState(0);
  const [holds, setHolds] = useState<HeldOrder[]>([]);
  /** Phiếu vừa bán — in lại được ngay, kể cả khi chưa kịp đẩy lên máy chủ. */
  const [lastSold, setLastSold] = useState<CafeEntry | null>(null);
  /** Mã phiếu ĐÃ BÁN đang sửa lại; bán lại là thay hẳn bản cũ. */
  const [editingId, setEditingId] = useState<string | null>(null);
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
  /** Hai việc của quầy, hai tab: bán hàng và sổ thu chi (như báo cáo phi công). */
  const [tab, setTab] = useState<"ban" | "thuchi">("ban");
  const [expenseDir, setExpenseDir] = useState<"thu" | "chi">("chi");
  const [expenseMethod, setExpenseMethod] = useState<"cash" | "transfer">("cash");
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
          return m ? { ...m, qty, note: notes.get(id) ?? "" } : null;
        })
        .filter((x): x is NonNullable<typeof x> => Boolean(x)),
    [cart, menu, notes],
  );
  /**
   * TÌM MÓN BỎ DẤU: quầy gõ vội "tra dao", "ca phe" không dấu là chuyện thường,
   * mà bàn phím Sunmi gõ dấu còn chậm hơn. So khớp cả tên Việt lẫn tên Anh.
   */
  const found = useMemo(() => {
    const key = deburr(q);
    if (!key) return [];
    return menu.filter(
      (m) => !m.freeTicket && (deburr(m.name).includes(key) || deburr(m.en ?? "").includes(key)),
    );
  }, [q, menu]);

  /** Tiền hàng trước giảm — máy chủ tính lại đúng công thức này khi nhận phiếu. */
  const cartSubtotal = cartLines.reduce((t, l) => t + l.price * l.qty, 0);
  const discountAmount = Math.round(cartSubtotal * cafeDiscountRate(discount));
  const cartTotal = cartSubtotal - discountAmount;
  const onlyFree = cartLines.length > 0 && cartLines.every((l) => l.freeTicket);

  const setNote = (id: string, v: string) =>
    setNotes((n) => {
      const m = new Map(n);
      if (v.trim()) m.set(id, v.trim());
      else m.delete(id);
      return m;
    });

  /** Bật/tắt một chip dặn sẵn, giữ nguyên phần khách dặn kiểu khác. */
  const toggleNote = (id: string, chip: string) => {
    const cur = (notes.get(id) ?? "").split(", ").filter(Boolean);
    const next = cur.includes(chip) ? cur.filter((x) => x !== chip) : [...cur, chip];
    setNote(id, next.join(", "));
  };

  /** Gỡ một mặt hàng quầy tự thêm khỏi menu (ẩn đi, phiếu cũ vẫn tra được tên). */
  async function removeItem(m: CafeMenuItem) {
    if (!window.confirm(`Gỡ “${m.name}” khỏi menu? Phiếu đã bán vẫn giữ nguyên.`)) return;
    try {
      const res = await apiPost<{ menu: CafeMenuItem[] }>("/api/baocao/cafe", {
        action: "product-active",
        key: m.id,
        active: false,
      });
      setMenu(res.menu);
      try {
        localStorage.setItem(MENU_KEY, JSON.stringify(res.menu));
      } catch { /* hết chỗ cất — menu vẫn đúng trong phiên này */ }
      setMsg(`✓ Đã gỡ “${m.name}” khỏi menu.`);
    } catch (err: any) {
      setError(err?.message || "Không gỡ được mặt hàng");
    }
  }

  function addItem(id: string) {
    setCart((p) => new Map(p).set(id, (p.get(id) ?? 0) + 1));
    setMsg(null);
    setError(null);
  }
  function decItem(id: string) {
    setCart((p) => {
      const next = new Map(p);
      const left = (next.get(id) ?? 0) - 1;
      if (left <= 0) {
        next.delete(id);
        // Món rời giỏ thì câu dặn của nó cũng đi theo, không dính sang lần sau
        setNotes((n) => {
          const m = new Map(n);
          m.delete(id);
          return m;
        });
      } else next.set(id, left);
      return next;
    });
  }

  /* ---- ĐƠN ĐANG GIỮ: khách gọi lúc chờ bay, xuống mới trả ---- */

  /** Tiền của một đơn đang giữ — quầy nhìn dải đơn là biết ai còn nợ bao nhiêu. */
  const holdTotal = (h: HeldOrder) => {
    const sub = h.lines.reduce((t, [id, n]) => {
      const m = menu.find((x) => x.id === id);
      return t + (m ? m.price * n : 0);
    }, 0);
    return sub - Math.round(sub * cafeDiscountRate(h.discount));
  };

  function holdOrder() {
    if (!cartLines.length) return setError("Chưa chọn món nào để giữ");
    const name = window.prompt("Giữ đơn cho ai? (tên khách, số bàn…)", `Khách ${holds.length + 1}`);
    if (name === null) return;
    const next = [
      ...holds,
      {
        id: crypto.randomUUID(),
        name: name.trim() || `Khách ${holds.length + 1}`,
        at: new Date().toISOString(),
        lines: [...cart.entries()] as Array<[string, number]>,
        notes: [...notes.entries()] as Array<[string, string]>,
        discount,
      },
    ];
    setHolds(next);
    writeHolds(next);
    setCart(new Map());
    setNotes(new Map());
    setTendered(0);
    setDiscount("none");
    setMsg(`✓ Đã giữ đơn “${name.trim() || "khách"}”. Bấm vào đơn để lấy lại và thu tiền.`);
  }

  /** Mở lại một đơn đã giữ: đổ về giỏ và BỎ khỏi danh sách giữ. */
  function resumeHold(h: HeldOrder) {
    if (cartLines.length && !window.confirm("Giỏ đang có món — lấy đơn này ra sẽ thay giỏ hiện tại?")) return;
    setCart(new Map(h.lines));
    setNotes(new Map(h.notes));
    setDiscount(h.discount);
    setTendered(0);
    const next = holds.filter((x) => x.id !== h.id);
    setHolds(next);
    writeHolds(next);
    setMsg(`Đã lấy đơn “${h.name}” ra giỏ.`);
  }

  /**
   * SỬA MỘT ĐƠN ĐÃ BÁN: đổ ngược về giỏ để người bán chữa rồi lưu lại.
   *
   * Cần MẠNG vì bản cũ nằm trên máy chủ và phải xoá đi khi lưu bản mới; danh
   * sách phiếu này cũng lấy từ máy chủ nên mất mạng vốn đã không thấy.
   */
  function editSold(r: DayDTO["recent"][number]) {
    if (!(r.items?.length ?? 0)) return setError("Phiếu này không còn chi tiết món để sửa");
    if (cartLines.length && !window.confirm("Giỏ đang có món — mở đơn này ra sửa sẽ thay giỏ hiện tại?")) return;
    const c = new Map<string, number>();
    const n = new Map<string, string>();
    for (const it of r.items ?? []) {
      if (!it.id) continue;
      c.set(it.id, (c.get(it.id) ?? 0) + (it.qty || 0));
      if (it.note) n.set(it.id, it.note);
    }
    if (c.size === 0) return setError("Phiếu cũ chưa lưu mã món nên không mở lại được — xoá rồi bán lại");
    setCart(c);
    setNotes(n);
    setDiscount((r.discountKind ?? "none") as CafeDiscountId);
    if (r.method === "cash" || r.method === "transfer") setMethod(r.method);
    setTendered(0);
    setEditingId(r.clientId);
    setMsg("Đang sửa đơn đã bán — chữa xong bấm “LƯU SỬA”, bản cũ sẽ được thay.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function dropHold(h: HeldOrder) {
    if (!window.confirm(`Bỏ đơn đang giữ của “${h.name}”?`)) return;
    const next = holds.filter((x) => x.id !== h.id);
    setHolds(next);
    writeHolds(next);
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
          `<tr><td>${it.name}${it.qty > 1 ? ` ×${it.qty}` : ""}` +
          // Câu dặn xuống dòng, chữ nghiêng — người pha đọc phiếu là làm đúng ngay
          `${it.note ? `<br><i style="font-size:11px">${it.note}</i>` : ""}` +
          `</td><td style="text-align:right">${it.price ? vnd(it.price * it.qty) : "FREE"}</td></tr>`,
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

  /**
   * BÁN = LƯU ĐƠN. IN LÀ VIỆC RIÊNG (luật chủ 06/09): khách quen không lấy
   * phiếu thì in ra chỉ tốn giấy. Không in vẫn in lại được sau — phiếu vừa bán
   * nhớ ngay trong máy nên mất mạng cũng in lại được.
   */
  function sell(print: boolean) {
    if (!cartLines.length) return setError("Chưa chọn món nào");
    const entry: CafeEntry = {
      clientId: crypto.randomUUID(),
      counter,
      kind: "sale",
      items: cartLines.map((l) => ({ id: l.id, name: l.name, note: l.note, price: l.price, qty: l.qty })),
      total: cartTotal,
      discount,
      method: onlyFree || cartTotal === 0 ? "free" : method,
      note: "",
      soldAt: new Date().toISOString(),
    };
    commit(entry, print);
    setLastSold(entry);
    /**
     * Đang SỬA một đơn đã bán: xoá bản cũ trên máy chủ sau khi bản mới đã vào
     * hàng đợi. Sổ chỉ còn một bản đúng, không đọng hai bản lệch nhau.
     */
    if (editingId) {
      const old = editingId;
      setEditingId(null);
      void apiDelete(`/api/baocao/cafe`, { clientId: old })
        .then(loadDay)
        .catch(() => setError("Đã ghi đơn sửa nhưng CHƯA xoá được bản cũ — kiểm lại danh sách phiếu"));
    }
    setCart(new Map());
    setNotes(new Map());
    setTendered(0);
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
    const la = expenseDir === "thu" ? "thu" : "chi";
    if (!expenseNote.trim()) return setError(`Ghi nội dung khoản ${la}`);
    if (expenseAmount <= 0) return setError(`Chưa nhập số tiền ${la}`);
    commit(
      {
        clientId: crypto.randomUUID(),
        counter,
        kind: "expense",
        direction: expenseDir,
        items: [],
        total: expenseAmount,
        method: expenseMethod,
        note: expenseNote.trim(),
        soldAt: new Date().toISOString(),
      },
      false,
    );
    setMsg(`✓ Đã ghi ${la} ${vnd(expenseAmount)} đ — ${expenseNote.trim()}.`);
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

  if (loading) return <PageLoading />;
  /** Chưa có phiên: đăng nhập NGAY TẠI ĐÂY rồi bán tiếp, không rời trang. */
  if (!user) return <CafeLogin onDone={setUser} />;

  const myCounter = day?.counters.find((c) => c.counter === counter);

  return (
    <Shell user={user} title="CAFE" subtitle="Bấm món → Bán & in phiếu. Mất mạng vẫn bán được — phiếu tự đẩy lên khi có mạng lại.">
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

      {/* HAI THẺ: bán hàng và sổ thu chi — cùng lối với báo cáo phi công dù */}
      <div className="mt-2 flex overflow-hidden rounded-xl border border-slate-300">
        {(
          [
            ["ban", "☕ Bán hàng"],
            ["thuchi", "💰 Thu chi"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={
              "flex-1 py-2.5 text-sm font-black " +
              (tab === id ? "bg-slate-800 text-white" : "bg-white text-slate-500")
            }
          >
            {label}
          </button>
        ))}
      </div>

      {msg && <div className="mt-2"><Banner tone="success" onClose={() => setMsg(null)}>{msg}</Banner></div>}
      {error && <div className="mt-2"><Banner tone="error" onClose={() => setError(null)}>{error}</Banner></div>}

      {tab === "ban" && (
      <>
      {/* ---- ĐƠN ĐANG GIỮ ---- */}
      {holds.length > 0 && (
        <div className="mt-2 rounded-2xl border-2 border-amber-300 bg-amber-50 p-2">
          <p className="text-xs font-bold text-amber-900">🧾 Đơn đang giữ ({holds.length}) — bấm để lấy ra thu tiền</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {holds.map((h) => (
              <span key={h.id} className="flex items-center overflow-hidden rounded-xl border border-amber-400 bg-white">
                <button type="button" onClick={() => resumeHold(h)} className="px-2.5 py-1.5 text-left text-xs font-bold text-amber-900">
                  {h.name}
                  <span className="ml-1 font-normal text-slate-500">
                    {h.lines.reduce((t, [, n]) => t + n, 0)} món ·{" "}
                    <strong className="text-slate-800">{vnd(holdTotal(h))} đ</strong> ·{" "}
                    {new Date(h.at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </button>
                <button type="button" onClick={() => dropHold(h)} className="border-l border-amber-300 px-2 py-1.5 text-xs font-bold text-rose-500">
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ---- TÌM MÓN ---- */}
      <div className="relative mt-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔎 Tìm món: gõ “bia”, “cf”, “tra dao”…"
          className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 pr-10 text-sm"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            className="absolute right-1 top-1 h-9 w-9 rounded-lg text-slate-400"
          >
            ✕
          </button>
        )}
      </div>

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
      {(q.trim()
        ? [{ id: "__tim", name: `Kết quả tìm “${q.trim()}”` }]
        : CAFE_GROUPS
      ).map((g) => {
        const items = q.trim() ? found : menu.filter((m) => !m.freeTicket && m.group === g.id);
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
                  <span className="block text-[13px] font-bold leading-tight text-slate-800">
                    {/* ★ ĐỎ = nằm trong suất nước miễn phí của khách bay dù */}
                    {m.freeForGuest && <span className="mr-0.5 text-rose-600">★</span>}
                    {m.name}
                  </span>
                  {m.en && <span className="hidden text-[10px] leading-tight text-slate-400 sm:block">{m.en}</span>}
                  <span className="mt-0.5 block text-xs font-semibold text-sky-700">{vnd(m.price)}</span>
                  {(cart.get(m.id) ?? 0) > 0 && (
                    <span className="absolute right-1 top-1 rounded-full bg-sky-600 px-1.5 text-[11px] font-bold text-white">
                      {cart.get(m.id)}
                    </span>
                  )}
                  {/*
                    GỠ MÓN — chỉ món quầy TỰ THÊM (đồ lưu niệm) mới có nút này.
                    Cà phê, trà, nước là bảng giá niêm yết: máy chủ chặn, nên
                    bày nút ra chỉ tổ bấm rồi ăn thông báo từ chối.
                  */}
                  {!m.fixed && online && (cart.get(m.id) ?? 0) === 0 && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        void removeItem(m);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.stopPropagation();
                          void removeItem(m);
                        }
                      }}
                      className="absolute right-0.5 top-0.5 rounded px-1 text-[11px] font-bold text-slate-300 hover:text-rose-600"
                      title="Gỡ mặt hàng khỏi menu"
                    >
                      ✕
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {q.trim() && found.length === 0 && (
        <p className="mt-3 rounded-xl bg-slate-100 px-3 py-3 text-center text-sm text-slate-500">
          Không có món nào khớp “{q.trim()}”.
        </p>
      )}

      <p className="mt-2 text-center text-[11px] text-slate-500">
        <span className="font-bold text-rose-600">★</span> = món nằm trong suất nước miễn phí của khách bay dù
      </p>

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
            <div key={l.id} className="border-b border-slate-100 py-1 text-sm">
              <div className="flex items-center gap-2">
                <strong className="flex-1">{l.name}</strong>
                <button type="button" onClick={() => decItem(l.id)} className="h-8 w-8 rounded-lg border border-slate-300 font-bold">−</button>
                <span className="w-6 text-center font-bold">{l.qty}</span>
                <button type="button" onClick={() => addItem(l.id)} className="h-8 w-8 rounded-lg border border-slate-300 font-bold">＋</button>
                <span className="w-24 text-right tabular-nums">{l.price ? `${vnd(l.price * l.qty)} đ` : "FREE"}</span>
              </div>
              {/* DẶN THÊM: bấm một chip là xong, gõ tay khi khách dặn kiểu khác */}
              <div className="mt-0.5 flex flex-wrap items-center gap-1">
                {QUICK_NOTES.map((n) => {
                  const on = (l.note || "").split(", ").includes(n);
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => toggleNote(l.id, n)}
                      className={
                        "rounded-full border px-2 py-0.5 text-[11px] font-semibold " +
                        (on ? "border-sky-500 bg-sky-600 text-white" : "border-slate-300 bg-white text-slate-500")
                      }
                    >
                      {n}
                    </button>
                  );
                })}
                <input
                  value={l.note}
                  onChange={(e) => setNote(l.id, e.target.value)}
                  placeholder="dặn thêm…"
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-0.5 text-[11px]"
                />
              </div>
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

          {/*
            TẠM TÍNH · GIẢM · TỔNG xếp THẲNG CỘT TIỀN của các dòng món ở trên.
            Dòng món có bốn ô sau tên: [−] [số] [＋] [tiền w-24]; ở đây chừa
            đúng bề rộng ba ô đầu cộng khe (6.5rem) rồi mới tới cột tiền, nên
            con số nào cũng rơi vào một đường dọc — mắt chạy một mạch từ giá
            từng món xuống tổng, không phải dò ngang.
          */}
          {/*
            Tích "Khách bay dù" mà giỏ có món NGOÀI suất thì nhắc ngay: suất
            miễn phí chỉ gồm các món ★, còn matcha hay cà phê muối thì không.
            Không chặn — có lúc chủ cho thật; chỉ để người bán biết mình đang cho.
          */}
          {discount === "khach-bay" && cartLines.some((l) => !l.freeForGuest && !l.freeTicket) && (
            <div className="mt-1.5 rounded-xl border border-amber-400 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900">
              ⚠ Ngoài suất miễn phí:{" "}
              {cartLines
                .filter((l) => !l.freeForGuest && !l.freeTicket)
                .map((l) => l.name)
                .join(", ")}
              . Suất khách bay chỉ gồm các món ★.
            </div>
          )}

          {discountAmount > 0 && (
            <>
              <div className="mt-1.5 flex items-center gap-2 text-sm text-slate-500">
                <span className="min-w-0 flex-1">Tạm tính</span>
                <span className="w-[6.5rem] shrink-0" />
                <span className="w-24 shrink-0 text-right tabular-nums">{vnd(cartSubtotal)} đ</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                <span className="min-w-0 flex-1">Giảm giá</span>
                <span className="w-[6.5rem] shrink-0" />
                <span className="w-24 shrink-0 text-right tabular-nums">− {vnd(discountAmount)} đ</span>
              </div>
            </>
          )}

          {/* TỔNG tô ĐỎ ĐẬM (luật chủ 06/09): con số người bán đọc to cho khách,
              đứng lẫn màu chữ thường thì phải dò giữa một cột toàn số đen. */}
          <div className="mt-1 flex items-center gap-2 border-t border-slate-200 pt-1.5 text-rose-700">
            <span className="min-w-0 flex-1 text-lg font-black">TỔNG</span>
            <span className="w-[6.5rem] shrink-0" />
            <span className="w-24 shrink-0 whitespace-nowrap text-right text-lg font-black tabular-nums">
              {vnd(cartTotal)} đ
            </span>
          </div>

          <div className="mt-2 flex items-center gap-2">
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
          {/* TIỀN THỐI: khách đưa bao nhiêu, máy trừ ra — lúc đông không ai nhẩm kịp */}
          {method === "cash" && cartTotal > 0 && (
            <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-emerald-900">Khách đưa</span>
                {[50_000, 100_000, 200_000, 500_000].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setTendered(v)}
                    className="rounded-lg border border-emerald-400 bg-white px-2 py-1 text-xs font-bold text-emerald-800"
                  >
                    {vnd(v)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setTendered(cartTotal)}
                  className="rounded-lg border border-emerald-400 bg-white px-2 py-1 text-xs font-bold text-emerald-800"
                >
                  Đủ tiền
                </button>
                <input
                  value={tendered ? vnd(tendered) : ""}
                  inputMode="numeric"
                  placeholder="0"
                  onChange={(e) => setTendered(Number(e.target.value.replace(/[^\d]/g, "").slice(0, 9)) || 0)}
                  className="ml-auto h-8 w-28 rounded-lg border border-emerald-300 px-2 text-right text-sm font-bold tabular-nums"
                />
              </div>
              {tendered > 0 && (
                <p className={"mt-1 text-right text-sm font-black " + (tendered >= cartTotal ? "text-emerald-700" : "text-rose-600")}>
                  {tendered >= cartTotal ? `THỐI LẠI: ${vnd(tendered - cartTotal)} đ` : `CÒN THIẾU: ${vnd(cartTotal - tendered)} đ`}
                </p>
              )}
            </div>
          )}

          {/* Xoay máy cho khách đọc đơn rồi quét mã — bấm được cả khi trả tiền mặt */}
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowCustomer(true)}
            className="mt-2 h-11 w-full border-slate-400 bg-white text-sm font-bold"
          >
            👀 CHO KHÁCH XEM & QUÉT MÃ QR
          </Button>

          <div className="mt-2 flex gap-2">
            <Button type="button" onClick={() => sell(false)} className="h-12 flex-1 bg-sky-600 text-base font-black hover:bg-sky-700">
              {editingId ? "✓ LƯU SỬA" : "✓ BÁN"}
            </Button>
            <Button type="button" onClick={() => sell(true)} className="h-12 flex-1 bg-slate-800 text-base font-black hover:bg-slate-900">
              🖨 BÁN & IN
            </Button>
          </div>
          <div className="mt-2 flex gap-2">
            <Button type="button" variant="ghost" onClick={holdOrder} className="h-12 flex-1 bg-white text-sm font-bold">
              🧾 Giữ đơn
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setCart(new Map());
                setNotes(new Map());
                setTendered(0);
                setEditingId(null);
              }}
              className="h-12 flex-1 bg-white"
            >
              {editingId ? "Bỏ sửa" : "Xoá giỏ"}
            </Button>
          </div>
        </div>
      )}

      {/* IN LẠI PHIẾU VỪA BÁN — bán xong mới thấy khách cần phiếu, hoặc máy in
          kẹt giấy. Nhớ trong máy nên mất mạng vẫn in được, không như danh sách
          phiếu ở dưới (danh sách đó lấy từ máy chủ). */}
      {lastSold && (
        <button
          type="button"
          onClick={() => printReceipt(lastSold)}
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white py-2 text-xs font-bold text-slate-600"
        >
          🖨 In lại phiếu vừa bán ({vnd(lastSold.total)} đ)
        </button>
      )}

      </>
      )}

      {/* ---- SỔ THU CHI TẠI QUẦY ---- */}
      {tab === "thuchi" && (
        <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-3">
          <p className="text-sm font-bold text-slate-800">Ghi một khoản tiền</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Tiền RA khỏi túi người trực (mua đá, mua sữa, trả ship) hoặc tiền VÀO ngoài bán hàng (khách trả nợ, tiền
            lẻ gửi lại). Ghi ngay tại đây, khỏi đợi cuối ca nhớ lại.
          </p>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="flex overflow-hidden rounded-xl border border-slate-300">
              {(["chi", "thu"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setExpenseDir(d)}
                  className={
                    "flex-1 py-2 text-sm font-bold " +
                    (expenseDir === d
                      ? d === "thu"
                        ? "bg-emerald-600 text-white"
                        : "bg-rose-600 text-white"
                      : "bg-white text-slate-500")
                  }
                >
                  {d === "thu" ? "＋ THU" : "− CHI"}
                </button>
              ))}
            </div>
            <div className="flex overflow-hidden rounded-xl border border-slate-300">
              {(["cash", "transfer"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setExpenseMethod(m)}
                  className={
                    "flex-1 py-2 text-sm font-bold " +
                    (expenseMethod === m ? "bg-slate-800 text-white" : "bg-white text-slate-500")
                  }
                >
                  {m === "cash" ? "Tiền mặt" : "CK"}
                </button>
              ))}
            </div>
          </div>

          <input
            value={expenseNote}
            onChange={(e) => setExpenseNote(e.target.value)}
            placeholder={expenseDir === "thu" ? "Khách trả nợ, tiền lẻ gửi lại…" : "Mua đá, mua sữa, trả ship…"}
            className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
          />
          <input
            inputMode="numeric"
            value={expenseAmount ? vnd(expenseAmount) : ""}
            onChange={(e) => setExpenseAmount(Number(e.target.value.replace(/[^\d]/g, "").slice(0, 9)) || 0)}
            placeholder="Số tiền"
            className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 text-right text-lg font-bold tabular-nums"
          />
          <Button
            type="button"
            onClick={addExpense}
            className={"mt-2 h-12 w-full text-base font-black " + (expenseDir === "thu" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700")}
          >
            {expenseDir === "thu" ? "＋ GHI THU" : "− GHI CHI"}
          </Button>

          {/* Các khoản đã ghi hôm nay — soát lại và xoá cái nhầm */}
          {day && (
            <div className="mt-3 border-t border-slate-200 pt-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 font-bold text-slate-700">Hôm nay</span>
                <span className="whitespace-nowrap font-bold text-emerald-700">+{vnd(day.totals.otherIncomeTotal)}</span>
                <span className="whitespace-nowrap font-bold text-rose-700">−{vnd(day.totals.expenseTotal)}</span>
              </div>
              <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                {day.recent
                  .filter((r) => r.kind === "expense")
                  .map((r) => (
                    <li key={r.clientId} className="flex items-center gap-2">
                      <span className="text-slate-400">
                        {r.soldAt ? new Date(r.soldAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                      <span className="min-w-0 flex-1">{r.label}</span>
                      <span className={"w-20 shrink-0 text-right font-bold tabular-nums " + (r.direction === "thu" ? "text-emerald-700" : "text-rose-700")}>
                        {r.direction === "thu" ? "+" : "−"}
                        {vnd(r.total)}
                      </span>
                      <button type="button" onClick={() => removeRecent(r.clientId)} className="text-rose-500 hover:underline">
                        xoá
                      </button>
                    </li>
                  ))}
                {day.recent.filter((r) => r.kind === "expense").length === 0 && (
                  <li className="py-2 text-center text-slate-400">Hôm nay chưa ghi khoản nào.</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

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
                    <span className="min-w-0 flex-1">{r.label}</span>
                    {/* Cột tiền BỀ RỘNG CỐ ĐỊNH để mọi dòng và hàng TỔNG thẳng cột */}
                    <span className="w-20 shrink-0 text-right tabular-nums">
                      {r.kind === "expense" ? `−${vnd(r.total)}` : r.method === "free" ? "FREE" : vnd(r.total)}
                    </span>
                    {/* IN LẠI: khách làm mất phiếu, hoặc máy in kẹt giấy lúc bán */}
                    {r.kind === "sale" && (r.items?.length ?? 0) > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          printReceipt({
                            clientId: r.clientId,
                            counter: r.counter as CafeCounterId,
                            kind: "sale",
                            items: (r.items ?? []).map((i) => ({ id: i.id, name: i.name, note: i.note, price: i.price, qty: i.qty })),
                            total: r.total,
                            discount: (r.discountKind ?? "none") as CafeDiscountId,
                            method: r.method as "cash" | "transfer" | "free",
                            note: "",
                            soldAt: r.soldAt,
                          })
                        }
                        className="text-sky-600 hover:underline"
                      >
                        in lại
                      </button>
                    )}
                    {r.kind === "sale" && (r.items?.length ?? 0) > 0 && (
                      <button type="button" onClick={() => editSold(r)} className="text-amber-600 hover:underline">
                        sửa
                      </button>
                    )}
                    <button type="button" onClick={() => removeRecent(r.clientId)} className="text-rose-500 hover:underline">xoá</button>
                  </li>
                ))}
                {/* TỔNG của danh sách, thẳng CỘT TIỀN — hai ô cuối chừa chỗ cho nút sửa/xoá */}
                <li className="flex items-center gap-2 border-t border-slate-300 pt-1 font-bold text-slate-900">
                  <span className="text-slate-400">TỔNG</span>
                  <span className="min-w-0 flex-1">
                    {day.recent.filter((r) => r.kind === "sale").length} phiếu bán
                    {day.recent.some((r) => r.kind === "expense")
                      ? ` · ${day.recent.filter((r) => r.kind === "expense").length} khoản chi`
                      : ""}
                  </span>
                  <span className="w-20 shrink-0 text-right tabular-nums">
                    {vnd(
                      day.recent.reduce(
                        (t, r) => t + (r.kind === "expense" ? -(r.total || 0) : r.method === "free" ? 0 : r.total || 0),
                        0,
                      ),
                    )}
                  </span>
                  <span className="w-[3.4rem] shrink-0" />
                </li>
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
          lines={cartLines.map((l) => ({ id: l.id, name: l.name, note: l.note, price: l.price, qty: l.qty }))}
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
  const [group, setGroup] = useState<string>("luu-niem");
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
        Quầy tự thêm bớt được <strong>đồ lưu niệm</strong> (áo, khăn, móc khoá…). Cà phê, trà, nước là bảng giá đã
        niêm yết nên chỉ quản trị sửa. Định mức nguyên liệu khai ở trang Báo cáo quầy → khối KHO.
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
  lines: Array<{ id: string; name: string; note: string; price: number; qty: number }>;
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

  /**
   * MÃ QR DỰNG SẴN, KHÔNG ĐỢI BẤM "CK" (luật chủ 06/09).
   *
   * Quầy xoay máy ra là khách quét luôn — khách quyết định trả cách nào lúc
   * nhìn màn hình, chứ không phải người bán đoán trước rồi mới bày mã ra.
   */
  useEffect(() => {
    if (total <= 0) return;
    let alive = true;
    const payload = buildVietQrPayload({
      bankBin: PAY_ACCOUNT_CAFE_HOMESTAY.bankBin,
      accountNumber: PAY_ACCOUNT_CAFE_HOMESTAY.accountNumber,
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
  }, [total, note]);

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
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold text-slate-900">{l.name}</span>
                {/* CÂU DẶN hiện ngay dưới tên món: khách soát lại "ít đá" đã bấm
                    chưa trước khi trả tiền — đọc trên phiếu in ra thì muộn rồi. */}
                {l.note && <span className="block text-sm italic text-sky-700">{l.note}</span>}
              </span>
              {/* Bề rộng CỐ ĐỊNH cho ô số lượng, để cột tiền của mọi dòng — và
                  của hàng TỔNG bên dưới — rơi đúng một đường dọc. */}
              <span className="w-12 shrink-0 text-right text-base text-slate-500">×{l.qty}</span>
              <span className="w-28 shrink-0 whitespace-nowrap text-right text-base font-semibold tabular-nums text-slate-900">
                {l.price ? `${vnd(l.price * l.qty)} đ` : "FREE"}
              </span>
            </li>
          ))}
        </ul>

        {discountAmount > 0 && (
          <div className="mt-2 space-y-1 text-base">
            <div className="flex items-baseline gap-2 text-slate-500">
              <span className="min-w-0 flex-1">Tạm tính</span>
              <span className="w-12 shrink-0" />
              <span className="w-28 shrink-0 whitespace-nowrap text-right tabular-nums">{vnd(subtotal)} đ</span>
            </div>
            <div className="flex items-baseline gap-2 font-semibold text-amber-700">
              <span className="min-w-0 flex-1">Giảm{discountLabel ? ` · ${discountLabel}` : ""}</span>
              <span className="w-12 shrink-0" />
              <span className="w-28 shrink-0 whitespace-nowrap text-right tabular-nums">− {vnd(discountAmount)} đ</span>
            </div>
          </div>
        )}

        {/*
          TỔNG: nền ĐỎ cho khách nhìn phát ra ngay số phải trả.

          Ô tiền KHÔNG đặt bề rộng cứng — chữ to gấp rưỡi các dòng trên nên
          "1.250.000 đ" tràn khỏi 7rem rồi rớt chữ "đ" xuống hàng dưới (chuyện
          thật 06/09). Để nó tự nở và cấm bẻ dòng; cột vẫn thẳng vì mọi dòng
          đều dồn phải về CÙNG MỘT MÉP, bề rộng ô chỉ quyết định chỗ chữ bắt đầu.
        */}
        <div className="mt-3 flex items-baseline gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-white">
          <span className="min-w-0 flex-1 text-lg font-bold">TỔNG</span>
          <span className="shrink-0 whitespace-nowrap text-right text-2xl font-black tabular-nums">
            {total > 0 ? `${vnd(total)} đ` : "MIỄN PHÍ"}
          </span>
        </div>

        {total > 0 && (
          <div className="mt-3 rounded-2xl border-2 border-sky-300 bg-sky-50 p-3 text-center">
            <p className="text-sm font-bold text-sky-900">
              {method === "transfer" ? "Quét mã để chuyển khoản" : "Hoặc quét mã để chuyển khoản"}
            </p>
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
                <strong className="text-slate-900">{PAY_ACCOUNT_CAFE_HOMESTAY.bankName}</strong>
              </p>
              <p>
                <span className="text-slate-500">Số tài khoản:</span>{" "}
                <strong className="text-lg tabular-nums text-slate-900">{PAY_ACCOUNT_CAFE_HOMESTAY.accountNumber}</strong>
              </p>
              <p>
                <span className="text-slate-500">Chủ tài khoản:</span>{" "}
                <strong className="text-slate-900">{PAY_ACCOUNT_CAFE_HOMESTAY.accountName}</strong>
              </p>
              <p>
                <span className="text-slate-500">Nội dung:</span>{" "}
                <strong className="text-slate-900">{note}</strong>
              </p>
            </div>
          </div>
        )}

        {method === "cash" && total > 0 && (
          <p className="mt-2 text-center text-base font-semibold text-emerald-700">Hoặc trả tiền mặt tại quầy</p>
        )}
      </div>
    </div>
  );
}

/**
 * ĐĂNG NHẬP NGAY TRÊN TRANG BÁN.
 *
 * Máy Sunmi ngoài bãi là thiết bị một-việc: người trực mở máy, thấy ô đăng
 * nhập, gõ xong là bán. Đưa họ sang cổng chung /baocao rồi bắt tự tìm đường
 * về là thừa một bước ở đúng lúc đang có khách đứng đợi — mà cũng dễ lạc sang
 * trang khác của khu báo cáo.
 *
 * Đăng nhập xong CẤT PHIÊN vào máy: lần sau mất mạng vẫn mở bán được.
 */
function CafeLogin({ onDone }: { onDone: (u: BaobayUserDTO) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return setErr("Nhập tên đăng nhập và mật khẩu");
    setBusy(true);
    setErr(null);
    try {
      const res = await apiPost<{ user: BaobayUserDTO }>("/api/baocao/login", {
        username: username.trim(),
        password,
      });
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
      } catch { /* không cất được phiên — lần offline sau phải đăng nhập lại */ }
      onDone(res.user);
    } catch (e2: unknown) {
      setErr(e2 instanceof Error ? e2.message : "Không đăng nhập được");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-100 p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg">
        <h1 className="text-center text-2xl font-black text-slate-900">☕ CAFE</h1>
        <p className="mt-1 text-center text-sm text-slate-500">Máy bán hàng quầy cafe — Khau Phạ</p>

        {err && (
          <div className="mt-3">
            <Banner tone="error" onClose={() => setErr(null)}>
              {err}
            </Banner>
          </div>
        )}

        <label className="mt-4 block">
          <span className="mb-1 block text-[13px] font-medium text-slate-700">Tên đăng nhập</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            className="h-11 w-full rounded-lg border border-slate-300 px-3 text-base"
          />
        </label>
        <label className="mt-3 block">
          <span className="mb-1 block text-[13px] font-medium text-slate-700">Mật khẩu</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="h-11 w-full rounded-lg border border-slate-300 px-3 text-base"
          />
        </label>

        <Button type="submit" disabled={busy} className="mt-4 h-12 w-full text-base font-black">
          {busy ? "Đang vào…" : "VÀO BÁN HÀNG"}
        </Button>
      </form>
    </div>
  );
}
