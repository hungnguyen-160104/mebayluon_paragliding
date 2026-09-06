// services/cafe.service.ts
/**
 * QUẦY CAFE — nhận phiếu bán từ máy (kể cả phiếu dồn lại sau khi mất mạng)
 * và dựng bảng tổng theo ngày: thu TM · CK · chi · số khách uống nước free.
 */
import mongoose from "mongoose";

import {
  CAFE_COUNTERS,
  CAFE_DISCOUNTS,
  CAFE_MENU,
  CAFE_SPOT,
  CAFE_STOCK_ITEMS,
  cafeDiscountCountsTicket,
  cafeDiscountRate,
  formatStockUnits,
  type CafeEntry,
  type CafeMenuItem,
  type CafeStockItem,
  type CafeStockKind,
} from "@/lib/baobay/cafe";
import { isDateKey, toDateKeyVN, todayInVN } from "@/lib/baobay/date";
import { wearsRole } from "@/lib/baobay/roles";
import type { BaobaySession } from "@/lib/baobay/token";
import type { CafeReportDTO, CafeStockRequestDTO } from "@/lib/baobay/types";
import { connectDB } from "@/lib/mongodb";
import { CafeDailyReport } from "@/models/CafeDailyReport.model";
import { CafeProduct } from "@/models/CafeProduct.model";
import { CafeSale } from "@/models/CafeSale.model";
import { CafeStockEntry } from "@/models/CafeStockEntry.model";
import { CafeStockItemDoc } from "@/models/CafeStockItem.model";
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
     * gửi: mã chạy trong trình duyệt sửa được, mà đây là doanh thu. Mức giảm
     * cũng quy về tỉ lệ trong bảng, máy không tự đặt được số giảm.
     */
    const subtotal =
      kind === "expense"
        ? Math.max(0, Math.round(Number(e?.total) || 0))
        : items.reduce((t, it) => t + it.price * it.qty, 0);
    const discountKind = kind === "sale" ? String(e?.discount ?? "none") : "none";
    const rate = kind === "sale" ? cafeDiscountRate(discountKind) : 0;
    const discountAmount = Math.round(subtotal * rate);
    const total = subtotal - discountAmount;
    /**
     * SỐ PHIẾU NƯỚC KHÁCH BAY của phiếu này — hai đường cùng đổ về một cột:
     *  - nút "phiếu nước khách bay" (món free-water), và
     *  - đơn tích "Khách bay dù": MỖI PHẦN NƯỚC LÀ MỘT PHIẾU, vì khách bay được
     *    nước theo đầu vé. Ba khách đi cùng lấy ba ly là ba phiếu.
     */
    const freeTickets =
      kind === "sale"
        ? items.filter((it) => FREE_IDS.has(it.id)).reduce((t, it) => t + it.qty, 0) +
          (cafeDiscountCountsTicket(discountKind)
            ? items.filter((it) => !FREE_IDS.has(it.id)).reduce((t, it) => t + it.qty, 0)
            : 0)
        : 0;
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
          subtotal,
          discountKind: rate > 0 ? discountKind : "none",
          discountAmount,
          total,
          /** Giảm 100% thì không có đồng nào đổi tay — ghi "free" cho khỏi lẫn vào tiền mặt. */
          method:
            kind === "sale" && total === 0
              ? "free"
              : e?.method === "transfer"
                ? "transfer"
                : e?.method === "free"
                  ? "free"
                  : "cash",
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
    /** Tiền đã giảm cho phi công/người nhà và khách ngoại giao trong ngày. */
    discountTotal: number;
  }>;
  totals: {
    cashTotal: number;
    transferTotal: number;
    expenseTotal: number;
    freeTickets: number;
    saleCount: number;
    discountTotal: number;
  };
  /**
   * TỔNG THEO NGƯỜI BÁN — chủ hỏi "phiếu nước ai đang giữ", và cuối ca người
   * trực đối chiếu tiền mình cầm. Số phiếu cộng vào đúng người bấm bán.
   */
  byStaff: Array<{
    username: string;
    name: string;
    cashTotal: number;
    transferTotal: number;
    discountTotal: number;
    freeTickets: number;
    saleCount: number;
  }>;
  /** MỌI đơn của ngày, mới nhất trước — bảng tổng hợp đơn bán hàng trong ngày. */
  recent: Array<{
    clientId: string;
    counter: string;
    counterName: string;
    kind: string;
    label: string;
    items: Array<{ name: string; qty: number; price: number }>;
    subtotal: number;
    discountKind: string;
    discountLabel: string;
    discountAmount: number;
    freeTickets: number;
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

  type Tally = { cash: number; transfer: number; expense: number; free: number; sales: number; disc: number };
  const zero = (): Tally => ({ cash: 0, transfer: 0, expense: 0, free: 0, sales: 0, disc: 0 });
  const byCounter = new Map<string, Tally>();
  for (const c of CAFE_COUNTERS) byCounter.set(c.id, zero());
  for (const d of docs) {
    const t = byCounter.get(d.counter) ?? zero();
    if (d.kind === "expense") t.expense += d.total || 0;
    else {
      t.sales += 1;
      t.free += d.freeTickets || 0;
      t.disc += d.discountAmount || 0;
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
      discountTotal: t.disc,
    };
  });
  const totals = counters.reduce(
    (a, c) => ({
      cashTotal: a.cashTotal + c.cashTotal,
      transferTotal: a.transferTotal + c.transferTotal,
      expenseTotal: a.expenseTotal + c.expenseTotal,
      freeTickets: a.freeTickets + c.freeTickets,
      saleCount: a.saleCount + c.saleCount,
      discountTotal: a.discountTotal + c.discountTotal,
    }),
    { cashTotal: 0, transferTotal: 0, expenseTotal: 0, freeTickets: 0, saleCount: 0, discountTotal: 0 },
  );

  /** Gom theo người bấm bán — phiếu nước và tiền mặt đều là thứ người đó đang giữ. */
  const staff = new Map<string, CafeDayDTO["byStaff"][number]>();
  for (const d of docs) {
    const u = d.byUsername || "?";
    const cur =
      staff.get(u) ??
      { username: u, name: d.byName || u, cashTotal: 0, transferTotal: 0, discountTotal: 0, freeTickets: 0, saleCount: 0 };
    if (d.kind === "sale") {
      cur.saleCount += 1;
      cur.freeTickets += d.freeTickets || 0;
      cur.discountTotal += d.discountAmount || 0;
      if (d.method === "cash") cur.cashTotal += d.total || 0;
      if (d.method === "transfer") cur.transferTotal += d.total || 0;
    }
    staff.set(u, cur);
  }

  const counterName = new Map(CAFE_COUNTERS.map((c) => [c.id as string, c.name as string]));
  return {
    date,
    counters,
    totals,
    byStaff: [...staff.values()].sort((a, b) => b.freeTickets - a.freeTickets || b.cashTotal - a.cashTotal),
    recent: docs.slice(0, 300).map((d) => ({
      clientId: d.clientId,
      counter: d.counter,
      counterName: counterName.get(d.counter) ?? d.counter,
      kind: d.kind,
      items: (d.items ?? []).map((it: any) => ({ name: it.name, qty: it.qty || 0, price: it.price || 0 })),
      subtotal: d.subtotal ?? d.total ?? 0,
      discountKind: d.discountKind || "none",
      discountLabel:
        d.discountKind && d.discountKind !== "none"
          ? (CAFE_DISCOUNTS.find((x) => x.id === d.discountKind)?.short ?? "giảm giá")
          : "",
      discountAmount: d.discountAmount || 0,
      freeTickets: d.freeTickets || 0,
      label:
        d.kind === "expense"
          ? `CHI: ${d.note || "?"}`
          : (d.items ?? []).map((it: any) => `${it.name}${it.qty > 1 ? ` ×${it.qty}` : ""}`).join(", ") +
            (d.discountKind && d.discountKind !== "none"
              ? ` [${CAFE_DISCOUNTS.find((x) => x.id === d.discountKind)?.short ?? "giảm giá"}]`
              : ""),
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
    counter: doc.counter || "bai-ha",
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
        counter: d.counter || "bai-ha",
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

/* ================================================================== */
/* DANH MỤC KHO                                                        */
/* ================================================================== */

/**
 * DANH MỤC KHO ĐANG DÙNG = danh mục nền trong mã + mặt hàng quầy tự thêm.
 * Trùng mã thì bản của quầy đè lên (đổi quy cách đóng gói, đổi tên).
 */
export async function getCafeStockCatalogue(): Promise<CafeStockItem[]> {
  await connectDB();
  const custom = await CafeStockItemDoc.find({ spot: CAFE_SPOT }).lean<any[]>();
  const byKey = new Map<string, any>(custom.map((c) => [c.key, c]));

  const out: CafeStockItem[] = [];
  for (const base of CAFE_STOCK_ITEMS) {
    const over = byKey.get(base.key);
    if (over && !over.active) continue;
    out.push(
      over
        ? {
            key: base.key,
            name: over.name || base.name,
            kind: (over.kind || base.kind) as CafeStockKind,
            unit: over.unit || base.unit,
            packName: over.packName || base.packName,
            packSize: over.packSize || base.packSize,
          }
        : base,
    );
    byKey.delete(base.key);
  }
  for (const c of byKey.values()) {
    if (!c.active) continue;
    out.push({
      key: c.key,
      name: c.name,
      kind: (c.kind || "packaged") as CafeStockKind,
      unit: c.unit || "cái",
      packName: c.packName || "thùng",
      packSize: c.packSize || 1,
    });
  }
  return out;
}

export async function upsertCafeStockItem(
  session: BaobaySession,
  input: { key?: string; name: string; kind?: string; unit?: string; packName?: string; packSize?: number; active?: boolean },
): Promise<CafeStockItem[]> {
  await connectDB();
  /** Danh mục kho đi liền với định mức — cùng là việc của quản trị. */
  if (!wearsRole(session, "admin")) {
    throw new BaobayError("Danh mục kho do quản trị đặt — quầy không sửa được", 403);
  }
  const name = String(input.name ?? "").trim();
  if (!name) throw new BaobayError("Chưa đặt tên mặt hàng", 400);
  const key = String(input.key ?? "").trim() || slugify(name);
  if (!key) throw new BaobayError("Tên mặt hàng phải có chữ hoặc số", 400);

  const kind = input.kind === "ingredient" ? "ingredient" : "packaged";
  /** Nguyên liệu mặc định đong bằng gam; hàng đóng gói mặc định đếm "cái". */
  const unit = String(input.unit ?? "").trim() || (kind === "ingredient" ? "g" : "cái");

  await CafeStockItemDoc.updateOne(
    { spot: CAFE_SPOT, key },
    {
      $set: {
        name,
        kind,
        unit,
        packName: String(input.packName ?? "").trim() || "thùng",
        packSize: Math.max(1, Math.round(Number(input.packSize) || 1)),
        active: input.active !== false,
      },
      $setOnInsert: { createdByUsername: session.username, createdByName: session.name },
    },
    { upsert: true },
  );
  return getCafeStockCatalogue();
}

/* ================================================================== */
/* MÓN QUẦY TỰ THÊM                                                    */
/* ================================================================== */

/**
 * MENU ĐANG DÙNG = menu trong mã + món quầy tự thêm.
 *
 * Món tự thêm trùng mã với món trong mã thì ĐÈ LÊN — đó là đường đổi giá tại
 * chỗ mà không cần deploy. Món đã ẩn (`active: false`) bị loại khỏi menu nhưng
 * bản ghi vẫn còn để tra tên cho phiếu cũ.
 */
export async function getCafeMenu(): Promise<CafeMenuItem[]> {
  await connectDB();
  const custom = await CafeProduct.find({ spot: CAFE_SPOT }).lean<any[]>();
  const byKey = new Map<string, any>(custom.map((c) => [c.key, c]));

  const merged: CafeMenuItem[] = [];
  for (const m of CAFE_MENU) {
    const over = byKey.get(m.id);
    if (over && !over.active) continue; // món gốc bị quầy ẩn đi
    merged.push(
      over
        ? {
            ...m,
            name: over.name || m.name,
            en: over.en || m.en,
            price: over.price,
            group: (over.group || m.group) as CafeMenuItem["group"],
            uses: (over.uses ?? []).length ? over.uses : m.uses,
          }
        : m,
    );
    byKey.delete(m.id);
  }
  for (const c of byKey.values()) {
    if (!c.active) continue;
    merged.push({
      id: c.key,
      name: c.name,
      en: c.en || undefined,
      price: c.price || 0,
      group: (c.group || "do-uong") as CafeMenuItem["group"],
      uses: c.uses ?? [],
    });
  }
  return merged;
}

/** Bỏ dấu tiếng Việt rồi rút thành slug — tên món thành mã món. */
function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function upsertCafeProduct(
  session: BaobaySession,
  input: {
    key?: string;
    name: string;
    en?: string;
    price: number;
    group?: string;
    uses?: Array<{ key: string; qty: number }>;
    active?: boolean;
  },
): Promise<CafeMenuItem[]> {
  await connectDB();
  const name = String(input.name ?? "").trim();
  if (!name) throw new BaobayError("Chưa đặt tên món", 400);
  const price = Math.max(0, Math.round(Number(input.price) || 0));

  /**
   * Mã món suy từ TÊN khi thêm mới. Trùng mã món đang có nghĩa là quầy đang
   * SỬA món đó (đổi giá, đổi tên tiếng Anh) — đúng ý người bấm, không phải lỗi.
   */
  const key = String(input.key ?? "").trim() || slugify(name);
  if (!key) throw new BaobayError("Tên món phải có chữ hoặc số", 400);

  /**
   * ĐỊNH MỨC LÀ QUYỀN QUẢN TRỊ (luật chủ 06/09). Người trực quầy thêm món và
   * đổi giá được, nhưng không sửa được "một ly rút bao nhiêu gam" — đó là con
   * số quyết định giá vốn và kết quả kiểm kê, sửa được tại quầy thì kho nói
   * gì cũng đúng.
   *
   * Người trực lưu món: GIỮ NGUYÊN định mức cũ, không xoá. Trước đây gửi thiếu
   * `uses` là ghi đè thành rỗng — người trực đổi giá một món xong là định mức
   * quản trị đã khai bốc hơi.
   */
  const isAdmin = wearsRole(session, "admin");
  const prev = await CafeProduct.findOne({ spot: CAFE_SPOT, key }).select("uses").lean<any>();
  const baseUses = CAFE_MENU.find((m) => m.id === key)?.uses ?? [];
  let uses: Array<{ key: string; qty: number }> = prev?.uses ?? baseUses;

  if (isAdmin && input.uses !== undefined) {
    const catalogue = await getCafeStockCatalogue();
    uses = input.uses
      .map((u) => ({ key: String(u?.key ?? "").trim(), qty: Math.max(0, Number(u?.qty) || 0) }))
      .filter((u) => u.key && u.qty > 0);
    /** Định mức chỉ nhận mặt hàng CÓ THẬT — gõ nhầm mã là số kiểm kê rơi vào hư không. */
    for (const u of uses) {
      if (!catalogue.some((c) => c.key === u.key)) {
        throw new BaobayError(`Mặt hàng kho “${u.key}” không có trong danh mục`, 400);
      }
    }
  } else if (!isAdmin && input.uses !== undefined) {
    throw new BaobayError("Định mức nguyên liệu do quản trị đặt — quầy không sửa được", 403);
  }

  await CafeProduct.updateOne(
    { spot: CAFE_SPOT, key },
    {
      $set: {
        name,
        en: String(input.en ?? "").trim(),
        price,
        group: String(input.group ?? "do-uong"),
        uses,
        active: input.active !== false,
      },
      $setOnInsert: { createdByUsername: session.username, createdByName: session.name },
    },
    { upsert: true },
  );
  return getCafeMenu();
}

/** Ẩn / hiện lại một món. Không xoá: phiếu cũ còn tra tên theo mã này. */
export async function setCafeProductActive(key: string, active: boolean): Promise<CafeMenuItem[]> {
  await connectDB();
  const base = CAFE_MENU.find((m) => m.id === key);
  await CafeProduct.updateOne(
    { spot: CAFE_SPOT, key },
    {
      $set: { active },
      // Ẩn một món GỐC thì phải đẻ bản ghi đè, vì món gốc nằm trong mã
      $setOnInsert: {
        name: base?.name ?? key,
        en: base?.en ?? "",
        price: base?.price ?? 0,
        group: base?.group ?? "do-uong",
        uses: base?.uses ?? [],
      },
    },
    { upsert: true },
  );
  return getCafeMenu();
}

/* ================================================================== */
/* KHO: NHẬP VÀO — BÁN RA — CÒN LẠI                                    */
/* ================================================================== */

export type CafeStockRow = {
  key: string;
  name: string;
  kind: CafeStockKind;
  unit: string;
  packName: string;
  packSize: number;
  /** Nhập trong kỳ, quy về đơn vị gốc. */
  inUnits: number;
  /** Bán/pha trong kỳ theo ĐỊNH MỨC — gồm cả phiếu giảm 100%: hàng vẫn rời kho. */
  usedUnits: number;
  /** Trong số đó, bao nhiêu đi theo phiếu giảm giá — giải thích chỗ hụt tiền. */
  usedDiscounted: number;
  remaining: number;
  /** Chữ dễ đọc: "1,5 kg" thay vì "1500 g". */
  inText: string;
  usedText: string;
  remainingText: string;
  /** Món nào rút mặt hàng này, kèm định mức — để soát khi số vô lý. */
  usedBy: Array<{ name: string; qty: number; sold: number }>;
};

export type CafeStockReport = {
  from: string;
  to: string;
  rows: CafeStockRow[];
  /** Món đang bán mà CHƯA khai định mức — nhắc quầy điền, không thì kiểm kê hụt. */
  missingRecipe: Array<{ id: string; name: string; sold: number }>;
  entries: Array<{
    id: string;
    date: string;
    stockKey: string;
    name: string;
    packs: number;
    packSize: number;
    looseUnits: number;
    units: number;
    unit: string;
    cost: number;
    note: string;
    byName: string;
  }>;
};

/**
 * Bảng kiểm kê một kỳ: nhập bao nhiêu, dùng hết bao nhiêu, còn bao nhiêu.
 *
 * "Dùng" tính theo ĐỊNH MỨC của từng món chứ không theo tiền: bán 40 ly cà phê
 * sữa, định mức 20g bột một ly, là 800g bột đã rời kho. Phiếu giảm 100% cho
 * khách ngoại giao cũng rút hàng như phiếu thường — bỏ nó ra thì trên giấy lúc
 * nào cũng thừa hàng.
 *
 * Món chưa khai định mức thì KHÔNG đoán bừa: liệt vào `missingRecipe` để quầy
 * điền. Đoán hộ một con số rồi in ra như số thật còn tệ hơn là để trống.
 */
export async function getCafeStockReport(from: string, to: string): Promise<CafeStockReport> {
  await connectDB();

  const [catalogue, menu] = await Promise.all([getCafeStockCatalogue(), getCafeMenu()]);
  const menuById = new Map(menu.map((m) => [m.id, m]));

  const [entries, sales] = await Promise.all([
    CafeStockEntry.find({ spot: CAFE_SPOT, date: { $gte: from, $lte: to } })
      .sort({ date: -1 })
      .lean<any[]>(),
    CafeSale.find({ kind: "sale", date: { $gte: from, $lte: to } })
      .select("items discountKind")
      .lean<any[]>(),
  ]);

  const inBy = new Map<string, number>();
  for (const e of entries) inBy.set(e.stockKey, (inBy.get(e.stockKey) ?? 0) + (e.units || 0));

  const usedBy = new Map<string, number>();
  const usedDiscBy = new Map<string, number>();
  /** Mã món → số phần đã bán, để dựng cột "món nào rút hàng này". */
  const soldByItem = new Map<string, number>();

  for (const s of sales) {
    const discounted = s.discountKind && s.discountKind !== "none";
    for (const it of s.items ?? []) {
      const qty = it.qty || 0;
      if (qty <= 0) continue;
      soldByItem.set(it.id, (soldByItem.get(it.id) ?? 0) + qty);
      for (const u of menuById.get(it.id)?.uses ?? []) {
        const used = qty * (u.qty || 0);
        usedBy.set(u.key, (usedBy.get(u.key) ?? 0) + used);
        if (discounted) usedDiscBy.set(u.key, (usedDiscBy.get(u.key) ?? 0) + used);
      }
    }
  }

  const rows: CafeStockRow[] = catalogue.map((c) => {
    const inUnits = inBy.get(c.key) ?? 0;
    const usedUnits = usedBy.get(c.key) ?? 0;
    const remaining = inUnits - usedUnits;
    return {
      key: c.key,
      name: c.name,
      kind: c.kind,
      unit: c.unit,
      packName: c.packName,
      packSize: c.packSize,
      inUnits,
      usedUnits,
      usedDiscounted: usedDiscBy.get(c.key) ?? 0,
      remaining,
      inText: formatStockUnits(inUnits, c.unit),
      usedText: formatStockUnits(usedUnits, c.unit),
      remainingText: formatStockUnits(remaining, c.unit),
      usedBy: menu
        .filter((m) => (m.uses ?? []).some((u) => u.key === c.key))
        .map((m) => ({
          name: m.name,
          qty: (m.uses ?? []).find((u) => u.key === c.key)!.qty,
          sold: soldByItem.get(m.id) ?? 0,
        }))
        .filter((x) => x.sold > 0)
        .sort((a, b) => b.sold - a.sold),
    };
  });

  const missingRecipe = [...soldByItem.entries()]
    .filter(([id]) => {
      const m = menuById.get(id);
      return m && !m.freeTicket && (m.uses ?? []).length === 0;
    })
    .map(([id, sold]) => ({ id, name: menuById.get(id)!.name, sold }))
    .sort((a, b) => b.sold - a.sold);

  const itemOf = new Map(catalogue.map((c) => [c.key, c]));
  return {
    from,
    to,
    rows,
    missingRecipe,
    entries: entries.map((e) => ({
      id: String(e._id),
      date: e.date,
      stockKey: e.stockKey,
      name: itemOf.get(e.stockKey)?.name ?? e.stockKey,
      packs: e.packs || 0,
      packSize: e.packSize || 1,
      looseUnits: e.looseUnits || 0,
      units: e.units || 0,
      unit: itemOf.get(e.stockKey)?.unit ?? "",
      cost: e.cost || 0,
      note: e.note || "",
      byName: e.byName || "",
    })),
  };
}

/** Ghi một lần nhập hàng. Khai theo kiện thì máy nhân ra đơn vị lẻ. */
export async function addCafeStockEntry(
  session: BaobaySession,
  input: { date: string; stockKey: string; packs: number; looseUnits: number; cost: number; note: string },
): Promise<void> {
  await connectDB();
  const item = (await getCafeStockCatalogue()).find((s) => s.key === input.stockKey);
  if (!item) throw new BaobayError("Mặt hàng không có trong danh mục kho", 400);
  if (!isDateKey(input.date)) throw new BaobayError("Ngày nhập không hợp lệ", 400);

  const packs = Math.max(0, Math.round(Number(input.packs) || 0));
  const looseUnits = Math.max(0, Math.round(Number(input.looseUnits) || 0));
  const units = packs * item.packSize + looseUnits;
  if (units <= 0) throw new BaobayError("Chưa khai số lượng nhập", 400);

  await CafeStockEntry.create({
    spot: CAFE_SPOT,
    date: input.date,
    stockKey: item.key,
    packs,
    packSize: item.packSize,
    looseUnits,
    units,
    cost: Math.max(0, Math.round(Number(input.cost) || 0)),
    note: String(input.note ?? "").slice(0, 300),
    byUsername: session.username,
    byName: session.name,
  });
}

/** Xoá một dòng nhập ghi nhầm. */
export async function deleteCafeStockEntry(id: string): Promise<void> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(id)) throw new BaobayError("Dòng nhập không hợp lệ", 400);
  await CafeStockEntry.deleteOne({ _id: new mongoose.Types.ObjectId(id) });
}
