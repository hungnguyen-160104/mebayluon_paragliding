// lib/baobay/mail-mime.ts
/**
 * Bóc MỘT LÁ THƯ MIME thô (lấy qua IMAP) thành các phần app cần: người gửi,
 * tiêu đề, và phần thân HTML/chữ đã giải mã đúng bảng mã.
 *
 * Cố ý viết tay tối giản thay vì cài thư viện mail: app chỉ cần đọc thư đặt
 * phòng từ vài OTA quen mặt (thư máy sinh, cấu trúc ổn định), và mỗi phụ
 * thuộc thêm là một rủi ro build trên Vercel. Đủ dùng cho: header gấp dòng,
 * tiêu đề mã hoá RFC2047 (=?UTF-8?B?...?=), thân quoted-printable / base64,
 * thư nhiều phần (multipart) lồng nhau.
 */

/** Giải tiêu đề RFC 2047: "=?UTF-8?B?xxx?=" / "=?utf-8?Q?xxx?=". */
export function decodeMimeWord(raw: string): string {
  return String(raw ?? "").replace(/=\?([^?]+)\?([BQbq])\?([^?]*)\?=/g, (_, charset, enc, data) => {
    try {
      const bytes =
        enc.toUpperCase() === "B"
          ? Buffer.from(data, "base64")
          : Buffer.from(
              data.replace(/_/g, " ").replace(/=([0-9A-Fa-f]{2})/g, (_m: string, h: string) =>
                String.fromCharCode(parseInt(h, 16)),
              ),
              "latin1",
            );
      return bytes.toString(charset.toLowerCase().includes("utf") ? "utf8" : "latin1");
    } catch {
      return data;
    }
  });
}

function decodeQuotedPrintable(body: string): Buffer {
  const joined = body.replace(/=\r?\n/g, "");
  const bytes: number[] = [];
  for (let i = 0; i < joined.length; i++) {
    if (joined[i] === "=" && /[0-9A-Fa-f]{2}/.test(joined.slice(i + 1, i + 3))) {
      bytes.push(parseInt(joined.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(joined.charCodeAt(i) & 0xff);
    }
  }
  return Buffer.from(bytes);
}

type MimePart = { headers: string; body: string };

/** Cắt header/body — thư dùng \r\n nhưng phòng cả thư chỉ có \n. */
function splitHeadersBody(raw: string): MimePart {
  const idx = raw.search(/\r?\n\r?\n/);
  if (idx < 0) return { headers: raw, body: "" };
  return { headers: raw.slice(0, idx), body: raw.slice(idx).replace(/^\r?\n\r?\n/, "") };
}

/** Đọc một header (đã gộp dòng gấp) — trả "" nếu không có. */
export function headerOf(headers: string, name: string): string {
  const unfolded = headers.replace(/\r?\n[ \t]+/g, " ");
  const re = new RegExp(`^${name}\\s*:\\s*(.*)$`, "im");
  return decodeMimeWord(re.exec(unfolded)?.[1]?.trim() ?? "");
}

/** Giải một phần thư theo Content-Transfer-Encoding + charset của chính nó. */
function decodePartBody(headers: string, body: string): string {
  const cte = headerOf(headers, "Content-Transfer-Encoding").toLowerCase();
  const charset = /charset="?([\w-]+)"?/i.exec(headerOf(headers, "Content-Type"))?.[1]?.toLowerCase() ?? "utf-8";
  const enc: BufferEncoding = charset.includes("utf") ? "utf8" : "latin1";
  if (cte.includes("base64")) {
    try {
      return Buffer.from(body.replace(/\s/g, ""), "base64").toString(enc);
    } catch {
      return body;
    }
  }
  if (cte.includes("quoted-printable")) return decodeQuotedPrintable(body).toString(enc);
  return body;
}

/**
 * Tìm phần thân đáng đọc nhất trong thư: ưu tiên text/html (thư OTA là bảng
 * HTML), rồi text/plain. Multipart lồng nhau thì đào xuống theo boundary.
 */
function extractBody(headers: string, body: string, depth = 0): string {
  if (depth > 4) return "";
  const type = headerOf(headers, "Content-Type");
  const boundary = /boundary="?([^";\r\n]+)"?/i.exec(type)?.[1];

  if (boundary && /multipart/i.test(type)) {
    const parts = body
      .split(new RegExp(`--${boundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:--)?`))
      .map((p) => p.trim())
      .filter(Boolean);
    let html = "";
    let plain = "";
    for (const part of parts) {
      const sub = splitHeadersBody(part);
      const subType = headerOf(sub.headers, "Content-Type");
      if (/multipart/i.test(subType)) {
        const inner = extractBody(sub.headers, sub.body, depth + 1);
        if (inner && !html) html = inner;
      } else if (/text\/html/i.test(subType) && !html) {
        html = decodePartBody(sub.headers, sub.body);
      } else if (/text\/plain/i.test(subType) && !plain) {
        plain = decodePartBody(sub.headers, sub.body);
      }
    }
    return html || plain;
  }

  return decodePartBody(headers, body);
}

export type DecodedMail = {
  from: string;
  subject: string;
  date: string;
  messageId: string;
  /** Thân thư đã giải mã (HTML hoặc chữ trơn tuỳ thư). */
  body: string;
};

export function decodeMail(raw: string): DecodedMail {
  const { headers, body } = splitHeadersBody(String(raw ?? ""));
  return {
    from: headerOf(headers, "From"),
    subject: headerOf(headers, "Subject"),
    date: headerOf(headers, "Date"),
    messageId: headerOf(headers, "Message-ID").replace(/[<>]/g, ""),
    body: extractBody(headers, body),
  };
}
