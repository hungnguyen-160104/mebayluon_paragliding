// services/auth.service.ts
import bcrypt from "bcryptjs";
import { createLogger } from "@/lib/logger";

const logger = createLogger('AuthService');

/**
 * HAI MỨC QUYỀN ở khu quản trị website:
 *
 *  - "editor" — tài khoản BIÊN TẬP (SINGLE_USER, đang là mebayluon123): đăng
 *    bài, xem thống kê, xem đơn/khách trên web. KHÔNG đụng được khu báo bay.
 *  - "owner"  — tài khoản CHỦ (OWNER_USERNAME): mọi thứ, kể cả nhân sự báo bay.
 *
 * Vì sao phải tách: token quản trị website đi qua `requireBaobay` với cờ
 * `viaAdmin` và cờ đó BỎ QUA MỌI KIỂM VAI TRÒ của khu báo bay — hơn 20 cửa API
 * (sổ booking, soát chuyển khoản, tài khoản nhân sự, sổ phòng homestay…) mở
 * toang cho bất kỳ ai cầm token admin. Người điều phối chỉ cần vào đăng bài mà
 * lại cầm luôn chìa khoá sổ tiền là không ổn. Nay chỉ token "owner" mới được
 * cờ ấy; xem middlewares/requireBaobay.ts.
 */
export type AdminLevel = "owner" | "editor";

/** Một khe tài khoản khai bằng biến môi trường. */
type AdminSlot = { level: AdminLevel; user: string; hash: string; plain: string };

function slots(): AdminSlot[] {
  return [
    {
      level: "owner",
      user: process.env.OWNER_USERNAME ?? "",
      hash: process.env.OWNER_PASSWORD_HASH ?? "",
      plain: process.env.OWNER_PASSWORD ?? "",
    },
    {
      level: "editor",
      user: process.env.SINGLE_USER ?? "",
      hash: process.env.SINGLE_PASSWORD_HASH ?? "",
      plain: process.env.SINGLE_PASSWORD ?? "",
    },
  ];
}

/**
 * Mã băm bcrypt hợp lệ: "$2b$10$" + 53 ký tự muối/băm, tổng đúng 60.
 *
 * Kiểm hình dạng để BẮT MỘT CÁI BẪY CỤ THỂ: Next.js nạp tệp .env qua
 * dotenv-expand, gặp "$2b" "$10" là tưởng tên biến rồi thay bằng rỗng — mã băm
 * 60 ký tự vào tới máy chủ chỉ còn khúc đuôi. Đăng nhập báo "sai mật khẩu" y
 * như gõ nhầm, không manh mối nào. Trong .env phải escape thành \$2b\$10\$…
 * (trên Vercel thì dán nguyên, bên đó không qua dotenv).
 */
const BCRYPT_SHAPE = /^\$2[aby]?\$\d{2}\$.{53}$/;

/** So mật khẩu: ưu tiên bcrypt, không có hash thì mới xét bản gõ thẳng. */
async function passwordOk(slot: AdminSlot, password: string): Promise<boolean> {
  if (slot.hash && !BCRYPT_SHAPE.test(slot.hash)) {
    logger.error(
      `Mã băm mật khẩu của tài khoản "${slot.user}" KHÔNG đúng dạng bcrypt (dài ${slot.hash.length}, cần 60). ` +
        `Nhiều khả năng dấu $ trong tệp .env bị dotenv-expand nuốt — escape thành \\$2b\\$10\\$… rồi khởi động lại.`,
      new Error("Malformed bcrypt hash"),
    );
  }
  if (slot.hash) {
    try {
      if (await bcrypt.compare(password, slot.hash)) return true;
    } catch (error) {
      logger.error('Bcrypt comparison failed', error as Error);
      // hỏng hash thì rơi xuống bản gõ thẳng, không chặn đăng nhập
    }
  }
  if (slot.plain) return password === slot.plain;
  return false;
}

/**
 * Xác thực tài khoản quản trị website.
 *
 * @returns mức quyền nếu đúng, `null` nếu sai — KHÔNG trả boolean nữa để chỗ
 *          gọi buộc phải ghi mức quyền vào token.
 */
export async function validateAdmin(username: string, password: string): Promise<AdminLevel | null> {
  const configured = slots().filter((s) => s.user);
  if (configured.length === 0) {
    logger.warn('No admin account configured');
    return null;
  }

  for (const slot of configured) {
    if (username !== slot.user) continue;
    if (await passwordOk(slot, password)) {
      logger.info('Admin authenticated', { level: slot.level });
      return slot.level;
    }
    // Đúng tên sai mật khẩu: dừng luôn, đừng thử tên đó ở khe khác
    return null;
  }

  logger.debug('Username not found in any admin slot');
  return null;
}

/**
 * Hash a password using bcryptjs
 * 
 * @param password - Plain text password to hash
 * @param rounds - Number of salt rounds (default: 10)
 * @returns Promise<string> - Hashed password
 */
export async function hashPassword(password: string, rounds: number = 10): Promise<string> {
  return bcrypt.hash(password, rounds);
}

/**
 * Verify a password against its hash
 * 
 * @param password - Plain text password to verify
 * @param hash - Bcrypt hash to compare against
 * @returns Promise<boolean> - true if password matches hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

