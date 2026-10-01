// lib/legal-entity.ts
/**
 * Thông tin pháp lý của đơn vị cung cấp dịch vụ.
 *
 * Nghị định 52/2013/NĐ-CP (sửa đổi bởi 85/2021/NĐ-CP) buộc website bán hàng
 * hoá/dịch vụ phải công bố tên, địa chỉ, mã số thuế và thông tin liên hệ của
 * thương nhân. Với ngành nghề kinh doanh CÓ ĐIỀU KIỆN — kinh doanh hoạt động
 * thể thao mạo hiểm thuộc nhóm này — còn phải công bố số giấy chứng nhận đủ
 * điều kiện kinh doanh, ngày cấp và cơ quan cấp.
 *
 * Trường nào để chuỗi rỗng thì trang /terms tự bỏ dòng đó đi, không hiện ô
 * trống hay chữ "đang cập nhật".
 *
 * Chủ trương của doanh nghiệp: chỉ công bố thông tin cơ bản. Mỗi điểm bay có
 * giấy phép con riêng nên không liệt kê hết được — trang chỉ nêu các giấy
 * chứng nhận chính và ghi chú rằng giấy phép của từng điểm bay sẽ cung cấp khi
 * khách yêu cầu.
 *
 * Tên cơ quan cấp giữ NGUYÊN VĂN như trên giấy tờ gốc (Yên Bái, Hòa Bình) dù
 * hai tỉnh này đã sáp nhập năm 2025 — văn bản pháp lý phải dẫn đúng cơ quan đã
 * cấp tại thời điểm cấp.
 */
export const LEGAL_ENTITY = {
  /** Tên giao dịch, đã dùng khắp website. */
  tradeName: "Mebayluon Paragliding",
  /** Tên pháp nhân — NGUYÊN VĂN trên Giấy chứng nhận đăng ký doanh nghiệp. */
  legalName: "CÔNG TY CỔ PHẦN DU LỊCH VÀ THỂ THAO VIÊN NAM",
  /** Tên viết tắt cho dòng đầu khối pháp nhân ở footer (mẫu web Sa Pa). */
  shortLegalName: "CTCP DU LỊCH VÀ THỂ THAO VIÊN NAM",
  /** Tên tiếng Anh — nguyên văn trên Giấy CN ĐKDN. */
  legalNameEn: "VIEN NAM SPORT AND TOURISM JOINT STOCK COMPANY",
  /** Mã số doanh nghiệp, đồng thời là mã số thuế. */
  taxCode: "5400524310",
  /**
   * Thông tin đăng ký doanh nghiệp — Nghị định 52/2013/NĐ-CP (sửa bởi
   * 85/2021/NĐ-CP) buộc website TMĐT bán hàng công bố số ĐKDN, ngày cấp và nơi
   * cấp. Chép nguyên văn từ Giấy CN ĐKDN (đăng ký thay đổi lần 2).
   */
  registration: {
    /**
     * Ngày đăng ký lần đầu — GIỮ vì TT 47/2014 buộc công bố số, ngày cấp, nơi
     * cấp Giấy CN ĐKDN. Lần thay đổi gần nhất (lần 2, 28/08/2025) KHÔNG hiển
     * thị trên web (chủ 30/09/2026: bỏ bớt ngày cho gọn).
     */
    firstIssuedDate: "01/04/2021",
    issuer:
      "Phòng Đăng ký kinh doanh và Tài chính doanh nghiệp – Sở Tài chính TP Hà Nội",
    issuerEn:
      "Business Registration and Corporate Finance Division – Hanoi Department of Finance",
  },
  /** Trụ sở chính — nguyên văn trên Giấy CN ĐKDN. */
  registeredOffice:
    "Xóm Đồng Sắc, Thôn Núi Bé, Xã Xuân Mai, Thành phố Hà Nội, Việt Nam",
  /**
   * Người đại diện theo pháp luật. CHỈ công bố họ tên + chức danh — KHÔNG đưa
   * số định danh cá nhân, ngày sinh, địa chỉ liên lạc cá nhân lên web.
   */
  legalRepresentative: { name: "Đặng Văn Mỹ", title: "Giám đốc", titleEn: "Director" },
  /**
   * Điện thoại + email ĐĂNG KÝ trên Giấy CN ĐKDN. Khác với hotline/email chăm
   * sóc khách (`phones`, `email` bên dưới) — cả hai đều giữ, khối thông tin
   * pháp nhân ở footer và trang chính sách dùng bộ đăng ký này.
   */
  registeredPhone: "0964 073 555",
  /** Web hiện mebayluon@gmail.com thay hộp in trên giấy ĐKDN (chủ 30/09/2026). */
  registeredEmail: "mebayluon@gmail.com",
  /** Các địa chỉ hoạt động / nơi tiếp khách. */
  operatingAddresses: [
    "Thôn Lìm Thái, xã Tú Lệ, tỉnh Lào Cai",
    "Thôn Cầu Mây, phường Sa Pa, tỉnh Lào Cai",
    "Xóm Đoàn Kết, xã Thịnh Minh, tỉnh Phú Thọ",
    "Thôn Núi Bé, xã Xuân Mai, TP Hà Nội",
  ],
  phones: ["+84 964 073 555", "+84 385 907 789"],
  email: "mebayluon@gmail.com",
  website: "https://www.mebayluon.com",
  /**
   * Giấy chứng nhận đủ điều kiện kinh doanh hoạt động thể thao. Kinh doanh
   * hoạt động thể thao mạo hiểm là ngành nghề có điều kiện, nên Nghị định
   * 52/2013/NĐ-CP buộc phải công bố số giấy và cơ quan cấp.
   *
   * `date` chỉ để lưu hồ sơ — KHÔNG hiển thị ở footer, /terms hay trang chính
   * sách (chủ 30/09/2026: bỏ ngày của các giấy phép, chỉ hiện số).
   */
  sportLicenses: [
    {
      no: "14/GCN-VHTTDL",
      date: "18/8/2022",
      issuer: "Sở Văn hoá, Thể thao và Du lịch tỉnh Yên Bái",
    },
    {
      no: "118/GCN-VHTTDL",
      date: "25/4/2022",
      issuer: "Sở Văn hoá, Thể thao và Du lịch tỉnh Hòa Bình",
    },
  ],
} as const;

