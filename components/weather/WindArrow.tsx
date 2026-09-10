/**
 * MŨI TÊN HƯỚNG GIÓ vẽ bằng SVG, dùng chung cho sổ nội bộ và trang khách.
 *
 * Vì sao không dùng ký tự ↑ ↗ →: bộ ký tự chỉ có 8 hoặc 16 hướng nên phải làm
 * tròn về bội của 22,5° — gió 100° và 112° thành cùng một mũi tên, trong khi ở
 * núi chênh mươi độ là khác sườn. SVG xoay đúng số độ mô hình trả về.
 *
 * Và nét ký tự thì mảnh, cỡ chữ có tăng lên cũng không "béo" ra được; ở đây
 * nét vẽ dày bao nhiêu là do mình đặt.
 *
 * QUY ƯỚC: hướng gió trong khí tượng là hướng gió THỔI TỚI TỪ đâu (0° = từ
 * bắc). Mũi tên phải chỉ chiều gió ĐANG ĐI, tức là ngược lại — nên xoay thêm
 * 180°. Vẽ mặc định chỉ LÊN, xoay 180° thành chỉ XUỐNG: đúng với gió bắc.
 */
export function WindArrow({ deg, className = "" }: { deg: number; className?: string }) {
  const goc = (((deg ?? 0) % 360) + 360) % 360;
  return (
    <svg
      viewBox="0 0 24 24"
      className={"inline-block h-5 w-5 " + className}
      style={{ transform: `rotate(${goc + 180}deg)` }}
      aria-hidden="true"
      focusable="false"
    >
      {/* Thân dày + đầu nhọn to: nhìn rõ ở cỡ 20px giữa một bảng số dày đặc. */}
      <path d="M12 2 L20 12 H15.5 V22 H8.5 V12 H4 Z" fill="currentColor" />
    </svg>
  );
}
