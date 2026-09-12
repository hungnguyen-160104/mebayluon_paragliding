// app/baocao/components/client-api.ts
"use client";

/**
 * Gọi API báo bay từ trình duyệt.
 *
 * Không dùng lib/api.ts như khu admin: khu này xác thực bằng cookie httpOnly
 * nên không cần gắn header Authorization, chỉ cần fetch cùng nguồn (cookie tự
 * đi kèm). Đổi lại phải tự bóc `message` trong phần thân lỗi để hiện đúng câu
 * tiếng Việt máy chủ trả về.
 */

import { baoCoMang, baoDuLieuCu } from "./offline";

export class ApiError extends Error {
  status: number;
  /** "offline" / "timeout" khi không tới được máy chủ (status 0). */
  reason?: "offline" | "timeout";
  constructor(message: string, status: number, reason?: "offline" | "timeout") {
    super(message);
    this.status = status;
    this.reason = reason;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      cache: "no-store",
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers || {}),
      },
    });
  } catch (e) {
    /**
     * MẤT MẠNG (fetch ném TypeError / AbortError): nói thẳng "chưa lưu được"
     * thay vì "Failed to fetch" — người trực phải biết là việc vừa bấm CHƯA
     * vào sổ để làm lại khi có mạng (nền offline giai đoạn 1, 12/09).
     */
    const ghi = init?.method && init.method !== "GET";
    throw new ApiError(
      ghi ? "Mất mạng — CHƯA lưu được. Đợi có mạng rồi bấm lại." : "Mất mạng — không tải được số liệu mới.",
      0,
      e instanceof Error && e.name === "AbortError" ? "timeout" : "offline",
    );
  }

  /** Bản cất do service worker trả khi mất mạng → treo dải báo "dữ liệu lúc HH:MM". */
  const cu = res.headers.get("X-Baobay-Offline");
  if (cu !== null) baoDuLieuCu(cu);
  else if (res.ok) baoCoMang();

  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* phản hồi không phải JSON: giữ nguyên text để ném ra */
  }

  if (!res.ok) {
    throw new ApiError(body?.message || text || `Lỗi ${res.status}`, res.status);
  }

  return body as T;
}

/**
 * Hạn chờ cho lệnh GET. Mạng 3G ở điểm bay hay treo giữa đường: fetch không tự
 * bỏ cuộc, nên màn hình "đang kiểm tra…" đứng mãi. Có hạn chờ thì trang biết
 * đường hiện lại form đăng nhập.
 */
function timeoutSignal(ms: number): AbortSignal | undefined {
  const anyAbort = AbortSignal as unknown as { timeout?: (ms: number) => AbortSignal };
  if (typeof anyAbort.timeout === "function") return anyAbort.timeout(ms);
  if (typeof AbortController === "undefined") return undefined;
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

export function apiGet<T>(url: string, opts?: { timeoutMs?: number }): Promise<T> {
  const signal = opts?.timeoutMs ? timeoutSignal(opts.timeoutMs) : undefined;
  return request<T>(url, signal ? { signal } : undefined);
}

export function apiPost<T>(url: string, body?: unknown): Promise<T> {
  return request<T>(url, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
}

export function apiPatch<T>(url: string, body: unknown): Promise<T> {
  return request<T>(url, { method: "PATCH", body: JSON.stringify(body) });
}

export function apiPut<T>(url: string, body: unknown): Promise<T> {
  return request<T>(url, { method: "PUT", body: JSON.stringify(body) });
}

export function apiDelete<T>(url: string, body?: unknown): Promise<T> {
  return request<T>(url, { method: "DELETE", body: body === undefined ? undefined : JSON.stringify(body) });
}