/**
 * TRỤ SỞ + CHI NHÁNH — nguồn DUY NHẤT cho dữ liệu cấu trúc (Organization,
 * LocalBusiness ở từng trang điểm bay) và danh sách địa điểm ở /contact
 * (chủ chốt 01/10/2026). Thêm/sửa chi nhánh chỉ sửa ở đây.
 *
 *  - `address`: nguyên văn địa chỉ đăng ký (sau sáp nhập tỉnh 2025).
 *  - `spot`: slug trang /spots/<spot> của điểm bay mà chi nhánh phục vụ — trang
 *    đó khai LocalBusiness của chi nhánh. Viên Nam đã gộp vào trang Đồi Bù nên
 *    trang /spots/doi-bu mang CẢ trụ sở lẫn chi nhánh Phú Thọ.
 *  - `geo`: toạ độ bãi cất trong lib/weather-spots.ts; riêng chi nhánh Tây Bắc
 *    lấy toạ độ Clubhouse (PLACE_GEO, khớp hồ sơ Google Business) vì địa chỉ
 *    chi nhánh chính là Clubhouse chứ không phải bãi cất trên đèo.
 *  - `site`: tên điểm bay theo 6 ngôn ngữ, dùng cho tên "Mebayluon Paragliding –
 *    <site>" và nhãn ở /contact.
 */
export type BranchLang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

export type CompanyBranch = {
  id: "hq" | "phu-tho" | "tay-bac" | "sapa" | "ha-giang";
  /** true = trụ sở chính (Giấy CN ĐKDN), còn lại là chi nhánh. */
  headquarters: boolean;
  /** Địa chỉ đầy đủ, nguyên văn. */
  address: string;
  /** Tách cho PostalAddress của schema.org. */
  streetAddress: string;
  addressLocality: string;
  addressRegion: string;
  spot: string;
  geo: { lat: number; lng: number };
  /** Link Google Maps riêng (hồ sơ Google Business) nếu có; không thì dò theo toạ độ. */
  mapUrl?: string;
  site: Record<BranchLang, string>;
  /** Tên địa điểm hiện ở /contact ("Trụ sở chính", "Chi nhánh Phú Thọ"…). */
  label: Record<BranchLang, string>;
};

