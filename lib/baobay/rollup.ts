// lib/baobay/rollup.ts
/**
 * BẢNG CỘNG ĐẦY ĐỦ THEO SỔ (chủ 07/10/2026) — một bộ chỉ tiêu duy nhất cho
 * "Tổng đã chốt", "CẢ KỲ", bảng theo ngày, báo cáo tháng và bảng theo người bán.
 *
 * Vì sao có file này: trước đây số khách / vé / huỷ / dời / dịch vụ của Bảng
 * tổng hợp chép từ ô KẾ TOÁN GÕ lúc chốt ngày. Ngày chưa chốt thì mọi ô bằng 0
 * (18/30 ngày của kỳ 08/09–07/10 Khau Phạ), nên khối "cả kỳ" thiếu gần hết.
 * Ở đây MỌI con số đếm thẳng từ sổ gốc — sổ booking, sổ thêm/bớt dịch vụ, lệnh
 * hoàn, lệnh huỷ dịch vụ của phi công — ngày chốt hay chưa cũng một cách đếm.
 * Số kế toán gõ được GIỮ LẠI bên cạnh để so (`chot`, `lech`), không bị thay.
 *
 * File THUẦN (không đụng cơ sở dữ liệu) để trang client import được kiểu, và
 * để script kiểm chứng gọi lại đúng phép cộng này. Phần nạp dữ liệu nằm ở
 * `getPeriodRollup` trong services/baobay.service.ts.
 *
 * QUY ƯỚC NGÀY: mọi thứ tính vào NGÀY BAY hiện tại của booking (`flightDate`);
 * khách dời đi thì ngày cũ chỉ còn dòng "dời đi". Lệnh hoàn / huỷ dịch vụ /
 * thêm-bớt dịch vụ tính vào `date` ghi trên chính lệnh (ngày bay lúc lập lệnh).
 */
import { toDateKeyVN } from "./date";
import {
  FLIGHT_KIND_SHORT,
  SERVICE_PRICE,
  SERVICE_PRICE_LABEL,
  flightKindsOf,
  longFlightCharged,
  longFlightFree,
  servicePriceOf,
  serviceSoldAt,
  type FlightKind,
  type ServiceKey,
} from "./flight-price";

export const SERVICE_KEYS = Object.keys(SERVICE_PRICE) as ServiceKey[];
export const FLIGHT_KINDS = Object.keys(FLIGHT_KIND_SHORT) as FlightKind[];

export type SvcCounts = Record<ServiceKey, number>;
export type KindCounts = Record<FlightKind, number>;

/** Nhãn NGẮN theo cách gọi của chủ — dùng cho ô số và cột bảng. */
export const SERVICE_SHORT: Record<ServiceKey, string> = {
  flycam: "Flycam",
  video360: "360",
  redFlag: "Cờ đỏ",
  flagFlight: "Kéo cờ",
  sunset: "Gói đặc biệt (H.hôn/S.mây/B.minh)",
  longFlight: "Bay lâu",
};

/** Dịch vụ điểm này bán — theo ĐÚNG bảng giá (thêm dịch vụ vào bảng giá là tự hiện). */
export function servicesAt(spot: string): Array<{ key: ServiceKey; label: string; short: string }> {
  return SERVICE_PRICE_LABEL.filter((s) => serviceSoldAt(spot, s.key) && !(spot === "sapa" && (s.key === "sunset" || s.key === "flagFlight"))).map(
    (s) => ({ key: s.key, label: s.label, short: SERVICE_SHORT[s.key] ?? s.label }),
  );
}

export function kindsAt(spot: string): Array<{ key: FlightKind; label: string }> {
  return flightKindsOf(spot).map((k) => ({ key: k, label: FLIGHT_KIND_SHORT[k] }));
}

/* ------------------------------------------------------------------ */
/* Kiểu                                                                 */
/* ------------------------------------------------------------------ */

