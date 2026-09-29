// app/api/posts/[id]/translations/route.ts
/**
 * LƯU / XOÁ BẢN DỊCH một ngôn ngữ của bài viết (29/09/2026) — admin.
 *
 * PUT  { lang, title, excerpt?, contentBlocks?, content?, published?, nguon? }
 * DELETE ?lang=fr
 *
 * Ghi thẳng vào `translations.<lang>`, không đi qua updatePost: đường đó dựng
 * lại content/excerpt tiếng Việt – Anh từ khối, không liên quan tới bản dịch.
 */
import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/middlewares/requireAuth";
import { NGON_NGU_DICH } from "@/lib/post-translation";
import { Post } from "@/models/Post.model";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  if (!Types.ObjectId.isValid(id)) return NextResponse.json({ message: "Sai mã bài" }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const lang = String(body.lang || "");
  if (!(NGON_NGU_DICH as readonly string[]).includes(lang)) {
    return NextResponse.json({ message: "Ngôn ngữ không hỗ trợ (fr, zh, ru, hi)" }, { status: 400 });
  }
  const title = String(body.title ?? "").trim();
  const published = Boolean(body.published);
  const contentBlocks = Array.isArray(body.contentBlocks) ? body.contentBlocks : [];
  const content = String(body.content ?? "");
  if (published && (!title || (!contentBlocks.length && !content.trim()))) {
    return NextResponse.json({ message: "Muốn bật 'đã duyệt' thì bản dịch phải có tiêu đề và nội dung" }, { status: 400 });
  }

  try {
    await connectDB();
    const updated = await Post.findByIdAndUpdate(
      id,
      {
        $set: {
          [`translations.${lang}`]: {
            title,
            excerpt: String(body.excerpt ?? "").trim(),
            contentBlocks,
            content,
            published,
            nguon: body.nguon === "nguoi" ? "nguoi" : "ai",
            updatedAt: new Date(),
          },
        },
      },
      { new: true },
    ).lean();
    if (!updated) return NextResponse.json({ message: "Không thấy bài" }, { status: 404 });
    return NextResponse.json({ ok: true, translations: (updated as any).translations ?? {} });
  } catch (err) {
    console.error("PUT /api/posts/[id]/translations error:", err);
    return NextResponse.json({ message: "Không lưu được bản dịch" }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const lang = new URL(req.url).searchParams.get("lang") || "";
  if (!Types.ObjectId.isValid(id) || !(NGON_NGU_DICH as readonly string[]).includes(lang)) {
    return NextResponse.json({ message: "Thiếu mã bài hoặc ngôn ngữ" }, { status: 400 });
  }
  try {
    await connectDB();
    await Post.updateOne({ _id: id }, { $unset: { [`translations.${lang}`]: "" } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/posts/[id]/translations error:", err);
    return NextResponse.json({ message: "Không xoá được bản dịch" }, { status: 500 });
  }
}
