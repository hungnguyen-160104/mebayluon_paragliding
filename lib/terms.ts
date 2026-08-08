// lib/terms.ts
/**
 * Điều khoản & Điều kiện dịch vụ — hiện ở trang /terms và ở bước xác nhận
 * (bước 5) của luồng đặt bay, khách phải tích đồng ý mới đặt được.
 *
 * Văn bản KHÔNG viện dẫn điều luật cụ thể — đây là lựa chọn của chủ doanh
 * nghiệp: trích dẫn luật trong điều khoản không mang lại lợi thế nào cho đơn
 * vị vận hành thể thao mạo hiểm, trong khi việc tuân thủ pháp luật vẫn được
 * thực hiện đầy đủ ngoài văn bản này.
 *
 * ⚠️ NGUỒN: nội dung dưới đây chép từ văn bản CHÍNH THỨC của công ty
 * ("Điều khoản & Cam kết khi tham gia bay dù lượn", bản PDF do chủ doanh
 * nghiệp cung cấp). Bản tiếng Việt, tiếng Anh và tiếng Trung lấy nguyên văn
 * từ PDF; ba bản Pháp, Nga, Hindi là bản dịch từ bản tiếng Việt.
 *
 * Khi sửa nội dung, hãy sửa ở văn bản gốc trước rồi mới đồng bộ sang đây, để
 * bản khách tích đồng ý trên web luôn khớp với bản giấy.
 *
 * Nội dung mục 1 (kể cả các điểm miễn trừ trách nhiệm) giữ nguyên theo văn
 * bản gốc của công ty. Muốn đổi thì đổi ở bản giấy trước rồi đồng bộ sang đây.
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
<h1>ĐIỀU KHOẢN &amp; CAM KẾT KHI THAM GIA BAY DÙ LƯỢN</h1>
<p><i>Cập nhật lần cuối: ${TERMS_UPDATED_AT}</i></p>
<p><b>Dù lượn là môn thể thao mạo hiểm. Khách hàng vui lòng đọc kỹ toàn bộ nội dung dưới đây trước khi xác nhận đặt dịch vụ.</b></p>

<h2>1. Điều kiện tham gia bay dù lượn</h2>
<p><i>Mục này quy định các điều kiện và nguyên tắc áp dụng đối với khách hàng khi đăng ký và tham gia hoạt động bay dù lượn.</i></p>
<ul>
  <li>Dù lượn là môn thể thao ngoài trời mang tính trải nghiệm mạo hiểm (dù vậy, bay dù là một trong những trải nghiệm đáng có nhất trong cuộc đời). Nó chứa những yếu tố rủi ro tự nhiên của hoạt động bay tự do mà cho dù phi công có trang bị nhiều kiến thức &amp; kỹ năng cũng không thể loại trừ 100%. Chuyến bay của quý khách được thực hiện bởi phi công đã được đào tạo chuyên nghiệp và có chứng nhận chuyên môn.</li>
  <li>Khách tham gia bay dù lượn cần có tình trạng sức khỏe phù hợp để tham gia hoạt động thể thao ngoài trời, không mắc các bệnh lý có thể gây nguy hiểm cho bản thân hoặc người khác như: động kinh, bệnh tim mạch nghiêm trọng, cao huyết áp không kiểm soát, rối loạn thần kinh, thường xuyên chóng mặt/ngất, bị bệnh liên quan tới cột sống, xương khớp hoặc các bệnh lý phải sử dụng thuốc điều trị thường xuyên.</li>
  <li>Khách tham gia bay phải từ đủ 18 tuổi trở lên; trường hợp dưới 18 tuổi cần có sự đồng ý của cha mẹ hoặc người giám hộ hợp pháp.</li>
  <li>Khi đăng ký và tham gia hoạt động bay, khách bay dù được hiểu là đã đọc, hiểu và chấp thuận các nội dung miễn trừ trách nhiệm sau:
    <ol>
      <li>Nhận thức rõ dù lượn là hoạt động có rủi ro vốn có của thể thao trên không;</li>
      <li>Tự nguyện tham gia và chấp nhận các rủi ro phát sinh trong quá trình hoạt động;</li>
      <li>Miễn trừ trách nhiệm đối với phi công, huấn luyện viên và đơn vị tổ chức đối với các sự cố phát sinh trong phạm vi rủi ro tiềm ẩn của hoạt động bay;</li>
      <li>Cam kết không yêu cầu bồi thường hay khởi kiện nếu xảy ra tai nạn, sự cố làm thiệt hại về tài sản cũng như thiệt hại về sức khoẻ của bản thân;</li>
      <li>Tuân thủ đầy đủ hướng dẫn an toàn của phi công và nhân viên điều hành;</li>
      <li>Cam kết miễn trừ này có hiệu lực trong toàn bộ thời gian tham gia các hoạt động dù lượn do đơn vị tổ chức.</li>
    </ol>
  </li>
  <li>Khi bay, hành động chạy đà, đáp đất có thể trượt ngã làm bẩn trang phục, thậm chí trầy xước, vì vậy khách vui lòng không mặc trang phục đắt tiền, mang theo trang sức quý giá… Khách tự chuẩn bị quần áo dài tay dễ vận động, che chắn tốt và đi giày thể thao khi bay.</li>
  <li>Khách cam kết cung cấp mọi thông tin chính xác khi tham gia bay, bao gồm: thông tin họ tên, ngày sinh, số giấy tờ tuỳ thân, cân nặng và tình trạng sức khoẻ.</li>
</ul>

<h2>2. Thời lượng bay</h2>
<p>Khách bay hiểu rằng dù lượn không gắn động cơ bay phụ thuộc 100% vào gió, thời lượng bay trên trời dự kiến khoảng trên dưới 10 phút mỗi chuyến bay (trừ khi khách bay bằng dù lượn gắn động cơ thì có thể chủ động thời lượng bay lâu tuỳ ý từ 10–25 phút). Do vậy khách tham gia bay dù chấp nhận rằng:</p>
<ul>
  <li>Thời lượng chuyến bay có thể ngắn hơn dự kiến trong điều kiện gió kém.</li>
  <li>Trong điều kiện thời tiết tốt, có thể kéo dài thời lượng chuyến bay miễn phí.</li>
  <li>Bay quá 15 phút rất dễ gây chóng mặt do thay đổi áp suất và độ cao, hãy cân nhắc.</li>
</ul>

<h2>3. Quy tắc sử dụng hình ảnh</h2>
<p><i>Mục này giải thích cách hình ảnh và video được ghi lại trong quá trình bay có thể được sử dụng.</i></p>
<ul>
  <li>Hình ảnh và video ghi lại trong quá trình bay (bao gồm thiết bị GoPro hoặc các thiết bị ghi hình khác) được cung cấp cho khách hàng và có thể được sử dụng cho mục đích truyền thông, quảng bá của đơn vị tổ chức.</li>
  <li>Trong trường hợp không đồng ý cho sử dụng hình ảnh, vui lòng thông báo cho chúng tôi trước hoặc sau khi thực hiện chuyến bay.</li>
</ul>

<h2>4. Quy tắc đổi lịch và huỷ bay</h2>
<p><i>Mục này quy định các điều kiện và nguyên tắc áp dụng thay đổi lịch trình đối với khách hàng khi đăng ký và tham gia hoạt động bay dù lượn.</i></p>
<p>Bay dù lượn là hoạt động phụ thuộc 100% vào điều kiện thời tiết, đặc biệt là yếu tố gió và các điều kiện khách quan khác. Vì vậy, khi tham gia bay, khách hiểu và đồng ý rằng:</p>
<ul>
  <li>Lịch bay có thể bị thay đổi, dời giờ hoặc huỷ do thời tiết xấu, gió không đảm bảo an toàn hoặc các yếu tố bất khả kháng khác. Trong những trường hợp này, khách được quyền đổi lịch hoặc huỷ bay hoàn toàn miễn phí. Khách cũng được đổi lịch hoặc huỷ bay miễn phí trong các trường hợp bất khả kháng hợp lý khác.</li>
  <li>Có những ngày thời tiết xấu làm chậm lịch bay, dẫn đến tình trạng dồn khách. Khi đó, chuyến bay của khách có thể bị dời lịch mà không thể báo trước. Khách đồng ý với sự sắp xếp lại lịch bay nhằm đảm bảo an toàn bay là ưu tiên cao nhất.</li>
  <li>Nếu khách huỷ bay vì lý do cá nhân trong khi đã sử dụng một phần dịch vụ (ví dụ: đã kích hoạt bảo hiểm, đã sử dụng dịch vụ xe trung chuyển, đã sử dụng đồ uống hoặc các dịch vụ khác), khách đồng ý thanh toán đầy đủ các chi phí đã phát sinh.</li>
  <li>Nếu khách huỷ hoặc đổi lịch vì lý do cá nhân làm ảnh hưởng đến hoạt động bay, gây gián đoạn vận hành, hoặc khi đội ngũ phi công và nhân sự đã sẵn sàng nhưng khách đột ngột đổi kế hoạch, khách phải chịu chi phí phát sinh tương ứng và chỉ được hoàn lại phần tiền còn lại sau khi trừ các chi phí hợp lý.</li>
  <li>Lịch bay được sắp xếp theo nguyên tắc <b>“đặt trước, phục vụ trước”</b>, do vậy đối với một số điểm bay (ví dụ: điểm bay Đèo Khau Phạ) vào ngày cao điểm có quá nhiều lượt đặt bay tại chỗ, lịch bay sẽ được sắp xếp theo thời điểm khách đặt dịch vụ. Vui lòng cân nhắc đặt lịch “càng sớm càng tốt” để đảm bảo quyền ưu tiên bay vào các đợt cao điểm.</li>
</ul>

<h2>5. Quy tắc mang theo thú cưng &amp; vật dụng khi bay</h2>
<h3>Mang theo thú cưng</h3>
<p>Khách được phép mang theo thú cưng khi bay, tuy nhiên:</p>
<ul>
  <li>Khách tự chịu trách nhiệm hoàn toàn về sự an toàn của thú cưng.</li>
  <li>Thú cưng phải có đai/chỗ cố định phù hợp và đảm bảo kiểm soát được.</li>
  <li>Đơn vị tổ chức và phi công không chịu trách nhiệm về bất kỳ rủi ro nào liên quan đến thú cưng.</li>
  <li>Khách hiểu rằng phi công có quyền từ chối bay cùng thú cưng nếu xét thấy có yếu tố ảnh hưởng đến an toàn, bao gồm nhưng không giới hạn: kích thước quá lớn, trọng lượng quá nặng, hành vi khó kiểm soát hoặc bất kỳ rủi ro tiềm ẩn nào khác.</li>
</ul>
<h3>Mang theo vật dụng cá nhân</h3>
<p>Khách có thể mang theo các vật dụng cá nhân như điện thoại, kính râm, trang sức và các vật dụng nhỏ khác. Tuy nhiên:</p>
<ul>
  <li>Khách tự chịu trách nhiệm bảo quản tài sản cá nhân của mình.</li>
  <li>Đơn vị tổ chức không chịu trách nhiệm đối với việc mất mát, rơi rớt hoặc hư hỏng.</li>
  <li>Các vật dụng quá khổ hoặc quá nặng (trên 3kg hoặc gây cản trở an toàn bay) có thể bị từ chối mang theo.</li>
</ul>
<h3>Đồ ăn, thức uống và tình trạng sức khoẻ</h3>
<p>Khách được phép mang theo và sử dụng đồ ăn, thức uống trong chuyến bay. Khách hiểu rằng:</p>
<ul>
  <li>Việc sử dụng bia, rượu hoặc đồ uống có cồn là trách nhiệm cá nhân của khách.</li>
  <li>Nếu khách trong tình trạng say xỉn, mất kiểm soát hành vi, hoặc có hành vi không phù hợp, khách có thể bị từ chối bay vì lý do an toàn và không được hoàn tiền trong trường hợp đó.</li>
</ul>

<h2>6. Dịch vụ đi kèm (flycam, camera 360, ghi hình)</h2>
<p><i>Mục này quy định các dịch vụ về quay chụp, ghi hình.</i></p>
<ul>
  <li>Khách có thể đăng ký thêm các dịch vụ đi kèm như quay flycam, camera 360 hoặc các hình thức ghi hình khác trong chuyến bay.</li>
  <li>Khách hiểu rằng hoạt động bay dù lượn diễn ra trong môi trường gió, rung lắc và điều kiện tự nhiên phức tạp, vì vậy:
    <ul>
      <li>Các thiết bị ghi hình có thể gặp sự cố kỹ thuật, lỗi pin, mất tín hiệu, rung lắc ngoài kiểm soát hoặc các lỗi phát sinh khác trong quá trình bay.</li>
      <li>Trong một số trường hợp, sự cố chỉ được phát hiện sau khi kết thúc chuyến bay và không thể khắc phục kịp thời.</li>
    </ul>
  </li>
  <li>Nếu dịch vụ ghi hình không thể thực hiện hoặc không đảm bảo chất lượng do lỗi kỹ thuật ngoài ý muốn, khách đồng ý rằng:
    <ul>
      <li>Chi phí của dịch vụ ghi hình sẽ được hoàn lại 100%.</li>
      <li>Chi phí chuyến bay dù lượn sẽ không được hoàn lại, vì hoạt động bay vẫn đã được thực hiện đầy đủ và đảm bảo an toàn.</li>
    </ul>
  </li>
  <li>Khách hiểu và đồng ý rằng yếu tố an toàn bay luôn được ưu tiên cao nhất, và trong mọi trường hợp, việc xử lý kỹ thuật không được làm ảnh hưởng đến an toàn của chuyến bay.</li>
  <li>Các file từ GoPro hoặc flycam thường sẽ sẵn có ngay sau chuyến bay và được tải trực tiếp về điện thoại của khách. Nhưng file từ camera 360 cần nhiều thời gian để chỉnh sửa &amp; xuất file, do đó sẽ được gửi trong vòng 24h (qua Zalo, Drive hoặc WhatsApp).</li>
  <li>Dịch vụ quay chụp bằng GoPro do phi công hỗ trợ là hoàn toàn miễn phí. Khách bay có thể được nhờ cầm thiết bị trong một khoảng thời gian (ví dụ lúc cất cánh hoặc hạ cánh, hoặc trong khi bay). Khách hàng <b>không phải đền bù</b> nếu chẳng may làm hỏng/rơi thiết bị, và đồng thời <b>không được bồi thường</b> nếu xảy ra sự cố mất dữ liệu hình ảnh/video do thiết bị hỏng/rơi mất do va đập trong quá trình bay.</li>
</ul>

<h2>7. Quy định chung khác</h2>
<p><i>Các quy định bổ sung nhằm bảo đảm an toàn bay và vận hành, áp dụng cùng với các mục trên.</i></p>
<ul>
  <li><b>Cân nặng và thể trạng.</b> Khách bay cần có cân nặng dưới 120 kg. Trường hợp trên 90 kg hoặc dưới 30 kg vui lòng thông báo trước để chúng tôi bố trí phi công và trang thiết bị phù hợp. Nếu cân nặng hoặc thể trạng thực tế khác đáng kể so với thông tin đã khai, phi công có quyền từ chối bay vì lý do an toàn và chuyến bay được coi là huỷ vì lý do cá nhân của khách.</li>
  <li><b>Có mặt đúng giờ.</b> Khách vui lòng có mặt trước giờ bay ít nhất 15 phút để làm thủ tục và nghe hướng dẫn an toàn. Khách đến muộn quá 30 phút so với giờ hẹn mà không báo trước, hoặc không có mặt, được coi là huỷ bay vì lý do cá nhân và áp dụng quy định tại mục 4.</li>
  <li><b>Khai báo trung thực.</b> Việc khai báo sai hoặc che giấu tình trạng sức khoẻ, cân nặng, độ tuổi là vi phạm điều khoản này. Đơn vị tổ chức không chịu trách nhiệm đối với hậu quả phát sinh từ thông tin sai lệch do khách cung cấp, và khách không được hoàn tiền trong trường hợp bị từ chối bay vì lý do đó.</li>
  <li><b>Quyền quyết định của phi công.</b> Quyết định cuối cùng về việc có bay hay không, thời điểm bay, đường bay và điểm hạ cánh thuộc về phi công tại hiện trường. Phi công có quyền dừng hoặc rút ngắn chuyến bay bất cứ lúc nào nếu nhận thấy yếu tố mất an toàn, và khách không được yêu cầu hoàn tiền vì lý do này.</li>
  <li><b>Bảo hiểm.</b> Mỗi chuyến bay đã bao gồm gói bảo hiểm tai nạn theo hợp đồng bảo hiểm mà đơn vị tổ chức đang tham gia. Phạm vi và mức chi trả thực hiện theo quy tắc của công ty bảo hiểm. Khách có nhu cầu mức bảo hiểm cao hơn vui lòng tự thu xếp bảo hiểm bổ sung trước ngày bay.</li>
  <li><b>Người dưới 18 tuổi.</b> Khách dưới 18 tuổi phải có cha mẹ hoặc người giám hộ hợp pháp có mặt tại điểm bay và xác nhận đồng ý với toàn bộ điều khoản này trước khi bay.</li>
  <li><b>Giá và thanh toán.</b> Giá áp dụng theo bảng giá tại thời điểm khách đặt dịch vụ. Ngày cuối tuần và ngày lễ áp dụng mức giá riêng đã hiển thị khi đặt. Thanh toán được thực hiện tại điểm bay trước giờ cất cánh, trừ trường hợp có thoả thuận khác bằng văn bản.</li>
  <li><b>Dữ liệu cá nhân.</b> Thông tin khách cung cấp được sử dụng để tổ chức chuyến bay, mua bảo hiểm, xuất vé và liên hệ hỗ trợ. Chúng tôi không chia sẻ dữ liệu cho bên thứ ba ngoài các mục đích nêu trên.</li>
  <li><b>Hiệu lực và sửa đổi.</b> Điều khoản này có hiệu lực kể từ thời điểm khách xác nhận đặt dịch vụ. Đơn vị tổ chức có thể cập nhật điều khoản; bản áp dụng cho mỗi booking là bản đang hiển thị tại thời điểm khách xác nhận.</li>
  <li><b>Giải quyết vướng mắc.</b> Mọi vướng mắc phát sinh được hai bên giải quyết trước hết bằng thương lượng thiện chí. Nếu không đạt kết quả, vụ việc được đưa ra cơ quan tài phán có thẩm quyền nơi đơn vị tổ chức đặt trụ sở.</li>
</ul>

<h2>8. Thông tin đơn vị tổ chức</h2>
${entityBlock("vi")}
`;

const en = `
<h1>TERMS &amp; CONDITIONS FOR PARAGLIDING PARTICIPATION</h1>
<p><i>Last updated: ${TERMS_UPDATED_AT}</i></p>
<p><b>Paragliding is an adventure sport. Please read everything below carefully before confirming your booking.</b></p>

<h2>1. Conditions for paragliding participation</h2>
<p><i>This section specifies the conditions and principles applied to Passengers when registering and participating in paragliding activities.</i></p>
<ul>
  <li>Paragliding is an outdoor sports activity with an adventurous experience nature (however, paragliding is one of the most worthwhile experiences in life). It contains natural risk factors of free flying activities that even if the pilot is equipped with extensive knowledge &amp; skills, cannot be 100% eliminated. Your flight will be conducted by a professionally trained pilot with professional certification.</li>
  <li>Passengers participating in paragliding need to have a suitable health condition to participate in outdoor sports activities, and not suffer from medical conditions that could cause danger to themselves or others such as: epilepsy, severe cardiovascular disease, uncontrolled high blood pressure, neurological disorders, frequent dizziness/fainting, spinal or joint-related diseases, or medical conditions requiring regular medication.</li>
  <li>Participants must be 18 years of age or older; in cases under 18 years old, the consent of parents or legal guardians is required.</li>
  <li>When registering and participating in the flight activity, the paragliding Passenger is understood to have read, understood, and agreed to the following liability waiver contents:
    <ol>
      <li>Clearly recognize that paragliding is an activity with inherent risks of aerial sports;</li>
      <li>Voluntarily participate and accept the risks arising during the activity;</li>
      <li>Exempt the pilot, instructor, and organizing unit from liability for incidents arising within the scope of potential risks of the flight activity;</li>
      <li>Commit not to claim compensation or file a lawsuit if an accident or incident occurs causing damage to property as well as personal health;</li>
      <li>Fully comply with the safety instructions of the pilot and operating staff;</li>
      <li>This liability waiver commitment is effective for the entire duration of participating in paragliding activities held by the organizing unit.</li>
    </ol>
  </li>
  <li>The action of taking off and landing may cause slipping and falling, dirtying clothes, or even scratching, so Passengers are requested not to wear expensive clothing, precious jewelry, or white clothing. Passengers should prepare their own long-sleeved clothes that are easy to move in, provide good coverage, and wear sports shoes when flying.</li>
  <li>Passengers commit to providing all accurate information when participating in the flight, including: full name, date of birth, ID/passport number, weight, and health condition.</li>
</ul>

<h2>2. Flight duration</h2>
<p>The flying Passenger understands that non-motorized paragliding depends 100% on the wind; the expected flight duration in the sky is around 10 minutes per flight (unless the Passenger flies with a motorized paraglider, in which case they can proactively choose a duration from 10–25 minutes). Therefore, Passengers accept that:</p>
<ul>
  <li>The flight duration may be shorter than expected in poor wind conditions.</li>
  <li>In good weather conditions, the flight duration may be extended free of charge.</li>
  <li>Flying for more than 15 minutes can easily cause dizziness due to changes in pressure and altitude; please consider this carefully.</li>
</ul>

<h2>3. Rules on image usage</h2>
<p><i>This section explains how images and videos recorded during the flight may be used.</i></p>
<ul>
  <li>Images and videos recorded during the flight (including GoPro devices or other recording devices) are provided to the Passenger and may be used for the organizing unit's communication and promotional purposes.</li>
  <li>In case you do not agree to the use of images, please notify us before or after the flight.</li>
</ul>

<h2>4. Rules on rescheduling and cancellation</h2>
<p><i>This section specifies the conditions and principles applicable to schedule changes for Passengers when registering and participating in paragliding activities.</i></p>
<p>Paragliding depends 100% on weather conditions, especially wind factors and other objective conditions. Therefore, when participating in the flight, the Passenger understands and agrees that:</p>
<ul>
  <li>The flight schedule may be changed, rescheduled, or canceled due to bad weather, unsafe wind conditions, or other force majeure factors. In these cases, Passengers have the right to reschedule or cancel the flight completely free of charge. Passengers are also allowed to reschedule or cancel the flight free of charge in other reasonable force majeure cases.</li>
  <li>There are days when bad weather delays the flight schedule, leading to a backlog of Passengers. In that case, the Passenger's flight may be rescheduled without prior notice. The Passenger agrees to the rescheduling to ensure flight safety as the highest priority.</li>
  <li>If the Passenger cancels the flight for personal reasons while having already used a part of the services (e.g., insurance has been activated, shuttle service has been used, drinks or other services have been consumed), the Passenger agrees to fully pay for the incurred costs.</li>
  <li>If the Passenger cancels or reschedules for personal reasons affecting the flight operation, causing operational disruption, or when the pilot and staff team are ready but the Passenger suddenly changes the plan, the Passenger must bear the corresponding incurred costs and will only be refunded the remaining amount after deducting reasonable expenses.</li>
  <li>The flight schedule is arranged on a <b>“first come, first served”</b> basis; therefore for some flight sites (e.g., Khau Pha Pass) on peak days with too many on-site bookings, the schedule will be arranged according to the time the Passenger booked the service. Please consider booking “as soon as possible” to ensure priority flying during peak periods.</li>
</ul>

<h2>5. Rules on bringing pets &amp; belongings when flying</h2>
<h3>Bringing pets</h3>
<p>Passengers are allowed to bring pets when flying, however:</p>
<ul>
  <li>The Passenger is fully responsible for the safety of the pet.</li>
  <li>The pet must have a suitable secure harness and be kept under control.</li>
  <li>The organizing unit and the pilot are not responsible for any risks related to the pet.</li>
  <li>The Passenger understands that the pilot has the right to refuse to fly with the pet if it is deemed to affect safety, including but not limited to: oversized dimensions, excessive weight, uncontrollable behavior, or any other potential risks.</li>
</ul>
<h3>Bringing personal belongings</h3>
<p>Passengers may bring personal belongings such as phones, sunglasses, jewelry, and other small items. However:</p>
<ul>
  <li>The Passenger is solely responsible for preserving their personal property.</li>
  <li>The organizing unit is not liable for loss, dropping, or damage.</li>
  <li>Oversized or overweight items (over 3kg or obstructing flight safety) may be refused.</li>
</ul>
<h3>Food, drinks, and health condition</h3>
<p>Passengers are allowed to bring and consume food and drinks during the flight. The Passenger understands that:</p>
<ul>
  <li>The consumption of beer, wine, or alcoholic beverages is the Passenger's personal responsibility.</li>
  <li>If the Passenger is intoxicated, loses behavioral control, or displays inappropriate behavior, the Passenger may be refused to fly for safety reasons and will not be refunded in that case.</li>
</ul>

<h2>6. Accompanying services (drone, 360 camera, recording)</h2>
<p><i>This section specifies the photography and recording services.</i></p>
<ul>
  <li>Passengers can register for additional accompanying services such as drone recording, 360 camera, or other forms of recording during the flight.</li>
  <li>The Passenger understands that paragliding takes place in environments with wind, shaking, and complex natural conditions, therefore:
    <ul>
      <li>Recording devices may encounter technical issues, battery errors, signal loss, uncontrollable shaking, or other errors arising during the flight.</li>
      <li>In some cases, the incident is only detected after the flight ends and cannot be fixed in time.</li>
    </ul>
  </li>
  <li>If the recording service cannot be performed or does not ensure quality due to unintended technical errors, the Passenger agrees that:
    <ul>
      <li>The cost of the recording service will be 100% refunded.</li>
      <li>The cost of the paragliding flight will not be refunded, as the flight activity was still fully carried out and ensured safety.</li>
    </ul>
  </li>
  <li>The Passenger understands and agrees that flight safety is always the highest priority, and in all cases, technical troubleshooting must not affect the safety of the flight.</li>
  <li>Files from GoPro or drones are usually available immediately after the flight and downloaded directly to the Passenger's phone. Files from the 360 camera need more time for editing and exporting, therefore they will be sent within 24 hours (via Zalo, Drive, or WhatsApp).</li>
  <li>The pilot-assisted GoPro filming service is provided entirely free of charge. Passengers may be asked to hold the device temporarily (e.g., during takeoff, landing, or mid-flight). Customers <b>will not be required to pay compensation</b> for any accidental damage or loss of the equipment, and consequently <b>no compensation will be provided</b> in the event of lost photo/video data resulting from equipment damage, loss, or impact during the flight.</li>
</ul>

<h2>7. Other general provisions</h2>
<p><i>Additional provisions ensuring flight safety and operations, applied together with the sections above.</i></p>
<ul>
  <li><b>Weight and physical condition.</b> Passengers must weigh under 120 kg. For passengers over 90 kg or under 30 kg, please inform us in advance so we can assign a suitable pilot and equipment. If actual weight or physical condition differs significantly from the information declared, the pilot may refuse the flight for safety reasons and the flight is treated as cancelled for the Passenger's personal reasons.</li>
  <li><b>Punctuality.</b> Please arrive at least 15 minutes before the flight for check-in and the safety briefing. Arriving more than 30 minutes late without notice, or not arriving at all, is treated as cancellation for personal reasons and section 4 applies.</li>
  <li><b>Truthful declaration.</b> Misdeclaring or concealing health condition, weight or age is a breach of these terms. The organizing unit is not responsible for consequences arising from inaccurate information provided by the Passenger, and no refund is given if the flight is refused for that reason.</li>
  <li><b>Pilot's authority.</b> The final decision on whether to fly, when to fly, the flight path and the landing area rests with the pilot on site. The pilot may abort or shorten the flight at any time if safety is at risk, and no refund may be claimed on this ground.</li>
  <li><b>Insurance.</b> Each flight includes accident insurance under the policy held by the organizing unit. Scope and payout follow the insurer's rules. Passengers wanting higher coverage should arrange supplementary insurance before the flight date.</li>
  <li><b>Passengers under 18.</b> Passengers under 18 must be accompanied at the site by a parent or legal guardian who confirms acceptance of these terms before the flight.</li>
  <li><b>Prices and payment.</b> Prices apply as shown at the time of booking. Weekends and public holidays carry their own rates, displayed during booking. Payment is made at the flight site before take-off unless otherwise agreed in writing.</li>
  <li><b>Personal data.</b> Information provided is used to organize the flight, arrange insurance, issue the ticket and provide support. We do not share data with third parties beyond these purposes.</li>
  <li><b>Effect and amendment.</b> These terms take effect when the Passenger confirms the booking. The organizing unit may update them; the version applicable to each booking is the one displayed at the moment of confirmation.</li>
  <li><b>Resolving issues.</b> Any issue arising is first resolved through good-faith negotiation between the parties. Failing that, the matter is referred to the competent authority where the organizing unit has its registered office.</li>
</ul>

<h2>8. Organizing unit</h2>
${entityBlock("en")}
`;

const fr = `
<h1>CONDITIONS &amp; ENGAGEMENTS POUR LA PARTICIPATION AU PARAPENTE</h1>
<p><i>Dernière mise à jour : ${TERMS_UPDATED_AT}</i></p>
<p><b>Le parapente est un sport à sensations. Merci de lire attentivement l'ensemble du texte ci-dessous avant de confirmer votre réservation.</b></p>

<h2>1. Conditions de participation</h2>
<p><i>Cette section précise les conditions et principes applicables aux clients lors de l'inscription et de la participation aux vols en parapente.</i></p>
<ul>
  <li>Le parapente est un sport de plein air à caractère aventureux (cela dit, c'est l'une des expériences les plus marquantes d'une vie). Il comporte des risques naturels propres au vol libre que même un pilote très expérimenté ne peut éliminer à 100 %. Votre vol est assuré par un pilote formé professionnellement et certifié.</li>
  <li>Le passager doit être en bonne condition physique pour une activité sportive de plein air et ne pas souffrir de pathologies pouvant le mettre en danger, lui ou autrui : épilepsie, maladie cardiovasculaire grave, hypertension non contrôlée, troubles neurologiques, vertiges ou malaises fréquents, affections de la colonne vertébrale ou des articulations, ou toute pathologie nécessitant un traitement médicamenteux régulier.</li>
  <li>Le passager doit avoir 18 ans révolus ; en dessous de 18 ans, l'accord des parents ou du tuteur légal est requis.</li>
  <li>En s'inscrivant et en participant au vol, le passager est réputé avoir lu, compris et accepté les clauses de décharge suivantes :
    <ol>
      <li>Reconnaître clairement que le parapente comporte des risques inhérents aux sports aériens ;</li>
      <li>Participer volontairement et accepter les risques survenant pendant l'activité ;</li>
      <li>Dégager le pilote, le moniteur et l'organisateur de toute responsabilité pour les incidents relevant des risques potentiels du vol ;</li>
      <li>S'engager à ne pas réclamer d'indemnisation ni intenter d'action en justice en cas d'accident ou d'incident causant des dommages matériels ou corporels ;</li>
      <li>Respecter intégralement les consignes de sécurité du pilote et du personnel d'exploitation ;</li>
      <li>Cette décharge est valable pendant toute la durée de participation aux activités de parapente organisées par l'organisateur.</li>
    </ol>
  </li>
  <li>La course d'élan et l'atterrissage peuvent entraîner des chutes, salir les vêtements voire causer des éraflures : merci de ne pas porter de vêtements coûteux ni de bijoux de valeur. Prévoyez des vêtements longs, couvrants et confortables, ainsi que des chaussures de sport.</li>
  <li>Le passager s'engage à fournir des informations exactes : nom complet, date de naissance, numéro de pièce d'identité, poids et état de santé.</li>
</ul>

<h2>2. Durée du vol</h2>
<p>Le passager comprend que le parapente sans moteur dépend à 100 % du vent ; la durée en l'air est d'environ 10 minutes par vol (sauf en paramoteur, où la durée peut être choisie entre 10 et 25 minutes). Le passager accepte donc que :</p>
<ul>
  <li>La durée du vol puisse être plus courte que prévu si le vent est faible.</li>
  <li>Par bonnes conditions, la durée puisse être prolongée gratuitement.</li>
  <li>Au-delà de 15 minutes, les variations de pression et d'altitude provoquent facilement des vertiges ; à considérer.</li>
</ul>

<h2>3. Utilisation des images</h2>
<p><i>Cette section explique comment les images et vidéos prises pendant le vol peuvent être utilisées.</i></p>
<ul>
  <li>Les images et vidéos enregistrées pendant le vol (GoPro ou autres appareils) sont remises au client et peuvent être utilisées à des fins de communication et de promotion par l'organisateur.</li>
  <li>Si vous ne souhaitez pas que vos images soient utilisées, merci de nous en informer avant ou après le vol.</li>
</ul>

<h2>4. Report et annulation</h2>
<p><i>Cette section précise les conditions applicables aux changements d'horaire.</i></p>
<p>Le parapente dépend à 100 % des conditions météorologiques, en particulier du vent. En participant, le passager comprend et accepte que :</p>
<ul>
  <li>Le vol puisse être modifié, décalé ou annulé pour mauvais temps, vent non sécuritaire ou tout autre cas de force majeure. Dans ces cas, le report ou l'annulation est entièrement gratuit. Il en va de même pour tout autre cas de force majeure raisonnable.</li>
  <li>Certains jours, le mauvais temps retarde les vols et crée une file d'attente. Le vol peut alors être reprogrammé sans préavis. Le passager accepte cette réorganisation, la sécurité restant la priorité absolue.</li>
  <li>Si le passager annule pour convenance personnelle après avoir déjà utilisé une partie des services (assurance activée, navette utilisée, boissons ou autres prestations consommées), il s'engage à régler intégralement les frais engagés.</li>
  <li>Si l'annulation ou le report pour convenance personnelle perturbe l'exploitation, ou intervient alors que l'équipe est déjà prête, le passager supporte les frais correspondants et n'est remboursé que du solde après déduction des dépenses raisonnables.</li>
  <li>Les vols sont organisés selon le principe <b>« premier réservé, premier servi »</b> ; sur certains sites (par exemple le col de Khau Pha), en période de forte affluence, l'ordre suit l'heure de réservation. Réservez « le plus tôt possible » pour être prioritaire.</li>
</ul>

<h2>5. Animaux et effets personnels</h2>
<h3>Animaux de compagnie</h3>
<p>Le passager peut emmener son animal, toutefois :</p>
<ul>
  <li>Il est entièrement responsable de la sécurité de l'animal.</li>
  <li>L'animal doit disposer d'un harnais adapté et rester sous contrôle.</li>
  <li>L'organisateur et le pilote déclinent toute responsabilité concernant l'animal.</li>
  <li>Le pilote peut refuser de voler avec l'animal si la sécurité lui semble compromise : taille excessive, poids trop important, comportement incontrôlable ou tout autre risque.</li>
</ul>
<h3>Effets personnels</h3>
<p>Le passager peut emporter téléphone, lunettes de soleil, bijoux et autres petits objets. Toutefois :</p>
<ul>
  <li>Il est seul responsable de la conservation de ses biens.</li>
  <li>L'organisateur n'est pas responsable des pertes, chutes ou dommages.</li>
  <li>Les objets encombrants ou lourds (plus de 3 kg ou gênant la sécurité) peuvent être refusés.</li>
</ul>
<h3>Nourriture, boissons et état de santé</h3>
<p>Le passager peut emporter et consommer nourriture et boissons pendant le vol. Il comprend que :</p>
<ul>
  <li>La consommation de bière, de vin ou d'alcool relève de sa responsabilité personnelle.</li>
  <li>En cas d'ivresse, de perte de contrôle ou de comportement inapproprié, le vol peut être refusé pour raisons de sécurité, sans remboursement.</li>
</ul>

<h2>6. Services complémentaires (drone, caméra 360, prise de vue)</h2>
<p><i>Cette section précise les prestations de prise de vue et d'enregistrement.</i></p>
<ul>
  <li>Le passager peut souscrire des prestations complémentaires : prise de vue par drone, caméra 360 ou autres formes d'enregistrement.</li>
  <li>Le vol se déroule dans un environnement venteux, avec des secousses et des conditions naturelles complexes ; par conséquent :
    <ul>
      <li>Les appareils peuvent connaître des pannes techniques, des problèmes de batterie, une perte de signal, des secousses incontrôlables ou d'autres défaillances.</li>
      <li>Dans certains cas, l'incident n'est constaté qu'après le vol et ne peut être corrigé à temps.</li>
    </ul>
  </li>
  <li>Si la prestation de prise de vue ne peut être réalisée ou n'est pas de qualité suffisante à cause d'une défaillance technique involontaire, le passager accepte que :
    <ul>
      <li>Le coût de la prestation de prise de vue soit remboursé à 100 %.</li>
      <li>Le coût du vol ne soit pas remboursé, le vol ayant été effectué intégralement et en sécurité.</li>
    </ul>
  </li>
  <li>La sécurité du vol reste la priorité absolue : en aucun cas une intervention technique ne doit la compromettre.</li>
  <li>Les fichiers GoPro ou drone sont généralement disponibles juste après le vol et transférés directement sur le téléphone du passager. Les fichiers de la caméra 360 demandent du temps de montage et d'export : ils sont envoyés sous 24 h (via Zalo, Drive ou WhatsApp).</li>
  <li>La prise de vue GoPro assurée par le pilote est entièrement gratuite. Il peut être demandé au passager de tenir l'appareil un moment (au décollage, à l'atterrissage ou en vol). Le client <b>n'a aucune indemnité à verser</b> en cas de casse ou de perte accidentelle, et <b>ne perçoit aucune indemnisation</b> en cas de perte des photos/vidéos due à un appareil endommagé ou perdu lors du vol.</li>
</ul>

<h2>7. Autres dispositions générales</h2>
<p><i>Dispositions complémentaires garantissant la sécurité et l'exploitation, applicables avec les sections ci-dessus.</i></p>
<ul>
  <li><b>Poids et condition physique.</b> Le passager doit peser moins de 120 kg. Au-delà de 90 kg ou en dessous de 30 kg, merci de nous prévenir afin d'affecter un pilote et un matériel adaptés. Si le poids ou la condition réelle diffère nettement des informations déclarées, le pilote peut refuser le vol pour raisons de sécurité ; le vol est alors traité comme une annulation pour convenance personnelle.</li>
  <li><b>Ponctualité.</b> Merci d'arriver au moins 15 minutes avant le vol pour l'enregistrement et le briefing. Un retard de plus de 30 minutes sans prévenir, ou une absence, équivaut à une annulation pour convenance personnelle ; la section 4 s'applique.</li>
  <li><b>Déclaration sincère.</b> Déclarer faussement ou dissimuler son état de santé, son poids ou son âge constitue une violation des présentes conditions. L'organisateur n'est pas responsable des conséquences d'informations inexactes fournies par le passager, et aucun remboursement n'est accordé si le vol est refusé pour ce motif.</li>
  <li><b>Autorité du pilote.</b> La décision finale de voler ou non, l'horaire, la trajectoire et la zone d'atterrissage relèvent du pilote sur place. Le pilote peut interrompre ou écourter le vol à tout moment en cas de risque, sans que cela ouvre droit à remboursement.</li>
  <li><b>Assurance.</b> Chaque vol inclut une assurance accident selon le contrat souscrit par l'organisateur. L'étendue et les montants suivent les règles de l'assureur. Pour une couverture supérieure, souscrivez une assurance complémentaire avant la date du vol.</li>
  <li><b>Passagers de moins de 18 ans.</b> Ils doivent être accompagnés sur site par un parent ou tuteur légal qui confirme l'acceptation des présentes conditions avant le vol.</li>
  <li><b>Prix et paiement.</b> Les prix sont ceux affichés au moment de la réservation. Les week-ends et jours fériés appliquent leurs propres tarifs, indiqués lors de la réservation. Le paiement s'effectue sur site avant le décollage, sauf accord écrit contraire.</li>
  <li><b>Données personnelles.</b> Les informations fournies servent à organiser le vol, souscrire l'assurance, émettre le billet et assurer le suivi. Nous ne partageons pas ces données avec des tiers en dehors de ces finalités.</li>
  <li><b>Effet et modification.</b> Les présentes conditions prennent effet à la confirmation de la réservation. L'organisateur peut les mettre à jour ; la version applicable est celle affichée au moment de la confirmation.</li>
  <li><b>Règlement des différends.</b> Tout différend est d'abord réglé par une négociation de bonne foi entre les parties. À défaut, l'affaire est portée devant l'instance compétente du siège de l'organisateur.</li>
</ul>

<h2>8. Informations sur l'organisateur</h2>
${entityBlock("fr")}
`;

const ru = `
<h1>УСЛОВИЯ И ОБЯЗАТЕЛЬСТВА УЧАСТИЯ В ПОЛЁТЕ НА ПАРАПЛАНЕ</h1>
<p><i>Последнее обновление: ${TERMS_UPDATED_AT}</i></p>
<p><b>Парапланеризм — экстремальный вид спорта. Пожалуйста, внимательно прочитайте всё изложенное ниже перед подтверждением брони.</b></p>

<h2>1. Условия участия</h2>
<p><i>В этом разделе изложены условия и правила для гостей при бронировании и участии в полётах.</i></p>
<ul>
  <li>Парапланеризм — вид спорта на открытом воздухе с элементами приключения (при этом полёт на параплане — одно из самых ярких впечатлений в жизни). Ему присущи естественные риски свободного полёта, которые невозможно устранить на 100 %, даже при большом опыте пилота. Ваш полёт выполняет профессионально подготовленный пилот, имеющий соответствующий сертификат.</li>
  <li>Гость должен иметь состояние здоровья, подходящее для занятий спортом на открытом воздухе, и не страдать заболеваниями, опасными для себя или окружающих: эпилепсия, тяжёлые сердечно-сосудистые заболевания, неконтролируемая гипертония, неврологические расстройства, частые головокружения или обмороки, заболевания позвоночника и суставов, а также состояния, требующие постоянного приёма лекарств.</li>
  <li>Участнику должно быть не менее 18 лет; для лиц младше 18 лет требуется согласие родителей или законного опекуна.</li>
  <li>Бронируя и участвуя в полёте, гость считается прочитавшим, понявшим и принявшим следующие условия освобождения от ответственности:
    <ol>
      <li>Чётко осознавать, что парапланеризм связан с рисками, присущими воздушным видам спорта;</li>
      <li>Участвовать добровольно и принимать риски, возникающие в ходе активности;</li>
      <li>Освободить пилота, инструктора и организатора от ответственности за происшествия в пределах потенциальных рисков полёта;</li>
      <li>Обязаться не требовать компенсации и не подавать иск в случае происшествия, повлёкшего ущерб имуществу или здоровью;</li>
      <li>Полностью соблюдать указания пилота и персонала по безопасности;</li>
      <li>Данное обязательство действует в течение всего времени участия в мероприятиях организатора.</li>
    </ol>
  </li>
  <li>При разбеге и приземлении возможны падения, загрязнение одежды и даже ссадины, поэтому просим не надевать дорогую одежду и не брать ценные украшения. Подготовьте удобную закрытую одежду с длинным рукавом и спортивную обувь.</li>
  <li>Гость обязуется предоставить точные данные: полное имя, дату рождения, номер документа, вес и состояние здоровья.</li>
</ul>

<h2>2. Продолжительность полёта</h2>
<p>Гость понимает, что безмоторный параплан на 100 % зависит от ветра; ожидаемое время в воздухе — около 10 минут за полёт (кроме парамотора, где длительность выбирается в пределах 10–25 минут). Поэтому гость принимает, что:</p>
<ul>
  <li>При слабом ветре полёт может оказаться короче ожидаемого.</li>
  <li>При хорошей погоде время полёта может быть продлено бесплатно.</li>
  <li>Полёт дольше 15 минут легко вызывает головокружение из-за перепадов давления и высоты — учитывайте это.</li>
</ul>

<h2>3. Правила использования изображений</h2>
<p><i>Раздел объясняет, как могут использоваться фото и видео, снятые в полёте.</i></p>
<ul>
  <li>Фото и видео, снятые во время полёта (в том числе на GoPro и другие устройства), передаются гостю и могут использоваться организатором в информационных и рекламных целях.</li>
  <li>Если вы не согласны на использование изображений, сообщите нам до или после полёта.</li>
</ul>

<h2>4. Перенос и отмена полёта</h2>
<p><i>Раздел определяет условия изменения расписания.</i></p>
<p>Парапланеризм на 100 % зависит от погоды, прежде всего от ветра. Участвуя в полёте, гость понимает и соглашается, что:</p>
<ul>
  <li>Полёт может быть изменён, перенесён или отменён из-за плохой погоды, небезопасного ветра или иных обстоятельств непреодолимой силы. В этих случаях перенос или отмена полностью бесплатны. То же касается других разумных форс-мажорных обстоятельств.</li>
  <li>В отдельные дни непогода задерживает расписание и создаёт очередь. Полёт может быть перенесён без предварительного уведомления. Гость соглашается с таким переносом, поскольку безопасность имеет наивысший приоритет.</li>
  <li>Если гость отменяет полёт по личным причинам, уже воспользовавшись частью услуг (активирована страховка, использован трансфер, напитки или иные услуги), он обязуется полностью оплатить понесённые расходы.</li>
  <li>Если отмена или перенос по личным причинам нарушает работу площадки либо происходит, когда пилот и команда уже готовы, гость несёт соответствующие расходы, и возвращается лишь остаток после вычета разумных затрат.</li>
  <li>Расписание формируется по принципу <b>«кто раньше забронировал, тот летит первым»</b>. На отдельных площадках (например, перевал Кхау Фа) в пиковые дни очередь определяется временем бронирования. Бронируйте «как можно раньше», чтобы получить приоритет.</li>
</ul>

<h2>5. Домашние животные и личные вещи</h2>
<h3>Домашние животные</h3>
<p>Гость может взять питомца в полёт, однако:</p>
<ul>
  <li>Гость полностью отвечает за безопасность питомца.</li>
  <li>У питомца должна быть подходящая фиксирующая подвеска, он должен быть под контролем.</li>
  <li>Организатор и пилот не несут ответственности за любые риски, связанные с питомцем.</li>
  <li>Пилот вправе отказать в полёте с питомцем, если считает это небезопасным: слишком крупный размер, большой вес, неуправляемое поведение или иные потенциальные риски.</li>
</ul>
<h3>Личные вещи</h3>
<p>Гость может взять телефон, очки, украшения и другие небольшие предметы. Однако:</p>
<ul>
  <li>Гость сам отвечает за сохранность своего имущества.</li>
  <li>Организатор не несёт ответственности за утерю, падение или повреждение.</li>
  <li>Слишком крупные или тяжёлые предметы (свыше 3 кг либо мешающие безопасности) могут быть не допущены.</li>
</ul>
<h3>Еда, напитки и состояние здоровья</h3>
<p>Гостю разрешено брать и употреблять еду и напитки в полёте. Гость понимает, что:</p>
<ul>
  <li>Употребление пива, вина или алкоголя — его личная ответственность.</li>
  <li>При опьянении, потере контроля над поведением или неподобающем поведении в полёте может быть отказано по соображениям безопасности без возврата средств.</li>
</ul>

<h2>6. Дополнительные услуги (дрон, камера 360, съёмка)</h2>
<p><i>Раздел определяет услуги фото- и видеосъёмки.</i></p>
<ul>
  <li>Гость может заказать дополнительные услуги: съёмку с дрона, камеру 360 или иные виды записи.</li>
  <li>Полёт проходит в условиях ветра, тряски и сложной природной среды, поэтому:
    <ul>
      <li>Записывающие устройства могут дать технический сбой, отказ батареи, потерю сигнала, неконтролируемую тряску или иные ошибки.</li>
      <li>Иногда сбой обнаруживается только после полёта и не может быть устранён вовремя.</li>
    </ul>
  </li>
  <li>Если услуга съёмки не может быть выполнена или не обеспечивает качество из-за непреднамеренного технического сбоя, гость соглашается, что:
    <ul>
      <li>Стоимость услуги съёмки возвращается на 100 %.</li>
      <li>Стоимость самого полёта не возвращается, так как полёт был выполнен полностью и безопасно.</li>
    </ul>
  </li>
  <li>Безопасность полёта всегда в приоритете: техническое вмешательство ни при каких обстоятельствах не должно её снижать.</li>
  <li>Файлы с GoPro и дрона обычно доступны сразу после полёта и копируются прямо на телефон гостя. Файлы с камеры 360 требуют времени на монтаж и экспорт, поэтому отправляются в течение 24 часов (через Zalo, Drive или WhatsApp).</li>
  <li>Съёмка на GoPro, выполняемая пилотом, полностью бесплатна. Гостя могут попросить подержать устройство (на взлёте, посадке или в полёте). Клиент <b>не обязан возмещать</b> случайное повреждение или утерю оборудования и <b>не получает компенсации</b> за утрату фото- и видеоданных из-за повреждения или потери устройства во время полёта.</li>
</ul>

<h2>7. Прочие общие положения</h2>
<p><i>Дополнительные положения, обеспечивающие безопасность и работу площадки; применяются вместе с разделами выше.</i></p>
<ul>
  <li><b>Вес и физическое состояние.</b> Вес гостя должен быть менее 120 кг. При весе свыше 90 кг или менее 30 кг просим сообщить заранее, чтобы подобрать пилота и снаряжение. Если фактический вес или состояние существенно отличаются от заявленных, пилот вправе отказать в полёте по соображениям безопасности; полёт считается отменённым по личным причинам гостя.</li>
  <li><b>Пунктуальность.</b> Просим прибыть не позднее чем за 15 минут до полёта для регистрации и инструктажа. Опоздание более чем на 30 минут без предупреждения либо неявка приравниваются к отмене по личным причинам, применяется раздел 4.</li>
  <li><b>Достоверность сведений.</b> Сообщение недостоверных сведений или сокрытие состояния здоровья, веса, возраста является нарушением настоящих условий. Организатор не отвечает за последствия недостоверной информации, предоставленной гостем; при отказе в полёте по этой причине возврат средств не производится.</li>
  <li><b>Полномочия пилота.</b> Окончательное решение о полёте, его времени, маршруте и месте приземления принимает пилот на месте. Пилот вправе прервать или сократить полёт в любой момент при угрозе безопасности; возврат средств по этому основанию не производится.</li>
  <li><b>Страхование.</b> Каждый полёт включает страхование от несчастного случая по договору, заключённому организатором. Объём и размер выплат определяются правилами страховой компании. Для большего покрытия оформите дополнительную страховку до даты полёта.</li>
  <li><b>Гости младше 18 лет.</b> Должны находиться на площадке в сопровождении родителя или законного опекуна, который подтверждает согласие с настоящими условиями до полёта.</li>
  <li><b>Цены и оплата.</b> Применяются цены, действующие на момент бронирования. В выходные и праздничные дни действуют отдельные тарифы, показанные при бронировании. Оплата производится на площадке до взлёта, если письменно не согласовано иное.</li>
  <li><b>Персональные данные.</b> Предоставленные сведения используются для организации полёта, оформления страховки, выпуска билета и связи с гостем. Мы не передаём данные третьим лицам за пределами указанных целей.</li>
  <li><b>Действие и изменения.</b> Условия вступают в силу с момента подтверждения бронирования. Организатор вправе их обновлять; к каждому бронированию применяется редакция, отображённая в момент подтверждения.</li>
  <li><b>Урегулирование разногласий.</b> Любые разногласия сначала решаются добросовестными переговорами сторон. При недостижении согласия дело передаётся в компетентный орган по месту нахождения организатора.</li>
</ul>

<h2>8. Сведения об организаторе</h2>
${entityBlock("ru")}
`;

const zh = `
<h1>滑翔伞参与条款与承诺</h1>
<p><i>最后更新：${TERMS_UPDATED_AT}</i></p>
<p><b>滑翔伞是一项冒险运动。请在确认预订前仔细阅读以下全部内容。</b></p>

<h2>1. 参与滑翔伞飞行条件</h2>
<p><i>本节规定了客户注册和参与滑翔伞活动时适用的条件和原则。</i></p>
<ul>
  <li>滑翔伞是一项具有冒险体验性质的户外运动（尽管如此，滑翔伞飞行仍是人生中最值得拥有的体验之一）。它包含自由飞行活动固有的自然风险因素，即使飞行员具备丰富的知识和技能，也无法 100% 消除。您的飞行将由经过专业培训并获得专业认证的飞行员执行。</li>
  <li>参与滑翔伞飞行的客户需要具备适合参加户外体育活动的健康状况，未患有可能对自己或他人造成危险的疾病，例如：癫痫、严重心血管疾病、未控制的高血压、神经系统疾病、经常头晕/晕厥、脊柱或骨关节相关疾病或需要经常服药治疗的疾病。</li>
  <li>参与者必须年满 18 岁；18 岁以下的情况需经父母或法定监护人同意。</li>
  <li>在注册和参与飞行活动时，即视为滑翔伞乘客已阅读、理解并同意以下免责内容：
    <ol>
      <li>清楚认识到滑翔伞是一项具有空中运动固有风险的活动；</li>
      <li>自愿参与并接受活动过程中产生的风险；</li>
      <li>免除飞行员、教练和组织单位对飞行活动潜在风险范围内发生的事故的责任；</li>
      <li>承诺如果发生导致财产损失或自身健康损害的事故或意外，不要求赔偿或起诉；</li>
      <li>完全遵守飞行员和操作人员的安全指导；</li>
      <li>本免责承诺在参与组织单位举办的滑翔伞活动的整个期间内有效。</li>
    </ol>
  </li>
  <li>助跑和着陆动作可能会滑倒导致弄脏衣服，甚至擦伤，因此请客户不要穿着昂贵的衣服、贵重首饰或白色衣服。客户在飞行时需自行准备便于活动的、遮挡良好的长袖衣服并穿运动鞋。</li>
  <li>客户承诺在参与飞行时提供所有准确信息，包括：姓名、出生日期、身份证件号码、体重和健康状况。</li>
</ul>

<h2>2. 飞行时长</h2>
<p>乘客理解无动力滑翔伞飞行 100% 依赖于风，预计每次飞行的空中时间约为 10 分钟左右（除非乘客乘坐动力滑翔伞，则可以主动将飞行时间选择在 10–25 分钟）。因此，参与滑翔伞的乘客接受：</p>
<ul>
  <li>在风力条件较差的情况下，飞行时长可能短于预期。</li>
  <li>在天气条件良好的情况下，可能会免费延长飞行时长。</li>
  <li>飞行超过 15 分钟极易因气压和高度变化引起头晕，请慎重考虑。</li>
</ul>

<h2>3. 图像使用规则</h2>
<p><i>本节解释了在飞行过程中记录的图像和视频的使用方式。</i></p>
<ul>
  <li>在飞行过程中记录的图像和视频（包括 GoPro 设备或其他录像设备）提供给客户，并可用于组织单位的媒体和宣传目的。</li>
  <li>如果不同意使用图像，请在飞行之前或之后通知我们。</li>
</ul>

<h2>4. 改期与取消飞行规则</h2>
<p><i>本节规定了客户注册和参与滑翔伞活动时更改行程适用的条件和原则。</i></p>
<p>滑翔伞飞行是 100% 依赖于天气条件的活动，尤其是风力因素和其他客观条件。因此，在参与飞行时，客户理解并同意：</p>
<ul>
  <li>航班安排可能会因恶劣天气、风力无法确保安全或其他不可抗力因素而被更改、推迟或取消。在这些情况下，客户有权完全免费地更改日期或取消飞行。在其他合理的不可抗力情况下，客户也可以免费更改日期或取消飞行。</li>
  <li>有些日子恶劣的天气会延误航班安排，导致客流拥挤。届时，客户的航班可能会被重新安排，且无法提前通知。客户同意重新安排航班，将确保飞行安全作为最高优先级。</li>
  <li>如果客户因个人原因取消飞行，而已经使用了部分服务（例如：已激活保险、已使用接送车服务、已使用饮料或其他服务），客户同意全额支付已产生的费用。</li>
  <li>如果客户因个人原因取消或改期，影响飞行活动，导致运营中断，或者在飞行员和工作人员团队已准备就绪时客户突然改变计划，客户必须承担相应的产生费用，并且在扣除合理费用后才能退还剩余款项。</li>
  <li>航班安排遵循<b>“先预订，先服务”</b>的原则，因此对于某些飞行点（例如：Khau Pha 垭口飞行点），在高峰期有大量现场预订，航班将根据客户预订服务的时间进行安排。请考虑“尽早”预订，以确保在高峰期的优先飞行权。</li>
</ul>

<h2>5. 携带宠物与物品飞行规则</h2>
<h3>携带宠物</h3>
<p>客户允许携带宠物飞行，但是：</p>
<ul>
  <li>客户对宠物的安全负全部责任。</li>
  <li>宠物必须有合适的固定带并确保受到控制。</li>
  <li>组织单位和飞行员不对与宠物相关的任何风险负责。</li>
  <li>客户理解，如果认为存在影响安全的因素，包括但不限于：体型过大、重量过重、难以控制的行为或任何其他潜在风险，飞行员有权拒绝与宠物同飞。</li>
</ul>
<h3>携带个人物品</h3>
<p>客户可以携带手机、太阳镜、首饰和其他小物件等个人物品。但是：</p>
<ul>
  <li>客户对自身个人财产的保管自负其责。</li>
  <li>组织单位对丢失、掉落或损坏不承担责任。</li>
  <li>过大或过重（超过 3 公斤或阻碍飞行安全）的物品可能会被拒绝携带。</li>
</ul>
<h3>饮食与健康状况</h3>
<p>客户允许在飞行中携带和使用食物及饮料。客户理解：</p>
<ul>
  <li>使用啤酒、酒类或含酒精饮料是客户个人的责任。</li>
  <li>如果客户处于醉酒、行为失控或有不当行为的状态，出于安全原因，可能会被拒绝飞行，并且在此情况下不予退款。</li>
</ul>

<h2>6. 附加服务（无人机、360 度相机、录像）</h2>
<p><i>本节规定了关于拍摄和录像的服务。</i></p>
<ul>
  <li>客户可以在飞行中注册附加服务，如无人机拍摄、360 度相机或其他形式的录像。</li>
  <li>客户理解滑翔伞飞行活动在风、摇晃和复杂的自然环境条件下进行，因此：
    <ul>
      <li>录像设备在飞行过程中可能会遇到技术故障、电池故障、信号丢失、不受控制的摇晃或其他突发错误。</li>
      <li>在某些情况下，故障只有在飞行结束后才被发现，且无法及时修复。</li>
    </ul>
  </li>
  <li>如果录像服务由于意外的技术故障无法执行或无法保证质量，客户同意：
    <ul>
      <li>录像服务的费用将 100% 退还。</li>
      <li>滑翔伞飞行的费用将不予退还，因为飞行活动仍已完全执行并确保了安全。</li>
    </ul>
  </li>
  <li>客户理解并同意，飞行安全因素始终是最高优先级，在任何情况下，技术处理不得影响飞行的安全。</li>
  <li>来自 GoPro 或无人机的文件通常在飞行后立即可用，并直接下载到客户的手机中。但来自 360 度相机的文件需要更多时间进行编辑和导出，因此将在 24 小时内发送（通过 Zalo、云盘或 WhatsApp）。</li>
  <li>由飞行员协助的 GoPro 摄像服务为完全免费提供。乘客可能会被要求在起飞、降落或飞行途中短暂手持该设备。若乘客不慎导致设备损坏或遗失，<b>无需承担赔偿责任</b>；同时，若因飞行过程中的碰撞导致设备损坏/丢失而造成影像或视频数据丢失，客户也<b>将无法获得任何形式的补偿</b>。</li>
</ul>

<h2>7. 其他通用规定</h2>
<p><i>以下补充规定用于保障飞行安全与运营，与上述各节一并适用。</i></p>
<ul>
  <li><b>体重与身体状况。</b>乘客体重须低于 120 公斤。超过 90 公斤或低于 30 公斤，请提前告知，以便我们安排合适的飞行员和装备。若实际体重或身体状况与申报信息有明显出入，飞行员有权出于安全原因拒绝飞行，该次飞行视为因客户个人原因取消。</li>
  <li><b>准时到达。</b>请于飞行前至少 15 分钟抵达办理登记并听取安全讲解。未提前告知而迟到超过 30 分钟，或未到场者，视为因个人原因取消，适用第 4 节规定。</li>
  <li><b>如实申报。</b>虚报或隐瞒健康状况、体重、年龄属违反本条款。对因客户提供不实信息而产生的后果，组织单位不承担责任；因此被拒绝飞行的，不予退款。</li>
  <li><b>飞行员的决定权。</b>是否飞行、何时飞行、航线及降落场地的最终决定权归现场飞行员。若发现安全隐患，飞行员可随时中止或缩短飞行，客户不得以此要求退款。</li>
  <li><b>保险。</b>每次飞行均已包含组织单位所投保的意外保险。保障范围与赔付标准依保险公司条款执行。如需更高保额，请在飞行日前自行另行投保。</li>
  <li><b>未满 18 岁的乘客。</b>未满 18 岁的乘客须由父母或法定监护人在飞行点陪同，并在飞行前确认同意本条款全部内容。</li>
  <li><b>价格与付款。</b>价格以客户预订时显示的价目表为准。周末与节假日适用预订时已显示的专门价格。除另有书面约定外，付款于起飞前在飞行点完成。</li>
  <li><b>个人数据。</b>客户提供的信息用于安排飞行、办理保险、出具电子票及联系支持。除上述目的外，我们不会将数据共享给第三方。</li>
  <li><b>效力与修改。</b>本条款自客户确认预订之时起生效。组织单位可更新条款；适用于每笔预订的版本为客户确认当时所显示的版本。</li>
  <li><b>争议解决。</b>任何问题先由双方善意协商解决；协商不成的，提交组织单位所在地有管辖权的机构处理。</li>
</ul>

<h2>8. 组织单位信息</h2>
${entityBlock("zh")}
`;

const hi = `
<h1>पैराग्लाइडिंग में भाग लेने की शर्तें एवं वचन</h1>
<p><i>अंतिम अद्यतन: ${TERMS_UPDATED_AT}</i></p>
<p><b>पैराग्लाइडिंग एक साहसिक खेल है। बुकिंग की पुष्टि करने से पहले कृपया नीचे दी गई पूरी जानकारी ध्यान से पढ़ें।</b></p>

<h2>1. भाग लेने की शर्तें</h2>
<p><i>यह अनुभाग बुकिंग और उड़ान में भाग लेते समय लागू शर्तों और सिद्धांतों को निर्धारित करता है।</i></p>
<ul>
  <li>पैराग्लाइडिंग एक साहसिक प्रकृति वाला आउटडोर खेल है (फिर भी यह जीवन के सबसे यादगार अनुभवों में से एक है)। इसमें मुक्त उड़ान से जुड़े प्राकृतिक जोखिम होते हैं, जिन्हें पायलट के व्यापक ज्ञान और कौशल के बावजूद 100% समाप्त नहीं किया जा सकता। आपकी उड़ान पेशेवर रूप से प्रशिक्षित और प्रमाणित पायलट द्वारा संचालित होगी।</li>
  <li>यात्री का स्वास्थ्य आउटडोर खेल के लिए उपयुक्त होना चाहिए और उसे ऐसी बीमारियाँ नहीं होनी चाहिए जो स्वयं या दूसरों के लिए ख़तरा बनें, जैसे: मिर्गी, गंभीर हृदय रोग, अनियंत्रित उच्च रक्तचाप, तंत्रिका संबंधी विकार, बार-बार चक्कर आना या बेहोशी, रीढ़ या जोड़ों से जुड़े रोग, अथवा नियमित दवा की आवश्यकता वाली स्थितियाँ।</li>
  <li>यात्री की आयु कम से कम 18 वर्ष होनी चाहिए; 18 वर्ष से कम आयु में माता-पिता या क़ानूनी अभिभावक की सहमति आवश्यक है।</li>
  <li>बुकिंग करने और उड़ान में भाग लेने पर यह माना जाएगा कि यात्री ने निम्नलिखित दायित्व-मुक्ति शर्तें पढ़ी, समझी और स्वीकार की हैं:
    <ol>
      <li>यह स्पष्ट रूप से स्वीकार करना कि पैराग्लाइडिंग में हवाई खेलों के अंतर्निहित जोखिम हैं;</li>
      <li>स्वेच्छा से भाग लेना और गतिविधि के दौरान उत्पन्न जोखिम स्वीकार करना;</li>
      <li>उड़ान के संभावित जोखिमों के दायरे में होने वाली घटनाओं के लिए पायलट, प्रशिक्षक और आयोजक को दायित्व से मुक्त करना;</li>
      <li>दुर्घटना या घटना से संपत्ति अथवा स्वयं के स्वास्थ्य को हानि होने पर मुआवज़े की माँग या मुक़दमा न करने का वचन देना;</li>
      <li>पायलट और संचालन कर्मियों के सुरक्षा निर्देशों का पूर्ण पालन करना;</li>
      <li>यह दायित्व-मुक्ति आयोजक की पैराग्लाइडिंग गतिविधियों में भाग लेने की पूरी अवधि के लिए प्रभावी है।</li>
    </ol>
  </li>
  <li>दौड़कर उड़ान भरने और उतरने में फिसलने से कपड़े गंदे हो सकते हैं या खरोंच लग सकती है, इसलिए महँगे कपड़े और क़ीमती आभूषण न पहनें। आरामदायक, पूरी बाँह वाले ढके हुए कपड़े और स्पोर्ट्स शूज़ पहनें।</li>
  <li>यात्री सही जानकारी देने का वचन देता है: पूरा नाम, जन्म तिथि, पहचान पत्र संख्या, वज़न और स्वास्थ्य स्थिति।</li>
</ul>

<h2>2. उड़ान की अवधि</h2>
<p>यात्री समझता है कि बिना इंजन वाली पैराग्लाइडिंग 100% हवा पर निर्भर है; हवा में अनुमानित समय प्रति उड़ान लगभग 10 मिनट है (पैरामोटर को छोड़कर, जहाँ 10–25 मिनट चुने जा सकते हैं)। अतः यात्री स्वीकार करता है कि:</p>
<ul>
  <li>कमज़ोर हवा में उड़ान अपेक्षा से छोटी हो सकती है।</li>
  <li>अच्छे मौसम में उड़ान निःशुल्क बढ़ाई जा सकती है।</li>
  <li>15 मिनट से अधिक उड़ान में दबाव और ऊँचाई के बदलाव से चक्कर आ सकते हैं; कृपया ध्यान रखें।</li>
</ul>

<h2>3. छवि उपयोग नियम</h2>
<p><i>यह अनुभाग बताता है कि उड़ान के दौरान ली गई तस्वीरें और वीडियो कैसे उपयोग हो सकते हैं।</i></p>
<ul>
  <li>उड़ान के दौरान रिकॉर्ड की गई तस्वीरें और वीडियो (GoPro या अन्य उपकरणों सहित) यात्री को दी जाती हैं और आयोजक के प्रचार-प्रसार के लिए उपयोग की जा सकती हैं।</li>
  <li>यदि आप छवियों के उपयोग से सहमत नहीं हैं, तो उड़ान से पहले या बाद में हमें सूचित करें।</li>
</ul>

<h2>4. पुनर्निर्धारण और रद्दीकरण नियम</h2>
<p><i>यह अनुभाग समय-सारणी में बदलाव की शर्तें निर्धारित करता है।</i></p>
<p>पैराग्लाइडिंग 100% मौसम पर निर्भर है, विशेषकर हवा पर। भाग लेते समय यात्री समझता और सहमत होता है कि:</p>
<ul>
  <li>ख़राब मौसम, असुरक्षित हवा या अन्य अपरिहार्य कारणों से उड़ान बदली, टाली या रद्द की जा सकती है। ऐसे मामलों में पुनर्निर्धारण या रद्दीकरण पूर्णतः निःशुल्क है। अन्य उचित अपरिहार्य परिस्थितियों में भी यही लागू है।</li>
  <li>कुछ दिन ख़राब मौसम से उड़ानें विलंबित होती हैं और भीड़ बन जाती है। तब उड़ान बिना पूर्व सूचना के पुनर्निर्धारित हो सकती है। सुरक्षा सर्वोपरि होने के कारण यात्री इससे सहमत होता है।</li>
  <li>यदि यात्री व्यक्तिगत कारणों से रद्द करता है जबकि कुछ सेवाएँ पहले ही उपयोग हो चुकी हैं (बीमा सक्रिय, शटल सेवा, पेय या अन्य सेवाएँ), तो वह हुए ख़र्च का पूरा भुगतान करने पर सहमत है।</li>
  <li>यदि व्यक्तिगत कारणों से रद्दीकरण या बदलाव संचालन को बाधित करता है, या पायलट और टीम तैयार होने के बाद यात्री अचानक योजना बदलता है, तो संबंधित ख़र्च यात्री वहन करेगा और उचित ख़र्च काटकर शेष राशि लौटाई जाएगी।</li>
  <li>उड़ानें <b>“पहले बुक करें, पहले उड़ें”</b> के आधार पर तय होती हैं। कुछ स्थलों (जैसे खाउ फ़ा दर्रा) पर व्यस्त दिनों में क्रम बुकिंग के समय से तय होगा। प्राथमिकता के लिए “जितनी जल्दी हो सके” बुक करें।</li>
</ul>

<h2>5. पालतू जानवर एवं सामान संबंधी नियम</h2>
<h3>पालतू जानवर</h3>
<p>यात्री पालतू जानवर साथ ले जा सकता है, किंतु:</p>
<ul>
  <li>पालतू की सुरक्षा की पूरी ज़िम्मेदारी यात्री की है।</li>
  <li>पालतू के लिए उपयुक्त हार्नेस होना चाहिए और वह नियंत्रण में रहे।</li>
  <li>आयोजक और पायलट पालतू से जुड़े किसी भी जोखिम के लिए उत्तरदायी नहीं हैं।</li>
  <li>सुरक्षा प्रभावित होने की स्थिति में पायलट पालतू के साथ उड़ान से मना कर सकता है — बहुत बड़ा आकार, अधिक वज़न, अनियंत्रित व्यवहार या कोई अन्य जोखिम।</li>
</ul>
<h3>निजी सामान</h3>
<p>यात्री फ़ोन, धूप का चश्मा, आभूषण और अन्य छोटी वस्तुएँ ला सकता है। किंतु:</p>
<ul>
  <li>अपनी संपत्ति की सुरक्षा की ज़िम्मेदारी यात्री की है।</li>
  <li>हानि, गिरने या क्षति के लिए आयोजक उत्तरदायी नहीं है।</li>
  <li>बहुत बड़ी या भारी वस्तुएँ (3 किग्रा से अधिक या सुरक्षा में बाधक) ले जाने से मना किया जा सकता है।</li>
</ul>
<h3>खाना, पेय और स्वास्थ्य</h3>
<p>यात्री उड़ान के दौरान खाना और पेय ला व ले सकता है। यात्री समझता है कि:</p>
<ul>
  <li>बीयर, वाइन या मादक पेय का सेवन उसकी निजी ज़िम्मेदारी है।</li>
  <li>नशे की स्थिति, व्यवहार पर नियंत्रण खोने या अनुचित व्यवहार पर सुरक्षा कारणों से उड़ान से मना किया जा सकता है और उस स्थिति में धनवापसी नहीं होगी।</li>
</ul>

<h2>6. अतिरिक्त सेवाएँ (ड्रोन, 360 कैमरा, रिकॉर्डिंग)</h2>
<p><i>यह अनुभाग फ़ोटो और वीडियो सेवाओं को निर्धारित करता है।</i></p>
<ul>
  <li>यात्री ड्रोन शूटिंग, 360 कैमरा या अन्य रिकॉर्डिंग जैसी अतिरिक्त सेवाएँ ले सकता है।</li>
  <li>उड़ान हवा, झटकों और जटिल प्राकृतिक परिस्थितियों में होती है, इसलिए:
    <ul>
      <li>रिकॉर्डिंग उपकरणों में तकनीकी ख़राबी, बैटरी समस्या, सिग्नल हानि, अनियंत्रित कंपन या अन्य त्रुटियाँ आ सकती हैं।</li>
      <li>कुछ मामलों में ख़राबी उड़ान के बाद ही पता चलती है और समय पर ठीक नहीं की जा सकती।</li>
    </ul>
  </li>
  <li>यदि अनपेक्षित तकनीकी ख़राबी से रिकॉर्डिंग सेवा नहीं हो पाती या गुणवत्ता सुनिश्चित नहीं होती, तो यात्री सहमत है कि:
    <ul>
      <li>रिकॉर्डिंग सेवा का शुल्क 100% लौटाया जाएगा।</li>
      <li>उड़ान का शुल्क नहीं लौटाया जाएगा, क्योंकि उड़ान पूरी तरह और सुरक्षित रूप से संपन्न हुई।</li>
    </ul>
  </li>
  <li>उड़ान सुरक्षा सर्वोच्च प्राथमिकता है; किसी भी स्थिति में तकनीकी समाधान उड़ान की सुरक्षा को प्रभावित नहीं करेगा।</li>
  <li>GoPro या ड्रोन की फ़ाइलें आमतौर पर उड़ान के तुरंत बाद उपलब्ध होती हैं और सीधे यात्री के फ़ोन में दी जाती हैं। 360 कैमरा की फ़ाइलों में संपादन व एक्सपोर्ट का समय लगता है, इसलिए वे 24 घंटे के भीतर भेजी जाती हैं (Zalo, Drive या WhatsApp से)।</li>
  <li>पायलट द्वारा की जाने वाली GoPro शूटिंग पूर्णतः निःशुल्क है। यात्री से कुछ समय उपकरण पकड़ने को कहा जा सकता है (टेक-ऑफ़, लैंडिंग या उड़ान के दौरान)। दुर्घटनावश उपकरण क्षतिग्रस्त या गुम होने पर ग्राहक को <b>कोई क्षतिपूर्ति नहीं देनी होगी</b>, और उसी कारण फ़ोटो/वीडियो डेटा खोने पर ग्राहक को <b>कोई मुआवज़ा भी नहीं मिलेगा</b>।</li>
</ul>

<h2>7. अन्य सामान्य प्रावधान</h2>
<p><i>उड़ान सुरक्षा और संचालन सुनिश्चित करने वाले अतिरिक्त प्रावधान, ऊपर के अनुभागों के साथ लागू।</i></p>
<ul>
  <li><b>वज़न और शारीरिक स्थिति।</b> यात्री का वज़न 120 किग्रा से कम होना चाहिए। 90 किग्रा से अधिक या 30 किग्रा से कम होने पर कृपया पहले सूचित करें ताकि उपयुक्त पायलट व उपकरण की व्यवस्था हो सके। यदि वास्तविक वज़न या स्थिति घोषित जानकारी से काफ़ी भिन्न हो, तो पायलट सुरक्षा कारणों से उड़ान से मना कर सकता है और उसे यात्री के व्यक्तिगत कारण से रद्दीकरण माना जाएगा।</li>
  <li><b>समय पर पहुँचना।</b> चेक-इन और सुरक्षा ब्रीफ़िंग के लिए उड़ान से कम से कम 15 मिनट पहले पहुँचें। बिना सूचना 30 मिनट से अधिक देरी या अनुपस्थिति को व्यक्तिगत कारण से रद्दीकरण माना जाएगा और अनुभाग 4 लागू होगा।</li>
  <li><b>सही जानकारी देना।</b> स्वास्थ्य, वज़न या आयु के बारे में ग़लत जानकारी देना या छिपाना इन शर्तों का उल्लंघन है। यात्री द्वारा दी गई ग़लत जानकारी से उत्पन्न परिणामों के लिए आयोजक उत्तरदायी नहीं है, और इस कारण उड़ान से मना करने पर धनवापसी नहीं होगी।</li>
  <li><b>पायलट का अधिकार।</b> उड़ान भरनी है या नहीं, कब भरनी है, मार्ग और लैंडिंग स्थल का अंतिम निर्णय मौके पर मौजूद पायलट का होता है। सुरक्षा जोखिम दिखने पर पायलट किसी भी समय उड़ान रोक या छोटी कर सकता है; इस आधार पर धनवापसी का दावा नहीं किया जा सकता।</li>
  <li><b>बीमा।</b> प्रत्येक उड़ान में आयोजक द्वारा ली गई दुर्घटना बीमा पॉलिसी शामिल है। दायरा और भुगतान बीमा कंपनी के नियमों के अनुसार होगा। अधिक कवरेज चाहने पर उड़ान की तिथि से पहले स्वयं अतिरिक्त बीमा कराएँ।</li>
  <li><b>18 वर्ष से कम आयु के यात्री।</b> उन्हें स्थल पर माता-पिता या क़ानूनी अभिभावक के साथ आना होगा, जो उड़ान से पहले इन शर्तों की स्वीकृति की पुष्टि करेंगे।</li>
  <li><b>क़ीमत और भुगतान।</b> बुकिंग के समय दिखाई गई दरें लागू होंगी। सप्ताहांत और अवकाश के दिन अलग दरें लागू होती हैं, जो बुकिंग के समय दिखाई जाती हैं। लिखित रूप में अन्यथा तय न होने पर भुगतान उड़ान स्थल पर टेक-ऑफ़ से पहले किया जाता है।</li>
  <li><b>व्यक्तिगत डेटा।</b> दी गई जानकारी उड़ान की व्यवस्था, बीमा, टिकट जारी करने और सहायता के लिए उपयोग होती है। इन उद्देश्यों के बाहर हम तीसरे पक्ष से डेटा साझा नहीं करते।</li>
  <li><b>प्रभाव और संशोधन।</b> ये शर्तें बुकिंग की पुष्टि के समय से प्रभावी होती हैं। आयोजक इन्हें अद्यतन कर सकता है; प्रत्येक बुकिंग पर वही संस्करण लागू होगा जो पुष्टि के समय प्रदर्शित था।</li>
  <li><b>विवाद का समाधान।</b> कोई भी मुद्दा पहले दोनों पक्षों की सद्भावपूर्ण बातचीत से हल किया जाएगा। असफल होने पर मामला आयोजक के पंजीकृत कार्यालय के सक्षम प्राधिकरण को सौंपा जाएगा।</li>
</ul>

<h2>8. आयोजक की जानकारी</h2>
${entityBlock("hi")}
`;

export const TERMS_HTML: Record<LangCode, string> = { vi, en, fr, ru, zh, hi };
