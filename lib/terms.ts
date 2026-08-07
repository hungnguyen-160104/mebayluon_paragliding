// lib/terms.ts
/**
 * Điều khoản & Điều kiện dịch vụ — hiện ở trang /terms và ở bước xác nhận
 * (bước 5) của luồng đặt bay, khách phải tích đồng ý mới đặt được.
 *
 * Đây là "điều kiện giao dịch chung" theo Luật Bảo vệ quyền lợi người tiêu
 * dùng 2023. Văn bản được soạn bám theo:
 *   - Bộ luật Dân sự 2015 (Điều 32 quyền hình ảnh, Điều 156 bất khả kháng)
 *   - Luật Bảo vệ quyền lợi người tiêu dùng 2023 (số 19/2023/QH15)
 *   - Luật Thể dục, thể thao và Nghị định 36/2019/NĐ-CP
 *   - Thông tư 06/2018/TT-BVHTTDL (cơ sở vật chất, trang thiết bị môn dù lượn)
 *   - Nghị định 36/2008/NĐ-CP và 79/2011/NĐ-CP (phương tiện bay siêu nhẹ)
 *   - Nghị định 52/2013/NĐ-CP và 85/2021/NĐ-CP (thương mại điện tử)
 *   - Nghị định 13/2023/NĐ-CP (bảo vệ dữ liệu cá nhân)
 *
 * ⚠️ LƯU Ý KHI SỬA: bản cũ có câu "cam kết không yêu cầu bồi thường hoặc khởi
 * kiện". Theo Điều 25 Luật Bảo vệ quyền lợi người tiêu dùng 2023, điều khoản
 * loại trừ trách nhiệm của bên bán và tước quyền khiếu nại/khởi kiện của người
 * tiêu dùng KHÔNG CÓ HIỆU LỰC. Đừng đưa lại kiểu câu đó — nó vừa vô hiệu vừa
 * có thể bị xử phạt. Cách viết đúng là ghi nhận rủi ro vốn có của môn thể thao
 * và phân định trách nhiệm theo lỗi, như mục 5 bên dưới.
 *
 * Bản tiếng Việt là bản gốc; 5 bản còn lại là bản dịch.
 */
import { LEGAL_ENTITY, TERMS_UPDATED_AT } from "./legal-entity";

export const TERM_LANGUAGES = ["vi", "en", "fr", "ru", "zh", "hi"] as const;

export type LangCode = (typeof TERM_LANGUAGES)[number];

/** Nhãn của bảng thông tin doanh nghiệp ở mục 1. */
const ENTITY_LABELS: Record<
  LangCode,
  {
    tradeName: string;
    legalName: string;
    taxCode: string;
    registeredOffice: string;
    operatingAddresses: string;
    phone: string;
    email: string;
    website: string;
    sportLicenses: string;
    moreLicenses: string;
  }
> = {
  vi: {
    tradeName: "Tên giao dịch",
    legalName: "Tên pháp nhân",
    taxCode: "Mã số thuế",
    registeredOffice: "Trụ sở đăng ký",
    operatingAddresses: "Địa chỉ hoạt động",
    phone: "Điện thoại",
    email: "Email",
    website: "Website",
    sportLicenses: "Giấy chứng nhận đủ điều kiện kinh doanh hoạt động thể thao",
    moreLicenses:
      "Mỗi điểm bay có giấy phép hoạt động riêng. Khách hàng có thể yêu cầu chúng tôi xuất trình giấy phép của điểm bay tương ứng trước khi bay.",
  },
  en: {
    tradeName: "Trading name",
    legalName: "Registered company name",
    taxCode: "Tax code",
    registeredOffice: "Registered office",
    operatingAddresses: "Operating addresses",
    phone: "Phone",
    email: "Email",
    website: "Website",
    sportLicenses: "Sports business eligibility certificates",
    moreLicenses:
      "Each flying site holds its own operating permit. You may ask us to produce the permit for the relevant site before your flight.",
  },
  fr: {
    tradeName: "Nom commercial",
    legalName: "Raison sociale",
    taxCode: "Numéro fiscal",
    registeredOffice: "Siège social",
    operatingAddresses: "Adresses d’exploitation",
    phone: "Téléphone",
    email: "E-mail",
    website: "Site web",
    sportLicenses: "Certificats d’aptitude à l’exploitation d’activités sportives",
    moreLicenses:
      "Chaque site de vol dispose de sa propre autorisation d’exploitation. Vous pouvez nous demander de présenter celle du site concerné avant le vol.",
  },
  ru: {
    tradeName: "Коммерческое наименование",
    legalName: "Юридическое наименование",
    taxCode: "Налоговый код",
    registeredOffice: "Юридический адрес",
    operatingAddresses: "Адреса деятельности",
    phone: "Телефон",
    email: "Эл. почта",
    website: "Сайт",
    sportLicenses: "Свидетельства о соответствии условиям спортивной деятельности",
    moreLicenses:
      "Каждое место полётов имеет собственное разрешение на деятельность. До полёта вы вправе попросить нас предъявить разрешение соответствующей площадки.",
  },
  zh: {
    tradeName: "商号",
    legalName: "法人名称",
    taxCode: "税号",
    registeredOffice: "注册地址",
    operatingAddresses: "经营地址",
    phone: "电话",
    email: "电子邮箱",
    website: "网站",
    sportLicenses: "体育经营资格证书",
    moreLicenses:
      "每个飞行点均持有各自的经营许可。飞行前您可要求我们出示相应飞行点的许可文件。",
  },
  hi: {
    tradeName: "व्यापारिक नाम",
    legalName: "पंजीकृत कंपनी नाम",
    taxCode: "कर संख्या",
    registeredOffice: "पंजीकृत कार्यालय",
    operatingAddresses: "संचालन पते",
    phone: "फ़ोन",
    email: "ईमेल",
    website: "वेबसाइट",
    sportLicenses: "खेल व्यवसाय पात्रता प्रमाणपत्र",
    moreLicenses:
      "प्रत्येक उड़ान स्थल का अपना संचालन परमिट है। उड़ान से पहले आप संबंधित स्थल का परमिट दिखाने के लिए हमसे कह सकते हैं।",
  },
};

/**
 * Bảng thông tin doanh nghiệp. Trường nào chưa có dữ liệu thì bỏ hẳn dòng đó
 * thay vì hiện ô trống — thà thiếu còn hơn hiện "đang cập nhật" trên một văn
 * bản pháp lý.
 */
function entityBlock(lang: LangCode): string {
  const L = ENTITY_LABELS[lang];
  const e = LEGAL_ENTITY;

  /** Bỏ hẳn dòng nào chưa có dữ liệu, không hiện ô trống. */
  const row = (label: string, value: string) =>
    value.trim() ? `<li><b>${label}:</b> ${value}</li>` : "";

  /** Trường có nhiều giá trị (địa chỉ hoạt động, giấy phép) -> danh sách con. */
  const nested = (label: string, values: readonly string[]) =>
    values.length
      ? `<li><b>${label}:</b><ul>${values.map((v) => `<li>${v}</li>`).join("")}</ul></li>`
      : "";

  const body =
    row(L.tradeName, e.tradeName) +
    row(L.legalName, e.legalName) +
    row(L.taxCode, e.taxCode) +
    row(L.registeredOffice, e.registeredOffice) +
    nested(L.operatingAddresses, e.operatingAddresses) +
    row(L.phone, e.phones.join(" | ")) +
    row(L.email, e.email) +
    row(L.website, e.website) +
    nested(
      L.sportLicenses,
      e.sportLicenses.map((lic) => `${lic.no} — ${lic.date} — ${lic.issuer}`),
    );

  return (
    `<ul>${body}</ul>` +
    (e.sportLicenses.length ? `<p>${L.moreLicenses}</p>` : "")
  );
}

