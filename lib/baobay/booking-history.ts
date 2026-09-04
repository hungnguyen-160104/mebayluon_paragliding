// lib/baobay/booking-history.ts

/**
 * TRUY VẾT MỘT BOOKING — "tất tần tật" (luật chủ 04/09): ai lập, ai sửa gì,
 * ai thêm/bớt dịch vụ bao nhiêu, ai thu tiền TM hay CK, tách nhóm, dời, huỷ,
 * xuất vé, khoá, kế toán soát… xếp theo thời gian thành một dòng thời gian
 * đọc được bằng mắt thường.
 *
 * Ghép từ HAI nguồn, vì mỗi nguồn hụt một nửa:
 *  - Chính bản ghi booking: các cặp `xxxAt/xxxBy` (doneBy, movedBy, lockedBy…),
 *    vệt thu tiền `collected[]`, lệnh dịch vụ `serviceChanges[]`, chiết khấu…
 *    Đủ "ai" nhưng chỉ giữ TRẠNG THÁI CUỐI — sửa 5 lần chỉ còn lần cuối.
 *  - Nhật ký bất biến BaobayBookingLog (từ 02/09/2026): mọi phép ghi, kể cả
 *    từng lần sửa. Đủ "cái gì đổi" nhưng dòng máy móc không biết ai bấm —
 *    phải mượn tên từ dòng `api` đứng ngay trước.
 * Booking lập trước 02/09 chỉ có nguồn một; sau đó có cả hai và phải khử trùng.
 *
 * Hàm thuần: không chạm DB, để chạy thử được bằng dữ liệu giả.
 */

export type HistoryTone = "create" | "money" | "service" | "status" | "audit" | "info" | "warn";

export type HistoryEvent = {
  /** ISO; null = bản ghi cũ không lưu giờ (xếp cuối, nhóm "không rõ giờ"). */
  at: string | null;
  /** Ai làm — "" = máy tự làm hoặc không lần ra. */
  by: string;
  /** Một câu người đọc hiểu ngay: "Thu 500k TM", "Flycam: 3 → 4". */
  text: string;
  /** Chi tiết phụ (mã CK, lý do, email…). */
  detail?: string;
  tone: HistoryTone;
  /** Khoá khử trùng giữa hai nguồn (cùng khoá + cách nhau < 3 phút = một việc). */
  key?: string;
};

type Doc = Record<string, unknown>;

export type RawLog = {
  op: "create" | "update" | "delete" | "api";
  action?: string;
  byName?: string;
  update?: string;
  at: string | Date;
};

const asStr = (v: unknown): string => (v == null ? "" : String(v));
const asNum = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);
const iso = (v: unknown): string | null => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
};

/** "2.190k" cho số chẵn nghìn, "2.190.500 đ" cho số lẻ, âm có dấu −. */
export function fmtMoney(n: number): string {
  const abs = Math.abs(n);
  const body = abs % 1000 === 0 ? `${(abs / 1000).toLocaleString("vi-VN")}k` : `${abs.toLocaleString("vi-VN")} đ`;
  return (n < 0 ? "−" : "") + body;
}

const METHOD: Record<string, string> = { cash: "TM", transfer: "CK", agency: "trừ tiền ĐL" };
const SERVICE_LABEL: Record<string, string> = {
  flycam: "flycam",
  video360: "cam360",
  redFlag: "cờ đỏ",
  sunset: "hoàng hôn",
  flagFlight: "kéo cờ",
};

/** Kể một cụm dịch vụ {flycam: 1, video360: 2} thành "1 flycam, 2 cam360". */
function servicesText(items: Doc | undefined): string {
  if (!items) return "";
  return Object.keys(SERVICE_LABEL)
    .filter((k) => asNum(items[k]) > 0)
    .map((k) => `${asNum(items[k])} ${SERVICE_LABEL[k]}`)
    .join(", ");
}

/* ================================================================== */
/* Nguồn 1: chính bản ghi booking                                       */
/* ================================================================== */

