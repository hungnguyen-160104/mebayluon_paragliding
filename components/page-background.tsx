// components/page-background.tsx
import Image from "next/image";

/**
 * Ảnh nền phủ kín trang.
 *
 * Trước đây mỗi trang tự đặt nền bằng CSS `background-image`, mà CSS thì không
 * đi qua next/image nên trình duyệt tải nguyên file gốc — /hinh-nen.jpg và
 * /images/mebayluon.jpg đều nặng 2,5 MB, gửi y hệt nhau cho điện thoại lẫn màn
 * hình 4K, chiếm khoảng 80% cân nặng trang. Đưa về next/image để Next tự xuất
 * AVIF/WebP đúng khổ từng máy.
 *
 * Lớp màu phủ lên nền (bg-black/40...) vẫn để nguyên ở trang gọi: nó là thẻ
 * div anh em đứng ngay sau nên vẫn nằm đè lên ảnh như cũ.
 */
export function PageBackground({
  src,
  /**
   * Mặc định là nền cố định theo màn hình. Trang nào đang đặt nền ngay trên
   * thẻ bọc (nền cuộn theo nội dung) thì truyền "absolute inset-0".
   */
  className = "fixed inset-0 -z-10",
}: {
  src: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Image
        src={src}
        alt=""
        fill
        // Nền thường là phần tử lớn nhất màn hình đầu tiên nên tải sớm.
        priority
        sizes="100vw"
        className="object-cover"
      />
    </div>
  );
}
