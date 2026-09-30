// lib/policies/vi.ts
/**
 * Nội dung các trang chính sách — TIẾNG VIỆT (bản chuẩn).
 *
 * Mọi điều khoản ở đây phải khớp với những gì web đang nói ở chỗ khác
 * (xem danh sách nguồn ở lib/policies/index.ts). Không tự thêm con số mới: mốc
 * nào web chưa có thì lấy từ POLICY_ASSUMPTIONS (chờ chủ xác nhận).
 */
import { INSURANCE_PROVIDER_NAME, LEGAL_ENTITY } from "@/lib/legal-entity";

import {
  entityInfoHtml,
  pad2,
  POLICY_ASSUMPTIONS as A,
  policyLink,
  type PolicyDoc,
  type PolicySlug,
} from "./shared";

const L = (slug: PolicySlug, text: string) => policyLink(slug, "vi", text);
const E = LEGAL_ENTITY;
const HOTLINE = "0964 073 555 – 0385 907 789 (gọi, Zalo, WhatsApp)";

const dieuKhoan = `
<p>Website <b>www.mebayluon.com</b> (sau đây gọi là “Website”) thuộc sở hữu và do <b>${E.legalName}</b> (tên giao dịch <b>${E.tradeName}</b>, sau đây gọi là “Mebayluon” hoặc “chúng tôi”) vận hành. Khi truy cập, sử dụng Website hoặc đặt dịch vụ qua Website, khách hàng được hiểu là đã đọc, hiểu và đồng ý với các điều khoản dưới đây.</p>

<h2>1. Phạm vi áp dụng</h2>
<ul>
  <li>Website giới thiệu và nhận đặt các dịch vụ: bay dù lượn đôi (khách bay cùng phi công), bay dù lượn gắn động cơ (PPG), các dịch vụ đi kèm (xe đón trả, quay chụp flycam/camera 360…), đặt phòng homestay và giới thiệu sản phẩm, khóa học dù lượn.</li>
  <li>Điều khoản này là <b>điều kiện giao dịch chung</b> áp dụng cho mọi giao dịch trên Website. Riêng việc tham gia bay còn chịu <a href="/terms">Điều khoản &amp; Cam kết khi tham gia bay dù lượn</a> — văn bản khách tích đồng ý ở bước xác nhận khi đặt bay. Nếu hai văn bản có điểm khác nhau về việc tham gia bay, áp dụng văn bản Điều khoản &amp; Cam kết đó.</li>
  <li>Các chính sách liên quan là một phần của điều khoản này: ${L("thanh-toan", "Chính sách thanh toán")}, ${L("huy-doi-lich-hoan-tien", "Chính sách hủy, đổi lịch và hoàn tiền")}, ${L("cung-cap-dich-vu", "Chính sách cung cấp dịch vụ")}, ${L("bao-mat-thong-tin", "Chính sách bảo mật thông tin cá nhân")} và ${L("giai-quyet-khieu-nai", "Cơ chế giải quyết khiếu nại, tranh chấp")}.</li>
</ul>

<h2>2. Quy trình đặt dịch vụ</h2>
<ol>
  <li>Khách chọn điểm bay, gói bay và dịch vụ tùy chọn tại trang <a href="/booking">Đặt bay</a>; hoặc liên hệ hotline/Zalo/WhatsApp ${HOTLINE}.</li>
  <li>Khách nhập ngày bay, khung giờ, thông tin liên hệ và thông tin từng khách bay (họ tên, ngày sinh, giới tính, số CCCD/hộ chiếu, cân nặng, quốc tịch).</li>
  <li>Website hiển thị bảng tóm tắt: dịch vụ đã chọn, chi tiết giá và tổng tiền. Khách kiểm tra lại, đọc và tích đồng ý Điều khoản &amp; Cam kết, rồi bấm Xác nhận.</li>
  <li>Website cấp <b>mã booking</b>, gửi email xác nhận (kèm vé bay) tới địa chỉ email khách cung cấp. Nhân viên Mebayluon liên hệ khách trong vòng <b>03 giờ</b> sau khi nhận được booking để xác nhận lịch bay, dịch vụ và điều kiện thời tiết.</li>
  <li>Giao dịch được coi là xác lập khi Mebayluon xác nhận booking với khách (qua điện thoại, Zalo, WhatsApp hoặc email).</li>
  <li>Khách có thể tự tra cứu và sửa booking (ngày, giờ, số khách, thông tin liên hệ, điểm đón, thông tin khách) hoặc gửi yêu cầu hủy tại trang <a href="/booking/sua">Sửa booking</a> bằng mã booking và số điện thoại đã đặt, trước <b>18:00 ngày hôm trước ngày bay</b>. Sau mốc này, vui lòng gọi hotline.</li>
</ol>

<h2>3. Giá dịch vụ</h2>
<ul>
  <li>Giá niêm yết bằng đồng Việt Nam (VNĐ), <b>đã bao gồm thuế GTGT (VAT)</b>; công ty có xuất hóa đơn GTGT theo yêu cầu. Số tiền quy đổi sang USD (nếu có) chỉ để tham khảo.</li>
  <li>Giá áp dụng theo bảng giá hiển thị tại thời điểm khách đặt dịch vụ. Tại một số điểm bay, ngày cuối tuần và ngày lễ có mức giá riêng, đã hiển thị khi đặt. Ưu đãi nhóm (nếu có) được tự động áp dụng theo số lượng khách.</li>
  <li>Các hạng mục đã bao gồm trong giá (ví dụ ảnh &amp; video GoPro, nước uống, bảo hiểm, giấy chứng nhận… tùy điểm bay) được liệt kê ở bước chọn gói và bảng xác nhận. Dịch vụ tùy chọn (xe đón trả, flycam, camera 360…) tính thêm theo giá hiển thị.</li>
  <li>Khi khách đổi ngày bay hoặc số khách, giá được tính lại theo bảng giá của ngày/số khách mới.</li>
</ul>

<h2>4. Quyền và nghĩa vụ của khách hàng</h2>
<ul>
  <li>Cung cấp thông tin chính xác, trung thực (họ tên, ngày sinh, giấy tờ tùy thân, cân nặng, tình trạng sức khỏe). Khai sai hoặc che giấu thông tin có thể bị từ chối bay vì lý do an toàn theo Điều khoản &amp; Cam kết.</li>
  <li>Tuân thủ hướng dẫn an toàn của phi công và nhân viên điều hành; có mặt đúng giờ hẹn.</li>
  <li>Thanh toán đầy đủ theo ${L("thanh-toan", "Chính sách thanh toán")}.</li>
  <li>Được cung cấp đầy đủ thông tin về dịch vụ, giá, điều kiện giao dịch trước khi đặt; được đổi lịch, hủy và hoàn tiền theo ${L("huy-doi-lich-hoan-tien", "Chính sách hủy, đổi lịch và hoàn tiền")}; được bảo vệ thông tin cá nhân và được khiếu nại theo quy định.</li>
  <li>Không sử dụng Website vào mục đích gian lận, đặt chỗ giả, phát tán mã độc, thu thập trái phép dữ liệu hoặc gây cản trở hoạt động của Website.</li>
</ul>

<h2>5. Quyền và nghĩa vụ của Mebayluon</h2>
<ul>
  <li>Cung cấp dịch vụ đúng như mô tả và xác nhận; công khai giá, điều kiện giao dịch và các chính sách trên Website.</li>
  <li>Bố trí phi công đã được đào tạo chuyên nghiệp, có chứng nhận chuyên môn, và trang thiết bị phù hợp; ưu tiên an toàn bay trên hết.</li>
  <li>Được từ chối, dời hoặc hủy chuyến bay khi thời tiết hoặc điều kiện thực tế không bảo đảm an toàn, hoặc khi khách không đáp ứng điều kiện tham gia bay — theo ${L("huy-doi-lich-hoan-tien", "Chính sách hủy, đổi lịch và hoàn tiền")}.</li>
  <li>Bảo mật thông tin khách hàng theo ${L("bao-mat-thong-tin", "Chính sách bảo mật thông tin cá nhân")}.</li>
  <li>Tiếp nhận và giải quyết khiếu nại theo ${L("giai-quyet-khieu-nai", "Cơ chế giải quyết khiếu nại, tranh chấp")}.</li>
</ul>

<h2>6. Sở hữu trí tuệ</h2>
<p>Nội dung trên Website (văn bản, hình ảnh, video, logo, thiết kế) thuộc quyền sở hữu của Mebayluon hoặc được sử dụng hợp pháp. Không sao chép, sử dụng cho mục đích thương mại khi chưa có sự đồng ý bằng văn bản của Mebayluon. Nội dung trích dẫn từ nguồn bên thứ ba được ghi rõ nguồn.</p>

<h2>7. Giới hạn trách nhiệm đối với Website</h2>
<ul>
  <li>Thông tin thời tiết, dự báo bay và bài viết kiến thức trên Website chỉ mang tính tham khảo; quyết định bay cuối cùng thuộc về phi công tại hiện trường.</li>
  <li>Website có thể chứa liên kết tới website của bên thứ ba (đối tác, mạng xã hội). Mebayluon không chịu trách nhiệm về nội dung và chính sách của các website đó.</li>
  <li>Mebayluon nỗ lực duy trì Website hoạt động liên tục, chính xác, nhưng có thể tạm ngừng để bảo trì hoặc vì sự cố kỹ thuật ngoài ý muốn. Khi có sai sót về giá hoặc thông tin hiển thị, Mebayluon sẽ liên hệ khách để thống nhất trước khi cung cấp dịch vụ; khách có quyền hủy booking miễn phí nếu không đồng ý.</li>
</ul>

<h2>8. Sửa đổi điều khoản</h2>
<p>Mebayluon có thể cập nhật điều khoản và các chính sách. Ngày cập nhật được ghi ở đầu mỗi trang. Bản áp dụng cho mỗi booking là bản đang hiển thị tại thời điểm khách xác nhận đặt dịch vụ.</p>

<h2>9. Luật áp dụng</h2>
<p>Điều khoản này được điều chỉnh theo pháp luật Việt Nam. Tranh chấp được giải quyết theo ${L("giai-quyet-khieu-nai", "Cơ chế giải quyết khiếu nại, tranh chấp")}.</p>

<h2>10. Thông tin doanh nghiệp</h2>
${entityInfoHtml("vi")}
`;

