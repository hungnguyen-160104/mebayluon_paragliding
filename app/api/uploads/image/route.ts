// app/api/uploads/image/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/middlewares/requireAuth";
import { cloudinary, initCloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs"; // cần Node runtime để dùng Cloudinary SDK

export async function POST(req: Request) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth; // 401 nếu thiếu/invalid token

  // Khởi tạo Cloudinary config
  const client = initCloudinary();
  if (!client) {
    return NextResponse.json(
      { message: "Upload disabled: Cloudinary not configured" },
      { status: 503 }
    );
  }

  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ message: "Missing file" }, { status: 400 });
    }

    const blob = file as File;
    if (blob.size > 10 * 1024 * 1024) {
      return NextResponse.json({ message: "File too large (>10MB)" }, { status: 413 });
    }

    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mime = blob.type || "application/octet-stream";
    const dataUri = `data:${mime};base64,${buffer.toString("base64")}`;

    const upload = await cloudinary.uploader.upload(dataUri, {
      folder: "uploads",
      resource_type: "image",
    });

    return NextResponse.json(
      {
        url: upload.secure_url,
        public_id: upload.public_id,
        width: upload.width,
        height: upload.height,
        format: upload.format,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/uploads/image error:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
