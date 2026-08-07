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
  /** Tên pháp nhân trên giấy đăng ký kinh doanh. */
  legalName: "Công ty Cổ phần Du lịch và Thể thao Viên Nam",
  taxCode: "5400524310",
  registeredOffice: "Thôn Núi Bé, xã Xuân Mai, TP Hà Nội",
  /** Các địa chỉ hoạt động / nơi tiếp khách. */
  operatingAddresses: [
    "Thôn Lìm Thái, xã Tú Lệ, tỉnh Lào Cai",
    "Thôn Cầu Mây, phường Sa Pa, tỉnh Lào Cai",
    "Xóm Đoàn Kết, xã Thịnh Minh, tỉnh Phú Thọ",
    "Thôn Núi Bé, xã Xuân Mai, TP Hà Nội",
  ],
  phones: ["+84 964 073 555", "+84 385 907 789"],
  email: "mebayluon@gmail.com",
  website: "https://mebayluon.com",
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
 *  - Số giấy ĐKKD: ở Việt Nam trùng với mã số doanh nghiệp (= mã số thuế) nên
 *    đăng thêm chỉ là lặp lại.
 *  - Địa chỉ trụ sở đăng ký: đã có địa chỉ hoạt động, không cần thêm.
 */

/** Ngày cập nhật điều khoản gần nhất, hiện ở đầu trang /terms. */
export const TERMS_UPDATED_AT = "07/08/2026";