const thanhToan = `
<p>Chính sách này quy định cách khách hàng thanh toán cho các dịch vụ đặt qua Website <b>www.mebayluon.com</b> và các kênh liên hệ của ${E.tradeName}.</p>

<h2>1. Thời điểm thanh toán</h2>
<ul>
  <li>Đặt dịch vụ trên Website <b>không yêu cầu thanh toán trực tuyến</b>. Khách thanh toán <b>trực tiếp tại điểm bay trước giờ cất cánh</b>, trừ trường hợp hai bên có thỏa thuận khác bằng văn bản (tin nhắn, email).</li>
  <li>Trong một số trường hợp — quan trọng nhất là <b>đặt phòng homestay</b>, ngoài ra là nhóm đông, dịch vụ xe riêng, ngày cao điểm — nhân viên có thể đề nghị khách chuyển khoản trước một phần (tiền cọc) hoặc toàn bộ. Số tiền, nội dung và tài khoản nhận sẽ được thông báo rõ khi xác nhận booking. Khoản đã trả trước được xử lý hoàn theo ${L("huy-doi-lich-hoan-tien", "Chính sách hủy, đổi lịch và hoàn tiền")}.</li>
</ul>

<h2>2. Phương thức thanh toán</h2>
<ul>
  <li><b>Tiền mặt</b> (VNĐ) tại điểm bay.</li>
  <li><b>Chuyển khoản ngân hàng</b> vào tài khoản đứng tên <b>${E.legalName}</b>. Nhân viên sẽ gửi thông tin chuyển khoản của công ty khi xác nhận đặt chỗ, qua kênh chính thức (hotline, Zalo, WhatsApp, email ${E.email}). Vui lòng ghi đúng nội dung chuyển khoản (mã booking) được hướng dẫn.</li>
  <li><b>Thẻ tín dụng / thẻ ghi nợ</b> phổ biến, tại điểm bay.</li>
  <li><b>PayPal</b> — theo hướng dẫn của nhân viên khi xác nhận booking.</li>
</ul>
<p>Website <b>không có cổng thanh toán trực tuyến</b> và <b>không thu thập, không lưu trữ</b> số thẻ, mã bảo mật thẻ hay thông tin tài khoản ngân hàng của khách.</p>

<h2>3. Đồng tiền và giá</h2>
<ul>
  <li>Giá niêm yết và thanh toán bằng đồng Việt Nam (VNĐ). Số tiền USD hiển thị (nếu có) chỉ là số quy đổi tham khảo.</li>
  <li>Số tiền phải thanh toán là tổng tiền đã xác nhận trong booking (giá chuyến bay theo bảng giá tại thời điểm đặt, cộng dịch vụ tùy chọn, trừ ưu đãi nếu có), cộng các chi phí khách phát sinh thêm tại chỗ theo yêu cầu của khách.</li>
</ul>

<h2>4. Thuế và hóa đơn</h2>
<ul>
  <li>Giá niêm yết trên Website <b>đã bao gồm thuế giá trị gia tăng (VAT)</b>.</li>
  <li>${E.legalName} có xuất <b>hóa đơn GTGT</b>. Khách cần hóa đơn vui lòng cung cấp thông tin xuất hóa đơn (tên đơn vị/cá nhân, mã số thuế, địa chỉ, email nhận hóa đơn) khi đặt dịch vụ (ô yêu cầu đặc biệt) hoặc khi thanh toán.</li>
</ul>

<h2>5. An toàn khi thanh toán</h2>
<ul>
  <li>Chỉ chuyển khoản theo thông tin do Mebayluon gửi qua các kênh chính thức nêu trên. Nếu nhận được yêu cầu chuyển tiền từ nguồn lạ hoặc thông tin tài khoản khác thường, vui lòng gọi hotline ${HOTLINE} để xác minh trước khi chuyển.</li>
  <li>Khi đã thanh toán, khách được xác nhận qua tin nhắn/email hoặc biên nhận tại quầy; vui lòng giữ lại để đối chiếu khi cần.</li>
</ul>

<h2>6. Thông tin doanh nghiệp</h2>
${entityInfoHtml("vi")}
`;

