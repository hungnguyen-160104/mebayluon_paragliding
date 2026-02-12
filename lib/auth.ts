// lib/auth.ts
import { AUTH_TOKEN_KEY } from "./auth-constants";

export const TOKEN_KEY = AUTH_TOKEN_KEY;

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

const hasWindow = typeof window !== "undefined";
const hasDocument = typeof document !== "undefined";

function setTokenCookie(token: string) {
  if (!hasDocument) return;
  const secureFlag = hasWindow && window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; sameSite=Lax${secureFlag}`;
}

function clearTokenCookie() {
  if (!hasDocument) return;
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; sameSite=Lax`;
}

function readTokenCookie(): string | null {
  if (!hasDocument) return null;
  const cookies = document.cookie ? document.cookie.split(";") : [];
  for (const raw of cookies) {
    const [name, ...rest] = raw.trim().split("=");
    if (!name) continue;
    if (name === TOKEN_KEY) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
}

export const getToken = () => {
  if (!hasWindow) return null;
  const stored = localStorage.getItem(TOKEN_KEY);
  const cookie = readTokenCookie();

  if (stored && !cookie) {
    setTokenCookie(stored);
  }

  return stored || cookie;
};

export const setToken = (t: string) => {
  if (!hasWindow) return;
  localStorage.setItem(TOKEN_KEY, t);
  setTokenCookie(t);
};

export const clearToken = () => {
  if (!hasWindow) return;
  localStorage.removeItem(TOKEN_KEY);
  clearTokenCookie();
};

// ✅ Trả về kiểu Record<string, string> để hợp lệ với HeadersInit
export const authHeader = (): Record<string, string> => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
