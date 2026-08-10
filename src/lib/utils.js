import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Returns the correct public base URL for the app.
 *
 * Priority order:
 *  1. NEXT_PUBLIC_APP_URL  — explicitly set in .env / Vercel env vars (recommended)
 *  2. VERCEL_URL           — auto-injected by Vercel on every deployment (no https:// prefix)
 *  3. http://localhost:3000 — local development fallback
 *
 * Usage: const baseUrl = getAppBaseUrl();
 */
export function getAppBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, ""); // strip trailing slash
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}
