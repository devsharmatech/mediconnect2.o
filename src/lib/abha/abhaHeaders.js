import { randomUUID } from "crypto";
import { getBenefitName } from "@/lib/abha/abhaConfig";

export const buildAbhaHeaders = ({
  accessToken,
  benefitName,
  transactionId,
  extraHeaders = {},
} = {}) => {
  if (!accessToken) {
    throw new Error("Access token is required for ABHA requests.");
  }

  const headers = {
    "Content-Type": "application/json",
    "REQUEST-ID": randomUUID(),
    "TIMESTAMP": new Date().toISOString(),
    Authorization: `Bearer ${accessToken}`,
  };

  const resolvedBenefitName = benefitName || getBenefitName();
  if (resolvedBenefitName) {
    headers["BENEFIT-NAME"] = resolvedBenefitName;
  }

  if (transactionId) {
    headers["Transaction_Id"] = transactionId;
  }

  return {
    ...headers,
    ...extraHeaders,
  };
};

export const buildSessionHeaders = ({ extraHeaders = {} } = {}) => ({
  "Content-Type": "application/json",
  "REQUEST-ID": randomUUID(),
  "TIMESTAMP": new Date().toISOString(),
  ...extraHeaders,
});