/** Số ĐẾM TỪ SỔ của một ngày / một kỳ / một người bán — mọi ô đều cộng dồn được. */
export type LedgerRollup = {
  /* ---- Khách & chuyến bay (sổ booking) ---- */
  /** Booking đã tích "đã bay" và số khách của chúng. */
  bookingsFlown: number;
  guestsFlown: number;
  flownByKind: KindCounts;
  /** Trong số đã bay: khách của booking đánh dấu BAY KHÔNG VÉ. */
  noTicketGuests: number;
  /** Booking còn "chờ bay" (chưa tích bay, chưa huỷ). */
  bookingsOpen: number;
  guestsOpen: number;
  openByKind: KindCounts;

  /* ---- Vé (cờ 🎫 "đã xuất vé" trên booking, đếm theo đầu khách) ---- */
  /** Vé XUẤT tại ngày này: khách còn ở sổ ngày + vé của đoàn huỷ sau khi xuất + vé đoàn dời mang đi. */
  ticketsIssued: number;
  /** Vé của khách ĐÃ BAY. */
  ticketsFlown: number;
  /** Vé đang nằm ở booking còn chờ bay. */
  ticketsOpen: number;
  /** Vé THU HỒI: booking HUỶ sau khi đã xuất vé (max(số mã ghi lúc huỷ, số khách)). */
  ticketsRecalled: number;
  /** Vé khách DỜI mang sang ngày khác (không tính là thu hồi). */
  ticketsMovedOut: number;
  /** Vé từ ngày khác mang TỚI (khách dời tới đã cầm vé). */
  ticketsCarriedIn: number;
  /** Vé QR (máy in): đang hiệu lực / phi công đã quét bay xong / đã thu hồi. */
  qrIssued: number;
  qrFlown: number;
  qrRecalled: number;

  /* ---- Huỷ / dời (sổ booking) ---- */
  cancelledBookings: number;
  /** Khách của booking huỷ CẢ đoàn. */
  cancelledGuests: number;
  cancelledGuestsRefund: number;
  cancelledGuestsNoRefund: number;
  /** Khách huỷ MỘT PHẦN trên đoàn vẫn bay. */
  partialCancelledGuests: number;
  movedOutBookings: number;
  movedOutGuests: number;
  movedInBookings: number;
  movedInGuests: number;
  /** Booking bỏ khỏi sổ (nhập nhầm / trùng). */
  voidedBookings: number;

  /* ---- Dịch vụ (sổ booking, đã gồm mọi lệnh thêm/bớt) ---- */
  /** Dịch vụ của booking ĐÃ BAY. */
  svcFlown: SvcCounts;
  /** Dịch vụ của booking còn chờ bay. */
  svcOpen: SvcCounts;
  /** Bay lâu: suất miễn phí kèm gói đặc biệt / suất tính tiền (booking đã bay + chờ bay). */
  longFlightFree: number;
  longFlightCharged: number;
  /** Combo flycam + 360: số cặp = min(flycam, 360) từng booking; tiền giảm combo ghi trên sổ. */
  combos: number;
  comboDiscount: number;
  /** Xe lên núi (suất) và phí đưa đón thu của khách. */
  mountainCar: number;
  pickupFee: number;

  /* ---- Thêm / huỷ dịch vụ (sổ thêm-bớt dịch vụ, bỏ lệnh đã hoàn tác) ---- */
  svcAddOrders: number;
  svcAdded: SvcCounts;
  /** Tiền thu thêm, chia theo dịch vụ (lệnh gộp nhiều dịch vụ thì chia theo đơn giá). */
  svcAddedAmount: SvcCounts;
  svcAddedCharge: number;
  svcRemoveOrders: number;
  svcRemoved: SvcCounts;
  svcRemovedAmount: SvcCounts;
  /** Tổng tiền lùi lại cho khách = trừ vào còn thu + hoàn tiền thật. */
  svcRemovedBack: number;
  svcRemovedCredit: number;
  svcRemovedRefund: number;
  /** Huỷ dịch vụ do PHI CÔNG báo (máy hỏng, gió to…) — bảng huỷ flycam mở rộng. */
  opCancel: SvcCounts;
  opCancelCount: number;
  opCancelPaid: number;
  opCancelPending: number;
  opCancelPendingCount: number;

  /* ---- Hoàn tiền khách (sổ lệnh hoàn, bỏ lệnh vô hiệu) ---- */
  /** Lệnh ĐÃ CHI (tiền mặt trả xong hoặc kế toán đã chuyển). */
  refundCount: number;
  refundPaid: number;
  refundPendingCount: number;
  refundPending: number;
  refundCash: number;
  refundTransfer: number;
  /** Hoàn CK đi từ TK công ty (MB) / TK cá nhân (BIDV) / lệnh cũ chưa ghi tài khoản. */
  refundFromCompany: number;
  refundFromPersonal: number;
  refundFromUnknown: number;
  /** Huỷ bay cả đoàn / huỷ bớt khách / hoàn dịch vụ. */
  refundFullCount: number;
  refundFullAmount: number;
  refundPartialCount: number;
  refundPartialAmount: number;
  refundSvcCount: number;
  refundSvcAmount: number;

  /* ---- Tiền (sổ booking — cách tính giữ nguyên như trước) ---- */
  bookingValue: number;
  collected: number;
  remaining: number;
  cash: number;
  transfer: number;
  other: number;
  /** Trong phần chuyển khoản: về TK công ty (MB) / TK cá nhân (BIDV, gồm bản ghi cũ chưa ghi TK). */
  transferCompany: number;
  transferPersonal: number;
  /** Giảm trừ gõ tay trên booking (chiết khấu đại lý, khuyến mãi…). */
  discount: number;
  /** Đại lý / OTA thu hộ — tiền đang nằm ở đại lý. */
  agencyPaid: number;
  /** Chiết khấu (hoa hồng) trả đại lý: tiền mặt tại bãi / công ty chuyển khoản / đại lý tự giữ lại. */
  commissionCash: number;
  commissionTransfer: number;
  commissionAgency: number;
  /** Booking HUỶ: khách đã trả / đã hoàn / còn giữ lại (không nằm trong "đã thu"). */
  cancelledPaid: number;
  cancelledRefunded: number;
  cancelledKept: number;
};

