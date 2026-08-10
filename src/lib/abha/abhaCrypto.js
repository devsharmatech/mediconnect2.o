import { constants, publicEncrypt } from "crypto";
import {
  getPublicKey,
  getRsaPadding,
  getRsaOaepHash,
} from "@/lib/abha/abhaConfig";

const normalizePublicKey = (key) => {
  if (key.includes("BEGIN PUBLIC KEY")) {
    return key;
  }

  const stripped = key.replace(/\s+/g, "");
  return `-----BEGIN PUBLIC KEY-----\n${stripped}\n-----END PUBLIC KEY-----`;
};

const resolvePadding = () => {
  const padding = getRsaPadding();
  if (padding === "RSA_PKCS1_OAEP_PADDING") {
    return constants.RSA_PKCS1_OAEP_PADDING;
  }
  if (padding === "RSA_PKCS1_PADDING") {
    return constants.RSA_PKCS1_PADDING;
  }
  throw new Error(`Unsupported ABHA_RSA_PADDING: ${padding}`);
};

export const encryptSensitive = (value) => {
  if (value === undefined || value === null || value === "") {
    throw new Error("Sensitive value is required for encryption.");
  }

  const key = normalizePublicKey(getPublicKey());
  const padding = resolvePadding();
  const oaepHash = getRsaOaepHash();

  const encrypted = publicEncrypt(
    {
      key,
      padding,
      oaepHash: padding === constants.RSA_PKCS1_OAEP_PADDING ? oaepHash : undefined,
    },
    Buffer.from(String(value), "utf8")
  );

  return encrypted.toString("base64");
};