export const COMPANY_BRANCHES: readonly CompanyBranch[] = [
  {
    id: "hq",
    headquarters: true,
    address: "Xóm Đồng Sắc, Thôn Núi Bé, Xã Xuân Mai, Thành phố Hà Nội, Việt Nam",
    streetAddress: "Xóm Đồng Sắc, Thôn Núi Bé",
    addressLocality: "Xã Xuân Mai",
    addressRegion: "Thành phố Hà Nội",
    spot: "doi-bu",
    geo: { lat: 20.8085, lng: 105.568778 },
    site: { vi: "Đồi Bù", en: "Doi Bu", fr: "Doi Bu", ru: "Дой Бу", zh: "布山", hi: "डोई बू" },
    label: { vi: "Trụ sở chính (Hà Nội)", en: "Head office (Hanoi)", fr: "Siège social (Hanoï)", ru: "Головной офис (Ханой)", zh: "总部（河内）", hi: "मुख्य कार्यालय (हनोई)" },
  },
  {
    id: "phu-tho",
    headquarters: false,
    address: "Xóm Đoàn Kết, xã Thịnh Minh, tỉnh Phú Thọ, Việt Nam",
    streetAddress: "Xóm Đoàn Kết",
    addressLocality: "Xã Thịnh Minh",
    addressRegion: "Tỉnh Phú Thọ",
    spot: "doi-bu",
    geo: { lat: 20.954306, lng: 105.412861 },
    site: { vi: "Núi Viên Nam", en: "Vien Nam Mountain", fr: "Mont Vien Nam", ru: "Гора Виен Нам", zh: "员南山", hi: "विएन नाम पर्वत" },
    label: { vi: "Chi nhánh Phú Thọ", en: "Phu Tho branch", fr: "Agence de Phu Tho", ru: "Филиал Футхо", zh: "富寿分公司", hi: "फू थो शाखा" },
  },
  {
    id: "tay-bac",
    headquarters: false,
    address: "Thôn Lìm Thái, xã Tú Lệ, tỉnh Lào Cai, Việt Nam",
    streetAddress: "Thôn Lìm Thái (Clubhouse Mebayluon)",
    addressLocality: "Xã Tú Lệ",
    addressRegion: "Tỉnh Lào Cai",
    spot: "khau-pha",
    geo: { lat: 21.7764187, lng: 104.2636752 },
    mapUrl: "https://maps.app.goo.gl/uSy6LHKZXMd6mQ6r6",
    site: {
      vi: "Đèo Khau Phạ",
      en: "Khau Pha Pass",
      fr: "Col de Khau Pha",
      ru: "Перевал Кхау Фа",
      zh: "考帕山口",
      hi: "खाउ फ़ा दर्रा",
    },
    label: { vi: "Chi nhánh Tây Bắc (Clubhouse Mebayluon)", en: "Northwest branch (Clubhouse Mebayluon)", fr: "Agence du Nord-Ouest (Clubhouse Mebayluon)", ru: "Северо-западный филиал (Clubhouse Mebayluon)", zh: "西北分公司（Clubhouse Mebayluon）", hi: "उत्तर-पश्चिम शाखा (Clubhouse Mebayluon)" },
  },
  {
    id: "sapa",
    headquarters: false,
    address: "Tổ Cầu Mây 3, phường Sa Pa, tỉnh Lào Cai, Việt Nam",
    streetAddress: "Tổ Cầu Mây 3",
    addressLocality: "Phường Sa Pa",
    addressRegion: "Tỉnh Lào Cai",
    spot: "muong-hoa-sapa",
    geo: { lat: 22.3364, lng: 103.8438 },
    site: { vi: "Sa Pa", en: "Sa Pa", fr: "Sa Pa", ru: "Сапа", zh: "沙坝", hi: "सापा" },
    label: { vi: "Chi nhánh Sa Pa", en: "Sa Pa branch", fr: "Agence de Sa Pa", ru: "Филиал Сапа", zh: "沙坝分公司", hi: "सापा शाखा" },
  },
  {
    id: "ha-giang",
    headquarters: false,
    address: "Thôn Nà Khoang, xã Quản Bạ, tỉnh Tuyên Quang, Việt Nam",
    streetAddress: "Thôn Nà Khoang",
    addressLocality: "Xã Quản Bạ",
    addressRegion: "Tỉnh Tuyên Quang",
    spot: "ha-giang",
    geo: { lat: 23.0604025, lng: 105.0189508 },
    site: {
      vi: "Quản Bạ (Hà Giang)",
      en: "Quan Ba (Ha Giang)",
      fr: "Quan Ba (Ha Giang)",
      ru: "Куан Ба (Хазянг)",
      zh: "管坝（河江）",
      hi: "क्वान बा (हा जियांग)",
    },
    label: { vi: "Chi nhánh Hà Giang", en: "Ha Giang branch", fr: "Agence de Ha Giang", ru: "Филиал Хазянг", zh: "河江分公司", hi: "हा जियांग शाखा" },
  },
];

