// lib/baobay/ai-bank-match.ts
/**
 * NHỜ AI ĐỌC SAO KÊ khi bộ luật cứng chịu thua.
 *
 * Bộ dò ở lib/baobay/bank-check.ts chạy bằng luật: trùng mã GD, trùng chuỗi
 * "2508 k3", trùng SĐT, trùng số tiền. Luật bắt rất chắc những gì nó bắt được,
 * nhưng chịu thua đúng chỗ hay xảy ra nhất ngoài đời:
 *
 *  - khách gõ nội dung theo kiểu riêng ("tien bay du luon chi Thao ngay 25"),
 *  - chuyển hộ (chồng chuyển cho vợ, công ty chuyển cho nhân viên),
 *  - lệch ngày: khách cọc hôm nay nhưng lệnh CK lập hôm khác, hoặc nhân viên
 *    bận nên mãi hôm sau mới nhập booking,
 *  - gõ thiếu/thừa một chữ số của mã booking.
 *
 * Ở những ca ấy con người vẫn đoán ra được vì đọc được ngữ cảnh — nên đưa cho
 * mô hình đúng hai danh sách (dòng sao kê treo · khoản đang chờ tiền) rồi bảo nó
 * ghép, kèm MỨC CHẮC CHẮN.
 *
 * BA LUẬT AN TOÀN, không được nới:
 *  1. Hàm này KHÔNG ghi gì vào cơ sở dữ liệu. Nó chỉ trả ĐỀ XUẤT; ghi hay không
 *     là do kế toán bấm. Tiền của khách không bao giờ đổi chủ vì một câu trả
 *     lời của mô hình.
 *  2. Không chắc thì phải nói "khong-biet". Prompt ép rõ: thà bỏ sót còn hơn
 *     ghép nhầm — ghép nhầm là mất dấu tiền của CẢ HAI khách.
 *  3. Mô hình chỉ được chọn trong danh sách `refId` gửi sang; refId lạ bị loại
 *     ngay ở hàm này, không tin lời mô hình.
 */

const API_URL = "https://api.anthropic.com/v1/messages";

/**
 * Dùng đúng mô hình mạnh nhất: đây là việc soi tiền, sai một khoản là kế toán
 * mất buổi đi truy. Muốn hạ cấp cho rẻ thì đặt biến môi trường, đừng sửa mã.
 */
const MODEL = process.env.BANK_AI_MODEL || "claude-opus-5";

/** Một dòng sao kê chưa tìm được chủ. */
export type AiBankLine = {
  id: string;
  /** Nguyên văn dòng sao kê (đã gọt phần vô nghĩa). */
  raw: string;
  amount: number;
  /** Ngày/giờ trên sao kê — có thể lệch ngày lập booking. */
  bankDate: string;
  bankTime: string;
};

/** Một khoản đang chờ tiền về (lệnh thu CK, cọc gõ tay, hoặc số còn thu). */
export type AiBankCandidate = {
  refId: string;
  kind: "collect" | "deposit" | "remaining";
  /** Số thứ tự khách trong ngày bay — con số đỏ trên mọi bảng. */
  daySeq: number;
  contactName: string;
  phone: string;
  bookingCode: string;
  flightDate: string;
  /** Ngày LẬP booking — khách hay chuyển cọc ngay hôm đăng ký. */
  createdDate: string;
  spot: string;
  /** Các số tiền khoản này có thể nhận (số đã ghi / còn thu / tổng tiền). */
  amounts: number[];
  /** Mã giao dịch nhân viên đã ghi (nếu có). */
  code: string;
};

export type AiConfidence = "chac-chan" | "co-the" | "khong-biet";

export type AiBankProposal = {
  lineId: string;
  /** refId trong danh sách đã gửi; rỗng = mô hình chịu, để người soát. */
  refId: string;
  confidence: AiConfidence;
  /** Lý do bằng tiếng Việt, cho kế toán đọc rồi tự quyết. */
  why: string;
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["matches"],
  properties: {
    matches: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["lineId", "refId", "confidence", "why"],
        properties: {
          lineId: { type: "string" },
          refId: { type: "string" },
          confidence: { type: "string", enum: ["chac-chan", "co-the", "khong-biet"] },
          why: { type: "string" },
        },
      },
    },
  },
} as const;

