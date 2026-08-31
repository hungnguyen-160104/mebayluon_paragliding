// lib/baobay/ai-id-scan.ts
/**
 * NHỜ AI ĐỌC ẢNH GIẤY TỜ khi hai bộ đọc trong máy đều chịu thua.
 *
 * Đường đọc rẻ chạy trước ngay trong trình duyệt: QR của CCCD gắn chip, rồi
 * dãy MRZ bằng OCR. Nhưng ảnh NGOÀI ĐỜI — khách gửi qua Zalo bị nén, chụp
 * nghiêng, loá đèn, mã QR mờ theo năm tháng — trượt cả hai là chuyện thường,
 * và đó chính là lời phàn nàn "quét từ ảnh rất kém". Mô hình nhìn ảnh đọc
 * được những ca ấy như người đọc.
 *
 * LUẬT AN TOÀN:
 *  1. Chỉ trả về ĐÚNG 5 trường bảo hiểm cần — không bao giờ trả địa chỉ, quê
 *     quán hay bất kỳ thứ gì khác trên thẻ, dù mô hình có đọc được.
 *  2. Prompt ép: không đọc rõ thì nói không đọc được, TUYỆT ĐỐI không đoán
 *     chữ số — số giấy tờ sai một số là hồ sơ bảo hiểm vô giá trị.
 *  3. Kết quả luôn mang cảnh báo "soát lại bằng mắt" — người nhập là người
 *     chốt, không phải mô hình.
 *  4. Ảnh gửi đi chỉ để đọc trong yêu cầu đó, không lưu ở máy chủ mình.
 */
import type { ScannedPerson } from "@/lib/baobay/id-scan";

const API_URL = "https://api.anthropic.com/v1/messages";

/**
 * Mặc định dùng mô hình mạnh nhất: mỗi ngày chỉ vài chục lượt quét mà mỗi
 * trường đọc sai là một hồ sơ bảo hiểm hỏng. Muốn hạ cho rẻ thì đặt biến
 * môi trường, đừng sửa mã.
 */
const MODEL = process.env.ID_SCAN_AI_MODEL || "claude-opus-5";

const SYSTEM = `Bạn là máy đọc giấy tờ tuỳ thân cho một công ty du lịch Việt Nam (phục vụ mua bảo hiểm bay).
Ảnh gửi tới là CCCD/CMND Việt Nam (mặt trước hoặc mặt sau) hoặc hộ chiếu bất kỳ nước nào.

LUẬT SẮT:
- CHỈ đọc những gì NHÌN THẤY RÕ trong ảnh. Ký tự nào mờ/khuất thì coi như không đọc được — TUYỆT ĐỐI không đoán, không suy ra, không bịa. Số giấy tờ sai một chữ số còn tệ hơn không có.
- Không đọc được trường nào thì để trường đó là chuỗi rỗng và ghi một dòng cảnh báo tiếng Việt vào "warnings".
- Ảnh không phải giấy tờ tuỳ thân, hoặc mờ tới mức không đọc nổi số: found=false.
- "birthday" đúng dạng dd/mm/yyyy. "gender" chỉ nhận "Nam", "Nữ" hoặc "".
- "nationality": tên nước bằng tiếng Việt ("Việt Nam", "Anh", "Đức"…).
- "idNumber": CCCD 12 số (CMND cũ 9 số); hộ chiếu thì đúng số in trên trang.
- Họ tên viết HOA có dấu đúng như trên giấy tờ.
- Không trả về bất kỳ thông tin nào khác ngoài các trường của schema — kể cả khi đọc được (địa chỉ, quê quán, ngày cấp… đều KHÔNG).`;

