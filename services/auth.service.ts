// services/auth.service.ts
import bcrypt from "bcryptjs";
import { createLogger } from "@/lib/logger";
import { connectDB } from "@/lib/mongodb";
import { AdminCredential } from "@/models/AdminCredential.model";

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

    /**
     * MẬT KHẨU CHỦ TỰ ĐỔI (nếu có) THẮNG mật khẩu trong biến môi trường.
     *
     * Không có luật này thì nút "Đổi mật khẩu" chẳng khoá được ai: mật khẩu cũ
     * nằm trong biến môi trường vẫn vào được như thường. Xem chú thích ở
     * models/AdminCredential.model.ts.
     */
    const saved = await savedHashOf(slot.user);
    if (saved) {
      const ok = await bcrypt.compare(password, saved).catch(() => false);
      if (ok) logger.info('Admin authenticated (mật khẩu đã đổi)', { level: slot.level });
      return ok ? slot.level : null;
    }

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
 * Mật khẩu đã đổi của một tài khoản, hoặc null nếu chưa từng đổi.
 *
 * CSDL hỏng/không nối được thì trả null để rơi về biến môi trường — thà đăng
 * nhập bằng mật khẩu cũ còn hơn khoá cứng chủ site ra ngoài khu quản trị.
 */
async function savedHashOf(username: string): Promise<string | null> {
  try {
    await connectDB();
    const doc = await AdminCredential.findOne({ username }).select("passwordHash").lean<any>();
    return doc?.passwordHash ? String(doc.passwordHash) : null;
  } catch (error) {
    logger.error('Không đọc được mật khẩu đã đổi, tạm dùng biến môi trường', error as Error);
    return null;
  }
}

/** Mức quyền của một tên đăng nhập — dùng khi đổi mật khẩu, không cần mật khẩu. */
export function levelOfUsername(username: string): AdminLevel | null {
  return slots().find((s) => s.user && s.user === username)?.level ?? null;
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

