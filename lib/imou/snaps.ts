// lib/imou/snaps.ts
/**
 * KHO ẢNH CAMERA (chỉ chạy ở máy chủ): Cloudinary giữ file, MongoDB giữ danh mục.
 *
 * Vì sao lưu danh mục ở MongoDB (collection `camera_snaps`) chứ không hỏi
 * Cloudinary Admin API? Admin API có hạn mức theo giờ; trang /baobay tự làm
 * mới mỗi 60s × nhiều phi công sẽ ăn hết hạn mức. Đọc Mongo thì rẻ, còn xoá ảnh
 * cũ dùng uploader.destroy (Upload API, không tính hạn mức Admin).
 *
 * Mỗi ảnh: public_id = "<thư mục>/<YYYYMMDD-HHmm giờ VN>" — trùng phút thì ghi đè.
 * Ảnh gốc được Cloudinary thu về rộng tối đa 1280, JPEG q70 NGAY LÚC NHẬN
 * (incoming transformation), kèm một bản nhỏ 320 tạo sẵn (eager) cho dải thumbnail.
 */
import { initCloudinary } from "@/lib/cloudinary";
import { connectDB } from "@/lib/mongodb";

import { CAM_KEEP_MINUTES, CAM_WINDOW_MINUTES, CAMERAS, vnStamp, type CamId, type CamShot } from "./cameras";

type SnapDoc = {
  _id: string; // public_id
  cam: CamId;
  takenAt: Date;
  url: string;
  thumb: string;
};
const COLL = "camera_snaps";

async function snapColl() {
  await connectDB();
  const mongoose = (await import("mongoose")).default;
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB chưa sẵn sàng");
  return db.collection<SnapDoc>(COLL);
}

const THUMB_TX = { width: 320, crop: "limit", quality: 60, format: "jpg" } as const;

/** Đẩy ảnh lên Cloudinary + ghi danh mục; trả bản ghi vừa lưu. */
export async function storeSnap(cam: CamId, jpeg: Buffer, takenAt = new Date()): Promise<CamShot & { publicId: string }> {
  const cld = initCloudinary();
  if (!cld) throw new Error("Chưa cấu hình Cloudinary (CLOUDINARY_URL)");
  const publicId = `${CAMERAS[cam].folder}/${vnStamp(takenAt)}`;

  const up = await new Promise<{ secure_url: string; public_id: string; eager?: { secure_url: string }[] }>((resolve, reject) => {
    const stream = cld.uploader.upload_stream(
      {
        public_id: publicId,
        overwrite: true,
        resource_type: "image",
        // Thu nhỏ ngay khi nhận: rộng ≤1280, JPEG chất lượng 70 — không cần sharp
        transformation: [{ width: 1280, crop: "limit", quality: 70, format: "jpg" }],
        eager: [THUMB_TX],
        timeout: 20_000,
      },
      (err, res) => (err || !res ? reject(err ?? new Error("Cloudinary không trả kết quả")) : resolve(res as never)),
    );
    stream.end(jpeg);
  });

  const url = up.secure_url;
  const thumb = up.eager?.[0]?.secure_url || cld.url(up.public_id, { ...THUMB_TX, secure: true });
  const coll = await snapColl();
  await coll.updateOne({ _id: up.public_id }, { $set: { cam, takenAt, url, thumb } }, { upsert: true });
  return { publicId: up.public_id, url, thumb, takenAt: takenAt.toISOString() };
}

/** Xoá ảnh cũ hơn CAM_KEEP_MINUTES (file Cloudinary + dòng danh mục). Trả số ảnh đã xoá. */
export async function pruneSnaps(cam: CamId): Promise<number> {
  const cld = initCloudinary();
  const coll = await snapColl();
  const cutoff = new Date(Date.now() - CAM_KEEP_MINUTES * 60_000);
  // Mỗi lượt xoá tối đa 30 ảnh — lỡ mấy ngày không dọn cũng không làm route quá giờ
  const old = await coll.find({ cam, takenAt: { $lt: cutoff } }, { projection: { _id: 1 } }).limit(30).toArray();
  let n = 0;
  for (const d of old) {
    try {
      if (cld) await cld.uploader.destroy(d._id, { invalidate: false, resource_type: "image" });
      await coll.deleteOne({ _id: d._id });
      n++;
    } catch (e) {
      console.warn("[camera] không xoá được", d._id, e instanceof Error ? e.message : e);
    }
  }
  return n;
}

/** Ảnh mới nhất (bất kể giờ) + các ảnh trong CAM_WINDOW_MINUTES gần nhất, MỚI → CŨ. */
export async function listSnaps(cam: CamId): Promise<{ latest: CamShot | null; items: CamShot[] }> {
  const coll = await snapColl();
  const since = new Date(Date.now() - CAM_WINDOW_MINUTES * 60_000);
  const toShot = (d: SnapDoc): CamShot => ({ url: d.url, thumb: d.thumb, takenAt: d.takenAt.toISOString() });
  const [latestDoc, docs] = await Promise.all([
    coll.find({ cam }).sort({ takenAt: -1 }).limit(1).next(),
    coll.find({ cam, takenAt: { $gte: since } }).sort({ takenAt: -1 }).limit(CAM_WINDOW_MINUTES + 5).toArray(),
  ]);
  return { latest: latestDoc ? toShot(latestDoc) : null, items: docs.map(toShot) };
}

/** Chỉ mục cho truy vấn theo camera + giờ chụp — tạo một lần, lỗi thì bỏ qua. */
let indexed = false;
export async function ensureSnapIndex() {
  if (indexed) return;
  indexed = true;
  try {
    const coll = await snapColl();
    await coll.createIndex({ cam: 1, takenAt: -1 });
  } catch {
    indexed = false;
  }
}