const huyDoi = `
<p>Bay dù lượn phụ thuộc 100% vào điều kiện thời tiết, đặc biệt là gió. Chính sách này quy định việc đổi lịch, hủy bay và hoàn tiền, phù hợp với <a href="/terms">Điều khoản &amp; Cam kết khi tham gia bay dù lượn</a> mà khách đồng ý khi đặt bay.</p>

<h2>1. Hủy hoặc hoãn do thời tiết và bất khả kháng</h2>
<ul>
  <li>Lịch bay có thể thay đổi, dời giờ hoặc hủy do thời tiết xấu, gió không bảo đảm an toàn hoặc các yếu tố bất khả kháng khác. Trong các trường hợp này, khách được <b>đổi lịch hoặc hủy bay hoàn toàn miễn phí</b>; khoản đã thanh toán trước (nếu có) được hoàn lại đầy đủ hoặc chuyển sang lịch bay mới theo lựa chọn của khách.</li>
  <li>Khách cũng được đổi lịch hoặc hủy bay miễn phí trong các trường hợp bất khả kháng hợp lý khác.</li>
  <li>Có những ngày thời tiết xấu làm chậm lịch bay, dẫn tới dồn khách; khi đó chuyến bay của khách có thể phải dời lịch mà không báo trước được. An toàn bay luôn là ưu tiên cao nhất.</li>
  <li>Thời tiết có thể thay đổi bất ngờ — khách vui lòng gọi xác nhận thời tiết bay với Mebayluon trước khi xuất phát.</li>
</ul>

<h2>2. Khách đổi lịch hoặc hủy vì lý do cá nhân</h2>
<ul>
  <li>Lịch bay linh động: khách được đổi lịch hoặc hủy và <b>hoàn tiền đầy đủ</b> (khoản đã thanh toán trước, nếu có), <b>kể cả khi hủy trong ngày bay</b>, với điều kiện <b>báo trước giờ đón</b> (nếu có đặt xe) <b>hoặc trước giờ bay đã hẹn</b>, qua hotline, Zalo, WhatsApp hoặc email.</li>
  <li>Khách có thể tự sửa booking hoặc gửi yêu cầu hủy trực tuyến tại trang <a href="/booking/sua">Sửa booking</a> trước <b>18:00 ngày hôm trước ngày bay</b>. Sau mốc này, hoặc khi booking đã được điều phối/xuất vé, vui lòng gọi hotline ${HOTLINE} — quyền hủy và hoàn tiền đầy đủ vẫn giữ nguyên nếu khách báo trước giờ đón/giờ bay.</li>
  <li>Nếu khách <b>không báo trước</b> mà không có mặt, hoặc hủy sau khi đã sử dụng một phần dịch vụ (ví dụ xe đã đón, bảo hiểm đã kích hoạt, đồ uống hoặc dịch vụ khác đã dùng), khách thanh toán các chi phí thực tế đã phát sinh và được hoàn lại phần tiền còn lại (nếu đã thanh toán trước).</li>
  <li>Khách đến muộn quá 30 phút so với giờ hẹn mà không báo trước được coi là hủy không báo trước.</li>
</ul>

<h2>3. Trường hợp không hoàn tiền</h2>
<ul>
  <li>Khách bị từ chối bay vì khai sai hoặc che giấu tình trạng sức khỏe, cân nặng, độ tuổi.</li>
  <li>Khách bị từ chối bay vì say xỉn, mất kiểm soát hành vi hoặc có hành vi không phù hợp, ảnh hưởng an toàn.</li>
  <li>Phi công dừng hoặc rút ngắn chuyến bay vì yếu tố an toàn; hoặc thời lượng bay ngắn hơn dự kiến do điều kiện gió (dù lượn không động cơ phụ thuộc hoàn toàn vào gió).</li>
</ul>

<h2>4. Dịch vụ quay chụp đi kèm</h2>
<ul>
  <li>Nếu dịch vụ ghi hình trả phí (flycam, camera 360…) không thực hiện được hoặc không bảo đảm chất lượng do lỗi kỹ thuật ngoài ý muốn, <b>phí dịch vụ ghi hình được hoàn lại 100%</b>; chi phí chuyến bay không hoàn vì chuyến bay vẫn đã được thực hiện đầy đủ, an toàn.</li>
  <li>Dịch vụ flycam có thể không luôn sẵn có; nếu không thực hiện được, phí flycam được hoàn lại 100%.</li>
</ul>

<h2>5. Cách thức và thời hạn hoàn tiền</h2>
<ul>
  <li>Khoản hoàn được trả bằng tiền mặt tại điểm bay hoặc chuyển khoản vào tài khoản khách cung cấp (khoản thanh toán qua PayPal/thẻ được hoàn qua chính kênh đó khi khả thi).</li>
  <li>Mebayluon hoàn tiền trong vòng <b>${pad2(A.refundWorkingDays)} ngày làm việc</b> kể từ khi hai bên thống nhất số tiền hoàn và khách cung cấp đủ thông tin nhận tiền. Phí chuyển tiền quốc tế hoặc phí của bên trung gian thanh toán (nếu có) được thông báo trước cho khách.</li>
</ul>

<h2>6. Liên hệ đổi lịch, hủy bay</h2>
<p>Hotline ${HOTLINE} — Email ${E.email} — hoặc trang <a href="/booking/sua">Sửa booking</a>. Khiếu nại về việc hoàn tiền được giải quyết theo ${L("giai-quyet-khieu-nai", "Cơ chế giải quyết khiếu nại, tranh chấp")}.</p>

<h2>7. Thông tin doanh nghiệp</h2>
${entityInfoHtml("vi")}
`;

