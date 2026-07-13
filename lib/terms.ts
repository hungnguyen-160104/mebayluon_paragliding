// lib/terms.ts

export const TERM_LANGUAGES = [
  "vi",
  "en",
  "fr",
  "ru",
  "zh",
  "hi",
] as const;

export type LangCode = (typeof TERM_LANGUAGES)[number];

/**
 * Điều khoản và cam kết khi tham gia bay dù lượn.
 *
 * Ngôn ngữ hỗ trợ:
 * - vi: Tiếng Việt
 * - en: English
 * - fr: Français
 * - ru: Русский
 * - zh: 简体中文
 * - hi: हिन्दी
 */
export const TERMS_HTML: Record<LangCode, string> = {
  vi: `
<h1>ĐIỀU KHOẢN &amp; CAM KẾT KHI THAM GIA BAY DÙ LƯỢN</h1>

<section>
  <h2>1. ĐIỀU KIỆN THAM GIA BAY DÙ LƯỢN</h2>

  <p>
    Mục này quy định các điều kiện và nguyên tắc áp dụng đối với khách hàng
    khi đăng ký và tham gia hoạt động bay dù lượn.
  </p>

  <ul>
    <li>
      Dù lượn là môn thể thao ngoài trời mang tính trải nghiệm mạo hiểm.
      Dù vậy, bay dù lượn là một trong những trải nghiệm đáng có nhất trong
      cuộc đời. Hoạt động bay tự do chứa đựng những yếu tố rủi ro tự nhiên
      mà ngay cả khi phi công có đầy đủ kiến thức và kỹ năng cũng không thể
      loại trừ hoàn toàn 100%. Chuyến bay của quý khách được thực hiện bởi
      phi công đã được đào tạo chuyên nghiệp và có chứng nhận chuyên môn.
    </li>

    <li>
      Khách tham gia bay dù lượn cần có tình trạng sức khỏe phù hợp để tham
      gia hoạt động thể thao ngoài trời và không mắc các bệnh lý có thể gây
      nguy hiểm cho bản thân hoặc người khác như: động kinh, bệnh tim mạch
      nghiêm trọng, cao huyết áp không kiểm soát, rối loạn thần kinh, thường
      xuyên chóng mặt hoặc ngất, bệnh liên quan đến cột sống, xương khớp
      hoặc các bệnh lý phải sử dụng thuốc điều trị thường xuyên.
    </li>

    <li>
      Khách tham gia bay phải từ đủ 18 tuổi trở lên. Trường hợp dưới 18 tuổi
      cần có sự đồng ý của cha mẹ hoặc người giám hộ hợp pháp.
    </li>

    <li>
      Khi đăng ký và tham gia hoạt động bay, khách bay được hiểu là đã đọc,
      hiểu và chấp thuận các nội dung miễn trừ trách nhiệm sau:

      <ol>
        <li>
          Nhận thức rõ dù lượn là hoạt động có những rủi ro vốn có của thể
          thao trên không.
        </li>

        <li>
          Tự nguyện tham gia và chấp nhận những rủi ro có thể phát sinh
          trong quá trình hoạt động.
        </li>

        <li>
          Miễn trừ trách nhiệm đối với phi công, huấn luyện viên và đơn vị
          tổ chức đối với các sự cố phát sinh trong phạm vi những rủi ro
          tiềm ẩn của hoạt động bay.
        </li>

        <li>
          Cam kết không yêu cầu bồi thường hoặc khởi kiện nếu xảy ra tai
          nạn, sự cố gây thiệt hại về tài sản hoặc ảnh hưởng đến sức khỏe
          của bản thân.
        </li>

        <li>
          Tuân thủ đầy đủ hướng dẫn an toàn của phi công và nhân viên điều
          hành.
        </li>

        <li>
          Cam kết miễn trừ này có hiệu lực trong toàn bộ thời gian khách
          tham gia các hoạt động dù lượn do đơn vị tổ chức.
        </li>
      </ol>
    </li>

    <li>
      Khi bay, hành động chạy đà hoặc đáp đất có thể khiến khách trượt ngã,
      làm bẩn trang phục hoặc bị trầy xước. Vì vậy, khách vui lòng không mặc
      trang phục đắt tiền hoặc mang theo trang sức quý giá. Khách nên tự
      chuẩn bị quần áo dài tay, dễ vận động, có khả năng che chắn tốt và đi
      giày thể thao khi bay.
    </li>

    <li>
      Khách cam kết cung cấp đầy đủ và chính xác các thông tin khi tham gia
      bay, bao gồm: họ tên, ngày sinh, số giấy tờ tùy thân, cân nặng và tình
      trạng sức khỏe.
    </li>
  </ul>
</section>

<section>
  <h2>2. THỜI LƯỢNG BAY</h2>

  <p>
    Khách hiểu rằng dù lượn không gắn động cơ phụ thuộc hoàn toàn vào điều
    kiện gió. Thời lượng dự kiến trên không khoảng trên hoặc dưới 10 phút
    cho mỗi chuyến bay. Trường hợp khách bay bằng dù lượn gắn động cơ, thời
    lượng bay có thể được chủ động lựa chọn trong khoảng từ 10 đến 25 phút.
    Vì vậy, khách tham gia bay chấp nhận rằng:
  </p>

  <ul>
    <li>
      Thời lượng chuyến bay có thể ngắn hơn dự kiến trong điều kiện gió
      không thuận lợi.
    </li>

    <li>
      Trong điều kiện thời tiết tốt, thời lượng chuyến bay có thể được kéo
      dài miễn phí.
    </li>

    <li>
      Bay quá 15 phút có thể gây chóng mặt do sự thay đổi về áp suất và độ
      cao. Khách nên cân nhắc tình trạng sức khỏe của mình.
    </li>
  </ul>
</section>

<section>
  <h2>3. QUY TẮC SỬ DỤNG HÌNH ẢNH</h2>

  <p>
    Mục này giải thích cách hình ảnh và video được ghi lại trong quá trình
    bay có thể được sử dụng.
  </p>

  <ul>
    <li>
      Hình ảnh và video được ghi lại trong quá trình bay, bao gồm dữ liệu
      từ thiết bị GoPro hoặc các thiết bị ghi hình khác, sẽ được cung cấp
      cho khách hàng và có thể được đơn vị tổ chức sử dụng cho mục đích
      truyền thông, giới thiệu và quảng bá dịch vụ.
    </li>

    <li>
      Trường hợp không đồng ý cho đơn vị tổ chức sử dụng hình ảnh, khách vui
      lòng thông báo cho chúng tôi trước hoặc sau khi thực hiện chuyến bay.
    </li>
  </ul>
</section>

<section>
  <h2>4. QUY TẮC ĐỔI LỊCH VÀ HỦY BAY</h2>

  <p>
    Mục này quy định các điều kiện và nguyên tắc áp dụng đối với việc thay
    đổi lịch trình của khách hàng khi đăng ký và tham gia hoạt động bay dù
    lượn.
  </p>

  <p>
    Bay dù lượn là hoạt động phụ thuộc hoàn toàn vào điều kiện thời tiết,
    đặc biệt là gió và những điều kiện khách quan khác. Vì vậy, khi tham
    gia bay, khách hiểu và đồng ý rằng:
  </p>

  <ul>
    <li>
      Lịch bay có thể bị thay đổi, dời giờ hoặc hủy do thời tiết xấu, điều
      kiện gió không bảo đảm an toàn hoặc các yếu tố bất khả kháng khác.
      Trong những trường hợp này, khách có quyền đổi lịch hoặc hủy bay hoàn
      toàn miễn phí. Khách cũng được hỗ trợ đổi lịch hoặc hủy bay miễn phí
      trong các trường hợp bất khả kháng hợp lý khác.
    </li>

    <li>
      Trong một số ngày, thời tiết xấu có thể làm chậm lịch bay và dẫn đến
      tình trạng dồn khách. Khi đó, chuyến bay của khách có thể được sắp xếp
      lại mà không thể thông báo trước. Khách đồng ý với việc điều chỉnh
      lịch nhằm bảo đảm an toàn bay là ưu tiên cao nhất.
    </li>

    <li>
      Nếu khách hủy bay vì lý do cá nhân trong khi đã sử dụng một phần dịch
      vụ, ví dụ như bảo hiểm đã được kích hoạt, xe trung chuyển đã được sử
      dụng, đồ uống đã được cung cấp hoặc các dịch vụ khác đã phát sinh,
      khách đồng ý thanh toán đầy đủ những chi phí đã phát sinh.
    </li>

    <li>
      Nếu khách hủy hoặc đổi lịch vì lý do cá nhân, gây ảnh hưởng đến hoạt
      động bay, làm gián đoạn quá trình vận hành hoặc thay đổi kế hoạch đột
      ngột khi phi công và nhân sự đã sẵn sàng, khách phải chịu những chi
      phí phát sinh tương ứng. Khách chỉ được hoàn lại phần tiền còn lại
      sau khi đã trừ các chi phí hợp lý.
    </li>

    <li>
      Lịch bay được sắp xếp theo nguyên tắc “đặt trước, phục vụ trước”. Tại
      một số điểm bay, ví dụ điểm bay Đèo Khau Phạ, trong những ngày cao
      điểm có nhiều khách đặt bay tại chỗ, thứ tự bay sẽ được sắp xếp theo
      thời điểm khách đặt dịch vụ. Khách nên đặt lịch càng sớm càng tốt để
      được ưu tiên trong các đợt cao điểm.
    </li>
  </ul>
</section>

<section>
  <h2>5. QUY TẮC MANG THEO THÚ CƯNG VÀ VẬT DỤNG KHI BAY</h2>

  <h3>Mang theo thú cưng</h3>

  <p>Khách được phép mang theo thú cưng khi bay. Tuy nhiên:</p>

  <ul>
    <li>
      Khách tự chịu hoàn toàn trách nhiệm về sự an toàn của thú cưng.
    </li>

    <li>
      Thú cưng phải có dây đai hoặc vị trí cố định phù hợp và phải luôn
      trong tình trạng có thể kiểm soát.
    </li>

    <li>
      Đơn vị tổ chức và phi công không chịu trách nhiệm đối với bất kỳ rủi
      ro nào liên quan đến thú cưng.
    </li>

    <li>
      Phi công có quyền từ chối bay cùng thú cưng nếu xét thấy có yếu tố
      ảnh hưởng đến an toàn, bao gồm nhưng không giới hạn ở kích thước quá
      lớn, trọng lượng quá nặng, hành vi khó kiểm soát hoặc bất kỳ rủi ro
      tiềm ẩn nào khác.
    </li>
  </ul>

  <h3>Mang theo vật dụng cá nhân</h3>

  <p>
    Khách có thể mang theo điện thoại, kính râm, trang sức và các vật dụng
    cá nhân nhỏ khác. Tuy nhiên:
  </p>

  <ul>
    <li>
      Khách tự chịu trách nhiệm bảo quản tài sản cá nhân của mình.
    </li>

    <li>
      Đơn vị tổ chức không chịu trách nhiệm đối với việc tài sản bị mất,
      rơi hoặc hư hỏng.
    </li>

    <li>
      Những vật dụng quá khổ, có trọng lượng trên 3 kg hoặc gây cản trở an
      toàn bay có thể bị từ chối mang theo.
    </li>
  </ul>

  <h3>Đồ ăn, thức uống và tình trạng sức khỏe</h3>

  <p>
    Khách được phép mang theo và sử dụng đồ ăn, thức uống trong chuyến bay.
    Khách hiểu rằng:
  </p>

  <ul>
    <li>
      Việc sử dụng bia, rượu hoặc các loại đồ uống có cồn thuộc trách nhiệm
      cá nhân của khách.
    </li>

    <li>
      Nếu khách đang trong tình trạng say xỉn, mất kiểm soát hành vi hoặc
      có hành vi không phù hợp, khách có thể bị từ chối bay vì lý do an toàn
      và không được hoàn tiền trong trường hợp đó.
    </li>
  </ul>
</section>

<section>
  <h2>6. DỊCH VỤ ĐI KÈM: FLYCAM, CAMERA 360 VÀ GHI HÌNH</h2>

  <p>
    Mục này quy định các điều kiện áp dụng đối với dịch vụ quay phim, chụp
    ảnh và ghi hình.
  </p>

  <ul>
    <li>
      Khách có thể đăng ký thêm các dịch vụ đi kèm như quay Flycam, camera
      360 hoặc các hình thức ghi hình khác trong chuyến bay.
    </li>

    <li>
      Khách hiểu rằng hoạt động bay dù lượn diễn ra trong môi trường có
      gió, rung lắc và điều kiện tự nhiên phức tạp. Vì vậy:

      <ul>
        <li>
          Thiết bị ghi hình có thể gặp sự cố kỹ thuật, lỗi pin, mất tín
          hiệu, rung lắc ngoài khả năng kiểm soát hoặc các lỗi khác phát
          sinh trong quá trình bay.
        </li>

        <li>
          Trong một số trường hợp, sự cố chỉ được phát hiện sau khi chuyến
          bay kết thúc và không thể khắc phục kịp thời.
        </li>
      </ul>
    </li>

    <li>
      Nếu dịch vụ ghi hình không thể thực hiện hoặc không bảo đảm chất
      lượng do lỗi kỹ thuật ngoài ý muốn, khách đồng ý rằng:

      <ul>
        <li>
          Chi phí của dịch vụ ghi hình sẽ được hoàn lại 100%.
        </li>

        <li>
          Chi phí chuyến bay dù lượn sẽ không được hoàn lại vì hoạt động
          bay vẫn đã được thực hiện đầy đủ và bảo đảm an toàn.
        </li>
      </ul>
    </li>

    <li>
      Khách hiểu và đồng ý rằng an toàn bay luôn là ưu tiên cao nhất. Trong
      mọi trường hợp, việc xử lý sự cố kỹ thuật không được làm ảnh hưởng
      đến an toàn của chuyến bay.
    </li>

    <li>
      Dữ liệu từ GoPro hoặc Flycam thường có thể được cung cấp ngay sau
      chuyến bay và tải trực tiếp về điện thoại của khách. Dữ liệu từ
      camera 360 cần thêm thời gian để chỉnh sửa và xuất file, vì vậy sẽ
      được gửi trong vòng 24 giờ qua Zalo, Google Drive hoặc WhatsApp.
    </li>

    <li>
      Dịch vụ quay phim và chụp ảnh bằng GoPro do phi công hỗ trợ được cung
      cấp hoàn toàn miễn phí. Khách có thể được đề nghị cầm thiết bị trong
      một khoảng thời gian, ví dụ khi cất cánh, hạ cánh hoặc trong lúc bay.
      Khách không phải bồi thường nếu vô tình làm hỏng hoặc làm rơi thiết
      bị. Đồng thời, khách cũng không được yêu cầu bồi thường nếu dữ liệu
      hình ảnh hoặc video bị mất do thiết bị hỏng, bị rơi hoặc bị va đập
      trong quá trình bay.
    </li>
  </ul>
</section>
  `.trim(),

  en: `
<h1>TERMS &amp; CONDITIONS FOR PARAGLIDING PARTICIPATION</h1>

<section>
  <h2>1. CONDITIONS FOR PARAGLIDING PARTICIPATION</h2>

  <p>
    This section sets out the conditions and principles applicable to
    customers who register for and participate in paragliding activities.
  </p>

  <ul>
    <li>
      Paragliding is an outdoor adventure sport. Although it can be one of
      the most rewarding experiences in life, free flight involves inherent
      natural risks that cannot be completely eliminated, even when a pilot
      has extensive knowledge and skills. Your flight will be conducted by
      a professionally trained and appropriately certified pilot.
    </li>

    <li>
      Passengers must be in a suitable physical condition to participate in
      outdoor sporting activities. Passengers must not have medical
      conditions that could endanger themselves or others, including
      epilepsy, serious cardiovascular disease, uncontrolled high blood
      pressure, neurological disorders, frequent dizziness or fainting,
      spinal or joint conditions, or conditions requiring regular
      medication.
    </li>

    <li>
      Participants must be at least 18 years old. A participant under
      18 years old must have the consent of a parent or legal guardian.
    </li>

    <li>
      By registering for and participating in the flight, the Passenger is
      deemed to have read, understood and accepted the following liability
      waiver:

      <ol>
        <li>
          The Passenger acknowledges that paragliding involves risks
          inherent to aerial sports.
        </li>

        <li>
          The Passenger participates voluntarily and accepts the risks that
          may arise during the activity.
        </li>

        <li>
          The Passenger releases the pilot, instructor and organizing
          entity from liability for incidents arising within the scope of
          the inherent and foreseeable risks of the flight activity.
        </li>

        <li>
          The Passenger agrees not to demand compensation or initiate legal
          proceedings if an accident or incident causes damage to personal
          property or injury to the Passenger.
        </li>

        <li>
          The Passenger must fully comply with all safety instructions
          provided by the pilot and operating staff.
        </li>

        <li>
          This waiver remains effective throughout the Passenger's
          participation in paragliding activities organized by the
          organizing entity.
        </li>
      </ol>
    </li>

    <li>
      The takeoff run and landing may involve slipping or falling, which
      could soil clothing or cause minor abrasions. Passengers should not
      wear expensive clothing or bring valuable jewelry. Passengers should
      wear comfortable long-sleeved clothing that provides good coverage
      and sports shoes suitable for running.
    </li>

    <li>
      Passengers agree to provide complete and accurate information,
      including their full name, date of birth, identity document or
      passport number, weight and health condition.
    </li>
  </ul>
</section>

<section>
  <h2>2. FLIGHT DURATION</h2>

  <p>
    The Passenger understands that non-motorized paragliding depends
    entirely on wind conditions. Expected airtime is approximately
    10 minutes, although it may be shorter or longer. For motorized
    paragliding, the flight duration may be selected within a range of
    approximately 10 to 25 minutes. The Passenger therefore accepts that:
  </p>

  <ul>
    <li>
      The flight may be shorter than expected when wind conditions are
      unfavorable.
    </li>

    <li>
      In favorable weather conditions, the flight duration may be extended
      at no additional charge.
    </li>

    <li>
      Flying for more than 15 minutes may cause dizziness because of
      changes in altitude and air pressure. Passengers should take their
      health condition into consideration.
    </li>
  </ul>
</section>

<section>
  <h2>3. IMAGE AND VIDEO USAGE</h2>

  <p>
    This section explains how photographs and videos recorded during the
    flight may be used.
  </p>

  <ul>
    <li>
      Photographs and videos recorded during the flight, including footage
      captured with GoPro cameras or other recording equipment, will be
      provided to the Passenger and may also be used by the organizing
      entity for communication, marketing and promotional purposes.
    </li>

    <li>
      Passengers who do not consent to the use of their images should
      notify us before or after the flight.
    </li>
  </ul>
</section>

<section>
  <h2>4. RESCHEDULING AND CANCELLATION</h2>

  <p>
    This section sets out the conditions and principles applicable to
    schedule changes for customers registering for and participating in
    paragliding activities.
  </p>

  <p>
    Paragliding depends entirely on weather conditions, particularly wind,
    as well as other circumstances beyond our control. By participating,
    the Passenger understands and agrees that:
  </p>

  <ul>
    <li>
      The flight schedule may be changed, delayed, rescheduled or canceled
      because of bad weather, unsafe wind conditions or other force majeure
      events. In these circumstances, the Passenger may reschedule or
      cancel the flight free of charge. Free rescheduling or cancellation
      may also be offered in other reasonable force majeure circumstances.
    </li>

    <li>
      Bad weather may delay flights and cause a backlog of Passengers. In
      such circumstances, a Passenger's flight may be rescheduled without
      prior notice. The Passenger accepts schedule adjustments made to
      ensure that flight safety remains the highest priority.
    </li>

    <li>
      If the Passenger cancels for personal reasons after part of the
      service has already been used, including activated insurance, shuttle
      transportation, drinks or other services, the Passenger agrees to pay
      all costs already incurred.
    </li>

    <li>
      If the Passenger cancels or reschedules for personal reasons in a way
      that disrupts operations, or suddenly changes plans after the pilots
      and staff are ready, the Passenger must bear the corresponding
      reasonable costs. Only the remaining balance after deduction of those
      costs will be refunded.
    </li>

    <li>
      Flights are arranged on a “first booked, first served” basis. At
      certain sites, including Khau Pha Pass, peak days may involve a high
      number of on-site bookings. Flight order will therefore be based on
      the time at which the service was booked. Passengers are encouraged
      to book as early as possible to receive priority during peak periods.
    </li>
  </ul>
</section>

<section>
  <h2>5. PETS AND PERSONAL BELONGINGS</h2>

  <h3>Bringing pets</h3>

  <p>Passengers may bring pets on a flight. However:</p>

  <ul>
    <li>
      The Passenger is solely responsible for the safety of the pet.
    </li>

    <li>
      The pet must have an appropriate secure harness or restraint and must
      remain under control.
    </li>

    <li>
      The organizing entity and the pilot accept no responsibility for
      risks relating to the pet.
    </li>

    <li>
      The pilot has the right to refuse to fly with a pet when the pilot
      considers that the pet could affect safety, including but not limited
      to excessive size or weight, uncontrollable behavior or any other
      potential risk.
    </li>
  </ul>

  <h3>Personal belongings</h3>

  <p>
    Passengers may bring phones, sunglasses, jewelry and other small
    personal items. However:
  </p>

  <ul>
    <li>
      The Passenger is solely responsible for looking after personal
      belongings.
    </li>

    <li>
      The organizing entity is not responsible for items that are lost,
      dropped or damaged.
    </li>

    <li>
      Oversized or heavy items weighing more than 3 kg, or any item that
      interferes with flight safety, may not be permitted on the flight.
    </li>
  </ul>

  <h3>Food, drinks and health condition</h3>

  <p>
    Passengers may bring and consume food and drinks during the flight.
    The Passenger understands that:
  </p>

  <ul>
    <li>
      Consumption of beer, wine or other alcoholic beverages is at the
      Passenger's own responsibility.
    </li>

    <li>
      A Passenger who is intoxicated, unable to control their behavior or
      behaving inappropriately may be refused permission to fly for safety
      reasons and will not be entitled to a refund.
    </li>
  </ul>
</section>

<section>
  <h2>6. ADDITIONAL SERVICES: DRONE, 360 CAMERA AND RECORDING</h2>

  <p>
    This section sets out the terms applicable to photography and recording
    services.
  </p>

  <ul>
    <li>
      Passengers may purchase additional services such as drone filming,
      360-camera recording or other forms of photography and video
      recording during the flight.
    </li>

    <li>
      The Passenger understands that paragliding takes place in windy,
      unstable and complex natural conditions. Therefore:

      <ul>
        <li>
          Recording equipment may experience technical problems, battery
          failure, signal loss, uncontrolled movement or other problems
          during the flight.
        </li>

        <li>
          In some cases, a problem may only be discovered after the flight
          and may not be capable of being corrected in time.
        </li>
      </ul>
    </li>

    <li>
      If a recording service cannot be performed or does not meet an
      acceptable quality because of an unintended technical problem, the
      Passenger agrees that:

      <ul>
        <li>
          The recording-service fee will be refunded in full.
        </li>

        <li>
          The paragliding-flight fee will not be refunded because the
          flight itself was completed and conducted safely.
        </li>
      </ul>
    </li>

    <li>
      The Passenger understands and agrees that flight safety is always the
      highest priority. Technical troubleshooting must never interfere with
      the safe conduct of the flight.
    </li>

    <li>
      GoPro or drone files are normally available immediately after the
      flight and can be downloaded directly to the Passenger's phone.
      Files from a 360 camera require additional editing and export time
      and will therefore be delivered within 24 hours through Zalo,
      Google Drive or WhatsApp.
    </li>

    <li>
      GoPro filming and photography assisted by the pilot are provided free
      of charge. The Passenger may be asked to hold the equipment
      temporarily, for example during takeoff, landing or flight. The
      Passenger will not be required to compensate the organizing entity
      for accidental damage to or loss of the equipment. Correspondingly,
      the Passenger will not be entitled to compensation if photographs or
      videos are lost because the equipment is damaged, dropped, lost or
      impacted during the flight.
    </li>
  </ul>
</section>
  `.trim(),

  fr: `
<h1>CONDITIONS GÉNÉRALES ET ENGAGEMENTS POUR LA PARTICIPATION À UN VOL EN PARAPENTE</h1>

<section>
  <h2>1. CONDITIONS DE PARTICIPATION AU VOL EN PARAPENTE</h2>

  <p>
    La présente section définit les conditions et les principes applicables
    aux clients qui s'inscrivent et participent aux activités de parapente.
  </p>

  <ul>
    <li>
      Le parapente est une activité sportive de plein air à caractère
      aventureux. Bien qu'il puisse constituer l'une des expériences les
      plus mémorables d'une vie, le vol libre comporte des risques naturels
      inhérents qui ne peuvent pas être totalement éliminés, même lorsque
      le pilote possède des connaissances et des compétences approfondies.
      Votre vol sera effectué par un pilote professionnellement formé et
      disposant des certifications nécessaires.
    </li>

    <li>
      Les passagers doivent disposer d'un état de santé compatible avec une
      activité sportive de plein air. Ils ne doivent pas souffrir d'une
      maladie susceptible de les mettre en danger ou de mettre autrui en
      danger, notamment l'épilepsie, une maladie cardiovasculaire grave,
      une hypertension non contrôlée, un trouble neurologique, des vertiges
      ou évanouissements fréquents, une affection de la colonne vertébrale
      ou des articulations, ou une maladie nécessitant la prise régulière
      de médicaments.
    </li>

    <li>
      Les participants doivent être âgés d'au moins 18 ans. Un participant
      de moins de 18 ans doit obtenir l'autorisation de ses parents ou de
      son représentant légal.
    </li>

    <li>
      En s'inscrivant et en participant au vol, le passager est réputé
      avoir lu, compris et accepté la décharge de responsabilité suivante :

      <ol>
        <li>
          Le passager reconnaît que le parapente comporte des risques
          inhérents aux sports aériens.
        </li>

        <li>
          Le passager participe volontairement et accepte les risques
          pouvant survenir pendant l'activité.
        </li>

        <li>
          Le passager dégage le pilote, le moniteur et l'organisateur de
          toute responsabilité concernant les incidents relevant des
          risques inhérents et potentiels de l'activité de vol.
        </li>

        <li>
          Le passager s'engage à ne pas demander d'indemnisation ni engager
          de procédure judiciaire si un accident ou un incident provoque
          des dommages matériels ou porte atteinte à sa santé.
        </li>

        <li>
          Le passager doit respecter intégralement toutes les consignes de
          sécurité données par le pilote et le personnel d'exploitation.
        </li>

        <li>
          La présente décharge reste valable pendant toute la durée de la
          participation du passager aux activités de parapente organisées
          par l'organisateur.
        </li>
      </ol>
    </li>

    <li>
      La course au décollage et l'atterrissage peuvent entraîner une
      glissade ou une chute, salir les vêtements ou provoquer des
      égratignures. Il est donc déconseillé de porter des vêtements coûteux
      ou des bijoux de valeur. Le passager doit prévoir des vêtements à
      manches longues, confortables, couvrants et adaptés aux mouvements,
      ainsi que des chaussures de sport.
    </li>

    <li>
      Le passager s'engage à communiquer des informations complètes et
      exactes, notamment son nom complet, sa date de naissance, son numéro
      de pièce d'identité ou de passeport, son poids et son état de santé.
    </li>
  </ul>
</section>

<section>
  <h2>2. DURÉE DU VOL</h2>

  <p>
    Le passager comprend que le parapente non motorisé dépend entièrement
    des conditions de vent. Le temps de vol prévu est d'environ 10 minutes,
    avec une durée pouvant être inférieure ou supérieure. Dans le cas d'un
    parapente motorisé, la durée peut être choisie dans une plage
    approximative de 10 à 25 minutes. Le passager accepte donc que :
  </p>

  <ul>
    <li>
      La durée du vol puisse être inférieure aux prévisions lorsque les
      conditions de vent sont défavorables.
    </li>

    <li>
      Lorsque les conditions météorologiques sont favorables, la durée du
      vol puisse être prolongée sans supplément.
    </li>

    <li>
      Un vol de plus de 15 minutes puisse provoquer des vertiges en raison
      des variations d'altitude et de pression atmosphérique. Le passager
      doit tenir compte de son état de santé.
    </li>
  </ul>
</section>

<section>
  <h2>3. UTILISATION DES PHOTOGRAPHIES ET VIDÉOS</h2>

  <p>
    La présente section explique comment les photographies et vidéos
    enregistrées pendant le vol peuvent être utilisées.
  </p>

  <ul>
    <li>
      Les photographies et vidéos enregistrées pendant le vol, notamment
      celles réalisées avec une caméra GoPro ou tout autre appareil
      d'enregistrement, seront remises au passager et pourront également
      être utilisées par l'organisateur à des fins de communication, de
      présentation et de promotion.
    </li>

    <li>
      Si le passager ne consent pas à l'utilisation de son image, il doit
      nous en informer avant ou après le vol.
    </li>
  </ul>
</section>

<section>
  <h2>4. MODIFICATION, REPORT ET ANNULATION DU VOL</h2>

  <p>
    La présente section définit les conditions et les principes applicables
    aux modifications d'horaire concernant les clients inscrits aux
    activités de parapente.
  </p>

  <p>
    Le parapente dépend entièrement des conditions météorologiques,
    notamment du vent, ainsi que d'autres circonstances indépendantes de
    notre volonté. En participant au vol, le passager comprend et accepte
    que :
  </p>

  <ul>
    <li>
      L'horaire du vol puisse être modifié, retardé, reporté ou annulé en
      raison de mauvaises conditions météorologiques, d'un vent ne
      permettant pas de voler en sécurité ou d'un autre cas de force
      majeure. Dans ces situations, le passager peut reporter ou annuler
      gratuitement son vol. Un report ou une annulation sans frais peut
      également être accordé dans d'autres situations raisonnables de
      force majeure.
    </li>

    <li>
      De mauvaises conditions météorologiques puissent retarder les vols et
      provoquer une accumulation de passagers. Dans ce cas, le vol peut
      être reprogrammé sans préavis. Le passager accepte les modifications
      nécessaires afin que la sécurité du vol demeure la priorité absolue.
    </li>

    <li>
      Si le passager annule pour un motif personnel après avoir déjà utilisé
      une partie des services, notamment l'activation de l'assurance, le
      transport en navette, les boissons ou d'autres prestations, il
      accepte de régler l'intégralité des frais déjà engagés.
    </li>

    <li>
      Si le passager annule ou reporte son vol pour un motif personnel en
      perturbant l'organisation, ou change soudainement de programme alors
      que les pilotes et le personnel sont déjà prêts, il doit supporter
      les frais raisonnables correspondants. Seul le solde restant après
      déduction de ces frais pourra être remboursé.
    </li>

    <li>
      Les vols sont organisés selon le principe « première réservation,
      premier servi ». Sur certains sites, notamment au col de Khau Pha,
      les périodes de forte affluence peuvent comporter de nombreuses
      réservations effectuées sur place. L'ordre des vols sera alors
      déterminé selon l'heure de réservation. Il est recommandé de réserver
      le plus tôt possible afin de bénéficier d'une priorité pendant les
      périodes de pointe.
    </li>
  </ul>
</section>

<section>
  <h2>5. ANIMAUX DE COMPAGNIE ET EFFETS PERSONNELS</h2>

  <h3>Animaux de compagnie</h3>

  <p>
    Les passagers peuvent participer au vol avec un animal de compagnie.
    Toutefois :
  </p>

  <ul>
    <li>
      Le passager assume seul l'entière responsabilité de la sécurité de
      l'animal.
    </li>

    <li>
      L'animal doit disposer d'un harnais ou d'un système de fixation adapté
      et doit rester sous contrôle.
    </li>

    <li>
      L'organisateur et le pilote déclinent toute responsabilité concernant
      les risques liés à l'animal.
    </li>

    <li>
      Le pilote peut refuser de voler avec un animal s'il considère que
      celui-ci compromet la sécurité, notamment en raison de sa taille, de
      son poids, d'un comportement difficile à contrôler ou de tout autre
      risque potentiel.
    </li>
  </ul>

  <h3>Effets personnels</h3>

  <p>
    Les passagers peuvent emporter un téléphone, des lunettes de soleil,
    des bijoux et d'autres petits effets personnels. Toutefois :
  </p>

  <ul>
    <li>
      Le passager est seul responsable de la conservation de ses biens.
    </li>

    <li>
      L'organisateur n'est pas responsable des objets perdus, tombés ou
      endommagés.
    </li>

    <li>
      Les objets encombrants, pesant plus de 3 kg ou susceptibles de gêner
      la sécurité du vol peuvent être refusés.
    </li>
  </ul>

  <h3>Aliments, boissons et état de santé</h3>

  <p>
    Les passagers peuvent emporter et consommer des aliments et des
    boissons pendant le vol. Le passager comprend que :
  </p>

  <ul>
    <li>
      La consommation de bière, de vin ou de toute autre boisson alcoolisée
      relève de sa responsabilité personnelle.
    </li>

    <li>
      Un passager en état d'ivresse, incapable de contrôler son comportement
      ou ayant un comportement inapproprié peut être refusé pour des raisons
      de sécurité et ne pourra pas obtenir de remboursement.
    </li>
  </ul>
</section>

<section>
  <h2>6. SERVICES SUPPLÉMENTAIRES : DRONE, CAMÉRA 360 ET ENREGISTREMENT</h2>

  <p>
    La présente section définit les conditions applicables aux services de
    photographie et d'enregistrement vidéo.
  </p>

  <ul>
    <li>
      Le passager peut réserver des services supplémentaires, notamment une
      prise de vue par drone, une caméra 360 ou d'autres formes de
      photographie et d'enregistrement pendant le vol.
    </li>

    <li>
      Le passager comprend que le parapente se pratique dans un environnement
      exposé au vent, aux vibrations et à des conditions naturelles
      complexes. Par conséquent :

      <ul>
        <li>
          Le matériel d'enregistrement peut subir un problème technique,
          une défaillance de batterie, une perte de signal, des mouvements
          incontrôlables ou d'autres incidents pendant le vol.
        </li>

        <li>
          Dans certains cas, le problème ne peut être constaté qu'après le
          vol et ne peut pas être corrigé à temps.
        </li>
      </ul>
    </li>

    <li>
      Si le service d'enregistrement ne peut pas être réalisé ou si sa
      qualité n'est pas satisfaisante en raison d'un problème technique
      involontaire, le passager accepte que :

      <ul>
        <li>
          Les frais du service d'enregistrement soient intégralement
          remboursés.
        </li>

        <li>
          Le prix du vol en parapente ne soit pas remboursé, puisque le vol
          lui-même a été intégralement et correctement réalisé en toute
          sécurité.
        </li>
      </ul>
    </li>

    <li>
      Le passager comprend et accepte que la sécurité du vol demeure
      toujours la priorité absolue. La résolution d'un problème technique
      ne doit en aucun cas compromettre la sécurité du vol.
    </li>

    <li>
      Les fichiers GoPro ou drone sont généralement disponibles
      immédiatement après le vol et peuvent être téléchargés directement
      sur le téléphone du passager. Les fichiers provenant d'une caméra 360
      nécessitent davantage de temps pour le montage et l'exportation et
      seront envoyés dans un délai de 24 heures par Zalo, Google Drive ou
      WhatsApp.
    </li>

    <li>
      Le service de photographie et de vidéo GoPro assisté par le pilote est
      fourni gratuitement. Le passager peut être invité à tenir l'appareil
      temporairement, notamment au décollage, à l'atterrissage ou pendant le
      vol. Le passager ne devra verser aucune indemnisation en cas de
      dommage accidentel ou de perte de l'appareil. Réciproquement, le
      passager ne pourra demander aucune indemnisation en cas de perte des
      photographies ou vidéos due à la détérioration, la chute, la perte ou
      un choc subi par l'appareil pendant le vol.
    </li>
  </ul>
</section>
  `.trim(),

  ru: `
<h1>УСЛОВИЯ И ОБЯЗАТЕЛЬСТВА ПРИ УЧАСТИИ В ПОЛЕТЕ НА ПАРАПЛАНЕ</h1>

<section>
  <h2>1. УСЛОВИЯ УЧАСТИЯ В ПОЛЕТЕ НА ПАРАПЛАНЕ</h2>

  <p>
    В настоящем разделе изложены условия и правила, применяемые к клиентам,
    которые регистрируются и участвуют в полетах на параплане.
  </p>

  <ul>
    <li>
      Парапланеризм является приключенческим видом спорта на открытом
      воздухе. Хотя полет на параплане может стать одним из самых ярких
      впечатлений в жизни, свободный полет связан с естественными рисками,
      которые невозможно полностью исключить даже при наличии у пилота
      необходимых знаний и навыков. Ваш полет будет выполняться
      профессионально подготовленным пилотом, имеющим соответствующую
      квалификацию.
    </li>

    <li>
      Пассажир должен иметь состояние здоровья, позволяющее участвовать в
      спортивных мероприятиях на открытом воздухе. Пассажир не должен иметь
      заболеваний, которые могут представлять опасность для него самого или
      окружающих, включая эпилепсию, тяжелые сердечно-сосудистые
      заболевания, неконтролируемое высокое артериальное давление,
      неврологические расстройства, частые головокружения или обмороки,
      заболевания позвоночника или суставов, а также заболевания,
      требующие регулярного приема лекарств.
    </li>

    <li>
      Участнику должно быть не менее 18 лет. Для участника младше 18 лет
      требуется согласие родителей или законного представителя.
    </li>

    <li>
      Регистрируясь и принимая участие в полете, пассажир подтверждает, что
      прочитал, понял и принял следующие условия освобождения от
      ответственности:

      <ol>
        <li>
          Пассажир осознает, что парапланеризм связан с рисками, присущими
          воздушным видам спорта.
        </li>

        <li>
          Пассажир участвует добровольно и принимает риски, которые могут
          возникнуть во время мероприятия.
        </li>

        <li>
          Пассажир освобождает пилота, инструктора и организатора от
          ответственности за происшествия, возникшие в пределах
          естественных и потенциальных рисков полета.
        </li>

        <li>
          Пассажир обязуется не требовать компенсации и не предъявлять иск,
          если несчастный случай или происшествие повлечет повреждение
          имущества или причинение вреда его здоровью.
        </li>

        <li>
          Пассажир обязан полностью соблюдать все инструкции по
          безопасности, предоставленные пилотом и персоналом.
        </li>

        <li>
          Настоящее освобождение от ответственности действует в течение
          всего периода участия пассажира в мероприятиях по парапланеризму,
          организованных организатором.
        </li>
      </ol>
    </li>

    <li>
      Во время разбега при взлете или посадке пассажир может поскользнуться
      или упасть, испачкать одежду либо получить небольшие ссадины. Поэтому
      не рекомендуется надевать дорогую одежду или брать с собой ценные
      украшения. Следует надеть удобную закрытую одежду с длинными рукавами
      и спортивную обувь.
    </li>

    <li>
      Пассажир обязуется предоставить полную и достоверную информацию,
      включая имя и фамилию, дату рождения, номер удостоверения личности
      или паспорта, вес и сведения о состоянии здоровья.
    </li>
  </ul>
</section>

<section>
  <h2>2. ПРОДОЛЖИТЕЛЬНОСТЬ ПОЛЕТА</h2>

  <p>
    Пассажир понимает, что полет на немоторизованном параплане полностью
    зависит от ветра. Ожидаемое время в воздухе составляет примерно
    10 минут, но может быть короче или дольше. При полете на моторном
    параплане продолжительность может быть выбрана в диапазоне примерно от
    10 до 25 минут. Пассажир принимает следующие условия:
  </p>

  <ul>
    <li>
      Продолжительность полета может оказаться короче ожидаемой при
      неблагоприятном ветре.
    </li>

    <li>
      При благоприятных погодных условиях продолжительность полета может
      быть увеличена без дополнительной оплаты.
    </li>

    <li>
      Полет продолжительностью более 15 минут может вызвать головокружение
      из-за изменения высоты и атмосферного давления. Пассажиру следует
      учитывать состояние своего здоровья.
    </li>
  </ul>
</section>

<section>
  <h2>3. ИСПОЛЬЗОВАНИЕ ФОТОГРАФИЙ И ВИДЕО</h2>

  <p>
    В настоящем разделе разъясняется, как могут использоваться фотографии
    и видеозаписи, сделанные во время полета.
  </p>

  <ul>
    <li>
      Фотографии и видеозаписи, созданные во время полета, включая материалы
      с камеры GoPro или другого оборудования, будут предоставлены
      пассажиру и могут использоваться организатором в информационных,
      маркетинговых и рекламных целях.
    </li>

    <li>
      Если пассажир не согласен на использование своего изображения, он
      должен сообщить нам об этом до или после полета.
    </li>
  </ul>
</section>

<section>
  <h2>4. ПЕРЕНОС И ОТМЕНА ПОЛЕТА</h2>

  <p>
    В настоящем разделе изложены условия и правила изменения расписания для
    клиентов, зарегистрированных для участия в полете на параплане.
  </p>

  <p>
    Парапланеризм полностью зависит от погодных условий, особенно от ветра,
    а также от других обстоятельств, не зависящих от организатора.
    Участвуя в полете, пассажир понимает и соглашается со следующим:
  </p>

  <ul>
    <li>
      Расписание полета может быть изменено, полет может быть отложен,
      перенесен или отменен из-за плохой погоды, небезопасного ветра или
      других обстоятельств непреодолимой силы. В таких случаях пассажир
      может бесплатно перенести или отменить полет. Бесплатный перенос или
      отмена также могут предоставляться в иных разумных случаях
      непреодолимой силы.
    </li>

    <li>
      Плохая погода может привести к задержкам и скоплению ожидающих
      пассажиров. В таком случае полет может быть перенесен без
      предварительного уведомления. Пассажир принимает изменения
      расписания, необходимые для обеспечения максимальной безопасности.
    </li>

    <li>
      Если пассажир отменяет полет по личным причинам после того, как часть
      услуг уже была использована, включая активированную страховку,
      трансфер, напитки или иные услуги, пассажир обязуется полностью
      оплатить уже понесенные расходы.
    </li>

    <li>
      Если пассажир отменяет или переносит полет по личным причинам,
      нарушая работу организатора, либо внезапно меняет планы после того,
      как пилоты и персонал уже готовы, пассажир обязан оплатить
      соответствующие разумные расходы. Возвращается только остаток суммы
      после вычета таких расходов.
    </li>

    <li>
      Полеты организуются по принципу «кто раньше забронировал, тот
      обслуживается раньше». На некоторых площадках, включая перевал
      Кхау-Фа, в пиковые дни может быть много бронирований на месте.
      Очередность полетов определяется временем бронирования. Рекомендуется
      бронировать как можно раньше, чтобы получить приоритет в периоды
      высокой загрузки.
    </li>
  </ul>
</section>

<section>
  <h2>5. ДОМАШНИЕ ЖИВОТНЫЕ И ЛИЧНЫЕ ВЕЩИ</h2>

  <h3>Домашние животные</h3>

  <p>
    Пассажир может взять домашнее животное в полет. Однако:
  </p>

  <ul>
    <li>
      Пассажир самостоятельно несет полную ответственность за безопасность
      животного.
    </li>

    <li>
      Животное должно иметь подходящую страховочную систему или надежное
      крепление и находиться под контролем.
    </li>

    <li>
      Организатор и пилот не несут ответственности за риски, связанные с
      животным.
    </li>

    <li>
      Пилот вправе отказать в полете с животным, если считает, что оно может
      повлиять на безопасность, в том числе из-за чрезмерного размера или
      веса, неконтролируемого поведения либо любого другого потенциального
      риска.
    </li>
  </ul>

  <h3>Личные вещи</h3>

  <p>
    Пассажир может взять телефон, солнцезащитные очки, украшения и другие
    небольшие личные вещи. Однако:
  </p>

  <ul>
    <li>
      Пассажир самостоятельно отвечает за сохранность личных вещей.
    </li>

    <li>
      Организатор не несет ответственности за потерю, падение или
      повреждение вещей.
    </li>

    <li>
      Крупногабаритные предметы, предметы весом более 3 кг или предметы,
      мешающие безопасности полета, могут быть запрещены к перевозке.
    </li>
  </ul>

  <h3>Еда, напитки и состояние здоровья</h3>

  <p>
    Пассажир может брать с собой и употреблять еду и напитки во время
    полета. Пассажир понимает, что:
  </p>

  <ul>
    <li>
      Употребление пива, вина или других алкогольных напитков является
      личной ответственностью пассажира.
    </li>

    <li>
      Пассажиру, находящемуся в состоянии опьянения, не контролирующему свое
      поведение или ведущему себя ненадлежащим образом, может быть отказано
      в полете из соображений безопасности. В таком случае оплата не
      возвращается.
    </li>
  </ul>
</section>

<section>
  <h2>6. ДОПОЛНИТЕЛЬНЫЕ УСЛУГИ: ДРОН, КАМЕРА 360 И ВИДЕОСЪЕМКА</h2>

  <p>
    В настоящем разделе изложены условия оказания услуг фото- и видеосъемки.
  </p>

  <ul>
    <li>
      Пассажир может заказать дополнительные услуги, включая съемку с
      дрона, камеры 360 или другие виды фото- и видеосъемки во время полета.
    </li>

    <li>
      Пассажир понимает, что полет на параплане проходит в условиях ветра,
      тряски и сложной природной среды. Поэтому:

      <ul>
        <li>
          Оборудование может столкнуться с технической неисправностью,
          разрядом батареи, потерей сигнала, неконтролируемой тряской или
          иной проблемой во время полета.
        </li>

        <li>
          В некоторых случаях неисправность обнаруживается только после
          завершения полета и не может быть своевременно устранена.
        </li>
      </ul>
    </li>

    <li>
      Если услуга съемки не может быть оказана или ее качество не может
      быть обеспечено по причине непреднамеренной технической
      неисправности, пассажир соглашается со следующим:

      <ul>
        <li>
          Стоимость услуги съемки будет возвращена в полном объеме.
        </li>

        <li>
          Стоимость полета на параплане не возвращается, поскольку сам
          полет был полностью и безопасно выполнен.
        </li>
      </ul>
    </li>

    <li>
      Пассажир понимает и соглашается, что безопасность полета всегда
      является главным приоритетом. Устранение технических неполадок ни при
      каких обстоятельствах не должно влиять на безопасность полета.
    </li>

    <li>
      Файлы с GoPro или дрона обычно доступны сразу после полета и могут
      быть загружены непосредственно на телефон пассажира. Материалы с
      камеры 360 требуют дополнительного времени для обработки и экспорта,
      поэтому будут отправлены в течение 24 часов через Zalo, Google Drive
      или WhatsApp.
    </li>

    <li>
      Съемка с помощью GoPro при содействии пилота предоставляется
      бесплатно. Пассажира могут попросить временно держать устройство,
      например во время взлета, посадки или полета. Пассажир не обязан
      возмещать стоимость оборудования в случае его случайного повреждения
      или потери. В свою очередь, пассажир не вправе требовать компенсацию
      за потерю фотографий или видео вследствие повреждения, падения,
      потери или удара оборудования во время полета.
    </li>
  </ul>
</section>
  `.trim(),

  zh: `
<h1>滑翔伞飞行参与条款与承诺</h1>

<section>
  <h2>1. 参加滑翔伞飞行的条件</h2>

  <p>
    本节规定客户在报名和参加滑翔伞活动时适用的条件和原则。
  </p>

  <ul>
    <li>
      滑翔伞是一项具有冒险性质的户外运动。虽然滑翔伞飞行可能是人生中最值得体验的活动之一，
      但自由飞行包含无法完全消除的自然风险，即使飞行员具备丰富的知识和专业技能，也无法百分之百
      排除所有风险。您的飞行将由经过专业培训并持有相应资质的飞行员执行。
    </li>

    <li>
      参加滑翔伞飞行的客户必须具备适合参加户外体育活动的身体状况，不得患有可能危及本人或他人
      安全的疾病，包括癫痫、严重心血管疾病、未受控制的高血压、神经系统疾病、经常性头晕或昏厥、
      脊柱或关节疾病，以及需要长期或定期服药的疾病。
    </li>

    <li>
      参加者必须年满18周岁。未满18周岁的参加者必须获得父母或法定监护人的同意。
    </li>

    <li>
      客户报名并参加飞行活动，即视为已经阅读、理解并接受以下免责声明：

      <ol>
        <li>
          客户清楚认识到滑翔伞活动具有空中运动所固有的风险。
        </li>

        <li>
          客户自愿参加活动，并接受活动过程中可能产生的风险。
        </li>

        <li>
          对于属于飞行活动固有或潜在风险范围内发生的事故，客户同意免除飞行员、教练及组织单位的
          相关责任。
        </li>

        <li>
          如果事故或意外造成客户本人的财产损失或健康损害，客户承诺不要求赔偿或提起诉讼。
        </li>

        <li>
          客户必须完全遵守飞行员及现场工作人员提供的全部安全指示。
        </li>

        <li>
          本免责声明在客户参加组织单位安排的全部滑翔伞活动期间持续有效。
        </li>
      </ol>
    </li>

    <li>
      起飞助跑或着陆过程中可能发生滑倒或摔倒，导致衣物弄脏或轻微擦伤。因此，客户不应穿着昂贵
      衣物或携带贵重首饰。建议穿着便于活动、遮挡性良好的长袖衣物以及运动鞋。
    </li>

    <li>
      客户承诺提供完整、准确的个人信息，包括姓名、出生日期、身份证件或护照号码、体重及健康状况。
    </li>
  </ul>
</section>

<section>
  <h2>2. 飞行时长</h2>

  <p>
    客户理解，无动力滑翔伞飞行完全取决于风力条件。预计空中飞行时间约为10分钟，但实际时间可能
    更短或更长。使用动力滑翔伞时，飞行时间通常可在10至25分钟之间选择。因此，客户接受以下情况：
  </p>

  <ul>
    <li>
      在风力条件不佳时，实际飞行时间可能短于预计时间。
    </li>

    <li>
      在天气和风力条件良好时，飞行时间可能免费延长。
    </li>

    <li>
      飞行超过15分钟可能因高度及气压变化而引起头晕，客户应根据自身健康状况慎重考虑。
    </li>
  </ul>
</section>

<section>
  <h2>3. 图像及视频使用规则</h2>

  <p>
    本节说明飞行过程中拍摄的照片和视频可能被如何使用。
  </p>

  <ul>
    <li>
      飞行过程中拍摄的照片和视频，包括使用GoPro或其他录像设备拍摄的内容，将提供给客户，
      同时组织单位也可能将其用于宣传、推广及信息传播。
    </li>

    <li>
      如客户不同意组织单位使用其照片或视频，请在飞行前或飞行后通知我们。
    </li>
  </ul>
</section>

<section>
  <h2>4. 改期与取消飞行规则</h2>

  <p>
    本节规定客户报名及参加滑翔伞活动时，关于行程和飞行时间调整所适用的条件和原则。
  </p>

  <p>
    滑翔伞飞行完全依赖天气条件，尤其是风力以及其他客观因素。因此，客户参加飞行即表示理解并同意：
  </p>

  <ul>
    <li>
      因天气恶劣、风力不符合安全要求或其他不可抗力因素，飞行时间可能被更改、延迟、改期或取消。
      在这些情况下，客户可以免费改期或取消。发生其他合理的不可抗力情况时，也可获得免费改期或
      取消服务。
    </li>

    <li>
      恶劣天气可能导致飞行延误及客户积压。在这种情况下，客户的飞行可能在无法提前通知的情况下
      被重新安排。客户同意为确保飞行安全而进行必要的行程调整，飞行安全始终为最高优先事项。
    </li>

    <li>
      如果客户因个人原因取消飞行，且已经使用了部分服务，例如保险已激活、已使用接送车辆、
      已使用饮料或其他服务，客户同意支付全部已经产生的费用。
    </li>

    <li>
      如果客户因个人原因取消或改期，影响正常飞行及运营，或在飞行员和工作人员已经准备就绪后
      突然改变计划，客户应承担相应的合理费用。扣除上述费用后，仅退还剩余款项。
    </li>

    <li>
      飞行安排遵循“先预订、先服务”的原则。在部分飞行地点，例如Khau Pha山口飞行点，
      高峰日期可能有大量现场预订，飞行顺序将按照客户预订服务的时间安排。建议客户尽早预订，
      以便在高峰期获得优先安排。
    </li>
  </ul>
</section>

<section>
  <h2>5. 携带宠物及个人物品的规则</h2>

  <h3>携带宠物</h3>

  <p>客户可以在飞行时携带宠物，但必须遵守以下规定：</p>

  <ul>
    <li>
      客户对宠物的安全承担全部责任。
    </li>

    <li>
      宠物必须配备合适、安全的固定带或约束装置，并始终处于可控制状态。
    </li>

    <li>
      组织单位及飞行员不对任何与宠物有关的风险承担责任。
    </li>

    <li>
      如果飞行员认为宠物可能影响飞行安全，有权拒绝携带宠物飞行，包括但不限于宠物体型过大、
      重量过重、行为无法控制或存在其他潜在风险的情况。
    </li>
  </ul>

  <h3>携带个人物品</h3>

  <p>
    客户可以携带手机、太阳镜、首饰以及其他小型个人物品，但必须遵守以下规定：
  </p>

  <ul>
    <li>
      客户自行负责保管个人财物。
    </li>

    <li>
      组织单位不对物品遗失、掉落或损坏承担责任。
    </li>

    <li>
      体积过大、重量超过3公斤或可能妨碍飞行安全的物品可能会被拒绝携带。
    </li>
  </ul>

  <h3>食品、饮料及健康状况</h3>

  <p>
    客户可以在飞行过程中携带及食用食品和饮料。客户理解：
  </p>

  <ul>
    <li>
      饮用啤酒、葡萄酒或其他含酒精饮料属于客户个人责任。
    </li>

    <li>
      如果客户处于醉酒状态、无法控制行为或有不当行为，出于安全原因可能被拒绝飞行，
      且在此情况下不予退款。
    </li>
  </ul>
</section>

<section>
  <h2>6. 附加服务：无人机、360度相机及录像</h2>

  <p>
    本节规定摄影、摄像及录像服务所适用的条件。
  </p>

  <ul>
    <li>
      客户可以购买无人机拍摄、360度相机录像或其他飞行摄影及录像服务。
    </li>

    <li>
      客户理解滑翔伞飞行是在有风、晃动及复杂自然环境中进行的。因此：

      <ul>
        <li>
          录像设备在飞行过程中可能出现技术故障、电池问题、信号丢失、无法控制的晃动或其他故障。
        </li>

        <li>
          某些故障可能只有在飞行结束后才能被发现，且无法及时修复。
        </li>
      </ul>
    </li>

    <li>
      如果由于意外技术故障导致录像服务无法完成或无法保证质量，客户同意：

      <ul>
        <li>
          录像服务费用将全额退还。
        </li>

        <li>
          滑翔伞飞行费用不予退还，因为飞行本身已经完整并安全地完成。
        </li>
      </ul>
    </li>

    <li>
      客户理解并同意，飞行安全始终是最高优先事项。在任何情况下，技术故障处理都不得影响飞行安全。
    </li>

    <li>
      GoPro或无人机文件通常可在飞行结束后立即获得，并可直接下载至客户手机。360度相机文件需要
      更多时间进行编辑和导出，因此将在24小时内通过Zalo、Google Drive或WhatsApp发送。
    </li>

    <li>
      由飞行员协助进行的GoPro摄影和录像服务完全免费。客户可能会被要求在起飞、着陆或飞行期间
      暂时手持设备。客户无需对设备的意外损坏或遗失进行赔偿。相应地，如果照片或视频数据因设备
      损坏、掉落、遗失或飞行过程中的碰撞而丢失，客户也无权要求赔偿。
    </li>
  </ul>
</section>
  `.trim(),

  hi: `
<h1>पैराग्लाइडिंग में भाग लेने के नियम, शर्तें और प्रतिबद्धताएँ</h1>

<section>
  <h2>1. पैराग्लाइडिंग में भाग लेने की शर्तें</h2>

  <p>
    यह अनुभाग उन ग्राहकों पर लागू होने वाली शर्तों और नियमों को निर्धारित
    करता है जो पैराग्लाइडिंग गतिविधि के लिए पंजीकरण करते हैं और उसमें भाग
    लेते हैं।
  </p>

  <ul>
    <li>
      पैराग्लाइडिंग एक साहसिक प्रकृति वाला आउटडोर खेल है। यद्यपि
      पैराग्लाइडिंग जीवन के सबसे यादगार अनुभवों में से एक हो सकती है,
      मुक्त उड़ान में स्वाभाविक जोखिम होते हैं जिन्हें पायलट के पास व्यापक
      ज्ञान और कौशल होने के बावजूद पूरी तरह समाप्त नहीं किया जा सकता।
      आपकी उड़ान पेशेवर रूप से प्रशिक्षित और उपयुक्त प्रमाणपत्र रखने वाले
      पायलट द्वारा संचालित की जाएगी।
    </li>

    <li>
      यात्री का स्वास्थ्य आउटडोर खेल गतिविधि में भाग लेने के लिए उपयुक्त
      होना चाहिए। यात्री को ऐसी बीमारी नहीं होनी चाहिए जिससे स्वयं या
      अन्य लोगों को खतरा हो सकता है, जैसे मिर्गी, गंभीर हृदय रोग,
      अनियंत्रित उच्च रक्तचाप, तंत्रिका संबंधी विकार, बार-बार चक्कर आना या
      बेहोश होना, रीढ़ या जोड़ों से संबंधित बीमारी अथवा ऐसी बीमारी जिसके
      लिए नियमित रूप से दवा लेना आवश्यक हो।
    </li>

    <li>
      प्रतिभागी की आयु कम से कम 18 वर्ष होनी चाहिए। 18 वर्ष से कम आयु के
      प्रतिभागी को माता-पिता या कानूनी अभिभावक की अनुमति आवश्यक होगी।
    </li>

    <li>
      उड़ान के लिए पंजीकरण करने और उसमें भाग लेने पर यह माना जाएगा कि
      यात्री ने निम्नलिखित दायित्व-मुक्ति शर्तों को पढ़ा, समझा और स्वीकार
      किया है:

      <ol>
        <li>
          यात्री स्वीकार करता है कि पैराग्लाइडिंग में हवाई खेलों से जुड़े
          स्वाभाविक जोखिम होते हैं।
        </li>

        <li>
          यात्री स्वेच्छा से भाग लेता है और गतिविधि के दौरान उत्पन्न हो
          सकने वाले जोखिमों को स्वीकार करता है।
        </li>

        <li>
          यात्री उड़ान गतिविधि के स्वाभाविक और संभावित जोखिमों के अंतर्गत
          होने वाली घटनाओं के लिए पायलट, प्रशिक्षक और आयोजक को दायित्व से
          मुक्त करता है।
        </li>

        <li>
          यदि किसी दुर्घटना या घटना के कारण यात्री की संपत्ति को नुकसान
          पहुंचता है या उसके स्वास्थ्य को हानि होती है, तो यात्री मुआवजे
          की मांग नहीं करने और कानूनी कार्रवाई नहीं करने के लिए सहमत होता
          है।
        </li>

        <li>
          यात्री पायलट और संचालन कर्मचारियों द्वारा दिए गए सभी सुरक्षा
          निर्देशों का पूरी तरह पालन करेगा।
        </li>

        <li>
          यह दायित्व-मुक्ति आयोजक द्वारा आयोजित पैराग्लाइडिंग गतिविधियों
          में यात्री की भागीदारी की पूरी अवधि के दौरान लागू रहेगी।
        </li>
      </ol>
    </li>

    <li>
      उड़ान भरने के लिए दौड़ते समय या उतरते समय यात्री फिसल सकता है या गिर
      सकता है, जिससे कपड़े गंदे हो सकते हैं या मामूली खरोंच आ सकती है।
      इसलिए महंगे कपड़े या मूल्यवान आभूषण पहनने से बचें। आरामदायक, शरीर को
      अच्छी तरह ढकने वाले लंबी आस्तीन के कपड़े और खेल के जूते पहनें।
    </li>

    <li>
      यात्री अपना पूरा नाम, जन्मतिथि, पहचान-पत्र या पासपोर्ट नंबर, वजन और
      स्वास्थ्य स्थिति सहित सभी जानकारी सही और पूर्ण रूप से देने के लिए
      सहमत होता है।
    </li>
  </ul>
</section>

<section>
  <h2>2. उड़ान की अवधि</h2>

  <p>
    यात्री समझता है कि बिना मोटर वाली पैराग्लाइडिंग पूरी तरह हवा की स्थिति
    पर निर्भर करती है। अनुमानित हवाई अवधि लगभग 10 मिनट होती है, लेकिन यह
    कम या अधिक हो सकती है। मोटरयुक्त पैराग्लाइडिंग में उड़ान की अवधि
    सामान्यतः 10 से 25 मिनट के बीच चुनी जा सकती है। इसलिए यात्री स्वीकार
    करता है कि:
  </p>

  <ul>
    <li>
      प्रतिकूल हवा की स्थिति में उड़ान की अवधि अनुमान से कम हो सकती है।
    </li>

    <li>
      अनुकूल मौसम और हवा की स्थिति में उड़ान की अवधि बिना अतिरिक्त शुल्क
      के बढ़ाई जा सकती है।
    </li>

    <li>
      15 मिनट से अधिक उड़ान भरने पर ऊंचाई और वायुदाब में बदलाव के कारण
      चक्कर आ सकता है। यात्री को अपनी स्वास्थ्य स्थिति को ध्यान में रखना
      चाहिए।
    </li>
  </ul>
</section>

<section>
  <h2>3. फोटो और वीडियो के उपयोग के नियम</h2>

  <p>
    यह अनुभाग बताता है कि उड़ान के दौरान रिकॉर्ड किए गए फोटो और वीडियो का
    उपयोग किस प्रकार किया जा सकता है।
  </p>

  <ul>
    <li>
      उड़ान के दौरान रिकॉर्ड किए गए फोटो और वीडियो, जिनमें GoPro या अन्य
      रिकॉर्डिंग उपकरण से बनाई गई सामग्री शामिल है, यात्री को प्रदान किए
      जाएंगे और आयोजक द्वारा संचार, विपणन तथा प्रचार के उद्देश्य से उपयोग
      किए जा सकते हैं।
    </li>

    <li>
      यदि यात्री अपनी छवि या वीडियो के उपयोग से सहमत नहीं है, तो कृपया
      उड़ान से पहले या उड़ान के बाद हमें सूचित करें।
    </li>
  </ul>
</section>

<section>
  <h2>4. उड़ान का समय बदलने और रद्द करने के नियम</h2>

  <p>
    यह अनुभाग पैराग्लाइडिंग के लिए पंजीकरण करने वाले ग्राहकों की उड़ान
    अनुसूची में बदलाव से संबंधित शर्तों और नियमों को निर्धारित करता है।
  </p>

  <p>
    पैराग्लाइडिंग पूरी तरह मौसम, विशेष रूप से हवा, तथा अन्य नियंत्रण से
    बाहर परिस्थितियों पर निर्भर करती है। उड़ान में भाग लेकर यात्री समझता
    है और सहमत होता है कि:
  </p>

  <ul>
    <li>
      खराब मौसम, असुरक्षित हवा या अन्य अपरिहार्य परिस्थितियों के कारण उड़ान
      का समय बदला, विलंबित, पुनर्निर्धारित या रद्द किया जा सकता है। ऐसी
      स्थिति में यात्री उड़ान को बिना शुल्क पुनर्निर्धारित या रद्द कर सकता
      है। अन्य उचित अपरिहार्य परिस्थितियों में भी निःशुल्क पुनर्निर्धारण
      या रद्दीकरण दिया जा सकता है।
    </li>

    <li>
      खराब मौसम के कारण उड़ान में देरी और यात्रियों की भीड़ हो सकती है।
      ऐसी स्थिति में यात्री की उड़ान बिना पूर्व सूचना के पुनर्निर्धारित की
      जा सकती है। यात्री सहमत है कि उड़ान सुरक्षा को सर्वोच्च प्राथमिकता
      देने के लिए अनुसूची में आवश्यक बदलाव किए जा सकते हैं।
    </li>

    <li>
      यदि यात्री व्यक्तिगत कारण से उड़ान रद्द करता है और सेवा का कोई भाग
      पहले ही उपयोग किया जा चुका है, जैसे बीमा सक्रिय किया गया हो, शटल
      वाहन उपयोग किया गया हो, पेय प्रदान किए गए हों या अन्य सेवा दी गई हो,
      तो यात्री सभी उत्पन्न खर्चों का भुगतान करने के लिए सहमत होता है।
    </li>

    <li>
      यदि यात्री व्यक्तिगत कारण से उड़ान रद्द या पुनर्निर्धारित करता है और
      इससे संचालन प्रभावित होता है, या पायलट और कर्मचारी तैयार होने के
      बाद यात्री अचानक योजना बदलता है, तो यात्री संबंधित उचित खर्च वहन
      करेगा। इन खर्चों को घटाने के बाद केवल शेष राशि वापस की जाएगी।
    </li>

    <li>
      उड़ानें “पहले बुकिंग, पहले सेवा” के सिद्धांत पर व्यवस्थित की जाती
      हैं। Khau Pha Pass जैसे कुछ उड़ान स्थलों पर व्यस्त दिनों में मौके पर
      बड़ी संख्या में बुकिंग हो सकती हैं। उड़ान का क्रम बुकिंग के समय के
      आधार पर निर्धारित किया जाएगा। व्यस्त अवधि में प्राथमिकता प्राप्त
      करने के लिए यथासंभव जल्दी बुकिंग करने की सलाह दी जाती है।
    </li>
  </ul>
</section>

<section>
  <h2>5. पालतू जानवर और व्यक्तिगत सामान ले जाने के नियम</h2>

  <h3>पालतू जानवर ले जाना</h3>

  <p>यात्री उड़ान में पालतू जानवर ले जा सकता है। हालांकि:</p>

  <ul>
    <li>
      पालतू जानवर की सुरक्षा की पूरी जिम्मेदारी यात्री की होगी।
    </li>

    <li>
      पालतू जानवर के लिए उपयुक्त सुरक्षित हार्नेस या बंधन होना चाहिए और वह
      नियंत्रण में रहना चाहिए।
    </li>

    <li>
      आयोजक और पायलट पालतू जानवर से संबंधित किसी जोखिम के लिए जिम्मेदार
      नहीं होंगे।
    </li>

    <li>
      यदि पायलट को लगता है कि पालतू जानवर उड़ान सुरक्षा को प्रभावित कर
      सकता है, तो पायलट उसके साथ उड़ान से इनकार कर सकता है। इसमें अत्यधिक
      आकार या वजन, नियंत्रण से बाहर व्यवहार अथवा कोई अन्य संभावित जोखिम
      शामिल है, लेकिन यह सूची इन्हीं तक सीमित नहीं है।
    </li>
  </ul>

  <h3>व्यक्तिगत सामान</h3>

  <p>
    यात्री फोन, धूप का चश्मा, आभूषण और अन्य छोटे व्यक्तिगत सामान ले जा सकता
    है। हालांकि:
  </p>

  <ul>
    <li>
      व्यक्तिगत सामान की देखभाल की पूरी जिम्मेदारी यात्री की होगी।
    </li>

    <li>
      आयोजक सामान के खोने, गिरने या क्षतिग्रस्त होने के लिए जिम्मेदार नहीं
      होगा।
    </li>

    <li>
      बहुत बड़े सामान, 3 किलोग्राम से अधिक वजन वाले सामान या उड़ान सुरक्षा
      में बाधा डालने वाले सामान को ले जाने की अनुमति नहीं दी जा सकती।
    </li>
  </ul>

  <h3>भोजन, पेय और स्वास्थ्य स्थिति</h3>

  <p>
    यात्री उड़ान के दौरान भोजन और पेय ले जा सकता है तथा उनका सेवन कर सकता
    है। यात्री समझता है कि:
  </p>

  <ul>
    <li>
      बीयर, वाइन या अन्य मादक पेय का सेवन यात्री की व्यक्तिगत जिम्मेदारी
      है।
    </li>

    <li>
      यदि यात्री नशे में है, अपने व्यवहार पर नियंत्रण नहीं रखता या अनुचित
      व्यवहार करता है, तो सुरक्षा कारणों से उसे उड़ान की अनुमति नहीं दी
      जा सकती और ऐसी स्थिति में धनवापसी नहीं की जाएगी।
    </li>
  </ul>
</section>

<section>
  <h2>6. अतिरिक्त सेवाएँ: ड्रोन, 360 कैमरा और रिकॉर्डिंग</h2>

  <p>
    यह अनुभाग फोटो, वीडियो तथा अन्य रिकॉर्डिंग सेवाओं पर लागू शर्तों को
    निर्धारित करता है।
  </p>

  <ul>
    <li>
      यात्री उड़ान के दौरान ड्रोन वीडियो, 360 कैमरा रिकॉर्डिंग या अन्य
      फोटो और वीडियो सेवाएँ अतिरिक्त रूप से बुक कर सकता है।
    </li>

    <li>
      यात्री समझता है कि पैराग्लाइडिंग हवा, कंपन और जटिल प्राकृतिक
      परिस्थितियों में होती है। इसलिए:

      <ul>
        <li>
          रिकॉर्डिंग उपकरण में तकनीकी खराबी, बैटरी की समस्या, सिग्नल खोना,
          अनियंत्रित कंपन या उड़ान के दौरान अन्य समस्या हो सकती है।
        </li>

        <li>
          कुछ मामलों में समस्या का पता उड़ान समाप्त होने के बाद ही चलता
          है और उसे समय पर ठीक करना संभव नहीं होता।
        </li>
      </ul>
    </li>

    <li>
      यदि अनपेक्षित तकनीकी समस्या के कारण रिकॉर्डिंग सेवा पूरी नहीं हो
      सकती या उसकी गुणवत्ता सुनिश्चित नहीं की जा सकती, तो यात्री सहमत है
      कि:

      <ul>
        <li>
          रिकॉर्डिंग सेवा का पूरा शुल्क वापस किया जाएगा।
        </li>

        <li>
          पैराग्लाइडिंग उड़ान का शुल्क वापस नहीं किया जाएगा, क्योंकि उड़ान
          स्वयं पूरी और सुरक्षित रूप से संपन्न हुई है।
        </li>
      </ul>
    </li>

    <li>
      यात्री समझता है और सहमत है कि उड़ान सुरक्षा हमेशा सर्वोच्च
      प्राथमिकता है। तकनीकी समस्या का समाधान किसी भी परिस्थिति में उड़ान
      सुरक्षा को प्रभावित नहीं करना चाहिए।
    </li>

    <li>
      GoPro या ड्रोन की फाइलें सामान्यतः उड़ान के तुरंत बाद उपलब्ध होती
      हैं और यात्री के फोन पर सीधे डाउनलोड की जा सकती हैं। 360 कैमरे की
      फाइलों को संपादित और निर्यात करने में अतिरिक्त समय लगता है, इसलिए
      उन्हें 24 घंटे के भीतर Zalo, Google Drive या WhatsApp के माध्यम से
      भेजा जाएगा।
    </li>

    <li>
      पायलट की सहायता से GoPro द्वारा फोटो और वीडियो रिकॉर्डिंग निःशुल्क
      प्रदान की जाती है। यात्री को उड़ान भरते समय, उतरते समय या उड़ान के
      दौरान कुछ समय के लिए उपकरण पकड़ने के लिए कहा जा सकता है। उपकरण के
      गलती से क्षतिग्रस्त या खो जाने पर यात्री को उसका मुआवजा नहीं देना
      होगा। इसी प्रकार, उड़ान के दौरान उपकरण के क्षतिग्रस्त, गिरने, खोने
      या टकराने के कारण फोटो या वीडियो डेटा खो जाने पर यात्री मुआवजे का
      दावा नहीं कर सकेगा।
    </li>
  </ul>
</section>
  `.trim(),
};

/**
 * Trả về nội dung điều khoản theo ngôn ngữ.
 * Nếu mã ngôn ngữ không hợp lệ, hệ thống sử dụng tiếng Việt.
 */
export function getTermsHtml(language?: string | null): string {
  const normalizedLanguage = (language ?? "vi")
    .trim()
    .toLowerCase()
    .slice(0, 2);

  if (TERM_LANGUAGES.includes(normalizedLanguage as LangCode)) {
    return TERMS_HTML[normalizedLanguage as LangCode];
  }

  return TERMS_HTML.vi;
}