const vi = `
<h1>ĐIỀU KHOẢN VÀ ĐIỀU KIỆN DỊCH VỤ</h1>
<p><i>Cập nhật lần cuối: ${TERMS_UPDATED_AT}</i></p>
<p><b>Dù lượn là môn thể thao mạo hiểm. Khách hàng vui lòng đọc kỹ toàn bộ hướng dẫn an toàn và các điều khoản dưới đây trước khi quyết định tham gia.</b></p>

<h2>1. Thông tin đơn vị cung cấp dịch vụ</h2>
${entityBlock("vi")}

<h2>2. Phạm vi áp dụng và việc chấp thuận</h2>
<ul>
  <li>Văn bản này áp dụng cho website mebayluon.com và toàn bộ dịch vụ do chúng tôi cung cấp: bay dù lượn đôi, bay dù lượn gắn động cơ, khoá học bay, dịch vụ ghi hình đi kèm và lưu trú tại Clubhouse Mebayluon.</li>
  <li>Khách hàng được xem là đã đọc, hiểu và chấp thuận toàn bộ điều khoản khi thực hiện một trong các hành vi: tích ô đồng ý ở bước xác nhận đặt chỗ, thanh toán, hoặc tham gia chuyến bay.</li>
  <li>Đây là điều kiện giao dịch chung theo Luật Bảo vệ quyền lợi người tiêu dùng 2023. Khách hàng có quyền yêu cầu chúng tôi giải thích bất kỳ nội dung nào trước khi chấp thuận.</li>
  <li>Trường hợp khách hàng đặt dịch vụ qua nền tảng đối tác (Klook, GetYourGuide, Viator, KKday, Seek Sophie, Booking.com, Agoda, Trip.com...), điều khoản của nền tảng đó áp dụng song song cho việc đặt chỗ và thanh toán; điều khoản này áp dụng cho việc thực hiện chuyến bay.</li>
</ul>

<h2>3. Giải thích từ ngữ</h2>
<ul>
  <li><b>Chúng tôi</b>: đơn vị nêu tại mục 1.</li>
  <li><b>Khách bay</b>: người trực tiếp tham gia chuyến bay.</li>
  <li><b>Bay đôi</b>: chuyến bay có một phi công điều khiển và một khách ngồi cùng.</li>
  <li><b>Dù lượn gắn động cơ (PPG/trike)</b>: dù lượn có gắn động cơ đẩy.</li>
  <li><b>Chuyến bay</b>: toàn bộ hành trình từ lúc tiếp nhận khách tại điểm hẹn đến khi kết thúc tại bãi hạ cánh.</li>
</ul>

<h2>4. Điều kiện tham gia bay</h2>
<ul>
  <li><b>Độ tuổi:</b> từ 3 tuổi trở lên. Người chưa đủ 18 tuổi phải có sự đồng ý của cha, mẹ hoặc người giám hộ hợp pháp; người giám hộ ký xác nhận thay và cùng chịu trách nhiệm về tính chính xác của thông tin khai báo.</li>
  <li><b>Cân nặng:</b> dưới 120 kg. Trường hợp trên 90 kg hoặc dưới 30 kg, khách vui lòng thông báo trước để chúng tôi bố trí phi công và trang thiết bị phù hợp.</li>
  <li><b>Sức khoẻ:</b> khách cần có thể lực cơ bản, có khả năng chạy đà một đoạn ngắn. Không phù hợp với người mắc động kinh, bệnh tim mạch nghiêm trọng, cao huyết áp không kiểm soát, rối loạn thần kinh, thường xuyên chóng mặt hoặc ngất, bệnh cột sống — xương khớp, phụ nữ mang thai, hoặc người đang dùng thuốc điều trị ảnh hưởng đến khả năng phản xạ.</li>
  <li><b>Chất kích thích:</b> khách đang trong tình trạng say rượu bia, sử dụng chất kích thích hoặc mất kiểm soát hành vi sẽ bị từ chối bay vì lý do an toàn.</li>
  <li><b>Trung thực thông tin:</b> khách cam kết cung cấp đầy đủ và chính xác họ tên, ngày sinh, số giấy tờ tuỳ thân, cân nặng và tình trạng sức khoẻ. Việc khai báo sai lệch có thể khiến khách không được bảo hiểm chi trả và là căn cứ để chúng tôi từ chối thực hiện chuyến bay.</li>
  <li><b>Quyền từ chối vì an toàn:</b> phi công và người điều phối bay có toàn quyền quyết định hoãn, huỷ hoặc từ chối một chuyến bay khi đánh giá điều kiện thời tiết, thể trạng khách hoặc tình huống hiện trường không bảo đảm an toàn. Quyết định này là quyết định cuối cùng.</li>
  <li><b>Trang phục:</b> động tác chạy đà và hạ cánh có thể khiến khách trượt ngã, bẩn hoặc rách trang phục. Khách nên mặc quần áo dài tay dễ vận động, đi giày thể thao hoặc giày leo núi, không mang trang phục đắt tiền và trang sức quý giá.</li>
</ul>

<h2>5. Cảnh báo rủi ro và nội dung miễn trừ trách nhiệm</h2>
<p><b>Dù lượn là môn thể thao mạo hiểm.</b> Khách hàng vui lòng đọc kỹ toàn bộ hướng dẫn an toàn và điều khoản này trước khi quyết định tham gia.</p>
<p>Dù lượn thuộc danh mục hoạt động thể thao mạo hiểm do Bộ Văn hoá, Thể thao và Du lịch quy định. Chúng tôi tổ chức hoạt động theo Luật Thể dục, thể thao, Nghị định 36/2019/NĐ-CP, Thông tư 06/2018/TT-BVHTTDL và các quy định về quản lý phương tiện bay siêu nhẹ tại Nghị định 36/2008/NĐ-CP (sửa đổi bởi Nghị định 79/2011/NĐ-CP).</p>
<p>Khi đăng ký và tham gia hoạt động bay, khách hàng được hiểu là đã đọc, hiểu và chấp thuận các nội dung miễn trừ sau:</p>
<ul>
  <li>Nhận thức rõ dù lượn là hoạt động có những rủi ro vốn có của thể thao trên không, phụ thuộc vào điều kiện khí tượng và không thể loại trừ hoàn toàn kể cả khi phi công có đầy đủ chuyên môn và thiết bị đạt chuẩn.</li>
  <li>Tự nguyện tham gia và chấp nhận những rủi ro có thể phát sinh trong quá trình hoạt động.</li>
  <li>Miễn trừ trách nhiệm cho đơn vị tổ chức, phi công và huấn luyện viên đối với các sự cố gây thiệt hại về tài sản và sức khoẻ phát sinh trong phạm vi những rủi ro tiềm ẩn của hoạt động bay.</li>
  <li>Cam kết không khiếu nại, khiếu kiện đối với các sự cố thuộc phạm vi miễn trừ nêu trên.</li>
  <li>Tuân thủ đầy đủ hướng dẫn an toàn của phi công và nhân viên điều hành.</li>
  <li>Cam kết miễn trừ này có hiệu lực trong toàn bộ thời gian khách tham gia các hoạt động dù lượn do đơn vị tổ chức.</li>
</ul>
<p><b>Trách nhiệm của chúng tôi:</b> chúng tôi cam kết bố trí phi công có chứng nhận chuyên môn còn hiệu lực, trang thiết bị đạt tiêu chuẩn, nhân viên cứu hộ và y tế theo quy định. Nội dung miễn trừ nêu trên áp dụng cho những rủi ro vốn có của hoạt động bay; đối với thiệt hại phát sinh do lỗi của chúng tôi, trách nhiệm được xác định theo quy định của pháp luật Việt Nam.</p>
<p><b>Trách nhiệm của khách hàng:</b> khách chịu trách nhiệm đối với thiệt hại phát sinh do khách khai báo sai sự thật, không tuân thủ hướng dẫn an toàn của phi công, hoặc cố ý thực hiện hành vi gây mất an toàn bay.</p>

<h2>6. Bảo hiểm</h2>
<ul>
  <li>Chúng tôi mua bảo hiểm tai nạn cho khách tham gia hoạt động bay theo quy định đối với hoạt động thể thao mạo hiểm. Phí bảo hiểm đã bao gồm trong giá dịch vụ.</li>
  <li>Phạm vi bảo hiểm, mức trách nhiệm và thủ tục yêu cầu bồi thường thực hiện theo hợp đồng bảo hiểm với doanh nghiệp bảo hiểm. Khách hàng có quyền yêu cầu chúng tôi cung cấp thông tin về đơn vị bảo hiểm và phạm vi bảo hiểm trước khi bay.</li>
  <li>Bảo hiểm là khoản chi trả bổ sung, không thay thế và không làm giảm trách nhiệm bồi thường của chúng tôi theo pháp luật khi thiệt hại xảy ra do lỗi của chúng tôi.</li>
  <li>Khách khai báo sai tình trạng sức khoẻ hoặc cân nặng có thể bị doanh nghiệp bảo hiểm từ chối chi trả.</li>
</ul>

<h2>7. Đặt chỗ và giao kết hợp đồng</h2>
<ul>
  <li>Khách có thể đặt dịch vụ qua website, hotline, Zalo, WhatsApp, email hoặc các nền tảng đối tác.</li>
  <li>Yêu cầu đặt chỗ của khách là đề nghị giao kết hợp đồng. Hợp đồng được xác lập khi chúng tôi gửi xác nhận đặt chỗ; chúng tôi liên hệ xác nhận trong vòng 03 giờ làm việc kể từ khi nhận được yêu cầu.</li>
  <li>Lịch bay được sắp xếp theo nguyên tắc đặt trước phục vụ trước. Vào ngày cao điểm tại một số điểm bay, thứ tự bay được xếp theo thời điểm đặt dịch vụ.</li>
</ul>

<h2>8. Giá dịch vụ, thanh toán và hoá đơn</h2>
<ul>
  <li>Giá niêm yết trên website tính bằng Đồng Việt Nam (VNĐ) cho một khách một chuyến bay, đã bao gồm bảo hiểm, phi công, trang thiết bị và các hạng mục được liệt kê trong phần mô tả của từng điểm bay.</li>
  <li>Các dịch vụ tuỳ chọn (quay flycam, camera 360°, đưa đón hai chiều từ khách sạn) được tính phí riêng và báo giá trước khi khách đồng ý sử dụng.</li>
  <li>Thanh toán bằng tiền mặt, chuyển khoản hoặc thẻ tại điểm bay trước khi cất cánh, trừ trường hợp đặt qua nền tảng đối tác đã thanh toán trực tuyến.</li>
  <li>Chúng tôi xuất hoá đơn theo quy định pháp luật khi khách có yêu cầu. Khách vui lòng cung cấp thông tin xuất hoá đơn chậm nhất trong ngày sử dụng dịch vụ.</li>
</ul>

<h2>9. Thời lượng bay và điều kiện thời tiết</h2>
<ul>
  <li>Dù lượn không gắn động cơ phụ thuộc hoàn toàn vào điều kiện gió. Thời lượng dự kiến trên không khoảng 10–15 phút mỗi chuyến. Với dù lượn gắn động cơ, thời lượng có thể lựa chọn trong khoảng 10–25 phút.</li>
  <li>Thời lượng thực tế có thể ngắn hơn dự kiến trong điều kiện gió không thuận lợi, hoặc được kéo dài miễn phí khi thời tiết tốt. Đây là đặc thù của bộ môn, không phải là việc cung cấp thiếu dịch vụ.</li>
  <li>Bay liên tục quá 15 phút có thể gây chóng mặt do thay đổi áp suất và độ cao. Khách nên cân nhắc theo thể trạng của mình.</li>
</ul>

<h2>10. Đổi lịch, huỷ chuyến và hoàn tiền</h2>
<ul>
  <li><b>Do thời tiết hoặc lý do an toàn:</b> khách được đổi lịch hoặc huỷ hoàn toàn miễn phí và được hoàn 100% số tiền đã thanh toán.</li>
  <li><b>Do bất khả kháng:</b> áp dụng như trên đối với các trường hợp bất khả kháng hợp lý (tai nạn, ốm đau có xác nhận y tế, phương tiện di chuyển bị huỷ...).</li>
  <li><b>Dồn lịch ngày cao điểm:</b> thời tiết xấu có thể làm chậm lịch và dẫn đến dồn khách. Khi đó chuyến bay có thể được sắp xếp lại mà không kịp thông báo trước. Khách được lựa chọn chờ hoặc huỷ và hoàn tiền đầy đủ.</li>
  <li><b>Khách huỷ vì lý do cá nhân:</b> nếu chưa phát sinh chi phí nào, khách được hoàn 100%. Nếu đã sử dụng một phần dịch vụ (bảo hiểm đã kích hoạt, xe trung chuyển đã chạy, đồ uống đã cung cấp...), khách thanh toán phần chi phí thực tế đã phát sinh và được hoàn lại phần còn lại.</li>
  <li><b>Khách huỷ đột ngột khi đã sẵn sàng cất cánh:</b> nếu việc huỷ làm gián đoạn vận hành trong khi phi công và nhân sự đã vào vị trí, khách chịu chi phí thực tế phát sinh tương ứng; phần còn lại được hoàn.</li>
  <li><b>Thời hạn hoàn tiền:</b> trong vòng 07 ngày làm việc kể từ ngày hai bên thống nhất số tiền hoàn, theo phương thức khách đã thanh toán. Với đơn đặt qua nền tảng đối tác, việc hoàn tiền theo quy trình của nền tảng đó.</li>
</ul>

<h2>11. Dịch vụ ghi hình đi kèm</h2>
<ul>
  <li>Ảnh và video quay bằng GoPro do phi công thực hiện được cung cấp miễn phí cho khách.</li>
  <li>Dịch vụ flycam và camera 360° là dịch vụ tuỳ chọn có thu phí.</li>
  <li>Hoạt động bay diễn ra trong môi trường gió và rung lắc, thiết bị ghi hình có thể gặp sự cố kỹ thuật, hết pin, mất tín hiệu hoặc lỗi phát sinh ngoài khả năng kiểm soát; một số sự cố chỉ phát hiện được sau khi chuyến bay kết thúc.</li>
  <li>Nếu dịch vụ ghi hình có thu phí không thực hiện được hoặc không bảo đảm chất lượng do lỗi kỹ thuật, chúng tôi hoàn lại 100% phí của riêng dịch vụ ghi hình. Chi phí chuyến bay không được hoàn vì hoạt động bay vẫn đã thực hiện đầy đủ và an toàn.</li>
  <li>Dữ liệu GoPro và flycam thường bàn giao ngay sau chuyến bay. Dữ liệu camera 360° cần thời gian xử lý và được gửi trong vòng 24 giờ qua Zalo, Google Drive hoặc WhatsApp.</li>
  <li>Khi phi công đề nghị khách cầm giúp thiết bị trong lúc bay, khách không phải bồi thường nếu vô ý làm rơi hoặc hỏng thiết bị; tương ứng, khách cũng không yêu cầu bồi thường phần dữ liệu bị mất trong trường hợp đó.</li>
  <li>An toàn bay luôn là ưu tiên cao nhất. Việc xử lý sự cố thiết bị ghi hình không bao giờ được đặt lên trên an toàn của chuyến bay.</li>
</ul>

<h2>12. Quyền hình ảnh và việc sử dụng hình ảnh</h2>
<ul>
  <li>Theo Điều 32 Bộ luật Dân sự 2015, việc sử dụng hình ảnh của cá nhân phải được người đó đồng ý.</li>
  <li>Khi chấp thuận điều khoản này, khách đồng ý cho chúng tôi sử dụng ảnh và video ghi trong chuyến bay cho mục đích giới thiệu và quảng bá dịch vụ trên website, mạng xã hội và ấn phẩm truyền thông của chúng tôi.</li>
  <li>Khách có quyền từ chối hoặc rút lại sự đồng ý bất kỳ lúc nào bằng cách thông báo cho chúng tôi qua email hoặc hotline. Chúng tôi gỡ bỏ hình ảnh trên các kênh do chúng tôi quản lý trong vòng 07 ngày làm việc.</li>
  <li>Việc khách không đồng ý cho sử dụng hình ảnh không ảnh hưởng đến chất lượng dịch vụ và không làm thay đổi giá dịch vụ.</li>
</ul>

<h2>13. Vật dụng cá nhân, thú cưng và đồ ăn uống</h2>
<ul>
  <li><b>Vật dụng cá nhân:</b> khách có thể mang theo điện thoại, kính râm và vật dụng nhỏ. Khách tự bảo quản tài sản của mình; chúng tôi không chịu trách nhiệm với tài sản bị rơi, mất hoặc hư hỏng, trừ trường hợp thiệt hại do lỗi của chúng tôi. Vật dụng quá khổ, nặng trên 3 kg hoặc gây cản trở an toàn bay có thể bị từ chối.</li>
  <li><b>Thú cưng:</b> được phép mang theo nhưng khách tự chịu trách nhiệm về an toàn của thú cưng; thú cưng phải có dây đai hoặc vị trí cố định phù hợp và luôn trong tầm kiểm soát. Phi công có quyền từ chối nếu xét thấy ảnh hưởng đến an toàn.</li>
  <li><b>Đồ ăn, thức uống:</b> việc sử dụng đồ uống có cồn trước chuyến bay thuộc trách nhiệm cá nhân của khách và có thể dẫn đến việc bị từ chối bay theo mục 4.</li>
</ul>

<h2>14. Bảo vệ dữ liệu cá nhân</h2>
<ul>
  <li>Chúng tôi xử lý dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.</li>
  <li><b>Dữ liệu thu thập:</b> họ tên, ngày sinh, quốc tịch, số giấy tờ tuỳ thân, cân nặng, tình trạng sức khoẻ, thông tin liên hệ, hình ảnh và video chuyến bay.</li>
  <li><b>Mục đích:</b> thực hiện dịch vụ, bảo đảm an toàn bay, mua và yêu cầu chi trả bảo hiểm, xuất hoá đơn, chăm sóc khách hàng và thực hiện nghĩa vụ pháp lý.</li>
  <li><b>Bên thứ ba nhận dữ liệu:</b> doanh nghiệp bảo hiểm, cơ quan quản lý bay và cơ quan nhà nước có thẩm quyền khi có yêu cầu hợp pháp, đối tác vận chuyển và nền tảng đặt dịch vụ mà khách đã sử dụng.</li>
  <li><b>Dữ liệu nhạy cảm:</b> thông tin sức khoẻ là dữ liệu cá nhân nhạy cảm, chỉ được thu thập trong phạm vi cần thiết cho an toàn bay và bảo hiểm, và chỉ khi khách đồng ý rõ ràng.</li>
  <li><b>Thời gian lưu trữ:</b> trong thời gian cần thiết cho mục đích nêu trên và theo thời hạn lưu trữ mà pháp luật về kế toán, thuế và bảo hiểm yêu cầu.</li>
  <li><b>Quyền của khách:</b> được biết, đồng ý hoặc rút lại sự đồng ý, truy cập, chỉnh sửa, xoá, hạn chế xử lý, yêu cầu cung cấp dữ liệu, phản đối xử lý và khiếu nại. Liên hệ qua email hoặc hotline ở mục 1; chúng tôi phản hồi trong vòng 72 giờ.</li>
</ul>

<h2>15. Sở hữu trí tuệ</h2>
<ul>
  <li>Toàn bộ nội dung trên website, gồm văn bản, hình ảnh, video, logo và thiết kế, thuộc quyền sở hữu của chúng tôi hoặc được chúng tôi sử dụng hợp pháp.</li>
  <li>Việc sao chép, khai thác lại vì mục đích thương mại phải có sự đồng ý bằng văn bản của chúng tôi.</li>
</ul>

<h2>16. Sự kiện bất khả kháng</h2>
<ul>
  <li>Theo Điều 156 Bộ luật Dân sự 2015, các bên không phải chịu trách nhiệm về việc không thực hiện nghĩa vụ do sự kiện bất khả kháng, bao gồm nhưng không giới hạn ở: thiên tai, thời tiết cực đoan, cháy nổ, dịch bệnh, chiến sự, đình công, quyết định đóng vùng trời hoặc cấm bay của cơ quan có thẩm quyền.</li>
  <li>Trong trường hợp đó, chuyến bay được đổi lịch hoặc hoàn tiền theo mục 10.</li>
</ul>

<h2>17. Khiếu nại và giải quyết tranh chấp</h2>
<ul>
  <li>Khách hàng gửi khiếu nại qua email hoặc hotline nêu tại mục 1. Chúng tôi xác nhận đã tiếp nhận trong vòng 03 ngày làm việc và giải quyết trong vòng 15 ngày làm việc kể từ ngày tiếp nhận.</li>
  <li>Các bên ưu tiên giải quyết bằng thương lượng, hoà giải trên tinh thần thiện chí.</li>
  <li>Trường hợp không đạt được thoả thuận, tranh chấp được giải quyết tại Toà án có thẩm quyền của Việt Nam.</li>
  <li>Khách hàng có quyền khiếu nại đến cơ quan quản lý nhà nước về bảo vệ quyền lợi người tiêu dùng hoặc tổ chức xã hội tham gia bảo vệ quyền lợi người tiêu dùng.</li>
</ul>

<h2>18. Luật áp dụng và ngôn ngữ</h2>
<ul>
  <li>Điều khoản này được điều chỉnh và giải thích theo pháp luật Việt Nam.</li>
  <li>Bản tiếng Việt là bản gốc. Các bản dịch chỉ nhằm mục đích tham khảo; nếu có mâu thuẫn về cách hiểu, bản tiếng Việt được ưu tiên áp dụng.</li>
</ul>

<h2>19. Sửa đổi và hiệu lực</h2>
<ul>
  <li>Chúng tôi có quyền sửa đổi, bổ sung điều khoản này và công bố bản cập nhật trên website kèm ngày cập nhật.</li>
  <li>Bản sửa đổi áp dụng cho các đơn đặt phát sinh sau ngày công bố. Đơn đặt đã được xác nhận trước đó tiếp tục áp dụng bản điều khoản tại thời điểm xác nhận.</li>
  <li>Nếu một điều khoản bất kỳ bị coi là vô hiệu, các điều khoản còn lại vẫn giữ nguyên hiệu lực.</li>
</ul>
`.trim();

