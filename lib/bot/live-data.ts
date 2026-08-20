// lib/bot/live-data.ts
/**
 * DỮ LIỆU SỐNG cho bot AI: tình trạng PHÒNG HOMESTAY và độ đông LỊCH BAY
 * đọc thẳng từ MongoDB — bot tư vấn "ngày đó còn phòng không / đông không"
 * bằng số thật thay vì đoán.
 *
 * Nhét vào dynamicPart của system prompt (phần dựng lại mỗi câu, không phá
 * cache phần tĩnh). Chỉ đưa SỐ GỘP: còn mấy phòng, bao nhiêu khách đã đặt —
 * TUYỆT ĐỐI không tên, không SĐT của khách nào; luật này ghi thẳng vào khối
 * để bot cũng không bịa được.
 *
 * Lỗi DB thì trả chuỗi rỗng — bot vẫn trả lời như cũ, thà thiếu dữ liệu sống
 * còn hơn chết cả con bot.
 */

import { formatDateKeyVN, nowStampVN, shiftDateKey, todayInVN } from "@/lib/baobay/date";
import {
  CHECK_IN_TIME,
  CHECK_OUT_TIME,
  HOMESTAY_ROOMS,
  ROOM_SHORT_VI,
  unitsFree,
  type OccupancyBooking,
} from "@/lib/baobay/homestay";
import { SPOTS } from "@/lib/baobay/spots";
import { setLiveDataInDoc } from "@/lib/bot/google-bridge";
import { shouldShowQueueNo } from "@/lib/booking/queue-display";
import { connectDB } from "@/lib/mongodb";
import { HomestayBooking, HomestaySyncState } from "@/models/HomestayBooking.model";
import { BaobayBooking } from "@/models/BaobayBooking.model";

/**
 * MỐC ĐÁNH DẤU trong Google Doc tri thức: Apps Script thay ruột giữa hai mốc
 * này mỗi lần app đẩy dữ liệu sang. Bot thấy mốc trong Doc ⇒ dữ liệu sống đã
 * nằm sẵn trong phần TĨNH (được cache phía Anthropic) ⇒ khỏi quét DB mỗi câu.
 */
export const LIVE_DATA_START = "[LIVE_DATA_START]";
export const LIVE_DATA_END = "[LIVE_DATA_END]";

/**
 * Nhìn trước bao xa: phòng nhận đặt trước cả năm nên quét trọn 365 đêm (chỉ
 * liệt kê đêm có khách nên khối không phình); lịch bay khách hiếm khi hỏi xa
 * quá vài tháng, 90 ngày là thừa đủ.
 */
const ROOM_NIGHTS = 365;
const FLIGHT_DAYS = 90;

/**
 * Bot bị hỏi dồn dập thì không nện DB mỗi câu — dữ liệu phòng đổi theo phút
 * chứ không theo giây, đệm 60 giây là tươi chán.
 */
let cache: { at: number; block: string } | null = null;
const CACHE_MS = 60_000;

/** "2026-08-22" -> "22/08". */
const dm = (key: string) => formatDateKeyVN(key).slice(0, 5);

/** Gom dãy ngày liền nhau thành "22/08-24/08" cho đỡ dài dòng. */
function joinRuns(dates: string[]): string {
  if (!dates.length) return "";
  const runs: string[][] = [[dates[0]]];
  for (let i = 1; i < dates.length; i++) {
    if (shiftDateKey(dates[i - 1], 1) === dates[i]) runs[runs.length - 1].push(dates[i]);
    else runs.push([dates[i]]);
  }
  return runs.map((r) => (r.length > 1 ? `${dm(r[0])}-${dm(r[r.length - 1])}` : dm(r[0]))).join(", ");
}

