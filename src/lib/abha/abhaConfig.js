const SANDBOX_ABHA_BASE_URL = "https://abhasbx.abdm.gov.in/abha/api";
const SANDBOX_PHR_BASE_URL = "https://abhasbx.abdm.gov.in/abha/api/v3/phr/web";
const PROD_ABHA_BASE_URL = "https://abdm.gov.in/abha/api";
const PROD_PHR_BASE_URL = "https://phr.abdm.gov.in/api/phr/web";

export const ABHA_ENV = (process.env.ABHA_ENV || "sandbox").toLowerCase();

export const getAbhaBaseUrl = () =>
  ABHA_ENV === "production" ? PROD_ABHA_BASE_URL : SANDBOX_ABHA_BASE_URL;

export const getPhrBaseUrl = () =>
  ABHA_ENV === "production" ? PROD_PHR_BASE_URL : SANDBOX_PHR_BASE_URL;

export const getBenefitName = () => process.env.ABHA_BENEFIT_NAME || "";

export const getSessionUrl = () => {
  const url = process.env.ABHA_SESSION_URL;
  if (!url) {
    throw new Error("ABHA_SESSION_URL is required for session token generation.");
  }
  return url;
};

export const getProfilePath = () => {
  const path = process.env.ABHA_PROFILE_PATH;
  if (!path) {
    throw new Error("ABHA_PROFILE_PATH is required for profile fetch.");
  }
  return path;
};

export const getClientId = () => {
  const clientId = process.env.ABHA_CLIENT_ID;
  if (!clientId) {
    throw new Error("ABHA_CLIENT_ID is missing.");
  }
  return clientId;
};

export const getClientSecret = () => {
  const clientSecret = process.env.ABHA_CLIENT_SECRET;
  if (!clientSecret) {
    throw new Error("ABHA_CLIENT_SECRET is missing.");
  }
  return clientSecret;
};

export const getPublicKey = () => {
  const key = process.env.ABHA_PUBLIC_KEY;
  if (!key) {
    throw new Error("ABHA_PUBLIC_KEY is required for RSA encryption.");
  }
  return key;
};

export const getRsaPadding = () =>
  process.env.ABHA_RSA_PADDING || "RSA_PKCS1_PADDING";

export const getRsaOaepHash = () => process.env.ABHA_RSA_OAEP_HASH || "sha1";