export function eventsFromBooking(b: Doc): HistoryEvent[] {
  const ev: HistoryEvent[] = [];
  const push = (e: HistoryEvent) => ev.push(e);

  push({
    at: iso(b.createdAt),
    by: asStr(b.createdByName),
    text: `Lập booking${b.source ? ` · nguồn ${asStr(b.source)}` : ""}${asNum(b.guestCount) ? ` · ${asNum(b.guestCount)} khách` : ""}`,
    detail: [
      asNum(b.deposit) > 0 && !(b.collected as unknown[] | undefined)?.length
        ? `cọc ${fmtMoney(asNum(b.deposit))}${METHOD[asStr(b.depositMethod)] ? ` ${METHOD[asStr(b.depositMethod)]}` : ""}${b.transferCode ? ` #${asStr(b.transferCode)}` : ""}`
        : "",
      (b.rescheduledFrom as unknown[] | undefined)?.length ? `dời từ ${(b.rescheduledFrom as string[]).join(", ")}` : "",
    ]
      .filter(Boolean)
      .join(" · "),
    tone: "create",
    key: "create",
  });

  for (const c of (b.collected as Doc[] | undefined) ?? []) {
    const amount = asNum(c.amount);
    push({
      at: iso(c.at),
      by: asStr(c.byName),
      text: `${c.kind === "full" ? "Thu nốt" : c.kind === "deposit" ? "Thu cọc/một phần" : "Thu"} ${fmtMoney(amount)} ${METHOD[asStr(c.method)] ?? asStr(c.method)}`,
      detail: [c.code ? `#${asStr(c.code)}` : "", c.verified ? "kế toán đã nhận ✓" : ""].filter(Boolean).join(" · "),
      tone: "money",
      key: `collect:${amount}`,
    });
  }

  for (const c of (b.serviceChanges as Doc[] | undefined) ?? []) {
    const items = servicesText(c.items as Doc | undefined);
    push({
      at: iso(c.at),
      by: asStr(c.byName),
      text: `${c.kind === "add" ? "Thêm dịch vụ tại bãi: +" : "Bớt dịch vụ tại bãi: −"}${items || "?"}`,
      tone: "service",
      key: `svc:${c.kind}:${items}`,
    });
  }

  const cm = b.commission as Doc | undefined;
  if (cm && asNum(cm.amount) > 0) {
    push({
      at: iso(cm.at),
      by: asStr(cm.byName),
      text: `Chi chiết khấu đại lý ${fmtMoney(asNum(cm.amount))} ${METHOD[asStr(cm.method)] ?? ""}`.trim(),
      detail: [cm.agencyName ? asStr(cm.agencyName) : "", cm.transferCode ? `#${asStr(cm.transferCode)}` : "", asStr(cm.note2)]
        .filter(Boolean)
        .join(" · "),
      tone: "money",
      key: "commission",
    });
  }

  const pair = (
    atKey: string,
    byKey: string,
    text: string,
    tone: HistoryTone,
    key: string,
    detail?: string,
    when: boolean = true,
  ) => {
    if (!when) return;
    if (!b[atKey] && !b[byKey]) return;
    push({ at: iso(b[atKey]), by: asStr(b[byKey]), text, tone, key, detail: detail || undefined });
  };

  pair("contactedAt", "contactedBy", "Gọi xác nhận khách", "info", "contact", asStr(b.contactNote));
  pair("assignedAt", "assignedBy", `Giao lịch cho ${asStr(b.assignedToName) || "?"}`, "info", "assign");
  pair("acceptedAt", "acceptedBy", "Người được giao xác nhận nhận khách", "info", "accept");
  pair("depositVerifiedAt", "depositVerifiedBy", "Kế toán soát khoản cọc — đã nhận", "audit", "deposit-verified");
  pair("insuranceApprovedAt", "insuranceApprovedBy", "Duyệt hồ sơ bảo hiểm", "audit", "ins-approve");
  pair("insuranceSentAt", "insuranceSentBy", "Gửi bảo hiểm", "audit", "ins-send");
  pair("insuranceRecalledAt", "insuranceRecalledBy", "Rút lại bảo hiểm", "warn", "ins-recall");
  pair(
    "ticketIssuedAt",
    "ticketIssuedBy",
    "Xuất vé cho khách",
    "status",
    "ticket",
    undefined,
    Boolean(b.ticketIssued),
  );
  pair(
    "noTicketAt",
    "noTicketBy",
    "Bay KHÔNG xé vé",
    "warn",
    "noticket",
    asStr(b.noTicketReason),
    Boolean(b.noTicketFlight),
  );
  pair("pilotMoneyAt", "pilotMoneyBy", b.pilotMoney ? "Bật hiện tiền cho phi công" : "Tắt hiện tiền cho phi công", "info", "pilot-money");
  pair(
    "movedAt",
    "movedBy",
    `Dời lịch sang ${asStr(b.flightDate)}`,
    "status",
    "move",
    (b.rescheduledFrom as string[] | undefined)?.length ? `từ ${(b.rescheduledFrom as string[]).join(", ")}` : undefined,
  );
  pair("doneAt", "doneBy", "Đánh dấu ĐÃ BAY", "status", "flown", undefined, b.status === "done");
  pair(
    "cancelledAt",
    "cancelledBy",
    b.status === "cancelled" ? "HUỶ booking" : `Huỷ bớt ${asNum(b.cancelledGuests)} khách`,
    "warn",
    "cancel",
    [
      asNum(b.refundAmount) > 0 ? `hoàn ${fmtMoney(asNum(b.refundAmount))} ${METHOD[asStr(b.refundMethod)] ?? ""}`.trim() : "",
      (b.cancelTicketCodes as string[] | undefined)?.length ? `thu hồi vé ${(b.cancelTicketCodes as string[]).join(" ")}` : "",
    ]
      .filter(Boolean)
      .join(" · "),
  );
  pair("lockedAt", "lockedBy", b.locked ? "Kế toán KHOÁ dòng" : "Mở khoá dòng", "audit", "lock");
  pair("voidedAt", "voidedBy", "Bỏ khỏi sổ", "warn", "void", asStr(b.voidReason));
  if (b.ckCheckedAt) push({ at: iso(b.ckCheckedAt), by: "", text: "Kế toán tích ✓CK — đã nhận đủ chuyển khoản", tone: "audit", key: "ck-checked" });
  if (b.tmCheckedAt) push({ at: iso(b.tmCheckedAt), by: "", text: "Kế toán tích ✓TM — đã nhận đủ tiền mặt", tone: "audit", key: "tm-checked" });
  if (asNum(b.refunded) > 0 && b.status !== "cancelled") {
    push({ at: null, by: "", text: `Đã hoàn lại khách tổng ${fmtMoney(asNum(b.refunded))}`, tone: "money", key: "refunded" });
  }
  if (asNum(b.agencyPaidAmount) > 0) {
    push({
      at: null,
      by: "",
      text: `Khách đã trả đại lý ${asStr(b.agencyName) || ""} ${fmtMoney(asNum(b.agencyPaidAmount))}`.replace(/\s+/g, " "),
      tone: "money",
      key: "agency-paid",
    });
  }
  return ev;
}

