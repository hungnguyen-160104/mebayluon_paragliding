// services/cafe.service.ts
/**
 * QUẦY CAFE — nhận phiếu bán từ máy (kể cả phiếu dồn lại sau khi mất mạng)
 * và dựng bảng tổng theo ngày: thu TM · CK · chi · số khách uống nước free.
 */
import mongoose from "mongoose";

import { CAFE_COUNTERS, CAFE_MENU, type CafeEntry } from "@/lib/baobay/cafe";
import { isDateKey, toDateKeyVN, todayInVN } from "@/lib/baobay/date";
import type { BaobaySession } from "@/lib/baobay/token";
import type { CafeReportDTO, CafeStockRequestDTO } from "@/lib/baobay/types";
import { connectDB } from "@/lib/mongodb";
import { CafeDailyReport } from "@/models/CafeDailyReport.model";
import { CafeSale } from "@/models/CafeSale.model";
import {
  assertDayOpen,
  assertSpotAllowed,
  BaobayError,
  normalizeExpenses,
} from "@/services/baobay.service";

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

/* ================================================================== */
/* BÁO CÁO NGÀY CỦA NGƯỜI TRỰC QUẦY                                    */
/* ================================================================== */

/**
 * Người trực quầy chốt ca như điều phối bay: hai ô tiền (mặt / CK), sổ thu chi
 * tại quầy, và các yêu cầu nhập hàng. Máy bán đã ghi từng phiếu rồi, bản này
 * là lời khẳng định của người cầm tiền — xem models/CafeDailyReport.model.ts.
 */
export type CafeReportSaveInput = {
  spot: string;
  date: string;
  counter: string;
  cashReceived: number;
  transferReceived: number;
  expenses: Array<{ content: string; amount: number; kind?: "thu" | "chi"; method?: "cash" | "transfer"; note?: string }>;
  stockRequests: Array<{ id: string; name: string; qty: string; note: string; done: boolean }>;
  note: string;
  submit: boolean;
};

function toCafeReportDTO(doc: any): CafeReportDTO {
  return {
    id: String(doc._id),
    date: doc.date,
    counter: doc.counter || "cafe-1",
    username: doc.username || "",
    staffName: doc.staffName || "",
    cashReceived: doc.cashReceived || 0,
    transferReceived: doc.transferReceived || 0,
    expenses: doc.expenses ?? [],
    stockRequests: (doc.stockRequests ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      qty: r.qty || "",
      note: r.note || "",
      done: Boolean(r.done),
      doneBy: r.doneBy || undefined,
      doneAt: r.doneAt ? new Date(r.doneAt).toISOString() : undefined,
    })),
    note: doc.note || "",
    submitted: Boolean(doc.submitted),
    submittedAt: doc.submittedAt ? new Date(doc.submittedAt).toISOString() : undefined,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : "",
  };
}

