// lib/baobay/reconcile.ts
/**
 * Đối chiếu số liệu một ngày bay: kế toán ↔ điều phối ↔ phi công ↔ camera man.
 *
 * Đây là hàm THUẦN (không đọc cơ sở dữ liệu, không gọi mạng) để chạy được cả ở
 * máy chủ lẫn trình duyệt: trang kế toán và trang phi công đều cần thấy cùng
 * một kết luận, và số liệu đưa vào giống nhau thì kết luận phải giống nhau.
 *
 * Quy tắc nghiệp vụ (do chủ điểm bay đặt):
 *
 *  1. Số kế toán khai là số ĐỘC LẬP, không phải số app cộng ra. Lệch với tổng
 *     của nhân viên là dấu hiệu có người khai sai — chính vì thế mới đối chiếu.
 *  2. Mã vé phải khớp tới từng mã, không chỉ khớp số lượng: 10 vé = 5 + 3 + 2
 *     mà vẫn có thể sai nếu hai phi công cùng khai một mã.
 *  3. Vé không bay chỉ có hai đường: HUỶ trả vé, hoặc DỜI LỊCH (ghi rõ dời sang
 *     ngày nào). Vé dời coi như huỷ ở ngày cũ; ngày mới xuất vé khác.
 *  4. Lệch DỊCH VỤ GIA TĂNG (flycam giữa camera man và điều phối, Camera360
 *     giữa phi công và điều phối) KHÔNG chặn cứng: khách hay phát sinh dịch vụ
 *     ngay tại bãi cất cánh, quầy chưa kịp ghi. Lệch thì kế toán bấm "duyệt
 *     lệch" — duyệt rồi mới chốt được.
 *  5. Còn lỗi ĐỎ thì ngày đó chưa chốt được, và chưa chốt thì không tính vào
 *     tổng của kế toán.
 */

import { formatDateKeyVN } from "@/lib/baobay/date";
import {
  TICKET_CODE_HINT,
  TICKET_CODE_PATTERN,
  expandTicketRanges,
  type TicketRangeInput,
} from "@/lib/baobay/ticket-code";

/** Mã lỗi — dùng để trang khác tô màu, đếm, hoặc lọc theo người. */
export type IssueCode =
  | "MA_SAI_DANG"
  | "MA_TRUNG"
  | "MA_LA"
  | "MA_KHONG_BAY"
  | "MA_THIEU"
  | "PHI_CONG_LECH_SO"
  | "PHI_CONG_CHUA_CHOT"
  | "CAMERA_CHUA_CHOT"
  | "LECH_TONG_CHUYEN"
  | "LECH_VE_XUAT"
  | "LECH_VE_THU_HOI"
  | "LECH_KHACH"
  | "LECH_TIEN"
  | "LECH_FLYCAM"
  | "LECH_360"
  | "LECH_CO_DO"
  | "LECH_KEO_CO"
  | "THIEU_SO_KE_TOAN"
  | "CHUA_DUYET_CHI"
  | "DAI_MA_SAI"
  | "DOI_LICH_SAI_NGAY";

export type Issue = {
  code: IssueCode;
  /** "red" = chặn chốt ngày. "warn" = nên xem lại nhưng vẫn chốt được. */
  severity: "red" | "warn";
  message: string;
  /** Tài khoản liên quan — để trang của từng người chỉ hiện lỗi của mình. */
  who: string[];
  /** Mã vé liên quan, đã cắt bớt nếu quá dài. */
  codes?: string[];
};

export type ReconcilePilot = {
  username: string;
  pilotName: string;
  flightCount: number;
  ticketCodes: string[];
  /** Dịch vụ gia tăng phi công khai — mã vé tuỳ chọn, chỉ dùng khi số lệch. */
  flycam: number;
  flycamCodes: string[];
  video360: number;
  video360Codes: string[];
  redFlag: number;
  redFlagCodes: string[];
  flagFlight: number;
  flagFlightCodes: string[];
  diplomaticGuests: number;
  /**
   * Mã vé chuyến PPG (dù có động cơ). Vé PPG lấy từ CÙNG cuốn MBL với vé PG,
   * nên phải tính là VÉ ĐÃ BAY — nếu không, bay PPG có vé là ngày treo oan:
   * "mã đã xuất mà không ai bay" + "vé xuất khác tổng bay + thu hồi".
   */
  ppgCodes: string[];
  /** Số chuyến PPG — cộng vào "khách phi công đã bay" khi so số khách với quầy. */
  ppgFlights?: number;
  expenseTotal: number;
  submitted: boolean;
};

export type ReconcileDispatcher = {
  username: string;
  staffName: string;
  guestCount: number;
  ticketsIssued: number;
  ticketsReturned: number;
  issuedRanges: TicketRangeInput[];
  cancelledCodes: string[];
  rescheduled: Array<{ code: string; toDate: string }>;
  flycam: number;
  flycamCodes: string[];
  video360: number;
  video360ServiceCodes: string[];
  redFlag: number;
  redFlagCodes: string[];
  flagFlight: number;
  flagFlightCodes: string[];
  diplomaticGuests: number;
  cashReceived: number;
  transferReceived: number;
  expenseTotal: number;
};

export type ReconcileCameraman = {
  username: string;
  cameramanName: string;
  flycamFlights: number;
  flycamCodes: string[];
  expenseTotal: number;
  submitted: boolean;
};