/* ================================================================== */
/* Nguồn 2: nhật ký bất biến                                            */
/* ================================================================== */

const API_TEXT: Record<string, string> = {
  create: "Lập booking",
  edit: "Sửa booking",
  flown: "Đánh dấu ĐÃ BAY",
  cancel: "HUỶ booking",
  "cancel-guests": "Huỷ bớt khách",
  move: "Dời lịch",
  split: "TÁCH NHÓM (một phần dời/huỷ)",
  collect: "Thu tiền",
  ticket: "Bấm Xuất vé (hoặc bỏ tích)",
  contact: "Ghi liên hệ khách",
  noticket: "Đánh dấu bay không vé",
  "notify-guest": "Gửi thư báo khách",
  restore: "HOÀN TÁC (trả về chờ bay)",
  "pilot-money": "Đổi hiện tiền cho phi công",
  lock: "KHOÁ dòng",
  unlock: "Mở khoá dòng",
  "deposit-date": "Sửa ngày trả cọc",
  assign: "Giao lịch",
  accept: "Xác nhận nhận khách",
  commission: "Chi chiết khấu đại lý",
  void: "Bỏ khỏi sổ",
};
const API_TONE: Record<string, HistoryTone> = {
  create: "create",
  collect: "money",
  commission: "money",
  flown: "status",
  ticket: "status",
  move: "status",
  split: "status",
  restore: "status",
  cancel: "warn",
  "cancel-guests": "warn",
  void: "warn",
  noticket: "warn",
  lock: "audit",
  unlock: "audit",
};
/** api action → khoá khử trùng với sự kiện từ bản ghi. */
const API_KEY: Record<string, string> = {
  create: "create",
  flown: "flown",
  cancel: "cancel",
  "cancel-guests": "cancel",
  move: "move",
  ticket: "ticket",
  contact: "contact",
  noticket: "noticket",
  lock: "lock",
  unlock: "lock",
  assign: "assign",
  accept: "accept",
  commission: "commission",
  void: "void",
  restore: "restore",
  "pilot-money": "pilot-money",
  collect: "collect-api",
  "notify-guest": "notify",
};