/** Số NHÂN VIÊN TỰ KHAI của ngày / kỳ — đứng cạnh số sổ để so. */
export type StaffRollup = {
  pilotPg: number;
  pilotPpg: number;
  pilotCodes: number;
  /** flycam ← camera man; các dịch vụ khác ← phi công (nguồn chuẩn của bộ đối chiếu). */
  svc: SvcCounts;
  /** Vé quầy khai đã xuất: đếm MÃ KHÔNG TRÙNG trong các dải (hai người khai cùng dải không bị nhân đôi). */
  counterIssued: number;
  counterReturned: number;
  diplomaticGuests: number;
  diplomaticTickets: number;
  diplomaticAmount: number;
  expenseTotal: number;
  /** Lệnh thu lập trong ngày (theo NGÀY LẬP lệnh, không theo ngày bay). */
  collectCash: number;
  collectTransfer: number;
};

/** Số KẾ TOÁN GÕ lúc chốt ngày. */
export type CloseNumbers = {
  guestCount: number;
  noTicketGuests: number;
  ticketsIssued: number;
  ticketsReturned: number;
  cancelledCount: number;
  cancelledGuests: number;
  rescheduledCount: number;
  svc: SvcCounts;
};

export type RollupMismatch = { key: string; label: string; chot: number; so: number; days?: number };

export type RollupDay = {
  date: string;
  status: "none" | "draft" | "closed";
  so: LedgerRollup;
  bc: StaffRollup;
  /** Có bản chốt (đã chốt hoặc còn nháp) thì kèm số kế toán gõ. */
  chot?: CloseNumbers;
  /** Chỉ tính cho ngày ĐÃ CHỐT: ô nào kế toán gõ khác số sổ. */
  lech: RollupMismatch[];
};

export type SellerRollup = {
  /** Khoá gom: tên đăng nhập, "web", "ota:klook"… hoặc "" (không ghi người bán). */
  key: string;
  name: string;
  kind: "staff" | "web" | "ota" | "none";
  so: LedgerRollup;
};

export type PeriodRollupDTO = {
  spot: string;
  from: string;
  to: string;
  services: Array<{ key: ServiceKey; label: string; short: string }>;
  kinds: Array<{ key: FlightKind; label: string }>;
  dayCount: number;
  closedCount: number;
  /** Ngày có số liệu mà chưa chốt. */
  openDates: string[];
  /** Mới → cũ, cùng thứ tự với `days` của bảng tổng hợp. */
  days: RollupDay[];
  closed: { so: LedgerRollup; bc: StaffRollup; chot: CloseNumbers; lech: RollupMismatch[] };
  all: { so: LedgerRollup; bc: StaffRollup };
  /** Cả kỳ (mọi ngày, kể cả chưa chốt), tách theo NGƯỜI BÁN. Cộng lại đúng bằng `all.so`. */
  bySeller: SellerRollup[];
};

/* ------------------------------------------------------------------ */
/* Dựng / cộng                                                          */
/* ------------------------------------------------------------------ */

const zeroSvc = (): SvcCounts => Object.fromEntries(SERVICE_KEYS.map((k) => [k, 0])) as SvcCounts;
const zeroKind = (): KindCounts => Object.fromEntries(FLIGHT_KINDS.map((k) => [k, 0])) as KindCounts;

export function emptyLedger(): LedgerRollup {
  return {
    bookingsFlown: 0, guestsFlown: 0, flownByKind: zeroKind(), noTicketGuests: 0,
    bookingsOpen: 0, guestsOpen: 0, openByKind: zeroKind(),
    ticketsIssued: 0, ticketsFlown: 0, ticketsOpen: 0, ticketsRecalled: 0, ticketsMovedOut: 0, ticketsCarriedIn: 0,
    qrIssued: 0, qrFlown: 0, qrRecalled: 0,
    cancelledBookings: 0, cancelledGuests: 0, cancelledGuestsRefund: 0, cancelledGuestsNoRefund: 0, partialCancelledGuests: 0,
    movedOutBookings: 0, movedOutGuests: 0, movedInBookings: 0, movedInGuests: 0, voidedBookings: 0,
    svcFlown: zeroSvc(), svcOpen: zeroSvc(), longFlightFree: 0, longFlightCharged: 0, combos: 0, comboDiscount: 0, mountainCar: 0, pickupFee: 0,
    svcAddOrders: 0, svcAdded: zeroSvc(), svcAddedAmount: zeroSvc(), svcAddedCharge: 0,
    svcRemoveOrders: 0, svcRemoved: zeroSvc(), svcRemovedAmount: zeroSvc(), svcRemovedBack: 0, svcRemovedCredit: 0, svcRemovedRefund: 0,
    opCancel: zeroSvc(), opCancelCount: 0, opCancelPaid: 0, opCancelPending: 0, opCancelPendingCount: 0,
    refundCount: 0, refundPaid: 0, refundPendingCount: 0, refundPending: 0, refundCash: 0, refundTransfer: 0,
    refundFromCompany: 0, refundFromPersonal: 0, refundFromUnknown: 0,
    refundFullCount: 0, refundFullAmount: 0, refundPartialCount: 0, refundPartialAmount: 0, refundSvcCount: 0, refundSvcAmount: 0,
    bookingValue: 0, collected: 0, remaining: 0, cash: 0, transfer: 0, other: 0, transferCompany: 0, transferPersonal: 0,
    discount: 0, agencyPaid: 0, commissionCash: 0, commissionTransfer: 0, commissionAgency: 0,
    cancelledPaid: 0, cancelledRefunded: 0, cancelledKept: 0,
  };
}