const cungCap = `
<p>Mebayluon cung cấp <b>dịch vụ trải nghiệm</b> (không giao hàng hóa). Chính sách này thay cho chính sách giao nhận, quy định cách thức, thời gian, địa điểm cung cấp dịch vụ và các điều kiện tham gia.</p>

<h2>1. Dịch vụ cung cấp</h2>
<ul>
  <li><b>Bay dù lượn đôi:</b> mỗi chuyến bay gồm 01 khách bay cùng 01 phi công chuyên nghiệp; phi công điều khiển toàn bộ chuyến bay.</li>
  <li><b>Bay dù lượn gắn động cơ (PPG):</b> tại cơ sở Tú Lệ – Đèo Khau Phạ.</li>
  <li><b>Dịch vụ đi kèm:</b> xe đón trả, flycam, camera 360…, tùy điểm bay (hiển thị ở bước đặt bay).</li>
</ul>

<h2>2. Điểm bay và thời gian</h2>
<ul>
  <li>Các điểm bay đang khai thác được giới thiệu tại trang <a href="/spots">Điểm bay</a> và ở bước chọn điểm bay khi đặt (hiện gồm Đèo Khau Phạ – Mù Cang Chải, Đồi Bù/Viên Nam – Hà Nội, Mường Hoa – Sa Pa, Sơn Trà – Đà Nẵng, Phình Hồ – Trạm Tấu, Quản Bạ – Hà Giang). Tọa độ và chỉ đường được gửi kèm email xác nhận.</li>
  <li>Khung giờ bay trong ngày từ 07:00 đến 18:00, tùy điểm bay và điều kiện gió; giờ cụ thể được nhân viên xác nhận với khách.</li>
  <li>Thời lượng bay dự kiến khoảng trên dưới 10 phút mỗi chuyến với dù lượn không động cơ (có thể ngắn hơn khi gió kém, hoặc kéo dài miễn phí khi thời tiết tốt); dù lượn gắn động cơ có thể chủ động từ 10–25 phút.</li>
  <li>Khách vui lòng có mặt tại điểm bay trước giờ bay 15–30 phút để làm thủ tục và nghe hướng dẫn an toàn.</li>
</ul>

<h2>3. Đón khách</h2>
<ul>
  <li><b>Hà Nội:</b> xe đón trả 2 chiều từ điểm đón cố định TTTM GO! Thăng Long (khung giờ đón 8h – 9h sáng), nếu khách đặt dịch vụ xe.</li>
  <li><b>Sa Pa:</b> xe đón trả tại khách sạn (trung tâm Sa Pa, Lao Chải, Tả Van), nếu khách đặt dịch vụ xe.</li>
  <li>Xe đón trước giờ bay khoảng 1 tiếng, tài xế gọi trước khi tới. Khách không đặt xe thì tự di chuyển tới điểm bay theo chỉ đường đã gửi.</li>
</ul>

<h2>4. Điều kiện tham gia bay</h2>
<ul>
  <li><b>Cân nặng:</b> dưới 120 kg. Trên 90 kg hoặc dưới 30 kg vui lòng báo trước để bố trí phi công và thiết bị phù hợp.</li>
  <li><b>Thể lực:</b> mức cơ bản, có khả năng chạy ngắn.</li>
  <li><b>Sức khỏe:</b> không mắc bệnh lý có thể gây nguy hiểm như động kinh, tim mạch nghiêm trọng, cao huyết áp không kiểm soát, rối loạn thần kinh, thường xuyên chóng mặt/ngất, bệnh cột sống, xương khớp, hoặc bệnh phải dùng thuốc điều trị thường xuyên; phụ nữ đang mang thai vui lòng báo trước cho phi công.</li>
  <li><b>Độ tuổi:</b> trẻ em từ 3 tuổi trở lên có thể bay, được tính là 01 khách riêng (mỗi chuyến chỉ 1 ghế khách). Khách dưới 18 tuổi phải có cha mẹ hoặc người giám hộ hợp pháp có mặt tại điểm bay và đồng ý với Điều khoản &amp; Cam kết trước khi bay.</li>
  <li>Mang theo giấy tờ tùy thân (CCCD hoặc hộ chiếu). Mặc quần áo dài tay, đi giày thể thao; không đi giày cao gót, dép lê; không mang vật sắc nhọn, cồng kềnh hoặc giá trị cao.</li>
</ul>

<h2>5. An toàn và bảo hiểm</h2>
<ul>
  <li>Chuyến bay do phi công đã được đào tạo chuyên nghiệp, có chứng nhận chuyên môn thực hiện. Quyết định cuối cùng về việc có bay hay không, thời điểm, đường bay và điểm hạ cánh thuộc về phi công tại hiện trường.</li>
  <li>Mỗi chuyến bay đã bao gồm gói <b>bảo hiểm tai nạn</b> theo hợp đồng bảo hiểm mà Mebayluon đang tham gia; phạm vi và mức chi trả theo quy tắc của công ty bảo hiểm. Khách có nhu cầu mức bảo hiểm cao hơn vui lòng tự thu xếp bảo hiểm bổ sung.</li>
  <li>Dù lượn là môn thể thao mạo hiểm có rủi ro vốn có; khách đọc kỹ <a href="/terms">Điều khoản &amp; Cam kết khi tham gia bay dù lượn</a> trước khi đặt.</li>
</ul>

<h2>6. Giao ảnh, video</h2>
<ul>
  <li>Ảnh, video GoPro (do phi công hỗ trợ, miễn phí) và flycam thường có ngay sau chuyến bay và được chép trực tiếp vào điện thoại của khách — vui lòng để trống khoảng 10GB bộ nhớ.</li>
  <li>File camera 360 cần thời gian chỉnh sửa, được gửi trong vòng 24 giờ qua Zalo, Google Drive hoặc WhatsApp.</li>
</ul>

<h2>7. Sản phẩm tại Cửa hàng</h2>
<p>Trang Cửa hàng giới thiệu thiết bị bay, phụ kiện, sách và khóa học dù lượn; Website không có giỏ hàng. Khách đặt mua bằng cách liên hệ hotline/Zalo/WhatsApp; giá, phí và cách thức giao nhận (nhận tại cơ sở hoặc gửi qua đơn vị vận chuyển) được nhân viên báo rõ và thống nhất với khách trước khi thanh toán.</p>

<h2>8. Giấy chứng nhận đủ điều kiện kinh doanh</h2>
<ul>
${E.sportLicenses.map((l) => `  <li>Giấy chứng nhận đủ điều kiện kinh doanh hoạt động thể thao số ${l.no} (${l.issuer}).</li>`).join("\n")}
  <li>Mỗi điểm bay có giấy phép hoạt động riêng; khách có thể yêu cầu xuất trình giấy phép của điểm bay tương ứng trước khi bay.</li>
</ul>

<h2>9. Thông tin doanh nghiệp</h2>
${entityInfoHtml("vi")}
`;