/** Tên hiện cho từng trường khi kể "đổi cái gì". Không có trong bảng = không kể. */
const FIELD_LABEL: Record<string, string> = {
  contactName: "Tên khách",
  phone: "SĐT",
  email: "Email",
  source: "Nguồn",
  bookingCode: "Mã booking",
  flightDate: "Ngày bay",
  expectedTime: "Giờ đến",
  flightKind: "Loại hình",
  guestCount: "Số khách",
  ppgGuests: "Khách PPG",
  flycam: "Flycam",
  video360: "Cam 360",
  redFlag: "Cờ đỏ",
  sunset: "Hoàng hôn",
  flagFlight: "Kéo cờ",
  mountainCar: "Xe lên núi",
  pickup: "Đón",
  pickupNote: "Nơi đón",
  pickupFee: "Phí đón",
  unitPrice: "Đơn giá",
  discount: "Giảm trừ",
  comboDiscount: "Giảm combo",
  totalAmount: "Tổng tiền",
  deposit: "Đã trả (cộng dồn)",
  depositMethod: "Cọc bằng",
  transferCode: "Mã CK cọc",
  depositDate: "Ngày trả cọc",
  agencyName: "Đại lý",
  agencyPaidAmount: "Khách trả đại lý",
  note: "Ghi chú",
  contactNote: "Ghi chú liên hệ",
  status: "Trạng thái",
  cancelledGuests: "Huỷ bớt khách",
  refundAmount: "Hoàn khách",
  refundMethod: "Hoàn bằng",
  ticketIssued: "Xuất vé",
  noTicketFlight: "Bay không vé",
  noTicketReason: "Lý do không vé",
  locked: "Khoá",
  pilotMoney: "Hiện tiền cho phi công",
  assignedToName: "Giao cho",
  voidReason: "Lý do bỏ sổ",
  collectorUsername: "Người thu chỉ định",
};
const MONEY_FIELDS = new Set(["unitPrice", "discount", "comboDiscount", "totalAmount", "deposit", "pickupFee", "agencyPaidAmount", "refundAmount"]);
const ENUM_TEXT: Record<string, Record<string, string>> = {
  depositMethod: { cash: "TM", transfer: "CK", "": "chưa rõ" },
  refundMethod: { cash: "TM", transfer: "CK" },
  status: { open: "chờ bay", done: "đã bay", cancelled: "đã huỷ", voided: "bỏ sổ" },
  pickup: { self: "tự đến", bigc: "BigC", hotel: "khách sạn", other: "nơi khác" },
  flightKind: { pg: "PG", ppg: "PPG", m650: "650m", m850: "850m" },
};
/** Trường mà máy tự ghi — không phải việc người làm, kể ra chỉ rối. */
const NOISE = new Set([
  "updatedAt",
  "createdAt",
  "sheetSynced",
  "sheetError",
  "syncedAt",
  "notifyPendingBase",
  "insuranceSheetAt",
  "remaining",
  "overpaid",
  "daySeq",
  "spot",
  "movedPaidOut",
  "movedTicketCodes",
  "pendingNotify",
  "lastNotify",
]);

function fmtVal(field: string, v: unknown): string {
  if (v == null || v === "") return "—";
  if (typeof v === "boolean") return v ? "có" : "không";
  if (ENUM_TEXT[field] && typeof v === "string") return ENUM_TEXT[field][v] ?? v;
  if (typeof v === "number") return MONEY_FIELDS.has(field) ? fmtMoney(v) : String(v);
  if (typeof v === "string") return v.length > 60 ? v.slice(0, 57) + "…" : v;
  if (Array.isArray(v)) return `${v.length} mục`;
  return "…";
}

