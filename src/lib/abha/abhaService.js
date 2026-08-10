import { getPhrBaseUrl, getProfilePath } from "@/lib/abha/abhaConfig";
import { encryptSensitive } from "@/lib/abha/abhaCrypto";
import { abhaRequest } from "@/lib/abha/abhaClient";
import { getSessionToken } from "@/lib/abha/abhaSession";

const enrollScope = ["abha-enrol", "mobile-verify", "dl-flow"];
const loginScope = ["abha-login", "mobile-verify"];

export const requestEnrollmentOtp = async ({ type = "mobile", value, benefitName }) => {
  const accessToken = await getSessionToken();

  let loginHint = "mobile";
  if (type === "aadhaar") loginHint = "aadhaar";
  if (type === "dl") loginHint = "dl";

  return abhaRequest({
    method: "POST",
    path: "/v3/enrollment/request/otp",
    accessToken,
    benefitName,
    data: {
      scope: enrollScope,
      loginHint,
      loginId: encryptSensitive(value),
      otpSystem: "abdm",
    },
  });
};

export const verifyEnrollmentOtp = async ({ txnId, otp, benefitName }) => {
  const accessToken = await getSessionToken();
  return abhaRequest({
    method: "POST",
    path: "/v3/enrollment/auth/byAbdm",
    accessToken,
    benefitName,
    data: {
      scope: enrollScope,
      authData: {
        authMethods: ["otp"],
        otp: {
          txnId,
          otpValue: encryptSensitive(otp),
        },
      },
    },
  });
};

export const getEnrollmentSuggestions = async ({ txnId, benefitName }) => {
  const accessToken = await getSessionToken();
  return abhaRequest({
    method: "GET",
    path: "/v3/enrollment/enrol/suggestion",
    accessToken,
    benefitName,
    transactionId: txnId,
  });
};

export const createAbhaAddress = async ({ txnId, abhaAddress, preferred = 1, benefitName }) => {
  const accessToken = await getSessionToken();
  return abhaRequest({
    method: "POST",
    path: "/v3/enrollment/enrol/abha-address",
    accessToken,
    benefitName,
    data: {
      txnId,
      abhaAddress: encryptSensitive(abhaAddress),
      preferred,
    },
  });
};

export const requestLoginOtp = async ({ abhaNumber, benefitName }) => {
  const accessToken = await getSessionToken();
  return abhaRequest({
    method: "POST",
    path: "/v3/profile/login/request/otp",
    accessToken,
    benefitName,
    data: {
      scope: loginScope,
      loginHint: "abha-number",
      loginId: encryptSensitive(abhaNumber),
      otpSystem: "abdm",
    },
  });
};

export const verifyLoginOtp = async ({ txnId, otp, benefitName }) => {
  const accessToken = await getSessionToken();
  return abhaRequest({
    method: "POST",
    path: "/v3/profile/login/verify",
    accessToken,
    benefitName,
    data: {
      scope: loginScope,
      authData: {
        authMethods: ["otp"],
        otp: {
          txnId,
          otpValue: encryptSensitive(otp),
        },
      },
    },
  });
};

export const fetchAbhaProfile = async ({ userToken, benefitName }) => {
  return abhaRequest({
    method: "GET",
    path: getProfilePath(),
    accessToken: userToken,
    benefitName,
  });
};

export const sanitizeProfile = (profile) => ({
  abhaNumber: profile?.abhaNumber || profile?.healthIdNumber || "",
  preferredAbhaAddress: profile?.preferredAbhaAddress || profile?.healthId || "",
  name: profile?.name || "",
  gender: profile?.gender || "",
  dob: profile?.dob || profile?.dateOfBirth || "",
  status: profile?.status || "",
  verificationStatus: profile?.verificationStatus || "",
});

export const searchAbhaByMobile = async ({ mobile, benefitName }) => {
  const accessToken = await getSessionToken();
  return abhaRequest({
    method: "POST",
    path: "/v3/profile/account/abha/search",
    accessToken,
    benefitName,
    data: {
      scope: ["search-abha"],
      mobile: encryptSensitive(mobile),
    },
  });
};

export const phrAbhaSearch = async ({ abhaAddress, benefitName }) => {
  const accessToken = await getSessionToken();
  return abhaRequest({
    method: "POST",
    baseUrl: getPhrBaseUrl(),
    path: "/login/abha/search",
    accessToken,
    benefitName,
    data: {
      abhaAddress: encryptSensitive(abhaAddress),
    },
  });
};
