// lib/pilot-waiver.ts
/**
 * BIÊN BẢN CAM KẾT & MIỄN TRỪ TRÁCH NHIỆM cho phi công dự sự kiện dù lượn.
 *
 * Một nguồn nội dung duy nhất — trang ký (/muavang/mien-tru), bản PDF và
 * email đều dựng từ đây; sửa điều khoản chỉ sửa MỘT chỗ. Đổi nội dung nhớ
 * nâng WAIVER_VERSION để phân biệt phi công đã ký bản nào.
 *
 * Nội dung soạn theo yêu cầu của ban tổ chức (8/2026) + các miễn trừ chuẩn
 * của sự kiện dù lượn: tự nguyện, tự mua bảo hiểm, thiết bị tự túc đạt chuẩn,
 * P2/<100 chuyến phải có giám sát, cấm bay đôi khi chưa được phép...
 */

export const WAIVER_VERSION = "2026-08-20";

export const WAIVER_TITLE = "BIÊN BẢN CAM KẾT VÀ MIỄN TRỪ TRÁCH NHIỆM";
export const WAIVER_SUBTITLE =
  "Dành cho phi công tham dự sự kiện dù lượn do Mebayluon Paragliding tổ chức";

export type WaiverSection = { title: string; items: string[] };

export const WAIVER_SECTIONS: WaiverSection[] = [
  {
    title: "Tự nguyện tham dự và bảo hiểm",
    items: [
      "Tôi tự nguyện đăng ký và tham dự sự kiện; đã đọc, hiểu rõ và chấp nhận toàn bộ nội dung biên bản này trước khi ký.",
      "Tôi đủ 18 tuổi và có đầy đủ năng lực hành vi dân sự để ký biên bản này.",
      "Tôi hiểu rằng Ban tổ chức (BTC) KHÔNG mua bảo hiểm cho phi công đăng ký đơn (cá nhân). Tôi tự thu xếp bảo hiểm tai nạn phù hợp cho bản thân trước khi bay.",
    ],
  },
  {
    title: "Trình độ và thiết bị bay",
    items: [
      "Tôi khai đúng trình độ, số chuyến bay và kinh nghiệm của mình khi đăng ký; mang theo chứng chỉ/bằng bay hợp lệ và xuất trình khi BTC yêu cầu.",
      "Vòm dù tôi sử dụng PHÙ HỢP VỚI CÂN NẶNG của tôi (tổng tải trọng cất cánh nằm trong dải tải của vòm) và ĐÚNG TRÌNH ĐỘ hiện có — không bay vòm cấp cao hơn trình độ của mình.",
      "Thiết bị bay do tôi TỰ TÚC, đạt chuẩn và được kiểm tra định kỳ: vòm dù có độ thấm khí trên 50 giây; đai ngồi và vòm dù đúng kích cỡ với tôi; mũ bảo hiểm đạt chuẩn; bộ đàm cài đúng tần số BTC công bố; dù phụ được gấp đúng kỹ thuật và kiểm tra kỹ trước sự kiện.",
      "Tôi tự kiểm tra tiền bay (pre-flight check) đầy đủ trước MỖI chuyến; mang điện thoại đủ pin và giữ liên lạc được với BTC trong suốt chuyến bay.",
      "Nếu tôi là phi công mới trình độ P2 hoặc có dưới 100 chuyến bay: tôi PHẢI có phi công/HLV giám sát, hướng dẫn và chịu trách nhiệm trực tiếp trong suốt quá trình bay (đã khai tên và số điện thoại người hỗ trợ ở phần thông tin đăng ký; BQL điểm bay sẽ xác nhận thông tin giữa hai bên).",
    ],
  },
  {
    title: "Quy tắc bay trong sự kiện",
    items: [
      "Tôi chỉ bay trong khung giờ và vùng bay BTC công bố; tuân thủ hiệu lệnh của điều phối và mọi nội quy của điểm bay. Khi có CỜ ĐỎ hoặc hiệu lệnh dừng bay, tôi dừng ngay lập tức.",
      "Tôi báo điều phối trước khi cất cánh và xác nhận sau khi hạ cánh an toàn (báo cất — báo hạ) để BTC kiểm soát được quân số trên không.",
      "Tôi tuân thủ quy tắc tránh va chạm trên không (quy tắc ưu tiên, quy tắc vào thermal cùng chiều, giữ khoảng cách an toàn); KHÔNG bay nhào lộn (acro, wingover...) ở độ cao thấp hoặc phía trên khu đông người, khu cất/hạ cánh.",
      "Tôi cất và hạ cánh đúng khu vực quy định; giữ khoảng cách an toàn với đường điện, khu dân cư. Nếu hạ ngoài khu quy định làm hư hại lúa, hoa màu hay tài sản của người dân, tôi TỰ ĐỀN BÙ thoả đáng.",
      "Bay đường dài (XC) ra ngoài vùng bay sự kiện: phải báo và được BTC đồng ý trước; tôi tự chịu trách nhiệm phương án hạ cánh và tự thu xếp việc đón/thu hồi.",
      "BAY ĐÔI (tandem) trong sự kiện: KHÔNG được phép, trừ khi có sự cho phép trực tiếp của BTC.",
      "Tôi không tự ý bay drone/flycam trong vùng hoạt động dù lượn khi chưa được BTC cho phép.",
      "Tôi không sử dụng rượu bia, chất kích thích trước và trong khi bay; không bay khi mệt mỏi, thiếu ngủ hoặc sức khoẻ không bảo đảm; tự chịu trách nhiệm về tình trạng sức khoẻ của mình.",
      "BTC có quyền tạm dừng hoặc đình chỉ bay đối với phi công vi phạm quy định an toàn.",
    ],
  },
  {
    title: "Miễn trừ trách nhiệm và bồi thường",
    items: [
      "Tôi hiểu dù lượn là môn thể thao mạo hiểm có rủi ro vốn có (thời tiết, địa hình, va chạm trên không...). Tôi TỰ CHỊU TRÁCH NHIỆM về mọi sự cố, tai nạn xảy ra với bản thân trong sự kiện (nếu có).",
      "Tôi bồi thường mọi thiệt hại về người và tài sản do bản thân gây ra cho bên thứ ba, BTC hoặc người dân địa phương (nếu có).",
      "Trong phạm vi pháp luật cho phép, tôi miễn trừ trách nhiệm cho BTC, chính quyền địa phương, chủ đất điểm cất/hạ cánh và các bên phối hợp tổ chức đối với thiệt hại phát sinh từ rủi ro vốn có của hoạt động bay.",
      "Trường hợp khẩn cấp, tôi đồng ý để BTC thực hiện hoặc thu xếp sơ cấp cứu và liên hệ số điện thoại khẩn cấp tôi đã khai; chi phí y tế do tôi chi trả.",
      "Tôi đồng ý cho BTC sử dụng hình ảnh/video ghi nhận tại sự kiện phục vụ truyền thông của sự kiện.",
    ],
  },
  {
    title: "Ứng xử và môi trường",
    items: [
      "Tôi tôn trọng người dân và văn hoá địa phương; giữ gìn vệ sinh, không xả rác tại điểm cất/hạ cánh và khu vực sự kiện.",
      "Tôi giữ gìn hình ảnh chung của cộng đồng dù lượn trong suốt sự kiện.",
    ],
  },
  {
    title: "Quyền lợi phi công",
    items: [
      "Lịch sinh hoạt và chỗ ở do BTC bố trí theo gói đã đăng ký; nước lọc miễn phí tại khu vực BTC điểm bay.",
      "Các dịch vụ khác phát sinh phí trong sự kiện được giảm 20% đối với phi công.",
    ],
  },
  {
    title: "Cam kết cuối cùng",
    items: [
      "Tôi cam kết mọi thông tin đã khai trong đăng ký và trong biên bản này là đúng sự thật; nếu khai sai tôi hoàn toàn chịu trách nhiệm.",
      "Biên bản này được ký điện tử (vẽ chữ ký trên màn hình) và có giá trị như ký trực tiếp; bản PDF được gửi về email của tôi và lưu tại BTC.",
    ],
  },
];

/** Dòng khẳng định ngay trên ô ký — phi công đọc câu này cuối cùng trước khi đặt bút. */
export const WAIVER_AFFIRMATION =
  "Tôi xác nhận đã đọc toàn bộ biên bản, hiểu rõ các rủi ro và tự nguyện ký tên dưới đây.";
