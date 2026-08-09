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
  return list.length ? list : [PILOT_ADMIN_EMAIL_DEFAULT];
}

export type PilotSheetRow = {
  code: string;
  createdAt: string;
  fullName: string;
  idNumber: string;
  nationality: string;
  phone: string;
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

    return { ok: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}
