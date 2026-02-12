// app/api/posts/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Post } from "@/models/Post.model";
import type { SortOrder } from "mongoose";
import { createLogger } from "@/lib/logger";

const logger = createLogger("PostsAPI");

// IMPORTANT:
// - Nếu bạn cache bằng Cache-Control (CDN/proxy), KHÔNG cần revalidate.
// - Route handler mặc định thường đã dynamic; bạn có thể giữ force-dynamic để rõ ràng.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PostType = "blog" | "product";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10))
    );

    const publishedParam = searchParams.get("published"); // string | null
    const typeParam = searchParams.get("type"); // string | null
    const subcategoryParam = searchParams.get("subcategory"); // string | null
    const sortParam = searchParams.get("sort") ?? undefined; // string | undefined

    await connectDB();

    // Build query
    const query: Record<string, any> = {};

    // ✅ Safe default: nếu không truyền published => chỉ lấy published=true (tránh lộ draft)
    if (publishedParam === null) {
      query.published = true;
    } else {
      const p = toBool(publishedParam);
      if (p !== undefined) query.published = p;
    }

    // Validate type
    const type = isPostType(typeParam) ? typeParam : undefined;
    if (type) query.type = type;

    // Validate subcategory
    const subcategory = normalizeSubcategory(subcategoryParam);
    if (subcategory) query.subcategory = subcategory;

    const sortObj = buildSort(sortParam);

    // Run in parallel (faster)
    const [total, posts] = await Promise.all([
      Post.countDocuments(query),
      Post.find(query)
        .select("-__v")
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
    ]);

    // ✅ Cache policy:
    // - Nếu query trả về draft (published=false) => không public cache
    // - published=true => ok public cache 1h
    const isDraftRequest = query.published === false;

    const headers = new Headers({
      "Content-Type": "application/json",
      "Cache-Control": isDraftRequest
        ? "private, no-store"
        : "public, s-maxage=3600, stale-while-revalidate=7200",
    });

    logger.info(`Retrieved ${posts.length} posts`, { page, limit, total, query });

    return new NextResponse(
      JSON.stringify({
        success: true,
        data: posts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      }),
      { headers, status: 200 }
    );
  } catch (error) {
    logger.error("GET /api/posts failed", error as Error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}

// ---------- Helpers ----------

function toBool(v: unknown): boolean | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim().toLowerCase();
  if (["true", "1", "yes", "y", "on", "published", "public"].includes(s)) return true;
  if (["false", "0", "no", "n", "off", "draft"].includes(s)) return false;
  return undefined;
}

function isPostType(v: string | null): v is PostType {
  return v === "blog" || v === "product";
}

// ✅ Parse multi sort fields: "-publishedAt,-createdAt"
function buildSort(s?: string): Record<string, SortOrder> {
  const raw = (s ?? "-publishedAt,-createdAt").trim();

  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const out: Record<string, SortOrder> = {};
  for (const p of parts) {
    if (p.startsWith("-")) out[p.slice(1)] = -1;
    else out[p] = 1;
  }

  // fallback an toàn
  if (Object.keys(out).length === 0) return { publishedAt: -1, createdAt: -1 };
  return out;
}

function normalizeSubcategory(v?: string | null): string | undefined {
  if (!v) return undefined;
  const s = String(v).trim().toLowerCase();
  const allow = new Set(["can-ban", "nang-cao", "thermal", "xc", "khi-tuong", "all"]);
  return allow.has(s) ? s : undefined;
}
