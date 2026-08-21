// lib/mongodb.ts
import mongoose from "mongoose";

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.trim() === "") {
    throw new Error("Missing MONGODB_URI in environment variables");
  }
  return uri;
}

type Cached = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var __mongoose: Cached | undefined;
}

const cached: Cached = global.__mongoose || { conn: null, promise: null };
if (!global.__mongoose) global.__mongoose = cached;

/**
 * Nối MongoDB, dùng lại kết nối cũ giữa các lần gọi trong cùng một tiến trình.
 *
 * ĐỪNG NHỚ LẦN NỐI HỎNG. Bản trước cất luôn `cached.promise` kể cả khi nó bị
 * từ chối: một lần chập mạng lúc khởi động là mọi lời gọi sau đều await đúng
 * cái promise hỏng đó và văng lỗi TỨC THÌ, mãi mãi — cho tới khi Vercel dọn
 * tiến trình. Đúng cảnh 22/08: đăng nhập và lịch phòng chết 500 trong 0,2 giây
 * trong khi các cửa khác (chạy ở tiến trình khác, nối được) vẫn chạy ngon.
 *
 * Nay hỏng thì xoá dấu để lần gọi kế tiếp nối lại từ đầu; kết nối rớt giữa
 * chừng (readyState khác 1) cũng bị bỏ để dựng lại.
 */
export async function connectDB() {
  // Kết nối cũ còn sống thì dùng luôn; rớt rồi thì bỏ đi, nối lại
  if (cached.conn) {
    if (cached.conn.connection.readyState === 1) return cached.conn;
    cached.conn = null;
    cached.promise = null;
  }
  if (mongoose.connection.readyState === 1) return (cached.conn = mongoose);

  if (!cached.promise) {
    mongoose.set("strictQuery", true);
    cached.promise = mongoose
      .connect(getMongoUri(), {
        /** Không chờ mãi: 10 giây không chọn được máy chủ thì báo lỗi để thử lại. */
        serverSelectionTimeoutMS: 10_000,
        /** Mỗi tiến trình serverless giữ ít kết nối — Atlas có trần số kết nối. */
        maxPoolSize: 10,
      })
      .then((m) => {
        console.log("✅ MongoDB connected");
        return m;
      })
      .catch((err) => {
        // XOÁ DẤU ngay trong chuỗi: lần gọi sau được nối lại thay vì ăn lại lỗi cũ
        cached.promise = null;
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    cached.conn = null;
    cached.promise = null;
    throw err;
  }
}
