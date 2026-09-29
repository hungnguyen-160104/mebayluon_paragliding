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
    firstIssuedDate: "01/04/2021",
    /** Lần thay đổi gần nhất; đổi giấy thì sửa cả hai dòng này. */
    latestChange: "đăng ký thay đổi lần 2 ngày 28/08/2025",
    latestChangeEn: "2nd amendment registered on 28/08/2025",
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
  registeredEmail: "dangvm@gmail.com",
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
   * 52/2013/NĐ-CP buộc phải công bố số giấy, ngày cấp và cơ quan cấp.
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