export function emptyStaff(): StaffRollup {
  return {
    pilotPg: 0, pilotPpg: 0, pilotCodes: 0, svc: zeroSvc(), counterIssued: 0, counterReturned: 0,
    diplomaticGuests: 0, diplomaticTickets: 0, diplomaticAmount: 0, expenseTotal: 0, collectCash: 0, collectTransfer: 0,
  };
}

export function emptyClose(): CloseNumbers {
  return { guestCount: 0, noTicketGuests: 0, ticketsIssued: 0, ticketsReturned: 0, cancelledCount: 0, cancelledGuests: 0, rescheduledCount: 0, svc: zeroSvc() };
}

/** Cộng `b` vào `a` (mọi ô số, kể cả ô lồng một tầng). Trả lại `a`. */
export function addInto<T extends object>(a: T, b: T): T {
  const x = a as Record<string, unknown>;
  const y = b as Record<string, unknown>;
  for (const k of Object.keys(y)) {
    const v = y[k];
    if (typeof v === "number") x[k] = ((x[k] as number) || 0) + v;
    else if (v && typeof v === "object") x[k] = addInto((x[k] as object) ?? {}, v as object);
  }
  return a;
}

/** Trải một bảng cộng thành các cặp [đường dẫn, số] — script kiểm chứng và phép so "tổng người bán = tổng kỳ" dùng. */
export function flatNumbers(o: object, prefix = ""): Array<[string, number]> {
  const out: Array<[string, number]> = [];
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === "number") out.push([prefix + k, v]);
    else if (v && typeof v === "object") out.push(...flatNumbers(v as object, `${prefix}${k}.`));
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Luật đếm dùng chung với màn hình ngày                                */
/* ------------------------------------------------------------------ */

const num = (v: unknown) => Number(v) || 0;

/** Khách PG / PPG / 650m / 850m của một booking — đoàn gộp PG+PPG tách theo `ppgGuests` (cùng luật với Chốt ngày). */
export function kindGuestsOf(b: { flightKind?: string; guestCount?: number; ppgGuests?: number }): KindCounts {
  const out = zeroKind();
  const g = num(b.guestCount);
  const kind = (FLIGHT_KINDS as string[]).includes(String(b.flightKind)) ? (b.flightKind as FlightKind) : "pg";
  const ppg = kind === "ppg" ? g : Math.min(g, num(b.ppgGuests));
  out.ppg += ppg;
  if (kind !== "ppg") out[kind] += g - ppg;
  return out;
}

/** Đếm vé QR của một booking: hiệu lực / đã bay / thu hồi / thu hồi sau khi phi công báo bay xong (cùng luật với Chốt ngày). */
export function veQrTallyOf(khach: unknown): { veQrXuat: number; veQrBay: number; veQrThuHoi: number; veQrXungDot: number } {
  const t = { veQrXuat: 0, veQrBay: 0, veQrThuHoi: 0, veQrXungDot: 0 };
  for (const k of (Array.isArray(khach) ? khach : []) as any[]) {
    if (k?.veGiay) continue;
    if (k?.huy?.luc) {
      t.veQrThuHoi++;
      if (k.huy.daBayXong && !k.huy.xacMinh?.luc) t.veQrXungDot++;
      continue;
    }
    t.veQrXuat++;
    if (k?.bayXong?.luc) t.veQrBay++;
  }
  return t;
}

/**
 * Đoàn dời khỏi ngày `fromDate` LÚC ĐÓ đã cầm vé chưa.
 *
 * Cờ 🎫 trên booking chỉ có MỘT mốc giờ, mà phần lớn đoàn dời được xuất vé ở
 * NGÀY MỚI (40/45 đoàn dời có vé của kỳ 08/09–07/10) — coi "có cờ vé" là "dời
 * mang vé đi" thì ngày cũ bị đòi thu hồi những tờ vé chưa từng tồn tại.
 *  - Có mã vé mang theo ghi lúc dời → chắc chắn đã cầm vé.
 *  - Chặng dời CUỐI: so giờ xuất vé với giờ bấm dời (`movedAt`).
 *  - Chặng trước đó (không còn mốc giờ): vé xuất từ ngày ấy trở về trước.
 */
