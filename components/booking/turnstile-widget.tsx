"use client";

import { useEffect, useRef, useCallback } from "react";

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
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const TURNSTILE_SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (code: string) => void;
  lang?: string;
  theme?: "light" | "dark" | "auto";
}

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

  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onVerifyRef.current = onVerify;
  }, [onVerify]);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const loadScript = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.turnstile) {
        resolve();
        return;
      }

      const existing = document.querySelector(
        `script[src="${TURNSTILE_SCRIPT_URL}"]`
      ) as HTMLScriptElement | null;

      if (existing) {
        const handleLoad = () => resolve();
        const handleError = () =>
          reject(new Error("Turnstile script error"));

        existing.addEventListener("load", handleLoad, { once: true });
        existing.addEventListener("error", handleError, { once: true });
        return;
      }

      const s = document.createElement("script");
      s.src = TURNSTILE_SCRIPT_URL;
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () =>
        reject(new Error("Failed to load Turnstile script"));
      document.head.appendChild(s);
    });
  }, []);

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

      if (
        cancelled ||
        !mountedRef.current ||
        !containerRef.current ||
        !window.turnstile
      ) {
        return;
      }

      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
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

      if (containerRef.current && widgetIdRef.current) {
        containerRef.current.setAttribute(
          "data-turnstile-widget-id",
          widgetIdRef.current
        );
      }
    })();

    return () => {
      cancelled = true;
      mountedRef.current = false;

      if (containerRef.current) {
        containerRef.current.removeAttribute("data-turnstile-widget-id");
      }

      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }
    };
  }, [lang, theme, loadScript]);

  return (
    <div className="flex justify-center">
      <div
        ref={containerRef}
        className="min-h-[68px] rounded-2xl border border-white/10 bg-white/6 px-3 py-3"
      />
    </div>
  );
}

export function resetTurnstile() {
  if (typeof window === "undefined" || !window.turnstile) return;

  const containers = document.querySelectorAll("[data-turnstile-widget-id]");
  containers.forEach((el) => {
    const wid = el.getAttribute("data-turnstile-widget-id");
    if (wid) {
      try {
        window.turnstile!.reset(wid);
      } catch {
        // ignore
      }
    }
  });
}