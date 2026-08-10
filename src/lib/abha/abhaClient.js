import { buildAbhaHeaders } from "@/lib/abha/abhaHeaders";
import { getAbhaBaseUrl } from "@/lib/abha/abhaConfig";

export const abhaRequest = async ({
  method,
  path,
  accessToken,
  data,
  benefitName,
  transactionId,
  baseUrl,
  extraHeaders,
}) => {
  const url = `${baseUrl || getAbhaBaseUrl()}${path}`;
  const headers = buildAbhaHeaders({
    accessToken,
    benefitName,
    transactionId,
    extraHeaders,
  });

  const response = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message = payload?.message || "ABHA request failed.";
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};
