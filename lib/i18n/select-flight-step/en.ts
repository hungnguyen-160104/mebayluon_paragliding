import type { SelectFlightStepLocale } from "./types";

export const EN_SELECT_FLIGHT_LOCALE: SelectFlightStepLocale = {
  ui: {
    title: "Book your flight",
    locationsTitle: "Please choose a flying location",
    selectedLocationTitle: "Selected location",
    serviceSectionTitle: "Please choose flight services",
    selectFlightType: "Please choose the flight type",
    chooseLocationPrompt: "Please choose a location to view details.",
    chooseFlightTypePrompt:
      "Please choose a flight type to view the detailed description.",
    choosePackagePrompt:
      "Please choose a flight day option to display services.",
    noVisibleServices:
      "No services are currently available for this selection.",
    guestsLabel: "Guests",
    flightPrice: "Flight price",
    optionalPrice: "Optional services",
    totalPrice: "Total",
    pax: "pax",
    continue: "CONTINUE",
    pickupLocationLabel: "Pickup location",
    pickupPointLabel: "Pickup point",
    pickupPlaceholder: "................................",
    includedLabel: "Included",
    excludedLabel: "Not included",
    groupDiscountTitle: "Direct discount for group registration",
    freeGopro: "Standard Gopro flight recording",
    optionalServiceTitle: "Optional services",
    fromLabel: "From",
    paraglidingTitle: "Paragliding",
    paramotorTitle: "Paramotor",
    weekdayFlightTitle: "Flights from Monday to Friday",
    weekendFlightTitle: "Flights on Sat, Sun & Holidays",
    khauPhaPromoTitle: "FREE STAY PROMOTION AT MEBAYLUON CLUBHOUSE",
    khauPhaPromoSub: "(not applicable during peak season and holidays)",
    paramotorDiscountBefore: "Flight price ",
    paramotorDiscountAfter: " discounted to 2,390,000 VND",
    paraglidingDescription: [
      "Take off from the top of Khau Pha Pass - one of Vietnam’s four great mountain passes, at an altitude of 1,268m - and land in the stunning terraced rice fields of Lim Mong Valley. This is considered one of the most beautiful paragliding sites in the world with surreal scenery.",
      "Paragliding relies entirely on natural wind, offering the true feeling of free flight. Guests experience the sensation of 'sky running' with their own feet and enjoy the golden season from above.",
    ],
    paramotorDescription: [
      "The paramotor takes off from Lim Mong Valley (at Mebayluon Clubhouse) at 700m altitude, climbs back up toward Khau Pha Pass at around 1,500m, then returns to the starting point. The flight lasts around 10–25 minutes depending on the guest’s condition, offering panoramic views of Khau Pha Pass and Lim Mong Valley.",
      "Because it is motor-powered, this flight is less dependent on wind, more flexible, and can climb higher and stay longer, allowing you to explore unique aerial views that regular paragliding cannot easily reach.",
    ],
    locationDescription: {
      ha_noi: [
        "Discover a different side of Hanoi with a paragliding experience from above, overlooking layered mountains, fields, and countryside villages on the city outskirts. The flying site is only 50km west of Hanoi city center.",
        "Total tour time: 3-5 hours (day trip)",
      ],
      khau_pha: [],
      sapa: [
        "Fly above Lao Chai - Ta Van Valley with majestic mountain scenery and the iconic terraced rice fields of Vietnam’s northwest.",
      ],
      da_nang: [
        "Take off from Ban Co Peak on Son Tra Mountain at 600m altitude.",
        "Enjoy a full panoramic view of Da Nang City, the sea below, and the Han River winding through the city.",
      ],
      quan_ba: [
        "Enjoy the unique sensation of free flight and admire the entire Ha Giang Karst Plateau from high above.",
        "A truly impressive sky experience in Ha Giang.",
      ],
    },
    hanoiMountainWarning:
      "Passengers should use the dedicated mountain vehicle service. We use SUV off-road vehicles to ensure safety during the transfer.\nWarning: The mountain road is difficult; self-driving personal vehicles are not recommended.",
    daNangMountainWarning:
      "We strongly recommend using the mountain transfer service for faster and more flexible arrangements. If you travel by yourself, scooters are not recommended for safety reasons.",
    paraglidingNoPickupWarning:
      "NOTE: The flight does not include the mountain shuttle up/down. Please arrive at the take-off point 15 minutes before your flight for check-in.",
    paramotorNoPickupWarning:
      "NOTE: The flight does not include the transfer to the flying point. Please arrive at Mebayluon Clubhouse 15 minutes before your flight for check-in.",
    quanBaPickupWarning:
      "Note: Guests should use the transport service to the mountain for the fastest and most flexible arrangement. If traveling by yourself, please arrive at the take-off point 15 minutes early for check-in.",
    selectedFlightLabel: "Selected flight",
    selectedOptionsLabel: "Selected services",
    noOptionalSelected: "No optional service selected.",
    noMapInfo: "",
    flycamDescription:
      "Full valley and flight journey recording. Raw video will be sent right after the flight.",
    camera360Description:
      "Immersive 360 flight video. Edited video will be sent within 24 hours.",
    optionalServicesFlightLocation: "Flight location: Doi Bu, Hanoi",
    optionalServicesFixedPickupLocation: "Pickup point: GO! Thang Long Mall, Hanoi",
    optionalServicesFixedPickupDeparture: "Departure: 8:00am~11:00am daily – exact time depends on weather and will be notified before the flight date.",
    optionalServicesPrivatePickupNote1: "Pickup cost may vary depending on hotel location and number of guests.",
    optionalServicesPrivatePickupNote2: "1–3 guests: flat rate 1,500,000 VND/car.",
    optionalServicesPrivatePickupNote3: "From 4th guest onwards: add 350,000 VND/person.",
    optionalServicesMountainShuttleDesc: "Use an SUV Offroad vehicle from the mountain foot (landing zone) to the mountain top (take-off zone).",
    optionalServicesSunsetDesc: "The flight takes place between 16:30–17:30 to catch the sunset. If there is no sunset, this fee will be refunded.",
    groupGuestsSuffix: "guests",
    perPersonWord: "person",
    carUnit: "car",
    mapDoiBuLabel: "Flight location: Doi Bu, Hanoi - View map",
    mapVienNamLabel: "Vien Nam - View map",
    mapGoThangLongLabel: "Fixed pickup location from Hanoi: GO! Thang Long Mall - View map",
    mapKhauPhaTakeoffLabel: "Khau Pha summit - View map",
    mapKhauPhaLandingLabel: "Clubhouse landing - View map",
    mapKhauPhaClubhouseLabel: "Clubhouse Mebayluon - View map",
    mapDaNangTakeoffLabel: "Son Tra summit - View map",
    mapDaNangLandingLabel: "Ngu Ong shrine - View map",
    mapSapaTakeoffLabel: "Take-off point - View map",
    mapSapaLandingLabel: "Landing point - View map",
  },
  locationCards: {
    ha_noi: {
      title: "HANOI",
      subtitle: "Doi Bu - Vien Nam",
    },
    khau_pha: {
      title: "KHAU PHA PASS",
      subtitle: "Mu Cang Chai - Tu Le",
    },
    sapa: {
      title: "SAPA",
      subtitle: "Lao Chai - Ta Van",
    },
    quan_ba: {
      title: "HA GIANG",
      subtitle: "Quan Ba",
    },
    da_nang: {
      title: "DA NANG",
      subtitle: "Son Tra Peninsula",
    },
  },
};