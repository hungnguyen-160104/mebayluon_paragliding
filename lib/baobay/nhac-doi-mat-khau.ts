/**
 * NHẮC ĐỔI MẬT KHẨU CÓ HẠN (chủ 19/09): Mai Hoàn, Minh Ngọc… dùng mật khẩu
 * quản trị đặt mãi không đổi, dải vàng "đổi mật khẩu" treo trên đầu mọi trang
 * rất vướng. Luật: người nào ĐÃ ĐĂNG NHẬP và quá 10 NGÀY kể từ lúc được cấp
 * mật khẩu mà vẫn không đổi thì thôi không nhắc nữa, ẩn luôn. Trong 10 ngày
 * đầu vẫn nhắc.
 *
 * Mốc tính là lúc mật khẩu được ĐẶT (quản trị tạo / đặt lại — `passwordSetAt`),
 * tài khoản cũ chưa có mốc ấy thì lấy ngày tạo tài khoản. "Đã đăng nhập" xét
 * theo `lastLoginAt`; đang ở trong phiên thì đương nhiên đã đăng nhập.
 */
export const HAN_NHAC_DOI_MAT_KHAU_MS = 10 * 24 * 60 * 60 * 1000;

export function canNhacDoiMatKhau(
  acc: {
    mustChangePassword?: boolean | null;
    passwordSetAt?: Date | string | null;
    createdAt?: Date | string | null;
    lastLoginAt?: Date | string | null;
  },
  luc: Date = new Date(),
): boolean {
  if (!acc.mustChangePassword) return false;
  /** Chưa từng đăng nhập thì lần đầu vào vẫn phải nhắc, dù mật khẩu cấp đã lâu. */
  if (!acc.lastLoginAt) return true;
  const moc = acc.passwordSetAt ?? acc.createdAt;
  if (!moc) return true;
  const t = new Date(moc).getTime();
  if (!Number.isFinite(t)) return true;
  return luc.getTime() - t < HAN_NHAC_DOI_MAT_KHAU_MS;
}