async function roomBlock(today: string): Promise<string> {
  const to = shiftDateKey(today, ROOM_NIGHTS);
  const touching = await HomestayBooking.find({
    status: "confirmed",
    checkIn: { $lt: to },
    checkOut: { $gt: today },
  })
    .select("roomTypeId rooms checkIn checkOut status")
    .lean<OccupancyBooking[]>();

  const dates: string[] = [];
  for (let d = today; d < to; d = shiftDateKey(d, 1)) dates.push(d);

  const lines: string[] = [];
  for (const room of HOMESTAY_ROOMS) {
    const price = `${(room.pricePerNight / 1000).toLocaleString("vi-VN")}k/đêm`;
    const cap = room.comfort ? `tối đa ${room.maxAdults} người, nên ở ${room.comfort}` : `tối đa ${room.maxAdults} người lớn${room.maxChildren ? ` + ${room.maxChildren} trẻ <6 tuổi` : ""}`;
    const full = dates.filter((d) => unitsFree(touching, room.id, d) === 0);
    const low = dates.filter((d) => {
      const f = unitsFree(touching, room.id, d);
      return f > 0 && f < room.units;
    });
    const state =
      full.length === 0 && low.length === 0
        ? "trống suốt cả năm tới"
        : [full.length ? `KÍN: ${joinRuns(full)}` : "", low.length ? `còn ít: ${joinRuns(low)}` : "", "các đêm khác trống"]
            .filter(Boolean)
            .join(" · ");
    const label = (ROOM_SHORT_VI[room.id] ?? room.id).replace(" (chỗ)", "");
    lines.push(`- ${label} (${room.units} ${room.id === "dormitory" ? "chỗ" : "phòng"}, ${price}, ${cap}): ${state}`);
  }
  return lines.join("\n");
}

/** Nhãn độ đông theo SỐ BOOKING trong ngày — ngưỡng do chủ chốt. */
function crowdLabel(bookings: number): string {
  if (bookings > 20) return "ĐÔNG";
  if (bookings >= 10) return "bình thường";
  return "ít";
}

async function flightBlock(today: string): Promise<string> {
  const to = shiftDateKey(today, FLIGHT_DAYS);
  const rows = await BaobayBooking.aggregate([
    { $match: { flightDate: { $gte: today, $lt: to } } },
    {
      $group: {
        _id: { spot: "$spot", date: "$flightDate" },
        // Booking huỷ không tính vào độ đông, nhưng SỐ THỨ TỰ đã cấp thì
        // không dùng lại — số kế tiếp phải đếm cả booking huỷ.
        active: { $sum: { $cond: [{ $in: ["$status", ["open", "done"]] }, 1, 0] } },
        maxSeq: { $max: "$daySeq" },
      },
    },
  ]);
  const bySpot = new Map<string, string[]>();
  for (const r of rows.sort((a, b) => String(a._id.date).localeCompare(String(b._id.date)))) {
    if (!r.active && !r.maxSeq) continue;
    const name = SPOTS.find((s) => s.id === r._id.spot)?.name ?? r._id.spot;
    // Số thứ tự chỉ công bố ở Khau Phạ mùa đông khách — nơi/lúc khác khách
    // chỉ cần biết mức độ đông (số vẫn tồn tại trong sổ, không nói ra thôi)
    const showQueue = shouldShowQueueNo(String(r._id.spot), String(r._id.date));
    const next = Math.max(Number(r.maxSeq) || 0, r.active) + 1;
    (bySpot.get(name) ?? bySpot.set(name, []).get(name)!).push(
      `${dm(r._id.date)}: ${r.active} book (${crowdLabel(r.active)})${showQueue ? `, số kế tiếp #${next}` : ""}`,
    );
  }
  if (!bySpot.size) return "- Chưa có booking nào trong 90 ngày tới — đặt lúc này chắc chắn lấy được số nhỏ.";
  return [...bySpot.entries()].map(([name, list]) => `- ${name}: ${list.join(" · ")}`).join("\n");
}

/**
 * Khối dữ liệu sống hoàn chỉnh — gọi trong buildSystem. Trả "" khi lỗi.
 */