const en = `
<h1>TERMS AND CONDITIONS OF SERVICE</h1>
<p><i>Last updated: ${TERMS_UPDATED_AT}</i></p>
<p><b>Paragliding is an adventure sport. Please read all safety instructions and the terms below carefully before deciding to take part.</b></p>

<h2>1. Service provider</h2>
${entityBlock("en")}

<h2>2. Scope and acceptance</h2>
<ul>
  <li>These terms apply to mebayluon.com and to all services we provide: tandem paragliding, powered paragliding, flight training courses, optional filming services and accommodation at Clubhouse Mebayluon.</li>
  <li>You are deemed to have read, understood and accepted these terms when you tick the consent box at the booking confirmation step, make payment, or take part in a flight.</li>
  <li>These are general transaction conditions under the Vietnamese Law on Protection of Consumer Rights 2023. You may ask us to explain any clause before accepting.</li>
  <li>If you book through a partner platform (Klook, GetYourGuide, Viator, KKday, Seek Sophie, Booking.com, Agoda, Trip.com and others), that platform's terms also apply to the booking and payment; these terms govern the conduct of the flight itself.</li>
</ul>

<h2>3. Definitions</h2>
<ul>
  <li><b>We / us</b>: the entity identified in section 1.</li>
  <li><b>Passenger</b>: the person taking part in the flight.</li>
  <li><b>Tandem flight</b>: a flight with one pilot in command and one passenger.</li>
  <li><b>Powered paragliding (PPG/trike)</b>: a paraglider fitted with an engine.</li>
  <li><b>Flight</b>: the whole journey from pick-up at the meeting point until the end of the activity at the landing field.</li>
</ul>

<h2>4. Eligibility</h2>
<ul>
  <li><b>Age:</b> from 3 years old. Anyone under 18 requires the consent of a parent or legal guardian, who signs on their behalf and is jointly responsible for the accuracy of the declared information.</li>
  <li><b>Weight:</b> under 120 kg. If you weigh more than 90 kg or less than 30 kg, please tell us in advance so we can assign a suitable pilot and equipment.</li>
  <li><b>Health:</b> you need basic fitness and the ability to run a short distance. The activity is not suitable for people with epilepsy, serious cardiovascular disease, uncontrolled high blood pressure, neurological disorders, frequent dizziness or fainting, spinal or joint conditions, for pregnant women, or for anyone on medication affecting reflexes.</li>
  <li><b>Intoxication:</b> passengers who are intoxicated, under the influence of drugs, or unable to control their behaviour will be refused a flight on safety grounds.</li>
  <li><b>Accurate information:</b> you undertake to give complete and accurate details of your name, date of birth, identity document number, weight and health condition. False declarations may void your insurance cover and entitle us to refuse the flight.</li>
  <li><b>Right of refusal on safety grounds:</b> the pilot and the flight coordinator have full authority to postpone, cancel or refuse any flight where weather, the passenger's condition or the situation on site is judged unsafe. That decision is final.</li>
  <li><b>Clothing:</b> the take-off run and landing may cause you to slip, and clothing may get dirty or torn. Wear comfortable long-sleeved clothing and sports or hiking shoes; do not wear expensive clothing or valuable jewellery.</li>
</ul>

<h2>5. Risk warning and waiver</h2>
<p><b>Paragliding is an adventure sport.</b> Please read all safety instructions and these terms carefully before deciding to take part.</p>
<p>Paragliding is on the list of adventure sports issued by the Ministry of Culture, Sports and Tourism. We operate under the Law on Physical Training and Sports, Decree 36/2019/ND-CP, Circular 06/2018/TT-BVHTTDL and the rules on ultralight aircraft in Decree 36/2008/ND-CP (as amended by Decree 79/2011/ND-CP).</p>
<p>By booking and taking part in a flight, you are deemed to have read, understood and accepted the following waiver:</p>
<ul>
  <li>You acknowledge that paragliding carries risks inherent to air sports, depends on meteorological conditions, and cannot be entirely eliminated even with a fully qualified pilot and certified equipment.</li>
  <li>You take part voluntarily and accept the risks that may arise during the activity.</li>
  <li>You release the operator, the pilot and the instructors from liability for incidents causing loss or injury that fall within the inherent risks of the flight activity.</li>
  <li>You undertake not to bring a complaint or legal claim in respect of incidents falling within the scope of this waiver.</li>
  <li>You will follow all safety instructions given by the pilot and ground crew.</li>
  <li>This waiver applies throughout the whole time you take part in paragliding activities organised by us.</li>
</ul>
<p><b>Our responsibility:</b> we undertake to provide pilots holding valid certification, equipment meeting the applicable standards, and rescue and medical personnel as required by law. The waiver above covers risks inherent to the flight activity; where damage results from our fault, liability is determined in accordance with the law of Vietnam.</p>
<p><b>Your responsibility:</b> you are responsible for loss or damage arising from false declarations, from failure to follow the pilot's safety instructions, or from deliberately acting in a way that compromises flight safety.</p>

<h2>6. Insurance</h2>
<ul>
  <li>We hold accident insurance for passengers, as required for adventure sports activities. The premium is included in the service price.</li>
  <li>Cover, limits and claim procedures follow the policy issued by the insurer. You may ask us for details of the insurer and the scope of cover before flying.</li>
  <li>Insurance is an additional payment. It does not replace or reduce our own liability under the law where damage results from our fault.</li>
  <li>Misdeclaring your health condition or weight may cause the insurer to refuse a claim.</li>
</ul>

<h2>7. Booking and formation of contract</h2>
<ul>
  <li>You may book via the website, hotline, Zalo, WhatsApp, email or partner platforms.</li>
  <li>Your booking request is an offer to contract. The contract is formed when we send confirmation; we aim to confirm within 3 working hours of receiving the request.</li>
  <li>Flights are scheduled on a first-booked, first-served basis. On peak days at some sites, the flight order follows the time the booking was made.</li>
</ul>

<h2>8. Prices, payment and invoices</h2>
<ul>
  <li>Prices shown on the website are in Vietnamese Dong (VND) per passenger per flight and include insurance, pilot, equipment and the items listed in the description of each flying site.</li>
  <li>Optional services (flycam, 360° camera, two-way hotel transfers) are charged separately and quoted before you agree to them.</li>
  <li>Payment is made in cash, by bank transfer or by card at the flying site before take-off, unless you booked and paid online through a partner platform.</li>
  <li>We issue invoices in accordance with Vietnamese law on request. Please provide your invoicing details no later than the day you use the service.</li>
</ul>

<h2>9. Flight duration and weather</h2>
<ul>
  <li>Unpowered paragliding depends entirely on wind conditions. Expected airtime is around 10–15 minutes per flight. With powered paragliding you may choose a duration of 10–25 minutes.</li>
  <li>Actual airtime may be shorter in unfavourable wind, or extended free of charge in good conditions. This is inherent to the sport and is not a shortfall in the service.</li>
  <li>Flying continuously for more than 15 minutes may cause dizziness due to changes in pressure and altitude. Please judge this according to your own condition.</li>
</ul>

<h2>10. Rescheduling, cancellation and refunds</h2>
<ul>
  <li><b>Weather or safety:</b> free rescheduling or cancellation, with a full refund of any amount paid.</li>
  <li><b>Force majeure:</b> the same applies to reasonable force-majeure situations (accident, illness with medical evidence, cancelled transport and so on).</li>
  <li><b>Peak-day backlog:</b> bad weather can delay the schedule and cause a backlog, in which case your flight may be rearranged at short notice. You may choose to wait or to cancel with a full refund.</li>
  <li><b>Cancellation for personal reasons:</b> if no costs have been incurred, you receive a full refund. If part of the service has been used (insurance activated, transfer vehicle dispatched, drinks provided and so on), you pay the costs actually incurred and the balance is refunded.</li>
  <li><b>Last-minute cancellation at the launch site:</b> if cancelling disrupts operations once the pilot and crew are in position, you bear the corresponding actual costs; the balance is refunded.</li>
  <li><b>Refund time:</b> within 7 working days of the parties agreeing the amount, by the method you used to pay. For bookings made through partner platforms, refunds follow that platform's process.</li>
</ul>

<h2>11. Filming services</h2>
<ul>
  <li>GoPro photos and video taken by the pilot are provided free of charge.</li>
  <li>Flycam and 360° camera coverage are optional paid services.</li>
  <li>Flights take place in wind and vibration; recording equipment may suffer technical failure, battery loss, signal loss or other faults beyond our control, and some faults only become apparent after the flight.</li>
  <li>If a paid filming service cannot be delivered or fails to meet quality standards because of technical fault, we refund 100% of the filming fee. The flight fee is not refunded, because the flight itself was carried out in full and safely.</li>
  <li>GoPro and flycam files are usually handed over immediately after the flight. 360° camera files need processing time and are sent within 24 hours via Zalo, Google Drive or WhatsApp.</li>
  <li>Where the pilot asks you to hold a device during the flight, you owe no compensation if you accidentally drop or damage it; equally, no compensation is due to you for footage lost in that situation.</li>
  <li>Flight safety always comes first. Dealing with a recording fault must never take priority over the safety of the flight.</li>
</ul>

<h2>12. Image rights</h2>
<ul>
  <li>Under Article 32 of the Civil Code 2015, using an individual's image requires that person's consent.</li>
  <li>By accepting these terms you consent to our using photographs and video recorded during your flight to present and promote our services on our website, social media and marketing materials.</li>
  <li>You may refuse or withdraw that consent at any time by contacting us by email or hotline. We will remove the material from channels we control within 7 working days.</li>
  <li>Withholding consent does not affect the service you receive and does not change the price.</li>
</ul>

<h2>13. Personal items, pets, food and drink</h2>
<ul>
  <li><b>Personal items:</b> you may bring a phone, sunglasses and small items. You are responsible for looking after your own property; we are not liable for items dropped, lost or damaged, except where the loss results from our fault. Oversized items, anything over 3 kg, or anything that compromises flight safety may be refused.</li>
  <li><b>Pets:</b> pets are allowed, but you remain responsible for their safety; a pet must be harnessed or securely positioned and kept under control at all times. The pilot may refuse a pet on safety grounds.</li>
  <li><b>Food and drink:</b> consuming alcohol before a flight is your own responsibility and may lead to refusal of carriage under section 4.</li>
</ul>

<h2>14. Personal data protection</h2>
<ul>
  <li>We process personal data in accordance with Decree 13/2023/ND-CP on personal data protection.</li>
  <li><b>Data collected:</b> name, date of birth, nationality, identity document number, weight, health condition, contact details, and flight photographs and video.</li>
  <li><b>Purposes:</b> delivering the service, ensuring flight safety, arranging and claiming insurance, issuing invoices, customer care and meeting legal obligations.</li>
  <li><b>Recipients:</b> the insurer, aviation and other competent authorities upon lawful request, transport partners and the booking platform you used.</li>
  <li><b>Sensitive data:</b> health information is sensitive personal data; we collect it only to the extent needed for flight safety and insurance, and only with your explicit consent.</li>
  <li><b>Retention:</b> for as long as needed for the purposes above and for the periods required by accounting, tax and insurance law.</li>
  <li><b>Your rights:</b> to be informed, to give or withdraw consent, to access, correct, delete, restrict processing, obtain a copy, object to processing and to complain. Contact us using the details in section 1; we respond within 72 hours.</li>
</ul>

<h2>15. Intellectual property</h2>
<ul>
  <li>All content on the website — text, images, video, logos and design — belongs to us or is used by us under licence.</li>
  <li>Copying or commercial reuse requires our written consent.</li>
</ul>

<h2>16. Force majeure</h2>
<ul>
  <li>Under Article 156 of the Civil Code 2015, neither party is liable for failure to perform caused by force majeure, including but not limited to natural disaster, extreme weather, fire, epidemic, armed conflict, strikes, or an airspace closure or flight ban ordered by the authorities.</li>
  <li>In such cases the flight is rescheduled or refunded under section 10.</li>
</ul>

<h2>17. Complaints and dispute resolution</h2>
<ul>
  <li>Send complaints to the email address or hotline in section 1. We acknowledge receipt within 3 working days and resolve the matter within 15 working days of receipt.</li>
  <li>The parties will first seek to resolve any dispute through good-faith negotiation and conciliation.</li>
  <li>Failing agreement, the dispute is referred to the competent court of Vietnam.</li>
  <li>You also have the right to complain to the Vietnamese state authority for consumer protection or to a consumer protection organisation.</li>
</ul>

<h2>18. Governing law and language</h2>
<ul>
  <li>These terms are governed by and construed in accordance with the laws of Vietnam.</li>
  <li>The Vietnamese version is the original. Translations are for reference only; in case of any discrepancy, the Vietnamese version prevails.</li>
</ul>

<h2>19. Amendments and validity</h2>
<ul>
  <li>We may amend these terms and will publish the updated version on the website with its date.</li>
  <li>Amendments apply to bookings made after publication. Bookings already confirmed remain governed by the version in force at the time of confirmation.</li>
  <li>If any clause is held invalid, the remaining clauses stay in force.</li>
</ul>
`.trim();

