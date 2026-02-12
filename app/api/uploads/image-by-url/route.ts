// app/api/uploads/image-by-url/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/middlewares/requireAuth";
import { cloudinary, initCloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";

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
    const { url, folder } = await req.json();
    if (!url) {
      return NextResponse.json({ message: "Missing url" }, { status: 400 });
    }

    const upload = await cloudinary.uploader.upload(url, {
      folder: folder || "uploads",
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
    console.error("POST /api/uploads/image-by-url error:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