/** Mã dòng nhập hàng — chỉ cần duy nhất trong một báo cáo, không cần uuid thật. */
function stockRowId(): string {
  return `sr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function getCafeReport(
  accountId: string,
  spot: string,
  date: string,
): Promise<CafeReportDTO | null> {
  await connectDB();
  const doc = await CafeDailyReport.findOne({
    accountId: new mongoose.Types.ObjectId(accountId),
    spot,
    date,
  }).lean<any>();
  return doc ? toCafeReportDTO(doc) : null;
}

export async function upsertCafeReport(
  session: BaobaySession,
  input: CafeReportSaveInput,
): Promise<{ report: CafeReportDTO; warnings: string[] }> {
  await connectDB();
  const spot = assertSpotAllowed(session, input.spot);
  await assertDayOpen(spot, input.date);

  const warnings: string[] = [];
  const { list: expenses, warnings: expenseWarnings } = normalizeExpenses(input.expenses);
  warnings.push(...expenseWarnings);

  /**
   * Dòng nhập hàng đã đánh dấu "đã nhập" thì GIỮ NGUYÊN dấu và tên người nhập:
   * người trực lưu lại báo cáo không được vô tình xoá dấu của người đi mua.
   */
  const old = await CafeDailyReport.findOne({
    accountId: new mongoose.Types.ObjectId(session.id),
    spot,
    date: input.date,
  })
    .select("stockRequests")
    .lean<any>();
  const oldById = new Map<string, any>((old?.stockRequests ?? []).map((r: any) => [r.id, r]));

  const stockRequests = input.stockRequests
    .map((r) => {
      const name = String(r.name ?? "").trim();
      const qty = String(r.qty ?? "").trim();
      const note = String(r.note ?? "").trim();
      if (!name && !qty && !note) return null;
      const prev = r.id ? oldById.get(r.id) : undefined;
      return {
        id: r.id && prev ? r.id : stockRowId(),
        name,
        qty,
        note,
        done: prev ? Boolean(prev.done) : false,
        doneBy: prev?.doneBy,
        doneAt: prev?.doneAt,
      };
    })
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  for (const r of stockRequests) {
    if (!r.name) warnings.push("Có dòng nhập hàng chưa ghi tên hàng");
    else if (!r.qty) warnings.push(`Hàng “${r.name}” chưa ghi số lượng`);
  }

  const counter = COUNTER_IDS.has(input.counter) ? input.counter : CAFE_COUNTERS[0].id;

  const doc = await CafeDailyReport.findOneAndUpdate(
    { accountId: new mongoose.Types.ObjectId(session.id), date: input.date, spot },
    {
      $set: {
        username: session.username,
        staffName: session.name,
        spot,
        counter,
        cashReceived: input.cashReceived,
        transferReceived: input.transferReceived,
        expenses,
        stockRequests,
        note: input.note,
        submitted: input.submit,
        ...(input.submit ? { submittedAt: new Date() } : { submittedAt: undefined }),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean<any>();

  return { report: toCafeReportDTO(doc), warnings };
}

/** Kế toán mở bảng ngày: mọi báo cáo quầy cafe của ngày đó. */
export async function listCafeReportsOfDate(spot: string, date: string): Promise<CafeReportDTO[]> {
  await connectDB();
  const docs = await CafeDailyReport.find({ spot, date }).sort({ counter: 1 }).lean<any[]>();
  return docs.map(toCafeReportDTO);
}

/**
 * YÊU CẦU NHẬP HÀNG CÒN CHỜ — gom từ mọi báo cáo trong 45 ngày gần nhất.
 *
 * Hàng chưa mua thì không được biến mất theo ngày: quầy báo hết sữa hôm thứ
 * hai, người đi chợ mở máy hôm thứ tư vẫn phải thấy dòng đó.
 */
export async function listPendingStockRequests(
  spot: string,
): Promise<Array<{ reportId: string; date: string; counter: string; staffName: string } & CafeStockRequestDTO>> {
  await connectDB();
  const from = new Date(Date.now() - 45 * 86_400_000).toISOString().slice(0, 10);
  const docs = await CafeDailyReport.find({ spot, date: { $gte: from }, "stockRequests.done": false })
    .sort({ date: -1 })
    .limit(200)
    .lean<any[]>();
  const out: Array<any> = [];
  for (const d of docs) {
    for (const r of d.stockRequests ?? []) {
      if (r.done) continue;
      out.push({
        reportId: String(d._id),
        date: d.date,
        counter: d.counter || "cafe-1",
        staffName: d.staffName || "",
        id: r.id,
        name: r.name,
        qty: r.qty || "",
        note: r.note || "",
        done: false,
      });
    }
  }
  return out;
}

/**
 * Người đi mua bấm "đã nhập" cho một dòng.
 *
 * Đánh dấu theo MÃ DÒNG, không theo vị trí: người trực vẫn đang thêm/bớt dòng
 * khác trong lúc đó, đếm theo vị trí là trúng nhầm hàng.
 */
export async function markStockRequestDone(
  session: BaobaySession,
  reportId: string,
  rowId: string,
  done: boolean,
): Promise<void> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(reportId)) throw new BaobayError("Báo cáo không hợp lệ", 400);
  const res = await CafeDailyReport.updateOne(
    { _id: new mongoose.Types.ObjectId(reportId), "stockRequests.id": rowId },
    {
      $set: {
        "stockRequests.$.done": done,
        "stockRequests.$.doneBy": done ? session.name : undefined,
        "stockRequests.$.doneAt": done ? new Date() : undefined,
      },
    },
  );
  if (!res.matchedCount) throw new BaobayError("Không tìm thấy dòng nhập hàng này", 404);
}