const SCHEMA = {
  type: "object",
  properties: {
    found: { type: "boolean", description: "true khi ảnh đúng là giấy tờ tuỳ thân và đọc được ít nhất họ tên hoặc số" },
    docType: { type: "string", enum: ["cccd", "passport", "khac"] },
    fullName: { type: "string" },
    birthday: { type: "string", description: "dd/mm/yyyy, rỗng nếu không đọc rõ" },
    gender: { type: "string", enum: ["Nam", "Nữ", ""] },
    idNumber: { type: "string" },
    nationality: { type: "string" },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: ["found", "docType", "fullName", "birthday", "gender", "idNumber", "nationality", "warnings"],
  additionalProperties: false,
} as const;

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

function textOf(json: any): string {
  return (json?.content ?? [])
    .filter((b: any) => b?.type === "text")
    .map((b: any) => b.text)
    .join("\n");
}

/** Bóc khối JSON từ câu trả lời kiểu thường (đường lùi khi output_config bị từ chối). */
function looseJson(text: string): any {
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

/** "dd/mm/yyyy" và phải là ngày có thật — mô hình cũng không được miễn soát. */
function validBirthday(v: string): boolean {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  if (!m) return false;
  const [, d, mo, y] = m.map(Number) as unknown as number[];
  return d >= 1 && d <= 31 && mo >= 1 && mo <= 12 && y >= 1900 && y <= new Date().getFullYear();
}

/**
 * Đọc một ảnh giấy tờ. Trả `null` khi ảnh không phải giấy tờ / không đọc nổi
 * — chỗ gọi tự quyết nói gì với người dùng.
 */
export async function askAiIdScan(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp",
): Promise<ScannedPerson | null> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Chưa cấu hình ANTHROPIC_API_KEY — không gọi được AI đọc giấy tờ");
  }

  const base = {
    model: MODEL,
    max_tokens: 2000,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
          { type: "text", text: "Đọc giấy tờ trong ảnh theo đúng luật đã giao." },
        ],
      },
    ],
  };

  let json: any;
  try {
    json = await callAnthropic({
      ...base,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
    });
  } catch (err) {
    // Máy chủ từ chối tham số định dạng thì hỏi kiểu thường rồi tự bóc JSON
    if ((err as any)?.status !== 400) throw err;
    console.error("[ai-id-scan] output_config bị từ chối, hỏi lại kiểu thường:", (err as Error).message);
    json = await callAnthropic({
      ...base,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
            {
              type: "text",
              text: 'Đọc giấy tờ trong ảnh theo đúng luật đã giao. Trả lời DUY NHẤT một khối JSON dạng {"found":true,"docType":"cccd|passport|khac","fullName":"…","birthday":"dd/mm/yyyy","gender":"Nam|Nữ|","idNumber":"…","nationality":"…","warnings":[]}.',
            },
          ],
        },
      ],
    });
  }

  const out = looseJson(textOf(json));
  if (!out || out.found !== true || out.docType === "khac") return null;

  const warnings: string[] = Array.isArray(out.warnings) ? out.warnings.map(String).slice(0, 5) : [];
  const idNumber = String(out.idNumber ?? "").replace(/\s/g, "").toUpperCase();
  const fullName = String(out.fullName ?? "").trim();
  let birthday = String(out.birthday ?? "").trim();

  // Soát lại bằng luật cứng — mô hình nói gì cũng phải qua cửa này
  if (!fullName && !idNumber) return null;
  if (out.docType === "cccd" && idNumber && !/^\d{9}(\d{3})?$/.test(idNumber)) {
    warnings.push(`Số CCCD đọc ra "${idNumber}" không đúng dạng 12 (hoặc 9) chữ số — soát kỹ.`);
  }
  if (out.docType === "passport" && idNumber && !/^[A-Z0-9]{6,10}$/.test(idNumber)) {
    warnings.push(`Số hộ chiếu đọc ra "${idNumber}" trông không đúng dạng — soát kỹ.`);
  }
  if (birthday && !validBirthday(birthday)) {
    warnings.push(`Ngày sinh đọc ra "${birthday}" không phải ngày hợp lệ — bỏ trống, nhập tay.`);
    birthday = "";
  }

  return {
    fullName,
    birthday,
    gender: out.gender === "Nam" || out.gender === "Nữ" ? out.gender : "",
    idNumber,
    nationality: String(out.nationality ?? "").trim(),
    source: out.docType === "passport" ? "passport" : "cccd",
    /** AI đọc ảnh là đường CUỐI — kết quả luôn phải soát bằng mắt. */
    warnings: [...warnings, "AI đọc từ ảnh — soát lại từng trường trước khi lưu."],
  };
}