export function ticketHeldWhenMoved(
  b: { ticketIssuedAt?: Date | string | null; movedAt?: Date | string | null; rescheduledFrom?: string[]; movedTicketCodes?: string[] },
  fromDate: string,
): boolean {
  if (!b.ticketIssuedAt) return false;
  const trail = b.rescheduledFrom ?? [];
  const isLast = trail.length > 0 && trail[trail.length - 1] === fromDate;
  if (isLast && (b.movedTicketCodes ?? []).length > 0) return true;
  const at = new Date(b.ticketIssuedAt);
  if (isLast && b.movedAt) return at.getTime() < new Date(b.movedAt).getTime();
  return toDateKeyVN(at) <= fromDate;
}

/**
 * NGƯỜI BÁN của một booking = người LẬP booking (`createdByUsername`) — đúng
 * cách thẻ "ai đóng góp bao nhiêu dịch vụ" của trang điều phối đang chia.
 * Booking khách tự đặt trên web và booking từ thư OTA mang tên máy ("web",
 * "ota:klook"…) nên rơi vào rổ riêng, không tính cho nhân viên nào.
 */
export function sellerOf(b: { createdByUsername?: string; createdByName?: string; webBookingId?: string; otaRef?: string; otaName?: string } | null | undefined): {
  key: string;
  kind: SellerRollup["kind"];
  name: string;
} {
  const u = String(b?.createdByUsername ?? "").trim().toLowerCase();
  if (u.startsWith("ota:") || (!u && (b?.otaRef || b?.otaName))) {
    const ch = (u.startsWith("ota:") ? u.slice(4) : String(b?.otaName || "")).trim().toLowerCase() || "khác";
    return { key: `ota:${ch}`, kind: "ota", name: `OTA ${ch.charAt(0).toUpperCase()}${ch.slice(1)}` };
  }
  if (u === "web" || (!u && b?.webBookingId)) return { key: "web", kind: "web", name: "Web (khách tự đặt)" };
  if (!u) return { key: "", kind: "none", name: "Không ghi người bán" };
  return { key: u, kind: "staff", name: String(b?.createdByName || u) };
}

/** Chia một số tiền cho các dịch vụ của lệnh theo (số lượng × đơn giá); phần lẻ dồn vào dịch vụ lớn nhất. */
function splitByService(amount: number, items: Partial<SvcCounts>, price: Record<ServiceKey, number>): SvcCounts {
  const out = zeroSvc();
  const w = SERVICE_KEYS.map((k) => ({ k, w: num(items[k]) * (price[k] || 1) })).filter((x) => x.w > 0);
  const total = w.reduce((t, x) => t + x.w, 0);
  if (!amount || !total) return out;
  let left = amount;
  for (const x of w) {
    const part = Math.round((amount * x.w) / total);
    out[x.k] = part;
    left -= part;
  }
  const top = [...w].sort((a, b) => b.w - a.w)[0];
  out[top.k] += left;
  return out;
}

/* ------------------------------------------------------------------ */
/* Phép cộng chính                                                      */
/* ------------------------------------------------------------------ */

export type RollupInput = {
  spot: string;
  from: string;
  to: string;
  /** Mọi booking có NGÀY BAY trong kỳ hoặc từng DỜI KHỎI một ngày trong kỳ (mọi trạng thái). */
  bookings: any[];
  /** Sổ thêm/bớt dịch vụ: lệnh có `date` trong kỳ + lệnh của các booking đang bay trong kỳ. */
  serviceChanges: any[];
  refunds: any[];
  flycamCancels: any[];
  /** Booking nằm NGOÀI `bookings` mà lệnh hoàn / huỷ dịch vụ trỏ tới — chỉ cần người lập và trạng thái. */
  extraBookings?: any[];
  /** Tên hiển thị hiện tại của tài khoản: username → tên. */
  names?: Map<string, string>;
};