export async function buildLiveDataBlock(): Promise<string> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.block;
  try {
    await connectDB();
    const today = todayInVN();
    const [rooms, flights] = await Promise.all([roomBlock(today), flightBlock(today)]);

    const block =
      "===== DU LIEU TRUC TIEP TU HE THONG =====\n" +
      `Cap nhat luc: ${nowStampVN()} (gio Viet Nam).\n` +
      `PHONG HOMESTAY Clubhouse Mebayluon (Tú Lệ, chân đèo Khau Phạ) — tình trạng 365 đêm tới (đặt trước cả năm được), nhận phòng ${CHECK_IN_TIME}, trả ${CHECK_OUT_TIME}:\n` +
      rooms +
      "\n\nDO DONG LICH BAY — số BOOKING đã đặt theo ngày, 90 ngày tới (ngày không liệt kê = chưa có booking nào, chắc chắn lấy được số nhỏ). Dưới 10 book = ít, 10-20 = bình thường, trên 20 = ĐÔNG:\n" +
      flights +
      "\n\nLUAT DUNG KHOI NAY:\n" +
      "- Phòng: trả lời còn/hết theo đúng số trên; khách muốn đặt thì gửi link https://www.mebayluon.com/homestay/dat-phong (đặt online, thanh toán khi nhận phòng).\n" +
      "- Bay: KHÔNG có giới hạn chỗ, TUYỆT ĐỐI không từ chối khách vì đông. Cơ chế như LẤY SỐ Ở NGÂN HÀNG: đặt trước thì được cấp số thứ tự, đến ngày bay gọi theo số — số càng nhỏ càng đỡ chờ. Khách hỏi ngày nào đó đông không / phải đợi lâu không: đọc số book của ngày đó ở trên, nói thật mức độ (ít / bình thường / ĐÔNG). CHỈ những ngày có ghi 'số kế tiếp #N' ở trên (Khau Phạ mùa đông khách) mới được nói số thứ tự họ sẽ nhận nếu đặt ngay; ngày/điểm không ghi số thì tuyệt đối không nhắc đến số thứ tự, chỉ nói mức độ đông. Ngày ĐÔNG thì khuyên đặt sớm để lấy số nhỏ, kèm trấn an: hoàn/huỷ/đổi lịch/đổi lựa chọn đều MIỄN PHÍ nên đặt trước không phải lo lắng gì.\n" +
      "- TUYỆT ĐỐI không nhắc tên, số điện thoại hay bất kỳ chi tiết nào của khách khác. Khách hỏi về booking CỦA HỌ thì mời gọi hotline để nhân viên tra giúp.\n" +
      "- Dữ liệu có thể trễ vài phút — chốt phòng cuối cùng vẫn theo hệ thống đặt phòng.\n" +
      "===== HET DU LIEU TRUC TIEP =====\n\n";

    cache = { at: Date.now(), block };
    return block;
  } catch {
    // DB trục trặc: bot vẫn phải sống — trả lời bằng tri thức tĩnh như cũ
    return "";
  }
}


/* ---------------------------------------------------------------------
 * ĐẨY khối dữ liệu sang Google Doc tri thức — để dữ liệu nằm trong phần
 * TĨNH của prompt (được Anthropic cache), bot khỏi quét DB mỗi câu chat.
 * ------------------------------------------------------------------ */

/** Khoá mốc trong HomestaySyncState — nhớ lần đẩy Doc gần nhất. */
const PUSH_KEY = "bot:live-data-doc";
/**
 * Chủ muốn "mỗi booking nổ lên là ghi vào Doc" — đẩy gần như tức thời, chỉ
 * chặn 2 phút để đợt nhập hàng loạt (quét mail, import sheet) không nện
 * Google mấy chục lần liền.
 */
const PUSH_MIN_MS = 2 * 60 * 1000;

/** Đẩy NGAY, bỏ qua chặn tần suất — dùng cho chạy tay / kiểm thử. */
export async function pushLiveDataToDoc(): Promise<boolean> {
  cache = null; // số liệu phải tươi tại thời điểm đẩy
  const block = await buildLiveDataBlock();
  if (!block) return false;
  return setLiveDataInDoc(block);
}

/**
 * Gọi sau MỖI thao tác đổi booking (bay + phòng) và mỗi lượt chat: nếu đã
 * quá 2 phút từ lần đẩy trước thì đẩy bản mới sang Doc, chưa thì thôi.
 * Giành quyền đẩy bằng một lệnh update có điều kiện — nhiều instance Vercel
 * cùng gọi thì chỉ một instance thắng, không đẩy trùng.
 * Không bao giờ ném lỗi: đẩy Doc là việc phụ, hỏng cũng không được làm
 * hỏng thao tác chính của người dùng.
 */
export async function schedulePushLiveData(): Promise<void> {
  try {
    await connectDB();
    await HomestaySyncState.updateOne(
      { key: PUSH_KEY },
      { $setOnInsert: { lastUid: 0, lastRunAt: new Date(0) } },
      { upsert: true },
    );
    const cutoff = new Date(Date.now() - PUSH_MIN_MS);
    const claimed = await HomestaySyncState.findOneAndUpdate(
      { key: PUSH_KEY, lastRunAt: { $lt: cutoff } },
      { $set: { lastRunAt: new Date(), lastRunBy: "auto" } },
    );
    if (!claimed) return; // vừa có ai đẩy xong — 2 phút nữa tính tiếp

    const ok = await pushLiveDataToDoc();
    if (!ok) {
      // Đẩy hỏng thì nhả mốc để thao tác sau thử lại ngay
      await HomestaySyncState.updateOne({ key: PUSH_KEY }, { $set: { lastRunAt: new Date(0) } });
    }
  } catch (err) {
    console.error("[bot] đẩy dữ liệu sống sang Doc lỗi:", err);
  }
}
