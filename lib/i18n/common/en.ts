export type { CommonTranslation } from "./schema";
import type { CommonTranslation } from "./schema";

export const en: CommonTranslation = {
  nav: {
    home: "Home",
    about: "About Us",
    pilots: "Pilots",
    homestay: "Homestay & Café",
    booking: "Book a Flight",
    preNotice: "Before You Fly",
    contact: "Contact",
    bookNow: "Book Now",
    login: "Login",
    blog: "News",
    store: "Store",
    knowledge: "Learn Paragliding",
  },

  hero: {
    title: "MEBAYLUON PARAGLIDING",
    subtitle: "Fly Above Vietnam",
    description: "Experience the thrill of free flight above the skies of Vietnam",
    bookNow: "Book Your Flight Now",
    learnMore: "Learn More",
  },

  about: {
    title: "ABOUT US",
    subtitle: "Mebayluon Paragliding – where dreams of flight come true",
    description: [
      "We are proud to be the first professional paragliding operator in Vietnam, with the most experienced team of pilots in the country.",
      "We accompany you on every emotional and unforgettable flight.",
      "All of our equipment meets international standards, and we are committed to giving you the safest and most memorable free-flying experience possible.",
    ],
  },

  spots: {
    title: "FEATURED FLYING SPOTS",
    subtitle: "Discover the beauty of Vietnam from above at the best paragliding spots",
    viewDetails: "View Details",
    locations: {
      muongHoaSapa: {
        name: "Sapa",
        location: "Lao Cai",
        area: "Lao Chai, Ta Van",
        description: "Fly above Muong Hoa Valley and admire the terraced rice fields",
        highlight: "See the terraced fields and Fansipan Peak",
        duration: "90 minutes",
      },
      sonTra: {
        name: "Da Nang",
        location: "Da Nang",
        area: "Son Tra Peninsula",
        description: "Take in the panoramic view of Da Nang’s coastline",
        highlight: "Panoramic view of Da Nang’s sea",
        duration: "60 minutes",
      },
      khauPha: {
        name: "Mu Cang Chai, Tu Le",
        location: "Lao Cai",
        area: "Khau Pha Pass",
        description:
          "Fly over the majestic Khau Pha Pass, one of the four great mountain passes of Northwest Vietnam",
        highlight: "One of the four great mountain passes of the Northwest",
        duration: "60 minutes",
      },
      tramTau: {
        name: "Tram Tau",
        location: "Yen Bai, Lao Cai",
        area: "Muong Lo Field",
        description: "Fly above the vast Muong Lo field",
        highlight: "A land of floating white clouds",
        duration: "90 minutes",
      },
      vienNam: {
        name: "Ha Giang",
        location: "Ha Giang",
        area: "Quan Ba",
        description: "Admire the pristine rocky plateau of Northwest Vietnam",
        highlight: "Pristine rocky plateau",
        duration: "90 minutes",
      },
      doiBu: {
        name: "Doi Bu - Vien Nam",
        location: "Hanoi",
        area: "Doi Bu - Vien Nam",
        description: "A flying spot close to the capital city of Hanoi",
        highlight: "A flying site near the capital",
        duration: "180 minutes",
      },
    },
  },

  features: {
    title: "Why choose Mebayluon?",
    safety: {
      title: "Adventure Sport",
      description: "Modern equipment, highly experienced pilots",
    },
    professional: {
      title: "Professional",
      description: "Pilots trained to international standards",
    },
    experience: {
      title: "Amazing Experience",
      description: "An unforgettable paragliding sensation",
    },
    service: {
      title: "Dedicated Service",
      description: "24/7 customer support",
    },
  },

  cta: {
    title: "Ready to fly with us?",
    subtitle: "Book your tour today and experience Vietnam from above",
    button: "Book a Tour Now",
  },

  preNotice: {
    title: "Before You Fly",
    subtitle: "Please read the important information carefully for a safe and enjoyable flight",

    preparation: {
      title: "Before You Fly",

      clothing: {
        title: "What to Wear",
        items: [
          "Clothing: Wear comfortable sportswear (long sleeves and long pants); please do not wear skirts",
          "Shoes: Do not wear high heels; sports shoes or hiking shoes are recommended. Free shoe rental is available if needed",
          "Sunglasses: Wear sunglasses to protect against UV rays and strong wind (30–40 km/h during flight). Prescription glasses can also be worn",
          "Accessories: You may bring one small bag (1–2kg) for personal belongings such as your phone, keys, and ID documents",
        ],
      },

      items: {
        title: "Flight Process",
        list: [
          "At the takeoff point, meet your pilot, listen to the instructions, and ask any questions you may have",
          "Put on the flight gear and practice the takeoff movements",
          "Run strongly and continuously during takeoff as instructed by the pilot",
          "Relax, enjoy the scenery, and chat once you are in the air",
          "Flight equipment is safe and comfortable",
          "Landing is gentle; you may land standing or seated depending on conditions",
        ],
      },

      transport: {
        title: "Shuttle Service",
        items: [
          "Hotel pick-up and drop-off service is available according to your booking information.",
          "For accompanying guests who are not flying, please let us know the number in advance so we can arrange transport and quote the appropriate fee.",
        ],
      },
    },

    posters: {
      title: "PASSENGER TERMS & CONDITIONS",
      subtitle: "",
    },

    requirements: {
      title: "PASSENGER TERMS & CONDITIONS",

      eligible: {
        title: "Flight Eligibility",
        items: [
          "Weight: Under 120kg. If over 95kg, please inform us in advance so we can arrange a suitable pilot and equipment.",
          "Fitness: Basic physical condition is required, including the ability to run a short distance. Not suitable for passengers who are severely overweight or have serious mobility issues.",
          "Age: From 2 years old and above",
        ],
      },

      notEligible: {
        title: "Booking",
        items: [
          "Book directly through our website or contact us via hotline/Zalo/WhatsApp",
          "Payment can be made in cash, by bank transfer, or by credit card",
          "We will contact you within 03 hours after receiving your booking",
        ],
      },

      special: {
        title: "Special Notes",
        items: [
          "Each flight includes 01 passenger flying together with 01 professional pilot. The pilot controls the entire flight, so you only need to relax, enjoy the view, and pose for beautiful photos or videos in the air.",
          "Children over 3 years old are counted as 01 separate passenger and cannot fly together with a parent or relative because there is only one passenger seat.",
        ],
      },

      cancellation: {
        title: "Flight Cancellation",
        byCompany: {
          title: "Cancellation by Mebayluon Paragliding",
          items: [
            "In case of unfavorable weather conditions and the flight must be canceled",
            "The customer does not need to pay any cost",
            "The ticket will be refunded 100% with no additional fees",
          ],
        },
        byCustomer: {
          title: "Cancellation by Customer",
          items: [
            "Flight cancellation must be notified via email/hotline/Zalo/WhatsApp",
            "Cancellation policy: Free of charge if canceled at least 1 day in advance",
          ],
        },
        reschedule: {
          title: "Rescheduling by Customer",
          items: ["Flight rescheduling is free of charge"],
        },
      },
    },
  } as any,

  contact: {
    title: "CONTACT US",
    subtitle: "We are always ready to support you and answer all your questions",
    connectTitle: "Connect With Us",
    connectSubtitle:
      "Choose the contact channel that suits you best. We are available 24/7",
    contactNow: "Contact Now",
    phone: "Phone",
    support247: "24/7 Support",
    address: "Office",
    workingHours: "Working Hours",
    social: {
      facebook: "Follow our fanpage for the latest updates",
      zalo: "Chat with us directly on Zalo for quick support",
      whatsapp: "Contact us via WhatsApp 24/7",
      youtube: "Watch our paragliding videos on YouTube",
      tiktokDescription: "Follow our TikTok channel for unique paragliding videos!",
    },
  },

  pilots: {
    title: "Our Pilots",
    subtitle: "Meet the professional pilots who will accompany you in the sky",
    intro: {
      title: "Professional - Experienced - Dedicated",
      description:
        "All of our pilots are professionally trained to international standards (APPI & IPPI) and have many years of flying experience. They are not only among the most experienced paragliding pilots in Vietnam, but also enthusiastic companions on your journey.",
    },
    viewProfile: "View Profile",
    nickname: "Nickname",
    experience: "Experience",
    flights: "Flights",
    hours: "Flight Hours",
    contact: "Contact",
    specialties: "Specialties",
    certificates: "Certificates",
    achievements: "Achievements",
    funFacts: "Fun Facts",
    flyingStyle: "Flying Style",
    bookWithPilot: "Book with This Pilot",
    gallery: "Photo Gallery",
  },

  homestay: {
    badge: "CLUBHOUSE MEBAYLUON",
    title: "Homestay & Café - Paragliding Landing Zone",
    slogan: "Fly in the sky - rest in the clouds - chill among the rice terraces",
    callNow: "Call to Book",
    viewLocation: "View Location",
    intro: {
      title: "Welcome to Clubhouse MEBAYLUON",
      description:
        "Located in Lim Thai Village – Tu Le Commune – Lao Cai Province, about 250 km from Hanoi (around 5 hours by car), our charming homestay sits right at the foot of Khau Pha Pass – one of Vietnam’s famous “four great mountain passes.” It is the perfect stop for those who want to rest before conquering the 40+ km mountain route of Khau Pha Pass and fully exploring the majestic Tu Le - Mu Cang Chai road. Most notably, the homestay is located within the paragliding landing zone, so while enjoying a cup of coffee, you can watch colorful paragliders glide across the sky.",
      location: "Prime Location",
      traditional: "Traditional Stilt House",
      traditionalDesc: "Natural wooden materials, eco-friendly",
      cafe: "Café & Restaurant",
      cafeDesc: "Beautiful stream and terraced field view",
    },
    rooms: {
      title: "Room Types",
      subtitle: "Choose the room that best fits your needs",
      capacity: "Capacity",
      adults: "adults",
      children: "children under 5 years old",
      bookNow: "Book Now",
      priceTypes: {
        "per-guest": "/guest/night",
        "per-room": "/room/night",
        "whole-home": "/night",
      },
      singleRoom: {
        name: "Single Bed Room",
        description:
          "2 rooms available, maximum 1 adult and 1 child under 5 years old, including 1 single mattress",
      },
      coupleAtticSingle: {
        name: "Single Attic Room",
        description:
          "3 single attic rooms available, each room accommodates maximum 1 adult or 1 adult and 1 child under 5 years old",
      },
      coupleAtticDouble: {
        name: "Double Attic Room",
        description:
          "1 double attic room only, maximum 2 adults or 2 adults and 1 child under 5 years old",
      },
      doubleRoom: {
        name: "Double Bed Room",
        description:
          "2 large rooms, suitable for 1 small family (2 adults and 2 children under 5 years old), 1 large double mattress, stream view",
      },
      dormitory: {
        name: "Dormitory Room",
        description: "1 large room - up to 20 single mattresses/floor spots",
      },
      wholeHomeSmall: {
        name: "Family Room",
        description: "One large room for up to 5 people per room",
      },
      wholeHomeLarge: {
        name: "Entire Stilt House",
        description:
          "Includes the whole communal floor, double rooms, single rooms, and attic rooms. Capacity up to 35 guests",
      },
    },
    features: {
      "en-suite": "En-suite Bathroom",
      breakfast: "Breakfast Included",
      wifi: "Free WiFi",
      view: "Beautiful View",
      "handmade-tea": "Handmade Tea",
      "attic-view": "Attic Room",
      "mountain-view": "Mountain View",
      "family-friendly": "Family Friendly",
      "shared-space": "Shared Space",
      "budget-friendly": "Affordable",
      "exclusive-use": "Exclusive Use",
      "all-facilities": "Full Amenities",
      "group-friendly": "Group Friendly",
      "large-group": "Large Groups",
    },
    cafe: {
      title: "Café & Cuisine",
      subtitle:
        "Café - Restaurant space on the ground floor with a stream and terraced field view",
      categories: {
        drinks: "Drinks",
        alcohol: "Local Specialty Liquor",
        food: "Food",
      },
      specialNote: "Private Events Available",
      specialNoteDesc:
        "We accept bookings for group parties and team building events. Group BBQs are available, and our kitchen can also prepare meals on request.",
    },
    amenities: {
      title: "Amenities & Services",
      subtitle:
        "The Café – Restaurant space offers an open view overlooking the paragliding landing zone, terraced fields, ethnic villages, and a peaceful stream",
      list: {
        "free-handmade-tea": "Free handmade tea",
        "free-parking": "Free parking",
        "free-wifi": "Free WiFi",
        "shared-bathroom":
          "Shared bathroom facilities (3 showers, 4 toilets, 6 wash basins)",
        "bbq-area": "BBQ area",
        campfire: "Campfire",
        karaoke: "Karaoke",
        "swimming-pool": "Natural spring swimming pool",
        "camping-area": "Camping area",
        "team-building-space": "8000m² team building ground",
        "trekking-tours": "Trekking tours",
        paragliding: "Paragliding",
        "flycam-service": "Flycam photography",
      },
    },
    location: {
      title: "Location & Experience",
      description:
        "Located right at the paragliding landing zone - the center of professional pilot activities. Guests can connect with the flying community and watch colorful paragliders floating in the sky.",
      address: "Address",
      fromHanoi: "From Hanoi",
      nearby: "Nearby Places",
    },
    cta: {
      title: "Ready to book your stay?",
      subtitle: "Contact us now for advice and the best booking price",
      bookOnline: "Book Online",
    },
  },
};