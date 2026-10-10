// lib/checkin-map/stops.ts — SINH TỰ ĐỘNG bởi scripts/ban-do-duong-di/ck_site.py (bản đồ check-in v11, chủ duyệt 10/10/2026).
// Đừng sửa tay: sửa dữ liệu ở scratchpad checkin-3d/facts.json hoặc ck_site.py rồi chạy lại.
// photoPending: ảnh trên web CHƯA xin phép (licensed: false) — KHÔNG hiện trên trang, chỉ giữ nguồn để xin phép.
import type { CkStopId } from "./types";

export type CkStopRow = (typeof CK_STOPS)[number];

export const CK_STOPS = [
 {
  "id": "le-champ",
  "n": 1,
  "lat": 21.78846,
  "lon": 104.31096,
  "ele": 650,
  "km": 0,
  "fromTuLe": {
   "km": 1.3,
   "min": 5
  },
  "fromClubhouse": {
   "km": 5.9,
   "min": 10
  },
  "vi": {
   "name": "Le Champ Tú Lệ",
   "type": "Khu nghỉ dưỡng · khoáng nóng",
   "why": "Bể khoáng nóng ngoài trời giữa thung lũng, quanh là bản người Thái và người Mông — chỗ ngâm mình sau một ngày đèo dốc.",
   "duongDi": [
    "Từ Clubhouse Mebayluon: 1,3 km đường bê tông ra QL32 ở ngã ba bản Lìm, theo QL32 4,6 km. Tổng 5,9 km, khoảng 10 phút lái xe.",
    "Từ chợ Tú Lệ: theo QL32 1,3 km. Tổng 1,3 km, khoảng 5 phút."
   ],
   "mua": "Tắm khoáng nóng hợp nhất vào những ngày se lạnh, từ thu sang xuân; báo Lào Cai cũng ghi nhận thu, đông và xuân là mùa cao điểm của các điểm khoáng nóng trong vùng. Nếu muốn ghép với cảnh lúa, cánh đồng nếp Tú Lệ vàng vào khoảng giữa tháng 9 đến đầu tháng 10, cũng là mùa cốm; tháng 5–6 ruộng bậc thang quanh vùng đổ nước.",
   "ve": null,
   "luuY": [
    "Là khu nghỉ dưỡng tư nhân: khách không lưu trú nên gọi hỏi trước về dịch vụ tắm khoáng trong ngày.",
    "Đây là khu nghỉ dưỡng tư nhân. Khách không lưu trú muốn tắm khoáng trong ngày nên gọi hỏi trước; chúng tôi không ghi giá vì không có nguồn giá ổn định.",
    "Khu nằm ngay mặt quốc lộ, ô tô và xe khách đều vào được, không phải rẽ đường nhánh.",
    "Cuối tuần mùa lúa chín, phòng ở Tú Lệ và Mù Cang Chải kín sớm. Nên đặt phòng trước rồi mới chốt lịch đi.",
    "Muốn ăn ngoài, hàng quán tập trung quanh chợ Tú Lệ, cách hơn 1 km; xôi nếp và cốm Tú Lệ là hai món nên thử."
   ]
  },
  "en": {
   "name": "Le Champ Tú Lệ",
   "type": "hot-spring resort",
   "what": "Le Champ Tú Lệ Resort Hot Spring & Spa sits in Nước Nóng village right beside Highway QL32, at the gateway to the Tú Lệ valley as you arrive from Nghĩa Lộ.",
   "why": "An outdoor hot mineral pool in the middle of the valley, with Thái and Hmông villages all around — the place to soak after a day of mountain passes.",
   "when": "Best on cool days from autumn to spring; the Tú Lệ sticky-rice fields turn gold around mid-September to early October.",
   "tip": "It is a private resort: if you are not staying, call ahead to ask about day use of the hot spring."
  },
  "photo": {
   "src": "/checkin-map/anh/le-champ.webp",
   "credit": {
    "vi": "Ảnh: Le Champ Tú Lệ Resort",
    "en": "Photo: Le Champ Tú Lệ Resort"
   }
  },
  "photoPending": null
 },
 {
  "id": "suoi-khoang",
  "n": 2,
  "lat": 21.7889,
  "lon": 104.30844,
  "ele": 630,
  "km": 0.3,
  "fromTuLe": {
   "km": 1.2,
   "min": 5
  },
  "fromClubhouse": {
   "km": 5.9,
   "min": 10
  },
  "vi": {
   "name": "Suối khoáng nóng",
   "type": "Suối khoáng nóng của bản",
   "why": "Ngâm chân, tắm khoáng giữa bản làng — một nếp sinh hoạt rất riêng của Tú Lệ, hơn là một điểm chụp ảnh.",
   "duongDi": [
    "Từ Clubhouse Mebayluon: 1,3 km đường bê tông ra QL32 ở ngã ba bản Lìm, theo QL32 4,4 km, rồi rẽ vào đường nhánh 0,1 km (đường bản 0,1 km). Tổng 5,9 km, khoảng 10 phút lái xe.",
    "Từ chợ Tú Lệ: theo QL32 1,1 km, rồi rẽ vào đường nhánh 0,1 km (đường bản 0,1 km). Tổng 1,2 km, khoảng 5 phút."
   ],
   "mua": "Chiều muộn là lúc người bản ra suối và cũng là lúc dễ chịu nhất: trời dịu, hơi nước bốc lên trên mặt bể. Những ngày lạnh từ cuối thu tới đầu xuân, ngâm khoáng càng đáng. Mùa lúa chín (giữa tháng 9 – đầu tháng 10) thì hợp ghép một buổi ngắm đồng nếp, ăn cốm với một buổi ngâm chân.",
   "ve": null,
   "luuY": [
    "Đây là chỗ sinh hoạt của dân bản: ăn mặc kín đáo, xin phép trước khi chụp và không chụp người đang tắm. Các điểm tắm quanh đó do hộ dân tự mở, nên hỏi giá trước.",
    "Đây là chỗ sinh hoạt của dân bản, không phải khu vui chơi. Ăn mặc kín đáo, nói vừa đủ nghe.",
    "Không chụp, không quay người đang tắm. Muốn chụp cảnh suối thì xin phép trước.",
    "Các điểm tắm quanh đó do hộ dân tự mở, có thu tiền; hỏi giá trước khi dùng.",
    "Không xả rác, không dùng xà phòng, dầu gội ở dòng nước chung.",
    "Ai muốn chỗ ngâm riêng, có phòng thay đồ thì cân nhắc dịch vụ của khu nghỉ dưỡng ngay bên cạnh."
   ]
  },
  "en": {
   "name": "Suối khoáng nóng",
   "type": "Tú Lệ hot mineral spring",
   "what": "A natural hot mineral spring in Nước Nóng village, about 1 km from Tú Lệ market towards Nghĩa Lộ. The Thái villagers come here to bathe every afternoon after work in the fields.",
   "why": "Soak your feet or bathe in the heart of a village — a slice of everyday Tú Lệ life rather than a photo spot.",
   "when": "Late afternoon and cold days, when steam rises off the pools.",
   "tip": "This is where villagers wash: dress modestly, ask before you take photos and never photograph people bathing. Nearby bathing spots are run by local households, so ask the price first."
  },
  "photo": {
   "src": "/checkin-map/anh/suoi-khoang.webp",
   "credit": {
    "vi": "Ảnh: Le Champ Tú Lệ Resort (bể khoáng của Le Champ)",
    "en": "Photo: Le Champ Tú Lệ Resort (the resort's hot-spring pool)"
   }
  },
  "photoPending": null
 },
 {
  "id": "lung-cung",
  "n": 3,
  "lat": 21.9025,
  "lon": 104.23087,
  "ele": 2913,
  "km": 1.4,
  "fromTuLe": {
   "km": 15.5,
   "min": 50
  },
  "fromClubhouse": {
   "km": 19.9,
   "min": 60
  },
  "vi": {
   "name": "Đỉnh Lùng Cúng",
   "type": "Đỉnh núi · leo núi 2 ngày",
   "why": "Không phải điểm dừng ven đường mà là một chuyến leo núi: rừng già phủ rêu, rừng trúc, đồi cỏ, rồi một đỉnh trống bốn phía — chỗ săn mây ngắm được cả hoàng hôn lẫn bình minh.",
   "duongDi": [
    "Từ Clubhouse Mebayluon: 1,3 km đường bê tông ra QL32 ở ngã ba bản Lìm, theo QL32 3,2 km, rồi rẽ vào đường nhánh 15 km (đường nhỏ 11 km, đường bản 4,8 km). Tổng 20 km, khoảng 60 phút lái xe.",
    "Từ chợ Tú Lệ: theo QL32 0,2 km, rồi rẽ vào đường nhánh 15 km (đường nhỏ 11 km, đường bản 4,8 km). Tổng 16 km, khoảng 50 phút.",
    "Ô tô/xe máy chỉ tới bản Tu San (đầu đường mòn, ~1650 m); từ đó leo bộ khoảng 4,3 km tới đỉnh."
   ],
   "mua": "Mùa khô, khoảng tháng 10 đến tháng 4. Cuối tháng 11 đến Tết dương lịch là mùa lá phong đỏ; đầu xuân có hoa đào, sau đó là đỗ quyên; tháng 9–10 dễ gặp mây và trùng mùa lúa chín dưới thung lũng. Nên tránh tháng 5–8: mưa nhiều, đường trơn, dễ sạt và lối mòn bị cây che. Trên đỉnh lạnh hơn thung lũng rất nhiều; một bài tường thuật ghi giữa buổi sáng chỉ 7–8°C.",
   "ve": null,
   "luuY": [
    "Rẽ khỏi quốc lộ 32 ở Tú Lệ, theo đường vào Nậm Có khoảng 15 km tới đầu đường mòn phía bản Tu San; nửa sau đường xấu. Từ đó đi bộ, thường mất 2 ngày 1 đêm, ngủ lán giữa rừng — nên đi cùng người bản dẫn đường và porter. Còn hai lối lên khác từ bản Lùng Cúng và bản Thào Chua Chải.",
    "Đi cùng người bản dẫn đường và porter. Đoàn thường thuê từ một đến ba người tuỳ số khách; họ lo lán, bếp và nước.",
    "Đường vào bản xấu ở nửa sau: xe máy số, tay lái quen đường núi; ô tô thấp gầm không nên vào.",
    "Giày leo núi bám tốt, áo mưa, đèn đội đầu, áo ấm cho đêm ở lán.",
    "Mang rác xuống núi. Rừng trên này còn nguyên vẹn chính vì ít người lên."
   ]
  },
  "en": {
   "name": "Đỉnh Lùng Cúng",
   "type": "summit · 2-day trek",
   "what": "Lùng Cúng peak, 2,913 m, one of the highest summits in Vietnam, reached on foot from the villages north of Tú Lệ.",
   "why": "Not a roadside stop but a trek: mossy old forest, bamboo, grass hills and finally an open summit above the clouds, good for both sunset and sunrise.",
   "when": "Dry season, roughly October to April. Avoid May–August: heavy rain, slippery trails and landslides.",
   "tip": "The usual trek takes 2 days and 1 night with a night in a forest hut; go with a local guide and porters."
  },
  "photo": {
   "src": "/checkin-map/anh/lung-cung.webp",
   "credit": {
    "vi": "Ảnh: NKSTTSSHNVN, CC BY-SA 4.0, Wikimedia Commons",
    "en": "Photo: NKSTTSSHNVN, CC BY-SA 4.0, Wikimedia Commons"
   }
  },
  "photoPending": null
 },
 {
  "id": "lim-thai",
  "n": 4,
  "lat": 21.77888,
  "lon": 104.26939,
  "ele": 750,
  "km": 5.2,
  "fromTuLe": {
   "km": 3.9,
   "min": 5
  },
  "fromClubhouse": {
   "km": 1.9,
   "min": 5
  },
  "vi": {
   "name": "Bản Lìm Thái",
   "type": "Bản người Thái",
   "why": "Nhà sàn, suối trong và ruộng bậc thang ôm quanh bản. Đây cũng là thung lũng dù lượn từ Khau Phạ bay xuống — đứng trong bản ngước lên là thấy dù.",
   "duongDi": [
    "Từ Clubhouse Mebayluon: 1,3 km đường bê tông ra QL32 ở ngã ba bản Lìm, theo QL32 0,0 km, rồi rẽ vào đường nhánh 0,6 km (đường nhỏ 0,6 km). Tổng 1,9 km, khoảng 5 phút lái xe.",
    "Từ chợ Tú Lệ: theo QL32 3,3 km, rồi rẽ vào đường nhánh 0,6 km (đường nhỏ 0,6 km). Tổng 3,9 km, khoảng 5 phút."
   ],
   "mua": "Tháng 5–6 là mùa nước đổ: ruộng loang loáng soi trời, sáng sớm hay có sương. Giữa tháng 9 đến đầu tháng 10 lúa chín vàng, cũng là lúc đông khách nhất. Mỗi năm lịch xê dịch theo thời tiết, và ruộng dưới đáy thung lũng thường chín trước ruộng trên sườn cao. Trong ngày, sáng sớm và chiều muộn nắng xiên, bậc ruộng nổi khối hơn giữa trưa.",
   "ve": null,
   "luuY": [
    "Đường vào bản nhỏ nhưng dễ đi. Trong bản có homestay nhà sàn của người Thái; muốn ngủ lại nên hẹn trước.",
    "Đi chậm trong bản: đường hẹp, có trẻ nhỏ và trâu bò.",
    "Không giẫm lên bờ ruộng mới đắp, không đi vào ruộng lúa đang trổ để chụp ảnh.",
    "Chụp chân dung người bản thì hỏi trước một câu.",
    "Ở lại qua đêm mới thấy được cả chiều muộn lẫn sáng sớm của thung lũng."
   ]
  },
  "en": {
   "name": "Bản Lìm Thái",
   "type": "Thái village",
   "what": "A Thái village on the floor of the Cao Phạ valley. The turn-off leaves Highway QL32 a little over 3 km past Tú Lệ market, just before the road starts climbing Khau Phạ pass.",
   "why": "Stilt houses, a clear stream and rice terraces wrapped around the village. This is also the valley the paragliders fly down into from Khau Phạ — look up and you will see wings overhead.",
   "when": "May–June, when the flooded terraces mirror the sky; mid-September to early October, when the rice is gold.",
   "tip": "The lane into the village is narrow but easy. There are Thái stilt-house homestays; arrange ahead if you want to stay the night."
  },
  "photo": {
   "src": "/checkin-map/anh/lim-thai.webp",
   "credit": {
    "vi": "Ảnh: luhanhvietnam.com.vn / @na_na_0801",
    "en": "Photo: luhanhvietnam.com.vn / @na_na_0801"
   }
  },
  "photoPending": null
 },
 {
  "id": "clubhouse",
  "n": 5,
  "lat": 21.7764187,
  "lon": 104.2636752,
  "ele": 740,
  "km": 5.9,
  "fromTuLe": {
   "km": 4.7,
   "min": 10
  },
  "fromClubhouse": null,
  "vi": {
   "name": "Bãi hạ cánh & Clubhouse Mebayluon",
   "type": "Bãi hạ cánh dù lượn · cất cánh dù lượn có động cơ",
   "why": "Ngồi ở clubhouse xem từng cánh dù lượn vòng rồi tiếp đất giữa ruộng bậc thang. Góc đẹp nhất là quay ngược lên phía đèo: dù nổi trên nền núi.",
   "duongDi": [
    "Từ chợ Tú Lệ: theo QL32 về phía đèo 3,3 km tới ngã ba bản Lìm, rẽ vào đường bê tông 1,3 km. Khoảng 10 phút."
   ],
   "mua": "Dù bay suốt ngày khi trời thuận, 7:00–18:00; thung lũng đẹp nhất mùa nước đổ và mùa lúa chín.",
   "ve": null,
   "luuY": [
    "Từ bãi cất cánh xuống đây khoảng 2,4 km đường chim bay, thấp hơn trên 500 m. Có chỗ nghỉ ngay tại clubhouse."
   ]
  },
  "en": {
   "name": "Mebayluon Clubhouse · landing field",
   "type": "paragliding landing field and clubhouse",
   "what": "The paragliding landing field and the Mebayluon Clubhouse, in Lìm Thái village at the heart of the Cao Phạ valley. Every flight that takes off from Khau Phạ lands here.",
   "why": "Sit at the clubhouse and watch each wing circle down and touch the ground among the rice terraces. The best angle is looking back up at the pass, with the gliders against the mountain.",
   "when": "Wings fly all day when conditions allow, 7:00–18:00; the valley is at its best in the flooded-terrace and golden-rice seasons.",
   "tip": "From the take-off it is about 2.4 km in a straight line and more than 500 m lower. You can stay overnight at the clubhouse."
  },
  "photo": {
   "src": "/checkin-map/anh/clubhouse.webp",
   "credit": {
    "vi": "Ảnh flycam: Mebayluon",
    "en": "Drone photo: Mebayluon"
   }
  },
  "photoPending": null
 },
 {
  "id": "lim-mong",
  "n": 6,
  "lat": 21.77551,
  "lon": 104.24351,
  "ele": 1080,
  "km": 8.4,
  "fromTuLe": {
   "km": 7.1,
   "min": 15
  },
  "fromClubhouse": {
   "km": 5.1,
   "min": 15
  },
  "vi": {
   "name": "Bản Lìm Mông",
   "type": "Bản người Mông · ruộng bậc thang",
   "why": "Từ đường lên bản nhìn xuống là trọn thung lũng ruộng bậc thang dưới chân đèo Khau Phạ — góc chụp mùa vàng quen thuộc nhất của vùng này.",
   "duongDi": [
    "Từ Clubhouse Mebayluon: 1,3 km đường bê tông ra QL32 ở ngã ba bản Lìm, theo QL32 0,0 km, rồi rẽ vào đường nhánh 3,8 km (đường nhỏ 3,7 km, đường bản 0,1 km). Tổng 5,1 km, khoảng 15 phút lái xe.",
    "Từ chợ Tú Lệ: theo QL32 3,3 km, rồi rẽ vào đường nhánh 3,8 km (đường nhỏ 3,7 km, đường bản 0,1 km). Tổng 7,1 km, khoảng 15 phút."
   ],
   "mua": "Mùa nước đổ rơi vào tháng 5–6, khi người Mông dẫn nước vào ruộng để cấy. Mùa lúa chín khoảng giữa tháng 9 đến đầu tháng 10. Ruộng trên cao thường chín muộn hơn ruộng dưới thung lũng một chút, nên có những ngày nhìn từ trên xuống thấy đủ cả xanh lẫn vàng. Chúng tôi đã viết riêng về bay dù lượn mùa nước đổ trên thung lũng Lìm Mông.",
   "ve": null,
   "luuY": [
    "Phải đi qua Lìm Thái rồi mới lên tới nơi. Đường dốc và hẹp, ngày mưa trơn — tay lái chưa quen đường núi nên cân nhắc.",
    "Ngày mưa và ngay sau mưa không nên tự lái lên.",
    "Xuống dốc dùng số thấp, không rà phanh liên tục.",
    "Bản có ít hàng quán; mang theo nước, ăn uống thì quay xuống Lìm Thái hoặc ra Tú Lệ.",
    "Mùa cao điểm, dừng xe gọn vào lề ở các khúc cua để không chắn đường người bản đi làm."
   ]
  },
  "en": {
   "name": "Bản Lìm Mông",
   "type": "Hmông village",
   "what": "A Hmông village clinging to the mountainside on the west of the Cao Phạ valley, roughly 300 m higher than Lìm Thái.",
   "why": "From the road up to the village you look down on the whole terraced valley below Khau Phạ pass — the classic golden-season view of this area.",
   "when": "The flooded-terrace season in May–June and the ripe-rice season from mid-September to early October.",
   "tip": "You pass through Lìm Thái first. The road is steep and narrow, and slippery in rain — think twice if you are new to mountain riding."
  },
  "photo": {
   "src": "/checkin-map/anh/lim-mong.webp",
   "credit": {
    "vi": "Ảnh: travel.com.vn",
    "en": "Photo: travel.com.vn"
   }
  },
  "photoPending": null
 },
 {
  "id": "huy-thanh",
  "n": 7,
  "lat": 21.73816,
  "lon": 104.27888,
  "ele": 1090,
  "km": 11.8,
  "fromTuLe": {
   "km": 10.5,
   "min": 15
  },
  "fromClubhouse": {
   "km": 8.5,
   "min": 15
  },
  "vi": {
   "name": "Trại cá Huy Thanh",
   "type": "Trại cá tầm – cá hồi · nhà hàng",
   "why": "Trại cá tầm, cá hồi bên suối giữa lưng đèo, yên tĩnh, có nhà hàng chế biến cá ngay tại chỗ cùng các món dân tộc và xôi nếp Tú Lệ. Khau Phạ là nơi nghề nuôi cá hồi của vùng này bắt đầu, từ năm 2007.",
   "duongDi": [
    "Từ Clubhouse Mebayluon: 1,3 km đường bê tông ra QL32 ở ngã ba bản Lìm, theo QL32 7,1 km. Tổng 8,5 km, khoảng 15 phút lái xe.",
    "Từ chợ Tú Lệ: theo QL32 10 km. Tổng 10 km, khoảng 15 phút."
   ],
   "mua": "Trại nằm ven quốc lộ nên ghé được quanh năm. Hợp nhất là bữa trưa: buổi sáng bạn đã đi Tú Lệ hoặc bay xong, buổi chiều còn cả con đèo và La Pán Tẩn phía trước. Ngày lạnh, một nồi lẩu cá ở lưng đèo là lý do đủ để dừng xe.",
   "ve": null,
   "luuY": [
    "Nằm ngay ven quốc lộ, tiện tạt vào. Đoàn đông nên gọi đặt bàn trước.",
    "Đoàn đông hoặc đi cuối tuần mùa lúa chín nên gọi đặt bàn trước.",
    "Đoạn đường qua trại là đường đèo, có cua khuất. Giảm tốc và bật xi nhan sớm khi tạt vào, đỗ xe gọn khỏi mặt đường.",
    "Sương mù trên đèo có thể xuống rất nhanh vào chiều muộn. Đừng nán lại quá lâu nếu còn phải vượt đèo."
   ]
  },
  "en": {
   "name": "Trại cá Huy Thanh",
   "type": "sturgeon and salmon farm",
   "what": "The Huy Thanh cold-water sturgeon and salmon farm, with its own restaurant and guesthouse, right beside Highway QL32 halfway up Khau Phạ pass (Tà Chơ village).",
   "why": "A quiet sturgeon and salmon farm beside a stream halfway up the pass, with its own restaurant cooking the fish on site alongside ethnic dishes and Tú Lệ sticky rice.",
   "when": "All year; a natural lunch stop on the long climb to the pass.",
   "tip": "It is right on the highway, so pulling in is easy. Larger groups should phone ahead for a table."
  },
  "photo": {
   "src": "/checkin-map/anh/huy-thanh.webp",
   "credit": {
    "vi": "Ảnh: Fanpage Fan Yên Bái",
    "en": "Photo: Fanpage Fan Yên Bái"
   }
  },
  "photoPending": null
 },
 {
  "id": "khau-pha",
  "n": 8,
  "lat": 21.754889,
  "lon": 104.265694,
  "ele": 1268,
  "km": 15.2,
  "fromTuLe": {
   "km": 13.9,
   "min": 20
  },
  "fromClubhouse": {
   "km": 11.9,
   "min": 20
  },
  "vi": {
   "name": "Bãi cất cánh dù lượn đèo Khau Phạ",
   "type": "Đèo · bãi cất cánh dù lượn",
   "why": "Ban công nhìn thẳng xuống thung lũng Cao Phạ với Lìm Thái, Lìm Mông. Đứng ở mép bãi là thấy từng cánh dù lao ra khoảng không rồi thả dần xuống ruộng bậc thang.",
   "duongDi": [
    "Từ Clubhouse Mebayluon: 1,3 km đường bê tông ra QL32 ở ngã ba bản Lìm, theo QL32 10 km. Tổng 12 km, khoảng 20 phút lái xe.",
    "Từ chợ Tú Lệ: theo QL32 14 km. Tổng 14 km, khoảng 20 phút."
   ],
   "mua": "Mùa nước đổ tháng 5–6, mùa vàng giữa tháng 9 – đầu tháng 10. Ngày nắng có chuyến bay bình minh 6–7 giờ và hoàng hôn 16–17 giờ.",
   "ve": null,
   "luuY": [
    "Xem camera trực tiếp ở bãi cất trước khi lên, và đặt bay trước để được xếp lịch. Điểm cao nhất của mặt đường đèo (khoảng 1.580 m) còn cách gần 5 km nữa về phía Mù Cang Chải."
   ]
  },
  "en": {
   "name": "Khau Phạ paragliding take-off",
   "type": "Khau Phạ pass",
   "what": "The Khau Phạ paragliding take-off, at about 1,268 m beside Highway QL32 on Khau Phạ pass — one of the “four great passes” of north-west Vietnam.",
   "why": "A balcony straight over the Cao Phạ valley, with Lìm Thái and Lìm Mông below. Stand at the edge and watch each wing run off into the air and drift down to the rice terraces.",
   "when": "Flooded terraces in May–June, golden rice from mid-September to early October. On sunny days there are sunrise flights at 6–7 am and sunset flights at 4–5 pm.",
   "tip": "Check the live take-off webcam before you drive up, and book ahead to get a slot. The highest point of the road itself (about 1,580 m) is nearly 5 km further on towards Mù Cang Chải."
  },
  "photo": {
   "src": "/checkin-map/anh/khau-pha.webp",
   "credit": {
    "vi": "Ảnh: Mebayluon (bay đôi từ bãi Khau Phạ)",
    "en": "Photo: Mebayluon (tandem flight from Khau Phạ)"
   }
  },
  "photoPending": null
 },
 {
  "id": "nga-ba-kim",
  "n": 9,
  "lat": 21.7667,
  "lon": 104.172,
  "ele": 1140,
  "km": 30.4,
  "fromTuLe": {
   "km": 29.1,
   "min": 45
  },
  "fromClubhouse": {
   "km": 27.1,
   "min": 45
  },
  "vi": {
   "name": "Ngã Ba Kim",
   "type": "Chợ · ngã ba chia đường",
   "why": "Điểm chia đường: đường nhánh về phía nam lên rừng trúc Púng Luông, còn quốc lộ chạy tiếp lên La Pán Tẩn và đồi Mâm Xôi.",
   "duongDi": [
    "Từ Clubhouse Mebayluon: 1,3 km đường bê tông ra QL32 ở ngã ba bản Lìm, theo QL32 26 km. Tổng 27 km, khoảng 45 phút lái xe.",
    "Từ chợ Tú Lệ: theo QL32 29 km. Tổng 29 km, khoảng 45 phút."
   ],
   "mua": "Ngã ba thì mùa nào cũng như nhau, nhưng con đèo trước nó thì không. Mùa lạnh và những ngày mưa, sương mù hay phủ đoạn đỉnh đèo vào chiều muộn và sáng sớm; nên tính giờ để đổ đèo khi trời còn sáng. Cuối tuần mùa lúa chín (giữa tháng 9 – đầu tháng 10), nhà nghỉ dọc tuyến kín sớm, kể cả ở đây.",
   "ve": null,
   "luuY": [
    "Nhà nghỉ và quán ăn nằm dọc hai bên quốc lộ; đoạn tiếp theo lên La Pán Tẩn còn hơn 5 km.",
    "Đổ xăng ở đây nếu bạn định rẽ vào các đường nhánh: trong bản không có cây xăng.",
    "Xuống đèo dài, phanh nóng. Dừng vài phút cho phanh nguội trước khi đi tiếp.",
    "Thuê xe ôm lên rừng trúc thì hỏi ở các quán quanh ngã ba, và thoả thuận giá cả hai chiều trước.",
    "Mang sẵn tiền mặt cho vé tham quan và xe ôm ở các điểm phía trước."
   ]
  },
  "en": {
   "name": "Ngã Ba Kim",
   "type": "Kim junction",
   "what": "A junction village on Highway QL32 in Púng Luông, with a market, food stalls, guesthouses and a petrol station — the first place to resupply after the descent from Khau Phạ.",
   "why": "The roads part here: a side road heads south up to the Púng Luông bamboo forest, while the highway carries on to La Pán Tẩn and Đồi Mâm Xôi.",
   "when": "Any time of day; fill up and eat here before taking the side roads.",
   "tip": "Guesthouses and restaurants line both sides of the highway; La Pán Tẩn is a little over 5 km further on."
  },
  "photo": {
   "src": "/checkin-map/anh/nga-ba-kim.webp",
   "credit": {
    "vi": "Ảnh: sưu tầm",
    "en": "Photo: collected"
   }
  },
  "photoPending": null
 },
 {
  "id": "rung-truc-pung-luong",
  "n": 10,
  "lat": 21.74147,
  "lon": 104.168,
  "ele": 1320,
  "km": 34.8,
  "fromTuLe": {
   "km": 33.5,
   "min": 55
  },
  "fromClubhouse": {
   "km": 31.5,
   "min": 55
  },
  "vi": {
   "name": "Rừng trúc Púng Luông",
   "type": "Rừng trúc",
   "why": "Rừng trúc hơn 60 năm tuổi: lối mòn nhỏ luồn giữa những thân trúc thẳng tắp, nắng xiên qua tán lá — khung hình hợp nhất khi nắng chếch.",
   "duongDi": [
    "Từ Clubhouse Mebayluon: 1,3 km đường bê tông ra QL32 ở ngã ba bản Lìm, theo QL32 26 km, rồi rẽ vào đường nhánh 4,3 km (đường nhỏ 3,4 km, đường tỉnh 1,0 km). Tổng 32 km, khoảng 55 phút lái xe.",
    "Từ chợ Tú Lệ: theo QL32 29 km, rồi rẽ vào đường nhánh 4,3 km (đường nhỏ 3,4 km, đường tỉnh 1,0 km). Tổng 34 km, khoảng 55 phút."
   ],
   "mua": "Trúc xanh quanh năm, nên đây là điểm cứu cho những chuyến đi lệch mùa lúa. Điều cần tránh không phải mùa mà là mưa: đường đất dốc gặp mưa rất trơn. Mùa lúa chín (giữa tháng 9 – đầu tháng 10), bạn có thể ghép rừng trúc buổi sáng với đồi Mâm Xôi buổi chiều.",
   "ve": "Có thu vé tham quan; các nguồn ghi mức vé khác nhau theo năm nên chúng tôi không ghi con số.",
   "luuY": [
    "Đường nhánh từ quốc lộ dài hơn 4 km, dốc và hẹp, ô tô khó vào: nên thuê xe ôm của người bản, tránh ngày mưa. Có thu vé tham quan.",
    "Có thu vé tham quan; các nguồn ghi mức vé khác nhau theo năm nên chúng tôi không ghi con số.",
    "Thoả thuận giá xe ôm cả hai chiều và thời gian chờ trước khi lên.",
    "Mặc áo dài tay, mang thuốc chống côn trùng; trong rừng ẩm, có muỗi và côn trùng.",
    "Không khắc tên lên thân trúc, không bẻ măng. Rác mang ra ngoài.",
    "Giày đế bám; lối đi trong rừng là đất, sau mưa trơn."
   ]
  },
  "en": {
   "name": "Rừng trúc Púng Luông",
   "type": "Púng Luông bamboo forest",
   "what": "A bamboo forest more than 60 years old in Nả Háng Tủa Chử village, on the mountain south of Ngã Ba Kim; it opened to visitors in 2020.",
   "why": "A bamboo forest more than 60 years old: a narrow path threads between ruler-straight stems, with sunlight slanting through the canopy.",
   "when": "The bamboo is green all year, so any season works.",
   "tip": "The side road from the highway is over 4 km long, steep and narrow, and hard for cars: hire a local motorbike taxi and avoid rainy days. There is an entrance fee."
  },
  "photo": {
   "src": "/checkin-map/anh/rung-truc-pung-luong.webp",
   "credit": {
    "vi": "Ảnh: MIA.vn",
    "en": "Photo: MIA.vn"
   }
  },
  "photoPending": null
 },
 {
  "id": "mam-xoi",
  "n": 11,
  "lat": 21.7928,
  "lon": 104.15194,
  "ele": 1200,
  "km": 36.9,
  "fromTuLe": {
   "km": 35.6,
   "min": 60
  },
  "fromClubhouse": {
   "km": 33.6,
   "min": 60
  },
  "vi": {
   "name": "Đồi Mâm Xôi lớn",
   "type": "Điểm ngắm ruộng bậc thang",
   "why": "Đứng ở sườn đồi đối diện mới thấy trọn những vòng ruộng đồng tâm. Nắng sớm và nắng chiều đều cho ảnh đẹp.",
   "duongDi": [
    "Chỗ rẽ: rời QL32 ở ngã ba 21.7934, 104.1499 (Km 48,8 trên QL32), đi 0,8 km đường bản tới chân đồi; ghim đồi cách QL32 khoảng 190 m đường chim bay (chủ xác nhận ghim 10/10).",
    "Từ Clubhouse Mebayluon: 1,3 km đường bê tông ra QL32 ở ngã ba bản Lìm, theo QL32 31 km, rồi rẽ vào đường nhánh 0,8 km (đường bản 0,5 km, đường mòn 0,3 km). Tổng 34 km, khoảng 60 phút lái xe.",
    "Từ chợ Tú Lệ: theo QL32 35 km, rồi rẽ vào đường nhánh 0,8 km (đường bản 0,5 km, đường mòn 0,3 km). Tổng 36 km, khoảng 60 phút."
   ],
   "mua": "Hai mùa: nước đổ vào tháng 5–6, lúa chín từ giữa tháng 9 đến đầu tháng 10. Trong ngày, nắng sớm và nắng chiều đều cho ảnh đẹp; người săn ảnh thường có mặt từ trước 5 giờ sáng hoặc sau 4 rưỡi chiều. Lưu ý là nắng chiều ở thung lũng này tắt nhanh, nên lên sớm hơn dự tính nửa tiếng.",
   "ve": "Có thu vé tham quan.",
   "luuY": [
    "Rẽ khỏi quốc lộ 32 chưa đầy 1 km. Đoạn cuối dốc: mùa cao điểm gửi xe dưới chân đồi rồi đi bộ hoặc thuê xe ôm của người Mông. Có thu vé tham quan, mức vé đổi theo năm.",
    "Có thu vé tham quan. Các nguồn ghi mức vé khác nhau (đổi theo năm), nên chúng tôi không ghi con số.",
    "Cuối tuần mùa vàng rất đông. Muốn vắng, đi ngày thường hoặc lên thật sớm.",
    "Đi trên bờ ruộng, không giẫm vào lúa. Đây là ruộng người ta đang trồng để ăn.",
    "Sau mưa đường nhánh trơn; đừng cố chạy xe tay ga lên đoạn dốc cuối."
   ]
  },
  "en": {
   "name": "Đồi Mâm Xôi lớn",
   "type": "Raspberry Hill",
   "what": "A round hill of rice terraces stacked like a tray of sticky rice, in La Pán Tẩn — the emblem of Mù Cang Chải, inside the terraced landscape listed as a Special National Monument.",
   "why": "You need to stand on the slope opposite to take in the full set of concentric terraces. Both morning and afternoon light work well.",
   "when": "Flooded terraces in May–June; ripe rice from mid-September to early October, which is also the busiest time.",
   "tip": "Less than 1 km off Highway QL32. The last stretch is steep: in high season leave your vehicle at the bottom and walk, or take a Hmông motorbike taxi. There is an entrance fee, which changes from year to year."
  },
  "photo": {
   "src": "/checkin-map/anh/mam-xoi.webp",
   "credit": {
    "vi": "Ảnh: Báo Thanh Niên / Nguyễn Trình",
    "en": "Photo: Báo Thanh Niên / Nguyễn Trình"
   }
  },
  "photoPending": null
 },
 {
  "id": "garrya",
  "n": 12,
  "lat": 21.80581,
  "lon": 104.14398,
  "ele": 1100,
  "km": 38.3,
  "fromTuLe": {
   "km": 37.1,
   "min": 55
  },
  "fromClubhouse": {
   "km": 35.0,
   "min": 55
  },
  "vi": {
   "name": "Garrya",
   "type": "Khu nghỉ dưỡng",
   "why": "Nằm giữa vùng ruộng bậc thang La Pán Tẩn — chỗ nghỉ tiện nhất để dậy sớm lên Mâm Xôi trước khi đông người.",
   "duongDi": [
    "Từ Clubhouse Mebayluon: 1,3 km đường bê tông ra QL32 ở ngã ba bản Lìm, theo QL32 34 km, rồi rẽ vào đường nhánh 0,2 km (đường bản 0,2 km). Tổng 35 km, khoảng 55 phút lái xe.",
    "Từ chợ Tú Lệ: theo QL32 37 km, rồi rẽ vào đường nhánh 0,2 km (đường bản 0,2 km). Tổng 37 km, khoảng 55 phút."
   ],
   "mua": "Hai mùa đẹp nhất của ruộng quanh đây là mùa nước đổ tháng 5–6 và mùa lúa chín giữa tháng 9 – đầu tháng 10; đó cũng là lúc phòng ở cả vùng căng nhất, nên đặt sớm. Mùa đông Mù Cang Chải lạnh, nhiều sương, vắng khách, hợp với người thích yên tĩnh; khoảng cuối tháng 12 – đầu tháng 1 thường là mùa hoa tớ dày.",
   "ve": null,
   "luuY": [
    "Là khu nghỉ dưỡng tư nhân: muốn vào dùng nhà hàng hay cà phê nên liên hệ trước.",
    "Khách không lưu trú muốn vào dùng nhà hàng hay cà phê nên liên hệ trước.",
    "Từ quốc lộ rẽ vào chỉ một đoạn ngắn; ô tô vào được.",
    "Dậy sớm đi Mâm Xôi thì hỏi lễ tân chuyện xe từ tối hôm trước; mùa cao điểm xe ôm ở chân đồi đông khách từ rất sớm."
   ]
  },
  "en": {
   "name": "Garrya",
   "type": "resort",
   "what": "Banyan Group's Garrya Mù Cang Chải resort in Pú Nhu village, about 2 km along the highway from the Đồi Mâm Xôi turn-off; its design draws on bamboo and Hmông brocade patterns.",
   "why": "It sits among the La Pán Tẩn terraces — the handiest base for an early start up Đồi Mâm Xôi before the crowds.",
   "when": "The flooded-terrace season in May–June and the ripe-rice season from mid-September to early October are the two best times for the fields around it.",
   "tip": "It is a private resort: contact them first if you only want to use the restaurant or café."
  },
  "photo": {
   "src": "/checkin-map/anh/garrya.webp",
   "credit": {
    "vi": "Ảnh: Báo Lào Cai",
    "en": "Photo: Báo Lào Cai"
   }
  },
  "photoPending": null
 },
 {
  "id": "mam-xoi-be",
  "n": 13,
  "lat": 21.80781,
  "lon": 104.15555,
  "ele": 1390,
  "km": 41.2,
  "fromTuLe": {
   "km": 38.3,
   "min": 70
  },
  "fromClubhouse": {
   "km": 36.2,
   "min": 70
  },
  "vi": {
   "name": "Mâm Xôi bé",
   "type": "Điểm ngắm ruộng bậc thang",
   "why": "Tầm nhìn rộng, thu cả ruộng bậc thang lẫn con suối dưới thung lũng; dễ có khung hình không bóng người.",
   "duongDi": [
    "Từ Clubhouse Mebayluon: 1,3 km đường bê tông ra QL32 ở ngã ba bản Lìm, theo QL32 26 km, rồi rẽ vào đường nhánh 9,1 km (đường liên xã 4,7 km, đường nhỏ 3,3 km, đường đất 0,8 km, đường bản 0,2 km). Tổng 36 km, khoảng 70 phút lái xe.",
    "Từ chợ Tú Lệ: theo QL32 29 km, rồi rẽ vào đường nhánh 9,1 km (đường liên xã 4,7 km, đường nhỏ 3,3 km, đường đất 0,8 km, đường bản 0,2 km). Tổng 38 km, khoảng 70 phút.",
    "Ghim của điểm cách đường gần nhất trên bản đồ khoảng 430 m — đoạn cuối phải đi bộ hoặc hỏi người bản."
   ],
   "mua": "Cùng mùa với Mâm Xôi lớn: nước đổ tháng 5–6, lúa chín khoảng giữa tháng 9 – đầu tháng 10. Ruộng ở cao nên có năm chín muộn hơn dưới thấp một chút. Khác với Mâm Xôi lớn, ở đây thời tiết quan trọng hơn giờ giấc: chỉ nên lên khi đường đã khô ít nhất một ngày.",
   "ve": "Chưa thấy nguồn nào ghi điểm này có thu vé; nếu có người thu, hãy hỏi rõ.",
   "luuY": [
    "Đường lên dốc, gồ ghề và rất trơn khi mưa — nên đi cùng người bản hoặc thuê xe ôm, không nên tự lái ngày mưa.",
    "Không đi khi đang mưa hoặc vừa mưa xong. Không đi lúc gần tối.",
    "Đi cùng người bản hoặc xe ôm địa phương; thoả thuận giá cả hai chiều trước.",
    "Chưa thấy nguồn nào ghi điểm này có thu vé; nếu có người thu, hãy hỏi rõ.",
    "Báo cho người ở lại biết bạn đi đâu, bao giờ về.",
    "Mang theo nước uống."
   ]
  },
  "en": {
   "name": "Mâm Xôi bé",
   "type": "Little Raspberry Hill",
   "what": "A smaller raspberry-shaped terraced hill high above La Pán Tẩn, far quieter than the main Đồi Mâm Xôi.",
   "why": "A wide view that takes in both the terraces and the stream on the valley floor; an empty frame is easy to get.",
   "when": "Same seasons as the main hill: May–June and mid-September to early October.",
   "tip": "The track up is steep, rough and very slippery in rain — go with a local or hire a motorbike taxi, and do not ride it yourself on a wet day."
  },
  "photo": {
   "src": "/checkin-map/anh/mam-xoi-be.webp",
   "credit": {
    "vi": "Ảnh: VnExpress / Khang Phủ",
    "en": "Photo: VnExpress / Khang Phủ"
   }
  },
  "photoPending": null
 },
 {
  "id": "song-lung-khung-long",
  "n": 14,
  "lat": 21.80106,
  "lon": 104.12939,
  "ele": 1460,
  "km": 46.1,
  "fromTuLe": {
   "km": 44.9,
   "min": 80
  },
  "fromClubhouse": {
   "km": 42.8,
   "min": 80
  },
  "vi": {
   "name": "Sống Lưng Khủng Long",
   "type": "Dông núi · điểm ngắm ruộng bậc thang",
   "why": "Đi dọc sống núi như đi trên lưng một con vật khổng lồ. Từ đây nhìn được cùng lúc ruộng bậc thang của Dế Xu Phình, Chế Cu Nha, La Pán Tẩn và Mồ Dề.",
   "duongDi": [
    "Từ Clubhouse Mebayluon: 1,3 km đường bê tông ra QL32 ở ngã ba bản Lìm, theo QL32 37 km, rồi rẽ vào đường nhánh 4,1 km (đường bản 3,4 km, đường đất 0,4 km, đường mòn 0,3 km, đường nhỏ 0,1 km). Tổng 43 km, khoảng 80 phút lái xe.",
    "Từ chợ Tú Lệ: theo QL32 41 km, rồi rẽ vào đường nhánh 4,1 km (đường bản 3,4 km, đường đất 0,4 km, đường mòn 0,3 km, đường nhỏ 0,1 km). Tổng 45 km, khoảng 80 phút."
   ],
   "mua": "Mùa nước đổ tháng 5–6 và mùa lúa chín giữa tháng 9 – đầu tháng 10. Báo Lào Cai xếp điểm này vào buổi sáng, ngay sau Mâm Xôi; có bài lại chọn lúc hoàng hôn. Sáng sớm dễ gặp mây dưới thung lũng; chiều muộn nắng xiên làm nổi bậc ruộng, nhưng bạn phải tính giờ xuống trước khi tối.",
   "ve": "Chưa có nguồn rõ ràng về việc thu vé ở đây; nếu có người thu, hỏi rõ trước.",
   "luuY": [
    "Đường nhánh rời quốc lộ 32 ở phía Chế Cu Nha, leo dốc hơn 4 km; phần lớn đã đổ bê tông, đoạn cuối đất đá và trơn khi mưa. Gửi xe rồi đi bộ 15–20 phút. Không nên lên lúc trời tối; hỏi người bản lối vào.",
    "Không lên khi trời tối hoặc sắp tối: đoạn cuối đường xấu, không có đèn.",
    "Sau mưa, đoạn đất đá rất trơn. Xe tay ga không nên lên; thuê xe ôm của người bản.",
    "Sống núi trống gió. Mang áo khoác, giữ mũ nón và thiết bị chụp cho chắc.",
    "Chưa có nguồn rõ ràng về việc thu vé ở đây; nếu có người thu, hỏi rõ trước."
   ]
  },
  "en": {
   "name": "Sống Lưng Khủng Long",
   "type": "ridge viewpoint",
   "what": "A narrow ridge above Chế Cu Nha, reached by a side road climbing more than 4 km from Highway QL32 and a 15–20 minute walk.",
   "why": "Walking along the ridge feels like walking on the back of a giant animal; from here you see the terraces of Dế Xu Phình, Chế Cu Nha, La Pán Tẩn and Mồ Dề at once.",
   "when": "Flooded terraces in May–June, golden rice from mid-September to early October.",
   "tip": "Do not go up after rain or close to dark: the last stretch is rough and unlit."
  },
  "photo": {
   "src": "/checkin-map/anh/song-lung-khung-long.webp",
   "credit": {
    "vi": "Ảnh: VnExpress / Mùa A Giàng",
    "en": "Photo: VnExpress / Mùa A Giàng"
   }
  },
  "photoPending": null
 },
 {
  "id": "rung-truc-mcc",
  "n": 15,
  "lat": 21.84462,
  "lon": 104.11658,
  "ele": 1310,
  "km": 47,
  "fromTuLe": {
   "km": 45.7,
   "min": 75
  },
  "fromClubhouse": {
   "km": 43.7,
   "min": 75
  },
  "vi": {
   "name": "Rừng trúc Mù Cang Chải",
   "type": "Rừng trúc",
   "why": "Rừng trúc Mồ Dề, gần thị trấn nhất (khoảng 3,5 km): lối đi nhỏ giữa những thân trúc cao, yên tĩnh và mát quanh năm.",
   "duongDi": [
    "Từ Clubhouse Mebayluon: 1,3 km đường bê tông ra QL32 ở ngã ba bản Lìm, theo QL32 41 km, rồi rẽ vào đường nhánh 1,8 km (đường bản 1,8 km). Tổng 44 km, khoảng 75 phút lái xe.",
    "Từ chợ Tú Lệ: theo QL32 44 km, rồi rẽ vào đường nhánh 1,8 km (đường bản 1,8 km). Tổng 46 km, khoảng 75 phút."
   ],
   "mua": "Trúc xanh quanh năm. Sáng sớm vắng người và nắng còn xiên; giữa trưa nắng gắt trên tán, trong rừng chênh sáng mạnh nên khó chụp. Ngày mưa và ngay sau mưa thì không nên lên vì dốc trơn.",
   "ve": null,
   "luuY": [
    "Chỉ cách trung tâm vài cây số nhưng đường khó đi — nên thuê xe ôm hoặc taxi địa phương và dành ít nhất một giờ.",
    "Thuê xe ôm hoặc taxi địa phương từ thị trấn; thoả thuận giá và thời gian chờ trước.",
    "Giày đế bám, áo dài tay, thuốc chống côn trùng.",
    "Không khắc chữ lên thân trúc, không bẻ măng, không để lại rác.",
    "Về vé: chúng tôi chưa có nguồn chắc chắn cho điểm này; mang sẵn ít tiền lẻ."
   ]
  },
  "en": {
   "name": "Rừng trúc Mù Cang Chải",
   "type": "bamboo forest, Háng Sung village",
   "what": "A bamboo forest in Háng Sung village (Mồ Dề), on the mountainside east of Mù Cang Chải town.",
   "why": "The Mồ Dề bamboo forest, the closest to town (about 3.5 km): a small path between tall stems, quiet and cool all year.",
   "when": "Green all year; fewest people early in the morning.",
   "tip": "Only a few kilometres from the centre, but the road is rough — take a local motorbike taxi or taxi and allow at least an hour."
  },
  "photo": {
   "src": "/checkin-map/anh/rung-truc-mcc.webp",
   "credit": {
    "vi": "Ảnh: Znews / Mùa A Giàng",
    "en": "Photo: Znews / Mùa A Giàng"
   }
  },
  "photoPending": null
 },
 {
  "id": "mu-cang-chai",
  "n": 16,
  "lat": 21.85063,
  "lon": 104.08957,
  "ele": 950,
  "km": 47.7,
  "fromTuLe": {
   "km": 46.4,
   "min": 70
  },
  "fromClubhouse": {
   "km": 44.4,
   "min": 70
  },
  "vi": {
   "name": "Mù Cang Chải",
   "type": "Thị trấn",
   "why": "Điểm cuối của tuyến và là chỗ nghỉ đêm để hôm sau lên Móng Ngựa, Kim Nọi hay rừng trúc.",
   "duongDi": [
    "Từ Clubhouse Mebayluon: 1,3 km đường bê tông ra QL32 ở ngã ba bản Lìm, theo QL32 43 km. Tổng 44 km, khoảng 70 phút lái xe.",
    "Từ chợ Tú Lệ: theo QL32 46 km. Tổng 46 km, khoảng 70 phút."
   ],
   "mua": "Cuối tuần mùa lúa chín phòng kín rất sớm.",
   "ve": null,
   "luuY": [
    "Nên đặt phòng trước vào mùa cao điểm. Móng Ngựa cách trung tâm khoảng 2 km, rừng trúc Háng Sung vài cây số."
   ]
  },
  "en": {
   "name": "Mù Cang Chải",
   "type": "Mù Cang Chải town",
   "what": "A small town on the Nậm Kim stream, the hub of the Mù Cang Chải rice-terrace country, with a market, guesthouses, restaurants and a petrol station.",
   "why": "The end of the route, and the place to sleep before heading up to Móng Ngựa, Kim Nọi or the bamboo forest the next day.",
   "when": "On ripe-rice weekends rooms sell out very early.",
   "tip": "Book ahead in high season. Móng Ngựa is about 2 km from the centre and the Háng Sung bamboo forest a few kilometres."
  },
  "photo": {
   "src": "/checkin-map/anh/mu-cang-chai.webp",
   "credit": {
    "vi": "Ảnh: Việt Nam News / Lê Trung Kiên",
    "en": "Photo: Việt Nam News / Lê Trung Kiên"
   }
  },
  "photoPending": null
 },
 {
  "id": "mong-ngua",
  "n": 17,
  "lat": 21.8494,
  "lon": 104.10296,
  "ele": 1210,
  "km": 48.9,
  "fromTuLe": {
   "km": 47.7,
   "min": 75
  },
  "fromClubhouse": {
   "km": 45.7,
   "min": 75
  },
  "vi": {
   "name": "Vành Móng Ngựa",
   "type": "Điểm ngắm ruộng bậc thang",
   "why": "Nhìn từ trên cao, các thửa ruộng vòng cung khép lại như một chiếc móng ngựa.",
   "duongDi": [
    "Từ Clubhouse Mebayluon: 1,3 km đường bê tông ra QL32 ở ngã ba bản Lìm, theo QL32 43 km, rồi rẽ vào đường nhánh 1,7 km (đường bản 1,6 km, đường đất 0,1 km). Tổng 46 km, khoảng 75 phút lái xe.",
    "Từ chợ Tú Lệ: theo QL32 46 km, rồi rẽ vào đường nhánh 1,7 km (đường bản 1,6 km, đường đất 0,1 km). Tổng 48 km, khoảng 75 phút."
   ],
   "mua": "Các bài hướng dẫn gần như đồng thanh: Móng Ngựa đẹp nhất vào nắng chiều, khoảng 16 giờ. Lúc đó nắng xiên, từng bậc ruộng có một nửa sáng một nửa tối, và đường cong của móng ngựa hiện rõ nhất. Báo Lào Cai cũng xếp nơi này làm điểm ngắm hoàng hôn trong lịch một ngày ở Mù Cang Chải.",
   "ve": "Có thu vé tham quan; mức vé các nguồn ghi không giống nhau nên chúng tôi không ghi con số.",
   "luuY": [
    "Cách trung tâm thị trấn khoảng 2 km; đường đã đổ bê tông nhưng dốc nhiều đoạn. Có thu vé tham quan.",
    "Có thu vé tham quan; mức vé các nguồn ghi không giống nhau nên chúng tôi không ghi con số.",
    "Nắng chiều tắt nhanh. Có mặt trước 4 giờ, và xuống trước khi trời tối hẳn.",
    "Xuống dốc bê tông dùng số thấp; đường hẹp, nhường xe đi lên.",
    "Cuối tuần mùa vàng rất đông; ngày thường dễ chịu hơn nhiều."
   ]
  },
  "en": {
   "name": "Vành Móng Ngựa",
   "type": "Horseshoe Hill, Sáng Nhù village",
   "what": "A hill of rice terraces curved like a horseshoe in Sáng Nhù village (Mồ Dề), just above Mù Cang Chải town.",
   "why": "Seen from above, the arcs of the terraces close into the shape of a horseshoe.",
   "when": "Best in afternoon light, around 4 pm; flooded terraces in May–June and ripe rice from mid-September to early October.",
   "tip": "About 2 km from the town centre; the road is concreted but steep in places. There is an entrance fee."
  },
  "photo": {
   "src": "/checkin-map/anh/mong-ngua.webp",
   "credit": {
    "vi": "Ảnh: Báo Thanh Niên / Nguyễn Trình",
    "en": "Photo: Báo Thanh Niên / Nguyễn Trình"
   }
  },
  "photoPending": null
 },
 {
  "id": "kim-noi",
  "n": 18,
  "lat": 21.83367,
  "lon": 104.09901,
  "ele": 1240,
  "km": 51.6,
  "fromTuLe": {
   "km": 45.5,
   "min": 90
  },
  "fromClubhouse": {
   "km": 43.5,
   "min": 90
  },
  "vi": {
   "name": "Kim Nọi",
   "type": "Điểm ngắm ruộng bậc thang",
   "why": "Vắng hơn Mâm Xôi và Móng Ngựa; từ mỏm đá thấy những “võng lúa” uốn lượn nối nhau.",
   "duongDi": [
    "Từ Clubhouse Mebayluon: 1,3 km đường bê tông ra QL32 ở ngã ba bản Lìm, theo QL32 37 km, rồi rẽ vào đường nhánh 4,8 km (đường đất 3,6 km, đường bản 1,2 km). Tổng 44 km, khoảng 90 phút lái xe.",
    "Từ chợ Tú Lệ: theo QL32 41 km, rồi rẽ vào đường nhánh 4,8 km (đường đất 3,6 km, đường bản 1,2 km). Tổng 46 km, khoảng 90 phút."
   ],
   "mua": "Mùa nước đổ tháng 5–6 và mùa lúa chín giữa tháng 9 – đầu tháng 10. Các nguồn không chỉ định giờ đẹp riêng cho Kim Nọi. Theo kinh nghiệm chung với ruộng bậc thang, nắng xiên buổi sáng sớm và chiều muộn làm nổi bậc ruộng hơn nắng đứng bóng; nếu chiều bạn đã dành cho Móng Ngựa thì buổi sáng là lúc hợp để lên đây.",
   "ve": "Chưa thấy nguồn nào ghi điểm này có thu vé.",
   "luuY": [
    "Đường lên đã đổ bê tông, xe máy đi thuận, ô tô nhỏ cũng lên được; đoạn cuối phải đi bộ khoảng 300 m.",
    "Đi ô tô thì dừng ở chỗ rộng, đừng cố vào sâu: đường hẹp, quay đầu khó.",
    "Mang giày đế bám cho 300 m đi bộ và cho mặt đá.",
    "Chưa thấy nguồn nào ghi điểm này có thu vé.",
    "Ăn uống, đổ xăng thì quay về thị trấn Mù Cang Chải."
   ]
  },
  "en": {
   "name": "Kim Nọi",
   "type": "village and rock viewpoint",
   "what": "Kim Nọi village lies on the mountainside south of the town; the viewpoint is a high rock outcrop looking down over a whole valley of terraces.",
   "why": "Quieter than Đồi Mâm Xôi and Móng Ngựa; from the rock you see the hammock-shaped folds of rice running into one another.",
   "when": "The flooded-terrace season in May–June and the ripe-rice season from mid-September to early October.",
   "tip": "The road up is concreted and fine for motorbikes, and small cars can make it; the last 300 m or so is on foot."
  },
  "photo": {
   "src": "/checkin-map/anh/kim-noi.webp",
   "credit": {
    "vi": "Ảnh: VnExpress / Giàng A Chay",
    "en": "Photo: VnExpress / Giàng A Chay"
   }
  },
  "photoPending": null
 }
] as const;

/** Thứ tự 18 điểm — cũng là phép kiểm kiểu: mã điểm sai thì tsc báo lỗi ở đây. */
export const CK_STOP_ORDER: readonly CkStopId[] = CK_STOPS.map((s) => s.id);
