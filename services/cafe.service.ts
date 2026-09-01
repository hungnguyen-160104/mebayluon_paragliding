// services/cafe.service.ts
/**
 * QUẦY CAFE — nhận phiếu bán từ máy (kể cả phiếu dồn lại sau khi mất mạng)
 * và dựng bảng tổng theo ngày: thu TM · CK · chi · số khách uống nước free.
 */
import { CAFE_COUNTERS, CAFE_MENU, type CafeEntry } from "@/lib/baobay/cafe";
import { isDateKey, toDateKeyVN, todayInVN } from "@/lib/baobay/date";
import type { BaobaySession } from "@/lib/baobay/token";
import { connectDB } from "@/lib/mongodb";
import { CafeSale } from "@/models/CafeSale.model";
import { BaobayError } from "@/services/baobay.service";

const COUNTER_IDS = new Set<string>(CAFE_COUNTERS.map((c) => c.id));
const FREE_IDS = new Set(CAFE_MENU.filter((m) => m.freeTicket).map((m) => m.id));

/**
 * Nhận MỘT LÔ phiếu từ máy bán. Upsert theo `clientId` nên máy gửi lại bao
 * nhiêu lần cũng chỉ một bản ghi — mạng chập chờn không đẻ ra tiền đôi.
 * Trả về danh sách clientId đã ghi nhận để máy xoá khỏi hàng đợi.
 */
export async function syncCafeEntries(
  session: BaobaySession,
  entries: CafeEntry[],
): Promise<{ acked: string[] }> {
  await connectDB();
  const acked: string[] = [];

  for (const e of entries.slice(0, 200)) {
    const clientId = String(e?.clientId ?? "").trim();
    if (!/^[A-Za-z0-9-]{8,64}$/.test(clientId)) continue;
    if (!COUNTER_IDS.has(String(e?.counter))) continue;
    const kind = e?.kind === "expense" ? "expense" : "sale";

    const soldAt = new Date(e?.soldAt ?? "");
    // Giờ máy bán có thể sai lệch/rác — rác thì lấy giờ nhận, còn hơn mất phiếu
    const at = Number.isFinite(soldAt.getTime()) ? soldAt : new Date();

    const items = (Array.isArray(e?.items) ? e.items : [])
      .slice(0, 30)
      .map((it) => ({
        id: String(it?.id ?? "").slice(0, 40),
        name: String(it?.name ?? "").slice(0, 100),
        price: Math.max(0, Math.round(Number(it?.price) || 0)),
        qty: Math.max(1, Math.round(Number(it?.qty) || 1)),
      }))
      .filter((it) => it.name);

    /**
     * TIỀN TÍNH LẠI Ở MÁY CHỦ từ chính các dòng món — không tin `total` máy
     * gửi: mã chạy trong trình duyệt sửa được, mà đây là doanh thu.
     */
    const total =
      kind === "expense"
        ? Math.max(0, Math.round(Number(e?.total) || 0))
        : items.reduce((t, it) => t + it.price * it.qty, 0);
    const freeTickets =
      kind === "sale" ? items.filter((it) => FREE_IDS.has(it.id)).reduce((t, it) => t + it.qty, 0) : 0;
    if (kind === "sale" && !items.length) continue;
    if (kind === "expense" && total <= 0) continue;

    await CafeSale.updateOne(
      { clientId },
      {
        $setOnInsert: {
          clientId,
          counter: e.counter,
          date: toDateKeyVN(at),
          kind,
          items,
          total,
          method: e?.method === "transfer" ? "transfer" : e?.method === "free" ? "free" : "cash",
          freeTickets,
          note: String(e?.note ?? "").slice(0, 300),
          soldAt: at,
          byUsername: session.username,
          byName: session.name,
          syncedAt: new Date(),
        },
      },
      { upsert: true },
    );
    acked.push(clientId);
  }
  return { acked };
}

export type CafeDayDTO = {
  date: string;
  /** Tổng cả hai quầy + tách từng quầy. */
  counters: Array<{
    counter: string;
    counterName: string;
    cashTotal: number;
    transferTotal: number;
    expenseTotal: number;
    freeTickets: number;
    saleCount: number;
  }>;
  totals: { cashTotal: number; transferTotal: number; expenseTotal: number; freeTickets: number; saleCount: number };
  /** Các phiếu gần nhất của ngày — soát nhanh, mới nhất trước. */
  recent: Array<{
    clientId: string;
    counter: string;
    kind: string;
    label: string;
    total: number;
    method: string;
    soldAt: string;
    byName: string;
  }>;
};

export async function getCafeDay(_session: BaobaySession, dateRaw?: string): Promise<CafeDayDTO> {
  await connectDB();
  const date = isDateKey(dateRaw ?? "") ? String(dateRaw) : todayInVN();
  const docs = await CafeSale.find({ date }).sort({ soldAt: -1 }).limit(1000).lean<any[]>();

  const byCounter = new Map<string, { cash: number; transfer: number; expense: number; free: number; sales: number }>();
  for (const c of CAFE_COUNTERS) byCounter.set(c.id, { cash: 0, transfer: 0, expense: 0, free: 0, sales: 0 });
  for (const d of docs) {
    const t = byCounter.get(d.counter) ?? { cash: 0, transfer: 0, expense: 0, free: 0, sales: 0 };
    if (d.kind === "expense") t.expense += d.total || 0;
    else {
      t.sales += 1;
      t.free += d.freeTickets || 0;
      if (d.method === "cash") t.cash += d.total || 0;
      if (d.method === "transfer") t.transfer += d.total || 0;
    }
    byCounter.set(d.counter, t);
  }

  const counters = CAFE_COUNTERS.map((c) => {
    const t = byCounter.get(c.id)!;
    return {
      counter: c.id,
      counterName: c.name,
      cashTotal: t.cash,
      transferTotal: t.transfer,
      expenseTotal: t.expense,
      freeTickets: t.free,
      saleCount: t.sales,
    };
  });
  const totals = counters.reduce(
    (a, c) => ({
      cashTotal: a.cashTotal + c.cashTotal,
      transferTotal: a.transferTotal + c.transferTotal,
      expenseTotal: a.expenseTotal + c.expenseTotal,
      freeTickets: a.freeTickets + c.freeTickets,
      saleCount: a.saleCount + c.saleCount,
    }),
    { cashTotal: 0, transferTotal: 0, expenseTotal: 0, freeTickets: 0, saleCount: 0 },
  );

  return {
    date,
    counters,
    totals,
    recent: docs.slice(0, 60).map((d) => ({
      clientId: d.clientId,
      counter: d.counter,
      kind: d.kind,
      label:
        d.kind === "expense"
          ? `CHI: ${d.note || "?"}`
          : (d.items ?? []).map((it: any) => `${it.name}${it.qty > 1 ? ` ×${it.qty}` : ""}`).join(", "),
      total: d.total ?? 0,
      method: d.method ?? "cash",
      soldAt: d.soldAt ? new Date(d.soldAt).toISOString() : "",
      byName: d.byName || "",
    })),
  };
}

/** Xoá một phiếu ghi nhầm — chỉ trong ngày, kế toán/chủ soát lại qua bảng ngày. */
export async function deleteCafeEntry(_session: BaobaySession, clientId: string): Promise<void> {
  await connectDB();
  const doc = await CafeSale.findOne({ clientId }).select("date").lean<any>();
  if (!doc) return;
  if (doc.date !== todayInVN()) {
    throw new BaobayError("Chỉ xoá được phiếu trong ngày — phiếu cũ nhờ kế toán xử lý", 400);
  }
  await CafeSale.deleteOne({ clientId });
}
