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

// eslint-disable-next-line no-var
declare global {
  var __mongoose: Cached | undefined;
}

const cached: Cached = global.__mongoose || { conn: null, promise: null };
if (!global.__mongoose) global.__mongoose = cached;

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (mongoose.connection.readyState === 1) return (cached.conn = mongoose);

  if (!cached.promise) {
    mongoose.set("strictQuery", true);
    cached.promise = mongoose.connect(getMongoUri()).then((m) => {
      console.log("✅ MongoDB connected");
      return m;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