/** Tên người từ chính payload ($set doneBy/movedBy/…) — dòng máy móc vẫn lộ ai làm. */
const BY_FIELDS = [
  "doneBy",
  "cancelledBy",
  "movedBy",
  "ticketIssuedBy",
  "contactedBy",
  "lockedBy",
  "depositVerifiedBy",
  "noTicketBy",
  "voidedBy",
  "assignedBy",
  "pilotMoneyBy",
  "insuranceSentBy",
  "insuranceApprovedBy",
  "insuranceRecalledBy",
  "insuranceUpdatedBy",
  "depositDateBy",
  "depositSkipBy",
];

function parseUpdate(s?: string): Doc | null {
  if (!s || !s.startsWith("{")) return null;
  try {
    return JSON.parse(s) as Doc;
  } catch {
    return null;
  }
}

/** Dòng nhật ký → 0..n sự kiện. `state` là giá trị đã biết của từng trường để kể "cũ → mới". */
function eventsFromLog(l: RawLog, state: Doc, actor: string): HistoryEvent[] {
  const at = iso(l.at);
  if (l.op === "api") {
    const a = l.action ?? "";
    return [
      {
        at,
        by: l.byName ?? "",
        text: API_TEXT[a] ?? `Thao tác ${a}`,
        detail: l.update && !l.update.startsWith("{") ? l.update : undefined,
        tone: API_TONE[a] ?? "info",
        key: API_KEY[a],
      },
    ];
  }
  if (l.op === "delete") {
    return [{ at, by: actor, text: "⚠ XOÁ CỨNG khỏi cơ sở dữ liệu — app không có tính năng này", detail: l.update, tone: "warn" }];
  }
  if (l.op === "create") {
    const snap = parseUpdate(l.update);
    if (snap) for (const k of Object.keys(snap)) state[k] = snap[k];
    return [{ at, by: actor, text: "Máy ghi: tạo bản ghi booking", tone: "create", key: "create" }];
  }

  // op === "update"
  const u = parseUpdate(l.update);
  if (!u) {
    // JSON bị cắt (bản ghi dài, hay gặp khi sửa hồ sơ bảo hiểm) — kể tên trường
    const keys = Array.from(new Set(Array.from((l.update ?? "").matchAll(/"([A-Za-z0-9_]+)":/g)).map((m) => m[1])))
      .filter((k) => FIELD_LABEL[k] || k === "insured")
      .map((k) => (k === "insured" ? "hồ sơ bảo hiểm" : FIELD_LABEL[k]));
    return keys.length ? [{ at, by: actor, text: `Sửa: ${keys.join(", ")}`, tone: "info" }] : [];
  }
  const out: HistoryEvent[] = [];
  const set = (u.$set as Doc | undefined) ?? {};
  const pushOp = (u.$push as Doc | undefined) ?? {};
  const byInSet = BY_FIELDS.map((k) => asStr(set[k])).find(Boolean) ?? "";
  const who = byInSet || actor;

  // --- $push: thu tiền, dịch vụ, thư báo khách
  if (pushOp.collected) {
    const c = pushOp.collected as Doc;
    const amount = asNum(c.amount);
    out.push({
      at,
      by: asStr(c.byName) || who,
      text: `${c.kind === "full" ? "Thu nốt" : c.kind === "deposit" ? "Thu cọc/một phần" : "Thu"} ${fmtMoney(amount)} ${METHOD[asStr(c.method)] ?? asStr(c.method)}`,
      detail: c.code ? `#${asStr(c.code)}` : undefined,
      tone: "money",
      key: `collect:${amount}`,
    });
  }
  if (pushOp.serviceChanges) {
    const c = pushOp.serviceChanges as Doc;
    const items = servicesText(c.items as Doc | undefined);
    out.push({
      at,
      by: asStr(c.byName) || who,
      text: `${c.kind === "add" ? "Thêm dịch vụ tại bãi: +" : "Bớt dịch vụ tại bãi: −"}${items || "?"}`,
      tone: "service",
      key: `svc:${c.kind}:${items}`,
    });
  }
  if (pushOp.notifyLog) {
    const n = pushOp.notifyLog as Doc;
    const changes = (n.changes as string[] | undefined) ?? [];
    out.push({
      at,
      by: asStr(n.by) || who,
      text: n.ok === false ? "Gửi thư báo khách THẤT BẠI" : "Gửi thư báo khách",
      detail: [asStr(n.to) ? `tới ${asStr(n.to)}` : "", changes.join(" · "), n.ok === false ? asStr(n.error) : ""]
        .filter(Boolean)
        .join(" — "),
      tone: n.ok === false ? "warn" : "info",
      key: "notify",
    });
  }
  if (pushOp.rescheduledFrom) {
    out.push({ at, by: who, text: `Dời lịch: ngày cũ ${asStr(pushOp.rescheduledFrom)} → ${asStr(set.flightDate) || "?"}`, tone: "status", key: "move" });
  }

  // --- $set: kể từng trường đổi, có cũ → mới khi đã biết giá trị cũ
  const changes: string[] = [];
  let insuredCount: number | null = null;
  const STATUS_KEY: Record<string, string> = { done: "flown", cancelled: "cancel", open: "restore", voided: "void" };
  for (const k of Object.keys(set)) {
    const v = set[k];
    if (NOISE.has(k) || BY_FIELDS.includes(k)) continue;
    // Thu tiền: máy tự cộng "deposit" — hệ quả của lệnh thu, không phải việc riêng
    if (k === "deposit" && pushOp.collected) {
      state[k] = v;
      continue;
    }
    if (k === "status") {
      if (state.status !== v) {
        out.push({
          at,
          by: who,
          text: `Trạng thái: ${fmtVal("status", state.status)} → ${fmtVal("status", v)}`,
          tone: v === "cancelled" || v === "voided" ? "warn" : "status",
          key: STATUS_KEY[asStr(v)],
        });
      }
      state[k] = v;
      continue;
    }
    if (k === "insured") {
      insuredCount = Array.isArray(v) ? v.length : null;
      continue;
    }
    if (k === "ckCheckedAt") {
      if (v) out.push({ at, by: who, text: "Kế toán tích ✓CK — đã nhận đủ chuyển khoản", tone: "audit", key: "ck-checked" });
      else if (state.ckCheckedAt) out.push({ at, by: who, text: "Kế toán bỏ tích ✓CK", tone: "audit" });
      state[k] = v;
      continue;
    }
    if (k === "tmCheckedAt") {
      if (v) out.push({ at, by: who, text: "Kế toán tích ✓TM — đã nhận đủ tiền mặt", tone: "audit", key: "tm-checked" });
      else if (state.tmCheckedAt) out.push({ at, by: who, text: "Kế toán bỏ tích ✓TM", tone: "audit" });
      state[k] = v;
      continue;
    }
    if (k === "depositVerifiedAt") {
      if (v) out.push({ at, by: asStr(set.depositVerifiedBy) || who, text: "Kế toán soát khoản cọc — đã nhận", tone: "audit", key: "deposit-verified" });
      state[k] = v;
      continue;
    }
    if (k === "commission" && v && typeof v === "object") {
      const cm = v as Doc;
      out.push({
        at,
        by: asStr(cm.byName) || who,
        text: `Chi chiết khấu đại lý ${fmtMoney(asNum(cm.amount))} ${METHOD[asStr(cm.method)] ?? ""}`.trim(),
        detail: [asStr(cm.agencyName), cm.transferCode ? `#${asStr(cm.transferCode)}` : ""].filter(Boolean).join(" · "),
        tone: "money",
        key: "commission",
      });
      state[k] = v;
      continue;
    }
    if (k === "collected" && Array.isArray(v)) {
      out.push({ at, by: who, text: `Sửa chia bill: còn ${v.length} khoản thu`, tone: "money" });
      state[k] = v;
      continue;
    }
    if (k.endsWith("At")) {
      state[k] = v;
      continue;
    }
    const label = FIELD_LABEL[k];
    if (!label) {
      state[k] = v;
      continue;
    }
    const had = Object.prototype.hasOwnProperty.call(state, k);
    const old = state[k];
    const same = had && JSON.stringify(old ?? null) === JSON.stringify(v ?? null);
    if (!same) {
      // Lần đầu thấy trường này: chỉ kể nếu nó có nghĩa (khác 0/rỗng), tránh
      // liệt kê cả biểu mẫu ở lần sửa đầu tiên
      const meaningful = v !== 0 && v !== "" && v != null && v !== false;
      if (had) changes.push(`${label}: ${fmtVal(k, old)} → ${fmtVal(k, v)}`);
      else if (meaningful) changes.push(`${label} = ${fmtVal(k, v)}`);
    }
    state[k] = v;
  }
  if (insuredCount != null) out.push({ at, by: who, text: `Cập nhật hồ sơ bảo hiểm: ${insuredCount} người`, tone: "audit" });
  if (changes.length) {
    const isStatus = changes.some((c) => c.startsWith("Trạng thái"));
    out.push({
      at,
      by: who,
      text: changes.length <= 2 ? changes.join(" · ") : `Sửa ${changes.length} mục`,
      detail: changes.length > 2 ? changes.join(" · ") : undefined,
      tone: isStatus ? "status" : "info",
    });
  }
  return out;
}

