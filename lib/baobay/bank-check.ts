// lib/baobay/bank-check.ts
/**
 * SOÁT CHUYỂN KHOẢN: kế toán dán nguyên danh sách SMS banking / sao kê, máy
 * bóc từng khoản tiền vào rồi dò xem khoản đó là của booking nào.
 *
 * Đây là hàm THUẦN (không đọc cơ sở dữ liệu) — tách riêng để thử được bằng tay
 * với đủ kiểu chuỗi SMS mà không phải dựng máy chủ. Phần đọc dữ liệu và lưu kết
 * quả nằm ở services/bank-check.service.ts.
 *
 * Ba căn cứ khớp, theo thứ tự tin cậy giảm dần (do chủ điểm bay đặt):
 *
 *  1. MÃ GIAO DỊCH: nhân viên chỉ ghi 4-5 KÝ TỰ CUỐI của mã (không phân biệt
 *     hoa thường) — khớp khi một dãy chữ-số nào đó trong dòng sao kê KẾT THÚC
 *     bằng đúng đuôi ấy. Trùng đuôi giữa hai khoản thì xét tiếp số tiền, rồi
 *     ghi chú (tên khách / mã booking) để tách.
 *  2. NỘI DUNG CK trùng với booking: chuỗi "2508 k3" (ngày bay + số thứ tự — nội
 *     dung mã QR app tạo sẵn, mỗi booking một chuỗi, không thể trùng trong ngày),
 *     hoặc mã booking, hoặc SĐT, hoặc TÊN khách không dấu (ngân hàng tự điền
 *     "NGUYEN TRAN PHUONG THAO chuyen tien" khi khách lười gõ).
 *  3. SỐ TIỀN trùng với số còn thu / số đã ghi — chỉ chốt khi duy nhất một
 *     booking có số tiền đó; hai booking cùng số thì báo PHÂN VÂN chứ không đoán.
 *
 * Khớp theo căn cứ nào cũng ghi rõ ra để kế toán biết mức tin cậy mà soát lại.
 */

import { toAsciiNote } from "@/lib/vietqr";

/* ================================================================== */
/* BÓC TÁCH sao kê dán vào                                             */
/* ================================================================== */

export type BankEntry = {
  /** Nguyên văn đoạn sao kê của khoản này — lưu lại để kế toán đọc bằng mắt. */
  raw: string;
  /** Số tiền VÀO (dương). 0 = không đọc được số tiền. */
  amount: number;
  /** Dòng TRỪ tiền (chi ra) — không phải tiền khách trả, bỏ qua khi soát. */
  outgoing: boolean;
  /** Ngày trên sao kê "YYYY-MM-DD" (nếu đọc được) — có thể khác ngày đang soát. */
  bankDate: string;
  /** Giờ trên sao kê "HH:mm" (nếu đọc được). */
  bankTime: string;
};

/**
 * Số tiền có DẤU: "+2,590,000VND", "-50.000đ", "GD: +2,590,000".
 * Bắt buộc có ngăn cách nghìn HOẶC đơn vị tiền đi kèm — nếu không thì
 * "+84912345678" (SĐT quốc tế) cũng thành một khoản tiền tỷ.
 */
const SIGNED_AMOUNT = /([+-])\s?(\d{1,3}(?:[.,]\d{3})+|\d{4,12})(\s?(?:VND|VNĐ|VNd|dong|đ|d)\b)?/i;
/** Số tiền KHÔNG dấu nhưng có ngăn cách nghìn — cho danh sách gõ tay "k3 KLK123 2,590,000". */
const PLAIN_AMOUNT = /\b\d{1,3}(?:[.,]\d{3})+\b/;

const DATE_RE = /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})\b/;
const TIME_RE = /\b(\d{1,2}):(\d{2})\b/;

function parseAmount(line: string): { amount: number; outgoing: boolean } | null {
  const signed = SIGNED_AMOUNT.exec(line);
  if (signed) {
    const grouped = /[.,]/.test(signed[2]);
    // Không ngăn cách nghìn, không đơn vị tiền: là dãy số thường (SĐT, số TK), bỏ
    if (!grouped && !signed[3]) return null;
    const amount = Number(signed[2].replace(/[.,]/g, ""));
    if (!(amount >= 1000)) return null;
    return { amount, outgoing: signed[1] === "-" };
  }
  const plain = PLAIN_AMOUNT.exec(line);
  if (plain) {
    const amount = Number(plain[0].replace(/[.,]/g, ""));
    if (amount >= 10_000) return { amount, outgoing: false };
  }
  return null;
}

