import {
  getClientId,
  getClientSecret,
  getSessionUrl,
} from "@/lib/abha/abhaConfig";
import { buildSessionHeaders } from "@/lib/abha/abhaHeaders";

let cachedToken = null;
let tokenExpiry = null;
let refreshExpiry = null;

export const getSessionToken = async () => {
  if (cachedToken && tokenExpiry && new Date() < tokenExpiry) {
    return cachedToken;
  }

  const response = await fetch(getSessionUrl(), {
    method: "POST",
    headers: buildSessionHeaders(),
    body: JSON.stringify({
      clientId: getClientId(),
      clientSecret: getClientSecret(),
    }),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.message || "Failed to generate ABHA session token.";
    throw new Error(message);
  }

  const accessToken = payload?.accessToken || payload?.access_token;
  const expiresIn = Number(payload?.expiresIn ?? payload?.expires_in);
  const refreshExpiresIn = Number(payload?.refreshExpiresIn ?? payload?.refresh_expires_in);

  if (!accessToken) {
    throw new Error("Session response missing access token.");
  }

  cachedToken = accessToken;
  tokenExpiry = Number.isFinite(expiresIn)
    ? new Date(Date.now() + Math.max(expiresIn - 10, 0) * 1000)
    : new Date(Date.now() + 60 * 1000);

  refreshExpiry = Number.isFinite(refreshExpiresIn)
    ? new Date(Date.now() + Math.max(refreshExpiresIn - 10, 0) * 1000)
    : null;

  return cachedToken;
};

export const getSessionMeta = () => ({
  accessToken: cachedToken,
  expiresAt: tokenExpiry,
  refreshExpiresAt: refreshExpiry,
});