/* ================================================================== */
/* Ghép hai nguồn                                                       */
/* ================================================================== */

const NEAR_MS = 3 * 60 * 1000;

export function buildBookingHistory(booking: Doc, logs: RawLog[]): HistoryEvent[] {
  const fromDoc = eventsFromBooking(booking);

  // Nhật ký: duyệt theo thời gian, mượn tên người từ dòng api đứng trước (≤ 20s)
  const sorted = [...logs].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  const state: Doc = {};
  let actor = "";
  let actorAt = 0;
  const fromLog: HistoryEvent[] = [];
  for (const l of sorted) {
    const t = new Date(l.at).getTime();
    if (l.op === "api") {
      actor = l.byName ?? "";
      actorAt = t;
    } else if (t - actorAt > 20_000) {
      actor = "";
    }
    fromLog.push(...eventsFromLog(l, state, actor));
  }

  // Khử trùng: sự kiện nhật ký trùng khoá + gần giờ với sự kiện từ bản ghi thì bỏ,
  // nhưng nếu bản ghi thiếu tên người / thiếu giờ thì mượn của nhật ký.
  const merged: HistoryEvent[] = [...fromDoc];
  for (const e of fromLog) {
    if (e.key) {
      const twin = merged.find((m) => {
        if (m.key !== e.key) return false;
        if (!m.at || !e.at) return true;
        return Math.abs(new Date(m.at).getTime() - new Date(e.at).getTime()) < NEAR_MS;
      });
      if (twin) {
        if (!twin.by && e.by) twin.by = e.by;
        if (!twin.at && e.at) twin.at = e.at;
        if (!twin.detail && e.detail) twin.detail = e.detail;
        continue;
      }
    }
    merged.push(e);
  }

  // Cùng một cú bấm sinh ra dòng api "Sửa booking" + dòng máy "Flycam: 3 → 4":
  // gộp phần "đổi cái gì" vào dòng api cho khỏi hai dòng kể một việc.
  const out: HistoryEvent[] = [];
  merged.sort((a, b) => (a.at && b.at ? new Date(a.at).getTime() - new Date(b.at).getTime() : 0));
  for (let i = 0; i < merged.length; i++) {
    const e = merged[i];
    if (e.key === "collect-api") {
      const next = merged[i + 1];
      if (next && next.tone === "money" && next.at && e.at && new Date(next.at).getTime() - new Date(e.at).getTime() < 20_000) {
        if (!next.by) next.by = e.by;
        continue;
      }
    }
    const prev = out[out.length - 1];
    if (
      prev &&
      e.tone === "info" &&
      !e.key &&
      prev.text === API_TEXT.edit &&
      prev.at &&
      e.at &&
      Math.abs(new Date(e.at).getTime() - new Date(prev.at).getTime()) < 20_000
    ) {
      prev.detail = [prev.detail, e.detail ?? e.text].filter(Boolean).join(" · ");
      continue;
    }
    out.push(e);
  }

  return out.sort((a, b) => {
    if (!a.at && !b.at) return 0;
    if (!a.at) return 1;
    if (!b.at) return -1;
    return new Date(a.at).getTime() - new Date(b.at).getTime();
  });
}
