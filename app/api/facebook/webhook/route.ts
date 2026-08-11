/**
 * Kênh MESSENGER — thay node Webhook (mebayluon-hook) + HTTP Request1 của n8n.
 *
 * URL: https://www.mebayluon.com/api/facebook/webhook
 * Khai URL này vào Meta App -> Webhooks -> Page, subscribe field "messages".
 */

import crypto from 'crypto';
import {
  buildSystem, askClaude, cleanReply, extractBooking,
  getFacebookName, bookingEmailHtml,
} from '@/lib/bot/core';
import { getMessengerHistory } from '@/lib/bot/memory';
import { saveBooking } from '@/lib/bot/google-bridge';

export const maxDuration = 60; // gọi Claude có thể mất vài giây

const GRAPH = 'https://graph.facebook.com/v25.0';

const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || '';
const APP_SECRET = process.env.FB_APP_SECRET || '';
const PAGE_TOKEN = process.env.FB_PAGE_TOKEN || '';

// Chỉ phục vụ fanpage này. n8n cũ lọc bằng node "Chi cho Club House page".
const ALLOWED_PAGE_ID = process.env.FB_PAGE_ID || '';

/* ------------------------------------------------------------------ */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;

  if (
    q.get('hub.mode') === 'subscribe' &&
    q.get('hub.verify_token') === VERIFY_TOKEN &&
    q.get('hub.challenge')
  ) {
    return new Response(q.get('hub.challenge')!, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
  return new Response('Forbidden', { status: 403 });
}

/* ------------------------------------------------------------------ */
export async function POST(req: Request) {
  const raw = await req.text();

  if (!verifySignature(raw, req.headers.get('x-hub-signature-256'))) {
    return new Response('Invalid signature', { status: 401 });
  }

  let body: any;
  try { body = JSON.parse(raw); } catch { return ok(); }
  if (body.object !== 'page') return ok();

  try {
    for (const entry of body.entry || []) {
      const pageId = String(entry.id || '');
      if (ALLOWED_PAGE_ID && pageId !== ALLOWED_PAGE_ID) continue;

      for (const ev of entry.messaging || []) {
        await handle(ev, pageId);
      }
    }
  } catch (err) {
    // Trả 500 lặp lại là Facebook tự tắt webhook. Nuốt lỗi vào log.
    console.error('[messenger] lỗi xử lý:', err);
  }

  return ok();
}

/* ------------------------------------------------------------------ */
async function handle(ev: any, pageId: string) {
  const psid = String(ev.sender?.id || '');
  const text: string = ev.message?.text || '';

  // Ba trường hợp phải bỏ qua, nếu không thì vừa lặp vô hạn vừa đốt tiền API:
  //  - tin do chính Page gửi (is_echo) hoặc sender chính là Page
  //  - sự kiện không phải text (delivery / read / reaction)
  if (!text || !psid || psid === pageId || ev.message?.is_echo) return;

  const historyText = await getMessengerHistory(pageId, psid, PAGE_TOKEN);
  const { staticPart, dynamicPart } = await buildSystem({ psid, historyText });

  const rawReply = await askClaude(staticPart, dynamicPart, text);
  const reply = cleanReply(rawReply);

  if (reply) await sendMessage(psid, reply);

  const booking = extractBooking(rawReply);
  if (booking) {
    booking.psid = psid;
    booking.ten_facebook = await getFacebookName(psid, PAGE_TOKEN);
    booking.thoi_gian_chot = new Date().toISOString();
    booking.trang_thai_booking = 'moi';
    await saveBooking(booking, bookingEmailHtml(booking, rawReply));
  }
}

async function sendMessage(psid: string, text: string) {
  const res = await fetch(`${GRAPH}/me/messages?access_token=${encodeURIComponent(PAGE_TOKEN)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: psid },
      messaging_type: 'RESPONSE',
      message: { text },
    }),
  });
  if (!res.ok) console.error('[messenger] gửi lỗi', res.status, await res.text());
}

function verifySignature(raw: string, header: string | null): boolean {
  if (!APP_SECRET || !header?.startsWith('sha256=')) return false;

  const expected =
    'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(raw, 'utf8').digest('hex');

  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false; // timingSafeEqual ném lỗi nếu lệch độ dài
  return crypto.timingSafeEqual(a, b);
}

const ok = () => new Response('EVENT_RECEIVED', { status: 200 });