export type ReconcileClose = {
  guestCount: number;
  ticketsIssued: number;
  ticketsReturned: number;
  cancelledCount: number;
  rescheduledCount: number;
  issuedRanges: TicketRangeInput[];
  cancelledCodes: string[];
  rescheduled: Array<{ code: string; toDate: string }>;
  cashTotal: number;
  transferTotal: number;
  flycam: number;
  video360: number;
  redFlag: number;
  flagFlight: number;
  expensesApproved: boolean;
  varianceApproved: boolean;
};

export type ReconcileInput = {
  date: string;
  /** Điểm bay — Hà Nội không xuất vé nên vài phép soát theo mã được tắt. */
  spot?: string;
  /**
   * Có bắt phi công khai MÃ VÉ từng chuyến không. Khau Phạ: có — đối chiếu tới
   * từng mã. Điểm khác: không — chỉ soát SỐ LƯỢNG; mã nào đã khai thì vẫn kiểm
   * (trùng/lạ vẫn là lỗi thật), nhưng không đòi đủ và không truy "mã thiếu".
   * Bỏ trống = true để không đổi hành vi các nơi gọi cũ.
   */
  requireCodes?: boolean;
  /** null khi kế toán chưa nhập số chốt cho ngày đó. */
  close: ReconcileClose | null;
  dispatchers: ReconcileDispatcher[];
  pilots: ReconcilePilot[];
  cameramen: ReconcileCameraman[];
};

export type ReconcileTotals = {
  /** Số mã vé bung ra từ các dải kế toán khai (hoặc điều phối, nếu kế toán chưa khai). */
  issuedCodes: number;
  dispatcherIssued: number;
  dispatcherReturned: number;
  dispatcherGuests: number;
  dispatcherFlycam: number;
  dispatcher360: number;
  dispatcherRedFlag: number;
  dispatcherFlagFlight: number;
  dispatcherCash: number;
  dispatcherTransfer: number;
  dispatcherDiplomatic: number;
  pilotFlights: number;
  /** Tổng chuyến PPG phi công báo — khách PPG cũng là khách bay trong ngày. */
  pilotPpg: number;
  pilotCodes: number;
  pilotFlycam: number;
  pilot360: number;
  pilotRedFlag: number;
  pilotFlagFlight: number;
  pilotDiplomatic: number;
  cameramanFlycam: number;
  cancelled: number;
  rescheduled: number;
  expenseTotal: number;
};

export type ReconcileResult = {
  date: string;
  /** Không còn lỗi đỏ — điều kiện để kế toán chốt ngày. */
  canClose: boolean;
  issues: Issue[];
  /** Lỗi theo từng tài khoản, khoá theo username. */
  byUser: Record<string, Issue[]>;
  totals: ReconcileTotals;
  /** Mã kế toán xuất mà không ai khai đã bay, cũng không huỷ/dời. */
  missingCodes: string[];
  /** Mã có từ hai phi công cùng khai. */
  duplicateCodes: Array<{ code: string; pilots: string[] }>;
};

/** Cắt danh sách mã khi đưa vào câu thông báo — 200 mã không ai đọc nổi. */
const MAX_CODES_IN_MESSAGE = 12;

function short(codes: string[]): string {
  if (codes.length <= MAX_CODES_IN_MESSAGE) return codes.join(", ");
  return `${codes.slice(0, MAX_CODES_IN_MESSAGE).join(", ")}… (+${codes.length - MAX_CODES_IN_MESSAGE} mã nữa)`;
}

function vnd(n: number): string {
  return `${n.toLocaleString("vi-VN")}đ`;
}

const sum = <T>(list: T[], pick: (item: T) => number): number =>
  list.reduce((s, item) => s + (pick(item) || 0), 0);

