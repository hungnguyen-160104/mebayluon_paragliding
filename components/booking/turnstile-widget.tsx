"use client";

import { useEffect, useRef, useCallback } from "react";

// ─── Cloudflare Turnstile type declarations ───
declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: (errorCode: string) => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact";
          language?: string;
        }
      ) => string; // returns widgetId
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const TURNSTILE_SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileWidgetProps {
  /** Callback khi Turnstile trả token hợp lệ */
  onVerify: (token: string) => void;
  /** Callback khi token hết hạn → cần reset */
  onExpire?: () => void;
  /** Callback khi có lỗi widget */
  onError?: (code: string) => void;
  /** Ngôn ngữ hiển thị (vi, en, fr, ru, auto) */
  lang?: string;
  /** Theme */
  theme?: "light" | "dark" | "auto";
}

/**
 * Cloudflare Turnstile – explicit render.
 * - Tự load script 1 lần duy nhất.
 * - Render widget vào container ref.
 * - Expose `reset()` qua ref nếu cần gọi từ parent (dùng imperative).
 * - Cleanup khi unmount.
 */
export default function TurnstileWidget({
  onVerify,
  onExpire,
  onError,
  lang = "auto",
  theme = "dark",
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  // Stable callback refs (tránh re-render loop)
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  const onErrorRef = useRef(onError);
  useEffect(() => { onVerifyRef.current = onVerify; }, [onVerify]);
  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  /** Load Turnstile script nếu chưa có */
  const loadScript = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Đã load rồi
      if (window.turnstile) {
        resolve();
        return;
      }
      // Đang load (script tag tồn tại nhưng chưa onload)
      const existing = document.querySelector(
        `script[src="${TURNSTILE_SCRIPT_URL}"]`
      );
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("Turnstile script error")));
        return;
      }
      const s = document.createElement("script");
      s.src = TURNSTILE_SCRIPT_URL;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load Turnstile script"));
      document.head.appendChild(s);
    });
  }, []);

  /** Render widget */
  useEffect(() => {
    mountedRef.current = true;

    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!siteKey) {
      console.warn("[Turnstile] NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await loadScript();
      } catch (err) {
        console.error("[Turnstile] Script load error:", err);
        return;
      }

      if (cancelled || !mountedRef.current || !containerRef.current || !window.turnstile) return;

      // Remove old widget nếu re-render
      if (widgetIdRef.current) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* ignore */ }
        widgetIdRef.current = null;
      }

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => {
          if (mountedRef.current) onVerifyRef.current(token);
        },
        "expired-callback": () => {
          if (mountedRef.current) onExpireRef.current?.();
        },
        "error-callback": (code: string) => {
          if (mountedRef.current) onErrorRef.current?.(code);
        },
        theme,
        language: lang,
      });
    })();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* ignore */ }
        widgetIdRef.current = null;
      }
    };
  }, [lang, theme, loadScript]);

  return <div ref={containerRef} className="flex justify-center my-3" />;
}

/**
 * Reset Turnstile widget từ bên ngoài.
 * Gọi khi API trả lỗi token hoặc cần user verify lại.
 */
export function resetTurnstile() {
  if (typeof window === "undefined" || !window.turnstile) return;
  // Reset tất cả widget trên trang (thường chỉ 1)
  const containers = document.querySelectorAll("[data-turnstile-widget-id]");
  containers.forEach((el) => {
    const wid = el.getAttribute("data-turnstile-widget-id");
    if (wid) {
      try { window.turnstile!.reset(wid); } catch { /* ignore */ }
    }
  });
}
