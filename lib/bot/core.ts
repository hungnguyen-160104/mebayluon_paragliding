/**
 * Lõi con bot — dùng chung cho cả Messenger và web.
 *
 * Tương ứng node "Code in JavaScript" + "HTTP Request" của n8n cũ.
 */

import { SYSTEM_STATIC_TEMPLATE, EXTRA_RULES } from './rules';
import { getKnowledge, getConversationState } from './google-bridge';
import { buildLiveDataBlock, LIVE_DATA_START } from './live-data';
import { formatDateKeyVN, todayInVN } from '@/lib/baobay/date';

const MODEL = process.env.BOT_MODEL || 'claude-haiku-4-5';
const MAX_TOKENS = 600;

export type Channel = 'facebook' | 'web';

/* ---------------------------------------------------------------------
 * Dựng system prompt
 * ------------------------------------------------------------------ */
export async function buildSystem(opts: {
  psid: string;
  historyText: string;
}): Promise<{ staticPart: string; dynamicPart: string }> {
  const knowledge = await getKnowledge();
  // Doc tri thức đã có sẵn khối dữ liệu sống CỦA HÔM NAY (app tự đẩy sang,
  // nằm trong phần TĨNH được cache) thì khỏi quét DB. Doc chưa có khối, hoặc
  // khối từ hôm khác (ngày lặng không ai đụng booking) thì tự quét làm dự phòng
  // — thà tốn một lượt quét còn hơn báo khách số liệu ôi.
  const docStamp = knowledge.match(/Cap nhat luc: \d{2}:\d{2} (\d{2}\/\d{2}\/\d{4})/);
  const docLiveFresh =
    knowledge.includes(LIVE_DATA_START) && docStamp?.[1] === formatDateKeyVN(todayInVN());
  const liveData = docLiveFresh ? '' : await buildLiveDataBlock();

  const staticPart =
    SYSTEM_STATIC_TEMPLATE.replace('{{KNOWLEDGE}}', knowledge) + EXTRA_RULES;

  const now = new Date().toLocaleString('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour12: false,
  });

  const state = await getConversationState(opts.psid);
  const stateContext = state?.psid
    ? 'Trang thai hoi thoai hien tai: ' + (state.trang_thai || '(chua xac dinh)') + '.'
    : 'Day la khach hang moi, chua co lich su hoi thoai truoc do.';

  const dynamicPart =
    '===== BOI CANH HOI THOAI VOI KHACH NAY =====\n' +
    'HOM NAY LA: ' + now + ' (gio Viet Nam). Tu quy doi cac tu nhu "ngay mai", ' +
    '"hom nay", "cuoi tuan", "thu 7 nay" ra ngay duong lich cu the dang ' +
    'dd/mm/yyyy, KHONG hoi lai khach neu da suy ra duoc.\n\n' +
    '===== NGON NGU (QUY TAC UU TIEN CAO NHAT) =====\n' +
    'Xac dinh ngon ngu cua TIN NHAN KHACH VUA GUI va tra loi bang DUNG ngon ngu do. ' +
    'Ap dung cho MOI ngon ngu tren the gioi, khong co ngoai le va khong co danh ' +
    'sach gioi han. TUYET DOI KHONG tra loi tieng Viet cho khach dang viet ngon ' +
    'ngu khac, va KHONG bao gio noi rang minh khong ho tro ngon ngu nao. Chi khi ' +
    'tin nhan la tieng Viet hoac khong the xac dinh (vd chi co so/emoji) moi dung ' +
    'tieng Viet. Gia tien giu nguyen so VND, chi dich phan dien giai.\n' +
    '===== HET QUY TAC NGON NGU =====\n\n' +
    '===== GIONG DIEU TIENG VIET (CHI ap dung khi cau tra loi bang tieng Viet; ' +
    'tra loi ngon ngu khac thi BO QUA hoan toan muc nay) =====\n' +
    'Dung "da"/"a" DUNG NGU PHAP va co chung muc: "Da" chi dat o DAU cau khi ' +
    'mo loi hoac dap lai ("Da, em chao anh/chi"); "a" chi dat o CUOI cau ' +
    '("Anh/chi muon bay ngay nao a?"). KHONG rai "a" vao giua cau, KHONG viet ' +
    'cac cau sai ngu phap kieu "Da anh/chi chao" hay "gia tot a nhe". Moi cau ' +
    'tra loi toi da 1 chu "da" va 1 chu "a" — lich su den tu cach dien dat, ' +
    'khong phai tu so luong tu dem.\n' +
    '===== HET GIONG DIEU =====\n\n' +
    '===== QUY TAC CHOT DON (BAT BUOC, GHI DE MOI QUY TAC KHAC NEU MAU THUAN) =====\n' +
    '1. Thong tin BAT BUOC de chot don chi gom 3 muc: NGAY BAY DU KIEN, TEN khach, ' +
    'SO DIEN THOAI. Thieu muc nao thi hoi dung muc do.\n' +
    '2. Ngay sinh, so CCCD/passport, can nang: HOI MOT LAN kem giai thich rang ' +
    'cac thong tin nay can de khai bao bao hiem, anh chi co the cung cap sau ' +
    'truoc khi bay de kich hoat bao hiem. Khach khong tra loi hoac tu choi thi ' +
    'KHONG hoi lai, van chot don binh thuong va de trong cac muc do.\n' +
    '3. CHI xuat khoi BOOKING_DATA khi da chot xong ca LOAI BAY va GIA cu the ' +
    '(khong xuat voi gia \"chua xac dinh\"). Khi da du 3 muc bat buoc va da chot ' +
    'loai bay + gia, xuat khoi ngay trong cau tra loi do — nhung ' +
    'CHI XUAT MOT LAN DUY NHAT cho moi don. Neu trong lich su hoi thoai don nay ' +
    'DA duoc chot roi thi cac luot sau (khach cam on, hoi them, bo sung chi tiet ' +
    'nho) TUYET DOI KHONG xuat lai khoi BOOKING_DATA nua; chi xuat khoi moi khi ' +
    'khach doi thong tin quan trong (ngay bay, so nguoi, diem bay) va noi ro do ' +
    'la CAP NHAT don.\n' +
    '4. CHUA xuat khoi BOOKING_DATA thi TUYET DOI KHONG duoc noi cac cau nhu ' +
    '"da ghi nhan", "da chuyen toi doi bay", "da chot don" — thieu thong tin nao ' +
    'thi hoi dung thong tin do.\n' +
    '5. Ve LICH BAY: khong co gioi han cho, bay phu thuoc thoi tiet — KHONG bao gio ' +
    'tu phan ngay bay nao "da full" hay tu choi khach vi dong; neu co khoi DU LIEU ' +
    'TRUC TIEP thi chi dung so khach da dat de tu van (dong thi khuyen dat som), ' +
    'con chot lich van do dieu phoi vien goi xac nhan trong ngay. Ve PHONG HOMESTAY: ' +
    'neu co khoi DU LIEU TRUC TIEP thi tra loi con/het phong theo dung so trong do.\n' +
    '===== HET QUY TAC CHOT DON =====\n\n' +
    liveData +
    (opts.historyText
      ? 'LICH SU HOI THOAI (cu nhat o tren, moi nhat o duoi):\n' + opts.historyText + '\n\n'
      : '') +
    stateContext +
    '\n===== HET BOI CANH =====';

  return { staticPart, dynamicPart };
}

