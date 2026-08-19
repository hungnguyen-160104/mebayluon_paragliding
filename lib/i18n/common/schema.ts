/** Nội dung một điểm bay dùng chung cho thẻ ở trang chủ và trang /spots. */
export type SpotLocationCopy = {
  name: string;
  location: string;
  duration: string;
  highlights: string[];
  summary: string;
  /**
   * Thế mạnh riêng, hiện thành dải chữ nổi bật trên thẻ điểm bay (trang chủ +
   * /spots) và ở hero trang chi tiết. Hiện chỉ Khau Phạ có — là nơi duy nhất
   * bay được cả dù lượn lẫn dù lượn gắn động cơ.
   */
  tagline?: string;
};

export type CommonTranslation = {
  nav: {
    home: string;
    about: string;
    spots: string;
    ppg: string;
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
    /**
     * Mỗi điểm bay chỉ còn 4 trường để không lặp thông tin trên thẻ:
     *  - name      : tên điểm bay (tiêu đề thẻ)
     *  - location  : tỉnh/thành, hiện ở nhãn góc trên bên trái
     *  - duration  : độ dài TOUR (đã kèm chữ "Tour" để khách không nhầm là
     *                thời gian bay trên không)
     *  - highlights: 2–3 điểm nhấn ngắn, hiện thành các chip ở trang chủ
     *  - summary   : mô tả ngắn cho thẻ ở trang /spots
     * Các trường cũ (area/description/highlight) đã bỏ vì trùng với name,
     * location và với chính nhau.
     */
    locations: {
      muongHoaSapa: SpotLocationCopy;
      sonTra: SpotLocationCopy;
      khauPha: SpotLocationCopy;
      tramTau: SpotLocationCopy;
      vienNam: SpotLocationCopy;
      doiBu: SpotLocationCopy;
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

      // Chính sách huỷ & đổi lịch bay — một danh sách phẳng, dùng chung
      // cho trang chủ và /pre-notice để tránh hai bản chính sách lệch nhau.
      cancellation: {
        title: string;
        items: string[];
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
    /** Ngày mở cửa, ví dụ "Thứ 2 - CN" / "Mon - Sun". */
    openDays: string;
    /** Địa chỉ văn phòng, tách 2 dòng để dịch được từng phần. */
    officeCity: string;
    officeProvince: string;
    social: {
      facebook: string;
      zalo: string;
      whatsapp: string;
      youtube: string;
      instagram: string;
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
      coupleAtticSingle: { name: string; description: string };
      coupleAtticDouble: { name: string; description: string };
      doubleRoom: { name: string; description: string };
      dormitory: { name: string; description: string };
      wholeHomeSmall: { name: string; description: string };
      wholeFloor: { name: string; description: string };
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