/**
 * Cầu nối sang Google — thay cho 4 node Google trong n8n
 * (Download file / Get row(s) / Append row / Gmail).
 *
 * Vì sao đi đường này thay vì gọi thẳng Google API: gọi thẳng cần một
 * service account kèm file khoá JSON nằm trên Vercel. Đi qua Apps Script
 * thì script chạy bằng chính tài khoản Google của anh, quyền có sẵn,
 * không có khoá nào phải cất giữ. Đây đúng là cách trang đăng ký phi công
 * đang chạy (PILOT_SHEET_WEBHOOK_URL), nên anh đã quen vận hành.
 *
 * Env: BOT_BRIDGE_URL, BOT_BRIDGE_SECRET
 */

import { markBookingOnce } from '@/lib/bot/memory';

const URL_ = process.env.BOT_BRIDGE_URL || '';
const SECRET = process.env.BOT_BRIDGE_SECRET || '';

async function call<T>(action: string, payload: Record<string, unknown> = {}): Promise<T | null> {
  if (!URL_) {
    console.error('[bridge] chưa khai BOT_BRIDGE_URL');
    return null;
  }
  try {
    const res = await fetch(URL_, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: SECRET, action, ...payload }),
      // Apps Script trả 302 sang googleusercontent — bắt buộc đi theo.
      redirect: 'follow',
    });
    const json = await res.json();
    if (!json.ok) {
      console.error('[bridge]', action, 'lỗi:', json.error);
      return null;
    }
    return json.data as T;
  } catch (err) {
    console.error('[bridge]', action, 'ném lỗi:', err);
    return null;
  }
}

/* ---------------------------------------------------------------------
 * Tài liệu dịch vụ (Google Doc) — nội dung gần như không đổi, nên cache
 * lại trong bộ nhớ tiến trình. Vercel giữ tiến trình ấm giữa các request
 * nên phần lớn lượt chat không phải gọi sang Google lần nào.
 * ------------------------------------------------------------------ */
let knowledgeCache: { text: string; at: number } | null = null;
const KNOWLEDGE_TTL = 10 * 60 * 1000; // 10 phút

export async function getKnowledge(): Promise<string> {
  const now = Date.now();
  if (knowledgeCache && now - knowledgeCache.at < KNOWLEDGE_TTL) {
    return knowledgeCache.text;
  }

  const data = await call<{ text: string }>('getKnowledge');

  if (!data?.text) {
    // Doc hỏng thì thà dùng bản cũ còn hơn để bot trả lời rỗng kiến thức.
    if (knowledgeCache) {
      console.warn('[bridge] không đọc được tài liệu, dùng bản cache cũ');
      return knowledgeCache.text;
    }
    return '';
  }

  knowledgeCache = { text: data.text.trim(), at: now };
  return knowledgeCache.text;
}

/* ---------------------------------------------------------------------
 * Trạng thái hội thoại theo psid (sheet TrangThaiHoiThoai)
 * ------------------------------------------------------------------ */
export async function getConversationState(psid: string) {
  return call<{ psid?: string; trang_thai?: string } | null>('getState', { psid });
}

/* ---------------------------------------------------------------------
 * Ghi một dòng đặt lịch (sheet DatLich) + gửi email báo về hộp thư
 * ------------------------------------------------------------------ */
export async function saveBooking(row: Record<string, unknown>, emailHtml: string) {
  // Chốt chống trùng nằm ở ĐÂY — điểm nghẽn duy nhất mà cả kênh web lẫn
  // Messenger đều đi qua. Prompt có xuất lại BOOKING_DATA bao nhiêu lần
  // thì sheet cũng chỉ nhận một dòng cho mỗi đơn.
  const firstTime = await markBookingOnce({
    psid: row.psid,
    ngay_dat_bay: row.ngay_dat_bay,
    dia_diem_dich_vu: row.dia_diem_dich_vu,
  });

  if (!firstTime) {
    console.log('[bridge] saveBooking bỏ qua: đơn này đã ghi rồi', row.psid);
    return { appended: false };
  }

  return call<{ appended: boolean }>('saveBooking', { row, emailHtml });
}