const fr = `
<h1>CONDITIONS GÉNÉRALES DE SERVICE</h1>
<p><i>Dernière mise à jour : ${TERMS_UPDATED_AT}</i></p>
<p><b>Le parapente est un sport à risque. Merci de lire attentivement l’ensemble des consignes de sécurité et les conditions ci-dessous avant de décider de participer.</b></p>

<h2>1. Prestataire</h2>
${entityBlock("fr")}

<h2>2. Champ d’application et acceptation</h2>
<ul>
  <li>Les présentes conditions s’appliquent au site mebayluon.com et à l’ensemble de nos services : vol en parapente biplace, paramoteur, stages de pilotage, prestations de captation vidéo optionnelles et hébergement au Clubhouse Mebayluon.</li>
  <li>Vous êtes réputé avoir lu, compris et accepté ces conditions dès lors que vous cochez la case de consentement lors de la confirmation de réservation, que vous payez, ou que vous participez à un vol.</li>
  <li>Il s’agit de conditions générales au sens de la loi vietnamienne sur la protection des droits des consommateurs de 2023. Vous pouvez nous demander d’expliquer toute clause avant de l’accepter.</li>
  <li>En cas de réservation via une plateforme partenaire (Klook, GetYourGuide, Viator, KKday, Seek Sophie, Booking.com, Agoda, Trip.com…), les conditions de cette plateforme s’appliquent également à la réservation et au paiement ; les présentes conditions régissent la réalisation du vol.</li>
</ul>

<h2>3. Définitions</h2>
<ul>
  <li><b>Nous</b> : l’entité identifiée à la section 1.</li>
  <li><b>Passager</b> : la personne qui effectue le vol.</li>
  <li><b>Vol biplace</b> : vol avec un pilote commandant de bord et un passager.</li>
  <li><b>Paramoteur (PPG/chariot)</b> : parapente équipé d’un moteur.</li>
  <li><b>Vol</b> : l’ensemble du parcours, de la prise en charge au point de rendez-vous jusqu’à la fin de l’activité sur l’aire d’atterrissage.</li>
</ul>

<h2>4. Conditions de participation</h2>
<ul>
  <li><b>Âge :</b> à partir de 3 ans. Tout mineur de moins de 18 ans doit disposer de l’accord d’un parent ou tuteur légal, qui signe en son nom et répond conjointement de l’exactitude des informations déclarées.</li>
  <li><b>Poids :</b> moins de 120 kg. Au-delà de 90 kg ou en dessous de 30 kg, merci de nous prévenir à l’avance afin d’affecter un pilote et un matériel adaptés.</li>
  <li><b>Santé :</b> une condition physique de base et la capacité de courir sur quelques mètres sont nécessaires. L’activité est déconseillée en cas d’épilepsie, de maladie cardiovasculaire grave, d’hypertension non contrôlée, de troubles neurologiques, de vertiges ou malaises fréquents, de pathologies de la colonne ou des articulations, en cas de grossesse, ou sous traitement affectant les réflexes.</li>
  <li><b>État d’ébriété :</b> tout passager en état d’ébriété, sous l’emprise de substances ou incapable de maîtriser son comportement se verra refuser le vol pour raisons de sécurité.</li>
  <li><b>Exactitude des informations :</b> vous vous engagez à fournir des informations complètes et exactes (nom, date de naissance, numéro de pièce d’identité, poids, état de santé). Une fausse déclaration peut annuler la couverture d’assurance et nous autorise à refuser le vol.</li>
  <li><b>Droit de refus pour raisons de sécurité :</b> le pilote et le coordinateur de vol décident souverainement de reporter, annuler ou refuser un vol lorsque la météo, l’état du passager ou la situation sur site ne présente pas les garanties de sécurité. Cette décision est sans appel.</li>
  <li><b>Tenue :</b> la course de décollage et l’atterrissage peuvent provoquer une chute et salir ou déchirer les vêtements. Prévoyez une tenue confortable à manches longues et des chaussures de sport ou de randonnée ; évitez les vêtements coûteux et les bijoux de valeur.</li>
</ul>

<h2>5. Avertissement sur les risques et clause de décharge</h2>
<p><b>Le parapente est un sport à risque.</b> Merci de lire attentivement l’ensemble des consignes de sécurité et les présentes conditions avant de décider de participer.</p>
<p>Le parapente figure sur la liste des sports à risque établie par le ministère de la Culture, des Sports et du Tourisme. Nous opérons conformément à la loi sur l’éducation physique et les sports, au décret 36/2019/ND-CP, à la circulaire 06/2018/TT-BVHTTDL et à la réglementation sur les aéronefs ultralégers (décret 36/2008/ND-CP, modifié par le décret 79/2011/ND-CP).</p>
<p>En réservant et en participant à un vol, vous êtes réputé avoir lu, compris et accepté la décharge suivante :</p>
<ul>
  <li>Vous reconnaissez que le parapente comporte des risques inhérents aux sports aériens, dépend des conditions météorologiques et ne peut être totalement éliminé, même avec un pilote qualifié et du matériel certifié.</li>
  <li>Vous participez volontairement et acceptez les risques susceptibles de survenir pendant l’activité.</li>
  <li>Vous déchargez l’organisateur, le pilote et les moniteurs de toute responsabilité pour les incidents causant des dommages matériels ou corporels relevant des risques inhérents à l’activité de vol.</li>
  <li>Vous vous engagez à ne pas former de réclamation ni d’action en justice pour les incidents relevant du champ de la présente décharge.</li>
  <li>Vous respecterez l’ensemble des consignes de sécurité du pilote et du personnel au sol.</li>
  <li>La présente décharge s’applique pendant toute la durée de votre participation aux activités de parapente que nous organisons.</li>
</ul>
<p><b>Notre responsabilité :</b> nous nous engageons à mobiliser des pilotes titulaires d’une certification en cours de validité, du matériel conforme aux normes ainsi que le personnel de secours et médical requis. La décharge ci-dessus couvre les risques inhérents à l’activité de vol ; lorsque le dommage résulte de notre faute, la responsabilité est déterminée conformément au droit vietnamien.</p>
<p><b>Votre responsabilité :</b> vous répondez des dommages résultant d’une fausse déclaration, du non-respect des consignes de sécurité du pilote ou d’un comportement compromettant délibérément la sécurité du vol.</p>

<h2>6. Assurance</h2>
<ul>
  <li>Nous souscrivons une assurance accident pour les passagers, comme l’exige la réglementation des sports à risque. La prime est comprise dans le prix du service.</li>
  <li>L’étendue des garanties, les plafonds et les modalités de déclaration de sinistre relèvent du contrat conclu avec l’assureur. Vous pouvez nous demander avant le vol les coordonnées de l’assureur et l’étendue des garanties.</li>
  <li>L’assurance constitue une indemnisation complémentaire. Elle ne remplace ni ne réduit notre responsabilité légale lorsque le dommage résulte de notre faute.</li>
  <li>Une déclaration inexacte de votre état de santé ou de votre poids peut entraîner un refus de prise en charge par l’assureur.</li>
</ul>

<h2>7. Réservation et formation du contrat</h2>
<ul>
  <li>La réservation s’effectue via le site, la hotline, Zalo, WhatsApp, e-mail ou les plateformes partenaires.</li>
  <li>Votre demande de réservation constitue une offre de contracter. Le contrat est formé à l’envoi de notre confirmation ; nous confirmons sous 3 heures ouvrées à compter de la réception.</li>
  <li>Les vols sont programmés par ordre de réservation. Les jours de forte affluence sur certains sites, l’ordre de passage suit l’heure de réservation.</li>
</ul>

<h2>8. Prix, paiement et factures</h2>
<ul>
  <li>Les prix affichés sont exprimés en dôngs vietnamiens (VND) par passager et par vol ; ils comprennent l’assurance, le pilote, le matériel et les prestations énumérées dans la description de chaque site.</li>
  <li>Les prestations optionnelles (flycam, caméra 360°, transferts aller-retour depuis l’hôtel) sont facturées séparément et font l’objet d’un devis préalable.</li>
  <li>Le paiement s’effectue en espèces, par virement ou par carte sur le site de vol avant le décollage, sauf réservation déjà réglée en ligne via une plateforme partenaire.</li>
  <li>Nous émettons une facture conforme à la réglementation vietnamienne sur demande. Merci de communiquer vos données de facturation au plus tard le jour de la prestation.</li>
</ul>

<h2>9. Durée de vol et météo</h2>
<ul>
  <li>Le parapente non motorisé dépend entièrement du vent. La durée en vol prévue est d’environ 10 à 15 minutes. En paramoteur, vous pouvez choisir une durée de 10 à 25 minutes.</li>
  <li>La durée réelle peut être plus courte par vent défavorable, ou prolongée gratuitement par bonnes conditions. Cela tient à la nature du sport et ne constitue pas une prestation incomplète.</li>
  <li>Un vol continu de plus de 15 minutes peut provoquer des vertiges liés aux variations de pression et d’altitude. Jugez-en selon votre état.</li>
</ul>

<h2>10. Report, annulation et remboursement</h2>
<ul>
  <li><b>Météo ou sécurité :</b> report ou annulation sans frais, avec remboursement intégral des sommes versées.</li>
  <li><b>Force majeure :</b> même traitement pour les cas de force majeure raisonnables (accident, maladie avec justificatif médical, transport annulé…).</li>
  <li><b>Report en période d’affluence :</b> le mauvais temps peut décaler le programme et créer un report de passagers ; votre vol peut alors être replanifié sans préavis. Vous pouvez attendre ou annuler avec remboursement intégral.</li>
  <li><b>Annulation pour convenance personnelle :</b> sans frais engagés, remboursement intégral. Si une partie du service a été consommée (assurance activée, navette effectuée, boissons servies…), vous réglez les frais réellement engagés et le solde vous est remboursé.</li>
  <li><b>Annulation de dernière minute sur le site :</b> si l’annulation désorganise l’exploitation alors que le pilote et l’équipe sont en place, vous supportez les frais réels correspondants ; le solde est remboursé.</li>
  <li><b>Délai de remboursement :</b> sous 7 jours ouvrés à compter de l’accord des parties sur le montant, par le moyen de paiement utilisé. Pour les réservations passées via une plateforme partenaire, le remboursement suit la procédure de cette plateforme.</li>
</ul>

<h2>11. Prestations de captation</h2>
<ul>
  <li>Les photos et vidéos GoPro réalisées par le pilote sont offertes.</li>
  <li>Le flycam et la caméra 360° sont des prestations optionnelles payantes.</li>
  <li>Le vol se déroule dans le vent et les vibrations ; le matériel d’enregistrement peut connaître une panne technique, une perte de batterie ou de signal, ou d’autres défauts hors de notre contrôle, parfois constatés seulement après le vol.</li>
  <li>Si une prestation de captation payante ne peut être fournie ou n’atteint pas le niveau de qualité attendu du fait d’une panne technique, nous remboursons 100 % du prix de cette prestation. Le prix du vol n’est pas remboursé, le vol ayant été effectué intégralement et en sécurité.</li>
  <li>Les fichiers GoPro et flycam sont généralement remis juste après le vol. Les fichiers de la caméra 360° nécessitent un traitement et sont transmis sous 24 heures via Zalo, Google Drive ou WhatsApp.</li>
  <li>Lorsque le pilote vous confie un appareil pendant le vol, aucune indemnisation ne vous est réclamée si vous le faites tomber ou l’endommagez involontairement ; réciproquement, aucune indemnisation ne vous est due pour les images perdues dans ce cas.</li>
  <li>La sécurité du vol prime toujours. La gestion d’une panne de matériel ne doit jamais passer avant la sécurité.</li>
</ul>

<h2>12. Droit à l’image</h2>
<ul>
  <li>En vertu de l’article 32 du Code civil de 2015, l’utilisation de l’image d’une personne requiert son consentement.</li>
  <li>En acceptant les présentes conditions, vous consentez à l’utilisation des photos et vidéos de votre vol pour présenter et promouvoir nos services sur notre site, nos réseaux sociaux et nos supports de communication.</li>
  <li>Vous pouvez refuser ou retirer ce consentement à tout moment par e-mail ou via la hotline. Nous retirons les contenus des canaux que nous gérons sous 7 jours ouvrés.</li>
  <li>Le refus n’a aucune incidence sur la prestation fournie ni sur son prix.</li>
</ul>

<h2>13. Effets personnels, animaux, nourriture et boissons</h2>
<ul>
  <li><b>Effets personnels :</b> téléphone, lunettes de soleil et petits objets sont admis. Vous en assurez la garde ; nous ne répondons pas des objets tombés, perdus ou endommagés, sauf faute de notre part. Les objets encombrants, de plus de 3 kg ou compromettant la sécurité peuvent être refusés.</li>
  <li><b>Animaux :</b> admis, mais vous restez responsable de leur sécurité ; l’animal doit être harnaché ou correctement installé et maîtrisé en permanence. Le pilote peut refuser un animal pour raisons de sécurité.</li>
  <li><b>Nourriture et boissons :</b> la consommation d’alcool avant le vol relève de votre responsabilité et peut entraîner un refus d’embarquement au titre de la section 4.</li>
</ul>

<h2>14. Protection des données personnelles</h2>
<ul>
  <li>Nous traitons les données personnelles conformément au décret 13/2023/ND-CP relatif à la protection des données personnelles.</li>
  <li><b>Données collectées :</b> nom, date de naissance, nationalité, numéro de pièce d’identité, poids, état de santé, coordonnées, photos et vidéos du vol.</li>
  <li><b>Finalités :</b> exécution du service, sécurité du vol, souscription et mise en jeu de l’assurance, facturation, relation client et respect des obligations légales.</li>
  <li><b>Destinataires :</b> l’assureur, les autorités aéronautiques et administratives compétentes sur demande légale, les partenaires de transport et la plateforme de réservation utilisée.</li>
  <li><b>Données sensibles :</b> les informations de santé sont des données sensibles ; elles ne sont collectées que dans la mesure nécessaire à la sécurité du vol et à l’assurance, et uniquement avec votre consentement explicite.</li>
  <li><b>Durée de conservation :</b> le temps nécessaire aux finalités ci-dessus et selon les durées imposées par la réglementation comptable, fiscale et assurantielle.</li>
  <li><b>Vos droits :</b> être informé, consentir ou retirer votre consentement, accéder, rectifier, effacer, limiter le traitement, obtenir une copie, vous opposer au traitement et réclamer. Contactez-nous via les coordonnées de la section 1 ; nous répondons sous 72 heures.</li>
</ul>

<h2>15. Propriété intellectuelle</h2>
<ul>
  <li>L’ensemble des contenus du site — textes, images, vidéos, logos et design — nous appartient ou est exploité sous licence.</li>
  <li>Toute reproduction ou réutilisation commerciale requiert notre accord écrit.</li>
</ul>

<h2>16. Force majeure</h2>
<ul>
  <li>Conformément à l’article 156 du Code civil de 2015, aucune partie n’est responsable d’une inexécution due à un cas de force majeure, notamment : catastrophe naturelle, météo extrême, incendie, épidémie, conflit armé, grève, fermeture de l’espace aérien ou interdiction de vol décidée par les autorités.</li>
  <li>Le vol est alors reporté ou remboursé selon la section 10.</li>
</ul>

<h2>17. Réclamations et litiges</h2>
<ul>
  <li>Adressez vos réclamations à l’e-mail ou à la hotline de la section 1. Nous accusons réception sous 3 jours ouvrés et traitons la demande sous 15 jours ouvrés à compter de la réception.</li>
  <li>Les parties privilégient la négociation et la conciliation de bonne foi.</li>
  <li>À défaut d’accord, le litige est porté devant le tribunal vietnamien compétent.</li>
  <li>Vous pouvez également saisir l’autorité vietnamienne de protection des consommateurs ou une association de consommateurs.</li>
</ul>

<h2>18. Droit applicable et langue</h2>
<ul>
  <li>Les présentes conditions sont régies et interprétées selon le droit vietnamien.</li>
  <li>La version vietnamienne fait foi. Les traductions sont fournies à titre indicatif ; en cas de divergence, la version vietnamienne prévaut.</li>
</ul>

<h2>19. Modification et validité</h2>
<ul>
  <li>Nous pouvons modifier les présentes conditions et publions la version à jour sur le site avec sa date.</li>
  <li>Les modifications s’appliquent aux réservations postérieures à la publication. Les réservations déjà confirmées restent régies par la version en vigueur au moment de la confirmation.</li>
  <li>Si une clause est jugée nulle, les autres demeurent en vigueur.</li>
</ul>
`.trim();