const baoMat = `
<p>${E.legalName} (“Mebayluon”, “chúng tôi”) tôn trọng và bảo vệ dữ liệu cá nhân của khách hàng theo quy định của pháp luật Việt Nam về bảo vệ dữ liệu cá nhân (Luật Bảo vệ dữ liệu cá nhân và các văn bản hướng dẫn thi hành). Chính sách này giải thích chúng tôi thu thập gì, dùng vào việc gì, lưu bao lâu, ai được tiếp cận và quyền của bạn.</p>

<h2>1. Dữ liệu được thu thập</h2>
<ul>
  <li><b>Khi đặt bay:</b> họ tên (theo hộ chiếu/CCCD), ngày sinh, giới tính, số CCCD/hộ chiếu, cân nặng, quốc tịch của từng khách bay; số điện thoại, email, địa chỉ điểm đón và yêu cầu đặc biệt của người đặt.</li>
  <li><b>Khi đặt phòng homestay, đăng ký sự kiện, liên hệ hoặc trò chuyện với trợ lý tự động (chatbot):</b> thông tin bạn tự nhập vào biểu mẫu hoặc khung trò chuyện.</li>
  <li><b>Dữ liệu kỹ thuật:</b> cookie ghi nhớ ngôn ngữ; số liệu truy cập ẩn danh/tổng hợp qua công cụ thống kê truy cập; dữ liệu kiểm tra chống spam khi gửi biểu mẫu.</li>
  <li><b>Dữ liệu nhạy cảm:</b> thông tin sức khỏe (nếu bạn tự khai trong yêu cầu đặc biệt hoặc báo cho phi công) chỉ dùng để bảo đảm an toàn bay. Việc bạn cung cấp các thông tin này là tự nguyện; tuy nhiên thiếu thông tin cần thiết thì chúng tôi có thể không bố trí được chuyến bay an toàn.</li>
</ul>

<h2>2. Mục đích sử dụng</h2>
<ul>
  <li>Tiếp nhận, xác nhận, sắp xếp lịch bay, bố trí phi công, thiết bị và xe đón.</li>
  <li>Mua bảo hiểm tai nạn cho khách bay, xuất vé và giấy chứng nhận bay.</li>
  <li>Liên hệ hỗ trợ, thông báo thay đổi lịch do thời tiết, gửi email xác nhận, ảnh/video chuyến bay.</li>
  <li>Kế toán, đối soát thanh toán và thực hiện nghĩa vụ theo quy định pháp luật.</li>
  <li>Cải thiện Website và chất lượng dịch vụ (số liệu tổng hợp).</li>
</ul>
<p>Chúng tôi <b>không bán</b> dữ liệu cá nhân và không dùng dữ liệu vào mục đích khác ngoài các mục đích trên nếu chưa có sự đồng ý của bạn.</p>

<h2>3. Thời gian lưu trữ</h2>
<p>Dữ liệu được lưu trữ <b>theo thời hạn pháp luật quy định</b>. Hết thời hạn, hoặc khi bạn yêu cầu xóa và không còn căn cứ pháp lý để lưu, dữ liệu sẽ được xóa hoặc ẩn danh hóa.</p>

<h2>4. Những người hoặc tổ chức được tiếp cận dữ liệu</h2>
<ul>
  <li>Nhân viên điều phối, phi công, tài xế của Mebayluon — chỉ phần dữ liệu cần cho công việc của họ.</li>
  <li><b>${INSURANCE_PROVIDER_NAME ?? "Công ty bảo hiểm cung cấp gói bảo hiểm tai nạn cho chuyến bay"}</b> — nhận họ tên, ngày sinh, giới tính, số giấy tờ tùy thân, quốc tịch và ngày bay của từng khách để cấp bảo hiểm tai nạn.</li>
  <li>Các nhà cung cấp dịch vụ lưu trữ dữ liệu, email, hạ tầng kỹ thuật và công cụ hỗ trợ vận hành, xử lý dữ liệu thay mặt chúng tôi theo thỏa thuận bảo mật và chỉ cho các mục đích nêu trên. Máy chủ của một số nhà cung cấp có thể đặt ngoài Việt Nam; bằng việc sử dụng dịch vụ, bạn đồng ý việc chuyển dữ liệu ra nước ngoài cho các mục đích này.</li>
  <li>Cơ quan nhà nước có thẩm quyền khi có yêu cầu theo quy định pháp luật.</li>
</ul>

<h2>5. Biện pháp bảo vệ</h2>
<ul>
  <li>Truy cập Website qua kết nối mã hóa HTTPS; khu vực quản trị có đăng nhập và phân quyền.</li>
  <li>Số giấy tờ tùy thân được ẩn bớt trong email xác nhận.</li>
  <li>Website không thu thập số thẻ thanh toán hay thông tin tài khoản ngân hàng.</li>
  <li>Khi phát hiện sự cố lộ lọt dữ liệu, chúng tôi xử lý và thông báo theo quy định pháp luật.</li>
</ul>

<h2>6. Quyền của chủ thể dữ liệu</h2>
<p>Bạn có quyền: được biết về việc xử lý dữ liệu; đồng ý hoặc rút lại sự đồng ý; truy cập, xem, chỉnh sửa dữ liệu; yêu cầu xóa, hạn chế xử lý, cung cấp dữ liệu; phản đối việc xử lý (bao gồm việc dùng hình ảnh cho truyền thông — xem mục 3 của <a href="/terms">Điều khoản &amp; Cam kết</a>); khiếu nại, tố cáo, khởi kiện và yêu cầu bồi thường thiệt hại theo quy định pháp luật. Việc rút lại sự đồng ý không ảnh hưởng tới tính hợp pháp của việc xử lý đã thực hiện trước đó.</p>
<p>Bạn có thể tự sửa thông tin booking tại trang <a href="/booking/sua">Sửa booking</a> hoặc gửi yêu cầu qua các kênh ở mục 7. Chúng tôi phản hồi yêu cầu trong thời hạn pháp luật quy định.</p>

<h2>7. Liên hệ về dữ liệu cá nhân</h2>
<p>Email ${E.email} hoặc ${E.registeredEmail} — Hotline ${HOTLINE} — Trụ sở: ${E.registeredOffice}.</p>

<h2>8. Thông tin doanh nghiệp</h2>
${entityInfoHtml("vi")}
`;

