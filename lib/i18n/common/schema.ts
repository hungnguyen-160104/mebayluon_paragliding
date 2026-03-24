export type CommonTranslation = {
  nav: {
    home: string;
    about: string;
    pilots: string;
    homestay: string;
    booking: string;
    preNotice: string;
    contact: string;
    bookNow: string;
    login: string;
    blog: string;
    store: string;
    knowledge: string;
  };

  hero: {
    title: string;
    subtitle: string;
    description: string;
    bookNow: string;
    learnMore: string;
  };

  about: {
    title: string;
    subtitle: string;
    description: string[];
  };

  spots: {
    title: string;
    subtitle: string;
    viewDetails: string;
    locations: {
      muongHoaSapa: { name: string; location: string; area: string; description: string; highlight: string; duration: string };
      sonTra: { name: string; location: string; area: string; description: string; highlight: string; duration: string };
      khauPha: { name: string; location: string; area: string; description: string; highlight: string; duration: string };
      tramTau: { name: string; location: string; area: string; description: string; highlight: string; duration: string };
      vienNam: { name: string; location: string; area: string; description: string; highlight: string; duration: string };
      doiBu: { name: string; location: string; area: string; description: string; highlight: string; duration: string };
    };
  };

  features: {
    title: string;
    safety: { title: string; description: string };
    professional: { title: string; description: string };
    experience: { title: string; description: string };
    service: { title: string; description: string };
  };

  cta: {
    title: string;
    subtitle: string;
    button: string;
  };

  preNotice: {
    title: string;
    subtitle: string;

    preparation: {
      title: string;
      clothing: { title: string; items: string[] };
      items: { title: string; list: string[] };
    };

    posters: { title: string; subtitle: string };

    requirements: {
      title: string;

      eligible: { title: string; items: string[] };

      // tên "notEligible" đang dùng cho phần (Đặt vé / Not recommended if)
      notEligible: { title: string; items: string[] };

      // ✅ có trong EN/FR/RU file cũ
      special: { title: string; items: string[] };

      cancellation: {
        title: string;
        byCompany: { title: string; items: string[] };
        byCustomer: { title: string; items: string[] };
        reschedule: { title: string; items: string[] };
      };
    };
  };

  contact: {
    title: string;
    subtitle: string;
    connectTitle: string;
    connectSubtitle: string;
    contactNow: string;
    phone: string;
    support247: string;
    address: string;
    workingHours: string;
    social: {
      facebook: string;
      zalo: string;
      whatsapp: string;
      youtube: string;
      tiktokDescription: string;
    };
  };

  pilots: {
    title: string;
    subtitle: string;
    intro: { title: string; description: string };
    viewProfile: string;
    nickname: string;
    experience: string;
    flights: string;
    hours: string;
    contact: string;
    specialties: string;
    certificates: string;
    achievements: string;
    funFacts: string;
    flyingStyle: string;
    bookWithPilot: string;
    gallery: string;
  };

  homestay: {
    badge: string;
    title: string;
    slogan: string;
    callNow: string;
    viewLocation: string;

    intro: {
      title: string;
      description: string;
      location: string;
      traditional: string;
      traditionalDesc: string;
      cafe: string;
      cafeDesc: string;
    };

    rooms: {
      title: string;
      subtitle: string;
      capacity: string;
      adults: string;
      children: string;
      bookNow: string;

      priceTypes: {
        "per-guest": string;
        "per-room": string;
        "whole-home": string;
      };

      singleRoom: { name: string; description: string };
      coupleAttic: { name: string; description: string };
      doubleRoom: { name: string; description: string };
      dormitory: { name: string; description: string };
      wholeHomeSmall: { name: string; description: string };
      wholeHomeLarge: { name: string; description: string };
    };

    features: Record<string, string>;

    cafe: {
      title: string;
      subtitle: string;
      categories: { drinks: string; alcohol: string; food: string };
      specialNote: string;
      specialNoteDesc: string;
    };

    amenities: {
      title: string;
      subtitle: string;
      list: Record<string, string>;
    };

    location: {
      title: string;
      description: string;
      address: string;
      fromHanoi: string;
      nearby: string;
    };

    cta: {
      title: string;
      subtitle: string;
      bookOnline: string;
    };
  };
};