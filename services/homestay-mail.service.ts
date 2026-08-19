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

class ImapLite {
  private sock!: tls.TLSSocket;
  private buf = "";
  private seq = 0;
  private waiters: Array<{ tag: string; resolve: (lines: string) => void; reject: (e: Error) => void }> = [];

  async connect(host: string, user: string, pass: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.sock = tls.connect({ host, port: 993, servername: host }, () => resolve());
      this.sock.setTimeout(30_000, () => {
        this.failAll(new Error("IMAP quá giờ chờ"));
        this.sock.destroy();
      });
      this.sock.on("error", reject);
    });
    this.sock.on("data", (d) => this.onData(String(d)));
    this.sock.on("error", (e) => this.failAll(e));
    this.sock.on("close", () => this.failAll(new Error("IMAP đóng kết nối")));
    // Chờ dòng chào "* OK" rồi mới đăng nhập
    await this.waitUntagged();
    await this.cmd(`LOGIN ${JSON.stringify(user)} ${JSON.stringify(pass)}`);
  }

  private failAll(e: Error) {
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
    const tag = `A${++this.seq}`;
    return new Promise((resolve, reject) => {
      this.waiters.push({ tag, resolve, reject });
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

export type HomestaySyncResult = {
  scanned: number;
  created: number;
  cancelled: number;
  review: number;
  ignored: number;
  errors: string[];
  lastUid: number;
};

/**
 * Quét thư mới và ghi vào sổ đặt phòng. Chống trùng hai lớp:
 *  - Chỉ lấy UID LỚN HƠN lần quét trước (mốc lưu trong BaobaySetting).
 *  - `gmailId` (host hộp thư + UID) là khoá duy nhất trong bảng.
 * Lần đầu chưa có mốc thì quét lùi `days` ngày (mặc định 60).
 */
export async function syncHomestayMail(days = 60): Promise<HomestaySyncResult> {
  const user = (process.env.EMAIL_USER ?? "").trim();
  // Mật khẩu ứng dụng Google hay dán kèm khoảng trắng trang trí — bỏ hết
  const pass = (process.env.EMAIL_PASS ?? "").trim().replace(/\s/g, "");
  if (!user || !pass) throw new BaobayError("Chưa khai EMAIL_USER / EMAIL_PASS trên máy chủ", 503);

  await connectDB();
  const state = await HomestaySyncState.findOne({ key: SYNC_KEY }).lean<any>();
  const sinceUid = Number(state?.lastUid) || 0;

  const out: HomestaySyncResult = {
    scanned: 0,
    created: 0,
    cancelled: 0,
    review: 0,
    ignored: 0,
    errors: [],
    lastUid: sinceUid,
  };

  const imap = new ImapLite();
  await imap.connect("imap.gmail.com", user, pass);
  try {
    await imap.cmd("EXAMINE INBOX");

    /** UID cần đọc: mỗi người gửi một lệnh tìm — IMAP OR lồng nhau khó đọc hơn nhiều. */
    const uids = new Set<number>();
    for (const sender of SENDERS) {
      const q = sinceUid > 0 ? `UID ${sinceUid + 1}:*` : `SINCE ${imapDate(shiftDateKey(todayInVN(), -days))}`;
      const res = await imap.cmd(`UID SEARCH ${q} FROM ${JSON.stringify(sender)}`);
      for (const u of uidsOf(res)) if (u > sinceUid) uids.add(u);
    }

    for (const uid of [...uids].sort((a, b) => a - b)) {
      out.scanned++;
      try {
        // BODY.PEEK: đọc mà không đánh dấu thư "đã đọc" của người trực hộp
        const raw = literalOf(await imap.cmd(`UID FETCH ${uid} (BODY.PEEK[])`));
        if (!raw) throw new Error("thư rỗng");
        const mail = decodeMail(raw);
        const r = await ingestHomestayMail({ gmailId: `imap:${user}:${uid}`, ...mail });
        out[r.action === "created" ? "created" : r.action === "cancelled" ? "cancelled" : r.action === "review" ? "review" : "ignored"]++;
      } catch (err) {
        out.errors.push(`UID ${uid}: ${err instanceof Error ? err.message : "lỗi lạ"}`);
      }
      out.lastUid = Math.max(out.lastUid, uid);
    }
  } finally {
    imap.end();
  }

  await HomestaySyncState.updateOne(
    { key: SYNC_KEY },
    { $set: { lastUid: out.lastUid, lastRunAt: new Date() } },
    { upsert: true },
  );
  return out;
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