/* ---------------------------------------------------------------------
 * Gọi Anthropic
 *
 * Khối tĩnh (quy tắc + tài liệu, ~10k ký tự) được đánh dấu cache_control
 * y như bản n8n cũ. Phần này không đổi giữa các lượt chat nên Anthropic
 * tính rẻ hơn nhiều — giữ nguyên, đừng bỏ đi.
 * ------------------------------------------------------------------ */
export async function askClaude(
  staticPart: string,
  dynamicPart: string,
  userContent: string,
): Promise<string> {
  // Mệnh lệnh ngôn ngữ đặt NGAY SÁT tin nhắn khách — quy tắc nằm xa trong
  // system prompt bị mô hình bỏ qua chập chờn (Pháp/Nga/TBN hay bị lôi về
  // tiếng Việt), còn đặt cạnh câu hỏi thì bám chắc.
  const wrapped =
    '[YEU CAU BAT BUOC VE NGON NGU: Doc tin nhan cuoi cung cua khach o duoi va ' +
    'tra loi bang CHINH ngon ngu do, bat ke do la ngon ngu nao. KHONG co ngon ' +
    'ngu nao bi loai tru — ban tra loi duoc MOI ngon ngu. TUYET DOI KHONG bao ' +
    'gio noi rang ban khong the tra loi bang mot ngon ngu nao do; cu tra loi. ' +
    'Neu tin nhan khong phai tieng Viet thi khong chen tu dem tieng Viet ' +
    '("Da", "a", "em", "anh/chi") vao cau tra loi — dung cach xung ho lich su ' +
    'cua chinh ngon ngu do. So tien giu nguyen VND.]\n\n' +
    userContent;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        { type: 'text', text: staticPart, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: dynamicPart },
      ],
      messages: [{ role: 'user', content: wrapped }],
    }),
  });

  if (!res.ok) {
    console.error('[claude] lỗi', res.status, await res.text());
    throw new Error('Anthropic API lỗi ' + res.status);
  }

  const json = await res.json();
  return json?.content?.[0]?.text || '';
}

