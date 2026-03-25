import type { SelectFlightStepLocale } from "./types";
import { EN_SELECT_FLIGHT_LOCALE } from "./en";

export const RU_SELECT_FLIGHT_LOCALE: SelectFlightStepLocale = {
  ...EN_SELECT_FLIGHT_LOCALE,
  ui: {
    ...EN_SELECT_FLIGHT_LOCALE.ui,
    title: "Забронировать полёт",
    locationsTitle: "Выберите локацию для полёта",
    selectedLocationTitle: "Выбранная локация",
    serviceSectionTitle: "Выберите услуги полёта",
    selectFlightType: "Выберите тип полёта",
    chooseLocationPrompt:
      "Пожалуйста, выберите локацию, чтобы увидеть подробности.",
    chooseFlightTypePrompt:
      "Пожалуйста, выберите тип полёта, чтобы увидеть подробное описание.",
    choosePackagePrompt:
      "Пожалуйста, выберите вариант дня полёта, чтобы отобразить услуги.",
    noVisibleServices:
      "Для этого выбора сейчас нет доступных услуг.",
    guestsLabel: "Гости",
    flightPrice: "Цена полёта",
    optionalPrice: "Дополнительные услуги",
    totalPrice: "Итого",
    continue: "ПРОДОЛЖИТЬ",
    pickupLocationLabel: "Место встречи",
    pickupPointLabel: "Точка встречи",
    includedLabel: "Включено",
    excludedLabel: "Не включено",
    groupDiscountTitle: "Прямая скидка при групповой регистрации",
    freeGopro: "Стандартная запись полёта на Gopro",
    optionalServiceTitle: "Дополнительные услуги",
    fromLabel: "От",
    paraglidingTitle: "Параплан",
    paramotorTitle: "Парамотор",
    weekdayFlightTitle: "Полёты с понедельника по пятницу",
    weekendFlightTitle: "Полёты в сб, вс и праздники",
    khauPhaPromoTitle:
      "БЕСПЛАТНОЕ ПРОЖИВАНИЕ В MEBAYLUON CLUBHOUSE",
    khauPhaPromoSub:
      "(не действует в высокий сезон и в праздничные дни)",
    paramotorDiscountBefore: "Цена полёта ",
    paramotorDiscountAfter: " снижена до 2.390.000 VND",
    paraglidingDescription: [
      "Взлёт с вершины перевала Кхау Фа, одного из четырёх великих перевалов Вьетнама, на высоте 1268 м, и посадка в красивой долине Лим Монг среди террасных рисовых полей.",
      "Параплан без двигателя полностью зависит от ветра и даёт настоящее ощущение свободного полёта.",
    ],
    paramotorDescription: [
      "Парамотор взлетает из долины Лим Монг (в Clubhouse Mebayluon), поднимается к перевалу Кхау Фа и возвращается в исходную точку. Полёт длится примерно 10–25 минут.",
      "Поскольку полёт моторизован, он меньше зависит от ветра и позволяет подняться выше и увидеть уникальные ракурсы.",
    ],
    locationDescription: {
      ha_noi: [
        "Откройте для себя другой Ханой с высоты: горы, поля и загородные деревни на окраине города. Локация находится всего в 50 км к западу от центра Ханоя.",
        "Общее время тура: 3-5 часов (поездка одним днем)",
      ],
      khau_pha: [],
      sapa: [
        "Пролетите над долиной Лао Чай - Та Ван с величественными горами и знаменитыми террасными полями.",
      ],
      da_nang: [
        "Взлёт с вершины Бан Ко на горе Сон Тра на высоте 600 м.",
        "Наслаждайтесь панорамным видом на Дананг, море и реку Хан.",
      ],
      quan_ba: [
        "Испытайте уникальное ощущение свободного полёта и полюбуйтесь всем карстовым плато Хазянг с высоты.",
      ],
    },
    hanoiMountainWarning:
      "Пассажирам следует использовать специальный горный транспорт. Мы используем внедорожники SUV для обеспечения безопасности во время поездки.\nВнимание: горная дорога сложная, использование личного транспорта не рекомендуется.",
    daNangMountainWarning:
      "Рекомендуется использовать транспорт в гору для более гибкой и безопасной организации.",
    paraglidingNoPickupWarning:
      "ПРИМЕЧАНИЕ: Полёт не включает трансфер вверх/вниз по горе. Пожалуйста, приезжайте на точку старта за 15 минут до вылета.",
    paramotorNoPickupWarning:
      "ПРИМЕЧАНИЕ: Полёт не включает трансфер до точки вылета. Пожалуйста, приезжайте в Mebayluon Clubhouse за 15 минут до полёта.",
    quanBaPickupWarning:
      "Примечание: пассажирам рекомендуется использовать транспорт до горы для более быстрой и гибкой организации. Если вы добираетесь самостоятельно, пожалуйста, прибудьте за 15 минут до полёта.",
    selectedFlightLabel: "Выбранный полёт",
    selectedOptionsLabel: "Выбранные услуги",
    noOptionalSelected: "Дополнительные услуги не выбраны.",
    noMapInfo:
      "В Ха Джанге не отображаются координаты взлёта и посадки.",
    flycamDescription:
      "Панорамная съёмка долины и маршрута полёта. Исходное видео будет отправлено сразу после полёта.",
    camera360Description:
      "Впечатляющее 360° видео полёта. Смонтированное видео будет отправлено в течение 24 часов.",
    optionalServicesFlightLocation: "Место полёта: Дой Бу, Ханой",
    optionalServicesFixedPickupLocation: "Место посадки: Торговый центр GO! Тханг Лонг, Ханой",
    optionalServicesFixedPickupDeparture: "Отправление: ежедневно с 8:00 до 11:00 – точное время зависит от погоды и будет сообщено до дня полёта.",
    optionalServicesPrivatePickupNote1: "Стоимость трансфера может меняться в зависимости от местоположения отеля и количества гостей.",
    optionalServicesPrivatePickupNote2: "1–3 гостя: фиксированная цена 1.500.000 VND/машина.",
    optionalServicesPrivatePickupNote3: "Начиная с 4-го гостя: плюс 350.000 VND/чел.",
    optionalServicesMountainShuttleDesc: "Использование внедорожника от подножия горы (место посадки) до вершины горы (место взлёта).",
    optionalServicesSunsetDesc: "Полёт проводится с 16:30 до 17:30, чтобы поймать закат. Однако погода может меняться, и закат не всегда гарантирован. В случае отсутствия заката этот сбор будет возвращён.",
    optionalServicesFlycamNotice: "В месте полёта Дой Бу, Ханой, услуга флайкам/дрона иногда недоступна. НЕ ВОЛНУЙТЕСЬ, после бронирования мы подтвердим вам наличие услуги флайкам. Если она недоступна, сбор за флайкам будет возвращён на 100%.",
    groupGuestsSuffix: "гостей",
    perPersonWord: "чел.",
    carUnit: "машина",
    mapDoiBuLabel: "Место полёта: Дой Бу, Ханой - Открыть карту",
    mapVienNamLabel: "Vien Nam - Открыть карту",
    mapGoThangLongLabel: "Фиксированное место посадки из Ханоя: GO! Thang Long - Открыть карту",
    mapKhauPhaTakeoffLabel: "Вершина Khau Pha - Открыть карту",
    mapKhauPhaLandingLabel: "Посадка Clubhouse - Открыть карту",
    mapKhauPhaClubhouseLabel: "Clubhouse Mebayluon - Открыть карту",
    mapDaNangTakeoffLabel: "Вершина Son Tra - Открыть карту",
    mapDaNangLandingLabel: "Святилище Ngu Ong - Открыть карту",
    mapSapaTakeoffLabel: "Точка взлёта - Открыть карту",
    mapSapaLandingLabel: "Точка посадки - Открыть карту",
  },
  locationCards: {
    ha_noi: { title: "ХАНОЙ", subtitle: "Doi Bu - Vien Nam" },
    khau_pha: { title: "КХАУ ФА", subtitle: "Mu Cang Chai - Tu Le" },
    sapa: { title: "САПА", subtitle: "Lao Chai - Ta Van" },
    quan_ba: { title: "ХА ЗЯНГ", subtitle: "Quan Ba" },
    da_nang: { title: "ДАНАНГ", subtitle: "Son Tra" },
  },
};