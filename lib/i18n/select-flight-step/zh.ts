import type { SelectFlightStepLocale } from "./types";
import { EN_SELECT_FLIGHT_LOCALE } from "./en";

export const ZH_SELECT_FLIGHT_LOCALE: SelectFlightStepLocale = {
  ...EN_SELECT_FLIGHT_LOCALE,
  ui: {
    ...EN_SELECT_FLIGHT_LOCALE.ui,
    title: "预订飞行",
    locationsTitle: "请选择飞行地点",
    selectedLocationTitle: "已选地点",
    serviceSectionTitle: "请选择飞行服务",
    selectFlightType: "请选择飞行类型",
    chooseLocationPrompt: "请选择地点以查看详情。",
    chooseFlightTypePrompt: "请选择飞行类型以查看详细说明。",
    choosePackagePrompt: "请选择飞行日期选项以显示服务。",
    noVisibleServices: "当前所选内容暂无可显示服务。",
    guestsLabel: "人数",
    flightPrice: "飞行价格",
    optionalPrice: "可选服务",
    totalPrice: "总计",
    continue: "继续",
    pickupLocationLabel: "接送地点",
    pickupPointLabel: "接送点",
    includedLabel: "已包含",
    excludedLabel: "不包含",
    groupDiscountTitle: "团体报名立减",
    freeGopro: "标准 Gopro 飞行录像",
    optionalServiceTitle: "可选服务",
    fromLabel: "起",
    paraglidingTitle: "无动力滑翔伞",
    paramotorTitle: "动力伞",
    weekdayFlightTitle: "周一至周五飞行",
    weekendFlightTitle: "周六、周日及节假日飞行",
    khauPhaPromoTitle:
      "MEBAYLUON CLUBHOUSE 免费住宿优惠",
    khauPhaPromoSub: "（旺季和节假日不适用）",
    paramotorDiscountBefore: "飞行价格 ",
    paramotorDiscountAfter: " 优惠至 2,390,000 VND",
    paraglidingDescription: [
      "从考帕山口山顶起飞，海拔 1268 米，在风景壮丽的 Lim Mong 梯田谷降落。",
      "无动力滑翔伞完全依赖自然风，能够带来真正自由飞行的体验。",
    ],
    paramotorDescription: [
      "动力伞从 Lim Mong Valley（Mebayluon Clubhouse）起飞，飞向考帕山口高处，再返回起点，飞行时间约 10–25 分钟。",
      "由于带有发动机，这种飞行方式对风的依赖更小，更容易爬升到更高的位置，看到更多独特风景。",
    ],
    locationDescription: {
      ha_noi: [
        "从空中体验不一样的河内，俯瞰群山、田野与城市郊外村庄。飞行点距离河内市中心仅 50 公里。",
        "游览总时间：3-5 小时（当日往返）",
      ],
      khau_pha: [],
      sapa: [
        "飞越 Lao Chai - Ta Van 山谷，欣赏越南西北部标志性的梯田景观。",
      ],
      da_nang: [
        "从山茶山 Ban Co 峰起飞，海拔 600 米。",
        "欣赏岘港城市、海面与韩江的全景风光。",
      ],
      quan_ba: [
        "从高空俯瞰河江喀斯特高原，体验独特的自由飞行。",
      ],
    },
    hanoiMountainWarning:
      "乘客应使用专门的上山车辆服务。我们使用越野 SUV 车辆以确保接送期间的安全。\n警告：山路难行，不建议驾驶私家车。",
    daNangMountainWarning:
      "为获得更灵活和安全的安排，建议使用上山接送服务。",
    paraglidingNoPickupWarning:
      "注意：该飞行不包含上下山接驳。请于飞行前 15 分钟到达起飞点办理手续。",
    paramotorNoPickupWarning:
      "注意：该飞行不包含前往飞行点的接送。请于飞行前 15 分钟到达 Mebayluon Clubhouse 办理手续。",
    quanBaPickupWarning:
      "注意：建议乘客使用上山接送服务，以便更快、更灵活地安排。如果自行前往，请于飞行前 15 分钟到达起飞点。",
    selectedFlightLabel: "已选飞行",
    selectedOptionsLabel: "已选服务",
    noOptionalSelected: "尚未选择任何可选服务。",
    noMapInfo: "河江目前不显示起飞和降落坐标。",
    flycamDescription:
      "拍摄山谷和飞行路线的广角航拍视频，原始视频将在飞行结束后立即发送。",
    camera360Description:
      "拍摄令人惊艳的 360° 飞行视频，剪辑版将在 24 小时内发送。",
    optionalServicesFlightLocation: "飞行地点：河内 Đồi Bù",
    optionalServicesFixedPickupLocation: "接送点：河内 GO! Thang Long 购物中心",
    optionalServicesFixedPickupDeparture: "出发时间：每天 8:00am~11:00am – 确切时间取决于天气，并在飞行日前通知。",
    optionalServicesPrivatePickupNote1: "接送费用可能因酒店位置和乘客人数而异。",
    optionalServicesPrivatePickupNote2: "1-3 人：统一价 1,500,000 VND / 车。",
    optionalServicesPrivatePickupNote3: "从第 4 位乘客起：需加收 350,000 VND / 人。",
    optionalServicesMountainShuttleDesc: "使用越野 SUV 汽车从山脚（降落区）前往山顶（起飞区）。",
    optionalServicesSunsetDesc: "飞行在 16:30–17:30 之间进行，以欣赏日落。如果没有日落，该费用将被退还。",
    groupGuestsSuffix: "位客人",
    perPersonWord: "人",
    carUnit: "车",
    mapDoiBuLabel: "飞行地点：河内 Đồi Bù - 查看地图",
    mapVienNamLabel: "Viên Nam - 查看地图",
    mapGoThangLongLabel: "河内固定接送点：GO! Thang Long 购物中心 - 查看地图",
    mapKhauPhaTakeoffLabel: "考帕山口山顶 - 查看地图",
    mapKhauPhaLandingLabel: "Clubhouse 降落点 - 查看地图",
    mapKhauPhaClubhouseLabel: "Clubhouse Mebayluon - 查看地图",
    mapDaNangTakeoffLabel: "山茶山顶 - 查看地图",
    mapDaNangLandingLabel: "Ngu Ong 神庙 - 查看地图",
    mapSapaTakeoffLabel: "起飞点 - 查看地图",
    mapSapaLandingLabel: "降落点 - 查看地图",
  },
  locationCards: {
    ha_noi: { title: "河内", subtitle: "Đồi Bù - Viên Nam" },
    khau_pha: { title: "考帕山口", subtitle: "木江界 - 图勒" },
    sapa: { title: "沙坝", subtitle: "Lao Chai - Ta Van" },
    quan_ba: { title: "河江", subtitle: "管坝" },
    da_nang: { title: "岘港", subtitle: "山茶半岛" },
  },
};