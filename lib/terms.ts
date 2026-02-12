// lib/terms.ts
export type LangCode = "vi" | "en" | "fr" | "ru";

/**
 * HTML gốc (giữ nguyên nội dung & định dạng đoạn/mục theo DOC).
 * Đã dịch sang en/fr/ru.
 */
export const TERMS_HTML: Record<LangCode, string> = {
  vi: `
<h1>ĐIỀU KHOẢN KHI ĐĂNG KÝ BAY DÙ LƯỢN</h1>

<p><strong>Khách hàng khi đăng ký bay dù lượn xin lưu ý:</strong></p>

<p>Dù lượn là môn thể thao bay tự do, hoạt động ngoài trời và là môn thể thao mạo hiểm. Để quá trình bay được đảm bảo an toàn và mang lại trải nghiệm tốt, quý khách vui lòng tuân thủ mọi hướng dẫn của phi công đồng thời chuẩn bị các trang bị cá nhân phù hợp (mặc đồ đủ ấm, chống nắng/gió, đi giày, đeo kính, …).</p>

<p>Khi tham gia bay dù lượn, bạn phải cam kết đảm bảo mình: Không gặp các vấn đề về tim mạch, huyết áp; Không có vấn đề về xương khớp đặc biệt là vấn đề về cột sống; Và không mang thai. Đồng thời, bạn phải xác nhận bạn tự nguyện tham gia trải nghiệm bay dù lượn và chịu mỏi rủi ro (nếu có) trong quá trình bay dù lượn.</p>

<p>Khi tham bay dù lượn đòi hỏi phải có vận động, như đi bộ, chạy, nhảy trong điều kiện thời tiết có nắng và gió ở ngoài trời, có thể đổ mồ hôi, và ở trên cao nhiệt độ thường thấp hơn bên dưới từ 5-7 độ C kèm gió; hãy khởi động trước khi bay và khách vui lòng tự chuẩn bị trang phục phù hợp với thời tiết, đặc biệt phải nên đi giày thể thao để bảo vệ chân.</p>

<p>Thời gian để hoàn thành 1 chuyến bay dao động từ 45 – 180 phút tuỳ địa điểm, bao gồm: di chuyển từ khách sạn đến điểm bay, di chuyển lên điểm cất cánh (trên đỉnh núi), quy trình chuẩn bị bay, thời gian bay trên trời và trả dữ liệu bay. Thời lượng bay trên trời thường khoảng trên/dưới 10 phút mỗi chuyến, phụ thuộc 100% vào điều kiện gió và tuỳ địa điểm bay - nếu có gió tốt chúng tôi sẽ bay lâu hơn miễn phí; nhưng nếu gió không đủ tốt, chuyến bay có thể ngắn hơn. Bạn cũng không nên bay quá lâu, thông thường chuyến bay trên 15 phút sẽ làm bạn cảm thấy chóng mặt, đây là triệu chứng thông thường khi chơi dù lượn lần đầu.</p>

<p>Dù có thể hạ cánh ở một số điểm dự phòng vì lý do an toàn, hoặc hành động chạy đà, đáp đất có thể trượt ngã làm bẩn trang phục, vì vậy vui lòng không mang theo các trang phục đắt tiền, trang sức quý giá, trang phục màu trắng, … có thể bị bẩn hoặc hỏng khi bay dù. Khách chơi dù vui lòng tự bảo quản các đồ cá nhân mang theo hoặc đưa phi công cất hộ.</p>

<p>Bay dù lượn là hoạt động ngoài trời do vậy phụ thuộc 100% vào thời tiết, chuyến bay có thể bị đổi lịch hoặc huỷ không báo trước do điều kiện thời tiết xấu. Hoặc đôi khi phải chờ gió, bị delay do vấn đề khách quan (thường có thể gây ra tình trạng dồn lịch bay).</p>

<p>Không có khung giờ bay đẹp nhất cố định, khung giờ bay đẹp nhất tuỳ vào GIÓ và NẮNG của mỗi ngày, KHÔNG NGÀY NÀO GIỐNG NGÀY NÀO. Bay vào hoàng hôn đẹp nhưng lúc đó gió thường yếu, khó bay và nguy cơ bị huỷ bay cao, và thời lượng bay ngắn do gió thường yếu. Thông thường khung giờ bay lâu, bay cao nằm trong khoảng từ 11:00-15:00 tuỳ ngày.</p>

<p>Trường hợp huỷ bay do điều kiện thời tiết không mong muốn, khách hàng vui lòng tự thanh toán các dịch vụ đã phát sinh (bao gồm xe đưa đón và nước uống đi kèm, hoặc các dịch vụ khách đã sử dụng).</p>

<p>Mọi đặt lịch đều được HOÀN HUỶ MIỄN PHÍ nếu bạn thông báo trước 01 ngày trước ngày bay. Nếu bạn đặt lịch bay quá gấp, chúng tôi không đảm bảo khả năng triển khai chuyến bay do có thể gặp vấn đề về thời tiết hoặc dịch vụ bị quá tải, vui lòng đặt lịch sớm (trước 3-5 hôm) để có sự chuẩn bị chu đáo nhất.</p>

<p>Mọi chuyến bay đều bao gồm MIỄN PHÍ quay phim/chụp hình từ GOPRO của chúng tôi, chất lượng video Full HD, nếu bạn có thiết bị chụp hình riêng, bạn có thể sử dụng thiết bị của bạn. Tuy nhiên, chúng tôi không đảm bảo về chất lượng hình ảnh hay các sự cố khác liên quan tới thiết bị của bạn.</p>

<p>Các hình ảnh của chuyến bay từ GOPRO có thể được sử dụng vào truyền thông, nếu bạn không đồng ý, vui lòng báo trước.</p>

<p>Một số điểm bay phải sử dụng xe chuyên dụng để lên núi (như Đồi Bù, Viên Nam) nên thời gian chờ đợi sắp xếp xe hoặc lịch bay có thể bị thay đổi nhẹ do điều kiện đường sá khó khăn.</p>

<p>Ngay sau chuyến bay, phi công sẽ trả toàn bộ dữ liệu ảnh/video của chuyến bay vào điện thoại của khách, vui lòng chuẩn bị bộ nhớ khoảng 4GB, chúng tôi không lưu trữ sau khi trả dữ liệu.</p>

<p>Chúng tôi luôn có nước uống cho bạn, vui lòng hỏi phi công để được hỗ trợ. Và nếu bạn có yêu cầu đặc biệt cho chuyến bay, vui lòng trao đổi trực tiếp với phi công.</p>

<p>Vào mùa cao điểm (mùa vàng tại đèo Khau Phạ, hoặc tại Sapa), nhu cầu trải nghiệm bay tăng đột biến, hoặc vào ngày có thời tiết xấu giới hạn khung giờ bay, khách đặt bay sớm sẽ được ưu tiên thứ tự bay. Để đảm bảo được bay đúng lịch mong muốn, vui lòng đặt bay sớm để chúng tôi có sự chuẩn bị tốt nhất (hãy yên tâm, đặt bay của bạn được đổi lịch/hoàn huỷ miễn phí).</p>

<h2>CHI TIẾT</h2>

<h3>Điều kiện khi tham gia bay dù lượn:</h3>
<ul>
  <li>Mọi độ tuổi đều có thể tham gia bay dù lượn, chúng tôi có đủ thiết bị theo kích cỡ và độ tuổi của khách (từ 03-80 tuổi).</li>
  <li>Cân nặng tối đa 100kg – trường hợp cân nặng trên 100kg, vui lòng thông báo sớm.</li>
  <li>Không gặp các vấn đề tim mạch, huyết áp; Không gặp các vấn đề về xương khớp; Không mang thai.</li>
  <li>Dù lượn là môn thể thao MẠO HIỂM vì vậy bạn KHÔNG THỂ TỰ BAY (nếu chưa qua lớp đào tạo + thi lấy bằng).</li>
  <li>Mỗi chuyến bay: khách bay cùng một phi công chuyên nghiệp, do phi công cầm lái.</li>
  <li>Mọi trẻ em trên đều tính là 1 khách bay riêng với phi công (không bay cùng bố/mẹ hoặc người thân do chỉ có duy nhất 1 ghế ngồi – để đảm bảo an toàn bay).</li>
</ul>

<h3>B. Trang phục khi bay dù lượn:</h3>
<ul>
  <li>Trang phục gọn gàng, dễ vận động; không nên mặc váy, nên mặc quần dài, kín gió, tránh nắng nóng, màu sắc sặc sỡ lên hình cho nổi bật .</li>
  <li>Đi giày thể thao, ko đi giày dép cao. (lưu ý: bãi cất cánh hạ cánh đều là đất - không nên mang giày xịn hoặc màu trắng, tránh hư giày).</li>
  <li>Có thể đeo kính cận, kính râm khi bay; có thể mang theo khi bay 1 túi nhỏ 1- 2kg đựng đồ cá nhân như điện thoại, chìa khóa, giấy tờ tùy thân.</li>
</ul>

<h3>C. Các lưu ý trước chuyến bay</h3>
<ul>
  <li>Khách cần mang theo điện thoại còn ít nhất 4GB dung lượng trống để tải ảnh và clip sau khi kết thúc chuyến bay.</li>
  <li>Tại bãi cất cánh và hạ cánh, để đảm bảo an toàn bay, khách chưa bay hay đã bay không tiến lại gần khu vực bay, không dẫm lên dây dù, cánh dù, luôn chú ý quan sát tránh tiến vào đường bay của phi công.</li>
  <li>Không hút thuốc lá trong khu vực bay.</li>
  <li>Mebayluon có phục vụ nước uống tại bãi hạ cánh.</li>
</ul>

<h3>D. Dịch vụ bao gồm</h3>
<ul>
  <li>Một chuyến bay đôi do phi công cầm lái từ 8 – 20 phút (tuỳ gió, địa điểm bay và sức khoẻ của bạn)</li>
  <li>Quay video, chụp ảnh bằng thiết bị Gopro (do MBL cung cấp)</li>
  <li>Trang bị an toàn và bảo hộ khi bay</li>
  <li>Bảo hiểm dù lượn (mức tối đa 100.000.000vnđ)</li>
  <li>Nước uống, giấy chứng nhận</li>
  <li>Không phụ thu nếu muốn kéo dài chuyến bay; Không phụ thu khi bay cùng thú cưng</li>
  <li>Lịch bay linh động, hoàn huỷ miễn phí</li>
</ul>

<h3>E. Quy tắc đặt lịch/ hoàn/ huỷ</h3>
<ul>
  <li>Đặt lịch bay càng sớm, bạn càng được ưu tiên thứ tự, trường hợp báo gấp trong ngày có thể quá tải số lượng và không kịp sắp xếp lịch bay. Nên đặt bay trước ít nhất 3-5 ngày sẽ có sự chuẩn bị tốt hơn cũng như được tư vấn để chọn được thời điểm bay tốt nhất.</li>
  <li>MBL không chịu trách nhiệm về khả năng triển khai bay nếu khách đặt lịch bay quá gấp.</li>
  <li>Mọi lịch bay đều được hoàn huỷ hoặc đổi lịch bay LINH ĐỘNG &amp; MIỄN PHÍ.</li>
  <li>Lịch bay có thể thay đổi hoặc huỷ đột xuất do thời tiết xấu, gió xấu hoặc do điều kiện bay không đảm bảo an toàn. Đây là tình huống không mong muốn, khách được hỗ trợ ưu tiên đổi/huỷ lịch bay miễn phí, tuy nhiên khách có thể phải thanh toán các chi phí phát sinh do đã sử dụng một phần dịch vụ.</li>
</ul>
  `.trim(),

  en: `
<h1>TERMS AND CONDITIONS FOR PARAGLIDING REGISTRATION</h1>

<p><strong>Customers registering for paragliding, please note:</strong></p>

<p>Paragliding is a free-flying, outdoor, and adventurous sport. To ensure a safe flight and a good experience, please follow all pilot instructions and prepare appropriate personal gear (wear warm clothes, sun/wind protection, shoes, glasses, etc.).</p>

<p>When participating in paragliding, you must guarantee that you: Do not have cardiovascular or blood pressure problems; Do not have musculoskeletal issues, especially spinal problems; And are not pregnant. At the same time, you must confirm that you are voluntarily participating in the paragliding experience and assume all risks (if any) during the flight.</p>

<p>Participating in paragliding requires physical activity, such as walking, running, and jumping in sunny and windy outdoor conditions, which may cause sweating. At high altitudes, the temperature is often 5-7 degrees C lower than below, with wind; please warm up before the flight and prepare suitable clothing for the weather, especially sports shoes to protect your feet.</p>

<p>The time to complete one flight ranges from 45 to 180 minutes depending on the location, including: travel from the hotel to the flying site, transfer to the takeoff point (on a mountaintop), flight preparation procedures, airtime, and flight data transfer. The airtime is usually around 10 minutes per flight, 100% dependent on wind conditions and location - if the wind is good, we will fly longer for free; but if the wind is not good enough, the flight may be shorter. You should also not fly for too long; typically, a flight over 15 minutes may make you feel dizzy, which is a common symptom when paragliding for the first time.</p>

<p>We may land at alternative landing spots for safety reasons, or the takeoff run and landing may result in slips or falls, dirtying your clothes. Therefore, please do not wear expensive clothing, valuable jewelry, or white outfits... that could get dirty or damaged during the flight. Customers are requested to look after their personal belongings or give them to the pilot for safekeeping.</p>

<p>Paragliding is an outdoor activity and is 100% dependent on the weather. Flights may be rescheduled or canceled without prior notice due to bad weather conditions. Sometimes, we may have to wait for wind or experience delays due to objective issues (which can often lead to a backlog of flights).</p>

<p>There is no fixed "best time to fly." The best flying time depends on the WIND and SUN of each day; NO TWO DAYS ARE THE SAME. Flying at sunset is beautiful, but the wind is often weak, making it difficult to fly, with a high risk of cancellation and short flight durations. Usually, the times for long, high flights are between 11:00 AM and 3:00 PM, depending on the day.</p>

<p>In case of flight cancellation due to unexpected weather conditions, customers are kindly requested to pay for any services already rendered (including transportation, accompanying drinks, or other services used).</p>

<p>All bookings can be CANCELED FOR FREE if you notify us 01 day before the flight date. If you book too close to the date, we cannot guarantee flight availability due to potential weather issues or service overload. Please book early (3-5 days in advance) for the best preparation.</p>

<p>All flights include FREE filming/photography from our GOPRO, with Full HD video quality. If you have your own camera equipment, you may use it. However, we do not guarantee the image quality or any other issues related to your equipment.</p>

<p>Images from the GOPRO flight may be used for media purposes. If you do not consent, please inform us in advance.</p>

<p>Some flying sites require specialized vehicles to ascend the mountain (like Doi Bu, Vien Nam), so waiting times for vehicle arrangements or flight schedules may change slightly due to difficult road conditions.</p>

<p>Immediately after the flight, the pilot will transfer all photos/videos from the flight to the customer's phone. Please prepare about 4GB of free memory; we do not store data after transfer.</p>

<p>We always have drinking water available for you; please ask the pilot for assistance. If you have any special requests for your flight, please discuss them directly with the pilot.</p>

<p>During peak season (golden rice season at Khau Pha Pass, or in Sapa), the demand for flying experiences increases dramatically, or on bad weather days that limit flying hours, customers who book early will be prioritized. To ensure you fly at your desired time, please book early so we can prepare best (rest assured, your booking can be rescheduled/canceled for free).</p>

<h2>DETAILS</h2>

<h3>A. Conditions for participating in paragliding:</h3>
<ul>
  <li>All ages can participate in paragliding; we have equipment suitable for all customer sizes and ages (from 03-80 years old).</li>
  <li>Maximum weight 100kg – if over 100kg, please inform us in advance.</li>
  <li>No cardiovascular or blood pressure problems; No musculoskeletal problems; Not pregnant.</li>
  <li>Paragliding is an ADVENTURE sport, so you CANNOT FLY ALONE (unless you have completed training + obtained a license).</li>
  <li>Each flight: the customer flies with a professional pilot, who controls the glider.</li>
  <li>All children are counted as 1 separate passenger flying with a pilot (cannot fly with parents or relatives as there is only one passenger seat – to ensure flight safety).</li>
</ul>

<h3>B. Attire for paragliding:</h3>
<ul>
  <li>Wear neat, easy-to-move-in clothing; do not wear skirts. Long, wind-resistant pants are recommended to protect from sun/heat. Bright colors look great in photos.</li>
  <li>Wear sports shoes, not high heels. (Note: takeoff and landing areas are on dirt - do not wear expensive or white shoes, as they may be damaged).</li>
  <li>You can wear prescription glasses or sunglasses. You can bring a small bag (1-2kg) containing personal items like a phone, keys, and ID.</li>
</ul>

<h3>C. Notes before the flight</h3>
<ul>
  <li>Customers need to bring a phone with at least 4GB of free space to download photos and clips after the flight.</li>
  <li>At the takeoff and landing zones, to ensure flight safety, customers who are waiting or have finished flying must not approach the flying area, step on lines or gliders, and must always pay attention to avoid the pilots' flight path.</li>
  <li>No smoking in the flying area.</li>
  <li>Mebayluon provides drinking water at the landing site.</li>
</ul>

<h3>D. Service includes</h3>
<ul>
  <li>One tandem flight controlled by a pilot, lasting 8 – 20 minutes (depending on wind, location, and your health)</li>
  <li>Video recording and photography with a Gopro (provided by MBL)</li>
  <li>Safety equipment and protective gear for the flight</li>
  <li>Paragliding insurance (maximum coverage 100,000,000 VND)</li>
  <li>Drinking water, certificate</li>
  <li>No surcharge for extending the flight; No surcharge for flying with pets</li>
  <li>Flexible booking, free cancellation</li>
</ul>

<h3>E. Booking/Refund/Cancellation Policy</h3>
<ul>
  <li>The earlier you book, the higher your priority. Last-minute bookings on the same day may be subject to overload and we may not be able to arrange the flight. Booking at least 3-5 days in advance allows for better preparation and advice on the best time to fly.</li>
  <li>MBL is not responsible for flight availability if the customer books too late.</li>
  <li>All bookings can be rescheduled or canceled FLEXIBLY &amp; FREE OF CHARGE.</li>
  <li>Flight schedules may change or be canceled abruptly due to bad weather, unfavorable wind, or unsafe flying conditions. This is an undesirable situation. Customers will be prioritized for rescheduling/cancellation free of charge; however, customers may have to pay for costs incurred from services partially used.</li>
</ul>
  `.trim(),

  fr: `
<h1>CONDITIONS GÉNÉRALES D'INSCRIPTION AU PARAPENTE</h1>

<p><strong>Clients s'inscrivant pour le parapente, veuillez noter :</strong></p>

<p>Le parapente est un sport de vol libre, de plein air et d'aventure. Pour garantir un vol en toute sécurité et une bonne expérience, veuillez suivre toutes les instructions du pilote et préparer un équipement personnel approprié (portez des vêtements chauds, une protection contre le soleil/vent, des chaussures, des lunettes, etc.).</p>

<p>En participant au parapente, vous devez garantir que vous : N'avez pas de problèmes cardiovasculaires ou d'hypertension ; N'avez pas de problèmes musculo-squelettiques, en particulier des problèmes de colonne vertébrale ; Et n'êtes pas enceinte. En même temps, vous devez confirmer que vous participez volontairement à l'expérience de parapente et assumez tous les risques (le cas échéant) pendant le vol.</p>

<p>La participation au parapente nécessite une activité physique, telle que la marche, la course et le saut dans des conditions extérieures ensoleillées et venteuses, ce qui peut provoquer la transpiration. À haute altitude, la température est souvent inférieure de 5 à 7 degrés C, avec du vent ; veuillez vous échauffer avant le vol et préparer des vêtements adaptés à la météo, en particulier des chaussures de sport pour protéger vos pieds.</p>

<p>Le temps nécessaire pour effectuer un vol varie de 45 à 180 minutes selon le lieu, incluant : le trajet de l'hôtel au site de vol, le transfert au point de décollage (au sommet d'une montagne), les procédures de préparation au vol, le temps de vol et le transfert des données de vol. Le temps de vol est généralement d'environ 10 minutes par vol, dépendant à 100% des conditions de vent et du lieu - si le vent est bon, nous volerons plus longtemps gratuitement ; mais si le vent n'est pas suffisant, le vol peut être plus court. Vous ne devriez pas non plus voler trop longtemps ; typiquement, un vol de plus de 15 minutes peut vous donner le vertige, ce qui est un symptôme courant lors du premier vol en parapente.</p>

<p>Nous pouvons atterrir à des points d'atterrissage alternatifs pour des raisons de sécurité, ou la course au décollage et l'atterrissage peuvent entraîner des glissades ou des chutes, salissant vos vêtements. Par conséquent, veuillez ne pas porter de vêtements coûteux, de bijoux de valeur ou de tenues blanches... qui pourraient être salis ou endommagés pendant le vol. Il est demandé aux clients de veiller sur leurs effets personnels ou de les confier au pilote.</p>

<p>Le parapente est une activité de plein air et dépend à 100% de la météo. Les vols peuvent être reportés ou annulés sans préavis en raison de mauvaises conditions météorologiques. Parfois, nous devons attendre le vent ou subir des retards dus à des problèmes objectifs (ce qui peut souvent entraîner un arriéré de vols).</p>

<p>Il n'y a pas de "meilleur moment pour voler" fixe. Le meilleur moment pour voler dépend du VENT et du SOLEIL de chaque jour ; AUCUN JOUR NE SE RESSEMBLE. Voler au coucher du soleil est magnifique, mais le vent est souvent faible, ce qui rend le vol difficile, avec un risque élevé d'annulation et des durées de vol courtes. Habituellement, les moments pour des vols longs et hauts se situent entre 11h00 et 15h00, selon le jour.</p>

<p>En cas d'annulation de vol due à des conditions météorologiques imprévues, les clients sont priés de payer les services déjà fournis (y compris le transport, les boissons d'accompagnement ou autres services utilisés).</p>

<p>Toutes les réservations peuvent être ANNULÉES GRATUITEMENT si vous nous prévenez 01 jour avant la date du vol. Si vous réservez trop près de la date, nous ne pouvons garantir la disponibilité du vol en raison de problèmes météorologiques potentiels ou de surcharge de service. Veuillez réserver tôt (3-5 jours à l'avance) pour la meilleure préparation.</p>

<p>Tous les vols incluent GRATUITEMENT le tournage/photographie depuis notre GOPRO, avec une qualité vidéo Full HD. Si vous avez votre propre équipement photo, vous pouvez l'utiliser. Cependant, nous ne garantissons pas la qualité de l'image ou tout autre problème lié à votre équipement.</p>

<p>Les images du vol prises par la GOPRO peuvent être utilisées à des fins médiatiques. Si vous n'y consentez pas, veuillez nous en informer à l'avance.</p>

<p>Certains sites de vol nécessitent des véhicules spécialisés pour monter la montagne (comme Doi Bu, Vien Nam), les temps d'attente pour l'organisation des véhicules ou les horaires de vol peuvent donc légèrement changer en raison des conditions routières difficiles.</p>

<p>Immédiatement après le vol, le pilote transférera toutes les photos/vidéos du vol sur le téléphone du client. Veuillez préparer environ 4 Go de mémoire libre ; nous ne stockons pas les données après le transfert.</p>

<p>Nous avons toujours de l'eau potable à votre disposition ; veuillez demander au pilote. Si vous avez des demandes spéciales pour votre vol, veuillez en discuter directement avec le pilote.</p>

<p>Pendant la haute saison (saison du riz doré au col de Khau Pha, ou à Sapa), la demande d'expériences de vol augmente considérablement, ou les jours de mauvais temps qui limitent les heures de vol, les clients qui réservent tôt seront prioritaires. Pour vous assurer de voler à l'heure souhaitée, veuillez réserver tôt afin que nous puissions nous préparer au mieux (rassurez-vous, votre réservation peut être reportée/annulée gratuitement).</p>

<h2>DÉTAILS</h2>

<h3>A. Conditions de participation au parapente :</h3>
<ul>
  <li>Tous les âges peuvent participer au parapente ; nous avons un équipement adapté à toutes les tailles et tous les âges des clients (de 03 à 80 ans).</li>
  <li>Poids maximum 100 kg – si plus de 100 kg, veuillez nous en informer à l'avance.</li>
  <li>Pas de problèmes cardiovasculaires ou d'hypertension ; Pas de problèmes musculo-squelettiques ; Ne pas être enceinte.</li>
  <li>Le parapente est un sport d'AVENTURE, vous NE POUVEZ DONC PAS VOLER SEUL (sauf si vous avez suivi une formation + obtenu une licence).</li>
  <li>Chaque vol : le client vole avec un pilote professionnel, qui contrôle la voile.</li>
  <li>Tous les enfants comptent pour 1 passager distinct volant avec un pilote (ne peuvent pas voler avec les parents ou la famille car il n'y a qu'un seul siège passager – pour garantir la sécurité du vol).</li>
</ul>

<h3>B. Tenue pour le parapente :</h3>
<ul>
  <li>Portez des vêtements soignés et faciles à bouger ; ne portez pas de jupes. Les pantalons longs et coupe-vent sont recommandés pour protéger du soleil/de la chaleur. Les couleurs vives rendent bien sur les photos.</li>
  <li>Portez des chaussures de sport, pas de talons hauts. (Remarque : les zones de décollage et d'atterrissage sont en terre - ne portez pas de chaussures chères ou blanches, car elles pourraient être endommagées).</li>
  <li>Vous pouvez porter des lunettes de vue ou de soleil. Vous pouvez apporter un petit sac (1-2 kg) contenant des effets personnels comme un téléphone, des clés et une pièce d'identité.</li>
</ul>

<h3>C. Notes avant le vol</h3>
<ul>
  <li>Les clients doivent apporter un téléphone avec au moins 4 Go d'espace libre pour télécharger les photos et clips après le vol.</li>
  <li>Sur les zones de décollage et d'atterrissage, pour garantir la sécurité des vols, les clients qui attendent ou ont terminé de voler ne doivent pas s'approcher de la zone de vol, ne pas marcher sur les suspentes ou les voiles, et doivent toujours faire attention pour éviter la trajectoire de vol des pilotes.</li>
  <li>Ne pas fumer dans la zone de vol.</li>
  <li>Mebayluon fournit de l'eau potable sur le site d'atterrissage.</li>
</ul>

<h3>D. Le service comprend</h3>
<ul>
  <li>Un vol en tandem contrôlé par un pilote, d'une durée de 8 à 20 minutes (selon le vent, le lieu et votre santé)</li>
  <li>Enregistrement vidéo et photographie avec une Gopro (fournie par MBL)</li>
  <li>Équipement de sécurité et de protection pour le vol</li>
  <li>Assurance parapente (couverture maximale 100 000 000 VND)</li>
  <li>Eau potable, certificat</li>
  <li>Pas de supplément pour prolonger le vol ; Pas de supplément pour voler avec des animaux de compagnie</li>
  <li>Réservation flexible, annulation gratuite</li>
</ul>

<h3>E. Politique de réservation/remboursement/annulation</h3>
<ul>
  <li>Plus vous réservez tôt, plus votre priorité est élevée. Les réservations de dernière minute le même jour peuvent être soumises à une surcharge et nous pourrions ne pas être en mesure d'organiser le vol. Réserver au moins 3 à 5 jours à l'avance permet une meilleure préparation et des conseils sur le meilleur moment pour voler.</li>
  <li>MBL n'est pas responsable de la disponibilité du vol si le client réserve trop tard.</li>
  <li>Toutes les réservations peuvent être reportées ou annulées de manière FLEXIBLE &amp; GRATUITE.</li>
  <li>Les horaires de vol peuvent changer ou être annulés brusquement en raison du mauvais temps, d'un vent défavorable ou de conditions de vol dangereuses. C'est une situation indésirable. Les clients seront prioritaires pour reporter/annuler gratuitement ; cependant, les clients peuvent devoir payer les frais engagés pour les services partiellement utilisés.</li>
</ul>
  `.trim(),

  ru: `
<h1>УСЛОВИЯ РЕГИСТРАЦИИ НА ПОЛЕТЫ НА ПАРАПЛАНЕ</h1>

<p><strong>Клиенты, регистрирующиеся на полет на параплане, обратите внимание:</strong></p>

<p>Парапланеризм — это спорт свободного полета, активный отдых на открытом воздухе и экстремальный вид спорта. Для обеспечения безопасности полета и получения хороших впечатлений, пожалуйста, следуйте всем инструкциям пилота и подготовьте соответствующее личное снаряжение (наденьте теплую одежду, защиту от солнца/ветра, обувь, очки и т. д.).</p>

<p>Участвуя в полете на параплане, вы должны гарантировать, что у вас: Нет сердечно-сосудистых проблем или проблем с артериальным давлением; Нет проблем с опорно-двигательным аппаратом, особенно с позвоночником; И вы не беременны. В то же время, вы должны подтвердить, что добровольно участвуете в полете на параплане и принимаете на себя все риски (если таковые имеются) во время полета.</p>

<p>Участие в полете на параплане требует физической активности, такой как ходьба, бег и прыжки в солнечную и ветреную погоду на открытом воздухе, что может вызвать потоотделение. На большой высоте температура часто на 5-7 градусов C ниже, чем внизу, и дует ветер; пожалуйста, разомнитесь перед полетом и подготовьте подходящую одежду по погоде, особенно спортивную обувь для защиты ног.</p>

<p>Время выполнения одного полета варьируется от 45 до 180 минут в зависимости от места, включая: проезд от отеля до места полетов, подъем на точку взлета (на вершине горы), процедуры подготовки к полету, время в воздухе и передачу данных полета. Время в воздухе обычно составляет около 10 минут за полет, 100% зависит от ветровых условий и места - если ветер хороший, мы будем летать дольше бесплатно; но если ветер недостаточно хороший, полет может быть короче. Вам также не следует летать слишком долго; обычно полет дольше 15 минут может вызвать у вас головокружение, что является обычным симптомом при первом полете на параплане.</p>

<p>Мы можем приземлиться в альтернативных местах посадки по соображениям безопасности, или во время разбега и приземления вы можете поскользнуться или упасть, испачкав одежду. Поэтому, пожалуйста, не надевайте дорогую одежду, ценные украшения или белые наряды... которые могут испачкаться или повредиться во время полета. Клиентов просят следить за своими личными вещами или отдать их пилоту на хранение.</p>

<p>Полеты на параплане — это активность на открытом воздухе, поэтому она на 100% зависит от погоды. Полеты могут быть перенесены или отменены без предварительного уведомления из-за плохих погодных условий. Иногда нам приходится ждать ветра или возможны задержки по объективным причинам (что часто может приводить к накоплению рейсов).</p>

<p>Нет фиксированного "лучшего времени для полетов". Лучшее время для полетов зависит от ВЕТРА и СОЛНЦА каждого дня; НЕТ ДВУХ ОДИНАКОВЫХ ДНЕЙ. Полеты на закате красивы, но ветер в это время часто слабый, что затрудняет полет, с высоким риском отмены и короткой продолжительностью полета. Обычно время для долгих и высоких полетов — между 11:00 и 15:00, в зависимости от дня.</p>

<p>В случае отмены полета из-за непредвиденных погодных условий, клиенты должны оплатить уже оказанные услуги (включая трансфер, сопутствующие напитки или другие использованные услуги).</p>

<p>Все бронирования могут быть ОТМЕНЕНЫ БЕСПЛАТНО, если вы уведомите нас за 01 день до даты полета. Если вы бронируете слишком близко к дате, мы не можем гарантировать возможность полета из-за возможных погодных проблем или перегрузки сервиса. Пожалуйста, бронируйте заранее (за 3-5 дней) для лучшей подготовки.</p>

<p>Все полеты включают БЕСПЛАТНУЮ видео/фотосъемку с нашей GOPRO, с качеством видео Full HD. Если у вас есть собственное оборудование для съемки, вы можете его использовать. Однако мы не гарантируем качество изображения или любые другие проблемы, связанные с вашим оборудованием.</p>

<p>Изображения с полета, снятые на GOPRO, могут быть использованы в медийных целях. Если вы не согласны, пожалуйста, сообщите нам заранее.</p>

<p>Некоторые места полетов требуют использования специализированного транспорта для подъема на гору (например, Дой Бу, Виен Нам), поэтому время ожидания транспорта или расписание полетов могут незначительно изменяться из-за сложных дорожных условий.</p>

<p>Сразу после полета пилот передаст все фото/видео с полета на телефон клиента. Пожалуйста, подготовьте около 4 ГБ свободной памяти; мы не храним данные после передачи.</p>

<p>У нас всегда есть для вас питьевая вода; пожалуйста, обратитесь к пилоту за помощью. Если у вас есть особые пожелания к полету, пожалуйста, обсудите их напрямую с пилотом.</p>

<p>В пиковый сезон (сезон золотого риса на перевале Кхау Фа или в Сапе) спрос на полеты резко возрастает, или в дни с плохой погодой, ограничивающей время полетов, клиенты, забронировавшие заранее, получают приоритет. Чтобы гарантированно полететь в желаемое время, пожалуйста, бронируйте заранее, чтобы мы могли наилучшим образом подготовиться (будьте уверены, ваше бронирование можно перенести/отменить бесплатно).</p>

<h2>ПОДРОБНОСТИ</h2>

<h3>A. Условия участия в полетах на параплане:</h3>
<ul>
  <li>В полетах на параплане могут участвовать люди любого возраста; у нас есть снаряжение, подходящее для всех размеров и возрастов клиентов (от 03 до 80 лет).</li>
  <li>Максимальный вес 100 кг – если вес превышает 100 кг, пожалуйста, сообщите нам заранее.</li>
  <li>Отсутствие сердечно-сосудистых проблем или проблем с артериальным давлением; Отсутствие проблем с опорно-двигательным аппаратом; Не беременны.</li>
  <li>Парапланеризм — это ЭКСТРЕМАЛЬНЫЙ вид спорта, поэтому вы НЕ МОЖЕТЕ ЛЕТАТЬ САМОСТОЯТЕЛЬНО (если не прошли обучение + не получили лицензию).</li>
  <li>Каждый полет: клиент летит с профессиональным пилотом, который управляет парапланом.</li>
  <li>Все дети считаются отдельными пассажирами, летящими с пилотом (не могут лететь с родителями или родственниками, так как есть только одно пассажирское место – для обеспечения безопасности полета).</li>
</ul>

<h3>B. Одежда для полетов на параплане:</h3>
<ul>
  <li>Носите опрятную, удобную для движений одежду; не надевайте юбки. Рекомендуются длинные, ветрозащитные брюки для защиты от солнца/жары. Яркие цвета отлично смотрятся на фотографиях.</li>
  <li>Носите спортивную обувь, а не высокие каблуки. (Примечание: зоны взлета и посадки находятся на земле - не надевайте дорогую или белую обувь, так как она может быть повреждена).</li>
  <li>Вы можете носить обычные очки или солнцезащитные очки. Вы можете взять с собой небольшую сумку (1-2 кг) с личными вещами, такими как телефон, ключи и удостоверение личности.</li>
</ul>

<h3>C. Примечания перед полетом</h3>
<ul>
  <li>Клиентам необходимо иметь при себе телефон с не менее 4 ГБ свободного места для загрузки фотографий и клипов после полета.</li>
  <li>В зонах взлета и посадки, для обеспечения безопасности полетов, клиенты, ожидающие или завершившие полет, не должны приближаться к зоне полетов, наступать на стропы или крылья, и всегда должны быть внимательны, чтобы не мешать траектории полета пилотов.</li>
  <li>Не курить в зоне полетов.</li>
  <li>Mebayluon предоставляет питьевую воду на месте посадки.</li>
</ul>

<h3>D. Услуга включает</h3>
<ul>
  <li>Один тандемный полет под управлением пилота, продолжительностью 8 – 20 минут (в зависимости от ветра, места и вашего здоровья)</li>
  <li>Видео- и фотосъемка на Gopro (предоставляется MBL)</li>
  <li>Защитное снаряжение и оборудование для полета</li>
  <li>Страхование парапланеризма (максимальное покрытие 100 000 000 донгов)</li>
  <li>Питьевая вода, сертификат</li>
  <li>Без доплаты за продление полета; Без доплаты за полет с домашними животными</li>
  <li>Гибкое бронирование, бесплатная отмена</li>
</ul>

<h3>E. Политика бронирования/возврата/отмены</h3>
<ul>
  <li>Чем раньше вы бронируете, тем выше ваш приоритет. При бронировании в последнюю минуту в тот же день возможна перегрузка, и мы можем не успеть организовать полет. Бронирование за 3-5 дней позволяет лучше подготовиться и получить консультацию по выбору лучшего времени для полета.</li>
  <li>MBL не несет ответственности за возможность полета, если клиент бронирует слишком поздно.</li>
  <li>Все бронирования могут быть перенесены или отменены ГИБКО &amp; БЕСПЛАТНО.</li>
  <li>Расписание полетов может измениться или быть отменено внезапно из-за плохой погоды, неблагоприятного ветра или небезопасных условий полета. Это нежелательная ситуация. Клиенты получат приоритет на перенос/отмену бесплатно; однако клиентам, возможно, придется оплатить расходы, понесенные за частично использованные услуги.</li>
</ul>
  `.trim(),
};

// Logic dự phòng (không còn cần thiết nếu tất cả các ngôn ngữ đều đã được điền,
// nhưng có thể giữ lại để đảm bảo an toàn nếu một bản dịch nào đó vô tình bị xóa)
TERMS_HTML.en = TERMS_HTML.en || TERMS_HTML.vi;
TERMS_HTML.fr = TERMS_HTML.fr || TERMS_HTML.vi;
TERMS_HTML.ru = TERMS_HTML.ru || TERMS_HTML.vi;