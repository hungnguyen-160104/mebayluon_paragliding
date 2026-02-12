import { Request, Response } from "express";
import { v2 as cloudinary } from "cloudinary";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function uploadImage(req: Request, res: Response) {
  const cfg = cloudinary.config() as any;
  if (!cfg?.cloud_name) {
    return res.status(503).json({ message: "Upload disabled: Cloudinary not configured" });
  }

  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) return res.status(400).json({ message: "Missing file" });

  if (!file.mimetype?.startsWith("image/")) {
    return res.status(400).json({ message: "Unsupported file type" });
  }
  if (file.size > MAX_SIZE) {
    return res.status(400).json({ message: "File too large" });
  }

  const folder = "mbl-posts";

  try {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        // format: "webp", // nếu muốn ép định dạng, bỏ comment dòng này
        overwrite: true,
      },
      (error, result) => {
        if (error || !result) {
          console.error("Cloudinary upload error:", error);
          return res.status(500).json({ message: "Upload failed", error: error?.message || error });
        }
        return res.json({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
        });
      }
    );

    stream.end(file.buffer);
  } catch (err: any) {
    console.error("Cloudinary upload error:", err);
    return res.status(500).json({ message: "Upload failed", error: err?.message || err });
  }
}

export async function uploadImageByUrl(req: Request, res: Response) {
  const cfg = cloudinary.config() as any;
  if (!cfg?.cloud_name) {
    return res.status(503).json({ message: "Upload disabled: Cloudinary not configured" });
  }

  const { url } = (req.body || {}) as { url?: string };
  if (!url || typeof url !== "string") {
    return res.status(400).json({ message: "Missing url" });
  }

  try {
    const result = await cloudinary.uploader.upload(url, {
      folder: "mbl-posts",
      resource_type: "image",
      overwrite: true,
    });
    return res.json({
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
    });
  } catch (err: any) {
    console.error("Cloudinary upload by URL error:", err);
    return res.status(500).json({ message: "Upload by URL failed", error: err?.message || err });
  }
}
