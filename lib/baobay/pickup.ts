// lib/baobay/pickup.ts

/**
 * ĐIỂM ĐÓN VIẾT GỌN — một nơi quyết định, mọi chỗ dùng chung.
 *
 * Khách đặt qua Klook (và trên web) chọn "đến thẳng điểm bay" thì ô điểm đón
 * nhận nguyên cái tên dài của bãi, có khi còn bị nhà cung cấp cắt cụt giữa
 * chừng:
 *
 *   "Điểm bay dù lượn Mebayluon Paragliding (CTCP Du lịch &"
 *
 * Trên sổ và trên vé thì câu đó vô nghĩa — ai cũng biết bãi ở đâu, mà nó ngốn
 * cả một cột, in ra vé thì tràn dòng. Điều người trực và khách cần biết chỉ là:
 * khách này KHÔNG cần xe đón. Nên rút về "Tự đến".
 *
 * Chỉ rút khi chắc chắn đó là TÊN BÃI (có "điểm bay" kèm tên công ty/thương
 * hiệu). Một khách sạn tên "Điểm Bay Homestay" thì giữ nguyên — đoán sai ở đây
 * là xe không tới đón khách, lỗi nặng hơn nhiều so với một ô chữ dài.
 *
 * "Clubhouse Mebayluon Paragliding" thì KHÁC HẲN: đó là chỗ đón THẬT, xe phải
 * tới đó, nên không được rút thành "tự đến" — chỉ viết ngắn lại cho vừa ô.
 */

const TEN_BAI = /(điểm bay|diem bay)/i;
const TEN_HANG = /(mebayluon|paragliding|ctcp|cổ phần|co phan|du lịch|du lich)/i;
/** Nhà chung của công ty — khách hay hẹn đón ở đây, tên đầy đủ dài quá ba cột. */
const CLUBHOUSE = /clubhouse/i;

/**
 * HAI NHÃN NGẮN NHẤT CÓ THỂ (chủ chốt 11/09).
 *
 * Cột điểm đón trong sổ chỉ rộng chừng hai chữ, mà chuỗi OTA đẩy sang thì dài
 * cả dòng. Chủ chốt: "Điểm bay dù lượn Mebayluon Paragliding (CTCP Du lịch &…"
 * rút thành **"Tự đến"**, "Clubhouse Mebayluon Paragliding" rút thành
 * **"Clubhouse"** — người trực đọc hai chữ ấy là đủ biết có phải cho xe đi
 * đón hay không, phần tên công ty chẳng nói thêm gì.
 */
export const TU_DEN = "Tự đến";
export const CLUBHOUSE_NGAN = "Clubhouse";

/**
 * NHỮNG CHỖ ĐÓN HAY GẶP, và tên gọn của chúng trong sổ.
 *
 * Chỗ khách đặt qua OTA gửi sang thường là cả một câu chỉ đường viết cho người
 * lạ: "Sun Plaza Sapa Entrance - in Sapa center" (143 booking đang có). Người
 * ngoài đọc thì cần chừng ấy chữ, nhưng điều phối ở Sa Pa chỉ cần hai chữ là
 * biết đứng đâu — và cột điểm đón chỉ rộng chừng ấy.
 *
 * Bảng ánh xạ chứ không đoán bằng luật: đoán thì sớm muộn cũng cắt nhầm một
 * cái tên khách sạn nào đó, mà cắt nhầm là xe tới sai chỗ. Gặp chỗ mới hay
 * dùng thì thêm một dòng vào đây.
 */
const RUT_GON: Array<[RegExp, string]> = [[/sun\s*plaza/i, "Sun Plaza"]];

/** "Khách sạn Mường Thanh" → "KS Mường Thanh"; giữ nguyên phần tên. */
function vietTatKhachSan(ten: string): string {
  return ten.replace(/\b(khách\s*sạn|khach\s*san)\b/gi, "KS").replace(/\s{2,}/g, " ").trim();
}

export function shortPickup(text: unknown): string {
  const raw = String(text ?? "").trim();
  if (!raw) return "";
  /**
   * Xét Clubhouse TRƯỚC tên bãi: "Clubhouse Mebayluon Paragliding" khớp cả hai
   * mẫu (có "paragliding", có tên hãng), mà nghĩa thì ngược nhau — một bên là
   * khách tự đi, một bên là xe phải tới đón. Xét sau thì mỗi khách hẹn ở
   * Clubhouse đều bị đánh dấu "tự đến" và không ai ra đón.
   */
  if (CLUBHOUSE.test(raw)) return CLUBHOUSE_NGAN;
  if (TEN_BAI.test(raw) && TEN_HANG.test(raw)) return TU_DEN;
  for (const [mau, ngan] of RUT_GON) if (mau.test(raw)) return ngan;
  /**
   * Chỗ chưa có trong bảng: bỏ phần trong ngoặc và phần chỉ đường sau dấu gạch
   * ("Khách sạn X - đối diện chợ" → "Khách sạn X"). Giữ nguyên phần TÊN vì đó
   * là thứ tài xế cần.
   */
  const goiY = raw
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .split(/\s+[-–|]\s+/)[0]
    .trim();
  /**
   * "Khách sạn" → "KS" (chủ 11/09): hai chữ ấy đứng đầu gần như mọi điểm đón
   * mà chẳng phân biệt được gì — cột chỉ rộng chừng 120px, để nguyên thì tên
   * thật bị đẩy ra ngoài. Viết tắt kiểu người trực vẫn viết tay trên sổ.
   */
  return vietTatKhachSan(goiY || raw);
}

/** Chỗ đón này có phải là "khách tự tới bãi" không — để khỏi in thêm chữ "Đón:". */
export function laTuDen(text: unknown): boolean {
  return shortPickup(text) === TU_DEN;
}