const ru = `
<h1>УСЛОВИЯ ПРЕДОСТАВЛЕНИЯ УСЛУГ</h1>
<p><i>Последнее обновление: ${TERMS_UPDATED_AT}</i></p>
<p><b>Парапланеризм — экстремальный вид спорта. Пожалуйста, внимательно прочитайте все инструкции по безопасности и условия ниже, прежде чем принять решение об участии.</b></p>

<h2>1. Поставщик услуг</h2>
${entityBlock("ru")}

<h2>2. Сфера применения и принятие условий</h2>
<ul>
  <li>Настоящие условия действуют для сайта mebayluon.com и всех наших услуг: полёты на параплане в тандеме, полёты на парамоторе, курсы обучения, дополнительная видеосъёмка и проживание в Clubhouse Mebayluon.</li>
  <li>Считается, что вы прочитали, поняли и приняли эти условия, если поставили галочку согласия на этапе подтверждения бронирования, произвели оплату или приняли участие в полёте.</li>
  <li>Это общие условия сделки по смыслу вьетнамского Закона о защите прав потребителей 2023 года. До принятия вы вправе попросить нас разъяснить любой пункт.</li>
  <li>При бронировании через партнёрские площадки (Klook, GetYourGuide, Viator, KKday, Seek Sophie, Booking.com, Agoda, Trip.com и другие) условия соответствующей площадки применяются к бронированию и оплате, а настоящие условия — к проведению самого полёта.</li>
</ul>

<h2>3. Определения</h2>
<ul>
  <li><b>Мы</b> — организация, указанная в разделе 1.</li>
  <li><b>Пассажир</b> — лицо, участвующее в полёте.</li>
  <li><b>Тандемный полёт</b> — полёт с одним пилотом-командиром и одним пассажиром.</li>
  <li><b>Парамотор (PPG/трайк)</b> — параплан с двигателем.</li>
  <li><b>Полёт</b> — весь маршрут от встречи в точке сбора до окончания активности на площадке приземления.</li>
</ul>

<h2>4. Условия участия</h2>
<ul>
  <li><b>Возраст:</b> от 3 лет. Для лиц младше 18 лет требуется согласие родителя или законного опекуна, который подписывает документы от их имени и несёт солидарную ответственность за достоверность заявленных сведений.</li>
  <li><b>Вес:</b> до 120 кг. При весе более 90 кг или менее 30 кг просим сообщить заранее, чтобы мы подобрали подходящего пилота и снаряжение.</li>
  <li><b>Здоровье:</b> необходима базовая физическая форма и способность пробежать короткую дистанцию. Активность не подходит при эпилепсии, тяжёлых сердечно-сосудистых заболеваниях, неконтролируемой гипертонии, неврологических расстройствах, частых головокружениях или обмороках, заболеваниях позвоночника и суставов, при беременности, а также при приёме препаратов, влияющих на реакцию.</li>
  <li><b>Опьянение:</b> пассажирам в состоянии алкогольного или наркотического опьянения либо не контролирующим своё поведение будет отказано в полёте по соображениям безопасности.</li>
  <li><b>Достоверность сведений:</b> вы обязуетесь предоставить полные и точные данные: имя, дату рождения, номер документа, вес и состояние здоровья. Недостоверные сведения могут лишить вас страхового покрытия и дают нам право отказать в полёте.</li>
  <li><b>Право отказа по соображениям безопасности:</b> пилот и координатор полётов вправе перенести, отменить или не допустить полёт, если погода, состояние пассажира или обстановка на месте не обеспечивают безопасность. Это решение окончательное.</li>
  <li><b>Одежда:</b> разбег и приземление могут привести к падению, загрязнению или повреждению одежды. Наденьте удобную одежду с длинным рукавом и спортивную или треккинговую обувь; не надевайте дорогую одежду и ценные украшения.</li>
</ul>

<h2>5. Предупреждение о рисках и отказ от претензий</h2>
<p><b>Парапланеризм — экстремальный вид спорта.</b> Пожалуйста, внимательно прочитайте все инструкции по безопасности и настоящие условия, прежде чем принять решение об участии.</p>
<p>Парапланеризм включён в перечень экстремальных видов спорта, утверждённый Министерством культуры, спорта и туризма. Мы работаем в соответствии с Законом о физической культуре и спорте, Декретом 36/2019/ND-CP, Циркуляром 06/2018/TT-BVHTTDL и правилами эксплуатации сверхлёгких летательных аппаратов (Декрет 36/2008/ND-CP с изменениями, внесёнными Декретом 79/2011/ND-CP).</p>
<p>Бронируя и принимая участие в полёте, вы считаетесь прочитавшим, понявшим и принявшим следующий отказ от претензий:</p>
<ul>
  <li>Вы осознаёте, что парапланеризм сопряжён с рисками, присущими воздушным видам спорта, зависит от метеоусловий и не может быть исключён полностью даже при квалифицированном пилоте и сертифицированном снаряжении.</li>
  <li>Вы участвуете добровольно и принимаете риски, которые могут возникнуть в ходе активности.</li>
  <li>Вы освобождаете организатора, пилота и инструкторов от ответственности за происшествия, повлёкшие вред имуществу или здоровью, которые относятся к присущим полёту рискам.</li>
  <li>Вы обязуетесь не предъявлять претензий и не подавать исков в отношении происшествий, подпадающих под настоящий отказ.</li>
  <li>Вы будете выполнять все указания пилота и наземного персонала по безопасности.</li>
  <li>Настоящий отказ действует в течение всего времени вашего участия в организуемых нами полётах на параплане.</li>
</ul>
<p><b>Наша ответственность:</b> мы обязуемся обеспечить пилотов с действующей квалификацией, снаряжение установленного стандарта, а также спасательный и медицинский персонал в соответствии с требованиями закона. Приведённый выше отказ распространяется на риски, присущие полёту; если вред причинён по нашей вине, ответственность определяется по законодательству Вьетнама.</p>
<p><b>Ваша ответственность:</b> вы отвечаете за вред, возникший вследствие недостоверных сведений, невыполнения указаний пилота по безопасности либо умышленных действий, ставящих под угрозу безопасность полёта.</p>

<h2>6. Страхование</h2>
<ul>
  <li>Мы оформляем страхование от несчастного случая для пассажиров, как того требуют правила для экстремальных видов спорта. Страховая премия включена в стоимость услуги.</li>
  <li>Объём покрытия, лимиты и порядок урегулирования убытков определяются договором со страховщиком. До полёта вы вправе запросить у нас сведения о страховщике и объёме покрытия.</li>
  <li>Страховая выплата является дополнительной. Она не заменяет и не уменьшает нашу предусмотренную законом ответственность, если вред причинён по нашей вине.</li>
  <li>Недостоверные сведения о состоянии здоровья или весе могут повлечь отказ страховщика в выплате.</li>
</ul>

<h2>7. Бронирование и заключение договора</h2>
<ul>
  <li>Забронировать можно через сайт, горячую линию, Zalo, WhatsApp, электронную почту или партнёрские площадки.</li>
  <li>Ваша заявка является офертой. Договор считается заключённым с момента отправки нами подтверждения; мы подтверждаем бронь в течение 3 рабочих часов с момента получения заявки.</li>
  <li>Полёты планируются в порядке поступления броней. В пиковые дни на отдельных площадках очерёдность определяется временем бронирования.</li>
</ul>

<h2>8. Цены, оплата и счета</h2>
<ul>
  <li>Цены на сайте указаны во вьетнамских донгах (VND) за одного пассажира за один полёт и включают страховку, работу пилота, снаряжение и позиции, перечисленные в описании каждого места полётов.</li>
  <li>Дополнительные услуги (съёмка с дрона, камера 360°, трансфер от отеля и обратно) оплачиваются отдельно, стоимость сообщается до вашего согласия.</li>
  <li>Оплата производится наличными, переводом или картой на месте вылета до старта, кроме случаев онлайн-оплаты через партнёрскую площадку.</li>
  <li>По запросу мы выставляем счёт в соответствии с вьетнамским законодательством. Просим предоставить реквизиты не позднее дня оказания услуги.</li>
</ul>

<h2>9. Продолжительность полёта и погода</h2>
<ul>
  <li>Полёт на параплане без двигателя полностью зависит от ветра. Ожидаемое время в воздухе — около 10–15 минут. На парамоторе можно выбрать продолжительность 10–25 минут.</li>
  <li>Фактическое время может быть меньше при неблагоприятном ветре либо бесплатно продлено при хороших условиях. Это особенность вида спорта, а не неполное оказание услуги.</li>
  <li>Непрерывный полёт дольше 15 минут может вызвать головокружение из-за перепадов давления и высоты. Оцените это по своему состоянию.</li>
</ul>

<h2>10. Перенос, отмена и возврат</h2>
<ul>
  <li><b>Погода или безопасность:</b> бесплатный перенос или отмена с возвратом 100% уплаченной суммы.</li>
  <li><b>Форс-мажор:</b> то же самое при обоснованных форс-мажорных обстоятельствах (несчастный случай, болезнь с медицинским подтверждением, отмена транспорта и т. п.).</li>
  <li><b>Скопление в пиковые дни:</b> непогода может сдвинуть расписание; тогда ваш полёт может быть перенесён без предварительного уведомления. Вы вправе подождать либо отменить с полным возвратом.</li>
  <li><b>Отмена по личным причинам:</b> если расходы не возникли — полный возврат. Если часть услуги уже использована (страховка активирована, трансфер выполнен, напитки предоставлены и т. п.), вы оплачиваете фактически понесённые расходы, остаток возвращается.</li>
  <li><b>Отмена в последний момент на площадке:</b> если отмена нарушает работу, когда пилот и персонал уже на позиции, вы несёте соответствующие фактические расходы; остаток возвращается.</li>
  <li><b>Срок возврата:</b> в течение 7 рабочих дней с момента согласования суммы, тем же способом, каким была произведена оплата. По броням через партнёрские площадки возврат осуществляется по правилам площадки.</li>
</ul>

<h2>11. Услуги видеосъёмки</h2>
<ul>
  <li>Фото и видео с GoPro, снятые пилотом, предоставляются бесплатно.</li>
  <li>Съёмка с дрона и камерой 360° — платные дополнительные услуги.</li>
  <li>Полёт проходит в условиях ветра и вибрации; оборудование может выйти из строя, разрядиться, потерять сигнал или дать иной сбой вне нашего контроля, причём часть неисправностей обнаруживается только после полёта.</li>
  <li>Если платная услуга съёмки не может быть оказана или не отвечает требованиям качества из-за технической неисправности, мы возвращаем 100% стоимости именно этой услуги. Стоимость полёта не возвращается, так как полёт был выполнен полностью и безопасно.</li>
  <li>Файлы GoPro и с дрона обычно передаются сразу после полёта. Материал с камеры 360° требует обработки и передаётся в течение 24 часов через Zalo, Google Drive или WhatsApp.</li>
  <li>Если пилот просит вас подержать устройство в полёте, вы не возмещаете ущерб при случайном падении или повреждении; равным образом вам не возмещаются утраченные в такой ситуации материалы.</li>
  <li>Безопасность полёта всегда в приоритете. Устранение неисправности техники никогда не ставится выше безопасности.</li>
</ul>

<h2>12. Право на изображение</h2>
<ul>
  <li>Согласно статье 32 Гражданского кодекса 2015 года использование изображения гражданина требует его согласия.</li>
  <li>Принимая настоящие условия, вы даёте согласие на использование фото и видео вашего полёта для представления и продвижения наших услуг на сайте, в социальных сетях и рекламных материалах.</li>
  <li>Вы вправе отказаться или отозвать согласие в любое время, сообщив нам по электронной почте или через горячую линию. Мы удалим материалы с подконтрольных нам каналов в течение 7 рабочих дней.</li>
  <li>Отказ не влияет на качество услуги и не меняет её стоимость.</li>
</ul>

<h2>13. Личные вещи, домашние животные, еда и напитки</h2>
<ul>
  <li><b>Личные вещи:</b> можно взять телефон, солнцезащитные очки и мелкие предметы. Вы сами отвечаете за сохранность своих вещей; мы не несём ответственности за упавшие, утерянные или повреждённые вещи, кроме случаев, когда ущерб причинён по нашей вине. Габаритные предметы, тяжелее 3 кг или угрожающие безопасности, могут быть не допущены.</li>
  <li><b>Домашние животные:</b> допускаются, но вы отвечаете за их безопасность; животное должно быть в подвеске или надёжно закреплено и постоянно под контролем. Пилот вправе отказать по соображениям безопасности.</li>
  <li><b>Еда и напитки:</b> употребление алкоголя перед полётом — ваша личная ответственность и может повлечь отказ в полёте согласно разделу 4.</li>
</ul>

<h2>14. Защита персональных данных</h2>
<ul>
  <li>Мы обрабатываем персональные данные в соответствии с Декретом 13/2023/ND-CP о защите персональных данных.</li>
  <li><b>Собираемые данные:</b> имя, дата рождения, гражданство, номер документа, вес, состояние здоровья, контактные данные, фото и видео полёта.</li>
  <li><b>Цели:</b> оказание услуги, обеспечение безопасности полёта, оформление страховки и урегулирование убытков, выставление счетов, работа с клиентами и исполнение требований закона.</li>
  <li><b>Получатели:</b> страховщик, авиационные и иные компетентные органы по законному запросу, транспортные партнёры и использованная вами площадка бронирования.</li>
  <li><b>Чувствительные данные:</b> сведения о здоровье относятся к чувствительным персональным данным; мы собираем их только в объёме, необходимом для безопасности полёта и страхования, и только с вашего явного согласия.</li>
  <li><b>Срок хранения:</b> в течение времени, необходимого для указанных целей, и в сроки, установленные законодательством о бухгалтерском учёте, налогах и страховании.</li>
  <li><b>Ваши права:</b> быть проинформированным, дать или отозвать согласие, получить доступ, исправить, удалить, ограничить обработку, получить копию, возразить против обработки и подать жалобу. Пишите по контактам из раздела 1; мы отвечаем в течение 72 часов.</li>
</ul>

<h2>15. Интеллектуальная собственность</h2>
<ul>
  <li>Все материалы сайта — тексты, изображения, видео, логотипы и дизайн — принадлежат нам либо используются нами на законном основании.</li>
  <li>Копирование и коммерческое использование допускаются только с нашего письменного согласия.</li>
</ul>

<h2>16. Обстоятельства непреодолимой силы</h2>
<ul>
  <li>Согласно статье 156 Гражданского кодекса 2015 года стороны не отвечают за неисполнение обязательств вследствие непреодолимой силы, включая, помимо прочего: стихийные бедствия, экстремальную погоду, пожар, эпидемию, военные действия, забастовки, закрытие воздушного пространства или запрет полётов решением уполномоченных органов.</li>
  <li>В таких случаях полёт переносится либо стоимость возвращается согласно разделу 10.</li>
</ul>

<h2>17. Претензии и разрешение споров</h2>
<ul>
  <li>Претензии направляйте на электронную почту или горячую линию из раздела 1. Мы подтверждаем получение в течение 3 рабочих дней и разрешаем вопрос в течение 15 рабочих дней с момента получения.</li>
  <li>Стороны в первую очередь стремятся урегулировать спор путём добросовестных переговоров и примирения.</li>
  <li>При недостижении согласия спор передаётся в компетентный суд Вьетнама.</li>
  <li>Вы также вправе обратиться с жалобой в государственный орган Вьетнама по защите прав потребителей или в общественную организацию потребителей.</li>
</ul>

<h2>18. Применимое право и язык</h2>
<ul>
  <li>Настоящие условия регулируются и толкуются в соответствии с законодательством Вьетнама.</li>
  <li>Вьетнамская версия является оригиналом. Переводы носят справочный характер; при расхождениях преимущество имеет вьетнамская версия.</li>
</ul>

<h2>19. Изменения и действительность</h2>
<ul>
  <li>Мы вправе изменять настоящие условия и публикуем обновлённую редакцию на сайте с указанием даты.</li>
  <li>Изменения применяются к броням, оформленным после публикации. К уже подтверждённым броням применяется редакция, действовавшая на момент подтверждения.</li>
  <li>Если какое-либо положение будет признано недействительным, остальные сохраняют силу.</li>
</ul>
`.trim();

