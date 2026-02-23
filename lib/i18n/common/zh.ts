// lib/i18n/common/zh.ts
import type { CommonTranslation } from "./schema";

export const zh: CommonTranslation = {
  nav: {
    home: "首页",
    about: "关于我们",
    pilots: "飞行员",
    homestay: "民宿与咖啡馆",
    booking: "预订飞行",
    preNotice: "飞行前准备",
    contact: "联系我们",
    bookNow: "立即预订",
    login: "登录",
    blog: "资讯",
    store: "商店",
    knowledge: "学习滑翔伞",
  },
  hero: {
    title: "MEBAYLUON PARAGLIDING",
    subtitle: "飞越越南",
    description: "体验在越南云端自由翱翔的感觉",
    bookNow: "立即预订飞行",
    learnMore: "了解更多",
  },
  about: {
    title: "关于我们",
    subtitle: "Mebayluon Paragliding – 梦想起飞的地方",
    description: [
      "我们陪伴你完成每一次充满情绪与难忘的飞行。",
      "设备符合国际标准，确保绝对安全。",
      "我们是你每一次天空冒险的可靠伙伴。",
    ],
  },
  spots: {
    title: "热门飞行点",
    subtitle: "从高空探索越南之美，体验最佳飞行点",
    viewDetails: "查看详情",
    locations: {
      muongHoaSapa: {
        name: "芒华谷 - 沙坝",
        location: "沙坝，老街",
        description: "飞越美丽的芒华山谷",
        highlight: "俯瞰梯田与番西邦峰",
      },
      sonTra: {
        name: "山茶半岛",
        location: "岘港",
        description: "飞越山茶半岛",
        highlight: "岘港海岸全景视野",
      },
      khauPha: {
        name: "考帕山口",
        location: "安沛",
        description: "飞越雄伟的考帕山口",
        highlight: "西北“四大山口”之一，俯瞰梯田胜景",
      },
      tramTau: {
        name: "沾陶",
        location: "安沛",
        description: "飞越沐娄平原",
        highlight: "云雾缭绕之地",
      },
      vienNam: {
        name: "维恩南",
        location: "和平",
        description: "飞越沱江",
        highlight: "海拔1050米，靠近河内，可眺望沱江与巴维山",
      },
      doiBu: {
        name: "多伊布",
        location: "和平",
        description: "靠近河内的飞行点",
        highlight: "离首都很近",
      },
    },
  },
  features: {
    title: "为什么选择 Mebayluon？",
    safety: {
      title: "极限运动体验",
      description: "先进设备，经验丰富的飞行员",
    },
    professional: {
      title: "专业团队",
      description: "国际标准训练的飞行员团队",
    },
    experience: {
      title: "难忘体验",
      description: "不可复制的飞翔感受",
    },
    service: {
      title: "贴心服务",
      description: "24/7 客户支持",
    },
  },
  cta: {
    title: "准备好和我们一起飞了吗？",
    subtitle: "现在预订，体验从高空看越南",
    button: "立即预订",
  },
  preNotice: {
    title: "飞行前准备",
    subtitle: "请仔细阅读重要信息，让旅程更安全完整",
    preparation: {
      title: "飞行前准备",
      clothing: {
        title: "穿着",
        items: [
          "穿舒适运动装（长袖、长裤）；避免穿裙子",
          "鞋子：不要穿高跟鞋；建议运动鞋或登山鞋（需要时可免费借用）",
          "眼镜：可戴太阳镜防紫外线和强风（飞行时风速约30–40km/h），也可佩戴近视镜",
          "随身物品：可带1个小包（1–2kg）放手机、钥匙、证件等",
        ],
      },
      items: {
        title: "飞行流程",
        list: [
          "在起飞点认识飞行员，听取说明并提问",
          "穿戴装备，练习起飞动作",
          "按飞行员指示助跑起飞（用力、持续）",
          "升空后放松观景、聊天",
          "装备安全且舒适",
          "根据条件轻松降落，可站立或坐姿",
        ],
      },
    },
    posters: {
      title: "乘客条件与规定",
      subtitle: "",
    },
    requirements: {
      title: "乘客条件与规定",
      eligible: {
        title: "参与条件",
        items: [
          "体重：120kg 以下。超过95kg请提前告知以便安排合适飞行员与设备。",
          "体能：需具备基础体能、能短距离跑动；严重肥胖或严重行动不便者不适合。",
          "年龄：2岁以上",
        ],
      },
      notEligible: {
        title: "购票",
        items: [
          "可通过网站预订或联系热线/Zalo/WhatsApp",
          "支持现金、银行转账或信用卡支付",
          "我们将在收到预订后3小时内联系确认",
        ],
      },

      // ✅ BỔ SUNG để khớp schema + đồng bộ với EN/FR/RU
      special: {
        title: "特别说明",
        items: [
          "每次飞行：1 名乘客与 1 名专业飞行员同飞。飞行由飞行员全程控制，你只需放松欣赏风景，并在空中摆姿势拍摄美照/视频。",
          "3 岁以上儿童按 1 名独立乘客计算（不能与父母/亲属同飞，因为只有 1 个座位）。",
        ],
      },

      cancellation: {
        title: "取消飞行",
        byCompany: {
          title: "由 Mebayluon 取消",
          items: ["如天气不佳需取消", "客户无需支付费用", "100%退款，不收取任何手续费"],
        },
        byCustomer: {
          title: "客户取消",
          items: ["需通过邮箱/热线/Zalo/WhatsApp通知", "取消政策：提前1天取消免费"],
        },
        reschedule: {
          title: "客户改期",
          items: ["免费改期"],
        },
      },
    },
  },
  contact: {
    title: "联系我们",
    subtitle: "我们随时为你提供支持并解答疑问",
    connectTitle: "与我们联系",
    connectSubtitle: "选择最适合你的联系方式，我们 24/7 在线",
    contactNow: "立即联系",
    phone: "电话",
    support247: "24/7 支持",
    address: "办公室",
    workingHours: "工作时间",
    social: {
      facebook: "关注主页获取最新资讯",
      zalo: "通过 Zalo 直接聊天，快速咨询",
      whatsapp: "通过 WhatsApp 24/7 联系",
      youtube: "在 YouTube 观看滑翔伞视频",
      tiktokDescription: "关注 TikTok，观看精彩飞行视频！",
    },
  },
  pilots: {
    title: "飞行员团队",
    subtitle: "认识将陪你翱翔天空的专业飞行员",
    intro: {
      title: "专业 - 经验 - 用心",
      description:
        "我们的飞行员均按国际标准（APPI & IPPI）系统训练，拥有多年经验与大量飞行小时数，不仅技术扎实，也非常热情友好。",
    },
    viewProfile: "查看资料",
    nickname: "昵称",
    experience: "经验",
    flights: "飞行次数",
    hours: "飞行小时",
    contact: "联系",
    specialties: "专长",
    certificates: "证书",
    achievements: "成就",
    funFacts: "趣事",
    flyingStyle: "飞行风格",
    bookWithPilot: "选择该飞行员预订",
    gallery: "相册",
  },
  homestay: {
    badge: "MEBAYLUON CLUBHOUSE",
    title: "民宿与咖啡馆 - 滑翔伞降落场",
    slogan: "飞在天上 - 住在云里 - 在梯田间放松",
    callNow: "电话预订",
    viewLocation: "查看位置",
    intro: {
      title: "欢迎来到 Mebayluon Clubhouse",
      description:
        "位于图勒（Tú Lệ）附近，距离河内约250公里（车程约5小时）。民宿坐落于考帕山口脚下，也是滑翔伞降落场地之一。你可以一边品尝咖啡，一边欣赏彩色伞翼在天空滑翔。",
      location: "黄金位置",
      traditional: "传统高脚屋",
      traditionalDesc: "天然木材，更环保",
      cafe: "咖啡与餐厅",
      cafeDesc: "溪流与梯田景观",
    },
    rooms: {
      title: "房型",
      subtitle: "选择最适合你的房间",
      capacity: "容量",
      adults: "成人",
      children: "5岁以下儿童",
      bookNow: "立即预订",
      priceTypes: {
        "per-guest": "/人/晚",
        "per-room": "/间/晚",
        "whole-home": "/晚",
      },
      singleRoom: {
        name: "单人房",
        description: "2间房，最多1位成人+1位5岁以下儿童，含1张单人床垫",
      },
      coupleAttic: {
        name: "阁楼房",
        description: "1间大阁楼房，最多3位成人+2位5岁以下儿童",
      },
      doubleRoom: {
        name: "双人房",
        description: "2间大房，适合小家庭（2成人+2名5岁以下儿童），大双人床垫，溪流景",
      },
      dormitory: {
        name: "多人房",
        description: "1间大房，最多20张单人床垫/楼层",
      },
      wholeHomeSmall: {
        name: "整层",
        description: "整层公共空间含阁楼房，最多25位/层",
      },
      wholeHomeLarge: {
        name: "整栋",
        description: "整栋含双人房/单人房/阁楼房，最多35位",
      },
    },
    features: {
      breakfast: "含早餐",
      wifi: "免费 WiFi",
      view: "景观优美",
      "handmade-tea": "手工茶",
      "attic-view": "阁楼景观",
      "mountain-view": "山景",
      "family-friendly": "适合家庭",
      "shared-space": "共享空间",
      "budget-friendly": "经济实惠",
      "exclusive-use": "独享使用",
      "all-facilities": "设施齐全",
      "group-friendly": "适合团体",
      "large-group": "大型团体",
    },
    cafe: {
      title: "咖啡与美食",
      subtitle: "一楼咖啡-餐厅空间，可眺望溪流与梯田",
      categories: {
        drinks: "饮品",
        alcohol: "特色酒",
        food: "餐食",
      },
      specialNote: "可预订聚会",
      specialNoteDesc: "可接团体聚餐、团建、BBQ，也可使用厨房按需烹饪。",
    },
    amenities: {
      title: "设施与服务",
      subtitle: "咖啡-餐厅面向降落场、梯田、村落与清澈溪流的开阔景观",
      list: {
        "free-handmade-tea": "免费手工茶",
        "free-parking": "免费停车",
        "free-wifi": "免费 WiFi",
        "shared-bathroom": "共用浴室（3淋浴、4卫生间、6洗手台）",
        "bbq-area": "烧烤区",
        campfire: "篝火",
        karaoke: "卡拉OK",
        "swimming-pool": "溪水泳池",
        "camping-area": "露营区",
        "team-building-space": "团建场地 8000m²",
        "trekking-tours": "徒步行程",
        paragliding: "滑翔伞",
        "flycam-service": "航拍服务",
      },
    },
    location: {
      title: "位置与体验",
      description:
        "位于滑翔伞降落场与飞行员活动中心。你可以与飞行社群交流，并欣赏伞翼在天空盘旋。",
      address: "地址",
      fromHanoi: "从河内出发",
      nearby: "附近景点",
    },
    cta: {
      title: "准备好订房了吗？",
      subtitle: "立即联系获取咨询与优惠价格",
      bookOnline: "在线预订",
    },
  },
};