const SYSTEM = `Bạn là kế toán đối soát chuyển khoản của một công ty dù lượn Việt Nam.

Việc của bạn: ghép mỗi DÒNG SAO KÊ ngân hàng với đúng MỘT KHOẢN đang chờ tiền về.

Bối cảnh nghiệp vụ — đọc kỹ, đây là chỗ luật máy hay sai:
- Nội dung chuyển khoản chuẩn do app in ra mã QR là "ddmm kN MABOOKING", ví dụ
  "2508 k3 KLK123" = bay ngày 25/08, khách số 3 trong ngày, mã booking KLK123.
  Khách gõ tay thì hay rơi rụng: mất chữ "k", viết "25/08", chỉ còn mã, hoặc
  chẳng gõ gì ngoài tên mình.
- NGÀY TRÊN SAO KÊ THƯỜNG KHÁC ngày bay và khác ngày lập booking. Khách cọc
  trước cả tuần, hoặc chuyển xong mấy hôm sau nhân viên mới nhập booking. Vì
  vậy lệch ngày KHÔNG phải lý do để loại một khoản.
- Ngân hàng tự điền tên chủ tài khoản người gửi (không dấu, viết hoa). Tên đó
  có thể là người CHUYỂN HỘ (chồng/vợ/bạn/công ty), không nhất thiết trùng tên
  khách bay.
- Khách trả nhiều lần thì nhân viên tách booking thành nhiều khoản riêng, mỗi
  khoản một số tiền và một mã QR có đuôi ".1" ".2". Một dòng sao kê chỉ thuộc
  MỘT khoản.
- Tên Việt lồng nhau rất nguy hiểm: "TRAN THI THU" nằm gọn trong "TRAN THI THU
  HUYEN". Chỉ trùng tên thì cao nhất là "co-the", không bao giờ "chac-chan".

Mức chắc chắn:
- "chac-chan": có dấu hiệu ĐỊNH DANH không thể trùng ngẫu nhiên (mã booking,
  chuỗi ddmm+kN, số điện thoại khách, mã giao dịch đã ghi) VÀ số tiền khớp với
  một trong các số của khoản đó.
- "co-the": có căn cứ nhưng còn đường hiểu khác (chỉ trùng tên, chỉ trùng số
  tiền, mã gõ thiếu một ký tự…).
- "khong-biet": không đủ căn cứ. refId để chuỗi rỗng.

LUẬT TỐI THƯỢNG: thà bỏ sót còn hơn ghép nhầm. Ghép nhầm là tiền của khách này
bị ghi sang sổ của khách kia, mất dấu cả hai. Phân vân giữa hai khoản thì chọn
"khong-biet", đừng chọn bừa một cái.

Ràng buộc:
- refId PHẢI là một giá trị có trong danh sách khoản được gửi. Không được bịa.
- Mỗi dòng sao kê chỉ ra MỘT kết quả; mỗi khoản chỉ nên nhận MỘT dòng.
- Trả lời đủ mọi lineId được gửi, kể cả những dòng bạn chịu.
- "why" viết tiếng Việt, một câu ngắn, nói rõ căn cứ (ví dụ: "nội dung có mã
  KLK123 và đúng số tiền 2.590.000").`;

function buildUserContent(lines: AiBankLine[], candidates: AiBankCandidate[]): string {
  const vnd = (n: number) => n.toLocaleString("vi-VN");
  const lineText = lines
    .map(
      (l) =>
        `- lineId=${l.id} | tiền vào ${vnd(l.amount)}đ | trên sao kê ${l.bankDate || "?"} ${l.bankTime || ""}\n  nội dung: ${l.raw}`,
    )
    .join("\n");
  const candText = candidates
    .map((c) => {
      const kind =
        c.kind === "collect" ? "lệnh thu CK đã ghi" : c.kind === "deposit" ? "cọc gõ tay" : "số còn phải thu";
      return [
        `- refId=${c.refId} | ${kind}`,
        `  khách #${c.daySeq || "?"} ${c.contactName || "(không tên)"} | SĐT ${c.phone || "(không có)"} | mã booking ${c.bookingCode || "(chưa có)"}`,
        `  bay ${c.flightDate || "?"} | lập booking ${c.createdDate || "?"} | điểm ${c.spot}`,
        `  số tiền có thể nhận: ${c.amounts.map(vnd).join(" hoặc ")}đ${c.code ? ` | mã GD nhân viên ghi: ${c.code}` : ""}`,
      ].join("\n");
    })
    .join("\n");

  return [
    `===== ${lines.length} DÒNG SAO KÊ CHƯA TÌM ĐƯỢC CHỦ =====`,
    lineText,
    "",
    `===== ${candidates.length} KHOẢN ĐANG CHỜ TIỀN VỀ =====`,
    candText,
    "",
    "Ghép từng dòng sao kê với đúng một khoản. Không chắc thì để refId rỗng và confidence là khong-biet.",
  ].join("\n");
}