const zh = `
<h1>服务条款与条件</h1>
<p><i>最后更新：${TERMS_UPDATED_AT}</i></p>
<p><b>滑翔伞属于高危险性体育运动。参加前请仔细阅读全部安全须知与以下条款。</b></p>

<h2>1. 服务提供方</h2>
${entityBlock("zh")}

<h2>2. 适用范围与接受条款</h2>
<ul>
  <li>本条款适用于 mebayluon.com 网站及我们提供的全部服务：双人滑翔伞飞行、动力滑翔伞飞行、飞行培训课程、可选拍摄服务以及 Clubhouse Mebayluon 住宿。</li>
  <li>当您在预订确认步骤勾选同意、完成付款或参加飞行时，即视为您已阅读、理解并接受本条款。</li>
  <li>本条款属于越南《2023 年消费者权益保护法》所称的一般交易条件。接受前，您可要求我们解释任何条款。</li>
  <li>若您通过合作平台（Klook、GetYourGuide、Viator、KKday、Seek Sophie、Booking.com、Agoda、Trip.com 等）预订，该平台条款同时适用于预订与付款环节；本条款适用于飞行本身的实施。</li>
</ul>

<h2>3. 定义</h2>
<ul>
  <li><b>我们</b>：第 1 条所列主体。</li>
  <li><b>乘客</b>：实际参加飞行的人。</li>
  <li><b>双人飞行</b>：由一名机长驾驶、搭载一名乘客的飞行。</li>
  <li><b>动力滑翔伞（PPG／三轮车）</b>：加装发动机的滑翔伞。</li>
  <li><b>飞行</b>：自集合点接人起，至降落场活动结束止的全部行程。</li>
</ul>

<h2>4. 参加条件</h2>
<ul>
  <li><b>年龄：</b>3 周岁以上。未满 18 周岁者须经父母或法定监护人同意，由其代为签署并对所申报信息的真实性承担连带责任。</li>
  <li><b>体重：</b>120 公斤以下。体重超过 90 公斤或低于 30 公斤，请提前告知，以便安排合适的飞行员与装备。</li>
  <li><b>健康：</b>需具备基本体能并能短距离助跑。以下情形不宜参加：癫痫、严重心血管疾病、未受控的高血压、神经系统疾病、经常头晕或昏厥、脊柱及关节疾病、孕妇，或正在服用影响反应能力的药物。</li>
  <li><b>醉酒：</b>处于醉酒、药物影响或无法控制行为状态的乘客，出于安全考虑将被拒绝飞行。</li>
  <li><b>信息真实：</b>您承诺完整准确地提供姓名、出生日期、证件号码、体重及健康状况。虚假申报可能导致保险不予理赔，我们亦有权拒绝提供飞行服务。</li>
  <li><b>基于安全的拒绝权：</b>当飞行员与飞行调度员判断天气、乘客状态或现场情况不具备安全条件时，有权推迟、取消或拒绝任何一次飞行，该决定为最终决定。</li>
  <li><b>着装：</b>助跑与降落可能导致滑倒，衣物可能弄脏或刮破。建议穿着便于活动的长袖衣物及运动鞋或登山鞋，勿穿昂贵服装、勿佩戴贵重首饰。</li>
</ul>

<h2>5. 风险提示与免责声明</h2>
<p><b>滑翔伞属于高危险性体育运动。</b>参加前请仔细阅读全部安全须知与本条款。</p>
<p>滑翔伞属于越南文化体育与旅游部公布的高危险性体育活动目录。我们依据《体育法》、第 36/2019/ND-CP 号法令、第 06/2018/TT-BVHTTDL 号通知，以及关于超轻型航空器的第 36/2008/ND-CP 号法令（经第 79/2011/ND-CP 号法令修订）开展经营。</p>
<p>预订并参加飞行，即视为您已阅读、理解并接受以下免责内容：</p>
<ul>
  <li>您明确知悉滑翔伞具有航空运动固有的风险，受气象条件影响，即便飞行员资质齐备、装备符合标准也无法完全消除。</li>
  <li>您自愿参加，并接受活动过程中可能产生的风险。</li>
  <li>对于属于飞行活动固有风险范围内、造成财产或健康损害的事故，您免除主办方、飞行员及教练的责任。</li>
  <li>对于属于上述免责范围内的事故，您承诺不提出投诉或诉讼。</li>
  <li>您将完全遵守飞行员与地面工作人员的安全指令。</li>
  <li>本免责声明在您参加我们组织的滑翔伞活动的全部期间内有效。</li>
</ul>
<p><b>我们的责任：</b>我们承诺配备持有效资质的飞行员、符合标准的装备，以及法规要求的救护与医务人员。上述免责适用于飞行活动的固有风险；因我们的过错造成损害的，责任依越南法律确定。</p>
<p><b>您的责任：</b>因您虚假申报、不遵守飞行员安全指令，或故意实施危及飞行安全的行为而造成的损害，由您承担责任。</p>

<h2>6. 保险</h2>
<ul>
  <li>我们按高危险性体育活动的规定为乘客投保意外险，保费已含在服务价格中。</li>
  <li>保障范围、赔付限额及理赔程序以与保险公司签订的保单为准。飞行前，您可要求我们提供保险公司信息与保障范围。</li>
  <li>保险属于额外赔付，不替代也不减少我们在因自身过错造成损害时依法应承担的赔偿责任。</li>
  <li>虚报健康状况或体重可能导致保险公司拒赔。</li>
</ul>

<h2>7. 预订与合同成立</h2>
<ul>
  <li>可通过网站、热线、Zalo、WhatsApp、电子邮件或合作平台预订。</li>
  <li>您的预订请求为订立合同的要约。我们发出确认时合同成立；我们将在收到请求后 3 个工作小时内确认。</li>
  <li>飞行按先订先服务原则安排。部分飞行点在高峰日按预订时间确定飞行顺序。</li>
</ul>

<h2>8. 价格、付款与发票</h2>
<ul>
  <li>网站标价以越南盾（VND）计，为每位乘客每次飞行的价格，已包含保险、飞行员、装备及各飞行点说明中列明的项目。</li>
  <li>可选服务（航拍、360° 相机、酒店往返接送）另行计费，并在您同意前告知价格。</li>
  <li>除通过合作平台在线支付外，均在起飞前于飞行点以现金、转账或刷卡方式付款。</li>
  <li>应您要求，我们依越南法律开具发票。请最迟于使用服务当日提供开票信息。</li>
</ul>

<h2>9. 飞行时长与天气</h2>
<ul>
  <li>无动力滑翔伞完全取决于风况，预计空中时间约 10–15 分钟。动力滑翔伞可在 10–25 分钟之间选择时长。</li>
  <li>风况不利时实际时长可能更短，天气良好时可免费延长。这是本项运动的固有特点，并非服务缩水。</li>
  <li>连续飞行超过 15 分钟可能因气压与高度变化而引起头晕，请依自身状况斟酌。</li>
</ul>

<h2>10. 改期、取消与退款</h2>
<ul>
  <li><b>天气或安全原因：</b>免费改期或取消，全额退还已付款项。</li>
  <li><b>不可抗力：</b>合理的不可抗力情形（意外、有医疗证明的疾病、交通取消等）同上处理。</li>
  <li><b>高峰日积压：</b>恶劣天气可能造成排期延后与客流积压，届时您的飞行可能被临时重新安排。您可选择等待，或取消并获全额退款。</li>
  <li><b>因个人原因取消：</b>未产生任何费用的，全额退款；已使用部分服务的（保险已生效、接送车已出车、饮品已提供等），由您支付实际已发生的费用，余额退还。</li>
  <li><b>在起飞点临时取消：</b>若飞行员与工作人员已就位而取消影响运营，由您承担相应实际费用，余额退还。</li>
  <li><b>退款时限：</b>双方就退款金额达成一致之日起 7 个工作日内，按原支付方式退还。通过合作平台预订的，按该平台流程退款。</li>
</ul>

<h2>11. 拍摄服务</h2>
<ul>
  <li>由飞行员拍摄的 GoPro 照片与视频免费提供。</li>
  <li>航拍与 360° 相机为付费可选服务。</li>
  <li>飞行处于有风与颠簸的环境，摄录设备可能出现技术故障、电量耗尽、信号丢失或其他不可控故障，部分故障在飞行结束后才能发现。</li>
  <li>付费拍摄服务因技术故障无法提供或未达质量要求的，我们全额退还该拍摄服务费用。飞行费用不予退还，因为飞行本身已完整且安全地完成。</li>
  <li>GoPro 与航拍素材通常在飞行结束后即时交付。360° 相机素材需要处理时间，将在 24 小时内通过 Zalo、Google Drive 或 WhatsApp 发送。</li>
  <li>飞行员请您在飞行中代持设备时，若您无意中摔落或损坏设备，无需赔偿；相应地，该情形下丢失的影像资料亦不向您赔偿。</li>
  <li>飞行安全始终优先。处理设备故障绝不得凌驾于飞行安全之上。</li>
</ul>

<h2>12. 肖像权</h2>
<ul>
  <li>根据《2015 年民法典》第 32 条，使用个人肖像须经本人同意。</li>
  <li>接受本条款即表示您同意我们将飞行中拍摄的照片与视频用于在网站、社交媒体及宣传物料上介绍和推广我们的服务。</li>
  <li>您可随时通过电子邮件或热线拒绝或撤回该同意。我们将在 7 个工作日内从自有渠道移除相关内容。</li>
  <li>不同意使用肖像不影响所获服务，也不改变服务价格。</li>
</ul>

<h2>13. 随身物品、宠物与饮食</h2>
<ul>
  <li><b>随身物品：</b>可携带手机、太阳镜及小件物品。您自行保管个人财物；除因我们的过错造成损失外，我们对掉落、遗失或损坏不承担责任。超大件、超过 3 公斤或危及飞行安全的物品可能被拒绝携带。</li>
  <li><b>宠物：</b>允许携带，但您自行承担宠物安全责任；宠物须佩戴挂带或固定于适当位置并始终处于可控状态。飞行员可基于安全考虑予以拒绝。</li>
  <li><b>饮食：</b>飞行前饮酒属您个人责任，并可能依第 4 条被拒绝飞行。</li>
</ul>

<h2>14. 个人数据保护</h2>
<ul>
  <li>我们依据关于个人数据保护的第 13/2023/ND-CP 号法令处理个人数据。</li>
  <li><b>收集的数据：</b>姓名、出生日期、国籍、证件号码、体重、健康状况、联系方式，以及飞行照片与视频。</li>
  <li><b>目的：</b>提供服务、保障飞行安全、办理与申请保险、开具发票、客户服务及履行法定义务。</li>
  <li><b>接收方：</b>保险公司、依法提出要求的航空及其他主管机关、交通合作方，以及您使用的预订平台。</li>
  <li><b>敏感数据：</b>健康信息属敏感个人数据，我们仅在飞行安全与保险所必需的范围内收集，且须经您明确同意。</li>
  <li><b>保存期限：</b>为上述目的所必需的期间，并遵守会计、税务与保险法规要求的保存期限。</li>
  <li><b>您的权利：</b>知情、同意或撤回同意、访问、更正、删除、限制处理、获取副本、反对处理及投诉。请通过第 1 条的联系方式与我们联系，我们将在 72 小时内回复。</li>
</ul>

<h2>15. 知识产权</h2>
<ul>
  <li>网站上的全部内容——文字、图片、视频、标识与设计——归我们所有或由我们合法使用。</li>
  <li>复制或商业性再利用须经我们书面同意。</li>
</ul>

<h2>16. 不可抗力</h2>
<ul>
  <li>根据《2015 年民法典》第 156 条，任何一方因不可抗力未能履行义务的，不承担责任，包括但不限于：自然灾害、极端天气、火灾、疫情、武装冲突、罢工，或主管机关下达的空域关闭、禁飞令。</li>
  <li>此种情形下，按第 10 条改期或退款。</li>
</ul>

<h2>17. 投诉与争议解决</h2>
<ul>
  <li>请通过第 1 条所列邮箱或热线提出投诉。我们将在 3 个工作日内确认收到，并自收到之日起 15 个工作日内处理完毕。</li>
  <li>双方应本着善意优先通过协商与调解解决争议。</li>
  <li>协商不成的，提交越南有管辖权的法院解决。</li>
  <li>您亦有权向越南消费者权益保护主管机关或消费者保护社会组织投诉。</li>
</ul>

<h2>18. 适用法律与语言</h2>
<ul>
  <li>本条款受越南法律管辖并据其解释。</li>
  <li>越南语版本为原本。译文仅供参考；如有歧义，以越南语版本为准。</li>
</ul>

<h2>19. 修改与效力</h2>
<ul>
  <li>我们可修改本条款，并在网站上公布更新版本及其日期。</li>
  <li>修改适用于公布之后产生的订单。已确认的订单仍适用确认时有效的版本。</li>
  <li>若某一条款被认定无效，其余条款仍然有效。</li>
</ul>
`.trim();