const khieuNai = `
<p>Mebayluon luôn mong muốn giải quyết mọi phản ánh của khách hàng nhanh chóng, khách quan và thiện chí. Cơ chế dưới đây áp dụng cho mọi giao dịch trên Website <b>www.mebayluon.com</b> và các kênh liên hệ của ${E.tradeName}.</p>

<h2>1. Kênh tiếp nhận</h2>
<ul>
  <li><b>Hotline:</b> 0964 073 555 (phi công trưởng) – 0385 907 789 (điều phối bay); gọi, Zalo, WhatsApp. Phản ánh tại điểm bay nên gọi trực tiếp để được hỗ trợ kịp thời.</li>
  <li><b>Email:</b> ${E.email} hoặc ${E.registeredEmail}.</li>
  <li><b>Trực tiếp:</b> tại điểm bay, hoặc trụ sở ${E.registeredOffice}.</li>
</ul>

<h2>2. Quy trình giải quyết</h2>
<ol>
  <li><b>Gửi khiếu nại:</b> nêu mã booking (nếu có), họ tên, số điện thoại, nội dung sự việc và yêu cầu; kèm hình ảnh, chứng từ liên quan (nếu có).</li>
  <li><b>Trả lời:</b> Mebayluon trả lời khiếu nại trong vòng <b>${pad2(A.complaintResponseWorkingDays)} ngày làm việc</b> kể từ khi nhận được khiếu nại, nêu phương án giải quyết. Trường hợp cần xác minh thêm, chúng tôi thông báo cho khách lý do và thời hạn dự kiến trong cùng thời hạn đó.</li>
  <li><b>Thực hiện:</b> khi hai bên thống nhất, phương án (đổi lịch, bay bù, hoàn tiền…) được thực hiện theo ${L("huy-doi-lich-hoan-tien", "Chính sách hủy, đổi lịch và hoàn tiền")}.</li>
</ol>

<h2>3. Giải quyết tranh chấp</h2>
<ul>
  <li>Tranh chấp được giải quyết trước hết bằng <b>thương lượng</b>, hòa giải thiện chí giữa hai bên.</li>
  <li>Nếu không đạt kết quả, khách có thể đề nghị cơ quan quản lý nhà nước về bảo vệ quyền lợi người tiêu dùng, tổ chức xã hội tham gia bảo vệ quyền lợi người tiêu dùng hỗ trợ, hoặc đưa vụ việc ra <b>Tòa án có thẩm quyền</b> nơi Mebayluon đặt trụ sở theo quy định pháp luật Việt Nam.</li>
  <li>Mebayluon cam kết hợp tác với cơ quan có thẩm quyền và cung cấp thông tin, chứng từ liên quan tới giao dịch khi được yêu cầu.</li>
</ul>

<h2>4. Thông tin doanh nghiệp</h2>
${entityInfoHtml("vi")}
`;