/** Chi nhánh (kể cả trụ sở) phục vụ trang /spots/<slug> — slug chuẩn. */
export function branchesForSpot(spotSlug: string): CompanyBranch[] {
  return COMPANY_BRANCHES.filter((b) => b.spot === spotSlug);
}

/** Link Google Maps của một địa điểm: hồ sơ riêng nếu có, không thì theo toạ độ. */
export function branchMapUrl(b: CompanyBranch): string {
  return b.mapUrl ?? `https://www.google.com/maps/search/?api=1&query=${b.geo.lat},${b.geo.lng}`;
}

/*
 * CỐ Ý KHÔNG CÔNG BỐ:
 *  - Giấy phép bay: cấp lại theo từng năm nên đăng lên là sẽ lạc hậu ngay, mà
 *    một giấy phép hết hạn hiển thị công khai còn tệ hơn là không hiển thị.
 *  - Thông tin cá nhân của người đại diện (số định danh, ngày sinh, địa chỉ
 *    liên lạc cá nhân) — có trên Giấy CN ĐKDN nhưng không thuộc diện phải công
 *    bố trên website TMĐT.
 *
 * (Trước 30/09/2026 file này ghi "không công bố số ĐKKD và trụ sở đăng ký".
 * Để thông báo website TMĐT với Bộ Công Thương thì BẮT BUỘC công bố số ĐKDN +
 * ngày cấp + nơi cấp + trụ sở, nên nay hiện ở footer và các trang chính sách.)
 */

/**
 * LOGO "ĐÃ THÔNG BÁO BỘ CÔNG THƯƠNG" (online.gov.vn).
 *
 * null = chưa có mã → footer KHÔNG hiện gì. Khi Bộ duyệt hồ sơ thông báo, trang
 * online.gov.vn cấp một đường dẫn dạng
 *   http://online.gov.vn/Home/WebDetails/XXXXX
 * → CÓ MÃ TỪ BỘ THÌ CHỈ SỬA DÒNG NÀY (dán nguyên đường dẫn vào giữa hai dấu ").
 */
export const BCT_NOTICE_URL: string | null = null;

/** Ảnh logo do Bộ Công Thương cung cấp — dùng nguyên, không tải về tự host. */
export const BCT_LOGO_SRC =
  "http://online.gov.vn/Content/EndUserResources/Images/logoSaleNoti.png";

/** Ngày cập nhật điều khoản gần nhất, hiện ở đầu trang /terms. */
export const TERMS_UPDATED_AT = "30/09/2026";

/**
 * GHI CHÚ THUẾ/PHÍ DƯỚI TỔNG TIỀN (bước xác nhận đặt bay + Chính sách thanh
 * toán). NĐ 52/2013 yêu cầu giá hiển thị nói rõ đã gồm hay chưa gồm thuế, phí.
 * Chủ doanh nghiệp xác nhận 30/09/2026: giá niêm yết ĐÃ GỒM VAT, công ty CÓ
 * xuất hoá đơn VAT. Đặt null thì dòng ghi chú biến mất.
 */
export const PRICE_TAX_NOTE: { vi: string; en: string } | null = {
  vi: "Giá đã bao gồm thuế GTGT (VAT). Công ty có xuất hóa đơn GTGT theo yêu cầu.",
  en: "Prices include VAT. A VAT invoice is issued on request.",
};

/**
 * Tên công ty bảo hiểm nhận dữ liệu khách để cấp bảo hiểm tai nạn cho chuyến
 * bay — nêu đích danh ở Chính sách bảo mật. ⚠️ CHƯA CÓ TÊN: chủ điền tên đầy
 * đủ của công ty bảo hiểm vào đây; null thì trang ghi chung "công ty bảo hiểm
 * cung cấp gói bảo hiểm tai nạn cho chuyến bay".
 */
export const INSURANCE_PROVIDER_NAME: string | null = null;
