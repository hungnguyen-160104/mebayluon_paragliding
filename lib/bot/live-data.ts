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
  CHILD_MAX_KG,
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

/**
 * SỨC CHỨA nói bằng lời cho bot đọc. Viết tay từng phòng thay vì ghép máy móc
 * từ con số trần — khách hỏi "10 người ngủ được không" thì bot phải thấy ngay
 * mỗi phòng nằm được mấy người mà nhân lên.
 */
const SLEEPS_VI: Record<string, string> = {
  "double-room": "mỗi phòng ngủ 2 người lớn + 1 trẻ em dưới 8 tuổi",
  "single-room": "mỗi phòng ngủ 1 người lớn + 1 trẻ em dưới 8 tuổi, hoặc 2 người lớn nhưng hơi chật",
  "couple-attic-single": "mỗi phòng ngủ tối đa 2 người lớn (một cặp đôi)",
  "couple-attic-double": "ngủ 3 người lớn + 1 trẻ em dưới 8 tuổi",
  "whole-home-small": "ngủ tối đa 5 người lớn, phòng khép kín",
  dormitory:
    "mỗi chỗ là 1 đệm đơn cho 1 người lớn; trẻ nhỏ tới 5 tuổi ngủ ghép được, trẻ TRÊN 5 tuổi phải lấy 1 đệm riêng; sàn có tối đa 12 đệm, ở thoải mái nhất là 10 người",
  "floor-combo": "cả gói chứa tối đa 30 người, thoải mái nhất 24 người",
  "whole-home-large": "cả gói chứa tối đa 36 người, thoải mái nhất 30 người",
};

async function roomBlock(today: string): Promise<string> {
  const to = shiftDateKey(today, ROOM_NIGHTS);
  const touching = await HomestayBooking.find({
    status: "confirmed",
    checkIn: { $lt: to },
    checkOut: { $gt: today },
  })
    .select("roomTypeId rooms checkIn checkOut status")
    .lean<OccupancyBooking[]>();

  // 1) BẢNG PHÒNG: giá + sức chứa, KHÔNG kèm lịch — thông tin tĩnh đọc một lần
  const infoLines = HOMESTAY_ROOMS.map((room) => {
    const label = (ROOM_SHORT_VI[room.id] ?? room.id).replace(" (chỗ)", "");
    const unitWord = room.id === "dormitory" ? "chỗ" : "phòng";
    const price = `${(room.pricePerNight / 1000).toLocaleString("vi-VN")}k/đêm`;
    const sleeps = SLEEPS_VI[room.id] ?? `tối đa ${room.maxAdults} người lớn`;
    return `- ${label}: ${room.units} ${unitWord}, ${price}, ${sleeps}.`;
  });

  /**
   * 2) TÌNH TRẠNG XOAY THEO ĐÊM — mỗi đêm thiếu phòng là MỘT DÒNG ghi trọn
   * trạng thái cả 8 hạng phòng của đêm đó.
   *
   * Đã thử hai đời cấu trúc xoay theo PHÒNG (dãy ngày gộp, rồi liệt kê từng
   * ngày) — model nhỏ đều đọc trượt: khách hỏi một đêm mà máy phải dò đêm ấy
   * trong 8 danh sách ~20 ngày là thế nào cũng sót. Xoay theo đêm thì câu hỏi
   * của khách khớp thẳng vào MỘT dòng, không còn gì để suy luận.
   */
  const nightLines: string[] = [];
  for (let d = today; d < to; d = shiftDateKey(d, 1)) {
    const avail: string[] = [];
    const full: string[] = [];
    let anyShortage = false;
    for (const room of HOMESTAY_ROOMS) {
      const label = (ROOM_SHORT_VI[room.id] ?? room.id).replace(" (chỗ)", "");
      const unitWord = room.id === "dormitory" ? "chỗ" : "phòng";
      const free = unitsFree(touching, room.id, d);
      if (free <= 0) {
        full.push(label);
        anyShortage = true;
      } else {
        avail.push(`${label} ${free} ${unitWord}`);
        if (free < room.units) anyShortage = true;
      }
    }
    if (!anyShortage) continue; // đêm còn nguyên vẹn: khỏi liệt kê
    nightLines.push(
      `- Đêm ${dm(d)}: CÒN ${avail.join(", ") || "(không còn gì)"}${full.length ? ` · HẾT ${full.join(", ")}` : ""}`,
    );
  }

  return (
    infoLines.join("\n") +
    "\n\nTÌNH TRẠNG PHÒNG THEO ĐÊM (chỉ liệt kê đêm có phòng đã kín; đêm KHÔNG có trong danh sách = mọi phòng còn đủ):\n" +
    (nightLines.length ? nightLines.join("\n") : "- Mọi đêm trong 365 đêm tới đều còn đủ phòng.")
  );
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
      "- CÁCH ĐỌC: khách hỏi đêm nào thì tìm dòng 'Đêm dd/MM' của đúng đêm đó — dòng ấy ghi TRỌN trạng thái: sau chữ CÒN là các phòng còn trống kèm số lượng, sau chữ HẾT là các phòng đã kín. Đêm KHÔNG có dòng nào = mọi phòng còn đủ. CHỈ được dùng đúng dòng của đêm khách hỏi, TUYỆT ĐỐI không nói còn phòng nào nằm sau chữ HẾT của dòng đó.\n" +
      "- PHẢI ĐỐI CHIẾU SỐ NGƯỜI, đừng chỉ nói còn hay hết phòng: khách đi mấy người thì cộng sức chứa của các phòng CÒN TRỐNG đêm đó rồi so với số khách. Ví dụ khách 10 người mà 01/09 chỉ còn 2 phòng giường đôi thì trả lời: \"em còn 2 phòng giường đôi, mỗi phòng chỉ ngủ được 2 người lớn + 1 trẻ em, nên 10 người e rằng không đủ chỗ ạ\", rồi gợi ý phương án khác CÒN TRỐNG đêm đó (ghép thêm hạng phòng khác, chỗ nằm sàn cộng đồng, hoặc gói bao sàn / bao nguyên nhà sàn). Không đủ thì nói thật là không đủ — tuyệt đối không hứa liều rồi để khách đến nơi mới biết.\n" +
      "- TRẺ EM Ở PHÒNG tính theo TUỔI: DƯỚI 8 TUỔI mới là trẻ em (ngủ ghép trong đúng sức chứa ghi trên); TỪ 8 TUỔI TRỞ LÊN tính như một NGƯỜI LỚN vì chiếm trọn một chỗ nằm. Ví dụ 2 người lớn + 1 con 17 tuổi là 3 NGƯỜI LỚN — một phòng đôi không đủ, phải tư vấn lấy thêm phòng hoặc hạng rộng hơn. Riêng sàn cộng đồng: trẻ TRÊN 5 tuổi phải mua 1 đệm riêng.\n" +
      `- TRẺ EM ĐI BAY (khác luật phòng) tính theo CÂN NẶNG: dưới ${CHILD_MAX_KG}kg mới bay suất trẻ em, nặng hơn tính suất người lớn.\n` +

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