/** Bóc phần chữ của câu trả lời — có khối suy nghĩ thì phải bỏ qua nó. */
function textOf(json: any): string {
  const blocks = Array.isArray(json?.content) ? json.content : [];
  return blocks
    .filter((b: any) => b?.type === "text")
    .map((b: any) => String(b.text ?? ""))
    .join("")
    .trim();
}

/** Mô hình lỡ bọc JSON trong ```json … ``` hay thêm lời dẫn thì vẫn đọc ra. */
function parseJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

async function callAnthropic(body: Record<string, unknown>): Promise<any> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": process.env.ANTHROPIC_API_KEY || "",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const err = new Error(`Anthropic ${res.status}: ${detail.slice(0, 300)}`);
    (err as any).status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * Gọi mô hình và trả về đề xuất ĐÃ LỌC: chỉ giữ những cặp có lineId và refId
 * đúng là thứ mình gửi đi.
 */
export async function askAiBankMatch(
  lines: AiBankLine[],
  candidates: AiBankCandidate[],
): Promise<AiBankProposal[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Chưa cấu hình ANTHROPIC_API_KEY — không gọi được AI đối soát");
  }
  if (!lines.length || !candidates.length) return [];

  const base = {
    model: MODEL,
    max_tokens: 16000,
    system: [
      // Phần luật không đổi giữa các lần bấm — đánh dấu cache cho rẻ
      { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: buildUserContent(lines, candidates) }],
  };

  let json: any;
  try {
    json = await callAnthropic({
      ...base,
      thinking: { type: "adaptive" },
      output_config: { effort: "high", format: { type: "json_schema", schema: SCHEMA } },
    });
  } catch (err) {
    /**
     * Máy chủ từ chối tham số định dạng (đổi đời API, hoặc mô hình được cấu
     * hình lại) thì vẫn phải soát được: hỏi lại kiểu thường rồi tự bóc JSON.
     * Đối soát không được chết chỉ vì một tham số.
     */
    if ((err as any)?.status !== 400) throw err;
    console.error("[ai-bank-match] output_config bị từ chối, hỏi lại kiểu thường:", (err as Error).message);
    json = await callAnthropic({
      ...base,
      messages: [
        {
          role: "user",
          content: `${buildUserContent(lines, candidates)}\n\nTrả lời DUY NHẤT một khối JSON dạng {"matches":[{"lineId":"…","refId":"…","confidence":"chac-chan|co-the|khong-biet","why":"…"}]}, không thêm lời nào khác.`,
        },
      ],
    });
  }

  const parsed = parseJson(textOf(json));
  const rows = Array.isArray(parsed?.matches) ? parsed.matches : [];

  const lineIds = new Set(lines.map((l) => l.id));
  const refIds = new Set(candidates.map((c) => c.refId));
  const seenLine = new Set<string>();

  const out: AiBankProposal[] = [];
  for (const r of rows) {
    const lineId = String(r?.lineId ?? "");
    if (!lineIds.has(lineId) || seenLine.has(lineId)) continue;
    const refId = String(r?.refId ?? "");
    const confidence: AiConfidence =
      r?.confidence === "chac-chan" ? "chac-chan" : r?.confidence === "co-the" ? "co-the" : "khong-biet";
    // Chỉ ra tên khoản thì không đủ — refId lạ nghĩa là mô hình bịa, bỏ
    const okRef = refId && refIds.has(refId);
    seenLine.add(lineId);
    out.push({
      lineId,
      refId: okRef ? refId : "",
      confidence: okRef ? confidence : "khong-biet",
      why: String(r?.why ?? "").slice(0, 300),
    });
  }
  return out;
}
