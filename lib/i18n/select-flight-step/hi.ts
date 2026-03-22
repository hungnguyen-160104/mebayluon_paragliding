import type { SelectFlightStepLocale } from "./types";
import { EN_SELECT_FLIGHT_LOCALE } from "./en";

export const HI_SELECT_FLIGHT_LOCALE: SelectFlightStepLocale = {
  ...EN_SELECT_FLIGHT_LOCALE,
  ui: {
    ...EN_SELECT_FLIGHT_LOCALE.ui,
    title: "अपनी उड़ान बुक करें",
    locationsTitle: "कृपया उड़ान स्थान चुनें",
    selectedLocationTitle: "चुना गया स्थान",
    serviceSectionTitle: "कृपया उड़ान सेवाएँ चुनें",
    selectFlightType: "कृपया उड़ान प्रकार चुनें",
    chooseLocationPrompt: "विवरण देखने के लिए कृपया स्थान चुनें।",
    chooseFlightTypePrompt:
      "विस्तृत विवरण देखने के लिए कृपया उड़ान प्रकार चुनें।",
    choosePackagePrompt:
      "सेवाएँ देखने के लिए कृपया उड़ान-दिवस विकल्प चुनें।",
    noVisibleServices:
      "इस चयन के लिए अभी कोई सेवा उपलब्ध नहीं है।",
    guestsLabel: "यात्री",
    flightPrice: "उड़ान मूल्य",
    optionalPrice: "वैकल्पिक सेवाएँ",
    totalPrice: "कुल",
    continue: "आगे बढ़ें",
    pickupLocationLabel: "पिकअप स्थान",
    pickupPointLabel: "पिकअप पॉइंट",
    includedLabel: "शामिल",
    groupDiscountTitle: "ग्रुप रजिस्ट्रेशन पर सीधी छूट",
    freeGopro: "मानक Gopro उड़ान रिकॉर्डिंग",
    optionalServiceTitle: "वैकल्पिक सेवाएँ",
    fromLabel: "से",
    paraglidingTitle: "पैराग्लाइडिंग",
    paramotorTitle: "पैरामोटर",
    weekdayFlightTitle: "सोमवार से शुक्रवार उड़ान",
    weekendFlightTitle: "शनिवार, रविवार और अवकाश उड़ान",
    khauPhaPromoTitle:
      "MEBAYLUON CLUBHOUSE में मुफ्त ठहराव ऑफर",
    khauPhaPromoSub:
      "(पीक सीज़न और छुट्टियों में लागू नहीं)",
    paramotorDiscountBefore: "उड़ान मूल्य ",
    paramotorDiscountAfter: " घटाकर 2,390,000 VND",
    paraglidingDescription: [
      "Khau Pha Pass की चोटी से 1,268 मीटर की ऊँचाई पर टेकऑफ़ और Lim Mong Valley की खूबसूरत सीढ़ीनुमा घाटी में लैंडिंग का अनुभव लें।",
      "बिना इंजन वाली पैराग्लाइडिंग प्राकृतिक हवा पर आधारित होती है और वास्तविक मुक्त उड़ान का अनुभव देती है।",
    ],
    paramotorDescription: [
      "Paramotor उड़ान Lim Mong Valley (Mebayluon Clubhouse) से शुरू होकर Khau Pha की ओर ऊपर जाती है और फिर शुरुआती बिंदु पर लौटती है। उड़ान लगभग 10–25 मिनट की होती है।",
      "मोटर होने के कारण यह उड़ान हवा पर कम निर्भर होती है और अधिक ऊँचाई पर जाकर अलग नज़ारे दिखाती है।",
    ],
    locationDescription: {
      ha_noi: [
        "हनोई का एक अलग रूप आसमान से देखें — पहाड़, खेत और शहर के बाहर के गाँव।",
        "उड़ान स्थल हनोई शहर के केंद्र से केवल 50 किमी पश्चिम में है।",
      ],
      khau_pha: [],
      sapa: [
        "Lao Chai - Ta Van घाटी के ऊपर उड़ें और पश्चिमोत्तर वियतनाम के प्रसिद्ध सीढ़ीनुमा खेत देखें।",
      ],
      da_nang: [
        "Son Tra पर्वत के Ban Co Peak से 600 मीटर की ऊँचाई पर टेकऑफ़।",
        "Da Nang शहर, समुद्र और Han नदी का सुंदर पैनोरमिक दृश्य देखें।",
      ],
      quan_ba: [
        "Ha Giang के पूरे कार्स्ट पठार को ऊँचाई से देखने का अनोखा अनुभव लें।",
      ],
    },
    hanoiMountainWarning:
      "यात्रियों को समर्पित पर्वतीय वाहन सेवा का उपयोग करना चाहिए। हम यात्रा के दौरान सुरक्षा सुनिश्चित करने के लिए एसयूवी ऑफरोड वाहनों का उपयोग करते हैं।\nचेतावनी: पहाड़ी सड़क कठिन है, निजी वाहन स्वयं चलाने की अनुशंसा नहीं की जाती है।",
    daNangMountainWarning:
      "बेहतर व्यवस्था और सुरक्षा के लिए पहाड़ ट्रांसफ़र सेवा का उपयोग करना चाहिए।",
    paraglidingNoPickupWarning:
      "नोट: इस उड़ान में पहाड़ ऊपर/नीचे शटल शामिल नहीं है। कृपया चेक-इन के लिए 15 मिनट पहले टेकऑफ़ पॉइंट पर पहुँचें।",
    paramotorNoPickupWarning:
      "नोट: इस उड़ान में फ्लाइट पॉइंट तक ट्रांसफ़र शामिल नहीं है। कृपया Mebayluon Clubhouse में 15 मिनट पहले पहुँचें।",
    quanBaPickupWarning:
      "नोट: यात्रियों को तेज़ और लचीली व्यवस्था के लिए पहाड़ ट्रांसपोर्ट सेवा का उपयोग करना चाहिए। यदि आप स्वयं जाते हैं, तो कृपया उड़ान से 15 मिनट पहले पहुँचें।",
    selectedFlightLabel: "चुनी गई उड़ान",
    selectedOptionsLabel: "चुनी गई सेवाएँ",
    noOptionalSelected: "कोई वैकल्पिक सेवा चयनित नहीं है।",
    noMapInfo:
      "Ha Giang में टेकऑफ़ और लैंडिंग निर्देशांक प्रदर्शित नहीं किए जाते।",
    flycamDescription:
      "घाटी और उड़ान यात्रा की वाइड एरियल रिकॉर्डिंग। रॉ वीडियो उड़ान के तुरंत बाद भेजा जाएगा।",
    camera360Description:
      "उड़ान का प्रभावशाली 360° वीडियो। एडिटेड वीडियो 24 घंटे के भीतर भेजा जाएगा।",
    optionalServicesFlightLocation: "उड़ान स्थान: दोई बू, हनोई",
    optionalServicesFixedPickupLocation: "पिकअप पॉइंट: GO! थैंग लॉन्ग मॉल, हनोई",
    optionalServicesFixedPickupDeparture: "प्रस्थान: प्रतिदिन सुबह 8:00 से 11:00 बजे - सटीक समय मौसम पर निर्भर करता है और उड़ान के दिन से पहले सूचित किया जाएगा।",
    optionalServicesPrivatePickupNote1: "पिकअप लागत होटल के स्थान और यात्रियों की संख्या के आधार पर भिन्न हो सकती है।",
    optionalServicesPrivatePickupNote2: "1–3 यात्री: फ्लैट रेट 1,500,000 VND / कार।",
    optionalServicesPrivatePickupNote3: "चौथे यात्री से: 350,000 VND / व्यक्ति अतरिक्त।",
    optionalServicesMountainShuttleDesc: "पहाड़ की तलहटी (लैंडिंग ज़ोन) से पहाड़ की चोटी (टेक-ऑफ़ ज़ोन) तक एसयूवी ऑफरोड वाहन का उपयोग करें।",
    optionalServicesSunsetDesc: "उड़ान सूर्यास्त पकड़ने के लिए 16:30–17:30 के बीच होती है। हालाँकि, मौसम बदल सकता है और सूर्यास्त की हमेशा गारंटी नहीं होती है। यदि सूर्यास्त नहीं होता है, तो यह शुल्क वापस कर दिया जाएगा।",
    optionalServicesFlycamNotice: "दोई बू, हनोई उड़ान स्थल पर, फ्लाईकैम/ड्रोन सेवा कभी-कभी अनुपलब्ध हो सकती है। चिंता न करें, बुकिंग के बाद हम पुष्टि करेंगे कि फ्लाईकैम उपलब्ध है या नहीं। यदि अनुपलब्ध है, तो फ्लाईकैम शुल्क 100% वापस कर दिया जाएगा।",
    groupGuestsSuffix: "यात्री",
    perPersonWord: "व्यक्ति",
    carUnit: "कार",
    mapDoiBuLabel: "उड़ान स्थान: दोई बू, हनोई - मैप देखें",
    mapVienNamLabel: "Vien Nam - मैप देखें",
    mapGoThangLongLabel: "हनोई से निश्चित पिकअप स्थान: GO! थैंग लॉन्ग मॉल - मैप देखें",
    mapKhauPhaTakeoffLabel: "Khau Pha शिखर - मैप देखें",
    mapKhauPhaLandingLabel: "Clubhouse लैंडिंग - मैप देखें",
    mapKhauPhaClubhouseLabel: "Clubhouse Mebayluon - मैप देखें",
    mapDaNangTakeoffLabel: "Son Tra शिखर - मैप देखें",
    mapDaNangLandingLabel: "Ngu Ong shrine - मैप देखें",
    mapSapaTakeoffLabel: "टेकऑफ़ पॉइंट - मैप देखें",
    mapSapaLandingLabel: "लैंडिंग पॉइंट - मैप देखें",
  },
  locationCards: {
    ha_noi: { title: "हनोई", subtitle: "Doi Bu - Vien Nam" },
    khau_pha: { title: "खाउ फ़ा", subtitle: "Mu Cang Chai - Tu Le" },
    sapa: { title: "सापा", subtitle: "Lao Chai - Ta Van" },
    quan_ba: { title: "हा जियांग", subtitle: "Quan Ba" },
    da_nang: { title: "दा नांग", subtitle: "Son Tra" },
  },
};