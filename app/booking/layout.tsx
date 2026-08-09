/**
 * Metadata của /booking do chính app/booking/page.tsx dựng (buildMetadata:
 * canonical theo ngôn ngữ + hreflang). Layout này từng khai thêm
 * `robots: { index: false }`, nhưng metadata của page ghi đè metadata của
 * layout nên thẻ đó chưa từng có tác dụng — chỉ gây hiểu nhầm là trang đang
 * bị chặn index. /booking/QR kế thừa metadata của page cha.
 */
export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
