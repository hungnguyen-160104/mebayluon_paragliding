// lib/baobay/in-ve-cau-hinh.ts
/**
 * CỜ TẠM: MỞ TỰ DO CHO VIỆC IN VÉ.
 *
 * Chủ 13/09/2026: "hiện tại hãy cho IN VÉ thoải mái vì đang cần test máy in
 * mà chưa cần tính xuất vé."
 *
 * Bật cờ này thì:
 *  - in lại KHÔNG phải ghi lý do, không giới hạn số lần, với MỌI vai;
 *  - nút 🖨 hiện ở mọi booking của điểm có in vé, kể cả booking chưa tích
 *    "đã xuất vé" — đang thử máy nên cần in thử bất kỳ đoàn nào.
 *
 * Vẫn giữ nguyên: vết in ghi đủ (ai, lúc nào, lần thứ mấy) và booking đã KHOÁ
 * thì không in — hai thứ đó không cản việc thử máy.
 *
 * HẾT ĐỢT THỬ MÁY: đổi hằng này về `false` là quay lại luật cũ (lần đầu tự do,
 * từ lần hai bắt ghi lý do ≥ 5 ký tự; riêng quản trị cấp 1 vẫn tự do). Không
 * phải sửa chỗ nào khác — máy chủ và giao diện cùng đọc một cờ này.
 */
export const IN_VE_TU_DO = true;
