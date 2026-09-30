// lib/imou/snaps.ts
/**
 * DANH MỤC ẢNH CAMERA (chỉ chạy ở máy chủ) — MongoDB collection `camera_snaps`.
 *
 * KHÔNG LƯU ẢNH (chủ 01/10/2026): mỗi bản ghi chỉ là { cam, url, takenAt } với
 * `url` là link ảnh Imou trả về từ setDeviceSnapEnhanced (sống 7 ngày). Máy chủ
 * không tải ảnh, không đẩy lên Cloudinary → web không tốn dung lượng lưu trữ,
 * còn băng thông ảnh do máy chủ Imou chịu (trình duyệt tải thẳng từ Imou).
 * Bản ghi cũ hơn CAM_KEEP_MINUTES (90 phút) bị xoá ở mỗi lượt cron.
 *
 * Khoá bản ghi: "<cam>/<YYYYMMDD-HHmm giờ VN>" — trùng phút thì ghi đè.
 *
 * Dọn dẹp kiểu cũ: bản cũ (trước 01/10) đẩy ảnh lên Cloudinary thư mục
 * `baobay-cam/<cam>` và bản ghi có trường `thumb`. Nếu cron còn gặp bản ghi như
 * thế thì xoá MỘT LẦN cả thư mục Cloudinary đó rồi xoá các bản ghi ấy — không
 * có thì không đụng tới Cloudinary.
 */
import { initCloudinary } from "@/lib/cloudinary";
import { connectDB } from "@/lib/mongodb";

import { CAM_KEEP_MINUTES, CAM_WINDOW_MINUTES, vnStamp, type CamId, type CamShot } from "./cameras";

type SnapDoc = {
  _id: string;
  cam: CamId;
  takenAt: Date;
  url: string;
  /** Chỉ bản ghi kiểu cũ (ảnh trên Cloudinary) mới có */
  thumb?: string;
};
const COLL = "camera_snaps";
/** Thư mục Cloudinary của bản cũ — chỉ dùng để dọn */
const legacyFolder = (cam: CamId) => `baobay-cam/${cam}`;

async function snapColl() {
  await connectDB();
  const mongoose = (await import("mongoose")).default;
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB chưa sẵn sàng");
  return db.collection<SnapDoc>(COLL);
}

/** Ghi link ảnh Imou vào danh mục. */
export async function saveSnap(cam: CamId, url: string, takenAt = new Date()): Promise<CamShot> {
  const coll = await snapColl();
  await coll.updateOne(
    { _id: `${cam}/${vnStamp(takenAt)}` },
    { $set: { cam, takenAt, url }, $unset: { thumb: "" } },
    { upsert: true },
  );
  return { url, takenAt: takenAt.toISOString() };
}

/** Xoá bản ghi (kiểu mới) cũ hơn CAM_KEEP_MINUTES. Trả số bản ghi đã xoá. */
export async function pruneSnaps(cam: CamId): Promise<number> {
  const coll = await snapColl();
  const cutoff = new Date(Date.now() - CAM_KEEP_MINUTES * 60_000);
  const r = await coll.deleteMany({ cam, takenAt: { $lt: cutoff }, thumb: { $exists: false } });
  return r.deletedCount ?? 0;
}

/**
 * Dọn ảnh Cloudinary của bản cũ — chỉ làm khi còn bản ghi kiểu cũ. Xoá theo tiền
 * tố thư mục (tối đa 1000 ảnh/lượt, lặp vài lượt), xong mới xoá bản ghi; lỗi thì
 * để lượt cron sau thử lại. Trả số bản ghi cũ đã dọn (0 = không có gì để dọn).
 */
export async function cleanupLegacySnaps(cam: CamId): Promise<number> {
  const coll = await snapColl();
  const legacy = await coll.countDocuments({ cam, thumb: { $exists: true } }, { limit: 1 });
  if (!legacy) return 0;

  const cld = initCloudinary();
  if (!cld) {
    console.warn("[camera] còn bản ghi ảnh kiểu cũ nhưng thiếu Cloudinary env — chưa dọn được");
    return 0;
  }
  const prefix = `${legacyFolder(cam)}/`;
  for (let round = 0; round < 5; round++) {
    const res = (await cld.api.delete_resources_by_prefix(prefix, { resource_type: "image", type: "upload" })) as {
      partial?: boolean;
    };
    if (!res?.partial) break;
  }
  await cld.api.delete_folder(legacyFolder(cam)).catch(() => {});
  const r = await coll.deleteMany({ cam, thumb: { $exists: true } });
  return r.deletedCount ?? 0;
}

/** Ảnh mới nhất (bất kể giờ) + các ảnh trong CAM_WINDOW_MINUTES gần nhất, MỚI → CŨ. */
export async function listSnaps(cam: CamId): Promise<{ latest: CamShot | null; items: CamShot[] }> {
  const coll = await snapColl();
  const since = new Date(Date.now() - CAM_WINDOW_MINUTES * 60_000);
  const toShot = (d: SnapDoc): CamShot => ({ url: d.url, takenAt: d.takenAt.toISOString() });
  // Bỏ qua bản ghi kiểu cũ (ảnh Cloudinary sắp bị dọn)
  const base = { cam, thumb: { $exists: false } };
  const proj = { projection: { _id: 0, url: 1, takenAt: 1 } };
  const [latestDoc, docs] = await Promise.all([
    coll.find(base, proj).sort({ takenAt: -1 }).limit(1).next(),
    coll
      .find({ ...base, takenAt: { $gte: since } }, proj)
      .sort({ takenAt: -1 })
      .limit(CAM_WINDOW_MINUTES + 5)
      .toArray(),
  ]);
  return { latest: latestDoc ? toShot(latestDoc as SnapDoc) : null, items: docs.map((d) => toShot(d as SnapDoc)) };
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
