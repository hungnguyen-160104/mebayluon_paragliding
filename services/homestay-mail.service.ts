// services/homestay-mail.service.ts
/**
 * LẤY THƯ ĐẶT PHÒNG homestay từ hộp mebayluon@gmail.com qua IMAP.
 *
 * Vì sao đọc thẳng IMAP thay vì Apps Script như thư OTA bay: thư bay đã có
 * sẵn đường ống (Gmail script đẩy về /api/baocao/ota/inbound), còn phòng thì
 * chưa có gì — đọc IMAP bằng chính mật khẩu ứng dụng EMAIL_USER/EMAIL_PASS
 * (đã dùng gửi SMTP) thì không phải cài thêm script nào bên Gmail, bấm nút
 * trong app là chạy.
 *
 * Máy khách IMAP viết tay TỐI GIẢN (LOGIN → EXAMINE → UID SEARCH → UID FETCH):
 * npm cache máy này hỏng không cài thêm được thư viện, và bốn lệnh này là tất
 * cả những gì cần — thư OTA là thư máy sinh, không có ca lắt léo. EXAMINE
 * (chỉ đọc) thay vì SELECT để việc quét không đánh dấu "đã đọc" thư của ai.
 */

import tls from "node:tls";

import { todayInVN, shiftDateKey } from "@/lib/baobay/date";
import { decodeMail } from "@/lib/baobay/mail-mime";
import { htmlToText } from "@/lib/baobay/ota-generic";
import { parseHomestayMail } from "@/lib/baobay/homestay-mail";
import { connectDB } from "@/lib/mongodb";
import { HomestayBooking, HomestaySyncState } from "@/models/HomestayBooking.model";
import { BaobayError } from "@/services/baobay.service";

/* ================================================================== */
/* Máy khách IMAP tối giản                                             */
/* ================================================================== */

/** Hạn chờ cho MỘT lệnh IMAP — thư to nhất mới ~70KB nên 45 giây là rộng rãi. */
const IMAP_CMD_TIMEOUT_MS = 45_000;

class ImapLite {
  private sock!: tls.TLSSocket;
  private buf = "";
  private seq = 0;
  private waiters: Array<{ tag: string; resolve: (lines: string) => void; reject: (e: Error) => void }> = [];
  /**
   * Kết nối đã chết (quá giờ, lỗi, bị đóng). Trước đây không có cờ này: sau
   * lần lỗi đầu, mọi lệnh sau vẫn ghi vào socket đã hỏng rồi CHỜ MÃI KHÔNG
   * AI TRẢ LỜI — cả lần quét treo vĩnh viễn và mốc quét không bao giờ được
   * lưu. Nay chết là mọi lệnh sau trả lỗi ngay để vòng quét thoát ra.
   */
  private dead: Error | null = null;