const hi = `
<h1>सेवा के नियम और शर्तें</h1>
<p><i>अंतिम अद्यतन: ${TERMS_UPDATED_AT}</i></p>
<p><b>पैराग्लाइडिंग एक साहसिक खेल है। भाग लेने का निर्णय करने से पहले कृपया सभी सुरक्षा निर्देश और नीचे दी गई शर्तें ध्यान से पढ़ें।</b></p>

<h2>1. सेवा प्रदाता</h2>
${entityBlock("hi")}

<h2>2. दायरा और स्वीकृति</h2>
<ul>
  <li>ये शर्तें mebayluon.com और हमारी सभी सेवाओं पर लागू होती हैं: टैंडम पैराग्लाइडिंग, पैरामोटर उड़ान, उड़ान प्रशिक्षण कोर्स, वैकल्पिक फ़िल्मांकन सेवाएँ और Clubhouse Mebayluon में ठहरना।</li>
  <li>बुकिंग पुष्टि चरण में सहमति बॉक्स पर टिक करने, भुगतान करने, या उड़ान में भाग लेने पर यह माना जाएगा कि आपने ये शर्तें पढ़ ली, समझ ली और स्वीकार कर ली हैं।</li>
  <li>ये वियतनाम के उपभोक्ता अधिकार संरक्षण अधिनियम 2023 के अर्थ में सामान्य लेनदेन शर्तें हैं। स्वीकार करने से पहले आप किसी भी खंड की व्याख्या माँग सकते हैं।</li>
  <li>यदि आप किसी साझेदार प्लेटफ़ॉर्म (Klook, GetYourGuide, Viator, KKday, Seek Sophie, Booking.com, Agoda, Trip.com आदि) से बुक करते हैं, तो बुकिंग और भुगतान पर उस प्लेटफ़ॉर्म की शर्तें भी लागू होंगी; उड़ान के संचालन पर ये शर्तें लागू होंगी।</li>
</ul>

<h2>3. परिभाषाएँ</h2>
<ul>
  <li><b>हम</b>: खंड 1 में उल्लिखित इकाई।</li>
  <li><b>यात्री</b>: उड़ान में भाग लेने वाला व्यक्ति।</li>
  <li><b>टैंडम उड़ान</b>: एक कमांडर पायलट और एक यात्री वाली उड़ान।</li>
  <li><b>पैरामोटर (PPG/ट्राइक)</b>: इंजन लगा हुआ पैराग्लाइडर।</li>
  <li><b>उड़ान</b>: मिलन स्थल पर लेने से लेकर लैंडिंग स्थल पर गतिविधि समाप्त होने तक की पूरी यात्रा।</li>
</ul>

<h2>4. भाग लेने की शर्तें</h2>
<ul>
  <li><b>आयु:</b> 3 वर्ष से ऊपर। 18 वर्ष से कम आयु वालों के लिए माता-पिता या कानूनी अभिभावक की सहमति आवश्यक है, जो उनकी ओर से हस्ताक्षर करते हैं और घोषित जानकारी की सत्यता के लिए संयुक्त रूप से उत्तरदायी होते हैं।</li>
  <li><b>वज़न:</b> 120 किग्रा से कम। यदि आपका वज़न 90 किग्रा से अधिक या 30 किग्रा से कम है, तो कृपया पहले से बताएँ ताकि उपयुक्त पायलट और उपकरण की व्यवस्था हो सके।</li>
  <li><b>स्वास्थ्य:</b> बुनियादी फ़िटनेस और थोड़ी दूरी दौड़ने की क्षमता आवश्यक है। मिर्गी, गंभीर हृदय रोग, अनियंत्रित उच्च रक्तचाप, तंत्रिका संबंधी विकार, बार-बार चक्कर या बेहोशी, रीढ़ या जोड़ों की समस्या, गर्भावस्था, या प्रतिक्रिया क्षमता को प्रभावित करने वाली दवा लेने की स्थिति में यह गतिविधि उपयुक्त नहीं है।</li>
  <li><b>नशा:</b> नशे की हालत में, मादक पदार्थों के प्रभाव में, या अपने व्यवहार पर नियंत्रण न रखने वाले यात्रियों को सुरक्षा कारणों से उड़ान से मना कर दिया जाएगा।</li>
  <li><b>सही जानकारी:</b> आप नाम, जन्म तिथि, पहचान पत्र संख्या, वज़न और स्वास्थ्य स्थिति की पूरी और सटीक जानकारी देने का वचन देते हैं। ग़लत घोषणा से बीमा कवर समाप्त हो सकता है और हमें उड़ान से मना करने का अधिकार मिलता है।</li>
  <li><b>सुरक्षा के आधार पर मना करने का अधिकार:</b> मौसम, यात्री की स्थिति या मौके के हालात सुरक्षित न लगने पर पायलट और उड़ान समन्वयक किसी भी उड़ान को स्थगित, रद्द या अस्वीकार कर सकते हैं। यह निर्णय अंतिम होगा।</li>
  <li><b>पोशाक:</b> टेक-ऑफ़ दौड़ और लैंडिंग में फिसलन हो सकती है तथा कपड़े गंदे या फट सकते हैं। आरामदायक पूरी बाँह के कपड़े और स्पोर्ट्स या ट्रेकिंग जूते पहनें; महँगे कपड़े और क़ीमती गहने न पहनें।</li>
</ul>

<h2>5. जोखिम चेतावनी और दायित्व-मुक्ति</h2>
<p><b>पैराग्लाइडिंग एक साहसिक खेल है।</b> भाग लेने का निर्णय करने से पहले कृपया सभी सुरक्षा निर्देश और ये शर्तें ध्यान से पढ़ें।</p>
<p>पैराग्लाइडिंग वियतनाम के संस्कृति, खेल एवं पर्यटन मंत्रालय द्वारा जारी साहसिक खेलों की सूची में शामिल है। हम शारीरिक शिक्षा एवं खेल अधिनियम, डिक्री 36/2019/ND-CP, परिपत्र 06/2018/TT-BVHTTDL तथा अल्ट्रालाइट विमानों संबंधी डिक्री 36/2008/ND-CP (डिक्री 79/2011/ND-CP द्वारा संशोधित) के अनुसार संचालन करते हैं।</p>
<p>बुकिंग करने और उड़ान में भाग लेने पर यह माना जाएगा कि आपने निम्नलिखित दायित्व-मुक्ति पढ़, समझ और स्वीकार कर ली है:</p>
<ul>
  <li>आप स्वीकार करते हैं कि पैराग्लाइडिंग में वायु खेलों के अंतर्निहित जोखिम होते हैं, यह मौसम पर निर्भर है, और योग्य पायलट तथा प्रमाणित उपकरण के बावजूद जोखिम पूरी तरह समाप्त नहीं किया जा सकता।</li>
  <li>आप स्वेच्छा से भाग लेते हैं और गतिविधि के दौरान उत्पन्न हो सकने वाले जोखिम स्वीकार करते हैं।</li>
  <li>उड़ान गतिविधि के अंतर्निहित जोखिमों के दायरे में आने वाली, संपत्ति या स्वास्थ्य को हानि पहुँचाने वाली घटनाओं के लिए आप आयोजक, पायलट और प्रशिक्षकों को दायित्व से मुक्त करते हैं।</li>
  <li>उपर्युक्त दायित्व-मुक्ति के दायरे में आने वाली घटनाओं के संबंध में आप शिकायत या मुक़दमा न करने का वचन देते हैं।</li>
  <li>आप पायलट और ग्राउंड स्टाफ़ के सभी सुरक्षा निर्देशों का पालन करेंगे।</li>
  <li>यह दायित्व-मुक्ति हमारे द्वारा आयोजित पैराग्लाइडिंग गतिविधियों में आपकी भागीदारी की पूरी अवधि तक लागू रहती है।</li>
</ul>
<p><b>हमारा उत्तरदायित्व:</b> हम वैध प्रमाणन वाले पायलट, मानक अनुरूप उपकरण, तथा क़ानून द्वारा अपेक्षित बचाव एवं चिकित्सा कर्मियों की व्यवस्था करने का वचन देते हैं। उपर्युक्त दायित्व-मुक्ति उड़ान गतिविधि के अंतर्निहित जोखिमों पर लागू होती है; हमारी ग़लती से हुई हानि की स्थिति में उत्तरदायित्व वियतनाम के क़ानून के अनुसार तय होगा।</p>
<p><b>आपका उत्तरदायित्व:</b> ग़लत घोषणा, पायलट के सुरक्षा निर्देशों का पालन न करने, या उड़ान सुरक्षा को जानबूझकर ख़तरे में डालने से होने वाली हानि के लिए आप उत्तरदायी हैं।</p>

<h2>6. बीमा</h2>
<ul>
  <li>साहसिक खेल गतिविधियों के लिए अपेक्षित रूप में हम यात्रियों के लिए दुर्घटना बीमा लेते हैं। प्रीमियम सेवा मूल्य में शामिल है।</li>
  <li>कवरेज, सीमाएँ और दावा प्रक्रिया बीमाकर्ता की पॉलिसी के अनुसार होंगी। उड़ान से पहले आप बीमाकर्ता और कवरेज की जानकारी माँग सकते हैं।</li>
  <li>बीमा एक अतिरिक्त भुगतान है। यह हमारी ग़लती से हुई हानि पर क़ानून के तहत हमारे दायित्व का स्थान नहीं लेता और न उसे घटाता है।</li>
  <li>स्वास्थ्य या वज़न की ग़लत घोषणा पर बीमाकर्ता दावा अस्वीकार कर सकता है।</li>
</ul>

<h2>7. बुकिंग और अनुबंध का निर्माण</h2>
<ul>
  <li>आप वेबसाइट, हॉटलाइन, Zalo, WhatsApp, ईमेल या साझेदार प्लेटफ़ॉर्म के ज़रिए बुक कर सकते हैं।</li>
  <li>आपका बुकिंग अनुरोध अनुबंध का प्रस्ताव है। हमारी पुष्टि भेजे जाने पर अनुबंध बनता है; अनुरोध मिलने के 3 कार्य-घंटों के भीतर हम पुष्टि करते हैं।</li>
  <li>उड़ानें पहले-बुक-पहले-सेवा के आधार पर तय होती हैं। कुछ स्थलों पर व्यस्त दिनों में उड़ान क्रम बुकिंग के समय के अनुसार होता है।</li>
</ul>

<h2>8. मूल्य, भुगतान और चालान</h2>
<ul>
  <li>वेबसाइट पर दिखाए गए मूल्य वियतनामी डोंग (VND) में प्रति यात्री प्रति उड़ान हैं और इनमें बीमा, पायलट, उपकरण तथा प्रत्येक स्थल के विवरण में सूचीबद्ध मदें शामिल हैं।</li>
  <li>वैकल्पिक सेवाएँ (फ्लायकैम, 360° कैमरा, होटल से दोनों तरफ़ की गाड़ी) अलग से शुल्क योग्य हैं और आपकी सहमति से पहले उनका मूल्य बताया जाता है।</li>
  <li>भुगतान उड़ान स्थल पर टेक-ऑफ़ से पहले नकद, बैंक ट्रांसफ़र या कार्ड से किया जाता है, सिवाय उन बुकिंग के जिनका भुगतान साझेदार प्लेटफ़ॉर्म पर ऑनलाइन हो चुका है।</li>
  <li>अनुरोध पर हम वियतनामी क़ानून के अनुसार चालान जारी करते हैं। कृपया चालान संबंधी विवरण सेवा वाले दिन तक अवश्य दें।</li>
</ul>

<h2>9. उड़ान अवधि और मौसम</h2>
<ul>
  <li>बिना इंजन वाली पैराग्लाइडिंग पूरी तरह हवा पर निर्भर है। अपेक्षित हवाई समय लगभग 10–15 मिनट प्रति उड़ान है। पैरामोटर में आप 10–25 मिनट की अवधि चुन सकते हैं।</li>
  <li>प्रतिकूल हवा में वास्तविक समय कम हो सकता है, और अच्छी परिस्थितियों में निःशुल्क बढ़ाया जा सकता है। यह इस खेल की प्रकृति है, सेवा में कमी नहीं।</li>
  <li>15 मिनट से अधिक लगातार उड़ान दबाव और ऊँचाई में बदलाव के कारण चक्कर पैदा कर सकती है। कृपया अपनी स्थिति के अनुसार निर्णय लें।</li>
</ul>

<h2>10. पुनर्निर्धारण, रद्दीकरण और धनवापसी</h2>
<ul>
  <li><b>मौसम या सुरक्षा:</b> निःशुल्क पुनर्निर्धारण या रद्दीकरण, भुगतान की गई पूरी राशि वापस।</li>
  <li><b>अप्रत्याशित घटना:</b> उचित अप्रत्याशित परिस्थितियों (दुर्घटना, चिकित्सकीय प्रमाण सहित बीमारी, परिवहन रद्द होना आदि) पर भी यही लागू।</li>
  <li><b>व्यस्त दिनों में देरी:</b> ख़राब मौसम से कार्यक्रम पिछड़ सकता है और भीड़ जमा हो सकती है; ऐसे में आपकी उड़ान बिना पूर्व सूचना के पुनर्निर्धारित हो सकती है। आप प्रतीक्षा कर सकते हैं या पूरी धनवापसी के साथ रद्द कर सकते हैं।</li>
  <li><b>व्यक्तिगत कारण से रद्दीकरण:</b> यदि कोई ख़र्च नहीं हुआ है तो पूरी राशि वापस। यदि सेवा का कुछ हिस्सा उपयोग हो चुका है (बीमा सक्रिय, गाड़ी भेजी जा चुकी, पेय दिए जा चुके आदि), तो वास्तविक ख़र्च आप वहन करेंगे और शेष राशि लौटा दी जाएगी।</li>
  <li><b>स्थल पर अंतिम क्षण में रद्दीकरण:</b> यदि पायलट और स्टाफ़ के तैयार हो जाने के बाद रद्दीकरण से संचालन बाधित होता है, तो तदनुरूप वास्तविक ख़र्च आप वहन करेंगे; शेष लौटा दिया जाएगा।</li>
  <li><b>धनवापसी की समय-सीमा:</b> राशि पर सहमति बनने के 7 कार्य दिवसों के भीतर, उसी माध्यम से जिससे भुगतान हुआ था। साझेदार प्लेटफ़ॉर्म से की गई बुकिंग पर उसी प्लेटफ़ॉर्म की प्रक्रिया लागू होगी।</li>
</ul>

<h2>11. फ़िल्मांकन सेवाएँ</h2>
<ul>
  <li>पायलट द्वारा लिए गए GoPro फ़ोटो और वीडियो निःशुल्क दिए जाते हैं।</li>
  <li>फ्लायकैम और 360° कैमरा सशुल्क वैकल्पिक सेवाएँ हैं।</li>
  <li>उड़ान हवा और कंपन के बीच होती है; रिकॉर्डिंग उपकरण में तकनीकी ख़राबी, बैटरी समाप्ति, सिग्नल हानि या हमारे नियंत्रण से बाहर अन्य दोष हो सकते हैं, और कुछ ख़राबियाँ उड़ान के बाद ही पता चलती हैं।</li>
  <li>यदि सशुल्क फ़िल्मांकन सेवा तकनीकी ख़राबी के कारण दी न जा सके या गुणवत्ता मानक पूरा न करे, तो हम उस फ़िल्मांकन शुल्क का 100% लौटाते हैं। उड़ान शुल्क वापस नहीं होता, क्योंकि उड़ान पूरी तरह और सुरक्षित रूप से संपन्न हुई।</li>
  <li>GoPro और फ्लायकैम फ़ाइलें आमतौर पर उड़ान के तुरंत बाद सौंपी जाती हैं। 360° कैमरा फ़ाइलों को प्रोसेसिंग की ज़रूरत होती है और वे 24 घंटे के भीतर Zalo, Google Drive या WhatsApp से भेजी जाती हैं।</li>
  <li>यदि पायलट उड़ान के दौरान आपसे कोई उपकरण पकड़ने को कहे, तो अनजाने में गिरने या क्षति होने पर आपको कोई मुआवज़ा नहीं देना होगा; इसी प्रकार उस स्थिति में खोए फ़ुटेज के लिए आपको भी मुआवज़ा नहीं मिलेगा।</li>
  <li>उड़ान सुरक्षा हमेशा सर्वोपरि है। उपकरण की ख़राबी सुलझाना कभी भी उड़ान की सुरक्षा से ऊपर नहीं रखा जाएगा।</li>
</ul>

<h2>12. छवि अधिकार</h2>
<ul>
  <li>नागरिक संहिता 2015 की धारा 32 के अनुसार किसी व्यक्ति की छवि का उपयोग उसकी सहमति से ही किया जा सकता है।</li>
  <li>इन शर्तों को स्वीकार करके आप सहमति देते हैं कि हम आपकी उड़ान के फ़ोटो और वीडियो अपनी वेबसाइट, सोशल मीडिया और प्रचार सामग्री में सेवाओं के प्रस्तुतीकरण और प्रचार हेतु उपयोग कर सकते हैं।</li>
  <li>आप ईमेल या हॉटलाइन के ज़रिए कभी भी मना कर सकते हैं या सहमति वापस ले सकते हैं। हम अपने नियंत्रण वाले चैनलों से सामग्री 7 कार्य दिवसों के भीतर हटा देंगे।</li>
  <li>सहमति न देने से आपकी सेवा और उसके मूल्य पर कोई असर नहीं पड़ता।</li>
</ul>

<h2>13. निजी सामान, पालतू जानवर, खाना-पीना</h2>
<ul>
  <li><b>निजी सामान:</b> आप फ़ोन, धूप का चश्मा और छोटी वस्तुएँ ले जा सकते हैं। अपने सामान की देखभाल आपकी ज़िम्मेदारी है; गिरने, खोने या क्षति के लिए हम उत्तरदायी नहीं हैं, सिवाय उस स्थिति के जब हानि हमारी ग़लती से हुई हो। बड़े आकार की, 3 किग्रा से भारी या उड़ान सुरक्षा में बाधक वस्तुओं को मना किया जा सकता है।</li>
  <li><b>पालतू जानवर:</b> ले जाने की अनुमति है, पर उनकी सुरक्षा की ज़िम्मेदारी आपकी है; जानवर हार्नेस में या सुरक्षित रूप से बँधा और हर समय नियंत्रण में होना चाहिए। पायलट सुरक्षा कारणों से मना कर सकता है।</li>
  <li><b>खाना-पीना:</b> उड़ान से पहले शराब का सेवन आपकी व्यक्तिगत ज़िम्मेदारी है और खंड 4 के अनुसार उड़ान से मना किया जा सकता है।</li>
</ul>

<h2>14. व्यक्तिगत डेटा संरक्षण</h2>
<ul>
  <li>हम व्यक्तिगत डेटा संरक्षण संबंधी डिक्री 13/2023/ND-CP के अनुसार डेटा संसाधित करते हैं।</li>
  <li><b>एकत्र किया गया डेटा:</b> नाम, जन्म तिथि, राष्ट्रीयता, पहचान पत्र संख्या, वज़न, स्वास्थ्य स्थिति, संपर्क विवरण, तथा उड़ान के फ़ोटो और वीडियो।</li>
  <li><b>उद्देश्य:</b> सेवा प्रदान करना, उड़ान सुरक्षा सुनिश्चित करना, बीमा लेना और दावा करना, चालान जारी करना, ग्राहक सेवा और क़ानूनी दायित्वों का पालन।</li>
  <li><b>प्राप्तकर्ता:</b> बीमाकर्ता, वैध अनुरोध पर विमानन एवं अन्य सक्षम प्राधिकरण, परिवहन साझेदार, और आपके द्वारा उपयोग किया गया बुकिंग प्लेटफ़ॉर्म।</li>
  <li><b>संवेदनशील डेटा:</b> स्वास्थ्य जानकारी संवेदनशील व्यक्तिगत डेटा है; इसे हम केवल उड़ान सुरक्षा और बीमा के लिए आवश्यक सीमा तक और आपकी स्पष्ट सहमति से ही एकत्र करते हैं।</li>
  <li><b>प्रतिधारण:</b> उपर्युक्त उद्देश्यों के लिए आवश्यक अवधि तक, तथा लेखा, कर और बीमा क़ानून द्वारा निर्धारित अवधि तक।</li>
  <li><b>आपके अधिकार:</b> सूचित होना, सहमति देना या वापस लेना, पहुँच, सुधार, विलोपन, प्रसंस्करण सीमित कराना, प्रति प्राप्त करना, आपत्ति करना और शिकायत करना। खंड 1 के संपर्क विवरण से संपर्क करें; हम 72 घंटे के भीतर उत्तर देते हैं।</li>
</ul>

<h2>15. बौद्धिक संपदा</h2>
<ul>
  <li>वेबसाइट की समस्त सामग्री — पाठ, चित्र, वीडियो, लोगो और डिज़ाइन — हमारी है या हमारे द्वारा वैध रूप से उपयोग की जा रही है।</li>
  <li>प्रतिलिपि बनाने या व्यावसायिक पुनः उपयोग के लिए हमारी लिखित सहमति आवश्यक है।</li>
</ul>

<h2>16. अप्रत्याशित घटना (Force Majeure)</h2>
<ul>
  <li>नागरिक संहिता 2015 की धारा 156 के अनुसार, अप्रत्याशित घटना के कारण दायित्व पूरा न कर पाने पर कोई भी पक्ष उत्तरदायी नहीं होगा, जिसमें शामिल हैं: प्राकृतिक आपदा, अत्यधिक ख़राब मौसम, आग, महामारी, सशस्त्र संघर्ष, हड़ताल, या प्राधिकरणों द्वारा वायुक्षेत्र बंद करना अथवा उड़ान पर रोक।</li>
  <li>ऐसी स्थिति में खंड 10 के अनुसार उड़ान पुनर्निर्धारित की जाती है या राशि लौटाई जाती है।</li>
</ul>

<h2>17. शिकायत और विवाद समाधान</h2>
<ul>
  <li>शिकायतें खंड 1 में दिए ईमेल या हॉटलाइन पर भेजें। हम 3 कार्य दिवसों के भीतर प्राप्ति की पुष्टि करते हैं और प्राप्ति से 15 कार्य दिवसों के भीतर समाधान करते हैं।</li>
  <li>पक्षकार पहले सद्भावपूर्ण बातचीत और सुलह से विवाद सुलझाने का प्रयास करेंगे।</li>
  <li>सहमति न बनने पर विवाद वियतनाम के सक्षम न्यायालय में भेजा जाएगा।</li>
  <li>आप वियतनाम के उपभोक्ता संरक्षण प्राधिकरण या उपभोक्ता संरक्षण संगठन में भी शिकायत कर सकते हैं।</li>
</ul>

<h2>18. लागू क़ानून और भाषा</h2>
<ul>
  <li>ये शर्तें वियतनाम के क़ानून द्वारा शासित और उसी के अनुसार व्याख्यायित होंगी।</li>
  <li>वियतनामी संस्करण मूल है। अनुवाद केवल संदर्भ हेतु हैं; विसंगति की स्थिति में वियतनामी संस्करण मान्य होगा।</li>
</ul>

<h2>19. संशोधन और वैधता</h2>
<ul>
  <li>हम इन शर्तों में संशोधन कर सकते हैं और अद्यतन संस्करण तिथि सहित वेबसाइट पर प्रकाशित करेंगे।</li>
  <li>संशोधन प्रकाशन के बाद की गई बुकिंग पर लागू होंगे। पहले से पुष्ट बुकिंग पर पुष्टि के समय प्रभावी संस्करण लागू रहेगा।</li>
  <li>यदि कोई खंड अमान्य ठहराया जाता है, तो शेष खंड प्रभावी बने रहेंगे।</li>
</ul>
`.trim();

export const TERMS_HTML: Record<LangCode, string> = { vi, en, fr, ru, zh, hi };
