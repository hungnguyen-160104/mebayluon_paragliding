import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Post } from "@/models/Post.model";
import type { SortOrder } from "mongoose";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FIXED_KEYS = new Set([
  "hoa-binh",
  "ha-noi",
  "mu-cang-chai",
  "yen-bai",
  "da-nang",
  "sapa",
]);

/* ---------- helpers ---------- */
function toBool(v: unknown): boolean | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim().toLowerCase();
  if (["true", "1", "yes", "y", "on", "published", "public"].includes(s)) return true;
  if (["false", "0", "no", "n", "off", "draft"].includes(s)) return false;
  return undefined;
}

function slugifyVN(input: string): string {
  return input
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "").replace(/-+/g, "-");
}

function buildSort(s?: string): string | [string, SortOrder][] | Record<string, SortOrder> {
  const v = (s ?? "-publishedAt,-createdAt").trim();
  if (v.includes(",")) {
    return v.split(",").map(f => f.trim()).filter(Boolean)
      .map<[string, SortOrder]>(f => f.startsWith("-") ? [f.slice(1), "desc"] : [f, "asc"]);
  }
  if (v.startsWith("-")) return { [v.slice(1)]: "desc" };
  return { [v]: "asc" };
}

/** Chuẩn hoá subcategory cho trang Kiến thức */
function normalizeSubcategory(v?: string | null): string | undefined {
  if (!v) return undefined;
  const s = String(v).trim().toLowerCase();

  const map: Record<string, string> = {
    // tất cả
    "all": "all", "tat-ca": "all", "tất cả": "all", "tat ca": "all",

    // căn bản
    "can-ban": "can-ban", "căn bản": "can-ban", "can ban": "can-ban", "cb": "can-ban",

    // nâng cao
    "nang-cao": "nang-cao", "nâng cao": "nang-cao", "nang cao": "nang-cao",

    // thermal
    "thermal": "thermal", "bay thermal": "thermal",

    // xc
    "xc": "xc", "bay xc": "xc",

    // khí tượng
    "khi-tuong": "khi-tuong", "khí tượng": "khi-tuong", "khi tuong": "khi-tuong", "meteo": "khi-tuong",
  };

  if (map[s]) return map[s];

  // Nếu user gửi sẵn key hợp lệ
  const allow = new Set(["can-ban", "nang-cao", "thermal", "xc", "khi-tuong", "all"]);
  return allow.has(s) ? s : undefined;
}

/* ---------- CORS/preflight ---------- */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

/* ---------- GET /api/posts ---------- */
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);

    const category = searchParams.get("category")?.trim() || undefined;
    const fixedParam = searchParams.get("fixed");
    const fixedKey = searchParams.get("fixedKey")?.trim() || undefined;

    // Thêm: lọc theo subCategory (cho Kiến thức)
    const subRaw = searchParams.get("subCategory") ?? searchParams.get("sub") ?? undefined;
    const sub = normalizeSubcategory(subRaw);

    // isPublished / published / status
    const p = toBool(
      searchParams.get("published") ??
      searchParams.get("isPublished") ??
      searchParams.get("status")
    );
    const wantPublished = p === undefined ? true : p;

    const term = searchParams.get("q")?.trim() || searchParams.get("search")?.trim() || undefined;

    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "12", 10), 1), 100);
    const skip = (page - 1) * limit;
    const sort = buildSort(searchParams.get("sort") ?? "-publishedAt,-createdAt");

    // ----- filter ----- 
    const filter: Record<string, any> = {};

    if (category) filter.category = new RegExp(`^${category}$`, "i");

    // subCategory chỉ áp dụng khi có (và khác "all")
    if (sub && sub !== "all") {
      filter.subCategory = new RegExp(`^${sub}$`, "i");
    }

    const fixed = toBool(fixedParam ?? "");
    if (fixed === true) {
      filter.isFixed = true;
    } else if (fixed === false) {
      filter.$or = [{ isFixed: { $ne: true } }, { isFixed: { $exists: false } }];
    }
    if (fixedKey) filter.fixedKey = fixedKey;

    if (wantPublished === true) {
      filter.$and = (filter.$and || []).concat({
        $and: [
          { isPublished: { $ne: false } },
          { status: { $not: /^draft$/i } },
        ],
      });
    } else {
      filter.$and = (filter.$and || []).concat({
        $or: [{ isPublished: false }, { status: /^draft$/i }],
      });
    }

    if (term) {
      filter.$and = (filter.$and || []).concat({
        $or: [
          { title: { $regex: term, $options: "i" } },
          { content: { $regex: term, $options: "i" } },
          { tags: { $in: [new RegExp(term, "i")] } },
        ],
      });
    }

    const [items, total] = await Promise.all([
      Post.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Post.countDocuments(filter),
    ]);

    return NextResponse.json({ items, total, page, limit }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("GET /api/posts error:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

/* ---------- POST /api/posts (create) ---------- */
export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    if (typeof body.isPublished === "string") {
      const b = toBool(body.isPublished);
      if (b !== undefined) body.isPublished = b;
    }

    if (body.isFixed === true) {
      body.category = "news";
      if (!body.fixedKey || !FIXED_KEYS.has(String(body.fixedKey))) {
        return NextResponse.json(
          { message: "Bài viết cố định cần 'fixedKey' hợp lệ (hoa-binh/ha-noi/mu-cang-chai/yen-bai/da-nang/sapa)." },
          { status: 400 }
        );
      }
    } else {
      delete body.fixedKey;
      body.isFixed = false;
    }

    if (!body.slug && body.title) {
      const base = slugifyVN(String(body.title)).slice(0, 80) || `post-${Date.now().toString(36)}`;
      let slug = base; let i = 1;
      // eslint-disable-next-line no-await-in-loop
      while (await Post.exists({ slug })) slug = `${base}-${i++}`;
      body.slug = slug;
    }
    if (!body.slug) body.slug = `post-${Date.now().toString(36)}`;

    if (body.isPublished && !body.publishedAt) body.publishedAt = new Date();

    try {
      const created = await Post.create({
        ...body,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return NextResponse.json(created, { status: 201 });
    } catch (err: any) {
      if (err?.code === 11000 && err?.keyPattern?.fixedKey) {
        return NextResponse.json(
          { message: "fixedKey này đã được dùng cho một bài cố định khác." },
          { status: 409 }
        );
      }
      if (err?.code === 11000 && err?.keyPattern?.slug) {
        return NextResponse.json(
          { message: "Slug đã tồn tại, hãy đổi tiêu đề hoặc slug." },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (err) {
    console.error("POST /api/posts error:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
