import crypto from "crypto";

/**
 * PayU Configuration & Gateway Engine
 * Exclusively configured for Chemist / Pharmacy Medicine Orders
 */
export function getPayUConfig() {
  const env = (process.env.PAYU_ENV || "test").toLowerCase().trim();
  const isProduction = env === "prod" || env === "production" || env === "live";

  // Mode-aware Key resolution (Live vs Test)
  const key = isProduction
    ? (process.env.PAYU_LIVE_KEY ||
       process.env.PAYU_MERCHANT_KEY ||
       process.env.PAYU_KEY ||
       process.env.NEXT_PUBLIC_PAYU_KEY ||
       "")
    : (process.env.PAYU_TEST_KEY ||
       process.env.PAYU_MERCHANT_KEY ||
       process.env.PAYU_KEY ||
       process.env.NEXT_PUBLIC_PAYU_KEY ||
       "Kx7dGD");

  // Mode-aware Salt resolution
  const salt = isProduction
    ? (process.env.PAYU_LIVE_SALT ||
       process.env.PAYU_MERCHANT_SALT ||
       process.env.PAYU_SALT ||
       "")
    : (process.env.PAYU_TEST_SALT ||
       process.env.PAYU_MERCHANT_SALT ||
       process.env.PAYU_SALT ||
       "r9JFFpORnzyk7jU1tIv3OEx31wvSZnMD");

  // Mode-aware Client ID resolution (OAuth / Split API)
  const clientId = isProduction
    ? (process.env.PAYU_LIVE_CLIENT_ID || process.env.PAYU_CLIENT_ID || "")
    : (process.env.PAYU_TEST_CLIENT_ID || process.env.PAYU_CLIENT_ID || "");

  // Mode-aware Client Secret resolution (OAuth / Split API)
  const clientSecret = isProduction
    ? (process.env.PAYU_LIVE_CLIENT_SECRET || process.env.PAYU_CLIENT_SECRET || "")
    : (process.env.PAYU_TEST_CLIENT_SECRET || process.env.PAYU_CLIENT_SECRET || "");

  const mid = process.env.PAYU_MID || process.env.PAYU_MERCHANT_ID || (isProduction ? "13799851" : "");

  const actionUrl =
    process.env.PAYU_ACTION_URL ||
    (isProduction
      ? "https://secure.payu.in/_payment"
      : "https://test.payu.in/_payment");

  const apiBaseUrl =
    process.env.PAYU_API_BASE_URL ||
    (isProduction
      ? "https://api.payu.in"
      : "https://test.payu.in");

  const authUrl =
    process.env.PAYU_AUTH_URL ||
    (isProduction
      ? "https://accounts.payu.in/oauth/token"
      : "https://test-accounts.payu.in/oauth/token");

  return {
    key,
    salt,
    clientId,
    clientSecret,
    mid,
    env: isProduction ? "prod" : "test",
    isProduction,
    actionUrl,
    apiBaseUrl,
    authUrl,
  };
}

/**
 * Fetch PayU OAuth Access Token (Using Client ID & Client Secret)
 * For REST Split Payments & Sub-merchant Settlement APIs
 */
export async function getPayUAuthToken() {
  const config = getPayUConfig();
  if (!config.clientId || !config.clientSecret) {
    throw new Error("PayU Client ID and Client Secret not configured");
  }

  const res = await fetch(config.authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      scope: "create_sub_merchants,read_sub_merchants,settlement_split,payment_links",
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.message || "Failed to authenticate with PayU OAuth");
  }

  return data.access_token;
}

/**
 * Build PayU Absolute Split Request JSON
 * 90% goes to pharmacy/chemist sub-merchant, 10% platform commission retained by Aggregator (MediConnect)
 */
export function buildPayUSplitRequest({
  childMerchantKey,
  chemistAmount,
  platformAmount,
  subTxnId,
}) {
  if (!childMerchantKey) return null;

  const splitPayload = {
    type: "absolute",
    splitInfo: {
      [childMerchantKey]: {
        aggregatorSubTxnId: subTxnId || `sub_${Date.now()}`,
        aggregatorSubAmt: parseFloat(chemistAmount).toFixed(2),
        aggregatorCharges: parseFloat(platformAmount).toFixed(2),
      },
    },
  };

  return JSON.stringify(splitPayload);
}

/**
 * Generate SHA-512 Hash for Outgoing PayU Payment Request
 * With Split Payment:
 * sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt|splitRequest)
 * Standard:
 * sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt)
 */
export function generatePayUHash({
  key,
  txnid,
  amount,
  productinfo,
  firstname,
  email,
  udf1 = "",
  udf2 = "",
  udf3 = "",
  udf4 = "",
  udf5 = "",
  splitRequest = null,
  salt,
}) {
  const formattedAmount = parseFloat(amount).toFixed(2);
  let hashString = `${key}|${txnid}|${formattedAmount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${salt}`;

  if (splitRequest && typeof splitRequest === "string" && splitRequest.trim().length > 0) {
    hashString += `|${splitRequest.trim()}`;
  }

  return crypto.createHash("sha512").update(hashString).digest("hex");
}

/**
 * Verify SHA-512 Reverse Hash from PayU Response (Callback / Webhook)
 * Formula with additional charges:
 * sha512(additionalCharges|salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 * Formula without additional charges:
 * sha512(salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 */
export function verifyPayUResponseHash(params, salt) {
  const {
    key = "",
    txnid = "",
    amount = "",
    productinfo = "",
    firstname = "",
    email = "",
    udf1 = "",
    udf2 = "",
    udf3 = "",
    udf4 = "",
    udf5 = "",
    status = "",
    additionalCharges = "",
    hash = "",
  } = params;

  if (!hash || !salt) return false;

  const formattedAmount = parseFloat(amount).toFixed(2);

  let hashSequence = "";
  if (additionalCharges && String(additionalCharges).trim().length > 0) {
    hashSequence = `${additionalCharges}|${salt}|${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${formattedAmount}|${txnid}|${key}`;
  } else {
    hashSequence = `${salt}|${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${formattedAmount}|${txnid}|${key}`;
  }

  const calculatedHash = crypto.createHash("sha512").update(hashSequence).digest("hex");

  return calculatedHash.toLowerCase() === String(hash).toLowerCase();
}
