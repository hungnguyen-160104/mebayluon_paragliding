// services/auth.service.ts
import bcrypt from "bcryptjs";
import { createLogger } from "@/lib/logger";

const logger = createLogger('AuthService');

const SINGLE_USER = process.env.SINGLE_USER ?? "";
const PASS_HASH = process.env.SINGLE_PASSWORD_HASH ?? "";          // bcrypt hash (nếu có)
const PASS_PLAIN = process.env.SINGLE_PASSWORD ?? "";              // plaintext (tùy chọn cho demo)

/**
 * Xác thực admin 1 tài khoản đơn.
 * - Ưu tiên so sánh bcrypt với SINGLE_PASSWORD_HASH
 * - Nếu không khớp hoặc không có hash => fallback so sánh với SINGLE_PASSWORD
 * 
 * @param username - Username to verify
 * @param password - Password to verify
 * @returns true if credentials are valid, false otherwise
 */
export async function validateAdmin(username: string, password: string): Promise<boolean> {
  if (!SINGLE_USER) {
    logger.warn('Single user not configured');
    return false;
  }
  
  if (username !== SINGLE_USER) {
    logger.debug('Username mismatch', { provided: username, expected: SINGLE_USER });
    return false;
  }

  // 1) Thử hash trước (nếu cung cấp)
  if (PASS_HASH) {
    try {
      const isValid = await bcrypt.compare(password, PASS_HASH);
      if (isValid) {
        logger.info('Admin authenticated with bcrypt hash');
        return true;
      }
    } catch (error) {
      logger.error('Bcrypt comparison failed', error as Error);
      // bỏ qua, rơi xuống plaintext
    }
  }

  // 2) Fallback plaintext (dùng cho demo)
  if (PASS_PLAIN) {
    const isValid = password === PASS_PLAIN;
    if (isValid) {
      logger.info('Admin authenticated with plaintext password (not recommended for production)');
    }
    return isValid;
  }

  logger.warn('No password configured for authentication');
  return false;
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