export function reconcileDay(input: ReconcileInput): ReconcileResult {
  const { date, spot, close, dispatchers, pilots, cameramen } = input;
  const requireCodes = input.requireCodes !== false;
  const issues: Issue[] = [];
  const byUser: Record<string, Issue[]> = {};

  const flag = (issue: Issue) => {
    issues.push(issue);
    for (const who of issue.who) {
      if (!byUser[who]) byUser[who] = [];
      byUser[who].push(issue);
    }
  };

  /* ---------------- Dải mã vé đã xuất ---------------- */

  /**
   * Mốc để đối chiếu là dải mã KẾ TOÁN khai. Kế toán chưa nhập thì tạm lấy dải
   * của điều phối để vẫn soi được mã trùng/mã lạ giữa các phi công — nhưng vẫn
   * báo thiếu số kế toán, vì ngày không có số kế toán thì không chốt được.
   */
  const closeRanges = close?.issuedRanges ?? [];
  const dispatcherRanges = dispatchers.flatMap((d) => d.issuedRanges ?? []);
  const usingDispatcherRanges = closeRanges.length === 0;
  const expanded = expandTicketRanges(usingDispatcherRanges ? dispatcherRanges : closeRanges);

  for (const err of expanded.errors) {
    flag({
      code: "DAI_MA_SAI",
      severity: "red",
      message: `Dải mã vé thứ ${err.index + 1} không đọc được: ${err.error}`,
      who: [],
    });
  }

  if (expanded.overlaps.length) {
    flag({
      code: "DAI_MA_SAI",
      severity: "red",
      message: `Các dải mã vé chồng nhau ở ${expanded.overlaps.length} mã: ${short(expanded.overlaps)}`,
      who: [],
      codes: expanded.overlaps,
    });
  }

  const issuedCodes = expanded.codes;
  const issuedSet = new Set(issuedCodes);

  /* ---------------- Vé huỷ và vé dời lịch ---------------- */

  /**
   * Điều phối là NGƯỜI NHẬP huỷ/dời — kế toán chỉ xác nhận (sửa qua khung
   * "Sửa" nếu sai). Kế toán có tự khai mã thì số kế toán mới là mốc.
   */
  const cancelledSet = new Set(
    close && close.cancelledCodes.length
      ? close.cancelledCodes
      : dispatchers.flatMap((d) => d.cancelledCodes),
  );
  const rescheduledList =
    close && close.rescheduled.length ? close.rescheduled : dispatchers.flatMap((d) => d.rescheduled);
  const rescheduledSet = new Set(rescheduledList.map((r) => r.code));

  for (const r of rescheduledList) {
    if (!r.toDate) {
      flag({
        code: "DOI_LICH_SAI_NGAY",
        severity: "red",
        message: `Vé dời lịch ${r.code} chưa ghi dời sang ngày nào`,
        who: [],
        codes: [r.code],
      });
      continue;
    }
    if (r.toDate <= date) {
      flag({
        code: "DOI_LICH_SAI_NGAY",
        severity: "red",
        message: `Vé ${r.code} dời tới ${formatDateKeyVN(r.toDate)} — phải là ngày SAU ${formatDateKeyVN(date)}`,
        who: [],
        codes: [r.code],
      });
    }
  }

  /**
   * Dải mã của kế toán và của điều phối phải trùng nhau tới từng mã.
   *
   * Dải của kế toán là MỐC cho mọi phép soát ("mã lạ", "mã thiếu"). Điều phối gõ
   * lệch một số ở đầu/cuối dải là phi công bay vé thật cũng bị báo "mã không nằm
   * trong dải đã xuất" — đổ oan cho người bay. So dải ngay từ đầu thì lỗi chỉ
   * đúng vào quầy vé.
   */
  if (close && closeRanges.length && dispatcherRanges.length) {
    const dispatcherExpanded = expandTicketRanges(dispatcherRanges);
    const closeSet = new Set(issuedCodes);
    const dispatcherSet = new Set(dispatcherExpanded.codes);
    const onlyClose = [...closeSet].filter((c) => !dispatcherSet.has(c));
    const onlyDispatcher = [...dispatcherSet].filter((c) => !closeSet.has(c));

    if (onlyClose.length || onlyDispatcher.length) {
      const parts: string[] = [];
      if (onlyClose.length) parts.push(`chỉ kế toán có: ${short(onlyClose)}`);
      if (onlyDispatcher.length) parts.push(`chỉ điều phối có: ${short(onlyDispatcher)}`);
      flag({
        code: "DAI_MA_SAI",
        severity: "red",
        message: `Dải mã vé xuất ra hai bên khai khác nhau — ${parts.join(" · ")}`,
        who: dispatchers.map((d) => d.username),
        codes: [...onlyClose, ...onlyDispatcher],
      });
    }
  }

  /**
   * Mã huỷ / dời lịch phải nằm trong dải vé đã xuất. Gõ nhầm một ký tự là mã đó
   * biến mất khỏi mọi phép soát: vé thật vẫn treo lơ lửng "không ai bay", còn
   * phi công vô can thì bị hỏi. Bắt ngay tại chỗ, gọi tên điều phối vì đây là
   * số của quầy.
   */
  if (issuedSet.size) {
    const strayReturned = [...new Set([...cancelledSet, ...rescheduledSet])].filter(
      (c) => !issuedSet.has(c),
    );
    if (strayReturned.length) {
      flag({
        code: "DAI_MA_SAI",
        severity: "red",
        message: `Mã khai huỷ/dời lịch nhưng không nằm trong dải vé đã xuất: ${short(strayReturned)}`,
        who: dispatchers.map((d) => d.username),
        codes: strayReturned,
      });
    }
  }

  /**
   * Kế toán và điều phối phải huỷ/dời CÙNG những mã đó. Trước đây chỉ so số
   * lượng nên hai bên khai hai mã khác nhau vẫn "khớp" và ngày chốt được — vé
   * thật thì một cái bị huỷ oan, một cái bị tính là đã bay.
   */
  if (close && dispatchers.length) {
    const compareSets = (label: string, closeCodes: string[], dispatcherCodes: string[]) => {
      const a = new Set(closeCodes.map((c) => c.trim().toUpperCase()));
      const b = new Set(dispatcherCodes.map((c) => c.trim().toUpperCase()));
      const onlyClose = [...a].filter((c) => !b.has(c));
      const onlyDispatcher = [...b].filter((c) => !a.has(c));
      if (!onlyClose.length && !onlyDispatcher.length) return;

      const parts: string[] = [];
      if (onlyClose.length) parts.push(`chỉ kế toán có: ${short(onlyClose)}`);
      if (onlyDispatcher.length) parts.push(`chỉ điều phối có: ${short(onlyDispatcher)}`);
      flag({
        code: "LECH_VE_THU_HOI",
        severity: "red",
        message: `Mã vé ${label} hai bên khai khác nhau — ${parts.join(" · ")}`,
        who: dispatchers.map((d) => d.username),
        codes: [...onlyClose, ...onlyDispatcher],
      });
    };

    if (close.cancelledCodes.length) {
      compareSets("HUỶ", close.cancelledCodes, dispatchers.flatMap((d) => d.cancelledCodes));
    }
    if (close.rescheduled.length) {
      compareSets(
        "DỜI LỊCH",
        close.rescheduled.map((r) => r.code),
        dispatchers.flatMap((d) => d.rescheduled.map((r) => r.code)),
      );
    }
  }

  const bothCancelledAndMoved = [...cancelledSet].filter((c) => rescheduledSet.has(c));
  if (bothCancelledAndMoved.length) {
    flag({
      code: "LECH_VE_THU_HOI",
      severity: "red",
      message: `Vé vừa khai huỷ vừa khai dời lịch: ${short(bothCancelledAndMoved)}`,
      who: [],
      codes: bothCancelledAndMoved,
    });
  }

  /* ---------------- Mã vé phi công khai ---------------- */

  /** code -> những phi công khai đã bay mã đó. */
  const flownBy = new Map<string, string[]>();

  for (const p of pilots) {
    const seen = new Set<string>();
    const malformed: string[] = [];

    for (const raw of p.ticketCodes) {
      const c = raw.trim().toUpperCase();
      if (!c) continue;

      if (!TICKET_CODE_PATTERN.test(c)) malformed.push(c);
      if (seen.has(c)) continue;
      seen.add(c);

      const list = flownBy.get(c);
      if (list) list.push(p.username);
      else flownBy.set(c, [p.username]);
    }

    /** Số mã PG — kiểm "số chuyến = số mã" trước khi trộn thêm mã PPG vào. */
    const pgCodeCount = seen.size;

    // Mã PPG cũng là vé đã bay: vào chung bộ soát trùng / lạ / thiếu
    for (const raw of p.ppgCodes ?? []) {
      const c = raw.trim().toUpperCase();
      if (!c) continue;
      if (!TICKET_CODE_PATTERN.test(c)) malformed.push(c);
      if (seen.has(c)) continue;
      seen.add(c);

      const list = flownBy.get(c);
      if (list) list.push(p.username);
      else flownBy.set(c, [p.username]);
    }

    if (malformed.length) {
      flag({
        code: "MA_SAI_DANG",
        severity: "red",
        message: `${p.pilotName}: mã vé sai dạng — ${short(malformed)}. ${TICKET_CODE_HINT}`,
        who: [p.username],
        codes: malformed,
      });
    }

    if (requireCodes && p.flightCount !== pgCodeCount) {
      flag({
        code: "PHI_CONG_LECH_SO",
        severity: "red",
        message: `${p.pilotName} khai ${p.flightCount} chuyến nhưng liệt kê ${pgCodeCount} mã vé`,
        who: [p.username],
      });
    } else if (!requireCodes && pgCodeCount > 0 && p.flightCount !== pgCodeCount) {
      // Điểm không bắt mã: khai một phần là bình thường, chỉ nhắc chứ không treo ngày
      flag({
        code: "PHI_CONG_LECH_SO",
        severity: "warn",
        message: `${p.pilotName} khai ${p.flightCount} chuyến, ghi ${pgCodeCount} mã (điểm này không bắt buộc mã)`,
        who: [p.username],
      });
    }

    if (!p.submitted) {
      flag({
        code: "PHI_CONG_CHUA_CHOT",
        severity: "red",
        message: `${p.pilotName} chưa bấm chốt báo cáo ngày ${formatDateKeyVN(date)}`,
        who: [p.username],
      });
    }
  }

  for (const c of cameramen) {
    if (!c.submitted) {
      flag({
        code: "CAMERA_CHUA_CHOT",
        severity: "red",
        message: `${c.cameramanName} (camera man) chưa bấm chốt báo cáo ngày ${formatDateKeyVN(date)}`,
        who: [c.username],
      });
    }
  }

  /* ---------------- Soát mã: trùng, lạ, đã huỷ, thiếu ---------------- */

  const duplicateCodes: Array<{ code: string; pilots: string[] }> = [];

  for (const [c, whoList] of flownBy) {
    if (whoList.length > 1) {
      duplicateCodes.push({ code: c, pilots: whoList });
      const names = whoList
        .map((u) => pilots.find((p) => p.username === u)?.pilotName || u)
        .join(" và ");
      flag({
        code: "MA_TRUNG",
        severity: "red",
        message: `Mã ${c} được ${whoList.length} phi công cùng khai đã bay: ${names}`,
        who: whoList,
        codes: [c],
      });
    }
  }

  const unknownByPilot = new Map<string, string[]>();
  const notFlyableByPilot = new Map<string, string[]>();

  for (const [c, whoList] of flownBy) {
    // Mã sai dạng đã báo riêng, không báo thêm là "mã lạ" cho cùng một lỗi.
    if (!TICKET_CODE_PATTERN.test(c)) continue;

    if (issuedSet.size && !issuedSet.has(c)) {
      for (const u of whoList) unknownByPilot.set(u, [...(unknownByPilot.get(u) || []), c]);
      continue;
    }

    if (cancelledSet.has(c) || rescheduledSet.has(c)) {
      for (const u of whoList) notFlyableByPilot.set(u, [...(notFlyableByPilot.get(u) || []), c]);
    }
  }

  for (const [u, codes] of unknownByPilot) {
    const name = pilots.find((p) => p.username === u)?.pilotName || u;
    flag({
      code: "MA_LA",
      severity: "red",
      message: `${name} khai mã không nằm trong dải vé đã xuất: ${short(codes)}`,
      who: [u],
      codes,
    });
  }

  for (const [u, codes] of notFlyableByPilot) {
    const name = pilots.find((p) => p.username === u)?.pilotName || u;
    flag({
      code: "MA_KHONG_BAY",
      severity: "red",
      message: `${name} khai đã bay mã đã huỷ hoặc đã dời lịch: ${short(codes)}`,
      who: [u],
      codes,
    });
  }

  const missingCodes = requireCodes
    ? issuedCodes.filter((c) => !flownBy.has(c) && !cancelledSet.has(c) && !rescheduledSet.has(c))
    : [];

  if (missingCodes.length) {
    /**
     * KHÔNG gán cho phi công nào: mã không ai khai thì theo định nghĩa là không
     * biết của ai. Trước đây gán cho cả đội, hậu quả là hai người khai trùng một
     * mã làm mọi phi công còn lại đều thấy báo đỏ trong báo cáo của mình — sai
     * người. Đây là việc của kế toán: nhìn dải mã rồi hỏi đúng người.
     */
    flag({
      code: "MA_THIEU",
      severity: "red",
      message:
        `${missingCodes.length} mã đã xuất mà không phi công nào khai đã bay, cũng không khai huỷ hay dời lịch: ` +
        short(missingCodes),
      who: [],
      codes: missingCodes,
    });
  }

  /* ---------------- Cộng số từ báo cáo nhân viên ---------------- */

  const totals: ReconcileTotals = {
    issuedCodes: issuedCodes.length,
    dispatcherIssued: sum(dispatchers, (d) => d.ticketsIssued),
    dispatcherReturned: sum(dispatchers, (d) => d.ticketsReturned),
    dispatcherGuests: sum(dispatchers, (d) => d.guestCount),
    dispatcherFlycam: sum(dispatchers, (d) => d.flycam),
    dispatcher360: sum(dispatchers, (d) => d.video360),
    dispatcherRedFlag: sum(dispatchers, (d) => d.redFlag),
    dispatcherFlagFlight: sum(dispatchers, (d) => d.flagFlight),
    dispatcherCash: sum(dispatchers, (d) => d.cashReceived),
    dispatcherTransfer: sum(dispatchers, (d) => d.transferReceived),
    dispatcherDiplomatic: sum(dispatchers, (d) => d.diplomaticGuests),
    pilotFlights: sum(pilots, (p) => p.flightCount),
    pilotPpg: sum(pilots, (p) => p.ppgFlights ?? 0),
    pilotCodes: flownBy.size,
    pilotFlycam: sum(pilots, (p) => p.flycam),
    pilot360: sum(pilots, (p) => p.video360),
    pilotRedFlag: sum(pilots, (p) => p.redFlag),
    pilotFlagFlight: sum(pilots, (p) => p.flagFlight),
    pilotDiplomatic: sum(pilots, (p) => p.diplomaticGuests),
    cameramanFlycam: sum(cameramen, (c) => c.flycamFlights),
    cancelled: cancelledSet.size,
    rescheduled: rescheduledSet.size,
    expenseTotal:
      sum(pilots, (p) => p.expenseTotal) +
      sum(dispatchers, (d) => d.expenseTotal) +
      sum(cameramen, (c) => c.expenseTotal),
  };

  /* ---------------- Dịch vụ gia tăng: đối soát theo cặp ---------------- */

  /**
   * Quy tắc của kế toán, mỗi dịch vụ có một CẶP đối chiếu riêng:
   *
   *  - FLYCAM   : điều phối ↔ CAMERA MAN. Hai bên bằng nhau là khớp lệnh, KHÔNG
   *               cần soát số phi công. Chỉ khi hai bên lệch mới lôi số phi công
   *               ra làm trọng tài.
   *  - 360      : điều phối ↔ PHI CÔNG.
   *  - CỜ ĐỎ    : điều phối ↔ PHI CÔNG.
   *  - KÉO CỜ   : điều phối ↔ PHI CÔNG.
   *
   * Mã vé của các dịch vụ này KHÔNG bắt buộc nhập. Chỉ khi số lệch thì bộ đối
   * chiếu mới đòi mã: nếu hai bên đã ghi mã thì chỉ thẳng ra vé nào lệch, chưa
   * ghi thì nhắc bổ sung mã để soát.
   *
   * Lệch là chuyện có thật (khách đăng ký thêm ngay tại bãi) nên đây là lỗi CHỜ
   * DUYỆT: kế toán bấm "duyệt lệch" thì hạ xuống mức nhắc và chốt được.
   */
  const varianceApproved = close?.varianceApproved === true;

  /** So mã hai bên khi số đã lệch — trả về câu gợi ý soát, hoặc "" nếu chưa ai ghi mã. */
  const codeHint = (aLabel: string, aCodes: string[], bLabel: string, bCodes: string[]): string => {
    const a = new Set(aCodes.map((c) => c.toUpperCase()));
    const b = new Set(bCodes.map((c) => c.toUpperCase()));
    if (!a.size && !b.size) {
      return ` — hai bên chưa ghi mã vé, cần bổ sung mã để soát ra vé nào sai`;
    }
    const onlyA = [...a].filter((c) => !b.has(c));
    const onlyB = [...b].filter((c) => !a.has(c));
    if (!onlyA.length && !onlyB.length) return ` — mã vé hai bên trùng khớp, lệch nằm ở SỐ LƯỢNG khai`;
    const parts: string[] = [];
    if (onlyA.length) parts.push(`chỉ ${aLabel} có: ${short(onlyA)}`);
    if (onlyB.length) parts.push(`chỉ ${bLabel} có: ${short(onlyB)}`);
    return ` — soát mã: ${parts.join(" · ")}`;
  };

  const dispatcherUsernames = dispatchers.map((d) => d.username);

  /**
   * Lệch dịch vụ thì gọi tên AI: điều phối luôn là một bên của cặp nên luôn có
   * tên; phía phi công chỉ gọi người có mã dính vào chỗ lệch —
   *  - mã chỉ điều phối ghi  -> phi công đã BAY vé đó phải trả lời,
   *  - mã chỉ phi công ghi   -> chính người khai đó.
   * Hai bên chưa ghi mã thì không quy được cho phi công nào; ngày vẫn treo và
   * kế toán hỏi lại, còn hơn bôi đỏ báo cáo của người vô can.
   */
  const pilotsImplicated = (pilotCodes: string[], dispatcherCodes: string[]): string[] => {
    const pilotSet = new Set(pilotCodes.map((c) => c.trim().toUpperCase()));
    const dispatcherSet = new Set(dispatcherCodes.map((c) => c.trim().toUpperCase()));
    const names = new Set<string>();

    for (const c of dispatcherSet) {
      if (pilotSet.has(c)) continue;
      for (const u of flownBy.get(c) ?? []) names.add(u);
    }
    for (const p of pilots) {
      for (const raw of pilotCodes) {
        const c = raw.trim().toUpperCase();
        if (dispatcherSet.has(c)) continue;
        if (p.ticketCodes.some((t) => t.trim().toUpperCase() === c)) names.add(p.username);
      }
    }
    return [...names];
  };

  // FLYCAM: cặp chính là điều phối ↔ camera man
  if (cameramen.length && dispatchers.length && totals.cameramanFlycam !== totals.dispatcherFlycam) {
    flag({
      code: "LECH_FLYCAM",
      severity: varianceApproved ? "warn" : "red",
      message:
        `Flycam lệch: điều phối báo ${totals.dispatcherFlycam}, camera man báo ${totals.cameramanFlycam}. ` +
        `Phi công báo tổng ${totals.pilotFlycam} — lấy làm căn cứ để xét bên nào đúng` +
        codeHint("điều phối", dispatchers.flatMap((d) => d.flycamCodes), "camera man", cameramen.flatMap((c) => c.flycamCodes)) +
        (varianceApproved ? " (kế toán đã duyệt lệch)" : ""),
      who: [...cameramen.map((c) => c.username), ...dispatchers.map((d) => d.username)],
    });
  }

  // 360 · CỜ ĐỎ · KÉO CỜ: cặp điều phối ↔ phi công
  const pairChecks: Array<{
    code: IssueCode;
    label: string;
    pilotTotal: number;
    dispatcherTotal: number;
    pilotCodes: string[];
    dispatcherCodes: string[];
  }> = [
    {
      code: "LECH_360",
      label: "Camera360",
      pilotTotal: totals.pilot360,
      dispatcherTotal: totals.dispatcher360,
      pilotCodes: pilots.flatMap((p) => p.video360Codes),
      dispatcherCodes: dispatchers.flatMap((d) => d.video360ServiceCodes),
    },
    {
      code: "LECH_CO_DO",
      label: "Dù cờ đỏ",
      pilotTotal: totals.pilotRedFlag,
      dispatcherTotal: totals.dispatcherRedFlag,
      pilotCodes: pilots.flatMap((p) => p.redFlagCodes),
      dispatcherCodes: dispatchers.flatMap((d) => d.redFlagCodes),
    },
    {
      code: "LECH_KEO_CO",
      label: "Bay kéo cờ/bánh",
      pilotTotal: totals.pilotFlagFlight,
      dispatcherTotal: totals.dispatcherFlagFlight,
      pilotCodes: pilots.flatMap((p) => p.flagFlightCodes),
      dispatcherCodes: dispatchers.flatMap((d) => d.flagFlightCodes),
    },
  ];

  for (const chk of pairChecks) {
    if (!pilots.length || !dispatchers.length) continue;
    if (chk.pilotTotal === chk.dispatcherTotal) continue;

    flag({
      code: chk.code,
      severity: varianceApproved ? "warn" : "red",
      message:
        `${chk.label} lệch: điều phối báo ${chk.dispatcherTotal}, phi công báo tổng ${chk.pilotTotal}` +
        codeHint("điều phối", chk.dispatcherCodes, "phi công", chk.pilotCodes) +
        (varianceApproved ? " (kế toán đã duyệt lệch)" : ""),
      who: [...dispatcherUsernames, ...pilotsImplicated(chk.pilotCodes, chk.dispatcherCodes)],
    });
  }

  if (totals.pilotDiplomatic !== totals.dispatcherDiplomatic) {
    flag({
      code: "LECH_KHACH",
      severity: "warn",
      message: `Khách ngoại giao lệch: phi công báo ${totals.pilotDiplomatic}, điều phối báo ${totals.dispatcherDiplomatic}`,
      who: [],
    });
  }

  /* ---------------- Số tổng: kế toán so với nhân viên ---------------- */

  if (!close) {
    flag({
      code: "THIEU_SO_KE_TOAN",
      severity: "red",
      message: `Kế toán chưa nhập số tổng ngày ${formatDateKeyVN(date)}`,
      who: [],
    });
  } else {
    const check = (
      code: IssueCode,
      label: string,
      mine: number,
      theirs: number,
      who: string[],
      money = false,
    ) => {
      if (mine === theirs) return;
      const fmt = (n: number) => (money ? vnd(n) : String(n));
      /**
       * Kế toán là người quyết định cuối: tick "duyệt lệch" thì các lệch
       * kế-toán-vs-nhân-viên chỉ còn là NHẮC vàng, không chặn chốt nữa —
       * giống các lỗi lệch khác. Số của kế toán là số được ghi sổ.
       */
      flag({
        code,
        severity: varianceApproved ? "warn" : "red",
        message:
          `${label}: kế toán khai ${fmt(mine)}, nhân viên báo tổng ${fmt(theirs)}` +
          (varianceApproved ? " (kế toán đã duyệt lệch — lấy số kế toán)" : ""),
        who,
      });
    };

    const dispatcherUsers = dispatchers.map((d) => d.username);
    /** Hà Nội không quản lý bằng vé — các phép soát theo VÉ/MÃ tắt ở điểm này. */
    const countsFollowCodes = spot !== "ha-noi";

    check("LECH_KHACH", "Số khách bay", close.guestCount, totals.dispatcherGuests, dispatcherUsers);
    // Hà Nội KHÔNG xuất vé — khách book liên hệ rồi bay luôn, không có quầy vé: mọi phép so theo VÉ tắt hẳn
    if (countsFollowCodes) {
      check("LECH_VE_XUAT", "Số vé xuất ra", close.ticketsIssued, totals.dispatcherIssued, dispatcherUsers);
      check("LECH_VE_THU_HOI", "Số vé thu về", close.ticketsReturned, totals.dispatcherReturned, dispatcherUsers);
    }
    check("LECH_TIEN", "Tiền mặt", close.cashTotal, totals.dispatcherCash, dispatcherUsers, true);
    check("LECH_TIEN", "Chuyển khoản", close.transferTotal, totals.dispatcherTransfer, dispatcherUsers, true);
    // Kéo cờ: số chốt của kế toán so với điều phối (cặp phi công ↔ điều phối đã soát ở trên)
    check("LECH_KEO_CO", "Bay kéo cờ/bánh", close.flagFlight, totals.dispatcherFlagFlight, dispatcherUsers);

    if (issuedCodes.length && close.ticketsIssued !== issuedCodes.length) {
      flag({
        code: "LECH_VE_XUAT",
        severity: "red",
        message: `Kế toán khai xuất ${close.ticketsIssued} vé nhưng các dải mã cho ra ${issuedCodes.length} mã`,
        who: [],
      });
    }

    // Số huỷ/dời của kế toán so với NGUỒN: mã kế toán tự khai (nếu có), không thì số điều phối
    const dispatcherCancelled = new Set(dispatchers.flatMap((d) => d.cancelledCodes)).size;
    const dispatcherRescheduled = dispatchers.flatMap((d) => d.rescheduled).length;
    if (countsFollowCodes && !close.cancelledCodes.length && dispatchers.length) {
      check("LECH_VE_THU_HOI", "Vé huỷ hoàn tiền", close.cancelledCount, dispatcherCancelled, dispatcherUsers);
    }
    if (countsFollowCodes && !close.rescheduled.length && dispatchers.length) {
      check("LECH_VE_THU_HOI", "Vé dời lịch", close.rescheduledCount, dispatcherRescheduled, dispatcherUsers);
    }
    if (countsFollowCodes && close.cancelledCodes.length && close.cancelledCount !== close.cancelledCodes.length) {
      flag({
        code: "LECH_VE_THU_HOI",
        severity: "red",
        message: `Kế toán khai ${close.cancelledCount} vé huỷ nhưng liệt kê ${close.cancelledCodes.length} mã`,
        who: [],
      });
    }

    if (countsFollowCodes && close.rescheduled.length && close.rescheduledCount !== close.rescheduled.length) {
      flag({
        code: "LECH_VE_THU_HOI",
        severity: "red",
        message: `Kế toán khai ${close.rescheduledCount} vé dời lịch nhưng liệt kê ${close.rescheduled.length} mã`,
        who: [],
      });
    }

    /** Vé thu hồi = huỷ + dời lịch. Không có loại thứ ba. (Hà Nội không có vé — bỏ qua.) */
    if (countsFollowCodes && close.ticketsReturned !== close.cancelledCount + close.rescheduledCount) {
      flag({
        code: "LECH_VE_THU_HOI",
        severity: "red",
        message:
          `Vé thu hồi (${close.ticketsReturned}) khác tổng huỷ + dời lịch ` +
          `(${close.cancelledCount} + ${close.rescheduledCount} = ${close.cancelledCount + close.rescheduledCount})`,
        who: [],
      });
    }

    /**
     * Vé xuất = đã bay + thu hồi. Lệch ở đây là chắc chắn thiếu số, vì vé không
     * bay đã không còn trạng thái thứ ba nào ngoài huỷ và dời lịch.
     */
    /**
     * Đếm theo SỐ MÃ KHÁC NHAU đã bay, không phải tổng số chuyến từng người khai:
     * hai phi công khai trùng một mã thì tổng số chuyến bị đội lên 1, cân bằng
     * này sẽ khớp giả và giấu mất chỗ thiếu vé.
     */
    const flownDistinct = requireCodes ? flownBy.size : totals.pilotFlights;
    const accounted = close.ticketsReturned + flownDistinct;
    // Hà Nội không xuất vé — cân bằng vé xuất/đã bay không tồn tại ở điểm này
    if (countsFollowCodes && close.ticketsIssued !== accounted) {
      flag({
        code: "LECH_TONG_CHUYEN",
        severity: "red",
        message:
          `Vé xuất (${close.ticketsIssued}) khác tổng đã bay + thu hồi ` +
          `(${flownDistinct} + ${close.ticketsReturned} = ${accounted})` +
          (requireCodes && totals.pilotFlights !== flownDistinct
            ? ` — phi công khai tổng ${totals.pilotFlights} chuyến nhưng chỉ có ${flownDistinct} mã khác nhau`
            : ""),
        // Không quy cho phi công nào: chỗ lệch nằm ở tổng của cả ngày
        who: [],
      });
    }

    /**
     * Số flycam/360 kế toán tự khai so với NGUỒN CHUẨN của từng dịch vụ:
     * flycam lấy camera man, 360 lấy phi công. Vẫn trong diện duyệt lệch.
     */
    if (close.flycam !== totals.cameramanFlycam && cameramen.length) {
      flag({
        code: "LECH_FLYCAM",
        severity: varianceApproved ? "warn" : "red",
        message: `Flycam: kế toán khai ${close.flycam}, camera man báo ${totals.cameramanFlycam}`,
        who: cameramen.map((c) => c.username),
      });
    }

    if (close.video360 !== totals.pilot360 && pilots.length) {
      flag({
        code: "LECH_360",
        severity: varianceApproved ? "warn" : "red",
        message: `Camera360: kế toán khai ${close.video360}, phi công báo ${totals.pilot360}`,
        // Lệch với con số kế toán tự khai — không chỉ đích danh phi công nào được
        who: [],
      });
    }

    // Cờ đỏ cùng khuôn với 360: nguồn chuẩn là phi công, lệch thì duyệt được
    if ((close.redFlag ?? 0) !== totals.pilotRedFlag && pilots.length) {
      flag({
        code: "LECH_CO_DO",
        severity: varianceApproved ? "warn" : "red",
        message: `Dù cờ đỏ: kế toán khai ${close.redFlag}, phi công báo ${totals.pilotRedFlag}`,
        who: [],
      });
    }

    /**
     * Có chi tiêu mà kế toán chưa xác nhận thì chưa chốt: tiền nhân viên bỏ ra
     * phải được người trả tiền nhìn qua trước khi khoá sổ.
     */
    if (totals.expenseTotal > 0 && !close.expensesApproved) {
      flag({
        code: "CHUA_DUYET_CHI",
        severity: "red",
        message: `Có ${vnd(totals.expenseTotal)} chi tiêu nhân viên khai mà kế toán chưa xác nhận`,
        who: [],
      });
    }
  }

  // Dải mã mặc định lấy của ĐIỀU PHỐI (kế toán không nhập vé nữa) — không cần nhắc.

  /**
   * Ngày mưa gió, không bán vé nào: kế toán khai 0 hết thì KHÔNG đòi báo cáo của
   * phi công và điều phối nữa — không bay thì không có gì để báo (đúng quy tắc
   * "0 chuyến thì không cần báo cáo"). Trước đây ngày trắng như vậy không tài
   * nào chốt được.
   */
  const nothingIssued =
    issuedCodes.length === 0 &&
    (close ? close.ticketsIssued === 0 && close.guestCount === 0 : false) &&
    !dispatchers.some((d) => d.ticketsIssued > 0) &&
    !pilots.some((p) => p.flightCount > 0);

  if (!pilots.length && !nothingIssued) {
    flag({
      code: "PHI_CONG_CHUA_CHOT",
      severity: "red",
      message: `Chưa phi công nào báo cáo ngày ${formatDateKeyVN(date)}`,
      who: [],
    });
  }

  if (!dispatchers.length && !nothingIssued) {
    flag({
      code: "LECH_VE_XUAT",
      severity: "red",
      message: `Chưa có báo cáo điều phối bay ngày ${formatDateKeyVN(date)}`,
      who: [],
    });
  }

  return {
    date,
    canClose: !issues.some((i) => i.severity === "red"),
    issues,
    byUser,
    totals,
    missingCodes,
    duplicateCodes,
  };
}