/* ---------------------------------------------------------------------
 * Làm sạch câu trả lời trước khi gửi khách
 *
 * Cắt bỏ khối BOOKING_DATA (dữ liệu nội bộ, khách không được thấy) và
 * gỡ markdown vì Messenger hiện ra dấu sao, dấu thăng lồ lộ.
 * ------------------------------------------------------------------ */
export function cleanReply(text: string): string {
  let t = String(text);

  for (const marker of ['BOOKING_DATA', 'BOOKING_CONFIRMED', 'BOOKING CONFIRMED', 'BOOKING DATA']) {
    t = t.split(marker)[0];
  }

  return t
    .replace(/[*_`~]/g, '')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .split('\n')
    .filter((l) => !/^\s*[-=_]{3,}\s*$/.test(l))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* ---------------------------------------------------------------------
 * Tách khối JSON đặt lịch
 *
 * Không dùng regex: JSON có ngoặc lồng nhau, regex sẽ cắt sai. Đếm độ sâu
 * ngoặc là cách duy nhất chắc chắn — giữ nguyên thuật toán bản cũ.
 * ------------------------------------------------------------------ */
export function extractBooking(text: string): Record<string, string> | null {
  const idx = text.indexOf('BOOKING_DATA');
  if (idx === -1) return null;

  const start = text.indexOf('{', idx);
  if (start === -1) return null;

  let depth = 0;
  let end = -1;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end === -1) return null;

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch (err) {
    console.error('[booking] JSON hỏng:', err);
    return null;
  }
}

/** Tên Facebook của khách, để nhân viên dễ tìm lại đoạn chat. */
export async function getFacebookName(psid: string, pageToken: string): Promise<string> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v25.0/${psid}?fields=name&access_token=${encodeURIComponent(pageToken)}`,
    );
    if (!res.ok) return '(không lấy được)';
    const j = await res.json();
    return j?.name || '(không lấy được)';
  } catch {
    return '(không lấy được)';
  }
}

/** Email báo booking mới — giữ nguyên bố cục bản Gmail cũ. */
export function bookingEmailHtml(d: Record<string, any>, rawText: string): string {
  const li = (k: string, v: unknown) =>
    `<li><b>${k}:</b> ${escapeHtml(String(v ?? ''))}</li>`;

  return (
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:18px;color:#222;line-height:1.7">' +
    '<h2 style="font-size:24px;color:#0a7d33;margin-bottom:8px">BOOKING MỚI — Mebayluon</h2>' +
    '<ul style="font-size:19px;padding-left:20px;margin:0 0 14px 0">' +
    li('Tên khách', d.ho_ten) +
    li('Tên Facebook', d.ten_facebook) +
    li('Số điện thoại', d.so_dien_thoai) +
    li('Số người', d.so_luong_nguoi) +
    li('Ngày bay', d.ngay_dat_bay) +
    li('Điểm bay', d.dia_diem_dich_vu) +
    li('Dịch vụ đi kèm', d.dich_vu_kem || 'Không') +
    li('Tổng giá', d.gia_da_chot) +
    '</ul><hr style="border:none;border-top:1px solid #ccc">' +
    '<p style="font-size:16px;color:#555;margin-bottom:4px"><b>Nội dung bot đã gửi khách:</b></p>' +
    '<p style="font-size:15px;color:#555;white-space:pre-wrap">' + escapeHtml(rawText) + '</p>' +
    '</div>'
  );
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