export function tallyLedger(input: RollupInput): { byDate: Map<string, LedgerRollup>; bySeller: SellerRollup[]; all: LedgerRollup } {
  const { spot, from, to } = input;
  const inRange = (d: unknown): d is string => typeof d === "string" && d >= from && d <= to;
  const byDate = new Map<string, LedgerRollup>();
  const sellers = new Map<string, SellerRollup>();
  const day = (d: string) => byDate.get(d) ?? byDate.set(d, emptyLedger()).get(d)!;
  const sel = (s: ReturnType<typeof sellerOf>) => {
    const found = sellers.get(s.key);
    if (found) return found.so;
    const name = s.kind === "staff" ? input.names?.get(s.key) || s.name : s.name;
    const fresh: SellerRollup = { key: s.key, kind: s.kind, name, so: emptyLedger() };
    sellers.set(s.key, fresh);
    return fresh.so;
  };
  /** Ghi MỘT việc vào đúng ngày và đúng người bán — hai bảng luôn cộng ra cùng một tổng. */
  const put = (date: string, seller: ReturnType<typeof sellerOf>, f: (r: LedgerRollup) => void) => {
    if (!inRange(date)) return;
    f(day(date));
    f(sel(seller));
  };

  const bookingById = new Map<string, any>();
  for (const b of input.extraBookings ?? []) bookingById.set(String(b._id), b);
  for (const b of input.bookings) bookingById.set(String(b._id), b);

  /** Lệnh thêm/bớt còn hiệu lực, gom theo booking — để bóc "ai bán phần nào". */
  const liveChanges = input.serviceChanges.filter((c) => !c.undoneAt);
  const changesByBooking = new Map<string, any[]>();
  for (const c of liveChanges) {
    const k = String(c.bookingId);
    (changesByBooking.get(k) ?? changesByBooking.set(k, []).get(k)!).push(c);
  }
  const changeSeller = (c: any) => sellerOf({ createdByUsername: c.createdByUsername, createdByName: c.createdByName });

  for (const b of input.bookings) {
    const D = String(b.flightDate || "");
    const who = sellerOf(b);
    const g = num(b.guestCount);
    const trail: string[] = [...new Set(((b.rescheduledFrom ?? []) as string[]).filter(Boolean))];

    /* --- Dời đi: mỗi ngày cũ trong vết dời ghi một dòng --- */
    if (b.status !== "voided") {
      for (const d of trail) {
        if (d === D) continue;
        put(d, who, (r) => {
          r.movedOutBookings += 1;
          r.movedOutGuests += g;
          if (ticketHeldWhenMoved(b, d)) {
            r.ticketsMovedOut += g;
            // Vé xuất đúng hôm ấy rồi mới dời thì tính là vé xuất của hôm ấy; còn lại là vé đi ngang qua
            if (toDateKeyVN(new Date(b.ticketIssuedAt)) === d) r.ticketsIssued += g;
            else r.ticketsCarriedIn += g;
          }
        });
      }
    }

    if (!inRange(D)) continue;

    if (b.status === "voided") {
      put(D, who, (r) => void (r.voidedBookings += 1));
      continue;
    }

    const live = b.status === "open" || b.status === "done";
    const movedIn = trail.some((d) => d !== D);

    /* --- Vé --- */
    if (b.ticketIssuedAt) {
      const n = b.status === "cancelled" ? Math.max(((b.cancelTicketCodes ?? []) as string[]).length, g) : g;
      const carried = movedIn && ticketHeldWhenMoved(b, (b.rescheduledFrom as string[])[(b.rescheduledFrom as string[]).length - 1]);
      put(D, who, (r) => {
        if (carried) r.ticketsCarriedIn += n;
        else r.ticketsIssued += n;
        if (b.status === "done") r.ticketsFlown += n;
        else if (b.status === "open") r.ticketsOpen += n;
        else r.ticketsRecalled += n;
      });
    }
    if (movedIn) {
      put(D, who, (r) => {
        r.movedInBookings += 1;
        r.movedInGuests += g;
      });
    }

    /* --- Tiền hoa hồng: tiền đã ra khỏi túi dù booking sau đó huỷ --- */
    const com = b.commission;
    if (com && num(com.amount) > 0) {
      put(D, who, (r) => {
        if (com.method === "transfer") r.commissionTransfer += num(com.amount);
        else if (com.method === "agency") r.commissionAgency += num(com.amount);
        else r.commissionCash += num(com.amount);
      });
    }

    if (b.status === "cancelled") {
      const refunded = num(b.refundedTotal);
      const kept = num(b.deposit);
      put(D, who, (r) => {
        r.cancelledBookings += 1;
        r.cancelledGuests += g;
        if (refunded > 0 || num(b.refundAmount) > 0) r.cancelledGuestsRefund += g;
        else r.cancelledGuestsNoRefund += g;
        r.cancelledPaid += kept + refunded;
        r.cancelledRefunded += refunded;
        r.cancelledKept += kept;
      });
      continue;
    }
    if (!live) continue;

    const done = b.status === "done";
    const kinds = kindGuestsOf(b);
    const qr = veQrTallyOf(b.veQr?.khach);

    /* --- Tiền theo sổ booking: GIỮ NGUYÊN công thức của bảng tổng hợp (chủ 21/09) --- */
    const value = num(b.totalAmount);
    const con = Math.max(0, num(b.remaining));
    const daThu = Math.max(0, value - con);
    const log = (b.collectedLog ?? []) as Array<{ amount?: number; method?: string; toAccount?: string }>;
    const tm = log.filter((x) => x.method !== "transfer").reduce((t, x) => t + num(x.amount), 0);
    const ck = log.filter((x) => x.method === "transfer").reduce((t, x) => t + num(x.amount), 0);
    const ckCty = log.filter((x) => x.method === "transfer" && x.toAccount === "company").reduce((t, x) => t + num(x.amount), 0);
    const ghi = tm + ck;
    const heSo = ghi > daThu && ghi > 0 ? daThu / ghi : 1;
    const tmThuc = Math.round(tm * heSo);
    const ckThuc = Math.round(ck * heSo);
    const ckCtyThuc = Math.min(ckThuc, Math.round(ckCty * heSo));

    put(D, who, (r) => {
      if (done) {
        r.bookingsFlown += 1;
        r.guestsFlown += g;
        addInto(r.flownByKind, kinds);
        if (b.noTicketFlight) r.noTicketGuests += g;
      } else {
        r.bookingsOpen += 1;
        r.guestsOpen += g;
        addInto(r.openByKind, kinds);
      }
      r.partialCancelledGuests += num(b.cancelledGuests);
      r.qrIssued += qr.veQrXuat;
      r.qrFlown += qr.veQrBay;
      r.qrRecalled += qr.veQrThuHoi;

      r.longFlightFree += serviceSoldAt(spot, "longFlight") ? longFlightFree(b.longFlight, b.sunset) : 0;
      r.longFlightCharged += serviceSoldAt(spot, "longFlight") ? longFlightCharged(b.longFlight, b.sunset) : 0;
      r.combos += Math.min(num(b.flycam), num(b.video360));
      r.comboDiscount += num(b.comboDiscount);
      r.mountainCar += num(b.mountainCar);
      r.pickupFee += num(b.pickupFee);

      r.bookingValue += value;
      r.remaining += con;
      r.collected += daThu;
      r.cash += tmThuc;
      r.transfer += ckThuc;
      r.other += Math.max(0, daThu - tmThuc - ckThuc);
      r.transferCompany += ckCtyThuc;
      r.transferPersonal += ckThuc - ckCtyThuc;
      r.discount += num(b.discount);
      r.agencyPaid += num(b.agencyPaidAmount);
    });

    /**
     * DỊCH VỤ — số trên booking đã gồm mọi lệnh thêm/bớt. Theo NGÀY thì cộng
     * thẳng; theo NGƯỜI BÁN thì bóc ngược như thẻ "ai đóng góp" của trang điều
     * phối: người LẬP booking nhận phần lúc lập (= số hiện tại − đã thêm + đã
     * bớt), người lập lệnh THÊM nhận đúng phần mình thêm.
     *
     * Khác thẻ ấy ở lệnh BỚT: thẻ ngày trừ thẳng vào người bấm huỷ, nên một
     * phi công báo huỷ flycam thành "người bán −1 flycam". Bảng người bán của
     * cả kỳ trừ vào NGƯỜI ĐÃ BÁN suất ấy: trước hết phần chính người huỷ đã
     * thêm (sửa lại việc của mình), rồi phần của người lập booking, cuối cùng
     * phần người khác thêm. Tổng các người bán vẫn đúng bằng số trên sổ.
     */
    const mine = changesByBooking.get(String(b._id)) ?? [];
    const bucket = done ? "svcFlown" : "svcOpen";
    for (const key of SERVICE_KEYS) {
      const cur = num(b[key]);
      if (cur) day(D)[bucket][key] += cur;
      if (!cur && !mine.length) continue;
      const added = new Map<string, { who: ReturnType<typeof sellerOf>; qty: number }>();
      let addTotal = 0;
      let removeTotal = 0;
      for (const c of mine) {
        const q = num(c.items?.[key]);
        if (!q) continue;
        if (c.kind === "add") {
          const w = changeSeller(c);
          const e = added.get(w.key) ?? { who: w, qty: 0 };
          e.qty += q;
          added.set(w.key, e);
          addTotal += q;
        } else removeTotal += q;
      }
      const atCreation = cur - addTotal + removeTotal;
      let creatorPool = Math.max(0, atCreation);
      let leftover = 0;
      for (const c of mine) {
        let q = c.kind === "remove" ? num(c.items?.[key]) : 0;
        if (!q) continue;
        const take = (pool: number) => {
          const t = Math.min(pool, q);
          q -= t;
          return pool - t;
        };
        const own = added.get(changeSeller(c).key);
        if (own) own.qty = take(own.qty);
        creatorPool = take(creatorPool);
        for (const e of [...added.values()].sort((x, y) => y.qty - x.qty)) e.qty = take(e.qty);
        leftover += q;
      }
      const creatorNet = (atCreation < 0 ? atCreation : creatorPool) - leftover;
      if (creatorNet) sel(who)[bucket][key] += creatorNet;
      for (const e of added.values()) if (e.qty) sel(e.who)[bucket][key] += e.qty;
    }
  }

  /* --- Sổ thêm / bớt dịch vụ: tính vào ngày ghi trên lệnh, cho NGƯỜI LẬP LỆNH --- */
  const serviceRefundIds = new Set<string>();
  for (const c of input.serviceChanges) if (c.refundId) serviceRefundIds.add(String(c.refundId));
  for (const c of liveChanges) {
    const price = servicePriceOf(spot, c.createdAt ?? null);
    put(String(c.date || ""), changeSeller(c), (r) => {
      if (c.kind === "add") {
        r.svcAddOrders += 1;
        r.svcAddedCharge += num(c.charge);
        for (const k of SERVICE_KEYS) r.svcAdded[k] += num(c.items?.[k]);
        addInto(r.svcAddedAmount, splitByService(num(c.charge), c.items ?? {}, price));
      } else {
        r.svcRemoveOrders += 1;
        r.svcRemovedBack += num(c.back);
        r.svcRemovedRefund += num(c.refunded);
        r.svcRemovedCredit += Math.max(0, num(c.back) - num(c.refunded));
        for (const k of SERVICE_KEYS) r.svcRemoved[k] += num(c.items?.[k]);
        addInto(r.svcRemovedAmount, splitByService(num(c.back), c.items ?? {}, price));
      }
    });
  }

  /* --- Lệnh hoàn tiền: tính vào ngày ghi trên lệnh, cho NGƯỜI BÁN của booking được hoàn --- */
  for (const x of input.refunds) {
    if (x.status === "voided") continue;
    const b = x.bookingId ? bookingById.get(String(x.bookingId)) : null;
    const amount = num(x.amount);
    const isSvc = serviceRefundIds.has(String(x._id)) || /^huỷ dịch vụ/i.test(String(x.reason || ""));
    const isPartial = !isSvc && (/^huỷ \d+\s*\/\s*\d+ khách/i.test(String(x.reason || "")) || (b && b.status !== "cancelled"));
    put(String(x.date || ""), sellerOf(b), (r) => {
      if (x.status === "pending") {
        r.refundPendingCount += 1;
        r.refundPending += amount;
        return;
      }
      r.refundCount += 1;
      r.refundPaid += amount;
      if (x.method === "cash") r.refundCash += amount;
      else {
        r.refundTransfer += amount;
        if (x.fromAccount === "company") r.refundFromCompany += amount;
        else if (x.fromAccount === "personal") r.refundFromPersonal += amount;
        else r.refundFromUnknown += amount;
      }
      if (isSvc) {
        r.refundSvcCount += 1;
        r.refundSvcAmount += amount;
      } else if (isPartial) {
        r.refundPartialCount += 1;
        r.refundPartialAmount += amount;
      } else {
        r.refundFullCount += 1;
        r.refundFullAmount += amount;
      }
    });
  }

  /* --- Huỷ dịch vụ do phi công báo --- */
  for (const x of input.flycamCancels) {
    const b = x.bookingId ? bookingById.get(String(x.bookingId)) : null;
    const key = (SERVICE_KEYS as string[]).includes(String(x.service)) ? (x.service as ServiceKey) : "flycam";
    put(String(x.date || ""), sellerOf(b), (r) => {
      r.opCancel[key] += 1;
      r.opCancelCount += 1;
      if (x.status === "pending") {
        r.opCancelPending += num(x.amount);
        r.opCancelPendingCount += 1;
      } else r.opCancelPaid += num(x.amount);
    });
  }

  const all = emptyLedger();
  for (const r of byDate.values()) addInto(all, r);
  const bySeller = [...sellers.values()].sort((a, b) => b.so.bookingValue - a.so.bookingValue || b.so.guestsFlown - a.so.guestsFlown);
  return { byDate, bySeller, all };
}