export const POLICIES_VI: Record<PolicySlug, PolicyDoc> = {
  "dieu-khoan-su-dung": {
    title: "Điều khoản sử dụng & Điều kiện giao dịch chung",
    description:
      "Điều khoản sử dụng website mebayluon.com và điều kiện giao dịch chung khi đặt dịch vụ bay dù lượn của Mebayluon Paragliding.",
    html: dieuKhoan,
  },
  "thanh-toan": {
    title: "Chính sách thanh toán",
    description:
      "Thời điểm và phương thức thanh toán dịch vụ bay dù lượn Mebayluon: tiền mặt, chuyển khoản, thẻ, PayPal; thanh toán tại điểm bay.",
    html: thanhToan,
  },
  "huy-doi-lich-hoan-tien": {
    title: "Chính sách hủy, đổi lịch và hoàn tiền",
    description:
      "Đổi lịch, hủy bay và hoàn tiền tại Mebayluon, gồm trường hợp hoãn bay do thời tiết và bất khả kháng.",
    html: huyDoi,
  },
  "cung-cap-dich-vu": {
    title: "Chính sách cung cấp dịch vụ",
    description:
      "Điểm bay, thời gian, đón khách, điều kiện sức khỏe – cân nặng, an toàn và bảo hiểm khi bay dù lượn cùng Mebayluon.",
    html: cungCap,
  },
  "bao-mat-thong-tin": {
    title: "Chính sách bảo mật thông tin cá nhân",
    description:
      "Mebayluon thu thập, sử dụng, lưu trữ và bảo vệ dữ liệu cá nhân của khách hàng như thế nào; quyền của chủ thể dữ liệu.",
    html: baoMat,
  },
  "giai-quyet-khieu-nai": {
    title: "Cơ chế giải quyết khiếu nại, tranh chấp",
    description:
      "Kênh tiếp nhận, quy trình và thời hạn giải quyết khiếu nại, tranh chấp của khách hàng Mebayluon Paragliding.",
    html: khieuNai,
  },
};
