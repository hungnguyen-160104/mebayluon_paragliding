// lib/pilot-sheet.ts
/**
 * Đẩy một lượt đăng ký của phi công sang bảng Google Sheets theo dõi.
 *
 * Dùng Apps Script webhook thay vì Google Sheets API: không phải bật API,
 * không phải tạo service account rồi giữ file khoá JSON trong biến môi
 * trường, và ban tổ chức muốn đổi bảng thì chỉ deploy lại script. Xem
 * docs/pilot-sheet-apps-script.md để lấy đoạn script và cách deploy.
 *
 * Lỗi ở đây KHÔNG được làm hỏng việc đăng ký: đơn đã nằm trong cơ sở dữ liệu,
 * bảng tính chỉ là bản sao cho tiện theo dõi.
 */

import { parseAdminEmails } from "@/lib/mailer";
import { PILOT_ADMIN_EMAIL_DEFAULT } from "@/lib/pilot-event";

/**
 * Hộp thư nội bộ nhận đơn phi công. Ưu tiên biến môi trường, không có thì
 * dùng địa chỉ mặc định trong lib/pilot-event.ts.
 */
export function pilotAdminRecipients(): string[] {
  const raw = process.env.PILOT_ADMIN_EMAILS;
  const list = parseAdminEmails(raw);
  /**
   * Hộp CHỦ luôn có mặt trong danh sách nhận.
   *
   * Sự cố thật (30/08/2026): 22 phi công ký miễn trừ, thư BTC đều về
   * dangky.mebayluon@gmail.com theo mặc định — chủ mở mebayluon@gmail.com
   * không thấy thư nào, tưởng hệ thống chết. Thư nghiệp vụ sự kiện có thể
   * đổi hộp bằng PILOT_ADMIN_EMAILS, nhưng chủ thì phải thấy bất kể cấu hình.
   */
  const out = list.length ? list : [PILOT_ADMIN_EMAIL_DEFAULT];
  if (!out.includes("mebayluon@gmail.com")) out.push("mebayluon@gmail.com");
  return out;
}

export type PilotSheetRow = {
  code: string;
  createdAt: string;
  fullName: string;
  idNumber: string;
  nationality: string;
  phone: string;
  /** SĐT khẩn cấp — cột mới, script sheet tự báo missingColumns nếu bảng chưa có. */
  emergencyPhone?: string;
  /** "Tên — SĐT" phi công/HLV local hỗ trợ. */
  supportPilot?: string;
  email: string;
  address: string;
  club: string;
  flyingKind: string;
  motorType: string;
  wingClass: string;
  period: string;
  dates: string;
  dayCount: number;
  companionCount: number;
  siteFeeMode: string;
  feeDetail: string;
  feeTotal: number;
  specialRequest: string;
  /** Cỡ áo sự kiện — rỗng nếu không phải đợt Mùa Vàng. */
  shirtSize: string;
  /** "CÓ" nếu phi công nhận bay PPG kéo cờ khai mạc. */
  flagFlight: string;
};

export async function pushPilotRowToSheet(
  row: PilotSheetRow,
): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.PILOT_SHEET_WEBHOOK_URL;
  if (!url) return { ok: false, error: "Chưa cấu hình PILOT_SHEET_WEBHOOK_URL" };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: process.env.PILOT_SHEET_SECRET || "",
        row,
      }),
      // Apps Script hay chậm; quá 15 giây thì bỏ, đừng bắt phi công chờ.
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }

    /**
     * PHẢI đọc nội dung trả về, không được chỉ nhìn mã HTTP.
     *
     * Apps Script luôn đáp 200 kể cả khi script bên trong hỏng — nó gói lỗi
     * vào phần thân dạng {"ok":false,"error":...}. Trước đây hàm này thấy 200
     * là báo thành công, nên có lúc bảng tính không nhận được dòng nào mà bản
     * ghi vẫn ghi `sheetSynced: true` — hỏng mà không ai biết.
     *
     * `missingColumns` là các cột script biết mà bảng chưa có; ghi lại vào
     * nhật ký để còn biết đường thêm tiêu đề.
     */
    const text = await res.text();
    let body: { ok?: boolean; error?: string; missingColumns?: string[] };
    try {
      body = JSON.parse(text);
    } catch {
      return { ok: false, error: `Trả về không phải JSON: ${text.slice(0, 120)}` };
    }

    if (body.ok !== true) {
      return { ok: false, error: body.error || "Apps Script báo thất bại" };
    }

    if (body.missingColumns?.length) {
      console.warn(
        "[PilotRegistration] bảng tính thiếu cột:",
        body.missingColumns.join(", "),
      );
    }

    return { ok: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}