/* ------------------------------------------------------------------ */
/* So số kế toán gõ với số sổ                                           */
/* ------------------------------------------------------------------ */

export function closeNumbersOf(c: any): CloseNumbers {
  const svc = zeroSvc();
  for (const k of SERVICE_KEYS) svc[k] = num(c?.[k]);
  return {
    guestCount: num(c?.guestCount),
    noTicketGuests: num(c?.noTicketGuests),
    ticketsIssued: num(c?.ticketsIssued),
    ticketsReturned: num(c?.ticketsReturned),
    cancelledCount: num(c?.cancelledCount),
    cancelledGuests: num(c?.cancelledRefundCount) + num(c?.cancelledNoRefundCount),
    rescheduledCount: num(c?.rescheduledCount),
    svc,
  };
}

/**
 * Các cặp (kế toán gõ · số sổ) đem ra so. Không so "bay không vé": cờ không vé trên
 * booking ít được tích (PPG bay không vé vẫn mang cờ 🎫), số kế toán tin hơn.
 */
export function compareRows(spot: string, chot: CloseNumbers, so: LedgerRollup): RollupMismatch[] {
  return [
    { key: "guests", label: "Khách bay", chot: chot.guestCount, so: so.guestsFlown },
    { key: "ticketsIssued", label: "Vé đã xuất", chot: chot.ticketsIssued, so: so.ticketsIssued },
    { key: "ticketsReturned", label: "Vé thu hồi", chot: chot.ticketsReturned, so: so.ticketsRecalled },
    { key: "cancelledGuests", label: "Khách huỷ", chot: chot.cancelledGuests, so: so.cancelledGuests + so.partialCancelledGuests },
    ...servicesAt(spot).map((s) => ({ key: `svc.${s.key}`, label: s.short, chot: chot.svc[s.key], so: so.svcFlown[s.key] })),
  ];
}

/** Tiện cho giao diện: tổng dịch vụ đã bay + chờ bay. */
export function svcSold(so: LedgerRollup, key: ServiceKey): number {
  return so.svcFlown[key] + so.svcOpen[key];
}
