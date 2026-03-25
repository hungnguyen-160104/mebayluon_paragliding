import type { SelectFlightStepLocale } from "./types";
import { EN_SELECT_FLIGHT_LOCALE } from "./en";

export const VI_SELECT_FLIGHT_LOCALE: SelectFlightStepLocale = {
  ...EN_SELECT_FLIGHT_LOCALE,
  ui: {
    ...EN_SELECT_FLIGHT_LOCALE.ui,
    title: "Đặt chuyến bay",
    locationsTitle: "Vui lòng chọn điểm bay",
    selectedLocationTitle: "Điểm bay đã chọn",
    serviceSectionTitle: "Vui lòng chọn dịch vụ bay",
    selectFlightType: "Vui lòng chọn loại hình bay",
    chooseLocationPrompt: "Vui lòng chọn điểm bay để xem chi tiết.",
    chooseFlightTypePrompt: "Vui lòng chọn loại bay để xem mô tả chi tiết.",
    choosePackagePrompt: "Vui lòng chọn ngày bay để hiển thị dịch vụ.",
    noVisibleServices: "Hiện chưa có dịch vụ hiển thị cho lựa chọn này.",
    guestsLabel: "Số lượng",
    flightPrice: "Giá bay",
    optionalPrice: "Dịch vụ tùy chọn",
    totalPrice: "Tổng cộng",
    continue: "TIẾP TỤC",
    pickupLocationLabel: "Vị trí đón",
    pickupPointLabel: "Điểm đón",
    includedLabel: "Đã bao gồm",
    excludedLabel: "Không bao gồm",
    groupDiscountTitle: "Giảm giá theo nhóm",
    freeGopro: "Quay chuyến bay bằng Gopro tiêu chuẩn",
    optionalServiceTitle: "Dịch vụ tùy chọn",
    fromLabel: "Từ",
    paraglidingTitle: "Bay dù lượn không động cơ (paragliding)",
    paramotorTitle: "Bay dù lượn gắn động cơ (paramotor)",
    weekdayFlightTitle: "Ngày bay từ Thứ 2 - Thứ 6",
    weekendFlightTitle: "Ngày bay Thứ 7 - CN & Lễ",
    khauPhaPromoTitle:
      "NHẬN NGAY ƯU ĐÃI MIỄN PHÍ LƯU TRÚ TẠI CLUBHOUSE MEBAYLUON",
    khauPhaPromoSub: "(không áp dụng trong mùa cao điểm và các ngày lễ)",
    paramotorDiscountBefore: "Giá bay ",
    paramotorDiscountAfter: " giảm còn 2.390.000 đ",
    paraglidingDescription: [
      "Cất cánh từ đỉnh đèo Khau Pha - một trong Tứ đại Đỉnh đèo của Việt Nam, độ cao cất cánh 1.268m - Hạ cánh giữa danh thắng ruộng bậc thang Thung lũng Lìm Mông tuyệt đẹp. Đây là vào một trong những điểm bay dù lượn đẹp nhất thế giới với vẻ đẹp siêu thực.",
      "Dù lượn không động cơ bay hoàn toàn nhờ sức gió tự nhiên, mang đến cảm giác bay tự do đúng nghĩa. Khách bay được trải nghiệm cảm giác “nhảy dù” bằng chính đôi chân của mình và ngắm trọn Mùa vàng từ trên không.",
    ],
    paramotorDescription: [
      "Dù lượn gắn động cơ cất cánh từ thung lũng Lìm Mông (tại Mebayluon Clubhouse) độ cao 700m, bay ngược lên đỉnh đèo Khau Pha độ cao ~1.500m và quay trở lại điểm xuất phát. Chuyến bay dài từ 10-25 phút tùy sức khoẻ của khách ngắm trọn đèo Khau Pha, một trong Tứ đại Đỉnh đèo của Việt Nam và chiêm ngưỡng toàn cảnh danh thắng ruộng bậc thang Thung lũng Lìm Mông tuyệt đẹp, nơi được đánh giá “có vẻ đẹp siêu thực”.",
      "Chuyến bay có động cơ nên ít bị phụ thuộc vào gió, chủ động và dễ dàng lên cao kéo dài chuyến bay, giúp bạn khám phá những góc bay độc đáo mà dù lượn thông thường khó chạm tới.",
    ],
    locationDescription: {
      ha_noi: [
        "Khám phá một thành phố Hà Nội rất khác với trải nghiệm bay dù lượn từ trên cao, ngắm những ngọn núi trùng điệp và những làng quê ngoại ô thành phố. Điểm bay chỉ cách trung tâm Hà Nội 50km về phía Tây.",
        "Tổng thời gian tour: 3-5 tiếng (đi về trong ngày)",
      ],
      khau_pha: [],
      sapa: [
        "Bay trên thung lũng Lao Chải - Tả Van với cảnh quan núi đồi hùng vĩ và ruộng bậc thang đặc trưng vùng Tây Bắc.",
      ],
      da_nang: [
        "Cất cánh từ Đỉnh Bàn Cờ - núi Sơn Trà ở độ cao 600m.",
        "Trải nghiệm ngắm trọn TP Đà Nẵng với mặt biển bên dưới và phía trước là toàn cảnh thành phố cùng dòng sông Hàn uốn lượn. Đà Nẵng được đánh giá là điểm bay biển đẹp nhất Việt Nam.",
      ],
      quan_ba: [
        "Trải nghiệm cảm giác bay tự do độc đáo và ngắm toàn cảnh Cao Nguyên Đá Hà Giang từ độ cao hàng nghìn mét.",
        "Ấn tượng cực mạnh trên bầu trời Hà Giang!",
      ],
    },
    hanoiMountainWarning:
      "Hành khách nên sử dụng dịch vụ xe chuyên dụng lên núi. Chúng tôi dùng xe SUV offroad để đảm bảo an toàn khi di chuyển.\nCảnh báo: Đường lên núi khó đi, không khuyến khích sử dụng xe cá nhân tự lái.",
    daNangMountainWarning:
      "!!!! Quý khách nên sử dụng dịch vụ xe di chuyển lên núi để được sắp xếp nhanh chóng và linh hoạt nhất. Nếu tự di chuyển, không nên sử dụng xe máy tay ga vì lý do an toàn. Điểm cất cánh cách điểm hạ cánh 12km, đường đèo dốc vì vậy cần xe trung chuyển trước chuyến.",
    paraglidingNoPickupWarning:
      "LƯU Ý: Chuyến bay không bao gồm xe trung chuyển lên/xuống núi, quý khách vui lòng có mặt tại bãi cất cánh 15 phút trước giờ bay để làm thủ tục checkin.",
    paramotorNoPickupWarning:
      "LƯU Ý: Chuyến bay không bao gồm xe trung chuyển đến điểm bay, quý khách vui lòng có mặt tại Mebayluon Clubhouse 15 phút trước giờ bay để làm thủ tục checkin.",
    quanBaPickupWarning:
      "Lưu ý: Hành khách nên sử dụng dịch vụ xe di chuyển lên núi để được sắp xếp nhanh chóng và linh hoạt nhất. Nếu tự di chuyển, vui lòng có mặt tại điểm cất cánh trước 15 phút để làm thủ tục.",
    selectedFlightLabel: "Loại bay đã chọn",
    selectedOptionsLabel: "Dịch vụ đã chọn",
    noOptionalSelected: "Chưa chọn dịch vụ tùy chọn nào.",
    noMapInfo: "",
    flycamDescription:
      "Quay toàn cảnh thung lũng và hành trình bay, video gốc sẽ được gửi ngay sau chuyến bay.",
    camera360Description:
      "Quay toàn cảnh chuyến bay ấn tượng, video được edit và sẽ gửi trong vòng 24h.",
    optionalServicesFlightLocation: "Điểm bay: Đồi Bù, Hà Nội",
    optionalServicesFixedPickupLocation: "Điểm đón: TTTM GO! Thăng Long, Hà Nội",
    optionalServicesFixedPickupDeparture: "Xuất phát: 8:00am~11:00am hàng ngày – giờ chính xác tuỳ thời tiết, sẽ được thông báo trước ngày bay.",
    optionalServicesPrivatePickupNote1: "Chi phí đón có thể thay đổi tùy vị trí khách sạn và số lượng khách bay.",
    optionalServicesPrivatePickupNote2: "1–3 khách: đồng giá 1.500.000đ/xe.",
    optionalServicesPrivatePickupNote3: "Từ khách thứ 4 trở đi: cộng thêm 350.000đ/người.",
    optionalServicesMountainShuttleDesc: "Sử dụng xe SUV Offroad đi từ chân núi (bãi hạ cánh) lên đỉnh núi (bãi cất cánh).",
    optionalServicesSunsetDesc: "Chuyến bay được thực hiện trong khung giờ 16:30–17:30 để đón khoảnh khắc hoàng hôn. Nếu không có hoàng hôn như dự đoán, chi phí này sẽ được hoàn lại.",
    groupGuestsSuffix: "khách",
    perPersonWord: "người",
    carUnit: "xe",
    mapDoiBuLabel: "Điểm bay: Đồi Bù, Hà Nội - Xem bản đồ",
    mapVienNamLabel: "Viên Nam - Xem bản đồ",
    mapGoThangLongLabel: "Điểm đón cố định từ Hà Nội: TTTM GO! Thăng Long, Hà Nội - Xem bản đồ",
    mapKhauPhaTakeoffLabel: "Điểm cất cánh Đỉnh đèo Khau Phạ - Xem bản đồ",
    mapKhauPhaLandingLabel: "Điểm hạ cánh Clubhouse - Xem bản đồ",
    mapKhauPhaClubhouseLabel: "Clubhouse Mebayluon - Xem bản đồ",
    mapDaNangTakeoffLabel: "Điểm cất cánh Đỉnh Sơn Trà - Xem bản đồ",
    mapDaNangLandingLabel: "Điểm đón tiếp/Bãi hạ Miếu thờ Ngư Ông - Xem bản đồ",
    mapSapaTakeoffLabel: "Điểm cất cánh - Xem bản đồ",
    mapSapaLandingLabel: "Điểm hạ cánh - Xem bản đồ",
  },
  locationCards: {
    ha_noi: {
      title: "HÀ NỘI",
      subtitle: "Đồi Bù - Viên Nam",
    },
    khau_pha: {
      title: "ĐÈO KHAU PHẠ",
      subtitle: "Mù Cang Chải - Tú Lệ",
    },
    sapa: {
      title: "SAPA",
      subtitle: "Lao Chải - Tả Van",
    },
    quan_ba: {
      title: "HÀ GIANG",
      subtitle: "Quản Bạ",
    },
    da_nang: {
      title: "ĐÀ NẴNG",
      subtitle: "Bán đảo Sơn Trà",
    },
  },
};