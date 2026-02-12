// lib/api.ts
const isBrowser = typeof window !== "undefined";

const trimBase = (s: string) => s.trim().replace(/\/$/, "");
const ABSOLUTE = /^https?:\/\//i;

function isFormDataBody(b: any) {
  return typeof FormData !== "undefined" && b instanceof FormData;
}
function isUrlParams(b: any) {
  return typeof URLSearchParams !== "undefined" && b instanceof URLSearchParams;
}

export default async function api<T>(path: string, init?: RequestInit): Promise<T> {
  // absolute -> đi thẳng
  if (ABSOLUTE.test(path)) return fetchJson<T>(path, init);

  const p = path.startsWith("/") ? path : `/${path}`;

  // ✅ API nội bộ của NEXT: /api/*
  if (p.startsWith("/api/")) {
    const base = isBrowser
      ? "" // same-origin trên browser
      : trimBase(process.env.NEXT_PUBLIC_API_BASE_URL || "") || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:8080");
    return fetchJson<T>(`${base}${p}`, init, /*internal*/ true);
  }

  // Các endpoint khác (nếu dùng)
  const base =
    trimBase(process.env.NEXT_PUBLIC_API_BASE_URL || "") ||
    (!isBrowser ? trimBase(process.env.INTERNAL_API_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:8080")) : "");

  return fetchJson<T>(`${base}${p}`, init, /*internal*/ base === "" || base.endsWith(":8080"));
}

async function fetchJson<T>(url: string, init?: RequestInit, internal = false): Promise<T> {
  const method = (init?.method || "GET").toUpperCase();
  const body = init?.body as any;

  // Đảm bảo giữ nguyên headers từ init (bao gồm Authorization)
  const headers = new Headers();
  
  // Copy tất cả headers từ init (hỗ trợ cả object và Headers)
  if (init?.headers) {
    const inputHeaders = init.headers;
    if (inputHeaders instanceof Headers) {
      inputHeaders.forEach((value, key) => headers.set(key, value));
    } else if (Array.isArray(inputHeaders)) {
      inputHeaders.forEach(([key, value]) => headers.set(key, value));
    } else {
      Object.entries(inputHeaders).forEach(([key, value]) => {
        if (value !== undefined) headers.set(key, value);
      });
    }
  }
  
  const hasCT = headers.has("Content-Type") || headers.has("content-type");

  if (internal && (method === "POST" || method === "PUT" || method === "PATCH")) {
    if (isFormDataBody(body)) {
      // để browser tự set boundary
    } else if (isUrlParams(body) && !hasCT) {
      headers.set("Content-Type", "application/x-www-form-urlencoded;charset=UTF-8");
    } else if (!hasCT) {
      headers.set("Content-Type", "application/json");
    }
  }

  let res: Response;
  try {
    res = await fetch(url, { ...init, cache: "no-store", headers });
  } catch {
    throw new Error("Network error: cannot reach API");
  }

  const ct = res.headers.get("content-type") || "";

  if (!res.ok) {
    let msg = "";
    let payload: any = null;

    // Try JSON first
    if (ct.includes("application/json")) {
      try {
        payload = await res.clone().json();
        msg = payload?.message || payload?.error || "";
      } catch {}
    }

    if (!msg) {
      try {
        msg = await res.clone().text();
      } catch {}
    }

    const err = new Error(msg || `${res.status} ${res.statusText}`) as Error & {
      status?: number;
      data?: any;
    };
    err.status = res.status;
    err.data = payload;
    throw err;
  }

  if (res.status === 204) return {} as T;
  if (ct.includes("application/json")) return (await res.json()) as T;

  try {
    const text = await res.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      return undefined as T;
    }
  } catch {
    return undefined as T;
  }
}