  async connect(host: string, user: string, pass: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.sock = tls.connect({ host, port: 993, servername: host }, () => resolve());
      this.sock.setTimeout(30_000, () => {
        this.failAll(new Error("IMAP quá giờ chờ"));
        this.sock.destroy();
      });
      this.sock.on("error", reject);
    });
    // ĐỌC THEO latin1 (1 byte = 1 ký tự), KHÔNG phải utf8: IMAP khai độ dài
    // literal bằng SỐ BYTE, còn chuỗi utf8 gộp nhiều byte thành một ký tự nên
    // độ dài lệch — thư có dấu tiếng Việt là bộ đọc chờ phần không bao giờ
    // tới và treo vĩnh viễn. Giữ nguyên byte cũng đúng ý bộ giải mã MIME
    // (mail-mime dùng charCodeAt & 0xff), phần chữ được đổi bảng mã sau theo
    // charset khai trong chính lá thư.
    this.sock.on("data", (d: Buffer) => this.onData(d.toString("latin1")));
    this.sock.on("error", (e) => this.failAll(e));
    this.sock.on("close", () => this.failAll(new Error("IMAP đóng kết nối")));
    // Chờ dòng chào "* OK" rồi mới đăng nhập
    await this.waitUntagged();
    await this.cmd(`LOGIN ${JSON.stringify(user)} ${JSON.stringify(pass)}`);
  }

  private failAll(e: Error) {
    this.dead = e;
    for (const w of this.waiters.splice(0)) w.reject(e);
  }

  private greeting?: () => void;
  private waitUntagged(): Promise<void> {
    return new Promise((resolve) => {
      if (/^\* (OK|PREAUTH)/m.test(this.buf)) return resolve();
      this.greeting = () => resolve();
    });
  }

  private onData(chunk: string) {
    this.buf += chunk;
    if (this.greeting && /^\* (OK|PREAUTH)/m.test(this.buf)) {
      this.greeting();
      this.greeting = undefined;
    }
    const w = this.waiters[0];
    if (!w) return;
    /**
     * Câu trả lời kết thúc khi thấy dòng "<tag> OK/NO/BAD ..." Ở NGOÀI literal.
     * Literal ({1234}\r\n + đúng 1234 byte) có thể chứa chữ giống tag — phải
     * đếm byte bỏ qua, không tin regex trần trên cả khối.
     */
    let i = 0;
    const s = this.buf;
    while (i < s.length) {
      const nl = s.indexOf("\r\n", i);
      if (nl < 0) return; // dòng chưa về đủ
      const line = s.slice(i, nl);
      const lit = /\{(\d+)\}$/.exec(line);
      if (lit) {
        const need = nl + 2 + Number(lit[1]);
        if (s.length < need) return; // literal chưa về đủ
        i = need;
        continue;
      }
      if (line.startsWith(`${w.tag} `)) {
        const all = s.slice(0, nl);
        this.buf = s.slice(nl + 2);
        this.waiters.shift();
        if (/^\S+ OK/.test(line)) w.resolve(all);
        else w.reject(new Error(`IMAP từ chối: ${line.slice(0, 200)}`));
        return;
      }
      i = nl + 2;
    }
  }

  cmd(command: string): Promise<string> {
    if (this.dead) return Promise.reject(this.dead);
    const tag = `A${++this.seq}`;
    return new Promise((resolve, reject) => {
      // Hạn giờ riêng từng lệnh: máy chủ im lặng thì lệnh này hỏng, không kéo
      // theo cả lần quét đứng im.
      const timer = setTimeout(() => {
        const i = this.waiters.findIndex((w) => w.tag === tag);
        if (i >= 0) this.waiters.splice(i, 1);
        reject(new Error(`IMAP quá giờ chờ lệnh ${command.slice(0, 24)}`));
      }, IMAP_CMD_TIMEOUT_MS);
      this.waiters.push({
        tag,
        resolve: (lines) => {
          clearTimeout(timer);
          resolve(lines);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
      this.sock.write(`${tag} ${command}\r\n`);
    });
  }

  end() {
    try {
      this.sock.write(`A${++this.seq} LOGOUT\r\n`);
      this.sock.end();
    } catch {
      /* đóng là được */
    }
  }
}

/** "2026-08-18" -> "18-Aug-2026" (định dạng SINCE của IMAP). */
function imapDate(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1];
  return `${d}-${mon}-${y}`;
}

/** Bóc các mã UID từ trả lời "* SEARCH 1 2 3". */
function uidsOf(res: string): number[] {
  const m = /^\* SEARCH([\d ]*)$/m.exec(res);
  return (m?.[1] ?? "").trim().split(/\s+/).filter(Boolean).map(Number);
}

/** Bóc phần thư thô trong trả lời UID FETCH (literal {n}). */
function literalOf(res: string): string {
  const m = /\{(\d+)\}\r\n/.exec(res);
  if (!m) return "";
  const start = (m.index ?? 0) + m[0].length;
  return res.slice(start, start + Number(m[1]));
}

/* ================================================================== */
/* Quét hộp thư → ghi sổ đặt phòng                                     */
/* ================================================================== */

/** Người gửi đáng quét — thêm nguồn mới thì thêm địa chỉ vào đây. */
const SENDERS = ["agoda.com", "airbnb.com", "booking.com", "trip.com", "traveloka.com", "klook.com"];

const SYNC_KEY = "homestay-mail-sync";

type Mailbox = { user: string; pass: string };

/**
 * CÁC HỘP THƯ được quét: hộp chính (EMAIL_USER/EMAIL_PASS — mebayluon@gmail.com)
 * cộng các hộp khai thêm trong HOMESTAY_MAIL_ACCOUNTS, dạng:
 *
 *   HOMESTAY_MAIL_ACCOUNTS="judyparagliding85@gmail.com:abcd efgh ijkl mnop"
 *
 * (nhiều hộp thì ngăn nhau bằng dấu chấm phẩy; phần sau dấu hai chấm là MẬT
 * KHẨU ỨNG DỤNG Google của hộp đó, khoảng trắng trang trí tự bỏ). Mỗi hộp một
 * mốc UID riêng nên thêm/bớt hộp không làm hộp khác quét lại từ đầu.
 */
function mailboxes(): Mailbox[] {
  const out: Mailbox[] = [];
  const user = (process.env.EMAIL_USER ?? "").trim();
  const pass = (process.env.EMAIL_PASS ?? "").trim().replace(/\s/g, "");
  if (user && pass) out.push({ user, pass });
  for (const entry of (process.env.HOMESTAY_MAIL_ACCOUNTS ?? "").split(";")) {
    const idx = entry.indexOf(":");
    if (idx <= 0) continue;
    const u = entry.slice(0, idx).trim();
    const p = entry.slice(idx + 1).trim().replace(/\s/g, "");
    if (u && p && !out.some((m) => m.user === u)) out.push({ user: u, pass: p });
  }
  return out;
}

/** Mốc UID của một hộp — hộp chính giữ khoá cũ để không quét lại từ đầu. */
function syncKeyOf(user: string): string {
  return user === (process.env.EMAIL_USER ?? "").trim() ? SYNC_KEY : `${SYNC_KEY}:${user}`;
}

export type HomestaySyncResult = {
  scanned: number;
  created: number;
  cancelled: number;
  review: number;
  ignored: number;
  errors: string[];
  lastUid: number;
  /** Số thư còn tồn chưa kịp xử lý trong lượt này — bấm quét tiếp là chạy tiếp. */
  pending: number;
};

/**
 * SỐ THƯ TỐI ĐA MỖI LƯỢT QUÉT.
 *
 * Route chỉ được chạy 60 giây trên Vercel, mỗi thư mất ~0,4–1 giây (tải +
 * bóc + ghi sổ). Hộp mới có thể tồn cả trăm thư, ôm hết là chắc chắn quá
 * giờ — mà trước đây mốc quét chỉ lưu SAU KHI xong cả hộp, nên quá giờ là
 * mất sạch tiến độ và lần bấm sau lại làm lại từ đầu: bấm mãi không bao giờ
 * xong. Nay chia nhỏ, mỗi lượt ăn một khúc và mốc lưu ngay từng thư.
 */
const MAX_PER_RUN = 25;

/**
 * Quét thư mới trên MỌI hộp đã khai và ghi vào sổ đặt phòng. Chống trùng:
 *  - Mỗi hộp một mốc UID riêng — chỉ lấy thư mới hơn lần quét trước.
 *  - `gmailId` ("imap:<hộp>:<uid>") là khoá duy nhất trong bảng.
 * Hộp lần đầu chưa có mốc thì quét lùi `days` ngày (mặc định 60).
 */
export async function syncHomestayMail(days = 60): Promise<HomestaySyncResult> {
  const boxes = mailboxes();
  if (!boxes.length) throw new BaobayError("Chưa khai EMAIL_USER / EMAIL_PASS trên máy chủ", 503);

  await connectDB();
  const out: HomestaySyncResult = {
    scanned: 0,
    created: 0,
    cancelled: 0,
    review: 0,
    ignored: 0,
    errors: [],
    lastUid: 0,
    pending: 0,
  };

  for (const box of boxes) {
    try {
      await syncOneMailbox(box, days, out);
    } catch (err) {
      // Một hộp hỏng (đổi mật khẩu, chưa bật IMAP…) không được chặn hộp còn lại
      out.errors.push(`Hộp ${box.user}: ${err instanceof Error ? err.message : "không kết nối được"}`);
    }
  }
  return out;
}

/** Quét MỘT hộp thư, cộng dồn kết quả vào `out`; mốc UID riêng từng hộp. */
async function syncOneMailbox(box: Mailbox, days: number, out: HomestaySyncResult): Promise<void> {
  const key = syncKeyOf(box.user);
  const state = await HomestaySyncState.findOne({ key }).lean<any>();
  const sinceUid = Number(state?.lastUid) || 0;
  let lastUid = sinceUid;

  const imap = new ImapLite();
  await imap.connect("imap.gmail.com", box.user, box.pass);
  try {
    await imap.cmd("EXAMINE INBOX");

    /** UID cần đọc: mỗi người gửi một lệnh tìm — IMAP OR lồng nhau khó đọc hơn nhiều. */
    const uids = new Set<number>();
    for (const sender of SENDERS) {
      const q = sinceUid > 0 ? `UID ${sinceUid + 1}:*` : `SINCE ${imapDate(shiftDateKey(todayInVN(), -days))}`;
      const res = await imap.cmd(`UID SEARCH ${q} FROM ${JSON.stringify(sender)}`);
      for (const u of uidsOf(res)) if (u > sinceUid) uids.add(u);
    }

    const queue = [...uids].sort((a, b) => a - b);
    const batch = queue.slice(0, MAX_PER_RUN);
    out.pending += queue.length - batch.length;

    for (const uid of batch) {
      out.scanned++;
      try {
        // BODY.PEEK: đọc mà không đánh dấu thư "đã đọc" của người trực hộp
        const raw = literalOf(await imap.cmd(`UID FETCH ${uid} (BODY.PEEK[])`));
        if (!raw) throw new Error("thư rỗng");
        const mail = decodeMail(raw);
        const r = await ingestHomestayMail({ gmailId: `imap:${box.user}:${uid}`, ...mail });
        out[r.action === "created" ? "created" : r.action === "cancelled" ? "cancelled" : r.action === "review" ? "review" : "ignored"]++;
      } catch (err) {
        out.errors.push(`${box.user} UID ${uid}: ${err instanceof Error ? err.message : "lỗi lạ"}`);
        // Kết nối chết thì mọi thư sau cũng hỏng — dừng hộp này, giữ tiến độ
        // đã lưu, để lượt bấm sau chạy tiếp từ đúng chỗ dừng.
        if (err instanceof Error && /quá giờ|đóng kết nối|ECONN|socket/i.test(err.message)) {
          out.pending += batch.length - batch.indexOf(uid) - 1;
          break;
        }
      }
      // LƯU MỐC NGAY TỪNG THƯ: hết giờ giữa chừng cũng không mất tiến độ.
      lastUid = Math.max(lastUid, uid);
      await HomestaySyncState.updateOne(
        { key },
        { $set: { lastUid, lastRunAt: new Date() } },
        { upsert: true },
      );
    }
  } finally {
    imap.end();
  }

  await HomestaySyncState.updateOne(
    { key },
    { $set: { lastUid, lastRunAt: new Date() } },
    { upsert: true },
  );
  out.lastUid = Math.max(out.lastUid, lastUid);
}

/**
 * Ghi MỘT lá thư vào sổ. Tách khỏi vòng quét để thử được không cần IMAP,
 * và để sau này nếu chuyển sang Apps Script đẩy thư về thì gọi thẳng vào đây.
 */
export async function ingestHomestayMail(input: {
  gmailId: string;
  from: string;
  subject: string;
  body: string;
}): Promise<{ action: "created" | "cancelled" | "review" | "ignored" | "duplicate" }> {
  await connectDB();

  const seen = await HomestayBooking.findOne({ gmailId: input.gmailId }).select("_id").lean();
  if (seen) return { action: "duplicate" };

  const d = parseHomestayMail(input);
  if (d.kind === "ignore") return { action: "ignored" };

  if (d.kind === "cancel") {
    /** Thư huỷ: tìm booking theo mã bên nguồn. Không thấy thì vào khay soát — không được im. */
    const hit = d.ref
      ? await HomestayBooking.findOneAndUpdate(
          { source: d.source, ref: d.ref, status: { $ne: "cancelled" } },
          { $set: { status: "cancelled", cancelledAt: new Date(), cancelledBy: "thư " + d.source } },
        ).lean()
      : null;
    if (hit) return { action: "cancelled" };
    await HomestayBooking.create({
      ...draftFields(d),
      gmailId: input.gmailId,
      status: "review",
      reviewReason: `Thư huỷ ${d.source} #${d.ref || "?"} nhưng không thấy booking gốc trong sổ`,
      raw: trimRaw(input),
    });
    return { action: "review" };
  }

  /**
   * CHỐNG TRÙNG với sổ đã có — bảng tính cũ đã nạp khá nhiều booking Agoda/
   * Airbnb bằng tay, và cùng một voucher có thể về HAI hộp thư:
   *  1. Cùng MÃ ĐƠN (ref) đã có bản ghi → thư này là bản sao, bỏ qua.
   *  2. Cùng NGÀY Ở + TÊN na ná bản ghi đã có (nhập tay/bảng tính không mã)
   *     → KHÔNG tự vào lịch (kẻo giữ phòng đôi lần) mà nằm khay soát để kế
   *     toán tự quyết giữ bản nào.
   */
  if (d.kind === "new") {
    if (d.ref) {
      const byRef = await HomestayBooking.findOne({ ref: d.ref, status: { $ne: "cancelled" } })
        .select("_id")
        .lean();
      if (byRef) return { action: "duplicate" };
    }
    if (d.checkIn && d.checkOut) {
      const norm = (x: string) =>
        String(x ?? "")
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .replace(/đ/g, "d")
          .replace(/Đ/g, "D")
          .toLowerCase()
          .replace(/[^a-z0-9 ]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      const sameStay = await HomestayBooking.find({
        status: "confirmed",
        checkIn: d.checkIn,
        checkOut: d.checkOut,
      })
        .select("guestName roomTypeId source")
        .lean<any[]>();
      const mine = norm(d.guestName);
      const twin = sameStay.find((x) => {
        const other = norm(x.guestName);
        return mine.length >= 4 && other.length >= 4 && (other.includes(mine) || mine.includes(other));
      });
      if (twin) {
        await HomestayBooking.create({
          ...draftFields(d),
          gmailId: input.gmailId,
          status: "review",
          reviewReason: `Nghi TRÙNG với bản ghi sẵn có "${twin.guestName}" (${twin.source}) cùng ngày ở — giữ một bản thôi`,
          raw: trimRaw(input),
        });
        return { action: "review" };
      }
    }
  }

  await HomestayBooking.create({
    ...draftFields(d),
    gmailId: input.gmailId,
    status: d.kind === "review" ? "review" : "confirmed",
    reviewReason: d.reviewReason,
    raw: d.kind === "review" ? trimRaw(input) : undefined,
  });
  return { action: d.kind === "review" ? "review" : "created" };
}

function draftFields(d: ReturnType<typeof parseHomestayMail>) {
  return {
    source: d.source,
    ref: d.ref,
    guestName: d.guestName,
    country: d.country,
    roomTypeId: d.roomTypeId,
    roomLabel: d.roomLabel,
    rooms: d.rooms,
    adults: d.adults,
    children: d.children,
    checkIn: d.checkIn,
    checkOut: d.checkOut,
    amount: d.amount,
    netAmount: d.netAmount,
    prepaid: d.prepaid,
    // OTA trả trước: tại nhà không thu; nguồn lạ thì người soát tự điền
    collect: d.prepaid ? 0 : d.amount,
    note: d.note,
  };
}

/** Trích thư gốc cho người soát đọc — cắt gọn kẻo bảng phình vô ích. */
function trimRaw(input: { subject: string; body: string }): string {
  return `${input.subject}\n\n${htmlToText(input.body)}`.slice(0, 4000);
}