function parseBankDate(text: string): string {
  const m = DATE_RE.exec(text);
  if (!m) return "";
  const [, d, mo, yRaw] = m;
  const day = Number(d);
  const month = Number(mo);
  if (day < 1 || day > 31 || month < 1 || month > 12) return "";
  const year = yRaw.length === 4 ? Number(yRaw) : 2000 + Number(yRaw);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseBankTime(text: string): string {
  const m = TIME_RE.exec(text);
  if (!m) return "";
  const h = Number(m[1]);
  const minute = Number(m[2]);
  if (h > 23 || minute > 59) return "";
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

/**
 * Dán cả tràng SMS thì mỗi tin có thể gãy thành nhiều dòng. Quy tắc gom: dòng
 * nào có SỐ TIỀN là mở một khoản mới, các dòng sau không có số tiền thì nối vào
 * khoản đang mở (thường là phần "ND: ..." bị xuống dòng).
 */
export function parseBankStatement(text: string): BankEntry[] {
  const groups: string[][] = [];
  for (const lineRaw of String(text ?? "").split(/\r?\n/)) {
    const line = lineRaw.trim();
    if (!line) continue;
    if (parseAmount(line) || groups.length === 0) groups.push([line]);
    else groups[groups.length - 1].push(line);
  }

  return groups.map((lines) => {
    const raw = lines.join(" ").replace(/\s+/g, " ").trim();
    const parsed = parseAmount(raw);
    return {
      raw,
      amount: parsed?.amount ?? 0,
      outgoing: parsed?.outgoing ?? false,
      bankDate: parseBankDate(raw),
      bankTime: parseBankTime(raw),
    };
  });
}

/* ================================================================== */
/* DÒ KHỚP với booking / lệnh thu                                      */
/* ================================================================== */

/** Một "chỗ tiền có thể về": khoản CK đã ghi trong app, hoặc booking đang chờ thu. */
export type BankCandidate = {
  /** "collect:<id>" · "deposit:<bookingId>" · "remaining:<bookingId>" — dùng làm khoá đối chiếu ngược. */
  id: string;
  kind: "collect" | "deposit" | "remaining";
  /** Booking đứng sau khoản này (lệnh thu lẻ không gắn booking thì trống). */
  bookingId?: string;
  spot: string;
  /** Nhãn cho người đọc: "#3 Nguyễn Trần Phương Thảo · bay 18/08". */
  label: string;
  daySeq: number;
  /** Ngày bay "YYYY-MM-DD" — để khớp chuỗi "2508 k3". */
  flightDate: string;
  bookingCode: string;
  phone: string;
  contactName: string;
  /** Mã giao dịch ngân hàng đã ghi kèm khoản này. */
  codes: string[];
  /** Các số tiền có thể khớp (số đã ghi, số còn thu…). */
  amounts: number[];
  /** App ĐÃ ghi nhận khoản CK này chưa — false nghĩa là khớp được thì phải nhắc "chưa ghi thu". */
  recorded: boolean;
  /** Ngày LẬP booking "YYYY-MM-DD" — khách hay chuyển cọc ngay hôm đăng ký. */
  createdDate?: string;
};

/* ================================================================== */
/* CHẤM ĐIỂM NHIỀU DẤU HIỆU                                            */
/*                                                                     */
/* Chỉ so mã giao dịch là chưa đủ. Nhân viên gõ mã của booking này sang */
/* booking kia mà hai bên cùng số tiền thì máy vẫn "khớp" ngon lành, và */
/* tiền nằm nhầm sổ mà không ai biết. Nên mỗi ứng viên được soi bằng SÁU */
/* dấu hiệu độc lập; nhiều dấu hiệu cùng chỉ về một chỗ mới là chắc, còn */
/* mã GD một mình chỉ sang chỗ khác thì phải kêu lên cho kế toán nhìn.  */
/* ================================================================== */

export type BankSignals = {
  /** Đuôi mã giao dịch đã ghi trong app nằm trong dòng sao kê. */
  code: boolean;
  /** Số tiền đúng bằng một trong các số đang chờ. */
  amount: boolean;
  /** Tên chủ tài khoản trên sao kê chứa tên khách. */
  name: boolean;
  /** 9 số cuối SĐT khách nằm trong dòng. */
  phone: boolean;
  /** Nội dung CK có mã booking, hoặc chuỗi "ddmm kN" của mã QR app tạo. */
  note: boolean;
  /** Ngày chuyển tiền trùng ngày bay hoặc ngày lập booking. */
  date: boolean;
};

export const SIGNAL_LABEL: Record<keyof BankSignals, string> = {
  code: "mã GD",
  amount: "số tiền",
  name: "tên chủ TK",
  phone: "SĐT",
  note: "nội dung",
  date: "ngày CK",
};

export function signalNames(sg: BankSignals): string[] {
  return (Object.keys(SIGNAL_LABEL) as Array<keyof BankSignals>).filter((k) => sg[k]).map((k) => SIGNAL_LABEL[k]);
}

export function signalCount(sg: BankSignals): number {
  return signalNames(sg).length;
}

/** Sáu dấu hiệu của MỘT ứng viên so với MỘT dòng sao kê. */
export function signalsFor(entry: BankEntry, c: BankCandidate, hayInput?: string): BankSignals {
  const hay = hayInput ?? ascii(entry.raw);
  const runs = hay.match(/[A-Z0-9]{4,}/g) ?? [];
  const digitRuns = hay.match(/\d{9,12}/g) ?? [];

  const code = c.codes.some((raw) => {
    const k = ascii(raw).replace(/[^A-Z0-9]/g, "");
    return k.length >= 4 && runs.some((r) => r.endsWith(k));
  });

  const name = (() => {
    const n = ascii(c.contactName);
    return n.length >= 6 && n.includes(" ") && hay.includes(n);
  })();

  const tail = c.phone.replace(/\D/g, "").slice(-9);
  const phone = tail.length === 9 && digitRuns.some((r) => r.endsWith(tail));

  const note = (() => {
    const bc = ascii(c.bookingCode);
    if (bc.length >= 4 && containsToken(hay, bc)) return true;
    const dd = c.flightDate.slice(8, 10);
    const mm = c.flightDate.slice(5, 7);
    if (!dd || !mm || !c.daySeq) return false;
    return new RegExp(`${dd}/?${mm}\\s*K\\s?${c.daySeq}(?:[^0-9]|$)`).test(hay);
  })();

  /**
   * NGÀY CK là dấu hiệu YẾU (một ngày có hàng chục người chuyển) nên không bao
   * giờ đứng một mình, nhưng nó loại được đúng cái nhầm hay gặp: mã gõ nhầm
   * sang booking của ngày khác.
   */
  const date = Boolean(entry.bankDate) && (entry.bankDate === c.flightDate || entry.bankDate === c.createdDate);

  return { code, amount: c.amounts.includes(entry.amount), name, phone, note, date };
}

export type BankMatch =
  | {
      status: "matched";
      level: "code" | "note" | "amount";
      hit: BankCandidate;
      /** Giải thích cho kế toán: khớp bằng gì. */
      why: string;
    }
  | { status: "multi"; hits: BankCandidate[]; why: string }
  /**
   * GỢI Ý soát tay — dấu hiệu yếu (tên giống nhau) nên máy KHÔNG tự nhận,
   * chỉ đặt hai luồng cạnh nhau cho kế toán quyết. Bài học "TRAN THI THU
   * HUYEN" khớp nhầm vào booking "Trần Thị Thu": tên chứa tên là chuyện
   * thường, tiền của người này gắn sang booking người kia là mất dấu cả hai.
   */
  | { status: "suggest"; hits: BankCandidate[]; why: string }
  | { status: "none" };

/** Chuỗi so khớp: bỏ dấu, viết hoa, dồn khoảng trắng — hai phía đều qua đây. */
function ascii(s: string): string {
  return toAsciiNote(s).toUpperCase();
}

/** `needle` đứng thành CỤM RIÊNG trong `hay` (hai đầu không dính chữ/số khác). */
function containsToken(hay: string, needle: string): boolean {
  if (!needle) return false;
  const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^A-Z0-9])${esc}(?:[^A-Z0-9]|$)`).test(hay);
}

/**
 * Trùng booking thì gộp làm một: cùng một khách có thể hiện ra ở cả lệnh thu
 * lẫn "còn thu" — kể là hai ứng viên thì máy báo phân vân oan. Giữ bản ĐÃ GHI
 * (collect/deposit) vì nó cụ thể hơn bản "còn chờ thu".
 */
const KIND_RANK: Record<BankCandidate["kind"], number> = { collect: 0, deposit: 1, remaining: 2 };

export function dedupeByBooking(hits: BankCandidate[]): BankCandidate[] {
  const best = new Map<string, BankCandidate>();
  for (const c of hits) {
    const key = c.bookingId || c.id;
    const cur = best.get(key);
    if (!cur || KIND_RANK[c.kind] < KIND_RANK[cur.kind]) best.set(key, c);
  }
  return [...best.values()];
}

/** Ứng viên có TÊN KHÁCH / MÃ BOOKING / SĐT nằm trong dòng sao kê không. */
function noteHit(c: BankCandidate, hay: string): boolean {
  const code = ascii(c.bookingCode);
  if (code.length >= 4 && containsToken(hay, code)) return true;
  const name = ascii(c.contactName);
  if (name.length >= 6 && name.includes(" ") && hay.includes(name)) return true;
  const tail = c.phone.replace(/\D/g, "").slice(-9);
  return tail.length === 9 && (hay.match(/\d{9,12}/g) ?? []).some((r) => r.endsWith(tail));
}

/**
 * Rút hits về MỘT ứng viên: 1 thì xong; nhiều thì tách dần theo đúng thứ tự
 * chủ điểm bay đặt — SỐ TIỀN trước, rồi GHI CHÚ (tên khách / mã booking).
 */
function settle(
  hits: BankCandidate[],
  level: "code" | "note" | "amount",
  why: string,
  entry: BankEntry,
  hay: string,
): BankMatch {
  let uniq = dedupeByBooking(hits);
  if (uniq.length === 1) return { status: "matched", level, hit: uniq[0], why };

  const byAmount = uniq.filter((c) => c.amounts.includes(entry.amount));
  if (byAmount.length === 1) {
    return { status: "matched", level, hit: byAmount[0], why: `${why} + đúng số tiền` };
  }
  if (byAmount.length > 1) uniq = byAmount;

  const byNote = uniq.filter((c) => noteHit(c, hay));
  if (byNote.length === 1) {
    return { status: "matched", level, hit: byNote[0], why: `${why} + trùng tên/mã booking trong ghi chú` };
  }
  return { status: "multi", hits: uniq, why };
}


/**
 * KHÁCH CHUYỂN GỘP NHIỀU BOOKING trong một lần.
 *
 * Người quen đặt liền 2-3 nhóm rồi chuyển một cục từ đúng một tài khoản, mà
 * nhân viên thường không ghi mã giao dịch. Máy không tự gán được (một dòng tiền
 * chỉ trỏ về một khoản) nhưng phải NÓI RA, không thì kế toán ngồi dò tay giữa
 * mấy chục dòng mà chẳng hiểu vì sao không khớp số nào.
 *
 * Gom ứng viên theo NGƯỜI (9 số cuối SĐT, không có thì theo tên không dấu) rồi
 * thử mọi tổ hợp 2-4 booking xem có cộng đúng số tiền không.
 */
function personKey(c: BankCandidate): string {
  const tail = c.phone.replace(/\D/g, "").slice(-9);
  if (tail.length === 9) return "sdt:" + tail;
  const name = ascii(c.contactName);
  return name.length >= 6 ? "ten:" + name : "";
}

export function combinedHint(entry: BankEntry, candidates: BankCandidate[], hay: string): BankCandidate[] | null {
  if (entry.amount <= 0) return null;

  const groups = new Map<string, BankCandidate[]>();
  for (const c of dedupeByBooking(candidates)) {
    const k = personKey(c);
    if (!k) continue;
    /** Chỉ xét người CÓ MẶT trong dòng sao kê — tên hoặc SĐT phải xuất hiện. */
    const sg = signalsFor(entry, c, hay);
    if (!sg.name && !sg.phone) continue;
    groups.set(k, [...(groups.get(k) ?? []), c]);
  }

  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const pool = list.slice(0, 6); // đủ dùng, khỏi nổ tổ hợp
    const best = pickSubset(pool, entry.amount);
    if (best) return best;
  }
  return null;
}

/** Tìm tổ hợp 2-4 booking cộng đúng `target` (mỗi booking lấy số tiền lớn nhất đang chờ). */
function pickSubset(pool: BankCandidate[], target: number): BankCandidate[] | null {
  const items = pool.map((c) => ({ c, v: Math.max(...c.amounts.filter((n) => n > 0), 0) })).filter((x) => x.v > 0);
  const n = items.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const picked = items.filter((_, i) => mask & (1 << i));
    if (picked.length < 2 || picked.length > 4) continue;
    if (picked.reduce((a, x) => a + x.v, 0) === target) return picked.map((x) => x.c);
  }
  return null;
}

export function matchBankEntry(entry: BankEntry, candidates: BankCandidate[]): BankMatch {
  const hay = ascii(entry.raw);

  /* ---- 0. CHẤM ĐIỂM NHIỀU DẤU HIỆU ------------------------------------
   *
   * Chạy TRƯỚC bậc thang cũ vì nó xử được đúng cái bậc thang cũ chịu thua:
   * nhân viên gõ mã giao dịch của booking này sang booking kia mà hai bên
   * cùng số tiền. Bậc thang cũ thấy mã trùng là nhận ngay; ở đây mã chỉ là
   * MỘT trong sáu dấu hiệu, chỗ nào gom được nhiều dấu hiệu hơn thì thắng,
   * và nếu chỗ thua lại là chỗ mang mã GD thì nói thẳng "có thể gõ nhầm mã".
   *
   * Cần CÁCH BIỆT rõ mới dám kết luận: hoà điểm thì treo cho kế toán nhìn,
   * vì đoán bừa giữa hai người là mất dấu tiền của cả hai.
   */
  const scored = candidates
    .map((c) => {
      const sg = signalsFor(entry, c, hay);
      return { c, sg, n: signalCount(sg) };
    })
    /** Số tiền + ngày là hai dấu hiệu YẾU; phải có ít nhất một dấu hiệu định danh. */
    .filter((s) => s.n >= 2 && (s.sg.code || s.sg.note || s.sg.phone || s.sg.name))
    .sort((a, b) => b.n - a.n);

  if (scored.length) {
    const top = scored[0];
    const rivals = scored.filter((s) => (s.c.bookingId || s.c.id) !== (top.c.bookingId || top.c.id));
    const second = rivals[0];

    if (!second || top.n > second.n) {
      const level: "code" | "note" | "amount" = top.sg.code ? "code" : top.sg.note || top.sg.phone || top.sg.name ? "note" : "amount";
      /** Kẻ thua mà lại đang giữ mã GD: gần như chắc là nhân viên gõ nhầm mã. */
      const codeElsewhere = rivals.find((s) => s.sg.code && !top.sg.code);
      const why =
        `khớp ${top.n} dấu hiệu: ${signalNames(top.sg).join(" + ")}` +
        (codeElsewhere
          ? ` ⚠ mã GD lại đang ghi ở "${codeElsewhere.c.label}" — nhiều khả năng nhân viên gõ nhầm mã, kiểm lại cả hai`
          : "");
      return { status: "matched", level, hit: top.c, why };
    }

    if (top.n === second.n) {
      const combo = combinedHint(entry, candidates, hay);
      if (combo) {
        return {
          status: "suggest",
          hits: combo,
          why: `số tiền bằng TỔNG ${combo.length} booking của cùng một khách (${combo
            .map((c) => c.label)
            .join(" + ")}) — khách chuyển gộp, chia tay cho từng booking`,
        };
      }
      return {
        status: "multi",
        hits: dedupeByBooking(scored.filter((s) => s.n === top.n).map((s) => s.c)),
        why: `${scored.filter((s) => s.n === top.n).length} chỗ cùng khớp ${top.n} dấu hiệu (${signalNames(top.sg).join(" + ")}) — chọn tay`,
      };
    }
  }

  // ---- 1. MÃ GIAO DỊCH đã ghi trong app ----
  // Nhân viên chỉ ghi 4-5 KÝ TỰ CUỐI của mã, nên so theo ĐUÔI: một dãy chữ-số
  // nào đó trong sao kê (mã tham chiếu FT2623...3344) kết thúc bằng đúng đuôi
  // đã ghi là nhận. Ghi cả mã dài vẫn khớp — đuôi của chính nó.
  {
    const runs = hay.match(/[A-Z0-9]{4,}/g) ?? [];
    const hits = candidates.filter((c) =>
      c.codes.some((codeRaw) => {
        const code = ascii(codeRaw).replace(/[^A-Z0-9]/g, "");
        return code.length >= 4 && runs.some((r) => r.endsWith(code));
      }),
    );
    if (hits.length) {
      const m = settle(hits, "code", "trùng mã giao dịch đã ghi (đuôi mã)", entry, hay);
      // Quy tắc của chủ: mã GD trùng RỒI kiểm số tiền — cả hai cùng đúng mới
      // là "chuẩn"; mã đúng mà tiền lệch thì vẫn nhận (đuôi mã khó trùng ngẫu
      // nhiên) nhưng phải nói to cho kế toán dòm lại.
      if (m.status === "matched" && !m.hit.amounts.includes(entry.amount)) {
        return { ...m, why: `${m.why} ⚠ số tiền KHÔNG khớp số đã ghi — kiểm lại` };
      }
      return m;
    }
  }

  // ---- 2. NỘI DUNG chuyển khoản ----
  // 2a. "2508 k3" — ngày bay + số thứ tự, chính là nội dung mã QR app tạo sẵn
  for (const m of hay.matchAll(/(\d{2})\/?(\d{2})\s*K\s?(\d{1,3})\b/g)) {
    const [, dd, mm, seq] = m;
    if (Number(mm) < 1 || Number(mm) > 12) continue;
    const hits = candidates.filter(
      (c) =>
        c.daySeq === Number(seq) &&
        c.flightDate.slice(8, 10) === dd &&
        c.flightDate.slice(5, 7) === mm,
    );
    if (hits.length) return settle(hits, "note", `nội dung ghi "${dd}${mm} k${seq}" (ngày bay + STT)`, entry, hay);
  }

  // 2b. Mã booking nằm trong nội dung (kể cả kèm đuôi .1 .2 của chia bill)
  {
    const hits = candidates.filter((c) => {
      const code = ascii(c.bookingCode);
      return code.length >= 4 && containsToken(hay, code);
    });
    if (hits.length) return settle(hits, "note", "nội dung có mã booking", entry, hay);
  }

  // 2c. SĐT khách — so theo 9 số cuối với từng DÃY SỐ trọn vẹn trong sao kê
  //     (không tìm chuỗi con giữa dãy dài, kẻo số tài khoản/số dư khớp bậy)
  {
    const runs = hay.match(/\d{9,12}/g) ?? [];
    const hits = candidates.filter((c) => {
      const tail = c.phone.replace(/\D/g, "").slice(-9);
      return tail.length === 9 && runs.some((r) => r.endsWith(tail));
    });
    if (hits.length) return settle(hits, "note", "nội dung có SĐT khách", entry, hay);
  }

  // 2d. TÊN khách không dấu — "NGUYEN VAN A chuyen tien". Tên là dấu hiệu
  //     YẾU ("TRAN THI THU" nằm gọn trong "TRAN THI THU HUYEN") nên KHÔNG
  //     bao giờ tự nhận: chỉ khi số tiền cũng trùng số đang chờ thu thì đưa
  //     ra GỢI Ý đặt cạnh booking cho kế toán tự quyết.
  {
    const nameHits = candidates.filter((c) => {
      const name = ascii(c.contactName);
      return name.length >= 6 && name.includes(" ") && hay.includes(name);
    });
    const withAmount = dedupeByBooking(nameHits.filter((c) => c.amounts.includes(entry.amount)));
    if (withAmount.length) {
      return {
        status: "suggest",
        hits: withAmount,
        why: "tên trên sao kê GIỐNG tên khách và trùng số tiền — máy không tự nhận, soát tay",
      };
    }
  }

  // ---- 3. SỐ TIỀN — chỉ khi đúng MỘT booking có số này ----
  if (entry.amount > 0) {
    const hits = dedupeByBooking(candidates.filter((c) => c.amounts.includes(entry.amount)));
    if (hits.length === 1) return { status: "matched", level: "amount", hit: hits[0], why: "trùng số tiền (duy nhất)" };
    if (hits.length > 1) return { status: "multi", hits, why: "nhiều booking cùng số tiền" };
  }

  /** Bó tay theo từng khoản — thử nốt xem có phải khách chuyển gộp không. */
  {
    const combo = combinedHint(entry, candidates, hay);
    if (combo) {
      return {
        status: "suggest",
        hits: combo,
        why: `số tiền bằng TỔNG ${combo.length} booking của cùng một khách (${combo
          .map((c) => c.label)
          .join(" + ")}) — khách chuyển gộp, chia tay cho từng booking`,
      };
    }
  }

  return { status: "none" };
}
